import {TossIdentity,TossNativeConsultation,TossPurchase} from './models.js';
import {TossError,validateOrderId} from './policy.js';
import {assertNativeIntent} from './native-consultation.js';
import {nativeOwnerFilter,prepareNativeConsultation,verifiedIntent} from './native-tea.js';
import {nativeSukuyoContract,nativeSukuyoRecoverySummary} from '../routes/sukuyo-compatibility-ai.js';

const service='sukuyo',feature='sukuyo-compatibility-ai',idPattern=/^[a-f0-9]{64}$/;
const owner=auth=>nativeOwnerFilter(auth,service);

async function purchaseForRecovery(env,auth,orderId,verify){
 validateOrderId(orderId);
 const purchase=await TossPurchase.findOne({_id:orderId,...owner(auth),featureKey:feature}).lean();
 if(!purchase)throw new TossError('RESULT_NOT_FOUND',404);
 if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
 await verify(env,auth,purchase);
 if(!await TossIdentity.findOne({_id:auth._id,ownerId:auth.ownerId,active:true,revision:auth.revision}).lean())throw new TossError('SESSION_EXPIRED',401);
 return purchase;
}
async function checkedInput(row,auth){
 assertNativeIntent(row,auth);
 if(row.nativeService!==service||row.featureKey!==feature)throw new TossError('RESULT_NOT_FOUND',404);
 const contract=await nativeSukuyoContract(row.input);
 assertNativeIntent(row,auth,contract);
 return row.input;
}
async function assigned(env,auth,purchase){
 if(!idPattern.test(purchase.requestId||''))throw new TossError('RESULT_NOT_FOUND',404);
 const row=await TossNativeConsultation.findOne({_id:purchase.requestId,...owner(auth),orderId:purchase._id}).lean();
 await checkedInput(row,auth);await verifiedIntent(env,auth,row);
 return {state:'ASSIGNED',intentId:row._id};
}
export async function listNativeSukuyoRecovery(env,auth,orderId,cursor,verify){
 const purchase=await purchaseForRecovery(env,auth,orderId,verify);
 if(purchase.requestId)return assigned(env,auth,purchase);
 const filter={...owner(auth),status:'prepared',orderId:null,sku:purchase.sku,approvedPriceKRW:purchase.approvedPriceKRW,featureKey:feature};
 if(cursor!==undefined&&cursor!==null&&cursor!==''){
  if(typeof cursor!=='string'||!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z,[a-f0-9]{64}$/.test(cursor))throw new TossError('LIBRARY_CURSOR_INVALID');
  const [stamp,id]=cursor.split(','),createdAt=new Date(stamp);
  if(!Number.isFinite(createdAt.getTime())||createdAt.toISOString()!==stamp)throw new TossError('LIBRARY_CURSOR_INVALID');
  filter.$or=[{createdAt:{$lt:createdAt}},{createdAt,_id:{$lt:id}}];
 }
 const rows=await TossNativeConsultation.find(filter).sort({createdAt:-1,_id:-1}).limit(21).lean(),drafts=[];
 for(const row of rows.slice(0,20))drafts.push({id:row._id,input:nativeSukuyoRecoverySummary(await checkedInput(row,auth)),createdAt:row.createdAt});
 const latest=await purchaseForRecovery(env,auth,orderId,verify);
 if(latest.requestId)return assigned(env,auth,latest);
 if(latest.sku!==purchase.sku||latest.approvedPriceKRW!==purchase.approvedPriceKRW)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
 const last=rows[19];
 return {state:'UNASSIGNED',drafts,nextCursor:rows.length>20?`${new Date(last.createdAt).toISOString()},${last._id}`:null};
}
export async function attachNativeSukuyoRecovery(env,auth,orderId,intentId,verify){
 if(typeof intentId!=='string'||!idPattern.test(intentId))throw new TossError('RESULT_NOT_FOUND',404);
 const purchase=await purchaseForRecovery(env,auth,orderId,verify);
 if(purchase.requestId){if(purchase.requestId!==intentId)throw new TossError('ORDER_ALREADY_ASSIGNED',409);return assigned(env,auth,purchase);}
 const row=await TossNativeConsultation.findOne({_id:intentId,...owner(auth)}).lean(),input=await checkedInput(row,auth);
 if(row.status!=='prepared'||row.orderId)throw new TossError('REQUEST_ALREADY_FUNDED',409);
 if(row.sku!==purchase.sku||row.approvedPriceKRW!==purchase.approvedPriceKRW)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
 const contract={requestId:row.requestId,resultId:row.resultId,featureKey:row.featureKey,inputHash:row.inputHash,pricing:row.pricing};
 const result=await prepareNativeConsultation(env,auth,input,orderId,contract,service);
 if(result.id!==intentId||result.paid!==true||result.orderId!==orderId)throw new TossError('GRANT_NOT_DURABLE',409);
 return {state:'ASSIGNED',intentId};
}
