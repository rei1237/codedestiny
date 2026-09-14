import { requireAuth } from "../lib/auth.js";
import { generateNamingWave, namingChaptersText, namingReportComplete, confirmedEmptyNamingFailure } from "../lib/naming-report-delivery.js";
import { getAmbientAiLocale } from "../lib/ai-locale-context.js";
import { randomUUID } from "node:crypto";
import { isPaidResultRevoked } from "../lib/paid-result-revocation.js";
import { connectDb, withMongoRetry } from "../lib/db.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory } from "../lib/models.js";
import { findMoonstoneSpendEvidence } from "../lib/moonstone-spend-proof.js";
import { restoreMonthlyCreditLot } from "../lib/monthly-credit-store.js";
import { NAMING_DEFAULT_LOCALE, resolveNamingLocaleProfile } from "../lib/naming-locale-profile.js";
import { labelElements, resolveNamingYongshin } from "../lib/saju-yongshin-policy.js";

const PRODUCT_TYPE = "naming_prompt";
const FEATURE_KEY = "premium-naming-prompt";
const LEGACY_FEATURE_KEY = "premium-naming-report";
const AMOUNT_KRW = 30000;
const COIN_PRICE = 300;
const CURRENCY = "KRW";
const RESULT_VERSION = "naming-result-v20260712";
const NAMING_LLM_ERROR_MESSAGE = "작명 결과 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
const NAMING_GENERATING_MESSAGE = "작명 결과를 생성하고 있습니다";
const NAMING_GENERATION_FRESHNESS_MS = 120000;
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

const GENDER_LABELS = Object.freeze({
  M: "남성",
  F: "여성",
  OTHER: "기타/미지정",
});

function resolveGenderLabel(gender) {
  const key = clean(gender, 20).toUpperCase();
  return GENDER_LABELS[key] || clean(gender, 20) || "미입력";
}

/** buildUsefulGods 가 내는 강약 enum 을 프롬프트에 그대로 넣으면 "weak" 같은 영문이 노출된다. */
const STRENGTH_LABELS = Object.freeze({
  strong: "신강(身强) 후보 — 일간을 덜어 내는 방향으로 용신을 잡는다",
  weak: "신약(身弱) 후보 — 일간을 돕는 방향으로 용신을 잡는다",
  balanced: "중화(中和)에 가까움 — 조후와 통관을 우선해 용신을 잡는다",
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
  if (!rawEvidence || typeof rawEvidence !== "object" || Array.isArray(rawEvidence)) {
    // 메인 셸 사주 엔진 스냅샷을 미리 계산해 오지 않은 클라이언트(예: naming-ai Next.js 페이지)는
    // buildSajuContext()의 기존 서버 자체 계산 폴백(buildFallbackSajuContext)을 그대로 쓴다.
    return { evidence: null, evidenceHash: "", baseInputHash: await buildInputHash(input) };
  }
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
      hourPillarTimePolicy: "LOCAL_MEAN_TIME",
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
    // buildSajuProfile 은 억부만 본다. 조후 축을 얹어 최종 용신을 확정한다 — 이걸 안 하면
    // 아래 "용신 판단 근거" 블록의 조후용신·억부기신 등 4줄이 "메인 사주 계산 기준 확인"이라는
    // 내부 문구로 그대로 프롬프트에 나간다(무료 초안도 같은 모듈을 써서 축이 일치한다).
    const verdict = resolveNamingYongshin(profile);
    const lacking = asElementLabelList(verdict.lacking);
    const excessive = asElementLabelList(verdict.excessive);
    const yong = asElementLabelList(useful.yong || []);
    const hee = asElementLabelList(verdict.heesin);
    const gi = asElementLabelList(verdict.eokbuKijishin);

    return {
      source: "buildSajuProfile",
      engineVersion: "destiny-bias-engine + saju-yongshin-policy",
      eokbuYongshin: labelElements(verdict.eokbuYongshin, "억부용신 판단 보류"),
      johuYongshin: labelElements(verdict.johuYongshin, "조후 보정 불필요(한난조습 균형)"),
      finalYongshin: labelElements(verdict.finalYongshin, "용신 후보 재검토 필요"),
      eokbuKijishin: labelElements(verdict.eokbuKijishin, "억부기신 판단 보류"),
      johuKijishin: labelElements(verdict.johuKijishin, "조후상 주의 오행 없음"),
      finalKijishin: labelElements(verdict.finalKijishin, "기신 후보 재검토 필요"),
      jongAnalysis: verdict.jongSignal,
      yearPillar: pillarText(profile.pillars?.year),
      monthPillar: pillarText(profile.pillars?.month),
      dayPillar: pillarText(profile.pillars?.day),
      hourPillar: input.birthTimeUnknown ? "출생시간 미상으로 시주 미확정" : pillarText(profile.pillars?.hour),
      dayMaster: `${clean(profile.dayMaster?.stem || "")}${profile.dayMaster?.elementKo ? `(${profile.dayMaster.elementKo})` : ""}` || "미상",
      monthCommand: pillarText(profile.pillars?.month?.branch ? { ganji: profile.pillars.month.branch } : null),
      fiveElementBalance: elementBalanceText(profile.fiveElements),
      tenGodBalance: tenGodBalanceText(profile.tenGods),
      strengthAnalysis: clean(STRENGTH_LABELS[useful.strength] || "월령·통근·투간·오행 균형을 함께 보아 신강/신약 후보를 재검토", 200),
      temperatureBalance: clean(
        `${verdict.johu.season}생 · ${verdict.johu.temperatureLabel} · ${verdict.johu.moistLabel}`,
        200,
      ),
      usefulGodCandidates: formatList(yong, "월령·일간·조후·통근·투간 검토 후 후보 제시"),
      supportiveGodCandidates: formatList(hee, "용신 후보를 돕는 희신 후보 제시"),
      unfavorableGodCandidates: formatList(gi, "과다하거나 균형을 해치는 기신 후보 제시"),
      recommendedNameElements: labelElements(verdict.nameElements, formatList(lacking, "사주 구조 검토 후 보완 오행 제시")),
      avoidNameElements: labelElements(verdict.avoidElements, formatList(excessive, "과다 오행과 기신 후보를 비교해 제시")),
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

// 🔴 테스트 전용 export 가 아니다 — ko 프롬프트가 바뀌지 않았음을 골든 스냅샷으로 증명하려면
//    실제로 렌더해 봐야 한다. 정적 grep 으로는 조립 결과가 같은지 알 수 없다.
export function buildGeneratedPrompt(input, saju, locale = NAMING_DEFAULT_LOCALE) {
  const profile = resolveNamingLocaleProfile(locale);
  const hasSeedNames = Boolean(input.currentName || input.desiredNames.length || input.desiredSyllables.length);
  const preferenceContext = buildPreferenceContext(input);
  const calendarLabel = input.calendarType === "lunar" || input.calendarType === "lunar_leap" ? "음력" : "양력";
  const genderLabel = resolveGenderLabel(input.gender);
  const genderKey = clean(input.gender, 20).toUpperCase();

  const genderNote = genderKey === "M" || genderKey === "F"
    ? `2. **성별 어울림 우선**: 이 아이는 ${genderLabel}입니다. 모든 ${profile.genderScope}는 ${profile.society}에서 ${genderLabel}에게 자연스럽게 어울리는 것이어야 합니다. 사용자가 입력한 분위기·이미지 선호가 성별과 충돌하면 성별 어울림을 우선하고 왜 그렇게 조정했는지 설명하세요. ${profile.genderAvoid}`
    : "2. **성별 어울림 우선**: 성별이 기타/미지정으로 입력되었습니다. 특정 성별에 강하게 치우치지 않는 이름을 우선 고려하되, 사용자가 입력한 분위기·이미지 선호를 최대한 반영하세요.";

  const timeNote = input.birthTimeUnknown
    ? "\n9. **출생시간 미상**: 시주(時柱)가 확정되지 않았으므로, 시주에 크게 의존하는 판단(시주 천간의 통근 여부 등)은 \"시간 확인 시 재검토 권장\"으로 유보하고, 년·월·일주 기반 분석은 그대로 진행하세요."
    : "";
  // 번호 없는 bullet 로 붙이면 위 원칙 목록의 번호 매김이 끊긴다 — 원칙 하나로 번호를 이어 붙인다.
  // 🔴 획수 수리를 안 쓰는 문화권(라틴 계열)에서는 이 원칙 자체가 성립하지 않는다.
  const hanjaNote = profile.usesStrokeNumerology
    && (input.desiredNames.some((item) => item.hangul && item.hanjaCandidates.length === 0) || (input.currentName && !input.useHanja))
    ? "\n11. **한글만 입력된 후보**: 한자 획수와 수리 풀이는 한자 조합이 확정된 뒤에 최종 판단하고, 그 전 단계에서는 소리오행과 어감 위주로 평가하세요."
    : "";
  // 사주 계산이 실패한 2차 폴백에서는 명식 자리에 "계산 실패" 문자열이 들어간다. 그대로 두면
  // 모델이 그 문자열을 명식으로 읽는다 — 무엇을 해야 하는지 명시한다.
  const sajuFailureNote = String(saju.source || "") === "input-fallback"
    ? "\n12. 🔴 **사주 자동 계산 실패**: 아래 [사주 계산 결과]의 명식 칸이 \"계산 실패\"로 채워져 있습니다. 그 문자열을 명식으로 읽거나 직접 명식·용신을 계산하지 마세요. 계산 근거 확인이 필요함을 밝히고, 확인되지 않은 기둥·십성·용신은 해설하지 마세요."
    : "";
  const seedNote = hasSeedNames
    ? "\n10. **사용자 후보 이름 있음**: 아래 [사용자 이름 선호]의 후보 이름들을 4장에서 먼저 평가한 뒤, 더 좋은 이름 3~5개를 새로 제안해 함께 다루세요. 무료 입력 단계의 초안이 있었다면 참고안으로만 보고 반드시 사주와 작명 원칙으로 다시 검토하세요."
    : "\n10. **신규 제안 모드**: 사용자가 후보 이름을 제시하지 않았으므로, 아래 사주 분석과 선호를 바탕으로 최적의 이름 5~7개를 새로 제안하세요.";

  const candidateChapterNote = hasSeedNames
    ? `사용자가 제시한 후보 이름을 먼저 다루고, 이어서 새로 제안하는 이름을 다루세요. 각 이름을 ${profile.candidateAxes}으로 평가하세요.`
    : `새로 제안하는 이름 5~7개를 하나씩 다루세요. 각 이름을 ${profile.candidateAxes}으로 평가하세요.`;

  return `${profile.persona} 당신에게 이름이란 한 사람의 운명을 여는 첫 번째 열쇠이며, 사주의 부족한 기운을 채워주는 가장 일상적이면서도 강력한 처방입니다. 지금부터 한 아이(또는 새 출발을 준비하는 한 사람)를 위해, 부모에게 직접 건네는 한 권의 "작명첩"을 씁니다.
${profile.promptContract}
## 핵심 원칙 — 반드시 지킬 것

1. **용신(用神) 최우선**: 이름의 모든 요소(${profile.nameLayers})는 아래 사주 분석에서 도출된 용신·희신 오행을 보완하는 방향으로 선택하세요. ${profile.layerTiebreak}
${genderNote}
3. **용신 판단은 종합적으로**: 월령(계절)·일간 강약·신강/신약·조후·통근·투간을 모두 고려해 용신을 확인하세요. 아래 계산된 용신 후보는 수정하지 마세요. 억부·조후 해석이 다르면 각각의 적용 조건과 한계를 설명하세요.
${profile.legalCharRule}
${profile.modernBalanceRule}
${profile.uncertaintyRule}
7. **후보를 무조건 부정하지 마세요**: 사용자가 제시한 후보는 정성적으로 평가하되, 문제가 있으면 구체적인 대안과 함께 설명하세요.
8. **사람의 말로 쓰세요**: "오행 균형이 양호합니다" 같은 기계적 요약이 아니라, 작명가가 부모 앞에서 직접 설명하듯 따뜻한 존댓말로, 단정할 것은 단정하고 권할 것은 분명히 권하세요. **마크다운 표(|)는 절대 쓰지 마세요** — 모든 비교는 소제목과 목록, 문장으로 풀어 쓰세요.${timeNote}${seedNote}${hanjaNote}${sajuFailureNote}

---

## [사용자 정보]
- 성별: ${genderLabel}
- 성씨: ${input.familyName}
- 생년월일: ${input.birthDate} (${calendarLabel}${input.isLeapMonth ? ", 윤달" : ""})
- 출생시간: ${input.birthTimeUnknown ? "미상 (시주 미확정)" : input.birthTime}
- 출생지/시간대: ${input.birthPlace} / ${input.timezone}
- 이름 글자 수: ${input.nameLength}자 (성씨 제외)
- 원하는 이름 방향: ${input.desiredType || "미입력"}

---

## [사주 계산 결과]
> 아래는 사주 엔진(${saju.source}${saju.engineVersion ? ` / ${saju.engineVersion}` : ""})이 계산한 결과입니다. 이 계산값을 변경하지 않고 근거와 적용 조건을 설명하여 작명에 반영하세요.
> 사주 스냅샷 해시: ${saju.sajuEvidenceHash || "보조 계산 기준"}

### 사주 명식 (四柱 命式)
- 년주(年柱): ${saju.yearPillar}
- 월주(月柱): ${saju.monthPillar}
- 일주(日柱): ${saju.dayPillar}
- 시주(時柱): ${saju.hourPillar}
- 일간(日干): ${saju.dayMaster}
- 월령(月令): ${saju.monthCommand}

### 오행·십성 분포
- 오행 분포: ${saju.fiveElementBalance}
- 십성 분포: ${saju.tenGodBalance}

### 신강/신약 · 조후
- 신강/신약 판단 후보: ${saju.strengthAnalysis}
- 조후 필요성: ${saju.temperatureBalance}

---

## [용신 판단 근거 — 검증 요청]
아래는 사주 엔진이 도출한 용신/기신 후보입니다. **계산값을 재계산하거나 수정하지 말고, 억부·조후의 적용 조건과 상충하는 해석의 한계를 설명하세요.**

- 억부용신 후보: ${saju.eokbuYongshin || "메인 사주 계산 기준 확인"}
- 조후용신 후보: ${saju.johuYongshin || "메인 사주 계산 기준 확인"}
- 최종 보정 용신: ${saju.finalYongshin || saju.usefulGodCandidates}
- 희신 후보: ${saju.supportiveGodCandidates}
- 억부기신 후보: ${saju.eokbuKijishin || "메인 사주 계산 기준 확인"}
- 조후기신 후보: ${saju.johuKijishin || "메인 사주 계산 기준 확인"}
- 최종 주의 오행: ${saju.finalKijishin || saju.unfavorableGodCandidates}
- 종격/가종격 검토: ${saju.jongAnalysis || "종격 특이 신호 없음"}
- 이름으로 보완하면 좋은 오행: ${saju.recommendedNameElements}
- 이름에서 피하면 좋은 오행: ${saju.avoidNameElements}

### 오행 적용 우선순위 (작명 시)
1. 용신·희신 오행을 이름에 담는다 (자원오행 > 소리오행 순으로 우선)
2. 조후가 필요하면 조후용신도 반영한다
3. 과다한 오행·기신 오행은 피한다
4. 위 조건을 충족하는 범위에서 수리(획수) 길흉을 최적화한다

---

${profile.criteriaHeading}

${profile.criteriaBody(input)}

---

## [사용자 이름 선호]
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

---

## [출력 형식 — 작명첩 8장]
아래 8개 장을 정확히 이 헤딩(## 숫자. 제목)으로 쓰세요. 한 장 한 장이 충실해야 합니다(장마다 최소 3문단 이상, 4장은 이름마다 충분히). 표는 금지, 소제목(###)과 목록·문장만 사용하세요.

**전체 분량은 공백 제외 ${NAMING_PROMPT_TARGET_MIN_CHARS.toLocaleString("en-US")}자 이상 ${NAMING_MAX_TOTAL_CONTENT_CHARS.toLocaleString("en-US")}자 이하로 쓰세요.** 분량을 채우려고 같은 말을 반복하거나 원론적인 설명을 늘리지 마세요 — 이 사주와 이 이름 후보에만 해당하는 구체적인 근거로 채우세요.

## 1. 작명가의 총평
(이 사주를 처음 펼쳐 본 작명가의 첫인상. 어떤 기운을 타고났고, 이름이 무엇을 채워줘야 하는지를 부모에게 말하듯 서너 문단으로.)

## 2. 사주 풀이와 용신 검증
(명식·오행 분포·신강약·조후를 풀고, 위 용신/기신 후보를 계산값 그대로 유지하면서 판단 근거와 적용 조건을 함께. 목록 활용.)

## 3. 이 아이의 작명 원칙
(이 사주에 맞춘 구체적 기준 — 담을 오행과 피할 오행, ${profile.principleAxes}, 성별·선호 반영 방침.)

## 4. 이름 후보 상세
(${candidateChapterNote}
각 이름은 ${profile.candidateHeading} 소제목으로 시작하고, 아래 항목을 목록으로 짚은 뒤 종합평을 문장으로 쓰세요:
${profile.candidateItems})

## 5. 세 이름을 나란히 놓고
(TOP 3를 골라 서로 비교. 어떤 아이로 자라길 바라는지에 따라 어느 이름이 맞는지, 각각의 결이 어떻게 다른지 문장으로.)

## 6. 최종 추천
(최종 1개를 확정하고, 작명가가 직접 말하듯 확신 있게. 좋은 예: ${profile.finalExample} 나쁜 예: "오행 균형이 좋고 수리가 길해서 추천합니다.")

## 7. 피해야 할 이름
(이 사주에서 특히 피할 ${profile.avoidAxes}과 그 이유. 실제 예시 이름 두어 개와 함께.)

## 8. 이름을 올리기 전에
${profile.registrationChapter}

${profile.cardBlockContract}`;
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
  // requestId·idempotencyKey 도 함께 본다 — 코인게이트가 단건 성공을 돌려줄 때 살아남는 식별자가
  // merchantUid 하나로 정해져 있지 않다(경로에 따라 requestId 가 오기도 한다). 다른 유료 라우트의
  // 정본 패턴(worker/routes/astrology-ai.js hasPaidPayment)이 이미 이 4개를 모두 본다.
  const payment = await withMongoRetry(env, () => Payment.findOne({
    userId: auth.userId,
    $or: [
      { merchantUid: normalized },
      { impUid: normalized },
      { requestId: normalized },
      { idempotencyKey: normalized },
      { _id: /^[a-f\d]{24}$/i.test(normalized) ? normalized : undefined },
    ].filter((item) => Object.values(item)[0] !== undefined),
  }).sort({ paidAt: -1, updatedAt: -1, createdAt: -1 }).lean());
  if (!payment) throw createHttpError(404, "결제 기록을 찾을 수 없습니다.", { code: "PAYMENT_NOT_FOUND" });
  return payment;
}

/**
 * 이 입력값으로 이미 완료된 단건 결제를 찾는다.
 *
 * 🔴 단건 결제는 PointHistory 차감 기록을 남기지 않는다(포인트가 아니라 카드로 결제하므로).
 * 그래서 verifyNamingChargeEvidence 로는 절대 잡히지 않고, 식별자가 왕복 중 하나도 살아남지
 * 못하면 결제를 마친 사용자가 canAccessPaidFeature 로 떨어져 402 를 받는다 — 돈만 나간다.
 * Payment 문서를 reportId(입력 해시)로 직접 찾아 그 구멍을 막는다.
 *
 * 입력 해시에 묶여 있으므로 다른 입력으로 재사용할 수 없다. 같은 입력 재생성은 기존
 * PaidExecutionRecord 멱등이 그대로 처리한다(paymentId 경로와 동일한 성질).
 */
async function findSettledNamingPayment(env, auth, inputHash) {
  const hash = clean(inputHash, 160);
  if (!hash) return null;
  await connectDb(env);
  return withMongoRetry(env, () => Payment.findOne({
    userId: auth.userId,
    paymentType: "digital_content",
    featureKey: { $in: [FEATURE_KEY, LEGACY_FEATURE_KEY] },
    status: { $in: Array.from(PAYMENT_SUCCESS_STATUSES) },
    $or: [
      { reportId: hash },
      { "pricingSnapshot.reportId": hash },
      { "pricingSnapshot.contentId": hash },
      { "pricingSnapshot.contentKey": hash },
    ],
  }).sort({ paidAt: -1, updatedAt: -1, createdAt: -1 }).lean());
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
  // 월정석 증빙 정본은 worker/lib/moonstone-spend-proof.js 하나다(미정산 예약행 배제·구 원장 호환 포함).
  const monthlyEvidence = await withMongoRetry(env, () => findMoonstoneSpendEvidence(env, {
    userId: auth.userId,
    featureKeys: [FEATURE_KEY, LEGACY_FEATURE_KEY],
    tokens: [purchaseId, ledgerId, transactionId],
  }));
  if (monthlyEvidence) return { source: "monthly_ledger", evidenceId: String(monthlyEvidence.ledgerId || "") };
  const historyOr = [
    isObjectId(transactionId) ? { _id: transactionId } : null,
    purchaseId ? { "metadata.purchaseId": purchaseId } : null,
    purchaseId ? { "metadata.requestId": purchaseId } : null,
  ].filter(Boolean);
  if (historyOr.length) {
    const history = await withMongoRetry(env, () => PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: { $in: [FEATURE_KEY, LEGACY_FEATURE_KEY] },
      "metadata.accessType": "membership_credit",
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      $or: historyOr,
    }).lean());
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
  const history = await withMongoRetry(env, () => PointHistory.findOne({
    userId: auth.userId,
    kind: "deduct",
    featureKey: { $in: [FEATURE_KEY, LEGACY_FEATURE_KEY] },
    "metadata.accessMethod": { $in: ["PASS", "FAMILY"] },
    $or: historyOr,
  }).lean());
  return history ? { source: "pass_history", evidenceId: String(history._id || "") } : null;
}

/** 증빙 후보 id 들을 정리·중복 제거한다(빈 값 제거). */
function uniqueCleanIds(values) {
  const seen = new Set();
  for (const value of values) {
    const id = clean(value, 160);
    if (id) seen.add(id);
  }
  return Array.from(seen);
}

/**
 * 회당 결제 차감 증빙을 직접 확인한다.
 *
 * 🔴 이게 왜 필요한가: `canAccessPaidFeature` 는 **지속 엔티틀먼트(이용권·영구 해금)만** 판정하고
 * 회당 결제(월정석·코인 차감)는 판정하지 않아 **항상 PAYMENT_REQUIRED 를 준다**
 * (같은 설계 설명이 worker/routes/dream.js 의 회당 결제 분기 주석에도 있다).
 * 작명은 PER_USE 상품이라, 이걸 관문으로 세워 두면 **월정석·코인이 이미 차감된 사용자가 402 로 막힌다**
 * — 돈만 나가고 결과는 못 받는다. 그래서 차감이 실제로 일어났는지를 여기서 먼저 본다.
 *
 * 중첩 검사가 아니다: 아래 canAccessPaidFeature 는 "이용권 보유"를, 이 함수는 "차감 발생"을 본다.
 * 서로 다른 근거이며, 증빙을 찾으면 곧바로 반환해 뒤 검사를 돌리지 않는다.
 */
async function verifyNamingChargeEvidence(env, auth, ctx, body, inputHash = "") {
  const ids = uniqueCleanIds([
    readContextEvidenceId(ctx, body),
    ctx.consume.transactionId,
    ctx.consume.purchaseId,
    ctx.consume.requestId,
    ctx.accessGrant.evidenceId,
    ctx.accessGrant.purchaseId,
    ctx.accessGrant.requestId,
    ctx.payload.transactionId,
    ctx.payload.purchaseId,
    ctx.payload.requestId,
    body.requestId,
  ]);
  if (!ids.length) return null;

  const objectIds = ids.filter((id) => isObjectId(id));
  const clauses = [
    objectIds.length ? { _id: { $in: objectIds } } : null,
    { "metadata.requestId": { $in: ids } },
    { "metadata.purchaseId": { $in: ids } },
    { "metadata.transactionId": { $in: ids } },
  ].filter(Boolean);

  await connectDb(env);
  const history = await withMongoRetry(env, () => PointHistory.findOne({
    userId: auth.userId,
    kind: "deduct",
    featureKey: { $in: [FEATURE_KEY, LEGACY_FEATURE_KEY] },
    // 실패로 환불된 차감은 증빙이 아니다.
    "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
    "metadata.monthlyCreditRefundedForLedgerFailure": { $ne: true },
    $or: clauses,
  }).sort({ createdAt: -1 }).lean());
  if (!history) return null;

  // 결제를 입력값에 묶는다 — 한 번 결제하고 입력만 바꿔 계속 생성하는 것을 막는다.
  // 기록에 reportId 가 없으면(구 기록) verifyPaymentShape 과 같은 관용으로 통과시킨다.
  const recordedHash = clean(history.metadata?.reportId, 160);
  if (inputHash && recordedHash && recordedHash !== inputHash) {
    throw createHttpError(409, "입력값이 바뀌면 새 결제가 필요합니다.", { code: "INPUT_HASH_MISMATCH" });
  }

  const metadata = history.metadata || {};
  return {
    source: "point_history_charge",
    evidenceId: String(history._id || ""),
    accessType: clean(metadata.accessType, 80),
    accessMethod: clean(metadata.accessMethod || metadata.paymentMethod, 80),
    requestId: clean(metadata.requestId || metadata.purchaseId, 120),
    profileId: clean(metadata.profileId || metadata.selectedProfileId, 80),
  };
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
  // paymentId 가 있다고 곧바로 단건으로 확정하면 안 된다 — 코인게이트 성공 응답은 이용권·월정석·
  // 코인에도 최상위 transactionId(=PointHistory/entitlement id)를 싣기 때문에, 그것을 paymentId 로
  // 넘겨받으면 Payment 문서가 없어 404 로 죽는다(월정석은 이미 차감된 뒤라 돈만 나간다).
  // 그래서 조회 실패(404)만 보류해 두고 아래 이용권/월정석 분기로 내려간다 — 거기서도 접근권이
  // 없으면 보류한 404 를 그대로 던져 진단 정확도를 잃지 않는다. 금액·상품·해시 불일치는 폴백 없이
  // 즉시 실패해야 하므로 그대로 통과시킨다.
  let pendingPaymentMiss = null;
  if (paymentId) {
    try {
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
    } catch (caught) {
      if (Number(caught?.status) !== 404) throw caught;
      pendingPaymentMiss = caught;
    }
  }

  const featureKey = readContextFeatureKey(ctx, body);
  if (featureKey && !ALLOWED_FEATURE_KEYS.has(featureKey)) {
    throw createHttpError(400, "작명 프롬프트 결제 권한이 아닙니다.", { code: "ACCESS_PRODUCT_MISMATCH", featureKey });
  }
  const contextHash = readContextInputHash(ctx, body);
  if (inputHash && contextHash && contextHash !== inputHash) {
    throw createHttpError(409, "입력값이 바뀌면 새 결제가 필요합니다.", { code: "INPUT_HASH_MISMATCH" });
  }

  // 🔴 이 입력값으로 이미 완료된 단건 결제가 있으면 그걸로 통과시킨다. 단건은 PointHistory 차감
  // 기록이 없어 아래 회당 결제 증빙으로는 잡히지 않고, 식별자가 왕복 중 유실되면 결제를 마친
  // 사용자가 402 를 받는다.
  const settledPayment = await findSettledNamingPayment(env, auth, inputHash);
  if (settledPayment) {
    verifyPaymentShape(settledPayment, inputHash);
    return {
      accessMethod: "single",
      accessType: "single_purchase",
      evidenceId: String(settledPayment.merchantUid || settledPayment._id || ""),
      paymentId: String(settledPayment.merchantUid || ""),
      requestId: String(settledPayment.requestId || settledPayment.merchantUid || ""),
      profileId: "default",
      payment: settledPayment,
      raw: ctx,
    };
  }

  // 🔴 회당 결제 차감 증빙을 먼저 본다. canAccessPaidFeature 는 지속 엔티틀먼트만 판정해서
  // 월정석·코인으로 이미 차감한 사용자에게도 PAYMENT_REQUIRED 를 주기 때문에, 이걸 뒤에 두면
  // 차감된 사용자가 402 로 막힌다(돈만 나감).
  const charge = await verifyNamingChargeEvidence(env, auth, ctx, body, inputHash);
  if (charge) {
    const chargeMethod = normalizeExecutionAccessMethod(
      charge.accessType || readContextAccessType(ctx, body),
      charge.accessMethod || readContextAccessMethod(ctx, body),
    );
    return {
      accessMethod: chargeMethod,
      accessType: charge.accessType || chargeMethod,
      evidenceId: charge.evidenceId,
      paymentId: "",
      requestId: charge.requestId || readContextEvidenceId(ctx, body) || charge.evidenceId,
      profileId: charge.profileId || "default",
      raw: ctx,
      evidence: charge,
    };
  }

  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, userDoc: auth.authUserDoc });
  if (!decision.allowed) {
    throw pendingPaymentMiss || createHttpError(402, "결제 또는 이용권 확인 후에만 프롬프트를 생성할 수 있습니다.", {
      code: "NAMING_ACCESS_REQUIRED",
      reason: decision.reason,
    });
  }

  const accessType = readContextAccessType(ctx, body);
  const accessMethod = readContextAccessMethod(ctx, body);
  const method = normalizeExecutionAccessMethod(accessType, accessMethod, decision);
  if (method === "single") {
    throw pendingPaymentMiss || createHttpError(402, "단건 결제는 결제 ID 확인 후에만 프롬프트를 생성할 수 있습니다.", { code: "PAYMENT_ID_REQUIRED" });
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

async function buildExecutionId(auth, inputHash, access = {}) {
  if (access.paymentId) {
    const granted = await PaidExecutionRecord.findOne({ userId: String(auth.userId),
      featureId: FEATURE_KEY, paymentId: String(access.paymentId),
    }).lean();
    if (granted) {
      if (["refunded", "cancelled"].includes(granted.status)
          || (granted.result?.namingPrompt?.inputHash && granted.result.namingPrompt.inputHash !== inputHash)) {
        throw createHttpError(409, "구매한 작명 회차와 입력이 일치하지 않습니다.", { code: "PURCHASE_RUN_MISMATCH" });
      }
      return granted.executionId;
    }
  }
  const seed = firstClean(access.paymentId, access.evidenceId, access.requestId, inputHash);
  return `naming-prompt:${auth.userId}:${inputHash.slice(0, 16)}:${seed}`.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 160);
}

function serializeExecutionResult(record) {
  const namingPrompt = record?.result?.namingPrompt || record?.result || null;
  // 구버전 작명 흐름은 generatedResult 없이 generatedPrompt(프롬프트 문자열)만 저장했다 —
  // 그 레코드가 null로 떨어지면 기존 구매자가 결제한 결과를 다시 못 본다. 프롬프트로 폴백 렌더.
  const generatedResult = String(namingPrompt?.generatedResult || (record?.status === "completed" ? namingPrompt?.generatedPrompt : "") || "");
  if (record?.status !== "completed") return null;
  if (!generatedResult) return null;
  return {
    id: String(record.executionId || record._id || ""),
    paymentId: String(record.paymentId || ""),
    inputHash: clean(namingPrompt.inputHash, 160),
    generatedPrompt: String(namingPrompt.generatedPrompt || ""),
    generatedResult,
    saved: record.status === "completed",
    chapters: namingPrompt.delivery?.chapters,
    completedChapters: Object.keys(namingPrompt.delivery?.chapters || {}),
    totalChapters: 8,
    nameCards: Array.isArray(namingPrompt.nameCards) ? namingPrompt.nameCards : [],
    finalPick: namingPrompt.finalPick || null,
    provider: clean(namingPrompt.provider, 40),
    model: clean(namingPrompt.model, 80),
    inputSnapshot: namingPrompt.inputSnapshot || null,
    sajuSnapshot: namingPrompt.sajuSnapshot || null,
    generatedAt: namingPrompt.generatedAt || record.completedAt || null,
    paidAt: namingPrompt.paidAt || record.consumedAt || record.createdAt || null,
    accessMethod: String(record.accessMethod || ""),
    status: String(record.status || ""),
  };
}

function serializeResult(payment) {
  const namingPrompt = payment?.pricingSnapshot?.namingPrompt || null;
  // 구버전 레코드(generatedPrompt만 존재) 재열람 보존 — serializeExecutionResult와 동일 폴백.
  const generatedResult = String(namingPrompt?.generatedResult || namingPrompt?.generatedPrompt || "");
  if (!generatedResult) return null;
  return {
    id: String(payment.merchantUid || payment._id || ""),
    paymentId: String(payment.merchantUid || ""),
    inputHash: clean(namingPrompt.inputHash, 160),
    generatedPrompt: String(namingPrompt.generatedPrompt || ""),
    generatedResult,
    nameCards: Array.isArray(namingPrompt.nameCards) ? namingPrompt.nameCards : [],
    finalPick: namingPrompt.finalPick || null,
    provider: clean(namingPrompt.provider, 40),
    model: clean(namingPrompt.model, 80),
    inputSnapshot: namingPrompt.inputSnapshot || null,
    sajuSnapshot: namingPrompt.sajuSnapshot || null,
    generatedAt: namingPrompt.generatedAt || null,
    paidAt: payment.paidAt || null,
  };
}

async function findExecutionRecordForUser(env, auth, id) {
  const normalized = clean(id, 180);
  if (!normalized) return null;
  try {
  await connectDb(env);
  return await withMongoRetry(env, () => PaidExecutionRecord.findOne({
    userId: String(auth.userId || ""),
    featureId: FEATURE_KEY,
    $or: [
      { executionId: normalized },
      { paymentId: normalized },
      { orderId: normalized },
      { requestId: normalized },
      { idempotencyKey: normalized },
    ],
  }).lean());
  } catch { throw namingStorageUnavailable(normalized); }
}

async function findExecutionResultForUser(env, auth, id) {
  const record = await findExecutionRecordForUser(env, auth, id);
  return record ? serializeExecutionResult(record) : null;
}

function buildExecutionBaseFields(auth, access, inputHash, executionId) {
  return {
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
    idempotencyKey: `${FEATURE_KEY}:${auth.userId}:${inputHash}:${clean(access.evidenceId || access.paymentId || access.requestId, 80)}`.slice(0, 180),
  };
}

// 결제 검증 성공 직후, LLM 호출 전에 "생성중"으로 먼저 선점한다(장애 복구·동시 재요청 dedup).
// love-secret-ai.js와 동일한 "동기 우선 실행 + 재진입만 202" 패턴.
async function beginNamingGeneration(env, auth, access, inputHash, input, sajuSnapshot, generatedPrompt, now, details = {}) {
  await connectDb(env);
  const executionId = await buildExecutionId(auth, inputHash, access);
  const owner = { executionId, userId: String(auth.userId) };
  const base = buildExecutionBaseFields(auth, access, inputHash, executionId);
  const lease = randomUUID();
  const seed = { ...details, version: RESULT_VERSION, productType: PRODUCT_TYPE, inputHash, inputSnapshot: input, sajuSnapshot,
    generatedPrompt, generatedResult: "", generatedAt: null, accessMethod: access.accessMethod, evidenceId: access.evidenceId, deliveryLease: lease };
  const before = await PaidExecutionRecord.findOneAndUpdate(owner, { $setOnInsert: {
    ...base, createdAt: now, updatedAt: now, consumedAt: null, status: "generating", result: { namingPrompt: seed },
  } }, { upsert: true, returnDocument: "before", timestamps: false }).lean();
  if (!before) {
    const inserted = await PaidExecutionRecord.findOne(owner).lean();
    if (!inserted || inserted.result?.namingPrompt?.deliveryLease !== lease) throw namingStorageUnavailable(executionId);
    return { state: "claimed", executionId, lease, snapshot: seed };
  }
  if (["refunded", "cancelled"].includes(before.status)) throw createHttpError(403, "취소·환불된 작명 결과입니다.", { code: "PAYMENT_REVOKED" });
  if (before.status === "completed") return { state: "completed", result: serializeExecutionResult(before) };
  const snapshot = before.result?.namingPrompt || seed;
  if (before.status === "generation_failed" && snapshot.delivery) throw createHttpError(409, "저장된 작명 회차의 생성 한도를 확인해야 합니다.", { code: "GENERATION_LIMIT_REACHED" });
  const fresh = Date.now() - new Date(before.updatedAt || before.createdAt || 0).getTime() < NAMING_GENERATION_FRESHNESS_MS;
  if (fresh && (snapshot.deliveryLease || (before.status === "generating" && snapshot.deliveryLease === undefined))) return { state: "in_flight", executionId };
  const pending = Boolean(snapshot.generatedResult) && (!snapshot.delivery || namingReportComplete(snapshot.delivery));
  const claimed = await PaidExecutionRecord.findOneAndUpdate({ ...owner, status: before.status, updatedAt: before.updatedAt || null }, {
    $set: { status: pending ? "delivery_pending" : "generating", error: null,
      "result.namingPrompt": { ...snapshot, deliveryLease: lease } },
  }, { returnDocument: "after" }).lean();
  if (!claimed) return { state: "in_flight", executionId };
  return { state: pending ? "delivery_pending" : "claimed", executionId, lease, snapshot };
}

function namingStorageUnavailable(executionId) {
  return Object.assign(new Error("Result storage unavailable"), { code: "RESULT_STORAGE_UNAVAILABLE", status: 503, resultId: executionId });
}
async function saveNamingDelivery(filter, fields) {
  try {
    const written = await PaidExecutionRecord.findOneAndUpdate(filter, { $set: fields }, { new: true }).lean();
    if (!written) throw namingStorageUnavailable(filter.executionId);
    const confirmed = await PaidExecutionRecord.findOne({ executionId: filter.executionId, userId: filter.userId }).lean();
    if (!confirmed || Object.entries(fields).some(([key, value]) => JSON.stringify(confirmed[key]) !== JSON.stringify(value))) throw namingStorageUnavailable(filter.executionId);
    return confirmed;
  } catch { throw namingStorageUnavailable(filter.executionId); }
}

// Eight chapter targets; each chapter independently requires 2,500 body characters.
const NAMING_MAX_TOTAL_CONTENT_CHARS = 27200;
const NAMING_PROMPT_TARGET_MIN_CHARS = 24000;

async function markNamingGenerationFailed(env, executionId, error, userId, lease) {
  await saveNamingDelivery(
    { executionId, userId, status: "generating", "result.namingPrompt.deliveryLease": lease },
    {
        status: "generation_failed",
        error: { message: clean(error?.message, 300), code: clean(error?.code, 80) },
    },
  );
}

// 월정석만 하드 환불한다(love-secret-ai.js와 동일 전략). 단건/이용권은 환불하지 않고 재시도로 회복 —
// 같은 결제/이용권 증거로 /generate를 다시 호출하면 재생성된다(추가 차감 없음).
async function refundNamingMonthlyCredit(env, auth, access) {
  const evidence = access?.evidence;
  if (!evidence?.evidenceId) return { refunded: false };
  await connectDb(env);

  let amount = 0;
  let ledgerId = "";
  let pointHistoryId = "";
  // 차감 때 recentConsumeRequestIds 에 들어간 purchaseId. 원장에서는 sourceId 가 곧 그 값이다.
  let purchaseId = "";
  if (evidence.source === "monthly_ledger" && isObjectId(evidence.evidenceId)) {
    const ledger = await MonthlyCreditLedger.findOne({ _id: evidence.evidenceId, userId: auth.userId }).lean();
    if (!ledger) return { refunded: false };
    amount = Math.abs(Math.floor(Number(ledger.amount || 0)));
    ledgerId = String(ledger._id);
    pointHistoryId = clean(ledger.metadata?.pointHistoryId, 160);
    purchaseId = clean(ledger.sourceId || ledger.metadata?.purchaseId, 180);
  } else if (evidence.source === "monthly_history" && isObjectId(evidence.evidenceId)) {
    const history = await PointHistory.findOne({ _id: evidence.evidenceId, userId: auth.userId }).lean();
    if (!history) return { refunded: false };
    amount = Math.abs(Math.floor(Number(history.delta || 0)));
    pointHistoryId = String(history._id);
    purchaseId = clean(history.metadata?.purchaseId || history.metadata?.idempotencyKey, 180);
  } else {
    return { refunded: false };
  }
  if (!amount) return { refunded: false };

  const refundSourceId = `naming-prompt-refund:${evidence.evidenceId}`.slice(0, 180);
  const existingRefund = await MonthlyCreditLedger.findOne({
    userId: auth.userId,
    type: "MONTHLY_CREDIT_GRANT",
    sourceId: refundSourceId,
  }).lean();
  if (existingRefund) return { refunded: true, idempotent: true };

  // 🔴 pullRequestId 는 선택 인자가 아니다 — 이걸 빼면 재구매가 applyLotDeduction 에서
  // ALREADY_PROCESSED 로 402 를 맞고, E11000 이 안 나므로 키 해제 경로조차 돌지 않는다
  // (= 환불받고 같은 요청을 다시 열지 못하는 락). 표식만 찍는 것으로는 부족하다.
  const updatedUser = await restoreMonthlyCreditLot({ userId: auth.userId, lotId: refundSourceId, amount, pullRequestId: purchaseId });
  if (!updatedUser) return { refunded: false };

  const afterBalance = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
  await MonthlyCreditLedger.create({
    userId: auth.userId,
    type: "MONTHLY_CREDIT_GRANT",
    amount,
    beforeBalance: Math.max(0, afterBalance - amount),
    afterBalance,
    reason: "작명 AI 결과 생성 실패 환불",
    sourceId: refundSourceId,
    serviceKey: FEATURE_KEY,
    metadata: { source: "naming-prompt", refundFor: evidence.evidenceId, refundedAt: new Date() },
  }).catch((error) => {
    if (error?.code !== 11000) throw error;
  });

  if (ledgerId) {
    await MonthlyCreditLedger.updateOne(
      { _id: ledgerId, userId: auth.userId },
      { $set: { "metadata.refundedForUnlockFailure": true, "metadata.refundedAt": new Date() } },
    ).catch(() => {});
  }
  if (pointHistoryId && isObjectId(pointHistoryId)) {
    await PointHistory.updateOne(
      { _id: pointHistoryId, userId: auth.userId },
      { $set: { "metadata.monthlyCreditRefundedForUnlockFailure": true, "metadata.monthlyCreditRefundedAt": new Date() } },
    ).catch(() => {});
  }
  return { refunded: true };
}

async function restoreNamingAccessOnFailure(env, auth, access) {
  if (access?.accessMethod === "monthly") {
    return refundNamingMonthlyCredit(env, auth, access).catch(() => ({ refunded: false }));
  }
  return { refunded: false };
}

async function mirrorNamingResultToPayment(paymentId, snapshot) {
  await Payment.findByIdAndUpdate(paymentId, { $set: { "pricingSnapshot.namingPrompt": snapshot } }).lean().catch(() => {});
}

async function upsertExecutionRecord(env, auth, access, inputHash, input, sajuSnapshot, generatedPrompt, generatedResult, generatedAt, llmMeta = {}) {
  await connectDb(env);
  const executionId = await buildExecutionId(auth, inputHash, access);
  const base = buildExecutionBaseFields(auth, access, inputHash, executionId);
  const result = {
    namingPrompt: {
      ...llmMeta.snapshot,
      version: RESULT_VERSION,
      productType: PRODUCT_TYPE,
      inputHash,
      inputSnapshot: input,
      sajuSnapshot,
      generatedPrompt,
      generatedResult,
      nameCards: Array.isArray(llmMeta.nameCards) ? llmMeta.nameCards : [],
      finalPick: llmMeta.finalPick || null,
      provider: clean(llmMeta.provider, 40),
      model: clean(llmMeta.model, 80),
      generatedAt: generatedAt.toISOString(),
      paidAt: generatedAt.toISOString(),
      accessMethod: access.accessMethod,
      evidenceId: access.evidenceId,
    },
  };
  const owner = { executionId, userId: String(auth.userId), status: { $nin: ["completed", "refunded", "cancelled"] } };
  const current = await PaidExecutionRecord.findOne({ executionId, userId: String(auth.userId) }).lean();
  const lease = llmMeta.deliveryLease || current?.result?.namingPrompt?.deliveryLease;
  if (!lease) throw namingStorageUnavailable(executionId);
  const filter = { ...owner, "result.namingPrompt.deliveryLease": lease };
  result.namingPrompt.deliveryLease = lease;
  await saveNamingDelivery(filter, { status: "delivery_pending", result });
  if (await isPaidResultRevoked(auth.userId, FEATURE_KEY, [base.requestId, base.idempotencyKey, base.paymentId, base.orderId])) {
    throw createHttpError(403, "취소·환불된 작명 결과입니다.", { code: "PAYMENT_REVOKED" });
  }
  result.namingPrompt.deliveryLease = "";
  return saveNamingDelivery(filter, { status: "completed", consumedAt: generatedAt, completedAt: generatedAt, error: null, result });
}

async function handleCheckout(request, env) {
  const auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
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
  const auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
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
  const auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  const body = await readJson(request);
  const resumeId = clean(body.resumeExecutionId, 160);
  const stored = resumeId ? await findExecutionRecordForUser(env, auth, resumeId) : null;
  if (resumeId && !stored) throw createHttpError(404, "작명 결과를 찾을 수 없습니다.", { code: "RESULT_NOT_FOUND" });
  const original = stored?.result?.namingPrompt;
  if (stored && await isPaidResultRevoked(auth.userId, FEATURE_KEY, [stored.requestId, stored.idempotencyKey, stored.paymentId, stored.orderId])) throw createHttpError(403, "취소·환불된 작명 결과입니다.", { code: "PAYMENT_REVOKED" });
  if (stored?.status === "completed") return json({ ok: true, result: serializeExecutionResult(stored) });
  const input = normalizeInput(body.input || original?.inputSnapshot || {});
  validateInput(input);
  const sajuEvidence = await resolveSajuEvidence(input, body.sajuEvidence || original?.originalEvidence, body.sajuEvidenceHash);
  const expectedInputHash = await buildNamingOrderHash(input, sajuEvidence.evidenceHash);
  const inputHash = clean(body.inputHash, 160) || original?.inputHash || expectedInputHash;
  if (inputHash !== expectedInputHash) throw createHttpError(409, "입력값과 사주 계산 기준이 결제 전 스냅샷과 일치하지 않습니다.", { code: "INPUT_HASH_MISMATCH" });
  const access = original?.access || await verifyNamingAccess(env, auth, body, inputHash);
  if (await isPaidResultRevoked(auth.userId, FEATURE_KEY, [access.requestId, access.evidenceId, access.paymentId])) throw createHttpError(403, "취소·환불된 작명 결과입니다.", { code: "PAYMENT_REVOKED" });
  const payment = access.payment || null;
  const existing = payment ? serializeResult(payment) : null;
  if (existing) {
    if (existing.inputHash !== inputHash) {
      throw createHttpError(409, "입력값이 바뀌면 새 결제가 필요합니다.", { code: "INPUT_HASH_MISMATCH" });
    }
    return json({ ok: true, idempotent: true, result: existing });
  }

  const executionId = await buildExecutionId(auth, inputHash, access);
  if (await isPaidResultRevoked(auth.userId, FEATURE_KEY, [executionId, access.requestId, access.evidenceId, access.paymentId])) {
    throw createHttpError(403, "취소·환불된 작명 결과입니다.", { code: "PAYMENT_REVOKED" });
  }
  const existingExecution = await findExecutionResultForUser(env, auth, executionId);
  if (existingExecution) {
    if (existingExecution.inputHash !== inputHash) {
      throw createHttpError(409, "입력값이 바뀌면 새 결제가 필요합니다.", { code: "INPUT_HASH_MISMATCH" });
    }
    return json({ ok: true, idempotent: true, result: existingExecution });
  }

  const sajuSnapshot = (original?.sajuSnapshot?.source !== "input-fallback" ? original?.sajuSnapshot : null) || buildSajuContext(input, sajuEvidence.evidence, sajuEvidence.evidenceHash);
  // 🔴 로케일은 `input` 밖에서 읽는다 — `input` 은 통째로 inputHash 가 되므로 여기에 넣으면
  //    (a) 배포 전 결제·배포 후 생성 사용자가 해시 불일치로 생성이 막히고
  //    (b) 언어만 바꿔 재요청할 때 같은 리딩에 30,000원이 다시 청구된다.
  const locale = original?.locale || body.locale || getAmbientAiLocale() || "ko";
  const generatedPrompt = original?.generatedPrompt || buildGeneratedPrompt(input, sajuSnapshot, locale);
  if (sajuSnapshot?.source === "input-fallback" && !original?.generatedResult) {
    throw createHttpError(422, "사주 계산 근거 확인이 필요합니다.", { code: "CALCULATION_UNAVAILABLE" });
  }
  const details = { locale, evidenceHash: await buildSajuEvidenceHash(sajuSnapshot), originalEvidence: sajuEvidence.evidence,
    access: Object.fromEntries(["accessMethod", "accessType", "evidenceId", "paymentId", "requestId", "profileId", "evidence"].map(key => [key, access[key]]).filter(([, value]) => value !== undefined)),
    delivery: { version: 1, attempts: {}, chapters: {}, candidates: null } };
  const claimedAt = new Date();

  let claim;
  try { claim = await beginNamingGeneration(env, auth, access, inputHash, input, sajuSnapshot, generatedPrompt, claimedAt, details); }
  catch (error) { if (["PAYMENT_REVOKED", "GENERATION_LIMIT_REACHED"].includes(error?.code)) throw error; throw namingStorageUnavailable(executionId); }
  if (claim.state === "completed") {
    return json({ ok: true, idempotent: true, result: claim.result });
  }
  if (claim.state === "in_flight") {
    return json({
      ok: true,
      status: "generating",
      executionId: claim.executionId,
      message: NAMING_GENERATING_MESSAGE,
    }, { status: 202 });
  }
  const deliveryInput = claim.snapshot?.inputSnapshot || input;
  const recoverCalculation = claim.snapshot?.sajuSnapshot?.source === "input-fallback" && !claim.snapshot?.generatedResult;
  const deliverySaju = recoverCalculation ? sajuSnapshot : claim.snapshot?.sajuSnapshot || sajuSnapshot;
  const deliveryPrompt = recoverCalculation ? buildGeneratedPrompt(deliveryInput, deliverySaju, locale) : claim.snapshot?.generatedPrompt || generatedPrompt;

  const filter = { executionId: claim.executionId, userId: String(auth.userId), "result.namingPrompt.deliveryLease": claim.lease, status: { $nin: ["completed", "refunded", "cancelled"] } };
  let snapshot = { ...details, ...claim.snapshot, inputSnapshot: deliveryInput, sajuSnapshot: deliverySaju, generatedPrompt: deliveryPrompt, deliveryLease: claim.lease };
  if (recoverCalculation) snapshot.evidenceHash = details.evidenceHash;
  try {
    if (snapshot.sajuSnapshot?.source === "input-fallback") throw createHttpError(422, "사주 계산 근거 확인이 필요합니다.", { code: "CALCULATION_UNAVAILABLE" });
    await saveNamingDelivery(filter, { result: { namingPrompt: snapshot } });
    // Old delivery_pending bodies already passed their original generation contract; store them without regenerating.
    if (!(claim.state === "delivery_pending" && !claim.snapshot?.delivery)) {
      const wave = await generateNamingWave(env, snapshot, async delivery => {
        snapshot = { ...snapshot, delivery, generatedResult: namingChaptersText(delivery.chapters),
          nameCards: delivery.candidates?.cards || [], finalPick: delivery.candidates?.finalPick || null };
        await saveNamingDelivery(filter, { status: snapshot.generatedResult ? "partial" : "generating", result: { namingPrompt: snapshot } });
      });
      snapshot = { ...snapshot, delivery: wave.state, limited: wave.limited };
      const current = await saveNamingDelivery(filter, { result: { namingPrompt: snapshot } });
      if (wave.limited && confirmedEmptyNamingFailure(wave.state)) {
        await markNamingGenerationFailed(env, claim.executionId, Object.assign(new Error("작명첩 품질 기준 미달"), { code: "NAMING_RESULT_TOO_SHORT" }), String(auth.userId), claim.lease);
        await restoreNamingAccessOnFailure(env, auth, access);
        return json({ ok: false, retryable: false, reason: "LLM_ERROR", executionId: claim.executionId, resultId: claim.executionId, message: NAMING_LLM_ERROR_MESSAGE }, { status: 503 });
      }
      if (!namingReportComplete(wave.state)) return namingPendingResponse(current);
    }
    const generatedAt = new Date();
    const execution = await upsertExecutionRecord(env, auth, access, inputHash, deliveryInput, deliverySaju, deliveryPrompt, snapshot.generatedResult, generatedAt,
      { snapshot, nameCards: snapshot.nameCards, finalPick: snapshot.finalPick, deliveryLease: claim.lease, provider: snapshot.delivery?.provider || snapshot.provider, model: snapshot.delivery?.model || snapshot.model || "" });
    if (payment?._id) await mirrorNamingResultToPayment(payment._id, execution.result.namingPrompt);
    return json({ ok: true, idempotent: false, result: serializeExecutionResult(execution) }, { status: 201 });
  } catch (error) {
    if (error?.code === "PAYMENT_REVOKED" || error?.code === "CALCULATION_UNAVAILABLE") throw error;
    throw namingStorageUnavailable(claim.executionId);
  } finally {
    await PaidExecutionRecord.updateOne({ ...filter, status: { $ne: "completed" } }, { $set: { "result.namingPrompt.deliveryLease": "" } }).catch(() => {});
  }
}

function namingPendingResponse(record) {
  const snapshot = record.result?.namingPrompt || {};
  return json({ ok: true, status: record.status, retryable: snapshot.limited !== true, executionId: record.executionId, resultId: record.executionId,
    resumeBody: { resumeExecutionId: record.executionId },
    result: { id: record.executionId, status: record.status, saved: false, generatedResult: snapshot.generatedResult || "",
      inputSnapshot: snapshot.inputSnapshot, sajuSnapshot: snapshot.sajuSnapshot, nameCards: snapshot.nameCards || [],
      chapters: snapshot.delivery?.chapters || {}, completedChapters: Object.keys(snapshot.delivery?.chapters || {}), totalChapters: 8 },
  }, { status: 202, headers: { "Retry-After": "3" } });
}

async function handleResult(request, env, id) {
  const auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  await connectDb(env);
  const record = id === "pending" ? await PaidExecutionRecord.findOne({ userId: String(auth.userId), featureId: FEATURE_KEY,
    status: { $in: ["generating", "partial", "delivery_pending"] } }).sort({ createdAt: -1 }).lean() : await findExecutionRecordForUser(env, auth, id);
  if (id === "pending" && !record) return json({ ok: true, result: null });
  if (record) {
    if (await isPaidResultRevoked(auth.userId, FEATURE_KEY, [record.requestId, record.idempotencyKey, record.paymentId, record.orderId])) {
      throw createHttpError(403, "취소·환불된 작명 결과입니다.", { code: "PAYMENT_REVOKED" });
    }
    if (["generating", "partial", "delivery_pending"].includes(record.status)) return namingPendingResponse(record);
    if (record.status === "generation_failed") {
      return json({
        ok: false,
        reason: "LLM_ERROR",
        status: "generation_failed",
        message: NAMING_LLM_ERROR_MESSAGE,
      }, { status: 503 });
    }
    const result = serializeExecutionResult(record);
    if (result) return json({ ok: true, result });
  }
  const payment = await findPaymentForUser(env, auth, id);
  verifyPaymentShape(payment);
  const result = serializeResult(payment);
  if (!result) throw createHttpError(404, "생성된 작명 프롬프트를 찾을 수 없습니다.", { code: "RESULT_NOT_FOUND" });
  return json({ ok: true, result });
}

export async function handleNamingPromptRoutes(request, env, ctx = null) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/naming-prompt");
    if (method === "POST" && path === "/checkout") return await handleCheckout(request, env);
    if (method === "POST" && path === "/verify-payment") return await handleVerifyPayment(request, env);
    if (method === "POST" && path === "/generate") return await handleGenerate(request, env, ctx);
    if (method === "GET" && path.startsWith("/result/")) return await handleResult(request, env, decodeURIComponent(path.slice("/result/".length)));
    if (["POST", "GET"].includes(method)) {
      return json({ ok: false, message: "Naming prompt route not found.", code: "NOT_FOUND" }, { status: 404 });
    }
    return methodNotAllowed();
  } catch (error) {
    if (error?.code === "RESULT_STORAGE_UNAVAILABLE") return json({ ok: false, retryable: true, reason: error.code, resultId: error.resultId, executionId: error.resultId }, { status: 503 });
    return handleRouteError(error, {
      request,
      env,
      trace: { route: "naming-prompt", method: request.method },
    });
  }
}

export const __namingPromptExecutionTestUtils = { beginNamingGeneration, upsertExecutionRecord };
