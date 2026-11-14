import {buildSecretHouseStep} from '../../../worker/lib/saju-section/secret-house.js';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';
export function privateSecretHouse(body){
 const featureKey='rpt_secretHouseEntryCard';
 if(body?.featureKey!==featureKey||!isFreeFortuneFeatureKey(featureKey))return Response.json({error:'SECTION_NOT_PUBLIC'},{status:404});
 try{return Response.json({ok:true,unlocked:true,accessSource:'public',featureKey,house:buildSecretHouseStep(body.house,(message,code)=>{throw Object.assign(Error(message),{code});})});}
 catch(error){return Response.json({error:error.code||'INVALID_INPUT'},{status:400});}
}
