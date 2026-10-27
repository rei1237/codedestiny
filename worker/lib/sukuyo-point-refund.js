import { PointHistory, User } from './models.js';
import { createPaymentContext, toObjectId, withPaymentDb } from '../payments/db.js';

// Legacy prepaid deductions are restored with their refund receipt and marker.
export async function restoreSukuyoPointRefund(env, { userId, evidenceId, failureMessage }, deps = {}) {
  const owner = toObjectId(userId), historyId = toObjectId(evidenceId);
  if (!owner || !historyId) return false;
  const sourceId = `sukuyo-refund:${historyId}`;
  const run = deps.withDb || withPaymentDb;
  const ctx = createPaymentContext({ requestId: sourceId, route: 'sukuyo-point-refund' });
  return run(env, ctx, db => db.transaction(async tx => {
    const filter = { _id: historyId, userId: owner, kind: 'deduct', featureKey: 'sukuyo-compatibility-ai' };
    const original = await tx.findOne(PointHistory, filter);
    if (!original) return false;
    const receiptFilter = { userId: owner, kind: 'refund', featureKey: 'sukuyo-compatibility-ai',
      'metadata.originalPointHistoryId': String(historyId) };
    const receipt = await tx.findOne(PointHistory, receiptFilter);
    if (original.metadata?.refundedForServiceExecution) return Boolean(receipt);
    if (receipt) return false;
    const delta = Number(original.delta);
    if (!Number.isSafeInteger(delta) || delta >= 0) return false;
    const now = new Date();
    const updated = await tx.findOneAndUpdate(User, { _id: owner }, { $inc: { points: -delta } },
      { returnDocument: 'after', projection: { points: 1 } });
    const user = updated && 'value' in updated && !('_id' in updated) ? updated.value : updated;
    if (!user || !Number.isFinite(user.points)) throw new Error('SUKUYO_POINT_USER_UNAVAILABLE');
    await tx.insertOne(PointHistory, { userId: owner, kind: 'refund', delta: -delta, balanceAfter: user.points,
      reason: '숙요 상담 결과 미생성 잔액 복원', featureKey: 'sukuyo-compatibility-ai',
      metadata: { refundedForServiceExecution: true, originalPointHistoryId: String(historyId), failureMessage },
      createdAt: now, updatedAt: now });
    const marked = await tx.updateOne(PointHistory, { ...filter, 'metadata.refundedForServiceExecution': { $ne: true } },
      { $set: { 'metadata.refundedForServiceExecution': true, 'metadata.serviceExecutionRefundedAt': now,
        'metadata.serviceExecutionFailureMessage': failureMessage } });
    if (marked.modifiedCount !== 1) throw new Error('SUKUYO_POINT_REFUND_CONFLICT');
    return true;
  }));
}
