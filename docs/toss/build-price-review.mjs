// Read canonical prices locally. This report never creates SKUs or changes prices.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {loadTsModule} from '../../scripts/lib/load-ts-module.mjs';
import {listServerPricedFeatureKeys,normalizePaidFeatureKey} from '../../worker/lib/paid-feature-registry.js';
import {getBillingFeaturePricing} from '../../worker/lib/billing-feature-registry.js';
const {products,chatQuestionProducts}=loadTsModule('worker/yeongnyangi/payments/catalog.ts');
const canonicalKeys=[...new Set(listServerPricedFeatureKeys().map(normalizePaidFeatureKey))];
const rows=canonicalKeys.map(featureKey=>{
  const resolved=getBillingFeaturePricing({featureKey});
  const pricing=resolved.ok?resolved.pricing:null;
  const amount=pricing?.amountKRW;
  // VAT at 10%, supply prices in increments of 10 => integer final price increments of 11.
  // These are review candidates, not approved or measured console prices.
  const candidates=Number.isSafeInteger(amount)&&amount>0?[...new Set([Math.floor(amount/11)*10,Math.ceil(amount/11)*10])]
    .filter(supply=>supply>=400&&supply<=1400000).map(supply=>({supplyKRW:supply,estimatedFinalKRW:supply*11/10,differenceKRW:supply*11/10-amount})):[];
  return {featureKey,webPriceKRW:amount??null,billingType:pricing?.billingType??null,accessModel:pricing?.accessModel??null,
    reviewCandidates:candidates,approvedSku:null,approvedFinalKRW:null,feeEvidence:null,llmCostEvidence:null,
    status:'requires-active-route-and-price-review'};
});
const consultations=[...products.map(p=>({...p,serviceId:'yeongnyangi'})),...['yeoni','neo'].flatMap(serviceId=>chatQuestionProducts().map(p=>({...p,serviceId})))];
const consultationRows=consultations.map(p=>({serviceId:p.serviceId,productId:p.id,featureKey:p.cdFeatureKey,webPriceKRW:p.priceKRW,
  systems:p.systems,depth:p.fishId,manifestVersion:p.manifestVersion,chapterCount:p.chapterCount,approvedSku:null}));
const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  policy:'Review only. Registry entries may be historical. Active route wins; no sales registration authorized by this file.',
  maxNonGameSkus:30,priceDecision:'user-review-required',skuGrouping:'same price alone does not establish equal entitlement',
  features:rows,consultations:consultationRows};
fs.writeFileSync(new URL('./price-review.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({canonicalPricingKeys:rows.length,consultationVariants:consultationRows.length,approvedSkuCount:0}));
