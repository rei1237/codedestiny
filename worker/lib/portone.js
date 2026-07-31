import { getEnv } from "./env.js";

const DEFAULT_PORTONE_BASE_URL = "https://api.portone.io";
const PORTONE_REQUIRED_ENV_KEYS = Object.freeze([
  "PORTONE_API_SECRET",
  "PORTONE_CHANNEL_KEY",
  "PORTONE_STORE_ID",
]);
const PORTONE_RECOMMENDED_ENV_KEYS = Object.freeze([
  "PORTONE_WEBHOOK_SECRET",
]);
const INICIS_REQUIRED_ENV_KEYS = Object.freeze([
  "MID",
  "INIsignkey",
  "INIAPIKEY",
  "INIAPI_IV",
]);

function getPortOneBaseUrl(env) {
  return getEnv(env, "PORTONE_API_BASE_URL", DEFAULT_PORTONE_BASE_URL).replace(/\/+$/, "");
}

function getPortOneTimeoutMs(env) {
  const value = Number(getEnv(env, "PORTONE_API_TIMEOUT_MS", "8000"));
  if (!Number.isFinite(value) || value <= 0) return 8000;
  return Math.min(Math.max(Math.floor(value), 1000), 30000);
}

function getExactEnv(env, key, fallback = "") {
  return getEnv(env, key, fallback);
}

function getExactEnvWithAlias(env, primaryKey, aliases = []) {
  const candidates = [primaryKey, ...aliases];
  for (const key of candidates) {
    const value = getExactEnv(env, key);
    if (value) return value;
  }
  return "";
}

function logMissingPortOneEnv(missingKeys) {
  if (!Array.isArray(missingKeys) || missingKeys.length === 0) return;
  console.error(`[portone-config] Missing required payment env: ${missingKeys.join(", ")}`);
}

export function getPortOneConfig(env) {
  const config = {
    portoneApiSecret: getExactEnvWithAlias(env, "PORTONE_API_SECRET", [
      "PORTONE_API_Secret",
      "PORTONE_API_SECRET_KEY",
      "PORTONE_V2_API_SECRET",
      "PORTONE_API_SECRET_V2",
      "PORTONE_SECRET",
    ]),
    portoneWebhookSecret: getExactEnvWithAlias(env, "PORTONE_WEBHOOK_SECRET", [
      "PORTONE_webhook",
      "PORTONE_WEBHOOK",
      "PORTONE_WEBHOOK_SECRET_KEY",
      "PORTONE_WEBHOOK_TOKEN",
      "PORTONE_webhook_Secret",
      "PORTONE_V2_WEBHOOK_SECRET",
    ]),
    portoneChannelKey: getExactEnvWithAlias(env, "PORTONE_CHANNEL_KEY", [
      "PORTONE_channel",
      "PORTONE_CHANNEL",
      "PORTONE_CHANNELKEY",
      "PORTONE_V2_CHANNEL_KEY",
    ]),
    portoneStoreId: getExactEnvWithAlias(env, "PORTONE_STORE_ID", [
      "PORTONE_Store",
      "PORTONE_STORE",
      "PORTONE_STOREID",
      "PORTONE_V2_STORE_ID",
    ]),
    inicisMid: getExactEnvWithAlias(env, "MID", [
      "INICISMID",
      "INIstoreId",
      "INI_STORE_ID",
      "INICIS_MID",
      "INICIS_STORE_ID",
    ]),
    inicisSignKey: getExactEnvWithAlias(env, "INIsignkey", [
      "INISIGNKEY",
      "INI_SIGNKEY",
      "INICIS_SIGNKEY",
      "INICIS_WEB_SIGNKEY",
    ]),
    inicisApiKey: getExactEnvWithAlias(env, "INIAPIKEY", [
      "INI_API_KEY",
      "INICIS_API_KEY",
    ]),
    inicisApiIv: getExactEnvWithAlias(env, "INIAPI_IV", [
      "INI_API_IV",
      "INICIS_API_IV",
    ]),
  };
  const missingPortOne = PORTONE_REQUIRED_ENV_KEYS.filter((key) => {
    if (key === "PORTONE_API_SECRET") return !config.portoneApiSecret;
    if (key === "PORTONE_WEBHOOK_SECRET") return !config.portoneWebhookSecret;
    if (key === "PORTONE_CHANNEL_KEY") return !config.portoneChannelKey;
    if (key === "PORTONE_STORE_ID") return !config.portoneStoreId;
    return false;
  });
  const missingRecommendedPortOne = PORTONE_RECOMMENDED_ENV_KEYS.filter((key) => {
    if (key === "PORTONE_WEBHOOK_SECRET") return !config.portoneWebhookSecret;
    return false;
  });
  const missingInicis = INICIS_REQUIRED_ENV_KEYS.filter((key) => {
    if (key === "MID") return !config.inicisMid;
    if (key === "INIsignkey") return !config.inicisSignKey;
    if (key === "INIAPIKEY") return !config.inicisApiKey;
    if (key === "INIAPI_IV") return !config.inicisApiIv;
    return false;
  });
  const missing = missingPortOne;
  const missingOptional = missingRecommendedPortOne.concat(missingInicis);
  logMissingPortOneEnv(missing);
  return {
    ...config,
    missing,
    missingRequired: missing,
    missingOptional,
    missingPortOne,
    missingRecommendedPortOne,
    missingInicis,
    configured: missing.length === 0,
  };
}

export function getPortOneWebhookSecret(env) {
  return getPortOneConfig(env).portoneWebhookSecret;
}

export function getPortOneWebhookUrl(env) {
  const configuredUrl = getExactEnvWithAlias(env, "PORTONE_webhook_URL", [
    "PORTONE_webhookurl",
    "PORTONE_WEBHOOK_URL",
    "PORTONE_WEBHOOKURL",
  ]);
  if (configuredUrl) return configuredUrl;

  const siteBaseUrl = getEnv(env, "SITE_BASE_URL", getEnv(env, "AUTH_FRONTEND_BASE_URL", "")).replace(/\/+$/, "");
  return siteBaseUrl ? `${siteBaseUrl}/api/webhooks/portone` : "";
}

function getPortOneHeaders(env, extraHeaders = {}) {
  const apiSecret = getPortOneConfig(env).portoneApiSecret;
  if (!apiSecret) {
    throw new Error("PORTONE_API_SECRET is required.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `PortOne ${apiSecret}`,
    ...extraHeaders,
  };
}

async function requestJson(url, options, errorPrefix) {
  const timeoutMs = getPortOneTimeoutMs(options?.env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const { env: _env, signal: _signal, ...fetchOptions } = options || {};
  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`${errorPrefix}: request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => null);
  // 자격증명 거절(401/403)을 기억해 이후 신규 주문 생성을 막는다.
  notePortOneAuthResult(response.status);

  if (!response.ok) {
    const remoteMessage = payload?.message || payload?.code || payload?.type || response.statusText;
    throw new Error(`${errorPrefix}: ${remoteMessage}`);
  }

  return payload;
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function toUnixSeconds(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (!Number.isFinite(time)) return undefined;
  return Math.floor(time / 1000);
}

function normalizePortOneStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "PAID" || normalized === "DONE" || normalized === "COMPLETED") return "paid";
  if (normalized === "CANCELLED" || normalized === "CANCELED" || normalized === "PARTIAL_CANCELLED") return "cancelled";
  if (normalized === "FAILED") return "failed";
  if (normalized === "READY" || normalized === "VIRTUAL_ACCOUNT_ISSUED") return "ready";
  return String(status || "").trim().toLowerCase();
}

function normalizePortOnePayment(payload, paymentIdHint = "") {
  const payment = payload?.payment || payload?.response || payload;
  if (!payment || typeof payment !== "object") return null;

  const paymentId = String(payment?.paymentId || payment?.id || paymentIdHint || "").trim();
  const amountNode = payment?.amount && typeof payment.amount === "object" ? payment.amount : {};
  const paidAt = payment?.paidAt || payment?.transaction?.paidAt || payment?.statusChangedAt;
  const methodNode = payment?.method && typeof payment.method === "object" ? payment.method : {};
  const receiptUrl = payment?.receiptUrl || payment?.receipt?.url || payment?.transaction?.receiptUrl || null;

  return {
    ...payment,
    id: paymentId,
    paymentId,
    imp_uid: paymentId,
    merchant_uid: paymentId,
    status: normalizePortOneStatus(payment?.status),
    amount: firstFiniteNumber(
      amountNode?.paid,
      amountNode?.total,
      payment?.totalAmount,
      payment?.amount,
    ),
    currency: String(payment?.currency || amountNode?.currency || "").trim(),
    paid_at: toUnixSeconds(paidAt),
    pay_method: String(payment?.payMethod || methodNode?.type || methodNode?.provider || "card").trim().toLowerCase(),
    receipt_url: receiptUrl,
    custom_data: payment?.customData ?? payment?.custom_data,
    rawV2: payment,
  };
}

export function getPortOnePublicConfig(env) {
  const config = getPortOneConfig(env);
  const storeId = config.portoneStoreId;
  const channelKey = config.portoneChannelKey;
  const inicisConfigured = Boolean(config.inicisMid && config.inicisSignKey && config.inicisApiKey && config.inicisApiIv);
  const serverVerificationConfigured = Boolean(config.portoneApiSecret);
  const webhookSecretConfigured = Boolean(config.portoneWebhookSecret);
  const webhookUrl = getPortOneWebhookUrl(env);
  const noticeUrl = webhookSecretConfigured ? webhookUrl : "";
  return {
    provider: "portone-v2",
    pg: "kg-inicis",
    storeId,
    channelKey,
    currency: "CURRENCY_KRW",
    payMethod: "CARD",
    noticeUrl,
    configured: Boolean(storeId && channelKey && serverVerificationConfigured),
    serverVerificationConfigured,
    webhookSecretConfigured,
    webhookUrlConfigured: Boolean(webhookUrl),
    inicisConfigured,
    inicisMidConfigured: Boolean(config.inicisMid),
    inicisSignKeyConfigured: Boolean(config.inicisSignKey),
    inicisApiKeyConfigured: Boolean(config.inicisApiKey),
    inicisApiIvConfigured: Boolean(config.inicisApiIv),
    missing: config.missing,
    missingRequired: config.missingRequired,
    missingOptional: config.missingOptional,
  };
}

// 🔴 사전 프로브는 불가능하다. PortOne V2 는 '존재하지 않는 결제 ID' 에도 401 UNAUTHORIZED 를
// 돌려주므로(payments/billing-keys/identity-verifications 모두 확인) 자격증명이 살아 있는지
// 미리 물어볼 방법이 없다. 대신 '실제 호출이 401/403 으로 거절당한 사실' 을 기억해 두고,
// 그 뒤의 신규 주문 생성을 막는다 — 두 번째 피해자부터는 결제창이 열리지 않는다.
// (getPortOneConfig().configured 는 값의 존재만 보므로 이 판정을 대신할 수 없다.)
// 🔴 PortOne 은 '존재하지 않는 결제 ID' 에도 401 UNAUTHORIZED 를 준다 — 즉 401 한 번은 자격증명이
// 죽었다는 증거가 못 된다. 잘못된 paymentId 조회 하나로 전체 결제를 막으면 그 자체가 장애다
// (실제로 재조정 크론이 이 오탐으로 첫 건에서 중단됐다).
// 그래서 '연속' 401/403 만 센다. 진짜 자격증명 장애면 모든 호출이 401 이므로 3연속이면 확정이고,
// 잘못된 ID 하나는 그 사이에 성공 응답이 섞여 스트릭이 초기화된다.
const PORTONE_AUTH_REJECTION_TTL_MS = 10 * 60 * 1000;
const PORTONE_AUTH_REJECT_STREAK_THRESHOLD = 3;
let portOneAuthRejectStreak = 0;
let portOneAuthRejectedAt = 0;

function notePortOneAuthResult(status) {
  if (status === 401 || status === 403) {
    portOneAuthRejectStreak += 1;
    if (portOneAuthRejectStreak >= PORTONE_AUTH_REJECT_STREAK_THRESHOLD && !portOneAuthRejectedAt) {
      console.error(`[portone-auth] PortOne API rejected our credential ${portOneAuthRejectStreak} times in a row (HTTP ${status}). New payment orders will be blocked until a call succeeds.`);
      portOneAuthRejectedAt = Date.now();
    }
    return;
  }
  // 인증이 통하는 응답(성공/404/400 등)을 한 번이라도 받으면 스트릭과 차단을 모두 해제한다.
  if (status >= 200 && status < 500) {
    portOneAuthRejectStreak = 0;
    portOneAuthRejectedAt = 0;
  }
}

// 워커 isolate 단위의 best-effort 차단기다. 콜드 isolate 에서는 비어 있으므로 결제를 막지 않는다.
export function getPortOneAuthRejection() {
  if (!portOneAuthRejectedAt) return null;
  if (Date.now() - portOneAuthRejectedAt > PORTONE_AUTH_REJECTION_TTL_MS) {
    portOneAuthRejectStreak = 0;
    portOneAuthRejectedAt = 0;
    return null;
  }
  return { rejectedAt: portOneAuthRejectedAt, streak: portOneAuthRejectStreak };
}

export async function fetchPortOnePayment(env, paymentId) {
  if (!paymentId) throw new Error("paymentId is required.");

  const payload = await requestJson(
    `${getPortOneBaseUrl(env)}/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: getPortOneHeaders(env),
      env,
    },
    "PortOne payment lookup failed",
  );

  const payment = normalizePortOnePayment(payload, paymentId);
  if (!payment) throw new Error("PortOne payment response was empty.");
  return payment;
}

// 🔴 PortOne 은 Idempotency-Key 형식을 검증한다(실측: 16~256자, ":" 같은 문자 불가).
// 호출부가 만드는 키는 `refund:<paymentId>:<serviceId>:<jobId>` 형태라 콜론 때문에 항상
// 400 INVALID_REQUEST "Invalid idempotency key format" 로 거절당했다 — 배송 실패 자동환불과
// 서비스 실행 자동환불이 통째로 동작하지 않았다는 뜻이다. 호출부를 각각 고치는 대신 나가는
// 지점 한 곳에서 정규화한다.
const PORTONE_IDEMPOTENCY_KEY_MIN = 16;
const PORTONE_IDEMPOTENCY_KEY_MAX = 256;

function normalizePortOneIdempotencyKey(rawKey) {
  const sanitized = String(rawKey || "").replace(/[^A-Za-z0-9_-]/g, "_");
  if (!sanitized) return "";
  // 너무 짧아도 거절되므로 결정적으로(= 같은 입력이면 같은 결과) 채운다. 멱등성이 깨지면 안 된다.
  const padded = sanitized.length >= PORTONE_IDEMPOTENCY_KEY_MIN
    ? sanitized
    : `${sanitized}${"_".repeat(PORTONE_IDEMPOTENCY_KEY_MIN - sanitized.length)}`;
  return padded.slice(0, PORTONE_IDEMPOTENCY_KEY_MAX);
}

export async function cancelPortOnePayment(env, params = {}) {
  const {
    impUid,
    merchantUid,
    reason,
    amount,
    checksum,
    currentCancellableAmount,
    idempotencyKey,
    refundHolder,
    refundBank,
    refundAccount,
  } = params;

  const paymentId = String(impUid || merchantUid || "").trim();
  if (!paymentId) {
    throw new Error("paymentId is required.");
  }

  const body = {
    reason: String(reason || "Customer refund request").slice(0, 120),
  };

  if (Number.isFinite(Number(amount)) && Number(amount) > 0) body.amount = Number(amount);
  if (Number.isFinite(Number(checksum)) && Number(checksum) > 0) body.checksum = Number(checksum);
  if (Number.isFinite(Number(currentCancellableAmount)) && Number(currentCancellableAmount) > 0) {
    body.currentCancellableAmount = Number(currentCancellableAmount);
  }
  if (refundHolder) body.refund_holder = String(refundHolder).trim();
  if (refundBank) body.refund_bank = String(refundBank).trim();
  if (refundAccount) body.refund_account = String(refundAccount).trim();

  const payload = await requestJson(
    `${getPortOneBaseUrl(env)}/payments/${encodeURIComponent(paymentId)}/cancel`,
    {
      method: "POST",
      headers: getPortOneHeaders(
        env,
        (() => {
          const normalizedKey = normalizePortOneIdempotencyKey(idempotencyKey);
          return normalizedKey ? { "Idempotency-Key": normalizedKey } : {};
        })(),
      ),
      body: JSON.stringify(body),
      env,
    },
    "PortOne payment cancel failed",
  );

  const canceled = normalizePortOnePayment(payload, paymentId) || payload;
  if (!canceled) throw new Error("PortOne cancel response was empty.");
  return canceled;
}

