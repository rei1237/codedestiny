import {questionEvidence} from './fortune/ask/question-evidence';
import {conversationView} from './fortune/ask/conversation';
import {questionSkyCalculationInput} from './fortune/question-sky-locale-input';
import {consultationBudget,fusionConsultationManifest,allocateConsultationBudget} from './fortune/consultation-budget';
import {QUESTION_POLICY_VERSION,questionDecision,questionTopic,assertQuestionOrder,questionManifest,type QuestionFish} from './fortune/ask/question-policy';
import {COUNSEL_VERSION,counselManifest} from './fortune/counsel-purpose';
import {withSajuCycleEvidence} from './fortune/saju/cycle-evidence';
import {nativeContactBoundary} from './fortune/symbolic-locale';
import {CHAPTER_DELIVERY_VERSION,chapterQualityFailure,hasChapterDeliveryContract} from './chapter-delivery-contract.js';
import {deliveryRefundPending} from './terminal-refund-policy.js';
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
import {TAROT_SPREAD_VERSION,TAROT_SPREAD_KIND,TAROT_DECK_VERSION,tarotSpreadOrder,commitTarotDeck,tarotPicks,tarotSpreadContext,spreadSnapshot,publicTarotSpread} from './fortune/tarot/spread-v3';
import {context as domainContext} from './fortune/shared/domain';
import {readingCharts} from './fortune/reading-presentation';
import { FUSION_READING_VERSION, READING_VERSION, READING_V5_VERSION, READING_V6_VERSION, READING_V7_VERSION, QUESTION_SKY_TWO_STAGE_VERSION, readingChapterCount } from './fortune/reading-policy';
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
import { createRequest, commitTarotDraw, readRequest, attachPayment, claimChapter, finishChapter, failChapter, ownerId, saveAskAnalysis, saveChapterDraft, allowedChapterAttempts, holdAutoResumes, userCanRetry, reserveQuestionSkyFollowup } from './repository.js';
import { hasRequestAccess } from './access-methods.js';

/**
 * A v7 snapshot stores its timing matrix once at prepare; every later read re-applies it to the stored
 * context so the rebuilt fact ledger resolves the same IDs prepare assigned. Snapshots without one are
 * returned untouched, so v6 and older requests keep their exact stored analysis.
 */
export function snapshotAnalysis(snapshot:any) {
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
  if(persona&&body.fishId!==undefined&&body.questionDecision===undefined)throw new FortuneError('QUESTION_SCOPE_REQUIRED');
  const locale=readingLocale(body.locale);
  // Symbolic modes validate native headings against stable section and evidence IDs.
  const attempt=consultationAttempt(body);
  if(persona&&body.questionDecision!==undefined&&!['mackerel','salmon','flounder','tuna'].includes(body.fishId))throw new FortuneError('QUESTION_PRODUCT_MISMATCH');
  const product=persona?getChatProduct(body.domain,body.questionDecision!==undefined?body.fishId:undefined):getProduct(body.productId);
  const decision=body.questionDecision!==undefined&&!body.mode?questionDecision(body.questionDecision):undefined;
  if(decision){
    if(locale!=='ko')throw new FortuneError('READING_LOCALE_UNAVAILABLE');
    assertQuestionOrder(product,decision,body.question||'');
    body={...body,consultationKind:product.domain==='tarot'?'spread':decision.target==='pair'?'compatibility':'ask',topicId:questionTopic(decision.category)};
  }
  if(Object.hasOwn(skyModes,body.mode))return prepareQuestionSky(env,userId,body);
  if(body.mode && body.mode!==SPIRIT_MODE)throw new FortuneError('INVALID_READING_MODE');
  const spiritInput=body.mode===SPIRIT_MODE?validateSpiritInput(body):undefined;
  if(spiritInput&&locale!=='ko'&&nativeContactBoundary(`${body.question} ${spiritInput.situation}`))spiritInput.boundary=true;
  if(spiritInput){product.manifestVersion=READING_VERSION;product.chapterCount=readingChapterCount(product.domain,product.fishId,READING_VERSION);}
  const originalKind=resolveConsultationKind(product,body.consultationKind);
  const kind=decision&&originalKind?{...originalKind,question:true}:originalKind;
  // A chat tarot always uses a v2 question spread; any other kind would leave the chat on an older tarot contract.
  if(persona&&!decision&&product.domain==='tarot'&&!(chatTarotKinds as readonly string[]).includes(kind?.id||''))throw new FortuneError('INVALID_CONSULTATION_KIND');
  const relationship=isRelationshipReading(product.domain,kind?.id)&&product.readingKind==='single';
  const tarotSpec=product.domain==='tarot'&&product.readingKind==='single'?tarotConsultation(kind?.id):undefined;
  const tarotV2=Boolean(tarotSpec);
  // Korean question-first tarot: a catalog spread, a committed deck and a real pick before payment.
  const tarotOrder=(!persona||Boolean(decision))&&product.domain==='tarot'&&product.readingKind==='single'&&kind?.id===TAROT_SPREAD_KIND?tarotSpreadOrder(body,product.fishId,Boolean(decision)):undefined;
  const tarotV3=Boolean(tarotOrder);
  const tarotQuestion=tarotV2||tarotV3;
  if(kind?.koOnly&&locale!=='ko')throw new FortuneError('READING_LOCALE_UNAVAILABLE');
  const relationshipQuestionId=validateRelationshipQuestion(body.relationshipQuestionId);
  const participants=product.domain==='tarot'&&(relationship||tarotV2&&body.participants)?relationshipAliases(body.participants):undefined;
  // Fail-closed: false unless READING_V7_ENABLED, a single-system v6 tier product and a v7 consultation kind.
  const v7=!decision&&!tarotQuestion&&v7Applies(product,kind);
  // 존댓말 is an order-form choice for Yeongnyangi's Korean readings. Chat personas and spirit readings keep their own
  // voice; anything else is 반말. Only 'honorific' enters the identity, so existing orders keep their fingerprints.
  const voiceStyle=!persona&&!body.mode&&locale==='ko'&&body.voiceStyle==='honorific'?'honorific' as const:undefined;
  const askEvidenceEnabled=Boolean(kind?.question&&!spiritInput&&!relationship&&!tarotQuestion&&!decision);
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
  let questionIntentId:string|undefined;
  if(decision&&!relationship&&!tarotQuestion&&attempt.consultationAttemptId){
    questionIntentId=await digest({userId,...(persona?{persona}:{}),version:QUESTION_POLICY_VERSION,...attempt,decision,locale,productId:product.id,profileId:body.profileId,question:body.question,birthDetails:body.birthDetails,timeUnknown:body.timeUnknown,...(voiceStyle?{voiceStyle}:{})});
    await connectDb(env);
    try{return await readRequest(env,userId,questionIntentId);}catch(error:any){if(error?.code!=='FORTUNE_NOT_FOUND')throw error;}
  }
  let relationshipId:string|undefined;
  if(relationship&&attempt.consultationAttemptId){
    relationshipId=await digest({userId,...(persona?{persona}:{}),version:RELATIONSHIP_VERSION,...attempt,...(decision?{questionDecision:decision}:{}),productId:product.id,kind:kind?.id,profileId:body.profileId,partnerProfileId:body.partnerProfileId,question:body.question,relationshipQuestionId,participants,birthDetails:body.birthDetails,timeUnknown:body.timeUnknown,partnerTimeUnknown:body.partnerTimeUnknown});
    await connectDb(env);
    try{return await readRequest(env,userId,relationshipId);}catch(error:any){if(error?.code!=='FORTUNE_NOT_FOUND')throw error;}
  }
  let tarotIntentId:string|undefined;
  if(tarotV2&&attempt.consultationAttemptId){
    tarotIntentId=await digest({userId,version:TAROT_CONSULTATION_VERSION,...attempt,locale,productId:product.id,kind:kind!.id,question:body.question,participants,...(persona?{persona}:{}),...(voiceStyle?{voiceStyle}:{})});
    await connectDb(env);
    try{return await readRequest(env,userId,tarotIntentId);}catch(error:any){if(error?.code!=='FORTUNE_NOT_FOUND')throw error;}
  }
  if(tarotV3&&attempt.consultationAttemptId){
    tarotIntentId=await digest({userId,...(persona?{persona}:{}),version:TAROT_SPREAD_VERSION,...attempt,...(decision?{questionDecision:decision}:{}),locale,productId:product.id,kind:kind!.id,question:body.question,spreadId:tarotOrder!.spread.id,spreadVersion:tarotOrder!.spread.version,inputs:tarotOrder!.inputs,...(voiceStyle?{voiceStyle}:{})});
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
    for(const person of [input.personA,input.personB])if(!decision&&person && ['flounder','tuna'].includes(product.fishId) &&
      (!person.birthTime || !person.birthPlace || !person.gender)) throw new FortuneError('PREMIUM_BIRTH_REQUIRED');
  }
  const now=new Date();
  const clock=consultationClock(body.timezone,now);
  const date=clock.asOf;
  const fingerprint=await digest({...(decision?{questionDecision:decision}:{}),...(product.systems.includes("saju")?{sajuEngine:SAJU_ENGINE_VERSION,sajuPolicy:SAJU_POLICY_VERSION}:{}),productId:product.id,priceKRW:product.priceKRW,profileId:body.profileId,normalized,date,timezone:clock.timezone,consultationVersion:1,...(!spiritInput?{counselVersion:COUNSEL_VERSION}:{}),...(!spiritInput&&preventionEligible(product.fishId)?{preventionVersion:PREVENTION_VERSION}:{}),...(locale!=='ko'?{locale}:{}),...(v7?{manifestVersion:READING_V7_VERSION}:[READING_V6_VERSION,FUSION_READING_VERSION].includes(product.manifestVersion)?{manifestVersion:product.manifestVersion}:{}),...(kind?{consultationKind:kind.id,kindVersion:1}:{}),...(spiritInput?{mode:SPIRIT_MODE,spiritInput}:{}),...(jongAnswer?{jongCheck:jongAnswer}:{}),...(persona?{persona}:{}),...(voiceStyle?{voiceStyle}:{}),...(tarotV3?{tarotSpread:{id:tarotOrder!.spread.id,version:tarotOrder!.spread.version},tarotInputs:tarotOrder!.inputs}:{})});
  const id=questionIntentId||tarotIntentId||relationshipId||await digest({userId,fingerprint,...attempt,...(relationship?{relationshipVersion:RELATIONSHIP_VERSION}:{}),...(tarotV2?{tarotConsultationVersion:TAROT_CONSULTATION_VERSION}:{}),...(tarotV3?{tarotConsultationVersion:TAROT_SPREAD_VERSION}:{})});
  if(askEvidenceEnabled||relationship||tarotQuestion) {
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
  const crossDaily=product.readingKind!=='single'&&(!kind||kind.question)&&!spiritInput&&!relationship&&!tarotQuestion?computeCrossDaily(env,raw,date,product.systems):Promise.resolve([]);
  for(const system of product.systems) contexts[system]=domains[system].buildContext(
    // No card exists before the buyer picks; the draw route replaces this placeholder with the drawn context.
    tarotV3&&system==='tarot'?domainContext('tarot',{spreadId:tarotOrder!.spread.id,drawPending:true}):
    tarotV2&&system==='tarot'?calculateTarotConsultation(kind!.id as TarotConsultationId):
    (askEvidenceEnabled||relationship)&&system==='tarot' ? calculateAskTarot(normalized[system],product.readingKind!=='single')
      : await domains[system].calculate(normalized[system],{runtimeEnv:env,asOf:date,asOfInstant:now.toISOString(),relationshipReading:relationship,tarotFusion:product.readingKind!=='single',...(system==='saju'&&jongAnswer?{jongAnswer}:{})}));
  if(contexts.saju&&!spiritInput)contexts.saju=withSajuCycleEvidence(contexts.saju,date);
  if(relationship&&product.domain!=='tarot'){
    const system=product.domain,input=normalized[system];
    const other=input.personB?await domains[system].calculate({...input,personA:input.personB,personB:undefined,readingMode:'personal'},{runtimeEnv:env,asOf:date,asOfInstant:now.toISOString(),relationshipReading:true}):undefined;
    contexts[system]=extendRelationshipContext(contexts[system]!,other,date);
  }
  if(!spiritInput&&preventionEligible(product.fishId)&&contexts.saju)contexts.saju=withPreventionTiming(contexts.saju);
  if(decision)contexts[product.domain]=questionEvidence(contexts[product.domain]!,decision,body.question,date);
  if(persona&&tarotV2)contexts.tarot=withChatTarotVoice(contexts.tarot!);
  const analysis={...analyze(contexts),question:normalized[product.domain].question,topicId:normalized[product.domain].topicId,readingMode:raw.readingMode,asOf:date};
  let manifest=readingManifest(product,analysis.topicId,raw.readingMode,spiritInput?READING_VERSION:product.manifestVersion);
  if(kind)manifest=consultationManifest(product,kind,analysis.topicId);
  if(tarotV3)manifest=consultationManifest(product,kind,analysis.topicId,tarotOrder!.spread);
  if(tarotQuestion){product.manifestVersion=READING_V6_VERSION;product.chapterCount=manifest.length;}
  if(persona&&tarotV2)manifest=manifest.map(c=>c.focus?{...c,focus:chatTarotRules(c.focus)}:c);
  if(spiritInput)manifest=spiritManifest(manifest);
  if(!spiritInput)manifest=counselManifest(manifest,contexts.saju,product.fishId,kind?.id||'personal',body.question||'',date);
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
  if(locale==='ko'&&!persona&&!body.mode&&product.readingKind!=='single'){manifest=fusionConsultationManifest(product,analysis.topicId);product.chapterCount=manifest.length;product.manifestVersion=READING_V5_VERSION;}
  if(!decision&&!spiritInput&&preventionEligible(product.fishId)){
    if(v7Timing)analysis.contexts[product.domain]=withV7Timing(contexts[product.domain]!,v7Timing);
    manifest=withPreventionReading(manifest,analysis,product.fishId);product.chapterCount=manifest.length;
  }

  if(locale==='ko'&&!persona&&!body.mode&&product.readingKind!=='single')manifest=allocateConsultationBudget(manifest,product.fishId);
  if(decision){
    manifest=questionManifest(product.domain,product.fishId as QuestionFish,decision,tarotOrder?.spread,body.question||'',!persona&&!body.mode);
    product.manifestVersion=READING_V6_VERSION;product.chapterCount=manifest.length;
  }
  analysis.consultation=createConsultation(body.question || '',analysis.topicId || 'general',clock,manifest,kind?.id==='ask');
  if(decision){
    analysis.consultation.questionDecision=decision;
    analysis.consultation.period=createConsultation(body.question+' '+decision.period,analysis.topicId||'general',clock,manifest,true).period;
    // Clarifications and closely related sentences belong to one intent, not one paid unit per punctuation.
    analysis.consultation.questions=[{id:'Q1',text:body.question,chapterId:manifest[0].id}];
  }
  if(!spiritInput)analysis.consultation.counselVersion=COUNSEL_VERSION;
  if(relationship||participants||kind?.partner&&relationshipQuestionId)analysis.consultation.relationship={version:RELATIONSHIP_VERSION,questionId:relationshipQuestionId,participants:participants||(partner?{self:String(profile.name||'나').slice(0,40),partner:String(partner.name||'상대').slice(0,40)}:undefined)};
  if(tarotV2)analysis.consultation.tarotConsultation={version:TAROT_CONSULTATION_VERSION,kind:kind!.id};
  if(tarotV3)analysis.consultation.tarotConsultation={version:TAROT_SPREAD_VERSION,kind:kind!.id,spreadId:tarotOrder!.spread.id};
  if(kind){analysis.consultation.consultationKind=kind.id;analysis.consultation.kindVersion=1;analysis.consultation.kindLabel=tarotV3?tarotOrder!.spread.title:kind.label;if(!kind.question)analysis.consultation.period={kind:'default',label:kind.professional?(product.domain==='saju'?'계산된 과거·현재·미래 대운의 흐름':'저장된 계산 기준의 현재 시기와 다음 전환'):'출생 성향과 선택한 상담의 조건'};}
  if(!decision&&(!kind||kind.question)&&!relationship&&!tarotQuestion){
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
    includeSajuCycles:true,
    contexts:await extendAskLocalTiming(contexts,normalized,date),today:date,locale,tier:product.fishId,
    birthProfileAvailable:product.systems.some(system=>Boolean(normalized[system].personA)),
    birthTimeKnown:product.systems.every(system=>system==='tarot'||Boolean(normalized[system].personA?.birthTime)),
    ...(partner?{partnerTimeKnown:product.systems.every(system=>Boolean(normalized[system].personB?.birthTime))}:{}),
  }) : undefined;
  manifest=conciseReadingManifest(manifest);
  return createRequest(env,userId,id,{profileId:body.profileId,productId:product.id,featureKey:product.cdFeatureKey,
    amountKRW:product.priceKRW,fingerprint,...(persona?{persona}:{}),
    ...(askEvidence?{generationCheckpoint:{version:'ask-generation-v1',evidence:askEvidence}}:{}),
    growthAttribution:normalizeGrowthAttribution(body.growthAttribution),snapshot:{...((decision||locale==='ko'&&!persona&&!body.mode&&product.readingKind!=='single')?{questionContract:{version:QUESTION_POLICY_VERSION,followups:consultationBudget(product.fishId).followups,...(!persona&&!body.mode?{readingBudget:consultationBudget(product.fishId)}:{})}}:{}),deliveryContract:CHAPTER_DELIVERY_VERSION,...(product.systems.includes("saju")?{natalInput:normalized.saju}:{}),locale,...(persona?{persona}:{}),...(voiceStyle?{voiceStyle}:{}),...(!body.mode?{outputContext:readingOutputContext(locale,body)}:{}),product,analysis,manifest,profileUpdatedAt:profile.updatedAt,...(tarotV2?{tarotConsultation:{version:TAROT_CONSULTATION_VERSION,kind:kind!.id}}:{}),...(tarotV3?{tarotConsultation:{version:TAROT_SPREAD_VERSION,kind:kind!.id},tarotSpread:spreadSnapshot(tarotOrder!.spread),tarotInputs:tarotOrder!.inputs,tarotDeck:commitTarotDeck()}:{}),...(spiritInput?{normalized}: {}),...(v7Timing?{v7Timing}:{})}},tarotV3?{initialState:'AWAITING_DRAW'}:{});
}

/** The buyer's pick over the committed deck. A repeat call returns the stored draw unchanged (refresh, retry, return). */
export async function drawTarotSpread(env: Record<string, unknown>, userId: string, requestId: string, body: any) {
  await connectDb(env);
  const row=await readRequest(env,userId,requestId);
  if(row.snapshot?.tarotConsultation?.version!==TAROT_SPREAD_VERSION)throw new FortuneError('TAROT_DRAW_NOT_AVAILABLE',409);
  if(row.snapshot.tarotDraw)return row;
  if(row.state!=='AWAITING_DRAW')throw new FortuneError('TAROT_DRAW_NOT_AVAILABLE',409);
  const spread=row.snapshot.tarotSpread;
  const {method,picks}=tarotPicks(body,spread.cardCount);
  const tarot=domains.tarot.buildContext(tarotSpreadContext(spread,row.snapshot.tarotDeck,picks,row.snapshot.tarotInputs||{}));
  return commitTarotDraw(env,userId,requestId,{context:tarot,draw:{version:TAROT_DECK_VERSION,method,picks,drawnAt:new Date().toISOString()}});
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
  const locale=readingLocale(body.locale);
  const input=validateSkyInput(body);
  if(locale!=='ko'&&nativeContactBoundary(`${input.question} ${input.situation}`))input.boundary=true;
  const product=getProduct('saju_flounder');
  const fingerprint=await digest({input,...(locale!=='ko'?{locale}:{}),priceKRW:product.priceKRW,version:QUESTION_SKY_TWO_STAGE_VERSION});
  const id=await digest({userId,fingerprint,...consultationAttempt(body)});
  await connectDb(env);
  // Existing paid or partial snapshots always win, even when a provider is down
  // or a later version changes the interpretation. Never recalculate a purchase.
  try{return await readRequest(env,userId,id);}catch(error:any){if(error?.code!=='FORTUNE_NOT_FOUND')throw error;}
  if(!providerReady(env))throw new FortuneError('LLM_NOT_CONFIGURED',503);
  const moment=skyMoment(input);
  const calculated=await calculateQuestionSky(env,questionSkyCalculationInput(input,locale),moment);
  calculated.publicData.relationship=input.relationship;
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
    growthAttribution:normalizeGrowthAttribution(body.growthAttribution),snapshot:{deliveryContract:CHAPTER_DELIVERY_VERSION,...(locale!=='ko'?{locale}:{}),product,analysis,manifest,input,questionSkyStage:{version:QUESTION_SKY_TWO_STAGE_VERSION,firstChars:manifest[0].targetChars?.[0],followupChars:manifest[1].targetChars?.[0]},questionMoment:{...moment,date:moment.date.toISOString()},calculation:{raw:calculated.raw,audit:calculated.audit,moonMotion:calculated.moonMotion}}});
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
  const startedAt=Date.now();let stage='provider';let result:any;let sharedProvider:CodeDestinyProvider|undefined;
  try {
    const draft=storedChapterDraft(row);
    if(draft) result=draft.body;
    else {
      // A stored-only claim cannot turn into a paid provider call after a race.
      if(storedOnly||!providerReady(env))throw new FortuneError('LLM_NOT_CONFIGURED',503);
      sharedProvider=new CodeDestinyProvider(env,{serviceId:row.featureKey,requestId,
        access:row.accessMethod || (row.paymentId?'DIRECT_KRW':''),sectionGroup:String(ordinal+1),
        attempt:Number(row.chapterAttempts?.[ordinal] || 1),generationSource:source},
        // Storage retries can reuse the response; other retries bypass any
        // rejected cached output, including failures with legacy quality codes.
        {owner:String(row.userId),skipRead:Number(row.chapterAttempts?.[ordinal] || 1)>1 && row.lastFailure?.stage!=='storage'});
      let ask: {analysis:AskAnalysis;evidence:EvidencePacket}|undefined;
      if(row.generationCheckpoint?.version==='ask-generation-v1') {
        const consultation=row.snapshot.analysis.consultation;
        const saved=row.generationCheckpoint.analysis;
        if(saved) {
          if(saved.version!=='ask-analysis-v1')throw new FortuneError('INVALID_ASK_ANALYSIS',500);
          parseAskAnalysis(escapeAskData(saved),consultation);
        } else {
          stage='analysis';
          const providerForAnalysis=sharedProvider;
          const analysis=await analyzeAsk(consultation,(system,data)=>providerForAnalysis.analyzeQuestion(system,data));
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
      const repair=Number(row.chapterAttempts?.[ordinal] || 0)>1 && (row.lastFailure?.stage==='quality'||chapterQualityFailure(row.lastFailure?.code))
        ? {code:row.lastFailure.code}:undefined;
      const followupQuestion=ordinal===1&&row.snapshot?.questionSkyStage?.version===QUESTION_SKY_TWO_STAGE_VERSION
        ? row.generationCheckpoint?.followup?.question : undefined;
      if(ordinal===1&&row.snapshot?.questionSkyStage?.version===QUESTION_SKY_TWO_STAGE_VERSION&&!followupQuestion)
        throw new FortuneError('FOLLOWUP_NOT_SUBMITTED',409);
      const input={deliveryContract:CHAPTER_DELIVERY_VERSION,locale:readingLocale(row.snapshot.locale),outputContext:row.snapshot.outputContext,chapter:row.snapshot.manifest[ordinal],analysis:snapshotAnalysis(row.snapshot),previous:row.chapters,repair,ask,followupQuestion,persona:row.snapshot.persona,voiceStyle:row.snapshot.voiceStyle};
      if(!input.chapter) throw new FortuneError('INVALID_MANIFEST',500);
      const provider=new StructuredChapterProvider(sharedProvider);
      const generated=await provider.generateChapter(input);
      stage='quality';
      result=deliverChapter(generated,input);
      const natalFacts=input.analysis.contexts?.saju?.facts.find(f=>f.label==='pillars')?.value;
      // chapter.ts corrects the reader's pillars first; a claim left here keeps a quality code so the one repair can name it.
      if(natalFacts)try{assertSajuPillarClaims(result,natalFacts);}catch{throw new FortuneError('SAJU_PILLAR_CONTRADICTION');}
      stage='storage';
      await saveChapterDraft(env,userId,requestId,token,ordinal,{raw:generated,body:result,receipt:sharedProvider.receipt});
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
    if(stage==='provider'&&chapterQualityFailure(code))stage='quality';
    const detail=error instanceof FortuneError?error.detail:undefined;
    console.warn('[yeongnyangi-generation]',JSON.stringify({requestId,chapter:ordinal,stage,durationMs:Date.now()-startedAt,code,detail}));
    const allowedAttempts=allowedChapterAttempts(row,ordinal);
    const askQuality=stage==='quality'&&ordinal===0&&row.generationCheckpoint?.version==='ask-generation-v1';
    // One existing-budget quality regeneration at most. A second rejection
    // preserves the paid request and saved chapters for support review.
    const review=askQuality&&!hasChapterDeliveryContract(row)&&(row.lastFailure?.stage==='quality'||Number(row.chapterAttempts?.[ordinal] || 0)>=allowedAttempts);
    try { await failChapter(env,userId,requestId,token,review?'ASK_LIMITED_REVIEW_REQUIRED':code,
      row.chapterAttempts?.[ordinal] || 1,stage,stage==='storage'?Number.MAX_SAFE_INTEGER:allowedAttempts,review?code:detail,ordinal,sharedProvider?.receipt); }
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
  const refundPending=deliveryRefundPending(row)&&row.state!=='REFUNDED';
  const complete=row.state==='COMPLETED',awaitingFollowup=row.state==='AWAITING_FOLLOWUP',awaitingDraw=row.state==='AWAITING_DRAW',blocked=row.state==='REFUNDED'||refundPending||errorCode==='PAYMENT_NOT_ACTIVE';
  // A held order is still being recovered server-side: saved chapters stay readable and nothing asks the buyer to pay or chase.
  const held=!complete&&!blocked&&errorCode==='GENERATION_REVIEW_REQUIRED';
  // The buyer may retry a stopped chapter, or a held one whose budget ran out, a capped number of times.
  const canRetryNow=userCanRetry(row);
  const recovery={requestId:String(row._id),savedChapters:row.chapters.length,totalChapters:row.snapshot.manifest.length,
    refundPending,providerNeeded:!complete&&!blocked&&!awaitingFollowup&&!awaitingDraw&&row.chapters.length<row.snapshot.manifest.length,retryable:!complete&&!awaitingFollowup&&!awaitingDraw&&!blocked&&!held,
    canRetryNow,nextAttemptAt:row.nextAttemptAt || null,reviewRequired:held,
    nextAction:complete?'reread':awaitingDraw?'draw':blocked?'support':canRetryNow?'retry':held?'held':'wait',autoResume:held&&holdAutoResumes(row)};
  return {id:row._id,locale:readingLocale(row.snapshot.locale),profileId:row.profileId,productId:row.productId,state:row.state,
    charts:!symbolic && hasRequestAccess(row) && row.state!=='REFUNDED'?readingCharts(snapshotAnalysis(row.snapshot),row.snapshot.manifest).map(chart=>correctionApplied?{...chart,source:"검수된 정정 계산 근거"}:chart):undefined,
    ...(correctionApplied?{correction:{reason:row.correction.reason,appliedAt:row.correction.appliedAt}}:{}),
    paid:hasRequestAccess(row),accessMethod:row.accessMethod || (row.paymentId?'DIRECT_KRW':undefined),product:row.snapshot.product,manifest:symbolic ? row.snapshot.manifest.map(({id,title,ordinal,part}:any)=>({id,title,ordinal,part})) : row.snapshot.manifest.map(({counsel:_counsel,...chapter}:any)=>chapter),
    consultation:(row.snapshot.analysis.consultation?Object.fromEntries(Object.entries(row.snapshot.analysis.consultation).filter(([key])=>key!=='counselVersion')):undefined) || {topicId:row.snapshot.analysis.topicId || 'general',question:row.snapshot.analysis.question || '',asOf:row.snapshot.analysis.asOf},
    chapters:row.state==='REFUNDED'?[]:symbolic ? row.chapters.map(({title,summary,analysis,example,advice,persona,highlights,topics,blocks,questionAnswers,followUpSuggestions,visualSlots}:any)=>({...((title)?{title}:{}),summary,analysis,example,advice,persona,highlights,topics,blocks,questionAnswers,followUpSuggestions,visualSlots,sources:[]})) : row.chapters.map(({internalBasis:_serverOnly,...chapter}:any)=>chapter),
    ...(row.snapshot.tarotSpread?{tarotSpread:publicTarotSpread(row.snapshot)}:{}),
    followup:row.snapshot?.questionSkyStage?.version===QUESTION_SKY_TWO_STAGE_VERSION?{status:row.generationCheckpoint?.followup?.status || (awaitingFollowup?'available':'unavailable'),used:Boolean(row.generationCheckpoint?.followup?.used),suggestions:row.generationCheckpoint?.followup?.suggestions || row.chapters?.[0]?.followUpSuggestions || []}:undefined,
    conversation:conversationView(row),recovery,errorCode,createdAt:row.createdAt,completedAt:row.completedAt};
}
