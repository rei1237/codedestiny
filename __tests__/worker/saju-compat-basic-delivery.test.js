/** @jest-environment node */
import { jest } from '@jest/globals';
import { requestBody, samplePairs, llmResponse } from '../fixtures/saju-compat-llm-fixture.mjs';

// 선결제 사주 궁합 LLM 라우트(paid-narrative 엔진) — 실제 LLM·DB·결제는 쓰지 않는다.
let route, normalize, recovery, docs, provider, revoked, userId, fault, lost, external, mode, accessCalls, plan;
const owner = '64b7f2a1c3d4e5f601234567';
const clone = (value) => structuredClone(value);
const get = (doc, key) => key.split('.').reduce((value, part) => value?.[part], doc);
function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some((item) => matches(doc, item));
    if (key === '$and') return value.every((item) => matches(doc, item));
    const actual = get(doc, key);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$exists' in value) return Boolean(actual !== undefined) === value.$exists;
      if ('$in' in value) return value.$in.includes(actual);
      if ('$ne' in value) return JSON.stringify(actual) !== JSON.stringify(value.$ne);
      if ('$gte' in value) return actual instanceof Date ? actual >= new Date(value.$gte) : actual >= value.$gte;
      if ('$lte' in value) return actual != null && new Date(actual) <= new Date(value.$lte);
      if ('$gt' in value) return new Date(actual) > new Date(value.$gt);
    }
    return value === null ? actual == null : JSON.stringify(actual) === JSON.stringify(value);
  });
}
function patch(doc, fields) {
  for (const [key, value] of Object.entries(fields)) {
    const keys = key.split('.');
    const end = keys.pop();
    let target = doc;
    for (const part of keys) target = target[part] ??= {};
    target[end] = clone(value);
  }
}
// select 투영까지 흉내 낸다 — 라우트가 요청하지 않은 필드는 응답 근처에도 오지 않아야 한다.
const pick = (doc, fields) => { const out = {}; for (const key of typeof fields === 'string' ? ['_id', ...fields.split(/\s+/)] : Object.keys(fields)) { const value = get(doc, key); if (value !== undefined) patch(out, { [key]: value }); } return out; };
function query(value) {
  let fields = null;
  let max = Infinity;
  return {
    lean: async () => (value == null ? null : Array.isArray(value) ? value.slice(0, max).map((doc) => (fields ? pick(doc, fields) : clone(doc))) : fields ? pick(value, fields) : clone(value)),
    select(next) { fields = next; return this; }, sort() { return this; }, limit(next) { max = next; return this; },
  };
}
const model = {
  findOne: (filter) => { if (lost) { lost = false; return query(null); } return query(docs.find((doc) => matches(doc, filter)) || null); },
  find: (filter) => query(docs.filter((doc) => matches(doc, filter))),
  findOneAndUpdate: (filter, update, options = {}) => {
    if (fault && (fault.metadata ? Boolean(update.$set?.metadata) : update.$set?.premiumStatus === 'completed')) {
      const failure = fault; fault = null;
      if (failure.kind === 'throw') throw Error('storage');
      if (failure.kind === 'null') return query(null);
      if (failure.kind === 'confirm') lost = true;
    }
    let doc = docs.find((item) => matches(item, filter));
    if (!doc && options.upsert) { doc = { ...clone(update.$setOnInsert), _id: 'record' }; docs.push(doc); }
    if (doc) patch(doc, update.$set || {});
    return query(doc || null);
  },
  updateOne: async (filter, update) => { const doc = docs.find((item) => matches(item, filter)); if (doc) patch(doc, update.$set || {}); return { modifiedCount: doc ? 1 : 0 }; },
};

beforeAll(async () => {
  const db = await import('../../worker/lib/db.js');
  const auth = await import('../../worker/lib/auth.js');
  const models = await import('../../worker/lib/models.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn() }));
  jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ ...auth, requireAuth: async () => ({ userId }) }));
  jest.unstable_mockModule('../../worker/lib/access-control.js', () => ({
    requirePremiumReportAccess: async (_env, _owner, type, body) => { accessCalls.push({ type, body }); return { ok: mode !== 'denied', status: 402 }; },
  }));
  jest.unstable_mockModule('../../worker/lib/models.js', () => ({
    ...models,
    ServiceExecutionTransaction: model,
    PaidExecutionRecord: { findOne: () => query(revoked ? {} : null) },
    Payment: { findOne: () => query(null) }, PointHistory: { findOne: () => query(null) }, MonthlyCreditLedger: { findOne: () => query(null) },
  }));
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({ callGeminiText: (...args) => provider(...args) }));
  ({ handleSajuCompatBasicRoutes: route } = await import('../../worker/routes/saju-compat-basic.js'));
  ({ normalizeSajuCompatInput: normalize } = await import('../../worker/lib/saju-compat-schema.js'));
  ({ runPaidNarrativeRecovery: recovery } = await import('../../worker/lib/paid-narrative-recovery-task.js'));
});

const PAIR = samplePairs(31, 1)[0];
const GROUP_MARKS = { reasons: '"reasonDetails"', practice: '"repeatScene"', pastLife: '"crossReadings"', core: '"overview"' };
const groupOf = (prompt) => Object.entries(GROUP_MARKS).find(([, mark]) => prompt.includes(mark))[0];
let body;
const input = () => normalize(body);
const original = () => ({ ...body, requestId: 'compat-request-0001', transactionId: `paid-${mode}` });
const call = (path, init) => route(new Request(`https://mock.test/api/saju-compat-basic${path}`, init), {});
const post = (payload) => call('/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
const start = () => post(original());
const resume = () => post({ resumeResultId: docs[0].executionKey });
// 요청당 한 그룹이므로 완료될 때까지 재POST 한다(클라이언트가 하는 일).
async function drive(first = start) {
  let response = await first();
  for (let i = 0; i < 12 && response.status === 202; i += 1) response = await resume();
  return response;
}
const reply = (group, options) => ({ ok: true, provider: 'gemini', model: 'gemini-2.5-flash', text: JSON.stringify(llmResponse(group, input(), options)) });

beforeEach(() => {
  docs = []; revoked = false; userId = owner; fault = null; lost = false; mode = 'pass'; accessCalls = []; plan = {};
  body = requestBody(...PAIR, 'love', '하늘');
  provider = jest.fn(async (_env, prompt, options) => {
    expect(options.timeoutMs).toBeLessThanOrEqual(85000);
    expect(options.fallbackToWorkersAI).toBe(false);
    expect(options).toMatchObject({ locale: 'ko', responseMimeType: 'application/json', responseSchema: { type: 'OBJECT' }, thinkingBudget: 0 });
    const group = groupOf(prompt);
    return plan[group] ? plan[group](prompt) : reply(group);
  });
  external = jest.spyOn(globalThis, 'fetch').mockImplementation(() => { throw Error('external network'); });
});
afterEach(() => { expect(external).not.toHaveBeenCalled(); external.mockRestore(); });

function misplacedPastLife() {
  const raw = llmResponse('pastLife', input());
  for (const key of ['story', 'prescription', 'questions']) {
    raw.pastLife.crossReadings[key] = raw.pastLife[key];
    delete raw.pastLife[key];
  }
  return raw;
}

async function legacyThreeOfFour() {
  await start(); await resume(); await resume();
  const state = docs[0].metadata.paidNarrative;
  state.attempts.pastLife = 2;
  state.rawResponses = { pastLife: JSON.stringify(misplacedPastLife()) };
  docs[0].timeoutAt = new Date();
  docs[0].metadata.paidNarrativeRecovery = { reviewRequired: true, code: 'DELIVERY_REVIEW_REQUIRED' };
  provider.mockClear();
  return clone(state);
}

test('misnested final group completes on its first attempt without regenerating earlier parts', async () => {
  plan.pastLife = () => ({ ok: true, provider: 'gemini', text: JSON.stringify(misplacedPastLife()) });
  const response = await drive();
  expect(response.status).toBe(200);
  expect((await response.json()).meta.missing).toEqual([]);
  expect(provider).toHaveBeenCalledTimes(4);
});

test('exhausted saved 3/4 response recovers locally and preserves previous parts and attempts', async () => {
  const before = await legacyThreeOfFour();
  expect((await resume()).status).toBe(200);
  const state = docs[0].metadata.paidNarrative;
  expect(state.attempts).toEqual(before.attempts);
  for (const [id, part] of Object.entries(before.parts)) expect(state.parts[id]).toBe(part);
  expect(state.rawResponses).toEqual(before.rawResponses);
  expect(docs[0].metadata.result.meta.missing).toEqual([]);
  expect(provider).not.toHaveBeenCalled();
});

test('cron locally repairs a compatibility review once without spending another attempt', async () => {
  const before = await legacyThreeOfFour();
  expect((await recovery({})).outcomes[0].outcome).toBe('completed');
  expect(docs[0].metadata.paidNarrative.attempts).toEqual(before.attempts);
  expect(provider).not.toHaveBeenCalled();
});

test('invalid saved content remains in review without repeated cron scans or generation', async () => {
  await legacyThreeOfFour();
  const state = docs[0].metadata.paidNarrative;
  state.rawResponses.pastLife = JSON.stringify({ pastLife: { crossReadings: { story: { text: 'invalid' } } } });
  // Even another unattempted group cannot cause a provider call in the review repair.
  delete state.parts.practice;
  state.attempts.practice = 0;
  const before = clone(state);
  expect((await recovery({})).outcomes[0].outcome).toBe('review_required');
  expect(docs[0].metadata.paidNarrative).toEqual(before);
  expect((await recovery({})).scanned).toBe(0);
  expect(provider).not.toHaveBeenCalled();
});

test('saved repair still rejects revoked purchases and active leases', async () => {
  await legacyThreeOfFour();
  docs[0].lock = { token: 'other', until: new Date(Date.now() + 60000) };
  expect((await recovery({})).scanned).toBe(0);
  docs[0].lock = { token: '', until: null };
  revoked = true;
  expect((await recovery({})).outcomes[0].outcome).toBe('PAYMENT_REVOKED');
  expect((await recovery({})).scanned).toBe(0);
  expect(docs[0].premiumStatus).toBe('generating');
  expect(provider).not.toHaveBeenCalled();
});

test.each(['pass', 'monthly', 'single'])('%s 결제 확인 뒤 네 그룹을 한 번씩 만들어 완료·저장하고 재열람은 LLM 을 부르지 않는다', async (pay) => {
  mode = pay;
  const response = await drive();
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toMatchObject({ ok: true, status: 'completed', saved: true, schemaVersion: 1, type: 'saju-compat-basic', locale: 'ko' });
  expect(data.facts.score).toEqual(body.facts.score);
  expect(data.narrative.overview.length).toBeGreaterThan(30);
  expect(provider).toHaveBeenCalledTimes(4);
  expect(accessCalls[0]).toMatchObject({ type: 'sajuCompatBasic', body: { featureKey: 'compat-saju-compatibility', _accessRoute: '/api/saju-compat-basic' } });
  expect(docs).toHaveLength(1);
  expect(docs[0]).toMatchObject({ status: 'success', premiumStatus: 'completed', deliveryStatus: 'delivered', featureKey: 'compat-saju-compatibility' });
  expect((await resume()).status).toBe(200);
  expect((await start()).status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(4);
});

test('결제 확인이 안 되면 402 이고 LLM 도 DB 행도 없다', async () => {
  mode = 'denied';
  expect((await start()).status).toBe(402);
  expect(provider).not.toHaveBeenCalled();
  expect(docs).toHaveLength(0);
});

test('엔진 계약을 벗어난 facts·requestId 없는 요청은 결제 확인 전에 422/400 으로 막는다', async () => {
  const tampered = clone(original());
  tampered.facts.score.display += 1;
  const bad = await post(tampered);
  expect(bad.status).toBe(422);
  expect((await bad.json()).code).toBe('SAJU_COMPAT_INPUT_INVALID');
  expect([400, 422]).toContain((await post({ ...original(), requestId: '' })).status);
  expect(accessCalls).toHaveLength(0);
  expect(provider).not.toHaveBeenCalled();
});

test('같은 requestId 는 한 건만 만들고, 다른 입력으로 재사용하면 409, 다른 계정·환불은 재개를 막는다', async () => {
  expect((await drive()).status).toBe(200);
  const other = requestBody(...samplePairs(32, 1)[0], 'friend', '바다');
  expect((await post({ ...other, requestId: 'compat-request-0001', transactionId: 'paid-pass' })).status).toBe(409);
  expect(docs).toHaveLength(1);
  userId = 'other-user';
  expect((await resume()).status).toBe(404);
  userId = owner;
  revoked = true;
  expect((await resume()).status).toBe(403);
});

test.each(['isMock', 'notJson', 'throws', 'notOk'])('%s 응답은 가짜 완료 없이 그룹당 두 번만 시도하고 검수 대기로 남는다', async (kind) => {
  let coreCalls = 0;
  plan.core = async () => {
    coreCalls += 1;
    if (kind === 'throws') throw Error('timeout');
    if (kind === 'notOk') return { ok: false };
    if (kind === 'notJson') return { ok: true, provider: 'gemini', model: 'gemini-2.5-flash', text: '죄송합니다. 답변을 만들 수 없습니다.' };
    return { ...reply('core'), isMock: true, provider: 'mock' };
  };
  let response = await start();
  for (let i = 0; i < 12 && response.status === 202 && !(await response.clone().json()).reviewRequired; i += 1) response = await resume();
  expect(response.status).toBe(202);
  expect(await response.json()).toMatchObject({ reviewRequired: true, retryable: false });
  expect(coreCalls).toBe(2);
  expect(provider).toHaveBeenCalledTimes(2); // 첫 그룹이 소진되면 바로 검수 대기 — 더 호출하지 않는다.
  expect(docs[0].premiumStatus).not.toBe('completed');
  expect(docs[0].metadata?.result).toBeUndefined();
});

test('분량이 짧으면 한 번 보강을 요청해 받아들이고, 보강본도 분량으로 거부하지 않는다', async () => {
  const prompts = [];
  let calls = 0;
  plan.core = async (prompt) => { prompts.push(prompt); calls += 1; return reply('core', { scale: 0.25 }); };
  const response = await drive();
  expect(response.status).toBe(200);
  expect(calls).toBe(2);
  expect(prompts[0]).not.toContain('[보강 요청]');
  expect(prompts[1]).toContain('[보강 요청]');
  const data = await response.json();
  expect(data.narrative.overview.length).toBeGreaterThan(30);
  expect(data.meta.missing).toEqual([]);
});

test('1차에서 빠진 항목은 2차가 실패해도 1차 부분 결과로 완료하고 결손을 기록한다', async () => {
  let calls = 0;
  plan.core = async () => { calls += 1; if (calls === 1) return reply('core', { skip: ['detailCards.longTerm'] }); throw Error('lost'); };
  const response = await drive();
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(calls).toBe(2);
  expect(data.meta.missing).toEqual(['detailCards.longTerm']);
  expect(data.narrative.detailCards.emotionRhythm.length).toBeGreaterThan(30);
});

test('최종 저장이 실패해도 재개하면 같은 결과를 되살리고 LLM 을 다시 부르지 않는다', async () => {
  for (const kind of ['throw', 'null', 'confirm']) {
    docs = []; fault = null; provider.mockClear();
    await start(); await resume(); await resume(); // 3그룹까지 만들고 마지막 그룹의 최종 저장에서 실패시킨다.
    fault = { kind };
    const response = await resume();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, retryable: true, reason: 'RESULT_STORAGE_UNAVAILABLE' });
    expect((await resume()).status).toBe(200);
    expect(provider).toHaveBeenCalledTimes(4);
  }
});

describe('보관함', () => {
  const completed = async () => { const response = await drive(); expect(response.status).toBe(200); provider.mockClear(); return docs[0].executionKey; };

  test('목록은 요약만, 상세는 스냅샷 전체이며 둘 다 LLM 을 부르지 않고 원본 요청·원문 응답을 싣지 않는다', async () => {
    const id = await completed();
    const list = await call('/archive', { method: 'GET' });
    expect(list.status).toBe(200);
    const items = (await list.json()).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ resultId: id, compatType: 'love', partnerName: '하늘', schemaVersion: 1, score: body.facts.score.display, grade: body.facts.grade.code });
    expect(Object.keys(items[0]).sort()).toEqual(['compatType', 'createdAt', 'generatedAt', 'grade', 'partnerName', 'partnerKey', 'pastLifeGrade', 'resultId', 'schemaVersion', 'score', 'selfKey'].sort());
    const detail = await call(`/archive/${encodeURIComponent(id)}`, { method: 'GET' });
    expect(detail.status).toBe(200);
    const text = await detail.text();
    const data = JSON.parse(text);
    expect(data).toMatchObject({ ok: true, resultId: id, result: { type: 'saju-compat-basic', schemaVersion: 1 } });
    expect(data.result.narrative.overview.length).toBeGreaterThan(30);
    expect(text).not.toMatch(/paidNarrative|rawResponses|compat-request-0001|paid-pass/);
    expect(provider).not.toHaveBeenCalled();
  });

  test('다른 계정은 목록이 비고 상세는 404, 형식이 틀린 id 도 404, 환불·취소는 403, 미완료는 안 보인다', async () => {
    const id = await completed();
    userId = 'other-user';
    expect((await (await call('/archive', { method: 'GET' })).json()).items).toEqual([]);
    expect((await call(`/archive/${id}`, { method: 'GET' })).status).toBe(404);
    userId = owner;
    expect((await call('/archive/short', { method: 'GET' })).status).toBe(404);
    expect((await call(`/archive/${'x'.repeat(30)}`, { method: 'GET' })).status).toBe(404);
    revoked = true;
    const blocked = await call(`/archive/${id}`, { method: 'GET' });
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toMatchObject({ ok: false, reason: 'PAYMENT_REVOKED' });
    revoked = false;
    docs[0].premiumStatus = 'pending';
    expect((await (await call('/archive', { method: 'GET' })).json()).items).toEqual([]);
    expect((await call(`/archive/${id}`, { method: 'GET' })).status).toBe(404);
  });

  test('쓰기 메서드와 모르는 경로는 막는다', async () => {
    expect((await call('/archive', { method: 'POST' })).status).toBe(405);
    expect((await call('/archive/abcdefgh12', { method: 'DELETE' })).status).toBe(405);
    expect((await call('/nothing', { method: 'GET' })).status).toBe(404);
  });
});
