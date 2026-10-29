import {checkOrder,TossError} from './policy.js';
import {consultationService,requestMatchesService} from './services.js';

/**
 * The caller supplies ONLY a server-authenticated identity and an mTLS order response.
 * A transaction persists the paid consultation right before any SDK grant acknowledgement.
 * A missing callback can restore an unassigned right; restoration never picks a different
 * user's draft or guesses the most recent question. The buyer explicitly attaches a draft.
 */
export async function grantVerifiedOrder({store,auth,order,product,requestId=null,enqueue}) {
  checkOrder(order,{orderId:order.orderId,sku:product.sku});
  const service=consultationService(product);
  const receipt=await store.transaction(async tx=>{
    await tx.assertIdentity(auth);
    let purchase=await tx.purchase(order.orderId);
    if(purchase) {
      if(purchase.identityId!==auth._id || purchase.sku!==product.sku || purchase.environment!==auth.environment) throw new TossError('ORDER_OWNERSHIP_MISMATCH',403);
      if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
      if((purchase.serviceId||'yeongnyangi')!==service.id||purchase.productId!==product.productId)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
      if(purchase.requestId&&requestId&&purchase.requestId!==requestId)throw new TossError('ORDER_ALREADY_ASSIGNED',409);
    } else {
      purchase={_id:order.orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,
        sku:product.sku,productId:product.productId,serviceId:service.id,approvedPriceKRW:product.approvedPriceKRW,priceEvidence:product.priceEvidence,
        status:order.status,requestId:null,verifiedAt:new Date(),grantedAt:new Date()};
      await tx.insertPurchase(purchase);
    }
    if(requestId&&!purchase.requestId) {
      const request=await tx.request(requestId,auth.ownerId);
      if(!requestMatchesService(request,product))throw new TossError('REQUEST_NOT_FOUND',404);
      if(request.state!=='CREATED'||request.accessMethod||request.paymentId)throw new TossError('REQUEST_ALREADY_FUNDED',409);
      if(request.amountKRW!==product.approvedPriceKRW)throw new TossError('PRODUCT_PRICE_CHANGED',409);
      await tx.attachRequest(requestId,auth.ownerId,order.orderId);
      await tx.assignPurchase(order.orderId,requestId);
      purchase={...purchase,requestId};
    }
    return {orderId:order.orderId,requestId:purchase.requestId,entitlement:'granted',durable:true};
  });
  // The purchase and PAID request are the durable outbox; queue publication may be retried.
  if(receipt.requestId) { try {await enqueue(receipt.requestId);} catch { /* scheduled repair reads the PAID row */ } }
  return receipt;
}
