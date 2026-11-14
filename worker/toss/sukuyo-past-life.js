import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {calculateSukuyoForMoment} from '../lib/sukuyo-astronomy.js';
import {buildSukuyoBondReport} from '../lib/saju-section/report.js';
import {ProfileCard} from '../lib/models.js';
import {sukuyoPastLifeCore as original} from '../routes/sukuyo.js';
import {TossError} from './policy.js';

export async function tossSukuyoPastLife(env,auth,body,{findProfile=query=>ProfileCard.findOne(query).lean(),core=original,build=buildSukuyoBondReport,calculate=calculateSukuyoForMoment,free=isFreeFortuneFeatureKey,requestUrl='https://code-destiny.com/api/toss/sukuyo/past-life'}={}){
 if(!auth?.ownerId)throw new TossError('LOGIN_REQUIRED',401);
 if(!free('sukuyo-past-life-reading'))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 const profileId=typeof body?.profileId==='string'?body.profileId.trim():'';
 if(profileId.length>80||profileId.startsWith('birth:'))throw new TossError('INVALID_PROFILE',400);
 let profile;
 if(profileId){const stored=await findProfile({userId:auth.ownerId,profileId});if(!stored)throw new TossError('INVALID_PROFILE',403);profile=core.normalizeProfileCardForSukuyo(stored);}
 else profile={profileId:'',name:String(body?.userName||'나').slice(0,40),gender:body?.userGender,birthDate:body?.userBirthDate,calendarType:body?.userCalendarType||'solar',birthTime:body?.userBirthTime||'12:00',timezone:body?.timezone||'Asia/Seoul'};
 if(!profile)throw new TossError('INVALID_PROFILE',400);
 const self=core.normalizePersonInput(profile,'나'),partner=core.normalizePersonInput(core.normalizePastLifePartner(body),'상대');
 if(!self.birthYear||!partner.birthYear)throw new TossError('BIRTH_INVALID',400);
 const purpose=core.normalizePastLifePurpose(body?.purpose);
 const moment=person=>({calendarType:person.calendarType,year:person.birthYear,month:person.birthMonth,day:person.birthDay,hour:person.birthHour??12,minute:person.birthMinute??0,timezone:person.timezone,timezoneOffset:person.timezoneOffset,latitude:person.latitude,longitude:person.longitude,birthTimeKnown:!person.isTimeUnknown});
 const [selfSukuyo,partnerSukuyo]=await Promise.all([calculate(env,moment(self),{requestUrl,useVerifiedNatal:true}),calculate(env,moment(partner),{requestUrl,useVerifiedNatal:true})]);
 const result=build({userProfileId:profileId,userName:self.name,partnerName:partner.name,userBirthDate:self.birthDate,partnerBirthDate:partner.birthDate,userGender:self.gender,partnerGender:partner.gender,purpose,
  userMansionIdx:selfSukuyo.mansionIdx,partnerMansionIdx:partnerSukuyo.mansionIdx,userMansion:selfSukuyo.mansion+'숙',partnerMansion:partnerSukuyo.mansion+'숙'});
 return {ok:true,...result,source:'public',reportId:null,stored:false};
}
