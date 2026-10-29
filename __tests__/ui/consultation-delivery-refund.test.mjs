import test from 'node:test';
import assert from 'node:assert/strict';
import { settleFailedConsultationRefund, runPendingConsultationRefunds, consultationRefundResponse } from '../../worker/lib/consultation-delivery-refund.js';
import { refundPassCoverage } from '../../worker/lib/pass-consumption.js';
import { NewYearAiConsultation, LifeBookAiConsultation, Payment, PaidExecutionRecord, PointHistory, MonthlyCreditLedger, User } from '../../worker/lib/models.js';
const originalFetch = globalThis.fetch;
test.beforeEach(() => { globalThis.fetch = () => { throw new Error('External HTTP forbidden in refund mocks'); }; });
test.afterEach(() => { globalThis.fetch = originalFetch; });

const UID = '111111111111111111111111';
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const read = (row, path) => path.split('.').reduce((value, key) => value?.[key], row);
function set(row, path, value) {
  const parts = path.split('.'), key = parts.pop();
  for (const part of parts) row = row[part] ||= {};
  row[key] = clone(value);
}
function matches(row, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(item => matches(row, item));
    if (key === '$and') return value.every(item => matches(row, item));
    const actual = read(row, key);
    if (value && typeof value === 'object' && !(value instanceof Date) && !value.toHexString) {
      return Object.entries(value).every(([op, expected]) => {
        if (op === '$exists') return (actual !== undefined) === expected;
        if (op === '$in') return expected.some(item => String(item) === String(actual));
        if (op === '$ne') return String(actual) !== String(expected);
        if (op === '$gte') return actual >= expected;
        if (op === '$lt') return actual != null && new Date(actual) < new Date(expected);
        throw new Error(`Unsupported fixture operator ${op}`);
      });
    }
    if (value instanceof Date) return new Date(actual).getTime() === value.getTime();
    if (value === null) return actual == null;
    return String(actual) === String(value);
  });
}
function fixture(method = 'cash') {
  const tables = new Map(), key = Model => Model.modelName;
  const rows = Model => { const k = key(Model); if (!tables.has(k)) tables.set(k, []); return tables.get(k); };
  const put = (Model, value) => { rows(Model).push(clone(value)); return rows(Model).at(-1); };
  let dbFault = false, finalDocFault = false, sourceFault = false, reserveFault = false, cancelled = false, cancels = 0, lostResponse = false, partial = false, queue = Promise.resolve();
  const doc = put(NewYearAiConsultation, { _id: 'request-object-id', id: 'request-one', userId: UID,
    idempotencyKey: 'original-request', paymentId: '222222222222222222222222', status: 'generation_failed',
    accessType: method === 'cash' ? 'paid' : method === 'monthly' ? 'subscription' : 'pass',
    updatedAt: '2026-10-01T00:00:00.000Z', llmMeta: { savedSections: [{ key: 'opening', text: 'preserved draft' }] } });
  const execution = put(PaidExecutionRecord, { _id: '222222222222222222222222', userId: UID,
    featureId: 'new-year-ai-consultation', requestId: doc.idempotencyKey, status: 'paid_pending_generation',
    orderId: method === 'cash' ? 'order-one' : '', accessMethod: method === 'cash' ? 'single' : method });
  const user = put(User, { _id: UID, points: 0, profileSubscription: { premiumUseCycleKey: '2099-01-01T00:00:00.000Z',
    monthlySpendCoin: 300, membershipCreditBalance: 0, membershipCreditUsed: 3000, membershipCreditLots: [], membershipCreditLotsVersion: 0 } });
  let payment, proof;
  if (method === 'cash') payment = put(Payment, { _id: '333333333333333333333333', userId: UID,
    merchantUid: 'order-one', featureKey: 'new-year-ai-consultation', requestId: doc.idempotencyKey, paymentAmount: 30000, status: 'paid' });
  if (method === 'monthly') proof = put(MonthlyCreditLedger, { _id: '444444444444444444444444', userId: UID,
    type: 'MONTHLY_CREDIT_SPEND', sourceId: doc.idempotencyKey, serviceKey: 'new-year-ai-consultation', amount: 3000,
    settledAt: '2026-10-01T00:00:00Z', beforeBalance: 3000, afterBalance: 0, metadata: {} });
  if (method === 'pass') proof = put(PointHistory, { _id: '555555555555555555555555', userId: UID,
    kind: 'deduct', delta: 0, featureKey: 'new-year-ai-consultation', metadata: { requestId: doc.idempotencyKey,
      accessType: 'family', coinCost: 300, passCycleKey: user.profileSubscription.premiumUseCycleKey } });
  function update(row, data) {
    for (const [k, v] of Object.entries(data.$set || {})) set(row, k, v);
    for (const [k, v] of Object.entries(data.$inc || {})) set(row, k, (read(row, k) || 0) + v);
    for (const k of Object.keys(data.$unset || {})) { const parts = k.split('.'), last = parts.pop(); const at = parts.reduce((a, x) => a?.[x], row); if (at) delete at[last]; }
  }
  const db = {
    async find(Model, filter, options = {}) { return clone(rows(Model).filter(row => matches(row, filter)).slice(0, options.limit || Infinity)); },
    async findOne(Model, filter) { return clone(rows(Model).find(row => matches(row, filter)) || null); },
    async findOneAndUpdate(Model, filter, data, options = {}) {
      if (Model === NewYearAiConsultation && data.$set?.['llmMeta.deliveryRefund'] && reserveFault) {
        reserveFault = false; throw new Error('reservation database failure');
      }
      if (Model === NewYearAiConsultation && data.$set?.['llmMeta.deliveryRefund.status'] === 'refunded' && finalDocFault) {
        finalDocFault = false; throw new Error('final document reply lost');
      }
      if (Model === PointHistory && data.$setOnInsert?.reason === 'pass_quota_refund' && sourceFault) {
        sourceFault = false; throw new Error('refund receipt write failed after source claim');
      }
      let row = rows(Model).find(value => matches(value, filter));
      if (!row && options.upsert) { row = put(Model, { ...filter, ...data.$setOnInsert }); }
      if (!row) return null;
      update(row, data); return clone(row);
    },
    async updateOne(Model, filter, data) {
      if (Model === Payment && data.$set?.status === 'refunded' && dbFault) { dbFault = false; throw new Error('database failed after PG cancellation'); }
      const row = rows(Model).find(value => matches(value, filter));
      if (!row) return { matchedCount: 0, modifiedCount: 0 };
      update(row, data); return { matchedCount: 1, modifiedCount: 1 };
    },
    async insertOne(Model, value) { put(Model, value); return { insertedId: value._id || 'receipt' }; },
    transaction(work) {
      const run = queue.then(async () => {
        const before = clone([...tables]);
        try { return await work(db); } catch (e) { tables.clear(); for (const [k, values] of before) tables.set(k, values); throw e; }
      });
      queue = run.catch(() => {}); return run;
    },
  };
  const deps = { now: Date.parse('2026-10-27T00:00:00Z'), withDb: async (_env, _ctx, work) => work(db),
    fetchPayment: async () => ({ status: cancelled || partial ? 'cancelled' : 'paid', amount: 30000, currency: 'KRW',
      rawV2: { status: partial ? 'PARTIAL_CANCELLED' : cancelled ? 'CANCELLED' : 'PAID', currency: 'KRW',
        amount: { total: 30000, paid: 30000, cancelled: partial ? 15000 : cancelled ? 30000 : 0 } } }),
    cancelPayment: async () => { cancels++; cancelled = true; if (lostResponse) { lostResponse = false; throw new Error('reply lost'); } },
  };
  const settle = (input = {}) => settleFailedConsultationRefund({}, { service: 'new-year-ai', id: doc.id, userId: UID, ...input }, deps);
  return { doc, execution, payment, proof, user, deps, db, settle, rows, put, get cancels() { return cancels; },
    failDb: () => { dbFault = true; }, failFinalDoc: () => { finalDocFault = true; }, failSource: () => { sourceFault = true; }, failReservation: () => { reserveFault = true; },
    loseResponse: () => { lostResponse = true; }, partial: () => { partial = true; } };
}

test('terminal partial draft gets one full cash refund and rereplay is a no-op', async () => {
  const f = fixture(); f.doc.llmMeta.billingCleanupPending = true;
  assert.equal((await f.settle()).refundStatus, 'refunded');
  assert.equal((await f.settle()).refundStatus, 'refunded');
  assert.equal(f.cancels, 1);
  const doc = f.rows(NewYearAiConsultation)[0];
  assert.equal(doc.llmMeta.savedSections[0].text, 'preserved draft');
  assert.equal(doc.llmMeta.billingCleanupPending, false);
  assert.equal(f.rows(Payment)[0].status, 'refunded');
});
test('life-book terminal failures use their own model and original feature funding', async () => {
  const f = fixture();
  f.put(LifeBookAiConsultation, f.rows(NewYearAiConsultation).pop());
  f.payment.featureKey = 'life-book-ai-consultation'; f.execution.featureId = 'life-book-ai-consultation';
  assert.equal((await f.settle({ service: 'life-book-ai' })).refundStatus, 'refunded');
  assert.equal(f.rows(LifeBookAiConsultation)[0].llmMeta.deliveryRefund.status, 'refunded');
  assert.equal(f.rows(NewYearAiConsultation).length, 0); assert.equal(f.cancels, 1);
});
for (const source of ['featureKey', 'consultationType', 'resumeBody']) test(`life-fortune original funding is refunded using saved ${source}`, async () => {
  const f = fixture(), doc = f.put(LifeBookAiConsultation, f.rows(NewYearAiConsultation).pop());
  if (source === 'featureKey') doc.featureKey = 'life-fortune-ai-consultation';
  if (source === 'consultationType') doc.llmMeta.input = { consultationType: 'lifeFortune' };
  if (source === 'resumeBody') doc.llmMeta.resumeBody = { featureKey: 'life-fortune-ai-consultation' };
  f.payment.featureKey = 'life-fortune-ai-consultation'; f.execution.featureId = 'life-fortune-ai-consultation';
  assert.equal((await f.settle({ service: 'life-book-ai' })).refundStatus, 'refunded'); assert.equal(f.cancels, 1);
  assert.equal(f.rows(LifeBookAiConsultation)[0].llmMeta.deliveryRefund.funding.feature, 'life-fortune-ai-consultation');
});
test('legacy life-fortune content keeps its explicitly stored life-book billed SKU', async () => {
  const f = fixture(), doc = f.put(LifeBookAiConsultation, f.rows(NewYearAiConsultation).pop());
  doc.featureKey = 'life-book-ai-consultation'; doc.llmMeta.input = { consultationType: 'lifeFortune' };
  f.payment.featureKey = 'life-book-ai-consultation'; f.execution.featureId = 'life-book-ai-consultation';
  assert.equal((await f.settle({ service: 'life-book-ai' })).refundStatus, 'refunded'); assert.equal(f.cancels, 1);
});
for (const feature of ['unrelated-product', 'life-fortune-ai-consultation']) test(`life-book funding cannot be substituted for saved ${feature}`, async () => {
  const f = fixture(), doc = f.put(LifeBookAiConsultation, f.rows(NewYearAiConsultation).pop());
  doc.featureKey = feature;
  f.payment.featureKey = 'life-book-ai-consultation'; f.execution.featureId = 'life-book-ai-consultation';
  assert.equal((await f.settle({ service: 'life-book-ai' })).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
});
for (const status of ['success', 'fulfilled']) test(`legacy paid state ${status} remains refundable`, async () => {
  const f = fixture(); f.payment.status = status;
  assert.equal((await f.settle()).refundStatus, 'refunded'); assert.equal(f.cancels, 1);
});
for (const status of ['completed', 'delivery_pending', 'partial', 'generating']) test(`does not refund ${status}`, async () => {
  const f = fixture(); f.doc.status = status;
  assert.equal((await f.settle()).reason, 'REFUND_NOT_TERMINAL'); assert.equal(f.cancels, 0);
});
test('active generation/support recovery and wrong owner cannot reserve a refund', async () => {
  const f = fixture(); f.doc.llmMeta.lockedAt = new Date(f.deps.now).toISOString(); f.doc.llmMeta.lockToken = 'active';
  assert.equal((await f.settle()).reason, 'REFUND_NOT_TERMINAL');
  delete f.doc.llmMeta.lockToken; f.doc.llmMeta.supportRecovery = { active: true, refundApproved: true };
  assert.equal((await f.settle()).reason, 'REFUND_NOT_TERMINAL');
  assert.equal((await f.settle({ userId: '999999999999999999999999' })).reason, 'REFUND_NOT_TERMINAL');
  assert.equal(f.cancels, 0);
});
test('support recovery without explicit refund approval cannot reserve or call PG', async () => {
  const f = fixture(); f.doc.llmMeta.supportRecovery = { active: false, refundApproved: false };
  assert.equal((await f.settle()).reason, 'REFUND_NOT_AUTHORIZED');
  assert.equal(f.doc.llmMeta.deliveryRefund, undefined); assert.equal(f.cancels, 0);
});
test('admin requests create no financial refund reservation', async () => {
  const f = fixture(); f.doc.accessType = 'admin';
  assert.equal((await f.settle()).reason, 'REFUND_NOT_TERMINAL');
  assert.equal(f.doc.llmMeta.deliveryRefund, undefined); assert.equal(f.cancels, 0);
});
test('a completed execution is preserved and requires review before any PG operation', async () => {
  const f = fixture(); f.execution.status = 'completed';
  assert.equal((await f.settle()).refundStatus, 'manual_review');
  assert.equal(f.execution.status, 'completed'); assert.equal(f.cancels, 0);
});
test('another completed request attached to the same order blocks the old failure refund', async () => {
  const f = fixture();
  f.put(PaidExecutionRecord, { _id: '666666666666666666666666', userId: UID, featureId: 'new-year-ai-consultation',
    requestId: 'newer-completed-request', orderId: 'order-one', paymentId: 'order-one', status: 'completed' });
  assert.equal((await f.settle()).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
});
for (const status of ['paid_pending_generation', 'generating', 'partial', 'delivery_pending']) test(`another ${status} execution on the same order is preserved for review`, async () => {
  const f = fixture();
  f.put(PaidExecutionRecord, { _id: '666666666666666666666666', userId: UID, featureId: 'new-year-ai-consultation',
    requestId: 'newer-active-request', orderId: 'order-one', status });
  assert.equal((await f.settle()).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
  assert.equal(f.rows(PaidExecutionRecord)[1].status, status);
});
test('a legacy completed consultation without an execution row protects the same order', async () => {
  const f = fixture();
  f.put(NewYearAiConsultation, { id: 'completed-original', userId: UID, status: 'completed', paymentId: 'order-one', idempotencyKey: 'legacy-request' });
  assert.equal((await f.settle()).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
});
test('a legacy pending delivery without an execution row protects the same order', async () => {
  const f = fixture();
  f.put(NewYearAiConsultation, { id: 'newer-active-request', userId: UID, status: 'delivery_pending', paymentId: 'order-one', idempotencyKey: 'newer-request' });
  assert.equal((await f.settle()).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
});
for (const field of ['sessionId', 'reportId']) test(`a legacy completed result linked only by Payment.${field} is preserved`, async () => {
  const f = fixture(); f.payment[field] = 'legacy-completed-result';
  f.put(NewYearAiConsultation, { id: 'legacy-completed-result', userId: UID, status: 'completed', paymentId: '', idempotencyKey: 'legacy-unlinked-request' });
  assert.equal((await f.settle()).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
});
test('concurrent refund reservation does not cancel twice', async () => {
  const f = fixture(); const results = await Promise.all([f.settle(), f.settle()]);
  assert.equal(f.cancels, 1); assert.ok(results.some(r => r.refundStatus === 'refunded'));
});
test('PG reply loss is re-queried and settled without another cancellation', async () => {
  const f = fixture(); f.doc.llmMeta.billingCleanupPending = true; f.loseResponse();
  assert.equal((await f.settle()).refundStatus, 'pending');
  assert.equal(f.rows(NewYearAiConsultation)[0].llmMeta.deliveryRefund.status, 'pending');
  assert.equal(f.rows(NewYearAiConsultation)[0].llmMeta.billingCleanupPending, true);
  assert.equal((await f.settle()).refundStatus, 'refunded'); assert.equal(f.cancels, 1);
  assert.equal(f.rows(NewYearAiConsultation)[0].llmMeta.billingCleanupPending, false);
});
test('PG success followed by DB failure stays pending and only retries internal settlement', async () => {
  const f = fixture(); f.failDb();
  assert.equal((await f.settle()).refundStatus, 'pending');
  assert.equal((await f.settle()).refundStatus, 'refunded'); assert.equal(f.cancels, 1);
});
test('an order delivery completing during PG verification prevents cancellation', async () => {
  const f = fixture(), fetchPayment = f.deps.fetchPayment;
  f.deps.fetchPayment = async (...args) => { f.execution.status = 'completed'; return fetchPayment(...args); };
  assert.equal((await f.settle()).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
  assert.equal(f.rows(PaidExecutionRecord)[0].status, 'completed');
});
test('partial PG cancellation requires review and is never labelled a full refund', async () => {
  const f = fixture(); f.partial();
  assert.equal((await f.settle()).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
});
for (const [label, raw] of [
  ['different amount', { status: 'CANCELLED', currency: 'KRW', amount: { paid: 1000, total: 1000, cancelled: 1000 } }],
  ['different currency', { status: 'CANCELLED', currency: 'USD', amount: { paid: 30000, cancelled: 30000 } }],
  ['incomplete cancellation amount', { status: 'CANCELLED', currency: 'KRW', amount: { paid: 30000, cancelled: 15000 } }],
]) test(`cancelled status with ${label} is not settled as full refund`, async () => {
  const f = fixture(); f.deps.fetchPayment = async () => ({ status: 'cancelled', amount: raw.amount.paid, currency: raw.currency, rawV2: raw });
  assert.equal((await f.settle()).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
  assert.equal(f.rows(Payment)[0].status, 'paid');
});
test('bank-account refunds and unsupported app providers require manual review', async () => {
  for (const method of ['VBANK', 'google_play', 'app_store', 'paypal']) {
    const f = fixture(); f.payment.paymentMethod = method;
    assert.equal((await f.settle()).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
  }
});
test('monthly restoration uses the original settled spend and writes one receipt', async () => {
  const f = fixture('monthly');
  assert.equal((await f.settle()).refundStatus, 'refunded');
  assert.equal((await f.settle()).refundStatus, 'refunded');
  assert.equal(f.rows(User)[0].profileSubscription.membershipCreditBalance, 3000);
  assert.equal(f.rows(MonthlyCreditLedger).filter(row => row.type === 'MONTHLY_CREDIT_GRANT').length, 1);
  assert.equal(f.cancels, 0);
});
test('monthly credit is not repeated after its receipt commits but final document fails', async () => {
  const f = fixture('monthly'); f.failFinalDoc();
  assert.equal((await f.settle()).refundStatus, 'pending');
  assert.equal(f.rows(User)[0].profileSubscription.membershipCreditBalance, 3000);
  assert.equal((await f.settle()).refundStatus, 'refunded');
  assert.equal(f.rows(User)[0].profileSubscription.membershipCreditBalance, 3000);
  assert.equal(f.rows(MonthlyCreditLedger).filter(row => row.type === 'MONTHLY_CREDIT_GRANT').length, 1);
});
test('mixed cash and moonstones restore the original discount once through the existing order helper', async () => {
  const f = fixture(); f.payment.pricingSnapshot = { moonstoneDiscount: { quantity: 3000 } };
  f.put(MonthlyCreditLedger, { _id: '444444444444444444444444', userId: UID,
    type: 'MONTHLY_CREDIT_SPEND', sourceId: 'order-discount:order-one', serviceKey: 'new-year-ai-consultation',
    amount: 3000, settledAt: '2026-10-01T00:00:00Z', beforeBalance: 3000, afterBalance: 0, metadata: { orderId: 'order-one' } });
  assert.equal((await f.settle()).refundStatus, 'refunded');
  assert.equal((await f.settle()).refundStatus, 'refunded');
  assert.equal(f.cancels, 1);
  assert.equal(f.rows(User)[0].profileSubscription.membershipCreditBalance, 3000);
  assert.equal(f.rows(MonthlyCreditLedger).filter(row => row.type === 'MONTHLY_CREDIT_GRANT').length, 1);
});
test('pass restores actual use once; a deferred, uncharged pass creates no credit', async () => {
  const f = fixture('pass');
  assert.equal((await f.settle()).refundStatus, 'refunded');
  assert.equal((await f.settle()).refundStatus, 'refunded');
  assert.equal(f.rows(User)[0].profileSubscription.monthlySpendCoin, 0);
  assert.equal(f.rows(PointHistory).filter(row => row.kind === 'refund').length, 1);
  const deferred = fixture('no_charge');
  assert.equal((await deferred.settle()).refundStatus, 'refunded');
  assert.equal(deferred.rows(PointHistory).length, 0);
  assert.equal(deferred.rows(NewYearAiConsultation)[0].llmMeta.deliveryRefund.method, 'no_charge');
});
test('pass counters, refund receipt and original evidence marking roll back together', async () => {
  const f = fixture('pass'); f.failSource();
  assert.equal((await f.settle()).refundStatus, 'pending');
  assert.equal(f.rows(User)[0].profileSubscription.monthlySpendCoin, 300);
  assert.equal(f.rows(PointHistory).filter(row => row.kind === 'refund').length, 0);
  assert.equal((await f.settle()).refundStatus, 'refunded');
  assert.equal(f.rows(User)[0].profileSubscription.monthlySpendCoin, 0);
  assert.equal(f.rows(PointHistory)[0].metadata.refundedForServiceExecution, true);
});
test('different refund IDs cannot restore the same pass source twice', async () => {
  const f = fixture('pass'), args = { db: f.db, userId: UID, cycleKey: f.proof.metadata.passCycleKey,
    cost: 300, sourcePointHistoryId: f.proof._id };
  const results = await Promise.allSettled([refundPassCoverage({ ...args, refundId: 'one' }), refundPassCoverage({ ...args, refundId: 'two' })]);
  assert.equal(results.filter(result => result.status === 'fulfilled' && result.value.refunded).length, 1);
  assert.equal(f.rows(User)[0].profileSubscription.monthlySpendCoin, 0);
  assert.equal(f.rows(PointHistory).filter(row => row.kind === 'refund').length, 1);
});
test('an unrelated feature or unapproved payment cannot be refunded as this request', async () => {
  const f = fixture(); f.payment.featureKey = 'other-product';
  assert.equal((await f.settle()).refundStatus, 'manual_review'); assert.equal(f.cancels, 0);
});
test('pending refund reconciliation has no generation age cutoff and never resumes LLM', async () => {
  const f = fixture(); f.loseResponse(); await f.settle();
  f.rows(NewYearAiConsultation)[0].createdAt = '2020-01-01T00:00:00Z';
  const result = await runPendingConsultationRefunds({}, f.deps);
  assert.equal(result.outcomes[0].refundStatus, 'refunded'); assert.equal(f.cancels, 1);
  assert.equal(f.rows(LifeBookAiConsultation).length, 0);
});
test('cron reserves newly eligible failures but does not backfill historical failures or unapproved support jobs', async () => {
  const f = fixture();
  assert.equal((await runPendingConsultationRefunds({}, f.deps)).outcomes.length, 0);
  f.doc.llmMeta.refundEligibleAt = '2026-10-27T00:00:00Z';
  f.doc.llmMeta.supportRecovery = { active: false, refundApproved: false };
  assert.equal((await runPendingConsultationRefunds({}, f.deps)).outcomes.length, 0);
  delete f.doc.llmMeta.supportRecovery;
  assert.equal((await runPendingConsultationRefunds({}, f.deps)).outcomes[0].refundStatus, 'refunded');
});
test('newly eligible failures remain discoverable when their initial reservation write fails', async () => {
  const f = fixture(); f.doc.llmMeta.refundEligibleAt = '2026-10-27T00:00:00Z'; f.failReservation();
  assert.equal((await f.settle()).refundStatus, 'pending');
  assert.equal(f.rows(NewYearAiConsultation)[0].llmMeta.deliveryRefund, undefined); assert.equal(f.cancels, 0);
  assert.equal((await runPendingConsultationRefunds({}, f.deps)).outcomes[0].refundStatus, 'refunded'); assert.equal(f.cancels, 1);
});
test('public refund response consistently blocks pending, reviewed and refunded requests', () => {
  assert.equal(consultationRefundResponse({}), null);
  for (const status of ['pending', 'manual_review', 'refunded']) {
    const response = consultationRefundResponse({ llmMeta: { deliveryRefund: { status } } });
    assert.equal(response.status, status === 'refunded' ? 403 : 409);
    assert.equal(response.body.retryable, status === 'pending');
    assert.equal(response.body.refundStatus, status);
  }
});

test('native life-book failure cannot refund a matching web payment or consume monthly credits', async () => {
  const f=fixture(),doc=f.put(LifeBookAiConsultation,f.rows(NewYearAiConsultation).pop());
  doc.accessSource='toss';doc.llmMeta.refundEligibleAt='2026-10-01T00:00:00Z';
  f.payment.featureKey='life-book-ai-consultation';f.execution.featureId='life-book-ai-consultation';
  const before=clone(doc);
  const result=await f.settle({service:'life-book-ai'});
  assert.equal(result.reason,'TOSS_ORDER_REVIEW_REQUIRED');assert.equal(f.cancels,0);assert.deepEqual(doc,before);
  await runPendingConsultationRefunds({},f.deps);
  assert.equal(f.cancels,0);assert.deepEqual(doc,before);assert.equal(f.payment.status,'paid');
});
