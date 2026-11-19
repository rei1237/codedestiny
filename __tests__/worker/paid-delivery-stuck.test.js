/** @jest-environment node */
// 정체 감시: 같은 상담이 진전 없이 복구되면 1시간 안에 구제 전달 또는 '다시 시도 가능' 실패로 끝나야 한다.
// 2026-11-19 다시 시도 우선: 정체는 즉시 환불하지 않는다. 결과를 숨긴 채 무료 다시 시도를 열고, 7일 뒤(또는 고객 요청 시) 기존 공용 환불로 넘긴다.
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

test('partial 이 진전 없이 6번 복구되면 다음 크론에서 다시 시도 가능한 실패로 두고 환불하지 않는다', async () => {
  const model = memoryModel(baseDoc('partial'));
  const resume = jest.fn(async () => new Response('{}', { status: 503 }));
  const refund = jest.fn(async () => ({ refundStatus: 'refunded' }));
  let warns = [];
  for (let i = 0; i < 7; i += 1) ({ warns } = await runCron(model, 'new-year-ai', resume, START + i * 600000, refund));
  expect(resume).toHaveBeenCalledTimes(6);
  expect(model.doc.status).toBe('generation_failed');
  expect(model.doc.llmMeta.refundEligibleAt).toBeUndefined();
  expect(model.doc.generationError.code).toBe('DELIVERY_STUCK');
  const settledAt = START + 6 * 600000;
  expect(new Date(model.doc.llmMeta.retryable.since).getTime()).toBe(settledAt);
  expect(new Date(model.doc.llmMeta.retryable.refundAt).getTime()).toBe(settledAt + stuck.RETRY_REFUND_AFTER_MS);
  expect(model.doc.llmMeta.savedSections[0]).toHaveLength(3000); // 완성된 장은 그대로
  expect(refund).not.toHaveBeenCalled();
  expect(warns).toContain('paid_delivery_stuck_settled');
});

test('다시 시도 창은 복구 무시 창과 같은 7일이다', () => {
  expect(stuck.RETRY_REFUND_AFTER_MS).toBe(7 * 86400000);
  expect(stuck.RETRY_REFUND_AFTER_MS).toBe(stuck.RECOVERY_WINDOW_MS);
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

test('다시 시도 창이 지난 뒤 다시 정체되면 바로 환불로 넘기고, 환불 예외여도 기존 환불 크론이 이어 정산한다', async () => {
  const model = memoryModel(baseDoc('generating', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  model.doc.llmMeta.retryable = { since: new Date(START), refundAt: new Date(START + 1000), code: 'DELIVERY_STUCK' };
  const out = await stuck.settleStuckConsultation({}, { service: 'new-year-ai', model, doc: model.doc, now: START + 3600000, refund: async () => { throw new Error('pg down'); } });
  expect(out).toEqual({ outcome: 'generation_failed', refundStatus: 'pending' });
  expect(model.doc.status).toBe('generation_failed');
  expect(model.doc.llmMeta.refundEligibleAt).toBeTruthy();
});

// S16: 공용 설정자는 완성 판정(isComplete)을 통과한 delivery_pending 만 구제 전달하고, 미완성은 실패+환불한다.
test('완성 판정을 통과하지 못한 delivery_pending 정체는 구제 전달하지 않고 다시 시도 가능한 실패로 둔다', async () => {
  const model = memoryModel(baseDoc('delivery_pending', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  const refund = jest.fn(async () => ({ refundStatus: 'refunded' }));
  const now = START + 3600000;
  const out = await stuck.settleStuckConsultation({}, { service: 'life-book-ai', model, doc: model.doc, now, refund, isComplete: () => false });
  expect(out).toEqual({ outcome: 'retryable', refundAt: new Date(now + stuck.RETRY_REFUND_AFTER_MS).toISOString() });
  expect(model.doc.status).toBe('generation_failed');
  expect(refund).not.toHaveBeenCalled();
});

test('다시 정체돼도 처음 정한 환불 시각을 늘리지 않는다', async () => {
  const model = memoryModel(baseDoc('partial', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  const refundAt = new Date(START + 2 * 86400000);
  model.doc.llmMeta.retryable = { since: new Date(START), refundAt, code: 'DELIVERY_STUCK', reopens: 1 };
  const out = await stuck.settleStuckConsultation({}, { service: 'new-year-ai', model, doc: model.doc, now: START + 3600000, refund: jest.fn() });
  expect(out.outcome).toBe('retryable');
  expect(new Date(model.doc.llmMeta.retryable.refundAt).getTime()).toBe(refundAt.getTime());
  expect(new Date(model.doc.llmMeta.retryable.since).getTime()).toBe(START);
  expect(model.doc.llmMeta.retryable.reopens).toBe(1);
});

// 공용 다시 시도 헬퍼: 같은 결제 건(소유자·문서 id)만, 환불 전, 창 안에서만 빠진 장 이어쓰기로 되돌린다.
const retryableDoc = (now, extra = {}) => baseDoc('generation_failed', { deliveryWatch: { baseline: 1, stalls: 6 },
  generationError: { code: 'DELIVERY_STUCK' }, ...extra, llmMeta: { lockedAt: null, lockToken: '', savedSections: ['a'.repeat(3000)],
    retryable: { since: new Date(now), refundAt: new Date(now + stuck.RETRY_REFUND_AFTER_MS), code: 'DELIVERY_STUCK' }, ...(extra.llmMeta || {}) } });

test('다시 시도는 완성된 장을 두고 partial 로 되돌리며 정체 기록과 오류만 지운다', async () => {
  const model = memoryModel(retryableDoc(START));
  const out = await stuck.reopenRetryableConsultation(model, { id: 'session-1', userId: 'owner' }, START + 60000);
  expect(out).toEqual({ ok: true, status: 'partial' });
  expect(model.doc.status).toBe('partial');
  expect(model.doc.generationError).toBeNull();
  expect(model.doc.deliveryWatch).toBeNull();
  expect(model.doc.llmMeta.savedSections[0]).toHaveLength(3000);
  expect(model.doc.llmMeta.retryable).toMatchObject({ reopens: 1, code: 'DELIVERY_STUCK' });
  expect(new Date(model.doc.llmMeta.retryable.refundAt).getTime()).toBe(START + stuck.RETRY_REFUND_AFTER_MS);
  expect(model.doc.llmMeta.refundEligibleAt).toBeUndefined();
});

test('다시 시도는 다른 계정·환불 시작·환불 대상·창 만료·다시 시도 표시 없는 실패를 열지 않는다', async () => {
  const cases = [
    [retryableDoc(START), { id: 'session-1', userId: 'intruder' }, START, 'NOT_FOUND'],
    [retryableDoc(START, { llmMeta: { deliveryRefund: { status: 'pending' } } }), null, START, 'REFUND_STARTED'],
    [retryableDoc(START, { llmMeta: { refundEligibleAt: new Date(START).toISOString() } }), null, START, 'REFUND_STARTED'],
    [retryableDoc(START, { llmMeta: { billingCleanupPending: true } }), null, START, 'REFUND_STARTED'],
    [retryableDoc(START), null, START + stuck.RETRY_REFUND_AFTER_MS, 'RETRY_WINDOW_EXPIRED'],
    [baseDoc('generation_failed'), null, START, 'NOT_RETRYABLE'],
    [retryableDoc(START, { status: 'completed' }), null, START, 'NOT_RETRYABLE'],
  ];
  for (const [doc, owner, now, reason] of cases) {
    const model = memoryModel(doc);
    const before = model.doc.status;
    expect(await stuck.reopenRetryableConsultation(model, owner || { id: 'session-1', userId: 'owner' }, now)).toEqual({ ok: false, reason });
    expect(model.doc.status).toBe(before);
  }
});

test('고객 환불 요청은 다시 시도 가능한 실패에만 환불 대상 표시를 붙이고 다시 시도를 닫는다', async () => {
  const model = memoryModel(retryableDoc(START));
  expect(await stuck.markRetryableRefundDue(model, { id: 'session-1', userId: 'owner' }, START + 1000, 'CUSTOMER_REQUEST')).toEqual({ ok: true });
  expect(model.doc.llmMeta.refundEligibleAt).toBe(new Date(START + 1000).toISOString());
  expect(model.doc.llmMeta.retryable.refundReason).toBe('CUSTOMER_REQUEST');
  expect((await stuck.reopenRetryableConsultation(model, { id: 'session-1', userId: 'owner' }, START + 2000)).reason).toBe('REFUND_STARTED');
  const other = memoryModel(baseDoc('generation_failed'));
  expect(await stuck.markRetryableRefundDue(other, { id: 'session-1', userId: 'owner' }, START, 'CUSTOMER_REQUEST')).toEqual({ ok: false, reason: 'NOT_RETRYABLE' });
  expect(other.doc.llmMeta.refundEligibleAt).toBeUndefined();
});

test('창이 지난 다시 시도 가능 실패와 다시 연 뒤 방치된 partial 은 환불 대상으로 넘기고, 창 안·살아 있는 lease 는 두지 않는다', async () => {
  const due = START + stuck.RETRY_REFUND_AFTER_MS;
  const expired = memoryModel(retryableDoc(START));
  expect(await stuck.expireRetryableConsultations(expired, due)).toEqual({ expired: 1 });
  expect(expired.doc.status).toBe('generation_failed');
  expect(expired.doc.llmMeta.refundEligibleAt).toBe(new Date(due).toISOString());
  expect(expired.doc.llmMeta.retryable.refundReason).toBe('RETRY_WINDOW_EXPIRED');
  expect(await stuck.expireRetryableConsultations(expired, due + 1)).toEqual({ expired: 0 }); // 한 번만

  const open = memoryModel(retryableDoc(START));
  expect(await stuck.expireRetryableConsultations(open, due - 1)).toEqual({ expired: 0 });
  expect(open.doc.llmMeta.refundEligibleAt).toBeUndefined();

  const reopened = memoryModel(retryableDoc(START, { status: 'partial' }));
  expect(await stuck.expireRetryableConsultations(reopened, due)).toEqual({ expired: 1 });
  expect(reopened.doc.status).toBe('generation_failed');
  expect(reopened.doc.generationError.code).toBe('RETRY_WINDOW_EXPIRED');

  const leased = memoryModel(retryableDoc(START, { status: 'partial' }));
  leased.doc.llmMeta.lockedAt = new Date(due - 30000).toISOString();
  expect(await stuck.expireRetryableConsultations(leased, due)).toEqual({ expired: 0 });
  expect(leased.doc.status).toBe('partial');

  const plain = memoryModel(baseDoc('generation_failed'));
  expect(await stuck.expireRetryableConsultations(plain, due)).toEqual({ expired: 0 });
});

test('복구 크론은 기존 환불 크론보다 먼저 창이 지난 다시 시도 가능 실패를 환불 대상으로 넘긴다', async () => {
  const due = START + stuck.RETRY_REFUND_AFTER_MS;
  const model = memoryModel(retryableDoc(START));
  let seenAtRefund;
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await runConsultationRecovery({}, { now: due, connectDb: async () => {}, adapters: [['new-year-ai', 'M', {}]], models: { M: model },
      refundRecovery: async () => { seenAtRefund = model.doc.llmMeta.refundEligibleAt; return { outcomes: [] }; },
      loadAdapter: async () => ({ resumeConsultationOnServer: jest.fn() }) });
  } finally { log.mockRestore(); }
  expect(seenAtRefund).toBe(new Date(due).toISOString());
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
