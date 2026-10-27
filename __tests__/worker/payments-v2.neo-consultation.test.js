import { __paymentsContextTestUtils } from '../../worker/payments/index.js';
import { resolveProduct } from '../../worker/payments/catalog.js';
import { createOrder } from '../../worker/payments/orders.js';
import { reserveNeoCapacity } from '../../worker/neo-consultation/capacity.js';
import { makeFakePaymentDb } from '../fixtures/fake-payment-db.mjs';
import { createNeoRepository } from '../../worker/neo-consultation/repository.js';
import { acceptNeoConfirmedPayment, resolveNeoOrderProduct } from '../../worker/neo-consultation/payment.js';
import { buildReceiptEmail } from '../../worker/payments/receipt-email.js';
import { NEO_EMAIL_FEATURE, neoQuoteItems } from '../../lib/neo-consultation/contract.js';

const userId = '507f1f77bcf86cd799439011';
test('직접 orders/prepare 우회는 상담 준비 경로 밖에서 DB·PG 호출 전에 차단한다', async () => {
  for (const route of ['POST /orders','POST /prepare']) {
    let dbCalls = 0;
    await expect(__paymentsContextTestUtils.ROUTES[route].handle({
      request: new Request('https://example.invalid/api/payments/prepare',{method:'POST'}),
      env: {}, ctx: {}, userId, body: {featureKey:NEO_EMAIL_FEATURE,quantity:2,amount:1,paymentMethod:'paypal'},
      withDb: async () => { dbCalls++; throw new Error('MUST_NOT_TOUCH_DB'); },
    })).rejects.toMatchObject({code:'INVALID_REQUEST'});
    expect(dbCalls).toBe(0);
  }
});
test('createOrder 최종 가드도 상담 스냅샷 없는 결제를 차단한다', async () => {
  const db = makeFakePaymentDb();
  const product = resolveProduct({featureKey:NEO_EMAIL_FEATURE});
  await expect(createOrder(db,{userId,product,idempotencyKey:'x'})).rejects.toMatchObject({code:'INVALID_REQUEST'});
  expect(db.rows).toHaveLength(0);
});
test('서버 저장 견적 가격과 검증 완료 결제가 상담 접수에 연결된다', async () => {
  const db = makeFakePaymentDb(), repository = createNeoRepository(db);
  const questions = [{id:'q1',text:'직장에서 고려할 점'},{id:'q2',text:'관계에서 고려할 점'}];
  const row = {id:'neo-order-test',userId,version:1,state:'preparing',capacityDay:'2026-10-16',email:'x@example.invalid',questions,deliveries:[],mailJobs:[],
    quote:{id:'quote-test',unitKRW:10000,quantity:2,totalKRW:20000,questions},payment:null};
  await repository.insert(row);
  const product = await resolveNeoOrderProduct(db,resolveProduct({featureKey:NEO_EMAIL_FEATURE}),userId,row.id,'quote-test');
  expect(product.priceKRW).toBe(20000);
  expect(product.consultationSnapshot.quantity).toBe(2);
  const created=await createOrder(db,{userId,product,idempotencyKey:'quote-test',requestId:row.id});
  expect(created.paymentAmount).toBe(20000);
  expect(created.expectedChargedPoints).toBe(200);
  await repository.compareAndSwap(row.id,1,{...row,version:2,state:'pending',payment:{id:'payment-test',status:'pending'}});
  const payment = {merchantUid:'payment-test',userId,featureKey:NEO_EMAIL_FEATURE,requestId:row.id,status:'paid',paymentAmount:20000,pricingSnapshot:{consultation:product.consultationSnapshot}};
  await acceptNeoConfirmedPayment(db,payment);
  await acceptNeoConfirmedPayment(db,payment);
  const stored = await repository.get(row.id);
  expect(stored.state).toBe('received'); expect(stored.mailJobs).toHaveLength(1);
  expect(stored.mailJobs[0].state).toBe('pending');
});

test('동시 예약·중복 재시도에서도 하루 질문 30개를 넘기지 않는다',async()=>{
  const db=makeFakePaymentDb();
  const make=(id)=>({capacityDay:'2026-10-16',quote:{id,quantity:10}});
  const results=await Promise.allSettled(['a','b','c','d'].map(id=>reserveNeoCapacity(db,make(id))));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(3);
  await reserveNeoCapacity(db,make('a'));
  expect(db.rows.find(row=>row._id==='2026-10-16').used).toBe(30);
});
test('신규 상품만 비동기 제공 영수증을 사용한다', () => {
  expect(buildReceiptEmail({featureKey:NEO_EMAIL_FEATURE}).html).toContain('네오 직접 검수 후 이메일 답변');
  expect(buildReceiptEmail({featureKey:'neo-operation-room-consultation'}).html).toContain('결제 승인 직후');
});


test.each([
  ['v2 자미두수 혼합 3만원',2,[{id:'q1',text:'이직의 기준',readingMode:'ziwei'},{id:'q2',text:'관계의 기준',readingMode:'ziwei_saju'}],30000],
  ['v3 사주 기본 + 자미두수·원국명반 5만원',3,[{id:'q1',text:'이직의 기준',readingMode:'saju',chartReading:false},{id:'q2',text:'관계의 기준',readingMode:'saju_ziwei',chartReading:true}],50000],
])('%s을 실제 주문 스냅샷에 저장하고 승인 검증 뒤 한 번만 접수한다', async (_label,pricingVersion,questions,total) => {
  const db=makeFakePaymentDb(), repository=createNeoRepository(db);
  const items=neoQuoteItems(questions,pricingVersion);
  const row={id:'neo-mixed',userId,version:1,state:'preparing',capacityDay:'2026-10-17',email:'x@example.invalid',consent:true,
    birth:{date:'1990-04-20',calendar:'solar',leapMonth:false,timeUnknown:false,time:'12:30'},questions,deliveries:[],mailJobs:[],payment:null,
    quote:{id:'mixed-quote',pricingVersion,unitKRW:null,quantity:2,totalKRW:total,questions,items}};
  await repository.insert(row);
  const product=await resolveNeoOrderProduct(db,resolveProduct({featureKey:NEO_EMAIL_FEATURE}),userId,row.id,row.quote.id);
  const created=await createOrder(db,{userId,product,idempotencyKey:row.quote.id,requestId:row.id});
  expect(created.paymentAmount).toBe(total); expect(created.expectedChargedPoints).toBe(total/100);
  expect(created.pricingSnapshot.consultation.items).toEqual(items);
  expect(created.pricingSnapshot.consultation.pricingVersion).toBe(pricingVersion);
  await repository.compareAndSwap(row.id,1,{...row,version:2,state:'pending',payment:{id:'mixed-payment',status:'pending'}});
  const payment={merchantUid:'mixed-payment',userId,featureKey:NEO_EMAIL_FEATURE,requestId:row.id,status:'paid',paymentAmount:20000,pricingSnapshot:{consultation:product.consultationSnapshot}};
  await expect(acceptNeoConfirmedPayment(db,payment)).rejects.toMatchObject({code:'PAYMENT_MISMATCH'});
  expect((await repository.get(row.id)).mailJobs).toHaveLength(0);
  payment.paymentAmount=total;
  await acceptNeoConfirmedPayment(db,payment); await acceptNeoConfirmedPayment(db,payment);
  const stored=await repository.get(row.id);
  expect(stored.state).toBe('received');expect(stored.mailJobs).toHaveLength(1);
});
