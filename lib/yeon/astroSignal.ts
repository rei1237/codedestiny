import type { DestinyProfileCard } from "@/app/_lib/profile-card-storage";

export const YEON_ZODIAC_SIGNS = [
  "양자리",
  "황소자리",
  "쌍둥이자리",
  "게자리",
  "사자자리",
  "처녀자리",
  "천칭자리",
  "전갈자리",
  "사수자리",
  "염소자리",
  "물병자리",
  "물고기자리",
] as const;

export type YeonZodiacSign = (typeof YEON_ZODIAC_SIGNS)[number];
export type YeonAstroElement = "fire" | "earth" | "air" | "water" | "unknown";
export type YeonAstroMode = "cardinal" | "fixed" | "mutable" | "unknown";
export type YeonAstroPlanetKey = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";

export type YeonAstroPlanetSignal = {
  key: YeonAstroPlanetKey;
  label: string;
  sign: YeonZodiacSign | "";
  degree: number | null;
  house: number | null;
  retrograde: boolean;
  element: YeonAstroElement;
  mode: YeonAstroMode;
};

export type YeonAstroAspectSignal = {
  planets: [YeonAstroPlanetKey, YeonAstroPlanetKey];
  label: string;
  type: string;
  orb: number | null;
  tone: "soft" | "spark" | "tension" | "mirror" | "neutral";
};

export type YeonAstroSignal = {
  source: string;
  engineMode: string;
  ephemerisLoaded: boolean;
  sunSign: YeonZodiacSign | "";
  moonSign: YeonZodiacSign | "";
  ascendantSign: YeonZodiacSign | "";
  mercurySign: YeonZodiacSign | "";
  venusSign: YeonZodiacSign | "";
  marsSign: YeonZodiacSign | "";
  jupiterSign: YeonZodiacSign | "";
  saturnSign: YeonZodiacSign | "";
  dominantElement: YeonAstroElement;
  dominantMode: YeonAstroMode;
  planets: Record<YeonAstroPlanetKey, YeonAstroPlanetSignal | null>;
  majorAspects: YeonAstroAspectSignal[];
  heartTone: string;
  relationTone: string;
  actionTone: string;
  healingTone: string;
  evidence: string[];
};

export type YeonAstroBirthPayload = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timezone: number;
  lat: number;
  lon: number;
  name?: string;
  gender?: string;
  birthDate: string;
  birthTime: string;
  timezoneName: string;
  birthPlace?: string;
};

const PLANET_LABEL: Record<YeonAstroPlanetKey, string> = {
  Sun: "태양",
  Moon: "달",
  Mercury: "수성",
  Venus: "금성",
  Mars: "화성",
  Jupiter: "목성",
  Saturn: "토성",
};

const ELEMENT_BY_SIGN: Record<YeonZodiacSign, YeonAstroElement> = {
  양자리: "fire",
  황소자리: "earth",
  쌍둥이자리: "air",
  게자리: "water",
  사자자리: "fire",
  처녀자리: "earth",
  천칭자리: "air",
  전갈자리: "water",
  사수자리: "fire",
  염소자리: "earth",
  물병자리: "air",
  물고기자리: "water",
};

const MODE_BY_SIGN: Record<YeonZodiacSign, YeonAstroMode> = {
  양자리: "cardinal",
  황소자리: "fixed",
  쌍둥이자리: "mutable",
  게자리: "cardinal",
  사자자리: "fixed",
  처녀자리: "mutable",
  천칭자리: "cardinal",
  전갈자리: "fixed",
  사수자리: "mutable",
  염소자리: "cardinal",
  물병자리: "fixed",
  물고기자리: "mutable",
};

const ELEMENT_TONE: Record<YeonAstroElement, string> = {
  fire: "마음에 작은 불꽃이 켜져서 용기와 속도가 같이 올라오는 결",
  earth: "몸과 현실을 천천히 안정시키면 마음도 같이 놓이는 결",
  air: "생각과 대화가 마음의 창문을 열어주는 결",
  water: "감정이 깊게 흐르지만 다정함도 오래 스며드는 결",
  unknown: "오늘의 리듬을 천천히 확인해야 하는 결",
};

const MODE_TONE: Record<YeonAstroMode, string> = {
  cardinal: "먼저 작은 시작을 만들수록 편안해지는 리듬",
  fixed: "하나의 루틴을 지켜낼수록 마음이 단단해지는 리듬",
  mutable: "상황에 맞춰 부드럽게 바꾸면 숨통이 트이는 리듬",
  unknown: "무리하지 않고 지금 가능한 만큼만 움직이는 리듬",
};

const ASPECT_TONE: Record<string, YeonAstroAspectSignal["tone"]> = {
  conjunction: "spark",
  conj: "spark",
  sextile: "soft",
  trine: "soft",
  square: "tension",
  opposition: "mirror",
  opposite: "mirror",
};

const ASPECT_LABEL: Record<string, string> = {
  conjunction: "합",
  conj: "합",
  sextile: "육각",
  trine: "삼각",
  square: "사각",
  opposition: "충",
  opposite: "충",
};

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toFinite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateParts(value: unknown): { year: number; month: number; day: number } | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const compact = raw.replace(/\D/g, "");
  if (compact.length < 8) return null;
  const year = toInt(compact.slice(0, 4));
  const month = toInt(compact.slice(4, 6));
  const day = toInt(compact.slice(6, 8));
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function parseTimeParts(value: unknown): { hour: number; minute: number } | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const compact = raw.replace(/\D/g, "");
  if (compact.length < 2) return null;
  const hour = toInt(compact.slice(0, 2));
  const minute = toInt(compact.slice(2, 4) || 0);
  if (hour === null || minute === null) return null;
  return { hour, minute };
}

function signFromRaw(value: unknown): YeonZodiacSign | "" {
  if (typeof value === "number" && Number.isFinite(value)) {
    return YEON_ZODIAC_SIGNS[((Math.trunc(value) % 12) + 12) % 12];
  }
  const raw = String(value || "").trim();
  if (!raw) return "";
  if ((YEON_ZODIAC_SIGNS as readonly string[]).includes(raw)) return raw as YeonZodiacSign;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return signFromRaw(numeric);
  const found = YEON_ZODIAC_SIGNS.find((sign) => raw.includes(sign));
  return found || "";
}

function pointSign(point: unknown): YeonZodiacSign | "" {
  const source = point && typeof point === "object" ? point as Record<string, unknown> : {};
  return signFromRaw(source.signKo ?? source.sign ?? source.signName);
}

function normalizeHouse(value: unknown): number | null {
  const house = toInt(value);
  if (house === null || house < 1 || house > 12) return null;
  return house;
}

function normalizeDegree(point: Record<string, unknown>) {
  const degree = toFinite(point.degree);
  if (degree !== null) return Math.round(degree * 100) / 100;
  const longitude = toFinite(point.longitude);
  if (longitude === null) return null;
  return Math.round((((longitude % 30) + 30) % 30) * 100) / 100;
}

function normalizePlanet(key: YeonAstroPlanetKey, raw: unknown): YeonAstroPlanetSignal | null {
  if (!raw || typeof raw !== "object") return null;
  const point = raw as Record<string, unknown>;
  const sign = pointSign(point);
  if (!sign) return null;
  return {
    key,
    label: PLANET_LABEL[key],
    sign,
    degree: normalizeDegree(point),
    house: normalizeHouse(point.house),
    retrograde: point.retrograde === true,
    element: ELEMENT_BY_SIGN[sign] || "unknown",
    mode: MODE_BY_SIGN[sign] || "unknown",
  };
}

function rawPlanetMap(payload: unknown): Record<string, unknown> {
  const source = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const direct = source.planets;
  if (direct && typeof direct === "object" && !Array.isArray(direct)) return direct as Record<string, unknown>;
  const localChart = source.localAstroChartJson && typeof source.localAstroChartJson === "object"
    ? source.localAstroChartJson as Record<string, unknown>
    : {};
  const chart = localChart.chart && typeof localChart.chart === "object" ? localChart.chart as Record<string, unknown> : {};
  const rows = Array.isArray(chart.planets) ? chart.planets : Array.isArray(direct) ? direct : [];
  const next: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const key = String(item.nameEn || item.name || "").trim();
    if (key) next[key] = item;
  }
  return next;
}

function topKey<T extends string>(stats: Record<T, number>, fallback: T): T {
  return (Object.keys(stats) as T[]).sort((a, b) => stats[b] - stats[a])[0] || fallback;
}

function normalizeAspects(payload: unknown): YeonAstroAspectSignal[] {
  const source = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const rows = Array.isArray(source.aspects) ? source.aspects : [];
  const wanted = new Set<YeonAstroPlanetKey>(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]);
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const p1 = String(item.p1 || item.planetA || item.from || "").trim() as YeonAstroPlanetKey;
      const p2 = String(item.p2 || item.planetB || item.to || "").trim() as YeonAstroPlanetKey;
      if (!wanted.has(p1) || !wanted.has(p2)) return null;
      const type = String(item.type || item.aspect || "").trim().toLowerCase();
      const orb = toFinite(item.orb);
      return {
        planets: [p1, p2] as [YeonAstroPlanetKey, YeonAstroPlanetKey],
        label: ASPECT_LABEL[type] || type || "각도",
        type,
        orb: orb === null ? null : Math.round(orb * 100) / 100,
        tone: ASPECT_TONE[type] || "neutral",
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a?.orb ?? 99) - (b?.orb ?? 99))
    .slice(0, 5) as YeonAstroAspectSignal[];
}

function aspectLine(aspect: YeonAstroAspectSignal) {
  const [a, b] = aspect.planets;
  const orb = aspect.orb === null ? "" : `, 오브 ${aspect.orb.toFixed(2)}도`;
  return `${PLANET_LABEL[a]}-${PLANET_LABEL[b]} ${aspect.label}${orb}`;
}

export function isYeonZodiacSign(value: unknown): value is YeonZodiacSign {
  return (YEON_ZODIAC_SIGNS as readonly string[]).includes(String(value || ""));
}

export function buildYeonAstroRequestFromProfile(profile: DestinyProfileCard | null | undefined): YeonAstroBirthPayload | null {
  if (!profile) return null;
  const birth = profile.birth || {};
  const dateParts = parseDateParts(profile.birthDate || profile.birthIso);
  const timeParts = parseTimeParts(profile.birthTime || profile.birthIso);
  const year = toInt(birth.year ?? profile.birthYear) ?? dateParts?.year ?? null;
  const month = toInt(birth.month ?? profile.birthMonth) ?? dateParts?.month ?? null;
  const day = toInt(birth.day ?? profile.birthDay) ?? dateParts?.day ?? null;
  const hour = toInt(birth.hour ?? profile.birthHour) ?? timeParts?.hour ?? null;
  const minute = toInt(birth.minute ?? profile.birthMinute) ?? timeParts?.minute ?? 0;
  if (!year || !month || !day || hour === null || minute === null) return null;
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const location = profile.location || {};
  const rawTimezone = String((profile as unknown as Record<string, unknown>).timezone || location.tz || "Asia/Seoul").trim();
  const timezone = timezoneOffsetHours(rawTimezone);
  const lat = toFinite(location.lat) ?? 37.5665;
  const lon = toFinite(location.lng) ?? 126.978;

  return {
    year,
    month,
    day,
    hour,
    minute,
    timezone,
    lat,
    lon,
    name: String(profile.name || "").trim(),
    gender: String(profile.gender || "").trim(),
    birthDate: `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`,
    birthTime: `${pad2(hour)}:${pad2(minute)}`,
    timezoneName: rawTimezone || "Asia/Seoul",
    birthPlace: String(profile.birthRegion || location.label || "Seoul").trim(),
  };
}

export function buildYeonAstroSignal(payload: unknown): YeonAstroSignal | null {
  const source = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const planetMap = rawPlanetMap(source);
  const planetKeys: YeonAstroPlanetKey[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  const planets = planetKeys.reduce((acc, key) => {
    acc[key] = normalizePlanet(key, planetMap[key]);
    return acc;
  }, {} as Record<YeonAstroPlanetKey, YeonAstroPlanetSignal | null>);

  const sunSign = planets.Sun?.sign || "";
  const moonSign = planets.Moon?.sign || "";
  if (!sunSign && !moonSign) return null;

  const ascendantSign = pointSign(source.ascendant)
    || pointSign((source.angles as Record<string, unknown> | undefined)?.ascendant)
    || pointSign(((source.localAstroChartJson as Record<string, unknown> | undefined)?.chart as Record<string, unknown> | undefined)?.angles);

  const elementStats: Record<YeonAstroElement, number> = { fire: 0, earth: 0, air: 0, water: 0, unknown: 0 };
  const modeStats: Record<YeonAstroMode, number> = { cardinal: 0, fixed: 0, mutable: 0, unknown: 0 };
  for (const planet of Object.values(planets)) {
    if (!planet) continue;
    elementStats[planet.element] += planet.key === "Sun" || planet.key === "Moon" ? 2 : 1;
    modeStats[planet.mode] += planet.key === "Sun" || planet.key === "Moon" ? 2 : 1;
  }

  const dominantElement = topKey(elementStats, "unknown");
  const dominantMode = topKey(modeStats, "unknown");
  const majorAspects = normalizeAspects(source);
  const moonAspect = majorAspects.find((aspect) => aspect.planets.includes("Moon"));
  const venusAspect = majorAspects.find((aspect) => aspect.planets.includes("Venus"));
  const marsAspect = majorAspects.find((aspect) => aspect.planets.includes("Mars"));

  const heartTone = planets.Moon?.sign
    ? `달은 ${planets.Moon.sign}에 있어 ${ELEMENT_TONE[planets.Moon.element]}이 마음에 먼저 닿아요.`
    : `${ELEMENT_TONE[dominantElement]}이 마음에 먼저 닿아요.`;
  const relationTone = planets.Venus?.sign
    ? `금성은 ${planets.Venus.sign}의 방식으로 다정함을 표현하고, ${venusAspect ? aspectLine(venusAspect) : "작은 호감 신호"}가 관계 온도를 조절해요.`
    : `관계에서는 ${ELEMENT_TONE[dominantElement]}을 부드럽게 쓰는 게 좋아요.`;
  const actionTone = planets.Mars?.sign
    ? `화성은 ${planets.Mars.sign}의 속도로 움직여요. ${marsAspect?.tone === "tension" ? "빨라지는 반응을 한 박자 늦추면 좋아요." : "작은 실행 하나가 기분을 살려줘요."}`
    : `${MODE_TONE[dominantMode]}이에요.`;
  const healingTone = `${ELEMENT_TONE[dominantElement]}이고, ${MODE_TONE[dominantMode]}이에요.`;

  return {
    source: String(source.source || "swiss-wasm-local"),
    engineMode: String((source.engine as Record<string, unknown> | undefined)?.mode || "sweph"),
    ephemerisLoaded: Boolean((source.engine as Record<string, unknown> | undefined)?.ephemerisLoaded ?? source.houseCusps),
    sunSign,
    moonSign,
    ascendantSign,
    mercurySign: planets.Mercury?.sign || "",
    venusSign: planets.Venus?.sign || "",
    marsSign: planets.Mars?.sign || "",
    jupiterSign: planets.Jupiter?.sign || "",
    saturnSign: planets.Saturn?.sign || "",
    dominantElement,
    dominantMode,
    planets,
    majorAspects,
    heartTone,
    relationTone,
    actionTone,
    healingTone,
    evidence: [
      sunSign ? `태양 ${sunSign}` : "",
      moonSign ? `달 ${moonSign}` : "",
      ascendantSign ? `상승궁 ${ascendantSign}` : "",
      planets.Venus?.sign ? `금성 ${planets.Venus.sign}` : "",
      planets.Mars?.sign ? `화성 ${planets.Mars.sign}` : "",
      majorAspects[0] ? aspectLine(majorAspects[0]) : "",
    ].filter(Boolean),
  };
}

export function timezoneOffsetHours(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value || "").trim();
  if (!raw || raw === "Asia/Seoul" || raw === "KST") return 9;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric;
  const match = raw.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 9;
  const sign = match[1] === "-" ? -1 : 1;
  const hour = Number(match[2]);
  const minute = Number(match[3] || 0);
  return sign * (hour + minute / 60);
}
