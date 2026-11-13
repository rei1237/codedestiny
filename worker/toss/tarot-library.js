import {CRYSTAL_SOUL_GEMS} from '../../lib/tarot/crystal-soul-reading.mjs';
import {resolveOracleConsultationTier} from '../../lib/tarot/oracle-consultation-pricing.mjs';
import {selectDeckSlots} from '../../lib/tarot/committed-deck.mjs';
import {TOPIC_LABELS} from '../../lib/tarot/numerology-tarot.mjs';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
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

export function freeTarotReading(flowId,raw){
  const flow=tarotLibraryFlow(flowId);
  if(!flow.featureKeys.some(isFreeFortuneFeatureKey))throw new TossError('TAROT_LIBRARY_FLOW_INVALID');
  return generateTarotLibraryResult(flow.id,tarotInput(flow,raw));
}

export const tarotLibraryRequestId=orderId=>`toss-tarot:${orderId}`;
export const tarotLibraryExecutionId=orderId=>`toss-tarot-execution:${orderId}`;
export const tarotLibraryResultId=orderId=>`toss-tarot-result:${orderId}`;

function text(value){return typeof value==='string'?value.trim():'';}
function tarotInput(flow,input,featureKey){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  const question=text(input.question);
  if((flow.resultKind!=='celestial'&&question.length<2)||question.length>600)throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  if(['tarot-mindscan','tarot-love-relationship'].includes(flow.id)){
    try{return {question,picks:selectDeckSlots({picks:input.picks},flow.cardCount).picks};}
    catch{throw new TossError('TAROT_LIBRARY_INPUT_INVALID');}
  }
  const cards=Array.isArray(input.cards)?input.cards:[];
  if(flow.id==='tarot-prompt-maker'){
    const spreadTitle=text(input.spreadTitle),category=text(input.category);
    if(cards.length<1||cards.length>14||resolveOracleConsultationTier(cards.length).featureKey!==featureKey||!spreadTitle||spreadTitle.length>160||!category||category.length>60)throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
    const normalized=cards.map((card,index)=>{
      const source=getTarotCardByAnyId(card?.cardId),positionLabel=text(card?.positionLabel),positionDescription=text(card?.positionDescription);
      if(!source||!['upright','reversed'].includes(card.orientation)||!positionLabel||positionLabel.length>160||positionDescription.length>320)throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
      return {cardId:source.code,orientation:card.orientation,position:'slot_'+index,positionLabel,positionDescription};
    });
    if(new Set(normalized.map(card=>card.cardId)).size!==cards.length)throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
    return {question,spreadId:text(input.spreadId).slice(0,80),spreadTitle,category,cards:normalized};
  }
  if(cards.length!==flow.cardCount||new Set(cards.map(card=>text(card?.cardId))).size!==cards.length)throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  const normalized=cards.map((card,index)=>{
    const source=getTarotCardByAnyId(text(card?.cardId));
    if(!source||!['upright','reversed'].includes(card?.orientation)||text(card?.position)!==flow.positions[index][0])throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
    return {cardId:source.code,orientation:card.orientation,position:flow.positions[index][0],positionLabel:flow.positions[index][1]};
  });
  if(flow.resultKind==='celestial'){
    const golden=getTarotCardByAnyId(input.goldenCardId);
    if(!golden||!/^M\d{2}$/.test(golden.code)||normalized.some(card=>!/^M\d{2}$/.test(card.cardId))||new Set([...normalized.map(card=>card.cardId),golden.code]).size!==12)throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
    return {question,cards:normalized,goldenCardId:golden.code};
  }
  const birthDate=text(input.birthDate);
  if(flow.id==='tarot-numerology'&&!/^\d{4}-\d{2}-\d{2}$/.test(birthDate))throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  const topic=text(input.topic)||'general',name=text(input.name);
  if(flow.id==='tarot-numerology'&&(!Object.hasOwn(TOPIC_LABELS,topic)||name.length>60||normalized.some(card=>!/^M\d{2}$/.test(card.cardId))))throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  const gem=text(input.gem).replaceAll('-','_');
  if(flow.id==='tarot-crystal-soul'&&gem&&!Object.hasOwn(CRYSTAL_SOUL_GEMS,gem))throw new TossError('TAROT_LIBRARY_INPUT_INVALID');
  return {question,cards:normalized,...(birthDate?{birthDate}:{}),...(flow.id==='tarot-numerology'?{topic,name}:{}),...(gem?{gem}:{})};
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
      const prepared=input===undefined?null:tarotInput(product.flow,input,product.featureKey);
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
  const flow=tarotLibraryFlow(flowId);
  return store.transaction(async tx=>{
    await tx.assertIdentity(auth);
    const purchase=await tx.purchase(orderId),execution=await tx.execution(orderId);
    assertExistingPurchase(purchase,auth,{...purchase,flow},orderId);
    assertExistingExecution(execution,auth,{...purchase,flow},orderId);
    if(execution.input&&!needsCorrectedInput(execution,flow))return;
    const prepared=tarotInput(flow,input,purchase.featureKey);
    if(!['paid_pending_generation','generation_failed'].includes(execution.status)&&!(execution.status==='generating'&&new Date(execution.tossDeliveryLeaseUntil).getTime()<=Date.now()))throw new TossError('TAROT_LIBRARY_INPUT_LOCKED',409);
    if(!await tx.attachExecutionInput(orderId,prepared))throw new TossError('TAROT_LIBRARY_INPUT_LOCKED',409);
  });
}

export async function deliverTarotLibraryOrder({store,auth,orderId,flowId,env={},generate=generateTarotLibraryResult}){
  const claimed=await claimTarotLibraryDelivery({store,auth,orderId,flowId});
  if(claimed.state==='held'||claimed.state==='completed')return tarotLibraryResult(claimed.execution,tarotLibraryFlow(flowId));
  if(claimed.state==='input_required')return tarotLibraryResult(claimed.execution,tarotLibraryFlow(flowId));
  if(claimed.state!=='claimed')return {state:'generating',result:null,canRetryNow:false};
  const input=claimed.execution?.input;
  if(!input)throw new TossError('TAROT_LIBRARY_INPUT_MISSING',409);
  try{
    const execution=claimed.execution,token=execution.tossDeliveryToken;
    const authorized=task=>store.transaction(async tx=>{
      await tx.assertIdentity(auth);
      const purchase=await tx.purchase(orderId),current=await tx.execution(orderId),flow=tarotLibraryFlow(flowId);
      assertExistingPurchase(purchase,auth,{...purchase,flow},orderId);
      assertExistingExecution(current,auth,{...purchase,flow},orderId);
      if(current.status!=='generating'||current.tossDeliveryToken!==token)throw new TossError('DELIVERY_NOT_CLAIMED',409);
      return task?.(tx);
    });
    const result=await generate(flowId,input,{env,execution,owner:String(auth.ownerId),verify:()=>authorized(),checkpoint:state=>authorized(tx=>tx.saveTarotCheckpoint(orderId,token,state))});
    if(result.pending){
      const paused=await authorized(tx=>tx.pauseTarot(orderId,token,result.retryable));
      return tarotLibraryResult(paused,tarotLibraryFlow(flowId));
    }
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
    if(execution.error?.code==='DELIVERY_REVIEW_REQUIRED')return {state:'held',execution};
    if(!execution.input||needsCorrectedInput(execution,flow))return {state:'input_required',execution};
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

function needsCorrectedInput(execution,flow){
  if(!execution.input||!['paid_pending_generation','generation_failed','generating'].includes(execution.status))return false;
  if(['tarot-mindscan','tarot-love-relationship'].includes(flow.id))return !execution.input.picks;
  if(flow.resultKind==='celestial')return !execution.input.goldenCardId;
  return flow.id==='tarot-prompt-maker'&&!execution.input.spreadTitle;
}
export function tarotLibraryResult(execution,flow){
  if(!execution)throw new TossError('RESULT_NOT_FOUND',404);
  if(['refunded','cancelled'].includes(execution.status))throw new TossError('ORDER_REFUNDED',409);
  return {requestId:execution.requestId,resultId:execution.resultId,flowId:flow.id,featureKey:flow.featureKeys.includes(execution.featureId)?execution.featureId:null,
    state:(execution.status==='paid_pending_generation'&&!execution.input||needsCorrectedInput(execution,flow))?'input_required':execution.status,result:execution.status==='completed'?execution.result:null,
    canRetryNow:!needsCorrectedInput(execution,flow)&&execution.error?.code!=='DELIVERY_REVIEW_REQUIRED'&&Boolean(execution.input)&&(['paid_pending_generation','partial','generation_failed'].includes(execution.status)||execution.status==='generating'&&!!execution.tossDeliveryLeaseUntil&&new Date(execution.tossDeliveryLeaseUntil).getTime()<=Date.now())};
}
