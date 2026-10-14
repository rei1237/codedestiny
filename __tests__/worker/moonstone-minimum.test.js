/** @jest-environment node */
import {FEATURE_KEY_PRICE_TABLE, getPaidFeaturePaymentPolicy, meetsMoonstoneMinimum, quoteYeongnyangiMoonstoneDiscount} from '../../worker/lib/paid-feature-registry.js';
import {spendMoonstone} from '../../worker/payments/moonstone.js';
import {resolveProduct} from '../../worker/payments/catalog.js';
import {makeFakePaymentDb} from '../fixtures/fake-payment-db.mjs';

test.each([[5000,false],[9900,false],[10000,true],[10001,true]])('minimum boundary %i', (price, allowed) => {
  expect(meetsMoonstoneMinimum(price)).toBe(allowed);
});
test('every subminimum catalog item excludes full moonstone payment', () => {
  for (const [key, spec] of Object.entries(FEATURE_KEY_PRICE_TABLE)) {
    if (spec.amountKRW >= 10000) continue;
    expect(getPaidFeaturePaymentPolicy(key).monthlyExcluded).toBe(true);
    expect(getPaidFeaturePaymentPolicy(key).allowedPaymentMethods).not.toContain('MOONLIGHT_STONE');
    if (key.startsWith('yeongnyangi-')) expect(() => quoteYeongnyangiMoonstoneDiscount(key, 1)).toThrow();
  }
});
test('a forged price cannot reach debit or create proof for a cheap product', async () => {
  const db = makeFakePaymentDb();
  const product = resolveProduct({featureKey:'yeongnyangi-saju-mackerel'});
  let debits = 0;
  await expect(spendMoonstone(db, {userId:'507f1f77bcf86cd799439011', product:{...product,priceKRW:10000}, purchaseId:'blocked'},
    {consumeLots:async()=>{debits++;return {ok:true};}})).rejects.toMatchObject({code:'MONTHLY_NOT_ALLOWED'});
  expect(debits).toBe(0);
  expect(db.rows).toHaveLength(0);
});
