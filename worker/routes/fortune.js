import { connectDb, mongoose } from "../lib/db.js";
import { User, PointHistory, Payment } from "../lib/models.js";
import { getOptionalUserFromRequest, requireUserFromRequest } from "../lib/auth.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import {
  COIN_GATE_PER_USE_REASON_COSTS,
  FEATURE_KEY_PRICE_TABLE,
  PIG_COIN_UNLOCK_PRODUCTS,
  UNLOCK_PRODUCT_BY_FEATURE_KEY,
  listServerPricedFeatureKeys,
  normalizePaidFeatureKey,
  resolveFeatureReasonCost,
} from "../lib/paid-feature-registry.js";
import {
  buildZiweiAIPrompt,
  buildZiweiAIPromptWithDomain,
  ZIWEI_AI_PROMPT_FEATURE_KEY,
  ZIWEI_AI_PROMPT_PRICE,
} from "../lib/ziwei-ai-prompt.js";
import {
  buildSukuyoAIPrompt,
  buildSukuyoAIPromptWithDomain,
  SUKUYO_AI_PROMPT_FEATURE_KEY,
  SUKUYO_AI_PROMPT_PRICE,
} from "../lib/sukuyo-ai-prompt.js";
import {
  buildSajuAIPrompt,
  buildSajuAIPromptWithDomain,
  SAJU_AI_PROMPT_FEATURE_KEY,
  SAJU_AI_PROMPT_PRICE,
} from "../lib/saju-ai-prompt.js";
import {
  buildAstrologyAIPrompt,
  buildAstrologyAIPromptWithDomain,
  ASTROLOGY_AI_PROMPT_FEATURE_KEY,
  ASTROLOGY_AI_PROMPT_PRICE,
} from "../lib/astrology-ai-prompt.js";
import {
  buildVedicAIPrompt,
  VEDIC_AI_PROMPT_FEATURE_KEY,
  VEDIC_AI_PROMPT_PRICE,
} from "../lib/vedic-ai-prompt.js";
import {
  buildPremiumAccessCookie,
  createPremiumAccessToken,
  resolvePremiumAccessReportType,
} from "../lib/premium-access-token.js";
import { normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { calculateKrwAmountFromCoins } from "../lib/billing-policy.js";

const PIG_COIN_DEFAULT_UNLOCK_COST = 10;
const PIG_COIN_MAX_COST = 100000;
const ADMIN_TEST_USER_ID = "flower-admin";

let __swissWesternChartLoader = null;

async function loadSwissWesternChart() {
  if (!__swissWesternChartLoader) {
    __swissWesternChartLoader = import("../lib/swiss-ephemeris.js").then((mod) => mod.getSwissWesternChart);
  }
  return __swissWesternChartLoader;
}

const PIG_COIN_PACKAGES = {
  sample: { name: "Sample Pack", coins: 30, bonus: 0 },
  luckyMeal: { name: "Lucky Meal", coins: 100, bonus: 15 },
  goldBarn: { name: "Gold Barn", coins: 300, bonus: 60 },
  goldVault: { name: "Gold Vault", coins: 700, bonus: 180 },
  emperorReserve: { name: "Emperor Reserve", coins: 1500, bonus: 500 },
};

function isTruthyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isProductionRuntime(env) {
  const nodeEnv = String(env?.NODE_ENV || "").trim().toLowerCase();
  if (nodeEnv === "production") return true;

  const appEnv = String(env?.APP_ENV || env?.DEPLOY_ENV || env?.ENVIRONMENT || "").trim().toLowerCase();
  return appEnv === "prod" || appEnv === "production";
}

function buildJsonWithPremiumAccessCookie(body, init = {}, premiumAccessToken = "", env = {}) {
  const token = String(premiumAccessToken || "").trim();
  if (!token) return json(body, init);

  const headers = new Headers(init.headers || {});
  const secure = isProductionRuntime(env);
  headers.append("Set-Cookie", buildPremiumAccessCookie(token, secure));
  return json(body, { ...init, headers });
}

function isAdminPigCoinBypassEnabled(env) {
  return !isProductionRuntime(env) && isTruthyFlag(env?.ALLOW_ADMIN_PIG_COIN_BYPASS);
}

function isDynamicCostFallbackEnabled(env) {
  return !isProductionRuntime(env) && isTruthyFlag(env?.ALLOW_DYNAMIC_PIG_COIN_COST_FALLBACK);
}

function getForcePaidTestAccountEmails(env) {
  if (isProductionRuntime(env)) return new Set();

  const raw = String(env?.FORCE_PAID_TEST_ACCOUNT_EMAILS || "");
  const values = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return new Set(values);
}

function normalizeFeatureKey(rawKey) {
  return normalizePaidFeatureKey(rawKey);
}

function uniqueStrings(values) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ));
}

function collectAIPromptPaymentTokens(body = {}, requestId = "") {
  const accessGrant = body?.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const consume = body?.consume && typeof body.consume === "object" ? body.consume : {};
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  return uniqueStrings([
    requestId,
    body?.transactionId,
    body?.purchaseId,
    body?.paymentId,
    body?.merchantUid,
    body?.impUid,
    body?.orderId,
    body?.idempotencyKey,
    body?.requestId,
    accessGrant.evidenceId,
    accessGrant.purchaseId,
    accessGrant.paymentId,
    accessGrant.merchantUid,
    accessGrant.requestId,
    consume.transactionId,
    consume.purchaseId,
    consume.receiptId,
    consume.pointHistoryId,
    consume.paymentId,
    consume.merchantUid,
    consume.requestId,
    payment._id,
    payment.id,
    payment.transactionId,
    payment.purchaseId,
    payment.paymentId,
    payment.merchantUid,
    payment.impUid,
    payment.requestId,
    paymentContext.transactionId,
    paymentContext.purchaseId,
    paymentContext.paymentId,
    paymentContext.merchantUid,
    paymentContext.requestId,
  ]);
}

function buildAIPromptPaymentTokenClauses(tokens) {
  const clauses = [];
  for (const token of tokens) {
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.orderId": token });
    clauses.push({ "metadata.transactionId": token });
    clauses.push({ "metadata.sourceTransactionId": token });
    clauses.push({ "metadata.paymentId": token });
    clauses.push({ impUid: token });
    clauses.push({ merchantUid: token });
    if (mongoose.Types.ObjectId.isValid(token)) {
      clauses.push({ _id: token });
      clauses.push({ paymentId: token });
    }
  }
  return clauses;
}

function isAIPromptPassAccessPayload(body = {}) {
  const accessGrant = body?.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const consume = body?.consume && typeof body.consume === "object" ? body.consume : {};
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  const accessDecision = body?.accessDecision && typeof body.accessDecision === "object" ? body.accessDecision : {};
  const accessType = String(
    accessGrant.accessType
      || consume.accessType
      || payment.accessType
      || consume.transactionType
      || paymentContext.accessType
      || accessDecision.accessType
      || accessDecision.transactionType
      || body?.accessType
      || "",
  ).trim().toLowerCase();
  const accessMethod = String(
    accessGrant.accessMethod
      || consume.accessMethod
      || consume.paymentMethod
      || payment.paymentMethod
      || paymentContext.paymentMethod
      || accessDecision.accessMethod
      || accessDecision.paymentMethod
      || accessDecision.accessType
      || paymentContext.accessMethod
      || "",
  ).trim().toUpperCase();
  const accessReason = String(
    accessGrant.reason
      || consume.reason
      || payment.reason
      || accessDecision.reason
      || body?.accessReason
      || body?.reason
      || "",
  ).trim().toLowerCase();
  const accessStatus = String(
    accessDecision.status
      || body?.status
      || "",
  ).trim().toLowerCase();
  const paymentMode = String(
    body?.paymentMode
      || accessGrant.paymentMode
      || consume.paymentMode
      || payment.paymentMode
      || paymentContext.paymentMode
      || accessDecision.paymentMode
      || "",
  ).trim().toLowerCase();

  return body?.freeBySubscription === true
    || accessType === "membership_pass"
    || accessType === "usage_pass"
    || accessType === "already_unlocked"
    || accessType === "pass"
    || accessType === "membership"
    || accessType === "subscription_pass"
    || paymentMode === "membership_pass"
    || paymentMode === "membership"
    || accessStatus === "pass_applied"
    || accessStatus === "pass_free"
    || accessReason === "pass_applied"
    || accessReason === "pass_covered"
    || accessReason === "pass_free"
    || accessReason === "already_unlocked"
    || accessMethod === "PASS";
}

async function findAIPromptPaymentEvidence({ auth, featureKey, body, requestId, cost }) {
  const userId = String(auth?.userId || "").trim();
  const normalizedFeatureKey = normalizeFeatureKey(featureKey);
  const featureKeys = uniqueStrings([featureKey, normalizedFeatureKey]);
  const tokens = collectAIPromptPaymentTokens(body, requestId);
  const clauses = buildAIPromptPaymentTokenClauses(tokens);
  if (!userId || !featureKeys.length || !clauses.length) return null;

  const query = {
    userId,
    kind: "deduct",
    featureKey: featureKeys.length > 1 ? { $in: featureKeys } : featureKeys[0],
    $or: clauses,
  };
  const minCost = Math.floor(Number(cost || 0));
  if (minCost > 0 && !isAIPromptPassAccessPayload(body)) query.delta = { $lte: -minCost };

  return PointHistory.findOne(query)
    .select("_id delta balanceAfter featureKey reason metadata")
    .sort({ createdAt: -1 })
    .lean();
}

function readAIPromptAccessContext(body = {}) {
  const accessGrant = body?.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const consume = body?.consume && typeof body.consume === "object" ? body.consume : {};
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  const accessType = String(
    body?.accessType
      || accessGrant.accessType
      || consume.accessType
      || consume.transactionType
      || payment.accessType
      || paymentContext.accessType
      || "",
  ).trim().toLowerCase();
  const accessMethod = String(
    body?.accessMethod
      || accessGrant.accessMethod
      || consume.accessMethod
      || consume.paymentMethod
      || payment.accessMethod
      || payment.paymentMethod
      || paymentContext.accessMethod
      || "",
  ).trim().toUpperCase();
  const paymentMode = String(
    body?.paymentMode
      || body?.accessMode
      || accessGrant.paymentMode
      || consume.paymentMode
      || payment.paymentMode
      || paymentContext.paymentMode
      || "",
  ).trim().toUpperCase();

  return { accessGrant, consume, payment, paymentContext, accessType, accessMethod, paymentMode };
}

function isAIPromptAdminAccessPayload(body = {}) {
  const ctx = readAIPromptAccessContext(body);
  return ctx.accessType === "admin_test"
    || ctx.accessMethod === "ADMIN_TEST"
    || ctx.paymentMode === "ADMIN_BYPASS";
}

function isAIPromptDirectAccessPayload(body = {}) {
  const ctx = readAIPromptAccessContext(body);
  return ctx.accessType === "single_purchase"
    || ctx.accessType === "direct_krw"
    || ctx.accessMethod === "CARD"
    || ctx.accessMethod === "DIRECT_KRW"
    || ctx.paymentMode === "DIRECT_KRW"
    || ctx.paymentMode === "SINGLE_PURCHASE";
}

function buildAIPromptPaymentClauses(tokens) {
  const clauses = [];
  for (const token of tokens) {
    clauses.push({ merchantUid: token });
    clauses.push({ impUid: token });
    clauses.push({ idempotencyKey: token });
    clauses.push({ requestId: token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  }
  return clauses;
}

async function findAIPromptDirectPaymentEvidence({ auth, featureKey, body, requestId, cost }) {
  const userId = String(auth?.userId || "").trim();
  const normalizedFeatureKey = normalizeFeatureKey(featureKey);
  const featureKeys = uniqueStrings([featureKey, normalizedFeatureKey]);
  const tokens = collectAIPromptPaymentTokens(body, requestId);
  const tokenClauses = buildAIPromptPaymentClauses(tokens);
  if (!userId || !featureKeys.length || !tokenClauses.length) return null;

  const query = {
    userId,
    paymentType: "digital_content",
    featureKey: featureKeys.length > 1 ? { $in: featureKeys } : featureKeys[0],
    status: { $in: ["paid", "success", "fulfilled"] },
    $and: [{ $or: tokenClauses }],
  };
  const minCost = Math.floor(Number(cost || 0));
  if (minCost > 0) {
    query.$and.push({
      $or: [
        { expectedChargedPoints: { $gte: minCost } },
        { coinPrice: { $gte: minCost } },
        { paymentAmount: { $gte: minCost * 100 } },
      ],
    });
  }

  return Payment.findOne(query)
    .select("_id impUid merchantUid idempotencyKey paymentAmount expectedChargedPoints chargedPoints featureKey coinPrice accessType requestId status orderState paymentType")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();
}

async function findAIPromptPaidAccessEvidence({ auth, featureKey, body, requestId, cost }) {
  const pointHistory = await findAIPromptPaymentEvidence({ auth, featureKey, body, requestId, cost });
  if (pointHistory) return { source: "point_history", record: pointHistory };

  if (isAIPromptDirectAccessPayload(body)) {
    const payment = await findAIPromptDirectPaymentEvidence({ auth, featureKey, body, requestId, cost });
    if (payment) return { source: "payment", record: payment };
  }

  if (isAIPromptAdminAccessPayload(body) && String(auth?.userId || "") === ADMIN_TEST_USER_ID) {
    return { source: "admin_test", record: { _id: requestId || `admin:${featureKey}` } };
  }

  return null;
}

function buildAIPromptVerifiedConsumePayload({ auth, featureKey, reason, requestId, cost, body, evidence, subscriptionUser }) {
  const ctx = readAIPromptAccessContext(body);
  const record = evidence?.record || {};
  const metadata = record?.metadata && typeof record.metadata === "object" ? record.metadata : {};
  const isPass = isAIPromptPassAccessPayload(body) || evidence?.source === "admin_test";
  const isDirect = evidence?.source === "payment" || isAIPromptDirectAccessPayload(body);
  const accessType = isPass
    ? (ctx.accessType || (evidence?.source === "admin_test" ? "admin_test" : "membership_pass"))
    : (ctx.accessType || (isDirect ? "single_purchase" : "membership_credit"));
  const accessMethod = ctx.accessMethod || (isPass ? "PASS" : (isDirect ? "CARD" : "MONTHLY"));
  const paymentMode = ctx.paymentMode || (isPass ? "MEMBERSHIP_PASS" : (isDirect ? "DIRECT_KRW" : "MOONLIGHT_STONE"));
  const chargedCoins = isPass
    ? 0
    : Math.max(0, Math.floor(Number(
      ctx.consume.chargedCoins
        || record.coinPrice
        || record.expectedChargedPoints
        || Math.abs(Number(record.delta || 0))
        || cost
        || 0,
    )));
  const membershipCreditCost = String(accessType || "").toLowerCase() === "membership_credit"
    ? Math.max(0, Math.floor(Number(ctx.consume.membershipCreditCost || metadata.membershipCreditCost || metadata.requiredMonthlyCredits || 0)))
    : 0;
  const transactionId = String(
    record._id
      || ctx.consume.transactionId
      || ctx.accessGrant.evidenceId
      || ctx.accessGrant.purchaseId
      || ctx.payment._id
      || ctx.payment.id
      || ctx.payment.paymentId
      || ctx.payment.merchantUid
      || requestId
      || "",
  ).trim();
  const balanceAfterRaw = Number(record.balanceAfter ?? subscriptionUser?.points);
  const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : 0;
  const unlockedFeatures = normalizePersistentUnlockKeys(subscriptionUser?.unlockedFeatures);

  return {
    message: "Paid access already verified.",
    code: "ALREADY_VERIFIED_PAID_ACCESS",
    featureKey,
    reason,
    requiredCoins: cost,
    chargedCoins,
    membershipCreditCost,
    accessType,
    accessMethod,
    paymentMode,
    forceDeductApplied: false,
    transactionId,
    consume: {
      ok: true,
      transactionId,
      transactionType: accessType,
      accessType,
      accessMethod,
      paymentMethod: accessMethod,
      paymentMode,
      requestId,
      featureKey,
      coinPrice: cost,
      chargedCoins,
      membershipCreditCost,
      idempotent: true,
    },
    user: userPayload(auth, balanceAfter, unlockedFeatures),
    unlockedFeatures,
    unlockMap: toUnlockMap(unlockedFeatures),
  };
}

function buildReasonPricingMap(pricingEntries) {
  const table = Object.create(null);

  for (let i = 0; i < pricingEntries.length; i += 1) {
    const item = pricingEntries[i] || null;
    const reason = String(item?.reason || "").trim();
    const cost = Number(item?.cost);
    if (!reason || !Number.isFinite(cost) || cost <= 0) continue;

    // Keep the first mapping for stable behavior when legacy keys share the same reason.
    if (!table[reason]) table[reason] = { ...item, reason, cost };
  }

  return Object.freeze(table);
}

const FEATURE_REASON_PRICING_MAP = buildReasonPricingMap(
  Object.entries(FEATURE_KEY_PRICE_TABLE).map(([mappedFeatureKey, spec]) => ({
    featureKey: mappedFeatureKey,
    reason: spec?.reason,
    cost: spec?.cost,
  })),
);

const UNLOCK_REASON_PRICING_MAP = buildReasonPricingMap(
  Object.values(UNLOCK_PRODUCT_BY_FEATURE_KEY).map((spec) => ({
    featureKey: spec?.featureKey,
    reason: spec?.reason,
    cost: spec?.cost,
  })),
);

function resolveServerCoinPricing({ env, productSpec, requestedCost, featureKey, reason }) {
  const requestedFeatureKeyRaw = String(featureKey || "").trim();

  if (productSpec) {
    return {
      ok: true,
      cost: Number(productSpec.cost),
      reason: String(productSpec.reason || reason || "Paid feature unlock"),
      featureKey: normalizeFeatureKey(productSpec.featureKey || featureKey),
      pricingSource: "product-id",
    };
  }

  const key = normalizeFeatureKey(featureKey);
  const reasonText = String(reason || "").trim();
  const requestCost = Number(requestedCost);

  if (key === "coin-gate-per-use") {
    const serverCost = Number(COIN_GATE_PER_USE_REASON_COSTS[reasonText]);
    if (Number.isFinite(serverCost) && serverCost > 0) {
      return {
        ok: true,
        cost: serverCost,
        reason: reasonText,
        featureKey: "coin-gate-per-use",
        pricingSource: "coin-gate-reason",
      };
    }

    const featureReasonPricing = FEATURE_REASON_PRICING_MAP[reasonText] || null;
    if (featureReasonPricing) {
      return {
        ok: true,
        cost: Number(featureReasonPricing.cost),
        reason: String(featureReasonPricing.reason || reasonText),
        featureKey: String(featureReasonPricing.featureKey || key),
        pricingSource: "feature-reason-fallback",
      };
    }

    const unlockReasonPricing = UNLOCK_REASON_PRICING_MAP[reasonText] || null;
    if (unlockReasonPricing) {
      return {
        ok: true,
        cost: Number(unlockReasonPricing.cost),
        reason: String(unlockReasonPricing.reason || reasonText),
        featureKey: String(unlockReasonPricing.featureKey || key),
        pricingSource: "unlock-reason-fallback",
      };
    }

    const inferredFeatureKey = inferFeatureKeyFromReason(reasonText, key);
    if (inferredFeatureKey && inferredFeatureKey !== key) {
      return resolveServerCoinPricing({
        env,
        productSpec,
        requestedCost,
        featureKey: inferredFeatureKey,
        reason: reasonText,
      });
    }

    if (isDynamicCostFallbackEnabled(env) && Number.isFinite(requestCost) && requestCost > 0) {
      return {
        ok: true,
        cost: requestCost,
        reason: reasonText || "Single payment per-use",
        featureKey: key,
        pricingSource: "dynamic-fallback",
      };
    }

    return {
      ok: false,
      status: 403,
      code: "SERVER_PRICE_REQUIRED",
      message: "coin-gate-per-use 기능의 서버 가격표가 누락되었습니다.",
    };
  }

  const featureReasonCost = resolveFeatureReasonCost(key, reasonText);
  if (Number.isFinite(featureReasonCost) && featureReasonCost > 0) {
    return {
      ok: true,
      cost: featureReasonCost,
      reason: reasonText,
      featureKey: requestedFeatureKeyRaw || key,
      pricingSource: "feature-reason",
    };
  }

  const featurePrice = FEATURE_KEY_PRICE_TABLE[key] || null;
  if (featurePrice) {
    return {
      ok: true,
      cost: Number(featurePrice.cost),
      reason: String(featurePrice.reason || reasonText || "Paid feature unlock"),
      featureKey: requestedFeatureKeyRaw || key,
      pricingSource: "feature-key",
    };
  }

  const unlockSpec = UNLOCK_PRODUCT_BY_FEATURE_KEY[key] || null;
  if (unlockSpec) {
    return {
      ok: true,
      cost: Number(unlockSpec.cost),
      reason: String(unlockSpec.reason || reasonText || "Paid feature unlock"),
      featureKey: requestedFeatureKeyRaw || key,
      pricingSource: "unlock-feature",
    };
  }

  if (reasonText) {
    const coinGateReasonCost = Number(COIN_GATE_PER_USE_REASON_COSTS[reasonText]);
    if (Number.isFinite(coinGateReasonCost) && coinGateReasonCost > 0) {
      return {
        ok: true,
        cost: coinGateReasonCost,
        reason: reasonText,
        featureKey: "coin-gate-per-use",
        pricingSource: "coin-gate-reason-fallback",
      };
    }

    const featureReasonPricing = FEATURE_REASON_PRICING_MAP[reasonText] || null;
    if (featureReasonPricing) {
      return {
        ok: true,
        cost: Number(featureReasonPricing.cost),
        reason: reasonText,
        featureKey: String(featureReasonPricing.featureKey || key),
        pricingSource: "feature-reason-fallback",
      };
    }

    const unlockReasonPricing = UNLOCK_REASON_PRICING_MAP[reasonText] || null;
    if (unlockReasonPricing) {
      return {
        ok: true,
        cost: Number(unlockReasonPricing.cost),
        reason: reasonText,
        featureKey: String(unlockReasonPricing.featureKey || key),
        pricingSource: "unlock-reason-fallback",
      };
    }

    const inferredFeatureKey = inferFeatureKeyFromReason(reasonText, key);
    if (inferredFeatureKey && inferredFeatureKey !== key) {
      return resolveServerCoinPricing({
        env,
        productSpec,
        requestedCost,
        featureKey: inferredFeatureKey,
        reason: reasonText,
      });
    }
  }

  if (isDynamicCostFallbackEnabled(env) && Number.isFinite(requestCost) && requestCost > 0) {
    return {
      ok: true,
      cost: requestCost,
      reason: reasonText || "Paid feature unlock",
      featureKey: requestedFeatureKeyRaw || key,
      pricingSource: "dynamic-fallback",
    };
  }

  return {
    ok: false,
    status: 400,
    code: "UNKNOWN_FEATURE_KEY",
    message: "결제 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    availableFeatureKeys: listServerPricedFeatureKeys(),
  };
}

function inferFeatureKeyFromReason(reason, fallbackFeatureKey = "") {
  const reasonText = String(reason || "").trim();
  const fallbackKey = normalizeFeatureKey(fallbackFeatureKey);
  if (!reasonText) return fallbackKey;

  const actionToken = reasonText.split(/\s+/)[0] || "";
  const candidates = [actionToken, reasonText];

  for (let i = 0; i < candidates.length; i += 1) {
    const normalized = normalizeFeatureKey(candidates[i]);
    if (normalized && normalized !== "pig-coin-unlock" && normalized !== "coin-gate-per-use") {
      return normalized;
    }
  }

  return fallbackKey;
}

function resolveUnlockProductSpec(productId) {
  const id = String(productId || "").trim().toLowerCase();
  if (!id) return null;
  return PIG_COIN_UNLOCK_PRODUCTS[id] || null;
}

const PROFILE_SUB_PLANS = {
  standard: { name: "스탠다드", coins: 115, profileLimit: 3, durationDays: 30, lowWarnAt: 30 },
  premium: { name: "프리미엄", coins: 360, profileLimit: 7, durationDays: 30, lowWarnAt: 50 },
  vvip: { name: "VVIP", coins: 700, profileLimit: 15, durationDays: 30, lowWarnAt: 100 },
  family: { name: "Code Destiny Family", coins: 3000, profileLimit: 0, durationDays: 30, lowWarnAt: 300, freeLimit: 999999999 },
};

const VALID_SUB_TIERS = new Set(["standard", "premium", "vvip", "family"]);
const SUBSCRIPTION_TIER_RANK = Object.freeze({
  free: 0,
  standard: 1,
  premium: 2,
  vvip: 3,
  family: 4,
});

function getSubscriptionTierRank(tierRaw) {
  const tier = String(tierRaw || "free").trim().toLowerCase();
  return Number(SUBSCRIPTION_TIER_RANK[tier] || 0);
}

const SHARE_REWARD_AMOUNT = 10;
const SHARE_REWARD_DAILY_LIMIT = 3;
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const PERSISTENT_UNLOCK_ALIAS_MAP = Object.freeze({
  "olympus-profile-fc": ["olympus-fc"],
  "olympus-fc": ["olympus-profile-fc"],
  "flower-fc": ["flower-destiny", "flower-astro", "flower-ziwei", "flower-sukuyo"],
  "flower-destiny": ["flower-fc"],
  "flower-astro": ["flower-fc"],
  "flower-ziwei": ["flower-fc"],
  "flower-sukuyo": ["flower-fc"],
  "premium-fpti-report": ["premium_fpti_report", "generateFptiDeepReport", "openFptiDeepReport"],
  premium_fpti_report: ["premium-fpti-report", "generateFptiDeepReport", "openFptiDeepReport"],
  generateFptiDeepReport: ["premium-fpti-report", "premium_fpti_report", "openFptiDeepReport"],
  openFptiDeepReport: ["premium-fpti-report", "premium_fpti_report", "generateFptiDeepReport"],
  allPaidSaju: [
    "rpgCharacter",
    "travelDestiny",
    "healthReport",
    "sajuDiary",
    "secretHouseEpisodes",
    "rpt_skillTreeCard",
    "rpt_energyCoordCard",
    "rpt_healthReportCard",
    "rpt_luckSyncDiaryEntryCard",
    "rpt_secretHouseEntryCard",
  ],
  rpgCharacter: ["rpt_skillTreeCard"],
  travelDestiny: ["rpt_energyCoordCard"],
  healthReport: ["rpt_healthReportCard"],
  sajuDiary: ["rpt_luckSyncDiaryEntryCard"],
  secretHouseEpisodes: ["rpt_secretHouseEntryCard"],
});
const PERSISTENT_UNLOCK_KEY_SET = new Set([
  "flower-fc",
  "flower-destiny",
  "flower-astro",
  "flower-ziwei",
  "flower-sukuyo",
  "olympus-fc",
  "olympus-profile-fc",
  "section_daewun",
  "section_summary",
  "section_compat",
  "allPaidSaju",
  "rpgCharacter",
  "travelDestiny",
  "healthReport",
  "sajuDiary",
  "secretHouseEpisodes",
  "animal-destiny-unlock",
  "loveSimulation",
  "premiumDivinationPack",
  "rpt_specialCharmCard",
  "rpt_quantumCard",
  "rpt_healthReportCard",
  "rpt_skillTreeCard",
  "rpt_energyCoordCard",
  "rpt_villainCard",
  "rpt_luckSyncDiaryEntryCard",
  "rpt_secretHouseEntryCard",
  "fun.quantumLotto.ritualReport",
  "premium-ziwei",
  "premium-astrology",
  "premium-sukuyo",
  "premium-veda",
  "premium-naming",
  "premium-fpti-report",
  "premium_fpti_report",
  "generateFptiDeepReport",
  "openFptiDeepReport",
]);

function isPersistentUnlockFeatureKey(rawKey) {
  const base = String(rawKey || "").trim();
  if (!base) return false;
  if (base === "pig-coin-unlock" || base === "coin-gate-per-use") return false;
  if (PERSISTENT_UNLOCK_KEY_SET.has(base)) return true;
  if (base.startsWith("section_")) return true;
  if (base.startsWith("flower-") || base.startsWith("olympus-")) return true;
  return false;
}

function resolvePersistentUnlockAliasKeys(rawKey) {
  const base = String(rawKey || "").trim();
  if (!base) return [];
  const map = Object.create(null);
  map[base] = true;
  const aliases = PERSISTENT_UNLOCK_ALIAS_MAP[base] || [];
  for (let i = 0; i < aliases.length; i += 1) {
    map[aliases[i]] = true;
  }
  return Object.keys(map);
}

function resolvePersistentUnlockKeys(rawKey) {
  if (!isPersistentUnlockFeatureKey(rawKey)) return [];
  const aliases = resolvePersistentUnlockAliasKeys(rawKey);
  const map = Object.create(null);
  for (let i = 0; i < aliases.length; i += 1) {
    if (isPersistentUnlockFeatureKey(aliases[i])) {
      map[aliases[i]] = true;
    }
  }
  return Object.keys(map);
}

function normalizePersistentUnlockKeys(values) {
  if (!Array.isArray(values)) return [];
  const map = Object.create(null);
  for (let i = 0; i < values.length; i += 1) {
    const aliases = resolvePersistentUnlockKeys(values[i]);
    for (let j = 0; j < aliases.length; j += 1) {
      map[aliases[j]] = true;
    }
  }
  return Object.keys(map);
}

function sanitizeProfileBindingId(value) {
  return String(value || "").trim().slice(0, 80).replace(/\s+/g, "_");
}

function toUnlockMap(unlockedFeatures) {
  const map = Object.create(null);
  const keys = normalizePersistentUnlockKeys(unlockedFeatures);
  for (let i = 0; i < keys.length; i += 1) {
    map[keys[i]] = true;
  }
  return map;
}

function normalizeStringArray(values, maxLength = 200) {
  if (!Array.isArray(values)) return [];
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    const value = String(values[i] || "").trim();
    if (!value) continue;
    out.push(value);
    if (out.length >= maxLength) break;
  }
  return out;
}

function isRepairableConsumeArrayShapeError(error) {
  const message = String(error?.message || "");
  if (!message) return false;
  const hasArrayOp = /\$push|\$addToSet|must be an array|non-array field/i.test(message);
  if (!hasArrayOp) return false;
  return /recentConsumeRequestIds|unlockedFeatures/i.test(message);
}

async function resolvePersistedUnlockFeatures(userId, currentUnlocks, profileId = "") {
  const scopedProfileId = sanitizeProfileBindingId(profileId);
  if (userId && scopedProfileId) {
    const scopedKeys = await PointHistory.distinct("featureKey", {
      userId,
      kind: "deduct",
      featureKey: { $in: Array.from(PERSISTENT_UNLOCK_KEY_SET) },
      $or: [
        { "metadata.profileId": scopedProfileId },
        { "metadata.selectedProfileId": scopedProfileId },
      ],
    });
    return normalizePersistentUnlockKeys(scopedKeys);
  }

  const fromUser = normalizePersistentUnlockKeys(currentUnlocks);
  if (fromUser.length || !userId) return fromUser;

  const historyKeys = await PointHistory.distinct("featureKey", {
    userId,
    kind: "deduct",
    featureKey: { $in: Array.from(PERSISTENT_UNLOCK_KEY_SET) },
  });
  const inferred = normalizePersistentUnlockKeys(historyKeys);
  if (inferred.length) {
    await User.updateOne(
      { _id: userId },
      { $addToSet: { unlockedFeatures: { $each: inferred } } },
    ).catch(() => {});
  }
  return inferred;
}

function getFlowerAdminSecret(env) {
  return String(env?.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000");
}

function extractAdminTokenFromRequest(request) {
  const xat = String(request.headers.get("x-admin-token") || "").trim();
  if (FLOWER_ADMIN_TOKEN_RE.test(xat)) return xat;

  const auth = String(request.headers.get("authorization") || "");
  if (auth.startsWith("Bearer ")) {
    const bearer = auth.slice(7).trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(bearer)) return bearer;
  }

  const cookieHeader = String(request.headers.get("cookie") || "");
  const flowerMatch = cookieHeader.match(/(?:^|;\s*)flower_admin_token=([^;]+)/);
  if (flowerMatch) {
    try {
      const decoded = decodeURIComponent(flowerMatch[1]);
      if (FLOWER_ADMIN_TOKEN_RE.test(decoded)) return decoded;
    } catch (_) {
      if (FLOWER_ADMIN_TOKEN_RE.test(flowerMatch[1])) return flowerMatch[1];
    }
  }

  const legacyMatch = cookieHeader.match(/(?:^|;\s*)fortune_auth_token=([^;]+)/);
  if (legacyMatch) {
    try {
      const decoded = decodeURIComponent(legacyMatch[1]);
      if (FLOWER_ADMIN_TOKEN_RE.test(decoded)) return decoded;
    } catch (_) {
      if (FLOWER_ADMIN_TOKEN_RE.test(legacyMatch[1])) return legacyMatch[1];
    }
  }

  return "";
}

function _b64uToJson(payloadB64) {
  const base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (base64.length % 4)) % 4;
  const withPad = base64 + "=".repeat(padLen);
  return JSON.parse(atob(withPad));
}

async function hmacSha256Hex(data, secret) {
  const subtle = globalThis?.crypto?.subtle;
  if (!subtle) return "";
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(text) {
  try {
    const subtle = globalThis?.crypto?.subtle;
    if (!subtle) return "";
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(String(text || "")));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch (e) {
    return "";
  }
}

async function verifyFlowerAdminToken(token, env) {
  try {
    if (!FLOWER_ADMIN_TOKEN_RE.test(String(token || ""))) return false;
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 1) return false;

    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const expected = await hmacSha256Hex(payloadB64, getFlowerAdminSecret(env));
    if (!expected || expected.length !== sig.length) return false;

    let diff = 0;
    for (let i = 0; i < expected.length; i += 1) {
      diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    if (diff !== 0) return false;

    const payload = _b64uToJson(payloadB64);
    const exp = Number(payload?.exp || 0);
    const now = Math.floor(Date.now() / 1000);
    return payload?.v === 1 && Number.isFinite(exp) && now <= exp;
  } catch (_) {
    return false;
  }
}

async function resolvePigCoinConsumeAuth(request, env) {
  let auth = null;
  try {
    auth = await requireUserFromRequest(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      auth = null;
    } else {
      throw error;
    }
  }

  const adminToken = extractAdminTokenFromRequest(request);
  const adminMode = (adminToken && isAdminPigCoinBypassEnabled(env))
    ? await verifyFlowerAdminToken(adminToken, env)
    : false;

  if (!auth && !adminMode) {
    throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });
  }

  return { auth, adminMode };
}

function userPayload(auth, points, unlockedFeatures) {
  const payload = {
    id: String(auth.userId),
    points: Number(points || 0),
  };
  const normalizedUnlocks = normalizePersistentUnlockKeys(unlockedFeatures);
  if (normalizedUnlocks.length) payload.unlockedFeatures = normalizedUnlocks;
  return payload;
}

function normalizeSubscriptionTier(value) {
  const tier = String(value || "").trim().toLowerCase();
  return VALID_SUB_TIERS.has(tier) ? tier : null;
}

function normalizeSubscriptionStatusValue(value) {
  return String(value || "").trim().toLowerCase();
}

function isActiveSubscriptionStatus(value) {
  const status = normalizeSubscriptionStatusValue(value);
  return status === "active"
    || status === "paid"
    || status === "current"
    || status === "subscribed"
    || status === "trialing"
    || status === "success"
    || status === "registered"
    || status === "registering"
    || status === "pending"
    || status === "processing"
    || status === "enrolled"
    || status === "enabled"
    || status === "valid"
    || status === "ok"
    || status === "complete"
    || status === "completed"
    || status === "confirmed"
    || status === "approved"
    || status === "\uB4F1\uB85D\uC911"
    || status === "\uC774\uC6A9\uC911"
    || status === "\uC720\uD6A8"
    || status === "\uC644\uB8CC";
}

function isInactiveSubscriptionStatus(value) {
  const status = normalizeSubscriptionStatusValue(value);
  return status === "expired"
    || status === "canceled"
    || status === "cancelled"
    || status === "inactive"
    || status === "failed"
    || status === "paused"
    || status === "refunded";
}

function getPlanPolicy(tier) {
  const plan = PROFILE_SUB_PLANS[tier] || null;
  if (!plan) {
    return {
      tier: "free",
      freeLimit: 0,
      profileLimit: 1,
      recommendedCoins: 0,
    };
  }

  return {
    tier,
    freeLimit: Number(plan.freeLimit ?? plan.lowWarnAt ?? 0),
    profileLimit: Number.isFinite(Number(plan.profileLimit)) ? Math.max(0, Math.floor(Number(plan.profileLimit))) : 1,
    recommendedCoins: Number(plan.coins || 0),
  };
}

function resolveEffectiveActiveTier(user) {
  const tier = normalizeSubscriptionTier(user?.profileSubscription?.tier);
  if (!tier) return null;

  const expAtRaw = user?.profileSubscription?.expiresAt;
  if (!expAtRaw) return null;

  const expAt = new Date(expAtRaw);
  if (!Number.isFinite(expAt.getTime())) return null;

  return expAt.getTime() > Date.now() ? tier : null;
}

async function ensureActiveSubscriptionByAutoRenew(userId, user, projection) {
  const tier = normalizeSubscriptionTier(user?.profileSubscription?.tier);
  const source = String(user?.profileSubscription?.source || "coin").toLowerCase();
  if (!tier) {
    return { user, effectiveTier: null, autoRenewed: false };
  }

  const expAtRaw = user?.profileSubscription?.expiresAt;
  if (!expAtRaw) {
    return { user, effectiveTier: null, autoRenewed: false };
  }

  const expAt = new Date(expAtRaw);
  if (!Number.isFinite(expAt.getTime())) {
    return { user, effectiveTier: null, autoRenewed: false };
  }

  if (expAt.getTime() > Date.now()) {
    return { user, effectiveTier: tier, autoRenewed: false };
  }

  return { user, effectiveTier: null, autoRenewed: false, autoRenewDisabled: true };

  if (source === "card") {
    return { user, effectiveTier: null, autoRenewed: false };
  }

  if (Boolean(user?.profileSubscription?.cancelAtPeriodEnd)) {
    return { user, effectiveTier: null, autoRenewed: false };
  }

  const plan = PROFILE_SUB_PLANS[tier];
  if (!plan) {
    return { user, effectiveTier: null, autoRenewed: false };
  }

  const requiredCoins = Number(plan.coins || 0);
  if (!Number.isFinite(requiredCoins) || requiredCoins <= 0) {
    return { user, effectiveTier: null, autoRenewed: false };
  }

  if (Number(user?.points || 0) < requiredCoins) {
    return { user, effectiveTier: null, autoRenewed: false };
  }

  const now = new Date();
  const newExpAt = new Date(Math.max(expAt.getTime(), now.getTime()) + Number(plan.durationDays || 30) * 86400000);
  const nextProjection = projection || {
    points: 1,
    profileSubscription: 1,
    unlockedFeatures: 1,
    recentConsumeRequestIds: 1,
  };

  const renewedUser = await User.findOneAndUpdate(
    { _id: userId, points: { $gte: requiredCoins } },
    {
      $inc: { points: -requiredCoins },
      $set: {
        "profileSubscription.expiresAt": newExpAt,
        "profileSubscription.startedAt": now,
      },
    },
    { returnDocument: "after", projection: nextProjection },
  ).lean();

  if (!renewedUser) {
    return {
      user,
      effectiveTier: resolveEffectiveActiveTier(user),
      autoRenewed: false,
    };
  }

  await PointHistory.create({
    userId,
    kind: "deduct",
    delta: -requiredCoins,
    balanceAfter: Number(renewedUser.points || 0),
    reason: `${plan.name} subscription auto-renewal`,
    featureKey: "profile-subscription-auto-renew",
    metadata: { tier, expiresAt: newExpAt.toISOString(), autoRenew: true },
  }).catch(() => {});

  return { user: renewedUser, effectiveTier: tier, autoRenewed: true };
}

async function handleCheck() {
  return json({
    message: "Fortune reading is currently free.",
    requiredPoints: 0,
    currentPoints: null,
    isFree: true,
  });
}

async function handleConsume(auth) {
  const user = await User.findById(auth.userId).select("points").lean();
  if (!user) return json({ message: "User not found." }, { status: 404 });

  return json({
    message: "Fortune reading is currently free. No coins were deducted.",
    requiredPoints: 0,
    isFree: true,
    user: userPayload(auth, user.points),
  });
}

async function handleBalance(auth) {
  const user = await findUserByIdRaw(auth.userId, {
    points: 1,
    unlockedFeatures: 1,
    destinyProfilesCurrentId: 1,
  });
  if (!user) {
    return json({
      ok: true,
      authenticated: true,
      balance: 0,
      walletCreated: false,
      message: "Payment value initialized with safe default.",
      user: userPayload(auth, 0, []),
      unlockedFeatures: [],
      unlockMap: {},
    });
  }

  let unlockedFeatures = [];
  try {
    unlockedFeatures = await resolvePersistedUnlockFeatures(auth.userId, user.unlockedFeatures, user.destinyProfilesCurrentId);
  } catch (e) {
    unlockedFeatures = [];
  }
  const points = Number(user.points || 0);

  return json({
    ok: true,
    authenticated: true,
    balance: points,
    walletCreated: true,
    message: "Payment value loaded.",
    user: userPayload(auth, points, unlockedFeatures),
    unlockedFeatures,
    unlockMap: toUnlockMap(unlockedFeatures),
  });
}

function buildDbFallbackBalance(auth, error) {
  const points = Number.isFinite(Number(auth?.points)) ? Number(auth.points) : 0;
  return json({
    ok: true,
    authenticated: true,
    degraded: true,
    source: "auth_snapshot",
    balance: points,
    walletCreated: false,
    code: "DB_FALLBACK",
    message: "결제 서버가 일시적으로 불안정하여 보조 정보로 표시합니다.",
    debugMessage: String(error?.message || ""),
    errorDetails: {
      stage: "fortune-db-fallback-balance",
      name: error?.name || "Error",
      code: error?.code || "DB_FALLBACK",
      message: String(error?.message || "Unknown DB error"),
    },
    user: userPayload(auth, points, []),
    unlockedFeatures: [],
    unlockMap: {},
  });
}

function handleGuestBalance() {
  return json({
    ok: false,
    authenticated: false,
    code: "AUTH_REQUIRED",
    message: "로그인이 필요합니다.",
  }, { status: 401 });
}

async function handleChargeSimulate(request, env, auth) {
  return json({
    ok: false,
    message: "선불형 잔액 상품은 더 이상 판매하지 않습니다. 상품별 원화 단건 결제를 이용해 주세요.",
    code: "POINT_CHARGE_DISABLED",
  }, { status: 410 });

  if (String(env.PIG_COIN_PAYMENT_API_READY || "") !== "true") {
    return json({
      message: "Prepaid balance simulation is disabled because the payment API is not ready.",
      code: "PIG_COIN_CHARGE_DISABLED",
    }, { status: 503 });
  }

  const body = await readJson(request);
  const packageId = String(body?.packageId || "").trim();
  const pkg = PIG_COIN_PACKAGES[packageId];
  if (!pkg) return json({ message: "Unsupported charge package." }, { status: 400 });

  const delta = Number(pkg.coins || 0) + Number(pkg.bonus || 0);
  if (!Number.isFinite(delta) || delta <= 0) {
    return json({ message: "Invalid charge amount." }, { status: 400 });
  }

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: delta } },
    { returnDocument: "after", projection: { points: 1 } },
  ).lean();

  if (!updatedUser) return json({ message: "User not found." }, { status: 404 });

  await PointHistory.create({
    userId: auth.userId,
    kind: "charge",
    delta,
    balanceAfter: Number(updatedUser.points || 0),
    reason: "Prepaid balance simulation",
    featureKey: "pig-coin-charge",
    metadata: {
      source: "fortune.pig-coin.charge-simulate",
      packageId,
      packageName: pkg.name,
      baseCoins: Number(pkg.coins || 0),
      bonusCoins: Number(pkg.bonus || 0),
    },
  });

  return json({
    message: `${delta.toLocaleString("ko-KR")} coins charged.`,
    package: {
      id: packageId,
      name: pkg.name,
      coins: Number(pkg.coins || 0),
      bonus: Number(pkg.bonus || 0),
    },
    user: userPayload(auth, updatedUser.points),
  });
}

async function handlePigCoinConsume(request, auth, options = {}) {
  const env = options?.env || {};
  const adminMode = Boolean(options?.adminMode);
  const body = await readJson(request);
  const productId = String(body?.productId || options?.productId || "").trim().toLowerCase();
  const productSpec = productId ? resolveUnlockProductSpec(productId) : null;
  if (productId && !productSpec) {
    return json({
      message: "Unsupported unlock product.",
      code: "INVALID_PRODUCT",
      productId,
    }, { status: 400 });
  }

  const requestedFeatureKey = String(productSpec?.featureKey || body?.featureKey || "pig-coin-unlock").trim().slice(0, 60);
  let featureKey = normalizeFeatureKey(requestedFeatureKey).slice(0, 60);
  const requestReason = String(productSpec?.reason || body?.reason || "Paid feature unlock").trim().slice(0, 120);
  if (!featureKey || featureKey === "pig-coin-unlock") {
    featureKey = inferFeatureKeyFromReason(requestReason, featureKey).slice(0, 60);
  }
  const requestedCost = Number(productSpec ? productSpec.cost : body?.cost);
  const pricing = resolveServerCoinPricing({
    env,
    productSpec,
    requestedCost,
    featureKey,
    reason: requestReason,
  });

  if (!pricing.ok) {
    if (pricing.code === "UNKNOWN_FEATURE_KEY") {
      try {
        console.error("[fortune][pricing][unknown-feature]", JSON.stringify({
          featureKey,
          requestedFeatureKey: requestedFeatureKey !== featureKey ? requestedFeatureKey : undefined,
          requestReason,
          productId: productId || null,
          route: "/api/fortune/pig-coin/consume",
        }));
      } catch (e) {
        console.error("[fortune][pricing][unknown-feature]", {
          featureKey,
          requestedFeatureKey: requestedFeatureKey !== featureKey ? requestedFeatureKey : undefined,
          requestReason,
          productId: productId || null,
        });
      }
    }

    const payload = {
      message: pricing.message || "서버 가격 검증에 실패했습니다.",
      code: pricing.code || "SERVER_PRICE_REQUIRED",
      productId: productId || null,
      featureKey,
      requestedFeatureKey: requestedFeatureKey !== featureKey ? requestedFeatureKey : undefined,
    };

    if (!isProductionRuntime(env) && pricing.code === "UNKNOWN_FEATURE_KEY") {
      payload.availableFeatureKeys = Array.isArray(pricing.availableFeatureKeys) ? pricing.availableFeatureKeys : [];
      payload.requestReason = requestReason;
    }

    return json({
      ...payload,
    }, { status: Number(pricing.status || 403) });
  }

  const pricingFeatureKey = normalizeFeatureKey(pricing.featureKey || featureKey).slice(0, 60);
  if (pricingFeatureKey) featureKey = pricingFeatureKey;

  const cost = Number.isFinite(Number(pricing.cost)) && Number(pricing.cost) > 0
    ? Math.floor(Number(pricing.cost))
    : PIG_COIN_DEFAULT_UNLOCK_COST;

  if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
    return json({ message: "Invalid payment value amount.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const reason = String(pricing.reason || requestReason || "Paid feature unlock").trim().slice(0, 120);
  const reportTypeForPremiumAccess = resolvePremiumAccessReportType(featureKey, reason);
  const categoryKey = String(body?.categoryKey || "").trim().slice(0, 60);
  const subFeatureKey = String(body?.subFeatureKey || "").trim().slice(0, 60);
  const payloadHash = String(body?.payloadHash || "").trim().slice(0, 120);
  const unlockKeysToPersist = resolvePersistentUnlockKeys(featureKey);
  const requestId = String(
    body?.requestId
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key")
      || "",
  ).trim().slice(0, 120);
  const forceDeduct = body?.forceDeduct === true || String(body?.forceDeduct || "").trim().toLowerCase() === "true";
  const requireExistingPaidAccess = body?.requireExistingPaidAccess === true
    || String(body?.requireExistingPaidAccess || "").trim().toLowerCase() === "true";
  const isAdminTestAccess = adminMode || String(auth?.userId || "") === ADMIN_TEST_USER_ID;
  if (isAdminTestAccess) {
    const adminUserId = String(auth?.userId || ADMIN_TEST_USER_ID);
    const transactionId = requestId || `admin:${featureKey || "paid-service"}:${Date.now().toString(36)}`;
    const premiumAccessToken = reportTypeForPremiumAccess
      ? await createPremiumAccessToken(env, {
        userId: adminUserId,
        reportType: reportTypeForPremiumAccess,
        featureKey,
        reason,
        transactionId,
        chargedCoins: 0,
        freeBySubscription: false,
      })
      : "";
    const accessGrant = {
      ok: true,
      accessType: "admin_test",
      accessMethod: "ADMIN_TEST",
      paymentMode: "admin_bypass",
      adminTestMode: true,
      adminBypass: true,
      featureKey,
      requestId,
      purchaseId: transactionId,
      evidenceId: transactionId,
      paidAt: new Date().toISOString(),
    };

    return buildJsonWithPremiumAccessCookie({
      ok: true,
      code: "ADMIN_TEST_PAYMENT_BYPASS",
      productId: productId || null,
      featureKey,
      reason,
      requiredCoins: cost,
      chargedCoins: 0,
      membershipCreditCost: 0,
      accessType: "admin_test",
      accessMethod: "ADMIN_TEST",
      paymentMode: "admin_bypass",
      adminTestMode: true,
      adminBypass: true,
      forceDeductApplied: false,
      transactionId,
      premiumAccessToken: premiumAccessToken || "",
      accessGrant,
      consume: {
        ok: true,
        transactionId,
        transactionType: "admin_paid_service",
        accessType: "admin_test",
        accessMethod: "ADMIN_TEST",
        paymentMethod: "ADMIN_TEST",
        paymentMode: "admin_bypass",
        adminTestMode: true,
        adminBypass: true,
        requestId,
        featureKey,
        coinPrice: cost,
        chargedCoins: 0,
        membershipCreditCost: 0,
      },
      user: {
        id: adminUserId,
        role: "admin",
        adminMode: true,
        points: 0,
      },
      unlockedFeatures: unlockKeysToPersist,
      unlockMap: toUnlockMap(unlockKeysToPersist),
    }, {}, premiumAccessToken, env);
  }

  const subscriptionUser = await User.findById(auth.userId)
    .select("points profileSubscription unlockedFeatures")
    .lean();
  if (!subscriptionUser) {
    return json({ message: "User not found.", code: "USER_NOT_FOUND" }, { status: 404 });
  }
  if (requireExistingPaidAccess) {
    const verifiedAccess = await findAIPromptPaidAccessEvidence({
      auth,
      featureKey,
      body,
      requestId,
      cost,
    });
    if (verifiedAccess) {
      return json(buildAIPromptVerifiedConsumePayload({
        auth,
        featureKey,
        reason,
        requestId,
        cost,
        body,
        evidence: verifiedAccess,
        subscriptionUser,
      }));
    }

    const krwEquivalent = cost * 100;
    return json({
      ok: false,
      message: "결제 확인 후 프롬프트를 생성할 수 있습니다.",
      code: "PAYMENT_REQUIRED",
      featureKey,
      reason,
      pricing: {
        featureKey,
        reason,
        coinPrice: cost,
        membershipCreditCost: 0,
        krwEquivalent,
        displayUnit: "content_value",
      },
    }, { status: 402 });
  }
  const activeTierForPass = resolveEffectiveActiveTier(subscriptionUser);
  const activePolicyForPass = getPlanPolicy(activeTierForPass);
  if (activeTierForPass && cost <= activePolicyForPass.freeLimit) {
    const unlockedFeatures = normalizePersistentUnlockKeys(subscriptionUser.unlockedFeatures);
    const premiumAccessToken = await createPremiumAccessToken(env, {
      userId: String(auth.userId || ""),
      reportType: reportTypeForPremiumAccess,
      featureKey,
      reason,
      transactionId: requestId || `membership:${activeTierForPass}:${Date.now().toString(36)}`,
      chargedCoins: 0,
      freeBySubscription: true,
    }) || "";

    return buildJsonWithPremiumAccessCookie({
      message: "이용권 무료 한도 조건으로 서비스를 열었습니다.",
      code: "SUBSCRIPTION_INCLUDED",
      productId: productId || null,
      requiredCoins: cost,
      chargedCoins: 0,
      membershipCreditCost: 0,
      accessType: "membership_pass",
      freeBySubscription: true,
      forceDeductApplied: false,
      subscriptionTier: activeTierForPass,
      freeLimit: activePolicyForPass.freeLimit,
      profileLimit: activePolicyForPass.profileLimit,
      recommendedCoins: activePolicyForPass.recommendedCoins,
      premiumAccessToken: premiumAccessToken || "",
      user: userPayload(auth, Number(subscriptionUser.points || 0), unlockedFeatures),
      unlockedFeatures,
      unlockMap: toUnlockMap(unlockedFeatures),
    }, {}, premiumAccessToken, env);
  }

  if (!forceDeduct) {
    const krwEquivalent = cost * 100;
    return json({
      ok: false,
      message: "이용권 혜택 또는 상품별 원화 단건 결제가 필요합니다.",
      code: "PAYMENT_REQUIRED",
      featureKey,
      reason,
      pricing: {
        featureKey,
        reason,
        coinPrice: cost,
        membershipCreditCost: 0,
        krwEquivalent,
        displayUnit: "content_value",
      },
    }, { status: 402 });
  }

  const coinRequestId = requestId || `coin:${featureKey}:${String(auth.userId || "")}:${payloadHash || Date.now().toString(36)}`;
  const existingCoinSpend = await findAIPromptPaymentEvidence({
    auth,
    featureKey,
    body,
    requestId: coinRequestId,
    cost,
  });

  if (existingCoinSpend) {
    const unlockedFeatures = normalizePersistentUnlockKeys(subscriptionUser.unlockedFeatures);
    return json({
      message: "Already processed single payment.",
      code: "ALREADY_PROCESSED",
      featureKey,
      reason,
      requiredCoins: cost,
      chargedCoins: Math.max(0, Math.abs(Number(existingCoinSpend.delta || cost))),
      membershipCreditCost: 0,
      accessType: "coin",
      accessMethod: "COIN",
      paymentMode: "COIN",
      forceDeductApplied: true,
      transactionId: String(existingCoinSpend._id || ""),
      consume: {
        ok: true,
        transactionId: String(existingCoinSpend._id || ""),
        transactionType: "coin",
        accessType: "coin",
        accessMethod: "COIN",
        paymentMethod: "COIN",
        paymentMode: "COIN",
        requestId: coinRequestId,
        featureKey,
        coinPrice: cost,
        chargedCoins: Math.max(0, Math.abs(Number(existingCoinSpend.delta || cost))),
        membershipCreditCost: 0,
        idempotent: true,
      },
      user: userPayload(auth, Number(existingCoinSpend.balanceAfter || subscriptionUser.points || 0), unlockedFeatures),
      unlockedFeatures,
      unlockMap: toUnlockMap(unlockedFeatures),
    });
  }

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: auth.userId,
      points: { $gte: cost },
      ...(coinRequestId ? { recentConsumeRequestIds: { $ne: coinRequestId } } : {}),
    },
    {
      $inc: { points: -cost },
      ...(coinRequestId ? { $addToSet: { recentConsumeRequestIds: coinRequestId } } : {}),
    },
    { returnDocument: "after", projection: { points: 1, unlockedFeatures: 1 } },
  ).lean();

  if (updatedUser) {
    const history = await PointHistory.create({
      userId: auth.userId,
      kind: "deduct",
      delta: -cost,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey,
      metadata: {
        source: "fortune.pig-coin.consume",
        accessType: "coin",
        accessMethod: "COIN",
        paymentMethod: "COIN",
        paymentMode: "COIN",
        requestId: coinRequestId,
        categoryKey,
        subFeatureKey,
        payloadHash,
        featureKey,
        coinPrice: cost,
        chargedCoins: cost,
        paidAt: new Date().toISOString(),
      },
    });
    const unlockedFeatures = normalizePersistentUnlockKeys(updatedUser.unlockedFeatures);
    return json({
      message: `${cost.toLocaleString("ko-KR")} coins deducted.`,
      featureKey,
      reason,
      requiredCoins: cost,
      chargedCoins: cost,
      membershipCreditCost: 0,
      accessType: "coin",
      accessMethod: "COIN",
      paymentMode: "COIN",
      forceDeductApplied: true,
      transactionId: String(history?._id || ""),
      consume: {
        ok: true,
        transactionId: String(history?._id || ""),
        transactionType: "coin",
        accessType: "coin",
        accessMethod: "COIN",
        paymentMethod: "COIN",
        paymentMode: "COIN",
        requestId: coinRequestId,
        featureKey,
        coinPrice: cost,
        chargedCoins: cost,
        membershipCreditCost: 0,
        idempotent: false,
      },
      user: userPayload(auth, Number(updatedUser.points || 0), unlockedFeatures),
      unlockedFeatures,
      unlockMap: toUnlockMap(unlockedFeatures),
    });
  }

  const krwEquivalent = cost * 100;

  return json({
    ok: false,
    message: "이용권 혜택 또는 상품별 원화 단건 결제가 필요합니다.",
    code: "PAYMENT_REQUIRED",
    featureKey,
    reason,
    pricing: {
      featureKey,
      reason,
      coinPrice: cost,
      membershipCreditCost: 0,
      krwEquivalent,
      displayUnit: "content_value",
    },
  }, { status: 402 });
}

async function handlePigCoinUnlock(request, auth, options = {}) {
  const body = await readJson(request);
  const productId = String(body?.productId || "").trim().toLowerCase();
  if (!productId) {
    return json({ message: "productId is required.", code: "INVALID_PRODUCT" }, { status: 400 });
  }

  if (!resolveUnlockProductSpec(productId)) {
    return json({ message: "Unsupported unlock product.", code: "INVALID_PRODUCT", productId }, { status: 400 });
  }

  const delegatedBody = {
    productId,
    requestId: String(body?.requestId || "").trim().slice(0, 120),
  };
  const delegatedRequest = new Request(request.url, {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(delegatedBody),
  });

  return handlePigCoinConsume(delegatedRequest, auth, {
    ...options,
    productId,
    env: options?.env,
  });
}

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoOrNull(value) {
  const date = toValidDate(value);
  return date ? date.toISOString() : null;
}

async function findUserByIdRaw(userId, projection = {}) {
  const normalizedId = String(userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalizedId)) return null;

  return User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(normalizedId) },
    { projection },
  );
}

async function handlePigCoinRefund(request, auth) {
  const body = await readJson(request);
  const requestedCost = Number(body?.cost);
  const cost = Number.isFinite(requestedCost) && requestedCost > 0
    ? Math.floor(requestedCost)
    : PIG_COIN_DEFAULT_UNLOCK_COST;

  if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
    return json({ message: "Invalid payment refund amount." }, { status: 400 });
  }

  const reason = String(body?.reason || "Premium generation failed auto-refund").trim().slice(0, 120);
  const featureKey = String(body?.featureKey || "pig-coin-unlock").trim().slice(0, 60);
  const sourceTransactionId = String(body?.sourceTransactionId || "").trim();
  const requestId = String(body?.requestId || "").trim().slice(0, 120);
  const now = new Date();
  const recentWindow = new Date(now.getTime() - 1000 * 60 * 60 * 48);

  if (requestId) {
    const alreadyByRequest = await PointHistory.findOne({
      userId: auth.userId,
      kind: "refund",
      "metadata.requestId": requestId,
    }).lean();

    if (alreadyByRequest) {
      const user = await User.findById(auth.userId).select("points").lean();
      return json({
        message: "Refund already processed.",
        code: "REFUND_ALREADY_PROCESSED",
        alreadyRefunded: true,
        refundTransactionId: String(alreadyByRequest._id || ""),
        user: userPayload(auth, Number(user?.points || 0)),
      });
    }
  }

  const deductQuery = {
    userId: auth.userId,
    kind: "deduct",
    delta: -cost,
    featureKey,
    createdAt: { $gte: recentWindow },
  };

  if (isObjectIdLike(sourceTransactionId)) {
    deductQuery._id = sourceTransactionId;
  }

  let deducted = await PointHistory.findOne(deductQuery)
    .sort({ createdAt: -1 })
    .lean();

  if (!deducted && isObjectIdLike(sourceTransactionId)) {
    deducted = await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      _id: sourceTransactionId,
    }).lean();
  }

  if (!deducted) {
    if (isObjectIdLike(sourceTransactionId)) {
      const refundedBySource = await PointHistory.findOne({
        userId: auth.userId,
        kind: "refund",
        "metadata.refundForPointHistoryId": sourceTransactionId,
      }).lean();

      if (refundedBySource) {
        const user = await User.findById(auth.userId).select("points").lean();
        return json({
          message: "Refund already processed.",
          code: "REFUND_ALREADY_PROCESSED",
          alreadyRefunded: true,
          sourceTransactionId,
          refundTransactionId: String(refundedBySource._id || ""),
          user: userPayload(auth, Number(user?.points || 0)),
        });
      }
    }

    return json({
      message: "No refundable deduction found.",
      code: "NO_REFUNDABLE_DEDUCTION",
    }, { status: 409 });
  }

  const alreadyRefunded = await PointHistory.findOne({
    userId: auth.userId,
    kind: "refund",
    "metadata.refundForPointHistoryId": String(deducted._id),
  }).lean();

  if (alreadyRefunded) {
    const user = await User.findById(auth.userId).select("points").lean();
    return json({
      message: "Refund already processed.",
      code: "REFUND_ALREADY_PROCESSED",
      alreadyRefunded: true,
      refundTransactionId: String(alreadyRefunded._id || ""),
      user: userPayload(auth, Number(user?.points || 0)),
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: cost } },
    { returnDocument: "after", projection: { points: 1 } },
  ).lean();

  if (!updatedUser) {
    return json({ message: "User not found." }, { status: 404 });
  }

  const refundHistory = await PointHistory.create({
    userId: auth.userId,
    kind: "refund",
    delta: cost,
    balanceAfter: Number(updatedUser.points || 0),
    reason,
    featureKey,
    metadata: {
      source: "fortune.pig-coin.refund",
      requestId,
      refundForPointHistoryId: String(deducted._id),
      sourceTransactionId: String(deducted._id),
    },
  });

  return json({
    message: `${cost.toLocaleString("ko-KR")} coins refunded.`,
    refundedCoins: cost,
    sourceTransactionId: String(deducted._id),
    refundTransactionId: String(refundHistory?._id || ""),
    user: userPayload(auth, updatedUser.points),
  });
}

function buildZiweiAIPromptError(code, message, status = 400) {
  return json({ ok: false, code, message }, { status });
}

function mapZiweiConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim().toUpperCase();
  const message = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildZiweiAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE" || code === "INSUFFICIENT_COINS" || code === "PAYMENT_REQUIRED") {
    return buildZiweiAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(ZIWEI_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  if (status === 409 || code === "IDEMPOTENCY_CONFLICT" || code === "REQUEST_IN_PROGRESS") {
    return buildZiweiAIPromptError(
      "REQUEST_IN_PROGRESS",
      "동일 요청이 처리 중입니다. 잠시 후 다시 시도해 주세요.",
      409,
    );
  }

  return buildZiweiAIPromptError(
    "PROMPT_GENERATION_FAILED",
    message || "결제 확인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

function buildSajuAIPromptError(code, message, status = 400) {
  return json({ ok: false, code, message }, { status });
}

function mapSajuConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildSajuAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE") {
    return buildSajuAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(SAJU_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  return buildSajuAIPromptError(
    "PROMPT_GENERATION_FAILED",
    message || "결제 확인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

function buildAstrologyAIPromptError(code, message, status = 400) {
  return json({ ok: false, code, message }, { status });
}

function buildVedicAIPromptError(code, message, status = 400) {
  return json({ ok: false, code, message }, { status });
}

function mapAstrologyConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildAstrologyAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE") {
    return buildAstrologyAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(ASTROLOGY_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  return buildAstrologyAIPromptError(
    "PROMPT_GENERATION_FAILED",
    message || "결제 확인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

function mapVedicConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildVedicAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE") {
    return buildVedicAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(VEDIC_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  return buildVedicAIPromptError(
    "PROMPT_GENERATION_FAILED",
    message || "결제 확인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

const ASTROLOGY_SWISS_SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const ASTROLOGY_SWISS_SIGN_EMOJI = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const ASTROLOGY_SWISS_PLANET_ORDER = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const ASTROLOGY_SWISS_PLANET_KO = Object.freeze({
  Sun: "태양",
  Moon: "달",
  Mercury: "수성",
  Venus: "금성",
  Mars: "화성",
  Jupiter: "목성",
  Saturn: "토성",
  Uranus: "천왕성",
  Neptune: "해왕성",
  Pluto: "명왕성",
});

const ASTROLOGY_SWISS_ASPECT_LABEL = Object.freeze({
  conjunction: "딱 맞는 각(합)",
  sextile: "도움 각(육합)",
  square: "긴장 각(직각)",
  trine: "편한 각(삼합)",
  opposition: "마주보는 각(충)",
});

function toAstrologyPromptSafeText(value) {
  return String(value == null ? "" : value).trim();
}

function parseAstrologyTimezoneOffset(rawTimezone) {
  if (Number.isFinite(Number(rawTimezone))) return Number(rawTimezone);
  const text = toAstrologyPromptSafeText(rawTimezone);
  if (!text) return NaN;
  const match = text.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!match) return NaN;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isAstrologyPromptFieldMissing(value) {
  const text = toAstrologyPromptSafeText(value);
  if (!text) return true;
  if (text === "-" || text === "행성") return true;
  if (text.includes("제공되지 않음")) return true;
  return false;
}

function hasValidAstrologyPlacements(astrologyResult) {
  const rows = Array.isArray(astrologyResult?.placements) ? astrologyResult.placements : [];
  return rows.some((row) => {
    const planet = toAstrologyPromptSafeText(row?.planet);
    const sign = toAstrologyPromptSafeText(row?.sign);
    return !isAstrologyPromptFieldMissing(planet) && !isAstrologyPromptFieldMissing(sign);
  });
}

function hasValidAstrologyAspects(astrologyResult) {
  const rows = Array.isArray(astrologyResult?.majorAspects) ? astrologyResult.majorAspects : [];
  return rows.some((row) => {
    const pair = toAstrologyPromptSafeText(row?.pair);
    return !isAstrologyPromptFieldMissing(pair);
  });
}

function normalizeAstrologyBirthForSwiss(astrologyResult) {
  const birth = astrologyResult?.birth && typeof astrologyResult.birth === "object" ? astrologyResult.birth : {};
  const year = Number(birth.year);
  const month = Number(birth.month);
  const day = Number(birth.day);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const hourRaw = Number(birth.hour);
  const minuteRaw = Number(birth.minute);
  const timezoneRaw = parseAstrologyTimezoneOffset(birth.timezone);
  const latRaw = Number(birth.latitude);
  const lonRaw = Number(birth.longitude);

  return {
    year,
    month,
    day,
    hour: Number.isFinite(hourRaw) ? hourRaw : 12,
    minute: Number.isFinite(minuteRaw) ? minuteRaw : 0,
    timezone: Number.isFinite(timezoneRaw) ? timezoneRaw : 9,
    lat: Number.isFinite(latRaw) ? latRaw : 37.5665,
    lon: Number.isFinite(lonRaw) ? lonRaw : 126.978,
  };
}

function formatAstrologyDegreeText(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  const normalized = ((numeric % 30) + 30) % 30;
  let degree = Math.floor(normalized);
  let minute = Math.round((normalized - degree) * 60);
  if (minute >= 60) {
    degree += 1;
    minute = 0;
  }
  if (degree >= 30) degree = 29;
  return `${String(degree)}° ${String(minute).padStart(2, "0")}'`;
}

function formatAstrologySignLabel(position) {
  if (!position || typeof position !== "object") return "";
  const signIdx = Number(position.sign);
  const signKo = Number.isInteger(signIdx) && signIdx >= 0 && signIdx < 12
    ? ASTROLOGY_SWISS_SIGN_KO[signIdx]
    : toAstrologyPromptSafeText(position.signKo);
  const signEmoji = Number.isInteger(signIdx) && signIdx >= 0 && signIdx < 12
    ? ASTROLOGY_SWISS_SIGN_EMOJI[signIdx]
    : toAstrologyPromptSafeText(position.signEmoji);
  const degree = formatAstrologyDegreeText(position.degree);
  if (!signKo) return "";
  return `${signKo}(${signEmoji || "?"}) ${degree}`;
}

function buildAstrologyPlacementsFromSwiss(swissChart) {
  const planets = swissChart?.planets && typeof swissChart.planets === "object" ? swissChart.planets : {};
  const rows = [];
  for (let i = 0; i < ASTROLOGY_SWISS_PLANET_ORDER.length; i += 1) {
    const key = ASTROLOGY_SWISS_PLANET_ORDER[i];
    const item = planets[key];
    if (!item || typeof item !== "object") continue;
    const sign = formatAstrologySignLabel(item);
    if (!sign) continue;
    const houseNumber = Number(item.house);
    const house = Number.isFinite(houseNumber) ? `${Math.trunc(houseNumber)}H` : "-";
    const degree = `${formatAstrologyDegreeText(item.degree)}${item.retrograde ? " Rx" : ""}`;
    rows.push({
      planet: ASTROLOGY_SWISS_PLANET_KO[key] || key,
      sign,
      house,
      degree,
    });
  }
  return rows;
}

function buildAstrologyMajorAspectsFromSwiss(swissChart) {
  const rows = Array.isArray(swissChart?.aspects) ? swissChart.aspects : [];
  return rows
    .filter((row) => ASTROLOGY_SWISS_PLANET_KO[row?.p1] && ASTROLOGY_SWISS_PLANET_KO[row?.p2])
    .map((row) => {
      const p1 = ASTROLOGY_SWISS_PLANET_KO[row.p1] || String(row.p1 || "").trim() || "행성";
      const p2 = ASTROLOGY_SWISS_PLANET_KO[row.p2] || String(row.p2 || "").trim() || "행성";
      const aspectLabel = ASTROLOGY_SWISS_ASPECT_LABEL[row?.type] || String(row?.type || "주요 각도").trim();
      const orbRaw = Number(row?.orb);
      const orbText = Number.isFinite(orbRaw) ? `${orbRaw.toFixed(2)}°` : "-";
      return {
        pair: `${p1} - ${p2} : ${aspectLabel} (orb ${orbText})`,
        aspect: aspectLabel,
        orb: orbText,
        _orbValue: Number.isFinite(orbRaw) ? orbRaw : 999,
      };
    })
    .sort((a, b) => a._orbValue - b._orbValue)
    .slice(0, 12)
    .map(({ _orbValue, ...rest }) => rest);
}

function buildAstrologyCoreSignsFromSwiss(swissChart) {
  const sun = formatAstrologySignLabel(swissChart?.planets?.Sun);
  const moon = formatAstrologySignLabel(swissChart?.planets?.Moon);
  const asc = formatAstrologySignLabel(swissChart?.ascendant);
  const mc = formatAstrologySignLabel(swissChart?.midheaven);

  let desc = "";
  const ascSign = Number(swissChart?.ascendant?.sign);
  const ascDegree = Number(swissChart?.ascendant?.degree);
  if (Number.isInteger(ascSign) && ascSign >= 0 && ascSign < 12) {
    const descSign = (ascSign + 6) % 12;
    desc = `${ASTROLOGY_SWISS_SIGN_KO[descSign]}(${ASTROLOGY_SWISS_SIGN_EMOJI[descSign]}) ${formatAstrologyDegreeText(ascDegree)}`;
  }

  return {
    sun,
    moon,
    asc,
    mc,
    desc,
  };
}

async function enrichAstrologyPromptResultWithSwiss(astrologyResult, env, requestUrl) {
  if (!astrologyResult || typeof astrologyResult !== "object") return astrologyResult;

  const needsPlacements = !hasValidAstrologyPlacements(astrologyResult);
  const needsAspects = !hasValidAstrologyAspects(astrologyResult);
  const coreSigns = astrologyResult.coreSigns && typeof astrologyResult.coreSigns === "object"
    ? astrologyResult.coreSigns
    : {};
  const needsCoreSigns = ["sun", "moon", "asc", "mc"].some((key) => isAstrologyPromptFieldMissing(coreSigns[key]));

  if (!needsPlacements && !needsAspects && !needsCoreSigns) {
    return astrologyResult;
  }

  const swissInput = normalizeAstrologyBirthForSwiss(astrologyResult);
  if (!swissInput) return astrologyResult;

  try {
    const getSwissWesternChart = await loadSwissWesternChart();
    const swissChart = await getSwissWesternChart(env, swissInput, { requestUrl });
    const enriched = { ...astrologyResult };

    if (needsPlacements) {
      const placementRows = buildAstrologyPlacementsFromSwiss(swissChart);
      if (placementRows.length > 0) enriched.placements = placementRows;
    }

    if (needsAspects) {
      const aspectRows = buildAstrologyMajorAspectsFromSwiss(swissChart);
      if (aspectRows.length > 0) enriched.majorAspects = aspectRows;
    }

    if (needsCoreSigns) {
      const swissCore = buildAstrologyCoreSignsFromSwiss(swissChart);
      enriched.coreSigns = {
        ...coreSigns,
        sun: isAstrologyPromptFieldMissing(coreSigns.sun) ? swissCore.sun : coreSigns.sun,
        moon: isAstrologyPromptFieldMissing(coreSigns.moon) ? swissCore.moon : coreSigns.moon,
        asc: isAstrologyPromptFieldMissing(coreSigns.asc) ? swissCore.asc : coreSigns.asc,
        mc: isAstrologyPromptFieldMissing(coreSigns.mc) ? swissCore.mc : coreSigns.mc,
        desc: isAstrologyPromptFieldMissing(coreSigns.desc) ? swissCore.desc : coreSigns.desc,
      };
    }

    return enriched;
  } catch (error) {
    console.warn("[fortune][astrology-ai-prompt] swiss enrichment skipped:", error?.message || error);
    return astrologyResult;
  }
}

async function handleAstrologyAIPrompt(request, auth, env) {
  const body = await readJson(request);
  const question = String(body?.question || "").trim();
  const domain = String(body?.domain || "").trim();
  const astrologyResult = await enrichAstrologyPromptResultWithSwiss(body?.astrologyResult, env, request.url);
  const compatibilityResult = body?.compatibilityResult;

  if (!question || question.length < 5 || question.length > 1000) {
    return buildAstrologyAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
  }

  if (!astrologyResult || typeof astrologyResult !== "object") {
    return buildAstrologyAIPromptError("MISSING_ASTROLOGY_RESULT", "기본 점성술 결과가 필요합니다.", 400);
  }

  let builtPrompt = null;
  try {
    builtPrompt = domain
      ? buildAstrologyAIPromptWithDomain({
        question,
        astrologyResult,
        compatibilityResult,
        domain,
      })
      : buildAstrologyAIPrompt({
        question,
        astrologyResult,
        compatibilityResult,
      });
  } catch (error) {
    const code = String(error?.message || "").trim();
    if (code === "INVALID_QUESTION") {
      return buildAstrologyAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
    }
    if (code === "MISSING_ASTROLOGY_RESULT") {
      return buildAstrologyAIPromptError("MISSING_ASTROLOGY_RESULT", "기본 점성술 결과가 필요합니다.", 400);
    }
    if (code === "COMPATIBILITY_CONTEXT_REQUIRED") {
      return buildAstrologyAIPromptError(
        "COMPATIBILITY_CONTEXT_REQUIRED",
        "궁합 질문은 시나스트리 결과를 먼저 계산한 후 다시 시도해 주세요.",
        400,
      );
    }
    if (code === "UNKNOWN_ASTROLOGY_DOMAIN") {
      return buildAstrologyAIPromptError("INVALID_DOMAIN", "지원하지 않는 점성술 AI 주제(domain)입니다.", 400);
    }
    console.error("[fortune][astrology-ai-prompt] prompt build failed:", error);
    return buildAstrologyAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 중 오류가 발생했습니다.", 500);
  }

  const digestBase = `${String(auth?.userId || "").trim()}:${ASTROLOGY_AI_PROMPT_FEATURE_KEY}:${builtPrompt.digestSource}`;
  const digestHex = (await sha256Hex(digestBase)) || String(Date.now());
  const payloadHash = ((await sha256Hex(builtPrompt.digestSource)) || digestHex).slice(0, 120);
  const requestId = `${String(auth?.userId || "").trim()}:${ASTROLOGY_AI_PROMPT_FEATURE_KEY}:${digestHex}`.slice(0, 120);

  let chargedCoins = 0;
  let sourceTransactionId = "";

  try {
    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: ASTROLOGY_AI_PROMPT_FEATURE_KEY,
        reason: "점성술 AI 질문 프롬프트 생성",
        forceDeduct: true,
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "astrology",
        subFeatureKey: String(builtPrompt.domain || builtPrompt.questionType || "general").slice(0, 60),
        payloadHash,
        accessGrant: body?.accessGrant,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });

    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    const consumePayload = await consumeResponse.json().catch(() => ({}));

    if (!consumeResponse.ok) {
      return mapAstrologyConsumeFailure(consumeResponse, consumePayload);
    }

    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || 0));
    sourceTransactionId = String(consumePayload?.transactionId || "").trim();
    const balanceAfterRaw = Number(consumePayload?.user?.points);
    const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : undefined;

    return json({
      ok: true,
      prompt: builtPrompt.prompt,
      generatedPrompt: builtPrompt.generatedPrompt || builtPrompt.prompt,
      title: builtPrompt.title || "점성술 심층 질문 프롬프트",
      summaryIntent: builtPrompt.summaryIntent || "",
      analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles : [],
      recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
        ? builtPrompt.recommendedFollowUpQuestions
        : [],
      caution: String(builtPrompt.caution || "").trim() || undefined,
      questionType: builtPrompt.questionType,
      chargedCoins,
      featureKey: ASTROLOGY_AI_PROMPT_FEATURE_KEY,
      balanceAfter,
      compatibilityUsed: Boolean(builtPrompt.compatibilityUsed),
    });
  } catch (error) {
    if (chargedCoins > 0 && sourceTransactionId) {
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: chargedCoins,
            featureKey: ASTROLOGY_AI_PROMPT_FEATURE_KEY,
            sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Astrology AI prompt generation failed auto-refund",
          }),
        });
        await handlePigCoinRefund(refundRequest, auth);
      } catch (refundError) {
        console.error("[fortune][astrology-ai-prompt] refund failed:", refundError);
      }
    }

    console.error("[fortune][astrology-ai-prompt] request failed:", error);
    return buildAstrologyAIPromptError(
      "PROMPT_GENERATION_FAILED",
      "프롬프트 생성 중 오류가 발생했습니다. 결제 권한이 생성되었다면 자동 복구를 시도했습니다.",
      500,
    );
  }
}

async function handleVedicAIPrompt(request, auth, env) {
  const body = await readJson(request);
  const question = String(body?.question || "").trim();
  const vedicResult = body?.vedicResult;
  const compatibilityResult = body?.compatibilityResult;

  if (!question || question.length < 5 || question.length > 1000) {
    return buildVedicAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
  }

  if (!vedicResult || typeof vedicResult !== "object") {
    return buildVedicAIPromptError("MISSING_VEDIC_RESULT", "기본 베다 점성술 결과가 필요합니다.", 400);
  }

  let builtPrompt = null;
  try {
    builtPrompt = buildVedicAIPrompt({
      question,
      vedicResult,
      compatibilityResult,
    });
  } catch (error) {
    const code = String(error?.message || "").trim();
    if (code === "INVALID_QUESTION") {
      return buildVedicAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
    }
    if (code === "MISSING_VEDIC_RESULT") {
      return buildVedicAIPromptError("MISSING_VEDIC_RESULT", "기본 베다 점성술 결과가 필요합니다.", 400);
    }
    if (code === "MISSING_COMPATIBILITY_RESULT") {
      return buildVedicAIPromptError(
        "MISSING_COMPATIBILITY_RESULT",
        "궁합 질문은 베다 궁합 계산 결과를 먼저 생성한 뒤 다시 시도해 주세요.",
        400,
      );
    }
    console.error("[fortune][vedic-ai-prompt] prompt build failed:", error);
    return buildVedicAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 중 오류가 발생했습니다.", 500);
  }

  const digestBase = `${String(auth?.userId || "").trim()}:${VEDIC_AI_PROMPT_FEATURE_KEY}:${builtPrompt.digestSource}`;
  const digestHex = (await sha256Hex(digestBase)) || String(Date.now());
  const payloadHash = ((await sha256Hex(builtPrompt.digestSource)) || digestHex).slice(0, 120);
  const requestId = `${String(auth?.userId || "").trim()}:${VEDIC_AI_PROMPT_FEATURE_KEY}:${digestHex}`.slice(0, 120);

  let chargedCoins = 0;
  let sourceTransactionId = "";

  try {
    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: VEDIC_AI_PROMPT_FEATURE_KEY,
        reason: "베다 점성술 AI 질문 프롬프트 생성",
        forceDeduct: true,
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "vedic",
        subFeatureKey: String(builtPrompt.questionType || "general").slice(0, 60),
        payloadHash,
        accessGrant: body?.accessGrant,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });

    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    const consumePayload = await consumeResponse.json().catch(() => ({}));

    if (!consumeResponse.ok) {
      return mapVedicConsumeFailure(consumeResponse, consumePayload);
    }

    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || 0));
    sourceTransactionId = String(consumePayload?.transactionId || "").trim();
    const balanceAfterRaw = Number(consumePayload?.user?.points);
    const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : undefined;

    return json({
      ok: true,
      prompt: builtPrompt.prompt,
      generatedPrompt: builtPrompt.generatedPrompt || builtPrompt.prompt,
      title: builtPrompt.title || "베다 점성술 심층 질문 프롬프트",
      summaryIntent: builtPrompt.summaryIntent || "",
      analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles : [],
      recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
        ? builtPrompt.recommendedFollowUpQuestions
        : [],
      caution: String(builtPrompt.caution || "").trim() || undefined,
      questionType: builtPrompt.questionType,
      chargedCoins,
      featureKey: VEDIC_AI_PROMPT_FEATURE_KEY,
      balanceAfter,
      compatibilityUsed: Boolean(builtPrompt.compatibilityUsed),
      compatibilityHint: String(builtPrompt.compatibilityHint || ""),
    });
  } catch (error) {
    if (chargedCoins > 0 && sourceTransactionId) {
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: chargedCoins,
            featureKey: VEDIC_AI_PROMPT_FEATURE_KEY,
            sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Vedic AI prompt generation failed auto-refund",
          }),
        });
        await handlePigCoinRefund(refundRequest, auth);
      } catch (refundError) {
        console.error("[fortune][vedic-ai-prompt] refund failed:", refundError);
      }
    }

    console.error("[fortune][vedic-ai-prompt] request failed:", error);
    return buildVedicAIPromptError(
      "PROMPT_GENERATION_FAILED",
      "프롬프트 생성 중 오류가 발생했습니다. 결제 권한이 생성되었다면 자동 복구를 시도했습니다.",
      500,
    );
  }
}

async function handleSajuAIPrompt(request, auth, env) {
  const body = await readJson(request);
  const question = String(body?.question || "").trim();
  const sajuResult = body?.sajuResult;
  const domain = String(body?.domain || "").trim();

  if (!question || question.length < 5 || question.length > 1000) {
    return buildSajuAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
  }

  if (!sajuResult || typeof sajuResult !== "object") {
    return buildSajuAIPromptError("MISSING_SAJU_RESULT", "기본 사주 분석 결과가 필요합니다.", 400);
  }

  let builtPrompt = null;
  try {
    builtPrompt = domain
      ? buildSajuAIPromptWithDomain({ question, sajuResult, domain })
      : buildSajuAIPrompt({ question, sajuResult });
  } catch (error) {
    const code = String(error?.message || "").trim();
    if (code === "INVALID_QUESTION") {
      return buildSajuAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
    }
    if (code === "MISSING_SAJU_RESULT") {
      return buildSajuAIPromptError("MISSING_SAJU_RESULT", "기본 사주 분석 결과가 필요합니다.", 400);
    }
    if (code.startsWith("UNKNOWN_SAJU_DOMAIN:")) {
      return buildSajuAIPromptError("INVALID_DOMAIN", "지원하지 않는 사주 AI 주제(domain)입니다.", 400);
    }
    console.error("[fortune][saju-ai-prompt] prompt build failed:", error);
    return buildSajuAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 중 오류가 발생했습니다.", 500);
  }

  const digestBase = `${String(auth?.userId || "").trim()}:${SAJU_AI_PROMPT_FEATURE_KEY}:${builtPrompt.digestSource}`;
  const digestHex = (await sha256Hex(digestBase)) || String(Date.now());
  const payloadHash = ((await sha256Hex(builtPrompt.digestSource)) || digestHex).slice(0, 120);
  const requestId = `${String(auth?.userId || "").trim()}:${SAJU_AI_PROMPT_FEATURE_KEY}:${digestHex}`.slice(0, 120);

  let chargedCoins = 0;
  let sourceTransactionId = "";

  try {
    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
        reason: "사주 AI 질문 프롬프트 생성",
        forceDeduct: true,
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "saju",
        subFeatureKey: String(builtPrompt.domain || builtPrompt.questionType || "general").slice(0, 60),
        payloadHash,
        accessGrant: body?.accessGrant,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });

    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    const consumePayload = await consumeResponse.json().catch(() => ({}));

    if (!consumeResponse.ok) {
      return mapSajuConsumeFailure(consumeResponse, consumePayload);
    }

    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || 0));
    sourceTransactionId = String(consumePayload?.transactionId || "").trim();
    const balanceAfterRaw = Number(consumePayload?.user?.points);
    const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : undefined;

    return json({
      ok: true,
      prompt: builtPrompt.prompt,
      generatedPrompt: builtPrompt.generatedPrompt || builtPrompt.prompt,
      title: builtPrompt.title || "사주 심층 질문 프롬프트",
      summaryIntent: builtPrompt.summaryIntent || "",
      analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles : [],
      recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
        ? builtPrompt.recommendedFollowUpQuestions
        : [],
      caution: String(builtPrompt.caution || "").trim() || undefined,
      questionType: builtPrompt.questionType,
      chargedCoins,
      featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
      balanceAfter,
    });
  } catch (error) {
    if (chargedCoins > 0 && sourceTransactionId) {
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: chargedCoins,
            featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
            sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Saju AI prompt generation failed auto-refund",
          }),
        });
        await handlePigCoinRefund(refundRequest, auth);
      } catch (refundError) {
        console.error("[fortune][saju-ai-prompt] refund failed:", refundError);
      }
    }

    console.error("[fortune][saju-ai-prompt] request failed:", error);
    return buildSajuAIPromptError(
      "PROMPT_GENERATION_FAILED",
      "프롬프트 생성 중 오류가 발생했습니다. 결제 권한이 생성되었다면 자동 복구를 시도했습니다.",
      500,
    );
  }
}

async function handleZiweiAIPrompt(request, auth, env) {
  const body = await readJson(request);
  const question = String(body?.question || "").trim();
  const domain = String(body?.domain || "").trim();
  const chartResult = body?.chartResult;

  if (!question || question.length < 5 || question.length > 1000) {
    return buildZiweiAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
  }

  if (!chartResult || typeof chartResult !== "object") {
    return buildZiweiAIPromptError("MISSING_CHART_RESULT", "기본 자미두수 명반 결과가 필요합니다.", 400);
  }

  const preflightRequestId = String(body?.requestId || "").trim().slice(0, 120);
  const preflightAccess = await findAIPromptPaidAccessEvidence({
    auth,
    featureKey: ZIWEI_AI_PROMPT_FEATURE_KEY,
    body,
    requestId: preflightRequestId,
    cost: ZIWEI_AI_PROMPT_PRICE,
  });
  if (!preflightAccess) {
    return buildZiweiAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(ZIWEI_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  let builtPrompt = null;
  try {
    builtPrompt = domain
      ? buildZiweiAIPromptWithDomain({ question, chartResult, domain })
      : buildZiweiAIPrompt({ question, chartResult });
  } catch (error) {
    const code = String(error?.message || "").trim();
    if (code === "INVALID_QUESTION") {
      return buildZiweiAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
    }
    if (code === "MISSING_CHART_RESULT") {
      return buildZiweiAIPromptError("MISSING_CHART_RESULT", "기본 자미두수 명반 결과가 필요합니다.", 400);
    }
    if (code === "UNKNOWN_ZIWEI_DOMAIN") {
      return buildZiweiAIPromptError("INVALID_DOMAIN", "지원하지 않는 자미두수 AI 주제(domain)입니다.", 400);
    }
    console.error("[fortune][ziwei-ai-prompt] prompt build failed:", error);
    return buildZiweiAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 중 오류가 발생했습니다.", 500);
  }

  const generatedPrompt = String(builtPrompt?.generatedPrompt || builtPrompt?.prompt || "").trim();
  if (generatedPrompt.length < 120) {
    return buildZiweiAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 결과가 비어 있습니다. 다시 시도해 주세요.", 500);
  }

  const digestBase = `${String(auth?.userId || "").trim()}:${ZIWEI_AI_PROMPT_FEATURE_KEY}:${builtPrompt.digestSource}`;
  const digestHex = (await sha256Hex(digestBase)) || String(Date.now());
  const payloadHash = ((await sha256Hex(builtPrompt.digestSource)) || digestHex).slice(0, 120);
  const requestId = `${String(auth?.userId || "").trim()}:${ZIWEI_AI_PROMPT_FEATURE_KEY}:${digestHex}`.slice(0, 120);

  let chargedCoins = 0;
  let sourceTransactionId = "";

  try {
    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: ZIWEI_AI_PROMPT_FEATURE_KEY,
        reason: "자미두수 AI 질문 프롬프트 생성",
        forceDeduct: true,
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "ziweidoushu",
        subFeatureKey: String(builtPrompt.domain || builtPrompt.questionType || "general").slice(0, 60),
        payloadHash,
        accessGrant: body?.accessGrant,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });

    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    const consumePayload = await consumeResponse.json().catch(() => ({}));

    if (!consumeResponse.ok) {
      return mapZiweiConsumeFailure(consumeResponse, consumePayload);
    }

    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || 0));
    sourceTransactionId = String(consumePayload?.transactionId || "").trim();
    const balanceAfterRaw = Number(consumePayload?.user?.points);
    const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : undefined;

    return json({
      ok: true,
      prompt: generatedPrompt,
      generatedPrompt,
      title: builtPrompt.title || "자미두수 심층 질문 프롬프트",
      summaryIntent: builtPrompt.summaryIntent || "",
      analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles : [],
      recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
        ? builtPrompt.recommendedFollowUpQuestions
        : [],
      caution: String(builtPrompt.caution || "").trim() || undefined,
      questionType: builtPrompt.questionType,
      chargedCoins,
      featureKey: ZIWEI_AI_PROMPT_FEATURE_KEY,
      balanceAfter,
    });
  } catch (error) {
    if (chargedCoins > 0 && sourceTransactionId) {
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: chargedCoins,
            featureKey: ZIWEI_AI_PROMPT_FEATURE_KEY,
            sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Ziwei AI prompt generation failed auto-refund",
          }),
        });
        await handlePigCoinRefund(refundRequest, auth);
      } catch (refundError) {
        console.error("[fortune][ziwei-ai-prompt] refund failed:", refundError);
      }
    }

    console.error("[fortune][ziwei-ai-prompt] request failed:", error);
    return buildZiweiAIPromptError(
      "PROMPT_GENERATION_FAILED",
      "프롬프트 생성 중 오류가 발생했습니다. 결제 권한이 생성되었다면 자동 복구를 시도했습니다.",
      500,
    );
  }
}

function buildSukuyoAIPromptError(code, message, status = 400) {
  return json({ ok: false, code, message }, { status });
}

function mapSukuyoConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildSukuyoAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE") {
    return buildSukuyoAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(SUKUYO_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  return buildSukuyoAIPromptError(
    "PROMPT_GENERATION_FAILED",
    message || "결제 확인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

async function handleSukuyoAIPrompt(request, auth, env) {
  const body = await readJson(request);
  const question = String(body?.question || "").trim();
  const domain = String(body?.domain || "").trim();
  const basicResult = body?.basicResult;
  const compatibilityResult = body?.compatibilityResult;

  if (!question || question.length < 5 || question.length > 1000) {
    return buildSukuyoAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
  }

  let builtPrompt = null;
  try {
    builtPrompt = domain
      ? buildSukuyoAIPromptWithDomain({
        question,
        basicResult,
        compatibilityResult,
        domain,
      })
      : buildSukuyoAIPrompt({
        question,
        basicResult,
        compatibilityResult,
      });
  } catch (error) {
    const code = String(error?.message || "").trim();
    if (code === "INVALID_QUESTION") {
      return buildSukuyoAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
    }
    if (code === "MISSING_BASIC_RESULT") {
      return buildSukuyoAIPromptError("MISSING_BASIC_RESULT", "기본 숙요점 결과가 필요합니다.", 400);
    }
    if (code === "MISSING_COMPATIBILITY_RESULT") {
      return buildSukuyoAIPromptError(
        "MISSING_COMPATIBILITY_RESULT",
        "궁합 질문은 숙요 궁합 계산 결과를 먼저 만든 뒤 다시 시도해 주세요.",
        400,
      );
    }
    if (code === "UNKNOWN_SUKUYO_DOMAIN") {
      return buildSukuyoAIPromptError("INVALID_DOMAIN", "지원하지 않는 숙요 도메인입니다.", 400);
    }
    console.error("[fortune][sukuyo-ai-prompt] prompt build failed:", error);
    return buildSukuyoAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 중 오류가 발생했습니다.", 500);
  }

  const digestBase = `${String(auth?.userId || "").trim()}:${SUKUYO_AI_PROMPT_FEATURE_KEY}:${builtPrompt.digestSource}`;
  const digestHex = (await sha256Hex(digestBase)) || String(Date.now());
  const payloadHash = ((await sha256Hex(builtPrompt.digestSource)) || digestHex).slice(0, 120);
  const requestId = `${String(auth?.userId || "").trim()}:${SUKUYO_AI_PROMPT_FEATURE_KEY}:${digestHex}`.slice(0, 120);

  let chargedCoins = 0;
  let sourceTransactionId = "";

  try {
    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: SUKUYO_AI_PROMPT_FEATURE_KEY,
        reason: "숙요점 AI 질문 프롬프트 생성",
        forceDeduct: true,
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "sukuyo",
        subFeatureKey: String(builtPrompt.domain || builtPrompt.questionType || "general").slice(0, 60),
        payloadHash,
        accessGrant: body?.accessGrant,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });

    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    const consumePayload = await consumeResponse.json().catch(() => ({}));

    if (!consumeResponse.ok) {
      return mapSukuyoConsumeFailure(consumeResponse, consumePayload);
    }

    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || 0));
    sourceTransactionId = String(consumePayload?.transactionId || "").trim();
    const balanceAfterRaw = Number(consumePayload?.user?.points);
    const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : undefined;

    return json({
      ok: true,
      prompt: builtPrompt.prompt,
      generatedPrompt: builtPrompt.generatedPrompt || builtPrompt.prompt,
      title: builtPrompt.title || "숙요점 심층 질문 프롬프트",
      summaryIntent: builtPrompt.summaryIntent || "",
      analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles : [],
      recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
        ? builtPrompt.recommendedFollowUpQuestions
        : [],
      caution: String(builtPrompt.caution || "").trim() || undefined,
      questionType: builtPrompt.questionType,
      chargedCoins,
      featureKey: SUKUYO_AI_PROMPT_FEATURE_KEY,
      balanceAfter,
      compatibilityUsed: Boolean(builtPrompt.compatibilityUsed),
      compatibilityHint: String(builtPrompt.compatibilityHint || ""),
    });
  } catch (error) {
    if (chargedCoins > 0 && sourceTransactionId) {
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: chargedCoins,
            featureKey: SUKUYO_AI_PROMPT_FEATURE_KEY,
            sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Sukuyo AI prompt generation failed auto-refund",
          }),
        });
        await handlePigCoinRefund(refundRequest, auth);
      } catch (refundError) {
        console.error("[fortune][sukuyo-ai-prompt] refund failed:", refundError);
      }
    }

    console.error("[fortune][sukuyo-ai-prompt] request failed:", error);
    return buildSukuyoAIPromptError(
      "PROMPT_GENERATION_FAILED",
      "프롬프트 생성 중 오류가 발생했습니다. 결제 권한이 생성되었다면 자동 복구를 시도했습니다.",
      500,
    );
  }
}

async function handleSubscriptionStatus(request, env, auth) {
  const user = await findUserByIdRaw(auth.userId, {
    points: 1,
    profileSubscription: 1,
    subscription: 1,
    membership: 1,
    pass: 1,
    entitlement: 1,
    plan: 1,
    planId: 1,
    productId: 1,
    subscriptionTier: 1,
    membershipTier: 1,
    passTier: 1,
    status: 1,
    subscriptionStatus: 1,
    membershipStatus: 1,
    isActive: 1,
    isSubscribed: 1,
    expiresAt: 1,
    has_started_paid_service: 1,
    first_service_access_date: 1,
  });

  if (!user) {
    const policy = getPlanPolicy(null);
    return json({
      ok: true,
      authenticated: true,
      subscription: {
        isSubscribed: false,
        plan: "free",
        expiresAt: null,
      },
      isSubscribed: false,
      plan: "free",
      tier: "free",
      source: "coin",
      isActive: false,
      expiresAt: null,
      profileLimit: 1,
      points: 0,
      lowBalanceWarning: false,
      autoRenewed: false,
      cancelAtPeriodEnd: false,
      cancelRequestedAt: null,
      hasStartedPaidService: false,
      firstServiceAccessDate: null,
      adminMode: false,
      simulated: false,
      adminTestTier: null,
      freeLimit: policy.freeLimit,
      recommendedCoins: policy.recommendedCoins,
    });
  }

  const sub = user.profileSubscription || {};
  const tier = sub.tier || "free";
  const source = String(sub.source || "coin").toLowerCase();
  const expAt = toValidDate(sub.expiresAt);
  const rawSubscriptionStatus = sub.status || sub.subscriptionStatus || sub.membershipStatus || sub.lastBillingStatus || "";
  const statusIndicatesActive = isActiveSubscriptionStatus(rawSubscriptionStatus)
    || sub.isActive === true
    || sub.isSubscribed === true
    || sub.active === true
    || sub.enabled === true
    || sub.valid === true
    || sub.registered === true;
  const statusIndicatesInactive = isInactiveSubscriptionStatus(rawSubscriptionStatus);
  const cancelAtPeriodEnd = Boolean(sub.cancelAtPeriodEnd);
  const cancelRequestedAt = toValidDate(sub.cancelRequestedAt);
  let points = Number(user.points || 0);
  const plan = PROFILE_SUB_PLANS[tier];
  const now = new Date();
  const legacyEntitlement = normalizeHoneyPassEntitlement(user || {});

  let effectiveTier = "free";
  let effectiveExpAt = expAt;
  let effectivePassTier = null;
  let effectiveSource = source;
  let autoRenewed = false;

  if (tier !== "free") {
    if (!statusIndicatesInactive && statusIndicatesActive) {
      effectiveTier = tier;
    } else if (effectiveExpAt && effectiveExpAt > now) {
      effectiveTier = tier;
    } else if (effectiveExpAt && source !== "card" && !cancelAtPeriodEnd && plan && points >= plan.coins) {
      const newExpAt = new Date(Math.max(effectiveExpAt.getTime(), now.getTime()) + plan.durationDays * 86400000);
      const updatedUser = await User.findOneAndUpdate(
        { _id: auth.userId, points: { $gte: plan.coins } },
        {
          $inc: { points: -plan.coins },
          $set: {
            "profileSubscription.expiresAt": newExpAt,
            "profileSubscription.startedAt": now,
          },
        },
        { returnDocument: "after", projection: { points: 1 } },
      ).lean();

      if (updatedUser) {
        points = Number(updatedUser.points || 0);
        effectiveTier = tier;
        effectiveExpAt = newExpAt;
        autoRenewed = true;
        await PointHistory.create({
          userId: auth.userId,
          kind: "deduct",
          delta: -plan.coins,
          balanceAfter: points,
          reason: `${plan.name} subscription auto-renewal`,
          featureKey: "profile-subscription-auto-renew",
          metadata: { tier, expiresAt: newExpAt.toISOString(), autoRenew: true },
        }).catch(() => {});
      }
    }
  }

  if (legacyEntitlement.isActive) {
    effectiveTier = legacyEntitlement.tier;
    effectivePassTier = legacyEntitlement.passTier || legacyEntitlement.tier;
    effectiveExpAt = toValidDate(legacyEntitlement.expiresAt) || effectiveExpAt;
    effectiveSource = legacyEntitlement.source || effectiveSource;
  }

  const isActive = effectiveTier !== "free";
  const profileLimit = isActive ? (PROFILE_SUB_PLANS[effectiveTier]?.profileLimit ?? 1) : 1;
  const lowBalanceWarning = isActive && points <= (PROFILE_SUB_PLANS[effectiveTier]?.lowWarnAt ?? 30);
  const policy = getPlanPolicy(isActive ? effectiveTier : null);
  const passLimit = isActive
    ? Number(legacyEntitlement.maxCoveredCoin || policy.freeLimit || 0)
    : Number(policy.freeLimit || 0);
  const membershipCreditBalance = Math.max(0, Math.floor(Number(sub.membershipCreditBalance || 0)));

  const adminToken = extractAdminTokenFromRequest(request);
  const adminMode = adminToken ? await verifyFlowerAdminToken(adminToken, env) : false;
  const adminTestTier = adminMode ? normalizeSubscriptionTier(request.headers.get("x-admin-subscription-tier")) : null;

  if (adminMode && adminTestTier) {
    const simulatedPolicy = getPlanPolicy(adminTestTier);
    return json({
      ok: true,
      authenticated: true,
      subscription: {
        isSubscribed: true,
        plan: adminTestTier,
        tier: adminTestTier,
        status: "active",
        expiresAt: toIsoOrNull(effectiveExpAt),
        freeLimit: simulatedPolicy.freeLimit,
        passLimit: simulatedPolicy.freeLimit,
        maxCoveredCoin: simulatedPolicy.freeLimit,
      },
      isSubscribed: true,
      plan: adminTestTier,
      tier: adminTestTier,
      passTier: adminTestTier,
      isActive: true,
      expiresAt: toIsoOrNull(effectiveExpAt),
      profileLimit: simulatedPolicy.profileLimit,
      points,
      lowBalanceWarning: Boolean(points <= simulatedPolicy.freeLimit),
      autoRenewed: false,
      cancelAtPeriodEnd: false,
      cancelRequestedAt: null,
      hasStartedPaidService: Boolean(user.has_started_paid_service),
      firstServiceAccessDate: toIsoOrNull(user.first_service_access_date),
      adminMode: true,
      simulated: true,
      adminTestTier,
      freeLimit: simulatedPolicy.freeLimit,
      passLimit: simulatedPolicy.freeLimit,
      maxCoveredCoin: simulatedPolicy.freeLimit,
      recommendedCoins: simulatedPolicy.recommendedCoins,
    });
  }

  return json({
    ok: true,
    authenticated: true,
    subscription: {
      isSubscribed: Boolean(isActive),
      plan: effectiveTier,
      tier: effectiveTier,
      status: isActive ? (rawSubscriptionStatus || "active") : (rawSubscriptionStatus || "free"),
      expiresAt: toIsoOrNull(effectiveExpAt),
      passTier: isActive ? (effectivePassTier || effectiveTier) : null,
      freeLimit: passLimit,
      passLimit,
      maxCoveredCoin: passLimit,
      membershipCreditBalance,
    },
    isSubscribed: Boolean(isActive),
    plan: effectiveTier,
    tier: effectiveTier,
    passTier: isActive ? (effectivePassTier || effectiveTier) : null,
    source: effectiveTier === "free" ? "coin" : effectiveSource,
    status: isActive ? (rawSubscriptionStatus || "active") : (rawSubscriptionStatus || "free"),
    subscriptionStatus: rawSubscriptionStatus || null,
    isActive: Boolean(isActive),
    expiresAt: toIsoOrNull(effectiveExpAt),
    profileLimit,
    points,
    lowBalanceWarning: Boolean(lowBalanceWarning),
    autoRenewed: Boolean(autoRenewed),
    cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd),
    cancelRequestedAt: toIsoOrNull(cancelRequestedAt),
    hasStartedPaidService: Boolean(user.has_started_paid_service),
    firstServiceAccessDate: toIsoOrNull(user.first_service_access_date),
    adminMode,
    simulated: false,
    adminTestTier: null,
    freeLimit: passLimit,
    passLimit,
    maxCoveredCoin: passLimit,
    membershipCreditBalance,
    recommendedCoins: policy.recommendedCoins,
  });
}

function handleGuestSubscriptionStatus() {
  return json({
    ok: false,
    authenticated: false,
    code: "AUTH_REQUIRED",
    message: "로그인이 필요합니다.",
  }, { status: 401 });
}

function buildDbFallbackSubscriptionStatus(auth, error) {
  const points = Number.isFinite(Number(auth?.points)) ? Number(auth.points) : 0;
  const policy = getPlanPolicy(null);
  return json({
    ok: false,
    authenticated: true,
    degraded: true,
    source: "auth_snapshot",
    subscription: {
      isSubscribed: false,
      plan: "free",
      expiresAt: null,
    },
    isSubscribed: false,
    plan: "free",
    tier: "free",
    isActive: false,
    expiresAt: null,
    profileLimit: 1,
    points,
    lowBalanceWarning: false,
    autoRenewed: false,
    cancelAtPeriodEnd: false,
    cancelRequestedAt: null,
    hasStartedPaidService: false,
    firstServiceAccessDate: null,
    adminMode: false,
    simulated: false,
    adminTestTier: null,
    freeLimit: policy.freeLimit,
    recommendedCoins: policy.recommendedCoins,
    code: "DB_FALLBACK",
    message: "구독 서버가 일시적으로 불안정하여 보조 정보로 표시합니다.",
    debugMessage: String(error?.message || ""),
    errorDetails: {
      stage: "fortune-db-fallback-subscription-status",
      name: error?.name || "Error",
      code: error?.code || "DB_FALLBACK",
      message: String(error?.message || "Unknown DB error"),
    },
  }, { status: 503 });
}

function handlePigCoinPrices() {
  const prices = Object.entries(PIG_COIN_PACKAGES).map(([packageId, pkg]) => ({
    packageId,
    name: String(pkg?.name || packageId),
    coins: Number(pkg?.coins || 0),
    bonus: Number(pkg?.bonus || 0),
    priceKRW: Number(pkg?.priceKRW || 0),
  }));

  return json({
    ok: true,
    prices,
  });
}

function handleProfileSubscriptionPlans() {
  const plans = [
    {
      planId: "free",
      tier: "free",
      label: "Free",
      coins: 0,
      profileLimit: 1,
      freeLimit: 0,
      durationDays: 0,
    },
    ...Object.entries(PROFILE_SUB_PLANS).map(([tier, plan]) => ({
      planId: `honey_${tier}`,
      tier,
      label: String(plan?.name || tier),
      coins: Number(plan?.coins || 0),
      profileLimit: Number.isFinite(Number(plan?.profileLimit)) ? Math.max(0, Math.floor(Number(plan?.profileLimit))) : 1,
      freeLimit: Number(plan?.freeLimit ?? plan?.lowWarnAt ?? 0),
      durationDays: Number(plan?.durationDays || 30),
    })),
  ];

  return json({
    ok: true,
    plans,
  });
}

async function handleStartService(request, auth) {
  const body = await readJson(request);
  const action = String(body?.action || "membership-content").trim().slice(0, 80);
  const contentTitle = String(body?.contentTitle || "Membership content").trim().slice(0, 120);
  const legalVersion = String(body?.legalVersion || "2026-04-11").trim().slice(0, 20);
  const now = new Date();

  const user = await User.findById(auth.userId)
    .select("profileSubscription has_started_paid_service first_service_access_date points")
    .lean();

  if (!user) return json({ message: "User not found." }, { status: 404 });

  const tier = String(user.profileSubscription?.tier || "free");
  if (tier === "free") {
    return json({ message: "Only subscribed users can access this service." }, { status: 403 });
  }

  const alreadyStarted = Boolean(user.has_started_paid_service);
  let startedAt = user.first_service_access_date ? new Date(user.first_service_access_date) : null;

  if (!alreadyStarted) {
    const updated = await User.findOneAndUpdate(
      { _id: auth.userId, has_started_paid_service: { $ne: true } },
      {
        $set: {
          has_started_paid_service: true,
          first_service_access_date: now,
        },
      },
      { returnDocument: "after", projection: { points: 1, first_service_access_date: 1 } },
    ).lean();

    if (updated?.first_service_access_date) {
      startedAt = new Date(updated.first_service_access_date);
    }
  }

  await PointHistory.create({
    userId: auth.userId,
    kind: "adjust",
    delta: 0,
    balanceAfter: Number(user.points || 0),
    reason: "Membership content access acknowledged",
    featureKey: "profile-subscription-service-start",
    metadata: {
      action,
      contentTitle,
      legalVersion,
      acknowledgedAt: now.toISOString(),
    },
  }).catch(() => {});

  return json({
    ok: true,
    started: true,
    alreadyStarted,
    hasStartedPaidService: true,
    firstServiceAccessDate: startedAt ? startedAt.toISOString() : now.toISOString(),
  });
}

async function handleShareReward(request, auth) {
  const body = await readJson(request);
  const contentId = String(body?.contentId || "default")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40) || "default";

  const now = new Date();
  const kstMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0) - 9 * 3600 * 1000,
  );

  const todayCount = await PointHistory.countDocuments({
    userId: auth.userId,
    kind: "share_reward",
    createdAt: { $gte: kstMidnight },
  });

  if (todayCount >= SHARE_REWARD_DAILY_LIMIT) {
    return json({
      message: "Daily share reward limit reached.",
      code: "DAILY_LIMIT_EXCEEDED",
      usedToday: todayCount,
      limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    }, { status: 429 });
  }

  const contentDup = await PointHistory.countDocuments({
    userId: auth.userId,
    kind: "share_reward",
    "metadata.contentId": contentId,
    createdAt: { $gte: kstMidnight },
  });

  if (contentDup > 0) {
    return json({
      message: "This content was already rewarded today.",
      code: "CONTENT_ALREADY_REWARDED",
      usedToday: todayCount,
      limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    }, { status: 409 });
  }

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: SHARE_REWARD_AMOUNT } },
    { returnDocument: "after", projection: { points: 1 } },
  ).lean();

  if (!updatedUser) return json({ message: "User not found." }, { status: 404 });

  await PointHistory.create({
    userId: auth.userId,
    kind: "share_reward",
    delta: SHARE_REWARD_AMOUNT,
    balanceAfter: Number(updatedUser.points || 0),
    reason: `Share reward for ${contentId}`,
    featureKey: "share-reward",
    metadata: {
      source: "fortune.pig-coin.share-reward",
      contentId,
    },
  });

  return json({
    message: `${SHARE_REWARD_AMOUNT} coins awarded for sharing.`,
    reward: SHARE_REWARD_AMOUNT,
    usedToday: todayCount + 1,
    limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    user: userPayload(auth, updatedUser.points),
  });
}

async function handleSubscribe(request, auth) {
  return json({
    ok: false,
    message: "이전 달빛 이용권 신청 방식은 종료되었습니다. 1~12개월 달빛 이용권은 원화 단건 결제로 이용해 주세요.",
    code: "COIN_SUBSCRIPTION_DISABLED",
  }, { status: 410 });
}

async function handleSubscriptionCancel(request, auth) {
  const body = await readJson(request);
  const resume = body?.resume === true || String(body?.resume || "").toLowerCase() === "true";
  const now = new Date();

  const existingUser = await User.findById(auth.userId)
    .select("profileSubscription")
    .lean();

  if (!existingUser) return json({ message: "User not found." }, { status: 404 });

  const sub = existingUser.profileSubscription || {};
  const tier = String(sub.tier || "free");
  const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
  const isActive = tier !== "free" && !!expiresAt && expiresAt > now;

  if (!isActive) {
    return json({ message: "No active subscription available to cancel." }, { status: 400 });
  }

  await User.updateOne(
    { _id: auth.userId },
    {
      $set: {
        "profileSubscription.cancelAtPeriodEnd": !resume,
        "profileSubscription.cancelRequestedAt": resume ? null : now,
      },
    },
  );

  const plan = PROFILE_SUB_PLANS[tier];

  return json({
    message: resume
      ? "Subscription cancellation has been reverted. Auto-renewal is active again."
      : "Subscription cancellation is scheduled. Benefits stay active until expiry.",
    subscription: {
      tier,
      isActive: true,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      profileLimit: plan?.profileLimit ?? 1,
      cancelAtPeriodEnd: !resume,
      cancelRequestedAt: resume ? null : now.toISOString(),
    },
  });
}

export async function handleFortuneRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/fortune");
  const trace = {
    route: "fortune",
    requestPath: new URL(request.url).pathname,
    method,
    authPresent: Boolean(request.headers.get("Authorization") || request.headers.get("Cookie")),
    authVerified: false,
    dbConnected: false,
    mongoQueryFailed: false,
    paymentProviderFailed: false,
  };

  try {
    if (method === "GET" && path === "/check") return await handleCheck();

    if (method === "GET" && path === "/pig-coin/prices") return handlePigCoinPrices();
    if (method === "GET" && path === "/pig-coin/profile-subscription/plans") return handleProfileSubscriptionPlans();

    if (method === "GET" && (path === "/pig-coin/balance" || path === "/pig-coin/profile-subscription/status" || path === "/pig-coin/subscription/status" || path === "/pig-coin/profile-subscription/me")) {
      const auth = await getOptionalUserFromRequest(request, env);
      if (!auth) {
        if (path === "/pig-coin/balance") return handleGuestBalance();
        return handleGuestSubscriptionStatus();
      }

      trace.authVerified = true;
      try {
        await connectDb(env);
      } catch (error) {
        const isBalanceRoute = path === "/pig-coin/balance";
        if (isBalanceRoute) return buildDbFallbackBalance(auth, error);
        return buildDbFallbackSubscriptionStatus(auth, error);
      }
      trace.dbConnected = true;

      try {
        if (path === "/pig-coin/balance") return await handleBalance(auth);
        return await handleSubscriptionStatus(request, env, auth);
      } catch (error) {
        const isBalanceRoute = path === "/pig-coin/balance";
        if (isBalanceRoute) return buildDbFallbackBalance(auth, error);
        return buildDbFallbackSubscriptionStatus(auth, error);
      }
    }

    if (method === "POST" && path === "/pig-coin/unlock") {
      const authCtx = await resolvePigCoinConsumeAuth(request, env);
      trace.authVerified = true;
      await connectDb(env);
      trace.dbConnected = true;
      return await handlePigCoinUnlock(request, authCtx.auth, { adminMode: authCtx.adminMode, env });
    }

    if (method === "POST" && path === "/pig-coin/consume") {
      const authCtx = await resolvePigCoinConsumeAuth(request, env);
      trace.authVerified = true;
      await connectDb(env);
      trace.dbConnected = true;
      return await handlePigCoinConsume(request, authCtx.auth, { adminMode: authCtx.adminMode, env });
    }

    if (method === "POST" && path === "/ziwei/ai-prompt") {
      const auth = await getOptionalUserFromRequest(request, env);
      if (!auth) {
        return buildZiweiAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      await connectDb(env);
      trace.dbConnected = true;
      return await handleZiweiAIPrompt(request, auth, env);
    }

    if (method === "POST" && path === "/sukuyo/ai-prompt") {
      const auth = await getOptionalUserFromRequest(request, env);
      if (!auth) {
        return buildSukuyoAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      await connectDb(env);
      trace.dbConnected = true;
      return await handleSukuyoAIPrompt(request, auth, env);
    }

    if (method === "POST" && (path === "/saju/ai-prompt" || path === "/saju/question-prompt")) {
      const auth = await getOptionalUserFromRequest(request, env);
      if (!auth) {
        return buildSajuAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      await connectDb(env);
      trace.dbConnected = true;
      return await handleSajuAIPrompt(request, auth, env);
    }

    if (method === "POST" && path === "/astrology/ai-prompt") {
      const auth = await getOptionalUserFromRequest(request, env);
      if (!auth) {
        return buildAstrologyAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      await connectDb(env);
      trace.dbConnected = true;
      return await handleAstrologyAIPrompt(request, auth, env);
    }

    if (method === "POST" && path === "/vedic/ai-prompt") {
      const auth = await getOptionalUserFromRequest(request, env);
      if (!auth) {
        return buildVedicAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      await connectDb(env);
      trace.dbConnected = true;
      return await handleVedicAIPrompt(request, auth, env);
    }

    const auth = await requireUserFromRequest(request, env);
    trace.authVerified = true;

    await connectDb(env);
    trace.dbConnected = true;

    if (method === "POST" && path === "/pig-coin/refund") return await handlePigCoinRefund(request, auth);
    if (method === "POST" && path === "/consume") return await handleConsume(auth);
    if (method === "POST" && path === "/pig-coin/charge-simulate") return await handleChargeSimulate(request, env, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/start-service") return await handleStartService(request, auth);
    if (method === "POST" && path === "/pig-coin/share-reward") return await handleShareReward(request, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/subscribe") return await handleSubscribe(request, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/cancel") return await handleSubscriptionCancel(request, auth);

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    try {
      console.error("[worker-fortune-route-error]", JSON.stringify({
        ...trace,
        name: error?.name || "Error",
        code: error?.code || "FORTUNE_ROUTE_ERROR",
        message: String(error?.message || "Unknown error"),
      }));
    } catch (e) {
      console.error("[worker-fortune-route-error]", error);
    }
    trace.mongoQueryFailed = /mongo|mongoose|cast to objectid|findbyid|findone|query/i.test(String(error?.message || ""));
    return handleRouteError(error, { request, env, trace });
  }
}

export const __fortuneAccessTestUtils = {
  resolveServerCoinPricing,
  isAdminPigCoinBypassEnabled,
  getForcePaidTestAccountEmails,
  resolvePigCoinConsumeAuth,
};
