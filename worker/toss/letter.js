import {APPROVED_TOSS_PRODUCTS,approvedProduct} from './catalog.js';
import {resolveStoredProduct} from '../yeongnyangi/payments/catalog.ts';
import {prepareFortune,presentFortune} from '../yeongnyangi/service.ts';
import {TossError,validateOrderId} from './policy.js';
import {chatPaymentRequestId,isChatFeatureKey} from '../yeongnyangi/access-methods.js';
import {TossPurchase} from './models.js';
import {lookupOrder} from './partner.js';
import {recordTossRefund} from './purchases.js';
import {requestMatchesService,tossFortuneAccessIssue} from './services.js';
import {readRequest} from '../yeongnyangi/repository.js';
import {readAndContinueFortune} from '../yeongnyangi/delivery.js';
import {checkOrder} from './policy.js';

const DOMAINS=new Set(['saju','ziwei','sukuyo','vedic','astrology','tarot']);
function assertLetterDeliverable(row){const issue=tossFortuneAccessIssue(row);if(issue)throw new TossError(issue,409);}
// The original letter room uses its own base product, not a different question tier.
// This returns no sale unless the exact Toss SKU and original registry price are approved.
export function approvedLetterSale(domain,approved=APPROVED_TOSS_PRODUCTS){
 if(!DOMAINS.has(domain))throw new TossError('PRODUCT_NOT_FOUND',404);
 const productId='chat_'+domain,product=resolveStoredProduct(productId);
 const candidates=approved.filter(row=>row.serviceId==='yeoni'&&row.productId===productId);
 if(candidates.length!==1)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 const sale=approvedProduct(candidates[0].sku,approved);
 if(sale.productId!==productId||sale.approvedPriceKRW!==product.priceKRW)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 return sale;
}
export async function prepareTossLetter(env,auth,body,approved=APPROVED_TOSS_PRODUCTS){
 if(!body||typeof body!=='object'||Array.isArray(body)||body.persona!=='yeoni'||body.questionDecision!==undefined||body.fishId!==undefined)throw new TossError('INVALID_REQUEST',400);
 const sale=approvedLetterSale(body.domain,approved);
 const row=await prepareFortune(env,auth.userId,body,{persona:'yeoni'});
 if(!/^[a-f0-9]{64}$/.test(String(row?._id||''))||row.productId!==sale.productId||row.amountKRW!==sale.approvedPriceKRW||row.persona!=='yeoni')throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 assertLetterDeliverable(row);
 if(!['CREATED','AWAITING_DRAW'].includes(row.state)||row.accessMethod||row.paymentId||row.paymentClaimOrderId)return readTossLetter(env,auth,String(row._id),{requirePaid:true,approved});
 return {ok:true,consultation:{...presentFortune(row),persona:'yeoni',paidFeatureKey:row.featureKey,paymentRequestId:chatPaymentRequestId(String(row._id)),tossSku:sale.sku,perUseSource:row.perUseSource||''}};
}

// A restored but unassigned order is never bound to a guessed draft. The buyer
// chooses its input, and the ordinary grant transaction performs the binding.
async function verifiedLetterOrder(env,auth,orderId){
 validateOrderId(orderId);
 const purchase=await TossPurchase.findOne({_id:orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,serviceId:'yeoni'}).lean();
 if(!purchase)throw new TossError('RESULT_NOT_FOUND',404);
 if(String(purchase._id)!==orderId||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment||purchase.serviceId!=='yeoni')throw new TossError('ORDER_OWNERSHIP_MISMATCH',403);
 if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
 if(purchase.nativeService||!/^chat_(saju|ziwei|sukuyo|vedic|astrology|tarot)$/.test(purchase.productId))throw new TossError('ORDER_PRODUCT_MISMATCH',409);
 const order=await lookupOrder(env,auth.userKey,orderId);
 if(order.orderId!==orderId||order.sku!==purchase.sku)throw new TossError('ORDER_MISMATCH',403);
 if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
 checkOrder(order,{orderId,sku:purchase.sku});
 return purchase;
}
async function verifiedUnassignedLetter(env,auth,orderId){
 const purchase=await verifiedLetterOrder(env,auth,orderId);
 if(purchase.requestId)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
 const product=resolveStoredProduct(purchase.productId);
 if(product.priceKRW!==purchase.approvedPriceKRW)throw new TossError('PRODUCT_PRICE_CHANGED',409);
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
 const product=resolveStoredProduct(purchase.productId);
 if(product.priceKRW!==purchase.approvedPriceKRW)throw new TossError('PRODUCT_PRICE_CHANGED',409);
 return {ok:true,order:{orderId,status:'UNASSIGNED',sku:purchase.sku,productId:purchase.productId,domain:purchase.productId.slice(5)}};
}
export async function readRecoveringTossLetter(env,auth,orderId,id){
 const purchase=await verifiedUnassignedLetter(env,auth,orderId);
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw new TossError('RESULT_NOT_FOUND',404);
 const row=await readRequest(env,auth.userId,id);
 if(!row||row.persona!=='yeoni'||row.snapshot?.persona!=='yeoni'||!isChatFeatureKey(row.featureKey)||row.productId!==purchase.productId||row.amountKRW!==purchase.approvedPriceKRW||row.state!=='CREATED'||row.accessMethod||row.paymentId||row.paymentClaimOrderId)throw new TossError('REQUEST_NOT_FOUND',404);
 assertLetterDeliverable(row);
 return {ok:true,consultation:{...presentFortune(row),persona:'yeoni',paidFeatureKey:row.featureKey,paymentRequestId:chatPaymentRequestId(id),tossSku:purchase.sku,perUseSource:''}};
}
export async function prepareRecoveredTossLetter(env,auth,orderId,body){
 if(!body||typeof body!=='object'||Array.isArray(body)||body.persona!=='yeoni'||body.questionDecision!==undefined||body.fishId!==undefined||!DOMAINS.has(body.domain))throw new TossError('INVALID_REQUEST',400);
 const purchase=await verifiedUnassignedLetter(env,auth,orderId);
 if(purchase.productId!=='chat_'+body.domain)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
 const row=await prepareFortune(env,auth.userId,body,{persona:'yeoni'});
 if(!/^[a-f0-9]{64}$/.test(String(row?._id||''))||row.persona!=='yeoni'||row.productId!==purchase.productId||row.amountKRW!==purchase.approvedPriceKRW)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
 if(row.state!=='CREATED'||row.accessMethod||row.paymentId||row.paymentClaimOrderId)throw new TossError('REQUEST_ALREADY_FUNDED',409);
 assertLetterDeliverable(row);
 return {ok:true,consultation:{...presentFortune(row),persona:'yeoni',paidFeatureKey:row.featureKey,paymentRequestId:chatPaymentRequestId(String(row._id)),tossSku:purchase.sku,perUseSource:''}};
}

// Never ask the web payment endpoint to activate a Toss consultation. The only
// authority for an existing result is the owner's matching live partner order.
export async function readTossLetter(env,auth,id,{requirePaid=false,approved=APPROVED_TOSS_PRODUCTS}={}){
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw new TossError('RESULT_NOT_FOUND',404);
 const row=await readRequest(env,auth.userId,id);
 if(!row||row.persona!=='yeoni'||row.snapshot?.persona!=='yeoni'||!isChatFeatureKey(row.featureKey)||!/^chat_(saju|ziwei|sukuyo|vedic|astrology|tarot)$/.test(row.productId))throw new TossError('RESULT_NOT_FOUND',404);
 assertLetterDeliverable(row);
 const purchase=await TossPurchase.findOne({identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,requestId:id,serviceId:'yeoni'}).lean();
 if(!purchase){
  if(requirePaid||!['CREATED','AWAITING_DRAW'].includes(row.state)||row.accessMethod||row.paymentId||row.paymentClaimOrderId)throw new TossError('RESULT_NOT_FOUND',404);
  const sale=approvedLetterSale(row.productId.slice(5),approved);
  if(row.amountKRW!==sale.approvedPriceKRW)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return {ok:true,consultation:{...presentFortune(row),persona:'yeoni',paidFeatureKey:row.featureKey,paymentRequestId:chatPaymentRequestId(id),tossSku:sale.sku,perUseSource:''}};
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
 return {ok:true,consultation:{...presentFortune(current),persona:'yeoni',paidFeatureKey:current.featureKey,paymentRequestId:chatPaymentRequestId(id),perUseSource:current.perUseSource||''}};
}
