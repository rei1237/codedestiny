import { readFile, writeFile } from "node:fs/promises";
import { CURRENT_PASS_PLANS } from "../lib/payment/pass-policy.js";
import { passEconomics } from "../lib/payment/pass-economics.mjs";
const planning = JSON.parse(await readFile(new URL("../config/pass-cost-planning-20260921.json", import.meta.url), "utf8"));
const assumptions = planning.assumptions;
const fixedMonthlyKRW = assumptions.fixedMonthlyKRW;
const channels = { webPgVatSeparate: 0.055, googlePlay15: 0.15, googlePlay30: 0.30 };

const runtimeRows = planning.runtimeBudgets.map((runtime) => {
  const logicalCalls = runtime.parts * runtime.durableAttemptsPerPart;
  const providerAttempts = logicalCalls * runtime.providerAttemptsPerLogicalCall;
  const outputTokens = (runtime.maxOutputTokensPerFullPartSet
    ? runtime.maxOutputTokensPerFullPartSet * runtime.durableAttemptsPerPart
    : logicalCalls * runtime.maxOutputTokensPerLogicalCall);
  const inputTokens = providerAttempts * assumptions.inputTokensPerProviderAttempt;
  const geminiTokenCostKRW = (inputTokens * assumptions.geminiInputUsdPerMillion
    + outputTokens * assumptions.geminiOutputUsdPerMillion) / 1_000_000 * assumptions.usdKrw;
  const planningVariableCostKRW = Math.ceil(geminiTokenCostKRW * assumptions.nonTokenVariableCostMultiplier / 100) * 100;
  return { ...runtime, logicalCalls, providerAttempts, inputTokens, outputTokens,
    geminiTokenCostKRW: Math.ceil(geminiTokenCostKRW), planningVariableCostKRW };
});
const pricingDriver = runtimeRows.reduce((worst, row) => !worst || row.planningVariableCostKRW / row.featurePriceKRW > worst.planningVariableCostKRW / worst.featurePriceKRW ? row : worst, null);

const rows = Object.entries(channels).flatMap(([channel, feeRate]) => Object.values(CURRENT_PASS_PLANS).map(plan => {
  const input = { priceKRW: plan.wonPrice, vatRate: 0.1, feeRate, feeBasis: "gross", fixedMonthlyKRW };
  const budget = passEconomics(input);
  const repeats = Math.floor(plan.monthlyLimitCoin / (pricingDriver.featurePriceKRW / 100));
  const planningCostKRW = repeats * pricingDriver.planningVariableCostKRW;
  const stressedProductCostKRW = planningCostKRW * assumptions.productCostStressMultiplier;
  const stressed = passEconomics({ ...input, fixedMonthlyKRW: assumptions.fixedCostStressMonthlyKRW, worstProductCostKRW: stressedProductCostKRW });
  return { tier: plan.tier, channel, priceKRW: plan.wonPrice, allowanceKRW: plan.monthlyLimitCoin * 100,
    maximumAllProductCostKRW: Math.floor(budget.maximumProductCostKRW),
    pricingDriver: pricingDriver.id, pricingDriverRepeats: repeats, planningVariableCostKRW: planningCostKRW,
    stressedProductCostKRW, stressedContributionKRW: Math.floor(stressed.contributionKRW),
    stressedContributionMargin: stressed.contributionMargin,
    minimumPriceForTargetKRW: passEconomics({ ...input, priceKRW: plan.wonPrice, worstProductCostKRW: stressedProductCostKRW }).minimumPriceForTargetKRW,
    fixedCostBreakEvenSales: stressed.breakEvenMonthlySales,
    coversFixedCostAtCurrentMonthlyRevenue: assumptions.currentMonthlyRevenueKRW >= assumptions.fixedCostStressMonthlyKRW };
}));
const report = { basis: planning.basis, reviewedAt: planning.reviewedAt, sourceRefs: planning.sourceRefs,
  assumptions: { ...assumptions, pgIncludesFeeVat: true, playFeeChargedOnGrossConservatively: true,
    actualGenerationCost: null }, pricingDriver: pricingDriver.id, runtimeRows, saleApproval: false, rows };
const output = `${JSON.stringify(report, null, 2)}\n`;
if (process.argv.includes("--write")) {
  await writeFile(new URL("../docs/verification/pass-economics-scenarios-20260921.json", import.meta.url), output, "utf8");
}
console.log(output.trimEnd());
