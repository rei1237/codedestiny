import {tossVedicReading} from './vedic-reading.js';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
import {TossError} from './policy.js';

export async function tossVedicCompatibility(env,auth,body,{reading=tossVedicReading,free=isFreeFortuneFeatureKey,requestUrl='https://code-destiny.com/api/toss/vedic/compatibility'}={}){
 if(!auth?.ownerId)throw new TossError('LOGIN_REQUIRED',401);
 if(!free('vedic-compatibility-per-use'))throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
 const [mine,partner]=await Promise.all([
  reading({birth:body?.birth,name:body?.name},env,{requestUrl}),
  reading({birth:body?.partner?.birth,name:body?.partner?.name},env,{requestUrl}),
 ]);
 return {ok:true,accessSource:'public',featureKey:'vedic-compatibility-per-use',stored:false,mine,partner};
}
