import { hashStable, clean, safeObject } from "./soul-origin-premium.types.js";
import { soulOriginChapterPlanV1 } from "./soul-origin-premium.chapter-plan.js";

function compactObject(value, depth = 0) {
  if (depth > 3) return undefined;
  if (Array.isArray(value)) {
    return value
      .slice(0, 12)
      .map((item) => compactObject(item, depth + 1))
      .filter((item) => item !== undefined && item !== "");
  }
  if (!value || typeof value !== "object") {
    const text = clean(value, 240);
    return text || undefined;
  }
  return Object.keys(value).sort().reduce((acc, key) => {
    const item = compactObject(value[key], depth + 1);
    if (item !== undefined && item !== "" && !(Array.isArray(item) && item.length === 0)) {
      acc[key] = item;
    }
    return acc;
  }, {});
}

function compactMetricMap(value) {
  const source = safeObject(value);
  return Object.keys(source).sort().reduce((acc, key) => {
    const numeric = Number(source[key]);
    if (Number.isFinite(numeric)) acc[clean(key, 40)] = Math.round(numeric * 10) / 10;
    return acc;
  }, {});
}

export function normalizeSoulOriginCalculationInput({ birthInput = {}, calculationSeed = {}, locale = "ko-KR" } = {}) {
  const saju = safeObject(calculationSeed.saju);
  const ziwei = safeObject(calculationSeed.ziwei);
  const astrology = safeObject(calculationSeed.astrology);
  const vedic = safeObject(calculationSeed.vedic);
  const sukyo = safeObject(calculationSeed.sukyo);
  const signals = safeObject(calculationSeed.signals);
  const person = {
    displayName: clean(birthInput.name || "사용자", 80),
    gender: clean(birthInput.gender || birthInput.sex || "", 40),
    birthSummary: {
      calendarType: clean(birthInput.calendarType || "solar", 20),
      birthDate: clean(birthInput.birthDate, 20),
      birthTime: clean(birthInput.birthTime, 20),
      timeUnknown: birthInput.timeUnknown === true,
      birthplace: clean(birthInput.birthplace || birthInput.birthPlace || birthInput.locationName || "", 120),
    },
  };

  const calculation = {
    saju: {
      dayMaster: clean(saju.dayMaster, 80),
      monthBranch: clean(saju.monthBranch, 80),
      pillars: [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar].map((item) => clean(item, 80)).filter(Boolean),
      tenGod: Array.isArray(saju.topTenGod) ? saju.topTenGod.map((item) => clean(item, 80)).filter(Boolean).slice(0, 8) : [],
      specialStars: Array.isArray(saju.specialStars) ? saju.specialStars.map((item) => clean(item, 80)).filter(Boolean).slice(0, 12) : [],
      twelveGrowthStages: compactObject(saju.twelveGrowthStages),
      branchRelations: Array.isArray(saju.branchRelations) ? saju.branchRelations.map((item) => clean(item, 120)).filter(Boolean).slice(0, 8) : [],
      yongshin: clean(saju.yongshin, 80),
      heesin: Array.isArray(saju.heesin) ? saju.heesin.map((item) => clean(item, 80)).filter(Boolean).slice(0, 5) : [],
      gisin: Array.isArray(saju.gisin) ? saju.gisin.map((item) => clean(item, 80)).filter(Boolean).slice(0, 5) : [],
      currentDaewun: clean(saju.currentDaewun, 120),
      nextDaewun: clean(saju.nextDaewun, 120),
      currentYearPillar: clean(saju.currentYearPillar, 80),
      dominantElement: clean(saju.dominantElement, 80),
      deficientElement: clean(saju.deficientElement, 80),
      elementWeights: compactMetricMap(saju.elementWeights),
    },
    ziwei: {
      mingGong: clean(ziwei?.chartMeta?.mingGong || ziwei.mingGong, 80),
      shenGong: clean(ziwei?.chartMeta?.shenGong || ziwei.shenGong, 80),
      lifePalace: compactObject(ziwei?.palaces?.[0] || ziwei.lifePalace),
      importantStars: compactObject(ziwei?.importantStars || ziwei?.stars),
    },
    astrology: {
      sun: clean(astrology.sun, 80),
      moon: clean(astrology.moon, 80),
      ascendant: clean(astrology.ascendant, 80),
      dominantSigns: compactObject(astrology.dominantSigns),
      houses: compactObject(astrology.houses),
    },
    vedic: {
      lagna: clean(vedic.lagna, 80),
      moonNakshatra: clean(vedic.moonNakshatra, 80),
      currentDasha: clean(vedic?.dasha?.current || vedic.currentDasha, 120),
      nextDasha: clean(vedic?.dasha?.next || vedic.nextDasha, 120),
    },
    sukuyo: {
      natalStar: clean(sukyo.natalStar, 80),
      element: clean(sukyo.element, 80),
      nature: clean(sukyo.nature, 160),
    },
    crossSignals: compactObject(signals),
  };

  const chapterPlan = soulOriginChapterPlanV1.chapters.map((chapter) => ({
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    purpose: chapter.purpose,
    requiredSections: Array.from(chapter.requiredSections),
  }));
  const normalized = {
    reportType: "destiny-karma",
    locale,
    person,
    calculation,
    chapterPlan,
  };
  return {
    ...normalized,
    calculationDigest: hashStable({ reportType: normalized.reportType, locale, person, calculation }),
    normalizedInputHash: hashStable(normalized),
  };
}
