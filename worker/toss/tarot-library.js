import {checkOrder,TossError} from './policy.js';

const paid=(id,name,featureKeys,resultAdapter)=>Object.freeze({id,name,access:'iap',featureKeys:Object.freeze(featureKeys),resultAdapter});
const free=(id,name,resultAdapter)=>Object.freeze({id,name,access:'free-local',featureKeys:Object.freeze([]),resultAdapter});

// This is an ownership and persistence contract, not a price registry. Toss SKU
// approval stays in catalog.js; a web price must never become an app price here.
export const TOSS_TAROT_LIBRARY_FLOWS=Object.freeze([
  free('tarot','타로 리딩','tarot-reading'),
  paid('tarot-celestial-harmony','천체의 선율',['tarot-celestial-harmony'],'celestial-harmony'),
  paid('tarot-crystal-soul','원석 소울 타로',['tarot-crystal-soul-reading'],'crystal-soul'),
  free('tarot-healing','회복 타로','tarot-healing'),
  paid('tarot-ijik','이직 운명의 카드',['tarot-ijik'],'ijik'),
  paid('tarot-love-relationship','우리는 무슨 사이?',['tarot-love-relationship'],'love-tarot'),
  paid('tarot-mindscan','말과 행동 사이 타로',['tarot-mindscan'],'mindscan'),
  paid('tarot-numerology','수비학 타로',['tarot-numerology-reading'],'numerology-tarot'),
  paid('tarot-prompt-maker','타로 오라클 상담',['tarot-prompt-maker','tarot-prompt-maker-standard','tarot-prompt-maker-deep','tarot-prompt-maker-master'],'oracle-consultation'),
  paid('tarot-reunion','재회운 타로',['tarot-reunion-reading'],'reunion-tarot'),
  free('tarot-self-esteem','자기 기준 회복 타로','self-esteem-local'),
  paid('tarot-year-fortune','십이지신 천운 타로',['tarot-year-fortune'],'year-tarot'),
]);

const byId=new Map(TOSS_TAROT_LIBRARY_FLOWS.map(flow=>[flow.id,flow]));
const byFeatureKey=new Map(TOSS_TAROT_LIBRARY_FLOWS.flatMap(flow=>flow.featureKeys.map(featureKey=>[featureKey,flow])));

export function tarotLibraryFlow(id){
  const flow=byId.get(id);
  if(!flow)throw new TossError('TAROT_LIBRARY_FLOW_INVALID');
  return flow;
}

export function tarotLibraryProduct(product){
  if(!product||product.kind!=='tarot-library'||product.approved!==true
    ||typeof product.sku!=='string'||!product.sku||!Number.isSafeInteger(product.approvedPriceKRW)||product.approvedPriceKRW<=0
    ||typeof product.priceEvidence!=='string'||!product.priceEvidence.trim())throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  const flow=tarotLibraryFlow(product.tarotFlowId);
  if(flow.access!=='iap'||!flow.featureKeys.includes(product.featureKey)
    ||product.productId!==`tarot-library:${flow.id}`)throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return {...product,flow};
}

export const tarotLibraryRequestId=orderId=>`toss-tarot:${orderId}`;
export const tarotLibraryExecutionId=orderId=>`toss-tarot-execution:${orderId}`;
export const tarotLibraryResultId=orderId=>`toss-tarot-result:${orderId}`;

function assertExistingPurchase(purchase,auth,product,orderId){
  if(!purchase||purchase.identityId!==auth._id||purchase.environment!==auth.environment||purchase.sku!==product.sku
    ||purchase.productId!==product.productId||purchase.tarotFlowId!==product.flow.id||purchase.featureKey!==product.featureKey) {
    throw new TossError('ORDER_OWNERSHIP_MISMATCH',403);
  }
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(purchase._id!==orderId)throw new TossError('ORDER_MISMATCH',403);
}

function assertExistingExecution(execution,auth,product,orderId){
  const requestId=tarotLibraryRequestId(orderId);
  if(!execution||execution.executionId!==tarotLibraryExecutionId(orderId)||execution.requestId!==requestId
    ||execution.userId!==String(auth.ownerId)||execution.featureId!==product.featureKey||execution.profileId!==`toss:${auth._id}`
    ||execution.paymentId!==orderId||execution.orderId!==orderId||execution.accessMethod!=='single') {
    throw new TossError('ORDER_OWNERSHIP_MISMATCH',403);
  }
  if(['refunded','cancelled'].includes(execution.status))throw new TossError('ORDER_REFUNDED',409);
}

/**
 * IAP callback adapter. It persists the ownership record and the execution record
 * atomically before the SDK grant is acknowledged. Delivery workers later claim the
 * same execution; neither the callback nor a library reread invokes an LLM.
 */
export async function grantTarotLibraryOrder({store,auth,order,product}){
  checkOrder(order,{orderId:order.orderId,sku:product.sku});
  const receipt=await store.transaction(async tx=>{
    await tx.assertIdentity(auth);
    let purchase=await tx.purchase(order.orderId);
    let execution=await tx.execution(order.orderId);
    if(purchase)assertExistingPurchase(purchase,auth,product,order.orderId);
    if(execution)assertExistingExecution(execution,auth,product,order.orderId);
    if(!purchase){
      purchase={_id:order.orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,
        sku:product.sku,productId:product.productId,tarotFlowId:product.flow.id,featureKey:product.featureKey,
        approvedPriceKRW:product.approvedPriceKRW,priceEvidence:product.priceEvidence,status:order.status,
        requestId:tarotLibraryRequestId(order.orderId),executionId:tarotLibraryExecutionId(order.orderId),verifiedAt:new Date(),grantedAt:new Date()};
      await tx.insertPurchase(purchase);
    }
    if(!execution){
      execution={executionId:tarotLibraryExecutionId(order.orderId),requestId:tarotLibraryRequestId(order.orderId),
        userId:String(auth.ownerId),featureId:product.featureKey,profileId:`toss:${auth._id}`,accessMode:'per_use',accessMethod:'single',
        amountKRW:product.approvedPriceKRW,paymentId:order.orderId,orderId:order.orderId,status:'paid_pending_generation',
        resultId:tarotLibraryResultId(order.orderId),result:null,error:null,idempotencyKey:order.orderId};
      await tx.insertExecution(execution);
    }
    return {orderId:order.orderId,requestId:execution.requestId,resultId:execution.resultId,entitlement:'granted',durable:true,
      flowId:product.flow.id,state:execution.status};
  });
  return receipt;
}

// Delivery callers are server-only. The public route can read a stored result but
// cannot submit one, which keeps an IAP callback from becoming a result forgery API.
export async function claimTarotLibraryDelivery({store,auth,orderId,flowId}){
  const flow=tarotLibraryFlow(flowId);
  return store.transaction(async tx=>{
    await tx.assertIdentity(auth);
    const purchase=await tx.purchase(orderId),execution=await tx.execution(orderId);
    assertExistingPurchase(purchase,auth,{...purchase,flow},orderId);
    assertExistingExecution(execution,auth,{...purchase,flow},orderId);
    if(purchase.tarotFlowId!==flow.id)throw new TossError('RESULT_NOT_FOUND',404);
    if(execution.status==='completed')return {state:'completed',execution};
    const claimed=await tx.claimExecution(orderId);
    return claimed?{state:'claimed',execution:claimed}:{state:'in_progress',execution:await tx.execution(orderId)};
  });
}

export async function completeTarotLibraryDelivery({store,auth,orderId,flowId,result}){
  const flow=tarotLibraryFlow(flowId);
  return store.transaction(async tx=>{
    await tx.assertIdentity(auth);
    const purchase=await tx.purchase(orderId),execution=await tx.execution(orderId);
    assertExistingPurchase(purchase,auth,{...purchase,flow},orderId);
    assertExistingExecution(execution,auth,{...purchase,flow},orderId);
    if(purchase.tarotFlowId!==flow.id)throw new TossError('RESULT_NOT_FOUND',404);
    if(execution.status==='completed')return tarotLibraryResult(execution,flow);
    const completed=await tx.completeExecution(orderId,result);
    if(!completed)throw new TossError('DELIVERY_NOT_CLAIMED',409);
    return tarotLibraryResult(completed,flow);
  });
}

export function tarotLibraryResult(execution,flow){
  if(!execution)throw new TossError('RESULT_NOT_FOUND',404);
  if(['refunded','cancelled'].includes(execution.status))throw new TossError('ORDER_REFUNDED',409);
  return {requestId:execution.requestId,resultId:execution.resultId,flowId:flow.id,featureKey:flow.featureKeys.includes(execution.featureId)?execution.featureId:null,
    state:execution.status,result:execution.status==='completed'?execution.result:null,
    canRetryNow:execution.status==='generation_failed'};
}
