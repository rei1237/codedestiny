const HONEY_DURATION_DAYS = 30;

export const HONEY_SUBSCRIPTION_PLANS = Object.freeze({
  free: Object.freeze({
    planId: "free",
    name: "무료 플랜",
    priceCoins: 0,
    durationDays: 0,
    profileLimit: 1,
    freeServiceThresholdCoins: 0,
    autoRenewSupported: false,
  }),
  honey_standard: Object.freeze({
    planId: "honey_standard",
    name: "스탠다드 꿀",
    priceCoins: 115,
    displayPriceKRW: "9,900원 상당",
    durationDays: HONEY_DURATION_DAYS,
    profileLimit: 3,
    freeServiceThresholdCoins: 30,
    autoRenewSupported: true,
  }),
  honey_premium: Object.freeze({
    planId: "honey_premium",
    name: "프리미엄 꿀",
    priceCoins: 360,
    displayPriceKRW: "29,900원 상당",
    durationDays: HONEY_DURATION_DAYS,
    profileLimit: 7,
    freeServiceThresholdCoins: 50,
    autoRenewSupported: true,
    recommended: true,
  }),
  honey_vvip: Object.freeze({
    planId: "honey_vvip",
    name: "VVIP 꿀단지",
    priceCoins: 700,
    displayPriceKRW: "59,000원 상당",
    durationDays: HONEY_DURATION_DAYS,
    profileLimit: 15,
    freeServiceThresholdCoins: 100,
    autoRenewSupported: true,
    isVvip: true,
  }),
});

const HONEY_PLAN_ALIASES = Object.freeze({
  free: "free",
  honey_standard: "honey_standard",
  honey_premium: "honey_premium",
  honey_vvip: "honey_vvip",
  standard: "honey_standard",
  premium: "honey_premium",
  vvip: "honey_vvip",
});

const PLAN_ID_TO_LEGACY_TIER = Object.freeze({
  free: "free",
  honey_standard: "standard",
  honey_premium: "premium",
  honey_vvip: "vvip",
});

const LEGACY_TIER_TO_PLAN_ID = Object.freeze({
  free: "free",
  standard: "honey_standard",
  premium: "honey_premium",
  vvip: "honey_vvip",
});

const HONEY_SUBSCRIPTION_STATUS = new Set([
  "none",
  "active",
  "expired",
  "renewal_failed",
  "canceled",
]);

const HONEY_RENEWAL_FAIL_REASON = new Set([
  "INSUFFICIENT_COINS",
  "PAYMENT_ERROR",
  "UNKNOWN",
]);

export function normalizeHoneyPlanId(value) {
  const key = String(value || "").trim().toLowerCase();
  return HONEY_PLAN_ALIASES[key] || null;
}

export function normalizeHoneyStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  if (!HONEY_SUBSCRIPTION_STATUS.has(status)) return "none";
  return status;
}

export function normalizeHoneyRenewalFailReason(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!HONEY_RENEWAL_FAIL_REASON.has(code)) return null;
  return code;
}

export function getHoneyPlan(planIdRaw) {
  const planId = normalizeHoneyPlanId(planIdRaw) || "free";
  return HONEY_SUBSCRIPTION_PLANS[planId] || HONEY_SUBSCRIPTION_PLANS.free;
}

export function listPublicHoneySubscriptionPlans() {
  return [
    HONEY_SUBSCRIPTION_PLANS.free,
    HONEY_SUBSCRIPTION_PLANS.honey_standard,
    HONEY_SUBSCRIPTION_PLANS.honey_premium,
    HONEY_SUBSCRIPTION_PLANS.honey_vvip,
  ].map((plan) => ({ ...plan }));
}

export function honeyPlanIdToLegacyTier(planIdRaw) {
  const planId = normalizeHoneyPlanId(planIdRaw) || "free";
  return PLAN_ID_TO_LEGACY_TIER[planId] || "free";
}

export function legacyTierToHoneyPlanId(tierRaw) {
  const tier = String(tierRaw || "").trim().toLowerCase();
  return LEGACY_TIER_TO_PLAN_ID[tier] || "free";
}

export function isPaidHoneyPlan(planIdRaw) {
  const planId = normalizeHoneyPlanId(planIdRaw);
  return Boolean(planId && planId !== "free");
}

export function resolveHoneyBenefits(planIdRaw, isActive) {
  const active = Boolean(isActive && isPaidHoneyPlan(planIdRaw));
  const plan = active ? getHoneyPlan(planIdRaw) : HONEY_SUBSCRIPTION_PLANS.free;
  return {
    isSubscriber: active,
    profileLimit: Number(plan.profileLimit || 1),
    freeServiceThresholdCoins: Number(plan.freeServiceThresholdCoins || 0),
    sharedAcrossProfiles: active,
  };
}

export function addDaysFromDate(dateLike, durationDays) {
  const baseDate = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const duration = Number(durationDays);
  if (!Number.isFinite(baseDate.getTime())) return null;
  if (!Number.isFinite(duration) || duration <= 0) return new Date(baseDate.getTime());
  return new Date(baseDate.getTime() + Math.floor(duration) * 86400000);
}

export function getDefaultHoneyDurationDays() {
  return HONEY_DURATION_DAYS;
}
