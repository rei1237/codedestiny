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
  membershipCreditCost?: number;
  paymentMode?: string;
  coinDisplayOnly?: boolean;
};

export type PaymentEligibility = {
  loading?: boolean;
  coinCost: number;
  priceKRW: number;
  pass: {
    hasActivePass: boolean;
    tier: "standard" | "premium" | "vvip" | "family" | null;
    label: string | null;
    limit: number | null;
    canUse: boolean;
  };
  monthly: {
    balance: number;
    canUse: boolean;
    afterBalance: number;
  };
  card: {
    canUse: boolean;
    provider: "PORTONE_V2_KG_INICIS";
  };
  raw: Record<string, unknown>;
};

type RuntimeApiWindow = Window & {
  CODE_DESTINY_API_BASE_URL?: string;
  _cdSetCoinGateOverlay?: (show: boolean, message?: string, mode?: string) => void;
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

type BillingCoinGateData = {
  pricing: BillingFeaturePricing;
  consume: Record<string, unknown>;
  balance: number | null;
  user: Record<string, unknown> | null;
};

type BillingBalanceData = {
  authenticated: boolean;
  balance: number;
  legacyCoinBalance?: number;
  membershipCreditBalance?: number;
  membership?: Record<string, unknown> | null;
  user: Record<string, unknown> | null;
  unlockedFeatures: string[];
  unlockMap: Record<string, boolean>;
};

type BillingCoinGatePromise = Promise<BillingResult<BillingCoinGateData>>;

const BILLING_COIN_GATE_RECENT_TTL_MS = 1200;
const BILLING_BALANCE_RECENT_TTL_MS = 650;

const billingCoinGateInFlight = new Map<string, {
  requestId: string;
  promise: BillingCoinGatePromise;
}>();
const billingCoinGateRecent = new Map<string, {
  requestId: string;
  promise: BillingCoinGatePromise;
  expiresAt: number;
}>();
let billingBalanceInFlight: Promise<BillingResult<BillingBalanceData>> | null = null;
let billingBalanceRecent: { result: BillingResult<BillingBalanceData>; expiresAt: number } | null = null;
let billingBalanceCacheVersion = 0;

function invalidateBillingBalanceCache() {
  billingBalanceCacheVersion += 1;
  billingBalanceRecent = null;
  billingBalanceInFlight = null;
}

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function hasVerifiedBillingAccess(data: unknown, expectedFeatureKey: unknown): boolean {
  const record = asRecord(data);
  if (!record) return false;
  const expectedFeature = toText(expectedFeatureKey);
  const accessGrant = asRecord(record.accessGrant);
  if (accessGrant && accessGrant.ok !== false) {
    const evidenceId = toText(
      accessGrant.evidenceId
      || accessGrant.purchaseId
      || accessGrant.paymentId
      || accessGrant.merchantUid
      || accessGrant.requestId,
    );
    const grantFeature = toText(accessGrant.featureKey);
    if (evidenceId && (!expectedFeature || !grantFeature || grantFeature === expectedFeature)) return true;
  }
  const consume = asRecord(record.consume);
  if (consume && consume.ok !== false) {
    const transactionId = toText(
      consume.transactionId
      || consume.receiptId
      || consume.pointHistoryId
      || consume._id
      || consume.id,
    );
    const consumeFeature = toText(consume.featureKey);
    if (transactionId && (!expectedFeature || !consumeFeature || consumeFeature === expectedFeature)) return true;
    if ((consume.accessType === "membership_pass" || consume.accessType === "already_unlocked") && (!expectedFeature || !consumeFeature || consumeFeature === expectedFeature)) return true;
  }
  const unlockMap = asRecord(record.unlockMap);
  if (expectedFeature && unlockMap && unlockMap[expectedFeature] === true) return true;
  const unlockedFeatures = Array.isArray(record.unlockedFeatures) ? record.unlockedFeatures.map(toText) : [];
  return Boolean(expectedFeature && unlockedFeatures.includes(expectedFeature));
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

function paymentLoadingOwnsPaidFeatureStatus(status: string) {
  return [
    "opening",
    "checkingEntitlement",
    "hasEntitlement",
    "loadingProducts",
    "paymentProcessing",
    "paymentSuccess",
  ].includes(status);
}

function resolvePaidFeatureOverlay(status: string, message?: string) {
  const text = toText(message);
  if (status === "checkingEntitlement") {
    return { message: "이용권을 적용하고 있습니다.", mode: "pass" };
  }
  if (status === "hasEntitlement") {
    return { message: "이용권 적용이 완료되었습니다.", mode: "pass-applied" };
  }
  if (status === "paymentSuccess") {
    if (/이용권 적용|이용권으로|pass_applied|membership/i.test(text)) {
      return { message: "이용권 적용이 완료되었습니다.", mode: "pass-applied" };
    }
    return { message: text || "이용 권한 저장이 완료되었습니다.", mode: "unlock-saving" };
  }
  if (status === "opening" || status === "loadingProducts") {
    return { message: text || "결제 가능한 수단을 확인하고 있습니다.", mode: "checkout" };
  }
  if (status === "paymentProcessing") {
    const lower = text.toLowerCase();
    if (/이용권|membership_pass|pass_applied|membership/i.test(lower)) return { message: text || "이용권을 적용하고 있습니다.", mode: "pass" };
    if (/월정석|monthly|moonstone/.test(lower)) return { message: text || "월정석 잔량을 반영하고 있습니다.", mode: "monthly" };
    if (/구독|subscription|이용권 결제|플랜/.test(lower)) return { message: text || "달빛 이용권 결제를 확인하고 있습니다.", mode: "subscription" };
    if (/저장|해금|권한/.test(lower)) return { message: text || "이용 권한을 저장하고 있습니다.", mode: "unlock-saving" };
    return { message: text || "결제 승인과 이용 권한을 확인하고 있습니다.", mode: "confirm" };
  }
  return { message: text || "결제 상태를 안전하게 확인하고 있습니다.", mode: "payment" };
}

function emitPaymentLoadingState(open: boolean, message?: string, mode?: string) {
  const runtimeWindow = window as RuntimeApiWindow;
  const overlayMessage = toText(message) || "결제 상태를 안전하게 확인하고 있습니다.";
  const overlayMode = toText(mode) || "payment";
  if (typeof runtimeWindow._cdSetCoinGateOverlay === "function") {
    runtimeWindow._cdSetCoinGateOverlay(open, overlayMessage, overlayMode);
    return;
  }
  window.dispatchEvent(new CustomEvent("cd:payment-loading-state", {
    detail: {
      open,
      message: overlayMessage,
      mode: overlayMode,
    },
  }));
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
    opening: "결제 가능한 수단을 확인하고 있습니다.",
    checkingEntitlement: "이용권을 적용하고 있습니다.",
    hasEntitlement: "이용권 적용이 완료되었습니다.",
    noEntitlement: "결제가 필요합니다. 결제 페이지로 이동해 주세요.",
    loadingProducts: "결제 상품 정보를 확인하고 있습니다.",
    readyToPay: "결제 수단을 확인해 주세요.",
    paymentProcessing: "결제 승인과 이용 권한을 확인하고 있습니다.",
    paymentSuccess: "이용 권한 저장이 완료되었습니다.",
    paymentFailed: "결제 처리에 실패했습니다.",
    error: "결제 처리 중 오류가 발생했습니다.",
  };
  const overlayMessage = String(payload.message || copyFromStatus[status as PaidFeatureGateRuntimeStatus] || "결제 상태를 안전하게 확인하고 있습니다.").trim();
  try {
    if (typeof performance !== "undefined" && typeof performance.mark === "function") {
      performance.mark(`cd-paid-feature-gate-${action}`);
    }
  } catch (_) {}
  const runtimeWindow = window as RuntimeApiWindow;
  if (action !== "close" && paymentLoadingOwnsPaidFeatureStatus(status)) {
    const overlay = resolvePaidFeatureOverlay(status, overlayMessage);
    emitPaymentLoadingState(true, overlay.message, overlay.mode);
    runtimeWindow.__cdPaidFeatureGate?.close?.(payload.requestId);
    if (status === "hasEntitlement" || status === "paymentSuccess") {
      window.setTimeout(() => {
        emitPaymentLoadingState(false);
      }, 900);
    }
    return;
  }
  if (action === "close") {
    emitPaymentLoadingState(false);
    runtimeWindow.__cdPaidFeatureGate?.close?.(payload.requestId);
    return;
  } else {
    emitPaymentLoadingState(false);
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
    message: input.message || "이용권을 적용하고 있습니다.",
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

function normalizePassTier(value: unknown): PaymentEligibility["pass"]["tier"] {
  const tier = toText(value).toUpperCase();
  if (tier.includes("FAMILY") || tier.includes("CODE DESTINY FAMILY")) return "family";
  if (tier === "STANDARD" || tier === "BRONZE") return "standard";
  if (tier === "PREMIUM" || tier === "SILVER") return "premium";
  if (tier === "VVIP" || tier === "GOLD") return "vvip";
  return null;
}

function labelForPassTier(tier: PaymentEligibility["pass"]["tier"]) {
  if (tier === "standard") return "스탠다드 달빛 이용권";
  if (tier === "premium") return "프리미엄 달빛 이용권";
  if (tier === "vvip") return "VVIP 달빛 이용권";
  if (tier === "family") return "Code Destiny Family";
  return null;
}

export async function fetchPaymentEligibility(input: {
  productId?: string;
  serviceType?: string;
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  coinCost?: number;
  coinPrice?: number;
  priceKRW?: number;
  amountKRW?: number;
}): Promise<BillingResult<PaymentEligibility>> {
  const query = toQuery({
    productId: input.productId,
    serviceType: input.serviceType,
    categoryKey: input.categoryKey,
    subFeatureKey: input.subFeatureKey,
    featureKey: input.featureKey,
    reason: input.reason,
  });
  const response = await authFetchBilling(query ? `/api/billing/unlock-status?${query}` : "/api/billing/unlock-status", { method: "GET" });
  const parsed = await parseBillingResponse<Record<string, unknown>>(response);

  if (!parsed.ok || !parsed.data) {
    return {
      ...parsed,
      data: null,
    };
  }

  const data = parsed.data;
  const options = data.paymentOptions && typeof data.paymentOptions === "object"
    ? data.paymentOptions as Record<string, unknown>
    : data;
  const pricing = data.pricing && typeof data.pricing === "object"
    ? data.pricing as Record<string, unknown>
    : {};
  const coinCost = Math.max(0, Math.floor(toNumber(options.coinCost ?? data.coinCost ?? pricing.coinPrice ?? pricing.cost ?? input.coinCost ?? input.coinPrice, 0)));
  const priceKRW = Math.max(0, Math.floor(toNumber(pricing.amountKRW ?? pricing.cashPrice ?? input.priceKRW ?? input.amountKRW ?? coinCost * 100, 0)));
  const monthlyBalance = Math.max(0, Math.floor(toNumber(options.monthlyBalance ?? data.monthlyBalance ?? data.membershipCreditBalance, 0)));
  const monthlyCost = Math.max(0, Math.floor(toNumber(options.membershipCreditCost ?? data.membershipCreditCost ?? pricing.membershipCreditCost, coinCost * 10)));
  const passTier = normalizePassTier(options.passTier ?? data.passTier ?? data.subscriptionTier);
  const passLimit = toNumber(options.passLimit ?? data.passLimit ?? data.freeLimit, NaN);
  const eligibility: PaymentEligibility = {
    loading: false,
    coinCost,
    priceKRW,
    pass: {
      hasActivePass: Boolean(options.hasActivePass ?? data.hasActivePass),
      tier: passTier,
      label: labelForPassTier(passTier),
      limit: Number.isFinite(passLimit) && passLimit > 0 ? Math.floor(passLimit) : null,
      canUse: Boolean(options.canUseByPass ?? data.canUseByPass),
    },
    monthly: {
      balance: monthlyBalance,
      canUse: Boolean(options.canUseByMonthly ?? data.canUseByMonthly),
      afterBalance: Math.max(0, monthlyBalance - monthlyCost),
    },
    card: {
      canUse: Boolean(options.canUseByCard ?? data.canUseByCard ?? true),
      provider: "PORTONE_V2_KG_INICIS",
    },
    raw: data,
  };

  return {
    ...parsed,
    data: eligibility,
  };
}

export async function runBillingCoinGate(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  requestId?: string;
  forceDeduct?: boolean;
  paymentMode?: string;
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
  const now = Date.now();
  const existing = billingCoinGateInFlight.get(inFlightKey);
  if (existing) {
    emitPaidFeatureGate("open", {
      featureId,
      featureKey: featureId,
      requestId: existing.requestId,
      status: "checkingEntitlement",
      message: "이미 이용권을 확인하고 있습니다.",
    });
    return existing.promise;
  }
  const recent = billingCoinGateRecent.get(inFlightKey);
  if (recent && recent.expiresAt > now) {
    emitPaidFeatureGate("open", {
      featureId,
      featureKey: featureId,
      requestId: recent.requestId,
      status: "paymentProcessing",
      message: "최근 요청 결과를 확인하고 있습니다.",
    });
    return recent.promise;
  }
  if (recent) billingCoinGateRecent.delete(inFlightKey);

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
    message: "이용권을 적용하고 있습니다.",
  });

  const requestPromise = (async () => {
    const requestedMode = toText(input.paymentMode).toUpperCase();
    const explicitPassMode = requestedMode === "MEMBERSHIP_PASS";
    const eligibilityResult = explicitPassMode
      ? null
      : await fetchPaymentEligibility({
        categoryKey: input.categoryKey,
        subFeatureKey: input.subFeatureKey,
        featureKey: input.featureKey,
        reason: input.reason,
      }).catch(() => null);
    const eligibility = eligibilityResult?.ok ? eligibilityResult.data : null;
    const passFirstEligible = explicitPassMode || eligibility?.pass.canUse === true;
    if (eligibility) {
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: eligibility.pass.canUse ? "checkingEntitlement" : "readyToPay",
        message: eligibility.pass.canUse
          ? "이용권을 적용하고 있습니다."
          : "결제 가능한 수단을 확인했습니다.",
        cost: eligibility.coinCost,
      });
    }

    markPaidAttemptPaymentRequested();
    emitPaidFeatureGate("update", {
      featureId,
      featureKey: featureId,
      requestId: gateRequestId,
      status: "paymentProcessing",
      message: passFirstEligible ? "이용권을 적용하고 있습니다." : "결제 승인과 이용 권한을 확인하고 있습니다.",
    });

    const response = await authFetchBilling("/api/billing/coin-gate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(input || {}),
        paymentMode: passFirstEligible ? "MEMBERSHIP_PASS" : input.paymentMode,
        forceDeduct: passFirstEligible ? false : input.forceDeduct,
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
      if (!hasVerifiedBillingAccess(parsed.data, input.featureKey || featureId)) {
        markPaidAttemptFailed("server_access_grant_missing");
        emitPaidFeatureGate("update", {
          featureId,
          featureKey: featureId,
          requestId: gateRequestId,
          status: "paymentFailed",
          message: "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
        });
        return {
          ...parsed,
          ok: false,
          status: parsed.status || 500,
          data: null,
          message: "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
          error: {
            code: "SERVER_ACCESS_GRANT_MISSING",
            message: "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
          },
        };
      }
      const normalizedBalance = toNumber(parsed.data.balance, NaN);
      parsed.data.balance = Number.isFinite(normalizedBalance) ? normalizedBalance : null;
      invalidateBillingBalanceCache();
      markPaidAttemptPaymentSucceeded();
      markPaidAttemptCallbackReturned();
      const consume = asRecord(parsed.data.consume);
      const accessType = toText(consume?.accessType);
      const passApplied = passFirstEligible || accessType === "membership_pass" || accessType === "already_unlocked";
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: passApplied ? "hasEntitlement" : "paymentSuccess",
        message: passApplied ? "이용권 적용이 완료되었습니다." : "이용 권한 저장이 완료되었습니다.",
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
    billingCoinGateRecent.set(inFlightKey, {
      requestId: gateRequestId,
      promise: requestPromise,
      expiresAt: Date.now() + BILLING_COIN_GATE_RECENT_TTL_MS,
    });
    globalThis.setTimeout(() => {
      const recent = billingCoinGateRecent.get(inFlightKey);
      if (recent?.promise === requestPromise) billingCoinGateRecent.delete(inFlightKey);
    }, BILLING_COIN_GATE_RECENT_TTL_MS + 100);
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
  const now = Date.now();
  if (billingBalanceRecent && billingBalanceRecent.expiresAt > now) {
    return billingBalanceRecent.result;
  }
  if (billingBalanceInFlight) return billingBalanceInFlight;

  const cacheVersion = billingBalanceCacheVersion;
  billingBalanceInFlight = (async () => {
    const response = await authFetchBilling("/api/billing/balance", { method: "GET" });
    const parsed = await parseBillingResponse<BillingBalanceData>(response);

    if (parsed.ok && parsed.data) {
      parsed.data.balance = toNumber(parsed.data.balance, 0);
      if (!Array.isArray(parsed.data.unlockedFeatures)) parsed.data.unlockedFeatures = [];
      if (!parsed.data.unlockMap || typeof parsed.data.unlockMap !== "object") {
        parsed.data.unlockMap = {};
      }
      parsed.data.membershipCreditBalance = toNumber(parsed.data.membershipCreditBalance, 0);
      if (cacheVersion === billingBalanceCacheVersion) {
        billingBalanceRecent = {
          result: parsed,
          expiresAt: Date.now() + BILLING_BALANCE_RECENT_TTL_MS,
        };
      }
    }

    return parsed;
  })().finally(() => {
    if (cacheVersion === billingBalanceCacheVersion) billingBalanceInFlight = null;
  });

  return billingBalanceInFlight;
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
