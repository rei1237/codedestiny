import {ProfileCard} from '../lib/models.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {buildHeukwolAnalysis,heukwolProfileBirth} from '../lib/heukwol-analysis.js';
import {HEUKWOL_FEATURE_KEY,HEUKWOL_CHAPTERS,HEUKWOL_MIN_CHARS,HEUKWOL_DELIVERY_PLAN_VERSION,heukwolDeliveryV2Enabled,generateHeukwolChapter} from '../lib/heukwol-report.js';
import {TossNativeConsultation} from './models.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {TossError} from './policy.js';
import {hash} from './crypto.js';

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
    completedChapters:chapters.length,totalChapters:HEUKWOL_CHAPTERS.length,...(report?{report}:{})};
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
  const progress=locked.savedResult||{},chapters=[...(progress.chapters||[])],skipped=[...(progress.skipped||[])];
  const next=HEUKWOL_CHAPTERS.find(c=>!skipped.includes(c.key)&&!chapters.some(done=>done.key===c.key));
  const v2=locked.input.planVersion===HEUKWOL_DELIVERY_PLAN_VERSION;
  let attempts=progress.attempts||0,failed=false,lastIssue='';
  try{
    if(next)chapters.push(await generateHeukwolChapter(env,locked.input.analysis,next,locked.input.question,chapters,undefined,
      {deliveryPlanVersion:locked.input.planVersion,finalAttempt:attempts>=2,repairIssue:progress.lastIssue||''}));
    attempts=0;
  }catch(e){
    attempts++;lastIssue=String(e.heukwolIssue||'').slice(0,120);
    if(attempts>=3){
      if(v2&&chapters.length){skipped.push(next.key);attempts=0;}
      else failed=true;
    }
  }
  const savedResult={chapters,skipped,attempts,lastIssue,failed};
  if(!failed&&(chapters.length+skipped.length===HEUKWOL_CHAPTERS.length||skipped.length>=3)){
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
