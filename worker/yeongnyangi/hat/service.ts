import {ProfileCard} from '../../lib/models.js';
import {withMongoRetry} from '../../lib/db.js';
import {ownerId} from '../repository.js';
import {domains} from '../fortune';
import {FortuneError,type DomainContext,type DomainId,type FortuneInput} from '../fortune/shared/contracts';
import {calculateHumanDesignChart} from '../../lib/human-design-ephemeris.js';
import {CALCULATION_VERSION} from '../../../lib/human-design/version.js';
import {hatSystems,type HatSystem,type HatSystemResult} from '../../../lib/yeongnyangi/hat-houses';
import {assignHat,hatEvidence} from './rules';

// Only a request-in-flight lock: no birth data or result is retained in this map.
const inFlight=new Set<string>();
const omissions:Record<string,string>={BIRTH_TIME_REQUIRED:'태어난 시간이 없어 이번 배정에서는 제외했어요.',BIRTH_PLACE_REQUIRED:'출생지와 시간대를 확인하면 이 체계를 함께 읽을 수 있어요.',GENDER_REQUIRED:'이 계산기에 필요한 성별 정보가 없어 제외했어요.',SAJU_KST_REQUIRED:'현재 자미두수 계산기는 한국 출생 정보를 지원해요.',HOUSE_SYSTEM_UNAVAILABLE:'현재 하우스 계산기가 이 출생 위도를 지원하지 않아요.'};
type StoredProfile={birth?:{year:number;month:number;day:number;hour?:number;minute?:number;timeUnknown?:boolean;calType?:string};gender?:string;location?:{tz?:string;lat?:number;lng?:number;label?:string}};
export function hatBirthFromProfile(profile:StoredProfile){
 const b=profile.birth,p=profile.location,pad=(v:number)=>String(v).padStart(2,'0');
 if(!b)throw new FortuneError('INVALID_BIRTH_DATE');
 return {birthDate:`${b.year}-${pad(b.month)}-${pad(b.day)}`,calendarType:b.calType==='solar'?'solar':'lunar',leapMonth:b.calType==='lunar_leap',
  ...(!b.timeUnknown&&Number.isInteger(b.hour)&&Number.isInteger(b.minute)?{birthTime:`${pad(b.hour!)}:${pad(b.minute!)}`} : {}),
  ...(profile.gender==='M'||profile.gender==='F'?{gender:profile.gender==='M'?'male':'female'}:{}),
  ...(p?.tz&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)?{birthPlace:{timezone:p.tz,latitude:p.lat,longitude:p.lng,name:p.label}}:{})};
}
// Dependencies are explicit for mock-only verification. Defaults use existing engines.
export const hatCalculators={
 async domain(id:Exclude<HatSystem,'human-design'>,input:FortuneInput,env:Record<string,unknown>){
  // The sorting rules read natal fields only; freeze incidental timeline calculations.
  return domains[id].calculate(input,{runtimeEnv:env,asOf:'2026-01-01T00:00:00Z'});
 },
 async humanDesign(input:FortuneInput,env:Record<string,unknown>){
  const b=input.personA!;
  return calculateHumanDesignChart(env,{birthDate:b.birthDate,birthTime:b.birthTime,calendar:'solar',timezone:b.birthPlace!.timezone,latitude:b.birthPlace!.latitude,longitude:b.birthPlace!.longitude});
 },
};
export async function calculateHat(profile:StoredProfile,env:Record<string,unknown>,calculators=hatCalculators){
 const rawBirth=hatBirthFromProfile(profile),systems:HatSystemResult[]=[];
 // Sequential Swiss calls: avoid concurrent use of its shared WASM runtime.
 for(const id of Object.keys(hatSystems) as HatSystem[]){
  try{
   if(!rawBirth.birthPlace)throw new FortuneError('BIRTH_PLACE_REQUIRED');
   if(id!=='saju'&&!rawBirth.birthTime)throw new FortuneError('BIRTH_TIME_REQUIRED');
   if(id==='ziwei'&&rawBirth.birthPlace.timezone!=='Asia/Seoul')throw new FortuneError('SAJU_KST_REQUIRED');
   const input=domains[id==='human-design'?'astrology':id as DomainId].validateInput({personA:rawBirth,readingMode:'personal',question:''});
   const context=id==='human-design'?await calculators.humanDesign(input,env):await calculators.domain(id,input,env);
   const evidence=hatEvidence(id,context);
   if(!evidence.length)throw new FortuneError('HAT_CALCULATION_UNAVAILABLE',503);
   systems.push({id,status:'used',engineVersion:id==='human-design'?CALCULATION_VERSION:(context as DomainContext).engineVersion,evidence,
    ...(id==='saju'&&!rawBirth.birthTime?{reason:'출생시간 미상으로 시주를 제외했어요. 절기 경계에서는 생월 판정이 달라질 수 있어요.'}:{})});
  }catch(error){
   const code=error instanceof Error?error.message:'';
   if(omissions[code]){systems.push({id,status:'omitted',reason:omissions[code],evidence:[]});continue;}
   // Bad input stays actionable; infrastructure errors never become a fake partial result.
   if(error instanceof FortuneError&&error.status<500)throw error;
   throw new FortuneError('HAT_CALCULATION_UNAVAILABLE',503);
  }
 }
 return assignHat(systems);
}
export async function prepareHat(env:Record<string,unknown>,userId:string,body:unknown){
 const profileId=body&&typeof body==='object'&&!Array.isArray(body)?(body as {profileId?:unknown}).profileId:null;
 if(typeof profileId!=='string'||!profileId.trim()||profileId.length>120)throw new FortuneError('FREE_PROFILE_REQUIRED');
 const key=String(userId);
 if(inFlight.has(key))throw new FortuneError('HAT_CALCULATION_PENDING',409);
 inFlight.add(key);
 try{
  const profile=await withMongoRetry(env,()=>ProfileCard.findOne({userId:ownerId(userId),profileId}).lean());
  if(!profile)throw new FortuneError('PROFILE_NOT_FOUND',404);
  return await calculateHat(profile as StoredProfile,env);
 }finally{inFlight.delete(key);}
}
