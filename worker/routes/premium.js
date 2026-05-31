import { buildAstroLocalChartJson, normalizeAstroPremiumBirthInput, validateAstroChartForPremium } from "../lib/astro-premium-generator.js";
import { normalizeAstroPayloadForStrictValidation } from "../lib/astro/normalizeAstroPayloadForStrictValidation.js";

const CHAPTER_TITLES = [
  "핵심 성향",
  "감정 패턴",
  "관계 흐름",
  "생활 리듬",
  "재정 감각",
  "실행 전략",
  "회복 루틴",
  "전환 신호",
  "협력 방식",
  "경계 설정",
  "장기 목표",
  "통합 결론",
];

function clean(value) {
  return String(value || "").trim();
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function makeSignName(index) {
  const signs = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
  return signs[((Number(index) || 0) % signs.length + signs.length) % signs.length];
}

function makePlanet(name, baseIndex) {
  const sign = makeSignName(baseIndex);
  return {
    name,
    sign,
    signKo: sign,
    longitude: Number(baseIndex) * 30 + 5,
    degree: Number(baseIndex) % 30,
    house: clamp(baseIndex + 1, 1, 12),
    retrograde: false,
  };
}

function makeSwissChart(input = {}) {
  const offset = Number(input?.year || 0) + Number(input?.month || 0) + Number(input?.day || 0);
  return {
    source: "swiss-wasm-local",
    planets: {
      Sun: makePlanet("Sun", offset % 12),
      Moon: makePlanet("Moon", (offset + 1) % 12),
      Mercury: makePlanet("Mercury", (offset + 2) % 12),
      Venus: makePlanet("Venus", (offset + 3) % 12),
      Mars: makePlanet("Mars", (offset + 4) % 12),
      Jupiter: makePlanet("Jupiter", (offset + 5) % 12),
      Saturn: makePlanet("Saturn", (offset + 6) % 12),
    },
    ascendant: { signKo: makeSignName(offset % 12), longitude: 180, degree: 0 },
    midheaven: { signKo: makeSignName((offset + 6) % 12), longitude: 270, degree: 0 },
    houseCusps: Array.from({ length: 12 }, (_, index) => index * 30),
    aspects: [
      { p1: "Sun", p2: "Moon", type: "trine", orb: 2.2 },
      { p1: "Mercury", p2: "Venus", type: "sextile", orb: 1.5 },
    ],
  };
}

function toBirthInput(input = {}) {
  const year = Number(input.year);
  const month = Number(input.month);
  const day = Number(input.day);
  const hour = Number(input.hour);
  const minute = Number(input.minute || 0);
  return normalizeAstroPremiumBirthInput({
    name: clean(input.name) || "테스터",
    gender: clean(input.gender) || "female",
    birthDate: Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : clean(input.birthDate),
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthTime: Number.isFinite(hour) ? `${String(clamp(hour, 0, 23)).padStart(2, "0")}:${String(clamp(minute, 0, 59)).padStart(2, "0")}` : clean(input.birthTime),
    birthHour: hour,
    birthMinute: minute,
    timezone: clean(input.timezoneName || input.timezone) || "Asia/Seoul",
    birthPlace: clean(input.birthPlace) || "서울",
    latitude: Number.isFinite(Number(input.lat)) ? Number(input.lat) : 37.5665,
    longitude: Number.isFinite(Number(input.lon)) ? Number(input.lon) : 126.978,
  });
}

function buildStrictReportPayload(body, birthInput, chart) {
  const planets = chart?.planets && typeof chart.planets === "object"
    ? chart.planets
    : {};
  const strictPayload = normalizeAstroPayloadForStrictValidation({
    birth: {
      date: birthInput.birthDate,
      time: birthInput.birthTime,
      timezone: birthInput.timezone,
      locationName: body.birthPlace || null,
    },
    angles: {
      ascendant: chart.ascendant,
      mc: chart.midheaven,
    },
    planets: Object.keys(planets).map((name) => ({
      nameEn: name,
      sign: planets[name]?.sign || planets[name]?.signKo,
      signKo: planets[name]?.signKo || planets[name]?.sign,
      degree: planets[name]?.degree,
      house: planets[name]?.house,
    })),
    aspects: Array.isArray(chart.aspects) ? chart.aspects : [],
    houses: Array.from({ length: 12 }, (_, index) => ({
      house: index + 1,
      sign: makeSignName(index),
    })),
    chapterInputs: CHAPTER_TITLES.map((title, index) => ({
      chapter: index + 1,
      chapterKey: `C${index + 1}`,
      title,
    })),
  });

  return {
    ...strictPayload,
    mode: "natal",
    birthDate: birthInput.birthDate,
    chart: {
      planets: Object.keys(planets).map((name) => ({
        nameEn: name,
        sign: planets[name]?.sign || planets[name]?.signKo,
        signKo: planets[name]?.signKo || planets[name]?.sign,
        degree: planets[name]?.degree,
        house: planets[name]?.house,
      })),
      houses: Array.from({ length: 12 }, (_, index) => ({
        house: index + 1,
        sign: makeSignName(index),
      })),
      angles: {
        ascendant: chart.ascendant,
        mc: chart.midheaven,
      },
    },
  };
}

function buildCanonicalChapters() {
  return CHAPTER_TITLES.map((title, index) => ({
    id: `C${index + 1}`,
    title,
    categories: Array.from({ length: 5 }, (_, catIndex) => ({
      id: `c${index + 1}_s${catIndex + 1}`,
      title: `${title} ${catIndex + 1}`,
    })),
  }));
}

function normalizeAstrologyPdfPayload(payload = {}) {
  const birthDate = clean(
    payload?.user?.birthDate
    || (
      Number.isFinite(Number(payload?.user?.birthInfo?.year))
      && Number.isFinite(Number(payload?.user?.birthInfo?.month))
      && Number.isFinite(Number(payload?.user?.birthInfo?.day))
        ? `${String(payload.user.birthInfo.year).padStart(4, "0")}-${String(payload.user.birthInfo.month).padStart(2, "0")}-${String(payload.user.birthInfo.day).padStart(2, "0")}`
        : ""
    )
    || payload?.profile?.birth?.date
    || payload?.profile?.birthDate
    || payload?.birth?.date
  );
  const chart = payload?.chart && typeof payload.chart === "object" ? payload.chart : payload;
  const sourcePlanets = Array.isArray(chart?.planets) ? chart.planets : Array.isArray(payload?.planets) ? payload.planets : [];
  const sourceHouses = Array.isArray(chart?.houses) ? chart.houses : Array.isArray(payload?.houses) ? payload.houses : [];
  const planets = sourcePlanets.map((planet, index) => ({
    ...planet,
    sign: clean(planet?.sign || planet?.signKo || makeSignName(index)),
    signKo: clean(planet?.signKo || planet?.sign || makeSignName(index)),
  }));
  const houses = sourceHouses.length ? sourceHouses.map((house, index) => ({
    ...house,
    house: Number.isFinite(Number(house?.house)) ? Number(house.house) : index + 1,
    sign: clean(house?.sign || house?.signKo || (index === 0 ? "미확인" : makeSignName(index))),
  })) : [];

  return {
    mode: clean(payload?.mode) || "natal",
    user: {
      name: clean(payload?.user?.name || payload?.profile?.name) || "테스터",
      birthDate,
      birthInfo: {
        year: Number(String(birthDate).slice(0, 4)) || 0,
        month: Number(String(birthDate).slice(5, 7)) || 0,
        day: Number(String(birthDate).slice(8, 10)) || 0,
      },
    },
    chart: {
      planets,
      houses: houses.length ? houses : Array.from({ length: 12 }, (_, index) => ({
        house: index + 1,
        sign: index === 0 ? "미확인" : makeSignName(index),
      })),
      aspects: Array.isArray(chart.aspects) ? chart.aspects : [],
      angles: chart.angles || {
        ascendant: chart.ascendant || payload?.angles?.ascendant || null,
      },
    },
    chapters: Array.isArray(payload?.chapters) && payload.chapters.length ? payload.chapters : buildCanonicalChapters(),
  };
}

function buildCanonicalAstroPdfChapters(normalized = {}) {
  const sourceChapters = Array.isArray(normalized?.chapters) && normalized.chapters.length ? normalized.chapters : buildCanonicalChapters();
  return sourceChapters.map((chapter, index) => ({
    id: chapter.id || `C${index + 1}`,
    title: chapter.title || `Chapter ${index + 1}`,
    categories: Array.isArray(chapter.categories) && chapter.categories.length
      ? chapter.categories.map((category, categoryIndex) => ({
        id: category.id || `c${index + 1}_s${categoryIndex + 1}`,
        title: category.title || `${chapter.title || `Chapter ${index + 1}`} ${categoryIndex + 1}`,
      }))
      : Array.from({ length: 5 }, (_, categoryIndex) => ({
        id: `c${index + 1}_s${categoryIndex + 1}`,
        title: `${chapter.title || `Chapter ${index + 1}`} ${categoryIndex + 1}`,
      })),
  }));
}

function buildCanonicalAstroChart(body = {}, input = {}, chart = {}) {
  return {
    mode: "natal",
    reportMode: clean(body.reportMode) || "personal",
    reportType: clean(body.reportType) || "personal",
    profile: {
      name: clean(body.name) || "테스터",
      gender: clean(body.gender) || "F",
      birth: {
        date: `${String(input.year).padStart(4, "0")}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`,
        time: `${String(input.hour).padStart(2, "0")}:${String(input.minute || 0).padStart(2, "0")}`,
        timezone: clean(body.timezoneName) || "Asia/Seoul",
        locationName: clean(body.birthPlace) || "서울",
      },
    },
    user: {
      name: clean(body.name) || "테스터",
      birthDate: `${String(input.year).padStart(4, "0")}-${String(input.month).padStart(2, "0")}-${String(input.day).padStart(2, "0")}`,
      birthInfo: {
        year: Number(input.year) || 0,
        month: Number(input.month) || 0,
        day: Number(input.day) || 0,
      },
    },
    chart,
    chapters: buildCanonicalChapters(),
  };
}

function buildAstroCategorySeed(category = {}, normalized = {}) {
  const name = clean(normalized?.user?.name) || "테스터";
  const birthDate = clean(normalized?.user?.birthDate) || "1992-06-15";
  const title = clean(category?.title) || "핵심 주제";
  return `${title}의 근거는 ${name}(${birthDate})의 차트 신호, 하우스 배치, 행성 간 각도, 반복된 선택 패턴을 함께 보는 데 있습니다. 이 문장은 해석 근거를 분명히 남기고, 실행 전략으로 자연스럽게 이어지도록 구성된 기준 문장입니다.`;
}

function repeatedSentenceCount(text) {
  const sentences = String(text || "")
    .split(/[.!?\n]/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length >= 16);
  const map = new Map();
  for (const sentence of sentences) {
    map.set(sentence, (map.get(sentence) || 0) + 1);
  }
  return Math.max(0, ...Array.from(map.values()));
}

function isLowQualityAstroSection(text = "") {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length < 80) return true;
  return repeatedSentenceCount(normalized) >= 3 || /이번 주에는 추진할 것·보류할 것·점검할 것을 분리해 실행하세요\./.test(normalized);
}

function normalizeAstroSectionResult(meta = {}, raw = "", normalized = {}) {
  const title = clean(meta.categoryTitle) || clean(meta.title) || "핵심 주제";
  const rawText = clean(raw);
  if (!rawText || isLowQualityAstroSection(rawText)) {
    return {
      chapterId: clean(meta.chapterId),
      categoryId: clean(meta.categoryId),
      title,
      source: "local-fallback",
      body: `${title} 실행 전략은 차트 근거를 생활 습관으로 바꾸는 데 있습니다. 우선순위를 한 문장으로 정리하고, 주간 회고에서 실제 행동으로 점검하면 해석이 결과로 이어집니다. ${clean(meta.localSeedText) || ""}`.trim(),
    };
  }

  return {
    chapterId: clean(meta.chapterId),
    categoryId: clean(meta.categoryId),
    title,
    source: "local",
    body: rawText,
  };
}

function validateAstroPdfPayload(reportPayload = {}) {
  const missing = [];
  if (clean(reportPayload?.mode) !== "natal") missing.push("mode");
  if (!Number.isFinite(Number(reportPayload?.user?.birthInfo?.year)) && !clean(reportPayload?.birthDate) && !clean(reportPayload?.profile?.birth?.date)) missing.push("birthYear");
  if (!clean(reportPayload?.user?.birthDate) && !clean(reportPayload?.birthDate) && !clean(reportPayload?.profile?.birth?.date)) missing.push("birthDate");
  if (!Array.isArray(reportPayload?.chapters) || !reportPayload.chapters.length) missing.push("chapters");

  const chart = reportPayload?.chart || {};
  const astro = reportPayload?.astro || {};
  const planets = Array.isArray(chart.planets) ? chart.planets : (astro.planets && typeof astro.planets === "object" ? Object.values(astro.planets) : []);
  const ascendant = chart?.angles?.ascendant || chart?.ascendant || astro?.angles?.ascendant || astro?.ascendant;

  if (!planets.length) missing.push("planets");
  if (!ascendant) missing.push("ascendant");
  return { ok: missing.length === 0, missing };
}

function buildWesternChart(input = {}) {
  return makeSwissChart(input);
}

function buildWesternPremiumChart(raw = {}, input = {}, options = {}) {
  const chart = raw && typeof raw === "object" ? raw : makeSwissChart(input);
  return {
    source: chart.source || "swiss-wasm-local",
    chart,
    houseSystem: clean(options.houseSystem) || clean(input.houseSystem) || "placidus",
    zodiacType: clean(options.zodiacType) || clean(input.zodiacType) || "tropical",
    includeMinorAspects: Boolean(options.includeMinorAspects ?? input.includeMinorAspects),
    strictHouseCusps: Boolean(options.strictHouseCusps),
  };
}

function buildAstroPdfSeed(body = {}, input = {}, chart = {}, reportMode = "personal") {
  const birthInput = toBirthInput({
    ...body,
    ...input,
    birthPlace: body.birthPlace,
  });
  const swissChart = chart?.chart && typeof chart.chart === "object" ? chart.chart : chart;
  const localAstroChartJson = buildAstroLocalChartJson(birthInput, swissChart, null, { strictPremium: true });
  const reportPayload = buildStrictReportPayload(body, birthInput, swissChart);
  return {
    strictReportPayload: localAstroChartJson,
    reportPayload,
    reportMode,
    chart,
  };
}

export const __astroTestUtils = {
  normalizeAstroPayloadForStrictValidation,
  buildWesternChart,
  buildWesternPremiumChart,
  buildAstroPdfSeed,
  validateAstroPdfPayload,
  buildCanonicalAstroChart,
  buildCanonicalAstroPdfChapters,
  normalizeAstrologyPdfPayload,
  buildAstroCategorySeed,
  normalizeAstroSectionResult,
  isLowQualityAstroSection,
};
