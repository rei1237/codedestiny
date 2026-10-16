import { connectDb, withMongoRetry } from "./db.js";
import { CONTENT_ENTITLEMENT_SOURCES, User, PointHistory } from "./models.js";
import {
  findActivePaidContentUnlock,
  upsertPaidContentUnlock,
} from "./content-unlocks.js";
import { FEATURE_KEY_PRICE_TABLE, PAID_FEATURE_BILLING_TYPES, getPaidFeatureBillingType, isBirthScopedUnlockFeatureKey, isPerUsePaidFeatureKey, normalizePaidFeatureKey } from "./paid-feature-registry.js";
import { claimBillingEvidence } from "./billing-evidence-claim.js";
import { verifyPremiumAccessToken } from "./premium-access-token.js";
import { normalizeHoneyPassEntitlement } from "./profile-limits.js";

export const PREMIUM_UNLOCK_POLICY = Object.freeze({
  ziweiPremium: ["premiumDivinationPack"],
  // sukuyo-past-life-reading 은 회당 결제(PER_USE_PAID_FEATURE_KEY_LIST)다.
  // 이 목록은 영구 해금(ContentEntitlement) 후보 키라, 회당 결제 키를 넣으면
  // 1회 결제로 이후 모든 상대 조회가 무료가 된다. 번들 상품만 남긴다.
  sukuyoPastLifeReading: ["premiumDivinationPack"],
  celestialHarmony: ["premiumDivinationPack"],
  fptiPremium: ["premium-fpti-report"],
});

function uniqueStrings(values) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ));
}

// 저장된 ProfileCard 의 profileId 만 돌려준다. 계정 표식("__user__")·합성 출생 id("birth:…")는
// 프로필이 아니므로 버린다 — 출생 기반 키가 그 값으로 계정(USER) 행이나 남의 출생 행을 찾지 못하게.
function extractPaidContentProfileId(source = {}) {
  const payment = source && typeof source.payment === "object" ? source.payment : {};
  const alt = source && typeof source._paymentContext === "object" ? source._paymentContext : {};
  const consume = source && typeof source.consume === "object" ? source.consume : {};
  const grant = source && typeof source.accessGrant === "object" ? source.accessGrant : {};
  const profileId = String(
    source.profileId
      || source.selectedProfileId
      || source.currentProfileId
      || payment.profileId
      || payment.selectedProfileId
      || alt.profileId
      || alt.selectedProfileId
      || consume.profileId
      || consume.selectedProfileId
      || grant.profileId
      || "",
  ).trim();
  if (profileId === "__user__" || profileId.startsWith("birth:")) return "";
  return profileId;
}

function buildPremiumUnlockCandidateKeys({
  unlockPolicy = [],
  alternativeRules = [],
  requiredRules = [],
  receivedFeatureKey = "",
} = {}) {
  const ruleKeys = [...alternativeRules, ...requiredRules].flatMap((rule) => [
    rule?.featureKey,
    normalizePaidFeatureKey(rule?.featureKey || ""),
  ]);
  return uniqueStrings([
    receivedFeatureKey,
    normalizePaidFeatureKey(receivedFeatureKey),
    ...unlockPolicy,
    ...ruleKeys,
  ]);
}

async function findPremiumContentEntitlement({ userId, profileId, candidateKeys = [], env = {} } = {}) {
  for (let i = 0; i < candidateKeys.length; i += 1) {
    const featureKey = candidateKeys[i];
    // 출생 기반 키는 요청이 실은 저장 프로필(=그 출생 정보)로 판정한다. 프로필이 없으면 출생 전환 이전의
    // 레거시 USER 행만 근거다(content-unlocks 의 출생 분기가 그렇게 조회한다).
    const unlock = await withMongoRetry(env, () => findActivePaidContentUnlock({ userId, profileId, featureKey }));
    if (unlock?._id) return { unlock, featureKey };
  }
  return null;
}

async function upsertPremiumContentEntitlementFromEvidence({ userId, profileId, featureKey, evidence } = {}) {
  if (!userId || !featureKey || !evidence?._id) return null;
  const accessType = String(evidence?.metadata?.accessType || evidence?.metadata?.paymentMethod || "").toLowerCase();
  const source = accessType.includes("pass") ? CONTENT_ENTITLEMENT_SOURCES.PASS : CONTENT_ENTITLEMENT_SOURCES.COIN;
  return upsertPaidContentUnlock({
    userId,
    profileId,
    featureKey,
    source,
    orderId: String(evidence?.metadata?.requestId || evidence?.metadata?.orderId || ""),
    paymentId: String(evidence?._id || evidence?.metadata?.paymentId || evidence?.metadata?.transactionId || ""),
    passId: source === CONTENT_ENTITLEMENT_SOURCES.PASS ? String(evidence?.metadata?.passId || evidence?._id || "") : "",
    coinAmount: Math.abs(Number(evidence?.delta || evidence?.metadata?.chargedCoins || 0)),
    unlockedAt: evidence?.createdAt || null,
  }).catch((error) => {
    console.warn("[PremiumAccessDecision] entitlement upsert failed", {
      userId: String(userId || ""),
      featureKey: String(featureKey || ""),
      evidenceId: String(evidence?._id || ""),
      code: String(error?.code || ""),
    });
    return null;
  });
}

function logPremiumAccessDecision(payload = {}) {
  const safe = {
    route: String(payload.route || "").trim() || "unknown",
    userId: String(payload.userId || "").trim() || "unknown",
    featureKey: String(payload.featureKey || "").trim() || "unknown",
    reportType: String(payload.reportType || "").trim() || "unknown",
    accessSource: String(payload.accessSource || "").trim() || "denied",
    matchedTransactionId: String(payload.matchedTransactionId || "").trim() || "",
    entitlementId: String(payload.entitlementId || "").trim() || "",
    deniedReason: String(payload.deniedReason || "").trim() || "",
  };
  if (safe.deniedReason) {
    console.warn("[PremiumAccessDecision]", safe);
    return;
  }
  console.info("[PremiumAccessDecision]", safe);
}

function resolvePremiumPassReportAccess(user = {}, {
  normalizedReportType = "",
  requestBody = {},
  requiredRules = [],
  alternativeRules = [],
  unlockPolicy = [],
  receivedFeatureKey = "",
} = {}) {
  const entitlement = normalizeHoneyPassEntitlement(user || {});
  if (entitlement?.isActive !== true) return null;

  const passTier = String(entitlement.passTier || entitlement.tier || "").trim();
  const maxCoveredCoin = Number(entitlement.maxCoveredCoin || 0);
  const requestedCoinCost = Math.max(
    0,
    ...[...requiredRules, ...alternativeRules].map((rule) => Number(rule?.minCost || 0)),
    Number(requestBody?.coinCost || requestBody?.chargedCoins || requestBody?.amountCoins || requestBody?.coins || 0),
  );

  if (passTier !== "family" && (!Number.isFinite(requestedCoinCost) || requestedCoinCost <= 0 || requestedCoinCost > maxCoveredCoin)) {
    return null;
  }

  const featureKey = String(
    receivedFeatureKey
      || alternativeRules[0]?.featureKey
      || requiredRules[0]?.featureKey
      || unlockPolicy[0]
      || normalizedReportType
      || "",
  ).trim();

  return {
    ok: true,
    accessType: passTier === "family" ? "family_pass" : "membership_pass",
    reportType: normalizedReportType,
    featureKey,
    passTier,
    passLabel: entitlement.passLabel || entitlement.label || passTier,
    chargedCoins: 0,
    coveredCoinLimit: maxCoveredCoin,
    requestedCoinCost,
  };
}

// 결제 게이트(/coin-gate/pass-check)가 라우트와 다른 키로 이용권을 차감하는 기능. 정산은 게이트 키로 해야 재생이 맞는다.
const PREMIUM_PASS_GATE_FEATURE_KEYS = Object.freeze({ geomancy: "openGeomancyOracle" });

/**
 * 이용권 허용 판정을 실제 차감으로 정산한다(이용권 허용 = 차감 완료).
 * 프론트 결제 게이트가 이미 같은 (기능 키, requestId)로 차감했으면 그 차감을 재생하고(이중 차감 없음),
 * 게이트를 건너뛴 직접 호출이면 여기서 차감한다. 재열람·폴링도 저장된 같은 requestId 로 와서 재생된다.
 * 기능 키·가격은 서버 규칙에서만 정한다(본문 값 미사용). requestId 가 없으면 거부한다(fail-closed).
 * 영구 해금형(FPTI 등)은 여기서 차감하지 않는다 — 게이트가 출생 신원 해금 행을 남기고 위쪽 해금 분기가 그 행으로 연다.
 */
async function settlePremiumPassReportAccess(env, { userId, profileId, normalizedReportType, requestBody = {}, alternativeRules = [], unlockPolicy = [] } = {}) {
  const ruleKeys = uniqueStrings(alternativeRules.map((item) => String(item?.featureKey || "").trim()));
  const routeKey = ruleKeys.find((key) => key !== "coin-gate-per-use") || String(unlockPolicy[0] || normalizedReportType || "").trim();
  const featureKey = PREMIUM_PASS_GATE_FEATURE_KEYS[routeKey] || routeKey;
  const coinPrice = Math.max(
    0,
    ...alternativeRules.map((item) => Number(item?.minCost || 0)),
    Number(FEATURE_KEY_PRICE_TABLE[featureKey]?.cost || 0),
    Number(FEATURE_KEY_PRICE_TABLE[routeKey]?.cost || 0),
  );
  const nested = ["payment", "consume", "_paymentContext", "accessGrant"].map((key) => (requestBody && typeof requestBody[key] === "object" ? requestBody[key] : {}));
  const requestId = String([requestBody?.requestId, ...nested.map((item) => item?.requestId)].find((value) => String(value || "").trim()) || "").trim();
  const base = { featureKey, coinPrice, requestId };
  if (getPaidFeatureBillingType(routeKey) === PAID_FEATURE_BILLING_TYPES.UNLOCK) return { ...base, allowed: false, reason: "UNLOCK_REQUIRES_GATE" };
  if (!featureKey || coinPrice <= 0) return { ...base, allowed: false, reason: "PRICE_UNRESOLVED" };
  if (!requestId) return { ...base, allowed: false, reason: "NO_REQUEST_ID" };

  // nakshatra-paid-access 는 db·auth 를 끌고 온다. 이 모듈을 모킹하는 테스트가 깨지지 않도록 쓸 때만 불러온다.
  const { settlePerUseAccessDecision } = await import("./nakshatra-paid-access.js");
  const common = { userId: String(userId || ""), coinPrice, requestId, profileId };
  // 게이트가 다른 규칙 키로 차감했을 수 있다 — 차감 없이 재생만 먼저 확인한다.
  for (const replayKey of uniqueStrings([featureKey, ...ruleKeys]).filter((key) => key !== featureKey)) {
    const replay = await settlePerUseAccessDecision(env, { ...common, featureKey: replayKey, decision: { allowed: false }, acceptSettled: true });
    if (replay.allowed === null) return { ...base, ...replay };
    if (replay.allowed) return { ...base, ...replay, featureKey: replayKey };
  }
  const settled = await settlePerUseAccessDecision(env, { ...common, featureKey, decision: { allowed: true, accessSource: "license_pass" } });
  return { ...base, ...settled };
}

const RECENT_WINDOW_CLAIM_CANDIDATES = 5;

function premiumReportRequestId(requestBody = {}) {
  const nested = ["payment", "consume", "_paymentContext", "accessGrant"].map((key) => (requestBody && typeof requestBody[key] === "object" ? requestBody[key] : {}));
  return String([requestBody?.requestId, ...nested.map((item) => item?.requestId)].find((value) => String(value || "").trim()) || "").trim();
}

/**
 * 🔴 회당 리포트: 결제·차감 증빙 1건은 요청 1건에만 쓴다(billing-evidence-claim.js, 2026-10-16).
 * 예전에는 같은 차감 행을 requestId 만 바꿔 몇 번이든 내밀 수 있었다(본문 증빙·최근 결제 창).
 * 이미 다른 요청이 쓴 증빙이면 "used" — 호출부는 그 경로를 건너뛰고 다음 경로를 본다(끝까지 없으면 평소의 402).
 * 영구 해금형(FPTI 등)은 대상이 아니다(perUse=false). DB 오류는 "unavailable" → 503(결제한 사람을 402로 막지 않는다).
 */
async function claimPremiumReportEvidence(env, { perUse, userId, claimRequestId, featureKey = "", evidenceId }) {
  if (!perUse) return "ok";
  const id = String(evidenceId || "").trim();
  if (!id) return "used";
  try {
    const claimed = await claimBillingEvidence(env, { userId: String(userId || ""), featureKey, requestId: claimRequestId, evidenceIds: [id], kind: "premium-report" });
    return claimed.ok ? "ok" : "used";
  } catch (error) {
    console.warn("[premium-access] evidence claim unavailable", { featureKey, message: String(error?.message || error) });
    return "unavailable";
  }
}

function premiumEvidenceUnavailableResult(reportType) {
  return {
    ok: false,
    status: 503,
    code: "PAYMENT_VERIFY_UNAVAILABLE",
    message: "결제 확인이 잠시 지연되고 있어요. 잠시 후 다시 시도해 주세요.",
    reportType,
  };
}

export function buildAlternativePaymentRules(reportType, requestBody = {}) {
  if (reportType === "celestialHarmony") {
    return [
      {
        featureKey: "tarot-celestial-harmony",
        reason: "셀레스티얼 하모니 타로 리딩",
        minCost: FEATURE_KEY_PRICE_TABLE["tarot-celestial-harmony"].cost,
        windowMinutes: 120,
      },
      {
        featureKey: "premium-celestial-harmony-report",
        reason: "셀레스티얼 하모니 타로 리딩",
        minCost: FEATURE_KEY_PRICE_TABLE["tarot-celestial-harmony"].cost,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "셀레스티얼 하모니 타로 리딩",
        minCost: FEATURE_KEY_PRICE_TABLE["tarot-celestial-harmony"].cost,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "sibylDominator") {
    return [{
      featureKey: "premium-sibyl-dominator",
      reason: "시빌라 도미네이터 리포트",
      minCost: FEATURE_KEY_PRICE_TABLE["premium-sibyl-dominator"].cost,
      windowMinutes: 45,
    }];
  }

  if (reportType === "geomancyOracle") {
    return [
      {
        featureKey: "geomancy",
        reason: "지오맨시 오라클 리딩",
        minCost: FEATURE_KEY_PRICE_TABLE["geomancy"].cost,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "지오맨시 오라클 리딩",
        minCost: FEATURE_KEY_PRICE_TABLE["geomancy"].cost,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "yogaGuruCourse") {
    return [
      {
        featureKey: "yoga-guru-per-use",
        reason: "요가 구루",
        minCost: 30,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "요가 구루",
        minCost: 30,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "sajuCompatBasic") {
    const cost = FEATURE_KEY_PRICE_TABLE["compat-saju-compatibility"].cost;
    return [
      {
        featureKey: "compat-saju-compatibility",
        reason: "사주 궁합 분석",
        minCost: cost,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "사주 궁합 분석",
        minCost: cost,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "destinyCompassDeepReport") {
    return [
      {
        featureKey: "destiny-compass-deep-report",
        reason: "운명의 지도 심층 리포트",
        minCost: FEATURE_KEY_PRICE_TABLE["destiny-compass-deep-report"].cost,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "운명의 지도 심층 리포트",
        minCost: FEATURE_KEY_PRICE_TABLE["destiny-compass-deep-report"].cost,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "petSajuReport") {
    return [
      {
        featureKey: "pet-saju-ai-consultation",
        reason: "반려동물 사주 AI 심층 리포트",
        minCost: FEATURE_KEY_PRICE_TABLE["pet-saju-ai-consultation"].cost,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "반려동물 사주 AI 심층 리포트",
        minCost: FEATURE_KEY_PRICE_TABLE["pet-saju-ai-consultation"].cost,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "petCompatReport") {
    return [
      {
        featureKey: "pet-compatibility-ai",
        reason: "반려동물 궁합 분석",
        minCost: FEATURE_KEY_PRICE_TABLE["pet-compatibility-ai"].cost,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "반려동물 궁합 분석",
        minCost: FEATURE_KEY_PRICE_TABLE["pet-compatibility-ai"].cost,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "sukuyoPastLifeReading") {
    return [
      {
        featureKey: "sukuyo-past-life-reading",
        reason: "숙요 인연 레이더",
        minCost: FEATURE_KEY_PRICE_TABLE["sukuyo-past-life-reading"].cost,
        windowMinutes: 240,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "숙요 인연 레이더",
        minCost: FEATURE_KEY_PRICE_TABLE["sukuyo-past-life-reading"].cost,
        windowMinutes: 240,
      },
    ];
  }

  if (reportType === "fptiPremium") {
    return [
      {
        featureKey: "premium-fpti-report",
        reason: "FPTI 프리미엄 리포트 생성",
        minCost: FEATURE_KEY_PRICE_TABLE["premium-fpti-report"].cost,
        windowMinutes: 45,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "FPTI 프리미엄 리포트 생성",
        minCost: FEATURE_KEY_PRICE_TABLE["premium-fpti-report"].cost,
        windowMinutes: 45,
      },
    ];
  }

  return [];
}

export function buildRequiredPaymentRules(reportType, requestBody = {}) {
  return [];
}

// excludeIds: 이미 다른 요청이 쓴 차감 행 — 창 안의 다음(더 오래된) 행을 본다.
async function findRecentDeductionEvidence(userId, rule, { excludeIds = [] } = {}) {
  const minutes = Number(rule?.windowMinutes || 30);
  const minCost = Number(rule?.minCost || 0);
  const createdAtMin = new Date(Date.now() - minutes * 60 * 1000);
  const featureKeys = uniqueStrings([
    String(rule?.featureKey || "").trim(),
    normalizePaidFeatureKey(rule?.featureKey || ""),
  ]);

  const baseQuery = {
    userId,
    kind: "deduct",
    featureKey: featureKeys.length > 1 ? { $in: featureKeys } : String(rule?.featureKey || "").trim(),
    createdAt: { $gte: createdAtMin },
  };
  if (excludeIds.length) baseQuery._id = { $nin: excludeIds };

  if (minCost > 0) {
    baseQuery.delta = { $lte: -Math.floor(minCost) };
  }

  const strictReason = String(rule?.reason || "").trim();
  if (strictReason) {
    const exact = await PointHistory.findOne({
      ...baseQuery,
      reason: strictReason,
    })
      .select("_id createdAt delta featureKey reason metadata")
      .sort({ createdAt: -1 })
      .lean();
    if (exact) return exact;
  }

  // Fallback: allow feature/cost/time evidence even when reason text changed (e.g. chapter count wording).
  return PointHistory.findOne(baseQuery)
    .select("_id createdAt delta featureKey reason metadata")
    .sort({ createdAt: -1 })
    .lean();
}

function paymentReasonRoughlyMatches(strictReason = "", evidenceReason = "") {
  const a = String(strictReason || "").trim();
  const b = String(evidenceReason || "").trim();
  if (!a || !b) return false;
  if (a === b) return true;

  const na = a.replace(/\s+/g, "").toLowerCase();
  const nb = b.replace(/\s+/g, "").toLowerCase();
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const baseA = a.split("(")[0].trim().toLowerCase();
  const baseB = b.split("(")[0].trim().toLowerCase();
  if (baseA && baseA === baseB) return true;

  return false;
}

function extractPaymentLookupTokens(requestBody = {}) {
  const source = requestBody && typeof requestBody === "object" ? requestBody : {};
  const payment = source.payment && typeof source.payment === "object" ? source.payment : {};
  const alt = source._paymentContext && typeof source._paymentContext === "object" ? source._paymentContext : {};
  const consume = source.consume && typeof source.consume === "object" ? source.consume : {};
  const grant = source.accessGrant && typeof source.accessGrant === "object"
    ? source.accessGrant
    : (payment.accessGrant && typeof payment.accessGrant === "object"
      ? payment.accessGrant
      : (alt.accessGrant && typeof alt.accessGrant === "object"
        ? alt.accessGrant
        : (consume.accessGrant && typeof consume.accessGrant === "object" ? consume.accessGrant : {})));

  const transactionId = String(
    source.transactionId
    || source.sourceTransactionId
    || source.paymentId
    || source.id
    || payment.transactionId
    || payment.sourceTransactionId
    || payment.paymentId
    || payment.id
    || alt.transactionId
    || alt.sourceTransactionId
    || alt.paymentId
    || alt.id
    || consume.transactionId
    || consume.sourceTransactionId
    || consume.paymentId
    || consume.id
    || "",
  ).trim();
  const requestId = String(
    source.requestId
    || source.sourceRequestId
    || payment.requestId
    || payment.sourceRequestId
    || alt.requestId
    || alt.sourceRequestId
    || consume.requestId
    || consume.sourceRequestId
    || "",
  ).trim();
  const receiptId = String(
    source.receiptId
    || source.receipt
    || payment.receiptId
    || payment.receipt
    || alt.receiptId
    || alt.receipt
    || consume.receiptId
    || consume.receipt
    || "",
  ).trim();
  const orderId = String(
    source.orderId
    || source.merchantUid
    || payment.orderId
    || payment.merchantUid
    || alt.orderId
    || alt.merchantUid
    || consume.orderId
    || consume.merchantUid
    || "",
  ).trim();
  const purchaseId = String(
    source.purchaseId
    || source.reportPurchaseId
    || source.sourceTransactionId
    || source.transactionId
    || grant.purchaseId
    || grant.transactionId
    || grant.sourceTransactionId
    || payment.purchaseId
    || alt.purchaseId
    || consume.purchaseId
    || "",
  ).trim();
  const sessionId = String(
    source.sessionId
    || source.reportSessionId
    || source._premiumReportSessionId
    || grant.sessionId
    || grant.reportSessionId
    || payment.sessionId
    || payment.reportSessionId
    || alt.sessionId
    || alt.reportSessionId
    || consume.sessionId
    || consume.reportSessionId
    || "",
  ).trim();

  const result = {
    transactionId,
    requestId,
    receiptId,
    orderId,
  };
  if (purchaseId) result.purchaseId = purchaseId;
  if (sessionId) result.sessionId = sessionId;
  return result;
}

function extractAccessBindingHints(requestBody = {}) {
  const source = requestBody && typeof requestBody === "object" ? requestBody : {};
  const payment = source.payment && typeof source.payment === "object" ? source.payment : {};
  const consume = source.consume && typeof source.consume === "object" ? source.consume : {};
  const ctx = source._paymentContext && typeof source._paymentContext === "object" ? source._paymentContext : {};
  const grant = source.accessGrant && typeof source.accessGrant === "object"
    ? source.accessGrant
    : (payment.accessGrant && typeof payment.accessGrant === "object"
      ? payment.accessGrant
      : (ctx.accessGrant && typeof ctx.accessGrant === "object"
        ? ctx.accessGrant
        : (consume.accessGrant && typeof consume.accessGrant === "object" ? consume.accessGrant : {})));
  const profile = source.profile && typeof source.profile === "object" ? source.profile : {};

  return {
    route: String(source._accessRoute || "").trim(),
    profileId: String(
      source.profileId
      || source.selectedProfileId
      || source.profileKey
      || profile.profileId
      || profile.id
      || "",
    ).trim(),
    reportId: String(source.reportId || grant.reportId || source.reportSessionId || source.generationId || "").trim(),
    sessionId: String(
      source.sessionId
      || source.reportSessionId
      || grant.sessionId
      || grant.reportSessionId
      || source.chapterSessionId
      || source.generationSessionId
      || ""
    ).trim(),
    purchaseId: String(source.purchaseId || grant.purchaseId || source.reportPurchaseId || payment.purchaseId || consume.purchaseId || ctx.purchaseId || "").trim(),
    requestId: String(source.requestId || source.sourceRequestId || payment.requestId || consume.requestId || ctx.requestId || "").trim(),
    transactionId: String(
      source.transactionId
      || source.sourceTransactionId
      || source.paymentId
      || grant.transactionId
      || grant.sourceTransactionId
      || payment.transactionId
      || payment.sourceTransactionId
      || consume.transactionId
      || ctx.transactionId
      || "",
    ).trim(),
  };
}

function buildBindingClause(binding = {}) {
  const clauses = [];
  if (binding.requestId) clauses.push({ "metadata.requestId": binding.requestId });
  if (binding.transactionId) {
    clauses.push({ "metadata.sourceTransactionId": binding.transactionId });
    clauses.push({ "metadata.transactionId": binding.transactionId });
    clauses.push({ "metadata.paymentId": binding.transactionId });
    clauses.push({ "metadata.impUid": binding.transactionId });
    clauses.push({ "metadata.merchantUid": binding.transactionId });
    clauses.push({ "metadata.orderId": binding.transactionId });
    try {
      clauses.push({ _id: binding.transactionId });
    } catch (_) {
      // ignore malformed ids
    }
  }
  if (binding.profileId) {
    clauses.push({ "metadata.profileId": binding.profileId });
    clauses.push({ "metadata.selectedProfileId": binding.profileId });
  }
  if (binding.reportId) clauses.push({ "metadata.reportId": binding.reportId });
  if (binding.sessionId) {
    clauses.push({ "metadata.sessionId": binding.sessionId });
    clauses.push({ "metadata.reportSessionId": binding.sessionId });
  }
  if (binding.purchaseId) {
    clauses.push({ "metadata.purchaseId": binding.purchaseId });
    clauses.push({ "metadata.reportSessionId": binding.purchaseId });
    clauses.push({ "metadata.sourceTransactionId": binding.purchaseId });
    clauses.push({ "metadata.transactionId": binding.purchaseId });
  }
  return clauses;
}

function paymentEvidenceMatchesRule(evidence = {}, rule = {}) {
  const rawFeatureKey = String(evidence?.featureKey || "").trim();
  const rawRuleKey = String(rule?.featureKey || "").trim();
  const featureKeys = uniqueStrings([rawRuleKey, normalizePaidFeatureKey(rawRuleKey)]);
  const evidenceKeys = uniqueStrings([rawFeatureKey, normalizePaidFeatureKey(rawFeatureKey)]);
  const featureMatches = featureKeys.length === 0 || evidenceKeys.some((key) => featureKeys.includes(key));
  if (!featureMatches) return false;

  const minCost = Number(rule?.minCost || 0);
  const chargedCoins = Number(evidence?.chargedCoins || evidence?.cost || Math.abs(Number(evidence?.delta || 0)));
  if (minCost > 0 && (!Number.isFinite(chargedCoins) || chargedCoins < minCost)) return false;

  const strictReason = String(rule?.reason || "").trim();
  const evidenceReason = String(evidence?.reason || "").trim();
  if (strictReason && evidenceReason && !paymentReasonRoughlyMatches(strictReason, evidenceReason)) return false;

  return true;
}

function premiumTokenMatchesCurrentAccessRules(tokenPayload = {}, alternativeRules = [], requiredRules = []) {
  const rules = [...(Array.isArray(requiredRules) ? requiredRules : []), ...(Array.isArray(alternativeRules) ? alternativeRules : [])];
  if (!rules.length) return true;

  if (tokenPayload?.freeBySubscription === true) {
    const tokenFeatureKey = normalizePaidFeatureKey(tokenPayload?.featureKey);
    const tokenReason = String(tokenPayload?.reason || "").trim();
    return rules.some((rule) => {
      const ruleFeatureKey = normalizePaidFeatureKey(rule?.featureKey);
      if (ruleFeatureKey && (!tokenFeatureKey || tokenFeatureKey !== ruleFeatureKey)) return false;
      const strictReason = String(rule?.reason || "").trim();
      if (strictReason && tokenReason && !paymentReasonRoughlyMatches(strictReason, tokenReason)) return false;
      return true;
    });
  }

  const evidence = {
    featureKey: tokenPayload?.featureKey,
    reason: tokenPayload?.reason,
    chargedCoins: Number(tokenPayload?.chargedCoins || 0),
    delta: -Math.abs(Number(tokenPayload?.chargedCoins || 0)),
  };

  return rules.some((rule) => paymentEvidenceMatchesRule(evidence, rule));
}

/* 컨텍스트 바인딩(요청의 reportId·sessionId·requestId·purchaseId 가 결제 증빙과 같아야 한다)은
   서버 전역에서 꺼져 있었다 — requiresContextBoundPremiumPaymentEvidence() 가 reportType 을 보지도
   않고 상수 false 를 돌려주는 바람에, 그것을 타고 살던 것들이 전부 도달 불가였다:
   premiumTokenMatchesRequestBinding(토큰 바인딩 대조 23줄) · buildContextBindingClause(느슨한
   buildBindingClause 대신 쓰던 좁은 조회 절) · findEvidenceByPaymentTokens 의
   requireContextBinding 옵션과 그 "바인딩 힌트가 없으면 null" 조기 반환.
   실제로 돌던 경로는 buildBindingClause 뿐이고 지금도 그대로다.
   되살릴 때는 requiresContextBoundPremiumPaymentEvidence 를 reportType 화이트리스트로 되돌리는 것이
   출발점이고, 이 커밋 하나를 revert 하면 네 조각이 함께 돌아온다. */
async function findEvidenceByPaymentTokens(userId, requestBody = {}, rules = []) {
  const tokens = extractPaymentLookupTokens(requestBody);
  const binding = extractAccessBindingHints(requestBody);
  const bindingClauses = buildBindingClause(binding);
  if (!tokens.transactionId && !tokens.requestId && !tokens.receiptId && !tokens.orderId && !bindingClauses.length) return null;

  const featureKeys = uniqueStrings(
    (Array.isArray(rules) ? rules : []).flatMap((rule) => {
      const key = String(rule?.featureKey || "").trim();
      if (!key) return [];
      return [key, normalizePaidFeatureKey(key)];
    }),
  );

  const featureQuery = featureKeys.length
    ? { featureKey: featureKeys.length > 1 ? { $in: featureKeys } : featureKeys[0] }
    : {};

  if (tokens.transactionId) {
    try {
      const byTransaction = await PointHistory.findOne({
        userId,
        kind: "deduct",
        ...featureQuery,
        $and: [
          {
            $or: [
          { _id: tokens.transactionId },
          { "metadata.requestId": tokens.transactionId },
          { "metadata.sourceTransactionId": tokens.transactionId },
          { "metadata.transactionId": tokens.transactionId },
          { "metadata.paymentId": tokens.transactionId },
          { "metadata.impUid": tokens.transactionId },
          { "metadata.merchantUid": tokens.transactionId },
            ],
          },
          ...(bindingClauses.length ? [{ $or: bindingClauses }] : []),
        ],
      })
        .select("_id createdAt delta featureKey reason metadata")
        .sort({ createdAt: -1 })
        .lean();
      if (byTransaction) return byTransaction;
    } catch (_) {
      // ignore and continue fallback lookup
    }
  }

  if (tokens.requestId) {
    const byRequestId = await PointHistory.findOne({
      userId,
      kind: "deduct",
      ...featureQuery,
      $and: [
        { "metadata.requestId": tokens.requestId },
        ...(bindingClauses.length ? [{ $or: bindingClauses }] : []),
      ],
    })
      .select("_id createdAt delta featureKey reason metadata")
      .sort({ createdAt: -1 })
      .lean();
    if (byRequestId) return byRequestId;
  }

  if (tokens.receiptId) {
    const byReceiptId = await PointHistory.findOne({
      userId,
      kind: "deduct",
      ...featureQuery,
      $and: [
        {
          $or: [
            { "metadata.receiptId": tokens.receiptId },
            { "metadata.receipt": tokens.receiptId },
          ],
        },
        ...(bindingClauses.length ? [{ $or: bindingClauses }] : []),
      ],
    })
      .select("_id createdAt delta featureKey reason metadata")
      .sort({ createdAt: -1 })
      .lean();
    if (byReceiptId) return byReceiptId;
  }

  if (tokens.orderId) {
    const byOrderId = await PointHistory.findOne({
      userId,
      kind: "deduct",
      ...featureQuery,
      $and: [
        {
          $or: [
            { "metadata.orderId": tokens.orderId },
            { "metadata.merchantUid": tokens.orderId },
          ],
        },
        ...(bindingClauses.length ? [{ $or: bindingClauses }] : []),
      ],
    })
      .select("_id createdAt delta featureKey reason metadata")
      .sort({ createdAt: -1 })
      .lean();
    if (byOrderId) return byOrderId;
  }

  if (bindingClauses.length) {
    const byBindingOnly = await PointHistory.findOne({
      userId,
      kind: "deduct",
      ...featureQuery,
      $or: bindingClauses,
    })
      .select("_id createdAt delta featureKey reason metadata")
      .sort({ createdAt: -1 })
      .lean();
    if (byBindingOnly) return byBindingOnly;
  }

  return null;
}

function buildPaymentRequiredResult(reportType, requiredRules = [], requestBody = {}) {
  const hint = requiredRules.length
    ? requiredRules.map((rule) => `${rule.featureKey}:${rule.minCost}`).join(", ")
    : "unlock-or-payment";
  const binding = extractAccessBindingHints(requestBody);
  const missing = [];
  if (!String(binding.sessionId || "").trim()) missing.push("sessionId");
  if (!String(binding.purchaseId || "").trim()) missing.push("purchaseId");
  if (!String(binding.reportId || "").trim()) missing.push("reportId");

  return {
    ok: false,
    status: 402,
    code: "PAYMENT_REQUIRED",
    message: "프리미엄 결제 또는 포인트 결제가 확인되지 않았습니다.",
    reportType,
    required: hint,
    reason: "PAYMENT_EVIDENCE_NOT_FOUND",
    missing,
  };
}

// 출생 기반 키를 저장 프로필 없이 물었으면 잠금 사유를 "프로필 필요"로 바꿔 알린다(상태는 402 유지 —
// 이번 결제 증빙 경로는 여전히 열 수 있으므로 요청 자체가 잘못된 건 아니다).
function markMissingBirthProfile(denied, { profileId = "", candidateKeys = [] } = {}) {
  if (profileId || !candidateKeys.some((key) => isBirthScopedUnlockFeatureKey(key))) return denied;
  return {
    ...denied,
    reason: "MISSING_PROFILE_ID",
    requiresProfile: true,
    message: "프로필을 저장한 뒤 구매해 주세요.",
  };
}

export async function requirePremiumReportAccess(env, userId, reportType, requestBody = {}, options = {}) {
  const normalizedReportType = String(reportType || "").trim();
  const isPerUsePdfReportType = normalizedReportType === "ziweiPremium";
  const unlockPolicy = uniqueStrings(PREMIUM_UNLOCK_POLICY[normalizedReportType] || []);
  const alternativeRules = buildAlternativePaymentRules(normalizedReportType, requestBody);
  const requiredRules = buildRequiredPaymentRules(normalizedReportType, requestBody);
  const payment = requestBody && typeof requestBody.payment === "object" ? requestBody.payment : {};
  const paymentContext = requestBody && typeof requestBody._paymentContext === "object" ? requestBody._paymentContext : {};
  const consume = requestBody && typeof requestBody.consume === "object" ? requestBody.consume : {};
  const receivedFeatureKey = String(
    requestBody?.featureKey
    || requestBody?.featureType
    || payment?.featureKey
    || consume?.featureKey
    || requestBody?.subFeatureKey
    || "",
  ).trim();
  const logSajuAccessResolved = () => {};
  // 증빙 claim(1건 = 요청 1건)은 회당 리포트에만 건다. options.claimBindingKey 는 같은 requestId 안에서도
  // 결과가 달라지는 리포트(숙요 전생 리딩 = 상대 조합)가 그 조합까지 묶을 때 쓴다.
  const perUseReport = alternativeRules.some((rule) => isPerUsePaidFeatureKey(rule?.featureKey));
  const baseClaimRequestId = premiumReportRequestId(requestBody);
  const claimBindingKey = String(options?.claimBindingKey || "").trim();
  const claimRequestId = baseClaimRequestId && claimBindingKey ? `${baseClaimRequestId}|${claimBindingKey}` : baseClaimRequestId;
  const claimEvidence = (evidenceId, featureKey) => claimPremiumReportEvidence(env, { perUse: perUseReport, userId, claimRequestId, featureKey, evidenceId });
  const premiumAccessToken = String(
    requestBody?.premiumAccessToken
    || requestBody?._premiumAccessToken
    || payment?.premiumAccessToken
    || payment?._premiumAccessToken
    || paymentContext?.premiumAccessToken
    || paymentContext?._premiumAccessToken
    || consume?.premiumAccessToken
    || consume?._premiumAccessToken
    || "",
  ).trim();
  if (premiumAccessToken) {
    const tokenCheck = await verifyPremiumAccessToken(premiumAccessToken, env, {
      userId: String(userId || ""),
      reportType: normalizedReportType,
    });
    if (tokenCheck.ok && premiumTokenMatchesCurrentAccessRules(tokenCheck.payload, alternativeRules, requiredRules)) {
      const tokenPayload = tokenCheck.payload || {};
      const tokenTransactionId = String(tokenPayload.transactionId || requestBody?.sourceTransactionId || requestBody?.transactionId || "").trim();
      const tokenFeatureKey = String(tokenPayload.featureKey || requestBody?.featureKey || "").trim();
      const tokenChargedCoins = Math.max(0, Math.abs(Number(tokenPayload.chargedCoins || requestBody?.chargedCoins || 0)));
      const tokenClaim = await claimEvidence(tokenTransactionId, tokenFeatureKey);
      if (tokenClaim === "unavailable") return premiumEvidenceUnavailableResult(normalizedReportType);
      if (tokenClaim === "ok") {
        const allowed = {
          ok: true,
          accessType: "signed-payment-token",
          reportType: normalizedReportType,
          matchedTransactionId: tokenTransactionId,
          featureKey: tokenFeatureKey,
          chargedCoins: tokenChargedCoins,
        };
        logSajuAccessResolved(allowed);
        return allowed;
      }
    }

    // 결제 토큰은 유효하지만 cost/feature 정규화가 맞지 않는 경우, DB 증빙으로 최종 확인한다.
    if (tokenCheck.ok) {
      const tokenPayload = tokenCheck.payload || {};
      const tokenEvidenceRequest = {
        ...requestBody,
        transactionId: String(tokenPayload.transactionId || requestBody?.transactionId || "").trim(),
        sourceTransactionId: String(tokenPayload.transactionId || requestBody?.sourceTransactionId || "").trim(),
        paymentId: String(tokenPayload.transactionId || requestBody?.paymentId || "").trim(),
        requestId: String(requestBody?.requestId || "").trim(),
        purchaseId: String(requestBody?.purchaseId || requestBody?.reportPurchaseId || tokenPayload.transactionId || "").trim(),
        featureKey: String(requestBody?.featureKey || tokenPayload.featureKey || "").trim(),
      };

      const tokenBoundEvidence = await findEvidenceByPaymentTokens(userId, tokenEvidenceRequest, alternativeRules);
      const tokenBoundClaim = tokenBoundEvidence ? await claimEvidence(tokenBoundEvidence._id, tokenBoundEvidence.featureKey) : "used";
      if (tokenBoundClaim === "unavailable") return premiumEvidenceUnavailableResult(normalizedReportType);
      if (tokenBoundEvidence && tokenBoundClaim === "ok") {
        logPremiumAccessDecision({
          route: requestBody?._accessRoute,
          userId,
          reportType: normalizedReportType,
          featureKey: String(tokenBoundEvidence?.featureKey || ""),
          accessSource: "signed-payment-token-db-evidence",
          matchedTransactionId: String(tokenBoundEvidence?._id || ""),
        });
        const allowed = {
          ok: true,
          accessType: "signed-payment-token-db-evidence",
          reportType: normalizedReportType,
          matchedTransactionId: String(tokenBoundEvidence?._id || ""),
          featureKey: String(tokenBoundEvidence?.featureKey || ""),
          chargedCoins: Math.abs(Number(tokenBoundEvidence?.delta || 0)),
        };
        logSajuAccessResolved(allowed);
        return allowed;
      }
    }
  }

  if (!normalizedReportType || (!unlockPolicy.length && !alternativeRules.length && !requiredRules.length)) {
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      accessSource: "denied",
      deniedReason: "ACCESS_POLICY_MISSING",
    });
    const denied = {
      ok: false,
      status: 403,
      code: "ACCESS_POLICY_MISSING",
      message: "서버 접근 제어 정책이 정의되지 않은 reportType입니다.",
      reportType: normalizedReportType || null,
    };
    logSajuAccessResolved(denied);
    return denied;
  }

  await connectDb(env);

  // options.preloadedUserDoc: 호출부가 인증 단계에서 서버에서 직접 읽어 둔 User 문서. _id가 판정
  // 대상 userId와 같을 때만 채택해 아래 조회를 건너뛴다(RC-13). 요청 본문(requestBody._userDoc)은
  // 클라이언트가 위조할 수 있으므로 절대 읽지 않는다 — 위조 문서 하나로 유료 리포트가 열렸다.
  const preloadedUserDoc = options && typeof options.preloadedUserDoc === "object" ? options.preloadedUserDoc : null;
  const user = (preloadedUserDoc && String(preloadedUserDoc._id || "") === String(userId || ""))
    ? preloadedUserDoc
    : await User.findById(userId)
      .select("_id unlockedFeatures profileSubscription subscription membership membershipPass pass entitlement licensePass accessGateResult plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
      .lean();

  if (!user?._id) {
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      accessSource: "denied",
      deniedReason: "UNAUTHORIZED",
    });
    const denied = {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "유효한 사용자 인증이 필요합니다.",
      reportType: normalizedReportType,
    };
    logSajuAccessResolved(denied);
    return denied;
  }

  // 🔴 이용권 허용은 해금·결제 증빙을 모두 본 뒤 맨 끝(아래 settlePremiumPassReportAccess)에서 실제 차감과 함께만 준다.
  // 예전에는 여기서 차감 없이 바로 열어, 이용권만 있으면 8개 리포트가 몇 번이든 무료였다(2026-10-16).

  // 🔴 User.unlockedFeatures 는 계정 배열이라 출생 기반 키의 근거가 아니다(같은 계정의 다른 생년월일까지 열린다).
  // 계정 기반 키만 이 배열로 판정하고, 출생 기반 키는 아래 findPremiumContentEntitlement(BIRTH 행 + 레거시 USER/PROFILE 행)로만 연다.
  const accountUnlockPolicy = unlockPolicy.filter((key) => !isBirthScopedUnlockFeatureKey(key));
  const unlockSet = new Set(uniqueStrings(user.unlockedFeatures || []));
  const hasUnlock = accountUnlockPolicy.some((key) => unlockSet.has(key));

  // 메모리에 이미 있는 판정(hasUnlock)을 앞당겨, 그 아래 findPremiumContentEntitlement DB 조회를
  // 건너뛴다(RC-15d). requiredRules가 있으면 앞당기지 않는다 — 그 결제 바인딩은 hasUnlock 과
  // 무관하게 반드시 검증해야 하는 별도 요구사항이라(강제 결제 바인딩 우회 방지), 여기서 먼저
  // return 하면 아래 requiredRules 루프의 검증·entitlement 기록이 통째로 스킵된다.
  if (hasUnlock && !requiredRules.length) {
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      featureKey: accountUnlockPolicy[0] || "",
      accessSource: "unlock",
      entitlementId: accountUnlockPolicy[0] || "",
    });
    const allowed = {
      ok: true,
      accessType: "unlock",
      reportType: normalizedReportType,
      entitlementId: accountUnlockPolicy[0] || "",
    };
    logSajuAccessResolved(allowed);
    return allowed;
  }

  const profileId = extractPaidContentProfileId(requestBody);
  const entitlementCandidateKeys = buildPremiumUnlockCandidateKeys({
    unlockPolicy,
    alternativeRules,
    requiredRules,
    receivedFeatureKey,
  });
  const entitlementUnlock = isPerUsePdfReportType ? null : await findPremiumContentEntitlement({
    userId: user._id,
    profileId,
    candidateKeys: entitlementCandidateKeys,
    env,
  });
  if (entitlementUnlock?.unlock?._id) {
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      featureKey: entitlementUnlock.featureKey,
      accessSource: "already_unlocked",
      entitlementId: String(entitlementUnlock.unlock._id || ""),
    });
    const allowed = {
      ok: true,
      accessType: "already_unlocked",
      reportType: normalizedReportType,
      entitlementId: String(entitlementUnlock.unlock._id || ""),
      featureKey: entitlementUnlock.featureKey,
    };
    logSajuAccessResolved(allowed);
    return allowed;
  }

  if (requiredRules.length) {
    for (let i = 0; i < requiredRules.length; i += 1) {
      const evidence = await findEvidenceByPaymentTokens(user._id, requestBody, [requiredRules[i]]);
      if (!evidence) {
        logPremiumAccessDecision({
          route: requestBody?._accessRoute,
          userId,
          reportType: normalizedReportType,
          featureKey: String(requiredRules[i]?.featureKey || ""),
          accessSource: "denied",
          deniedReason: "REQUIRED_PAYMENT_BINDING_NOT_MATCHED",
        });
        const denied = markMissingBirthProfile(
          buildPaymentRequiredResult(normalizedReportType, requiredRules, requestBody),
          { profileId, candidateKeys: entitlementCandidateKeys },
        );
        logSajuAccessResolved(denied);
        return denied;
      }
      if (!isPerUsePdfReportType) {
        await upsertPremiumContentEntitlementFromEvidence({
          userId: user._id,
          profileId,
          featureKey: String(evidence?.featureKey || requiredRules[i]?.featureKey || receivedFeatureKey || ""),
          evidence,
        });
      }
    }
  }

  if (hasUnlock) {
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      featureKey: accountUnlockPolicy[0] || "",
      accessSource: "unlock",
      entitlementId: accountUnlockPolicy[0] || "",
    });
    const allowed = {
      ok: true,
      accessType: "unlock",
      reportType: normalizedReportType,
      entitlementId: accountUnlockPolicy[0] || "",
    };
    logSajuAccessResolved(allowed);
    return allowed;
  }

  const tokenEvidence = await findEvidenceByPaymentTokens(user._id, requestBody, alternativeRules);
  const tokenEvidenceClaim = tokenEvidence ? await claimEvidence(tokenEvidence._id, tokenEvidence.featureKey) : "used";
  if (tokenEvidenceClaim === "unavailable") return premiumEvidenceUnavailableResult(normalizedReportType);
  if (tokenEvidence && tokenEvidenceClaim === "ok") {
    if (!isPerUsePdfReportType) {
      await upsertPremiumContentEntitlementFromEvidence({
        userId: user._id,
        profileId,
        featureKey: String(tokenEvidence?.featureKey || receivedFeatureKey || alternativeRules[0]?.featureKey || ""),
        evidence: tokenEvidence,
      });
    }
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      featureKey: String(tokenEvidence?.featureKey || ""),
      accessSource: "strict-payment-binding",
      matchedTransactionId: String(tokenEvidence?._id || ""),
    });
    const allowed = {
      ok: true,
      accessType: "strict-payment-binding",
      reportType: normalizedReportType,
      matchedTransactionId: String(tokenEvidence?._id || ""),
      featureKey: String(tokenEvidence?.featureKey || ""),
      chargedCoins: Math.abs(Number(tokenEvidence?.delta || 0)),
    };
    logSajuAccessResolved(allowed);
    return allowed;
  }

  const passAccess = resolvePremiumPassReportAccess(user, {
    normalizedReportType,
    requestBody,
    requiredRules,
    alternativeRules,
    unlockPolicy,
    receivedFeatureKey,
  });
  if (passAccess?.ok) {
    const settled = await settlePremiumPassReportAccess(env, {
      userId: user._id,
      profileId,
      normalizedReportType,
      requestBody,
      alternativeRules,
      unlockPolicy,
    });
    if (settled.allowed === null) {
      const degraded = {
        ok: false,
        status: 503,
        code: "PAYMENT_VERIFY_UNAVAILABLE",
        message: "결제 확인이 잠시 지연되고 있어요. 잠시 후 다시 시도해 주세요.",
        reportType: normalizedReportType,
      };
      logSajuAccessResolved(degraded);
      return degraded;
    }
    // 이용권 차감은 (기능 키, requestId)별이라 그 자체로 1회다. 바인딩 키가 있으면 같은 requestId 로
    // 다른 조합을 여는 재생까지 막는다(차감 1건 = 조합 1건).
    const passClaim = settled.allowed && claimBindingKey
      ? await claimEvidence(`pass-use:${String(user._id)}:${settled.featureKey}:${baseClaimRequestId}`, settled.featureKey)
      : "ok";
    if (passClaim === "unavailable") return premiumEvidenceUnavailableResult(normalizedReportType);
    if (settled.allowed && passClaim === "ok") {
      const allowed = { ...passAccess, featureKey: settled.featureKey, chargedCoins: settled.coinPrice, settledSource: settled.source };
      logPremiumAccessDecision({
        route: requestBody?._accessRoute,
        userId,
        reportType: normalizedReportType,
        featureKey: settled.featureKey,
        accessSource: passAccess.accessType,
        entitlementId: passAccess.passTier,
      });
      logSajuAccessResolved(allowed);
      return allowed;
    }
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      featureKey: settled.featureKey,
      accessSource: "denied",
      deniedReason: `PASS_NOT_SETTLED:${settled.reason || "PAYMENT_REQUIRED"}`,
    });
  }

  if (["celestialHarmony", "geomancyOracle", "yogaGuruCourse", "sajuCompatBasic", "petSajuReport", "petCompatReport", "destinyCompassDeepReport"].includes(normalizedReportType) && alternativeRules.length) {
    for (let i = 0; i < alternativeRules.length; i += 1) {
      // 창 안의 차감이 이미 다른 요청에 쓰였으면 다음(더 오래된) 차감을 본다 — 최대 5건.
      const tried = [];
      let evidence = null;
      while (tried.length < RECENT_WINDOW_CLAIM_CANDIDATES) {
        const candidate = await findRecentDeductionEvidence(user._id, alternativeRules[i], { excludeIds: tried });
        if (!candidate?._id) break;
        const claim = await claimEvidence(candidate._id, candidate.featureKey);
        if (claim === "unavailable") return premiumEvidenceUnavailableResult(normalizedReportType);
        if (claim === "ok") { evidence = candidate; break; }
        tried.push(candidate._id);
      }
      if (!evidence) continue;
      logPremiumAccessDecision({
        route: requestBody?._accessRoute,
        userId,
        reportType: normalizedReportType,
        featureKey: String(evidence?.featureKey || ""),
        accessSource: "recent-payment-window",
        matchedTransactionId: String(evidence?._id || ""),
      });
      const allowed = {
        ok: true,
        accessType: "recent-payment-window",
        reportType: normalizedReportType,
        matchedTransactionId: String(evidence?._id || ""),
        featureKey: String(evidence?.featureKey || ""),
        chargedCoins: Math.abs(Number(evidence?.delta || 0)),
      };
      logSajuAccessResolved(allowed);
      return allowed;
    }
  }

  logPremiumAccessDecision({
    route: requestBody?._accessRoute,
    userId,
    reportType: normalizedReportType,
    featureKey: String(alternativeRules?.[0]?.featureKey || ""),
    accessSource: "denied",
    deniedReason: "STRICT_PAYMENT_BINDING_NOT_MATCHED",
  });
  const denied = markMissingBirthProfile(
    buildPaymentRequiredResult(normalizedReportType, alternativeRules.length ? alternativeRules : unlockPolicy, requestBody),
    { profileId, candidateKeys: entitlementCandidateKeys },
  );
  logSajuAccessResolved(denied);
  return denied;
}

export const __accessControlTestUtils = {
  extractPaidContentProfileId,
  buildAlternativePaymentRules,
  buildRequiredPaymentRules,
  extractPaymentLookupTokens,
};
