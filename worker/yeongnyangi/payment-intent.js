import { getEnv } from '../lib/env.js';
import { Payment } from '../lib/models.js';
import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
import { resolveChargeAmountKRW } from '../lib/portone.js';
import { toObjectId } from '../payments/db.js';
import { paymentError } from '../payments/errors.js';
import { fetchPortOnePayment } from '../lib/portone.js';
import { deriveOrderId, generationKey } from '../payments/orders.js';

// The PG lookup stays outside the database admission slot. Only an authoritative
// terminal response permits a new payment attempt for the same consultation.
export async function reconcileFortuneCheckout({env,userId,requestId,product,withDb,confirmPaid,fetchPayment=fetchPortOnePayment}) {
  if(!String(product.featureKey || '').startsWith('yeongnyangi-'))return;
  const fortune=await withDb(db=>assertFortunePaymentIntent(db,{env,userId,requestId,product}));
  const orderId=await deriveOrderId(userId,generationKey(requestId,Number(fortune.paymentGeneration || 0)));
  const order=await withDb(db=>db.findOne(Payment,{merchantUid:orderId,userId:toObjectId(userId)}));
  if(!order)return;
  let pg;
  try { pg=await fetchPayment(env,orderId); }
  catch(error) {
    // No PG request exists yet (e.g. SDK failed before opening). Reuse this ID;
    // never rotate on a timeout, authentication error or unknown lookup failure.
    if(error.status===404 && error.code==='PAYMENT_NOT_FOUND' && order.status==='pending')return;
    throw paymentError('PG_UNAVAILABLE','결제 상태를 확인하고 있어요. 다시 결제하지 말고 잠시 후 상태를 확인해 주세요.');
  }
  if(pg?.paymentId!==orderId)throw paymentError('PAYMENT_ID_MISMATCH','결제 정보가 주문과 일치하지 않습니다.');
  if(pg.status==='paid') {
    await confirmPaid(orderId,pg);
    throw paymentError('FORTUNE_ALREADY_PAID','이미 결제한 상담이에요. 결과 화면에서 이어가 주세요.',{fortuneRequestId:fortune._id});
  }
  if(!['failed','cancelled'].includes(pg.status))
    throw paymentError('PG_PAYMENT_NOT_PAID','이전 결제 결과를 확인하고 있어요. 다시 결제하지 말고 잠시 후 결제 상태를 확인해 주세요.');
  // Only this authoritative PG terminal response releases the direct reservation.
  // A stale window, not-found response or transport error keeps its original claim.
  const terminal=await withDb(db=>db.findOneAndUpdate(Payment,
    {merchantUid:orderId,userId:toObjectId(userId),status:{$in:['pending','failed','cancelled']}},
    {$set:{status:'failed',orderState:'FAILED',failureCode:pg.status==='cancelled'?'PG_PAYMENT_CANCELLED':'PG_PAYMENT_FAILED',
      failureStage:'pg-retry-check',updatedAt:new Date()}},{returnDocument:'after'}));
  if(!terminal)throw paymentError('PG_PAYMENT_NOT_PAID','결제 상태가 변경되었어요. 같은 상담에서 상태를 다시 확인해 주세요.');
  await withDb(db=>advanceFortunePaymentGeneration(db,userId,requestId,Number(fortune.paymentGeneration||0),orderId));
}

// A single consultation owns a single fulfillment claim even if two PG attempts
// are approved. Keep both accounting records; flag the extra approval for review.
export async function claimFortunePayment(db,order) {
  const id=String(order.requestId || '').slice(3),orderId=String(order.merchantUid);
  const claimed=await db.findOneAndUpdate(YeongnyangiRequest,{
    _id:id,userId:toObjectId(order.userId),featureKey:order.featureKey,
    $and:[
      {$or:[{paymentClaimOrderId:orderId},{paymentClaimOrderId:''},{paymentClaimOrderId:{$exists:false}}]},
      {$or:[{paymentId:null},{paymentId:{$exists:false}},{paymentId:order._id}]},
      {$or:[{accessMethod:null},{accessMethod:''},{accessMethod:'DIRECT_KRW'},{accessMethod:{$exists:false}}]},
    ],
  },{$set:{paymentClaimOrderId:orderId}},{returnDocument:'after'});
  if(claimed)return true;
  const current=await db.findOne(YeongnyangiRequest,{_id:id,userId:toObjectId(order.userId)});
  if(!current)throw paymentError('INVALID_REQUEST','상담 주문을 확인하지 못했어요.');
  await db.updateOne(Payment,{merchantUid:orderId,status:{$in:['paid','success','fulfilled']}},{$set:{
    'metadata.duplicatePaymentReviewRequired':true,
    'metadata.duplicateOf':current.paymentClaimOrderId || String(current.paymentId || current.passEvidenceId || current.moonstoneLedgerId || ''),
  }});
  return false;
}

export async function assertFortunePaymentIntent(db, {env, userId, requestId, product}) {
  if (!/^yn-[a-f0-9]{64}$/.test(String(requestId || ''))) {
    throw paymentError('INVALID_REQUEST','영냥이 방에서 상담 내용을 먼저 선택해 주세요.');
  }
  const id=requestId.slice(3);
  const fortune=await db.findOne(YeongnyangiRequest,{_id:id,userId:toObjectId(userId)});
  if (!fortune || fortune.featureKey!==product.featureKey || resolveChargeAmountKRW(env,fortune.amountKRW)!==product.priceKRW) {
    throw paymentError('INVALID_REQUEST','상담 주문과 상품을 확인하지 못했어요.');
  }
  const paid=fortune.paymentId || ['FAMILY','MOONLIGHT_STONE'].includes(fortune.accessMethod) || fortune.passEvidenceId || fortune.moonstoneLedgerId || await db.findOne(Payment, {
    userId:toObjectId(userId),requestId,paymentType:'digital_content',status:{$in:['paid','success','fulfilled']},
  }, {projection:{_id:1}});
  if (paid) throw paymentError('FORTUNE_ALREADY_PAID','이미 결제한 상담이에요. 결과 화면에서 이어가 주세요.',{fortuneRequestId:id});
  if(String(fortune.paymentClaimOrderId || '').startsWith('alliance:'))throw paymentError('MOONSTONE_IN_PROGRESS','선택한 이용권 또는 월정석 결제를 확인 중이에요. 같은 상담에서 다시 확인해 주세요.');
  if (fortune.state!=='CREATED') throw paymentError('INVALID_REQUEST','이 상담은 새 결제를 시작할 수 없어요.');
  if (!getEnv(env,'GEMINIF_API_KEY') || getEnv(env,'LLM_DRY_RUN')==='true') {
    throw paymentError('FORTUNE_UNAVAILABLE','지금은 상담을 준비하고 있어요. 잠시 후 다시 확인해 주세요.');
  }
  return fortune;
}

// Prepare reserves the very same consultation row before creating any PG order.
export async function reserveFortuneDirectFunding(db,{userId,requestId,featureKey,orderId,generation}) {
  const row=await db.findOneAndUpdate(YeongnyangiRequest,{
    _id:requestId.slice(3),userId:toObjectId(userId),featureKey,state:'CREATED',paymentId:null,
    $and:[
      {$or:[{accessMethod:null},{accessMethod:''},{accessMethod:{$exists:false}}]},
      {$or:[{paymentClaimOrderId:orderId},{paymentClaimOrderId:''},{paymentClaimOrderId:null},{paymentClaimOrderId:{$exists:false}}]},
      generation===0?{$or:[{paymentGeneration:0},{paymentGeneration:{$exists:false}}]}:{paymentGeneration:generation},
    ],
  },{$set:{paymentClaimOrderId:orderId}},{returnDocument:'after'});
  if(!row)throw paymentError('MOONSTONE_IN_PROGRESS','이 상담의 결제 상태를 확인 중이에요. 같은 상담에서 결제 상태를 확인해 주세요.');
  return row;
}

export async function advanceFortunePaymentGeneration(db,userId,requestId,generation,confirmedOrderId='') {
  const orderId=confirmedOrderId || await deriveOrderId(userId,generationKey(requestId,generation));
  // The consultation document serializes retries after definitive PG failures/cancellations.
  // Concurrent clients advance the same generation once and then share the next merchant UID.
  return db.findOneAndUpdate(YeongnyangiRequest,{
    _id:requestId.slice(3),userId:toObjectId(userId),state:'CREATED',paymentId:null,
    $and:[
      {$or:[{accessMethod:null},{accessMethod:{$exists:false}}]},
      {$or:[{paymentClaimOrderId:orderId},{paymentClaimOrderId:''},{paymentClaimOrderId:null},{paymentClaimOrderId:{$exists:false}}]},
      generation===0?{$or:[{paymentGeneration:0},{paymentGeneration:{$exists:false}}]}:{paymentGeneration:generation},
    ],
  },{$inc:{paymentGeneration:1},$set:{paymentClaimOrderId:''}},{returnDocument:'after'});
}
