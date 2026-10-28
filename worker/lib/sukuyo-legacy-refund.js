import { PointHistory, User } from './models.js';
import { createPaymentContext, toObjectId, withPaymentDb } from '../payments/db.js';

// Commit the original deduction marker, balance and receipt together.
export async function restoreSukuyoLegacyRefund(env, { userId, evidenceId, failureMessage }, deps = {}) {
  const owner = toObjectId(userId);
  const id = toObjectId(evidenceId);
  if (!owner || !id) return false;
  const context = createPaymentContext({ requestId: `sukuyo-legacy-refund:${id}`, route: 'sukuyo-legacy-refund' });
  return (deps.withDb || withPaymentDb)(env, context, db => db.transaction(async tx => {
    const receipt = await tx.findOne(PointHistory, { userId: owner, kind: 'refund',
      featureKey: 'sukuyo-compatibility-ai', 'metadata.originalPointHistoryId': String(id),
      'metadata.refundedForServiceExecution': true });
    if (receipt) return true;
    const filter = { _id: id, userId: owner, kind: 'deduct', featureKey: 'sukuyo-compatibility-ai',
      'metadata.refundedForServiceExecution': { $ne: true } };
    const history = await tx.findOne(PointHistory, filter);
    if (!history) return false;
    const amount = Number(history.delta);
    if (!Number.isSafeInteger(amount) || amount >= 0) return false;
    const now = new Date();
    const marked = await tx.updateOne(PointHistory, filter, { $set: {
      'metadata.refundedForServiceExecution': true,
      'metadata.serviceExecutionRefundedAt': now,
      'metadata.serviceExecutionFailureMessage': failureMessage,
    } });
    if (marked.modifiedCount !== 1) throw new Error('SUKUYO_LEGACY_REFUND_CONFLICT');
    const result = await tx.findOneAndUpdate(User, { _id: owner }, { $inc: { points: -amount } }, { returnDocument: 'after' });
    const user = result?.value ?? result;
    if (!user || !Number.isFinite(Number(user.points))) throw new Error('SUKUYO_LEGACY_REFUND_USER_MISSING');
    await tx.insertOne(PointHistory, { userId: owner, kind: 'refund', delta: -amount,
      balanceAfter: Number(user.points), reason: '숙요 궁합 상담 생성 실패 환급', featureKey: 'sukuyo-compatibility-ai',
      metadata: { refundedForServiceExecution: true, originalPointHistoryId: String(id), failureMessage },
      createdAt: now, updatedAt: now });
    return true;
  }));
}
