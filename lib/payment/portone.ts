import { authFetch } from "../../app/_lib/auth-client";

type AuthPortOneUser = {
  id?: string;
  userId?: string;
  uid?: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
};

type PortOnePaymentRequestOptions = {
  apiBase: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  redirectPath: string;
  customer: PortOneCustomer;
  customData: Record<string, unknown>;
  storeId?: string;
  channelKey?: string;
};

export type PortOneCustomer = {
  customerId: string;
  fullName: string;
  phoneNumber?: string;
  email: string;
};

export type PortOnePaymentResponse = {
  paymentId?: string;
  transactionType?: string;
  code?: string;
  message?: string;
  error_msg?: string;
  errorMsg?: string;
};

export type PortOnePaymentConfig = {
  storeId: string;
  channelKey: string;
  noticeUrl?: string;
  currency?: "CURRENCY_KRW" | "KRW" | string;
  payMethod?: string;
  message?: string;
};

type PortOnePaymentRequest = {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: string;
  payMethod: string;
  redirectUrl: string;
  customer: PortOneCustomer;
  customData: Record<string, unknown>;
  noticeUrls?: string[];
};

export type PortOneSinglePaymentRequestResult =
  | { ok: true; paymentId: string; request: PortOnePaymentRequest; response: PortOnePaymentResponse }
  | { ok: false; code?: string; message: string };

declare global {
  interface Window {
    PortOne?: {
      requestPayment: (request: PortOnePaymentRequest) => Promise<PortOnePaymentResponse>;
    };
  }
}

const SDK_SCRIPT_ID = "portone-v2-sdk";
const PORTONE_CURRENCY = "CURRENCY_KRW";
const EMAIL_REGEX = /^[^@\s]+@[^\s@]+\.[^\s@]+$/;

function normalizeAmount(value: number): number {
  const next = Number(value);
  if (!Number.isFinite(next) || next <= 0) return NaN;
  return Math.floor(next);
}

function normalizeId(value: string): string {
  return String(value || "").trim();
}

function isValidPaymentId(value: string): boolean {
  return Boolean(value) && !/\s/.test(value) && /^[\w.-]+$/.test(value);
}

function makeFallbackPaymentId(): string {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `cd_${Date.now()}_${suffix.replace(/-/g, "")}`;
}

function buildPaymentId(paymentId: string): string {
  const normalized = normalizeId(paymentId);
  if (!isValidPaymentId(normalized)) {
    if (normalized) {
      console.error("[portone] invalid paymentId format", {
        hasPaymentId: Boolean(normalized),
        hasWhitespace: /\s/.test(normalized),
      });
    }
    return makeFallbackPaymentId();
  }
  return normalized;
}

function normalizeCurrency(input?: string): string {
  return String(input || PORTONE_CURRENCY).toUpperCase() === "KRW"
    ? PORTONE_CURRENCY
    : (input || PORTONE_CURRENCY);
}

function normalizePayMethod(input?: string): string {
  const method = String(input || "CARD").trim().toUpperCase();
  return method || "CARD";
}

function safeParseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

function buildCustomerId(user: AuthPortOneUser | null, paymentId: string): string {
  return String(user?.id || user?.userId || user?.uid || user?._id || paymentId || "customer").trim();
}

function normalizeEmail(rawEmail?: string): string {
  const email = String(rawEmail || "").trim();
  if (EMAIL_REGEX.test(email)) return email;
  const fallbackBase = `code-destiny-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  return `${fallbackBase}@code-destiny.local`;
}

function normalizePhone(user: AuthPortOneUser): string | undefined {
  const source = String(user.phoneNumber || user.phone || "").trim();
  const cleaned = source.replace(/\D+/g, "");
  return cleaned || undefined;
}

async function fetchConfig(apiBase: string) {
  const response = await authFetch(
    `${apiBase}/api/payments/config`,
    {
      method: "GET",
      credentials: "include",
    },
    {
      retryOn401: false,
      apiBase,
    },
  );
  const payload = await safeParseJson<PortOnePaymentConfig>(response);
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message || "PortOne V2 결제 설정 조회를 실패했습니다.");
  }
  const storeId = normalizeId(payload.storeId);
  const channelKey = normalizeId(payload.channelKey);
  if (!storeId) throw new Error("결제 설정이 준비되지 않았습니다.");
  if (!channelKey) throw new Error("결제 채널 설정이 준비되지 않았습니다.");
  return {
    storeId,
    channelKey,
    noticeUrl: payload.noticeUrl,
    currency: normalizeCurrency(payload.currency || PORTONE_CURRENCY),
    payMethod: normalizePayMethod(payload.payMethod),
  };
}

function ensurePortoneSdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저 환경이 아닙니다."));
      return;
    }
    if (window.PortOne?.requestPayment) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => {
          if (window.PortOne?.requestPayment) resolve();
          else reject(new Error("PortOne V2 SDK 로드에 실패했습니다."));
        },
        { once: true },
      );
      existingScript.addEventListener(
        "error",
        () => {
          reject(new Error("PortOne V2 SDK 로드에 실패했습니다."));
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = SDK_SCRIPT_ID;
    script.src = "https://cdn.portone.io/v2/browser-sdk.js";
    script.async = true;
    script.onload = () => {
      if (window.PortOne?.requestPayment) resolve();
      else reject(new Error("PortOne V2 SDK 로드에 실패했습니다."));
    };
    script.onerror = () => reject(new Error("PortOne V2 SDK 로드에 실패했습니다."));
    document.body.appendChild(script);
  });
}

export function buildPortOneCustomerFromAuthUser(user: AuthPortOneUser | null, paymentId: string): PortOneCustomer {
  const merged = user || {};
  const phoneNumber = normalizePhone(merged);
  return {
    customerId: buildCustomerId(merged, paymentId),
    fullName: String(merged.name || "고객").trim() || "고객",
    email: normalizeEmail(merged.email),
    ...(phoneNumber ? { phoneNumber } : {}),
  };
}

function getPaymentErrorMessage(response: PortOnePaymentResponse): string {
  return String(response.message || response.error_msg || response.errorMsg || "결제가 중단되었습니다.").trim();
}

export async function requestPortOneSinglePayment(
  options: PortOnePaymentRequestOptions,
): Promise<PortOneSinglePaymentRequestResult> {
  if (typeof window === "undefined") {
    return { ok: false, code: "CLIENT_ENV_INVALID", message: "브라우저 환경에서만 결제할 수 있습니다." };
  }

  const {
    apiBase,
    paymentId,
    orderName,
    totalAmount,
    redirectPath,
    customer,
    customData,
    storeId: manualStoreId,
    channelKey: manualChannelKey,
  } = options;

  const hasOrderName = Boolean(String(orderName || "").trim());
  const hasCustomerEmail = Boolean(customer?.email);
  const amount = normalizeAmount(totalAmount);
  const paymentIdCandidate = buildPaymentId(paymentId);

  console.info("[portone] request precheck", {
    hasStoreId: Boolean(manualStoreId),
    hasChannelKey: Boolean(manualChannelKey),
    hasPaymentId: Boolean(paymentIdCandidate),
    hasOrderName,
    hasAmount: Number.isFinite(amount),
    hasCustomerEmail,
    hasCustomerName: Boolean(customer?.fullName),
  });

  if (!Number.isFinite(amount)) {
    return { ok: false, message: "결제 금액이 유효하지 않습니다." };
  }

  if (!customer?.fullName || !customer.email) {
    return { ok: false, message: "결제 고객 정보가 유효하지 않습니다." };
  }

  if (!hasOrderName) {
    return { ok: false, message: "상품명이 비어있습니다." };
  }

  try {
    await ensurePortoneSdk();
    const config = await fetchConfig(apiBase);
    const storeId = manualStoreId?.trim() || config.storeId;
    const channelKey = manualChannelKey?.trim() || config.channelKey;

    if (!storeId) {
      return { ok: false, message: "결제 설정이 준비되지 않았습니다." };
    }
    if (!channelKey) {
      return { ok: false, message: "결제 채널 설정이 준비되지 않았습니다." };
    }

    const requestData: PortOnePaymentRequest = {
      storeId,
      channelKey,
      paymentId: paymentIdCandidate,
      orderName: String(orderName).trim(),
      totalAmount: amount,
      currency: config.currency || PORTONE_CURRENCY,
      payMethod: config.payMethod || "CARD",
      redirectUrl: new URL(redirectPath, window.location.origin).toString(),
      customer,
      customData,
    };
    if (config.noticeUrl) requestData.noticeUrls = [config.noticeUrl];

    console.info("[portone] requestPayment params", {
      hasStoreId: Boolean(requestData.storeId),
      hasChannelKey: Boolean(requestData.channelKey),
      hasPaymentId: Boolean(requestData.paymentId),
      hasAmount: Number.isFinite(requestData.totalAmount),
      hasOrderName: Boolean(requestData.orderName),
      hasCustomerEmail: Boolean(requestData.customer?.email),
    });

    const response = await window.PortOne!.requestPayment(requestData);
    if (response?.code) {
      return {
        ok: false,
        code: response.code,
        message: getPaymentErrorMessage(response),
      };
    }

    const finalPaymentId = String(response?.paymentId || "").trim();
    if (!finalPaymentId) {
      return { ok: false, message: "결제 응답 paymentId가 없습니다." };
    }

    return { ok: true, paymentId: finalPaymentId, request: requestData, response };
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "결제창 호출 중 오류가 발생했습니다.";
    console.error("[portone] request failed", {
      hasStoreId: Boolean(manualStoreId),
      hasChannelKey: Boolean(manualChannelKey),
      hasPaymentId: Boolean(paymentIdCandidate),
      hasAmount: Number.isFinite(amount),
      hasOrderName,
      hasCustomerEmail,
      reason,
    });
    return { ok: false, message: reason };
  }
}
