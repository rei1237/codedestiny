import { ProfileCard } from '../lib/models.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { getEnv } from '../lib/env.js';
import { resolveChargeAmountKRW } from '../lib/portone.js';
import { domains } from './fortune';
import { getProduct } from './payments/catalog';
import { analyze } from './fortune/analysis';
import { readingManifest } from './fortune/reading-manifest';
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
  const date=new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10);
  const fingerprint=await digest({productId:product.id,profileId:body.profileId,normalized,date});
  const id=await digest({userId,fingerprint});
  // Deterministic intent also survives losing all browser storage and returning with the same inputs.
  const contexts: Partial<Record<DomainId,DomainContext>>={};
  for(const system of product.systems) contexts[system]=domains[system].buildContext(await domains[system].calculate(normalized[system],{runtimeEnv:env,asOf:date,tarotFusion:product.readingKind!=='single'}));
  const analysis={...analyze(contexts),question:normalized[product.domain].question,topicId:normalized[product.domain].topicId,readingMode:raw.readingMode,asOf:date};
  const manifest=readingManifest(product,analysis.topicId,raw.readingMode);
  return createRequest(env,userId,id,{profileId:body.profileId,productId:product.id,featureKey:product.cdFeatureKey,
    amountKRW:product.priceKRW,fingerprint,snapshot:{product,analysis,manifest,profileUpdatedAt:profile.updatedAt}});
}

export async function activateFortune(env: Record<string, unknown>, userId: string, requestId: string) {
  const request=await readRequest(env,userId,requestId);
  return attachPayment(env,userId,requestId,resolveChargeAmountKRW(env,request.amountKRW));
}

export async function generateNextChapter(env: Record<string, unknown>, userId: string, requestId: string) {
  if (!providerReady(env)) throw new FortuneError('LLM_NOT_CONFIGURED',503);
  const {row,token}=await claimChapter(env,userId,requestId);
  if(!token) return row;
  const ordinal=row.chapters.length;
  try {
    if(row.attempts>row.snapshot.manifest.length*3+(row.additionalAttempts || 0)) throw new FortuneError('GENERATION_REVIEW_REQUIRED',409);
    const input={chapter:row.snapshot.manifest[ordinal],analysis:row.snapshot.analysis,previous:row.chapters};
    if(!input.chapter) throw new FortuneError('INVALID_MANIFEST',500);
    const provider=new StructuredChapterProvider(new CodeDestinyProvider(env));
    const result=validateChapter(await provider.generateChapter(input),input);
    const completed=await finishChapter(env,userId,requestId,token,ordinal,result,row.snapshot.manifest.length);
    if(!completed) throw new FortuneError('GENERATION_LEASE_LOST',409);
    return completed;
  } catch(error) {
    await failChapter(env,userId,requestId,token,error instanceof FortuneError?error.code:'GENERATION_FAILED');
    throw error;
  }
}

export function presentFortune(row: any) {
  return {id:row._id,profileId:row.profileId,productId:row.productId,state:row.state,
    paid:Boolean(row.paymentId),product:row.snapshot.product,manifest:row.snapshot.manifest,
    chapters:row.state==='REFUNDED'?[]:row.chapters,errorCode:row.errorCode,createdAt:row.createdAt,completedAt:row.completedAt};
}
