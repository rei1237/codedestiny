import { correctedFortune } from "./reading-correction.js";
import { storedChapterDraft, canResumeStoredChapter } from './stored-chapter.js';
import {conciseReadingManifest} from './fortune/concise-reading';
import { assertSajuPillarClaims } from "../lib/saju-correction.js";
import { SAJU_ENGINE_VERSION, SAJU_POLICY_VERSION } from "../../lib/korean-calendar/index.js";
import {normalizeGrowthAttribution} from '../../lib/marketing/growth-attribution.mjs';
import {resolveConsultationKind,consultationManifest} from './fortune/consultation-kinds';
import {isRelationshipReading,RELATIONSHIP_VERSION,relationshipAliases,validateRelationshipQuestion} from './fortune/relationship-contract';
import {extendRelationshipContext} from './fortune/relationship-calculation';
import {readingLocale,readingOutputContext} from './fortune/reading-locale';
import {TAROT_CONSULTATION_VERSION,chatTarotRules,tarotConsultation,type TarotConsultationId} from './fortune/tarot/consultation-contract';
import {calculateTarotConsultation} from './fortune/tarot/consultation-calculation';
import {withChatTarotVoice} from './fortune/tarot/consultation-evidence';
import {readingCharts} from './fortune/reading-presentation';
import { READING_VERSION, READING_V5_VERSION, READING_V6_VERSION, READING_V7_VERSION, QUESTION_SKY_TWO_STAGE_VERSION, readingChapterCount } from './fortune/reading-policy';
import { v7Applies, type ChapterSpecV7 } from './fortune/reading-v7';
import { resolveV7Ledger } from './fortune/reading-v7-ledger';
import { buildV7TimingMatrix, v7TimingSummaries, withV7Timing } from './fortune/reading-v7-timing';
import {validateSpiritInput,spiritPublic,spiritManifest,spiritEvidence} from './fortune/spirit';
import {validateSkyInput,skyMoment,calculateQuestionSky} from './fortune/question-sky';
import {skyModes,skyTopics,SKY_IMAGE,SKY_TIMING} from './fortune/question-sky-contract';
import {questionSkyTwoStageManifest} from './fortune/question-sky-reading';
import {SPIRIT_MODE,SPIRIT_TITLE,SPIRIT_IMAGE,spiritTopics} from './fortune/spirit-contract';
import { ProfileCard } from '../lib/models.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { getEnv } from '../lib/env.js';
import { resolveChargeAmountKRW } from '../lib/portone.js';
import { domains } from './fortune';
import { getProduct, getChatProduct, resolveStoredProduct, chatTarotKinds } from './payments/catalog';
import { analyze } from './fortune/analysis';
import { readingManifest, questionFactSelectors } from './fortune/reading-manifest';
import {withPreventionReading,withPreventionTiming,preventionEligible,PREVENTION_VERSION} from './fortune/prevention';
import { computeCrossDaily } from './fortune/daily-cross';
import { buildEvidencePacket } from './fortune/ask/packet';
import { extendAskLocalTiming } from './fortune/ask/wrappers';
import { calculateAskTarot } from './fortune/ask/tarot';
import { analyzeAsk, parseAskAnalysis, escapeAskData } from './fortune/ask/analysis';
import type { AskAnalysis } from './fortune/ask/analysis';
import type { EvidencePacket } from './fortune/ask/contracts';
import { consultationClock, createConsultation } from './fortune/consultation';
import { calculateScreenSaju } from './fortune/saju/runtime';
import { parseJongAnswer } from './fortune/saju/jong-check';
import { jongCheckApplies } from './fortune/saju/jong-check-policy';
import { enqueueConsultation } from './queue.js';
import { FortuneError, type DomainContext, type DomainId } from './fortune/shared/contracts';
import { CodeDestinyProvider } from './providers/code-destiny';
import { StructuredChapterProvider, type ChatPersona } from './providers/chapter';
import { deliverChapter } from './providers/delivery';
import { createRequest, readRequest, attachPayment, claimChapter, finishChapter, failChapter, ownerId, saveAskAnalysis, saveChapterDraft, allowedChapterAttempts, holdAutoResumes, userCanRetry, reserveQuestionSkyFollowup } from './repository.js';
import { hasRequestAccess } from './access-methods.js';

/**
 * A v7 snapshot stores its timing matrix once at prepare; every later read re-applies it to the stored
 * context so the rebuilt fact ledger resolves the same IDs prepare assigned. Snapshots without one are
 * returned untouched, so v6 and older requests keep their exact stored analysis.
 */
function snapshotAnalysis(snapshot:any) {
  const matrix=snapshot?.v7Timing;
  if(!matrix)return snapshot.analysis;
  const contexts=snapshot.analysis.contexts;
  return {...snapshot.analysis,contexts:{...contexts,[matrix.domain]:withV7Timing(contexts[matrix.domain],matrix)}};
}

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
    ...(place.tz && Number.isFinite(place.lng) && Number.isFinite(place.lat) ? {birthPlace:{name:place.label,latitude:place.lat,longitude:place.lng,timezone:place.tz}} : supplement.birthPlace ? {birthPlace:supplement.birthPlace} : {}),
  };
}

/** `persona` is a server option of the fortune-chat route; a request body never selects it. */
export async function prepareFortune(env: Record<string, unknown>, userId: string, body: any, {persona}:{persona?:ChatPersona}={}) {
  if(persona&&body.mode)throw new FortuneError('INVALID_READING_MODE');
  const locale=readingLocale(body.locale);
  // Symbolic modes have separate Korean evidence and safety validators.
  if(body.mode && locale!=='ko')throw new FortuneError('READING_LOCALE_UNAVAILABLE');
  const attempt=consultationAttempt(body);
  const product=persona?getChatProduct(body.domain):getProduct(body.productId);
  if(Object.hasOwn(skyModes,body.mode))return prepareQuestionSky(env,userId,body);
  if(body.mode && body.mode!==SPIRIT_MODE)throw new FortuneError('INVALID_READING_MODE');
  const spiritInput=body.mode===SPIRIT_MODE?validateSpiritInput(body):undefined;
  if(spiritInput){product.manifestVersion=READING_VERSION;product.chapterCount=readingChapterCount(product.domain,product.fishId,READING_VERSION);}
  const kind=resolveConsultationKind(product,body.consultationKind);
  // A chat tarot always uses a v2 question spread; any other kind would leave the chat on an older tarot contract.
  if(persona&&product.domain==='tarot'&&!(chatTarotKinds as readonly string[]).includes(kind?.id||''))throw new FortuneError('INVALID_CONSULTATION_KIND');
  const relationship=isRelationshipReading(product.domain,kind?.id)&&product.readingKind==='single';
  const tarotSpec=product.domain==='tarot'&&product.readingKind==='single'?tarotConsultation(kind?.id):undefined;
  const tarotV2=Boolean(tarotSpec);
  if(kind?.koOnly&&locale!=='ko')throw new FortuneError('READING_LOCALE_UNAVAILABLE');
  const relationshipQuestionId=validateRelationshipQuestion(body.relationshipQuestionId);
  const participants=product.domain==='tarot'&&(relationship||tarotV2&&body.participants)?relationshipAliases(body.participants):undefined;
  // Fail-closed: false unless READING_V7_ENABLED, a single-system v6 tier product and a v7 consultation kind.
  const v7=!tarotV2&&v7Applies(product,kind);
  const askEvidenceEnabled=Boolean(kind?.question&&!spiritInput&&!relationship&&!tarotV2);
  // Only tiers that keep 종격 evidence ask; an answer sent anywhere else is dropped, not stored.
  const jongAnswer=jongCheckApplies(product)&&!spiritInput?parseJongAnswer(body.jongCheck):undefined;
  if(kind){
    if(kind.partner&&!body.partnerProfileId)throw new FortuneError('PARTNER_REQUIRED');
    if(!kind.partner&&body.partnerProfileId)throw new FortuneError('PARTNER_NOT_SUPPORTED');
    body={...body,topicId:kind.id==='ask'?body.topicId:kind.topic,question:kind.question||kind.partner&&relationshipQuestionId?body.question:''};
    if(kind.question&&!(typeof body.question==='string'&&body.question.trim()))throw new FortuneError('QUESTION_REQUIRED');
  }
  // New relationship intents survive profile edits and midnight. Read before
  // provider readiness, chart calculation or drawing; uncertain reads stop here.
  let relationshipId:string|undefined;
  if(relationship&&attempt.consultationAttemptId){
    relationshipId=await digest({userId,version:RELATIONSHIP_VERSION,...attempt,productId:product.id,kind:kind?.id,profileId:body.profileId,partnerProfileId:body.partnerProfileId,question:body.question,relationshipQuestionId,participants,birthDetails:body.birthDetails,timeUnknown:body.timeUnknown,partnerTimeUnknown:body.partnerTimeUnknown});
    await connectDb(env);
    try{return await readRequest(env,userId,relationshipId);}catch(error:any){if(error?.code!=='FORTUNE_NOT_FOUND')throw error;}
  }
  let tarotIntentId:string|undefined;
  if(tarotV2&&attempt.consultationAttemptId){
    tarotIntentId=await digest({userId,version:TAROT_CONSULTATION_VERSION,...attempt,locale,productId:product.id,kind:kind!.id,question:body.question,participants,...(persona?{persona}:{})});
    await connectDb(env);
    try{return await readRequest(env,userId,tarotIntentId);}catch(error:any){if(error?.code!=='FORTUNE_NOT_FOUND')throw error;}
  }
  if (!providerReady(env)) throw new FortuneError('LLM_NOT_CONFIGURED',503);
  if (product.domain==='tarot' && product.readingKind==='single') body={...body,profileId:'tarot-question'};
  if (typeof body.profileId !== 'string' || !body.profileId || body.profileId.length>80) throw new FortuneError('PROFILE_REQUIRED');
  await connectDb(env);
  const profile=body.profileId==='tarot-question' && product.domain==='tarot' ? {updatedAt:null} : await withMongoRetry(env,()=>ProfileCard.findOne({userId:ownerId(userId),profileId:body.profileId}).lean());
  if (!profile) throw new FortuneError('PROFILE_NOT_FOUND',404);
  if(body.partnerProfileId && (!['sukuyo',...(kind?.partner?['saju','ziwei','vedic','astrology']:[])].includes(product.domain)||product.readingKind!=='single')) throw new FortuneError('PARTNER_NOT_SUPPORTED');
  let partner;
  if (body.partnerProfileId) {
    if(body.partnerProfileId===body.profileId)throw new FortuneError('DISTINCT_PARTNER_REQUIRED');
    if(typeof body.partnerProfileId!=='string'||body.partnerProfileId.length>80) throw new FortuneError('INVALID_PROFILE');
    partner=await withMongoRetry(env,()=>ProfileCard.findOne({userId:ownerId(userId),profileId:body.partnerProfileId}).lean());
    if(!partner) throw new FortuneError('PROFILE_NOT_FOUND',404);
  }
  const raw={personA:birthFromProfile(profile,body.timeUnknown===true,body.birthDetails || {}),
    ...(partner?{personB:birthFromProfile(partner,body.partnerTimeUnknown===true)}:{}),
    question:body.question,topicId:body.topicId,readingMode:partner||participants?'compatibility':'personal',consultationKind:kind?.id,participants};
  const normalized=Object.fromEntries(product.systems.map(id=>[id,domains[id].validateInput(raw)]));
  for(const input of Object.values(normalized)) {
    for(const person of [input.personA,input.personB])if(person && ['flounder','tuna'].includes(product.fishId) &&
      (!person.birthTime || !person.birthPlace || !person.gender)) throw new FortuneError('PREMIUM_BIRTH_REQUIRED');
  }
  const now=new Date();
  const clock=consultationClock(body.timezone,now);
  const date=clock.asOf;
  const fingerprint=await digest({...(product.systems.includes("saju")?{sajuEngine:SAJU_ENGINE_VERSION,sajuPolicy:SAJU_POLICY_VERSION}:{}),productId:product.id,priceKRW:product.priceKRW,profileId:body.profileId,normalized,date,timezone:clock.timezone,consultationVersion:1,...(!spiritInput&&preventionEligible(product.fishId)?{preventionVersion:PREVENTION_VERSION}:{}),...(locale!=='ko'?{locale}:{}),...(v7?{manifestVersion:READING_V7_VERSION}:product.manifestVersion===READING_V6_VERSION?{manifestVersion:product.manifestVersion}:{}),...(kind?{consultationKind:kind.id,kindVersion:1}:{}),...(spiritInput?{mode:SPIRIT_MODE,spiritInput}:{}),...(jongAnswer?{jongCheck:jongAnswer}:{}),...(persona?{persona}:{})});
  const id=tarotIntentId||relationshipId||await digest({userId,fingerprint,...attempt,...(relationship?{relationshipVersion:RELATIONSHIP_VERSION}:{}),...(tarotV2?{tarotConsultationVersion:TAROT_CONSULTATION_VERSION}:{})});
  if(askEvidenceEnabled||relationship||tarotV2) {
    // A retry reads the immutable purchase intent before any calculation or card draw.
    // Storage uncertainty is not permission to recalculate an existing purchase.
    try { return await readRequest(env,userId,id); }
    catch(error:any) { if(error?.code!=='FORTUNE_NOT_FOUND') throw error; }
  }
  // A new form starts a separate purchase; retries in that form keep the same intent.
  // Clients without an attempt retain their original deterministic recovery identity.
  const contexts: Partial<Record<DomainId,DomainContext>>={};
  // New single-system requests use their calculated native facts only; the hub has a separate birth-time contract.
  // Fusion keeps cross-system daily evidence, and stored snapshots return before this new preparation path.
  const crossDaily=product.readingKind!=='single'&&(!kind||kind.question)&&!spiritInput&&!relationship&&!tarotV2?computeCrossDaily(env,raw,date,product.systems):Promise.resolve([]);
  for(const system of product.systems) contexts[system]=domains[system].buildContext(
    tarotV2&&system==='tarot'?calculateTarotConsultation(kind!.id as TarotConsultationId):
    (askEvidenceEnabled||relationship)&&system==='tarot' ? calculateAskTarot(normalized[system],product.readingKind!=='single')
      : await domains[system].calculate(normalized[system],{runtimeEnv:env,asOf:date,asOfInstant:now.toISOString(),relationshipReading:relationship,tarotFusion:product.readingKind!=='single',...(system==='saju'&&jongAnswer?{jongAnswer}:{})}));
  if(relationship&&product.domain!=='tarot'){
    const system=product.domain,input=normalized[system];
    const other=input.personB?await domains[system].calculate({...input,personA:input.personB,personB:undefined,readingMode:'personal'},{runtimeEnv:env,asOf:date,asOfInstant:now.toISOString(),relationshipReading:true}):undefined;
    contexts[system]=extendRelationshipContext(contexts[system]!,other,date);
  }
  if(!spiritInput&&preventionEligible(product.fishId)&&contexts.saju)contexts.saju=withPreventionTiming(contexts.saju);
  if(persona&&tarotV2)contexts.tarot=withChatTarotVoice(contexts.tarot!);
  const analysis={...analyze(contexts),question:normalized[product.domain].question,topicId:normalized[product.domain].topicId,readingMode:raw.readingMode,asOf:date};
  let manifest=readingManifest(product,analysis.topicId,raw.readingMode,spiritInput?READING_VERSION:product.manifestVersion);
  if(kind)manifest=consultationManifest(product,kind,analysis.topicId);
  if(tarotV2){product.manifestVersion=READING_V6_VERSION;product.chapterCount=manifest.length;}
  if(persona&&tarotV2)manifest=manifest.map(c=>c.focus?{...c,focus:chatTarotRules(c.focus)}:c);
  if(spiritInput)manifest=spiritManifest(manifest);
  let v7Timing;
  if(v7){
    // The whole v7 chain runs once here: the timing matrix is cut from today's pillar, the ledger assigns every
    // fact to exactly one chapter, and the summary line is frozen into the manifest. Generation only re-applies
    // the stored matrix, so it never recomputes a period or resolves a different owner.
    const context=contexts[product.domain]!;
    v7Timing=await buildV7TimingMatrix(context,normalized[product.domain],date,now);
    if(preventionEligible(product.fishId)){
      const enriched=withPreventionTiming(withV7Timing(context,v7Timing));
      v7Timing.facts=v7Timing.facts.map(f=>enriched.facts.find(x=>x.label===f.label)||f);
    }
    manifest=v7TimingSummaries(resolveV7Ledger(manifest as ChapterSpecV7[],withV7Timing(context,v7Timing)),date);
    product.manifestVersion=READING_V7_VERSION;
    product.chapterCount=manifest.length;
  }
  if(!spiritInput&&preventionEligible(product.fishId)){
    if(v7Timing)analysis.contexts[product.domain]=withV7Timing(contexts[product.domain]!,v7Timing);
    manifest=withPreventionReading(manifest,analysis,product.fishId);product.chapterCount=manifest.length;
  }
  analysis.consultation=createConsultation(body.question || '',analysis.topicId || 'general',clock,manifest,kind?.id==='ask');
  if(relationship||participants||kind?.partner&&relationshipQuestionId)analysis.consultation.relationship={version:RELATIONSHIP_VERSION,questionId:relationshipQuestionId,participants:participants||(partner?{self:String(profile.name||'나').slice(0,40),partner:String(partner.name||'상대').slice(0,40)}:undefined)};
  if(tarotV2)analysis.consultation.tarotConsultation={version:TAROT_CONSULTATION_VERSION,kind:kind!.id};
  if(kind){analysis.consultation.consultationKind=kind.id;analysis.consultation.kindVersion=1;analysis.consultation.kindLabel=kind.label;if(!kind.question)analysis.consultation.period={kind:'default',label:kind.professional?'저장된 계산 기준의 현재 시기와 다음 전환':'출생 성향과 선택한 상담의 조건'};}
  if((!kind||kind.question)&&!relationship&&!tarotV2){
  // Questions are answered before the fixed outline, without reducing paid depth.
  manifest[0].focus='사용자가 입력한 모든 질문에 먼저 직접 답하고 선택 주제와 연결해 해석한다. 질문이 없으면 선택 주제의 핵심 흐름부터 설명한다.';
  manifest[0].excludes=[];
  manifest[0].systems=product.systems;
  const cross=await crossDaily;
  contexts[product.domain]!.facts.push(...cross);
  manifest[0].factSelectors=questionFactSelectors(product.systems,analysis.question || '',analysis.topicId || 'general',cross.map(f=>f.label));
  manifest[0].periodScope='저장된 상담의 기준일과 요청 기간을 다룬다. 해당 기간의 계산 근거가 없으면 실천·점검 기간으로 명시한다. 오늘의 일진·일운·판창가·수비학은 기준일 하루의 근거이고, 세운·월운은 해당 연·월의 근거다. 하루 근거를 다른 날짜나 장기 예측으로 늘리지 않는다.';
  if(!manifest[0].sections)manifest[0].requiredSections=[...(manifest[0].requiredSections || []),'관련 시기'];
  // The question chapter may cross every area, so it keeps only the system-forbidden subjects and drops the
  // sibling-chapter titles the catalog excluded. Ownership is untouched: the other chapters still own their facts.
  if(v7){const titles=new Set(manifest.map(c=>c.title));const first=manifest[0] as ChapterSpecV7;first.mustNotCover=first.mustNotCover.filter(t=>!titles.has(t));}
  }
  if(spiritInput){
    spiritEvidence(contexts.saju!);
    analysis.consultation.spirit=spiritPublic(spiritInput,now.toISOString(),contexts.saju);
    analysis.consultation.topicLabel=spiritTopics[spiritInput.topic];
    analysis.consultation.period={kind:'default',label:'질문자의 출생 성향과 선택 조건 · 사건 시기 예측 없음'};
    manifest=spiritManifest(manifest);
    product.name=SPIRIT_TITLE;product.image=SPIRIT_IMAGE;
  }
  const askEvidence=askEvidenceEnabled ? buildEvidencePacket({
    contexts:await extendAskLocalTiming(contexts,normalized,date),today:date,locale,tier:product.fishId,
    birthProfileAvailable:product.systems.some(system=>Boolean(normalized[system].personA)),
    birthTimeKnown:product.systems.every(system=>system==='tarot'||Boolean(normalized[system].personA?.birthTime)),
    ...(partner?{partnerTimeKnown:product.systems.every(system=>Boolean(normalized[system].personB?.birthTime))}:{}),
  }) : undefined;
  manifest=conciseReadingManifest(manifest);
  return createRequest(env,userId,id,{profileId:body.profileId,productId:product.id,featureKey:product.cdFeatureKey,
    amountKRW:product.priceKRW,fingerprint,...(persona?{persona}:{}),
    ...(askEvidence?{generationCheckpoint:{version:'ask-generation-v1',evidence:askEvidence}}:{}),
    growthAttribution:normalizeGrowthAttribution(body.growthAttribution),snapshot:{...(product.systems.includes("saju")?{natalInput:normalized.saju}:{}),locale,...(persona?{persona}:{}),...(!body.mode?{outputContext:readingOutputContext(locale,body)}:{}),product,analysis,manifest,profileUpdatedAt:profile.updatedAt,...(tarotV2?{tarotConsultation:{version:TAROT_CONSULTATION_VERSION,kind:kind!.id}}:{}),...(spiritInput?{normalized}: {}),...(v7Timing?{v7Timing}:{})}});
}

/** Pre-payment 종격 question: the same profile, supplement and consultation day prepareFortune will use. Read-only, no LLM. */
export async function jongCheckFortune(env: Record<string, unknown>, userId: string, body: any) {
  const product=getProduct(body.productId);
  if(!jongCheckApplies(product))return {check:null};
  if (typeof body.profileId !== 'string' || !body.profileId || body.profileId.length>80) throw new FortuneError('PROFILE_REQUIRED');
  await connectDb(env);
  const profile=await withMongoRetry(env,()=>ProfileCard.findOne({userId:ownerId(userId),profileId:body.profileId}).lean());
  if (!profile) throw new FortuneError('PROFILE_NOT_FOUND',404);
  const input=domains.saju.validateInput({personA:birthFromProfile(profile,body.timeUnknown===true,body.birthDetails || {})});
  return {check:calculateScreenSaju(input.personA!,new Date(consultationClock(body.timezone).asOf)).jongCheck};
}

async function prepareQuestionSky(env:Record<string,unknown>,userId:string,body:any){
  if(body.mode==='horary-v1')throw new FortuneError('HORARY_FREE_PROMPT_REQUIRED');
  const input=validateSkyInput(body);
  const product=getProduct('saju_flounder');
  const fingerprint=await digest({input,priceKRW:product.priceKRW,version:QUESTION_SKY_TWO_STAGE_VERSION});
  const id=await digest({userId,fingerprint,...consultationAttempt(body)});
  await connectDb(env);
  // Existing paid or partial snapshots always win, even when a provider is down
  // or a later version changes the interpretation. Never recalculate a purchase.
  try{return await readRequest(env,userId,id);}catch(error:any){if(error?.code!=='FORTUNE_NOT_FOUND')throw error;}
  if(!providerReady(env))throw new FortuneError('LLM_NOT_CONFIGURED',503);
  const moment=skyMoment(input);
  const calculated=await calculateQuestionSky(env,input,moment);
  product.manifestVersion=QUESTION_SKY_TWO_STAGE_VERSION;product.chapterCount=2;
  const clock=consultationClock(moment.timezone,moment.date);
  const context=calculated.context;
  calculated.publicData.evidenceVersion=QUESTION_SKY_TWO_STAGE_VERSION;
  context.facts.push({id:`${context.domain}.question-calculation`,label:'프라슈나 계산 근거',value:{method:'Lahiri sidereal / Whole Sign',chart:calculated.chart,judgements:calculated.audit,limits:['위계는 본궁·고양·손상·추락만 산출','실제 감정·소재지·사건 시기의 관측 아님']}});
  const manifest=conciseReadingManifest(questionSkyTwoStageManifest(context));
  const consultation=createConsultation(input.question,input.topic,clock,manifest);
  // The question is displayed once in the result shell. The generated prose
  // receives it as context but never creates a second question-answer heading.
  consultation.questions=[];
  consultation.questionSky=calculated.publicData;
  consultation.topicLabel=skyTopics[input.topic];
  consultation.period={kind:'default',label:SKY_TIMING};
  const analysis={contexts:{[context.domain]:context},signals:[],themes:[],question:input.question,topicId:input.topic,asOf:clock.asOf,consultation};
  product.name=skyModes[input.mode];product.image=SKY_IMAGE;
  // New purchases use the registry flounder contract; old snapshots are never rewritten.
  return createRequest(env,userId,id,{profileId:'question-sky',productId:product.id,featureKey:product.cdFeatureKey,amountKRW:product.priceKRW,fingerprint,
    growthAttribution:normalizeGrowthAttribution(body.growthAttribution),snapshot:{product,analysis,manifest,input,questionSkyStage:{version:QUESTION_SKY_TWO_STAGE_VERSION,firstChars:manifest[0].targetChars?.[0],followupChars:manifest[1].targetChars?.[0]},questionMoment:{...moment,date:moment.date.toISOString()},calculation:{raw:calculated.raw,audit:calculated.audit,moonMotion:calculated.moonMotion}}});
}

export async function submitQuestionSkyFollowup(env:Record<string,unknown>,userId:string,requestId:string,question:unknown){
  if(!providerReady(env))throw new FortuneError('LLM_NOT_CONFIGURED',503);
  const row=await reserveQuestionSkyFollowup(env,userId,requestId,question);
  await enqueueConsultation(env,row);
  return row;
}

/** `access` is the buyer's choice for a fortune-chat consultation (per-use-access.js); Yeongnyangi requests ignore it. */
export async function activateFortune(env: Record<string, unknown>, userId: string, requestId: string, {access}:{access?:string}={}) {
  const request=await readRequest(env,userId,requestId);
  const currentProduct=resolveStoredProduct(request.productId);
  const row=await attachPayment(env,userId,requestId,resolveChargeAmountKRW(env,request.amountKRW),{currentAmountKRW:currentProduct.priceKRW,access});
  await enqueueConsultation(env,row);
  return row;
}

export async function generateNextChapter(env: Record<string, unknown>, userId: string, requestId: string, source: 'queue'|'scheduled' = 'queue') {
  const storedOnly=!providerReady(env);
  if(storedOnly&&!canResumeStoredChapter(await readRequest(env,userId,requestId)))
    throw new FortuneError('LLM_NOT_CONFIGURED',503);
  const {row,token}=await claimChapter(env,userId,requestId,source,{storedOnly});
  if(!token) return row;
  const ordinal=row.chapters.length;
  const startedAt=Date.now();let stage='provider';let result:any;
  try {
    const draft=storedChapterDraft(row);
    if(draft) result=draft.body;
    else {
      // A stored-only claim cannot turn into a paid provider call after a race.
      if(storedOnly||!providerReady(env))throw new FortuneError('LLM_NOT_CONFIGURED',503);
      const sharedProvider=new CodeDestinyProvider(env,{serviceId:row.featureKey,requestId,
        access:row.accessMethod || (row.paymentId?'DIRECT_KRW':''),sectionGroup:String(ordinal+1),
        attempt:Number(row.chapterAttempts?.[ordinal] || 1),generationSource:source});
      let ask: {analysis:AskAnalysis;evidence:EvidencePacket}|undefined;
      if(row.generationCheckpoint?.version==='ask-generation-v1') {
        const consultation=row.snapshot.analysis.consultation;
        const saved=row.generationCheckpoint.analysis;
        if(saved) {
          if(saved.version!=='ask-analysis-v1')throw new FortuneError('INVALID_ASK_ANALYSIS',500);
          parseAskAnalysis(escapeAskData(saved),consultation);
        } else {
          stage='analysis';
          const analysis=await analyzeAsk(consultation,(system,data)=>sharedProvider.analyzeQuestion(system,data));
          stage='storage';
          await saveAskAnalysis(env,userId,requestId,token,analysis);
        }
        // Recheck access after analysis/storage before paying for the chapter call.
        const current=await readRequest(env,userId,requestId);
        if(current.state!=='GENERATING'||current.leaseToken!==token)throw new FortuneError('GENERATION_LEASE_LOST',409);
        if(ordinal===0) {
          const checkpoint=current.generationCheckpoint;
          if(checkpoint?.version!=='ask-generation-v1'||!checkpoint.evidence||!checkpoint.analysis)
            throw new FortuneError('INVALID_ASK_CHECKPOINT',500);
          parseAskAnalysis(escapeAskData(checkpoint.analysis),consultation);
          ask={analysis:checkpoint.analysis,evidence:checkpoint.evidence};
        }
      }
      stage='provider';
      const repair=Number(row.chapterAttempts?.[ordinal] || 0)>1 && row.lastFailure?.stage==='quality'
        ? {code:row.lastFailure.code}:undefined;
      const followupQuestion=ordinal===1&&row.snapshot?.questionSkyStage?.version===QUESTION_SKY_TWO_STAGE_VERSION
        ? row.generationCheckpoint?.followup?.question : undefined;
      if(ordinal===1&&row.snapshot?.questionSkyStage?.version===QUESTION_SKY_TWO_STAGE_VERSION&&!followupQuestion)
        throw new FortuneError('FOLLOWUP_NOT_SUBMITTED',409);
      const input={locale:readingLocale(row.snapshot.locale),outputContext:row.snapshot.outputContext,chapter:row.snapshot.manifest[ordinal],analysis:snapshotAnalysis(row.snapshot),previous:row.chapters,repair,ask,followupQuestion,persona:row.snapshot.persona};
      if(!input.chapter) throw new FortuneError('INVALID_MANIFEST',500);
      const provider=new StructuredChapterProvider(sharedProvider);
      const generated=await provider.generateChapter(input);
      stage='quality';
      result=deliverChapter(generated,input);
      const natalFacts=input.analysis.contexts?.saju?.facts.find(f=>f.label==='pillars')?.value;
      // chapter.ts corrects the reader's pillars first; a claim left here keeps a quality code so the one repair can name it.
      if(natalFacts)try{assertSajuPillarClaims(result,natalFacts);}catch{throw new FortuneError('SAJU_PILLAR_CONTRADICTION');}
      stage='storage';
      await saveChapterDraft(env,userId,requestId,token,ordinal,{raw:generated,body:result});
    }
    stage='storage';
    const completed=await finishChapter(env,userId,requestId,token,ordinal,result,row.snapshot.manifest.length);
    if(!completed) throw new FortuneError('GENERATION_LEASE_LOST',409);
    console.info('[yeongnyangi-generation]',JSON.stringify({requestId,productId:row.productId,chapter:ordinal,
      stage:'checkpoint',source,durationMs:Date.now()-startedAt,state:completed.state,recordedAt:new Date().toISOString()}));
    return completed;
  } catch(error) {
    if(stage==='storage'&&result) {
      try {
        const stored=await readRequest(env,userId,requestId);
        if(stored.state!=='REFUNDED'&&JSON.stringify(stored.chapters?.[ordinal])===JSON.stringify(result))return stored;
      } catch { /* Keep the existing storage failure checkpoint if reread is unavailable. */ }
    }
    const code=error instanceof FortuneError?error.code:stage==='storage'?'RESULT_STORAGE_UNAVAILABLE':'GENERATION_FAILED';
    const detail=error instanceof FortuneError?error.detail:undefined;
    console.warn('[yeongnyangi-generation]',JSON.stringify({requestId,chapter:ordinal,stage,durationMs:Date.now()-startedAt,code,detail}));
    const allowedAttempts=allowedChapterAttempts(row,ordinal);
    const askQuality=stage==='quality'&&ordinal===0&&row.generationCheckpoint?.version==='ask-generation-v1';
    // One existing-budget quality regeneration at most. A second rejection
    // preserves the paid request and saved chapters for support review.
    const review=askQuality&&(row.lastFailure?.stage==='quality'||Number(row.chapterAttempts?.[ordinal] || 0)>=allowedAttempts);
    try { await failChapter(env,userId,requestId,token,review?'ASK_LIMITED_REVIEW_REQUIRED':code,
      row.chapterAttempts?.[ordinal] || 1,stage,stage==='storage'?Number.MAX_SAFE_INTEGER:allowedAttempts,review?code:detail,ordinal); }
    catch { console.warn('[yeongnyangi-generation]',JSON.stringify({requestId,chapter:ordinal,stage:'failure_checkpoint',code})); }
    throw error;
  }
}

export function presentFortune(row: any) {
  const originalRow = row;
  row = correctedFortune(row);
  const correctionApplied = row !== originalRow;
  const symbolic=Boolean(row.snapshot.analysis.consultation?.spirit||row.snapshot.analysis.consultation?.questionSky);
  const errorCode=row.errorCode==='ASK_LIMITED_REVIEW_REQUIRED'?'GENERATION_REVIEW_REQUIRED':row.errorCode;
  const complete=row.state==='COMPLETED',awaitingFollowup=row.state==='AWAITING_FOLLOWUP',blocked=row.state==='REFUNDED'||errorCode==='PAYMENT_NOT_ACTIVE';
  // A held order is still being recovered server-side: saved chapters stay readable and nothing asks the buyer to pay or chase.
  const held=!complete&&!blocked&&errorCode==='GENERATION_REVIEW_REQUIRED';
  // The buyer may retry a stopped chapter, or a held one whose budget ran out, a capped number of times.
  const canRetryNow=userCanRetry(row);
  const recovery={requestId:String(row._id),savedChapters:row.chapters.length,totalChapters:row.snapshot.manifest.length,
    providerNeeded:!complete&&!awaitingFollowup&&row.chapters.length<row.snapshot.manifest.length,retryable:!complete&&!awaitingFollowup&&!blocked&&!held,
    canRetryNow,nextAttemptAt:row.nextAttemptAt || null,reviewRequired:held,
    nextAction:complete?'reread':blocked?'support':canRetryNow?'retry':held?'held':'wait',autoResume:held&&holdAutoResumes(row)};
  return {id:row._id,locale:readingLocale(row.snapshot.locale),profileId:row.profileId,productId:row.productId,state:row.state,
    charts:!symbolic && hasRequestAccess(row) && row.state!=='REFUNDED'?readingCharts(snapshotAnalysis(row.snapshot),row.snapshot.manifest).map(chart=>correctionApplied?{...chart,source:"검수된 정정 계산 근거"}:chart):undefined,
    ...(correctionApplied?{correction:{reason:row.correction.reason,appliedAt:row.correction.appliedAt}}:{}),
    paid:hasRequestAccess(row),accessMethod:row.accessMethod || (row.paymentId?'DIRECT_KRW':undefined),product:row.snapshot.product,manifest:symbolic ? row.snapshot.manifest.map(({id,title,ordinal,part}:any)=>({id,title,ordinal,part})) : row.snapshot.manifest,
    consultation:row.snapshot.analysis.consultation || {topicId:row.snapshot.analysis.topicId || 'general',question:row.snapshot.analysis.question || '',asOf:row.snapshot.analysis.asOf},
    chapters:row.state==='REFUNDED'?[]:symbolic ? row.chapters.map(({summary,analysis,example,advice,persona,highlights,topics,blocks,questionAnswers,followUpSuggestions,visualSlots}:any)=>({summary,analysis,example,advice,persona,highlights,topics,blocks,questionAnswers,followUpSuggestions,visualSlots,sources:[]})) : row.chapters.map(({internalBasis:_serverOnly,...chapter}:any)=>chapter),
    followup:row.snapshot?.questionSkyStage?.version===QUESTION_SKY_TWO_STAGE_VERSION?{status:row.generationCheckpoint?.followup?.status || (awaitingFollowup?'available':'unavailable'),used:Boolean(row.generationCheckpoint?.followup?.used),suggestions:row.generationCheckpoint?.followup?.suggestions || row.chapters?.[0]?.followUpSuggestions || []}:undefined,
    recovery,errorCode,createdAt:row.createdAt,completedAt:row.completedAt};
}
