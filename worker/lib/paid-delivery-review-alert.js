// 2026-11-28 S5: 자동 환불이 닿지 않는 유료 전달 실패를 운영자에게 알린다(알림만, 쓰기는 표식뿐).
// 대상은 자동 경로가 끝났지만 사람이 처리해야 하는 두 종류다.
//  1) 서술형 실행 원장(ServiceExecutionTransaction)의 보류: paid-narrative-retry.js 의 hold()·refund_failed 가
//     metadata.paidNarrativeRetry.alertPending 을 세운다. 보류되면 reasonCode 가 정산 대상 밖으로 바뀌어
//     예전에는 아무도 다시 읽지 않았다. 토스 서사는 결제 근거가 없어 7일 시점에 전부 여기로 온다.
//  2) 공용 상담 문서(SERVICES)의 수동 검토: 토스 인앱결제(파트너 환불 API 없음 — 환불은 고객이 토스 앱에서
//     요청하고 파트너가 콘솔에서 승인)와 *_REVIEW 코드로 manual_review 가 된 문서.
// 🔴 알림에는 내부 식별자 앞 12자·기능 키·코드·날짜만 넣는다. userId·이메일·생년월일·상담 내용은 넣지 않는다.
// 표식은 전달 성공 뒤에만 읽은 값 CAS 로 내린다(yeongnyangi hold.alertPending, reconcile.js 알림과 같은 방식).
import { connectDb, withMongoRetry } from "./db.js";
import { ServiceExecutionTransaction, NewYearAiConsultation, LifeBookAiConsultation, SajuCompatPremiumConsultation,
  FusionFortuneConsultation } from "./models.js";

const CONSULTATION_MODELS = Object.freeze({ "new-year-ai": NewYearAiConsultation, "life-book-ai": LifeBookAiConsultation,
  "saju-compat-premium": SajuCompatPremiumConsultation, "fusion-fortune": FusionFortuneConsultation });

const short = value => String(value ?? "").slice(0, 12);
const code = value => String(value ?? "").replace(/[^A-Za-z0-9_:-]/g, "").slice(0, 60) || "-";
const day = value => { const t = new Date(value ?? NaN); return Number.isFinite(t.getTime()) ? t.toISOString().slice(0, 10) : "-"; };

export const heldNarrativeFilter = () => ({ "metadata.paidNarrativeRetry.alertPending": true });
export const consultationReviewFilter = () => ({ status: "generation_failed", "llmMeta.operatorAlertedAt": { $exists: false },
  $or: [{ accessSource: "toss", "llmMeta.refundEligibleAt": { $exists: true } }, { "llmMeta.deliveryRefund.status": "manual_review" }] });

function narrativeLine(doc) {
  const retry = doc.metadata?.paidNarrativeRetry || {}, toss = doc.metadata?.tossPaidNarrative === true;
  const cause = retry.refundFailedAt ? "REFUND_FAILED" : code(retry.holdCode || doc.reasonCode);
  const hint = toss ? "토스 콘솔 환불 요청 승인·고객 안내" : retry.refundFailedAt ? "PG·이용권 환불 수동 확인" : "결제 근거 수동 확인";
  return `- 서사 ${short(doc._id)} ${code(doc.featureKey)} ${cause}${toss ? " [토스]" : ""} 생성 ${day(doc.createdAt)} → ${hint}`;
}
function consultationLine(service, doc) {
  const toss = doc.accessSource === "toss", cause = toss ? "TOSS_ORDER_REVIEW_REQUIRED" : code(doc.llmMeta?.deliveryRefund?.code || "MANUAL_REVIEW");
  return `- 상담 ${service} ${short(doc.id)} ${cause} 생성 ${day(doc.createdAt)} → ${toss ? "토스 콘솔 환불 요청 승인·고객 안내" : "환불 수동 확인"}`;
}

/** 10분 크론. notify 는 createOperatorAlertSender(env) 형태({delivered}). 미전달이면 표식을 그대로 두고 다음 주기에 다시 보낸다. */
export async function alertPaidDeliveryReviews(env, { notify, now = Date.now(), limit = 10,
  executionModel = ServiceExecutionTransaction, consultationModels = CONSULTATION_MODELS } = {}) {
  if (typeof notify !== "function") return { alerted: 0, reason: "no_notify" };
  const held = await withMongoRetry(env, () => executionModel.find(heldNarrativeFilter()).sort({ createdAt: 1 }).limit(limit)
    .select("_id featureKey reasonCode createdAt metadata.tossPaidNarrative metadata.paidNarrativeRetry").lean());
  const reviews = [];
  for (const [service, model] of Object.entries(consultationModels)) {
    if (reviews.length >= limit) break;
    const docs = await withMongoRetry(env, () => model.find(consultationReviewFilter()).sort({ updatedAt: 1 }).limit(limit - reviews.length)
      .select("id userId accessSource createdAt llmMeta.deliveryRefund llmMeta.refundEligibleAt").lean());
    reviews.push(...docs.map(doc => ({ service, model, doc })));
  }
  if (!held.length && !reviews.length) return { alerted: 0 };
  const text = ["자동 환불이 닿지 않아 운영자 처리가 필요한 유료 전달 실패입니다(개인정보 제외).",
    ...held.map(narrativeLine), ...reviews.map(({ service, doc }) => consultationLine(service, doc))].join("\n");
  const sent = await notify({ subject: `[결제 전달] 운영자 처리 필요 ${held.length + reviews.length}건`, text });
  if (!sent?.delivered) return { alerted: 0, reason: sent?.reason || "not_delivered" };
  const at = new Date(now);
  for (const doc of held) {
    await withMongoRetry(env, () => executionModel.updateOne({ _id: doc._id, "metadata.paidNarrativeRetry.alertPending": true },
      { $set: { "metadata.paidNarrativeRetry.alertPending": false, "metadata.paidNarrativeRetry.alertedAt": at } }), { retries: 0 });
  }
  for (const { model, doc } of reviews) {
    await withMongoRetry(env, () => model.updateOne({ id: doc.id, userId: doc.userId, "llmMeta.operatorAlertedAt": { $exists: false } },
      { $set: { "llmMeta.operatorAlertedAt": at } }), { retries: 0 });
  }
  return { alerted: held.length + reviews.length };
}

export async function runPaidDeliveryReviewAlertTask(env, { connect, notify } = {}) {
  await (connect || connectDb)(env);
  const sender = notify || (await import("../payments/fulfillment-alert.js")).createOperatorAlertSender(env);
  return alertPaidDeliveryReviews(env, { notify: sender });
}
