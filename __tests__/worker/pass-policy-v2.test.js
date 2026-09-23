/** @jest-environment node */
import { currentPassPlan, priorPassPlan, isPassPolicyMix, CURRENT_PASS_POLICY_VERSION, PRIOR_PASS_POLICY_VERSION } from "../../lib/payment/pass-policy.js";
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
  test("new VVIP covers one 30,000 product and prior v2 values remain readable", () => {
    const plan = currentPassPlan("vvip");
    expect(plan.wonPrice).toBe(79900);
    expect(canUseByPass({ ...plan, isActive: true }, 300)).toBe(true);
    expect(canUseByPass({ ...plan, isActive: true }, 301)).toBe(false);
    expect(resolveMonthlyPassLimitCoin(plan, "vvip", "")).toBe(2000);
    expect(isPassBudgetExhausted("vvip", 2000, 2000, plan)).toBe(true);
    expect(buildPassCycleFields({ tier: "vvip", expiresAt, now, passPolicyVersion: CURRENT_PASS_POLICY_VERSION }).monthlyLimitCoin).toBe(2000);
    expect(resolvePassPlan("vvip", 1, PRIOR_PASS_POLICY_VERSION)).toEqual(priorPassPlan("vvip"));
    expect(resolvePassPolicy({ tier: "vvip", passPolicyVersion: PRIOR_PASS_POLICY_VERSION }).monthlyCoveredCoin).toBe(900);
  });
  test("active different policies cannot be stacked, expired ones can switch", () => {
    expect(isPassPolicyMix({ tier: "vvip", expiresAt }, currentPassPlan("vvip"), now)).toBe(true);
    expect(isPassPolicyMix({ tier: "vvip", expiresAt: "2026-09-01" }, currentPassPlan("vvip"), now)).toBe(false);
  });
  test("approved web prices open web sales while Play remains closed without verified SKUs", () => {
    for (const tier of ["standard", "premium", "vvip", "family"]) {
      expect(auditPassSale(tier, "web")).toEqual({ eligible: true, reason: "APPROVED_WEB_PRICE_POLICY" });
      expect(auditPassSale(tier, "googlePlay").eligible).toBe(false);
      expect(() => assertPassSaleAllowed(currentPassPlan(tier), "web")).not.toThrow();
      expect(() => assertPassSaleAllowed(currentPassPlan(tier), "googlePlay")).toThrow();
    }
    expect(() => assertPassSaleAllowed({ tier: "family" })).toThrow();
  });
  test("Family v3 fixes unlimited profiles and at least three times the sale price in coverage", () => {
    const family = currentPassPlan("family");
    expect(family).toMatchObject({ planId: "family_1m_v3", wonPrice: 149000, monthlyLimitCoin: 5000, profileLimit: 0 });
    expect(family.monthlyLimitCoin * 100).toBeGreaterThanOrEqual(family.wonPrice * 3);
    expect(canUseByPass({ ...family, isActive: true }, 500)).toBe(true);
    expect(isPassBudgetExhausted("family", 4990, 5000, family)).toBe(false);
    expect(isPassBudgetExhausted("family", 4991, 5000, family)).toBe(true);
    expect(isPassBudgetExhausted("family", 5000, 5000, family)).toBe(true);
  });
  test("three-card, five-card, saju and compatibility teas cost 5,000", () => {
    const tea = Object.entries(FEATURE_KEY_PRICE_TABLE).filter(([key]) => key.startsWith("fortune-tea-house-"));
    expect(tea).toHaveLength(5);
    expect(tea.every(([, value]) => value.amountKRW === 5000 && value.cost === 50)).toBe(true);
    expect(FEATURE_KEY_PRICE_TABLE["fusion-fortune-consultation"]).toMatchObject({ cost: 500, amountKRW: 50000 });
    expect(FEATURE_KEY_PRICE_TABLE["yeongnyangi-saju-mackerel"].amountKRW).toBe(1000);
    expect(FEATURE_KEY_PRICE_TABLE["yeongnyangi-fusion-all"]).toMatchObject({ cost: 500, amountKRW: 50000, paymentScope: "direct_or_family" });
    for (const key of ["yeongnyangi-fusion-saju-ziwei", "yeongnyangi-fusion-sukuyo-vedic", "yeongnyangi-fusion-astrology-tarot"]) {
      expect(FEATURE_KEY_PRICE_TABLE[key].amountKRW).toBe(20000);
    }
  });
});

test("real admission accepts the approved web plan and preserves a pre-cutover pending order and its old budget", async () => {
  const userId = "64b000000000000000000001";
  const db = makeFakePaymentDb();
  for (const plan of [resolvePassPlan("family", 1), resolvePassPlan("vvip", 1)]) {
    await expect(createPassOrder(db, { userId, idempotencyKey: plan.planId, plan })).rejects.toThrow();
  }
  const current = currentPassPlan("vvip");
  const currentOrder = await createPassOrder(db, { userId, idempotencyKey: current.planId, plan: current });
  expect(currentOrder.paymentAmount).toBe(79900);
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

test("public offers expose four approved web offers and cost coverage includes reason variants", async () => {
  const response = await __paymentsContextTestUtils.ROUTES["GET /pass-offers"].handle({ request: new Request("https://code-destiny.com/api/payments/pass-offers") });
  const body = await response.json();
  expect(body.offers.map(p => [p.tier, p.wonPrice, p.saleEnabled])).toEqual([
    ["standard", 14900, true], ["premium", 39900, true], ["vvip", 79900, true], ["family", 149000, true],
  ]);
  const playResponse = await __paymentsContextTestUtils.ROUTES["GET /pass-offers"].handle({ request: new Request("https://code-destiny.com/api/payments/pass-offers?channel=googlePlay") });
  const playBody = await playResponse.json();
  expect(playBody.offers.map(p => [p.tier, p.wonPrice, p.saleEnabled])).toEqual([
    ["standard", 14900, false], ["premium", 39900, false], ["vvip", 79900, false], ["family", 149000, false],
  ]);
  const catalog = listPassCostProducts(currentPassPlan("vvip"));
  expect(catalog.some(p => p.featureKey.includes("::"))).toBe(true);
  expect(catalog.some(p => p.featureKey.startsWith("yeongnyangi-"))).toBe(false);
  expect(catalog.some(p => p.featureKey === "fusion-fortune-consultation")).toBe(false);
  const familyCatalog = listPassCostProducts(currentPassPlan("family"));
  expect(familyCatalog.some(p => p.featureKey === "fusion-fortune-consultation" && p.priceKRW === 50000)).toBe(true);
  expect(familyCatalog.filter(p => p.featureKey.startsWith("yeongnyangi-"))).toHaveLength(28);
});

test("Family repurchase stacks both 30-day duration and 500,000 won coverage", async () => {
  const plan = currentPassPlan("family");
  const userId = "64b000000000000000000001";
  const firstExpiry = new Date("2026-10-23T00:00:00.000Z");
  const secondExpiry = new Date("2026-11-22T00:00:00.000Z");
  const user = { _id: userId, profileSubscription: { tier: "free" } };
  const db = makeFakePaymentDb(); db.rows.push(user);
  await activatePassSubscription(db, { userId, plan, orderId: "family-first", paidAt: now, expiresAt: firstExpiry, now, existing: user });
  expect(user.profileSubscription.monthlyLimitCoin).toBe(5000);
  expect(user.profileSubscription.profileLimit).toBe(0);
  user.profileSubscription.monthlySpendCoin = 700;
  const extensionNow = new Date("2026-09-24T00:00:00.000Z");
  await activatePassSubscription(db, { userId, plan, orderId: "family-second", paidAt: extensionNow, expiresAt: secondExpiry, now: extensionNow, existing: user });
  expect(user.profileSubscription.monthlyLimitCoin).toBe(10000);
  expect(user.profileSubscription.monthlySpendCoin).toBe(700);
  expect(new Date(user.profileSubscription.expiresAt).toISOString()).toBe(secondExpiry.toISOString());
});

test("VVIP consumes one 30,000 reading exactly, preserves gift version, and Yeongnyangi is Family-only", async () => {
  const plan = currentPassPlan("vvip");
  expect(giftDraftFor({}, plan).productSnapshot.passPolicyVersion).toBe(CURRENT_PASS_POLICY_VERSION);
  const user = { _id: "64b000000000000000000001", profileSubscription: {
    ...plan, isActive: true, expiresAt, premiumUseCycleKey: expiresAt, monthlySpendCoin: 0,
  } };
  const db = makeFakePaymentDb(); db.rows.push(user);
  const coverage = evaluatePassCoverage({ user, entitlement: user.profileSubscription, coinCost: 300 });
  expect(coverage.covered).toBe(true);
  expect(coverage.budgetCoin).toBe(2000);
  expect(await consumePassCoverage(db, { userId: user._id, coverage, marker: "reading-0", now })).toBeTruthy();
  expect(user.profileSubscription.monthlySpendCoin).toBe(300);
  expect(evaluatePassCoverage({ user, entitlement: user.profileSubscription, coinCost: 30 }).covered).toBe(true);
  const other = { profileSubscription: { ...plan, isActive: true, expiresAt } };
  const yn = resolveProduct({ featureKey: "yeongnyangi-saju-mackerel" });
  expect(yn).toMatchObject({ familyPassOnly: true, monthlyExcluded: true, passExcluded: false, allowedPaymentMethods: ["FAMILY", "DIRECT_KRW"] });
  expect(describePassEligibility({ user: other, entitlement: other.profileSubscription, product: { ...yn, passExcluded: true } }).eligible).toBe(false);
});

test("cost audit uses the most expensive repeatable combination, not the largest ticket", () => {
  const plan = currentPassPlan("premium");
  const products = [{ featureKey: "a", priceKRW: 3000 }, { featureKey: "b", priceKRW: 5000 }];
  const evidence = { reviewedAt: now.toISOString(), sourceRefs: ["test-fixture"], priceKRW: plan.wonPrice,
    netRevenueKRW: 34078, paymentFeeKRW: 300, monthlyLimitCoin: 1000, maxCoveredCoin: 100,
    products: { a: { priceKRW: 3000, maxCostKRW: 1000, sourceRefs: ["fixture"] }, b: { priceKRW: 5000, maxCostKRW: 1200, sourceRefs: ["fixture"] } } };
  const result = auditPassProfitability(plan, products, evidence);
  expect(result.worstCostKRW).toBe(33300); // 33 * 1,000 is the costliest full-budget mix, plus the payment fee
  expect(result.eligible).toBe(false);
  expect(result.reason).toBe("MARGIN_BELOW_TARGET");
  expect(auditPassProfitability(plan, [...products, { featureKey: "missing", priceKRW: 5000 }], evidence).eligible).toBe(false);
});


test("real sale admission requires growth reserves and enough contribution to cover fixed costs", () => {
  const plan = currentPassPlan("standard");
  const products = Object.fromEntries(listPassCostProducts(plan).map(p => [p.featureKey, { priceKRW: p.priceKRW, maxCostKRW: 50, sourceRefs: ["fixture-only"] }]));
  const evidence = { reviewedAt: now.toISOString(), sourceRefs: ["fixture-only"], priceKRW: plan.wonPrice,
    maxCoveredCoin: plan.maxCoveredCoin, monthlyLimitCoin: plan.monthlyLimitCoin, netRevenueKRW: 13545.45, paymentFeeKRW: 819.5, products,
    financials: { channel: "web", basis: "reviewed", reviewedAt: now.toISOString(), sourceRefs: ["fixture-only"], vatRate: 0.1,
      feeRate: 0.055, feeBasis: "gross", fixedMonthlyKRW: 108000, minimumMonthlySales: 100 },
    stress: { sourceRefs: ["fixture-only"], productCostMultiplier: 2, fixedMonthlyKRW: 540000 } };
  expect(auditPassSaleEvidence("standard", "web", evidence).eligible).toBe(true);
  expect(auditPassSaleEvidence("standard", "web", { ...evidence, stress: undefined }).reason).toBe("COST_GROWTH_REVIEW_MISSING");
  expect(auditPassSaleEvidence("standard", "web", { ...evidence, financials: { ...evidence.financials, minimumMonthlySales: 1 } }).reason).toBe("FIXED_COST_NOT_COVERED");
  const expensive = Object.fromEntries(Object.entries(products).map(([key, row]) => [key, { ...row, maxCostKRW: 30000 }]));
  expect(auditPassSaleEvidence("standard", "web", { ...evidence, products: expensive }).eligible).toBe(false);
});
