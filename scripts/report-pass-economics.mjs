import { CURRENT_PASS_PLANS } from "../lib/payment/pass-policy.js";
import { passEconomics } from "../lib/payment/pass-economics.mjs";
// User budget: Cloudflare $5 + MongoDB KRW 100,000. FX 1,600 is a stress assumption, not a spot quote.
const fixedMonthlyKRW = 5 * 1600 + 100000;
const channels = { webPgVatSeparate: 0.055, googlePlay15: 0.15, googlePlay30: 0.30 };
const rows = Object.entries(channels).flatMap(([channel, feeRate]) => Object.values(CURRENT_PASS_PLANS).map(plan => {
  const input = { priceKRW: plan.wonPrice, vatRate: 0.1, feeRate, feeBasis: "gross", fixedMonthlyKRW };
  const budget = passEconomics(input);
  const atTarget = passEconomics({ ...input, worstProductCostKRW: budget.maximumProductCostKRW });
  return { tier: plan.tier, channel, priceKRW: plan.wonPrice, allowanceKRW: plan.monthlyLimitCoin * 100,
    maximumAllProductCostKRW: Math.floor(budget.maximumProductCostKRW),
    breakEvenSalesOnlyIf40PercentMarginVerified: atTarget.breakEvenMonthlySales,
    serverGrowth: [2, 3, 5].map(multiplier => ({ multiplier, fixedMonthlyKRW: fixedMonthlyKRW * multiplier,
      breakEvenSales: Math.ceil(fixedMonthlyKRW * multiplier / atTarget.contributionKRW) })),
    baseProductCostCeilingWithDoubleCostReserveKRW: Math.floor(budget.maximumProductCostKRW / 2) };
}));
console.log(JSON.stringify({ basis: "scenario-not-invoice", assumptions: { usdKrw: 1600, fixedMonthlyKRW,
  pgIncludesFeeVat: true, playFeeChargedOnGrossConservatively: true, actualGenerationCost: null,
  fxStress: { usdKrw: 2000, usdCostMultiplierVersusBase: 1.25, serverBaseKRW: 110000 } }, saleApproval: false, rows }, null, 2));
