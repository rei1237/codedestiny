// 프롬프트 허브 점성술·베다 산출기 — 출생지를 좌표로 바꾼 뒤 워커의 결정론 차트 엔드포인트를 불러
// [점성술 차트 산출 데이터] / [베다 점성 산출 데이터] 블록을 만든다.
//
// 🔴 worker/lib/swiss-ephemeris.js 는 워커 전용(sweph-wasm·node:fs)이라 클라이언트에서 import 하지 않는다.
//    fetch → 순수 변환만 한다(선례: app/yeon-star-hug/YeonStarHugClient.tsx).
// 🔴 좌표 없이 차트를 부르지 않는다 — worker/routes/astro.js 와 swiss-ephemeris.js 가 lat/lon 을
//    조용히 서울(37.5665, 126.978)로 채운다. 남의 차트를 사용자 차트로 내보내는 것이 자리표시자보다 나쁘다.
//    출생지 미입력 · 지오코딩 fallback · 호출 실패 · 시각 미상은 전부 태양궁만 남기는 폴백으로 간다.
// 🔴 출생 시각은 벽시계 값이라 어느 표준시인지 함께 받아야 한다(허브의 "출생지 표준시" 선택지).
//    못 받으면 Asia/Seoul 로 두되, 어느 시간대로 계산했는지 블록에 반드시 적는다(추정 금지 원칙).
import { lunarToSolar } from "@/lib/korean-calendar";
import { getZodiacFromBirthDate } from "@/lib/yeon/zodiac";
// 베다 엔드포인트는 시간대를 숫자 오프셋으로만 받는다. IANA 이름을 출생 시점 기준 오프셋으로 바꾼다
// (여름시간 경계를 2패스로 보정하는 워커 정본을 그대로 쓴다 — Intl 만 쓰므로 클라이언트에서도 돈다).
import { wallClockToUtcMillis } from "@/worker/lib/iana-offset.js";

export type AstroFactsInput = {
  birthDate: string;
  calendarType?: string;
  leapMonth?: boolean;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthPlace?: string;
  /** IANA 시간대 이름. 비면 Asia/Seoul. */
  birthTimezone?: string;
};

export type AstroFactsOptions = {
  /** "full" = 행성·하우스·각 전체(점성술 도구), "summary" = 축만(종합). */
  scope?: "full" | "summary";
};

const REQUEST_TIMEOUT_MS = 6000;
const DEFAULT_BIRTH_TIMEZONE = "Asia/Seoul";

const SIGN_KO: Record<string, string> = {
  Aries: "양자리", Taurus: "황소자리", Gemini: "쌍둥이자리", Cancer: "게자리",
  Leo: "사자자리", Virgo: "처녀자리", Libra: "천칭자리", Scorpio: "전갈자리",
  Sagittarius: "궁수자리", Capricorn: "염소자리", Aquarius: "물병자리", Pisces: "물고기자리",
};

const PLANET_KO: Record<string, string> = {
  Sun: "태양", Moon: "달", Mercury: "수성", Venus: "금성", Mars: "화성",
  Jupiter: "목성", Saturn: "토성", Uranus: "천왕성", Neptune: "해왕성", Pluto: "명왕성",
};

const ELEMENT_KO: Record<string, string> = { Fire: "불", Earth: "흙", Air: "공기", Water: "물" };
const MODE_KO: Record<string, string> = { Cardinal: "활동", Fixed: "고정", Mutable: "변통" };
const ASPECT_KO: Record<string, string> = {
  conjunction: "합(0°)", sextile: "육각(60°)", square: "사각(90°)", trine: "삼각(120°)", opposition: "대각(180°)",
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function label(table: Record<string, string>, value: unknown) {
  const raw = text(value);
  return table[raw] || raw;
}

function resolveBirthTimezone(input: AstroFactsInput) {
  return text(input.birthTimezone) || DEFAULT_BIRTH_TIMEZONE;
}

function parseYmd(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseHm(value: string | undefined) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function isLunarCalendar(value: string | undefined) {
  const key = String(value || "").trim().toLowerCase();
  return key === "음력" || key === "lunar";
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(part: { year: number; month: number; day: number }) {
  return `${part.year}-${pad2(part.month)}-${pad2(part.day)}`;
}

/** 도(度)를 별자리 안 각도로. 황경 81.85 → "21.85°". */
function degreeInSign(longitude: unknown) {
  const value = Number(longitude);
  if (!Number.isFinite(value)) return "";
  return `${(((value % 30) + 30) % 30).toFixed(2)}°`;
}

/** 점성술은 그레고리력으로 돈다. 음력 입력은 코어로 환산하고, 환산 실패는 산출 포기. */
function resolveSolarBirth(input: AstroFactsInput) {
  const parsed = parseYmd(input.birthDate);
  if (!parsed) return null;
  if (!isLunarCalendar(input.calendarType)) return parsed;
  const converted = lunarToSolar(parsed.year, parsed.month, parsed.day, Boolean(input.leapMonth));
  if (!converted) return null;
  return { year: converted.year, month: converted.month, day: converted.day };
}

async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type Coordinates = { lat: number; lon: number; name: string };

/** 🔴 fallback === true 는 워커가 서울 기본값을 돌려준 것이다 — 좌표 없음으로 취급한다. */
async function resolveCoordinates(place: string): Promise<Coordinates | null> {
  if (!place) return null;
  const payload = await fetchJson(`/api/geocode?place=${encodeURIComponent(place)}`);
  if (!payload || payload.fallback === true) return null;
  const lat = Number(payload.lat);
  const lon = Number(payload.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, name: text(payload.name) || place };
}

/** 좌표·시각이 모두 있을 때만 부른다. 실패는 전부 null(예외를 위로 던지지 않는다). */
async function fetchChart(
  solar: { year: number; month: number; day: number },
  hm: { hour: number; minute: number },
  coords: Coordinates,
  timezone: string,
) {
  const payload = await fetchJson("/api/astrology/basic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: formatDate(solar),
      time: `${pad2(hm.hour)}:${pad2(hm.minute)}`,
      timezone,
      latitude: coords.lat,
      longitude: coords.lon,
    }),
  });
  return payload?.ok === true ? payload : null;
}

function commonBirthLines(input: AstroFactsInput, solar: { year: number; month: number; day: number }, hm: { hour: number; minute: number } | null) {
  const timezone = resolveBirthTimezone(input);
  const lines: string[] = [];
  const lunarInput = isLunarCalendar(input.calendarType);
  lines.push(`- 입력 생년월일: ${input.birthDate} (${lunarInput ? `음력${input.leapMonth ? " 윤달" : ""}` : "양력"})`);
  if (lunarInput) lines.push(`- 양력 환산일: ${formatDate(solar)}`);
  const timezoneLabel = timezone === DEFAULT_BIRTH_TIMEZONE ? "한국 표준시" : timezone;
  lines.push(`- 출생 시각: ${hm ? `${input.birthTime} (${timezoneLabel} 기준)` : "미상"}`);
  return lines;
}

/** 좌표·시각을 못 갖췄을 때의 공통 폴백 — 태양 별자리만 확정값으로 남기고 나머지는 비운다. */
function sunSignFallbackLines(solar: { year: number; month: number; day: number }, reason: string) {
  const lines: string[] = [];
  const sign = getZodiacFromBirthDate(formatDate(solar));
  if (sign) lines.push(`- 태양 별자리: ${sign} (생년월일만으로 확정되는 값)`);
  lines.push(`- 상승궁·달 별자리·하우스·행성 각: ${reason} 산출하지 않았습니다(추정 금지).`);
  return lines;
}

export async function buildAstrologyPromptFacts(input: AstroFactsInput, options: AstroFactsOptions = {}): Promise<string> {
  try {
    const scope = options.scope === "summary" ? "summary" : "full";
    const solar = resolveSolarBirth(input);
    if (!solar) return "";

    const hm = input.birthTimeUnknown ? null : parseHm(input.birthTime);
    const lines: string[] = ["[점성술 차트 산출 데이터]", ...commonBirthLines(input, solar, hm)];

    const coords = hm ? await resolveCoordinates(text(input.birthPlace)) : null;
    const chart = coords && hm ? await fetchChart(solar, hm, coords, resolveBirthTimezone(input)) : null;

    if (!chart) {
      lines.push(
        ...sunSignFallbackLines(
          solar,
          !hm ? "출생 시각이 없어" : coords ? "출생 차트 계산에 실패해" : "출생지 좌표를 확인하지 못해",
        ),
      );
      if (!coords && hm) lines.push("- 전체 차트가 필요하면: 출생 지역을 도시 단위(예: 서울, 부산)로 입력해 주세요.");
      lines.push("");
      lines.push(
        "위 값은 확정된 것만 적은 것입니다. 적혀 있지 않은 상승궁·하우스·행성 각을 지어내지 말고, 태양 별자리와 사용자가 적어 준 정보 안에서만 해석해 주세요.",
      );
      return lines.join("\n");
    }

    const engine = (chart.engine || {}) as Record<string, unknown>;
    const angles = (chart.angles || {}) as Record<string, Record<string, unknown> | null>;
    const summary = (chart.summary || {}) as Record<string, unknown>;
    const planets = (Array.isArray(chart.planets) ? chart.planets : []) as Record<string, unknown>[];
    const houses = (Array.isArray(chart.houses) ? chart.houses : []) as Record<string, unknown>[];
    const aspects = (Array.isArray(chart.aspects) ? chart.aspects : []) as Record<string, unknown>[];

    lines.push(`- 출생지 좌표: ${coords!.name} (위도 ${coords!.lat.toFixed(4)}, 경도 ${coords!.lon.toFixed(4)})`);
    lines.push(`- 계산 기준: Swiss Ephemeris(${text(engine.mode) || "unknown"}) · 시간대 ${resolveBirthTimezone(input)} · 하우스 커스프 ${engine.ephemerisLoaded === true ? "산출됨" : "미산출"}`);

    const ascendant = angles.ascendant;
    const midheaven = angles.midheaven;
    if (ascendant) lines.push(`- 상승궁(ASC): ${label(SIGN_KO, ascendant.sign)} ${degreeInSign(ascendant.longitude)}`);
    if (midheaven) lines.push(`- 천정(MC): ${label(SIGN_KO, midheaven.sign)} ${degreeInSign(midheaven.longitude)}`);
    lines.push(
      `- 3중주: 태양 ${label(SIGN_KO, summary.sunSign)} · 달 ${label(SIGN_KO, summary.moonSign)} · 상승 ${label(SIGN_KO, summary.risingSign)}`,
    );

    const dominantElements = (Array.isArray(summary.dominantElements) ? summary.dominantElements : []) as string[];
    const dominantModes = (Array.isArray(summary.dominantModes) ? summary.dominantModes : []) as string[];
    if (dominantElements.length || dominantModes.length) {
      lines.push(
        `- 우세 성질: 원소 ${dominantElements.map((item) => label(ELEMENT_KO, item)).join(" > ") || "미산출"} · 모드 ${dominantModes.map((item) => label(MODE_KO, item)).join(" > ") || "미산출"}`,
      );
    }

    if (scope === "full") {
      if (planets.length) {
        lines.push("- 행성 배치(별자리 · 별자리 내 각도 · 하우스):");
        for (const planet of planets) {
          const house = Number(planet.house);
          lines.push(
            `  · ${label(PLANET_KO, planet.name)} ${label(SIGN_KO, planet.sign)} ${degreeInSign(planet.longitude)}${Number.isFinite(house) ? ` · ${house}하우스` : ""}${planet.retrograde === true ? " · 역행" : ""}`,
          );
        }
      }
      if (houses.length) {
        lines.push(
          `- 하우스 커스프: ${houses.map((house) => `${house.house} ${label(SIGN_KO, house.sign)} ${degreeInSign(house.longitude)}`).join(" · ")}`,
        );
      }
      if (aspects.length) {
        lines.push("- 주요 각(오브 8° 이내):");
        for (const aspect of aspects) {
          lines.push(
            `  · ${label(PLANET_KO, aspect.p1)} ${label(ASPECT_KO, aspect.type)} ${label(PLANET_KO, aspect.p2)} · 오브 ${Number(aspect.orb).toFixed(2)}°`,
          );
        }
      }
    }

    lines.push("");
    lines.push(
      "위 차트는 Swiss Ephemeris 가 이미 산출한 확정값입니다. 행성 위치·별자리·하우스·각을 다시 계산하거나 바꾸지 말고 그대로 근거로 삼아, 입력된 질문에 맞춰 해석만 해 주세요. 표에 없는 행성이나 각을 만들어 넣지 마세요.",
    );
    return lines.join("\n");
  } catch {
    return "";
  }
}

export async function buildVedicPromptFacts(input: AstroFactsInput): Promise<string> {
  try {
    const solar = resolveSolarBirth(input);
    if (!solar) return "";

    const hm = input.birthTimeUnknown ? null : parseHm(input.birthTime);
    const coords = await resolveCoordinates(text(input.birthPlace));
    const { offsetHours } = wallClockToUtcMillis(
      { year: solar.year, month: solar.month, day: solar.day, hour: hm?.hour ?? 12, minute: hm?.minute ?? 0 },
      resolveBirthTimezone(input),
    );

    const payload = await fetchJson("/api/nakshatra/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: solar.year,
        month: solar.month,
        day: solar.day,
        hour: hm?.hour ?? 12,
        minute: hm?.minute ?? 0,
        timezone: offsetHours,
        lat: coords?.lat ?? 37.5665,
        lon: coords?.lon ?? 126.978,
        timeUnknown: !hm,
      }),
    });
    if (!payload || payload.ok !== true) return "";

    const summary = (payload.summary || {}) as Record<string, unknown>;
    const india = (payload.india || {}) as Record<string, unknown>;
    const dasha = (india.dasha || {}) as Record<string, unknown>;
    const transparency = (payload.transparency || {}) as Record<string, unknown>;

    const lines: string[] = ["[베다 점성 산출 데이터]", ...commonBirthLines(input, solar, hm)];
    lines.push(
      `- 좌표 기준: ${coords ? `${coords.name} (위도 ${coords.lat.toFixed(4)}, 경도 ${coords.lon.toFixed(4)})` : "서울 기본값(출생지 미입력) — 파다는 경계에서 달라질 수 있습니다"}`,
    );

    const nakshatraKo = text(summary.nakshatraKo) || text(india.nameKo);
    const nakshatraEn = text(summary.nakshatraEn) || text(india.nameEn);
    if (nakshatraKo || nakshatraEn) {
      lines.push(`- 나크샤트라: ${nakshatraKo}${nakshatraEn ? `(${nakshatraEn})` : ""} · 지배성 ${text(summary.lordKo) || "미상"}`);
    }
    lines.push(
      `- 파다(4분위): ${Number.isFinite(Number(summary.pada)) ? `${summary.pada}번째` : "출생 시각이 없어 산출하지 않았습니다(추정 금지)"}`,
    );

    const traits = [
      text(india.ganaKo) ? `가나 ${india.ganaKo}` : "",
      text(india.yoni) ? `요니 ${india.yoni}` : "",
      text(india.nadiKo) ? `나디 ${india.nadiKo}` : "",
      text(india.deity) ? `신격 ${india.deity}` : "",
      text(india.motiveKo) ? `동기 ${india.motiveKo}` : "",
    ].filter(Boolean);
    if (traits.length) lines.push(`- 나크샤트라 속성: ${traits.join(" · ")}`);

    const mahadasha = text(dasha.currentMahadashaKo) || text(dasha.currentMahadasha);
    const antardasha = text(dasha.currentAntardashaKo) || text(dasha.currentAntardasha);
    if (mahadasha || antardasha) {
      lines.push(`- 현재 다샤(오늘 기준): 마하다샤 ${mahadasha || "미상"} / 안타르다샤 ${antardasha || "미상"}`);
    }

    const sukuyoKo = text(summary.sukuyoKo);
    if (sukuyoKo) lines.push(`- 대응 동양 숙요: ${sukuyoKo}${text(summary.sukuyoHan) ? `(${summary.sukuyoHan})` : ""}`);

    lines.push(
      `- 산출 규칙: 아야남샤 ${text(transparency.ayanamsa) || "미상"} · 시데리얼 달 황경 ${Number.isFinite(Number(transparency.siderealMoonLongitude)) ? `${transparency.siderealMoonLongitude}°` : "미상"} · 달 위치는 Swiss Ephemeris, 음력은 한국 음양력 코어`,
    );

    lines.push("");
    lines.push(
      "위 값은 내부 엔진이 이미 산출한 확정값입니다. 나크샤트라·파다·다샤를 다시 계산하거나 바꾸지 말고 그대로 근거로 삼아, 입력된 질문에 맞춰 해석만 해 주세요. 라그나(상승궁)는 여기에 없으니 단정하지 마세요.",
    );
    return lines.join("\n");
  } catch {
    return "";
  }
}
