/** @jest-environment node */
import { currentPassPlan, isPassPolicyMix, CURRENT_PASS_POLICY_VERSION } from "../../lib/payment/pass-policy.js";
import { auditPassProfitability } from "../../lib/payment/pass-profitability.js";
import { auditPassSale, auditPassSaleEvidence, assertPassSaleAllowed } from "../../worker/lib/pass-sale-policy.js";
import { resolvePassPolicy, resolveMonthlyPassLimitCoin, buildPassCycleFields, canUseByPass, isPassBudgetExhausted } from "../../worker/lib/profile-limits.js";
import { FEATURE_KEY_PRICE_TABLE } from "../../worker/lib/paid-feature-registry.js";
import { createPassOrder, resolvePassPlan, activatePassSubscription, evaluatePassCoverage, consumePassCoverage, describePassEligibility } from "../../worker/payments/passes.js";
import { giftDraftFor } from "../../worker/payments/gifts.js";
import { resolveProduct } from "../../worker/payments/catalog.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";
import { __paymentsContextTestUtils } from "../../worker/payments/index.js";
import { listPassCostProducts } from "../../worker/lib/pass-cost-catalog.js";

const now = new Date("2026-09-21T00:00:00Z");
const expiresAt = "2026-10-21T00:00:00.000Z";
describe("versioned flower passes", () => {
  test("old VVIP and Family rights are not upgraded or reduced", () => {
    expect(resolvePassPolicy({}, "vvip").maxCoveredCoin).toBe(200);
    expect(resolvePassPolicy(null, "vvip").maxCoveredCoin).toBe(200);
    expect(resolvePassPolicy(null)).toBeNull();
    expect(resolvePassPolicy({}, "family").monthlyCoveredCoin).toBe(5000);
    expect(resolvePassPolicy({ passPolicyVersion: "unknown" }, "vvip")).toBeNull();
  });
  test("new VVIP covers 30,000 and has exactly 90,000 base budget", () => {
    const plan = currentPassPlan("vvip");
    expect(plan.wonPrice).toBe(59900);
    expect(canUseByPass({ ...plan, isActive: true }, 300)).toBe(true);
    expect(canUseByPass({ ...plan, isActive: true }, 301)).toBe(false);
    expect(resolveMonthlyPassLimitCoin(plan, "vvip", "")).toBe(900);
    expect(isPassBudgetExhausted("vvip", 900, 900, plan)).toBe(true);
    expect(buildPassCycleFields({ tier: "vvip", expiresAt, now, passPolicyVersion: CURRENT_PASS_POLICY_VERSION }).monthlyLimitCoin).toBe(900);
  });
  test("active different policies cannot be stacked, expired ones can switch", () => {
    expect(isPassPolicyMix({ tier: "vvip", expiresAt }, currentPassPlan("vvip"), now)).toBe(true);
    expect(isPassPolicyMix({ tier: "vvip", expiresAt: "2026-09-01" }, currentPassPlan("vvip"), now)).toBe(false);
  });
  test("unverified cost evidence cannot open any new sales", () => {
    for (const tier of ["standard", "premium", "vvip"]) {
      expect(auditPassSale(tier).eligible).toBe(false);
      expect(() => assertPassSaleAllowed(currentPassPlan(tier))).toThrow();
    }
    expect(() => assertPassSaleAllowed({ tier: "family" })).toThrow();
  });
  test("three-card, five-card, saju and compatibility teas cost 5,000", () => {
    const tea = Object.entries(FEATURE_KEY_PRICE_TABLE).filter(([key]) => key.startsWith("fortune-tea-house-"));
    expect(tea).toHaveLength(5);
    expect(tea.every(([, value]) => value.amountKRW === 5000 && value.cost === 50)).toBe(true);
    expect(FEATURE_KEY_PRICE_TABLE["fusion-fortune-consultation"].amountKRW).toBe(30000);
    expect(FEATURE_KEY_PRICE_TABLE["yeongnyangi-saju-mackerel"].amountKRW).toBe(1000);
  });
});

test("real admission rejects new orders but preserves a pre-cutover pending order and its old budget", async () => {
  const userId = "64b000000000000000000001";
  const db = makeFakePaymentDb();
  for (const plan of [resolvePassPlan("family", 1), resolvePassPlan("vvip", 1), currentPassPlan("vvip")]) {
    await expect(createPassOrder(db, { userId, idempotencyKey: plan.planId, plan })).rejects.toThrow();
  }
  expect(db.rows).toHaveLength(0);
  const legacy = resolvePassPlan("vvip", 1);
  db.rows.push({ userId, merchantUid: "historical-vvip", idempotencyKey: "old-pending", paymentType: "membership_pass",
    subscriptionTier: "vvip", paymentAmount: 59000, status: "pending", metadata: { durationMonths: 1 } });
  const old = await createPassOrder(db, { userId, idempotencyKey: "old-pending", plan: legacy });
  expect(old.paymentAmount).toBe(59000);
  const user = { _id: userId, profileSubscription: { tier: "free" } };
  db.rows.push(user);
  await activatePassSubscription(db, { userId, plan: legacy, orderId: old.merchantUid, expiresAt, now, existing: user });
  expect(user.profileSubscription.passPolicyVersion).toBe("legacy");
  expect(user.profileSubscription.monthlyLimitCoin).toBe(2000);
  expect(resolvePassPolicy(user.profileSubscription).maxCoveredCoin).toBe(200);
});

test("public offers expose exactly three closed offers and cost coverage includes reason variants", async () => {
  const response = await __paymentsContextTestUtils.ROUTES["GET /pass-offers"].handle({ request: new Request("https://code-destiny.com/api/payments/pass-offers") });
  const body = await response.json();
  expect(body.offers.map(p => [p.tier, p.wonPrice, p.saleEnabled])).toEqual([
    ["standard", 9900, false], ["premium", 29900, false], ["vvip", 59900, false],
  ]);
  const catalog = listPassCostProducts(currentPassPlan("vvip"));
  expect(catalog.some(p => p.featureKey.includes("::"))).toBe(true);
  expect(catalog.some(p => p.featureKey.startsWith("yeongnyangi-"))).toBe(false);
  expect(catalog.some(p => p.featureKey === "fusion-fortune-consultation" && p.priceKRW === 30000)).toBe(true);
});

test("VVIP consumes three 30,000 readings exactly, preserves gift version, and excludes Yeongnyangi", async () => {
  const plan = currentPassPlan("vvip");
  expect(giftDraftFor({}, plan).productSnapshot.passPolicyVersion).toBe(CURRENT_PASS_POLICY_VERSION);
  const user = { _id: "64b000000000000000000001", profileSubscription: {
    ...plan, isActive: true, expiresAt, premiumUseCycleKey: expiresAt, monthlySpendCoin: 0,
  } };
  const db = makeFakePaymentDb(); db.rows.push(user);
  for (let i = 0; i < 3; i += 1) {
    const coverage = evaluatePassCoverage({ user, entitlement: user.profileSubscription, coinCost: 300 });
    expect(coverage.covered).toBe(true);
    expect(coverage.budgetCoin).toBe(900);
    expect(await consumePassCoverage(db, { userId: user._id, coverage, marker: `reading-${i}`, now })).toBeTruthy();
    expect(user.profileSubscription.monthlySpendCoin).toBe((i + 1) * 300);
  }
  expect(evaluatePassCoverage({ user, entitlement: user.profileSubscription, coinCost: 30 }).covered).toBe(false);
  const other = { profileSubscription: { ...plan, isActive: true, expiresAt } };
  expect(describePassEligibility({ user: other, entitlement: other.profileSubscription,
    product: resolveProduct({ featureKey: "yeongnyangi-saju-mackerel" }) }).eligible).toBe(false);
});

test("cost audit uses the most expensive repeatable combination, not the largest ticket", () => {
  const plan = currentPassPlan("standard");
  const products = [{ featureKey: "a", priceKRW: 3000 }, { featureKey: "b", priceKRW: 5000 }];
  const evidence = { reviewedAt: now.toISOString(), sourceRefs: ["test-fixture"], priceKRW: 9900,
    netRevenueKRW: 9000, paymentFeeKRW: 300, monthlyLimitCoin: 200, maxCoveredCoin: 50,
    products: { a: { priceKRW: 3000, maxCostKRW: 1000, sourceRefs: ["fixture"] }, b: { priceKRW: 5000, maxCostKRW: 1200, sourceRefs: ["fixture"] } } };
  const result = auditPassProfitability(plan, products, evidence);
  expect(result.worstCostKRW).toBe(6500); // 5 * 3,000 + 1 * 5,000, plus the payment fee
  expect(result.eligible).toBe(false);
  expect(auditPassProfitability(plan, [...products, { featureKey: "missing", priceKRW: 5000 }], evidence).eligible).toBe(false);
});


test("real sale admission requires growth reserves and enough contribution to cover fixed costs", () => {
  const plan = currentPassPlan("standard");
  const products = Object.fromEntries(listPassCostProducts(plan).map(p => [p.featureKey, { priceKRW: p.priceKRW, maxCostKRW: 50, sourceRefs: ["fixture-only"] }]));
  const evidence = { reviewedAt: now.toISOString(), sourceRefs: ["fixture-only"], priceKRW: plan.wonPrice,
    maxCoveredCoin: plan.maxCoveredCoin, monthlyLimitCoin: plan.monthlyLimitCoin, netRevenueKRW: 9000, paymentFeeKRW: 544.5, products,
    financials: { channel: "web", basis: "reviewed", reviewedAt: now.toISOString(), sourceRefs: ["fixture-only"], vatRate: 0.1,
      feeRate: 0.055, feeBasis: "gross", fixedMonthlyKRW: 108000, minimumMonthlySales: 100 },
    stress: { sourceRefs: ["fixture-only"], productCostMultiplier: 2, fixedMonthlyKRW: 540000 } };
  expect(auditPassSaleEvidence("standard", "web", evidence).eligible).toBe(true);
  expect(auditPassSaleEvidence("standard", "web", { ...evidence, stress: undefined }).reason).toBe("COST_GROWTH_REVIEW_MISSING");
  expect(auditPassSaleEvidence("standard", "web", { ...evidence, financials: { ...evidence.financials, minimumMonthlySales: 1 } }).reason).toBe("FIXED_COST_NOT_COVERED");
  const expensive = Object.fromEntries(Object.entries(products).map(([key, row]) => [key, { ...row, maxCostKRW: 1000 }]));
  expect(auditPassSaleEvidence("standard", "web", { ...evidence, products: expensive }).eligible).toBe(false);
});
