/**
 * PortOne webhook 수신. **서명 검증 → 중복 예약 → 확정 위임.**
 *
 * ## webhook 은 확정의 '두 번째 경로'가 아니라 같은 경로다
 *
 * 구 코드는 클라 확정과 webhook 확정이 서로 다른 함수를 탔고, 그래서 한쪽에만 고쳐진 정책이
 * 다른 쪽에 없는 상태가 생겼다. 여기서는 webhook 이 하는 일이 **주문 id 를 뽑아 confirmOrder 에
 * 넘기는 것뿐**이다. 확정 로직은 orders.js 한 곳에만 있다.
 *
 * ## 멱등성은 unique 인덱스가 보장한다
 *
 * {provider, eventId} unique 가 프로덕션에 실제로 존재함을 확인했다(2026-08-11 실측). 그래서
 * "예약 → 처리 → 표시" 순서면 같은 이벤트가 두 번 처리되지 않는다. 예약에 실패(E11000)하면
 * 이미 누군가 처리했거나 처리 중이라는 뜻이다.
 *
 * 다만 **처리 중이던 아이솔레이트가 죽는 경우**가 있어서 무조건 거절하면 그 이벤트는 영영 안 된다.
 * 그래서 2분보다 오래된 processing 은 재점유한다. PortOne 이 재전송을 계속하므로 그 창이 복구 경로다.
 *
 * ## 🔴 2xx 를 준 것만 processed 로 표시한다
 *
 * 실패했는데 200 을 주면 PortOne 이 재전송을 멈춰 그 결제는 영영 미확정으로 남는다. 반대로 실패에
 * non-2xx 를 주면 PortOne 이 다시 보내 주고, 그게 우리의 재시도 장치다 — 우리가 재시도 루프를
 * 만들 필요가 없는 이유이기도 하다.
 */
import { PaymentWebhookEvent } from "../lib/models.js";
import { getPortOneWebhookSecret } from "../lib/portone.js";
import { paymentError } from "./errors.js";

/** 이 시간보다 오래된 processing 은 죽은 것으로 보고 재점유한다. */
export const WEBHOOK_STALE_PROCESSING_MS = 2 * 60_000;

function timingSafeEqualText(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* 🔴 Standard Webhooks 의 webhook-signature 는 **공백으로 구분된** `v1,<base64>` 목록이다.
   키 로테이션 중에는 옛 키·새 키 서명이 함께 와 `v1,AAA v1,BBB` 가 된다. 쉼표로 먼저 자르면
   ["v1", "AAA v1", "BBB"] 로 부서져 앞 서명이 "AAA v1" 이라는 쓰레기가 되고, 유효한 서명인데도
   검증이 실패한다 — 로테이션 창에서 webhook 전량 거부(=지급 정지)가 나는 실제 장애였다.
   서명이 하나뿐인 평시에는 우연히 동작해서 눈에 안 띈다. 이 순서를 바꾸지 말 것. */
function parseSignatures(headerValue) {
  return String(headerValue || "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    // 표준은 `v1,` 이고 일부 구현이 `v1=`/`v1:` 를 쓴다. 구분자를 요구하므로
    // "v1" 로 시작하는 base64 서명 자체(v1abc…)는 잘리지 않는다.
    .map((part) => part.replace(/^v1[,=:]\s*/i, "").trim())
    .filter(Boolean);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// 시크릿은 `whsec_` 접두 base64 이거나 평문이다. 둘 다 받는다.
function secretBytes(secret) {
  const value = String(secret || "").trim();
  if (value.startsWith("whsec_")) {
    try { return base64ToBytes(value.slice("whsec_".length)); } catch { /* 평문으로 폴백 */ }
  }
  return new TextEncoder().encode(value);
}

export async function signWebhookPayload(secret, webhookId, timestamp, rawBody) {
  const key = await crypto.subtle.importKey(
    "raw", secretBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signed = `${webhookId}.${timestamp}.${rawBody}`;
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  return bytesToBase64(new Uint8Array(signature));
}

export async function verifyWebhookSignature(secret, rawBody, headers) {
  const webhookId = String(headers.get("webhook-id") || headers.get("x-webhook-id") || "").trim();
  const timestamp = String(headers.get("webhook-timestamp") || headers.get("x-webhook-timestamp") || "").trim();
  const header = String(headers.get("webhook-signature") || headers.get("x-webhook-signature") || "").trim();
  if (!webhookId || !timestamp || !header) return false;

  const expected = await signWebhookPayload(secret, webhookId, timestamp, rawBody);
  return parseSignatures(header).some((signature) => timingSafeEqualText(signature, expected));
}

/** 이벤트 신원. PortOne 은 webhook-id 헤더를 주고, 없으면 본문에서 뽑는다. */
export function resolveEventId(headers, body) {
  return String(
    headers.get("webhook-id")
      || headers.get("x-webhook-id")
      || body?.id
      || `${body?.type || "unknown"}:${body?.data?.paymentId || body?.paymentId || ""}`,
  ).trim().slice(0, 180);
}

export function resolvePaymentId(body) {
  return String(body?.data?.paymentId || body?.paymentId || body?.payment_id || "").trim();
}

/**
 * 이벤트를 점유한다.
 * @returns {{ claimed: boolean, duplicate: boolean }}
 *   duplicate=true 면 이미 처리됐거나 살아 있는 형제가 처리 중이다 → 200 으로 조용히 끝낸다
 *   (PortOne 에 재전송을 요구할 이유가 없다).
 */
export async function reserveEvent(db, { eventId, eventType, paymentId, now = new Date(), payload = null }) {
  try {
    await db.insertOne(PaymentWebhookEvent, {
      provider: "portone",
      eventId,
      eventType: String(eventType || "unknown").slice(0, 120),
      paymentId: String(paymentId || "").slice(0, 180),
      status: "processing",
      attempts: 1,
      receivedAt: now,
      lastAttemptAt: now,
      processedAt: null,
      lastError: "",
      payload,
      createdAt: now,
      updatedAt: now,
    });
    return { claimed: true, duplicate: false };
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
  }

  /* 이미 있다. 살아 있는 처리인지 죽은 처리인지는 마지막 시도 시각이 말해 준다.
     processed 는 재점유하지 않는다 — 성공한 처리를 다시 도는 것이 곧 중복 지급이다. */
  const staleBefore = new Date(now.getTime() - WEBHOOK_STALE_PROCESSING_MS);
  const reclaimed = await db.updateOne(
    PaymentWebhookEvent,
    {
      provider: "portone",
      eventId,
      status: { $in: ["processing", "failed"] },
      lastAttemptAt: { $lt: staleBefore },
    },
    { $set: { status: "processing", lastAttemptAt: now, updatedAt: now }, $inc: { attempts: 1 } },
  );
  const claimed = Number(reclaimed?.modifiedCount || 0) === 1;
  return { claimed, duplicate: !claimed };
}

export async function markEventProcessed(db, { eventId, now = new Date() }) {
  await db.updateOne(
    PaymentWebhookEvent,
    { provider: "portone", eventId },
    { $set: { status: "processed", processedAt: now, lastError: "", updatedAt: now } },
  );
}

export async function markEventFailed(db, { eventId, reason, now = new Date() }) {
  await db.updateOne(
    PaymentWebhookEvent,
    { provider: "portone", eventId },
    { $set: { status: "failed", lastError: String(reason || "").slice(0, 500), lastAttemptAt: now, updatedAt: now } },
  );
}

/**
 * 서명을 검증하고 이벤트를 점유한다. 실제 확정은 호출부가 confirmOrder 로 이어 간다 —
 * 이 파일은 확정 로직을 갖지 않는다(주체별 분기가 생기는 자리를 아예 만들지 않는다).
 */
export async function acceptWebhook(env, db, { rawBody, headers, now = new Date() }) {
  const secret = getPortOneWebhookSecret(env);
  if (!secret) {
    /* 설정 누락은 재시도로 고쳐지지 않는다. 503 을 주면 PortOne 이 영원히 재전송한다 —
       구 코드가 그랬다(payments.js:3332). 500 으로 명확히 실패시킨다. */
    throw paymentError("PG_NOT_CONFIGURED", "Webhook 검증이 설정되지 않았습니다.");
  }
  if (!(await verifyWebhookSignature(secret, rawBody, headers))) {
    throw paymentError("WEBHOOK_SIGNATURE_INVALID", "Webhook 서명이 올바르지 않습니다.");
  }

  let body = null;
  try { body = JSON.parse(rawBody); } catch { body = null; }
  if (!body) throw paymentError("INVALID_REQUEST", "Webhook 본문을 해석할 수 없습니다.");

  const eventId = resolveEventId(headers, body);
  const paymentId = resolvePaymentId(body);
  const eventType = String(body?.type || "").trim();

  const reservation = await reserveEvent(db, { eventId, eventType, paymentId, now, payload: body });
  return { ...reservation, eventId, eventType, paymentId, body };
}

export const __webhookTestUtils = { parseSignatures, secretBytes, timingSafeEqualText };
