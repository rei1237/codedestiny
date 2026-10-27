import { MonthlyCreditLedger } from './models.js';
import { findMoonstoneSpendEvidence, moonstoneSpendRefundFilter } from './moonstone-spend-proof.js';
import { restoreMonthlyCreditLot as restoreCredit } from './monthly-credit-store.js';
import { createPaymentContext, toObjectId, withPaymentDb } from '../payments/db.js';

// The credit, its receipt and the original spend marker must commit together.
export async function restoreSukuyoMonthlyRefund(env, { userId, evidenceId, failureMessage }, deps = {}) {
  const owner = toObjectId(userId), ledgerId = toObjectId(evidenceId);
  if (!owner || !ledgerId) return false;
  const sourceId = `sukuyo-refund:${ledgerId}`;
  const run = deps.withDb || withPaymentDb;
  const proofLookup = deps.proofLookup || findMoonstoneSpendEvidence;
  const restoreMonthlyCreditLot = deps.restore || restoreCredit;
  const ctx = createPaymentContext({ requestId: sourceId, route: 'sukuyo-monthly-refund' });
  return run(env, ctx, db => db.transaction(async tx => {
    const receiptFilter = { userId: owner, type: 'MONTHLY_CREDIT_GRANT', sourceId };
    const receipt = await tx.findOne(MonthlyCreditLedger, receiptFilter);
    if (receipt) return true;
    const proof = await proofLookup(null, { db: tx, userId: owner,
      featureKeys: ['sukuyo-compatibility-ai'], tokens: [String(ledgerId)] });
    if (!proof || proof.ledgerId !== String(ledgerId) || !Number.isSafeInteger(proof.amount) || proof.amount <= 0) return false;
    const restored = await restoreMonthlyCreditLot({ db: tx, userId: owner, lotId: sourceId, amount: proof.amount,
      pullRequestId: proof.sourceId, returnDetails: true });
    if (!restored?.added) throw new Error('SUKUYO_MONTHLY_REFUND_PENDING');
    const now = new Date();
    await tx.insertOne(MonthlyCreditLedger, { ...receiptFilter, amount: proof.amount,
      beforeBalance: restored.beforeBalance, afterBalance: restored.afterBalance,
      serviceKey: 'sukuyo-compatibility-ai', reason: '숙요 상담 결과 미생성 월정석 복원',
      metadata: { originalLedgerId: String(ledgerId) }, createdAt: now, updatedAt: now, settledAt: now });
    const marked = await tx.updateOne(MonthlyCreditLedger, { _id: ledgerId, userId: owner,
      type: 'MONTHLY_CREDIT_SPEND', ...moonstoneSpendRefundFilter() }, { $set: {
      'metadata.refundedForServiceExecution': true, "metadata.refundedForUnlockFailure": true,
      'metadata.serviceExecutionRefundedAt': now, 'metadata.serviceExecutionFailureMessage': failureMessage,
    } });
    if (marked.modifiedCount !== 1) throw new Error('SUKUYO_MONTHLY_REFUND_CONFLICT');
    return true;
  }));
}
