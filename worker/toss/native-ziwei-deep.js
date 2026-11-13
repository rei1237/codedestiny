import {TossError} from './policy.js';
import {TossIdentity,TossNativeConsultation} from './models.js';
import {hash,unseal} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {readStoredNativeZiweiDeep,runZiweiDeepReportDeliveryBatch,normalizeZiweiDeepInput,validateNativeZiweiDeepBirth} from '../routes/ziwei-deep-report.js';
import {ZIWEI_DEEP_CHAPTERS} from '../lib/ziwei-deep-report-prompt.mjs';

const featureKey='ziwei-deep-pdf';
const areas=new Set(['overall','personality','career','money','love','relationship','health','custom']);
export async function ziweiDeepContract(raw){
  if(!/^zwdp-[a-f0-9-]{36}$/i.test(raw?.idempotencyKey)||!areas.has(raw.focusArea)||Object.keys(raw).some(k=>!['idempotencyKey','birthInfo','question','topic','focusArea'].includes(k)))throw new TossError('INVALID_INPUT',400);
  const normalized=normalizeZiweiDeepInput(raw);
  if(!normalized.ok||raw.focusArea==='custom'&&normalized.consultation.question.length<2)throw new TossError('INVALID_INPUT',422);
  const priced=getBillingFeaturePricing({featureKey});
  if(!priced.ok)throw new TossError('PRICE_NOT_FOUND',503);
  const requestId=raw.idempotencyKey;
  const input={idempotencyKey:requestId,birthInfo:normalized.birthInfo,...normalized.consultation};
  return {input,contract:{featureKey,requestId,resultId:'ziwei_deep_'+await hash(requestId),inputHash:await hash(JSON.stringify(input)),pricing:priced.pricing}};
}
export async function prepareZiweiDeep(env,auth,raw,orderId){
  const {input,contract}=await ziweiDeepContract(raw);
  try{validateNativeZiweiDeepBirth(env,normalizeZiweiDeepInput(input));}catch{throw new TossError('CALCULATION_INCOMPLETE',422);}
  return prepareNativeConsultation(env,auth,input,orderId,contract,'ziwei-deep');
}
export async function readNativeZiweiDeep(env,auth,id,generate=false){
  const row=await TossNativeConsultation.findOne({...nativeOwnerFilter(auth,'ziwei-deep'),_id:id}).lean();
  assertNativeIntent(row,auth);
  const {input,contract}=await ziweiDeepContract(row.input);
  assertNativeIntent(row,auth,contract);
  await verifiedIntent(env,auth,row);
  const bound={userId:auth.userId,inputHash:row.inputHash,orderId:row.orderId,verify:()=>verifiedIntent(env,auth,row),async assertTossReport(doc){
    if(doc?.accessType!=='toss'||String(doc.userId)!==String(auth.userId)||doc.idempotencyKey!==row.requestId||doc.llmMeta?.tossInputHash!==row.inputHash||doc.llmMeta.tossOrderId!==row.orderId)throw new TossError('RESULT_NOT_FOUND',404);
    await verifiedIntent(env,auth,row);
  }};
  const result=generate?await runZiweiDeepReportDeliveryBatch(new Request('https://internal.invalid/api/ziwei-deep-report/generate',{method:'POST'}),env,input,bound):await readStoredNativeZiweiDeep(env,bound,row.requestId);
  await verifiedIntent(env,auth,row);
  return result;
}
export async function ziweiDeepLibraryItem(env,auth,purchase){
  if(purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment||purchase.featureKey!==featureKey||purchase.nativeService!=='ziwei-deep')throw new TossError('RESULT_NOT_FOUND',404);
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/ziwei/chart?orderId='+encodeURIComponent(purchase._id)};
  const receipt=await TossNativeConsultation.findOne({...nativeOwnerFilter(auth,'ziwei-deep'),_id:purchase.requestId,orderId:purchase._id}).lean();
  if(!receipt)throw new TossError('RESULT_NOT_FOUND',404);
  const response=await readNativeZiweiDeep(env,auth,purchase.requestId);
  const result=await response.json();
  return {state:result.status==='completed'?'COMPLETED':result.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId:purchase.requestId,
    href:'/ziwei/chart?resultId='+purchase.requestId,completedSections:result.chapters?.length||0,totalSections:ZIWEI_DEEP_CHAPTERS.length};
}
export async function resumeNativeZiweiDeep(env,doc){
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const row=await TossNativeConsultation.findOne({nativeService:'ziwei-deep',ownerId:doc.userId,requestId:doc.idempotencyKey}).lean();
  if(!row||doc.accessType!=='toss'||row.inputHash!==doc.llmMeta?.tossInputHash||row.orderId!==doc.llmMeta.tossOrderId)throw new TossError('RESULT_NOT_FOUND',404);
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  return readNativeZiweiDeep(env,{...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)},row._id,true);
}

