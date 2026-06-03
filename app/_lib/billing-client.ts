import { authFetch } from "@/app/_lib/auth-client";
import { normalizeBaseUrl } from "@/app/_lib/api-config";
import {
  beginPaidAttempt,
  markPaidAttemptCallbackReturned,
  markPaidAttemptFailed,
  markPaidAttemptPaymentRequested,
  markPaidAttemptPaymentSucceeded,
} from "@/app/_lib/paid-attempt-session";

type BillingError = {
  code: string;
  message: string;
  debugMessage?: string;
};

type BillingResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
  error: BillingError | null;
  raw: Record<string, unknown>;
};

type BillingFeaturePricing = {
  categoryKey: string;
  categoryLabel?: string;
  subFeatureKey: string;
  featureKey: string;
  cost: number;
  coinPrice?: number;
  displayUnit?: string;
  displayPrice?: string;
  reason: string;
  currency?: string;
  cashPrice?: number | null;
  amountKRW?: number | null;
  paymentMode?: string;
  coinDisplayOnly?: boolean;
};

type RuntimeApiWindow = Window & {
  CODE_DESTINY_API_BASE_URL?: string;
  _cdSetCoinGateOverlay?: (show: boolean, message?: string) => void;
  __cdPaidFeatureGate?: {
    close?: (requestId?: string) => void;
  };
};

type PaidFeatureGateRuntimeStatus =
  | "opening"
  | "checkingEntitlement"
  | "hasEntitlement"
  | "noEntitlement"
  | "loadingProducts"
  | "readyToPay"
  | "paymentProcessing"
  | "paymentSuccess"
  | "paymentFailed"
  | "error";

type PaidFeatureGateRuntimeDetail = {
  action?: "open" | "update" | "close";
  featureId?: string;
  featureKey?: string;
  requestId?: string;
  title?: string;
  message?: string;
  status?: PaidFeatureGateRuntimeStatus;
  cost?: number;
  startedAt?: number;
};

const billingCoinGateInFlight = new Map<string, {
  requestId: string;
  promise: Promise<BillingResult<{
  pricing: BillingFeaturePricing;
  consume: Record<string, unknown>;
  balance: number | null;
  user: Record<string, unknown> | null;
}>>;
}>();

export type ServiceExecutionStatus = "pending" | "success" | "failed" | "refunded" | "cancelled";

export type ServiceExecutionPayload = {
  executionKey: string;
  featureKey?: string;
  cost?: number;
  sourceTransactionId?: string;
  timeoutSeconds?: number;
  maxRetries?: number;
  reasonCode?: string;
  reasonMessage?: string;
  metadata?: Record<string, unknown>;
  payment?: {
    impUid?: string;
    merchantUid?: string;
    paymentId?: string;
    cancelEligible?: boolean;
  };
};

export type ServiceExecutionData = {
  id: string;
  executionKey: string;
  featureKey: string;
  cost: number;
  sourceTransactionId: string;
  status: ServiceExecutionStatus;
  timeoutAt: string | null;
  nextRetryAt: string | null;
  retryCount: number;
  completedAt: string | null;
  compensatedAt: string | null;
  reasonCode: string;
  reasonMessage: string;
  compensation: {
    coinRefunded: boolean;
    coinRefundTxId: string;
    paymentCancelled: boolean;
  };
};

function toText(value: unknown): string {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function collectBillingFallbackBases(): string[] {
  const fromEnv = [
    process.env.NEXT_PUBLIC_AUTH_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  ]
    .map((candidate) => normalizeBaseUrl(candidate))
    .filter(Boolean);

  const fromRuntime = typeof window !== "undefined"
    ? [normalizeBaseUrl((window as RuntimeApiWindow).CODE_DESTINY_API_BASE_URL)]
    : [];

  const sameOrigin = typeof window !== "undefined"
    ? normalizeBaseUrl(window.location.origin)
    : "";

  return Array.from(new Set([...fromRuntime, ...fromEnv]))
    .filter((base) => Boolean(base) && base !== sameOrigin);
}

async function authFetchBilling(path: string, init: RequestInit): Promise<Response> {
  const primary = await authFetch(path, init);
  if (primary.ok || primary.status !== 404) return primary;

  const fallbackBases = collectBillingFallbackBases();
  if (!fallbackBases.length) return primary;

  for (const apiBase of fallbackBases) {
    const retried = await authFetch(path, init, { apiBase });
    if (retried.ok || retried.status !== 404) return retried;
  }

  return primary;
}

async function parseBillingResponse<T>(response: Response): Promise<BillingResult<T>> {
  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch (e) {
    payload = {};
  }

  const ok = response.ok && payload?.ok === true;
  const message = toText(payload?.message) || (ok ? "요청이 성공했습니다." : "요청 처리에 실패했습니다.");
  const errorObject = payload?.error && typeof payload.error === "object"
    ? (payload.error as Record<string, unknown>)
    : null;

  const error: BillingError | null = ok
    ? null
    : {
      code: toText(errorObject?.code || payload?.code || "SERVER_ERROR") || "SERVER_ERROR",
      message: toText(errorObject?.message || payload?.message || "요청 처리에 실패했습니다.") || "요청 처리에 실패했습니다.",
      debugMessage: toText(errorObject?.debugMessage),
    };

  return {
    ok,
    status: response.status,
    data: ok ? ((payload?.data as T) ?? null) : null,
    message,
    error,
    raw: payload,
  };
}

function toQuery(input: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    const text = toText(value);
    if (text) params.set(key, text);
  });
  return params.toString();
}

function runtimeNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function emitPaidFeatureGate(action: "open" | "update" | "close", detail: PaidFeatureGateRuntimeDetail) {
  if (typeof window === "undefined") return;
  const featureId = toText(detail.featureId || detail.featureKey) || "paid-feature";
  const payload: PaidFeatureGateRuntimeDetail = {
    ...detail,
    action,
    featureId,
    featureKey: toText(detail.featureKey || featureId),
    startedAt: Number.isFinite(Number(detail.startedAt)) ? Number(detail.startedAt) : runtimeNow(),
  };
  const status = String(payload.status || "checkingEntitlement");
  const copyFromStatus: Record<PaidFeatureGateRuntimeStatus, string> = {
    opening: "결제 상태를 확인하고 있습니다.",
    checkingEntitlement: "결제 진행 중입니다. 잠시만 기다려 주세요.",
    hasEntitlement: "이용권 이용 상태가 확인되어 계속 진행합니다.",
    noEntitlement: "결제가 필요합니다. 결제 페이지로 이동해 주세요.",
    loadingProducts: "결제 상품 정보를 확인하고 있습니다.",
    readyToPay: "결제 수단을 확인해 주세요.",
    paymentProcessing: "결제 처리 중입니다. 잠시만 기다려 주세요.",
    paymentSuccess: "결제가 완료되었습니다.",
    paymentFailed: "결제 처리에 실패했습니다.",
    error: "결제 처리 중 오류가 발생했습니다.",
  };
  const overlayMessage = String(payload.message || copyFromStatus[status as PaidFeatureGateRuntimeStatus] || "결제 진행 중입니다.").trim();
  try {
    if (typeof performance !== "undefined" && typeof performance.mark === "function") {
      performance.mark(`cd-paid-feature-gate-${action}`);
    }
  } catch (_) {}
  const runtimeWindow = window as RuntimeApiWindow;
  if (action === "close") {
    if (typeof runtimeWindow._cdSetCoinGateOverlay === "function") {
      runtimeWindow._cdSetCoinGateOverlay(false);
      return;
    }
    if (typeof runtimeWindow.__cdPaidFeatureGate?.close === "function") {
      runtimeWindow.__cdPaidFeatureGate.close(payload.requestId);
      return;
    }
  } else if (typeof runtimeWindow._cdSetCoinGateOverlay === "function") {
    runtimeWindow._cdSetCoinGateOverlay(true, overlayMessage);
    if (status === "hasEntitlement" || status === "paymentSuccess") {
      window.setTimeout(() => {
        runtimeWindow._cdSetCoinGateOverlay?.(false);
      }, 900);
    }
    return;
  }
  window.dispatchEvent(new CustomEvent("cd:paid-feature-gate", { detail: payload }));
}

function resolvePaidFeatureInFlightKey(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  requestId?: string;
  reportId?: string;
  sessionId?: string;
  reportSessionId?: string;
}) {
  const featureId = toText(input.featureKey || input.subFeatureKey || input.categoryKey || "coin-gate");
  return featureId;
}

export function openPaidFeatureGate(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  requestId?: string;
  cost?: number;
  title?: string;
  message?: string;
  status?: PaidFeatureGateRuntimeStatus;
}) {
  const featureId = toText(input.featureKey || input.subFeatureKey || input.categoryKey || "paid-feature");
  const requestId = toText(input.requestId || `${featureId}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  emitPaidFeatureGate("open", {
    featureId,
    featureKey: featureId,
    requestId,
    title: input.title,
    message: input.message || "이용권 확인 중",
    status: input.status || "checkingEntitlement",
    cost: input.cost,
  });
  return requestId;
}

export function updatePaidFeatureGate(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  requestId?: string;
  cost?: number;
  title?: string;
  message?: string;
  status?: PaidFeatureGateRuntimeStatus;
}) {
  const featureId = toText(input.featureKey || input.subFeatureKey || input.categoryKey || "paid-feature");
  emitPaidFeatureGate("update", {
    featureId,
    featureKey: featureId,
    requestId: input.requestId,
    title: input.title,
    message: input.message,
    status: input.status,
    cost: input.cost,
  });
}

export async function fetchBillingFeaturePricing(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
}): Promise<BillingResult<{ pricing: BillingFeaturePricing }>> {
  const featureId = toText(input.featureKey || input.subFeatureKey || input.categoryKey || "billing-features");
  emitPaidFeatureGate("open", {
    featureId,
    featureKey: featureId,
    status: "loadingProducts",
    message: "결제 가능한 상품을 불러오는 중",
  });
  const query = toQuery(input as Record<string, unknown>);
  const path = query ? `/api/billing/features?${query}` : "/api/billing/features";
  const response = await authFetchBilling(path, { method: "GET" });
  const parsed = await parseBillingResponse<{ pricing: BillingFeaturePricing }>(response);
  emitPaidFeatureGate("update", {
    featureId,
    featureKey: featureId,
    status: parsed.ok ? "readyToPay" : "error",
    message: parsed.ok ? "결제 가능한 상품을 확인했습니다." : (parsed.error?.message || parsed.message || "상품 조회에 실패했습니다."),
    cost: parsed.data?.pricing?.cost,
  });
  return parsed;
}

export async function runBillingCoinGate(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  requestId?: string;
  forceDeduct?: boolean;
  payloadHash?: string;
  reportId?: string;
  sessionId?: string;
  reportSessionId?: string;
}): Promise<BillingResult<{
  pricing: BillingFeaturePricing;
  consume: Record<string, unknown>;
  balance: number | null;
  user: Record<string, unknown> | null;
}>> {
  const featureId = toText(input.featureKey || input.subFeatureKey || input.categoryKey || "coin-gate");
  const inFlightKey = resolvePaidFeatureInFlightKey(input);
  const existing = billingCoinGateInFlight.get(inFlightKey);
  if (existing) {
    emitPaidFeatureGate("open", {
      featureId,
      featureKey: featureId,
      requestId: existing.requestId,
      status: "checkingEntitlement",
      message: "이미 확인 중입니다.",
    });
    return existing.promise;
  }

  const activeAttempt = beginPaidAttempt({
    featureKey: featureId,
    mode: toText(input.reason || ""),
  });
  const gateRequestId = toText(input.requestId || activeAttempt.attemptId || inFlightKey);
  emitPaidFeatureGate("open", {
    featureId,
    featureKey: featureId,
    requestId: gateRequestId,
    status: "checkingEntitlement",
    message: "이용권 확인 중",
  });

  const requestPromise = (async () => {
    markPaidAttemptPaymentRequested();
    emitPaidFeatureGate("update", {
      featureId,
      featureKey: featureId,
      requestId: gateRequestId,
      status: "paymentProcessing",
      message: "결제와 이용권 반영을 확인 중입니다.",
    });

    const response = await authFetchBilling("/api/billing/coin-gate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(input || {}),
        attemptId: activeAttempt.attemptId,
      }),
    });

    const parsed = await parseBillingResponse<{
      pricing: BillingFeaturePricing;
      consume: Record<string, unknown>;
      balance: number | null;
      user: Record<string, unknown> | null;
    }>(response);

    if (parsed.ok && parsed.data) {
      const normalizedBalance = toNumber(parsed.data.balance, NaN);
      parsed.data.balance = Number.isFinite(normalizedBalance) ? normalizedBalance : null;
      markPaidAttemptPaymentSucceeded();
      markPaidAttemptCallbackReturned();
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: "paymentSuccess",
        message: "이용권 확인이 완료되었습니다.",
        cost: parsed.data.pricing?.cost,
      });
    } else {
      const code = String(parsed.error?.code || "").toUpperCase();
      const status = parsed.status === 402 || code === "INSUFFICIENT_COINS" ? "readyToPay" : "error";
      markPaidAttemptFailed(parsed.error?.code || "single_purchase_required");
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status,
        message: status === "readyToPay"
          ? "결제 가능한 상품을 확인해 주세요."
          : (parsed.error?.message || parsed.message || "이용권 확인에 실패했습니다."),
      });
    }

    return parsed;
  })().finally(() => {
    billingCoinGateInFlight.delete(inFlightKey);
  });

  billingCoinGateInFlight.set(inFlightKey, { requestId: gateRequestId, promise: requestPromise });
  return requestPromise;
}

export async function purchaseFeature(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  requestId?: string;
  forceDeduct?: boolean;
  payloadHash?: string;
  productId?: string;
  cost?: number;
  reportId?: string;
  sessionId?: string;
  reportSessionId?: string;
}) {
  return runBillingCoinGate(input as Parameters<typeof runBillingCoinGate>[0]);
}

export async function fetchBillingBalance(): Promise<BillingResult<{
  authenticated: boolean;
  balance: number;
  user: Record<string, unknown> | null;
  unlockedFeatures: string[];
  unlockMap: Record<string, boolean>;
}>> {
  const response = await authFetchBilling("/api/billing/balance", { method: "GET" });
  const parsed = await parseBillingResponse<{
    authenticated: boolean;
    balance: number;
    user: Record<string, unknown> | null;
    unlockedFeatures: string[];
    unlockMap: Record<string, boolean>;
  }>(response);

  if (parsed.ok && parsed.data) {
    parsed.data.balance = toNumber(parsed.data.balance, 0);
    if (!Array.isArray(parsed.data.unlockedFeatures)) parsed.data.unlockedFeatures = [];
    if (!parsed.data.unlockMap || typeof parsed.data.unlockMap !== "object") {
      parsed.data.unlockMap = {};
    }
  }

  return parsed;
}

async function runServiceExecutionApi(
  action: "start" | "heartbeat" | "complete" | "fail",
  payload: ServiceExecutionPayload,
): Promise<BillingResult<{ idempotent: boolean; execution: ServiceExecutionData | null; settlement?: Record<string, unknown> | null }>> {
  const response = await authFetchBilling(`/api/billing/executions/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload || {}),
  });

  return parseBillingResponse<{ idempotent: boolean; execution: ServiceExecutionData | null; settlement?: Record<string, unknown> | null }>(response);
}

export function startServiceExecution(payload: ServiceExecutionPayload) {
  return runServiceExecutionApi("start", payload);
}

export function heartbeatServiceExecution(payload: ServiceExecutionPayload) {
  return runServiceExecutionApi("heartbeat", payload);
}

export function completeServiceExecution(payload: ServiceExecutionPayload) {
  return runServiceExecutionApi("complete", payload);
}

export function failServiceExecution(payload: ServiceExecutionPayload) {
  return runServiceExecutionApi("fail", payload);
}
