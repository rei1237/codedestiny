/** @jest-environment node */
// 2026-11-28 S5: 자동 환불이 닿지 않는 유료 전달 실패(보류된 서사·토스·수동 검토 상담)를 운영자에게 알린다.
// 보류 → 표식 → 전달 성공 뒤에만 표식 해제, 미전달이면 다음 주기 재발송, 알림에 개인정보 없음.
import { jest } from '@jest/globals';

const DAY = 86400000, NOW = Date.parse('2026-11-28T00:00:00Z'), UID = '64b7f2a1c3d4e5f601234567';
let settleRefund, alertReviews;
const get = (doc, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), doc);
function matches(doc, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some(c => matches(doc, c));
    if (key === '$and') return cond.every(c => matches(doc, c));
    const value = get(doc, key);
    if (cond && typeof cond === 'object' && !(cond instanceof Date) && Object.keys(cond).some(k => k.startsWith('$'))) {
      return Object.entries(cond).every(([op, arg]) => {
        if (op === '$in') return arg.some(a => (a === null ? value == null : String(a) === String(value)));
        if (op === '$exists') return arg ? value !== undefined : value === undefined;
        if (op === '$lte') return value != null && new Date(value).getTime() <= new Date(arg).getTime();
        throw Error(`op ${op}`);
      });
    }
    return cond === null ? value == null : String(value) === String(cond);
  });
}
function apply(doc, update) {
  for (const [path, value] of Object.entries(update.$set || {})) {
    const keys = path.split('.'), end = keys.pop(); let cur = doc; for (const k of keys) cur = cur[k] ??= {}; cur[end] = value;
  }
}
const q = value => ({ lean: async () => structuredClone(value), select() { return this; }, sort() { return this; }, limit() { return this; } });
const store = docs => ({
  docs,
  find: filter => q(docs.filter(d => matches(d, filter))),
  updateOne: async (filter, update) => { const d = docs.find(x => matches(x, filter)); if (d) apply(d, update); return { matchedCount: d ? 1 : 0, modifiedCount: d ? 1 : 0 }; },
});
const narrative = (over = {}) => ({
  _id: 'exec-held-0001-abcdef', userId: UID, featureKey: 'geomancy', reportType: 'geomancyOracle', executionKey: 'paid-narrative:abcdef12',
  idempotencyKey: 'req-1', status: 'pending', refundStatus: 'none', reasonCode: 'PAID_NARRATIVE_EXHAUSTED', lock: { token: '', until: null },
  createdAt: new Date(NOW - 8 * DAY),
  metadata: { paidNarrative: { tasks: [{ id: 'a' }, { id: 'b' }], parts: { a: 'saved A' }, attempts: { a: 1, b: 2 } } },
  ...over,
});
const consult = (over = {}) => ({ id: 'consult-0001-xyz', userId: UID, status: 'generation_failed', createdAt: new Date(NOW - 3 * DAY),
  birth: '1990-01-01', email: 'someone@example.com', llmMeta: { refundEligibleAt: new Date(NOW - DAY).toISOString() }, ...over });

beforeAll(async () => {
  const db = await import('../../worker/lib/db.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn() }));
  ({ settlePaidNarrativeRefund: settleRefund } = await import('../../worker/routes/paid-narrative-retry.js'));
  ({ alertPaidDeliveryReviews: alertReviews } = await import('../../worker/lib/paid-delivery-review-alert.js'));
});

test('증빙 없는 보류는 표식을 세우고, 전달 성공 뒤에만 표식을 내린다', async () => {
  const model = store([narrative()]);
  expect(await settleRefund({}, model.docs[0], 'r', { now: NOW, model, settle: jest.fn(), evidence: async () => ({ ok: false }) })).toBe('admin_review');
  expect(model.docs[0].metadata.paidNarrativeRetry.alertPending).toBe(true);
  const notify = jest.fn(async () => ({ delivered: true }));
  expect(await alertReviews({}, { notify, now: NOW, executionModel: model, consultationModels: {} })).toEqual({ alerted: 1 });
  const { subject, text } = notify.mock.calls[0][0];
  expect(subject).toContain('1건');
  expect(text).toContain('exec-held-00');
  expect(text).toContain('PAID_NARRATIVE_REFUND_EVIDENCE_MISSING');
  expect(text).not.toContain(UID);
  expect(model.docs[0].metadata.paidNarrativeRetry.alertPending).toBe(false);
  // 한 번 알린 건은 다시 보내지 않는다.
  expect(await alertReviews({}, { notify, now: NOW, executionModel: model, consultationModels: {} })).toEqual({ alerted: 0 });
  expect(notify).toHaveBeenCalledTimes(1);
});

test('PG 환불 실패(refund_failed)도 표식을 세운다', async () => {
  const model = store([narrative({ sourceTransactionId: '64b7f2a1c3d4e5f601234599' })]);
  const settle = async (_env, id) => { model.docs.find(d => d._id === id).status = 'failed'; return { status: 'failed' }; };
  expect(await settleRefund({}, model.docs[0], 'r', { now: NOW, model, settle, evidence: async () => ({ ok: true, kind: 'card' }) })).toBe('refund_failed');
  expect(model.docs[0].metadata.paidNarrativeRetry.alertPending).toBe(true);
  const notify = jest.fn(async () => ({ delivered: true }));
  await alertReviews({}, { notify, now: NOW, executionModel: model, consultationModels: {} });
  expect(notify.mock.calls[0][0].text).toContain('REFUND_FAILED');
});

test('미전달(채널 미설정·실패)이면 표식을 그대로 두고 다음 주기에 다시 보낸다', async () => {
  const model = store([narrative({ metadata: { ...narrative().metadata, tossPaidNarrative: true,
    paidNarrativeRetry: { heldAt: new Date(NOW), holdCode: 'PAID_NARRATIVE_REFUND_EVIDENCE_MISSING', alertPending: true } } })]);
  const consultations = store([consult({ accessSource: 'toss' })]);
  const failing = jest.fn(async () => ({ delivered: false, reason: 'unconfigured' }));
  expect(await alertReviews({}, { notify: failing, now: NOW, executionModel: model, consultationModels: { 'new-year-ai': consultations } }))
    .toEqual({ alerted: 0, reason: 'unconfigured' });
  expect(model.docs[0].metadata.paidNarrativeRetry.alertPending).toBe(true);
  expect(consultations.docs[0].llmMeta.operatorAlertedAt).toBeUndefined();
  const notify = jest.fn(async () => ({ delivered: true }));
  expect(await alertReviews({}, { notify, now: NOW, executionModel: model, consultationModels: { 'new-year-ai': consultations } })).toEqual({ alerted: 2 });
  const { text } = notify.mock.calls[0][0];
  expect(text).toContain('[토스]');
  expect(text).toContain('토스 콘솔 환불 요청 승인');
  expect(text).toContain('TOSS_ORDER_REVIEW_REQUIRED');
  for (const secret of [UID, '1990-01-01', 'someone@example.com', 'saved A']) expect(text).not.toContain(secret);
  expect(consultations.docs[0].llmMeta.operatorAlertedAt).toEqual(new Date(NOW));
  expect(model.docs[0].metadata.paidNarrativeRetry.alertPending).toBe(false);
});

test('상담: *_REVIEW 수동 검토는 알리고, 웹 결제의 정상 환불 대기·진행 중 문서는 알리지 않는다', async () => {
  const consultations = store([
    consult({ id: 'review-0001', llmMeta: { deliveryRefund: { status: 'manual_review', code: 'PAYMENT_AMOUNT_REVIEW' } } }),
    consult({ id: 'pending-0001' }),
    consult({ id: 'running-0001', status: 'generating', accessSource: 'toss' }),
  ]);
  const notify = jest.fn(async () => ({ delivered: true }));
  expect(await alertReviews({}, { notify, now: NOW, executionModel: store([]), consultationModels: { 'life-book-ai': consultations } })).toEqual({ alerted: 1 });
  expect(notify.mock.calls[0][0].text).toContain('PAYMENT_AMOUNT_REVIEW');
  expect(notify.mock.calls[0][0].text).not.toContain('pending-0001');
});

test('대상이 없으면 보내지 않는다', async () => {
  const notify = jest.fn();
  expect(await alertReviews({}, { notify, now: NOW, executionModel: store([narrative()]), consultationModels: {} })).toEqual({ alerted: 0 });
  expect(notify).not.toHaveBeenCalled();
});
