import prompts from '../../js/core/yoga-guru-prompts.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {ServiceExecutionTransaction} from '../lib/models.js';
import {withMongoRetry} from '../lib/db.js';
import {paidNarrativeExecutionKey,runPaidNarrativeDelivery} from '../lib/paid-narrative-delivery.js';
import {seedYogaCourse,yogaNarrativeAdapter} from '../routes/yoga-guru.js';
import {TossIdentity,TossNativeConsultation} from './models.js';
import {hash,unseal} from './crypto.js';
import {TossError} from './policy.js';
import {assertNativeIntent} from './native-consultation.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';

const featureKey='yoga-guru-per-use';
export async function yogaContract(body){
  if(typeof body?.requestId!=='string'||!/^yoga-[a-f0-9-]{36}$/i.test(body.requestId)||![30,60].includes(body.duration)
    ||typeof body.mood!=='string'||!body.mood.trim()||Object.keys(body).some(key=>!['mood','duration','requestId'].includes(key)))throw new TossError('INVALID_INPUT',400);
  const input={mood:body.mood.trim(),duration:body.duration,requestId:body.requestId};
  // Apply the same compiled user-prompt limit as the web route.
  seedYogaCourse({...input,systemPrompt:prompts.buildSystemPrompt(),userPrompt:prompts.buildUserPrompt(input.mood,input.duration)});
  const priced=getBillingFeaturePricing({featureKey,reason:'openYogaGuru '+input.duration+'분 코스'});
  if(!priced.ok||priced.pricing.billingType!=='per_use')throw new TossError('PRICE_NOT_FOUND',503);
  return {input,contract:{featureKey,requestId:input.requestId,inputHash:await hash(JSON.stringify(input)),resultId:'yoga_'+await hash(input.requestId),pricing:priced.pricing}};
}
export async function prepareYoga(env,auth,body,orderId){
  const {input,contract}=await yogaContract(body);
  return prepareNativeConsultation(env,auth,input,orderId,contract,'yoga');
}
async function authority(env,auth,id,original,doc){
  if(!/^[a-f0-9]{64}$/.test(id))throw new TossError('RESULT_NOT_FOUND',404);
  const row=await withMongoRetry(env,()=>TossNativeConsultation.findOne({...nativeOwnerFilter(auth,'yoga'),_id:id}).lean());
  assertNativeIntent(row,auth);
  const {input,contract}=await yogaContract(row.input);
  assertNativeIntent(row,auth,contract);
  const key=paidNarrativeExecutionKey(String(auth.userId),featureKey,row.requestId);
  if(original){
    const {tossIntentId,...body}=original;
    if(tossIntentId!==id)throw new TossError('RESULT_NOT_FOUND',404);
    assertNativeIntent(row,auth,(await yogaContract(body)).contract);
  }
  if(doc&&(doc.executionKey!==key||String(doc.userId)!==String(auth.userId)||doc.reportType!=='yogaGuruCourse'||doc.featureKey!==featureKey||doc.metadata?.tossPaidNarrative!==true))throw new TossError('RESULT_NOT_FOUND',404);
  await verifiedIntent(env,auth,row);
  return {row,input,key};
}
function stored(env,auth,executionKey){
  return withMongoRetry(env,()=>ServiceExecutionTransaction.findOne({userId:auth.userId,featureKey,executionKey}).lean());
}
export async function readNativeYoga(env,auth,id,generate=false){
  const {input,key}=await authority(env,auth,id);
  if(!generate&&!await stored(env,auth,key))return Response.json({status:'generating',saved:false,retryable:true},{status:202});
  const url=new URL('https://internal.invalid/toss-yoga');
  if(!generate)url.searchParams.set('resultId',key);
  return runPaidNarrativeDelivery(new Request(url,{method:generate?'POST':'GET'}),env,auth,generate?{...input,tossIntentId:id}:{},{
    ...yogaNarrativeAdapter(env),generationOrigin:'toss',featureKey,
    seed:original=>seedYogaCourse({...original,systemPrompt:prompts.buildSystemPrompt(),userPrompt:prompts.buildUserPrompt(original.mood,original.duration)}),
    verify:(original,doc)=>authority(env,auth,id,original,doc),
  });
}
export async function nativeYogaLibraryItem(env,auth,purchase){
  if(purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment||purchase.nativeService!=='yoga'||purchase.featureKey!==featureKey)throw new TossError('RESULT_NOT_FOUND',404);
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/yoga-guru?orderId='+encodeURIComponent(purchase._id)};
  const {row,input,key}=await authority(env,auth,purchase.requestId);
  if(row.orderId!==purchase._id)throw new TossError('RESULT_NOT_FOUND',404);
  const doc=await stored(env,auth,key);
  if(doc)await authority(env,auth,row._id,doc.metadata?.paidNarrative?.body,doc);
  const review=doc?.metadata?.paidNarrative?.attempts?.course>=2&&!doc?.metadata?.paidNarrative?.parts?.course;
  return {state:doc?.premiumStatus==='completed'?'COMPLETED':review?'GENERATION_FAILED':'PENDING',resultId:row.resultId,href:'/yoga-guru?resultId='+encodeURIComponent(row._id),question:input.duration+'분 요가 코스',completedSections:doc?.premiumStatus==='completed'?1:0,totalSections:1};
}
export async function verifyNativeYogaRecovery(env,doc){
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const original=doc.metadata?.paidNarrative?.body,id=original?.tossIntentId;
  const row=await withMongoRetry(env,()=>TossNativeConsultation.findOne({_id:id,nativeService:'yoga',ownerId:doc.userId}).lean());
  if(!row)throw new TossError('RESULT_NOT_FOUND',404);
  const identity=await withMongoRetry(env,()=>TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean());
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  await authority(env,{...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)},id,original,doc);
}
