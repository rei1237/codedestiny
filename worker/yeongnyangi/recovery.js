import { connectDb, withMongoRetry } from '../lib/db.js';
import { isDbUnavailableError } from '../lib/http.js';
import { Payment } from '../lib/models.js';
import { YeongnyangiRequest, canResumeAfterFix, escalateStopped, heldForFixFilter, heldReason, holdAutoResumes, keepHold,
  markHoldAlerted, pendingAlertFilter, resumeHeldAfterFix, MAX_FIX_RESUMES } from './repository.js';
import { activateFortune, generateNextChapter, providerReady } from './service';
import { enqueueConsultation } from './queue.js';

const ABANDONED_MS = 5 * 60 * 1000;
const BUDGET_MS = 4 * 60 * 1000;
const CHAPTER_RESERVE_MS = 105000; // existing 90s provider deadline + DB commit
const MAX_REQUESTS = 3;
const TRANSIENT_HOLD_MS = 5 * 60 * 1000; // lands on the next ten-minute tick
const PERMANENT_HOLD_MS = 24 * 60 * 60 * 1000;
const STOPPED_IDLE_MS = 30 * 60 * 1000; // a user who closed the window is not waited on forever
const HOLD_SCAN = 10;
const ALERT_TIMEOUT_MS = 5000;

export function abandonedRequestFilter(now) {
  return {state:{$in:['PAID','GENERATING','FORTUNE_FAILED']},$or:[{paymentId:{$ne:null}},{accessMethod:'FAMILY',passEvidenceId:{$ne:null}}],
    updatedAt:{$lt:new Date(now-ABANDONED_MS)},
    errorCode:{$nin:['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE','AUTOMATIC_RECOVERY_STOPPED']},
    $and:[{$or:[{leaseUntil:null},{leaseUntil:{$lte:new Date(now)}}]}]};
}

async function notifyOperatorsLazily(env, message) {
  const { notifyOperators } = await import('../lib/feedback-notify.js');
  return notifyOperators(env, message);
}

// Same delivery rule as the payment alert: at least one configured channel accepted it.
async function sendHoldAlert(env, message, send = notifyOperatorsLazily) {
  let timer;
  try {
    const outcome=await Promise.race([Promise.resolve().then(()=>send(env,message)),
      new Promise((_resolve,reject)=>{timer=setTimeout(()=>reject(new Error('alert_timeout')),ALERT_TIMEOUT_MS);})]);
    return Array.isArray(outcome?.results)&&outcome.results.some(entry=>entry?.ok===true&&!entry?.skipped);
  } catch { return false; }
  finally { clearTimeout(timer); }
}

// Identifiers, counts and codes only: no profile, birth data or consultation text.
export function holdAlertMessage(row) {
  const id=String(row._id),total=row.snapshot?.manifest?.length || 0,saved=row.chapters?.length || 0;
  const failure=[...(row.recoveryAudit || [])].reverse().find(event=>event?.source==='generation'&&event?.code);
  const stopped=Number.isInteger(row.hold?.chapter)?row.hold.chapter+1:Math.min(saved+1,total);
  return {subject:`[영냥이] 유료 상담 생성 보류 ${id.slice(0,12)}`,text:[
    `주문번호: ${id}`,
    `상품: ${row.productId}`,
    `진행: 저장 ${saved}/${total}, 멈춘 항목 ${stopped}/${total}`,
    `원인: ${heldReason(row) || 'UNKNOWN'}${failure?` (최근 실패 ${failure.code}${failure.detail?` ${failure.detail}`:''})`:''}`,
    holdAutoResumes(row)
      ?`자동 재개: 생성 수정 배포 때 GENERATION_FIX_EPOCH 를 올리면 다음 크론에서 이어서 생성 (재개 ${Number(row.hold?.resumes || 0)}/${MAX_FIX_RESUMES})`
      :'자동 재개 없음: 운영자 확인 필요',
    `수동: node scripts/recover-yeongnyangi-request.mjs --db code_destiny --request ${id} --attempts 3 --reason <사건> --operator <이름> (dry-run 진단 확인 후 --apply, 적용 전 상태 파일 자동 기록)`,
    '저장된 항목은 구매자가 계속 열람하며 추가 결제는 없음',
  ].join('\n')};
}

// A paid order is never left for the buyer to chase: resume holds after a fix,
// give an idle stopped chapter its server retry, then alert operators once per hold.
async function reviveHeldOrders(env, options, now, outcomes) {
  const revived=[];
  const resume=options.resumeAfterFix || resumeHeldAfterFix, escalate=options.escalate || escalateStopped;
  const held=await withMongoRetry(env,()=>YeongnyangiRequest.find(heldForFixFilter()).sort({updatedAt:1}).limit(HOLD_SCAN).lean());
  for(const row of held){
    if(revived.length>=MAX_REQUESTS)break;
    try{
      if(!canResumeAfterFix(row)){await (options.keepHold || keepHold)(env,row);outcomes.push({outcome:'hold_kept'});continue;}
      const resumed=await resume(env,row);
      if(resumed){revived.push(resumed);outcomes.push({outcome:'resumed_after_fix'});}
    }catch(error){outcomes.push({outcome:String(error?.code || 'RESUME_FAILED').slice(0,80)});}
  }
  const stopped=await withMongoRetry(env,()=>YeongnyangiRequest.find({state:'FORTUNE_FAILED',errorCode:'AUTOMATIC_RECOVERY_STOPPED',
    updatedAt:{$lt:new Date(now-STOPPED_IDLE_MS)}}).sort({updatedAt:1}).limit(HOLD_SCAN).lean());
  for(const row of stopped){
    try{
      const next=await escalate(env,row);
      if(next?.state==='PAID'&&!next.errorCode){revived.push(next);outcomes.push({outcome:'system_retry'});}
      else outcomes.push({outcome:next?.errorCode==='GENERATION_REVIEW_REQUIRED'?'held':String(next?.errorCode || next?.state || 'UNCHANGED').slice(0,80)});
    }catch(error){outcomes.push({outcome:String(error?.code || 'ESCALATION_FAILED').slice(0,80)});}
  }
  const alerts=await withMongoRetry(env,()=>YeongnyangiRequest.find(pendingAlertFilter()).sort({updatedAt:1}).limit(MAX_REQUESTS).lean());
  for(const row of alerts){
    // An undelivered alert keeps its mark and is sent again next tick.
    if(!await sendHoldAlert(env,holdAlertMessage(row),options.notify)){outcomes.push({outcome:'alert_pending'});continue;}
    await (options.markAlerted || markHoldAlerted)(env,row);
    outcomes.push({outcome:'alert_sent'});
  }
  return revived;
}

// Existing ten-minute recovery tick. Original immutable input, chapter lease and
// total attempt budget are shared with the browser; no new charge or LLM retry layer.
export async function runYeongnyangiRecovery(env, options = {}) {
  if (!(options.providerReady || providerReady)(env)) return {ok:true,skipped:'disabled'};
  const clock=options.clock || Date.now, now=clock(), deadline=now+BUDGET_MS;
  await (options.connectDb || connectDb)(env);
  const activate=options.activate || activateFortune, generate=options.generate || generateNextChapter;
  const orders=await withMongoRetry(env,()=>Payment.find({
    requestId:/^yn-[a-f0-9]{64}$/,
    paymentType:'digital_content',purchaseType:{$ne:'GIFT'},status:{$in:['paid','success','fulfilled']},
    'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true},
    'metadata.consumedBy':null,createdAt:{$lt:new Date(now-ABANDONED_MS)},
    $or:[{'metadata.yeongnyangiRecoveryAfter':null},{'metadata.yeongnyangiRecoveryAfter':{$lte:new Date(now)}}],
  }).sort({createdAt:1}).limit(MAX_REQUESTS).lean());
  const outcomes=[];
  for(const order of orders){
    if(clock()+CHAPTER_RESERVE_MS>deadline)break;
    try{await activate(env,String(order.userId),order.requestId.slice(3));}
    catch(error){
      // A malformed historical order must not starve later paid orders each tick,
      // but a DB blip must not delay a paid result by a whole day.
      await withMongoRetry(env,()=>Payment.updateOne({_id:order._id},{$set:{
        'metadata.yeongnyangiRecoveryAfter':new Date(now+(isDbUnavailableError(error)?TRANSIENT_HOLD_MS:PERMANENT_HOLD_MS)),
        'metadata.yeongnyangiRecoveryCode':String(error?.code || 'ACTIVATION_PENDING').slice(0,80),
      }}));
      outcomes.push({outcome:'activation_pending'});
    }
  }
  const revived=await reviveHeldOrders(env,options,now,outcomes);
  const candidates=await withMongoRetry(env,()=>YeongnyangiRequest.find(abandonedRequestFilter(now))
    .sort({updatedAt:1}).limit(MAX_REQUESTS).lean());
  const revivedIds=new Set(revived.map(row=>String(row._id)));
  const pending=[...revived,...candidates.filter(row=>!revivedIds.has(String(row._id)))];
  while(pending.length && clock()+CHAPTER_RESERVE_MS<=deadline){
    const candidate=pending.shift();
    try{
      if(env.YEONGNYANGI_QUEUE){await (options.enqueue || enqueueConsultation)(env,candidate);outcomes.push({outcome:'queued'});continue;}
      const row=await generate(env,String(candidate.userId),String(candidate._id),'scheduled');
      outcomes.push({outcome:row.state});
      // A held lease or failed attempt waits for a future tick; never spin on it.
      if(row.state==='PAID' && row.chapters.length>candidate.chapters.length)pending.push(row);
    }catch(error){outcomes.push({outcome:String(error?.code || 'GENERATION_FAILED').slice(0,80)});}
  }
  console.log('[yeongnyangi-recovery]',JSON.stringify({scanned:candidates.length,outcomes}));
  return {ok:true,scanned:candidates.length,outcomes};
}
