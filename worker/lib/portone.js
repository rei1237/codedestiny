import { getEnv } from "./env.js";

const DEFAULT_PORTONE_BASE_URL = "https://api.portone.io";

function getPortOneBaseUrl(env) {
  return getEnv(env, "PORTONE_API_BASE_URL", DEFAULT_PORTONE_BASE_URL).replace(/\/+$/, "");
}

function getExactEnv(env, key, fallback = "") {
  const direct = env?.[key];
  if (direct !== undefined && direct !== null) {
    const trimmed = String(direct).trim();
    if (trimmed) return trimmed;
  }

  if (typeof globalThis?.process !== "undefined") {
    const fromProcess = globalThis.process?.env?.[key];
    if (fromProcess !== undefined && fromProcess !== null) {
      const trimmed = String(fromProcess).trim();
      if (trimmed) return trimmed;
    }
  }

  return fallback;
}

function getPortOneApiSecret(env) {
  return getExactEnv(env, "PORTONE_API_Secret");
}

export function getPortOneWebhookSecret(env) {
  return getExactEnv(env, "PORTONE_webhook_Secret", getExactEnv(env, "PORTONE_webhook"));
}

export function getPortOneWebhookUrl(env) {
  return getExactEnv(env, "PORTONE_webhook_URL", getExactEnv(env, "PORTONE_WEBHOOK_URL"));
}

function getPortOneHeaders(env) {
  const apiSecret = getPortOneApiSecret(env);
  if (!apiSecret) {
    throw new Error("PORTONE_API_Secret is required.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `PortOne ${apiSecret}`,
  };
}

async function requestJson(url, options, errorPrefix) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const remoteMessage = payload?.message || payload?.code || response.statusText;
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
  const storeId = getExactEnv(env, "PORTONE_Store");
  const channelKey = getExactEnv(env, "PORTONE_channel");
  const noticeUrl = getPortOneWebhookUrl(env);
  return {
    provider: "portone-v2",
    pg: "kg-inicis",
    storeId,
    channelKey,
    noticeUrl,
    currency: "CURRENCY_KRW",
    payMethod: "CARD",
    configured: Boolean(storeId && channelKey && getPortOneApiSecret(env)),
  };
}

export async function fetchPortOnePayment(env, paymentId) {
  if (!paymentId) throw new Error("paymentId is required.");

  const payload = await requestJson(
    `${getPortOneBaseUrl(env)}/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: getPortOneHeaders(env),
    },
    "PortOne payment lookup failed",
  );

  const payment = normalizePortOnePayment(payload, paymentId);
  if (!payment) throw new Error("PortOne payment response was empty.");
  return payment;
}

export async function cancelPortOnePayment(env, params = {}) {
  const {
    impUid,
    merchantUid,
    reason,
    amount,
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
  if (refundHolder) body.refund_holder = String(refundHolder).trim();
  if (refundBank) body.refund_bank = String(refundBank).trim();
  if (refundAccount) body.refund_account = String(refundAccount).trim();

  const payload = await requestJson(
    `${getPortOneBaseUrl(env)}/payments/${encodeURIComponent(paymentId)}/cancel`,
    {
      method: "POST",
      headers: getPortOneHeaders(env),
      body: JSON.stringify(body),
    },
    "PortOne payment cancel failed",
  );

  const canceled = normalizePortOnePayment(payload, paymentId) || payload;
  if (!canceled) throw new Error("PortOne cancel response was empty.");
  return canceled;
}

export async function chargePortOneBilling() {
  throw new Error("PortOne V2 recurring billing is not configured for membership passes.");
}
