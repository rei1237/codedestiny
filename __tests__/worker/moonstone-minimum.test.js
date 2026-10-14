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

test.each(['/coin-gate/moonstone','/moonstone/spend','/prepare'])('direct API %s rejects cheap moonstone use without writes or provider calls', async path => {
  const {handlePaymentsContext}=await import('../../worker/payments/index.js');
  const {signAuthToken}=await import('../../worker/lib/auth.js');
  const env={JWT_ACCESS_SECRET:'fixture-secret-not-real-0123456789'};
  const token=await signAuthToken({_id:'507f1f77bcf86cd799439011',email:'test@example.invalid',role:'user'},env);
  const product=resolveProduct({featureKey:'yeongnyangi-saju-mackerel'});
  const db=makeFakePaymentDb();
  const originalFetch=globalThis.fetch;
  let providerCalls=0;
  globalThis.fetch=async()=>{providerCalls++;throw Error('Provider calls forbidden');};
  try {
    const request=new Request('https://example.invalid/api/payments'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({featureKey:product.featureKey,productId:product.productId,requestId:'blocked-api',idempotencyKey:'blocked-api',paymentMode:'MOONLIGHT_STONE',moonstoneQuantity:100,amountKRW:10000})});
    const response=await handlePaymentsContext(request,env,{prefix:'/api/payments',withDb:(_e,_c,fn)=>fn(db)});
    expect([400,402]).toContain(response.status);
    const payload=await response.json();
    expect(payload.code || payload.error?.code).toBe(path==='/prepare'?'INVALID_REQUEST':path==='/moonstone/spend'?'MONTHLY_NOT_ALLOWED':'FAMILY_OR_DIRECT_PAYMENT_REQUIRED');
    expect(db.rows).toHaveLength(0);
    expect(providerCalls).toBe(0);
  } finally {globalThis.fetch=originalFetch;}
});


test('a completed cheap purchase remains replayable without another debit', async () => {
  const db=makeFakePaymentDb(),product=resolveProduct({featureKey:'yeongnyangi-saju-mackerel'});
  db.rows.push({_id:'507f1f77bcf86cd799439022',userId:'507f1f77bcf86cd799439011',type:'MONTHLY_CREDIT_SPEND',sourceId:'legacy-paid',serviceKey:product.featureKey,amount:product.monthlyCost,profileId:'',settledAt:new Date(),afterBalance:700});
  let debits=0;
  const result=await spendMoonstone(db,{userId:'507f1f77bcf86cd799439011',product,purchaseId:'legacy-paid'},{consumeLots:async()=>{debits++;}});
  expect(result).toMatchObject({replayed:true,balance:700});expect(debits).toBe(0);expect(db.rows).toHaveLength(1);
});

test('the 10000 KRW consultation supports both full and partial moonstone payment', () => {
  const product=resolveProduct({featureKey:'yeongnyangi-saju-salmon'});
  expect(product.priceKRW).toBe(10000);expect(product.monthlyExcluded).toBe(false);
  expect(product.allowedPaymentMethods).toContain('MOONLIGHT_STONE');
  expect(quoteYeongnyangiMoonstoneDiscount(product.featureKey,100)).toMatchObject({discountKRW:1000,payableKRW:9000});
  expect(quoteYeongnyangiMoonstoneDiscount(product.featureKey,500)).toMatchObject({discountKRW:5000,payableKRW:5000});
});
