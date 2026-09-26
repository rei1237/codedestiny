// Policy arithmetic only. Absent billing evidence is unknown, never free usage.
import { currentPassPlan } from '../lib/payment/pass-policy.js';
import { listProducts } from '../worker/payments/catalog.js';
import { PASS_COST_EVIDENCE } from '../lib/payment/pass-cost-evidence.js';
const plan=currentPassPlan('family');
const products=listProducts().filter(row=>row.featureKey.startsWith('yeongnyangi-'));
console.log(JSON.stringify({policyVersion:plan.passPolicyVersion,durationDays:plan.durationDays,
  familySalePriceKRW:plan.wonPrice,monthlyLimit:plan.monthlyLimitCoin,unlimitedGeneration:false,
  evidencePresent:Boolean(PASS_COST_EVIDENCE.family),applyNewCoverage:false,
  rows:products.map(product=>({featureKey:product.featureKey,priceKRW:product.priceKRW,deduction:product.priceCoins,
    maxSameProductUses:Math.floor(plan.monthlyLimitCoin/product.priceCoins),
    revenueAllocationAtFullUseKRW:plan.wonPrice*product.priceCoins/plan.monthlyLimitCoin,
    paymentFeeAllocationKRW:null,llmMeanKRW:null,llmP95KRW:null,retryRecoveryKRW:null,variableOperationsKRW:null,
    meanContributionKRW:null,p95ContributionKRW:null,decision:'KEEP_CURRENT_POLICY_EVIDENCE_MISSING'})),
  limitations:['Revenue allocation is policy arithmetic at list price, not a realized settlement.',
    'Actual discounts, fees, taxes, refunds and model invoices must be attributed to the same purchases.',
    'Concentrated tuna/maximum-use profitability is unknown; existing Family rights are preserved.'],
},null,2));
