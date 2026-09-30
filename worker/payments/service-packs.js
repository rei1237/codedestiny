import { Payment, PointHistory, User } from '../lib/models.js';
import { PurchaseEntitlement } from './purchase-entitlement-model.js';
import { paidExecutionDocumentId } from './executions.js';
import { toObjectId } from './db.js';
import { normalizePurchasePaymentMethod } from '../lib/entitlement-policy.js';
import { paymentError } from './errors.js';
import { servicePackCoverage, servicePackFeatures } from './service-pack-policy.js';
import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
import { reserveFortuneFunding, completeFortuneFunding } from '../yeongnyangi/payment-funding.js';

const PAID=['paid','success','fulfilled'];
const useId=(userId,requestId)=>paidExecutionDocumentId('service-pack-use:'+userId+':'+requestId);
const restoreId=(userId,requestId)=>paidExecutionDocumentId('service-pack-restore:'+userId+':'+requestId);
const packId=orderId=>paidExecutionDocumentId('purchase:'+orderId);
export const activeOrderFilter=(userId,orderId)=>({merchantUid:orderId,userId:toObjectId(userId),status:{$in:PAID},
  refundLock:null,refundRequestedAt:null,orderState:{$nin:['PARTIAL_CANCELLED','CANCELLED']},'metadata.unlockRevoked':{$ne:true},
  'metadata.cancellationReviewRequired':{$ne:true},'pricingSnapshot.cancellationReviewRequired':{$ne:true},
  'metadata.yeongnyangiRefundPending':{$ne:true}});

async function findPackFunding(db,right,userId,commitMarker='') {
  if(right.giftId) {
    const {findGiftPackFunding}=await import('./service-pack-gift-proof.js');
    return findGiftPackFunding(db,right,{commitMarker});
  }
  const filter=activeOrderFilter(userId,right.orderId);
  return commitMarker?db.findOneAndUpdate(Payment,filter,
    {$set:{'metadata.servicePackUseGuard':commitMarker},$inc:{'metadata.servicePackProofRevision':1}},
    {returnDocument:'after'}):db.findOne(Payment,filter);
}
async function fundedOrderIds(db,rights,userId) {
  const self=rights.filter(right=>!right.giftId),gifts=rights.filter(right=>right.giftId);
  const orders=self.length?await db.find(Payment,activeOrderFilter(userId,{$in:self.map(right=>right.orderId)})):[];
  const paidIds=new Set(orders.map(order=>order.merchantUid));
  if(gifts.length) {
    const {listGiftPackFundingIds}=await import('./service-pack-gift-proof.js');
    for(const orderId of await listGiftPackFundingIds(db,gifts))paidIds.add(orderId);
  }
  return paidIds;
}
export function findActiveServicePackOrder(db,userId,orderId) {
  return db.findOne(Payment,activeOrderFilter(userId,orderId));
}

export async function findServicePackPurchaseGrant(db,order) {
  if(order.purchaseType==='GIFT') {
    const {Gift}=await import('../lib/gift-models.js');
    const gift=await db.findOne(Gift,{orderId:order.merchantUid,purchaserUserId:toObjectId(order.userId),
      productId:order.productId,status:{$in:['PAID','CLAIMED']}});
    return gift?{status:'granted',giftId:gift.giftId}:null;
  }
  return db.findOne(PurchaseEntitlement,{_id:packId(order.merchantUid),userId:String(order.userId),
    orderId:order.merchantUid,productId:order.productId,type:'service_pack',status:'granted'});
}
export async function assertServicePackPurchaseActive(db,order,{requireEntitlement=false}={}) {
  const active=await findActiveServicePackOrder(db,order.userId,order.merchantUid);
  const right=!requireEntitlement||await findServicePackPurchaseGrant(db,order);
  if(!active||!right)throw paymentError('ORDER_NOT_CONFIRMABLE','이용권 결제 상태를 다시 확인해 주세요.');
}

function storedPackSnapshot(order) {
  const snapshot=order?.pricingSnapshot?.packSnapshot;
  const features=servicePackFeatures(snapshot?.fishId);
  if(!snapshot||snapshot.planId!==order.productId||!snapshot.policyVersion||features.length!==6
    ||!Number.isSafeInteger(snapshot.totalUses)||snapshot.totalUses<=0
    ||!Number.isSafeInteger(snapshot.validityDays)||snapshot.validityDays<=0
    ||!Array.isArray(snapshot.eligibleFeatureKeys)||snapshot.eligibleFeatureKeys.length!==6
    ||!features.every(key=>snapshot.eligibleFeatureKeys.includes(key)))
    throw paymentError('INVALID_REQUEST','주문에 저장된 이용권 구성을 확인하지 못했어요.');
  return snapshot;
}

// Called only by existing verified PG fulfillment, never from client quote data.
// Order snapshot is immutable, so changing the next offer cannot reset an older pack.
export async function grantServicePack(db,order) {
  return db.transaction(tx=>grantServicePackInTransaction(tx,order));
}
export async function grantServicePackInTransaction(tx,order,{recipientUserId='',giftId='',claimedAt=null}={}) {
    if((order.purchaseType==='GIFT')!==Boolean(giftId&&recipientUserId&&claimedAt))
      throw paymentError('INVALID_REQUEST','선물 수령 증빙을 확인해 주세요.');
    const verified=await tx.findOneAndUpdate(Payment,activeOrderFilter(order.userId,order.merchantUid),
      {$set:{'metadata.servicePackGrantGuard':String(order.merchantUid)}},{returnDocument:'after'});
    if(!verified)throw paymentError('INVALID_REQUEST','승인된 이용권 주문을 확인하지 못했어요.');
    const snapshot=storedPackSnapshot(verified),_id=packId(verified.merchantUid);
    const paidAt=new Date(claimedAt||verified.paidAt),expiresAt=new Date(paidAt.getTime()+snapshot.validityDays*86400000);
    if(!Number.isFinite(paidAt.getTime()))throw paymentError('INVALID_REQUEST','결제 시각을 확인하지 못했어요.');
    const right=await tx.findOneAndUpdate(PurchaseEntitlement,{_id},{$setOnInsert:{
      _id,entitlementId:'purchase:'+verified.merchantUid,userId:String(recipientUserId||verified.userId),
      productId:verified.productId,featureKey:verified.featureKey,orderId:verified.merchantUid,paymentId:verified.merchantUid,
      requestId:verified.requestId||verified.idempotencyKey,type:'service_pack',status:'granted',
      totalUses:snapshot.totalUses,remainingUses:snapshot.totalUses,packSnapshot:snapshot,expiresAt,
      ...(giftId?{giftId}:{}),
      grantedAt:paidAt,updatedAt:new Date(),
    }},{upsert:true,returnDocument:'after'});
    if(right.type!=='service_pack'||right.status!=='granted'||right.orderId!==verified.merchantUid
      ||right.userId!==String(recipientUserId||verified.userId)||right.productId!==verified.productId
      ||String(right.giftId||'')!==giftId)
      throw paymentError('INVALID_REQUEST','이용권 지급 증빙이 주문과 일치하지 않습니다.');
    return right;
}

// Paid proof remains live at read, generation claim and chapter/completion writes.
// A committing caller uses its transaction adapter and a marker to serialize PG revocation.
export async function findServicePackUseEvidence(db,{userId,requestId,featureKey,commitMarker=''}) {
  const evidence=await db.findOne(PointHistory,{_id:useId(userId,requestId),userId:toObjectId(userId),
    featureKey,'metadata.requestId':requestId,'metadata.accessMethod':'SERVICE_PACK',
    'metadata.refundedForServiceExecution':{$ne:true}});
  if(!evidence)return null;
  const right=await db.findOne(PurchaseEntitlement,{_id:toObjectId(evidence.metadata.packEntitlementId),
    userId:String(userId),type:'service_pack',status:'granted'});
  if(!right)return null;
  const order=await findPackFunding(db,right,userId,commitMarker);
  // Expiry controls unused rights; a completed, paid consultation remains readable.
  if(!order)return null;
  if(commitMarker) {
    const marked=await db.findOneAndUpdate(PointHistory,{_id:evidence._id,'metadata.refundedForServiceExecution':{$ne:true}},
      {$set:{'metadata.yeongnyangiCommit':commitMarker}},{returnDocument:'after'});
    if(!marked)return null;
  }
  return {...evidence,remainingUses:right.remainingUses};
}

// Funding CAS, one-use deduction, durable receipt and request attachment share one transaction.
export async function consumeServicePack(db,{userId,entitlementId,requestId,now=new Date()}) {
  if(!/^yn-[a-f0-9]{64}$/.test(String(requestId)))
    throw paymentError('INVALID_REQUEST','영냥이 상담 요청을 먼저 확인해 주세요.');
  return db.transaction(async tx=>{
    const fortune=await tx.findOne(YeongnyangiRequest,{_id:requestId.slice(3),userId:toObjectId(userId)});
    if(!fortune)throw paymentError('INVALID_REQUEST','상담 주문을 확인해 주세요.');
    const featureKey=fortune.featureKey,amountKRW=Number(fortune.amountKRW);
    const claim=await reserveFortuneFunding(tx,{userId,requestId,featureKey,coinCost:amountKRW/100,method:'SERVICE_PACK'});
    if(!claim)throw paymentError('INVALID_REQUEST','이용권 적용 상담을 확인하지 못했어요.');
    const account=await tx.findOne(User,{_id:toObjectId(userId)},{projection:{points:1}});
    const balanceAfter=Math.max(0,Number(account?.points||0));
    const receiptId=useId(userId,requestId);
    const prior=await tx.findOne(PointHistory,{_id:receiptId,userId:toObjectId(userId)});
    if(claim.settled&&!prior)throw paymentError('INVALID_REQUEST','저장된 상담 이용 증빙을 확인하지 못했어요.');
    if(prior) {
      const proof=await findServicePackUseEvidence(tx,{userId,requestId,featureKey,commitMarker:requestId});
      if(!proof)throw paymentError('INVALID_REQUEST','복원 또는 취소된 이용 내역입니다.');
      await completeFortuneFunding(tx,claim,{evidenceId:receiptId,entitlementId:proof.metadata.packEntitlementId});
      return {replayed:true,evidenceId:String(receiptId),remainingUses:proof.remainingUses};
    }
    const right=await tx.findOne(PurchaseEntitlement,{_id:toObjectId(entitlementId),userId:String(userId),type:'service_pack'});
    const orderId=right?.orderId;
    const coverage=servicePackCoverage(right,featureKey,amountKRW,now);
    if(!coverage.covered)throw paymentError(coverage.reason,'해당 상담에 사용할 영냥이 이용권 잔여 횟수를 확인해 주세요.');
    const paid=await findPackFunding(tx,right,userId,requestId);
    if(!paid)throw paymentError('INVALID_REQUEST','이용권 결제 증빙을 확인하지 못했어요.');
    const updated=await tx.findOneAndUpdate(PurchaseEntitlement,{_id:right._id,userId:String(userId),
      type:'service_pack',status:'granted',remainingUses:{$gte:1},expiresAt:{$gt:now}},
      {$inc:{remainingUses:-1},$set:{updatedAt:now}},{returnDocument:'after'});
    if(!updated)throw paymentError('SERVICE_PACK_EXHAUSTED','남은 이용 횟수를 다시 확인해 주세요.');
    const receipt=await tx.findOneAndUpdate(PointHistory,{_id:receiptId},{$setOnInsert:{
      _id:receiptId,userId:toObjectId(userId),kind:'deduct',delta:0,balanceAfter,featureKey,reason:'service_pack_use',
      metadata:{requestId,accessMethod:'SERVICE_PACK',packEntitlementId:String(right._id),orderId,
        consumedUses:1,remainingUses:updated.remainingUses,policyVersion:right.packSnapshot.policyVersion},
      createdAt:now,updatedAt:now,
    }},{upsert:true,returnDocument:'after'});
    if(!receipt?._id)throw paymentError('IDEMPOTENCY_CONFLICT','이용권 사용 증빙을 확인해 주세요.');
    await completeFortuneFunding(tx,claim,{evidenceId:receiptId,entitlementId:String(right._id)});
    return {replayed:false,evidenceId:String(receiptId),remainingUses:updated.remainingUses};
  });
}

// Reuses the existing empty terminal-failure rule; no automatic cash/PG refund.
export async function restoreFailedServicePackUse(db,{userId,requestId,now=new Date()}) {
  if(!/^yn-[a-f0-9]{64}$/.test(String(requestId)))throw paymentError('INVALID_REQUEST','상담 요청을 확인해 주세요.');
  const fortuneId=String(requestId).slice(3),receiptId=restoreId(userId,requestId);
  return db.transaction(async tx=>{
    const prior=await tx.findOne(PointHistory,{_id:receiptId,userId:toObjectId(userId)});
    if(prior)return {restored:true,replayed:true};
    const account=await tx.findOne(User,{_id:toObjectId(userId)},{projection:{points:1}});
    const balanceAfter=Math.max(0,Number(account?.points||0));
    const row=await tx.findOneAndUpdate(YeongnyangiRequest,{_id:fortuneId,userId:toObjectId(userId),accessMethod:'SERVICE_PACK',
      state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',completedChapters:0,
      'chapters.0':{$exists:false},'generationCheckpoint.chapterDrafts.0':{$exists:false},
      $or:[{leaseUntil:null},{leaseUntil:{$exists:false}},{leaseUntil:{$lte:now}}]},
      {$set:{state:'REFUNDED',errorCode:'SERVICE_PACK_USE_RESTORED',leaseToken:'',leaseUntil:null,updatedAt:now}},
      {returnDocument:'after'});
    if(!row)return {restored:false};
    const use=await findServicePackUseEvidence(tx,{userId,requestId,featureKey:row.featureKey,commitMarker:'restore:'+requestId});
    if(!use)throw paymentError('IDEMPOTENCY_CONFLICT','이용권 사용 증빙을 확인해 주세요.');
    const right=await tx.findOne(PurchaseEntitlement,{_id:toObjectId(use.metadata.packEntitlementId),userId:String(userId),type:'service_pack',status:'granted'});
    const restored=right&&await tx.findOneAndUpdate(PurchaseEntitlement,{_id:right._id,status:'granted',remainingUses:{$lt:right.totalUses}},
      {$inc:{remainingUses:1},$set:{updatedAt:now}},{returnDocument:'after'});
    if(!restored)throw paymentError('INVALID_REQUEST','이용 횟수 복원 상태를 확인하지 못했어요.');
    const marked=await tx.findOneAndUpdate(PointHistory,{_id:use._id,'metadata.refundedForServiceExecution':{$ne:true}},
      {$set:{'metadata.refundedForServiceExecution':true,updatedAt:now}},{returnDocument:'after'});
    if(!marked)throw paymentError('IDEMPOTENCY_CONFLICT','이용 횟수 복원 증빙을 확인해 주세요.');
    const receipt=await tx.findOneAndUpdate(PointHistory,{_id:receiptId},{$setOnInsert:{
      _id:receiptId,userId:toObjectId(userId),kind:'refund',delta:0,balanceAfter,featureKey:row.featureKey,reason:'service_pack_restore',
      metadata:{requestId,packEntitlementId:String(right._id),restoredUses:1},createdAt:now,updatedAt:now,
    }},{upsert:true,returnDocument:'after'});
    if(!receipt?._id)throw paymentError('IDEMPOTENCY_CONFLICT','이용 횟수 복원 증빙을 확인해 주세요.');
    return {restored:true,replayed:false};
  });
}

export function presentPack(right,paid,now=new Date()) {
  const snap=right.packSnapshot||{},coverage=servicePackCoverage(right,snap.eligibleFeatureKeys?.[0],snap.unitPriceKRW,now);
  return {entitlementId:String(right._id),orderId:right.orderId,planId:right.productId,label:snap.label,fishId:snap.fishId,
    totalUses:Number(right.totalUses),remainingUses:Number(right.remainingUses),eligibleFeatureKeys:snap.eligibleFeatureKeys||[],
    expiresAt:right.expiresAt,status:right.status,available:Boolean(paid&&coverage.covered),
    unavailableReason:paid?(coverage.reason||''):'PAYMENT_NOT_ACTIVE'};
}
export async function listOwnedServicePacks(db,{userId,before='',now=new Date()}) {
  if(before&&!toObjectId(before))throw paymentError('INVALID_REQUEST','목록 위치를 확인해 주세요.');
  const rights=await db.find(PurchaseEntitlement,{userId:String(userId),type:'service_pack',
    ...(before?{_id:{$lt:toObjectId(before)}}:{})},{sort:{_id:-1},limit:100});
  const paidIds=await fundedOrderIds(db,rights,userId);
  return {packs:rights.map(r=>presentPack(r,paidIds.has(r.orderId),now)),nextCursor:rights.length===100?String(rights.at(-1)._id):null};
}
export async function quoteServicePack(db,{userId,requestId,now=new Date()}) {
  if(!/^yn-[a-f0-9]{64}$/.test(String(requestId)))throw paymentError('INVALID_REQUEST','상담 요청을 확인해 주세요.');
  const row=await db.findOne(YeongnyangiRequest,{_id:requestId.slice(3),userId:toObjectId(userId)});
  if(!row)throw paymentError('INVALID_REQUEST','상담 주문을 확인해 주세요.');
  if(row.accessMethod==='SERVICE_PACK') {
    const use=await findServicePackUseEvidence(db,{userId,requestId,featureKey:row.featureKey});
    return {requestId,featureKey:row.featureKey,accessMethod:'SERVICE_PACK',candidates:[],
      status:row.state==='REFUNDED'?'restored':use?'used':'unavailable',
      existingUse:use?{evidenceId:String(use._id),entitlementId:use.metadata.packEntitlementId,remainingUses:use.remainingUses}:null};
  }
  if(row.accessMethod||row.paymentId||row.state!=='CREATED')return {requestId,featureKey:row.featureKey,accessMethod:row.accessMethod,
    candidates:[],status:row.state==='REFUNDED'?'restored':'paid',existingUse:null};
  const rights=await db.find(PurchaseEntitlement,{userId:String(userId),type:'service_pack',status:'granted',
    'packSnapshot.eligibleFeatureKeys':row.featureKey,remainingUses:{$gt:0},expiresAt:{$gt:now}},{sort:{expiresAt:1},limit:100});
  const paidIds=await fundedOrderIds(db,rights,userId);
  const candidates=rights.filter(r=>paidIds.has(r.orderId)&&servicePackCoverage(r,row.featureKey,row.amountKRW,now).covered)
    .map(r=>presentPack(r,true,now));
  return {requestId,featureKey:row.featureKey,accessMethod:null,status:row.paymentClaimOrderId?'processing':candidates.length?'available':'unavailable',existingUse:null,candidates};
}

// A purchase retry retains the same paid or pending order. A new pack purchase
// must use a new caller idempotency key; a lost response never starts a second PG charge.
export async function createServicePackOrder(db,input) {
  if(normalizePurchasePaymentMethod(input.paymentMethod||'card_general')!=='pg')
    throw paymentError('DIRECT_ONLY_PAYMENT_REQUIRED','영냥이 횟수 이용권은 단건 결제로 구매해 주세요.');
  const key=String(input.idempotencyKey||'').trim();
  if(!key||key.length>140)throw paymentError('IDEMPOTENCY_KEY_REQUIRED','구매 요청 식별자를 확인해 주세요.');
  const {createOrder,deriveOrderId}=await import('./orders.js');
  if(input.expectedOrderId!==undefined && (typeof input.expectedOrderId!=='string'
    || input.expectedOrderId!==await deriveOrderId(input.userId,'service-pack:'+key)))
    throw paymentError('ORDER_NOT_CONFIRMABLE','저장된 구매 요청과 원주문이 일치하지 않습니다. 결제 상태를 다시 확인해 주세요.');
  const {purchaseTypeOf}=await import('./gifts.js');
  const purchaseType=purchaseTypeOf(input.purchaseType);
  const order=await createOrder(db,{...input,purchaseType,idempotencyKey:'service-pack:'+key,requestId:'service-pack:'+key});
  if(order.productId!==input.product.productId||order.pricingSnapshot?.fulfillmentType!=='service_pack'
    ||JSON.stringify(order.pricingSnapshot.packSnapshot)!==JSON.stringify(input.product.packSnapshot)
    ||(order.purchaseType||'SELF')!==purchaseType
    ||JSON.stringify(order.metadata?.giftDraft||null)!==JSON.stringify(input.giftDraft||null))
    throw paymentError('IDEMPOTENCY_CONFLICT','이 구매 요청에 저장된 이용권 구성을 확인해 주세요.');
  if(!['pending',...PAID].includes(order.status))
    throw paymentError('ORDER_NOT_CONFIRMABLE','기존 구매 상태를 확인한 뒤 새 구매 요청으로 진행해 주세요.');
  return order;
}
