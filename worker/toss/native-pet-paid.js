import {ServiceExecutionTransaction} from '../lib/models.js';
import {withMongoRetry} from '../lib/db.js';
import {paidNarrativeExecutionKey,runPaidNarrativeDelivery} from '../lib/paid-narrative-delivery.js';
import {petNarrativeAdapter,seedPetNarrative} from '../routes/pet-saju-ai.js';
import {TossIdentity,TossNativeConsultation} from './models.js';
import {unseal} from './crypto.js';
import {TossError} from './policy.js';
import {assertNativeIntent} from './native-consultation.js';
import {nativeIntentId,nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {tossPetPaidContract} from './pet-paid-contract.js';

const SERVICE='pet',idPattern=/^[a-f0-9]{64}$/;
const ownerFilter=auth=>nativeOwnerFilter(auth,SERVICE);
const reportType=kind=>kind==='report'?'petSajuReport':'petCompatReport';

export async function prepareNativePet(env,auth,input,orderId){
  let prepared=await tossPetPaidContract(input);
  const id=await nativeIntentId(auth,prepared.contract,SERVICE);
  const previous=await withMongoRetry(env,()=>TossNativeConsultation.findOne({_id:id,...ownerFilter(auth)}).lean());
  // A user retry after midnight retains the original server-selected date.
  if(previous)prepared=await tossPetPaidContract({...input,date:previous.input?.date},{stored:true});
  return prepareNativeConsultation(env,auth,prepared.input,orderId,prepared.contract,SERVICE);
}

async function checkedIntent(row,auth){
  assertNativeIntent(row,auth);
  if(row.nativeService!==SERVICE)throw new TossError('RESULT_NOT_FOUND',404);
  const prepared=await tossPetPaidContract(row.input,{stored:true});
  assertNativeIntent(row,auth,prepared.contract);
  return prepared;
}

async function authorizedIntent(env,auth,id,original,doc){
  if(!idPattern.test(id))throw new TossError('RESULT_NOT_FOUND',404);
  const row=await withMongoRetry(env,()=>TossNativeConsultation.findOne({_id:id,...ownerFilter(auth)}).lean());
  const prepared=await checkedIntent(row,auth);
  if(original){
    const {tossIntentId,...savedInput}=original;
    if(tossIntentId!==id)throw new TossError('RESULT_NOT_FOUND',404);
    const saved=await tossPetPaidContract(savedInput,{stored:true});
    assertNativeIntent(row,auth,saved.contract);
  }
  const expected=paidNarrativeExecutionKey(String(auth.userId),row.featureKey,row.requestId);
  if(doc&&(String(doc.userId)!==String(auth.userId)||doc.executionKey!==expected||doc.featureKey!==row.featureKey||doc.reportType!==reportType(prepared.input.kind)))throw new TossError('RESULT_NOT_FOUND',404);
  await verifiedIntent(env,auth,row);
  return {row,prepared,expected};
}

// GET only reads; POST generates from the immutable paid intent. A paid order
// without its first checkpoint remains recoverable without a second checkout.
export async function readNativePet(env,auth,id,{generate=false}={}){
  const {row,prepared,expected}=await authorizedIntent(env,auth,id);
  const doc=await withMongoRetry(env,()=>ServiceExecutionTransaction.findOne({userId:auth.userId,featureKey:row.featureKey,executionKey:expected}).lean());
  if(!doc&&!generate){
    await authorizedIntent(env,auth,id);
    return Response.json({ok:true,status:'generating',saved:false,retryable:true,intentId:id},{status:202});
  }
  const url=new URL('https://internal.invalid/toss-pet');
  if(!generate)url.searchParams.set('resultId',expected);
  const request=new Request(url,{method:generate?'POST':'GET'});
  return runPaidNarrativeDelivery(request,env,{userId:String(auth.userId)},generate?{...prepared.input,tossIntentId:id}:{},
    {...petNarrativeAdapter(env,reportType(prepared.input.kind)),featureKey:row.featureKey,generationOrigin:'toss',
      seed:original=>seedPetNarrative(prepared.input.kind,original),
      verify:(original,stored)=>authorizedIntent(env,auth,id,original,stored)});
}

const KINDS=Object.freeze({'pet-saju-ai-consultation':'report','pet-compatibility-ai':'compat'});

// A library link is offered only after the same owner, order and saved input
// are verified; an order without an intent asks for the pet input again.
export async function nativePetLibraryItem(env,auth,purchase){
  if(!purchase||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment||purchase.nativeService!==SERVICE||!Object.hasOwn(KINDS,purchase.featureKey))throw new TossError('RESULT_NOT_FOUND',404);
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/pet-saju/?kind='+KINDS[purchase.featureKey]+'&orderId='+encodeURIComponent(purchase._id)};
  if(!idPattern.test(purchase.requestId))throw new TossError('RESULT_NOT_FOUND',404);
  const row=await withMongoRetry(env,()=>TossNativeConsultation.findOne({_id:purchase.requestId,...ownerFilter(auth),orderId:purchase._id}).lean());
  if(!row||row.featureKey!==purchase.featureKey)throw new TossError('RESULT_NOT_FOUND',404);
  const expected=paidNarrativeExecutionKey(String(auth.userId),row.featureKey,row.requestId);
  const doc=await withMongoRetry(env,()=>ServiceExecutionTransaction.findOne({userId:auth.userId,featureKey:row.featureKey,executionKey:expected}).lean());
  await authorizedIntent(env,auth,row._id,doc?.metadata?.paidNarrative?.body,doc||undefined);
  const state=doc?.premiumStatus==='completed'?'COMPLETED':doc?.metadata?.paidNarrative?.exhaustionClaimed?'GENERATION_FAILED':'PENDING';
  return {state,resultId:row.resultId,href:'/pet-saju/?intentId='+encodeURIComponent(row._id)};
}

// Scheduled continuation uses the original intent and the active identity;
// neither a client-supplied order nor an old web proof is sufficient.
export async function verifyNativePetRecovery(env,doc){
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const id=doc?.metadata?.paidNarrative?.body?.tossIntentId;
  if(typeof id!=='string'||!idPattern.test(id))throw new TossError('RESULT_NOT_FOUND',404);
  const row=await withMongoRetry(env,()=>TossNativeConsultation.findOne({_id:id,nativeService:SERVICE,ownerId:doc.userId}).lean());
  if(!row)throw new TossError('RESULT_NOT_FOUND',404);
  const identity=await withMongoRetry(env,()=>TossIdentity.findOne({_id:row.identityId,ownerId:row.ownerId,active:true}).lean());
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(identity.ownerId),environment:row.environment,userKey:await unseal(env,identity.encryptedKey,identity._id)};
  await authorizedIntent(env,auth,id,doc.metadata.paidNarrative.body,doc);
}
