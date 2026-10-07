/** @jest-environment node */
import {jest} from '@jest/globals';
import {getBillingFeaturePricing,assertFeatureEnabled} from '../../worker/lib/billing-feature-registry.js';
import {resolveLegacyProduct} from '../../worker/payments/legacy-pricing.js';
import {createOrder} from '../../worker/payments/orders.js';
import {spendMoonstone} from '../../worker/payments/moonstone.js';

const userId='507f1f77bcf86cd799439011';
const product={featureKey:'flower-fc',priceKRW:1000,priceCoins:10,monthlyCost:10};
test('historical flower pricing still resolves, while new purchases are disabled',()=>{
 expect(getBillingFeaturePricing({featureKey:'flower-fc'}).pricing.amountKRW).toBe(1000);
 expect(assertFeatureEnabled(product)).toMatchObject({ok:false,code:'FEATURE_NOW_FREE'});
 expect(()=>resolveLegacyProduct({featureKey:'openDestinyFlowerStudio'})).toThrow();
 expect(assertFeatureEnabled({featureKey:'olympus-fc'}).ok).toBe(true);
});
test('new flower orders and moonstone spends stop before writing or consuming',async()=>{
 const db={findOneAndUpdate:jest.fn(),insertOne:jest.fn()},consumeLots=jest.fn();
 await expect(createOrder(db,{userId,product,idempotencyKey:'flower-new'})).rejects.toMatchObject({code:'FEATURE_NOW_FREE'});
 await expect(spendMoonstone(db,{userId,product,purchaseId:'flower-new'},{consumeLots})).rejects.toMatchObject({code:'FEATURE_NOW_FREE'});
 expect(db.findOneAndUpdate).not.toHaveBeenCalled();expect(db.insertOne).not.toHaveBeenCalled();expect(consumeLots).not.toHaveBeenCalled();
});
