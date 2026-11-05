// Missing versions belong to the historical four-tier policy, never to the new offer.
export const LEGACY_PASS_POLICY_VERSION = "legacy";
export const PRIOR_PASS_POLICY_VERSION = "flower-20260921";
export const PREVIOUS_PASS_POLICY_VERSION = "flower-cost-20260921";
export const V4_PASS_POLICY_VERSION = "flower-20260930";
export const CURRENT_PASS_POLICY_VERSION = "flower-20261104";
export const CURRENT_PASS_WEB_SALE_ENABLED = true;
// 2026-10-24: v4 prices approved for Play after Console SKU registration.
// v5 SKUs join this list only after they are registered in Play Console (fail closed until then).
// This is a sales decision, not reviewed cost or settlement evidence.
export const CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS = Object.freeze([
  "cd_pass_standard_30d_v4",
  "cd_pass_premium_30d_v4",
  "cd_pass_vvip_30d_v4",
]);
export const PRIOR_PASS_PLANS = Object.freeze({
  standard: Object.freeze({ tier: "standard", name: "작은 꿀단지", wonPrice: 9900, maxCoveredCoin: 50, monthlyLimitCoin: 200, profileLimit: 0 }),
  premium: Object.freeze({ tier: "premium", name: "중간 꿀단지", wonPrice: 29900, maxCoveredCoin: 100, monthlyLimitCoin: 500, profileLimit: 0 }),
  vvip: Object.freeze({ tier: "vvip", name: "큰 꿀단지", wonPrice: 59900, maxCoveredCoin: 300, monthlyLimitCoin: 900, profileLimit: 0 }),
});
export const PREVIOUS_PASS_PLANS = Object.freeze({
  standard: Object.freeze({ tier: "standard", name: "작은 꿀단지", wonPrice: 14900, maxCoveredCoin: 50, monthlyLimitCoin: 400, profileLimit: 0 }),
  premium: Object.freeze({ tier: "premium", name: "중간 꿀단지", wonPrice: 39900, maxCoveredCoin: 100, monthlyLimitCoin: 1000, profileLimit: 0 }),
  vvip: Object.freeze({ tier: "vvip", name: "큰 꿀단지", wonPrice: 79900, maxCoveredCoin: 300, monthlyLimitCoin: 2000, profileLimit: 0 }),
  family: Object.freeze({ tier: "family", name: "패밀리 꿀단지", wonPrice: 149000, maxCoveredCoin: 999999999, monthlyLimitCoin: 5000, profileLimit: 0 }),
});

export const V4_PASS_PLANS = Object.freeze({
  standard: Object.freeze({ tier: "standard", name: "작은 꿀단지", wonPrice: 9900, maxCoveredCoin: 50, monthlyLimitCoin: 200, profileLimit: 0 }),
  premium: Object.freeze({ tier: "premium", name: "중간 꿀단지", wonPrice: 29900, maxCoveredCoin: 100, monthlyLimitCoin: 600, profileLimit: 0 }),
  vvip: Object.freeze({ tier: "vvip", name: "큰 꿀단지", wonPrice: 59900, maxCoveredCoin: 300, monthlyLimitCoin: 1200, profileLimit: 0 }),
  family: Object.freeze({ tier: "family", name: "패밀리 꿀단지", wonPrice: 149000, maxCoveredCoin: 999999999, monthlyLimitCoin: 3500, profileLimit: 0 }),
});

export const CURRENT_PASS_PLANS = Object.freeze({
  standard: Object.freeze({ tier: "standard", name: "작은 꿀단지", wonPrice: 14900, maxCoveredCoin: 50, monthlyLimitCoin: 200, profileLimit: 0 }),
  premium: Object.freeze({ tier: "premium", name: "중간 꿀단지", wonPrice: 34900, maxCoveredCoin: 100, monthlyLimitCoin: 600, profileLimit: 0 }),
  vvip: Object.freeze({ tier: "vvip", name: "큰 꿀단지", wonPrice: 64900, maxCoveredCoin: 300, monthlyLimitCoin: 1200, profileLimit: 0 }),
  family: Object.freeze({ tier: "family", name: "패밀리 꿀단지", wonPrice: 154000, maxCoveredCoin: 999999999, monthlyLimitCoin: 3500, profileLimit: 0 }),
});

export function previousPassPlan(tier) {
  const plan = PREVIOUS_PASS_PLANS[tier];
  return plan ? Object.freeze({ ...plan, passPolicyVersion: PREVIOUS_PASS_POLICY_VERSION,
    planId: `${tier}_1m_v3`, appProductId: `cd_pass_${tier}_30d_v3`,
    durationMonths: 1, durationDays: 30, productType: "membership_pass" }) : null;
}

export function passPolicyVersion(value = {}) {
  return String(value?.passPolicyVersion || value?.metadata?.passPolicyVersion || LEGACY_PASS_POLICY_VERSION);
}

export function currentPassPlan(tier) {
  const plan = CURRENT_PASS_PLANS[tier];
  return plan ? Object.freeze({ ...plan, passPolicyVersion: CURRENT_PASS_POLICY_VERSION,
    planId: `${tier}_1m_v5`, appProductId: `cd_pass_${tier}_30d_v5`,
    durationMonths: 1, durationDays: 30, productType: "membership_pass" }) : null;
}

export function v4PassPlan(tier) {
  const plan = V4_PASS_PLANS[tier];
  return plan ? Object.freeze({ ...plan, passPolicyVersion: V4_PASS_POLICY_VERSION,
    planId: `${tier}_1m_v4`, appProductId: `cd_pass_${tier}_30d_v4`,
    durationMonths: 1, durationDays: 30, productType: "membership_pass" }) : null;
}

export function priorPassPlan(tier) {
  const plan = PRIOR_PASS_PLANS[tier];
  return plan ? Object.freeze({ ...plan, passPolicyVersion: PRIOR_PASS_POLICY_VERSION,
    planId: `${tier}_1m_v2`, appProductId: `cd_pass_${tier}_30d_v2`,
    durationMonths: 1, durationDays: 30, productType: "membership_pass" }) : null;
}

// v4와 v5는 금액 한도·건당 상한이 같고 가격만 다르므로 같은 이용권 위에서 연장·업그레이드할 수 있다.
const MIXABLE_PASS_POLICY_VERSIONS = new Set([V4_PASS_POLICY_VERSION, CURRENT_PASS_POLICY_VERSION]);

export function isPassPolicyMix(prior = {}, next = {}, now = new Date()) {
  const priorVersion = passPolicyVersion(prior);
  const nextVersion = passPolicyVersion(next);
  if (MIXABLE_PASS_POLICY_VERSIONS.has(priorVersion) && MIXABLE_PASS_POLICY_VERSIONS.has(nextVersion)) return false;
  return new Date(prior?.expiresAt || 0).getTime() > new Date(now).getTime()
    && priorVersion !== nextVersion;
}
