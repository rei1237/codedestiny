import { connectDb, withMongoRetry } from "./db.js";
import { getBillingFeaturePricing } from "./billing-feature-registry.js";
import { normalizePaidFeatureKey } from "./paid-feature-registry.js";
import { Payment, User } from "./models.js";
import {
  canUseByPass,
  normalizeHoneyPassEntitlement,
} from "./profile-limits.js";
import { isMusicTrackFeatureKey } from "../../lib/music-access-policy.js";

const SINGLE_PAYMENT_STATUSES = Object.freeze(["paid", "success", "fulfilled"]);
const PASS_EXCLUDED_FEATURE_KEYS = new Set([
  "profile-card-manage",
  "profile_card_manage",
  "profile-card-add",
  "profile_card_add",
  "profile-card-edit",
  "profile_card_edit",
  "profile-card-delete",
  "profile_card_delete",
]);

function isProductionRuntime(env = {}) {
  return String(env?.NODE_ENV || "").trim().toLowerCase() === "production";
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeStatus(value) {
  return cleanText(value).toLowerCase();
}

function toValidDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizeFeatureCandidates(featureKey) {
  const raw = cleanText(featureKey);
  const normalized = normalizePaidFeatureKey(raw) || raw;
  const variants = [raw, normalized]
    .flatMap((key) => [key, key.replace(/_/g, "-"), key.replace(/-/g, "_")])
    .filter(Boolean);
  return Array.from(new Set(variants));
}

function resolveCoinCost(pricing = {}) {
  const coinPrice = Number(pricing.coinPrice ?? pricing.cost ?? pricing.amountCoins ?? pricing.coinCost ?? 0);
  if (Number.isFinite(coinPrice) && coinPrice > 0) return Math.floor(coinPrice);
  const amountKRW = Number(pricing.amountKRW ?? pricing.amountKrw ?? pricing.krwAmount ?? pricing.paymentAmount ?? 0);
  if (Number.isFinite(amountKRW) && amountKRW > 0) return Math.ceil(amountKRW / 100);
  return 0;
}

function buildDecision(input = {}) {
  const decision = {
    allowed: Boolean(input.allowed),
    reason: cleanText(input.reason || (input.allowed ? "ALLOWED" : "PAYMENT_REQUIRED")),
    userId: cleanText(input.userId),
    featureKey: cleanText(input.featureKey),
    licenseType: cleanText(input.licenseType || "none"),
    licenseTier: cleanText(input.licenseTier || ""),
    subscriptionStatus: cleanText(input.subscriptionStatus || "none"),
    accessSource: cleanText(input.accessSource || ""),
    pricing: input.pricing || null,
    paymentRequired: input.allowed ? false : input.paymentRequired !== false,
    shouldOpenPayment: input.allowed ? false : input.shouldOpenPayment !== false,
    monthlySubscription: input.monthlySubscription || null,
    pass: input.pass || null,
  };
  return decision;
}

function logPaidAccessDecision(env, decision) {
  if (isProductionRuntime(env)) return;
  const payload = {
    userId: decision.userId,
    featureKey: decision.featureKey,
    allowed: decision.allowed,
    reason: decision.reason,
    licenseType: decision.licenseType,
    subscriptionStatus: decision.subscriptionStatus,
  };
  try {
    console.info("[paid-access-decision]", JSON.stringify(payload));
  } catch (e) {
    console.info("[paid-access-decision]", payload);
  }
}

function resolveMonthlySubscription(user = {}) {
  const monthly = user.monthlySubscription && typeof user.monthlySubscription === "object"
    ? user.monthlySubscription
    : {};
  const profileSubscription = user.profileSubscription && typeof user.profileSubscription === "object"
    ? user.profileSubscription
    : {};
  const status = normalizeStatus(
    monthly.status
      || monthly.subscriptionStatus
      || profileSubscription.monthlyStatus
      || "",
  );
  const expiresAt = toValidDate(monthly.expiresAt || monthly.currentPeriodEnd);
  const activeByStatus = ["active", "paid", "success", "subscribed", "current", "valid"].includes(status);
  const inactiveByStatus = ["expired", "inactive", "cancelled", "canceled", "failed", "refunded"].includes(status);
  const explicitActive = monthly.active === true || monthly.isActive === true || monthly.isSubscribed === true || activeByStatus;
  const dateActive = expiresAt ? expiresAt.getTime() > Date.now() : true;
  const isActive = !inactiveByStatus && explicitActive && dateActive;
  return {
    active: isActive,
    status: status || (isActive ? "active" : "none"),
    tier: cleanText(monthly.tier || monthly.plan || ""),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  };
}

function canUseMonthlyForFeature(featureKey) {
  const key = cleanText(featureKey);
  return Boolean(key) && !isMusicTrackFeatureKey(key);
}

function isPassExcluded(featureCandidates = []) {
  return featureCandidates.some((key) => {
    const featureKey = cleanText(key);
    return PASS_EXCLUDED_FEATURE_KEYS.has(featureKey) || isMusicTrackFeatureKey(featureKey);
  });
}

function resolveLicenseReason(tier) {
  const normalizedTier = cleanText(tier).toLowerCase();
  if (normalizedTier === "vvip") return "VVIP_LICENSE";
  if (normalizedTier === "premium") return "PREMIUM_LICENSE";
  if (normalizedTier === "standard") return "STANDARD_LICENSE";
  if (normalizedTier === "family") return "FAMILY_ALL_ACCESS";
  return "LICENSE_PASS";
}

function resolveDirectLicense(user = {}) {
  const licenses = user.licenses && typeof user.licenses === "object" ? user.licenses : {};
  const expiresAt = toValidDate(licenses.expiresAt || user.profileSubscription?.expiresAt);
  const status = normalizeStatus(licenses.status || user.profileSubscription?.status || "");
  const expiredByStatus = ["expired", "inactive", "cancelled", "canceled", "failed", "refunded"].includes(status);
  const expiredByDate = expiresAt ? expiresAt.getTime() <= Date.now() : false;
  if (expiredByStatus || expiredByDate) return { active: false, tier: "", count: 0 };

  for (const tier of ["vvip", "premium", "standard"]) {
    const count = Number(licenses[tier] || 0);
    if (Number.isFinite(count) && count > 0) {
      return { active: true, tier, count };
    }
  }
  return { active: false, tier: "", count: 0 };
}

async function hasSinglePaymentAccess(user, userId, featureCandidates, env = {}) {
  const paidSet = new Set([
    ...(Array.isArray(user?.paidFeatures) ? user.paidFeatures : []),
    ...(Array.isArray(user?.unlockedFeatures) ? user.unlockedFeatures : []),
  ].map((key) => cleanText(key)).filter(Boolean));

  if (featureCandidates.some((key) => paidSet.has(key))) return true;

  // READ 전용 — 풀 초기화(MongoPoolClearedError) 버스트에서 이용권 판정이 500/오탐(결제창)으로 새지 않게 재시도.
  const payment = await withMongoRetry(env, () => Payment.exists({
    userId,
    featureKey: { $in: featureCandidates },
    paymentType: "digital_content",
    accessType: "single_purchase",
    status: { $in: SINGLE_PAYMENT_STATUSES },
  }));
  return Boolean(payment);
}

export async function canAccessPaidFeature(userId, featureKey, options = {}) {
  const env = options.env || {};
  const requestedFeatureKey = cleanText(featureKey);
  const normalizedFeatureKey = normalizePaidFeatureKey(requestedFeatureKey) || requestedFeatureKey;

  if (!cleanText(userId)) {
    const decision = buildDecision({
      allowed: false,
      reason: "LOGIN_REQUIRED",
      featureKey: normalizedFeatureKey,
      paymentRequired: false,
      shouldOpenPayment: false,
    });
    logPaidAccessDecision(env, decision);
    return decision;
  }

  await connectDb(env);

  const pricingResult = getBillingFeaturePricing({
    featureKey: requestedFeatureKey,
    reason: options.reason,
    categoryKey: options.categoryKey,
    subFeatureKey: options.subFeatureKey,
  });
  const pricing = pricingResult.ok ? pricingResult.pricing : null;
  const effectiveFeatureKey = cleanText(pricing?.featureKey || normalizedFeatureKey);
  const featureCandidates = normalizeFeatureCandidates(effectiveFeatureKey);
  // READ 전용 — 풀 초기화(MongoPoolClearedError) 버스트에서 이용권 판정이 500/오탐(결제창)으로 새지 않게 재시도.
  const user = await withMongoRetry(env, () => User.findById(userId)
    .select("paidFeatures unlockedFeatures licenses profileSubscription monthlySubscription subscription membership membershipPass pass entitlement licensePass accessGateResult plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
    .lean());

  if (!user?._id) {
    const decision = buildDecision({
      allowed: false,
      reason: "LOGIN_REQUIRED",
      userId,
      featureKey: effectiveFeatureKey,
      paymentRequired: false,
      shouldOpenPayment: false,
      pricing,
    });
    logPaidAccessDecision(env, decision);
    return decision;
  }

  if (await hasSinglePaymentAccess(user, userId, featureCandidates, env)) {
    const decision = buildDecision({
      allowed: true,
      reason: "ALREADY_PURCHASED",
      userId,
      featureKey: effectiveFeatureKey,
      licenseType: "single_purchase",
      accessSource: "paidFeatures",
      pricing,
    });
    logPaidAccessDecision(env, decision);
    return decision;
  }

  const coinCost = resolveCoinCost(pricing || {});
  const pass = normalizeHoneyPassEntitlement(user || {});
  const passExcluded = isPassExcluded(featureCandidates);
  const directLicense = resolveDirectLicense(user || {});
  if (!passExcluded && directLicense.active) {
    const decision = buildDecision({
      allowed: true,
      reason: resolveLicenseReason(directLicense.tier),
      userId,
      featureKey: effectiveFeatureKey,
      licenseType: "license",
      licenseTier: directLicense.tier,
      accessSource: "licenses",
      pricing,
      pass,
    });
    logPaidAccessDecision(env, decision);
    return decision;
  }

  if (!passExcluded && canUseByPass(pass, coinCost)) {
    const decision = buildDecision({
      allowed: true,
      reason: resolveLicenseReason(pass.passTier || pass.tier),
      userId,
      featureKey: effectiveFeatureKey,
      licenseType: "license_pass",
      licenseTier: pass.passTier || pass.tier || "",
      accessSource: "license_pass",
      pricing,
      pass,
    });
    logPaidAccessDecision(env, decision);
    return decision;
  }

  const monthlySubscription = resolveMonthlySubscription(user);
  if (monthlySubscription.active && canUseMonthlyForFeature(effectiveFeatureKey)) {
    const decision = buildDecision({
      allowed: true,
      reason: "MONTHLY_SUBSCRIPTION",
      userId,
      featureKey: effectiveFeatureKey,
      licenseType: "monthly_subscription",
      subscriptionStatus: monthlySubscription.status,
      accessSource: "monthlySubscription",
      pricing,
      monthlySubscription,
      pass,
    });
    logPaidAccessDecision(env, decision);
    return decision;
  }

  const decision = buildDecision({
    allowed: false,
    reason: passExcluded && (pass.isActive || directLicense.active) ? "PASS_EXCLUDED_PAYMENT_REQUIRED" : "PAYMENT_REQUIRED",
    userId,
    featureKey: effectiveFeatureKey,
    licenseType: directLicense.active ? "license" : (pass.isActive ? "license_pass" : "none"),
    licenseTier: directLicense.tier || pass.passTier || pass.tier || "",
    subscriptionStatus: monthlySubscription.status,
    accessSource: "none",
    pricing,
    monthlySubscription,
    pass,
  });
  logPaidAccessDecision(env, decision);
  return decision;
}

export const __paidFeatureAccessTestUtils = {
  PASS_EXCLUDED_FEATURE_KEYS,
  buildDecision,
  canUseMonthlyForFeature,
  resolveMonthlySubscription,
};
