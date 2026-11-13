import {PaidExecutionRecord} from '../lib/models.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {prepareNamingInput,generateNamingForToss,storedNamingResponse} from '../routes/naming-prompt.js';
import {TossNativeConsultation,TossIdentity} from './models.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {assertNativeIntent} from './native-consultation.js';
import {TossError} from './policy.js';
import {unseal} from './crypto.js';
const service='naming',featureKey='premium-naming-prompt';
const deny=()=>{throw new TossError('RESULT_NOT_FOUND',404);};
export async function prepareNativeNaming(env,auth,body,orderId){
  if(typeof body?.requestId!=='string'||!/^naming-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body.requestId)||!body.input||Object.keys(body).some(k=>!['requestId','input'].includes(k)))throw new TossError('INVALID_INPUT',400);
  const {input,inputHash}=await prepareNamingInput({input:body.input});
  return prepareNativeConsultation(env,auth,{input},orderId,{requestId:body.requestId,resultId:body.requestId,featureKey,inputHash,pricing:getBillingFeaturePricing({featureKey}).pricing},service);
}
const find=(auth,id)=>TossNativeConsultation.findOne({...nativeOwnerFilter(auth,service),_id:id,featureKey}).lean();
const execution=(auth,row)=>PaidExecutionRecord.findOne({userId:String(auth.userId),featureId:featureKey,paymentId:row.orderId}).lean();
async function check(env,auth,row,doc){
  assertNativeIntent(row,auth);
  if(row.nativeService!==service||row.featureKey!==featureKey)deny();
  const snap=doc?.result?.namingPrompt;
  if(doc&&(String(doc.userId)!==String(auth.userId)||doc.featureId!==featureKey||doc.paymentId!==row.orderId||doc.orderId!==row.orderId||snap?.tossIntentId!==row._id||snap?.inputHash!==row.inputHash))deny();
  await verifiedIntent(env,auth,row);
}
export async function readNativeNaming(env,auth,id,advance){
  const row=await find(auth,id);await check(env,auth,row);
  const doc=await execution(auth,row);
  if(doc)await check(env,auth,row,doc);
  if(!advance||doc?.status==='completed'){
    return doc?storedNamingResponse(doc):Response.json({ok:true,status:'generating',retryable:true,resumeBody:{resumeExecutionId:id}},{status:202});
  }
  const order=row.orderId;
  const native={id,access:{accessType:'paid',accessMethod:'single',evidenceId:order,paymentId:order,requestId:row.requestId},
    verify:async stored=>check(env,auth,await find(auth,id),stored||await execution(auth,row))};
  return generateNamingForToss(env,{userId:String(auth.userId)},doc?{resumeExecutionId:doc.executionId}:{input:row.input.input,inputHash:row.inputHash},native);
}
export async function namingLibraryItem(env,auth,purchase){
  if(purchase.nativeService!==service||purchase.featureKey!==featureKey||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment)deny();
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/naming-ai/?orderId='+encodeURIComponent(purchase._id)};
  const row=await find(auth,purchase.requestId);
  if(!row||row.orderId!==purchase._id)deny();
  const doc=await execution(auth,row);await check(env,auth,row,doc);
  return {state:doc?.status==='completed'?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId:row._id,
    href:'/naming-ai/result/?intentId='+encodeURIComponent(row._id),question:row.input.input.familyName+' 작명첩'};
}
export async function resumeNativeNaming(env,doc){
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const id=doc?.result?.namingPrompt?.tossIntentId;
  if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))deny();
  const row=await TossNativeConsultation.findOne({_id:id,nativeService:service,ownerId:doc.userId,featureKey}).lean();
  if(!row)deny();
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(row.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  await check(env,auth,row,doc);
  return readNativeNaming(env,auth,id,true);
}
