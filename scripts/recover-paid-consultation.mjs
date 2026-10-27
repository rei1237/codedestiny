/** One original paid order, one bounded support job. Default: read-only, no HTTP. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { config } from 'dotenv';
import { connectDb, mongoose, mongoTransactionOptions } from '../worker/lib/db.js';
import * as models from '../worker/lib/models.js';
import { buildMongoEnv, requireMongoUri, writeBeforeImage } from './lib/migration-before-image.mjs';
import { SUPPORT_SERVICES, planPaidConsultationRecovery, partHash, assertSupportPaymentApproval } from './lib/paid-consultation-support.mjs';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });
const value = name => process.argv[process.argv.indexOf(name) + 1];
const database = process.argv.includes('--db') ? value('--db') : '';
const orderId = process.argv.includes('--order') ? value('--order') : '';
assert.ok(['code_destiny', 'code_destiny_staging'].includes(database), '--db is required');
assert.match(orderId, /^[a-zA-Z0-9:_-]{12,180}$/, '--order is required');
const apply = process.argv.includes('--apply');
const generate = process.argv.includes('--generate');
assert.equal(apply, generate, 'Arming a job can wake cron: --apply and --generate must be approved together');
const approvedCalls = Number(process.argv.includes('--max-provider-calls') ? value('--max-provider-calls') : 0);
const approvedOwner = process.argv.includes('--expected-owner') ? value('--expected-owner') : '';
const scopedOrders = {
  cd1b1b6f860949f03fa96d318c1bfe2340ec2d99: { owner: '6a97b5e4f59ac682dbba982a', maxCalls: 18 },
  cdc896ca98490f8114fbac44c6557e5235cf5d39: { owner: '6adf470b29d791974dcd21b4', maxCalls: 8 },
};
if (apply) {
  assert.ok(scopedOrders[orderId], 'Only the two reviewed support orders may be changed');
  assert.equal(approvedOwner, scopedOrders[orderId].owner, 'Approval must name the original purchasing account');
  assert.equal(approvedCalls, scopedOrders[orderId].maxCalls, 'Approval must match the reviewed maximum call count');
}
const env = { ...process.env, ...buildMongoEnv(), MONGO_DB_NAME: database, MONGODB_DB_NAME: database,
  WORKERS_AI_ENABLED: 'false' };
requireMongoUri(env);
const originalFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async (url, init) => {
  if (!generate) throw new Error('HTTP is forbidden in the read-only support plan');
  const target = new URL(String(url));
  assert.equal(target.protocol, 'https:', 'Provider credentials require HTTPS');
  if (target.hostname === 'generativelanguage.googleapis.com') {
    assert.match(target.pathname, /\/models\/gemini-2\.5-flash:(?:countTokens|generateContent)$/,
      'Only the reviewed Gemini Flash model is approved');
    if (target.pathname.endsWith(':generateContent')) {
      assert.ok(calls < approvedCalls, 'APPROVED_PROVIDER_CALL_LIMIT');
      const body = JSON.parse(init.body);
      assert.ok(body.generationConfig?.maxOutputTokens <= 12000, 'APPROVED_OUTPUT_TOKEN_LIMIT');
      calls++;
    }
    return originalFetch(url, init);
  }
  if (target.hostname === 'api.portone.io' && (!init?.method || init.method === 'GET')) return originalFetch(url, init);
  if (process.argv.includes('--allow-refund') && ['api.portone.io', 'api.iamport.kr'].includes(target.hostname)) {
    return originalFetch(url, init);
  }
  throw new Error('Unapproved external operation blocked during support recovery');
};
let connected = false;
try {
  await connectDb(env); connected = true;
  assert.equal(mongoose.connection.name, database);
  const db = mongoose.connection.db;
  const order = await db.collection('payments').findOne({ merchantUid: orderId }, { maxTimeMS: 10000 });
  const spec = SUPPORT_SERVICES[order?.featureKey];
  assert.ok(spec, 'Only new-year and life-book paid consultations are supported');
  const owner = String(order.userId);
  const requestId = order.requestId || order.idempotencyKey;
  const store = db.collection(spec.collection);
  let doc = await store.findOne({ userId: owner, idempotencyKey: requestId }, { maxTimeMS: 10000 });
  assert.ok(doc, 'Original consultation not found; never create a replacement result');
  const route = spec.service === 'new-year-ai' ? await import('../worker/routes/new-year-ai.js') : await import('../worker/routes/life-book-ai.js');
  const utils = route.__newYearAiTestUtils || route.__lifeBookAiTestUtils;
  const partsFor = source => {
    if (spec.service === 'new-year-ai') return utils.NEW_YEAR_AI_SECTIONS.map(p => {
      const part = source.llmMeta?.savedSections?.find(t => t.key === p.key);
      return { key: p.key, valid: Boolean(part?.ok && !part.truncated && !part.isMock && part.text?.trim()), body: part?.text || '' };
    });
    const normalized = utils.normalizeConsultationInput(source.llmMeta?.resumeBody);
    assert.ok(normalized.ok, 'Stored original input is invalid');
    return (source.llmMeta?.plan || utils.buildSectionPlan(normalized.input)).map(p => {
      const part = source.llmMeta?.sections?.[p.id];
      return { key: p.id, valid: Boolean(part?.ok && utils.lifeBookSectionValid(p, part.body, normalized.input)), body: part?.body || null };
    });
  };
  const parts = partsFor(doc);
  const plan = planPaidConsultationRecovery({ order, doc, parts, expectedOwner: approvedOwner });
  console.log(JSON.stringify({ database, orderId, service: spec.service, resultId: doc.id, owner,
    action: plan.action, missingParts: plan.missing, preservedParts: parts.filter(p => p.valid).length,
    maxProviderCalls: plan.maxProviderCalls || 0, provider: 'gemini', model: 'gemini-2.5-flash',
    mode: apply ? 'approved-recovery' : 'read-only', resultPath: '/records/' }));
  if (apply && plan.action !== 'already_completed') {
    assert.equal(approvedCalls, plan.maxProviderCalls, 'Approval must match this exact support job limit');
    const { fetchPortOnePayment } = await import('../worker/lib/portone.js');
    assertSupportPaymentApproval(order, await fetchPortOnePayment(env, orderId));
    if (plan.set) plan.set['llmMeta.supportRecovery'].refundApproved = process.argv.includes('--allow-refund');
    else assert.equal(Boolean(doc.llmMeta.supportRecovery.refundApproved), process.argv.includes('--allow-refund'), 'Refund approval must match the original support job');
    const executionStore = db.collection('paid_execution_records');
    const executionFilter = { userId: owner, featureId: order.featureKey, requestId,
      $or: [{ orderId }, { paymentId: orderId }] };
    const execution = await executionStore.findOne(executionFilter, { maxTimeMS: 10000 });
    assert.ok(!execution || !['completed', 'refunded', 'cancelled'].includes(execution.status), 'Existing completed/revoked execution requires review');
    if (plan.action === 'recover') {
      const operation = `paid-support-${createHash('sha256').update(orderId).digest('hex').slice(0, 20)}`;
      if (!existsSync(`backups/migrations/${operation}.before.json`)) writeBeforeImage(operation,
        [{ _id: String(doc._id), id: doc.id, original: plan.original,
          execution: execution ? { _id: String(execution._id), status: execution.status, error: execution.error } : null }],
        { database, orderId, service: spec.service });
      const session = await mongoose.connection.startSession();
      try {
        await session.withTransaction(async () => {
          const liveOrder = await db.collection('payments').findOne({ _id: order._id, userId: order.userId,
            status: { $in: ['paid', 'success', 'fulfilled'] }, refundLock: null }, { session });
          assert.ok(liveOrder && !liveOrder.metadata?.refundStatus, 'Order changed during support approval');
          const changed = await store.updateOne({ _id: doc._id, userId: owner, status: 'generation_failed',
            updatedAt: doc.updatedAt, 'llmMeta.supportRecovery': { $exists: false }, 'llmMeta.deliveryRefund': { $exists: false } },
          { $set: { ...plan.set, updatedAt: new Date() } }, { session });
          assert.equal(changed.modifiedCount, 1, 'Support plan became stale; nothing was armed');
          if (execution) {
            const repaired = await executionStore.updateOne({ _id: execution._id, ...executionFilter,
              status: execution.status, updatedAt: execution.updatedAt },
            { $set: { status: 'paid_pending_generation', error: null, updatedAt: new Date() } }, { session });
            assert.equal(repaired.modifiedCount, 1, 'Execution changed during support approval');
          }
        }, mongoTransactionOptions());
      } finally { await session.endSession(); }
    }
    // The persistent part budget protects this job even if a browser or cron joins it.
    for (let wave = 0; wave <= approvedCalls + 2; wave++) {
      doc = await store.findOne({ id: doc.id, userId: owner }, { maxTimeMS: 10000 });
      if (['completed', 'generation_failed'].includes(doc.status)) break;
      const response = await route.resumeConsultationOnServer(env, { id: doc.id, userId: owner });
      const payload = await response.json().catch(() => ({}));
      console.log(JSON.stringify({ wave: wave + 1, httpStatus: response.status, status: payload.status,
        reason: payload.reason, calls, progress: payload.progress }));
      if (![200, 202].includes(response.status)) break;
    }
    doc = await store.findOne({ id: doc.id, userId: owner }, { maxTimeMS: 10000 });
    for (const part of partsFor(doc)) {
      if (plan.preserved?.[part.key]) assert.equal(partHash(part.body), plan.preserved[part.key], 'A preserved part changed');
    }
    if (['completed', 'generation_failed'].includes(doc.status)) await store.updateOne({ id: doc.id, userId: owner,
      'llmMeta.supportRecovery.active': true, status: doc.status }, { $set: {
      'llmMeta.supportRecovery.active': false, 'llmMeta.supportRecovery.finishedAt': new Date().toISOString() } });
    if (doc.status === 'generation_failed' && process.argv.includes('--allow-refund')) {
      const { settleFailedConsultationRefund } = await import('../worker/lib/consultation-delivery-refund.js');
      await settleFailedConsultationRefund(env, { service: spec.service, id: doc.id, userId: owner });
      doc = await store.findOne({ id: doc.id, userId: owner }, { maxTimeMS: 10000 });
    }
    console.log(JSON.stringify({ resultId: doc.id, status: doc.status, providerCallsThisProcess: calls,
      supportCallsReserved: doc.llmMeta?.supportRecovery?.callsReserved, refundStatus: doc.llmMeta?.deliveryRefund?.status || null }));
    if (doc.status !== 'completed') process.exitCode = 2;
  }
} catch (cause) {
  const code = /^[A-Z][A-Z0-9_]{0,100}$/.test(String(cause?.code || '')) ? cause.code : 'SUPPORT_RECOVERY_FAILED';
  console.error(JSON.stringify({ code, providerCallsThisProcess: calls })); process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
  if (connected) await mongoose.disconnect();
}
