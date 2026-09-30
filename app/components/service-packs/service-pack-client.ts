import {authFetch,isMobileAppRuntime} from '@/app/_lib/auth-client';
import {getApiBaseUrl} from '@/app/_lib/api-config';
import {requestPortOneSinglePayment,type PortOneCustomer} from '@/lib/payment/portone';

export const PACK_FISH_IDS=['mackerel','salmon','flounder','tuna'] as const;
export type PackFishId=typeof PACK_FISH_IDS[number];
export type ServicePackPlan={planId:string;label:string;fishId:PackFishId;policyVersion:string;priceKRW:number;totalUses:number;validityDays:number;unitPriceKRW:number;eligibleFeatureKeys:string[];autoRenew:false};
export type OwnedServicePack={entitlementId:string;orderId:string;planId:string;label:string;fishId:PackFishId;totalUses:number;remainingUses:number;eligibleFeatureKeys:string[];expiresAt:string;status:'granted'|'refunded';available:boolean;unavailableReason:string};
export type PackQuote={ok:true;requestId:string;featureKey:string;accessMethod:string|null;status:'available'|'processing'|'used'|'restored'|'unavailable'|'paid';candidates:OwnedServicePack[];existingUse:null|{evidenceId:string;entitlementId:string;remainingUses:number}};
export type PackGiftDraft={senderName:string;recipientName:string;giftMessage:string};
export type PackPurchaseType='SELF'|'GIFT';
export type PackOrder={purchaseType?:PackPurchaseType;giftId?:string;merchantUid:string;paymentAmount:number;productName:string;customer:PortOneCustomer;storeId:string;channelKey:string;status?:string;entitlementGranted?:boolean;packSnapshot:Omit<ServicePackPlan,'autoRenew'>};
export class ServicePackError extends Error{constructor(public code:string,public status=0){super(code);}}
const positive=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>0;
const text=(value:unknown)=>typeof value==='string'&&value.length>0;
const fish=(value:unknown):value is PackFishId=>PACK_FISH_IDS.includes(value as PackFishId);

export function parsePackPlans(payload:{plans?:unknown}):ServicePackPlan[]{
 if(!Array.isArray(payload.plans))throw new ServicePackError('INVALID_CATALOG');
 const ids=new Set<string>();
 return payload.plans.map(plan=>{
  if(!plan||!text(plan.planId)||ids.has(plan.planId)||!text(plan.label)||!fish(plan.fishId)||!text(plan.policyVersion)
   ||!positive(plan.priceKRW)||!positive(plan.totalUses)||!positive(plan.validityDays)||!positive(plan.unitPriceKRW)
   ||plan.autoRenew!==false||!Array.isArray(plan.eligibleFeatureKeys)||!plan.eligibleFeatureKeys.length||!plan.eligibleFeatureKeys.every(text))throw new ServicePackError('INVALID_CATALOG');
  ids.add(plan.planId);return plan as ServicePackPlan;
 });
}
export function parseOwnedPacks(packs:unknown):OwnedServicePack[]{
 if(!Array.isArray(packs))throw new ServicePackError('INVALID_WALLET');
 return packs.map(pack=>{
  if(!pack||!text(pack.entitlementId)||!text(pack.orderId)||!text(pack.planId)||!text(pack.label)||!fish(pack.fishId)
   ||!positive(pack.totalUses)||!Number.isSafeInteger(pack.remainingUses)||pack.remainingUses<0||pack.remainingUses>pack.totalUses
   ||!Number.isFinite(Date.parse(pack.expiresAt))||!['granted','refunded'].includes(pack.status)||typeof pack.available!=='boolean'
   ||!Array.isArray(pack.eligibleFeatureKeys)||!pack.eligibleFeatureKeys.every(text))throw new ServicePackError('INVALID_WALLET');
  return pack as OwnedServicePack;
 });
}
export async function packRequest<T>(path:string,body?:object):Promise<T>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await authFetch(`/api/payments/${path}`,{cache:'no-store',signal:controller.signal,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})},{retryOn401:false});
  const payload=await response.json();
  if(!response.ok||payload.ok===false)throw new ServicePackError(payload.code||'REQUEST_FAILED',response.status);
  return payload as T;
 }catch(error){if(error instanceof ServicePackError)throw error;throw new ServicePackError('REQUEST_UNCERTAIN');}
 finally{clearTimeout(timer);}
}
export async function readPackCatalog(){const data=await packRequest<{plans:unknown;giftEnabled?:boolean}>('service-packs/catalog');return {plans:parsePackPlans(data),giftEnabled:data.giftEnabled===true};}
export async function readPackWallet(cursor?:string){
 const data=await packRequest<{packs:unknown;nextCursor:string|null}>(`service-packs/wallet${cursor?'?before='+encodeURIComponent(cursor):''}`);
 return {packs:parseOwnedPacks(data.packs),nextCursor:typeof data.nextCursor==='string'?data.nextCursor:null};
}
export async function quoteServicePack(requestId:string,featureKey:string){
 const quote=await packRequest<PackQuote>('service-packs/quote',{requestId});
 if(quote.requestId!==requestId||quote.featureKey!==featureKey||!['available','processing','used','restored','unavailable','paid'].includes(quote.status))throw new ServicePackError('INVALID_QUOTE');
 const candidates=parseOwnedPacks(quote.candidates);
 if(candidates.some(pack=>!pack.eligibleFeatureKeys.includes(featureKey)))throw new ServicePackError('INVALID_QUOTE');
 return {...quote,candidates};
}
export async function consumeServicePack(requestId:string,entitlementId:string){
 const result=await packRequest<{ok:true;accessMethod:string;requestId:string;evidenceId:string;remainingUses:number;replayed:boolean}>('service-packs/consume',{requestId,entitlementId});
 if(result.accessMethod!=='SERVICE_PACK'||result.requestId!==requestId||!text(result.evidenceId)||!Number.isSafeInteger(result.remainingUses)||result.remainingUses<0)throw new ServicePackError('INVALID_CONSUMPTION');
 return result;
}
export async function confirmPackOrder(orderId:string){
 const path=`service-packs/orders/${encodeURIComponent(orderId)}`;
 const status=await packRequest<{verified?:boolean;entitlementGranted?:boolean}>(path+'/status');
 if(status.verified&&status.entitlementGranted)return true;
 const confirmed=await packRequest<{entitlementStatus?:string}>(path+'/confirm',{});
 return confirmed.entitlementStatus==='granted';
}
export async function preparePackPurchase(planId:string,idempotencyKey:string,refundConsent:boolean,purchaseType:PackPurchaseType='SELF',gift?:PackGiftDraft):Promise<PackOrder>{
 if(isMobileAppRuntime())throw new ServicePackError('APP_PACK_NOT_AVAILABLE');
 const {order}=await packRequest<{order:PackOrder}>('service-packs/prepare',{planId,idempotencyKey,paymentMethod:'card_general',refundConsent,purchaseType,...(purchaseType==='GIFT'?{gift}:{})});
 if(!order||!text(order.merchantUid)||!positive(order.paymentAmount)||!text(order.productName)||order.packSnapshot?.planId!==planId||order.purchaseType!==purchaseType||(purchaseType==='GIFT'&&!text(order.giftId)))throw new ServicePackError('INVALID_ORDER');
 parsePackPlans({plans:[{...order.packSnapshot,autoRenew:false}]});
 return order;
}
export async function payPackOrder(order:PackOrder){
 if(isMobileAppRuntime())throw new ServicePackError('APP_PACK_NOT_AVAILABLE');
 const giftReturn=`/gift/complete/?orderId=${encodeURIComponent(order.merchantUid)}`;
 if(order.entitlementGranted||order.status?.toUpperCase()==='PAID'){if(order.purchaseType==='GIFT'){window.location.assign(giftReturn);return false;}return confirmPackOrder(order.merchantUid);}
 const response=await requestPortOneSinglePayment({apiBase:getApiBaseUrl(),paymentId:order.merchantUid,orderName:order.productName,totalAmount:order.paymentAmount,
  redirectPath:order.purchaseType==='GIFT'?giftReturn:`/points/?service_pack_return=1&orderId=${encodeURIComponent(order.merchantUid)}#fish-packs`,customer:order.customer,storeId:order.storeId,channelKey:order.channelKey,
  customData:{productType:'service_pack',planId:order.packSnapshot.planId}});
 if(!response.ok)throw new ServicePackError(response.code||'PAYMENT_UNCERTAIN');
 if(response.paymentId!==order.merchantUid)throw new ServicePackError('ORDER_MISMATCH');
 if(order.purchaseType==='GIFT'){window.location.assign(giftReturn);return false;}
 return confirmPackOrder(order.merchantUid);
}

export type PendingPackOrder={planId:string;idempotencyKey:string;orderId?:string;purchaseType?:PackPurchaseType;gift?:PackGiftDraft;packSnapshot?:PackOrder['packSnapshot']};
const storageKey=(userId:string)=>`cd_service_pack_pending_v1:${userId}`;
export function readPendingPack(userId:string):PendingPackOrder|null{
 try{const value=JSON.parse(sessionStorage.getItem(storageKey(userId))||'null');return value&&text(value.planId)&&text(value.idempotencyKey)?value:null;}catch{return null;}
}
export function savePendingPack(userId:string,value:PendingPackOrder|null){
 try{if(value)sessionStorage.setItem(storageKey(userId),JSON.stringify(value));else sessionStorage.removeItem(storageKey(userId));}catch{if(value)throw new ServicePackError('STORAGE_UNAVAILABLE'); /* Clearing display recovery state cannot undo a server-confirmed payment. */}
}

export function samePackSnapshot(left:Partial<ServicePackPlan>|undefined,right:Partial<ServicePackPlan>|undefined){
 const fingerprint=(value:Partial<ServicePackPlan>|undefined)=>{
  const plan=parsePackPlans({plans:[{...value,autoRenew:false}]})[0];
  return JSON.stringify([plan.planId,plan.fishId,plan.policyVersion,plan.label,plan.priceKRW,plan.totalUses,plan.validityDays,plan.unitPriceKRW,plan.eligibleFeatureKeys]);
 };
 try{return fingerprint(left)===fingerprint(right);}catch{return false;}
}

/** Explicit resume only: no new key, order, or inferred cancellation. */
export async function resumePendingPackPurchase(ownerId:string,refundConsent:boolean,isCurrentOwner:()=>boolean){
 const pending=readPendingPack(ownerId);
 if(!refundConsent||!pending?.orderId||!pending.packSnapshot||pending.packSnapshot.planId!==pending.planId
  ||!['SELF','GIFT'].includes(pending.purchaseType||'')||!samePackSnapshot(pending.packSnapshot,pending.packSnapshot))
  throw new ServicePackError('PENDING_ORDER_UNAVAILABLE');
 if(isMobileAppRuntime())throw new ServicePackError('APP_PACK_NOT_AVAILABLE');
 const assertCurrent=()=>{
  if(!isCurrentOwner()||JSON.stringify(readPendingPack(ownerId))!==JSON.stringify(pending))throw new ServicePackError('AUTH_SCOPE_CHANGED');
 };
 assertCurrent();
 try{
  const result=await packRequest<{entitlementStatus?:string}>(
   'service-packs/orders/'+encodeURIComponent(pending.orderId)+'/confirm',{});
  assertCurrent();
  if(result.entitlementStatus!=='granted')return false;
  if(pending.purchaseType==='GIFT'){window.location.assign('/gift/complete/?orderId='+encodeURIComponent(pending.orderId));return false;}
  return true;
 }catch(error){
  assertCurrent();
  if(!(error instanceof ServicePackError)||error.code!=='PG_PAYMENT_NOT_PAID')throw error;
 }
 const catalog=await readPackCatalog();
 assertCurrent();
 const plan=catalog.plans.find(item=>item.planId===pending.planId);
 if(!plan||!samePackSnapshot(plan,pending.packSnapshot)||(pending.purchaseType==='GIFT'&&!catalog.giftEnabled))
  throw new ServicePackError('PENDING_ORDER_UNAVAILABLE');
 const order=await preparePackPurchase(pending.planId,pending.idempotencyKey,true,pending.purchaseType,pending.gift);
 assertCurrent();
 if(order.merchantUid!==pending.orderId||!samePackSnapshot(order.packSnapshot,pending.packSnapshot)
  ||!['PENDING','PAID'].includes(String(order.status||'').toUpperCase()))throw new ServicePackError('ORDER_MISMATCH');
 return payPackOrder(order);
}
