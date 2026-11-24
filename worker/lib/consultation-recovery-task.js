import { Types } from 'mongoose';
import { connectDb, withMongoRetry } from './db.js';
import * as models from './models.js';
import { runWithAiLocale, storedAiLocale } from './ai-locale-context.js';
import { runPendingConsultationRefunds } from './consultation-delivery-refund.js';
import { STUCK_SETTLERS, GENERIC_STUCK_SETTLERS, RECOVERY_WINDOW_MS, shouldSettleStuck, settleStuckConsultation, recordDeliveryWatch, logStuckUnsettled,
  expireRetryableConsultations } from './paid-delivery-stuck.js';

// Each adapter resumes an existing owner-scoped record through its normal
// payment, lease, persistence and per-part budget checks. No insert or grant here.
import { CONSULTATION_RECOVERY_ADAPTERS } from './consultation-recovery-registry.js';
export { CONSULTATION_RECOVERY_ADAPTERS };

const loadAdapters = {
  'astrology-ai': () => import('../routes/astrology-ai.js'),
  'vedic-ai': () => import('../routes/vedic-ai.js'),
  'ziwei-ai': () => import('../routes/ziwei-ai.js'),
  'sukuyo-compatibility-ai': () => import('../routes/sukuyo-compatibility-ai.js'),
  'new-year-ai': () => import('../routes/new-year-ai.js'),
  'saju-compat-premium': () => import('../routes/saju-compat-premium.js'),
  'life-book-ai': () => import('../routes/life-book-ai.js'),
  'love-secret-ai': () => import('../routes/love-secret-ai.js'),
  'neo-operation-room': () => import('../routes/neo-operation-room.js'),
  'nakshatra-ai': () => import('../routes/nakshatra-ai.js'),
  'human-design-report': () => import('../routes/human-design-report.js'),
  'destiny-compass-ai': () => import('../routes/destiny-compass-ai.js'),
  'relationship-boundary-test': () => import('../routes/relationship-boundary-test.js'),
  'naming-prompt': () => import('../routes/naming-prompt.js'),
  'heukwol': () => import('../routes/heukwol.js'),
  'celestial-harmony': () => import('../routes/celestial-harmony.js'),
  'fortune': () => import('../routes/fortune.js'),
  'karma-destiny-ai': () => import('../routes/karma-destiny-ai.js'),
  'fortune-tea-house': () => import('../routes/fortune-tea-house.js'),
};
const IDLE_MS = 300000, MAX_AGE_MS = RECOVERY_WINDOW_MS, TASK_MS = 240000, WAVE_MS = 65000;
export function consultationRecoveryFilter(now, extra) {
  return { ...extra, _id: { $gte: Types.ObjectId.createFromTime(Math.floor((now - MAX_AGE_MS) / 1000)) },
    status: { $in: ['generating', 'partial', 'delivery_pending', ...(['tarot-celestial-harmony','heukwol-warning-consultation'].includes(extra.featureKey) ? ['pending'] : [])] },
    updatedAt: { $lt: new Date(now - IDLE_MS) }, userId: { $exists: true, $ne: null } };
}
// 다시 시도 동안 붙잡아 둔 결제 증빙 claim(llmMeta.claimEvidenceIds)을 기한 만료로 닫힐 때 푼다. 토스 네이티브는 claim 을 쓰지 않는다.
// 지연 차감 취소는 요청 컨텍스트가 필요해 여기서 하지 않는다(환불 요청 경로·실행 가드 타임아웃이 맡는다).
async function releaseHeldRetryClaim(env, doc, release) {
  const evidenceIds = [...new Set([].concat(doc?.llmMeta?.claimEvidenceIds || []).map(id => String(id || '').trim()).filter(Boolean))];
  if (!evidenceIds.length || doc?.accessSource === 'toss') return;
  const releaseClaim = release || (await import('./billing-evidence-claim.js')).releaseRequestBillingEvidence;
  await releaseClaim(env, { userId: String(doc.userId), requestId: String(doc.idempotencyKey || ''), evidenceIds });
}
export async function runConsultationRecovery(env, options = {}) {
  const now = options.now || Date.now(), deadline = now + TASK_MS;
  await (options.connectDb || connectDb)(env);
  const catalog = options.adapters || CONSULTATION_RECOVERY_ADAPTERS;
  // 다시 시도 창(7일)이 지난 공용 설정자 건을 먼저 환불 대상으로 넘겨 같은 크론의 환불 정산이 바로 고르게 한다.
  const expired = [];
  for (const [route, modelName] of catalog) {
    if (!modelName || !GENERIC_STUCK_SETTLERS.includes(route)) continue;
    try {
      const out = await expireRetryableConsultations((options.models || models)[modelName], now, { onExpired: doc => releaseHeldRetryClaim(env, doc, options.releaseClaim) });
      if (out.expired) expired.push({ service: route, expired: out.expired });
    } catch { expired.push({ service: route, code: 'RETRY_EXPIRE_PENDING' }); }
  }
  // Financial obligations outlive the generation window and do not wait for LLM.
  let refunds;
  try { refunds = await (options.refundRecovery || runPendingConsultationRefunds)(env); }
  catch { refunds = { outcomes: [{ refundStatus: 'pending' }] }; }
  // Rotate first service so a slow provider cannot permanently starve later ones.
  const offset = Math.floor(now / 600000) % catalog.length;
  const adapters = [...catalog.slice(offset), ...catalog.slice(0, offset)];
  const outcomes = [];
  for (const [route, modelName, extra] of adapters) {
    if (Date.now() + WAVE_MS > deadline) break;
    try {
      const adapter = options.loadAdapter ? await options.loadAdapter(route) : await loadAdapters[route]();
      const model = (options.models || models)[modelName];
      const docs = !modelName ? await adapter.findRecoverableConsultations(env, consultationRecoveryFilter(now, extra)) : await withMongoRetry(env, () => model.find(consultationRecoveryFilter(now, extra))
        .sort({ updatedAt: 1, _id: 1 }).limit(1).select('id executionId executionKey userId status createdAt updatedAt deliveryWatch llmMeta.retryable.reopenedAt metadata.retryReopenedAt locale llmMeta.locale llmMeta.resumeBody.locale llmMeta.delivery.resumeBody.locale result.resumeBody.locale result.namingPrompt.tossIntentId result.namingPrompt.retryable.reopenedAt').lean());
      if (adapter.recoverUnstartedNativeConsultations) outcomes.push(...await adapter.recoverUnstartedNativeConsultations(env, {now,deadline}));
      for (const doc of docs) {
        if (!doc.userId || !(doc.id || doc._id || doc.resultId)) continue;
        // 정체 감시: 진전 없는 복구가 쌓이면 이어쓰기 대신 확정한다(같은 1건이라 처리량 불변).
        if (shouldSettleStuck(doc, now)) {
          // 상태 기반 공용 환불 서비스는 공용 설정자, 나머지는 어댑터 자신의 실패·환불 경로(settleStuckDelivery).
          const ownSettler = typeof adapter.settleStuckDelivery === 'function' ? adapter.settleStuckDelivery : null;
          if (STUCK_SETTLERS.includes(route) && (ownSettler || (model && GENERIC_STUCK_SETTLERS.includes(route)))) {
            const settled = ownSettler
              ? await ownSettler(env, { doc, now, model, refund: options.settleRefund })
              : await settleStuckConsultation(env, { service: route, model, doc, now, refund: options.settleRefund,
                isComplete: typeof adapter.isStuckDeliveryComplete === 'function' ? adapter.isStuckDeliveryComplete : undefined });
            outcomes.push({ service: route, stuck: settled.outcome, ...(settled.refundStatus ? { refundStatus: settled.refundStatus } : {}) });
            // unsettled: 설정자가 확정하지 않은 건(토스 네이티브 등) — 기존처럼 이어쓴다.
            // pending: 증빙 조회 실패 — 이어쓰기·회전을 건너뛰면 가장 오래된 한 건이 서비스 크론을 막는다(2026-11-22 감사 B2).
            if (!['leased', 'unsettled', 'pending'].includes(settled.outcome)) continue;
          } else logStuckUnsettled(route, doc);
        }
        try {
        const response = await runWithAiLocale(storedAiLocale(doc),
          () => adapter.resumeConsultationOnServer(env, doc));
        // Never log body/raw, payment IDs or birth inputs.
        outcomes.push({ service: route, status: response.status });
        } finally {
          // Rotate an unchanged stalled record behind other idle records. CAS
          // protects progress saved by a browser or another worker meanwhile.
          if (model && doc._id && doc.updatedAt) {
            await withMongoRetry(env, () => model.updateOne(
              { _id: doc._id, userId: doc.userId, updatedAt: doc.updatedAt },
              { $set: { updatedAt: new Date(now) } }), { retries: 0 });
          } else if (adapter.deferUnchangedConsultation) {
            await adapter.deferUnchangedConsultation(env, doc, now);
          }
          if (model) await recordDeliveryWatch(model, doc, now).catch(() => null);
          else if (typeof adapter.recordDeliveryWatch === 'function') await adapter.recordDeliveryWatch(env, doc, now).catch(() => null);
        }
      }
    } catch (error) {
      outcomes.push({ service: route, code: String(error?.code || 'RECOVERY_PENDING').slice(0, 80) });
    }
  }
  console.log('[consultation-recovery]', JSON.stringify({ outcomes, refunds, ...(expired.length ? { expired } : {}) }));
  return { ok: true, outcomes, refunds, ...(expired.length ? { expired } : {}) };
}
