/** Read-only trace of one paid order: PortOne → payment → result → library. No writes, no LLM. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { config } from 'dotenv';
import { connectDb, mongoose } from '../worker/lib/db.js';
import { buildMongoEnv, requireMongoUri } from './lib/migration-before-image.mjs';
import { supportRecoveryEnvironment } from './lib/paid-consultation-support.mjs';

config({ path: '.env.local', quiet: true });
const value = name => process.argv[process.argv.indexOf(name) + 1];
const database = process.argv.includes('--db') ? value('--db') : '';
const orderId = process.argv.includes('--order') ? value('--order') : '';
assert.ok(['code_destiny', 'code_destiny_staging'].includes(database), '--db is required');
assert.match(orderId, /^[a-zA-Z0-9_-]{12,180}$/, '--order is required');
// .env.cloudflare.local carries a stale key; the V2 secret lives in .env.local under its console name.
if (!process.env.PORTONE_API_SECRET && process.env.PORTONE_V2_API_Secret) process.env.PORTONE_API_SECRET = process.env.PORTONE_V2_API_Secret;
const env = supportRecoveryEnvironment(database, { ...process.env, ...buildMongoEnv() });
requireMongoUri(env);

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const target = new URL(String(url));
  if (target.hostname === 'api.portone.io' && (!init?.method || init.method === 'GET')
    && target.pathname === `/payments/${encodeURIComponent(orderId)}`) return originalFetch(url, init);
  throw new Error('Read-only audit: external call blocked');
};
const hash = input => createHash('sha256').update(String(input)).digest('hex').slice(0, 12);
const iso = input => input && Number.isFinite(Date.parse(input)) ? new Date(input).toISOString() : null;
const report = { database, orderId, blockers: [] };

let connected = false;
try {
  try {
    const { fetchPortOnePayment } = await import('../worker/lib/portone.js');
    const pg = await fetchPortOnePayment(env, orderId);
    report.portone = { status: pg.status, amount: pg.amount, currency: pg.currency, paidAt: iso(pg.paidAt || pg.paid_at),
      orderName: pg.name || pg.orderName || '', cancelledAmount: pg.cancelAmount ?? pg.cancelledAmount ?? null,
      idMatches: String(pg.merchant_uid || pg.paymentId || pg.id || '') === orderId };
  } catch (error) {
    report.blockers.push({ step: 'portone', code: String(error?.status || error?.code || error?.message || 'error').slice(0, 120) });
  }

  await connectDb(env); connected = true;
  assert.equal(mongoose.connection.name, database);
  const db = mongoose.connection.db;
  const payments = await db.collection('payments').find({ merchantUid: orderId }, { maxTimeMS: 10000 }).toArray();
  report.paymentDocs = payments.length;
  const order = payments[0];
  if (!order) { report.classification = 'never_recorded'; throw Object.assign(new Error('PAYMENT_DOC_NOT_FOUND'), { soft: true }); }
  const owner = String(order.userId || '');
  const requestId = String(order.requestId || order.idempotencyKey || '');
  report.payment = { featureKey: order.featureKey, status: order.status, amount: order.paymentAmount, method: order.paymentMethod,
    paymentType: order.paymentType, purchaseType: order.purchaseType, ownerHash: hash(owner), requestIdHash: requestId ? hash(requestId) : null,
    createdAt: iso(order.createdAt), updatedAt: iso(order.updatedAt), refundLock: Boolean(order.refundLock),
    refundStatus: order.metadata?.refundStatus || null, unlockRevoked: Boolean(order.metadata?.unlockRevoked),
    fusionRecovery: order.metadata?.fusionRecovery ? { ...order.metadata.fusionRecovery, at: iso(order.metadata.fusionRecovery.at),
      nextAttemptAt: iso(order.metadata.fusionRecovery.nextAttemptAt) } : null,
    paidResume: order.metadata?.paidResume ? { status: order.metadata.paidResume.status, createdAt: iso(order.metadata.paidResume.createdAt),
      hasPayload: Boolean(order.metadata.paidResume.payload) } : null };
  if (report.portone) report.amountMatches = Number(report.portone.amount?.total ?? report.portone.amount) === Number(order.paymentAmount);

  try {
    const { readOrderResumeContext } = await import('../worker/payments/resume-context.js');
    const context = await readOrderResumeContext(order, env);
    report.resumeInput = context ? { available: true, kind: context.resume?.kind || null,
      requestMatches: context.resume?.args?.requestId === requestId, hasBody: Boolean(context.resume?.args?.body) } : { available: false };
  } catch (error) {
    report.resumeInput = { available: false, error: String(error?.code || error?.message || 'error').slice(0, 80) };
  }

  const owners = [owner, ...(mongoose.Types.ObjectId.isValid(owner) ? [new mongoose.Types.ObjectId(owner)] : [])];
  const fusionDocs = await db.collection('fusionFortuneConsultations').find({ userId: { $in: owners }, idempotencyKey: requestId }, { maxTimeMS: 10000 }).toArray();
  const ownerFusion = await db.collection('fusionFortuneConsultations').find({ userId: { $in: owners } },
    { projection: { status: 1, idempotencyKey: 1, createdAt: 1, stage: 1 }, maxTimeMS: 10000 }).toArray();
  report.ownerFusionDocs = ownerFusion.map(doc => ({ status: doc.status, stage: doc.stage, createdAt: iso(doc.createdAt),
    sameRequest: doc.idempotencyKey === requestId }));
  const elsewhere = await db.collection('fusionFortuneConsultations').countDocuments({ idempotencyKey: requestId, userId: { $nin: owners } }, { maxTimeMS: 10000 });
  report.sameRequestOtherOwners = elsewhere;
  report.fusionDocs = fusionDocs.length;
  const doc = fusionDocs[0];
  if (doc) {
    const snapshot = doc.generationSnapshot || null;
    const fusion = await import('../worker/lib/fusion-fortune.js');
    const { fusionGroupsForStage } = await import('../worker/lib/fusion-fortune-prompt.js');
    const groups = snapshot?.context ? [1, 2].flatMap(stage => fusionGroupsForStage(stage, snapshot.context).map(group => {
      const check = fusion.validateFusionFortuneGroup(doc.result || {}, group, fusion.fusionValidationOptions(snapshot.context, snapshot.input));
      const strict = fusion.validateFusionFortuneGroup(doc.result || {}, group, { ...fusion.fusionValidationOptions(snapshot.context, snapshot.input), ignoreLength: false });
      return { stage, id: group.id, optional: Boolean(group.optional), ok: check.ok, lengthOk: strict.ok,
        reason: check.ok ? null : [check.issue || 'invalid', check.detail].filter(Boolean).join(':').slice(0, 80),
        attempts: Number(snapshot.attempts?.[group.id] || 0) };
    })) : [];
    report.result = { id: doc.id ? hash(doc.id) : null, status: doc.status, stage: doc.stage, nextStage: doc.nextStage,
      generationSource: doc.generationSource, qualityTier: doc.qualityTier, visibleTextLength: doc.visibleTextLength,
      createdAt: iso(doc.createdAt), updatedAt: iso(doc.updatedAt), resultKeys: Object.keys(doc.result || {}).length,
      hasSnapshot: Boolean(snapshot), hasContext: Boolean(snapshot?.context), hasInput: Boolean(snapshot?.input),
      premiumVersion: snapshot?.context?.reportVersion || null,
      attemptLimit: snapshot ? fusion.fusionGroupAttemptLimit(snapshot) : null, recovery: snapshot?.recovery || null,
      failureCodes: snapshot?.failureCodes || snapshot?.failures || null,
      lease: doc.generationLease ? { expiresAt: iso(doc.generationLease.expiresAt) } : null,
      llmMetaKeys: Object.keys(doc.llmMeta || {}), groups };
    const reservations = await db.collection('fusionFortuneGenerationAttempts').find({ requestId: { $in: [1, 2].map(stage => fusion.fusionStageReservationId(requestId, stage)).concat(requestId) } },
      { projection: { status: 1, errorCode: 1, createdAt: 1, updatedAt: 1, expiresAt: 1 }, maxTimeMS: 10000 }).toArray();
    report.reservations = reservations.map(row => ({ status: row.status, errorCode: row.errorCode, createdAt: iso(row.createdAt), expiresAt: iso(row.expiresAt) }));
  }

  const executions = await db.collection('paid_execution_records').find({ userId: { $in: owners }, $or: [{ orderId }, { paymentId: orderId }, { requestId }] },
    { projection: { status: 1, featureId: 1, error: 1, createdAt: 1, updatedAt: 1 }, maxTimeMS: 10000 }).toArray();
  report.executions = executions.map(row => ({ status: row.status, featureId: row.featureId, error: row.error ? String(row.error).slice(0, 80) : null, createdAt: iso(row.createdAt) }));
  const entitlements = await db.collection('content_entitlements').find({ userId: { $in: owners }, $or: [{ orderId }, { paymentId: orderId }, { merchantUid: orderId }, { requestId }] },
    { projection: { status: 1, featureKey: 1, revokedAt: 1, createdAt: 1 }, maxTimeMS: 10000 }).toArray();
  report.entitlements = entitlements.map(row => ({ status: row.status, featureKey: row.featureKey, revoked: Boolean(row.revokedAt), createdAt: iso(row.createdAt) }));
  const webhooks = await db.collection('payment_webhook_events').find({ $or: [{ paymentId: orderId }, { merchantUid: orderId }, { 'data.paymentId': orderId }] },
    { projection: { type: 1, status: 1, createdAt: 1, processedAt: 1 }, maxTimeMS: 10000 }).toArray();
  report.webhooks = webhooks.map(row => ({ type: row.type, status: row.status, createdAt: iso(row.createdAt), processedAt: iso(row.processedAt) }));
  const indexes = await db.collection('fusionFortuneConsultations').indexes();
  report.fusionIndexes = indexes.map(index => ({ name: index.name, unique: Boolean(index.unique) }));

  const { listRecords } = await import('../worker/lib/record-library.js');
  const listed = await listRecords(owner, new URLSearchParams({ source: 'fusion', limit: '30' }));
  report.library = { ok: listed.ok, failures: listed.failures, items: listed.items.map(item => ({ status: item.status, createdAt: item.createdAt,
    matchesResult: Boolean(doc && item.id === String(doc.id)) })) };

  const paid = report.portone?.status === 'PAID' || report.portone?.status === 'paid';
  if (!paid || ['cancelled', 'refunded'].includes(order.status) || order.metadata?.unlockRevoked) report.classification = 'not_paid_or_refunded';
  else if (!doc) report.classification = 'never_requested';
  else if (doc.status === 'completed' && report.library.items.some(item => item.matchesResult && item.status === 'completed')) report.classification = 'completed_visible';
  else if (doc.status === 'completed') report.classification = 'generated_not_linked';
  else if (!doc.generationSnapshot?.context) report.classification = 'empty_stub';
  else report.classification = 'generation_error';
} catch (error) {
  if (!error?.soft) report.blockers.push({ step: 'audit', code: String(error?.code || error?.message || 'error').slice(0, 160) });
} finally {
  if (connected) await mongoose.disconnect();
  globalThis.fetch = originalFetch;
}
console.log(JSON.stringify(report, null, 2));
