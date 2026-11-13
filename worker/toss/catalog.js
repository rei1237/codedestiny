import {TossError} from './policy.js';
import {consultationService} from './services.js';

// No fabricated SKU. Fill this only from console products and record evidence.
// The client sale gate remains separate, so registered products can stay hidden
// while code and device verification finish.
export const APPROVED_TOSS_PRODUCTS = Object.freeze([
  Object.freeze({productId:'chat_saju',serviceId:'yeoni',sku:'ait.0000019957.fd8ddb69.45f047076c.4555473325',supplyPriceKRW:4500,approvedPriceKRW:4950,priceEvidence:'https://apps-in-toss.toss.im/workspace/21957/mini-app/ai-saju-studio/in-app-purchase/list?tab=products&inAppProductId=ait.0000019957.fd8ddb69.45f047076c.4555473325',approved:true}),
  Object.freeze({productId:'saju_mackerel',serviceId:'yeongnyangi',sku:'ait.0000019957.ef882195.47d318f6ac.4555567979',supplyPriceKRW:9000,approvedPriceKRW:9900,priceEvidence:'https://apps-in-toss.toss.im/workspace/21957/mini-app/ai-saju-studio/in-app-purchase/list?tab=products&inAppProductId=ait.0000019957.ef882195.47d318f6ac.4555567979',approved:true}),
  Object.freeze({productId:'saju_salmon',serviceId:'yeongnyangi',sku:'ait.0000019957.9e9a8bb0.487e974dcb.4555574032',supplyPriceKRW:13500,approvedPriceKRW:14850,priceEvidence:'https://apps-in-toss.toss.im/workspace/21957/mini-app/ai-saju-studio/in-app-purchase/list?tab=products&inAppProductId=ait.0000019957.9e9a8bb0.487e974dcb.4555574032',approved:true}),
  Object.freeze({productId:'saju_flounder',serviceId:'yeongnyangi',sku:'ait.0000019957.abc17820.f2d10d8abc.4555580625',supplyPriceKRW:18000,approvedPriceKRW:19800,priceEvidence:'https://apps-in-toss.toss.im/workspace/21957/mini-app/ai-saju-studio/in-app-purchase/list?tab=products&inAppProductId=ait.0000019957.abc17820.f2d10d8abc.4555580625',approved:true}),
  Object.freeze({productId:'saju_tuna',serviceId:'yeongnyangi',sku:'ait.0000019957.dbefe89f.1ddf9cc158.4555586416',supplyPriceKRW:27000,approvedPriceKRW:29700,priceEvidence:'https://apps-in-toss.toss.im/workspace/21957/mini-app/ai-saju-studio/in-app-purchase/list?tab=products&inAppProductId=ait.0000019957.dbefe89f.1ddf9cc158.4555586416',approved:true}),
]);
export const APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS = Object.freeze([]);
export const APPROVED_TOSS_NATIVE_PRODUCTS = Object.freeze([]);
// New sales must have one unambiguous owner across every registry. Stored
// purchases are restored from their original receipt, independently of sales.
export function assertUniqueApprovedSaleSkus(registries=[APPROVED_TOSS_PRODUCTS,APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS,APPROVED_TOSS_NATIVE_PRODUCTS]) {
  const seen=new Set();
  for(const products of registries)for(const product of products) {
    if(product?.approved!==true)continue;
    const sku=product.sku;
    if(typeof sku!=='string'||!sku||sku.trim()!==sku||seen.has(sku))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
    seen.add(sku);
  }
}
export function approvedProduct(sku, products=APPROVED_TOSS_PRODUCTS) {
  const matches=products.filter(p=>p.sku===sku&&p.approved===true);
  const item=matches.length===1&&typeof sku==='string'&&sku.length>0&&sku.trim()===sku?matches[0]:null;
  if(!item || !(/^(chat_)?(saju|astrology|ziwei|vedic|sukuyo|tarot)_(mackerel|salmon|flounder|tuna)$/.test(item.productId)||(/^chat_(saju|astrology|ziwei|vedic|sukuyo|tarot)$/.test(item.productId)&&['yeoni','neo'].includes(item.serviceId)))
    || /^(chat_)?(astrology|sukuyo|tarot)_tuna$/.test(item.productId)
    || !Number.isSafeInteger(item.supplyPriceKRW) || item.supplyPriceKRW<400 || item.supplyPriceKRW>1400000 || item.supplyPriceKRW%10!==0
    || !Number.isSafeInteger(item.approvedPriceKRW) || item.approvedPriceKRW!==item.supplyPriceKRW*11/10 || !item.priceEvidence) {
    throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  }
  const service=consultationService(item);
  if(item.productId.startsWith('chat_')!==Boolean(service.persona))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return item;
}
