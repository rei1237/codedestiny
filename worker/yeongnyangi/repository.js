import {CHAPTER_DELIVERY_VERSION,CHAPTER_LEASE_MS,chapterDeliveryFailure,hasChapterDeliveryContract} from './chapter-delivery-contract.js';
import { storedChapterDraft } from './stored-chapter.js';
import { deliveryRefundPending, terminalRestoreFilter } from './terminal-refund-policy.js';
import { mongoose, mongoTransactionOptions, withMongoRetry } from '../lib/db.js';
import { Payment } from '../lib/models.js';
import { createHttpError } from '../lib/http.js';

import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
import { scopeConnection } from '../lib/db-scope-connection.js';
import { CHAT_FEATURE_KEY, chatCardClaim, chatPaymentRequestId } from './access-methods.js';
export { YeongnyangiRequest };

const paidStatuses = ['paid','success','fulfilled'];
// One first call and one immediate retry. Versioned requests may receive one
// scheduled repair and two explicit recovery calls; legacy grants stay inert.
export const AUTOMATIC_CHAPTER_ATTEMPTS = 2;
export const MANUAL_CHAPTER_RECOVERY_LIMIT = 2;
export const SYSTEM_CHAPTER_RETRY_GRANT = 1;
export const USER_HOLD_RETRY_LIMIT = 1;
export const USER_HOLD_RETRY_GRANT = 1;
export const FIX_RESUME_GRANT = 0;
export const MAX_FIX_RESUMES = 0;
// Raise when a deployed generation fix should retry held orders once more.
// 2: chapter rejection floor relaxed to 70% of the target low (2026-09-27).
export const GENERATION_FIX_EPOCH = 2;
const FIX_RESUMABLE = ['MANUAL_RECOVERY_LIMIT_REACHED','ATTEMPT_LIMIT_REACHED','SYSTEM_RECOVERY_EXHAUSTED'];
// A rejected draft is not an outage: retry it almost at once. Provider and storage failures keep 30s, then 120s.
const QUALITY_RETRY_MS = 5000;
const failure = (status, code, payload = {}) => {
  const error=createHttpError(status, code, {...payload,code});
  error.code=code;
  return error;
};
// Only pure reads opt into timeout recovery. A timed-out payment/storage write
// must retain its uncertainty rather than being blindly replayed.
const readOptions={retries:1,retryOnOperationTimeout:true,retryAdmissionOnOverload:true};

export function requestAccessMethod(row = {}) {
  if (row.accessMethod === 'PER_USE') return 'PER_USE';
  if (row.accessMethod === 'ACCOUNT_FREE_TRIAL') return 'ACCOUNT_FREE_TRIAL';
  if (row.accessMethod === 'SERVICE_PACK' || row.packEntitlementId) return 'SERVICE_PACK';
  if (row.accessMethod === 'MOONLIGHT_STONE' || row.moonstoneLedgerId) return 'MOONLIGHT_STONE';
  if (row.accessMethod === 'FAMILY' || row.passEvidenceId) return 'FAMILY';
  if (row.accessMethod === 'DIRECT_KRW' || row.paymentId) return 'DIRECT_KRW';
  return '';
}

export function hasRequestAccess(row = {}) { return Boolean(requestAccessMethod(row)); }

const grantCount=(grants,ordinal)=>Math.max(0,Number(grants?.[ordinal])||0);
// Pin a grant counter so a concurrent grant is never overwritten by a stale decision.
const pinGrant=(field,ordinal,value)=>value?{[`${field}.${ordinal}`]:value}
  :{$or:[{[`${field}.${ordinal}`]:{$exists:false}},{[`${field}.${ordinal}`]:0}]};
export const allowedChapterAttempts=(row,ordinal)=>AUTOMATIC_CHAPTER_ATTEMPTS+(hasChapterDeliveryContract(row)
  ?Math.min(MANUAL_CHAPTER_RECOVERY_LIMIT,grantCount(row.manualRecoveryGrants,ordinal))+Math.min(SYSTEM_CHAPTER_RETRY_GRANT,grantCount(row.systemRecoveryGrants,ordinal)):0);
const allowedOrderAttempts=row=>(row.snapshot?.manifest || []).reduce((sum,_chapter,i)=>sum+allowedChapterAttempts(row,i),0);

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
const holdRetryLeft=(row,ordinal)=>hasChapterDeliveryContract(row)&&grantCount(row.manualRecoveryGrants,ordinal)<MANUAL_CHAPTER_RECOVERY_LIMIT&&hasRequestAccess(row)&&!(requestAccessMethod(row)!=='DIRECT_KRW'&&!ordinal)&&
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
  if(deliveryRefundPending(row))return false;
  if(!hasChapterDeliveryContract(row)&&Number(row.chapterAttempts?.[savedChapters(row)] || 0)>=AUTOMATIC_CHAPTER_ATTEMPTS)return false;
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

export async function findNonCashEvidence(row, userId, session = null, commitMarker = '') {
  const id=String(row._id);
  if(requestAccessMethod(row)==='PER_USE') {
    const {findPerUseEvidence}=await import('./per-use-access.js');
    return findPerUseEvidence(row,ownerId(userId),session,commitMarker);
  }
  // No commit marker: the free use only comes back through restoreFreeTrial, which rewrites this request in the
  // same transaction, so a claim racing it conflicts on the request document instead.
  if(requestAccessMethod(row)==='ACCOUNT_FREE_TRIAL') {
    const {findGuardianFortuneFreeTrial}=await import('../lib/guardian-fortune-usage.js');
    return findGuardianFortuneFreeTrial({userId:ownerId(userId),requestId:chatPaymentRequestId(id),session});
  }
  if(requestAccessMethod(row)==='SERVICE_PACK') {
    const {findYeongnyangiServicePackEvidence}=await loadFamilyLedger();
    return findYeongnyangiServicePackEvidence({row,userId,session,commitMarker});
  }
  if(requestAccessMethod(row)==='MOONLIGHT_STONE') {
    const {findMoonstoneSpendEvidence}=await import('../lib/moonstone-spend-proof.js');
    const {calculatePaidFeatureMembershipCreditCost}=await import('../lib/paid-feature-registry.js');
    return findMoonstoneSpendEvidence(null,{userId,featureKeys:[row.featureKey],
      tokens:[row.moonstoneLedgerId, 'yn-'+id, id],session,
      minimumAmount:calculatePaidFeatureMembershipCreditCost(row.featureKey,Number(row.amountKRW)/100),
      ...(commitMarker?{claimRequestId:id,commitMarker}:{})});
  }
  const [{PointHistory},{passUsageEvidenceId}]=await Promise.all([loadFamilyIdentity(),loadFamilyLedger()]);
  const ids=row.passEvidenceId?[row.passEvidenceId]:[passUsageEvidenceId(userId,row.featureKey,'yn-'+id),passUsageEvidenceId(userId,row.featureKey,id)];
  const filter={_id:{$in:ids},userId:ownerId(userId),featureKey:row.featureKey,
    'metadata.requestId':{$in:[id,'yn-'+id]},'metadata.accessMethod':{$in:['FAMILY']},
    'metadata.refundedForServiceExecution':{$ne:true}};
  const query=commitMarker?PointHistory.findOneAndUpdate(filter,{$set:{'metadata.yeongnyangiCommit':commitMarker}},{new:true,session})
    :PointHistory.findOne(filter);
  if(session)query.session(session);
  return query.lean();
}

async function assertFamilyEvidence(env, row, userId, session = null) {
  const evidence=await findNonCashEvidence(row,userId,session);
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
  if(deliveryRefundPending(row))return row;
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
  } else if (requestAccessMethod(row) && requestAccessMethod(row)!=='DIRECT_KRW' && row.state !== 'REFUNDED') await assertFamilyEvidence(env,row,userId);
  return row;
}

// AWAITING_DRAW is the only other initial state: a tarot order whose buyer has not picked cards yet.
// Every funding path requires CREATED, so such a request cannot be paid before the draw is committed.
const initialStates = new Set(['CREATED','AWAITING_DRAW']);
export async function createRequest(env, userId, id, values, options = {}) {
  const initialState = options.initialState || 'CREATED';
  if (!initialStates.has(initialState)) throw failure(500,'INVALID_INITIAL_STATE');
  const filter = {_id:id,userId:ownerId(userId)};
  // Deterministic _id uses Mongo's built-in unique index, including before optional listing indexes exist.
  let row;
  try {
    row = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate(filter,
      {$setOnInsert:{...values,...filter,state:initialState,chapters:[],completedChapters:0,attempts:0,chapterAttempts:{},manualRecoveryGrants:{},recoveryAudit:[]}}, {upsert:true,new:true,setDefaultsOnInsert:true}).lean());
  } catch (error) {
    // A concurrent upsert won the built-in unique _id index. Return that same intent.
    if(Number(error?.code)!==11000) throw error;
    row=await readRequest(env,userId,id);
  }
  if (row.fingerprint !== values.fingerprint) throw failure(409,'IDEMPOTENCY_CONFLICT');
  return row;
}

// The buyer's tarot pick is committed once: AWAITING_DRAW -> CREATED with the drawn context.
// A concurrent or repeated call returns the row that already holds the draw, so cards never change.
export async function commitTarotDraw(env,userId,requestId,{context,draw}) {
  const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),state:'AWAITING_DRAW','snapshot.tarotDraw':{$exists:false}},
    {$set:{state:'CREATED','snapshot.analysis.contexts.tarot':context,'snapshot.tarotDraw':draw}}, {new:true}).lean());
  if(row)return row;
  const latest=await readRequest(env,userId,requestId);
  if(latest.snapshot?.tarotDraw)return latest;
  throw failure(409,'TAROT_DRAW_NOT_AVAILABLE');
}

// The first question-sky result is an intentional pause, not a failed or
// incomplete delivery. This compare-and-set both protects the one included
// deepening turn and preserves the exact submitted text for retries.
export async function reserveQuestionSkyFollowup(env,userId,requestId,question) {
  const text=typeof question==='string'?question.trim():'';
  if(text.length<5||text.length>600||text.split(/\n+|(?<=[?？])\s*/u).filter(Boolean).length!==1)throw failure(400,'FOLLOWUP_INPUT_INVALID');
  const current=await readRequest(env,userId,requestId);
  if(current.snapshot?.questionSkyStage?.version!=='question-sky-flounder-3')throw failure(409,'FOLLOWUP_NOT_AVAILABLE');
  const saved=current.generationCheckpoint?.followup;
  if(saved?.question){
    if(saved.question===text)return current;
    throw failure(409,'FOLLOWUP_ALREADY_USED');
  }
  const now=new Date();
  const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),state:'AWAITING_FOLLOWUP',
    'generationCheckpoint.followup.status':'available','generationCheckpoint.followup.used':{$ne:true}},
    {$set:{state:'PAID',errorCode:'',nextAttemptAt:null,queuedUntil:null,queuedChapter:-1,
      'generationCheckpoint.followup':{status:'submitted',used:true,question:text,submittedAt:now}}}, {new:true}).lean());
  if(row)return row;
  const latest=await readRequest(env,userId,requestId);
  if(latest.generationCheckpoint?.followup?.question===text)return latest;
  throw failure(409,latest.generationCheckpoint?.followup?.used?'FOLLOWUP_ALREADY_USED':'FOLLOWUP_NOT_AVAILABLE');
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
          status:{$in:paidStatuses},
          $and:[{$or:[{paymentAmount:expectedCharge},{
            'pricingSnapshot.moonstoneDiscount.listPriceKRW':expectedCharge,
            'metadata.moonstoneDiscountReserved':true,
            'metadata.moonstoneDiscountReleasedAt':{$exists:false},
            $expr:{$eq:[{$add:['$paymentAmount','$pricingSnapshot.moonstoneDiscount.discountKRW']},expectedCharge]},
          }]}],
          ...(request.paymentClaimOrderId?{merchantUid:request.paymentClaimOrderId}:{}),
          'metadata.duplicatePaymentReviewRequired':{$ne:true},
          $or:[{'metadata.consumedBy':{$exists:false}},{'metadata.consumedBy':null},{'metadata.consumedBy':''}],
        }, {$set:{'metadata.consumedBy':requestId,'metadata.consumedScope':'yeongnyangi-integrated','metadata.consumedAt':new Date()}},
        {new:true,session,sort:{createdAt:1}}).lean();
        if (!proof) throw failure(402,'PAYMENT_REQUIRED');
        result = await YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:owner,paymentId:null},
          {$set:{paymentId:proof._id,paymentClaimOrderId:proof.merchantUid,accessMethod:'DIRECT_KRW',state:'PAID'}},{new:true,session}).lean();
        if (!result) throw failure(409,'PAYMENT_ATTACH_CONFLICT');
      }, mongoTransactionOptions());
      return result;
    } finally { await session.endSession(); }
  });
}

// 재가격 판정은 PG 테스트 청구가가 아니라 저장 당시/현재의 정상 판매가끼리 비교한다.
// staging에서는 30,000원과 50,000원이 모두 1,000원으로 내려갈 수 있어 청구가 비교만으로는 낡은 요청이 열린다.
function assertCurrentPrice(current, expectedCharge, options) {
  const storedAmountKRW=Math.max(0,Math.floor(Number(current.amountKRW || expectedCharge)));
  const currentAmountKRW=Math.max(0,Math.floor(Number(options?.currentAmountKRW || storedAmountKRW)));
  if(currentAmountKRW!==storedAmountKRW)throw failure(409,'PRICE_CHANGED');
  return currentAmountKRW;
}

const unattachedChat=(requestId,userId)=>({_id:requestId,userId:ownerId(userId),featureKey:CHAT_FEATURE_KEY,paymentId:null,
  $or:[{accessMethod:null},{accessMethod:{$exists:false}}]});

// Fortune-chat consultations never take a Yeongnyangi payment, moonlight-stone or Family path: only the
// per-use proof the fortune-chat route already accepts, pinned to the request (per-use-access.js), or the
// account's one free consultation shared with the legacy fortune-chat route (guardian-fortune-usage.js).
async function attachChatAccess(env, userId, requestId, current, expectedCharge, options) {
  const currentAmountKRW=assertCurrentPrice(current,expectedCharge,options);
  const {proveChatAccess}=await import('./per-use-access.js');
  let proven;
  try{
    proven=await proveChatAccess(env,{row:current,userId:String(userId),owner:ownerId(userId),
      coinPrice:Math.floor(currentAmountKRW/100),choice:String(options?.access || '')});
  }catch(error){if(error?.code==='ACCESS_ALREADY_ATTACHED')return readRequest(env,userId,requestId);throw error;}
  const {accessMethod,consumeTrial,...access}=proven;
  if(accessMethod==='ACCOUNT_FREE_TRIAL')return attachFreeTrial(env,userId,requestId,consumeTrial);
  const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate(unattachedChat(requestId,userId),
    {$set:{accessMethod:'PER_USE',...access,state:'PAID'}},{new:true}).lean());
  return row || readRequest(env,userId,requestId);
}

// The free use and the request change together: a request that already gained other access aborts the spend.
async function attachFreeTrial(env, userId, requestId, consume) {
  const usage=await import('../lib/guardian-fortune-usage.js');
  const owner=ownerId(userId),trial={userId:owner,requestId:chatPaymentRequestId(requestId)};
  if(consume)await usage.createMongoGuardianFortuneStore({env}).ensureDaily(String(userId),'',new Date());
  const attached=await withMongoRetry(env,async()=>{
    const session=await (scopeConnection() || mongoose).startSession();
    try{
      let row=null;
      await session.withTransaction(async()=>{
        row=null;
        const spent=(consume?await usage.consumeGuardianFortuneFreeTrial({...trial,session}):null)
          || await usage.findGuardianFortuneFreeTrial({...trial,session});
        if(!spent)throw failure(402,'FREE_TRIAL_USED',{paidFeatureKey:CHAT_FEATURE_KEY,paymentRequestId:trial.requestId});
        // A card window reserved after the open-checkout read still wins: the spend rolls back with this write.
        const card=chatCardClaim(requestId);
        row=await YeongnyangiRequest.findOneAndUpdate({...unattachedChat(requestId,userId),paymentClaimOrderId:{$ne:card}},
          {$set:{accessMethod:'ACCOUNT_FREE_TRIAL',state:'PAID'}},{new:true,session}).lean();
        if(!row&&await YeongnyangiRequest.findOne({...unattachedChat(requestId,userId),paymentClaimOrderId:card}).session(session).lean())
          throw failure(409,'PG_PAYMENT_NOT_PAID',{paidFeatureKey:CHAT_FEATURE_KEY,paymentRequestId:trial.requestId});
        if(!row)throw failure(409,'ACCESS_ALREADY_ATTACHED');
      },mongoTransactionOptions());
      return row;
    }catch(error){if(error?.code==='ACCESS_ALREADY_ATTACHED')return null;throw error;}
    finally{await session.endSession();}
  });
  return attached || readRequest(env,userId,requestId);
}

// A free consultation that delivered nothing gives the account's free use back, exactly once.
async function restoreFreeTrial(env,userId,requestId,terminal=false) {
  const {restoreGuardianFortuneFreeTrial}=await import('../lib/guardian-fortune-usage.js');
  return withMongoRetry(env,async()=>{
    const session=await (scopeConnection() || mongoose).startSession();
    try{
      let restored=false;
      await session.withTransaction(async()=>{
        restored=false;
        const request=await YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),accessMethod:'ACCOUNT_FREE_TRIAL',
          state:'FORTUNE_FAILED',...terminalRestoreFilter(terminal)},
        {$set:{state:'REFUNDED',errorCode:'FREE_TRIAL_RESTORED',leaseToken:'',leaseUntil:null}},{new:true,session}).lean();
        if(!request)return;
        if(!await restoreGuardianFortuneFreeTrial({userId:ownerId(userId),requestId:chatPaymentRequestId(requestId),session}))
          throw failure(409,'FREE_TRIAL_NOT_RESTORED');
        restored=true;
      },mongoTransactionOptions());
      return restored;
    }catch(error){if(error?.code==='FREE_TRIAL_NOT_RESTORED')return false;throw error;}
    finally{await session.endSession();}
  });
}

export async function attachPayment(env, userId, requestId, expectedCharge, options = {}) {
  const current=await readRequest(env,userId,requestId);
  if(hasRequestAccess(current))return current;
  // No funding path may run before the buyer's cards are committed: Family/월정석 would otherwise consume first.
  if(current.state==='AWAITING_DRAW')throw failure(409,'TAROT_DRAW_REQUIRED');
  if(current.featureKey===CHAT_FEATURE_KEY)return attachChatAccess(env,userId,requestId,current,expectedCharge,options);
  try{return await attachDirectPayment(env,userId,requestId,expectedCharge);}
  catch(error){if(error?.code!=='PAYMENT_REQUIRED'&&error?.payload?.code!=='PAYMENT_REQUIRED')throw error;}
  const currentAmountKRW=assertCurrentPrice(current,expectedCharge,options);
  const {findMoonstoneSpendEvidence}=await import('../lib/moonstone-spend-proof.js');
  const {calculatePaidFeatureMembershipCreditCost}=await import('../lib/paid-feature-registry.js');
  const coinCost=Math.max(0,Math.floor(currentAmountKRW/100));
  const monthlyInput={userId,featureKeys:[current.featureKey],tokens:['yn-'+requestId,requestId],
    minimumAmount:calculatePaidFeatureMembershipCreditCost(current.featureKey,coinCost)};
  const monthly=await withMongoRetry(env,()=>findMoonstoneSpendEvidence(env,monthlyInput),readOptions);
  if(monthly) {
    const attached=await withMongoRetry(env,async()=>{
    const session=await (scopeConnection() || mongoose).startSession();
    try {
      let attached;
      await session.withTransaction(async()=>{
        const proof=await findMoonstoneSpendEvidence(env,{...monthlyInput,session,claimRequestId:requestId,commitMarker:'attach:'+requestId});
        if(!proof)throw failure(409,'PAYMENT_NOT_ACTIVE');
        attached=await YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),paymentId:null,
          $or:[{accessMethod:null},{accessMethod:{$exists:false}}]},
          {$set:{accessMethod:'MOONLIGHT_STONE',moonstoneLedgerId:proof.ledgerId,state:'PAID'}},{new:true,session}).lean();
      },mongoTransactionOptions());
      return attached;
    }finally{await session.endSession();}
    });
    return attached || readRequest(env,userId,requestId);
  }
  // Shared checkout yn-id and historical bare id belong to this one consultation.
  // Durable proof precedes new consumption so response loss or pass expiry cannot charge twice.
  let evidence=await withMongoRetry(env,()=>findNonCashEvidence(current,userId),readOptions);
  const {User,resolveCanonicalEntitlement}=await loadFamilyIdentity();
  const user=await withMongoRetry(env,()=>User.findById(ownerId(userId)).lean(),readOptions);
  const entitlement=resolveCanonicalEntitlement(user || {});
  let consumed=null;
  if(!evidence) {
    if(String(entitlement?.passTier || entitlement?.tier || '').toLowerCase()!=='family')throw failure(402,'FAMILY_OR_DIRECT_PAYMENT_REQUIRED');
    const {consumePassForFeature}=await loadFamilyLedger();
    consumed=await consumePassForFeature({user,entitlement,userId,featureKey:current.featureKey,requestId:'yn-'+requestId,coinCost});
    if(!consumed.covered)throw failure(402,consumed.reason==='monthly_pass_limit_exceeded'?'MONTHLY_PASS_LIMIT_EXCEEDED':'PAYMENT_REQUIRED');
    evidence=await withMongoRetry(env,()=>findNonCashEvidence(current,userId),readOptions);
    if(!evidence)throw failure(503,'PAYMENT_EVIDENCE_PENDING');
  }
  const meta=evidence.metadata || {},coverage=consumed?.coverage || {};
  const tier=String(meta.passTier || coverage.tier || entitlement.passTier || entitlement.tier || 'family');
  const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),paymentId:null,
    $or:[{accessMethod:null},{accessMethod:{$exists:false}}]},{$set:{accessMethod:'FAMILY',passEvidenceId:evidence._id,
      passCycleKey:String(meta.passCycleKey || coverage.cycleKey || ''),passCoinCost:Number(meta.passBudgetCost ?? meta.coinCost ?? coverage.passBudgetCost ?? coinCost),passTier:tier,
      passMonthlyLimitCoin:Number(meta.passBudgetCoin ?? coverage.budgetCoin ?? 0),
      passProfileLimit:Number(meta.passProfileLimit ?? user?.profileSubscription?.profileLimit ?? 0),
      passMaxCoveredCoin:Number(meta.passLimit ?? coverage.perItemLimit ?? 0),
      passPolicyVersion:String(meta.passPolicyVersion || user?.profileSubscription?.passPolicyVersion || ''),state:'PAID'}},{new:true}).lean());
  return row || readRequest(env,userId,requestId);
}

async function reconcileAttemptLimit(env,userId,current) {
  if(deliveryRefundPending(current))return current;
  const requestId=String(current._id),total=current.snapshot?.manifest?.length || 0;
  if(!['PAID','FORTUNE_FAILED','GENERATING'].includes(current.state)||!total||current.chapters.length>=total||
    ['AUTOMATIC_RECOVERY_STOPPED','GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE'].includes(current.errorCode)||
    new Date(current.leaseUntil || 0).getTime()>Date.now()||new Date(current.nextAttemptAt || 0).getTime()>Date.now())return current;
  const ordinal=current.chapters.length;
  if(storedChapterDraft(current))return current;
  const chapterAttempts=Number(current.chapterAttempts?.[ordinal] || 0);
  const manualGrants=grantCount(current.manualRecoveryGrants,ordinal),systemGrants=grantCount(current.systemRecoveryGrants,ordinal);
  const exhausted=chapterAttempts>=allowedChapterAttempts(current,ordinal)?'AUTOMATIC_RECOVERY_STOPPED'
    :Number(current.attempts || 0)>=allowedOrderAttempts(current)?'GENERATION_REVIEW_REQUIRED':'';
  if(exhausted){
    // A terminated Worker may never reach failChapter. Persist the exhausted
    // state so library recovery can grant a retry instead of showing an endless wait.
    const now=new Date();
    const stopped=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({
      _id:requestId,userId:ownerId(userId),state:{$in:['PAID','FORTUNE_FAILED','GENERATING']},
      'generationCheckpoint.deliveryRefund.status':{$ne:'pending'},
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

export async function claimChapter(env, userId, requestId, source = 'queue', options = {}) {
  const current = await readRequest(env,userId,requestId);
  if(deliveryRefundPending(current))throw failure(409,'DELIVERY_REFUND_PENDING');
  const accessMethod=requestAccessMethod(current);
  if (!accessMethod) throw failure(402,'PAYMENT_REQUIRED');
  if(accessMethod!=='DIRECT_KRW')await assertFamilyEvidence(env,current,userId);
  else {
    const proof = await withMongoRetry(env, () => Payment.findOne({_id:current.paymentId,userId:ownerId(userId),'metadata.consumedBy':requestId}).select('_id status metadata refundLock').lean());
    if (!proof || !paidStatuses.includes(proof.status) || proof.refundLock || proof.metadata?.unlockRevoked || proof.metadata?.yeongnyangiRefundPending) {
      if(proof && ['refunded','cancelled'].includes(proof.status)) await withMongoRetry(env,()=>YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),paymentId:current.paymentId},{$set:{state:'REFUNDED',leaseToken:'',leaseUntil:null}}));
      throw failure(409,'PAYMENT_NOT_ACTIVE');
    }
  }
  if (current.state === 'COMPLETED' || current.state === 'AWAITING_FOLLOWUP') return {row:current,token:null};
  // A response can be lost after the last checkpoint is durable but before its
  // completion marker is committed. Re-read that stored result instead of
  // calling the provider for a non-existent next chapter.
  const total=current.snapshot?.manifest?.length || 0;
  if (total && current.chapters.length >= total) {
    const completed=await completeStoredRequest(env,userId,requestId,total);
    return {row:completed || current,token:null};
  }
  if (options.storedOnly && !storedChapterDraft(current)) throw failure(503,'LLM_NOT_CONFIGURED');
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
  const claim = session => YeongnyangiRequest.findOneAndUpdate({
    _id:requestId,userId:ownerId(userId),state:{$in:['PAID','FORTUNE_FAILED','GENERATING']},
    'generationCheckpoint.deliveryRefund.status':{$ne:'pending'},
    chapters:{$size:current.chapters.length},
    ...(options.storedOnly?{[`generationCheckpoint.chapterDrafts.${ordinal}.body`]:{$exists:true,$ne:null}}:{}),
    errorCode:{$nin:['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED']},
    $and:[{$or:[{nextAttemptAt:null},{nextAttemptAt:{$lte:now}}]},
      {$or:[{[attemptKey]:{$exists:false}},{[attemptKey]:chapterAttempts}]}],
    $or:[{leaseUntil:null},{leaseUntil:{$lte:now}}],
  },{$set:{state:'GENERATING',leaseToken:token,leaseUntil:new Date(now.getTime()+CHAPTER_LEASE_MS),errorCode:''},
    ...(!options.storedOnly&&!storedChapterDraft(current)?{$inc:{attempts:1,[`chapterAttempts.${ordinal}`]:1}}:{}),
    $push:{recoveryAudit:{kind:'generation_claim',source:['queue','scheduled'].includes(source)?source:'queue',chapter:ordinal,at:now}}}, {new:true,...(session?{session}:{})}).lean();
  const row=await withMongoRetry(env,async()=>{
    if(accessMethod!=='SERVICE_PACK')return claim();
    const session=await (scopeConnection() || mongoose).startSession();
    try {
      let claimed=null;
      await session.withTransaction(async()=>{
        const proof=await findNonCashEvidence(current,userId,session,'claim:'+token);
        if(!proof)throw failure(409,'PAYMENT_NOT_ACTIVE');
        claimed=await claim(session);
      },mongoTransactionOptions());
      return claimed;
    } finally { await session.endSession(); }
  });
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
        const proof=requestAccessMethod(current)!=='DIRECT_KRW'
          ? await findNonCashEvidence(current,userId,session,'analysis:'+requestId)
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
        const filter={_id:requestId,userId:owner,'generationCheckpoint.deliveryRefund.status':{$ne:'pending'},...(token?{state:'GENERATING'}:{$or:[{state:{$in:['PAID','FORTUNE_FAILED']}},{state:'GENERATING',leaseUntil:{$lte:new Date()}}]}),completedChapters:total,
          [`chapters.${total-1}`]:{$exists:true},...(token?{leaseToken:token}:{})};
        const stored=await YeongnyangiRequest.findOne(filter).session(session).lean();
        if(!stored||!Array.isArray(stored.chapters)||stored.chapters.length!==total)return;
        const invalid=stored.snapshot.manifest.some((chapter,i)=>
          (stored.snapshot.deliveryContract===CHAPTER_DELIVERY_VERSION||stored.chapters[i]?.deliveryVersion===CHAPTER_DELIVERY_VERSION)&&chapterDeliveryFailure(stored.chapters[i],chapter));
        const questions=stored.snapshot?.analysis?.consultation?.questions || [];
        if(invalid||questions.some(q=>!stored.chapters[stored.snapshot.manifest.findIndex(c=>c.id===q.chapterId)]?.questionAnswers?.some(a=>a.questionId===q.id&&typeof a.answer==='string'&&a.answer.trim().length>=10))){
          result=await YeongnyangiRequest.findOneAndUpdate(filter,{$set:{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',leaseToken:'',leaseUntil:null,
            ...holdSet('STORAGE_VERIFICATION',total-1,new Date())},$push:{recoveryAudit:{kind:'review_required',source:'storage_verification',chapter:total-1,at:new Date()}}},{new:true,session}).lean();
          return;
        }
        const accessMethod=requestAccessMethod(stored);
        const proof=accessMethod!=='DIRECT_KRW'
          ? await findNonCashEvidence(stored,userId,session,'complete:'+requestId)
          : await Payment.findOneAndUpdate({_id:stored.paymentId,userId:owner,'metadata.consumedBy':requestId,
            status:{$in:paidStatuses},refundLock:null,'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true}},
          {$set:{'metadata.yeongnyangiCompletionCommit':requestId}},{new:true,session}).lean();
        if(!proof){
          const payment=accessMethod==='DIRECT_KRW'
            ? await Payment.findOne({_id:stored.paymentId,userId:owner}).session(session).lean()
            : null;
          const refunded=accessMethod!=='DIRECT_KRW'||(payment&&['refunded','cancelled'].includes(payment.status));
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

// A durable local edit separates generation from result storage. Replaying the
// same owner/lease-scoped checkpoint is idempotent and does not spend LLM budget.
export async function saveChapterDraft(env,userId,requestId,token,ordinal,draft) {
  const field=`generationCheckpoint.chapterDrafts.${ordinal}`;
  const filter={_id:requestId,userId:ownerId(userId),state:'GENERATING',leaseToken:token};
  await withMongoRetry(env,()=>YeongnyangiRequest.updateOne(filter,{$set:{[field]:draft}}),{retries:0});
  const stored=await readRequest(env,userId,requestId);
  if(JSON.stringify(stored.generationCheckpoint?.chapterDrafts?.[ordinal])!==JSON.stringify(draft))throw failure(503,'RESULT_STORAGE_UNAVAILABLE');
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
        if(request.snapshot?.deliveryContract===CHAPTER_DELIVERY_VERSION||body?.deliveryVersion===CHAPTER_DELIVERY_VERSION){
          const code=chapterDeliveryFailure(body,request.snapshot.manifest[ordinal]);
          if(code)throw failure(409,code);
        }
        // Write the payment in the same transaction: a read alone allows a refund to
        // commit between validation and chapter storage (snapshot write skew).
        const accessMethod=requestAccessMethod(request);
        const proof=accessMethod!=='DIRECT_KRW'
          ? await findNonCashEvidence(request,userId,session,'chapter:'+token+':'+ordinal)
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
        const awaitingFollowup=request.snapshot?.questionSkyStage?.version==='question-sky-flounder-3'&&ordinal===0&&total===2;
        result = await YeongnyangiRequest.findOneAndUpdate(filter,
          {$push:{chapters:body},$set:{...(ordinal===0?{firstContentAt:new Date()}:{}),completedChapters:ordinal+1,
            // Keep the last chapter's lease until the saved document has been
            // read back. A late writer must not race the completion marker.
            ...(isLast?{}:awaitingFollowup?{state:'AWAITING_FOLLOWUP',leaseToken:'',leaseUntil:null,
              'generationCheckpoint.followup':{status:'available',used:false,suggestions:Array.isArray(body.followUpSuggestions)?body.followUpSuggestions:[]}}:{state:'PAID',leaseToken:'',leaseUntil:null}),errorCode:'',lastFailure:null,nextAttemptAt:null,queuedUntil:null}}, {new:true,session}).lean();
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
  const trial=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({_id:requestId,userId:owner,accessMethod:'ACCOUNT_FREE_TRIAL',
    state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',completedChapters:0}).lean(),readOptions);
  if(trial)return restoreFreeTrial(env,userId,requestId);
  const pack=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({_id:requestId,userId:owner,accessMethod:'SERVICE_PACK',
    $or:[{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',completedChapters:0},
      {state:'REFUNDED',errorCode:'SERVICE_PACK_USE_RESTORED'}]}).lean(),readOptions);
  if(pack) {
    const {refundYeongnyangiServicePack}=await loadFamilyLedger();
    const result=await withMongoRetry(env,()=>refundYeongnyangiServicePack({userId,requestId}));
    return Boolean(result.restored);
  }
  const monthly=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({_id:requestId,userId:owner,accessMethod:'MOONLIGHT_STONE',
    $or:[{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',completedChapters:0},
      {state:'REFUNDED',errorCode:'MONTHLY_CREDIT_RESTORED'}]}).lean(),readOptions);
  if(monthly) {
    const {refundYeongnyangiMoonstone}=await import('../lib/pass-consumption.js');
    const refunded=await withMongoRetry(env,()=>refundYeongnyangiMoonstone({userId,requestId}));
    return Boolean(refunded.refunded);
  }
  // A paid fortune-chat consultation gives back only what the server can restore without cash: pass quota and
  // moonlight stones. Card and coin spends stay with support review, as the Yeongnyangi card path does.
  const perUse=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({_id:requestId,userId:owner,accessMethod:'PER_USE',
    $or:[{state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',completedChapters:0},
      {state:'REFUNDED',errorCode:'MONTHLY_CREDIT_RESTORED'}]}).lean(),readOptions);
  if(perUse?.perUseSource==='ledger') {
    const {refundYeongnyangiMoonstone}=await import('../lib/pass-consumption.js');
    const refunded=await withMongoRetry(env,()=>refundYeongnyangiMoonstone({userId,requestId,perUse:true}));
    return Boolean(refunded.refunded);
  }
  if(perUse?.perUseSource==='point'&&perUse.perUsePassRefund?.cycleKey&&perUse.state==='FORTUNE_FAILED') {
    return restorePassQuota(env,userId,requestId,{accessMethod:'PER_USE',perUseSource:'point'},{cycleKey:perUse.perUsePassRefund.cycleKey,
      cost:perUse.perUsePassRefund.cost,evidenceId:perUse.perUseEvidenceId});
  }
  if(perUse)return false;
  const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({_id:requestId,userId:owner,accessMethod:{$in:['FAMILY']},
    state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED',completedChapters:0}).lean(),readOptions);
  if(!row)return false;
  return restorePassQuota(env,userId,requestId,{accessMethod:{$in:['FAMILY']}},{cycleKey:row.passCycleKey,cost:row.passCoinCost,evidenceId:row.passEvidenceId,
    restorePass:{tier:row.passTier || 'family',expiresAt:row.passCycleKey,monthlyLimitCoin:row.passMonthlyLimitCoin,profileLimit:row.passProfileLimit || 0,
      maxCoveredCoin:row.passMaxCoveredCoin || (row.passTier==='family'||!row.passTier?999999999:0),passPolicyVersion:row.passPolicyVersion}});
}

// Partial delivery refunds require a durable terminal reservation first. That
// reservation blocks every generation/retry before the existing receipt restores.
export async function refundReservedDelivery(env,userId,requestId) {
  const row=await withMongoRetry(env,()=>YeongnyangiRequest.findOne({_id:requestId,userId:ownerId(userId),
    state:'FORTUNE_FAILED',...terminalRestoreFilter(true)}).lean(),readOptions);
  if(!row)return false;
  const method=requestAccessMethod(row);
  if(method==='MOONLIGHT_STONE') {
    const {refundYeongnyangiMoonstone}=await loadFamilyLedger();
    return Boolean((await refundYeongnyangiMoonstone({userId,requestId,terminal:true})).refunded);
  }
  if(method==='SERVICE_PACK') {
    const {refundYeongnyangiServicePack}=await loadFamilyLedger();
    return Boolean((await refundYeongnyangiServicePack({userId,requestId,terminal:true})).restored);
  }
  if(method==='FAMILY')return restorePassQuota(env,userId,requestId,{accessMethod:'FAMILY'},
    {cycleKey:row.passCycleKey,cost:row.passCoinCost,evidenceId:row.passEvidenceId,terminal:true,
      restorePass:{tier:row.passTier || 'family',expiresAt:row.passCycleKey,monthlyLimitCoin:row.passMonthlyLimitCoin,
        profileLimit:row.passProfileLimit || 0,maxCoveredCoin:row.passMaxCoveredCoin || 999999999,passPolicyVersion:row.passPolicyVersion}});
  if(method==='ACCOUNT_FREE_TRIAL')return restoreFreeTrial(env,userId,requestId,true);
  return false;
}

// Request, usage proof, quota and refund receipt commit in the same transaction.
async function restorePassQuota(env,userId,requestId,access,{cycleKey,cost,evidenceId,restorePass=null,terminal=false}) {
  const owner=ownerId(userId);
  const [{PointHistory},{refundPassCoverage,consultationRefundDb}]=await Promise.all([loadFamilyIdentity(),loadFamilyLedger()]);
  return withMongoRetry(env,async()=>{
    const session=await (scopeConnection() || mongoose).startSession();
    try{
      let restored=false;
      await session.withTransaction(async()=>{
        const request=await YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:owner,...access,
          state:'FORTUNE_FAILED',...terminalRestoreFilter(terminal)},
        {$set:{state:'REFUNDED',errorCode:'PASS_QUOTA_RESTORED',leaseToken:'',leaseUntil:null}},{new:true,session}).lean();
        if(!request)return;
        const evidence=await PointHistory.findOneAndUpdate({_id:evidenceId,userId:owner,
          'metadata.refundedForServiceExecution':{$ne:true}},{$set:{'metadata.refundedForServiceExecution':true,'metadata.refundedAt':new Date()}},{new:true,session}).lean();
        if(!evidence)throw failure(503,'PASS_REFUND_EVIDENCE_PENDING');
        const tx=consultationRefundDb(session);
        const refunded=await refundPassCoverage({userId,cycleKey,cost,refundId:`yeongnyangi:${requestId}`,restorePass,
          db:{...tx,transaction:run=>run(tx)}});
        if(!refunded.refunded)throw failure(503,'PASS_QUOTA_RESTORE_PENDING');
        restored=true;
      },mongoTransactionOptions());
      return restored;
    }finally{await session.endSession();}
  });
}

/** @param {Record<string, unknown> | null} [receipt] Provider metadata only; never text or input. */
export async function failChapter(env, userId, requestId, token, code, attempt = 1, stage = '', allowedAttempts = AUTOMATIC_CHAPTER_ATTEMPTS, detail = '', ordinal = null, receipt = null) {
  const limited=code==='ASK_LIMITED_REVIEW_REQUIRED';
  const permanent=['GENERATION_REVIEW_REQUIRED','INVALID_MANIFEST'].includes(code);
  const stopped=attempt>=allowedAttempts&&!permanent&&!limited;
  const result=await withMongoRetry(env, () => YeongnyangiRequest.updateOne({_id:requestId,userId:ownerId(userId),leaseToken:token,state:'GENERATING'},
    {$set:{state:'FORTUNE_FAILED',leaseToken:'',leaseUntil:null,errorCode:limited?'ASK_LIMITED_REVIEW_REQUIRED':permanent?'GENERATION_REVIEW_REQUIRED':stopped?'AUTOMATIC_RECOVERY_STOPPED':String(code).slice(0,80),lastFailure:{code:String(code).slice(0,80),stage,at:new Date()},nextAttemptAt:limited||permanent||stopped?null:new Date(Date.now()+(stage==='quality'?QUALITY_RETRY_MS:attempt===1?30000:120000)),
      ...(limited||permanent?holdSet(code,Number.isInteger(ordinal)?ordinal:null,new Date()):{})},
      $push:{recoveryAudit:{kind:limited||permanent?'review_required':stopped?'automatic_recovery_stopped':'retryable_failure',source:'generation',chapter:Number.isInteger(ordinal)?ordinal:null,at:new Date(),code:String(code).slice(0,80),...(detail?{detail:String(detail).slice(0,80)}:{}),...(receipt?{receipt}:{})}}}));
  if(permanent)await refundTerminalFamilyQuota(env,userId,requestId);
  return result;
}

export async function resumeRequest(env,userId,requestId) {
  const row=await reconcileAttemptLimit(env,userId,await readRequest(env,userId,requestId));
  if(row.errorCode!=='AUTOMATIC_RECOVERY_STOPPED') return row;
  const ordinal=row.chapters.length,grantKey=`manualRecoveryGrants.${ordinal}`;
  const grants=grantCount(row.manualRecoveryGrants,ordinal),now=new Date();
  if(!hasChapterDeliveryContract(row)||grants>=MANUAL_CHAPTER_RECOVERY_LIMIT){
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
  if(hasChapterDeliveryContract(row)&&!system && SYSTEM_CHAPTER_RETRY_GRANT>0){
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
export async function resumeHeldByUser(env,userId,requestId,source='user') {
  const current=await readRequest(env,userId,requestId);
  if(!userCanRetryHold(current))return current;
  const ordinal=current.chapters.length,used=grantCount(current.hold?.userRetries,ordinal),manual=grantCount(current.manualRecoveryGrants,ordinal),reason=heldReason(current),now=new Date();
  const resumed=await withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),state:'FORTUNE_FAILED',
    errorCode:'GENERATION_REVIEW_REQUIRED',chapters:{$size:ordinal},$and:[pinGrant('hold.userRetries',ordinal,used),pinGrant('manualRecoveryGrants',ordinal,manual)]},
  {$set:{state:'PAID',errorCode:'',nextAttemptAt:null,queuedUntil:null,leaseToken:'',leaseUntil:null,'hold.alertPending':false},
  $inc:{[`hold.userRetries.${ordinal}`]:1,[`manualRecoveryGrants.${ordinal}`]:USER_HOLD_RETRY_GRANT},
  $push:{recoveryAudit:{kind:source==='scheduled'?'system_final_retry':'user_retry_after_hold',source,chapter:ordinal,at:now,code:reason}}},{new:true}).lean());
  return resumed || readRequest(env,userId,requestId);
}

// A durable validated draft needs storage, not another paid provider attempt.
export async function resumeHeldStoredChapter(env,row) {
  const userId=String(row.userId),requestId=String(row._id),current=await readRequest(env,userId,requestId);
  const ordinal=current.chapters.length;
  if(deliveryRefundPending(current)||!storedChapterDraft(current)||current.state!=='FORTUNE_FAILED'||
    !['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED'].includes(current.errorCode)||
    new Date(current.leaseUntil || 0).getTime()>Date.now())return null;
  return withMongoRetry(env,()=>YeongnyangiRequest.findOneAndUpdate({_id:requestId,userId:ownerId(userId),
    state:'FORTUNE_FAILED',errorCode:current.errorCode,chapters:{$size:ordinal},
    'generationCheckpoint.deliveryRefund.status':{$ne:'pending'},
    [`generationCheckpoint.chapterDrafts.${ordinal}.body`]:{$exists:true,$ne:null},
    $or:[{leaseUntil:null},{leaseUntil:{$lte:new Date()}}]},
    {$set:{state:'PAID',errorCode:'',nextAttemptAt:null,queuedUntil:null,'hold.alertPending':false},
      $push:{recoveryAudit:{kind:'stored_draft_recovery',source:'scheduled',chapter:ordinal,at:new Date()}}},{new:true}).lean());
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
