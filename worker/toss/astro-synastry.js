import {handleAstroSynastry} from '../routes/astro-synastry.js';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {flowerBirthInput} from './birth-input.js';
import {validateInput} from '../yeongnyangi/fortune/shared/input.ts';
import {chartInput} from '../yeongnyangi/fortune/shared/time.ts';
import {TossError} from './policy.js';

const keys=['compat-astro-synastry','compat-astro-direct-synastry'];
function moment(birth){
 try{
  const raw=flowerBirthInput({...birth,gender:birth?.gender||'OTHER'});
  raw.personA.birthTime||='12:00';
  const person=validateInput(raw,'astrology').personA,clock=chartInput(person);
  return {date:person.birthDate,time:person.birthTime,timeKnown:birth.date.timeUnknown!==true,timezone:clock.timezone,latitude:clock.lat,longitude:clock.lon};
 }catch{throw new TossError('BIRTH_INVALID');}
}
export async function tossAstroSynastry(body,env,{handler=handleAstroSynastry,free=isFreeFortuneFeatureKey}={}){
 const featureKey=body?.featureKey;
 if(!keys.includes(featureKey)||!free(featureKey))throw new TossError('SECTION_NOT_PUBLIC',404);
 const mine=moment(body.birth);
 let partner,celeb;
 if(featureKey==='compat-astro-direct-synastry'){
  const other=moment(body.partner?.birth);
  partner={name:String(body.partner?.name||'상대방').slice(0,60),gender:body.partner?.birth?.gender||'OTHER',date:other.date,time:other.time,tzOffsetHours:other.timezone,latitude:other.latitude,longitude:other.longitude,cityLabel:String(body.partner?.birth?.location?.label||'').slice(0,80)};
 }else celeb={name:String(body.celeb?.name||'').slice(0,80),birth:String(body.celeb?.birth||'').slice(0,10)};
 // Reuse only the explicitly public original branch. Neither saved profile
 // identity nor purchase evidence is accepted from this guest calculator.
 return handler(new Request('https://code-destiny.com/api/astro/synastry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...mine,featureKey,partner,celeb,lang:'ko'})}),env);
}
