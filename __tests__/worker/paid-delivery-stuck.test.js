/** @jest-environment node */
// 정체 감시: 같은 상담이 진전 없이 복구되면 1시간 안에 구제 전달 또는 확정 실패+공용 환불로 끝나야 한다.
import { jest } from '@jest/globals';
import { Types } from 'mongoose';
let runConsultationRecovery, stuck;
beforeAll(async () => {
  const db = await import('../../worker/lib/db.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, work) => work() }));
  jest.unstable_mockModule('../../worker/lib/consultation-delivery-refund.js', () => ({ runPendingConsultationRefunds: async () => ({ outcomes: [] }), settleFailedConsultationRefund: async () => ({ refundStatus: 'refunded' }) }));
  ({ runConsultationRecovery } = await import('../../worker/lib/consultation-recovery-task.js'));
  stuck = await import('../../worker/lib/paid-delivery-stuck.js');
});
const clone = value => value == null || typeof value !== 'object' || value._bsontype === 'ObjectId' ? value : value instanceof Date ? new Date(value) : Array.isArray(value) ? value.map(clone) : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
const get = (doc, key) => key.split('.').reduce((at, part) => at?.[part], doc);
const set = (doc, key, value) => { const parts = key.split('.'); const last = parts.pop(); let at = doc; for (const p of parts) at = at[p] ||= {}; at[last] = value; };
const matches = (doc, filter) => Object.entries(filter).every(([k, v]) => v && typeof v === 'object' && '$in' in v ? v.$in.includes(get(doc, k)) : String(get(doc, k)) === String(v));

// 문서 하나를 가진 메모리 모델: 복구 크론·정체 확정이 쓰는 연산만.
function memoryModel(doc) {
  const apply = update => { for (const [k, v] of Object.entries(update.$set || {})) set(doc, k, v); };
  return {
    doc,
    find: () => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, lean: async () => [clone(doc)] }),
    findOne: filter => ({ lean: async () => matches(doc, filter) ? clone(doc) : null }),
    updateOne: jest.fn(async (filter, update) => { if (!matches(doc, filter)) return { modifiedCount: 0 }; apply(update); doc.updatedAt = new Date(doc.updatedAt.getTime() + 1); return { modifiedCount: 1 }; }),
    collection: {
      findOne: async filter => matches(doc, filter) ? clone(doc) : null,
      updateOne: async (filter, update) => { if (matches(doc, filter)) apply(update); return { modifiedCount: 1 }; },
    },
  };
}
const START = Math.floor(Date.now() / 1000) * 1000; // 크론 deadline 이 실제 시계를 본다
const baseDoc = (status, extra = {}) => ({ _id: Types.ObjectId.createFromTime(Math.floor(START / 1000)), id: 'session-1', userId: 'owner', status,
  createdAt: new Date(START), updatedAt: new Date(START), llmMeta: { lockedAt: null, lockToken: '', savedSections: ['a'.repeat(3000)] }, ...extra });

async function runCron(model, service, resume, now, refund) {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    const result = await runConsultationRecovery({}, { now, connectDb: async () => {}, adapters: [[service, 'M', {}]], models: { M: model },
      loadAdapter: async () => ({ resumeConsultationOnServer: resume }), settleRefund: refund });
    return { result, warns: warn.mock.calls.map(c => c[0]) };
  } finally { warn.mockRestore(); log.mockRestore(); }
}

test('진전 크기 판정: 기준선 대비 1000자 이상 늘 때만 진전, 기준선은 진전 때만 오른다', () => {
  const first = stuck.nextDeliveryWatch(undefined, 5000, START);
  expect(first).toMatchObject({ baseline: 5000, stalls: 1 });
  const noise = stuck.nextDeliveryWatch(first, 5900, START);
  expect(noise).toMatchObject({ baseline: 5000, stalls: 2 });
  expect(stuck.nextDeliveryWatch(noise, 6100, START)).toMatchObject({ baseline: 6100, stalls: 0 });
  expect(stuck.deliveryProgressSize({ a: 'x', updatedAt: new Date(), generationError: { message: 'y'.repeat(5000) }, llmMeta: { lockedAt: 'z'.repeat(5000) } }))
    .toBe(stuck.deliveryProgressSize({ a: 'x', llmMeta: {} }));
});

test('6일이 지난 정체 문서는 시도 횟수와 무관하게 7일 무시 창 전에 확정 대상이다', () => {
  expect(stuck.shouldSettleStuck({ createdAt: new Date(START) }, START + 6 * 86400000)).toBe(true);
  expect(stuck.shouldSettleStuck({ createdAt: new Date(START) }, START + 5 * 86400000)).toBe(false);
  expect(stuck.shouldSettleStuck({ _id: Types.ObjectId.createFromTime(Math.floor(START / 1000)) }, START + 6 * 86400000)).toBe(true);
  expect(stuck.shouldSettleStuck({ deliveryWatch: { stalls: 6 } }, START)).toBe(true);
});

test('partial 이 진전 없이 6번 복구되면 다음 크론에서 generation_failed 로 확정하고 공용 환불을 부른다', async () => {
  const model = memoryModel(baseDoc('partial'));
  const resume = jest.fn(async () => new Response('{}', { status: 503 }));
  const refund = jest.fn(async () => ({ refundStatus: 'refunded' }));
  let warns = [];
  for (let i = 0; i < 7; i += 1) ({ warns } = await runCron(model, 'new-year-ai', resume, START + i * 600000, refund));
  expect(resume).toHaveBeenCalledTimes(6);
  expect(model.doc.status).toBe('generation_failed');
  expect(model.doc.llmMeta.refundEligibleAt).toBeTruthy();
  expect(model.doc.generationError.code).toBe('DELIVERY_STUCK');
  expect(refund).toHaveBeenCalledWith({}, { service: 'new-year-ai', id: 'session-1', userId: 'owner' });
  expect(warns).toContain('paid_delivery_stuck_settled');
});

test('진전이 있는 동안은 확정하지 않는다', async () => {
  const model = memoryModel(baseDoc('partial'));
  const resume = jest.fn(async () => { model.doc.llmMeta.savedSections.push('b'.repeat(2000)); return new Response('{}', { status: 202 }); });
  for (let i = 0; i < 10; i += 1) await runCron(model, 'life-book-ai', resume, START + i * 600000);
  expect(resume).toHaveBeenCalledTimes(10);
  expect(model.doc.status).toBe('partial');
});

test('본문이 완성된 delivery_pending 정체는 구제 전달(completed)하고 미차감을 표시한다', async () => {
  const model = memoryModel(baseDoc('delivery_pending', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  const resume = jest.fn();
  await runCron(model, 'life-book-ai', resume, START + 3600000);
  expect(resume).not.toHaveBeenCalled();
  expect(model.doc.status).toBe('completed');
  expect(model.doc.llmMeta).toMatchObject({ usageSettlement: 'failed', usageSettlementReason: 'DELIVERY_STUCK' });
  expect(model.doc.llmMeta.savedSections[0]).toHaveLength(3000);
});

test('살아 있는 lease 가 있으면 확정하지 않는다', async () => {
  const now = START + 3600000;
  const doc = baseDoc('partial', { deliveryWatch: { baseline: 1, stalls: 6 } });
  doc.llmMeta.lockedAt = new Date(now - 30000).toISOString();
  const model = memoryModel(doc);
  const out = await stuck.settleStuckConsultation({}, { service: 'new-year-ai', model, doc: model.doc, now, refund: jest.fn() });
  expect(out.outcome).toBe('leased');
  expect(model.doc.status).toBe('partial');
});

test('공용 상태 환불이 없는 서비스는 상태를 바꾸지 않고 경보만 남긴 채 이어쓰기를 계속한다', async () => {
  const model = memoryModel(baseDoc('partial', { deliveryWatch: { baseline: 1, stalls: 9 } }));
  const resume = jest.fn(async () => new Response('{}', { status: 503 }));
  const { warns } = await runCron(model, 'astrology-ai', resume, START + 3600000);
  expect(resume).toHaveBeenCalledTimes(1);
  expect(model.doc.status).toBe('partial');
  expect(warns).toContain('paid_delivery_stuck_unsettled');
  expect(warns).not.toContain('paid_delivery_stuck_settled');
});

test('확정 실패 뒤 환불이 예외여도 generation_failed 는 남아 기존 환불 크론이 이어 정산한다', async () => {
  const model = memoryModel(baseDoc('generating', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  const out = await stuck.settleStuckConsultation({}, { service: 'new-year-ai', model, doc: model.doc, now: START + 3600000, refund: async () => { throw new Error('pg down'); } });
  expect(out).toEqual({ outcome: 'generation_failed', refundStatus: 'pending' });
  expect(model.doc.status).toBe('generation_failed');
  expect(model.doc.llmMeta.refundEligibleAt).toBeTruthy();
});

// S16: 공용 설정자는 완성 판정(isComplete)을 통과한 delivery_pending 만 구제 전달하고, 미완성은 실패+환불한다.
test('완성 판정을 통과하지 못한 delivery_pending 정체는 구제 전달하지 않고 generation_failed + 공용 환불로 확정한다', async () => {
  const model = memoryModel(baseDoc('delivery_pending', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  const refund = jest.fn(async () => ({ refundStatus: 'refunded' }));
  const out = await stuck.settleStuckConsultation({}, { service: 'life-book-ai', model, doc: model.doc, now: START + 3600000, refund, isComplete: () => false });
  expect(out).toEqual({ outcome: 'generation_failed', refundStatus: 'refunded' });
  expect(model.doc.status).toBe('generation_failed');
  expect(refund).toHaveBeenCalledWith({}, { service: 'life-book-ai', id: 'session-1', userId: 'owner' });
});

test('복구 크론은 어댑터의 isStuckDeliveryComplete 를 공용 설정자에 넘긴다', async () => {
  const model = memoryModel(baseDoc('delivery_pending', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  const refund = jest.fn(async () => ({ refundStatus: 'refunded' }));
  const isStuckDeliveryComplete = jest.fn(() => false);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await runConsultationRecovery({}, { now: START + 3600000, connectDb: async () => {}, adapters: [['life-book-ai', 'M', {}]], models: { M: model },
      loadAdapter: async () => ({ resumeConsultationOnServer: jest.fn(), isStuckDeliveryComplete }), settleRefund: refund });
  } finally { warn.mockRestore(); log.mockRestore(); }
  expect(isStuckDeliveryComplete).toHaveBeenCalled();
  expect(model.doc.status).toBe('generation_failed');
});

test('공용 상태 환불이 아닌 정체 설정자는 어댑터의 settleStuckDelivery 로만 확정하고, 없으면 경보만 남긴다', async () => {
  const doc = baseDoc('partial', { deliveryWatch: { baseline: 1, stalls: 6 } });
  const model = memoryModel(doc);
  const settleStuckDelivery = jest.fn(async () => ({ outcome: 'generation_failed', refundStatus: 'refunded' }));
  const resume = jest.fn(async () => new Response('{}', { status: 202 }));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  let result;
  try {
    result = await runConsultationRecovery({}, { now: START + 3600000, connectDb: async () => {}, adapters: [[stuck.STUCK_SETTLERS[0], 'M', {}]], models: { M: model },
      loadAdapter: async () => ({ resumeConsultationOnServer: resume, settleStuckDelivery }) });
  } finally { warn.mockRestore(); log.mockRestore(); }
  expect(settleStuckDelivery).toHaveBeenCalledWith({}, expect.objectContaining({ doc: expect.objectContaining({ id: 'session-1' }), now: START + 3600000, model }));
  expect(resume).not.toHaveBeenCalled();
  expect(result.outcomes).toContainEqual({ service: stuck.STUCK_SETTLERS[0], stuck: 'generation_failed', refundStatus: 'refunded' });
});

test('모델이 없는 어댑터는 자기 recordDeliveryWatch 로 진전을 기록한다', async () => {
  const recordDeliveryWatch = jest.fn(async () => null);
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await runConsultationRecovery({}, { now: START, connectDb: async () => {}, adapters: [['fortune-tea-house', null, {}]], models: {},
      loadAdapter: async () => ({ findRecoverableConsultations: async () => [{ resultId: 'r1', userId: 'owner' }], resumeConsultationOnServer: async () => new Response('{}', { status: 202 }), recordDeliveryWatch }) });
  } finally { log.mockRestore(); }
  expect(recordDeliveryWatch).toHaveBeenCalledWith({}, expect.objectContaining({ resultId: 'r1' }), START);
});
