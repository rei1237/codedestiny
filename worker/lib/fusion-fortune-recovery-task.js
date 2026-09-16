import { connectDb, withMongoRetry } from './db.js';
import { FusionFortuneConsultation, Payment } from './models.js';
import { fusionGroupsForStage } from './fusion-fortune-prompt.js';
import { FUSION_GROUP_MAX_ATTEMPTS } from './fusion-fortune-consultation.js';
import { hasFusionStageOneResult, isFusionFortuneApiEnabled, FUSION_GENERATION_DEADLINE_MS, FUSION_FORTUNE_PAID_FEATURE_KEY, validateFusionFortuneGroup, fusionValidationOptions } from './fusion-fortune.js';
import { readOrderResumeContext, RESUME_APPROVED_TTL_MS } from '../payments/resume-context.js';
import { runFusionFortuneDeliveryStage } from '../routes/fusion-fortune.js';

const ABANDONED_AFTER_MS = 5 * 60 * 1000;
const TASK_BUDGET_MS = 4 * 60 * 1000;
const MAX_PER_TICK = 3;
const PAID = ['paid', 'success', 'fulfilled'];

/** Approval can survive a document that never sends /generate. Reuse its encrypted input. */
async function bootstrapApprovedFusionOrders(env, now, deadline, runStage) {
  const orders = await withMongoRetry(env, () => Payment.find({
    paymentType: 'digital_content', purchaseType: { $ne: 'GIFT' }, featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY,
    status: { $in: PAID }, 'metadata.unlockRevoked': { $ne: true },
    createdAt: { $gt: new Date(now - RESUME_APPROVED_TTL_MS), $lt: new Date(now - ABANDONED_AFTER_MS) },
    'metadata.fusionRecovery.status': { $nin: ['started', 'input_required'] },
    $or: [{ 'metadata.fusionRecovery.nextAttemptAt': { $exists: false } }, { 'metadata.fusionRecovery.nextAttemptAt': { $lte: new Date(now) } }],
  }).sort({ createdAt: 1 }).limit(MAX_PER_TICK).lean());
  const outcomes = [];
  for (const order of orders) {
    if (Date.now() + FUSION_GENERATION_DEADLINE_MS > deadline) break;
    const userId = String(order.userId || ''), requestId = String(order.requestId || ''), orderId = String(order.merchantUid || '');
    if (!userId || !requestId || !orderId) continue;
    const filter = { merchantUid: orderId, userId: order.userId, status: { $in: PAID }, 'metadata.unlockRevoked': { $ne: true } };
    try {
      let prior = await withMongoRetry(env, () => FusionFortuneConsultation.findOne({ userId, idempotencyKey: requestId }).lean());
      if (!prior?.generationSnapshot?.context && prior?.status !== 'completed') {
        const context = await readOrderResumeContext(order, env, now);
        if (!context?.resume?.args?.body) {
          await withMongoRetry(env, () => Payment.updateOne(filter, { $set: { 'metadata.fusionRecovery': { status: 'input_required', at: new Date(now) } } }), { retries: 0 });
          outcomes.push({ requestId, outcome: 'input_required' });
          continue; // Keep legacy purchase rights; do not invent missing birth input.
        }
        if (context.resume.kind !== FUSION_FORTUNE_PAID_FEATURE_KEY || context.resume.args.requestId !== requestId) throw new Error('PURCHASE_RUN_MISMATCH');
        const body = JSON.parse(context.resume.args.body);
        const result = await runStage(env, { userId, requestId, body, stage: 1, prior, requireExisting: true });
        prior = await withMongoRetry(env, () => FusionFortuneConsultation.findOne({ userId, idempotencyKey: requestId }).lean());
        if (!prior?.generationSnapshot?.context) throw new Error(result.reason || result.error || 'START_PENDING');
      }
      await withMongoRetry(env, () => Payment.updateOne(filter, { $set: { 'metadata.fusionRecovery': { status: 'started', at: new Date(now) } } }), { retries: 0 });
      outcomes.push({ requestId, outcome: 'started' });
    } catch (error) {
      await withMongoRetry(env, () => Payment.updateOne(filter, { $set: { 'metadata.fusionRecovery': {
        status: 'recovery_pending', code: String(error?.code || 'RECOVERY_PENDING').slice(0, 120), nextAttemptAt: new Date(now + 600000),
      } } }), { retries: 0 });
      outcomes.push({ requestId, outcome: 'recovery_pending' });
    }
  }
  return outcomes;
}

export function buildAbandonedFusionFilter(now) {
  return {
    status: { $in: ['partial', 'generating', 'delivery_pending'] },
    updatedAt: { $lt: new Date(now - ABANDONED_AFTER_MS) },
    'generationSnapshot.context': { $exists: true },
    'generationSnapshot.recovery.reviewRequired': { $ne: true },
    $or: [{ generationLease: null }, { 'generationLease.expiresAt': { $lte: new Date(now) } }],
  };
}

/** Existing ten-minute tick; no new cron, purchase, debit or independent retry budget. */
export async function runFusionFortuneRecovery(env, options = {}) {
  if (!isFusionFortuneApiEnabled(env)) return { ok: true, skipped: 'disabled' };
  const now = options.now || Date.now(), deadline = now + TASK_BUDGET_MS;
  await (options.connectDb || connectDb)(env);
  const runStage = options.runStage || runFusionFortuneDeliveryStage;
  const bootstrapped = await bootstrapApprovedFusionOrders(env, now, deadline, runStage);
  const candidates = await withMongoRetry(env, () => FusionFortuneConsultation.find(buildAbandonedFusionFilter(now)).sort({ updatedAt: 1 }).limit(MAX_PER_TICK).lean());
  const outcomes = [];
  for (const candidate of candidates) {
    if (Date.now() + FUSION_GENERATION_DEADLINE_MS > deadline) break;
    const requestId = String(candidate.idempotencyKey || ''), userId = String(candidate.userId || '');
    if (!requestId || !userId || !candidate.generationSnapshot?.input) continue;
    const stage = candidate.nextStage === 1 || !hasFusionStageOneResult(candidate.result) ? 1 : 2;
    const groups = fusionGroupsForStage(stage).filter(group => !validateFusionFortuneGroup(candidate.result, group, fusionValidationOptions(candidate.generationSnapshot.context, candidate.generationSnapshot.input)).ok);
    // Provider reservations belong to the saved purchase and include browser attempts.
    if (groups.length && groups.every(group => Number(candidate.generationSnapshot.attempts?.[group.id] || 0) >= FUSION_GROUP_MAX_ATTEMPTS)) {
      await withMongoRetry(env, () => FusionFortuneConsultation.updateOne({ userId, idempotencyKey: requestId, ...buildAbandonedFusionFilter(now) },
        { $set: { 'generationSnapshot.recovery.reviewRequired': true } }), { retries: 0 });
      outcomes.push({ requestId, outcome: 'budget_exhausted', stage });
      continue;
    }
    try {
      const result = await runStage(env, {
        userId, requestId, body: candidate.generationSnapshot.input, stage, prior: candidate, requireExisting: true,
      });
      outcomes.push({ requestId, stage, outcome: result.ok ? result.stageStatus : result.reason || result.error, completed: result.stageStatus === 'completed' });
    } catch (error) {
      outcomes.push({ requestId, stage, outcome: error?.code || 'recovery_failed' });
    }
  }
  console.log('[fusion-fortune-recovery]', JSON.stringify({ bootstrapped, scanned: candidates.length, outcomes }));
  return { ok: true, bootstrapped, scanned: candidates.length, outcomes };
}
