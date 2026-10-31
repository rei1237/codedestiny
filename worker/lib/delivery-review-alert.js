import { connectDb, withMongoRetry } from './db.js';
import { FusionFortuneConsultation, MasterLoveCodexSession, ServiceExecutionTransaction, ZiweiDeepReport } from './models.js';
import { sendOperatorAlert } from './ops-alert.js';
import { maskId } from '../payments/log.js';
import { formatElapsed, token } from '../payments/fulfillment-alert.js';

/**
 * 결제가 끝났는데 결과가 아직 전달되지 않고 "검토 필요"로 멈춘 건을 운영자에게 알린다(10분 크론).
 * 알림뿐이다 — 환불·복원·재생성은 하지 않고, 고객 결과 필드(result·chapters·parts·생년 정보)는 읽지도 쓰지도 않는다.
 *
 *   초융합   비카드 주문(llmMeta.refundSkipped)이거나 검토 필요(generationSnapshot.recovery.reviewRequired)인데 환불 시각이 없는 건
 *   서사형   metadata.paidNarrativeRecovery.reviewRequired (ServiceExecutionTransaction, 아직 pending)
 *   자미두수 llmMeta.recovery.reviewRequired (예산 소진 분기만 이 표식을 쓴다)
 *   유료 의도 metadata.paidIntent.reviewRequired (ServiceExecutionTransaction, 아직 awaiting_payment — 결제 확인 뒤 승격이 3회 실패해 멈춘 건)
 *   코덱스   deliveryMeta.reviewRequired (MasterLoveCodexSession, generation_failed — 시도를 소진해 닫힌 건)
 *
 * 모든 종류가 전달 전 상태(아직 completed·환불 쪽으로 넘어가지 않은 건)만 본다 — 전달된 건을 검토 대기로 알리지 않는다.
 * 🔴 표식(reviewAlertAt)은 **전달 성공 뒤에만** 찍는다. 실패하면 표식이 없어 다음 틱이 다시 보낸다.
 *    표식 쓰기는 문서 키 + 표식 경로 $exists:false 의 CAS 이고 { timestamps: false } 라 updatedAt 도 건드리지 않는다.
 * 🔴 본문에는 종류·식별자 뒤 8자·상품 키·사유 코드·경과 시간만 싣는다(userId·이메일·생년·결과 본문 금지).
 */

const LOOKBACK_MS = 30 * 24 * 60 * 60_000;
/** 초융합·자미두수의 "아직 전달되지 않은" 상태(fusion-fortune-recovery-task.js OPEN_STATUSES 와 같다). */
const OPEN_STATUSES = ['partial', 'generating', 'delivery_pending'];
/** Discord 웹훅 한도(1900자) 안 — payments/fulfillment-alert.js PAYMENT_ALERT_TEXT_LIMIT 와 같다. */
const TEXT_LIMIT = 1900;
const FOOTER_RESERVE = 40;
const DEFAULT_LIMIT = 20;

const FUSION_PRODUCT = 'fusion-fortune-consultation';
const ZIWEI_PRODUCT = 'ziwei-deep-pdf';
const CODEX_PRODUCT = 'master-love-codex';

const row = (kind, id, product, code, since, now) => [
  kind, maskId(id) || '식별자 없음', token(product, 60) || '-', token(code, 80) || '-', `검토 대기 ${formatElapsed(since, now)}`,
].join(' · ');

const KINDS = [
  {
    key: 'fusion',
    find: (env, since, limit) => withMongoRetry(env, () => FusionFortuneConsultation.find({
      status: { $in: OPEN_STATUSES }, createdAt: { $gte: since }, 'llmMeta.reviewAlertAt': { $exists: false },
      $or: [
        { 'llmMeta.refundSkipped': 'not_card_order' },
        { 'generationSnapshot.recovery.reviewRequired': true, 'llmMeta.refundEligibleAt': { $exists: false } },
      ],
    }).sort({ createdAt: 1 }).limit(limit).select('_id createdAt featureKey llmMeta.refundSkipped').lean()),
    // 🔴 llmMeta 는 모델 기본값이 null 이고(recovery 가 generationSnapshot 만 채우는 건은 계속 null), null 부모에는 점 표기 $set 이
    //    던진다. 그래서 null/없음 CAS 를 먼저 건다(null 을 객체로 바꾸는 것뿐이라 고객 데이터를 덮지 않는다).
    //    걸리는 문서가 없으면(= 객체 부모) 기존 점 표기 CAS 로 간다.
    mark: async (env, id, at) => {
      const bare = await withMongoRetry(env, () => FusionFortuneConsultation.updateOne(
        { _id: id, llmMeta: null }, { $set: { llmMeta: { reviewAlertAt: at } } }, { timestamps: false },
      ), { retries: 0 });
      if (Number(bare?.modifiedCount || 0) > 0) return bare;
      return withMongoRetry(env, () => FusionFortuneConsultation.updateOne(
        { _id: id, 'llmMeta.reviewAlertAt': { $exists: false } }, { $set: { 'llmMeta.reviewAlertAt': at } }, { timestamps: false },
      ), { retries: 0 });
    },
    render: (doc, now) => row('초융합', doc._id, doc.featureKey || FUSION_PRODUCT, doc.llmMeta?.refundSkipped || 'REVIEW_REQUIRED', doc.createdAt, now),
  },
  {
    key: 'narrative',
    find: (env, since, limit) => withMongoRetry(env, () => ServiceExecutionTransaction.find({
      status: 'pending', createdAt: { $gte: since }, 'metadata.paidNarrativeRecovery.reviewRequired': true,
      'metadata.paidNarrativeRecovery.reviewAlertAt': { $exists: false },
    }).sort({ createdAt: 1 }).limit(limit).select('_id createdAt executionKey featureKey serviceId metadata.paidNarrativeRecovery.code').lean()),
    mark: (env, id, at) => withMongoRetry(env, () => ServiceExecutionTransaction.updateOne(
      { _id: id, 'metadata.paidNarrativeRecovery.reviewAlertAt': { $exists: false } },
      { $set: { 'metadata.paidNarrativeRecovery.reviewAlertAt': at } }, { timestamps: false },
    ), { retries: 0 }),
    render: (doc, now) => row('서사형', doc.executionKey || doc._id, doc.serviceId || doc.featureKey, doc.metadata?.paidNarrativeRecovery?.code, doc.createdAt, now),
  },
  {
    key: 'ziwei',
    find: (env, since, limit) => withMongoRetry(env, () => ZiweiDeepReport.find({
      status: { $in: OPEN_STATUSES }, createdAt: { $gte: since }, 'llmMeta.recovery.reviewRequired': true,
      'llmMeta.recovery.reviewAlertAt': { $exists: false },
    }).sort({ createdAt: 1 }).limit(limit).select('_id id createdAt').lean()),
    mark: (env, id, at) => withMongoRetry(env, () => ZiweiDeepReport.updateOne(
      { _id: id, 'llmMeta.recovery.reviewAlertAt': { $exists: false } },
      { $set: { 'llmMeta.recovery.reviewAlertAt': at } }, { timestamps: false },
    ), { retries: 0 }),
    render: (doc, now) => row('자미두수', doc.id || doc._id, ZIWEI_PRODUCT, 'BUDGET_EXHAUSTED', doc.createdAt, now),
  },
  {
    // 🔴 의도 문서의 metadata.paidIntent.body 에는 고객이 낸 요청 본문이 들어 있다 — select 에 넣지 않는다.
    key: 'paidIntent',
    find: (env, since, limit) => withMongoRetry(env, () => ServiceExecutionTransaction.find({
      status: 'awaiting_payment', createdAt: { $gte: since }, 'metadata.paidIntent.reviewRequired': true,
      'metadata.paidIntent.reviewAlertAt': { $exists: false },
    }).sort({ createdAt: 1 }).limit(limit).select('_id createdAt executionKey featureKey metadata.paidIntent.code').lean()),
    // 보내는 사이 승격돼 문서가 사라졌거나 상태가 바뀌었으면 매칭되지 않는다(표식을 새 문서에 남기지 않는다).
    mark: (env, id, at) => withMongoRetry(env, () => ServiceExecutionTransaction.updateOne(
      { _id: id, status: 'awaiting_payment', 'metadata.paidIntent.reviewAlertAt': { $exists: false } },
      { $set: { 'metadata.paidIntent.reviewAlertAt': at } }, { timestamps: false },
    ), { retries: 0 }),
    render: (doc, now) => row('유료 의도', doc.executionKey || doc._id, doc.featureKey, doc.metadata?.paidIntent?.code || 'REVIEW_REQUIRED', doc.createdAt, now),
  },
  {
    key: 'codex',
    find: (env, since, limit) => withMongoRetry(env, () => MasterLoveCodexSession.find({
      status: 'generation_failed', createdAt: { $gte: since }, 'deliveryMeta.reviewRequired': true,
      'deliveryMeta.reviewAlertAt': { $exists: false },
    }).sort({ createdAt: 1 }).limit(limit).select('_id id createdAt mode deliveryMeta.reviewReason generationError.code').lean()),
    // 크론이 세션을 다시 열면(status generating, reviewRequired false) 표식을 남기지 않는다 — 다시 닫히면 새로 알린다.
    // deliveryMeta 는 reviewRequired 가 참인 문서에서만 오므로 객체 부모다(null 부모 CAS 불필요).
    mark: (env, id, at) => withMongoRetry(env, () => MasterLoveCodexSession.updateOne(
      { _id: id, status: 'generation_failed', 'deliveryMeta.reviewRequired': true, 'deliveryMeta.reviewAlertAt': { $exists: false } },
      { $set: { 'deliveryMeta.reviewAlertAt': at } }, { timestamps: false },
    ), { retries: 0 }),
    render: (doc, now) => row('코덱스', doc.id || doc._id, doc.mode === 'compat' ? `${CODEX_PRODUCT}-compat` : CODEX_PRODUCT,
      doc.deliveryMeta?.reviewReason || doc.generationError?.code || 'REVIEW_REQUIRED', doc.createdAt, now),
  },
];

function buildMessage(found, now) {
  const total = found.reduce((sum, { docs }) => sum + docs.length, 0);
  const subject = `[유료 결과] 전달 검토 대기 ${total}건`;
  const lines = [subject, '결제는 끝났으나 결과가 전달되지 않고 검토 필요로 멈춘 건입니다. 환불·복원은 자동으로 하지 않았습니다.'];
  let length = lines.join('\n').length;
  let omitted = 0;
  const included = new Map(found.map(({ kind }) => [kind.key, []]));
  for (const { kind, docs } of found) {
    for (const doc of docs) {
      const text = `- ${kind.render(doc, now)}`;
      if (length + text.length + 1 + FOOTER_RESERVE > TEXT_LIMIT) { omitted += 1; continue; }
      lines.push(text);
      length += text.length + 1;
      included.get(kind.key).push(doc);
    }
  }
  if (omitted > 0) lines.push(`(외 ${omitted}건은 다음 알림)`);
  return { message: { subject, text: lines.join('\n') }, included };
}

const notifyOperatorsLazily = async (env, message) => (await import('./feedback-notify.js')).notifyOperators(env, message);

/**
 * @param {object} env
 * @param {{ now?: Date, send?: Function, limit?: number }} [options] send — (env, message) => Promise<{results}>, 기본은 운영자 채널
 * @returns {Promise<{ found: number, delivered: boolean, marked: number }>}
 */
export async function alertDeliveryReviews(env, { now = new Date(), send = notifyOperatorsLazily, limit = DEFAULT_LIMIT } = {}) {
  await connectDb(env);
  const since = new Date(now.getTime() - LOOKBACK_MS);
  const found = [];
  for (const kind of KINDS) {
    found.push({ kind, docs: await kind.find(env, since, limit) });
  }
  const summary = { found: found.reduce((sum, { docs }) => sum + docs.length, 0), delivered: false, marked: 0 };
  if (summary.found === 0) return summary;

  const { message, included } = buildMessage(found, now);
  summary.delivered = (await sendOperatorAlert(env, send, message)) === true;
  if (!summary.delivered) return summary;

  // 🔴 한 건의 표식 쓰기가 던져도 나머지 건은 계속 찍는다(안 그러면 뒤 건이 10분마다 재알림된다). 실패한 건은 marked 에
  //    세지 않고, 루프가 끝난 뒤 첫 오류를 다시 던져 Task 5 크론 실패 알림이 보게 한다. 성공 경로의 반환 계약은 그대로다.
  let markError = null;
  for (const { kind } of found) {
    for (const doc of included.get(kind.key)) {
      try {
        const result = await kind.mark(env, doc._id, now);
        summary.marked += Number(result?.modifiedCount || 0);
      } catch (error) {
        markError ||= error;
      }
    }
  }
  if (markError) throw markError;
  return summary;
}
