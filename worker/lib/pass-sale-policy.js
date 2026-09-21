import { CURRENT_PASS_PLANS, CURRENT_PASS_POLICY_VERSION, currentPassPlan, passPolicyVersion } from "../../lib/payment/pass-policy.js";
import { PASS_COST_EVIDENCE } from "../../lib/payment/pass-cost-evidence.js";
import { auditPassProfitability } from "../../lib/payment/pass-profitability.js";
import { listPassCostProducts } from "./pass-cost-catalog.js";
import { paymentError } from "../payments/errors.js";
import { auditedSettlement } from "../../lib/payment/pass-economics.mjs";

export function auditPassSaleEvidence(tier, channel, evidence) {
  const plan = currentPassPlan(tier);
  if (!plan) return { eligible: false, reason: "PASS_SALE_ENDED" };
  const products = listPassCostProducts(plan);
  if (channel === "googlePlay" && evidence?.verifiedProductId !== plan.appProductId) return { eligible: false, reason: "APP_SKU_NOT_VERIFIED" };
  const settlement = auditedSettlement(plan, channel, evidence);
  if (!settlement) return { eligible: false, reason: "SETTLEMENT_EVIDENCE_MISSING" };
  const result = auditPassProfitability(plan, products, evidence);
  if (!Number.isFinite(result.worstCostKRW)) return result;
  const stress = evidence.stress;
  if (!stress?.sourceRefs?.length || !Number.isFinite(stress.productCostMultiplier) || stress.productCostMultiplier < 2
    || !Number.isFinite(stress.fixedMonthlyKRW) || stress.fixedMonthlyKRW < evidence.financials.fixedMonthlyKRW * 5) {
    return { ...result, eligible: false, reason: "COST_GROWTH_REVIEW_MISSING" };
  }
  const stressedProductCostKRW = (result.worstCostKRW - settlement.paymentFeeKRW) * stress.productCostMultiplier;
  const stressedContributionKRW = settlement.netRevenueKRW - settlement.paymentFeeKRW - stressedProductCostKRW;
  const stressedMargin = stressedContributionKRW / settlement.netRevenueKRW;
  const operatingProfitPerPassKRW = stressedContributionKRW - stress.fixedMonthlyKRW / evidence.financials.minimumMonthlySales;
  const eligible = result.eligible && stressedMargin >= 0.4 && operatingProfitPerPassKRW > 0;
  return { ...result, stressedMargin, operatingProfitPerPassKRW, eligible,
    reason: !result.eligible ? result.reason : stressedMargin < 0.4 ? "COST_GROWTH_MARGIN_LOW" : operatingProfitPerPassKRW > 0 ? "READY" : "FIXED_COST_NOT_COVERED" };
}

export function auditPassSale(tier, channel = "web") {
  return auditPassSaleEvidence(tier, channel, PASS_COST_EVIDENCE[tier]?.[channel]);
}

export function assertPassSaleAllowed(plan, channel = "web") {
  if (passPolicyVersion(plan) !== CURRENT_PASS_POLICY_VERSION) {
    throw paymentError("PASS_SALE_ENDED", "이 이용권의 신규 판매가 종료되었습니다. 기존 구매 내역은 계속 이용할 수 있습니다.");
  }
  const result = auditPassSale(plan.tier, channel);
  if (!result.eligible) throw paymentError("PASS_SALE_NOT_READY", "새 이용권 판매를 준비하고 있습니다. 개별 서비스는 단건 결제로 이용할 수 있습니다.");
}

export function listCurrentPassOffers(channel = "web") {
  return Object.keys(CURRENT_PASS_PLANS).map(tier => ({ ...currentPassPlan(tier), saleEnabled: auditPassSale(tier, channel).eligible }));
}
