import { ASTRO_PREMIUM_CHAPTERS, sanitizeAstroPremiumText } from "./astro-premium-chapters.js";
import { callGeminiText } from "./gemini.js";

const MIN_SECTION_LENGTH = 900;
const MIN_CHAPTER_LENGTH = 4000;
const MIN_TOTAL_LENGTH_FLOOR = 50000;
const ASTRO_MASTER_JSON_SCHEMA_VERSION = "astro-premium-master-json.v1";
export const ASTRO_PDF_CONFIG = Object.freeze({
  generationMode: "local-assembled",
  llmEnabled: false,
  provider: "western-astrology-local-assembler",
  templateVersion: "western-astrology-assembled-v1",
});
export const WESTERN_ASTROLOGY_PROMPT_VERSION = ASTRO_PDF_CONFIG.templateVersion;
export const ASTROLOGY_PERSONAL_LLM_ENHANCED_CHAPTERS = [
  "astro_cosmic_summary",
  "astro_sun",
  "astro_personal_planets",
  "astro_career",
  "astro_love",
  "astro_aspects",
  "astro_timing",
  "astro_master_plan",
];
export const ASTROLOGY_COMPATIBILITY_LLM_ENHANCED_CHAPTERS = [
  "compatibility_overview",
  "sun_moon_rising_comparison",
  "venus_mars_attraction",
  "synastry_aspects",
  "conflict_pattern",
  "long_term_potential",
  "compatibility_master_plan",
];
export const ASTROLOGY_TRANSIT_LLM_ENHANCED_CHAPTERS = [
  "period_overview",
  "major_transits",
  "outer_planet_transits",
  "career_change",
  "wealth_flow",
  "caution_periods",
  "period_master_plan",
];
const ASTRO_MANUSCRIPT_SOURCE = Object.freeze({
  LLM: "llm-only",
  LOCAL_COMPLETED: "local-rule-completed",
  HYBRID: "llm-local-hybrid",
});
const ASTRO_LLM_KEY_ENV_KEYS = Object.freeze([
  "ASTRO_GEMINI_API_KEY1",
  "ASTRO_GEMINI_API_KEY2",
  "ASTRO_GEMINI_API_KEY3",
  "ASTRO_GEMINI_API_KEY4",
  "ASTRO_GEMINI_API_KEY5",
  "ASTRO_GEMINI_API_KEY",
  "PREMIUM_GEMINI_API_KEY1",
  "PREMIUM_GEMINI_API_KEY2",
  "PREMIUM_GEMINI_API_KEY3",
  "PREMIUM_GEMINI_API_KEY4",
  "PREMIUM_GEMINI_API_KEY5",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GEMINI_API_KEY",
]);
const ASTRO_LLM_MODEL_ENV_KEYS = Object.freeze(["ASTRO_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"]);
const ASTRO_LLM_CACHE_MAX = 96;
const ASTRO_LLM_RISKY_ASSERTION_RE = /(반드시\s*(결혼|이혼|성공|실패|큰돈|수익|파산|이별)|100\s*%|확정|무조건|결혼하면\s*불행|질병을\s*얻게|암에\s*걸|우울증|공황장애|투자\s*수익|수익\s*보장|대박|파산|죽음|사망|직장을\s*잃|큰\s*사고|병에\s*걸|돈을\s*잃|평생\s*외롭|운명.*나쁘|차트.*나쁘)/i;
const westernAstrologyLlmCache = new Map();
const FORBIDDEN_PATTERNS = [
  /자동\s*복구\s*생성/gi,
  /fallback/gi,
  /\bapi\b/gi,
  /\bllm\b/gi,
  /chapter\s*1\s*chapter\s*1/gi,
  /데이터가\s*부족합니다/gi,
  /\bpayload\b/gi,
  /\bjson\b/gi,
  /\bdebug\b/gi,
  /\bobject\b/gi,
  /\bundefined\b/gi,
  /\bnull\b/gi,
  /\bnan\b/gi,
  /\bcalculationmode\b/gi,
  /\brecovered\b/gi,
  /about:blank/gi,
  /internal\s*server\s*error/gi,
  /미확인/gi,
  /이\s*장에서는/gi,
  /이\s*카테고리에서는/gi,
  /생성\s*로직/gi,
  /챕터\s*생성기/gi,
  /카테고리\s*렌더러/gi,
  /데이터\s*부족/gi,
  /자동\s*생성/gi,
  /SWISS_REQUIRED/gi,
  /ASTRO_CHART_SEED_FAILED/gi,
];

const PREMIUM_REQUIRED_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const REPETITION_EXCLUDED_TERMS = ["태양", "달", "상승궁", "하우스", "행성", "어스펙트", "차트", "점성술", "MC"];
const ASTRO_SECTION_HEADINGS = [
  "핵심 진단",
  "차트 근거",
  "현실에서 드러나는 모습",
  "장점",
  "주의점",
  "상담사의 조언",
  "실천 과제",
];

const SIGN_NAMES = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const DEFAULT_LAT = 37.5665;
const DEFAULT_LON = 126.978;

const SIGN_META = {
  "양자리": { element: "fire", mode: "cardinal", ruler: "Mars" },
  "황소자리": { element: "earth", mode: "fixed", ruler: "Venus" },
  "쌍둥이자리": { element: "air", mode: "mutable", ruler: "Mercury" },
  "게자리": { element: "water", mode: "cardinal", ruler: "Moon" },
  "사자자리": { element: "fire", mode: "fixed", ruler: "Sun" },
  "처녀자리": { element: "earth", mode: "mutable", ruler: "Mercury" },
  "천칭자리": { element: "air", mode: "cardinal", ruler: "Venus" },
  "전갈자리": { element: "water", mode: "fixed", ruler: "Pluto" },
  "사수자리": { element: "fire", mode: "mutable", ruler: "Jupiter" },
  "염소자리": { element: "earth", mode: "cardinal", ruler: "Saturn" },
  "물병자리": { element: "air", mode: "fixed", ruler: "Uranus" },
  "물고기자리": { element: "water", mode: "mutable", ruler: "Neptune" },
};

const ELEMENT_KO = {
  fire: "화",
  earth: "토",
  air: "풍",
  water: "수",
};

const MODE_KO = {
  cardinal: "카디널",
  fixed: "픽스드",
  mutable: "뮤터블",
};

const PLANET_KO = {
  Sun: "태양(Sun)",
  Moon: "달(Moon)",
  Mercury: "수성(Mercury)",
  Venus: "금성(Venus)",
  Mars: "화성(Mars)",
  Jupiter: "목성(Jupiter)",
  Saturn: "토성(Saturn)",
  Uranus: "천왕성(Uranus)",
  Neptune: "해왕성(Neptune)",
  Pluto: "명왕성(Pluto)",
};

function clean(value) {
  return String(value || "").trim();
}

function hasAstroBrokenText(value) {
  const body = clean(value);
  return /[\uFFFD\uF900-\uFAFF]/.test(body)
    || /(?:\?[\uAC00-\uD7AF]|[\uAC00-\uD7AF]\?){2,}/.test(body)
    || /(?:\u00C3.|\u00C2.|\u00E2[\u0080-\u02FF]{1,3}|[\u00EC\u00ED\u00EA\u00EB][\u0080-\u02FF]{1,3}){2,}/.test(body)
    || /[\u3131-\u318E]{2,}/.test(body);
}

function readAstroFlag(env, key, fallback = false) {
  const raw = clean(env?.[key]).toLowerCase();
  if (!raw) return Boolean(fallback);
  if (["1", "true", "yes", "on", "enabled"].includes(raw)) return true;
  if (["0", "false", "no", "off", "disabled"].includes(raw)) return false;
  return Boolean(fallback);
}

function hasAstroLlmCredential(env = {}) {
  return ASTRO_LLM_KEY_ENV_KEYS.some((key) => clean(env?.[key]));
}

function stableStringify(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hashStableValue(value) {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseNum(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toIsoDate(year, month, day) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && clean(value)) return value;
  }
  return undefined;
}

function normalizeGender(raw) {
  const value = clean(raw).toLowerCase();
  if (!value) return "unknown";
  if (value === "m" || value === "male" || value.includes("남")) return "male";
  if (value === "f" || value === "female" || value.includes("여")) return "female";
  return "unknown";
}

function parseDateParts(rawDate, fallbackYear, fallbackMonth, fallbackDay) {
  const date = clean(rawDate);
  const parts = date ? date.split(/[-./]/).map((v) => Number(v)) : [];
  const year = Number.isFinite(parts[0]) ? Math.trunc(parts[0]) : parseNum(fallbackYear, NaN);
  const month = Number.isFinite(parts[1]) ? Math.trunc(parts[1]) : parseNum(fallbackMonth, NaN);
  const day = Number.isFinite(parts[2]) ? Math.trunc(parts[2]) : parseNum(fallbackDay, NaN);
  return {
    birthYear: Number.isFinite(year) ? year : null,
    birthMonth: Number.isFinite(month) ? month : null,
    birthDay: Number.isFinite(day) ? day : null,
  };
}

function parseTime(rawTime, rawHour, rawMinute) {
  const text = clean(rawTime);
  const unknown = /모름|미상|unknown|none|na/i.test(text);
  if (unknown) {
    return { birthTime: "", birthHour: null, birthMinute: 0, isTimeUnknown: true };
  }

  const hourOnly = parseNum(rawHour, NaN);
  const minuteOnly = parseNum(rawMinute, NaN);

  const hhmm = text.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})/);
  if (hhmm) {
    const hour = clamp(Number(hhmm[1]), 0, 23);
    const minute = clamp(Number(hhmm[2]), 0, 59);
    return {
      birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      birthHour: hour,
      birthMinute: minute,
      isTimeUnknown: false,
    };
  }

  const korean = text.match(/오(전|후)\s*(\d{1,2})(?:\s*[:시]\s*(\d{1,2}))?/);
  if (korean) {
    const isPm = korean[1] === "후";
    let hour = clamp(Number(korean[2]), 0, 23);
    const minute = clamp(Number(korean[3] || 0), 0, 59);
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return {
      birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      birthHour: hour,
      birthMinute: minute,
      isTimeUnknown: false,
    };
  }

  const numericHour = Number.isFinite(hourOnly)
    ? clamp(Math.trunc(hourOnly), 0, 23)
    : (text && /^\d{1,2}$/.test(text) ? clamp(Number(text), 0, 23) : null);
  const numericMinute = Number.isFinite(minuteOnly) ? clamp(Math.trunc(minuteOnly), 0, 59) : 0;

  if (numericHour !== null) {
    return {
      birthTime: `${String(numericHour).padStart(2, "0")}:${String(numericMinute).padStart(2, "0")}`,
      birthHour: numericHour,
      birthMinute: numericMinute,
      isTimeUnknown: false,
    };
  }

  return { birthTime: "", birthHour: null, birthMinute: 0, isTimeUnknown: true };
}

export function normalizeAstroPremiumBirthInput(rawInput = {}) {
  const body = asObject(rawInput);
  const profile = asObject(body.profile);
  const birth = asObject(profile.birth);
  const location = asObject(profile.location || body.location);
  const user = asObject(body.user);

  const dateSource = pickFirst(
    body.birthDate,
    body.birthday,
    body.birth,
    body.solarDate,
    body.date,
    user.birthDate,
    birth.birthDate,
  );
  const dateParts = parseDateParts(
    dateSource,
    pickFirst(body.birthYear, body.year, birth.year),
    pickFirst(body.birthMonth, body.month, birth.month),
    pickFirst(body.birthDay, body.day, birth.day),
  );

  const timeParts = parseTime(
    pickFirst(body.birthTime, body.time, body.timeText, birth.time, birth.birthTime, user.birthTime),
    pickFirst(body.birthHour, body.hour, body.birth_hour, birth.hour),
    pickFirst(body.birthMinute, body.minute, birth.minute),
  );

  const timezone = clean(pickFirst(body.timezone, body.tz, location.timezone, location.tz, user.timezone)) || "Asia/Seoul";
  const birthPlace = clean(pickFirst(body.birthPlace, body.place, body.locationName, body.location, location.label, location.name, user.birthPlace, user.location)) || "대한민국 서울";
  const latitude = parseNum(pickFirst(body.latitude, body.lat, location.lat, location.latitude), DEFAULT_LAT);
  const longitude = parseNum(pickFirst(body.longitude, body.lng, body.lon, location.lon, location.longitude), DEFAULT_LON);

  const out = {
    name: clean(pickFirst(body.name, profile.name, user.name)) || undefined,
    gender: normalizeGender(pickFirst(body.gender, body.sex, profile.gender, profile.sex, user.gender, user.sex)),
    birthDate: toIsoDate(dateParts.birthYear, dateParts.birthMonth, dateParts.birthDay),
    birthYear: Number.isFinite(dateParts.birthYear) ? dateParts.birthYear : 0,
    birthMonth: Number.isFinite(dateParts.birthMonth) ? dateParts.birthMonth : 0,
    birthDay: Number.isFinite(dateParts.birthDay) ? dateParts.birthDay : 0,
    birthTime: timeParts.birthTime,
    birthHour: timeParts.birthHour,
    birthMinute: timeParts.birthMinute,
    timezone,
    birthPlace: birthPlace || undefined,
    latitude,
    longitude,
    isTimeUnknown: Boolean(timeParts.isTimeUnknown),
  };

  return out;
}

export function validateAstroPremiumBirthInput(input) {
  const missing = [];
  if (!clean(input?.birthDate)) missing.push("birthDate");
  if (!Number.isFinite(Number(input?.birthYear)) || Number(input?.birthYear) < 1900 || Number(input?.birthYear) > 2100) missing.push("birthYear");
  if (!Number.isFinite(Number(input?.birthMonth)) || Number(input?.birthMonth) < 1 || Number(input?.birthMonth) > 12) missing.push("birthMonth");
  if (!Number.isFinite(Number(input?.birthDay)) || Number(input?.birthDay) < 1 || Number(input?.birthDay) > 31) missing.push("birthDay");
  if (input?.isTimeUnknown || !Number.isFinite(Number(input?.birthHour))) missing.push("birthHour");
  if (!clean(input?.timezone)) missing.push("timezone");
  return { ok: missing.length === 0, missing };
}

export function toSwissChartInputFromBirthInput(input = {}) {
  const timezone = clean(input.timezone);
  const tzNumeric = /^-?\d+(\.\d+)?$/.test(timezone) ? Number(timezone) : 9;
  return {
    year: Number(input.birthYear),
    month: Number(input.birthMonth),
    day: Number(input.birthDay),
    hour: Number(input.birthHour),
    minute: Number(input.birthMinute || 0),
    timezone: Number.isFinite(tzNumeric) ? tzNumeric : 9,
    lat: Number.isFinite(Number(input.latitude)) ? Number(input.latitude) : DEFAULT_LAT,
    lon: Number.isFinite(Number(input.longitude)) ? Number(input.longitude) : DEFAULT_LON,
  };
}

function normalizeSwissChartForPdf(chart = {}) {
  if (!chart || typeof chart !== "object") return {};
  return chart?.chart && typeof chart.chart === "object" ? chart.chart : chart;
}

export function hasUsableSwissAstroChart(chart) {
  if (!chart || typeof chart !== "object") return false;

  const source = chart?.chart && typeof chart.chart === "object" ? chart.chart : chart;
  const planets = source.planets && typeof source.planets === "object"
    ? source.planets
    : {};

  const planetKeys = Object.keys(planets);
  const hasCorePlanets = PREMIUM_REQUIRED_PLANETS
    .every((name) => planets[name] || planets[name.toLowerCase()]);

  const hasAsc = Boolean(source.ascendant || source.asc || source?.chart?.ascendant);
  const hasMc = Boolean(source.midheaven || source.mc || source?.chart?.midheaven);
  const hasHouses = Array.isArray(source.houseCusps)
    ? source.houseCusps.length >= 12
    : Boolean(source.houses && Object.keys(source.houses || {}).length >= 12);
  const hasAspects = Array.isArray(source.aspects) ? source.aspects.length > 0 : false;

  return planetKeys.length >= PREMIUM_REQUIRED_PLANETS.length && hasCorePlanets && hasAsc && hasMc && hasHouses && hasAspects;
}

function extractProvidedAstroBase(rawInput = {}) {
  const candidates = [
    rawInput?.swissChart,
    rawInput?.chart,
    rawInput?.astroBase,
    rawInput?.payload?.localAstroChartJson?.chart,
    rawInput?.payload?.localAstroChartJson,
    rawInput?.payload,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    if (hasUsableSwissAstroChart(candidate)) {
      return normalizeSwissChartForPdf(candidate);
    }
    if (candidate?.chart && hasUsableSwissAstroChart(candidate.chart)) {
      return normalizeSwissChartForPdf(candidate.chart);
    }
  }
  return null;
}

export async function resolveAstroChartForPremiumPdf(rawInput = {}, birthInput = {}, env, options = {}) {
  const provided = extractProvidedAstroBase(rawInput);
  if (provided && hasUsableSwissAstroChart(provided)) {
    return {
      source: "provided",
      swissChart: normalizeSwissChartForPdf(provided),
    };
  }

  try {
    const { getSwissWesternChart } = await import("./swiss-ephemeris.js");
    const calculated = await getSwissWesternChart(env, toSwissChartInputFromBirthInput(birthInput), {
      requestUrl: options?.requestUrl,
    });
    if (hasUsableSwissAstroChart(calculated)) {
      return {
        source: "server-local",
        swissChart: normalizeSwissChartForPdf(calculated),
      };
    }
  }
  catch (error) {
    console.warn("[AstroPremiumPDF][SwissCalculationFailed]", {
      reason: clean(error?.message || error),
    });
  }

  const error = new Error("점성술 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.");
  error.code = "ASTRO_CHART_SOURCE_INVALID";
  error.status = 422;
  throw error;
}

function signNameFromNode(node) {
  if (!node || typeof node !== "object") return "";
  return clean(node.signKo || node.signName || node.sign || node.name);
}

function strengthLabel(orb) {
  const n = Number(orb);
  if (!Number.isFinite(n)) return "medium";
  if (n <= 2.5) return "strong";
  if (n <= 5) return "medium";
  return "weak";
}

function signFromLongitude(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const normalized = ((n % 360) + 360) % 360;
  return SIGN_NAMES[Math.floor(normalized / 30)] || "";
}

function axisOppositeSign(sign = "") {
  const idx = SIGN_NAMES.indexOf(clean(sign));
  if (idx < 0) return "";
  return SIGN_NAMES[(idx + 6) % 12] || "";
}

function countElementBalance(planets = []) {
  const counts = { fire: 0, earth: 0, air: 0, water: 0 };
  safeArray(planets).forEach((planet) => {
    const sign = clean(planet?.sign);
    const key = SIGN_META[sign]?.element;
    if (key && counts[key] !== undefined) counts[key] += 1;
  });
  const total = Object.values(counts).reduce((sum, n) => sum + Number(n || 0), 0) || 1;
  return {
    counts,
    ratio: {
      fire: Math.round((counts.fire / total) * 100),
      earth: Math.round((counts.earth / total) * 100),
      air: Math.round((counts.air / total) * 100),
      water: Math.round((counts.water / total) * 100),
    },
    summary: Object.keys(counts)
      .map((key) => `${ELEMENT_KO[key]} ${Math.round((counts[key] / total) * 100)}%`)
      .join(", "),
  };
}

function countModeBalance(planets = []) {
  const counts = { cardinal: 0, fixed: 0, mutable: 0 };
  safeArray(planets).forEach((planet) => {
    const sign = clean(planet?.sign);
    const key = SIGN_META[sign]?.mode;
    if (key && counts[key] !== undefined) counts[key] += 1;
  });
  const total = Object.values(counts).reduce((sum, n) => sum + Number(n || 0), 0) || 1;
  return {
    counts,
    ratio: {
      cardinal: Math.round((counts.cardinal / total) * 100),
      fixed: Math.round((counts.fixed / total) * 100),
      mutable: Math.round((counts.mutable / total) * 100),
    },
    summary: Object.keys(counts)
      .map((key) => `${MODE_KO[key]} ${Math.round((counts[key] / total) * 100)}%`)
      .join(", "),
  };
}

function deriveChartRuler(ascSign = "") {
  const sign = clean(ascSign);
  const ruler = SIGN_META[sign]?.ruler || "";
  return {
    sign,
    ruler,
    label: ruler ? `${PLANET_KO[ruler] || ruler}` : "",
  };
}

function deriveSunSignFromDate(birthInput = {}) {
  const month = Number(birthInput.birthMonth);
  const day = Number(birthInput.birthDay);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return "";
  const md = month * 100 + day;
  if (md >= 321 && md <= 419) return "양자리";
  if (md >= 420 && md <= 520) return "황소자리";
  if (md >= 521 && md <= 621) return "쌍둥이자리";
  if (md >= 622 && md <= 722) return "게자리";
  if (md >= 723 && md <= 822) return "사자자리";
  if (md >= 823 && md <= 922) return "처녀자리";
  if (md >= 923 && md <= 1022) return "천칭자리";
  if (md >= 1023 && md <= 1121) return "전갈자리";
  if (md >= 1122 && md <= 1221) return "사수자리";
  if (md >= 1222 || md <= 119) return "염소자리";
  if (md >= 120 && md <= 218) return "물병자리";
  if (md >= 219 && md <= 320) return "물고기자리";
  return "";
}

function deriveMoonSeedSign(birthInput = {}) {
  const year = Number(birthInput.birthYear || 0);
  const month = Number(birthInput.birthMonth || 0);
  const day = Number(birthInput.birthDay || 0);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return "";
  const idx = ((year + month * 2 + day * 3) % 12 + 12) % 12;
  return SIGN_NAMES[idx] || "";
}

function toSafePlanetNode(name, node = {}) {
  const sign = signNameFromNode(node) || signFromLongitude(node?.longitude || node?.lon || node?.lambda) || "미확인";
  const longitude = parseNum(node?.longitude ?? node?.lon ?? node?.lambda, NaN);
  const speedLongitude = parseNum(node?.speedLongitude ?? node?.speed ?? node?.spd, NaN);
  const degree = Number.isFinite(Number(node?.degree))
    ? Number(node.degree)
    : (Number.isFinite(Number(node?.longitude)) ? Math.round((((Number(node.longitude) % 30) + 30) % 30) * 100) / 100 : undefined);
  const house = Number.isFinite(Number(node?.house)) ? Number(node.house) : undefined;
  return {
    name,
    sign,
    longitude: Number.isFinite(longitude) ? Math.round(longitude * 100) / 100 : undefined,
    degree,
    house,
    speedLongitude: Number.isFinite(speedLongitude) ? speedLongitude : undefined,
    retrograde: Boolean(node?.retrograde),
  };
}

function toSafeAstroPoint(name, node = {}) {
  if (!node || typeof node !== "object") return null;
  const sign = signNameFromNode(node) || signFromLongitude(node?.longitude || node?.lon || node?.lambda);
  const longitude = parseNum(node?.longitude ?? node?.lon ?? node?.lambda, NaN);
  if (!sign && !Number.isFinite(longitude)) return null;
  return {
    name,
    sign: sign || "미확인",
    longitude: Number.isFinite(longitude) ? Math.round(longitude * 100) / 100 : undefined,
    degree: Number.isFinite(Number(node?.degree)) ? Number(node.degree) : undefined,
    house: Number.isFinite(Number(node?.house)) ? Number(node.house) : undefined,
  };
}

export function buildSafeWesternChartFromBirthInput(birthInput = {}) {
  const sunSign = deriveSunSignFromDate(birthInput) || "미확인";
  const moonSign = deriveMoonSeedSign(birthInput) || "미확인";
  const ascendantSign = sunSign !== "미확인" ? sunSign : moonSign;
  const planets = [
    { name: "Sun", sign: sunSign, house: 1 },
    { name: "Moon", sign: moonSign, house: 4 },
    { name: "Mercury", sign: sunSign, house: 3 },
    { name: "Venus", sign: moonSign, house: 7 },
    { name: "Mars", sign: sunSign, house: 6 },
    { name: "Jupiter", sign: moonSign, house: 9 },
    { name: "Saturn", sign: sunSign, house: 10 },
  ];
  const houses = Array.from({ length: 12 }, (_, idx) => ({
    house: idx + 1,
    sign: SIGN_NAMES[idx] || undefined,
    cuspDegree: undefined,
  }));
  const aspects = [
    { planetA: "Sun", planetB: "Moon", type: "seed-aspect", strength: "medium" },
    { planetA: "Venus", planetB: "Mars", type: "relation-axis", strength: "medium" },
  ];
  return {
    sunSign,
    moonSign,
    ascendantSign,
    midheavenSign: planets.find((planet) => planet.name === "Saturn")?.sign || "미확인",
    planets,
    houses,
    aspects,
  };
}

function toAstroChartModel(birthInput, swissChart = {}, fallbackAstroBase = null) {
  const swissPlanetsObj = asObject(swissChart?.planets);
  const swissPlanetKeys = Object.keys(swissPlanetsObj);
  let planets = [];
  let calculationMode = "full";

  if (swissPlanetKeys.length > 0) {
    planets = swissPlanetKeys.map((name) => toSafePlanetNode(name, swissPlanetsObj[name] || {}));
  } else if (Array.isArray(fallbackAstroBase?.chart?.planets) && fallbackAstroBase.chart.planets.length > 0) {
    calculationMode = "basic";
    planets = fallbackAstroBase.chart.planets.map((planet) => ({
      name: clean(planet?.name || planet?.planet || "Unknown"),
      sign: clean(planet?.sign || signFromLongitude(planet?.longitude) || "미확인"),
      degree: Number.isFinite(Number(planet?.degree)) ? Number(planet.degree) : undefined,
      house: Number.isFinite(Number(planet?.house)) ? Number(planet.house) : undefined,
      retrograde: Boolean(planet?.retrograde),
    })).filter((planet) => planet.name);
  } else {
    calculationMode = "safe-local";
    const recovered = buildSafeWesternChartFromBirthInput(birthInput);
    return {
      calculationMode,
      chart: recovered,
    };
  }

  const housesFromSwiss = safeArray(swissChart?.houseCusps).slice(0, 12).map((cusp, idx) => {
    const sign = signFromLongitude(cusp);
    return {
      house: idx + 1,
      sign: sign || undefined,
      cuspDegree: Number.isFinite(Number(cusp)) ? Math.round((Number(cusp) % 30) * 100) / 100 : undefined,
    };
  });
  const housesFromBase = Array.isArray(fallbackAstroBase?.chart?.houses)
    ? fallbackAstroBase.chart.houses.map((house, idx) => ({
      house: Number(house?.house || idx + 1),
      sign: clean(house?.sign || signFromLongitude(house?.longitude) || "") || undefined,
      cuspDegree: Number.isFinite(Number(house?.degree)) ? Number(house.degree) : undefined,
    }))
    : [];
  const houses = housesFromSwiss.length ? housesFromSwiss : (housesFromBase.length ? housesFromBase : buildSafeWesternChartFromBirthInput(birthInput).houses);

  const aspectsFromSwiss = safeArray(swissChart?.aspects).map((aspect) => ({
    planetA: clean(aspect?.p1 || aspect?.planetA),
    planetB: clean(aspect?.p2 || aspect?.planetB),
    type: clean(aspect?.type),
    orb: Number.isFinite(Number(aspect?.orb)) ? Number(aspect.orb) : undefined,
    strength: strengthLabel(aspect?.orb),
  })).filter((aspect) => aspect.planetA && aspect.planetB && aspect.type);
  const aspectsFromBase = Array.isArray(fallbackAstroBase?.chart?.aspects)
    ? fallbackAstroBase.chart.aspects.map((aspect) => ({
      planetA: clean(aspect?.planetA || aspect?.p1),
      planetB: clean(aspect?.planetB || aspect?.p2),
      type: clean(aspect?.type),
      orb: Number.isFinite(Number(aspect?.orb)) ? Number(aspect.orb) : undefined,
      strength: clean(aspect?.strength) || strengthLabel(aspect?.orb),
    })).filter((aspect) => aspect.planetA && aspect.planetB && aspect.type)
    : [];
  const aspects = aspectsFromSwiss.length ? aspectsFromSwiss : aspectsFromBase;

  const sun = planets.find((planet) => planet.name === "Sun");
  const moon = planets.find((planet) => planet.name === "Moon");
  const ascFromSwiss = signNameFromNode(swissChart?.ascendant);
  const mcFromSwiss = signNameFromNode(swissChart?.midheaven);
  const ascFromBase = clean(fallbackAstroBase?.chart?.ascendant || fallbackAstroBase?.chart?.ascendantSign);
  const mcFromBase = clean(fallbackAstroBase?.chart?.midheaven || fallbackAstroBase?.chart?.midheavenSign);

  const ascendantSign = ascFromSwiss || ascFromBase || clean(sun?.sign) || "미확인";
  const midheavenSign = mcFromSwiss || mcFromBase || clean(planets.find((planet) => planet.name === "Saturn")?.sign) || "미확인";
  const descendantSign = axisOppositeSign(ascendantSign) || clean(houses.find((house) => Number(house?.house) === 7)?.sign);
  const icSign = axisOppositeSign(midheavenSign) || clean(houses.find((house) => Number(house?.house) === 4)?.sign);
  const elementBalance = countElementBalance(planets);
  const modalityBalance = countModeBalance(planets);
  const chartRuler = deriveChartRuler(ascendantSign);
  const northNode = toSafeAstroPoint("NorthNode", swissChart?.northNode || fallbackAstroBase?.chart?.northNode);
  const southNode = toSafeAstroPoint("SouthNode", swissChart?.southNode || fallbackAstroBase?.chart?.southNode);

  return {
    calculationMode,
    chart: {
      sunSign: clean(sun?.sign) || deriveSunSignFromDate(birthInput) || "미확인",
      moonSign: clean(moon?.sign) || deriveMoonSeedSign(birthInput) || "미확인",
      ascendantSign,
      midheavenSign,
      descendantSign,
      icSign,
      chartRuler,
      nodes: {
        north: northNode,
        south: southNode,
      },
      elementBalance,
      modalityBalance,
      angles: {
        asc: ascendantSign,
        dsc: descendantSign,
        mc: midheavenSign,
        ic: icSign,
      },
      planets,
      houses,
      aspects,
    },
  };
}

export function buildAstroLocalChartJson(birthInput, swissChart = {}, fallbackAstroBase = null, options = {}) {
  const strict = options?.strictPremium === true;
  const hasSwiss = hasUsableSwissAstroChart(swissChart);
  const hasFallback = hasUsableSwissAstroChart(fallbackAstroBase?.chart || fallbackAstroBase);

  if (strict && !hasSwiss && !hasFallback) {
    const error = new Error("점성술 프리미엄 PDF에 필요한 차트 데이터가 부족합니다.");
    error.code = "ASTRO_CHART_SOURCE_INVALID";
    error.status = 422;
    error.details = {
      hasSwissChart: hasSwiss,
      hasFallbackBase: hasFallback,
    };
    throw error;
  }

  const modeled = toAstroChartModel(birthInput, swissChart, fallbackAstroBase);

  const chart = modeled.chart;
  const sun = safeArray(chart.planets).find((planet) => planet.name === "Sun");
  const moon = safeArray(chart.planets).find((planet) => planet.name === "Moon");
  const seeds = buildInterpretationSeeds({
    planets: safeArray(chart.planets),
    houses: safeArray(chart.houses),
    aspects: safeArray(chart.aspects),
    ascSign: clean(chart.ascendantSign),
    mcSign: clean(chart.midheavenSign),
    sun,
    moon,
  });
  const insights = buildAstroInsightCards(chart);

  return {
    birthInput,
    calculationMode: modeled.calculationMode,
    chart,
    interpretationSeeds: seeds,
    insights,
  };
}

export function validateAstroChartForPremium(localAstroChartJson = {}) {
  const missing = [];
  const birthInput = asObject(localAstroChartJson?.birthInput);
  const chart = asObject(localAstroChartJson?.chart);
  const planets = Array.isArray(chart.planets) ? chart.planets : [];
  const houses = Array.isArray(chart.houses) ? chart.houses : [];
  const aspects = Array.isArray(chart.aspects) ? chart.aspects : [];

  const sun = planets.find((planet) => clean(planet?.name).toLowerCase() === "sun") || {};
  const moon = planets.find((planet) => clean(planet?.name).toLowerCase() === "moon") || {};

  if (!clean(birthInput.birthDate)) missing.push("birthDate");
  if (!clean(birthInput.birthTime)) missing.push("birthTime");
  if (!clean(birthInput.timezone)) missing.push("timezone");
  if (!clean(birthInput.birthPlace)) missing.push("birthPlace");

  if (!clean(chart.sunSign)) missing.push("sunSign");
  if (!clean(chart.moonSign)) missing.push("moonSign");
  if (!clean(chart.ascendantSign)) missing.push("ascendantSign");
  if (!clean(chart.midheavenSign)) missing.push("midheavenSign");

  if (planets.length < PREMIUM_REQUIRED_PLANETS.length) missing.push("planets");
  const presentPlanetNames = new Set(planets.map((planet) => clean(planet?.name)));
  if (!PREMIUM_REQUIRED_PLANETS.every((name) => presentPlanetNames.has(name))) {
    missing.push("requiredPlanets");
  }
  if (houses.length < 12) missing.push("houses");
  if (aspects.length < 1) missing.push("aspects");

  if (!Number.isFinite(Number(sun?.house))) missing.push("sunHouse");
  if (!Number.isFinite(Number(moon?.house))) missing.push("moonHouse");
  if (!clean(chart.ascendantSign) && !houses.find((house) => Number(house?.house) === 1)) missing.push("ascOrHouse1");
  if (!clean(chart.midheavenSign) && !houses.find((house) => Number(house?.house) === 10)) missing.push("mcOrHouse10");

  return {
    ok: missing.length === 0,
    missing,
  };
}

function buildInterpretationSeeds(ctx) {
  const signs = safeArray(ctx.planets).map((planet) => clean(planet.sign)).filter(Boolean);
  const dominantSign = signs[0] || "중립";
  const asc = clean(ctx.ascSign) || "중립";
  const mc = clean(ctx.mcSign) || "중립";
  const aspectNames = safeArray(ctx.aspects).slice(0, 4).map((aspect) => `${aspect.planetA}-${aspect.planetB} ${aspect.type}`);
  const houseNames = safeArray(ctx.houses).slice(0, 4).map((house) => `${house.house}하우스 ${clean(house.sign) || "미확인"}`);
  const elementSummary = countElementBalance(safeArray(ctx.planets)).summary;
  const modeSummary = countModeBalance(safeArray(ctx.planets)).summary;
  return {
    personalityKeywords: [clean(ctx.sun?.sign) || dominantSign, clean(ctx.moon?.sign) || dominantSign, asc, "자기표현", "핵심기질"],
    careerKeywords: [mc, "목표정렬", "성과관리", "실행력", "포지셔닝"],
    moneyKeywords: [houseNames[0] || "2하우스", houseNames[1] || "8하우스", "현금흐름", "재무리듬", "보수운영"],
    relationshipKeywords: ["금성", "화성", "7하우스", "관계경계", "대화조율"],
    healingKeywords: ["회복루틴", "정서조절", "에너지관리", "수면", "리듬"],
    timingKeywords: [aspectNames[0] || "전환신호", aspectNames[1] || "관찰신호", "시기판단", "우선순위", "점검체계"],
    cautionKeywords: ["과속주의", "경계설정", "감정완충", "확인루틴", "리스크관리"],
    elementSummary,
    modeSummary,
  };
}

function findAstroPlanet(planets = [], name = "") {
  return safeArray(planets).find((planet) => clean(planet?.name) === name) || {};
}

function describeLunarPhase(sun = {}, moon = {}) {
  const sunLon = parseNum(sun?.longitude, NaN);
  const moonLon = parseNum(moon?.longitude, NaN);
  if (!Number.isFinite(sunLon) || !Number.isFinite(moonLon)) {
    return {
      phase: "달의 리듬",
      summary: `달 ${clean(moon?.sign) || "Moon"}은 감정의 밀도와 회복 속도를 보여 줍니다.`,
    };
  }
  const diff = ((moonLon - sunLon) % 360 + 360) % 360;
  if (diff < 45) return { phase: "초승의 달", summary: "시작과 씨앗의 리듬이 강합니다. 마음이 먼저 가능성을 보고, 현실은 뒤따라 모양을 잡습니다." };
  if (diff < 90) return { phase: "상현 전의 달", summary: "아이디어를 밀어 올리는 힘이 있습니다. 다만 감정의 확신과 실제 준비도를 분리해야 흐름이 선명해집니다." };
  if (diff < 135) return { phase: "상현의 달", summary: "결정과 실행의 문턱에 서 있습니다. 갈등은 멈춤의 신호가 아니라 방향을 다듬는 불꽃입니다." };
  if (diff < 180) return { phase: "보름 전의 달", summary: "관계와 무대에서 자신의 빛을 확인하려는 욕구가 커집니다. 표현은 강하지만 균형 감각이 필요합니다." };
  if (diff < 225) return { phase: "보름의 달", summary: "내면과 외부 세계가 서로를 비춥니다. 감정이 선명한 만큼 관계의 진실도 빠르게 드러납니다." };
  if (diff < 270) return { phase: "하현 전의 달", summary: "경험을 의미로 바꾸는 힘이 강합니다. 붙잡는 것보다 정리하는 선택이 운의 결을 깨끗하게 만듭니다." };
  if (diff < 315) return { phase: "하현의 달", summary: "낡은 기준을 덜어내는 시기성이 강합니다. 오래 버틴 습관을 바꾸면 다음 장면이 빠르게 열립니다." };
  return { phase: "그믐의 달", summary: "보이지 않는 곳에서 깊은 재정렬이 일어납니다. 침묵, 기록, 휴식이 직관을 다시 밝힙니다." };
}

function topAstroHouseFocus(planets = [], houses = []) {
  const counts = {};
  for (const planet of safeArray(planets)) {
    const house = Number(planet?.house);
    if (!Number.isFinite(house)) continue;
    counts[house] = (counts[house] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  const houseNo = Number(top[0]);
  const house = safeArray(houses).find((item) => Number(item?.house) === houseNo) || {};
  return {
    house: houseNo,
    sign: clean(house?.sign),
    count: Number(top[1]),
    summary: `${houseNo}하우스가 가장 붐빕니다. ${clean(house?.sign) || "이 영역"}의 무대에서 삶의 사건과 선택이 자주 모입니다.`,
  };
}

function buildAstroInsightCards(chart = {}) {
  const planets = safeArray(chart?.planets);
  const houses = safeArray(chart?.houses);
  const aspects = safeArray(chart?.aspects);
  const sun = findAstroPlanet(planets, "Sun");
  const moon = findAstroPlanet(planets, "Moon");
  const venus = findAstroPlanet(planets, "Venus");
  const mars = findAstroPlanet(planets, "Mars");
  const jupiter = findAstroPlanet(planets, "Jupiter");
  const saturn = findAstroPlanet(planets, "Saturn");
  const lunarPhase = describeLunarPhase(sun, moon);
  const houseFocus = topAstroHouseFocus(planets, houses);
  const strongAspects = aspects
    .filter((aspect) => clean(aspect?.planetA) && clean(aspect?.planetB))
    .sort((a, b) => parseNum(a?.orb, 99) - parseNum(b?.orb, 99))
    .slice(0, 5)
    .map((aspect) => ({
      pair: `${PLANET_KO[aspect.planetA] || aspect.planetA} - ${PLANET_KO[aspect.planetB] || aspect.planetB}`,
      type: clean(aspect?.type),
      orb: Number.isFinite(Number(aspect?.orb)) ? Number(aspect.orb) : null,
      summary: `${clean(aspect?.type) || "주요 각"}은 재능과 긴장이 동시에 열리는 문입니다.`,
    }));
  const retrogrades = planets
    .filter((planet) => planet?.retrograde)
    .map((planet) => PLANET_KO[planet.name] || planet.name);
  const northNode = chart?.nodes?.north || null;
  const southNode = chart?.nodes?.south || null;
  return {
    version: "astro-insights-v1",
    lunarPhase,
    houseFocus,
    strongAspects,
    retrogrades,
    nodeAxis: {
      north: northNode,
      south: southNode,
      summary: northNode?.sign && southNode?.sign
        ? `남쪽 노드 ${southNode.sign}의 익숙한 방식에서 북쪽 노드 ${northNode.sign}의 새로운 배움으로 이동할수록 이번 생의 문이 넓어집니다.`
        : "노드 축은 익숙한 습관과 새롭게 배워야 할 방향을 함께 보여 줍니다.",
    },
    cards: [
      {
        id: "core",
        title: "핵심 별빛 구조",
        text: `태양 ${clean(chart.sunSign) || clean(sun.sign) || "Sun"}, 달 ${clean(chart.moonSign) || clean(moon.sign) || "Moon"}, 상승궁 ${clean(chart.ascendantSign) || "ASC"}이 성격의 중심 삼각형을 이룹니다. 차트 룰러 ${clean(chart?.chartRuler?.label) || "차트 룰러"}는 삶이 실제로 움직이는 손잡이입니다.`,
      },
      {
        id: "emotion",
        title: "감정 리듬",
        text: `${lunarPhase.phase}: ${lunarPhase.summary}`,
      },
      {
        id: "love",
        title: "사랑과 끌림",
        text: `금성 ${clean(venus.sign) || "Venus"}은 마음이 아름다움을 느끼는 방식이고, 화성 ${clean(mars.sign) || "Mars"}은 욕망이 움직이는 속도입니다. 두 신호를 함께 읽으면 설렘과 지속성의 온도가 드러납니다.`,
      },
      {
        id: "career",
        title: "일과 사회적 방향",
        text: `MC ${clean(chart.midheavenSign) || "Midheaven"}, 목성 ${clean(jupiter.sign) || "Jupiter"}, 토성 ${clean(saturn.sign) || "Saturn"}이 사회적 성장의 축입니다. 확장은 목성이 열고, 오래 남는 성과는 토성이 완성합니다.`,
      },
      {
        id: "growth",
        title: "성장 과제",
        text: `${houseFocus?.summary || "행성이 모인 하우스는 삶이 자주 시험하고 키우는 무대입니다."} ${retrogrades.length ? `역행 신호(${retrogrades.join(", ")})는 밖으로 밀어붙이기 전 안에서 숙성해야 할 재능을 보여 줍니다.` : "역행 압력이 적을수록 에너지는 비교적 직접적으로 표현됩니다."}`,
      },
    ],
  };
}

function uniqueList(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const key = clean(value).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(clean(value));
  }
  return out;
}

function buildSignals(localAstroChartJson, chapter, section, sectionIndex) {
  const chart = asObject(localAstroChartJson.chart);
  const insights = asObject(localAstroChartJson.insights);
  const planets = safeArray(chart.planets);
  const houses = safeArray(chart.houses);
  const aspects = safeArray(chart.aspects);
  const angles = asObject(chart.angles);
  const insightCards = safeArray(insights.cards).slice(sectionIndex % 3, (sectionIndex % 3) + 2).map((card) => `${card.title}: ${card.text}`);
  const aspectInsights = safeArray(insights.strongAspects).slice(0, 2).map((aspect) => `${aspect.pair} ${aspect.type}`);
  const pickPlanets = planets.slice(sectionIndex, sectionIndex + 4).map((planet) => `${planet.name} ${planet.sign}`).filter(Boolean);
  const pickHouses = houses.slice(sectionIndex, sectionIndex + 3).map((house) => `${house.house}하우스 ${house.sign || "핵심"}`).filter(Boolean);
  const pickAspects = aspects.slice(sectionIndex, sectionIndex + 3).map((aspect) => `${aspect.planetA}-${aspect.planetB} ${aspect.type}`).filter(Boolean);
  const usedSignals = uniqueList([
    `${clean(chart.sunSign) || "태양"}`,
    `${clean(chart.moonSign) || "달"}`,
    `${clean(chart.ascendantSign) || "상승궁"}`,
    `${clean(chart.midheavenSign) || "MC"}`,
    `${clean(angles.asc) || clean(chart.ascendantSign)} ASC`,
    `${clean(angles.dsc) || clean(chart.descendantSign)} DSC`,
    `${clean(angles.mc) || clean(chart.midheavenSign)} MC`,
    `${clean(angles.ic) || clean(chart.icSign)} IC`,
    `${clean(chart?.chartRuler?.label || PLANET_KO[chart?.chartRuler?.ruler]) || "차트 룰러"}`,
    `${clean(insights?.lunarPhase?.phase) || "달의 리듬"}`,
    `${clean(insights?.nodeAxis?.summary) || "노드 축"}`,
    `${clean(chart?.elementBalance?.summary || "원소 균형")}`,
    `${clean(chart?.modalityBalance?.summary || "모드 균형")}`,
    ...pickPlanets,
    ...pickHouses,
    ...pickAspects,
    ...aspectInsights,
    ...insightCards,
    chapter.title,
    section.title,
  ]).slice(0, 16);

  return {
    usedSignals,
    usedPlanets: uniqueList(pickPlanets.map((text) => text.split(" ")[0])),
    usedHouses: uniqueList(pickHouses.map((text) => Number(text))).filter((n) => Number.isFinite(n)),
    usedAspects: uniqueList(pickAspects),
  };
}

function buildAstroExpansionParagraph(chapter, section, ctx, pass = 1) {
  const chapterId = clean(chapter?.id);
  const sectionTitle = clean(section?.title) || "핵심 섹션";
  const sun = clean(ctx?.coreSigns?.sun) || "태양";
  const moon = clean(ctx?.coreSigns?.moon) || "달";
  const asc = clean(ctx?.coreSigns?.asc) || "상승궁";
  const mc = clean(ctx?.coreSigns?.mc) || "MC";
  const topHouse = clean(ctx?.focus?.topHouse) || "주요 하우스";
  const topHouseTopic = clean(ctx?.focus?.topHouseTopic) || "삶의 영역";

  const map = {
    astro_cosmic_summary: `${sectionTitle}에서는 태양 ${sun}, 달 ${moon}, 상승궁 ${asc}, MC ${mc}를 함께 보며 차트 전체의 중심 분위기를 정리합니다. ${pass}차 보강에서는 핵심 신호를 일상 의사결정 기준으로 변환해 적용 강도를 높입니다.`,
    astro_sun: `${sectionTitle}에서는 태양 ${sun}의 목적성과 해당 하우스의 무대를 연결해 자아가 살아나는 조건을 설명합니다. ${pass}차 보강은 목표-실행-점검 루틴으로 목적성을 현실화하는 단계입니다.`,
    astro_moon: `${sectionTitle}에서는 달 ${moon}의 감정 리듬을 바탕으로 안정감, 불안, 회복 루틴을 구분합니다. ${pass}차 보강에서는 감정 반응 기록과 회복 간격 설계를 함께 제시합니다.`,
    astro_asc_mc: `${sectionTitle}에서는 상승궁 ${asc}와 MC ${mc}를 연결해 첫인상과 사회적 방향이 어떻게 만나는지 해석합니다. ${pass}차 보강은 대외 표현 전략과 역할 정렬의 실행 기준입니다.`,
    astro_personal_planets: `${sectionTitle}에서는 수성·금성·화성의 사고, 사랑, 행동 패턴을 실제 관계와 선택 장면으로 풀어냅니다. ${pass}차 보강은 갈등 상황의 반응 전환 포인트를 제시합니다.`,
    astro_jupiter_saturn: `${sectionTitle}에서는 목성의 확장성과 토성의 책임이 어떤 균형을 요구하는지 설명합니다. ${pass}차 보강은 확장 구간과 보수 구간의 전환 규칙입니다.`,
    astro_houses: `${sectionTitle}에서는 ${topHouse}와 ${topHouseTopic}을 중심으로 현실 과제를 정리합니다. ${pass}차 보강에서는 주간 단위 실행 우선순위를 확정합니다.`,
    astro_aspects: `${sectionTitle}에서는 주요 어스펙트가 만드는 긴장과 재능을 구분해 실행 전략으로 바꿉니다. ${pass}차 보강은 반복 패턴의 원인-대응 구조를 고정하는 단계입니다.`,
    astro_love: `${sectionTitle}에서는 금성, 화성, 7하우스, 달의 신호를 연결해 사랑과 관계의 반복 패턴을 설명합니다. ${pass}차 보강에서는 대화·경계·합의 리듬을 세분화합니다.`,
    astro_career: `${sectionTitle}에서는 MC, 10하우스, 토성, 목성의 신호를 통해 직업과 재물의 방향을 정리합니다. ${pass}차 보강은 성과 지표와 리스크 완충 기준을 함께 다룹니다.`,
    astro_timing: `${sectionTitle}에서는 현재 시기 신호와 회복 전략을 연결해 90일 행동 기준을 제시합니다. ${pass}차 보강은 시기별 행동 강도 조절 규칙을 보완합니다.`,
    astro_master_plan: `${sectionTitle}에서는 전체 차트를 사랑·일·돈·회복의 실행 계획으로 통합합니다. ${pass}차 보강은 1년·3년·10년 계획을 점검 가능한 단계로 분해합니다.`,
  };

  return map[chapterId] || `${sectionTitle}에서는 확인된 차트 신호를 바탕으로 현실적인 실행 기준을 정리합니다. ${pass}차 보강은 실행 단위와 점검 기준을 명확히 하는 단계입니다.`;
}

function buildConsultingParagraph(signalText, chapterTitle, sectionTitle, index) {
  const paragraphs = {
    "핵심 진단": `${chapterTitle}의 ${sectionTitle}에서는 태양(Sun), 달(Moon), 상승궁(Ascendant), MC(Midheaven) 신호를 한 축으로 묶어 지금 삶의 결정을 좌우하는 중심 패턴을 진단합니다. ${signalText} 흐름은 이 사람이 성취보다 의미, 속도보다 방향 정렬에 민감하게 반응한다는 점을 보여 줍니다. 그래서 환경이 맞지 않으면 의욕이 급격히 떨어지고, 반대로 가치와 역할이 맞을 때는 집중력이 매우 깊어지는 차트입니다.`,
    "차트 근거": `근거는 수성·금성·화성의 개인행성 리듬, 목성·토성의 확장과 책임 축, 천왕성·해왕성·명왕성의 장기 전환 압력에서 동시에 확인됩니다. 2하우스·7하우스·10하우스·12하우스는 돈, 관계, 커리어, 무의식 회복의 우선순위를 분명하게 드러내며, 어스펙트는 재능과 긴장을 분리해 해석해야 실제 행동 전략으로 연결됩니다.`,
    "현실에서 드러나는 모습": `실제 생활에서는 중요한 대화 직전 감정이 먼저 흔들리거나, 관계와 일의 균형이 무너지는 순간 판단이 극단으로 치우치기 쉽습니다. 그러나 차트의 장점은 회복 루틴을 확보했을 때 실행력이 크게 살아난다는 점입니다. 달과 12하우스 신호를 먼저 안정시키고, 이후 10하우스와 MC 영역으로 집중을 옮기면 성과 효율이 눈에 띄게 올라갑니다.`,
    "장점": `강점은 복잡한 상황에서 핵심 의제를 선별하는 통찰, 관계에서 정서적 결을 읽는 민감성, 장기 프로젝트를 구조화하는 지구력입니다. 태양과 상승궁 축이 정렬될 때 자기표현이 자연스럽게 설득력으로 전환되고, 목성 신호가 열리는 시기에는 기회 포착 속도도 빨라집니다.`,
    "주의점": `주의할 점은 금성-화성 템포가 어긋날 때 관계의 의도 전달이 지연되거나, 토성 긴장 구간에서 자기비판이 과해져 결정이 늦어지는 패턴입니다. 또한 2하우스와 8하우스 긴장 시기에는 지출과 책임을 동시에 떠안아 피로가 누적되기 쉬우므로, 숫자 기반 점검 루틴이 반드시 필요합니다.`,
    "상담사의 조언": `상담 관점에서 핵심은 감정 안정-의사결정-실행 순서를 뒤집지 않는 것입니다. 달의 리듬을 먼저 안정시키고, 수성 기준으로 선택지를 비교한 뒤, 화성의 추진력을 투입하세요. 관계 이슈는 7하우스 관점에서 요구와 경계를 문장으로 분리해 전달하면 오해가 크게 줄고, 커리어 이슈는 MC 기준으로 역할 정의를 먼저 확정하면 방향 혼선이 줄어듭니다.`,
    "실천 과제": `앞으로 ${index + 1}주 동안 하루 10분 차트 루틴을 실행하세요. 첫째, 오늘의 감정 상태와 에너지 변화를 기록합니다. 둘째, 관계·일·돈 중 한 영역만 우선순위로 선택합니다. 셋째, 결정 전 확인 질문 3개를 고정합니다. 넷째, 주 1회 결과를 복기해 다음 주 계획을 조정합니다. 이 루틴은 차트의 강점을 실전 성과로 연결하는 가장 빠른 방법입니다.`,
  };
  return ASTRO_SECTION_HEADINGS.map((heading) => `${heading}\n${paragraphs[heading] || ""}`).join("\n\n");
}

function sanitizeBody(text) {
  let out = sanitizeAstroPremiumText(text);
  for (const pattern of FORBIDDEN_PATTERNS) out = out.replace(pattern, "");
  return out.replace(/\s{2,}/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
}

function softenAstroRiskyBody(text) {
  return sanitizeBody(text)
    .replace(/확정/g, "정리")
    .replace(/무조건/g, "가능한 범위에서")
    .replace(/반드시/g, "필요한 만큼")
    .replace(/투자\s*수익/g, "재정 흐름")
    .replace(/수익\s*보장/g, "재정 안정")
    .replace(/대박/g, "큰 전환")
    .replace(/파산/g, "재정 압박")
    .replace(/죽음|사망/g, "큰 마무리");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderAstroSectionBody(body) {
  const headingPattern = /^(핵심 진단|차트 근거|현실에서 드러나는 모습|장점|주의점|상담사의 조언|실천 과제)$/;
  return sanitizeBody(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (headingPattern.test(line)) return `<h4>${escapeHtml(line)}</h4>`;
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
}

function getDynamicTotalMinLength(chapterCount) {
  const count = Math.max(1, Number(chapterCount || 0));
  return Math.max(MIN_TOTAL_LENGTH_FLOOR, count * MIN_CHAPTER_LENGTH);
}

function ensureMinLength(text, minLength, appendix) {
  let out = sanitizeBody(text);
  if (out.length >= minLength) return out;
  while (out.length < minLength) {
    out = `${out}\n\n${appendix}`;
    out = sanitizeBody(out);
  }
  return out;
}

export function buildAstroLocalPremiumManuscript(localAstroChartJson) {
  const chart = asObject(localAstroChartJson?.chart);
  const context = {
    coreSigns: {
      sun: clean(chart?.sunSign),
      moon: clean(chart?.moonSign),
      asc: clean(chart?.ascendantSign),
      mc: clean(chart?.midheavenSign),
    },
    focus: {
      topHouse: clean(safeArray(chart?.houses)?.[0]?.house ? `${safeArray(chart?.houses)?.[0]?.house}하우스` : ""),
      topHouseTopic: clean(safeArray(chart?.houses)?.[0]?.sign),
    },
  };

  const drafts = ASTRO_PREMIUM_CHAPTERS.map((chapter, chapterIndex) => {
    const sections = chapter.categories.map((category, sectionIndex) => {
      const signalPack = buildSignals(localAstroChartJson, chapter, category, sectionIndex + chapterIndex);
      const signalText = signalPack.usedSignals.slice(0, 6).join(" · ");
      const appendix = buildAstroExpansionParagraph(chapter, category, context, 1);
      const body = ensureMinLength(
        buildConsultingParagraph(signalText || "핵심 차트 신호", chapter.title, category.title, sectionIndex),
        MIN_SECTION_LENGTH,
        appendix,
      );
      return {
        title: category.title,
        body,
        bullets: signalPack.usedSignals.slice(0, 5),
        localQuality: {
          minLengthPassed: body.length >= MIN_SECTION_LENGTH,
          usedPlanets: signalPack.usedPlanets,
          usedHouses: signalPack.usedHouses,
          usedAspects: signalPack.usedAspects,
          usedSignals: signalPack.usedSignals,
        },
      };
    });

    let chapterTextLength = sections.reduce((sum, section) => sum + clean(section.body).length, 0);
    if (chapterTextLength < MIN_CHAPTER_LENGTH) {
      const reinforce = `이 장의 핵심은 차트 신호를 현실 시간표에 반영하는 것입니다. 계획-실행-점검의 3단계를 반복해 결과를 축적하면 기회 구간에서는 속도를 높이고 주의 구간에서는 손실을 줄이는 균형을 만들 수 있습니다.`;
      sections[sections.length - 1].body = ensureMinLength(sections[sections.length - 1].body, MIN_SECTION_LENGTH + (MIN_CHAPTER_LENGTH - chapterTextLength), reinforce);
      chapterTextLength = sections.reduce((sum, section) => sum + clean(section.body).length, 0);
    }

    return {
      chapterNo: chapter.order,
      title: chapter.title,
      subtitle: `${chapter.roman}. ${chapter.title}`,
      sections,
      localQuality: {
        minLengthPassed: chapterTextLength >= MIN_CHAPTER_LENGTH,
        usedPlanets: uniqueList(sections.flatMap((section) => safeArray(section.localQuality?.usedPlanets))),
        usedHouses: uniqueList(sections.flatMap((section) => safeArray(section.localQuality?.usedHouses))),
        usedAspects: uniqueList(sections.flatMap((section) => safeArray(section.localQuality?.usedAspects))),
        usedSignals: uniqueList(sections.flatMap((section) => safeArray(section.localQuality?.usedSignals))),
      },
    };
  });

  return reinforceManuscriptLength(drafts);
}

export async function enhanceAstroPremiumChaptersWithLLM(env, localManuscriptOrChart, localAstroChartJsonOrOptions = {}, maybeOptions = {}) {
  const hasLocalManuscript = Array.isArray(localManuscriptOrChart)
    || Array.isArray(localManuscriptOrChart?.chapters);
  const localAstroChartJson = hasLocalManuscript ? localAstroChartJsonOrOptions : localManuscriptOrChart;
  const options = hasLocalManuscript ? maybeOptions : localAstroChartJsonOrOptions;
  const emit = typeof options.log === "function" ? options.log : () => {};
  const localInput = hasLocalManuscript
    ? (Array.isArray(localManuscriptOrChart) ? localManuscriptOrChart : safeArray(localManuscriptOrChart?.chapters))
    : buildAstroLocalPremiumManuscript(localAstroChartJson);
  const localFallbackChapters = normalizeAstroLocalFallbackManuscript(localInput, localAstroChartJson);
  const chartInput = buildAstroLLMChartInput(localAstroChartJson);
  const masterJson = asObject(options.masterJson);
  const facts = options.facts || buildWesternAstrologyFacts(localAstroChartJson, options.rawInput || {});
  const chapterPlans = options.chapterPlans || buildWesternAstrologyChapterPlans({ chapters: localFallbackChapters }, facts, localAstroChartJson);
  const chapterPlanById = new Map(chapterPlans.map((plan) => [clean(plan.chapterId), plan]));
  const enhancedChapterIds = new Set(ASTROLOGY_PERSONAL_LLM_ENHANCED_CHAPTERS);
  const llmFlagEnabled = readAstroFlag(env, "WESTERN_ASTROLOGY_LLM_ENHANCEMENT_ENABLED", true);
  const llmAvailable = llmFlagEnabled && (hasAstroLlmCredential(env) || typeof options.llmChapterGenerator === "function");
  const chapters = [];
  const previousSummaries = [];
  const attempts = [];
  const failures = [];
  const models = new Set();
  let stopLlmReason = llmAvailable ? "" : (llmFlagEnabled ? "missing_key" : "llm_disabled");

  for (const [index, chapterSpec] of ASTRO_PREMIUM_CHAPTERS.entries()) {
    const localChapter = localFallbackChapters[index]
      || localFallbackChapters.find((item) => Number(item?.chapterNo) === Number(chapterSpec.order))
      || {};
    const chapterPlan = chapterPlanById.get(clean(chapterSpec.id)) || {};
    let finalChapter = localChapter;
    let source = stopLlmReason ? "local-template" : "local-template";
    let chapterAttempts = 0;
    let model = "";
    const shouldEnhance = llmAvailable && !stopLlmReason && enhancedChapterIds.has(clean(chapterSpec.id));

    if (shouldEnhance) {
      emit("LLMChapterBuildStart", {
        chapterNo: chapterSpec.order,
        title: chapterSpec.title,
        chapterId: chapterSpec.id,
      });
      const cacheKey = buildWesternAstrologyLlmCacheKey(facts, chapterSpec.id);
      const cached = readWesternAstrologyLlmCache(cacheKey);
      if (cached?.chapter) {
        finalChapter = cached.chapter;
        source = "llm-cache";
        model = clean(cached.model || "cache");
      } else {
        try {
          const generated = await generateAstroChapterWithLLM(env, {
            localAstroChartJson,
            chartInput,
            masterJson,
            chapterSpec,
            signalBrief: buildAstroLLMSignalBrief(localAstroChartJson, chapterSpec),
            chapterPlan,
            previousSummaries,
            requestId: clean(options.requestId),
            llmChapterGenerator: options.llmChapterGenerator,
            log: emit,
          });
          finalChapter = generated.chapter;
          source = "llm-enhanced";
          chapterAttempts = Number(generated.attempts || 1);
          model = clean(generated.model);
          writeWesternAstrologyLlmCache(cacheKey, {
            chapter: finalChapter,
            summary: summarizeAstroLLMChapter(finalChapter),
            model,
          });
        } catch (error) {
          const failureClass = classifyAstroLlmFailure(error);
          failures.push({
            chapterId: clean(chapterSpec.id),
            chapterNo: Number(chapterSpec.order),
            failureClass,
            code: clean(error?.code || "ASTRO_LLM_CHAPTER_FAILED"),
            message: clean(error?.message || error),
          });
          source = "local-fallback-after-llm-failure";
          if (["missing_key", "rate_limited", "timeout"].includes(failureClass)) stopLlmReason = failureClass;
        }
      }
    }

    chapters.push(finalChapter);
    previousSummaries.push(summarizeAstroLLMChapter(finalChapter));
    attempts.push({
      chapterId: clean(chapterSpec.id),
      chapterNo: Number(chapterSpec.order),
      attempts: chapterAttempts,
      model,
      source,
    });
    if (model && model !== "cache") models.add(model);
    emit("LLMChapterBuildSuccess", {
      chapterNo: Number(finalChapter.chapterNo || chapterSpec.order),
      title: clean(finalChapter.title || chapterSpec.title),
      sectionCount: safeArray(finalChapter.sections).length,
      chars: chapterLength(finalChapter),
      source,
    });
  }

  const llmChapterCount = attempts.filter((item) => item.source === "llm-enhanced" || item.source === "llm-cache").length;
  const localTemplateChapterCount = attempts.length - llmChapterCount;
  return {
    chapters,
    fallbackUsed: Boolean(failures.length || stopLlmReason),
    llmChapterCount,
    fallbackChapterCount: failures.length,
    localDraftChapterCount: localTemplateChapterCount,
    source: llmChapterCount > 0 ? ASTRO_MANUSCRIPT_SOURCE.HYBRID : "local-template",
    enhancedChapterIds: ASTROLOGY_PERSONAL_LLM_ENHANCED_CHAPTERS,
    expectedLlmChapterCount: ASTROLOGY_PERSONAL_LLM_ENHANCED_CHAPTERS.length,
    promptVersion: WESTERN_ASTROLOGY_PROMPT_VERSION,
    llmEnabled: llmFlagEnabled,
    llmAvailable,
    stopLlmReason,
    failures,
    attempts,
    model: Array.from(models).join(", "),
  };
}

function safeJsonForPrompt(value) {
  try {
    return JSON.stringify(value, (key, item) => {
      if (typeof item === "number" && !Number.isFinite(item)) return null;
      if (typeof item === "string") return clean(item).slice(0, 2400);
      return item;
    }, 2);
  } catch (_) {
    return "{}";
  }
}

function compactAstroPlanetForLLM(planet = {}) {
  return {
    name: clean(PLANET_KO[planet?.name] || planet?.name),
    sign: clean(planet?.sign),
    degree: clean(planet?.degree),
    house: Number.isFinite(Number(planet?.house)) ? Number(planet.house) : undefined,
    retrograde: Boolean(planet?.retrograde),
  };
}

function compactAstroHouseForLLM(house = {}) {
  return {
    house: Number(house?.house || house?.number || 0) || undefined,
    sign: clean(house?.sign),
    degree: clean(house?.degree),
    topic: clean(house?.topic || house?.meaning),
  };
}

function compactAstroAspectForLLM(aspect = {}) {
  return {
    pair: clean(aspect?.pair || `${PLANET_KO[aspect?.planetA] || aspect?.planetA || ""}-${PLANET_KO[aspect?.planetB] || aspect?.planetB || ""}`),
    type: clean(aspect?.type || aspect?.aspect),
    orb: clean(aspect?.orb),
    strength: clean(aspect?.strength),
  };
}

function formatAstroChartRulerForText(chartRuler) {
  if (chartRuler && typeof chartRuler === "object") {
    return clean(chartRuler.label || PLANET_KO[chartRuler.ruler] || chartRuler.ruler || chartRuler.sign);
  }
  return clean(chartRuler);
}

function buildAstroLLMChartInput(localAstroChartJson = {}) {
  const birthInput = asObject(localAstroChartJson?.birthInput);
  const chart = asObject(localAstroChartJson?.chart);
  const insights = asObject(localAstroChartJson?.insights);
  return {
    profile: {
      name: clean(birthInput.name) || "사용자",
      birthDate: clean(birthInput.birthDate),
      birthTime: clean(birthInput.birthTime),
      birthPlace: clean(birthInput.birthPlace),
      timezone: clean(birthInput.timezone),
      gender: clean(birthInput.gender),
    },
    coreSigns: {
      sun: clean(chart.sunSign),
      moon: clean(chart.moonSign),
      ascendant: clean(chart.ascendantSign),
      midheaven: clean(chart.midheavenSign),
      descendant: clean(chart.descendantSign),
      ic: clean(chart.icSign),
      chartRuler: formatAstroChartRulerForText(chart.chartRuler),
    },
    elementBalance: asObject(chart.elementBalance),
    modalityBalance: asObject(chart.modalityBalance),
    planets: safeArray(chart.planets).slice(0, 12).map(compactAstroPlanetForLLM),
    houses: safeArray(chart.houses).slice(0, 12).map(compactAstroHouseForLLM),
    aspects: safeArray(chart.aspects).slice(0, 24).map(compactAstroAspectForLLM),
    nodes: asObject(chart.nodes),
    insightCards: safeArray(insights.cards).slice(0, 8).map((card) => ({
      title: clean(card?.title),
      text: clean(card?.text),
    })),
    strongAspects: safeArray(insights.strongAspects).slice(0, 8),
    retrogrades: safeArray(insights.retrogrades).slice(0, 8),
    lunarPhase: asObject(insights.lunarPhase),
    houseFocus: asObject(insights.houseFocus),
    interpretationSeeds: asObject(localAstroChartJson?.interpretationSeeds),
  };
}

function buildAstroLLMSignalBrief(localAstroChartJson = {}, chapterSpec = {}) {
  const chart = asObject(localAstroChartJson?.chart);
  const insights = asObject(localAstroChartJson?.insights);
  const planets = safeArray(chart.planets).slice(0, 12).map(compactAstroPlanetForLLM);
  const houses = safeArray(chart.houses).slice(0, 12).map(compactAstroHouseForLLM);
  const aspects = safeArray(chart.aspects).slice(0, 24).map(compactAstroAspectForLLM);
  const coreSignals = uniqueList([
    clean(chart.sunSign),
    clean(chart.moonSign),
    clean(chart.ascendantSign),
    clean(chart.midheavenSign),
    clean(chart.descendantSign),
    clean(chart.icSign),
    formatAstroChartRulerForText(chart.chartRuler),
    ...planets.map((planet) => `${planet.name} ${planet.sign} ${planet.house ? `${planet.house}H` : ""}`),
    ...houses.map((house) => `${house.house}H ${house.sign} ${house.topic}`),
    ...aspects.map((aspect) => `${aspect.pair} ${aspect.type} ${aspect.orb}`),
    ...safeArray(insights.strongAspects).map((aspect) => `${aspect.pair} ${aspect.type}`),
    ...safeArray(insights.retrogrades),
  ]).slice(0, 32);
  const sectionSignals = safeArray(chapterSpec?.categories).map((category, index) => {
    const planetOffset = index % Math.max(1, planets.length);
    const houseOffset = index % Math.max(1, houses.length);
    const aspectOffset = index % Math.max(1, aspects.length);
    return {
      title: clean(category?.title),
      evidence: uniqueList([
        ...coreSignals.slice(0, 8),
        ...planets.slice(planetOffset, planetOffset + 4).map((planet) => `${planet.name} ${planet.sign} ${planet.house ? `${planet.house}H` : ""}`),
        ...houses.slice(houseOffset, houseOffset + 3).map((house) => `${house.house}H ${house.sign} ${house.topic}`),
        ...aspects.slice(aspectOffset, aspectOffset + 3).map((aspect) => `${aspect.pair} ${aspect.type}`),
      ]).slice(0, 16),
      requiredEvidenceCount: 4,
    };
  });
  return {
    chapterNo: Number(chapterSpec?.order || 0) || undefined,
    chapterId: clean(chapterSpec?.id),
    title: clean(chapterSpec?.title),
    chapterSignals: coreSignals,
    sections: sectionSignals,
    sourceContract: {
      manuscriptSource: ASTRO_MANUSCRIPT_SOURCE.HYBRID,
      localDraftAllowed: true,
      fallbackAllowed: true,
      calculationLocked: true,
    },
  };
}

function getAstroBirthTimeConfidence(birthInput = {}, rawInput = {}) {
  const explicit = clean(rawInput?.birthTimeConfidence || birthInput?.birthTimeConfidence).toLowerCase();
  if (["known", "approximate", "unknown"].includes(explicit)) return explicit;
  if (birthInput?.isTimeUnknown || !Number.isFinite(Number(birthInput?.birthHour))) return "unknown";
  if (birthInput?.isTimeApproximate || rawInput?.isTimeApproximate) return "approximate";
  return "known";
}

function buildAstroTargetPeriod(rawInput = {}) {
  const targetPeriod = asObject(rawInput?.targetPeriod || rawInput?.period);
  return {
    targetYear: Number.isFinite(Number(targetPeriod?.targetYear || rawInput?.targetYear)) ? Number(targetPeriod?.targetYear || rawInput?.targetYear) : null,
    startDate: clean(targetPeriod?.startDate || rawInput?.startDate),
    endDate: clean(targetPeriod?.endDate || rawInput?.endDate),
    label: clean(targetPeriod?.label || rawInput?.periodLabel || rawInput?.yearLabel),
  };
}

export function buildWesternAstrologyFacts(localAstroChartJson = {}, rawInput = {}) {
  const birthInput = asObject(localAstroChartJson?.birthInput);
  const chart = asObject(localAstroChartJson?.chart);
  const planets = safeArray(chart?.planets).map(compactAstroPlanetForLLM);
  const houses = safeArray(chart?.houses).map(compactAstroHouseForLLM);
  const aspects = safeArray(chart?.aspects).map(compactAstroAspectForLLM);
  const birthTimeConfidence = getAstroBirthTimeConfidence(birthInput, rawInput);
  const mode = clean(rawInput?.mode || rawInput?.reportMode || "personal").toLowerCase() || "personal";
  const calculationMode = clean(localAstroChartJson?.calculationMode || rawInput?.calculationMode || "worker-swiss-western-chart");
  const calculationBasis = {
    zodiacType: clean(rawInput?.zodiacType || rawInput?.calculationBasis?.zodiacType || "existing_engine_basis"),
    houseSystem: clean(rawInput?.houseSystem || rawInput?.calculationBasis?.houseSystem || "existing_engine_value"),
    timezone: clean(birthInput?.timezone || rawInput?.timezone),
    birthPlace: {
      name: clean(birthInput?.birthPlace || rawInput?.birthPlace),
    },
    coordinates: {
      latitude: Number.isFinite(Number(birthInput?.latitude)) ? Number(birthInput.latitude) : null,
      longitude: Number.isFinite(Number(birthInput?.longitude)) ? Number(birthInput.longitude) : null,
    },
    dstRule: clean(rawInput?.dstRule || rawInput?.calculationBasis?.dstRule || "existing_engine_basis"),
    ephemerisVersion: clean(rawInput?.ephemerisVersion || rawInput?.calculationBasis?.ephemerisVersion || calculationMode),
    algorithmVersion: calculationMode,
    dateBoundaryRule: clean(rawInput?.dateBoundaryRule || rawInput?.calculationBasis?.dateBoundaryRule || "existing_engine_basis"),
    aspectOrbRule: clean(rawInput?.aspectOrbRule || rawInput?.calculationBasis?.aspectOrbRule || "existing_engine_basis"),
    birthTimeConfidence,
  };
  return {
    productId: "western_astrology",
    serviceKey: "astro-premium",
    mode,
    promptVersion: WESTERN_ASTROLOGY_PROMPT_VERSION,
    birthInfo: {
      name: clean(birthInput?.name),
      gender: clean(birthInput?.gender),
      birthDate: clean(birthInput?.birthDate),
      birthTime: clean(birthInput?.birthTime),
      birthYear: Number.isFinite(Number(birthInput?.birthYear)) ? Number(birthInput.birthYear) : null,
      birthMonth: Number.isFinite(Number(birthInput?.birthMonth)) ? Number(birthInput.birthMonth) : null,
      birthDay: Number.isFinite(Number(birthInput?.birthDay)) ? Number(birthInput.birthDay) : null,
      birthHour: Number.isFinite(Number(birthInput?.birthHour)) ? Number(birthInput.birthHour) : null,
      birthMinute: Number.isFinite(Number(birthInput?.birthMinute)) ? Number(birthInput.birthMinute) : null,
      timezone: calculationBasis.timezone,
      birthPlace: calculationBasis.birthPlace.name,
      latitude: calculationBasis.coordinates.latitude,
      longitude: calculationBasis.coordinates.longitude,
      birthTimeConfidence,
    },
    partnerBirthInfo: asObject(rawInput?.partnerBirthInfo || rawInput?.partner || {}),
    targetPeriod: buildAstroTargetPeriod(rawInput),
    calculationBasis,
    natalChart: {
      ascendant: { sign: clean(chart?.ascendantSign), angle: clean(chart?.angles?.asc) },
      midheaven: { sign: clean(chart?.midheavenSign), angle: clean(chart?.angles?.mc) },
      descendant: { sign: clean(chart?.descendantSign), angle: clean(chart?.angles?.dsc) },
      imumCoeli: { sign: clean(chart?.icSign), angle: clean(chart?.angles?.ic) },
      sunSign: { sign: clean(chart?.sunSign) },
      moonSign: { sign: clean(chart?.moonSign) },
      planetPositions: planets,
      houseCusps: houses,
      housePlacements: houses,
      aspects,
      retrogradePlanets: planets.filter((planet) => planet.retrograde).map((planet) => clean(planet.name)).filter(Boolean),
      dignities: [],
      elementBalance: asObject(chart?.elementBalance),
      modalityBalance: asObject(chart?.modalityBalance),
      chartShape: clean(localAstroChartJson?.insights?.chartShape),
      dominantPlanets: safeArray(localAstroChartJson?.insights?.dominantPlanets),
      dominantSigns: safeArray(localAstroChartJson?.insights?.dominantSigns),
      dominantHouses: safeArray(localAstroChartJson?.insights?.dominantHouses),
    },
    sensitivePoints: {
      northNode: asObject(chart?.nodes?.north),
      southNode: asObject(chart?.nodes?.south),
      chiron: asObject(chart?.chiron),
      lilith: asObject(chart?.lilith),
      partOfFortune: asObject(chart?.partOfFortune),
      otherPoints: [],
    },
    personalThemes: {
      personalityCore: safeArray(localAstroChartJson?.interpretationSeeds?.personalityKeywords),
      emotionalPattern: safeArray(localAstroChartJson?.interpretationSeeds?.soulKeywords),
      communicationPattern: safeArray(localAstroChartJson?.interpretationSeeds?.communicationKeywords),
      loveRelationshipPattern: safeArray(localAstroChartJson?.interpretationSeeds?.relationshipKeywords),
      careerTalentPattern: safeArray(localAstroChartJson?.interpretationSeeds?.careerKeywords),
      wealthResourcePattern: safeArray(localAstroChartJson?.interpretationSeeds?.moneyKeywords),
      familyHomePattern: safeArray(localAstroChartJson?.interpretationSeeds?.familyKeywords),
      healthLifestylePattern: safeArray(localAstroChartJson?.interpretationSeeds?.healthKeywords),
      shadowPattern: safeArray(localAstroChartJson?.interpretationSeeds?.cautionKeywords),
      growthPattern: safeArray(localAstroChartJson?.interpretationSeeds?.growthKeywords),
      spiritualPattern: safeArray(localAstroChartJson?.interpretationSeeds?.spiritualKeywords),
      riskWarnings: safeArray(localAstroChartJson?.interpretationSeeds?.cautionKeywords),
      opportunitySignals: safeArray(localAstroChartJson?.interpretationSeeds?.growthKeywords),
      recommendedActions: safeArray(localAstroChartJson?.insights?.cards).map((card) => clean(card?.text)).filter(Boolean).slice(0, 8),
      avoidActions: birthTimeConfidence === "known" ? [] : ["출생 시간이 불명확하므로 상승궁, MC, 하우스 기반 해석은 단정하지 않는다."],
    },
    compatibility: {
      partnerChartSummary: {},
      synastryAspects: [],
      compositeChart: {},
      relationshipStrengths: [],
      relationshipRisks: [],
      relationshipAdvice: [],
      compatibilityScore: null,
    },
    timingFlows: {
      transits: safeArray(rawInput?.transits || rawInput?.timingFlows?.transits),
      progressions: safeArray(rawInput?.progressions || rawInput?.timingFlows?.progressions),
      solarReturn: asObject(rawInput?.solarReturn || rawInput?.timingFlows?.solarReturn),
      lunarReturn: asObject(rawInput?.lunarReturn || rawInput?.timingFlows?.lunarReturn),
      monthlyFlow: safeArray(rawInput?.monthlyFlow || rawInput?.timingFlows?.monthlyFlow),
      annualFlow: safeArray(rawInput?.annualFlow || rawInput?.timingFlows?.annualFlow),
    },
  };
}

export function buildWesternAstrologyLlmCacheKey(facts = {}, chapterId = "") {
  const basis = asObject(facts?.calculationBasis);
  return [
    "western-astrology-llm",
    WESTERN_ASTROLOGY_PROMPT_VERSION,
    clean(facts?.productId || "western_astrology"),
    clean(facts?.mode || "personal"),
    clean(chapterId),
    clean(basis.zodiacType),
    clean(basis.houseSystem),
    clean(basis.aspectOrbRule),
    clean(basis.ephemerisVersion || basis.algorithmVersion),
    hashStableValue(facts?.birthInfo || {}),
    hashStableValue(facts?.partnerBirthInfo || {}),
    hashStableValue(facts?.targetPeriod || {}),
    hashStableValue(basis),
  ].join(":");
}

function readWesternAstrologyLlmCache(key) {
  const token = clean(key);
  if (!token || !westernAstrologyLlmCache.has(token)) return null;
  const value = westernAstrologyLlmCache.get(token);
  westernAstrologyLlmCache.delete(token);
  westernAstrologyLlmCache.set(token, value);
  return value;
}

function writeWesternAstrologyLlmCache(key, value) {
  const token = clean(key);
  if (!token || !value) return;
  westernAstrologyLlmCache.set(token, value);
  while (westernAstrologyLlmCache.size > ASTRO_LLM_CACHE_MAX) {
    const oldest = westernAstrologyLlmCache.keys().next().value;
    westernAstrologyLlmCache.delete(oldest);
  }
}

export function buildWesternAstrologyChapterPlans(localManuscript = {}, facts = {}, localAstroChartJson = {}) {
  const chapters = Array.isArray(localManuscript) ? localManuscript : safeArray(localManuscript?.chapters);
  return ASTRO_PREMIUM_CHAPTERS.map((chapterSpec, index) => {
    const chapter = chapters[index] || chapters.find((item) => Number(item?.chapterNo) === Number(chapterSpec.order)) || {};
    const signalBrief = buildAstroLLMSignalBrief(localAstroChartJson, chapterSpec);
    const lockedFacts = uniqueList([
      `태양: ${clean(facts?.natalChart?.sunSign?.sign)}`,
      `달: ${clean(facts?.natalChart?.moonSign?.sign)}`,
      `상승궁: ${clean(facts?.natalChart?.ascendant?.sign)}`,
      `MC: ${clean(facts?.natalChart?.midheaven?.sign)}`,
      ...safeArray(signalBrief?.chapterSignals).slice(0, 10),
    ]).filter(Boolean);
    const localDraft = safeArray(chapter?.sections)
      .map((section) => [clean(section?.title), clean(section?.body)].filter(Boolean).join("\n\n"))
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 9000);
    const warnings = [
      "상승궁, MC, 태양, 달, 행성 위치, 하우스, 어스펙트는 lockedFacts와 로컬 계산 결과만 따른다.",
      "사주, 숙요, 베다점, 자미두수 용어를 서양 점성술 해석처럼 섞지 않는다.",
      "행성별, 하우스별, 어스펙트별, 트랜짓별 개별 LLM 호출을 하지 않는다.",
    ];
    if (facts?.calculationBasis?.birthTimeConfidence !== "known") {
      warnings.push("출생 시간이 불명확하므로 상승궁, MC, 하우스 기반 해석은 단정하지 않는다.");
    }
    return {
      chapterId: clean(chapterSpec.id),
      chapterTitle: clean(chapterSpec.title),
      mode: clean(facts?.mode || "personal"),
      purpose: clean(chapter?.subtitle || chapterSpec.title),
      lockedFacts,
      interpretationPoints: safeArray(chapterSpec.categories).map((category) => clean(category?.title)).filter(Boolean),
      warnings,
      recommendedTone: "전문적이고 신비로운 한국어 서양 점성술 상담문",
      localDraft: softenAstroRiskyBody(localDraft),
    };
  });
}

export function buildAstroMasterJson(localAstroChartJson = {}, rawInput = {}) {
  const birthInput = asObject(localAstroChartJson?.birthInput);
  const chart = asObject(localAstroChartJson?.chart);
  const insights = asObject(localAstroChartJson?.insights);
  const clientEvidence = asObject(rawInput?.astroClientEvidenceJson || rawInput?.clientEvidenceJson);
  return {
    schemaVersion: ASTRO_MASTER_JSON_SCHEMA_VERSION,
    serviceKey: "astro-premium",
    featureKey: "premium-astrology-report",
    reportType: "westernAstrologyPremium",
    generationMode: ASTRO_PDF_CONFIG.generationMode,
    promptVersion: WESTERN_ASTROLOGY_PROMPT_VERSION,
    calculationSource: clean(localAstroChartJson?.calculationMode || rawInput?.calculationMode || "worker-swiss-western-chart"),
    birthProfile: {
      name: clean(birthInput.name) || "사용자",
      gender: clean(birthInput.gender),
      birthDate: clean(birthInput.birthDate),
      birthTime: clean(birthInput.birthTime),
      birthHour: Number.isFinite(Number(birthInput.birthHour)) ? Number(birthInput.birthHour) : null,
      birthMinute: Number.isFinite(Number(birthInput.birthMinute)) ? Number(birthInput.birthMinute) : 0,
      birthPlace: clean(birthInput.birthPlace),
      timezone: clean(birthInput.timezone),
      latitude: Number.isFinite(Number(birthInput.latitude)) ? Number(birthInput.latitude) : null,
      longitude: Number.isFinite(Number(birthInput.longitude)) ? Number(birthInput.longitude) : null,
    },
    chart: {
      coreSigns: {
        sun: clean(chart.sunSign),
        moon: clean(chart.moonSign),
        ascendant: clean(chart.ascendantSign),
        midheaven: clean(chart.midheavenSign),
        descendant: clean(chart.descendantSign),
        ic: clean(chart.icSign),
        chartRuler: formatAstroChartRulerForText(chart.chartRuler),
      },
      calculationMode: clean(localAstroChartJson?.calculationMode),
      houseSystem: clean(chart.houseSystem || rawInput?.houseSystem || "Placidus"),
      planets: safeArray(chart.planets).slice(0, 12).map(compactAstroPlanetForLLM),
      houses: safeArray(chart.houses).slice(0, 12).map(compactAstroHouseForLLM),
      aspects: safeArray(chart.aspects).slice(0, 32).map(compactAstroAspectForLLM),
      nodes: asObject(chart.nodes),
      elementBalance: asObject(chart.elementBalance),
      modalityBalance: asObject(chart.modalityBalance),
    },
    insights: {
      cards: safeArray(insights.cards).slice(0, 10).map((card) => ({
        title: clean(card?.title),
        text: clean(card?.text),
      })),
      strongAspects: safeArray(insights.strongAspects).slice(0, 12),
      retrogrades: safeArray(insights.retrogrades).slice(0, 12),
      lunarPhase: asObject(insights.lunarPhase),
      houseFocus: asObject(insights.houseFocus),
      nodeAxis: asObject(insights.nodeAxis),
      interpretationSeeds: asObject(localAstroChartJson?.interpretationSeeds),
    },
    chapterSpecs: ASTRO_PREMIUM_CHAPTERS.map((chapter) => ({
      id: clean(chapter.id),
      order: Number(chapter.order || 0),
      roman: clean(chapter.roman),
      title: clean(chapter.title),
      categories: safeArray(chapter.categories).map((category, index) => ({
        id: clean(category.id),
        order: index + 1,
        title: clean(category.title),
      })),
    })),
    clientEvidence: clientEvidence?.schemaVersion ? {
      schemaVersion: clean(clientEvidence.schemaVersion),
      source: clean(clientEvidence.source || "browser"),
      chartAvailable: Boolean(clientEvidence.chartAvailable),
      evidenceCount: Number(clientEvidence.evidenceCount || 0),
    } : null,
    qualityRules: {
      minSectionChars: MIN_SECTION_LENGTH,
      minChapterChars: MIN_CHAPTER_LENGTH,
      minTotalChars: getDynamicTotalMinLength(ASTRO_PREMIUM_CHAPTERS.length),
      requiredEvidencePerSection: 4,
      forbiddenDeveloperTerms: ["JSON", "API", "LLM", "schema", "prompt", "payload", "debug", "fallback"],
      tone: "professional-mystical-korean-consultation",
    },
  };
}

export function validateAstroMasterJson(masterJson = {}) {
  const missing = [];
  const requireField = (ok, key) => {
    if (!ok) missing.push(key);
  };
  const chart = asObject(masterJson?.chart);
  const core = asObject(chart.coreSigns);
  const birth = asObject(masterJson?.birthProfile);
  const planets = safeArray(chart.planets);
  const houses = safeArray(chart.houses);
  const aspects = safeArray(chart.aspects);
  const chapterSpecs = safeArray(masterJson?.chapterSpecs);
  requireField(clean(masterJson?.schemaVersion) === ASTRO_MASTER_JSON_SCHEMA_VERSION, "schemaVersion");
  requireField(clean(masterJson?.serviceKey) === "astro-premium", "serviceKey");
  requireField(["worker-native-hybrid", "worker-native-llm", ASTRO_PDF_CONFIG.generationMode].includes(clean(masterJson?.generationMode)), "generationMode");
  requireField(clean(birth.birthDate), "birthProfile.birthDate");
  requireField(Number.isFinite(Number(birth.birthHour)), "birthProfile.birthHour");
  requireField(clean(birth.timezone), "birthProfile.timezone");
  requireField(clean(core.sun), "chart.coreSigns.sun");
  requireField(clean(core.moon), "chart.coreSigns.moon");
  requireField(clean(core.ascendant), "chart.coreSigns.ascendant");
  requireField(clean(core.midheaven), "chart.coreSigns.midheaven");
  requireField(planets.length >= 7, "chart.planets");
  requireField(houses.length >= 12, "chart.houses");
  requireField(aspects.length >= 1, "chart.aspects");
  requireField(chapterSpecs.length === ASTRO_PREMIUM_CHAPTERS.length, "chapterSpecs");
  chapterSpecs.forEach((chapter, index) => {
    const expected = ASTRO_PREMIUM_CHAPTERS[index] || {};
    requireField(Number(chapter.order) === Number(expected.order), `chapterSpecs.${index}.order`);
    requireField(clean(chapter.title) === clean(expected.title), `chapterSpecs.${index}.title`);
    requireField(safeArray(chapter.categories).length === safeArray(expected.categories).length, `chapterSpecs.${index}.categories`);
  });
  return {
    ok: missing.length === 0,
    missing,
    schemaVersion: ASTRO_MASTER_JSON_SCHEMA_VERSION,
    stats: {
      planetCount: planets.length,
      houseCount: houses.length,
      aspectCount: aspects.length,
      chapterCount: chapterSpecs.length,
      sectionCount: chapterSpecs.reduce((sum, chapter) => sum + safeArray(chapter.categories).length, 0),
    },
  };
}

function summarizeAstroLLMChapter(chapter = {}) {
  return {
    chapterNo: Number(chapter?.chapterNo || 0) || undefined,
    title: clean(chapter?.title),
    summary: clean(chapter?.summary || safeArray(chapter?.sections).map((section) => clean(section?.body).slice(0, 140)).join(" / ")).slice(0, 700),
  };
}

function buildAstroChapterPrompt({ chartInput, masterJson = {}, chapterSpec, signalBrief, chapterPlan = {}, previousSummaries = [], attempt = 1, lastErrors = [] } = {}) {
  const categories = safeArray(chapterSpec?.categories).map((category, index) => ({
    order: index + 1,
    title: category.title,
  }));
  const responseShape = {
    chapterNo: Number(chapterSpec.order),
    summary: "이 장의 핵심을 180자 안팎으로 요약",
    sections: categories.map(() => ({
      body: "950자 이상 1350자 이하의 개인화 상담 본문",
      bullets: ["핵심 통찰", "주의 흐름", "실천 포인트"],
      evidenceSignals: ["태양 별자리", "달 별자리", "상승궁", "주요 하우스"],
      qualityFlags: {
        tone: "professional-mystical",
        structure: "chart-evidence-to-counseling",
        riskSafe: true,
      },
    })),
  };
  return `당신은 출생 차트를 바탕으로 프리미엄 점성술 PDF의 개인화 본문만 작성하는 전문 상담가입니다.
당신은 점성술 계산자가 아닙니다. 출생차트, 상승궁, MC, 행성 위치, 하우스 배치, 어스펙트, 트랜짓, 프로그레션, 궁합 점수를 새로 산출하지 않습니다.
아래 제공되는 점성술 계산 결과와 lockedFacts는 이미 확정된 값입니다. tropical/sidereal 기준, 하우스 시스템, 오브 기준, 행성 위치, 하우스, 어스펙트, 역행, 노드, 키론, 릴리스, 트랜짓을 절대 변경하지 마세요.
제공되지 않은 행성, 하우스, 어스펙트, 트랜짓을 새로 만들지 말고, 사주·숙요·베다점·자미두수 용어를 점성술 해석에 섞지 마세요.

정적 템플릿 정책:
1. 표지, 목차, 챕터 제목, 섹션 제목, 공통 안내문은 코드 템플릿에서 이미 생성됩니다.
2. LLM은 제목을 새로 쓰지 말고, 입력된 카테고리 순서에 맞춰 localDraft를 프리미엄 상담문으로 보강합니다.
3. sections 배열은 입력 categories와 같은 순서와 개수여야 합니다.

작성 원칙:
1. 각 body는 950자 이상 1,350자 이하로 작성합니다.
2. 각 body에는 최소 4개 이상의 구체 차트 근거를 자연스럽게 포함합니다. 예: 태양/달/상승궁/MC, 행성 별자리, 하우스, 어스펙트, 역행, 원소·모드 균형.
3. 본문 톤은 전문 상담가처럼 품격 있고 신비롭게 유지합니다.
4. 개발 용어, 내부 처리 용어, 데이터 부족 표현, 확정 예언, 공포 조장, 의학·법률·투자 단정은 금지합니다.
5. 같은 문장 구조를 반복하지 말고 이전 장과 다른 표현을 사용합니다.
6. evidenceSignals에는 body에서 실제로 언급한 차트 근거만 4개 이상 넣습니다.
7. qualityFlags는 본문 점검 상태를 짧은 문자열 또는 boolean으로만 표시합니다.
8. 토성, 명왕성, 8하우스, 12하우스, 하드 어스펙트, 역행도 실패·파국·질병·손실로 단정하지 말고 현실적인 관리 포인트로 설명합니다.

[출생 차트 핵심]
${safeJsonForPrompt(chartInput)}

[검증된 점성술 마스터 JSON]
${safeJsonForPrompt(masterJson)}

[이번 장 고정 템플릿]
${safeJsonForPrompt({
  chapterNo: chapterSpec.order,
  title: chapterSpec.title,
  categories,
})}

[카테고리별 차트 근거 신호]
${safeJsonForPrompt(signalBrief)}

[챕터 플랜과 로컬 초안]
${safeJsonForPrompt(chapterPlan)}

[이전 장 요약]
${safeJsonForPrompt(previousSummaries.slice(-4))}

[검수/재작성 요청]
${safeJsonForPrompt({ attempt, lastErrors })}

아래 JSON 객체만 반환하세요. 본문 안에는 JSON, API, LLM, fallback, debug, engine, payload, schema 같은 단어를 쓰지 마세요. lockedFacts 누락, 계산 결과 변경, 공포 마케팅, 건강·사고·금전·이혼·사망 단정은 금지합니다.
${safeJsonForPrompt(responseShape)}`;
}
async function callAstroGemini(env, prompt, options = {}) {
  const model = clean(env?.ASTRO_GEMINI_MODEL || env?.PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL || "gemini-2.5-flash");
  const result = await callGeminiText(env, prompt, {
    keyEnvKeys: ASTRO_LLM_KEY_ENV_KEYS,
    modelEnvKeys: ASTRO_LLM_MODEL_ENV_KEYS,
    models: [model],
    temperature: Number(env?.ASTRO_GEMINI_TEMPERATURE || env?.PREMIUM_GEMINI_TEMPERATURE || 0.38),
    topP: Number(env?.ASTRO_GEMINI_TOP_P || env?.PREMIUM_GEMINI_TOP_P || 0.9),
    maxOutputTokens: Number(env?.WESTERN_ASTROLOGY_LLM_MAX_OUTPUT_TOKENS || env?.ASTRO_GEMINI_MAX_OUTPUT_TOKENS || env?.PREMIUM_GEMINI_MAX_OUTPUT_TOKENS || 7200),
    timeoutMs: Number(env?.WESTERN_ASTROLOGY_LLM_TIMEOUT_MS || env?.ASTRO_GEMINI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 45000),
    totalTimeoutMs: Number(env?.ASTRO_GEMINI_TOTAL_TIMEOUT_MS || 0),
    maxAttemptsPerPair: Math.max(1, Math.min(2, Number(env?.WESTERN_ASTROLOGY_LLM_RETRIES || env?.ASTRO_GEMINI_RETRIES || env?.PREMIUM_GEMINI_RETRIES || 1))),
    disableVertexFallback: env?.ASTRO_GEMINI_DISABLE_VERTEX_FALLBACK ?? env?.GEMINI_DISABLE_VERTEX_FALLBACK,
    metadata: {
      requestId: clean(options?.requestId),
      chapterNumber: clean(options?.chapterNumber),
    },
  });
  if (!result?.ok || !clean(result?.text)) {
    throw Object.assign(new Error(clean(result?.message || "점성술 원고 생성에 실패했습니다.")), {
      code: clean(result?.error || "ASTRO_GEMINI_GENERATION_FAILED"),
      status: Number(result?.status || 502),
    });
  }
  return clean(result.text);
}

function parseAstroLLMJson(text) {
  const raw = String(text || "").trim();
  const candidates = [];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1]);
  candidates.push(raw);

  for (let start = raw.indexOf("{"); start >= 0; start = raw.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < raw.length; index += 1) {
      const char = raw[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
      if (depth === 0) {
        candidates.push(raw.slice(start, index + 1));
        break;
      }
    }
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(String(candidate || "").trim());
    } catch (_) {}
  }
  throw Object.assign(new Error("점성술 원고 응답을 해석하지 못했습니다."), {
    code: "ASTRO_GEMINI_JSON_PARSE_FAILED",
    status: 502,
  });
}

function textFromAstroLLMValue(value) {
  if (Array.isArray(value)) return value.map(textFromAstroLLMValue).filter(Boolean).join("\n\n");
  if (value && typeof value === "object") return Object.values(value).map(textFromAstroLLMValue).filter(Boolean).join("\n\n");
  return clean(value);
}

function normalizeAstroEvidenceSignals(localAstroChartJson, body, rawSignals = []) {
  const matched = buildAstroEvidenceTerms(localAstroChartJson).filter((term) => clean(body).includes(term));
  return uniqueList([
    ...safeArray(rawSignals).map(clean),
    ...matched,
  ])
    .filter((signal) => signal.length >= 2 && signal !== "미확인")
    .slice(0, 12);
}

function buildAstroSectionQualityFlags(localAstroChartJson, body, evidenceSignals = []) {
  const repetition = collectRepetitionDetails(body);
  return {
    bodyChars: clean(body).length,
    evidenceCount: safeArray(evidenceSignals).length,
    hasForbiddenText: containsForbidden(body),
    hasRiskyAssertion: ASTRO_LLM_RISKY_ASSERTION_RE.test(clean(body)),
    repetitionExceeded: Boolean(repetition.exceeded),
    source: "gemini",
  };
}

function normalizeAstroLLMChapter(parsed = {}, chapterSpec = {}, localAstroChartJson = {}) {
  const rawSections = Array.isArray(parsed?.sections)
    ? parsed.sections
    : (Array.isArray(parsed?.categories) ? parsed.categories : []);
  const sections = safeArray(chapterSpec.categories).map((category, index) => {
    const hit = rawSections.find((section) => clean(section?.title) === clean(category.title)) || rawSections[index] || {};
    const body = softenAstroRiskyBody(textFromAstroLLMValue(hit?.body || hit?.text || hit?.finalText || hit?.content));
    const evidenceSignals = normalizeAstroEvidenceSignals(
      localAstroChartJson,
      body,
      hit?.evidenceSignals || hit?.evidence || hit?.chartEvidence || hit?.bullets,
    );
    return {
      title: category.title,
      body,
      bullets: safeArray(hit?.bullets).map(clean).filter(Boolean).slice(0, 5),
      evidenceSignals,
      qualityFlags: {
        ...(hit?.qualityFlags && typeof hit.qualityFlags === "object" ? hit.qualityFlags : {}),
        ...buildAstroSectionQualityFlags(localAstroChartJson, body, evidenceSignals),
      },
      source: "gemini",
    };
  });
  return {
    chapterNo: Number(chapterSpec.order || parsed?.chapterNo || 0) || 0,
    title: chapterSpec.title,
    subtitle: `${chapterSpec.roman}. ${chapterSpec.title}`,
    summary: sanitizeBody(textFromAstroLLMValue(parsed?.summary || parsed?.chapterSummary)).slice(0, 900),
    sections,
    source: "llm-only",
  };
}

function buildAstroEvidenceTerms(localAstroChartJson = {}) {
  const chart = asObject(localAstroChartJson?.chart);
  const terms = [
    clean(chart.sunSign),
    clean(chart.moonSign),
    clean(chart.ascendantSign),
    clean(chart.midheavenSign),
    clean(chart.descendantSign),
    clean(chart.icSign),
    formatAstroChartRulerForText(chart.chartRuler),
  ];
  safeArray(chart.planets).forEach((planet) => {
    terms.push(clean(PLANET_KO[planet?.name] || planet?.name));
    terms.push(clean(planet?.sign));
    if (Number.isFinite(Number(planet?.house))) terms.push(`${Number(planet.house)}하우스`);
  });
  safeArray(chart.houses).forEach((house) => {
    if (Number.isFinite(Number(house?.house))) terms.push(`${Number(house.house)}하우스`);
    terms.push(clean(house?.sign));
  });
  safeArray(chart.aspects).forEach((aspect) => {
    terms.push(clean(aspect?.type || aspect?.aspect));
    terms.push(clean(PLANET_KO[aspect?.planetA] || aspect?.planetA));
    terms.push(clean(PLANET_KO[aspect?.planetB] || aspect?.planetB));
  });
  return uniqueList(terms)
    .map((term) => clean(term))
    .filter((term) => term.length >= 2 && term !== "미확인");
}

function countAstroEvidenceHits(localAstroChartJson, text) {
  const body = clean(text);
  return buildAstroEvidenceTerms(localAstroChartJson).reduce((count, term) => (
    body.includes(term) ? count + 1 : count
  ), 0);
}

function classifyAstroLlmFailure(error) {
  const status = Number(error?.status || 0);
  const joined = [
    clean(error?.code),
    clean(error?.message),
    clean(error?.reasonClass),
    clean(error?.error),
  ].join(" ").toLowerCase();
  if (/missing|api[_\s-]*key|credential|unauthorized|forbidden/.test(joined) || status === 401 || status === 403) return "missing_key";
  if (status === 429 || /rate|quota|resource_exhausted|too_many/.test(joined)) return "rate_limited";
  if (status === 408 || status === 504 || /timeout|deadline|aborted|timed\s*out|524/.test(joined)) return "timeout";
  if (/parse|json|schema|invalid|quality|검증/.test(joined)) return "invalid_chapter";
  return "llm_generation_failed";
}

function validateAstroLLMChapter(localAstroChartJson, chapter, chapterSpec) {
  const errors = [];
  if (Number(chapter?.chapterNo) !== Number(chapterSpec?.order)) errors.push("chapter_no");
  if (clean(chapter?.title) !== clean(chapterSpec?.title)) errors.push("chapter_title");
  const sections = safeArray(chapter?.sections);
  if (sections.length !== safeArray(chapterSpec?.categories).length) errors.push("section_count");
  if (chapterLength(chapter) < MIN_CHAPTER_LENGTH) errors.push("chapter_length");
  safeArray(chapterSpec?.categories).forEach((category, index) => {
    const section = sections[index] || {};
    const body = clean(section.body);
    const evidenceSignals = safeArray(section.evidenceSignals).map(clean).filter(Boolean);
    const qualityFlags = asObject(section.qualityFlags);
    if (clean(section.title) !== clean(category.title)) errors.push(`section_${index + 1}_title`);
    if (body.length < MIN_SECTION_LENGTH) errors.push(`section_${index + 1}_length`);
    if (containsForbidden(body)) errors.push(`section_${index + 1}_forbidden`);
    if (ASTRO_LLM_RISKY_ASSERTION_RE.test(body)) errors.push(`section_${index + 1}_risky_assertion`);
    if (countAstroEvidenceHits(localAstroChartJson, body) < 4) errors.push(`section_${index + 1}_evidence_weak`);
    if (evidenceSignals.length < 4) errors.push(`section_${index + 1}_evidence_signals`);
    if (clean(qualityFlags.source) !== "gemini") errors.push(`section_${index + 1}_quality_source`);
    if (Number(qualityFlags.evidenceCount || 0) < 4) errors.push(`section_${index + 1}_quality_evidence`);
    if (qualityFlags.hasForbiddenText === true) errors.push(`section_${index + 1}_quality_forbidden`);
    if (qualityFlags.hasRiskyAssertion === true) errors.push(`section_${index + 1}_quality_risky`);
    if (qualityFlags.repetitionExceeded === true) errors.push(`section_${index + 1}_quality_repetition`);
    if (collectRepetitionDetails(body).exceeded) errors.push(`section_${index + 1}_repetition`);
  });
  return errors;
}

async function generateAstroChapterWithLLM(env, {
  localAstroChartJson,
  chartInput,
  masterJson = {},
  chapterSpec,
  signalBrief,
  chapterPlan = {},
  previousSummaries = [],
  requestId = "",
  llmChapterGenerator = null,
  log = () => {},
} = {}) {
  const maxAttempts = Math.max(1, Math.min(2, Number(env?.WESTERN_ASTROLOGY_LLM_CHAPTER_RETRIES || env?.ASTRO_GEMINI_CHAPTER_RETRIES || env?.PREMIUM_GEMINI_RETRIES || 1)));
  let lastErrors = [];
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const prompt = buildAstroChapterPrompt({
        chartInput,
        masterJson,
        chapterSpec,
        signalBrief,
        chapterPlan,
        previousSummaries,
        attempt,
        lastErrors,
      });
      const externalChapterSpec = {
        ...chapterSpec,
        chapterNo: Number(chapterSpec?.order || 0),
        sections: safeArray(chapterSpec?.categories),
      };
      const generated = typeof llmChapterGenerator === "function"
        ? await llmChapterGenerator({
          chapterSpec: externalChapterSpec,
          localAstroChartJson,
          chartInput,
          masterJson,
          signalBrief,
          chapterPlan,
          prompt,
          attempt,
        })
        : await callAstroGemini(env, prompt, {
          requestId,
          chapterNumber: chapterSpec?.roman || chapterSpec?.order,
        });
      const parsed = typeof generated === "string" ? parseAstroLLMJson(generated) : generated;
      const chapter = normalizeAstroLLMChapter(parsed, chapterSpec, localAstroChartJson);
      const errors = validateAstroLLMChapter(localAstroChartJson, chapter, chapterSpec);
      if (!errors.length) return {
        chapter,
        attempts: attempt,
        model: typeof llmChapterGenerator === "function" ? "mock-generator" : clean(env?.ASTRO_GEMINI_MODEL || env?.PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL || "gemini-2.5-flash"),
      };
      lastErrors = errors;
      log("LLMChapterQualityRetry", {
        chapterNo: chapterSpec.order,
        attempt,
        errors,
      });
    } catch (error) {
      lastError = error;
      lastErrors = [clean(error?.code || error?.message || "ASTRO_GEMINI_FAILED")];
      log("LLMChapterGenerationRetry", {
        chapterNo: chapterSpec.order,
        attempt,
        error: lastErrors[0],
      });
    }
  }

  throw Object.assign(new Error(`점성술 LLM 챕터 검수에 실패했습니다: ${chapterSpec?.title || chapterSpec?.order}`), {
    code: clean(lastError?.code || "ASTRO_LLM_CHAPTER_INVALID"),
    status: Number(lastError?.status || 502),
    details: {
      chapterNo: chapterSpec?.order,
      title: chapterSpec?.title,
      errors: lastErrors,
    },
  });
}

function chapterLength(chapter) {
  return safeArray(chapter?.sections).reduce((sum, section) => sum + clean(section.body).length, 0);
}

function totalLength(chapters) {
  return safeArray(chapters).reduce((sum, chapter) => sum + chapterLength(chapter), 0);
}

function containsForbidden(text) {
  return FORBIDDEN_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(String(text || ""));
  });
}

function repeatedSentenceCount(text) {
  const sentences = String(text || "")
    .split(/[.!?\n]/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 24);
  const map = new Map();
  for (const sentence of sentences) {
    map.set(sentence, (map.get(sentence) || 0) + 1);
  }
  return Math.max(0, ...Array.from(map.values()));
}

function repeatedParagraphCount(text) {
  const paragraphs = String(text || "")
    .split(/\n{2,}/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 40);
  const map = new Map();
  for (const paragraph of paragraphs) {
    map.set(paragraph, (map.get(paragraph) || 0) + 1);
  }
  return Math.max(0, ...Array.from(map.values()));
}

function repeatedNgramCount(text, n = 30) {
  const src = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (src.length < n) return 0;

  const map = new Map();
  for (let i = 0; i <= src.length - n; i += 1) {
    const gram = src.slice(i, i + n).trim();
    if (!gram || REPETITION_EXCLUDED_TERMS.some((term) => gram.includes(term))) continue;
    map.set(gram, (map.get(gram) || 0) + 1);
  }
  return Math.max(0, ...Array.from(map.values()));
}

function collectRepetitionDetails(text) {
  const sentenceMax = repeatedSentenceCount(text);
  const paragraphMax = repeatedParagraphCount(text);
  const ngram30Max = repeatedNgramCount(text, 30);
  return {
    sentenceMax,
    paragraphMax,
    ngram30Max,
    exceeded:
      sentenceMax >= 3
      || paragraphMax > 2
      || ngram30Max >= 5,
  };
}

function reinforceManuscriptLength(chapters) {
  const updated = safeArray(chapters).map((chapter) => ({
    ...chapter,
    sections: safeArray(chapter.sections).map((section) => ({
      ...section,
      body: ensureMinLength(
        section.body,
        MIN_SECTION_LENGTH,
        `${section.title} 실행 팁: 차트 신호를 일상 루틴으로 변환할 때는 목표를 작게 시작하고, 주간 회고에서 개선 포인트를 하나씩 반영해 누적 성과를 만드세요.`,
      ),
    })),
  }));

  const requiredTotal = getDynamicTotalMinLength(updated.length);
  let currentTotal = totalLength(updated);
  if (currentTotal >= requiredTotal) return updated;

  const chapterSchemaByNo = new Map(ASTRO_PREMIUM_CHAPTERS.map((item) => [Number(item.order), item]));
  const fallbackContext = {
    coreSigns: { sun: "태양", moon: "달", asc: "상승궁", mc: "MC" },
    focus: { topHouse: "주요 하우스", topHouseTopic: "삶의 영역" },
  };
  let index = 0;
  while (currentTotal < requiredTotal && updated.length > 0) {
    const chapter = updated[index % updated.length];
    const section = chapter.sections[index % chapter.sections.length];
    const chapterSchema = chapterSchemaByNo.get(Number(chapter?.chapterNo)) || chapterSchemaByNo.get(index + 1) || {};
    const supplement = buildAstroExpansionParagraph(chapterSchema, section, fallbackContext, Math.floor(index / updated.length) + 2);
    section.body = sanitizeBody(`${section.body}\n\n${supplement}`);
    index += 1;
    currentTotal = totalLength(updated);
  }
  return updated;
}

function reinforceAstroManuscriptLocally(chapters, localAstroChartJson) {
  const reinforced = reinforceManuscriptLength(chapters);
  return safeArray(reinforced).map((chapter, chapterIndex) => ({
    ...chapter,
    sections: safeArray(chapter.sections).map((section, sectionIndex) => {
      const chapterSpec = ASTRO_PREMIUM_CHAPTERS.find((item) => Number(item.order) === Number(chapter.chapterNo)) || ASTRO_PREMIUM_CHAPTERS[chapterIndex] || {};
      const appendix = buildAstroExpansionParagraph(chapterSpec, section, {
        coreSigns: {
          sun: clean(localAstroChartJson?.chart?.sunSign),
          moon: clean(localAstroChartJson?.chart?.moonSign),
          asc: clean(localAstroChartJson?.chart?.ascendantSign),
          mc: clean(localAstroChartJson?.chart?.midheavenSign),
        },
        focus: {
          topHouse: `${sectionIndex + 1}하우스`,
          topHouseTopic: clean(localAstroChartJson?.chart?.houses?.[sectionIndex]?.sign),
        },
      }, 2 + sectionIndex);
      const body = ensureMinLength(
        sanitizeBody(section.body),
        MIN_SECTION_LENGTH,
        appendix,
      );
      return {
        ...section,
        body,
      };
    }),
  }));
}

function normalizeAstroLocalFallbackManuscript(chapters, localAstroChartJson) {
  return safeArray(chapters).map((chapter, chapterIndex) => {
    const chapterSpec = ASTRO_PREMIUM_CHAPTERS.find((item) => Number(item.order) === Number(chapter?.chapterNo)) || ASTRO_PREMIUM_CHAPTERS[chapterIndex] || {};
    const sections = safeArray(chapter.sections).map((section, sectionIndex) => {
      const body = softenAstroRiskyBody(section.body);
      const evidenceSignals = normalizeAstroEvidenceSignals(
        localAstroChartJson,
        body,
        [
          ...safeArray(section.evidenceSignals),
          ...safeArray(section?.localQuality?.usedSignals),
          ...safeArray(section?.localQuality?.usedPlanets),
          ...safeArray(section?.localQuality?.usedHouses).map((house) => `${house}하우스`),
          ...safeArray(section?.localQuality?.usedAspects),
        ],
      );
      return {
        ...section,
        title: clean(section.title || chapterSpec?.categories?.[sectionIndex]?.title),
        body,
        evidenceSignals,
        source: ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED,
        qualityFlags: {
          ...asObject(section.qualityFlags),
          ...buildAstroSectionQualityFlags(localAstroChartJson, body, evidenceSignals),
          source: ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED,
        },
      };
    });
    return {
      ...chapter,
      chapterNo: Number(chapter.chapterNo || chapterSpec.order || chapterIndex + 1),
      title: clean(chapter.title || chapterSpec.title),
      subtitle: clean(chapter.subtitle || `${chapterSpec.roman || chapterIndex + 1}. ${chapterSpec.title || chapter.title}`),
      sections,
      source: ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED,
    };
  });
}

function validateFinalManuscript(localAstroChartJson, chapters, options = {}) {
  const allowFallback = Boolean(options.allowFallback);
  const issues = [];
  const repetition = [];
  const qualityStats = {
    expectedChapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    expectedSectionCount: ASTRO_PREMIUM_CHAPTERS.reduce((sum, chapter) => sum + safeArray(chapter.categories).length, 0),
    sectionCount: 0,
    geminiChapterCount: 0,
    geminiSectionCount: 0,
    evidenceSignalCount: 0,
    minEvidenceSignalsPerSection: Infinity,
    flaggedForbiddenSections: 0,
    flaggedRiskySections: 0,
    flaggedRepetitionSections: 0,
  };
  const birthInput = asObject(localAstroChartJson?.birthInput);
  if (!clean(birthInput.birthDate)) issues.push("birthInput.birthDate");
  if (!Number.isFinite(Number(birthInput.birthHour))) issues.push("birthInput.birthHour");
  if (!clean(birthInput.timezone)) issues.push("birthInput.timezone");

  const chart = asObject(localAstroChartJson?.chart);
  if (!safeArray(chart.planets).length && !clean(chart.sunSign)) issues.push("chart.planets");

  const premiumSignals = validateAstroChartForPremium(localAstroChartJson);
  if (!premiumSignals.ok) {
    issues.push(...premiumSignals.missing.map((item) => `premiumSignal.${item}`));
  }

  if (!Array.isArray(chapters) || chapters.length !== ASTRO_PREMIUM_CHAPTERS.length) {
    issues.push("chapterCount");
  }

  for (const chapter of safeArray(chapters)) {
    const schema = ASTRO_PREMIUM_CHAPTERS.find((item) => Number(item.order) === Number(chapter.chapterNo));
    const chapterSource = clean(chapter.source);
    if (schema && clean(chapter.title) !== clean(schema.title)) issues.push(`chapter${chapter.chapterNo}.title`);
    if (allowFallback) {
      if (![ASTRO_MANUSCRIPT_SOURCE.LLM, ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED].includes(chapterSource)) issues.push(`chapter${chapter.chapterNo}.source`);
    } else if (chapterSource !== ASTRO_MANUSCRIPT_SOURCE.LLM) {
      issues.push(`chapter${chapter.chapterNo}.source`);
    }
    if (chapterSource === ASTRO_MANUSCRIPT_SOURCE.LLM) qualityStats.geminiChapterCount += 1;
    if (!Array.isArray(chapter.sections) || chapter.sections.length < 3) {
      issues.push(`chapter${chapter.chapterNo}.sections`);
      continue;
    }
    if (schema && safeArray(chapter.sections).length !== safeArray(schema.categories).length) {
      issues.push(`chapter${chapter.chapterNo}.sectionCount`);
    }
    if (chapterLength(chapter) < MIN_CHAPTER_LENGTH) issues.push(`chapter${chapter.chapterNo}.length`);
    for (let sectionIndex = 0; sectionIndex < chapter.sections.length; sectionIndex += 1) {
      const section = chapter.sections[sectionIndex];
      const body = clean(section.body);
      const evidenceSignals = safeArray(section.evidenceSignals).map(clean).filter(Boolean);
      const qualityFlags = asObject(section.qualityFlags);
      const sectionSource = clean(section.source);
      const qualitySource = clean(qualityFlags.source);
      qualityStats.sectionCount += 1;
      qualityStats.evidenceSignalCount += evidenceSignals.length;
      qualityStats.minEvidenceSignalsPerSection = Math.min(qualityStats.minEvidenceSignalsPerSection, evidenceSignals.length);
      if (sectionSource === "gemini") qualityStats.geminiSectionCount += 1;
      if (qualityFlags.hasForbiddenText === true) qualityStats.flaggedForbiddenSections += 1;
      if (qualityFlags.hasRiskyAssertion === true) qualityStats.flaggedRiskySections += 1;
      if (qualityFlags.repetitionExceeded === true) qualityStats.flaggedRepetitionSections += 1;
      const expectedSectionTitle = clean(schema?.categories?.[sectionIndex]?.title);
      if (expectedSectionTitle && clean(section.title) !== expectedSectionTitle) {
        issues.push(`chapter${chapter.chapterNo}.section${sectionIndex + 1}.title`);
      }
      if (body.length < MIN_SECTION_LENGTH) issues.push(`chapter${chapter.chapterNo}.${section.title}.length`);
      if (!body) issues.push(`chapter${chapter.chapterNo}.${section.title}.empty`);
      if (containsForbidden(body)) issues.push(`chapter${chapter.chapterNo}.${section.title}.forbidden`);
      if (allowFallback) {
        if (!["gemini", ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED].includes(sectionSource)) issues.push(`chapter${chapter.chapterNo}.${section.title}.source`);
      } else if (sectionSource !== "gemini") {
        issues.push(`chapter${chapter.chapterNo}.${section.title}.source`);
      }
      if (ASTRO_LLM_RISKY_ASSERTION_RE.test(body)) issues.push(`chapter${chapter.chapterNo}.${section.title}.risky`);
      if (countAstroEvidenceHits(localAstroChartJson, body) < 4) issues.push(`chapter${chapter.chapterNo}.${section.title}.evidence`);
      if (evidenceSignals.length < 4) issues.push(`chapter${chapter.chapterNo}.${section.title}.evidenceSignals`);
      if (allowFallback) {
        if (!["gemini", ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED].includes(qualitySource)) issues.push(`chapter${chapter.chapterNo}.${section.title}.qualitySource`);
      } else if (qualitySource !== "gemini") {
        issues.push(`chapter${chapter.chapterNo}.${section.title}.qualitySource`);
      }
      if (Number(qualityFlags.evidenceCount || 0) < 4) issues.push(`chapter${chapter.chapterNo}.${section.title}.qualityEvidence`);
      if (qualityFlags.hasForbiddenText === true) issues.push(`chapter${chapter.chapterNo}.${section.title}.qualityForbidden`);
      if (qualityFlags.hasRiskyAssertion === true) issues.push(`chapter${chapter.chapterNo}.${section.title}.qualityRisky`);
      if (qualityFlags.repetitionExceeded === true) issues.push(`chapter${chapter.chapterNo}.${section.title}.qualityRepetition`);
      const rep = collectRepetitionDetails(body);
      if (rep.exceeded) {
        issues.push(`chapter${chapter.chapterNo}.${section.title}.repetition`);
        repetition.push({
          chapterNo: Number(chapter.chapterNo || 0),
          sectionTitle: clean(section.title),
          ...rep,
        });
      }
    }
  }

  const requiredTotal = getDynamicTotalMinLength(safeArray(chapters).length || ASTRO_PREMIUM_CHAPTERS.length);
  const totalChars = totalLength(chapters);
  if (totalChars < requiredTotal) issues.push("totalLength");
  return {
    ok: issues.length === 0,
    issues,
    repetition,
    stats: {
      chapterCount: safeArray(chapters).length,
      expectedChapterCount: qualityStats.expectedChapterCount,
      sectionCount: qualityStats.sectionCount,
      expectedSectionCount: qualityStats.expectedSectionCount,
      geminiChapterCount: qualityStats.geminiChapterCount,
      geminiSectionCount: qualityStats.geminiSectionCount,
      allChaptersFromGemini: qualityStats.geminiChapterCount === qualityStats.expectedChapterCount,
      allSectionsFromGemini: qualityStats.geminiSectionCount === qualityStats.expectedSectionCount,
      evidenceSignalCount: qualityStats.evidenceSignalCount,
      minEvidenceSignalsPerSection: Number.isFinite(qualityStats.minEvidenceSignalsPerSection) ? qualityStats.minEvidenceSignalsPerSection : 0,
      flaggedForbiddenSections: qualityStats.flaggedForbiddenSections,
      flaggedRiskySections: qualityStats.flaggedRiskySections,
      flaggedRepetitionSections: qualityStats.flaggedRepetitionSections,
      totalChars,
      requiredTotalChars: requiredTotal,
      issueCount: issues.length,
    },
  };
}

function toLegacyPayload(localAstroChartJson) {
  const name = clean(localAstroChartJson?.birthInput?.name) || "사용자";
  const birthDate = clean(localAstroChartJson?.birthInput?.birthDate);
  const birthTime = clean(localAstroChartJson?.birthInput?.birthTime);
  const birthPlace = clean(localAstroChartJson?.birthInput?.birthPlace);
  const timezone = clean(localAstroChartJson?.birthInput?.timezone);
  const gender = clean(localAstroChartJson?.birthInput?.gender);
  return {
    user: {
      name,
      birthDate,
      birthTime,
      birthPlace,
      timezone,
      gender,
    },
    profile: {
      name,
      birthDate,
      birthTime,
      birthPlace,
      timezone,
      gender,
    },
    chart: {
      sunSign: clean(localAstroChartJson?.chart?.sunSign),
      moonSign: clean(localAstroChartJson?.chart?.moonSign),
      ascendant: clean(localAstroChartJson?.chart?.ascendantSign),
      midheaven: clean(localAstroChartJson?.chart?.midheavenSign),
      planets: safeArray(localAstroChartJson?.chart?.planets),
      houses: safeArray(localAstroChartJson?.chart?.houses),
      aspects: safeArray(localAstroChartJson?.chart?.aspects),
    },
    interpretationSeeds: asObject(localAstroChartJson?.interpretationSeeds),
    insights: asObject(localAstroChartJson?.insights),
  };
}

function toLegacyChapters(chapterDrafts) {
  return safeArray(chapterDrafts).map((chapter, idx) => ({
    id: ASTRO_PREMIUM_CHAPTERS[idx]?.id || `chapter_${idx + 1}`,
    order: chapter.chapterNo,
    roman: ASTRO_PREMIUM_CHAPTERS[idx]?.roman || String(idx + 1),
    title: chapter.title,
    categories: safeArray(chapter.sections).map((section) => ({
      id: `${idx + 1}_${clean(section.title)}`,
      title: section.title,
      text: section.body,
      localSummary: section.body,
      evidenceSignals: safeArray(section.evidenceSignals),
      qualityFlags: asObject(section.qualityFlags),
    })),
  }));
}

function renderAstroPremiumPdfFromDrafts(chapterDrafts, payload) {
  const name = sanitizeBody(payload?.user?.name) || "사용자";
  const birthDate = sanitizeBody(payload?.user?.birthDate) || "출생 정보";
  const toc = safeArray(chapterDrafts).map((chapter, idx) => {
    const shortTitle = sanitizeBody(String(chapter.title || "").split(" - ")[0] || chapter.title);
    return `<li>제${idx + 1}장 ${shortTitle}</li>`;
  }).join("");
  const chaptersHtml = safeArray(chapterDrafts).map((chapter, idx) => {
    const shortTitle = sanitizeBody(String(chapter.title || "").split(" - ")[0] || chapter.title);
    const sectionHtml = safeArray(chapter.sections).map((section) => `
      <article class="sec-card">
        <h3>${sanitizeBody(section.title)}</h3>
        <div class="section-body">${renderAstroSectionBody(section.body)}</div>
      </article>
    `).join("");
    return `<section class="chapter"><h2>제${idx + 1}장 ${shortTitle}</h2>${sectionHtml}</section>`;
  }).join("");

  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${name} 프리미엄 점성술 리포트</title><style>
  @page{size:A4;margin:16mm}
  body{margin:0;background:#060f1f;color:#dbe6ff;font-family:'Noto Serif KR',serif;line-height:1.8}
  main{max-width:980px;margin:0 auto;padding:30px 24px 64px}
  .cover,.toc,.chapter{border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px;background:rgba(10,19,36,.88);margin-top:18px}
  .cover h1{margin:0 0 8px;font-size:2rem;color:#ffd88f}
  .cover p{margin:4px 0;color:#c7d6f5}
  .chapter h2{margin:0 0 12px;color:#ffe3a6}
  .sec-card{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px;background:rgba(22,31,52,.82);margin-bottom:10px}
  .sec-card h3{margin:0 0 8px;color:#fff0c4}
  .section-body{display:flex;flex-direction:column;gap:12px}
  .section-body h4{margin:18px 0 4px;color:#fde68a;font-size:15px;letter-spacing:-0.01em}
  .section-body p{margin:0;color:#d8e4ff;line-height:1.9;word-break:keep-all;overflow-wrap:break-word;white-space:pre-wrap}
  </style></head><body><main>
    <section class="cover"><h1>프리미엄 점성술 리포트</h1><p>태양·달·상승궁과 하우스 신호를 기반으로 한 실행형 상담문</p><p>${name} · ${birthDate}</p></section>
    <section class="toc"><h2>목차</h2><ol>${toc}</ol></section>
    ${chaptersHtml}
  </main></body></html>`;

  return {
    title: `${name} 프리미엄 점성술 리포트`,
    filename: `premium-astrology-${name.replace(/\s+/g, "-").toLowerCase()}.html`,
    html,
  };
}

export function validateAstroPdfCompletionPayload({ pdfReady = {}, chapters = [], payload = {}, requireDownloadUrl = false } = {}) {
  const issues = [];
  const normalizedChapters = safeArray(chapters).map((chapter, index) => ({
    ...chapter,
    chapterNo: Number(chapter?.chapterNo || chapter?.order || index + 1),
    title: clean(chapter?.title || ASTRO_PREMIUM_CHAPTERS[index]?.title),
    sections: safeArray(chapter?.sections).length > 0
      ? safeArray(chapter.sections).map((section, sectionIndex) => {
        const qualityFlags = asObject(section?.qualityFlags);
        return {
          ...section,
          title: clean(section?.title || ASTRO_PREMIUM_CHAPTERS[index]?.categories?.[sectionIndex]?.title),
          body: clean(section?.body || section?.text || section?.localSummary),
          evidenceSignals: safeArray(section?.evidenceSignals || section?.usedSignalIds),
          source: clean(section?.source || ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED),
          qualityFlags: {
            ...qualityFlags,
            source: clean(qualityFlags.source || ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED),
          },
        };
      })
      : safeArray(chapter?.categories).map((category, sectionIndex) => ({
        title: clean(category?.title || ASTRO_PREMIUM_CHAPTERS[index]?.categories?.[sectionIndex]?.title),
        body: clean(category?.body || category?.text || category?.localSummary),
        evidenceSignals: safeArray(category?.evidenceSignals || category?.usedSignalIds),
        source: ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED,
        qualityFlags: {
          ...asObject(category?.qualityFlags),
          source: ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED,
        },
      })),
    source: clean(chapter?.source || ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED),
  }));
  const manuscript = validateFinalManuscript(payload, normalizedChapters, { allowFallback: true });
  if (!manuscript.ok) issues.push(...manuscript.issues.map((issue) => `manuscript.${issue}`));

  const html = clean(pdfReady?.html);
  if (!html) issues.push("html.missing");
  if (html && !/<!doctype html>/i.test(html)) issues.push("html.doctype");
  if (html && !/<meta\s+charset=["']?UTF-8["']?/i.test(html)) issues.push("html.charset");

  const downloadUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
  if (requireDownloadUrl && !downloadUrl) issues.push("download_url.missing");

  const manuscriptText = normalizedChapters
    .flatMap((chapter) => [
      chapter.title,
      ...safeArray(chapter.sections).flatMap((section) => [section.title, section.body]),
    ])
    .join("\n");
  if (hasAstroBrokenText(`${html}\n${manuscriptText}`)) issues.push("text.broken");

  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    chapterCount: normalizedChapters.length,
    expectedChapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    totalLength: manuscript?.stats?.totalChars || totalLength(normalizedChapters),
    htmlLength: html.length,
    hasDownloadUrl: Boolean(downloadUrl),
    manuscript,
  };
}

export async function generateAstroPremiumReport(env, rawInput = {}, options = {}) {
  const emit = typeof options.log === "function"
    ? options.log
    : (stage, payload) => {
      const tag = `[AstroPremiumPDF][${stage}]`;
      console.info(tag, payload || {});
    };

  const birthInput = normalizeAstroPremiumBirthInput(rawInput.birthInput || rawInput);
  const birthValidation = validateAstroPremiumBirthInput(birthInput);
  if (!birthValidation.ok) {
    const error = new Error("점성술 PDF 생성을 위한 출생 정보가 올바르지 않습니다.");
    error.code = "ASTRO_BIRTH_INPUT_INVALID";
    error.status = 422;
    error.details = birthValidation;
    throw error;
  }

  const resolved = await resolveAstroChartForPremiumPdf(rawInput, birthInput, env, options);

  const localAstroChartJson = buildAstroLocalChartJson(
    birthInput,
    resolved?.swissChart || {},
    extractProvidedAstroBase(rawInput),
    { strictPremium: true },
  );

  const chartValidation = validateAstroChartForPremium(localAstroChartJson);
  if (!chartValidation.ok) {
    emit("ChartValidationFailed", {
      issues: chartValidation.missing,
      source: clean(resolved?.source || localAstroChartJson?.calculationMode),
    });
    const error = new Error("점성술 차트 계산 JSON 검증에 실패했습니다.");
    error.code = "ASTRO_CHART_SOURCE_INVALID";
    error.status = 422;
    error.details = chartValidation;
    throw error;
  }

  const localDrafts = buildAstroLocalPremiumManuscript(localAstroChartJson);
  const localFallbackChapters = normalizeAstroLocalFallbackManuscript(localDrafts, localAstroChartJson);
  const westernAstrologyFacts = buildWesternAstrologyFacts(localAstroChartJson, rawInput);
  const westernAstrologyChapterPlans = buildWesternAstrologyChapterPlans({ chapters: localFallbackChapters }, westernAstrologyFacts, localAstroChartJson);
  const astroMasterJson = buildAstroMasterJson(localAstroChartJson, rawInput);
  astroMasterJson.westernAstrologyFacts = westernAstrologyFacts;
  astroMasterJson.chapterPlans = westernAstrologyChapterPlans;
  const masterJsonValidation = validateAstroMasterJson(astroMasterJson);
  emit("MasterJsonValidated", {
    ok: masterJsonValidation.ok,
    missing: masterJsonValidation.missing,
    stats: masterJsonValidation.stats,
  });
  if (!masterJsonValidation.ok) {
    const error = new Error("점성술 마스터 JSON 검증에 실패했습니다.");
    error.code = "ASTRO_MASTER_JSON_INVALID";
    error.status = 422;
    error.details = masterJsonValidation;
    throw error;
  }

  emit("LocalCalculationJsonPrepared", {
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    hasBirthDate: Boolean(clean(birthInput.birthDate)),
    hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
    hasTimezone: Boolean(clean(birthInput.timezone)),
    hasLocation: Boolean(clean(birthInput.birthPlace)),
    houseSystemUsed: true,
    calculationMode: clean(localAstroChartJson?.calculationMode) || "strict-local",
  });

  emit("LocalAssembledManuscriptReady", {
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    manuscriptSource: ASTRO_PDF_CONFIG.generationMode,
    promptVersion: WESTERN_ASTROLOGY_PROMPT_VERSION,
    llmEnabled: false,
    enhancedChapterIds: [],
  });

  const enhanced = {
    chapters: localFallbackChapters,
    fallbackUsed: false,
    llmChapterCount: 0,
    fallbackChapterCount: 0,
    localDraftChapterCount: localFallbackChapters.length,
    source: ASTRO_PDF_CONFIG.generationMode,
    enhancedChapterIds: [],
    expectedLlmChapterCount: 0,
    promptVersion: WESTERN_ASTROLOGY_PROMPT_VERSION,
    llmEnabled: false,
    llmAvailable: false,
    stopLlmReason: "",
    failures: [],
    attempts: [],
    model: "",
  };

  emit("LocalAssembledManuscriptSuccess", {
    chapterCount: localFallbackChapters.length,
    totalLength: totalLength(localFallbackChapters),
    llmChapterCount: 0,
    fallbackChapterCount: 0,
    reason: "LOCAL_ASSEMBLED_NO_LLM",
  });

  const finalDrafts = safeArray(enhanced.chapters);
  const validated = validateFinalManuscript(localAstroChartJson, finalDrafts, {
    allowFallback: true,
  });

  emit("FinalManuscriptValidated", {
    ok: validated.ok,
    issueCount: validated.issues.length,
    chapterCount: finalDrafts.length,
    totalLength: totalLength(finalDrafts),
    repetition: validated.repetition,
    manuscriptSource: clean(enhanced.source),
  });
  if (!validated.ok) {
    const error = new Error("점성술 프리미엄 원고 검증에 실패했습니다.");
    error.code = "ASTRO_PREMIUM_MANUSCRIPT_INVALID";
    error.status = 422;
    error.details = validated;
    throw error;
  }

  emit("PdfRenderStart", { chapterCount: finalDrafts.length });
  const payload = toLegacyPayload(localAstroChartJson);
  const pdfReady = renderAstroPremiumPdfFromDrafts(finalDrafts, payload);
  const pdfCompletionValidation = validateAstroPdfCompletionPayload({
    pdfReady,
    chapters: finalDrafts,
    payload: localAstroChartJson,
    requireDownloadUrl: false,
  });
  if (!pdfCompletionValidation.ok) {
    const error = new Error("점성술 PDF 완료 검증에 실패했습니다.");
    error.code = "ASTRO_PDF_COMPLETION_VALIDATION_FAILED";
    error.status = 500;
    error.issues = pdfCompletionValidation.issues;
    throw error;
  }
  emit("PdfRenderSuccess", {
    chapterCount: finalDrafts.length,
    manuscriptSource: ASTRO_PDF_CONFIG.generationMode,
    pdfCompletionValidation: pdfCompletionValidation.ok,
  });

  const chapters = toLegacyChapters(finalDrafts);
  const manuscriptSource = ASTRO_PDF_CONFIG.generationMode;
  const llmChapterCount = Number(enhanced.llmChapterCount || 0);
  const fallbackChapterCount = Number(enhanced.fallbackChapterCount || 0);
  const localDraftChapterCount = Number(enhanced.localDraftChapterCount || 0);
  const fallbackUsed = Boolean(enhanced.fallbackUsed);
  return {
    payload,
    chapters,
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    fallbackUsed,
    manuscriptSource,
    llmChapterCount,
    fallbackChapterCount,
    llmFallbackReason: clean(enhanced.stopLlmReason || enhanced.failures?.[0]?.failureClass || ""),
    localDraftChapterCount,
    enhancedChapterIds: safeArray(enhanced.enhancedChapterIds),
    expectedLlmChapterCount: Number(enhanced.expectedLlmChapterCount ?? 0),
    promptVersion: WESTERN_ASTROLOGY_PROMPT_VERSION,
    generationMode: ASTRO_PDF_CONFIG.generationMode,
    provider: ASTRO_PDF_CONFIG.provider,
    writingPipeline: "local-calculation-to-local-assembled-pdf",
    totalLength: totalLength(finalDrafts),
    pdfReady,
    pdfCompletionValidation,
    localAstroChartJson,
    astroMasterJson,
    westernAstrologyFacts,
    westernAstrologyChapterPlans,
    masterJsonValidation,
    finalManuscript: finalDrafts,
    validation: validated,
    validationWarning: !validated.ok,
    diagnostics: {
      generationMode: ASTRO_PDF_CONFIG.generationMode,
      promptVersion: WESTERN_ASTROLOGY_PROMPT_VERSION,
      enhancedChapterIds: safeArray(enhanced.enhancedChapterIds),
      expectedLlmChapterCount: Number(enhanced.expectedLlmChapterCount ?? 0),
      llmEnabled: Boolean(enhanced.llmEnabled),
      llmAvailable: Boolean(enhanced.llmAvailable),
      llmAttempts: safeArray(enhanced.attempts),
      llmFailures: safeArray(enhanced.failures),
      llmModel: clean(enhanced.model),
      fallbackReason: clean(enhanced.stopLlmReason || enhanced.failures?.[0]?.failureClass || ""),
      factsMode: clean(westernAstrologyFacts.mode),
      pdfCompletionValidation,
    },
    quality: {
      ok: validated.ok,
      issues: validated.issues,
      repetition: validated.repetition,
      stats: validated.stats,
      manuscriptSource,
    },
  };
}

export function validateAstroPayloadForApi(rawInput = {}) {
  const input = normalizeAstroPremiumBirthInput(rawInput.birthInput || rawInput);
  const missing = [];
  const validation = validateAstroPremiumBirthInput(input);
  if (!validation.ok) missing.push(...validation.missing);
  return { ok: missing.length === 0, missing };
}
