// Per-use access for fortune-chat (Yeoni/Neo) consultations on the shared consultation pipeline.
// Activation accepts exactly what the existing fortune-chat route accepts (verifyPerUsePayment), then pins the
// durable record it found to the request. Every later claim re-reads that record in the caller's transaction,
// so a refund that commits first stops generation the same way it does for the Yeongnyangi access methods.
import { Payment, PointHistory, User } from '../lib/models.js';
import { createHttpError } from '../lib/http.js';
import { withMongoRetry } from '../lib/db.js';
import { verifyPerUsePayment } from '../lib/nakshatra-paid-access.js';
import { findMoonstoneSpendEvidence, moonstoneSpendRefundFilter } from '../lib/moonstone-spend-proof.js';
import { calculatePaidFeatureMembershipCreditCost } from '../lib/paid-feature-registry.js';
import { findGuardianFortuneFreeTrial } from '../lib/guardian-fortune-usage.js';
import { chatPaymentRequestId } from './access-methods.js';
export { PER_USE_SOURCES } from './access-methods.js';

const paidStatuses = ['paid','success','fulfilled'];
// What the buyer chose on the consultation screen. Only `pass` lets the server spend pass quota
// (payment-gating: pass coverage only on an explicit pass command); `checkout` follows a payment window.
export const CHAT_ACCESS_CHOICES = Object.freeze(['free_trial','pass','checkout']);
const readOptions = { retries: 1, retryOnOperationTimeout: true, retryAdmissionOnOverload: true };

const failure = (status, code, payload = {}) => {
  const error = createHttpError(status, code, { code, ...payload });
  error.code = code;
  return error;
};

const requestKeys = (rid, fields) => ({ $or: fields.map(field => ({ [field]: rid })) });
const pointFilter = (row, owner, rid) => ({
  _id: String(row.perUseEvidenceId || ''), userId: owner, featureKey: row.featureKey, kind: 'deduct',
  ...moonstoneSpendRefundFilter(), 'metadata.coinRefundedForUnlockFailure': { $ne: true },
  ...requestKeys(rid, ['metadata.requestId','metadata.idempotencyKey','metadata.purchaseId','metadata.orderId']),
});
const minimumStones = row => calculatePaidFeatureMembershipCreditCost(row.featureKey, Math.floor(Number(row.amountKRW) / 100));

/**
 * The stored per-use record, still active. Null means it is gone or revoked (the caller answers 409).
 * Database errors throw, so the caller never reports an outage as a missing payment.
 */
export async function findPerUseEvidence(row, owner, session = null, commitMarker = '') {
  const id = String(row._id), rid = chatPaymentRequestId(id), source = row.perUseSource;
  const mark = commitMarker ? { $set: { 'metadata.yeongnyangiCommit': commitMarker } } : null;
  const read = (model, filter, writable = true) => {
    const query = mark && writable ? model.findOneAndUpdate(filter, mark, { new: true }) : model.findOne(filter);
    if (session) query.session(session);
    return query.lean();
  };
  if (source === 'payment') {
    return read(Payment, { _id: String(row.perUseEvidenceId || ''), userId: owner, featureKey: row.featureKey,
      status: { $in: paidStatuses }, refundLock: null, 'metadata.unlockRevoked': { $ne: true },
      ...requestKeys(rid, ['requestId','idempotencyKey','merchantUid','impUid']) });
  }
  if (source === 'point') return read(PointHistory, pointFilter(row, owner, rid));
  if (source === 'ledger') {
    return findMoonstoneSpendEvidence(null, { userId: String(owner), featureKeys: [row.featureKey],
      tokens: [row.perUseEvidenceId, rid], session, minimumAmount: minimumStones(row),
      ...(commitMarker ? { claimRequestId: id, commitMarker } : {}) });
  }
  if (source === 'admin') return read(User, { _id: owner, role: { $regex: /^admin$/i } }, false);
  return null;
}

// A card payment window for this consultation that has not failed yet can still approve; spending a pass or
// the free use meanwhile would charge twice. Same rule as the Yeongnyangi funding claim (payment-funding.js).
async function assertNoOpenCheckout(env, owner, rid, featureKey) {
  const open = await withMongoRetry(env, () => Payment.findOne({ userId: owner, requestId: rid, paymentType: 'digital_content',
    $nor: [{ status: 'failed', failureStage: 'pg-retry-check', failureCode: { $in: ['PG_PAYMENT_FAILED','PG_PAYMENT_CANCELLED'] } }] }).select('_id').lean(), readOptions);
  if (open) throw failure(409, 'PG_PAYMENT_NOT_PAID', { paidFeatureKey: featureKey, paymentRequestId: rid });
}

/**
 * Proves access for a fortune-chat consultation and returns what to store on it.
 * An existing payment, coin, moonlight-stone or pass use under `fc-<id>` wins, then a free use this request
 * already spent. Otherwise only the buyer's choice spends anything: `free_trial` asks the caller to spend the
 * account's free use (`consumeTrial`), `pass` consumes pass quota once (idempotent per request id).
 * Outages answer 503, never 402.
 */
export async function proveChatAccess(env, { row, userId, owner, coinPrice, choice = '' }) {
  const rid = chatPaymentRequestId(String(row._id)), featureKey = row.featureKey;
  const input = { userId, featureKey, coinPrice, requestId: rid };
  const required = () => failure(402, 'PAYMENT_REQUIRED', { paidFeatureKey: featureKey, paymentRequestId: rid });
  let proof = await verifyPerUsePayment(env, { ...input, requireExisting: true });
  if (proof?.proven === null) throw failure(503, 'PAYMENT_EVIDENCE_PENDING');
  if (proof?.proven !== true) {
    if (await withMongoRetry(env, () => findGuardianFortuneFreeTrial({ userId: owner, requestId: rid }), readOptions)) {
      return { accessMethod: 'ACCOUNT_FREE_TRIAL', consumeTrial: false };
    }
    if (choice === 'checkout') throw failure(503, 'PAYMENT_EVIDENCE_PENDING');
    if (choice !== 'free_trial' && choice !== 'pass') throw required();
    await assertNoOpenCheckout(env, owner, rid, featureKey);
    if (choice === 'free_trial') return { accessMethod: 'ACCOUNT_FREE_TRIAL', consumeTrial: true };
    proof = await verifyPerUsePayment(env, input);
    if (proof?.proven === null) throw failure(503, 'PAYMENT_EVIDENCE_PENDING');
    if (proof?.proven !== true) throw required();
  }
  const passRefund = proof.passRefund ? { cycleKey: proof.passRefund.cycleKey, cost: proof.passRefund.cost } : undefined;
  let stored;
  if (proof.source === 'admin') stored = { perUseSource: 'admin', perUseEvidenceId: '' };
  else if (proof.source === 'payment') stored = { perUseSource: 'payment', perUseEvidenceId: proof.transactionId };
  else if (proof.source === 'pass') {
    const { passUsageEvidenceId } = await import('../payments/passes.js');
    stored = { perUseSource: 'point', perUseEvidenceId: String(passUsageEvidenceId(userId, featureKey, rid)) };
  }
  else if (proof.transactionId) stored = { perUseSource: 'point', perUseEvidenceId: proof.transactionId };
  else {
    const ledger = await withMongoRetry(env, () => findMoonstoneSpendEvidence(env, { userId, featureKeys: [featureKey], tokens: [rid], minimumAmount: minimumStones(row) }), readOptions);
    stored = { perUseSource: 'ledger', perUseEvidenceId: ledger?.ledgerId || '' };
  }
  // The proof exists but its durable record is not readable yet (unsettled stone, receipt write pending).
  // Storing it unpinned would fail every later claim, so the buyer retries activation instead.
  const evidence = stored.perUseSource === 'admin' || stored.perUseEvidenceId
    ? await withMongoRetry(env, () => findPerUseEvidence({ ...row, ...stored }, owner), readOptions) : null;
  if (!evidence) throw failure(503, 'PAYMENT_EVIDENCE_PENDING');
  return { accessMethod: 'PER_USE', ...stored, ...(passRefund ? { perUsePassRefund: passRefund } : {}) };
}
