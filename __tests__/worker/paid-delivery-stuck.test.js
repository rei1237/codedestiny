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

// 다시 시도로 재개방한 문서는 재개방 시각부터 나이를 잰다 — 6일째 열린 다시 시도가 다음 크론에 바로 다시 확정되지 않게.
// 환불 시각(생성 + 7일)은 재개방과 무관하게 그대로다.
test('재개방한 문서의 정체 나이는 재개방 시각부터 재고, 환불 시각은 생성 + 7일 그대로다', () => {
  const day6 = START + 6 * 86400000;
  const generic = { createdAt: new Date(START), llmMeta: { retryable: { reopenedAt: new Date(day6) } } };
  const heukwol = { createdAt: new Date(START), metadata: { retryReopenedAt: new Date(day6) } };
  expect(stuck.shouldSettleStuck(generic, day6 + 600000)).toBe(false);
  expect(stuck.shouldSettleStuck(heukwol, day6 + 600000)).toBe(false);
  const naming = { createdAt: new Date(START), result: { namingPrompt: { retryable: { reopenedAt: new Date(day6) } } } };
  expect(stuck.shouldSettleStuck(naming, day6 + 600000)).toBe(false);
  expect(stuck.shouldSettleStuck({ createdAt: new Date(START) }, day6 + 600000)).toBe(true);
  expect(stuck.shouldSettleStuck({ ...generic, deliveryWatch: { stalls: 6 } }, day6 + 600000)).toBe(true);
  expect(stuck.retryRefundAt(generic, day6).getTime()).toBe(START + stuck.RETRY_REFUND_AFTER_MS);
  expect(stuck.retryRefundAt(heukwol, day6).getTime()).toBe(START + stuck.RETRY_REFUND_AFTER_MS);
});

test('복구 크론은 정체 나이 판정에 쓰는 재개방 시각을 함께 읽는다', async () => {
  const model = memoryModel(baseDoc('partial'));
  let selected = '';
  model.find = () => ({ sort() { return this; }, limit() { return this; }, select(fields) { selected = fields; return this; }, lean: async () => [] });
  await runCron(model, 'new-year-ai', jest.fn(), START);
  expect(selected.split(/\s+/)).toEqual(expect.arrayContaining(['llmMeta.retryable.reopenedAt', 'metadata.retryReopenedAt']));
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
  // 환불 시각은 생성(결제·생성 시작) 시각 + 7일이다(2026-11-19 사용자 결정) — 다시 시도 가능 전환 시각이 아니다.
  expect(new Date(model.doc.llmMeta.retryable.refundAt).getTime()).toBe(START + stuck.RETRY_REFUND_AFTER_MS);
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

// 토스 문서는 다시 시도 화면이 없고 공용 환불 크론(runPendingConsultationRefunds)이 accessSource toss 를 고르지 않는다.
// 운영 복구(supportRecovery) 문서는 고객 다시 시도 흐름 밖이다. 둘 다 다시 시도 대기로 두면 7일 방치되므로 바로 정산한다.
test.each([
  ['토스', { accessSource: 'toss' }, 'manual_review'],
  ['운영 복구', { supportRecovery: true }, 'refunded'],
])('%s 문서의 정체 확정은 다시 시도 대기로 두지 않고 바로 정산한다', async (_label, extra, refundStatus) => {
  const doc = baseDoc('partial', { deliveryWatch: { baseline: 1, stalls: 6 }, ...(extra.accessSource ? { accessSource: extra.accessSource } : {}) });
  if (extra.supportRecovery) doc.llmMeta.supportRecovery = { active: true };
  const model = memoryModel(doc);
  const refund = jest.fn(async () => ({ refundStatus }));
  const out = await stuck.settleStuckConsultation({}, { service: 'life-book-ai', model, doc: model.doc, now: START + 3600000, refund });
  expect(out).toEqual({ outcome: 'generation_failed', refundStatus });
  expect(refund).toHaveBeenCalledWith({}, { service: 'life-book-ai', id: 'session-1', userId: 'owner' });
  expect(model.doc.status).toBe('generation_failed');
  expect(model.doc.llmMeta.refundEligibleAt).toBeTruthy();
  expect(model.doc.llmMeta.retryable).toBeUndefined();
});

// S16: 공용 설정자는 완성 판정(isComplete)을 통과한 delivery_pending 만 구제 전달하고, 미완성은 실패+환불한다.
test('완성 판정을 통과하지 못한 delivery_pending 정체는 구제 전달하지 않고 다시 시도 가능한 실패로 둔다', async () => {
  const model = memoryModel(baseDoc('delivery_pending', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  const refund = jest.fn(async () => ({ refundStatus: 'refunded' }));
  const now = START + 3600000;
  const out = await stuck.settleStuckConsultation({}, { service: 'life-book-ai', model, doc: model.doc, now, refund, isComplete: () => false });
  expect(out).toEqual({ outcome: 'retryable', refundAt: new Date(START + stuck.RETRY_REFUND_AFTER_MS).toISOString() });
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

test('환불 시각은 생성 시각 + 7일이다: 6일 넘어 정체돼도 남은 기간만 주고, 생성 시각을 모르면 _id 시각, 그것도 없으면 지금 + 7일', () => {
  expect(stuck.retryRefundAt({ createdAt: new Date(START) }, START + 6.5 * 86400000).getTime()).toBe(START + 7 * 86400000);
  expect(stuck.retryRefundAt({ _id: Types.ObjectId.createFromTime(Math.floor(START / 1000)) }, START + 86400000).getTime()).toBe(START + 7 * 86400000);
  expect(stuck.retryRefundAt({}, START).getTime()).toBe(START + 7 * 86400000);
});

test('생성 7일이 이미 지난 뒤 처음 정체되면 다시 시도 가능으로 두지 않고 바로 환불로 넘긴다', async () => {
  const model = memoryModel(baseDoc('partial', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  const refund = jest.fn(async () => ({ refundStatus: 'refunded' }));
  const out = await stuck.settleStuckConsultation({}, { service: 'life-book-ai', model, doc: model.doc, now: START + 7 * 86400000 + 1000, refund });
  expect(out).toEqual({ outcome: 'generation_failed', refundStatus: 'refunded' });
  expect(model.doc.llmMeta.refundEligibleAt).toBeTruthy();
  expect(refund).toHaveBeenCalledTimes(1);
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

test('요청 중 종결 실패의 다시 시도 표지: 창 안이면 생성 + 7일(이전 값 유지), 창이 지났거나 환불이 시작됐으면 null(기존 즉시 환불)', () => {
  const fresh = baseDoc('partial');
  expect(stuck.retryableFailureMeta(fresh, START + 1000, 'LLM_ERROR')).toEqual({ since: new Date(START + 1000), refundAt: new Date(START + stuck.RETRY_REFUND_AFTER_MS), code: 'LLM_ERROR' });
  const again = retryableDoc(START, { status: 'partial' });
  const kept = stuck.retryableFailureMeta(again, START + 5000, 'LLM_ERROR');
  expect(kept).toMatchObject({ code: 'LLM_ERROR', since: again.llmMeta.retryable.since, refundAt: again.llmMeta.retryable.refundAt });
  expect(stuck.retryableFailureMeta(fresh, START + stuck.RETRY_REFUND_AFTER_MS, 'LLM_ERROR')).toBeNull();
  expect(stuck.retryableFailureMeta(baseDoc('partial', { llmMeta: { refundEligibleAt: 'x' } }), START, 'LLM_ERROR')).toBeNull();
  expect(stuck.retryableFailureMeta(baseDoc('partial', { llmMeta: { deliveryRefund: { status: 'pending' } } }), START, 'LLM_ERROR')).toBeNull();
});

test('응답용 다시 시도 상태는 창 안·환불 전 다시 시도 가능 실패에만 붙는다', () => {
  expect(stuck.publicRetryState(retryableDoc(START), START + 1000)).toEqual({ retryable: true, refundAt: new Date(START + stuck.RETRY_REFUND_AFTER_MS).toISOString() });
  expect(stuck.publicRetryState(retryableDoc(START), START + stuck.RETRY_REFUND_AFTER_MS)).toBeNull();
  expect(stuck.publicRetryState(retryableDoc(START, { llmMeta: { refundEligibleAt: 'x' } }), START)).toBeNull();
  expect(stuck.publicRetryState(retryableDoc(START, { status: 'partial' }), START)).toBeNull();
  expect(stuck.publicRetryState(baseDoc('generation_failed'), START)).toBeNull();
});

test('다시 시도 reset 은 같은 CAS 갱신에 실리고 상태·다시 시도 표지는 덮지 못한다', async () => {
  const model = memoryModel(retryableDoc(START));
  const reset = jest.fn(fresh => ({ 'llmMeta.waveCount': 0, 'llmMeta.sections': [{ ok: true, attempts: 2 }, { ok: false, attempts: 0, failure: null }], status: 'completed', 'llmMeta.retryable.refundAt': null }));
  const out = await stuck.reopenRetryableConsultation(model, { id: 'session-1', userId: 'owner' }, START + 60000, { reset });
  expect(out).toEqual({ ok: true, status: 'partial' });
  expect(reset).toHaveBeenCalledWith(expect.objectContaining({ id: 'session-1', status: 'generation_failed' }));
  expect(model.updateOne).toHaveBeenCalledTimes(1);
  expect(model.doc.status).toBe('partial');
  expect(model.doc.llmMeta.waveCount).toBe(0);
  expect(model.doc.llmMeta.sections[1]).toEqual({ ok: false, attempts: 0, failure: null });
  expect(new Date(model.doc.llmMeta.retryable.refundAt).getTime()).toBe(START + stuck.RETRY_REFUND_AFTER_MS);
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

test('기한 만료로 닫힌 다시 시도 실패는 붙잡아 둔 결제 증빙 claim 을 푼다(토스 문서는 제외)', async () => {
  const due = START + stuck.RETRY_REFUND_AFTER_MS;
  const held = memoryModel(retryableDoc(START, { idempotencyKey: 'paid-request', llmMeta: { ...retryableDoc(START).llmMeta, claimEvidenceIds: ['receipt-1', 'paid-request'] } }));
  const toss = memoryModel(retryableDoc(START, { accessSource: 'toss', idempotencyKey: 'toss-request', llmMeta: { ...retryableDoc(START).llmMeta, claimEvidenceIds: ['receipt-2'] } }));
  const releaseClaim = jest.fn(async () => ({ released: 1 }));
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await runConsultationRecovery({}, { now: due, connectDb: async () => {}, adapters: [['new-year-ai', 'M', {}], ['life-book-ai', 'T', {}]], models: { M: held, T: toss },
      releaseClaim, refundRecovery: async () => ({ outcomes: [] }), loadAdapter: async () => ({ resumeConsultationOnServer: jest.fn() }) });
  } finally { log.mockRestore(); }
  expect(held.doc.llmMeta.retryable.refundReason).toBe('RETRY_WINDOW_EXPIRED');
  expect(releaseClaim).toHaveBeenCalledTimes(1);
  expect(releaseClaim).toHaveBeenCalledWith({}, { userId: held.doc.userId, requestId: 'paid-request', evidenceIds: ['receipt-1', 'paid-request'] });
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

// 2026-11-22 D: 자체 다시 시도·보류 환불이 있는 라우트(R10)의 정체 확정 공용 헬퍼.
describe('settleStuckRetryFirst', () => {
  const quiet = async work => { const warn = jest.spyOn(console, 'warn').mockImplementation(() => {}); try { return await work(); } finally { warn.mockRestore(); } };
  const settle = (model, now, extra = {}) => quiet(() => stuck.settleStuckRetryFirst({ service: 'svc', model, doc: { id: 'session-1', userId: 'owner' }, now,
    snapshot: async () => ({ evidenceType: 'direct_payment', paymentDocId: 'p1', prepaid: true }), settleRefund: async () => ({ refundStatus: 'refunded' }), ...extra }));

  test('창 안의 정체는 저장된 장을 두고 다시 시도 가능으로 둔다(환불 없음, 접근 증빙 보존)', async () => {
    const model = memoryModel(baseDoc('partial'));
    const settleRefund = jest.fn();
    expect(await settle(model, START + 3600000, { settleRefund })).toEqual({ outcome: 'retryable', refundAt: new Date(START + 7 * 86400000).toISOString() });
    expect(model.doc).toMatchObject({ status: 'generation_failed', generationError: { code: 'DELIVERY_STUCK' },
      llmMeta: { savedSections: ['a'.repeat(3000)], retryable: { code: 'DELIVERY_STUCK', access: { evidenceType: 'direct_payment', paymentDocId: 'p1' } } } });
    expect(model.doc.llmMeta.refundEligibleAt).toBeUndefined();
    expect(settleRefund).not.toHaveBeenCalled();
    expect((await stuck.reopenRetryableConsultation(model, { id: 'session-1', userId: 'owner' }, START + 7200000)).ok).toBe(true);
  });

  test('창이 지난 정체는 환불 대상으로 넘기고 서비스의 보류 환불을 한 번 부른다', async () => {
    const model = memoryModel(baseDoc('partial'));
    const settleRefund = jest.fn(async () => ({ refundStatus: 'refunded' }));
    expect(await settle(model, START + 8 * 86400000, { settleRefund })).toEqual({ outcome: 'generation_failed', refundStatus: 'refunded' });
    expect(settleRefund).toHaveBeenCalledWith({ id: 'session-1', userId: 'owner' });
    expect(model.doc.llmMeta).toMatchObject({ refundEligibleAt: expect.any(String), retryable: { refundReason: 'RETRY_WINDOW_EXPIRED', access: { paymentDocId: 'p1' } } });
    expect(await settle(model, START + 8 * 86400000, { settleRefund })).toEqual({ outcome: 'progressed' });
    expect(settleRefund).toHaveBeenCalledTimes(1);
  });

  test('살아 있는 생성은 leased, 보류 대상이 아닌 문서(토스)는 손대지 않고 unsettled, 증빙 조회 실패는 pending', async () => {
    const live = memoryModel(baseDoc('partial'));
    expect(await settle(live, START + 3600000, { isLive: () => true })).toEqual({ outcome: 'leased' });
    const toss = memoryModel(baseDoc('partial', { accessSource: 'toss' }));
    expect(await settle(toss, START + 3600000, { hold: doc => doc.accessSource !== 'toss' })).toEqual({ outcome: 'unsettled' });
    const failing = memoryModel(baseDoc('partial'));
    expect(await settle(failing, START + 3600000, { snapshot: async () => { throw new Error('db'); } })).toEqual({ outcome: 'pending' });
    for (const model of [live, toss, failing]) expect(model.doc.status).toBe('partial');
  });

  test('표지 위치(metaKey)와 소유 키(idKey)를 서비스별로 바꿀 수 있다', async () => {
    const model = memoryModel({ _id: 'x', executionId: 'exec-1', userId: 'owner', status: 'generating', createdAt: new Date(START), updatedAt: new Date(START), result: { namingPrompt: { body: 'kept' } } });
    const out = await quiet(() => stuck.settleStuckRetryFirst({ service: 'svc', model, doc: { executionId: 'exec-1', userId: 'owner' }, now: START + 3600000, idKey: 'executionId', metaKey: 'result.namingPrompt' }));
    expect(out.outcome).toBe('retryable');
    expect(model.doc.result.namingPrompt).toMatchObject({ body: 'kept', retryable: { code: 'DELIVERY_STUCK' } });
  });
});

test('설정자가 unsettled 로 돌려주면 크론은 기존처럼 이어쓴다', async () => {
  const model = memoryModel(baseDoc('partial', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  const resume = jest.fn(async () => new Response('{}', { status: 202 }));
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await runConsultationRecovery({}, { now: START + 3600000, connectDb: async () => {}, adapters: [[stuck.STUCK_SETTLERS[0], 'M', {}]], models: { M: model },
      loadAdapter: async () => ({ resumeConsultationOnServer: resume, settleStuckDelivery: async () => ({ outcome: 'unsettled' }) }) });
  } finally { log.mockRestore(); }
  expect(resume).toHaveBeenCalledTimes(1);
});

// 2026-11-22 감사 B2: 증빙 조회 실패(pending)도 이어쓰기·회전을 거친다. 건너뛰면 가장 오래된 한 건이 서비스 크론을 7일간 막는다.
test('설정자가 pending 으로 돌려주면 크론은 이어쓰고 updatedAt 을 회전한다', async () => {
  const model = memoryModel(baseDoc('partial', { deliveryWatch: { baseline: 1, stalls: 6 } }));
  const before = model.doc.updatedAt.getTime();
  const resume = jest.fn(async () => new Response('{}', { status: 202 }));
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    await runConsultationRecovery({}, { now: START + 3600000, connectDb: async () => {}, adapters: [[stuck.STUCK_SETTLERS[0], 'M', {}]], models: { M: model },
      loadAdapter: async () => ({ resumeConsultationOnServer: resume, settleStuckDelivery: async () => ({ outcome: 'pending' }) }) });
  } finally { log.mockRestore(); }
  expect(resume).toHaveBeenCalledTimes(1);
  expect(model.doc.updatedAt.getTime()).toBeGreaterThan(before);
});
