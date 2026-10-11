/** @jest-environment node */
import {getBillingFeaturePricing,assertFeatureEnabled} from '../../worker/lib/billing-feature-registry.js';
import {resolveLegacyProduct} from '../../worker/payments/legacy-pricing.js';
import {createOrder} from '../../worker/payments/orders.js';
import {getPaidFeatureBillingType} from '../../worker/lib/paid-feature-registry.js';
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';

const userId='507f1f77bcf86cd799439011';
const product={featureKey:'flower-fc',priceKRW:5000,priceCoins:50,monthlyCost:500};
test('flower pricing resolves and new purchases are enabled',()=>{
 expect(getBillingFeaturePricing({featureKey:'flower-fc'}).pricing.amountKRW).toBe(5000);
 expect(assertFeatureEnabled(product)).toMatchObject({ok:true});
 expect(resolveLegacyProduct({featureKey:'openDestinyFlowerStudio'})).toMatchObject({featureKey:'flower-fc',priceKRW:5000,priceCoins:50});
 expect(assertFeatureEnabled({featureKey:'olympus-fc'}).ok).toBe(true);
});
test('new flower orders use the restored 5,000 won snapshot',async()=>{
 const db=makeFakePaymentDb();
 const order=await createOrder(db,{userId,product,idempotencyKey:'flower-new'});
 expect(order).toMatchObject({paymentAmount:5000,expectedChargedPoints:50,status:'pending'});
 expect(order.pricingSnapshot).toMatchObject({priceKRW:5000,priceCoins:50});
});
test('bias destiny is a 5,000 won per-use product',()=>{
 const pricing=getBillingFeaturePricing({featureKey:'destiny-bias-analyze'}).pricing;
 expect(pricing).toMatchObject({featureKey:'destiny-bias-analyze',cost:50,amountKRW:5000});
 expect(getPaidFeatureBillingType('destiny-bias-analyze')).toBe('per_use');
 expect(assertFeatureEnabled(pricing)).toMatchObject({ok:true});
});
