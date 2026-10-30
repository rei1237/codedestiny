// Terminal refunds for saved consultations. Reservation precedes PG calls; a
// missing/uncertain PG response never clears it or reopens the paid request.
import { NewYearAiConsultation, LifeBookAiConsultation, FusionFortuneConsultation, PaidExecutionRecord, Payment, PointHistory, MonthlyCreditLedger } from './models.js';
import { withPaymentDb, createPaymentContext, toObjectId } from '../payments/db.js';
import { claimRefund, settleRefund } from '../payments/orders.js';
import { revokePurchaseEntitlement } from '../payments/executions.js';
import { releaseOrderMoonstones } from '../payments/moonstone.js';
import { fetchPortOnePayment, cancelPortOnePayment } from './portone.js';
import { findMoonstoneSpendEvidence, moonstoneSpendRefundFilter } from './moonstone-spend-proof.js';
import { restoreMonthlyCreditLot } from './monthly-credit-store.js';
import { refundPassCoverage } from './pass-consumption.js';
import { consultationRefundState } from './consultation-refund-state.js';
export { consultationRefundState, consultationRefundResponse } from './consultation-refund-state.js';

const SERVICES = Object.freeze({
  'new-year-ai': { model: NewYearAiConsultation, feature: 'new-year-ai-consultation' },
  'life-book-ai': { model: LifeBookAiConsultation, feature: 'life-book-ai-consultation',
    features: ['life-book-ai-consultation', 'life-fortune-ai-consultation'] },
  'fusion-fortune': { model: FusionFortuneConsultation, feature: 'fusion-fortune-consultation' },
});
const PAID = ['paid', 'success', 'fulfilled'];
const LOCK_MS = 120000;
const clean = value => String(value || '').trim();
const pending = () => ({ ok: false, refundStatus: 'pending', retryable: true });
const error = code => Object.assign(new Error(code), { code });
const unwrap = value => value && 'value' in value && !('_id' in value) ? value.value : value;

function assertPgAmount(pg, payment, cancelled = false) {
  const raw = pg?.rawV2 || {}, amount = raw.amount || {};
  const paid = Number(amount.paid ?? amount.total ?? pg?.amount), expected = Number(payment.paymentAmount);
  if (!(expected > 0) || paid !== expected || clean(raw.currency || pg?.currency).toUpperCase() !== 'KRW') throw error('REFUND_AMOUNT_REVIEW');
  if (!cancelled) return;
  if (pg.status !== 'cancelled' || /PARTIAL/i.test(clean(raw.status))) throw error('REFUND_PARTIAL_REVIEW');
  const cancellations = Array.isArray(raw.cancellations) ? raw.cancellations : [];
  const succeeded = cancellations.filter(row => row.status === 'SUCCEEDED');
  const byId = new Map(succeeded.filter(row => row.id).map(row => [row.id, row]));
  const summed = byId.size ? [...byId.values()].reduce((sum, row) => sum + Number(row.totalAmount), 0) : NaN;
  const total = amount.cancelled == null ? summed : Number(amount.cancelled);
  if (total !== expected || Number.isFinite(summed) && summed !== expected) throw error('REFUND_PARTIAL_REVIEW');
}

async function assertNoCompletedDelivery(db, doc, payment, deps) {
  const owner = clean(doc.userId);
  const keys = [...new Set([doc.id, doc.idempotencyKey, doc.paymentId, payment?.merchantUid, payment?.impUid,
    payment?._id, payment?.requestId, payment?.idempotencyKey, payment?.sessionId, payment?.reportId].map(clean).filter(Boolean))];
  const linked = await db.find(PaidExecutionRecord, { userId: owner,
    $or: [{ orderId: { $in: keys } }, { paymentId: { $in: keys } }, { requestId: { $in: keys } },
      { _id: { $in: keys.map(toObjectId).filter(Boolean) } }] }, { limit: 101 });
  if (linked.length > 100 || linked.some(row => row.status === 'completed')) throw error('REFUND_COMPLETED_EVIDENCE_REVIEW');
  // An old failed request can share a legacy order with a newer request. Its
  // pending delivery must not lose funding while its apply call is in flight.
  if (linked.some(row => clean(row.requestId) !== clean(doc.idempotencyKey)
    && ['paid_pending_generation', 'generating', 'partial', 'delivery_pending'].includes(row.status))) throw error('REFUND_ACTIVE_EVIDENCE_REVIEW');
  const tokens = [...new Set([...keys, ...linked.flatMap(row => [row._id, row.executionId, row.requestId, row.resultId]).map(clean)].filter(Boolean))];
  for (const service of Object.keys(SERVICES)) {
    const model = configured(service, deps).model;
    const completed = await db.findOne(model, { userId: owner, status: { $in: ['completed', 'delivery_pending', 'generating', 'partial'] },
      $or: [{ paymentId: { $in: tokens } }, { idempotencyKey: { $in: tokens } }, { id: { $in: tokens } }] });
    if (completed) throw error('REFUND_COMPLETED_EVIDENCE_REVIEW');
  }
}

function currentLease(doc, now) {
  const at = new Date(doc?.llmMeta?.lockedAt || 0).getTime();
  // Fusion generation holds its own lease; a live one means a provider call may still save a result.
  return at > now.getTime() - LOCK_MS || new Date(doc?.generationLease?.expiresAt || 0).getTime() > now.getTime();
}

function configured(service, deps) {
  const spec = SERVICES[service];
  return spec && { ...spec, model: deps.models?.[service] || spec.model };
}

function storedFeature(doc, spec) {
  const allowed = spec.features || [spec.feature];
  // The actual billed SKU wins over content type: legacy life-fortune reports
  // can have been bought under the life-book SKU.
  let feature = clean(doc.featureKey) || (!spec.features ? spec.feature : '');
  if (!feature) {
    const body = doc.llmMeta?.resumeBody || {};
    feature = clean(body.featureKey || body.serviceType);
    if (feature === 'life-book-ai') feature = '';
    if (!feature) {
      const type = clean(doc.llmMeta?.input?.consultationType || doc.consultationType || body.consultationType).toLowerCase().replace(/[-_]/g, '');
      if (type && !['lifebook', 'lifefortune'].includes(type)) throw error('REFUND_FEATURE_REVIEW');
      feature = type === 'lifefortune' ? 'life-fortune-ai-consultation' : spec.feature;
    }
  }
  if (!allowed.includes(feature)) throw error('REFUND_FEATURE_REVIEW');
  return feature;
}

// All identities come from the saved owner-scoped request, never a browser's
// asserted access method. paymentId can also be an execution/ledger ObjectId.
async function funding(db, doc, spec) {
  const uid = toObjectId(doc.userId);
  if (!uid || !doc.idempotencyKey || doc.accessType === 'admin') throw error('REFUND_PROOF_REVIEW');
  const feature = storedFeature(doc, spec);
  const requestId = clean(doc.idempotencyKey);
  const identity = { userId: clean(doc.userId), featureId: feature, requestId };
  const executions = await db.find(PaidExecutionRecord, identity, { limit: 5 });
  if (executions.some(row => row.status === 'completed')) throw error('REFUND_COMPLETED_EVIDENCE_REVIEW');
  const tokens = [...new Set([requestId, doc.paymentId, ...executions.flatMap(row => [row.orderId, row.paymentId])].map(clean).filter(Boolean))];
  const orders = await db.find(Payment, { userId: uid, featureKey: feature,
    $or: [{ requestId }, { idempotencyKey: requestId }, { merchantUid: { $in: tokens } }] }, { limit: 3 });
  if (orders.length > 1) throw error('REFUND_PROOF_REVIEW');
  const payment = orders[0];
  if (payment && ![...PAID, 'refunded', 'cancelled'].includes(payment.status)) throw error('REFUND_PAYMENT_NOT_PAID');
  const usage = await db.find(PointHistory, { userId: uid, featureKey: feature, kind: 'deduct',
    $or: [{ 'metadata.requestId': requestId }, { 'metadata.purchaseId': requestId }, ...(toObjectId(doc.paymentId) ? [{ _id: toObjectId(doc.paymentId) }] : [])] }, { limit: 3 });
  const pass = usage.filter(row => ['family', 'membership_pass', 'pass'].includes(row.metadata?.accessType));
  if (pass.length > 1) throw error('REFUND_PROOF_REVIEW');
  let monthly = await findMoonstoneSpendEvidence(null, { db, userId: uid, featureKeys: [feature], tokens });
  // A prior attempt may have restored the lot before the final document write
  // failed. Only the original server-reserved proof can bridge that interval.
  const saved = doc.llmMeta?.deliveryRefund?.funding;
  if (!monthly && saved?.monthly?.ledgerId) {
    const original = await db.findOne(MonthlyCreditLedger, { _id: toObjectId(saved.monthly.ledgerId), userId: uid,
      type: 'MONTHLY_CREDIT_SPEND', amount: saved.monthly.amount,
      $or: [{ serviceKey: feature }, { 'metadata.featureKey': feature }] });
    if (original) monthly = saved.monthly;
  }
  if (payment && monthly?.sourceId === `order-discount:${payment.merchantUid}`) monthly = null;
  if (!payment && !monthly && !pass.length && !(doc.accessType === 'pass' && !doc.usageAppliedAt)) throw error('REFUND_PROOF_REVIEW');
  return { feature, requestId, payment, monthly, pass: pass[0] || null };
}

async function setRefund(db, model, doc, values) {
  const result = unwrap(await db.findOneAndUpdate(model, {
    id: doc.id, userId: doc.userId, status: 'generation_failed',
    'llmMeta.deliveryRefund.status': 'pending',
  }, { $set: { ...Object.fromEntries(Object.entries(values).map(([key, value]) => [`llmMeta.deliveryRefund.${key}`, value])), updatedAt: new Date() } }, { returnDocument: 'after' }));
  if (!result) throw error('REFUND_STATE_CONFLICT');
  return result;
}

async function restoreMonthly(db, doc, proof, feature, now, restore = restoreMonthlyCreditLot) {
  if (!proof) return;
  const uid = toObjectId(doc.userId), sourceId = `consultation-refund:${doc.id}`;
  await db.transaction(async tx => {
    const receiptFilter = { userId: uid, type: 'MONTHLY_CREDIT_GRANT', sourceId };
    if (await tx.findOne(MonthlyCreditLedger, receiptFilter)) return;
    const original = await tx.findOne(MonthlyCreditLedger, { _id: toObjectId(proof.ledgerId), userId: uid, type: 'MONTHLY_CREDIT_SPEND', ...moonstoneSpendRefundFilter() });
    if (!original || Number(original.amount) !== proof.amount) throw error('REFUND_MONTHLY_PROOF_PENDING');
    const restored = await restore({ db: tx, userId: uid, lotId: sourceId, amount: proof.amount, returnDetails: true });
    if (!restored?.added) throw error('REFUND_MONTHLY_PENDING');
    await tx.insertOne(MonthlyCreditLedger, { ...receiptFilter, amount: proof.amount, beforeBalance: restored.beforeBalance,
      afterBalance: restored.afterBalance, serviceKey: feature, reason: '상담 결과 미완성 월정석 복원',
      metadata: { requestId: doc.idempotencyKey, originalLedgerId: proof.ledgerId }, createdAt: now, updatedAt: now, settledAt: now });
    await tx.updateOne(MonthlyCreditLedger, { _id: original._id, userId: uid }, { $set: {
      'metadata.refundedForServiceExecution': true, 'metadata.refundedForUnlockFailure': true,
      'metadata.refundedAt': now, 'metadata.refundExecutionId': sourceId,
    } });
  });
}

async function restorePass(db, doc, proof, restore = refundPassCoverage) {
  if (!proof) return;
  const meta = proof.metadata || {};
  const result = await restore({ db, userId: doc.userId, cycleKey: meta.passCycleKey, sourcePointHistoryId: proof._id,
    cost: Number(meta.coinCost || meta.coinPrice), refundId: `consultation:${doc.id}`,
    restorePass: { tier: meta.passTier, expiresAt: meta.passCycleKey, profileLimit: meta.passProfileLimit,
      maxCoveredCoin: meta.passLimit, monthlyLimitCoin: meta.passBudgetCoin, passPolicyVersion: meta.passPolicyVersion },
  });
  if (!result.refunded) throw error('REFUND_PASS_REVIEW');
}

/** Called only after generation has durably reached its terminal failed state. */
export async function settleFailedConsultationRefund(env, { service, id, userId }, deps = {}) {
  const spec = configured(service, deps);
  if (!spec || !id || !userId) return { ok: false, refundStatus: '', reason: 'REFUND_IDENTITY_REQUIRED' };
  const withDb = deps.withDb || withPaymentDb;
  const ctx = createPaymentContext({ requestId: `consultation-refund:${id}`, route: 'consultation-terminal-refund' });
  const now = new Date(deps.now || Date.now());
  const run = work => withDb(env, ctx, work);
  let doc;
  try {
    doc = await run(db => db.findOne(spec.model, { id: clean(id), userId: clean(userId) }));
    // Native purchases must never enter web payment or monthly-credit refunds.
    if (doc?.accessSource === 'toss') return { ok: false, refundStatus: 'manual_review', reason: 'TOSS_ORDER_REVIEW_REQUIRED', retryable: false };
    if (doc?.llmMeta?.supportRecovery && doc.llmMeta.supportRecovery.refundApproved !== true) {
      return { ok: false, refundStatus: consultationRefundState(doc), reason: 'REFUND_NOT_AUTHORIZED', retryable: false };
    }
    if (!doc || doc.accessType === 'admin' || doc.status !== 'generation_failed' || currentLease(doc, now) || doc.llmMeta?.supportRecovery?.active) {
      return { ok: false, refundStatus: consultationRefundState(doc), reason: 'REFUND_NOT_TERMINAL' };
    }
    const state = consultationRefundState(doc);
    if (state === 'refunded') return { ok: true, refundStatus: state, idempotent: true };
    if (state === 'manual_review') return { ok: false, refundStatus: state, retryable: false };
    if (!state) {
      // Reservation and any racing completed transition compete on one document.
      doc = await run(db => db.findOneAndUpdate(spec.model, {
        id: doc.id, userId: doc.userId, status: 'generation_failed', updatedAt: doc.updatedAt,
        'llmMeta.deliveryRefund.status': { $exists: false },
      }, { $set: { updatedAt: now, 'llmMeta.deliveryRefund': { status: 'pending', requestedAt: now,
        idempotencyKey: `consultation-refund:${service}:${doc.id}`, method: '', reason: 'RESULT_INCOMPLETE' } } }, { returnDocument: 'after' }));
      doc = unwrap(doc);
      if (!doc) return pending();
    }
    const proof = await run(db => funding(db, doc, spec));
    await run(db => assertNoCompletedDelivery(db, doc, proof.payment, deps));
    doc = await run(db => setRefund(db, spec.model, doc, { funding: {
      feature: proof.feature, requestId: proof.requestId,
      ...(proof.payment ? { orderId: proof.payment.merchantUid } : {}),
      ...(proof.monthly ? { monthly: proof.monthly } : {}),
      ...(proof.pass ? { passId: String(proof.pass._id) } : {}),
    } }));
    const payment = proof.payment;
    if (payment) {
      const fetchPayment = deps.fetchPayment || fetchPortOnePayment, cancelPayment = deps.cancelPayment || cancelPortOnePayment;
      let pg = await fetchPayment(env, payment.merchantUid);
      assertPgAmount(pg, payment, pg.status === 'cancelled');
      if (pg.status !== 'cancelled') {
        if (pg.status !== 'paid' || !PAID.includes(payment.status)) throw error('REFUND_PAYMENT_REVIEW');
        const method = [payment.paymentMethod, pg.pay_method, pg.rawV2?.method?.type].map(clean).join(' ');
        if (payment.metadata?.paypalCharge || payment.metadata?.googlePlay || payment.metadata?.appStore
          || /paypal|google.?play|apple|app.?store|vbank|virtual.?account/i.test(method)) throw error('REFUND_PROVIDER_REVIEW');
        const claimed = await run(db => claimRefund(db, { orderId: payment.merchantUid, now }));
        if (!claimed) return pending();
        await run(db => assertNoCompletedDelivery(db, doc, payment, deps));
        await cancelPayment(env, { merchantUid: payment.merchantUid, impUid: payment.impUid || undefined,
          reason: '상담 결과 생성 최종 실패에 따른 전액 환불', checksum: Number(payment.paymentAmount),
          idempotencyKey: doc.llmMeta.deliveryRefund.idempotencyKey });
        pg = await fetchPayment(env, payment.merchantUid);
      }
      if (pg.status !== 'cancelled') return pending();
      assertPgAmount(pg, payment, true);
      await run(db => db.transaction(async tx => {
        await assertNoCompletedDelivery(tx, doc, payment, deps);
        await settleRefund(tx, { orderId: payment.merchantUid, now });
        await revokePurchaseEntitlement(tx, payment.merchantUid, now);
      }));
      // This existing helper restores only the original discount's settled SPEND.
      const discountRestored = await run(db => (deps.releaseOrderMoonstones || releaseOrderMoonstones)(db, payment.merchantUid));
      if (payment.pricingSnapshot?.moonstoneDiscount?.quantity && !discountRestored) return pending();
    }
    await run(db => restoreMonthly(db, doc, proof.monthly, proof.feature, now, deps.restoreMonthly));
    await run(db => restorePass(db, doc, proof.pass, deps.restorePass));
    await run(db => db.transaction(async tx => {
      await assertNoCompletedDelivery(tx, doc, payment, deps);
      await tx.updateOne(PaidExecutionRecord, { userId: clean(userId), featureId: proof.feature, requestId: proof.requestId,
        status: { $ne: 'completed' } }, { $set: { status: 'refunded', updatedAt: now } });
      await tx.updateOne(spec.model, { id: doc.id, userId: doc.userId, status: 'generation_failed',
        'llmMeta.deliveryRefund.status': 'pending' }, { $set: { 'llmMeta.billingCleanupPending': false } });
      await setRefund(tx, spec.model, doc, { status: 'refunded', settledAt: now,
        method: payment ? 'cash' : proof.monthly ? 'monthly' : proof.pass ? 'pass' : 'no_charge',
        cashAmount: payment ? Number(payment.paymentAmount) : 0,
        monthlyAmount: (proof.monthly?.amount || 0) + Number(payment?.pricingSnapshot?.moonstoneDiscount?.quantity || 0) });
    }));
    return { ok: true, refundStatus: 'refunded' };
  } catch (cause) {
    const code = clean(cause?.code);
    // Financial uncertainty stays pending, including PG success followed by a
    // database failure. The next attempt queries PG before issuing any cancel.
    if (doc && /REVIEW$/.test(code)) {
      try { await run(db => setRefund(db, spec.model, doc, { status: 'manual_review', code, updatedAt: now })); }
      catch { return pending(); }
      return { ok: false, refundStatus: 'manual_review', retryable: false, reason: code };
    }
    return pending();
  }
}

/** Refund obligations outlive the seven-day window used by LLM continuation. */
export async function runPendingConsultationRefunds(env, options = {}) {
  const withDb = options.withDb || withPaymentDb;
  const ctx = createPaymentContext({ requestId: 'consultation-refund-reconcile', route: 'CRON consultation-refunds' });
  const outcomes = [];
  for (const [service, base] of Object.entries(SERVICES)) {
    const model = options.models?.[service] || base.model;
    const docs = await withDb(env, ctx, db => db.find(model, { status: 'generation_failed', accessSource: { $ne: 'toss' },
      'llmMeta.supportRecovery.active': { $ne: true }, $and: [
        { $or: [{ 'llmMeta.deliveryRefund.status': 'pending' },
          { 'llmMeta.refundEligibleAt': { $exists: true }, 'llmMeta.deliveryRefund.status': { $exists: false } }] },
        { $or: [{ 'llmMeta.supportRecovery': { $exists: false } }, { 'llmMeta.supportRecovery.refundApproved': true }] },
      ] }, { projection: { id: 1, userId: 1 }, sort: { updatedAt: 1 }, limit: 2 }));
    for (const doc of docs) {
      const result = await settleFailedConsultationRefund(env, { service, id: doc.id, userId: doc.userId }, options);
      outcomes.push({ service, refundStatus: result.refundStatus });
    }
  }
  return { outcomes };
}
