import { authFetch } from "@/app/_lib/auth-client";
import { lockBodyScroll, unlockBodyScroll } from "@/app/_lib/body-scroll-lock";
import { normalizeBaseUrl } from "@/app/_lib/api-config";
import { readSanitizedAuthUser, resolveAuthScopeFromUser } from "@/app/_lib/auth-storage";
import { assignMonthlyStoneBalance, resolveMonthlyStoneBalance } from "@/app/_lib/monthly-stone";
import {
  beginPaidAttempt,
  markPaidAttemptCallbackReturned,
  markPaidAttemptFailed,
  markPaidAttemptPaymentRequested,
  markPaidAttemptPaymentSucceeded,
} from "@/app/_lib/paid-attempt-session";
import {
  getCurrentLoadingLocale,
  resolveLoadingMessage,
  type LoadingLocale,
  type LoadingStage,
  type PaymentType,
} from "@/constants/loadingMessages";
import { resolvePaidFeatureBillingType } from "@/lib/payment/feature-billing-type";

const BILLING_CLIENT_TEXT_TRANSLATIONS = {
  ko: {
    "billingClient.text.001": "달빛 결제 방식 선택",
    "billingClient.text.002": "이용권 확인이 끝났습니다. 달빛 아래 가장 알맞은 방식으로 콘텐츠를 열어주세요.",
    "billingClient.text.003": "PortOne V2 · KG이니시스",
    "billingClient.text.004": "카드 또는 간편결제로 결제합니다. 결제 성공 후 서버 검증을 거쳐 열립니다.",
    "billingClient.text.005": "월정석 사용",
    "billingClient.text.006": "이용권 다시 확인",
    "billingClient.text.007": "취소",
    "billingClient.text.008": "음악 기능은 이용권으로 구매할 수 없습니다. 단건 결제 또는 월정석 이벤트 재화로 이용해 주세요.",
    "billingClient.message.001": "결제창을 열지 못했습니다.",
    "billingClient.message.002": "결제창을 열지 못했습니다.",
    "billingClient.error.001": "결제 처리 중 오류가 발생했습니다.",
    "billingClient.message.003": "이용권과 기존 이용 권한을 확인하고 있습니다.",
    "billingClient.message.004": "결제 가능한 상품을 확인했습니다.",
    "billingClient.message.005": "이용권 확인 중입니다.",
    "billingClient.message.006": "이용권 확인이 끝났습니다. 결제 가능 상태를 확인하고 있습니다.",
    "billingClient.message.007": "결제 가능한 상품을 확인해 주세요.",
    "billingClient.message.008": "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
    "billingClient.message.009": "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
    "billingClient.message.010": "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
    "billingClient.message.011": "결제 선택창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.",
    "billingClient.message.012": "결제 선택창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.",
    "billingClient.message.013": "결제 선택창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.",
    "billingClient.message.014": "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
    "billingClient.message.015": "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
    "billingClient.message.016": "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
    "billingClient.message.017": "결제 가능한 상품을 확인해 주세요.",
    "billingClient.message.018": "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
    "billingClient.message.019": "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
    "billingClient.message.020": "서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.",
    "billingClient.message.021": "결제 가능 상태를 확인하고 있습니다.",
  },
} as const;

function billingClientText(key: keyof typeof BILLING_CLIENT_TEXT_TRANSLATIONS.ko) {
  return BILLING_CLIENT_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

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

type LicenseTier = "STANDARD" | "PREMIUM" | "VVIP" | "FAMILY";

type AccessGateResult = {
  status: "license_passed" | "payment_required" | "already_unlocked" | "blocked";
  licenseTier?: LicenseTier;
  coveredCoinPrice?: number;
  contentTitle?: string;
  reason?: "license_coin_limit" | "family_all_access" | "profile_limit_benefit" | string;
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

type SubscriptionSnapshotTier = "free" | "standard" | "premium" | "vvip" | "family";

export type SubscriptionSnapshot = {
  userId: string;
  state: "active" | "none";
  tier: SubscriptionSnapshotTier;
  expiresAt: string | null;
  checkedAt: number;
  purchaseVersion: string;
  source: string;
};

export type EntitlementPlan = "NONE" | "STANDARD" | "PREMIUM" | "VVIP" | "FAMILY";

export type EntitlementStatus = {
  isActive: boolean;
  plan: EntitlementPlan;
  expiresAt?: string | null;
  maxCoinCovered?: number | null;
  source?: "server" | "local-cache";
};

export type PaidFeatureContext = {
  featureId: string;
  featureName?: string;
  coinPrice: number;
  category?: string;
  paymentType?: "single" | "unlock" | "report" | "subscriptionOnly";
};

export type AccessDecision = {
  allowed: boolean;
  reason:
    | "FAMILY_ALL_ACCESS"
    | "PLAN_COVERS_FEATURE"
    | "NO_ACTIVE_PLAN"
    | "PLAN_LIMIT_EXCEEDED"
    | "PLAN_PRICE_NOT_COVERED"
    | "SERVER_ERROR"
    | "UNKNOWN";
  shouldOpenPaymentModal: boolean;
  shouldConsumePass: boolean;
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
type PaymentChoiceMode = "direct" | "monthly" | "pass" | "pass-store" | "refresh" | "cancel";
type PaymentChoiceFunction = ((options: Record<string, unknown>) => Promise<PaymentChoiceMode> | PaymentChoiceMode) & {
  __cdSupportsPassChoice?: boolean;
  __cdReactFallback?: boolean;
};

type RuntimeApiWindow = Window & {
  CODE_DESTINY_API_BASE_URL?: string;
  __CODE_DESTINY_RUNTIME_TARGET?: string;
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
  CodeDestinyNative?: {
    purchase?: (input: {
      featureKey: string;
      productId: string;
      productType?: string;
      idempotencyKey?: string;
    }) => Promise<Record<string, unknown>>;
  };
  _cdSetCoinGateOverlay?: (show: boolean, message?: string, mode?: string) => void;
  _cdChooseServicePaymentMode?: PaymentChoiceFunction;
  _cdOpenPaidServiceGate?: PaidServiceRuntimeGate;
  __cdSuppressPaymentFetchOverlayCount?: number;
  __cdChooseServicePaymentModeCanonical?: PaymentChoiceFunction;
  __cdOpenChargeModal?: () => void;
  __cdRestoreCanonicalPaymentMode?: () => unknown;
  __cdPaidFeatureGate?: {
    close?: (requestId?: string) => void;
    holdOpen?: (requestId?: string, maxMs?: number) => void;
    release?: (requestId?: string) => void;
  };
};

type PaidFeatureGateRuntimeStatus =
  | "opening"
  | "checkingEntitlement"
  | "hasEntitlement"
  | "noEntitlement"
  | "loadingProducts"
  | "readyToPay"
  | "paymentPreparing"
  | "paymentWindowOpen"
  | "paymentProcessing"
  | "paymentSuccess"
  | "paymentFailed"
  | "cancelled"
  | "processing"
  | "deliveryProcessing"
  | "refund_pending"
  | "refunded"
  | "refund_failed"
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
  accessMethod?: string;
  paymentMethod?: string;
  licenseTier?: string;
  licenseReason?: string;
  passTier?: string;
  subscriptionTier?: string;
  startedAt?: number;
};

type BillingCoinGateData = {
  pricing: BillingFeaturePricing;
  consume: Record<string, unknown>;
  deferredUsage?: boolean;
  usageDeferred?: boolean;
  executionId?: string;
  accessGateResult?: AccessGateResult | null;
  licensePass?: AccessGateResult | null;
  membershipPass?: Record<string, unknown> | null;
  freeBySubscription?: boolean;
  balance: number | null;
  monthlyStoneBalance?: number;
  membershipCreditBalance?: number;
  monthlyCredits?: number;
  monthlyCreditsAsCoins?: number;
  user: Record<string, unknown> | null;
};

type BillingBalanceData = {
  authenticated: boolean;
  degraded?: boolean;
  balance: number;
  legacyCoinBalance?: number;
  monthlyStoneBalance?: number;
  membershipCreditBalance?: number;
  monthlyCredits?: number;
  monthlyCreditsAsCoins?: number;
  membership?: Record<string, unknown> | null;
  user: Record<string, unknown> | null;
  unlockedFeatures: string[];
  unlockMap: Record<string, boolean>;
};

type BillingCoinGatePromise = Promise<BillingResult<BillingCoinGateData>>;

type BillingCoinGateInput = {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  requestId?: string;
  forceDeduct?: boolean;
  deferUsage?: boolean;
  usagePolicy?: string;
  executionKey?: string;
  paymentMode?: string;
  allowedPaymentModes?: string[];
  disablePassFirst?: boolean;
  disablePassChoice?: boolean;
  skipPassProbe?: boolean;
  payloadHash?: string;
  productId?: string;
  productType?: string;
  serviceType?: string;
  cost?: number;
  coinPrice?: number;
  priceKRW?: number;
  amountKRW?: number;
  amountKrw?: number;
  cashPrice?: number;
  paymentAmount?: number;
  membershipCreditCost?: number;
  reportId?: string;
  sessionId?: string;
  reportSessionId?: string;
  profileId?: string;
  selectedProfileId?: string;
  contentKey?: string;
  purchaseId?: string;
  idempotencyKey?: string;
  orderId?: string;
};

type PaymentEligibilityPhase = "pass" | "full";

const BILLING_COIN_GATE_RECENT_TTL_MS = 10_000;
const BILLING_BALANCE_RECENT_TTL_MS = 15_000;
const PAYMENT_ELIGIBILITY_RECENT_TTL_MS = 15_000;
const REACT_PAID_FEATURE_GATE_RECENT_TTL_MS = 10_000;
const BILLING_FETCH_DEFAULT_TIMEOUT_MS = 20000;
const BILLING_FETCH_CHECKOUT_TIMEOUT_MS = 40000;
const BILLING_FETCH_CONFIRM_TIMEOUT_MS = 60000;
const PAYMENT_CHOICE_IN_FLIGHT_TTL_MS = 45000;
export const PAID_SERVICE_RUNTIME_SRC = "/js/destiny-profile.js?v=build-moonbal-fresh-1a2b3";
const SUBSCRIPTION_SNAPSHOT_KEY_PREFIX = "cd_subscription_snapshot_v2::";
const SUBSCRIPTION_SNAPSHOT_NONE_TTL_MS = 60000;
const SUBSCRIPTION_SNAPSHOT_ACTIVE_TTL_MS = 5 * 60 * 1000;
const SUBSCRIPTION_SNAPSHOT_ACTIVE_STATUSES = new Set(["active", "subscribed", "paid", "success", "succeeded", "complete", "completed", "confirmed", "approved"]);
const SUBSCRIPTION_SNAPSHOT_INACTIVE_STATUSES = new Set(["none", "free", "inactive", "expired", "canceled", "cancelled", "refunded", "failed", "paused"]);

const BILLING_FEATURE_KEY_ALIASES: Record<string, string> = {
  gotoziweipremium: "ziwei-ai-consultation",
  gotoastrologypremium: "astrology-ai-consultation",
  gotosukuyopremium: "sukuyo-compatibility-ai",
  gotovedicpremium: "vedic-ai-consultation",
  "vedic-ai-consultation": "vedic-ai-consultation",
  vedicaiconsultation: "vedic-ai-consultation",
  "karma-destiny-ai": "karma-destiny-ai-consultation",
  "karma-destiny-ai-consultation": "karma-destiny-ai-consultation",
  karmadestinyaiconsultation: "karma-destiny-ai-consultation",
  premium_fpti_report: "premium-fpti-report",
  generatefptideepreport: "premium-fpti-report",
  openfptideepreport: "premium-fpti-report",
};

const billingCoinGateInFlight = new Map<string, {
  requestId: string;
  promise: BillingCoinGatePromise;
}>();
const billingCoinGateRecent = new Map<string, {
  requestId: string;
  promise: BillingCoinGatePromise;
  expiresAt: number;
}>();
const paymentEligibilityInFlight = new Map<string, Promise<BillingResult<PaymentEligibility>>>();
const paymentEligibilityRecent = new Map<string, {
  result: BillingResult<PaymentEligibility>;
  expiresAt: number;
}>();
const reactPaidFeatureGateRecent = new Map<string, {
  requestId: string;
  expiresAt: number;
}>();
// 유저별로 스코프하지 않으면 공유 기기/빠른 계정 전환 시 이전 유저의 balance/unlockMap이
// 그대로 반환될 수 있다 — 캐시 키를 로그인 유저 스코프로 구분한다.
const billingBalanceInFlightByUser = new Map<string, Promise<BillingResult<BillingBalanceData>>>();
const billingBalanceRecentByUser = new Map<string, { result: BillingResult<BillingBalanceData>; expiresAt: number }>();
let billingBalanceCacheVersion = 0;
let paidServiceRuntimePromise: Promise<PaidServiceRuntimeGate | null> | null = null;
let reactPaymentChoiceInFlight: { promise: Promise<PaymentChoiceMode>; startedAt: number } | null = null;

function resolveBillingBalanceUserKey(): string {
  if (typeof window === "undefined") return "guest";
  return resolveAuthScopeFromUser(readSanitizedAuthUser()) || "guest";
}

export function invalidateBillingBalanceCache() {
  billingBalanceCacheVersion += 1;
  billingBalanceRecentByUser.clear();
  billingBalanceInFlightByUser.clear();
  paymentEligibilityInFlight.clear();
  paymentEligibilityRecent.clear();
}

type BillingClientRuntimeWindow = Window & { __cdBillingBalanceAuthListenerInstalled?: boolean };

if (typeof window !== "undefined") {
  const runtimeWindow = window as BillingClientRuntimeWindow;
  if (!runtimeWindow.__cdBillingBalanceAuthListenerInstalled) {
    runtimeWindow.__cdBillingBalanceAuthListenerInstalled = true;
    window.addEventListener("cd:auth-changed", (event) => {
      const detail = event instanceof CustomEvent ? (event.detail as Record<string, unknown> | null) : null;
      const kind = String(detail?.event || "").toLowerCase();
      if (kind === "login" || kind === "logout") invalidateBillingBalanceCache();
    });
  }
}

function debugEntitlement(...args: unknown[]) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(...args);
  }
}

export function normalizeEntitlementPlan(value: unknown): EntitlementPlan {
  const text = toText(value).toUpperCase().replace(/[\s_-]+/g, "");
  if (!text || text === "NONE" || text === "FREE") return "NONE";
  if (text.includes("FAMILY")) return "FAMILY";
  if (text === "VVIP" || text === "VIPPLUS" || text.includes("VVIP")) return "VVIP";
  if (text.includes("PREMIUM") || text === "SILVER") return "PREMIUM";
  if (text.includes("STANDARD") || text === "BASIC" || text === "BRONZE") return "STANDARD";
  return "NONE";
}

function maxCoinCoveredForPlan(plan: EntitlementPlan): number | null {
  if (plan === "FAMILY") return null;
  if (plan === "VVIP") return 100;
  if (plan === "PREMIUM") return 50;
  if (plan === "STANDARD") return 30;
  return 0;
}

export function decidePaidFeatureAccess(entitlement: EntitlementStatus, feature: PaidFeatureContext): AccessDecision {
  const plan = normalizeEntitlementPlan(entitlement?.plan);
  if (entitlement?.isActive && plan === "FAMILY") {
    return {
      allowed: true,
      reason: "FAMILY_ALL_ACCESS",
      shouldOpenPaymentModal: false,
      shouldConsumePass: false,
    };
  }

  if (!entitlement?.isActive || plan === "NONE") {
    return {
      allowed: false,
      reason: "NO_ACTIVE_PLAN",
      shouldOpenPaymentModal: true,
      shouldConsumePass: false,
    };
  }

  const maxCoinCovered = typeof entitlement.maxCoinCovered === "number"
    ? entitlement.maxCoinCovered
    : maxCoinCoveredForPlan(plan);
  const coinPrice = Math.max(0, Math.floor(Number(feature?.coinPrice || 0)));
  if (typeof maxCoinCovered === "number" && coinPrice > maxCoinCovered) {
    return {
      allowed: false,
      reason: "PLAN_PRICE_NOT_COVERED",
      shouldOpenPaymentModal: true,
      shouldConsumePass: false,
    };
  }

  return {
    allowed: true,
    reason: "PLAN_COVERS_FEATURE",
    shouldOpenPaymentModal: false,
    shouldConsumePass: true,
  };
}

export type ServiceExecutionStatus = "pending" | "success" | "failed" | "refunded" | "cancelled";

export type PaidServiceDeliveryStatus =
  | "payment_pending"
  | "paid"
  | "entitlement_granting"
  | "entitlement_granted"
  | "generating"
  | "delivered"
  | "failed"
  | "refund_pending"
  | "refunded"
  | "refund_failed";

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
  serviceId?: string;
  productId?: string;
  profileId?: string;
  paymentId?: string;
  merchantUid?: string;
  impUid?: string;
  orderId?: string;
  jobId?: string;
  amount?: number;
  currency?: string;
  paymentProvider?: string;
  premiumStatus?: string;
  deliveryStatus?: PaidServiceDeliveryStatus;
  refundStatus?: "none" | "pending" | "refunded" | "failed" | "refund_failed";
  refundReason?: string;
  refundIdempotencyKey?: string;
  deliveredAt?: string | null;
  failedAt?: string | null;
  refundRequestedAt?: string | null;
  refundedAt?: string | null;
  refundFailedAt?: string | null;
  refundFailureReason?: string;
  compensation: {
    coinRefunded: boolean;
    coinRefundTxId: string;
    paymentCancelled: boolean;
  };
};

function toText(value: unknown): string {
  return String(value || "").trim();
}

function normalizeBillingFeatureKey(value: unknown): string {
  const key = toText(value).toLowerCase();
  return BILLING_FEATURE_KEY_ALIASES[key] || key;
}

function normalizePaymentMode(value: unknown): string {
  const mode = toText(value).toUpperCase().replace(/[\s-]+/g, "_");
  if (mode === "MONTHLY_CREDIT" || mode === "MEMBERSHIP_CREDIT" || mode === "MOONLIGHTSTONE") return "MOONLIGHT_STONE";
  return mode;
}

function normalizePaymentModeList(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : toText(value).split(",");
  return values
    .map((item) => normalizePaymentMode(item))
    .filter(Boolean);
}

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeSubscriptionSnapshotTier(value: unknown): SubscriptionSnapshotTier {
  const tier = toText(value).toLowerCase();
  if (tier.includes("family") || tier.includes("code destiny family")) return "family";
  if (tier.includes("gold") || tier.includes("vvip")) return "vvip";
  if (tier.includes("silver") || tier.includes("premium")) return "premium";
  if (tier.includes("bronze") || tier.includes("standard")) return "standard";
  return "free";
}

function subscriptionSnapshotPassLimit(tier: SubscriptionSnapshotTier): number {
  if (tier === "family") return 999999999;
  if (tier === "vvip") return 100;
  if (tier === "premium") return 50;
  if (tier === "standard") return 30;
  return 0;
}

function resolveSubscriptionSnapshotUserId(userId?: string): string {
  const explicit = toText(userId).toLowerCase();
  if (explicit) return explicit;
  if (typeof window === "undefined") return "";
  return resolveAuthScopeFromUser(readSanitizedAuthUser());
}

function subscriptionSnapshotKey(userId: string): string {
  return `${SUBSCRIPTION_SNAPSHOT_KEY_PREFIX}${userId}`;
}

function normalizeSubscriptionSnapshotDate(value: unknown): string | null {
  const text = toText(value);
  if (!text) return null;
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function subscriptionSnapshotStatusIsActive(value: unknown): boolean {
  return SUBSCRIPTION_SNAPSHOT_ACTIVE_STATUSES.has(toText(value).toLowerCase());
}

function subscriptionSnapshotStatusIsInactive(value: unknown): boolean {
  return SUBSCRIPTION_SNAPSHOT_INACTIVE_STATUSES.has(toText(value).toLowerCase());
}

function removeSubscriptionSnapshotByUserId(userId: string) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.removeItem(subscriptionSnapshotKey(userId));
  } catch {
    /* noop */
  }
}

export function clearSubscriptionSnapshotForUser(userId?: string) {
  removeSubscriptionSnapshotByUserId(resolveSubscriptionSnapshotUserId(userId));
}

export function readSubscriptionSnapshotForUser(userId?: string): SubscriptionSnapshot | null {
  const resolvedUserId = resolveSubscriptionSnapshotUserId(userId);
  if (typeof window === "undefined" || !resolvedUserId) return null;
  try {
    const raw = localStorage.getItem(subscriptionSnapshotKey(resolvedUserId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      removeSubscriptionSnapshotByUserId(resolvedUserId);
      return null;
    }
    const snapshotUserId = toText(parsed.userId).toLowerCase();
    const state = parsed.state === "active" || parsed.state === "none" ? parsed.state : "";
    const tier = normalizeSubscriptionSnapshotTier(parsed.tier);
    const checkedAt = Number(parsed.checkedAt);
    const expiresAt = normalizeSubscriptionSnapshotDate(parsed.expiresAt);
    if (snapshotUserId !== resolvedUserId || !state || !Number.isFinite(checkedAt) || (state === "active" && tier === "free")) {
      removeSubscriptionSnapshotByUserId(resolvedUserId);
      return null;
    }
    if (state === "none" && Date.now() - checkedAt > SUBSCRIPTION_SNAPSHOT_NONE_TTL_MS) {
      removeSubscriptionSnapshotByUserId(resolvedUserId);
      return null;
    }
    if (state === "active" && Date.now() - checkedAt > SUBSCRIPTION_SNAPSHOT_ACTIVE_TTL_MS) {
      removeSubscriptionSnapshotByUserId(resolvedUserId);
      return null;
    }
    if (state === "active" && expiresAt && Date.parse(expiresAt) <= Date.now()) {
      removeSubscriptionSnapshotByUserId(resolvedUserId);
      return null;
    }
    return {
      userId: snapshotUserId,
      state,
      tier: state === "active" ? tier : "free",
      expiresAt: state === "active" ? expiresAt : null,
      checkedAt,
      purchaseVersion: toText(parsed.purchaseVersion),
      source: toText(parsed.source || "local"),
    };
  } catch {
    removeSubscriptionSnapshotByUserId(resolvedUserId);
    return null;
  }
}

function buildSubscriptionSnapshotPayload(userId: string, value: unknown, source: string): SubscriptionSnapshot {
  const record = asRecord(value) || {};
  const nested = asRecord(record.subscription) || asRecord(record.membership) || asRecord(record.membershipPass) || {};
  const options = asRecord(record.paymentOptions) || {};
  const membershipPass = asRecord(record.membershipPass) || {};
  const tier = normalizeSubscriptionSnapshotTier(
    record.tier
      ?? record.plan
      ?? record.planId
      ?? record.passTier
      ?? record.subscriptionTier
      ?? options.tier
      ?? options.passTier
      ?? options.subscriptionTier
      ?? membershipPass.tier
      ?? membershipPass.passTier
      ?? nested.tier
      ?? nested.plan
      ?? nested.passTier,
  );
  const expiresAt = normalizeSubscriptionSnapshotDate(
    record.expiresAt
      ?? record.currentPeriodEnd
      ?? record.endsAt
      ?? record.validUntil
      ?? options.expiresAt
      ?? nested.expiresAt
      ?? nested.currentPeriodEnd
      ?? nested.endsAt
      ?? nested.validUntil,
  );
  const expiredByDate = !!expiresAt && Date.parse(expiresAt) <= Date.now();
  const rawStatus = record.status ?? record.subscriptionStatus ?? record.membershipStatus ?? options.status ?? nested.status ?? nested.subscriptionStatus;
  const hasFutureExpiry = !!expiresAt && Date.parse(expiresAt) > Date.now();
  const explicitActive = record.isActive === true
    || record.isSubscribed === true
    || record.active === true
    || record.enabled === true
    || record.valid === true
    || record.hasActivePass === true
    || options.hasActivePass === true
    || nested.isActive === true
    || nested.isSubscribed === true
    || subscriptionSnapshotStatusIsActive(rawStatus);
  const explicitInactive = subscriptionSnapshotStatusIsInactive(rawStatus)
    || (record.isActive === false && !explicitActive)
    || (record.isSubscribed === false && !explicitActive)
    || (record.hasActivePass === false && !explicitActive)
    || (options.hasActivePass === false && !explicitActive)
    || (nested.isActive === false && !explicitActive)
    || (nested.isSubscribed === false && !explicitActive);
  const state = tier !== "free" && !expiredByDate && !explicitInactive && (explicitActive || hasFutureExpiry) ? "active" : "none";
  return {
    userId,
    state,
    tier: state === "active" ? tier : "free",
    expiresAt: state === "active" ? expiresAt : null,
    checkedAt: Date.now(),
    purchaseVersion: toText(record.purchaseVersion ?? record.paymentId ?? record.merchantUid ?? record.orderId ?? record.subscriptionId ?? record.updatedAt ?? expiresAt),
    source: toText(source || record.source || "client"),
  };
}

export function saveSubscriptionSnapshotForUser(userId: string | undefined, value: unknown, source = "client"): SubscriptionSnapshot | null {
  const resolvedUserId = resolveSubscriptionSnapshotUserId(userId);
  if (typeof window === "undefined" || !resolvedUserId) return null;
  try {
    const snapshot = buildSubscriptionSnapshotPayload(resolvedUserId, value, source);
    localStorage.setItem(subscriptionSnapshotKey(resolvedUserId), JSON.stringify(snapshot));
    return snapshot;
  } catch {
    return null;
  }
}

function readSubscriptionSnapshotMonthlyBalance(): number {
  const user = typeof window !== "undefined" ? readSanitizedAuthUser() : null;
  const balance = resolveMonthlyStoneBalance(user, user?.profileSubscription) ?? 0;
  return Number.isFinite(balance) && balance > 0 ? Math.floor(balance) : 0;
}

function buildSnapshotPaymentEligibility(input: {
  coinCost?: number;
  coinPrice?: number;
  priceKRW?: number;
  amountKRW?: number;
}, snapshot: SubscriptionSnapshot, phase: PaymentEligibilityPhase = "full"): BillingResult<PaymentEligibility> {
  const inputPriceKRW = Math.max(0, Math.floor(toNumber(input.priceKRW ?? input.amountKRW, 0)));
  const coinCost = Math.max(0, Math.floor(toNumber(input.coinCost ?? input.coinPrice, inputPriceKRW > 0 ? Math.ceil(inputPriceKRW / 100) : 0)));
  const priceKRW = Math.max(0, Math.floor(toNumber(input.priceKRW ?? input.amountKRW ?? coinCost * 100, 0)));
  const monthlyBalance = phase === "pass" ? 0 : readSubscriptionSnapshotMonthlyBalance();
  const passLimit = snapshot.state === "active" ? subscriptionSnapshotPassLimit(snapshot.tier) : 0;
  const passTier = snapshot.state === "active" && snapshot.tier !== "free"
    ? snapshot.tier as PaymentEligibility["pass"]["tier"]
    : null;
  const canUseByPass = snapshot.state === "active" && passLimit > 0 && coinCost > 0 && (snapshot.tier === "family" || coinCost <= passLimit);
  const paymentOptions = {
    hasActivePass: snapshot.state === "active",
    passTier,
    passLimit,
    freeLimit: passLimit,
    canUseByPass,
    ...(phase === "pass" ? {} : { monthlyBalance }),
    canUseByMonthly: false,
    canUseByCard: phase !== "pass",
    coinCost,
  };
  const raw = {
    source: snapshot.source || "subscription_snapshot",
    subscriptionSnapshot: snapshot,
    paymentOptions,
  };
  return {
    ok: true,
    status: 200,
    data: {
      loading: false,
      coinCost,
      priceKRW,
      access: {
        canAccess: false,
        alreadyUnlocked: false,
        reason: snapshot.state === "active" ? "subscription_snapshot_active" : "subscription_snapshot_none",
      },
      pass: {
        hasActivePass: snapshot.state === "active",
        tier: passTier,
        label: labelForPassTier(passTier),
        limit: passLimit > 0 ? passLimit : null,
        canUse: canUseByPass,
      },
      monthly: {
        balance: phase === "pass" ? 0 : monthlyBalance,
        canUse: false,
        afterBalance: phase === "pass" ? 0 : monthlyBalance,
      },
      card: {
        canUse: phase !== "pass",
        provider: "PORTONE_V2_KG_INICIS",
      },
      raw,
    },
    message: "",
    error: null,
    raw,
  };
}

async function fetchPricingForSubscriptionSnapshot(input: {
  productId?: string;
  serviceType?: string;
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
}): Promise<Record<string, unknown> | null> {
  const query = toQuery({
    productId: input.productId,
    serviceType: input.serviceType,
    categoryKey: input.categoryKey,
    subFeatureKey: input.subFeatureKey,
    featureKey: input.featureKey,
    reason: input.reason,
  });
  if (!query) return null;
  const response = await authFetchBilling(`/api/billing/features?${query}`, { method: "GET" });
  const parsed = await parseBillingResponse<{ pricing?: Record<string, unknown> }>(response);
  return parsed.ok && parsed.data?.pricing && typeof parsed.data.pricing === "object" ? parsed.data.pricing : null;
}

export function formatPaymentWon(amount: number): string {
  return `${Math.max(0, Math.floor(Number(amount || 0))).toLocaleString("ko-KR")}원`;
}

function formatCoinValueWon(amount: number): string {
  return formatPaymentWon(Math.max(0, Math.floor(Number(amount || 0))) * 100);
}

function formatMembershipPassLimitLabel(tier: unknown, limit: number): string {
  const normalizedTier = toText(tier).toLowerCase();
  if (normalizedTier === "family" || limit >= 999999999) return "모든 유료 기능 이용 가능";
  if (limit > 0) return `${formatCoinValueWon(limit)} 이하 기능은 이용권으로 바로 열립니다.`;
  return "현재 서비스는 이용권 적용 범위 밖이라 결제가 필요합니다.";
}

function escapePaymentText(value: unknown): string {
  return toText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstFiniteNonNegativeNumber(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0) return Math.floor(value);
  }
  return null;
}

function readBillingMonthlyBalance(source: Record<string, unknown> | null | undefined): number | null {
  if (!source) return null;
  const monthlyStoneBalance = resolveMonthlyStoneBalance(source);
  if (monthlyStoneBalance !== null) return monthlyStoneBalance;
  const consume = asRecord(source.consume);
  const membership = asRecord(source.membership);
  const user = asRecord(source.user);
  const profileSubscription = asRecord(user?.profileSubscription);
  const paymentOptions = asRecord(source.paymentOptions);
  return firstFiniteNonNegativeNumber(
    consume?.remainingMembershipCredit,
    consume?.monthlyCredits,
    consume?.membershipCreditBalance,
    source.membershipCreditBalance,
    source.monthlyCredits,
    source.monthlyBalance,
    paymentOptions?.monthlyBalance,
    membership?.membershipCreditBalance,
    membership?.monthlyCredits,
    user?.monthlyCredits,
    profileSubscription?.membershipCreditBalance,
  );
}

function normalizeBillingBalanceFields(source: Record<string, unknown> | null | undefined) {
  if (!source) return;
  const user = asRecord(source.user);
  const balance = firstFiniteNonNegativeNumber(source.balance, user?.points);
  const monthlyBalance = readBillingMonthlyBalance(source);
  if (balance !== null) source.balance = balance;
  if (monthlyBalance !== null) {
    source.monthlyStoneBalance = monthlyBalance;
    source.membershipCreditBalance = monthlyBalance;
    source.monthlyCredits = monthlyBalance;
  }
}

function emitBillingBalanceUpdated(source: Record<string, unknown> | null | undefined, eventSource: string) {
  if (typeof window === "undefined" || !source) return;
  const user = asRecord(source.user);
  const balance = firstFiniteNonNegativeNumber(source.balance, user?.points);
  const monthlyBalance = readBillingMonthlyBalance(source);
  const detail: Record<string, unknown> = { source: eventSource };
  if (balance !== null) detail.balance = balance;
  if (monthlyBalance !== null) {
    assignMonthlyStoneBalance(detail, monthlyBalance);
    detail.membershipCreditBalance = monthlyBalance;
    detail.monthlyCredits = monthlyBalance;
  }
  if (source.user) detail.user = source.user;
  if (Array.isArray(source.unlockedFeatures)) detail.unlockedFeatures = source.unlockedFeatures;
  if (source.unlockMap && typeof source.unlockMap === "object") detail.unlockMap = source.unlockMap;
  window.dispatchEvent(new CustomEvent("cd:billing-balance-updated", { detail }));
}

function resolvePassStorePlan(coinPrice: number, currentTier?: string): "standard" | "premium" | "vvip" | "family" {
  const tier = toText(currentTier).toLowerCase();
  if (coinPrice <= 30 && tier !== "standard" && tier !== "premium" && tier !== "vvip" && tier !== "family") return "standard";
  if (coinPrice <= 50 && tier !== "premium" && tier !== "vvip" && tier !== "family") return "premium";
  if (coinPrice <= 100 && tier !== "vvip" && tier !== "family") return "vvip";
  return "family";
}

function openMembershipPassStore(coinPrice: number, currentTier?: string) {
  if (typeof window === "undefined") return;
  const runtimeWindow = window as RuntimeApiWindow;
  runtimeWindow._cdSetCoinGateOverlay?.(false);
  if (typeof runtimeWindow.__cdOpenChargeModal === "function") {
    runtimeWindow.__cdOpenChargeModal();
    return;
  }
  const url = new URL("/points", window.location.origin);
  url.searchParams.set("source", "react-payment-pass-store");
  url.searchParams.set("plan", resolvePassStorePlan(coinPrice, currentTier));
  window.location.assign(url.toString());
}

function hasActiveReactPaymentChoiceModal() {
  return typeof document !== "undefined" && Boolean(document.querySelector("[data-cd-react-payment-choice]"));
}

function ensureReactPaymentChoiceStyles() {
  if (typeof document === "undefined" || document.getElementById("cd-react-payment-choice-style")) return;
  const style = document.createElement("style");
  style.id = "cd-react-payment-choice-style";
  style.textContent = `
    .cd-react-payment-choice-backdrop{position:fixed;inset:0;z-index:2147483004;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 2%,rgba(250,230,160,.2),transparent 30%),radial-gradient(circle at 16% 18%,rgba(147,197,253,.14),transparent 28%),radial-gradient(circle at 88% 74%,rgba(196,181,253,.16),transparent 30%),linear-gradient(145deg,rgba(7,11,34,.86),rgba(13,18,52,.88) 48%,rgba(21,16,42,.9));padding:18px;backdrop-filter:blur(16px) saturate(130%)}
    .cd-react-payment-choice-dialog{position:relative;isolation:isolate;width:min(440px,100%);max-height:calc(100dvh - 36px);border:1px solid rgba(255,242,184,.34);border-radius:24px;background:radial-gradient(circle at 50% -8%,rgba(250,230,160,.16),transparent 34%),radial-gradient(circle at 18% 20%,rgba(147,197,253,.1),transparent 32%),linear-gradient(155deg,rgba(7,12,34,.98),rgba(14,22,56,.985) 48%,rgba(33,24,64,.97));box-shadow:0 30px 82px rgba(0,0,0,.56),0 0 46px rgba(147,197,253,.14),0 0 34px rgba(250,230,160,.1),inset 0 1px 0 rgba(255,255,255,.16);padding:18px 20px 20px;color:#f8fafc;overflow:auto;overflow-x:hidden;scrollbar-width:thin}
    .cd-react-payment-choice-dialog>*{position:relative;z-index:1}
    .cd-react-payment-choice-dialog::before{content:"";position:absolute;right:-58px;top:-62px;width:132px;height:132px;border-radius:999px;background:radial-gradient(circle at 64% 35%,rgba(8,12,32,.96) 0 33%,transparent 34%),radial-gradient(circle at 38% 32%,rgba(255,242,184,.6) 0 18%,rgba(247,215,122,.24) 19% 38%,rgba(219,234,254,.08) 39% 66%,transparent 68%);filter:blur(.3px);opacity:.5;box-shadow:0 0 42px rgba(250,230,160,.12),0 0 70px rgba(147,197,253,.06);pointer-events:none;z-index:0}
    .cd-react-payment-choice-dialog::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 12% 13%,rgba(255,255,255,.8) 0 1px,transparent 2px),radial-gradient(circle at 76% 18%,rgba(186,230,253,.72) 0 1px,transparent 2px),radial-gradient(circle at 20% 58%,rgba(221,214,254,.58) 0 1px,transparent 2px),radial-gradient(circle at 88% 70%,rgba(254,243,199,.62) 0 1px,transparent 2px),radial-gradient(circle at 44% 3%,rgba(255,242,184,.16),transparent 24%);pointer-events:none;opacity:.78;z-index:0}
    .cd-react-payment-choice-visual{position:relative;width:112px;height:96px;margin:0 auto 8px;pointer-events:none;animation:cdReactPaymentMoonFloat 6.8s ease-in-out infinite}
    .cd-react-payment-choice-aura,.cd-react-payment-choice-glass,.cd-react-payment-choice-crescent,.cd-react-payment-choice-stars,.cd-react-payment-choice-reflect{position:absolute;pointer-events:none}
    .cd-react-payment-choice-aura{border-radius:999px;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid rgba(219,234,254,.2);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 24px rgba(147,197,253,.1)}
    .cd-react-payment-choice-aura--outer{width:94px;height:94px;background:radial-gradient(circle,rgba(219,234,254,.05),rgba(196,181,253,.06) 48%,transparent 70%)}
    .cd-react-payment-choice-aura--inner{width:72px;height:72px;border-color:rgba(255,242,184,.24);background:radial-gradient(circle,rgba(250,230,160,.08),transparent 64%);box-shadow:0 0 30px rgba(250,230,160,.14)}
    .cd-react-payment-choice-glass{left:16px;top:8px;width:80px;height:80px;border-radius:999px;background:radial-gradient(circle at 35% 26%,rgba(255,255,255,.18),transparent 24%),linear-gradient(145deg,rgba(219,234,254,.09),rgba(196,181,253,.04));border:1px solid rgba(219,234,254,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.14);backdrop-filter:blur(3px)}
    .cd-react-payment-choice-crescent{left:32px;top:22px;width:50px;height:50px;border-radius:999px;background:radial-gradient(circle at 32% 28%,#fff7d6 0 20%,#fff2b8 21% 42%,#f7d77a 58%,#dbeafe 100%);box-shadow:0 0 22px rgba(250,230,160,.32),0 0 40px rgba(147,197,253,.13),inset -7px -5px 12px rgba(196,181,253,.18)}
    .cd-react-payment-choice-crescent::before{content:"";position:absolute;left:19px;top:3px;width:48px;height:48px;border-radius:999px;background:linear-gradient(145deg,rgba(7,11,34,.96),rgba(24,21,56,.92));box-shadow:-8px 3px 14px rgba(7,11,34,.22),inset 7px 0 16px rgba(147,197,253,.06)}
    .cd-react-payment-choice-crescent::after{content:"";position:absolute;left:10px;top:11px;width:4px;height:4px;border-radius:999px;background:rgba(255,255,255,.78);box-shadow:14px 25px 0 rgba(255,242,184,.54),22px 7px 0 rgba(219,234,254,.4);opacity:.72}
    .cd-react-payment-choice-stars{left:22px;top:20px;width:3px;height:3px;border-radius:999px;background:rgba(219,234,254,.92);box-shadow:52px -6px 0 rgba(255,242,184,.78),70px 23px 0 rgba(196,181,253,.66),8px 46px 0 rgba(255,255,255,.54),58px 54px 0 rgba(186,230,253,.55)}
    .cd-react-payment-choice-reflect{left:27px;right:27px;bottom:3px;height:12px;border-radius:999px;background:radial-gradient(ellipse,rgba(250,230,160,.18),rgba(147,197,253,.08) 48%,transparent 72%);filter:blur(3px)}
    @keyframes cdReactPaymentMoonFloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-5px,0)}}
    .cd-react-payment-choice-title{position:relative;margin:0;font-size:22px;line-height:1.25;font-weight:900;letter-spacing:0;color:#fff7db;text-shadow:0 0 22px rgba(243,221,154,.24)}
    .cd-react-payment-choice-sub{position:relative;margin:8px 0 16px;color:rgba(219,234,254,.78);font-size:14px;line-height:1.6}
    .cd-react-payment-choice-note{position:relative;margin:0 0 14px;border:1px solid rgba(219,234,254,.22);border-radius:16px;background:linear-gradient(135deg,rgba(10,17,42,.76),rgba(20,28,66,.6));padding:12px 13px;font-size:13px;line-height:1.55;color:#dbeafe;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 0 22px rgba(147,197,253,.06)}
    .cd-react-payment-choice-grid{display:grid;gap:10px}
    .cd-react-payment-choice-option{position:relative;width:100%;border:1px solid rgba(219,234,254,.22);border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.03));padding:13px 14px;color:#f8fafc;text-align:left;cursor:pointer;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.11),0 12px 28px rgba(2,6,23,.24);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
    .cd-react-payment-choice-option::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 92% 16%,rgba(255,242,184,.1),transparent 30%),linear-gradient(135deg,rgba(255,255,255,.06),transparent 42%);pointer-events:none}
    .cd-react-payment-choice-option:hover{border-color:rgba(255,242,184,.64);transform:translateY(-1px);box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 16px 34px rgba(2,6,23,.34),0 0 24px rgba(250,230,160,.12)}
    .cd-react-payment-choice-option:focus{outline:0}
    .cd-react-payment-choice-option:focus-visible{outline:2px solid rgba(255,242,184,.84);outline-offset:3px;border-color:rgba(255,242,184,.78);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 0 5px rgba(250,230,160,.1),0 0 24px rgba(147,197,253,.14)}
    .cd-react-payment-choice-option[data-mode="pass-store"]{border-color:rgba(255,242,184,.66);background:linear-gradient(145deg,rgba(46,42,30,.84),rgba(28,32,66,.82))}
    .cd-react-payment-choice-option[data-mode="direct"]{border-color:rgba(247,215,122,.42);background:linear-gradient(145deg,rgba(45,37,30,.82),rgba(31,27,43,.82))}
    .cd-react-payment-choice-option[data-mode="monthly"]{border-color:rgba(147,197,253,.42);background:linear-gradient(145deg,rgba(12,40,67,.82),rgba(22,27,58,.82))}
    .cd-react-payment-choice-option:disabled{cursor:not-allowed;opacity:.52}
    .cd-react-payment-choice-option--recommended{border-color:rgba(255,224,130,.74);background:linear-gradient(145deg,rgba(255,247,219,.16),rgba(250,230,160,.06));box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 16px 34px rgba(2,6,23,.3),0 0 26px rgba(250,220,150,.18)}
    .cd-react-payment-choice-option--recommended:hover{border-color:rgba(255,232,150,.9)}
    .cd-react-payment-choice-cardhead{position:relative;display:flex;align-items:center;gap:8px;margin-bottom:9px}
    .cd-react-payment-choice-recommend{margin-left:auto;flex:none;display:inline-flex!important;width:auto;align-items:center;padding:3px 10px;border-radius:999px;background:linear-gradient(135deg,#ffe9a8,#f6be6a);color:#3a2606;font-size:10.5px;font-weight:900;letter-spacing:.02em;box-shadow:0 4px 12px rgba(246,190,106,.34)}
    .cd-react-payment-choice-option strong{position:relative;display:block;margin-top:0;font-size:15px;line-height:1.35;color:#fff}
    .cd-react-payment-choice-option span{position:relative;display:block;color:rgba(229,236,255,.78);font-size:12px;line-height:1.5}
    .cd-react-payment-choice-option strong+span{margin-top:4px}
    .cd-react-payment-choice-badge{display:inline-flex!important;align-items:center;width:auto;border:1px solid rgba(255,242,184,.28);border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(219,234,254,.07));backdrop-filter:blur(8px);padding:3px 9px;color:#fff7db!important;font-size:11px!important;font-weight:900;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 18px rgba(250,230,160,.08)}
    .cd-react-payment-choice-glyph{margin-right:5px;font-size:12px;line-height:1;filter:drop-shadow(0 0 6px rgba(250,230,160,.32))}
    .cd-react-payment-choice-amount{color:#ffe9a8;font-size:16.5px;font-weight:900;letter-spacing:.01em;text-shadow:0 0 14px rgba(250,220,150,.3)}
    .cd-react-payment-choice-option.is-disabled,.cd-react-payment-choice-option:disabled{cursor:not-allowed;opacity:.62;border-color:rgba(148,163,184,.3)!important;background:linear-gradient(145deg,rgba(30,37,54,.74),rgba(22,27,44,.74))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)!important}
    .cd-react-payment-choice-option.is-disabled:hover{transform:none;border-color:rgba(148,163,184,.3)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)!important}
    .cd-react-payment-choice-option.is-disabled .cd-react-payment-choice-amount{color:rgba(226,232,240,.64);text-shadow:none}
    .cd-react-payment-choice-status{min-height:18px;margin-top:12px;color:#f3dd9a;font-size:13px;line-height:1.45}
    .cd-react-payment-choice-actions{display:flex;justify-content:flex-end;margin-top:14px}
    .cd-react-payment-choice-cancel{border:1px solid rgba(186,230,253,.28);border-radius:999px;background:rgba(255,255,255,.1);padding:9px 15px;color:#f8fafc;cursor:pointer;font-weight:900}
    .cd-react-payment-choice-moonbal-current{color:rgba(191,219,254,.94)!important;font-weight:800!important;font-size:12px!important;margin-top:4px}
    .cd-react-payment-choice-moonbal{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:8px 11px;border:1px solid rgba(147,197,253,.28);border-radius:12px;background:linear-gradient(145deg,rgba(12,40,67,.5),rgba(22,27,58,.4))}
    .cd-react-payment-choice-moonbal-text{flex:1;min-width:0;color:rgba(219,234,254,.86);font-size:12px;line-height:1.45}
    .cd-react-payment-choice-moonbal-refresh{flex:none;border:1px solid rgba(147,197,253,.5);border-radius:999px;background:rgba(147,197,253,.14);padding:7px 13px;color:#e0f2fe;cursor:pointer;font-size:12px;font-weight:900;white-space:nowrap;transition:background .15s ease,border-color .15s ease}
    .cd-react-payment-choice-moonbal-refresh:hover{background:rgba(147,197,253,.24);border-color:rgba(147,197,253,.72)}
    .cd-react-payment-choice-moonbal-refresh:disabled{opacity:.55;cursor:progress}
    @media(max-width:640px){.cd-react-payment-choice-backdrop{align-items:flex-start;padding:10px;background:linear-gradient(145deg,rgba(7,11,34,.94),rgba(18,18,48,.96));backdrop-filter:none}.cd-react-payment-choice-dialog{width:100%;max-height:calc(100dvh - 20px);border-radius:20px;padding:12px;box-shadow:0 18px 42px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.14)}.cd-react-payment-choice-dialog::before{width:118px;height:118px;right:-30px;top:-42px;opacity:.42;box-shadow:0 0 24px rgba(250,230,160,.1)}.cd-react-payment-choice-dialog::after{opacity:.42}.cd-react-payment-choice-visual{width:94px;height:78px;margin-bottom:6px}.cd-react-payment-choice-aura--outer{width:78px;height:78px}.cd-react-payment-choice-aura--inner{width:60px;height:60px;box-shadow:0 0 18px rgba(250,230,160,.1)}.cd-react-payment-choice-glass{left:15px;top:7px;width:64px;height:64px;backdrop-filter:none}.cd-react-payment-choice-reflect{filter:none;opacity:.64}.cd-react-payment-choice-badge{backdrop-filter:none}.cd-react-payment-choice-crescent{left:29px;top:20px;width:39px;height:39px;box-shadow:0 0 16px rgba(250,230,160,.24),inset -6px -4px 10px rgba(196,181,253,.14)}.cd-react-payment-choice-crescent::before{left:15px;top:2px;width:38px;height:38px}.cd-react-payment-choice-title{font-size:20px}.cd-react-payment-choice-sub{font-size:12.5px;line-height:1.5}.cd-react-payment-choice-option{padding:12px 13px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 8px 20px rgba(2,6,23,.2)}.cd-react-payment-choice-option strong{font-size:14px}.cd-react-payment-choice-option span{font-size:11.5px}}
    @media(prefers-reduced-motion:reduce){.cd-react-payment-choice-visual{animation:none!important}.cd-react-payment-choice-option{transition:none}.cd-react-payment-choice-option:hover{transform:none}}
  `;
  document.head.appendChild(style);
}

async function openReactPaymentChoiceModal(options: Record<string, unknown>): Promise<PaymentChoiceMode> {
  const now = Date.now();
  if (reactPaymentChoiceInFlight && now - reactPaymentChoiceInFlight.startedAt < PAYMENT_CHOICE_IN_FLIGHT_TTL_MS && hasActiveReactPaymentChoiceModal()) {
    return reactPaymentChoiceInFlight.promise;
  }
  reactPaymentChoiceInFlight = null;

  const promise = openReactPaymentChoiceModalInner(options || {});
  reactPaymentChoiceInFlight = { promise, startedAt: now };
  return promise.finally(() => {
    if (reactPaymentChoiceInFlight?.promise === promise) reactPaymentChoiceInFlight = null;
  });
}

async function openReactPaymentChoiceModalInner(options: Record<string, unknown>): Promise<PaymentChoiceMode> {
  if (typeof window === "undefined" || typeof document === "undefined" || !document.body) {
    return Promise.resolve("cancel");
  }

  ensureReactPaymentChoiceStyles();
  document.querySelectorAll("[data-cd-react-payment-choice]").forEach((node) => node.parentNode?.removeChild(node));

  const opts = options || {};
  const title = toText(opts.title || opts.reason || "유료 서비스") || "유료 서비스";
  const coinPrice = Math.max(0, Math.floor(toNumber(opts.coinPrice ?? opts.cost, 0)));
  const normalizedCategoryKey = toText(opts.categoryKey).toLowerCase();
  const normalizedProductType = toText(opts.productType || opts.serviceType).toLowerCase();
  const isMusicTrackPayment = normalizedCategoryKey === "music-track" || normalizedProductType === "music_track" || normalizedProductType === "music-track";
  const membershipCoverage = asRecord(opts.membershipCoverage);
  const directCoinPrice = coinPrice;
  const rawDirectAmount = Math.max(0, Math.floor(toNumber(opts.amountKrw ?? opts.amountKRW, directCoinPrice * 100)));
  const directAmount = rawDirectAmount;
  const allowedPaymentModes = Array.isArray(opts.allowedPaymentModes)
    ? opts.allowedPaymentModes.map((mode) => toText(mode).toLowerCase())
    : null;
  const paymentOptions = asRecord(opts.paymentOptions);
  const equalPriorityMethods = normalizePaymentModeList(
    opts.equalPriorityMethods
      ?? paymentOptions?.equalPriorityMethods
      ?? opts.recommendedMethods
      ?? paymentOptions?.recommendedMethods,
  );
  const hasEqualPriorityMethods = equalPriorityMethods.length > 0;
  let canShowDirect = (!allowedPaymentModes || allowedPaymentModes.includes("direct") || allowedPaymentModes.includes("direct_krw") || allowedPaymentModes.includes("card"))
    && (!hasEqualPriorityMethods || equalPriorityMethods.includes("DIRECT_KRW"));
  const canShowPassStore = !isMusicTrackPayment && opts.disablePassChoice !== true && (!allowedPaymentModes || allowedPaymentModes.includes("pass") || allowedPaymentModes.includes("membership_pass"));
  const canShowPassRefresh = canShowPassStore;
  const paymentChoiceSub = isMusicTrackPayment ? billingClientText("billingClient.text.008") : billingClientText("billingClient.text.002");
  const monthlyCost = Math.max(0, Math.floor(toNumber(opts.membershipCreditCost, coinPrice * 10)));
  const providedMonthlyBalanceRaw = opts.monthlyBalance ?? opts.monthlyCredits ?? opts.membershipCreditBalance;
  const hasProvidedMonthlyBalance = typeof providedMonthlyBalanceRaw === "number" && Number.isFinite(providedMonthlyBalanceRaw) && providedMonthlyBalanceRaw >= 0;
  const monthlyBalance = Math.max(0, Math.floor(toNumber(providedMonthlyBalanceRaw, 0)));
  // 스냅샷 잔량이 제공되지 않았으면(=조회 실패/미확정) '잔량 부족'이 아니라 '확인 필요'로 취급한다.
  // 초기 오인을 막고, 모달이 열릴 때 자동 1회 재조회로 실제 잔량을 채운다.
  const monthlyCanUse = hasProvidedMonthlyBalance && monthlyCost > 0 && monthlyBalance >= monthlyCost;
  // 월정석은 정적 결제창과 동일하게 잔량과 무관히 항상 노출하고, 부족하면 숨기지 않고 비활성(회색)으로 둔다.
  // equalPriorityMethods 목록에 없다고 버튼을 제거하지 않는다(서버가 잔량 부족 시 목록에서 빼도 회색으로 노출).
  const canShowMonthly = !allowedPaymentModes || allowedPaymentModes.includes("monthly") || allowedPaymentModes.includes("moonlight_stone") || allowedPaymentModes.includes("membership_credit");
  const monthlyDisabled = !monthlyCanUse;
  if (!canShowDirect && !canShowMonthly) canShowDirect = true;
  const monthlyAfterBalance = Math.max(0, monthlyBalance - monthlyCost);
  const passTier = toText(membershipCoverage?.tier || membershipCoverage?.passTier || "");
  const passLimit = Math.max(0, Math.floor(toNumber(membershipCoverage?.passLimit ?? membershipCoverage?.freeLimit, 0)));
  // 이용권이 없는 사용자에게는 달빛 이용권 상점을 결제 선택지 맨 위에 우선 노출하고
  // "추천" 배지/하이라이트로 위계를 준다(단건결제/월정석/게이팅은 그대로 유지).
  const hasActivePassTier = Boolean(passTier && passTier !== "free");
  // 무료/미보유 등급을 "FREE 이용권"으로 오표기하지 않는다(무료 이용권이라는 재화는 없음).
  // 활성 유료 등급일 때만 등급명을 배지로 노출하고, 그 외에는 중립적인 상점 라벨을 쓴다.
  const passLabel = hasActivePassTier ? `${passTier.toUpperCase()} 이용권` : "달빛 이용권 상점";
  const passHint = formatMembershipPassLimitLabel(passTier, passLimit);
  const passStoreTitle = hasActivePassTier ? "달빛 이용권 업그레이드" : "달빛 이용권 상점";
  const passStoreHint = hasActivePassTier
    ? "현재 이용권 한도를 넘는 기능입니다. 더 높은 달빛 이용권을 확인해 주세요."
    : "달빛 이용권을 구매하면 한도 이하 기능은 결제창 없이 바로 열립니다.";

  const directButtonHtml = canShowDirect ? `
          <button type="button" class="cd-react-payment-choice-option" data-mode="direct" aria-label="단건 결제 ${formatPaymentWon(directAmount)}">
            <span class="cd-react-payment-choice-cardhead"><span class="cd-react-payment-choice-badge"><span class="cd-react-payment-choice-glyph" aria-hidden="true">💳</span>${billingClientText("billingClient.text.003")}</span></span>
            <strong>단건 결제 · <span class="cd-react-payment-choice-amount">${formatPaymentWon(directAmount)}</span></strong>
            <span>${billingClientText("billingClient.text.004")}</span>
          </button>` : "";
  const monthlyCurrentLabel = hasProvidedMonthlyBalance ? `보유 월정석 ${monthlyBalance.toLocaleString("ko-KR")} 이벤트 재화` : "보유 월정석 · 확인 필요";
  const monthlyDescInitial = monthlyCanUse
    ? `보유 월정석에서 먼저 만료되는 지급분부터 차감됩니다. 사용 후 ${monthlyAfterBalance.toLocaleString("ko-KR")}이 남습니다. 월정석은 지급일로부터 30일간만 유효합니다.`
    : (hasProvidedMonthlyBalance
      ? "월정석 이벤트 재화 잔량이 부족합니다. 원화 단건 결제로 진행할 수 있어요."
      : "월정석 잔량 확인이 필요합니다. 원화 단건 결제는 계속 이용할 수 있어요.");
  const monthlyButtonHtml = canShowMonthly ? `
          <button type="button" class="cd-react-payment-choice-option${monthlyDisabled ? " is-disabled" : ""}" data-mode="monthly"${monthlyDisabled ? ' disabled aria-disabled="true"' : ""} aria-label="월정석 사용${monthlyDisabled ? (hasProvidedMonthlyBalance ? " (잔량 부족)" : " (잔량 확인 필요)") : ""}">
            <span class="cd-react-payment-choice-cardhead"><span class="cd-react-payment-choice-badge"><span class="cd-react-payment-choice-glyph" aria-hidden="true">🌙</span>${billingClientText("billingClient.text.005")}</span></span>
            <strong>월정석 사용 · <span class="cd-react-payment-choice-amount">${monthlyCost.toLocaleString("ko-KR")}</span> 이벤트 재화</strong>
            <span data-monthly-desc>${monthlyDescInitial}</span>
            <span class="cd-react-payment-choice-moonbal-current" data-monthly-current>${monthlyCurrentLabel}</span>
          </button>` : "";
  const passStoreFirst = canShowPassStore && !hasActivePassTier;
  const passStoreButtonHtml = canShowPassStore ? `
          <button type="button" class="cd-react-payment-choice-option${passStoreFirst ? " cd-react-payment-choice-option--recommended" : ""}" data-mode="pass-store" aria-label="${escapePaymentText(passStoreTitle)}${passStoreFirst ? " (추천)" : ""}">
            <span class="cd-react-payment-choice-cardhead"><span class="cd-react-payment-choice-badge"><span class="cd-react-payment-choice-glyph" aria-hidden="true">🎫</span>${escapePaymentText(passLabel)}</span>${passStoreFirst ? '<span class="cd-react-payment-choice-recommend">추천</span>' : ""}</span>
            <strong>${escapePaymentText(passStoreTitle)}</strong>
            <span>${escapePaymentText(passStoreHint)} ${escapePaymentText(passHint)}</span>
          </button>` : "";
  const paymentChoiceButtonsHtml = passStoreFirst
    ? `${passStoreButtonHtml}${directButtonHtml}${monthlyButtonHtml}`
    : `${directButtonHtml}${monthlyButtonHtml}${passStoreButtonHtml}`;
  // 월정석이 결제 옵션인 한 잔량 상태 + '월정석 재조회' 버튼을 항상 노출한다(결제 버튼 바깥이라 비활성과 무관히 동작).
  const moonlightRefreshRowHtml = canShowMonthly ? `
        <div class="cd-react-payment-choice-moonbal" data-moonbal-row>
          <span class="cd-react-payment-choice-moonbal-text" data-monthly-balance-text>${escapePaymentText(hasProvidedMonthlyBalance ? `월정석 잔여 확인 완료 · 현재 ${monthlyBalance.toLocaleString("ko-KR")} 이벤트 재화` : "월정석 잔량을 불러오는 중입니다. 안 보이면 재조회를 눌러 주세요.")}</span>
          <button type="button" class="cd-react-payment-choice-moonbal-refresh" data-mode="monthly-refresh">월정석 재조회</button>
        </div>` : "";

  return new Promise((resolve) => {
    let settled = false;
    let removeBalanceListener: (() => void) | null = null;
    const modal = document.createElement("div");
    modal.className = "cd-react-payment-choice-backdrop";
    modal.dataset.cdReactPaymentChoice = "1";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="cd-react-payment-choice-dialog">
        <div class="cd-react-payment-choice-visual" data-marker="react-payment-luxury-moon-v20260611" aria-hidden="true">
          <span class="cd-react-payment-choice-aura cd-react-payment-choice-aura--outer"></span>
          <span class="cd-react-payment-choice-aura cd-react-payment-choice-aura--inner"></span>
          <span class="cd-react-payment-choice-glass"></span>
          <span class="cd-react-payment-choice-crescent"></span>
          <span class="cd-react-payment-choice-stars"></span>
          <span class="cd-react-payment-choice-reflect"></span>
        </div>
        <h2 class="cd-react-payment-choice-title">${billingClientText("billingClient.text.001")}</h2>
        <p class="cd-react-payment-choice-sub">${escapePaymentText(paymentChoiceSub)}</p>
        <p class="cd-react-payment-choice-note"><strong>${escapePaymentText(title)}</strong><br>${formatCoinValueWon(coinPrice)} 기준 · ${formatPaymentWon(directAmount)}</p>
        <div class="cd-react-payment-choice-grid">
          ${paymentChoiceButtonsHtml}
        </div>
        ${moonlightRefreshRowHtml}
        <div class="cd-react-payment-choice-status" data-payment-status role="status" aria-live="polite"></div>
        <div class="cd-react-payment-choice-actions">
          ${canShowPassRefresh ? `<button type="button" class="cd-react-payment-choice-cancel" data-mode="refresh">${billingClientText("billingClient.text.006")}</button>` : ""}
          <button type="button" class="cd-react-payment-choice-cancel" data-mode="cancel">${billingClientText("billingClient.text.007")}</button>
        </div>
      </div>
    `;

    const close = (mode: PaymentChoiceMode) => {
      if (settled) return;
      settled = true;
      if (removeBalanceListener) { removeBalanceListener(); removeBalanceListener = null; }
      unlockBodyScroll();
      modal.parentNode?.removeChild(modal);
      resolve(mode);
    };
    const setStatus = (message: string, error = false) => {
      const statusNode = modal.querySelector<HTMLElement>("[data-payment-status]");
      if (!statusNode) return;
      statusNode.textContent = message;
      statusNode.style.color = error ? "#fca5a5" : "#fde68a";
    };
    const showWaitOverlay = (mode: PaymentChoiceMode) => {
      const runtimeWindow = window as RuntimeApiWindow;
      if (mode === "direct") {
        runtimeWindow._cdSetCoinGateOverlay?.(true, "단건 결제창을 여는 중입니다. 결제가 완료되면 이용 권한을 확인합니다.", "card");
      } else if (mode === "monthly") {
        runtimeWindow._cdSetCoinGateOverlay?.(true, "월정석 이벤트 재화 사용 권한을 확인하고 있습니다.", "monthly");
      }
    };

    let moonlightRefreshBusy = false;
    // 월정석 잔량 UI를 모달을 닫지 않고 제자리 갱신한다. state!=="fresh"면 '확인 필요'로 두어 조회 실패를 0으로 오인하지 않는다.
    // 단건 결제 버튼은 어떤 상태에서도 건드리지 않아 사용자가 막히지 않는다(CLAUDE.md 동등 노출).
    const applyMoonlightBalance = (rawBalance: number | null, state: "fresh" | "error" | "signed-out") => {
      if (settled) return;
      const known = state === "fresh" && typeof rawBalance === "number" && Number.isFinite(rawBalance) && rawBalance >= 0;
      const balance = known ? Math.floor(rawBalance as number) : 0;
      const canUse = known && monthlyCost > 0 && balance >= monthlyCost;
      const afterBalance = Math.max(0, balance - monthlyCost);
      const monthlyButton = modal.querySelector<HTMLButtonElement>('[data-mode="monthly"]');
      const currentNode = modal.querySelector<HTMLElement>("[data-monthly-current]");
      const descNode = modal.querySelector<HTMLElement>("[data-monthly-desc]");
      const balanceText = modal.querySelector<HTMLElement>("[data-monthly-balance-text]");
      if (currentNode) currentNode.textContent = known ? `보유 월정석 ${balance.toLocaleString("ko-KR")} 이벤트 재화` : "보유 월정석 · 확인 필요";
      if (balanceText) {
        balanceText.textContent = state === "signed-out"
          ? "로그인 후 월정석 잔량을 확인할 수 있어요."
          : state === "error"
            ? "월정석 잔량을 확인하지 못했어요. 다시 시도해 주세요."
            : `월정석 잔여 확인 완료 · 현재 ${balance.toLocaleString("ko-KR")} 이벤트 재화`;
      }
      if (monthlyButton) {
        monthlyButton.disabled = !canUse;
        monthlyButton.classList.toggle("is-disabled", !canUse);
        monthlyButton.setAttribute("aria-disabled", canUse ? "false" : "true");
        monthlyButton.setAttribute("aria-label", `월정석 사용${canUse ? "" : (known ? " (잔량 부족)" : " (잔량 확인 필요)")}`);
        if (descNode) {
          descNode.textContent = canUse
            ? `보유 월정석에서 먼저 만료되는 지급분부터 차감됩니다. 사용 후 ${afterBalance.toLocaleString("ko-KR")}이 남습니다. 월정석은 지급일로부터 30일간만 유효합니다.`
            : (known
              ? "월정석 이벤트 재화 잔량이 부족합니다. 원화 단건 결제로 진행할 수 있어요."
              : "월정석 잔량 확인이 필요합니다. 원화 단건 결제는 계속 이용할 수 있어요.");
        }
      }
    };
    // '월정석 재조회': 정본 잔량 fetcher를 강제 재조회(캐시 무효·degrade 미캐시)해 제자리 갱신. degrade/미인증은 '확인 필요'로.
    const refreshMonthlyBalance = async (refreshOpts: { fresh?: boolean } = {}) => {
      if (settled || moonlightRefreshBusy) return;
      moonlightRefreshBusy = true;
      const refreshBtn = modal.querySelector<HTMLButtonElement>('[data-mode="monthly-refresh"]');
      const balanceText = modal.querySelector<HTMLElement>("[data-monthly-balance-text]");
      if (refreshBtn) refreshBtn.disabled = true;
      if (balanceText) balanceText.textContent = "월정석 잔량을 확인하고 있습니다.";
      try {
        // 수동 재조회는 서버 캐시까지 우회(fresh)해 항상 최신값을 읽고, 자동 조회는 신선한 클라 캐시를 존중해 빠르게 응답한다.
        // (force를 fresh에 연동: 수동=강제 재조회, 자동=클라 캐시 히트 시 여분 /balance 왕복 생략.)
        const result = await fetchBillingBalance({ force: refreshOpts.fresh === true, fresh: refreshOpts.fresh === true });
        if (settled) return;
        if (!result.ok || !result.data || result.data.degraded === true) {
          applyMoonlightBalance(null, "error");
        } else if (result.data.authenticated === false) {
          applyMoonlightBalance(null, "signed-out");
        } else {
          const bal = toNumber(result.data.monthlyStoneBalance ?? result.data.membershipCreditBalance ?? result.data.balance, 0);
          applyMoonlightBalance(bal, "fresh");
        }
      } catch {
        if (!settled) applyMoonlightBalance(null, "error");
      } finally {
        moonlightRefreshBusy = false;
        if (refreshBtn && !settled) refreshBtn.disabled = false;
      }
    };

    lockBodyScroll();
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close("cancel");
    });
    modal.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const rawMode = toText(button.dataset.mode);
        if (rawMode === "monthly-refresh") {
          // 월정석 재조회는 모달을 닫지 않고 잔량만 제자리 갱신한다(결제 선택 모드가 아님).
          // 사용자가 직접 눌렀으므로 서버 캐시를 우회(fresh)해 최신값을 읽는다.
          void refreshMonthlyBalance({ fresh: true });
          return;
        }
        const mode = rawMode as PaymentChoiceMode;
        if (mode === "cancel") {
          close("cancel");
          return;
        }
        if (mode === "refresh") {
          button.disabled = true;
          setStatus("이용권으로 바로 열 수 있는지 다시 확인하고 있습니다.");
          clearSubscriptionSnapshotForUser();
          invalidateBillingBalanceCache();
          fetchPaymentEligibility({
            productId: toText(opts.productId),
            serviceType: toText(opts.serviceType || opts.productType),
            categoryKey: toText(opts.categoryKey),
            subFeatureKey: toText(opts.subFeatureKey),
            featureKey: toText(opts.featureKey),
            reason: toText(opts.reason || title),
            coinCost: coinPrice,
            coinPrice,
            priceKRW: directAmount,
            amountKRW: directAmount,
          }, { force: true }).then((latest) => {
            const entitlementStatus: EntitlementStatus = {
              isActive: latest.data?.pass.hasActivePass === true,
              plan: normalizeEntitlementPlan(latest.data?.pass.tier),
              maxCoinCovered: latest.data?.pass.tier === "family" ? null : latest.data?.pass.limit ?? null,
              source: "server",
            };
            const decision = decidePaidFeatureAccess(entitlementStatus, {
              featureId: normalizeBillingFeatureKey(opts.featureKey || opts.subFeatureKey || opts.categoryKey || opts.reason || title),
              coinPrice,
            });
            debugEntitlement("[PaymentModal] refresh clicked");
            debugEntitlement("[PaymentModal] pending feature", opts);
            debugEntitlement("[Entitlement] latest server status", entitlementStatus);
            debugEntitlement("[Entitlement] access decision", decision);
            if (latest.ok && latest.data && (latest.data.access.canAccess || latest.data.pass.canUse || decision.allowed)) {
              close("pass");
              return;
            }
            setStatus("활성 이용권이 확인되지 않아 이용권 상점으로 이동합니다.", true);
            globalThis.setTimeout(() => {
              close("cancel");
              openMembershipPassStore(coinPrice, passTier);
            }, 450);
          }).catch(() => {
            setStatus("이용권 재확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", true);
            button.disabled = false;
          });
          return;
        }
        if (mode === "pass-store") {
          close("cancel");
          openMembershipPassStore(coinPrice, passTier);
          return;
        }
        if (button.disabled) return;
        modal.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((node) => {
          node.disabled = true;
        });
        setStatus(mode === "monthly" ? "월정석 이벤트 재화 사용 권한을 확인하고 있습니다." : "단건 결제창을 여는 중입니다.");
        showWaitOverlay(mode);
        close(mode);
      });
    });
    document.body.appendChild(modal);
    // 첫 번째 실제 결제 옵션에 포커스(상점 우선 노출 시 상점 버튼). 하드코딩된 direct 포커스 대체.
    (modal.querySelector<HTMLButtonElement>(".cd-react-payment-choice-option")
      || modal.querySelector<HTMLButtonElement>('[data-mode="direct"]'))?.focus();
    if (canShowMonthly) {
      // 다른 화면(내 정보/포인트)이나 재조회가 잔량을 갱신하면 결제창도 제자리 반영한다.
      const onBalanceEvent = (event: Event) => {
        const detail = (event as CustomEvent).detail as Record<string, unknown> | undefined;
        if (!detail) return;
        const bal = resolveMonthlyStoneBalance(detail);
        if (typeof bal === "number" && Number.isFinite(bal) && bal >= 0) applyMoonlightBalance(bal, "fresh");
      };
      window.addEventListener("cd:billing-balance-updated", onBalanceEvent);
      removeBalanceListener = () => window.removeEventListener("cd:billing-balance-updated", onBalanceEvent);
      // 자동 1회 재조회: 스냅샷 잔량이 없으면(조회 실패로 결제창이 열린 경우) 조용히 최신 잔량을 채운다.
      if (!hasProvidedMonthlyBalance) void refreshMonthlyBalance();
    }
  });
}

function installReactPaymentChoiceBridge() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const runtimeWindow = window as RuntimeApiWindow;
  const canonical = runtimeWindow.__cdChooseServicePaymentModeCanonical;
  if (typeof canonical === "function" && canonical.__cdSupportsPassChoice === true && canonical.__cdReactFallback !== true) return;
  if (runtimeWindow._cdChooseServicePaymentMode?.__cdReactFallback === true) return;

  const choiceBridge: PaymentChoiceFunction = (options) => openReactPaymentChoiceModal(options || {});
  choiceBridge.__cdSupportsPassChoice = true;
  choiceBridge.__cdReactFallback = true;
  runtimeWindow.__cdChooseServicePaymentModeCanonical = choiceBridge;
  runtimeWindow._cdChooseServicePaymentMode = choiceBridge;
}

function isMembershipPassAccessType(value: unknown): boolean {
  const accessType = toText(value).toLowerCase();
  return accessType === "membership_pass"
    || accessType === "license_pass"
    || accessType === "subscription_pass"
    || accessType === "pass"
    || accessType === "family"
    || accessType === "family_pass"
    || accessType === "already_unlocked"
    || accessType === "pass_applied";
}

function isMembershipPassGrantedPayload(value: unknown): boolean {
  const record = asRecord(value);
  if (!record) return false;
  const consume = asRecord(record.consume);
  const accessGrant = asRecord(record.accessGrant);
  const accessDecision = asRecord(record.accessDecision);
  const accessGate = asRecord(record.accessGateResult) || asRecord(record.licensePass);
  const membershipPass = asRecord(record.membershipPass);
  const status = toText(
    record.status
    || accessDecision?.status
    || accessGate?.status
    || membershipPass?.status,
  ).toLowerCase();
  const reason = toText(
    record.reason
    || accessDecision?.reason
    || accessGate?.reason
    || membershipPass?.reason,
  ).toLowerCase();

  return record.freeBySubscription === true
    || record.__cdPassGateResolved === true
    || record.membershipFree === true
    || record.passApplied === true
    || membershipPass?.canUse === true
    || membershipPass?.covered === true
    || isMembershipPassAccessType(record.accessType)
    || isMembershipPassAccessType(record.transactionType)
    || isMembershipPassAccessType(record.accessMethod)
    || isMembershipPassAccessType(consume?.accessType)
    || isMembershipPassAccessType(consume?.transactionType)
    || isMembershipPassAccessType(consume?.accessMethod)
    || isMembershipPassAccessType(accessGrant?.accessType)
    || isMembershipPassAccessType(accessGrant?.transactionType)
    || isMembershipPassAccessType(accessGrant?.accessMethod)
    || isMembershipPassAccessType(accessDecision?.accessType)
    || isMembershipPassAccessType(accessDecision?.accessMethod)
    || status === "license_passed"
    || status === "already_unlocked"
    || status === "pass_applied"
    || reason === "pass_covered"
    || reason === "family_all_access"
    || reason === "license_coin_limit";
}

// 월정석 aliases: monthly_credit, membership_credit, moonlight_stone, MONTHLY, 월정석은 모두 월정석으로 처리한다.
function isMonthlyCreditAccessType(value: unknown): boolean {
  const accessType = toText(value).toLowerCase();
  return accessType === "membership_credit"
    || accessType === "monthly_credit"
    || accessType === "moonlight_stone"
    || accessType === "monthly"
    || accessType === "monthly_subscription";
}

function resolveAppliedBillingPayment(data: BillingCoinGateData & Record<string, unknown>, requestedMode = "", passFirstEligible = false) {
  const consume = asRecord(data.consume);
  const accessGrant = asRecord(data.accessGrant);
  const candidates = [
    requestedMode,
    data.paymentMode,
    data.paymentIntentType,
    data.accessSource,
    data.accessType,
    data.transactionType,
    data.accessMethod,
    data.paymentMethod,
    consume?.accessType,
    consume?.transactionType,
    consume?.accessMethod,
    consume?.paymentMethod,
    accessGrant?.accessType,
    accessGrant?.transactionType,
    accessGrant?.accessMethod,
    accessGrant?.paymentMethod,
  ];
  const monthlyApplied = candidates.some(isMonthlyCreditAccessType);
  const membershipPassApplied = !monthlyApplied && (data.freeBySubscription === true || isMembershipPassGrantedPayload(data) || passFirstEligible);

  if (monthlyApplied) {
    return {
      status: "paymentSuccess" as const,
      paymentMode: "MOONLIGHT_STONE",
      entitlementApplied: false,
      passApplied: false,
    };
  }
  if (membershipPassApplied) {
    return {
      status: "hasEntitlement" as const,
      paymentMode: "MEMBERSHIP_PASS",
      entitlementApplied: true,
      passApplied: true,
    };
  }
  return {
    status: "paymentSuccess" as const,
    paymentMode: normalizePaymentMode(requestedMode) || "DIRECT_KRW",
    entitlementApplied: false,
    passApplied: false,
  };
}

function hasVerifiedBillingAccess(data: unknown, expectedFeatureKey: unknown): boolean {
  const record = asRecord(data);
  if (!record) return false;
  const expectedFeature = normalizeBillingFeatureKey(expectedFeatureKey);
  const pricing = asRecord(record.pricing);
  const pricingFeature = normalizeBillingFeatureKey(pricing?.featureKey);
  const accessDecision = asRecord(record.accessDecision);
  const featureMatches = !expectedFeature || !pricingFeature || pricingFeature === expectedFeature;
  if (featureMatches && isMembershipPassGrantedPayload(record)) return true;
  if (
    (record.canAccess === true || record.unlocked === true || accessDecision?.accessGranted === true)
    && featureMatches
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
    const grantFeature = normalizeBillingFeatureKey(accessGrant.featureKey);
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
    const consumeFeature = normalizeBillingFeatureKey(consume.featureKey);
    if (transactionId && (!expectedFeature || !consumeFeature || consumeFeature === expectedFeature)) return true;
    if (
      (consume.accessType === "membership_pass"
        || consume.accessType === "family"
        || consume.accessType === "family_pass"
        || consume.accessType === "already_unlocked")
      && (!expectedFeature || !consumeFeature || consumeFeature === expectedFeature)
    ) return true;
  }
  const unlockMap = asRecord(record.unlockMap);
  if (expectedFeature && unlockMap) {
    const normalizedUnlockMap = Object.fromEntries(
      Object.entries(unlockMap).map(([key, value]) => [normalizeBillingFeatureKey(key), value]),
    );
    if (normalizedUnlockMap[expectedFeature] === true) return true;
  }
  const unlockedFeatures = Array.isArray(record.unlockedFeatures) ? record.unlockedFeatures.map(normalizeBillingFeatureKey) : [];
  return Boolean(expectedFeature && unlockedFeatures.includes(expectedFeature));
}

function isWorkersDevBillingBaseUrl(baseUrl?: string | null): boolean {
  const value = String(baseUrl || "").trim();
  if (!value) return false;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "workers.dev" || hostname.endsWith(".workers.dev");
  } catch (e) {
    return /workers\.dev/i.test(value);
  }
}

function collectBillingFallbackBases(): string[] {
  if (typeof window !== "undefined") {
    const sameOrigin = normalizeBaseUrl(window.location.origin);
    const currentHostIsWorkersDev = isWorkersDevBillingBaseUrl(sameOrigin);
    if (!currentHostIsWorkersDev) return [];
  }

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

function hasClientAuthSessionHint() {
  if (typeof window === "undefined") return false;
  const user = readSanitizedAuthUser();
  const userRecord = asRecord(user);
  const userId = toText(userRecord?.id || userRecord?.userId || userRecord?._id || userRecord?.uid || userRecord?.email);
  if (userId) return true;
  try {
    return document.cookie.includes("fortune_auth_role=");
  } catch (e) {
    return false;
  }
}

function isAuthRequiredBillingCode(status: number, code?: unknown) {
  const normalizedCode = toText(code).toUpperCase();
  return status === 401
    || status === 403
    || normalizedCode === "AUTH_REQUIRED"
    || normalizedCode === "LOGIN_REQUIRED"
    || normalizedCode === "UNAUTHORIZED"
    || normalizedCode === "NOT_LOGGED_IN"
    // authFetch가 401을 transient 리프레시 실패로 감싼 합성 503도 인증 필요로 취급한다.
    || normalizedCode === "AUTH_REFRESH_TEMPORARY_FAILURE";
}

async function authFetchBilling(path: string, init: RequestInit): Promise<Response> {
  return withSuppressedRuntimePaymentFetchOverlay(async () => {
    const primary = await authFetchBillingOnce(path, init);
    if (primary.ok || primary.status !== 404) return primary;

    const fallbackBases = collectBillingFallbackBases();
    if (!fallbackBases.length) return primary;

    for (const apiBase of fallbackBases) {
      const retried = await authFetchBillingOnce(path, init, { apiBase });
      if (retried.ok || retried.status !== 404) return retried;
    }

    return primary;
  });
}

function resolveBillingFetchTimeoutMs(path: string, init: RequestInit) {
  const method = String(init.method || "GET").toUpperCase();
  const normalizedPath = String(path || "");
  if (method !== "GET" && normalizedPath.startsWith("/api/billing/coin-gate")) return BILLING_FETCH_CONFIRM_TIMEOUT_MS;
  if (method !== "GET" && normalizedPath.startsWith("/api/billing/checkout")) return BILLING_FETCH_CHECKOUT_TIMEOUT_MS;
  if (method !== "GET" && normalizedPath.startsWith("/api/billing/confirm")) return BILLING_FETCH_CONFIRM_TIMEOUT_MS;
  return BILLING_FETCH_DEFAULT_TIMEOUT_MS;
}

function buildBillingFetchFailureResponse(code: string, message: string, status = 503) {
  return new Response(JSON.stringify({
    ok: false,
    code,
    message,
    error: { code, message },
  }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function authFetchBillingOnce(path: string, init: RequestInit, options: { apiBase?: string } = {}): Promise<Response> {
  // 게이팅/결제 엔드포인트는 401을 리프레시로 흡수해 합성 503(AUTH_REFRESH_TEMPORARY_FAILURE)으로
  // 바꾸지 않는다 — 그러면 서버의 paymentRequired/402 신호가 마스킹돼 결제 폴백 시트가 안 뜬다.
  // 세션 예열은 runBillingCoinGate 진입부에서 이미 수행하므로 여기서의 retryOn401은 중복이다.
  const billingOptions = { ...options, retryOn401: false };
  if (typeof AbortController === "undefined" || init.signal) {
    return authFetch(path, init, billingOptions);
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), resolveBillingFetchTimeoutMs(path, init));
  try {
    return await authFetch(path, { ...init, signal: controller.signal }, billingOptions);
  } catch (error) {
    if (controller.signal.aborted) {
      return buildBillingFetchFailureResponse("BILLING_REQUEST_TIMEOUT", "결제 요청 시간이 초과되었습니다. 다시 시도해 주세요.");
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function getPaidServiceRuntimeGate(): PaidServiceRuntimeGate | null {
  if (typeof window === "undefined") return null;
  const runtimeWindow = window as RuntimeApiWindow;
  return typeof runtimeWindow._cdOpenPaidServiceGate === "function" ? runtimeWindow._cdOpenPaidServiceGate : null;
}

export function loadPaidServiceRuntimeGate(): Promise<PaidServiceRuntimeGate | null> {
  installReactPaymentChoiceBridge();
  const current = getPaidServiceRuntimeGate();
  if (current) return Promise.resolve(current);
  if (typeof document === "undefined") return Promise.resolve(null);
  if (paidServiceRuntimePromise) return paidServiceRuntimePromise;

  paidServiceRuntimePromise = new Promise((resolve) => {
    const finish = () => {
      installReactPaymentChoiceBridge();
      resolve(getPaidServiceRuntimeGate());
    };
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
  const resultRecord = asRecord(result);
  const okValue = resultRecord?.ok ?? payload.ok;
  const okText = toText(okValue).toLowerCase();
  const deniedStatuses = new Set(["error", "failed", "failure", "payment_required", "cancelled", "canceled"]);
  if (okValue === false || okText === "false" || deniedStatuses.has(status)) return false;
  const isPositiveObject = (value: unknown) => {
    const record = asRecord(value);
    if (!record) return false;
    const recordStatus = toText(record.status || record.state || record.result).toLowerCase();
    const recordOkText = toText(record.ok).toLowerCase();
    if (record.ok === false || recordOkText === "false" || deniedStatuses.has(recordStatus)) return false;
    return Object.keys(record).length > 0;
  };
  const payment = asRecord(payload.payment);
  const paymentStatus = toText(payment?.status || payment?.paymentStatus || payload.paymentStatus).toLowerCase();
  const paymentGranted = isPositiveObject(payment)
    && /^(paid|success|succeeded|confirmed|complete|completed|approved)$/.test(paymentStatus);
  return status === "granted"
    || status === "paid"
    || status === "success"
    || isPositiveObject(payload.accessGrant)
    || Boolean(payload.premiumAccessToken)
    || isPositiveObject(payload.consume)
    || paymentGranted;
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

function isSubscriptionSnapshotEligibility(eligibility: PaymentEligibility | null) {
  if (!eligibility) return false;
  const reason = normalizeAccessReason(eligibility.access.reason);
  if (reason === "subscription_snapshot_active" || reason === "subscription_snapshot_none") return true;
  const raw = asRecord(eligibility.raw);
  return Boolean(asRecord(raw?.subscriptionSnapshot));
}

function shouldInvalidateSubscriptionSnapshot(status: number, code?: string) {
  const normalizedCode = toText(code).toUpperCase();
  return status === 401
    || status === 403
    || status === 402
    || normalizedCode === "AUTH_REQUIRED"
    || normalizedCode === "PAYMENT_REQUIRED"
    || normalizedCode === "MEMBERSHIP_PASS_NOT_COVERED";
}

function shouldOpenRuntimePaymentFallback(status: number, code?: string) {
  const normalizedCode = toText(code).toUpperCase();
  return status === 402
    || normalizedCode === "PAYMENT_REQUIRED"
    || normalizedCode === "MEMBERSHIP_PASS_NOT_COVERED"
    || normalizedCode === "PRICE_EXCEEDS_PASS_LIMIT"
    || normalizedCode === "INSUFFICIENT_COINS"
    // 합성 503(authFetch transient 리프레시)로 402/paymentRequired가 마스킹돼도 결제 폴백을 연다.
    || normalizedCode === "AUTH_REFRESH_TEMPORARY_FAILURE"
    // 이용권 상태 일시 확인 불가(503) — 서버가 응답에 paymentOptions(단건+월정석)를 동봉하므로
    // 하드 에러 대신 결제 폴백을 연다.
    || normalizedCode === "PASS_STATUS_TEMPORARILY_UNAVAILABLE"
    // 인증/스냅샷 DB 일시 장애(503) — 서버가 infra 실패를 게스트 세탁 대신 degraded로 표면화하며
    // 응답에 paymentOptions(단건+월정석)를 동봉한다(worker/routes/billing.js readBillingSnapshot·requireBillingAuth).
    // runBillingCoinGate의 transient 재시도가 소진된 뒤에도 남으면 dead-end 대신 결제 폴백을 연다.
    || normalizedCode === "AUTH_STATUS_TEMPORARILY_UNAVAILABLE"
    || normalizedCode === "BALANCE_SNAPSHOT_UNAVAILABLE"
    || normalizedCode === "AUTH_DB_UNAVAILABLE"
    // 클라이언트 abort 타임아웃(9s/45s)으로 합성된 503 — 이용권 확인이 지연으로 실패해도
    // dead-end 대신 결제창(단건+월정석)을 열어 사용자가 결제 선택지를 갖게 한다.
    || normalizedCode === "BILLING_REQUEST_TIMEOUT";
}

// 코인게이트 transient 재시도 상한/백오프. 최초 1회 + 재시도 2회 = 최대 3회, 지수 백오프(0.8s→1.44s).
const COIN_GATE_TRANSIENT_MAX_RETRIES = 2;
const COIN_GATE_TRANSIENT_BASE_DELAY_MS = 800;

// 코인게이트가 워커-DB 일시 장애로 돌려주는 degraded-503만 재시도 대상으로 본다.
// 확정 실패(402/401/PAYMENT_REQUIRED 등)나 성공은 재시도하지 않는다. 이용권 커버 판정은
// 서버(canUseByPass)가 하며, 여기서는 인프라 blip만 흡수한다.
function isRetryableBillingInfraDegraded(status: number, code?: string) {
  if (status !== 503) return false;
  const normalizedCode = toText(code).toUpperCase();
  return normalizedCode === "AUTH_STATUS_TEMPORARILY_UNAVAILABLE"
    || normalizedCode === "PASS_STATUS_TEMPORARILY_UNAVAILABLE"
    || normalizedCode === "BALANCE_SNAPSHOT_UNAVAILABLE"
    || normalizedCode === "AUTH_DB_UNAVAILABLE";
}

// useCoinGate의 resolveLoginRequired와 동일 판정. authFetch가 401에서 세션 갱신+재시도까지
// 마친 뒤에도 남은 "진짜 미로그인/세션 만료"만 걸러 로그인 유도한다. 일시적 503(AUTH_REFRESH_TEMPORARY_FAILURE
// 등)은 status가 401/403이 아니고 결제 폴백(shouldOpenRuntimePaymentFallback) 대상이라 여기 걸리지 않는다.
function shouldRedirectToLoginAfterBilling(status: number, code?: string) {
  const normalizedCode = toText(code).toUpperCase();
  return status === 401
    || status === 403
    || normalizedCode === "AUTH_REQUIRED"
    || normalizedCode === "LOGIN_REQUIRED"
    || normalizedCode === "UNAUTHORIZED";
}

function normalizeAccessReason(value: unknown) {
  return toText(value).trim().toLowerCase();
}

function shouldCachePaymentEligibilityResult(result: BillingResult<PaymentEligibility>) {
  if (!result.ok || !result.data) return false;
  const code = toText(result.error?.code || asRecord(result.raw)?.code).toUpperCase();
  const reason = normalizeAccessReason(result.data.access.reason || asRecord(result.raw)?.accessReason || asRecord(result.raw)?.decisionReason);
  if (
    result.status >= 400
    || code === "PAYMENT_REQUIRED"
    || code === "MEMBERSHIP_PASS_NOT_COVERED"
    || code === "PRICE_EXCEEDS_PASS_LIMIT"
    || reason === "payment_required"
    || reason === "pass_unavailable"
  ) return false;
  return Boolean(
    result.data.access.canAccess
      || result.data.pass.canUse
      || result.data.monthly.canUse
  );
}

function shouldCacheBillingCoinGateResult(result: BillingResult<BillingCoinGateData>) {
  if (!result.ok || !result.data) return false;
  const record = asRecord(result.data);
  const pricing = asRecord(record?.pricing);
  return hasVerifiedBillingAccess(result.data, pricing?.featureKey || record?.featureKey || "");
}

function resolveKnownCoinCost(input: BillingCoinGateInput, eligibility: PaymentEligibility | null) {
  const amountKRW = Math.max(0, Math.floor(toNumber(
    eligibility?.priceKRW
    ?? input.amountKRW
    ?? input.amountKrw
    ?? input.cashPrice
    ?? input.paymentAmount,
    0,
  )));
  return Math.max(0, Math.floor(toNumber(
    eligibility?.coinCost
    ?? input.coinPrice
    ?? input.cost,
    amountKRW > 0 ? Math.ceil(amountKRW / 100) : 0,
  )));
}

function resolveKnownAmountKRW(input: BillingCoinGateInput, eligibility: PaymentEligibility | null, coinCost: number) {
  return Math.max(0, Math.floor(toNumber(
    eligibility?.priceKRW
    ?? input.amountKRW
    ?? input.amountKrw
    ?? input.cashPrice
    ?? input.paymentAmount
    ?? (coinCost > 0 ? coinCost * 100 : 0),
    0,
  )));
}

function resolveRuntimeBillingPricing(input: BillingCoinGateInput, eligibility: PaymentEligibility | null, payload: Record<string, unknown>, featureId: string): BillingFeaturePricing {
  const data = readRuntimeNestedObject(payload, "data");
  const payloadPricing = readRuntimeNestedObject(payload, "pricing");
  const dataPricing = readRuntimeNestedObject(data, "pricing");
  const rawPricing = Object.keys(dataPricing).length ? dataPricing : payloadPricing;
  const featureKey = toText(rawPricing.featureKey || input.featureKey || input.subFeatureKey || featureId);
  const fallbackCost = resolveKnownCoinCost(input, eligibility);
  const rawAmountKRW = Math.max(0, Math.floor(toNumber(rawPricing.amountKRW ?? rawPricing.cashPrice, 0)));
  const cost = Math.max(0, Math.floor(toNumber(
    rawPricing.coinPrice ?? rawPricing.cost ?? fallbackCost,
    rawAmountKRW > 0 ? Math.ceil(rawAmountKRW / 100) : 0,
  )));
  const amountKRW = Math.max(0, Math.floor(toNumber(rawAmountKRW > 0 ? rawAmountKRW : resolveKnownAmountKRW(input, eligibility, cost), 0)));

  return {
    categoryKey: toText(rawPricing.categoryKey || input.categoryKey || "legacy-feature"),
    categoryLabel: toText(rawPricing.categoryLabel),
    subFeatureKey: toText(rawPricing.subFeatureKey || input.subFeatureKey || featureKey || "default"),
    featureKey,
    cost,
    coinPrice: cost,
    displayUnit: toText(rawPricing.displayUnit || "coin"),
    displayPrice: toText(rawPricing.displayPrice || formatCoinValueWon(cost)),
    reason: toText(rawPricing.reason || input.reason || featureKey),
    currency: toText(rawPricing.currency || "KRW"),
    cashPrice: amountKRW,
    amountKRW,
    membershipCreditCost: toNumber(rawPricing.membershipCreditCost ?? input.membershipCreditCost, cost * 10),
    paymentMode: toText(rawPricing.paymentMode || "single_purchase"),
    coinDisplayOnly: rawPricing.coinDisplayOnly === undefined ? true : Boolean(rawPricing.coinDisplayOnly),
  };
}

async function runPaidServiceRuntimePayment(input: BillingCoinGateInput, context: {
  featureId: string;
  requestId: string;
  eligibility: PaymentEligibility | null;
  runtimeGate?: PaidServiceRuntimeGate | null;
}): Promise<BillingResult<BillingCoinGateData> | null> {
  if (typeof window === "undefined") return null;
  if (input.forceDeduct === false) return null;

  const requestedMode = normalizePaymentMode(input.paymentMode);
  if (isMobileAppRuntime()) {
    if (requestedMode === "MEMBERSHIP_PASS" || requestedMode === "MOONLIGHT_STONE") return null;
    return runNativeAppStorePayment(input, {
      featureId: context.featureId,
      requestId: context.requestId,
      eligibility: context.eligibility,
    });
  }

  if (requestedMode === "MEMBERSHIP_PASS" || requestedMode === "MOONLIGHT_STONE" || requestedMode === "DIRECT_KRW") return null;

  const runtimeGate = context.runtimeGate || await loadPaidServiceRuntimeGate();
  if (!runtimeGate) return null;

  const cost = resolveKnownCoinCost(input, context.eligibility);
  const amountKRW = resolveKnownAmountKRW(input, context.eligibility, cost);
  const featureKey = toText(input.featureKey || input.subFeatureKey || context.featureId);
  const reason = toText(input.reason || featureKey);
  const membershipCoverage = buildRuntimeMembershipCoverage(context.eligibility);
  const passAlreadyChecked = Boolean(context.eligibility && !isSubscriptionSnapshotEligibility(context.eligibility));
  const runtimePaymentOptions = asRecord(context.eligibility?.raw?.paymentOptions) || asRecord(context.eligibility?.raw) || {};

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
      amountKRW,
      membershipCreditCost: toNumber(input.membershipCreditCost, cost * 10),
      productId: input.productId,
      productType: input.productType,
      serviceType: input.serviceType || input.productType,
      requestId: context.requestId,
      forceDeduct: true,
      reportId: input.reportId,
      sessionId: input.sessionId,
      reportSessionId: input.reportSessionId || input.sessionId,
      membershipCoverage: membershipCoverage || undefined,
      monthlyBalance: context.eligibility?.monthly.balance,
      membershipCreditBalance: context.eligibility?.monthly.balance,
      canUseByMonthly: context.eligibility?.monthly.canUse,
      paymentOptions: runtimePaymentOptions,
      equalPriorityMethods: runtimePaymentOptions.equalPriorityMethods,
      recommendedMethods: runtimePaymentOptions.recommendedMethods,
      skipBalanceRefresh: passAlreadyChecked,
      allowedPaymentModes: input.allowedPaymentModes,
      disablePassFirst: input.disablePassFirst === true || (passAlreadyChecked && context.eligibility?.pass.canUse !== true),
      disablePassChoice: input.disablePassChoice === true,
      skipPassProbe: input.skipPassProbe === true,
      internalMainGate: true,
    });
  } catch (error) {
    return {
      ok: false,
      status: 402,
      data: null,
      message: error instanceof Error ? error.message : billingClientText("billingClient.message.001"),
      error: {
        code: "PAYMENT_REQUIRED",
        message: error instanceof Error ? error.message : billingClientText("billingClient.message.002"),
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
  const sourcePassGranted = source.freeBySubscription === true
    || source.__cdPassGateResolved === true
    || isMembershipPassAccessType(source.accessType)
    || isMembershipPassAccessType(source.transactionType)
    || isMembershipPassAccessType(source.accessMethod)
    || isMembershipPassAccessType(consumeAccessType)
    || isMembershipPassAccessType(consumeSource.transactionType)
    || isMembershipPassAccessType(consumeSource.accessMethod);
  const user = readRuntimeNestedObject(source, "user");
  const data = {
    ...source,
    pricing,
    consume,
    accessGrant,
    balance: Number.isFinite(Number(source.balance)) ? Number(source.balance) : null,
    user: Object.keys(user).length ? user : null,
    freeBySubscription: sourcePassGranted,
  } as BillingCoinGateData & Record<string, unknown>;
  normalizeBillingBalanceFields(data);

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

function isMobileAppRuntime() {
  if (process.env.NEXT_PUBLIC_RUNTIME_TARGET === "mobile-app") return true;
  if (typeof window === "undefined") return false;
  const runtimeWindow = window as RuntimeApiWindow;
  if (runtimeWindow.__CODE_DESTINY_RUNTIME_TARGET === "mobile-app") return true;
  try {
    return runtimeWindow.Capacitor?.isNativePlatform?.() === true;
  } catch (e) {
    return false;
  }
}

function nativeAppStoreFailure(code: string, message: string, status = 503): BillingResult<BillingCoinGateData> {
  return {
    ok: false,
    status,
    data: null,
    message,
    error: { code, message },
    raw: { code, message },
  };
}

async function runNativeAppStorePayment(input: BillingCoinGateInput, context: {
  featureId: string;
  requestId: string;
  eligibility: PaymentEligibility | null;
}): Promise<BillingResult<BillingCoinGateData>> {
  if (typeof window === "undefined") {
    return nativeAppStoreFailure("NATIVE_RUNTIME_UNAVAILABLE", "앱 결제 연결을 확인할 수 없습니다.");
  }

  const runtimeWindow = window as RuntimeApiWindow;
  const purchase = runtimeWindow.CodeDestinyNative?.purchase;
  if (typeof purchase !== "function") {
    return nativeAppStoreFailure("NATIVE_BILLING_UNAVAILABLE", "앱 결제 연결이 아직 준비되지 않았습니다.");
  }

  const featureKey = toText(input.featureKey || input.subFeatureKey || context.featureId);
  const productQuery = toQuery({
    featureKey,
    categoryKey: input.categoryKey,
    subFeatureKey: input.subFeatureKey,
    reason: input.reason,
    productType: input.productType,
  });
  const productResponse = await authFetchBilling(`/api/app-store/products?${productQuery}`, { method: "GET" });
  const productParsed = await parseBillingResponse<{
    product?: {
      productId?: string;
      productType?: string;
      featureKey?: string;
    };
    pricing?: BillingFeaturePricing;
  }>(productResponse);

  const product = productParsed.data?.product;
  const productId = toText(product?.productId);
  if (!productParsed.ok || !productId) {
    return nativeAppStoreFailure(
      productParsed.error?.code || "APP_STORE_PRODUCT_UNAVAILABLE",
      productParsed.error?.message || productParsed.message || "앱 결제 상품을 불러오지 못했습니다.",
      productParsed.status || 503,
    );
  }

  let purchaseResult: Record<string, unknown> | null = null;
  try {
    purchaseResult = await purchase({
      featureKey,
      productId,
      productType: toText(product?.productType || input.productType || "inapp"),
      idempotencyKey: input.idempotencyKey || context.requestId,
    });
  } catch (error) {
    return nativeAppStoreFailure(
      toText((error as { code?: string })?.code || "APP_STORE_PURCHASE_FAILED"),
      toText((error as { message?: string })?.message || "앱 결제가 완료되지 않았습니다."),
      402,
    );
  }

  if (purchaseResult?.ok === false) {
    return nativeAppStoreFailure(
      toText(purchaseResult.code || "APP_STORE_PURCHASE_FAILED"),
      toText(purchaseResult.message || "앱 결제가 완료되지 않았습니다."),
      402,
    );
  }

  const verifyResponse = await authFetchBilling("/api/app-store/google/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(input || {}),
      featureKey,
      productId,
      productType: product?.productType || input.productType || "inapp",
      requestId: context.requestId,
      idempotencyKey: input.idempotencyKey || context.requestId,
      purchaseToken: purchaseResult?.purchaseToken,
      packageName: purchaseResult?.packageName,
      orderId: purchaseResult?.orderId,
      purchaseState: purchaseResult?.purchaseState,
      acknowledged: purchaseResult?.acknowledged,
      provider: "GOOGLE_PLAY",
    }),
  });

  return parseBillingResponse<BillingCoinGateData>(verifyResponse);
}

function runtimeNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function isExternalPaymentWindowStatus(status: string) {
  return status === "paymentWindowOpen";
}

function paymentLoadingOwnsPaidFeatureStatus(status: string) {
  return [
    "processing",
    "deliveryProcessing",
    "refund_pending",
    "refunded",
    "refund_failed",
  ].includes(status);
}

function resolvePaymentWaitKind(input: {
  status?: string;
  message?: string;
  paymentMode?: string;
  featureKey?: string;
  reason?: string;
  accessType?: string;
  accessMethod?: string;
  paymentMethod?: string;
}) {
  const mode = normalizePaymentMode(input.paymentMode);
  const haystack = [input.status, input.message, input.paymentMode, input.featureKey, input.reason, input.accessType, input.accessMethod, input.paymentMethod]
    .map((value) => toText(value).toLowerCase())
    .filter(Boolean)
    .join(" ");

  if (mode === "MOONLIGHT_STONE" || /\b(monthly_credit|membership_credit|moonlight_stone|monthly_subscription|monthly)\b/.test(haystack)) return "monthly";
  if (mode === "MEMBERSHIP_PASS" || /\b(membership_pass|license_pass|subscription_pass|family_pass|pass_applied)\b/.test(haystack)) return "pass";
  if (mode === "DIRECT_KRW" || /direct_krw|one[-_ ]?time|single|단건|원화|카드|checkout/.test(haystack)) return "single";
  if (/subscription|구독|플랜|달빛 이용권 결제|이용권 결제/.test(haystack)) return "subscription";
  // '잠금 해제(영구 해금)' 문구는 콘텐츠 유형이 실제로 재열람형(unlock/PDF 리포트)일 때만 쓴다.
  // featureKey를 레지스트리로 판정(권위 소스). 과거의 넓은 정규식(권한/premium/pdf/리포트/잠금/해제)은
  // per-use 상태 문구의 '이용 권한 확인' 같은 표현까지 unlock으로 오분류해 1회당 결제에도
  // "콘텐츠 잠금 해제를 반영하고 있습니다" 류의 잘못된 안내를 냈다.
  const featureBillingType = input.featureKey ? resolvePaidFeatureBillingType(input.featureKey) : "per-use";
  if (featureBillingType === "unlock" || featureBillingType === "pdf") return "unlock";
  if (/\bunlock\b|잠금 해제|해금/.test(haystack)) return "unlock";
  return "payment";
}

function formatLoadingMessage(stage: LoadingStage, paymentType: PaymentType) {
  const copy = resolveLoadingMessage(stage, paymentType, getCurrentLoadingLocale());
  return copy.sub ? `${copy.title}\n${copy.sub}` : copy.title;
}

const PASS_TIER_LABELS: Record<LoadingLocale, Record<"FAMILY" | "VVIP" | "PREMIUM" | "STANDARD", string>> = {
  ko: { FAMILY: "FAMILY", VVIP: "VVIP", PREMIUM: "프리미엄", STANDARD: "스탠다드" },
  en: { FAMILY: "Family", VVIP: "VVIP", PREMIUM: "Premium", STANDARD: "Standard" },
  ja: { FAMILY: "ファミリー", VVIP: "VVIP", PREMIUM: "プレミアム", STANDARD: "スタンダード" },
  "zh-CN": { FAMILY: "家庭", VVIP: "VVIP", PREMIUM: "高级", STANDARD: "标准" },
  "zh-TW": { FAMILY: "家庭", VVIP: "VVIP", PREMIUM: "高級", STANDARD: "標準" },
  vi: { FAMILY: "Gia đình", VVIP: "VVIP", PREMIUM: "Premium", STANDARD: "Tiêu chuẩn" },
  hi: { FAMILY: "Family", VVIP: "VVIP", PREMIUM: "Premium", STANDARD: "Standard" },
  es: { FAMILY: "Familiar", VVIP: "VVIP", PREMIUM: "Premium", STANDARD: "Estándar" },
  fr: { FAMILY: "Famille", VVIP: "VVIP", PREMIUM: "Premium", STANDARD: "Standard" },
  de: { FAMILY: "Familie", VVIP: "VVIP", PREMIUM: "Premium", STANDARD: "Standard" },
  nl: { FAMILY: "Gezin", VVIP: "VVIP", PREMIUM: "Premium", STANDARD: "Standaard" },
  ms: { FAMILY: "Keluarga", VVIP: "VVIP", PREMIUM: "Premium", STANDARD: "Standard" },
};

function formatPassTierLabel(value: unknown, locale: LoadingLocale) {
  const tier = toText(value).toUpperCase();
  const labels = PASS_TIER_LABELS[locale] || PASS_TIER_LABELS.ko;
  if (tier.includes("FAMILY")) return labels.FAMILY;
  if (tier.includes("VVIP") || tier === "VIP") return labels.VVIP;
  if (tier.includes("PREMIUM") || tier.includes("프리미엄") || tier === "PRO") return labels.PREMIUM;
  if (tier.includes("STANDARD") || tier.includes("스탠다드") || tier === "BASIC") return labels.STANDARD;
  return "";
}

function resolvePassTierLabelFromDetail(detail: Record<string, unknown> | undefined, locale: LoadingLocale) {
  const membershipPass = asRecord(detail?.membershipPass);
  const accessGateResult = asRecord(detail?.accessGateResult) || asRecord(detail?.licensePass);
  return formatPassTierLabel(
    detail?.licenseTier
      ?? detail?.passTier
      ?? detail?.subscriptionTier
      ?? membershipPass?.tier
      ?? membershipPass?.passTier
      ?? accessGateResult?.licenseTier
      ?? accessGateResult?.tier
      ?? accessGateResult?.passTier,
    locale,
  );
}

function formatPassLoadingMessage(stage: LoadingStage, detail?: Record<string, unknown>) {
  const locale = getCurrentLoadingLocale();
  const tierLabel = resolvePassTierLabelFromDetail(detail, locale);
  if (!tierLabel) return formatLoadingMessage(stage, "pass");
  if (locale !== "ko") {
    const copy = resolveLoadingMessage(stage, "pass", locale);
    const title = `${tierLabel} ${copy.title}`;
    return copy.sub ? `${title}\n${copy.sub}` : title;
  }
  if (stage === "access_check") return `${tierLabel} 이용권을 확인하는 중이에요`;
  if (stage === "result_loading") return `${tierLabel} 이용권 혜택이 적용되었습니다.\n결과를 불러오는 중이에요`;
  return formatLoadingMessage(stage, "pass");
}

function resolvePaymentTypeForWaitKind(kind: string, fallback: PaymentType = "single"): PaymentType {
  if (kind === "pass") return "pass";
  if (kind === "monthly" || kind === "subscription") return "subscription";
  if (kind === "single") return "single";
  return fallback;
}

function normalizeLicenseTier(value: unknown): LicenseTier | null {
  const text = toText(value).toUpperCase();
  if (text.includes("FAMILY")) return "FAMILY";
  if (text.includes("VVIP")) return "VVIP";
  if (text.includes("PREMIUM") || text.includes("프리미엄")) return "PREMIUM";
  if (text.includes("STANDARD") || text.includes("스탠다드")) return "STANDARD";
  return null;
}

function extractLicenseGateResult(data: BillingCoinGateData & Record<string, unknown>): AccessGateResult | null {
  const pricing = asRecord(data.pricing) || {};
  if (toText(pricing.featureKey) === "profile-card-manage") return null;
  const explicit = asRecord(data.accessGateResult) || asRecord(data.licensePass);
  const membershipPass = asRecord(data.membershipPass);
  const licenseTier = normalizeLicenseTier(
    explicit?.licenseTier
      || explicit?.tier
      || explicit?.passTier
      || membershipPass?.tier
      || membershipPass?.passTier,
  );
  if (!licenseTier) return null;
  return {
    status: "license_passed",
    licenseTier,
    coveredCoinPrice: Math.max(0, Math.floor(toNumber(
      explicit?.coveredCoinPrice
        ?? pricing.coinPrice
        ?? pricing.cost,
      toNumber(pricing.amountKRW ?? pricing.cashPrice, 0) > 0
        ? Math.ceil(toNumber(pricing.amountKRW ?? pricing.cashPrice, 0) / 100)
        : 0,
    ))),
    contentTitle: toText(explicit?.contentTitle || pricing.reason || pricing.categoryLabel || pricing.featureKey),
    reason: toText(explicit?.reason) || (licenseTier === "FAMILY" ? "family_all_access" : "license_coin_limit"),
  };
}

function buildLicensePassOverlayMessage(data: BillingCoinGateData & Record<string, unknown>) {
  const gate = extractLicenseGateResult(data);
  if (!gate) return "";
  if (gate.licenseTier === "FAMILY" || gate.reason === "family_all_access") {
    return [
      "FAMILY 이용권이 적용되었습니다.",
      "이 콘텐츠는 FAMILY 이용권으로 무료 이용됩니다.",
      "추가 결제 없이 모든 유료 서비스를 이용할 수 있어요.",
    ].join("\n");
  }
  if (gate.licenseTier === "VVIP") {
    return [
      "VVIP 이용권이 적용되었습니다.",
      "이번 콘텐츠는 보유한 이용권으로 무료 이용됩니다.",
      "추가 결제 없이 바로 열어드릴게요.",
    ].join("\n");
  }
  return [
    "이용권이 적용되었습니다.",
    "이번 콘텐츠는 보유한 이용권으로 무료 이용됩니다.",
    "추가 결제 없이 바로 열어드릴게요.",
  ].join("\n");
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
    accessMethod: toText(detail?.accessMethod),
    paymentMethod: toText(detail?.paymentMethod),
  });

  if (status === "processing" || status === "deliveryProcessing") {
    return {
      message: text || "결제는 완료되었습니다.\n유료 콘텐츠 제공 상태를 확인하고 있습니다.\n잠시만 기다려 주세요.",
      mode: "payment-complete",
    };
  }
  if (status === "refund_pending") {
    return {
      message: text || "죄송합니다.\n유료 콘텐츠가 정상적으로 제공되지 않아 자동 환불을 진행하고 있습니다.\n결제 금액은 100% 환불됩니다.",
      mode: "refund-pending",
    };
  }
  if (status === "refunded") {
    return {
      message: text || "유료 콘텐츠가 정상적으로 제공되지 않아 결제 금액이 100% 환불되었습니다.\n같은 결제 건으로 다시 청구되지 않습니다.",
      mode: "refunded",
    };
  }
  if (status === "refund_failed") {
    return {
      message: text || "자동 환불 요청 중 문제가 발생했습니다.\n결제는 정상적으로 기록되어 있으며, 환불 처리를 위해 관리자 확인이 필요합니다.\n잠시 후 다시 확인해 주세요.",
      mode: "refund-failed",
    };
  }

  if (status === "checkingEntitlement") {
    const paymentType = resolvePaymentTypeForWaitKind(kind, "pass");
    return {
      message: paymentType === "pass" ? formatPassLoadingMessage("access_check", detail) : formatLoadingMessage("access_check", paymentType),
      mode: paymentType === "pass" ? "pass" : (paymentType === "subscription" ? "monthly" : "payment"),
    };
  }
  if (status === "hasEntitlement") {
    const paymentType = resolvePaymentTypeForWaitKind(kind, "pass");
    return {
      message: paymentType === "pass" ? formatPassLoadingMessage("result_loading", detail) : formatLoadingMessage("result_loading", paymentType),
      mode: paymentType === "pass" ? "pass-applied" : "payment-complete",
    };
  }
  if (status === "paymentPreparing") {
    const paymentType = resolvePaymentTypeForWaitKind(kind, "single");
    return {
      message: formatLoadingMessage("pg_processing", paymentType === "pass" ? "single" : paymentType),
      mode: paymentType === "subscription" ? "subscription" : "card",
    };
  }
  if (status === "paymentWindowOpen") {
    const paymentType = resolvePaymentTypeForWaitKind(kind, "single");
    return {
      message: formatLoadingMessage("pg_processing", paymentType === "pass" ? "single" : paymentType),
      mode: paymentType === "subscription" ? "subscription" : "card",
    };
  }
  if (status === "opening" || status === "loadingProducts" || status === "readyToPay") {
    if (kind === "subscription" || kind === "monthly") return { message: formatLoadingMessage("access_check", "subscription"), mode: "monthly" };
    if (kind === "pass") return { message: formatLoadingMessage("access_check", "pass"), mode: "pass" };
    if (kind === "single") return { message: formatLoadingMessage("access_check", "single"), mode: "payment" };
    if (kind === "unlock") return { message: text || "잠금 해제 준비 중입니다.", mode: "unlock-saving" };
    return { message: formatLoadingMessage("access_check", "single"), mode: "payment" };
  }
  if (status === "paymentProcessing") {
    if (kind === "pass") return { message: formatPassLoadingMessage("access_check", detail), mode: "pass" };
    if (kind === "subscription" || kind === "monthly") return { message: formatLoadingMessage("pg_processing", "subscription"), mode: "subscription" };
    if (kind === "single") return { message: formatLoadingMessage("pg_processing", "single"), mode: "confirm" };
    if (kind === "unlock") return { message: text || "콘텐츠 잠금 해제를 반영하고 있습니다.", mode: "unlock-saving" };
    return { message: formatLoadingMessage("pg_processing", "single"), mode: "confirm" };
  }
  if (status === "paymentSuccess") {
    if (kind === "pass") return { message: formatPassLoadingMessage("result_loading", detail), mode: "pass-applied" };
    if (kind === "subscription" || kind === "monthly") return { message: formatLoadingMessage("result_loading", "subscription"), mode: "payment-complete" };
    if (kind === "single") return { message: formatLoadingMessage("result_loading", "single"), mode: "payment-complete" };
    if (kind === "unlock") return { message: text || "콘텐츠 잠금 해제가 완료되었습니다.", mode: "payment-complete" };
    return { message: formatLoadingMessage("result_loading", "single"), mode: "payment-complete" };
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

async function withSuppressedRuntimePaymentFetchOverlay<T>(task: () => Promise<T>): Promise<T> {
  if (typeof window === "undefined") return task();
  const runtimeWindow = window as RuntimeApiWindow;
  runtimeWindow.__cdSuppressPaymentFetchOverlayCount = Math.max(0, Number(runtimeWindow.__cdSuppressPaymentFetchOverlayCount || 0)) + 1;
  try {
    return await task();
  } finally {
    runtimeWindow.__cdSuppressPaymentFetchOverlayCount = Math.max(0, Number(runtimeWindow.__cdSuppressPaymentFetchOverlayCount || 0) - 1);
  }
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
  const copyFromStatus: Partial<Record<PaidFeatureGateRuntimeStatus, string>> = {
    opening: "결제 가능한 수단을 확인하고 있습니다.",
    checkingEntitlement: "보유한 30일 이용권으로 바로 열 수 있는지 확인 중입니다.",
    hasEntitlement: "이용권 적용이 완료되었습니다.",
    noEntitlement: "결제가 필요합니다. 결제 페이지로 이동해 주세요.",
    loadingProducts: "결제 상품 정보를 확인하고 있습니다.",
    readyToPay: "결제 수단을 확인해 주세요.",
    paymentProcessing: "결제 승인과 이용 권한을 확인하고 있습니다.",
    paymentSuccess: "이용 권한 저장이 완료되었습니다.",
    paymentFailed: "결제 처리에 실패했습니다.",
    processing: "결제는 완료되었습니다.\n유료 콘텐츠 제공 상태를 확인하고 있습니다.\n잠시만 기다려 주세요.",
    deliveryProcessing: "결제는 완료되었습니다.\n유료 콘텐츠 제공 상태를 확인하고 있습니다.\n잠시만 기다려 주세요.",
    refund_pending: "죄송합니다.\n유료 콘텐츠가 정상적으로 제공되지 않아 자동 환불을 진행하고 있습니다.\n결제 금액은 100% 환불됩니다.",
    refunded: "유료 콘텐츠가 정상적으로 제공되지 않아 결제 금액이 100% 환불되었습니다.\n같은 결제 건으로 다시 청구되지 않습니다.",
    refund_failed: "자동 환불 요청 중 문제가 발생했습니다.\n결제는 정상적으로 기록되어 있으며, 환불 처리를 위해 관리자 확인이 필요합니다.\n잠시 후 다시 확인해 주세요.",
    error: billingClientText("billingClient.error.001"),
  };
  const overlayMessage = String(payload.message || copyFromStatus[status as PaidFeatureGateRuntimeStatus] || "결제 상태를 안전하게 확인하고 있습니다.").trim();
  try {
    if (typeof performance !== "undefined" && typeof performance.mark === "function") {
      performance.mark(`cd-paid-feature-gate-${action}`);
    }
  } catch (_) {}
  const runtimeWindow = window as RuntimeApiWindow;
  if (action !== "close" && isExternalPaymentWindowStatus(status)) {
    emitPaymentLoadingState(false);
    runtimeWindow.__cdPaidFeatureGate?.close?.(payload.requestId);
    return;
  }
  if (action !== "close" && paymentLoadingOwnsPaidFeatureStatus(status)) {
    const overlay = resolvePaidFeatureOverlay(status, overlayMessage, payload as Record<string, unknown>);
    emitPaymentLoadingState(true, overlay.message, overlay.mode);
    runtimeWindow.__cdPaidFeatureGate?.close?.(payload.requestId);
    if (status === "hasEntitlement" || status === "paymentSuccess") {
      window.setTimeout(() => {
        emitPaymentLoadingState(false);
      }, status === "hasEntitlement" ? 1600 : 1100);
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
  profileId?: string;
  selectedProfileId?: string;
  contentKey?: string;
  purchaseId?: string;
  idempotencyKey?: string;
  orderId?: string;
  payloadHash?: string;
  paymentMode?: string;
  allowedPaymentModes?: string[];
  disablePassFirst?: boolean;
  disablePassChoice?: boolean;
  skipPassProbe?: boolean;
  productId?: string;
  serviceType?: string;
}) {
  const featureId = normalizeBillingFeatureKey(input.featureKey || input.subFeatureKey || input.categoryKey || "coin-gate");
  const parts = [
    ["mode", normalizePaymentMode(input.paymentMode)],
    ["request", input.requestId],
    ["report", input.reportId],
    ["session", input.sessionId || input.reportSessionId],
    ["profile", input.profileId || input.selectedProfileId],
    ["content", input.contentKey],
    ["purchase", input.purchaseId || input.idempotencyKey || input.orderId],
    ["payload", input.payloadHash],
    ["paymentModes", Array.isArray(input.allowedPaymentModes) ? input.allowedPaymentModes.join(",") : ""],
    ["disablePassFirst", input.disablePassFirst === true ? "1" : ""],
    ["disablePassChoice", input.disablePassChoice === true ? "1" : ""],
    ["skipPassProbe", input.skipPassProbe === true ? "1" : ""],
    ["product", input.productId],
    ["service", input.serviceType],
  ]
    .map(([key, value]) => {
      const text = toText(value);
      return text ? `${key}:${text}` : "";
    })
    .filter(Boolean)
    .join("|");
  return parts ? `${featureId}|${parts}` : featureId;
}

function resolveReactPaidFeatureGateUiKey(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  cost?: number;
  paymentMode?: string;
}) {
  const featureId = normalizeBillingFeatureKey(input.featureKey || input.subFeatureKey || input.categoryKey || "paid-feature");
  return [
    featureId,
    normalizePaymentMode(input.paymentMode),
    Math.max(0, Math.floor(toNumber(input.cost, 0))),
    toText(input.reason).slice(0, 120),
  ].join("|");
}

function resolvePaymentEligibilityCacheKey(input: {
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
}) {
  const baseKey = resolvePaidFeatureInFlightKey({
    productId: input.productId,
    serviceType: input.serviceType,
    categoryKey: input.categoryKey,
    subFeatureKey: input.subFeatureKey,
    featureKey: input.featureKey,
    paymentMode: "eligibility",
  });
  return [
    baseKey,
    `reason:${toText(input.reason)}`,
    `coins:${Math.max(0, Math.floor(toNumber(input.coinCost ?? input.coinPrice, 0)))}`,
    `krw:${Math.max(0, Math.floor(toNumber(input.priceKRW ?? input.amountKRW, 0)))}`,
  ].join("|");
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
  const now = Date.now();
  const gateUiKey = resolveReactPaidFeatureGateUiKey(input);
  const recentGate = reactPaidFeatureGateRecent.get(gateUiKey);
  if (recentGate && recentGate.expiresAt > now) return recentGate.requestId;
  if (recentGate) reactPaidFeatureGateRecent.delete(gateUiKey);
  const requestId = toText(input.requestId || `${featureId}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  reactPaidFeatureGateRecent.set(gateUiKey, {
    requestId,
    expiresAt: now + REACT_PAID_FEATURE_GATE_RECENT_TTL_MS,
  });
  emitPaidFeatureGate("open", {
    featureId,
    featureKey: featureId,
    requestId,
    title: input.title,
    message: input.message || "보유한 30일 이용권으로 바로 열 수 있는지 확인 중입니다.",
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

export function holdPaidFeatureGateOpen(input: { requestId?: string; maxMs?: number }) {
  if (typeof window === "undefined") return;
  const requestId = toText(input.requestId);
  if (!requestId) return;
  const gate = (window as RuntimeApiWindow).__cdPaidFeatureGate;
  if (gate && typeof gate.holdOpen === "function") {
    gate.holdOpen(requestId, input.maxMs);
    return;
  }
  window.dispatchEvent(new CustomEvent("cd:paid-feature-gate", { detail: { action: "hold", requestId, maxMs: input.maxMs } }));
}

export function releasePaidFeatureGate(requestId?: string) {
  if (typeof window === "undefined") return;
  const normalizedRequestId = requestId ? toText(requestId) : undefined;
  const gate = (window as RuntimeApiWindow).__cdPaidFeatureGate;
  if (gate && typeof gate.release === "function") {
    gate.release(normalizedRequestId);
    return;
  }
  window.dispatchEvent(new CustomEvent("cd:paid-feature-gate", { detail: { action: "release", requestId: normalizedRequestId } }));
}

type PaidFeatureGateCheckInput = {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  requestId?: string;
  cost?: number;
  title?: string;
  message?: string;
  paymentMode?: string;
  accessType?: string;
};

export function beginPaidFeatureGateCheck(input: PaidFeatureGateCheckInput) {
  return openPaidFeatureGate({
    ...input,
    status: "checkingEntitlement",
    paymentMode: input.paymentMode || "MEMBERSHIP_PASS",
    message: input.message || "이용권 확인 중입니다.",
  });
}

export function completePaidFeatureGateCheck(input: PaidFeatureGateCheckInput) {
  updatePaidFeatureGate({
    ...input,
    status: "hasEntitlement",
    paymentMode: input.paymentMode || "MEMBERSHIP_PASS",
    message: input.message || "이용권 확인이 끝났습니다. 결과를 준비하고 있습니다.",
  });
}

export function failPaidFeatureGateCheck(input: PaidFeatureGateCheckInput & { cancelled?: boolean }) {
  const message = input.message || (input.cancelled
    ? "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다."
    : "이용권 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  const cancelled = input.cancelled === true || /PAYMENT_CANCELLED|취소|cancel/i.test(message);
  updatePaidFeatureGate({
    ...input,
    status: cancelled ? "cancelled" : "error",
    paymentMode: input.paymentMode || "MEMBERSHIP_PASS",
    message,
  });
}

export async function fetchBillingFeaturePricing(input: {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  /** true면 결제 게이트 오버레이 이벤트를 발화하지 않는 조용한 가격 조회 (표시 전용) */
  silent?: boolean;
}): Promise<BillingResult<{ pricing: BillingFeaturePricing }>> {
  const { silent, ...queryInput } = input;
  const featureId = toText(input.featureKey || input.subFeatureKey || input.categoryKey || "billing-features");
  if (!silent) {
    emitPaidFeatureGate("open", {
      featureId,
      featureKey: featureId,
      status: "checkingEntitlement",
      message: billingClientText("billingClient.message.003"),
    });
  }
  const query = toQuery(queryInput as Record<string, unknown>);
  const path = query ? `/api/billing/features?${query}` : "/api/billing/features";
  const response = await authFetchBilling(path, { method: "GET" });
  const parsed = await parseBillingResponse<{ pricing: BillingFeaturePricing }>(response);
  if (!silent) {
    emitPaidFeatureGate("update", {
      featureId,
      featureKey: featureId,
      status: parsed.ok ? "checkingEntitlement" : "error",
      message: parsed.ok ? "이용권 적용 가능 여부를 확인하고 있습니다." : (parsed.error?.message || parsed.message || "상품 조회에 실패했습니다."),
      cost: parsed.data?.pricing?.cost,
    });
  }
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

function buildRecoverablePaymentEligibility(input: {
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
}, phase: PaymentEligibilityPhase, parsed: BillingResult<Record<string, unknown>>): BillingResult<PaymentEligibility> {
  const knownPriceKRW = Math.max(0, Math.floor(toNumber(input.priceKRW ?? input.amountKRW, 0)));
  const coinCost = Math.max(0, Math.floor(toNumber(input.coinCost ?? input.coinPrice, knownPriceKRW > 0 ? Math.ceil(knownPriceKRW / 100) : 0)));
  const priceKRW = Math.max(0, Math.floor(toNumber(knownPriceKRW > 0 ? knownPriceKRW : coinCost * 100, 0)));
  const authUser = asRecord(readSanitizedAuthUser());
  const authSubscription = asRecord(authUser?.profileSubscription);
  const monthlyBalance = phase === "pass"
    ? 0
    : Math.max(0, Math.floor(toNumber(
      authUser?.monthlyStoneBalance
        ?? authUser?.membershipCreditBalance
        ?? authUser?.monthlyCredits
        ?? authSubscription?.monthlyStoneBalance
        ?? authSubscription?.membershipCreditBalance
        ?? authSubscription?.monthlyCredits,
      0,
    )));
  const monthlyCost = Math.max(0, Math.floor(coinCost * 10));

  return {
    ok: true,
    status: 200,
    data: {
      loading: false,
      coinCost,
      priceKRW,
      access: {
        canAccess: false,
        alreadyUnlocked: false,
        reason: "auth_recovered_payment_required",
      },
      pass: {
        hasActivePass: false,
        tier: null,
        label: null,
        limit: null,
        canUse: false,
      },
      monthly: {
        balance: monthlyBalance,
        canUse: phase !== "pass" && monthlyCost > 0 && monthlyBalance >= monthlyCost,
        afterBalance: phase === "pass" ? 0 : Math.max(0, monthlyBalance - monthlyCost),
      },
      card: {
        canUse: phase !== "pass",
        provider: "PORTONE_V2_KG_INICIS",
      },
      raw: {
        recoveredFromAuthRequired: true,
        originalStatus: parsed.status,
        originalCode: parsed.error?.code || asRecord(parsed.raw)?.code || "",
        originalMessage: parsed.error?.message || parsed.message || "",
      },
    },
    message: billingClientText("billingClient.message.004"),
    error: null,
    raw: parsed.raw,
  };
}

async function fetchPaymentEligibilityUncached(input: {
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
}, fetchOptions: { force?: boolean; phase?: PaymentEligibilityPhase } = {}): Promise<BillingResult<PaymentEligibility>> {
  const phase: PaymentEligibilityPhase = fetchOptions.phase === "pass" ? "pass" : "full";
  const knownPriceKRW = Math.max(0, Math.floor(toNumber(input.priceKRW ?? input.amountKRW, 0)));
  const knownCoinCost = Math.max(0, Math.floor(toNumber(input.coinCost ?? input.coinPrice, knownPriceKRW > 0 ? Math.ceil(knownPriceKRW / 100) : 0)));
  const hasServerLookupKey = Boolean(input.productId || input.serviceType || input.categoryKey || input.subFeatureKey || input.featureKey || input.reason);
  if (fetchOptions.force === true) {
    clearSubscriptionSnapshotForUser();
    invalidateBillingBalanceCache();
  }
  const snapshot = fetchOptions.force === true ? null : readSubscriptionSnapshotForUser();
  const snapshotAllowsLocalPass = Boolean(snapshot && (snapshot.state !== "none" || !hasServerLookupKey));
  const canUseLocalSubscriptionSnapshot = Boolean(snapshot && snapshot.state !== "none" && snapshotAllowsLocalPass && !hasServerLookupKey);
  if (snapshot && canUseLocalSubscriptionSnapshot) {
    if (knownCoinCost > 0 || knownPriceKRW > 0) {
      return buildSnapshotPaymentEligibility(input, snapshot, phase);
    }
    const pricing = await fetchPricingForSubscriptionSnapshot(input).catch(() => null);
    if (pricing) {
      const pricingAmountKRW = Math.max(0, Math.floor(toNumber(pricing.amountKRW ?? pricing.cashPrice, 0)));
      const pricingCoinCost = Math.max(0, Math.floor(toNumber(pricing.coinPrice ?? pricing.cost, pricingAmountKRW > 0 ? Math.ceil(pricingAmountKRW / 100) : 0)));
      return buildSnapshotPaymentEligibility({
        ...input,
        coinCost: pricingCoinCost,
        priceKRW: pricingAmountKRW > 0 ? pricingAmountKRW : pricingCoinCost * 100,
      }, snapshot, phase);
    }
    return buildSnapshotPaymentEligibility(input, snapshot, phase);
  }
  const query = toQuery({
    productId: input.productId,
    serviceType: input.serviceType,
    categoryKey: input.categoryKey,
    subFeatureKey: input.subFeatureKey,
    featureKey: input.featureKey,
    reason: input.reason,
    scope: phase === "pass" ? "pass" : undefined,
  });
  const response = await authFetchBilling(query ? `/api/billing/unlock-status?${query}` : "/api/billing/unlock-status", { method: "GET", cache: "no-store" });
  const parsed = await parseBillingResponse<Record<string, unknown>>(response);

  if (!parsed.ok || !parsed.data) {
    const failureCode = toText(parsed.error?.code || (asRecord(parsed.raw)?.code));
    if (shouldInvalidateSubscriptionSnapshot(parsed.status, failureCode)) clearSubscriptionSnapshotForUser();
    if (isAuthRequiredBillingCode(parsed.status, failureCode) && hasClientAuthSessionHint()) {
      const recovered = buildRecoverablePaymentEligibility(input, phase, parsed);
      if (recovered.data && recovered.data.coinCost > 0) return recovered;
    }
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
  const explicitPriceKRW = Math.max(0, Math.floor(toNumber(pricing.amountKRW ?? pricing.cashPrice ?? input.priceKRW ?? input.amountKRW, 0)));
  const coinCost = Math.max(0, Math.floor(toNumber(options.coinCost ?? data.coinCost ?? pricing.coinPrice ?? pricing.cost ?? input.coinCost ?? input.coinPrice, explicitPriceKRW > 0 ? Math.ceil(explicitPriceKRW / 100) : 0)));
  const priceKRW = Math.max(0, Math.floor(toNumber(explicitPriceKRW > 0 ? explicitPriceKRW : coinCost * 100, 0)));
  const monthlyBalance = phase === "pass" ? 0 : Math.max(0, Math.floor(toNumber(options.monthlyBalance ?? data.monthlyBalance ?? data.membershipCreditBalance, 0)));
  const monthlyCost = Math.max(0, Math.floor(toNumber(options.membershipCreditCost ?? data.membershipCreditCost ?? pricing.membershipCreditCost, coinCost * 10)));
  const membershipPass = asRecord(data.membershipPass);
  const passTier = normalizePassTier(
    options.passTier
      ?? data.passTier
      ?? data.subscriptionTier
      ?? membershipPass?.passTier
      ?? membershipPass?.tier,
  );
  const passExpiresAt = normalizeSubscriptionSnapshotDate(data.expiresAt ?? options.expiresAt ?? membershipPass?.expiresAt);
  const passExpired = !!passExpiresAt && Date.parse(passExpiresAt) <= Date.now();
  const hasActivePass = !passExpired && Boolean(options.hasActivePass ?? data.hasActivePass);
  const passLimit = toNumber(
    options.passLimit
      ?? data.passLimit
      ?? data.freeLimit
      ?? membershipPass?.passLimit
      ?? membershipPass?.freeLimit
      ?? membershipPass?.maxCoveredCoin,
    NaN,
  );
  const accessDecision = asRecord(data.accessDecision);
  const accessReason = normalizeAccessReason(accessDecision?.reason || data.accessReason || data.decisionReason);
  const accessStatus = normalizeAccessReason(accessDecision?.status);
  const familyAllAccess = hasActivePass && passTier === "family";
  const passCovered = !passExpired && (
    familyAllAccess
      || data.freeBySubscription === true
      || accessReason === "pass_covered"
      || accessReason === "family_all_access"
      || accessStatus === "license_passed"
  );
  const canAccess = Boolean(data.canAccess === true || data.unlocked === true || accessDecision?.accessGranted === true || passCovered);
  const normalizedPassLimit = passTier === "family"
    ? 999999999
    : (Number.isFinite(passLimit) && passLimit > 0 ? Math.floor(passLimit) : null);
  saveSubscriptionSnapshotForUser(undefined, {
    ...data,
    ...options,
    tier: data.subscriptionTier ?? options.subscriptionTier ?? options.passTier ?? data.passTier ?? membershipPass?.tier,
    passTier: options.passTier ?? data.passTier ?? membershipPass?.passTier,
    isActive: hasActivePass,
    hasActivePass,
    expiresAt: passExpiresAt ?? data.expiresAt ?? options.expiresAt,
  }, "unlock-status");
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
      hasActivePass,
      tier: passTier,
      label: labelForPassTier(passTier),
      limit: normalizedPassLimit,
      canUse: !passExpired && Boolean(familyAllAccess || (options.canUseByPass ?? data.canUseByPass ?? passCovered)),
    },
    monthly: {
      balance: monthlyBalance,
      canUse: phase === "pass" ? false : Boolean(options.canUseByMonthly ?? data.canUseByMonthly),
      afterBalance: phase === "pass" ? 0 : Math.max(0, monthlyBalance - monthlyCost),
    },
    card: {
      canUse: phase === "pass" ? false : Boolean(options.canUseByCard ?? data.canUseByCard ?? true),
      provider: "PORTONE_V2_KG_INICIS",
    },
    raw: data,
  };
  const entitlementStatus: EntitlementStatus = {
    isActive: eligibility.pass.hasActivePass,
    plan: normalizeEntitlementPlan(eligibility.pass.tier),
    maxCoinCovered: eligibility.pass.tier === "family" ? null : eligibility.pass.limit,
    source: "server",
  };
  const debugAccessDecision = decidePaidFeatureAccess(entitlementStatus, {
    featureId: normalizeBillingFeatureKey(input.featureKey || input.subFeatureKey || input.categoryKey || input.reason || "billing-feature"),
    coinPrice: eligibility.coinCost,
    category: input.categoryKey,
  });
  debugEntitlement("[Entitlement] latest server status", entitlementStatus);
  debugEntitlement("[Entitlement] access decision", debugAccessDecision);

  return {
    ...parsed,
    data: eligibility,
  };
}

// 진입 시 구독 스냅샷을 미리 워밍한다(멤버십 상태 프로브 1회 → saveSubscriptionSnapshotForUser 경유 저장).
// 이미 신선한 스냅샷이 있으면 재요청하지 않는다. index.html의 app-entry 워밍(_cdRefreshSubscriptionSnapshotFromServer)의
// React 대응물 — 유료 화면 진입 시 호출하면 첫 유료 액션이 낙관적 즉시 허용(snapshotPassServerCheckFirst) 경로로 들어간다.
let subscriptionWarmInFlight = false;
export async function warmSubscriptionSnapshotOnEntry(): Promise<void> {
  if (typeof window === "undefined" || subscriptionWarmInFlight) return;
  if (readSubscriptionSnapshotForUser()) return; // 이미 신선한 스냅샷 보유 → 재요청 불필요.
  subscriptionWarmInFlight = true;
  try {
    await fetchPaymentEligibility({ featureKey: "membership-status-refresh", reason: "app-entry" }, { phase: "full" });
  } catch {
    // 워밍 실패는 무시 — 첫 유료 액션이 서버 판정으로 폴백한다.
  } finally {
    subscriptionWarmInFlight = false;
  }
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
}, fetchOptions: { force?: boolean; phase?: PaymentEligibilityPhase } = {}): Promise<BillingResult<PaymentEligibility>> {
  const phase: PaymentEligibilityPhase = fetchOptions.phase === "pass" ? "pass" : "full";
  const cacheKey = `${phase}:${resolvePaymentEligibilityCacheKey(input)}`;
  const now = Date.now();
  if (fetchOptions.force === true) {
    paymentEligibilityRecent.delete(cacheKey);
    paymentEligibilityInFlight.delete(cacheKey);
  } else {
    const recent = paymentEligibilityRecent.get(cacheKey);
    if (recent && recent.expiresAt > now) return recent.result;
    if (recent) paymentEligibilityRecent.delete(cacheKey);
    const current = paymentEligibilityInFlight.get(cacheKey);
    if (current) return current;
  }

  const promise = fetchPaymentEligibilityUncached(input, { force: fetchOptions.force, phase });
  paymentEligibilityInFlight.set(cacheKey, promise);
  try {
    const result = await promise;
    if (shouldCachePaymentEligibilityResult(result)) {
      paymentEligibilityRecent.set(cacheKey, {
        result,
        expiresAt: Date.now() + PAYMENT_ELIGIBILITY_RECENT_TTL_MS,
      });
    } else {
      paymentEligibilityRecent.delete(cacheKey);
    }
    return result;
  } finally {
    if (paymentEligibilityInFlight.get(cacheKey) === promise) {
      paymentEligibilityInFlight.delete(cacheKey);
    }
  }
}

async function registerDeferredBillingUsage(
  input: BillingCoinGateInput,
  result: BillingResult<BillingCoinGateData>,
  context: { requestId: string; featureId: string },
): Promise<BillingResult<BillingCoinGateData>> {
  if (input.deferUsage !== true || !result.ok || !result.data) return result;
  const response = await authFetchBilling("/api/billing/coin-gate/deferred/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(input || {}),
      requestId: context.requestId,
      idempotencyKey: input.idempotencyKey || context.requestId,
      featureKey: input.featureKey || context.featureId,
      deferUsage: true,
      usagePolicy: input.usagePolicy || "apply_after_success",
      billingGate: result.data,
    }),
  });
  return await parseBillingResponse<BillingCoinGateData>(response);
}

// 낙관적 pass 즉시 허용의 정확성 안전장치(정적 destiny-profile 경로와 동일 정책).
// 백그라운드 coin-gate가 실제로는 미커버(만료 등)로 밝혀지면 잠시 낙관적 허용을 끄고 세션을 갱신한다.
let optimisticPassDisabledUntil = 0;
function isOptimisticPassTemporarilyDisabled() { return Date.now() < optimisticPassDisabledUntil; }
function disableOptimisticPassBriefly() { optimisticPassDisabledUntil = Date.now() + 60_000; }

// 낙관적 즉시 허용 후 서버에 pass 사용을 기록(fire-and-forget). pass는 무료라 기록 실패해도 금전영향 0.
// 서버가 미커버(402)로 응답하면 로컬 스냅샷이 낡은 것이므로 낙관적 허용을 잠시 끄고 세션을 갱신한다.
async function recordMembershipPassInBackground(input: BillingCoinGateInput, attemptId: string) {
  try {
    const response = await authFetchBilling("/api/billing/coin-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(input || {}), paymentMode: "MEMBERSHIP_PASS", forceDeduct: false, attemptId }),
    });
    const parsed = await parseBillingResponse<BillingCoinGateData>(response);
    if (parsed.ok && parsed.data) {
      invalidateBillingBalanceCache();
      normalizeBillingBalanceFields(parsed.data as BillingCoinGateData & Record<string, unknown>);
      emitBillingBalanceUpdated(parsed.data as BillingCoinGateData & Record<string, unknown>, "coin-gate");
      return;
    }
    const code = String(parsed.error?.code || "").toUpperCase();
    if (parsed.status === 402 || code === "MEMBERSHIP_PASS_NOT_COVERED" || code === "PAYMENT_REQUIRED") {
      disableOptimisticPassBriefly();
      try {
        const { refreshAuth } = await import("./auth-store");
        void refreshAuth({ force: true, silent: true });
      } catch {}
    }
    // 5xx/degraded는 일시장애 — 무시(재시도 불필요).
  } catch {
    // 네트워크 실패 무시.
  }
}

export async function runBillingCoinGate(input: BillingCoinGateInput): Promise<BillingResult<BillingCoinGateData>> {
  const featureId = toText(input.featureKey || input.subFeatureKey || input.categoryKey || "coin-gate");
  const inFlightKey = resolvePaidFeatureInFlightKey(input);
  const now = Date.now();
  const existing = billingCoinGateInFlight.get(inFlightKey);
  if (existing) {
    const existingFlow = existing;
    console.info("[paid-flow]", {
      stage: "DUPLICATE_CLIENT_FLOW_BLOCKED",
      featureId,
      requestId: existingFlow.requestId,
      duplicateBlocked: true,
    });
    return existingFlow.promise;
  }
  const recent = billingCoinGateRecent.get(inFlightKey);
  if (recent && recent.expiresAt > now) {
    const recentFlow = recent;
    console.info("[paid-flow]", {
      stage: "DUPLICATE_CLIENT_FLOW_BLOCKED",
      featureId,
      requestId: recentFlow.requestId,
      duplicateBlocked: true,
    });
    return recentFlow.promise;
  }
  if (recent) billingCoinGateRecent.delete(inFlightKey);

  // 게이트 진입 전 인증을 예열한다. 미hydration/만료직전 토큰으로 첫 유료요청이 새어
  // 이용권 보유자가 결제 경로로 빠지는 문제를 직접호출(runBillingCoinGate) 기능 전반에서 막는다.
  // 정적 import는 auth-store가 순환을 피하려 billing-client import를 일부러 안 하므로 동적 import 사용.
  try {
    const { getAuthState, refreshAuth } = await import("./auth-store");
    if (!getAuthState().isAuthenticated) {
      // refreshAuth가 느린 /만료 세션에서 무한 대기하면 게이트가 첫 상태 emit 전
      // '이용권 확인 중'에서 영구 고착한다. 상한(4s)을 걸어 예열이 늦어도 진행시키고,
      // 최종 접근 판정은 서버가 한다(아래 catch 정책과 동일).
      await Promise.race([
        refreshAuth({ force: true, silent: true }),
        new Promise<void>((resolve) => globalThis.setTimeout(resolve, 4000)),
      ]);
    }
  } catch {
    // 인증 예열 실패는 삼킨다 — 최종 접근 판정은 서버가 한다.
  }

  const activeAttempt = beginPaidAttempt({
    featureKey: featureId,
    mode: toText(input.reason || ""),
  });
  const gateRequestId = toText(input.requestId || activeAttempt.attemptId || inFlightKey);
  const initialSnapshot = readSubscriptionSnapshotForUser();
  const requestedMode = normalizePaymentMode(input.paymentMode);
  const passDisabled = input.disablePassFirst === true || input.disablePassChoice === true || input.skipPassProbe === true;
  const explicitPassMode = requestedMode === "MEMBERSHIP_PASS" && !passDisabled;
  const directKrwUsesNativeBilling = requestedMode === "DIRECT_KRW" && isMobileAppRuntime();
  const explicitPaymentMode = explicitPassMode || requestedMode === "MOONLIGHT_STONE" || (requestedMode === "DIRECT_KRW" && !directKrwUsesNativeBilling);
  // 명시 결제모드(월정석·비네이티브 단건)는 첫 프레임을 "이용권 확인 중"이 아니라 결제수단에 맞는 준비 상태로 연다.
  // (명시 이용권·일반 pass-first 경로는 기존 "이용권 확인 중" 유지.)
  const explicitMonthlyMode = requestedMode === "MOONLIGHT_STONE";
  const explicitDirectMode = requestedMode === "DIRECT_KRW" && !directKrwUsesNativeBilling;
  const initialGateStatus: PaidFeatureGateRuntimeStatus =
    (passDisabled || explicitMonthlyMode || explicitDirectMode) ? "paymentPreparing" : "checkingEntitlement";
  const initialGateMessage = explicitMonthlyMode
    ? "월정석 사용 권한을 확인하고 있어요."
    : ((passDisabled || explicitDirectMode) ? billingClientText("billingClient.message.021") : billingClientText("billingClient.message.005"));
  emitPaidFeatureGate("open", {
    featureId,
    featureKey: featureId,
    requestId: gateRequestId,
    status: initialGateStatus,
    message: initialGateMessage,
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
    const knownInputCoinCost = resolveKnownCoinCost(input, null);
    const initialSnapshotPassLimit = initialSnapshot?.state === "active" ? subscriptionSnapshotPassLimit(initialSnapshot.tier) : 0;
    const snapshotPassServerCheckFirst = Boolean(
      !explicitPaymentMode
      && !passDisabled
      && knownInputCoinCost > 0
      && initialSnapshot?.state === "active"
      && initialSnapshotPassLimit > 0
      && (initialSnapshot.tier === "family" || knownInputCoinCost <= initialSnapshotPassLimit),
    );
    const loadRuntimeGateForPayment = () => (!explicitPaymentMode && input.forceDeduct !== false && typeof window !== "undefined"
      ? loadPaidServiceRuntimeGate().catch(() => null)
      : Promise.resolve(null));
    const eligibilityInput = {
      categoryKey: input.categoryKey,
      subFeatureKey: input.subFeatureKey,
      featureKey: input.featureKey,
      reason: input.reason,
      productId: input.productId,
      serviceType: input.serviceType || input.productType,
      coinCost: input.cost,
      coinPrice: input.coinPrice,
      priceKRW: input.priceKRW,
      amountKRW: input.amountKRW ?? input.amountKrw ?? input.paymentAmount,
    };
    // unlock-status를 pass/full 2회 호출하던 구조를 단일 full 조회로 통합한다.
    // full 응답에 이미 pass 커버 정보(access.canAccess / pass.canUse)가 포함되므로
    // 별도 pass 프로브 왕복이 불필요하며, 유료 액션마다 발생하던 요청 2배 증폭을 제거한다.
    const eligibilityResult = explicitPaymentMode || snapshotPassServerCheckFirst
      ? null
      : await fetchPaymentEligibility(eligibilityInput, { phase: "full" }).catch(() => null);
    const eligibility = eligibilityResult?.ok ? eligibilityResult.data : null;
    const passCoveredByServer = eligibility?.access.canAccess === true || eligibility?.pass.canUse === true;
    if (eligibility && !passCoveredByServer && !explicitPaymentMode && !passDisabled && input.forceDeduct !== false) {
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: "loadingProducts",
        message: billingClientText("billingClient.message.006"),
        cost: eligibility.coinCost,
        paymentMode: requestedMode,
        reason: input.reason,
      });
    }
    const knownCoinCost = resolveKnownCoinCost(input, eligibility);
    const accessAlreadyGranted = eligibility?.access.canAccess === true;
    const passFirstEligible = explicitPassMode || snapshotPassServerCheckFirst || accessAlreadyGranted || (!passDisabled && eligibility?.pass.canUse === true);
    const passAccessEligible = !passDisabled && (explicitPassMode || snapshotPassServerCheckFirst || eligibility?.pass.canUse === true);
    const snapshotSaysNoPass = normalizeAccessReason(eligibility?.access.reason) === "subscription_snapshot_none";
    console.log("[이용권 체크]", {
      passStatus: {
        source: eligibility ? "unlock-status" : (snapshotPassServerCheckFirst ? "subscription-snapshot" : "server-direct"),
        tier: eligibility?.pass.tier ?? initialSnapshot?.tier ?? null,
        hasActivePass: eligibility?.pass.hasActivePass ?? (initialSnapshot?.state === "active"),
        canUse: Boolean(passFirstEligible),
      },
      featurePrice: knownCoinCost,
      hasValidPass: Boolean(passFirstEligible),
      shouldShowPayment: Boolean(!passFirstEligible && knownCoinCost > 0 && input.forceDeduct !== false),
    });
    // 낙관적 pass 즉시 허용: 로컬 구독 스냅샷이 pass 커버를 확인하면(snapshotPassServerCheckFirst) coin-gate
    // 왕복을 기다리지 않고 즉시 pass 통과를 반환하고, coin-gate는 백그라운드로 기록한다(정적 경로와 동일 정책).
    // 정확성: 잔액은 실제 현재 값(pass는 무료라 불변), 백그라운드 미커버(402) 시 낙관적 허용 비활성화+세션 갱신.
    if (snapshotPassServerCheckFirst && passAccessEligible && !explicitPaymentMode && input.forceDeduct !== false && !isOptimisticPassTemporarilyDisabled()) {
      markPaymentRequestedOnce();
      const optimisticTier = eligibility?.pass.tier || initialSnapshot?.tier || "";
      const optimisticFeatureKey = toText(input.featureKey || featureId);
      // 낙관 경로도 "확인 중 → 적용 완료" 2단계 UX를 유지한다. checkingEntitlement는 위쪽 open()에서
      // 이미 표시 중이므로, 한 프레임 이상 노출되도록 짧게 지연한 뒤 hasEntitlement(적용 완료)로 전환하고,
      // hold로 완료 프레임의 최소 노출 창을 표시한다. 합성 grant는 즉시 반환하므로 콘텐츠 생성은 완료
      // 표시와 병렬로 진행된다(서버 왕복 없이 얻은 속도 유지 + 사라졌던 완료 UI 복원).
      const emitOptimisticPassApplied = () => {
        const optimisticOverlay = resolvePaymentWaitOverlay("hasEntitlement", undefined, {
          paymentMode: "MEMBERSHIP_PASS",
          featureKey: featureId,
          reason: input.reason,
          accessType: "membership_pass",
          passTier: optimisticTier,
          subscriptionTier: optimisticTier,
        });
        holdPaidFeatureGateOpen({ requestId: gateRequestId, maxMs: 1200 });
        emitPaidFeatureGate("update", {
          featureId,
          featureKey: featureId,
          requestId: gateRequestId,
          status: "hasEntitlement",
          message: optimisticOverlay.message,
          paymentMode: "MEMBERSHIP_PASS",
          reason: input.reason,
          accessType: "membership_pass",
          passTier: optimisticTier,
          subscriptionTier: optimisticTier,
        });
      };
      if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
        window.setTimeout(emitOptimisticPassApplied, 450);
      } else {
        emitOptimisticPassApplied();
      }
      void recordMembershipPassInBackground(input, activeAttempt.attemptId);
      // payment-succeeded/callback 마커는 여기서 호출하지 않는다: 실제 결제(pass 적용·기록)는 백그라운드
      // coin-gate에서 서버 검증과 함께 일어나므로, 검증 전 성공 마킹은 부정확하고 verify 가드(검증→성공 순서)를
      // 위반한다. 낙관적 경로는 합성 grant만 반환하고, 이후 onPaid의 생성 마커가 진행 상태를 이어간다.
      // 잔액은 낙관적 응답에 싣지 않는다(user.points는 폐지된 레거시 코인이라 읽지 않음). pass는 무료라 잔액이
      // 변하지 않고, 백그라운드 coin-gate 성공 시 emitBillingBalanceUpdated가 서버 정본 잔액으로 UI를 갱신한다.
      return {
        ok: true,
        status: 200,
        data: {
          freeBySubscription: true,
          balance: null,
          pricing: { cost: knownInputCoinCost, coinPrice: knownInputCoinCost, featureKey: optimisticFeatureKey },
          consume: { accessType: "membership_pass", accessMethod: "PASS", paymentMode: "MEMBERSHIP_PASS", featureKey: optimisticFeatureKey, transactionId: `opt-pass-${gateRequestId}` },
          subscriptionTier: optimisticTier,
        } as unknown as BillingCoinGateData,
        raw: {},
      } as BillingResult<BillingCoinGateData>;
    }
    if (eligibility) {
      const eligibilityPassReady = accessAlreadyGranted || (!passDisabled && eligibility.pass.canUse === true);
      const eligibilityStatus: PaidFeatureGateRuntimeStatus = eligibilityPassReady
        ? "hasEntitlement"
        : (snapshotSaysNoPass ? "readyToPay" : "loadingProducts");
      const eligibilityPaymentMode = !passDisabled && eligibility.pass.canUse === true ? "MEMBERSHIP_PASS" : (requestedMode || (accessAlreadyGranted ? "DIRECT_KRW" : ""));
      const eligibilityOverlay = resolvePaymentWaitOverlay(
        eligibilityStatus,
        undefined,
        {
          paymentMode: eligibilityPaymentMode,
          featureKey: featureId,
          reason: input.reason,
          accessType: !passDisabled && eligibility.pass.canUse === true ? "membership_pass" : (accessAlreadyGranted ? "already_unlocked" : ""),
          passTier: eligibility.pass.tier || "",
          subscriptionTier: eligibility.pass.tier || "",
        },
      );
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: eligibilityStatus,
        message: eligibilityPassReady
          ? eligibilityOverlay.message
          : (snapshotSaysNoPass ? "결제 가능한 상품을 준비하고 있습니다." : eligibilityOverlay.message),
        cost: eligibility.coinCost,
        paymentMode: eligibilityPaymentMode,
        reason: input.reason,
        accessType: !passDisabled && eligibility.pass.canUse === true ? "membership_pass" : (accessAlreadyGranted ? "already_unlocked" : ""),
        passTier: eligibility.pass.tier || "",
        subscriptionTier: eligibility.pass.tier || "",
      });
    }

    if (!explicitPaymentMode && !passFirstEligible && eligibility && knownCoinCost > 0 && input.forceDeduct !== false) {
      markPaymentRequestedOnce();
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: "readyToPay",
        message: billingClientText("billingClient.message.007"),
        cost: knownCoinCost,
        reason: input.reason,
      });
      const runtimePaymentResult = await runPaidServiceRuntimePayment(input, {
        featureId,
        requestId: gateRequestId,
        eligibility,
        runtimeGate: await loadRuntimeGateForPayment(),
      });
      if (runtimePaymentResult) {
        const parsed = await registerDeferredBillingUsage(input, runtimePaymentResult, {
          requestId: gateRequestId,
          featureId,
        });
        if (parsed.ok && parsed.data) {
          if (!hasVerifiedBillingAccess(parsed.data, input.featureKey || featureId)) {
            markPaidAttemptFailed("server_access_grant_missing");
            emitPaidFeatureGate("update", {
              featureId,
              featureKey: featureId,
              requestId: gateRequestId,
              status: "paymentFailed",
              message: billingClientText("billingClient.message.008"),
            });
            return {
              ...parsed,
              ok: false,
              status: parsed.status || 500,
              data: null,
              message: billingClientText("billingClient.message.009"),
              error: {
                code: "SERVER_ACCESS_GRANT_MISSING",
                message: billingClientText("billingClient.message.010"),
              },
            };
          }
          invalidateBillingBalanceCache();
          normalizeBillingBalanceFields(parsed.data as BillingCoinGateData & Record<string, unknown>);
          emitBillingBalanceUpdated(parsed.data as BillingCoinGateData & Record<string, unknown>, "coin-gate-runtime");
          markPaidAttemptPaymentSucceeded();
          markPaidAttemptCallbackReturned();
          const consume = asRecord(parsed.data.consume);
          const accessType = toText(consume?.accessType);
          const accessMethod = toText(consume?.accessMethod);
          const paymentMethod = toText(consume?.paymentMethod);
          const runtimeData = parsed.data as BillingCoinGateData & Record<string, unknown>;
          const licenseGate = extractLicenseGateResult(runtimeData);
          const licenseMessage = buildLicensePassOverlayMessage(runtimeData);
          const runtimeMembershipPass = asRecord(runtimeData.membershipPass);
          const runtimePassTier = toText(
            runtimeData.passTier
              ?? runtimeData.subscriptionTier
              ?? runtimeMembershipPass?.tier
              ?? runtimeMembershipPass?.passTier
              ?? licenseGate?.licenseTier,
          );
          const appliedPayment = resolveAppliedBillingPayment(runtimeData, "DIRECT_KRW", runtimeData.freeBySubscription === true);
          const successOverlay = resolvePaymentWaitOverlay(appliedPayment.status, licenseMessage || undefined, {
            paymentMode: appliedPayment.paymentMode,
            featureKey: featureId,
            reason: input.reason,
            accessType,
            accessMethod,
            paymentMethod,
            licenseTier: licenseGate?.licenseTier,
            licenseReason: licenseGate?.reason,
            passTier: runtimePassTier,
            subscriptionTier: runtimePassTier,
            membershipPass: runtimeMembershipPass,
          });
          emitPaidFeatureGate("update", {
            featureId,
            featureKey: featureId,
            requestId: gateRequestId,
            status: appliedPayment.status,
            message: successOverlay.message,
            cost: parsed.data.pricing?.cost,
            paymentMode: appliedPayment.paymentMode,
            reason: input.reason,
            accessType,
            accessMethod,
            paymentMethod,
            licenseTier: licenseGate?.licenseTier,
            licenseReason: licenseGate?.reason,
            passTier: runtimePassTier,
            subscriptionTier: runtimePassTier,
          });
        } else {
          const runtimeCode = String(parsed.error?.code || "").toUpperCase();
          markPaidAttemptFailed(parsed.error?.code || "payment_runtime_required");
          emitPaidFeatureGate("update", {
            featureId,
            featureKey: featureId,
            requestId: gateRequestId,
            status: runtimeCode === "PAYMENT_CANCELLED" ? "cancelled" : "paymentFailed",
            message: parsed.error?.message || parsed.message || "결제가 완료되지 않았습니다.",
            cost: knownCoinCost,
            reason: input.reason,
          });
        }
        return parsed;
      }
      markPaidAttemptFailed("payment_gate_unavailable");
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: "error",
        message: billingClientText("billingClient.message.011"),
        cost: knownCoinCost,
        reason: input.reason,
      });
      return {
        ok: false,
        status: 503,
        data: null,
        message: billingClientText("billingClient.message.012"),
        error: {
          code: "PAYMENT_GATE_UNAVAILABLE",
          message: billingClientText("billingClient.message.013"),
        },
        raw: {},
      };
    }

    markPaymentRequestedOnce();
    const processingStatus: PaidFeatureGateRuntimeStatus = passFirstEligible ? "hasEntitlement" : "paymentProcessing";
    const processingPaymentMode = passAccessEligible ? "MEMBERSHIP_PASS" : (accessAlreadyGranted ? "DIRECT_KRW" : requestedMode);
    const processingPassTier = eligibility?.pass.tier || initialSnapshot?.tier || "";
    const processingOverlay = resolvePaymentWaitOverlay(processingStatus, undefined, {
      paymentMode: processingPaymentMode,
      featureKey: featureId,
      reason: input.reason,
      accessType: passAccessEligible ? "membership_pass" : (accessAlreadyGranted ? "already_unlocked" : ""),
      passTier: processingPassTier,
      subscriptionTier: processingPassTier,
    });
    emitPaidFeatureGate("update", {
      featureId,
      featureKey: featureId,
      requestId: gateRequestId,
      status: processingStatus,
      message: processingOverlay.message,
      paymentMode: processingPaymentMode,
      reason: input.reason,
      accessType: passAccessEligible ? "membership_pass" : (accessAlreadyGranted ? "already_unlocked" : ""),
      passTier: processingPassTier,
      subscriptionTier: processingPassTier,
    });

    const runCoinGateRequest = async () => {
      const response = await authFetchBilling("/api/billing/coin-gate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(input || {}),
          paymentMode: passAccessEligible ? "MEMBERSHIP_PASS" : (requestedMode || input.paymentMode),
          forceDeduct: passAccessEligible ? false : input.forceDeduct,
          attemptId: activeAttempt.attemptId,
        }),
      });
      return parseBillingResponse<BillingCoinGateData>(response);
    };

    // 워커-DB 일시 장애로 인증/이용권 확인이 순간 실패(degraded-503)하면, 이용권 보유자가 무료 통과할
    // 기회를 살리려 짧게 재시도한다(재시도-우선). degraded-503은 과금 전 확인 실패라 재요청이 안전하고,
    // 동일 attemptId를 재사용해 서버 멱등 병합과 정합을 유지한다. 재시도 중 200(pass covered)이면 아래
    // 성공 분기로 무료 통과하고, 확정 응답(402/401 등)이면 즉시 중단해 기존 분기가 처리한다. 소진 후에도
    // degraded면 else의 shouldOpenRuntimePaymentFallback이 결제창(단건+월정석)을 열어 dead-end를 막는다.
    let parsed = await runCoinGateRequest();
    for (let retryIndex = 1; retryIndex <= COIN_GATE_TRANSIENT_MAX_RETRIES; retryIndex += 1) {
      if (!isRetryableBillingInfraDegraded(parsed.status, parsed.error?.code)) break;
      const backoffMs = Math.round(COIN_GATE_TRANSIENT_BASE_DELAY_MS * Math.pow(1.8, retryIndex - 1));
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      parsed = await runCoinGateRequest();
    }

    if (parsed.ok && parsed.data) {
      if (!hasVerifiedBillingAccess(parsed.data, input.featureKey || featureId)) {
        markPaidAttemptFailed("server_access_grant_missing");
        emitPaidFeatureGate("update", {
          featureId,
          featureKey: featureId,
          requestId: gateRequestId,
          status: "paymentFailed",
          message: billingClientText("billingClient.message.014"),
        });
        return {
          ...parsed,
          ok: false,
          status: parsed.status || 500,
          data: null,
          message: billingClientText("billingClient.message.015"),
          error: {
            code: "SERVER_ACCESS_GRANT_MISSING",
            message: billingClientText("billingClient.message.016"),
          },
        };
      }
      const normalizedBalance = toNumber(parsed.data.balance, NaN);
      parsed.data.balance = Number.isFinite(normalizedBalance) ? normalizedBalance : null;
      invalidateBillingBalanceCache();
      normalizeBillingBalanceFields(parsed.data as BillingCoinGateData & Record<string, unknown>);
      emitBillingBalanceUpdated(parsed.data as BillingCoinGateData & Record<string, unknown>, "coin-gate");
      markPaidAttemptPaymentSucceeded();
      markPaidAttemptCallbackReturned();
      const consume = asRecord(parsed.data.consume);
      const accessType = toText(consume?.accessType);
      const accessMethod = toText(consume?.accessMethod);
      const paymentMethod = toText(consume?.paymentMethod);
      const licenseGate = extractLicenseGateResult(parsed.data as BillingCoinGateData & Record<string, unknown>);
      const licenseMessage = buildLicensePassOverlayMessage(parsed.data as BillingCoinGateData & Record<string, unknown>);
      const runtimeData = parsed.data as BillingCoinGateData & Record<string, unknown>;
      const appliedPayment = resolveAppliedBillingPayment(runtimeData, requestedMode, passFirstEligible || runtimeData.freeBySubscription === true);
      const successOverlay = resolvePaymentWaitOverlay(appliedPayment.status, licenseMessage || undefined, {
        paymentMode: appliedPayment.paymentMode,
        featureKey: featureId,
        reason: input.reason,
        accessType,
        accessMethod,
        paymentMethod,
        licenseTier: licenseGate?.licenseTier,
        licenseReason: licenseGate?.reason,
      });
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: appliedPayment.status,
        message: successOverlay.message,
        cost: parsed.data.pricing?.cost,
        paymentMode: appliedPayment.paymentMode,
        reason: input.reason,
        accessType,
        accessMethod,
        paymentMethod,
        licenseTier: licenseGate?.licenseTier,
        licenseReason: licenseGate?.reason,
      });
    } else {
      const code = String(parsed.error?.code || "").toUpperCase();
      const status = parsed.status === 402 || code === "INSUFFICIENT_COINS" ? "readyToPay" : "error";
      if (shouldRedirectToLoginAfterBilling(parsed.status, code)) {
        // authFetch의 401 자동 갱신까지 실패한 진짜 미로그인/만료 세션 — 유료 화면 공통 계약대로
        // 세션을 정리하고 로그인 페이지로 유도한다. runBillingCoinGate를 직접 호출하는 화면 전반에 적용된다.
        // 정적 import는 auth-store↔billing-client 순환을 피하려 동적 import 사용(위 인증 예열부와 동일).
        try {
          const { handleSessionInvalidated } = await import("./auth-store");
          handleSessionInvalidated({ redirect: true });
        } catch {
          // 세션 무효화 실패는 삼킨다 — 아래 에러 반환 흐름으로 이어진다.
        }
      }
      if (shouldInvalidateSubscriptionSnapshot(parsed.status, code)) {
        clearSubscriptionSnapshotForUser();
        void fetchPaymentEligibility({
          categoryKey: input.categoryKey,
          subFeatureKey: input.subFeatureKey,
          featureKey: input.featureKey,
          reason: input.reason,
          productId: input.productId,
          serviceType: input.serviceType || input.productType,
          coinCost: input.cost,
          coinPrice: input.coinPrice,
          priceKRW: input.priceKRW,
          amountKRW: input.amountKRW ?? input.amountKrw ?? input.paymentAmount,
        }, { force: true }).catch(() => null);
      }
      if (!explicitPaymentMode && input.forceDeduct !== false && shouldOpenRuntimePaymentFallback(parsed.status, code)) {
        markPaymentRequestedOnce();
        emitPaidFeatureGate("update", {
          featureId,
          featureKey: featureId,
          requestId: gateRequestId,
          status: "readyToPay",
          message: billingClientText("billingClient.message.017"),
          cost: knownCoinCost,
          reason: input.reason,
        });
        const runtimePaymentResult = await runPaidServiceRuntimePayment(input, {
          featureId,
          requestId: gateRequestId,
          eligibility,
          runtimeGate: await loadRuntimeGateForPayment(),
        });
        if (runtimePaymentResult) {
          const parsedRuntimePaymentResult = await registerDeferredBillingUsage(input, runtimePaymentResult, {
            requestId: gateRequestId,
            featureId,
          });
          if (parsedRuntimePaymentResult.ok && parsedRuntimePaymentResult.data) {
            if (!hasVerifiedBillingAccess(parsedRuntimePaymentResult.data, input.featureKey || featureId)) {
              markPaidAttemptFailed("server_access_grant_missing");
              emitPaidFeatureGate("update", {
                featureId,
                featureKey: featureId,
                requestId: gateRequestId,
                status: "paymentFailed",
                message: billingClientText("billingClient.message.018"),
              });
              return {
                ...parsedRuntimePaymentResult,
                ok: false,
                status: parsedRuntimePaymentResult.status || 500,
                data: null,
                message: billingClientText("billingClient.message.019"),
                error: {
                  code: "SERVER_ACCESS_GRANT_MISSING",
                  message: billingClientText("billingClient.message.020"),
                },
              };
            }
            invalidateBillingBalanceCache();
            normalizeBillingBalanceFields(parsedRuntimePaymentResult.data as BillingCoinGateData & Record<string, unknown>);
            emitBillingBalanceUpdated(parsedRuntimePaymentResult.data as BillingCoinGateData & Record<string, unknown>, "coin-gate-runtime-fallback");
            markPaidAttemptPaymentSucceeded();
            markPaidAttemptCallbackReturned();
            const consume = asRecord(parsedRuntimePaymentResult.data.consume);
            const accessType = toText(consume?.accessType);
            const accessMethod = toText(consume?.accessMethod);
            const paymentMethod = toText(consume?.paymentMethod);
            const licenseGate = extractLicenseGateResult(parsedRuntimePaymentResult.data as BillingCoinGateData & Record<string, unknown>);
            const licenseMessage = buildLicensePassOverlayMessage(parsedRuntimePaymentResult.data as BillingCoinGateData & Record<string, unknown>);
            const runtimeData = parsedRuntimePaymentResult.data as BillingCoinGateData & Record<string, unknown>;
            const appliedPayment = resolveAppliedBillingPayment(runtimeData, requestedMode, runtimeData.freeBySubscription === true);
            const successOverlay = resolvePaymentWaitOverlay(appliedPayment.status, licenseMessage || undefined, {
              paymentMode: appliedPayment.paymentMode,
              featureKey: featureId,
              reason: input.reason,
              accessType,
              accessMethod,
              paymentMethod,
              licenseTier: licenseGate?.licenseTier,
              licenseReason: licenseGate?.reason,
            });
            emitPaidFeatureGate("update", {
              featureId,
              featureKey: featureId,
              requestId: gateRequestId,
              status: appliedPayment.status,
              message: successOverlay.message,
              cost: parsedRuntimePaymentResult.data.pricing?.cost,
              paymentMode: appliedPayment.paymentMode,
              reason: input.reason,
              accessType,
              accessMethod,
              paymentMethod,
              licenseTier: licenseGate?.licenseTier,
              licenseReason: licenseGate?.reason,
            });
          } else {
            const runtimeCode = String(parsedRuntimePaymentResult.error?.code || "").toUpperCase();
            markPaidAttemptFailed(parsedRuntimePaymentResult.error?.code || "payment_runtime_required");
            emitPaidFeatureGate("update", {
              featureId,
              featureKey: featureId,
              requestId: gateRequestId,
              status: runtimeCode === "PAYMENT_CANCELLED" ? "cancelled" : "paymentFailed",
              message: parsedRuntimePaymentResult.error?.message || parsedRuntimePaymentResult.message || "결제가 완료되지 않았습니다.",
              cost: knownCoinCost,
              reason: input.reason,
            });
          }
          return parsedRuntimePaymentResult;
        }
      }
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
  })()
    .then((result) => {
      if (shouldCacheBillingCoinGateResult(result)) {
        billingCoinGateRecent.set(inFlightKey, {
          requestId: gateRequestId,
          promise: requestPromise,
          expiresAt: Date.now() + BILLING_COIN_GATE_RECENT_TTL_MS,
        });
        globalThis.setTimeout(() => {
          const recent = billingCoinGateRecent.get(inFlightKey);
          if (recent?.promise === requestPromise) billingCoinGateRecent.delete(inFlightKey);
        }, BILLING_COIN_GATE_RECENT_TTL_MS + 100);
      } else {
        billingCoinGateRecent.delete(inFlightKey);
      }
      return result;
    })
    .catch((error) => {
      billingCoinGateRecent.delete(inFlightKey);
      throw error;
    })
    .finally(() => {
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
  paymentMode?: string;
  allowedPaymentModes?: string[];
  disablePassFirst?: boolean;
  disablePassChoice?: boolean;
  skipPassProbe?: boolean;
  payloadHash?: string;
  productId?: string;
  productType?: string;
  serviceType?: string;
  cost?: number;
  coinPrice?: number;
  membershipCreditCost?: number;
  reportId?: string;
  sessionId?: string;
  reportSessionId?: string;
  profileId?: string;
  selectedProfileId?: string;
}) {
  return runBillingCoinGate(input as Parameters<typeof runBillingCoinGate>[0]);
}

export async function fetchBillingBalance(options: { force?: boolean; emit?: boolean; fresh?: boolean } = {}): Promise<BillingResult<{
  authenticated: boolean;
  degraded?: boolean;
  balance: number;
  monthlyStoneBalance?: number;
  membershipCreditBalance?: number;
  monthlyCredits?: number;
  user: Record<string, unknown> | null;
  unlockedFeatures: string[];
  unlockMap: Record<string, boolean>;
}>> {
  const userKey = resolveBillingBalanceUserKey();
  if (options.force === true) invalidateBillingBalanceCache();
  const now = Date.now();
  const recent = billingBalanceRecentByUser.get(userKey);
  if (recent && recent.expiresAt > now) {
    if (options.emit !== false) emitBillingBalanceUpdated(recent.result.data as Record<string, unknown> | null, "balance-cache");
    return recent.result;
  }
  const pending = billingBalanceInFlightByUser.get(userKey);
  if (pending) return pending;

  const cacheVersion = billingBalanceCacheVersion;
  const inFlightPromise = (async () => {
    // fresh=1은 서버의 표시용 잔량 캐시를 우회한다(수동 "재조회"에서만 사용). 자동 조회는 캐시를 허용해 빠르게 응답.
    const balanceUrl = options.fresh === true ? "/api/billing/balance?fresh=1" : "/api/billing/balance";
    const response = await authFetchBilling(balanceUrl, { method: "GET" });
    const parsed = await parseBillingResponse<BillingBalanceData>(response);

    if (parsed.ok && parsed.data) {
      parsed.data.balance = toNumber(parsed.data.balance, 0);
      if (!Array.isArray(parsed.data.unlockedFeatures)) parsed.data.unlockedFeatures = [];
      if (!parsed.data.unlockMap || typeof parsed.data.unlockMap !== "object") {
        parsed.data.unlockMap = {};
      }
      normalizeBillingBalanceFields(parsed.data as BillingBalanceData & Record<string, unknown>);
      parsed.data.monthlyStoneBalance = toNumber(parsed.data.monthlyStoneBalance ?? parsed.data.membershipCreditBalance, 0);
      parsed.data.membershipCreditBalance = toNumber(parsed.data.membershipCreditBalance, 0);
      parsed.data.monthlyCredits = toNumber(parsed.data.monthlyCredits ?? parsed.data.membershipCreditBalance, 0);
      const cacheableBalance = parsed.data.authenticated !== false && parsed.data.degraded !== true;
      if (cacheableBalance && options.emit !== false) emitBillingBalanceUpdated(parsed.data as BillingBalanceData & Record<string, unknown>, "balance");
      if (cacheableBalance && cacheVersion === billingBalanceCacheVersion) {
        billingBalanceRecentByUser.set(userKey, {
          result: parsed,
          expiresAt: Date.now() + BILLING_BALANCE_RECENT_TTL_MS,
        });
      }
    }

    return parsed;
  })().finally(() => {
    if (cacheVersion === billingBalanceCacheVersion) billingBalanceInFlightByUser.delete(userKey);
  });

  billingBalanceInFlightByUser.set(userKey, inFlightPromise);
  return inFlightPromise;
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
