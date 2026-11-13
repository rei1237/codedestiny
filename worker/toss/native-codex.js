import {MasterLoveCodexSession} from '../lib/models.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {acquireBatchLock,BATCH_BUDGET_MS,codexSessionForToss,prepareCodexForToss,runCodexWave,startCodexSession} from '../routes/master-love-codex.js';
import {TossNativeConsultation,TossIdentity} from './models.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {assertNativeIntent} from './native-consultation.js';
import {TossError} from './policy.js';
import {unseal} from './crypto.js';

const service='codex';
const features={solo:'master-love-codex',compat:'master-love-codex-compat'};
const title=mode=>mode==='compat'?'마스터 인연의 서 · 궁합':'마스터 인연의 서 · 개인';
const denied=()=>{throw new TossError('RESULT_NOT_FOUND',404);};
const find=(auth,id)=>TossNativeConsultation.findOne({...nativeOwnerFilter(auth,service),_id:id}).lean();
const session=(auth,row)=>MasterLoveCodexSession.findOne({userId:String(auth.userId),'deliveryMeta.tossIntentId':row._id}).lean();

export async function prepareNativeCodex(env,auth,body,orderId){
  if(!/^codex-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body?.requestId||'')||!body.reading||!Object.hasOwn(features,body.mode))throw new TossError('INVALID_INPUT',400);
  let prepared;
  try{prepared=prepareCodexForToss(env,body.reading);}catch{throw new TossError('INVALID_CODEX_INPUT',422);}
  if(prepared.mode!==body.mode)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
  const input={reading:prepared.input,mode:prepared.mode,sourceHash:prepared.sourceHash};
  const {featureKey,inputHash}=prepared;
  return prepareNativeConsultation(env,auth,input,orderId,{requestId:body.requestId,resultId:body.requestId,inputHash,featureKey,pricing:getBillingFeaturePricing({featureKey}).pricing},service);
}
async function check(env,auth,row,doc){
  assertNativeIntent(row,auth);
  if(row.nativeService!==service||row.featureKey!==features[row.input?.mode])denied();
  if(doc&&(String(doc.userId)!==String(auth.userId)||doc.deliveryMeta?.tossIntentId!==row._id||doc.deliveryMeta?.tossInputHash!==row.inputHash||doc.mode!==row.input.mode||doc.inputHash!==row.input.sourceHash||doc.paymentId!==row.orderId||doc.idempotencyKey!==row.requestId))denied();
  await verifiedIntent(env,auth,row);
}
export async function verifyCodexRecovery(env,doc){
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const id=doc?.deliveryMeta?.tossIntentId;
  if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))denied();
  const row=await TossNativeConsultation.findOne({_id:id,nativeService:service,ownerId:doc.userId}).lean();
  if(!row)denied();
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(row.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  await check(env,auth,row,doc);
}
export async function readNativeCodex(env,auth,id,advance){
  const deadlineAt=Date.now()+BATCH_BUDGET_MS;
  const row=await find(auth,id);await check(env,auth,row);
  const doc=await session(auth,row);
  if(!doc){
    if(!advance)return Response.json({ok:true,mode:row.input.mode,status:'generating',retryable:true},{status:202});
    const verify=async stored=>check(env,auth,await find(auth,id),stored);
    const request=new Request('https://internal.invalid/api/master-love-codex/start',{method:'POST'});
    return startCodexSession(request,env,auth,{...row.input.reading,idempotencyKey:row.requestId},{id,verify,inputHash:row.inputHash,access:{ok:true,accessType:'paid',paymentId:row.orderId,billingRequestId:row.requestId}});
  }
  await check(env,auth,row,doc);
  const current=codexSessionForToss(doc);
  if(!advance||current.done||current.retryable===false||current.retryAfterMs>0)return Response.json(current,{status:current.done?200:202});
  const lock=await acquireBatchLock(doc.id,doc.userId);
  if(!lock.ok)return Response.json(current,{status:202});
  const wave=await runCodexWave(env,{sessionId:doc.id,userId:doc.userId,doc:lock.doc,lockToken:lock.lockToken,deadlineAt});
  if(wave.outcome==='denied')denied();
  const latest=await session(auth,row);
  if(!latest)denied();
  await check(env,auth,await find(auth,id),latest);
  return Response.json(codexSessionForToss(latest),{status:latest.status==='completed'?200:202});
}
export async function codexLibraryItem(env,auth,purchase){
  const mode=purchase.featureKey===features.compat?'compat':'solo';
  if(purchase.nativeService!==service||purchase.featureKey!==features[mode]||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment)denied();
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/master-love-codex/?mode='+mode+'&orderId='+encodeURIComponent(purchase._id)};
  const row=await find(auth,purchase.requestId);
  if(!row||row.orderId!==purchase._id||row.featureKey!==purchase.featureKey)denied();
  const doc=await session(auth,row);await check(env,auth,row,doc);
  return {state:doc?.status==='completed'?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId:row._id,href:'/master-love-codex/result/?intentId='+encodeURIComponent(row._id),question:title(mode)};
}
