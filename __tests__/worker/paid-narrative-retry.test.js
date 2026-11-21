/** @jest-environment node */
// 2026-11-21 C2 retry-first for paid narratives: free retry regenerates only missing parts (saved parts untouched),
// refund at created + 7 days or on request by stored payment evidence, missing evidence → operator review.
import { jest } from '@jest/globals';

const DAY = 86400000, NOW = Date.parse('2026-11-21T00:00:00Z'), UID = '64b7f2a1c3d4e5f601234567';
let reopen, settleRefund, settleDue, prove, findProtected, paidNarrativeRefundEvidence;
const get = (doc, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), doc);
function matches(doc, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some(c => matches(doc, c));
    if (key === '$and') return cond.every(c => matches(doc, c));
    const value = get(doc, key);
    if (cond && typeof cond === 'object' && !(cond instanceof Date) && Object.keys(cond).some(k => k.startsWith('$'))) {
      return Object.entries(cond).every(([op, arg]) => {
        if (op === '$in') return arg.some(a => (a === null ? value == null : String(a) === String(value)));
        if (op === '$ne') return value instanceof Object && arg instanceof Object ? JSON.stringify(value) !== JSON.stringify(arg) : value !== arg;
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
  for (const [path, by] of Object.entries(update.$inc || {})) {
    const keys = path.split('.'), end = keys.pop(); let cur = doc; for (const k of keys) cur = cur[k] ??= {}; cur[end] = (cur[end] || 0) + by;
  }
}
const q = value => ({ lean: async () => structuredClone(value), select() { return this; }, sort() { return this; }, limit() { return this; } });
function store(docs) {
  return {
    docs,
    findOne: filter => q(docs.find(d => matches(d, filter)) || null),
    find: filter => q(docs.filter(d => matches(d, filter))),
    findOneAndUpdate: (filter, update) => { const d = docs.find(x => matches(x, filter)); if (d) apply(d, update); return q(d || null); },
    updateOne: async (filter, update) => { const d = docs.find(x => matches(x, filter)); if (d) apply(d, update); return { matchedCount: d ? 1 : 0, modifiedCount: d ? 1 : 0 }; },
  };
}
const narrative = (over = {}) => ({
  _id: 'exec-1', userId: UID, featureKey: 'geomancy', reportType: 'geomancyOracle', executionKey: 'paid-narrative:abcdef12',
  idempotencyKey: 'req-1', status: 'pending', refundStatus: 'none', reasonCode: 'PAID_NARRATIVE_EXHAUSTED', lock: { token: '', until: null },
  createdAt: new Date(NOW - 2 * DAY),
  metadata: { paidNarrative: { tasks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], parts: { a: 'saved A' }, attempts: { a: 1, b: 2, c: 2 } } },
  ...over,
});

beforeAll(async () => {
  const db = await import('../../worker/lib/db.js');
  jest.unstable_mockModule('../../worker/lib/db.js', () => ({ ...db, connectDb: async () => {}, withMongoRetry: async (_env, fn) => fn() }));
  ({ reopenPaidNarrativeRetry: reopen, settlePaidNarrativeRefund: settleRefund, settleDuePaidNarrativeRetryRefunds: settleDue,
    provePaidNarrativeRefundEvidence: prove } = await import('../../worker/routes/paid-narrative-retry.js'));
  ({ findProtectedFundingExecution: findProtected } = await import('../../worker/lib/refund-delivery-protection.js'));
  ({ paidNarrativeRefundEvidence } = await import('../../worker/lib/paid-narrative-delivery.js'));
});

describe('free retry', () => {
  test('reopens only the missing parts and keeps the saved part untouched', async () => {
    const model = store([narrative()]);
    const out = await reopen({}, { userId: UID, resultId: 'paid-narrative:abcdef12', now: NOW, model });
    expect(out.status).toBe(200);
    expect(out.body).toMatchObject({ ok: true, status: 'retrying', reopenedParts: ['b', 'c'], savedParts: ['a'], resumeBody: { resumeResultId: 'paid-narrative:abcdef12' } });
    const doc = model.docs[0];
    expect(doc.metadata.paidNarrative.parts).toEqual({ a: 'saved A' });
    expect(doc.metadata.paidNarrative.attempts).toEqual({ a: 1, b: 0, c: 0 });
    expect(doc).toMatchObject({ reasonCode: '', status: 'pending', refundStatus: 'none' });
    expect(doc.nextRetryAt.getTime()).toBe(NOW);
    expect(doc.metadata.paidNarrativeRetry.reopens).toBe(1);
  });
  test('a part saved concurrently is never reset', async () => {
    const model = store([narrative()]);
    const update = model.findOneAndUpdate; model.findOneAndUpdate = (filter, u) => { model.docs[0].metadata.paidNarrative.parts.b = 'late B'; return update(filter, u); };
    const out = await reopen({}, { userId: UID, resultId: 'paid-narrative:abcdef12', now: NOW, model });
    expect(out.body.reason).toBe('BUSY');
    expect(model.docs[0].metadata.paidNarrative.attempts.b).toBe(2);
  });
  test.each([
    ['the 7-day refund point passed', { createdAt: new Date(NOW - 8 * DAY) }, 'RETRY_WINDOW_CLOSED'],
    ['a refund already started', { refundStatus: 'pending' }, 'REFUND_IN_PROGRESS'],
    ['the run is still generating', { reasonCode: '', metadata: { paidNarrative: { tasks: [{ id: 'a' }, { id: 'b' }], parts: { a: 'x' }, attempts: { b: 1 } } } }, 'STILL_GENERATING'],
    ['the retry budget is spent', { metadata: { paidNarrative: { tasks: [{ id: 'a' }, { id: 'b' }], parts: {}, attempts: { a: 2 } }, paidNarrativeRetry: { reopens: 3 } } }, 'RETRY_LIMIT_REACHED'],
  ])('is refused when %s', async (_name, over, reason) => {
    const model = store([narrative(over)]);
    const out = await reopen({}, { userId: UID, resultId: 'paid-narrative:abcdef12', now: NOW, model });
    expect(out.status).toBe(409); expect(out.body.reason).toBe(reason);
  });
  test('another user cannot reopen the run', async () => {
    const out = await reopen({}, { userId: '64b7f2a1c3d4e5f601234999', resultId: 'paid-narrative:abcdef12', now: NOW, model: store([narrative()]) });
    expect(out.status).toBe(404);
  });
});

describe('refund settle', () => {
  const ok = kind => async () => ({ ok: true, kind });
  test('proven evidence refunds the same execution through the existing settle', async () => {
    const model = store([narrative()]), settle = jest.fn(async () => ({ status: 'refunded' }));
    expect(await settleRefund({}, model.docs[0], 'paid_narrative_refund_request', { now: NOW, model, settle, evidence: ok('coin') })).toBe('refunded');
    expect(settle).toHaveBeenCalledWith({}, 'exec-1', 'paid_narrative_refund_request', expect.any(String));
    expect(model.docs[0].metadata.paidNarrativeRetry.refundApprovedAt).toBeInstanceOf(Date);
  });
  test('card evidence stores the PG reference the cancel needs', async () => {
    const model = store([narrative()]), settle = jest.fn(async () => ({ status: 'refunded' }));
    await settleRefund({}, model.docs[0], 'r', { now: NOW, model, settle, evidence: async () => ({ ok: true, kind: 'card', paymentRef: { impUid: 'imp_1', merchantUid: 'm_1' } }) });
    expect(model.docs[0].paymentRef).toEqual({ impUid: 'imp_1', merchantUid: 'm_1' });
  });
  test('missing evidence holds for an operator and never calls a refund', async () => {
    const model = store([narrative()]), settle = jest.fn();
    expect(await settleRefund({}, model.docs[0], 'r', { now: NOW, model, settle, evidence: async () => ({ ok: false }) })).toBe('admin_review');
    expect(settle).not.toHaveBeenCalled();
    expect(model.docs[0]).toMatchObject({ status: 'pending', reasonCode: 'PAID_NARRATIVE_REFUND_EVIDENCE_MISSING', compensation: { adminReviewRequired: true } });
  });
  test('an exhaustion the product already refunded closes terminally without a second refund', async () => {
    const doc = narrative({ reasonCode: 'PAID_NARRATIVE_EXHAUSTION_CLAIMED' });
    doc.metadata.paidNarrative.exhaustionClaimed = true; doc.metadata.paidNarrative.failureResult = { refundOk: true };
    const model = store([doc]), settle = jest.fn(), evidence = jest.fn();
    expect(await settleRefund({}, model.docs[0], 'r', { now: NOW, model, settle, evidence })).toBe('refunded');
    expect(settle).not.toHaveBeenCalled(); expect(evidence).not.toHaveBeenCalled();
    expect(model.docs[0]).toMatchObject({ status: 'refunded', refundStatus: 'refunded', reasonCode: 'PAID_NARRATIVE_EXHAUSTION_REFUNDED' });
  });
  test('an unconfirmed exhaustion refund waits for an operator', async () => {
    const doc = narrative(); doc.metadata.paidNarrative.exhaustionClaimed = true; doc.metadata.paidNarrative.failureResult = { refundOk: false };
    const model = store([doc]), settle = jest.fn();
    expect(await settleRefund({}, model.docs[0], 'r', { now: NOW, model, settle })).toBe('admin_review');
    expect(settle).not.toHaveBeenCalled();
    expect(model.docs[0].reasonCode).toBe('PAID_NARRATIVE_EXHAUSTION_REFUND_UNCONFIRMED');
  });
  test('the cron settles only held runs past the 7-day point (or explicit empty closes)', async () => {
    const model = store([
      narrative({ _id: 'due', createdAt: new Date(NOW - 8 * DAY) }),
      narrative({ _id: 'young' }),
      narrative({ _id: 'close', reasonCode: 'PAID_NARRATIVE_CLOSE_REQUESTED' }),
      narrative({ _id: 'other', reasonCode: 'DELIVERY_CHECKPOINT_REVIEW_REQUIRED', createdAt: new Date(NOW - 9 * DAY) }),
    ]);
    const settle = jest.fn(async () => ({ status: 'refunded' }));
    const out = await settleDue({}, { now: NOW, model, settle, evidence: async () => ({ ok: false }) });
    expect(out.map(o => o.refundStatus)).toEqual(['admin_review', 'admin_review']);
    expect(model.docs.filter(d => d.reasonCode === 'PAID_NARRATIVE_REFUND_EVIDENCE_MISSING').map(d => d._id).sort()).toEqual(['close', 'due']);
    expect(settle).not.toHaveBeenCalled();
  });
  test('a run with every part saved is delivered, not refunded', async () => {
    const doc = narrative(); doc.metadata.paidNarrative.parts = { a: 'A', b: 'B', c: 'C' };
    const model = store([doc]), settle = jest.fn(), evidence = jest.fn();
    expect(await settleRefund({}, model.docs[0], 'r', { now: NOW, model, settle, evidence })).toBe('ready');
    expect(settle).not.toHaveBeenCalled(); expect(model.docs[0].status).toBe('pending');
  });
  test('a settle that restored nothing is flagged for an operator', async () => {
    const model = store([narrative()]);
    const settle = jest.fn(async () => { model.docs[0].status = 'failed'; return { status: 'failed' }; });
    expect(await settleRefund({}, model.docs[0], 'r', { now: NOW, model, settle, evidence: ok('card') })).toBe('refund_failed');
    expect(model.docs[0].compensation.adminReviewRequired).toBe(true);
  });
  test('services outside the 10 retry-first products are left alone', async () => {
    const model = store([narrative({ featureKey: 'karma-destiny-ai-follow-up' })]), settle = jest.fn();
    expect(await settleRefund({}, model.docs[0], 'r', { now: NOW, model, settle, evidence: ok('coin') })).toBe('skipped');
    expect(settle).not.toHaveBeenCalled();
  });
});

describe('payment evidence', () => {
  test('a pass usage row is proven the way the pass refunder reads it', async () => {
    const { passUsageEvidenceId } = await import('../../worker/payments/passes.js');
    const doc = narrative(), id = String(passUsageEvidenceId(UID, 'geomancy', 'req-1'));
    const row = { _id: id, userId: UID, featureKey: 'geomancy', kind: 'deduct', delta: 0, metadata: { accessMethod: 'PASS', coinCost: 2, passCycleKey: 'c-1' } };
    expect(await prove({}, doc, { pointHistory: store([row]), payment: store([]) })).toEqual({ ok: true, kind: 'pass' });
    row.metadata.refundedForServiceExecution = true;
    expect((await prove({}, doc, { pointHistory: store([row]), payment: store([]) })).ok).toBe(false);
  });
  test('a coin deduct row owned by the user for this feature proves a coin refund', async () => {
    const doc = narrative({ sourceTransactionId: '64b7f2a1c3d4e5f601230001' });
    const pointHistory = store([{ _id: '64b7f2a1c3d4e5f601230001', userId: UID, featureKey: 'geomancy', kind: 'deduct', delta: -3 }]);
    expect(await prove({}, doc, { pointHistory, payment: store([]) })).toEqual({ ok: true, kind: 'coin' });
  });
  test('a row for another feature does not count', async () => {
    const doc = narrative({ sourceTransactionId: '64b7f2a1c3d4e5f601230001' });
    const pointHistory = store([{ _id: '64b7f2a1c3d4e5f601230001', userId: UID, featureKey: 'openGeomancyOracle', kind: 'deduct', delta: -3 }]);
    expect((await prove({}, doc, { pointHistory, payment: store([]) })).ok).toBe(false);
  });
  test('a card payment with a PG reference proves a card cancel', async () => {
    const doc = narrative({ sourceTransactionId: '64b7f2a1c3d4e5f601230002' });
    const payment = store([{ _id: '64b7f2a1c3d4e5f601230002', userId: UID, featureKey: 'geomancy', impUid: 'imp_9', merchantUid: 'm_9' }]);
    expect(await prove({}, doc, { pointHistory: store([]), payment })).toEqual({ ok: true, kind: 'card', paymentRef: { impUid: 'imp_9', merchantUid: 'm_9' } });
  });
  test('the stored pass cycle proves a pass refund; nothing at all does not', async () => {
    const doc = narrative(); doc.metadata.passRefund = { cycleKey: '2026-11', cost: 1 };
    expect(await prove({}, doc, { pointHistory: store([]), payment: store([]) })).toEqual({ ok: true, kind: 'pass' });
    expect((await prove({}, narrative(), { pointHistory: store([]), payment: store([]) })).ok).toBe(false);
  });
  test('billing evidence keeps only the refund fields, never auth', () => {
    expect(paidNarrativeRefundEvidence({ ok: true, auth: { token: 'secret' }, evidence: { transactionId: 'tx-1', passRefund: { cycleKey: 'c', cost: 2 } } }))
      .toEqual({ transactionId: 'tx-1', passRefund: { cycleKey: 'c', cost: 2 } });
    expect(paidNarrativeRefundEvidence({ ok: true, auth: {} })).toBeNull();
  });
});

test('only an approved retry-first refund releases its own saved parts, another run still protects', async () => {
  const run = narrative({ sourceTransactionId: 'tx-1' });
  const findOne = async (name, filter) => (name === 'ServiceExecutionTransaction' && matches(run, filter) ? run : null);
  expect(await findProtected({ userId: UID, ids: ['tx-1'], executionId: 'exec-1' }, findOne)).toBe(run);
  expect(await findProtected({ userId: UID, ids: ['tx-1'], executionId: 'exec-1', releasedExecutionId: 'exec-1' }, findOne)).toBeNull();
  expect(await findProtected({ userId: UID, ids: ['tx-1'], executionId: 'exec-other', releasedExecutionId: 'exec-other' }, findOne)).toBe(run);
});
