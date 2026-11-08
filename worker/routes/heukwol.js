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
import { HEUKWOL_FEATURE_KEY, HEUKWOL_CHAPTERS, HEUKWOL_MIN_CHARS, HEUKWOL_DELIVERY_PLAN_VERSION, heukwolDeliveryV2Enabled, generateHeukwolChapter } from "../lib/heukwol-report.js";
import { json, readJson, handleRouteError } from '../lib/http.js';

const digest = value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const executionKey = requestId=>`heukwol:${digest(requestId)}`;
const error = (status,code,message)=>json({ok:false,code,message},{status});
const mayGenerate = doc=>doc.status==='pending'&&(!doc.refundStatus||doc.refundStatus==='none')&&(doc.metadata.attempts||0)<3;
function visible(doc) {
  const m=doc.metadata;
  return {ok:true,id:doc.executionKey,status:doc.status==='success'?'completed':mayGenerate(doc)?'generating':'failed',
    completedChapters:m.chapters.length,totalChapters:HEUKWOL_CHAPTERS.length,year:m.input.year,
    ...(doc.status==='success'?{report:m.archive}:{}),
    recordsHref:`/heukwol/?result=${encodeURIComponent(doc.executionKey)}`};
}
async function readOwned(env,userId,id) {
  await connectDb(env);
  const doc=await ServiceExecutionTransaction.findOne({userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY}).lean();
  if(doc && await isStoredPaidResultRevoked(userId,HEUKWOL_FEATURE_KEY,doc)) return null;
  return doc;
}
// 2판(새 세션만): 장 하나가 3번 다 실패하면 그 장만 비워 두고 다음 장으로 간다. 비운 장이 이만큼 쌓이면 있는 장으로 완료한다.
export const HEUKWOL_V2_MAX_SKIPPED_CHAPTERS = 3;
const isV2 = meta=>Number(meta?.deliveryPlanVersion)===HEUKWOL_DELIVERY_PLAN_VERSION;
const pendingChapters = meta=>HEUKWOL_CHAPTERS.filter(c=>!meta.chapters.some(done=>done.key===c.key)&&!(meta.skippedChapters||[]).includes(c.key));
async function completeHeukwol(env,userId,id,meta,chapters) {
  const totalChars=chapters.reduce((n,c)=>n+c.totalChars,0);
  // 1판만 전체 40,000자 관문을 둔다. 2판에서 분량은 치명이 아니다.
  if(!isV2(meta)&&totalChars<HEUKWOL_MIN_CHARS)throw new Error('HEUKWOL_REPORT_TOO_SHORT');
  const archive={title:`${meta.input.year} 흑월의 경고`,year:meta.input.year,analysis:meta.analysis,chapters,totalChars,
    reportId:id,generatedAt:new Date().toISOString(),question:meta.input.question};
  const completed=await completeServiceExecution(env,userId,{executionKey:id,reportId:id,result:archive,metadata:{...meta,chapters,archive}});
  if(!completed.ok)throw new Error('HEUKWOL_SAVE_UNCONFIRMED');
}
/** One bounded chapter per request, checkpointed before the next wave. */
export async function advanceHeukwol(env,userId,id) {
  const doc=await readOwned(env,userId,id);
  if(!doc)return error(404,'RESULT_NOT_AVAILABLE','리포트를 찾을 수 없어요.');
  if(!mayGenerate(doc))return json(visible(doc));
  const now=new Date(),token=crypto.randomUUID();
  const owned={userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY,status:'pending','lock.token':token};
  const claimed=await ServiceExecutionTransaction.findOneAndUpdate({userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY,status:'pending',refundStatus:{$in:[null,'none']},'metadata.attempts':{$lt:3},
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
          finalAttempt:(meta.attempts||0)>=2,repairIssue:meta.lastIssue||''})
        :await generateHeukwolChapter(env,meta.analysis,next,meta.input.question,chapters);
      chapters=[...chapters,chapter];
      const checkpoint=await ServiceExecutionTransaction.updateOne(owned,{$set:{'metadata.chapters':chapters,'metadata.attempts':0,...(v2?{'metadata.lastIssue':''}:{}),heartbeatAt:new Date()}});
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
    const attempts=(claimed.metadata.attempts||0)+1;
    if(isV2(claimed.metadata))return failHeukwolWaveV2(env,userId,id,owned,claimed.metadata,attempts,e);
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
 * 장이 3번 다 실패하면 그 장만 비우고 다음 장으로 간다. 저장된 장이 하나도 없을 때만 환불한다.
 */
async function failHeukwolWaveV2(env,userId,id,owned,meta,attempts,cause) {
  const next=pendingChapters(meta)[0];
  const lastIssue=String(cause?.heukwolIssue||'');
  const release=fields=>ServiceExecutionTransaction.updateOne(owned,{$set:{...fields,'lock.token':'','lock.until':null,reasonCode:'HEUKWOL_RETRYABLE'}});
  const changed=()=>error(409,'EXECUTION_CHANGED','진행 상태가 바뀌었어요. 저장된 상담을 다시 확인해 주세요.');
  const answer=async()=>{const saved=await readOwned(env,userId,id);return saved?json(visible(saved),{status:saved.status==='success'?200:202}):error(404,'RESULT_NOT_AVAILABLE','결과 접근을 확인해 주세요.');};
  if(attempts<3) {
    if((await release({'metadata.attempts':attempts,'metadata.lastIssue':lastIssue})).matchedCount!==1)return changed();
    return answer();
  }
  if(!next) {
    // 모든 장이 끝났는데 완료 저장만 거듭 실패했다. 닫지 않고 시도를 되돌려 다음 요청·복구 cron이 저장을 다시 하게 한다.
    if((await release({'metadata.attempts':0})).matchedCount!==1)return changed();
    return error(503,'HEUKWOL_RETRYABLE','완성된 장은 보관했어요. 이어서 작성하기를 눌러 주세요.');
  }
  if(!meta.chapters.length) {
    // 본문이 완전히 비었을 때만 환불하며 닫는다.
    if((await release({'metadata.attempts':attempts})).matchedCount!==1)return changed();
    await failServiceExecution(env,userId,{executionKey:id,reasonCode:'HEUKWOL_GENERATION_FAILED',reasonMessage:'흑월 리포트를 완성하지 못했습니다.',forceRefundOnClose:true});
    return error(503,'HEUKWOL_DELIVERY_FAILED','리포트를 완성하지 못했어요. 보관함에서 결제 및 처리 상태를 확인해 주세요.');
  }
  const skippedChapters=[...(meta.skippedChapters||[]),next.key];
  if((await release({'metadata.attempts':0,'metadata.lastIssue':'','metadata.skippedChapters':skippedChapters})).matchedCount!==1)return changed();
  const after={...meta,skippedChapters};
  if(skippedChapters.length>=HEUKWOL_V2_MAX_SKIPPED_CHAPTERS||!pendingChapters(after).length) {
    try { await completeHeukwol(env,userId,id,after,meta.chapters); }
    catch { return error(503,'HEUKWOL_RETRYABLE','완성된 장은 보관했어요. 이어서 작성하기를 눌러 주세요.'); }
  }
  return answer();
}
export async function handleHeukwolRoutes(request,env) {
  try {
    const path=new URL(request.url).pathname;
    if(path==='/api/heukwol/pricing' && request.method==='GET')return json({ok:true,pricing:getBillingFeaturePricing({featureKey:HEUKWOL_FEATURE_KEY}).pricing});
    const auth=await requireAuth(request,env); const userId=String(auth.userId);
    if(path==='/api/heukwol/result' && request.method==='GET') {
      const id=new URL(request.url).searchParams.get('id')||'';
      const doc=await readOwned(env,userId,id);
      return doc?json(visible(doc)):error(404,'RESULT_NOT_AVAILABLE','리포트를 찾을 수 없어요.');
    }
    if(request.method!=='POST')return error(405,'METHOD_NOT_ALLOWED','지원하지 않는 요청이에요.');
    const body=await readJson(request);
    if(path==='/api/heukwol/continue')return advanceHeukwol(env,userId,String(body.id||''));
    if(!['/api/heukwol/prepare','/api/heukwol/start'].includes(path))return error(404,'NOT_FOUND','화면을 찾을 수 없어요.');
    const requestId=String(body.requestId||'');
    if(!/^[A-Za-z0-9:_-]{8,120}$/.test(requestId))return error(400,'INVALID_REQUEST','상담 요청을 다시 준비해 주세요.');
    const input={profileId:String(body.profileId||''),year:Number(body.year),question:String(body.question||'').trim()};
    if(input.question.length<12 || input.question.length>3000)return error(400,'INVALID_QUESTION','고민을 12~3,000자로 적어 주세요.');
    const id=executionKey(requestId),inputHash=digest(input);
    await connectDb(env);
    const existing=await ServiceExecutionTransaction.findOne({userId,executionKey:id,featureKey:HEUKWOL_FEATURE_KEY}).lean();
    if(existing) {
      if(await isStoredPaidResultRevoked(userId,HEUKWOL_FEATURE_KEY,existing))return error(404,'RESULT_NOT_AVAILABLE','리포트를 찾을 수 없어요.');
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
        ...(heukwolDeliveryV2Enabled(env)?{deliveryPlanVersion:HEUKWOL_DELIVERY_PLAN_VERSION,skippedChapters:[],lastIssue:''}:{}),
        archive:{title:`${input.year} 흑월의 경고`,year:input.year,reportId:id,status:'generating'},
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
