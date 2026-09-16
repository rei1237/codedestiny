import { connectDb, withMongoRetry } from './db.js';
import { ZiweiDeepReport, Payment } from './models.js';
import { readOrderResumeContext, RESUME_APPROVED_TTL_MS } from '../payments/resume-context.js';
import { runZiweiDeepReportDeliveryBatch } from '../routes/ziwei-deep-report.js';
import { ZIWEI_DEEP_CHAPTERS, ZIWEI_DEEP_PDF_META } from './ziwei-deep-report-prompt.mjs';
import { __ziweiDeepReportTestUtils } from '../routes/ziwei-deep-report.js';

const FEATURE_KEY = ZIWEI_DEEP_PDF_META.featureKey;
const ABANDONED_AFTER_MS = 300000, TASK_BUDGET_MS = 240000, BATCH_BUDGET_MS = 65000, MAX_PER_TICK = 3;
const PAID = ['paid', 'success', 'fulfilled'];
const isDeepChapterComplete = __ziweiDeepReportTestUtils.isDeepChapterComplete;
const reusableDeepChapters = __ziweiDeepReportTestUtils.reusableDeepChapters;
const GENERATING_FRESHNESS_MS = __ziweiDeepReportTestUtils.GENERATING_FRESHNESS_MS;
const CHAPTER_MAX_ATTEMPTS = __ziweiDeepReportTestUtils.CHAPTER_MAX_ATTEMPTS;

/** Only encrypted input attached to the original approved self purchase can start a report. */
async function bootstrapApprovedZiweiDeepOrders(env, now, deadline, runBatch) {
  const orders = await withMongoRetry(env, () => Payment.find({
    featureKey: FEATURE_KEY, paymentType: 'digital_content', purchaseType: { $ne: 'GIFT' }, status: { $in: PAID },
    'metadata.unlockRevoked': { $ne: true }, createdAt: { $gt: new Date(now - RESUME_APPROVED_TTL_MS), $lt: new Date(now - ABANDONED_AFTER_MS) },
    'metadata.ziweiDeepRecovery.status': { $nin: ['started', 'input_required'] },
    $or: [{ 'metadata.ziweiDeepRecovery.nextAttemptAt': { $exists: false } }, { 'metadata.ziweiDeepRecovery.nextAttemptAt': { $lte: new Date(now) } }],
  }).sort({ createdAt: 1 }).limit(MAX_PER_TICK).lean());
  const outcomes = [];
  for (const order of orders) {
    if (Date.now() + BATCH_BUDGET_MS > deadline) break;
    const userId = String(order.userId || ''), requestId = String(order.requestId || ''), orderId = String(order.merchantUid || '');
    if (!userId || !requestId || !orderId) continue;
    const filter = { merchantUid: orderId, userId: order.userId, status: { $in: PAID }, 'metadata.unlockRevoked': { $ne: true } };
    try {
      const prior = await withMongoRetry(env, () => ZiweiDeepReport.findOne({ userId, idempotencyKey: requestId }).lean());
      if (!prior) {
        const context = await readOrderResumeContext(order, env, now);
        if (!context?.resume?.args?.payload) {
          await withMongoRetry(env, () => Payment.updateOne(filter, { $set: { 'metadata.ziweiDeepRecovery': { status: 'input_required', at: new Date(now) } } }), { retries: 0 });
          outcomes.push({ requestId, outcome: 'input_required' }); continue;
        }
        if (context.resume.kind !== FEATURE_KEY || context.resume.args.idempotencyKey !== requestId) throw new Error('PURCHASE_RUN_MISMATCH');
        const body = { ...JSON.parse(context.resume.args.payload), idempotencyKey: requestId, paymentId: orderId };
        await runBatch(new Request('https://internal.invalid/api/ziwei-deep-report/generate'), env, body, { userId }, { requireExisting: true });
        if (!(await withMongoRetry(env, () => ZiweiDeepReport.findOne({ userId, idempotencyKey: requestId }).lean()))) throw new Error('START_PENDING');
      }
      await withMongoRetry(env, () => Payment.updateOne(filter, { $set: { 'metadata.ziweiDeepRecovery': { status: 'started', at: new Date(now) } } }), { retries: 0 });
      outcomes.push({ requestId, outcome: 'started' });
    } catch (error) {
      await withMongoRetry(env, () => Payment.updateOne(filter, { $set: { 'metadata.ziweiDeepRecovery': {
        status: 'recovery_pending', code: String(error?.code || 'RECOVERY_PENDING').slice(0, 120), nextAttemptAt: new Date(now + 600000),
      } } }), { retries: 0 });
      outcomes.push({ requestId, outcome: 'recovery_pending' });
    }
  }
  return outcomes;
}

export function buildAbandonedZiweiDeepFilter(now) {
  return { status: { $in: ['partial', 'generating', 'delivery_pending'] }, updatedAt: { $lt: new Date(now - ABANDONED_AFTER_MS) },
    'llmMeta.resumeBody': { $exists: true }, 'llmMeta.recovery.reviewRequired': { $ne: true },
    $and: [{ $or: [{ 'llmMeta.recovery.nextAttemptAt': { $exists: false } }, { 'llmMeta.recovery.nextAttemptAt': { $lte: new Date(now) } }] }],
    $or: [{ 'llmMeta.lockedAt': null }, { 'llmMeta.lockedAt': { $exists: false } }, { 'llmMeta.lockedAt': { $lt: new Date(now - GENERATING_FRESHNESS_MS).toISOString() } }],
  };
}

/** Existing ten-minute tick; shares the route's immutable chart, lock and chapter budgets. */
export async function runZiweiDeepReportRecovery(env, options = {}) {
  const now = options.now || Date.now(), deadline = now + TASK_BUDGET_MS;
  await (options.connectDb || connectDb)(env);
  const runBatch = options.runBatch || runZiweiDeepReportDeliveryBatch;
  const bootstrapped = await bootstrapApprovedZiweiDeepOrders(env, now, deadline, runBatch);
  const unsynced = await withMongoRetry(env, () => ZiweiDeepReport.find({ status: 'completed', 'llmMeta.executionSyncPending': true }).sort({ updatedAt: 1 }).limit(MAX_PER_TICK).lean());
  for (const candidate of unsynced) {
    if (Date.now() + BATCH_BUDGET_MS > deadline) break;
    try {
      await runBatch(new Request('https://internal.invalid/api/ziwei-deep-report/generate'), env,
        { resumeReportId: candidate.id }, { userId: String(candidate.userId) }, { requireExisting: true });
    } catch (error) { console.warn('[ziwei-deep-execution-sync]', String(error?.code || 'SYNC_PENDING').slice(0, 120)); }
  }
  const candidates = await withMongoRetry(env, () => ZiweiDeepReport.find(buildAbandonedZiweiDeepFilter(now)).sort({ updatedAt: 1 }).limit(MAX_PER_TICK).lean());
  const outcomes = [];
  for (const candidate of candidates) {
    if (Date.now() + BATCH_BUDGET_MS > deadline) break;
    const userId = String(candidate.userId || ''), requestId = String(candidate.idempotencyKey || '');
    if (!userId || !requestId) continue;
    const chapters = reusableDeepChapters(candidate);
    const exhausted = ZIWEI_DEEP_CHAPTERS.some(definition => !isDeepChapterComplete(chapters.find(ch => ch.id === definition.id), definition) && Number(candidate.llmMeta?.attempts?.[definition.id] || 0) >= CHAPTER_MAX_ATTEMPTS);
    if (exhausted) {
      await withMongoRetry(env, () => ZiweiDeepReport.updateOne({ id: candidate.id, userId, ...buildAbandonedZiweiDeepFilter(now) },
        { $set: { 'llmMeta.recovery.reviewRequired': true } }), { retries: 0 });
      outcomes.push({ requestId, outcome: 'budget_exhausted' }); continue;
    }
    try {
      const response = await runBatch(new Request('https://internal.invalid/api/ziwei-deep-report/generate'), env,
        { resumeReportId: candidate.id }, { userId }, { requireExisting: true });
      const result = await response.json();
      outcomes.push({ requestId, outcome: result.status || result.reason || 'delivery_pending', completed: result.done === true && result.saved === true });
    } catch (error) {
      await withMongoRetry(env, () => ZiweiDeepReport.updateOne({ id: candidate.id, userId, status: { $in: ['partial', 'generating', 'delivery_pending'] } },
        { $set: { 'llmMeta.recovery.nextAttemptAt': new Date(now + 600000) } }), { retries: 0 });
      outcomes.push({ requestId, outcome: String(error?.code || 'RECOVERY_PENDING').slice(0, 120) });
    }
  }
  console.log('[ziwei-deep-report-recovery]', JSON.stringify({ bootstrapped, scanned: candidates.length, outcomes }));
  return { ok: true, bootstrapped, scanned: candidates.length, outcomes };
}
