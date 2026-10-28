import { SukuyoCompatibilityAiConsultation } from './models.js';
import { assertDeductionRefundable } from './coin-refund-eligibility.js';

const protectedResult = () => [
  { status: { $in: ['completed', 'delivery_pending', 'partial', 'generating'] } },
  { status: { $exists: false } },
  { 'llmMeta.sections': { $exists: true, $ne: {} } },
  { 'messages.role': 'assistant' },
];

export async function findOtherSukuyoDelivery({ userId, evidenceIds, requestId }, deps = {}) {
  const ids = [...new Set((evidenceIds || []).filter(Boolean).map(String))];
  if (!userId || !requestId || !ids.length) return null;
  const query = { userId, paymentId: { $in: ids }, idempotencyKey: { $ne: requestId }, $or: protectedResult() };
  return deps.findLinked ? deps.findLinked(query) : SukuyoCompatibilityAiConsultation.findOne(query).select({ _id: 1 }).lean();
}

// Legacy consultations can predate common execution records. Their saved or
// active result still protects the original debit from automatic restoration.
export async function canRestoreSukuyoDebit(env, { userId, evidenceId, requestId }, deps = {}) {
  if (!userId || !evidenceId || !requestId) return false;
  const query = { userId, paymentId: String(evidenceId), $or: protectedResult() };
  try {
    const linked = deps.findLinked ? await deps.findLinked(query)
      : await SukuyoCompatibilityAiConsultation.findOne(query).select({ _id: 1 }).lean();
    if (linked) return false;
    const verify = deps.verify || assertDeductionRefundable;
    const result = await verify(env, { userId, failedRequestId: requestId,
      deduction: { _id: evidenceId, featureKey: 'sukuyo-compatibility-ai' } });
    return result?.ok === true;
  } catch { return false; }
}
