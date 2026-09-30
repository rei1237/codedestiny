/** @jest-environment node */
import { resolveProduct } from "../../worker/payments/catalog.js";
import { getBillingFeaturePricing } from "../../worker/lib/billing-feature-registry.js";
import { resolveAppContentTier } from "../../worker/lib/app-store-pricing.js";
import { grantEntitlement } from "../../worker/payments/entitlements.js";
import { CONTENT_ENTITLEMENT_STATUSES } from "../../worker/lib/models.js";
import { createOrder, createPayableOrder, markOrderPaid } from "../../worker/payments/orders.js";
import { evaluatePassCoverage } from "../../worker/payments/passes.js";
import { CURRENT_PASS_POLICY_VERSION, PREVIOUS_PASS_POLICY_VERSION, PRIOR_PASS_POLICY_VERSION, LEGACY_PASS_POLICY_VERSION } from "../../lib/payment/pass-policy.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "507f1f77bcf86cd799439011";
const PRODUCT = resolveProduct({ featureKey: "section_daewun" });
const OLD_PRODUCT = { ...PRODUCT, priceKRW: 3000, priceCoins: 30, monthlyCost: 300 };
const PROFILE = "daewun-profile";
const CONTENT = "saju.daeunAnalysis";

// The new sale price must agree at every resolver; no separate web/app/moonstone price table.
test("대운 신규 해금은 5,000원·월정석 500이며 앱도 같은 가격이다", () => {
  expect(PRODUCT).toMatchObject({
    productId: "unlock.section_daewun", featureKey: "section_daewun", billingType: "unlock",
    priceKRW: 5000, priceCoins: 50, monthlyCost: 500,
    allowedPaymentMethods: ["PASS", "DIRECT_KRW", "MOONLIGHT_STONE"],
  });
  expect(resolveProduct({ productId: "unlock.section_daewun" })).toEqual(PRODUCT);
  expect(getBillingFeaturePricing({ featureKey: PRODUCT.featureKey }).pricing).toMatchObject({ amountKRW: 5000, cost: 50 });
  expect(resolveAppContentTier(PRODUCT.priceCoins)).toMatchObject({ productId: "cd_content_tier_02", amountKRW: PRODUCT.priceKRW });
  expect(resolveProduct({ featureKey: "section_summary" }).priceKRW).toBe(3000);
  expect(resolveProduct({ featureKey: "rpt_quantumCard" }).priceKRW).toBe(5000);
});

test.each([
  [LEGACY_PASS_POLICY_VERSION, 300],
  [PRIOR_PASS_POLICY_VERSION, 200],
  [PREVIOUS_PASS_POLICY_VERSION, 400],
  [CURRENT_PASS_POLICY_VERSION, 200],
])("%s 스탠다드는 대운을 커버하지만 잔여 한도는 새 가격을 따른다", (passPolicyVersion, budgetCoin) => {
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  const entitlement = { isActive: true, tier: "standard", expiresAt };
  const user = { profileSubscription: { passPolicyVersion, premiumUseCycleKey: expiresAt, monthlySpendCoin: budgetCoin - 50 } };
  expect(evaluatePassCoverage({ user, entitlement, coinCost: PRODUCT.priceCoins })).toMatchObject({
    covered: true, coinCost: 50, perItemLimit: 50, remainingCoin: 0,
  });
  user.profileSubscription.monthlySpendCoin = budgetCoin - 49;
  expect(evaluatePassCoverage({ user, entitlement, coinCost: PRODUCT.priceCoins })).toMatchObject({
    covered: false, reason: "monthly_pass_limit_exceeded", remainingCoin: 49,
  });
});

test("기존 3,000원 대운 구매권은 새 가격에도 같은 프로필에서 유지된다", async () => {
  const db = makeFakePaymentDb();
  const grantedAt = new Date("2026-09-29T00:00:00Z");
  await grantEntitlement(db, {
    userId: USER, product: OLD_PRODUCT, profileId: PROFILE, contentKey: CONTENT,
    orderId: "old-daewun-order", now: grantedAt,
  });
  const restored = await grantEntitlement(db, {
    userId: USER, product: PRODUCT, profileId: PROFILE, contentKey: CONTENT,
    orderId: "new-price-reread",
  });
  expect(restored.alreadyOwned).toBe(true);
  expect(db.rows).toHaveLength(1);
  expect(db.rows[0]).toMatchObject({
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE, amountKRW: 3000, coinPrice: 30, orderId: "old-daewun-order",
    profileId: PROFILE, contentKey: CONTENT, grantedAt,
  });
  const otherProfile = await grantEntitlement(db, {
    userId: USER, product: PRODUCT, profileId: "another-profile", contentKey: CONTENT,
    orderId: "new-profile-purchase",
  });
  expect(otherProfile.alreadyOwned).toBe(false);
  expect(db.rows.find((row) => row.profileId === "another-profile").amountKRW).toBe(5000);
});

test("미결제 대운 주문은 재진입 시 새 가격으로 갱신된다", async () => {
  const db = makeFakePaymentDb();
  const input = { userId: USER, profileId: PROFILE, contentKey: CONTENT, idempotencyKey: "daewun-pending" };
  const old = await createOrder(db, { ...input, product: OLD_PRODUCT });
  const repriced = await createPayableOrder(db, { ...input, product: PRODUCT });
  expect(repriced.merchantUid).toBe(old.merchantUid);
  expect(repriced.paymentAmount).toBe(5000);
  expect(repriced.pricingSnapshot).toMatchObject({ priceKRW: 5000, priceCoins: 50, monthlyCost: 500 });
  expect(db.rows).toHaveLength(1);
});

test("이미 결제된 대운 주문의 3,000원 구매금액은 새 주문에 덮이지 않는다", async () => {
  const db = makeFakePaymentDb();
  const input = { userId: USER, profileId: PROFILE, contentKey: CONTENT, idempotencyKey: "daewun-paid" };
  const old = await createOrder(db, { ...input, product: OLD_PRODUCT });
  await markOrderPaid(db, { orderId: old.merchantUid, order: old, pg: {
    pgTransactionId: "old-daewun-tx", paidAt: new Date("2026-09-29T00:00:00Z"), method: "card",
    summary: { paymentId: "old-daewun-tx", amount: 3000, currency: "KRW" },
  } });
  const next = await createPayableOrder(db, { ...input, product: PRODUCT });
  expect(next.merchantUid).not.toBe(old.merchantUid);
  expect(next.paymentAmount).toBe(5000);
  expect(db.rows.find((row) => row.merchantUid === old.merchantUid)).toMatchObject({
    status: "paid", paymentAmount: 3000, pricingSnapshot: { priceKRW: 3000, priceCoins: 30 },
  });
});
