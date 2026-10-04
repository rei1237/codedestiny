import { Payment } from '../lib/models.js';
import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
import { toObjectId } from '../payments/db.js';
import { canReserveDeliveryRefund, DELIVERY_REFUND_PATH as P, deliveryRefundPending } from './terminal-refund-policy.js';
import {storedChapterDraft} from './stored-chapter.js';

const leaseFree = now => ({ $or: [{ leaseUntil: null }, { leaseUntil: { $lte: now } }] });
const pending = { [`${P}.status`]: 'pending', state: 'FORTUNE_FAILED', errorCode: 'DELIVERY_REFUND_PENDING' };
const refundablePayment = { $or: [
  { status: { $in: ['paid','success','fulfilled','cancelled'] } },
  { status: 'refunded', orderState: 'CANCELLED' },
] };
const supported = row => String(row.featureKey || '').startsWith('yeongnyangi-') &&
  ['DIRECT_KRW','FAMILY','MOONLIGHT_STONE','SERVICE_PACK'].includes(row.accessMethod || (row.paymentId?'DIRECT_KRW':''));

// The request and original payment are reserved together. Generation and refund
// cannot both win; the external cancellation starts only after this commits.
export async function reserveDeliveryRefund(db, row, { retryable=false, now=new Date() }={}) {
  if(!supported(row)||!canReserveDeliveryRefund(row,{retryable,now:now.getTime()}))return null;
  return db.transaction(async tx=>{
    const owner=toObjectId(row.userId),id=String(row._id),ordinal=row.chapters.length;
    const current=await tx.findOne(YeongnyangiRequest,{_id:id,userId:owner});
    if(!supported(current || {})||!canReserveDeliveryRefund(current,{retryable,now:now.getTime()})||
      current.chapters.length!==ordinal || JSON.stringify(current.chapterAttempts)!==JSON.stringify(row.chapterAttempts) ||
      JSON.stringify(current.manualRecoveryGrants)!==JSON.stringify(row.manualRecoveryGrants) ||
      JSON.stringify(current.systemRecoveryGrants)!==JSON.stringify(row.systemRecoveryGrants))return null;
    let payment;
    if(current.paymentId) {
      payment=await tx.findOne(Payment,{_id:toObjectId(current.paymentId),userId:owner,featureKey:current.featureKey,
        'metadata.consumedBy':id,paymentType:'digital_content',purchaseType:{$ne:'GIFT'},
        ...refundablePayment});
      if(!payment || payment.refundLock || payment.orderState==='PARTIAL_CANCELLED')return null;
      const locked=await tx.updateOne(Payment,{_id:payment._id,userId:owner,'metadata.consumedBy':id,
        status:payment.status,orderState:payment.orderState ?? null,refundLock:null},{$set:{'metadata.yeongnyangiRefundPending':true}});
      if(!locked.modifiedCount&&!payment.metadata?.yeongnyangiRefundPending)throw new Error('REFUND_RESERVATION_CONFLICT');
    }
    const reserved=await tx.findOneAndUpdate(YeongnyangiRequest,{_id:id,userId:owner,state:'FORTUNE_FAILED',errorCode:current.errorCode,
      chapters:{$size:ordinal},...leaseFree(now),[`${P}.status`]:{$exists:false}},
    {$set:{errorCode:'DELIVERY_REFUND_PENDING',leaseToken:'',leaseUntil:null,nextAttemptAt:null,queuedUntil:null,
      [P]:{status:'pending',reason:current.errorCode,savedChapters:ordinal,totalChapters:current.snapshot.manifest.length,
        reservedAt:now,nextAttemptAt:now,attempts:0},'hold.alertPending':false},
      $push:{recoveryAudit:{kind:'delivery_refund_reserved',source:'scheduled',chapter:ordinal,at:now}}},
    {returnDocument:'after'});
    if(!reserved)throw new Error('REFUND_RESERVATION_CONFLICT');
    return reserved;
  });
}

export async function settlePendingDeliveryRefund(env,db,row,{now=new Date(),refundCash,refundNonCash,releaseDiscount}={}) {
  if(!supported(row)||!deliveryRefundPending(row))return {outcome:'not_pending'};
  const owner=toObjectId(row.userId),id=String(row._id),token=crypto.randomUUID();
  const claim=await db.findOneAndUpdate(YeongnyangiRequest,{_id:id,userId:owner,...pending,
    $and:[{$or:[{[`${P}.leaseUntil`]:null},{[`${P}.leaseUntil`]:{$lte:now}}]},
      {$or:[{[`${P}.nextAttemptAt`]:null},{[`${P}.nextAttemptAt`]:{$lte:now}}]}]},
  {$set:{[`${P}.leaseUntil`]:new Date(now.getTime()+120000),[`${P}.token`]:token},$inc:{[`${P}.attempts`]:1}},
  {returnDocument:'after'});
  if(!claim)return {outcome:'refund_waiting'};
  const ownedClaim={_id:id,userId:owner,...pending,[`${P}.token`]:token};
  try {
    if(claim.paymentId) {
      const payment=await db.findOne(Payment,{_id:toObjectId(claim.paymentId),userId:owner,featureKey:claim.featureKey,
        'metadata.consumedBy':id,'metadata.yeongnyangiRefundPending':true,purchaseType:{$ne:'GIFT'},
        ...refundablePayment});
      if(!payment || payment.refundLock || payment.orderState==='PARTIAL_CANCELLED')throw new Error('REFUND_PAYMENT_PROOF_MISSING');
      const cancel=refundCash || (await import('../lib/payment-refund.js')).refundPaymentAsOperator;
      const result=await cancel({env,payment,reason:'영냥이 상담 복구 후 전체 결과 미제공 자동 환불',actorId:'system:yeongnyangi-delivery'});
      if(!result.ok || result.orderState!=='CANCELLED')throw new Error('REFUND_CANCELLATION_PENDING');
      if(payment.pricingSnapshot?.moonstoneDiscount?.quantity) {
        const release=releaseDiscount || (await import('../payments/moonstone.js')).releaseOrderMoonstones;
        if(!await release(db,payment.merchantUid))throw new Error('REFUND_DISCOUNT_RESTORE_PENDING');
      }
      await db.updateOne(YeongnyangiRequest,ownedClaim,{$set:{state:'REFUNDED',errorCode:'DELIVERY_REFUNDED',
        [`${P}.status`]:'completed',[`${P}.completedAt`]:now,[`${P}.leaseUntil`]:null}});
    } else {
      const restore=refundNonCash || (await import('./repository.js')).refundReservedDelivery;
      if(!await restore(env,String(owner),id))throw new Error('REFUND_RESTORE_PENDING');
      await db.updateOne(YeongnyangiRequest,{_id:id,userId:owner,state:'REFUNDED'},
        {$set:{[`${P}.status`]:'completed',[`${P}.completedAt`]:now,[`${P}.leaseUntil`]:null}});
    }
    return {outcome:'delivery_refunded'};
  } catch(error) {
    // Timeout is ambiguous: keep the reservation, retry the same PG idempotency
    // key and receipt. Never mark money returned before cancellation succeeds.
    const attempt=claim.generationCheckpoint.deliveryRefund.attempts;
    await db.updateOne(YeongnyangiRequest,ownedClaim,{$set:{[`${P}.leaseUntil`]:null,
      [`${P}.nextAttemptAt`]:new Date(now.getTime()+Math.min(3600000,60000*2**Math.min(attempt,6))),
      [`${P}.lastError`]:String(error?.code || error?.message || 'REFUND_PENDING').slice(0,80)}});
    return {outcome:'delivery_refund_pending'};
  }
}

// Uses the existing recovery cron even when the provider/queue is unavailable.
// Scan eligibility and retry time server-side; no browser refund claims accepted.
export async function settleDeliveryRefunds(env, options={}) {
  const db=options.db || (await import('../lib/pass-consumption.js')).consultationRefundDb();
  const repository=options.repository || await import('./repository.js');
  const now=new Date(options.now || Date.now()),outcomes=[];
  const scope={featureKey:{$regex:'^yeongnyangi-'},state:'FORTUNE_FAILED'};
  const access={$or:[{accessMethod:{$in:['DIRECT_KRW','FAMILY','MOONLIGHT_STONE','SERVICE_PACK']}},
    {accessMethod:null,paymentId:{$ne:null}}]};
  const waiting=await db.find(YeongnyangiRequest,{...scope,...pending,
    $and:[access,{$or:[{[`${P}.leaseUntil`]:null},{[`${P}.leaseUntil`]:{$lte:now}}]},
      {$or:[{[`${P}.nextAttemptAt`]:null},{[`${P}.nextAttemptAt`]:{$lte:now}}]}]},
    {sort:{[`${P}.nextAttemptAt`]:1,_id:1},limit:3});
  const held=await db.find(YeongnyangiRequest,{...scope,$and:[access,leaseFree(now)],
    errorCode:{$in:['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED']},[`${P}.status`]:{$exists:false}},
    {sort:{'generationCheckpoint.deliveryCheckedAt':1,updatedAt:1,_id:1},limit:10});
  const candidates=[...waiting,...held];let attempts=0;
  const dispatch=async row=>{if(env.YEONGNYANGI_QUEUE){const enqueue=options.enqueue || (await import('./queue.js')).enqueueConsultation;await enqueue(env,row);}};
  for(let row of candidates) {
    try {
      if(!deliveryRefundPending(row)) {
        await db.updateOne(YeongnyangiRequest,{_id:row._id,userId:toObjectId(row.userId),state:'FORTUNE_FAILED'},
          {$set:{'generationCheckpoint.deliveryCheckedAt':now}});
        if(storedChapterDraft(row)) {
          const resumed=await repository.resumeHeldStoredChapter(env,row);
          if(resumed){await dispatch(resumed);outcomes.push({outcome:'stored_draft_recovery'});}
          continue;
        }
        if(repository.userCanRetryHold(row)) {
          row=await repository.resumeHeldByUser(env,String(row.userId),String(row._id),'scheduled');
          if(row.state==='PAID'){await dispatch(row);outcomes.push({outcome:'system_final_retry'});continue;}
        }
        row=await reserveDeliveryRefund(db,row,{now,retryable:repository.userCanRetry(row)||repository.holdAutoResumes(row)});
      }
      if(row&&attempts<3){attempts++;outcomes.push(await settlePendingDeliveryRefund(env,db,row,{...options,now}));}
    }catch(error){outcomes.push({outcome:String(error?.code || 'DELIVERY_SETTLEMENT_RETRY').slice(0,80)});}
  }
  return outcomes;
}
