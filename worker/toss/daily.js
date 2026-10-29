import {ProfileCard} from '../lib/models.js';
import {withMongoRetry} from '../lib/db.js';
import {attendanceStatus,attend,unlockToday,getFreeReading,prepareFreeReading} from '../yeongnyangi/free-service.ts';
import {freeCategories,birthCategories} from '../yeongnyangi/fortune/free/categories.ts';
import {validateBirth} from './preparation.js';
import {hash} from './crypto.js';
import {TossError} from './policy.js';

export {attendanceStatus,attend,unlockToday,getFreeReading};

// The existing daily pass, KST day, stored draw and calculation engines own access and results.
// Horary needs a different input/chart contract and is not advertised as implemented here.
export async function prepareTossDaily(env,auth,body){
  const category=freeCategories.find(item=>item.id===body?.category&&item.id!=='horary');
  if(!category)throw new TossError('INVALID_CATEGORY');
  const existing=await getFreeReading(env,auth.userId,category.id);
  if(existing.result)return existing.result;
  const source=body?.draft;
  if(!source||typeof source!=='object'||Array.isArray(source))throw new TossError('INVALID_INPUT');
  const draft={};
  for(const field of category.fields){
    const value=source[field.id];
    if(value===undefined)continue;
    if(typeof value!=='string'||value.length>1000)throw new TossError('INVALID_INPUT');
    draft[field.id]=value;
  }
  let profileId='';
  if(birthCategories.has(category.id)){
    const birth=validateBirth(body.birth);
    profileId='toss-daily-'+await hash(JSON.stringify(birth));
    await withMongoRetry(env,()=>ProfileCard.updateOne({userId:auth.ownerId,profileId},{$setOnInsert:{
      userId:auth.ownerId,profileId,name:'오늘의 운세 대상',gender:birth.gender,birth:birth.date,location:birth.location,
    }},{upsert:true}));
  }
  return prepareFreeReading(env,auth.userId,{category:category.id,profileId,draft});
}
