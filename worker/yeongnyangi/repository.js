import { mongoose, mongoTransactionOptions, withMongoRetry } from '../lib/db.js';
import { Payment } from '../lib/models.js';
import { createHttpError } from '../lib/http.js';

import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
import { scopeConnection } from '../lib/db-scope-connection.js';
export { YeongnyangiRequest };

const paidStatuses = ['paid','success','fulfilled'];
export const AUTOMATIC_CHAPTER_ATTEMPTS = 3;
export const MANUAL_CHAPTER_RECOVERY_LIMIT = 2;
// Once a chapter spends its user grants, the server retries it once more, then
// holds the order and alerts operators. A hold from a spent budget can still be
// retried by its buyer twice. Every grant path is capped, so a chapter costs at most
// 3 automatic + 2 user + 2 system + 2x2 user-after-hold + 2x3 post-fix attempts (17).
export const SYSTEM_CHAPTER_RETRY_GRANT = 2;
export const USER_HOLD_RETRY_LIMIT = 2;
export const USER_HOLD_RETRY_GRANT = 2;
export const FIX_RESUME_GRANT = 3;
export const MAX_FIX_RESUMES = 2;
// Raise when a deployed generation fix should retry held orders once more.
// 2: chapter rejection floor relaxed to 70% of the target low (2026-09-27).
export const GENERATION_FIX_EPOCH = 2;
const FIX_RESUMABLE = ['MANUAL_RECOVERY_LIMIT_REACHED','ATTEMPT_LIMIT_REACHED','SYSTEM_RECOVERY_EXHAUSTED'];
// A rejected draft is not an outage: retry it almost at once. Provider and storage failures keep 30s, then 120s.
const QUALITY_RETRY_MS = 5000;
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

const grantCount=(grants,ordinal)=>Math.max(0,Number(grants?.[ordinal])||0);
const grantTotal=grants=>Object.values(grants || {}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);
// Pin a grant counter so a concurrent grant is never overwritten by a stale decision.
const pinGrant=(field,ordinal,value)=>value?{[`${field}.${ordinal}`]:value}
  :{$or:[{[`${field}.${ordinal}`]:{$exists:false}},{[`${field}.${ordinal}`]:0}]};
export const allowedChapterAttempts=(row,ordinal)=>AUTOMATIC_CHAPTER_ATTEMPTS
  +grantCount(row?.manualRecoveryGrants,ordinal)+grantCount(row?.systemRecoveryGrants,ordinal);

// Dotted fields: an existing hold keeps its resume count.
const holdSet=(reason,chapter,at)=>({'hold.reason':String(reason).slice(0,80),'hold.chapter':Number.isInteger(chapter)?chapter:null,
  'hold.epoch':GENERATION_FIX_EPOCH,'hold.alertPending':true,'hold.at':at});
// Rows held before hold metadata existed read their reason from the last review audit.
export function heldReason(row = {}) {
  if(row.hold?.reason)return row.hold.reason;
  return [...(row.recoveryAudit || [])].reverse().find(event=>event?.kind==='review_required')?.code || '';
}
// The hold will be retried by the next generation fix without anyone acting.
export function holdAutoResumes(row = {}) {
  const total=row.snapshot?.manifest?.length || 0;
  return total>(row.chapters?.length || 0)&&Number(row.hold?.resumes || 0)<MAX_FIX_RESUMES&&FIX_RESUMABLE.includes(heldReason(row));
}
export function canResumeAfterFix(row = {}) {
  return row.state==='FORTUNE_FAILED'&&row.errorCode==='GENERATION_REVIEW_REQUIRED'&&
    Number(row.hold?.epoch || 0)<GENERATION_FIX_EPOCH&&holdAutoResumes(row);
}
const savedChapters=row=>Array.isArray(row.chapters)?row.chapters.length:Number(row.completedChapters || 0);
// A family order held before its first chapter restores its pass instead, so it never gets a buyer hold retry.
// Access method and the saved count are pinned by the caller, so the decision holds at write time.
const holdRetryLeft=(row,ordinal)=>hasRequestAccess(row)&&!(requestAccessMethod(row)==='FAMILY'&&!ordinal)&&
  grantCount(row.hold?.userRetries,ordinal)<USER_HOLD_RETRY_LIMIT;
// A hold from a spent budget (never a deterministic rejection or the ask limit) that its buyer may still retry.
export function userCanRetryHold(row = {}) {
  const total=row.snapshot?.manifest?.length || 0,ordinal=savedChapters(row);
  return row.state==='FORTUNE_FAILED'&&row.errorCode==='GENERATION_REVIEW_REQUIRED'&&total>ordinal&&
    FIX_RESUMABLE.includes(heldReason(row))&&holdRetryLeft(row,ordinal);
}
// Whether the buyer's retry button can move the order. A stopped chapter escalates through a user grant,
// the system retry, then a user hold retry; a held chapter only while its user hold retries last.
export function userCanRetry(row = {}) {
  if(['COMPLETED','REFUNDED'].includes(row.state)||!hasRequestAccess(row))return false;
  if(row.errorCode!=='AUTOMATIC_RECOVERY_STOPPED')return userCanRetryHold(row);
  const ordinal=savedChapters(row);
  return grantCount(row.manualRecoveryGrants,ordinal)<MANUAL_CHAPTER_RECOVERY_LIMIT||!grantCount(row.systemRecoveryGrants,ordinal)||
    holdRetryLeft(row,ordinal);
}
const olderEpoch=()=>({$or:[{hold:{$exists:false}},{'hold.epoch':{$lt:GENERATION_FIX_EPOCH}}]});

async function loadFamilyIdentity() {
  const [models,entitlements]=await Promise.all([import('../lib/models.js'),import('../lib/entitlement-policy.js')]);
  return {...models,...entitlements};
}

async function loadFamilyLedger() {
  const [consumption,passes]=await Promise.all([import('../lib/pass-consumption.js'),import('../payments/passes.js')]);
  return {...consumption,...passes};
}

async function findFamilyEvidence(row, userId, session = null) {
  const [{PointHistory},{passUsageEvidenceId}]=await Promise.all([loadFamilyIdentity(),loadFamilyLedger()]);
  const evidenceId=row.passEvidenceId || passUsageEvidenceId(userId,row.featureKey,row._id);
  const query=PointHistory.findOne({_id:evidenceId,userId:ownerId(userId),featureKey:row.featureKey,
    'metadata.requestId':String(row._id),'metadata.accessMethod':'FAMILY','metadata.refundedForServiceExecution':{$ne:true}});
  if(session)query.session(session);
  return query.lean();
}

async function assertFamilyEvidence(env, row, userId, session = null) {
  const evidence=await findFamilyEvidence(row,userId,session);
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
      {$setOnInsert:{...values,...filter,state:'CREATED',chapters:[],completedChapters:0,attempts:0,chapterAttempts:{},manualRecoveryGrants:{},recoveryAudit:[]}}, {upsert:true,new:true,setDefaultsOnInsert:true}).lean());
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
    const session = await (scopeConnection() || mongoose).startSession();
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

async function reconcileAttemptLimit(env,userId,current) {
  const requestId=String(current._id),total=current.snapshot?.manifest?.length || 0;
  if(!['PAID','FORTUNE_FAILED','GENERATING'].includes(current.state)||!total||current.chapters.length>=total||
    ['AUTOMATIC_RECOVERY_STOPPED','GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'].includes(current.errorCode)||
    new Date(current.leaseUntil || 0).getTime()>Date.now()||new Date(current.nextAttemptAt || 0).getTime()>Date.now())return current;
  const ordinal=current.chapters.length;
  const chapterAttempts=Number(current.chapterAttempts?.[ordinal] || 0);
  const manualGrants=grantCount(current.manualRecoveryGrants,ordinal),systemGrants=grantCount(current.systemRecoveryGrants,ordinal);
  const totalGrants=grantTotal(current.manualRecoveryGrants)+grantTotal(current.systemRecoveryGrants);
  const exhausted=chapterAttempts>=allowedChapterAttempts(current,ordinal)?'AUTOMATIC_RECOVERY_STOPPED'
    :Number(current.attempts || 0)>=total*AUTOMATIC_CHAPTER_ATTEMPTS+totalGrants?'GENERATION_REVIEW_REQUIRED':'';
  if(exhausted){
    // A terminated Worker may never reach failChapter. Persist the exhausted
    // state so library recovery can grant a retry instead of showing an endless wait.
    const now=new Date();
    const stopped=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({
      _id:requestId,userId:ownerId(userId),state:{$in:['PAID','FORTUNE_FAILED','GENERATING']},
      chapters:{$size:ordinal},attempts:current.attempts,leaseToken:current.leaseToken,
      errorCode:{$nin:['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED','PAYMENT_NOT_ACTIVE']},
      $and:[pinGrant('manualRecoveryGrants',ordinal,manualGrants),pinGrant('systemRecoveryGrants',ordinal,systemGrants)],
      $or:[{leaseUntil:null},{leaseUntil:{$lte:now}}],
    },{$set:{state:'FORTUNE_FAILED',errorCode:exhausted,leaseToken:'',leaseUntil:null,nextAttemptAt:null,queuedUntil:null,
      ...(exhausted==='GENERATION_REVIEW_REQUIRED'?holdSet('ATTEMPT_LIMIT_REACHED',ordinal,now):{})},
      $push:{recoveryAudit:{kind:exhausted==='AUTOMATIC_RECOVERY_STOPPED'?'automatic_recovery_stopped':'review_required',source:'generation',chapter:ordinal,at:now,code:'ATTEMPT_LIMIT_REACHED'}}},{new:true}).lean());
    if(!stopped)return readRequest(env,userId,requestId);
    if(exhausted==='GENERATION_REVIEW_REQUIRED')await refundTerminalFamilyQuota(env,userId,requestId);
    return stopped;
  }
  return current;
}

export async function claimChapter(env, userId, requestId, source = 'queue') {
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
  if (['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED'].includes(current.errorCode)) throw failure(409,current.errorCode);
  if (new Date(current.nextAttemptAt || 0).getTime()>Date.now()) return {row:current,token:null};
  if (new Date(current.leaseUntil || 0).getTime()>Date.now()) return {row:current,token:null};
  const reconciled=await reconcileAttemptLimit(env,userId,current);
  if(['AUTOMATIC_RECOVERY_STOPPED','GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED'].includes(reconciled.errorCode))throw failure(409,reconciled.errorCode);
  if(reconciled!==current)return {row:reconciled,token:null};
  const ordinal=current.chapters.length;
  const chapterAttempts=Number(current.chapterAttempts?.[ordinal] || 0);
  const token=crypto.randomUUID(), now=new Date();
  const attemptKey=`chapterAttempts.${ordinal}`;
  const row = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate({
    _id:requestId,userId:ownerId(userId),state:{$in:['PAID','FORTUNE_FAILED','GENERATING']},
    chapters:{$size:current.chapters.length},
    errorCode:{$nin:['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED']},
    $and:[{$or:[{nextAttemptAt:null},{nextAttemptAt:{$lte:now}}]},
      {$or:[{[attemptKey]:{$exists:false}},{[attemptKey]:chapterAttempts}]}],
    $or:[{leaseUntil:null},{leaseUntil:{$lte:now}}],
  },{$set:{state:'GENERATING',leaseToken:token,leaseUntil:new Date(now.getTime()+180000),errorCode:''},
    $inc:{attempts:1,[`chapterAttempts.${ordinal}`]:1},
    $push:{recoveryAudit:{kind:'generation_claim',source:['queue','scheduled'].includes(source)?source:'queue',chapter:ordinal,at:now}}}, {new:true}).lean());
  return row ? {row,token} : {row:current,token:null};
}

// Own the same chapter lease; never replace an already durable analysis.
export async function saveAskAnalysis(env,userId,requestId,token,analysis) {
  const owner=ownerId(userId);
  await withMongoRetry(env,async()=>{
    const session=await (scopeConnection() || mongoose).startSession();
    try {
      await session.withTransaction(async()=>{
        const filter={_id:requestId,userId:owner,state:'GENERATING',leaseToken:token,
          'generationCheckpoint.version':'ask-generation-v1'};
        const current=await YeongnyangiRequest.findOne(filter).session(session).lean();
        if(!current||new Date(current.leaseUntil).getTime()<=Date.now())throw failure(409,'GENERATION_LEASE_LOST');
        const proof=requestAccessMethod(current)==='FAMILY'
          ? await findFamilyEvidence(current,userId,session)
          : await Payment.findOneAndUpdate({_id:current.paymentId,userId:owner,'metadata.consumedBy':requestId,
            status:{$in:paidStatuses},refundLock:null,'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true}},
            {$set:{'metadata.yeongnyangiAnalysisCommit':requestId}},{new:true,session}).lean();
        if(!proof)throw failure(409,'PAYMENT_NOT_ACTIVE');
        if(current.generationCheckpoint.analysis)return;
        const saved=await YeongnyangiRequest.findOneAndUpdate({...filter,'generationCheckpoint.analysis':{$exists:false}},
          {$set:{'generationCheckpoint.analysis':analysis}},{new:true,session}).lean();
        if(!saved)throw failure(409,'GENERATION_LEASE_LOST');
      },mongoTransactionOptions());
    } finally { await session.endSession(); }
  });
  const stored=await readRequest(env,userId,requestId);
  if(stored.state!=='GENERATING'||stored.leaseToken!==token||!stored.generationCheckpoint?.analysis)throw failure(409,'GENERATION_LEASE_LOST');
  return stored.generationCheckpoint.analysis;
}

async function completeStoredRequest(env, userId, requestId, total, token = '') {
  const owner=ownerId(userId);
  // The final stored result and its payment proof are checked in one transaction.
  // A refund cannot commit between the durable reread and the completion marker.
  const completed=await withMongoRetry(env,async()=>{
    const session=await (scopeConnection() || mongoose).startSession();
    try{
      let result=null;
      await session.withTransaction(async()=>{
        const filter={_id:requestId,userId:owner,...(token?{state:'GENERATING'}:{$or:[{state:{$in:['PAID','FORTUNE_FAILED']}},{state:'GENERATING',leaseUntil:{$lte:new Date()}}]}),completedChapters:total,
          [`chapters.${total-1}`]:{$exists:true},...(token?{leaseToken:token}:{})};
        const stored=await YeongnyangiRequest.findOne(filter).session(session).lean();
        if(!stored||!Array.isArray(stored.chapters)||stored.chapters.length!==total)return;
        const questions=stored.snapshot?.analysis?.consultation?.questions || [];
        if(questions.some(q=>!stored.chapters[stored.snapshot.manifest.findIndex(c=>c.id===q.chapterId)]?.questionAnswers?.some(a=>a.questionId===q.id&&[a.answer,a.reason,a.timing,a.action].every(s=>typeof s==='string'&&s.trim().length>=10)))){
          result=await YeongnyangiRequest.findOneAndUpdate(filter,{$set:{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',leaseToken:'',leaseUntil:null,
            ...holdSet('STORAGE_VERIFICATION',total-1,new Date())},$push:{recoveryAudit:{kind:'review_required',source:'storage_verification',chapter:total-1,at:new Date()}}},{new:true,session}).lean();
          return;
        }
        const accessMethod=requestAccessMethod(stored);
        const proof=accessMethod==='FAMILY'
          ? await findFamilyEvidence(stored,userId,session)
          : await Payment.findOneAndUpdate({_id:stored.paymentId,userId:owner,'metadata.consumedBy':requestId,
            status:{$in:paidStatuses},refundLock:null,'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true}},
          {$set:{'metadata.yeongnyangiCompletionCommit':requestId}},{new:true,session}).lean();
        if(!proof){
          const payment=accessMethod==='DIRECT_KRW'
            ? await Payment.findOne({_id:stored.paymentId,userId:owner}).session(session).lean()
            : null;
          const refunded=accessMethod==='FAMILY'||(payment&&['refunded','cancelled'].includes(payment.status));
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
    const session = await (scopeConnection() || mongoose).startSession();
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
          ? await findFamilyEvidence(request,userId,session)
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
            ...(isLast?{}:{state:'PAID',leaseToken:'',leaseUntil:null}),errorCode:'',lastFailure:null,nextAttemptAt:null}}, {new:true,session}).lean();
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

async function refundTerminalFamilyQuota(env,userId,requestId) {
  const owner=ownerId(userId);
  const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({_id:requestId,userId:owner,accessMethod:'FAMILY',
    state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',completedChapters:0}).lean(),readOptions);
  if(!row)return false;
  const [{PointHistory},{refundPassCoverage}]=await Promise.all([loadFamilyIdentity(),loadFamilyLedger()]);
  const refunded=await refundPassCoverage({userId,cycleKey:row.passCycleKey,cost:row.passCoinCost,refundId:`yeongnyangi:${requestId}`,
    restorePass:{tier:'family',expiresAt:row.passCycleKey,monthlyLimitCoin:row.passMonthlyLimitCoin,profileLimit:0,
      maxCoveredCoin:999999999,passPolicyVersion:row.passPolicyVersion}});
  if(!refunded.refunded)return false;
  return withMongoRetry(env,async()=>{
    const session=await (scopeConnection() || mongoose).startSession();
    try{
      let restored=false;
      await session.withTransaction(async()=>{
        const evidence=await PointHistory.findOneAndUpdate({_id:row.passEvidenceId,userId:owner,
          'metadata.refundedForServiceExecution':{$ne:true}},{$set:{'metadata.refundedForServiceExecution':true,'metadata.refundedAt':new Date()}},{new:true,session}).lean();
        if(!evidence)return;
        const request=await YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:owner,accessMethod:'FAMILY',
          state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',completedChapters:0},
        {$set:{state:'REFUNDED',errorCode:'PASS_QUOTA_RESTORED',leaseToken:'',leaseUntil:null}},{new:true,session}).lean();
        restored=Boolean(request);
      },mongoTransactionOptions());
      return restored;
    }finally{await session.endSession();}
  });
}

export async function failChapter(env, userId, requestId, token, code, attempt = 1, stage = '', allowedAttempts = AUTOMATIC_CHAPTER_ATTEMPTS, detail = '', ordinal = null) {
  const limited=code==='ASK_LIMITED_REVIEW_REQUIRED';
  const permanent=['GENERATION_REVIEW_REQUIRED','INVALID_MANIFEST'].includes(code);
  const stopped=attempt>=allowedAttempts&&!permanent&&!limited;
  const result=await withMongoRetry(env, () => YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),leaseToken:token,state:'GENERATING'},
    {$set:{state:'FORTUNE_FAILED',leaseToken:'',leaseUntil:null,errorCode:limited?'ASK_LIMITED_REVIEW_REQUIRED':permanent?'GENERATION_REVIEW_REQUIRED':stopped?'AUTOMATIC_RECOVERY_STOPPED':String(code).slice(0,80),lastFailure:{code:String(code).slice(0,80),stage,at:new Date()},nextAttemptAt:limited||permanent||stopped?null:new Date(Date.now()+(stage==='quality'?QUALITY_RETRY_MS:attempt===1?30000:120000)),
      ...(limited||permanent?holdSet(code,Number.isInteger(ordinal)?ordinal:null,new Date()):{})},
      $push:{recoveryAudit:{kind:limited||permanent?'review_required':stopped?'automatic_recovery_stopped':'retryable_failure',source:'generation',chapter:Number.isInteger(ordinal)?ordinal:null,at:new Date(),code:String(code).slice(0,80),...(detail?{detail:String(detail).slice(0,80)}:{})}}}));
  if(permanent)await refundTerminalFamilyQuota(env,userId,requestId);
  return result;
}

export async function resumeRequest(env,userId,requestId) {
  const row=await reconcileAttemptLimit(env,userId,await readRequest(env,userId,requestId));
  if(row.errorCode!=='AUTOMATIC_RECOVERY_STOPPED') return row;
  const ordinal=row.chapters.length,grantKey=`manualRecoveryGrants.${ordinal}`;
  const grants=grantCount(row.manualRecoveryGrants,ordinal),now=new Date();
  if(grants>=MANUAL_CHAPTER_RECOVERY_LIMIT){
    const latest=await escalateStoppedChapter(env,userId,requestId,row,'user','MANUAL_RECOVERY_LIMIT_REACHED');
    if(latest.errorCode==='GENERATION_REVIEW_REQUIRED')throw failure(409,'GENERATION_REVIEW_REQUIRED');
    return latest;
  }
  // The stopped-state predicate makes duplicate clicks one atomic grant. Attempts
  // are never reset, so the fixed provider-cost ceiling remains observable.
  const resumed=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),errorCode:'AUTOMATIC_RECOVERY_STOPPED',chapters:{$size:ordinal},...pinGrant('manualRecoveryGrants',ordinal,grants)},
    {$set:{state:'PAID',errorCode:'',nextAttemptAt:null,queuedUntil:null},$inc:{[grantKey]:1},$push:{recoveryAudit:{kind:'manual_retry_requested',source:'user',chapter:ordinal,at:now}}},{new:true}).lean());
  const latest=resumed || await readRequest(env,userId,requestId);
  if(latest.errorCode==='GENERATION_REVIEW_REQUIRED')throw failure(409,'GENERATION_REVIEW_REQUIRED');
  return latest;
}

// A spent stopped chapter gets the one server retry; after that the order is held
// (never dropped): saved chapters stay readable and operators are alerted.
async function escalateStoppedChapter(env,userId,requestId,row,source,reason) {
  const ordinal=row.chapters.length,now=new Date();
  const system=grantCount(row.systemRecoveryGrants,ordinal);
  const filter={_id:requestId,userId:ownerId(userId),errorCode:'AUTOMATIC_RECOVERY_STOPPED',chapters:{$size:ordinal},
    $and:[pinGrant('manualRecoveryGrants',ordinal,grantCount(row.manualRecoveryGrants,ordinal)),pinGrant('systemRecoveryGrants',ordinal,system)]};
  if(!system){
    const retried=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate(filter,{$set:{state:'PAID',errorCode:'',nextAttemptAt:null,queuedUntil:null},
      $inc:{[`systemRecoveryGrants.${ordinal}`]:SYSTEM_CHAPTER_RETRY_GRANT},$push:{recoveryAudit:{kind:'system_retry',source,chapter:ordinal,at:now}}},{new:true}).lean());
    return retried || readRequest(env,userId,requestId);
  }
  const held=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate(filter,{$set:{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',
    nextAttemptAt:null,queuedUntil:null,...holdSet(reason,ordinal,now)},$push:{recoveryAudit:{kind:'review_required',source,chapter:ordinal,at:now,code:reason}}},{new:true}).lean());
  if(!held)return readRequest(env,userId,requestId);
  await refundTerminalFamilyQuota(env,userId,requestId);
  return held;
}

// Cron: a stopped chapter nobody resumed. readRequest re-checks the payment first.
export async function escalateStopped(env,row) {
  const userId=String(row.userId),requestId=String(row._id);
  const current=await readRequest(env,userId,requestId);
  const total=current.snapshot?.manifest?.length || 0;
  if(current.state!=='FORTUNE_FAILED'||current.errorCode!=='AUTOMATIC_RECOVERY_STOPPED'||!total||current.chapters.length>=total)return current;
  return escalateStoppedChapter(env,userId,requestId,current,'scheduled','SYSTEM_RECOVERY_EXHAUSTED');
}

// Cron after a generation fix: resume a held order once per epoch with a fresh,
// capped budget. Saved chapters are untouched; the payment is re-checked first.
export async function resumeHeldAfterFix(env,row) {
  const userId=String(row.userId),requestId=String(row._id);
  const current=await readRequest(env,userId,requestId);
  if(!canResumeAfterFix(current))return null;
  const ordinal=current.chapters.length,reason=heldReason(current),now=new Date();
  return withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),state:'FORTUNE_FAILED',
    errorCode:'GENERATION_REVIEW_REQUIRED',chapters:{$size:ordinal},...olderEpoch()},
  {$set:{state:'PAID',errorCode:'',nextAttemptAt:null,queuedUntil:null,leaseToken:'',leaseUntil:null,'hold.reason':reason,'hold.chapter':ordinal,
    'hold.epoch':GENERATION_FIX_EPOCH,'hold.alertPending':false,'hold.resumedAt':now},
  $inc:{'hold.resumes':1,[`systemRecoveryGrants.${ordinal}`]:FIX_RESUME_GRANT},
  $push:{recoveryAudit:{kind:'system_resume_after_fix',source:'scheduled',chapter:ordinal,at:now,code:reason}}},{new:true}).lean());
}

// Buyer retry of a held chapter: USER_HOLD_RETRY_GRANT more attempts, USER_HOLD_RETRY_LIMIT times per chapter.
// The payment is re-checked first and the counter is pinned, so duplicate clicks grant once. Attempts are never
// reset (the request cap grows by the same grant) and hold.epoch is untouched, so a later fix still resumes it.
export async function resumeHeldByUser(env,userId,requestId) {
  const current=await readRequest(env,userId,requestId);
  if(!userCanRetryHold(current))return current;
  const ordinal=current.chapters.length,used=grantCount(current.hold?.userRetries,ordinal),reason=heldReason(current),now=new Date();
  const resumed=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),state:'FORTUNE_FAILED',
    errorCode:'GENERATION_REVIEW_REQUIRED',chapters:{$size:ordinal},...pinGrant('hold.userRetries',ordinal,used)},
  {$set:{state:'PAID',errorCode:'',nextAttemptAt:null,queuedUntil:null,leaseToken:'',leaseUntil:null,'hold.alertPending':false},
  $inc:{[`hold.userRetries.${ordinal}`]:1,[`systemRecoveryGrants.${ordinal}`]:USER_HOLD_RETRY_GRANT},
  $push:{recoveryAudit:{kind:'user_retry_after_hold',source:'user',chapter:ordinal,at:now,code:reason}}},{new:true}).lean());
  return resumed || readRequest(env,userId,requestId);
}

// A hold this epoch will not resume is stamped so it stops occupying the scan.
// A legacy hold was never reported, so stamping it also queues its first operator alert.
export function keepHold(env,row) {
  const firstAlert=row.hold?{}:{'hold.alertPending':true,'hold.at':new Date()};
  return withMongoRetry(env,()=>YeongnyangiRequest.updateOne({_id:row._id,errorCode:'GENERATION_REVIEW_REQUIRED',...olderEpoch()},
    {$set:{'hold.epoch':GENERATION_FIX_EPOCH,'hold.reason':heldReason(row) || 'UNKNOWN',...firstAlert}}));
}

// Only this hold's alert is cleared; a newer hold keeps its own pending alert.
export function markHoldAlerted(env,row,at=new Date()) {
  return withMongoRetry(env,()=>YeongnyangiRequest.updateOne({_id:row._id,'hold.alertPending':true,'hold.at':row.hold?.at},
    {$set:{'hold.alertPending':false,'hold.alertedAt':at}}));
}

export const heldForFixFilter=()=>({state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',...olderEpoch()});
export const pendingAlertFilter=()=>({'hold.alertPending':true,errorCode:{$in:['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED']}});
