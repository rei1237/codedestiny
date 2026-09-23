import { mongoose, mongoTransactionOptions, withMongoRetry } from '../lib/db.js';
import { Payment } from '../lib/models.js';
import { createHttpError } from '../lib/http.js';

import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
export { YeongnyangiRequest };

const paidStatuses = ['paid','success','fulfilled'];
const failure = (status, code) => {
  const error=createHttpError(status, code, {code});
  error.code=code;
  return error;
};
// Only pure reads opt into timeout recovery. A timed-out payment/storage write
// must retain its uncertainty rather than being blindly replayed.
const readOptions={retries:1,retryOnOperationTimeout:true,retryAdmissionOnOverload:true};

export function requestAccessMethod(row = {}) {
  if (row.accessMethod === 'FAMILY' || row.passEvidenceId) return 'FAMILY';
  if (row.accessMethod === 'DIRECT_KRW' || row.paymentId) return 'DIRECT_KRW';
  return '';
}

export function hasRequestAccess(row = {}) { return Boolean(requestAccessMethod(row)); }

async function loadFamilyIdentity() {
  const [models,entitlements]=await Promise.all([import('../lib/models.js'),import('../lib/entitlement-policy.js')]);
  return {...models,...entitlements};
}

async function loadFamilyLedger() {
  const [consumption,passes]=await Promise.all([import('../lib/pass-consumption.js'),import('../payments/passes.js')]);
  return {...consumption,...passes};
}

async function assertFamilyEvidence(env, row, userId, session = null) {
  const [{PointHistory},{passUsageEvidenceId}]=await Promise.all([loadFamilyIdentity(),loadFamilyLedger()]);
  const evidenceId=row.passEvidenceId || passUsageEvidenceId(userId,row.featureKey,row._id);
  const query=PointHistory.findOne({_id:evidenceId,userId:ownerId(userId),featureKey:row.featureKey,
    'metadata.requestId':String(row._id),'metadata.accessMethod':'FAMILY','metadata.refundedForServiceExecution':{$ne:true}});
  if(session)query.session(session);
  const evidence=await query.lean();
  if(!evidence)throw failure(409,'PAYMENT_NOT_ACTIVE');
  return evidence;
}

export function ownerId(id) {
  if (!/^[a-f0-9]{24}$/i.test(String(id))) throw failure(401,'UNAUTHORIZED');
  return new mongoose.Types.ObjectId(String(id));
}

export async function readRequest(env, userId, requestId) {
  const row = await withMongoRetry(env, () => YeongnyangiRequest.findOne({_id:requestId,userId:ownerId(userId)}).lean(),readOptions);
  if (!row) throw failure(404,'FORTUNE_NOT_FOUND');
  if (requestAccessMethod(row)==='DIRECT_KRW' && row.state !== 'REFUNDED') {
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
  } else if (requestAccessMethod(row)==='FAMILY' && row.state !== 'REFUNDED') await assertFamilyEvidence(env,row,userId);
  return row;
}

export async function createRequest(env, userId, id, values) {
  const filter = {_id:id,userId:ownerId(userId)};
  // Deterministic _id uses Mongo's built-in unique index, including before optional listing indexes exist.
  let row;
  try {
    row = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate(filter,
      {$setOnInsert:{...values,...filter,state:'CREATED',chapters:[]}}, {upsert:true,new:true,setDefaultsOnInsert:true}).lean());
  } catch (error) {
    // A concurrent upsert won the built-in unique _id index. Return that same intent.
    if(Number(error?.code)!==11000) throw error;
    row=await readRequest(env,userId,id);
  }
  if (row.fingerprint !== values.fingerprint) throw failure(409,'IDEMPOTENCY_CONFLICT');
  return row;
}

async function attachDirectPayment(env, userId, requestId, expectedCharge) {
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
        if (hasRequestAccess(request)) { result=request; return; }
        const proof = await Payment.findOneAndUpdate({
          userId:owner,requestId:`yn-${requestId}`,featureKey:request.featureKey,paymentType:'digital_content',purchaseType:{$ne:'GIFT'},
          paymentAmount:expectedCharge,status:{$in:paidStatuses},
          $or:[{'metadata.consumedBy':{$exists:false}},{'metadata.consumedBy':null},{'metadata.consumedBy':''}],
        }, {$set:{'metadata.consumedBy':requestId,'metadata.consumedScope':'yeongnyangi-integrated','metadata.consumedAt':new Date()}},
        {new:true,session,sort:{createdAt:1}}).lean();
        if (!proof) throw failure(402,'PAYMENT_REQUIRED');
        result = await YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:owner,paymentId:null},
          {$set:{paymentId:proof._id,accessMethod:'DIRECT_KRW',state:'PAID'}},{new:true,session}).lean();
        if (!result) throw failure(409,'PAYMENT_ATTACH_CONFLICT');
      }, mongoTransactionOptions());
      return result;
    } finally { await session.endSession(); }
  });
}

export async function attachPayment(env, userId, requestId, expectedCharge, options = {}) {
  const current=await readRequest(env,userId,requestId);
  if(hasRequestAccess(current))return current;
  try{return await attachDirectPayment(env,userId,requestId,expectedCharge);}
  catch(error){if(error?.code!=='PAYMENT_REQUIRED'&&error?.payload?.code!=='PAYMENT_REQUIRED')throw error;}
  // 재가격 판정은 PG 테스트 청구가가 아니라 저장 당시/현재의 정상 판매가끼리 비교한다.
  // staging에서는 30,000원과 50,000원이 모두 1,000원으로 내려갈 수 있어 청구가 비교만으로는 낡은 요청이 열린다.
  const storedAmountKRW=Math.max(0,Math.floor(Number(current.amountKRW || expectedCharge)));
  const currentAmountKRW=Math.max(0,Math.floor(Number(options?.currentAmountKRW || storedAmountKRW)));
  if(currentAmountKRW!==storedAmountKRW)throw failure(409,'PRICE_CHANGED');
  const {User,resolveCanonicalEntitlement}=await loadFamilyIdentity();
  const user=await withMongoRetry(env,()=>User.findById(ownerId(userId)).lean(),readOptions);
  const entitlement=resolveCanonicalEntitlement(user || {});
  if(String(entitlement?.passTier || entitlement?.tier || '').toLowerCase()!=='family')throw failure(402,'FAMILY_OR_DIRECT_PAYMENT_REQUIRED');
  const {consumePassForFeature,passUsageEvidenceId}=await loadFamilyLedger();
  const coinCost=Math.max(0,Math.floor(currentAmountKRW/100));
  const consumed=await consumePassForFeature({user,entitlement,userId,featureKey:current.featureKey,requestId,coinCost});
  if(!consumed.covered)throw failure(402,consumed.reason==='monthly_pass_limit_exceeded'?'MONTHLY_PASS_LIMIT_EXCEEDED':'FAMILY_OR_DIRECT_PAYMENT_REQUIRED');
  const evidenceId=passUsageEvidenceId(userId,current.featureKey,requestId);
  const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),paymentId:null,
    $or:[{accessMethod:null},{accessMethod:{$exists:false}}]},{$set:{accessMethod:'FAMILY',passEvidenceId:evidenceId,
      passCycleKey:String(consumed.coverage?.cycleKey || ''),passCoinCost:coinCost,passTier:'family',
      passMonthlyLimitCoin:Number(consumed.coverage?.budgetCoin || 0),passPolicyVersion:String(user?.profileSubscription?.passPolicyVersion || ''),state:'PAID'}},{new:true}).lean());
  return row || readRequest(env,userId,requestId);
}

export async function claimChapter(env, userId, requestId) {
  const current = await readRequest(env,userId,requestId);
  const accessMethod=requestAccessMethod(current);
  if (!accessMethod) throw failure(402,'PAYMENT_REQUIRED');
  if(accessMethod==='FAMILY')await assertFamilyEvidence(env,current,userId);
  else {
    const proof = await withMongoRetry(env, () => Payment.findOne({_id:current.paymentId,userId:ownerId(userId),'metadata.consumedBy':requestId}).select('_id status metadata refundLock').lean());
    if (!proof || !paidStatuses.includes(proof.status) || proof.refundLock || proof.metadata?.unlockRevoked || proof.metadata?.yeongnyangiRefundPending) {
      if(proof && ['refunded','cancelled'].includes(proof.status)) await withMongoRetry(env,()=>YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),paymentId:current.paymentId},{$set:{state:'REFUNDED',leaseToken:'',leaseUntil:null}}));
      throw failure(409,'PAYMENT_NOT_ACTIVE');
    }
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
  const token=crypto.randomUUID(), now=new Date();
  const row = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate({
    _id:requestId,userId:ownerId(userId),state:{$in:['PAID','FORTUNE_FAILED','GENERATING']},
    chapters:{$size:current.chapters.length},
    errorCode:{$nin:['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED']},
    $and:[{$or:[{nextAttemptAt:null},{nextAttemptAt:{$lte:now}}]}],
    $or:[{leaseUntil:null},{leaseUntil:{$lte:now}}],
  },{$set:{state:'GENERATING',leaseToken:token,leaseUntil:new Date(now.getTime()+180000),errorCode:''},$inc:{attempts:1,[`chapterAttempts.${current.chapters.length}`]:1}}, {new:true}).lean());
  return row ? {row,token} : {row:current,token:null};
}

async function completeStoredRequest(env, userId, requestId, total, token = '') {
  const owner=ownerId(userId);
  // Completion is deliberately a second write: a durable checkpoint must be
  // read back and checked before it is exposed as a completed paid result.
  const stored=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({
    _id:requestId,userId:owner,state:{$in:['PAID','GENERATING','FORTUNE_FAILED']},completedChapters:total,
    [`chapters.${total-1}`]:{$exists:true},
  }).lean());
  if (!stored || !Array.isArray(stored.chapters) || stored.chapters.length !== total) return null;
  const questions=stored.snapshot?.analysis?.consultation?.questions || [];
  const filter={_id:requestId,userId:owner,...(token?{state:'GENERATING'}:{$or:[{state:{$in:['PAID','FORTUNE_FAILED']}},{state:'GENERATING',leaseUntil:{$lte:new Date()}}]}),completedChapters:total,
    [`chapters.${total-1}`]:{$exists:true},...(token?{leaseToken:token}:{})};
  if(questions.some(q=>!stored.chapters[stored.snapshot.manifest.findIndex(c=>c.id===q.chapterId)]?.questionAnswers?.some(a=>a.questionId===q.id && [a.answer,a.reason,a.timing,a.action].every(s=>typeof s==='string'&&s.trim().length>=10)))) {
    return withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate(filter,{$set:{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',leaseToken:'',leaseUntil:null}},{new:true}).lean());
  }
  return withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate(filter,
    {$set:{state:'COMPLETED',leaseToken:'',leaseUntil:null,completedAt:new Date(),errorCode:''}},{new:true}).lean());
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
        const accessMethod=requestAccessMethod(request);
        const proof=accessMethod==='FAMILY'
          ? await assertFamilyEvidence(env,request,userId,session)
          : await Payment.findOneAndUpdate({
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

export async function failChapter(env, userId, requestId, token, code, attempt = 1, stage = '') {
  const stopped=attempt>=3 && code!=='GENERATION_REVIEW_REQUIRED';
  const result=await withMongoRetry(env, () => YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),leaseToken:token,state:'GENERATING'},
    {$set:{state:'FORTUNE_FAILED',leaseToken:'',leaseUntil:null,errorCode:stopped?'AUTOMATIC_RECOVERY_STOPPED':String(code).slice(0,80),lastFailure:{code:String(code).slice(0,80),stage,at:new Date()},nextAttemptAt:stopped?null:new Date(Date.now()+(attempt===1?30000:120000))}}));
  if(stopped){
    const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({_id:requestId,userId:ownerId(userId),accessMethod:'FAMILY',completedChapters:0}).lean(),readOptions);
    if(row){
      const [{PointHistory},{refundPassCoverage}]=await Promise.all([loadFamilyIdentity(),loadFamilyLedger()]);
      const refunded=await refundPassCoverage({userId,cycleKey:row.passCycleKey,cost:row.passCoinCost,refundId:`yeongnyangi:${requestId}`,
        restorePass:{tier:'family',expiresAt:row.passCycleKey,monthlyLimitCoin:row.passMonthlyLimitCoin,profileLimit:0,
          maxCoveredCoin:999999999,passPolicyVersion:row.passPolicyVersion}});
      if(refunded.refunded){
        await withMongoRetry(env,()=>PointHistory.updateOne({_id:row.passEvidenceId},{$set:{'metadata.refundedForServiceExecution':true,'metadata.refundedAt':new Date()}}));
        await withMongoRetry(env,()=>YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),accessMethod:'FAMILY',completedChapters:0},{$set:{state:'REFUNDED',errorCode:'PASS_QUOTA_RESTORED'}}));
      }
    }
  }
  return result;
}

export async function resumeRequest(env,userId,requestId) {
  const row=await readRequest(env,userId,requestId);
  if(row.errorCode!=='AUTOMATIC_RECOVERY_STOPPED') return row;
  // Explicit user recovery never resets the lifetime call budget or charges again.
  if(row.attempts>=row.snapshot.manifest.length*3+(row.additionalAttempts || 0)) throw failure(409,'GENERATION_REVIEW_REQUIRED');
  const resumed=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),errorCode:'AUTOMATIC_RECOVERY_STOPPED'},
    {$set:{state:'PAID',errorCode:'',nextAttemptAt:null,queuedUntil:null,[`chapterAttempts.${row.chapters.length}`]:0}},{new:true}).lean());
  return resumed || readRequest(env,userId,requestId);
}
