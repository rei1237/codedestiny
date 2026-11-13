import {ServiceExecutionTransaction} from '../lib/models.js';
import {paidNarrativeExecutionKey,runPaidNarrativeDelivery} from '../lib/paid-narrative-delivery.js';
import {TossIdentity,TossNativeConsultation} from './models.js';
import {unseal} from './crypto.js';
import {TossError} from './policy.js';
import {assertNativeIntent} from './native-consultation.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';

export function ownedNarrative({service,featureKey,reportType,route,contractFor,adapter,seed,question}){
  const deny=()=>{throw new TossError('RESULT_NOT_FOUND',404);};
  async function prepare(env,auth,body,orderId){
    const {input,contract}=await contractFor(body);
    return prepareNativeConsultation(env,auth,input,orderId,contract,service);
  }
  async function owned(env,auth,id,original,doc){
    const row=await TossNativeConsultation.findOne({...nativeOwnerFilter(auth,service),_id:id,featureKey}).lean();
    if(!row)deny();
    const {input,contract}=await contractFor(row.input);
    assertNativeIntent(row,auth,contract);
    const key=paidNarrativeExecutionKey(String(auth.userId),featureKey,row.requestId);
    if(original){
      const {tossIntentId,...saved}=original;
      if(tossIntentId!==id)deny();
      assertNativeIntent(row,auth,(await contractFor(saved)).contract);
    }
    if(doc&&(String(doc.userId)!==String(auth.userId)||doc.executionKey!==key||doc.reportType!==reportType||doc.featureKey!==featureKey||doc.metadata?.tossPaidNarrative!==true))deny();
    await verifiedIntent(env,auth,row);
    return {key,input,row};
  }
  const execution=(auth,key)=>ServiceExecutionTransaction.findOne({userId:auth.userId,featureKey,executionKey:key}).lean();
  async function read(env,auth,id,advance){
    const {key,input}=await owned(env,auth,id);
    const url=new URL('https://internal.invalid/toss-narrative');
    if(!advance){
      if(!await execution(auth,key))return Response.json({ok:true,status:'generating',completedParts:[],retryable:true},{status:202});
      url.searchParams.set('resultId',key);
    }
    return runPaidNarrativeDelivery(new Request(url,{method:advance?'POST':'GET'}),env,{userId:String(auth.userId)},advance?{...input,tossIntentId:id}:{},{
      ...adapter(env),seed,featureKey,generationOrigin:'toss',
      verify:(original,doc)=>owned(env,auth,id,original,doc),
    });
  }
  async function libraryItem(env,auth,purchase){
    if(purchase.nativeService!==service||purchase.featureKey!==featureKey||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment)deny();
    if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
    if(!purchase.requestId)return {state:'UNASSIGNED',href:route+'?orderId='+encodeURIComponent(purchase._id)};
    const {key,input,row}=await owned(env,auth,purchase.requestId);
    if(row.orderId!==purchase._id)deny();
    const doc=await execution(auth,key);
    if(doc)await owned(env,auth,row._id,doc.metadata?.paidNarrative?.body,doc);
    return {state:doc?.premiumStatus==='completed'?'COMPLETED':doc?.metadata?.paidNarrative?.exhaustionClaimed?'GENERATION_FAILED':'PENDING',
      resultId:row._id,href:route+'?intentId='+encodeURIComponent(row._id),question:question(input).slice(0,200)};
  }
  async function verifyRecovery(env,doc){
    if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
    const body=doc?.metadata?.paidNarrative?.body;
    if(typeof body?.tossIntentId!=='string'||!/^[a-f0-9]{64}$/.test(body.tossIntentId))deny();
    const row=await TossNativeConsultation.findOne({_id:body?.tossIntentId,ownerId:doc.userId,nativeService:service,featureKey}).lean();
    if(!row)deny();
    const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
    if(!identity)throw new TossError('SESSION_EXPIRED',401);
    return owned(env,{...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)},row._id,body,doc);
  }
  return {prepare,read,libraryItem,verifyRecovery};
}
