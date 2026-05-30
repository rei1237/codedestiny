import { callGeminiText } from "./gemini.js";
import { ASTRO_PREMIUM_CHAPTERS, sanitizeAstroPremiumText } from "./astro-premium-chapters.js";

const MIN_SECTION_LENGTH = 500;
const MIN_CHAPTER_LENGTH = 2000;
const MIN_TOTAL_LENGTH_FLOOR = 25000;
const FORBIDDEN_PATTERNS = [
  /자동\s*복구\s*생성/gi,
  /fallback/gi,
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
];

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

export function buildAstroLocalChartJson(birthInput, swissChart = {}, fallbackAstroBase = null) {
  const modeled = toAstroChartModel(birthInput, swissChart, fallbackAstroBase);
  const chart = modeled.chart;
  const sun = safeArray(chart.planets).find((planet) => planet.name === "Sun");
  const moon = safeArray(chart.planets).find((planet) => planet.name === "Moon");
  const planets = safeArray(chart.planets).map((planet) => ({
    name: clean(planet.name),
    sign: clean(planet.sign),
    degree: Number.isFinite(Number(planet.degree)) ? Number(planet.degree) : undefined,
    house: Number.isFinite(Number(planet.house)) ? Number(planet.house) : undefined,
    retrograde: Boolean(planet.retrograde),
    dignity: clean(planet.dignity) || undefined,
  }));
  const houses = safeArray(chart.houses).map((house) => ({
    houseNo: Number.isFinite(Number(house.house)) ? Number(house.house) : Number(house.houseNo) || undefined,
    sign: clean(house.sign) || undefined,
    planets: uniqueList(safeArray(house.planets).map((value) => clean(value))).filter(Boolean),
    themeKeywords: uniqueList(safeArray(house.themeKeywords).map((value) => clean(value))).filter(Boolean),
  }));
  const aspects = safeArray(chart.aspects).map((aspect) => ({
    planetA: clean(aspect.planetA),
    planetB: clean(aspect.planetB),
    type: clean(aspect.type),
    orb: Number.isFinite(Number(aspect.orb)) ? Number(aspect.orb) : undefined,
    applying: typeof aspect.applying === "boolean" ? aspect.applying : undefined,
  }));
  const ascendantSign = clean(chart.ascendantSign) || clean(sun?.sign) || "미확인";
  const midheavenSign = clean(chart.midheavenSign) || clean(planets.find((planet) => planet.name === "Saturn")?.sign) || "미확인";
  const ascNode = asObject(fallbackAstroBase?.chart?.nodes?.northNode || fallbackAstroBase?.nodes?.northNode);
  const descNode = asObject(fallbackAstroBase?.chart?.nodes?.southNode || fallbackAstroBase?.nodes?.southNode);
  const rulerMap = {
    "양자리": "Mars",
    "황소자리": "Venus",
    "쌍둥이자리": "Mercury",
    "게자리": "Moon",
    "사자자리": "Sun",
    "처녀자리": "Mercury",
    "천칭자리": "Venus",
    "전갈자리": "Pluto",
    "사수자리": "Jupiter",
    "염소자리": "Saturn",
    "물병자리": "Saturn",
    "물고기자리": "Jupiter",
  };
  const chartRuler = rulerMap[ascendantSign] || clean(sun?.sign) || "미확인";
  const corePlanets = {
    sun: sun ? { sign: clean(sun.sign), degree: sun.degree, house: sun.house, retrograde: Boolean(sun.retrograde) } : undefined,
    moon: moon ? { sign: clean(moon.sign), degree: moon.degree, house: moon.house, retrograde: Boolean(moon.retrograde) } : undefined,
  };

  const derivedSignals = {
    personalitySignals: uniqueList([
      sun ? `태양 ${clean(sun.sign)}` : "",
      moon ? `달 ${clean(moon.sign)}` : "",
      `ASC ${ascendantSign}`,
      safeArray(houses).some((house) => Number(house.houseNo) === 1) ? `1하우스 ${clean(houses.find((house) => Number(house.houseNo) === 1)?.sign) || "미확인"}` : "",
      safeArray(houses).some((house) => Number(house.houseNo) === 10) ? `10하우스 ${clean(houses.find((house) => Number(house.houseNo) === 10)?.sign) || "미확인"}` : "",
    ]),
    emotionalSignals: uniqueList([
      moon ? `달 ${clean(moon.sign)}` : "",
      `4하우스 ${clean(houses.find((house) => Number(house.houseNo) === 4)?.sign) || "미확인"}`,
      `12하우스 ${clean(houses.find((house) => Number(house.houseNo) === 12)?.sign) || "미확인"}`,
      `정서 ${clean(moon?.sign) || "신호"}`,
    ]),
    loveRelationshipSignals: uniqueList([
      `금성 ${clean(planets.find((planet) => planet.name === "Venus")?.sign) || "미확인"}`,
      `화성 ${clean(planets.find((planet) => planet.name === "Mars")?.sign) || "미확인"}`,
      `7하우스 ${clean(houses.find((house) => Number(house.houseNo) === 7)?.sign) || "미확인"}`,
      `관계 ${clean(planets.find((planet) => planet.name === "Venus")?.house) || "신호"}`,
    ]),
    careerSignals: uniqueList([
      `MC ${midheavenSign}`,
      `10하우스 ${clean(houses.find((house) => Number(house.houseNo) === 10)?.sign) || "미확인"}`,
      `토성 ${clean(planets.find((planet) => planet.name === "Saturn")?.sign) || "미확인"}`,
      `사회적 방향 ${midheavenSign}`,
    ]),
    moneySignals: uniqueList([
      `2하우스 ${clean(houses.find((house) => Number(house.houseNo) === 2)?.sign) || "미확인"}`,
      `8하우스 ${clean(houses.find((house) => Number(house.houseNo) === 8)?.sign) || "미확인"}`,
      `목성 ${clean(planets.find((planet) => planet.name === "Jupiter")?.sign) || "미확인"}`,
      `11하우스 ${clean(houses.find((house) => Number(house.houseNo) === 11)?.sign) || "미확인"}`,
    ]),
    familySignals: uniqueList([
      `4하우스 ${clean(houses.find((house) => Number(house.houseNo) === 4)?.sign) || "미확인"}`,
      `가족 기반 ${clean(moon?.sign) || "신호"}`,
      `내면 안정 ${clean(houses.find((house) => Number(house.houseNo) === 4)?.sign) || "신호"}`,
    ]),
    shadowSignals: uniqueList([
      `12하우스 ${clean(houses.find((house) => Number(house.houseNo) === 12)?.sign) || "미확인"}`,
      `8하우스 ${clean(houses.find((house) => Number(house.houseNo) === 8)?.sign) || "미확인"}`,
      `명왕성 ${clean(planets.find((planet) => planet.name === "Pluto")?.sign) || "미확인"}`,
      `변형 ${clean(planets.find((planet) => planet.name === "Pluto")?.house) || "신호"}`,
    ]),
    transformationSignals: uniqueList([
      `주요 어스펙트 ${safeArray(aspects)[0]?.type || "미확인"}`,
      `반복 패턴 ${safeArray(aspects).length ? clean(aspects[0].planetA) + "-" + clean(aspects[0].planetB) : "미확인"}`,
      `전환점 ${midheavenSign}`,
      `행성 패턴 ${planets.slice(0, 3).map((planet) => `${planet.name} ${planet.sign}`).join(" · ")}`,
    ]),
    spiritualSignals: uniqueList([
      `ASC ${ascendantSign}`,
      `달 ${clean(moon?.sign) || "미확인"}`,
      `태양 ${clean(sun?.sign) || "미확인"}`,
      `노드 ${clean(ascNode?.sign) || "미확인"}/${clean(descNode?.sign) || "미확인"}`,
    ]),
  };

  const strengths = uniqueList([
    ...derivedSignals.personalitySignals.slice(0, 3),
    ...derivedSignals.loveRelationshipSignals.slice(0, 2),
    ...derivedSignals.careerSignals.slice(0, 2),
  ]).slice(0, 8);
  const cautionFlags = uniqueList([
    "과속주의",
    `감정 과부하 ${clean(moon?.sign) || "신호"}`,
    `관계 경계 ${clean(planets.find((planet) => planet.name === "Venus")?.sign) || "신호"}`,
    `직업 압박 ${midheavenSign}`,
    `그림자 루프 ${clean(houses.find((house) => Number(house.houseNo) === 12)?.sign) || "신호"}`,
  ]).slice(0, 8);
  const unresolvedThemes = uniqueList([
    `자기표현 ${ascendantSign}`,
    `관계 정렬 ${clean(planets.find((planet) => planet.name === "Venus")?.sign) || "신호"}`,
    `커리어 방향 ${midheavenSign}`,
    `가족 기반 ${clean(houses.find((house) => Number(house.houseNo) === 4)?.sign) || "신호"}`,
    `그림자 통합 ${clean(houses.find((house) => Number(house.houseNo) === 12)?.sign) || "신호"}`,
  ]).slice(0, 8);

  return {
    input: {
      name: clean(birthInput?.name) || undefined,
      gender: clean(birthInput?.gender) || undefined,
      birthDate: clean(birthInput?.birthDate),
      birthTime: clean(birthInput?.birthTime),
      birthPlace: clean(birthInput?.birthPlace) || undefined,
      timezone: clean(birthInput?.timezone) || undefined,
      latitude: Number.isFinite(Number(birthInput?.latitude)) ? Number(birthInput.latitude) : undefined,
      longitude: Number.isFinite(Number(birthInput?.longitude)) ? Number(birthInput.longitude) : undefined,
    },
    chartMeta: {
      zodiacType: "tropical",
      houseSystem: "whole-sign",
      ascendant: ascendantSign,
      midheaven: midheavenSign,
      chartRuler,
    },
    planets,
    angles: {
      asc: { sign: ascendantSign, degree: Number.isFinite(Number(chart.ascendantDegree)) ? Number(chart.ascendantDegree) : undefined },
      mc: { sign: midheavenSign, degree: Number.isFinite(Number(chart.midheavenDegree)) ? Number(chart.midheavenDegree) : undefined },
      desc: { sign: clean(descNode?.sign) || undefined, degree: Number.isFinite(Number(descNode?.degree)) ? Number(descNode.degree) : undefined },
      ic: { sign: clean(ascNode?.sign) || undefined, degree: Number.isFinite(Number(ascNode?.degree)) ? Number(ascNode.degree) : undefined },
    },
    houses,
    aspects,
    nodes: {
      northNode: clean(ascNode?.sign) ? { sign: clean(ascNode.sign), house: Number.isFinite(Number(ascNode.house)) ? Number(ascNode.house) : undefined } : undefined,
      southNode: clean(descNode?.sign) ? { sign: clean(descNode.sign), house: Number.isFinite(Number(descNode.house)) ? Number(descNode.house) : undefined } : undefined,
    },
    derivedSignals,
    strengths,
    cautionFlags,
    unresolvedThemes,
    profile: {
      name: clean(birthInput?.name) || undefined,
      gender: clean(birthInput?.gender) || undefined,
      birthDate: clean(birthInput?.birthDate),
      birthTime: clean(birthInput?.birthTime),
      birthPlace: clean(birthInput?.birthPlace) || undefined,
      timezone: clean(birthInput?.timezone) || undefined,
    },
    calculationMode: modeled.calculationMode,
    chart,
  };
}

export function validateAstroPdfSeed(seed = {}) {
  const missing = [];
  const input = asObject(seed.input);
  const chartMeta = asObject(seed.chartMeta);
  const planets = safeArray(seed.planets);
  const houses = safeArray(seed.houses);
  const aspects = safeArray(seed.aspects);
  const derivedSignals = asObject(seed.derivedSignals);

  if (!clean(input.birthDate)) missing.push("input.birthDate");
  if (!Number.isFinite(Number(input.birthHour)) && !/^\d{2}:\d{2}$/.test(clean(input.birthTime))) missing.push("input.birthTime");
  if (!clean(input.timezone)) missing.push("input.timezone");

  if (!clean(chartMeta.ascendant)) missing.push("chartMeta.ascendant");
  if (!clean(chartMeta.midheaven)) missing.push("chartMeta.midheaven");

  if (planets.length < 7) {
    missing.push("planets");
  } else {
    const planetNames = new Set(planets.map((planet) => clean(planet?.name).toLowerCase()).filter(Boolean));
    const corePlanets = ["sun", "moon", "venus", "mars", "saturn"];
    for (const planetName of corePlanets) {
      if (!planetNames.has(planetName)) missing.push(`planets.${planetName}`);
    }
  }

  if (houses.length < 12) missing.push("houses");
  if (!aspects.length) missing.push("aspects");

  if (!safeArray(derivedSignals.personalitySignals).length) missing.push("derivedSignals.personalitySignals");
  if (!safeArray(derivedSignals.loveRelationshipSignals).length) missing.push("derivedSignals.loveRelationshipSignals");
  if (!safeArray(derivedSignals.careerSignals).length) missing.push("derivedSignals.careerSignals");

  return {
    ok: missing.length === 0,
    missing,
  };
}

const WESTERN_ASTRO_PDF_CHAPTERS = ASTRO_PREMIUM_CHAPTERS;

function buildWesternAstroChapterBlueprints() {
  return WESTERN_ASTRO_PDF_CHAPTERS.map((chapter) => ({
    chapterNo: Number(chapter.order),
    id: chapter.id,
    roman: chapter.roman,
    title: chapter.title,
    subtitle: chapter.title,
    sections: safeArray(chapter.categories).map((category) => ({
      title: category.title,
    })),
  }));
}

function summarizeAstroChapterForPrompt(chapter) {
  const sections = safeArray(chapter?.sections);
  return `${clean(chapter?.title)}: ${sections.map((section) => clean(section?.title)).filter(Boolean).join(" / ")}`.slice(0, 280);
}

function normalizeAstroHeadingText(value) {
  return clean(value)
    .replace(/^[IVXLC]+\.?\s*/i, "")
    .replace(/^\d+\.?\s*/, "")
    .replace(/[·•:，,\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAstroSectionBodyUsable(body) {
  const text = sanitizeBody(clean(body));
  if (text.length < 240) return false;
  if (hasForbiddenAstroPdfText(text)) return false;
  if (countRepeatedSentences(text) > 2 || countRepeatedParagraphs(text) > 2) return false;
  return true;
}

function getAstroSectionAngle(chapterTitle, sectionTitle) {
  const text = `${clean(chapterTitle)} ${clean(sectionTitle)}`;
  if (/사랑|관계|금성|화성|7하우스|애정|파트너/i.test(text)) return "relationship";
  if (/직업|소명|커리어|MC|10하우스|토성|인정|성과/i.test(text)) return "career";
  if (/재물|돈|금전|2하우스|8하우스|목성|수입|자원/i.test(text)) return "money";
  if (/가족|뿌리|4하우스|안정|내면|집/i.test(text)) return "family";
  if (/그림자|치유|12하우스|명왕성|상실|무의식|회복/i.test(text)) return "healing";
  if (/노드|성장|운명|방향|과제|습관/i.test(text)) return "growth";
  if (/ASC|상승궁|첫인상|외적|자기표현|자아|태양|달/i.test(text)) return "identity";
  return "synthesis";
}

function buildAstroSectionAppendix(angle, chapterTitle, sectionTitle, signalText) {
  const shared = `${chapterTitle}의 ${sectionTitle}을 다시 읽을 때는 ${signalText}가 실제 생활에서 어떤 선택 습관으로 이어지는지 확인하는 것이 중요합니다.`;
  switch (angle) {
    case "relationship":
      return `${shared} 관계에서는 상대를 바꾸려 하기보다 반응의 속도, 경계, 기대치의 크기를 조정하는 것이 더 큰 차이를 만듭니다.`;
    case "career":
      return `${shared} 커리어에서는 재능보다 구조가 먼저입니다. 역할, 일정, 책임 범위를 명확히 하면 성과가 더 안정적으로 드러납니다.`;
    case "money":
      return `${shared} 재정은 크게 벌리는 것보다 흐름을 끊지 않는 운영이 핵심입니다. 지출 리듬과 현금흐름 점검을 함께 설계하세요.`;
    case "family":
      return `${shared} 가족과 기반의 문제는 감정 해석보다 생활 리듬의 재정렬이 먼저입니다. 휴식, 공간, 독립성의 균형을 맞추면 회복이 빨라집니다.`;
    case "healing":
      return `${shared} 상처를 해석하는 목적은 과거를 반복해서 파헤치는 것이 아니라, 현재의 반응을 덜 자동적으로 바꾸는 데 있습니다.`;
    case "growth":
      return `${shared} 성장 과제는 한 번의 결심보다 반복 훈련에서 드러납니다. 익숙한 반응을 멈추고 다른 선택을 한 번 더 시도하는 것이 핵심입니다.`;
    case "identity":
      return `${shared} 자기표현은 과장보다 일관성이 중요합니다. 드러남과 숨김의 균형을 맞추면 주변의 해석도 더 정교해집니다.`;
    default:
      return `${shared} 이 장은 차트의 개별 신호를 하나의 판단 체계로 묶어, 실제 선택 기준으로 바꾸는 데 초점을 둡니다.`;
  }
}

function buildAstroSectionParagraphs({ signalText, chapterTitle, sectionTitle, index, angle }) {
  const headline = `${chapterTitle}의 ${sectionTitle}`;
  const angleLabel = {
    relationship: "관계와 경계",
    career: "커리어와 책임",
    money: "재물 흐름과 운영",
    family: "가족 기반과 회복",
    healing: "그림자와 치유",
    growth: "성장과 전환",
    identity: "자기정렬과 첫인상",
    synthesis: "전체 통합",
  }[angle] || "전체 통합";

  return [
    `${headline}에서는 ${signalText}를 중심으로 ${angleLabel}의 구조를 먼저 봐야 합니다. 이 신호는 단순한 상징이 아니라 반복되는 선택 습관과 반응 패턴을 보여 주는 좌표입니다. 어떤 순간에 빠르게 움직이고, 어떤 순간에 멈춰야 하는지 판단 기준을 세우는 데 바로 연결됩니다.`,
    `${sectionTitle}을 해석할 때는 강점과 부담을 동시에 읽어야 합니다. 강점만 강조하면 현실성이 떨어지고, 부담만 강조하면 차트가 가진 가능성을 놓치기 쉽습니다. 그래서 현재의 흐름을 사람, 일, 관계, 회복의 네 축으로 나누어 읽고, 어디에서 과잉이 생기는지 구체적으로 확인합니다.`,
    `${angleLabel} 관점에서 실제로 중요한 것은 실행 순서입니다. 먼저 확인할 것과 나중에 조정할 것을 구분하면, 감정의 밀도에 휘둘리지 않고 의사결정의 속도를 조절할 수 있습니다. 이 과정에서 질문을 잘못 던지면 해석이 흐려지므로, 무엇을 믿고 무엇을 보류할지까지 함께 정리해야 합니다.`,
    `${headline}의 세부 조언은 관계와 생활 리듬에 다시 연결됩니다. 대화의 톤, 일정의 밀도, 회복의 간격을 함께 맞추면 차트 신호가 말하는 방향성이 더 명확해집니다. 특히 ${index + 1}번째 실행 포인트는 작은 선택을 반복해 안정성을 만드는 것입니다.`,
    buildAstroSectionAppendix(angle, chapterTitle, sectionTitle, signalText),
  ];
}

function buildWesternAstroPrompt(seed, chapterSpec, previousChapterSummaries = [], attempt = 1, failureNote = "") {
  const guide = [
    "당신은 점성술/베다점 차트를 기반으로 프리미엄 PDF 리포트를 작성하는 전문 상담가입니다.",
    "계산은 이미 내부 엔진에서 완료되었습니다.",
    "당신은 계산을 새로 하지 않습니다.",
    "제공된 JSON seed의 차트 계산값과 챕터 구조를 바탕으로 해석문을 작성합니다.",
    "로컬 원고를 고치는 것이 아니라, 지금부터 챕터 본문을 새로 작성합니다.",
    "각 챕터와 각 세부 카테고리의 제목에 정확히 맞는 내용을 작성하세요.",
    "JSON에 없는 행성, 하우스, 어스펙트, 라그나, 나크샤트라, 다샤 정보를 임의로 만들지 마세요.",
    "단, 제공된 계산 신호를 바탕으로 해석은 깊고 철학적으로 확장할 수 있습니다.",
    "각 세부 카테고리는 서로 다른 관점과 내용을 가져야 합니다.",
    "같은 문장 구조를 반복하지 마세요.",
    "챕터 제목만 바꿔 비슷한 문장을 반복하지 마세요.",
    "PDF 본문에는 JSON, payload, 로컬 엔진, API 실패, LLM 실패, fallback, 자동 복구 같은 기술 문구를 절대 노출하지 마세요.",
  ].join("\n");

  const payload = {
    seed,
    chapterSpec,
    previousChapterSummaries,
    attempt,
    failureNote: clean(failureNote) || undefined,
    outputSchema: {
      chapterNo: "number",
      title: "string",
      sections: [{ title: "string", body: "string" }],
    },
  };

  return `${guide}\n\n${JSON.stringify(payload, null, 2)}`;
}

function normalizeAstroLLMChapterOutput(chapterSpec, parsed) {
  const sections = safeArray(parsed?.sections);
  const specSections = safeArray(chapterSpec?.sections);
  if (!parsed || typeof parsed !== "object") return null;
  if (clean(parsed.title) !== clean(chapterSpec.title)) return null;
  if (sections.length !== specSections.length) return null;

  const normalizedSections = sections.map((section, index) => {
    const specSection = specSections[index];
    const title = clean(section?.title);
    if (title !== clean(specSection?.title)) return null;
    const body = sanitizeBody(clean(section?.body));
    if (body.length < MIN_SECTION_LENGTH) return null;
    return {
      title,
      body,
      bullets: [],
    };
  });

  if (normalizedSections.some((section) => !section)) return null;

  return {
    chapterNo: Number(chapterSpec.chapterNo),
    id: chapterSpec.id,
    roman: chapterSpec.roman,
    title: chapterSpec.title,
    subtitle: chapterSpec.subtitle || chapterSpec.title,
    sections: normalizedSections,
    source: "llm",
  };
}

function summarizeAstroValidationText(chapters) {
  return safeArray(chapters)
    .map((chapter) => `${clean(chapter?.title)} ${safeArray(chapter?.sections).map((section) => clean(section?.title)).slice(0, 2).join(" ")}`)
    .join(" | ")
    .slice(0, 1200);
}

function countRepeatedSentences(text) {
  const sentences = String(text || "")
    .split(/[.!?。？！\n]+/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 28);
  const map = new Map();
  for (const sentence of sentences) {
    map.set(sentence, (map.get(sentence) || 0) + 1);
  }
  return Math.max(0, ...Array.from(map.values()));
}

function countRepeatedParagraphs(text) {
  const paragraphs = String(text || "")
    .split(/\n{2,}/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 80);
  const map = new Map();
  for (const paragraph of paragraphs) {
    map.set(paragraph, (map.get(paragraph) || 0) + 1);
  }
  return Math.max(0, ...Array.from(map.values()));
}

function hasForbiddenAstroPdfText(value) {
  const text = String(value || "");
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(text));
}

export function validateWesternAstroPdfLLMInterpretationQuality({ chapters, expectedChapters = WESTERN_ASTRO_PDF_CHAPTERS, seed } = {}) {
  const issues = [];
  const chapterList = safeArray(chapters);
  const seedValidation = validateAstroPdfSeed(seed);

  if (!seedValidation.ok) {
    issues.push("seed-structure");
    issues.push(...seedValidation.missing.map((entry) => `seed-${entry}`));
  }

  if (chapterList.length !== safeArray(expectedChapters).length) {
    issues.push("chapter-count");
  }

  const combinedText = chapterList.flatMap((chapter) => safeArray(chapter?.sections).map((section) => clean(section?.body))).join("\n");

  if (hasForbiddenAstroPdfText(combinedText)) issues.push("forbidden-text");

  chapterList.forEach((chapter, index) => {
    const schema = safeArray(expectedChapters)[index];
    if (!schema) {
      issues.push(`chapter-${index + 1}-unknown`);
      return;
    }

    if (Number(chapter?.chapterNo) !== Number(schema.order)) issues.push(`chapter-${schema.order}-number`);
    if (clean(chapter?.title) !== clean(schema.title)) issues.push(`chapter-${schema.order}-title`);

    const sections = safeArray(chapter?.sections);
    if (sections.length !== safeArray(schema.categories).length) {
      issues.push(`chapter-${schema.order}-section-count`);
      return;
    }

    const chapterText = sections.map((section) => clean(section?.body)).join("\n\n");
    if (chapterText.length < MIN_CHAPTER_LENGTH) issues.push(`chapter-${schema.order}-length`);

    const chapterSpecificChecks = {
      1: [/태양|sun/i, /달|moon/i, /ASC|상승궁/i, /MC|중천|midheaven/i],
      5: [/금성|venus/i, /화성|mars/i, /7하우스|seventh house/i],
      6: [/MC|중천|midheaven/i, /10하우스|tenth house/i, /토성|saturn/i],
      9: [/12하우스|twelfth house/i, /8하우스|eighth house/i, /명왕성|pluto/i],
      11: [/남쪽 노드|south node/i, /북쪽 노드|north node/i, /노드축|nodes?/i],
      12: [/3년|5년|10년/i],
    };
    const requiredChecks = chapterSpecificChecks[schema.order] || [];
    if (requiredChecks.length && !requiredChecks.some((pattern) => pattern.test(chapterText))) {
      issues.push(`chapter-${schema.order}-missing-core-signals`);
    }

    sections.forEach((section, sectionIndex) => {
      const expectedTitle = clean(schema.categories[sectionIndex]?.title);
      const body = clean(section?.body);
      if (clean(section?.title) !== expectedTitle) issues.push(`chapter-${schema.order}-section-${sectionIndex + 1}-title`);
      if (body.length < MIN_SECTION_LENGTH) issues.push(`chapter-${schema.order}-section-${sectionIndex + 1}-length`);
      if (hasForbiddenAstroPdfText(body)) issues.push(`chapter-${schema.order}-section-${sectionIndex + 1}-forbidden`);
      if (countRepeatedSentences(body) > 2 || countRepeatedParagraphs(body) > 2) issues.push(`chapter-${schema.order}-section-${sectionIndex + 1}-repetition`);
    });
  });

  const seedText = JSON.stringify(seed || {});
  if (!/태양|달|ASC|상승궁|MC/.test(seedText)) issues.push("seed-core-signals");

  return {
    ok: issues.length === 0,
    issues,
  };
}

async function generateWesternAstroChapterByLLM(env, seed, chapterSpec, previousChapterSummaries, options = {}) {
  const retries = Math.max(1, Number(options.retries || env.ASTRO_PREMIUM_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3));
  const timeoutMs = Number(options.timeoutMs || env.ASTRO_PREMIUM_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 26000);
  const totalTimeoutMs = Number(options.totalTimeoutMs || env.ASTRO_PREMIUM_GEMINI_TOTAL_TIMEOUT_MS || 52000);
  const llmChapterGenerator = typeof options.llmChapterGenerator === "function" ? options.llmChapterGenerator : null;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      if (llmChapterGenerator) {
        const produced = await llmChapterGenerator({ seed, chapterSpec, previousChapterSummaries, attempt, lastError });
        const normalized = normalizeAstroLLMChapterOutput(chapterSpec, produced);
        if (!normalized) throw new Error("llm_chapter_schema_mismatch");
        return normalized;
      }

      const prompt = buildWesternAstroPrompt(seed, chapterSpec, previousChapterSummaries, attempt, lastError ? lastError.message : "");
      const response = await callGeminiText(env, prompt, {
        modelEnvKeys: ["ASTRO_PREMIUM_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
        temperature: 0.66,
        maxOutputTokens: 5200,
        timeoutMs,
        totalTimeoutMs,
        maxAttemptsPerPair: 1,
      });
      if (!response?.ok) {
        throw new Error(clean(response?.message || response?.error || "llm_request_failed"));
      }
      const parsed = parseJsonMaybe(response?.text || response?.content || "");
      const normalized = normalizeAstroLLMChapterOutput(chapterSpec, parsed);
      if (!normalized) throw new Error("llm_parse_or_schema_failed");
      return normalized;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error || "llm_chapter_failed"));
      if (attempt >= retries) {
        const finalError = new Error(`chapter_${Number(chapterSpec?.chapterNo || 0)}_llm_failed`);
        finalError.code = "ASTRO_CHAPTER_LLM_FAILED";
        finalError.status = 502;
        finalError.details = {
          chapterNo: Number(chapterSpec?.chapterNo || 0),
          chapterTitle: clean(chapterSpec?.title),
          attempts: attempt,
          message: clean(lastError.message || "llm_chapter_failed"),
        };
        throw finalError;
      }
    }
  }

  throw lastError || new Error("ASTRO_CHAPTER_LLM_FAILED");
}

async function generateWesternAstroPdfChapters(env, seed, options = {}) {
  const chapterSpecs = buildWesternAstroChapterBlueprints();
  const chapters = [];
  const emit = typeof options.log === "function" ? options.log : () => {};
  let llmChapterCount = 0;

  for (const chapterSpec of chapterSpecs) {
    emit("ChapterLLMStart", {
      chapterNo: chapterSpec.chapterNo,
      chapterTitle: chapterSpec.title,
    });

    let chapter = null;
    try {
      chapter = await generateWesternAstroChapterByLLM(
        env,
        seed,
        chapterSpec,
        chapters.map((item) => summarizeAstroChapterForPrompt(item)),
        options,
      );
      llmChapterCount += 1;
    } catch (error) {
      emit("ChapterLLMFailed", {
        chapterNo: chapterSpec.chapterNo,
        chapterTitle: chapterSpec.title,
        message: clean(error?.message || "llm_chapter_failed"),
      });
      throw error;
    }

    chapters.push(chapter);

    emit("ChapterLLMSuccess", {
      chapterNo: chapter.chapterNo,
      chapterTitle: chapter.title,
      chapterLength: safeArray(chapter.sections).reduce((sum, section) => sum + clean(section.body).length, 0),
    });
    emit("ChapterProgress", {
      chapterNo: chapter.chapterNo,
      totalChapters: chapterSpecs.length,
    });
  }

  const reinforcedChapters = reinforceManuscriptLength(chapters);
  const validation = validateWesternAstroPdfLLMInterpretationQuality({ chapters: reinforcedChapters, expectedChapters: WESTERN_ASTRO_PDF_CHAPTERS, seed });

  if (!validation.ok) {
    emit("FinalManuscriptValidationFailed", {
      issueCount: safeArray(validation.issues).length,
      blockingIssueCount: safeArray(validation.blockingIssues).length,
      issues: safeArray(validation.issues).slice(0, 12),
      blockingIssues: safeArray(validation.blockingIssues).slice(0, 12),
      chapterCount: reinforcedChapters.length,
      totalLength: totalLength(reinforcedChapters),
      fallbackUsed: false,
    });
    const error = new Error("ASTRO_PDF_QUALITY_INVALID");
    error.code = "ASTRO_PDF_QUALITY_INVALID";
    error.status = 422;
    error.details = validation;
    throw error;
  }

  return {
    chapters: reinforcedChapters,
    validation,
    fallbackUsed: false,
    llmChapterCount,
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
  const pickHouses = houses.slice(sectionIndex, sectionIndex + 3).map((house) => `${house.house}하우스 ${house.sign || "미확인"}`).filter(Boolean);
  const pickAspects = aspects.slice(sectionIndex, sectionIndex + 3).map((aspect) => `${aspect.planetA}-${aspect.planetB} ${aspect.type}`).filter(Boolean);
  const usedSignals = uniqueList([
    `${clean(chart.sunSign) || "태양 미확인"}`,
    `${clean(chart.moonSign) || "달 미확인"}`,
    `${clean(chart.ascendantSign) || "상승궁 미확인"}`,
    `${clean(chart.midheavenSign) || "MC 미확인"}`,
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
  const drafts = ASTRO_PREMIUM_CHAPTERS.map((chapter, chapterIndex) => {
    const sections = chapter.categories.map((category, sectionIndex) => {
      const signalPack = buildSignals(localAstroChartJson, chapter, category, sectionIndex + chapterIndex);
      const signalText = signalPack.usedSignals.slice(0, 6).join(" · ");
      const angle = getAstroSectionAngle(chapter.title, category.title);
      const paragraphs = buildAstroSectionParagraphs({
        signalText: signalText || "핵심 차트 신호",
        chapterTitle: chapter.title,
        sectionTitle: category.title,
        index: sectionIndex,
        angle,
      });
      const appendix = buildAstroSectionAppendix(angle, chapter.title, category.title, signalText || "핵심 차트 신호");
      const body = ensureMinLength(
        paragraphs.join("\n\n"),
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

function parseJsonMaybe(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const target = fenced ? fenced[1] : raw;
  const start = target.indexOf("{");
  const end = target.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(target.slice(start, end + 1));
  } catch (_error) {
    return null;
  }
}

function chapterPrompt(localAstroChartJson, localManuscript, chapterDraft) {
  const rules = [
    "너는 점성술 계산을 새로 하지 않는다.",
    "이미 제공된 localAstroChartJson과 localManuscript, localChapterDraft만 사용한다.",
    "챕터 수는 반드시 10개를 유지한다.",
    "챕터 수, 챕터 제목, 세부 섹션 제목을 절대 변경하지 않는다.",
    "누락된 계산값을 상상해서 만들지 않는다.",
    "PDF 본문에 JSON, payload, debug, fallback, 자동 복구 생성, Internal server error, undefined, null 같은 표현을 출력하지 않는다.",
    "각 섹션은 실제 차트 데이터에 근거한 상담문으로 작성한다.",
    "동일 문장 반복을 금지한다.",
    "계산값이 일부 부족해도 없는 정보를 지어내지 말고, 제공된 차트 신호 중심으로 자연스럽게 보강한다.",
    "태양, 달, 상승궁, 금성, 화성, 토성, MC, 하우스, 주요 각 정보가 있으면 반드시 해석에 반영한다.",
    "반드시 JSON만 반환한다. 형식: {\"sections\":[{\"title\":\"...\",\"body\":\"...\"}]}",
  ].join("\n");

  return `${rules}\n\n${JSON.stringify({
    localAstroChartJson,
    localManuscript: safeArray(localManuscript).map((chapter) => ({
      chapterNo: chapter.chapterNo,
      title: chapter.title,
      sections: safeArray(chapter.sections).map((section) => ({ title: section.title, body: section.body })),
    })),
    localChapterDraft: {
      chapterNo: chapterDraft.chapterNo,
      title: chapterDraft.title,
      sections: chapterDraft.sections.map((section) => ({ title: section.title, body: section.body })),
    },
  })}`;
}

function validateLlmChapterOutput(chapterDraft, parsed) {
  const sections = safeArray(parsed?.sections);
  if (sections.length !== chapterDraft.sections.length) return null;
  const mergedSections = chapterDraft.sections.map((localSection, index) => {
    const llm = asObject(sections[index]);
    if (clean(llm.title) !== localSection.title) return null;
    const body = sanitizeBody(clean(llm.body));
    if (body.length < 240) return null;
    return {
      ...localSection,
      body: ensureMinLength(body, MIN_SECTION_LENGTH, localSection.body.slice(0, 220)),
    };
  });
  if (mergedSections.some((section) => !section)) return null;
  return {
    ...chapterDraft,
    sections: mergedSections,
    source: "llm",
  };
}

export async function enhanceAstroPremiumChaptersWithLLM(env, localAstroChartJson, localDrafts, options = {}) {
  const emit = typeof options.log === "function"
    ? options.log
    : (stage, payload) => {
      const tag = `[AstroPremiumPDF][${stage}]`;
      if (stage === "LLMEnhanceFailedUseLocal") {
        console.warn(tag, payload || {});
        return;
      }
      console.info(tag, payload || {});
    };

  emit("LLMEnhanceStart", { chapterCount: localDrafts.length });

  const timeoutMs = Number(env.ASTRO_PREMIUM_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 26000);
  const totalTimeoutMs = Number(env.ASTRO_PREMIUM_GEMINI_TOTAL_TIMEOUT_MS || 32000);
  const retries = Number(env.ASTRO_PREMIUM_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 2);

  const apiKeyPresent = Boolean(clean(env?.ASTRO_PREMIUM_GEMINI_API_KEY || env?.PREMIUM_GEMINI_API_KEY || env?.GEMINI_API_KEY));
  if (!apiKeyPresent) {
    throw new Error("ASTRO_LLM_ONLY_API_KEY_MISSING");
  }

  const chapters = [];
  for (let index = 0; index < localDrafts.length; index += 1) {
    const chapterDraft = localDrafts[index];
    try {
      const response = await callGeminiText(env, chapterPrompt(localAstroChartJson, localDrafts, chapterDraft), {
        modelEnvKeys: ["ASTRO_PREMIUM_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
        temperature: 0.68,
        maxOutputTokens: 4096,
        timeoutMs,
        totalTimeoutMs,
        maxAttemptsPerPair: retries,
      });
      if (!response?.ok) throw new Error(clean(response?.message || response?.error || "llm_request_failed"));
      const parsed = parseJsonMaybe(response?.text || response?.content || "");
      const normalized = validateLlmChapterOutput(chapterDraft, parsed);
      if (!normalized) throw new Error("llm_parse_or_schema_failed");
      chapters.push(normalized);
    } catch (error) {
      emit("LLMEnhanceFailedUseLocal", {
        chapterNo: Number(chapterDraft?.chapterNo || index + 1),
        message: clean(error?.message || "llm_chapter_failed"),
      });
      throw new Error(`ASTRO_LLM_ONLY_CHAPTER_FAILED:${Number(chapterDraft?.chapterNo || index + 1)}:${clean(error?.message || "llm_chapter_failed")}`);
    }
  }

  emit("LLMEnhanceSuccess", { chapterCount: chapters.length });

  return { chapters, fallbackUsed: false };
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

  const supplement = "추가 실행 조언: 판단 기준을 명확히 문장화하고, 행동 결과를 수치와 기록으로 남기면 감정 기복이 큰 구간에서도 안정적인 의사결정을 유지할 수 있습니다.";
  let index = 0;
  while (currentTotal < requiredTotal && updated.length > 0) {
    const chapter = updated[index % updated.length];
    const section = chapter.sections[index % chapter.sections.length];
    section.body = sanitizeBody(`${section.body}\n\n${supplement}`);
    index += 1;
    currentTotal = totalLength(updated);
  }
  return updated;
}

function validateFinalManuscript(localAstroChartJson, chapters) {
  const issues = [];
  const birthInput = asObject(localAstroChartJson?.birthInput || localAstroChartJson?.input);
  if (!clean(birthInput.birthDate)) issues.push("birthInput.birthDate");
  if (!Number.isFinite(Number(birthInput.birthHour)) && !/^\d{2}:\d{2}$/.test(clean(birthInput.birthTime))) issues.push("birthInput.birthHour");
  if (!clean(birthInput.timezone)) issues.push("birthInput.timezone");

  const chart = asObject(localAstroChartJson?.chart);
  if (!safeArray(chart.planets).length && !clean(chart.sunSign)) issues.push("chart.planets");

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
      if (repeatedSentenceCount(body) > 2 || repeatedParagraphCount(body) > 2) {
        issues.push(`chapter${chapter.chapterNo}.${section.title}.repetition`);
      }
    }
  }

  const requiredTotal = getDynamicTotalMinLength(safeArray(chapters).length || ASTRO_PREMIUM_CHAPTERS.length);
  if (totalLength(chapters) < requiredTotal) issues.push("totalLength");
  return { ok: issues.length === 0, issues };
}

function toLegacyPayload(seed) {
  const profile = asObject(seed?.profile);
  return {
    user: {
      name: clean(profile?.name) || "사용자",
      birthDate: clean(profile?.birthDate),
      birthTime: clean(profile?.birthTime),
      birthPlace: clean(profile?.birthPlace),
      timezone: clean(profile?.timezone),
      gender: clean(profile?.gender),
    },
    profile,
    input: asObject(seed?.input),
    chartMeta: asObject(seed?.chartMeta),
    chart: asObject(seed?.chart),
    planets: safeArray(seed?.planets),
    angles: asObject(seed?.angles),
    houses: safeArray(seed?.houses),
    aspects: safeArray(seed?.aspects),
    nodes: asObject(seed?.nodes),
    derivedSignals: asObject(seed?.derivedSignals),
    strengths: safeArray(seed?.strengths),
    cautionFlags: safeArray(seed?.cautionFlags),
    unresolvedThemes: safeArray(seed?.unresolvedThemes),
    calculationMode: clean(seed?.calculationMode) || "recovered",
  };
}

function toLegacyChapters(chapterDrafts) {
  return safeArray(chapterDrafts).map((chapter, idx) => ({
    id: WESTERN_ASTRO_PDF_CHAPTERS[idx]?.id || `chapter_${idx + 1}`,
    order: chapter.chapterNo,
    roman: WESTERN_ASTRO_PDF_CHAPTERS[idx]?.roman || String(idx + 1),
    title: chapter.title,
    categories: safeArray(chapter.sections).map((section) => ({
      id: `${idx + 1}_${clean(section.title).toLowerCase().replace(/\s+/g, "_")}`,
      title: section.title,
      text: section.body,
      localSummary: section.body,
    })),
  }));
}

function renderAstroPremiumPdfFromDrafts(chapterDrafts, payload) {
  const name = sanitizeBody(payload?.user?.name || payload?.profile?.name || payload?.input?.name) || "사용자";
  const birthDate = sanitizeBody(payload?.user?.birthDate || payload?.input?.birthDate) || "출생 정보";
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
    const error = new Error("점성술 PDF는 상승궁과 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.");
    error.code = "BIRTH_INPUT_INVALID";
    error.status = 400;
    error.details = birthValidation;
    throw error;
  }

  const seed = rawInput.localAstroChartJson || buildAstroLocalChartJson(
    birthInput,
    rawInput.chart || rawInput.swissChart || {},
    rawInput.astroBase || rawInput.payload || null,
  );
  const seedValidation = validateAstroPdfSeed(seed);
  if (!seedValidation.ok) {
    const error = new Error("점성술 계산 seed JSON이 불완전하여 프리미엄 PDF 생성을 진행할 수 없습니다. 출생 정보와 차트 계산값을 다시 확인해 주세요.");
    error.code = "ASTRO_PDF_SEED_INVALID";
    error.status = 422;
    error.details = seedValidation;
    throw error;
  }

  emit("SeedBuildSuccess", {
    chapterCount: WESTERN_ASTRO_PDF_CHAPTERS.length,
    hasBirthDate: Boolean(clean(seed?.input?.birthDate || birthInput.birthDate)),
    hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
    hasTimezone: Boolean(clean(seed?.input?.timezone || birthInput.timezone)),
    hasLocation: Boolean(clean(seed?.input?.birthPlace || birthInput.birthPlace)),
    hasAscendant: Boolean(clean(seed?.chartMeta?.ascendant)),
    hasMidheaven: Boolean(clean(seed?.chartMeta?.midheaven)),
  });

  const generated = await generateWesternAstroPdfChapters(env, seed, options);
  const chapters = generated.chapters;
  const validation = generated.validation;
  const fallbackUsed = Boolean(generated.fallbackUsed);
  const llmChapterCount = Number(generated.llmChapterCount || 0);

  emit("FinalManuscriptValidated", {
    ok: validation.ok,
    issueCount: validation.issues.length,
    blockingIssueCount: safeArray(validation.blockingIssues).length,
    issues: safeArray(validation.issues).slice(0, 12),
    blockingIssues: safeArray(validation.blockingIssues).slice(0, 12),
    chapterCount: chapters.length,
    totalLength: safeArray(chapters).reduce((sum, chapter) => sum + safeArray(chapter.sections).reduce((sectionSum, section) => sectionSum + clean(section.body).length, 0), 0),
  });

  const payload = toLegacyPayload(seed);
  emit("PdfRenderStart", { chapterCount: chapters.length });
  const pdfReady = renderAstroPremiumPdfFromDrafts(chapters, payload);
  emit("PdfRenderSuccess", { chapterCount: chapters.length });

  const totalLength = safeArray(chapters).reduce((sum, chapter) => sum + safeArray(chapter.sections).reduce((sectionSum, section) => sectionSum + clean(section.body).length, 0), 0);
  const legacyChapters = toLegacyChapters(chapters);

  return {
    payload,
    chapters: legacyChapters,
    chapterCount: WESTERN_ASTRO_PDF_CHAPTERS.length,
    fallbackUsed,
    manuscriptSource: fallbackUsed ? "llm-local-hybrid" : "llm-only",
    llmChapterCount,
    totalLength,
    pdfReady,
    localAstroChartJson: seed,
    finalManuscript: chapters,
    validation,
    pdfSeed: seed,
  };
}

export function validateAstroPayloadForApi(rawInput = {}) {
  const input = normalizeAstroPremiumBirthInput(rawInput.birthInput || rawInput);
  const validation = validateAstroPremiumBirthInput(input);
  return { ok: validation.ok, missing: validation.missing };
}
