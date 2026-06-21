import tzLookup from "tz-lookup";
import { getSwissVedicPlanets } from "./swiss-ephemeris.js";
import { buildVedicLocalChartJson } from "./vedic-premium-generator.js";

export const VEDIC_PRASHNA_PROMPT_FEATURE_KEY = "vedic_prashna_prompt";
export const VEDIC_PRASHNA_PROMPT_PRICE = 50;
export const VEDIC_PRASHNA_PROMPT_AMOUNT_KRW = 5000;
export const VEDIC_PRASHNA_PROMPT_PRODUCT_CODE = "PRASHNA_PROMPT_1";
export const VEDIC_PRASHNA_PROMPT_PRODUCT_NAME = "프라슈나 프롬프트";

const UNKNOWN = "미산출";
const ZODIAC_TYPE = "Sidereal";
const AYANAMSHA = "Lahiri";
const HOUSE_SYSTEM = "Whole Sign";
const NODE_TYPE = "True Node";
const ENGINE_NAME = "Swiss Ephemeris via sweph-wasm";
const ENGINE_VERSION = "sweph-wasm 2.6.9";

const SIGNS = [
  ["Aries", "양자리", "Mars"],
  ["Taurus", "황소자리", "Venus"],
  ["Gemini", "쌍둥이자리", "Mercury"],
  ["Cancer", "게자리", "Moon"],
  ["Leo", "사자자리", "Sun"],
  ["Virgo", "처녀자리", "Mercury"],
  ["Libra", "천칭자리", "Venus"],
  ["Scorpio", "전갈자리", "Mars"],
  ["Sagittarius", "사수자리", "Jupiter"],
  ["Capricorn", "염소자리", "Saturn"],
  ["Aquarius", "물병자리", "Saturn"],
  ["Pisces", "물고기자리", "Jupiter"],
];

const NAKSHATRAS = [
  ["Ashwini", "Ketu"], ["Bharani", "Venus"], ["Krittika", "Sun"],
  ["Rohini", "Moon"], ["Mrigashira", "Mars"], ["Ardra", "Rahu"],
  ["Punarvasu", "Jupiter"], ["Pushya", "Saturn"], ["Ashlesha", "Mercury"],
  ["Magha", "Ketu"], ["Purva Phalguni", "Venus"], ["Uttara Phalguni", "Sun"],
  ["Hasta", "Moon"], ["Chitra", "Mars"], ["Swati", "Rahu"],
  ["Vishakha", "Jupiter"], ["Anuradha", "Saturn"], ["Jyeshtha", "Mercury"],
  ["Mula", "Ketu"], ["Purva Ashadha", "Venus"], ["Uttara Ashadha", "Sun"],
  ["Shravana", "Moon"], ["Dhanishta", "Mars"], ["Shatabhisha", "Rahu"],
  ["Purva Bhadrapada", "Jupiter"], ["Uttara Bhadrapada", "Saturn"], ["Revati", "Mercury"],
];

const PLANET_KO = {
  Sun: "태양",
  Moon: "달",
  Mars: "화성",
  Mercury: "수성",
  Jupiter: "목성",
  Venus: "금성",
  Saturn: "토성",
  Rahu: "라후",
  Ketu: "케투",
};

const QUESTION_CATEGORIES = [
  { key: "연애·관계", mainHouses: ["5하우스", "7하우스"], supportHouses: ["11하우스"], karakas: ["금성", "달"], pattern: /연애|관계|상대|사랑|호감|썸|고백|만남|이별/ },
  { key: "결혼", mainHouses: ["7하우스"], supportHouses: ["2하우스", "11하우스"], karakas: ["금성", "목성"], pattern: /결혼|혼인|배우자|약혼/ },
  { key: "재회", mainHouses: ["7하우스"], supportHouses: ["5하우스", "11하우스"], karakas: ["금성", "달"], pattern: /재회|다시 만나|복귀|전남친|전여친|헤어진/ },
  { key: "직장·이직", mainHouses: ["10하우스"], supportHouses: ["6하우스", "11하우스"], karakas: ["태양", "토성"], pattern: /직장|이직|커리어|회사|취업|퇴사|제안|승진|업무/ },
  { key: "사업", mainHouses: ["10하우스", "7하우스"], supportHouses: ["2하우스", "11하우스"], karakas: ["수성", "목성"], pattern: /사업|창업|매출|거래처|프로젝트|투자 유치/ },
  { key: "계약·문서", mainHouses: ["3하우스", "7하우스"], supportHouses: ["9하우스", "10하우스"], karakas: ["수성", "목성"], pattern: /계약|문서|서류|합의|협상|신청|제안서/ },
  { key: "재물", mainHouses: ["2하우스", "11하우스"], supportHouses: ["5하우스", "8하우스"], karakas: ["목성", "금성"], pattern: /돈|재물|수익|매수|매도|자산|투자|대출|금전/ },
  { key: "부동산", mainHouses: ["4하우스"], supportHouses: ["2하우스", "11하우스"], karakas: ["화성", "금성"], pattern: /부동산|집|이사|매매|전세|월세|토지|상가/ },
  { key: "시험·합격", mainHouses: ["5하우스", "9하우스"], supportHouses: ["6하우스", "11하우스"], karakas: ["목성", "수성"], pattern: /시험|합격|면접|자격증|입시|공부|성적/ },
  { key: "이동·여행", mainHouses: ["3하우스", "9하우스"], supportHouses: ["12하우스"], karakas: ["달", "수성"], pattern: /이동|여행|출국|유학|출장|이민|비자/ },
  { key: "분실물", mainHouses: ["2하우스", "4하우스"], supportHouses: ["8하우스", "12하우스"], karakas: ["수성", "달"], pattern: /분실|잃어버|찾을|도난|사라진/ },
  { key: "건강 관련 참고 질문", mainHouses: ["1하우스", "6하우스"], supportHouses: ["8하우스", "12하우스"], karakas: ["태양", "달"], pattern: /건강|병|치료|수술|회복|증상|의사|검사/ },
  { key: "가족", mainHouses: ["2하우스", "4하우스"], supportHouses: ["9하우스"], karakas: ["달", "태양"], pattern: /가족|부모|자녀|형제|집안/ },
  { key: "소송·분쟁", mainHouses: ["6하우스", "7하우스"], supportHouses: ["8하우스", "9하우스"], karakas: ["화성", "토성"], pattern: /소송|분쟁|고소|재판|갈등|다툼|법적/ },
];

function clean(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function normalizeDegree(value) {
  const n = num(value);
  if (!Number.isFinite(n)) return NaN;
  return ((n % 360) + 360) % 360;
}

function signFromLongitude(longitude) {
  const lon = normalizeDegree(longitude);
  if (!Number.isFinite(lon)) return null;
  const index = Math.floor(lon / 30);
  const sign = SIGNS[index] || SIGNS[0];
  return {
    index,
    sign: sign[0],
    signKo: sign[1],
    lord: sign[2],
    degree: lon % 30,
    absoluteDegree: lon,
  };
}

function nakshatraFromLongitude(longitude) {
  const lon = normalizeDegree(longitude);
  if (!Number.isFinite(lon)) return null;
  const span = 360 / 27;
  const index = Math.max(0, Math.min(26, Math.floor(lon / span)));
  const pada = Math.max(1, Math.min(4, Math.floor(((lon % span) / (span / 4))) + 1));
  const row = NAKSHATRAS[index] || [];
  return { name: row[0] || UNKNOWN, lord: row[1] || UNKNOWN, pada };
}

function formatDegree(value) {
  const n = num(value);
  if (!Number.isFinite(n)) return UNKNOWN;
  return `${n.toFixed(2)}°`;
}

function localParts(date, timezone) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = {};
  dtf.formatToParts(date).forEach((part) => {
    if (part.type !== "literal") parts[part.type] = part.value;
  });
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function timezoneOffsetHours(date, timezone) {
  const p = localParts(date, timezone);
  const localAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second || 0);
  return Math.round(((localAsUtc - date.getTime()) / 60000)) / 60;
}

function isoLocal(date, timezone) {
  const p = localParts(date, timezone);
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}:${String(p.second || 0).padStart(2, "0")}`;
}

function validateQuestion(question) {
  const text = clean(question).replace(/\s+/g, " ");
  if (!text) {
    const error = new Error("질문이 비어 있습니다.");
    error.code = "INVALID_QUESTION";
    throw error;
  }
  if (text.length < 12) {
    const error = new Error("결과의 판단 기준을 분명하게 만들 수 있도록 대상, 상황, 확인하고 싶은 내용을 조금 더 구체적으로 적어주세요.");
    error.code = "AMBIGUOUS_QUESTION";
    throw error;
  }
  if (text.length > 600) {
    const error = new Error("질문은 600자 이하로 입력해 주세요.");
    error.code = "QUESTION_TOO_LONG";
    throw error;
  }
  if (/([^\s])\1{12,}/u.test(text) || /^[^\p{L}\p{N}]{8,}$/u.test(text)) {
    const error = new Error("질문과 무관한 반복 문자는 사용할 수 없습니다.");
    error.code = "INVALID_QUESTION";
    throw error;
  }
  const questionMarks = (text.match(/[?？]/g) || []).length;
  const multiSignals = (text.match(/(?:그리고|또는|혹은|동시에|와\s+그리고|,\s*그리고|;)/g) || []).length;
  if (questionMarks > 1 || multiSignals >= 2) {
    const error = new Error("프라슈나는 한 번에 하나의 질문을 다룹니다. 가장 먼저 확인하고 싶은 질문 하나만 남겨주세요.");
    error.code = "MULTIPLE_QUESTIONS";
    throw error;
  }
  return text;
}

function validateCoordinates(latitude, longitude) {
  const lat = num(latitude);
  const lon = num(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const error = new Error("프라슈나 차트를 생성하려면 현재 위치 또는 위도·경도가 필요합니다.");
    error.code = "LOCATION_REQUIRED";
    throw error;
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const error = new Error("위도는 -90~90, 경도는 -180~180 사이로 입력해 주세요.");
    error.code = "INVALID_LOCATION";
    throw error;
  }
  return { latitude: Number(lat.toFixed(6)), longitude: Number(lon.toFixed(6)) };
}

export function classifyPrashnaQuestion(question) {
  const text = clean(question);
  const matched = QUESTION_CATEGORIES.find((item) => item.pattern.test(text));
  const category = matched || {
    key: "기타",
    mainHouses: ["1하우스"],
    supportHouses: ["달", "라그나 로드"],
    karakas: ["달"],
  };
  return {
    category: category.key,
    mainHouses: category.mainHouses,
    supportHouses: category.supportHouses,
    naturalKarakas: category.karakas,
    reason: category.key === "기타"
      ? "질문의 주제가 복수 가능성을 지녀 라그나와 달을 우선 기준으로 두고 판단합니다."
      : `${category.key} 질문에서 전통적으로 먼저 확인하는 하우스와 자연 카라카를 기준으로 분류했습니다.`,
  };
}

export async function createPrashnaSnapshot(input = {}) {
  const question = validateQuestion(input.question);
  const { latitude, longitude } = validateCoordinates(input.latitude, input.longitude);
  let timezone = "";
  try {
    timezone = tzLookup(latitude, longitude);
  } catch (error) {
    const wrapped = new Error("현재 위치의 시간대를 확인하지 못했습니다. 위치를 다시 입력하거나 시간대를 확인해 주세요.");
    wrapped.code = "TIMEZONE_LOOKUP_FAILED";
    wrapped.cause = error;
    throw wrapped;
  }
  if (!timezone) {
    const error = new Error("현재 위치의 시간대를 확인하지 못했습니다. 위치를 다시 입력하거나 시간대를 확인해 주세요.");
    error.code = "TIMEZONE_LOOKUP_FAILED";
    throw error;
  }
  const capturedAt = input.now instanceof Date ? input.now : new Date();
  const capturedAtUtc = capturedAt.toISOString();
  const capturedAtLocal = isoLocal(capturedAt, timezone);
  const orderId = clean(input.orderId) || `prashna_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const questionMeta = classifyPrashnaQuestion(question);
  const snapshotHash = clean(input.snapshotHash)
    || await sha256Compat(`${question}|${latitude}|${longitude}|${timezone}|${capturedAtUtc}|${orderId}`);
  return {
    orderId,
    productCode: VEDIC_PRASHNA_PROMPT_PRODUCT_CODE,
    productName: VEDIC_PRASHNA_PROMPT_PRODUCT_NAME,
    amount: VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
    currency: "KRW",
    paymentType: "ONE_TIME",
    paymentStatus: "PENDING",
    generationStatus: "NOT_STARTED",
    question,
    questionCategory: questionMeta.category,
    questionMeta,
    latitude,
    longitude,
    timezone,
    timezoneOffsetHours: timezoneOffsetHours(capturedAt, timezone),
    capturedAtUtc,
    capturedAtLocal,
    zodiacType: ZODIAC_TYPE,
    ayanamsha: AYANAMSHA,
    houseSystem: HOUSE_SYSTEM,
    nodeType: NODE_TYPE,
    snapshotHash,
  };
}

async function sha256Compat(text) {
  const data = new TextEncoder().encode(String(text || ""));
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return String(text || "").length.toString(16);
}

function planetOwnedHouses(houses, planetName) {
  const ko = PLANET_KO[planetName] || planetName;
  return (Array.isArray(houses) ? houses : [])
    .filter((house) => clean(house?.lord) === planetName || clean(house?.lord) === ko)
    .map((house) => `${house.house || house.number}하우스`);
}

function normalizePlanet(planet, houses) {
  const name = clean(planet?.name);
  const longitude = normalizeDegree(planet?.longitude);
  const sign = clean(planet?.sign) || clean(planet?.signKo);
  const nak = clean(planet?.nakshatra);
  return {
    name,
    nameKo: PLANET_KO[name] || clean(planet?.nameKo, name || UNKNOWN),
    longitude: Number.isFinite(longitude) ? longitude : null,
    degree: Number.isFinite(num(planet?.degree)) ? Number(planet.degree) : null,
    sign: sign || UNKNOWN,
    signEn: clean(planet?.signEn, UNKNOWN),
    house: Number.isFinite(num(planet?.house)) ? Number(planet.house) : null,
    nakshatra: nak || UNKNOWN,
    pada: Number.isFinite(num(planet?.pada)) ? Number(planet.pada) : null,
    retrograde: planet?.retrograde === true,
    combust: UNKNOWN,
    dignity: clean(planet?.dignity, UNKNOWN),
    ownedHouses: planetOwnedHouses(houses, name),
  };
}

function planetLine(planet) {
  if (!planet) return UNKNOWN;
  const house = planet.house ? `${planet.house}하우스` : UNKNOWN;
  const pada = planet.pada ? `${planet.pada}` : UNKNOWN;
  const owned = Array.isArray(planet.ownedHouses) && planet.ownedHouses.length ? planet.ownedHouses.join(", ") : UNKNOWN;
  return `${planet.sign} ${formatDegree(planet.degree)} · ${house} · ${planet.nakshatra} 파다 ${pada} · 역행 ${planet.retrograde ? "예" : "아니오"} · 연소 ${planet.combust} · 품위 ${planet.dignity || UNKNOWN} · 소유 ${owned}`;
}

function buildHouseRows(houses, planets) {
  return Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    const house = (Array.isArray(houses) ? houses : []).find((row) => Number(row?.house || row?.number) === number) || {};
    const inHouse = (Array.isArray(planets) ? planets : []).filter((planet) => Number(planet.house) === number).map((planet) => planet.nameKo);
    return {
      house: number,
      sign: clean(house.sign, UNKNOWN),
      signEn: clean(house.signEn, UNKNOWN),
      lord: clean(house.lord, UNKNOWN),
      planets: inHouse,
      text: `${clean(house.sign, UNKNOWN)} · 로드 ${clean(house.lord, UNKNOWN)} · 입궁 행성 ${inHouse.length ? inHouse.join(", ") : "없음"}`,
    };
  });
}

function deriveVedicAspects(planets) {
  const rows = [];
  (Array.isArray(planets) ? planets : []).forEach((planet) => {
    if (!planet.house) return;
    const offsets = planet.name === "Mars" ? [4, 7, 8] : planet.name === "Jupiter" ? [5, 7, 9] : planet.name === "Saturn" ? [3, 7, 10] : [7];
    offsets.forEach((offset) => {
      rows.push(`${planet.nameKo} ${planet.house}하우스 → ${((planet.house + offset - 2) % 12) + 1}하우스`);
    });
  });
  return rows;
}

function deriveConjunctions(planets) {
  const byHouse = new Map();
  (Array.isArray(planets) ? planets : []).forEach((planet) => {
    if (!planet.house) return;
    const list = byHouse.get(planet.house) || [];
    list.push(planet.nameKo);
    byHouse.set(planet.house, list);
  });
  return Array.from(byHouse.entries())
    .filter(([, names]) => names.length > 1)
    .map(([house, names]) => `${house}하우스: ${names.join(", ")}`);
}

function deriveBeneficInfluences(planets) {
  return (Array.isArray(planets) ? planets : [])
    .filter((planet) => ["Jupiter", "Venus", "Mercury", "Moon"].includes(planet.name))
    .map((planet) => `${planet.nameKo} ${planet.house ? `${planet.house}하우스` : UNKNOWN}`);
}

function deriveMaleficInfluences(planets) {
  return (Array.isArray(planets) ? planets : [])
    .filter((planet) => ["Saturn", "Mars", "Rahu", "Ketu", "Sun"].includes(planet.name))
    .map((planet) => `${planet.nameKo} ${planet.house ? `${planet.house}하우스` : UNKNOWN}`);
}

function fillMissing(value) {
  if (value === null || value === undefined) return UNKNOWN;
  if (Array.isArray(value)) return value.length ? value : [UNKNOWN];
  if (typeof value === "object") {
    const out = {};
    Object.entries(value).forEach(([key, nested]) => {
      out[key] = fillMissing(nested);
    });
    return out;
  }
  const text = String(value).trim();
  return text ? value : UNKNOWN;
}

export async function calculatePrashnaChart(env, snapshot, options = {}) {
  const capturedAt = new Date(snapshot.capturedAtUtc);
  if (!Number.isFinite(capturedAt.getTime())) {
    const error = new Error("질문 시각 스냅샷이 올바르지 않습니다.");
    error.code = "INVALID_SNAPSHOT";
    throw error;
  }
  const local = localParts(capturedAt, snapshot.timezone);
  const timezoneOffset = Number.isFinite(num(snapshot.timezoneOffsetHours))
    ? Number(snapshot.timezoneOffsetHours)
    : timezoneOffsetHours(capturedAt, snapshot.timezone);
  const chartInput = {
    year: local.year,
    month: local.month,
    day: local.day,
    hour: local.hour,
    minute: local.minute + ((local.second || 0) / 60),
    timezone: timezoneOffset,
    lat: snapshot.latitude,
    lon: snapshot.longitude,
  };
  const swiss = await getSwissVedicPlanets(env, chartInput, {
    requestUrl: options.requestUrl,
    allowFallback: false,
  });
  const source = {
    ...swiss,
    ayanamsaName: AYANAMSHA,
    calculationSource: ENGINE_NAME,
  };
  const localChart = buildVedicLocalChartJson({
    ...source,
    birth: chartInput,
    location: {
      lat: snapshot.latitude,
      lon: snapshot.longitude,
      timezone: snapshot.timezone,
      timezoneOffset,
    },
  }, { strictPremium: true });
  const ascInfo = signFromLongitude(source.ascendantSidereal);
  const ascNak = nakshatraFromLongitude(source.ascendantSidereal);
  const planets = (localChart.chart?.planets || []).map((planet) => normalizePlanet(planet, localChart.chart?.houses || []));
  const houses = buildHouseRows(localChart.chart?.houses || [], planets);
  const moon = planets.find((planet) => planet.name === "Moon") || null;
  const planetByName = Object.fromEntries(planets.map((planet) => [planet.name, planet]));
  const chart = {
    basic: {
      question: snapshot.question,
      capturedAtUtc: snapshot.capturedAtUtc,
      capturedAtLocal: snapshot.capturedAtLocal,
      timezone: snapshot.timezone,
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      ayanamsha: snapshot.ayanamsha,
      houseSystem: snapshot.houseSystem,
      calculationEngine: ENGINE_NAME,
      calculationVersion: ENGINE_VERSION,
    },
    ascendant: {
      sign: ascInfo?.signKo || UNKNOWN,
      signEn: ascInfo?.sign || UNKNOWN,
      degree: Number.isFinite(ascInfo?.degree) ? ascInfo.degree : null,
      lord: ascInfo?.lord || UNKNOWN,
      nakshatra: ascNak?.name || UNKNOWN,
      pada: ascNak?.pada || null,
    },
    moon: moon ? {
      sign: moon.sign,
      degree: moon.degree,
      house: moon.house,
      nakshatra: moon.nakshatra,
      pada: moon.pada,
      condition: moon.dignity || UNKNOWN,
    } : {
      sign: UNKNOWN,
      degree: null,
      house: null,
      nakshatra: UNKNOWN,
      pada: null,
      condition: UNKNOWN,
    },
    planets,
    houses,
    conjunctions: deriveConjunctions(planets),
    aspects: deriveVedicAspects(planets),
    exchanges: [UNKNOWN],
    beneficInfluences: deriveBeneficInfluences(planets),
    maleficInfluences: deriveMaleficInfluences(planets),
    panchanga: {
      tithi: UNKNOWN,
      vara: UNKNOWN,
      yoga: UNKNOWN,
      karana: UNKNOWN,
      hora: UNKNOWN,
    },
    navamsa: UNKNOWN,
    additionalFactors: {
      gulika: UNKNOWN,
      mandi: UNKNOWN,
      sourceQuality: localChart.chartSourceQuality || UNKNOWN,
    },
    calculationEngine: ENGINE_NAME,
    calculationVersion: ENGINE_VERSION,
    calculatedAt: new Date().toISOString(),
    localChart,
    planetByName,
  };
  return fillMissing(chart);
}

function promptValue(value) {
  if (value === null || value === undefined) return UNKNOWN;
  if (Array.isArray(value)) return value.length ? value.join("\n") : UNKNOWN;
  if (typeof value === "object") return JSON.stringify(fillMissing(value), null, 2);
  return clean(value, UNKNOWN);
}

function housePromptMap(chart) {
  const map = {};
  (Array.isArray(chart.houses) ? chart.houses : []).forEach((house) => {
    map[`house${house.house}`] = house.text || UNKNOWN;
  });
  for (let i = 1; i <= 12; i += 1) {
    if (!map[`house${i}`]) map[`house${i}`] = UNKNOWN;
  }
  return map;
}

export function buildPrashnaPrompt({ snapshot, chart }) {
  const planets = chart?.planetByName || {};
  const houses = housePromptMap(chart || {});
  const questionMeta = snapshot.questionMeta || classifyPrashnaQuestion(snapshot.question);
  const replacements = {
    question: snapshot.question,
    questionCategory: snapshot.questionCategory,
    capturedAtLocal: snapshot.capturedAtLocal,
    capturedAtUtc: snapshot.capturedAtUtc,
    timezone: snapshot.timezone,
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
    zodiacType: snapshot.zodiacType,
    ayanamsha: snapshot.ayanamsha,
    houseSystem: snapshot.houseSystem,
    nodeType: snapshot.nodeType,
    calculationEngine: chart.calculationEngine,
    calculationVersion: chart.calculationVersion,
    ascendantSign: chart.ascendant?.sign,
    ascendantDegree: formatDegree(chart.ascendant?.degree),
    ascendantLord: chart.ascendant?.lord,
    ascendantNakshatra: chart.ascendant?.nakshatra,
    ascendantPada: chart.ascendant?.pada,
    moonSign: chart.moon?.sign,
    moonDegree: formatDegree(chart.moon?.degree),
    moonHouse: chart.moon?.house ? `${chart.moon.house}하우스` : UNKNOWN,
    moonNakshatra: chart.moon?.nakshatra,
    moonPada: chart.moon?.pada,
    moonCondition: chart.moon?.condition,
    sunData: planetLine(planets.Sun),
    moonData: planetLine(planets.Moon),
    marsData: planetLine(planets.Mars),
    mercuryData: planetLine(planets.Mercury),
    jupiterData: planetLine(planets.Jupiter),
    venusData: planetLine(planets.Venus),
    saturnData: planetLine(planets.Saturn),
    rahuData: planetLine(planets.Rahu),
    ketuData: planetLine(planets.Ketu),
    conjunctions: promptValue(chart.conjunctions),
    aspects: promptValue(chart.aspects),
    exchanges: promptValue(chart.exchanges),
    beneficInfluences: promptValue(chart.beneficInfluences),
    maleficInfluences: promptValue(chart.maleficInfluences),
    panchanga: promptValue(chart.panchanga),
    navamsa: promptValue(chart.navamsa),
    additionalFactors: promptValue({
      ...chart.additionalFactors,
      mainJudgmentHouses: questionMeta.mainHouses,
      supportJudgmentHouses: questionMeta.supportHouses,
      naturalKarakas: questionMeta.naturalKarakas,
      categoryReason: questionMeta.reason,
    }),
    ...houses,
  };

  return `[베딕 프라슈나 분석 프롬프트]

당신은 베딕 점성술과 프라슈나 해석에 숙련된 전문 상담가입니다.

아래 자료는 질문자가 질문을 확정하고 생성 버튼을 누른 순간의 시각과 위치를 기준으로 계산한 실제 프라슈나 차트 산출값입니다.

제공된 차트 값만 사용하여 질문을 분석해 주세요.

중요한 해석 원칙:

- 입력된 행성 위치나 차트 값을 임의로 수정하지 마세요.
- 제공되지 않은 값을 추정하거나 만들어내지 마세요.
- 계산이 필요한 값이 누락되어 있으면 “제공된 자료만으로 판단하기 어렵다”고 표시하세요.
- 질문에 해당하는 핵심 하우스, 하우스 로드, 자연 카라카를 먼저 선정하고 그 이유를 설명하세요.
- 라그나, 라그나 로드, 달, 질문 하우스와 그 로드 사이의 관계를 핵심 근거로 사용하세요.
- 좋은 신호와 방해 신호를 모두 제시하세요.
- 단정적인 운명 예언보다 현재 가능성, 조건, 장애물, 전환점과 현실적인 행동 기준을 설명하세요.
- 시기를 판단할 충분한 근거가 없는 경우 임의로 날짜를 만들지 마세요.
- 의료, 법률, 재무 등 중요한 결정은 전문가의 검토가 필요하다고 안내하세요.
- 답변은 한국어로 작성하세요.

[질문 정보]

질문:
${promptValue(replacements.question)}

질문 카테고리:
${promptValue(replacements.questionCategory)}

질문 기록 시각:
${promptValue(replacements.capturedAtLocal)}

UTC 시각:
${promptValue(replacements.capturedAtUtc)}

시간대:
${promptValue(replacements.timezone)}

위도:
${promptValue(replacements.latitude)}

경도:
${promptValue(replacements.longitude)}

[차트 계산 기준]

황도 기준:
${promptValue(replacements.zodiacType)}

아야남샤:
${promptValue(replacements.ayanamsha)}

하우스 계산 기준:
${promptValue(replacements.houseSystem)}

노드 계산 기준:
${promptValue(replacements.nodeType)}

계산 엔진:
${promptValue(replacements.calculationEngine)}

계산 엔진 버전:
${promptValue(replacements.calculationVersion)}

[라그나]

상승궁:
${promptValue(replacements.ascendantSign)}

상승궁 도수:
${promptValue(replacements.ascendantDegree)}

라그나 로드:
${promptValue(replacements.ascendantLord)}

라그나 나크샤트라:
${promptValue(replacements.ascendantNakshatra)}

라그나 파다:
${promptValue(replacements.ascendantPada)}

[달]

달의 별자리:
${promptValue(replacements.moonSign)}

달의 도수:
${promptValue(replacements.moonDegree)}

달의 하우스:
${promptValue(replacements.moonHouse)}

달의 나크샤트라:
${promptValue(replacements.moonNakshatra)}

달의 파다:
${promptValue(replacements.moonPada)}

달의 상태:
${promptValue(replacements.moonCondition)}

[행성 위치]

태양:
${promptValue(replacements.sunData)}

달:
${promptValue(replacements.moonData)}

화성:
${promptValue(replacements.marsData)}

수성:
${promptValue(replacements.mercuryData)}

목성:
${promptValue(replacements.jupiterData)}

금성:
${promptValue(replacements.venusData)}

토성:
${promptValue(replacements.saturnData)}

라후:
${promptValue(replacements.rahuData)}

케투:
${promptValue(replacements.ketuData)}

각 행성 정보에는 가능한 범위에서 별자리, 도수, 하우스, 나크샤트라, 파다, 역행, 연소, 품위, 소유 하우스를 포함하세요.

[하우스 정보]

1하우스:
${promptValue(replacements.house1)}

2하우스:
${promptValue(replacements.house2)}

3하우스:
${promptValue(replacements.house3)}

4하우스:
${promptValue(replacements.house4)}

5하우스:
${promptValue(replacements.house5)}

6하우스:
${promptValue(replacements.house6)}

7하우스:
${promptValue(replacements.house7)}

8하우스:
${promptValue(replacements.house8)}

9하우스:
${promptValue(replacements.house9)}

10하우스:
${promptValue(replacements.house10)}

11하우스:
${promptValue(replacements.house11)}

12하우스:
${promptValue(replacements.house12)}

[행성 관계 및 보조 지표]

주요 합:
${promptValue(replacements.conjunctions)}

주요 드리슈티:
${promptValue(replacements.aspects)}

상호 교환:
${promptValue(replacements.exchanges)}

길성의 지지:
${promptValue(replacements.beneficInfluences)}

흉성의 방해:
${promptValue(replacements.maleficInfluences)}

판창가:
${promptValue(replacements.panchanga)}

나바암샤:
${promptValue(replacements.navamsa)}

기타 산출값:
${promptValue(replacements.additionalFactors)}

[해석 요청]

다음 순서로 해석해 주세요.

1. 질문을 한 문장으로 다시 정리하고, 한 차트에서 판단할 수 있는 질문인지 확인해 주세요.
2. 이 질문을 판단할 주된 하우스, 보조 하우스, 자연 카라카를 선정하고 그 이유를 설명해 주세요.
3. 라그나와 라그나 로드가 질문자 본인의 현재 상태, 의지, 실행력을 어떻게 나타내는지 설명해 주세요.
4. 달의 별자리, 하우스, 나크샤트라와 관계를 바탕으로 질문자의 심리와 사건의 진행 흐름을 설명해 주세요.
5. 질문 하우스와 그 로드의 상태를 분석하여 대상이나 결과의 상태를 설명해 주세요.
6. 라그나 로드와 질문 하우스 로드 사이에 연결, 합, 드리슈티, 교환 또는 상호 지지가 있는지 확인해 주세요.
7. 결과를 돕는 신호와 방해하는 신호를 각각 구분해 주세요.
8. 질문에 대한 판단을 아래 중 하나로 정리해 주세요.
   - 유리
   - 조건부로 유리
   - 보류가 유리
   - 불리
   - 현재 자료만으로 판단 유보
9. 위 판단을 뒷받침하는 핵심 차트 근거를 강한 순서대로 3개에서 5개 제시해 주세요.
10. 상황이 바뀌는 조건이나 전환점이 있다면 설명해 주세요.
11. 시기 판단이 가능한 자료가 충분할 때만 예상 범위를 제시하고, 사용한 판단 근거와 오차 가능성을 함께 설명해 주세요.
12. 질문자가 현실에서 확인할 체크포인트 3개와 다음 행동 후보 3개를 제안해 주세요.
13. 마지막에 전체 결론을 다음 형식으로 정리해 주세요.

- 판단 요약:
- 가장 강한 긍정 신호:
- 가장 강한 방해 신호:
- 필요한 조건:
- 예상 전환점:
- 현실적인 다음 행동:
- 해석의 한계:

[출력 스타일]

- 결론을 먼저 제시한 뒤 근거를 설명하세요.
- 전문용어를 사용할 때에는 쉬운 한국어 설명을 함께 붙이세요.
- 근거가 없는 확신이나 공포를 조성하는 문장을 사용하지 마세요.
- 동일한 내용을 반복하지 마세요.
- 전체 분량은 약 2,000자에서 3,500자 내외로 작성하세요.
- 차트에 없는 정보를 만들어내지 마세요.
- 프라슈나 결과는 참고 및 자기 점검을 위한 자료임을 마지막에 안내하세요.`;
}

export async function generatePrashnaPromptResult(env, snapshot, options = {}) {
  const chart = await calculatePrashnaChart(env, snapshot, options);
  const promptText = buildPrashnaPrompt({ snapshot, chart });
  return {
    resultId: `prashna_result_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    orderId: snapshot.orderId,
    productCode: VEDIC_PRASHNA_PROMPT_PRODUCT_CODE,
    productName: VEDIC_PRASHNA_PROMPT_PRODUCT_NAME,
    amount: VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
    currency: "KRW",
    snapshot,
    chart,
    promptText,
    copyCount: 0,
    createdAt: new Date().toISOString(),
    lastViewedAt: new Date().toISOString(),
  };
}
