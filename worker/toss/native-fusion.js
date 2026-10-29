import {withMongoRetry} from "../lib/db.js";
import {TossNativeConsultation,TossIdentity} from './models.js';
import {TossError} from './policy.js';
import {hash,unseal} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {bindNativeTossRequest} from './native-context.js';
import {nativeIntentId,nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {validateFusionFortuneInput,FUSION_GENERATION_DEADLINE_MS,FUSION_FORTUNE_PAID_FEATURE_KEY} from '../lib/fusion-fortune.js';
import {getFusionFortuneConsultationByRequestId} from '../lib/fusion-fortune-consultation.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {handleFusionFortuneRoutes} from '../routes/fusion-fortune.js';

const stored=(env,userId,requestId)=>withMongoRetry(env,()=>getFusionFortuneConsultationByRequestId({userId,requestId}));
const ownerFilter=auth=>nativeOwnerFilter(auth,'fusion');
export async function nativeFusionContract(input){
  const requestId=String(input?.requestId||'');
  if(!requestId||requestId.length>120||requestId!==requestId.trim())throw new TossError('REQUEST_ID_REQUIRED');
  const normalized=validateFusionFortuneInput(input);
  return {requestId,resultId:requestId,featureKey:FUSION_FORTUNE_PAID_FEATURE_KEY,
    inputHash:await hash(JSON.stringify(normalized)),pricing:getBillingFeaturePricing({featureKey:FUSION_FORTUNE_PAID_FEATURE_KEY}).pricing};
}
export const prepareNativeFusion=async(env,auth,input,orderId)=>prepareNativeConsultation(env,auth,input,orderId,await nativeFusionContract(input),'fusion');

function fusionContext(env,auth){
  const load=async requestId=>TossNativeConsultation.findOne({_id:await nativeIntentId(auth,{requestId},'fusion'),...ownerFilter(auth)}).lean();
  const checkInput=async(row,input)=>{
    if(input&&(await nativeFusionContract({...input,requestId:row.requestId})).inputHash!==row.inputHash)throw new TossError('REQUEST_INPUT_MISMATCH',409);
  };
  return {
    auth:{userId:auth.userId,tossNative:true},
    async access(input,requestId){
      const row=await load(requestId);
      if(!row)return {ok:false};
      assertNativeIntent(row,auth);await checkInput(row,input);
      if(row.status==='prepared')return {ok:false};
      await verifiedIntent(env,auth,row);return {ok:true};
    },
    async assertDelivery(requestId,input){
      const row=await load(requestId);await verifiedIntent(env,auth,row);await checkInput(row,input);
      const doc=await stored(env,auth.userId,requestId);
      if(doc){
        if(String(doc.userId)!==auth.userId||doc.revokedAt||doc.refundedAt)throw new TossError('RESULT_NOT_FOUND',404);
        await checkInput(row,doc.generationSnapshot?.input);
      }
      return row;
    },
  };
}

export async function handleNativeFusion(request,env,auth,path){
  const url=new URL(request.url);url.pathname='/api/fusion-fortune'+path;
  const body=request.method==='POST'?await request.json():null;
  const context=fusionContext(env,auth);
  // Validate even a completed fast return; caller input never changes the paid intent.
  if(body&&(await context.access(body,String(body.requestId||''))).ok)await context.assertDelivery(body.requestId,body);
  const forwarded=new Request(url,{method:request.method,headers:{'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),signal:request.signal});
  bindNativeTossRequest(forwarded,context);
  const response=await handleFusionFortuneRoutes(forwarded,env);
  if(path==='/result'&&response.status===202){
    const payload=await response.clone().json(),doc=payload.consultation;
    if(doc?.requestId&&!doc.resumeBody){
      const row=await context.assertDelivery(doc.requestId);
      return Response.json({...payload,consultation:{...doc,resumeBody:row.input}},{status:202});
    }
  }
  if(path==='/result'&&response.status===404&&!url.searchParams.has('id')){
    const requestId=url.searchParams.get('requestId');
    const rows=await TossNativeConsultation.find({...ownerFilter(auth),status:'paid',...(requestId?{requestId}:{})}).sort({createdAt:-1}).limit(50).lean();
    for(const row of rows){
      if(await stored(env,auth.userId,row.requestId))continue;
      await verifiedIntent(env,auth,row);
      return Response.json({ok:true,consultation:{id:'toss_'+row._id,requestId:row.requestId,status:'partial',stage:1,nextStage:1,resumeBody:row.input,result:null}},{status:202});
    }
  }
  return response;
}

export async function nativeFusionLibraryItem(env,auth,purchase){
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/fusion-fortune/?orderId='+encodeURIComponent(purchase._id)};
  const row=await TossNativeConsultation.findOne({_id:purchase.requestId,...ownerFilter(auth),orderId:purchase._id}).lean();
  assertNativeIntent(row,auth);await fusionContext(env,auth).assertDelivery(row.requestId);
  const doc=await stored(env,auth.userId,row.requestId);
  return {state:doc?.status==='completed'?'COMPLETED':'PENDING',resultId:doc?.id||'toss_'+row._id,
    href:'/fusion-fortune/'+(doc?.status==='completed'?'?cid='+encodeURIComponent(doc.id):''),question:String(row.input.concern||row.input.topic||'').slice(0,200)};
}

export async function nativeFusionRecoveryContext(env,userId,requestId){
  const row=await TossNativeConsultation.findOne({nativeService:'fusion',ownerId:userId,requestId}).lean();
  if(!row)return null;
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  const context=fusionContext(env,auth);await context.assertDelivery(requestId);return context;
}

// Purchase acknowledgement is durable before generation starts. Recover only
// the stored original input, within the existing cron's deadline and batch size.
export async function bootstrapNativeFusionOrders(env,{now,deadline,runStage}){
  if(env.TOSS_RELEASE_READY!=='true')return [];
  const rows=await TossNativeConsultation.find({nativeService:'fusion',status:'paid',generationStartedAt:null,createdAt:{$lt:new Date(now-300000)},$or:[{recoveryNextAt:null},{recoveryNextAt:{$lte:new Date(now)}}]}).sort({createdAt:1}).limit(3).lean();
  const outcomes=[];
  for(const row of rows){
    if(Date.now()+FUSION_GENERATION_DEADLINE_MS>deadline)break;
    const filter={_id:row._id,status:'paid'};
    const prior=await stored(env,String(row.ownerId),row.requestId);
    if(prior?.status==='completed'||prior?.generationSnapshot?.context){
      await TossNativeConsultation.updateOne(filter,{$set:{generationStartedAt:new Date(now)}});continue;
    }
    await TossNativeConsultation.updateOne(filter,{$set:{recoveryNextAt:new Date(now+600000)}});
    try{
      const native=await nativeFusionRecoveryContext(env,String(row.ownerId),row.requestId);
      const result=await runStage(env,{userId:String(row.ownerId),requestId:row.requestId,body:row.input,stage:1,prior,requireExisting:true,native});
      outcomes.push({requestId:row.requestId,outcome:result.ok?result.stageStatus:result.error});
    }catch(error){outcomes.push({requestId:row.requestId,outcome:error.code||'recovery_failed'});}
  }
  return outcomes;
}
