import {checkOrder,TossError} from './policy.js';

export function nativeProduct(item,contract){
  if(!item||item.approved!==true||!['tea','neo','fusion','life-book'].includes(item.nativeService)||typeof item.sku!=='string'||!item.sku
    ||!(item.nativeService==='tea'?/^fortune-tea-house-/.test(item.featureKey):item.nativeService==='neo'?item.featureKey==='neo-operation-room-consultation':item.nativeService==='life-book'?['life-book-ai-consultation','life-fortune-ai-consultation'].includes(item.featureKey):item.featureKey==='fusion-fortune-consultation')
    ||item.featureKey!==contract.featureKey||item.productId!==`native:${item.nativeService}:${contract.featureKey}`
    ||!Number.isSafeInteger(item.approvedPriceKRW)||item.approvedPriceKRW<=0
    ||item.approvedPriceKRW!==contract.pricing.amountKRW||!item.priceEvidence)
    throw new TossError('TOSS_PRODUCT_NOT_APPROVED',503);
  return item;
}

// Previously granted purchases retain their original SKU and price evidence.
// Catalogue removal affects new sales, never an existing owner's recovery.
export function retainedNativeProduct(purchase,auth){
  if(!purchase||purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment)
    throw new TossError('RESULT_NOT_FOUND',404);
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  return nativeProduct({...purchase,approved:true},{featureKey:purchase.featureKey,pricing:{amountKRW:purchase.approvedPriceKRW}});
}

export function assertNativeIntent(intent,auth,contract){
  if(!intent||intent.identityId!==auth._id||String(intent.ownerId)!==String(auth.ownerId)||intent.environment!==auth.environment)
    throw new TossError('RESULT_NOT_FOUND',404);
  if(contract&&(intent.requestId!==contract.requestId||intent.resultId!==contract.resultId||intent.featureKey!==contract.featureKey||intent.inputHash!==contract.inputHash))
    throw new TossError('REQUEST_INPUT_MISMATCH',409);
  if(intent.status==='refunded')throw new TossError('ORDER_REFUNDED',409);
  return intent;
}

// Grant acknowledgement contains no generated result. The order and immutable
// original input are committed together, before the SDK may acknowledge it.
export async function grantNativeOrder({store,auth,order,product,requestId=null}){
  checkOrder(order,{orderId:order.orderId,sku:product.sku});
  return store.transaction(async tx=>{
    await tx.assertIdentity(auth);
    let purchase=await tx.purchase(order.orderId);
    if(purchase){
      if(purchase.identityId!==auth._id||String(purchase.ownerId)!==String(auth.ownerId)||purchase.environment!==auth.environment||purchase.sku!==product.sku
        ||purchase.nativeService!==product.nativeService||purchase.featureKey!==product.featureKey)
        throw new TossError('ORDER_OWNERSHIP_MISMATCH',403);
      if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
      if(purchase.requestId&&requestId&&purchase.requestId!==requestId)throw new TossError('ORDER_ALREADY_ASSIGNED',409);
    }else{
      purchase={_id:order.orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,
        sku:product.sku,productId:product.productId,serviceId:product.nativeService==='neo'?'neo':'yeoni',nativeService:product.nativeService,featureKey:product.featureKey,
        approvedPriceKRW:product.approvedPriceKRW,priceEvidence:product.priceEvidence,
        status:order.status,requestId:null,verifiedAt:new Date(),grantedAt:new Date()};
      await tx.insertPurchase(purchase);
    }
    if(requestId&&!purchase.requestId){
      const intent=assertNativeIntent(await tx.nativeIntent(requestId,auth.ownerId),auth);
      if(intent.nativeService!==product.nativeService||intent.sku!==product.sku||intent.featureKey!==product.featureKey
        ||intent.approvedPriceKRW!==product.approvedPriceKRW)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
      if(intent.orderId||intent.status!=='prepared')throw new TossError('REQUEST_ALREADY_FUNDED',409);
      await tx.fundNativeIntent(requestId,auth.ownerId,order.orderId);
      await tx.assignPurchase(order.orderId,requestId);
      purchase={...purchase,requestId};
    }
    if(purchase.requestId){
      const intent=assertNativeIntent(await tx.nativeIntent(purchase.requestId,auth.ownerId),auth);
      if(intent.status!=='paid'||intent.orderId!==purchase._id||intent.sku!==purchase.sku||intent.featureKey!==purchase.featureKey||intent.nativeService!==purchase.nativeService)
        throw new TossError('GRANT_NOT_DURABLE',409);
    }
    return {orderId:order.orderId,requestId:purchase.requestId,entitlement:'granted',durable:true};
  });
}
