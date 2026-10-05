import {jest} from '@jest/globals';
import {Payment} from '../../worker/lib/models.js';
import {YeongnyangiRequest} from '../../worker/lib/yeongnyangi-models.js';
import {makeFakePaymentDb,matches} from '../fixtures/fake-payment-db.mjs';
import {reserveDeliveryRefund,settlePendingDeliveryRefund,settleDeliveryRefunds} from '../../worker/yeongnyangi/terminal-refund.js';
import {canReserveDeliveryRefund,deliveryRefundPending} from '../../worker/yeongnyangi/terminal-refund-policy.js';
import {releaseOrderMoonstones} from '../../worker/payments/moonstone.js';
import {User,MonthlyCreditLedger} from '../../worker/lib/models.js';
const USER='507f1f77bcf86cd799439011',OTHER='507f1f77bcf86cd799439012',ID='a'.repeat(64),PAY='507f1f77bcf86cd799439019';
const now=new Date('2026-10-05T00:00:00Z');
function fixture(method='DIRECT_KRW') {
 const db=makeFakePaymentDb();
 db.rows.push({_id:ID,userId:USER,featureKey:'yeongnyangi-saju-mackerel',accessMethod:method,
  paymentId:method==='DIRECT_KRW'?PAY:null,state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',
  leaseUntil:null,chapters:[{summary:'saved'}],completedChapters:1,snapshot:{manifest:[{},{}]},chapterAttempts:{1:4},
  manualRecoveryGrants:{1:1},systemRecoveryGrants:{1:1},generationCheckpoint:{chapterDrafts:{0:{body:{summary:'old saved draft'}}}}},
  {_id:PAY,userId:USER,featureKey:'yeongnyangi-saju-mackerel',paymentType:'digital_content',status:'paid',
    metadata:{consumedBy:ID},paymentAmount:1000,merchantUid:'fixture-payment',refundLock:null});
 const find=db.find;
 db.find=async(Model,filter,options)=>{
  if(filter.featureKey?.$regex){const pattern=new RegExp(filter.featureKey.$regex),rest={...filter};delete rest.featureKey;
   const rows=(await find(Model,rest)).filter(row=>pattern.test(row.featureKey));
   return rows.slice(0,options?.limit || rows.length);}
  return find(Model,filter,options);
 };
 return {db,get row(){return db.rows.find(row=>row._id===ID)},get payment(){return db.rows.find(row=>row._id===PAY)}};
}
test.each(['completed','lease','draft','retry'])('%s is never refunded before delivery recovery is final',async kind=>{
 const f=fixture();if(kind==='completed')f.row.state='COMPLETED';if(kind==='lease')f.row.leaseUntil=new Date(now.getTime()+60000);
 if(kind==='draft')f.row.generationCheckpoint.chapterDrafts[1]={body:{summary:'current deliverable draft'}};
 expect(await reserveDeliveryRefund(f.db,f.row,{now,retryable:kind==='retry'})).toBeNull();
 expect(f.payment.metadata.yeongnyangiRefundPending).toBeUndefined();
});
test('historical drafts do not prevent a partial final failure reservation',async()=>{
 const f=fixture();const row=await reserveDeliveryRefund(f.db,f.row,{now});
 expect(deliveryRefundPending(row)).toBe(true);expect(row.chapters).toHaveLength(1);
 expect(f.payment.metadata.yeongnyangiRefundPending).toBe(true);
});
test.each(['owner','request','partial-cancel','refunded-partial'])('invalid %s payment proof cannot start a refund',async kind=>{
 const f=fixture();if(kind==='owner')f.payment.userId=OTHER;if(kind==='request')f.payment.metadata.consumedBy='b'.repeat(64);
 if(kind==='partial-cancel')f.payment.orderState='PARTIAL_CANCELLED';
 if(kind==='refunded-partial'){f.payment.status='refunded';f.payment.orderState='PARTIAL_CANCELLED';}
 expect(await reserveDeliveryRefund(f.db,f.row,{now})).toBeNull();expect(deliveryRefundPending(f.row)).toBe(false);
});
test('webhook-confirmed full cancellation can reserve the remaining delivery settlement',async()=>{
 const f=fixture();f.payment.status='refunded';f.payment.orderState='CANCELLED';
 expect(deliveryRefundPending(await reserveDeliveryRefund(f.db,f.row,{now}))).toBe(true);
});
test('a recovery grant added after the scan wins over stale refund eligibility',async()=>{
 const f=fixture(),scanned=structuredClone(f.row);f.row.manualRecoveryGrants[1]++;
 expect(await reserveDeliveryRefund(f.db,scanned,{now})).toBeNull();
});
test('losing the request CAS rolls back the payment reservation',async()=>{
 const f=fixture(),write=f.db.findOneAndUpdate;f.db.findOneAndUpdate=async(Model,...args)=>Model===YeongnyangiRequest?null:write(Model,...args);
 await expect(reserveDeliveryRefund(f.db,f.row,{now})).rejects.toThrow('REFUND_RESERVATION_CONFLICT');
 expect(f.payment.metadata.yeongnyangiRefundPending).toBeUndefined();
});
test('duplicate reservations and overlapping cash settlement call the provider once',async()=>{
 const f=fixture(),scanned=structuredClone(f.row);
 const reservations=await Promise.all([reserveDeliveryRefund(f.db,scanned,{now}),reserveDeliveryRefund(f.db,scanned,{now})]);
 expect(reservations.filter(Boolean)).toHaveLength(1);
 const cancel=jest.fn(async()=>({ok:true,orderState:'CANCELLED'}));
 const outcomes=await Promise.all([settlePendingDeliveryRefund({},f.db,f.row,{now,refundCash:cancel}),settlePendingDeliveryRefund({},f.db,f.row,{now,refundCash:cancel})]);
 expect(cancel).toHaveBeenCalledTimes(1);expect(outcomes.map(row=>row.outcome)).toContain('delivery_refunded');expect(f.row.state).toBe('REFUNDED');
});
test('a pending or failed PG response retains the reservation and saved content',async()=>{
 const f=fixture();await reserveDeliveryRefund(f.db,f.row,{now});
 expect(await settlePendingDeliveryRefund({},f.db,f.row,{now,refundCash:async()=>({ok:false,orderState:'ERROR'})})).toEqual({outcome:'delivery_refund_pending'});
 expect(f.row.state).toBe('FORTUNE_FAILED');expect(deliveryRefundPending(f.row)).toBe(true);expect(f.row.chapters).toHaveLength(1);
 expect(f.row.generationCheckpoint.deliveryRefund.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime());
});
test('PG success with a lost request write retries the same payment without a second cancellation',async()=>{
 const f=fixture();await reserveDeliveryRefund(f.db,f.row,{now});let calls=0,failOnce=true;
 const cancel=async({payment})=>{if(payment.status!=='cancelled'){calls++;await f.db.updateOne(Payment,{_id:PAY},{$set:{status:'cancelled',orderState:'CANCELLED'}});}return {ok:true,orderState:'CANCELLED'};};
 const write=f.db.updateOne;f.db.updateOne=async(Model,filter,update,...rest)=>{if(Model===YeongnyangiRequest&&update.$set?.state==='REFUNDED'&&failOnce){failOnce=false;throw new Error('lost write');}return write(Model,filter,update,...rest);};
 expect((await settlePendingDeliveryRefund({},f.db,f.row,{now,refundCash:cancel})).outcome).toBe('delivery_refund_pending');
 const later=new Date(now.getTime()+180000);
 expect((await settlePendingDeliveryRefund({},f.db,f.row,{now:later,refundCash:cancel})).outcome).toBe('delivery_refunded');
 expect(calls).toBe(1);expect(f.row.state).toBe('REFUNDED');
});

test('mixed cash and discount stones restore the settled discount once before completion',async()=>{
 const f=fixture();f.payment.pricingSnapshot={moonstoneDiscount:{quantity:500}};
 f.db.rows.push({_id:USER,profileSubscription:{membershipCreditBalance:0,membershipCreditUsed:500,membershipCreditLotsVersion:0,membershipCreditLots:[]}},
  {_id:'discount-spend',userId:USER,type:'MONTHLY_CREDIT_SPEND',sourceId:'order-discount:fixture-payment',amount:500,settledAt:now});
 await reserveDeliveryRefund(f.db,f.row,{now});
 const cancel=async()=>{await f.db.updateOne(Payment,{_id:PAY},{$set:{status:'cancelled',orderState:'CANCELLED'}});return {ok:true,orderState:'CANCELLED'};};
 expect((await settlePendingDeliveryRefund({},f.db,f.row,{now,refundCash:cancel})).outcome).toBe('delivery_refunded');
 expect((await f.db.findOne(User,{_id:USER})).profileSubscription.membershipCreditBalance).toBe(500);
 expect(await releaseOrderMoonstones(f.db,'fixture-payment')).toBe(true);
 expect((await f.db.findOne(User,{_id:USER})).profileSubscription.membershipCreditBalance).toBe(500);
 expect((await f.db.find(MonthlyCreditLedger,{type:'MONTHLY_CREDIT_GRANT'}))).toHaveLength(1);
});
test('discount restoration failure remains pending after PG cancellation and is retried',async()=>{
 const f=fixture();f.payment.pricingSnapshot={moonstoneDiscount:{quantity:500}};await reserveDeliveryRefund(f.db,f.row,{now});
 let pgCalls=0;const cancel=async({payment})=>{if(payment.status!=='cancelled'){pgCalls++;await f.db.updateOne(Payment,{_id:PAY},{$set:{status:'cancelled',orderState:'CANCELLED'}});}return {ok:true,orderState:'CANCELLED'};};
 const release=jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
 expect((await settlePendingDeliveryRefund({},f.db,f.row,{now,refundCash:cancel,releaseDiscount:release})).outcome).toBe('delivery_refund_pending');
 expect(f.row.state).toBe('FORTUNE_FAILED');
 expect((await settlePendingDeliveryRefund({},f.db,f.row,{now:new Date(now.getTime()+180000),refundCash:cancel,releaseDiscount:release})).outcome).toBe('delivery_refunded');
 expect(pgCalls).toBe(1);expect(release).toHaveBeenCalledTimes(2);
});
test('webhook-first full refund retries failed discount restoration without another PG cancellation',async()=>{
 const f=fixture();f.payment.pricingSnapshot={moonstoneDiscount:{quantity:500}};await reserveDeliveryRefund(f.db,f.row,{now});
 let pgCalls=0;
 const cancel=async({payment})=>{
  if(payment.orderState!=='CANCELLED'){pgCalls++;await f.db.updateOne(Payment,{_id:PAY},{$set:{status:'refunded',orderState:'CANCELLED'}});}
  return {ok:true,orderState:'CANCELLED'};
 };
 const release=jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
 expect((await settlePendingDeliveryRefund({},f.db,f.row,{now,refundCash:cancel,releaseDiscount:release})).outcome).toBe('delivery_refund_pending');
 expect(f.payment.status).toBe('refunded');expect(f.row.state).toBe('FORTUNE_FAILED');
 expect((await settlePendingDeliveryRefund({},f.db,f.row,{now:new Date(now.getTime()+180000),refundCash:cancel,releaseDiscount:release})).outcome).toBe('delivery_refunded');
 expect(pgCalls).toBe(1);expect(release).toHaveBeenCalledTimes(2);
});
test('provider and queue unavailability do not stop an already reserved refund',async()=>{
 const f=fixture();await reserveDeliveryRefund(f.db,f.row,{now});
 const repository={userCanRetry:()=>false,userCanRetryHold:()=>false,holdAutoResumes:()=>false};
 expect(await settleDeliveryRefunds({}, {db:f.db,repository,now:now.getTime(),refundCash:async()=>({ok:true,orderState:'CANCELLED'})})).toContainEqual({outcome:'delivery_refunded'});
});
test('the final bounded recovery is scheduled before refunding a held partial result',async()=>{
 const f=fixture('MOONLIGHT_STONE');
 const resumeHeldByUser=jest.fn(async(_env,_user,_id,source)=>{expect(source).toBe('scheduled');f.row.state='PAID';return f.row;});
 const repository={userCanRetry:()=>true,userCanRetryHold:()=>true,holdAutoResumes:()=>false,resumeHeldByUser};
 expect(await settleDeliveryRefunds({}, {db:f.db,repository,now:now.getTime()})).toContainEqual({outcome:'system_final_retry'});
 expect(deliveryRefundPending(f.row)).toBe(false);expect(resumeHeldByUser).toHaveBeenCalledTimes(1);
});
test('a current durable draft resumes storage without granting a new provider attempt',async()=>{
 const f=fixture('MOONLIGHT_STONE');f.row.generationCheckpoint.chapterDrafts[1]={body:{summary:'saved final draft'}};
 const resumeHeldStoredChapter=jest.fn(async()=>({...f.row,state:'PAID'})),enqueue=jest.fn();
 const repository={resumeHeldStoredChapter,userCanRetryHold:jest.fn()};
 expect(await settleDeliveryRefunds({YEONGNYANGI_QUEUE:{}},{db:f.db,repository,enqueue,now:now.getTime()})).toContainEqual({outcome:'stored_draft_recovery'});
 expect(repository.userCanRetryHold).not.toHaveBeenCalled();expect(enqueue).toHaveBeenCalledTimes(1);
 expect(deliveryRefundPending(f.row)).toBe(false);expect(f.row.chapterAttempts[1]).toBe(4);
});
test('an invalid full-size result is still a failed delivery, and ordinary chat is outside this policy',()=>{
 const f=fixture();f.row.chapters.push({summary:'unusable final chapter'});
 expect(canReserveDeliveryRefund(f.row,{now:now.getTime()})).toBe(true);
 f.row.featureKey='fortune-chat-consultation';expect(matches(f.row,{featureKey:'yeongnyangi-saju-mackerel'})).toBe(false);
});
