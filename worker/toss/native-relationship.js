import {withMongoRetry} from '../lib/db.js';
import {RELATIONSHIP_PART_IDS} from '../lib/relationship-report-delivery.js';
import {TossNativeConsultation,TossIdentity} from './models.js';
import {TossError} from './policy.js';
import {unseal} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {bindNativeTossRequest} from './native-context.js';
import {nativeFailureResponse} from './native-failure.js';
import {nativeIntentId,nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {nativeRelationshipContract,nativeRelationshipStoredState,handleRelationshipBoundaryTestRoutes} from '../routes/relationship-boundary-test.js';

const service='relationship';
const ownerFilter=auth=>nativeOwnerFilter(auth,service);
export const prepareNativeRelationship=(env,auth,input,orderId)=>prepareNativeConsultation(env,auth,input,orderId,nativeRelationshipContract(input),service);

function relationshipContext(env,auth){
  async function intentFor(requestId){
    const id=await nativeIntentId(auth,{requestId},service);
    return assertNativeIntent(await TossNativeConsultation.findOne({_id:id,...ownerFilter(auth)}).lean(),auth);
  }
  return {
    auth:{userId:auth.userId,tossNative:true},
    async access(requestId,input){
      const row=await intentFor(requestId);
      if(row.requestId!==requestId||row.inputHash!==input.inputHash||row.featureKey!=='relationship-boundary-test')throw new TossError('REQUEST_INPUT_MISMATCH',409);
      await verifiedIntent(env,auth,row);
      return {proven:true,source:'toss',transactionId:row.orderId};
    },
    async assertStored(doc){
      if(!doc||String(doc.userId)!==auth.userId||(doc.accessType&&doc.accessType!=='toss'))throw new TossError('RESULT_NOT_FOUND',404);
      const row=await intentFor(doc.idempotencyKey);
      if(row.requestId!==doc.idempotencyKey||row.inputHash!==doc.inputHash||row.orderId!==doc.paymentId||row.featureKey!=='relationship-boundary-test')throw new TossError('RESULT_NOT_FOUND',404);
      return verifiedIntent(env,auth,row);
    },
  };
}

function awaitingCheckpoint(row){
  const sessionId='toss_'+row._id;
  return Response.json({ok:true,status:'partial',sessionId,resultId:sessionId,retryable:true,resumeBody:{resumeSessionId:sessionId},completedParts:[],totalParts:RELATIONSHIP_PART_IDS.length},{status:202});
}

export async function handleNativeRelationship(request,env,auth,path){
  if(!['/result','/generate'].includes(path))throw new TossError('NOT_FOUND',404);
  const url=new URL(request.url);url.pathname='/api/relationship-boundary-test'+path;
  const context=relationshipContext(env,auth);
  const virtual=url.searchParams.get('sessionId');
  if(path==='/result'&&/^toss_[a-f0-9]{64}$/.test(virtual||'')){
    const row=await TossNativeConsultation.findOne({_id:virtual.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeRelationshipStoredState(env,auth.userId,row.requestId,'request');
    if(!doc)return awaitingCheckpoint(row);
    await context.assertStored(doc);url.searchParams.set('sessionId',doc.id);
  }
  let body=request.method==='POST'?await request.json():null;
  if(path==='/generate'&&/^toss_[a-f0-9]{64}$/.test(body?.resumeSessionId||'')){
    const row=await TossNativeConsultation.findOne({_id:body.resumeSessionId.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeRelationshipStoredState(env,auth.userId,row.requestId,'request');
    if(doc)await context.assertStored(doc);
    body=doc?{resumeSessionId:doc.id}:row.input;
  }
  const forwarded=new Request(url,{method:request.method,headers:{'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),signal:request.signal});
  bindNativeTossRequest(forwarded,context);
  const response=await handleRelationshipBoundaryTestRoutes(forwarded,env);
  if(response.ok&&path==='/generate'){
    const data=await response.clone().json();
    if(data.sessionId)await context.assertStored(await nativeRelationshipStoredState(env,auth.userId,data.sessionId));
  }
  if(path==='/result'&&request.method==='GET'&&response.status===404&&!url.searchParams.get('sessionId')){
    const rows=await TossNativeConsultation.find({...ownerFilter(auth),status:'paid'}).sort({createdAt:-1}).limit(50).lean();
    for(const row of rows){
      if(await nativeRelationshipStoredState(env,auth.userId,row.requestId,'request'))continue;
      await verifiedIntent(env,auth,row);return awaitingCheckpoint(row);
    }
  }
  return nativeFailureResponse(response);
}

export async function nativeRelationshipLibraryItem(env,auth,purchase){
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/relationship-boundary-test/?orderId='+encodeURIComponent(purchase._id)};
  const row=await TossNativeConsultation.findOne({_id:purchase.requestId,...ownerFilter(auth),orderId:purchase._id}).lean();
  await verifiedIntent(env,auth,row);
  const doc=await nativeRelationshipStoredState(env,auth.userId,row.requestId,'request');
  if(doc)await relationshipContext(env,auth).assertStored(doc);
  const resultId=doc?.id||'toss_'+row._id;
  return {state:doc?.status==='completed'?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId,href:'/relationship-boundary-test/?sessionId='+encodeURIComponent(resultId)};
}

export async function bindNativeRelationshipRecovery(request,env,doc){
  const row=await TossNativeConsultation.findOne({nativeService:service,ownerId:doc.userId,requestId:doc.idempotencyKey}).lean();
  if(!row)throw new TossError('RESULT_NOT_FOUND',404);
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  const context=relationshipContext(env,auth);await context.assertStored(doc);bindNativeTossRequest(request,context);
  return true;
}

export async function bootstrapNativeRelationshipOrders(env,{now,deadline}){
  if(env.TOSS_RELEASE_READY!=='true'||Date.now()+65000>deadline)return [];
  const rows=await withMongoRetry(env,()=>TossNativeConsultation.find({nativeService:service,status:'paid',generationStartedAt:null,createdAt:{$lt:new Date(now-300000)},$or:[{recoveryNextAt:null},{recoveryNextAt:{$lte:new Date(now)}}]}).sort({createdAt:1}).limit(1).lean());
  const outcomes=[];
  for(const row of rows){
    const stored=await nativeRelationshipStoredState(env,String(row.ownerId),row.requestId,'request');
    if(stored){await withMongoRetry(env,()=>TossNativeConsultation.updateOne({_id:row._id,status:'paid'},{$set:{generationStartedAt:new Date(now)}}),{retries:0});continue;}
    await withMongoRetry(env,()=>TossNativeConsultation.updateOne({_id:row._id,status:'paid'},{$set:{recoveryNextAt:new Date(now+600000)}}),{retries:0});
    const request=new Request('https://internal.invalid/api/relationship-boundary-test/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(row.input)});
    await bindNativeRelationshipRecovery(request,env,{userId:String(row.ownerId),idempotencyKey:row.requestId,inputHash:row.inputHash,paymentId:row.orderId,accessType:'toss'});
    const response=await handleRelationshipBoundaryTestRoutes(request,env);outcomes.push({service:'relationship-boundary-test',status:response.status});
  }
  return outcomes;
}
