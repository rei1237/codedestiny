import { ASTRO_PREMIUM_CATEGORY_RULES, ASTRO_PREMIUM_CHAPTERS, sanitizeAstroPremiumText } from "./astro-premium-chapters.js";

const MIN_SECTION_LENGTH = 900;
const MIN_CHAPTER_LENGTH = 4000;
const MIN_TOTAL_LENGTH_FLOOR = 50000;
const ASTRO_MASTER_JSON_SCHEMA_VERSION = "astro-premium-master-json.v1";
export const ASTRO_PDF_CONFIG = Object.freeze({
  generationMode: "local-assembled",
  provider: "western-astrology-local-assembler",
  templateVersion: "western-astrology-local-assembled-v2",
});
export const WESTERN_ASTROLOGY_ASSEMBLY_VERSION = ASTRO_PDF_CONFIG.templateVersion;
const ASTRO_MANUSCRIPT_SOURCE = Object.freeze({
  LOCAL_COMPLETED: "local-rule-completed",
});
const ASTRO_RISKY_ASSERTION_RE = /(반드시\s*(결혼|이혼|성공|실패|큰돈|수익|파산|이별)|100\s*%\s*(보장|확정|성공|수익|적중)|확정|무조건|결혼하면\s*불행|질병을\s*얻게|암에\s*걸|우울증|공황장애|투자\s*수익|수익\s*보장|대박|파산|죽음|사망|직장을\s*잃|큰\s*사고|병에\s*걸|돈을\s*잃|평생\s*외롭|운명.*나쁘|차트.*나쁘)/i;
const FORBIDDEN_PATTERNS = [
  /자동\s*복구\s*생성/gi,
  /fallback/gi,
  /\bapi\b/gi,
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
const PREMIUM_SWISS_CHART_SOURCES = new Set(["swiss-wasm-local", "external-swiss-api"]);
const PREMIUM_TRANSIT_SOURCE = "western-transit-swiss";
const REPETITION_EXCLUDED_TERMS = ["태양", "달", "상승궁", "하우스", "행성", "어스펙트", "차트", "점성술", "MC", "수성", "금성", "화성", "목성", "토성", "천왕성", "해왕성", "명왕성", "허용 오차", "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const ASTRO_SECTION_HEADINGS = [
  "핵심 진단",
  "차트 근거",
  "현실에서 드러나는 모습",
  "장점",
  "주의점",
  "상담사의 조언",
  "실천 과제",
];
const GENERIC_ASTRO_COPY_PATTERNS = [
  /같은\s*차트\s*안에서도/i,
  /막연한\s*운세가\s*아니라/i,
  /한\s*번에\s*인생\s*전체를\s*바꾸려\s*하지\s*말고/i,
  /이\s*주제의\s*동기와\s*표현\s*방식/i,
  /그\s*힘이\s*실제\s*생활에서\s*작동하는\s*무대/i,
  /별도로\s*다루어져야\s*하는\s*이유/i,
  /중심으로\s*읽습니다/i,
  /제\s*\d+\s*장.+의.+은.+을\s*중심으로/i,
  /첫\s*판단은\s*성격\s*묘사가\s*아니라/i,
  /상담\s*질문으로\s*구체화하는\s*데\s*있습니다/i,
  /내적\s*동기로,\s*.*생활의\s*무대로,\s*.*조절해야\s*할\s*압력으로/i,
  /앞으로\s*7일\s*동안/i,
  /흐릿한\s*예언이\s*아니라/i,
];
const ASPECT_TYPE_LABELS = Object.freeze({
  conjunction: "합",
  sextile: "육각",
  square: "사각",
  trine: "삼각",
  opposition: "충",
});
const TIMING_TRANSIT_PLANETS = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const TIMING_NATAL_TARGETS = ["Sun", "Moon", "Venus", "Mars", "Jupiter", "Saturn"];

const SIGN_NAMES = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];

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
  Sun: "태양",
  Moon: "달",
  Mercury: "수성",
  Venus: "금성",
  Mars: "화성",
  Jupiter: "목성",
  Saturn: "토성",
  Uranus: "천왕성",
  Neptune: "해왕성",
  Pluto: "명왕성",
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

function pickFirstPresent(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && (value === 0 || clean(value))) return value;
  }
  return undefined;
}

function parseTimezoneOffsetLiteral(value) {
  if (value === 0) return 0;
  const raw = clean(value);
  if (!raw) return NaN;

  const direct = Number(raw);
  if (Number.isFinite(direct)) return direct;

  const lower = raw.toLowerCase();
  const aliases = {
    "asia/seoul": 9,
    "asia/jeju": 9,
    kst: 9,
    "korea standard time": 9,
    "korean standard time": 9,
    "asia/tokyo": 9,
    jst: 9,
    utc: 0,
    gmt: 0,
    z: 0,
    zulu: 0,
  };
  if (Object.prototype.hasOwnProperty.call(aliases, lower)) return aliases[lower];

  const match = raw.match(/^(?:utc|gmt)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return NaN;

  const hour = Number(match[2]);
  const minute = Number(match[3] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
  return (match[1] === "-" ? -1 : 1) * (hour + minute / 60);
}

function resolveIanaTimezoneOffsetHours(timezone, input = {}) {
  const raw = clean(timezone);
  if (!raw || !raw.includes("/")) return NaN;
  try {
    const year = Number(input.birthYear || input.year);
    const month = Number(input.birthMonth || input.month);
    const day = Number(input.birthDay || input.day);
    const hour = Number(input.birthHour || input.hour || 0);
    const minute = Number(input.birthMinute || input.minute || 0);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return NaN;
    const date = new Date(Date.UTC(year, month - 1, day, Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0));
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: raw,
      timeZoneName: "shortOffset",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const offsetName = clean(parts.find((part) => part.type === "timeZoneName")?.value);
    return parseTimezoneOffsetLiteral(offsetName);
  } catch (_) {
    return NaN;
  }
}

function normalizeTimezoneOffsetHours(value, input = {}) {
  const literal = parseTimezoneOffsetLiteral(value);
  if (Number.isFinite(literal)) return literal;
  return resolveIanaTimezoneOffsetHours(value, input);
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

  const timezoneSource = pickFirstPresent(body.timezone, body.tz, location.timezone, location.tz, user.timezone);
  const timezoneOffsetSource = pickFirstPresent(
    body.timezoneOffsetHours,
    body.timezoneOffset,
    body.utcOffset,
    body.tzOffset,
    location.timezoneOffsetHours,
    location.timezoneOffset,
    location.utcOffset,
    location.tzOffset,
    user.timezoneOffsetHours,
    user.timezoneOffset,
    user.tzOffset,
  );
  const timezone = (timezoneSource === 0 ? "0" : clean(timezoneSource)) || (timezoneOffsetSource === 0 ? "0" : clean(timezoneOffsetSource));
  const timezoneOffsetHours = normalizeTimezoneOffsetHours(timezoneOffsetSource !== undefined ? timezoneOffsetSource : timezone, {
    birthYear: dateParts.birthYear,
    birthMonth: dateParts.birthMonth,
    birthDay: dateParts.birthDay,
    birthHour: timeParts.birthHour,
    birthMinute: timeParts.birthMinute,
  });
  const bodyLocationText = typeof body.location === "string" ? body.location : undefined;
  const userLocationText = typeof user.location === "string" ? user.location : undefined;
  const birthPlace = clean(pickFirst(body.birthPlace, body.place, body.locationName, location.label, location.name, user.birthPlace, bodyLocationText, userLocationText));
  const latitude = parseNum(pickFirstPresent(body.latitude, body.lat, location.lat, location.latitude), NaN);
  const longitude = parseNum(pickFirstPresent(body.longitude, body.lng, body.lon, location.lon, location.lng, location.longitude), NaN);

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
    timezone: timezone || undefined,
    timezoneOffsetHours: Number.isFinite(timezoneOffsetHours) ? timezoneOffsetHours : undefined,
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
  if (!Number.isFinite(Number(input?.timezoneOffsetHours))) missing.push("timezoneOffsetHours");
  if (!clean(input?.birthPlace)) missing.push("birthPlace");
  if (!Number.isFinite(Number(input?.latitude)) || Number(input?.latitude) < -90 || Number(input?.latitude) > 90) missing.push("latitude");
  if (!Number.isFinite(Number(input?.longitude)) || Number(input?.longitude) < -180 || Number(input?.longitude) > 180) missing.push("longitude");
  return { ok: missing.length === 0, missing };
}

export function toSwissChartInputFromBirthInput(input = {}) {
  const timezone = clean(input.timezone);
  const tzNumeric = Number.isFinite(Number(input.timezoneOffsetHours))
    ? Number(input.timezoneOffsetHours)
    : normalizeTimezoneOffsetHours(timezone, input);
  return {
    year: Number(input.birthYear),
    month: Number(input.birthMonth),
    day: Number(input.birthDay),
    hour: Number(input.birthHour),
    minute: Number(input.birthMinute || 0),
    timezone: tzNumeric,
    lat: Number(input.latitude),
    lon: Number(input.longitude),
  };
}

function normalizeSwissChartForPdf(chart = {}) {
  if (!chart || typeof chart !== "object") return {};
  return chart?.chart && typeof chart.chart === "object" ? chart.chart : chart;
}

function getAstroCalculationSource(chart = {}) {
  const source = normalizeSwissChartForPdf(chart);
  return clean(source.source || source.chartSource || source.calculationSource || source.calculationMode);
}

function isPremiumSwissAstroChart(chart) {
  const source = normalizeSwissChartForPdf(chart);
  const chartSource = getAstroCalculationSource(source);
  const engineQuality = clean(source.engineQuality).toLowerCase();
  const houseSystem = clean(source.houseSystem).toLowerCase();
  return hasUsableSwissAstroChart(source)
    && PREMIUM_SWISS_CHART_SOURCES.has(chartSource)
    && source.fallbackUsed !== true
    && engineQuality !== "fallback"
    && (!houseSystem || houseSystem === "placidus");
}

function buildAstroCalculationQuality(chart = {}, resolvedSource = "") {
  const source = normalizeSwissChartForPdf(chart);
  const chartSource = getAstroCalculationSource(source);
  const houseSystem = clean(source.houseSystem || "placidus").toLowerCase();
  const engineQuality = clean(source.engineQuality || (PREMIUM_SWISS_CHART_SOURCES.has(chartSource) ? "swiss" : ""));
  const fallbackUsed = source.fallbackUsed === true || engineQuality.toLowerCase() === "fallback" || /fallback/i.test(chartSource);
  const premiumSwiss = isPremiumSwissAstroChart(source);
  return {
    ok: premiumSwiss,
    source: clean(resolvedSource || chartSource),
    chartSource,
    engineQuality,
    houseSystem,
    fallbackUsed,
  };
}

function createAstroSwissRequiredError(message = "Swiss ephemeris calculation is required for premium astrology PDF generation.") {
  const error = new Error(message);
  error.code = "ASTRO_SWISS_ENGINE_UNAVAILABLE";
  error.status = 503;
  return error;
}

function normalizeAstroPlanetMap(planets) {
  if (Array.isArray(planets)) {
    return planets.reduce((out, planet) => {
      const name = clean(planet?.name || planet?.planet || planet?.id);
      if (name) out[name] = planet;
      return out;
    }, {});
  }
  return asObject(planets);
}

function hasAstroPlanet(planets, name) {
  const expected = clean(name).toLowerCase();
  if (!expected) return false;
  return Object.keys(planets || {}).some((key) => {
    const node = planets[key];
    return clean(key).toLowerCase() === expected
      || clean(node?.name || node?.planet || node?.id).toLowerCase() === expected;
  });
}

export function hasUsableSwissAstroChart(chart) {
  if (!chart || typeof chart !== "object") return false;

  const source = chart?.chart && typeof chart.chart === "object" ? chart.chart : chart;
  const planets = normalizeAstroPlanetMap(source.planets);

  const planetKeys = Object.keys(planets);
  const hasCorePlanets = PREMIUM_REQUIRED_PLANETS
    .every((name) => hasAstroPlanet(planets, name));

  const hasAsc = Boolean(source.ascendant || source.ascendantSign || source.asc || source?.chart?.ascendant);
  const hasMc = Boolean(source.midheaven || source.midheavenSign || source.mc || source?.chart?.midheaven);
  const hasHouses = Array.isArray(source.houseCusps)
    ? source.houseCusps.length >= 12
    : Array.isArray(source.houses)
      ? source.houses.length >= 12
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
  if (provided && isPremiumSwissAstroChart(provided)) {
    const normalizedProvided = normalizeSwissChartForPdf(provided);
    return {
      source: "provided-swiss",
      swissChart: normalizedProvided,
      calculationQuality: buildAstroCalculationQuality(normalizedProvided, "provided-swiss"),
    };
  }

  try {
    const { getSwissWesternChart } = await import("./swiss-ephemeris.js");
    const calculated = await getSwissWesternChart(env, toSwissChartInputFromBirthInput(birthInput), {
      requestUrl: options?.requestUrl,
      strictSwiss: true,
      allowFallback: false,
      premium: true,
    });
    if (isPremiumSwissAstroChart(calculated)) {
      const normalizedCalculated = normalizeSwissChartForPdf(calculated);
      return {
        source: getAstroCalculationSource(normalizedCalculated) || "server-swiss",
        swissChart: normalizedCalculated,
        calculationQuality: buildAstroCalculationQuality(normalizedCalculated),
      };
    }
    throw createAstroSwissRequiredError("Premium astrology PDF requires a verified Swiss ephemeris chart source.");
  }
  catch (error) {
    console.warn("[AstroPremiumPDF][SwissCalculationFailed]", {
      reason: clean(error?.message || error),
    });
    if (error?.code === "ASTRO_SWISS_ENGINE_UNAVAILABLE") throw error;
    throw createAstroSwissRequiredError();
  }
}

function signNameFromNode(node) {
  if (!node) return "";
  if (typeof node !== "object") return clean(node);
  return clean(node.signKo || node.signName || node.sign || node.name);
}

function strengthLabel(orb) {
  const n = Number(orb);
  if (!Number.isFinite(n)) return "medium";
  if (n <= 2.5) return "strong";
  if (n <= 5) return "medium";
  return "weak";
}

function aspectTightnessLabel(orb) {
  const strength = strengthLabel(orb);
  if (strength === "strong") return "정밀한 연결";
  if (strength === "medium") return "뚜렷한 연결";
  return "느슨한 연결";
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
  const swissPlanetsObj = normalizeAstroPlanetMap(swissChart?.planets);
  const swissPlanetKeys = Object.keys(swissPlanetsObj);
  let planets = [];
  let calculationMode = getAstroCalculationSource(swissChart) || "full";

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
  const chartSource = getAstroCalculationSource(swissChart);
  const engineQuality = clean(swissChart?.engineQuality || (PREMIUM_SWISS_CHART_SOURCES.has(chartSource) ? "swiss" : ""));
  const houseSystem = clean(swissChart?.houseSystem || "placidus").toLowerCase();
  const fallbackUsed = swissChart?.fallbackUsed === true || engineQuality.toLowerCase() === "fallback" || /fallback/i.test(chartSource);

  return {
    calculationMode,
    chart: {
      source: chartSource,
      chartSource,
      engineQuality,
      fallbackUsed,
      houseSystem,
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
  const hasSwiss = strict ? isPremiumSwissAstroChart(swissChart) : hasUsableSwissAstroChart(swissChart);
  const hasFallback = hasUsableSwissAstroChart(fallbackAstroBase?.chart || fallbackAstroBase);
  const calculationQuality = buildAstroCalculationQuality(swissChart);

  if (strict && !hasSwiss) {
    const error = new Error("점성술 프리미엄 PDF에 필요한 차트 데이터가 부족합니다.");
    error.code = "ASTRO_CHART_SOURCE_INVALID";
    error.status = 422;
    error.details = {
      hasSwissChart: hasSwiss,
      hasFallbackBase: hasFallback,
      calculationQuality,
    };
    throw error;
  }

  const modeled = toAstroChartModel(birthInput, swissChart, strict ? null : fallbackAstroBase);

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
    calculationSource: calculationQuality.chartSource,
    chartSource: calculationQuality.chartSource,
    engineQuality: calculationQuality.engineQuality,
    houseSystem: calculationQuality.houseSystem,
    fallbackUsed: calculationQuality.fallbackUsed,
    calculationQuality,
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
  const chartSource = clean(localAstroChartJson?.chartSource || localAstroChartJson?.calculationSource || chart?.chartSource || chart?.source);
  const engineQuality = clean(localAstroChartJson?.engineQuality || chart?.engineQuality).toLowerCase();
  const houseSystem = clean(localAstroChartJson?.houseSystem || chart?.houseSystem).toLowerCase();
  const fallbackUsed = localAstroChartJson?.fallbackUsed === true
    || chart?.fallbackUsed === true
    || engineQuality === "fallback"
    || /fallback/i.test(chartSource);

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
  if (!PREMIUM_SWISS_CHART_SOURCES.has(chartSource)) missing.push("swissChartSource");
  if (engineQuality !== "swiss") missing.push("engineQuality");
  if (houseSystem !== "placidus") missing.push("houseSystem");
  if (fallbackUsed) missing.push("fallbackUsed");

  return {
    ok: missing.length === 0,
    missing,
    chartSource,
    engineQuality,
    houseSystem,
    fallbackUsed,
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

const HOUSE_TOPICS = {
  1: "자기표현과 몸의 리듬",
  2: "돈, 자원, 가치관",
  3: "생각, 말, 학습",
  4: "집, 가족, 내면의 뿌리",
  5: "창조성, 즐거움, 연애의 설렘",
  6: "일상, 업무, 건강 루틴",
  7: "관계, 배우자, 중요한 상대",
  8: "깊은 결합, 공유 자원, 심리 변화",
  9: "배움, 확장, 먼 시야",
  10: "직업, 사회적 역할, 명예",
  11: "네트워크, 공동체, 미래 계획",
  12: "무의식, 회복, 보이지 않는 정리",
};

function getAstroCategoryRule(chapter = {}, section = {}) {
  const rule = ASTRO_PREMIUM_CATEGORY_RULES[clean(section?.id)] || {};
  return {
    ...rule,
    id: clean(section?.id),
    theme: clean(rule.theme || section?.title || chapter?.title),
    manifest: clean(rule.manifest || `${clean(section?.title || chapter?.title)}의 흐름이 실제 선택 장면에서 드러납니다.`),
    strength: clean(rule.strength || "차트 신호를 현실 판단으로 바꾸는 힘"),
    caution: clean(rule.caution || "한 신호만 단정하지 말고 행성, 하우스, 어스펙트를 함께 보아야 합니다."),
    advice: clean(rule.advice || "핵심 신호를 먼저 확인하고 실제 생활의 우선순위로 번역하세요."),
    action: clean(rule.action || "이번 주 가장 중요한 선택 하나에 이 해석을 적용해 보세요."),
    planets: safeArray(rule.planets),
    points: safeArray(rule.points),
    houses: safeArray(rule.houses).map((item) => Number(item)).filter((item) => Number.isFinite(item)),
    aspectTypes: safeArray(rule.aspectTypes).map((item) => clean(item).toLowerCase()).filter(Boolean),
  };
}

function findAstroHouse(houses = [], houseNo) {
  const n = Number(houseNo);
  return safeArray(houses).find((house) => Number(house?.house || house?.number) === n) || {};
}

function planetConsultingLabel(chart = {}, name = "") {
  const planet = findAstroPlanet(safeArray(chart.planets), name);
  const label = PLANET_KO[name] || name;
  const sign = clean(planet?.sign || (name === "Sun" ? chart.sunSign : name === "Moon" ? chart.moonSign : ""));
  const house = Number.isFinite(Number(planet?.house)) ? `${Number(planet.house)}하우스` : "";
  const retrograde = planet?.retrograde ? " 역행" : "";
  return {
    label,
    sign,
    house,
    text: [label, sign, house, retrograde].filter(Boolean).join(" "),
    terms: [label, sign, house].filter(Boolean),
  };
}

function houseConsultingLabel(chart = {}, houseNo) {
  const house = findAstroHouse(safeArray(chart.houses), houseNo);
  const n = Number(houseNo);
  const sign = clean(house?.sign);
  const topic = clean(house?.topic || house?.meaning || HOUSE_TOPICS[n]);
  return {
    label: `${n}하우스`,
    sign,
    topic,
    text: [`${n}하우스`, sign, topic].filter(Boolean).join(" "),
    terms: [`${n}하우스`, sign, topic].filter(Boolean),
  };
}

function pointConsultingLabel(localAstroChartJson = {}, point = "") {
  const chart = asObject(localAstroChartJson?.chart);
  const insights = asObject(localAstroChartJson?.insights);
  const key = clean(point);
  if (key === "ascendant") return { text: `상승궁 ${clean(chart.ascendantSign) || "상승궁"}`, terms: ["상승궁", clean(chart.ascendantSign)].filter(Boolean) };
  if (key === "midheaven") return { text: `천정점 ${clean(chart.midheavenSign) || "10하우스 방향"}`, terms: ["천정점", "MC", clean(chart.midheavenSign)].filter(Boolean) };
  if (key === "descendant") return { text: `디센던트 ${clean(chart.descendantSign) || "7하우스 관계축"}`, terms: ["디센던트", clean(chart.descendantSign), "7하우스"].filter(Boolean) };
  if (key === "ic") return { text: `IC ${clean(chart.icSign) || "4하우스 뿌리"}`, terms: ["IC", clean(chart.icSign), "4하우스"].filter(Boolean) };
  if (key === "chartRuler") return { text: `차트 룰러 ${formatAstroChartRulerForText(chart.chartRuler) || "차트 룰러"}`, terms: ["차트 룰러", formatAstroChartRulerForText(chart.chartRuler)].filter(Boolean) };
  if (key === "elementBalance") return { text: `원소 균형 ${clean(chart?.elementBalance?.summary) || "원소 균형"}`, terms: ["원소", clean(chart?.elementBalance?.summary)].filter(Boolean) };
  if (key === "modalityBalance") return { text: `모드 균형 ${clean(chart?.modalityBalance?.summary) || "모드 균형"}`, terms: ["모드", clean(chart?.modalityBalance?.summary)].filter(Boolean) };
  if (key === "northNode") return { text: clean(insights?.nodeAxis?.summary) || "노드 축 성장 방향", terms: ["노드", "성장"].filter(Boolean) };
  if (key === "timing") {
    const timing = asObject(localAstroChartJson?.timingInsights);
    const summary = clean(timing.currentSummary || timing.ninetyDaySummary);
    const sourceLabel = timing.calculated ? "트랜짓 계산" : "장기 리듬";
    return {
      text: summary ? `${sourceLabel}: ${summary}` : "현재 운 흐름은 출생 차트의 목성·토성·천정점이 만드는 장기 리듬으로 제한해 읽습니다.",
      terms: ["현재 운", "90일", "목성", "토성", "천정점", "MC", timing.calculated ? "트랜짓 계산" : "장기 리듬"].filter(Boolean),
    };
  }
  return { text: key, terms: [key].filter(Boolean) };
}

function aspectMatchesRule(aspect = {}, rule = {}) {
  const type = clean(aspect?.type || aspect?.aspect).toLowerCase();
  const planetA = clean(aspect?.planetA);
  const planetB = clean(aspect?.planetB);
  const planets = safeArray(rule.planets).map(clean);
  const typeOk = !rule.aspectTypes.length || rule.aspectTypes.some((item) => type.includes(item));
  const planetOk = !planets.length || planets.includes(planetA) || planets.includes(planetB);
  return typeOk && planetOk;
}

function aspectConsultingLabel(aspect = {}) {
  const a = clean(PLANET_KO[aspect?.planetA] || aspect?.planetA);
  const b = clean(PLANET_KO[aspect?.planetB] || aspect?.planetB);
  const rawType = clean(aspect?.type || aspect?.aspect || "주요 각").toLowerCase();
  const type = ASPECT_TYPE_LABELS[rawType] || clean(aspect?.type || aspect?.aspect || "주요 각");
  const pair = a && b ? `${withJosa(a, "과", "와")} ${b}` : "";
  const tightness = Number.isFinite(Number(aspect?.orb)) ? aspectTightnessLabel(aspect.orb) : "";
  return {
    text: [pair, type ? `${type} 각도` : "", tightness].filter(Boolean).join(" "),
    terms: [a, b, type].filter(Boolean),
  };
}

function buildCategoryEvidenceContext(localAstroChartJson, chapter, section, sectionIndex) {
  const chart = asObject(localAstroChartJson?.chart);
  const timingInsights = asObject(localAstroChartJson?.timingInsights);
  const rule = getAstroCategoryRule(chapter, section);
  const planetEvidence = rule.planets.map((name) => planetConsultingLabel(chart, name)).filter((item) => clean(item.text));
  const houseEvidence = rule.houses.map((houseNo) => houseConsultingLabel(chart, houseNo)).filter((item) => clean(item.text));
  const pointEvidence = rule.points.map((point) => pointConsultingLabel(localAstroChartJson, point)).filter((item) => clean(item.text));
  const aspects = safeArray(chart.aspects);
  const matchedAspects = aspects.filter((aspect) => aspectMatchesRule(aspect, rule));
  const contextAspects = matchedAspects.length
    ? []
    : aspects.filter((aspect) => {
      const type = clean(aspect?.type || aspect?.aspect).toLowerCase();
      return !rule.aspectTypes.length || rule.aspectTypes.some((item) => type.includes(item));
    }).slice(0, 1);
  const selectedAspects = (matchedAspects.length ? matchedAspects : contextAspects).slice(0, 3).map(aspectConsultingLabel);
  const aspectScope = matchedAspects.length ? "direct" : (selectedAspects.length ? "context" : "none");
  const primaryPlanet = planetEvidence[0]?.text || pointEvidence[0]?.text || "핵심 행성 신호";
  const primaryHouse = houseEvidence[0]?.text || "핵심 하우스";
  const primaryAspect = selectedAspects[0]?.text || "직접 강한 어스펙트보다 행성·하우스 배치가 우선되는 구조";
  const evidenceLabels = uniqueList([
    ...planetEvidence.map((item) => item.text),
    ...pointEvidence.map((item) => item.text),
    ...houseEvidence.map((item) => item.text),
    ...selectedAspects.map((item) => item.text),
  ]);
  const requiredFocusTerms = uniqueList([
    section.title,
    rule.theme,
    ...planetEvidence.flatMap((item) => item.terms),
    ...pointEvidence.flatMap((item) => item.terms),
    ...houseEvidence.flatMap((item) => item.terms),
    ...selectedAspects.flatMap((item) => item.terms),
  ]).slice(0, 18);
  return {
    rule,
    chapter,
    section,
    sectionIndex,
    primaryPlanet,
    primaryHouse,
    primaryAspect,
    evidenceLabels,
    requiredFocusTerms,
    aspectScope,
    timingInsights,
    usedPlanets: uniqueList(rule.planets.map((name) => PLANET_KO[name] || name)),
    usedHouses: uniqueList(rule.houses),
    usedAspects: uniqueList(selectedAspects.map((item) => item.text)),
  };
}

function buildSignals(localAstroChartJson, chapter, section, sectionIndex) {
  const ctx = buildCategoryEvidenceContext(localAstroChartJson, chapter, section, sectionIndex);
  const usedSignals = uniqueList([
    ...ctx.evidenceLabels,
    ...ctx.requiredFocusTerms,
    clean(chapter?.title),
    clean(section?.title),
  ]).slice(0, 18);
  return {
    ...ctx,
    usedSignals,
  };
}

function joinEvidence(values = [], fallback = "핵심 차트 신호") {
  const list = uniqueList(values).filter(Boolean).slice(0, 7);
  return list.length ? list.join(" · ") : fallback;
}

function hasKoreanFinalConsonant(value = "") {
  const chars = Array.from(clean(value));
  const last = chars.reverse().find((char) => /[가-힣]/.test(char));
  if (!last) return false;
  return ((last.charCodeAt(0) - 0xac00) % 28) !== 0;
}

function withJosa(value = "", consonant = "은", vowel = "는") {
  const text = clean(value);
  if (!text) return "";
  return `${text}${hasKoreanFinalConsonant(text) ? consonant : vowel}`;
}

function sentenceCore(value = "") {
  return clean(value).replace(/[.!?。]+$/g, "");
}

const CHAPTER_READING_FRAMES = Object.freeze({
  1: {
    lens: "차트 전체의 큰 방향",
    real: "중요한 선택 앞에서 반복되는 기준과 삶의 속도",
    examples: "목표를 정하는 방식, 사람을 만나는 태도, 일을 벌이는 속도",
    caution: "한 행성만 크게 보지 말고 전체 균형을 함께 맞추는 태도",
    action: "가장 자주 반복되는 선택 기준을 한 문장으로 적는 일",
    practiceDays: 9,
  },
  2: {
    lens: "자아감과 스스로 빛나는 방식",
    real: "주도권을 잡고 싶은 순간, 인정받고 싶은 장면, 중심이 흔들리는 때의 반응",
    examples: "결정을 미루지 않는 태도, 공개적으로 말하는 방식, 성취를 받아들이는 자세",
    caution: "인정 욕구와 진짜 목표를 혼동하지 않는 태도",
    action: "스스로 결정하고 끝까지 책임질 수 있는 작은 목표를 고르는 일",
    practiceDays: 7,
  },
  3: {
    lens: "감정의 결, 안정감, 회복 방식",
    real: "불안할 때의 첫 반응, 가까운 사람에게 기대하는 온도, 혼자 회복하는 방식",
    examples: "휴식의 질, 감정 표현의 속도, 가까운 관계에서 기대하는 배려",
    caution: "감정의 속도를 사실 판단으로 바로 옮기지 않는 태도",
    action: "감정 이름과 몸의 반응을 함께 기록하는 일",
    practiceDays: 10,
  },
  4: {
    lens: "세상에 드러나는 첫인상과 적응 방식",
    real: "새로운 환경에 들어갈 때의 표정, 속도, 거리감, 몸의 긴장",
    examples: "첫 만남의 말투, 몸의 긴장도, 낯선 장소에서 자리를 잡는 방식",
    caution: "겉으로 보이는 이미지와 내면의 욕구를 분리해 보는 태도",
    action: "중요한 만남 전 첫 문장과 첫 행동을 정리하는 일",
    practiceDays: 5,
  },
  5: {
    lens: "생각, 취향, 욕망이 만드는 개인적 매력",
    real: "말투, 선택 취향, 추진 속도, 관계에서 드러나는 호감의 방식",
    examples: "글을 쓰는 방식, 좋아하는 분위기, 원하는 것을 요청하는 타이밍",
    caution: "생각과 감정과 행동의 속도가 서로 다를 수 있음을 인정하는 태도",
    action: "말, 취향, 행동 중 지금 가장 강하게 드러나는 재능 하나를 쓰는 일",
    practiceDays: 8,
  },
  6: {
    lens: "성장 과제와 인생 후반으로 갈수록 강해지는 힘",
    real: "기회, 책임, 변화, 꿈, 깊은 전환을 다루는 방식",
    examples: "기회를 확장하는 속도, 책임을 견디는 힘, 오래된 패턴을 바꾸는 결단",
    caution: "확장과 절제, 이상과 현실의 균형을 잃지 않는 태도",
    action: "오래 반복할 수 있는 성장 훈련을 하나로 좁히는 일",
    practiceDays: 21,
  },
  7: {
    lens: "하우스가 가리키는 실제 삶의 무대",
    real: "돈, 가족, 관계, 일처럼 매일 확인되는 생활 영역",
    examples: "수입과 지출, 집의 분위기, 파트너십, 사회적 역할",
    caution: "심리 해석으로 끝내지 않고 실제 영역의 습관까지 확인하는 태도",
    action: "해당 하우스가 가리키는 생활 영역에서 한 가지 행동을 조정하는 일",
    practiceDays: 14,
  },
  8: {
    lens: "어스펙트가 만드는 긴장과 재능",
    real: "쉽게 풀리는 재능, 반복되는 갈등, 관계 속에서 되살아나는 반응",
    examples: "충돌 직전의 감정, 자연스럽게 잘 풀리는 일, 반복해서 부딪히는 관계 장면",
    caution: "긴장을 실패로 해석하지 않고 훈련 가능한 압력으로 보는 태도",
    action: "반복 갈등을 원인, 반응, 대체 행동으로 나누는 일",
    practiceDays: 12,
  },
  9: {
    lens: "사랑과 관계에서 반복되는 별자리 코드",
    real: "끌림, 거리감, 기대, 약속, 오래 가는 관계의 조건",
    examples: "호감이 시작되는 순간, 애착이 깊어지는 방식, 약속을 지키는 기준",
    caution: "좋아하는 마음과 안정적인 관계 조건을 구분하는 태도",
    action: "관계에서 원하는 것과 줄 수 있는 것을 따로 적는 일",
    practiceDays: 11,
  },
  10: {
    lens: "직업적 방향과 사회적 성취 방식",
    real: "일의 구조, 인정받는 방식, 책임의 크기, 성과가 쌓이는 경로",
    examples: "업무 우선순위, 평가받는 방식, 협업에서 맡는 역할",
    caution: "명예와 안정, 성장과 소진의 균형을 함께 보는 태도",
    action: "직업 목표에 시간, 비용, 보상 기준을 붙이는 일",
    practiceDays: 14,
  },
  11: {
    lens: "운의 흐름을 현실적으로 쓰는 방식",
    real: "가까운 90일 동안 확장할 것과 줄여야 할 것의 우선순위",
    examples: "새로 열리는 기회, 부담을 줄여야 할 일정, 관계와 일의 전환점",
    caution: "트랜짓이 여는 시기 신호를 실제 일정과 자원 배분으로 검증하는 태도",
    action: "90일 계획을 시작, 조정, 점검의 세 단계로 나누는 일",
    practiceDays: 30,
  },
  12: {
    lens: "최종 마스터플랜과 장기 선택 기준",
    real: "앞으로 키울 힘, 내려놓을 습관, 3년 방향, 가장 빛나는 선택",
    examples: "성장 목표, 정리해야 할 습관, 오래 가져갈 역할과 관계",
    caution: "하나의 결론으로 삶 전체를 단정하지 않고 우선순위를 세우는 태도",
    action: "다음 선택을 성장, 안정, 관계, 지속성 기준으로 점검하는 일",
    practiceDays: 21,
  },
});

function getChapterReadingFrame(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || ctx?.chapterNo || 0);
  return CHAPTER_READING_FRAMES[chapterNo] || CHAPTER_READING_FRAMES[1];
}

function finishKoreanSentence(value = "", fallback = "") {
  const text = sentenceCore(value || fallback);
  if (!text) return "";
  return /[다요]$/.test(text) ? `${text}.` : `${text}입니다.`;
}

function evidenceOpener(sectionIndex = 0) {
  const items = ["차트에서 먼저 볼 근거는", "이 항목을 받치는 신호는", "해석의 뼈대가 되는 배치는", "상담에서 확인할 별의 표식은", "판단 기준이 되는 차트 근거는"];
  return items[Math.abs(Number(sectionIndex || 0)) % items.length];
}

function actionVerb(sectionIndex = 0) {
  const items = ["기록하십시오", "점검하십시오", "정리하십시오", "실험해 보십시오", "선택하십시오"];
  return items[Math.abs(Number(sectionIndex || 0)) % items.length];
}

function buildEvidenceList(ctx = {}, limit = 5) {
  return uniqueList(ctx.evidenceLabels || [])
    .filter(Boolean)
    .slice(0, limit);
}

function buildAspectReading(ctx = {}) {
  const primaryAspect = clean(ctx.primaryAspect);
  if (ctx.aspectScope === "direct") {
    return `${primaryAspect}는 흐름이 자연스럽게 열리는지, 훈련을 통해 다듬어지는지를 보여 주는 직접 각도입니다.`;
  }
  if (ctx.aspectScope === "context") {
    return `${primaryAspect}는 직접 핵심 각도라기보다 주변 맥락을 보태는 신호이므로, 결론은 행성과 하우스 배치를 우선해 잡아야 합니다.`;
  }
  return "이 항목은 직접 강한 어스펙트보다 행성의 별자리와 하우스 배치가 더 우선되는 구조입니다.";
}

function buildTimingScope(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  const sectionId = clean(ctx?.section?.id);
  if (chapterNo !== 11 && sectionId !== "c12_s4") return "";
  const timing = asObject(ctx?.timingInsights);
  if (timing.calculated) {
    const current = clean(timing.currentSummary);
    const next = clean(sectionId === "c12_s4" ? timing.threeYearSummary : timing.ninetyDaySummary);
    return [
      current ? `현재 트랜짓은 ${current}입니다.` : "",
      next ? `${sectionId === "c12_s4" ? "중장기 전개" : "전개 포인트"}는 ${next}입니다.` : "",
    ].filter(Boolean).join(" ");
  }
  return "트랜짓 산출이 불완전한 경우에는 출생 차트의 장기 리듬만 참고합니다.";
}

function buildOpeningSentence(ctx = {}, frame = {}) {
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  const theme = sentenceCore(rule.theme || sectionTitle);
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const themeObject = withJosa(theme, "을", "를");
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseObject = withJosa(primaryHouse, "을", "를");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const byChapter = {
    1: `${sectionSubject} ${primaryPlanetObject} 출발점으로 삼고 ${primaryHouseObject} 삶의 장면으로 놓아, ${themeObject} 한눈에 잡아 주는 출생 차트의 기준선입니다.`,
    2: `${sectionSubject} ${primaryPlanetObject} 통해 자아감이 어디에서 회복되고 어떤 방식으로 빛나려 하는지를 보여 줍니다.`,
    3: `${sectionSubject} ${primaryPlanetObject} 통해 감정의 온도와 안정감의 조건이 어떻게 만들어지는지 짚어 줍니다.`,
    4: `${sectionSubject} ${primaryHouseObject} 외적 분위기의 장면으로 보고 ${primaryPlanetObject} 몸의 반응 신호로 함께 읽습니다.`,
    5: `${sectionSubject} ${primaryPlanetObject} 기준으로 생각, 취향, 추진력이 실제 매력으로 바뀌는 방식을 보여 줍니다.`,
    6: `${sectionSubject} ${primaryPlanetObject} 통해 인생의 성장 과제가 어디에서 열리고 어디에서 절제되는지 알려 줍니다.`,
    7: `${sectionSubject} ${primaryHouseObject} 기준으로 실제 생활의 어떤 영역이 깨어나는지 확인하는 해석입니다.`,
    8: `${sectionSubject} ${primaryAspectObject} 통해 반복되는 긴장과 타고난 재능의 사용법을 구분합니다.`,
    9: `${sectionSubject} ${primaryPlanetObject} 관계의 욕구로 보고 ${primaryHouseObject} 관계가 펼쳐지는 장면으로 보아 사랑의 조건을 읽습니다.`,
    10: `${sectionSubject} ${primaryPlanetObject} 직업적 동력으로, ${primaryHouseObject} 사회적 무대로 놓고 성취의 방향을 살핍니다.`,
    11: `${sectionSubject} ${primaryPlanetObject} 확장과 조정의 신호로 삼고 ${primaryHouseObject} 가까운 시기의 우선순위로 정리합니다.`,
    12: `${sectionSubject} ${primaryPlanetObject} 핵심 동력으로, ${primaryHouseObject} 앞으로의 선택 기준으로 놓아 마스터플랜을 묶습니다.`,
  };
  return byChapter[chapterNo] || `${sectionTitle}은 ${frame.lens}을 ${primaryPlanet}과 ${primaryHouse}로 구체화합니다.`;
}

function buildAstroExpansionParagraph(chapter, section, ctx = {}, pass = 1) {
  const rule = ctx.rule || getAstroCategoryRule(chapter, section);
  const sectionTitle = clean(section?.title) || "핵심 섹션";
  const evidenceLine = joinEvidence(ctx.evidenceLabels || []);
  const frame = getChapterReadingFrame({ ...ctx, chapter });
  const timingScope = buildTimingScope({ ...ctx, chapter, section });
  const themeSubject = withJosa(sentenceCore(rule.theme || sectionTitle), "은", "는");
  const evidenceSubject = withJosa(evidenceLine, "이", "가");
  const frameLensObject = withJosa(frame.lens, "을", "를");
  return `${sectionTitle} 추가 해석 ${pass}: ${themeSubject} ${evidenceSubject} 함께 움직일 때 더 선명해집니다. ${frameLensObject} 실제 선택으로 옮기려면 ${sentenceCore(rule.advice)}. ${timingScope ? `${timingScope} ` : ""}${rule.action}`;
}

function formatAstroConsultingParagraphs(paragraphs = {}) {
  return ASTRO_SECTION_HEADINGS.map((heading) => `${heading}\n${paragraphs[heading] || ""}`).join("\n\n");
}

function buildChapterOneConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 1) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const theme = sentenceCore(rule.theme || sectionTitle);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryHouseObject = withJosa(primaryHouse, "을", "를");
  const themeSubject = withJosa(theme, "은", "는");
  const strength = finishKoreanSentence(rule.strength, "차트의 여러 신호를 하나의 방향으로 묶는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "강한 신호 하나에 기대면 전체 균형이 흐려질 수 있습니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");

  const blocks = {
    c1_s1: {
      "핵심 진단": `${sectionTitle}은 차트 전체가 남기는 첫 문장입니다. ${primaryPlanet}에서 삶의 불꽃이 켜지고, ${primaryHouse}에서 그 불꽃이 실제 장면을 얻으며, ${theme}이 이번 리포트의 중심축으로 떠오릅니다. 이 장은 성격을 늘어놓기보다 앞으로 모든 챕터를 해석할 기준 문장을 먼저 세웁니다.`,
      "차트 근거": `핵심 근거는 ${evidenceLine}입니다. ${evidenceSeed}는 서로 따로 움직이는 재료가 아니라, 목적과 정서와 외부 역할이 한 방향으로 합쳐지는 길을 보여 줍니다. ${primaryAspect}는 그 길이 쉽게 열리는 지점과 의식적으로 다듬어야 할 지점을 동시에 알려 주는 표식입니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 중요한 선택을 앞두면 마음은 이미 답을 알고 있는데, 사회적 역할이나 주변 기대 때문에 표현이 늦어질 수 있습니다. 이때 반복해서 선택하는 태도, 사람 앞에서 보이는 표정, 책임을 맡는 방식이 바로 차트의 핵심 문장을 현실로 번역합니다.`,
      "장점": `${strength} 흩어진 재능이 하나의 문장으로 정리되면 결정 속도가 빨라지고, 다른 사람에게도 자신의 방향을 더 분명하게 전달할 수 있습니다. 특히 ${primaryPlanet}의 빛이 ${primaryHouse}로 내려올 때, 타고난 기질은 막연한 가능성이 아니라 실제 선택을 밀어 주는 힘이 됩니다.`,
      "주의점": `${caution} 태양의 욕구만 앞세우면 마음의 안정이 뒤처지고, 달의 안전감만 붙잡으면 도약이 늦어질 수 있습니다. ${primaryAspect}가 긴장으로 느껴지는 날에는 결론을 서두르기보다 목적, 감정, 역할을 한 번씩 분리해 확인하는 편이 안전합니다.`,
      "상담사의 조언": `${rule.advice} 이 문장은 앞으로의 장에서 계속 돌아와 확인해야 할 나침반입니다. 어떤 조언이 좋아 보여도 이 핵심 문장과 어긋난다면 오래 지속되기 어렵고, 반대로 작아 보이는 선택이라도 이 문장과 맞으면 삶의 결이 정돈됩니다.`,
      "실천 과제": `${rule.action} 선택지를 적을 때는 원하는 것, 마음이 편안해지는 것, 세상에 보여 줄 모습, 장기 목표를 네 줄로 나누십시오. 네 줄이 같은 방향을 가리키는 항목이 지금 가장 믿을 만한 선택입니다.`,
    },
    c1_s2: {
      "핵심 진단": `${sectionTitle}는 의지, 감정, 외부 반응이 맞물리는 기본 삼각형입니다. ${primaryPlanetSubject} 스스로 빛나고 싶은 방향을, ${primaryHouseSubject} 그 빛이 몸과 태도로 먼저 드러나는 무대를 말합니다. 이 구조가 안정되면 사람은 억지로 자신을 설명하지 않아도 자연스럽게 자기다운 결을 냅니다.`,
      "차트 근거": `읽기의 뼈대는 ${evidenceLine}입니다. ${evidenceSeed}를 함께 보면 원하는 삶과 편안한 삶, 그리고 남에게 보이는 삶 사이의 거리가 보입니다. ${primaryAspect}는 그 거리가 가까울 때 재능이 되고, 멀어질 때 오해나 피로가 되는 지점을 짚어 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 마음속으로는 분명히 원하지만 밖에서는 다르게 행동하거나, 겉으로는 씩씩해 보여도 안쪽에서는 조용한 확인을 바라는 식으로 나타납니다. 새로운 사람을 만날 때의 첫 반응과 지친 날의 회복 방식이 이 삼각형의 상태를 가장 솔직하게 보여 줍니다.`,
      "장점": `${strength} 태양, 달, 상승궁이 서로를 방해하지 않으면 목표를 세우는 힘과 쉬는 힘, 시작하는 힘이 한 리듬으로 이어집니다. 그러면 ${primaryPlanet}의 방향성이 과장되지 않고, ${primaryHouse}의 표현도 방어가 아니라 매력으로 읽힙니다.`,
      "주의점": `${caution} 겉모습이 마음보다 빨리 움직이는 시기에는 상대가 나를 강하게 보거나 차갑게 볼 수 있습니다. 반대로 감정이 앞서면 태양의 목표가 흐려지므로, ${primaryAspect}가 건드려지는 상황에서는 바로 반응하지 말고 몸의 긴장부터 낮추는 편이 좋습니다.`,
      "상담사의 조언": `${rule.advice} 목표를 정할 때는 태양의 언어로 쓰고, 회복 계획은 달의 언어로 쓰며, 첫 실행은 상승궁의 속도에 맞추십시오. 세 신호를 같은 문장으로 묶으려 하기보다 각각의 역할을 살려 배치하는 것이 더 정확합니다.`,
      "실천 과제": `${rule.action} 오늘의 목표, 오늘 필요한 안정감, 오늘 밖으로 보일 태도를 각각 한 줄로 적으십시오. 세 줄 중 가장 어긋난 문장이 이번 주에 먼저 조율해야 할 자리입니다.`,
    },
    c1_s3: {
      "핵심 진단": `${sectionTitle}는 차트 전체의 기압과 조명을 읽는 항목입니다. ${primaryPlanetAgent} 중심 조명을 만들고 ${primaryHouseAgent} 사건의 무대를 정하면, ${themeSubject} 삶에서 반복되는 분위기와 선택의 온도를 알려 줍니다. 여기서는 한 가지 성격보다 전체 배치가 만드는 계절감을 봅니다.`,
      "차트 근거": `근거로 삼을 배치는 ${evidenceLine}입니다. ${evidenceSeed}가 자주 등장할수록 특정 욕구와 생활 무대가 계속 같은 방향으로 사람을 부릅니다. ${primaryAspect}는 그 분위기에 리듬을 더해, 쉽게 풀리는 흐름과 자주 막히는 흐름을 구분하게 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 어떤 사람은 변화가 오면 먼저 움직이고, 어떤 사람은 자리를 단단히 다진 뒤 열립니다. 이 차트는 반복되는 사건 자체보다 사건을 맞이하는 공기의 질을 보여 주므로, 비슷한 상황에서 계속 같은 감정과 선택이 돌아오는 이유를 설명해 줍니다.`,
      "장점": `${strength} 자신의 분위기를 알면 남의 속도에 휩쓸리지 않고 필요한 환경을 고를 수 있습니다. ${primaryPlanetAgent} 강해지는 장면에서는 주도권을 잡고, ${primaryHouseAgent} 강조되는 때에는 공간과 역할을 정돈하는 것만으로도 흐름이 훨씬 안정됩니다.`,
      "주의점": `${caution} 강한 배치는 재능이지만 동시에 익숙한 방식으로만 문제를 풀게 만들 수 있습니다. ${primaryAspect}가 반복될 때는 같은 선택을 또 하고 있는지, 아니면 같은 힘을 더 성숙하게 쓰고 있는지 구분해야 합니다.`,
      "상담사의 조언": `${rule.advice} 강한 에너지는 억누르기보다 쓸 장소를 정하고, 약한 에너지는 의식적으로 작은 습관을 만들어 보완하십시오. 차트의 분위기를 바꾸려 애쓰기보다 그 분위기가 가장 아름답게 빛나는 환경을 고르는 편이 현명합니다.`,
      "실천 과제": `${rule.action} 이번 달 자주 반복된 상황 세 가지를 적고, 그때마다 내가 먼저 보인 반응을 표시하십시오. 반복되는 반응이 이 차트의 기본 기후이며, 그 기후를 알 때 선택의 낭비가 줄어듭니다.`,
    },
    c1_s4: {
      "핵심 진단": `${sectionTitle}은 삶의 속도계와 호흡법을 보여 줍니다. ${primaryPlanetObject} 기본 재료로 보고 ${primaryHouseObject} 생활 리듬으로 놓으면, 시작이 빠른지, 오래 붙드는지, 상황에 맞춰 바꾸는지가 선명해집니다. 이 항목은 잘 맞는 리듬을 찾는 실전 상담에 가깝습니다.`,
      "차트 근거": `살펴볼 표식은 ${evidenceLine}입니다. ${evidenceSeed}는 불, 흙, 공기, 물의 균형과 시작형, 고정형, 변화형 리듬이 어디로 기울어지는지 알려 줍니다. ${primaryAspect}는 그 리듬이 타인과 만났을 때 조율이 필요한 부분을 드러냅니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 어떤 일은 시작만 해도 금세 살아나지만 유지에서 힘이 빠질 수 있고, 어떤 일은 늦게 달아오르지만 한 번 붙으면 오래 갑니다. 일정이 무너지거나 몸이 먼저 지치는 순간은 대개 나쁜 운이 아니라 리듬을 거슬렀다는 신호입니다.`,
      "장점": `${strength} 자신의 속도에 맞는 환경을 고르면 집중력과 지속력이 함께 살아납니다. ${primaryPlanet}이 빠르게 반응하는 날에는 가벼운 시작이 좋고, ${primaryHouse}가 강조되는 시기에는 생활 구조를 먼저 세우는 것이 운을 받아들이는 그릇이 됩니다.`,
      "주의점": `${caution} 리듬을 무시하면 좋은 기회도 피로와 압박으로 변합니다. ${primaryAspect}가 흔들리는 날에는 더 많이 하려는 욕심보다 순서를 바꾸는 지혜가 필요하고, 특히 몸의 신호를 늦게 알아차리지 않는 것이 중요합니다.`,
      "상담사의 조언": `${rule.advice} 시작할 일, 유지할 일, 바꿀 일을 한 목록에 섞어 두지 마십시오. 이 차트는 일을 밀어붙일 때보다 리듬을 맞출 때 더 강해지므로, 하루의 배치부터 별의 호흡에 맞추는 것이 좋습니다.`,
      "실천 과제": `${rule.action} 이번 주 일정표에 시작, 유지, 전환이라는 표시를 붙이십시오. 같은 날에 세 종류가 과하게 몰려 있다면 그것이 피로의 원인이며, 운의 흐름을 잃는 지점입니다.`,
    },
    c1_s5: {
      "핵심 진단": `${sectionTitle}은 더 많이 얻는 방향이 아니라 더 자기답게 자라는 방향을 말합니다. ${primaryPlanetSubject} 확장하고 싶은 힘을, ${primaryHouseSubject} 그 힘을 현실에서 책임져야 할 무대를 보여 줍니다. ${themeSubject} 앞으로의 선택에서 반복해서 돌아올 영혼의 성장 과제입니다.`,
      "차트 근거": `성장 방향의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 한곳으로 모이면 인생은 우연처럼 같은 과제를 반복해서 건넵니다. ${primaryAspect}는 그 과제가 선물처럼 열리는 때와 훈련처럼 다가오는 때를 구분하게 해 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 잘하는 방식만 계속 붙잡고 있을 때는 안정감이 있지만, 어느 순간 더 큰 무대로 나가라는 압력이 생깁니다. 그 압력은 불편해도 길을 잃었다는 뜻이 아니라, 낡은 선택 기준이 새 삶의 크기를 따라가지 못한다는 신호입니다.`,
      "장점": `${strength} 성장 방향을 알면 조급한 목표와 진짜 부름을 구분할 수 있습니다. ${primaryPlanetAgent} 여는 가능성을 ${primaryHouse}의 책임으로 받아들일 때, 막연한 꿈은 훈련 가능한 계획으로 바뀝니다.`,
      "주의점": `${caution} 익숙한 재능은 편하지만, 때로는 같은 자리에 머무르게 하는 달콤한 이유가 됩니다. ${primaryAspect}가 강하게 느껴질수록 바로 확장하기보다 어떤 습관을 내려놓아야 하는지 먼저 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 목성의 문은 가능성을 보여 주고, 토성의 문은 대가를 묻습니다. 두 문을 함께 통과할 때 성장 방향이 현실이 되므로, 큰 목표를 세우되 매주 반복할 작은 훈련까지 함께 정하십시오.`,
      "실천 과제": `${rule.action} 3개월 안에 키울 능력 하나와 줄일 습관 하나를 적으십시오. 능력은 미래의 문을 열고, 줄일 습관은 그 문을 지나갈 몸을 가볍게 만듭니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterTwoConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 2) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryHouseObject = withJosa(primaryHouse, "을", "를");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const strength = finishKoreanSentence(rule.strength, "자신의 중심을 현실 선택으로 옮기는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "외부 반응만 따라가면 중심이 쉽게 흐려질 수 있습니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");

  const blocks = {
    c2_s1: {
      "핵심 진단": `${sectionTitle}은 내가 어디에서 살아 있다는 감각을 되찾는지 보여 주는 항목입니다. ${primaryPlanetSubject} 삶의 중심 불씨를 밝히고, ${primaryHouseSubject} 그 불씨가 실제로 서야 할 무대를 알려 줍니다. ${themeObject} 읽을 때는 남에게 보이는 성격보다 스스로 주도권을 되찾는 순간을 먼저 봅니다.`,
      "차트 근거": `중심을 세우는 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 목표, 인정 욕구, 사회적 무대가 어떤 방향으로 이어지는지 보입니다. ${primaryAspectSubject} 중심을 밀어 주는 힘과 조율해야 할 긴장을 동시에 드러내므로, 태양의 빛을 한 장면만으로 단정하지 않습니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 실제로는 책임을 맡을 때 눈빛이 달라지거나, 의미 없는 일에는 빨리 식고 자신이 선택한 일에는 오래 버티는 모습으로 나타납니다. 남이 시킨 역할보다 내가 이름을 걸고 선택한 일이 있을 때 이 태양은 가장 선명해집니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 깨어날수록 목표와 자존감이 따로 놀지 않고, 해야 할 일과 하고 싶은 일을 한 방향으로 묶을 수 있습니다. ${primaryHouseAgent} 활성화되는 장면에서는 존재감이 과시가 아니라 책임감 있는 중심으로 읽힙니다.`,
      "주의점": `${caution} 인정받고 싶은 마음이 강해질수록 스스로 원하는 것과 칭찬받기 쉬운 것을 혼동할 수 있습니다. ${primaryAspectObject} 다룰 때는 반응을 얻기 위한 선택인지, 정말 내 중심에서 나온 선택인지 한 번 더 가르는 태도가 필요합니다.`,
      "상담사의 조언": `${rule.advice} 태양은 누군가가 허락해 주는 빛이 아니라 내가 매일 선택해서 켜는 등불입니다. 이 항목을 볼 때는 능력보다 주도권을 먼저 확인하고, 주도권이 살아나는 일을 삶의 중심 자리에 배치하십시오.`,
      "실천 과제": `${rule.action} 오늘 할 일 가운데 내가 직접 방향을 정할 수 있는 일을 하나 고르십시오. 작아도 좋지만, 끝낸 뒤 “내가 선택했다”는 감각이 남아야 이 태양이 건강하게 살아납니다.`,
    },
    c2_s2: {
      "핵심 진단": `${sectionTitle}은 존재감이 어떤 방식으로 무대 위에 올라오는지를 보여 줍니다. ${primaryPlanetSubject} 빛나고 싶은 욕구를 만들고, ${primaryHouseSubject} 그 욕구가 놀이, 창작, 성취, 인정의 장면에서 어떻게 표현되는지 알려 줍니다. 여기서 중요한 것은 크게 보이는 일이 아니라 나답게 빛나는 방식입니다.`,
      "차트 근거": `표현 방식의 근거는 ${evidenceLine}입니다. ${evidenceSeed}는 자신을 보여 주는 힘과 실행 속도가 어디에서 만나는지 말해 줍니다. ${primaryAspectSubject} 표현이 자연스럽게 흐를 때와 과하게 힘이 들어갈 때를 구분하게 하므로, 빛의 밝기보다 조명의 각도를 읽어야 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 말투, 발표 방식, 일의 완성도, 취향을 드러내는 순간에 존재감이 선명해집니다. 잘하려는 마음이 강한 날에는 오히려 딱딱해질 수 있지만, 즐거움과 목적이 같이 있을 때는 주변 사람도 그 빛을 쉽게 알아봅니다.`,
      "장점": `${strength} 자기표현이 살아나면 결과만 남기는 사람이 아니라 분위기와 방향을 함께 만드는 사람이 됩니다. ${primaryPlanetAgent} 이끄는 힘에 ${primaryHouseAgent} 실제 장면을 마련해 주면, 매력은 순간적인 인상에 머물지 않고 성과로 이어집니다.`,
      "주의점": `${caution} 보여주고 싶은 모습이 앞서면 협력보다 무대 장악이 먼저 나올 수 있습니다. ${primaryAspectObject} 의식할 때는 속도를 늦추고, 내가 빛나는 방식이 상대의 리듬을 밀어내지 않는지 살피는 편이 좋습니다.`,
      "상담사의 조언": `${rule.advice} 빛나는 방식은 남보다 강해지는 기술이 아니라 내 색을 숨기지 않는 훈련입니다. 발표, 창작, 리더십, 성과 중 어디에서 가슴이 먼저 뜨거워지는지 보십시오. 그곳이 이 태양이 무대를 찾는 자리입니다.`,
      "실천 과제": `${rule.action} 결과보다 표현 방식이 중요한 일을 하나 골라 직접 말하거나 보여 주십시오. 평가를 기다리기보다 내가 어떤 빛으로 드러났는지 먼저 기록하면 다음 무대가 훨씬 분명해집니다.`,
    },
    c2_s3: {
      "핵심 진단": `${sectionTitle}은 나를 귀하게 여기는 감각이 어디에서 회복되는지를 말합니다. ${primaryPlanetSubject} 삶의 목적을 밝히고, ${primaryHouseSubject} 가치와 즐거움의 감각을 통해 그 목적에 온기를 더합니다. ${sectionSubject} 성과보다 먼저 “내가 나를 인정하는 조건”을 묻는 장면입니다.`,
      "차트 근거": `자존감의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 만나는 지점에는 좋아하는 것, 잘하고 싶은 것, 인정받고 싶은 것이 겹쳐 있습니다. ${primaryAspectSubject} 그 겹침이 부드럽게 이어지는지, 아니면 타인의 평가 앞에서 흔들리는지를 보여 주는 실마리입니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 좋아하는 일을 할 때 표정이 풀리고, 가치관에 맞는 선택을 했을 때 오래 버틸 힘이 생깁니다. 반대로 칭찬은 받았지만 마음이 비어 있다면, 그 일은 자존감을 살리는 길이 아니라 외부 확인만 채우는 길일 수 있습니다.`,
      "장점": `${strength} 자신이 좋아하는 것을 부끄러워하지 않을수록 설득력과 매력이 함께 살아납니다. ${primaryPlanetAgent} 목적을 세우고 ${primaryHouseAgent} 즐거움과 가치의 자리를 열어 주면, 자기 신뢰는 감정 기복이 아니라 생활의 기준이 됩니다.`,
      "주의점": `${caution} 타인의 반응을 자존감의 유일한 거울로 삼으면 작은 침묵도 거절처럼 느껴질 수 있습니다. ${primaryAspectObject} 볼 때는 평가받은 결과보다 내가 그 선택을 존중할 수 있는지 먼저 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 자존감은 거창한 확신보다 반복해서 나를 배신하지 않는 선택에서 자랍니다. 취향, 돈, 시간, 관계에서 스스로를 낮추지 않는 작은 기준을 세우면 태양의 빛이 훨씬 따뜻해집니다.`,
      "실천 과제": `${rule.action} 오늘 30분은 평가와 상관없이 자신이 좋아하는 활동에 쓰십시오. 끝난 뒤 기분이 가벼워졌는지, 더 선명해졌는지, 아니면 더 불안해졌는지 기록하면 자존감의 진짜 조건이 드러납니다.`,
    },
    c2_s4: {
      "핵심 진단": `${sectionTitle}은 태양의 빛이 약해서가 아니라 너무 많은 책임과 평가가 한꺼번에 올 때 생기는 흔들림을 보여 줍니다. ${primaryPlanetSubject} 중심을 세우려 하고, ${primaryHouseSubject} 일상과 성취의 압력을 통해 그 중심을 시험합니다. 이 항목은 무너짐의 예언이 아니라 중심을 다시 세우는 순서를 찾는 상담입니다.`,
      "차트 근거": `흔들림을 읽는 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 보면 책임, 피로, 평가, 미룬 과제가 어느 생활 무대에서 겹치는지 보입니다. ${primaryAspectSubject} 압박의 질을 말해 주며, 지금 필요한 것이 더 큰 의지인지 더 작은 구조인지 구분하게 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 해야 할 일이 많아질수록 자신감이 줄거나, 작은 비판을 정체성 전체의 문제처럼 받아들이는 식으로 나타날 수 있습니다. 이때 문제는 능력 부족이 아니라 태양이 쉴 자리 없이 계속 증명만 요구받는 구조입니다.`,
      "장점": `${strength} 압박을 구조화하면 이 태양은 오히려 더 단단해집니다. ${primaryPlanetAgent} 흔들릴 때 ${primaryHouseAgent} 보여 주는 생활 무대를 정리하면, 자신감은 기분이 아니라 반복 가능한 질서에서 회복됩니다.`,
      "주의점": `${caution} 비판을 곧바로 “나는 부족하다”로 번역하면 태양의 불꽃이 급히 작아집니다. ${primaryAspectObject} 만나는 날에는 결론보다 순서를 먼저 세우고, 한 번에 인생 전체를 증명하려는 압박에서 빠져나와야 합니다.`,
      "상담사의 조언": `${rule.advice} 토성의 압박은 태양을 꺼뜨리려는 힘이 아니라 태양이 오래 빛나도록 틀을 만드는 힘입니다. 오늘의 부담을 실패 신호로 보지 말고, 훈련할 순서가 드러난 것으로 읽으십시오.`,
      "실천 과제": `${rule.action} 미룬 책임 하나를 20분 단위로 나누고 첫 조각만 시작하십시오. 중심이 흔들릴 때 필요한 것은 거대한 자신감이 아니라 다시 움직이게 하는 작은 구조입니다.`,
    },
    c2_s5: {
      "핵심 진단": `${sectionTitle}은 태양을 소진시키지 않고 삶의 의미로 확장하는 방법을 말합니다. ${primaryPlanetSubject} 목표의 불씨를 만들고, ${primaryHouseSubject} 배움과 사회적 방향 속에서 그 불씨를 넓힙니다. 여기서는 더 크게 빛나는 법보다 오래 꺼지지 않는 법이 중요합니다.`,
      "차트 근거": `건강한 태양 사용의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 이어지는 자리에는 목표, 성장, 책임, 의미가 함께 놓입니다. ${primaryAspectSubject} 확장과 절제의 균형을 살피게 하므로, 좋은 기회라도 체력과 일정이 받쳐 주는지 함께 보아야 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 목표에 의미가 붙으면 어려운 일도 오래 견디지만, 의미 없이 커지기만 하는 목표는 금방 소진을 부릅니다. 이 태양은 큰 꿈을 가져도 좋지만, 그 꿈이 매일의 일정과 몸의 리듬 안에 내려와야 진짜 힘이 됩니다.`,
      "장점": `${strength} 자신의 빛을 성장과 연결하면 성취가 단순한 결과가 아니라 삶의 방향이 됩니다. ${primaryPlanetAgent} 길을 밝히고 ${primaryHouseAgent} 시야를 넓힐 때, 사람은 더 많은 일을 하기보다 더 의미 있는 일을 고르게 됩니다.`,
      "주의점": `${caution} 확장만 좇으면 일정, 체력, 관계의 균형이 뒤처질 수 있습니다. ${primaryAspectObject} 살필 때는 가능성의 크기와 감당 가능한 속도를 함께 재야 하며, 지금 빛나는 선택이 내일의 소진으로 이어지지 않는지 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 태양의 목표에 목성의 시야를 더하되, 매주 확인할 작은 점검표를 붙이십시오. 별은 큰 방향을 열어 주지만, 그 방향을 삶으로 만드는 것은 반복 가능한 리듬입니다.`,
      "실천 과제": `${rule.action} 목표 하나를 고르고 의미, 일정, 점검 기준을 각각 한 줄로 붙이십시오. 세 줄이 모두 살아 있을 때 태양은 과열되지 않고 안정적으로 빛납니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterThreeConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 3) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryHouseObject = withJosa(primaryHouse, "을", "를");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const strength = finishKoreanSentence(rule.strength, "감정의 흐름을 섬세하게 읽고 회복으로 바꾸는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "감정이 커질수록 사실과 느낌을 구분하는 태도가 필요합니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");

  const blocks = {
    c3_s1: {
      "핵심 진단": `${sectionTitle}은 마음이 어떤 온도로 세상을 받아들이는지 보여 줍니다. ${primaryPlanetSubject} 정서의 물결을 만들고, ${primaryHouseSubject} 그 물결이 관계와 일상의 어느 자리에서 먼저 흔들리는지 알려 줍니다. ${themeObject} 읽을 때는 성격의 좋고 나쁨보다 마음이 반응하는 결을 먼저 살핍니다.`,
      "차트 근거": `감정의 결을 받치는 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 마음의 속도, 안정 욕구, 회복 방식이 한 장면으로 이어집니다. ${primaryAspectSubject} 감정이 부드럽게 흐르는 길과 예민하게 반응하는 지점을 동시에 보여 주므로, 느낌 하나만으로 결론을 내리지 않습니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 실제로는 작은 말투에 오래 마음이 남거나, 공간의 분위기와 사람의 표정에 따라 하루의 에너지가 달라지는 식으로 나타납니다. 이 달은 마음을 약하게 만드는 신호가 아니라, 보이지 않는 흐름을 먼저 알아차리게 하는 감각입니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 살아날수록 사람의 표면보다 그 뒤의 정서를 읽는 힘이 깊어집니다. ${primaryHouseAgent} 감정의 무대가 될 때, 섬세함은 피로가 아니라 상황을 부드럽게 조율하는 재능으로 바뀝니다.`,
      "주의점": `${caution} 기분이 강하게 올라오는 날에는 상대의 의도보다 내 안의 기억이 먼저 반응할 수 있습니다. ${primaryAspectObject} 볼 때는 지금 느낀 감정이 현재 사건에서 온 것인지, 오래된 정서의 잔상인지 구분해야 합니다.`,
      "상담사의 조언": `${rule.advice} 달은 증명하려는 행성이 아니라 보살펴야 하는 내면의 리듬입니다. 감정을 빨리 정리하려 하기보다 이름을 붙이고, 몸의 반응을 확인하고, 마음이 쉬는 장소를 정해 두면 이 달은 훨씬 안정적으로 작동합니다.`,
      "실천 과제": `${rule.action} 오늘 하루의 감정을 한 단어로 적고, 그때 몸에서 먼저 반응한 곳을 함께 적으십시오. 감정 이름과 몸의 신호가 연결될수록 마음은 막연한 파도에서 읽을 수 있는 흐름으로 바뀝니다.`,
    },
    c3_s2: {
      "핵심 진단": `${sectionTitle}은 마음이 안전하다고 느끼는 조건을 구체적으로 알려 줍니다. ${primaryPlanetSubject} 정서적 안정감을 찾고, ${primaryHouseSubject} 돈, 공간, 소유, 관계의 온도를 통해 그 안정감을 현실에 붙입니다. ${sectionSubject} 막연한 편안함이 아니라 생활 속에서 실제로 확인되는 안전의 기준입니다.`,
      "차트 근거": `안정 조건의 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 보면 마음이 쉬는 환경과 만족감이 살아나는 감각이 어디에서 겹치는지 알 수 있습니다. ${primaryAspectSubject} 안정 욕구가 자연스럽게 충족되는 흐름과, 변화 앞에서 움츠러드는 패턴을 함께 보여 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 정돈된 방, 예측 가능한 지출, 다정한 말투, 익숙한 음식처럼 작아 보이는 요소가 마음의 바닥을 만들어 줍니다. 반대로 생활의 기본 감각이 흔들리면 큰 문제가 없어도 이유 없는 불안이 올라올 수 있습니다.`,
      "장점": `${strength} 삶의 작은 아름다움과 질서를 회복의 도구로 쓸 수 있습니다. ${primaryPlanetAgent} 마음의 필요를 알려 주고 ${primaryHouseAgent} 안정의 그릇을 마련하면, 감정은 휘둘림이 아니라 삶을 돌보는 지혜가 됩니다.`,
      "주의점": `${caution} 안정이 중요하다고 해서 모든 변화를 위험으로 읽을 필요는 없습니다. ${primaryAspectObject} 다룰 때는 붙잡아야 할 안정과 놓아도 되는 익숙함을 구분해야 하며, 편안함이 성장 회피로 바뀌지 않는지 살펴야 합니다.`,
      "상담사의 조언": `${rule.advice} 마음이 안정되는 조건은 사람마다 다릅니다. 누군가에게는 공간이고, 누군가에게는 돈의 흐름이며, 누군가에게는 일정한 애정 표현입니다. 이 차트에서는 그 조건을 죄책감 없이 인정하는 것이 회복의 출발점입니다.`,
      "실천 과제": `${rule.action} 집, 돈, 관계 중 오늘 바로 정리할 수 있는 한 영역을 고르십시오. 아주 작은 정리라도 마음이 내려앉는 느낌이 든다면, 그것이 이 달이 요구하는 안정의 언어입니다.`,
    },
    c3_s3: {
      "핵심 진단": `${sectionTitle}은 불안이 올라올 때 마음이 가장 먼저 선택하는 방어 방식을 보여 줍니다. ${primaryPlanetSubject} 감정 신호를 보내고, ${primaryHouseSubject} 일상과 몸의 압력 속에서 그 신호를 크게 느끼게 합니다. 이 항목은 겁을 주기 위한 문장이 아니라 불안의 첫 움직임을 알아차리기 위한 지도입니다.`,
      "차트 근거": `불안 반응의 근거는 ${evidenceLine}입니다. ${evidenceSeed}는 감정, 행동 충동, 책임감이 어떤 순서로 얽히는지 보여 줍니다. ${primaryAspectSubject} 특히 압박이 강해질 때 방어, 지연, 과잉 행동 중 어떤 길로 기울기 쉬운지 알려 주는 중요한 표식입니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 불안해지면 바로 움직이거나, 반대로 미루거나, 상대의 말 속에서 위험 신호를 과하게 찾는 식으로 나타날 수 있습니다. 그 반응은 약점이라기보다 마음이 스스로를 지키려는 오래된 방식입니다.`,
      "장점": `${strength} 불안을 빠르게 감지하는 능력은 위험을 미리 조정하는 감각이 됩니다. ${primaryPlanetAgent} 보내는 신호를 무시하지 않고 ${primaryHouseAgent} 보여 주는 생활 패턴을 함께 보면, 불안은 멈춤이 아니라 조정의 알림으로 바뀝니다.`,
      "주의점": `${caution} 불안을 곧바로 결론으로 바꾸면 실제 선택지가 줄어듭니다. ${primaryAspectObject} 느낄 때는 “지금 위험한가, 아니면 익숙한 긴장인가”를 먼저 묻고, 감정이 행동을 끌고 가기 전에 한 박자 멈추는 훈련이 필요합니다.`,
      "상담사의 조언": `${rule.advice} 달의 신호를 화성처럼 바로 행동으로 옮기기 전에 토성식 확인 질문을 하나 넣으십시오. 지금 필요한 것은 반응인지, 정리인지, 도움 요청인지 구분하면 같은 불안도 훨씬 다르게 다룰 수 있습니다.`,
      "실천 과제": `${rule.action} 불안할 때 가장 먼저 하는 행동을 적고, 그 옆에 대체 행동 하나를 정하십시오. 예를 들어 바로 답장하기 대신 물 한 잔 마시기, 미루기 대신 5분만 시작하기처럼 작고 구체적이어야 합니다.`,
    },
    c3_s4: {
      "핵심 진단": `${sectionTitle}은 친밀한 사람 앞에서 마음이 어떤 기대와 서운함을 드러내는지 보여 줍니다. ${primaryPlanetSubject} 보호받고 싶은 욕구를 만들고, ${primaryHouseSubject} 관계의 거리와 애정 표현 속에서 그 욕구를 시험합니다. 가까운 관계일수록 이 달은 더 솔직하게 반응합니다.`,
      "차트 근거": `관계 속 마음의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 정서적 욕구, 애정의 방식, 상대에게 기대하는 온도가 보입니다. ${primaryAspectSubject} 친밀감이 편안한 돌봄이 되는지, 말하지 않은 기대가 부담으로 쌓이는지 구분하게 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 가까운 사람에게는 작은 무심함도 크게 느껴지고, 다정한 확인 한마디가 오래 마음을 안정시킬 수 있습니다. 마음이 상했을 때 바로 말하지 않고 쌓아 두는 습관이 있다면, 그 침묵도 관계의 중요한 신호입니다.`,
      "장점": `${strength} 관계의 정서적 온도를 읽고 조율하는 힘이 있습니다. ${primaryPlanetAgent} 섬세한 욕구를 알려 주고 ${primaryHouseAgent} 실제 관계 장면을 열어 줄 때, 돌봄은 의존이 아니라 서로의 마음을 안전하게 만드는 능력이 됩니다.`,
      "주의점": `${caution} 말하지 않은 기대가 쌓이면 상대는 이유를 모른 채 부담을 느낄 수 있습니다. ${primaryAspectObject} 만날 때는 상대가 알아주기를 기다리기보다 내가 원하는 온도와 방식을 직접 말하는 연습이 필요합니다.`,
      "상담사의 조언": `${rule.advice} 달의 욕구는 비난이 아니라 요청의 언어로 바꿔야 합니다. “왜 몰라줘”보다 “나는 이런 표현이 있으면 안심돼”라고 말할 때, 이 달은 관계를 흔드는 감정이 아니라 연결을 깊게 하는 신호가 됩니다.`,
      "실천 과제": `${rule.action} 가까운 사람에게 바라는 것 하나를 비난 없이 한 문장으로 정리하십시오. 상대가 당장 들어주지 않아도, 내 욕구를 정확히 말하는 순간 관계의 흐림은 조금씩 맑아집니다.`,
    },
    c3_s5: {
      "핵심 진단": `${sectionTitle}은 감정이 지친 뒤 어떻게 다시 맑아지는지 알려 줍니다. ${primaryPlanetSubject} 마음의 물결을 만들고, ${primaryHouseSubject} 휴식과 침묵, 보이지 않는 정리의 공간을 열어 줍니다. 이 항목에서는 문제 해결보다 먼저 감정의 잔상을 씻어 내는 시간이 중요합니다.`,
      "차트 근거": `회복 방식의 근거는 ${evidenceLine}입니다. ${evidenceSeed}는 정서, 상상력, 고요한 공간이 어떻게 마음을 다시 부드럽게 만드는지 보여 줍니다. ${primaryAspectSubject} 감수성이 선물이 되는 순간과 회피로 흐를 수 있는 순간을 함께 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 혼자 있는 시간, 음악, 물, 글쓰기, 조용한 산책처럼 말로 설명하기 어려운 방식이 마음을 회복시킵니다. 다만 쉬고 있다고 생각했는데 더 흐려진다면, 그것은 회복이 아니라 감정에서 멀어지는 회피일 수 있습니다.`,
      "장점": `${strength} 보이지 않는 마음의 변화를 감지하고 다시 고요함으로 돌아오는 능력이 있습니다. ${primaryPlanetAgent} 느끼는 감정을 ${primaryHouseAgent} 품어 줄 때, 예민함은 지치는 성향이 아니라 깊은 회복력의 통로가 됩니다.`,
      "주의점": `${caution} 회피와 회복은 겉으로 비슷해 보여도 결과가 다릅니다. ${primaryAspectObject} 다룰 때는 쉬고 난 뒤 마음이 맑아졌는지, 아니면 더 미뤄졌는지 확인해야 하며, 감정의 안개 속에 오래 머무르지 않는 기준이 필요합니다.`,
      "상담사의 조언": `${rule.advice} 해왕성의 흐림은 예술과 명상으로 풀고, 달의 요구는 생활 리듬으로 안정시키십시오. 감정을 설명하려 애쓰기보다 조용히 정리할 공간을 마련하면 마음은 스스로 제자리로 돌아옵니다.`,
      "실천 과제": `${rule.action} 잠들기 전 10분 동안 화면을 끄고 오늘 마음에 남은 문장을 하나 적으십시오. 그 문장을 해결하려 하지 말고, 내일 아침에도 같은 무게인지 확인하는 것만으로 충분합니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterFourConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 4) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryHouseObject = withJosa(primaryHouse, "을", "를");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const strength = finishKoreanSentence(rule.strength, "상황에 들어가는 첫 발을 스스로 조율하는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "겉으로 보이는 태도와 실제 마음의 간격을 살펴야 합니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");

  const blocks = {
    c4_s1: {
      "핵심 진단": `${sectionTitle}은 사람들이 나를 처음 감지하는 문턱의 별자리입니다. ${primaryHouseSubject} 외부로 드러나는 표정과 속도를 만들고, ${primaryPlanetSubject} 그 첫 반응에 움직임과 긴장을 더합니다. ${themeObject} 볼 때는 내 마음의 전부가 아니라 세상에 들어가는 첫 자세를 읽어야 합니다.`,
      "차트 근거": `첫인상의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 사람 앞에 설 때의 시선, 말문을 여는 속도, 몸이 먼저 선택하는 거리가 보입니다. ${primaryAspectSubject} 부드럽게 열리는 인상과 조율이 필요한 인상의 경계를 알려 주는 표식입니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 새로운 모임이나 중요한 만남에서 목소리의 높이, 표정의 긴장, 먼저 다가가는 방식으로 나타납니다. 실제 마음은 조심스러워도 겉으로는 강하게 보일 수 있고, 반대로 속은 뜨거운데 겉은 차분하게 읽힐 수도 있습니다.`,
      "장점": `${strength} 첫 발이 정돈되면 관계와 기회가 훨씬 쉽게 열립니다. ${primaryHouseAgent} 무대의 문을 열고 ${primaryPlanetAgent} 행동의 불꽃을 더할 때, 첫인상은 단순한 이미지가 아니라 상황을 유리하게 여는 전략이 됩니다.`,
      "주의점": `${caution} 첫인상이 실제 마음과 다르게 전달되면 상대는 나를 너무 빠르거나, 너무 차갑거나, 너무 강한 사람으로 읽을 수 있습니다. ${primaryAspectObject} 다룰 때는 내가 보내는 신호와 상대가 받는 신호가 같은지 확인하는 태도가 필요합니다.`,
      "상담사의 조언": `${rule.advice} 상승궁은 가면이 아니라 세상과 만나는 입구입니다. 중요한 자리에서는 진짜 마음을 모두 설명하려 하기보다, 처음 30초에 어떤 온도와 속도로 들어갈지 먼저 정하는 편이 좋습니다.`,
      "실천 과제": `${rule.action} 중요한 만남 전에 첫 문장, 표정, 앉는 자세를 미리 정하십시오. 작은 준비만으로도 상승궁은 방어가 아니라 기회를 여는 문이 됩니다.`,
    },
    c4_s2: {
      "핵심 진단": `${sectionTitle}은 낯선 환경에 들어갔을 때 몸과 행동이 선택하는 생존 전략입니다. ${primaryHouseSubject} 환경 진입법을 보여 주고, ${primaryPlanetSubject} 그 안에서 빠르게 움직일지, 살피고 들어갈지, 먼저 거리를 둘지를 알려 줍니다. 여기서는 성격보다 적응의 방식이 핵심입니다.`,
      "차트 근거": `적응 방식의 근거는 ${evidenceLine}입니다. ${evidenceSeed}는 새 환경에서 먼저 켜지는 감각과 일상의 리듬을 보여 줍니다. ${primaryAspectSubject} 맞춰야 할 것과 지켜야 할 것 사이의 긴장을 드러내므로, 무조건 잘 적응하는 것이 답은 아닙니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 처음에는 상대의 분위기를 읽고, 자리의 규칙을 파악하고, 몸이 안전하다고 느끼는 위치를 찾는 식으로 나타납니다. 적응이 빠른 사람도 안쪽 욕구를 놓치면 뒤늦게 피로가 쌓일 수 있습니다.`,
      "장점": `${strength} 상황을 빠르게 읽는 능력은 낯선 자리에서 큰 자산이 됩니다. ${primaryHouseAgent} 방향을 잡고 ${primaryPlanetAgent} 반응 속도를 더하면, 새로운 일도 억지로 버티기보다 자기 방식으로 자리를 찾을 수 있습니다.`,
      "주의점": `${caution} 적응을 너무 잘하려 하면 본래 욕구가 뒤로 밀립니다. ${primaryAspectObject} 만나는 시기에는 남에게 맞추는 행동과 내가 지켜야 할 리듬을 분리해 보아야 오래 지치지 않습니다.`,
      "상담사의 조언": `${rule.advice} 상승궁은 입구이고 태양은 목적입니다. 환경에 들어가는 방식은 유연하게 조정하되, 그 안에서 무엇을 위해 머무는지는 따로 확인해야 합니다.`,
      "실천 과제": `${rule.action} 새로운 일정이나 만남을 앞두고 맞춰야 할 것 세 가지와 지켜야 할 것 세 가지를 나누어 적으십시오. 두 목록이 균형을 이룰 때 적응은 자기 상실이 아니라 현명한 배치가 됩니다.`,
    },
    c4_s3: {
      "핵심 진단": `${sectionTitle}은 내가 의도한 모습과 상대가 읽은 모습 사이의 간격을 보여 줍니다. ${primaryHouseSubject} 겉으로 보이는 태도를 만들고, ${primaryPlanetSubject} 말투와 설명 방식으로 그 이미지를 보완합니다. ${sectionSubject} 관계를 망치는 문제가 아니라 더 정확히 전달해야 할 신호입니다.`,
      "차트 근거": `오해가 생기는 지점은 ${evidenceLine}에서 읽습니다. ${evidenceSeed}가 함께 놓이면 표정, 말투, 관계의 거리감이 서로 다른 방향으로 전달되는 순간이 보입니다. ${primaryAspectSubject} 상대가 어떤 부분을 먼저 받아들이는지 알려 주므로, 해명보다 번역이 중요합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 속으로는 배려한 말이 차갑게 들리거나, 조심스러운 태도가 거리감으로 보일 수 있습니다. 또는 빠른 반응이 성급함으로 읽히고, 침묵이 무관심으로 오해되는 식으로 나타납니다.`,
      "장점": `${strength} 오해를 알아차리면 이미지를 억지로 바꾸지 않고도 관계를 더 섬세하게 조율할 수 있습니다. ${primaryPlanetAgent} 말의 통로를 열고 ${primaryHouseAgent} 보이는 태도를 정리하면, 상대는 나의 의도를 훨씬 쉽게 이해합니다.`,
      "주의점": `${caution} 상대가 읽은 첫인상을 무시하면 설명의 타이밍을 놓칠 수 있습니다. ${primaryAspectObject} 의식할 때는 내 의도가 옳다는 주장보다 상대에게 어떤 신호가 먼저 도착했는지 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 오해는 이미지 실패가 아니라 언어가 덜 붙은 신호입니다. 자주 듣는 평가를 부정하기 전에, 그 평가가 어떤 행동에서 나왔는지 보면 상승궁을 더 건강하게 다룰 수 있습니다.`,
      "실천 과제": `${rule.action} 자주 듣는 오해 하나를 고르고 짧은 설명 문장을 준비하십시오. “내가 차가워 보일 수 있지만 사실은 생각을 정리하는 중입니다”처럼 구체적일수록 좋습니다.`,
    },
    c4_s4: {
      "핵심 진단": `${sectionTitle}은 차트가 몸과 행동을 통해 먼저 말하는 방식을 보여 줍니다. ${primaryHouseSubject} 몸의 긴장과 반응 속도를 드러내고, ${primaryPlanetSubject} 움직임의 강도와 지속 가능한 한계를 알려 줍니다. 마음보다 몸이 먼저 답하는 순간을 읽는 장입니다.`,
      "차트 근거": `몸의 리듬은 ${evidenceLine}에서 확인합니다. ${evidenceSeed}가 함께 움직이면 움직임, 루틴, 피로, 책임감이 어떤 방식으로 연결되는지 보입니다. ${primaryAspectSubject} 추진력과 절제의 균형을 말해 주므로, 단순히 더 밀어붙이는 것이 능사는 아닙니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 걸음의 속도, 말하기 전 숨을 고르는 방식, 긴장하면 굳는 부위, 일이 몰릴 때 생활 루틴이 무너지는 방식으로 나타납니다. 몸은 차트의 가장 솔직한 통역자라서 마음이 괜찮다고 해도 먼저 피로를 드러낼 수 있습니다.`,
      "장점": `${strength} 몸의 신호를 읽으면 선택의 타이밍을 빠르게 조정할 수 있습니다. ${primaryPlanetAgent} 움직임의 불을 켜고 ${primaryHouseAgent} 일상의 그릇을 마련하면, 추진력은 순간 폭발이 아니라 오래 가는 리듬이 됩니다.`,
      "주의점": `${caution} 피로 신호를 무시하면 갑자기 의욕이 꺾이거나 몸이 먼저 멈출 수 있습니다. ${primaryAspectObject} 다룰 때는 의지력보다 회복 간격과 강도 조절을 먼저 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 화성은 움직임을 만들고 토성은 지속 가능한 강도를 정합니다. 행동을 바꾸고 싶다면 마음가짐만 다그치지 말고, 수면, 식사, 움직임처럼 몸이 받아들일 수 있는 리듬부터 손보십시오.`,
      "실천 과제": `${rule.action} 운동, 수면, 식사 중 하나를 골라 7일 동안 같은 시간에 고정하십시오. 몸의 리듬이 잡히면 상승궁의 표현도 덜 방어적이고 더 선명해집니다.`,
    },
    c4_s5: {
      "핵심 진단": `${sectionTitle}은 나를 보여 주는 방식을 의식적인 전략으로 바꾸는 항목입니다. ${primaryHouseSubject} 세상에 들어가는 문을 열고, ${primaryPlanetSubject} 그 문을 어떤 행동과 목표로 이어 갈지 알려 줍니다. ${themeObject} 읽을 때는 이미지 관리가 아니라 기회를 여는 첫 설계를 봅니다.`,
      "차트 근거": `활용법의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 이어지면 첫인상, 차트 룰러, 사회적 방향이 어떻게 연결되는지 보입니다. ${primaryAspectSubject} 나를 보여 주는 방식과 실제 목표가 같은 방향인지 확인하게 해 주는 표식입니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 공개적인 자리, 포트폴리오, 첫 미팅, SNS 프로필, 업무 제안처럼 나를 먼저 보여 주어야 하는 장면에서 힘이 살아납니다. 첫인상과 목표가 맞물리면 설명보다 신뢰가 먼저 생깁니다.`,
      "장점": `${strength} 자신을 보여주는 방식을 전략으로 바꾸면 기회가 더 빠르게 연결됩니다. ${primaryHouseAgent} 문을 열고 ${primaryPlanetAgent} 방향을 실으면, 이미지는 겉치레가 아니라 나의 전문성과 목표를 전달하는 통로가 됩니다.`,
      "주의점": `${caution} 이미지 관리만 앞서면 진짜 목표가 흐려질 수 있습니다. ${primaryAspectObject} 볼 때는 내가 멋져 보이는 방식과 실제로 가고 싶은 방향이 같은지 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 상승궁으로 문을 열고 MC로 방향을 고정하십시오. 첫인상은 순간이지만, 그 순간이 어떤 목표로 이어지는지 정해 두면 사람들은 나를 더 빠르고 정확하게 이해합니다.`,
      "실천 과제": `${rule.action} 이번 달 공개적으로 보여줄 전문성 하나를 정하십시오. 소개 문장, 대표 이미지, 첫 제안을 같은 방향으로 맞추면 상승궁은 운을 부르는 입구가 됩니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterFiveConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 5) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryHouseObject = withJosa(primaryHouse, "을", "를");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const strength = finishKoreanSentence(rule.strength, "개인적 감각을 현실의 선택으로 옮기는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "속도와 욕구가 어긋나면 매력이 피로로 바뀔 수 있습니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");

  const blocks = {
    c5_s1: {
      "핵심 진단": `${sectionTitle}은 생각이 어떤 길로 움직이고 말이 어떤 결로 전달되는지를 보여 줍니다. ${primaryPlanetSubject} 정보를 받아들이는 방식과 표현의 속도를 만들고, ${primaryHouseSubject} 그 말이 실제로 쓰이는 생활 무대를 알려 줍니다. ${themeObject} 볼 때는 지식의 양보다 생각을 정리하고 나누는 방식이 더 중요합니다.`,
      "차트 근거": `사고와 언어의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 학습, 기록, 대화, 업무 처리의 리듬이 보입니다. ${primaryAspectSubject} 말이 쉽게 흐르는 지점과 상대에게 조율해야 할 지점을 동시에 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 실제로는 대화를 준비하는 방식, 정보를 정리하는 습관, 상대의 말을 끊거나 오래 곱씹는 패턴으로 나타납니다. 머릿속에서는 이미 결론이 선명해도 상대는 그 과정을 따라오지 못할 수 있습니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 정돈되면 복잡한 생각도 사람들에게 이해 가능한 구조로 바뀝니다. ${primaryHouseAgent} 말의 현장이 될 때, 지식은 머릿속 재료가 아니라 설득과 협업을 여는 도구가 됩니다.`,
      "주의점": `${caution} 머릿속 속도와 상대의 이해 속도가 다르면 좋은 의도도 차갑거나 날카롭게 들릴 수 있습니다. ${primaryAspectObject} 다룰 때는 정확함만 밀어붙이지 말고, 상대가 받아들일 순서까지 함께 생각해야 합니다.`,
      "상담사의 조언": `${rule.advice} 수성은 말재주보다 사고의 길을 보여 줍니다. 중요한 대화에서는 한 번에 모든 것을 설명하려 하지 말고, 핵심과 근거와 요청을 나누어 말할 때 이 수성이 가장 선명하게 빛납니다.`,
      "실천 과제": `${rule.action} 중요한 대화나 문서를 앞두고 핵심 메시지를 세 문장으로 줄이십시오. 첫 문장은 결론, 둘째 문장은 이유, 셋째 문장은 원하는 다음 행동으로 정리하면 좋습니다.`,
    },
    c5_s2: {
      "핵심 진단": `${sectionTitle}은 내가 무엇에 마음이 열리고 어떤 온도의 사랑을 편안하게 느끼는지 알려 줍니다. ${primaryPlanetSubject} 취향과 끌림의 결을 만들고, ${primaryHouseSubject} 그 취향이 돈, 관계, 즐거움의 장면에서 어떻게 살아나는지 보여 줍니다. ${sectionSubject} 단순한 호불호가 아니라 마음이 부드러워지는 조건입니다.`,
      "차트 근거": `사랑과 취향의 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 함께 보면 좋아하는 분위기, 관계에서 원하는 거리, 자원을 쓰는 방식이 연결됩니다. ${primaryAspectSubject} 끌림이 자연스럽게 열리는 지점과 선택이 흐려질 수 있는 지점을 구분하게 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 사랑에서는 말보다 분위기, 약속보다 온도, 논리보다 편안함이 먼저 작동할 수 있습니다. 물건을 고르는 취향, 시간을 쓰는 방식, 관계에서 반복해서 찾는 느낌이 금성의 언어입니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 건강하게 살아나면 사람과 자원을 부드럽게 끌어당기는 힘이 생깁니다. ${primaryHouseAgent} 만족의 무대가 될 때, 취향은 사치가 아니라 관계와 삶의 질을 정돈하는 감각이 됩니다.`,
      "주의점": `${caution} 좋아함과 안정감을 혼동하면 마음이 끌리는 것과 실제로 나를 편안하게 하는 것을 구분하기 어려워질 수 있습니다. ${primaryAspectObject} 살필 때는 끌림의 강도보다 그 관계가 남기는 몸의 안정감을 함께 보아야 합니다.`,
      "상담사의 조언": `${rule.advice} 금성은 사랑을 고르는 기준이자 삶을 아름답게 느끼는 감각입니다. 내 취향을 부끄러워하지 않되, 그 취향이 나를 소모시키는지 회복시키는지까지 보아야 합니다.`,
      "실천 과제": `${rule.action} 나를 편안하게 하는 취향 세 가지와 피로하게 하는 취향 세 가지를 적으십시오. 두 목록을 비교하면 사랑과 소비에서 반복되는 선택 기준이 드러납니다.`,
    },
    c5_s3: {
      "핵심 진단": `${sectionTitle}은 내가 무엇에 반응해 움직이고 어떤 욕구를 행동으로 옮기는지 보여 줍니다. ${primaryPlanetSubject} 추진력과 경쟁심의 불꽃을 만들고, ${primaryHouseSubject} 그 불꽃이 몸, 일상, 깊은 욕망의 자리에서 어떻게 쓰이는지 알려 줍니다. 이 항목은 분노가 아니라 살아 있는 방향성을 읽는 장입니다.`,
      "차트 근거": `추진력의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 언제 바로 움직이고, 언제 버티며, 어떤 상황에서 공격성이나 회피가 나오는지 보입니다. ${primaryAspectSubject} 에너지가 생산적으로 흐르는 길과 갈등으로 번지는 길을 나누어 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 하고 싶은 일이 생기면 몸이 먼저 반응하거나, 참아 둔 욕구가 어느 순간 강한 말과 행동으로 튀어나올 수 있습니다. 이 에너지는 눌러야 할 문제가 아니라 분명한 출구를 가져야 건강해집니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 살아나면 원하는 것을 실제 행동으로 바꾸는 직접성이 생깁니다. ${primaryHouseAgent} 에너지를 받을 때, 욕망은 충동이 아니라 일을 시작하고 관계의 경계를 세우는 힘이 됩니다.`,
      "주의점": `${caution} 분노와 욕망을 구분하지 못하면 추진력은 곧 갈등이 됩니다. ${primaryAspectObject} 만나는 날에는 바로 반응하기보다 내가 원하는 것이 무엇인지, 지키고 싶은 경계가 무엇인지 먼저 분리해야 합니다.`,
      "상담사의 조언": `${rule.advice} 화성은 오래 설명하기보다 움직일 때 선명해지는 행성입니다. 다만 출구 없는 화성은 날카로워지므로, 짧고 구체적인 실행 단위와 몸을 쓰는 통로가 필요합니다.`,
      "실천 과제": `${rule.action} 미뤄 둔 일을 15분 안에 시작할 수 있는 첫 행동으로 쪼개십시오. 시작이 작을수록 화성은 과열되지 않고 꾸준한 추진력으로 바뀝니다.`,
    },
    c5_s4: {
      "핵심 진단": `${sectionTitle}은 말, 취향, 행동이 합쳐져 다른 사람에게 어떤 인상을 남기는지 보여 줍니다. ${primaryPlanetSubject} 개인 행성의 첫 음색을 만들고, ${primaryHouseSubject} 그 매력이 관계와 표현의 장면에서 드러나는 위치를 알려 줍니다. 매력은 한 가지 장점이 아니라 여러 감각이 같은 방향으로 움직일 때 생깁니다.`,
      "차트 근거": `매력의 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 함께 보면 말투, 분위기, 추진력이 서로 돕는지 따로 움직이는지 알 수 있습니다. ${primaryAspectSubject} 조화롭게 끌리는 지점과 속도 차이로 어긋나는 지점을 보여 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 말은 빠른데 행동이 늦거나, 마음은 따뜻한데 표현이 건조하거나, 추진력은 강한데 취향의 섬세함이 따라오지 않는 식으로 나타날 수 있습니다. 반대로 세 신호가 맞으면 사람들은 자연스럽게 설득됩니다.`,
      "장점": `${strength} 생각과 감정과 행동을 한 방향으로 모을 때 강한 존재감이 생깁니다. ${primaryPlanetAgent} 첫 신호를 만들고 ${primaryHouseAgent} 관계의 무대를 열면, 매력은 꾸민 이미지가 아니라 일관된 에너지로 전달됩니다.`,
      "주의점": `${caution} 세 행성의 속도가 다르면 말은 앞서고 마음이나 행동이 뒤따르지 못할 수 있습니다. ${primaryAspectObject} 볼 때는 내가 보여 주는 매력과 실제로 지속할 수 있는 태도가 같은지 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 수성으로 말하고, 금성으로 분위기를 만들고, 화성으로 약속을 실행하십시오. 이 순서가 살아 있으면 매력은 순간적인 호감이 아니라 신뢰로 이어집니다.`,
      "실천 과제": `${rule.action} 이번 주 나의 매력을 보여 줄 말, 태도, 행동을 각각 하나씩 정하십시오. 세 가지가 같은 메시지를 향할수록 사람들은 나를 더 분명하게 기억합니다.`,
    },
    c5_s5: {
      "핵심 진단": `${sectionTitle}은 타고난 감각을 실제 성과로 옮기는 방법을 말합니다. ${primaryPlanetSubject} 기술과 감각의 재료를 만들고, ${primaryHouseSubject} 그 재료가 일, 수익, 사회적 역할 속에서 쓰일 자리를 알려 줍니다. ${themeObject} 볼 때는 재능의 크기보다 반복 가능한 사용법이 핵심입니다.`,
      "차트 근거": `재능 현실화의 근거는 ${evidenceLine}입니다. ${evidenceSeed}는 기술, 취향, 실행, 확장이 어떤 순서로 배치될 때 성과가 나는지 보여 줍니다. ${primaryAspectSubject} 재능을 쉽게 펼치는 길과 조급함으로 흔들리는 길을 구분하게 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 좋아하는 일은 많지만 수익이나 결과로 이어지지 않거나, 능력은 있는데 보여 줄 형태가 부족한 식으로 나타날 수 있습니다. 재능은 발견보다 배치가 중요하고, 반복 가능한 구조가 생길 때 현실의 언어가 됩니다.`,
      "장점": `${strength} 개인적 감각을 일과 수익의 언어로 바꾸는 능력이 있습니다. ${primaryPlanetAgent} 재료를 제공하고 ${primaryHouseAgent} 실행 무대를 열면, 재능은 막연한 가능성이 아니라 포트폴리오와 서비스와 성과로 정리됩니다.`,
      "주의점": `${caution} 재능을 빨리 증명하려는 마음이 루틴을 흔들 수 있습니다. ${primaryAspectObject} 다룰 때는 결과를 서두르기보다 기술, 감각, 실행, 확장의 순서를 지키는 것이 더 안전합니다.`,
      "상담사의 조언": `${rule.advice} 수성의 기술, 금성의 감각, 화성의 실행, 목성의 확장을 순서대로 배치하십시오. 좋은 재능도 순서가 없으면 흩어지고, 작은 재능도 구조가 있으면 현실에서 커집니다.`,
      "실천 과제": `${rule.action} 재능 하나를 서비스, 포트폴리오, 학습 계획 중 하나로 구체화하십시오. 이름을 붙이고, 대상과 형식과 반복 주기를 정하면 별의 감각은 현실의 결과로 내려옵니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterSixConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 6) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryHouseObject = withJosa(primaryHouse, "을", "를");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const strength = finishKoreanSentence(rule.strength, "긴 흐름을 현실의 성장 과제로 바꾸는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "장기 행성의 압력을 개인 탓으로만 돌리지 않는 균형이 필요합니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");

  const blocks = {
    c6_s1: {
      "핵심 진단": `${sectionTitle}는 삶이 어디에서 넓어지고 어떤 문을 통해 더 큰 가능성으로 이어지는지 보여 줍니다. ${primaryPlanetSubject} 확장과 신뢰의 방향을 만들고, ${primaryHouseSubject} 그 기회가 현실에서 열리는 무대를 알려 줍니다. ${themeObject} 읽을 때는 운이 좋다는 말보다 어디에 선택적으로 문을 열어야 하는지가 핵심입니다.`,
      "차트 근거": `확장의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 배움, 이동, 사람, 공개 무대 중 어디에서 시야가 넓어지는지 보입니다. ${primaryAspectSubject} 기회가 자연스럽게 커지는 지점과 약속이 과해질 수 있는 지점을 동시에 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 새로운 배움이 들어오거나, 더 넓은 사람들과 연결되거나, 공개적으로 역할이 커지는 방식으로 나타날 수 있습니다. 다만 목성의 문은 많기 때문에 모든 문을 다 열면 힘이 흩어집니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 살아나면 작은 경험도 더 큰 가능성으로 자랍니다. ${primaryHouseAgent} 확장의 장면이 될 때, 낙관성은 막연한 기대가 아니라 사람과 기회를 연결하는 넓은 시야가 됩니다.`,
      "주의점": `${caution} 기회가 많을수록 시간, 돈, 약속이 분산될 수 있습니다. ${primaryAspectObject} 살필 때는 커지는 흐름이 실제 감당 가능한지 확인해야 하며, 좋은 제안도 나의 방향과 맞지 않으면 정중히 거르는 지혜가 필요합니다.`,
      "상담사의 조언": `${rule.advice} 목성은 무조건 많이 가지라는 신호가 아니라 성장할 방향을 보여 주는 등불입니다. 지금은 확장할 영역 하나를 고르고, 그 안에서 경험을 쌓아 운을 현실로 내려오게 해야 합니다.`,
      "실천 과제": `${rule.action} 확장하고 싶은 영역 하나를 정하고 30일 실험 계획을 세우십시오. 사람, 배움, 공개 활동 중 하나만 골라 집중하면 목성의 기회가 훨씬 선명해집니다.`,
    },
    c6_s2: {
      "핵심 진단": `${sectionTitle}는 삶이 반복해서 시험하는 자리와 오래 남는 실력이 만들어지는 방식을 보여 줍니다. ${primaryPlanetSubject} 책임과 시간의 압력을 만들고, ${primaryHouseSubject} 그 책임을 실제 루틴과 사회적 구조 속에 배치합니다. 이 항목은 막힘의 예언이 아니라 훈련 순서를 읽는 장입니다.`,
      "차트 근거": `책임의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 반복되는 부담, 기준을 세워야 하는 영역, 신뢰가 쌓이는 경로가 보입니다. ${primaryAspectSubject} 무겁게 느껴지는 압력이 어디에서 실력으로 바뀔 수 있는지 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 같은 종류의 과제가 반복되거나, 책임이 늘어날수록 자신에게 더 엄격해지는 방식으로 나타날 수 있습니다. 느리게 가는 듯해도 토성의 길에서는 꾸준히 지킨 기준이 결국 가장 강한 증거가 됩니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 건강하게 작동하면 시간을 들여 구조를 세우고 신뢰를 쌓는 능력이 살아납니다. ${primaryHouseAgent} 훈련의 무대가 될 때, 부담은 무게가 아니라 오래가는 실력의 뼈대가 됩니다.`,
      "주의점": `${caution} 책임을 곧 자기비난으로 받아들이면 성장 속도가 더 느려집니다. ${primaryAspectObject} 만나는 시기에는 내가 부족하다는 결론보다 어떤 순서를 훈련해야 하는지 먼저 보아야 합니다.`,
      "상담사의 조언": `${rule.advice} 토성은 금지선이 아니라 기준선입니다. 지금 필요한 것은 더 큰 각오가 아니라 작게라도 반복해서 지킬 수 있는 약속입니다.`,
      "실천 과제": `${rule.action} 반복해야 할 책임 하나를 체크리스트로 바꾸십시오. 완료 여부를 매일 확인하면 토성의 압박은 불안이 아니라 신뢰의 기록으로 바뀝니다.`,
    },
    c6_s3: {
      "핵심 진단": `${sectionSubject} 익숙한 틀을 벗어나 새 방식으로 숨을 쉬고 싶은 지점을 보여 줍니다. ${primaryPlanetSubject} 독립성과 전환의 전류를 만들고, ${primaryHouseSubject} 그 변화가 자아와 공동체의 어느 장면에서 일어나는지 알려 줍니다. 여기서는 무작정 떠나는 충동보다 새로운 실험의 방향을 봅니다.`,
      "차트 근거": `변화 욕구의 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 함께 보면 갑작스러운 전환, 독립 욕구, 새로운 관계망이 어디에서 열리는지 알 수 있습니다. ${primaryAspectSubject} 변화가 해방이 되는 지점과 신뢰를 흔들 수 있는 지점을 구분하게 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 갑자기 방식을 바꾸고 싶거나, 익숙한 역할에서 빠져나오고 싶거나, 새로운 사람들과 연결되고 싶은 충동으로 나타날 수 있습니다. 그 충동은 문제라기보다 오래된 틀이 더 이상 맞지 않는다는 신호일 수 있습니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 살아나면 기존의 답이 막힌 자리에서 전혀 다른 길을 찾는 힘이 생깁니다. ${primaryHouseAgent} 실험의 무대가 될 때, 독립성은 고립이 아니라 더 넓은 가능성으로 가는 문이 됩니다.`,
      "주의점": `${caution} 변화 욕구가 강할수록 관계나 일의 신뢰를 흔들지 않도록 순서를 잡아야 합니다. ${primaryAspectObject} 다룰 때는 한 번에 모든 것을 뒤집기보다 작은 실험으로 결과를 확인하는 편이 안전합니다.`,
      "상담사의 조언": `${rule.advice} 천왕성의 변화는 파괴가 아니라 갱신입니다. 다만 갱신도 리듬이 필요하므로, 바꾸고 싶은 것을 실험 단위로 줄이면 자유와 안정이 함께 살아납니다.`,
      "실천 과제": `${rule.action} 바꾸고 싶은 습관 하나를 7일 실험으로만 실행하십시오. 성공 여부보다 몸과 관계와 일의 리듬이 어떻게 달라지는지 관찰하는 것이 핵심입니다.`,
    },
    c6_s4: {
      "핵심 진단": `${sectionTitle}은 영감과 혼란이 같은 물결 안에서 움직이는 영역을 보여 줍니다. ${primaryPlanetSubject} 보이지 않는 분위기와 이상을 키우고, ${primaryHouseSubject} 그 흐림이 꿈, 신념, 회복의 자리에서 어떻게 작용하는지 알려 줍니다. 이 항목은 신비함을 현실에서 잃지 않게 다루는 법입니다.`,
      "차트 근거": `영감의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 직관, 상상력, 믿음, 경계의 흐림이 어디에서 강해지는지 보입니다. ${primaryAspectSubject} 아름다운 가능성과 착각의 가능성을 동시에 비추는 표식입니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 어떤 분위기를 말보다 먼저 느끼거나, 아직 증거가 부족한 가능성에 마음이 먼저 끌릴 수 있습니다. 예술, 명상, 꿈, 종교적 감각은 살아나지만 약속, 돈, 관계에서는 현실 확인이 늦어질 수 있습니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 건강하게 열리면 보이지 않는 의미와 분위기를 읽는 감수성이 깊어집니다. ${primaryHouseAgent} 상상력의 무대가 될 때, 직관은 흐릿한 기대가 아니라 삶을 부드럽게 이끄는 영감이 됩니다.`,
      "주의점": `${caution} 경계가 흐려지면 좋은 마음으로 시작한 일이 약속과 책임을 흐리게 만들 수 있습니다. ${primaryAspectObject} 다룰 때는 느낌을 존중하되 결정은 날짜, 금액, 행동 기준으로 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 해왕성의 영감은 기록하고, 결정은 현실의 숫자로 확인하십시오. 신비로운 감각을 버릴 필요는 없지만, 그 감각이 삶을 흐리게 하지 않도록 그릇을 만들어야 합니다.`,
      "실천 과제": `${rule.action} 막연한 기대 하나를 날짜, 금액, 행동 기준으로 바꾸십시오. 문장으로 내려온 꿈은 더 이상 안개가 아니라 다룰 수 있는 길이 됩니다.`,
    },
    c6_s5: {
      "핵심 진단": `${sectionTitle}는 삶의 깊은 층에서 끝내야 할 것과 다시 태어나야 할 것을 보여 줍니다. ${primaryPlanetSubject} 통제, 집착, 재생의 힘을 만들고, ${primaryHouseSubject} 그 힘이 공유 자원, 심리 변화, 사회적 역할 속에서 어떻게 작용하는지 알려 줍니다. 이 항목은 두려움보다 근본적 변화를 읽습니다.`,
      "차트 근거": `심층 변화의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 오래 붙잡은 방식, 강한 욕망, 바꾸기 어려운 패턴이 어느 자리에서 반복되는지 보입니다. ${primaryAspectSubject} 통제하려는 힘과 다시 살아나는 힘을 동시에 드러냅니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 어떤 관계나 목표를 놓지 못하거나, 한 번 시작한 일을 끝까지 파고드는 방식으로 나타날 수 있습니다. 깊이 들어가는 힘은 강력하지만, 모든 것을 내 뜻대로 붙잡으려 할 때 마음과 관계가 경직됩니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 성숙하게 쓰이면 표면을 넘어서 근본을 바꾸는 힘이 생깁니다. ${primaryHouseAgent} 변화의 무대가 될 때, 위기는 무너짐이 아니라 오래된 껍질을 벗기는 과정이 됩니다.`,
      "주의점": `${caution} 모든 것을 통제하려 하면 관계와 마음이 함께 굳어집니다. ${primaryAspectObject} 만나는 시기에는 붙잡아야 할 것과 끝내야 할 것을 구분하고, 힘으로 밀어붙이기보다 의식적으로 내려놓는 연습이 필요합니다.`,
      "상담사의 조언": `${rule.advice} 명왕성의 변화는 억누른다고 사라지지 않습니다. 오래된 패턴을 정확히 보고, 그 패턴을 대신할 새로운 방식을 선택할 때 깊은 변화는 파괴가 아니라 재생이 됩니다.`,
      "실천 과제": `${rule.action} 붙잡고 있는 오래된 방식 하나를 정하고 대체 방식을 쓰십시오. 끝내는 행동이 작아도, 반복하면 명왕성의 압력은 삶을 새롭게 만드는 힘으로 바뀝니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterSevenConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 7) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryHouseObject = withJosa(primaryHouse, "을", "를");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const strength = finishKoreanSentence(rule.strength, "삶의 무대를 현실적으로 정돈하는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "생활 영역의 욕구가 과하거나 약해질 때 균형을 확인해야 합니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");

  const blocks = {
    c7_s1: {
      "핵심 진단": `${sectionTitle}은 내가 삶에 처음 들어서는 방식과 자기 존재감을 보여 줍니다. ${primaryHouseSubject} 몸, 태도, 시작의 리듬을 만들고, ${primaryPlanetSubject} 그 리듬에 목적과 추진력을 더합니다. ${themeObject} 볼 때는 “나는 어떤 사람인가”보다 “나는 어떻게 시작하는가”를 먼저 봅니다.`,
      "차트 근거": `자기표현의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 몸의 반응, 첫 행동, 주도권을 잡는 방식이 보입니다. ${primaryAspectSubject} 새 장면을 열어 가는 힘과 조율해야 할 자기표현의 강도를 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 새로운 일을 시작할 때 몸이 먼저 긴장하거나, 반대로 빠르게 앞으로 나서는 방식으로 나타납니다. 이 하우스는 외모만이 아니라 삶을 향해 첫 걸음을 놓는 방식 전체를 말합니다.`,
      "장점": `${strength} ${primaryHouseAgent} 살아나면 새 장면을 스스로 열어 가는 추진력이 생깁니다. ${primaryPlanetAgent} 방향을 더하면 자기표현은 충동이 아니라 삶을 시작하는 힘이 됩니다.`,
      "주의점": `${caution} 자기표현이 과하면 관계의 균형이 흔들리고, 너무 약하면 원하는 방향을 놓칠 수 있습니다. ${primaryAspectObject} 볼 때는 첫 반응의 속도와 강도를 조정하는 것이 중요합니다.`,
      "상담사의 조언": `${rule.advice} 1하우스는 나를 증명하는 무대가 아니라 나를 시작하게 하는 문입니다. 첫 행동을 작게 정하고 몸이 따라올 수 있는 속도로 움직일 때 자기감이 안정됩니다.`,
      "실천 과제": `${rule.action} 새로운 일을 시작할 때 첫 10분 루틴을 고정하십시오. 같은 방식으로 문을 열면 몸은 더 빨리 안전을 느끼고 행동도 선명해집니다.`,
    },
    c7_s2: {
      "핵심 진단": `${sectionTitle}은 돈을 벌고 쓰고 지키는 방식 안에 담긴 가치관을 보여 줍니다. ${primaryHouseSubject} 자원과 안정의 무대를 만들고, ${primaryPlanetSubject} 그 안에서 좋아하는 것과 키우고 싶은 가능성을 드러냅니다. 여기서는 수입의 크기보다 내가 무엇을 귀하게 여기는지가 핵심입니다.`,
      "차트 근거": `가치와 자원의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 돈, 소유, 재능, 만족감이 어떤 기준으로 움직이는지 보입니다. ${primaryAspectSubject} 자원을 안정시키는 흐름과 불안 소비로 흐를 수 있는 지점을 구분하게 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 돈을 쓸 때 마음이 편해지는 영역과 괜히 보상받고 싶어지는 영역이 다르게 나타납니다. 이 하우스는 통장만 보는 자리가 아니라 자존감과 생존 감각이 만나는 자리입니다.`,
      "장점": `${strength} ${primaryHouseAgent} 안정되면 자신의 자원을 차분히 키우는 감각이 살아납니다. ${primaryPlanetAgent} 만족과 확장의 방향을 더하면 돈은 불안의 대상이 아니라 삶의 기준을 세우는 도구가 됩니다.`,
      "주의점": `${caution} 불안할 때 소비나 보상으로 마음을 달래는 패턴을 조심해야 합니다. ${primaryAspectObject} 다룰 때는 지금 쓰는 돈이 가치에 맞는지, 감정을 덮기 위한 지출인지 구분해야 합니다.`,
      "상담사의 조언": `${rule.advice} 2하우스는 수입만이 아니라 나를 지탱하는 기준을 묻습니다. 돈의 흐름을 볼 때는 숫자와 함께 마음이 안전해지는 방식도 같이 보아야 합니다.`,
      "실천 과제": `${rule.action} 이번 달 지출을 가치, 습관, 불안 소비로 나누어 기록하십시오. 분류만 해도 자원이 새는 자리와 키워야 할 자리가 분명해집니다.`,
    },
    c7_s3: {
      "핵심 진단": `${sectionTitle}은 삶의 뿌리와 마음이 돌아갈 곳의 질을 보여 줍니다. ${primaryHouseSubject} 집, 가족, 내면의 안전감을 만들고, ${primaryPlanetSubject} 그 안에 감정과 책임의 기억을 남깁니다. ${sectionSubject} 과거에 머무는 장이 아니라 내가 다시 힘을 얻는 기반을 읽는 장입니다.`,
      "차트 근거": `내면 기반의 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 함께 보면 가족 기억, 공간의 분위기, 마음이 쉬는 조건이 보입니다. ${primaryAspectSubject} 안정된 기반이 되는 지점과 과거의 감정 기준이 현재를 제한하는 지점을 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 집이 어수선하면 마음도 흔들리거나, 가족의 말 한마디가 오래 남는 방식으로 나타날 수 있습니다. 반대로 작은 공간 정리만으로도 외부 활동의 힘이 회복됩니다.`,
      "장점": `${strength} ${primaryHouseAgent} 안정되면 외부 성과도 오래 유지됩니다. ${primaryPlanetAgent} 내면의 리듬을 알려 줄 때, 집과 마음은 도망칠 곳이 아니라 다시 서기 위한 뿌리가 됩니다.`,
      "주의점": `${caution} 과거의 감정 기준이 현재 선택을 제한할 수 있습니다. ${primaryAspectObject} 만나는 때에는 가족이나 과거에서 배운 반응이 지금의 나에게도 필요한지 다시 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 4하우스는 돌아갈 곳의 질을 묻습니다. 공간만 정리하는 것이 아니라 마음이 쉴 수 있는 기준을 함께 세울 때 삶의 뿌리가 깊어집니다.`,
      "실천 과제": `${rule.action} 집 안에서 회복감을 주는 자리 하나를 정리하십시오. 그 자리가 작아도 마음이 돌아갈 수 있는 장소가 생기면 외부의 흔들림을 견디는 힘이 커집니다.`,
    },
    c7_s4: {
      "핵심 진단": `${sectionSubject} 내가 어떤 상대에게 끌리고 어떤 관계 태도를 배워야 하는지 보여 줍니다. ${primaryHouseSubject} 중요한 상대와 합의의 무대를 만들고, ${primaryPlanetSubject} 그 안에 끌림과 갈등의 온도를 더합니다. 관계는 상대를 통해 나를 더 정확히 보는 거울이 됩니다.`,
      "차트 근거": `관계의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 끌림, 약속, 거리, 협상의 방식이 드러납니다. ${primaryAspectSubject} 가까워지는 힘과 충돌하는 힘이 어디에서 생기는지 알려 주는 표식입니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 강하게 끌리지만 동시에 부딪히거나, 상대에게 기대한 역할이 커질수록 실망도 커지는 식으로 나타날 수 있습니다. 이 하우스는 상대의 성격보다 내가 관계 안에서 배우는 균형을 말합니다.`,
      "장점": `${strength} ${primaryHouseAgent} 열리면 상대를 통해 자신을 더 정확히 이해하는 힘이 생깁니다. ${primaryPlanetAgent} 애정과 행동의 온도를 더할 때, 관계는 의존이 아니라 서로를 비추는 성장의 장이 됩니다.`,
      "주의점": `${caution} 상대에게 기대한 역할이 커질수록 실망도 커질 수 있습니다. ${primaryAspectObject} 다룰 때는 상대가 해 주길 바라는 것과 내가 관계 안에서 책임져야 할 태도를 나누어 보아야 합니다.`,
      "상담사의 조언": `${rule.advice} 7하우스는 내가 찾는 상대와 내가 배워야 할 관계 태도를 함께 보여 줍니다. 좋은 관계는 나를 대신 완성해 주는 사람이 아니라, 나의 균형을 더 정확하게 보게 하는 사람에게서 열립니다.`,
      "실천 과제": `${rule.action} 관계에서 원하는 것과 양보할 수 없는 것을 각각 세 가지 적으십시오. 두 목록이 분명해질수록 관계의 선택도 덜 흔들립니다.`,
    },
    c7_s5: {
      "핵심 진단": `${sectionTitle}은 사회에서 어떤 이름으로 남고 싶은지와 어떤 책임을 맡아야 하는지 보여 줍니다. ${primaryHouseSubject} 직업과 명예의 무대를 만들고, ${primaryPlanetSubject} 그 무대에 목적, 책임, 확장의 방향을 더합니다. 여기서는 직업명보다 사회적 역할의 결을 봅니다.`,
      "차트 근거": `사회적 역할의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 인정받는 방식, 책임의 크기, 성과가 쌓이는 경로가 보입니다. ${primaryAspectSubject} 공개적으로 힘을 얻는 지점과 외부 평가에 흔들릴 수 있는 지점을 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 직함, 프로젝트, 공개 이미지, 책임지는 영역에서 강하게 드러납니다. 타인이 나를 어떤 역할로 기억하는지와 내가 정말 맡고 싶은 역할이 일치할수록 성취가 안정됩니다.`,
      "장점": `${strength} ${primaryHouseAgent} 선명해지면 성과와 신뢰가 쌓입니다. ${primaryPlanetAgent} 방향과 기준을 더하면 직업은 생계만이 아니라 내 이름을 세상에 남기는 방식이 됩니다.`,
      "주의점": `${caution} 외부 평가에만 맞추면 실제 소명과 멀어질 수 있습니다. ${primaryAspectObject} 볼 때는 칭찬받는 역할과 오래 맡고 싶은 역할이 같은지 반드시 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} MC와 10하우스는 직업의 방향, 책임, 공개 이미지를 함께 묻습니다. 무엇을 잘하느냐보다 어떤 이름으로 신뢰받고 싶은지 정하면 길이 더 빨리 정리됩니다.`,
      "실천 과제": `${rule.action} 내가 맡고 싶은 사회적 역할을 한 문장으로 써 보십시오. 그 문장이 분명할수록 일의 선택과 거절도 훨씬 쉬워집니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterEightConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 8) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const strength = finishKoreanSentence(rule.strength, "각도의 긴장과 흐름을 의식적으로 다루는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "각도를 좋고 나쁨으로만 판단하면 실제 성장 지점을 놓칠 수 있습니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");

  const blocks = {
    c8_s1: {
      "핵심 진단": `${sectionTitle}은 힘을 많이 주지 않아도 자연스럽게 풀리는 재능의 길을 보여 줍니다. ${primaryAspectSubject} 별들이 서로 협력하는 통로이고, ${primaryPlanetSubject} 그 통로에 빛과 가능성을 더합니다. ${themeObject} 볼 때는 편안함 속에 숨어 있는 훈련 가능한 강점을 찾아야 합니다.`,
      "차트 근거": `조화각의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 재능이 쉽게 흐르는 행성과 생활 무대가 보입니다. ${primaryHouseSubject} 그 재능이 실제로 쓰일 장면을 알려 주므로, 감각을 결과로 옮길 길도 함께 읽어야 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 남보다 쉽게 이해하거나, 자연스럽게 사람을 설득하거나, 준비 없이도 잘 풀리는 영역으로 나타납니다. 하지만 너무 쉬운 재능은 자신에게 당연해 보여서 오히려 개발이 늦어질 수 있습니다.`,
      "장점": `${strength} ${primaryAspectSubject} 무리하지 않아도 흐름을 만들어 내는 능력을 줍니다. ${primaryPlanetAgent} 그 흐름을 밝히고 ${primaryHouseAgent} 무대를 제공할 때, 재능은 운 좋은 순간이 아니라 반복 가능한 강점이 됩니다.`,
      "주의점": `${caution} 편안한 각도는 방치하면 잠재력으로만 남을 수 있습니다. ${primaryAspectObject} 볼 때는 “잘되는 것”에서 끝내지 말고, 이 흐름을 어디에 훈련하고 축적할지 정해야 합니다.`,
      "상담사의 조언": `${rule.advice} 조화각은 선물처럼 보이지만 훈련할 때 비로소 실력이 됩니다. 쉽게 하는 일을 더 쉽게 넘기지 말고, 의식적으로 이름 붙이고 연습하면 차트의 은총이 현실의 재능으로 굳어집니다.`,
      "실천 과제": `${rule.action} 쉽게 하는 일 하나를 골라 의도적인 연습 과제로 격상하십시오. 시간, 기준, 결과물을 정하면 조화각은 감각이 아니라 경력이 됩니다.`,
    },
    c8_s2: {
      "핵심 진단": `${sectionTitle}는 반복해서 불편함을 일으키는 각도가 어떤 성장 근육을 요구하는지 보여 줍니다. ${primaryAspectSubject} 별들 사이의 압력이고, ${primaryPlanetSubject} 그 압력을 행동과 책임의 과제로 드러냅니다. 이 항목은 실패의 표시가 아니라 실력이 압축되는 자리입니다.`,
      "차트 근거": `긴장각의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 어떤 욕구와 책임이 충돌하는지, 어느 생활 무대에서 같은 문제가 반복되는지 보입니다. ${primaryHouseSubject} 그 갈등을 현실에서 다루어야 할 장소를 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 같은 유형의 갈등이 반복되거나, 압박이 커질수록 몸과 마음이 먼저 굳는 방식으로 나타날 수 있습니다. 그러나 이 긴장은 제대로 다루면 가장 단단한 전문성과 자기 통제력으로 바뀝니다.`,
      "장점": `${strength} ${primaryAspectSubject} 견디고 조율할수록 실력을 압축합니다. ${primaryPlanetAgent} 긴장의 에너지를 만들고 ${primaryHouseAgent} 훈련의 무대를 열면, 불편한 과제는 삶의 가장 강한 근육이 됩니다.`,
      "주의점": `${caution} 긴장을 실패로 해석하면 중요한 훈련을 피하게 됩니다. ${primaryAspectObject} 만날 때는 문제를 없애려 하기보다 순서, 역할, 대체 행동을 만들어야 합니다.`,
      "상담사의 조언": `${rule.advice} 긴장각은 다루는 순서가 생길 때 재능으로 바뀝니다. 압박을 느낄 때마다 같은 반응을 반복하지 말고, 원인과 반응과 대체 행동을 분리해 보십시오.`,
      "실천 과제": `${rule.action} 반복 갈등 하나를 원인, 반응, 대체 행동으로 나누어 쓰십시오. 세 칸이 채워지면 긴장각은 막연한 불안이 아니라 훈련 가능한 구조가 됩니다.`,
    },
    c8_s3: {
      "핵심 진단": `${sectionTitle}은 생각, 감정, 행동의 속도가 서로 다를 때 생기는 내적 마찰을 보여 줍니다. ${primaryAspectSubject} 안쪽의 두 힘이 서로 다른 방향을 당기는 지점이고, ${primaryPlanetSubject} 그 갈등을 말과 행동의 문제로 드러냅니다. 갈등을 없애기보다 역할을 나누는 것이 핵심입니다.`,
      "차트 근거": `내면 갈등의 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 함께 보면 마음은 무엇을 원하고, 생각은 어떻게 해석하며, 행동은 어디로 튀어나가는지 보입니다. ${primaryHouseSubject} 갈등이 실제 생활에서 나타나는 장면을 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 머리로는 이해했는데 마음이 따라오지 않거나, 감정은 진정되지 않았는데 행동이 먼저 나가는 식으로 나타납니다. 이때 중요한 것은 어느 하나가 틀렸다고 정하는 것이 아니라 각 신호가 맡은 역할을 구분하는 일입니다.`,
      "장점": `${strength} 자기 안의 충돌을 의식하면 선택의 정밀도가 올라갑니다. ${primaryAspectSubject} 불편한 질문을 던질수록, 사람은 더 섬세하게 감정과 생각과 행동을 분리할 수 있습니다.`,
      "주의점": `${caution} 갈등을 빨리 없애려 하면 오히려 같은 패턴이 반복됩니다. ${primaryAspectObject} 다룰 때는 결론보다 분류가 먼저이고, 지금 필요한 것이 공감인지 판단인지 행동인지 따로 보아야 합니다.`,
      "상담사의 조언": `${rule.advice} 달은 감정, 수성은 해석, 화성은 행동을 맡습니다. 한 행성이 모든 답을 내리게 하지 말고, 각자의 목소리를 따로 들으면 내적 갈등은 훨씬 덜 위협적으로 느껴집니다.`,
      "실천 과제": `${rule.action} 갈등 상황에서 감정, 생각, 행동을 따로 적는 연습을 하십시오. 세 줄을 분리하면 당장 해결되지 않아도 선택의 정확도가 올라갑니다.`,
    },
    c8_s4: {
      "핵심 진단": `${sectionTitle}는 가까운 관계에서 왜 같은 끌림과 방어가 반복되는지 보여 줍니다. ${primaryAspectSubject} 관계 안에서 반응을 깨우는 각도이고, ${primaryPlanetSubject} 애정, 욕구, 안정감의 언어를 함께 건드립니다. 상대의 문제만이 아니라 내 반응의 구조를 읽어야 합니다.`,
      "차트 근거": `관계 어스펙트의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 끌림, 갈등, 안정 욕구가 어떤 순서로 올라오는지 보입니다. ${primaryHouseSubject} 관계의 깊이와 합의가 실제로 시험되는 장면을 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 강하게 끌리면서도 방어가 올라오거나, 가까워질수록 사소한 말에 민감해지는 방식으로 나타날 수 있습니다. 이 패턴을 상대 탓으로만 보면 반복되는 반응을 놓치게 됩니다.`,
      "장점": `${strength} 관계의 반복 장면을 이해하면 더 성숙한 합의가 가능합니다. ${primaryAspectSubject} 긴장과 끌림을 동시에 보여 주기 때문에, 욕구와 경계와 요청을 분리할수록 관계는 덜 소모적이 됩니다.`,
      "주의점": `${caution} 상대 탓으로만 보면 자신의 반응 패턴을 놓칠 수 있습니다. ${primaryAspectObject} 다룰 때는 상대가 무엇을 했는지와 내가 어떤 오래된 반응으로 응답했는지를 함께 보아야 합니다.`,
      "상담사의 조언": `${rule.advice} 금성, 화성, 달의 각을 보면 사랑의 욕구와 갈등 방식과 안정 조건이 분리됩니다. 관계가 흔들릴 때는 감정을 바로 결론으로 만들지 말고 세 언어를 따로 말해 보십시오.`,
      "실천 과제": `${rule.action} 관계 갈등 하나를 욕구, 경계, 요청으로 나누어 말해 보십시오. 같은 내용도 구조가 생기면 비난이 아니라 합의의 문장이 됩니다.`,
    },
    c8_s5: {
      "핵심 진단": `${sectionTitle}은 불편한 압박을 어떻게 실력과 전문성으로 바꿀지 보여 줍니다. ${primaryAspectSubject} 반복되는 마찰의 각도이고, ${primaryPlanetSubject} 그 마찰을 실행과 책임의 훈련으로 밀어 올립니다. 이 항목은 상처를 설명하는 장이 아니라 대응 루틴을 만드는 장입니다.`,
      "차트 근거": `긴장 전환의 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 보면 자주 막히는 문제와 그 문제가 성과로 바뀔 수 있는 생활 무대가 보입니다. ${primaryHouseSubject} 훈련이 쌓일 실제 장소를 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 압박이 반복되는 영역에서 처음에는 피로와 저항이 크지만, 같은 문제를 다루는 매뉴얼이 생기면 누구보다 강한 전문성이 됩니다. 어려움이 반복된다는 것은 그만큼 기술화할 재료가 많다는 뜻이기도 합니다.`,
      "장점": `${strength} ${primaryAspectSubject} 불편한 과제를 반복 가능한 기술로 바꾸는 힘을 줍니다. ${primaryPlanetAgent} 압력을 만들고 ${primaryHouseAgent} 훈련의 장면을 제공할 때, 긴장은 감정 소모가 아니라 성과의 엔진이 됩니다.`,
      "주의점": `${caution} 성급한 해결보다 꾸준한 구조화가 필요합니다. ${primaryAspectObject} 볼 때는 한 번에 완벽히 넘어서려 하지 말고, 같은 문제에 같은 방식으로 대응할 수 있는 루틴을 만드는 것이 중요합니다.`,
      "상담사의 조언": `${rule.advice} 긴장각마다 대응 루틴을 만들면 감정 소모가 성과로 전환됩니다. 어려운 각도를 없애려고 하기보다 다루는 기술을 만들 때, 차트의 압력은 가장 강한 전문성이 됩니다.`,
      "실천 과제": `${rule.action} 자주 막히는 문제 하나에 대응 매뉴얼을 세 단계로 만드십시오. 시작 신호, 첫 행동, 마무리 기준을 정하면 긴장각은 더 이상 같은 방식으로 당신을 흔들지 못합니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterNineConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 9) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const strength = finishKoreanSentence(rule.strength, "관계의 감정과 선택을 더 성숙하게 다루는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "끌림과 안정, 기대와 약속을 구분해야 관계가 덜 흔들립니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");

  const blocks = {
    c9_s1: {
      "핵심 진단": `${sectionTitle}은 마음이 열리는 순간과 실제로 다가가는 속도를 보여 줍니다. ${primaryPlanetSubject} 사랑의 취향과 욕구를 만들고, ${primaryHouseSubject} 설렘과 만남의 장면을 열어 줍니다. ${themeObject} 볼 때는 내가 좋아하는 사람보다 내가 사랑을 시작할 때 어떤 사람이 되는지를 봅니다.`,
      "차트 근거": `사랑의 시작은 ${evidenceLine}에서 읽습니다. ${evidenceSeed}가 함께 놓이면 설렘, 행동, 관계의 무대가 어떤 순서로 움직이는지 보입니다. ${primaryAspectSubject} 끌림을 행동으로 옮기는 방식과 조율해야 할 속도를 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 어떤 사람 앞에서는 먼저 말하고 싶어지고, 어떤 사람 앞에서는 오래 관찰하고 싶어질 수 있습니다. 감정은 빨리 열려도 관계의 준비는 늦을 수 있으므로 시작의 속도를 아는 것이 중요합니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 마음을 열고 ${primaryHouseAgent} 설렘의 장면을 마련하면, 사랑은 막연한 감정이 아니라 움직임을 가진 선택이 됩니다.`,
      "주의점": `${caution} 감정의 속도와 관계의 준비도가 다르면 상대가 부담을 느끼거나 내가 먼저 지칠 수 있습니다. ${primaryAspectObject} 볼 때는 끌림의 강도와 실제 다가갈 타이밍을 나누어 보아야 합니다.`,
      "상담사의 조언": `${rule.advice} 금성은 마음이 열리는 조건을, 화성은 다가가는 방식을 보여 줍니다. 둘이 같은 속도로 움직일 때 사랑은 더 자연스럽게 시작됩니다.`,
      "실천 과제": `${rule.action} 좋아하는 사람 앞에서 반복되는 행동과 피하고 싶은 행동을 적으십시오. 그 차이가 사랑을 시작할 때의 진짜 속도를 알려 줍니다.`,
    },
    c9_s2: {
      "핵심 진단": `${sectionTitle}는 내가 어떤 정서와 분위기에 마음을 맡기고 싶어 하는지 보여 줍니다. ${primaryPlanetSubject} 끌림의 색을 만들고, ${primaryHouseSubject} 상대에게 기대하는 관계의 형태를 알려 줍니다. 여기서는 외적인 조건보다 마음이 안심하는 분위기를 읽습니다.`,
      "차트 근거": `끌림의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 취향, 정서적 안정, 상대상이 어떤 색으로 겹치는지 보입니다. ${primaryAspectSubject} 끌림과 안정이 같은 방향인지, 서로 다른 방향인지 확인하게 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 어떤 사람에게는 즉각적으로 매력을 느끼지만 오래 있으면 피곤하고, 어떤 사람에게는 천천히 마음이 편안해질 수 있습니다. 이 차이를 알면 관계 선택이 훨씬 덜 흔들립니다.`,
      "장점": `${strength} 자신에게 맞는 관계 분위기를 감지하는 섬세함이 있습니다. ${primaryPlanetAgent} 취향의 문을 열고 ${primaryHouseAgent} 상대의 장면을 마련하면, 끌림은 순간의 반응을 넘어 관계의 질을 읽는 감각이 됩니다.`,
      "주의점": `${caution} 끌림과 안정이 다를 때 선택이 흔들릴 수 있습니다. ${primaryAspectObject} 다룰 때는 마음이 두근거리는 사람과 오래 편안한 사람의 차이를 솔직하게 보아야 합니다.`,
      "상담사의 조언": `${rule.advice} 금성의 취향, 달의 안정 조건, 7하우스의 상대상을 함께 보십시오. 사랑은 끌림만으로도, 안정만으로도 완성되지 않습니다.`,
      "실천 과제": `${rule.action} 끌리는 사람과 오래 편한 사람의 차이를 구체적으로 적으십시오. 두 목록이 겹치는 지점이 관계에서 가장 중요한 기준입니다.`,
    },
    c9_s3: {
      "핵심 진단": `${sectionTitle}은 비슷한 관계 장면이 왜 되풀이되는지 보여 줍니다. ${primaryPlanetSubject} 애정과 욕구, 책임의 신호를 만들고, ${primaryHouseSubject} 그 반복이 친밀감과 경계의 자리에서 어떻게 나타나는지 알려 줍니다. 반복은 운명이 아니라 아직 정리되지 않은 관계 언어입니다.`,
      "차트 근거": `반복 패턴의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 기대, 거리감, 책임의 문제가 어떤 순서로 돌아오는지 보입니다. ${primaryAspectSubject} 익숙한 갈등을 촉발하는 각도이므로, 상대보다 먼저 내 반응의 구조를 확인해야 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 비슷한 유형의 사람에게 끌리거나, 같은 말다툼이 반복되거나, 약속과 거리의 문제에서 같은 상처가 되살아날 수 있습니다. 그러나 반복을 알아차리는 순간 관계는 새롭게 선택될 수 있습니다.`,
      "장점": `${strength} 반복을 알아차리면 관계를 새롭게 선택할 수 있습니다. ${primaryPlanetAgent} 욕구의 색을 보여 주고 ${primaryHouseAgent} 깊은 관계의 무대를 열 때, 패턴은 더 이상 무의식적 반복이 아니라 배울 수 있는 장면이 됩니다.`,
      "주의점": `${caution} 익숙한 갈등을 운명처럼 받아들이지 말아야 합니다. ${primaryAspectObject} 볼 때는 “왜 또 이런 사람인가”보다 “나는 어떤 기대를 반복하고 있는가”를 물어야 합니다.`,
      "상담사의 조언": `${rule.advice} 토성의 관계 과제는 경계와 약속을 명확히 할 때 풀립니다. 관계의 안정은 감정만으로 만들어지지 않고, 서로가 이해할 수 있는 기준에서 자랍니다.`,
      "실천 과제": `${rule.action} 반복되는 관계 장면 하나를 내가 기대한 것과 상대가 받은 것으로 나누어 쓰십시오. 두 문장이 다르면 갈등의 핵심이 드러납니다.`,
    },
    c9_s4: {
      "핵심 진단": `${sectionTitle}은 설렘이 지나간 뒤 관계가 오래 유지되기 위해 필요한 실제 조건을 보여 줍니다. ${primaryPlanetSubject} 감정과 애정의 온도를 만들고, ${primaryHouseSubject} 관계와 내면의 안전감을 연결합니다. 오래 가는 사랑은 강한 감정이 아니라 반복해서 지킬 수 있는 조건에서 자랍니다.`,
      "차트 근거": `지속성의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 안정감, 취향, 책임이 관계 안에서 어떻게 균형을 이루는지 보입니다. ${primaryAspectSubject} 지속을 돕는 약속과 놓치기 쉬운 현실 조건을 함께 보여 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 함께 쉬는 방식, 돈과 시간의 기준, 감정을 확인하는 말, 갈등 뒤 회복하는 속도에서 관계의 지속성이 드러납니다. 설렘이 줄어든 뒤에도 남는 생활 조건이 진짜 관계의 뼈대가 됩니다.`,
      "장점": `${strength} 감정과 약속을 현실적으로 조율하는 힘이 있습니다. ${primaryPlanetAgent} 마음의 온도를 만들고 ${primaryHouseAgent} 안전한 기반을 열면, 사랑은 순간의 감정보다 오래가는 생활의 리듬이 됩니다.`,
      "주의점": `${caution} 설렘만으로 지속성을 판단하면 중요한 조건을 놓칠 수 있습니다. ${primaryAspectObject} 다룰 때는 애정 표현, 생활 리듬, 책임 기준이 함께 맞는지 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 달의 안정감과 토성의 약속 기준을 금성의 애정 표현과 함께 맞추십시오. 오래 가는 사랑은 서로를 좋아하는 마음과 함께 현실을 돌보는 힘을 필요로 합니다.`,
      "실천 과제": `${rule.action} 오래 가는 관계에 필요한 생활 조건 세 가지를 정리하십시오. 감정, 시간, 돈, 공간 중 어디가 맞아야 편안한지 구체적으로 적는 것이 좋습니다.`,
    },
    c9_s5: {
      "핵심 진단": `${sectionTitle}은 좋은 마음을 오래 유지 가능한 관계 습관으로 바꾸는 방법입니다. ${primaryPlanetSubject} 애정 표현과 대화와 약속의 품질을 만들고, ${primaryHouseSubject} 관계와 미래 계획의 무대를 열어 줍니다. 성숙한 사랑은 감정이 식지 않는 상태가 아니라 계속 조율하는 능력입니다.`,
      "차트 근거": `성숙한 유지법은 ${evidenceLine}에서 읽습니다. ${evidenceSeed}가 함께 놓이면 말, 애정 표현, 책임 기준이 관계를 얼마나 안정적으로 붙잡는지 보입니다. ${primaryAspectSubject} 오해가 생기기 쉬운 지점과 약속으로 안정시킬 지점을 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 좋은 마음이 있어도 대화를 미루면 오해가 커지고, 애정 표현이 있어도 약속이 약하면 신뢰가 흔들릴 수 있습니다. 관계는 감정의 크기보다 확인하는 리듬에서 오래 갑니다.`,
      "장점": `${strength} 관계를 관리 가능한 리듬으로 만드는 능력이 있습니다. ${primaryPlanetAgent} 사랑의 언어를 만들고 ${primaryHouseAgent} 함께 걸어갈 방향을 열면, 애정은 막연한 기대가 아니라 실천 가능한 약속이 됩니다.`,
      "주의점": `${caution} 좋은 마음만 믿고 대화와 합의를 미루면 오해가 커집니다. ${primaryAspectObject} 볼 때는 지금 말하지 않으면 쌓일 감정과 지금 정하면 편해질 기준을 구분해야 합니다.`,
      "상담사의 조언": `${rule.advice} 수성으로 말하고 금성으로 표현하며 토성으로 약속을 지키십시오. 세 가지가 함께 있을 때 사랑은 감정의 파도에만 의존하지 않고 성숙한 관계가 됩니다.`,
      "실천 과제": `${rule.action} 관계에서 정기적으로 확인할 대화 질문 세 가지를 만드십시오. 안부, 기대, 약속을 주기적으로 확인하면 사랑은 더 안전한 리듬을 얻습니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterTenConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 10) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const strength = finishKoreanSentence(rule.strength, "직업적 방향을 현실의 성과로 연결하는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "성과와 안정, 인정과 소명의 균형을 함께 살펴야 합니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");

  const blocks = {
    c10_s1: {
      "핵심 진단": `${sectionTitle}은 내가 어떤 역할로 사회에 서고 싶은지 보여 줍니다. ${primaryPlanetSubject} 직업적 목적과 책임의 축을 만들고, ${primaryHouseSubject} 그 방향이 실제 업무와 사회적 무대에서 어떻게 드러나는지 알려 줍니다. ${themeObject} 볼 때는 직업명보다 역할의 방향을 먼저 봅니다.`,
      "차트 근거": `직업 방향의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 하고 싶은 일, 맡아야 할 일, 커질 수 있는 일이 어떻게 갈라지는지 보입니다. ${primaryAspectSubject} 목표와 책임 사이의 조율 지점을 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 일상 실무에서 반복되는 역할과 공개적으로 인정받고 싶은 모습이 만나는 곳에서 직업 방향이 선명해집니다. 명예, 안정, 성장, 자유 중 무엇을 우선하는지가 선택을 좌우합니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 목적을 세우고 ${primaryHouseAgent} 실무의 무대를 열면, 직업은 생계만이 아니라 사회에서 맡을 이름이 됩니다.`,
      "주의점": `${caution} 명예와 안정 중 무엇을 우선하는지 흐려지면 선택이 늦어집니다. ${primaryAspectObject} 볼 때는 좋아 보이는 기회와 실제 책임질 수 있는 역할을 분리해야 합니다.`,
      "상담사의 조언": `${rule.advice} MC, 태양, 토성, 목성을 함께 보며 하고 싶은 일과 맡아야 할 일을 구분하십시오. 두 기준이 겹치는 지점이 가장 오래 갈 직업 방향입니다.`,
      "실천 과제": `${rule.action} 직업 선택 기준을 성장, 안정, 인정, 자유 네 항목으로 점수화하십시오. 점수가 높은 항목이 현재 직업 판단의 실제 중심입니다.`,
    },
    c10_s2: {
      "핵심 진단": `${sectionTitle}은 사람들이 나를 어떤 성과와 태도로 신뢰하는지 보여 줍니다. ${primaryPlanetSubject} 공개 무대에서 빛나는 힘을 만들고, ${primaryHouseSubject} 사회적 인정과 공동체의 반응을 연결합니다. 인정은 단순한 칭찬이 아니라 내가 어떤 가치로 기억되는지의 문제입니다.`,
      "차트 근거": `인정 방식의 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 함께 보면 영향력, 공개 이미지, 넓어지는 기회가 어디에서 살아나는지 보입니다. ${primaryAspectSubject} 보여 줄 성과와 실제 전문성의 균형을 확인하게 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 발표, 결과물, 추천, 네트워크, 공개된 성과를 통해 신뢰가 쌓입니다. 사람들은 결과만이 아니라 그 결과를 다루는 태도와 일관성까지 함께 봅니다.`,
      "장점": `${strength} 공개 무대에서 영향력을 키우는 힘이 있습니다. ${primaryPlanetAgent} 확장성을 주고 ${primaryHouseAgent} 인정의 무대를 만들면, 나의 성과는 더 넓은 사람들에게 전달됩니다.`,
      "주의점": `${caution} 인정 욕구가 과하면 실제 전문성 축적이 흔들릴 수 있습니다. ${primaryAspectObject} 다룰 때는 보여 주기 위한 결과와 실력이 쌓이는 결과를 구분해야 합니다.`,
      "상담사의 조언": `${rule.advice} 목성의 확장성과 MC의 공개 이미지를 맞춰 보여 줄 성과를 선택하십시오. 지금은 많은 것을 보이기보다 대표할 수 있는 하나를 선명하게 만드는 편이 좋습니다.`,
      "실천 과제": `${rule.action} 이번 달 외부에 보여 줄 결과물 하나를 정하십시오. 완성도, 대상, 공개 방식까지 정하면 인정의 흐름이 더 현실적으로 열립니다.`,
    },
    c10_s3: {
      "핵심 진단": `${sectionTitle}은 일을 잘하게 되는 실제 과정과 업무 안에서 강해지는 능력을 보여 줍니다. ${primaryPlanetSubject} 생각, 실행, 책임의 재료를 만들고, ${primaryHouseSubject} 그 재료가 일상 업무와 성과의 구조로 굳어지는 무대를 알려 줍니다.`,
      "차트 근거": `업무 재능의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 준비, 실행, 검토 중 어느 단계에서 강점이 살아나는지 보입니다. ${primaryAspectSubject} 능률을 높이는 흐름과 과부하가 생기는 지점을 함께 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 생각을 정리하고, 필요한 일을 시작하고, 마감까지 책임지는 과정에서 재능이 커집니다. 재능은 감각만이 아니라 일을 끝까지 운반하는 방식에서 확인됩니다.`,
      "장점": `${strength} 일의 구조를 만들고 마감까지 밀어붙이는 능력이 있습니다. ${primaryPlanetAgent} 기술과 추진력을 만들고 ${primaryHouseAgent} 실무 무대를 열면, 능력은 말이 아니라 결과로 증명됩니다.`,
      "주의점": `${caution} 모든 일을 혼자 책임지려 하면 생산성이 떨어집니다. ${primaryAspectObject} 볼 때는 내가 직접 해야 할 일과 위임하거나 시스템화할 일을 나누어야 합니다.`,
      "상담사의 조언": `${rule.advice} 수성의 기술, 화성의 추진력, 토성의 지속력을 업무 흐름으로 나누십시오. 한 사람이 모든 역할을 동시에 하려 하면 재능도 쉽게 지칩니다.`,
      "실천 과제": `${rule.action} 가장 잘하는 업무를 준비, 실행, 검토 단계로 문서화하십시오. 문서화된 재능은 반복 가능한 전문성이 됩니다.`,
    },
    c10_s4: {
      "핵심 진단": `${sectionTitle}은 직업에서 성과를 흔들 수 있는 리스크를 미리 보여 줍니다. ${primaryPlanetSubject} 기준, 모호함, 속도의 문제를 만들고, ${primaryHouseSubject} 그 문제가 일상 업무와 공개 책임에서 어떻게 커지는지 알려 줍니다. 위험을 보는 이유는 겁내기 위해서가 아니라 장기 성과를 지키기 위해서입니다.`,
      "차트 근거": `직업 리스크의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 책임 과부하, 목표 흐림, 성급한 추진이 어디에서 겹치는지 보입니다. ${primaryAspectSubject} 반복되는 업무 압박과 조율해야 할 약속을 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 모호한 요청을 받고도 기준을 확인하지 않거나, 무리한 마감을 받아들이거나, 급하게 시작했다가 책임이 커지는 방식으로 나타날 수 있습니다.`,
      "장점": `${strength} 위험을 일찍 감지하면 장기 성과를 지킬 수 있습니다. ${primaryPlanetAgent} 경고 신호를 만들고 ${primaryHouseAgent} 업무의 무대를 보여 줄 때, 리스크 관리는 두려움이 아니라 전문성의 일부가 됩니다.`,
      "주의점": `${caution} 모호한 약속과 무리한 마감을 동시에 잡지 않아야 합니다. ${primaryAspectObject} 만나는 때에는 좋은 기회처럼 보여도 조건, 책임자, 마감, 보상 기준을 먼저 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 토성은 기준을, 해왕성은 모호함을, 화성은 속도를 점검하게 합니다. 세 신호를 따로 보면 직업적 위험은 훨씬 빨리 발견됩니다.`,
      "실천 과제": `${rule.action} 현재 업무에서 모호한 약속 하나를 명확한 조건으로 바꾸십시오. 누가, 언제, 무엇을, 어떤 기준으로 끝낼지 문장으로 남기면 리스크가 줄어듭니다.`,
    },
    c10_s5: {
      "핵심 진단": `${sectionTitle}은 커지는 기회를 오래 남는 성과와 보상으로 바꾸는 방법입니다. ${primaryPlanetSubject} 확장과 기준의 축을 만들고, ${primaryHouseSubject} 돈과 사회적 성과의 연결 지점을 보여 줍니다. 성공은 한 번의 기회가 아니라 유지 가능한 구조에서 커집니다.`,
      "차트 근거": `현실 전략의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 가능성, 책임, 보상 기준이 어떤 순서로 정리되어야 하는지 보입니다. ${primaryAspectSubject} 빠른 확장과 안정적 유지 사이의 균형을 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 좋은 기회가 들어와도 비용, 시간, 인력, 보상 구조가 정리되지 않으면 오래 남지 않습니다. 반대로 작은 기회라도 구조가 분명하면 점점 커질 수 있습니다.`,
      "장점": `${strength} 기회를 구조화해 실질적 보상으로 바꾸는 힘이 있습니다. ${primaryPlanetAgent} 가능성을 열고 ${primaryHouseAgent} 보상의 무대를 만들면, 성공은 감탄이 아니라 지속 가능한 결과가 됩니다.`,
      "주의점": `${caution} 빠른 확장만 좇으면 유지 비용이 커질 수 있습니다. ${primaryAspectObject} 다룰 때는 성장 속도와 감당 가능한 자원, 실제 보상 기준을 함께 확인해야 합니다.`,
      "상담사의 조언": `${rule.advice} 목성으로 가능성을 열고 토성으로 기준을 세우며 2하우스로 보상을 점검하십시오. 성공의 크기보다 유지 가능한 구조가 더 오래 갑니다.`,
      "실천 과제": `${rule.action} 성공 목표 하나에 비용, 시간, 보상 기준을 붙이십시오. 숫자로 내려온 목표는 더 이상 막연한 꿈이 아니라 관리 가능한 전략이 됩니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterElevenConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 11) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const timing = asObject(ctx?.timingInsights);
  const currentTransit = clean(timing.currentSummary) || "출생 차트의 장기 리듬을 기준으로 현재 흐름을 보완합니다";
  const nextTransit = clean(timing.ninetyDaySummary) || currentTransit;
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const strength = finishKoreanSentence(rule.strength, "시기 신호를 현실 선택으로 번역하는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "운의 흐름을 과장하거나 두려워하지 않는 균형이 필요합니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");
  const currentLine = `현재 트랜짓은 ${currentTransit}입니다.`;
  const nextLine = `전개 포인트는 ${nextTransit}입니다.`;

  const blocks = {
    c11_s1: {
      "핵심 진단": `${sectionTitle}는 지금 삶에서 무엇을 넓히고 무엇을 점검해야 하는지 보여 줍니다. ${primaryPlanetSubject} 확장과 책임의 시기 신호를 만들고, ${primaryHouseSubject} 그 흐름이 배움과 사회적 역할 속에서 드러나는 무대를 알려 줍니다. ${currentLine}`,
      "차트 근거": `현재 운의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 목성적 기회와 토성적 점검이 어디에서 만나는지 보입니다. ${primaryAspectSubject} 지금 강하게 반응하는 출생 차트의 민감 지점을 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 확장하고 싶은 일과 책임져야 할 일이 동시에 올라올 수 있습니다. ${nextLine} 이 흐름은 단순히 좋은 운이나 나쁜 운이 아니라, 행동 강도를 조절하라는 별의 시간표에 가깝습니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 시기 신호를 열고 ${primaryHouseAgent} 실제 무대를 마련하면, 운은 막연한 분위기가 아니라 우선순위를 정하는 도구가 됩니다.`,
      "주의점": `${caution} 좋은 흐름도 준비가 없으면 부담으로 바뀔 수 있습니다. ${primaryAspectObject} 볼 때는 확장할 일과 줄일 일을 함께 정해야 합니다.`,
      "상담사의 조언": `${rule.advice} 지금은 넓히는 힘과 단단히 점검하는 힘을 동시에 써야 합니다. 목성의 문을 열되 토성의 기준 없이 들어가지는 마십시오.`,
      "실천 과제": `${rule.action} 확장할 일 하나와 줄일 일 하나를 같은 종이에 적으십시오. 두 선택을 함께 해야 현재 운이 과열되지 않고 현실의 진전으로 바뀝니다.`,
    },
    c11_s2: {
      "핵심 진단": `${sectionTitle}는 가까운 시간 안에 가볍게 열릴 수 있는 문을 보여 줍니다. ${primaryPlanetSubject} 기회와 호감의 신호를 만들고, ${primaryHouseSubject} 그 기회가 배움, 표현, 사람의 장면에서 열릴 수 있음을 알려 줍니다. ${nextLine}`,
      "차트 근거": `기회의 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 보면 연락, 신청, 공개, 만남 중 어디에서 흐름이 열릴지 읽을 수 있습니다. ${primaryAspectSubject} 기회가 출생 차트의 어떤 욕구와 연결되는지 보여 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 새로운 제안, 가벼운 만남, 배우고 싶은 주제, 공개 활동의 기회로 나타날 수 있습니다. ${currentLine} 지금은 큰 결론보다 열린 문을 작게 통과해 보는 태도가 좋습니다.`,
      "장점": `${strength} 기회가 왔을 때 빠르게 연결하는 감각이 살아납니다. ${primaryPlanetAgent} 문을 열고 ${primaryHouseAgent} 경험의 무대를 만들면, 작은 시도가 다음 흐름을 불러옵니다.`,
      "주의점": `${caution} 기회를 모두 잡으려 하면 집중력이 흩어집니다. ${primaryAspectObject} 다룰 때는 즐거워 보이는 일 중에서도 실제로 연결될 가능성이 높은 일을 고르는 편이 좋습니다.`,
      "상담사의 조언": `${rule.advice} 목성과 금성의 흐름이 닿는 영역을 우선순위로 선택하십시오. 좋은 기회는 많이 잡는 사람이 아니라 제때 응답하는 사람에게 오래 남습니다.`,
      "실천 과제": `${rule.action} 앞으로 30일 안에 연락, 신청, 공개 중 하나를 실행하십시오. 작게 열어 둔 문이 다음 90일의 방향을 알려 줄 것입니다.`,
    },
    c11_s3: {
      "핵심 진단": `${sectionTitle}은 조심해야 할 압력과 무리하지 말아야 할 변화를 보여 줍니다. ${primaryPlanetSubject} 한계, 속도, 모호함의 신호를 만들고, ${primaryHouseSubject} 그 부담이 일상, 건강, 회복의 영역에서 나타날 수 있음을 알려 줍니다. ${currentLine}`,
      "차트 근거": `주의 흐름의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 속도를 내야 할 일과 멈춰야 할 일을 구분할 수 있습니다. ${primaryAspectSubject} 변화가 부담으로 느껴지는 민감 지점을 보여 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 무리한 추진, 모호한 약속, 체력 저하가 함께 오면 작은 변화도 부담스럽게 느껴질 수 있습니다. ${nextLine} 이때 필요한 것은 모든 변화를 막는 것이 아니라 중단 기준을 세우는 일입니다.`,
      "장점": `${strength} 주의 구간을 알면 손실을 줄이고 회복을 빠르게 만들 수 있습니다. ${primaryPlanetAgent} 경고 신호를 보내고 ${primaryHouseAgent} 현실의 무대를 알려 줄 때, 조심은 두려움이 아니라 관리 능력이 됩니다.`,
      "주의점": `${caution} 불안 때문에 모든 변화를 막으면 필요한 전환도 늦어집니다. ${primaryAspectObject} 볼 때는 위험한 변화와 필요한 변화를 구분해야 합니다.`,
      "상담사의 조언": `${rule.advice} 속도는 화성, 한계는 토성, 모호함은 해왕성 기준으로 따로 점검하십시오. 한 문장으로 뭉뚱그리면 흐름을 놓치기 쉽습니다.`,
      "실천 과제": `${rule.action} 다가오는 변화 하나에 대비책과 중단 기준을 함께 정하십시오. 언제 멈출지 알아야 필요한 변화도 안전하게 진행할 수 있습니다.`,
    },
    c11_s4: {
      "핵심 진단": `${sectionTitle}은 사람과 역할이 동시에 재배치되는 시점을 보여 줍니다. ${primaryPlanetSubject} 관계의 감정과 책임의 신호를 만들고, ${primaryHouseSubject} 합의와 사회적 역할의 무대를 열어 줍니다. ${currentLine}`,
      "차트 근거": `전환점의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 관계에서 다시 협의할 조건과 일에서 다시 정리할 책임이 보입니다. ${primaryAspectSubject} 전환점이 감정 문제인지 역할 문제인지 구분하게 합니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 가까운 사람과의 약속, 업무 역할, 공개 책임이 동시에 흔들릴 수 있습니다. ${nextLine} 이 시기에는 관계 감정과 업무 판단을 한 문장으로 섞지 않는 것이 중요합니다.`,
      "장점": `${strength} 전환점에서 관계와 책임을 새롭게 합의하는 힘이 살아납니다. ${primaryPlanetAgent} 감정과 행동의 온도를 만들고 ${primaryHouseAgent} 합의의 장면을 열면, 변화는 갈등이 아니라 재계약의 기회가 됩니다.`,
      "주의점": `${caution} 관계 감정과 업무 판단을 섞으면 결론이 흐려질 수 있습니다. ${primaryAspectObject} 다룰 때는 사람에게 느낀 감정과 역할에서 필요한 조건을 따로 적어야 합니다.`,
      "상담사의 조언": `${rule.advice} 7하우스의 합의와 10하우스의 책임을 분리해 판단하십시오. 관계를 지키려면 감정만이 아니라 조건도 정직해야 합니다.`,
      "실천 과제": `${rule.action} 관계와 일에서 각각 다시 협의해야 할 조건을 하나씩 적으십시오. 두 조건을 분리하면 전환점이 훨씬 덜 혼란스럽습니다.`,
    },
    c11_s5: {
      "핵심 진단": `${sectionTitle}은 계산된 시기 신호를 실제 행동 계획으로 바꾸는 방법입니다. ${primaryPlanetSubject} 확장, 점검, 기록의 흐름을 만들고, ${primaryHouseSubject} 그 흐름이 학습과 사회적 역할 안에서 쓰일 자리를 알려 줍니다. ${currentLine}`,
      "차트 근거": `활용법의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 어떤 흐름을 기록하고, 무엇을 선택하고, 언제 점검해야 하는지 보입니다. ${primaryAspectSubject} 운을 현실로 붙잡는 행동 단위를 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} ${nextLine} 좋은 흐름이 와도 기록하지 않으면 지나가고, 어려운 흐름도 기준을 세우면 관리할 수 있습니다. 운은 해석으로 끝날 때보다 일정표에 들어갈 때 힘을 냅니다.`,
      "장점": `${strength} 좋은 흐름을 기록, 선택, 실행으로 바꾸는 능력이 살아납니다. ${primaryPlanetAgent} 시기 신호를 만들고 ${primaryHouseAgent} 실행 무대를 제공하면, 운은 추상적 예감이 아니라 관리 가능한 계획이 됩니다.`,
      "주의점": `${caution} 막연한 기대만으로는 흐름을 붙잡기 어렵습니다. ${primaryAspectObject} 볼 때는 기대, 실행, 점검을 나누어 실제 행동으로 번역해야 합니다.`,
      "상담사의 조언": `${rule.advice} 목성은 확장 계획, 토성은 점검 주기, 수성은 기록 체계로 사용하십시오. 운을 믿는 것과 운을 활용하는 것은 다릅니다.`,
      "실천 과제": `${rule.action} 90일 계획을 시작, 확장, 점검 단계로 나누십시오. 각 단계에 날짜와 확인 기준을 붙이면 시기 신호가 현실의 길이 됩니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildChapterTwelveConsultingParagraph(ctx = {}) {
  const chapterNo = Number(ctx?.chapter?.order || ctx?.chapter?.chapterNo || 0);
  if (chapterNo !== 12) return "";
  const sectionId = clean(ctx?.rule?.id || ctx?.section?.id);
  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const timing = asObject(ctx?.timingInsights);
  const currentTransit = clean(timing.currentSummary) || "출생 차트의 장기 리듬을 기준으로 현재 흐름을 보완합니다";
  const longTransit = clean(timing.threeYearSummary || timing.ninetyDaySummary || timing.currentSummary) || currentTransit;
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryPlanetAgent = withJosa(primaryPlanet, "이", "가");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryHouseAgent = withJosa(primaryHouse, "이", "가");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const theme = sentenceCore(rule.theme || sectionTitle);
  const themeObject = withJosa(theme, "을", "를");
  const advice = clean(rule.advice).replace(/\bMC\b/g, "천정점");
  const strength = finishKoreanSentence(rule.strength, "차트의 여러 신호를 하나의 선택 기준으로 묶는 힘이 살아납니다");
  const caution = finishKoreanSentence(rule.caution, "한 가지 흐름만으로 삶 전체를 단정하지 않는 균형이 필요합니다");
  const evidenceSeed = evidenceList.slice(0, 3).join(", ");
  const currentLine = `현재 트랜짓은 ${currentTransit}입니다.`;
  const longLine = `중장기 전개는 ${longTransit}입니다.`;

  const blocks = {
    c12_s1: {
      "핵심 진단": `${sectionSubject} 이 리포트 전체를 하나의 나침반으로 묶는 마지막 문장입니다. ${primaryPlanetSubject} 삶의 중심 의지를 비추고, ${primaryHouseSubject} 그 의지가 현실에서 맡아야 할 역할을 보여 줍니다. ${themeObject} 붙잡을수록 선택의 기준이 단순해집니다.`,
      "차트 근거": `최종 메시지의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 태양의 목적, 달의 정서, 상승궁의 첫인상, 천정점의 방향이 서로 다른 목소리가 아니라 하나의 문장으로 모입니다. ${primaryAspectSubject} 그 문장을 흔들리게 하거나 더 선명하게 만드는 장력입니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 어떤 날은 마음이 먼저 움직이고, 어떤 날은 책임이 먼저 앞설 수 있습니다. 그러나 반복해서 남는 선택의 결은 대체로 비슷합니다. 편안함만 고를 때보다 의미와 역할이 동시에 살아나는 길에서 차트의 중심이 가장 잘 깨어납니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 중심을 세우고 ${primaryHouseAgent} 현실 무대를 열면, 여러 고민이 흩어진 조각이 아니라 같은 별자리의 지도처럼 읽힙니다. 그때 결정은 빠른 반응보다 깊은 정렬에 가까워집니다.`,
      "주의점": `${caution} 일시적인 실패나 관계의 흔들림을 인생 전체의 결론으로 확대하면 차트의 큰 방향을 놓치기 쉽습니다. ${primaryAspectObject} 다룰 때는 감정의 파도와 삶의 방향을 분리해서 보아야 합니다.`,
      "상담사의 조언": `${advice} 최종 기준은 거창한 선언보다 매일 되돌아올 수 있는 한 문장이어야 합니다. 당신이 계속 잃지 말아야 할 빛, 지켜야 할 마음, 맡아야 할 역할을 같은 문장 안에 놓으십시오.`,
      "실천 과제": `${rule.action} 문장은 짧아야 오래 남습니다. 내가 빛나는 방식, 지키고 싶은 마음, 세상에서 맡을 역할을 각각 한 단어로 적고 하나의 문장으로 묶으십시오.`,
    },
    c12_s2: {
      "핵심 진단": `${sectionSubject} 앞으로 더 크게 쓰여야 할 재능과 추진력을 가리킵니다. ${primaryPlanetSubject} 성장해야 할 중심 힘을 보여 주고, ${primaryHouseSubject} 그 힘이 훈련되고 증명될 무대를 알려 줍니다. ${themeObject} 키울수록 삶은 기다림보다 선택의 속도로 움직입니다.`,
      "차트 근거": `키워야 할 힘의 근거는 ${evidenceLine}입니다. ${evidenceSeed}를 보면 태양의 목적, 목성의 확장, 화성의 실행력이 어디에서 맞물리는지 보입니다. ${primaryAspectSubject} 재능이 자연스럽게 흐르는 부분과 의식적으로 단련해야 할 부분을 함께 드러냅니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 마음속으로는 이미 알고 있지만 아직 충분히 쓰지 못한 능력이 있습니다. 배우기만 하고 공개하지 않거나, 시작은 빠른데 지속 훈련이 부족하거나, 가능성을 작게 말하는 방식으로 나타날 수 있습니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 방향을 밝히고 ${primaryHouseAgent} 반복의 장소를 제공하면, 자신감은 기분이 아니라 훈련의 결과가 됩니다. 특히 작은 성취를 누적할수록 더 큰 역할을 감당할 힘이 커집니다.`,
      "주의점": `${caution} 남들이 기대하는 모습만 키우면 차트의 진짜 성장축과 멀어집니다. ${primaryAspectObject} 볼 때는 칭찬받기 쉬운 능력과 영혼이 실제로 요구하는 능력을 구분해야 합니다.`,
      "상담사의 조언": `${advice} 지금 필요한 것은 더 많은 가능성의 수집이 아니라 하나의 능력을 깊게 키우는 약속입니다. 확장은 목성처럼 크게 상상하되, 실행은 화성처럼 매주 몸으로 확인해야 합니다.`,
      "실천 과제": `${rule.action} 그 능력을 배움, 공개, 피드백의 세 단계로 나누십시오. 세 단계를 모두 통과한 능력만이 운이 아니라 실력으로 남습니다.`,
    },
    c12_s3: {
      "핵심 진단": `${sectionSubject} 다음 성장 앞에서 내려놓아야 할 낡은 방식을 보여 줍니다. ${primaryPlanetSubject} 오래된 책임, 흐린 기대, 통제의 그림자를 드러내고, ${primaryHouseSubject} 그 습관이 깊은 관계나 보이지 않는 불안 속에서 반복되는 장면을 알려 줍니다. ${themeObject} 알아차리는 순간 에너지가 회복됩니다.`,
      "차트 근거": `내려놓을 습관의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 토성의 방어, 해왕성의 안개, 명왕성의 집착이 어디에서 한 묶음으로 움직이는지 보입니다. ${primaryAspectSubject} 익숙하지만 더는 유익하지 않은 반응을 짚어 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 부탁을 거절하지 못하거나, 사실보다 기대를 믿거나, 잃을까 두려워 더 세게 붙잡는 모습으로 나타날 수 있습니다. 겉으로는 신중함처럼 보여도 안쪽에서는 회복할 힘을 계속 소모합니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 정리할 경계를 보여 주고 ${primaryHouseAgent} 무의식의 반복을 드러내면, 삶은 더 가벼운 호흡으로 움직이기 시작합니다. 내려놓음은 포기가 아니라 에너지를 되찾는 선택입니다.`,
      "주의점": `${caution} 오래 버틴 방식은 익숙해서 안전하게 느껴질 수 있습니다. ${primaryAspectObject} 다룰 때는 이 습관이 나를 지키는지, 아니면 같은 상처로 되돌리는지 냉정하게 구분해야 합니다.`,
      "상담사의 조언": `${advice} 책임질 일은 남기고, 착각은 걷어 내고, 통제하려는 마음은 뿌리부터 살피십시오. 마음을 무너뜨리는 습관은 의지로만 끊기보다 규칙으로 줄여야 오래 갑니다.`,
      "실천 과제": `${rule.action} 가장 자주 반복되는 피로의 패턴 하나를 고르십시오. 그 패턴이 시작되는 상황, 몸의 신호, 멈추는 문장을 함께 적으면 습관은 예언이 아니라 관리 대상이 됩니다.`,
    },
    c12_s4: {
      "핵심 진단": `${sectionSubject} 앞으로 삶의 구조를 어떤 순서로 재설계해야 하는지 알려 줍니다. ${primaryPlanetSubject} 확장과 책임, 깊은 전환의 축을 만들고, ${primaryHouseSubject} 장기 목표가 배움, 직업, 공동체의 장면에서 어떻게 자리를 잡는지 보여 줍니다. ${currentLine}`,
      "차트 근거": `3년 방향의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 넓혀야 할 세계, 단단히 책임질 구조, 완전히 바뀌어야 할 오래된 권력이 구분됩니다. ${primaryAspectSubject} 장기 계획에서 가장 민감하게 반응하는 지점을 알려 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} ${longLine} 전개 포인트는 갑자기 모든 것을 바꾸는 데 있지 않고, 1년 차에는 정리, 2년 차에는 확장, 3년 차에는 고정의 순서를 세우는 데 있습니다. 흐름을 연도별로 나누면 운의 압력이 계획의 언어로 바뀝니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 큰 시간의 문을 열고 ${primaryHouseAgent} 사회적 무대를 지정하면, 장기 목표는 막연한 꿈이 아니라 해마다 확인 가능한 구조가 됩니다. 3년의 길은 속도보다 방향의 일관성에서 힘을 얻습니다.`,
      "주의점": `${caution} 장기 계획을 감동적인 문장으로만 남기면 실행력이 약해집니다. ${primaryAspectObject} 볼 때는 큰 목표 하나마다 정리할 것, 배울 것, 고정할 것을 따로 배치해야 합니다.`,
      "상담사의 조언": `${advice} 현재 트랜짓이 열어 주는 문을 보되, 출생 차트가 감당할 수 있는 속도 안에서 계획하십시오. 목성은 넓히고, 토성은 고정하며, 명왕성은 더는 미룰 수 없는 변화를 요구합니다.`,
      "실천 과제": `${rule.action} 첫해에는 버릴 것, 둘째 해에는 키울 것, 셋째 해에는 이름 붙일 성취를 정하십시오. 이 순서가 잡히면 3년은 막연한 기다림이 아니라 별의 리듬을 탄 계획이 됩니다.`,
    },
    c12_s5: {
      "핵심 진단": `${sectionSubject} 기쁨, 의미, 사회적 역할이 만나는 지점을 선택하라는 마지막 조언입니다. ${primaryPlanetSubject} 자신다운 빛을 보여 주고, ${primaryHouseSubject} 그 빛이 창조성과 성취의 장면에서 어떻게 드러나는지 알려 줍니다. ${themeObject} 고를 때 삶은 더 선명하게 빛납니다.`,
      "차트 근거": `빛나는 선택의 근거는 ${evidenceLine}입니다. ${evidenceSeed}가 함께 놓이면 태양의 목적, 금성의 기쁨, 목성의 가능성, 천정점의 방향이 서로 겹치는 길이 보입니다. ${primaryAspectSubject} 그 길을 선택할 때 넘어야 할 긴장과 받을 수 있는 도움을 동시에 보여 줍니다.`,
      "현실에서 드러나는 모습": `${rule.manifest} 가장 빛나는 선택은 늘 가장 편한 선택과 같지는 않습니다. 즐겁지만 책임이 없으면 오래 남지 않고, 성과는 있지만 기쁨이 없으면 삶이 마릅니다. 두 조건이 함께 살아나는 길에서 별의 지지가 강해집니다.`,
      "장점": `${strength} ${primaryPlanetAgent} 자기다운 방향을 밝히고 ${primaryHouseAgent} 성취의 무대를 열면, 매력은 타인의 시선을 끄는 힘을 넘어 삶을 끌고 가는 중심력이 됩니다.`,
      "주의점": `${caution} 빛나는 선택을 즉각적인 편안함과 혼동하면 중요한 기회를 지나칠 수 있습니다. ${primaryAspectObject} 다룰 때는 설렘, 성장, 책임, 지속 가능성을 함께 확인해야 합니다.`,
      "상담사의 조언": `${advice} 기쁨만으로 선택하지 말고, 의미만으로도 선택하지 마십시오. 기쁨이 살아 있고 성장 가능성이 있으며 사회적 책임까지 감당할 수 있는 길이 당신의 차트에서 가장 오래 빛납니다.`,
      "실천 과제": `${rule.action} 선택지마다 기쁨, 성장, 책임, 지속성을 각각 한 줄로 적으십시오. 네 항목이 모두 살아 있는 선택이 지금 리포트가 가리키는 마지막 별자리입니다.`,
    },
  };

  const paragraphs = blocks[sectionId];
  return paragraphs ? formatAstroConsultingParagraphs(paragraphs) : "";
}

function buildConsultingParagraph(ctx) {
  const chapterOneParagraph = buildChapterOneConsultingParagraph(ctx);
  if (chapterOneParagraph) return chapterOneParagraph;
  const chapterTwoParagraph = buildChapterTwoConsultingParagraph(ctx);
  if (chapterTwoParagraph) return chapterTwoParagraph;
  const chapterThreeParagraph = buildChapterThreeConsultingParagraph(ctx);
  if (chapterThreeParagraph) return chapterThreeParagraph;
  const chapterFourParagraph = buildChapterFourConsultingParagraph(ctx);
  if (chapterFourParagraph) return chapterFourParagraph;
  const chapterFiveParagraph = buildChapterFiveConsultingParagraph(ctx);
  if (chapterFiveParagraph) return chapterFiveParagraph;
  const chapterSixParagraph = buildChapterSixConsultingParagraph(ctx);
  if (chapterSixParagraph) return chapterSixParagraph;
  const chapterSevenParagraph = buildChapterSevenConsultingParagraph(ctx);
  if (chapterSevenParagraph) return chapterSevenParagraph;
  const chapterEightParagraph = buildChapterEightConsultingParagraph(ctx);
  if (chapterEightParagraph) return chapterEightParagraph;
  const chapterNineParagraph = buildChapterNineConsultingParagraph(ctx);
  if (chapterNineParagraph) return chapterNineParagraph;
  const chapterTenParagraph = buildChapterTenConsultingParagraph(ctx);
  if (chapterTenParagraph) return chapterTenParagraph;
  const chapterElevenParagraph = buildChapterElevenConsultingParagraph(ctx);
  if (chapterElevenParagraph) return chapterElevenParagraph;
  const chapterTwelveParagraph = buildChapterTwelveConsultingParagraph(ctx);
  if (chapterTwelveParagraph) return chapterTwelveParagraph;

  const sectionTitle = clean(ctx?.section?.title);
  const rule = ctx.rule || {};
  const evidenceLine = joinEvidence(ctx.evidenceLabels);
  const evidenceList = buildEvidenceList(ctx, 5);
  const primaryPlanet = clean(ctx.primaryPlanet);
  const primaryHouse = clean(ctx.primaryHouse);
  const primaryAspect = clean(ctx.primaryAspect);
  const frame = getChapterReadingFrame(ctx);
  const sectionSubject = withJosa(sectionTitle, "은", "는");
  const frameLensObject = withJosa(frame.lens, "을", "를");
  const opening = buildOpeningSentence(ctx, frame);
  const aspectReading = buildAspectReading(ctx);
  const timingScope = buildTimingScope(ctx);
  const sectionIndex = Number(ctx.sectionIndex || 0);
  const primaryPlanetSubject = withJosa(primaryPlanet, "은", "는");
  const primaryHouseSubject = withJosa(primaryHouse, "은", "는");
  const primaryAspectSubject = withJosa(primaryAspect, "은", "는");
  const primaryPlanetObject = withJosa(primaryPlanet, "을", "를");
  const primaryHouseObject = withJosa(primaryHouse, "을", "를");
  const primaryAspectObject = withJosa(primaryAspect, "을", "를");
  const practiceDays = Number(frame.practiceDays || 7);
  const themeObject = withJosa(sentenceCore(rule.theme || sectionTitle), "을", "를");
  const strengthSentence = finishKoreanSentence(rule.strength, "이 힘은 현실에서 반복 가능한 장점으로 드러납니다");
  const cautionSentence = finishKoreanSentence(rule.caution, "한 신호만으로 결론 내리지 않는 균형이 필요합니다");
  const evidenceIntro = evidenceOpener(sectionIndex);
  const actionWord = actionVerb(sectionIndex);
  const paragraphs = {
    "핵심 진단": `${opening} 이 해석은 ${themeObject} ${frameLensObject} 연결해 읽습니다. ${timingScope ? `${timingScope} ` : ""}${sectionTitle}의 판단 기준은 ${frame.real}에서 먼저 드러납니다.`,
    "차트 근거": `${evidenceIntro} ${evidenceLine}입니다. ${primaryPlanetSubject} 먼저 켜지는 욕구와 방향을 말합니다. ${primaryHouseSubject} 그 욕구가 놓이는 생활 영역을 알려 줍니다. ${aspectReading} 핵심은 ${evidenceList.slice(0, 3).join(", ")}를 하나의 흐름으로 연결하는 데 있습니다.`,
    "현실에서 드러나는 모습": `${rule.manifest} 현실에서는 ${frame.examples}에서 확인됩니다. ${primaryHouseSubject} 강해질수록 마음속 느낌보다 실제 선택, 대화, 시간 배분, 관계의 거리 조절로 먼저 드러납니다.`,
    "장점": `${sectionTitle}의 장점은 별의 힘을 현실에서 쓸 수 있다는 데 있습니다. ${strengthSentence} ${primaryPlanetSubject} 건강하게 쓰이면 이 힘은 설득력, 지속력, 성과로 이어집니다. 특히 ${primaryHouse} 영역에서는 익숙한 방식이 재능으로 굳어질 가능성이 큽니다.`,
    "주의점": `${cautionSentence} ${primaryAspectSubject} 압력으로 느껴질 때는 좋은 의도도 급한 반응이나 지연, 회피, 통제 욕구로 바뀔 수 있습니다. 이때 필요한 태도는 ${frame.caution}입니다.`,
    "상담사의 조언": `${rule.advice} 상담 관점에서는 ${primaryPlanetObject} 마음의 발화점으로 보고, ${primaryHouseObject} 실제 무대로 보십시오. ${primaryAspectObject} 다룰 때는 밀어붙이기보다 속도와 강도를 조율하는 편이 좋습니다. 그러면 ${sectionSubject} 지금 조정할 수 있는 선택의 언어가 됩니다.`,
    "실천 과제": `${rule.action} 실행은 ${frame.action}에서 시작하면 좋습니다. ${practiceDays}일 동안 ${sectionTitle}과 연결된 행동 하나를 정해 ${actionWord}. 변화가 먼저 나타나는 영역이 감정인지, 관계인지, 일인지, 돈인지 확인하면 다음 선택이 더 선명해집니다.`,
  };
  return formatAstroConsultingParagraphs(paragraphs);
}

function sanitizeBody(text) {
  let out = sanitizeAstroPremiumText(text);
  for (const pattern of FORBIDDEN_PATTERNS) out = out.replace(pattern, "");
  return out
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
      const appendix = buildAstroExpansionParagraph(chapter, category, signalPack, 1);
      const body = ensureMinLength(
        buildConsultingParagraph(signalPack),
        MIN_SECTION_LENGTH,
        appendix,
      );
      const evidenceSignals = normalizeAstroEvidenceSignals(localAstroChartJson, body, [
        ...safeArray(signalPack.usedSignals),
        ...safeArray(signalPack.requiredFocusTerms),
        ...safeArray(signalPack.usedPlanets),
        ...safeArray(signalPack.usedHouses).map((house) => `${house}하우스`),
        ...safeArray(signalPack.usedAspects),
      ]);
      const requiredFocusTerms = uniqueList([
        ...safeArray(signalPack.requiredFocusTerms),
        ...evidenceSignals,
      ]).slice(0, 18);
      return {
        title: category.title,
        body,
        bullets: signalPack.usedSignals.slice(0, 5),
        evidenceSignals,
        requiredFocusTerms,
        source: ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED,
        qualityFlags: {
          ...buildAstroSectionQualityFlags(localAstroChartJson, body, evidenceSignals),
          requiredFocusTerms,
          source: ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED,
        },
        localQuality: {
          minLengthPassed: body.length >= MIN_SECTION_LENGTH,
          categoryRuleId: signalPack.rule.id,
          categoryTheme: signalPack.rule.theme,
          requiredFocusTerms,
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

export async function assembleAstroPremiumChaptersLocally(localManuscriptOrChart, localAstroChartJsonOrOptions = {}, maybeOptions = {}) {
  const hasLocalManuscript = Array.isArray(localManuscriptOrChart)
    || Array.isArray(localManuscriptOrChart?.chapters);
  const localAstroChartJson = hasLocalManuscript ? localAstroChartJsonOrOptions : localManuscriptOrChart;
  const options = hasLocalManuscript ? maybeOptions : localAstroChartJsonOrOptions;
  const localInput = hasLocalManuscript
    ? (Array.isArray(localManuscriptOrChart) ? localManuscriptOrChart : safeArray(localManuscriptOrChart?.chapters))
    : buildAstroLocalPremiumManuscript(localAstroChartJson);
  const localFallbackChapters = normalizeAstroLocalFallbackManuscript(localInput, localAstroChartJson);
  const facts = options.facts || buildWesternAstrologyFacts(localAstroChartJson, options.rawInput || {});
  const chapterPlans = options.chapterPlans || buildWesternAstrologyChapterPlans({ chapters: localFallbackChapters }, facts, localAstroChartJson);
  const attempts = localFallbackChapters.map((chapter, index) => ({
    chapterId: clean(chapter?.id || ASTRO_PREMIUM_CHAPTERS[index]?.id),
    chapterNo: Number(chapter?.chapterNo || ASTRO_PREMIUM_CHAPTERS[index]?.order || index + 1),
    assembled: true,
    source: ASTRO_PDF_CONFIG.generationMode,
  }));
  const localAssembly = {
    enabled: true,
    source: ASTRO_PDF_CONFIG.generationMode,
    provider: ASTRO_PDF_CONFIG.provider,
    templateVersion: ASTRO_PDF_CONFIG.templateVersion,
    chapterCount: localFallbackChapters.length,
    expectedChapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    externalGeneration: false,
  };
  return {
    chapters: localFallbackChapters,
    localDraftChapterCount: localFallbackChapters.length,
    source: ASTRO_PDF_CONFIG.generationMode,
    assemblyVersion: WESTERN_ASTROLOGY_ASSEMBLY_VERSION,
    localAssembly,
    attempts,
    facts,
    chapterPlans,
  };
}

function compactAstroPlanetForLocalAssembly(planet = {}) {
  return {
    name: clean(PLANET_KO[planet?.name] || planet?.name),
    sign: clean(planet?.sign),
    degree: clean(planet?.degree),
    house: Number.isFinite(Number(planet?.house)) ? Number(planet.house) : undefined,
    retrograde: Boolean(planet?.retrograde),
  };
}

function compactAstroHouseForLocalAssembly(house = {}) {
  return {
    house: Number(house?.house || house?.number || 0) || undefined,
    sign: clean(house?.sign),
    degree: clean(house?.degree),
    topic: clean(house?.topic || house?.meaning),
  };
}

function compactAstroAspectForLocalAssembly(aspect = {}) {
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

function buildAstroLocalSignalBrief(localAstroChartJson = {}, chapterSpec = {}) {
  const chart = asObject(localAstroChartJson?.chart);
  const insights = asObject(localAstroChartJson?.insights);
  const planets = safeArray(chart.planets).slice(0, 12).map(compactAstroPlanetForLocalAssembly);
  const houses = safeArray(chart.houses).slice(0, 12).map(compactAstroHouseForLocalAssembly);
  const aspects = safeArray(chart.aspects).slice(0, 24).map(compactAstroAspectForLocalAssembly);
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
      manuscriptSource: ASTRO_PDF_CONFIG.generationMode,
      localDraftAllowed: true,
      fallbackAllowed: false,
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

function toNumericTimezone(value) {
  const offset = normalizeTimezoneOffsetHours(value);
  return Number.isFinite(offset) ? offset : NaN;
}

function addDaysUtc(date, days) {
  return new Date(date.getTime() + Number(days || 0) * 86400000);
}

function addYearsUtc(date, years) {
  const out = new Date(date.getTime());
  out.setUTCFullYear(out.getUTCFullYear() + Number(years || 0));
  return out;
}

function makeTransitDateInput(date, birthInput = {}) {
  const timezone = Number.isFinite(Number(birthInput?.timezoneOffsetHours))
    ? Number(birthInput.timezoneOffsetHours)
    : toNumericTimezone(birthInput?.timezone);
  const localMillis = date.getTime() + timezone * 3600000;
  const localDate = new Date(localMillis);
  return {
    year: localDate.getUTCFullYear(),
    month: localDate.getUTCMonth() + 1,
    day: localDate.getUTCDate(),
    hour: Number.isFinite(Number(birthInput?.birthHour)) ? Number(birthInput.birthHour) : 12,
    minute: Number.isFinite(Number(birthInput?.birthMinute)) ? Number(birthInput.birthMinute) : 0,
    timezone,
    lat: Number(birthInput?.latitude),
    lon: Number(birthInput?.longitude),
  };
}

function makeUtcDateFromTransitInput(input = {}) {
  const hour = Number(input.hour || 0) + Number(input.minute || 0) / 60 - Number(input.timezone || 0);
  const utcMillis = Date.UTC(Number(input.year), Number(input.month) - 1, Number(input.day), 0, 0, 0, 0) + hour * 3600000;
  return new Date(utcMillis);
}

function julianDateFromDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function formatTransitDate(input = {}) {
  const y = String(input.year || "").padStart(4, "0");
  const m = String(input.month || "").padStart(2, "0");
  const d = String(input.day || "").padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function buildAstronomyEngineTransitChart(input = {}) {
  const Astronomy = await import("astronomy-engine");
  const date = makeUtcDateFromTransitInput(input);
  const time = julianDateFromDate(date);
  const prevTime = julianDateFromDate(addDaysUtc(date, -1));
  const nextTime = julianDateFromDate(addDaysUtc(date, 1));
  const planets = {};
  for (const name of TIMING_TRANSIT_PLANETS) {
    const body = Astronomy.Body?.[name];
    if (!body) continue;
    const center = Astronomy.Ecliptic(Astronomy.GeoVector(body, time, true));
    const prev = Astronomy.Ecliptic(Astronomy.GeoVector(body, prevTime, true));
    const next = Astronomy.Ecliptic(Astronomy.GeoVector(body, nextTime, true));
    const longitude = Number(center?.elon);
    if (!Number.isFinite(longitude)) continue;
    const delta = (((Number(next?.elon) - Number(prev?.elon)) % 360) + 360) % 360;
    const unwrapped = delta > 180 ? delta - 360 : delta;
    planets[name] = {
      longitude: Math.round((((longitude % 360) + 360) % 360) * 100) / 100,
      retrograde: Number.isFinite(unwrapped) ? unwrapped < 0 : false,
    };
  }
  return {
    planets,
    aspects: [],
    source: "astronomy-engine-transit",
  };
}

function transitPlanetLabel(chart = {}, name = "") {
  const planet = asObject(chart?.planets?.[name]);
  const sign = signFromLongitude(planet?.longitude) || signNameFromNode(planet);
  const house = Number.isFinite(Number(planet?.house)) ? `${Number(planet.house)}하우스` : "";
  const retrograde = planet?.retrograde ? " 역행" : "";
  return [PLANET_KO[name] || name, sign, house + retrograde].filter(Boolean).join(" ");
}

function angularDistance(a, b) {
  const diff = Math.abs((((Number(a) - Number(b)) % 360) + 360) % 360);
  return diff > 180 ? 360 - diff : diff;
}

function transitAspectBetween(transitPlanet = {}, natalPoint = {}) {
  const transitLon = Number(transitPlanet?.longitude);
  const natalLon = Number(natalPoint?.longitude);
  if (!Number.isFinite(transitLon) || !Number.isFinite(natalLon)) return null;
  const distance = angularDistance(transitLon, natalLon);
  const defs = [
    [0, "합"],
    [60, "육각"],
    [90, "사각"],
    [120, "삼각"],
    [180, "충"],
  ];
  for (const [degree, label] of defs) {
    const orb = Math.abs(distance - degree);
    if (orb <= 3) return { label, orb: Math.round(orb * 10) / 10 };
  }
  return null;
}

function buildNatalTimingTargets(localAstroChartJson = {}) {
  const chart = asObject(localAstroChartJson?.chart);
  const planets = safeArray(chart?.planets)
    .filter((planet) => TIMING_NATAL_TARGETS.includes(clean(planet?.name)))
    .map((planet) => ({
      name: clean(planet.name),
      label: PLANET_KO[planet.name] || planet.name,
      longitude: Number(planet.longitude),
    }));
  const angles = [
    { name: "ASC", label: "상승궁", longitude: Number(chart?.angles?.ascLongitude ?? chart?.ascendantLongitude) },
    { name: "MC", label: "천정점", longitude: Number(chart?.angles?.mcLongitude ?? chart?.midheavenLongitude) },
  ].filter((point) => Number.isFinite(point.longitude));
  return [...planets, ...angles].filter((point) => Number.isFinite(point.longitude));
}

function buildTransitAspectHighlights(transitChart = {}, natalTargets = []) {
  const out = [];
  for (const transitName of TIMING_TRANSIT_PLANETS) {
    const transitPlanet = asObject(transitChart?.planets?.[transitName]);
    if (!Number.isFinite(Number(transitPlanet?.longitude))) continue;
    for (const natal of natalTargets) {
      const hit = transitAspectBetween(transitPlanet, natal);
      if (!hit) continue;
      const transitSubject = withJosa(PLANET_KO[transitName] || transitName, "이", "가");
      const natalPartner = withJosa(`출생 ${natal.label}`, "과", "와");
      out.push({
        text: `${transitSubject} ${natalPartner} ${hit.label} 각도로 ${aspectTightnessLabel(hit.orb)}`,
        orb: hit.orb,
      });
    }
  }
  return out.sort((a, b) => a.orb - b.orb).slice(0, 4);
}

function summarizeTransitSnapshot(snapshot = {}) {
  const labels = safeArray(snapshot?.outerPlanets).slice(0, 2);
  const aspects = safeArray(snapshot?.aspects).map((item) => clean(item?.text)).filter(Boolean).slice(0, 1);
  return uniqueList([...labels, ...aspects]).join(" · ");
}

async function buildAstroTransitInsights(env, birthInput = {}, localAstroChartJson = {}, options = {}) {
  const basis = clean(options?.timingBaseDate || options?.nowIso || new Date().toISOString());
  const baseDate = Number.isFinite(Date.parse(basis)) ? new Date(basis) : new Date();
  const natalTargets = buildNatalTimingTargets(localAstroChartJson);
  const checkpoints = [
    { key: "now", label: "현재", date: baseDate },
    { key: "days90", label: "90일 후", date: addDaysUtc(baseDate, 90) },
    { key: "year1", label: "1년 차", date: addYearsUtc(baseDate, 1) },
    { key: "year2", label: "2년 차", date: addYearsUtc(baseDate, 2) },
    { key: "year3", label: "3년 차", date: addYearsUtc(baseDate, 3) },
  ];

  try {
    const snapshots = [];
    for (const checkpoint of checkpoints) {
      const input = makeTransitDateInput(checkpoint.date, birthInput);
      const { getSwissWesternChart } = await import("./swiss-ephemeris.js");
      const chart = await getSwissWesternChart(env, input, {
        requestUrl: options?.requestUrl,
        strictSwiss: true,
        allowFallback: false,
        premium: true,
      });
      const chartSource = getAstroCalculationSource(chart);
      const outerPlanets = TIMING_TRANSIT_PLANETS
        .map((name) => transitPlanetLabel(chart, name))
        .filter(Boolean);
      snapshots.push({
        ...checkpoint,
        date: formatTransitDate(input),
        source: chartSource,
        engineQuality: clean(chart?.engineQuality || (PREMIUM_SWISS_CHART_SOURCES.has(chartSource) ? "swiss" : "")),
        fallbackUsed: chart?.fallbackUsed === true || /fallback/i.test(chartSource),
        outerPlanets,
        aspects: buildTransitAspectHighlights(chart, natalTargets),
      });
    }
    const now = snapshots.find((item) => item.key === "now") || snapshots[0] || {};
    const days90 = snapshots.find((item) => item.key === "days90") || {};
    const years = snapshots.filter((item) => /^year/.test(item.key));
    return {
      calculated: true,
      source: PREMIUM_TRANSIT_SOURCE,
      engineQuality: "swiss-transit",
      fallbackUsed: snapshots.some((snapshot) => snapshot.fallbackUsed === true),
      baseDate: snapshots[0]?.date || formatTransitDate(makeTransitDateInput(baseDate, birthInput)),
      currentSummary: summarizeTransitSnapshot(now),
      ninetyDaySummary: summarizeTransitSnapshot(days90),
      threeYearSummary: years
        .map((item) => `${item.label} ${item.date}: ${summarizeTransitSnapshot(item)}`)
        .filter(Boolean)
        .join(" / "),
      snapshots,
    };
  } catch (error) {
    console.warn("[AstroPremiumPDF][TransitCalculationFailed]", {
      reason: clean(error?.message || error),
    });
    return {
      calculated: false,
      source: "transit-unavailable",
      baseDate: formatTransitDate(makeTransitDateInput(baseDate, birthInput)),
      currentSummary: "트랜짓 계산을 완료하지 못해 출생 차트의 장기 리듬만 참고합니다.",
      ninetyDaySummary: "",
      threeYearSummary: "",
      snapshots: [],
    };
  }
}

function validateAstroTransitInsights(insights = {}) {
  const snapshots = safeArray(insights?.snapshots);
  const fallbackSnapshots = snapshots.filter((snapshot) => (
    snapshot?.fallbackUsed === true
    || clean(snapshot?.engineQuality).toLowerCase() === "fallback"
    || /fallback/i.test(clean(snapshot?.source))
  ));
  const nonSwissSnapshots = snapshots.filter((snapshot) => !PREMIUM_SWISS_CHART_SOURCES.has(clean(snapshot?.source)));
  const signalCount = snapshots.reduce((sum, snapshot) => (
    sum + safeArray(snapshot?.outerPlanets).length + safeArray(snapshot?.aspects).length
  ), 0);
  const missing = [];
  if (insights?.calculated !== true) missing.push("calculated");
  if (clean(insights?.source) !== PREMIUM_TRANSIT_SOURCE) missing.push("source");
  if (clean(insights?.engineQuality) !== "swiss-transit") missing.push("engineQuality");
  if (insights?.fallbackUsed === true || fallbackSnapshots.length > 0) missing.push("fallbackUsed");
  if (nonSwissSnapshots.length > 0) missing.push("snapshotSource");
  if (snapshots.length < 5) missing.push("snapshots");
  if (signalCount < 5) missing.push("signals");
  if (!clean(insights?.currentSummary)) missing.push("currentSummary");
  if (!clean(insights?.ninetyDaySummary)) missing.push("ninetyDaySummary");
  if (!clean(insights?.threeYearSummary)) missing.push("threeYearSummary");
  return {
    ok: missing.length === 0,
    missing,
    snapshotCount: snapshots.length,
    signalCount,
    fallbackSnapshotCount: fallbackSnapshots.length,
    nonSwissSnapshotCount: nonSwissSnapshots.length,
  };
}

export function buildWesternAstrologyFacts(localAstroChartJson = {}, rawInput = {}) {
  const birthInput = asObject(localAstroChartJson?.birthInput);
  const chart = asObject(localAstroChartJson?.chart);
  const planets = safeArray(chart?.planets).map(compactAstroPlanetForLocalAssembly);
  const houses = safeArray(chart?.houses).map(compactAstroHouseForLocalAssembly);
  const aspects = safeArray(chart?.aspects).map(compactAstroAspectForLocalAssembly);
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
    assemblyVersion: WESTERN_ASTROLOGY_ASSEMBLY_VERSION,
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
      transits: safeArray(rawInput?.transits || rawInput?.timingFlows?.transits || localAstroChartJson?.timingInsights?.snapshots),
      progressions: safeArray(rawInput?.progressions || rawInput?.timingFlows?.progressions),
      solarReturn: asObject(rawInput?.solarReturn || rawInput?.timingFlows?.solarReturn),
      lunarReturn: asObject(rawInput?.lunarReturn || rawInput?.timingFlows?.lunarReturn),
      monthlyFlow: safeArray(rawInput?.monthlyFlow || rawInput?.timingFlows?.monthlyFlow),
      annualFlow: safeArray(rawInput?.annualFlow || rawInput?.timingFlows?.annualFlow),
    },
  };
}

export function buildWesternAstrologyChapterPlans(localManuscript = {}, facts = {}, localAstroChartJson = {}) {
  const chapters = Array.isArray(localManuscript) ? localManuscript : safeArray(localManuscript?.chapters);
  return ASTRO_PREMIUM_CHAPTERS.map((chapterSpec, index) => {
    const chapter = chapters[index] || chapters.find((item) => Number(item?.chapterNo) === Number(chapterSpec.order)) || {};
    const signalBrief = buildAstroLocalSignalBrief(localAstroChartJson, chapterSpec);
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
      "행성별, 하우스별, 어스펙트별, 트랜짓별 개별 외부 생성을 하지 않는다.",
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
    assemblyVersion: WESTERN_ASTROLOGY_ASSEMBLY_VERSION,
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
      planets: safeArray(chart.planets).slice(0, 12).map(compactAstroPlanetForLocalAssembly),
      houses: safeArray(chart.houses).slice(0, 12).map(compactAstroHouseForLocalAssembly),
      aspects: safeArray(chart.aspects).slice(0, 32).map(compactAstroAspectForLocalAssembly),
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
      forbiddenDeveloperTerms: ["JSON", "API", "schema", "prompt", "payload", "debug", "fallback"],
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
  requireField(clean(masterJson?.generationMode) === ASTRO_PDF_CONFIG.generationMode, "generationMode");
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
    hasRiskyAssertion: ASTRO_RISKY_ASSERTION_RE.test(clean(body)),
    repetitionExceeded: Boolean(repetition.exceeded),
    source: ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED,
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
    .filter((line) =>
      line.length >= 24
      && !ASTRO_SECTION_HEADINGS.includes(line)
      && !REPETITION_EXCLUDED_TERMS.some((term) => line.includes(term))
      && !GENERIC_ASTRO_COPY_PATTERNS.some((pattern) => pattern.test(line))
    );
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
      sentenceMax >= 4
      || paragraphMax > 2
      || ngram30Max >= 8,
  };
}

function collectCrossSectionRepetitionDetails(chapters = []) {
  const map = new Map();
  safeArray(chapters).forEach((chapter) => {
    safeArray(chapter?.sections).forEach((section) => {
      String(section?.body || "")
        .split(/\n+/)
        .map((line) => line.trim().replace(/\s+/g, " "))
        .filter((line) => line.length >= 80 && !ASTRO_SECTION_HEADINGS.includes(line))
        .forEach((line) => {
          map.set(line, (map.get(line) || 0) + 1);
        });
    });
  });
  const repeated = Array.from(map.entries())
    .filter(([, count]) => count >= 6)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([text, count]) => ({ count, text: text.slice(0, 140) }));
  return {
    exceeded: repeated.length > 0,
    repeated,
  };
}

function countFocusTermHits(body = "", terms = []) {
  const text = clean(body);
  return uniqueList(safeArray(terms))
    .filter((term) => clean(term).length >= 2)
    .reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

function collectGenericAstroCopyIssues(body = "") {
  const text = clean(body);
  return GENERIC_ASTRO_COPY_PATTERNS
    .map((pattern) => pattern.test(text))
    .filter(Boolean);
}

function isAstroTimingSection(chapterNo, section = {}) {
  return Number(chapterNo) === 11 || clean(section?.id) === "c12_s4";
}

function hasAstroTimingScope(body = "") {
  const text = clean(body);
  return /현재\s*트랜짓|전개\s*포인트|장기\s*리듬|트랜짓\s*산출/.test(text);
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
          ...safeArray(section.requiredFocusTerms),
          ...safeArray(section?.localQuality?.usedSignals),
          ...safeArray(section?.localQuality?.requiredFocusTerms),
          ...safeArray(section?.localQuality?.usedPlanets),
          ...safeArray(section?.localQuality?.usedHouses).map((house) => `${house}하우스`),
          ...safeArray(section?.localQuality?.usedAspects),
        ],
      );
      const requiredFocusTerms = uniqueList([
        ...safeArray(section.requiredFocusTerms),
        ...safeArray(section?.localQuality?.requiredFocusTerms),
        ...evidenceSignals,
      ]).slice(0, 18);
      return {
        ...section,
        title: clean(section.title || chapterSpec?.categories?.[sectionIndex]?.title),
        body,
        evidenceSignals,
        requiredFocusTerms,
        source: ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED,
        qualityFlags: {
          ...asObject(section.qualityFlags),
          ...buildAstroSectionQualityFlags(localAstroChartJson, body, evidenceSignals),
          requiredFocusTerms,
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
    nonLocalChapterCount: 0,
    nonLocalSectionCount: 0,
    evidenceSignalCount: 0,
    minEvidenceSignalsPerSection: Infinity,
    minFocusHitsPerSection: Infinity,
    categoryFocusMissCount: 0,
    genericCopySectionCount: 0,
    timingScopeMissCount: 0,
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
    if (chapterSource !== ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED) issues.push(`chapter${chapter.chapterNo}.source`);
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
      const requiredFocusTerms = uniqueList([
        ...safeArray(section.requiredFocusTerms),
        ...safeArray(qualityFlags.requiredFocusTerms),
      ]).map(clean).filter(Boolean);
      const focusHits = countFocusTermHits(body, requiredFocusTerms);
      const genericCopyIssues = collectGenericAstroCopyIssues(body);
      const expectedSectionSpec = schema?.categories?.[sectionIndex] || {};
      const timingScopeMissing = isAstroTimingSection(chapter.chapterNo, expectedSectionSpec) && !hasAstroTimingScope(body);
      const sectionSource = clean(section.source);
      const qualitySource = clean(qualityFlags.source);
      qualityStats.sectionCount += 1;
      qualityStats.evidenceSignalCount += evidenceSignals.length;
      qualityStats.minEvidenceSignalsPerSection = Math.min(qualityStats.minEvidenceSignalsPerSection, evidenceSignals.length);
      qualityStats.minFocusHitsPerSection = Math.min(qualityStats.minFocusHitsPerSection, focusHits);
      if (requiredFocusTerms.length >= 4 && focusHits < 4) qualityStats.categoryFocusMissCount += 1;
      if (genericCopyIssues.length > 0) qualityStats.genericCopySectionCount += 1;
      if (timingScopeMissing) qualityStats.timingScopeMissCount += 1;
      if (sectionSource !== ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED) qualityStats.nonLocalSectionCount += 1;
      if (qualityFlags.hasForbiddenText === true) qualityStats.flaggedForbiddenSections += 1;
      if (qualityFlags.hasRiskyAssertion === true) qualityStats.flaggedRiskySections += 1;
      if (qualityFlags.repetitionExceeded === true) qualityStats.flaggedRepetitionSections += 1;
      const expectedSectionTitle = clean(expectedSectionSpec?.title);
      if (expectedSectionTitle && clean(section.title) !== expectedSectionTitle) {
        issues.push(`chapter${chapter.chapterNo}.section${sectionIndex + 1}.title`);
      }
      if (body.length < MIN_SECTION_LENGTH) issues.push(`chapter${chapter.chapterNo}.${section.title}.length`);
      if (!body) issues.push(`chapter${chapter.chapterNo}.${section.title}.empty`);
      if (containsForbidden(body)) issues.push(`chapter${chapter.chapterNo}.${section.title}.forbidden`);
      if (sectionSource !== ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED) issues.push(`chapter${chapter.chapterNo}.${section.title}.source`);
      if (ASTRO_RISKY_ASSERTION_RE.test(body)) issues.push(`chapter${chapter.chapterNo}.${section.title}.risky`);
      if (countAstroEvidenceHits(localAstroChartJson, body) < 4) issues.push(`chapter${chapter.chapterNo}.${section.title}.evidence`);
      if (evidenceSignals.length < 4) issues.push(`chapter${chapter.chapterNo}.${section.title}.evidenceSignals`);
      if (requiredFocusTerms.length >= 4 && focusHits < 4) issues.push(`chapter${chapter.chapterNo}.${section.title}.categoryFocus`);
      if (genericCopyIssues.length > 0) issues.push(`chapter${chapter.chapterNo}.${section.title}.genericCopy`);
      if (timingScopeMissing) issues.push(`chapter${chapter.chapterNo}.${section.title}.timingScope`);
      if (qualitySource !== ASTRO_MANUSCRIPT_SOURCE.LOCAL_COMPLETED) issues.push(`chapter${chapter.chapterNo}.${section.title}.qualitySource`);
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
  const crossSectionRepetition = collectCrossSectionRepetitionDetails(chapters);
  if (crossSectionRepetition.exceeded) issues.push("crossSectionRepetition");
  return {
    ok: issues.length === 0,
    issues,
    repetition,
    crossSectionRepetition,
    stats: {
      chapterCount: safeArray(chapters).length,
      expectedChapterCount: qualityStats.expectedChapterCount,
      sectionCount: qualityStats.sectionCount,
      expectedSectionCount: qualityStats.expectedSectionCount,
      nonLocalChapterCount: qualityStats.nonLocalChapterCount,
      nonLocalSectionCount: qualityStats.nonLocalSectionCount,
      allChaptersLocal: qualityStats.nonLocalChapterCount === 0,
      allSectionsLocal: qualityStats.nonLocalSectionCount === 0,
      evidenceSignalCount: qualityStats.evidenceSignalCount,
      minEvidenceSignalsPerSection: Number.isFinite(qualityStats.minEvidenceSignalsPerSection) ? qualityStats.minEvidenceSignalsPerSection : 0,
      minFocusHitsPerSection: Number.isFinite(qualityStats.minFocusHitsPerSection) ? qualityStats.minFocusHitsPerSection : 0,
      categoryFocusMissCount: qualityStats.categoryFocusMissCount,
      genericCopySectionCount: qualityStats.genericCopySectionCount,
      timingScopeMissCount: qualityStats.timingScopeMissCount,
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

  localAstroChartJson.timingInsights = await buildAstroTransitInsights(env, birthInput, localAstroChartJson, {
    requestUrl: options?.requestUrl,
    timingBaseDate: rawInput?.timingBaseDate || rawInput?.targetDate || rawInput?.baseDate,
  });
  const transitValidation = validateAstroTransitInsights(localAstroChartJson.timingInsights);
  emit("TransitInsightsValidated", {
    ok: transitValidation.ok,
    missing: transitValidation.missing,
    snapshotCount: transitValidation.snapshotCount,
    signalCount: transitValidation.signalCount,
  });
  if (!transitValidation.ok) {
    const error = new Error("점성술 트랜짓 계산 검증에 실패했습니다.");
    error.code = "ASTRO_TRANSIT_INSIGHTS_INVALID";
    error.status = 422;
    error.details = transitValidation;
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

  const localAssembly = {
    enabled: true,
    source: ASTRO_PDF_CONFIG.generationMode,
    provider: ASTRO_PDF_CONFIG.provider,
    templateVersion: ASTRO_PDF_CONFIG.templateVersion,
    chapterCount: localFallbackChapters.length,
    expectedChapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    externalGeneration: false,
  };

  emit("LocalAssembledManuscriptReady", {
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    manuscriptSource: ASTRO_PDF_CONFIG.generationMode,
    assemblyVersion: WESTERN_ASTROLOGY_ASSEMBLY_VERSION,
    localAssembly,
  });

  const enhanced = {
    chapters: localFallbackChapters,
    localDraftChapterCount: localFallbackChapters.length,
    source: ASTRO_PDF_CONFIG.generationMode,
    assemblyVersion: WESTERN_ASTROLOGY_ASSEMBLY_VERSION,
    localAssembly,
  };

  emit("LocalAssembledManuscriptSuccess", {
    chapterCount: localFallbackChapters.length,
    totalLength: totalLength(localFallbackChapters),
    reason: "LOCAL_ASSEMBLED",
    localAssembly,
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
    localAssembly,
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
    localAssembly,
    pdfCompletionValidation: pdfCompletionValidation.ok,
  });

  const chapters = toLegacyChapters(finalDrafts);
  const manuscriptSource = ASTRO_PDF_CONFIG.generationMode;
  const localDraftChapterCount = Number(enhanced.localDraftChapterCount || 0);
  return {
    payload,
    chapters,
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    manuscriptSource,
    localDraftChapterCount,
    localAssembly,
    assemblyVersion: WESTERN_ASTROLOGY_ASSEMBLY_VERSION,
    generationMode: ASTRO_PDF_CONFIG.generationMode,
    provider: ASTRO_PDF_CONFIG.provider,
    writingPipeline: "local-calculation-to-local-assembled-pdf",
    totalLength: totalLength(finalDrafts),
    pdfReady: {
      ...pdfReady,
      manuscriptSource,
      localAssembly,
      localDraftChapterCount,
    },
    pdfCompletionValidation,
    localAstroChartJson,
    astroMasterJson,
    westernAstrologyFacts,
    westernAstrologyChapterPlans,
    masterJsonValidation,
    transitValidation,
    finalManuscript: finalDrafts,
    validation: validated,
    validationWarning: !validated.ok,
    diagnostics: {
      generationMode: ASTRO_PDF_CONFIG.generationMode,
      assemblyVersion: WESTERN_ASTROLOGY_ASSEMBLY_VERSION,
      localAssembly,
      factsMode: clean(westernAstrologyFacts.mode),
      transitValidation,
      pdfCompletionValidation,
    },
    quality: {
      ok: validated.ok,
      issues: validated.issues,
      repetition: validated.repetition,
      stats: validated.stats,
      manuscriptSource,
      localAssembly,
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
