import { __paymentsContextTestUtils } from '../../worker/payments/index.js';
import { resolveProduct } from '../../worker/payments/catalog.js';
import { createOrder } from '../../worker/payments/orders.js';
import { classify } from '../../worker/payments/errors.js';
import { makeFakePaymentDb } from '../fixtures/fake-payment-db.mjs';
import { createNeoRepository } from '../../worker/neo-consultation/repository.js';
import { acceptNeoConfirmedPayment, resolveNeoOrderProduct } from '../../worker/neo-consultation/payment.js';
import { buildReceiptEmail } from '../../worker/payments/receipt-email.js';
import { NEO_EMAIL_FEATURE } from '../../lib/neo-consultation/contract.js';

const userId = '507f1f77bcf86cd799439011';
test('직접 orders/prepare 우회도 DB·PG 호출 전에 판매 차단한다', async () => {
  for (const route of ['POST /orders','POST /prepare']) {
    let dbCalls = 0;
    await expect(__paymentsContextTestUtils.ROUTES[route].handle({
      request: new Request('https://example.invalid/api/payments/prepare',{method:'POST'}),
      env: {}, ctx: {}, userId, body: {featureKey:NEO_EMAIL_FEATURE,quantity:2,amount:1,paymentMethod:'paypal'},
      withDb: async () => { dbCalls++; throw new Error('MUST_NOT_TOUCH_DB'); },
    })).rejects.toMatchObject({code:'PRODUCT_SALE_DISABLED'});
    expect(dbCalls).toBe(0);
  }
});
test('createOrder 최종 가드도 차단하며 오류는 비재시도 409', async () => {
  const db = makeFakePaymentDb();
  const product = resolveProduct({featureKey:NEO_EMAIL_FEATURE});
  try { await createOrder(db,{userId,product,idempotencyKey:'x'}); throw new Error('expected blocked'); }
  catch (error) { expect(error.code).toBe('PRODUCT_SALE_DISABLED'); expect(classify(error).status).toBe(409); }
  expect(db.rows).toHaveLength(0);
});
test('서버 저장 견적 가격과 검증 완료 결제가 상담 접수에 연결된다', async () => {
  const db = makeFakePaymentDb(), repository = createNeoRepository(db);
  const questions = [{id:'q1',text:'직장에서 고려할 점'},{id:'q2',text:'관계에서 고려할 점'}];
  const row = {id:'neo-order-test',userId,version:1,state:'draft',email:'x@example.invalid',questions,deliveries:[],mailJobs:[],
    quote:{id:'quote-test',unitKRW:10000,quantity:2,totalKRW:20000,questions},payment:null};
  await repository.insert(row);
  const product = await resolveNeoOrderProduct(db,resolveProduct({featureKey:NEO_EMAIL_FEATURE}),userId,row.id,'quote-test');
  expect(product.priceKRW).toBe(20000);
  expect(product.consultationSnapshot.quantity).toBe(2);
  await repository.compareAndSwap(row.id,1,{...row,version:2,state:'pending',payment:{id:'payment-test',status:'pending'}});
  const payment = {merchantUid:'payment-test',userId,featureKey:NEO_EMAIL_FEATURE,requestId:row.id,status:'paid',paymentAmount:20000,pricingSnapshot:{consultation:product.consultationSnapshot}};
  await acceptNeoConfirmedPayment(db,payment);
  await acceptNeoConfirmedPayment(db,payment);
  const stored = await repository.get(row.id);
  expect(stored.state).toBe('received'); expect(stored.mailJobs).toHaveLength(1);
  expect(stored.mailJobs[0].state).toBe('pending');
});
test('신규 상품만 비동기 제공 영수증을 사용한다', () => {
  expect(buildReceiptEmail({featureKey:NEO_EMAIL_FEATURE}).html).toContain('네오 직접 검수 후 이메일 답변');
  expect(buildReceiptEmail({featureKey:'neo-operation-room-consultation'}).html).toContain('결제 승인 직후');
});
