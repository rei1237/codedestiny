import { connectDb } from "./db.js";
import { User, PointHistory } from "./models.js";
import { normalizePaidFeatureKey } from "./paid-feature-registry.js";
import { verifyPremiumAccessToken } from "./premium-access-token.js";

export const PREMIUM_UNLOCK_POLICY = Object.freeze({
  sajuNewYear: ["premiumDivinationPack"],
  lifeBook: ["premiumDivinationPack"],
  sajuLifeBook: ["saju_lifebook_pdf", "premiumDivinationPack"],
  loveSecret: ["premium-love-secret", "premiumDivinationPack", "premium-naming"],
  ziweiPremium: ["premium-ziwei", "premiumDivinationPack"],
  westernAstrologyPremium: ["premium-astrology", "premiumDivinationPack"],
  sookyoPremium: ["premium-sukuyo", "premiumDivinationPack"],
  vedicPremium: ["premium-veda", "premiumDivinationPack"],
});

function uniqueStrings(values) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ));
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

export function buildAlternativePaymentRules(reportType, requestBody = {}) {
  if (reportType === "sibylDominator") {
    return [{
      featureKey: "premium-sibyl-dominator",
      reason: "시빌라 도미네이터 리포트",
      minCost: 100,
      windowMinutes: 45,
    }];
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

  if (reportType === "sajuLifeBook") {
    return [
      {
        featureKey: "saju_lifebook_pdf",
        reason: "사주 인생의 책 PDF 생성",
        minCost: 500,
        windowMinutes: 90,
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
    sessionId: String(source.sessionId || grant.sessionId || source.chapterSessionId || source.generationSessionId || "").trim(),
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
  const rules = uniqueStrings([]).length
    ? []
    : [...(Array.isArray(requiredRules) ? requiredRules : []), ...(Array.isArray(alternativeRules) ? alternativeRules : [])];
  if (!rules.length) return true;

  const evidence = {
    featureKey: tokenPayload?.featureKey,
    reason: tokenPayload?.reason,
    chargedCoins: Number(tokenPayload?.chargedCoins || 0),
    delta: -Math.abs(Number(tokenPayload?.chargedCoins || 0)),
  };

  return rules.some((rule) => paymentEvidenceMatchesRule(evidence, rule));
}

async function findLoveSecretBasePlusCompatibilityEvidence(userId, requestBody = {}) {
  return null;
}

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

export async function requirePremiumReportAccess(env, userId, reportType, requestBody = {}) {
  const normalizedReportType = String(reportType || "").trim();
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
      expectedFeatureKey: "removed",
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

  if (normalizedReportType === "sajuNewYear") {
    const expectedFeatureKey = String((requiredRules[0] && requiredRules[0].featureKey) || (alternativeRules[0] && alternativeRules[0].featureKey) || "removed");
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
    if (tokenCheck.ok && premiumTokenMatchesCurrentAccessRules(tokenCheck.payload, alternativeRules, requiredRules)) {
      const allowed = {
        ok: true,
        accessType: "signed-payment-token",
        reportType: normalizedReportType,
      };
      logSajuAccessResolved(allowed);
      return allowed;
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
        const denied = buildPaymentRequiredResult(normalizedReportType, requiredRules, requestBody);
        logSajuAccessResolved(denied);
        return denied;
      }
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

  const tokenEvidence = await findEvidenceByPaymentTokens(user._id, requestBody, alternativeRules);
  if (tokenEvidence) {
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
    };
    logSajuAccessResolved(allowed);
    return allowed;
  }

  if (normalizedReportType === "lifeBook" && alternativeRules.length) {
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
};
