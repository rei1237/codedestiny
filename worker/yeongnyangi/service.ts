import {resolveConsultationKind,consultationManifest} from './fortune/consultation-kinds';
import {readingCharts} from './fortune/reading-presentation';
import { READING_VERSION, READING_V5_VERSION, READING_V6_VERSION, readingChapterCount } from './fortune/reading-policy';
import {validateSpiritInput,spiritPublic,spiritManifest,spiritEvidence} from './fortune/spirit';
import {validateSkyInput,skyMoment,calculateQuestionSky} from './fortune/question-sky';
import {skyModes,skyTopics,SKY_IMAGE,SKY_TIMING} from './fortune/question-sky-contract';
import {skyManifest} from './fortune/question-sky-reading';
import {SPIRIT_MODE,SPIRIT_TITLE,SPIRIT_IMAGE,spiritTopics} from './fortune/spirit-contract';
import { ProfileCard } from '../lib/models.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { getEnv } from '../lib/env.js';
import { resolveChargeAmountKRW } from '../lib/portone.js';
import { domains } from './fortune';
import { getProduct } from './payments/catalog';
import { analyze } from './fortune/analysis';
import { readingManifest, questionFactSelectors } from './fortune/reading-manifest';
import { computeCrossDaily } from './fortune/daily-cross';
import { consultationClock, createConsultation } from './fortune/consultation';
import { enqueueConsultation } from './queue.js';
import { FortuneError, type DomainContext, type DomainId } from './fortune/shared/contracts';
import { CodeDestinyProvider } from './providers/code-destiny';
import { StructuredChapterProvider, validateChapter } from './providers/chapter';
import { createRequest, readRequest, attachPayment, claimChapter, finishChapter, failChapter, ownerId } from './repository.js';

const hasRequestAccess=(row:any)=>Boolean(row?.paymentId||row?.accessMethod==='FAMILY'||row?.passEvidenceId);

export function providerReady(env: Record<string, unknown>) {
  return Boolean(getEnv(env,'GEMINIF_API_KEY')) && getEnv(env,'LLM_DRY_RUN') !== 'true';
}
async function digest(value: unknown) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
function consultationAttempt(body: any) {
  if(body.consultationAttemptId===undefined)return {};
  if(typeof body.consultationAttemptId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.consultationAttemptId))throw new FortuneError('INVALID_CONSULTATION_ATTEMPT');
  return {consultationAttemptId:body.consultationAttemptId};
}
function birthFromProfile(profile: any, timeUnknown: boolean, supplement: any = {}) {
  const b=profile.birth || {}, place=profile.location || {};
  timeUnknown = timeUnknown || (b.timeUnknown === true && !supplement.birthTime);
  const pad=(n: number)=>String(n).padStart(2,'0');
  return {birthDate:`${b.year}-${pad(b.month)}-${pad(b.day)}`,
    ...(!timeUnknown?{birthTime:b.timeUnknown===true && supplement.birthTime ? supplement.birthTime : `${pad(b.hour)}:${pad(b.minute)}`} : {}),
    calendarType:b.calType==='solar'?'solar':'lunar',leapMonth:b.calType==='lunar_leap',
    gender:profile.gender==='M'?'male':profile.gender==='F'?'female':undefined,
    ...(place.label ? {birthPlace:{name:place.label,latitude:place.lat,longitude:place.lng,timezone:place.tz}} : supplement.birthPlace ? {birthPlace:supplement.birthPlace} : {}),
  };
}

export async function prepareFortune(env: Record<string, unknown>, userId: string, body: any) {
  const attempt=consultationAttempt(body);
  const product=getProduct(body.productId);
  if(Object.hasOwn(skyModes,body.mode))return prepareQuestionSky(env,userId,body);
  if(body.mode && body.mode!==SPIRIT_MODE)throw new FortuneError('INVALID_READING_MODE');
  const spiritInput=body.mode===SPIRIT_MODE?validateSpiritInput(body):undefined;
  if(spiritInput){product.manifestVersion=READING_VERSION;product.chapterCount=readingChapterCount(product.domain,product.fishId,READING_VERSION);}
  const kind=resolveConsultationKind(product,body.consultationKind);
  if(kind){
    if(kind.partner&&!body.partnerProfileId)throw new FortuneError('PARTNER_REQUIRED');
    if(!kind.partner&&body.partnerProfileId)throw new FortuneError('PARTNER_NOT_SUPPORTED');
    body={...body,topicId:kind.id==='ask'?body.topicId:kind.topic,question:kind.question?body.question:''};
    if(kind.question&&!(typeof body.question==='string'&&body.question.trim()))throw new FortuneError('QUESTION_REQUIRED');
  }
  if (!providerReady(env)) throw new FortuneError('LLM_NOT_CONFIGURED',503);
  if (product.domain==='tarot' && product.readingKind==='single') body={...body,profileId:'tarot-question'};
  if (typeof body.profileId !== 'string' || !body.profileId || body.profileId.length>80) throw new FortuneError('PROFILE_REQUIRED');
  await connectDb(env);
  const profile=body.profileId==='tarot-question' && product.domain==='tarot' ? {updatedAt:null} : await withMongoRetry(env,()=>ProfileCard.findOne({userId:ownerId(userId),profileId:body.profileId}).lean());
  if (!profile) throw new FortuneError('PROFILE_NOT_FOUND',404);
  if(body.partnerProfileId && (!['sukuyo',...(kind?.partner?['saju']:[])].includes(product.domain)||product.readingKind!=='single')) throw new FortuneError('PARTNER_NOT_SUPPORTED');
  let partner;
  if (body.partnerProfileId) {
    if(body.partnerProfileId===body.profileId)throw new FortuneError('DISTINCT_PARTNER_REQUIRED');
    if(typeof body.partnerProfileId!=='string'||body.partnerProfileId.length>80) throw new FortuneError('INVALID_PROFILE');
    partner=await withMongoRetry(env,()=>ProfileCard.findOne({userId:ownerId(userId),profileId:body.partnerProfileId}).lean());
    if(!partner) throw new FortuneError('PROFILE_NOT_FOUND',404);
  }
  const raw={personA:birthFromProfile(profile,body.timeUnknown===true,body.birthDetails || {}),
    ...(partner?{personB:birthFromProfile(partner,body.partnerTimeUnknown===true)}:{}),
    question:body.question,topicId:body.topicId,readingMode:partner?'compatibility':'personal'};
  const normalized=Object.fromEntries(product.systems.map(id=>[id,domains[id].validateInput(raw)]));
  for(const input of Object.values(normalized)) {
    for(const person of [input.personA,input.personB])if(person && ['flounder','tuna'].includes(product.fishId) &&
      (!person.birthTime || !person.birthPlace || !person.gender)) throw new FortuneError('PREMIUM_BIRTH_REQUIRED');
  }
  const now=new Date();
  const clock=consultationClock(body.timezone,now);
  const date=clock.asOf;
  const fingerprint=await digest({productId:product.id,priceKRW:product.priceKRW,profileId:body.profileId,normalized,date,timezone:clock.timezone,consultationVersion:1,...(product.manifestVersion===READING_V6_VERSION?{manifestVersion:product.manifestVersion}:{}),...(kind?{consultationKind:kind.id,kindVersion:1}:{}),...(spiritInput?{mode:SPIRIT_MODE,spiritInput}:{})});
  const id=await digest({userId,fingerprint,...attempt});
  // A new form starts a separate purchase; retries in that form keep the same intent.
  // Clients without an attempt retain their original deterministic recovery identity.
  const contexts: Partial<Record<DomainId,DomainContext>>={};
  // Free questions also read the 꿀꿀 daily systems; started first so Swiss latency overlaps the domain calculations.
  const crossDaily=(!kind||kind.question)&&!spiritInput?computeCrossDaily(env,raw,date,product.systems):Promise.resolve([]);
  for(const system of product.systems) contexts[system]=domains[system].buildContext(await domains[system].calculate(normalized[system],{runtimeEnv:env,asOf:date,tarotFusion:product.readingKind!=='single'}));
  const analysis={...analyze(contexts),question:normalized[product.domain].question,topicId:normalized[product.domain].topicId,readingMode:raw.readingMode,asOf:date};
  let manifest=readingManifest(product,analysis.topicId,raw.readingMode,spiritInput?READING_VERSION:product.manifestVersion);
  if(kind)manifest=consultationManifest(product,kind,analysis.topicId);
  if(spiritInput)manifest=spiritManifest(manifest);
  analysis.consultation=createConsultation(body.question || '',analysis.topicId || 'general',clock,manifest);
  if(kind){analysis.consultation.consultationKind=kind.id;analysis.consultation.kindVersion=1;analysis.consultation.kindLabel=kind.label;if(!kind.question)analysis.consultation.period={kind:'default',label:kind.professional?'저장된 계산 기준의 현재 시기와 다음 전환':'출생 성향과 선택한 상담의 조건'};}
  if(!kind||kind.question){
  // Questions are answered before the fixed outline, without reducing paid depth.
  manifest[0].focus='사용자가 입력한 모든 질문에 먼저 직접 답하고 선택 주제와 연결해 해석한다. 질문이 없으면 선택 주제의 핵심 흐름부터 설명한다.';
  manifest[0].excludes=[];
  manifest[0].systems=product.systems;
  const cross=await crossDaily;
  contexts[product.domain]!.facts.push(...cross);
  manifest[0].factSelectors=questionFactSelectors(product.systems,analysis.question || '',analysis.topicId || 'general',cross.map(f=>f.label));
  manifest[0].periodScope='저장된 상담의 기준일과 요청 기간을 다룬다. 해당 기간의 계산 근거가 없으면 실천·점검 기간으로 명시한다. 오늘의 일진·일운·판창가·수비학은 기준일 하루의 근거이고, 세운·월운은 해당 연·월의 근거다. 하루 근거를 다른 날짜나 장기 예측으로 늘리지 않는다.';
  if(!manifest[0].sections)manifest[0].requiredSections=[...(manifest[0].requiredSections || []),'관련 시기'];
  }
  if(spiritInput){
    spiritEvidence(contexts.saju!);
    analysis.consultation.spirit=spiritPublic(spiritInput,now.toISOString(),contexts.saju);
    analysis.consultation.topicLabel=spiritTopics[spiritInput.topic];
    analysis.consultation.period={kind:'default',label:'질문자의 출생 성향과 선택 조건 · 사건 시기 예측 없음'};
    manifest=spiritManifest(manifest);
    product.name=SPIRIT_TITLE;product.image=SPIRIT_IMAGE;
  }
  return createRequest(env,userId,id,{profileId:body.profileId,productId:product.id,featureKey:product.cdFeatureKey,
    amountKRW:product.priceKRW,fingerprint,snapshot:{product,analysis,manifest,profileUpdatedAt:profile.updatedAt,...(spiritInput?{normalized}: {})}});
}

async function prepareQuestionSky(env:Record<string,unknown>,userId:string,body:any){
  if(body.mode==='horary-v1')throw new FortuneError('HORARY_FREE_PROMPT_REQUIRED');
  const input=validateSkyInput(body);
  const product=getProduct('saju_flounder');
  const fingerprint=await digest({input,priceKRW:product.priceKRW,version:'question-sky-flounder-2'});
  const id=await digest({userId,fingerprint,...consultationAttempt(body)});
  await connectDb(env);
  // Existing paid or partial snapshots always win, even when a provider is down
  // or a later version changes the interpretation. Never recalculate a purchase.
  try{return await readRequest(env,userId,id);}catch(error:any){if(error?.code!=='FORTUNE_NOT_FOUND')throw error;}
  if(!providerReady(env))throw new FortuneError('LLM_NOT_CONFIGURED',503);
  const moment=skyMoment(input);
  const calculated=await calculateQuestionSky(env,input,moment);
  product.manifestVersion=READING_V5_VERSION;product.chapterCount=readingChapterCount(product.domain,product.fishId,READING_VERSION);
  const clock=consultationClock(moment.timezone,moment.date);
  const context=calculated.context;
  calculated.publicData.evidenceVersion='question-sky-flounder-2';
  context.facts.push({id:`${context.domain}.question-calculation`,label:'프라슈나 계산 근거',value:{method:'Lahiri sidereal / Whole Sign',chart:calculated.chart,judgements:calculated.audit,limits:['위계는 본궁·고양·손상·추락만 산출','실제 감정·소재지·사건 시기의 관측 아님']}});
  const manifest=skyManifest(readingManifest(product,'general','personal',READING_VERSION),context);
  const consultation=createConsultation(input.question,input.topic,clock,manifest);
  consultation.questionSky=calculated.publicData;
  consultation.topicLabel=skyTopics[input.topic];
  consultation.period={kind:'default',label:SKY_TIMING};
  const analysis={contexts:{[context.domain]:context},signals:[],themes:[],question:input.question,topicId:input.topic,asOf:clock.asOf,consultation};
  product.name=skyModes[input.mode];product.image=SKY_IMAGE;
  // New purchases use the registry flounder contract; old snapshots are never rewritten.
  return createRequest(env,userId,id,{profileId:'question-sky',productId:product.id,featureKey:product.cdFeatureKey,amountKRW:product.priceKRW,fingerprint,
    snapshot:{product,analysis,manifest,input,questionMoment:{...moment,date:moment.date.toISOString()},calculation:{raw:calculated.raw,audit:calculated.audit,moonMotion:calculated.moonMotion}}});
}

export async function activateFortune(env: Record<string, unknown>, userId: string, requestId: string) {
  const request=await readRequest(env,userId,requestId);
  const currentProduct=getProduct(request.productId);
  const row=await attachPayment(env,userId,requestId,resolveChargeAmountKRW(env,request.amountKRW),{currentAmountKRW:currentProduct.priceKRW});
  await enqueueConsultation(env,row);
  return row;
}

export async function generateNextChapter(env: Record<string, unknown>, userId: string, requestId: string, source: 'queue'|'scheduled' = 'queue') {
  if (!providerReady(env)) throw new FortuneError('LLM_NOT_CONFIGURED',503);
  const {row,token}=await claimChapter(env,userId,requestId,source);
  if(!token) return row;
  const ordinal=row.chapters.length;
  const startedAt=Date.now();let stage='provider';
  try {
    const repair=Number(row.chapterAttempts?.[ordinal] || 0)>1 && row.lastFailure?.stage==='quality'
      ? {code:row.lastFailure.code}:undefined;
    const input={chapter:row.snapshot.manifest[ordinal],analysis:row.snapshot.analysis,previous:row.chapters,repair};
    if(!input.chapter) throw new FortuneError('INVALID_MANIFEST',500);
    const provider=new StructuredChapterProvider(new CodeDestinyProvider(env));
    const generated=await provider.generateChapter(input);
    stage='quality';
    const result=validateChapter(generated,input);
    stage='storage';
    const completed=await finishChapter(env,userId,requestId,token,ordinal,result,row.snapshot.manifest.length);
    if(!completed) throw new FortuneError('GENERATION_LEASE_LOST',409);
    return completed;
  } catch(error) {
    const code=error instanceof FortuneError?error.code:stage==='storage'?'RESULT_STORAGE_UNAVAILABLE':'GENERATION_FAILED';
    const detail=error instanceof FortuneError?error.detail:undefined;
    console.warn('[yeongnyangi-generation]',JSON.stringify({requestId,chapter:ordinal,stage,durationMs:Date.now()-startedAt,code,detail}));
    const allowedAttempts=3+Number(row.manualRecoveryGrants?.[ordinal] || 0);
    try { await failChapter(env,userId,requestId,token,code,row.chapterAttempts?.[ordinal] || 1,stage,allowedAttempts,detail); }
    catch { console.warn('[yeongnyangi-generation]',JSON.stringify({requestId,chapter:ordinal,stage:'failure_checkpoint',code})); }
    throw error;
  }
}

export function presentFortune(row: any) {
  const symbolic=Boolean(row.snapshot.analysis.consultation?.spirit||row.snapshot.analysis.consultation?.questionSky);
  const complete=row.state==='COMPLETED',blocked=row.state==='REFUNDED'||['PAYMENT_NOT_ACTIVE','GENERATION_REVIEW_REQUIRED'].includes(row.errorCode);
  const recovery={requestId:String(row._id),savedChapters:row.chapters.length,totalChapters:row.snapshot.manifest.length,
    providerNeeded:!complete&&row.chapters.length<row.snapshot.manifest.length,retryable:!complete&&!blocked,
    canRetryNow:row.errorCode==='AUTOMATIC_RECOVERY_STOPPED',nextAction:complete?'reread':blocked?'support':row.errorCode==='AUTOMATIC_RECOVERY_STOPPED'?'retry':'wait'};
  return {id:row._id,profileId:row.profileId,productId:row.productId,state:row.state,
    charts:!symbolic && hasRequestAccess(row) && row.state!=='REFUNDED'?readingCharts(row.snapshot.analysis,row.snapshot.manifest):undefined,
    paid:hasRequestAccess(row),accessMethod:row.accessMethod || (row.paymentId?'DIRECT_KRW':undefined),product:row.snapshot.product,manifest:symbolic ? row.snapshot.manifest.map(({id,title,ordinal,part}:any)=>({id,title,ordinal,part})) : row.snapshot.manifest,
    consultation:row.snapshot.analysis.consultation || {topicId:row.snapshot.analysis.topicId || 'general',question:row.snapshot.analysis.question || '',asOf:row.snapshot.analysis.asOf},
    chapters:row.state==='REFUNDED'?[]:symbolic ? row.chapters.map(({summary,analysis,example,advice,persona,highlights,topics,blocks,questionAnswers}:any)=>({summary,analysis,example,advice,persona,highlights,topics,blocks,questionAnswers,sources:[]})) : row.chapters,recovery,errorCode:row.errorCode,createdAt:row.createdAt,completedAt:row.completedAt};
}
