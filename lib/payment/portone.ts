import { authFetch } from "../../app/_lib/auth-client";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import checkoutEntry from "@/js/core/checkout-entry.js";

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
  /** 결제창 UI 언어. 값의 범위는 js/core/checkout-entry.js 의 pgWindowLocale 머리주석 참고. */
  locale?: "KO_KR" | "EN_US";
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
/* 클릭 핸들러 안에서 기다릴 수 있는 상한. 이보다 오래 끌면 브라우저가 사용자 제스처로 보지 않아
   결제창 팝업이 차단된다 — 기다린 끝에 창이 안 열리는 것이 가장 나쁜 결과다.
   모달을 열 때 SDK 를 미리 받아 두므로(예열), 클릭 시점에는 대개 이미 준비돼 있다. */
const SDK_READY_TIMEOUT_MS = 1500;
const PORTONE_CURRENCY = "CURRENCY_KRW";
const EMAIL_REGEX = /^[^@\s]+@[^\s@]+\.[^\s@]+$/;

const PORTONE_TEXT_TRANSLATIONS: Partial<Record<LoadingLocale, Record<string, string>>> = {
  ko: {
    configFetchFailed: "PortOne V2 결제 설정 조회를 실패했습니다.",
    configMissing: "결제 설정이 준비되지 않았습니다.",
    channelMissing: "결제 채널 설정이 준비되지 않았습니다.",
    browserRequired: "브라우저 환경이 아닙니다.",
    sdkLoadFailed: "PortOne V2 SDK 로드에 실패했습니다.",
    defaultCustomerName: "고객",
    paymentStopped: "결제가 중단되었습니다.",
    clientOnly: "브라우저 환경에서만 결제할 수 있습니다.",
    invalidAmount: "결제 금액이 유효하지 않습니다.",
    invalidCustomer: "결제 고객 정보가 유효하지 않습니다.",
    emptyOrderName: "상품명이 비어있습니다.",
    missingPaymentId: "결제 응답 paymentId가 없습니다.",
    requestFailed: "결제창 호출 중 오류가 발생했습니다.",
  },
  en: {
    configFetchFailed: "Failed to fetch PortOne V2 payment settings.",
    configMissing: "Payment settings are not ready.",
    channelMissing: "Payment channel settings are not ready.",
    browserRequired: "Payment is only available in a browser environment.",
    sdkLoadFailed: "Failed to load the PortOne V2 SDK.",
    defaultCustomerName: "Customer",
    paymentStopped: "Payment was stopped.",
    clientOnly: "Payment is only available in a browser environment.",
    invalidAmount: "The payment amount is invalid.",
    invalidCustomer: "The payment customer information is invalid.",
    emptyOrderName: "The product name is empty.",
    missingPaymentId: "The payment response did not include a paymentId.",
    requestFailed: "An error occurred while opening the payment window.",
  },
  ja: {
    configFetchFailed: "PortOne V2決済設定の取得に失敗しました。",
    configMissing: "決済設定がまだ準備されていません。",
    channelMissing: "決済チャネル設定がまだ準備されていません。",
    browserRequired: "決済はブラウザ環境でのみ利用できます。",
    sdkLoadFailed: "PortOne V2 SDKの読み込みに失敗しました。",
    defaultCustomerName: "お客様",
    paymentStopped: "決済が中断されました。",
    clientOnly: "決済はブラウザ環境でのみ利用できます。",
    invalidAmount: "決済金額が正しくありません。",
    invalidCustomer: "決済顧客情報が正しくありません。",
    emptyOrderName: "商品名が空です。",
    missingPaymentId: "決済レスポンスにpaymentIdがありません。",
    requestFailed: "決済画面の呼び出し中にエラーが発生しました。",
  },
  "zh-CN": {
    configFetchFailed: "PortOne V2 支付设置获取失败。",
    configMissing: "支付设置尚未准备好。",
    channelMissing: "支付渠道设置尚未准备好。",
    browserRequired: "只能在浏览器环境中支付。",
    sdkLoadFailed: "PortOne V2 SDK 加载失败。",
    defaultCustomerName: "客户",
    paymentStopped: "支付已中断。",
    clientOnly: "只能在浏览器环境中支付。",
    invalidAmount: "支付金额无效。",
    invalidCustomer: "支付客户信息无效。",
    emptyOrderName: "商品名为空。",
    missingPaymentId: "支付响应中没有 paymentId。",
    requestFailed: "调用支付窗口时发生错误。",
  },
  "zh-TW": {
    configFetchFailed: "PortOne V2 付款設定取得失敗。",
    configMissing: "付款設定尚未準備好。",
    channelMissing: "付款渠道設定尚未準備好。",
    browserRequired: "只能在瀏覽器環境中付款。",
    sdkLoadFailed: "PortOne V2 SDK 載入失敗。",
    defaultCustomerName: "客戶",
    paymentStopped: "付款已中斷。",
    clientOnly: "只能在瀏覽器環境中付款。",
    invalidAmount: "付款金額無效。",
    invalidCustomer: "付款客戶資訊無效。",
    emptyOrderName: "商品名稱為空。",
    missingPaymentId: "付款回應中沒有 paymentId。",
    requestFailed: "呼叫付款視窗時發生錯誤。",
  },
};

type PortoneTextKey = keyof NonNullable<(typeof PORTONE_TEXT_TRANSLATIONS)["ko"]>;

function portoneText(key: PortoneTextKey): string {
  const locale = getCurrentLoadingLocale();
  const fallback = PORTONE_TEXT_TRANSLATIONS.ko!;
  return PORTONE_TEXT_TRANSLATIONS[locale]?.[key] || fallback[key];
}

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
    throw new Error((payload as { message?: string }).message || portoneText("configFetchFailed"));
  }
  const storeId = normalizeId(payload.storeId);
  const channelKey = normalizeId(payload.channelKey);
  if (!storeId) throw new Error(portoneText("configMissing"));
  if (!channelKey) throw new Error(portoneText("channelMissing"));
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
      reject(new Error(portoneText("browserRequired")));
      return;
    }
    if (window.PortOne?.requestPayment) {
      resolve();
      return;
    }

    /* 🔴 `load` 이벤트에만 기대면 안 된다. 이미 로드를 끝낸 <script> 에 리스너를 달면 그 이벤트는
       **영영 울리지 않는다.** 예전에는 태그가 이미 있을 때 리스너만 걸고 return 했고 타임아웃도
       없어서, 그 경우 이 Promise 가 영원히 풀리지 않았다 — 사용자에게는 "단건결제를 눌렀는데
       결제창이 안 뜬다"로 보인다. 태그가 이미 있었는지에 따라 갈리므로 간헐적이었다.
       그래서 준비 여부를 직접 폴링한다. load/error 리스너는 첫 로드 경로의 가장 빠른 신호라 함께 둔다.

       상한도 짧아야 한다. 이 함수는 클릭 핸들러 안에서 돌고, 오래 기다리면 브라우저가 더는
       사용자 제스처로 보지 않아 팝업이 차단된다 — 기다린 끝에 결제창이 안 열리는 최악이 된다.
       늦으면 조용히 멈추는 대신 실패로 알리는 편이 낫다. */
    let settled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let capTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (capTimer) clearTimeout(capTimer);
      if (ok && window.PortOne?.requestPayment) resolve();
      else reject(new Error(portoneText("sdkLoadFailed")));
    };

    const existingScript = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript || document.createElement("script");
    if (!existingScript) {
      script.id = SDK_SCRIPT_ID;
      script.src = "https://cdn.portone.io/v2/browser-sdk.js";
      script.async = true;
    }

    script.addEventListener("load", () => finish(true), { once: true });
    script.addEventListener("error", () => {
      // 죽은 태그를 남기면 다음 시도가 그것을 물려받아 새 요청 없이 상한까지 기다린다.
      try { script.parentNode?.removeChild(script); } catch { /* 제거 실패는 무시 */ }
      finish(false);
    }, { once: true });

    // 이미 로드가 끝난 태그를 구제하는 경로. 50ms 는 클릭 반응으로 체감되지 않는 간격이다.
    pollTimer = setInterval(() => { if (window.PortOne?.requestPayment) finish(true); }, 50);
    capTimer = setTimeout(() => finish(false), SDK_READY_TIMEOUT_MS);

    if (!existingScript) document.body.appendChild(script);
  });
}

export function buildPortOneCustomerFromAuthUser(user: AuthPortOneUser | null, paymentId: string): PortOneCustomer {
  const merged = user || {};
  const phoneNumber = normalizePhone(merged);
  return {
    customerId: buildCustomerId(merged, paymentId),
    fullName: String(merged.name || portoneText("defaultCustomerName")).trim() || portoneText("defaultCustomerName"),
    email: normalizeEmail(merged.email),
    ...(phoneNumber ? { phoneNumber } : {}),
  };
}

function getPaymentErrorMessage(response: PortOnePaymentResponse): string {
  return String(response.message || response.error_msg || response.errorMsg || portoneText("paymentStopped")).trim();
}

export async function requestPortOneSinglePayment(
  options: PortOnePaymentRequestOptions,
): Promise<PortOneSinglePaymentRequestResult> {
  if (typeof window === "undefined") {
    return { ok: false, code: "CLIENT_ENV_INVALID", message: portoneText("clientOnly") };
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
    return { ok: false, message: portoneText("invalidAmount") };
  }

  if (!customer?.fullName || !customer.email) {
    return { ok: false, message: portoneText("invalidCustomer") };
  }

  if (!hasOrderName) {
    return { ok: false, message: portoneText("emptyOrderName") };
  }

  try {
    // SDK 로드와 config 조회는 상호 독립이라 병렬로 진행해 단건결제 창 오픈 지연을 줄인다(순차 2왕복 → 병렬).
    const [, config] = await Promise.all([ensurePortoneSdk(), fetchConfig(apiBase)]);
    const storeId = manualStoreId?.trim() || config.storeId;
    const channelKey = manualChannelKey?.trim() || config.channelKey;

    if (!storeId) {
      return { ok: false, message: portoneText("configMissing") };
    }
    if (!channelKey) {
      return { ok: false, message: portoneText("channelMissing") };
    }

    const requestData: PortOnePaymentRequest = {
      storeId,
      channelKey,
      paymentId: paymentIdCandidate,
      orderName: String(orderName).trim(),
      totalAmount: amount,
      currency: config.currency || PORTONE_CURRENCY,
      payMethod: config.payMethod || "CARD",
      // 🔴 안 보내면 PG 가 한국어 결제창을 연다 — 결제창까지 영어로 온 사용자가
      //    마지막 화면에서 한국어를 만난다. 값의 범위는 PG 가 정한다(pgWindowLocale 머리주석).
      locale: checkoutEntry.pgWindowLocale(),
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
      locale: requestData.locale,
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
      return { ok: false, message: portoneText("missingPaymentId") };
    }

    return { ok: true, paymentId: finalPaymentId, request: requestData, response };
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : portoneText("requestFailed");
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
