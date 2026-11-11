/** @jest-environment node */
import {getBillingFeaturePricing,assertFeatureEnabled} from '../../worker/lib/billing-feature-registry.js';
import {resolveLegacyProduct} from '../../worker/payments/legacy-pricing.js';
import {createOrder,findOrder,assertOrderOwner,markOrderPaid,claimRefund,settleRefund} from '../../worker/payments/orders.js';
import {getPaidFeatureBillingType} from '../../worker/lib/paid-feature-registry.js';
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';

const userId='507f1f77bcf86cd799439011';
const product={featureKey:'flower-fc',priceKRW:5000,priceCoins:50,monthlyCost:500};
test('historical flower pricing and legacy aliases remain resolvable',()=>{
 expect(getBillingFeaturePricing({featureKey:'flower-fc'}).pricing.amountKRW).toBe(5000);
 expect(assertFeatureEnabled(product)).toMatchObject({ok:true});
 expect(resolveLegacyProduct({featureKey:'openDestinyFlowerStudio'})).toMatchObject({featureKey:'flower-fc',priceKRW:5000,priceCoins:50});
 expect(assertFeatureEnabled({featureKey:'olympus-fc'}).ok).toBe(true);
});
test.each(['flower-fc','olympus-fc','destiny-bias-analyze'])('%s rejects new orders before any database operation',async featureKey=>{
 const db=makeFakePaymentDb();
 await expect(createOrder(db,{userId,product:{...product,featureKey},idempotencyKey:'free-new'})).rejects.toMatchObject({code:'FEATURE_NOW_FREE'});
 expect(db.ctx.ops).toBe(0);
 expect(db.rows).toEqual([]);
});

test('historical flower snapshot retains owner, confirmation and refund rights',async()=>{
 const db=makeFakePaymentDb();
 // Seed an order created before free access; do not reopen current sales.
 const snapshot={priceKRW:5000,priceCoins:50,featureKey:'flower-fc'};
 const old={merchantUid:'historical-flower-order',userId,featureKey:'flower-fc',status:'pending',paymentAmount:5000,expectedChargedPoints:50,pricingSnapshot:{...snapshot}};
 db.rows.push(old);
 const found=await findOrder(db,{orderId:old.merchantUid});
 expect(assertOrderOwner(found,userId)).toBe(found);
 expect(()=>assertOrderOwner(found,'507f1f77bcf86cd799439012')).toThrow(expect.objectContaining({code:'ORDER_FORBIDDEN'}));
 const pg={pgTransactionId:'historical-flower-tx',method:'card',summary:{amount:5000,currency:'KRW'}};
 expect(await markOrderPaid(db,{orderId:old.merchantUid,order:found,pg})).toMatchObject({status:'paid',paymentAmount:5000,chargedPoints:50,pricingSnapshot:snapshot});
 expect(await markOrderPaid(db,{orderId:old.merchantUid,order:found,pg})).toBeNull();
 expect(await claimRefund(db,{orderId:old.merchantUid})).not.toBeNull();
 expect(await settleRefund(db,{orderId:old.merchantUid})).toBe(true);
 expect(await findOrder(db,{orderId:old.merchantUid})).toMatchObject({status:'refunded',paymentAmount:5000,pricingSnapshot:snapshot});
 expect(await markOrderPaid(db,{orderId:old.merchantUid,order:found,pg})).toBeNull();
});
test('historical bias destiny pricing remains 5,000 won per use',()=>{
 const pricing=getBillingFeaturePricing({featureKey:'destiny-bias-analyze'}).pricing;
 expect(pricing).toMatchObject({featureKey:'destiny-bias-analyze',cost:50,amountKRW:5000});
 expect(getPaidFeatureBillingType('destiny-bias-analyze')).toBe('per_use');
 expect(assertFeatureEnabled(pricing)).toMatchObject({ok:true});
});
