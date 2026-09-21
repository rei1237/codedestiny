// Pure, conservative unbounded-knapsack audit: the customer may repeat any eligible SKU.
// Costs include generation, all allowed retries, storage and support/refund provision.
export function auditPassProfitability(plan, products, evidence) {
  const blocked = (reason) => ({ eligible: false, reason });
  if (!evidence || !evidence.reviewedAt || !evidence.sourceRefs?.length) return blocked("COST_EVIDENCE_MISSING");
  if (!Number.isFinite(Date.parse(evidence.reviewedAt))) return blocked("COST_EVIDENCE_INVALID");
  if (!(evidence.netRevenueKRW > 0 && evidence.netRevenueKRW <= plan.wonPrice)
    || !(evidence.paymentFeeKRW >= 0) || !Number.isFinite(evidence.paymentFeeKRW)) return blocked("COST_EVIDENCE_INVALID");
  if (evidence.priceKRW !== plan.wonPrice || evidence.monthlyLimitCoin !== plan.monthlyLimitCoin
    || evidence.maxCoveredCoin !== plan.maxCoveredCoin) return blocked("COST_EVIDENCE_STALE");
  if (!products.length) return blocked("COST_CATALOG_EMPTY");
  const rows = [];
  for (const product of products) {
    const row = evidence.products?.[product.featureKey];
    if (!row || !row.sourceRefs?.length || row.priceKRW !== product.priceKRW
      || !Number.isFinite(row.maxCostKRW) || row.maxCostKRW < 0) return blocked("COST_PRODUCT_EVIDENCE_MISSING");
    const units = product.priceKRW / 100;
    if (!Number.isInteger(units) || units <= 0) return blocked("COST_PRICE_INVALID");
    rows.push({ units, cost: row.maxCostKRW, featureKey: product.featureKey });
  }
  const dp = Array(plan.monthlyLimitCoin + 1).fill(0);
  const chosen = Array(dp.length).fill(null);
  for (let budget = 1; budget < dp.length; budget += 1) {
    dp[budget] = dp[budget - 1];
    for (const row of rows) if (row.units <= budget && dp[budget - row.units] + row.cost > dp[budget]) {
      dp[budget] = dp[budget - row.units] + row.cost;
      chosen[budget] = row;
    }
  }
  const combination = {};
  for (let budget = plan.monthlyLimitCoin; budget > 0;) {
    const row = chosen[budget];
    if (!row) { budget -= 1; continue; }
    combination[row.featureKey] = (combination[row.featureKey] || 0) + 1;
    budget -= row.units;
  }
  const worstCostKRW = dp[plan.monthlyLimitCoin] + evidence.paymentFeeKRW;
  const contributionMargin = (evidence.netRevenueKRW - worstCostKRW) / evidence.netRevenueKRW;
  return { eligible: contributionMargin >= 0.4, reason: contributionMargin >= 0.4 ? "READY" : "MARGIN_BELOW_TARGET",
    worstCostKRW, contributionMargin, combination };
}
