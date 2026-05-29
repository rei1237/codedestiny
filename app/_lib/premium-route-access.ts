import { normalizePaidFeatureKey } from "../../worker/lib/paid-feature-registry.js";
import { getPointHistoryModel } from "./models/PointHistoryModel.js";
import { getUserModel } from "./models/UserModel.js";

type Rule = {
  featureKey: string;
  reason: string;
  minCost: number;
  windowMinutes: number;
};

const PREMIUM_UNLOCK_POLICY: Record<string, string[]> = {
  ziweiPremium: ["premium-ziwei", "premiumDivinationPack"],
  westernAstrologyPremium: ["premium-astrology", "premiumDivinationPack"],
  sookyoPremium: ["premium-sukuyo", "premiumDivinationPack"],
  vedicPremium: ["premium-veda", "premiumDivinationPack"],
  lifeBook: ["premiumDivinationPack"],
  loveSecret: ["premium-love-secret", "premiumDivinationPack", "premium-naming"],
  sajuNewYear: ["premiumDivinationPack"],
  soulOriginKarma: ["premiumDivinationPack"],
};

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ));
}

function logPremiumAccessDecision(payload: Record<string, unknown>) {
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
    console.warn("[PremiumAccessDecision][Next]", safe);
    return;
  }
  console.info("[PremiumAccessDecision][Next]", safe);
}

function hasCompatibilityPartnerInputs(requestBody: Record<string, unknown> = {}) {
  const partnerYear = Number(requestBody.partnerYear);
  const partnerMonth = Number(requestBody.partnerMonth);
  const partnerDay = Number(requestBody.partnerDay);
  const partnerBirthDate = String(requestBody.partnerBirthDate || requestBody.partnerDob || "").trim();
  const partner = requestBody.partner && typeof requestBody.partner === "object"
    ? requestBody.partner as Record<string, unknown>
    : {};

  const nestedPartnerYear = Number(partner.year);
  const nestedPartnerMonth = Number(partner.month);
  const nestedPartnerDay = Number(partner.day);
  const nestedPartnerBirthDate = String(partner.birthDate || "").trim();

  const hasFlatPartnerDate = Number.isFinite(partnerYear) && Number.isFinite(partnerMonth) && Number.isFinite(partnerDay);
  const hasNestedPartnerDate = Number.isFinite(nestedPartnerYear) && Number.isFinite(nestedPartnerMonth) && Number.isFinite(nestedPartnerDay);

  return hasFlatPartnerDate
    || hasNestedPartnerDate
    || Boolean(partnerBirthDate)
    || Boolean(nestedPartnerBirthDate)
    || requestBody.compatibility === true;
}

function normalizeModeToken(requestBody: Record<string, unknown> = {}) {
  const mode = String(requestBody.mode || requestBody.reportMode || "").trim().toLowerCase();
  const reportMode = String(requestBody.reportType || "").trim().toLowerCase();
  const token = `${mode} ${reportMode}`.trim();
  if (token.includes("compat") || token.includes("couple")) return token;
  if (hasCompatibilityPartnerInputs(requestBody)) return `${token} compatibility`.trim();
  return token;
}

function buildAlternativePaymentRules(reportType: string, requestBody: Record<string, unknown> = {}): Rule[] {
  if (reportType === "westernAstrologyPremium") {
    const isCompat = normalizeModeToken(requestBody).includes("compat");
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

  if (reportType === "vedicPremium") {
    const isCompat = normalizeModeToken(requestBody).includes("compat");
    if (isCompat) {
      return [
        {
          featureKey: "premium_pdf_vedic_compat",
          reason: "베다 점성술 프리미엄 PDF 궁합 리포트 생성",
          minCost: 490,
          windowMinutes: 120,
        },
        {
          featureKey: "premium-vedic-report-compat",
          reason: "베다 점성술 프리미엄 PDF 궁합 리포트 생성",
          minCost: 490,
          windowMinutes: 120,
        },
        {
          featureKey: "coin-gate-per-use",
          reason: "베다 점성술 프리미엄 PDF 궁합 리포트 생성",
          minCost: 490,
          windowMinutes: 120,
        },
      ];
    }

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

  if (reportType === "sookyoPremium") {
    const isCompat = normalizeModeToken(requestBody).includes("compat");
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
        featureKey: "premium-sukuyo-compat-extra",
        reason: "숙요점 궁합 확장 분석 추가",
        minCost: 300,
        windowMinutes: 240,
      },
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

  if (reportType === "ziweiPremium") {
    const isCompat = normalizeModeToken(requestBody).includes("compat");
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

  if (reportType === "soulOriginKarma") {
    return [
      {
        featureKey: "premium_pdf_soul_origin",
        reason: "운명의 기원서 생성",
        minCost: 690,
        windowMinutes: 120,
      },
      {
        featureKey: "premium-soul-origin-report",
        reason: "운명의 기원서 생성",
        minCost: 690,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "운명의 기원서 생성",
        minCost: 690,
        windowMinutes: 120,
      },
    ];
  }

  return [];
}

function extractPaymentLookupTokens(requestBody: Record<string, unknown> = {}) {
  const payment = requestBody.payment && typeof requestBody.payment === "object"
    ? requestBody.payment as Record<string, unknown>
    : {};
  const alt = requestBody._paymentContext && typeof requestBody._paymentContext === "object"
    ? requestBody._paymentContext as Record<string, unknown>
    : {};

  return {
    transactionId: String(
      requestBody.transactionId
      || requestBody.sourceTransactionId
      || payment.transactionId
      || payment.sourceTransactionId
      || alt.transactionId
      || alt.sourceTransactionId
      || "",
    ).trim(),
    requestId: String(requestBody.requestId || payment.requestId || alt.requestId || "").trim(),
  };
}

function extractAccessBindingHints(requestBody: Record<string, unknown> = {}) {
  const payment = requestBody.payment && typeof requestBody.payment === "object"
    ? requestBody.payment as Record<string, unknown>
    : {};
  const consume = requestBody.consume && typeof requestBody.consume === "object"
    ? requestBody.consume as Record<string, unknown>
    : {};
  const ctx = requestBody._paymentContext && typeof requestBody._paymentContext === "object"
    ? requestBody._paymentContext as Record<string, unknown>
    : {};
  const profile = requestBody.profile && typeof requestBody.profile === "object"
    ? requestBody.profile as Record<string, unknown>
    : {};

  return {
    route: String(requestBody._accessRoute || "").trim(),
    profileId: String(
      requestBody.profileId
      || requestBody.selectedProfileId
      || requestBody.profileKey
      || profile.profileId
      || profile.id
      || "",
    ).trim(),
    reportId: String(requestBody.reportId || requestBody.reportSessionId || requestBody.generationId || "").trim(),
    sessionId: String(requestBody.sessionId || requestBody.chapterSessionId || requestBody.generationSessionId || "").trim(),
    requestId: String(requestBody.requestId || requestBody.sourceRequestId || payment.requestId || consume.requestId || ctx.requestId || "").trim(),
    transactionId: String(
      requestBody.transactionId
      || requestBody.sourceTransactionId
      || requestBody.paymentId
      || payment.transactionId
      || payment.sourceTransactionId
      || consume.transactionId
      || ctx.transactionId
      || "",
    ).trim(),
  };
}

function buildBindingClause(binding: Record<string, string>) {
  const clauses: Record<string, unknown>[] = [];
  if (binding.requestId) clauses.push({ "metadata.requestId": binding.requestId });
  if (binding.transactionId) {
    clauses.push({ "metadata.sourceTransactionId": binding.transactionId });
    clauses.push({ "metadata.transactionId": binding.transactionId });
    clauses.push({ "metadata.paymentId": binding.transactionId });
    clauses.push({ "metadata.impUid": binding.transactionId });
    clauses.push({ "metadata.merchantUid": binding.transactionId });
    clauses.push({ "metadata.orderId": binding.transactionId });
    clauses.push({ _id: binding.transactionId });
  }
  if (binding.profileId) {
    clauses.push({ "metadata.profileId": binding.profileId });
    clauses.push({ "metadata.selectedProfileId": binding.profileId });
  }
  if (binding.reportId) clauses.push({ "metadata.reportId": binding.reportId });
  if (binding.sessionId) clauses.push({ "metadata.sessionId": binding.sessionId });
  return clauses;
}

async function findRecentDeductionEvidence(userId: string, rule: Rule) {
  const PointHistory = await getPointHistoryModel();
  const createdAtMin = new Date(Date.now() - Number(rule.windowMinutes || 30) * 60 * 1000);
  const featureKeys = uniqueStrings([rule.featureKey, normalizePaidFeatureKey(rule.featureKey)]);
  const query: Record<string, unknown> = {
    userId,
    kind: "deduct",
    featureKey: featureKeys.length > 1 ? { $in: featureKeys } : featureKeys[0],
    createdAt: { $gte: createdAtMin },
  };

  if (Number(rule.minCost) > 0) {
    query.delta = { $lte: -Math.floor(Number(rule.minCost)) };
  }

  if (!rule.reason) return null;

  return PointHistory.findOne({ ...query, reason: rule.reason })
    .select("_id createdAt delta featureKey reason metadata")
    .sort({ createdAt: -1 })
    .lean();
}

async function findEvidenceByPaymentTokens(userId: string, requestBody: Record<string, unknown>, rules: Rule[]) {
  const PointHistory = await getPointHistoryModel();
  const tokens = extractPaymentLookupTokens(requestBody);
  const binding = extractAccessBindingHints(requestBody);
  const bindingClauses = buildBindingClause(binding);
  if (!tokens.transactionId && !tokens.requestId && !bindingClauses.length) return null;

  const featureKeys = uniqueStrings(rules.flatMap((rule) => [rule.featureKey, normalizePaidFeatureKey(rule.featureKey)]));
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
            ],
          },
          ...(bindingClauses.length ? [{ $or: bindingClauses }] : []),
        ],
      })
        .select("_id createdAt delta featureKey reason metadata")
        .sort({ createdAt: -1 })
        .lean();
      if (byTransaction) return byTransaction;
    } catch (e) {
      // Ignore malformed ids and continue.
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

  return null;
}

function buildPaymentRequiredResult(reportType: string, rules: Rule[]) {
  return {
    ok: false,
    status: 402,
    code: "PAYMENT_REQUIRED",
    message: "프리미엄 결제 또는 포인트 결제가 확인되지 않았습니다.",
    reportType,
    required: rules.length ? rules.map((rule) => `${rule.featureKey}:${rule.minCost}`).join(", ") : "unlock-or-payment",
  };
}

export async function requirePremiumRouteAccess(userId: string, reportType: string, requestBody: Record<string, unknown> = {}) {
  const normalizedReportType = String(reportType || "").trim();
  const unlockPolicy = uniqueStrings(PREMIUM_UNLOCK_POLICY[normalizedReportType] || []);
  const alternativeRules = buildAlternativePaymentRules(normalizedReportType, requestBody);

  if (!normalizedReportType || (!unlockPolicy.length && !alternativeRules.length)) {
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      accessSource: "denied",
      deniedReason: "ACCESS_POLICY_MISSING",
    });
    return {
      ok: false,
      status: 403,
      code: "ACCESS_POLICY_MISSING",
      message: "서버 접근 제어 정책이 정의되지 않은 reportType입니다.",
      reportType: normalizedReportType || null,
    };
  }

  const User = await getUserModel();
  const user = await User.findById(userId).select("_id unlockedFeatures").lean();
  if (!user?._id) {
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      accessSource: "denied",
      deniedReason: "UNAUTHORIZED",
    });
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "유효한 사용자 인증이 필요합니다.",
      reportType: normalizedReportType,
    };
  }

  const unlockSet = new Set(uniqueStrings(Array.isArray(user.unlockedFeatures) ? user.unlockedFeatures : []));
  if (unlockPolicy.some((key) => unlockSet.has(key))) {
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      featureKey: unlockPolicy[0] || "",
      accessSource: "unlock",
      entitlementId: unlockPolicy[0] || "",
    });
    return { ok: true, accessType: "unlock", reportType: normalizedReportType, entitlementId: unlockPolicy[0] || "" };
  }

  const tokenEvidence = await findEvidenceByPaymentTokens(String(user._id), requestBody, alternativeRules);
  if (tokenEvidence) {
    logPremiumAccessDecision({
      route: requestBody?._accessRoute,
      userId,
      reportType: normalizedReportType,
      featureKey: String(tokenEvidence?.featureKey || ""),
      accessSource: "strict-payment-binding",
      matchedTransactionId: String(tokenEvidence?._id || ""),
    });
    return {
      ok: true,
      accessType: "strict-payment-binding",
      reportType: normalizedReportType,
      matchedTransactionId: String(tokenEvidence?._id || ""),
      featureKey: String(tokenEvidence?.featureKey || ""),
    };
  }

  logPremiumAccessDecision({
    route: requestBody?._accessRoute,
    userId,
    reportType: normalizedReportType,
    featureKey: String(alternativeRules?.[0]?.featureKey || ""),
    accessSource: "denied",
    deniedReason: "STRICT_PAYMENT_BINDING_NOT_MATCHED",
  });
  return buildPaymentRequiredResult(normalizedReportType, alternativeRules);
}