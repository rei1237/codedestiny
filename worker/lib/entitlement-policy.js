import {
  canUseByPass,
  HONEY_PASS_POLICY,
  normalizePassTier,
  PASS_LIMITS,
  resolveFamilyPremiumQuota,
} from "./profile-limits.js";

export const PURCHASE_POLICY_VERSION = "pass-purchase-v2";

export const NORMALIZED_PRODUCT_TYPES = Object.freeze({
  FEATURE: "feature",
  PREMIUM_CONTENT: "premium_content",
  PASS: "pass",
  SUBSCRIPTION: "subscription",
  BUNDLE: "bundle",
  FAMILY: "family",
  UNKNOWN: "unknown",
});

const PASS_LIKE_PRODUCT_TYPES = new Set([
  NORMALIZED_PRODUCT_TYPES.PASS,
  NORMALIZED_PRODUCT_TYPES.SUBSCRIPTION,
  NORMALIZED_PRODUCT_TYPES.BUNDLE,
  NORMALIZED_PRODUCT_TYPES.FAMILY,
]);

const INACTIVE_STATUSES = new Set([
  "expired",
  "canceled",
  "cancelled",
  "inactive",
  "failed",
  "paused",
  "refunded",
]);

const ACTIVE_STATUSES = new Set([
  "active",
  "paid",
  "current",
  "subscribed",
  "trialing",
  "success",
  "registered",
  "registering",
  "pending",
  "processing",
  "enrolled",
  "enabled",
  "valid",
  "ok",
  "complete",
  "completed",
  "confirmed",
  "approved",
]);

function text(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function normalizePurchaseProductType(value) {
  const raw = lower(value).replace(/[\s-]+/g, "_");
  if (!raw) return NORMALIZED_PRODUCT_TYPES.UNKNOWN;
  if (["feature", "paid_content", "digital_content", "content", "per_use"].includes(raw)) {
    return NORMALIZED_PRODUCT_TYPES.FEATURE;
  }
  if (["premium_content", "premium_report", "report", "pdf_report"].includes(raw)) {
    return NORMALIZED_PRODUCT_TYPES.PREMIUM_CONTENT;
  }
  if (["pass", "membership_pass", "license_pass", "subscription_pass"].includes(raw)) {
    return NORMALIZED_PRODUCT_TYPES.PASS;
  }
  if (["subscription", "membership", "monthly_subscription", "subscription_initial", "subscription_recurring"].includes(raw)) {
    return NORMALIZED_PRODUCT_TYPES.SUBSCRIPTION;
  }
  if (["bundle", "pass_bundle", "package", "pack"].includes(raw)) {
    return NORMALIZED_PRODUCT_TYPES.BUNDLE;
  }
  if (["family", "family_pass", "family_plan"].includes(raw)) {
    return NORMALIZED_PRODUCT_TYPES.FAMILY;
  }
  return NORMALIZED_PRODUCT_TYPES.UNKNOWN;
}

export function isPassLikeProductType(value) {
  return PASS_LIKE_PRODUCT_TYPES.has(normalizePurchaseProductType(value));
}

export function normalizePurchasePaymentMethod(value) {
  const raw = lower(value).replace(/[\s-]+/g, "_");
  if (!raw || ["card", "card_general", "direct", "direct_krw", "pg", "portone", "inicis", "single_purchase"].includes(raw)) {
    return "pg";
  }
  if (["monthly", "monthly_credit", "membership_credit", "moonlight_stone", "moonlight_credit", "monthly_billing"].includes(raw)) {
    return "monthly_credit";
  }
  if (["pass", "membership_pass", "license_pass", "subscription_pass"].includes(raw)) return "pass";
  if (["family", "family_pass"].includes(raw)) return "family";
  if (["entitlement", "balance", "credit", "coin", "coins", "coin_credit", "pig_coin"].includes(raw)) return raw;
  return raw;
}

function activeCandidate(source = {}, sourceName = "legacy") {
  if (!source || typeof source !== "object") return null;
  const tier = normalizePassTier(
    source.passTier
      || source.tier
      || source.subscriptionTier
      || source.membershipTier
      || source.plan
      || source.planId
      || source.productId,
  );
  if (!tier) return null;

  const status = lower(source.status || source.subscriptionStatus || source.membershipStatus || source.lastBillingStatus);
  const expiresAt = validDate(source.expiresAt || source.currentPeriodEnd || source.validUntil || source.endAt);
  const explicitlyInactive = INACTIVE_STATUSES.has(status)
    || (source.isActive === false && !ACTIVE_STATUSES.has(status))
    || (source.isSubscribed === false && !ACTIVE_STATUSES.has(status));
  const explicitlyActive = source.isActive === true
    || source.isSubscribed === true
    || source.active === true
    || source.enabled === true
    || source.valid === true
    || ACTIVE_STATUSES.has(status);
  const active = !explicitlyInactive && (expiresAt ? expiresAt.getTime() > Date.now() : explicitlyActive);
  const policy = HONEY_PASS_POLICY[tier] || {};

  return {
    tier,
    passTier: tier,
    isActive: active,
    source: sourceName,
    legacy: sourceName !== "profileSubscription",
    conflict: false,
    maxCoveredCoin: Number(PASS_LIMITS[tier] || 0),
    maxProfiles: Number(policy.maxProfiles ?? 1),
    profileLimit: Number(policy.maxProfiles ?? 1),
    startedAt: validDate(source.startedAt || source.firstSubAt || source.validFrom)?.toISOString() || null,
    expiresAt: expiresAt?.toISOString() || null,
    raw: source,
  };
}

function legacySources(user = {}) {
  return [
    ["subscription", user.subscription],
    ["membership", user.membership],
    ["membershipPass", user.membershipPass],
    ["pass", user.pass],
    ["entitlement", user.entitlement],
    ["licensePass", user.licensePass],
    ["accessGateResult", user.accessGateResult],
  ].filter(([, value]) => value && typeof value === "object");
}

/**
 * profileSubscription is authoritative. Legacy records are read-only compatibility
 * evidence and never elevate an existing canonical tier.
 */
export function resolveCanonicalEntitlement(userOrSubscription = {}) {
  const looksLikeSubscription = Boolean(
    userOrSubscription?.tier
      || userOrSubscription?.passTier
      || userOrSubscription?.subscriptionTier,
  );
  const user = looksLikeSubscription
    ? { profileSubscription: userOrSubscription }
    : (userOrSubscription || {});
  const hasCanonical = Boolean(user.profileSubscription && typeof user.profileSubscription === "object");

  if (hasCanonical) {
    return activeCandidate(user.profileSubscription, "profileSubscription") || {
      tier: "none",
      passTier: null,
      isActive: false,
      source: "profileSubscription",
      legacy: false,
      conflict: false,
      maxCoveredCoin: 0,
      maxProfiles: 1,
      profileLimit: 1,
      expiresAt: null,
      raw: user.profileSubscription,
    };
  }

  const candidates = legacySources(user)
    .map(([sourceName, source]) => activeCandidate(source, sourceName))
    .filter((candidate) => candidate?.isActive);
  const distinctTiers = new Set(candidates.map((candidate) => candidate.tier));
  if (distinctTiers.size > 1) {
    return {
      tier: "none",
      passTier: null,
      isActive: false,
      source: "legacy_conflict",
      legacy: true,
      conflict: true,
      maxCoveredCoin: 0,
      maxProfiles: 1,
      profileLimit: 1,
      expiresAt: null,
      raw: null,
    };
  }
  return candidates[0] || {
    tier: "none",
    passTier: null,
    isActive: false,
    source: "none",
    legacy: true,
    conflict: false,
    maxCoveredCoin: 0,
    maxProfiles: 1,
    profileLimit: 1,
    expiresAt: null,
    raw: null,
  };
}

export function resolveFeatureAccessPolicy({
  user = {},
  pricing = {},
  coinCost,
  passExcluded = false,
} = {}) {
  const entitlement = resolveCanonicalEntitlement(user);
  const price = Number(coinCost ?? pricing.coinPrice ?? pricing.cost ?? 0);
  const base = {
    allowed: false,
    accessMethod: null,
    accessType: null,
    tier: entitlement.passTier || null,
    entitlement,
    isPaymentSubstitute: false,
    reason: entitlement.conflict ? "LEGACY_ENTITLEMENT_CONFLICT" : "PAYMENT_REQUIRED",
  };

  if (entitlement.conflict || !entitlement.isActive || passExcluded || !Number.isFinite(price) || price <= 0) return base;

  const familyQuota = resolveFamilyPremiumQuota(user.profileSubscription || {}, entitlement, price);
  if (familyQuota.applies && familyQuota.exhausted) {
    return { ...base, reason: "FAMILY_PREMIUM_QUOTA_EXHAUSTED", familyQuota };
  }
  if (!canUseByPass(entitlement, price)) {
    return { ...base, reason: "PRICE_EXCEEDS_PASS_LIMIT", familyQuota };
  }

  const isFamily = entitlement.passTier === "family";
  return {
    ...base,
    allowed: true,
    accessMethod: isFamily ? "FAMILY" : "PASS",
    accessType: isFamily ? "family" : "membership_pass",
    reason: isFamily ? "FAMILY_FEATURE_ACCESS" : "PASS_FEATURE_ACCESS",
    familyQuota,
  };
}

export function resolveServerProductType({
  body = {},
  pricing = {},
  paymentType = "",
  serverProductType = "",
  productId = "",
} = {}) {
  const explicitServerType = normalizePurchaseProductType(serverProductType);
  if (explicitServerType !== NORMALIZED_PRODUCT_TYPES.UNKNOWN) return explicitServerType;

  const normalizedPaymentType = lower(paymentType);
  if (["subscription", "subscription_initial", "subscription_recurring", "membership_pass"].includes(normalizedPaymentType)) {
    return normalizedPaymentType === "subscription_recurring" ? NORMALIZED_PRODUCT_TYPES.SUBSCRIPTION : NORMALIZED_PRODUCT_TYPES.PASS;
  }
  if (body?.subscriptionTier || body?.passTier) return NORMALIZED_PRODUCT_TYPES.PASS;
  if (/^(cd_)?pass[_-]/i.test(text(productId)) || /^app-pass-/i.test(text(productId))) return NORMALIZED_PRODUCT_TYPES.PASS;

  const pricingType = normalizePurchaseProductType(pricing?.productType || pricing?.serviceType);
  if (pricingType !== NORMALIZED_PRODUCT_TYPES.UNKNOWN) return pricingType;
  if (pricing?.reportType || pricing?.pdf === true || pricing?.isPremium === true) return NORMALIZED_PRODUCT_TYPES.PREMIUM_CONTENT;

  const clientClaim = normalizePurchaseProductType(body?.productType || body?.serviceType);
  if (isPassLikeProductType(clientClaim)) return NORMALIZED_PRODUCT_TYPES.UNKNOWN;
  return NORMALIZED_PRODUCT_TYPES.FEATURE;
}

export function validatePurchasePolicy({
  userId = "",
  sku = "",
  productId = "",
  productType = NORMALIZED_PRODUCT_TYPES.UNKNOWN,
  price = 0,
  requestedPaymentMethod = "pg",
  currentEntitlements = null,
  currentSubscription = null,
  familyPlanInfo = null,
  orderContext = {},
} = {}) {
  const normalizedProductType = normalizePurchaseProductType(productType);
  const normalizedMethod = normalizePurchasePaymentMethod(requestedPaymentMethod);
  const passLike = isPassLikeProductType(normalizedProductType);
  const entitlement = currentEntitlements || currentSubscription || null;
  const activeFamily = Boolean(
    familyPlanInfo?.isActive
      || familyPlanInfo?.tier === "family"
      || familyPlanInfo?.passTier === "family"
      || entitlement?.tier === "family"
      || entitlement?.passTier === "family",
  );
  const base = {
    allowed: true,
    // A membership pass product is purchased only through direct KRW checkout.
    // Monthly credits remain a valid payment method for eligible content usage,
    // but cannot purchase another pass.
    allowedPaymentMethods: passLike ? ["pg"] : ["pg", "monthly_credit", "pass"],
    denialReason: null,
    normalizedProductType,
    policyVersion: PURCHASE_POLICY_VERSION,
    auditCode: "PURCHASE_POLICY_ALLOWED",
    userId: text(userId),
    sku: text(sku || productId),
    price: Number.isFinite(Number(price)) ? Math.max(0, Math.floor(Number(price))) : 0,
    orderContext,
  };

  if (normalizedProductType === NORMALIZED_PRODUCT_TYPES.UNKNOWN) {
    return {
      ...base,
      allowed: false,
      allowedPaymentMethods: [],
      denialReason: "UNVERIFIED_PRODUCT_TYPE",
      auditCode: "UNVERIFIED_PRODUCT_TYPE",
    };
  }
  if (!passLike) return base;

  if (normalizedMethod === "pass" || normalizedMethod === "entitlement" || normalizedMethod === "balance" || normalizedMethod === "credit" || normalizedMethod === "coin" || normalizedMethod === "coin_credit") {
    return {
      ...base,
      allowed: false,
      denialReason: normalizedMethod === "pass" || normalizedMethod === "entitlement"
        ? "CANNOT_BUY_PASS_WITH_PASS"
        : "INVALID_PAYMENT_METHOD_FOR_PASS_PRODUCT",
      auditCode: normalizedMethod === "pass" || normalizedMethod === "entitlement"
        ? "CANNOT_BUY_PASS_WITH_PASS"
        : "INVALID_PAYMENT_METHOD_FOR_PASS_PRODUCT",
    };
  }
  if (normalizedMethod === "family" || orderContext.coveredByPass === true || orderContext.userEntitlement) {
    return {
      ...base,
      allowed: false,
      denialReason: activeFamily ? "FAMILY_CANNOT_PURCHASE_HIGHER_TIER_PRODUCTS" : "CLIENT_PAYMENT_METHOD_TAMPERING_DETECTED",
      auditCode: activeFamily ? "FAMILY_CANNOT_PURCHASE_HIGHER_TIER_PRODUCTS" : "CLIENT_PAYMENT_METHOD_TAMPERING_DETECTED",
    };
  }
  if (normalizedMethod !== "pg") {
    return {
      ...base,
      allowed: false,
      denialReason: "INVALID_PAYMENT_METHOD_FOR_PASS_PRODUCT",
      auditCode: "INVALID_PAYMENT_METHOD_FOR_PASS_PRODUCT",
    };
  }
  return base;
}

export function isClientPassTampering(body = {}) {
  const method = normalizePurchasePaymentMethod(body.paymentMethod || body.paymentMode || body.accessMode);
  return body.coveredByPass === true
    || method === "pass"
    || method === "family"
    || method === "entitlement";
}
