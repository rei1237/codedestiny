import { authFetch } from "@/app/_lib/auth-client";

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

const BILLING_TIMEOUT_MS = 9000;

export type BillingAccessDecision = {
  allowed: boolean;
  reason:
    | "free"
    | "already_unlocked"
    | "subscription_active"
    | "requires_purchase"
    | "insufficient_coins"
    | "auth_required"
    | "feature_disabled";
  featureKey: string;
  priceCoins?: number;
  coinBalance?: number;
};

function toText(value: unknown): string {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

async function parseBillingResponse<T>(response: Response): Promise<BillingResult<T>> {
  let payload: Record<string, unknown> = {};
  const rawText = await response.text().catch(() => "");

  if (rawText) {
    try {
      payload = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      const contentType = String(response.headers.get("content-type") || "").toLowerCase();
      const looksLikeHtml = contentType.includes("text/html") || /^\s*</.test(rawText);
      payload = {
        ok: false,
        code: looksLikeHtml ? "INVALID_RESPONSE_FORMAT" : "RESPONSE_PARSE_ERROR",
        message: looksLikeHtml
          ? "결제 서버 응답이 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요."
          : "결제 응답 파싱 중 오류가 발생했습니다.",
      };
    }
  }

  const ok = response.ok && (payload?.ok === true || (payload?.ok == null && response.status === 200));
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

async function billingFetch(path: string, init: RequestInit) {
  return authFetch(path, init, {
    retryOn401: true,
    timeoutMs: BILLING_TIMEOUT_MS,
    transientRetries: 1,
  });
}

export async function fetchBillingFeaturePricing(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
}): Promise<BillingResult<{ pricing: BillingFeaturePricing }>> {
  const query = toQuery(input as Record<string, unknown>);
  const path = query ? `/api/billing/features?${query}` : "/api/billing/features";
  const response = await billingFetch(path, { method: "GET" });
  return parseBillingResponse<{ pricing: BillingFeaturePricing }>(response);
}

export async function fetchBillingPrices(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
} = {}): Promise<BillingResult<{
  categories?: Array<Record<string, unknown>>;
  legacyFeatureTable?: Array<Record<string, unknown>>;
  pricing?: BillingFeaturePricing;
  source?: string;
}>> {
  const query = toQuery(input as Record<string, unknown>);
  const path = query ? `/api/billing/prices?${query}` : "/api/billing/prices";
  const response = await billingFetch(path, { method: "GET" });
  return parseBillingResponse(response);
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
  const purchaseResponse = await billingFetch("/api/billing/purchase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input || {}),
  });

  const purchaseParsed = await parseBillingResponse<{
    purchased?: boolean;
    pricing?: BillingFeaturePricing;
    consume?: Record<string, unknown> | null;
    balance?: number | null;
    user?: Record<string, unknown> | null;
    accessDecision?: BillingAccessDecision;
    unlockState?: {
      alreadyUnlocked?: boolean;
      subscriptionGranted?: boolean;
    };
  }>(purchaseResponse);

  if (purchaseParsed.ok) {
    const pricing = purchaseParsed.data?.pricing;
    const accessDecision = purchaseParsed.data?.accessDecision;
    const normalizedConsume = purchaseParsed.data?.consume && typeof purchaseParsed.data.consume === "object"
      ? purchaseParsed.data.consume
      : {
        chargedCoins: 0,
        freeBySubscription: accessDecision?.reason === "subscription_active",
        subscriptionTier: accessDecision?.reason === "subscription_active" ? "standard" : "free",
      };

    const normalizedBalanceRaw = purchaseParsed.data?.balance ?? accessDecision?.coinBalance;
    const normalizedBalance = toNumber(normalizedBalanceRaw, NaN);

    return {
      ...purchaseParsed,
      data: {
        pricing: (pricing || {
          categoryKey: toText(input.categoryKey) || "legacy-feature",
          subFeatureKey: toText(input.subFeatureKey) || "default",
          featureKey: toText(input.featureKey),
          cost: toNumber(accessDecision?.priceCoins, 0),
          reason: toText(input.reason) || "코인 결제",
        }) as BillingFeaturePricing,
        consume: normalizedConsume,
        balance: Number.isFinite(normalizedBalance) ? normalizedBalance : null,
        user: (purchaseParsed.data?.user as Record<string, unknown> | null) || null,
      },
    };
  }

  const fallbackResponse = await billingFetch("/api/billing/coin-gate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input || {}),
  });

  const parsed = await parseBillingResponse<{
    pricing: BillingFeaturePricing;
    consume: Record<string, unknown>;
    balance: number | null;
    user: Record<string, unknown> | null;
  }>(fallbackResponse);

  if (parsed.ok && parsed.data) {
    const normalizedBalance = toNumber(parsed.data.balance, NaN);
    parsed.data.balance = Number.isFinite(normalizedBalance) ? normalizedBalance : null;
  }

  return parsed;
}

export async function fetchBillingMe(): Promise<BillingResult<{
  authenticated: boolean;
  balance: number;
  user: Record<string, unknown> | null;
  unlockedFeatures: string[];
  unlockMap: Record<string, boolean>;
  transactions: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  subscriptions: Array<Record<string, unknown>>;
}>> {
  const response = await billingFetch("/api/billing/me", { method: "GET" });
  const parsed = await parseBillingResponse<{
    authenticated: boolean;
    balance: number;
    user: Record<string, unknown> | null;
    unlockedFeatures: string[];
    unlockMap: Record<string, boolean>;
    transactions: Array<Record<string, unknown>>;
    payments: Array<Record<string, unknown>>;
    subscriptions: Array<Record<string, unknown>>;
  }>(response);

  if (parsed.ok && parsed.data) {
    parsed.data.balance = toNumber(parsed.data.balance, 0);
    if (!Array.isArray(parsed.data.unlockedFeatures)) parsed.data.unlockedFeatures = [];
    if (!parsed.data.unlockMap || typeof parsed.data.unlockMap !== "object") parsed.data.unlockMap = {};
    if (!Array.isArray(parsed.data.transactions)) parsed.data.transactions = [];
    if (!Array.isArray(parsed.data.payments)) parsed.data.payments = [];
    if (!Array.isArray(parsed.data.subscriptions)) parsed.data.subscriptions = [];
  }

  return parsed;
}

export async function fetchBillingEntitlements(): Promise<BillingResult<{
  entitlements: Array<Record<string, unknown>>;
  unlockMap: Record<string, boolean>;
  unlockedFeatures: string[];
  subscription: Record<string, unknown> | null;
}>> {
  const response = await billingFetch("/api/billing/entitlements", { method: "GET" });
  const parsed = await parseBillingResponse<{
    entitlements: Array<Record<string, unknown>>;
    unlockMap: Record<string, boolean>;
    unlockedFeatures: string[];
    subscription: Record<string, unknown> | null;
  }>(response);

  if (parsed.ok && parsed.data) {
    if (!Array.isArray(parsed.data.entitlements)) parsed.data.entitlements = [];
    if (!parsed.data.unlockMap || typeof parsed.data.unlockMap !== "object") parsed.data.unlockMap = {};
    if (!Array.isArray(parsed.data.unlockedFeatures)) parsed.data.unlockedFeatures = [];
  }

  return parsed;
}

export async function fetchBillingAccessDecision(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
}): Promise<BillingResult<{
  featureKey: string;
  pricing: BillingFeaturePricing;
  accessDecision: BillingAccessDecision;
  subscription?: Record<string, unknown>;
}>> {
  const query = toQuery(input as Record<string, unknown>);
  const path = query ? `/api/billing/access?${query}` : "/api/billing/access";
  const response = await billingFetch(path, { method: "GET" });
  return parseBillingResponse(response);
}

export async function runBillingPurchase(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  requestId?: string;
  forceDeduct?: boolean;
  payloadHash?: string;
}): Promise<BillingResult<{
  purchased: boolean;
  requestId?: string;
  pricing?: BillingFeaturePricing;
  consume?: Record<string, unknown> | null;
  balance?: number | null;
  user?: Record<string, unknown> | null;
  accessDecision?: BillingAccessDecision;
  unlockState?: {
    alreadyUnlocked?: boolean;
    subscriptionGranted?: boolean;
  };
}>> {
  const response = await billingFetch("/api/billing/purchase", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input || {}),
  });

  return parseBillingResponse(response);
}

export async function runBillingConsume(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  requestId?: string;
  forceDeduct?: boolean;
  payloadHash?: string;
}): Promise<BillingResult<{
  purchased: boolean;
  requestId?: string;
  pricing?: BillingFeaturePricing;
  consume?: Record<string, unknown> | null;
  balance?: number | null;
  user?: Record<string, unknown> | null;
  accessDecision?: BillingAccessDecision;
  unlockState?: {
    alreadyUnlocked?: boolean;
    subscriptionGranted?: boolean;
  };
}>> {
  const response = await billingFetch("/api/billing/consume", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input || {}),
  });

  return parseBillingResponse(response);
}

export async function fetchBillingBalance(): Promise<BillingResult<{
  authenticated: boolean;
  balance: number;
  user: Record<string, unknown> | null;
  unlockedFeatures: string[];
  unlockMap: Record<string, boolean>;
}>> {
  const response = await billingFetch("/api/billing/balance", { method: "GET" });
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
