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
  access: {
    canAccess: boolean;
    alreadyUnlocked: boolean;
    reason: string;
  };
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

type RuntimePaidServiceGateResult = {
  status?: string;
  reason?: string;
  transactionId?: string;
  paymentId?: string;
  purchaseId?: string;
  requestId?: string;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

type PaidServiceRuntimeGate = (options: Record<string, unknown>) => Promise<RuntimePaidServiceGateResult> | RuntimePaidServiceGateResult;

type RuntimeApiWindow = Window & {
  CODE_DESTINY_API_BASE_URL?: string;
  _cdSetCoinGateOverlay?: (show: boolean, message?: string, mode?: string) => void;
  _cdOpenPaidServiceGate?: PaidServiceRuntimeGate;
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
  paymentMode?: string;
  reason?: string;
  accessType?: string;
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
export const PAID_SERVICE_RUNTIME_SRC = "/js/destiny-profile.js?v=build-51868c3f6be7";

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
let paidServiceRuntimePromise: Promise<PaidServiceRuntimeGate | null> | null = null;

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
  const pricing = asRecord(record.pricing);
  const pricingFeature = toText(pricing?.featureKey);
  const accessDecision = asRecord(record.accessDecision);
  if (
    (record.canAccess === true || record.unlocked === true || accessDecision?.accessGranted === true)
    && (!expectedFeature || !pricingFeature || pricingFeature === expectedFeature)
  ) {
    return true;
  }
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

function getPaidServiceRuntimeGate(): PaidServiceRuntimeGate | null {
  if (typeof window === "undefined") return null;
  const runtimeWindow = window as RuntimeApiWindow;
  return typeof runtimeWindow._cdOpenPaidServiceGate === "function" ? runtimeWindow._cdOpenPaidServiceGate : null;
}

export function loadPaidServiceRuntimeGate(): Promise<PaidServiceRuntimeGate | null> {
  const current = getPaidServiceRuntimeGate();
  if (current) return Promise.resolve(current);
  if (typeof document === "undefined") return Promise.resolve(null);
  if (paidServiceRuntimePromise) return paidServiceRuntimePromise;

  paidServiceRuntimePromise = new Promise((resolve) => {
    const finish = () => resolve(getPaidServiceRuntimeGate());
    const existing = document.querySelector<HTMLScriptElement>('script[src^="/js/destiny-profile.js"]');
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      window.setTimeout(finish, 1200);
      return;
    }

    const script = document.createElement("script");
    script.src = PAID_SERVICE_RUNTIME_SRC;
    script.async = true;
    script.dataset.cdPaymentRuntimeLoader = "1";
    script.onload = finish;
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return paidServiceRuntimePromise;
}

function unwrapRuntimeGatePayload(result: RuntimePaidServiceGateResult | null | undefined) {
  const payload = result?.payload && typeof result.payload === "object"
    ? result.payload
    : (result?.data && typeof result.data === "object" ? result.data : result);
  return (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
}

function isRuntimeGateGranted(result: RuntimePaidServiceGateResult | null | undefined) {
  const payload = unwrapRuntimeGatePayload(result);
  const status = toText(result?.status || payload.status).toLowerCase();
  return status === "granted"
    || status === "paid"
    || status === "success"
    || Boolean(payload.accessGrant)
    || Boolean(payload.premiumAccessToken)
    || Boolean(payload.consume)
    || Boolean(payload.payment);
}

function readRuntimeNestedObject(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function buildRuntimeMembershipCoverage(eligibility: PaymentEligibility | null) {
  if (!eligibility) return null;
  const raw = asRecord(eligibility.raw) || {};
  const options = asRecord(raw.paymentOptions) || raw;
  const passLimit = Math.max(0, Math.floor(toNumber(
    eligibility.pass.limit
    ?? options.passLimit
    ?? options.freeLimit
    ?? raw.freeLimit,
    0,
  )));
  return {
    tier: eligibility.pass.tier || toText(options.passTier || raw.subscriptionTier || "free"),
    passTier: eligibility.pass.tier || toText(options.passTier || raw.passTier || ""),
    hasActivePass: eligibility.pass.hasActivePass,
    freeLimit: passLimit,
    passLimit,
    canUseByPass: eligibility.pass.canUse,
    monthlyBalance: eligibility.monthly.balance,
    passDiscount: asRecord(options.passDiscount || raw.passDiscount) || undefined,
    source: "react-unlock-status",
  };
}

function resolveRuntimeBillingPricing(input: Parameters<typeof runBillingCoinGate>[0], eligibility: PaymentEligibility | null, payload: Record<string, unknown>, featureId: string): BillingFeaturePricing {
  const data = readRuntimeNestedObject(payload, "data");
  const payloadPricing = readRuntimeNestedObject(payload, "pricing");
  const dataPricing = readRuntimeNestedObject(data, "pricing");
  const rawPricing = Object.keys(dataPricing).length ? dataPricing : payloadPricing;
  const featureKey = toText(rawPricing.featureKey || input.featureKey || input.subFeatureKey || featureId);
  const cost = Math.max(0, Math.floor(toNumber(rawPricing.coinPrice ?? rawPricing.cost ?? eligibility?.coinCost, 0)));
  const amountKRW = Math.max(0, Math.floor(toNumber(rawPricing.amountKRW ?? rawPricing.cashPrice ?? eligibility?.priceKRW ?? cost * 100, 0)));

  return {
    categoryKey: toText(rawPricing.categoryKey || input.categoryKey || "legacy-feature"),
    categoryLabel: toText(rawPricing.categoryLabel),
    subFeatureKey: toText(rawPricing.subFeatureKey || input.subFeatureKey || featureKey || "default"),
    featureKey,
    cost,
    coinPrice: cost,
    displayUnit: toText(rawPricing.displayUnit || "coin"),
    displayPrice: toText(rawPricing.displayPrice || `${cost.toLocaleString("ko-KR")}코인`),
    reason: toText(rawPricing.reason || input.reason || featureKey),
    currency: toText(rawPricing.currency || "KRW"),
    cashPrice: amountKRW,
    amountKRW,
    membershipCreditCost: toNumber(rawPricing.membershipCreditCost, 0),
    paymentMode: toText(rawPricing.paymentMode || "single_purchase"),
    coinDisplayOnly: rawPricing.coinDisplayOnly === undefined ? true : Boolean(rawPricing.coinDisplayOnly),
  };
}

async function runPaidServiceRuntimePayment(input: Parameters<typeof runBillingCoinGate>[0], context: {
  featureId: string;
  requestId: string;
  eligibility: PaymentEligibility | null;
  runtimeGate?: PaidServiceRuntimeGate | null;
}): Promise<BillingResult<BillingCoinGateData> | null> {
  if (typeof window === "undefined") return null;
  if (input.forceDeduct === false) return null;

  const requestedMode = toText(input.paymentMode).toUpperCase();
  if (requestedMode === "MEMBERSHIP_PASS" || requestedMode === "MONTHLY_CREDIT" || requestedMode === "DIRECT_KRW") return null;

  const runtimeGate = context.runtimeGate || await loadPaidServiceRuntimeGate();
  if (!runtimeGate) return null;

  const cost = Math.max(0, Math.floor(toNumber(context.eligibility?.coinCost, 0)));
  const amountKRW = Math.max(0, Math.floor(toNumber(context.eligibility?.priceKRW, cost * 100)));
  const featureKey = toText(input.featureKey || input.subFeatureKey || context.featureId);
  const reason = toText(input.reason || featureKey);
  const membershipCoverage = buildRuntimeMembershipCoverage(context.eligibility);
  const passAlreadyChecked = Boolean(context.eligibility);

  let runtimeResult: RuntimePaidServiceGateResult | null = null;
  try {
    runtimeResult = await runtimeGate({
      categoryKey: input.categoryKey,
      subFeatureKey: input.subFeatureKey,
      featureKey,
      reason,
      title: reason,
      cost,
      coinPrice: cost,
      amountKrw: amountKRW,
      requestId: context.requestId,
      forceDeduct: true,
      reportId: input.reportId,
      sessionId: input.sessionId,
      reportSessionId: input.reportSessionId || input.sessionId,
      membershipCoverage: membershipCoverage || undefined,
      monthlyBalance: context.eligibility?.monthly.balance,
      skipBalanceRefresh: passAlreadyChecked,
      disablePassFirst: passAlreadyChecked && context.eligibility?.pass.canUse !== true,
      internalMainGate: true,
    });
  } catch (error) {
    return {
      ok: false,
      status: 402,
      data: null,
      message: error instanceof Error ? error.message : "결제창을 열지 못했습니다.",
      error: {
        code: "PAYMENT_REQUIRED",
        message: error instanceof Error ? error.message : "결제창을 열지 못했습니다.",
      },
      raw: {},
    };
  }

  const payload = unwrapRuntimeGatePayload(runtimeResult);
  if (!isRuntimeGateGranted(runtimeResult)) {
    const message = toText(runtimeResult?.reason || payload.reason || payload.message || "결제가 취소되었습니다.");
    return {
      ok: false,
      status: 402,
      data: null,
      message,
      error: {
        code: "PAYMENT_CANCELLED",
        message,
      },
      raw: payload,
    };
  }

  const sourceData = readRuntimeNestedObject(payload, "data");
  const source = Object.keys(sourceData).length ? sourceData : payload;
  const payloadConsume = readRuntimeNestedObject(payload, "consume");
  const dataConsume = readRuntimeNestedObject(source, "consume");
  const consumeSource = Object.keys(dataConsume).length ? dataConsume : payloadConsume;
  const payloadAccessGrant = readRuntimeNestedObject(payload, "accessGrant");
  const dataAccessGrant = readRuntimeNestedObject(source, "accessGrant");
  const accessGrant = Object.keys(dataAccessGrant).length ? dataAccessGrant : payloadAccessGrant;
  const pricing = resolveRuntimeBillingPricing(input, context.eligibility, payload, context.featureId);
  const transactionId = toText(
    runtimeResult?.transactionId
    || runtimeResult?.paymentId
    || runtimeResult?.purchaseId
    || runtimeResult?.requestId
    || source.transactionId
    || source.paymentId
    || source.purchaseId
    || source.requestId
    || consumeSource.transactionId
    || consumeSource._id
    || accessGrant.evidenceId
    || accessGrant.purchaseId
    || context.requestId,
  );
  const consume = {
    ...consumeSource,
    ok: consumeSource.ok === false ? false : true,
    transactionId,
    featureKey: toText(consumeSource.featureKey || pricing.featureKey),
    chargedCoins: toNumber(consumeSource.chargedCoins ?? consumeSource.cost ?? source.chargedCoins, 0),
  };
  const consumeAccessType = toText(consumeSource.accessType);
  const user = readRuntimeNestedObject(source, "user");
  const data = {
    ...source,
    pricing,
    consume,
    accessGrant,
    balance: Number.isFinite(Number(source.balance)) ? Number(source.balance) : null,
    user: Object.keys(user).length ? user : null,
    freeBySubscription: source.freeBySubscription === true || consumeAccessType === "membership_pass" || consumeAccessType === "usage_pass",
  } as BillingCoinGateData & Record<string, unknown>;

  return {
    ok: true,
    status: 200,
    data,
    message: toText(source.message || payload.message || "결제가 완료되었습니다."),
    error: null,
    raw: payload,
  };
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
    "paymentPreparing",
    "paymentWindowOpen",
  ].includes(status);
}

function resolvePaymentWaitKind(input: {
  status?: string;
  message?: string;
  paymentMode?: string;
  featureKey?: string;
  reason?: string;
  accessType?: string;
}) {
  const mode = toText(input.paymentMode).toUpperCase();
  const haystack = [input.status, input.message, input.paymentMode, input.featureKey, input.reason, input.accessType]
    .map((value) => toText(value).toLowerCase())
    .filter(Boolean)
    .join(" ");

  if (mode === "MEMBERSHIP_PASS" || /membership_pass|pass_applied|이용권 확인|이용권 적용|이용권으로|membership/.test(haystack)) return "pass";
  if (mode === "MONTHLY_CREDIT" || /monthly_credit|monthly|moonstone|월정석/.test(haystack)) return "monthly";
  if (mode === "DIRECT_KRW" || /direct_krw|one[-_ ]?time|single|단건|원화|카드|checkout/.test(haystack)) return "single";
  if (/subscription|구독|플랜|달빛 이용권 결제|이용권 결제/.test(haystack)) return "subscription";
  if (/unlock|잠금|해제|권한|premium|pdf|리포트/.test(haystack)) return "unlock";
  return "payment";
}

function resolvePaymentWaitOverlay(status: string, message?: string, detail?: Record<string, unknown>) {
  const text = toText(message);
  const kind = resolvePaymentWaitKind({
    status,
    message: text,
    paymentMode: toText(detail?.paymentMode),
    featureKey: toText(detail?.featureKey || detail?.featureId),
    reason: toText(detail?.reason || detail?.title),
    accessType: toText(detail?.accessType),
  });

  if (status === "checkingEntitlement") return { message: text || "이용권 확인 중입니다.", mode: "pass" };
  if (status === "hasEntitlement") return { message: text || "이용권 적용이 완료되었습니다.", mode: "pass-applied" };
  if (status === "paymentPreparing") return { message: text || "단건 결제창을 여는 중입니다. 주문 금액과 인증 정보를 안전하게 맞추고 있습니다.", mode: "card" };
  if (status === "paymentWindowOpen") return { message: text || "열린 결제창에서 카드 인증을 진행해 주세요. 인증이 끝나면 권한을 확인합니다.", mode: "card" };
  if (status === "opening" || status === "loadingProducts" || status === "readyToPay") {
    if (kind === "subscription") return { message: text || "코인 기준 이용권 결제 정보를 확인하고 있습니다.", mode: "subscription" };
    if (kind === "monthly") return { message: text || "이벤트 월정석 보너스를 확인하고 콘텐츠 이용 권한을 여는 중입니다.", mode: "monthly" };
    if (kind === "single") return { message: text || "코인 기준 단건 결제창을 여는 중입니다. 주문 금액과 인증 정보를 안전하게 맞추고 있습니다.", mode: "card" };
    if (kind === "unlock") return { message: text || "잠금 해제 준비 중입니다.", mode: "unlock-saving" };
    return { message: text || "결제창을 열기 전 주문 정보를 확인하고 있습니다.", mode: "checkout" };
  }
  if (status === "paymentProcessing") {
    if (kind === "pass") return { message: text || "이용권을 적용하고 있습니다.", mode: "pass" };
    if (kind === "subscription") return { message: text || "코인 기준 이용권 결제 승인과 활성화를 확인하고 있습니다.", mode: "subscription" };
    if (kind === "monthly") return { message: text || "이벤트 월정석 보너스 차감과 콘텐츠 이용 권한을 확인하고 있습니다.", mode: "monthly" };
    if (kind === "single") return { message: text || "코인 기준 단건 결제 승인과 콘텐츠 이용 권한을 확인하고 있습니다.", mode: "confirm" };
    if (kind === "unlock") return { message: text || "콘텐츠 잠금 해제를 반영하고 있습니다.", mode: "unlock-saving" };
    return { message: text || "결제 승인과 이용 권한을 확인하고 있습니다.", mode: "confirm" };
  }
  if (status === "paymentSuccess") {
    if (kind === "subscription") return { message: text || "코인 기준 이용권 활성화가 완료되었습니다.", mode: "payment-complete" };
    if (kind === "monthly") return { message: text || "이벤트 월정석 보너스로 콘텐츠 이용 권한을 열었습니다.", mode: "payment-complete" };
    if (kind === "single") return { message: text || "코인 기준 단건 결제와 이용 권한 저장이 완료되었습니다.", mode: "payment-complete" };
    if (kind === "unlock") return { message: text || "콘텐츠 잠금 해제가 완료되었습니다.", mode: "payment-complete" };
    return { message: text || "이용 권한 저장이 완료되었습니다.", mode: "payment-complete" };
  }
  if (status === "paymentFailed" || status === "error") return { message: text || "결제 확인에 실패했습니다. 결제 내역을 확인한 뒤 다시 시도해 주세요.", mode: "confirm" };
  return { message: text || "결제 상태를 안전하게 확인하고 있습니다.", mode: "payment" };
}

function resolvePaidFeatureOverlay(status: string, message?: string, detail?: Record<string, unknown>) {
  return resolvePaymentWaitOverlay(status, message, detail);
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
    const overlay = resolvePaidFeatureOverlay(status, overlayMessage, payload as Record<string, unknown>);
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
  paymentMode?: string;
}) {
  const featureId = toText(input.featureKey || input.subFeatureKey || input.categoryKey || "paid-feature");
  const requestId = toText(input.requestId || `${featureId}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  emitPaidFeatureGate("open", {
    featureId,
    featureKey: featureId,
    requestId,
    title: input.title,
    message: input.message || "이용권 확인 중입니다.",
    status: input.status || "checkingEntitlement",
    cost: input.cost,
    paymentMode: input.paymentMode,
    reason: input.reason,
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
  paymentMode?: string;
  reason?: string;
  accessType?: string;
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
    paymentMode: input.paymentMode,
    reason: input.reason,
    accessType: input.accessType,
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
  const accessDecision = asRecord(data.accessDecision);
  const accessReason = toText(accessDecision?.reason || data.accessReason || data.decisionReason);
  const canAccess = Boolean(data.canAccess === true || data.unlocked === true || accessDecision?.accessGranted === true);
  const eligibility: PaymentEligibility = {
    loading: false,
    coinCost,
    priceKRW,
    access: {
      canAccess,
      alreadyUnlocked: Boolean(data.unlocked === true || accessReason === "already_unlocked"),
      reason: accessReason,
    },
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
    message: "이용권 확인 중입니다.",
    paymentMode: input.paymentMode,
    reason: input.reason,
  });

  const requestPromise = (async () => {
    let paymentRequestedMarked = false;
    const markPaymentRequestedOnce = () => {
      if (paymentRequestedMarked) return;
      paymentRequestedMarked = true;
      markPaidAttemptPaymentRequested();
    };
    const requestedMode = toText(input.paymentMode).toUpperCase();
    const explicitPassMode = requestedMode === "MEMBERSHIP_PASS";
    const explicitPaymentMode = explicitPassMode || requestedMode === "MONTHLY_CREDIT" || requestedMode === "DIRECT_KRW";
    const runtimeGatePreload = !explicitPaymentMode && input.forceDeduct !== false && typeof window !== "undefined"
      ? loadPaidServiceRuntimeGate().catch(() => null)
      : null;
    const eligibilityResult = explicitPaymentMode
      ? null
      : await fetchPaymentEligibility({
        categoryKey: input.categoryKey,
        subFeatureKey: input.subFeatureKey,
        featureKey: input.featureKey,
        reason: input.reason,
      }).catch(() => null);
    const eligibility = eligibilityResult?.ok ? eligibilityResult.data : null;
    const accessAlreadyGranted = eligibility?.access.canAccess === true;
    const passFirstEligible = explicitPassMode || accessAlreadyGranted || eligibility?.pass.canUse === true;
    if (eligibility) {
      const eligibilityOverlay = resolvePaymentWaitOverlay(
        accessAlreadyGranted || eligibility.pass.canUse ? "checkingEntitlement" : "loadingProducts",
        undefined,
        { paymentMode: requestedMode, featureKey: featureId, reason: input.reason },
      );
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: accessAlreadyGranted || eligibility.pass.canUse ? "checkingEntitlement" : "loadingProducts",
        message: accessAlreadyGranted
          ? (eligibility.access.alreadyUnlocked ? "이미 저장된 이용 권한을 확인하고 있습니다." : "서버에 저장된 이용 권한을 확인하고 있습니다.")
          : eligibilityOverlay.message,
        cost: eligibility.coinCost,
        paymentMode: requestedMode,
        reason: input.reason,
      });
    }

    if (!explicitPaymentMode && !passFirstEligible && eligibility && input.forceDeduct !== false) {
      markPaymentRequestedOnce();
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: "readyToPay",
        message: "결제 가능한 상품을 확인해 주세요.",
        cost: eligibility.coinCost,
        reason: input.reason,
      });
      const runtimePaymentResult = await runPaidServiceRuntimePayment(input, {
        featureId,
        requestId: gateRequestId,
        eligibility,
        runtimeGate: runtimeGatePreload ? await runtimeGatePreload : null,
      });
      if (runtimePaymentResult) {
        const parsed = runtimePaymentResult;
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
          invalidateBillingBalanceCache();
          markPaidAttemptPaymentSucceeded();
          markPaidAttemptCallbackReturned();
          const consume = asRecord(parsed.data.consume);
          const accessType = toText(consume?.accessType);
          const runtimeData = parsed.data as BillingCoinGateData & Record<string, unknown>;
          const passApplied = runtimeData.freeBySubscription === true
            || accessType === "membership_pass"
            || accessType === "usage_pass"
            || accessType === "already_unlocked";
          const successOverlay = resolvePaymentWaitOverlay(passApplied ? "hasEntitlement" : "paymentSuccess", undefined, {
            paymentMode: passApplied ? "MEMBERSHIP_PASS" : "DIRECT_KRW",
            featureKey: featureId,
            reason: input.reason,
            accessType,
          });
          emitPaidFeatureGate("update", {
            featureId,
            featureKey: featureId,
            requestId: gateRequestId,
            status: passApplied ? "hasEntitlement" : "paymentSuccess",
            message: successOverlay.message,
            cost: parsed.data.pricing?.cost,
            paymentMode: passApplied ? "MEMBERSHIP_PASS" : "DIRECT_KRW",
            reason: input.reason,
            accessType,
          });
        } else {
          const runtimeCode = String(parsed.error?.code || "").toUpperCase();
          markPaidAttemptFailed(parsed.error?.code || "payment_runtime_required");
          emitPaidFeatureGate("update", {
            featureId,
            featureKey: featureId,
            requestId: gateRequestId,
            status: runtimeCode === "PAYMENT_CANCELLED" ? "noEntitlement" : "paymentFailed",
            message: parsed.error?.message || parsed.message || "결제가 완료되지 않았습니다.",
            cost: eligibility.coinCost,
            reason: input.reason,
          });
        }
        return parsed;
      }
    }

    markPaymentRequestedOnce();
    const processingOverlay = resolvePaymentWaitOverlay("paymentProcessing", undefined, {
      paymentMode: passFirstEligible ? "MEMBERSHIP_PASS" : requestedMode,
      featureKey: featureId,
      reason: input.reason,
    });
    emitPaidFeatureGate("update", {
      featureId,
      featureKey: featureId,
      requestId: gateRequestId,
      status: "paymentProcessing",
      message: processingOverlay.message,
      paymentMode: passFirstEligible ? "MEMBERSHIP_PASS" : requestedMode,
      reason: input.reason,
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
      const successOverlay = resolvePaymentWaitOverlay(passApplied ? "hasEntitlement" : "paymentSuccess", undefined, {
        paymentMode: passApplied ? "MEMBERSHIP_PASS" : requestedMode,
        featureKey: featureId,
        reason: input.reason,
        accessType,
      });
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: passApplied ? "hasEntitlement" : "paymentSuccess",
        message: successOverlay.message,
        cost: parsed.data.pricing?.cost,
        paymentMode: passApplied ? "MEMBERSHIP_PASS" : requestedMode,
        reason: input.reason,
        accessType,
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
