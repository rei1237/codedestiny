import {createPrashnaSnapshot,generatePrashnaPromptResult} from '../lib/vedic-prashna-prompt.js';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {TossError} from './policy.js';

export async function tossVedicPrashna(env,auth,body,{snapshot=createPrashnaSnapshot,generate=generatePrashnaPromptResult,free=isFreeFortuneFeatureKey,requestUrl='https://code-destiny.com/api/toss/vedic/prashna'}={}){
 if(!auth?.ownerId)throw new TossError('LOGIN_REQUIRED',401);
 if(!free('vedic_prashna_prompt'))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 let captured;
 try{
  // The original standalone prompt captures the server's current instant.
  // Caller-supplied time, account, payment and saved-chart hints are ignored.
  captured=await snapshot({question:body?.question,latitude:body?.latitude,longitude:body?.longitude});
  const result=await generate(env,captured,{requestUrl});
  return {ok:true,accessSource:'public',featureKey:'vedic_prashna_prompt',snapshot:captured,result,promptText:result.promptText,chart:result.chart};
 }catch(error){throw new TossError(String(error?.code||'PRASHNA_GENERATION_FAILED'),captured?503:Number(error?.status)||(error?.code==='TIMEZONE_LOOKUP_FAILED'?422:400));}
}
