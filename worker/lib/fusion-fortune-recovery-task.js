import { connectDb, withMongoRetry } from './db.js';
import { FusionFortuneConsultation, Payment } from './models.js';
import { fusionGroupsForStage } from './fusion-fortune-prompt.js';
import { hasFusionStageOneResult, isFusionFortuneApiEnabled, FUSION_GENERATION_DEADLINE_MS, FUSION_FORTUNE_PAID_FEATURE_KEY, validateFusionFortuneGroup, fusionValidationOptions, fusionGroupAttemptLimit, fusionGroupWaitsForPlan } from './fusion-fortune.js';
import { readOrderResumeContext, RESUME_APPROVED_TTL_MS } from '../payments/resume-context.js';
import { runFusionFortuneDeliveryStage } from '../routes/fusion-fortune.js';

const ABANDONED_AFTER_MS = 5 * 60 * 1000;
const TASK_BUDGET_MS = 4 * 60 * 1000;
const MAX_PER_TICK = 3;
const PAID = ['paid', 'success', 'fulfilled'];
const OPEN_STATUSES = ['partial', 'generating', 'delivery_pending'];
const UNDELIVERED_REFUND_MS = 24 * 60 * 60 * 1000;
// Bootstrap stops reading the approved input after this; the refund pass starts where it ends.
const INPUT_WAIT_MS = RESUME_APPROVED_TTL_MS;
// 자동 환불은 이 시각 이후 카드 결제분에만 적용한다. 그 전 주문은 운영자가 판단한다.
// 배포(2026-10-30 저녁 KST)보다 늦게 잡아, 옛 코드로 결제된 주문이 섞이지 않게 한다.
export const FUSION_AUTO_REFUND_SINCE = new Date('2026-10-30T10:00:00.000Z');

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
      if (prior?.status === 'generation_failed') continue; // The refund path owns it now.
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

/**
 * Undelivered card orders become refund-eligible: budget exhausted (reviewRequired), 24h without
 * completion, or 7 days still waiting for input. The CAS needs an expired lease and an unchanged
 * document, and every save path skips generation_failed, so delivery and refund cannot both win.
 * runPendingConsultationRefunds settles them on the same ten-minute schedule.
 */
export async function markUndeliveredFusionRefunds(env, now) {
  const docs = await withMongoRetry(env, () => FusionFortuneConsultation.find({
    status: { $in: OPEN_STATUSES }, createdAt: { $gte: FUSION_AUTO_REFUND_SINCE }, 'llmMeta.refundEligibleAt': { $exists: false },
    // Without the manual grant the buyer can still resume once; the day rule covers an order nobody resumes.
    'llmMeta.refundSkipped': { $exists: false }, $or: [{ 'generationSnapshot.recovery.reviewRequired': true, 'generationSnapshot.recovery.manualGranted': true },
      { 'generationSnapshot.context': { $exists: true }, createdAt: { $lte: new Date(now - UNDELIVERED_REFUND_MS) } },
      { createdAt: { $lte: new Date(now - INPUT_WAIT_MS) } }],
  }).sort({ createdAt: 1 }).limit(MAX_PER_TICK).lean());
  const outcomes = [];
  for (const doc of docs) {
    const requestId = String(doc.idempotencyKey || ''), userId = String(doc.userId || '');
    if (new Date(doc.generationLease?.expiresAt || 0).getTime() > now) continue;
    const orders = await withMongoRetry(env, () => Payment.find({
      paymentType: 'digital_content', purchaseType: { $ne: 'GIFT' }, featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY, requestId,
      status: { $in: PAID }, 'metadata.unlockRevoked': { $ne: true }, createdAt: { $gte: FUSION_AUTO_REFUND_SINCE },
    }).sort({ createdAt: 1 }).limit(2).lean());
    const meta = doc.llmMeta && typeof doc.llmMeta === 'object' ? doc.llmMeta : {};
    // Coin, pass, gift, native and pre-release orders keep the existing review path. Recording the
    // verdict keeps them from holding the oldest slots ahead of card orders on every later tick.
    if (orders.length !== 1 || String(orders[0].userId) !== userId) {
      await withMongoRetry(env, () => FusionFortuneConsultation.updateOne({ userId: doc.userId, idempotencyKey: doc.idempotencyKey, status: doc.status, updatedAt: doc.updatedAt },
        { $set: { llmMeta: { ...meta, refundSkipped: 'not_card_order' } } }, { timestamps: false }), { retries: 0 });
      outcomes.push({ requestId, outcome: 'refund_not_card_order' });
      continue;
    }
    const recovery = doc.generationSnapshot?.recovery;
    const reason = recovery?.reviewRequired === true && recovery.manualGranted === true ? 'BUDGET_EXHAUSTED'
      : doc.generationSnapshot?.context ? 'UNDELIVERED_24H' : 'INPUT_MISSING_7D';
    const llmMeta = { ...meta, refundEligibleAt: new Date(now), refundReason: reason };
    const marked = await withMongoRetry(env, () => FusionFortuneConsultation.updateOne({
      userId: doc.userId, idempotencyKey: doc.idempotencyKey, status: doc.status, updatedAt: doc.updatedAt,
      $or: [{ generationLease: null }, { 'generationLease.expiresAt': { $lte: new Date(now) } }],
    }, { $set: { status: 'generation_failed', llmMeta } }), { retries: 0 });
    outcomes.push({ requestId, outcome: marked?.matchedCount ? 'refund_eligible' : 'refund_mark_conflict', reason });
  }
  // Input that never arrived leaves no document. Open a failed one so the refund path can own the order.
  const waiting = await withMongoRetry(env, () => Payment.find({
    paymentType: 'digital_content', purchaseType: { $ne: 'GIFT' }, featureKey: FUSION_FORTUNE_PAID_FEATURE_KEY,
    status: { $in: PAID }, 'metadata.unlockRevoked': { $ne: true }, 'metadata.fusionRecovery.status': 'input_required',
    createdAt: { $gte: FUSION_AUTO_REFUND_SINCE, $lte: new Date(now - INPUT_WAIT_MS) },
  }).sort({ createdAt: 1 }).limit(MAX_PER_TICK).lean());
  for (const order of waiting) {
    const requestId = String(order.requestId || ''), userId = String(order.userId || '');
    if (!requestId || !userId) continue;
    try {
      const opened = await withMongoRetry(env, () => FusionFortuneConsultation.updateOne({ userId, idempotencyKey: requestId }, { $setOnInsert: {
        id: globalThis.crypto.randomUUID(), userId, idempotencyKey: requestId, result: {}, status: 'generation_failed', stage: 1, nextStage: null,
        llmMeta: { refundEligibleAt: new Date(now), refundReason: 'INPUT_MISSING_7D' },
      } }, { upsert: true }), { retries: 0 });
      // An existing document is judged by the pass above; either way this order leaves the input queue.
      await withMongoRetry(env, () => Payment.updateOne({ merchantUid: order.merchantUid, userId: order.userId, 'metadata.fusionRecovery.status': 'input_required' },
        { $set: { 'metadata.fusionRecovery': { status: 'refund_handoff', at: new Date(now) } } }), { retries: 0 });
      outcomes.push({ requestId, outcome: opened?.upsertedCount ? 'refund_eligible' : 'refund_document_exists', reason: 'INPUT_MISSING_7D' });
    } catch {
      outcomes.push({ requestId, outcome: 'refund_handoff_failed' }); // A racing first write retries next tick.
    }
  }
  return outcomes;
}

/** Existing ten-minute tick; no new cron, purchase, debit or independent retry budget. */
export async function runFusionFortuneRecovery(env, options = {}) {
  if (!isFusionFortuneApiEnabled(env)) return { ok: true, skipped: 'disabled' };
  const now = options.now || Date.now(), deadline = now + TASK_BUDGET_MS;
  await (options.connectDb || connectDb)(env);
  const runStage = options.runStage || runFusionFortuneDeliveryStage;
  const bootstrapped = await bootstrapApprovedFusionOrders(env, now, deadline, runStage);
  const nativeBootstrapped = await (await import('../toss/native-fusion.js')).bootstrapNativeFusionOrders(env, {now, deadline, runStage});
  // Refund marking must never stop delivery work in the same tick.
  const refundMarked = await markUndeliveredFusionRefunds(env, now)
    .catch(error => [{ outcome: 'refund_mark_failed', code: String(error?.code || error?.name || 'ERROR').slice(0, 80) }]);
  const candidates = await withMongoRetry(env, () => FusionFortuneConsultation.find(buildAbandonedFusionFilter(now)).sort({ updatedAt: 1 }).limit(MAX_PER_TICK).lean());
  const outcomes = [];
  // Continue saved progress within this tick, rotating between owners. Otherwise
  // every two chapters would wait another ten minutes after the browser closes.
  const queue = candidates.map(candidate => ({ candidate, waves: 0 }));
  for (let index = 0; index < queue.length; index++) {
    const { candidate, waves } = queue[index];
    if (Date.now() + FUSION_GENERATION_DEADLINE_MS > deadline) break;
    const requestId = String(candidate.idempotencyKey || ''), userId = String(candidate.userId || '');
    if (!requestId || !userId || !candidate.generationSnapshot?.input) continue;
    const stage = candidate.nextStage === 1 || !hasFusionStageOneResult(candidate.result) ? 1 : 2;
    const options = { ...fusionValidationOptions(candidate.generationSnapshot.context, candidate.generationSnapshot.input), ignoreLength: true };
    // v2 분야 장(optional)은 시도를 다 쓰면 배달을 막지 않는다 — 검토 대상으로 세지 않는다.
    const groups = fusionGroupsForStage(stage, candidate.generationSnapshot.context).filter(group => !validateFusionFortuneGroup(candidate.result, group, options).ok)
      .filter(group => !(group.optional && Number(candidate.generationSnapshot.attempts?.[group.id] || 0) >= fusionGroupAttemptLimit(candidate.generationSnapshot)));
    // Provider reservations belong to the saved purchase and include browser attempts.
    // Groups waiting for the premium plan cannot run; once saju is spent nothing can, so stop for review.
    const runnable = groups.filter(group => !fusionGroupWaitsForPlan(group, candidate.generationSnapshot.context, stage, candidate.result));
    if (groups.length && runnable.every(group => Number(candidate.generationSnapshot.attempts?.[group.id] || 0) >= fusionGroupAttemptLimit(candidate.generationSnapshot))) {
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
      if (result.ok && result.stageStatus === 'partial' && result.automaticRetryAllowed !== false && waves < 5
        && Date.now() + FUSION_GENERATION_DEADLINE_MS <= deadline) {
        const saved = await withMongoRetry(env, () => FusionFortuneConsultation.findOne({ userId, idempotencyKey: requestId }).lean());
        const progress = value => JSON.stringify([value?.status, value?.nextStage, value?.generationSnapshot?.attempts, value?.result]);
        if (saved && saved.status !== 'completed' && progress(saved) !== progress(candidate)) queue.push({ candidate: saved, waves: waves + 1 });
      }
    } catch (error) {
      outcomes.push({ requestId, stage, outcome: error?.code || 'recovery_failed' });
    }
  }
  console.log('[fusion-fortune-recovery]', JSON.stringify({ bootstrapped, refundMarked, scanned: candidates.length, outcomes }));
  return { ok: true, bootstrapped, nativeBootstrapped, refundMarked, scanned: candidates.length, outcomes };
}
