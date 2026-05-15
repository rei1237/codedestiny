import { authFetch } from "@/app/_lib/auth-client";
import { persistSanitizedAuthUser } from "@/app/_lib/auth-storage";

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

type BillingPurchaseData = {
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

function buildBillingResultError<T>(status: number, code: string, message: string, raw: Record<string, unknown> = {}): BillingResult<T> {
  return {
    ok: false,
    status,
    data: null,
    message,
    error: {
      code,
      message,
    },
    raw,
  };
}

function resolveUserIdFromPayload(payload: Record<string, unknown> | null | undefined): string {
  const rootUser = payload?.user && typeof payload.user === "object"
    ? (payload.user as Record<string, unknown>)
    : null;
  const data = payload?.data && typeof payload.data === "object"
    ? (payload.data as Record<string, unknown>)
    : null;
  const dataUser = data?.user && typeof data.user === "object"
    ? (data.user as Record<string, unknown>)
    : null;

  const candidate = String(
    rootUser?.id
      || rootUser?.userId
      || rootUser?._id
      || dataUser?.id
      || dataUser?.userId
      || dataUser?._id
      || "",
  ).trim();

  return candidate;
}

function resolveAuthenticatedFromPayload(payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload || typeof payload !== "object") return false;

  const data = payload?.data && typeof payload.data === "object"
    ? (payload.data as Record<string, unknown>)
    : null;
  const authenticated = payload.authenticated ?? data?.authenticated;
  if (authenticated === false) return false;

  const userId = resolveUserIdFromPayload(payload);
  if (!userId) return false;

  return authenticated === true || payload.ok === true || data?.ok === true || authenticated == null;
}

function createBillingRequestId(prefix: string): string {
  const safePrefix = toText(prefix) || "billing";
  const randomPart = (() => {
    try {
      const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : null;
      if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
    } catch {
      // fall through to timestamp/random fallback
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  })();

  return `${safePrefix}:${randomPart}`.slice(0, 120);
}

function withBillingRequestId<T extends { requestId?: string }>(input: T | undefined, prefix: string): T & { requestId: string } {
  const base = { ...(input || {}) } as T & { requestId: string };
  base.requestId = toText(base.requestId) || createBillingRequestId(prefix);
  return base;
}

function buildMutationHeaders(requestId: string) {
  return {
    "Content-Type": "application/json",
    "Idempotency-Key": requestId,
  };
}

async function ensureServerAuthenticated(): Promise<BillingResult<never> | null> {
  const response = await billingFetch("/api/auth/me", {
    method: "GET",
    cache: "no-store",
  });

  const payload = await response.clone().json().catch(async () => {
    const text = await response.clone().text().catch(() => "");
    const looksHtml = /^\s*</.test(String(text || ""));
    if (looksHtml) {
      return {
        ok: false,
        code: "INVALID_RESPONSE_FORMAT",
        message: "인증 서버 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.",
      } as Record<string, unknown>;
    }
    return {} as Record<string, unknown>;
  }) as Record<string, unknown>;
  const userId = resolveUserIdFromPayload(payload);
  const authenticated = resolveAuthenticatedFromPayload(payload);

  if (response.status === 401 || response.status === 403) {
    return buildBillingResultError<never>(401, "AUTH_REQUIRED", "로그인이 필요합니다.", payload);
  }

  if (!response.ok) {
    if (response.status >= 500 || String(payload?.code || "") === "INVALID_RESPONSE_FORMAT") {
      const temporaryMessage = toText(payload?.message) || "인증 서버가 일시적으로 불안정합니다. 잠시 후 다시 시도해 주세요.";
      return buildBillingResultError<never>(503, "SERVICE_UNAVAILABLE", temporaryMessage, payload);
    }
    const message = toText(payload?.message) || "인증 상태 확인에 실패했습니다.";
    return buildBillingResultError<never>(response.status, "AUTH_REQUIRED", message, payload);
  }

  if (!authenticated || !userId) {
    return buildBillingResultError<never>(401, "AUTH_REQUIRED", "로그인이 필요합니다.", payload);
  }

  const payloadUser = payload?.user && typeof payload.user === "object"
    ? payload.user
    : (payload?.data && typeof payload.data === "object" && (payload.data as Record<string, unknown>).user);
  if (payloadUser && typeof payloadUser === "object") {
    persistSanitizedAuthUser(payloadUser);
  }

  return null;
}

async function refreshBillingStateAfterPurchase() {
  const [meRes, balanceRes, entitlementsRes] = await Promise.allSettled([
    billingFetch("/api/auth/me", { method: "GET", cache: "no-store" }),
    billingFetch("/api/billing/balance", { method: "GET", cache: "no-store" }),
    billingFetch("/api/billing/entitlements", { method: "GET", cache: "no-store" }),
  ]);

  if (meRes.status === "fulfilled") {
    const mePayload = await meRes.value.json().catch(() => ({})) as Record<string, unknown>;
    const payloadUser = mePayload?.user && typeof mePayload.user === "object"
      ? mePayload.user
      : (mePayload?.data && typeof mePayload.data === "object" && (mePayload.data as Record<string, unknown>).user);
    if (payloadUser && typeof payloadUser === "object") {
      persistSanitizedAuthUser(payloadUser);
    }
  }

  if (balanceRes.status === "fulfilled") {
    const balancePayload = await balanceRes.value.json().catch(() => ({})) as Record<string, unknown>;
    const balanceData = balancePayload?.data && typeof balancePayload.data === "object"
      ? (balancePayload.data as Record<string, unknown>)
      : balancePayload;
    const points = Number(balanceData?.balance ?? (balanceData?.user && (balanceData.user as Record<string, unknown>).points) ?? NaN);
    if (typeof window !== "undefined" && Number.isFinite(points)) {
      try {
        window.localStorage.setItem("fortune_user_points", String(points));
      } catch {
        // ignore storage failures
      }
    }
  }

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("cd:billing-updated", {
        detail: {
          updatedAt: Date.now(),
          from: "purchaseFeature",
          hasEntitlements: entitlementsRes.status === "fulfilled",
        },
      }));
    } catch {
      // ignore event failures
    }
  }
}

export async function apiFetch<T = Record<string, unknown>>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await authFetch(path, {
    ...options,
    credentials: "include",
    cache: options.cache || "no-store",
    headers,
  }, {
    retryOn401: true,
    timeoutMs: BILLING_TIMEOUT_MS,
    transientRetries: 1,
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("AUTH_REQUIRED");
  }

  const text = await response.text().catch(() => "");
  const payload = text ? JSON.parse(text) as T : ({} as T);

  if (!response.ok) {
    throw new Error(typeof payload === "object" && payload ? String((payload as Record<string, unknown>).message || text || "REQUEST_FAILED") : "REQUEST_FAILED");
  }

  return payload;
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
  productId?: string;
  requestId?: string;
  forceDeduct?: boolean;
  payloadHash?: string;
}): Promise<BillingResult<{
  pricing: BillingFeaturePricing;
  consume: Record<string, unknown>;
  balance: number | null;
  user: Record<string, unknown> | null;
}>> {
  const authCheck = await ensureServerAuthenticated();
  if (authCheck) return authCheck as BillingResult<{
    pricing: BillingFeaturePricing;
    consume: Record<string, unknown>;
    balance: number | null;
    user: Record<string, unknown> | null;
  }>;

  const purchaseInput = withBillingRequestId(input, "billing-purchase");

  const purchaseResponse = await billingFetch("/api/billing/purchase", {
    method: "POST",
    headers: buildMutationHeaders(purchaseInput.requestId),
    body: JSON.stringify(purchaseInput),
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
    headers: buildMutationHeaders(purchaseInput.requestId),
    body: JSON.stringify(purchaseInput),
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

  if (parsed.ok) {
    void refreshBillingStateAfterPurchase();
  }

  return parsed;
}

export async function purchaseFeature(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  productId?: string;
  requestId?: string;
  forceDeduct?: boolean;
  payloadHash?: string;
}) {
  return runBillingCoinGate(input);
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
  productId?: string;
  requestId?: string;
  forceDeduct?: boolean;
  payloadHash?: string;
}): Promise<BillingResult<BillingPurchaseData>> {
  const authCheck = await ensureServerAuthenticated();
  if (authCheck) return authCheck as BillingResult<BillingPurchaseData>;

  const purchaseInput = withBillingRequestId(input, "billing-purchase");

  const response = await billingFetch("/api/billing/purchase", {
    method: "POST",
    headers: buildMutationHeaders(purchaseInput.requestId),
    body: JSON.stringify(purchaseInput),
  });
  const parsed = await parseBillingResponse<BillingPurchaseData>(response);
  if (parsed.ok) {
    void refreshBillingStateAfterPurchase();
  }
  return parsed;
}

export async function runBillingConsume(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  productId?: string;
  requestId?: string;
  forceDeduct?: boolean;
  payloadHash?: string;
}): Promise<BillingResult<BillingPurchaseData>> {
  const authCheck = await ensureServerAuthenticated();
  if (authCheck) return authCheck as BillingResult<BillingPurchaseData>;

  const consumeInput = withBillingRequestId(input, "billing-consume");

  const response = await billingFetch("/api/billing/consume", {
    method: "POST",
    headers: buildMutationHeaders(consumeInput.requestId),
    body: JSON.stringify(consumeInput),
  });
  const parsed = await parseBillingResponse<BillingPurchaseData>(response);
  if (parsed.ok) {
    void refreshBillingStateAfterPurchase();
  }
  return parsed;
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
