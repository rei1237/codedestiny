import {ProfileCard} from '../lib/models.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {buildHeukwolAnalysis,heukwolProfileBirth} from '../lib/heukwol-analysis.js';
import {HEUKWOL_FEATURE_KEY,HEUKWOL_CHAPTERS,HEUKWOL_MIN_CHARS,HEUKWOL_DELIVERY_PLAN_VERSION,HEUKWOL_TRANSIENT_ATTEMPTS,heukwolDeliveryV2Enabled,generateHeukwolChapter,isHeukwolTransientError} from '../lib/heukwol-report.js';
import {TossNativeConsultation} from './models.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {TossError} from './policy.js';
import {hash} from './crypto.js';
import {retryRefundAt} from '../lib/paid-delivery-stuck.js';

const owner=auth=>nativeOwnerFilter(auth,'heukwol');
export async function prepareHeukwol(env,auth,body,orderId){
  const requestId=String(body?.requestId||''),profileId=String(body?.profileId||''),year=Number(body?.year),question=String(body?.question||'').trim();
  if(!/^[A-Za-z0-9:_-]{8,120}$/.test(requestId)||!profileId||!Number.isInteger(year)||question.length<12||question.length>3000)throw new TossError('INVALID_INPUT',400);
  const input={requestId,profileId,year,question},inputHash=await hash(JSON.stringify(input));
  const previous=await TossNativeConsultation.findOne({...owner(auth),requestId}).lean();
  const pricing=getBillingFeaturePricing({featureKey:HEUKWOL_FEATURE_KEY}).pricing;
  const contract={requestId,inputHash,resultId:requestId,featureKey:HEUKWOL_FEATURE_KEY,pricing};
  if(previous)return prepareNativeConsultation(env,auth,input,orderId,contract,'heukwol');
  const card=await ProfileCard.findOne({userId:auth.ownerId,profileId}).lean();
  if(!card)throw new TossError('PROFILE_REQUIRED',400);
  let analysis;
  try{analysis=buildHeukwolAnalysis(heukwolProfileBirth(card),year,undefined,{env});}
  catch(e){throw new TossError(e.message==='HEUKWOL_BIRTH_TIME_REQUIRED'?'BIRTH_TIME_REQUIRED':'INVALID_INPUT',400);}
  return prepareNativeConsultation(env,auth,{...input,analysis,planVersion:heukwolDeliveryV2Enabled(env)?HEUKWOL_DELIVERY_PLAN_VERSION:1},orderId,contract,'heukwol');
}
export function heukwolView(row){
  const progress=row.savedResult||{},chapters=progress.chapters||[];
  const report=progress.completedAt?{reportId:row._id,title:row.input.year+' 흑월의 경고',year:row.input.year,question:row.input.question,
    analysis:row.input.analysis,totalChars:chapters.reduce((sum,c)=>sum+c.totalChars,0),chapters,generatedAt:progress.completedAt}:null;
  return {ok:true,id:row._id,year:row.input.year,status:report?'completed':progress.failed?'failed':'generating',
    completedChapters:chapters.length,totalChapters:HEUKWOL_CHAPTERS.length,...(report?{report}:{}),
    ...(progress.failed&&progress.failedAt&&Date.parse(progress.retryUntil)>Date.now()?{retryGeneration:progress.failedAt}:{})};
}
// Only an explicit owner action reopens a terminal wave. A replay of the same action
// cannot reset a later failure or discard work written by a concurrent reader.
export async function retryHeukwolGeneration(env,auth,id,failure){
  const filter={...owner(auth),_id:id};
  const row=await verifiedIntent(env,auth,await TossNativeConsultation.findOne(filter).lean());
  const current=heukwolView(row);
  if(!current.retryGeneration||failure!==current.retryGeneration)return current;
  const savedResult={...row.savedResult,failed:false,failedAt:null,rounds:{},attempts:0,transient:0};
  const reopened=await TossNativeConsultation.findOneAndUpdate({...filter,status:'paid',generationStartedAt:null,savedResult:row.savedResult},
    {$set:{savedResult}},{new:true}).lean();
  const verified=await verifiedIntent(env,auth,reopened||await TossNativeConsultation.findOne(filter).lean());
  return heukwolView(verified);
}
export async function heukwolLibraryItem(env,auth,purchase){
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/heukwol/?consult=1&orderId='+encodeURIComponent(purchase._id)};
  const row=await TossNativeConsultation.findOne({...owner(auth),_id:purchase.requestId,orderId:purchase._id}).lean();
  await verifiedIntent(env,auth,row);
  const state=heukwolView(row).status;
  return {state:state==='completed'?'COMPLETED':state==='failed'?'GENERATION_FAILED':'PENDING',resultId:row._id,
    href:'/heukwol/?result='+encodeURIComponent(row._id),question:row.input.question};
}
// One bounded wave. A generation lease fences stale responses after timeout or refund.
export async function heukwolWave(env,auth,id,advance){
  const filter={...owner(auth),_id:id};
  const row=await TossNativeConsultation.findOne(filter).lean();
  await verifiedIntent(env,auth,row);
  const current=heukwolView(row);
  if(!advance||current.status!=='generating')return current;
  const started=new Date(),older=new Date(+started-180000);
  const locked=await TossNativeConsultation.findOneAndUpdate({...filter,status:'paid',savedResult:row.savedResult??null,
    $or:[{generationStartedAt:null},{generationStartedAt:{$lt:older}}]},{$set:{generationStartedAt:started}},{new:true}).lean();
  if(!locked)return current;
  // S16(2026-11-19): 2판도 장을 건너뛰지 않는다. 라운드(3번 시도)를 다 쓴 장은 다음 라운드에 다시 쓰고,
  // 라운드 3번을 넘기면 본문 없이 실패(GENERATION_FAILED)로 닫는다. 27장이 다 채워졌을 때만 완료로 전달한다.
  // 옛 진행 중 행의 skipped 장은 다시 대기 장으로 돌아간다. 이미 completedAt 이 있는 저장본은 heukwolView 가 그대로 연다.
  const progress=locked.savedResult||{},chapters=[...(progress.chapters||[])],rounds={...(progress.rounds||{})};
  const next=HEUKWOL_CHAPTERS.find(c=>!chapters.some(done=>done.key===c.key));
  const v2=locked.input.planVersion===HEUKWOL_DELIVERY_PLAN_VERSION;
  let attempts=progress.attempts||0,transient=Number(progress.transient||0),failed=false,lastIssue='';
  try{
    if(next)chapters.push(await generateHeukwolChapter(env,locked.input.analysis,next,locked.input.question,chapters,undefined,
      {deliveryPlanVersion:locked.input.planVersion,relaxed:attempts>=1,finalAttempt:attempts>=2,repairIssue:progress.lastIssue||''}));
    attempts=0;transient=0;
  }catch(e){
    lastIssue=String(e.heukwolIssue||'').slice(0,120);
    // R6b: 공급자·일시 오류(응답 없음·타임아웃·JSON 파싱 실패)는 품질 시도를 깎지 않고 별도 상한 안에서 다시 시도한다.
    // 상한을 넘긴 일시 오류는 품질 시도로 센다(fail-closed, 무한 반복 없음).
    if(isHeukwolTransientError(e)&&transient<HEUKWOL_TRANSIENT_ATTEMPTS)transient++;
    else attempts++;
    if(attempts>=3){
      if(v2&&next){rounds[next.key]=(rounds[next.key]||0)+1;if(rounds[next.key]>=3)failed=true;else attempts=0;}
      else failed=true;
    }
  }
  // Reopening keeps the original delivery window. Older, ongoing orders use their
  // original intent timestamp when no first-wave checkpoint exists.
  const retryUntil=progress.retryUntil||retryRefundAt({createdAt:row.savedResult&&row.createdAt||started}).toISOString();
  const savedResult={chapters,rounds,attempts,transient,lastIssue,failed,retryUntil};
  if(failed&&next)savedResult.failedAt=new Date().toISOString();
  if(!failed&&chapters.length===HEUKWOL_CHAPTERS.length){
    const totalChars=chapters.reduce((sum,c)=>sum+c.totalChars,0);
    if(!v2&&totalChars<HEUKWOL_MIN_CHARS)savedResult.failed=true;
    else savedResult.completedAt=new Date().toISOString();
  }
  await verifiedIntent(env,auth,locked);
  const latest=await TossNativeConsultation.findOneAndUpdate({...filter,status:'paid',generationStartedAt:started},
    {$set:{savedResult,generationStartedAt:null}},{new:true}).lean();
  const verified=await verifiedIntent(env,auth,latest||await TossNativeConsultation.findOne(filter).lean());
  return heukwolView(verified);
}
