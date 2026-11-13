import {TossError} from './policy.js';
import {TossIdentity,TossNativeConsultation} from './models.js';
import {hash,unseal} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';
import {deliverNativeCompassReport,normalizeCompassReportInput} from '../routes/destiny-compass-ai.js';
import {missingSectionSystems,COMPASS_SECTIONS} from '../lib/destiny-compass-report-contract.js';

const featureKey='destiny-compass-deep-report';
export async function compassContract(raw){
  if(!/^compass-[a-f0-9-]{36}$/i.test(raw?.idempotencyKey)||Object.keys(raw).some(k=>!['idempotencyKey','question','emotion','field','evidencePack'].includes(k)))throw new TossError('INVALID_INPUT',400);
  let input;
  try{input=normalizeCompassReportInput(raw);}catch{throw new TossError('INVALID_INPUT',422);}
  if(missingSectionSystems(input.evidencePack).length)throw new TossError('CALCULATION_INCOMPLETE',422);
  const priced=getBillingFeaturePricing({featureKey});
  if(!priced.ok)throw new TossError('PRICE_NOT_FOUND',503);
  const requestId=input.idempotencyKey;
  return {input,contract:{featureKey,requestId,resultId:'compass_'+await hash(requestId),inputHash:await hash(JSON.stringify(input)),pricing:priced.pricing}};
}
export async function prepareCompass(env,auth,raw,orderId){
  const {input,contract}=await compassContract(raw);
  return prepareNativeConsultation(env,auth,input,orderId,contract,'compass');
}
export async function readNativeCompass(env,auth,id,generate=false){
  const row=await TossNativeConsultation.findOne({...nativeOwnerFilter(auth,'compass'),_id:id}).lean();
  assertNativeIntent(row,auth);
  const {input,contract}=await compassContract(row.input);
  assertNativeIntent(row,auth,contract);
  await verifiedIntent(env,auth,row);
  const nativeReportId='tossdc_'+row._id;
  const bound={userId:auth.userId,inputHash:row.inputHash,nativeReportId,async assertTossReport(doc){
    if(doc?.id!==nativeReportId||doc.accessType!=='toss'||String(doc.userId)!==String(auth.userId)||doc.idempotencyKey!==row.requestId||doc.llmMeta?.tossInputHash!==row.inputHash||doc.llmMeta.transactionId!==row.orderId)throw new TossError('RESULT_NOT_FOUND',404);
    await verifiedIntent(env,auth,row);
  }};
  const result=await deliverNativeCompassReport(env,bound,input,row.orderId,generate);
  await verifiedIntent(env,auth,row);
  return result;
}
export async function compassLibraryItem(env,auth,purchase){
  if(purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment||purchase.featureKey!==featureKey||purchase.nativeService!=='compass')throw new TossError('RESULT_NOT_FOUND',404);
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/destiny-compass?orderId='+encodeURIComponent(purchase._id)};
  const receipt=await TossNativeConsultation.findOne({...nativeOwnerFilter(auth,'compass'),_id:purchase.requestId,orderId:purchase._id}).lean();
  if(!receipt)throw new TossError('RESULT_NOT_FOUND',404);
  const response=await readNativeCompass(env,auth,purchase.requestId);
  const result=await response.json();
  return {state:result.status==='completed'?'COMPLETED':result.status==='generation_failed'?'GENERATION_FAILED':'PENDING',resultId:purchase.requestId,
    href:'/destiny-compass?resultId='+purchase.requestId,completedSections:result.progress?.completed||0,totalSections:COMPASS_SECTIONS.length};
}
export async function resumeNativeCompass(env,doc){
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const row=await TossNativeConsultation.findOne({nativeService:'compass',ownerId:doc.userId,requestId:doc.idempotencyKey}).lean();
  if(!row||doc.accessType!=='toss'||row.inputHash!==doc.llmMeta?.tossInputHash||row.orderId!==doc.llmMeta.transactionId)throw new TossError('RESULT_NOT_FOUND',404);
  const identity=await TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  return readNativeCompass(env,{...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)},row._id,true);
}
