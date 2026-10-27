import { createHash } from 'node:crypto';

export const SUPPORT_SERVICES = Object.freeze({
  'new-year-ai-consultation': { service: 'new-year-ai', collection: 'newYearAiConsultations', model: 'NewYearAiConsultation', maxAttempts: 3 },
  'life-book-ai-consultation': { service: 'life-book-ai', collection: 'lifeBookAiConsultations', model: 'LifeBookAiConsultation', maxAttempts: 2 },
});
export const partHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function requireCondition(ok, code) { if (!ok) throw Object.assign(new Error(code), { code }); }

export function assertSupportPaymentApproval(order, payment) {
  requireCondition(payment?.status === 'paid', 'SUPPORT_PROVIDER_PAYMENT_NOT_PAID');
  requireCondition(Number(order?.paymentAmount) > 0 && Number(payment.amount) === Number(order.paymentAmount)
    && String(payment.currency || '').toUpperCase() === 'KRW', 'SUPPORT_PROVIDER_AMOUNT_MISMATCH');
  requireCondition(String(payment.merchant_uid || payment.paymentId || payment.id || '') === order.merchantUid,
    'SUPPORT_PROVIDER_ORDER_MISMATCH');
}

// Only state and counters change. Original input, identity and valid prose stay intact.
export function planPaidConsultationRecovery({ order, doc, parts, expectedOwner, now = new Date() }) {
  const spec = SUPPORT_SERVICES[order?.featureKey];
  requireCondition(spec && doc, 'SUPPORT_ORDER_OR_RESULT_NOT_FOUND');
  requireCondition(String(order.userId) === String(doc.userId), 'SUPPORT_OWNER_MISMATCH');
  if (expectedOwner) requireCondition(String(order.userId) === expectedOwner, 'SUPPORT_EXPECTED_OWNER_MISMATCH');
  requireCondition(['paid', 'success', 'fulfilled'].includes(order.status), 'SUPPORT_PAYMENT_NOT_PAID');
  requireCondition(!order.refundLock && !order.metadata?.refundStatus, 'SUPPORT_REFUND_REVIEW_REQUIRED');
  requireCondition(Boolean(doc.idempotencyKey) && doc.idempotencyKey === (order.requestId || order.idempotencyKey), 'SUPPORT_REQUEST_MISMATCH');
  requireCondition(!doc.llmMeta?.deliveryRefund, 'SUPPORT_REFUND_REVIEW_REQUIRED');
  if (doc.status === 'completed') return { action: 'already_completed', service: spec.service, missing: [] };
  const prior = doc.llmMeta?.supportRecovery;
  if (prior) {
    requireCondition(prior.orderId === order.merchantUid && prior.approvedProvider === 'gemini'
      && prior.approvedModel === 'gemini-2.5-flash' && prior.maxOutputTokens === 12000
      && Array.isArray(prior.missingParts) && prior.maxProviderCalls === prior.missingParts.length * spec.maxAttempts,
    'SUPPORT_SCOPE_MISMATCH');
    requireCondition(prior.active && ['partial', 'generating', 'delivery_pending'].includes(doc.status), 'SUPPORT_ALREADY_ATTEMPTED');
    return { action: 'resume', service: spec.service, missing: prior.missingParts, preserved: prior.preserved, maxProviderCalls: prior.maxProviderCalls };
  }
  requireCondition(doc.status === 'generation_failed', 'SUPPORT_RESULT_NOT_TERMINAL');
  requireCondition(!doc.llmMeta?.lockedAt || now - new Date(doc.llmMeta.lockedAt) >= 180000, 'SUPPORT_GENERATION_ACTIVE');
  requireCondition(parts?.length > 0 && parts.every(p => /^[a-z]+(?:-[0-9]+)?$/.test(p.key)), 'SUPPORT_INVALID_PARTS');
  const missing = parts.filter(p => !p.valid).map(p => p.key);
  const preserved = Object.fromEntries(parts.filter(p => p.valid).map(p => [p.key, partHash(p.body)]));
  const original = { status: doc.status, generationError: doc.generationError,
    attempts: doc.llmMeta?.attempts || null, waveCount: doc.llmMeta?.waveCount || 0,
    providerCallCount: doc.llmMeta?.providerCallCount || 0,
    failures: Object.fromEntries((doc.llmMeta?.savedSections || []).filter(row => row.failure).map(row => [row.key, row.failure])),
    sectionAttempts: Object.fromEntries(parts.map(p => [p.key, doc.llmMeta?.sections?.[p.key]?.attempts || 0])) };
  const maxProviderCalls = missing.length * spec.maxAttempts;
  const recovery = { version: 1, active: true, orderId: order.merchantUid, startedAt: now.toISOString(),
    approvedProvider: 'gemini', approvedModel: 'gemini-2.5-flash', maxOutputTokens: 12000,
    callsReserved: 0, maxProviderCalls, refundApproved: false, missingParts: missing, preserved, original };
  const set = { status: 'partial', generationError: null, 'llmMeta.lockedAt': null, 'llmMeta.lockToken': '',
    'llmMeta.supportRecovery': recovery };
  if (spec.service === 'new-year-ai') {
    for (const key of missing) {
      set[`llmMeta.attempts.${key}`] = 0;
      const index = doc.llmMeta?.savedSections?.findIndex(row => row.key === key);
      if (index >= 0) set[`llmMeta.savedSections.${index}.failure`] = null;
    }
  } else {
    set['llmMeta.waveCount'] = 0;
    for (const key of missing) {
      set[`llmMeta.sections.${key}.attempts`] = 0;
      set[`llmMeta.sections.${key}.needsRepair`] = false;
    }
  }
  return { action: 'recover', service: spec.service, missing, preserved, original, maxProviderCalls, set };
}
