import {withMongoRetry} from '../lib/db.js';
import {TossIdentity,TossPurchase} from './models.js';
import {unseal} from './crypto.js';
import {lookupOrder} from './partner.js';
import {recordTossRefund} from './purchases.js';

// Partner reads only. Never requests a refund, payment or LLM generation.
export async function reconcileTossOrders({store,lookup,refund,now=new Date(),limit=10}){
  const counts={checked:0,refunded:0,deferred:0,inactive:0};
  for(let index=0;index<Math.min(10,Math.max(0,limit));index++){
    const row=await store.claim(now);
    if(!row)break;
    try{
      const identity=await store.identity(row);
      if(!identity){await store.finish(row,'inactive',new Date(now.getTime()+86400000));counts.inactive++;continue;}
      const order=await lookup(identity,row._id);
      if(order.orderId!==row._id||order.sku!==row.sku)throw new Error('ORDER_MISMATCH');
      if(order.status==='REFUNDED'){
        await refund(identity,order);
        counts.refunded++;
      }else if(!['PURCHASED','PAYMENT_COMPLETED'].includes(order.status)){
        throw new Error('ORDER_STATE_UNCONFIRMED');
      }
      await store.finish(row,'verified',new Date(now.getTime()+86400000));
      counts.checked++;
    }catch{
      // An unavailable or unexpected response never revokes or grants a right.
      await store.finish(row,'retry',new Date(now.getTime()+900000));
      counts.deferred++;
    }
  }
  return counts;
}
export async function runTossOrderReconciliation(env){
  if(env.TOSS_RELEASE_READY!=='true')return {skipped:true};
  const store={
    claim:now=>withMongoRetry(env,()=>TossPurchase.findOneAndUpdate({status:{$in:['PURCHASED','PAYMENT_COMPLETED']},environment:'DEFAULT',
      $or:[{reconcileAfter:null},{reconcileAfter:{$lte:now}}]},
      {$set:{reconcileAfter:new Date(now.getTime()+1800000),reconcileState:'checking'}},
      {new:true,sort:{reconcileAfter:1,_id:1}}).lean(),{retries:0}),
    identity:row=>withMongoRetry(env,()=>TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean()),
    finish:(row,state,next)=>withMongoRetry(env,()=>TossPurchase.updateOne({_id:row._id,identityId:row.identityId,reconcileAfter:row.reconcileAfter},
      {$set:{reconcileState:state,reconcileAfter:next}})),
  };
  return reconcileTossOrders({store,lookup:async(identity,orderId)=>lookupOrder(env,await unseal(env,identity.encryptedKey,identity._id),orderId),
    refund:(identity,order)=>withMongoRetry(env,()=>recordTossRefund(identity,order))});
}
