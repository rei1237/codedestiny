/**
 * 사주 고급 궁합 유료 전달 행동 계약(mock LLM·가짜 DB, 과금 호출 없음).
 * - 네 그룹이 모두 완성될 때만 본문을 내보내고 이용권은 한 번만 차감한다.
 * - 종결 실패는 환불하지 않고 생성 + 7일 무료 다시 시도를 연다(본문 비노출).
 * - 🔴 요청 5(2026-11-20): 다시 시도는 저장된 그룹을 다시 생성하지 않고 빠진 그룹만 생성한다.
 * - 고객 환불 요청은 공용 환불 정산으로 넘긴다. 미결제는 402, 시간 모름 입력은 prepare 를 통과한다.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const USER_ID = '64b7f0c2a1b2c3d4e5f60718';
const DAY_MS = 24 * 60 * 60 * 1000;
const BODY = {
  self: { birthDate: '1990-05-15', birthTime: '14:30', gender: 'male', name: '나' },
  partner: { birthDate: '1992-11-03', birthTimeUnknown: true, gender: 'female', name: '상대' },
  relationType: 'dating',
};

const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
const get = (value, key) => key.split('.').reduce((at, part) => at?.[part], value);
function set(value, key, data) {
  const parts = key.split('.');
  const last = parts.pop();
  for (const part of parts) value = value[part] ||= {};
  value[last] = clone(data);
}
function matchValue(actual, expected) {
  if (expected === null) return actual == null;
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    return Object.entries(expected).every(([op, operand]) => {
      if (op === '$in') return operand.map(String).includes(String(actual));
      if (op === '$exists') return (actual !== undefined) === operand;
      if (op === '$ne') return operand === null ? actual != null : String(actual) !== String(operand);
      if (op === '$lt') return actual != null && actual < operand;
      if (op === '$lte') return actual != null && new Date(actual) <= new Date(operand);
      throw new Error(`unsupported operator ${op}`);
    });
  }
  return String(actual) === String(expected);
}
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some((row) => matches(doc, row));
    if (key === '$and') return value.every((row) => matches(doc, row));
    return matchValue(get(doc, key), value);
  });
}
function chain(value) {
  const self = { lean: async () => clone(value), sort: () => self, select: () => self, limit: () => self };
  return self;
}

function fakeModel(clock) {
  const docs = [];
  const touch = (doc) => { doc.updatedAt = new Date(clock.now + (clock.tick += 1)).toISOString(); };
  const apply = (doc, update) => { for (const [key, value] of Object.entries(update.$set || {})) set(doc, key, value); touch(doc); };
  return {
    docs,
    findOne: (filter) => chain(docs.find((doc) => matches(doc, filter)) || null),
    find: (filter) => chain(docs.filter((doc) => matches(doc, filter))),
    create: async (seed) => {
      if (docs.some((doc) => doc.userId === seed.userId && doc.idempotencyKey === seed.idempotencyKey)) throw Object.assign(new Error('dup'), { code: 11000 });
      const doc = clone({ usageAppliedAt: null, result: null, ...seed, createdAt: new Date(clock.now).toISOString() });
      touch(doc);
      docs.push(doc);
      return clone(doc);
    },
    findOneAndUpdate: (filter, update) => ({ lean: async () => {
      const doc = docs.find((row) => matches(row, filter));
      if (!doc) return null;
      apply(doc, update);
      return clone(doc);
    } }),
    updateOne: async (filter, update) => {
      const doc = docs.find((row) => matches(row, filter));
      if (!doc) return { modifiedCount: 0 };
      apply(doc, update);
      return { modifiedCount: 1 };
    },
  };
}

const emptyModel = { findOne: () => chain(null), find: () => chain([]) };

const TOPICS = ['햇살', '강물', '바람', '흙길', '별빛', '새벽', '노을', '숲길', '파도', '달빛', '봄비', '들꽃'];
function body(seed, count = 20) {
  return Array.from({ length: count }, (_, index) => {
    const topic = TOPICS[(seed + index) % TOPICS.length];
    return `${seed}번째 장의 ${index + 1}번 문장은 ${topic}처럼 두 사람이 서로의 속도를 맞추는 장면을 차분하게 그려 보입니다.`;
  }).reduce((acc, sentence, index) => acc + (index && index % 4 === 0 ? '\n\n' : index ? ' ' : '') + sentence, '');
}
function groupResponse(group, seed) {
  const payload = { sections: group.sections.map((item, index) => ({ title: item.title, body: body(seed * 10 + index) })) };
  if (group.emits.includes('header')) Object.assign(payload, { summaryTitle: '물과 쇠의 궁합', oneLine: '서로를 식히고 다듬는 관계입니다.', keywords: ['보완', '대화'] });
  if (group.emits.includes('actions')) payload.actionTips = ['이번 주에는 하루 10분 대화합니다.'];
  if (group.emits.includes('closing')) payload.finalMessage = '천천히 함께 가면 됩니다.';
  return JSON.stringify(payload);
}

async function setup({ paid = true, failGroups = new Set() } = {}) {
  const route = await import('../../worker/routes/saju-compat-premium.js');
  const prompt = await import('../../worker/lib/saju-compat-premium-prompt.js');
  const clock = { now: Date.UTC(2026, 10, 20, 3), tick: 0 };
  const Model = fakeModel(clock);
  const state = { llmCalls: [], passConsumed: 0, refunds: [], failGroups };
  // 프롬프트 첫 줄이 이번에 쓸 그룹을 밝힌다(응답 스키마는 그룹끼리 같을 수 있다).
  const groupOf = (text) => prompt.SAJU_COMPAT_PREMIUM_GROUPS.find((group) => String(text).split(/\r?\n/)[0].endsWith(`이번에 쓸 부분: ${group.label}`));
  route.__sajuCompatPremiumTestUtils.setDeps({
    Model,
    User: { findById: () => chain({ _id: USER_ID, role: 'user' }) },
    Payment: emptyModel,
    PointHistory: emptyModel,
    PaidExecutionRecord: emptyModel,
    connectDb: async () => {},
    withMongoRetry: async (_env, fn) => fn(),
    getUser: async () => ({ userId: USER_ID, role: 'user' }),
    findMoonstoneSpendEvidence: async () => null,
    resolveFeatureAccessPolicy: () => (paid ? { allowed: true, accessType: 'pass' } : { allowed: false }),
    consumePassForFeature: async () => { state.passConsumed += 1; return { covered: true }; },
    claimEvidence: async () => ({ ok: true, skipped: true }),
    releaseEvidence: async () => ({ released: 0 }),
    settleRefund: async (_env, args) => { state.refunds.push(args); return { ok: true, refundStatus: 'refunded' }; },
    callDeferredUsage: async () => { throw new Error('deferred usage must not be called for pass access'); },
    isRevoked: async () => false,
    authorityOn: () => false,
    now: () => clock.now,
    callLlm: async (_env, text) => {
      const group = groupOf(text);
      assert.ok(group, 'unknown group schema');
      state.llmCalls.push(group.key);
      if (state.failGroups.has(group.key)) return { ok: false, error: 'provider_down', provider: 'gemini', model: 'gemini-test' };
      const seed = prompt.SAJU_COMPAT_PREMIUM_GROUPS.indexOf(group) + 1;
      return { ok: true, text: groupResponse(group, seed), provider: 'gemini', model: 'gemini-test', finishReason: 'STOP' };
    },
  });
  const call = async (method, path, payload) => {
    const url = `https://example.test/api/saju-compat-premium${path}`;
    const init = { method, headers: { 'content-type': 'application/json' } };
    if (payload !== undefined) init.body = JSON.stringify(payload);
    const response = await route.handleSajuCompatPremiumRoutes(new Request(url, init), {});
    return { status: response.status, body: await response.json() };
  };
  // 클라이언트 루프: 202 partial 이면 같은 세션으로 /generate 를 다시 부른다.
  const generateUntilDone = async (first, limit = 12) => {
    let reply = first;
    for (let index = 0; index < limit && reply.status === 202 && reply.body.sessionId; index += 1) {
      reply = await call('POST', '/generate', { resumeSessionId: reply.body.sessionId });
    }
    return reply;
  };
  return { route, Model, state, clock, call, generateUntilDone, groups: prompt.SAJU_COMPAT_PREMIUM_GROUPS.map((group) => group.key) };
}

test.afterEach(async () => {
  const route = await import('../../worker/routes/saju-compat-premium.js');
  route.__sajuCompatPremiumTestUtils.resetDeps();
});

test('네 그룹이 모두 완성될 때만 결과를 내보내고 이용권은 한 번만 차감한다', async () => {
  const { call, generateUntilDone, state, groups, Model } = await setup();
  const first = await call('POST', '/generate', { ...BODY, idempotencyKey: 'scp-key-complete-0001' });
  assert.equal(first.status, 202);
  assert.equal(first.body.result, undefined, '완성 전 본문 비노출');
  assert.deepEqual(first.body.progress, { completed: 1, total: 4 });
  const done = await generateUntilDone(first);
  assert.equal(done.status, 200);
  assert.equal(done.body.status, 'completed');
  assert.deepEqual(done.body.result.chapters.map((chapter) => chapter.key), groups);
  assert.deepEqual(state.llmCalls, groups, '그룹마다 정확히 한 번 생성');
  assert.equal(state.passConsumed, 1);
  // 같은 요청 키로 다시 와도 재생성·재차감 없이 저장본을 돌려준다.
  const again = await call('POST', '/generate', { ...BODY, idempotencyKey: 'scp-key-complete-0001' });
  assert.equal(again.body.status, 'completed');
  assert.equal(state.llmCalls.length, 4);
  assert.equal(state.passConsumed, 1);
  const read = await call('GET', `/result?sessionId=${done.body.sessionId}`);
  assert.equal(read.status, 200);
  assert.ok(read.body.result);
  assert.equal(Model.docs[0].status, 'completed');
});

test('🔴 일부 그룹 저장 뒤 실패 → 다시 시도는 저장된 그룹을 다시 생성하지 않고 빠진 그룹만 생성한다', async () => {
  const { call, generateUntilDone, state, Model, clock } = await setup({ failGroups: new Set(['trust']) });
  const first = await call('POST', '/generate', { ...BODY, idempotencyKey: 'scp-key-partial-00001' });
  const failed = await generateUntilDone(first);
  assert.equal(failed.status, 503);
  assert.equal(failed.body.reason, 'LLM_ERROR');
  assert.equal(failed.body.refunded, false);
  assert.equal(failed.body.result, undefined, '실패 응답에 본문 없음');
  const doc = Model.docs[0];
  assert.equal(doc.status, 'generation_failed');
  assert.equal(new Date(failed.body.retry.refundAt).getTime(), new Date(doc.createdAt).getTime() + 7 * DAY_MS, '환불 시각 = 생성 + 7일');
  assert.deepEqual(Object.keys(doc.llmMeta.groups).sort(), ['overview', 'temperament', 'trust'].sort());
  assert.deepEqual(state.llmCalls, ['overview', 'temperament', 'trust', 'trust'], '실패 그룹만 한도(2회)까지');
  assert.equal(state.passConsumed, 0, '완성 전 차감 없음');
  assert.equal(state.refunds.length, 0, '다시 시도 창 안에서는 환불하지 않음');
  const savedOverview = JSON.stringify(doc.llmMeta.groups.overview);

  const pending = await call('GET', `/result?sessionId=${doc.id}`);
  assert.equal(pending.status, 409);
  assert.equal(pending.body.retry.available, true);
  assert.equal(pending.body.result, undefined);

  state.llmCalls.length = 0;
  state.failGroups.clear();
  clock.now += 60 * 60 * 1000;
  const retried = await generateUntilDone(await call('POST', '/retry', { sessionId: doc.id }));
  assert.equal(retried.status, 200);
  assert.equal(retried.body.status, 'completed');
  assert.deepEqual(state.llmCalls, ['trust', 'timing'], '저장된 overview·temperament 는 LLM 재호출 0회');
  assert.equal(JSON.stringify(Model.docs[0].llmMeta.groups.overview), savedOverview, '저장된 그룹은 그대로');
  assert.equal(state.passConsumed, 1, '다시 시도는 추가 결제·차감 없이 전달 때 한 번만');
  assert.equal(state.refunds.length, 0);
});

test('복구 크론 재개도 저장된 그룹을 건너뛰고 완성 여부를 판정한다', async () => {
  const { route, call, state, Model } = await setup();
  const first = await call('POST', '/generate', { ...BODY, idempotencyKey: 'scp-key-resume-000001' });
  assert.equal(first.status, 202);
  const doc = Model.docs[0];
  assert.equal(route.isStuckDeliveryComplete(doc), false);
  // 잠금이 풀린 partial 을 서버가 이어 쓴다.
  let reply = await route.resumeConsultationOnServer({}, doc);
  for (let index = 0; index < 6 && reply.status === 202; index += 1) reply = await route.resumeConsultationOnServer({}, Model.docs[0]);
  assert.equal(reply.status, 200);
  assert.deepEqual(state.llmCalls, ['overview', 'temperament', 'trust', 'timing']);
  assert.equal(route.isStuckDeliveryComplete(Model.docs[0]), true);
});

test('고객 환불 요청은 다시 시도를 닫고 공용 환불 정산으로 넘긴다', async () => {
  const { call, generateUntilDone, state, Model } = await setup({ failGroups: new Set(['overview']) });
  const failed = await generateUntilDone(await call('POST', '/generate', { ...BODY, idempotencyKey: 'scp-key-refund-000001' }));
  assert.equal(failed.status, 503);
  const sessionId = failed.body.sessionId;
  const refund = await call('POST', '/refund-request', { sessionId });
  assert.equal(refund.status, 200);
  assert.deepEqual(refund.body, { ok: true, sessionId, refunded: true, refundStatus: 'refunded' });
  assert.deepEqual(state.refunds, [{ service: 'saju-compat-premium', id: sessionId, userId: USER_ID }]);
  assert.ok(Model.docs[0].llmMeta.refundEligibleAt);
  const retry = await call('POST', '/retry', { sessionId });
  assert.notEqual(retry.status, 200, '환불 요청 뒤에는 다시 시도할 수 없다');
  assert.equal(state.llmCalls.filter((key) => key === 'overview').length, 2);
});

test('미결제 /generate 는 결제 안내(402)를 돌려주고 LLM 을 부르지 않는다', async () => {
  const { call, state, Model } = await setup({ paid: false });
  const reply = await call('POST', '/generate', { ...BODY, idempotencyKey: 'scp-key-unpaid-000001' });
  assert.equal(reply.status, 402);
  assert.equal(reply.body.reason, 'PAYMENT_REQUIRED');
  assert.equal(reply.body.paymentPayload.featureKey, 'saju-compat-premium');
  assert.equal(reply.body.paymentPayload.amountKRW, 10000);
  assert.equal(state.llmCalls.length, 0);
  assert.equal(Model.docs.length, 0);
});

test('/prepare 는 상대 시간 모름을 정상 입력으로 받고 잘못된 입력은 400 으로 거절한다', async () => {
  const { call, state } = await setup({ paid: false });
  const ok = await call('POST', '/prepare', { ...BODY, idempotencyKey: 'scp-key-prepare-00001' });
  assert.equal(ok.status, 402);
  assert.equal(ok.body.validation.partner.timeUnknown, true);
  assert.equal(ok.body.validation.self.dayPillar, '庚辰');
  const paid = await setup();
  const allowed = await paid.call('POST', '/prepare', { ...BODY, idempotencyKey: 'scp-key-prepare-00002' });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.accessType, 'pass');
  const bad = await call('POST', '/prepare', { ...BODY, relationType: 'enemy', idempotencyKey: 'scp-key-prepare-00003' });
  assert.equal(bad.status, 400);
  assert.equal(state.llmCalls.length, 0);
});
