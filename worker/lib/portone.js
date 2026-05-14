import { getEnv } from "./env.js";

const DEFAULT_PORTONE_BASE_URL = "https://api.iamport.kr";
const DEFAULT_PORTONE_HTTP_TIMEOUT_MS = 4500;
const TOKEN_EXPIRY_SKEW_MS = 30 * 1000;
const FALLBACK_TOKEN_TTL_MS = 8 * 60 * 1000;

let cachedPortOneToken = "";
let cachedPortOneTokenExpiresAtMs = 0;
let portOneTokenInFlight = null;

function getPortOneBaseUrl(env) {
  return getEnv(env, "PORTONE_API_BASE_URL", DEFAULT_PORTONE_BASE_URL).replace(/\/+$/, "");
}

function resolvePortOneHttpTimeoutMs(env) {
  const raw = Number(getEnv(env, "PORTONE_HTTP_TIMEOUT_MS", String(DEFAULT_PORTONE_HTTP_TIMEOUT_MS)));
  if (!Number.isFinite(raw)) return DEFAULT_PORTONE_HTTP_TIMEOUT_MS;
  return Math.max(1500, Math.min(Math.floor(raw), 15000));
}

function isCachedTokenUsable() {
  return Boolean(cachedPortOneToken)
    && Number.isFinite(cachedPortOneTokenExpiresAtMs)
    && (Date.now() + TOKEN_EXPIRY_SKEW_MS) < cachedPortOneTokenExpiresAtMs;
}

function resolveTokenExpiryMs(payload) {
  const expiresAtSec = Number(payload?.response?.expired_at || 0);
  if (Number.isFinite(expiresAtSec) && expiresAtSec > 0) {
    return expiresAtSec * 1000;
  }
  return Date.now() + FALLBACK_TOKEN_TTL_MS;
}

async function requestJson(url, options, errorPrefix, env) {
  const timeoutMs = resolvePortOneHttpTimeoutMs(env);
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // ignore abort failures
        }
      }, timeoutMs)
    : null;

  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: controller?.signal,
    });
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    const message = String(error?.name || "").toLowerCase() === "aborterror"
      ? `${errorPrefix}: timeout`
      : `${errorPrefix}: ${String(error?.message || "network_error")}`;
    throw new Error(message);
  }

  if (timeoutId) clearTimeout(timeoutId);

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const remoteMessage = payload?.message || payload?.code || response.statusText;
    throw new Error(`${errorPrefix}: ${remoteMessage}`);
  }

  return payload;
}

async function getPortOneAccessToken(env) {
  if (isCachedTokenUsable()) {
    return cachedPortOneToken;
  }

  if (portOneTokenInFlight) {
    return portOneTokenInFlight;
  }

  portOneTokenInFlight = (async () => {
  const apiKey = getEnv(env, "PORTONE_API_KEY");
  const apiSecret = getEnv(env, "PORTONE_API_SECRET");
  if (!apiKey || !apiSecret) {
    throw new Error("PORTONE_API_KEY and PORTONE_API_SECRET are required.");
  }

  const payload = await requestJson(
    `${getPortOneBaseUrl(env)}/users/getToken`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imp_key: apiKey,
        imp_secret: apiSecret,
      }),
    },
    "PortOne token request failed",
    env,
  );

  const token = payload?.response?.access_token;
  if (!token) {
    throw new Error("PortOne token response did not include access_token.");
  }

    cachedPortOneToken = String(token);
    cachedPortOneTokenExpiresAtMs = resolveTokenExpiryMs(payload);
    return cachedPortOneToken;
  })();

  try {
    return await portOneTokenInFlight;
  } finally {
    portOneTokenInFlight = null;
  }
}

export async function fetchPortOnePayment(env, impUid) {
  if (!impUid) throw new Error("impUid is required.");

  const token = await getPortOneAccessToken(env);
  const payload = await requestJson(
    `${getPortOneBaseUrl(env)}/payments/${encodeURIComponent(impUid)}`,
    {
      method: "GET",
      headers: { Authorization: token },
    },
    "PortOne payment lookup failed",
    env,
  );

  const payment = payload?.response;
  if (!payment) throw new Error("PortOne payment response was empty.");
  return payment;
}

export async function cancelPortOnePayment(env, params = {}) {
  const {
    impUid,
    merchantUid,
    reason,
    amount,
    checksum,
    refundHolder,
    refundBank,
    refundAccount,
  } = params;

  if (!impUid && !merchantUid) {
    throw new Error("impUid or merchantUid is required.");
  }

  const body = {
    reason: String(reason || "Customer refund request").slice(0, 120),
  };

  if (impUid) body.imp_uid = String(impUid).trim();
  if (merchantUid) body.merchant_uid = String(merchantUid).trim();
  if (Number.isFinite(Number(amount)) && Number(amount) > 0) body.amount = Number(amount);
  if (Number.isFinite(Number(checksum)) && Number(checksum) > 0) body.checksum = Number(checksum);
  if (refundHolder) body.refund_holder = String(refundHolder).trim();
  if (refundBank) body.refund_bank = String(refundBank).trim();
  if (refundAccount) body.refund_account = String(refundAccount).trim();

  const token = await getPortOneAccessToken(env);
  const payload = await requestJson(
    `${getPortOneBaseUrl(env)}/payments/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    },
    "PortOne payment cancel failed",
    env,
  );

  const canceled = payload?.response;
  if (!canceled) throw new Error("PortOne cancel response was empty.");
  return canceled;
}

export async function chargePortOneBilling(env, params = {}) {
  const {
    customerUid,
    merchantUid,
    amount,
    name,
    buyerName,
    buyerEmail,
    customData,
  } = params;

  const normalizedCustomerUid = String(customerUid || "").trim();
  const normalizedMerchantUid = String(merchantUid || "").trim();
  const normalizedAmount = Number(amount);

  if (!normalizedCustomerUid) {
    throw new Error("customerUid is required.");
  }
  if (!normalizedMerchantUid) {
    throw new Error("merchantUid is required.");
  }
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("amount must be a positive number.");
  }

  const body = {
    customer_uid: normalizedCustomerUid,
    merchant_uid: normalizedMerchantUid,
    amount: normalizedAmount,
    name: String(name || "Subscription renewal").trim().slice(0, 120),
  };

  if (buyerName) body.buyer_name = String(buyerName).trim().slice(0, 80);
  if (buyerEmail) body.buyer_email = String(buyerEmail).trim().slice(0, 120);
  if (customData !== undefined) body.custom_data = customData;

  const token = await getPortOneAccessToken(env);
  const payload = await requestJson(
    `${getPortOneBaseUrl(env)}/subscribe/payments/again`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    },
    "PortOne billing charge failed",
    env,
  );

  const billed = payload?.response;
  if (!billed) throw new Error("PortOne billing response was empty.");
  return billed;
}
