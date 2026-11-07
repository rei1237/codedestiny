import {TossNativeConsultation} from './models.js';
import {TossError} from './policy.js';
import {hash} from './crypto.js';
import {assertNativeIntent} from './native-consultation.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {buildMayaPrompt,mayaContract,normalizeMayaInput} from './maya-contract.js';

const SERVICE='maya',FEATURE='maya-prompt-generator',RESULT_VERSION='maya-prompt-v1';
const ownerFilter=auth=>nativeOwnerFilter(auth,SERVICE);
const idPattern=/^[a-f0-9]{64}$/;

export async function prepareNativeMaya(env,auth,input,orderId){
  const prepared=await mayaContract(input);
  return prepareNativeConsultation(env,auth,prepared.input,orderId,prepared.contract,SERVICE);
}

export async function checkedNativeMayaInput(row,auth){
  assertNativeIntent(row,auth);
  const input=normalizeMayaInput(row.input);
  if(row.nativeService!==SERVICE||row.featureKey!==FEATURE||row.requestId!==input.requestId||row.inputHash!==await hash(JSON.stringify(input)))throw new TossError('REQUEST_INPUT_MISMATCH',409);
  return input;
}

function savedPrompt(row){
  const saved=row.savedResult;
  if(!saved||saved.version!==RESULT_VERSION||saved.inputHash!==row.inputHash||typeof saved.prompt!=='string'||!saved.prompt.trim())throw new TossError('RESULT_NOT_FOUND',404);
  return saved.prompt;
}

/** A read never creates a result; generation is an explicit, idempotent operation. */
export async function readNativeMaya(env,auth,id,{generate=false}={}){
  if(!idPattern.test(id))throw new TossError('RESULT_NOT_FOUND',404);
  const filter={_id:id,...ownerFilter(auth)};
  let row=await TossNativeConsultation.findOne(filter).lean();
  const input=await checkedNativeMayaInput(row,auth);
  await verifiedIntent(env,auth,row);
  if(!row.savedResult&&generate){
    const prompt=buildMayaPrompt(input);
    const savedResult={version:RESULT_VERSION,inputHash:row.inputHash,prompt};
    row=await TossNativeConsultation.findOneAndUpdate({...filter,status:'paid',orderId:row.orderId,inputHash:row.inputHash,savedResult:null},{$set:{savedResult}},{new:true,runValidators:true}).lean()
      ||await TossNativeConsultation.findOne(filter).lean();
  }
  await checkedNativeMayaInput(row,auth);
  await verifiedIntent(env,auth,row);
  if(!row.savedResult)return {id:row._id,resultId:row.resultId,state:'PENDING'};
  return {id:row._id,resultId:row.resultId,state:'COMPLETED',prompt:savedPrompt(row)};
}

export async function nativeMayaLibraryItem(env,auth,purchase){
  if(!purchase||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment||purchase.nativeService!==SERVICE)throw new TossError('RESULT_NOT_FOUND',404);
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!purchase.requestId)return {state:'UNASSIGNED',href:'/maya/?orderId='+encodeURIComponent(purchase._id)};
  if(!idPattern.test(purchase.requestId))throw new TossError('RESULT_NOT_FOUND',404);
  const row=await TossNativeConsultation.findOne({_id:purchase.requestId,...ownerFilter(auth),orderId:purchase._id}).lean();
  const input=await checkedNativeMayaInput(row,auth);
  await verifiedIntent(env,auth,row);
  if(row.savedResult)savedPrompt(row);
  return {state:row.savedResult?'COMPLETED':'PENDING',resultId:row.resultId,href:'/maya/?intentId='+encodeURIComponent(row._id),question:input.question.slice(0,200)};
}
