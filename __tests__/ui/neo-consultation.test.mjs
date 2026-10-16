import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNeoMock } from '../../scripts/lib/neo-consultation-mock.mjs';
import { NEO_EMAIL_FEATURE, validateNeoInput } from '../../lib/neo-consultation/contract.js';
import { resolveProduct } from '../../worker/payments/catalog.js';
import { assertFeatureEnabled } from '../../worker/lib/billing-feature-registry.js';
import { handleNeoConsultations } from '../../worker/routes/neo-consultations.js';
import { priceNeoOrder } from '../../worker/neo-consultation/payment.js';
import { neoMailAdapter } from '../../worker/neo-consultation/mail.js';
import { renderNeoEmailHomeEntry } from '../../lib/brand/neo-email-home-entry.mjs';

const admin = { id: 'neo-test-admin' }, user = 'test-owner';
const input = (count = 1) => ({ questions: Array.from({length:count},(_,i) => '이번 선택에서 고려할 점 ' + (i+1)), context: '현재 상황', email: 'customer@example.invalid', consent: true });
async function pending(mock, count = 1) {
  let row = await mock.service.create(user,input(count));
  row = await mock.service.quote(user,row.id,row.version);
  return mock.service.prepare(user,row.id,row.quote.id);
}
async function reviewed(mock, count = 1) {
  let row = await pending(mock,count);
  await mock.pay(row.id);
  row = await mock.service.adminGet(admin,row.id);
  for (const q of row.questions) {
    row = await mock.service.editAnswer(admin,row.id,q.id,'선택의 조건을 살펴보고 작은 행동부터 시작해 보세요.',row.version);
    row = await mock.service.review(admin,row.id,q.id,row.version);
  }
  return row;
}
const rejects = (promise, code) => assert.rejects(promise, e => e.code === code);

test('질문 1/2/3개는 서버 견적으로 10000/20000/30000원, 단건 전용·판매 차단', async () => {
  const product = resolveProduct({featureKey:NEO_EMAIL_FEATURE});
  assert.equal(product.directOnly,true); assert.equal(product.billingType,'per_use');
  assert.equal(assertFeatureEnabled(product).ok,false);
  for (const n of [1,2,3,10]) {
    const m = createNeoMock(), row = await pending(m,n);
    assert.equal(row.quote.totalKRW,n*10000);
    assert.equal((await m.payments.read(row.payment.id)).amountKRW,n*10000);
  }
});
test('복수·빈·초과 질문, 동의·헤더 삽입 거절; 음력 윤달·시간 미상 보존', () => {
  for (const questions of [[],[''],Array(11).fill('질문'),['a'.repeat(1001)],['1. 이직\n2. 연애'],['이직? 연애?']]) assert.throws(() => validateNeoInput({...input(),questions}));
  assert.throws(() => validateNeoInput({...input(),consent:false}));
  assert.throws(() => validateNeoInput({...input(),email:'a@example.com\r\nBcc:evil@example.com'}));
  const b = { date:'1990-04-20',calendar:'lunar',leapMonth:true,timeUnknown:true,time:'12:00' };
  assert.deepEqual(validateNeoInput({...input(),birth:b}).birth,{...b,time:null});
  assert.equal(validateNeoInput(input()).birth,null);
});
test('수량·가격·소유자·견적 스냅샷 변조는 거절', async () => {
  const m = createNeoMock(); const row = await pending(m,2);
  const stored = await m.repository.get(row.id), p = resolveProduct({featureKey:NEO_EMAIL_FEATURE});
  for (const altered of [{...stored,userId:'other'},{...stored,quote:{...stored.quote,quantity:1}},{...stored,quote:{...stored.quote,totalKRW:1}}]) assert.throws(() => priceNeoOrder(p,altered,user,stored.quote.id));
  m.paymentRows.get(row.payment.id).amountKRW = 1;
  m.paymentRows.get(row.payment.id).status = 'paid';
  await rejects(m.service.acceptPayment(row.id),'PAYMENT_MISMATCH');
  assert.equal(m.mails.length,0);
});
test('견적 변경은 기존 결제 준비 무효화; 실제 결제 완료 경쟁이면 변경 거절', async () => {
  const m = createNeoMock(); let row = await pending(m);
  const oldQuote = row.quote.id, oldPayment = row.payment.id;
  row = await m.service.update(user,row.id,input(2),row.version);
  assert.equal((await m.payments.read(oldPayment)).status,'cancelled');
  await rejects(m.service.prepare(user,row.id,oldQuote),'QUOTE_CHANGED');
  row = await m.service.quote(user,row.id,row.version);
  row = await m.service.prepare(user,row.id,row.quote.id);
  m.paymentRows.get(row.payment.id).status = 'paid';
  await rejects(m.service.update(user,row.id,input(3),row.version),'PAYMENT_CHANGED');
});
test('미결제 발송 차단, 서버 확인 및 중복 웹훅은 한 번만 접수', async () => {
  const m = createNeoMock(); const row = await pending(m);
  await rejects(m.service.deliver(row.id,'no-job'),'PAYMENT_REQUIRED');
  await rejects(m.service.acceptPayment(row.id),'PAYMENT_NOT_PAID');
  await m.pay(row.id); await m.service.acceptPayment(row.id);
  const saved = await m.service.adminGet(admin,row.id);
  assert.equal(saved.mailJobs.length,1);
  await Promise.allSettled([m.service.deliver(row.id,saved.mailJobs[0].key),m.service.deliver(row.id,saved.mailJobs[0].key)]);
  assert.equal(m.mails.length,1);
});
test('비소유자 조회·정정 및 비관리자 검수 거절', async () => {
  const m = createNeoMock(), row = await pending(m);
  await rejects(m.service.get('other',row.id),'NOT_FOUND');
  await rejects(m.service.correct('other',row.id,'q1','새 질문',row.version),'NOT_FOUND');
  await rejects(m.service.adminGet({},row.id),'ADMIN_REQUIRED');
  await rejects(m.service.create('',input()),'UNAUTHORIZED');
});
test('모든 질문 검수 후 통합 발송, 수정하면 검수 해제, 초안은 고객에게 숨김', async () => {
  const m = createNeoMock(); let row = await reviewed(m,2);
  row = await m.service.editAnswer(admin,row.id,'q1','수정한 답변',row.version);
  await rejects(m.service.enqueueAnswer(admin,row.id,row.version),'REVIEW_REQUIRED');
  assert.equal((await m.service.get(user,row.id)).questions[0].answer,undefined);
  row = await m.service.review(admin,row.id,'q1',row.version);
  row = await m.service.enqueueAnswer(admin,row.id,row.version);
  const job = row.mailJobs.find(j => j.kind === 'answer');
  row = await m.service.deliver(row.id,job.key);
  assert.equal(row.state,'sent'); assert.equal(row.deliveries[0].questions.length,2);
  assert.match(m.mails[0].message.text,/수정한 답변/);
  row = await m.service.enqueueAnswer(admin,row.id,row.version,true);
  await m.service.deliver(row.id,row.mailJobs.at(-1).key);
  assert.equal(m.paymentRows.size,1); assert.equal(m.mails.length,2);
});
test('메일 실패 재시도·불명확 결과는 수동 확인, 재과금 없음', async () => {
  const m = createNeoMock(); let row = await reviewed(m);
  row = await m.service.enqueueAnswer(admin,row.id,row.version);
  const key = row.mailJobs.at(-1).key;
  m.setMailOutcome('failed'); row = await m.service.deliver(row.id,key);
  assert.equal(row.payment.status,'paid'); assert.equal(row.mailJobs.at(-1).state,'retry');
  m.setMailOutcome('unknown'); row = await m.service.deliver(row.id,key);
  await m.service.deliver(row.id,key); assert.equal(m.mails.length,2);
  row = await m.service.resolveDelivery(admin,row.id,key,'not_sent',row.version);
  m.setMailOutcome('sent'); row = await m.service.deliver(row.id,key);
  assert.equal(row.state,'sent'); assert.equal(m.paymentRows.size,1);
  assert.equal(m.mails[0].idempotencyKey,m.mails[2].idempotencyKey);
});
test('정정 요청은 같은 질문만 수정하며 원 결제 스냅샷·개수 유지', async () => {
  const m = createNeoMock(); let row = await reviewed(m);
  row = await m.service.requestCorrection(admin,row.id,'q1','한 가지 질문을 골라 주세요.',row.version);
  await rejects(m.service.enqueueAnswer(admin,row.id,row.version),'REVIEW_REQUIRED');
  row = await m.service.correct(user,row.id,'q1','이직에서 고려할 점',row.version);
  assert.notEqual(row.questions[0].text,row.quote.questions[0].text);
  assert.equal(row.quote.totalKRW,10000);
});
test('취소·환불 주문은 검수·발송 불가, 이미 보낸 답변 보관', async () => {
  for (const state of ['cancelled','refunded']) {
    const m = createNeoMock(); let row = await reviewed(m);
    row = await m.service.enqueueAnswer(admin,row.id,row.version);
    m.paymentRows.get(row.payment.id).status = state;
    await rejects(m.service.deliver(row.id,row.mailJobs.at(-1).key),'PAYMENT_REQUIRED');
    assert.equal((await m.service.get(user,row.id)).state,state);
    assert.equal(m.mails.length,0);
  }
});
test('메일 HTML 이스케이프·민감정보 제목 제외·어댑터 결과 분류', async () => {
  const m = createNeoMock(); let row = await reviewed(m);
  row = await m.service.editAnswer(admin,row.id,'q1','<script>alert(1)</script>',row.version);
  row = await m.service.review(admin,row.id,'q1',row.version);
  row = await m.service.enqueueAnswer(admin,row.id,row.version);
  await m.service.deliver(row.id,row.mailJobs.at(-1).key);
  assert.ok(!m.mails[0].message.html.includes('<script>'));
  assert.ok(!m.mails[0].message.subject.includes('customer@'));
  for (const [status,expected] of [[422,'failed'],[500,'unknown'],[0,'unknown']]) {
    const send = neoMailAdapter(async () => ({ok:false,status}),{});
    assert.equal((await send({}, {idempotencyKey:'x'})).state,expected);
  }
});
test('운영 라우트는 인증/환경/query로 켜지지 않으며 고객·관리자 API mock 계약 동작', async () => {
  for (const path of ['/api/neo-consultations','/api/admin/neo-consultations']) {
    const response = await handleNeoConsultations(new Request('https://example.invalid'+path+'?mock=true',{method:'POST',body:JSON.stringify(input())}));
    assert.equal(response.status,503);
  }
  const m = createNeoMock();
  let response = await handleNeoConsultations(new Request('http://localhost/api/neo-consultations',{method:'POST',body:JSON.stringify({...input(2),amount:1,quantity:1})}),{service:m.service,userId:user});
  const {order} = await response.json(); assert.equal(order.questions.length,2);
  response = await handleNeoConsultations(new Request('http://localhost/api/admin/neo-consultations'),{service:m.service,userId:user});
  assert.equal(response.status,401);
});
test('CI node suite discovers this test; runtime cannot import mock or open sale', () => {
  const runtime = readFileSync(new URL('../../worker/routes/neo-consultations.js',import.meta.url),'utf8');
  assert.doesNotMatch(runtime,/createNeoMock|createNeoMemoryRepository|process\.env/);
  const config = readFileSync(new URL('../../scripts/lib/mock-test-config.mjs',import.meta.url),'utf8');
  assert.ok(config.includes('__tests__/ui/*.test.mjs'));
});
test('홈은 기존 인간형 네오와 서버 가격을 쓰며 판매 준비 상태로 안내한다', () => {
  const html = renderNeoEmailHomeEntry();
  assert.match(html,/href="\/neo-consultation\/"/);
  assert.match(html,/neo-strategy-portrait\.webp/);
  assert.match(html,/질문당 10,000원/);
  assert.match(html,/판매 준비 중/);
  assert.match(html,/질문 작성하기/);
  assert.doesNotMatch(html,/BLUE MOON/);
  const template=readFileSync(new URL('../../templates/home-funnel.html',import.meta.url),'utf8');
  assert.ok(template.indexOf('{{neoEmailConsultation}}')<template.indexOf('id="cdhFeatured"'));
});

test('동시에 결제 준비를 요청해도 같은 견적의 결제는 한 건이며 재시도로 복구한다', async () => {
  const m = createNeoMock();
  let row = await m.service.create(user,input(2));
  row = await m.service.quote(user,row.id,row.version);
  const results = await Promise.allSettled([
    m.service.prepare(user,row.id,row.quote.id),
    m.service.prepare(user,row.id,row.quote.id),
  ]);
  assert.ok(results.some(result => result.status === 'fulfilled'));
  const resumed = await m.service.prepare(user,row.id,row.quote.id);
  assert.equal(m.paymentRows.size,1);
  assert.equal(resumed.quote.totalKRW,20000);
  assert.equal((await m.pay(resumed.id)).state,'received');
  assert.equal((await m.service.acceptPayment(resumed.id)).state,'received');
  assert.equal((await m.repository.get(resumed.id)).mailJobs.length,1);
});
