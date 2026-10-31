import signupBenefitPolicy from './signup-benefit-policy.mjs';

// Amounts describe server-confirmed rewards. Neither reading this policy nor opening a popup grants access.
export const ACTIVATION_REWARD_VERSION = 'activation-20261031-v1';
export const FIRST_PAID_REWARD = Object.freeze({ amount: 500, days: 30 });
export const TUTORIAL_REWARD = signupBenefitPolicy;
export const FIRST_PAID_REWARD_START = '2026-10-31T00:00:00+09:00';
export const ACTIVATION_REWARD_KINDS = Object.freeze(['tutorial', 'first_paid']);
export const activationRewardId = (userId, kind) => `activation:${kind}:${userId}`;

export function hasLegacySignupReward(user = {}) {
  return user.profileSubscription?.membershipCreditLots?.some(lot => lot.lotId === 'signup' && Number(lot.amount) > 0) === true;
}
