const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { consultationRefundResponse } = require('../../worker/lib/consultation-refund-state.js');
const { HttpError } = require('../../worker/lib/http.js');

function cancellation(writeFailure = false) {
  const record = { _id: 'original-execution', status: 'paid_pending_generation', error: null };
  const updates = [];
  const context = vm.createContext({
    String, Request, Response,
    readJson: request => request.json(), resolvePricingFromBody: () => ({ ok: true, pricing: { featureKey: 'new-year-ai-consultation' } }),
    requireBillingAuth: async () => ({ ok: true, auth: { userId: 'owner' } }), resolveRequestId: () => 'original-request',
    findDeferredUsageRecord: async () => record,
    success: data => Response.json({ ok: true, data }),
    PaidExecutionRecord: { updateOne: async (filter, update) => {
      if (writeFailure) throw Object.assign(new Error('unavailable'), { code: 'DB_UNAVAILABLE' });
      assert.ok(!Object.keys(update.$set).some(key => key.startsWith('error.')));
      Object.assign(record, update.$set); updates.push({ filter, update });
    } },
  });
  const path = 'worker/routes/billing.js';
  const ast = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const handler = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'handleDeferredUsageCancel');
  vm.runInContext(handler.getText(ast), context);
  return { record, updates, cancel: () => context.handleDeferredUsageCancel(new Request('https://fixture.invalid', {
    method: 'POST', body: JSON.stringify({ code: 'LLM_PROVIDER_UNAVAILABLE', message: 'Provider request failed.' }),
  }), {}) };
}

test('failure cancellation replaces a null error object and preserves the original execution', async () => {
  const fixture = cancellation();
  assert.equal((await fixture.cancel()).status, 200);
  assert.equal(fixture.record.status, 'generation_failed');
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.record.error)), { code: 'LLM_PROVIDER_UNAVAILABLE', message: 'Provider request failed.' });
  assert.equal(fixture.updates[0].filter._id, 'original-execution');
  assert.equal(fixture.updates[0].filter.userId, 'owner');
});

test('a failed cancellation write cannot report cleanup success', async () => {
  const fixture = cancellation(true);
  await assert.rejects(fixture.cancel(), error => error.code === 'DB_UNAVAILABLE');
  assert.equal(fixture.record.status, 'paid_pending_generation');
});

function applying(featureId, consultation, recordStatus = 'paid_pending_generation') {
  let applied = 0, query;
  const record = { _id: 'original-execution', featureId, requestId: 'original-request', executionId: 'execution', status: recordStatus };
  const model = { findOne: supplied => { query = supplied; return { select() { return this; }, lean: async () => consultation }; } };
  const context = vm.createContext({
    String, Request, Response, consultationRefundResponse, NewYearAiConsultation: model, LifeBookAiConsultation: model,
    readJson: request => request.json(), resolvePricingFromBody: () => ({ ok: true, pricing: { featureKey: featureId } }),
    requireBillingAuth: async () => ({ ok: true, auth: { userId: 'owner' } }), resolveRequestId: () => 'echoed-request',
    findDeferredUsageRecord: async () => record,
    json: (body, init) => Response.json(body, init), failure: (status, code) => Response.json({ ok: false, reason: code }, { status }),
    success: data => Response.json({ ok: true, data }), deferredUsageSnapshot: () => ({ source: 'verified_payment', paymentMethod: 'DIRECT_KRW' }),
    normalizeDeferredPaymentMethod: value => value,
    completeDeferredUsageRecord: async () => { applied++; return record; },
  });
  const path = 'worker/routes/billing.js';
  const ast = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const handler = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'handleDeferredUsageApply');
  vm.runInContext(handler.getText(ast), context);
  return { get applied() { return applied; }, get query() { return query; }, apply: () => context.handleDeferredUsageApply(new Request('https://fixture.invalid', {
    method: 'POST', body: JSON.stringify({ sessionId: 'untrusted-session', requestId: 'untrusted-request' }),
  }), {}) };
}

for (const feature of ['new-year-ai-consultation', 'life-book-ai-consultation', 'life-fortune-ai-consultation']) {
  for (const state of ['pending', 'refunded', 'manual_review']) test(`${feature}: ${state} refunds block deferred finalization using the saved owner and request`, async () => {
    const fixture = applying(feature, { status: 'generation_failed', llmMeta: { deliveryRefund: { status: state } } });
    const response = await fixture.apply();
    assert.equal(response.status, state === 'refunded' ? 403 : 409);
    assert.equal(fixture.applied, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(fixture.query)), { userId: 'owner', idempotencyKey: 'original-request' });
  });
  for (const state of ['generation_failed', 'partial', 'generating', null]) test(`${feature}: ${state || 'missing'} reports cannot finalize billing`, async () => {
    const fixture = applying(feature, state ? { status: state } : null);
    assert.equal((await fixture.apply()).status, 409);
    assert.equal(fixture.applied, 0);
  });
  test(`${feature}: stored complete delivery can finalize once and a revoked execution cannot reopen`, async () => {
    const ready = applying(feature, { status: 'delivery_pending' });
    assert.equal((await ready.apply()).status, 200); assert.equal(ready.applied, 1);
    const revoked = applying(feature, { status: 'completed' }, 'refunded');
    assert.equal((await revoked.apply()).status, 403); assert.equal(revoked.applied, 0);
  });
}

test('a revoked execution compare-and-set cannot mutate the payment before rejecting completion', async () => {
  let paymentWrites = 0;
  const context = vm.createContext({ Date, String, HttpError, deferredUsageSnapshot: () => ({}),
    markDeferredPaymentFulfilled: async () => { paymentWrites++; },
    PaidExecutionRecord: { findOneAndUpdate: filter => {
      assert.ok(filter.status.$nin.includes('refunded'));
      return { lean: async () => null };
    } },
  });
  const path = 'worker/routes/billing.js';
  const ast = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const handler = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'completeDeferredUsageRecord');
  vm.runInContext(handler.getText(ast), context);
  await assert.rejects(context.completeDeferredUsageRecord({ _id: 'original-execution' }, 'owner', 'result'), error => error.code === 'DEFERRED_USAGE_REVOKED');
  assert.equal(paymentWrites, 0);
});

function cashCompletion(featureId, options = {}) {
  const Payment = { kind: 'payment' }, PaidExecutionRecord = { kind: 'execution' }, model = { kind: 'consultation' };
  let state = { payment: { status: options.paymentStatus || 'paid', refundLock: options.refundLock || null },
    execution: { _id: 'execution', status: options.executionStatus || 'paid_pending_generation' } };
  let transactions = 0;
  const context = vm.createContext({ Date, String, HttpError, Set, Payment, PaidExecutionRecord, NewYearAiConsultation: model, LifeBookAiConsultation: model,
    deferredUsageSnapshot: () => ({ paymentMethod: 'DIRECT_KRW', paymentId: 'original-order' }), normalizeDeferredPaymentMethod: value => value,
    createPaymentContext: value => value, toObjectId: value => value, consultationRefundResponse,
    withPaymentDb: async (_env, _ctx, work) => work({ transaction: async run => {
      transactions++; const before = structuredClone(state);
      try { return await run({
        findOne: async queried => { assert.equal(queried, model); return { status: 'delivery_pending' }; },
        findOneAndUpdate: async (queried, filter, update) => {
          if (queried === Payment) {
            assert.equal(filter.userId, 'owner'); assert.equal(filter.featureKey, featureId);
            assert.ok(filter.status.$in.includes(state.payment.status));
            assert.ok(filter.$and.some(row => row.$or.some(clause => 'refundLock' in clause)));
            if (state.payment.refundLock) return null;
            Object.assign(state.payment, update.$set); return state.payment;
          }
          assert.equal(queried, PaidExecutionRecord);
          if (filter.status.$nin.includes(state.execution.status)) return null;
          Object.assign(state.execution, update.$set); return state.execution;
        },
      }); } catch (error) { state = before; throw error; }
    } }),
  });
  const path = 'worker/routes/billing.js';
  const ast = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const handler = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'completeDeferredUsageRecord');
  vm.runInContext(handler.getText(ast), context);
  return { get state() { return state; }, get transactions() { return transactions; }, complete: () => context.completeDeferredUsageRecord({
    _id: 'execution', featureId, requestId: 'original-request', paymentId: 'original-order',
  }, 'owner', 'stored-result', {}, {}) };
}

for (const feature of ['new-year-ai-consultation', 'life-book-ai-consultation', 'life-fortune-ai-consultation']) {
  test(`${feature}: a refund lock blocks cash finalization atomically`, async () => {
    const fixture = cashCompletion(feature, { refundLock: new Date() });
    await assert.rejects(fixture.complete(), error => error.code === 'DEFERRED_USAGE_REVOKED');
    assert.equal(fixture.state.payment.status, 'paid'); assert.equal(fixture.state.execution.status, 'paid_pending_generation');
    assert.equal(fixture.transactions, 1);
  });
  test(`${feature}: execution rejection rolls back the order completion in the same transaction`, async () => {
    const fixture = cashCompletion(feature, { executionStatus: 'refunded' });
    await assert.rejects(fixture.complete(), error => error.code === 'DEFERRED_USAGE_REVOKED');
    assert.equal(fixture.state.payment.status, 'paid'); assert.equal(fixture.state.execution.status, 'refunded');
  });
  for (const status of ['paid', 'success', 'fulfilled']) test(`${feature}: ${status} cash order and execution complete together`, async () => {
    const fixture = cashCompletion(feature, { paymentStatus: status });
    assert.equal((await fixture.complete()).status, 'completed');
    assert.equal(fixture.state.payment.status, 'fulfilled'); assert.equal(fixture.state.execution.status, 'completed');
    assert.equal(fixture.transactions, 1);
  });
}
