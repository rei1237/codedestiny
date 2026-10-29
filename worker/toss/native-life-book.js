import {withMongoRetry} from '../lib/db.js';
import {TossNativeConsultation,TossIdentity} from './models.js';
import {TossError} from './policy.js';
import {unseal} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {bindNativeTossRequest} from './native-context.js';
import {nativeIntentId,nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {nativeLifeBookContract,nativeLifeBookStoredState,handleLifeBookAiRoutes} from '../routes/life-book-ai.js';

const ownerFilter=auth=>nativeOwnerFilter(auth,'life-book');
export const prepareNativeLifeBook=(env,auth,input,orderId)=>prepareNativeConsultation(env,auth,input,orderId,nativeLifeBookContract(input),'life-book');

function lifeBookContext(env,auth){
  return {
    auth:{userId:auth.userId,tossNative:true},
    async access(body,normalized,requestId){
      const id=await nativeIntentId(auth,{requestId},'life-book');
      const row=await TossNativeConsultation.findOne({_id:id,...ownerFilter(auth)}).lean();
      if(!row)return {ok:false};
      assertNativeIntent(row,auth);
      if(row.inputHash!==normalized.inputHash||row.requestId!==requestId)throw new TossError('REQUEST_INPUT_MISMATCH',409);
      if(row.status==='prepared')return {ok:false};
      await verifiedIntent(env,auth,row);
      return {ok:true,accessType:'paid',paymentId:row.orderId,accessSource:'toss',featureKey:row.featureKey};
    },
    async assertStored(doc){
      if(!doc||String(doc.userId)!==auth.userId||doc.revokedAt||doc.refundedAt)throw new TossError('RESULT_NOT_FOUND',404);
      const row=await TossNativeConsultation.findOne({...ownerFilter(auth),requestId:doc.idempotencyKey}).lean();
      if(!row||row.inputHash!==doc.inputHash||row.orderId!==doc.paymentId||row.featureKey!==doc.featureKey)throw new TossError('RESULT_NOT_FOUND',404);
      return verifiedIntent(env,auth,row);
    },
  };
}

export async function handleNativeLifeBook(request,env,auth,path){
  const url=new URL(request.url);url.pathname='/api/life-book-ai'+path;
  const virtualId=url.searchParams.get('attemptId')||url.searchParams.get('sessionId');
  if(path==='/result'&&/^toss_[a-f0-9]{64}$/.test(virtualId||'')){
    const row=await TossNativeConsultation.findOne({_id:virtualId.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeLifeBookStoredState(env,auth.userId,row.requestId);
    if(doc)url.searchParams.set('attemptId',doc.id);
  }
  let body=request.method==='POST'?await request.json():null;
  // A verified purchase may precede the first original checkpoint. A virtual
  // identifier refers only to the owner's immutable intent, never client input.
  if(['/start','/generate'].includes(path)&&/^toss_[a-f0-9]{64}$/.test(body?.resumeSessionId||'')){
    const row=await TossNativeConsultation.findOne({_id:body.resumeSessionId.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeLifeBookStoredState(env,auth.userId,row.requestId);
    body=doc?{resumeSessionId:doc.id}:row.input;
  }
  const forwarded=new Request(url,{method:request.method,headers:{'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),signal:request.signal});
  const context=lifeBookContext(env,auth);
  bindNativeTossRequest(forwarded,context);
  const response=await handleLifeBookAiRoutes(forwarded,env);
  if(response.ok&&['/start','/generate'].includes(path)){
    const data=await response.clone().json();
    if(data.sessionId)await context.assertStored(await nativeLifeBookStoredState(env,auth.userId,data.sessionId));
  }
  if(path==='/result'&&request.method==='GET'&&response.status===404){
    const id=url.searchParams.get('attemptId')||url.searchParams.get('sessionId');
    const rows=await TossNativeConsultation.find({...ownerFilter(auth),status:'paid',
      ...(id?(/^toss_[a-f0-9]{64}$/.test(id)?{_id:id.slice(5)}:{requestId:id}):{})}).sort({createdAt:-1}).limit(50).lean();
    for(const row of rows){
      if(await nativeLifeBookStoredState(env,auth.userId,row.requestId))continue;
      await verifiedIntent(env,auth,row);
      return Response.json({ok:true,status:'partial',retryable:true,sessionId:'toss_'+row._id},{status:202});
    }
  }
  return response;
}

export async function nativeLifeBookLibraryItem(env,auth,purchase){
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/life-book-ai/?orderId='+encodeURIComponent(purchase._id)};
  const row=await TossNativeConsultation.findOne({_id:purchase.requestId,...ownerFilter(auth),orderId:purchase._id}).lean();
  await verifiedIntent(env,auth,row);
  const doc=await nativeLifeBookStoredState(env,auth.userId,row.requestId);
  if(doc)await lifeBookContext(env,auth).assertStored(doc);
  const resultId=doc?.id||'toss_'+row._id;
  return {state:doc?.status==='completed'?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId,
    href:'/life-book-ai/result/?attemptId='+encodeURIComponent(resultId),question:String(row.input.topic||row.input.consultationTopic||'').slice(0,200)};
}

export async function bindNativeLifeBookRecovery(request,env,doc){
  const row=await TossNativeConsultation.findOne({nativeService:'life-book',ownerId:doc.userId,requestId:doc.idempotencyKey}).lean();
  if(!row)return false;
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  const context=lifeBookContext(env,auth);
  await context.assertStored(doc);
  bindNativeTossRequest(request,context);
  return true;
}

// Resume a paid immutable input that has no original checkpoint yet. The shared
// cron owns the time budget; original start owns leases and generation limits.
export async function bootstrapNativeLifeBookOrders(env,{now,deadline}) {
  if(env.TOSS_RELEASE_READY!=='true'||Date.now()+65000>deadline)return [];
  const rows=await withMongoRetry(env,()=>TossNativeConsultation.find({nativeService:'life-book',status:'paid',generationStartedAt:null,createdAt:{$lt:new Date(now-300000)},$or:[{recoveryNextAt:null},{recoveryNextAt:{$lte:new Date(now)}}]}).sort({createdAt:1}).limit(1).lean());
  const outcomes=[];
  for(const row of rows){
    const stored=await nativeLifeBookStoredState(env,String(row.ownerId),row.requestId);
    if(stored){await withMongoRetry(env,()=>TossNativeConsultation.updateOne({_id:row._id,status:'paid'},{$set:{generationStartedAt:new Date(now)}}),{retries:0});continue;}
    await withMongoRetry(env,()=>TossNativeConsultation.updateOne({_id:row._id,status:'paid'},{$set:{recoveryNextAt:new Date(now+600000)}}),{retries:0});
    const request=new Request('https://internal.invalid/api/life-book-ai/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(row.input)});
    // Reuse the same identity/environment/order check as stored recovery.
    const reference={userId:String(row.ownerId),idempotencyKey:row.requestId,inputHash:row.inputHash,paymentId:row.orderId,featureKey:row.featureKey};
    if(!await bindNativeLifeBookRecovery(request,env,reference))throw new TossError('RESULT_NOT_FOUND',404);
    const response=await handleLifeBookAiRoutes(request,env);
    outcomes.push({service:'life-book-ai',status:response.status});
  }
  return outcomes;
}
