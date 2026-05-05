import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { Solar } from "lunar-javascript";
import { callVertexGemini } from "@/app/_lib/callVertexGemini";

export const runtime = "nodejs";
export const maxDuration = 300;

const MANSIONS = [
  ["각", "角", "Kaku", "동", "목", "청룡"],
  ["항", "亢", "Kou", "동", "금", "청룡"],
  ["저", "氐", "Tei", "동", "토", "청룡"],
  ["방", "房", "Bou", "동", "일", "청룡"],
  ["심", "心", "Shin", "동", "월", "청룡"],
  ["미", "尾", "Bi", "동", "화", "청룡"],
  ["기", "箕", "Ki", "동", "수", "청룡"],
  ["두", "斗", "To", "북", "목", "현무"],
  ["여", "女", "Jo", "북", "토", "현무"],
  ["허", "虛", "Kyo", "북", "일", "현무"],
  ["위", "危", "Ki", "북", "월", "현무"],
  ["실", "室", "Shitsu", "북", "화", "현무"],
  ["벽", "壁", "Heki", "북", "수", "현무"],
  ["규", "奎", "Kei", "서", "목", "백호"],
  ["루", "婁", "Ro", "서", "금", "백호"],
  ["위", "胃", "I", "서", "토", "백호"],
  ["묘", "昴", "Bo", "서", "일", "백호"],
  ["필", "畢", "Hitsu", "서", "월", "백호"],
  ["자", "觜", "Shi", "서", "화", "백호"],
  ["삼", "參", "Shin", "서", "수", "백호"],
  ["정", "井", "Sei", "남", "목", "주작"],
  ["귀", "鬼", "Ki", "남", "금", "주작"],
  ["류", "柳", "Ryu", "남", "토", "주작"],
  ["성", "星", "Sei", "남", "일", "주작"],
  ["장", "張", "Cho", "남", "월", "주작"],
  ["익", "翼", "Yoku", "남", "화", "주작"],
  ["진", "軫", "Shin", "남", "수", "주작"],
] as const;

const MONTH_START = [11, 13, 15, 17, 19, 21, 23, 25, 0, 2, 4, 7];
const CHAPTER_META = [
  { num: 1, title: "영혼의 원형", subtitle: "탄생 숙요가 새긴 운명 코드", icon: "🌑" },
  { num: 2, title: "감정의 조수간만", subtitle: "달의 주기와 정서 파동", icon: "🌊" },
  { num: 3, title: "페르소나와 브랜딩", subtitle: "세상이 당신을 기억하는 방식", icon: "🎭" },
  { num: 4, title: "자산의 중력", subtitle: "부를 끌어당기는 달빛 전략", icon: "💰" },
  { num: 5, title: "보이지 않는 톱니바퀴", subtitle: "성공 뒤의 협력 역학", icon: "⚙️" },
  { num: 6, title: "관계의 정밀 레이더", subtitle: "6대 숙요 관계 역학", icon: "📡" },
  { num: 7, title: "파괴적 혁신", subtitle: "위기를 기회로 바꾸는 법", icon: "💥" },
  { num: 8, title: "조화로운 성장", subtitle: "공간과 환경의 법칙", icon: "🌿" },
  { num: 9, title: "정서적 유대", subtitle: "깊은 연결을 만드는 감정 지능", icon: "❤️" },
  { num: 10, title: "타이밍과 의식", subtitle: "달의 리듬을 쓰는 실행법", icon: "🕯️" },
  { num: 11, title: "그림자와 회복", subtitle: "숙요 그림자 통합", icon: "🌓" },
  { num: 12, title: "인생 로드맵", subtitle: "계절별 달빛 전략", icon: "🧭" },
  { num: 13, title: "마스터 플랜", subtitle: "핵심 처방과 30일 실천", icon: "📜" },
];

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

function pad2(v: number) {
  return String(v).padStart(2, "0");
}

function pickGeminiKeys(): string[] {
  return [
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
}

let geminiKeyCursor = 0;

function rotateGeminiKeys(keys: string[], seed = 0): string[] {
  if (!keys.length) return [];
  const len = keys.length;
  const base = Number.isFinite(Number(seed)) ? Number(seed) : 0;
  const start = ((geminiKeyCursor + base) % len + len) % len;
  geminiKeyCursor = (start + 1) % len;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

function parseGeminiText(payload: unknown): string {
  const p = payload as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  for (const c of p?.candidates ?? []) {
    for (const part of c?.content?.parts ?? []) {
      if (part?.text?.trim()) return part.text.trim();
    }
  }
  return "";
}

function parseSections(text: string) {
  return text.split(/\n(?=##\s+)/g).map((part) => {
    const m = part.match(/^##\s*(.+?)\n([\s\S]*)$/);
    return m ? { title: m[1].trim(), body: m[2].trim() } : null;
  }).filter(Boolean) as { title: string; body: string }[];
}

function buildSukuyoFromLunar(lunarMonth: number, lunarDay: number, isLeap = false) {
  const safeMonth = Math.max(1, Math.min(12, Math.abs(Number(lunarMonth) || 1)));
  const safeDay = Math.max(1, Math.min(30, Math.abs(Number(lunarDay) || 1)));
  const start = MONTH_START[safeMonth - 1] ?? 11;
  const mansionIdx = (start + safeDay - 1) % 27;
  const m = MANSIONS[mansionIdx];
  return {
    mansionIdx,
    mansion: m[0],
    mansionCh: m[1],
    mansionEn: m[2],
    icon: "🌙",
    direction: m[3],
    element: m[4],
    animal: m[5],
    lunarMonth: safeMonth,
    lunarDay: safeDay,
    isLeap,
    source: "kasi-api",
  };
}

async function fetchKasiLunarFromSolar(req: NextRequest, year: number, month: number, day: number) {
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/kasi/calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "getLunCalInfo",
        params: {
          solYear: String(year),
          solMonth: pad2(month),
          solDay: pad2(day),
        },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok || !Array.isArray(data?.rows) || !data.rows.length) return null;
    const row = data.rows[0] || {};
    const lunarYear = Number(row.lunYear ?? row.year ?? row.lunarYear);
    const lunarMonth = Number(row.lunMonth ?? row.month ?? row.lunarMonth);
    const lunarDay = Number(row.lunDay ?? row.day ?? row.lunarDay);
    const leapRaw = String(row.lunLeapmonth ?? row.isLeap ?? row.leapMonth ?? "").trim().toLowerCase();
    const isLeap = leapRaw === "1" || leapRaw === "y" || leapRaw === "true" || leapRaw === "윤" || leapRaw === "leap";
    if (!Number.isFinite(lunarYear) || !Number.isFinite(lunarMonth) || !Number.isFinite(lunarDay)) return null;
    return { lunarYear, lunarMonth, lunarDay, isLeap };
  } catch {
    return null;
  }
}

async function calcSukuyo(req: NextRequest, year: number, month: number, day: number, hour = 12) {
  const kasiLunar = await fetchKasiLunarFromSolar(req, year, month, day);
  if (kasiLunar) {
    return buildSukuyoFromLunar(kasiLunar.lunarMonth, kasiLunar.lunarDay, kasiLunar.isLeap);
  }

  const lunar = Solar.fromYmdHms(year, month, day, hour, 0, 0).getLunar();
  return {
    ...buildSukuyoFromLunar(Math.abs(Number(lunar.getMonth())), Number(lunar.getDay()), !!lunar.isLeap()),
    source: "fallback-lunar-javascript",
  };
}

function relation(myIdx: number, otherIdx?: number | null) {
  if (otherIdx == null) return null;
  const d = (otherIdx - myIdx + 27) % 27;
  const labels = ["명", "영친", "우쇠", "안괴", "성위", "위성", "친영", "쇠우", "괴안"];
  return { distance: d, label: labels[d % labels.length], score: Math.max(38, 96 - Math.abs(13 - d) * 4) };
}

function normalizeDeg(value: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  let d = n % 360;
  if (d < 0) d += 360;
  return d;
}

function extractSwissEclipticLongitude(chartPayload: any, planetName: string) {
  if (!chartPayload || !planetName) return NaN;
  const direct = Number(chartPayload?.planets?.[planetName]?.longitude);
  if (Number.isFinite(direct)) return normalizeDeg(direct);
  const flat = Number(chartPayload?.planets?.[planetName]);
  if (Number.isFinite(flat)) return normalizeDeg(flat);
  const lower = String(planetName).toLowerCase();
  const lowerObj = Number(chartPayload?.planets?.[lower]?.longitude);
  if (Number.isFinite(lowerObj)) return normalizeDeg(lowerObj);
  const lowerFlat = Number(chartPayload?.planets?.[lower]);
  if (Number.isFinite(lowerFlat)) return normalizeDeg(lowerFlat);
  return NaN;
}

function resolveMoonPhaseByAngle(angle: number) {
  const a = normalizeDeg(angle);
  if (!Number.isFinite(a)) {
    return {
      phaseAngle: null,
      illumination: null,
      label: "정보 없음",
      cycle: "미확인",
      yinYangFlow: "미확인",
    };
  }

  let label = "정보 없음";
  if (a < 22.5 || a >= 337.5) label = "삭(신월)";
  else if (a < 67.5) label = "초승";
  else if (a < 112.5) label = "상현";
  else if (a < 157.5) label = "차는달";
  else if (a < 202.5) label = "망(보름)";
  else if (a < 247.5) label = "기우는달";
  else if (a < 292.5) label = "하현";
  else label = "그믐";

  const illumination = Math.round((((1 - Math.cos((a * Math.PI) / 180)) / 2) * 1000)) / 10;
  const waxing = a < 180;
  return {
    phaseAngle: Math.round(a * 10) / 10,
    illumination,
    label,
    cycle: waxing ? "상현 이전(증가)" : "하현 이후(감소)",
    yinYangFlow: waxing ? "양기 생장" : "음기 수렴",
  };
}

async function fetchSwissSukuyoBasis(req: NextRequest, payload: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  timezone?: number;
  lat?: number;
  lon?: number;
}) {
  try {
    const response = await fetch(`${req.nextUrl.origin}/api/astro/western-chart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: payload.year,
        month: payload.month,
        day: payload.day,
        hour: payload.hour,
        minute: Number.isFinite(Number(payload.minute)) ? Number(payload.minute) : 0,
        timezone: Number.isFinite(Number(payload.timezone)) ? Number(payload.timezone) : 9,
        lat: Number.isFinite(Number(payload.lat)) ? Number(payload.lat) : 37.5665,
        lon: Number.isFinite(Number(payload.lon)) ? Number(payload.lon) : 126.978,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) return null;
    const chartPayload = data?.chart ?? data?.data ?? data;
    return {
      moonLongitude: extractSwissEclipticLongitude(chartPayload, "Moon"),
      sunLongitude: extractSwissEclipticLongitude(chartPayload, "Sun"),
    };
  } catch {
    return null;
  }
}

function buildSukuyoOrientalChart(sukuyo: any, partner: any, rel: any, swissBasis: any, partnerSwissBasis: any) {
  const moonLon = Number(swissBasis?.moonLongitude);
  const sunLon = Number(swissBasis?.sunLongitude);
  const phase = resolveMoonPhaseByAngle(moonLon - sunLon);

  const partnerMoonLon = Number(partnerSwissBasis?.moonLongitude);
  const partnerSunLon = Number(partnerSwissBasis?.sunLongitude);
  const partnerPhase = Number.isFinite(partnerMoonLon) && Number.isFinite(partnerSunLon)
    ? resolveMoonPhaseByAngle(partnerMoonLon - partnerSunLon)
    : null;

  const wheel = MANSIONS.map((m, idx) => {
    const isPrimary = idx === sukuyo.mansionIdx;
    const isPartner = partner ? idx === partner.mansionIdx : false;
    return {
      index: idx + 1,
      mansion: m[0],
      mansionCh: m[1],
      mansionEn: m[2],
      direction: m[3],
      element: m[4],
      guardian: m[5],
      isPrimary,
      isPartner,
      role: isPrimary ? "본명숙" : (isPartner ? "상대숙" : ""),
    };
  });

  return {
    type: "sukuyo-oriental-chart",
    source: Number.isFinite(moonLon) && Number.isFinite(sunLon) ? "swiss-api+oriental-mapping" : String(sukuyo.source || "kasi-api"),
    core: {
      primaryMansion: `${sukuyo.mansion}宿(${sukuyo.mansionCh})`,
      primaryDirection: sukuyo.direction,
      primaryElement: sukuyo.element,
      primaryGuardian: sukuyo.animal,
      lunarDate: `${sukuyo.lunarMonth}월 ${sukuyo.lunarDay}일`,
      partnerMansion: partner ? `${partner.mansion}宿(${partner.mansionCh})` : null,
    },
    moonPhase: phase,
    relation: rel ? {
      label: rel.label,
      distance: rel.distance,
      score: rel.score,
    } : null,
    swissBasis: {
      moonLongitude: Number.isFinite(moonLon) ? Math.round(normalizeDeg(moonLon) * 100) / 100 : null,
      sunLongitude: Number.isFinite(sunLon) ? Math.round(normalizeDeg(sunLon) * 100) / 100 : null,
      partnerMoonLongitude: Number.isFinite(partnerMoonLon) ? Math.round(normalizeDeg(partnerMoonLon) * 100) / 100 : null,
      partnerSunLongitude: Number.isFinite(partnerSunLon) ? Math.round(normalizeDeg(partnerSunLon) * 100) / 100 : null,
    },
    partnerMoonPhase: partnerPhase,
    wheel,
  };
}

function buildSukuyoChartSummaryLine(chart: any) {
  if (!chart) return "정보 없음";
  const core = chart.core || {};
  const phase = chart.moonPhase || {};
  const rel = chart.relation || {};
  return [
    `본명숙 ${core.primaryMansion || "정보 없음"}`,
    `방위 ${core.primaryDirection || "정보 없음"}`,
    `오행 ${core.primaryElement || "정보 없음"}`,
    `월상 ${phase.label || "정보 없음"}`,
    `삭망각 ${Number.isFinite(Number(phase.phaseAngle)) ? Number(phase.phaseAngle) : "정보 없음"}도`,
    `조도 ${Number.isFinite(Number(phase.illumination)) ? Number(phase.illumination) : "정보 없음"}%`,
    rel?.label ? `관계축 ${rel.label}` : null,
  ].filter(Boolean).join(", ");
}

function fallbackText(chapter: number, sukuyo: ReturnType<typeof calcSukuyo>, rel: ReturnType<typeof relation>) {
  const meta = CHAPTER_META[chapter - 1] ?? CHAPTER_META[0];
  const relLine = rel ? `상대와의 숙요 관계는 ${rel.label}, 거리 ${rel.distance}, 카르마 점수 ${rel.score}입니다.` : "상대 정보가 없으므로 개인 숙요 흐름에 집중합니다.";
  return [
    `## ${meta.title}`,
    `${sukuyo.mansion}숙(${sukuyo.mansionCh}宿)은 ${sukuyo.direction}방 ${sukuyo.element} 기운으로 움직이는 27수 숙요점의 별입니다. 이 리포트는 사주 팔자 해석이 아니라 음력 탄생일에서 산출한 숙요 별자리와 달의 리듬을 기준으로 작성됩니다.`,
    `## 핵심 해석`,
    `${meta.subtitle} 관점에서 보면, 지금 중요한 것은 감정의 파동을 억지로 고정하지 않고 반복되는 관계 패턴과 선택 타이밍을 관찰하는 것입니다. ${sukuyo.mansion}숙은 직감이 먼저 길을 여는 타입이므로, 중요한 결정 전에는 하루 정도 달빛 숙성 시간을 두는 편이 좋습니다.`,
    `## 관계와 실행`,
    `${relLine} 이번 챕터의 실천은 간단합니다. 오늘의 감정 기록, 다음 행동 하나, 피해야 할 반응 하나를 분리해 적고 7일 동안 반복하세요. 숙요점은 사건 자체보다 리듬의 반복을 읽을 때 정확도가 올라갑니다.`,
  ].join("\n\n");
}

function buildPrompt(chapter: number, sukuyo: ReturnType<typeof calcSukuyo>, partner?: ReturnType<typeof calcSukuyo> | null, chart?: any) {
  const meta = CHAPTER_META[chapter - 1] ?? CHAPTER_META[0];
  const rel = relation(sukuyo.mansionIdx, partner?.mansionIdx);
  const chartLine = buildSukuyoChartSummaryLine(chart);
  return `당신은 전문 숙요점(宿曜占, 27수) 리포트 작가입니다.

중요: 사주명리 PDF가 아니라 숙요점 PDF입니다. 십성, 용신, 대운 중심으로 쓰지 말고 27수, 달의 리듬, 숙요 관계성, 카르마 패턴 중심으로 작성하세요.

사용자 숙요: ${sukuyo.mansion}숙(${sukuyo.mansionCh}宿), ${sukuyo.direction}방, ${sukuyo.element} 기운, 음력 ${sukuyo.lunarMonth}월 ${sukuyo.lunarDay}일
상대 숙요: ${partner ? `${partner.mansion}숙(${partner.mansionCh}宿)` : "없음"}
관계 데이터: ${rel ? `${rel.label}, 거리 ${rel.distance}, 점수 ${rel.score}` : "개인 리포트"}
숙요 동양식 차트 요약: ${chartLine}
챕터 ${chapter}: ${meta.title} - ${meta.subtitle}

아래 형식을 지켜 한국어로 고품질 PDF 본문을 작성하세요.
## 핵심 원형
## 현재 삶에서 드러나는 방식
## 관계와 카르마
## 실천 처방

각 섹션은 2문단 이상, 추상적 위로보다 구체적 행동과 판단 기준을 포함하세요.`;
}

async function generateText(prompt: string) {
  try {
    const text = await callVertexGemini(prompt, { temperature: 0.86, maxOutputTokens: 8192 });
    if (text) return text;
  } catch {
    // Fallback below keeps PDF generation usable when AI credentials are unavailable.
  }

  const keys = rotateGeminiKeys(pickGeminiKeys(), prompt.length);
  if (!keys.length) return "";
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  for (const model of models) {
    const endpoint = GEMINI_ENDPOINT.replace("{model}", encodeURIComponent(model));
    for (const key of keys) {
      try {
        const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.86, maxOutputTokens: 8192, topP: 0.95 },
          }),
          signal: AbortSignal.timeout(18_000),
        });
        if (!response.ok) continue;
        const payload = await response.json().catch(() => ({}));
        const text = parseGeminiText(payload);
        if (text) return text;
      } catch {
        // try next key/model
      }
    }
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const year = Number(body.year);
    const month = Number(body.month);
    const day = Number(body.day);
    const hour = Number.isFinite(Number(body.hour)) ? Number(body.hour) : 12;
    const chapter = Number(body.chapter || 1);
    if (!year || !month || !day) return NextResponse.json({ ok: false, error: "Missing birth date" }, { status: 400 });
    if (chapter < 1 || chapter > 13) return NextResponse.json({ ok: false, error: "Chapter must be 1-13" }, { status: 400 });

    const sukuyo = await calcSukuyo(req, year, month, day, hour);
    const hasPartner = body.partnerYear && body.partnerMonth && body.partnerDay;
    const partner = hasPartner
      ? await calcSukuyo(req, Number(body.partnerYear), Number(body.partnerMonth), Number(body.partnerDay), Number(body.partnerHour ?? 12))
      : null;
    const rel = relation(sukuyo.mansionIdx, partner?.mansionIdx);
    const swissBasis = await fetchSwissSukuyoBasis(req, {
      year,
      month,
      day,
      hour,
      minute: Number(body.minute ?? 0),
      timezone: Number(body.timezone ?? 9),
      lat: Number(body.lat ?? 37.5665),
      lon: Number(body.lon ?? 126.978),
    });
    const partnerSwissBasis = hasPartner
      ? await fetchSwissSukuyoBasis(req, {
        year: Number(body.partnerYear),
        month: Number(body.partnerMonth),
        day: Number(body.partnerDay),
        hour: Number(body.partnerHour ?? 12),
        minute: Number(body.partnerMinute ?? 0),
        timezone: Number(body.partnerTimezone ?? body.timezone ?? 9),
        lat: Number(body.partnerLat ?? body.lat ?? 37.5665),
        lon: Number(body.partnerLon ?? body.lon ?? 126.978),
      })
      : null;
    const chart = buildSukuyoOrientalChart(sukuyo, partner, rel, swissBasis, partnerSwissBasis);
    const prompt = buildPrompt(chapter, sukuyo, partner, chart);
    let text = await generateText(prompt);
    let usedFallback = false;
    if (!text) {
      usedFallback = true;
      text = fallbackText(chapter, sukuyo, rel);
    }

    return NextResponse.json({
      ok: true,
      sukuyo,
      partner,
      relation: rel,
      chart,
      chapter,
      chapterMeta: CHAPTER_META[chapter - 1],
      text,
      sections: parseSections(text),
      usedFallback,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/premium/sukuyo-life]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
