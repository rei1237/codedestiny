/**
 * One approved paid fusion order, resumed from its own saved input and context.
 * Default: dry-run (PortOne GET only, no LLM, no writes). Valid groups are never rewritten.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { config } from 'dotenv';
import { connectDb, mongoose, mongoTransactionOptions } from '../worker/lib/db.js';
import { buildMongoEnv, requireMongoUri, writeBeforeImage } from './lib/migration-before-image.mjs';
import { supportRecoveryEnvironment } from './lib/paid-consultation-support.mjs';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });
const value = name => process.argv[process.argv.indexOf(name) + 1];
const arg = name => process.argv.includes(name) ? value(name) : '';
const database = arg('--db');
const orderId = arg('--order');
assert.ok(['code_destiny', 'code_destiny_staging'].includes(database), '--db is required');
assert.match(orderId, /^[a-zA-Z0-9_-]{12,180}$/, '--order is required');
const execute = process.argv.includes('--execute');
const approvedCalls = Number(arg('--max-provider-calls') || 0);
const scopedOrders = {
  // 2026-10-30 approval: one paid premium fusion order, at most 20 Gemini generateContent calls across every run.
  // outsideCalls: one schema probe sent by hand. attemptCorrection: those attempts all died at countTokens on the
  // retired gemini-2.5-pro (404), so no generateContent was ever sent for them.
  cd49739990d1c383aee318e695e052f49a87e518: { maxCalls: 20, outsideCalls: 1,
    attemptCorrection: { groups: ['integration', 'verdict'], reason: 'gemini-2.5-pro 404 at countTokens; no generateContent issued' } },
};
if (execute) {
  assert.ok(scopedOrders[orderId], 'Only the reviewed fusion order may be resumed');
  assert.equal(approvedCalls, scopedOrders[orderId].maxCalls, 'Approval must match the reviewed maximum call count');
  for (const name of ['--plan-sha', '--expected-owner', '--reason', '--operator']) assert.ok(arg(name), `${name} is required with --execute`);
}
// .env.cloudflare.local carries a stale key; the V2 secret lives in .env.local under its console name.
if (!process.env.PORTONE_API_SECRET && process.env.PORTONE_V2_API_Secret) process.env.PORTONE_API_SECRET = process.env.PORTONE_V2_API_Secret;
assert.notEqual(process.env.NODE_ENV, 'test', 'Real recovery never runs under the test environment');
const env = supportRecoveryEnvironment(database, { ...process.env, ...buildMongoEnv(), ENABLE_FUSION_FORTUNE_API: 'true', ENABLE_FUSION_FORTUNE_REAL_LLM: 'true', ALLOW_FUSION_FORTUNE_REAL_LLM: 'true',
  ENABLE_FUSION_FORTUNE_MOCK_FLOW: 'false' });
requireMongoUri(env);

const originalFetch = globalThis.fetch;
let calls = 0, maxTokensSeen = 0, armed = false, callCap = 0;
globalThis.fetch = async (url, init) => {
  const target = new URL(String(url));
  assert.equal(target.protocol, 'https:', 'Provider credentials require HTTPS');
  if (target.hostname === 'api.portone.io' && (!init?.method || init.method === 'GET')
    && target.pathname === `/payments/${encodeURIComponent(orderId)}`) return originalFetch(url, init);
  if (armed && target.hostname === 'generativelanguage.googleapis.com'
    && /\/models\/gemini-2\.5-(?:flash|pro):(?:countTokens|generateContent)$/.test(target.pathname)) {
    if (target.pathname.endsWith(':generateContent')) {
      if (calls >= callCap) throw Object.assign(new Error('APPROVED_PROVIDER_CALL_LIMIT'), { code: 'APPROVED_PROVIDER_CALL_LIMIT' });
      const tokens = Number(JSON.parse(init.body).generationConfig?.maxOutputTokens || 0);
      assert.ok(tokens > 0 && tokens <= 65536, 'APPROVED_OUTPUT_TOKEN_LIMIT');
      maxTokensSeen = Math.max(maxTokensSeen, tokens);
      calls++;
    }
    return originalFetch(url, init);
  }
  throw new Error('Unapproved external operation blocked during fusion recovery');
};

const hash = input => createHash('sha256').update(typeof input === 'string' ? input : JSON.stringify(input ?? null)).digest('hex');
const short = input => hash(input).slice(0, 12);
const iso = input => input && Number.isFinite(Date.parse(input)) ? new Date(input).toISOString() : null;
const PAID = ['paid', 'success', 'fulfilled'];
const report = { database, orderIdHash: short(orderId), mode: execute ? 'execute' : 'dry-run' };

let connected = false;
try {
  const fusion = await import('../worker/lib/fusion-fortune.js');
  const { fusionGroupsForStage } = await import('../worker/lib/fusion-fortune-prompt.js');
  const { fetchPortOnePayment } = await import('../worker/lib/portone.js');
  const pg = await fetchPortOnePayment(env, orderId);
  const pgAmount = Number(pg.amount?.total ?? pg.amount);
  report.portone = { status: pg.status, amount: pgAmount, currency: pg.currency?.code || pg.currency || '',
    idMatches: String(pg.merchant_uid || pg.paymentId || pg.id || '') === orderId };

  await connectDb(env); connected = true;
  assert.equal(mongoose.connection.name, database);
  const db = mongoose.connection.db;
  const payments = await db.collection('payments').find({ merchantUid: orderId }, { maxTimeMS: 10000 }).toArray();
  assert.equal(payments.length, 1, 'ORDER_PAYMENT_DOC_COUNT');
  const order = payments[0];
  assert.equal(order.featureKey, fusion.FUSION_FORTUNE_PAID_FEATURE_KEY, 'ORDER_NOT_FUSION');
  const owner = String(order.userId || '');
  const requestId = String(order.requestId || order.idempotencyKey || '');
  assert.ok(owner && requestId, 'ORDER_IDENTITY_MISSING');
  const owners = [owner, ...(mongoose.Types.ObjectId.isValid(owner) ? [new mongoose.Types.ObjectId(owner)] : [])];
  const paymentOk = ['PAID', 'paid'].includes(pg.status) && report.portone.idMatches && pgAmount === Number(order.paymentAmount)
    && String(report.portone.currency).toUpperCase() === 'KRW' && PAID.includes(order.status) && !order.refundLock
    && !order.metadata?.refundStatus && !order.metadata?.unlockRevoked;
  report.payment = { status: order.status, amount: order.paymentAmount, refundLock: Boolean(order.refundLock),
    refundStatus: order.metadata?.refundStatus || null, unlockRevoked: Boolean(order.metadata?.unlockRevoked), paymentOk };

  const store = db.collection('fusionFortuneConsultations');
  const docs = await store.find({ userId: { $in: owners }, idempotencyKey: requestId }, { maxTimeMS: 10000 }).toArray();
  assert.equal(docs.length, 1, 'FUSION_DOC_COUNT');
  const doc = docs[0];
  const snapshot = doc.generationSnapshot;
  assert.ok(snapshot?.context && snapshot?.input, 'SNAPSHOT_INPUT_OR_CONTEXT_MISSING');
  const options = { ...fusion.fusionValidationOptions(snapshot.context, snapshot.input), ignoreLength: true };
  const limit = fusion.fusionGroupAttemptLimit(snapshot);
  const scope = scopedOrders[orderId] || { maxCalls: 0 };
  const audits = Array.isArray(doc.recoveryAudit) ? doc.recoveryAudit : [];
  const priorRuns = audits.filter(entry => entry.kind === 'script-recover');
  const priorCalls = priorRuns.reduce((sum, entry) => sum + Number(entry.providerCalls || 0), 0) + Number(scope.outsideCalls || 0);
  const remainingCalls = Math.max(0, scope.maxCalls - priorCalls);
  const groupsFor = source => [1, 2].flatMap(stage => fusionGroupsForStage(stage, snapshot.context).map(group => {
    const ok = fusion.validateFusionFortuneGroup(source.result || {}, group, options).ok;
    const attempts = Number(source.generationSnapshot?.attempts?.[group.id] || 0);
    return { stage, id: group.id, optional: Boolean(group.optional), ok, attempts,
      // Completion always re-normalizes visualization, so it cannot prove a group was rewritten.
      remaining: Math.max(0, limit - attempts),
      digest: ok ? hash(group.keys.filter(key => key !== 'visualization').map(key => [key, source.result?.[key] ?? null])) : null };
  }));
  const before = groupsFor(doc);
  // One-time, reviewed correction: only still-invalid groups, and never twice for the same order.
  const correction = audits.some(entry => entry.kind === 'attempt-correction') ? null : scope.attemptCorrection;
  const corrected = Object.fromEntries((correction?.groups || []).map(id => before.find(group => group.id === id))
    .filter(group => group && !group.ok && group.attempts > 0).map(group => [group.id, group.attempts]));
  const planned = before.map(group => group.id in corrected ? { ...group, attempts: 0, remaining: limit } : group);
  const missing = planned.filter(group => !group.ok);
  const callable = missing.filter(group => group.remaining > 0);
  report.result = { idHash: short(String(doc.id)), status: doc.status, stage: doc.stage, nextStage: doc.nextStage,
    updatedAt: iso(doc.updatedAt), attemptLimit: limit, lease: doc.generationLease ? iso(doc.generationLease.expiresAt) : null,
    groups: planned.map(({ digest, ...group }) => group) };
  report.calls = { approved: scope.maxCalls, prior: priorCalls, remaining: remainingCalls, minimum: callable.length };
  report.attemptCorrection = Object.keys(corrected).length ? { before: corrected, reason: correction.reason } : null;
  const planSha = hash({ orderId, owner, docId: String(doc.id), updatedAt: iso(doc.updatedAt), attempts: snapshot.attempts || {},
    missing: missing.map(group => group.id), maxCalls: scope.maxCalls, priorCalls, corrected });
  report.planSha = planSha;
  report.owner = owner;

  const blockers = [];
  if (!paymentOk) blockers.push('PAYMENT_NOT_CONFIRMED');
  if (doc.status === 'completed') blockers.push('RESULT_ALREADY_COMPLETED');
  if (!callable.length) blockers.push('NOTHING_TO_GENERATE');
  if (priorRuns.some(entry => !Number.isFinite(entry.providerCalls))) blockers.push('PRIOR_RUN_UNACCOUNTED');
  if (callable.length > remainingCalls) blockers.push('CALL_CAP_TOO_SMALL');
  if (missing.some(group => !group.optional && group.remaining < 1)) blockers.push('REQUIRED_GROUP_ATTEMPTS_EXHAUSTED');
  if (doc.generationLease && Date.parse(doc.generationLease.expiresAt) > Date.now()) blockers.push('LEASE_HELD');
  report.blockers = blockers;
  if (!execute) throw Object.assign(new Error('DRY_RUN'), { soft: true });

  assert.equal(blockers.length, 0, `BLOCKED:${blockers.join(',')}`);
  assert.equal(arg('--plan-sha'), planSha, 'PLAN_CHANGED_SINCE_DRY_RUN');
  assert.equal(arg('--expected-owner'), owner, 'EXPECTED_OWNER_MISMATCH');
  const startedAt = new Date();
  writeBeforeImage(`recover-fusion-fortune-order-${short(orderId)}`, [{ _id: String(doc._id), status: doc.status, stage: doc.stage,
    nextStage: doc.nextStage, updatedAt: iso(doc.updatedAt), attempts: snapshot.attempts || {}, recovery: snapshot.recovery || null,
    resultDigest: hash(doc.result || {}), resultKeys: Object.keys(doc.result || {}), unbilledFailures: snapshot.unbilledFailures || null,
    recoveryAuditCount: audits.length }], { orderIdHash: short(orderId), planSha, corrected });
  const audit = { kind: 'script-recover', operator: arg('--operator'), reason: arg('--reason').slice(0, 200), planSha, maxCalls: remainingCalls, at: startedAt };
  const entries = [audit, ...(Object.keys(corrected).length ? [{ kind: 'attempt-correction', operator: arg('--operator'), reason: correction.reason,
    groups: Object.keys(corrected), before: corrected, planSha, at: startedAt }] : [])];
  const update = { $push: { recoveryAudit: { $each: entries } },
    ...(Object.keys(corrected).length ? { $set: Object.fromEntries(Object.keys(corrected).map(id => [`generationSnapshot.attempts.${id}`, 0])) } : {}) };
  const unchangedAttempts = Object.fromEntries(Object.entries(corrected).map(([id, count]) => [`generationSnapshot.attempts.${id}`, count]));
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const paid = await db.collection('payments').findOne({ _id: order._id, status: { $in: PAID }, refundLock: { $in: [null, false] },
        'metadata.refundStatus': { $exists: false }, 'metadata.unlockRevoked': { $ne: true } }, { session });
      assert.ok(paid, 'PAYMENT_CHANGED_BEFORE_RECOVERY');
      const marked = await store.updateOne({ _id: doc._id, updatedAt: doc.updatedAt, status: { $ne: 'completed' }, ...unchangedAttempts },
        update, { session });
      assert.equal(marked.modifiedCount, 1, 'RESULT_CHANGED_BEFORE_RECOVERY');
    }, mongoTransactionOptions());
  } finally {
    await session.endSession();
  }
  const { AdminAuditLog } = await import('../worker/lib/models.js');
  const log = await AdminAuditLog.create({ action: 'SCRIPT recover-fusion-fortune-order', actorLabel: arg('--operator'), mode: 'anonymous',
    outcome: 'attempted', meta: { orderIdHash: short(orderId), planSha, maxCalls: remainingCalls, priorCalls, corrected } });

  const { runFusionFortuneDeliveryStage } = await import('../worker/routes/fusion-fortune.js');
  const progress = value => hash([value?.status, value?.nextStage, value?.generationSnapshot?.attempts, value?.result]);
  report.runs = [];
  callCap = remainingCalls;
  armed = true;
  for (let run = 0; run < 12; run++) {
    const current = await store.findOne({ _id: doc._id });
    if (current.status === 'completed' || calls >= callCap) break;
    const stage = current.nextStage === 1 || !fusion.hasFusionStageOneResult(current.result) ? 1 : 2;
    const startedCalls = calls, began = Date.now();
    let outcome;
    try {
      outcome = await runFusionFortuneDeliveryStage(env, { userId: owner, requestId, body: current.generationSnapshot.input, stage,
        prior: current, requireExisting: true, budget: 'background' });
    } catch (error) {
      outcome = { ok: false, error: String(error?.code || error?.message || 'error').slice(0, 120) };
    }
    const saved = await store.findOne({ _id: doc._id });
    report.runs.push({ stage, ok: Boolean(outcome.ok), stageStatus: outcome.stageStatus || null,
      error: outcome.ok ? null : String(outcome.reason || outcome.error || '').slice(0, 120),
      automaticRetryAllowed: outcome.automaticRetryAllowed ?? null, pendingGroups: outcome.pendingGroups || null,
      calls: calls - startedCalls, seconds: Math.round((Date.now() - began) / 1000), status: saved.status, nextStage: saved.nextStage });
    if (saved.status === 'completed' || !outcome.ok || progress(saved) === progress(current)) break;
  }
  armed = false;

  const final = await store.findOne({ _id: doc._id });
  const after = groupsFor(final);
  const { listRecords } = await import('../worker/lib/record-library.js');
  const listed = await listRecords(owner, new URLSearchParams({ source: 'fusion', limit: '30' }));
  const visible = listed.items.filter(item => item.id === String(final.id));
  report.verify = {
    status: final.status, qualityTier: final.qualityTier || null, visibleTextLength: final.visibleTextLength || null,
    invalidGroups: after.filter(group => !group.ok).map(group => group.id),
    previouslyValidUnchanged: before.filter(group => group.ok).every(group => after.find(next => next.id === group.id)?.digest === group.digest),
    libraryItems: visible.map(item => item.status),
    otherOwnerDocs: await store.countDocuments({ idempotencyKey: requestId, userId: { $nin: owners } }),
    newPayments: await db.collection('payments').countDocuments({ userId: { $in: owners }, createdAt: { $gte: startedAt } }),
    newPointHistory: await db.collection('pointhistories').countDocuments({ userId: { $in: owners }, createdAt: { $gte: startedAt } }),
    providerCalls: calls, maxOutputTokensSeen: maxTokensSeen,
  };
  const delivered = final.status === 'completed' && visible.some(item => item.status === 'completed') && report.verify.previouslyValidUnchanged
    && report.verify.otherOwnerDocs === 0 && report.verify.newPayments === 0 && report.verify.newPointHistory === 0;
  report.delivered = delivered;
  await store.updateOne({ _id: doc._id, recoveryAudit: { $elemMatch: { kind: 'script-recover', planSha } } },
    { $set: { 'recoveryAudit.$.finishedAt': new Date(), 'recoveryAudit.$.delivered': delivered, 'recoveryAudit.$.providerCalls': calls } });
  await AdminAuditLog.updateOne({ _id: log._id }, { $set: { outcome: delivered ? 'granted' : 'denied',
    meta: { orderIdHash: short(orderId), planSha, maxCalls: remainingCalls, priorCalls, corrected, providerCalls: calls, status: final.status, delivered } } });
  if (!delivered) process.exitCode = 2;
} catch (error) {
  if (!error?.soft) {
    report.error = String(error?.code || error?.message || 'error').slice(0, 160);
    process.exitCode = 1;
  }
} finally {
  armed = false;
  if (connected) await mongoose.disconnect();
  globalThis.fetch = originalFetch;
}
report.providerCalls = calls;
console.log(JSON.stringify(report, null, 2));
