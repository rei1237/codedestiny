import { connectDb, withMongoRetry } from './db.js';
import { ServiceExecutionTransaction } from './models.js';
import { resumePaidNarrativeOnServer } from './paid-narrative-delivery.js';
import { promotePaidIntents } from './paid-narrative-intent.js';
import {
  loadPaidNarrativeAdapter,
  PAID_NARRATIVE_SERVER_RESUME_FEATURE_KEYS,
  PAID_NARRATIVE_SERVER_RESUME_REPORT_TYPES,
} from './paid-narrative-adapters.js';

const IDLE_MS = 300000, MAX_AGE_MS = 86400000, TASK_BUDGET_MS = 240000, WAVE_BUDGET_MS = 65000, MAX_PER_TICK = 3;
const MAX_ERRORS = 5, BACKOFF_MS = 600000, MAX_BACKOFF_MS = 3600000;

// Engine saves move timeoutAt ten minutes ahead, so timeoutAt <= now + 5 min is
// five idle minutes. Top-level retryCount and nextRetryAt belong to the timeout
// settlement sweep, whose exhaustion refunds or fails the execution; recovery
// keeps its own backoff in metadata.paidNarrativeRecovery, which the engine
// clears whenever a save makes progress.
export function buildRecoverableNarrativeFilter(now) {
  const at = new Date(now);
  return {
    status: 'pending', timeoutAt: { $lte: new Date(now + IDLE_MS) }, createdAt: { $gte: new Date(now - MAX_AGE_MS) },
    featureKey: { $in: [...PAID_NARRATIVE_SERVER_RESUME_FEATURE_KEYS] },
    reportType: { $in: [...PAID_NARRATIVE_SERVER_RESUME_REPORT_TYPES] },
    'metadata.paidNarrative': { $exists: true }, 'metadata.paidNarrative.exhaustionClaimed': { $ne: true },
    'metadata.paidNarrativeRecovery.reviewRequired': { $ne: true },
    $and: [
      { $or: [{ 'lock.until': null }, { 'lock.until': { $lte: at } }] },
      { $or: [{ 'metadata.paidNarrativeRecovery.nextAttemptAt': null }, { 'metadata.paidNarrativeRecovery.nextAttemptAt': { $lte: at } }] },
    ],
  };
}

// Only an unlocked pending record is marked, so a browser that claimed the
// lease in between keeps its own progress.
async function mark(env, doc, recovery) {
  try {
    await withMongoRetry(env, () => ServiceExecutionTransaction.updateOne(
      { _id: doc._id, status: 'pending', $or: [{ 'lock.until': null }, { 'lock.until': { $lte: new Date() } }] },
      { $set: { 'metadata.paidNarrativeRecovery': recovery } }), { retries: 0 });
  } catch { /* the next tick retries from the same stored state */ }
}

async function recoverOne(env, doc, now, deadline) {
  const adapter = await loadPaidNarrativeAdapter(env, doc.featureKey, doc.reportType, String(doc.userId));
  if (!adapter) {
    await mark(env, doc, { code: 'ADAPTER_UNAVAILABLE', nextAttemptAt: new Date(now + MAX_BACKOFF_MS) });
    return 'unmapped';
  }
  let saved = Object.keys(doc.metadata?.paidNarrative?.parts || {}).length, progressed = false;
  try {
    while (Date.now() + WAVE_BUDGET_MS <= deadline) {
      const response = await resumePaidNarrativeOnServer(env, doc, adapter);
      const result = await response.json().catch(() => ({}));
      if (response.status === 200) return 'completed';
      if (response.status >= 500 || response.status === 429) {
        const error = new Error('Transient recovery failure');
        error.code = String(result.reason || result.code || 'RECOVERY_PENDING');
        throw error;
      }
      if (response.status !== 202) {
        const code = String(result.reason || result.code || response.status).slice(0, 120);
        await mark(env, doc, { reviewRequired: true, code });
        return code;
      }
      if (result.busy) return 'busy';
      if (result.reviewRequired) {
        await mark(env, doc, { reviewRequired: true, code: 'DELIVERY_REVIEW_REQUIRED' });
        return 'review_required';
      }
      // A wave without a new part stops here; its attempts are already spent and
      // the next tick retries after the pushed timeoutAt goes idle again.
      const parts = Array.isArray(result.completedParts) ? result.completedParts.length : 0;
      if (parts <= saved) return 'pending';
      saved = parts; progressed = true;
    }
    return 'budget';
  } catch (error) {
    const code = String(error?.code || 'RECOVERY_PENDING').slice(0, 120);
    const errors = (progressed ? 0 : Number(doc.metadata?.paidNarrativeRecovery?.errors) || 0) + 1;
    await mark(env, doc, { errors: Math.min(errors, MAX_ERRORS), code, nextAttemptAt: new Date(now + Math.min(MAX_BACKOFF_MS, BACKOFF_MS * 2 ** Math.min(errors, MAX_ERRORS))) });
    return code;
  }
}

// Existing ten-minute tick. Each wave spends the same per-part attempt budget a
// browser resume would; the task adds no new provider budget.
export async function runPaidNarrativeRecovery(env, options = {}) {
  const now = options.now || Date.now(), deadline = now + TASK_BUDGET_MS;
  await (options.connectDb || connectDb)(env);
  // Stage 1B: proven pre-checkout intents become pending records first. A failure
  // here leaves them for the next tick and does not block recovery.
  let intents;
  try { intents = await promotePaidIntents(env, { now, deadline: now + 30000 }); }
  catch (error) { intents = { error: String(error?.code || error?.name || 'INTENT_PROMOTION_FAILED').slice(0, 120) }; }
  const candidates = await withMongoRetry(env, () => ServiceExecutionTransaction.find(buildRecoverableNarrativeFilter(now))
    .sort({ timeoutAt: 1 }).limit(MAX_PER_TICK)
    .select('userId executionKey featureKey reportType metadata.paidNarrative.parts metadata.paidNarrativeRecovery').lean());
  const outcomes = [];
  for (const doc of candidates) {
    if (Date.now() + WAVE_BUDGET_MS > deadline) break;
    outcomes.push({ executionKey: doc.executionKey, featureKey: doc.featureKey, outcome: await recoverOne(env, doc, now, deadline) });
  }
  console.log('[paid-narrative-recovery]', JSON.stringify({ scanned: candidates.length, outcomes }));
  return { ok: true, scanned: candidates.length, outcomes, intents };
}
