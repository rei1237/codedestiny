// One integrated consultation reserves one funding method before any non-cash debit.
// The existing payment claim also excludes later PG fulfillment; it is not another balance.
import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
import { Payment } from '../lib/models.js';
import { getPaidFeaturePaymentPolicy } from '../lib/paid-feature-registry.js';
import { toObjectId } from '../payments/db.js';
import { paymentError } from '../payments/errors.js';

export async function reserveFortuneFunding(db,{userId,requestId,featureKey,coinCost,method}) {
  if(!String(featureKey).startsWith('yeongnyangi-'))return null;
  if(!/^yn-[a-f0-9]{64}$/.test(String(requestId)) || getPaidFeaturePaymentPolicy(featureKey).monthlyExcluded)
    throw paymentError('INVALID_REQUEST','영냥이 방에서 상담 내용을 먼저 선택해 주세요.');
  const id=requestId.slice(3),owner=toObjectId(userId),key='alliance:'+method+':'+requestId;
  const current=await db.findOne(YeongnyangiRequest,{_id:id,userId:owner});
  if(!current||current.featureKey!==featureKey||Number(current.amountKRW)!==Number(coinCost)*100)
    throw paymentError('INVALID_REQUEST','상담 주문과 상품을 확인하지 못했어요.');
  const currentMethod=current.accessMethod==='FAMILY'?'PASS':current.accessMethod;
  if(current.state==='REFUNDED'||(currentMethod&&currentMethod!==method))
    throw paymentError('FORTUNE_ALREADY_PAID','이미 결제한 상담이에요. 결과 화면에서 확인해 주세요.',{fortuneRequestId:id});
  if(currentMethod===method)return {id,userId:owner,key,method,settled:true};
  const paid=await db.findOne(Payment,{userId:owner,requestId,status:{$in:['paid','success','fulfilled']}});
  if(paid)throw paymentError('FORTUNE_ALREADY_PAID','이미 결제한 상담이에요. 결과 화면에서 확인해 주세요.',{fortuneRequestId:id});
  // A pending/unknown PG window can still approve. Only the authoritative
  // reconciliation path's confirmed terminal result permits another method.
  const unresolved=await db.findOne(Payment,{userId:owner,requestId,paymentType:'digital_content',
    $nor:[{status:'failed',failureStage:'pg-retry-check',failureCode:{$in:['PG_PAYMENT_FAILED','PG_PAYMENT_CANCELLED']}}]});
  if(unresolved)throw paymentError('PG_PAYMENT_NOT_PAID','이전 단건 결제의 상태를 먼저 확인해 주세요. 결제 실패나 취소가 확인되면 다른 방식으로 이용할 수 있어요.',
    {fortuneRequestId:id,orderId:String(unresolved.merchantUid||'')});
  const claimed=await db.findOneAndUpdate(YeongnyangiRequest,{_id:id,userId:owner,state:'CREATED',paymentId:null,
    $and:[
      {$or:[{accessMethod:null},{accessMethod:''},{accessMethod:{$exists:false}}]},
      {$or:[{paymentClaimOrderId:key},{paymentClaimOrderId:''},{paymentClaimOrderId:null},{paymentClaimOrderId:{$exists:false}}]},
    ]},{$set:{paymentClaimOrderId:key}},{returnDocument:'after'});
  if(!claimed)throw paymentError('MOONSTONE_IN_PROGRESS','이 상담의 결제를 확인 중이에요. 같은 결제 방식으로 잠시 후 다시 확인해 주세요.');
  return {id,userId:owner,key,method,settled:false};
}

export async function releaseFortuneFunding(db,claim) {
  if(!claim||claim.settled)return;
  await db.updateOne(YeongnyangiRequest,{_id:claim.id,userId:claim.userId,state:'CREATED',paymentId:null,paymentClaimOrderId:claim.key},
    {$set:{paymentClaimOrderId:''}});
}

export async function completeFortuneFunding(db,claim,proof) {
  if(!claim||claim.settled)return;
  if(claim.method==='PASS'&&proof.tier!=='family')throw paymentError('FAMILY_OR_DIRECT_PAYMENT_REQUIRED','Family 이용권을 확인해 주세요.');
  const accessMethod=claim.method==='PASS'?'FAMILY':'MOONLIGHT_STONE';
  const fields=claim.method==='PASS'?{
    passEvidenceId:proof.evidenceId,passCycleKey:String(proof.cycleKey||''),passCoinCost:Number(proof.debit||0),
    passTier:String(proof.tier||''),passMonthlyLimitCoin:Number(proof.budgetCoin||0),
    passProfileLimit:Number(proof.profileLimit||0),passMaxCoveredCoin:Number(proof.maxCoveredCoin||0),passPolicyVersion:String(proof.policyVersion||''),
  }:{moonstoneLedgerId:toObjectId(proof.ledgerId)};
  const row=await db.findOneAndUpdate(YeongnyangiRequest,{_id:claim.id,userId:claim.userId,state:'CREATED',paymentId:null,paymentClaimOrderId:claim.key},
    {$set:{...fields,accessMethod,state:'PAID'}},{returnDocument:'after'});
  if(row)return;
  const replay=await db.findOne(YeongnyangiRequest,{_id:claim.id,userId:claim.userId,paymentClaimOrderId:claim.key,accessMethod});
  if(!replay)throw paymentError('MOONSTONE_IN_PROGRESS','결제 증빙을 저장 중이에요. 다시 결제하지 말고 같은 상담에서 확인해 주세요.');
}
