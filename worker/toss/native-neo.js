import {TossNativeConsultation,TossIdentity} from './models.js';
import {TossError} from './policy.js';
import {unseal} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {bindNativeTossRequest} from './native-context.js';
import {nativeIntentId,nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {nativeNeoContract,nativeNeoStoredState,handleNeoOperationRoomRoutes} from '../routes/neo-operation-room.js';

const ownerFilter=auth=>nativeOwnerFilter(auth,'neo');
export const prepareNativeNeo=(env,auth,input,orderId)=>prepareNativeConsultation(env,auth,input,orderId,nativeNeoContract(input),'neo');

function neoContext(env,auth){
  return {
    auth:{userId:auth.userId,tossNative:true},
    async access(body,normalized,requestId){
      const id=await nativeIntentId(auth,{requestId},'neo');
      const row=await TossNativeConsultation.findOne({_id:id,...ownerFilter(auth)}).lean();
      if(!row||row.status==='prepared')return {ok:false};
      assertNativeIntent(row,auth);
      if(row.inputHash!==normalized.inputHash||row.requestId!==requestId)throw new TossError('REQUEST_INPUT_MISMATCH',409);
      await verifiedIntent(env,auth,row);
      return {ok:true,accessType:'paid',paymentId:row.orderId,source:'toss'};
    },
    async assertStored(doc){
      if(!doc||String(doc.userId)!==auth.userId||doc.revokedAt||doc.refundedAt)throw new TossError('RESULT_NOT_FOUND',404);
      const row=await TossNativeConsultation.findOne({...ownerFilter(auth),requestId:doc.idempotencyKey}).lean();
      if(!row||row.inputHash!==doc.inputHash||row.orderId!==doc.paymentId)throw new TossError('RESULT_NOT_FOUND',404);
      return verifiedIntent(env,auth,row);
    },
  };
}

export async function handleNativeNeo(request,env,auth,path){
  const url=new URL(request.url);url.pathname='/api/neo-operation-room'+path;
  const virtualId=url.searchParams.get('attemptId')||url.searchParams.get('id');
  if(path==='/result'&&/^toss_[a-f0-9]{64}$/.test(virtualId||'')){
    const row=await TossNativeConsultation.findOne({_id:virtualId.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeNeoStoredState(env,auth.userId,row.requestId);
    if(doc)url.searchParams.set('attemptId',doc.id);
  }
  let body=request.method==='POST'?await request.json():null;
  // A verified purchase may precede the first original checkpoint. A virtual
  // identifier refers only to the owner's immutable intent, never client input.
  if(path==='/start'&&/^toss_[a-f0-9]{64}$/.test(body?.sessionId||'')){
    const row=await TossNativeConsultation.findOne({_id:body.sessionId.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeNeoStoredState(env,auth.userId,row.requestId);
    body=doc?{sessionId:doc.id}:row.input;
  }
  const forwarded=new Request(url,{method:request.method,headers:{'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),signal:request.signal});
  const context=neoContext(env,auth);
  bindNativeTossRequest(forwarded,context);
  const response=await handleNeoOperationRoomRoutes(forwarded,env);
  if(response.ok&&['/start','/refine'].includes(path)){
    const data=await response.clone().json();
    if(data.sessionId)await context.assertStored(await nativeNeoStoredState(env,auth.userId,data.sessionId));
  }
  if(path==='/result'&&request.method==='GET'&&response.status===404){
    const id=url.searchParams.get('attemptId')||url.searchParams.get('id');
    const rows=await TossNativeConsultation.find({...ownerFilter(auth),status:'paid',
      ...(id?(/^toss_[a-f0-9]{64}$/.test(id)?{_id:id.slice(5)}:{requestId:id}):{})}).sort({createdAt:-1}).limit(50).lean();
    for(const row of rows){
      if(await nativeNeoStoredState(env,auth.userId,row.requestId))continue;
      await verifiedIntent(env,auth,row);
      return Response.json({ok:true,status:'partial',retryable:true,sessionId:'toss_'+row._id},{status:202});
    }
  }
  return response;
}

export async function nativeNeoLibraryItem(env,auth,purchase){
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/neo-operation-room/?orderId='+encodeURIComponent(purchase._id)};
  const row=await TossNativeConsultation.findOne({_id:purchase.requestId,...ownerFilter(auth),orderId:purchase._id}).lean();
  assertNativeIntent(row,auth);
  const doc=await nativeNeoStoredState(env,auth.userId,row.requestId);
  if(doc&&(doc.inputHash!==row.inputHash||doc.paymentId!==purchase._id))throw new TossError('RESULT_NOT_FOUND',404);
  const resultId=doc?.id||'toss_'+row._id;
  return {state:doc?.status==='completed'?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId,
    href:'/neo-operation-room/result/?attemptId='+encodeURIComponent(resultId),question:String(row.input.question||'').slice(0,200)};
}

export async function bindNativeNeoRecovery(request,env,doc){
  const row=await TossNativeConsultation.findOne({nativeService:'neo',ownerId:doc.userId,requestId:doc.idempotencyKey}).lean();
  if(!row)return false;
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  const context=neoContext(env,auth);
  await context.assertStored(doc);
  bindNativeTossRequest(request,context);
  return true;
}
