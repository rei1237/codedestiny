import { asArray, clean, hashStable, safeObject, stableStringify } from "./life-book-premium.types.js";

function normalizeDate(value = "") {
  const text = clean(value, 40);
  const match = text.match(/^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})$/);
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

function compact(value, depth = 0) {
  if (depth > 4) return undefined;
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return clean(value, 2000) || undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.map((item) => compact(item, depth + 1)).filter((item) => item !== undefined).slice(0, 80);
  }
  if (typeof value === "object") {
    const output = {};
    Object.keys(value).slice(0, 80).forEach((key) => {
      const item = compact(value[key], depth + 1);
      if (item !== undefined) output[key] = item;
    });
    return Object.keys(output).length ? output : undefined;
  }
  return undefined;
}

function pickFirstObject(...values) {
  for (const value of values) {
    const object = safeObject(value);
    if (Object.keys(object).length) return object;
  }
  return {};
}

function normalizePillars(localSajuJson = {}, body = {}) {
  const source = pickFirstObject(
    localSajuJson.pillars,
    localSajuJson.saju?.pillars,
    body.quantumMyeongriJson?.pillars,
    body.engineData?.quantumMyeongriJson?.pillars,
  );
  return compact({
    year: source.year || source.y,
    month: source.month || source.m,
    day: source.day || source.d,
    hour: source.hour || source.h,
  }) || {};
}

function normalizeElementBalance(localSajuJson = {}, body = {}) {
  return compact(pickFirstObject(
    localSajuJson.elementBalance,
    localSajuJson.elements,
    localSajuJson.fiveElements,
    body.quantumMyeongriJson?.elementBalance,
    body.analysisSignals?.elementBalance,
  )) || {};
}

function normalizeTenGods(localSajuJson = {}, body = {}) {
  return compact(pickFirstObject(
    localSajuJson.tenGods,
    localSajuJson.tenGodDistribution,
    body.quantumMyeongriJson?.tenGods,
    body.analysisSignals?.tenGods,
  )) || {};
}

function normalizeCycles(localSajuJson = {}, body = {}) {
  return compact({
    currentDaewoon: localSajuJson.currentDaewoon || localSajuJson.daewoon?.current || body.analysisSignals?.currentDaewoon,
    daewoon: localSajuJson.daewoon || body.quantumMyeongriJson?.daewoon || body.analysisSignals?.daewoon,
    yearly: localSajuJson.yearly || localSajuJson.sewoon || body.analysisSignals?.sewoon,
    targetYear: body.targetYear || body.analysisYear,
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
      gender: clean(profile.gender || body.gender || birthInput.gender, 20),
      calendarType: clean(profile.calendarType || body.calendarType || birthInput.calendarType || "solar", 20),
      birthDate,
      birthTime,
      birthTimeKnown: body.birthTimeKnown !== false && Boolean(birthTime),
      birthplace: clean(profile.birthplace || body.birthplace || birthInput.birthplace, 120),
      timezone: clean(profile.timezone || body.timezone || birthInput.timezone || "Asia/Seoul", 80),
    },
    targetYear: Number.isFinite(targetYear) ? Math.trunc(targetYear) : new Date().getFullYear(),
    chart: {
      pillars: normalizePillars(localSajuJson, body),
      elementBalance: normalizeElementBalance(localSajuJson, body),
      tenGods: normalizeTenGods(localSajuJson, body),
      cycles: normalizeCycles(localSajuJson, body),
      usefulGod: compact(localSajuJson.usefulGod || localSajuJson.yongshin || signals.usefulGod || body.analysisSignals?.usefulGod),
      specialStars: compact(localSajuJson.specialStars || signals.specialStars || body.analysisSignals?.specialStars || []),
    },
    evidence: {
      calculationSource: "worker-local-saju-engine",
      clientEngineSource: clean(body.engineData?.source || body.calculationSource, 120),
      structuredAdvancedReport: compact(body.structuredAdvancedReport || body.engineData?.structuredAdvancedReport),
      finalAdvancedReport: clean(body.finalAdvancedReport || body.engineData?.finalAdvancedReport, 3000),
      calculationEvidence: compact(body.engineData?.calculationEvidence || body.calculationEvidence),
      analysisSignals: compact(signals),
      quantumMyeongriJson: compact(body.quantumMyeongriJson || body.engineData?.quantumMyeongriJson),
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
  const pillars = safeObject(input.chart?.pillars);
  const elements = safeObject(input.chart?.elementBalance);
  const tenGods = safeObject(input.chart?.tenGods);
  return [
    `이름: ${clean(profile.name || "사용자")}`,
    `생년월일: ${clean(profile.birthDate)} ${clean(profile.birthTime)}`,
    `성별: ${clean(profile.gender || "미상")}`,
    `분석 연도: ${clean(input.targetYear)}`,
    `사주 기둥: ${clean(stableStringify(pillars), 1000)}`,
    `오행 균형: ${clean(stableStringify(elements), 1000)}`,
    `십성 흐름: ${clean(stableStringify(tenGods), 1000)}`,
    `대운/세운: ${clean(stableStringify(input.chart?.cycles || {}), 1600)}`,
    `보조 근거: ${clean(stableStringify(input.evidence || {}), 3500)}`,
    asArray(input.warnings).length ? `주의: ${asArray(input.warnings).join(", ")}` : "",
  ].filter(Boolean).join("\n");
}
