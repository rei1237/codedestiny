/**
 * @jest-environment node
 *
 * 운명의 지도 심층 리포트(100코인) — 계산 근거 fail-closed + 차감·기록 창 회귀 테스트.
 *
 * 🔴 destiny-compass-report-contract.js 를 **대역하지 않는다**. 기존 스위트
 *    (destiny-compass-paid-delivery.test.js)는 validateCompassSection→[] ·
 *    buildAllowedLabels→[] · buildCompassBasisPayload→{} 로 계약 모듈을 통째로 대역해,
 *    품질 게이트가 Jest 에서 한 번도 실행되지 않았다. 아래 두 결함은 그 사각지대에 있었다.
 *
 * ① 계산 근거 fail-open (2026-09-19 실측)
 *    directionScore.ts 가 어댑터 예외를 조용히 흡수하면(`catch { c = null }`) 그 체계가
 *    field.sources 에서 빠지고 collectDeepEvidence 도 건너뛴다. 사주 버킷 하나만 남은 팩으로
 *    /report 를 태우면 200 completed · 10/10 ok · 환불 0 이 나왔다. 자미 섹션 프롬프트에는
 *    [자미두수 확정값] 블록이 아예 없는데 "명궁 주성 → 삼방사정 회조" 지시는 그대로 나가고,
 *    창작된 명반 본문을 validateCompassSection 이 [] 로 통과시켰다 — 확정값 인용 검사의
 *    allowedLabels 에 방향·항로 라벨(직장·커리어/재물/30일…)이 늘 들어 있기 때문이다.
 *
 * ② 차감과 되돌릴 자리 사이의 실패 창 (2026-09-19 실측)
 *    차감은 프론트 공용 게이트(useCoinGate)가 POST 전에 끝낸다. 예전에는 실행 기록을 저장
 *    확인 **뒤**에 열어서, 저장 실패 503 이 기록 0건으로 끝났다(start 0회 실측).
 *    기록이 없으면 sweepStaleServiceExecutions 도 잠글 건이 없어 회수 경로가 아예 없다.
 *
 * 🔴 이 파일이 지키는 것은 "환불이 배선돼 있다"가 아니라 "확정값 없는 섹션은 생성되지 않는다"와
 *    "차감과 기록 사이에 실패 창이 없다"이다. 가드를 되돌리면 ①은 200, ②는 start 0회로 깨진다.
 */
import { jest } from '@jest/globals';

const USER_ID = '64b7f2a1c3d4e5f601234567';
const ENV = {};

let docs, route, provider, refundMock, completeMock, accessMock, startCalls, prompts, storageFault;

const clone = (value) => (value == null ? value : structuredClone(value));
const get = (doc, key) => key.split('.').reduce((v, f) => v?.[f], doc);

function query(value) {
  const result = Promise.resolve(value);
  result.lean = async () => clone(value);
  result.select = result.sort = () => result;
  return result;
}

function assign(doc, fields) {
  for (const [key, value] of Object.entries(fields)) {
    const path = key.split('.');
    let target = doc;
    for (const part of path.slice(0, -1)) target = target[part] ||= {};
    target[path.at(-1)] = clone(value);
  }
}

function matches(doc, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some((row) => matches(doc, row));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$ne' in value) return get(doc, key) !== value.$ne;
      if ('$in' in value) return value.$in.includes(get(doc, key));
      if ('$lt' in value) return new Date(get(doc, key)) < value.$lt;
    }
    return String(get(doc, key)) === String(value);
  });
}

/** 저장 확인까지 흉내 내는 최소 컬렉션. storageFault 로 최초 upsert 만 실패시킨다. */
const reportModel = {
  findOne: (filter) => query(docs.find((doc) => matches(doc, filter)) || null),
  find: () => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => [] }),
  findOneAndUpdate: (filter, update) => {
    const doc = docs.find((row) => matches(row, filter));
    if (doc) assign(doc, { ...update.$set, updatedAt: new Date() });
    return query(doc || null);
  },
  updateOne: async (filter, update) => {
    if (storageFault && update.$setOnInsert) { storageFault = false; throw new Error('mock storage down'); }
    let doc = docs.find((row) => matches(row, filter));
    if (!doc && update.$setOnInsert) { doc = clone(update.$setOnInsert); docs.push(doc); return { upsertedCount: 1 }; }
    if (doc && update.$set) assign(doc, update.$set);
    return { matchedCount: doc ? 1 : 0 };
  },
};

beforeAll(async () => {
  const db = await import('../../worker/lib/db.js');
  const auth = await import('../../worker/lib/auth.js');
  const models = await import('../../worker/lib/models.js');

  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {} }));
  jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ ...auth, requireAuth: async () => ({ userId: USER_ID }) }));
  jest.unstable_mockModule('../../worker/lib/models.js', () => ({
    ...models,
    DestinyCompassReport: reportModel,
    PaidExecutionRecord: { findOne: () => query(null) },
    Payment: { findOne: () => query(null) },
    PointHistory: { findOne: () => query(null) },
    MonthlyCreditLedger: { findOne: () => query(null) },
  }));
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({ callGeminiText: (...args) => provider(...args) }));
  jest.unstable_mockModule('../../worker/lib/access-control.js', () => ({ requirePremiumReportAccess: (...args) => accessMock(...args) }));
  jest.unstable_mockModule('../../worker/lib/service-execution-task.js', () => ({
    startServiceExecution: async (...args) => { startCalls.push(args); return { execution: {} }; },
    completeServiceExecution: (...args) => completeMock(...args),
    failServiceExecution: (...args) => refundMock(...args),
  }));
  jest.unstable_mockModule('../../worker/lib/llm-cache-store.js', () => ({ createLlmCacheStore: () => null }));
  jest.unstable_mockModule('../../worker/lib/cms-prompts.js', () => ({ cmsPromptText: (_env, _key, value) => value }));

  ({ handleDestinyCompassAiRoutes: route } = await import('../../worker/routes/destiny-compass-ai.js'));
});

/** 실제 품질 게이트를 통과하는 본문 — 섹션·문단마다 다른 문장이어야 반복 검사에 걸리지 않는다. */
function sectionText(key) {
  let text = '';
  for (let i = 0; text.replace(/\s/g, '').length < 2120; i += 1) {
    text += `${key} 단락 ${i}: 재물과 직장·커리어의 결을 함께 살피면 지금 자리에서 무엇을 먼저 붙잡아야 하는지 ${i}번째 근거로 또렷해집니다.\n`;
  }
  return text;
}

beforeEach(() => {
  docs = []; startCalls = []; prompts = []; storageFault = false;
  refundMock = jest.fn(async () => ({ ok: true }));
  completeMock = jest.fn(async () => ({}));
  accessMock = jest.fn(async () => ({ ok: true, accessType: 'paid', matchedTransactionId: 'original-receipt' }));
  provider = jest.fn(async (_env, prompt, options) => {
    prompts.push({ prompt, section: options?.logContext?.section });
    return { ok: true, text: sectionText(options.logContext.section) };
  });
  jest.spyOn(globalThis, 'fetch').mockImplementation(() => { throw Error('External fetch blocked'); });
});

afterEach(() => { jest.restoreAllMocks(); });

const sajuBucket = () => ({
  system: 'saju', dataQuality: 0.9, weight: 0.4,
  items: [{ id: 'saju.dayStem', term: '일간 갑', detail: '명식의 주체' }, { id: 'saju.stage', term: '십이운성 건록', detail: '기세가 오르는 자리' }],
});

/** 어댑터 넷이 던져 사주만 남은 팩 — 자미·숙요·타로 섹션은 확정값 0으로 생성된다. */
function reportInput(requestId, systems) {
  return {
    idempotencyKey: requestId, requestId, transactionId: 'original-receipt',
    question: '이직을 해야 할까요', emotion: 'calm',
    field: {
      seed: 'client-seed', confidence: 0.6, sources: systems.map((b) => b.system),
      primary: { key: 'career', score: 62, band: 'steady' },
      directions: [{ key: 'career', score: 62, band: 'steady' }, { key: 'wealth', score: 40, band: 'caution' }],
      strongArea: { key: 'career' }, blockedArea: { key: 'wealth' },
      timeline: { d30: { weather: 'breeze', momentum: 55 }, d90: { weather: 'clear', momentum: 62 } },
    },
    evidencePack: { systems },
  };
}

const ALL_SYSTEMS = () => [
  sajuBucket(),
  { system: 'ziwei', dataQuality: 0.8, weight: 0.2, items: [{ id: 'ziwei.ming', term: '명궁 자미', detail: '주성' }] },
  { system: 'sukuyo', dataQuality: 0.8, weight: 0.25, items: [{ id: 'sukuyo.mansion', term: '본명숙 각수', detail: '타고난 리듬' }] },
  { system: 'tarot', dataQuality: 0.7, weight: 0.15, items: [{ id: 'tarot.card', term: '태양(정위)', detail: '오늘의 카드' }] },
  { system: 'vedic', dataQuality: 0.6, weight: 0.12, items: [{ id: 'vedic.vara', term: '수요일', detail: '요일 지배성' }] },
];

const post = (path, body) => route(new Request(`https://mock.test/api/destiny-compass-ai${path}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
}), ENV);

/** 두 웨이브를 끝까지 돌린다(4+4+2 섹션). */
async function deliver(input) {
  const statuses = [];
  for (let i = 0; i < 6; i += 1) {
    const response = await post(i === 0 ? '/report' : '/report/continue', i === 0 ? input : { reportId: docs[0]?.id });
    statuses.push(response.status);
    if (response.status !== 202) return { statuses, response };
  }
  return { statuses, response: null };
}

test('① 체계 섹션의 확정값이 비면 한 줄도 생성하지 않고 그 자리에서 되돌린다', async () => {
  const { statuses, response } = await deliver(reportInput('req-basis-hole', [sajuBucket()]));
  const body = await response.json();

  expect(statuses[0]).toBe(422);
  expect(body.reason).toBe('CALCULATION_INCOMPLETE');
  expect(body.missingSystems).toEqual(['ziwei', 'sukuyo', 'tarot']);
  // 🔴 확정값 없는 섹션은 창작으로만 채워진다 — 프로바이더를 한 번도 부르지 않아야 한다.
  expect(provider).not.toHaveBeenCalled();
  expect(body.refunded).toBe(true);
  expect(refundMock).toHaveBeenCalledTimes(1);
  expect(refundMock.mock.calls[0][2]).toMatchObject({ executionKey: 'destiny-compass-deep-report:req-basis-hole' });
  expect(docs[0].status).toBe('generation_failed');
});

test('② 다섯 체계가 다 온 정상 요청은 10섹션을 그대로 완주한다', async () => {
  const { statuses, response } = await deliver(reportInput('req-full-pack', ALL_SYSTEMS()));
  const body = await response.json();

  expect(statuses.at(-1)).toBe(200);
  expect(body.status).toBe('completed');
  expect(body.progress).toEqual({ completed: 10, total: 10 });
  expect(body.degraded).toBe(false);
  // 🔴 과차단 방지: 정상 계산에는 가드가 물면 안 된다.
  expect(refundMock).not.toHaveBeenCalled();
  expect(completeMock).toHaveBeenCalledTimes(1);
});

test('③ 저장부가 실패해도 만료 스윕이 주울 실행 기록은 먼저 열려 있다', async () => {
  storageFault = true;

  const response = await post('/report', reportInput('req-storage-01', ALL_SYSTEMS()));
  const body = await response.json();

  expect(response.status).toBe(503);
  expect(body.reason).toBe('RESULT_STORAGE_UNAVAILABLE');
  expect(accessMock).toHaveBeenCalledTimes(1);
  // 🔴 차감은 프론트 게이트가 이미 끝냈다. 기록이 없으면 sweepStaleServiceExecutions 가 회수하지 못한다.
  expect(startCalls).toHaveLength(1);
  expect(startCalls[0][2]).toMatchObject({ executionKey: 'destiny-compass-deep-report:req-storage-01' });
  // 🔴 쓰기가 들어갔는지 모르는 창이라 즉시 환불은 하지 않는다(결제 없이 읽히는 리포트가 되는 길).
  expect(refundMock).not.toHaveBeenCalled();
});

test('차감이 없던 통과(이용권·관리자)는 되돌릴 실행 기록을 열지 않는다', async () => {
  accessMock.mockResolvedValueOnce({ ok: true, accessType: 'admin', matchedTransactionId: '' });

  const { response } = await deliver(reportInput('req-admin-pass-01', ALL_SYSTEMS()));

  expect(response.status).toBe(200);
  // 🔴 차감이 없던 경로는 되돌릴 것도 없다 — 기록을 열면 없는 차감을 환불하는 길이 열린다.
  expect(startCalls).toHaveLength(0);
  expect(refundMock).not.toHaveBeenCalled();
});
