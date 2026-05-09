import { connectDb } from "./db.js";
import { User, PointHistory } from "./models.js";

const PREMIUM_UNLOCK_POLICY = Object.freeze({
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

function buildAlternativePaymentRules(reportType, requestBody = {}) {
  if (reportType === "lifeBook") {
    return [{
      featureKey: "coin-gate-per-use",
      reason: "인생의 책 생성 (13챕터)",
      minCost: 490,
      windowMinutes: 30,
    }];
  }

  if (reportType === "loveSecret") {
    const modeToken = normalizeModeToken(requestBody);
    const isCouple = modeToken.includes("couple");
    return [{
      featureKey: isCouple ? "premium-love-secret-couple" : "premium-love-secret-solo",
      reason: isCouple ? "사주 프리미엄 궁합 리포트 생성" : "사주 프리미엄 연애운 리포트 생성",
      minCost: isCouple ? 500 : 300,
      windowMinutes: 45,
    }];
  }

  return [];
}

function buildRequiredPaymentRules(reportType, requestBody = {}) {
  if (reportType === "sookyoPremium") {
    const modeToken = normalizeModeToken(requestBody);
    if (modeToken.includes("compat")) {
      return [{
        featureKey: "premium-sukuyo-compat-extra",
        reason: "숙요점 궁합 확장 분석 추가",
        minCost: 300,
        windowMinutes: 120,
      }];
    }
  }

  return [];
}

async function findRecentDeductionEvidence(userId, rule) {
  const minutes = Number(rule?.windowMinutes || 30);
  const minCost = Number(rule?.minCost || 0);
  const createdAtMin = new Date(Date.now() - minutes * 60 * 1000);

  const query = {
    userId,
    kind: "deduct",
    featureKey: String(rule?.featureKey || "").trim(),
    reason: String(rule?.reason || "").trim(),
    createdAt: { $gte: createdAtMin },
  };

  if (minCost > 0) {
    query.delta = { $lte: -Math.floor(minCost) };
  }

  return PointHistory.findOne(query)
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
