import { connectDb } from "./db.js";
import { User, PointHistory } from "./models.js";
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

function normalizeModeToken(requestBody = {}) {
  const mode = String(requestBody?.mode || requestBody?.reportMode || "").trim().toLowerCase();
  const reportMode = String(requestBody?.reportType || "").trim().toLowerCase();
  return `${mode} ${reportMode}`.trim();
}

export function buildAlternativePaymentRules(reportType, requestBody = {}) {
  if (reportType === "sajuNewYear") {
    return [
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
    const modeToken = normalizeModeToken(requestBody);
    const isCompat = modeToken.includes("compat");
    return [
      {
        featureKey: isCompat ? "premium_pdf_vedic_compat" : "premium_pdf_vedic",
        reason: isCompat ? "베다 점성술 프리미엄 PDF 궁합 리포트 생성" : "베다 점성술 프리미엄 PDF 리포트 생성",
        minCost: isCompat ? 490 : 390,
        windowMinutes: 120,
      },
      {
        featureKey: isCompat ? "premium-vedic-report-compat" : "premium-vedic-report",
        reason: isCompat ? "베다 점성술 프리미엄 PDF 궁합 리포트 생성" : "베다 점성술 프리미엄 PDF 리포트 생성",
        minCost: isCompat ? 490 : 390,
        windowMinutes: 120,
      },
      {
        featureKey: "coin-gate-per-use",
        reason: isCompat ? "베다 점성술 프리미엄 PDF 궁합 리포트 생성" : "베다 점성술 프리미엄 PDF 리포트 생성",
        minCost: isCompat ? 490 : 390,
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

  const baseQuery = {
    userId,
    kind: "deduct",
    featureKey: String(rule?.featureKey || "").trim(),
    createdAt: { $gte: createdAtMin },
  };

  if (minCost > 0) {
    baseQuery.delta = { $lte: -Math.floor(minCost) };
  }

  const strictReason = String(rule?.reason || "").trim();
  if (strictReason) {
    const strictEvidence = await PointHistory.findOne({
      ...baseQuery,
      reason: strictReason,
    })
      .select("_id createdAt delta featureKey reason")
      .sort({ createdAt: -1 })
      .lean();
    if (strictEvidence) return strictEvidence;
  }

  return PointHistory.findOne(baseQuery)
    .select("_id createdAt delta featureKey reason")
    .sort({ createdAt: -1 })
    .lean();
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
  const premiumAccessToken = String(
    requestBody?.premiumAccessToken
    || requestBody?._premiumAccessToken
    || "",
  ).trim();

  if (premiumAccessToken) {
    const tokenCheck = await verifyPremiumAccessToken(premiumAccessToken, env, {
      userId: String(userId || ""),
      reportType: normalizedReportType,
    });
    if (tokenCheck.ok) {
      return {
        ok: true,
        accessType: "signed-payment-token",
        reportType: normalizedReportType,
      };
    }
  }

  if (!normalizedReportType || (!unlockPolicy.length && !alternativeRules.length && !requiredRules.length)) {
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
      const evidence = await findRecentDeductionEvidence(user._id, requiredRules[i]);
      if (!evidence) {
        return buildPaymentRequiredResult(normalizedReportType, requiredRules);
      }
    }
  }

  if (hasUnlock) {
    return {
      ok: true,
      accessType: "unlock",
      reportType: normalizedReportType,
    };
  }

  for (let i = 0; i < alternativeRules.length; i += 1) {
    const evidence = await findRecentDeductionEvidence(user._id, alternativeRules[i]);
    if (evidence) {
      return {
        ok: true,
        accessType: "recent-payment",
        reportType: normalizedReportType,
      };
    }
  }

  return buildPaymentRequiredResult(normalizedReportType, alternativeRules.length ? alternativeRules : unlockPolicy);
}

export const __accessControlTestUtils = {
  buildAlternativePaymentRules,
  buildRequiredPaymentRules,
};
