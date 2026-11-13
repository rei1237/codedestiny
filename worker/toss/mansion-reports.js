import {ProfileCard} from '../lib/models.js';
import {withMongoRetry} from '../lib/db.js';
import {toClientProfile} from '../routes/profile.js';
import {buildMansionProfileReport,handleMuhurta,handleVvipCodex} from '../routes/nakshatra-premium.js';
import {lunarToSolar} from '../../lib/korean-calendar/core.js';
import {ianaOffsetHours} from '../../lib/fortune/nakshatra-timezone.mjs';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {TossError} from './policy.js';

const readers={
  muhurta:handleMuhurta,'vvip-codex':handleVvipCodex,
  'lord-report':(request,env,_auth,input)=>buildMansionProfileReport(request,env,'lord-report',input),
  'dasha-map':(request,env,_auth,input)=>buildMansionProfileReport(request,env,'dasha-map',input),
};
export async function readOwnedMansionReport(request,env,auth,kind,body,{
  findProfile=query=>withMongoRetry(env,()=>ProfileCard.findOne(query).lean()),
  read=readers[kind],
}={}){
  if(!Object.hasOwn(readers,kind)||!isFreeFortuneFeatureKey('nakshatra-'+kind))throw new TossError('NOT_AVAILABLE',403);
  if(typeof body?.profileId!=='string'||!body.profileId||body.profileId.length>80)throw new TossError('INVALID_PROFILE');
  const doc=await findProfile({userId:auth.ownerId,profileId:body.profileId});
  if(!doc)throw new TossError('PROFILE_NOT_FOUND',404);
  const profile=toClientProfile(doc);
  let birthDate=profile.birthDate;
  if(profile.calendarType!=='solar'){
    const {year,month,day}=profile.birth;
    const solar=lunarToSolar(year,month,day,profile.calendarType==='lunar_leap');
    if(!solar)throw new TossError('BIRTH_INVALID');
    birthDate=[solar.year,solar.month,solar.day].map(n=>String(n).padStart(2,'0')).join('-');
  }
  const [year,month,day]=birthDate.split('-').map(Number);
  const [hour,minute]=(profile.timeUnknown?'12:00':profile.birthTime).split(':').map(Number);
  const location=profile.location;
  const clock={year,month,day,hour,minute,lat:location.lat,lon:location.lng,
    timezone:ianaOffsetHours(year,month,day,hour,minute,location.tz)};
  const payload={...clock,timeUnknown:profile.timeUnknown,gender:profile.gender==='M'?'male':profile.gender==='F'?'female':'',purpose:body.purpose,startDate:body.startDate};
  const response=await read(request,env,{userId:auth.ownerId},payload);
  const data=await response.json();
  if(!response.ok||!data.ok)throw new TossError(data.reason||'NAKSHATRA_UNAVAILABLE',response.ok?503:response.status);
  return data;
}
