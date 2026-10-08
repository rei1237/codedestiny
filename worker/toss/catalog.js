import {TossError} from './policy.js';
import {consultationService} from './services.js';

// No fabricated SKU. Fill this only from approved console products and record evidence.
// Required record: {productId, sku, approvedPriceKRW, priceEvidence, approved:true}.
export const APPROVED_TOSS_PRODUCTS = Object.freeze([]);
export const APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS = Object.freeze([]);
export function approvedProduct(sku, products=APPROVED_TOSS_PRODUCTS) {
  const item=products.find(p=>p.sku===sku&&p.approved===true);
  if(!item || !/^(chat_)?(saju|astrology|ziwei|vedic|sukuyo|tarot)_(mackerel|salmon|flounder|tuna)$/.test(item.productId)
    || /^(chat_)?(astrology|sukuyo|tarot)_tuna$/.test(item.productId)
    || !Number.isSafeInteger(item.approvedPriceKRW) || item.approvedPriceKRW<=0 || !item.priceEvidence) {
    throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  }
  const service=consultationService(item);
  if(item.productId.startsWith('chat_')!==Boolean(service.persona))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return item;
}
