const DEFAULT_PORTONE_BASE_URL = "https://api.iamport.kr";

function normalizeEnvKey(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function getEnvByAliases(...keys) {
  const env = process.env || {};
  for (const key of keys) {
    const direct = String(env[key] || "").trim();
    if (direct) return direct;
  }

  const normalizedCandidates = keys.map(normalizeEnvKey).filter(Boolean);
  for (const [rawKey, rawValue] of Object.entries(env)) {
    if (!normalizedCandidates.includes(normalizeEnvKey(rawKey))) continue;
    const trimmed = String(rawValue || "").trim();
    if (trimmed) return trimmed;
  }

  return "";
}

function getPortOneBaseUrl() {
  return String(process.env.PORTONE_API_BASE_URL || DEFAULT_PORTONE_BASE_URL).replace(/\/+$/, "");
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

async function getPortOneAccessToken() {
  const apiKey = getEnvByAliases("PORTONE_API_KEY", "PORTONE_REST_API_KEY", "PORTONE API Key");
  const apiSecret = getEnvByAliases("PORTONE_API_SECRET", "PORTONE_REST_API_SECRET", "PORTONE API Secret");

  if (!apiKey || !apiSecret) {
    throw new Error("PORTONE_API_KEY/PORTONE_API_SECRET(또는 REST/공백 별칭) 환경변수가 필요합니다.");
  }

  const baseUrl = getPortOneBaseUrl();
  const payload = await requestJson(
    `${baseUrl}/users/getToken`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imp_key: apiKey,
        imp_secret: apiSecret,
      }),
    },
    "포트원 토큰 발급 실패",
  );

  const token = payload?.response?.access_token;
  if (!token) {
    throw new Error("포트원 토큰 응답에 access_token이 없습니다.");
  }

  return token;
}

async function fetchPortOnePayment(impUid) {
  if (!impUid) {
    throw new Error("impUid가 필요합니다.");
  }

  const token = await getPortOneAccessToken();
  const baseUrl = getPortOneBaseUrl();

  const payload = await requestJson(
    `${baseUrl}/payments/${encodeURIComponent(impUid)}`,
    {
      method: "GET",
      headers: {
        Authorization: token,
      },
    },
    "포트원 결제 조회 실패",
  );

  const payment = payload?.response;
  if (!payment) {
    throw new Error("포트원 결제 응답이 비어있습니다.");
  }

  return payment;
}

async function fetchPortOnePaymentByMerchantUid(merchantUid) {
  if (!merchantUid) {
    throw new Error("merchantUid가 필요합니다.");
  }

  const token = await getPortOneAccessToken();
  const baseUrl = getPortOneBaseUrl();

  const payload = await requestJson(
    `${baseUrl}/payments/find/${encodeURIComponent(merchantUid)}`,
    {
      method: "GET",
      headers: {
        Authorization: token,
      },
    },
    "포트원 주문번호 결제 조회 실패",
  );

  const payment = payload?.response;
  if (!payment) {
    throw new Error("포트원 결제 응답이 비어있습니다.");
  }

  return payment;
}

async function cancelPortOnePayment(params = {}) {
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
    throw new Error("impUid 또는 merchantUid 중 하나는 필요합니다.");
  }

  const token = await getPortOneAccessToken();
  const baseUrl = getPortOneBaseUrl();

  const body = {
    reason: String(reason || "고객 요청 환불").slice(0, 120),
  };

  if (impUid) body.imp_uid = String(impUid).trim();
  if (merchantUid) body.merchant_uid = String(merchantUid).trim();
  if (Number.isFinite(Number(amount)) && Number(amount) > 0) {
    body.amount = Number(amount);
  }
  if (Number.isFinite(Number(checksum)) && Number(checksum) > 0) {
    body.checksum = Number(checksum);
  }
  if (refundHolder) body.refund_holder = String(refundHolder).trim();
  if (refundBank) body.refund_bank = String(refundBank).trim();
  if (refundAccount) body.refund_account = String(refundAccount).trim();

  const payload = await requestJson(
    `${baseUrl}/payments/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    },
    "포트원 결제 취소 실패",
  );

  const canceled = payload?.response;
  if (!canceled) {
    throw new Error("포트원 취소 응답이 비어있습니다.");
  }

  return canceled;
}

async function chargePortOneBilling(params = {}) {
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
    throw new Error("customerUid가 필요합니다.");
  }
  if (!normalizedMerchantUid) {
    throw new Error("merchantUid가 필요합니다.");
  }
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("amount는 0보다 큰 숫자여야 합니다.");
  }

  const token = await getPortOneAccessToken();
  const baseUrl = getPortOneBaseUrl();

  const body = {
    customer_uid: normalizedCustomerUid,
    merchant_uid: normalizedMerchantUid,
    amount: normalizedAmount,
    name: String(name || "Subscription renewal").trim().slice(0, 120),
  };

  if (buyerName) body.buyer_name = String(buyerName).trim().slice(0, 80);
  if (buyerEmail) body.buyer_email = String(buyerEmail).trim().slice(0, 120);
  if (customData !== undefined) body.custom_data = customData;

  const payload = await requestJson(
    `${baseUrl}/subscribe/payments/again`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    },
    "포트원 정기결제 청구 실패",
  );

  const billed = payload?.response;
  if (!billed) {
    throw new Error("포트원 정기결제 응답이 비어있습니다.");
  }

  return billed;
}

module.exports = {
  fetchPortOnePayment,
  fetchPortOnePaymentByMerchantUid,
  cancelPortOnePayment,
  chargePortOneBilling,
};
