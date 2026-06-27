import { buildAstroLocalChartJson, normalizeAstroPremiumBirthInput, toSwissChartInputFromBirthInput } from "./astro-premium-generator.js";
import { calculateLifeBookAiSaju } from "./life-book-ai-saju.js";
import { getSwissVedicPlanets, getSwissWesternChart } from "./swiss-ephemeris.js";
import { buildVedicLocalChartJson } from "./vedic-premium-generator.js";

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function parseBirthDate(value) {
  const raw = clean(value, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseBirthTime(value) {
  const raw = clean(value, 5);
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return { hour: 12, minute: 0, valid: false };
  return { hour: Number(match[1]), minute: Number(match[2]), valid: true };
}

function hasUsablePlace(birthPlace = {}) {
  return Number.isFinite(Number(birthPlace.latitude))
    && Number.isFinite(Number(birthPlace.longitude))
    && clean(birthPlace.timezone);
}

function normalizeTimezoneOffset(timezone) {
  const raw = clean(timezone).toLowerCase();
  if (!raw) return NaN;
  const direct = Number(raw);
  if (Number.isFinite(direct)) return direct;
  const aliases = {
    "asia/seoul": 9,
    "asia/tokyo": 9,
    "asia/shanghai": 8,
    "asia/taipei": 8,
    "asia/bangkok": 7,
    "asia/kolkata": 5.5,
    "europe/london": 0,
    "europe/paris": 1,
    "america/new_york": -5,
    "america/chicago": -6,
    "america/denver": -7,
    "america/los_angeles": -8,
  };
  if (aliases[raw] !== undefined) return aliases[raw];
  const offset = raw.match(/^utc([+-]\d{1,2})(?::?(\d{2}))?$/);
  if (!offset) return NaN;
  const hour = Number(offset[1]);
  const minute = Number(offset[2] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
  return hour + (Math.sign(hour || 1) * (minute / 60));
}

function buildAstroBirthInput(birthInfo = {}) {
  const birthDate = parseBirthDate(birthInfo.birthDate);
  const birthTime = parseBirthTime(birthInfo.birthTime);
  const birthPlace = asObject(birthInfo.birthPlace);
  const timezoneOffsetHours = normalizeTimezoneOffset(birthPlace.timezone);
  return normalizeAstroPremiumBirthInput({
    name: birthInfo.name,
    gender: birthInfo.gender,
    birthDate: birthInfo.birthDate,
    birthTime: birthTime.valid ? birthInfo.birthTime : "",
    birthYear: birthDate?.year,
    birthMonth: birthDate?.month,
    birthDay: birthDate?.day,
    birthHour: birthTime.valid ? birthTime.hour : undefined,
    birthMinute: birthTime.valid ? birthTime.minute : 0,
    calendarType: birthInfo.calendarType,
    birthPlace: [birthPlace.city, birthPlace.country].filter(Boolean).join(", "),
    latitude: birthPlace.latitude,
    longitude: birthPlace.longitude,
    timezone: birthPlace.timezone,
    timezoneOffsetHours,
  });
}

function countBy(items, pick) {
  return safeArray(items).reduce((acc, item) => {
    const key = clean(pick(item));
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function summarizeSaju(saju = {}) {
  const elements = Object.entries(asObject(saju.fiveElements || saju.fiveElementDistribution))
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([key]) => key);
  const tenGods = Object.entries(asObject(saju.tenGods || saju.tenGodDistribution))
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([key]) => key);
  const parts = [];
  if (clean(saju.dayMaster)) parts.push(`${saju.dayMaster} 일간`);
  if (elements[0]) parts.push(`${elements[0]} 기운`);
  if (tenGods[0]) parts.push(`${tenGods[0]} 성향`);
  return parts.length
    ? `${parts.join(", ")}이 반복 선택의 중심에 놓입니다.`
    : "입력된 사주 정보 기준으로 반복되는 선택의 흐름을 살핍니다.";
}

function summarizeWestern(chart = {}) {
  const sun = clean(chart.sun?.sign || chart.chart?.sunSign);
  const moon = clean(chart.moon?.sign || chart.chart?.moonSign);
  const asc = clean(chart.ascendant?.sign || chart.chart?.ascendantSign);
  const parts = [sun && `태양 ${sun}`, moon && `달 ${moon}`, asc && `상승 ${asc}`].filter(Boolean);
  return parts.length
    ? `${parts.join(", ")} 흐름이 욕구와 감정의 반복 방식을 비춥니다.`
    : "시간 또는 장소 정보 제한으로 심리적 반복 흐름을 가능한 범위에서만 살핍니다.";
}

function summarizeVedic(chart = {}) {
  const lagna = clean(chart.lagna?.sign || chart.chart?.lagnaSign);
  const moon = clean(chart.moon?.sign || chart.chart?.moonSign);
  const nakshatra = clean(chart.nakshatra || chart.chart?.nakshatra?.name);
  const parts = [lagna && `라그나 ${lagna}`, moon && `달 ${moon}`, nakshatra && `나크샤트라 ${nakshatra}`].filter(Boolean);
  return parts.length
    ? `${parts.join(", ")} 축에서 익숙한 습관과 낯선 성장 과제가 함께 드러납니다.`
    : "정밀 차트 정보가 제한되어 영혼의 과제는 입력된 정보 기준으로만 살핍니다.";
}

function compactWestern(localChartJson = {}) {
  const chart = asObject(localChartJson.chart);
  const planets = safeArray(chart.planets);
  const houses = safeArray(chart.houses);
  const aspects = safeArray(chart.aspects);
  const ascendant = clean(chart.ascendantSign)
    ? { sign: chart.ascendantSign, degree: chart.ascendantDegree, house: 1 }
    : null;
  const mc = clean(chart.midheavenSign)
    ? { sign: chart.midheavenSign, degree: chart.midheavenDegree }
    : null;
  const ascRuler = clean(chart.chartRuler || chart.ascendantRuler || localChartJson?.interpretationSeeds?.chartRuler);
  return {
    sun: planets.find((planet) => clean(planet?.name) === "Sun") || null,
    moon: planets.find((planet) => clean(planet?.name) === "Moon") || null,
    ascendant,
    mc,
    chartRuler: ascRuler,
    planets,
    houses,
    aspects,
    elementBalance: countBy(planets, (planet) => planet?.element),
    modalityBalance: countBy(planets, (planet) => planet?.mode || planet?.modality),
    nodes: {
      north: planets.find((planet) => /north/i.test(clean(planet?.name))) || chart.northNode || null,
      south: planets.find((planet) => /south/i.test(clean(planet?.name))) || chart.southNode || null,
    },
    transits: null,
    patternSummary: summarizeWestern({ chart, sun: planets.find((planet) => clean(planet?.name) === "Sun"), moon: planets.find((planet) => clean(planet?.name) === "Moon"), ascendant }),
  };
}

function compactVedic(localChartJson = {}) {
  const chart = asObject(localChartJson.chart);
  const planets = safeArray(chart.planets);
  const moon = planets.find((planet) => clean(planet?.name) === "Moon") || null;
  const sun = planets.find((planet) => clean(planet?.name) === "Sun") || null;
  const rahu = planets.find((planet) => clean(planet?.name) === "Rahu") || null;
  const ketu = planets.find((planet) => clean(planet?.name) === "Ketu") || null;
  return {
    lagna: chart.lagnaSign ? { sign: chart.lagnaSign, signEn: chart.lagnaSignEn } : null,
    moon,
    sun,
    nakshatra: clean(chart.nakshatra?.name || moon?.nakshatra),
    pada: Number.isFinite(Number(chart.nakshatra?.pada || moon?.pada)) ? Number(chart.nakshatra?.pada || moon?.pada) : null,
    d1: { planets, houses: safeArray(chart.houses), aspects: safeArray(chart.aspects) },
    d9: null,
    rahuKetu: { rahu, ketu },
    houseLordship: null,
    yogas: safeArray(localChartJson.insights).filter((item) => /yoga|요가/i.test(clean(item?.id || item?.title))),
    dasha: chart.dashas || null,
    gochara: null,
    patternSummary: summarizeVedic({ chart, lagna: { sign: chart.lagnaSign }, moon, nakshatra: chart.nakshatra?.name }),
  };
}

function buildSynthesis({ saju, westernAstrology, vedicAstrology, limitations }) {
  const commonPatterns = [
    saju?.patternSummary,
    westernAstrology?.patternSummary,
    vedicAstrology?.patternSummary,
  ].map((item) => clean(item)).filter(Boolean);
  const timeLimited = safeArray(limitations).some((item) => /출생시간|시간/.test(clean(item.message)));
  return {
    commonPatterns: commonPatterns.slice(0, 3),
    karmicThemes: [
      "반복되는 감정 반응을 알아차리고 같은 장면에서 다른 선택을 하는 과제",
      "재능을 미루거나 숨길 때 삶이 다시 같은 질문을 가져오는 흐름",
      timeLimited ? "입력된 정보 기준으로 확인되는 큰 흐름을 현실 선택에 맞게 조율하는 과제" : "관계와 일의 장면에서 익숙한 방어를 내려놓는 과제",
    ],
    relationshipLessons: ["가까워지고 싶은 마음과 스스로를 지키려는 마음 사이의 균형"],
    careerMoneyLessons: ["재능을 증명하려 애쓰기보다 꾸준한 구조로 남기는 선택"],
    emotionalLessons: ["상처를 운명처럼 붙잡지 않고 반복 신호로 읽는 힘"],
    currentLifeTask: "삶이 반복해서 보여주는 장면을 벌이 아니라 선택을 바꾸라는 신호로 받아들이는 일",
    practicalDirection: "관계, 일, 돈의 선택에서 자동 반응을 멈추고 한 번 더 느린 결정을 연습하는 방향",
  };
}

export async function buildKarmaDestinyIntegratedResult(env, birthInfo = {}, options = {}) {
  const limitations = [];
  const birthTimeUnknown = birthInfo.birthTimeUnknown === true || !clean(birthInfo.birthTime);
  const birthPlace = asObject(birthInfo.birthPlace);
  const placeAvailable = hasUsablePlace(birthPlace);

  let saju = null;
  try {
    const calculated = calculateLifeBookAiSaju(birthInfo);
    saju = {
      yearPillar: calculated.yearPillar,
      monthPillar: calculated.monthPillar,
      dayPillar: calculated.dayPillar,
      hourPillar: birthTimeUnknown ? "" : calculated.hourPillar,
      dayMaster: calculated.dayMaster,
      fiveElements: calculated.fiveElements,
      tenGods: calculated.tenGods,
      strength: calculated.strength,
      usefulGod: calculated.usefulGod,
      unfavorableGod: calculated.unfavorableGod,
      clashesAndCombinations: null,
      majorLuck: calculated.majorLuck,
      yearlyLuck: calculated.yearlyLuck,
      patternSummary: summarizeSaju(calculated),
      calculationMeta: calculated.calculationMeta,
    };
    if (birthTimeUnknown) {
      limitations.push({ system: "saju", code: "TIME_UNKNOWN", message: "출생시간을 모르는 입력이어서 시주는 제외했습니다." });
    }
  } catch (error) {
    limitations.push({ system: "saju", code: clean(error?.code || "SAJU_CALCULATION_FAILED"), message: clean(error?.message || error, 240) });
  }

  let westernAstrology = null;
  let vedicAstrology = null;
  if (birthTimeUnknown || !placeAvailable) {
    limitations.push({
      system: "astrology",
      code: birthTimeUnknown ? "TIME_UNKNOWN" : "PLACE_INCOMPLETE",
      message: birthTimeUnknown
        ? "출생시간을 모르는 입력이어서 상승점과 하우스 해석을 단정하지 않습니다."
        : "출생지 좌표 또는 시간대가 부족해 정밀 차트 계산을 제한했습니다.",
    });
    westernAstrology = { patternSummary: "입력된 정보 기준으로 태양과 달의 큰 흐름을 중심에 둡니다.", calculationLimited: true };
    vedicAstrology = { patternSummary: "입력된 정보 기준으로 큰 카르마 흐름만 부드럽게 살핍니다.", calculationLimited: true };
  } else {
    try {
      const astroBirthInput = buildAstroBirthInput(birthInfo);
      const swissInput = toSwissChartInputFromBirthInput(astroBirthInput);
      const westernChart = await getSwissWesternChart(env, swissInput, { strictSwiss: true, allowFallback: false });
      westernAstrology = compactWestern(buildAstroLocalChartJson(astroBirthInput, westernChart, null, { strictPremium: true }));
    } catch (error) {
      limitations.push({ system: "westernAstrology", code: clean(error?.code || "WESTERN_CALCULATION_FAILED"), message: clean(error?.message || error, 240) });
      westernAstrology = { patternSummary: "서양 점성술 계산값이 제한되어 다른 체계와 겹치는 큰 흐름만 살핍니다.", calculationLimited: true };
    }

    try {
      const astroBirthInput = buildAstroBirthInput(birthInfo);
      const swissInput = toSwissChartInputFromBirthInput(astroBirthInput);
      const vedicChartSource = await getSwissVedicPlanets(env, swissInput, { strictSwiss: true, allowFallback: false });
      vedicAstrology = compactVedic(buildVedicLocalChartJson({
        ...astroBirthInput,
        chartSource: vedicChartSource,
      }, { strictPremium: true }));
    } catch (error) {
      limitations.push({ system: "vedicAstrology", code: clean(error?.code || "VEDIC_CALCULATION_FAILED"), message: clean(error?.message || error, 240) });
      vedicAstrology = { patternSummary: "베다 점성술 계산값이 제한되어 사주와 서양 점성술에서 반복되는 큰 주제를 중심으로 살핍니다.", calculationLimited: true };
    }
  }

  const integrated = {
    saju,
    westernAstrology,
    vedicAstrology,
    synthesis: buildSynthesis({ saju, westernAstrology, vedicAstrology, limitations }),
    limitations,
  };

  if (limitations.length && options?.log !== false) {
    console.warn("[karma-destiny-ai:calculation-limit]", JSON.stringify(limitations));
  }

  return integrated;
}
