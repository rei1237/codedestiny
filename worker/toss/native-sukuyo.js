import {withMongoRetry} from '../lib/db.js';
import {TossNativeConsultation,TossIdentity} from './models.js';
import {TossError} from './policy.js';
import {unseal} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {bindNativeTossRequest} from './native-context.js';
import {nativeFailureResponse} from './native-failure.js';
import {nativeIntentId,nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {nativeSukuyoContract,nativeSukuyoStoredState,handleSukuyoCompatibilityAiRoutes} from '../routes/sukuyo-compatibility-ai.js';

const ownerFilter=auth=>nativeOwnerFilter(auth,'sukuyo');
export async function prepareNativeSukuyo(env,auth,input,orderId){
  return prepareNativeConsultation(env,auth,input,orderId,await nativeSukuyoContract(input),'sukuyo');
}
function sukuyoContext(env,auth){
  return {
    auth:{userId:auth.userId,tossNative:true,identityId:auth._id,environment:auth.environment},
    async access(body,normalized,requestId){
      const contract=await nativeSukuyoContract({...body,idempotencyKey:requestId});
      const row=await TossNativeConsultation.findOne({_id:await nativeIntentId(auth,contract,'sukuyo'),...ownerFilter(auth)}).lean();
      if(!row)return {ok:false};
      assertNativeIntent(row,auth,contract);
      if(row.status==='prepared')return {ok:false};
      await verifiedIntent(env,auth,row);
      return {ok:true,accessType:'paid',paymentId:row.orderId,accessSource:'toss',featureKey:row.featureKey};
    },
    async assertStored(doc){
      if(!doc||doc.accessSource!=='toss'||String(doc.userId)!==auth.userId||doc.revokedAt||doc.refundedAt)throw new TossError('RESULT_NOT_FOUND',404);
      const row=await TossNativeConsultation.findOne({...ownerFilter(auth),requestId:doc.idempotencyKey}).lean();
      if(!row||row.inputHash!==doc.inputHash||row.orderId!==doc.paymentId||row.featureKey!=='sukuyo-compatibility-ai')throw new TossError('RESULT_NOT_FOUND',404);
      return verifiedIntent(env,auth,row);
    },
  };
}
export async function handleNativeSukuyo(request,env,auth,path){
  const url=new URL(request.url);url.pathname='/api/sukuyo-compatibility-ai'+path;
  const directId=path==='/result'?url.searchParams.get('id')||url.searchParams.get('sessionId'):null;
  if(/^toss_[a-f0-9]{64}$/.test(directId||'')){
    const row=await TossNativeConsultation.findOne({_id:directId.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeSukuyoStoredState(env,auth.userId,row.requestId,'request');
    if(!doc)return Response.json({ok:true,status:'partial',retryable:true,sessionId:directId},{status:202});
    await sukuyoContext(env,auth).assertStored(doc);
    url.searchParams.set('id',String(doc._id));url.searchParams.delete('sessionId');
  }
  let body=request.method==='POST'?await request.json():null;
  if(['/start','/generate'].includes(path)&&/^toss_[a-f0-9]{64}$/.test(body?.resumeSessionId||'')){
    const row=await TossNativeConsultation.findOne({_id:body.resumeSessionId.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeSukuyoStoredState(env,auth.userId,row.requestId,'request');
    body=doc?{resumeSessionId:String(doc._id)}:{...row.input,idempotencyKey:row.requestId};
  }
  const forwarded=new Request(url,{method:request.method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:request.signal});
  const context=sukuyoContext(env,auth);bindNativeTossRequest(forwarded,context);
  const response=await handleSukuyoCompatibilityAiRoutes(forwarded,env);
  if(response.ok&&['/start','/generate'].includes(path)){
    const data=await response.clone().json(),resultId=data.sessionId||data.consultation?.id;
    if(resultId)await context.assertStored(await nativeSukuyoStoredState(env,auth.userId,resultId,'id'));
  }
  return nativeFailureResponse(response);
}
export async function nativeSukuyoLibraryItem(env,auth,purchase){
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/sukuyo-compatibility-ai/?orderId='+encodeURIComponent(purchase._id)};
  const row=await TossNativeConsultation.findOne({_id:purchase.requestId,...ownerFilter(auth),orderId:purchase._id}).lean();
  await verifiedIntent(env,auth,row);
  const doc=await nativeSukuyoStoredState(env,auth.userId,row.requestId,'request');
  if(doc)await sukuyoContext(env,auth).assertStored(doc);
  const resultId=doc?String(doc._id):'toss_'+row._id;
  return {state:doc?.status==='completed'?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId,
    href:'/sukuyo-compatibility-ai/?cid='+encodeURIComponent(resultId),question:String(row.input.question||'').slice(0,200)};
}
export async function bindNativeSukuyoRecovery(request,env,doc){
  const row=await TossNativeConsultation.findOne({nativeService:'sukuyo',ownerId:doc.userId,requestId:doc.idempotencyKey}).lean();
  if(!row)return false;
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  const context=sukuyoContext(env,auth);await context.assertStored(doc);bindNativeTossRequest(request,context);return true;
}

// A confirmed payment can precede the first original consultation checkpoint.
// Recover only the immutable input owned by the same active identity and order.
export async function bootstrapNativeSukuyoOrders(env,{now,deadline}){
  if(env.TOSS_RELEASE_READY!=='true'||Date.now()+65000>deadline)return [];
  const rows=await withMongoRetry(env,()=>TossNativeConsultation.find({nativeService:'sukuyo',status:'paid',generationStartedAt:null,createdAt:{$lt:new Date(now-300000)},$or:[{recoveryNextAt:null},{recoveryNextAt:{$lte:new Date(now)}}]}).sort({createdAt:1}).limit(1).lean());
  const outcomes=[];
  for(const row of rows){
    const stored=await nativeSukuyoStoredState(env,String(row.ownerId),row.requestId,'request');
    if(stored){await withMongoRetry(env,()=>TossNativeConsultation.updateOne({_id:row._id,status:'paid'},{$set:{generationStartedAt:new Date(now)}}),{retries:0});continue;}
    await withMongoRetry(env,()=>TossNativeConsultation.updateOne({_id:row._id,status:'paid'},{$set:{recoveryNextAt:new Date(now+600000)}}),{retries:0});
    const request=new Request('https://internal.invalid/api/sukuyo-compatibility-ai/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...row.input,idempotencyKey:row.requestId})});
    const reference={accessSource:'toss',userId:String(row.ownerId),idempotencyKey:row.requestId,inputHash:row.inputHash,paymentId:row.orderId};
    if(!await bindNativeSukuyoRecovery(request,env,reference))throw new TossError('RESULT_NOT_FOUND',404);
    const response=await handleSukuyoCompatibilityAiRoutes(request,env);
    outcomes.push({service:'sukuyo-compatibility-ai',status:response.status});
  }
  return outcomes;
}
