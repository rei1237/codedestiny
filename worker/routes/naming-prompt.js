import { requireAuth } from "../lib/auth.js";
import { connectDb } from "../lib/db.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { canAccessPaidFeature } from "../lib/paid-feature-access.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory } from "../lib/models.js";

const PRODUCT_TYPE = "naming_prompt";
const FEATURE_KEY = "premium-naming-prompt";
const LEGACY_FEATURE_KEY = "premium-naming-report";
const AMOUNT_KRW = 30000;
const COIN_PRICE = 300;
const CURRENCY = "KRW";
const RESULT_VERSION = "naming-prompt-v20260626";
const SAJU_EVIDENCE_SOURCE = "main-shell-saju-engine";
const ALLOWED_FEATURE_KEYS = new Set([FEATURE_KEY, LEGACY_FEATURE_KEY, "naming_prompt", "namingPrompt", "premiumNamingPrompt"]);
const PASS_ACCESS_TYPES = new Set(["membership_pass", "subscription_pass", "family", "family_pass", "license_pass"]);

const ELEMENT_LABELS = Object.freeze({
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
});

const SOUND_FIVE_ELEMENTS = Object.freeze({
  "木": ["ㄱ", "ㅋ"],
  "火": ["ㄴ", "ㄷ", "ㄹ", "ㅌ"],
  "土": ["ㅇ", "ㅎ"],
  "金": ["ㅅ", "ㅈ", "ㅊ"],
  "水": ["ㅁ", "ㅂ", "ㅍ"],
});

const PAYMENT_SUCCESS_STATUSES = new Set(["success", "paid", "fulfilled"]);

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function firstClean(...values) {
  for (const value of values) {
    const text = clean(value, 220);
    if (text) return text;
  }
  return "";
}

function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(clean(value, 40));
}

function cleanList(value, maxItem = 80) {
  if (Array.isArray(value)) return value.map((item) => clean(item, maxItem)).filter(Boolean);
  return clean(value, maxItem)
    .split(/[,;\n]/)
    .map((item) => clean(item, maxItem))
    .filter(Boolean);
}

function toBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function toInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.floor(number) : fallback;
}

function normalizeDateParts(input = {}) {
  const birthDate = clean(input.birthDate || input.date, 20);
  const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return {
    birthDate,
    year: match ? Number(match[1]) : toInt(input.year),
    month: match ? Number(match[2]) : toInt(input.month),
    day: match ? Number(match[3]) : toInt(input.day),
  };
}

function normalizeCandidate(value = {}) {
  if (typeof value === "string") {
    const parts = value.split("|").map((part) => clean(part, 200));
    return {
      hangul: clean(parts[0], 20),
      hanjaCandidates: parts[1] ? cleanList(parts[1], 20) : [],
      note: clean(parts[2] || "", 220),
    };
  }
  return {
    hangul: clean(value.hangul || value.name || value.korean, 20),
    hanjaCandidates: cleanList(value.hanjaCandidates || value.hanja || value.hanjaName, 20),
    note: clean(value.note || value.memo || "", 220),
  };
}

function normalizeDesiredNames(raw) {
  if (Array.isArray(raw)) return raw.map(normalizeCandidate).filter((item) => item.hangul || item.hanjaCandidates.length);
  return clean(raw, 1200)
    .split(/\n+/)
    .map(normalizeCandidate)
    .filter((item) => item.hangul || item.hanjaCandidates.length);
}

function normalizeInput(raw = {}) {
  const date = normalizeDateParts(raw);
  const birthTimeUnknown = toBoolean(raw.birthTimeUnknown || raw.unknownTime || raw.timeUnknown);
  const birthTime = birthTimeUnknown ? "" : clean(raw.birthTime || raw.time, 10);
  const timeMatch = birthTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  const calendarType = clean(raw.calendarType || raw.calendar || "solar", 20).toLowerCase();
  const desiredNames = normalizeDesiredNames(raw.desiredNames || raw.candidateNames || raw.nameCandidates);
  const currentName = clean(raw.currentName || raw.hangulName || raw.preferredName, 40);
  const preferredStyle = clean(raw.preferredStyle || raw.style || raw.preferenceTone, 200);
  const preferredImage = cleanList(raw.preferredImage || raw.preferredImages || raw.preferenceTone, 60);
  const memo = clean(raw.memo || raw.requestMemo || raw.extraRequest, 1500);

  return {
    gender: clean(raw.gender, 20),
    birthDate: date.birthDate,
    birthTime,
    birthTimeUnknown,
    calendarType: calendarType === "lunar" || calendarType === "lunar_leap" ? calendarType : "solar",
    isLeapMonth: toBoolean(raw.isLeapMonth || raw.leapMonth),
    birthPlace: clean(raw.birthPlace || raw.place || "대한민국", 80),
    timezone: clean(raw.timezone || raw.timeZone || "Asia/Seoul", 80),
    familyName: clean(raw.familyName || raw.surname || raw.lastName, 10),
    nameLength: Math.max(1, Math.min(4, toInt(raw.nameLength, 2))),
    desiredType: clean(raw.desiredType || raw.nameType || "", 120),
    currentName,
    desiredSyllables: cleanList(raw.desiredSyllables || raw.usableSyllables, 20),
    requiredSyllables: cleanList(raw.requiredSyllables || raw.requiredLetters, 20),
    blockedSyllables: cleanList(raw.blockedSyllables || raw.blockedLetters, 20),
    preferredImage,
    preferredStyle,
    useHanja: toBoolean(raw.useHanja ?? true),
    generationNameRule: clean(raw.generationNameRule || raw.generationName || "", 200),
    siblingHarmony: clean(raw.siblingHarmony || raw.siblingNames || "", 200),
    avoidFamilyNames: clean(raw.avoidFamilyNames || raw.familyNameAvoidance || "", 240),
    desiredNames,
    memo,
    year: date.year,
    month: date.month,
    day: date.day,
    hour: timeMatch ? Number(timeMatch[1]) : 12,
    minute: timeMatch ? Number(timeMatch[2]) : 0,
  };
}

function validateInput(input) {
  const missing = [];
  if (!input.gender) missing.push("성별");
  if (!input.birthDate || !input.year || !input.month || !input.day) missing.push("생년월일");
  if (!input.calendarType) missing.push("양력/음력");
  if (!input.familyName) missing.push("성씨");

  const invalidHanja = [];
  for (const item of input.desiredNames) {
    const hangulLength = Array.from(item.hangul || "").length;
    for (const hanja of item.hanjaCandidates) {
      if (hangulLength > 0 && Array.from(hanja).length !== hangulLength) {
        invalidHanja.push(`${item.hangul}:${hanja}`);
      }
    }
  }

  if (missing.length) {
    throw createHttpError(400, "필수 입력값을 확인해 주세요.", { code: "NAMING_INPUT_REQUIRED", missing });
  }
  if (invalidHanja.length) {
    throw createHttpError(400, "한자 후보의 글자 수가 한글 이름 음절 수와 맞지 않습니다.", {
      code: "HANJA_LENGTH_MISMATCH",
      invalidHanja,
    });
  }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = stable(value[key]);
    return acc;
  }, {});
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function buildInputHash(input) {
  return sha256Hex(JSON.stringify(stable(input)));
}

async function buildSajuEvidenceHash(evidence) {
  return sha256Hex(JSON.stringify(stable(evidence)));
}

async function buildNamingOrderHash(input, sajuEvidenceHash) {
  return sha256Hex(JSON.stringify(stable({ input, sajuEvidenceHash })));
}

function jsonCloneLimited(value, maxLength = 80000) {
  const text = JSON.stringify(value ?? null);
  if (text.length > maxLength) {
    throw createHttpError(400, "사주 계산 스냅샷이 너무 큽니다.", { code: "SAJU_EVIDENCE_TOO_LARGE" });
  }
  return JSON.parse(text);
}

function normalizeMainShellPillar(node = {}) {
  return {
    g: clean(node.g || node.stem, 10),
    j: clean(node.j || node.branch, 10),
    gE: clean(node.gE || node.stemElement, 20),
    jE: clean(node.jE || node.branchElement, 20),
  };
}

function normalizeMainShellPillars(raw = {}) {
  return {
    y: normalizeMainShellPillar(raw.y || raw.year),
    m: normalizeMainShellPillar(raw.m || raw.month),
    d: normalizeMainShellPillar(raw.d || raw.day),
    h: normalizeMainShellPillar(raw.h || raw.hour),
  };
}

function hasMainShellPillar(node = {}) {
  return Boolean(clean(node.g, 10) && clean(node.j, 10));
}

function normalizeSajuEvidence(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw createHttpError(400, "사주 계산 기준을 먼저 확정해 주세요.", { code: "SAJU_EVIDENCE_REQUIRED" });
  }
  const source = clean(raw.source || raw.calculationSource, 80);
  const evidence = {
    source,
    pillars: normalizeMainShellPillars(raw.pillars || {}),
    natal: jsonCloneLimited(safeObject(raw.natal || {}), 20000),
    power: jsonCloneLimited(safeObject(raw.power || {}), 20000),
    johu: jsonCloneLimited(safeObject(raw.johu || {}), 16000),
    jong: jsonCloneLimited(safeObject(raw.jong || {}), 16000),
    tenGods: jsonCloneLimited(safeObject(raw.tenGods || {}), 16000),
    kasiContext: jsonCloneLimited(safeObject(raw.kasiContext || {}), 24000),
    timeCorrection: jsonCloneLimited(safeObject(raw.timeCorrection || {}), 12000),
    activeBirthProfile: jsonCloneLimited(safeObject(raw.activeBirthProfile || {}), 16000),
    engineVersion: clean(raw.engineVersion || raw.version || "", 120),
    inputHash: clean(raw.inputHash || raw.baseInputHash, 160),
    generatedAt: clean(raw.generatedAt, 80),
  };
  if (evidence.source !== SAJU_EVIDENCE_SOURCE) {
    throw createHttpError(400, "기본 사주 화면의 계산 기준으로 작명 사주를 확정해 주세요.", { code: "SAJU_EVIDENCE_SOURCE_MISMATCH" });
  }
  if (!hasMainShellPillar(evidence.pillars.y) || !hasMainShellPillar(evidence.pillars.m) || !hasMainShellPillar(evidence.pillars.d)) {
    throw createHttpError(400, "사주 원국 스냅샷이 완성되지 않았습니다.", { code: "SAJU_EVIDENCE_PILLARS_REQUIRED" });
  }
  if (!evidence.power || !Array.isArray(evidence.power.yongshin)) {
    throw createHttpError(400, "용신 보정이 끝난 사주 스냅샷이 필요합니다.", { code: "SAJU_EVIDENCE_POWER_REQUIRED" });
  }
  if (!evidence.inputHash) {
    throw createHttpError(400, "입력값과 연결된 사주 스냅샷이 필요합니다.", { code: "SAJU_EVIDENCE_INPUT_HASH_REQUIRED" });
  }
  return evidence;
}

async function resolveSajuEvidence(input, rawEvidence, claimedHash = "") {
  const evidence = normalizeSajuEvidence(rawEvidence);
  const baseInputHash = await buildInputHash(input);
  if (evidence.inputHash && evidence.inputHash !== baseInputHash) {
    throw createHttpError(409, "입력값과 사주 계산 기준이 일치하지 않습니다.", { code: "SAJU_EVIDENCE_INPUT_MISMATCH" });
  }
  const evidenceHash = await buildSajuEvidenceHash(evidence);
  const expected = clean(claimedHash, 160);
  if (expected && expected !== evidenceHash) {
    throw createHttpError(409, "사주 계산 기준이 결제 전 스냅샷과 일치하지 않습니다.", { code: "SAJU_EVIDENCE_HASH_MISMATCH" });
  }
  return { evidence, evidenceHash, baseInputHash };
}

function formatList(value, fallback = "미입력") {
  if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
  const text = clean(value, 2000);
  return text || fallback;
}

function pillarText(pillar) {
  const stem = clean(pillar?.stem || "");
  const branch = clean(pillar?.branch || "");
  return clean(pillar?.ganji || `${stem}${branch}`) || "미상";
}

function elementBalanceText(fiveElements = {}) {
  const scores = fiveElements.scores || fiveElements.percentages || {};
  return ["wood", "fire", "earth", "metal", "water"]
    .map((key) => `${ELEMENT_LABELS[key]} ${Math.round(Number(scores[key] || 0))}`)
    .join(" / ");
}

function tenGodBalanceText(tenGods = {}) {
  const counts = tenGods.counts || {};
  const entries = Object.entries(counts)
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  return entries.length ? entries.map(([key, value]) => `${key} ${value}`).join(" / ") : "미상";
}

function asElementLabelList(values) {
  const source = Array.isArray(values) ? values : [values];
  return source.map((key) => ELEMENT_LABELS[key] || clean(key, 20)).filter(Boolean);
}

function mainShellPillarText(pillar = {}) {
  const stem = clean(pillar.g || pillar.stem, 10);
  const branch = clean(pillar.j || pillar.branch, 10);
  return stem || branch ? `${stem}${branch}` : "미상";
}

function elementDistributionText(source = {}) {
  const ratios = source.ratios || source.percentages || source.scores || source.counts || {};
  return ["wood", "fire", "earth", "metal", "water"]
    .map((key) => `${ELEMENT_LABELS[key]} ${Math.round(Number(ratios[key] || 0))}`)
    .join(" / ");
}

function labelElementList(values, fallback = "미상") {
  const list = asElementLabelList(values);
  return list.length ? list.join(", ") : fallback;
}

function buildPowerSummary(power = {}) {
  if (typeof power.isStrong === "boolean") {
    return `${power.isStrong ? "신강" : "신약"} 후보 / 억부 점수 ${Math.round(Number(power.score || 0))}`;
  }
  return "월령·통근·투간·오행 균형을 함께 보아 신강/신약 후보를 재검토";
}

function buildJohuSummary(johu = {}) {
  return [
    clean(johu.badgeTxt || johu.type, 80),
    clean(johu.advice, 180),
    clean(johu.moistAdvice, 120),
  ].filter(Boolean).join(" / ") || "계절성과 조후 필요성을 별도로 검토";
}

function buildJongSummary(jong = {}) {
  if (!jong || !Object.keys(jong).length) return "종격/가종격 특이 신호 없음";
  if (jong.isJong) return `${jong.name || "종격"} 후보 / 주도 오행 ${labelElementList(jong.dominant, "미상")}`;
  if (jong.isGaJong) return `${jong.name || "가종격"} 후보 / 재검토 필요`;
  return "종격/가종격 특이 신호 없음";
}

function buildSajuContext(input, mainShellEvidence = null, sajuEvidenceHash = "") {
  const fallback = buildFallbackSajuContext(input);
  if (!mainShellEvidence) return fallback;
  const pillars = mainShellEvidence.pillars || {};
  const power = mainShellEvidence.power || {};
  const johu = mainShellEvidence.johu || {};
  const jong = mainShellEvidence.jong || {};
  const finalYongshin = labelElementList(power.yongshin, "용신 후보 미상");
  const eokbuYongshin = labelElementList(power.eokbuYongshin || power.yongshin, "억부용신 후보 미상");
  const johuYongshin = labelElementList(power.johuYongshin, "조후용신 후보 미상");
  const finalKijishin = labelElementList(power.kijishin, "기신 후보 미상");
  const eokbuKijishin = labelElementList(power.eokbuKijishin || power.kijishin, "억부기신 후보 미상");
  const johuKijishin = labelElementList(power.johuKijishin, "조후기신 후보 미상");

  return {
    ...fallback,
    source: SAJU_EVIDENCE_SOURCE,
    sajuEvidenceHash: clean(sajuEvidenceHash, 160),
    engineVersion: clean(mainShellEvidence.engineVersion, 120) || "main-shell-saju-engine",
    yearPillar: mainShellPillarText(pillars.y),
    monthPillar: mainShellPillarText(pillars.m),
    dayPillar: mainShellPillarText(pillars.d),
    hourPillar: input.birthTimeUnknown ? "출생시간 미상으로 시주 미확정" : mainShellPillarText(pillars.h),
    dayMaster: `${clean(pillars.d?.g, 10)}${pillars.d?.gE ? `(${ELEMENT_LABELS[pillars.d.gE] || pillars.d.gE})` : ""}` || fallback.dayMaster,
    monthCommand: clean(pillars.m?.j, 10) || fallback.monthCommand,
    fiveElementBalance: elementDistributionText(mainShellEvidence.natal || {}),
    tenGodBalance: tenGodBalanceText(mainShellEvidence.tenGods || {}) || fallback.tenGodBalance,
    strengthAnalysis: buildPowerSummary(power),
    temperatureBalance: buildJohuSummary(johu),
    usefulGodCandidates: finalYongshin,
    supportiveGodCandidates: [eokbuYongshin, johuYongshin].filter((item) => item && item !== "조후용신 후보 미상").join(" / ") || fallback.supportiveGodCandidates,
    unfavorableGodCandidates: finalKijishin,
    recommendedNameElements: `용신·희신 우선: ${finalYongshin} / 조후 보완: ${johuYongshin}`,
    avoidNameElements: `기신·과다 오행 회피: ${finalKijishin} / 조후 주의: ${johuKijishin}`,
    eokbuYongshin,
    johuYongshin,
    finalYongshin,
    eokbuKijishin,
    johuKijishin,
    finalKijishin,
    jongAnalysis: buildJongSummary(jong),
    raw: {
      mainShellEvidence,
      fallbackBuildSajuProfile: fallback.raw || null,
    },
  };
}

function buildFallbackSajuContext(input) {
  try {
    const profile = buildSajuProfile({
      name: input.currentName || input.familyName || "사용자",
      gender: input.gender,
      timezone: input.timezone,
      birthPlace: input.birthPlace,
      hourPillarTimePolicy: "TRUE_SOLAR_TIME",
      dayChangePolicy: "MIDNIGHT",
      birth: {
        year: input.year,
        month: input.month,
        day: input.day,
        hour: input.birthTimeUnknown ? 12 : input.hour,
        minute: input.birthTimeUnknown ? 0 : input.minute,
        calendarType: input.isLeapMonth ? "lunar_leap" : input.calendarType,
        timezone: input.timezone,
        birthPlace: input.birthPlace,
        unknownTime: input.birthTimeUnknown,
      },
    });

    const useful = profile.usefulGods || {};
    const lacking = asElementLabelList(profile.fiveElements?.lacking || []);
    const excessive = asElementLabelList(profile.fiveElements?.excessive || []);
    const yong = asElementLabelList(useful.yong || []);
    const hee = asElementLabelList(useful.hee || []);
    const gi = asElementLabelList(useful.gi || []);

    return {
      source: "buildSajuProfile",
      yearPillar: pillarText(profile.pillars?.year),
      monthPillar: pillarText(profile.pillars?.month),
      dayPillar: pillarText(profile.pillars?.day),
      hourPillar: input.birthTimeUnknown ? "출생시간 미상으로 시주 미확정" : pillarText(profile.pillars?.hour),
      dayMaster: `${clean(profile.dayMaster?.stem || "")}${profile.dayMaster?.elementKo ? `(${profile.dayMaster.elementKo})` : ""}` || "미상",
      monthCommand: pillarText(profile.pillars?.month?.branch ? { ganji: profile.pillars.month.branch } : null),
      fiveElementBalance: elementBalanceText(profile.fiveElements),
      tenGodBalance: tenGodBalanceText(profile.tenGods),
      strengthAnalysis: clean(useful.strength || "월령·통근·투간·오행 균형을 함께 보아 신강/신약 후보를 재검토", 200),
      temperatureBalance: clean(useful.temperature || "계절성과 조후 필요성을 별도로 검토", 200),
      usefulGodCandidates: formatList(yong, "월령·일간·조후·통근·투간 검토 후 후보 제시"),
      supportiveGodCandidates: formatList(hee, "용신 후보를 돕는 희신 후보 제시"),
      unfavorableGodCandidates: formatList(gi, "과다하거나 균형을 해치는 기신 후보 제시"),
      recommendedNameElements: formatList(lacking, "사주 구조 검토 후 보완 오행 제시"),
      avoidNameElements: formatList(excessive, "과다 오행과 기신 후보를 비교해 제시"),
      raw: {
        pillars: profile.pillars,
        fiveElements: profile.fiveElements,
        tenGods: profile.tenGods,
        usefulGods: profile.usefulGods,
        verification: profile.verification,
      },
    };
  } catch (error) {
    return {
      source: "input-fallback",
      yearPillar: "계산 실패 - 입력값 기준 재검토 필요",
      monthPillar: "계산 실패 - 입력값 기준 재검토 필요",
      dayPillar: "계산 실패 - 입력값 기준 재검토 필요",
      hourPillar: input.birthTimeUnknown ? "출생시간 미상으로 시주 미확정" : "계산 실패 - 입력값 기준 재검토 필요",
      dayMaster: "계산 실패 - 전문가가 입력값으로 재산출",
      monthCommand: "계산 실패 - 절기 기준 재산출",
      fiveElementBalance: "계산 실패 - 년월일시 기준 재산출",
      tenGodBalance: "계산 실패 - 일간 확정 후 재산출",
      strengthAnalysis: "월령·통근·투간·오행 균형을 함께 보아 신강/신약 후보를 재검토",
      temperatureBalance: "계절성과 조후 필요성을 별도로 검토",
      usefulGodCandidates: "월령·일간·조후·통근·투간 검토 후 후보 제시",
      supportiveGodCandidates: "용신 후보를 돕는 희신 후보 제시",
      unfavorableGodCandidates: "과다하거나 균형을 해치는 기신 후보 제시",
      recommendedNameElements: "사주 구조 검토 후 보완 오행 제시",
      avoidNameElements: "과다 오행과 기신 후보를 비교해 제시",
      error: clean(error?.message, 200),
    };
  }
}

function desiredNamesMarkdown(names) {
  if (!names.length) return "미입력";
  return names.map((item, index) => {
    const hanja = item.hanjaCandidates.length ? item.hanjaCandidates.join(", ") : "한자 조합 추천 요청";
    const note = item.note || "메모 없음";
    return `${index + 1}. ${item.hangul || "한글 미입력"} / 한자: ${hanja} / 메모: ${note}`;
  }).join("\n");
}

function buildPreferenceContext(input) {
  const parts = [];
  const style = clean(input.preferredStyle, 200);
  const images = Array.isArray(input.preferredImage) ? input.preferredImage : [];
  if (style) parts.push(style);
  for (const image of images) {
    const token = clean(image, 60);
    if (token && !parts.includes(token)) parts.push(token);
  }
  return parts.length ? parts.join(" / ") : "미입력";
}

function buildGeneratedPrompt(input, saju) {
  const hasSeedNames = Boolean(input.currentName || input.desiredNames.length || input.desiredSyllables.length);
  const preferenceContext = buildPreferenceContext(input);
  const timeNote = input.birthTimeUnknown
    ? "\n- 출생시간이 불명확하므로 시주는 확정하지 않고, 년주·월주·일주 중심으로 작명 방향을 판단해주세요. 시주에 따라 용신 판단이 달라질 수 있음을 고려해주세요."
    : "";
  const hanjaNote = input.desiredNames.some((item) => item.hangul && item.hanjaCandidates.length === 0) || (input.currentName && !input.useHanja)
    ? "\n- 한글 이름만 입력된 후보는 한자 획수와 수리 풀이를 한자 조합이 확정된 뒤 최종 판단해주세요."
    : "";
  const draftNote = hasSeedNames
    ? "\n- 무료 입력 단계의 초안 추천이 있었다면 참고안으로만 보고, 반드시 사주와 작명 원칙으로 다시 검토해주세요."
    : "\n- 사용자가 이름 후보를 비워두었으므로, 사주와 요청 조건을 바탕으로 새 이름 후보 5~7개를 먼저 제안해주세요.";
  const candidateRequestLines = hasSeedNames
    ? [
        "2. 사용자가 입력한 이름 후보를 각각 평가해주세요.",
        "3. 각 후보 이름에 대해 소리오행, 자원오행, 수리오행, 원형이정 수리, 음양 균형, 현대적 이름감을 분석해주세요.",
        "4. 한글 이름만 입력된 경우 가능한 한자 조합을 여러 개 제안하고, 각 조합의 장단점을 비교해주세요.",
      ]
    : [
        "2. 입력값을 바탕으로 새 이름 후보 5~7개를 먼저 제안해주세요.",
        "3. 제안한 후보 각각에 대해 소리오행, 자원오행, 수리오행, 원형이정 수리, 음양 균형, 현대적 이름감을 분석해주세요.",
        "4. 각 후보별로 가능한 한자 조합을 여러 개 제안하고, 장단점을 비교해주세요.",
      ];

  return `당신은 30년 이상 임상 작명 경험을 가진 한국 전통 작명 전문가이자 사주명리학자입니다.
아래 사용자의 사주와 이름 후보를 바탕으로, 단순히 예쁜 이름을 고르는 것이 아니라 사주 보완, 용신·희신, 소리오행, 자원오행, 한자 의미, 인명용 한자 적합성, 원형이정 수리, 음양 균형, 현대적 사용성을 모두 종합해 가장 좋은 이름을 추천해주세요.

중요 원칙:
- 용신은 단순히 부족한 오행으로 판단하지 말고 월령, 일간, 신강·신약, 조후, 통근, 투간, 오행 흐름을 종합해 판단해주세요.
- 인명용 한자로 쓰기 어려운 글자나 의미가 부정적인 글자는 추천하지 마세요.
- 수리만 좋고 사주에 맞지 않는 이름, 발음만 예쁘고 오행이 맞지 않는 이름은 낮게 평가해주세요.
- 전통 작명 이론과 현대적 이름감을 함께 고려해주세요.
- 불확실한 부분은 단정하지 말고 판단 근거와 보완 의견을 함께 말해주세요.
- 사용자가 입력한 이름 후보가 좋지 않더라도 무조건 부정하지 말고, 개선 가능한 한자 조합이나 대체 이름을 제안해주세요.${timeNote}${hanjaNote}${draftNote}

[사용자 정보]
- 성별: ${input.gender}
- 성씨: ${input.familyName}
- 생년월일: ${input.birthDate}
- 출생시간: ${input.birthTimeUnknown ? "모름" : input.birthTime}
- 달력 기준: ${input.calendarType === "lunar" || input.calendarType === "lunar_leap" ? "음력" : "양력"}
- 윤달 여부: ${input.isLeapMonth ? "예" : "아니오"}
- 출생지/시간대: ${input.birthPlace} / ${input.timezone}
- 이름 글자 수: ${input.nameLength}
- 원하는 이름 유형: ${input.desiredType || "미입력"}
- 출생시간 정확도: ${input.birthTimeUnknown ? "출생시간 모름" : "사용자 입력 시간 기준"}

[사주 계산 결과]
- 계산 기준: ${saju.source}${saju.engineVersion ? ` / ${saju.engineVersion}` : ""}
- 사주 스냅샷 해시: ${saju.sajuEvidenceHash || "보조 계산 기준"}
- 년주: ${saju.yearPillar}
- 월주: ${saju.monthPillar}
- 일주: ${saju.dayPillar}
- 시주: ${saju.hourPillar}
- 일간: ${saju.dayMaster}
- 월령: ${saju.monthCommand}
- 오행 분포: ${saju.fiveElementBalance}
- 십성 분포: ${saju.tenGodBalance}
- 신강/신약 판단 후보: ${saju.strengthAnalysis}
- 조후 필요성: ${saju.temperatureBalance}
- 용신 후보: ${saju.usefulGodCandidates}
- 희신 후보: ${saju.supportiveGodCandidates}
- 기신 후보: ${saju.unfavorableGodCandidates}
- 이름으로 보완하면 좋은 오행: ${saju.recommendedNameElements}
- 이름에서 피하면 좋은 오행: ${saju.avoidNameElements}

[용신 판단 근거 분리]
- 억부용신 후보: ${saju.eokbuYongshin || "메인 사주 계산 기준 확인"}
- 조후용신 후보: ${saju.johuYongshin || "메인 사주 계산 기준 확인"}
- 최종 보정 용신: ${saju.finalYongshin || saju.usefulGodCandidates}
- 억부기신 후보: ${saju.eokbuKijishin || "메인 사주 계산 기준 확인"}
- 조후기신 후보: ${saju.johuKijishin || "메인 사주 계산 기준 확인"}
- 최종 주의 오행: ${saju.finalKijishin || saju.unfavorableGodCandidates}
- 종격/가종격 검토: ${saju.jongAnalysis || "종격 특이 신호 없음"}
- 이름 오행 적용 순서: 용신·희신 우선 → 조후 보완 → 과다·기신 회피 → 소리·자원·수리 균형 조정

[한국 작명 기준]
- 소리오행 기준: ${JSON.stringify(SOUND_FIVE_ELEMENTS)}
- 한자는 실제 인명용 한자 여부, 부정 의미, 불용문자 가능성, 획수 데이터 유무를 확인해 주세요.
- 확인할 수 없는 한자는 확정 추천하지 말고 "검증 필요"로 표시해주세요.
- 한자 획수, 인명용 한자 여부, 법적 사용 가능성은 데이터가 확정되지 않으면 단정하지 말고 반드시 "검증 필요"로 표시해주세요.
- 한자 의미는 실제 의미를 바탕으로 담백하게 해석하고 과장하지 마세요.
- 원형이정 수리는 한자 획수 기준으로 원격·형격·이격·정격·총획, 초년운·청년운·장년운·말년운, 길수·흉수, 수리오행, 음양 배치를 함께 봐주세요.
- 자원오행은 한자의 부수, 의미, 상징, 이름 전체 조합과 사주 보완 오행과의 관계를 함께 판단해주세요.

[사용자 이름 선호]
- 현재 생각 중인 한글 이름: ${input.currentName || "미입력"}
- 원하는 이름 후보:
${desiredNamesMarkdown(input.desiredNames)}
- 사용하고 싶은 음절: ${formatList(input.desiredSyllables)}
- 반드시 넣고 싶은 글자: ${formatList(input.requiredSyllables)}
- 피하고 싶은 글자: ${formatList(input.blockedSyllables)}
- 이름 분위기/이미지 선호: ${preferenceContext}
- 한자 사용 여부: ${input.useHanja ? "사용" : "한글 이름 중심, 필요 시 한자 조합 제안"}
- 돌림자 여부: ${input.generationNameRule || "미입력"}
- 형제자매 이름과의 조화: ${input.siblingHarmony || "미입력"}
- 피해야 할 가족 이름 또는 비슷한 발음: ${input.avoidFamilyNames || "미입력"}
- 기타 요청: ${input.memo || "미입력"}

[분석 요청]
1. 먼저 이 사주에서 이름이 어떤 방향으로 보완되어야 하는지 설명해주세요.
${candidateRequestLines.join("\n")}
5. 사주 보완에 가장 좋은 이름 TOP 3를 추천해주세요.
6. 최종 1순위 이름을 선정하고, 왜 그 이름이 가장 적합한지 설명해주세요.
7. 피해야 할 이름 조합과 이유도 알려주세요.
8. 실제 출생신고 또는 개명에 사용할 수 있도록 현실적인 조언을 덧붙여주세요.

[출력 형식]
# 사주 맞춤 작명 분석 결과

## 1. 사주 핵심 요약
## 2. 용신·희신 판단
## 3. 이름에 필요한 오행 방향
## 4. 후보 이름 평가
표로 정리해주세요.

| 후보 이름 | 사주 보완 | 소리오행 | 한자 의미 | 수리 | 현대적 사용성 | 종합점수 |
|---|---:|---:|---:|---:|---:|---:|

## 5. 한자 조합 추천
## 6. 소리오행 분석
## 7. 수리오행·원형이정 풀이
## 8. 자원오행 분석
## 9. 현대적 이름감 평가
## 10. 최종 추천 TOP 3
## 11. 최종 1순위 이름
## 12. 피해야 할 이름
## 13. 실제 작명 선택 조언`;
}

function buildCheckoutPayload(inputHash, sajuEvidenceHash = "") {
  const requestId = `naming-prompt-${inputHash.slice(0, 16)}`;
  return {
    paymentType: "digital_content",
    provider: "PORTONE_V2",
    pg: "KG_INICIS",
    productType: PRODUCT_TYPE,
    serviceId: "naming-prompt",
    productId: "naming-prompt",
    contentId: inputHash,
    contentType: PRODUCT_TYPE,
    featureKey: FEATURE_KEY,
    reason: "사주 맞춤 작명 프롬프트 생성",
    paymentAmount: AMOUNT_KRW,
    amountKrw: AMOUNT_KRW,
    coinPriceBasis: COIN_PRICE,
    coinPrice: COIN_PRICE,
    membershipCreditCost: calculateMembershipCreditCost(COIN_PRICE),
    paymentMethod: "card_general",
    requestId,
    reportId: inputHash,
    inputHash,
    sajuEvidenceHash: clean(sajuEvidenceHash, 160),
    sessionId: requestId,
    idempotencyKey: requestId,
    passEligible: true,
    subscriptionEligible: true,
    monthlyPassEligible: true,
    singlePaymentOnly: false,
  };
}

async function findPaymentForUser(env, auth, paymentId) {
  await connectDb(env);
  const normalized = clean(paymentId, 160);
  if (!normalized) {
    throw createHttpError(400, "paymentId is required.", { code: "PAYMENT_ID_REQUIRED" });
  }
  const payment = await Payment.findOne({
    userId: auth.userId,
    $or: [
      { merchantUid: normalized },
      { impUid: normalized },
      { _id: /^[a-f\d]{24}$/i.test(normalized) ? normalized : undefined },
    ].filter((item) => Object.values(item)[0] !== undefined),
  }).lean();
  if (!payment) throw createHttpError(404, "결제 기록을 찾을 수 없습니다.", { code: "PAYMENT_NOT_FOUND" });
  return payment;
}

function verifyPaymentShape(payment, inputHash = "") {
  const status = clean(payment.status, 40).toLowerCase();
  const featureKey = clean(payment.featureKey, 80);
  const reportId = clean(payment.reportId || payment.pricingSnapshot?.contentId || payment.pricingSnapshot?.reportId, 160);
  if (!PAYMENT_SUCCESS_STATUSES.has(status)) {
    throw createHttpError(402, "결제가 완료된 뒤에만 프롬프트를 생성할 수 있습니다.", { code: "PAYMENT_NOT_PAID", status });
  }
  if (Number(payment.paymentAmount || 0) !== AMOUNT_KRW) {
    throw createHttpError(400, "작명 프롬프트 결제 금액이 일치하지 않습니다.", { code: "PAYMENT_AMOUNT_MISMATCH" });
  }
  if (Number(payment.coinPrice || payment.expectedChargedPoints || 0) !== COIN_PRICE) {
    throw createHttpError(400, "작명 프롬프트 상품 금액 정책이 일치하지 않습니다.", { code: "PAYMENT_COIN_MISMATCH" });
  }
  if (featureKey !== FEATURE_KEY && featureKey !== LEGACY_FEATURE_KEY) {
    throw createHttpError(400, "작명 프롬프트 결제 건이 아닙니다.", { code: "PAYMENT_PRODUCT_MISMATCH" });
  }
  if (clean(payment.paymentType, 40) !== "digital_content" || clean(payment.accessType, 40) !== "single_purchase") {
    throw createHttpError(400, "단건 원화 결제 건만 사용할 수 있습니다.", { code: "PAYMENT_ACCESS_TYPE_MISMATCH" });
  }
  if (inputHash && reportId && reportId !== inputHash) {
    throw createHttpError(409, "입력값이 바뀌면 새 결제가 필요합니다.", { code: "INPUT_HASH_MISMATCH" });
  }
  return true;
}

function unwrapAccessContext(body = {}) {
  const context = safeObject(body.paymentContext || body.paymentPayload || body.accessPayload || {});
  const payload = safeObject(context.payload || context.data || context);
  const nestedPayload = safeObject(payload.payload || payload.data);
  const data = Object.keys(nestedPayload).length ? nestedPayload : payload;
  const accessGrant = safeObject(body.accessGrant || context.accessGrant || payload.accessGrant || data.accessGrant);
  const consume = safeObject(body.consume || context.consume || payload.consume || data.consume);
  const payment = safeObject(body.payment || context.payment || payload.payment || data.payment);
  const access = safeObject(context.access || payload.access || data.access || data.accessDecision);
  return { context, payload: data, accessGrant, consume, payment, access };
}

function readContextFeatureKey(ctx = {}, body = {}) {
  return firstClean(
    body.featureKey,
    ctx.accessGrant.featureKey,
    ctx.consume.featureKey,
    ctx.payment.featureKey,
    ctx.payload.featureKey,
    ctx.context.featureKey,
  );
}

function readContextInputHash(ctx = {}, body = {}) {
  return firstClean(
    body.inputHash,
    body.reportId,
    ctx.accessGrant.reportId,
    ctx.accessGrant.contentId,
    ctx.accessGrant.contentKey,
    ctx.consume.reportId,
    ctx.consume.contentId,
    ctx.consume.contentKey,
    ctx.payment.reportId,
    ctx.payload.reportId,
    ctx.payload.contentId,
    ctx.context.reportId,
  );
}

function readContextEvidenceId(ctx = {}, body = {}) {
  return firstClean(
    body.paymentId,
    body.merchantUid,
    ctx.accessGrant.merchantUid,
    ctx.accessGrant.paymentId,
    ctx.accessGrant.impUid,
    ctx.accessGrant.evidenceId,
    ctx.accessGrant.ledgerId,
    ctx.accessGrant.purchaseId,
    ctx.accessGrant.transactionId,
    ctx.accessGrant.requestId,
    ctx.consume.merchantUid,
    ctx.consume.paymentId,
    ctx.consume.impUid,
    ctx.consume.ledgerId,
    ctx.consume.transactionId,
    ctx.consume.purchaseId,
    ctx.consume.requestId,
    ctx.payment.merchantUid,
    ctx.payment.paymentId,
    ctx.payment.impUid,
    ctx.payload.transactionId,
    ctx.payload.paymentId,
    ctx.payload.purchaseId,
    ctx.payload.requestId,
    ctx.context.transactionId,
  );
}

function readContextAccessType(ctx = {}, body = {}) {
  return firstClean(
    body.accessType,
    ctx.accessGrant.accessType,
    ctx.consume.accessType,
    ctx.payload.accessType,
    ctx.access.status,
  ).toLowerCase();
}

function readContextAccessMethod(ctx = {}, body = {}) {
  return firstClean(
    body.accessMethod,
    body.paymentMethod,
    ctx.accessGrant.accessMethod,
    ctx.accessGrant.paymentMethod,
    ctx.consume.accessMethod,
    ctx.consume.paymentMethod,
    ctx.payload.accessMethod,
    ctx.payload.paymentMethod,
  ).toUpperCase();
}

function normalizeExecutionAccessMethod(accessType, accessMethod, decision = {}) {
  const type = clean(accessType, 80).toLowerCase();
  const method = clean(accessMethod, 80).toUpperCase();
  const source = clean(decision.accessSource, 80).toLowerCase();
  if (type === "membership_credit" || method === "MONTHLY" || method === "MONTHLY_CREDIT" || source === "monthlysubscription") return "monthly";
  if (type === "family" || type === "family_pass" || method === "FAMILY") return "family";
  if (PASS_ACCESS_TYPES.has(type) || method === "PASS" || source === "license_pass" || source === "licenses") return "pass";
  return "single";
}

function isPassAccess(accessType, accessMethod, decision = {}) {
  return ["pass", "family"].includes(normalizeExecutionAccessMethod(accessType, accessMethod, decision));
}

function isMonthlyAccess(accessType, accessMethod, decision = {}) {
  return normalizeExecutionAccessMethod(accessType, accessMethod, decision) === "monthly";
}

async function verifyMonthlyEvidence(env, auth, ctx = {}) {
  const ledgerId = firstClean(ctx.accessGrant.ledgerId, ctx.consume.ledgerId);
  const transactionId = firstClean(ctx.accessGrant.transactionId, ctx.consume.transactionId, ctx.payload.transactionId);
  const purchaseId = firstClean(ctx.accessGrant.purchaseId, ctx.consume.purchaseId, ctx.payload.purchaseId, ctx.accessGrant.requestId, ctx.consume.requestId, ctx.payload.requestId);
  await connectDb(env);
  const ledgerOr = [
    isObjectId(ledgerId) ? { _id: ledgerId } : null,
    isObjectId(transactionId) ? { "metadata.pointHistoryId": transactionId } : null,
    purchaseId ? { sourceId: purchaseId } : null,
    purchaseId ? { "metadata.purchaseId": purchaseId } : null,
    purchaseId ? { "metadata.requestId": purchaseId } : null,
  ].filter(Boolean);
  if (ledgerOr.length) {
    const ledger = await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: { $in: [FEATURE_KEY, LEGACY_FEATURE_KEY] },
      "metadata.refundedForUnlockFailure": { $ne: true },
      $or: ledgerOr,
    }).lean();
    if (ledger) return { source: "monthly_ledger", evidenceId: String(ledger._id || "") };
  }
  const historyOr = [
    isObjectId(transactionId) ? { _id: transactionId } : null,
    purchaseId ? { "metadata.purchaseId": purchaseId } : null,
    purchaseId ? { "metadata.requestId": purchaseId } : null,
  ].filter(Boolean);
  if (historyOr.length) {
    const history = await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: { $in: [FEATURE_KEY, LEGACY_FEATURE_KEY] },
      "metadata.accessType": "membership_credit",
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      $or: historyOr,
    }).lean();
    if (history) return { source: "monthly_history", evidenceId: String(history._id || "") };
  }
  return null;
}

async function verifyPassEvidence(env, auth, ctx = {}) {
  const requestId = firstClean(ctx.accessGrant.requestId, ctx.consume.requestId, ctx.payload.requestId, ctx.accessGrant.purchaseId, ctx.consume.purchaseId);
  const evidenceId = firstClean(ctx.accessGrant.evidenceId, ctx.accessGrant.purchaseId, ctx.consume.transactionId);
  await connectDb(env);
  const historyOr = [
    isObjectId(evidenceId) ? { _id: evidenceId } : null,
    requestId ? { "metadata.requestId": requestId } : null,
    requestId ? { "metadata.purchaseId": requestId } : null,
  ].filter(Boolean);
  if (!historyOr.length) return null;
  const history = await PointHistory.findOne({
    userId: auth.userId,
    kind: "deduct",
    featureKey: { $in: [FEATURE_KEY, LEGACY_FEATURE_KEY] },
    "metadata.accessMethod": { $in: ["PASS", "FAMILY"] },
    $or: historyOr,
  }).lean();
  return history ? { source: "pass_history", evidenceId: String(history._id || "") } : null;
}

async function verifyNamingAccess(env, auth, body = {}, inputHash = "") {
  const ctx = unwrapAccessContext(body);
  const paymentId = firstClean(
    body.paymentId,
    body.merchantUid,
    ctx.accessGrant.merchantUid,
    ctx.accessGrant.paymentId,
    ctx.payment.merchantUid,
    ctx.payment.paymentId,
  );
  if (paymentId) {
    const payment = await findPaymentForUser(env, auth, paymentId);
    verifyPaymentShape(payment, inputHash);
    return {
      accessMethod: "single",
      accessType: "single_purchase",
      evidenceId: String(payment.merchantUid || payment._id || ""),
      paymentId: String(payment.merchantUid || ""),
      requestId: String(payment.requestId || payment.merchantUid || ""),
      profileId: "default",
      payment,
      raw: ctx,
    };
  }

  const featureKey = readContextFeatureKey(ctx, body);
  if (featureKey && !ALLOWED_FEATURE_KEYS.has(featureKey)) {
    throw createHttpError(400, "작명 프롬프트 결제 권한이 아닙니다.", { code: "ACCESS_PRODUCT_MISMATCH", featureKey });
  }
  const contextHash = readContextInputHash(ctx, body);
  if (inputHash && contextHash && contextHash !== inputHash) {
    throw createHttpError(409, "입력값이 바뀌면 새 결제가 필요합니다.", { code: "INPUT_HASH_MISMATCH" });
  }

  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env });
  if (!decision.allowed) {
    throw createHttpError(402, "결제 또는 이용권 확인 후에만 프롬프트를 생성할 수 있습니다.", {
      code: "NAMING_ACCESS_REQUIRED",
      reason: decision.reason,
    });
  }

  const accessType = readContextAccessType(ctx, body);
  const accessMethod = readContextAccessMethod(ctx, body);
  const method = normalizeExecutionAccessMethod(accessType, accessMethod, decision);
  if (method === "single") {
    throw createHttpError(402, "단건 결제는 결제 ID 확인 후에만 프롬프트를 생성할 수 있습니다.", { code: "PAYMENT_ID_REQUIRED" });
  }
  let evidence = null;
  if (isMonthlyAccess(accessType, accessMethod, decision)) {
    evidence = await verifyMonthlyEvidence(env, auth, ctx);
  } else if (isPassAccess(accessType, accessMethod, decision)) {
    evidence = await verifyPassEvidence(env, auth, ctx);
  }

  const fallbackEvidence = readContextEvidenceId(ctx, body) || `${method}:${auth.userId}:${inputHash}`;
  return {
    accessMethod: method,
    accessType: accessType || method,
    evidenceId: evidence?.evidenceId || fallbackEvidence,
    paymentId: "",
    requestId: firstClean(ctx.accessGrant.requestId, ctx.consume.requestId, ctx.payload.requestId, fallbackEvidence),
    profileId: firstClean(ctx.accessGrant.profileId, ctx.consume.profileId, ctx.payload.profileId, "default"),
    decision,
    raw: ctx,
    evidence,
  };
}

function buildExecutionId(auth, inputHash, access = {}) {
  const seed = firstClean(access.paymentId, access.evidenceId, access.requestId, inputHash);
  return `naming-prompt:${auth.userId}:${inputHash.slice(0, 16)}:${seed}`.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 160);
}

function serializeExecutionResult(record) {
  const namingPrompt = record?.result?.namingPrompt || record?.result || null;
  if (!namingPrompt?.generatedPrompt) return null;
  return {
    id: String(record.executionId || record._id || ""),
    paymentId: String(record.paymentId || ""),
    inputHash: clean(namingPrompt.inputHash, 160),
    generatedPrompt: String(namingPrompt.generatedPrompt || ""),
    inputSnapshot: namingPrompt.inputSnapshot || null,
    sajuSnapshot: namingPrompt.sajuSnapshot || null,
    generatedAt: namingPrompt.generatedAt || record.completedAt || null,
    paidAt: namingPrompt.paidAt || record.consumedAt || record.createdAt || null,
    accessMethod: String(record.accessMethod || ""),
  };
}

function serializeResult(payment) {
  const namingPrompt = payment?.pricingSnapshot?.namingPrompt || null;
  if (!namingPrompt?.generatedPrompt) return null;
  return {
    id: String(payment.merchantUid || payment._id || ""),
    paymentId: String(payment.merchantUid || ""),
    inputHash: clean(namingPrompt.inputHash, 160),
    generatedPrompt: String(namingPrompt.generatedPrompt || ""),
    inputSnapshot: namingPrompt.inputSnapshot || null,
    sajuSnapshot: namingPrompt.sajuSnapshot || null,
    generatedAt: namingPrompt.generatedAt || null,
    paidAt: payment.paidAt || null,
  };
}

async function findExecutionResultForUser(env, auth, id) {
  await connectDb(env);
  const normalized = clean(id, 180);
  if (!normalized) return null;
  const record = await PaidExecutionRecord.findOne({
    userId: String(auth.userId || ""),
    featureId: FEATURE_KEY,
    $or: [
      { executionId: normalized },
      { paymentId: normalized },
      { orderId: normalized },
      { requestId: normalized },
      { idempotencyKey: normalized },
    ],
  }).lean();
  return record ? serializeExecutionResult(record) : null;
}

async function upsertExecutionRecord(env, auth, access, inputHash, input, sajuSnapshot, generatedPrompt, generatedAt) {
  await connectDb(env);
  const executionId = buildExecutionId(auth, inputHash, access);
  const result = {
    namingPrompt: {
      version: RESULT_VERSION,
      productType: PRODUCT_TYPE,
      inputHash,
      inputSnapshot: input,
      sajuSnapshot,
      generatedPrompt,
      generatedAt: generatedAt.toISOString(),
      paidAt: generatedAt.toISOString(),
      accessMethod: access.accessMethod,
      evidenceId: access.evidenceId,
    },
  };
  const record = await PaidExecutionRecord.findOneAndUpdate(
    { executionId },
    {
      $setOnInsert: {
        executionId,
        requestId: clean(access.requestId || access.evidenceId || executionId, 160),
        userId: String(auth.userId || ""),
        featureId: FEATURE_KEY,
        profileId: clean(access.profileId || "default", 120) || "default",
        accessMode: "per_use",
        accessMethod: access.accessMethod || "single",
        amountCoins: COIN_PRICE,
        amountKRW: access.accessMethod === "single" ? AMOUNT_KRW : 0,
        monthlyDeductedAmount: access.accessMethod === "monthly" ? COIN_PRICE : 0,
        paymentId: clean(access.paymentId, 160),
        orderId: clean(access.evidenceId, 160),
        consumedAt: generatedAt,
        idempotencyKey: `${FEATURE_KEY}:${auth.userId}:${inputHash}:${clean(access.evidenceId || access.paymentId || access.requestId, 80)}`.slice(0, 180),
      },
      $set: {
        status: "completed",
        completedAt: generatedAt,
        result,
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return record;
}

async function handleCheckout(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeInput(body.input || body);
  validateInput(input);
  const sajuEvidence = await resolveSajuEvidence(input, body.sajuEvidence, body.sajuEvidenceHash);
  const inputHash = await buildNamingOrderHash(input, sajuEvidence.evidenceHash);
  return json({
    ok: true,
    productType: PRODUCT_TYPE,
    featureKey: FEATURE_KEY,
    amount: AMOUNT_KRW,
    currency: CURRENCY,
    coinPrice: COIN_PRICE,
    membershipCreditCost: calculateMembershipCreditCost(COIN_PRICE),
    inputHash,
    sajuEvidenceHash: sajuEvidence.evidenceHash,
    passEligible: true,
    subscriptionEligible: true,
    monthlyPassEligible: true,
    singlePaymentOnly: false,
    userId: String(auth.userId || ""),
    checkoutPayload: buildCheckoutPayload(inputHash, sajuEvidence.evidenceHash),
  });
}

async function handleVerifyPayment(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const inputHash = clean(body.inputHash, 160);
  const access = await verifyNamingAccess(env, auth, body, inputHash);
  return json({
    ok: true,
    productType: PRODUCT_TYPE,
    featureKey: FEATURE_KEY,
    amount: AMOUNT_KRW,
    currency: CURRENCY,
    paymentId: access.paymentId || "",
    accessMethod: access.accessMethod,
    accessType: access.accessType,
    evidenceId: access.evidenceId,
    paidAt: access.payment?.paidAt || null,
  });
}

async function handleGenerate(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeInput(body.input || {});
  validateInput(input);
  const sajuEvidence = await resolveSajuEvidence(input, body.sajuEvidence, body.sajuEvidenceHash);
  const expectedInputHash = await buildNamingOrderHash(input, sajuEvidence.evidenceHash);
  const inputHash = clean(body.inputHash, 160) || expectedInputHash;
  if (inputHash !== expectedInputHash) {
    throw createHttpError(409, "입력값과 사주 계산 기준이 결제 전 스냅샷과 일치하지 않습니다.", { code: "INPUT_HASH_MISMATCH" });
  }
  const access = await verifyNamingAccess(env, auth, body, inputHash);

  const payment = access.payment || null;
  const existing = payment ? serializeResult(payment) : null;
  if (existing) {
    if (existing.inputHash !== inputHash) {
      throw createHttpError(409, "입력값이 바뀌면 새 결제가 필요합니다.", { code: "INPUT_HASH_MISMATCH" });
    }
    return json({ ok: true, idempotent: true, result: existing });
  }

  const executionId = buildExecutionId(auth, inputHash, access);
  const existingExecution = await findExecutionResultForUser(env, auth, executionId);
  if (existingExecution) {
    if (existingExecution.inputHash !== inputHash) {
      throw createHttpError(409, "입력값이 바뀌면 새 결제가 필요합니다.", { code: "INPUT_HASH_MISMATCH" });
    }
    return json({ ok: true, idempotent: true, result: existingExecution });
  }

  const sajuSnapshot = buildSajuContext(input, sajuEvidence.evidence, sajuEvidence.evidenceHash);
  const generatedPrompt = buildGeneratedPrompt(input, sajuSnapshot);
  const generatedAt = new Date();
  if (payment?._id) {
    await Payment.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          "pricingSnapshot.namingPrompt": {
            version: RESULT_VERSION,
            productType: PRODUCT_TYPE,
            inputHash,
            sajuEvidenceHash: sajuEvidence.evidenceHash,
            inputSnapshot: input,
            sajuSnapshot,
            generatedPrompt,
            generatedAt: generatedAt.toISOString(),
          },
        },
      },
      { returnDocument: "after" },
    ).lean();
  }
  const execution = await upsertExecutionRecord(env, auth, access, inputHash, input, sajuSnapshot, generatedPrompt, generatedAt);

  return json({
    ok: true,
    idempotent: false,
    result: serializeExecutionResult(execution),
  }, { status: 201 });
}

async function handleResult(request, env, id) {
  const auth = await requireAuth(request, env);
  let result = await findExecutionResultForUser(env, auth, id);
  if (!result) {
    const payment = await findPaymentForUser(env, auth, id);
    verifyPaymentShape(payment);
    result = serializeResult(payment);
  }
  if (!result) throw createHttpError(404, "생성된 작명 프롬프트를 찾을 수 없습니다.", { code: "RESULT_NOT_FOUND" });
  return json({ ok: true, result });
}

export async function handleNamingPromptRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/naming-prompt");
    if (method === "POST" && path === "/checkout") return handleCheckout(request, env);
    if (method === "POST" && path === "/verify-payment") return handleVerifyPayment(request, env);
    if (method === "POST" && path === "/generate") return handleGenerate(request, env);
    if (method === "GET" && path.startsWith("/result/")) return handleResult(request, env, decodeURIComponent(path.slice("/result/".length)));
    if (["POST", "GET"].includes(method)) {
      return json({ ok: false, message: "Naming prompt route not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: { route: "naming-prompt", method: request.method },
    });
  }
}
