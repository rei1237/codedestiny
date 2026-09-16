import {ProfileCard} from '../lib/models.js';
import {withMongoRetry} from '../lib/db.js';
import {drawTarotCardsForSpread} from '../../lib/tarot/tarot-interpretation-engine.mjs';
import {domains} from './fortune';
import {FortuneError,type DomainId,type FortuneInput} from './fortune/shared/contracts';
import {koreanCivilProfile} from './fortune/shared/korean-time';
import {freeCategories,birthCategories} from './fortune/free/categories';
import {calculateFree} from './fortune/free/readings';
import {attendanceStatus,attend,unlockToday,requireDailyPass,readFreeResult,claimFreeReading,finishFreeReading,releaseFreeReading} from './free-repository.js';
import {ownerId} from './repository.js';

export {attendanceStatus,attend,unlockToday};

function birthFromProfile(profile:any) {
  const birth=profile.birth||{},place=profile.location||{},pad=(n:number)=>String(n).padStart(2,'0');
  const calendarType:'solar'|'lunar'=birth.calType==='solar'?'solar':'lunar';
  const gender:'male'|'female'|undefined=profile.gender==='M'?'male':profile.gender==='F'?'female':undefined;
  return {birthDate:`${birth.year}-${pad(birth.month)}-${pad(birth.day)}`,
    ...(!birth.timeUnknown?{birthTime:`${pad(birth.hour)}:${pad(birth.minute)}`}:{ }),
    calendarType,leapMonth:birth.calType==='lunar_leap',gender,
    ...(place.label?{birthPlace:{name:place.label,latitude:place.lat,longitude:place.lng,timezone:place.tz}}:{}),
  };
}

function categoryConfig(category:string){
  const config=freeCategories.find(item=>item.id===category);
  if(!config)throw new FortuneError('INVALID_CATEGORY');
  return config;
}

function normalizeDraft(category:string,raw:unknown){
  const config=categoryConfig(category),draft:Record<string,string>={};
  const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{ };
  for(const [key,value] of Object.entries(source)){
    if(typeof value!=='string'||value.length>1000)throw new FortuneError('INVALID_INPUT');
    if(config.fields.some(field=>field.id===key))draft[key]=value;
  }
  return draft;
}

export async function getFreeReading(env:Record<string,unknown>,userId:string,category:string,now=new Date()){
  categoryConfig(category);const {day}=await requireDailyPass(env,userId,now);
  return {result:await readFreeResult(env,userId,day,category)};
}

export async function prepareFreeReading(env:Record<string,unknown>,userId:string,body:any,now=new Date()){
  const category=String(body?.category||''),config=categoryConfig(category),{day}=await requireDailyPass(env,userId,now);
  const draft=normalizeDraft(category,body?.draft),profileId=typeof body?.profileId==='string'?body.profileId:'';
  let profile:any=null;
  if(profileId)profile=await withMongoRetry(env,()=>ProfileCard.findOne({userId:ownerId(userId),profileId}).lean());
  if(profileId&&!profile)throw new FortuneError('PROFILE_NOT_FOUND',404);
  if(birthCategories.has(config.id)&&!profile)throw new FortuneError('FREE_PROFILE_REQUIRED');
  const raw={question:draft.question||'오늘 내가 살펴볼 선택은?',readingMode:'personal' as const,
    ...(profile?{personA:birthFromProfile(profile)}:{})};
  const validationDomain=(['basic','comprehensive','dangsaju','kusei','numerology'].includes(category)?'saju':category) as DomainId;
  const input:FortuneInput=birthCategories.has(config.id)
    ?domains[validationDomain].validateInput(raw)
    :{question:raw.question,readingMode:'personal'};
  if(input.personA&&['saju','basic','comprehensive','dangsaju','ziwei','kusei'].includes(category))koreanCivilProfile(input.personA);
  const drawn=category==='tarot'?drawTarotCardsForSpread('three_card_cause_process_outcome'):undefined;
  const claimed=await claimFreeReading(env,userId,day,category,profileId,{input,draft,drawn},now);
  if(claimed.row.result)return claimed.row.result;
  try{
    const saved=claimed.row.input;
    const result=await calculateFree(category,saved.input,saved.draft,day,env as Record<string,string>,saved.drawn);
    const completed=await finishFreeReading(env,userId,claimed.row._id,claimed.claim,result);
    if(!completed)throw new FortuneError('FREE_READING_PENDING',409);
    return completed.result;
  }catch(error){await releaseFreeReading(env,userId,claimed.row._id,claimed.claim);throw error;}
}
