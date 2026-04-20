import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getUserModel } from "../../../_lib/models/UserModel";
import { getPointHistoryModel } from "../../../_lib/models/PointHistoryModel";
import { getPaymentModel } from "../../../_lib/models/PaymentModel";
import { getPaymentFailureLogModel } from "../../../_lib/models/PaymentFailureLogModel";

const DEFAULT_PORTONE_BASE_URL = "https://api.iamport.kr";

const DEFAULT_POINT_CHARGE_PACKAGES = {
  3300: 30,
  9900: 115,
  29000: 360,
  59000: 880,
  119000: 2000,
};

const tokenCache = {
  accessToken: "",
  expiresAtMs: 0,
};

const billingOtpStore = globalThis.__CD_BILLING_OTP_STORE || new Map();
if (!globalThis.__CD_BILLING_OTP_STORE) {
  globalThis.__CD_BILLING_OTP_STORE = billingOtpStore;
}

function normalizeBaseUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  try {
    return new URL(value).origin.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function hasLegacyBaseConfigured() {
  const base = normalizeBaseUrl(
    process.env.AUTH_API_BASE_URL
      || process.env.AUTH_API_BASE
      || process.env.CODE_DESTINY_API_URL
      || process.env.NEXT_PUBLIC_CODE_DESTINY_API_URL
      || process.env.NEXT_PUBLIC_API_BASE_URL,
  );
  return Boolean(base);
}

export function shouldUseDirectPayments() {
  const forcedDirect = String(process.env.PAYMENTS_DIRECT_MODE || "").toLowerCase() === "true";
  const hasPortOneSecret = Boolean(process.env.PORTONE_API_KEY && process.env.PORTONE_API_SECRET);
  if (!hasPortOneSecret) return false;
  if (forcedDirect) return true;
  return !hasLegacyBaseConfigured();
}

function getPortOneBaseUrl() {
  return String(process.env.PORTONE_API_BASE_URL || DEFAULT_PORTONE_BASE_URL).replace(/\/+$/, "");
}

function toDateFromUnixSeconds(value) {
  const unixSeconds = Number(value);
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return new Date();
  return new Date(unixSeconds * 1000);
}

function normalizePaymentMethod(value) {
  const method = String(value || "unknown").trim();
  return method ? method.slice(0, 32) : "unknown";
}

function normalizePhoneNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCarrier(value) {
  const carrier = String(value || "").trim().toUpperCase();
  const allowed = new Set(["KT", "SKT", "LGU+", "KT알뜰", "SKT알뜰", "LGU알뜰"]);
  if (!allowed.has(carrier)) return "KT";
  return carrier;
}

function maskCardNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const last4 = digits.slice(-4).padStart(4, "*");
  return `**** **** **** ${last4}`;
}

function buildBillingCustomerUid(userId) {
  const userTag = String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "guest";
  return `cd_billing_${userTag}_${Date.now()}`;
}

function getDevFallbackEnabled() {
  if (String(process.env.BILLING_TEST_FALLBACK || "").toLowerCase() === "true") return true;
  if (process.env.NODE_ENV === "production") return false;
  return String(process.env.BILLING_DEV_FALLBACK || "true").toLowerCase() !== "false";
}

function buildMerchantUid(userId) {
  const userTag = String(userId || "guest").replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "guest";
  const randomTag = Math.random().toString(36).slice(2, 8);
  return `md_${Date.now()}_${userTag}_${randomTag}`;
}

function parsePointChargePackages(raw) {
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("POINT_CHARGE_PACKAGES 환경변수는 JSON 객체여야 합니다.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("POINT_CHARGE_PACKAGES 환경변수는 JSON 객체여야 합니다.");
  }

  const table = new Map();
  for (const [amountRaw, pointsRaw] of Object.entries(parsed)) {
    const amount = Number(amountRaw);
    const points = Number(pointsRaw);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("POINT_CHARGE_PACKAGES의 금액 키는 양의 정수여야 합니다.");
    }
    if (!Number.isInteger(points) || points <= 0) {
      throw new Error("POINT_CHARGE_PACKAGES의 포인트 값은 양의 정수여야 합니다.");
    }
    table.set(amount, points);
  }

  return table;
}

function resolveChargePointsByAmount(paymentAmount, requestedPoints) {
  const amount = Number(paymentAmount);

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("결제 금액은 1원 이상의 정수여야 합니다.");
  }

  const packageTable =
    parsePointChargePackages(process.env.POINT_CHARGE_PACKAGES)
    || new Map(Object.entries(DEFAULT_POINT_CHARGE_PACKAGES).map(([k, v]) => [Number(k), Number(v)]));

  const resolvedPoints = packageTable.get(amount);
  if (!resolvedPoints) {
    throw new Error("허용되지 않은 결제 금액입니다.");
  }

  if (
    requestedPoints !== undefined
    && requestedPoints !== null
    && Number(requestedPoints) !== resolvedPoints
  ) {
    throw new Error("클라이언트 포인트 값이 서버 충전 정책과 일치하지 않습니다.");
  }

  return resolvedPoints;
}

function getRequestMeta(request) {
  const forwarded = String(request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ip = forwarded || String(request.headers.get("x-real-ip") || "unknown");
  const userAgent = String(request.headers.get("user-agent") || "").slice(0, 300);
  const requestId = String(request.headers.get("x-request-id") || request.headers.get("cf-ray") || "").slice(0, 120);
  return { ip, userAgent, requestId };
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const clone = { ...payload };
  if (clone.card_number) clone.card_number = "[redacted]";
  if (clone.customer_uid) clone.customer_uid = "[redacted]";
  return clone;
}

async function writeFailureLog(params = {}) {
  try {
    const PaymentFailureLog = await getPaymentFailureLogModel();
    await PaymentFailureLog.create({
      userId: params.userId && mongoose.Types.ObjectId.isValid(String(params.userId)) ? params.userId : undefined,
      impUid: params.impUid,
      merchantUid: params.merchantUid,
      source: params.source || "system",
      stage: params.stage || "unknown",
      code: params.code,
      message: params.message,
      status: params.status,
      expectedAmount: params.expectedAmount,
      clientAmount: params.clientAmount,
      portOneAmount: params.portOneAmount,
      portOneStatus: params.portOneStatus,
      requestMeta: params.request ? getRequestMeta(params.request) : undefined,
      payload: summarizePayload(params.payload),
      rawPortOne: params.rawPortOne,
    });
  } catch {
    // 실패 로그 저장 실패는 메인 흐름에 영향 주지 않음
  }
}

function parseCustomDataUserId(customData) {
  if (!customData) return null;

  let parsed = customData;
  if (typeof customData === "string") {
    try {
      parsed = JSON.parse(customData);
    } catch {
      return null;
    }
  }

  const userId = String(parsed?.userId || parsed?.uid || "").trim();
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;
  return userId;
}

function formatPaymentResponse(payment) {
  if (!payment) return null;

  const approvalNumber =
    String(payment?.rawPortOne?.apply_num || payment?.rawPortOne?.apply_num_vbank || "").trim()
    || null;
  const receiptUrl = String(payment?.rawPortOne?.receipt_url || "").trim() || null;
  const cancelAmount = Number(payment?.rawPortOne?.cancel_amount || 0);
  const cancelledAt = payment?.rawPortOne?.cancelled_at
    ? toDateFromUnixSeconds(payment.rawPortOne.cancelled_at)
    : null;

  return {
    id: String(payment._id),
    impUid: payment.impUid,
    merchantUid: payment.merchantUid,
    paymentAmount: Number(payment.paymentAmount || 0),
    chargedPoints: Number(payment.chargedPoints || 0),
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    paidAt: payment.paidAt,
    approvalNumber,
    receiptUrl,
    cancelAmount,
    cancelledAt,
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
    failureStage: payment.failureStage,
    lastErrorAt: payment.lastErrorAt,
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

async function getPortOneAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAtMs > now + 10_000) {
    return tokenCache.accessToken;
  }

  const apiKey = process.env.PORTONE_API_KEY;
  const apiSecret = process.env.PORTONE_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("PORTONE_API_KEY 및 PORTONE_API_SECRET 환경변수가 필요합니다.");
  }

  const baseUrl = getPortOneBaseUrl();
  const payload = await requestJson(
    `${baseUrl}/users/getToken`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imp_key: apiKey, imp_secret: apiSecret }),
    },
    "포트원 토큰 발급 실패",
  );

  const token = payload?.response?.access_token;
  if (!token) {
    throw new Error("포트원 토큰 응답에 access_token이 없습니다.");
  }

  const expiredAtSec = Number(payload?.response?.expired_at || 0);
  tokenCache.accessToken = token;
  tokenCache.expiresAtMs = expiredAtSec > 0 ? expiredAtSec * 1000 : now + 60 * 1000;

  return token;
}

async function fetchPortOnePayment(impUid) {
  if (!impUid) throw new Error("impUid가 필요합니다.");

  const token = await getPortOneAccessToken();
  const baseUrl = getPortOneBaseUrl();

  const payload = await requestJson(
    `${baseUrl}/payments/${encodeURIComponent(impUid)}`,
    {
      method: "GET",
      headers: { Authorization: token },
    },
    "포트원 결제 조회 실패",
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
  if (Number.isFinite(Number(amount)) && Number(amount) > 0) body.amount = Number(amount);
  if (Number.isFinite(Number(checksum)) && Number(checksum) > 0) body.checksum = Number(checksum);
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

async function issueBillingKeyWithPortOne(params = {}) {
  const {
    userId,
    cardNumber,
    expMonth,
    expYear,
    birthDate,
    buyerName,
    phone,
    carrier,
  } = params;

  const customerUid = buildBillingCustomerUid(userId);
  const token = await getPortOneAccessToken();
  const baseUrl = getPortOneBaseUrl();

  const normalizedYear = String(expYear || "").replace(/\D/g, "");
  const year = normalizedYear.length === 2 ? `20${normalizedYear}` : normalizedYear;
  const month = String(expMonth || "").replace(/\D/g, "").padStart(2, "0");
  const expiry = `${year}-${month}`;

  const payloadBody = {
    customer_uid: customerUid,
    card_number: String(cardNumber || "").replace(/\D/g, ""),
    expiry,
    birth: String(birthDate || "").replace(/\D/g, "").slice(0, 6),
    customer_name: String(buyerName || "").trim() || undefined,
    phone: normalizePhoneNumber(phone) || undefined,
    carrier: normalizeCarrier(carrier),
    pg: String(process.env.PORTONE_BILLING_PG || process.env.NEXT_PUBLIC_PORTONE_PG_CARD || "").trim() || undefined,
  };

  const body = Object.fromEntries(Object.entries(payloadBody).filter(([, v]) => v !== undefined && v !== ""));

  const payload = await requestJson(
    `${baseUrl}/subscribe/customers/${encodeURIComponent(customerUid)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    },
    "포트원 빌링키 발급 실패",
  );

  const response = payload?.response || {};
  const billingKey = String(response.customer_uid || customerUid).trim();
  const cardName = String(response.card_name || response.card_code || "등록 카드").trim() || "등록 카드";

  return {
    billingKey,
    cardName,
    cardNumber: maskCardNumber(cardNumber),
    rawPortOne: response,
  };
}

function getTokenFromRequest(request) {
  const authHeader = String(request.headers.get("authorization") || "");
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7).trim();

  const cookie = String(request.headers.get("cookie") || "");
  if (!cookie) return "";

  const parts = cookie.split(";").map((v) => v.trim());
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === "fortune_auth_token") return decodeURIComponent(rest.join("="));
  }

  return "";
}

function requireAuth(request) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return { ok: false, response: NextResponse.json({ message: "인증 토큰이 필요합니다." }, { status: 401 }) };
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const userId = String(payload?.userId || "");
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { ok: false, response: NextResponse.json({ message: "유효하지 않은 사용자 토큰입니다." }, { status: 401 }) };
    }
    return {
      ok: true,
      auth: {
        userId,
        role: payload?.role,
        email: payload?.email,
        issuer: payload?.iss,
      },
    };
  } catch {
    return { ok: false, response: NextResponse.json({ message: "유효하지 않거나 만료된 토큰입니다." }, { status: 401 }) };
  }
}

async function parseJsonSafe(request) {
  return request.json().catch(() => ({}));
}

async function findPaymentRecord(Payment, impUid, merchantUid) {
  if (impUid) {
    const byImp = await Payment.findOne({ impUid }).lean();
    if (byImp) return byImp;
  }
  if (merchantUid) {
    const byMerchant = await Payment.findOne({ merchantUid }).lean();
    if (byMerchant) return byMerchant;
  }
  return null;
}

async function handlePrepare(request) {
  const authCheck = requireAuth(request);
  if (!authCheck.ok) return authCheck.response;

  const body = await parseJsonSafe(request);
  const paymentAmount = Number(body?.paymentAmount ?? body?.amount);
  const requestedChargePoints = body?.chargePoints === undefined || body?.chargePoints === null
    ? undefined
    : Number(body?.chargePoints);

  if (!Number.isInteger(paymentAmount) || paymentAmount <= 0) {
    await writeFailureLog({
      request,
      userId: authCheck.auth.userId,
      source: "prepare",
      stage: "payload_validate",
      code: "invalid_payment_amount",
      message: "결제 금액(paymentAmount)은 양의 정수여야 합니다.",
      status: 400,
      payload: body,
    });
    return NextResponse.json({ message: "결제 금액(paymentAmount)은 양의 정수여야 합니다." }, { status: 400 });
  }

  if (requestedChargePoints !== undefined && (!Number.isInteger(requestedChargePoints) || requestedChargePoints <= 0)) {
    return NextResponse.json({ message: "충전 포인트(chargePoints)는 양의 정수여야 합니다." }, { status: 400 });
  }

  let chargedPoints;
  try {
    chargedPoints = resolveChargePointsByAmount(paymentAmount, requestedChargePoints);
  } catch (error) {
    return NextResponse.json({ message: error?.message || "충전 정책 검증에 실패했습니다." }, { status: 400 });
  }

  const paymentMethod = normalizePaymentMethod(body?.paymentMethod);
  const rawProductName = String(body?.productName || `${chargedPoints.toLocaleString("ko-KR")} 포인트 충전`).trim();
  const productName = rawProductName.slice(0, 80) || `${chargedPoints.toLocaleString("ko-KR")} 포인트 충전`;
  const merchantUid = buildMerchantUid(authCheck.auth.userId);

  const Payment = await getPaymentModel();
  await Payment.create({
    userId: authCheck.auth.userId,
    merchantUid,
    paymentAmount,
    expectedChargedPoints: chargedPoints,
    chargedPoints: 0,
    paymentMethod,
    status: "pending",
    source: "prepare",
  });

  return NextResponse.json(
    {
      message: "결제 준비가 완료되었습니다.",
      order: {
        merchantUid,
        paymentAmount,
        chargePoints: chargedPoints,
        productName,
      },
    },
    { status: 201 },
  );
}

async function handleConfirm(request) {
  const authCheck = requireAuth(request);
  if (!authCheck.ok) return authCheck.response;

  const body = await parseJsonSafe(request);

  const hasMinimalRedirectPayload = Boolean(
    (body?.impUid || body?.paymentId)
      && (body?.merchantUid || body?.merchant_uid)
      && (body?.paymentAmount === undefined && body?.amount === undefined),
  );

  let impUid = "";
  let merchantUid = "";
  let requestedAmount;
  let requestedChargePoints;
  let paymentMethod;

  if (hasMinimalRedirectPayload) {
    impUid = String(body?.impUid || body?.paymentId || "").trim();
    merchantUid = String(body?.merchantUid || body?.merchant_uid || "").trim();
    paymentMethod = String(body?.paymentMethod || "").trim() || undefined;
  } else {
    impUid = String(body?.impUid || body?.paymentId || "").trim();
    merchantUid = String(body?.merchantUid || body?.merchant_uid || "").trim();
    requestedAmount = Number(body?.paymentAmount ?? body?.amount);
    requestedChargePoints = body?.chargePoints === undefined || body?.chargePoints === null
      ? undefined
      : Number(body?.chargePoints);
    paymentMethod = String(body?.paymentMethod || "").trim() || undefined;

    if (!impUid || impUid.length < 6) {
      return NextResponse.json({ message: "결제 고유 ID(impUid)가 필요합니다." }, { status: 400 });
    }
    if (!Number.isInteger(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json({ message: "결제 금액(paymentAmount)은 양의 정수여야 합니다." }, { status: 400 });
    }
    if (requestedChargePoints !== undefined && (!Number.isInteger(requestedChargePoints) || requestedChargePoints <= 0)) {
      return NextResponse.json({ message: "충전 포인트(chargePoints)는 양의 정수여야 합니다." }, { status: 400 });
    }
  }

  if (!impUid) {
    return NextResponse.json({ message: "결제 고유 ID(impUid)가 필요합니다." }, { status: 400 });
  }

  const Payment = await getPaymentModel();
  const User = await getUserModel();
  const PointHistory = await getPointHistoryModel();

  let portOnePayment;
  try {
    portOnePayment = await fetchPortOnePayment(impUid);
  } catch (error) {
    await writeFailureLog({
      request,
      userId: authCheck.auth.userId,
      impUid,
      merchantUid,
      source: "confirm",
      stage: "portone_fetch",
      code: "portone_fetch_failed",
      message: error?.message || "포트원 결제 조회 실패",
      status: 502,
      payload: body,
    });
    return NextResponse.json({ message: "포트원 결제 조회에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }

  const portOneStatus = String(portOnePayment.status || "").toLowerCase();
  const portOneAmount = Number(portOnePayment.amount);
  const portOneMerchantUid = String(portOnePayment.merchant_uid || merchantUid || "").trim();
  const normalizedMethod = normalizePaymentMethod(portOnePayment.pay_method || paymentMethod);

  let paymentRecord = await findPaymentRecord(Payment, impUid, portOneMerchantUid);

  const customDataUserId = parseCustomDataUserId(portOnePayment.custom_data);
  const ownerUserId = paymentRecord?.userId
    ? String(paymentRecord.userId)
    : (customDataUserId || authCheck.auth.userId);

  if (!mongoose.Types.ObjectId.isValid(ownerUserId)) {
    return NextResponse.json({ message: "결제 소유 사용자 정보를 확인할 수 없습니다." }, { status: 400 });
  }

  if (String(ownerUserId) !== String(authCheck.auth.userId)) {
    return NextResponse.json({ message: "본인 결제 건만 처리할 수 있습니다." }, { status: 403 });
  }

  const expectedAmount = Number.isInteger(Number(requestedAmount))
    ? Number(requestedAmount)
    : Number(paymentRecord?.paymentAmount || 0);
  const expectedChargedPoints = Number.isInteger(Number(requestedChargePoints))
    ? Number(requestedChargePoints)
    : Number(paymentRecord?.expectedChargedPoints || 0);

  if (!paymentRecord) {
    paymentRecord = await Payment.create({
      userId: ownerUserId,
      impUid,
      merchantUid: portOneMerchantUid || undefined,
      paymentAmount: expectedAmount > 0 ? expectedAmount : Math.max(Number(portOneAmount) || 0, 0),
      expectedChargedPoints,
      chargedPoints: 0,
      paymentMethod: normalizedMethod,
      status: "pending",
      source: "confirm",
    });
    paymentRecord = paymentRecord.toObject();
  }

  if (paymentRecord.status === "success") {
    const currentUser = await User.findById(ownerUserId).select("points").lean();
    return NextResponse.json({
      message: "이미 처리된 결제입니다.",
      idempotent: true,
      user: {
        id: ownerUserId,
        points: Number(currentUser?.points || 0),
      },
      payment: formatPaymentResponse(paymentRecord),
    });
  }

  if (!Number.isInteger(portOneAmount) || portOneAmount <= 0) {
    await Payment.findByIdAndUpdate(paymentRecord._id, {
      $set: {
        status: "failed",
        paymentMethod: normalizedMethod,
        rawPortOne: portOnePayment,
        failureCode: "invalid_portone_amount",
        failureMessage: "포트원 결제 금액 정보가 올바르지 않습니다.",
        failureStage: "amount_validate",
        lastErrorAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    }).catch(() => {});

    return NextResponse.json({ message: "포트원 결제 금액 정보가 올바르지 않습니다." }, { status: 400 });
  }

  if (
    requestedAmount !== undefined
      && requestedAmount !== null
      && Number.isInteger(Number(requestedAmount))
      && Number(requestedAmount) !== portOneAmount
  ) {
    await Payment.findByIdAndUpdate(paymentRecord._id, {
      $set: {
        status: "failed",
        paymentMethod: normalizedMethod,
        rawPortOne: portOnePayment,
        failureCode: "client_amount_mismatch",
        failureMessage: "결제 위변조가 감지되었습니다. 금액이 일치하지 않습니다.",
        failureStage: "amount_match",
        lastErrorAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    }).catch(() => {});

    return NextResponse.json({
      message: "결제 위변조가 감지되었습니다. 금액이 일치하지 않습니다.",
      clientAmount: Number(requestedAmount),
      portOneAmount,
    }, { status: 400 });
  }

  if (Number(paymentRecord.paymentAmount || 0) > 0 && Number(paymentRecord.paymentAmount) !== portOneAmount) {
    await Payment.findByIdAndUpdate(paymentRecord._id, {
      $set: {
        status: "failed",
        paymentMethod: normalizedMethod,
        rawPortOne: portOnePayment,
        failureCode: "server_amount_mismatch",
        failureMessage: "서버 주문 금액과 실제 결제 금액이 일치하지 않습니다.",
        failureStage: "amount_match",
        lastErrorAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    }).catch(() => {});

    return NextResponse.json({
      message: "서버 주문 금액과 실제 결제 금액이 일치하지 않습니다.",
      expectedAmount: Number(paymentRecord.paymentAmount),
      portOneAmount,
    }, { status: 400 });
  }

  if (portOneStatus !== "paid") {
    const nextStatus = portOneStatus === "cancelled" ? "cancelled" : "failed";

    await Payment.findByIdAndUpdate(paymentRecord._id, {
      $set: {
        status: nextStatus,
        paymentMethod: normalizedMethod,
        rawPortOne: portOnePayment,
        failureCode: "payment_not_paid",
        failureMessage: "결제가 완료되지 않은 상태입니다.",
        failureStage: "status_validate",
        lastErrorAt: new Date(),
      },
      $inc: { confirmAttempts: 1 },
    }).catch(() => {});

    return NextResponse.json({
      message: "결제가 완료되지 않은 상태입니다.",
      status: portOneStatus || "unknown",
    }, { status: 400 });
  }

  let chargedPoints;
  try {
    const pointsForPolicy = expectedChargedPoints > 0 ? expectedChargedPoints : undefined;
    chargedPoints = resolveChargePointsByAmount(portOneAmount, pointsForPolicy);
  } catch (error) {
    return NextResponse.json({ message: error?.message || "충전 포인트 정책 검증에 실패했습니다." }, { status: 400 });
  }

  const paidAt = toDateFromUnixSeconds(portOnePayment.paid_at);

  const finalizedPayment = await Payment.findOneAndUpdate(
    {
      _id: paymentRecord._id,
      status: { $ne: "success" },
    },
    {
      $set: {
        userId: ownerUserId,
        impUid,
        merchantUid: portOneMerchantUid || paymentRecord.merchantUid || undefined,
        paymentAmount: portOneAmount,
        expectedChargedPoints: chargedPoints,
        chargedPoints,
        paymentMethod: normalizedMethod,
        status: "success",
        paidAt,
        source: "confirm",
        rawPortOne: portOnePayment,
        failureCode: null,
        failureMessage: null,
        failureStage: null,
      },
      $inc: { confirmAttempts: 1 },
    },
    { new: true },
  ).lean();

  if (!finalizedPayment) {
    const latestPayment = await Payment.findById(paymentRecord._id).lean();
    const latestUser = await User.findById(ownerUserId).select("points").lean();

    return NextResponse.json({
      message: "이미 처리된 결제입니다.",
      idempotent: true,
      user: {
        id: ownerUserId,
        points: Number(latestUser?.points || 0),
      },
      payment: formatPaymentResponse(latestPayment),
    });
  }

  const updatedUser = await User.findByIdAndUpdate(
    ownerUserId,
    { $inc: { points: chargedPoints } },
    { new: true, projection: { points: 1 } },
  ).lean();

  if (!updatedUser) {
    return NextResponse.json({ message: "포인트를 충전할 사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  await PointHistory.create({
    userId: ownerUserId,
    kind: "charge",
    delta: chargedPoints,
    balanceAfter: Number(updatedUser.points || 0),
    reason: "포인트 충전",
    paymentId: finalizedPayment._id,
    impUid,
    merchantUid: finalizedPayment.merchantUid,
    metadata: {
      source: "confirm",
      paymentAmount: portOneAmount,
      paymentMethod: normalizedMethod,
    },
  }).catch(() => {});

  return NextResponse.json({
    message: "포인트 충전이 완료되었습니다.",
    idempotent: false,
    user: {
      id: ownerUserId,
      points: Number(updatedUser.points || 0),
    },
    payment: formatPaymentResponse(finalizedPayment),
  });
}

async function handleCancel(request) {
  const authCheck = requireAuth(request);
  if (!authCheck.ok) return authCheck.response;

  const body = await parseJsonSafe(request);

  const impUid = String(body?.impUid || body?.imp_uid || "").trim() || undefined;
  const merchantUid = String(body?.merchantUid || body?.merchant_uid || "").trim() || undefined;
  const reason = String(body?.reason || "고객 요청 환불").trim().slice(0, 120);
  const requestedCancelAmountRaw = body?.cancelAmount ?? body?.amount;
  const requestedCancelAmount =
    requestedCancelAmountRaw === undefined || requestedCancelAmountRaw === null
      ? undefined
      : Number(requestedCancelAmountRaw);

  if (!impUid && !merchantUid) {
    return NextResponse.json({ message: "impUid 또는 merchantUid 중 하나는 필요합니다." }, { status: 400 });
  }

  if (requestedCancelAmount !== undefined && (!Number.isInteger(requestedCancelAmount) || requestedCancelAmount <= 0)) {
    return NextResponse.json({ message: "cancelAmount는 양의 정수여야 합니다." }, { status: 400 });
  }

  const Payment = await getPaymentModel();
  const User = await getUserModel();
  const PointHistory = await getPointHistoryModel();

  const paymentRecord = await findPaymentRecord(Payment, impUid, merchantUid);
  if (!paymentRecord) {
    return NextResponse.json({ message: "결제 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (String(paymentRecord.userId) !== String(authCheck.auth.userId)) {
    return NextResponse.json({ message: "본인 결제 건만 취소할 수 있습니다." }, { status: 403 });
  }

  if (paymentRecord.status === "cancelled") {
    return NextResponse.json({
      message: "이미 취소된 결제입니다.",
      idempotent: true,
      payment: formatPaymentResponse(paymentRecord),
    });
  }

  if (paymentRecord.status !== "success") {
    return NextResponse.json({ message: "결제 완료 건만 취소할 수 있습니다." }, { status: 400 });
  }

  const paidAmount = Number(paymentRecord.paymentAmount || 0);
  if (requestedCancelAmount !== undefined && requestedCancelAmount > paidAmount) {
    return NextResponse.json({ message: "취소 요청 금액이 결제 금액을 초과합니다." }, { status: 400 });
  }

  const pointsToRollback = Number(paymentRecord.chargedPoints || paymentRecord.expectedChargedPoints || 0);
  const user = await User.findById(authCheck.auth.userId).select("points").lean();
  if (!user) {
    return NextResponse.json({ message: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (pointsToRollback > 0 && Number(user.points || 0) < pointsToRollback) {
    return NextResponse.json({
      message: "이미 사용된 코인이 있어 자동 환불할 수 없습니다. 고객센터로 문의해 주세요.",
    }, { status: 409 });
  }

  const canceledPortOne = await cancelPortOnePayment({
    impUid: paymentRecord.impUid || impUid,
    merchantUid: paymentRecord.merchantUid || merchantUid,
    reason,
    amount: requestedCancelAmount,
    checksum: paidAmount > 0 ? paidAmount : undefined,
  });

  const canceledPayment = await Payment.findByIdAndUpdate(
    paymentRecord._id,
    {
      $set: {
        status: "cancelled",
        rawPortOne: canceledPortOne,
        paymentMethod: normalizePaymentMethod(canceledPortOne?.pay_method || paymentRecord.paymentMethod),
        failureCode: null,
        failureMessage: null,
        failureStage: null,
      },
    },
    { new: true },
  ).lean();

  let updatedPoints = Number(user.points || 0);
  if (pointsToRollback > 0) {
    const updatedUser = await User.findByIdAndUpdate(
      authCheck.auth.userId,
      { $inc: { points: -pointsToRollback } },
      { new: true, projection: { points: 1 } },
    ).lean();

    updatedPoints = Number(updatedUser?.points || 0);

    await PointHistory.create({
      userId: authCheck.auth.userId,
      kind: "deduct",
      delta: -pointsToRollback,
      balanceAfter: updatedPoints,
      reason: "결제 취소(환불)로 포인트 회수",
      paymentId: paymentRecord._id,
      impUid: paymentRecord.impUid,
      merchantUid: paymentRecord.merchantUid,
      metadata: {
        source: "cancel",
        cancelAmount: Number(canceledPortOne?.cancel_amount || requestedCancelAmount || paidAmount || 0),
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    message: "결제가 취소되었습니다.",
    idempotent: false,
    user: {
      id: String(authCheck.auth.userId),
      points: updatedPoints,
    },
    payment: formatPaymentResponse(canceledPayment),
  });
}

async function handleReportFailure(request) {
  const authCheck = requireAuth(request);
  if (!authCheck.ok) return authCheck.response;

  const body = await parseJsonSafe(request);
  const merchantUid = String(body?.merchantUid || body?.merchant_uid || "").trim() || undefined;
  const impUid = String(body?.impUid || body?.paymentId || "").trim() || undefined;
  const reasonCode = String(body?.reasonCode || "client_failure").trim().slice(0, 80);
  const reasonMessage = String(body?.reasonMessage || "결제가 사용자 측에서 완료되지 않았습니다.").trim().slice(0, 500);

  const Payment = await getPaymentModel();
  const payment = await findPaymentRecord(Payment, impUid, merchantUid);

  if (payment && String(payment.userId) !== String(authCheck.auth.userId)) {
    return NextResponse.json({ message: "본인 결제 건만 실패 보고할 수 있습니다." }, { status: 403 });
  }

  if (payment && payment.status !== "success") {
    await Payment.findByIdAndUpdate(payment._id, {
      $set: {
        status: reasonCode === "cancelled" ? "cancelled" : "failed",
        failureCode: reasonCode,
        failureMessage: reasonMessage,
        failureStage: "client_report",
        lastErrorAt: new Date(),
      },
    }).catch(() => {});
  }

  await writeFailureLog({
    request,
    userId: authCheck.auth.userId,
    impUid,
    merchantUid,
    source: "client",
    stage: "client_report",
    code: reasonCode,
    message: reasonMessage,
    status: 200,
    payload: body,
  });

  return NextResponse.json({ ok: true, message: "결제 실패 보고가 기록되었습니다." });
}

async function handleMe(request) {
  const authCheck = requireAuth(request);
  if (!authCheck.ok) return authCheck.response;

  const User = await getUserModel();
  const Payment = await getPaymentModel();
  const PointHistory = await getPointHistoryModel();

  const user = await User.findById(authCheck.auth.userId)
    .select("name email points")
    .lean();

  if (!user) {
    return NextResponse.json({ message: "사용자 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const [recentPayments, pointHistories] = await Promise.all([
    Payment.find({ userId: authCheck.auth.userId }).sort({ createdAt: -1 }).limit(10).lean(),
    PointHistory.find({ userId: authCheck.auth.userId }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  return NextResponse.json({
    user: {
      id: String(authCheck.auth.userId),
      name: user.name,
      email: user.email,
      points: Number(user.points || 0),
    },
    payments: recentPayments.map((payment) => formatPaymentResponse(payment)),
    pointHistories: pointHistories.map((entry) => ({
      id: String(entry._id),
      kind: entry.kind,
      delta: Number(entry.delta || 0),
      balanceAfter: Number(entry.balanceAfter || 0),
      reason: entry.reason,
      featureKey: entry.featureKey,
      createdAt: entry.createdAt,
    })),
  });
}

async function handleBillingSendOtp(request) {
  const authCheck = requireAuth(request);
  if (!authCheck.ok) return authCheck.response;

  const body = await parseJsonSafe(request);
  const phone = normalizePhoneNumber(body?.phone);
  const carrier = normalizeCarrier(body?.carrier);

  if (phone.length < 10 || phone.length > 11) {
    return NextResponse.json({ message: "휴대폰 번호를 정확히 입력해 주세요." }, { status: 400 });
  }

  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const otpSessionId = `otp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const key = `${authCheck.auth.userId}:${phone}`;

  billingOtpStore.set(key, {
    otpCode,
    otpSessionId,
    expiresAt,
    carrier,
  });

  return NextResponse.json({
    ok: true,
    message: "인증번호가 발송되었습니다.",
    otpSessionId,
    expiresIn: 300,
    ...(process.env.NODE_ENV !== "production" ? { devOtpCode: otpCode } : {}),
  });
}

async function handleBillingRegister(request) {
  const authCheck = requireAuth(request);
  if (!authCheck.ok) return authCheck.response;

  const body = await parseJsonSafe(request);
  const cardNumber = String(body?.cardNumber || "").replace(/\D/g, "");
  const expMonth = String(body?.expMonth || "").replace(/\D/g, "").slice(0, 2);
  const expYear = String(body?.expYear || "").replace(/\D/g, "").slice(0, 4);
  const buyerName = String(body?.buyerName || "").trim();
  const birthDate = String(body?.birthDate || "").replace(/\D/g, "").slice(0, 6);
  const phone = normalizePhoneNumber(body?.phone);
  const carrier = normalizeCarrier(body?.carrier);
  const otp = String(body?.otp || "").trim();

  if (cardNumber.length < 15 || cardNumber.length > 16) {
    return NextResponse.json({ message: "카드 번호를 정확히 입력해 주세요." }, { status: 400 });
  }
  if (expMonth.length !== 2 || Number(expMonth) < 1 || Number(expMonth) > 12) {
    return NextResponse.json({ message: "카드 만료 월(expMonth)이 올바르지 않습니다." }, { status: 400 });
  }
  if (expYear.length !== 2 && expYear.length !== 4) {
    return NextResponse.json({ message: "카드 만료 연도(expYear)가 올바르지 않습니다." }, { status: 400 });
  }
  if (!buyerName) {
    return NextResponse.json({ message: "이름을 입력해 주세요." }, { status: 400 });
  }
  if (birthDate.length !== 6) {
    return NextResponse.json({ message: "생년월일 6자리를 입력해 주세요." }, { status: 400 });
  }
  if (phone.length < 10 || phone.length > 11) {
    return NextResponse.json({ message: "휴대폰 번호를 정확히 입력해 주세요." }, { status: 400 });
  }
  if (otp.length < 4) {
    return NextResponse.json({ message: "인증번호를 입력해 주세요." }, { status: 400 });
  }

  const otpKey = `${authCheck.auth.userId}:${phone}`;
  const otpRecord = billingOtpStore.get(otpKey);

  if (otpRecord) {
    if (Date.now() > Number(otpRecord.expiresAt || 0)) {
      billingOtpStore.delete(otpKey);
      return NextResponse.json({ message: "인증번호 유효시간이 만료되었습니다. 다시 요청해 주세요." }, { status: 400 });
    }

    const otpMatched = String(otpRecord.otpCode || "") === otp;
    const canUseDevBypass = process.env.NODE_ENV !== "production" && otp === "000000";
    if (!otpMatched && !canUseDevBypass) {
      return NextResponse.json({ message: "인증번호가 올바르지 않습니다." }, { status: 400 });
    }
  }

  try {
    const issued = await issueBillingKeyWithPortOne({
      userId: authCheck.auth.userId,
      cardNumber,
      expMonth,
      expYear,
      birthDate,
      buyerName,
      phone,
      carrier,
    });

    billingOtpStore.delete(otpKey);

    return NextResponse.json({
      ok: true,
      message: "카드 등록이 완료되었습니다.",
      billingKey: issued.billingKey,
      cardName: issued.cardName,
      cardNumber: issued.cardNumber,
      registeredAt: new Date().toISOString(),
    });
  } catch (error) {
    const allowFallback = getDevFallbackEnabled();
    if (allowFallback) {
      const fallbackBillingKey = `test_bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      billingOtpStore.delete(otpKey);
      return NextResponse.json({
        ok: true,
        message: "개발 테스트 모드로 카드 등록을 완료했습니다.",
        billingKey: fallbackBillingKey,
        cardName: "테스트 등록 카드",
        cardNumber: maskCardNumber(cardNumber),
        registeredAt: new Date().toISOString(),
        testMode: true,
      });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : "카드 등록에 실패했습니다." },
      { status: 502 },
    );
  }
}

function normalizeSubPath(rawPath) {
  const path = String(rawPath || "").trim();
  if (!path) return "/";
  if (!path.startsWith("/")) return `/${path}`;
  return path;
}

function methodNotAllowed() {
  return NextResponse.json({ message: "허용되지 않은 요청 메서드입니다." }, { status: 405 });
}

export async function handleDirectPayments(request, rawSubPath = "/") {
  const subPath = normalizeSubPath(rawSubPath);
  const method = String(request.method || "GET").toUpperCase();

  try {
    if (subPath === "/prepare") {
      if (method !== "POST") return methodNotAllowed();
      return await handlePrepare(request);
    }

    if (subPath === "/confirm") {
      if (method !== "POST") return methodNotAllowed();
      return await handleConfirm(request);
    }

    if (subPath === "/cancel") {
      if (method !== "POST") return methodNotAllowed();
      return await handleCancel(request);
    }

    if (subPath === "/report-failure") {
      if (method !== "POST") return methodNotAllowed();
      return await handleReportFailure(request);
    }

    if (subPath === "/me") {
      if (method !== "GET") return methodNotAllowed();
      return await handleMe(request);
    }

    if (subPath === "/billing/send-otp") {
      if (method !== "POST") return methodNotAllowed();
      return await handleBillingSendOtp(request);
    }

    if (subPath === "/billing/register") {
      if (method !== "POST") return methodNotAllowed();
      return await handleBillingRegister(request);
    }

    if (subPath.startsWith("/billing")) {
      return NextResponse.json(
        {
          message: "지원하지 않는 billing API 경로입니다.",
          code: "billing_not_supported_path",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "지원하지 않는 결제 API 경로입니다." }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "결제 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
