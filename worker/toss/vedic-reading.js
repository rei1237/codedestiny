import {flowerBirthInput} from './birth-input.js';
import {TossError} from './policy.js';
import {validateInput} from '../yeongnyangi/fortune/shared/input.ts';
import {chartInput} from '../yeongnyangi/fortune/shared/time.ts';
import {getSwissVedicPlanets} from '../lib/swiss-ephemeris.js';
import {vedicPositions} from '../lib/verified-natal.js';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';

// Original web reader uses verified natal positions when supported and Swiss
// half-day samples for retrograde motion. This endpoint only prepares inputs;
// source-authored interpretation functions remain identical in the client.
export async function tossVedicReading(body,env,{engine=getSwissVedicPlanets,natal=vedicPositions,free=isFreeFortuneFeatureKey,requestUrl}={}){
 if(!free('vedic_basic_reading'))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 if(body?.birth?.date?.timeUnknown)throw new TossError('BIRTH_TIME_REQUIRED');
 if(!['M','F'].includes(body?.birth?.gender))throw new TossError('BIRTH_GENDER_REQUIRED');
 let clock;
 try{clock=chartInput(validateInput(flowerBirthInput(body.birth),'vedic').personA);}catch{throw new TossError('BIRTH_INVALID');}
 const input={year:clock.year,month:clock.month,day:clock.day,hour:clock.hour,minute:clock.minute,timezone:clock.timezone,lat:clock.lat,lon:clock.lon,gender:body.birth.gender,name:typeof body.name==='string'?body.name.slice(0,40):'나',birthTimeKnown:true};
 const samples=[];
 for(const halfDay of [-1,0,1]){
  const utc=new Date(clock.utc.getTime()+halfDay*43200000);
  let sample;try{sample=await engine(env,{year:utc.getUTCFullYear(),month:utc.getUTCMonth()+1,day:utc.getUTCDate(),hour:utc.getUTCHours(),minute:utc.getUTCMinutes(),timezone:0,lat:clock.lat,lon:clock.lon},{strictSwiss:true,allowFallback:false,localOnly:true,requestUrl});}catch{throw new TossError('CHART_UNAVAILABLE',503);}
  if(sample?.fallbackUsed!==false||sample.engineQuality!=='swiss')throw new TossError('CHART_UNAVAILABLE',503);
  samples.push({...sample,jd:utc.getTime()/86400000+2440587.5});
 }
 const primary=input.year>=1900&&input.year<=2050&&Math.abs(input.lat)<90?natal(clock.utc,input.lat,input.lon):null;
 return {stored:false,accessSource:'public',input,natal:primary,samples};
}
