import { connectDb } from "./db.js";
import { User, PointHistory } from "./models.js";
import { normalizePaidFeatureKey } from "./paid-feature-registry.js";
import { verifyPremiumAccessToken } from "./premium-access-token.js";

export const PREMIUM_UNLOCK_POLICY = Object.freeze({
  sajuNewYear: ["premiumDivinationPack"],
  lifeBook: ["premiumDivinationPack"],
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
        featureKey: "premium_pdf_saju_life_book",
        reason: "인생의 책 생성 (12챕터)",
        minCost: 500,
        windowMinutes: 120,
      },
      {
        featureKey: "premium-lifebook-report",
        reason: "인생의 책 생성 (12챕터)",
        minCost: 500,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: "인생의 책 생성 (12챕터)",
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
  if (!strictReason) return null;

  return PointHistory.findOne({
    ...baseQuery,
    reason: strictReason,
  })
    .select("_id createdAt delta featureKey reason metadata")
    .sort({ createdAt: -1 })
    .lean();
}

function extractPaymentLookupTokens(requestBody = {}) {
  const source = requestBody && typeof requestBody === "object" ? requestBody : {};
  const payment = source.payment && typeof source.payment === "object" ? source.payment : {};
  const alt = source._paymentContext && typeof source._paymentContext === "object" ? source._paymentContext : {};
  const consume = source.consume && typeof source.consume === "object" ? source.consume : {};

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

  return {
    transactionId,
    requestId,
    receiptId,
    orderId,
  };
}

function extractAccessBindingHints(requestBody = {}) {
  const source = requestBody && typeof requestBody === "object" ? requestBody : {};
  const payment = source.payment && typeof source.payment === "object" ? source.payment : {};
  const consume = source.consume && typeof source.consume === "object" ? source.consume : {};
  const ctx = source._paymentContext && typeof source._paymentContext === "object" ? source._paymentContext : {};
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
    reportId: String(source.reportId || source.reportSessionId || source.generationId || "").trim(),
    sessionId: String(source.sessionId || source.chapterSessionId || source.generationSessionId || "").trim(),
    requestId: String(source.requestId || source.sourceRequestId || payment.requestId || consume.requestId || ctx.requestId || "").trim(),
    transactionId: String(
      source.transactionId
      || source.sourceTransactionId
      || source.paymentId
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
  if (binding.sessionId) clauses.push({ "metadata.sessionId": binding.sessionId });
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
  if (strictReason && evidenceReason && strictReason !== evidenceReason) return false;

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
  const modeToken = normalizeModeToken(requestBody);
  const isCouple = modeToken.includes("couple") || modeToken.includes("compat");
  if (!isCouple) return null;

  const baseRules = [
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

  return null;
}

function buildPaymentRequiredResult(reportType, requiredRules = []) {
  const hint = requiredRules.length
    ? requiredRules.map((rule) => `${rule.featureKey}:${rule.minCost}`).join(", ")
    : "unlock-or-payment";

  return {
    ok: false,
    status: 402,
    code: "PAYMENT_REQUIRED",
    message: "프리미엄 결제 또는 포인트 결제가 확인되지 않았습니다.",
    reportType,
    required: hint,
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
      return {
        ok: true,
        accessType: "signed-payment-token",
        reportType: normalizedReportType,
      };
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
    return {
      ok: false,
      status: 403,
      code: "ACCESS_POLICY_MISSING",
      message: "서버 접근 제어 정책이 정의되지 않은 reportType입니다.",
      reportType: normalizedReportType || null,
    };
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
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "유효한 사용자 인증이 필요합니다.",
      reportType: normalizedReportType,
    };
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
        return buildPaymentRequiredResult(normalizedReportType, requiredRules);
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
    return {
      ok: true,
      accessType: "unlock",
      reportType: normalizedReportType,
      entitlementId: unlockPolicy[0] || "",
    };
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
  return buildPaymentRequiredResult(normalizedReportType, alternativeRules.length ? alternativeRules : unlockPolicy);
}

export const __accessControlTestUtils = {
  buildAlternativePaymentRules,
  buildRequiredPaymentRules,
  extractPaymentLookupTokens,
};
