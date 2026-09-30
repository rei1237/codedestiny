import {withMongoRetry} from '../lib/db.js';
import {Payment,ProfileCard,PointHistory} from '../lib/models.js';
import {YeongnyangiRequest,ownerId,hasRequestAccess,findNonCashEvidence} from './repository.js';
import {inspectSajuCorrection,queueSajuCorrection,sajuCorrectionKey} from '../lib/saju-correction.js';
import {SAJU_ENGINE_VERSION} from '../../lib/korean-calendar/index.js';
const failure=code=>Object.assign(new Error(code),{code,status:409});
// Unlike the ordinary readRequest reconciliation path, dry-run must never write.
async function readOriginal(env,userId,requestId) {
 const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({_id:requestId,userId:ownerId(userId)}).lean());
 if(!row)throw failure('FORTUNE_NOT_FOUND');
 return row;
}
// Corrections live beside the immutable purchase snapshot. No payment mutation or new entitlement.
export function correctionStore(env) {
 const filter=(owner,id)=>({userId:ownerId(owner),[`generationCheckpoint.sajuCorrections.${id}.id`]:id});
 const path=id=>`generationCheckpoint.sajuCorrections.${id}`;
 const read=async(owner,id)=>{
  const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOne(filter(owner,id)).select('generationCheckpoint.sajuCorrections').lean());
  return row?.generationCheckpoint?.sajuCorrections?.[id]||null;
 };
 return {
  read,
  readPurchase:async(owner,id)=>{
   const row=await readOriginal(env,owner,id);
   if(!hasRequestAccess(row)||row.state==='REFUNDED')return {paid:false,refunded:true};
   if(row.paymentId){const payment=await withMongoRetry(env,()=>Payment.findOne({_id:row.paymentId,userId:ownerId(owner),'metadata.consumedBy':id,status:{$in:['paid','success','fulfilled']},refundLock:null,'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true}}).select('_id').lean());return {paid:!!payment,refunded:!payment};}
   const evidence=await withMongoRetry(env,()=>findNonCashEvidence(row,owner));
   return {paid:!!evidence,refunded:false};
  },
  insertOnce:async job=>{
   await withMongoRetry(env,()=>YeongnyangiRequest.updateOne({_id:job.orderId,userId:ownerId(job.ownerId),state:{$ne:'REFUNDED'},[path(job.id)]:{$exists:false}},{$set:{[path(job.id)]:job}}));
   return read(job.ownerId,job.id);
  },
  claim:async(owner,{maxAttempts})=>{
   const candidates=await withMongoRetry(env,()=>YeongnyangiRequest.find({userId:ownerId(owner),state:{$ne:'REFUNDED'},$expr:{$anyElementTrue:[{$map:{input:{$objectToArray:{$ifNull:['$generationCheckpoint.sajuCorrections',{}]}},as:'job',in:{$and:[{$eq:['$$job.v.status','queued']},{$lt:['$$job.v.attempts',maxAttempts]}]}}}]}}).select('generationCheckpoint.sajuCorrections').sort({_id:1}).limit(20).lean());
   for(const parent of candidates)for(const job of Object.values(parent.generationCheckpoint.sajuCorrections||{})){
    if(job.status!=='queued'||job.attempts>=maxAttempts)continue;
    const claimed=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({...filter(owner,job.id),[path(job.id)+'.status']:'queued',[path(job.id)+'.attempts']:job.attempts},{$set:{[path(job.id)+'.status']:'running'},$inc:{[path(job.id)+'.attempts']:1}},{new:true}).lean());
    if(claimed)return claimed.generationCheckpoint.sajuCorrections[job.id];
   }
   return null;
  },
  saveDraft:async(owner,id,draft)=>withMongoRetry(env,()=>YeongnyangiRequest.updateOne({...filter(owner,id),[path(id)+'.status']:'running'},{$set:{[path(id)+'.draft']:draft}})),
  complete:async(owner,id)=>{
   const result=await withMongoRetry(env,()=>YeongnyangiRequest.updateOne({...filter(owner,id),state:{$ne:'REFUNDED'},[path(id)+'.status']:'running',[path(id)+'.draft.complete']:true},{$set:{[path(id)+'.status']:'complete',[path(id)+'.completedAt']:new Date()}}));
   if(result.modifiedCount!==1)throw failure('CORRECTION_SAVE_UNCONFIRMED');
  },
  hold:async(owner,id,code)=>withMongoRetry(env,()=>YeongnyangiRequest.updateOne(filter(owner,id),{$set:{[path(id)+'.status']:'held',[path(id)+'.code']:code}})),
 };
}
export async function reviewSajuCorrection(env,userId,requestId,{enqueue=false}={}) {
 const row=await readOriginal(env,userId,requestId);
 const context=row.snapshot?.analysis?.contexts?.saju;
 if(!context)return {status:'not-applicable'};
 const store=correctionStore(env);
 const access=await store.readPurchase(userId,requestId);
 if(!access.paid||access.refunded)throw failure('CORRECTION_PURCHASE_REQUIRED');
 const id=await sajuCorrectionKey(userId,requestId),existing=await store.read(userId,id);
 if(existing)return {id,status:existing.status,comparison:existing.comparison,report:existing.status==='complete'?existing.draft?.report:undefined,requiresRepayment:false};
 let originalBirth=row.snapshot?.natalInput?.personA;
 // Only an unchanged, owner-scoped profile can stand in for a missing purchase input.
 if(!originalBirth&&row.snapshot?.profileUpdatedAt){
  const profile=await withMongoRetry(env,()=>ProfileCard.findOne({userId:ownerId(userId),profileId:row.profileId,updatedAt:new Date(row.snapshot.profileUpdatedAt)}).lean());
  if(profile){const b=profile.birth||{},p=profile.location||{},pad=n=>String(n).padStart(2,'0');originalBirth={birthDate:`${b.year}-${pad(b.month)}-${pad(b.day)}`,birthTime:b.timeUnknown?undefined:`${pad(b.hour)}:${pad(b.minute)}`,calendarType:b.calType||'solar',birthPlace:p.tz?{longitude:p.lng,latitude:p.lat,timezone:p.tz}:undefined};}
 }
 const input={ownerId:userId,orderId:requestId,originalBirth,pillars:context.facts.find(f=>f.label==='pillars')?.value,engineVersion:context.engineVersion};
 const comparison=inspectSajuCorrection(input);
 if(!enqueue||comparison.status!=='correction-required')return comparison;
 const queued=await queueSajuCorrection(store,input,{dryRun:false});
 return {id:queued.id,status:queued.status,comparison:queued.comparison,requiresRepayment:false,engineVersion:SAJU_ENGINE_VERSION};
}
