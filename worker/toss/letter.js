import {CHAT_DOMAINS,CHAT_PRODUCT_IDS,chatProductId,chatQuestionFeatureKey,CHAT_FEATURE_KEY} from '../../lib/fortune/chat-products.js';
import {APPROVED_TOSS_PRODUCTS,approvedProduct} from './catalog.js';
import {resolveStoredProduct} from '../yeongnyangi/payments/catalog.ts';
import {prepareFortune,presentFortune} from '../yeongnyangi/service.ts';
import {TossError,validateOrderId} from './policy.js';
import {chatPaymentRequestId} from '../yeongnyangi/access-methods.js';
import {TossPurchase} from './models.js';
import {lookupOrder} from './partner.js';
import {recordTossRefund} from './purchases.js';
import {requestMatchesService,tossFortuneAccessIssue} from './services.js';
import {readRequest} from '../yeongnyangi/repository.js';
import {readAndContinueFortune} from '../yeongnyangi/delivery.js';
import {checkOrder} from './policy.js';
const letterPersonas=['yeoni','neo'];

const DOMAINS=new Set(CHAT_DOMAINS);
function requestedProductId(body){
 if(!DOMAINS.has(body.domain))throw new TossError('PRODUCT_NOT_FOUND',404);
 if((body.questionDecision!==undefined)!==(body.fishId!==undefined)||body.mode||!chatProductId(body.domain,body.fishId))throw new TossError('INVALID_REQUEST',400);
 return chatProductId(body.domain,body.fishId);
}
function featureMatchesProduct(row){const fish=row?.productId?.split('_')[2];return row?.featureKey===(fish?chatQuestionFeatureKey(fish):CHAT_FEATURE_KEY);}
function canPrepareRestoredLetter(row){
 return row.state==='CREATED'||(row.state==='AWAITING_DRAW'&&row.productId.split('_')[1]==='tarot');
}
function assertLetterDeliverable(row){const issue=tossFortuneAccessIssue(row);if(issue)throw new TossError(issue,409);}
// A base letter and a scoped question letter have separate approved SKU identities.
// This returns no sale unless the exact Toss SKU and adviser mapping are approved.
export function approvedLetterSale(domain,approved=APPROVED_TOSS_PRODUCTS,persona='yeoni',fish=undefined){
 if(!DOMAINS.has(domain))throw new TossError('PRODUCT_NOT_FOUND',404);
 const productId=chatProductId(domain,fish);if(!productId)throw new TossError('PRODUCT_NOT_FOUND',404);
 resolveStoredProduct(productId);
 const candidates=approved.filter(row=>row.serviceId===persona&&row.productId===productId);
 if(candidates.length!==1)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 const sale=approvedProduct(candidates[0].sku,approved);
 if(sale.productId!==productId||sale.serviceId!==persona)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 return sale;
}
export async function prepareTossLetter(env,auth,body,approved=APPROVED_TOSS_PRODUCTS){
 if(!body||typeof body!=='object'||Array.isArray(body)||!letterPersonas.includes(body.persona))throw new TossError('INVALID_REQUEST',400);
 requestedProductId(body);
 const sale=approvedLetterSale(body.domain,approved,body.persona,body.fishId);
 const row=await prepareFortune(env,auth.userId,body,{persona:body.persona,checkoutAmountKRW:sale.approvedPriceKRW});
 if(!/^[a-f0-9]{64}$/.test(String(row?._id||''))||row.productId!==sale.productId||row.amountKRW!==sale.approvedPriceKRW||row.persona!==body.persona||!featureMatchesProduct(row))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 assertLetterDeliverable(row);
 if(!['CREATED','AWAITING_DRAW'].includes(row.state)||row.accessMethod||row.paymentId||row.paymentClaimOrderId)return readTossLetter(env,auth,String(row._id),{requirePaid:true,approved});
 return {ok:true,consultation:{...presentFortune(row),persona:row.persona,paidFeatureKey:row.featureKey,paymentRequestId:chatPaymentRequestId(String(row._id)),tossSku:sale.sku,perUseSource:row.perUseSource||''}};
}

// A restored but unassigned order is never bound to a guessed draft. The buyer
// chooses its input, and the ordinary grant transaction performs the binding.
async function verifiedLetterOrder(env,auth,orderId){
 validateOrderId(orderId);
 const purchase=await TossPurchase.findOne({_id:orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,serviceId:{$in:letterPersonas}}).lean();
 if(!purchase)throw new TossError('RESULT_NOT_FOUND',404);
 if(String(purchase._id)!==orderId||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment||!letterPersonas.includes(purchase.serviceId))throw new TossError('ORDER_OWNERSHIP_MISMATCH',403);
 if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
 if(purchase.nativeService||!CHAT_PRODUCT_IDS.includes(purchase.productId))throw new TossError('ORDER_PRODUCT_MISMATCH',409);
 const order=await lookupOrder(env,auth.userKey,orderId);
 if(order.orderId!==orderId||order.sku!==purchase.sku)throw new TossError('ORDER_MISMATCH',403);
 if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
 checkOrder(order,{orderId,sku:purchase.sku});
 return purchase;
}
async function verifiedUnassignedLetter(env,auth,orderId){
 const purchase=await verifiedLetterOrder(env,auth,orderId);
 if(purchase.requestId)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
 resolveStoredProduct(purchase.productId);
 if(!Number.isSafeInteger(purchase.approvedPriceKRW)||purchase.approvedPriceKRW<=0||typeof purchase.priceEvidence!=='string'||!purchase.priceEvidence)throw new TossError('PRODUCT_PRICE_CHANGED',409);
 return purchase;
}
export async function recoverableLetterOrder(env,auth,orderId){
 const purchase=await verifiedLetterOrder(env,auth,orderId);
 if(purchase.requestId){
  const row=await readRequest(env,auth.userId,purchase.requestId);
  if(!requestMatchesService(row,purchase)||row.accessMethod!=='TOSS_IAP'||row.paymentClaimOrderId!==orderId||row.amountKRW!==purchase.approvedPriceKRW)throw new TossError('RESULT_NOT_FOUND',404);
  assertLetterDeliverable(row);
  return {ok:true,order:{orderId,status:'ASSIGNED',requestId:purchase.requestId}};
 }
 resolveStoredProduct(purchase.productId);
 if(!Number.isSafeInteger(purchase.approvedPriceKRW)||purchase.approvedPriceKRW<=0||typeof purchase.priceEvidence!=='string'||!purchase.priceEvidence)throw new TossError('PRODUCT_PRICE_CHANGED',409);
 return {ok:true,order:{orderId,status:'UNASSIGNED',sku:purchase.sku,productId:purchase.productId,domain:purchase.productId.split('_')[1],persona:purchase.serviceId}};
}
export async function readRecoveringTossLetter(env,auth,orderId,id){
 const purchase=await verifiedUnassignedLetter(env,auth,orderId);
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw new TossError('RESULT_NOT_FOUND',404);
 const row=await readRequest(env,auth.userId,id);
 if(!row||row.persona!==purchase.serviceId||row.snapshot?.persona!==row.persona||!featureMatchesProduct(row)||row.productId!==purchase.productId||row.amountKRW!==purchase.approvedPriceKRW||!canPrepareRestoredLetter(row)||row.accessMethod||row.paymentId||row.paymentClaimOrderId)throw new TossError('REQUEST_NOT_FOUND',404);
 assertLetterDeliverable(row);
 return {ok:true,consultation:{...presentFortune(row),persona:row.persona,paidFeatureKey:row.featureKey,paymentRequestId:chatPaymentRequestId(id),tossSku:purchase.sku,perUseSource:''}};
}
export async function prepareRecoveredTossLetter(env,auth,orderId,body){
 if(!body||typeof body!=='object'||Array.isArray(body)||!letterPersonas.includes(body.persona)||!DOMAINS.has(body.domain))throw new TossError('INVALID_REQUEST',400);
 const purchase=await verifiedUnassignedLetter(env,auth,orderId);
 if(purchase.serviceId!==body.persona)throw new TossError('ORDER_OWNERSHIP_MISMATCH',403);
 if(purchase.productId!==requestedProductId(body))throw new TossError('ORDER_PRODUCT_MISMATCH',409);
 const row=await prepareFortune(env,auth.userId,body,{persona:body.persona,checkoutAmountKRW:purchase.approvedPriceKRW});
 if(!/^[a-f0-9]{64}$/.test(String(row?._id||''))||row.persona!==purchase.serviceId||row.productId!==purchase.productId||row.amountKRW!==purchase.approvedPriceKRW)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
 if(!canPrepareRestoredLetter(row)||row.accessMethod||row.paymentId||row.paymentClaimOrderId)throw new TossError('REQUEST_ALREADY_FUNDED',409);
 assertLetterDeliverable(row);
 return {ok:true,consultation:{...presentFortune(row),persona:row.persona,paidFeatureKey:row.featureKey,paymentRequestId:chatPaymentRequestId(String(row._id)),tossSku:purchase.sku,perUseSource:''}};
}

// Never ask the web payment endpoint to activate a Toss consultation. The only
// authority for an existing result is the owner's matching live partner order.
export async function readTossLetter(env,auth,id,{requirePaid=false,approved=APPROVED_TOSS_PRODUCTS}={}){
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw new TossError('RESULT_NOT_FOUND',404);
 const row=await readRequest(env,auth.userId,id);
 if(!row||!letterPersonas.includes(row.persona)||row.snapshot?.persona!==row.persona||!featureMatchesProduct(row)||!CHAT_PRODUCT_IDS.includes(row.productId))throw new TossError('RESULT_NOT_FOUND',404);
 assertLetterDeliverable(row);
 const purchase=await TossPurchase.findOne({identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,requestId:id,serviceId:row.persona}).lean();
 if(!purchase){
  if(requirePaid||!['CREATED','AWAITING_DRAW'].includes(row.state)||row.accessMethod||row.paymentId||row.paymentClaimOrderId)throw new TossError('RESULT_NOT_FOUND',404);
  const sale=approvedLetterSale(row.productId.split('_')[1],approved,row.persona,row.productId.split('_')[2]);
  if(row.amountKRW!==sale.approvedPriceKRW)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return {ok:true,consultation:{...presentFortune(row),persona:row.persona,paidFeatureKey:row.featureKey,paymentRequestId:chatPaymentRequestId(id),tossSku:sale.sku,perUseSource:''}};
 }
 if(purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment)throw new TossError('ORDER_OWNERSHIP_MISMATCH',403);
 if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
 if(purchase.nativeService)throw new TossError('RESULT_NOT_FOUND',404);
 if(!requestMatchesService(row,purchase)||row.accessMethod!=='TOSS_IAP'||row.paymentClaimOrderId!==purchase._id||row.amountKRW!==purchase.approvedPriceKRW)throw new TossError('RESULT_NOT_FOUND',404);
 const order=await lookupOrder(env,auth.userKey,purchase._id);
 if(order.orderId!==purchase._id||order.sku!==purchase.sku)throw new TossError('ORDER_MISMATCH',403);
 if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
 checkOrder(order,{orderId:purchase._id,sku:purchase.sku});
 const current=await readAndContinueFortune(env,auth.userId,id);
 assertLetterDeliverable(current);
 if(!requestMatchesService(current,purchase)||current.accessMethod!=='TOSS_IAP'||current.paymentClaimOrderId!==purchase._id||current.amountKRW!==purchase.approvedPriceKRW)throw new TossError('RESULT_NOT_FOUND',404);
 const verified=await verifiedLetterOrder(env,auth,purchase._id);
 if(verified.requestId!==purchase.requestId||verified.productId!==purchase.productId||verified.approvedPriceKRW!==purchase.approvedPriceKRW||verified.sku!==purchase.sku)throw new TossError('RESULT_NOT_FOUND',404);
 return {ok:true,consultation:{...presentFortune(current),persona:current.persona,paidFeatureKey:current.featureKey,paymentRequestId:chatPaymentRequestId(id),perUseSource:current.perUseSource||''}};
}
