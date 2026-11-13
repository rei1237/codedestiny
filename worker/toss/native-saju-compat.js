import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {ServiceExecutionTransaction} from '../lib/models.js';
import {paidNarrativeExecutionKey,runPaidNarrativeDelivery} from '../lib/paid-narrative-delivery.js';
import {sajuCompatNarrativeAdapter,seedSajuCompat} from '../routes/saju-compat-basic.js';
import {normalizeSajuCompatInput} from '../lib/saju-compat-schema.js';
import {TossIdentity,TossNativeConsultation} from './models.js';
import {hash,unseal} from './crypto.js';
import {TossError} from './policy.js';
import {assertNativeIntent} from './native-consultation.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';

const featureKey='compat-saju-compatibility';
const deny=()=>{throw new TossError('RESULT_NOT_FOUND',404);};
async function compatContract(body){
  if(!/^compat-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(body?.requestId)||Object.keys(body).some(key=>!['requestId','compatType','partnerName','self','partner','facts'].includes(key)))throw new TossError('INVALID_INPUT',400);
  normalizeSajuCompatInput(body);
  const input=body;
  const {pricing}=getBillingFeaturePricing({featureKey});
  return {input,contract:{requestId:input.requestId,resultId:input.requestId,inputHash:await hash(JSON.stringify(input)),featureKey,pricing}};
}
export async function prepareCompat(env,auth,body,orderId){
  const {input,contract}=await compatContract(body);
  return prepareNativeConsultation(env,auth,input,orderId,contract,'saju-compat');
}
async function owned(env,auth,id,original,doc){
  const row=await TossNativeConsultation.findOne({...nativeOwnerFilter(auth,'saju-compat'),_id:id,featureKey}).lean();
  if(!row)deny();
  const {input,contract}=await compatContract(row.input);
  assertNativeIntent(row,auth,contract);
  const key=paidNarrativeExecutionKey(String(auth.userId),featureKey,row.requestId);
  if(original){
    const {tossIntentId,...saved}=original;
    if(tossIntentId!==id)deny();
    assertNativeIntent(row,auth,(await compatContract(saved)).contract);
  }
  if(doc&&(String(doc.userId)!==String(auth.userId)||doc.executionKey!==key||doc.reportType!=='sajuCompatBasic'||doc.featureKey!==featureKey||doc.metadata?.tossPaidNarrative!==true))deny();
  await verifiedIntent(env,auth,row);
  return {key,input,row};
}
const execution=(auth,key)=>ServiceExecutionTransaction.findOne({userId:auth.userId,featureKey,executionKey:key}).lean();
export async function readCompat(env,auth,id,advance){
  const {key,input}=await owned(env,auth,id);
  const url=new URL('https://internal.invalid/toss-saju-compat');
  if(!advance){
    if(!await execution(auth,key))return Response.json({ok:true,status:'generating',completedParts:[],retryable:true},{status:202});
    url.searchParams.set('resultId',key);
  }
  return runPaidNarrativeDelivery(new Request(url,{method:advance?'POST':'GET'}),env,{userId:String(auth.userId)},advance?{...input,tossIntentId:id}:{},{
    ...sajuCompatNarrativeAdapter(env),seed:original=>seedSajuCompat(env,original),featureKey,generationOrigin:'toss',
    verify:(original,doc)=>owned(env,auth,id,original,doc),
  });
}
export async function compatLibraryItem(env,auth,purchase){
  if(purchase.nativeService!=='saju-compat'||purchase.featureKey!==featureKey||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment)deny();
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/saju/compatibility/?orderId='+encodeURIComponent(purchase._id)};
  const {key,input,row}=await owned(env,auth,purchase.requestId);
  if(row.orderId!==purchase._id)deny();
  const doc=await execution(auth,key);
  if(doc)await owned(env,auth,row._id,doc.metadata?.paidNarrative?.body,doc);
  return {state:doc?.premiumStatus==='completed'?'COMPLETED':doc?.metadata?.paidNarrative?.exhaustionClaimed?'GENERATION_FAILED':'PENDING',
    resultId:row._id,href:'/saju/compatibility/?intentId='+encodeURIComponent(row._id),question:input.partnerName};
}
export async function verifyCompatRecovery(env,doc){
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const body=doc?.metadata?.paidNarrative?.body;
  if(typeof body?.tossIntentId!=='string'||!/^[a-f0-9]{64}$/.test(body.tossIntentId))deny();
  const row=await TossNativeConsultation.findOne({_id:body?.tossIntentId,ownerId:doc.userId,nativeService:'saju-compat',featureKey}).lean();
  if(!row)deny();
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  return owned(env,{...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)},row._id,body,doc);
}
