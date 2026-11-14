import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {ProfileCard} from '../lib/models.js';
import {buildSukuyoYearlyFortuneResultV2} from '../lib/sukuyo-yearly.js';
import {TossError} from './policy.js';

export const SUKUYO_YEARLY_FEATURE='sukyo_yearly_fortune_unlock';
export async function tossSukuyoYearly(env,auth,input,{findProfile=(query)=>ProfileCard.findOne(query).lean(),build=buildSukuyoYearlyFortuneResultV2,free=isFreeFortuneFeatureKey}={}){
 if(!auth?.ownerId)throw new TossError('LOGIN_REQUIRED',401);
 if(!free(SUKUYO_YEARLY_FEATURE))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 const profileId=typeof input?.profileId==='string'?input.profileId.trim():'';
 const year=Number(input?.year);
 if(!profileId||profileId.length>80||profileId.startsWith('birth:'))throw new TossError('MISSING_PROFILE_ID',400);
 if(!Number.isInteger(year)||year<1900||year>2100)throw new TossError('INVALID_TARGET_YEAR',400);
 const profile=await findProfile({userId:auth.ownerId,profileId});
 if(!profile)throw new TossError('INVALID_PROFILE',403);
 const result=await build({auth:{userId:String(auth.ownerId)},profile,targetYear:year,env,requestUrl:'https://code-destiny.com/api/toss/sukuyo/yearly'});
 return {ok:true,stored:false,accessSource:'public',profileId,year,result};
}
