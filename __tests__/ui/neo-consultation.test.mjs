import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNeoMock } from '../../scripts/lib/neo-consultation-mock.mjs';
import { NEO_EMAIL_FEATURE, neoQuoteItems, validateNeoInput } from '../../lib/neo-consultation/contract.js';
import { resolveProduct } from '../../worker/payments/catalog.js';
import { assertFeatureEnabled } from '../../worker/lib/billing-feature-registry.js';
import { handleNeoConsultations, handleNeoRuntimeRequest } from '../../worker/routes/neo-consultations.js';
import { priceNeoOrder } from '../../worker/neo-consultation/payment.js';
import { buildNeoEmail, neoMailAdapter } from '../../worker/neo-consultation/mail.js';
import { renderNeoEmailHomeEntry } from '../../lib/brand/neo-email-home-entry.mjs';
import { AI_OUTPUT_LOCALES, AI_LOCALE_LABEL, AI_LOCALE_HEADER } from '../../lib/i18n/ai-locale.js';

const admin = { id: 'neo-test-admin' }, user = 'test-owner';
const input = (count = 1) => ({ questions: Array.from({length:count},(_,i) => '이번 선택에서 고려할 점 ' + (i+1)), context: '현재 상황', email: 'customer@example.invalid', consent: true, birth: {date:'1990-04-20',calendar:'solar',leapMonth:false,timeUnknown:false,time:'12:30'} });
// 기존 저장형 주문의 호환성 검사는 과거 주문 형태를 명시적으로 재현한다.
async function legacyOrder(mock, row) {
  const stored = await mock.repository.get(row.id);
  delete stored.deliveryMode;
  await mock.repository.compareAndSwap(row.id, stored.version, stored);
  return mock.service.get(user, row.id);
}
async function pending(mock, count = 1, legacy = true) {
  let row = await mock.service.create(user,input(count));
  if (legacy) row = await legacyOrder(mock, row);
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

for (const locale of AI_OUTPUT_LOCALES) test(`수동 이메일 상담: ${locale} 접수 언어를 결제·운영·이어서 보기까지 보존한다`, async () => {
  const m = createNeoMock();
  const response = await handleNeoConsultations(new Request('https://example.invalid/api/neo-consultations', {
    method: 'POST', headers: { [AI_LOCALE_HEADER]: locale }, body: JSON.stringify(input()),
  }), { service: m.service, userId: user });
  assert.equal(response.status, 200);
  let row = (await response.json()).order;
  assert.equal(row.locale, locale);
  row = await m.service.quote(user, row.id, row.version);
  const quote = structuredClone(row.quote);
  row = await m.service.prepare(user, row.id, row.quote.id);
  row = await m.pay(row.id);
  const operator = await m.service.adminGet(admin, row.id);
  assert.equal(operator.locale, locale);
  assert.deepEqual(operator.quote, quote);
  const email = buildNeoEmail(operator, { kind: 'receipt' }, 'operator@example.invalid');
  assert.ok(email.text.includes('요청 답변 언어: ' + AI_LOCALE_LABEL[locale]));
  await rejects(m.service.update(user, row.id, { ...input(), locale: locale === 'ko' ? 'en' : 'ko' }, row.version), 'ORDER_LOCKED');
  const reopened = await handleNeoConsultations(new Request('https://example.invalid/api/neo-consultations/' + row.id, {
    headers: { [AI_LOCALE_HEADER]: locale === 'ko' ? 'en' : 'ko' },
  }), { service: m.service, userId: user });
  assert.equal((await reopened.json()).order.locale, locale);
  assert.equal(m.mails.length, 0);
});

test('수동 이메일 접수는 명시한 한국어·언어 별칭·기존 한국어 주문을 구분한다', async () => {
  assert.equal(validateNeoInput(input()).locale, 'ko');
  assert.equal(validateNeoInput({ ...input(), locale: 'zh-Hant' }).locale, 'zh-TW');
  const m = createNeoMock();
  const response = await handleNeoConsultations(new Request('https://example.invalid/api/neo-consultations', {
    method: 'POST', headers: { [AI_LOCALE_HEADER]: 'en' }, body: JSON.stringify({ ...input(), locale: 'ko' }),
  }), { service: m.service, userId: user });
  assert.equal((await response.json()).order.locale, 'ko');
  let row = await pending(m);
  row = await m.pay(row.id);
  delete row.locale;
  assert.ok(buildNeoEmail(row, { kind: 'receipt' }, 'operator@example.invalid').text.includes('요청 답변 언어: 한국어'));
});

test('새 접수는 답변 본문 저장·자동 발송 없이 수동 이메일 전달 이력만 기록한다', async () => {
  const m = createNeoMock();
  let row = await pending(m, 1, false);
  assert.equal(row.deliveryMode, 'manual_email');
  await rejects(m.service.completeManualDelivery(admin,row.id,row.version,true),'PAYMENT_REQUIRED');
  row = await m.pay(row.id);
  await rejects(m.service.editAnswer(admin,row.id,'q1','저장하면 안 되는 답변',row.version),'MANUAL_EMAIL_ONLY');
  await rejects(m.service.review(admin,row.id,'q1',row.version),'MANUAL_EMAIL_ONLY');
  await rejects(m.service.enqueueAnswer(admin,row.id,row.version),'MANUAL_EMAIL_ONLY');
  await rejects(m.service.completeManualDelivery({},row.id,row.version,true),'ADMIN_REQUIRED');
  await rejects(m.service.completeManualDelivery(admin,row.id,row.version,false),'DELIVERY_CONFIRMATION_REQUIRED');
  row = await m.service.requestCorrection(admin,row.id,'q1','한 가지 질문으로 정리해 주세요.',row.version);
  await rejects(m.service.completeManualDelivery(admin,row.id,row.version,true),'DELIVERY_CONFIRMATION_REQUIRED');
  row = await m.service.correct(user,row.id,'q1','이직 전에 무엇을 확인할까요',row.version);
  const response = await handleNeoConsultations(new Request('https://example.invalid/api/admin/neo-consultations/'+row.id+'/complete-manual-delivery',{
    method:'POST',body:JSON.stringify({version:row.version,confirmed:true,answer:'저장하면 안 되는 답변'}),
  }),{service:m.service,admin});
  assert.equal(response.status,200);
  row = (await response.json()).order;
  assert.equal(row.state,'sent');
  assert.equal(row.manualDelivery.by,admin.id);
  assert.equal(row.deliveries.length,0);
  assert.equal(row.mailJobs.some(j=>j.kind==='answer'),false);
  assert.doesNotMatch(JSON.stringify(await m.repository.get(row.id)),/저장하면 안 되는 답변/);
  assert.equal(m.mails.length,0);
  const repeated = await m.service.completeManualDelivery(admin,row.id,row.version,true);
  assert.equal(repeated.version,row.version);
  await rejects(m.service.requestCancellation(user,row.id,row.version),'DELIVERY_CHECK_REQUIRED');
  await rejects(m.service.requestCorrection(admin,row.id,'q1','변경 요청',row.version),'ORDER_LOCKED');
  await rejects(m.service.correct(user,row.id,'q1','변경 질문',row.version),'ORDER_LOCKED');
  m.setNow('2026-10-24T04:00:00.000Z');
  await m.service.purgeExpiredContent(row.id);
  const stored = await m.repository.get(row.id);
  assert.equal(stored.email,'');
  assert.equal(stored.questions[0].text,'');
  assert.equal(stored.payment.status,'paid');
  assert.equal(stored.manualDelivery.sentAt,row.manualDelivery.sentAt);
});

test('수동 발송 기록도 취소 요청·환불·오래된 주문 버전을 우회할 수 없다', async () => {
  for (const state of ['cancellation_requested','refunded','stale']) {
    const m=createNeoMock(); let row=await pending(m,1,false);
    row=await m.pay(row.id);
    if (state==='cancellation_requested') row=await m.service.requestCancellation(user,row.id,row.version);
    if (state==='refunded') m.paymentRows.get(row.payment.id).status='refunded';
    await rejects(m.service.completeManualDelivery(admin,row.id,state==='stale'?row.version-1:row.version,true),
      state==='stale'?'STALE_ORDER':'PAYMENT_REQUIRED');
    assert.equal((await m.repository.get(row.id)).manualDelivery,undefined);
  }
});

test('메일·PG 설정이 없으면 판매 정본이 활성화되어도 운영 접수는 닫힌다',async()=>{
  const response=await handleNeoRuntimeRequest(new Request('https://example.invalid/api/neo-consultations/status'),{});
  expectDisabled(await response.json());
});
function expectDisabled(data){ assert.equal(data.enabled,false); assert.equal(data.unitKRW,30000); }

test('결제 실패 뒤 같은 주문의 지연 승인은 새 결제 없이 복구한다',async()=>{
  const m=createNeoMock();const row=await pending(m);
  m.paymentRows.get(row.payment.id).status='failed';
  assert.equal((await m.service.get(user,row.id)).state,'payment_failed');
  m.paymentRows.get(row.payment.id).status='paid';
  const received=await m.service.acceptPayment(row.id);
  assert.equal(received.state,'received');assert.equal(m.paymentRows.size,1);
});

test('발송 전 취소는 답변 발송을 잠그고 운영자에게 본문 없는 알림만 보낸다',async()=>{
  const m=createNeoMock(); let row=await reviewed(m);
  row=await m.service.enqueueAnswer(admin,row.id,row.version);
  const answer=row.mailJobs.find(j=>j.kind==='answer');
  row=await m.service.requestCancellation(user,row.id,row.version);
  await rejects(m.service.deliver(row.id,answer.key),'PAYMENT_REQUIRED');
  await m.service.deliver(row.id,row.id+':cancellation');
  assert.equal(m.mails.length,1);
  assert.match(m.mails[0].message.text,/취소·전액 환불/);
  assert.doesNotMatch(m.mails[0].message.text,/customer@example|현재 상황|이번 선택/);
});

test('최초 발송 7일 뒤 상담 본문·이메일·출생정보와 복제 스냅샷을 삭제한다',async()=>{
  const m=createNeoMock(); let row=await reviewed(m);
  row=await m.service.enqueueAnswer(admin,row.id,row.version);
  await m.service.deliver(row.id,row.mailJobs.find(j=>j.kind==='answer').key);
  m.setNow('2026-10-22T04:00:00.000Z');
  await m.service.purgeExpiredContent(row.id);
  assert.equal((await m.service.get(user,row.id)).deliveries.length,1);
  m.setNow('2026-10-23T04:00:00.000Z');
  await m.service.purgeExpiredContent(row.id);
  const stored=await m.repository.get(row.id);
  assert.equal(stored.goodPeriod,''); assert.equal(stored.difficultPeriod,'');
  assert.equal(stored.email,''); assert.equal(stored.context,''); assert.equal(stored.birth,null);
  assert.equal(stored.deliveries.length,0); assert.equal(stored.quote.totalKRW,30000);
  assert.doesNotMatch(JSON.stringify(stored),/customer@example|이번 선택|작은 행동/);
  await rejects(m.service.enqueueAnswer(admin,row.id,stored.version,true),'REVIEW_REQUIRED');
});

test('질문 1/2/3개는 서버 견적으로 30000/60000/90000원, 단건 전용', async () => {
  const product = resolveProduct({featureKey:NEO_EMAIL_FEATURE});
  assert.equal(product.directOnly,true); assert.equal(product.billingType,'per_use');
  assert.equal(assertFeatureEnabled(product).ok,true);
  for (const n of [1,2,3,10]) {
    const m = createNeoMock(), row = await pending(m,n);
    assert.equal(row.quote.totalKRW,n*30000);
    assert.equal((await m.payments.read(row.payment.id)).amountKRW,n*30000);
  }
});
test('복수·빈·초과 질문, 동의·헤더 삽입 거절; 음력 윤달 보존·출생시간 필수', () => {
  for (const questions of [[],[''],Array(11).fill('질문'),['a'.repeat(1001)],['1. 이직\n2. 연애'],['이직? 연애?']]) assert.throws(() => validateNeoInput({...input(),questions}));
  assert.throws(() => validateNeoInput({...input(),consent:false}));
  assert.throws(() => validateNeoInput({...input(),email:'a@example.com\r\nBcc:evil@example.com'}));
  const b = { date:'1990-04-20',calendar:'lunar',leapMonth:true,timeUnknown:false,time:'12:00' };
  assert.deepEqual(validateNeoInput({...input(),birth:b}).birth,b);
  for (const birth of [null, {...b,timeUnknown:true}, {...b,time:''}, {...b,time:'24:00'}, {...b,date:'1990-13-01'}, {...b,calendar:'solar',date:'1990-02-30'}]) assert.throws(() => validateNeoInput({...input(),birth}));
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
  assert.equal(row.quote.totalKRW,30000);
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
test('네오 편지 안내는 상담 장면과 서버 가격·답변 기한을 안내한다', () => {
  const html = renderNeoEmailHomeEntry();
  assert.match(html,/href="\/neo-consultation\/"/);
  assert.match(html,/service-introductions\/neo-consultation-640\.webp/);
  assert.match(html,/사주 질문당 30,000원/);
  assert.match(html,/사주 \+ 자미두수 질문당 50,000원/);
  assert.match(html,/3일 이내/);
  assert.match(html,/네오에게 질문하기/);
  assert.match(html,/AI 작성 · 사람 검수 · 이메일 전달/);
  assert.doesNotMatch(html,/BLUE MOON/);
  const template=readFileSync(new URL('../../templates/home-funnel.html',import.meta.url),'utf8');
  // 2026-10-17: '네오에게 물어봐' 편지 블록이 홈 1:1 상담 줄(연이 상담 옆)로 돌아왔다.
  assert.equal(template.split('{{neoEmailConsultation}}').length - 1, 1);
  assert.ok(template.indexOf('id="cdhFusionSignatureSlot"') < template.indexOf('{{neoEmailConsultation}}'));
  assert.ok(template.indexOf('{{neoEmailConsultation}}') < template.indexOf('id="cdhSignatureSlot"'));
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
  assert.equal(resumed.quote.totalKRW,60000);
  assert.equal((await m.pay(resumed.id)).state,'received');
  assert.equal((await m.service.acceptPayment(resumed.id)).state,'received');
  assert.equal((await m.repository.get(resumed.id)).mailJobs.length,1);
});


test('질문별 사주와 자미두수 금액을 v4 서버 견적과 결제 스냅샷에 고정한다', async () => {
  const saju={readingMode:'saju'}, ziwei={readingMode:'saju_ziwei'};
  for (const [options, expected] of [[[saju],30000], [[ziwei],50000], [[saju,saju],60000], [[ziwei,ziwei],100000], [[saju,ziwei],80000], [Array(10).fill(ziwei),500000]]) {
    const m = createNeoMock();
    let row = await m.service.create(user,{...input(options.length),questions:options.map((option,i)=>({text:'선택 기준 '+i,...option,amountKRW:1}))});
    row = await m.service.quote(user,row.id,row.version);
    assert.equal(row.quote.pricingVersion,4);
    assert.equal(row.quote.totalKRW,expected);
    const stored=await m.repository.get(row.id);
    const product=priceNeoOrder(resolveProduct({featureKey:NEO_EMAIL_FEATURE}),stored,user,row.quote.id);
    assert.equal(product.priceKRW,expected); assert.equal(product.priceCoins,expected/100);
    assert.deepEqual(product.consultationSnapshot.items,row.quote.items);
    row = await m.service.prepare(user,row.id,row.quote.id);
    assert.equal((await m.payments.read(row.payment.id)).amountKRW,expected);
    assert.deepEqual((await m.service.get(user,row.id)).questions.map(q=>[q.readingMode,q.chartReading]),options.map(o=>[o.readingMode,o.chartReading===true]));
    const altered=structuredClone(stored); altered.quote.items[0].unitKRW=1;
    assert.throws(()=>priceNeoOrder(resolveProduct({featureKey:NEO_EMAIL_FEATURE}),altered,user,row.quote.id));
  }
  for (const question of [{readingMode:'unknown'},{readingMode:'ziwei'},{readingMode:'ziwei_saju'},{readingMode:'saju',chartReading:'yes'},{readingMode:'saju',chartReading:true}]) {
    assert.throws(()=>validateNeoInput({...input(),questions:[{text:'선택',...question}]}),e=>e.code==='READING_MODE_INVALID');
  }
});

test('결제 대기 중인 v2 자미두수 주문은 기존 금액으로 재검증하고 v3 견적에는 레거시 방식을 허용하지 않는다', async () => {
  const m = createNeoMock();
  let row = await m.service.create(user,input());
  row = await m.service.quote(user,row.id,row.version);
  const stored = await m.repository.get(row.id);
  stored.questions = [{id:'q1',text:'이직의 기준',readingMode:'ziwei_saju'}];
  stored.quote = {...stored.quote,pricingVersion:2,unitKRW:null,items:neoQuoteItems(stored.questions,2),totalKRW:20000,questions:structuredClone(stored.questions)};
  assert.deepEqual(stored.quote.items,[{questionId:'q1',readingMode:'ziwei_saju',unitKRW:20000}]);
  const product = priceNeoOrder(resolveProduct({featureKey:NEO_EMAIL_FEATURE}),stored,user,stored.quote.id);
  assert.equal(product.priceKRW,20000); assert.equal(product.consultationSnapshot.pricingVersion,2);
  assert.throws(()=>priceNeoOrder(resolveProduct({featureKey:NEO_EMAIL_FEATURE}),{...stored,quote:{...stored.quote,pricingVersion:3}},user,stored.quote.id));
});

test('새 신청은 출생정보 없이는 생성 불가, 기존 준비 주문과 정정은 보존한다',async()=>{
  const m=createNeoMock();
  await rejects(m.service.create(user,{...input(),birth:null}),'BIRTH_REQUIRED');
  let row=await pending(m);
  const stored=await m.repository.get(row.id);
  stored.birth=null; delete stored.quote.pricingVersion; delete stored.quote.items; stored.quote.unitKRW=10000; stored.quote.totalKRW=10000; m.paymentRows.get(row.payment.id).amountKRW=10000;
  stored.questions=stored.questions.map(({readingMode,...q})=>q);
  stored.quote.questions=structuredClone(stored.questions);
  await m.repository.compareAndSwap(row.id,stored.version,{...stored,version:stored.version+1});
  assert.equal((await m.service.prepare(user,row.id,row.quote.id)).quote.totalKRW,10000);
  await m.pay(row.id);
  row=await m.service.adminGet(admin,row.id);
  row=await m.service.requestCorrection(admin,row.id,'q1','질문을 정리해 주세요.',row.version);
  row=await m.service.correct(user,row.id,'q1','이직 선택 기준',row.version);
  assert.equal(row.birth,null); assert.equal(row.quote.totalKRW,10000);
});

test('자미두수·원국명반 추가 답변은 각 풀이 확인 없이는 검수와 발송을 차단한다',async()=>{
  const m=createNeoMock();
  let row=await m.service.create(user,{...input(),questions:[{text:'선택 기준',readingMode:'saju_ziwei'}]});
  row=await legacyOrder(m,row);
  const old=await m.repository.get(row.id); old.questions[0].chartReading=true; await m.repository.compareAndSwap(old.id,old.version,old);
  const stored=await m.repository.get(row.id); stored.quote={id:'old-chart',pricingVersion:3,unitKRW:null,quantity:1,totalKRW:40000,questions:structuredClone(stored.questions),items:neoQuoteItems(stored.questions,3)}; stored.state='preparing'; await m.repository.compareAndSwap(stored.id,stored.version,stored);
  row=await m.service.prepare(user,row.id,stored.quote.id);await m.pay(row.id);
  row=await m.service.adminGet(admin,row.id);
  row=await m.service.editAnswer(admin,row.id,'q1','자미두수와 사주에서 살펴볼 선택의 기준입니다.',row.version);
  await rejects(m.service.review(admin,row.id,'q1',row.version),'COMBINED_REVIEW_REQUIRED');
  await rejects(m.service.review(admin,row.id,'q1',row.version,true),'CHART_REVIEW_REQUIRED');
  await rejects(m.service.enqueueAnswer(admin,row.id,row.version),'REVIEW_REQUIRED');
  row=await m.service.review(admin,row.id,'q1',row.version,true,true);
  row=await m.service.enqueueAnswer(admin,row.id,row.version);
  await m.service.deliver(row.id,row.mailJobs.at(-1).key);
  assert.match(m.mails[0].message.text,/풀이 방식: 사주 \+ 자미두수 · 사주 원국·자미두수 명반 해석/);
  row=await m.service.adminGet(admin,row.id);
  row=await m.service.editAnswer(admin,row.id,'q1','수정된 풀이',row.version);
  await rejects(m.service.enqueueAnswer(admin,row.id,row.version),'REVIEW_REQUIRED');
  await rejects(m.service.update(user,row.id,input(),row.version),'ORDER_LOCKED');
});

test('회사 접수 메일에 결제된 질문·옵션·금액·출생정보를 포함하고 제목은 비식별로 유지한다',async()=>{
  const m=createNeoMock();
  let row=await m.service.create(user,{...input(),context:'<script>상황</script>',questions:[{text:'선택의 기준',readingMode:'saju_ziwei'}]});
  row=await m.service.quote(user,row.id,row.version);row=await m.service.prepare(user,row.id,row.quote.id);
  assert.equal((await m.repository.get(row.id)).mailJobs.length,0);
  await m.pay(row.id); row=await m.repository.get(row.id);
  const message=buildNeoEmail(row,row.mailJobs[0],'admin@code-destiny.com');
  assert.equal(message.to,'admin@code-destiny.com');
  for(const fragment of ['선택의 기준','사주 + 자미두수','50,000원','1990-04-20','12:30','customer@example.invalid','상황','/admin/neo-consultations/']) assert.ok(message.text.includes(fragment),fragment);
  assert.ok(!message.html.includes('<script>'));assert.doesNotMatch(message.subject,/1990|customer|선택의 기준/);
  m.setMailOutcome('failed');await m.service.deliver(row.id,row.mailJobs[0].key);
  m.setMailOutcome('sent');await m.service.deliver(row.id,row.mailJobs[0].key);
  await m.service.deliver(row.id,row.mailJobs[0].key);
  assert.equal(m.mails.length,2);assert.equal(m.mails[0].idempotencyKey,m.mails[1].idempotencyKey);assert.equal(m.paymentRows.size,1);
});

test('선택 시기 기록은 이전 입력과 호환되며 길이·타입을 검증하고 가격과 분리한다', async () => {
  assert.equal(validateNeoInput(input()).goodPeriod, '');
  assert.throws(() => validateNeoInput({...input(), goodPeriod: {year:2020}}), e => e.code === 'PERIOD_INVALID');
  assert.throws(() => validateNeoInput({...input(), difficultPeriod:'가'.repeat(1001)}), e => e.code === 'PERIOD_LENGTH');
  const mock=createNeoMock();
  let row=await mock.service.create(user,{...input(),goodPeriod:'2022년 <봄>',difficultPeriod:'서른 살 무렵'});
  row=await mock.service.quote(user,row.id,row.version);
  assert.equal(row.quote.totalKRW,30000);
  assert.equal((await mock.service.get(user,row.id)).goodPeriod,'2022년 <봄>');
  const message=buildNeoEmail(row,{kind:'receipt'},'operator@example.invalid');
  assert.match(message.text,/2022년 <봄>/);
  assert.match(message.html,/&lt;봄&gt;/);
  assert.doesNotMatch(message.subject,/2022|서른/);
});

test('상대방 생시 미상 궁합은 접수 메일에 전달되고 보관 기간 뒤 삭제한다', async () => {
  const m=createNeoMock();
  const partnerBirth={date:'1992-02-20',calendar:'solar',leapMonth:false,timeUnknown:true,time:null};
  let row=await m.service.create(user,{...input(),partnerBirth});
  assert.deepEqual(row.partnerBirth,partnerBirth);
  assert.throws(()=>validateNeoInput({...input(),partnerBirth:{...partnerBirth,date:'1992-02-31'}}), e=>e.code==='BIRTH_INVALID');
  row=await m.service.quote(user,row.id,row.version); row=await m.service.prepare(user,row.id,row.quote.id); await m.pay(row.id);
  row=await m.service.adminGet(admin,row.id);
  const mail=buildNeoEmail(row,row.mailJobs[0],'operator@example.invalid');
  assert.match(mail.text,/상대방 출생정보: 1992-02-20/);assert.match(mail.text,/시간 모름/);
  assert.doesNotMatch(mail.subject,/1992/);
  row=await m.service.completeManualDelivery(admin,row.id,row.version,true);
  m.setNow('2026-10-24T04:00:00.000Z'); await m.service.purgeExpiredContent(row.id);
  assert.equal((await m.repository.get(row.id)).partnerBirth,null);
});
