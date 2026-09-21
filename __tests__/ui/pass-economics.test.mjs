import test from "node:test";
import assert from "node:assert/strict";
import { passEconomics, auditedSettlement } from "../../lib/payment/pass-economics.mjs";
test("Play 30% gross fee and tax leave less cost capacity; unknown cost cannot pass", () => {
  const base = { priceKRW: 59900, vatRate: 0.1, feeRate: 0.3, feeBasis: "gross", fixedMonthlyKRW: 108000 };
  const result = passEconomics(base);
  assert.equal(Math.floor(result.maximumProductCostKRW), 14702);
  assert.equal(result.minimumPriceForTargetKRW, null);
  assert.equal(result.saleApproval, false);
  const loss = passEconomics({ ...base, worstProductCostKRW: 40000 });
  assert.equal(loss.breakEvenMonthlySales, null);
  assert.ok(loss.minimumPriceForTargetKRW > 59900);
  assert.ok(passEconomics({ ...base, feeRate: 0.055 }).maximumProductCostKRW > result.maximumProductCostKRW);
});
test("settlement rejects assumptions, mismatched fee totals and missing volume", () => {
  const plan = { wonPrice: 9900 };
  const financials = { channel: "web", basis: "reviewed", sourceRefs: ["fixture"], reviewedAt: "2026-09-21",
    vatRate: 0.1, feeRate: 0.055, feeBasis: "gross", fixedMonthlyKRW: 108000, minimumMonthlySales: 100 };
  const evidence = { financials, netRevenueKRW: 9000, paymentFeeKRW: 544.5 };
  assert.equal(auditedSettlement(plan, "web", evidence).fixedCostPerPassKRW, 1080);
  assert.equal(auditedSettlement(plan, "googlePlay", evidence), null);
  assert.equal(auditedSettlement(plan, "web", { ...evidence, paymentFeeKRW: 0 }), null);
  assert.equal(auditedSettlement(plan, "web", { ...evidence, financials: { ...financials, basis: "assumption" } }), null);
});
