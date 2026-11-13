import {TossNativeConsultation,TossIdentity} from './models.js';
import {TossError} from './policy.js';
import {unseal} from './crypto.js';
import {bindNativeTossRequest} from './native-context.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {handleNakshatraAiRoutes,nativeNakshatraContract,nativeNakshatraStored} from '../routes/nakshatra-ai.js';
import {NAKSHATRA_SECTIONS} from '../lib/nakshatra-ai-prompt.js';

const service='nakshatra',feature='nakshatra-ai-consultation';
const owner=auth=>nativeOwnerFilter(auth,service);

export async function prepareNakshatra(env,auth,body,orderId){
  const contract=nativeNakshatraContract(body);
  if(!contract)throw new TossError('INVALID_INPUT',400);
  // Explicit original chart input only. Client-declared payment/access never enters the original handler.
  const input={birthInfo:body.birthInfo,question:String(body.question||'').trim().slice(0,1200),requestId:contract.requestId};
  const sealed=nativeNakshatraContract(input);
  if(sealed?.inputHash!==contract.inputHash)throw new TossError('INVALID_INPUT',400);
  return prepareNativeConsultation(env,auth,input,orderId,contract,service);
}
function context(env,auth,row){
  return {
    auth:{userId:auth.userId,tossNative:true},
    async access(inputHash,requestId){
      if(row.inputHash!==inputHash||row.requestId!==requestId||row.featureKey!==feature)throw new TossError('REQUEST_INPUT_MISMATCH',409);
      await verifiedIntent(env,auth,row);
      return {ok:true,source:'toss',accessType:'paid',paymentId:row.orderId};
    },
    async assertStored(doc){
      if(!doc||doc.accessSource!=='toss'||String(doc.userId)!==String(auth.userId)||doc.revokedAt||doc.refundedAt
        ||doc.inputHash!==row.inputHash||doc.idempotencyKey!==row.requestId||doc.paymentId!==row.orderId||row.featureKey!==feature)throw new TossError('RESULT_NOT_FOUND',404);
      await verifiedIntent(env,auth,row);
    },
  };
}
export async function nakshatraWave(env,auth,id,advance,requestUrl){
  const row=await TossNativeConsultation.findOne({...owner(auth),_id:id}).lean();
  await verifiedIntent(env,auth,row);
  const bound=context(env,auth,row);
  const doc=await nativeNakshatraStored(env,auth.userId,row.requestId);
  if(doc)await bound.assertStored(doc);
  if(!advance&&!doc)return {ok:true,status:'pending',progress:{completed:0,total:NAKSHATRA_SECTIONS.length}};
  const action=!advance||doc?.status==='completed'?'result':doc?'generate':'start';
  const url=new URL('/api/nakshatra-ai/'+action,requestUrl);
  if(action==='result')url.searchParams.set('id',doc.id);
  const request=new Request(url,{method:action==='result'?'GET':'POST',headers:{'Content-Type':'application/json'},
    ...(action==='result'?{}:{body:JSON.stringify(action==='generate'?{sessionId:doc.id,idempotencyKey:row.requestId}:{...row.input,idempotencyKey:row.requestId})})});
  bindNativeTossRequest(request,bound);
  const response=await handleNakshatraAiRoutes(request,env);
  const data=await response.json();
  if(!response.ok)throw new TossError(data.reason||'GENERATION_FAILED',response.status);
  return data;
}
export async function nakshatraLibraryItem(env,auth,purchase){
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/nakshatra/ai?orderId='+encodeURIComponent(purchase._id)};
  const row=await TossNativeConsultation.findOne({...owner(auth),_id:purchase.requestId,orderId:purchase._id}).lean();
  await verifiedIntent(env,auth,row);
  const doc=await nativeNakshatraStored(env,auth.userId,row.requestId);
  if(doc)await context(env,auth,row).assertStored(doc);
  return {state:doc?.status==='completed'?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId:row._id,
    href:'/nakshatra/ai?resultId='+row._id,question:row.input.question,completedSections:doc?.generationProgress?.completed||0,totalSections:NAKSHATRA_SECTIONS.length};
}
export async function bindNativeNakshatraRecovery(request,env,doc){
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const row=await TossNativeConsultation.findOne({nativeService:service,ownerId:doc.userId,requestId:doc.idempotencyKey}).lean();
  if(!row)throw new TossError('RESULT_NOT_FOUND',404);
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  const bound=context(env,auth,row);await bound.assertStored(doc);bindNativeTossRequest(request,bound);
}
