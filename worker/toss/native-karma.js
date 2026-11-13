import {tossExpertResultHref} from '../../lib/fortune/toss-expert-result.mjs';
import {withMongoRetry} from '../lib/db.js';
import {TossNativeConsultation,TossIdentity} from './models.js';
import {TossError} from './policy.js';
import {unseal} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {bindNativeTossRequest} from './native-context.js';
import {nativeFailureResponse} from './native-failure.js';
import {nativeIntentId,nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {nativeKarmaContract,prepareNativeKarmaCalculation,nativeKarmaStoredState,handleKarmaDestinyAiRoutes} from '../routes/karma-destiny-ai.js';

const ownerFilter=auth=>nativeOwnerFilter(auth,'karma');
export async function prepareNativeKarma(env,auth,input,orderId){
  let contract;
  try{contract=nativeKarmaContract(input);}catch(error){if(error?.status)throw new TossError(error.code||'INVALID_INPUT',error.status);throw error;}
  const frozen={...input,idempotencyKey:contract.requestId};
  const intent=await prepareNativeConsultation(env,auth,frozen,orderId,contract,'karma');
  try{await prepareNativeKarmaCalculation(env,auth,frozen);}catch(error){if(error?.status&&error?.code)throw new TossError(error.code,error.status);throw error;}
  return intent;
}

function karmaContext(env,auth){
  return {
    auth:{userId:auth.userId,tossNative:true},
    async access(_body,normalized,requestId){
      const id=await nativeIntentId(auth,{requestId},'karma');
      const row=await TossNativeConsultation.findOne({_id:id,...ownerFilter(auth)}).lean();
      if(!row)return {ok:false};
      assertNativeIntent(row,auth);
      if(row.inputHash!==normalized.inputHash||row.requestId!==requestId)throw new TossError('REQUEST_INPUT_MISMATCH',409);
      if(row.status==='prepared')return {ok:false};
      await verifiedIntent(env,auth,row);
      return {ok:true,accessType:'paid',paymentId:row.orderId,accessSource:'toss',featureKey:row.featureKey,usageAlreadyApplied:true};
    },
    async assertStored(doc){
      if(!doc||doc.accessSource!=='toss'||String(doc.userId)!==auth.userId||doc.revokedAt||doc.refundedAt)throw new TossError('RESULT_NOT_FOUND',404);
      const row=await TossNativeConsultation.findOne({...ownerFilter(auth),requestId:doc.idempotencyKey}).lean();
      if(!row||row.inputHash!==doc.inputHash||row.orderId!==doc.paymentId||row.featureKey!=='karma-destiny-ai-consultation')throw new TossError('RESULT_NOT_FOUND',404);
      return verifiedIntent(env,auth,row);
    },
  };
}

export async function handleNativeKarma(request,env,auth,path){
  if(!((request.method==='GET'&&path==='/result')||(request.method==='POST'&&['/start','/generate-batch','/message'].includes(path))))throw new TossError('NOT_FOUND',404);
  const url=new URL(request.url);url.pathname='/api/karma-destiny-ai'+path;
  let body=request.method==='POST'?await request.json():null;
  const directId=path==='/result'?url.searchParams.get('sessionId'):path==='/generate-batch'?body?.sessionId:null;
  if(/^toss_[a-f0-9]{64}$/.test(directId||'')){
    const row=await TossNativeConsultation.findOne({_id:directId.slice(5),...ownerFilter(auth)}).lean();
    await verifiedIntent(env,auth,row);
    const doc=await nativeKarmaStoredState(env,auth.userId,row.requestId,'request');
    if(!doc&&request.method==='GET')return Response.json({ok:true,status:'partial',retryable:true,sessionId:directId},{status:202});
    if(doc){await karmaContext(env,auth).assertStored(doc);if(request.method==='GET')url.searchParams.set('sessionId',doc.id);else body={...body,sessionId:doc.id};}
    else{url.pathname='/api/karma-destiny-ai/start';body=row.input;}
  }
  const forwarded=new Request(url,{method:request.method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:request.signal});
  const context=karmaContext(env,auth);bindNativeTossRequest(forwarded,context);
  const response=await handleKarmaDestinyAiRoutes(forwarded,env);
  if(response.ok&&url.pathname.endsWith('/start')){
    const data=await response.clone().json();
    if(data.sessionId)await context.assertStored(await nativeKarmaStoredState(env,auth.userId,data.sessionId,'id'));
  }
  return nativeFailureResponse(response);
}

export async function nativeKarmaLibraryItem(env,auth,purchase){
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/karma-destiny-ai/?orderId='+encodeURIComponent(purchase._id)};
  const row=await TossNativeConsultation.findOne({_id:purchase.requestId,...ownerFilter(auth),orderId:purchase._id}).lean();
  await verifiedIntent(env,auth,row);
  const doc=await nativeKarmaStoredState(env,auth.userId,row.requestId,'request');
  if(doc)await karmaContext(env,auth).assertStored(doc);
  const resultId=doc?.id||'toss_'+row._id;
  return {state:doc?.status==='completed'?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId,
    href:tossExpertResultHref('karma',resultId),question:String(row.input.question||row.input.topic||'').slice(0,200)};
}

export async function bindNativeKarmaRecovery(request,env,doc){
  const row=await TossNativeConsultation.findOne({nativeService:'karma',ownerId:doc.userId,requestId:doc.idempotencyKey}).lean();
  if(!row)return false;
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  const context=karmaContext(env,auth);await context.assertStored(doc);bindNativeTossRequest(request,context);return true;
}

export async function bootstrapNativeKarmaOrders(env,{now,deadline}){
  if(env.TOSS_RELEASE_READY!=='true'||Date.now()+65000>deadline)return [];
  const rows=await withMongoRetry(env,()=>TossNativeConsultation.find({nativeService:'karma',status:'paid',generationStartedAt:null,createdAt:{$lt:new Date(now-300000)},$or:[{recoveryNextAt:null},{recoveryNextAt:{$lte:new Date(now)}}]}).sort({createdAt:1}).limit(1).lean());
  const outcomes=[];
  for(const row of rows){
    const stored=await nativeKarmaStoredState(env,String(row.ownerId),row.requestId,'request');
    if(stored){await withMongoRetry(env,()=>TossNativeConsultation.updateOne({_id:row._id,status:'paid'},{$set:{generationStartedAt:new Date(now)}}),{retries:0});continue;}
    await withMongoRetry(env,()=>TossNativeConsultation.updateOne({_id:row._id,status:'paid'},{$set:{recoveryNextAt:new Date(now+600000)}}),{retries:0});
    const request=new Request('https://internal.invalid/api/karma-destiny-ai/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(row.input)});
    const reference={accessSource:'toss',userId:String(row.ownerId),idempotencyKey:row.requestId,inputHash:row.inputHash,paymentId:row.orderId};
    if(!await bindNativeKarmaRecovery(request,env,reference))throw new TossError('RESULT_NOT_FOUND',404);
    const response=await handleKarmaDestinyAiRoutes(request,env);outcomes.push({service:'karma-destiny-ai',status:response.status});
  }
  return outcomes;
}
