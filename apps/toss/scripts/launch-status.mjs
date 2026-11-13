// Read-only inventory report. This command cannot enable sales, upload or deploy.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {APPROVED_TOSS_PRODUCTS,APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS,APPROVED_TOSS_NATIVE_PRODUCTS,approvedProduct} from '../../../worker/toss/catalog.js';
import {getBillingFeaturePricing} from '../../../worker/lib/billing-feature-registry.js';
import {reviewProductIds} from '../../../worker/toss/review-products.js';
import {reviewServices} from '../src/review-scope.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const inventory=JSON.parse(fs.readFileSync(path.join(root,'docs/toss/full-service-inventory.json'),'utf8'));
const knownStatuses=new Set(['local-partial','verified-full-flow','not-ported','requires-full-flow-port-and-verification','excluded']);
if(inventory.canonicalCandidates.some(item=>!knownStatuses.has(item.status)))throw new Error('Unknown inventory candidate status');
const selectedIds=new Set(reviewServices.map(service=>service.id));
const selected=inventory.canonicalCandidates.filter(item=>selectedIds.has(item.id));
if(!selected.length||selected.length!==reviewServices.length)throw new Error('Review services must be unique and present in the inventory');
const local=selected.filter(item=>item.status==='local-partial');
const complete=selected.filter(item=>item.status==='verified-full-flow');
const excluded=inventory.canonicalCandidates.filter(item=>item.status==='excluded');
if(excluded.some(item=>typeof item.exclusionReason!=='string'||!item.exclusionReason.trim()))throw new Error('Every exclusion needs a documented reason');
const remaining=selected.filter(item=>!['local-partial','verified-full-flow'].includes(item.status));
const deferred=inventory.canonicalCandidates.filter(item=>!selectedIds.has(item.id));
const approvedSkus=items=>new Set(items.filter(item=>item.approved===true&&typeof item.sku==='string'&&item.sku.length>0&&item.sku.trim()===item.sku).map(item=>item.sku));
const approvedEntries=[...APPROVED_TOSS_PRODUCTS,...APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS,...APPROVED_TOSS_NATIVE_PRODUCTS].filter(item=>item.approved===true);
const skuCounts=new Map();for(const item of approvedEntries)if(typeof item.sku==='string'&&item.sku.length>0&&item.sku.trim()===item.sku)skuCounts.set(item.sku,(skuCounts.get(item.sku)||0)+1);
// The web registry price stays unchanged; Toss records the exact console price.
const reviewProducts=reviewProductIds.map(productId=>{
  const serviceId=productId==='chat_saju'?'yeoni':'yeongnyangi';
  const featureKey=serviceId==='yeoni'?'fortune-chat-consultation':'yeongnyangi-'+productId.replace('_','-');
  const amount=getBillingFeaturePricing({featureKey}).pricing?.amountKRW;
  if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('Review product missing its registry price: '+productId);
  const matching=APPROVED_TOSS_PRODUCTS.filter(item=>item.approved&&item.productId===productId&&(item.serviceId||'yeongnyangi')===serviceId);
  const item=matching.length===1?matching[0]:null;
  let approved=false;
  try{approved=Boolean(item&&skuCounts.get(item.sku)===1&&approvedProduct(item.sku)===item);}catch{}
  return {productId,serviceId,featureKey,registryPriceKRW:amount,tossSupplyPriceKRW:approved?item.supplyPriceKRW:null,tossPriceKRW:approved?item.approvedPriceKRW:null,
    priceDeltaKRW:approved?item.approvedPriceKRW-amount:null,approved,sku:approved?item.sku:null};
});
const releaseSource=fs.readFileSync(path.join(root,'apps/toss/src/release.ts'),'utf8');
const report={
 scope:'꿀꿀운세 첫 심사 · 오늘의 운세, 사주 콘텐츠, 대표 상담',
 inventorySourceCommit:inventory.sourceCommit,
 canonicalCandidates:inventory.canonicalCandidates.length,
 reviewServices:reviewServices.map(({id,title,href})=>({id,title,href})),
 deferredFromReview:deferred.map(item=>item.id),
 locallyPresent:selected.filter(item=>['local-partial','verified-full-flow'].includes(item.status)).map(item=>item.id),
 remainingPorts:remaining.map(item=>item.id),
 fullServicePortHistory:{
   verifiedWholeService:complete.map(item=>item.id),
   partialWholeService:local.map(item=>item.id),
   meaning:'원본 서비스 전체의 이식 이력입니다. 이번에 선정한 하위 흐름의 완료 판정은 공식 기기 증거로 확인합니다.',
 },
 reviewProducts,
 approvedReviewProducts:reviewProducts.filter(item=>item.approved).length,
 approvedConsultationSkus:approvedSkus(APPROVED_TOSS_PRODUCTS).size,
 approvedTarotSkus:approvedSkus(APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS).size,
 approvedNativeSkus:approvedSkus(APPROVED_TOSS_NATIVE_PRODUCTS).size,
 approvedUniqueSkus:skuCounts.size,
 approvedEntriesMissingValidSku:approvedEntries.filter(item=>typeof item.sku!=='string'||!item.sku.length||item.sku.trim()!==item.sku).length,
 duplicateApprovedSkus:[...skuCounts].filter(([,count])=>count>1).map(([sku,count])=>({sku,count})),
 releaseConfiguration:releaseSource.match(/SERVICE_AVAILABLE\s*=\s*(true|false)/)?.[1]||'unknown',
 newPurchasesConfiguration:releaseSource.match(/NEW_PURCHASES_AVAILABLE\s*=\s*(true|false)/)?.[1]||'unknown',
 nextSteps:'docs/toss/2026-11-08-representative-review.md',
 limitation:'로컬 코드 목록입니다. 콘솔 승인, 실기기, CI, 업로드 및 출시 상태를 증명하지 않습니다.',
};
console.log(JSON.stringify(report,null,2));
