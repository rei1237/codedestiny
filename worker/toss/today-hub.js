import {ProfileCard} from '../lib/models.js';
import {withMongoRetry} from '../lib/db.js';
import {toClientProfile} from '../routes/profile.js';
import {handleFortuneTodayRoutes} from '../routes/fortune-today.js';
import {TossError} from './policy.js';

// Resolve the selected profile under the authenticated Toss owner before building
// the original web engine's request. Caller-controlled birth data never enters it.
export async function readTodayHub(env,auth,body,requestUrl,{
  findProfile=query=>withMongoRetry(env,()=>ProfileCard.findOne(query).lean()),
  readFortune=handleFortuneTodayRoutes,
}={}){
  const {profileId='',period='today'}=body||{};
  if(typeof profileId!=='string'||profileId.length>80||!['today','tomorrow'].includes(period))throw new TossError('INVALID_INPUT');
  const url=new URL('/api/fortune/today-hub',requestUrl);
  url.searchParams.set('period',period);
  url.searchParams.set('detail','1');
  url.searchParams.set('locale','ko');
  if(profileId){
    const doc=await findProfile({userId:auth.ownerId,profileId});
    if(!doc)throw new TossError('PROFILE_NOT_FOUND',404);
    const profile=toClientProfile(doc);
    url.searchParams.set('birth',profile.birthDate);
    if(!profile.timeUnknown)url.searchParams.set('time',profile.birthTime);
    url.searchParams.set('cal',profile.calendarType);
    if(profile.gender==='M'||profile.gender==='F')url.searchParams.set('gender',profile.gender==='M'?'male':'female');
  }
  const response=await readFortune(new Request(url),env);
  const data=await response.json();
  if(!response.ok||!data.ok)throw new TossError(data.code||'TODAY_HUB_UNAVAILABLE',response.ok?503:response.status);
  return data;
}
