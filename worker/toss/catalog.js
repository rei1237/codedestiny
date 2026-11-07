import {TossError} from './policy.js';
import {consultationService} from './services.js';

// No fabricated SKU. Fill this only from approved console products and record evidence.
// Required record: {productId, sku, approvedPriceKRW, priceEvidence, approved:true}.
export const APPROVED_TOSS_PRODUCTS = Object.freeze([]);
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
  if(!item || !(/^(chat_)?(saju|astrology|ziwei|vedic|sukuyo|tarot)_(mackerel|salmon|flounder|tuna)$/.test(item.productId)||(/^chat_(saju|astrology|ziwei|vedic|sukuyo|tarot)$/.test(item.productId)&&item.serviceId==='yeoni'))
    || /^(chat_)?(astrology|sukuyo|tarot)_tuna$/.test(item.productId)
    || !Number.isSafeInteger(item.approvedPriceKRW) || item.approvedPriceKRW<=0 || !item.priceEvidence) {
    throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  }
  const service=consultationService(item);
  if(item.productId.startsWith('chat_')!==Boolean(service.persona))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return item;
}
