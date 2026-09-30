import { FEATURE_KEY_PRICE_TABLE, YEONGNYANGI_PAID_FEATURE_KEYS } from '../lib/paid-feature-registry.js';
import { paymentError } from './errors.js';

// Sales stay disabled until reviewed prices, uses and validity are entered here.
// This table is the only source of pack price/quantity; request bodies carry an id only.
export const SERVICE_PACK_PLANS = Object.freeze({});
const FISH = Object.freeze(['mackerel','salmon','flounder','tuna']);

export function servicePackFeatures(fishId) {
  if(!FISH.includes(fishId))return [];
  return YEONGNYANGI_PAID_FEATURE_KEYS.filter(key=>key.endsWith('-'+fishId));
}

export function resolveServicePackProduct(planId,plans=SERVICE_PACK_PLANS) {
  const plan=plans[String(planId||'')];
  if(!plan||!Number.isSafeInteger(plan.priceKRW)||plan.priceKRW<=0
    ||!Number.isSafeInteger(plan.totalUses)||plan.totalUses<=0
    ||!Number.isSafeInteger(plan.validityDays)||plan.validityDays<=0||!plan.policyVersion)
    throw paymentError('PRODUCT_NOT_FOUND','영냥이 이용권 판매 정보를 준비하고 있어요.');
  if(!String(plan.name||'').trim())throw paymentError('PRODUCT_NOT_FOUND','이용권 이름을 확인하지 못했어요.');
  const eligibleFeatureKeys=servicePackFeatures(plan.fishId);
  const prices=eligibleFeatureKeys.map(key=>Number(FEATURE_KEY_PRICE_TABLE[key].amountKRW));
  if(eligibleFeatureKeys.length!==6||!prices.every(value=>value===prices[0]))
    throw paymentError('PRODUCT_NOT_FOUND','이용 가능한 상담 상품을 확인하지 못했어요.');
  const packSnapshot=Object.freeze({planId:String(planId),fishId:plan.fishId,policyVersion:plan.policyVersion,
    label:plan.name,priceKRW:plan.priceKRW,totalUses:plan.totalUses,validityDays:plan.validityDays,
    unitPriceKRW:prices[0],eligibleFeatureKeys:Object.freeze(eligibleFeatureKeys)});
  return Object.freeze({productId:String(planId),featureKey:String(planId),label:plan.name,
    billingType:'per_use',fulfillmentType:'service_pack',paymentScope:'direct_only',
    priceKRW:plan.priceKRW,priceCoins:plan.priceKRW/100,monthlyCost:0,
    directOnly:true,passExcluded:true,monthlyExcluded:true,allowedPaymentMethods:Object.freeze(['DIRECT_KRW']),
    packSnapshot});
}

export function servicePackCoverage(right,featureKey,amountKRW,now=new Date()) {
  const snapshot=right?.packSnapshot;
  if(right?.type!=='service_pack'||right.status!=='granted'||!snapshot
    ||!snapshot.eligibleFeatureKeys?.includes(featureKey)||snapshot.unitPriceKRW!==Number(amountKRW))
    return {covered:false,reason:'SERVICE_PACK_NOT_COVERED'};
  if(!right.expiresAt||!Number.isFinite(new Date(right.expiresAt).getTime())||new Date(right.expiresAt).getTime()<=now.getTime())
    return {covered:false,reason:'SERVICE_PACK_EXPIRED'};
  const remainingUses=Number(right.remainingUses);
  if(!Number.isSafeInteger(remainingUses)||remainingUses<=0)return {covered:false,reason:'SERVICE_PACK_EXHAUSTED'};
  return {covered:true,remainingUses,consumeUses:1,fishId:snapshot.fishId,expiresAt:right.expiresAt};
}

export function listServicePackPlans() {
  return Object.keys(SERVICE_PACK_PLANS).map(id=>({...resolveServicePackProduct(id).packSnapshot,autoRenew:false}));
}
export function isServicePackOrder(order) {
  return order?.pricingSnapshot?.fulfillmentType==='service_pack';
}
