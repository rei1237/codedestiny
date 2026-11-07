import {TossError} from './policy.js';
import {isChatFeatureKey} from '../../lib/fortune/chat-products.js';
import {deliveryRefundPending} from '../yeongnyangi/terminal-refund-policy.js';

// Service ownership is server selected, never an arbitrary persona from the client.
export const TOSS_CONSULTATION_SERVICES=Object.freeze({
  yeongnyangi:Object.freeze({name:'영냥이',persona:undefined}),
  yeoni:Object.freeze({name:'연이',persona:'yeoni'}),
  neo:Object.freeze({name:'네오',persona:'neo'}),
});
export function consultationService(product) {
  const id=product.serviceId||'yeongnyangi';
  if(!Object.hasOwn(TOSS_CONSULTATION_SERVICES,id))throw new TossError('TOSS_SERVICE_INVALID');
  return {id,...TOSS_CONSULTATION_SERVICES[id]};
}
export function consultationSelection(product) {
  const service=consultationService(product);
  return service.id==='yeongnyangi'?product.productId:`${service.id}:${product.productId}`;
}
export function requestMatchesService(row,product) {
  const service=consultationService(product);
  if(!row||row.productId!==product.productId)return false;
  if(service.persona)return row.persona===service.persona&&row.snapshot?.persona===service.persona&&isChatFeatureKey(row.featureKey);
  return !row.persona&&!row.snapshot?.persona&&!isChatFeatureKey(row.featureKey);
}
// A matching product/persona alone is not evidence that this order funded the request.
export function requestMatchesPurchase(row,purchase) {
  return Boolean(purchase?._id&&purchase.requestId&&row?._id&&row.paymentClaimOrderId)
    &&requestMatchesService(row,purchase)&&row.accessMethod==='TOSS_IAP'
    &&String(row.paymentClaimOrderId||'')===String(purchase._id||'')
    &&String(row._id||'')===String(purchase.requestId||'')
    &&Number.isInteger(purchase.approvedPriceKRW)&&row.amountKRW===purchase.approvedPriceKRW;
}
// The paid access method is historical and may outlive its delivery rights.
export function tossFortuneAccessIssue(row) {
  if(row?.state==='REFUNDED')return 'ORDER_REFUNDED';
  if(deliveryRefundPending(row)||row?.recovery?.refundPending||row?.errorCode==='PAYMENT_NOT_ACTIVE'||row?.errorCode==='DELIVERY_REFUND_PENDING')return 'PAYMENT_REVIEW_REQUIRED';
  return '';
}
