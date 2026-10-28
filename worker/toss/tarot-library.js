import {checkOrder,TossError} from './policy.js';
import {TOSS_TAROT_LIBRARY_FLOWS,tossTarotLibraryFlow} from '../../lib/tarot/toss-library-flows.mjs';
import {getTarotCardByAnyId} from '../../lib/tarot/tarot-cards.mjs';
import {generateTarotLibraryResult} from './tarot-library-generator.js';

export {TOSS_TAROT_LIBRARY_FLOWS};
export const TAROT_DELIVERY_LEASE_MS=5*60*1000;

export function tarotLibraryFlow(id){
  const flow=tossTarotLibraryFlow(id);
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

function text(value){return typeof value==='string'?value.trim():'';}
function tarotInput(flow,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  const question=text(input.question);
  if(question.length<2||question.length>600)throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  const cards=Array.isArray(input.cards)?input.cards:[];
  if(cards.length!==flow.cardCount||new Set(cards.map(card=>text(card?.cardId))).size!==cards.length)throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  const normalized=cards.map((card,index)=>{
    const source=getTarotCardByAnyId(text(card?.cardId));
    if(!source||!['upright','reversed'].includes(card?.orientation)||text(card?.position)!==flow.positions[index][0])throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
    return {cardId:source.code,orientation:card.orientation,position:flow.positions[index][0]};
  });
  const birthDate=text(input.birthDate);
  if(flow.id==='tarot-numerology'&&!/^\d{4}-\d{2}-\d{2}$/.test(birthDate))throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  const gem=text(input.gem);
  if(flow.id==='tarot-crystal-soul'&&gem&&!/^[a-z-]{3,40}$/.test(gem))throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  return {question,cards:normalized,...(birthDate?{birthDate}:{}),...(gem?{gem}:{})};
}

export function tarotLibraryInput(flowId,input){return tarotInput(tarotLibraryFlow(flowId),input);}

// This deterministic baseline is intentionally card/position only. Paid flows
// replace it with their own server generator before release; it is never a fake
// LLM answer or a client-supplied result.
export function buildTarotLibraryBaseline(flowId,input){
  const flow=tarotLibraryFlow(flowId),safe=tarotInput(flow,input);
  const cards=safe.cards.map((item,index)=>{
    const card=getTarotCardByAnyId(item.cardId),[position,positionLabel]=flow.positions[index];
    return {cardId:card.code,nameKr:card.nameKo,nameEn:card.nameEn,orientation:item.orientation,position,positionLabel,keywords:card.keywords.slice(0,3)};
  });
  const first=cards[0],last=cards[cards.length-1];
  return {version:'toss-tarot-baseline-v1',flowId:flow.id,title:flow.name,question:safe.question,cards,
    opening:`선택한 ${cards.length}장의 카드가 ${flow.name}의 질문을 차분히 비추고 있어요.`,
    summary:`${first.nameKr}${first.orientation==='reversed'?' 역방향':''} 카드부터 ${last.nameKr}${last.orientation==='reversed'?' 역방향':''} 카드까지, 질문의 조건을 한 번에 단정하지 않고 순서대로 살펴봅니다.`,
    advice:'카드가 비춘 조건을 메모하고, 이번 주 안에 확인할 수 있는 행동 하나로 바꿔 보세요.'};
}

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
export async function grantTarotLibraryOrder({store,auth,order,product,input}){
  checkOrder(order,{orderId:order.orderId,sku:product.sku});
  const prepared=input===undefined?null:tarotInput(product.flow,input);
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
        resultId:tarotLibraryResultId(order.orderId),result:null,error:null,input:prepared,idempotencyKey:order.orderId};
      await tx.insertExecution(execution);
    }
    return {orderId:order.orderId,requestId:execution.requestId,resultId:execution.resultId,entitlement:'granted',durable:true,
      flowId:product.flow.id,state:execution.status};
  });
  return receipt;
}

// A recovered purchase may have no question because the app closed before grant.
// Attach it once, under the same ownership transaction; never replace paid input.
export async function attachTarotLibraryInput({store,auth,orderId,flowId,input}){
  const flow=tarotLibraryFlow(flowId),prepared=tarotInput(flow,input);
  return store.transaction(async tx=>{
    await tx.assertIdentity(auth);
    const purchase=await tx.purchase(orderId),execution=await tx.execution(orderId);
    assertExistingPurchase(purchase,auth,{...purchase,flow},orderId);
    assertExistingExecution(execution,auth,{...purchase,flow},orderId);
    if(execution.input)return;
    if(execution.status!=='paid_pending_generation')throw new TossError('TAROT_LIBRARY_INPUT_LOCKED',409);
    if(!await tx.attachExecutionInput(orderId,prepared))throw new TossError('TAROT_LIBRARY_INPUT_LOCKED',409);
  });
}

export async function deliverTarotLibraryOrder({store,auth,orderId,flowId,env={},generate=(id,input)=>generateTarotLibraryResult(id,input,{env})}){
  const claimed=await claimTarotLibraryDelivery({store,auth,orderId,flowId});
  if(claimed.state==='completed')return tarotLibraryResult(claimed.execution,tarotLibraryFlow(flowId));
  if(claimed.state==='input_required')return tarotLibraryResult(claimed.execution,tarotLibraryFlow(flowId));
  if(claimed.state!=='claimed')return {state:'generating',result:null,canRetryNow:false};
  const input=claimed.execution?.input;
  if(!input)throw new TossError('TAROT_LIBRARY_INPUT_MISSING',409);
  try{
    const result=await generate(flowId,input);
    return completeTarotLibraryDelivery({store,auth,orderId,flowId,result,token:claimed.execution.tossDeliveryToken});
  }catch(error){
    return failTarotLibraryDelivery({store,auth,orderId,flowId,error,token:claimed.execution.tossDeliveryToken});
  }
}

// Delivery callers are server-only. The public route can read a stored result but
// cannot submit one, which keeps an IAP callback from becoming a result forgery API.
export async function claimTarotLibraryDelivery({store,auth,orderId,flowId,now=new Date()}){
  const flow=tarotLibraryFlow(flowId);
  return store.transaction(async tx=>{
    await tx.assertIdentity(auth);
    const purchase=await tx.purchase(orderId),execution=await tx.execution(orderId);
    assertExistingPurchase(purchase,auth,{...purchase,flow},orderId);
    assertExistingExecution(execution,auth,{...purchase,flow},orderId);
    if(purchase.tarotFlowId!==flow.id)throw new TossError('RESULT_NOT_FOUND',404);
    if(execution.status==='completed')return {state:'completed',execution};
    if(!execution.input)return {state:'input_required',execution};
    const claimed=await tx.claimExecution(orderId,{token:crypto.randomUUID(),now,until:new Date(now.getTime()+TAROT_DELIVERY_LEASE_MS)});
    return claimed?{state:'claimed',execution:claimed}:{state:'in_progress',execution:await tx.execution(orderId)};
  });
}

export async function completeTarotLibraryDelivery({store,auth,orderId,flowId,result,token}){
  const flow=tarotLibraryFlow(flowId);
  return store.transaction(async tx=>{
    await tx.assertIdentity(auth);
    const purchase=await tx.purchase(orderId),execution=await tx.execution(orderId);
    assertExistingPurchase(purchase,auth,{...purchase,flow},orderId);
    assertExistingExecution(execution,auth,{...purchase,flow},orderId);
    if(purchase.tarotFlowId!==flow.id)throw new TossError('RESULT_NOT_FOUND',404);
    if(execution.status==='completed')return tarotLibraryResult(execution,flow);
    if(!token||execution.tossDeliveryToken!==token)throw new TossError('DELIVERY_NOT_CLAIMED',409);
    const completed=await tx.completeExecution(orderId,result,token);
    if(!completed)throw new TossError('DELIVERY_NOT_CLAIMED',409);
    return tarotLibraryResult(completed,flow);
  });
}

export async function failTarotLibraryDelivery({store,auth,orderId,flowId,error,token}){
  const flow=tarotLibraryFlow(flowId);
  return store.transaction(async tx=>{
    await tx.assertIdentity(auth);
    const purchase=await tx.purchase(orderId),execution=await tx.execution(orderId);
    assertExistingPurchase(purchase,auth,{...purchase,flow},orderId);
    assertExistingExecution(execution,auth,{...purchase,flow},orderId);
    if(purchase.tarotFlowId!==flow.id)throw new TossError('RESULT_NOT_FOUND',404);
    if(execution.status==='completed')return tarotLibraryResult(execution,flow);
    if(!token||execution.tossDeliveryToken!==token)throw new TossError('DELIVERY_NOT_CLAIMED',409);
    const failed=await tx.failExecution(orderId,{code:text(error?.code)||'TAROT_LIBRARY_GENERATION_FAILED'},token);
    if(!failed)throw new TossError('DELIVERY_NOT_CLAIMED',409);
    return tarotLibraryResult(failed,flow);
  });
}

export function tarotLibraryResult(execution,flow){
  if(!execution)throw new TossError('RESULT_NOT_FOUND',404);
  if(['refunded','cancelled'].includes(execution.status))throw new TossError('ORDER_REFUNDED',409);
  return {requestId:execution.requestId,resultId:execution.resultId,flowId:flow.id,featureKey:flow.featureKeys.includes(execution.featureId)?execution.featureId:null,
    state:execution.status==='paid_pending_generation'&&!execution.input?'input_required':execution.status,result:execution.status==='completed'?execution.result:null,
    canRetryNow:Boolean(execution.input)&&(['paid_pending_generation','generation_failed'].includes(execution.status)||execution.status==='generating'&&!!execution.tossDeliveryLeaseUntil&&new Date(execution.tossDeliveryLeaseUntil).getTime()<=Date.now())};
}
