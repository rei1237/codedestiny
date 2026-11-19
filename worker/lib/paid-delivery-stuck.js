// 유료 LLM 정체 감시 (S5, 2026-11-18). 복구 크론이 같은 상담을 진전 없이 계속 이어 쓰면
// "partial 무한 대기" 금지 상태가 된다. 시도마다 저장된 본문 크기를 재고(기존 필드 재사용),
// 진전 없는 시도가 STUCK_SETTLE_STALLS 회 쌓이거나 문서가 7일 무시 창에 가까워지면 확정한다.
//   - 본문 완성(delivery_pending) → 구제 전달: completed + 미차감 표시(late-usage-settlement 재사용)
//   - 미완성(generating·partial) → generation_failed + refundEligibleAt → 공용 환불 settleFailedConsultationRefund
// 확정은 STUCK_SETTLERS 만 한다: 상태 기반 공용 환불(GENERIC) 서비스는 여기서, 나머지는 어댑터의 settleStuckDelivery 로.
// 그 밖의 서비스는 환불을 핸들러 실패 경로 안에서 하므로 바깥에서 상태만 바꾸면 "차감됐는데 결과·환불 없음"을
// 만든다 — 경보 로그만 남긴다.
// 이 목록 밖 복구 어댑터는 verify:paid-llm-delivery 의 KNOWN_STUCK_SETTLE_GAPS 와 정확히 같아야 한다.
import { Types } from 'mongoose';
import { usageSettlementSetFields } from './late-usage-settlement.js';

export const STUCK_SETTLE_STALLS = 6;            // 크론 10분 × 6 ≈ 1시간
export const STUCK_SETTLE_AGE_MS = 6 * 86400000; // 복구 창(7일) 전에 반드시 확정
export const STUCK_PROGRESS_CHARS = 1000;        // 장 하나는 수천 자, 오류·시도 기록은 수백 자 미만
const LIVE_LEASE_MS = 120000;
const STUCK_STATUSES = ['generating', 'partial', 'delivery_pending'];
// 진전 기록은 결제 뒤 시작 전 대기(pending: 흑월·천상 화합)도 센다 — 확정 여부는 설정자가 판단한다.
const WATCH_STATUSES = [...STUCK_STATUSES, 'pending'];
// 상태 기반 공용 환불(settleFailedConsultationRefund)로 확정하는 서비스. 이 밖의 STUCK_SETTLERS 는 복구 어댑터
// (라우트 모듈)가 settleStuckDelivery(env, { doc, now, model }) 를 내보내 자기 실패·환불 경로로 확정한다(S16).
export const GENERIC_STUCK_SETTLERS = Object.freeze(['new-year-ai', 'life-book-ai']);
export const STUCK_SETTLERS = Object.freeze([...GENERIC_STUCK_SETTLERS, 'love-secret-ai', 'neo-operation-room', 'heukwol', 'fortune-tea-house']);
export const STUCK_LIVE_LEASE_MS = LIVE_LEASE_MS;

// 진전 크기에서 빼는 필드: 시도마다 바뀌지만 본문이 아닌 것.
const VOLATILE = new Set(['updatedAt', 'generationLease', 'generationError', 'deliveryWatch', 'lockedAt', 'lockToken', '__v']);
export function deliveryProgressSize(doc) {
  if (!doc) return 0;
  return JSON.stringify(doc, (key, value) => VOLATILE.has(key) ? undefined : value)?.length || 0;
}

export function nextDeliveryWatch(prev, size, now) {
  const baseline = Number(prev?.baseline);
  if (Number.isFinite(baseline) && size >= baseline + STUCK_PROGRESS_CHARS) return { baseline: size, stalls: 0, at: new Date(now) };
  // 기준선은 진전 때만 올린다 — 오류 문구 길이 흔들림으로 리셋되지 않는다.
  return { baseline: Number.isFinite(baseline) ? baseline : size, stalls: Number(prev?.stalls || 0) + 1, at: new Date(now) };
}

function docCreatedAt(doc) {
  if (doc?.createdAt) return new Date(doc.createdAt).getTime();
  try { if (doc?._id && Types.ObjectId.isValid(doc._id) && typeof doc._id !== 'string') return new Types.ObjectId(doc._id).getTimestamp().getTime(); } catch {}
  return NaN;
}

export function shouldSettleStuck(doc, now) {
  if (Number(doc?.deliveryWatch?.stalls || 0) >= STUCK_SETTLE_STALLS) return true;
  const created = docCreatedAt(doc);
  return Number.isFinite(created) && now - created >= STUCK_SETTLE_AGE_MS;
}

/** 시도 뒤 진전을 기록한다. 최상위 deliveryWatch 는 스키마 밖이라 원시 컬렉션으로 쓰고 updatedAt 은 건드리지 않는다. */
export async function recordDeliveryWatch(model, doc, now) {
  const collection = model?.collection;
  if (!collection || !doc?._id) return null;
  const owner = { _id: doc._id, userId: doc.userId };
  const fresh = await collection.findOne(owner);
  if (!fresh || !WATCH_STATUSES.includes(fresh.status)) return null;
  const watch = nextDeliveryWatch(fresh.deliveryWatch, deliveryProgressSize(fresh), now);
  await collection.updateOne(owner, { $set: { deliveryWatch: watch } });
  return watch;
}

const logSettled = fields => console.warn('paid_delivery_stuck_settled', fields);
export const logStuckSettled = logSettled;
export function logStuckUnsettled(service, doc) {
  console.warn('paid_delivery_stuck_unsettled', { service, sessionId: String(doc?.id || doc?.resultId || doc?._id || ''), stalls: Number(doc?.deliveryWatch?.stalls || 0) });
}

/** 정체 확정. 응답 본문·결제 ID·출생 정보는 로그에 남기지 않는다.
 * isComplete(fresh) 가 주어지면 delivery_pending 도 완성일 때만 구제 전달하고, 미완성이면 실패+환불한다(S16). */
export async function settleStuckConsultation(env, { service, model, doc, now, refund, isComplete }) {
  const sessionId = String(doc?.id || '');
  if (!GENERIC_STUCK_SETTLERS.includes(service) || !model || !doc?.id || !doc.userId) return { outcome: 'unsupported' };
  const owner = { id: doc.id, userId: doc.userId };
  const fresh = await model.findOne(owner).lean();
  if (!fresh || !STUCK_STATUSES.includes(fresh.status)) return { outcome: 'progressed' };
  const lockedAt = new Date(fresh.llmMeta?.lockedAt || 0).getTime();
  if (lockedAt > now - LIVE_LEASE_MS) return { outcome: 'leased' };
  const at = new Date(now).toISOString();
  const stalls = Number(fresh.deliveryWatch?.stalls || 0);
  const closeSupport = fresh.llmMeta?.supportRecovery ? { 'llmMeta.supportRecovery.active': false, 'llmMeta.supportRecovery.finishedAt': at } : {};
  // updatedAt CAS: 그 사이 브라우저·다른 워커가 저장한 진전이 있으면 확정하지 않는다.
  const cas = { ...owner, status: fresh.status, updatedAt: fresh.updatedAt };
  const unlock = { 'llmMeta.lockedAt': null, 'llmMeta.lockToken': '' };
  if (fresh.status === 'delivery_pending' && (typeof isComplete !== 'function' || isComplete(fresh))) {
    const result = await model.updateOne(cas, { $set: { status: 'completed', ...unlock, ...closeSupport,
      ...usageSettlementSetFields({ usageSettlement: 'failed', usageSettlementReason: 'DELIVERY_STUCK', usageSettlementFailedAt: at }) } });
    if (!result?.modifiedCount) return { outcome: 'progressed' };
    logSettled({ service, sessionId, outcome: 'rescued', stalls });
    return { outcome: 'rescued' };
  }
  const result = await model.updateOne(cas, { $set: { status: 'generation_failed', 'llmMeta.refundEligibleAt': at, ...unlock, ...closeSupport,
    generationError: { code: 'DELIVERY_STUCK', message: 'recovery made no progress', at } } });
  if (!result?.modifiedCount) return { outcome: 'progressed' };
  let refundStatus = 'pending';
  try {
    const settle = refund || (await import('./consultation-delivery-refund.js')).settleFailedConsultationRefund;
    refundStatus = (await settle(env, { service, id: doc.id, userId: doc.userId }))?.refundStatus || 'pending';
  } catch { refundStatus = 'pending'; } // runPendingConsultationRefunds 가 refundEligibleAt 으로 이어 정산한다.
  logSettled({ service, sessionId, outcome: 'generation_failed', refundStatus, stalls });
  return { outcome: 'generation_failed', refundStatus };
}
