import {TossError} from './policy.js';
import {isChatFeatureKey} from '../../lib/fortune/chat-products.js';

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
