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

/**
 * 서명된 webhook-timestamp 를 이보다 오래되면 거절한다.
 *
 * 🔴 **Standard Webhooks 참조구현의 5분을 쓰면 안 된다.** PortOne 은 실패한 webhook 을
 *    0 → 1 → 4 → 16 → 64 → 256분 backoff(+jitter)로 최대 5회 재전송한다 — 첫 발송에서
 *    마지막 재전송까지 약 5시간 41분이다(developers.portone.io 웹훅 문서, 2026-08-28 확인).
 *    그리고 **재전송이 헤더 타임스탬프를 갱신하는지 첫 발송 값으로 고정하는지는 문서에 없다**
 *    (문서가 "재시도에도 동일하게 유지된다"고 말하는 것은 본문의 RFC 3339 `timestamp` 필드이지
 *    이 헤더가 아니다 — 그 둘을 같은 것으로 읽어 5분을 잡으면 **모든 재전송이 거부**되고,
 *    재전송은 이 레포에서 결제 확정의 유일한 복구 경로다). 고정이더라도 마지막 재전송이
 *    통과하도록 그 지평의 네 배를 잡는다.
 */
export const WEBHOOK_TIMESTAMP_MAX_AGE_MS = 24 * 60 * 60_000;

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

/** 헤더 이름 폴백을 한 곳에만 둔다 — 사본을 만들면 한쪽만 고쳐져 서명 입력과 신선도 판정이 갈린다. */
export function readWebhookTimestamp(headers) {
  return String(headers.get("webhook-timestamp") || headers.get("x-webhook-timestamp") || "").trim();
}

/**
 * 서명된 타임스탬프가 허용 범위를 넘겨 오래됐는가.
 *
 * 🔴 **서명 검증을 통과한 뒤에만 부른다.** 그래야 여기서 보는 값이 PortOne 이 서명한 값임이
 *    보장된다. 서명 전에 보면 공격자가 채워 넣은 숫자를 판정하게 되어 아무것도 막지 못한다.
 *
 * 🔴 **판정할 수 없는 값은 통과시킨다.** 이 검사는 replay 방어의 **두 번째** 층이다 —
 *    첫 층인 {provider, eventId} unique 는 TTL 이 없어 영구적이고(models.js:541), 같은
 *    이벤트의 재처리를 이미 완전히 막는다. 반면 형식을 잘못 읽으면 대가가 **webhook 전량
 *    거부 = 결제 확정 정지**다. 그래서 미래 방향은 아예 보지 않고(포획된 요청의 타임스탬프는
 *    언제나 과거다) 초 단위가 아닌 값도 막지 않는다 — 밀리초 값이 오면 아득한 미래가 되어
 *    자연히 통과하고, 숫자가 아니면 판정을 포기한다.
 */
export function isWebhookTimestampStale(timestamp, now = new Date()) {
  const seconds = Number(String(timestamp || "").trim());
  if (!Number.isFinite(seconds)) return false;
  return now.getTime() - seconds * 1000 > WEBHOOK_TIMESTAMP_MAX_AGE_MS;
}

export async function verifyWebhookSignature(secret, rawBody, headers) {
  const webhookId = String(headers.get("webhook-id") || headers.get("x-webhook-id") || "").trim();
  const timestamp = readWebhookTimestamp(headers);
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
 * @returns {{ claimed: boolean, duplicate: boolean, busy: boolean }}
 *   duplicate=true 는 **이미 처리 완료(processed)** 된 이벤트다 → 200 으로 조용히 끝낸다.
 *   busy=true 는 살아 있는 형제가 아직 처리 중이다 → 409 로 돌려 PortOne 재전송을 살려 둔다.
 *   (형제가 결국 실패하면 그 재전송이 유일한 복구 장치다 — 200 을 주면 사다리가 끊긴다.)
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
    return { claimed: true, duplicate: false, busy: false };
  } catch (error) {
    if (Number(error?.code) !== 11000) throw error;
  }

  /* 이미 있다. failed 는 즉시 재점유한다(재전송이 곧 재시도). processing 은 살아 있는지 죽었는지를
     마지막 시도 시각이 말해 준다. processed 는 재점유하지 않는다 — 성공한 처리를 다시 도는 것이 곧 중복 지급이다. */
  const staleBefore = new Date(now.getTime() - WEBHOOK_STALE_PROCESSING_MS);
  const reclaimed = await db.updateOne(
    PaymentWebhookEvent,
    {
      provider: "portone",
      eventId,
      $or: [
        { status: "processing", lastAttemptAt: { $lt: staleBefore } },
        { status: "failed" },
      ],
    },
    { $set: { status: "processing", lastAttemptAt: now, updatedAt: now }, $inc: { attempts: 1 } },
  );
  const claimed = Number(reclaimed?.modifiedCount || 0) === 1;
  if (claimed) return { claimed: true, duplicate: false, busy: false };

  const existing = await db.findOne(PaymentWebhookEvent, { provider: "portone", eventId });
  const processed = String(existing?.status || "") === "processed";
  return { claimed: false, duplicate: processed, busy: !processed };
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
 * lastError 에 남길 한 줄. 🔴 error.message 만 남기면 PG_UNAVAILABLE 의 사용자 문구("결제사 응답이
 * 지연되고 있습니다…")만 남고 PortOne 이 실제로 뭐라 했는지(meta.reason — 예: UNAUTHORIZED)가
 * 사라진다. 2026-09-05 프로덕션에서 시크릿 불일치가 이 문구 뒤에 숨어 하루를 잃었다.
 */
export function describeEventFailure(error) {
  const code = String(error?.code || error?.name || "").trim();
  const message = String(error?.message || error || "").trim();
  const reason = String(error?.meta?.reason || "").trim();
  return [code && code !== message ? `${code}: ${message}` : message, reason ? `(${reason})` : ""].filter(Boolean).join(" ");
}

/**
 * 재생 대상 — 실패했거나(failed) 처리 중 죽은(processing 이 WEBHOOK_STALE_PROCESSING_MS 넘게 정체)
 * Transaction.Paid 이벤트를 고르고 **원자적으로 재점유**한다. 조회 시점의 status·lastAttemptAt 를
 * CAS 조건으로 걸어 동시 크론·늦게 온 PortOne 재전송이 같은 이벤트를 두 번 잡지 않는다.
 * attempts 상한을 넘긴 이벤트는 두지 않는다 — 열 번 실패한 결제는 사람이 봐야 한다(/admin/orders).
 * @returns {Promise<{ claimed: object[], contended: number }>}
 */
export async function claimReplayableEvents(db, { now = new Date(), limit = 10, maxAttempts = 10 } = {}) {
  const staleBefore = new Date(now.getTime() - WEBHOOK_STALE_PROCESSING_MS);
  const candidates = await db.find(PaymentWebhookEvent, {
    provider: "portone",
    eventType: "Transaction.Paid",
    attempts: { $lt: maxAttempts },
    $or: [
      { status: "failed" },
      { status: "processing", lastAttemptAt: { $lt: staleBefore } },
    ],
  }, { sort: { lastAttemptAt: 1 }, limit });

  const claimed = [];
  let contended = 0;
  for (const candidate of candidates) {
    const result = await db.updateOne(
      PaymentWebhookEvent,
      { provider: "portone", eventId: candidate.eventId, status: candidate.status, lastAttemptAt: candidate.lastAttemptAt },
      { $set: { status: "processing", lastAttemptAt: now, updatedAt: now }, $inc: { attempts: 1 } },
    );
    if (Number(result?.modifiedCount || 0) === 1) claimed.push(candidate);
    else contended += 1;
  }
  return { claimed, contended };
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
  /* 서명이 통과했으므로 이 타임스탬프는 PortOne 이 서명한 값이다. 순서를 뒤집지 말 것. */
  if (isWebhookTimestampStale(readWebhookTimestamp(headers), now)) {
    throw paymentError("WEBHOOK_TIMESTAMP_STALE", "Webhook 타임스탬프가 허용 범위를 벗어났습니다.");
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
