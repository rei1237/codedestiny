/**
 * 결제 후 미이행·PG 대조 실패 운영자 알림 — 본문 빌더와 발송기(해외카드 1단계 C7).
 *
 * 크론(index.js runPaymentsV2Reconcile → reconcile.js alertPaymentAnomalies)이 부른다. 알림뿐이다 —
 * 지급·환불은 하지 않는다.
 *
 * 🔴 채널은 운영자 전용(worker/lib/feedback-notify.js notifyOperators: 관리자 메일·Discord·Slack 웹훅)뿐이다.
 *    봇 메신저 헬퍼는 대화방을 안 주면 공개 대화방으로 폴백하므로 이 모듈은 그 헬퍼를 import 하지 않는다
 *    (__tests__/worker/payments-v2.fulfillment-alert.test.js 가 소스와 fetch 0회로 고정).
 * 🔴 본문에 userId·이메일·전화·rawPortOne 을 싣지 않는다. 주문번호는 뒤 8자(log.js maskId)만.
 */
import { maskId } from "./log.js";

/** Discord 웹훅 한도(feedback-notify.js WEBHOOK_CHANNELS 1900자) 안. Slack(3000자)·메일은 그보다 넉넉하다. */
export const PAYMENT_ALERT_TEXT_LIMIT = 1900;
/** 섹션(미지급·대조 실패)마다 한 번에 싣는 최대 건수. reconcile.js 조회 limit 과 같다. */
export const PAYMENT_ALERT_SECTION_LIMIT = 20;
/** 발송을 기다리는 상한. 넘으면 실패로 세고 표식을 남기지 않는다 — 다음 틱이 다시 보낸다. */
export const PAYMENT_ALERT_SEND_TIMEOUT_MS = 5_000;

/* 잘린 건수 안내가 들어갈 자리. 본문이 한도에 닿아도 안내 줄까지 한도 안에 들어가게 남겨 둔다. */
const FOOTER_RESERVE = 40;

function token(value, max) {
  return String(value ?? "").replace(/[^A-Za-z0-9_.:-]/g, "").slice(0, max);
}

function formatElapsed(since, now) {
  const time = since instanceof Date ? since.getTime() : new Date(since).getTime();
  if (!Number.isFinite(time)) return "시각 없음";
  const minutes = Math.max(0, Math.floor((now.getTime() - time) / 60_000));
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 ${minutes % 60}분`;
  return `${Math.floor(hours / 24)}일 ${hours % 24}시간`;
}

function describeOrder(order) {
  return [
    maskId(order?.merchantUid) || "주문번호 없음",
    token(order?.featureKey || order?.productId, 60) || "-",
    token(order?.paymentType, 40) || "-",
    `${Number(order?.paymentAmount || 0).toLocaleString("ko-KR")}원`,
  ];
}

function unfulfilledRow(order, now) {
  const code = token(order?.metadata?.fulfillmentLastError, 40);
  return [
    ...describeOrder(order),
    `결제 후 ${formatElapsed(order?.paidAt, now)}`,
    `재지급 실패 ${Number(order?.metadata?.fulfillmentAttempts || 0)}회`,
    ...(code ? [code] : []),
  ].join(" · ");
}

function verifyFailureRow(order, now) {
  return [
    ...describeOrder(order),
    `실패 확정 후 ${formatElapsed(order?.updatedAt, now)}`,
    token(order?.failureCode, 40) || "-",
  ].join(" · ");
}

/**
 * 한 틱의 알림 메시지. included 는 본문에 실제로 실린 주문이다 — 표식은 이것만 찍어야 잘린 주문이
 * 다음 틱에 다시 실린다.
 */
export function buildPaymentAlert({ unfulfilled = [], verifyFailures = [], now = new Date() } = {}) {
  const subject = `[결제 알림] 미지급 ${unfulfilled.length}건 · PG 대조 실패 ${verifyFailures.length}건`;
  const sections = [
    { key: "unfulfilled", title: "■ 결제 완료·권한 미지급(30분+) — 크론이 재지급 중, 원인 확인 필요", orders: unfulfilled, render: unfulfilledRow },
    { key: "verifyFailures", title: "■ PG 대조 실패로 FAILED 확정 — 결제 취소·환불 여부 확인 필요", orders: verifyFailures, render: verifyFailureRow },
  ];
  const lines = [subject];
  let length = subject.length;
  let omitted = 0;
  const included = { unfulfilled: [], verifyFailures: [] };
  for (const section of sections) {
    const orders = section.orders.slice(0, PAYMENT_ALERT_SECTION_LIMIT);
    omitted += section.orders.length - orders.length;
    let titled = false;
    for (const order of orders) {
      const row = `- ${section.render(order, now)}`;
      const added = (titled ? 0 : section.title.length + 1) + row.length + 1;
      if (length + added + FOOTER_RESERVE > PAYMENT_ALERT_TEXT_LIMIT) { omitted += 1; continue; }
      if (!titled) { lines.push(section.title); titled = true; }
      lines.push(row);
      length += added;
      included[section.key].push(order);
    }
  }
  if (omitted > 0) lines.push(`(외 ${omitted}건은 다음 알림)`);
  return { subject, text: lines.join("\n"), included };
}

/* receipt-email.js withTimeout 과 같은 패턴. fetch 를 취소하지는 못하지만 크론 슬롯을 놓아 준다. */
function withTimeout(promise, ms) {
  if (!(ms > 0)) return promise;
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("payment_alert_timeout")), ms);
    }),
  ]);
}

/* 🔴 동적 import: feedback-notify.js 는 제보 모델 라벨까지 끌고 온다. 결제 요청 경로의 정적 그래프에 싣지 않고
   크론 틱에서만 읽는다(reconcile.js runPaymentReconcile 의 gift-models 선례). */
async function notifyOperatorsLazily(env, message) {
  const { notifyOperators } = await import("../lib/feedback-notify.js");
  return notifyOperators(env, message);
}

/**
 * alertPaymentAnomalies 의 notify. 전달 판정 = ok 이면서 skipped 아닌 채널이 하나 이상.
 * 채널 미설정이면 `[pay-alert] unconfigured` 경고만 남기고 미전달이다(표식 없음).
 */
export function createOperatorAlertSender(env, { send = notifyOperatorsLazily, timeoutMs = PAYMENT_ALERT_SEND_TIMEOUT_MS } = {}) {
  return async (message) => {
    let outcome;
    try {
      outcome = await withTimeout(Promise.resolve().then(() => send(env, message)), timeoutMs);
    } catch (error) {
      console.error("[pay-alert] send failed", { message: String(error?.message || error).slice(0, 120) });
      return { delivered: false, reason: "send_failed" };
    }
    if (outcome?.error === "unconfigured") {
      console.warn("[pay-alert] unconfigured");
      return { delivered: false, reason: "unconfigured" };
    }
    const results = Array.isArray(outcome?.results) ? outcome.results : [];
    const delivered = results.some((entry) => entry?.ok === true && !entry?.skipped);
    return { delivered, reason: delivered ? "" : "not_delivered" };
  };
}
