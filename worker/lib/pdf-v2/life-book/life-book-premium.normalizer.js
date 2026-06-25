import { asArray, clean, hashStable, safeObject, stableStringify } from "./life-book-premium.types.js";

function normalizeDate(value = "") {
  const text = clean(value, 40);
  const match = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (!match) return text;
  return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
}

function normalizeTime(body = {}, birthInput = {}) {
  const direct = clean(birthInput.birthTime || body.birthTime, 20);
  if (/^\d{1,2}:\d{2}$/.test(direct)) {
    const [hour, minute] = direct.split(":").map((item) => Number(item));
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const hour = Number(birthInput.birthHour ?? body.birthHour ?? body.hour);
  const minute = Number(birthInput.birthMinute ?? body.birthMinute ?? body.minute ?? 0);
  if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
    return `${String(Math.trunc(hour)).padStart(2, "0")}:${String(Number.isFinite(minute) ? Math.trunc(minute) : 0).padStart(2, "0")}`;
  }
  return "";
}

function isZiweiKey(key = "") {
  return /^(ziwei|localZiwei|ziweiMasterJson|localZiweiChartJson|ziweiBase|ziweiPdfSeed|chartResult)$/i.test(String(key || ""));
}

function compact(value, depth = 0) {
  if (depth > 5) return undefined;
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return clean(value, 2500) || undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((item) => compact(item, depth + 1)).filter((item) => item !== undefined).slice(0, 80);
  }
  if (typeof value === "object") {
    const output = {};
    Object.keys(value).slice(0, 100).forEach((key) => {
      if (isZiweiKey(key)) return;
      const item = compact(value[key], depth + 1);
      if (item !== undefined) output[key] = item;
    });
    return Object.keys(output).length ? output : undefined;
  }
  return undefined;
}

function buildEvidenceDigest(evidence = {}) {
  const item = safeObject(evidence);
  return compact({
    "계산 출처": item.calculationSource,
    "사용자 입력 계산 출처": item.clientEngineSource,
    "사주 고급 해석": item.structuredAdvancedReport,
    "사주 원문 요약": item.finalAdvancedReport,
    "사주 계산 보조 근거": item.calculationEvidence,
    "분석 신호": item.analysisSignals,
    "명리 계산 원자료": item.quantumMyeongriJson,
    "사주 정합성 확인": item.localSajuValidation,
  });
}

function pickFirstObject(...values) {
  for (const value of values) {
    const object = safeObject(value);
    if (Object.keys(object).length) return object;
  }
  return {};
}

function normalizePillar(value) {
  if (typeof value === "string") {
    const ganji = clean(value, 40);
    return ganji ? { ganji } : undefined;
  }
  const item = safeObject(value);
  const stem = clean(item.stem || item.gan || item.heavenlyStem || item.stemKo, 40);
  const branch = clean(item.branch || item.zhi || item.earthlyBranch || item.branchKo, 40);
  const ganji = clean(item.ganji || item.label || `${stem}${branch}`, 80);
  return compact({
    stem,
    branch,
    ganji,
    tenGod: item.tenGod || item.sibseong || item.tenGodKo,
    element: item.element,
  });
}

function normalizePillars(localSajuJson = {}, body = {}) {
  const source = pickFirstObject(
    localSajuJson.pillars,
    localSajuJson.saju?.pillars,
    body.quantumMyeongriJson?.pillars,
    body.engineData?.quantumMyeongriJson?.pillars,
  );
  return compact({
    year: normalizePillar(source.year || source.y),
    month: normalizePillar(source.month || source.m),
    day: normalizePillar(source.day || source.d),
    hour: normalizePillar(source.hour || source.h),
  }) || {};
}

function normalizeElementBalance(localSajuJson = {}, body = {}) {
  return compact(pickFirstObject(
    localSajuJson.elementBalance,
    localSajuJson.elements,
    localSajuJson.fiveElements,
    localSajuJson.saju?.elementBalance,
    body.quantumMyeongriJson?.elementBalance,
    body.quantumMyeongriJson?.fiveElements,
    body.analysisSignals?.elementBalance,
    body.analysisSignals?.elementWeights,
  )) || {};
}

function normalizeTenGods(localSajuJson = {}, body = {}) {
  return compact(pickFirstObject(
    localSajuJson.tenGods,
    localSajuJson.tenGodDistribution,
    localSajuJson.sibseong,
    localSajuJson.saju?.tenGods,
    body.quantumMyeongriJson?.tenGods,
    body.quantumMyeongriJson?.sibseong,
    body.analysisSignals?.tenGods,
    body.analysisSignals?.tenGodCounts,
  )) || {};
}

function normalizeUsefulGod(localSajuJson = {}, signals = {}, body = {}) {
  return compact(
    localSajuJson.usefulGod
    || localSajuJson.usefulGods
    || localSajuJson.yongshin
    || localSajuJson.yongsin
    || body.quantumMyeongriJson?.usefulGods
    || signals.usefulGod
    || signals.yongshinElements
    || {
      yongsin: signals.useful,
      huisin: signals.support,
      gisin: signals.caution,
    },
  );
}

function normalizeCycles(localSajuJson = {}, body = {}, signals = {}) {
  return compact({
    currentDaewoon: localSajuJson.currentDaewoon || localSajuJson.daewoon?.current || signals.currentDaewoon || signals.currentDaeunNode,
    nextDaewoon: localSajuJson.nextDaewoon || localSajuJson.daewoon?.next || signals.nextDaewoon || signals.nextDaeunNode,
    daewoon: localSajuJson.daewoon || body.quantumMyeongriJson?.daewoon || signals.daewoon || signals.daewunCycles,
    yearly: localSajuJson.yearly || localSajuJson.sewoon || body.quantumMyeongriJson?.sewoon || signals.sewoon,
    targetYear: body.targetYear || body.analysisYear || signals.currentYear,
    targetYearPillar: localSajuJson.currentYearPillar || signals.currentYearPillar,
  }) || {};
}

function normalizeSajuSignals(localSajuJson = {}, body = {}, signals = {}) {
  return compact({
    dayMaster: localSajuJson.dayMaster || signals.dayMaster,
    monthBranch: localSajuJson.monthBranch || signals.monthBranch,
    dayPillar: localSajuJson.dayPillar || signals.dayPillar,
    monthPillar: localSajuJson.monthPillar || signals.monthPillar,
    yearPillar: localSajuJson.yearPillar || signals.yearPillar,
    hourPillar: localSajuJson.hourPillar || signals.hourPillar,
    geokguk: localSajuJson.geokguk || signals.geokguk,
    powerLabel: localSajuJson.powerLabel || signals.powerLabel,
    johuType: localSajuJson.johuType || signals.johuType,
    specialStars: localSajuJson.specialStars || signals.specialStars || body.analysisSignals?.specialStars || [],
    twelveGrowthStages: localSajuJson.twelveGrowthStages || signals.twelveGrowthStages || [],
  }) || {};
}

export function normalizeLifeBookPremiumInput(raw = {}) {
  const body = safeObject(raw.body || raw);
  const profile = safeObject(raw.profile || body.profile);
  const birthInput = safeObject(raw.birthInput || body.birthInput);
  const localSajuJson = safeObject(raw.localSajuJson || body.localSajuJson);
  const signals = safeObject(raw.signals || body.analysisSignals);
  const name = clean(profile.name || body.name || birthInput.name || "사용자", 80);
  const birthDate = normalizeDate(birthInput.birthDate || body.birthDate || profile.birthDate);
  const birthTime = normalizeTime(body, birthInput);
  const targetYear = Number(body.targetYear || body.analysisYear || new Date().getFullYear());
  const warnings = [];
  if (!birthDate) warnings.push("birthDate.missing");
  if (!birthTime && body.birthTimeKnown !== false) warnings.push("birthTime.missing");

  const input = {
    serviceKey: "saju-lifebook",
    reportType: "lifeBook",
    language: "ko",
    userProfile: {
      name,
      gender: clean(profile.gender || body.gender || birthInput.gender || "미상", 20),
      calendarType: clean(profile.calendarType || body.calendarType || birthInput.calendarType || "solar", 20),
      birthDate,
      birthTime,
      birthTimeKnown: body.birthTimeKnown !== false && Boolean(birthTime),
      birthplace: clean(profile.birthplace || body.birthplace || birthInput.birthplace || "대한민국", 120),
      timezone: clean(profile.timezone || body.timezone || birthInput.timezone || "Asia/Seoul", 80),
    },
    targetYear: Number.isFinite(targetYear) ? Math.trunc(targetYear) : new Date().getFullYear(),
    chart: {
      pillars: normalizePillars(localSajuJson, body),
      elementBalance: normalizeElementBalance(localSajuJson, body),
      tenGods: normalizeTenGods(localSajuJson, body),
      usefulGod: normalizeUsefulGod(localSajuJson, signals, body),
      cycles: normalizeCycles(localSajuJson, body, signals),
      sajuSignals: normalizeSajuSignals(localSajuJson, body, signals),
    },
    evidence: {
      calculationSource: "worker-local-saju-engine",
      clientEngineSource: clean(body.engineData?.source || body.calculationSource, 120),
      structuredAdvancedReport: compact(body.structuredAdvancedReport || body.engineData?.structuredAdvancedReport),
      finalAdvancedReport: clean(body.finalAdvancedReport || body.engineData?.finalAdvancedReport, 4000),
      calculationEvidence: compact(body.engineData?.calculationEvidence || body.calculationEvidence),
      analysisSignals: compact(signals),
      quantumMyeongriJson: compact(body.quantumMyeongriJson || body.engineData?.quantumMyeongriJson),
      localSajuValidation: compact(raw.localSajuValidation || body.localSajuValidation),
      jsonContractValidation: compact(raw.jsonContractValidation || body.jsonContractValidation),
    },
    warnings,
  };

  const normalizedInputHash = hashStable(input);
  return {
    ...input,
    normalizedInputHash,
    inputSummary: clean(stableStringify({
      userProfile: input.userProfile,
      targetYear: input.targetYear,
      chart: input.chart,
      warnings,
    }), 12000),
  };
}

export function buildLifeBookInputDigest(input = {}) {
  const profile = safeObject(input.userProfile);
  const chart = safeObject(input.chart);
  const signals = safeObject(chart.sajuSignals);
  return [
    `이름: ${clean(profile.name || "사용자")}`,
    `생년월일시: ${clean(profile.birthDate)} ${clean(profile.birthTime || "시간 미상")}`,
    `성별: ${clean(profile.gender || "미상")}`,
    `달력/지역: ${clean(profile.calendarType || "solar")} · ${clean(profile.birthplace || "대한민국")} · ${clean(profile.timezone || "Asia/Seoul")}`,
    `분석 기준 연도: ${clean(input.targetYear)}`,
    `사주 네 기둥: ${clean(stableStringify(chart.pillars || {}), 1400)}`,
    `일간/월지/격국 신호: ${clean(stableStringify({
      dayMaster: signals.dayMaster,
      monthBranch: signals.monthBranch,
      geokguk: signals.geokguk,
      powerLabel: signals.powerLabel,
      johuType: signals.johuType,
    }), 1200)}`,
    `오행 균형: ${clean(stableStringify(chart.elementBalance || {}), 1400)}`,
    `십성 분포: ${clean(stableStringify(chart.tenGods || {}), 1400)}`,
    `용신·희신·기신: ${clean(stableStringify(chart.usefulGod || {}), 1400)}`,
    `대운·세운 흐름: ${clean(stableStringify(chart.cycles || {}), 1800)}`,
    `특수 신살·12운성: ${clean(stableStringify({
      specialStars: signals.specialStars || [],
      twelveGrowthStages: signals.twelveGrowthStages || [],
    }), 1600)}`,
    `사주 계산 근거: ${clean(stableStringify(buildEvidenceDigest(input.evidence || {})), 4500)}`,
    asArray(input.warnings).length ? `주의: ${asArray(input.warnings).join(", ")}` : "",
  ].filter(Boolean).join("\n");
}
