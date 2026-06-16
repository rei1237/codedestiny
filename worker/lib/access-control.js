import { connectDb } from "./db.js";
import { CONTENT_ENTITLEMENT_SOURCES, User, PointHistory } from "./models.js";
import {
  findActivePaidContentUnlock,
  upsertPaidContentUnlock,
} from "./content-unlocks.js";
import { normalizePaidFeatureKey } from "./paid-feature-registry.js";
import { verifyPremiumAccessToken } from "./premium-access-token.js";

export const PREMIUM_UNLOCK_POLICY = Object.freeze({
  sajuNewYear: ["premiumDivinationPack"],
  lifeBook: [],
  loveSecret: ["premium-love-secret", "premiumDivinationPack", "premium-naming"],
  ziweiPremium: ["premium-ziwei", "premiumDivinationPack"],
  westernAstrologyPremium: ["premium-astrology", "premiumDivinationPack"],
  sookyoPremium: ["premium-sukuyo", "premiumDivinationPack"],
  sukuyoPastLifeReading: ["sukuyo-past-life-reading", "premiumDivinationPack"],
  vedicPremium: ["premium-veda", "premiumDivinationPack"],
  celestialHarmony: ["premiumDivinationPack"],
  soulOriginKarma: ["premiumDivinationPack"],
  fptiPremium: ["premium-fpti-report"],
});

const ADMIN_TEST_USER_ID = "flower-admin";

function uniqueStrings(values) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ));
}

function isAdminTestAccessValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "admin_test"
    || normalized === "admin_bypass"
    || normalized === "admin-test"
    || normalized === "admin-bypass";
}

function hasAdminTestAccessContext(requestBody = {}) {
  const payment = requestBody && typeof requestBody.payment === "object" ? requestBody.payment : {};
  const paymentContext = requestBody && typeof requestBody._paymentContext === "object" ? requestBody._paymentContext : {};
  const legacyPaymentContext = requestBody && typeof requestBody.paymentContext === "object" ? requestBody.paymentContext : {};
  const consume = requestBody && typeof requestBody.consume === "object" ? requestBody.consume : {};
  const grant = requestBody && typeof requestBody.accessGrant === "object"
    ? requestBody.accessGrant
    : (payment.accessGrant && typeof payment.accessGrant === "object"
      ? payment.accessGrant
      : (paymentContext.accessGrant && typeof paymentContext.accessGrant === "object"
        ? paymentContext.accessGrant
        : (legacyPaymentContext.accessGrant && typeof legacyPaymentContext.accessGrant === "object"
          ? legacyPaymentContext.accessGrant
          : (consume.accessGrant && typeof consume.accessGrant === "object" ? consume.accessGrant : {}))));

  if (
    requestBody.adminTestMode === true
    || requestBody.adminBypass === true
    || payment.adminTestMode === true
    || payment.adminBypass === true
    || paymentContext.adminTestMode === true
    || paymentContext.adminBypass === true
    || legacyPaymentContext.adminTestMode === true
    || legacyPaymentContext.adminBypass === true
    || consume.adminTestMode === true
    || consume.adminBypass === true
    || grant.adminTestMode === true
    || grant.adminBypass === true
  ) {
    return true;
  }

  return [
    requestBody.paymentMode,
    requestBody.accessMode,
    payment.paymentMode,
    payment.accessMode,
    paymentContext.paymentMode,
    paymentContext.accessMode,
    legacyPaymentContext.paymentMode,
    legacyPaymentContext.accessMode,
    consume.paymentMode,
    consume.accessMode,
    grant.paymentMode,
    grant.accessMode,
    grant.accessType,
    grant.accessMethod,
  ].some(isAdminTestAccessValue);
}

function extractPaidContentProfileId(source = {}) {
  const payment = source && typeof source.payment === "object" ? source.payment : {};
  const alt = source && typeof source._paymentContext === "object" ? source._paymentContext : {};
  const consume = source && typeof source.consume === "object" ? source.consume : {};
  const grant = source && typeof source.accessGrant === "object" ? source.accessGrant : {};
  return String(
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

async function findPremiumContentEntitlement({ userId, profileId, candidateKeys = [] } = {}) {
  for (let i = 0; i < candidateKeys.length; i += 1) {
    const featureKey = candidateKeys[i];
    const unlock = await findActivePaidContentUnlock({ userId, profileId, featureKey });
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

function hasCompatibilityPartnerInputs(requestBody = {}) {
  const partnerYear = Number(requestBody?.partnerYear);
  const partnerMonth = Number(requestBody?.partnerMonth);
  const partnerDay = Number(requestBody?.partnerDay);
  const partnerBirthDate = String(requestBody?.partnerBirthDate || requestBody?.partnerDob || "").trim();
  const partner = requestBody && typeof requestBody.partner === "object" ? requestBody.partner : {};

  const nestedPartnerYear = Number(partner?.year);
  const nestedPartnerMonth = Number(partner?.month);
  const nestedPartnerDay = Number(partner?.day);
  const nestedPartnerBirthDate = String(partner?.birthDate || "").trim();

  const hasFlatPartnerDate = Number.isFinite(partnerYear) && Number.isFinite(partnerMonth) && Number.isFinite(partnerDay);
  const hasNestedPartnerDate = Number.isFinite(nestedPartnerYear) && Number.isFinite(nestedPartnerMonth) && Number.isFinite(nestedPartnerDay);

  return hasFlatPartnerDate
    || hasNestedPartnerDate
    || Boolean(partnerBirthDate)
    || Boolean(nestedPartnerBirthDate)
    || requestBody?.compatibility === true;
}

function normalizeModeToken(requestBody = {}) {
  const mode = String(requestBody?.mode || requestBody?.reportMode || "").trim().toLowerCase();
  const reportMode = String(requestBody?.reportType || "").trim().toLowerCase();
  const token = `${mode} ${reportMode}`.trim();
  if (token.includes("compat") || token.includes("couple")) return token;
  if (hasCompatibilityPartnerInputs(requestBody)) return `${token} compatibility`.trim();
  return token;
}

export function buildAlternativePaymentRules(reportType, requestBody = {}) {
  if (reportType === "sajuNewYear") {
    return [
      {
        featureKey: "saju_new_year_pdf",
        reason: "사주 신년운세 PDF 리포트 생성",
        minCost: 300,
        windowMinutes: 120,
      },
      {
        featureKey: "premium_pdf_saju_new_year",
        reason: "사주 신년운세 PDF 리포트 생성",
        minCost: 300,
        windowMinutes: 120,
      },
      {
        featureKey: "premium-saju-newyear-report",
        reason: "사주 신년운세 PDF 리포트 생성",
        minCost: 300,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "사주 신년운세 PDF 리포트 생성",
        minCost: 300,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "lifeBook") {
    return [
      {
        featureKey: "saju_life_book_pdf",
        reason: "인생의 책 생성 (13챕터)",
        minCost: 500,
        windowMinutes: 120,
      },
      {
        featureKey: "premium_pdf_saju_life_book",
        reason: "인생의 책 생성 (13챕터)",
        minCost: 500,
        windowMinutes: 120,
      },
      {
        featureKey: "premium-lifebook-report",
        reason: "인생의 책 생성 (13챕터)",
        minCost: 500,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "인생의 책 생성 (13챕터)",
        minCost: 500,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "loveSecret") {
    const modeToken = normalizeModeToken(requestBody);
    const isCouple = modeToken.includes("couple") || modeToken.includes("compat");
    return [
      {
        featureKey: "saju_love_book_pdf",
        reason: isCouple ? "사주 프리미엄 궁합 리포트 생성" : "사주 프리미엄 연애운 리포트 생성",
        minCost: isCouple ? 400 : 300,
        windowMinutes: 120,
      },
      {
        featureKey: isCouple ? "premium_pdf_saju_love_secret_compat" : "premium_pdf_saju_love_secret",
        reason: isCouple ? "사주 프리미엄 궁합 리포트 생성" : "사주 프리미엄 연애운 리포트 생성",
        minCost: isCouple ? 400 : 300,
        windowMinutes: 120,
      },
      {
        featureKey: isCouple ? "premium-love-secret-couple" : "premium-love-secret-solo",
        reason: isCouple ? "사주 프리미엄 궁합 리포트 생성" : "사주 프리미엄 연애운 리포트 생성",
        minCost: isCouple ? 400 : 300,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: isCouple ? "사주 프리미엄 궁합 리포트 생성" : "사주 프리미엄 연애운 리포트 생성",
        minCost: isCouple ? 400 : 300,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "ziweiPremium") {
    const modeToken = normalizeModeToken(requestBody);
    const isCompat = modeToken.includes("compat");
    return [
      {
        featureKey: isCompat ? "premium_pdf_ziwei_compat" : "premium_pdf_ziwei",
        reason: isCompat ? "자미두수 프리미엄 PDF 궁합 리포트 생성" : "자미두수 프리미엄 PDF 리포트 생성",
        minCost: isCompat ? 690 : 590,
        windowMinutes: 120,
      },
      {
        featureKey: isCompat ? "premium-ziwei-report-compat" : "premium-ziwei-report",
        reason: isCompat ? "자미두수 프리미엄 PDF 궁합 리포트 생성" : "자미두수 프리미엄 PDF 리포트 생성",
        minCost: isCompat ? 690 : 590,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: isCompat ? "자미두수 프리미엄 PDF 궁합 리포트 생성" : "자미두수 프리미엄 PDF 리포트 생성",
        minCost: isCompat ? 690 : 590,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "celestialHarmony") {
    return [
      {
        featureKey: "tarot-celestial-harmony",
        reason: "셀레스티얼 하모니 타로 리딩",
        minCost: 100,
        windowMinutes: 120,
      },
      {
        featureKey: "premium-celestial-harmony-report",
        reason: "셀레스티얼 하모니 타로 리딩",
        minCost: 100,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "셀레스티얼 하모니 타로 리딩",
        minCost: 100,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "sibylDominator") {
    return [{
      featureKey: "premium-sibyl-dominator",
      reason: "시빌라 도미네이터 리포트",
      minCost: 100,
      windowMinutes: 45,
    }];
  }

  if (reportType === "westernAstrologyPremium") {
    const modeToken = normalizeModeToken(requestBody);
    const isCompat = modeToken.includes("compat");
    return [
      {
        featureKey: isCompat ? "premium_pdf_western_astrology_compat" : "premium_pdf_western_astrology",
        reason: isCompat ? "점성술 프리미엄 PDF 궁합 리포트 생성" : "점성술 프리미엄 PDF 리포트 생성",
        minCost: isCompat ? 490 : 390,
        windowMinutes: 120,
      },
      {
        featureKey: isCompat ? "premium-astrology-report-compat" : "premium-astrology-report",
        reason: isCompat ? "점성술 프리미엄 PDF 궁합 리포트 생성" : "점성술 프리미엄 PDF 리포트 생성",
        minCost: isCompat ? 490 : 390,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: isCompat ? "점성술 프리미엄 PDF 궁합 리포트 생성" : "점성술 프리미엄 PDF 리포트 생성",
        minCost: isCompat ? 490 : 390,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "sookyoPremium") {
    const modeToken = normalizeModeToken(requestBody);
    const isCompat = modeToken.includes("compat");
    const baseRules = [
      {
        featureKey: "premium-sukuyo",
        reason: "숙요점 인생 총람 생성",
        minCost: 390,
        windowMinutes: 240,
      },
      {
        featureKey: "premium_pdf_sukyo",
        reason: "숙요점 프리미엄 PDF 리포트 생성",
        minCost: 390,
        windowMinutes: 240,
      },
      {
        featureKey: "premium-sukuyo-report",
        reason: "숙요점 프리미엄 PDF 리포트 생성",
        minCost: 390,
        windowMinutes: 240,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "숙요점 프리미엄 PDF 리포트 생성",
        minCost: 390,
        windowMinutes: 240,
      },
    ];

    if (!isCompat) return baseRules;

    return [
      ...baseRules,
      {
        featureKey: "premium_pdf_sukyo_compat",
        reason: "숙요점 프리미엄 PDF 궁합 리포트 생성",
        minCost: 490,
        windowMinutes: 240,
      },
      {
        featureKey: "premium-sukuyo-report-compat",
        reason: "숙요점 프리미엄 PDF 궁합 리포트 생성",
        minCost: 490,
        windowMinutes: 240,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "숙요점 프리미엄 PDF 궁합 리포트 생성",
        minCost: 490,
        windowMinutes: 240,
      },
    ];
  }

  if (reportType === "sukuyoPastLifeReading") {
    return [
      {
        featureKey: "sukuyo-past-life-reading",
        reason: "숙요 전생 인연 리딩",
        minCost: 100,
        windowMinutes: 240,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "숙요 전생 인연 리딩",
        minCost: 100,
        windowMinutes: 240,
      },
    ];
  }

  if (reportType === "vedicPremium") {
    return [
      {
        featureKey: "premium_pdf_vedic",
        reason: "베다 점성술 프리미엄 PDF 리포트 생성",
        minCost: 390,
        windowMinutes: 120,
      },
      {
        featureKey: "premium-vedic-report",
        reason: "베다 점성술 프리미엄 PDF 리포트 생성",
        minCost: 390,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "베다 점성술 프리미엄 PDF 리포트 생성",
        minCost: 390,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "soulOriginKarma") {
    return [
      {
        featureKey: "premium_pdf_soul_origin",
        reason: "운명의 업 생성",
        minCost: 690,
        windowMinutes: 120,
      },
      {
        featureKey: "soulOriginKarma",
        reason: "운명의 업 생성",
        minCost: 690,
        windowMinutes: 120,
      },
      {
        featureKey: "soul_origin_karma",
        reason: "운명의 업 생성",
        minCost: 690,
        windowMinutes: 120,
      },
      {
        featureKey: "soul-origin",
        reason: "운명의 업 생성",
        minCost: 690,
        windowMinutes: 120,
      },
      {
        featureKey: "premium-soul-origin-report",
        reason: "운명의 업 생성",
        minCost: 690,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "운명의 업 생성",
        minCost: 690,
        windowMinutes: 120,
      },
    ];
  }

  if (reportType === "fptiPremium") {
    return [
      {
        featureKey: "premium-fpti-report",
        reason: "FPTI 프리미엄 리포트 생성",
        minCost: 200,
        windowMinutes: 45,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "FPTI 프리미엄 리포트 생성",
        minCost: 200,
        windowMinutes: 45,
      },
    ];
  }

  return [];
}

export function buildRequiredPaymentRules(reportType, requestBody = {}) {
  return [];
}

async function findRecentDeductionEvidence(userId, rule) {
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

function buildContextBindingClause(binding = {}) {
  const clauses = [];
  if (binding.requestId) clauses.push({ "metadata.requestId": binding.requestId });
  if (binding.profileId) {
    clauses.push({ "metadata.profileId": binding.profileId });
    clauses.push({ "metadata.selectedProfileId": binding.profileId });
  }
  if (binding.reportId) clauses.push({ "metadata.reportId": binding.reportId });
  if (binding.sessionId) {
    clauses.push({ "metadata.sessionId": binding.sessionId });
    clauses.push({ "metadata.reportSessionId": binding.sessionId });
  }
  if (binding.purchaseId) clauses.push({ "metadata.purchaseId": binding.purchaseId });
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

function premiumTokenMatchesRequestBinding(tokenPayload = {}, binding = {}) {
  const tokenBinding = {
    reportId: String(tokenPayload?.reportId || "").trim(),
    sessionId: String(tokenPayload?.sessionId || tokenPayload?.reportSessionId || "").trim(),
    requestId: String(tokenPayload?.requestId || "").trim(),
    purchaseId: String(tokenPayload?.purchaseId || "").trim(),
  };
  const requestBinding = {
    reportId: String(binding?.reportId || "").trim(),
    sessionId: String(binding?.sessionId || "").trim(),
    requestId: String(binding?.requestId || "").trim(),
    purchaseId: String(binding?.purchaseId || "").trim(),
  };
  const pairs = [
    [tokenBinding.reportId, requestBinding.reportId],
    [tokenBinding.sessionId, requestBinding.sessionId],
    [tokenBinding.requestId, requestBinding.requestId],
    [tokenBinding.purchaseId, requestBinding.purchaseId],
  ];
  if (!pairs.some(([tokenValue]) => Boolean(tokenValue))) return false;
  if (!pairs.some(([, requestValue]) => Boolean(requestValue))) return false;
  return pairs.some(([tokenValue, requestValue]) => tokenValue && requestValue && tokenValue === requestValue);
}

function requiresContextBoundPremiumPaymentEvidence(reportType = "") {
  const normalized = String(reportType || "").trim();
  return normalized === "vedicPremium" || normalized === "soulOriginKarma";
}

async function findLoveSecretBasePlusCompatibilityEvidence(userId, requestBody = {}) {
  const modeToken = normalizeModeToken(requestBody);
  const isCouple = modeToken.includes("couple") || modeToken.includes("compat");
  if (!isCouple) return null;

  const baseRules = [
    {
      featureKey: "saju_love_book_pdf",
      reason: "사주 프리미엄 연애운 리포트 생성",
      minCost: 300,
      windowMinutes: 120,
    },
    {
      featureKey: "premium_pdf_saju_love_secret",
      reason: "사주 프리미엄 연애운 리포트 생성",
      minCost: 300,
      windowMinutes: 120,
    },
    {
      featureKey: "premium-love-secret-solo",
      reason: "사주 프리미엄 연애운 리포트 생성",
      minCost: 300,
      windowMinutes: 120,
    },
  ];
  const addonRules = [
    {
      featureKey: "coin-gate-per-use",
      reason: "연애 비책 궁합 분석",
      minCost: 100,
      windowMinutes: 120,
    },
  ];

  let baseEvidence = null;
  for (let i = 0; i < baseRules.length; i += 1) {
    baseEvidence = await findRecentDeductionEvidence(userId, baseRules[i]);
    if (baseEvidence) break;
  }
  if (!baseEvidence) return null;

  let addonEvidence = null;
  for (let i = 0; i < addonRules.length; i += 1) {
    addonEvidence = await findRecentDeductionEvidence(userId, addonRules[i]);
    if (addonEvidence) break;
  }
  if (!addonEvidence) return null;

  return { baseEvidence, addonEvidence };
}

async function findEvidenceByPaymentTokens(userId, requestBody = {}, rules = [], options = {}) {
  const tokens = extractPaymentLookupTokens(requestBody);
  const binding = extractAccessBindingHints(requestBody);
  const requireContextBinding = options?.requireContextBinding === true;
  const bindingClauses = requireContextBinding ? buildContextBindingClause(binding) : buildBindingClause(binding);
  if (requireContextBinding && !bindingClauses.length) return null;
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

export async function requirePremiumReportAccess(env, userId, reportType, requestBody = {}) {
  const normalizedReportType = String(reportType || "").trim();
  const isPerUsePdfReportType = normalizedReportType === "ziweiPremium" || normalizedReportType === "sookyoPremium" || normalizedReportType === "vedicPremium";
  const unlockPolicy = uniqueStrings(PREMIUM_UNLOCK_POLICY[normalizedReportType] || []);
  const alternativeRules = buildAlternativePaymentRules(normalizedReportType, requestBody);
  const requiredRules = buildRequiredPaymentRules(normalizedReportType, requestBody);
  const payment = requestBody && typeof requestBody.payment === "object" ? requestBody.payment : {};
  const paymentContext = requestBody && typeof requestBody._paymentContext === "object" ? requestBody._paymentContext : {};
  const consume = requestBody && typeof requestBody.consume === "object" ? requestBody.consume : {};
  const accessBinding = extractAccessBindingHints(requestBody);
  const receivedFeatureKey = String(
    requestBody?.featureKey
    || requestBody?.featureType
    || payment?.featureKey
    || consume?.featureKey
    || requestBody?.subFeatureKey
    || "",
  ).trim();
  const logSajuAccessResolved = (result = {}) => {
    if (normalizedReportType !== "sajuNewYear") return;
    console.info("[SajuNewYearAPI] access resolved", {
      ok: Boolean(result?.ok),
      expectedFeatureKey: "saju_new_year_pdf",
      receivedFeatureKey,
      hasSessionId: Boolean(String(accessBinding.sessionId || "").trim()),
      hasPurchaseId: Boolean(String(accessBinding.purchaseId || "").trim()),
      hasReportId: Boolean(String(accessBinding.reportId || "").trim()),
      reason: result?.reason || result?.code || null,
    });
  };
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
  const isAdminTestUser = String(userId || "").trim() === ADMIN_TEST_USER_ID;
  const hasRequestedAdminBypass = hasAdminTestAccessContext(requestBody);
  const hasAccessPolicy = Boolean(normalizedReportType && (unlockPolicy.length || alternativeRules.length || requiredRules.length));
  const requiresContextBoundPaymentEvidence = requiresContextBoundPremiumPaymentEvidence(normalizedReportType);

  if (isAdminTestUser && hasAccessPolicy) {
    const allowed = {
      ok: true,
      accessType: hasRequestedAdminBypass ? "admin_test" : "admin_test_auth",
      accessMethod: "ADMIN_TEST",
      paymentMode: "admin_bypass",
      reportType: normalizedReportType,
      featureKey: receivedFeatureKey,
      chargedCoins: 0,
      adminTestMode: true,
      adminBypass: true,
    };
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      featureKey: receivedFeatureKey,
      accessSource: "admin_test",
    });
    logSajuAccessResolved(allowed);
    return allowed;
  }

  if (hasRequestedAdminBypass) {
    const denied = {
      ok: false,
      status: 403,
      code: "ADMIN_VERIFICATION_FAILED",
      message: "관리자 테스트 권한을 확인할 수 없습니다.",
      reportType: normalizedReportType,
      featureKey: receivedFeatureKey,
      reason: "ADMIN_BYPASS_REQUIRES_SERVER_VERIFIED_ADMIN",
    };
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      featureKey: receivedFeatureKey,
      accessSource: "admin_test_denied",
      deniedReason: denied.reason,
    });
    logSajuAccessResolved(denied);
    return denied;
  }

  if (normalizedReportType === "sajuNewYear") {
    const expectedFeatureKey = String((requiredRules[0] && requiredRules[0].featureKey) || (alternativeRules[0] && alternativeRules[0].featureKey) || "saju_new_year_pdf");
    const receivedFeatureKey = String(requestBody?.featureKey || payment?.featureKey || consume?.featureKey || requestBody?.subFeatureKey || "");
    console.info("[SajuNewYear][Payment] CHECK_START", {
      expectedFeatureKey,
      receivedFeatureKey,
      expectedReportType: normalizedReportType,
      receivedReportType: String(requestBody?.reportType || requestBody?.type || normalizedReportType),
      hasPurchaseId: Boolean(String(requestBody?.purchaseId || requestBody?.reportPurchaseId || payment?.purchaseId || consume?.purchaseId || "").trim()),
      hasSessionId: Boolean(String(requestBody?.sessionId || requestBody?.reportSessionId || payment?.sessionId || payment?.reportSessionId || consume?.sessionId || consume?.reportSessionId || "").trim()),
      profileId: String(requestBody?.profileId || requestBody?.selectedProfileId || payment?.profileId || consume?.profileId || ""),
      status: "checking",
      reason: String(requestBody?.reason || payment?.reason || consume?.reason || "")
    });
  }

  if (premiumAccessToken) {
    const tokenCheck = await verifyPremiumAccessToken(premiumAccessToken, env, {
      userId: String(userId || ""),
      reportType: normalizedReportType,
    });
    if (isAdminTestUser && hasAccessPolicy && tokenCheck.ok) {
      const tokenPayload = tokenCheck.payload || {};
      const allowed = {
        ok: true,
        accessType: "admin_test_token",
        accessMethod: "ADMIN_TEST",
        paymentMode: "admin_bypass",
        reportType: normalizedReportType,
        matchedTransactionId: String(tokenPayload.transactionId || requestBody?.sourceTransactionId || requestBody?.transactionId || "").trim(),
        featureKey: String(tokenPayload.featureKey || receivedFeatureKey || "").trim(),
        chargedCoins: 0,
        adminTestMode: true,
        adminBypass: true,
      };
      logPremiumAccessDecision({
        route: requestBody?._accessRoute,
        userId,
        reportType: normalizedReportType,
        featureKey: allowed.featureKey,
        accessSource: "admin_test_token",
        matchedTransactionId: allowed.matchedTransactionId,
      });
      logSajuAccessResolved(allowed);
      return allowed;
    }
    const tokenBindingOk = requiresContextBoundPaymentEvidence
      ? premiumTokenMatchesRequestBinding(tokenCheck.payload, accessBinding)
      : true;
    if (tokenCheck.ok && tokenBindingOk && premiumTokenMatchesCurrentAccessRules(tokenCheck.payload, alternativeRules, requiredRules)) {
      const tokenPayload = tokenCheck.payload || {};
      const tokenTransactionId = String(tokenPayload.transactionId || requestBody?.sourceTransactionId || requestBody?.transactionId || "").trim();
      const tokenFeatureKey = String(tokenPayload.featureKey || requestBody?.featureKey || "").trim();
      const tokenChargedCoins = Math.max(0, Math.abs(Number(tokenPayload.chargedCoins || requestBody?.chargedCoins || 0)));
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

      const tokenBoundEvidence = tokenBindingOk || !requiresContextBoundPaymentEvidence
        ? await findEvidenceByPaymentTokens(userId, tokenEvidenceRequest, alternativeRules, {
          requireContextBinding: requiresContextBoundPaymentEvidence,
        })
        : null;
      if (tokenBoundEvidence) {
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

  const user = await User.findById(userId)
    .select("_id unlockedFeatures")
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

  const unlockSet = new Set(uniqueStrings(user.unlockedFeatures || []));
  const hasUnlock = unlockPolicy.some((key) => unlockSet.has(key));
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
      const evidence = await findEvidenceByPaymentTokens(user._id, requestBody, [requiredRules[i]], {
        requireContextBinding: requiresContextBoundPaymentEvidence,
      });
      if (!evidence) {
        logPremiumAccessDecision({
          route: requestBody?._accessRoute,
          userId,
          reportType: normalizedReportType,
          featureKey: String(requiredRules[i]?.featureKey || ""),
          accessSource: "denied",
          deniedReason: "REQUIRED_PAYMENT_BINDING_NOT_MATCHED",
        });
        const denied = buildPaymentRequiredResult(normalizedReportType, requiredRules, requestBody);
        logSajuAccessResolved(denied);
        return denied;
      }
      await upsertPremiumContentEntitlementFromEvidence({
        userId: user._id,
        profileId,
        featureKey: String(evidence?.featureKey || requiredRules[i]?.featureKey || receivedFeatureKey || ""),
        evidence,
      });
    }
  }

  if (hasUnlock) {
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      featureKey: unlockPolicy[0] || "",
      accessSource: "unlock",
      entitlementId: unlockPolicy[0] || "",
    });
    const allowed = {
      ok: true,
      accessType: "unlock",
      reportType: normalizedReportType,
      entitlementId: unlockPolicy[0] || "",
    };
    logSajuAccessResolved(allowed);
    return allowed;
  }

  const tokenEvidence = await findEvidenceByPaymentTokens(user._id, requestBody, alternativeRules, {
    requireContextBinding: requiresContextBoundPaymentEvidence,
  });
  if (tokenEvidence) {
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

  if (normalizedReportType === "lifeBook" && alternativeRules.length) {
    for (let i = 0; i < alternativeRules.length; i += 1) {
      const evidence = await findRecentDeductionEvidence(user._id, alternativeRules[i]);
      if (!evidence) continue;
      await upsertPremiumContentEntitlementFromEvidence({
        userId: user._id,
        profileId,
        featureKey: String(evidence?.featureKey || alternativeRules[i]?.featureKey || receivedFeatureKey || ""),
        evidence,
      });
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

  if (normalizedReportType === "sajuNewYear" && alternativeRules.length) {
    for (let i = 0; i < alternativeRules.length; i += 1) {
      const evidence = await findRecentDeductionEvidence(user._id, alternativeRules[i]);
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

  if (normalizedReportType === "loveSecret" && alternativeRules.length) {
    for (let i = 0; i < alternativeRules.length; i += 1) {
      const evidence = await findRecentDeductionEvidence(user._id, alternativeRules[i]);
      if (!evidence) continue;
      logPremiumAccessDecision({
        route: requestBody?._accessRoute,
        userId,
        reportType: normalizedReportType,
        featureKey: String(evidence?.featureKey || ""),
        accessSource: "recent-payment-window",
        matchedTransactionId: String(evidence?._id || ""),
      });
      return {
        ok: true,
        accessType: "recent-payment-window",
        reportType: normalizedReportType,
        matchedTransactionId: String(evidence?._id || ""),
        featureKey: String(evidence?.featureKey || ""),
        chargedCoins: Math.abs(Number(evidence?.delta || 0)),
      };
    }

    const splitEvidence = await findLoveSecretBasePlusCompatibilityEvidence(user._id, requestBody);
    if (splitEvidence?.baseEvidence && splitEvidence?.addonEvidence) {
      logPremiumAccessDecision({
        route: requestBody?._accessRoute,
        userId,
        reportType: normalizedReportType,
        featureKey: String(splitEvidence?.baseEvidence?.featureKey || ""),
        accessSource: "recent-payment-window-split",
        matchedTransactionId: String(splitEvidence?.addonEvidence?._id || splitEvidence?.baseEvidence?._id || ""),
      });
      return {
        ok: true,
        accessType: "recent-payment-window-split",
        reportType: normalizedReportType,
        matchedTransactionId: String(splitEvidence?.addonEvidence?._id || splitEvidence?.baseEvidence?._id || ""),
        featureKey: String(splitEvidence?.baseEvidence?.featureKey || ""),
        chargedCoins: Math.abs(Number(splitEvidence?.baseEvidence?.delta || 0)) + Math.abs(Number(splitEvidence?.addonEvidence?.delta || 0)),
      };
    }
  }

  if (normalizedReportType === "celestialHarmony" && alternativeRules.length) {
    for (let i = 0; i < alternativeRules.length; i += 1) {
      const evidence = await findRecentDeductionEvidence(user._id, alternativeRules[i]);
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
  const denied = buildPaymentRequiredResult(normalizedReportType, alternativeRules.length ? alternativeRules : unlockPolicy, requestBody);
  logSajuAccessResolved(denied);
  return denied;
}

export const __accessControlTestUtils = {
  buildAlternativePaymentRules,
  buildRequiredPaymentRules,
  extractPaymentLookupTokens,
  premiumTokenMatchesRequestBinding,
  requiresContextBoundPremiumPaymentEvidence,
};
