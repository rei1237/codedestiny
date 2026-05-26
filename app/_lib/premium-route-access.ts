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
};

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ));
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

  if (rule.reason) {
    const strictEvidence = await PointHistory.findOne({ ...query, reason: rule.reason })
      .select("_id createdAt delta featureKey reason")
      .sort({ createdAt: -1 })
      .lean();
    if (strictEvidence) return strictEvidence;
  }

  return PointHistory.findOne(query)
    .select("_id createdAt delta featureKey reason")
    .sort({ createdAt: -1 })
    .lean();
}

async function findEvidenceByPaymentTokens(userId: string, requestBody: Record<string, unknown>, rules: Rule[]) {
  const PointHistory = await getPointHistoryModel();
  const tokens = extractPaymentLookupTokens(requestBody);
  if (!tokens.transactionId && !tokens.requestId) return null;

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
        $or: [
          { _id: tokens.transactionId },
          { "metadata.requestId": tokens.transactionId },
        ],
      })
        .select("_id createdAt delta featureKey reason metadata")
        .sort({ createdAt: -1 })
        .lean();
      if (byTransaction) return byTransaction;
    } catch {
      // Ignore malformed ids and continue.
    }
  }

  if (tokens.requestId) {
    const byRequestId = await PointHistory.findOne({
      userId,
      kind: "deduct",
      ...featureQuery,
      "metadata.requestId": tokens.requestId,
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
    return { ok: true, accessType: "unlock", reportType: normalizedReportType };
  }

  const tokenEvidence = await findEvidenceByPaymentTokens(String(user._id), requestBody, alternativeRules);
  if (tokenEvidence) {
    return { ok: true, accessType: "recent-payment-token-lookup", reportType: normalizedReportType };
  }

  for (const rule of alternativeRules) {
    const evidence = await findRecentDeductionEvidence(String(user._id), rule);
    if (evidence) {
      return { ok: true, accessType: "recent-payment", reportType: normalizedReportType };
    }
  }

  return buildPaymentRequiredResult(normalizedReportType, alternativeRules);
}