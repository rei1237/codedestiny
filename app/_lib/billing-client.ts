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
  reason: string;
  currency?: string;
  cashPrice?: number | null;
};

type RuntimeApiWindow = Window & {
  CODE_DESTINY_API_BASE_URL?: string;
};

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

export async function fetchBillingFeaturePricing(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
}): Promise<BillingResult<{ pricing: BillingFeaturePricing }>> {
  const query = toQuery(input as Record<string, unknown>);
  const path = query ? `/api/billing/features?${query}` : "/api/billing/features";
  const response = await authFetchBilling(path, { method: "GET" });
  return parseBillingResponse<{ pricing: BillingFeaturePricing }>(response);
}

export async function runBillingCoinGate(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  requestId?: string;
  forceDeduct?: boolean;
  payloadHash?: string;
}): Promise<BillingResult<{
  pricing: BillingFeaturePricing;
  consume: Record<string, unknown>;
  balance: number | null;
  user: Record<string, unknown> | null;
}>> {
  const activeAttempt = beginPaidAttempt({
    featureKey: toText(input.featureKey || input.subFeatureKey || input.categoryKey || "coin-gate"),
    mode: toText(input.reason || ""),
  });
  markPaidAttemptPaymentRequested();

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
  } else {
    markPaidAttemptFailed(parsed.error?.code || "coin_gate_failed");
  }

  return parsed;
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
