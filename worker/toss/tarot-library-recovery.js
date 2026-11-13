import {TossIdentity,TossPurchase} from './models.js';
import {PaidExecutionRecord} from '../lib/models.js';
import {paidNarrativeExecutionKey} from '../lib/paid-narrative-delivery.js';
import {lookupOrder} from './partner.js';
import {checkOrder,TossError} from './policy.js';
import {unseal} from './crypto.js';

export async function verifyTossTarotRecovery(env,doc){
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const body=doc?.metadata?.paidNarrative?.body,orderId=body?.transactionId;
  const deny=()=>{throw new TossError('RESULT_NOT_FOUND',404);};
  if(doc?.metadata?.tossPaidNarrative!==true||typeof orderId!=='string'||body.requestId!=='toss-tarot:'+orderId
    ||paidNarrativeExecutionKey(String(doc.userId),doc.featureKey,body.requestId)!==doc.executionKey)deny();
  const purchase=await TossPurchase.findOne({_id:orderId,ownerId:doc.userId,requestId:body.requestId,featureKey:doc.featureKey,tarotFlowId:{$type:'string',$ne:''}}).lean();
  if(!purchase)deny();
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  const identity=await TossIdentity.findOne({_id:purchase.identityId,ownerId:doc.userId,active:true}).lean();
  if(!identity)deny();
  const execution=await PaidExecutionRecord.findOne({orderId,userId:String(doc.userId),featureId:doc.featureKey,requestId:body.requestId,profileId:'toss:'+identity._id}).lean();
  if(!execution||['cancelled','refunded'].includes(execution.status))deny();
  const order=await lookupOrder(env,await unseal(env,identity.encryptedKey,identity._id),orderId);
  checkOrder(order,{orderId,sku:purchase.sku});
}
