// Planning arithmetic only. Assumptions never become sale evidence automatically.
export function passEconomics({ priceKRW, vatRate, feeRate, feeBasis, fixedMonthlyKRW, worstProductCostKRW = null, targetMargin = 0.4 }) {
  if (![priceKRW, vatRate, feeRate, fixedMonthlyKRW, targetMargin].every(Number.isFinite)
    || priceKRW <= 0 || vatRate < 0 || feeRate < 0 || feeRate >= 1 || fixedMonthlyKRW < 0
    || targetMargin < 0 || targetMargin >= 1 || !["gross", "net"].includes(feeBasis)
    || (worstProductCostKRW !== null && (!Number.isFinite(worstProductCostKRW) || worstProductCostKRW < 0))) throw new Error("Invalid economics input");
  const netRevenueKRW = priceKRW / (1 + vatRate);
  const paymentFeeKRW = (feeBasis === "gross" ? priceKRW : netRevenueKRW) * feeRate;
  const maximumProductCostKRW = netRevenueKRW * (1 - targetMargin) - paymentFeeKRW;
  const contributionKRW = worstProductCostKRW === null ? null : netRevenueKRW - paymentFeeKRW - worstProductCostKRW;
  const priceCoefficient = (1 - targetMargin) / (1 + vatRate) - feeRate / (feeBasis === "gross" ? 1 : 1 + vatRate);
  return { netRevenueKRW, paymentFeeKRW, maximumProductCostKRW, contributionKRW,
    contributionMargin: contributionKRW === null ? null : contributionKRW / netRevenueKRW,
    breakEvenMonthlySales: contributionKRW > 0 ? Math.ceil(fixedMonthlyKRW / contributionKRW) : null,
    minimumPriceForTargetKRW: worstProductCostKRW === null || priceCoefficient <= 0 ? null : Math.ceil(worstProductCostKRW / priceCoefficient / 100) * 100,
    saleApproval: false };
}

// Contract/invoice-derived settlement and overhead are mandatory, not a guessed PG percentage.
export function auditedSettlement(plan, channel, evidence) {
  const financials = evidence?.financials;
  if (!financials || financials.channel !== channel || financials.basis !== "reviewed"
    || !financials.sourceRefs?.length || !Number.isFinite(Date.parse(financials.reviewedAt))
    || !Number.isFinite(financials.minimumMonthlySales) || financials.minimumMonthlySales <= 0
    || !Number.isInteger(financials.minimumMonthlySales)) return null;
  try {
    const result = passEconomics({ ...financials, priceKRW: plan.wonPrice });
    if (Math.abs(result.netRevenueKRW - evidence.netRevenueKRW) > 1
      || Math.abs(result.paymentFeeKRW - evidence.paymentFeeKRW) > 1) return null;
    return { ...result, fixedCostPerPassKRW: financials.fixedMonthlyKRW / financials.minimumMonthlySales };
  } catch { return null; }
}
