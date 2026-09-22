// Missing versions belong to the historical four-tier policy, never to the new offer.
export const LEGACY_PASS_POLICY_VERSION = "legacy";
export const PRIOR_PASS_POLICY_VERSION = "flower-20260921";
export const CURRENT_PASS_POLICY_VERSION = "flower-cost-20260921";
export const CURRENT_PASS_WEB_SALE_ENABLED = true;
export const PRIOR_PASS_PLANS = Object.freeze({
  standard: Object.freeze({ tier: "standard", name: "꽃돼지 스탠다드", wonPrice: 9900, maxCoveredCoin: 50, monthlyLimitCoin: 200, profileLimit: 3 }),
  premium: Object.freeze({ tier: "premium", name: "꽃돼지 프리미엄", wonPrice: 29900, maxCoveredCoin: 100, monthlyLimitCoin: 500, profileLimit: 7 }),
  vvip: Object.freeze({ tier: "vvip", name: "꽃돼지 VVIP", wonPrice: 59900, maxCoveredCoin: 300, monthlyLimitCoin: 900, profileLimit: 15 }),
});
export const CURRENT_PASS_PLANS = Object.freeze({
  standard: Object.freeze({ tier: "standard", name: "꽃돼지 스탠다드", wonPrice: 14900, maxCoveredCoin: 50, monthlyLimitCoin: 200, profileLimit: 3 }),
  premium: Object.freeze({ tier: "premium", name: "꽃돼지 프리미엄", wonPrice: 39900, maxCoveredCoin: 100, monthlyLimitCoin: 500, profileLimit: 7 }),
  vvip: Object.freeze({ tier: "vvip", name: "꽃돼지 VVIP", wonPrice: 79900, maxCoveredCoin: 300, monthlyLimitCoin: 900, profileLimit: 15 }),
});

export function passPolicyVersion(value = {}) {
  return String(value?.passPolicyVersion || value?.metadata?.passPolicyVersion || LEGACY_PASS_POLICY_VERSION);
}

export function currentPassPlan(tier) {
  const plan = CURRENT_PASS_PLANS[tier];
  return plan ? Object.freeze({ ...plan, passPolicyVersion: CURRENT_PASS_POLICY_VERSION,
    planId: `${tier}_1m_v3`, appProductId: `cd_pass_${tier}_30d_v3`,
    durationMonths: 1, durationDays: 30, productType: "membership_pass" }) : null;
}

export function priorPassPlan(tier) {
  const plan = PRIOR_PASS_PLANS[tier];
  return plan ? Object.freeze({ ...plan, passPolicyVersion: PRIOR_PASS_POLICY_VERSION,
    planId: `${tier}_1m_v2`, appProductId: `cd_pass_${tier}_30d_v2`,
    durationMonths: 1, durationDays: 30, productType: "membership_pass" }) : null;
}

export function isPassPolicyMix(prior = {}, next = {}, now = new Date()) {
  return new Date(prior?.expiresAt || 0).getTime() > new Date(now).getTime()
    && passPolicyVersion(prior) !== passPolicyVersion(next);
}
