// A terminal consultation refund commits with its request and original proof.
// No generic service-execution refund or alternate accounting path is introduced.
import { MonthlyCreditLedger } from '../lib/models.js';
import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
import { calculatePaidFeatureMembershipCreditCost } from '../lib/paid-feature-registry.js';
import { findMoonstoneSpendEvidence, moonstoneSpendRefundFilter } from '../lib/moonstone-spend-proof.js';
import { restoreMonthlyCreditLot } from '../lib/monthly-credit-store.js';
import { toObjectId } from '../payments/db.js';

const failure=code=>Object.assign(new Error(code),{code,status:503});
export async function refundTerminalMoonstone(db,{userId,requestId}={}) {
  const owner=toObjectId(userId),id=String(requestId || '').replace(/^yn-/,'');
  if(!owner||!/^[a-f0-9]{64}$/.test(id))return {refunded:false};
  const sourceId='service-exec-refund:exec:yeongnyangi:'+id;
  return db.transaction(async tx=>{
    const identity={_id:id,userId:owner,accessMethod:'MOONLIGHT_STONE'};
    const row=await tx.findOne(YeongnyangiRequest,identity);
    if(!row)return {refunded:false};
    const receiptFilter={userId:owner,type:'MONTHLY_CREDIT_GRANT',sourceId};
    if(row.state==='REFUNDED'&&row.errorCode==='MONTHLY_CREDIT_RESTORED') {
      const receipt=await tx.findOne(MonthlyCreditLedger,receiptFilter);
      if(!receipt)throw failure('MONTHLY_CREDIT_REFUND_EVIDENCE_PENDING');
      return {refunded:true,replayed:true,amount:receipt.amount,ledgerId:String(receipt._id)};
    }
    // A saved draft remains deliverable. A valid lease owns generation/recovery.
    const now=new Date();
    const reserved=await tx.findOneAndUpdate(YeongnyangiRequest,{...identity,
      state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',completedChapters:0,
      'chapters.0':{$exists:false},'generationCheckpoint.chapterDrafts.0':{$exists:false},
      $or:[{leaseUntil:null},{leaseUntil:{$exists:false}},{leaseUntil:{$lte:now}}]},
      {$set:{state:'REFUNDED',errorCode:'MONTHLY_CREDIT_RESTORED',leaseToken:'',leaseUntil:null}},
      {returnDocument:'after'});
    if(!reserved)return {refunded:false};
    const proof=await findMoonstoneSpendEvidence(null,{db:tx,userId:owner,featureKeys:[row.featureKey],
      tokens:[row.moonstoneLedgerId,'yn-'+id,id],
      minimumAmount:calculatePaidFeatureMembershipCreditCost(row.featureKey,Number(row.amountKRW)/100),
      claimRequestId:id,commitMarker:'refund:'+id});
    if(!proof)throw failure('PAYMENT_NOT_ACTIVE');
    // Never infer a fresh credit from a missing/expired lot: durable receipts win.
    if(await tx.findOne(MonthlyCreditLedger,receiptFilter))throw failure('MONTHLY_CREDIT_REFUND_EVIDENCE_PENDING');
    const restored=await restoreMonthlyCreditLot({db:tx,userId:owner,lotId:sourceId,amount:proof.amount,returnDetails:true});
    if(!restored?.added)throw failure('MONTHLY_CREDIT_REFUND_PENDING');
    const receipt=await tx.findOneAndUpdate(MonthlyCreditLedger,receiptFilter,{$setOnInsert:{
      ...receiptFilter,amount:proof.amount,beforeBalance:restored.beforeBalance,afterBalance:restored.afterBalance,
      serviceKey:row.featureKey,reason:'영냥이 상담 결과 미생성 월정석 복원',
      metadata:{requestId:'yn-'+id,originalLedgerId:proof.ledgerId,executionId:'yeongnyangi:'+id},
      createdAt:now,updatedAt:now,settledAt:now}},{upsert:true,returnDocument:'after'});
    if(!receipt?._id)throw failure('MONTHLY_CREDIT_REFUND_EVIDENCE_PENDING');
    const marked=await tx.findOneAndUpdate(MonthlyCreditLedger,{
      userId:owner,type:'MONTHLY_CREDIT_SPEND',sourceId:proof.sourceId,...moonstoneSpendRefundFilter()},
      {$set:{'metadata.refundedForServiceExecution':true,'metadata.refundedForUnlockFailure':true,
        'metadata.refundedAt':now,'metadata.refundExecutionId':'yeongnyangi:'+id,
        'metadata.refundLedgerId':String(receipt._id)}},{returnDocument:'after'});
    if(!marked)throw failure('MONTHLY_CREDIT_REFUND_EVIDENCE_PENDING');
    return {refunded:true,replayed:false,amount:proof.amount,ledgerId:String(receipt._id)};
  });
}
