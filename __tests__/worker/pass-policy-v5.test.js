/** @jest-environment node */
import {
  CURRENT_PASS_POLICY_VERSION, CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS, V4_PASS_POLICY_VERSION, V4_PASS_PLANS,
  PREVIOUS_PASS_POLICY_VERSION, currentPassPlan, isPassPolicyMix, previousPassPlan, v4PassPlan,
} from '../../lib/payment/pass-policy.js';
import { assertPassSaleAllowed } from '../../worker/lib/pass-sale-policy.js';
import { resolvePassPolicy } from '../../worker/lib/profile-limits.js';
import { activatePassSubscription, createPayablePassOrder, resolvePassPlan } from '../../worker/payments/passes.js';
import { __paymentsContextTestUtils } from '../../worker/payments/index.js';
import { makeFakePaymentDb } from '../fixtures/fake-payment-db.mjs';

const now = new Date('2026-11-04T00:00:00Z');
const expiry = '2026-12-04T00:00:00.000Z';
const nextExpiry = '2027-01-03T00:00:00.000Z';
const userId = '64b000000000000000000002';

function holder(plan, monthlySpendCoin) {
  return {
    _id: userId,
    profileSubscription: {
      tier: plan.tier, passTier: plan.tier, passPolicyVersion: plan.passPolicyVersion, isActive: true,
      expiresAt: expiry, premiumUseCycleKey: expiry, monthlySpendCoin, monthlyLimitCoin: plan.monthlyLimitCoin,
    },
  };
}

function seedOrder(db, { idempotencyKey, tier, amount, version }) {
  db.rows.push({
    userId, merchantUid: `order-${idempotencyKey}`, idempotencyKey, paymentType: 'membership_pass',
    subscriptionTier: tier, paymentAmount: amount, status: 'pending',
    metadata: { durationMonths: 1, passPolicyVersion: version },
  });
}

test.each([
  ['standard', 14900, 200, 50],
  ['premium', 34900, 600, 100],
  ['vvip', 64900, 1200, 300],
  ['family', 154000, 3500, 999999999],
])('v5 %s sells at %i with limit %i and per-use cap %i', (tier, price, budget, cap) => {
  expect(CURRENT_PASS_POLICY_VERSION).toBe('flower-20261104');
  expect(currentPassPlan(tier)).toMatchObject({
    wonPrice: price, monthlyLimitCoin: budget, maxCoveredCoin: cap,
    planId: `${tier}_1m_v5`, appProductId: `cd_pass_${tier}_30d_v5`, passPolicyVersion: 'flower-20261104',
  });
  expect(resolvePassPlan(tier, 1, CURRENT_PASS_POLICY_VERSION)).toEqual(currentPassPlan(tier));
  expect(resolvePassPolicy(currentPassPlan(tier))).toMatchObject({ monthlyCoveredCoin: budget, maxCoveredCoin: cap });
});

test('v4 plan keeps 9900/29900/59900/149000', () => {
  expect(V4_PASS_POLICY_VERSION).toBe('flower-20260930');
  const prices = Object.fromEntries(Object.keys(V4_PASS_PLANS).map(tier => [tier, v4PassPlan(tier).wonPrice]));
  expect(prices).toEqual({ standard: 9900, premium: 29900, vvip: 59900, family: 149000 });
  expect(v4PassPlan('standard')).toMatchObject({ planId: 'standard_1m_v4', appProductId: 'cd_pass_standard_30d_v4', passPolicyVersion: V4_PASS_POLICY_VERSION });
  expect(resolvePassPlan('standard', 1, V4_PASS_POLICY_VERSION)).toEqual(v4PassPlan('standard'));
  expect(resolvePassPolicy(v4PassPlan('vvip'))).toMatchObject({ monthlyCoveredCoin: 1200, maxCoveredCoin: 300 });
});

test('plan IDs infer their own policy so a v4 hint never reprices to v5', () => {
  const resolve = planId => __paymentsContextTestUtils.resolvePassRequest({}, { tier: 'standard', planId, durationMonths: 1, paymentMethod: 'card_general' }).plan;
  expect(resolve('standard_1m_v5').wonPrice).toBe(14900);
  expect(resolve('standard_1m_v4').wonPrice).toBe(9900);
});

test('old v4 order still verifies and a 14900 amount on it drifts', async () => {
  const db = makeFakePaymentDb();
  seedOrder(db, { idempotencyKey: 'v4-ok', tier: 'standard', amount: 9900, version: V4_PASS_POLICY_VERSION });
  await expect(createPayablePassOrder(db, { userId, plan: v4PassPlan('standard'), idempotencyKey: 'v4-ok' }))
    .resolves.toMatchObject({ merchantUid: 'order-v4-ok', paymentAmount: 9900 });

  seedOrder(db, { idempotencyKey: 'v4-drift', tier: 'standard', amount: 14900, version: V4_PASS_POLICY_VERSION });
  await expect(createPayablePassOrder(db, { userId, plan: v4PassPlan('standard'), idempotencyKey: 'v4-drift' }))
    .rejects.toMatchObject({ code: 'PASS_SALE_ENDED' });
});

test('new web order cannot pick a v4 plan', () => {
  expect(() => assertPassSaleAllowed(v4PassPlan('standard'), 'web')).toThrow(expect.objectContaining({ code: 'PASS_SALE_ENDED' }));
  expect(() => assertPassSaleAllowed(currentPassPlan('standard'), 'web')).not.toThrow();
});

test('v5 play sale fails closed until approved', () => {
  expect(CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS).toEqual(['cd_pass_standard_30d_v4', 'cd_pass_premium_30d_v4', 'cd_pass_vvip_30d_v4']);
  expect(() => assertPassSaleAllowed(currentPassPlan('standard'), 'googlePlay')).toThrow(expect.objectContaining({ code: 'PASS_SALE_NOT_READY' }));
});

test('v4 holder can extend and upgrade on v5', async () => {
  const extendDb = makeFakePaymentDb();
  const extendUser = holder(v4PassPlan('standard'), 120);
  extendDb.rows.push(extendUser);
  expect(isPassPolicyMix(extendUser.profileSubscription, currentPassPlan('standard'), now)).toBe(false);
  await activatePassSubscription(extendDb, { userId, plan: currentPassPlan('standard'), orderId: 'extend-v5', expiresAt: nextExpiry, now, existing: extendUser });
  expect(extendUser.profileSubscription).toMatchObject({ passPolicyVersion: CURRENT_PASS_POLICY_VERSION, monthlySpendCoin: 120, monthlyLimitCoin: 400 });

  const upgradeDb = makeFakePaymentDb();
  const upgradeUser = holder(v4PassPlan('standard'), 120);
  upgradeDb.rows.push(upgradeUser);
  await activatePassSubscription(upgradeDb, { userId, plan: currentPassPlan('premium'), orderId: 'upgrade-v5', expiresAt: nextExpiry, now, existing: upgradeUser });
  expect(upgradeUser.profileSubscription).toMatchObject({ tier: 'premium', passPolicyVersion: CURRENT_PASS_POLICY_VERSION, monthlySpendCoin: 120, monthlyLimitCoin: 600 });
});

test('v3 holder with budget left is still blocked', async () => {
  const db = makeFakePaymentDb();
  const user = holder(previousPassPlan('standard'), 100);
  db.rows.push(user);
  expect(isPassPolicyMix(user.profileSubscription, currentPassPlan('standard'), now)).toBe(true);
  await expect(activatePassSubscription(db, { userId, plan: currentPassPlan('standard'), orderId: 'v3-block', expiresAt: nextExpiry, now, existing: user }))
    .rejects.toMatchObject({ code: 'PASS_POLICY_CONFLICT' });
  expect(PREVIOUS_PASS_POLICY_VERSION).toBe('flower-cost-20260921');
});
