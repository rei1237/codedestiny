/** @jest-environment node */
import { preparePaypalCharge, paypalChargeForOrder, paypalCancellationAmounts } from '../../worker/payments/paypal.js';
import { verifyPgPayment } from '../../worker/payments/pg.js';
import { createOrder } from '../../worker/payments/orders.js';
import { createPassOrder, resolvePassPlan } from '../../worker/payments/passes.js';
import { makeFakePaymentDb } from '../fixtures/fake-payment-db.mjs';
import { getPortOnePublicConfig } from '../../worker/lib/portone.js';
import { CURRENT_PASS_POLICY_VERSION } from '../../lib/payment/pass-policy.js';
import { assertRegionalPaymentMethod, paymentRegion } from '../../worker/payments/region-policy.js';
import { __paymentsContextTestUtils } from '../../worker/payments/index.js';

const env = { PAYPAL_ENABLED: '1', PORTONE_PAYPAL_CHANNEL_KEY: 'paypal-test', PORTONE_CHANNEL_KEY: 'domestic-test',
  PORTONE_STORE_ID: 'store-test', PORTONE_API_SECRET: 'secret-test', PORTONE_WEBHOOK_SECRET: 'webhook-test' };
const now = Date.parse('2026-10-03T04:00:00Z');
const fx = async () => ({ ok: true, json: async () => ({ base: 'KRW', quote: 'USD', date: '2026-10-02', rate: 0.00074 }) });
const product = { productId: 'test', featureKey: 'test', billingType: 'per-use', priceKRW: 9900, priceCoins: 99 };
const uid = '507f1f77bcf86cd799439011';
const quote = { currency: 'USD', totalAmount: 733, priceKRW: 9900, rate: 0.00074, rateDate: '2026-10-02', quotedAt: new Date(now).toISOString(), source: 'Frankfurter/ECB' };

test('region policy uses trusted IP metadata and guards both one-time and pass order entry points', async () => {
  const request = new Request('https://example.test/api/payments/prepare', { headers: { 'CF-IPCountry': 'KR' } });
  Object.defineProperty(request, 'cf', { value: { country: 'JP' } });
  expect(paymentRegion(request)).toEqual({ country: 'JP', paypalOnly: true });
  expect(() => assertRegionalPaymentMethod(request, 'paypal')).not.toThrow();
  for (const method of ['card_general','kakaopay','trans','gift_culture']) expect(() => assertRegionalPaymentMethod(request, method)).toThrow();
  const { ROUTES } = __paymentsContextTestUtils;
  const noDb = () => { throw Error('No DB operation is allowed'); };
  const args = { request, env, ctx: {}, userId: uid, withDb: noDb };
  const { listProducts } = await import('../../worker/payments/catalog.js');
  const listed = listProducts().find(item => item.priceKRW > 0);
  await expect(ROUTES['POST /orders'].handle({ ...args, body: { productId: listed.productId, paymentMethod: 'card_general' } })).rejects.toMatchObject({ code: 'PAYPAL_REQUIRED_FOR_REGION' });
  const passBody = { tier: 'standard', durationMonths: 1, paymentMethod: 'card_general', passPolicyVersion: CURRENT_PASS_POLICY_VERSION };
  await expect(ROUTES['POST /subscription/prepare'].handle({ ...args, body: passBody })).rejects.toMatchObject({ code: 'PAYPAL_REQUIRED_FOR_REGION' });
});

test('USD cents are rounded server-side; domestic methods never request FX', async () => {
  expect(await preparePaypalCharge(env, 'paypal', 9900, { fetchImpl: fx, now })).toEqual(quote);
  expect(await preparePaypalCharge(env, 'card_general', 9900, { fetchImpl: () => { throw Error('unexpected network'); } })).toBeNull();
});
test('flag, channel and webhook are mandatory; unavailable/stale FX never falls back to KRW', async () => {
  for (const override of [{ PAYPAL_ENABLED: '0' }, { PORTONE_PAYPAL_CHANNEL_KEY: '' }, { PORTONE_WEBHOOK_SECRET: '' }]) {
    const input = { ...env, ...override };
    expect(getPortOnePublicConfig(input).paypalChannelKey).toBe('');
    await expect(preparePaypalCharge(input, 'paypal', 9900, { fetchImpl: fx, now })).rejects.toMatchObject({ code: 'PAYPAL_NOT_CONFIGURED' });
  }
  for (const badFetch of [async () => ({ ok: false }), async () => { throw Error('offline'); }, async () => ({ ok: true, json: async () => ({ base: 'KRW', quote: 'USD', date: '2026-09-01', rate: 0.00074 }) })]) {
    await expect(preparePaypalCharge(env, 'paypal', 9900, { fetchImpl: badFetch, now })).rejects.toMatchObject({ code: 'PAYPAL_FX_UNAVAILABLE' });
  }
});
test('first quote wins an idempotent retry; changing the pending currency rail is rejected', async () => {
  const db = makeFakePaymentDb();
  const input = { userId: uid, product, idempotencyKey: 'paypal-idem', paymentMethod: 'paypal', paypalCharge: quote };
  const first = await createOrder(db, input);
  const replay = await createOrder(db, { ...input, paypalCharge: { ...quote, totalAmount: 800 } });
  expect(replay.merchantUid).toBe(first.merchantUid);
  expect(paypalChargeForOrder(replay)).toEqual(quote);
  expect(replay.paymentAmount).toBe(9900);
  await expect(createOrder(db, { ...input, paymentMethod: 'card_general', paypalCharge: null })).rejects.toMatchObject({ code: 'PAYPAL_ORDER_CONFLICT' });
  expect(() => paypalChargeForOrder({ paymentMethod: 'paypal', paymentAmount: 9900 })).toThrow();
});
test('passes preserve KRW pricing and the first USD quote', async () => {
  const db = makeFakePaymentDb(), plan = resolvePassPlan('standard', 1, CURRENT_PASS_POLICY_VERSION);
  const charge = { ...quote, priceKRW: plan.wonPrice, totalAmount: Math.round(plan.wonPrice * quote.rate * 100) };
  const input = { userId: uid, plan, idempotencyKey: 'pass-paypal', paymentMethod: 'paypal', paypalCharge: charge };
  const order = await createPassOrder(db, input);
  expect(order.paymentAmount).toBe(plan.wonPrice);
  expect(paypalChargeForOrder(await createPassOrder(db, { ...input, paypalCharge: { ...charge, totalAmount: 9999 } }))).toEqual(charge);
});
const paid = { paymentId: 'paypal-order', status: 'paid', amount: 733, currency: 'USD', storeId: 'store-test', rawV2: { channel: { key: 'paypal-test' } } };
test('USD verification strictly checks cents, currency, store and the exact PayPal channel', async () => {
  const input = { orderId: 'paypal-order', expectedAmountKRW: 9900, paypalCharge: quote };
  await expect(verifyPgPayment(env, input, { fetchPayment: async () => paid })).resolves.toMatchObject({ pgTransactionId: 'paypal-order' });
  for (const [override, code] of [[{ amount: 9900 }, 'AMOUNT_MISMATCH'], [{ currency: 'KRW' }, 'CURRENCY_MISMATCH'], [{ storeId: '' }, 'STORE_ID_MISMATCH'], [{ rawV2: { channel: { key: 'domestic-test' } } }, 'CHANNEL_MISMATCH'], [{ rawV2: {} }, 'CHANNEL_MISMATCH'], [{ status: 'pending' }, 'PG_PAYMENT_NOT_PAID']]) {
    await expect(verifyPgPayment(env, input, { fetchPayment: async () => ({ ...paid, ...override }) })).rejects.toMatchObject({ code });
  }
  await expect(verifyPgPayment(env, { ...input, paypalCharge: null }, { fetchPayment: async () => ({ ...paid, amount: 9900 }) })).rejects.toMatchObject({ code: 'CURRENCY_MISMATCH' });
});
test('refund API uses original USD cents, never current FX or KRW numbers', () => {
  const order = { paymentAmount: 9900, paymentMethod: 'paypal', metadata: { paypalCharge: quote } };
  expect(paypalCancellationAmounts(order, { amount: 9900, checksum: 9900 })).toEqual({ amount: 733, checksum: 733 });
  expect(paypalCancellationAmounts(order, { amount: 4950 })).toEqual({ amount: 367 });
  expect(paypalCancellationAmounts(order, {})).toEqual({});
  expect(() => paypalCancellationAmounts(order, { amount: 1 })).toThrow();
  expect(paypalCancellationAmounts({ paymentAmount: 9900 }, { amount: 4950 })).toEqual({ amount: 4950 });
});
