import { asArray, clean, hashStable, safeObject, stableStringify } from "./soul-origin-premium.types.js";

function compact(value, depth = 0) {
  if (depth > 4) return undefined;
  if (Array.isArray(value)) {
    const items = value
      .slice(0, 24)
      .map((item) => compact(item, depth + 1))
      .filter((item) => item !== undefined && item !== "");
    return items.length ? items : undefined;
  }
  if (!value || typeof value !== "object") {
    const text = clean(value, 700);
    return text || undefined;
  }
  return Object.keys(value).sort().reduce((acc, key) => {
    const item = compact(value[key], depth + 1);
    if (item !== undefined && item !== "" && !(Array.isArray(item) && item.length === 0)) {
      acc[clean(key, 80)] = item;
    }
    return acc;
  }, {});
}

function hasMeaningfulData(value) {
  const compacted = compact(value);
  if (!compacted) return false;
  const text = stableStringify(compacted);
  return text.replace(/[{}\[\]":,\s]/g, "").length > 8;
}

function buildBirthSummary(input = {}, calculationSeed = {}) {
  const seedBirth = safeObject(calculationSeed.birthInput);
  const person = safeObject(input.person);
  const birth = safeObject(person.birthSummary);
  return {
    userName: clean(seedBirth.name || person.displayName || "사용자", 80),
    gender: clean(seedBirth.gender || person.gender || "", 40),
    birthDate: clean(seedBirth.birthDate || birth.birthDate, 20),
    birthTime: clean(seedBirth.birthTime || birth.birthTime, 20),
    calendarType: clean(seedBirth.calendarType || birth.calendarType || "solar", 20),
    birthPlace: clean(seedBirth.birthPlace || seedBirth.birthplace || birth.birthplace, 120),
    latitude: Number.isFinite(Number(seedBirth.latitude)) ? Number(seedBirth.latitude) : undefined,
    longitude: Number.isFinite(Number(seedBirth.longitude)) ? Number(seedBirth.longitude) : undefined,
    timezone: clean(seedBirth.timezone || "Asia/Seoul", 60),
    question: clean(input.question || input.person?.question || "", 500),
  };
}

function normalizeSajuChart(source = {}) {
  const saju = safeObject(source);
  return compact({
    yearPillar: saju.yearPillar || saju.pillars?.year,
    monthPillar: saju.monthPillar || saju.pillars?.month,
    dayPillar: saju.dayPillar || saju.pillars?.day,
    hourPillar: saju.hourPillar || saju.pillars?.hour,
    tenGods: saju.tenGodCounts || saju.tenGod || saju.topTenGod,
    hiddenStems: saju.hiddenStems,
    twelveStages: saju.twelveGrowthStages,
    fiveElements: saju.elementWeights,
    combinations: saju.combinations,
    clashes: saju.branchRelations,
    usefulGod: {
      yongshin: saju.yongshin,
      heesin: saju.heesin,
      gisin: saju.gisin,
      strength: saju.strength,
    },
    structure: saju.structure || {
      dayMaster: saju.dayMaster,
      monthBranch: saju.monthBranch,
      dominantElement: saju.dominantElement,
      deficientElement: saju.deficientElement,
    },
    luckCycles: saju.daewoonCycles || saju.luckCycles,
    annualLuck: {
      currentYear: saju.currentYear,
      currentYearPillar: saju.currentYearPillar,
      currentDaewun: saju.currentDaewun,
      nextDaewun: saju.nextDaewun,
    },
    monthlyLuck: saju.monthlyLuck,
  });
}

function normalizeVedicChart(source = {}) {
  const vedic = safeObject(source);
  return compact({
    lagna: vedic.lagna,
    sun: vedic.sun,
    moon: vedic.moon,
    planets: vedic.planets,
    houses: vedic.houses,
    nakshatras: vedic.nakshatras,
    dashas: vedic.dashas || vedic.dasha,
    currentDasha: vedic.currentDasha || vedic.dasha?.current,
    navamsaD9: vedic.navamsaD9,
    yogas: vedic.yogas,
    aspects: vedic.aspects,
    transits: vedic.transits,
    ayanamsa: vedic.ayanamsa,
    moonNakshatra: vedic.moonNakshatra,
    rahu: vedic.rahu,
    ketu: vedic.ketu,
  });
}

function normalizeAstrologyChart(source = {}) {
  const astrology = safeObject(source);
  return compact({
    sun: astrology.sun,
    moon: astrology.moon,
    ascendant: astrology.ascendant,
    midheaven: astrology.midheaven,
    planets: astrology.planets || astrology.majorPlanets,
    houses: astrology.houses,
    aspects: astrology.aspects,
    elements: astrology.elements,
    modalities: astrology.modalities,
    retrogrades: astrology.retrogrades,
    dominantSigns: astrology.dominantSigns,
    dominantHouses: astrology.dominantHouses,
    transits: astrology.transits,
    houseSystem: astrology.houseSystem,
    zodiacType: astrology.zodiacType || "tropical",
  });
}

export function buildKarmaIntegratedData({ input = {}, calculationSeed = {} } = {}) {
  const calculation = safeObject(input.calculation);
  const birth = buildBirthSummary(input, calculationSeed);
  const sajuChart = normalizeSajuChart(calculationSeed.saju || calculation.saju);
  const vedicChart = normalizeVedicChart(calculationSeed.vedic || calculation.vedic);
  const astrologyChart = normalizeAstrologyChart(calculationSeed.astrology || calculation.astrology);
  const extraFortuneData = compact({
    ziwei: calculationSeed.ziwei || calculation.ziwei,
    sukuyo: calculationSeed.sukyo || calculation.sukuyo,
    crossSignals: calculationSeed.signals || calculation.crossSignals,
  }) || {};
  const systemStatus = {
    saju: hasMeaningfulData(sajuChart),
    vedic: hasMeaningfulData(vedicChart),
    astrology: hasMeaningfulData(astrologyChart),
    ziwei: hasMeaningfulData(extraFortuneData.ziwei),
    sukuyo: hasMeaningfulData(extraFortuneData.sukuyo),
  };
  const warnings = [];
  for (const key of ["saju", "vedic", "astrology"]) {
    if (!systemStatus[key]) warnings.push(`${key}.missing`);
  }
  if (!birth.birthTime) warnings.push("birthTime.missing");
  if (!Number.isFinite(Number(birth.latitude)) || !Number.isFinite(Number(birth.longitude))) warnings.push("location.precision_limited");

  return {
    service: "karma-integrated",
    ...birth,
    sajuChart,
    vedicChart,
    astrologyChart,
    extraFortuneData,
    chapterCategories: input.chapterPlan || input.chapterCategories || null,
    systemStatus,
    warnings,
    calculationDigest: clean(input.calculationDigest || input.normalizedInputHash || ""),
  };
}

export function pickExtraFortuneData(systems = [], extraFortuneData = {}) {
  const selected = {};
  if (systems.includes("ziwei") && extraFortuneData.ziwei) selected.ziwei = extraFortuneData.ziwei;
  if (systems.includes("sukuyo") && extraFortuneData.sukuyo) selected.sukuyo = extraFortuneData.sukuyo;
  if (systems.includes("custom") && extraFortuneData.crossSignals) selected.crossSignals = extraFortuneData.crossSignals;
  if (systems.includes("saju") || systems.includes("vedic") || systems.includes("astrology")) {
    if (extraFortuneData.crossSignals) selected.crossSignals = extraFortuneData.crossSignals;
  }
  return Object.keys(selected).length ? selected : undefined;
}

export function selectKarmaDataForChapter(chapter = {}, integratedData = {}) {
  const systems = asArray(chapter.requiredSystems).map((item) => clean(item).toLowerCase()).filter(Boolean);
  return {
    chapter,
    systems,
    warnings: asArray(integratedData.warnings),
    saju: systems.includes("saju") ? integratedData.sajuChart : undefined,
    vedic: systems.includes("vedic") ? integratedData.vedicChart : undefined,
    astrology: systems.includes("astrology") ? integratedData.astrologyChart : undefined,
    extra: pickExtraFortuneData(systems, integratedData.extraFortuneData),
  };
}

export function usedSystemsLabel(systems = []) {
  const labels = {
    saju: "사주 명리학",
    vedic: "베다 점성술",
    astrology: "서양 점성술",
    numerology: "수비학",
    tarot: "타로",
    ziwei: "자미두수",
    sukuyo: "숙요점",
    custom: "기타 운세 로직",
  };
  return asArray(systems).map((system) => labels[system] || system).join(" · ");
}

export function buildKarmaDataHashes(integratedData = {}, chapterData = {}) {
  return {
    birthDataHash: hashStable({
      birthDate: integratedData.birthDate,
      birthTime: integratedData.birthTime,
      calendarType: integratedData.calendarType,
      birthPlace: integratedData.birthPlace,
      latitude: integratedData.latitude,
      longitude: integratedData.longitude,
      timezone: integratedData.timezone,
    }),
    sajuChartHash: hashStable(chapterData.saju || null),
    vedicChartHash: hashStable(chapterData.vedic || null),
    astrologyChartHash: hashStable(chapterData.astrology || null),
    extraFortuneDataHash: hashStable(chapterData.extra || null),
    questionHash: hashStable(integratedData.question || ""),
  };
}
