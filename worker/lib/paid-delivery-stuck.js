// 유료 LLM 정체 감시 (S5, 2026-11-18). 복구 크론이 같은 상담을 진전 없이 계속 이어 쓰면
// "partial 무한 대기" 금지 상태가 된다. 시도마다 저장된 본문 크기를 재고(기존 필드 재사용),
// 진전 없는 시도가 STUCK_SETTLE_STALLS 회 쌓이거나 문서가 7일 무시 창에 가까워지면 확정한다.
//   - 본문 완성(delivery_pending) → 구제 전달: completed + 미차감 표시(late-usage-settlement 재사용)
//   - 미완성(generating·partial) → generation_failed + llmMeta.retryable(다시 시도 가능, 2026-11-19). 환불하지 않는다.
//     완성된 장은 그대로 두고, 무료 다시 시도(reopenRetryableConsultation)가 빠진 장 이어쓰기로 되돌린다.
//     RETRY_REFUND_AFTER_MS(7일) 안에 완성되지 않거나 고객이 환불을 원하면 refundEligibleAt 을 붙여
//     기존 공용 환불 settleFailedConsultationRefund(runPendingConsultationRefunds)로 넘긴다.
//     refundEligibleAt 이 없는 generation_failed 는 공용 환불 크론이 고르지 않는다 — 그 사이 결제는 그대로다.
// 확정은 STUCK_SETTLERS 만 한다: 상태 기반 공용 환불(GENERIC) 서비스는 여기서, 나머지는 어댑터의 settleStuckDelivery 로.
// 그 밖의 서비스는 환불을 핸들러 실패 경로 안에서 하므로 바깥에서 상태만 바꾸면 "차감됐는데 결과·환불 없음"을
// 만든다 — 경보 로그만 남긴다.
// 이 목록 밖 복구 어댑터는 verify:paid-llm-delivery 의 KNOWN_STUCK_SETTLE_GAPS 와 정확히 같아야 한다.
import { Types } from 'mongoose';
import { usageSettlementSetFields } from './late-usage-settlement.js';

export const STUCK_SETTLE_STALLS = 6;            // 크론 10분 × 6 ≈ 1시간
export const STUCK_SETTLE_AGE_MS = 6 * 86400000; // 복구 창(7일) 전에 반드시 확정
export const STUCK_PROGRESS_CHARS = 1000;        // 장 하나는 수천 자, 오류·시도 기록은 수백 자 미만
// 복구 크론이 문서를 보는 창과 다시 시도 창은 같은 7일이고, 둘 다 생성(결제·생성 시작) 시각부터 센다(2026-11-19 사용자 결정).
export const RECOVERY_WINDOW_MS = 7 * 86400000;
export const RETRY_REFUND_AFTER_MS = RECOVERY_WINDOW_MS;
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

/** 다시 시도 가능 건의 환불 시각: 생성 시각 + 7일. 생성 시각을 알 수 없으면(_id 도 아님) 지금 + 7일. */
export function retryRefundAt(doc, now = Date.now()) {
  const created = docCreatedAt(doc);
  return new Date((Number.isFinite(created) ? created : now) + RETRY_REFUND_AFTER_MS);
}

// 정체 나이의 시작: 다시 시도로 재개방한 문서는 재개방 시각부터 잰다 — 6일째 연 다시 시도가 다음 크론에 바로 다시 확정되지 않게.
// 공용·찻집·연애 비책·네오는 llmMeta.retryable.reopenedAt, 흑월은 metadata.retryReopenedAt 에 남긴다.
// 환불 시각(retryRefundAt)은 생성 + 7일 그대로다(재개방이 기한을 늘리지 않는다).
function stuckAgeStart(doc) {
  const reopened = Math.max(0, ...[doc?.llmMeta?.retryable?.reopenedAt, doc?.metadata?.retryReopenedAt].map(ms).filter(Number.isFinite));
  const created = docCreatedAt(doc);
  if (!(reopened > 0)) return created;
  return Number.isFinite(created) ? Math.max(created, reopened) : reopened;
}

export function shouldSettleStuck(doc, now) {
  if (Number(doc?.deliveryWatch?.stalls || 0) >= STUCK_SETTLE_STALLS) return true;
  const created = stuckAgeStart(doc);
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
  const failed = { status: 'generation_failed', ...closeSupport, generationError: { code: 'DELIVERY_STUCK', message: 'recovery made no progress', at } };
  const prev = fresh.llmMeta?.retryable;
  // 처음 정한 환불 시각(생성 + 7일)을 다시 정체돼도 늘리지 않는다.
  const prevRefundAt = ms(prev?.refundAt);
  const refundAt = Number.isFinite(prevRefundAt) ? new Date(prevRefundAt) : retryRefundAt(fresh, now);
  // 다시 시도 창 안: 환불하지 않고 다시 시도 가능으로 둔다.
  // 운영 복구(supportRecovery)·토스(accessSource toss) 문서는 예외로 바로 정산한다 — 토스엔 다시 시도 화면이 없고
  // 공용 환불 크론(runPendingConsultationRefunds)이 토스를 고르지 않아, 여기서 settle 이 manual_review 로 넘겨야 방치되지 않는다.
  const deferrable = !fresh.llmMeta?.supportRecovery && fresh.accessSource !== 'toss';
  if (deferrable && refundAt.getTime() > now) {
    const since = prev?.since ? new Date(prev.since) : new Date(now);
    const retryable = { ...(prev || {}), since, refundAt, code: 'DELIVERY_STUCK' };
    const result = await model.updateOne(cas, { $set: { ...failed, ...llmMetaFields(fresh, { ...unlock, 'llmMeta.retryable': retryable }) } });
    if (!result?.modifiedCount) return { outcome: 'progressed' };
    logSettled({ service, sessionId, outcome: 'retryable', stalls });
    return { outcome: 'retryable', refundAt: refundAt.toISOString() };
  }
  // 다시 시도 창이 지난 뒤의 정체(또는 위 예외 문서): 기존처럼 환불 대상으로 확정하고 공용 환불을 부른다.
  const result = await model.updateOne(cas, { $set: { ...failed, ...llmMetaFields(fresh, { ...unlock, 'llmMeta.refundEligibleAt': at,
    ...(deferrable ? { 'llmMeta.retryable.refundReason': 'RETRY_WINDOW_EXPIRED' } : {}) }) } });
  if (!result?.modifiedCount) return { outcome: 'progressed' };
  let refundStatus = 'pending';
  try {
    const settle = refund || (await import('./consultation-delivery-refund.js')).settleFailedConsultationRefund;
    refundStatus = (await settle(env, { service, id: doc.id, userId: doc.userId }))?.refundStatus || 'pending';
  } catch { refundStatus = 'pending'; } // runPendingConsultationRefunds 가 refundEligibleAt 으로 이어 정산한다.
  logSettled({ service, sessionId, outcome: 'generation_failed', refundStatus, stalls });
  return { outcome: 'generation_failed', refundStatus };
}

// llmMeta 가 null 인 문서에 'llmMeta.x' 를 $set 하면 Mongo 가 거부한다 — 그때는 객체째 쓴다.
function llmMetaFields(fresh, fields) {
  if (fresh?.llmMeta && typeof fresh.llmMeta === 'object') return fields;
  const meta = {};
  for (const [key, value] of Object.entries(fields)) {
    const parts = key.replace(/^llmMeta\./, '').split('.');
    let at = meta;
    for (const part of parts.slice(0, -1)) at = at[part] ||= {};
    at[parts.at(-1)] = value;
  }
  return { llmMeta: meta };
}

function ms(value) { return new Date(value ?? NaN).getTime(); }
// 환불이 이미 시작됐거나 예약된 건: 다시 시도를 열면 "환불됐는데 결과도 받음" 또는 환불 중 재생성이 된다.
function refundStarted(meta) {
  return Boolean(meta?.deliveryRefund || meta?.refundEligibleAt || meta?.billingCleanupPending);
}

// 다시 시도 reset 은 서비스별 이어쓰기 예산(llmMeta 아래)만 되돌린다. 상태·잠금·다시 시도 표지·환불 필드는 막는다(fail-closed).
const RESET_BLOCKED = ['llmMeta.retryable', 'llmMeta.lockedAt', 'llmMeta.lockToken', 'llmMeta.refundEligibleAt', 'llmMeta.deliveryRefund', 'llmMeta.billingCleanupPending'];
function resetFields(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (!key.startsWith('llmMeta.') || RESET_BLOCKED.some(p => key === p || key.startsWith(`${p}.`))) continue;
    out[key] = value;
  }
  return out;
}

/** 요청 중 종결 실패를 다시 시도 가능으로 둘 때의 표지. 환불 시각은 생성 + 7일이고 이미 있으면 늘리지 않는다.
 * 창이 지났거나 환불이 시작됐으면 null — 호출부는 기존 즉시 환불 경로로 간다. */
export function retryableFailureMeta(doc, now = Date.now(), code = 'LLM_ERROR') {
  if (!doc || refundStarted(doc.llmMeta)) return null;
  const prev = doc.llmMeta?.retryable;
  const prevRefundAt = ms(prev?.refundAt);
  const refundAt = Number.isFinite(prevRefundAt) ? new Date(prevRefundAt) : retryRefundAt(doc, now);
  if (!(refundAt.getTime() > now)) return null;
  return { ...(prev || {}), since: prev?.since ? new Date(prev.since) : new Date(now), refundAt, code: String(code || 'LLM_ERROR').slice(0, 40) };
}

/** 응답에 싣는 다시 시도 상태. 창 안·환불 전 다시 시도 가능 실패에만 붙는다. */
export function publicRetryState(doc, now = Date.now()) {
  const retryable = doc?.llmMeta?.retryable;
  if (doc?.status !== 'generation_failed' || !retryable || refundStarted(doc.llmMeta)) return null;
  const refundAt = ms(retryable.refundAt);
  if (!(refundAt > now)) return null;
  return { retryable: true, refundAt: new Date(refundAt).toISOString() };
}

/** 공용 다시 시도. 같은 결제 건(소유자 userId + 문서 id)의 다시 시도 가능 실패만, 환불 전·창 안에서
 * 빠진 장 이어쓰기(partial)로 되돌린다. 완성된 장·결제·이용권 증빙은 건드리지 않는다(추가 결제·차감 없음).
 * 실제 생성은 각 서비스의 기존 이어쓰기 경로(lease·장별 예산)가 맡는다. */
// idKey: 문서 식별 필드(기본 'id'). 숙요 궁합처럼 _id 로 찾는 서비스는 '_id' 를 넘긴다(2026-11-20 R10).
export async function reopenRetryableConsultation(model, { id, userId } = {}, now = Date.now(), { reset, idKey = 'id' } = {}) {
  if (!model || !id || !userId) return { ok: false, reason: 'NOT_FOUND' };
  const fresh = await model.findOne({ [idKey]: id, userId }).lean();
  if (!fresh) return { ok: false, reason: 'NOT_FOUND' };
  const retryable = fresh.llmMeta?.retryable;
  if (fresh.status !== 'generation_failed' || !retryable) return { ok: false, reason: 'NOT_RETRYABLE' };
  if (refundStarted(fresh.llmMeta)) return { ok: false, reason: 'REFUND_STARTED' };
  if (!(ms(retryable.refundAt) > now)) return { ok: false, reason: 'RETRY_WINDOW_EXPIRED' };
  const extra = typeof reset === 'function' ? resetFields(reset(fresh)) : {};
  const result = await model.updateOne({ [idKey]: id, userId, status: 'generation_failed', updatedAt: fresh.updatedAt }, { $set: { ...extra,
    status: 'partial', generationError: null, 'llmMeta.lockedAt': null, 'llmMeta.lockToken': '',
    'llmMeta.retryable.reopens': Number(retryable.reopens || 0) + 1, 'llmMeta.retryable.reopenedAt': new Date(now) } });
  if (!result?.modifiedCount) return { ok: false, reason: 'CONFLICT' };
  // 정체 기록을 비워야 다음 크론이 바로 다시 확정하지 않는다(스키마 밖 필드라 원시 컬렉션).
  if (model.collection && fresh._id) await model.collection.updateOne({ _id: fresh._id, userId }, { $set: { deliveryWatch: null } }).catch(() => null);
  return { ok: true, status: 'partial' };
}

/** 고객 환불 요청 등: 다시 시도 가능 실패를 기존 공용 환불 크론의 대상으로 넘긴다. 다시 시도는 닫힌다. */
export async function markRetryableRefundDue(model, { id, userId } = {}, now = Date.now(), reason = 'CUSTOMER_REQUEST', { idKey = 'id' } = {}) {
  if (!model || !id || !userId) return { ok: false, reason: 'NOT_FOUND' };
  const fresh = await model.findOne({ [idKey]: id, userId }).lean();
  if (!fresh) return { ok: false, reason: 'NOT_FOUND' };
  if (fresh.status !== 'generation_failed' || !fresh.llmMeta?.retryable) return { ok: false, reason: 'NOT_RETRYABLE' };
  if (refundStarted(fresh.llmMeta)) return { ok: true, idempotent: true };
  const result = await model.updateOne({ [idKey]: id, userId, status: 'generation_failed', updatedAt: fresh.updatedAt }, { $set: {
    'llmMeta.refundEligibleAt': new Date(now).toISOString(), 'llmMeta.retryable.refundReason': String(reason).slice(0, 40) } });
  return result?.modifiedCount ? { ok: true } : { ok: false, reason: 'CONFLICT' };
}

/** 다시 시도 창이 지난 건을 환불 대상으로 넘긴다. 다시 연 뒤 방치된 partial·generating 도 포함한다(살아 있는 lease·isLive 는 제외).
 * 복구 크론이 공용 환불 크론보다 먼저 부른다. */
export async function expireRetryableConsultations(model, now = Date.now(), { limit = 50, isLive, idKey = 'id', onExpired } = {}) {
  if (!model) return { expired: 0 };
  const docs = await model.find({ status: { $in: ['generation_failed', 'partial', 'generating'] },
    'llmMeta.retryable.refundAt': { $lte: new Date(now) }, 'llmMeta.refundEligibleAt': { $exists: false },
    'llmMeta.deliveryRefund': { $exists: false }, userId: { $exists: true, $ne: null } })
    .limit(limit).select(`${idKey === 'id' ? 'id' : `id ${idKey}`} userId status updatedAt idempotencyKey accessSource llmMeta`).lean();
  let expired = 0;
  for (const doc of docs) {
    const meta = doc?.llmMeta;
    // 질의 조건을 다시 확인한다(fail-closed).
    if (!doc?.[idKey] || !doc.userId || !meta?.retryable || refundStarted(meta)) continue;
    if (!['generation_failed', 'partial', 'generating'].includes(doc.status)) continue;
    if (!(ms(meta.retryable.refundAt) <= now)) continue;
    // lockedAt 을 쓰지 않는 서비스(연애 비책: delivery.lease + updatedAt)는 isLive 로 살아 있는 생성을 알려 준다.
    if (ms(meta.lockedAt) > now - LIVE_LEASE_MS || (typeof isLive === 'function' && isLive(doc, now))) continue;
    const at = new Date(now).toISOString();
    const result = await model.updateOne({ [idKey]: doc[idKey], userId: doc.userId, status: doc.status, updatedAt: doc.updatedAt }, { $set: {
      status: 'generation_failed', 'llmMeta.lockedAt': null, 'llmMeta.lockToken': '', 'llmMeta.refundEligibleAt': at,
      'llmMeta.retryable.refundReason': 'RETRY_WINDOW_EXPIRED',
      generationError: { code: 'RETRY_WINDOW_EXPIRED', message: 'retry window expired before delivery', at } } });
    if (!result?.modifiedCount) continue;
    expired += 1;
    // 기한으로 닫힌 건의 후속 정리(붙잡아 둔 claim 해제). 실패해도 환불 정산은 막지 않는다.
    if (typeof onExpired === 'function') await Promise.resolve().then(() => onExpired(doc)).catch(() => null);
  }
  return { expired };
}
