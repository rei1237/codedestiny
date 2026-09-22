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
import { consultationClock, createConsultation } from './fortune/consultation';
import { enqueueConsultation } from './queue.js';
import { FortuneError, type DomainContext, type DomainId } from './fortune/shared/contracts';
import { CodeDestinyProvider } from './providers/code-destiny';
import { StructuredChapterProvider, validateChapter } from './providers/chapter';
import { createRequest, readRequest, attachPayment, claimChapter, finishChapter, failChapter, ownerId } from './repository.js';

export function providerReady(env: Record<string, unknown>) {
  return Boolean(getEnv(env,'GEMINIF_API_KEY')) && getEnv(env,'LLM_DRY_RUN') !== 'true';
}
async function digest(value: unknown) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
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
  const product=getProduct(body.productId);
  if(Object.hasOwn(skyModes,body.mode))return prepareQuestionSky(env,userId,body);
  if(body.mode && body.mode!==SPIRIT_MODE)throw new FortuneError('INVALID_READING_MODE');
  const spiritInput=body.mode===SPIRIT_MODE?validateSpiritInput(body):undefined;
  if (!providerReady(env)) throw new FortuneError('LLM_NOT_CONFIGURED',503);
  if (product.domain==='tarot' && product.readingKind==='single') body={...body,profileId:'tarot-question'};
  if (typeof body.profileId !== 'string' || !body.profileId || body.profileId.length>80) throw new FortuneError('PROFILE_REQUIRED');
  await connectDb(env);
  const profile=body.profileId==='tarot-question' && product.domain==='tarot' ? {updatedAt:null} : await withMongoRetry(env,()=>ProfileCard.findOne({userId:ownerId(userId),profileId:body.profileId}).lean());
  if (!profile) throw new FortuneError('PROFILE_NOT_FOUND',404);
  if(body.partnerProfileId && (product.domain!=='sukuyo'||product.readingKind!=='single')) throw new FortuneError('PARTNER_NOT_SUPPORTED');
  let partner;
  if (body.partnerProfileId) {
    if(typeof body.partnerProfileId!=='string'||body.partnerProfileId.length>80) throw new FortuneError('INVALID_PROFILE');
    partner=await withMongoRetry(env,()=>ProfileCard.findOne({userId:ownerId(userId),profileId:body.partnerProfileId}).lean());
    if(!partner) throw new FortuneError('PROFILE_NOT_FOUND',404);
  }
  const raw={personA:birthFromProfile(profile,body.timeUnknown===true,body.birthDetails || {}),
    ...(partner?{personB:birthFromProfile(partner,body.partnerTimeUnknown===true)}:{}),
    question:body.question,topicId:body.topicId,readingMode:partner?'compatibility':'personal'};
  const normalized=Object.fromEntries(product.systems.map(id=>[id,domains[id].validateInput(raw)]));
  for(const input of Object.values(normalized)) {
    if(input.personA && ['flounder','tuna'].includes(product.fishId) &&
      (!input.personA.birthTime || !input.personA.birthPlace || !input.personA.gender)) throw new FortuneError('PREMIUM_BIRTH_REQUIRED');
  }
  const now=new Date();
  const clock=consultationClock(body.timezone,now);
  const date=clock.asOf;
  const fingerprint=await digest({productId:product.id,profileId:body.profileId,normalized,date,timezone:clock.timezone,consultationVersion:1,...(spiritInput?{mode:SPIRIT_MODE,spiritInput}:{})});
  const id=await digest({userId,fingerprint});
  // Deterministic intent also survives losing all browser storage and returning with the same inputs.
  const contexts: Partial<Record<DomainId,DomainContext>>={};
  for(const system of product.systems) contexts[system]=domains[system].buildContext(await domains[system].calculate(normalized[system],{runtimeEnv:env,asOf:date,tarotFusion:product.readingKind!=='single'}));
  const analysis={...analyze(contexts),question:normalized[product.domain].question,topicId:normalized[product.domain].topicId,readingMode:raw.readingMode,asOf:date};
  let manifest=readingManifest(product,analysis.topicId,raw.readingMode);
  if(spiritInput)manifest=spiritManifest(manifest);
  analysis.consultation=createConsultation(body.question || '',analysis.topicId || 'general',clock,manifest);
  // Questions are answered before the fixed outline, without reducing paid depth.
  manifest[0].focus='사용자가 입력한 모든 질문에 먼저 직접 답하고 선택 주제와 연결해 해석한다. 질문이 없으면 선택 주제의 핵심 흐름부터 설명한다.';
  manifest[0].excludes=[];
  manifest[0].systems=product.systems;
  manifest[0].factSelectors=questionFactSelectors(product.systems,analysis.question || '',analysis.topicId || 'general');
  manifest[0].periodScope='저장된 상담의 기준일과 요청 기간을 다룬다. 해당 기간의 계산 근거가 없으면 실천·점검 기간으로 명시한다.';
  manifest[0].requiredSections=[...(manifest[0].requiredSections || []),'관련 시기'];
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
  const input=validateSkyInput(body);
  const fingerprint=await digest({input,version:'question-sky-1'});
  const id=await digest({userId,fingerprint});
  await connectDb(env);
  // Existing paid or partial snapshots always win, even when a provider is down
  // or a later version changes the interpretation. Never recalculate a purchase.
  try{return await readRequest(env,userId,id);}catch(error:any){if(error?.code!=='FORTUNE_NOT_FOUND')throw error;}
  if(!providerReady(env))throw new FortuneError('LLM_NOT_CONFIGURED',503);
  const moment=skyMoment(input);
  const calculated=await calculateQuestionSky(env,input,moment);
  const product=getProduct('saju_mackerel');
  const clock=consultationClock(moment.timezone,moment.date);
  const context=calculated.context;
  const manifest=skyManifest(readingManifest(product),context);
  const consultation=createConsultation(input.question,input.topic,clock,manifest);
  consultation.questionSky=calculated.publicData;
  consultation.topicLabel=skyTopics[input.topic];
  consultation.period={kind:'default',label:SKY_TIMING};
  const analysis={contexts:{[context.domain]:context},signals:[],themes:[],question:input.question,topicId:input.topic,asOf:clock.asOf,consultation};
  product.name=skyModes[input.mode];product.image=SKY_IMAGE;
  // Price/feature/receipt remain the existing five-chapter product contract.
  return createRequest(env,userId,id,{profileId:'question-sky',productId:product.id,featureKey:product.cdFeatureKey,amountKRW:product.priceKRW,fingerprint,
    snapshot:{product,analysis,manifest,input,questionMoment:{...moment,date:moment.date.toISOString()},calculation:{raw:calculated.raw,audit:calculated.audit,moonMotion:calculated.moonMotion}}});
}

export async function activateFortune(env: Record<string, unknown>, userId: string, requestId: string) {
  const request=await readRequest(env,userId,requestId);
  const row=await attachPayment(env,userId,requestId,resolveChargeAmountKRW(env,request.amountKRW));
  await enqueueConsultation(env,row);
  return row;
}

export async function generateNextChapter(env: Record<string, unknown>, userId: string, requestId: string) {
  if (!providerReady(env)) throw new FortuneError('LLM_NOT_CONFIGURED',503);
  const {row,token}=await claimChapter(env,userId,requestId);
  if(!token) return row;
  const ordinal=row.chapters.length;
  const startedAt=Date.now();let stage='provider';
  try {
    if(row.attempts>row.snapshot.manifest.length*3+(row.snapshot.analysis.consultation?.spirit||row.snapshot.analysis.consultation?.questionSky?0:(row.additionalAttempts || 0))) throw new FortuneError('GENERATION_REVIEW_REQUIRED',409);
    if((row.chapterAttempts?.[ordinal] || 1)>3) throw new FortuneError('AUTOMATIC_RECOVERY_STOPPED',409);
    const input={chapter:row.snapshot.manifest[ordinal],analysis:row.snapshot.analysis,previous:row.chapters};
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
    console.warn('[yeongnyangi-generation]',JSON.stringify({requestId,chapter:ordinal,stage,durationMs:Date.now()-startedAt,code:error instanceof FortuneError?error.code:'GENERATION_FAILED'}));
    await failChapter(env,userId,requestId,token,error instanceof FortuneError?error.code:'GENERATION_FAILED',row.chapterAttempts?.[ordinal] || 1);
    throw error;
  }
}

export function presentFortune(row: any) {
  const symbolic=Boolean(row.snapshot.analysis.consultation?.spirit||row.snapshot.analysis.consultation?.questionSky);
  return {id:row._id,profileId:row.profileId,productId:row.productId,state:row.state,
    paid:Boolean(row.paymentId),product:row.snapshot.product,manifest:symbolic ? row.snapshot.manifest.map(({id,title,ordinal,part}:any)=>({id,title,ordinal,part})) : row.snapshot.manifest,
    consultation:row.snapshot.analysis.consultation || {topicId:row.snapshot.analysis.topicId || 'general',question:row.snapshot.analysis.question || '',asOf:row.snapshot.analysis.asOf},
    chapters:row.state==='REFUNDED'?[]:symbolic ? row.chapters.map(({summary,analysis,example,advice,persona,highlights,topics,blocks,questionAnswers}:any)=>({summary,analysis,example,advice,persona,highlights,topics,blocks,questionAnswers,sources:[]})) : row.chapters,errorCode:row.errorCode,createdAt:row.createdAt,completedAt:row.completedAt};
}
