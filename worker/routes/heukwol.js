import { createHash } from 'node:crypto';
import { requireAuth } from '../lib/auth.js';
import { connectDb } from '../lib/db.js';
import { ProfileCard, PointHistory, ServiceExecutionTransaction } from '../lib/models.js';
import { getBillingFeaturePricing } from '../lib/billing-feature-registry.js';
import { verifyPerUsePayment } from '../lib/nakshatra-paid-access.js';
import { claimRequestBillingEvidence } from '../lib/billing-evidence-claim.js';
import { isStoredPaidResultRevoked } from '../lib/paid-result-revocation.js';
import { startServiceExecution, completeServiceExecution, failServiceExecution } from '../lib/service-execution-task.js';
import { buildHeukwolAnalysis, heukwolProfileBirth } from '../lib/heukwol-analysis.js';
import { HEUKWOL_FEATURE_KEY, HEUKWOL_CHAPTERS, HEUKWOL_MIN_CHARS, HEUKWOL_DELIVERY_PLAN_VERSION, HEUKWOL_TRANSIENT_ATTEMPTS, heukwolDeliveryV2Enabled, generateHeukwolChapter, isHeukwolTransientError } from "../lib/heukwol-report.js";
import { json, readJson, handleRouteError } from '../lib/http.js';
import { logStuckSettled, retryRefundAt } from '../lib/paid-delivery-stuck.js';

const digest = value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const executionKey = requestId=>`heukwol:${digest(requestId)}`;
const error = (status,code,message)=>json({ok:false,code,message},{status});
// 2판(새 세션만, S16 2026-11-19): 장마다 한 라운드 3번 시도(1번째 엄격, 2번째 완화 수용, 3번째 최종 완화).
// 라운드당 3번은 checkpoint-refund-guard 의 "attempts<3 이면 이어쓰기 가능" 판정과 맞춘 값이다.
// 라운드를 다 써도 장을 건너뛰지 않고 다음 라운드로 다시 쓴다. 라운드 상한을 넘기면 본문 없이 실패·환불한다.
// 모든 장이 세 칸(warning·interpretation·strategy)을 다 채웠을 때만 완료로 전달한다 — 축소 전달 없음.
export const HEUKWOL_V2_ATTEMPTS_PER_ROUND = 3;
export const HEUKWOL_V2_MAX_CHAPTER_ROUNDS = 3;
const isV2 = meta=>Number(meta?.deliveryPlanVersion)===HEUKWOL_DELIVERY_PLAN_VERSION;
const MAX_ATTEMPTS = 3; // 1판 종결 기준이자 2판 라운드 크기
const mayGenerate = doc=>doc.status==='pending'&&(!doc.refundStatus||doc.refundStatus==='none')&&(doc.metadata.attempts||0)<MAX_ATTEMPTS;
const CHAPTER_FIELDS = ['warning','interpretation','strategy'];
const chapterComplete = c=>Boolean(c)&&CHAPTER_FIELDS.every(k=>typeof c[k]==='string'&&c[k].trim());
const completeKeys = meta=>new Set((meta?.chapters||[]).filter(chapterComplete).map(c=>c.key));
/** 전달 가능한 완성본인가: 27장 전부 세 칸이 채워졌고, 1판은 전체 40,000자 관문까지 통과. */
export function isHeukwolComplete(meta) {
  const done=completeKeys(meta);
  if(!HEUKWOL_CHAPTERS.every(c=>done.has(c.key)))return false;
  return isV2(meta)||(meta.chapters||[]).reduce((n,c)=>n+(c.totalChars||0),0)>=HEUKWOL_MIN_CHARS;
}
// 실패로 닫힌 상담의 자동 환불 진행 상태. 화면은 이 값으로 환불 안내를 고른다.
const refundState = doc=>doc.status==='refunded'||doc.refundStatus==='refunded'?'refunded':doc.refundStatus==='refund_failed'?'manual_review':'pending';
// 2026-11-19 R6 다시 시도 우선(사용자 승인 "다시 시도 먼저", 환불 기한 "결제(생성 시작) 후 7일"):
// 일시 장애로 끝난 상담은 바로 환불하지 않고 metadata.retryable 표지로 보류한다. 문서는 pending·attempts=상한으로 두어
// 생성(advance·복구 cron)은 멈추고, 완성된 장은 그대로 둔다. 고객은 결제 확인·차감 없이 다시 시도(/retry)하거나 환불을 요청(/refund-request)한다.
// 환불 시각(생성 + 7일)은 다시 시도해도 늘지 않는다. 그 시각이 지나면 타임아웃 스위퍼(timeoutAt=refundAt)와
// 환불 cron(settleDueHeukwolRetryRefunds)이 기존 failServiceExecution 경로로 1회 환불한다(둘 다 settleExecutionById 의 멱등에 기댄다).
// 결정적 실패(1판 40,000자 관문·장 누락)는 다시 시도로 고칠 수 없어 기존대로 바로 환불한다.
// 같은 판정을 checkpoint-refund-guard.js 의 heukwolRetryWindowOpen 이 따로 갖는다(공용 스위퍼가 읽는 모듈이라 import 하지 않는다).
const DETERMINISTIC_FAILURE = /HEUKWOL_REPORT_(TOO_SHORT|INCOMPLETE)/;
const RETRY_FAILED_MESSAGE = '리포트 작성이 멈췄어요. 완성된 장은 보관했고, 추가 결제·차감 없이 다시 시도할 수 있어요.';
export function heukwolRetryWindowOpen(doc,now=Date.now()) {
  const retryable=doc?.metadata?.retryable;
  if(doc?.status!=='pending'||!retryable)return false;
  if(doc.refundStatus&&doc.refundStatus!=='none')return false;
  return new Date(retryable.refundAt??NaN).getTime()>now;
}
/** 종결 실패를 다시 시도 보류로 바꾼다. 창이 닫혔거나 CAS 가 빗나가면 null — 호출부는 기존 실패·환불로 간다(fail-closed). */
async function holdHeukwolForRetry(model,filter,doc,code,{now=Date.now(),fields={}}={}) {
  const refundAt=retryRefundAt(doc,now);
  if(!(refundAt.getTime()>now))return null;
  const held=await model.updateOne(filter,{$set:{...fields,'metadata.attempts':MAX_ATTEMPTS,'metadata.retryable':{since:new Date(now),refundAt,code},
    'lock.token':'','lock.until':null,reasonCode:'HEUKWOL_RETRY_AVAILABLE',timeoutAt:refundAt,nextRetryAt:refundAt}});
  if(held?.matchedCount!==1)return null;
  // 정체 감시는 보류 동안 의미가 없다. 다시 시도 뒤 새로 센다.
  if(model.collection&&doc?._id)await model.collection.updateOne({_id:doc._id,userId:doc.userId},{$set:{deliveryWatch:null}}).catch(()=>null);
  return refundAt;
}
async function heldFailure(env,userId,id) {
  const saved=await readOwned(env,userId,id);
  return json({...(saved?visible(saved):{}),ok:false,code:'HEUKWOL_DELIVERY_FAILED',message:RETRY_FAILED_MESSAGE},{status:503});
}
function visible(doc) {
  const m=doc.metadata,status=doc.status==='success'?'completed':mayGenerate(doc)?'generating':'failed';
  const retryOpen=status==='failed'&&heukwolRetryWindowOpen(doc);
  return {ok:true,id:doc.executionKey,status,
    completedChapters:completeKeys(m).size,totalChapters:HEUKWOL_CHAPTERS.length,year:m.input.year,
    ...(doc.status==='success'?{report:m.archive}:{}),
    ...(retryOpen?{retry:{available:true,refundAt:new Date(m.retryable.refundAt).toISOString(),sessionId:doc.executionKey}}
      :status==='failed'?{refundStatus:refundState(doc)}:{}),
    recordsHref:`/heukwol/?result=${encodeURIComponent(doc.executionKey)}`};
}
async function readOwned(env,userId,id) {
  await connectDb(env);
  const doc=await ServiceExecutionTransaction.findOne({userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY}).lean();
  if(doc && await isStoredPaidResultRevoked(userId,HEUKWOL_FEATURE_KEY,doc)) return null;
  return doc;
}
// 생성 실패로 환불된 상담은 결과 접근이 회수돼 readOwned 가 비운다. 본문 없이 실패·환불 상태만 알려 404 대신 환불 안내를 보이게 한다.
async function closedFailure(userId,id,message) {
  const doc=await ServiceExecutionTransaction.findOne({userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY}).lean();
  return doc?.generationFailedAt&&doc.status!=='success'?json(visible(doc)):error(404,'RESULT_NOT_AVAILABLE',message);
}
// 아직 세 칸을 다 채운 본문이 없는 장. 예전 판이 건너뛴 장(skippedChapters)·한 칸만 받은 장도 다시 쓴다.
const pendingChapters = meta=>{const done=completeKeys(meta);return HEUKWOL_CHAPTERS.filter(c=>!done.has(c.key));};
async function completeHeukwol(env,userId,id,meta,stored) {
  const totalChars=stored.reduce((n,c)=>n+c.totalChars,0);
  // 1판만 전체 40,000자 관문을 둔다. 2판에서 분량은 치명이 아니다.
  if(!isV2(meta)&&totalChars<HEUKWOL_MIN_CHARS)throw new Error('HEUKWOL_REPORT_TOO_SHORT');
  if(!isHeukwolComplete({...meta,chapters:stored}))throw new Error('HEUKWOL_REPORT_INCOMPLETE');
  // 다시 쓴 장이 뒤에 붙어도 목차 순서로 묶는다.
  const chapters=HEUKWOL_CHAPTERS.map(c=>stored.find(x=>x.key===c.key&&chapterComplete(x)));
  const archive={title:`${meta.input.year} 흑월의 주의 시기`,year:meta.input.year,analysis:meta.analysis,chapters,totalChars,
    reportId:id,generatedAt:new Date().toISOString(),question:meta.input.question};
  const completed=await completeServiceExecution(env,userId,{executionKey:id,reportId:id,result:archive,metadata:{...meta,chapters,archive}});
  if(!completed.ok)throw new Error('HEUKWOL_SAVE_UNCONFIRMED');
}
/** One bounded chapter per request, checkpointed before the next wave. */
export async function advanceHeukwol(env,userId,id) {
  const doc=await readOwned(env,userId,id);
  if(!doc)return closedFailure(userId,id,'리포트를 찾을 수 없어요.');
  if(!mayGenerate(doc))return json(visible(doc));
  const now=new Date(),token=crypto.randomUUID();
  const owned={userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY,status:'pending','lock.token':token};
  const claimed=await ServiceExecutionTransaction.findOneAndUpdate({userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY,status:'pending',refundStatus:{$in:[null,'none']},'metadata.attempts':{$lt:MAX_ATTEMPTS},
    $or:[{'lock.until':null},{'lock.until':{$lt:now}}]},{$set:{'lock.token':token,'lock.until':new Date(+now+180000),heartbeatAt:now,
      timeoutAt:new Date(+now+3600000)}},{returnDocument:'after'}).lean();
  if(!claimed)return json(visible(doc),{status:202});
  try {
    const meta=claimed.metadata;
    const v2=isV2(meta);
    const next=v2?pendingChapters(meta)[0]:HEUKWOL_CHAPTERS.find(c=>!meta.chapters.some(done=>done.key===c.key));
    let chapters=meta.chapters;
    if(next) {
      const chapter=v2
        ?await generateHeukwolChapter(env,meta.analysis,next,meta.input.question,chapters,undefined,{deliveryPlanVersion:HEUKWOL_DELIVERY_PLAN_VERSION,
          relaxed:(meta.attempts||0)>=1,finalAttempt:(meta.attempts||0)>=HEUKWOL_V2_ATTEMPTS_PER_ROUND-1,repairIssue:meta.lastIssue||''})
        :await generateHeukwolChapter(env,meta.analysis,next,meta.input.question,chapters);
      chapters=[...chapters.filter(c=>c.key!==next.key),chapter];
      const checkpoint=await ServiceExecutionTransaction.updateOne(owned,{$set:{'metadata.chapters':chapters,'metadata.attempts':0,'metadata.transientAttempts':0,...(v2?{'metadata.lastIssue':''}:{}),heartbeatAt:new Date()}});
      if(checkpoint.modifiedCount!==1)throw new Error('HEUKWOL_SAVE_UNCONFIRMED');
    }
    if(v2?!pendingChapters({...meta,chapters}).length:chapters.length===HEUKWOL_CHAPTERS.length) {
      await completeHeukwol(env,userId,id,meta,chapters);
    } else {
      await ServiceExecutionTransaction.updateOne(owned,{$set:{'lock.token':'','lock.until':null}});
    }
    const saved=await readOwned(env,userId,id);
    return saved?json(visible(saved),{status:saved.status==='success'?200:202}):error(404,'RESULT_NOT_AVAILABLE','결과 접근을 확인해 주세요.');
  } catch(e) {
    // R6b: 공급자·일시 오류는 품질 시도를 깎지 않고 별도 상한 안에서 다시 시도한다. 상한을 넘기면 아래 품질 시도로 센다(fail-closed).
    const transient=Number(claimed.metadata.transientAttempts||0);
    if(isHeukwolTransientError(e)&&transient<HEUKWOL_TRANSIENT_ATTEMPTS) {
      const v2=isV2(claimed.metadata);
      const released=await ServiceExecutionTransaction.updateOne(owned,{$set:{'metadata.transientAttempts':transient+1,
        ...(v2?{'metadata.lastIssue':String(e?.heukwolIssue||'')}:{}),'lock.token':'','lock.until':null,reasonCode:'HEUKWOL_RETRYABLE'}});
      if(released.matchedCount!==1)return error(409,'EXECUTION_CHANGED','진행 상태가 바뀌었어요. 저장된 상담을 다시 확인해 주세요.');
      if(v2){const saved=await readOwned(env,userId,id);return saved?json(visible(saved),{status:saved.status==='success'?200:202}):error(404,'RESULT_NOT_AVAILABLE','결과 접근을 확인해 주세요.');}
      return error(503,'HEUKWOL_RETRYABLE','완성된 장은 보관했어요. 이어서 작성하기를 눌러 주세요.');
    }
    const attempts=(claimed.metadata.attempts||0)+1;
    if(isV2(claimed.metadata))return failHeukwolWaveV2(env,userId,id,owned,claimed,attempts,e);
    if(attempts>=MAX_ATTEMPTS&&!DETERMINISTIC_FAILURE.test(String(e?.message||''))
      &&await holdHeukwolForRetry(ServiceExecutionTransaction,owned,claimed,'HEUKWOL_GENERATION_FAILED'))return heldFailure(env,userId,id);
    const released=await ServiceExecutionTransaction.updateOne(owned,{$set:{'metadata.attempts':attempts,'lock.token':'','lock.until':null,reasonCode:'HEUKWOL_RETRYABLE'}});
    if(released.matchedCount!==1)return error(409,'EXECUTION_CHANGED','진행 상태가 바뀌었어요. 저장된 상담을 다시 확인해 주세요.');
    if(attempts>=3) {
      await failServiceExecution(env,userId,{executionKey:id,reasonCode:'HEUKWOL_GENERATION_FAILED',reasonMessage:'흑월 리포트를 완성하지 못했습니다.',forceRefundOnClose:true});
      return error(503,'HEUKWOL_DELIVERY_FAILED','리포트를 완성하지 못했어요. 보관함에서 결제 및 처리 상태를 확인해 주세요.');
    }
    return error(503,'HEUKWOL_RETRYABLE','완성된 장은 보관했어요. 이어서 작성하기를 눌러 주세요.');
  }
}
/**
 * 2판 실패 물결. 시도가 남으면 이슈를 힌트로 남기고 202로 이어 가게 한다.
 * 한 라운드를 다 쓴 장은 건너뛰지 않고 시도를 되돌려 다음 라운드에 다시 쓴다.
 * 라운드 상한(HEUKWOL_V2_MAX_CHAPTER_ROUNDS)을 넘긴 장이 나오면 본문 없이 실패로 닫고 기존 환불 경로로 1회 환불한다.
 */
async function failHeukwolWaveV2(env,userId,id,owned,claimed,attempts,cause) {
  const meta=claimed.metadata;
  const next=pendingChapters(meta)[0];
  const lastIssue=String(cause?.heukwolIssue||'');
  const release=fields=>ServiceExecutionTransaction.updateOne(owned,{$set:{...fields,'lock.token':'','lock.until':null,reasonCode:'HEUKWOL_RETRYABLE'}});
  const changed=()=>error(409,'EXECUTION_CHANGED','진행 상태가 바뀌었어요. 저장된 상담을 다시 확인해 주세요.');
  const answer=async()=>{const saved=await readOwned(env,userId,id);return saved?json(visible(saved),{status:saved.status==='success'?200:202}):error(404,'RESULT_NOT_AVAILABLE','결과 접근을 확인해 주세요.');};
  if(attempts<HEUKWOL_V2_ATTEMPTS_PER_ROUND) {
    if((await release({'metadata.attempts':attempts,'metadata.lastIssue':lastIssue})).matchedCount!==1)return changed();
    return answer();
  }
  if(!next) {
    // 모든 장이 끝났는데 완료 저장만 거듭 실패했다. 닫지 않고 시도를 되돌려 다음 요청·복구 cron이 저장을 다시 하게 한다.
    if((await release({'metadata.attempts':0})).matchedCount!==1)return changed();
    return error(503,'HEUKWOL_RETRYABLE','완성된 장은 보관했어요. 이어서 작성하기를 눌러 주세요.');
  }
  const rounds=Number(meta.chapterRounds?.[next.key]||0)+1;
  if(rounds>=HEUKWOL_V2_MAX_CHAPTER_ROUNDS) {
    // R6: 라운드 상한은 일시 장애다. 다시 시도 창 안이면 환불 대신 보류한다.
    if(await holdHeukwolForRetry(ServiceExecutionTransaction,owned,claimed,'HEUKWOL_GENERATION_FAILED',
      {fields:{'metadata.chapterRounds':{...(meta.chapterRounds||{}),[next.key]:rounds}}}))return heldFailure(env,userId,id);
    if((await release({'metadata.attempts':attempts,'metadata.chapterRounds':{...(meta.chapterRounds||{}),[next.key]:rounds}})).matchedCount!==1)return changed();
    await failServiceExecution(env,userId,{executionKey:id,reasonCode:'HEUKWOL_GENERATION_FAILED',reasonMessage:'흑월 리포트를 완성하지 못했습니다.',forceRefundOnClose:true});
    return error(503,'HEUKWOL_DELIVERY_FAILED','리포트를 완성하지 못했어요. 보관함에서 결제 및 처리 상태를 확인해 주세요.');
  }
  // 다음 라운드: 시도를 되돌리고 마지막 이슈를 힌트로 남긴다. 장은 대기 목록에 그대로 남는다.
  if((await release({'metadata.attempts':0,'metadata.lastIssue':lastIssue,'metadata.chapterRounds':{...(meta.chapterRounds||{}),[next.key]:rounds}})).matchedCount!==1)return changed();
  return answer();
}
/**
 * 정체 확정(S16): 복구 cron 이 진전 없는 흑월 상담을 넘기면 완성본일 때만 전달하고, 아니면 본문 없이 닫는다.
 * R6: 닫을 때 다시 시도 창 안이면 환불 대신 보류(retryable)하고, 창이 지났거나 결정적 실패면 기존대로 실패·환불(1회)한다.
 * 반환 { outcome: 'progressed'|'leased'|'rescued'|'retryable'|'failed', refundStatus?, refundAt? }. 본문·결제 ID·출생 정보는 로그에 남기지 않는다.
 */
export async function settleStuckDelivery(env,{doc,now=Date.now(),model=ServiceExecutionTransaction}={}) {
  if(!doc?.userId||!doc?.executionKey)return {outcome:'progressed'};
  const userId=String(doc.userId),id=String(doc.executionKey),sessionId=id;
  const owner={userId:doc.userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY};
  const fresh=await model.findOne(owner).lean();
  if(!fresh||fresh.status!=='pending'||(fresh.refundStatus&&fresh.refundStatus!=='none'))return {outcome:'progressed'};
  if(fresh.lock?.until&&new Date(fresh.lock.until).getTime()>now)return {outcome:'leased'};
  if(heukwolRetryWindowOpen(fresh,now))return {outcome:'retryable',refundAt:new Date(fresh.metadata.retryable.refundAt)};
  const stalls=Number(fresh.deliveryWatch?.stalls||doc.deliveryWatch?.stalls||0);
  // updatedAt CAS + 빈 잠금: 그 사이 브라우저·다른 워커가 진전을 저장했거나 잡았으면 확정하지 않는다.
  const at=new Date(now),token=crypto.randomUUID();
  const claimed=await model.findOneAndUpdate({...owner,status:'pending',refundStatus:{$in:[null,'none']},
    ...(fresh.updatedAt?{updatedAt:fresh.updatedAt}:{}),$or:[{'lock.until':null},{'lock.until':{$lt:at}}]},
    {$set:{'lock.token':token,'lock.until':new Date(now+180000),heartbeatAt:at}},{returnDocument:'after'}).lean();
  if(!claimed)return {outcome:'progressed'};
  if(isHeukwolComplete(claimed.metadata)) {
    await completeHeukwol(env,userId,id,claimed.metadata,claimed.metadata.chapters);
    logStuckSettled({service:'heukwol',sessionId,outcome:'rescued',stalls});
    return {outcome:'rescued'};
  }
  const meta=claimed.metadata;
  const deterministic=!isV2(meta)&&HEUKWOL_CHAPTERS.every(c=>(meta.chapters||[]).some(x=>x.key===c.key));
  const refundAt=deterministic?null:await holdHeukwolForRetry(model,{...owner,status:'pending','lock.token':token},claimed,'HEUKWOL_DELIVERY_STUCK',{now});
  if(refundAt) {
    logStuckSettled({service:'heukwol',sessionId,outcome:'retryable',stalls});
    return {outcome:'retryable',refundAt};
  }
  // 환불 클레임(settleExecutionById)은 빈 잠금을 요구하므로 풀고 닫는다. 같은 CAS 로 시도를 상한에 묶어
  // 그 틈에 브라우저·다른 워커가 다시 잡아 생성하지 못하게 한다(advance 의 claim 은 attempts<3 만 잡는다).
  const sealed=await model.updateOne({...owner,status:'pending','lock.token':token},
    {$set:{'lock.token':'','lock.until':null,'metadata.attempts':MAX_ATTEMPTS,reasonCode:'HEUKWOL_DELIVERY_STUCK'}});
  if(sealed?.matchedCount!==1)return {outcome:'progressed'};
  const failed=await failServiceExecution(env,userId,{executionKey:id,reasonCode:'HEUKWOL_DELIVERY_STUCK',reasonMessage:'흑월 리포트가 진전 없이 멈춰 완성하지 못했습니다.',forceRefundOnClose:true});
  const reported=String(failed?.execution?.refundStatus||failed?.settlement?.refundStatus||'');
  const refundStatus=reported&&reported!=='none'?reported:'pending';
  logStuckSettled({service:'heukwol',sessionId,outcome:'failed',refundStatus,stalls});
  return {outcome:'failed',refundStatus};
}
// 다시 시도 보류 건 환불 1건(고객 요청·창 만료 공용). 기존 실패·환불 경로(settleExecutionById, 멱등)를 그대로 쓴다.
async function settleHeukwolRetryRefund(env,doc,reasonCode) {
  const failed=await failServiceExecution(env,String(doc.userId),{executionKey:doc.executionKey,reasonCode,
    reasonMessage:'흑월 리포트를 다시 시도하지 않고 환불로 정리했습니다.',forceRefundOnClose:true});
  const reported=String(failed?.execution?.refundStatus||failed?.settlement?.refundStatus||'');
  return reported&&reported!=='none'?reported:'pending';
}
/** 무료 다시 시도: 보류 표지가 있고 창이 열린 본인 상담만 다시 연다. 결제 확인·이용권 차감·실행 시작을 다시 하지 않는다. */
async function retryHeukwol(env,userId,id) {
  const doc=await readOwned(env,userId,id);
  if(!doc)return closedFailure(userId,id,'리포트를 찾을 수 없어요.');
  if(!doc.metadata?.retryable||doc.status!=='pending'||(doc.refundStatus&&doc.refundStatus!=='none'))
    return error(409,'RETRY_NOT_AVAILABLE','다시 시도할 수 있는 상담이 아니에요. 보관함에서 상태를 확인해 주세요.');
  const now=Date.now(),at=new Date(now);
  if(!heukwolRetryWindowOpen(doc,now)) {
    await settleHeukwolRetryRefund(env,doc,'HEUKWOL_RETRY_WINDOW_EXPIRED');
    const saved=await readOwned(env,userId,id);
    return json({...(saved?visible(saved):{}),ok:false,code:'RETRY_WINDOW_EXPIRED',message:'다시 시도 기간이 지나 환불로 정리했어요.'},{status:409});
  }
  // CAS: 같은 보류 건이 아직 창 안이고 잠겨 있지 않을 때만 연다. 동시 다시 시도·환불 요청 중 하나만 이긴다.
  const reopened=await ServiceExecutionTransaction.updateOne({userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY,status:'pending',
    refundStatus:{$in:[null,'none']},'metadata.retryable.refundAt':{$gt:at},$or:[{'lock.until':null},{'lock.until':{$lt:at}}]},
    {$set:{'metadata.attempts':0,'metadata.transientAttempts':0,'metadata.retryable':null,'metadata.retryReopens':Number(doc.metadata.retryReopens||0)+1,'metadata.retryReopenedAt':at,
      ...(isV2(doc.metadata)?{'metadata.chapterRounds':{},'metadata.lastIssue':''}:{}),
      reasonCode:'HEUKWOL_RETRY_REOPENED',timeoutAt:new Date(now+3600000),nextRetryAt:at}});
  if(reopened?.matchedCount!==1)return error(409,'EXECUTION_CHANGED','진행 상태가 바뀌었어요. 저장된 상담을 다시 확인해 주세요.');
  if(ServiceExecutionTransaction.collection&&doc._id)await ServiceExecutionTransaction.collection.updateOne({_id:doc._id,userId:doc.userId},{$set:{deliveryWatch:null}}).catch(()=>null);
  // 여기서 생성하지 않는다(요청 시간 한도). 화면이 이어서 /continue 로 한 장씩 받는다.
  const saved=await readOwned(env,userId,id);
  return saved?json(visible(saved),{status:202}):error(404,'RESULT_NOT_AVAILABLE','결과 접근을 확인해 주세요.');
}
/** 다시 시도 대신 환불: 보류 표지가 있는 본인 상담만. 창을 지금 닫아(refundAt=지금) 그 뒤 다시 시도를 막고 1회 환불한다. */
async function requestHeukwolRefund(env,userId,id) {
  const doc=await readOwned(env,userId,id);
  if(!doc)return closedFailure(userId,id,'리포트를 찾을 수 없어요.');
  if(!doc.metadata?.retryable)return mayGenerate(doc)
    ?error(409,'REFUND_NOT_AVAILABLE','아직 작성 중인 상담이에요. 완성되지 않으면 다시 시도 또는 환불을 고를 수 있어요.')
    :json(visible(doc));
  if(doc.status!=='pending'||(doc.refundStatus&&doc.refundStatus!=='none'))return json(visible(doc));
  const at=new Date();
  const closed=await ServiceExecutionTransaction.updateOne({userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY,status:'pending',
    refundStatus:{$in:[null,'none']},'metadata.retryable':{$ne:null}},
    {$set:{'metadata.retryable.refundAt':at,'metadata.retryable.refundRequestedAt':at,reasonCode:'HEUKWOL_RETRY_REFUND_REQUESTED'}});
  if(closed?.matchedCount!==1)return error(409,'EXECUTION_CHANGED','진행 상태가 바뀌었어요. 저장된 상담을 다시 확인해 주세요.');
  await settleHeukwolRetryRefund(env,doc,'HEUKWOL_RETRY_REFUND_REQUESTED');
  const saved=await ServiceExecutionTransaction.findOne({userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY}).lean();
  return json(saved?visible(saved):{ok:true,id,status:'failed',refundStatus:'pending'});
}
/**
 * 환불 cron(runPendingConsultationRefunds)이 부른다: 창(생성 + 7일)이 지난 보류 건을 기존 실패·환불 경로로 1회 정산한다.
 * 조건은 조회 뒤 다시 확인하고(fail-closed), 살아 있는 잠금은 건너뛴다. 실패는 건마다 격리하고 다음 주기에 다시 돈다.
 */
export async function settleDueHeukwolRetryRefunds(env,{now=Date.now(),limit=5,model=ServiceExecutionTransaction}={}) {
  await connectDb(env);
  const at=new Date(now),outcomes=[];
  const due=await model.find({featureKey:HEUKWOL_FEATURE_KEY,status:'pending',refundStatus:{$in:[null,'none']},'metadata.retryable.refundAt':{$lte:at}})
    .sort({'metadata.retryable.refundAt':1}).limit(limit).select('userId executionKey featureKey status refundStatus lock metadata.retryable').lean();
  for(const doc of due) {
    try {
      if(doc.featureKey!==HEUKWOL_FEATURE_KEY||doc.status!=='pending'||!doc.metadata?.retryable||(doc.refundStatus&&doc.refundStatus!=='none'))continue;
      if(heukwolRetryWindowOpen(doc,now))continue;
      if(doc.lock?.until&&new Date(doc.lock.until).getTime()>now)continue;
      outcomes.push({service:'heukwol',refundStatus:await settleHeukwolRetryRefund(env,doc,'HEUKWOL_RETRY_WINDOW_EXPIRED')});
    } catch { outcomes.push({service:'heukwol',refundStatus:'pending'}); }
  }
  return outcomes;
}
export async function handleHeukwolRoutes(request,env) {
  try {
    const path=new URL(request.url).pathname;
    if(path==='/api/heukwol/pricing' && request.method==='GET')return json({ok:true,pricing:getBillingFeaturePricing({featureKey:HEUKWOL_FEATURE_KEY}).pricing});
    const auth=await requireAuth(request,env); const userId=String(auth.userId);
    if(path==='/api/heukwol/result' && request.method==='GET') {
      const id=new URL(request.url).searchParams.get('id')||'';
      const doc=await readOwned(env,userId,id);
      return doc?json(visible(doc)):closedFailure(userId,id,'리포트를 찾을 수 없어요.');
    }
    if(request.method!=='POST')return error(405,'METHOD_NOT_ALLOWED','지원하지 않는 요청이에요.');
    const body=await readJson(request);
    if(path==='/api/heukwol/continue')return advanceHeukwol(env,userId,String(body.id||''));
    if(path==='/api/heukwol/retry')return retryHeukwol(env,userId,String(body.id||''));
    if(path==='/api/heukwol/refund-request')return requestHeukwolRefund(env,userId,String(body.id||''));
    if(!['/api/heukwol/prepare','/api/heukwol/start'].includes(path))return error(404,'NOT_FOUND','화면을 찾을 수 없어요.');
    const requestId=String(body.requestId||'');
    if(!/^[A-Za-z0-9:_-]{8,120}$/.test(requestId))return error(400,'INVALID_REQUEST','상담 요청을 다시 준비해 주세요.');
    const input={profileId:String(body.profileId||''),year:Number(body.year),question:String(body.question||'').trim()};
    if(input.question.length<12 || input.question.length>3000)return error(400,'INVALID_QUESTION','고민을 12~3,000자로 적어 주세요.');
    const id=executionKey(requestId),inputHash=digest(input);
    await connectDb(env);
    const existing=await ServiceExecutionTransaction.findOne({userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY}).lean();
    if(existing) {
      if(await isStoredPaidResultRevoked(userId,HEUKWOL_FEATURE_KEY,existing))return closedFailure(userId,id,'리포트를 찾을 수 없어요.');
      if(existing.metadata.inputHash!==inputHash)return error(409,'INPUT_CHANGED','이미 시작한 상담의 프로필·연도·질문은 바꿀 수 없어요.');
      return path.endsWith('/prepare')?json({...visible(existing),pricing:getBillingFeaturePricing({featureKey:HEUKWOL_FEATURE_KEY}).pricing}):advanceHeukwol(env,userId,id);
    }
    const card=await ProfileCard.findOne({userId,profileId:input.profileId}).lean();
    if(!card)return error(400,'PROFILE_REQUIRED','저장한 프로필을 선택해 주세요.');
    const birth=heukwolProfileBirth(card);
    const analysis=buildHeukwolAnalysis(birth,input.year,undefined,{env});
    const pricing=getBillingFeaturePricing({featureKey:HEUKWOL_FEATURE_KEY}).pricing;
    if(path.endsWith('/prepare'))return json({ok:true,pricing,year:analysis.year,method:analysis.method});
    const proof=await verifyPerUsePayment(env,{userId,featureKey:HEUKWOL_FEATURE_KEY,coinPrice:pricing.cost,requestId,requireExisting:true,profileId:input.profileId});
    if(proof.proven!==true)return error(proof.proven===null?503:402,'PAYMENT_REQUIRED','결제 또는 이용권 확인이 필요해요.');
    const claim=await claimRequestBillingEvidence(env,{userId,featureKey:HEUKWOL_FEATURE_KEY,requestId:id,evidenceIds:[requestId,proof.transactionId].filter(Boolean)});
    if(!claim.ok)return json(claim,{status:claim.status});
    const passEvidence=proof.source==='pass' && proof.transactionId?await PointHistory.findOne({_id:proof.transactionId,userId,featureKey:HEUKWOL_FEATURE_KEY}).lean():null;
    const started=await startServiceExecution(env,userId,{executionKey:id,idempotencyKey:requestId,featureKey:HEUKWOL_FEATURE_KEY,reportType:'heukwol',reportId:id,
      profileId:input.profileId,sourceTransactionId:proof.transactionId||'',cost:pricing.cost,amountKRW:pricing.amountKRW,
      timeoutSeconds:3600,metadata:{input,inputHash,analysis,chapters:[],attempts:0,accessType:proof.source,
        // 새 세션만 2판. 진행 중인 1판 세션은 옛 동작으로 끝난다. 되돌리기: HEUKWOL_DELIVERY_V2_ENABLED=false
        ...(heukwolDeliveryV2Enabled(env)?{deliveryPlanVersion:HEUKWOL_DELIVERY_PLAN_VERSION,chapterRounds:{},lastIssue:''}:{}),
        archive:{title:`${input.year} 흑월의 주의 시기`,year:input.year,reportId:id,status:'generating'},
        ...(passEvidence?{passRefund:{cycleKey:passEvidence.metadata?.passCycleKey,cost:passEvidence.metadata?.coinCost||0}}:{})}});
    if(!started.ok)return error(503,'RESULT_STORAGE_UNAVAILABLE','상담 저장을 확인하지 못했어요. 같은 요청으로 다시 시도해 주세요.');
    // Check the winner after an insert race, before any generation.
    const persisted=await readOwned(env,userId,id);
    if(persisted?.metadata.inputHash!==inputHash)return error(409,'INPUT_CHANGED','이미 시작한 상담의 입력과 달라요.');
    return advanceHeukwol(env,userId,id);
  } catch(e) {
    if(/HEUKWOL_BIRTH_TIME_REQUIRED/.test(e.message))return error(400,'BIRTH_TIME_REQUIRED','사주와 자미두수의 월별 비교를 위해 출생 시각과 성별이 기록된 프로필이 필요해요.');
    if(/SIBYL_INVALID_YEAR|INVALID_BIRTH|CALENDAR_UNAVAILABLE/.test(e.message))return error(400,'INVALID_INPUT','프로필의 출생정보와 선택 연도를 확인해 주세요.');
    return handleRouteError(e);
  }
}
export async function resumeConsultationOnServer(env,doc) { return advanceHeukwol(env,String(doc.userId),doc.executionKey); }
