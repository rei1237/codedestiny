import {withMongoRetry} from '../lib/db.js';
import {TossIdentity} from './models.js';
import {unseal} from './crypto.js';
import {unlinkIdentity} from './partner.js';

const MAX_ATTEMPTS=6;
export async function processPendingUnlinks({store,remove,now=new Date(),limit=10}){
  const counts={completed:0,deferred:0,supportRequired:0};
  for(let index=0;index<limit;index++){
    const row=await store.claim(now,MAX_ATTEMPTS);
    if(!row)break;
    try{
      await remove(row);
      await store.complete(row);
      counts.completed++;
    }catch{
      const exhausted=row.unlinkAttempts>=MAX_ATTEMPTS;
      await store.defer(row,new Date(now.getTime()+Math.min(24*60,10*2**(row.unlinkAttempts-1))*60000));
      counts[exhausted?'supportRequired':'deferred']++;
    }
  }
  return counts;
}
export async function runTossUnlinkRecovery(env){
  if(env.TOSS_RELEASE_READY!=='true')return {skipped:true};
  const store={
    claim:(now,max)=>withMongoRetry(env,()=>TossIdentity.findOneAndUpdate({active:false,unlinkPending:true,
      $and:[{$or:[{unlinkAttempts:{$lt:max}},{unlinkAttempts:{$exists:false}}]},
        {$or:[{unlinkNextAttemptAt:null},{unlinkNextAttemptAt:{$lte:now}}]},
        {$or:[{unlinkLeaseUntil:null},{unlinkLeaseUntil:{$lte:now}}]}]},
      {$inc:{unlinkAttempts:1},$set:{unlinkLeaseUntil:new Date(now.getTime()+60000)}},{new:true}).lean(),{retries:0}),
    complete:row=>withMongoRetry(env,()=>TossIdentity.updateOne({_id:row._id,active:false,revision:row.revision,unlinkLeaseUntil:row.unlinkLeaseUntil},
      {$set:{unlinkPending:false,unlinkLeaseUntil:null,unlinkNextAttemptAt:null}})),
    defer:(row,next)=>withMongoRetry(env,()=>TossIdentity.updateOne({_id:row._id,active:false,revision:row.revision,unlinkLeaseUntil:row.unlinkLeaseUntil},
      {$set:{unlinkLeaseUntil:null,unlinkNextAttemptAt:next}})),
  };
  return processPendingUnlinks({store,remove:async row=>unlinkIdentity(env,await unseal(env,row.encryptedKey,row._id))});
}
