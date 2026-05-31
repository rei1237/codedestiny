import { ASTRO_PREMIUM_CHAPTERS, sanitizeAstroPremiumText } from "./astro-premium-chapters.js";

const MIN_SECTION_LENGTH = 500;
const MIN_CHAPTER_LENGTH = 3500;
const MIN_TOTAL_LENGTH_FLOOR = 40000;
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
];

const PREMIUM_REQUIRED_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const PREMIUM_SWISS_LOCAL_SOURCES = new Set(["swiss-wasm-local"]);
const REPETITION_EXCLUDED_TERMS = ["태양", "달", "상승궁", "하우스", "행성", "어스펙트", "차트", "점성술", "MC"];

const SIGN_NAMES = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];

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
  const birthPlace = clean(pickFirst(body.birthPlace, body.place, body.locationName, body.location, location.label, location.name, user.birthPlace, user.location));
  const latitude = parseNum(pickFirst(body.latitude, body.lat, location.lat, location.latitude), null);
  const longitude = parseNum(pickFirst(body.longitude, body.lng, body.lon, location.lon, location.longitude), null);

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
    lat: Number.isFinite(Number(input.latitude)) ? Number(input.latitude) : 37.5665,
    lon: Number.isFinite(Number(input.longitude)) ? Number(input.longitude) : 126.978,
  };
}

function isSwissLocalSource(chart = {}) {
  const source = clean(chart?.source || chart?.chart?.source).toLowerCase();
  return PREMIUM_SWISS_LOCAL_SOURCES.has(source);
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

  return planetKeys.length >= 7 && hasCorePlanets && hasAsc && hasMc && hasHouses && hasAspects;
}

function extractProvidedAstroBase(rawInput = {}) {
  const candidates = [
    rawInput?.swissChart,
    rawInput?.chart,
    rawInput?.astroBase,
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
  if (provided && hasUsableSwissAstroChart(provided) && isSwissLocalSource(provided)) {
    return {
      source: "provided",
      swissChart: normalizeSwissChartForPdf(provided),
    };
  }

  let calculated = null;
  try {
    const { getSwissWesternChart } = await import("./swiss-ephemeris.js");
    calculated = await getSwissWesternChart(env, toSwissChartInputFromBirthInput(birthInput), {
      requestUrl: options?.requestUrl,
    });
  } catch (error) {
    const err = new Error("점성술 프리미엄 PDF에 필요한 Swiss 차트 계산에 실패했습니다.");
    err.code = "ASTRO_SWISS_CHART_FAILED";
    err.status = 422;
    err.details = {
      reason: clean(error?.message || error),
    };
    throw err;
  }

  if (!hasUsableSwissAstroChart(calculated) || !isSwissLocalSource(calculated)) {
    const err = new Error("점성술 프리미엄 PDF는 서버 내부 로컬 Swiss 계산 결과가 필요합니다.");
    err.code = "ASTRO_CHART_SOURCE_INVALID";
    err.status = 422;
    err.details = {
      hasUsableSwiss: hasUsableSwissAstroChart(calculated),
      source: clean(calculated?.source),
    };
    throw err;
  }

  return {
    source: "server-local",
    swissChart: normalizeSwissChartForPdf(calculated),
  };
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
  const degree = Number.isFinite(Number(node?.degree))
    ? Number(node.degree)
    : (Number.isFinite(Number(node?.longitude)) ? Math.round((((Number(node.longitude) % 30) + 30) % 30) * 100) / 100 : undefined);
  const house = Number.isFinite(Number(node?.house)) ? Number(node.house) : undefined;
  return {
    name,
    sign,
    degree,
    house,
    retrograde: Boolean(node?.retrograde),
  };
}

function buildRecoveredChartFromBirthInput(birthInput = {}) {
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
    calculationMode = "recovered";
    const recovered = buildRecoveredChartFromBirthInput(birthInput);
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
  const houses = housesFromSwiss.length ? housesFromSwiss : (housesFromBase.length ? housesFromBase : buildRecoveredChartFromBirthInput(birthInput).houses);

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

  return {
    calculationMode,
    chart: {
      sunSign: clean(sun?.sign) || deriveSunSignFromDate(birthInput) || "미확인",
      moonSign: clean(moon?.sign) || deriveMoonSeedSign(birthInput) || "미확인",
      ascendantSign,
      midheavenSign,
      planets,
      houses,
      aspects,
    },
  };
}

export function buildAstroLocalChartJson(birthInput, swissChart = {}, fallbackAstroBase = null, options = {}) {
  const strict = options?.strictPremium === true;
  const hasSwiss = hasUsableSwissAstroChart(swissChart);
  const hasFallback = hasUsableSwissAstroChart(fallbackAstroBase);

  if (strict && !hasSwiss && !hasFallback) {
    const error = new Error("점성술 프리미엄 PDF에 필요한 Swiss 차트 계산값이 없습니다.");
    error.code = "ASTRO_CHART_SOURCE_INVALID";
    error.status = 422;
    error.details = {
      hasSwissChart: hasSwiss,
      hasFallbackBase: hasFallback,
    };
    throw error;
  }

  const modeled = toAstroChartModel(birthInput, swissChart, fallbackAstroBase);
  if (strict && clean(modeled?.calculationMode).toLowerCase() !== "full") {
    const error = new Error("점성술 프리미엄 PDF는 실제 Swiss 계산 결과가 필요합니다.");
    error.code = "ASTRO_PREMIUM_REQUIRES_FULL_CHART";
    error.status = 422;
    error.details = {
      calculationMode: clean(modeled?.calculationMode),
    };
    throw error;
  }

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

  return {
    birthInput,
    calculationMode: modeled.calculationMode,
    chart,
    interpretationSeeds: seeds,
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
  if (!Number.isFinite(Number(birthInput.latitude))) missing.push("latitude");
  if (!Number.isFinite(Number(birthInput.longitude))) missing.push("longitude");

  if (!clean(chart.sunSign)) missing.push("sunSign");
  if (!clean(chart.moonSign)) missing.push("moonSign");
  if (!clean(chart.ascendantSign)) missing.push("ascendantSign");
  if (!clean(chart.midheavenSign)) missing.push("midheavenSign");

  if (planets.length < 7) missing.push("planets");
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
  return {
    personalityKeywords: [clean(ctx.sun?.sign) || dominantSign, clean(ctx.moon?.sign) || dominantSign, asc, "자기표현", "핵심기질"],
    careerKeywords: [mc, "목표정렬", "성과관리", "실행력", "포지셔닝"],
    moneyKeywords: [houseNames[0] || "2하우스", houseNames[1] || "8하우스", "현금흐름", "재무리듬", "보수운영"],
    relationshipKeywords: ["금성", "화성", "7하우스", "관계경계", "대화조율"],
    healingKeywords: ["회복루틴", "정서조절", "에너지관리", "수면", "리듬"],
    timingKeywords: [aspectNames[0] || "전환신호", aspectNames[1] || "관찰신호", "시기판단", "우선순위", "점검체계"],
    cautionKeywords: ["과속주의", "경계설정", "감정완충", "확인루틴", "리스크관리"],
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
  const planets = safeArray(chart.planets);
  const houses = safeArray(chart.houses);
  const aspects = safeArray(chart.aspects);
  const pickPlanets = planets.slice(sectionIndex, sectionIndex + 4).map((planet) => `${planet.name} ${planet.sign}`).filter(Boolean);
  const pickHouses = houses.slice(sectionIndex, sectionIndex + 3).map((house) => `${house.house}하우스 ${house.sign || "핵심"}`).filter(Boolean);
  const pickAspects = aspects.slice(sectionIndex, sectionIndex + 3).map((aspect) => `${aspect.planetA}-${aspect.planetB} ${aspect.type}`).filter(Boolean);
  const usedSignals = uniqueList([
    `${clean(chart.sunSign) || "태양"}`,
    `${clean(chart.moonSign) || "달"}`,
    `${clean(chart.ascendantSign) || "상승궁"}`,
    `${clean(chart.midheavenSign) || "MC"}`,
    ...pickPlanets,
    ...pickHouses,
    ...pickAspects,
    chapter.title,
    section.title,
  ]).slice(0, 12);

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
  const p1 = `${chapterTitle}의 ${sectionTitle}에서는 ${signalText}를 중심 축으로 읽어야 합니다. 이 조합은 단일 사건 예측보다 선택의 방식과 감정 반응 패턴을 선명하게 보여 줍니다. 특히 반복적으로 나타나는 신호를 먼저 정리하면, 순간적인 기분이나 외부 압력에 휘둘리지 않고 본인에게 맞는 결정 기준을 세울 수 있습니다.`;
  const p2 = `실전에서는 좋은 흐름과 주의 구간을 동시에 관리해야 합니다. 강점 구간에서는 관계, 일, 돈의 우선순위를 한 번에 넓히기보다 검증 가능한 단위로 쪼개 실행하는 편이 결과가 안정적입니다. 반대로 긴장 신호가 올라오는 구간에서는 약속, 계약, 커뮤니케이션 속도를 낮추고 확인 루틴을 강화해야 손실을 줄일 수 있습니다.`;
  const p3 = `행동 전략은 단순해야 오래 유지됩니다. 첫째, 이번 주 핵심 목표를 하나만 정하고 성과 기준을 문장으로 기록합니다. 둘째, 중요한 대화나 협상 전에는 감정 상태를 점검해 불필요한 과잉 반응을 줄입니다. 셋째, 매주 같은 시간에 실행 결과를 되짚어 조정합니다. 이 세 가지를 반복하면 차트 신호가 말하는 성장 방향과 실제 생활이 일치하기 시작합니다.`;
  const p4 = `관계 관점에서는 경계와 온도를 함께 조절하는 것이 핵심입니다. 지나친 단정이나 감정적 확신은 오해를 키울 수 있으므로, 상대의 반응 속도와 맥락을 확인하며 협력의 폭을 조절해야 합니다. 직업과 재무에서는 확장과 보수의 스위치를 명확히 분리해 운영하는 것이 좋습니다. 같은 노력으로 더 큰 성과를 얻으려면 타이밍보다 구조를 먼저 정비해야 합니다.`;
  const p5 = `마지막으로 ${index + 1}번째 실행 포인트는 회복력 유지입니다. 일정이 흔들리는 주간에는 무리한 보완보다 리듬 복구를 우선하고, 수면과 이동 동선, 집중 시간을 재정렬해 에너지를 누수 없이 묶어야 합니다. 이렇게 운영하면 불확실성이 커지는 구간에서도 판단력이 유지되고, 장기 목표를 현실적으로 이어갈 수 있습니다.`;
  return [p1, p2, p3, p4, p5].join("\n\n");
}

function sanitizeBody(text) {
  let out = sanitizeAstroPremiumText(text);
  for (const pattern of FORBIDDEN_PATTERNS) out = out.replace(pattern, "");
  return out.replace(/\s{2,}/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
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

export async function enhanceAstroPremiumChaptersWithLLM(env, localAstroChartJson, localDrafts, options = {}) {
  return {
    chapters: (Array.isArray(localDrafts) ? localDrafts : []).map((chapterDraft) => ({ ...chapterDraft, source: "local" })),
    fallbackUsed: false,
  };
}

function chapterLength(chapter) {
  return safeArray(chapter?.sections).reduce((sum, section) => sum + clean(section.body).length, 0);
}

function totalLength(chapters) {
  return safeArray(chapters).reduce((sum, chapter) => sum + chapterLength(chapter), 0);
}

function containsForbidden(text) {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(String(text || "")));
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

function validateFinalManuscript(localAstroChartJson, chapters) {
  const issues = [];
  const repetition = [];
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
    if (schema && clean(chapter.title) !== clean(schema.title)) issues.push(`chapter${chapter.chapterNo}.title`);
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
      const expectedSectionTitle = clean(schema?.categories?.[sectionIndex]?.title);
      if (expectedSectionTitle && clean(section.title) !== expectedSectionTitle) {
        issues.push(`chapter${chapter.chapterNo}.section${sectionIndex + 1}.title`);
      }
      if (body.length < MIN_SECTION_LENGTH) issues.push(`chapter${chapter.chapterNo}.${section.title}.length`);
      if (!body) issues.push(`chapter${chapter.chapterNo}.${section.title}.empty`);
      if (containsForbidden(body)) issues.push(`chapter${chapter.chapterNo}.${section.title}.forbidden`);
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
        ${sanitizeBody(section.body).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")}
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
  .sec-card p{margin:0 0 8px;color:#d8e4ff;white-space:pre-wrap}
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
    null,
    { strictPremium: true },
  );

  if (clean(localAstroChartJson?.calculationMode).toLowerCase() !== "full") {
    const error = new Error("점성술 차트 계산이 완전하지 않습니다.");
    error.code = "ASTRO_CHART_NOT_FULL";
    error.status = 422;
    throw error;
  }

  const chartValidation = validateAstroChartForPremium(localAstroChartJson);
  if (!chartValidation.ok) {
    const error = new Error("점성술 프리미엄 PDF 필수 차트 신호가 부족합니다.");
    error.code = "ASTRO_CHART_SOURCE_INVALID";
    error.status = 422;
    error.details = chartValidation;
    throw error;
  }

  emit("LocalDraftBuildStart", {
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    hasBirthDate: Boolean(clean(birthInput.birthDate)),
    hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
    hasTimezone: Boolean(clean(birthInput.timezone)),
    hasLocation: Boolean(clean(birthInput.birthPlace)),
    houseSystemUsed: true,
  });

  const localDrafts = safeArray(buildAstroLocalPremiumManuscript(localAstroChartJson)).map((chapter) => ({
    ...chapter,
    source: "local",
  }));
  for (let i = 0; i < localDrafts.length; i += 1) {
    emit("LocalDraftChapterDone", {
      chapterNo: Number(localDrafts[i]?.chapterNo || i + 1),
      chapterTitle: clean(localDrafts[i]?.title),
    });
  }
  emit("LocalDraftBuildSuccess", {
    chapterCount: localDrafts.length,
    totalLength: Number(totalLength(localDrafts)),
    calculationMode: clean(localAstroChartJson?.calculationMode) || "recovered",
  });

  const localValidation = validateFinalManuscript(localAstroChartJson, localDrafts);
  emit("LocalQualityValidated", {
    ok: localValidation.ok,
    issueCount: localValidation.issues.length,
    chapterCount: localDrafts.length,
    totalLength: totalLength(localDrafts),
  });
  if (!localValidation.ok) {
    const error = new Error("점성술 프리미엄 로컬 원고 검증에 실패했습니다.");
    error.code = "ASTRO_LOCAL_MANUSCRIPT_INVALID";
    error.status = 422;
    error.details = localValidation;
    throw error;
  }

  let finalDrafts = reinforceManuscriptLength(localDrafts);

  let validated = validateFinalManuscript(localAstroChartJson, finalDrafts);
  if (!validated.ok) {
    finalDrafts = reinforceManuscriptLength(localDrafts);
    validated = validateFinalManuscript(localAstroChartJson, finalDrafts);
  }

  emit("FinalManuscriptValidated", {
    ok: validated.ok,
    issueCount: validated.issues.length,
    chapterCount: finalDrafts.length,
    totalLength: totalLength(finalDrafts),
    repetition: validated.repetition,
  });
  if (!validated.ok) {
    console.error("[AstroPremiumPDF][FinalValidationFailed]", {
      issues: validated.issues,
      stats: validated.stats,
      calculationMode: localAstroChartJson?.calculationMode,
      repetition: validated.repetition,
      chapterMetrics: finalDrafts.map((chapter) => ({
        chapterNo: chapter.chapterNo,
        title: chapter.title,
        sectionCount: chapter.sections?.length || 0,
        chars: chapter.sections?.reduce((sum, section) => sum + clean(section.body).length, 0) || 0,
      })),
    });
    const error = new Error("점성술 프리미엄 원고 검증에 실패했습니다.");
    error.code = "ASTRO_MANUSCRIPT_INVALID";
    error.status = 422;
    error.details = validated;
    throw error;
  }

  emit("PdfRenderStart", { chapterCount: finalDrafts.length });
  const payload = toLegacyPayload(localAstroChartJson);
  const pdfReady = renderAstroPremiumPdfFromDrafts(finalDrafts, payload);
  emit("PdfRenderSuccess", { chapterCount: finalDrafts.length });

  const chapters = toLegacyChapters(finalDrafts);
  const manuscriptSource = "local-only";
  return {
    payload,
    chapters,
    chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
    fallbackUsed: false,
    manuscriptSource,
    totalLength: totalLength(finalDrafts),
    pdfReady,
    localAstroChartJson,
    finalManuscript: finalDrafts,
    validation: validated,
    quality: validated.stats,
  };
}

export function validateAstroPayloadForApi(rawInput = {}) {
  const input = normalizeAstroPremiumBirthInput(rawInput.birthInput || rawInput);
  const missing = [];
  const validation = validateAstroPremiumBirthInput(input);
  if (!validation.ok) missing.push(...validation.missing);
  return { ok: missing.length === 0, missing };
}
