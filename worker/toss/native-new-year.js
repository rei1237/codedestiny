import {tossExpertResultHref} from '../../lib/fortune/toss-expert-result.mjs';
import {withMongoRetry} from '../lib/db.js';
import {TossNativeConsultation,TossIdentity} from './models.js';
import {TossError} from './policy.js';
import {unseal} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {bindNativeTossRequest} from './native-context.js';
import {nativeFailureResponse} from './native-failure.js';
import {nativeIntentId,nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {nativeNewYearContract,prepareNativeNewYearCalculation,nativeNewYearStoredState,handleNewYearAiRoutes} from '../routes/new-year-ai.js';

const ownerFilter=auth=>nativeOwnerFilter(auth,'new-year');
export async function prepareNativeNewYear(env,auth,input,orderId){
  let contract;
  try{contract=nativeNewYearContract(input);}catch(error){if(error?.status)throw new TossError(error.code||'INVALID_INPUT',error.status);throw error;}
  const frozen={...input,idempotencyKey:contract.requestId};
  const intent=await prepareNativeConsultation(env,auth,frozen,orderId,contract,'new-year');
  try{await prepareNativeNewYearCalculation(env,auth,frozen);}catch(error){if(error?.status&&error?.code)throw new TossError(error.code,error.status);throw error;}
  return intent;
}

function newYearContext(env,auth){
  return {
    auth:{userId:auth.userId,tossNative:true},
    async access(_body,normalized,requestId){
      const id=await nativeIntentId(auth,{requestId},'new-year');
      const row=await TossNativeConsultation.findOne({_id:id,...ownerFilter(auth)}).lean();
      if(!row)return {ok:false};
      assertNativeIntent(row,auth);
      if(row.inputHash!==normalized.inputHash||row.requestId!==requestId)throw new TossError('REQUEST_INPUT_MISMATCH',409);
      if(row.status==='prepared')return {ok:false};
      await verifiedIntent(env,auth,row);
      return {ok:true,accessType:'paid',paymentId:row.orderId,accessSource:'toss',featureKey:row.featureKey};
    },
    async assertStored(doc){
      if(!doc||doc.accessSource!=='toss'||String(doc.userId)!==auth.userId||doc.revokedAt||doc.refundedAt)throw new TossError('RESULT_NOT_FOUND',404);
      const row=await TossNativeConsultation.findOne({...ownerFilter(auth),requestId:doc.idempotencyKey}).lean();
      if(!row||row.inputHash!==doc.inputHash||row.orderId!==doc.paymentId||row.featureKey!=='new-year-ai-consultation')throw new TossError('RESULT_NOT_FOUND',404);
      return verifiedIntent(env,auth,row);
    },
  };
}

export async function handleNativeNewYear(request,env,auth,path){
  const url=new URL(request.url);url.pathname='/api/new-year-ai'+path;
  const directMatch=path.match(/^\/result\/([^/]+)$/);
  let directId;
  try{directId=directMatch?decodeURIComponent(directMatch[1]):path==='/result'?(url.searchParams.get('sessionId')||url.searchParams.get('id')):null;}catch{throw new TossError('INVALID_INPUT',400);}
  if(directMatch){url.pathname='/api/new-year-ai/result';url.searchParams.set('sessionId',directId);}
  if(/^toss_[a-f0-9]{64}$/.test(directId||'')){
    const row=await TossNativeConsultation.findOne({_id:directId.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeNewYearStoredState(env,auth.userId,row.requestId,'request');
    if(!doc)return Response.json({ok:true,status:'partial',retryable:true,sessionId:directId},{status:202});
    await newYearContext(env,auth).assertStored(doc);url.searchParams.delete('id');url.searchParams.set('sessionId',doc.id);
  }
  let body=request.method==='POST'?await request.json():null;
  if(path==='/start'&&/^toss_[a-f0-9]{64}$/.test(body?.resumeSessionId||'')){
    const row=await TossNativeConsultation.findOne({_id:body.resumeSessionId.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeNewYearStoredState(env,auth.userId,row.requestId,'request');
    body=doc?{resumeSessionId:doc.id}:row.input;
  }
  const forwarded=new Request(url,{method:request.method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:request.signal});
  const context=newYearContext(env,auth);bindNativeTossRequest(forwarded,context);
  const response=await handleNewYearAiRoutes(forwarded,env);
  if(response.ok&&path==='/start'){
    const data=await response.clone().json();
    if(data.sessionId)await context.assertStored(await nativeNewYearStoredState(env,auth.userId,data.sessionId,'id'));
  }
  return nativeFailureResponse(response);
}

export async function nativeNewYearLibraryItem(env,auth,purchase){
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/new-year-ai-consultation/?orderId='+encodeURIComponent(purchase._id)};
  const row=await TossNativeConsultation.findOne({_id:purchase.requestId,...ownerFilter(auth),orderId:purchase._id}).lean();
  await verifiedIntent(env,auth,row);
  const doc=await nativeNewYearStoredState(env,auth.userId,row.requestId,'request');
  if(doc)await newYearContext(env,auth).assertStored(doc);
  const resultId=doc?.id||'toss_'+row._id;
  return {state:doc?.status==='completed'?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId,
    href:tossExpertResultHref('new-year',resultId),question:String(row.input.question||row.input.topic||'').slice(0,200)};
}

export async function bindNativeNewYearRecovery(request,env,doc){
  const row=await TossNativeConsultation.findOne({nativeService:'new-year',ownerId:doc.userId,requestId:doc.idempotencyKey}).lean();
  if(!row)return false;
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  const context=newYearContext(env,auth);await context.assertStored(doc);bindNativeTossRequest(request,context);return true;
}

export async function bootstrapNativeNewYearOrders(env,{now,deadline}){
  if(env.TOSS_RELEASE_READY!=='true'||Date.now()+65000>deadline)return [];
  const rows=await withMongoRetry(env,()=>TossNativeConsultation.find({nativeService:'new-year',status:'paid',generationStartedAt:null,createdAt:{$lt:new Date(now-300000)},$or:[{recoveryNextAt:null},{recoveryNextAt:{$lte:new Date(now)}}]}).sort({createdAt:1}).limit(1).lean());
  const outcomes=[];
  for(const row of rows){
    const stored=await nativeNewYearStoredState(env,String(row.ownerId),row.requestId,'request');
    if(stored){await withMongoRetry(env,()=>TossNativeConsultation.updateOne({_id:row._id,status:'paid'},{$set:{generationStartedAt:new Date(now)}}),{retries:0});continue;}
    await withMongoRetry(env,()=>TossNativeConsultation.updateOne({_id:row._id,status:'paid'},{$set:{recoveryNextAt:new Date(now+600000)}}),{retries:0});
    const request=new Request('https://internal.invalid/api/new-year-ai/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(row.input)});
    const reference={accessSource:'toss',userId:String(row.ownerId),idempotencyKey:row.requestId,inputHash:row.inputHash,paymentId:row.orderId};
    if(!await bindNativeNewYearRecovery(request,env,reference))throw new TossError('RESULT_NOT_FOUND',404);
    const response=await handleNewYearAiRoutes(request,env);outcomes.push({service:'new-year-ai',status:response.status});
  }
  return outcomes;
}
