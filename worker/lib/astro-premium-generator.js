import { ASTRO_PREMIUM_CHAPTERS } from "./astro-premium-chapters.js";

export const ASTRO_PDF_CONFIG = Object.freeze({
  generationMode: "pdf-v3-llm-only",
  provider: "western-astrology-llm",
  templateVersion: "astrology-no-local-v1",
});
export const WESTERN_ASTROLOGY_ASSEMBLY_VERSION = ASTRO_PDF_CONFIG.templateVersion;

const PREMIUM_REQUIRED_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const PREMIUM_SWISS_CHART_SOURCES = new Set(["swiss-wasm-local", "external-swiss-api"]);
const PREMIUM_TRANSIT_SOURCE = "western-transit-swiss";
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
  const root = asObject(rawInput);
  const nestedBirthInput = asObject(root.birthInput);
  const body = Object.keys(nestedBirthInput).length > 0
    ? {
      ...root,
      ...nestedBirthInput,
      profile: nestedBirthInput.profile || root.profile,
      location: nestedBirthInput.location || root.location,
      user: nestedBirthInput.user || root.user,
    }
    : root;
  const profile = asObject(body.profile);
  const bodyBirth = asObject(body.birth);
  const profileBirth = asObject(profile.birth);
  const birth = { ...bodyBirth, ...profileBirth };
  const bodyLocation = asObject(body.location);
  const profileLocation = asObject(profile.location);
  const birthLocation = asObject(birth.location);
  const user = asObject(body.user);
  const bodyBirthText = typeof body.birth === "string" ? body.birth : undefined;

  const dateSource = pickFirst(
    body.birthDate,
    body.birthday,
    birth.birthDate,
    birth.birthday,
    birth.date,
    bodyBirthText,
    body.solarDate,
    body.date,
    user.birthDate,
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

  const timezoneSource = pickFirstPresent(
    body.timezone,
    body.timezoneName,
    body.tz,
    birth.timezone,
    birth.timezoneName,
    birth.tz,
    profileLocation.timezone,
    profileLocation.timezoneName,
    profileLocation.tz,
    bodyLocation.timezone,
    bodyLocation.timezoneName,
    bodyLocation.tz,
    birthLocation.timezone,
    birthLocation.timezoneName,
    birthLocation.tz,
    user.timezone,
    user.timezoneName,
    user.tz,
  );
  const timezoneOffsetSource = pickFirstPresent(
    body.timezoneOffsetHours,
    body.timezoneOffset,
    body.timezoneOffsetHour,
    body.utcOffset,
    body.utcOffsetHours,
    body.tzOffset,
    body.tzOffsetHours,
    body.baseTzOffset,
    body.baseTimezoneOffset,
    birth.timezoneOffsetHours,
    birth.timezoneOffset,
    birth.timezoneOffsetHour,
    birth.utcOffset,
    birth.utcOffsetHours,
    birth.tzOffset,
    birth.tzOffsetHours,
    birth.baseTzOffset,
    birth.baseTimezoneOffset,
    profileLocation.timezoneOffsetHours,
    profileLocation.timezoneOffset,
    profileLocation.timezoneOffsetHour,
    profileLocation.utcOffset,
    profileLocation.utcOffsetHours,
    profileLocation.tzOffset,
    profileLocation.tzOffsetHours,
    profileLocation.baseTzOffset,
    profileLocation.baseTimezoneOffset,
    bodyLocation.timezoneOffsetHours,
    bodyLocation.timezoneOffset,
    bodyLocation.timezoneOffsetHour,
    bodyLocation.utcOffset,
    bodyLocation.utcOffsetHours,
    bodyLocation.tzOffset,
    bodyLocation.tzOffsetHours,
    bodyLocation.baseTzOffset,
    bodyLocation.baseTimezoneOffset,
    birthLocation.timezoneOffsetHours,
    birthLocation.timezoneOffset,
    birthLocation.timezoneOffsetHour,
    birthLocation.utcOffset,
    birthLocation.utcOffsetHours,
    birthLocation.tzOffset,
    birthLocation.tzOffsetHours,
    birthLocation.baseTzOffset,
    birthLocation.baseTimezoneOffset,
    user.timezoneOffsetHours,
    user.timezoneOffset,
    user.timezoneOffsetHour,
    user.utcOffset,
    user.utcOffsetHours,
    user.tzOffset,
    user.tzOffsetHours,
    user.baseTzOffset,
    user.baseTimezoneOffset,
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
  const birthLocationText = typeof birth.location === "string" ? birth.location : undefined;
  const userLocationText = typeof user.location === "string" ? user.location : undefined;
  const birthPlace = clean(pickFirst(
    body.birthPlace,
    body.place,
    body.locationName,
    birth.birthPlace,
    birth.place,
    birth.locationName,
    profileLocation.label,
    profileLocation.name,
    bodyLocation.label,
    bodyLocation.name,
    birthLocation.label,
    birthLocation.name,
    user.birthPlace,
    bodyLocationText,
    birthLocationText,
    userLocationText,
  ));
  const latitude = parseNum(pickFirstPresent(
    body.latitude,
    body.lat,
    birth.latitude,
    birth.lat,
    profileLocation.lat,
    profileLocation.latitude,
    bodyLocation.lat,
    bodyLocation.latitude,
    birthLocation.lat,
    birthLocation.latitude,
  ), NaN);
  const longitude = parseNum(pickFirstPresent(
    body.longitude,
    body.lng,
    body.lon,
    birth.longitude,
    birth.lng,
    birth.lon,
    profileLocation.lon,
    profileLocation.lng,
    profileLocation.longitude,
    bodyLocation.lon,
    bodyLocation.lng,
    bodyLocation.longitude,
    birthLocation.lon,
    birthLocation.lng,
    birthLocation.longitude,
  ), NaN);

  const out = {
    name: clean(pickFirst(body.name, profile.name, birth.name, user.name)) || undefined,
    gender: normalizeGender(pickFirst(body.gender, body.sex, profile.gender, profile.sex, birth.gender, birth.sex, user.gender, user.sex)),
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
      summary: `달 ${clean(moon?.sign) || "Moon"}은 감정의 밀도와 회복 속도를 비춥니다.`,
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
        : "노드 축은 익숙한 습관과 새롭게 배워야 할 방향을 함께 비춥니다.",
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
        text: `${houseFocus?.summary || "행성이 모인 하우스는 삶이 자주 시험하고 키우는 무대입니다."} ${retrogrades.length ? `역행 신호(${retrogrades.join(", ")})는 밖으로 밀어붙이기 전 안에서 숙성해야 할 재능을 비춥니다.` : "역행 압력이 적을수록 에너지는 비교적 직접적으로 표현됩니다."}`,
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

export function validateAstroPdfCompletionPayload({ pdfReady = {}, requireDownloadUrl = false } = {}) {
  const issues = [];
  const html = clean(pdfReady?.html);
  if (!html) issues.push("html.missing");
  if (html && !/<!doctype html>/i.test(html)) issues.push("html.doctype");
  if (html && !/<meta\s+charset=["']?UTF-8["']?/i.test(html)) issues.push("html.charset");

  const downloadUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
  if (requireDownloadUrl && !downloadUrl) issues.push("download_url.missing");

  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    chapterCount: 0,
    expectedChapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    htmlLength: html.length,
    hasDownloadUrl: Boolean(downloadUrl),
  };
}

export async function prepareAstroPremiumCalculation(env, rawInput = {}, options = {}) {
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

  emit("LocalCalculationJsonPrepared", {
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    hasBirthDate: Boolean(clean(birthInput.birthDate)),
    hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
    hasTimezone: Boolean(clean(birthInput.timezone)),
    hasLocation: Boolean(clean(birthInput.birthPlace)),
    houseSystemUsed: true,
    calculationMode: clean(localAstroChartJson?.calculationMode) || "strict-local",
  });

  emit("CalculationOnlyCompleted", {
    generationMode: ASTRO_PDF_CONFIG.generationMode,
    provider: ASTRO_PDF_CONFIG.provider,
    chartSource: clean(resolved?.source || localAstroChartJson?.calculationMode),
    hasPlanets: safeArray(localAstroChartJson?.chart?.planets).length > 0,
    hasHouses: safeArray(localAstroChartJson?.chart?.houses).length > 0,
    hasAspects: safeArray(localAstroChartJson?.chart?.aspects).length > 0,
  });

  return {
    ok: true,
    status: "calculated",
    birthInput,
    resolved,
    localAstroChartJson,
    chartValidation,
    transitValidation,
    generationMode: ASTRO_PDF_CONFIG.generationMode,
    provider: ASTRO_PDF_CONFIG.provider,
  };
}

export async function generateAstroPremiumReport(env, rawInput = {}, options = {}) {
  const prepared = await prepareAstroPremiumCalculation(env, rawInput, options);
  return {
    ok: true,
    status: "calculated",
    generationMode: ASTRO_PDF_CONFIG.generationMode,
    provider: ASTRO_PDF_CONFIG.provider,
    manuscriptSource: "calculation-only",
    chapterCount: 0,
    expectedChapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    localAstroChartJson: prepared.localAstroChartJson,
    birthInput: prepared.birthInput,
    chartValidation: prepared.chartValidation,
    transitValidation: prepared.transitValidation,
  };
}

export function validateAstroPayloadForApi(rawInput = {}) {
  const input = normalizeAstroPremiumBirthInput(rawInput.birthInput || rawInput);
  const missing = [];
  const validation = validateAstroPremiumBirthInput(input);
  if (!validation.ok) missing.push(...validation.missing);
  return { ok: missing.length === 0, missing };
}
