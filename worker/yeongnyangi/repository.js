import { mongoose, mongoTransactionOptions, withMongoRetry } from '../lib/db.js';
import { Payment } from '../lib/models.js';
import { createHttpError } from '../lib/http.js';

import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
export { YeongnyangiRequest };

const paidStatuses = ['paid','success','fulfilled'];
export const AUTOMATIC_CHAPTER_ATTEMPTS = 3;
export const MANUAL_CHAPTER_RECOVERY_LIMIT = 2;
const failure = (status, code) => createHttpError(status, code, {code});
// Only pure reads opt into timeout recovery. A timed-out payment/storage write
// must retain its uncertainty rather than being blindly replayed.
const readOptions={retries:1,retryOnOperationTimeout:true,retryAdmissionOnOverload:true};

export function ownerId(id) {
  if (!/^[a-f0-9]{24}$/i.test(String(id))) throw failure(401,'UNAUTHORIZED');
  return new mongoose.Types.ObjectId(String(id));
}

export async function readRequest(env, userId, requestId) {
  const row = await withMongoRetry(env, () => YeongnyangiRequest.findOne({_id:requestId,userId:ownerId(userId)}).lean(),readOptions);
  if (!row) throw failure(404,'FORTUNE_NOT_FOUND');
  if (row.paymentId && row.state !== 'REFUNDED') {
    const payment = await withMongoRetry(env, () => Payment.findOne({_id:row.paymentId,userId:ownerId(userId)}).select('status metadata.consumedBy metadata.unlockRevoked metadata.yeongnyangiRefundPending refundLock').lean(),readOptions);
    const refunded = payment && ['refunded','cancelled'].includes(payment.status);
    if (refunded) {
      const patch={state:'REFUNDED',leaseToken:'',leaseUntil:null,errorCode:'PAYMENT_NOT_ACTIVE'};
      await withMongoRetry(env,()=>YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),paymentId:row.paymentId},{$set:patch}));
      return {...row,...patch};
    }
    if (!payment || !paidStatuses.includes(payment.status) || payment.refundLock || payment.metadata?.unlockRevoked || payment.metadata?.yeongnyangiRefundPending) {
      throw failure(409,'PAYMENT_NOT_ACTIVE');
    }
  }
  return row;
}

export async function createRequest(env, userId, id, values) {
  const filter = {_id:id,userId:ownerId(userId)};
  // Deterministic _id uses Mongo's built-in unique index, including before optional listing indexes exist.
  let row;
  try {
    row = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate(filter,
      {$setOnInsert:{...values,...filter,state:'CREATED',chapters:[],completedChapters:0,attempts:0,chapterAttempts:{},manualRecoveryGrants:{},recoveryAudit:[]}}, {upsert:true,new:true,setDefaultsOnInsert:true}).lean());
  } catch (error) {
    // A concurrent upsert won the built-in unique _id index. Return that same intent.
    if(Number(error?.code)!==11000) throw error;
    row=await readRequest(env,userId,id);
  }
  if (row.fingerprint !== values.fingerprint) throw failure(409,'IDEMPOTENCY_CONFLICT');
  return row;
}

export async function attachPayment(env, userId, requestId, expectedCharge) {
  const owner = ownerId(userId);
  // Register the whole atomic operation with the shared connection guard. Otherwise
  // another request can detach its connection while this session is still active.
  return withMongoRetry(env, async () => {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        const request = await YeongnyangiRequest.findOne({_id:requestId,userId:owner}).session(session).lean();
        if (!request) throw failure(404,'FORTUNE_NOT_FOUND');
        if (request.paymentId) { result=request; return; }
        const proof = await Payment.findOneAndUpdate({
          userId:owner,requestId:`yn-${requestId}`,featureKey:request.featureKey,paymentType:'digital_content',purchaseType:{$ne:'GIFT'},
          paymentAmount:expectedCharge,status:{$in:paidStatuses},
          $or:[{'metadata.consumedBy':{$exists:false}},{'metadata.consumedBy':null},{'metadata.consumedBy':''}],
        }, {$set:{'metadata.consumedBy':requestId,'metadata.consumedScope':'yeongnyangi-integrated','metadata.consumedAt':new Date()}},
        {new:true,session,sort:{createdAt:1}}).lean();
        if (!proof) throw failure(402,'PAYMENT_REQUIRED');
        result = await YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:owner,paymentId:null},
          {$set:{paymentId:proof._id,state:'PAID'}},{new:true,session}).lean();
        if (!result) throw failure(409,'PAYMENT_ATTACH_CONFLICT');
      }, mongoTransactionOptions());
      return result;
    } finally { await session.endSession(); }
  });
}

export async function claimChapter(env, userId, requestId, source = 'queue') {
  const current = await readRequest(env,userId,requestId);
  if (!current.paymentId) throw failure(402,'PAYMENT_REQUIRED');
  const proof = await withMongoRetry(env, () => Payment.findOne({_id:current.paymentId,userId:ownerId(userId),'metadata.consumedBy':requestId}).select('_id status metadata refundLock').lean());
  if (!proof || !paidStatuses.includes(proof.status) || proof.refundLock || proof.metadata?.unlockRevoked || proof.metadata?.yeongnyangiRefundPending) {
    if(proof && ['refunded','cancelled'].includes(proof.status)) await withMongoRetry(env,()=>YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),paymentId:current.paymentId},{$set:{state:'REFUNDED',leaseToken:'',leaseUntil:null}}));
    throw failure(409,'PAYMENT_NOT_ACTIVE');
  }
  if (current.state === 'COMPLETED') return {row:current,token:null};
  // A response can be lost after the last checkpoint is durable but before its
  // completion marker is committed. Re-read that stored result instead of
  // calling the provider for a non-existent next chapter.
  const total=current.snapshot?.manifest?.length || 0;
  if (total && current.chapters.length >= total) {
    const completed=await completeStoredRequest(env,userId,requestId,total);
    return {row:completed || current,token:null};
  }
  if (['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED'].includes(current.errorCode)) throw failure(409,current.errorCode);
  if (new Date(current.nextAttemptAt || 0).getTime()>Date.now()) return {row:current,token:null};
  const ordinal=current.chapters.length;
  const chapterAttempts=Number(current.chapterAttempts?.[ordinal] || 0);
  const manualGrants=Number(current.manualRecoveryGrants?.[ordinal] || 0);
  if(chapterAttempts>=AUTOMATIC_CHAPTER_ATTEMPTS+manualGrants)throw failure(409,'AUTOMATIC_RECOVERY_STOPPED');
  const totalGrants=Object.values(current.manualRecoveryGrants || {}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
  if(Number(current.attempts || 0)>=total*AUTOMATIC_CHAPTER_ATTEMPTS+totalGrants)throw failure(409,'GENERATION_REVIEW_REQUIRED');
  const token=crypto.randomUUID(), now=new Date();
  const attemptKey=`chapterAttempts.${ordinal}`;
  const row = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate({
    _id:requestId,userId:ownerId(userId),state:{$in:['PAID','FORTUNE_FAILED','GENERATING']},
    chapters:{$size:current.chapters.length},
    errorCode:{$nin:['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED']},
    $and:[{$or:[{nextAttemptAt:null},{nextAttemptAt:{$lte:now}}]},
      {$or:[{[attemptKey]:{$exists:false}},{[attemptKey]:chapterAttempts}]}],
    $or:[{leaseUntil:null},{leaseUntil:{$lte:now}}],
  },{$set:{state:'GENERATING',leaseToken:token,leaseUntil:new Date(now.getTime()+180000),errorCode:''},
    $inc:{attempts:1,[`chapterAttempts.${ordinal}`]:1},
    $push:{recoveryAudit:{kind:'generation_claim',source:['queue','scheduled'].includes(source)?source:'queue',chapter:ordinal,at:now}}}, {new:true}).lean());
  return row ? {row,token} : {row:current,token:null};
}

async function completeStoredRequest(env, userId, requestId, total, token = '') {
  const owner=ownerId(userId);
  // The final stored result and its payment proof are checked in one transaction.
  // A refund cannot commit between the durable reread and the completion marker.
  const completed=await withMongoRetry(env,async()=>{
    const session=await mongoose.startSession();
    try{
      let result=null;
      await session.withTransaction(async()=>{
        const filter={_id:requestId,userId:owner,...(token?{state:'GENERATING'}:{$or:[{state:{$in:['PAID','FORTUNE_FAILED']}},{state:'GENERATING',leaseUntil:{$lte:new Date()}}]}),completedChapters:total,
          [`chapters.${total-1}`]:{$exists:true},...(token?{leaseToken:token}:{})};
        const stored=await YeongnyangiRequest.findOne(filter).session(session).lean();
        if(!stored||!Array.isArray(stored.chapters)||stored.chapters.length!==total)return;
        const questions=stored.snapshot?.analysis?.consultation?.questions || [];
        if(questions.some(q=>!stored.chapters[stored.snapshot.manifest.findIndex(c=>c.id===q.chapterId)]?.questionAnswers?.some(a=>a.questionId===q.id&&[a.answer,a.reason,a.timing,a.action].every(s=>typeof s==='string'&&s.trim().length>=10)))){
          result=await YeongnyangiRequest.findOneAndUpdate(filter,{$set:{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',leaseToken:'',leaseUntil:null},$push:{recoveryAudit:{kind:'review_required',source:'storage_verification',chapter:total-1,at:new Date()}}},{new:true,session}).lean();
          return;
        }
        const proof=await Payment.findOneAndUpdate({_id:stored.paymentId,userId:owner,'metadata.consumedBy':requestId,
          status:{$in:paidStatuses},refundLock:null,'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true}},
        {$set:{'metadata.yeongnyangiCompletionCommit':requestId}},{new:true,session}).lean();
        if(!proof){
          const payment=await Payment.findOne({_id:stored.paymentId,userId:owner}).session(session).lean();
          const refunded=payment&&['refunded','cancelled'].includes(payment.status);
          result=await YeongnyangiRequest.findOneAndUpdate(filter,{$set:{state:refunded?'REFUNDED':'FORTUNE_FAILED',errorCode:'PAYMENT_NOT_ACTIVE',leaseToken:'',leaseUntil:null}},{new:true,session}).lean();
          return;
        }
        result=await YeongnyangiRequest.findOneAndUpdate(filter,{$set:{state:'COMPLETED',leaseToken:'',leaseUntil:null,completedAt:new Date(),errorCode:''},
          $push:{recoveryAudit:{kind:'completed_after_reread',source:'storage_verification',chapter:total-1,at:new Date()}}},{new:true,session}).lean();
      },mongoTransactionOptions());
      return result;
    }finally{await session.endSession();}
  });
  if(!completed||completed.state!=='COMPLETED')return completed;
  // Confirm the committed completion before returning it to the route/UI.
  const confirmed=await readRequest(env,userId,requestId);
  return confirmed.state==='COMPLETED'&&confirmed.chapters?.length===total?confirmed:null;
}

export async function finishChapter(env, userId, requestId, token, ordinal, body, total) {
  const result=await withMongoRetry(env, async () => {
    const session = await mongoose.startSession();
    try {
      let result = null;
      await session.withTransaction(async () => {
        const filter = {_id:requestId,userId:ownerId(userId),leaseToken:token,state:'GENERATING', [`chapters.${ordinal}`]:{$exists:false}};
        const request = await YeongnyangiRequest.findOne(filter).session(session).lean();
        if (!request) return;
        // Write the payment in the same transaction: a read alone allows a refund to
        // commit between validation and chapter storage (snapshot write skew).
        const proof = await Payment.findOneAndUpdate({
          _id:request.paymentId,userId:ownerId(userId),'metadata.consumedBy':requestId,
          status:{$in:paidStatuses},refundLock:null,'metadata.unlockRevoked':{$ne:true},
          'metadata.yeongnyangiRefundPending':{$ne:true},
        }, {$set:{'metadata.yeongnyangiChapterCommit':`${token}:${ordinal}`}}, {new:true,session}).lean();
        if (!proof) {
          const payment = await Payment.findOne({_id:request.paymentId,userId:ownerId(userId)}).session(session).lean();
          const refunded = payment && ['refunded','cancelled'].includes(payment.status);
          await YeongnyangiRequest.updateOne(filter, {$set:{state:refunded?'REFUNDED':'FORTUNE_FAILED',
            leaseToken:'',leaseUntil:null,errorCode:'PAYMENT_NOT_ACTIVE'}}, {session});
          return;
        }
        const isLast=ordinal+1===total;
        result = await YeongnyangiRequest.findOneAndUpdate(filter,
          {$push:{chapters:body},$set:{completedChapters:ordinal+1,
            // Keep the last chapter's lease until the saved document has been
            // read back. A late writer must not race the completion marker.
            ...(isLast?{}:{state:'PAID',leaseToken:'',leaseUntil:null}),errorCode:'',nextAttemptAt:null}}, {new:true,session}).lean();
      }, mongoTransactionOptions());
      return result;
    } finally { await session.endSession(); }
  });
  if (!result) return result;
  const stored=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({
    _id:requestId,userId:ownerId(userId),completedChapters:{$gte:ordinal+1},
    [`chapters.${ordinal}`]:{$exists:true},
  }).lean());
  if (!stored || JSON.stringify(stored.chapters[ordinal])!==JSON.stringify(body)) return null;
  if (ordinal+1!==total) return stored;
  return completeStoredRequest(env,userId,requestId,total,token);
}

export async function failChapter(env, userId, requestId, token, code, attempt = 1, stage = '', allowedAttempts = AUTOMATIC_CHAPTER_ATTEMPTS) {
  const permanent=['GENERATION_REVIEW_REQUIRED','INVALID_MANIFEST'].includes(code);
  const stopped=attempt>=allowedAttempts&&!permanent;
  return withMongoRetry(env, () => YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),leaseToken:token,state:'GENERATING'},
    {$set:{state:'FORTUNE_FAILED',leaseToken:'',leaseUntil:null,errorCode:permanent?'GENERATION_REVIEW_REQUIRED':stopped?'AUTOMATIC_RECOVERY_STOPPED':String(code).slice(0,80),lastFailure:{code:String(code).slice(0,80),stage,at:new Date()},nextAttemptAt:permanent||stopped?null:new Date(Date.now()+(attempt===1?30000:120000))},
      $push:{recoveryAudit:{kind:permanent?'review_required':stopped?'automatic_recovery_stopped':'retryable_failure',source:'generation',chapter:null,at:new Date(),code:String(code).slice(0,80)}}}));
}

export async function resumeRequest(env,userId,requestId) {
  const row=await readRequest(env,userId,requestId);
  if(row.errorCode!=='AUTOMATIC_RECOVERY_STOPPED') return row;
  const ordinal=row.chapters.length,grantKey=`manualRecoveryGrants.${ordinal}`;
  const grants=Number(row.manualRecoveryGrants?.[ordinal] || 0),now=new Date();
  if(grants>=MANUAL_CHAPTER_RECOVERY_LIMIT){
    const review=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),errorCode:'AUTOMATIC_RECOVERY_STOPPED',chapters:{$size:ordinal}},
      {$set:{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',nextAttemptAt:null,queuedUntil:null},$push:{recoveryAudit:{kind:'review_required',source:'user',chapter:ordinal,at:now,code:'MANUAL_RECOVERY_LIMIT_REACHED'}}},{new:true}).lean());
    if(review)throw failure(409,'GENERATION_REVIEW_REQUIRED');
    const latest=await readRequest(env,userId,requestId);
    if(latest.errorCode==='GENERATION_REVIEW_REQUIRED')throw failure(409,'GENERATION_REVIEW_REQUIRED');
    return latest;
  }
  // The stopped-state predicate makes duplicate clicks one atomic grant. Attempts
  // are never reset, so the fixed provider-cost ceiling remains observable.
  const missingGrant=grants===0?{$or:[{[grantKey]:{$exists:false}},{[grantKey]:0}]}:{[grantKey]:grants};
  const resumed=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),errorCode:'AUTOMATIC_RECOVERY_STOPPED',chapters:{$size:ordinal},...missingGrant},
    {$set:{state:'PAID',errorCode:'',nextAttemptAt:null,queuedUntil:null},$inc:{[grantKey]:1},$push:{recoveryAudit:{kind:'manual_retry_requested',source:'user',chapter:ordinal,at:now}}},{new:true}).lean());
  const latest=resumed || await readRequest(env,userId,requestId);
  if(latest.errorCode==='GENERATION_REVIEW_REQUIRED')throw failure(409,'GENERATION_REVIEW_REQUIRED');
  return latest;
}
