import {CHAPTER_LEASE_MS,hasChapterDeliveryContract} from './chapter-delivery-contract.js';
import { canResumeStoredChapter } from './stored-chapter.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { isDbUnavailableError } from '../lib/http.js';
import { Payment } from '../lib/models.js';
import { YeongnyangiRequest, canResumeAfterFix, escalateStopped, heldForFixFilter, heldReason, holdAutoResumes, keepHold,
  markHoldAlerted, pendingAlertFilter, resumeHeldAfterFix, MAX_FIX_RESUMES } from './repository.js';
import { activateFortune, generateNextChapter, providerReady } from './service';
import { enqueueConsultation } from './queue.js';

const ABANDONED_MS = 5 * 60 * 1000;
const BUDGET_MS = CHAPTER_LEASE_MS + 30000;
const CHAPTER_RESERVE_MS = CHAPTER_LEASE_MS; // provider + analysis, validation and persisted commit; the largest tier lease (chapterLeaseMs)
const MAX_REQUESTS = 3;
const TRANSIENT_HOLD_MS = 5 * 60 * 1000; // lands on the next ten-minute tick
const PERMANENT_HOLD_MS = 24 * 60 * 60 * 1000;
const STOPPED_IDLE_MS = 5 * 60 * 1000; // a user who closed the window is not waited on forever
const HOLD_SCAN = 10;
const ALERT_TIMEOUT_MS = 5000;

export function abandonedRequestFilter(now) {
  return {state:{$in:['PAID','GENERATING','FORTUNE_FAILED']},$or:[{paymentId:{$ne:null}},{accessMethod:{$in:['FAMILY','SERVICE_PACK']},passEvidenceId:{$ne:null}},{accessMethod:'MOONLIGHT_STONE',moonstoneLedgerId:{$ne:null}},{accessMethod:{$in:['PER_USE','ACCOUNT_FREE_TRIAL']}}],
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
    `진단: node scripts/recover-yeongnyangi-request.mjs --db code_destiny --request ${id} (기본 dry-run; 실행은 계획 해시와 결제 커밋 마커 예외 승인 후 --execute)`,
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

// A fortune-chat payment either opened its consultation or was approved after the consultation opened another way
// (free use, pass). The second is a double charge, so operators hear about it before the order is marked.
async function settleChatOrder(env, order, row, notify, outcomes) {
  const attached=row?.accessMethod==='PER_USE'&&row.perUseSource==='payment'&&String(row.perUseEvidenceId)===String(order._id);
  if(!attached&&!await sendHoldAlert(env,{subject:`[꿀꿀 운세] 중복 결제 확인 ${String(order._id).slice(0,12)}`,text:[
    `결제: ${order._id}`,`상담: ${order.requestId}`,`열린 방식: ${row?.accessMethod || 'UNKNOWN'}`,
    '같은 상담이 다른 방식으로 먼저 열린 뒤 카드 결제가 승인됨. 운영자 환불 확인 필요',
  ].join('\n')},notify)){outcomes.push({outcome:'alert_pending'});return;}
  await withMongoRetry(env,()=>Payment.updateOne({_id:order._id,'metadata.fortuneChatRecovery':null},
    {$set:{'metadata.fortuneChatRecovery':attached?'attached':'duplicate'}}));
  outcomes.push({outcome:attached?'chat_attached':'duplicate_payment'});
}

// Existing ten-minute recovery tick. Original immutable input, chapter lease and
// total attempt budget are shared with the browser; no new charge or LLM retry layer.
export async function runYeongnyangiRecovery(env, options = {}) {
  const canGenerate=(options.providerReady || providerReady)(env);
  const clock=options.clock || Date.now, now=clock(), deadline=now+BUDGET_MS;
  await (options.connectDb || connectDb)(env);
  const settle=options.settleRefunds || (await import('./terminal-refund.js')).settleDeliveryRefunds;
  const refundOutcomes=await settle(env,{now});
  const activate=options.activate || activateFortune, generate=options.generate || generateNextChapter;
  const paidOrders=(requestId,extra={})=>withMongoRetry(env,()=>Payment.find({
    requestId,...extra,
    paymentType:'digital_content',purchaseType:{$ne:'GIFT'},status:{$in:['paid','success','fulfilled']},
    'metadata.unlockRevoked':{$ne:true},'metadata.yeongnyangiRefundPending':{$ne:true},
    'metadata.consumedBy':null,createdAt:{$lt:new Date(now-ABANDONED_MS)},
    $or:[{'metadata.yeongnyangiRecoveryAfter':null},{'metadata.yeongnyangiRecoveryAfter':{$lte:new Date(now)}}],
  }).sort({createdAt:1}).limit(MAX_REQUESTS).lean());
  const orders=canGenerate?await paidOrders(/^yn-[a-f0-9]{64}$/):[];
  // Fortune-chat payments stay proof (never consumed), so a handled one is marked instead of dropping out of the scan.
  const chatOrders=canGenerate?await paidOrders(/^fc-[a-f0-9]{64}$/,{'metadata.fortuneChatRecovery':null}):[];
  const outcomes=[];
  for(const order of [...orders,...chatOrders]){
    if(clock()+CHAPTER_RESERVE_MS>deadline)break;
    try{
      const row=await activate(env,String(order.userId),order.requestId.slice(3));
      if(order.requestId.startsWith('fc-'))await settleChatOrder(env,order,row,options.notify,outcomes);
    }
    catch(error){
      // A malformed historical order must not starve later paid orders each tick,
      // but a DB blip must not delay a paid result by a whole day.
      const transient=isDbUnavailableError(error),code=String(error?.code || 'ACTIVATION_PENDING').slice(0,80);
      // A paid fortune-chat order that cannot open its consultation (e.g. one already refunded) would only retry daily.
      // Operators hear about it once; an undelivered alert is retried on the next tick instead of a day later.
      const alert=!transient&&order.requestId.startsWith('fc-')&&!order.metadata?.fortuneChatActivationAlerted;
      const alerted=alert&&await sendHoldAlert(env,{subject:`[꿀꿀 운세] 결제 상담 열기 실패 ${String(order._id).slice(0,12)}`,text:[
        `결제: ${order._id}`,`상담: ${order.requestId}`,`오류: ${code}`,
        '카드 결제가 승인됐지만 상담을 열지 못함. 24시간마다 자동 재시도. 운영자 확인 필요(환불 여부 포함)',
      ].join('\n')},options.notify);
      await withMongoRetry(env,()=>Payment.updateOne({_id:order._id},{$set:{
        'metadata.yeongnyangiRecoveryAfter':new Date(now+(transient||(alert&&!alerted)?TRANSIENT_HOLD_MS:PERMANENT_HOLD_MS)),
        'metadata.yeongnyangiRecoveryCode':code,
        ...(alerted?{'metadata.fortuneChatActivationAlerted':true}:{}),
      }}));
      outcomes.push({outcome:alert&&!alerted?'alert_pending':alerted?'activation_alert_sent':'activation_pending'});
    }
  }
  const revived=canGenerate?await reviveHeldOrders(env,options,now,outcomes):[];
  const candidates=await withMongoRetry(env,()=>YeongnyangiRequest.find(canGenerate?abandonedRequestFilter(now):storedRecoveryFilter(now))
    .sort({updatedAt:1}).limit(MAX_REQUESTS).lean());
  const revivedIds=new Set(revived.map(row=>String(row._id)));
  const pending=[...revived,...candidates.filter(row=>!revivedIds.has(String(row._id)))];
  while(pending.length && clock()+CHAPTER_RESERVE_MS<=deadline){
    const candidate=pending.shift();
    if(!canGenerate&&!canResumeStoredChapter(candidate))continue;
    try{
      if(canGenerate&&env.YEONGNYANGI_QUEUE){await (options.enqueue || enqueueConsultation)(env,candidate);outcomes.push({outcome:'queued'});continue;}
      if(canGenerate&&hasChapterDeliveryContract(candidate)){outcomes.push({outcome:'GENERATION_QUEUE_UNAVAILABLE'});continue;}
      const row=await generate(env,String(candidate.userId),String(candidate._id),'scheduled');
      outcomes.push({outcome:row.state});
      // A held lease or failed attempt waits for a future tick; never spin on it.
      if(row.state==='PAID' && row.chapters.length>candidate.chapters.length)pending.push(row);
    }catch(error){outcomes.push({outcome:String(error?.code || 'GENERATION_FAILED').slice(0,80)});}
  }
  outcomes.push(...refundOutcomes);
  console.log('[yeongnyangi-recovery]',JSON.stringify({scanned:candidates.length,outcomes}));
  return {ok:true,scanned:candidates.length,outcomes,...(!canGenerate?{storedOnly:true}:{})};
}

// Select the current ordinal's saved draft, not historical drafts from prior chapters.
// Older interrupted rows without a draft cannot starve recoverable rows while the provider is disabled.
export function storedRecoveryFilter(now) {
  const filter=abandonedRequestFilter(now);
  const saved={$size:{$ifNull:['$chapters',[]]}},total={$size:{$ifNull:['$snapshot.manifest',[]]}};
  filter.$and.push({$expr:{$and:[{$gt:[total,0]},{$or:[
    {$gte:[saved,total]},
    {$in:[{$toString:saved},{$map:{input:{$objectToArray:{$ifNull:['$generationCheckpoint.chapterDrafts',{}]}},as:'draft',in:'$$draft.k'}}]},
  ]}]}});
  return filter;
}
