import { authFetch } from "@/app/_lib/auth-client";
import { lockBodyScroll, unlockBodyScroll } from "@/app/_lib/body-scroll-lock";
import { normalizeBaseUrl } from "@/app/_lib/api-config";
import { isAuthUserCacheVerified, readSanitizedAuthUser, resolveAuthScopeFromUser } from "@/app/_lib/auth-storage";
import { assignMonthlyStoneBalance, resolveMonthlyStoneBalance } from "@/app/_lib/monthly-stone";
import { recordUnlocksFromPaymentPayload } from "@/app/_lib/optimistic-unlock-ledger";
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
// 🔴 결제창 금액의 정본 해석기. 호출부가 가격을 넘기지 않아도 서버와 같은 함수로 값을 풀어
// "0원 결제창"이 구조적으로 불가능하게 만든다. 사본을 만들지 말 것.
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";
// 앱 가격표 정본. import가 없는 순수 테이블이라 클라이언트 번들에 안전하게 들어간다
// (미러를 두면 Play Console 등록가와 조용히 어긋나므로 정본을 직접 읽는다).
import { resolveAppPassCoverageKRW } from "@/worker/lib/app-store-pricing.js";
// 🔴 이용권 스냅샷·판정 정본. 정적 셸(index.html)과 독립 정적(js/destiny-profile.js)도 같은 파일을
// classic script 로 읽는다 — 여기에 사본을 만들면 세 런타임의 판정이 갈린다.
import passVerdict from "@/js/core/pass-verdict.js";
import appContext from "@/js/core/app-context.js";
import checkoutEntry from "@/js/core/checkout-entry.js";
import bundledPaymentService from "@/js/core/payment-service.js";

// 🔴 payment-service.js 는 classic script(window.CodeDestinyPaymentService)와 webpack import 두 경로로
// 로드돼 **인스턴스가 둘**이다. 각 인스턴스는 자기만의 paymentWindowRenderer / commandInFlight 클로저를
// 갖기 때문에, 번들 인스턴스에 렌더러를 등록하고 셸·독립 정적이 전역 인스턴스를 읽으면 서로를 못 본다
// (= 시도마다 다른 결제창이 뜨는 원인). 전역이 있으면 그쪽을 정본으로 쓰고, 없을 때만 번들을 쓴다.
// pass-verdict / checkout-entry 가 쓰는 legacy-core-runtime 프록시와 같은 취지지만, 그쪽은 런타임이
// 아직 없으면 throw 한다 — 결제 임계경로에서는 폴백이 있어야 하므로 여기서는 폴백을 둔다.
function resolvePaymentService(): typeof bundledPaymentService {
  if (typeof window === "undefined") return bundledPaymentService;
  const shared = (window as unknown as { CodeDestinyPaymentService?: typeof bundledPaymentService }).CodeDestinyPaymentService;
  return shared && typeof shared.registerPaymentWindow === "function" ? shared : bundledPaymentService;
}

const BILLING_CLIENT_TEXT_TRANSLATIONS = {
  ko: {
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
    "billingClient.message.022": "단건 결제를 준비하는 중입니다.",
  },
} as const;

// 🔴 결제창에 **보이는** 문구는 더 이상 여기 없다 — 세 렌더러가 공유하는 사전 키(checkoutEntry.text)로
// 옮겼다. 이 표에 남은 것은 상태·오류 토스트(message.* / error.*)뿐이고, 그쪽은 아직 ko 전용이라
// 비한국어 사용자에게 한국어가 그대로 나간다(별도 배치에서 키로 옮긴다).
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
  retryAfterMs?: number;
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

export type BillingFeatureCatalog = {
  categories?: Array<{
    categoryKey?: string;
    subFeatures?: Array<BillingFeaturePricing>;
  }>;
  legacyFeatureTable?: Array<BillingFeaturePricing>;
};

const BILLING_FEATURE_CATALOG_TTL_MS = 60_000;
let billingFeatureCatalogCache: { data: BillingFeatureCatalog; expiresAt: number } | null = null;
let billingFeatureCatalogInFlight: Promise<BillingResult<BillingFeatureCatalog>> | null = null;

function catalogEntries(catalog: BillingFeatureCatalog | null | undefined): BillingFeaturePricing[] {
  if (!catalog) return [];
  const categories = Array.isArray(catalog.categories) ? catalog.categories : [];
  const categoryEntries = categories.flatMap((category) => Array.isArray(category.subFeatures) ? category.subFeatures : []);
  const legacyEntries = Array.isArray(catalog.legacyFeatureTable) ? catalog.legacyFeatureTable : [];
  return [...categoryEntries, ...legacyEntries].filter((entry) => Boolean(entry && String(entry.featureKey || "").trim()));
}

export function findBillingFeaturePricing(
  catalog: BillingFeatureCatalog | null | undefined,
  input: { featureKey?: string; subFeatureKey?: string; categoryKey?: string },
): BillingFeaturePricing | null {
  const featureKey = String(input.featureKey || "").trim();
  const subFeatureKey = String(input.subFeatureKey || "").trim();
  const categoryKey = String(input.categoryKey || "").trim();
  return catalogEntries(catalog).find((entry) => (
    (featureKey && String(entry.featureKey || "").trim() === featureKey)
    || (!featureKey && subFeatureKey && String(entry.subFeatureKey || "").trim() === subFeatureKey
      && (!categoryKey || String(entry.categoryKey || "").trim() === categoryKey))
  )) || null;
}

export async function fetchBillingFeatureCatalog(options: { force?: boolean } = {}): Promise<BillingResult<BillingFeatureCatalog>> {
  const now = Date.now();
  if (!options.force && billingFeatureCatalogCache && billingFeatureCatalogCache.expiresAt > now) {
    return { ok: true, status: 200, data: billingFeatureCatalogCache.data, message: "cached", error: null, raw: {} };
  }
  if (billingFeatureCatalogInFlight) return billingFeatureCatalogInFlight;

  billingFeatureCatalogInFlight = (async () => {
    const response = await authFetchBilling("/api/billing/features", { method: "GET" });
    const parsed = await parseBillingResponse<BillingFeatureCatalog>(response);
    if (parsed.ok && parsed.data) {
      billingFeatureCatalogCache = { data: parsed.data, expiresAt: Date.now() + BILLING_FEATURE_CATALOG_TTL_MS };
    }
    return parsed;
  })().finally(() => {
    billingFeatureCatalogInFlight = null;
  });
  return billingFeatureCatalogInFlight;
}

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
  // TTL 을 넘긴 'none' 을 stale-while-revalidate 로 읽었을 때만 true. 낙관 통과(무료 제공)에는 절대
  // 쓰지 않고 '미보유 확정 → 결제창 직행' 방향으로만 쓴다(readSubscriptionSnapshotForUser 주석 참고).
  stale?: boolean;
  /** 월 이용 한도 잔여(coin). null/undefined 면 "모름" — 판정은 pass-verdict 가 월 검사를 건너뛴다. */
  monthlySpendRemainingCoin?: number | null;
  monthlyCheckedAt?: number | null;
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
type RuntimeMembershipPassApplyResult = {
  status?: string;
  code?: string;
  message?: string;
  requestId?: string;
  payload?: Record<string, unknown>;
  raw?: Record<string, unknown>;
};
type RuntimeMembershipPassApply = (options: Record<string, unknown>) => Promise<RuntimeMembershipPassApplyResult> | RuntimeMembershipPassApplyResult;
type PaymentChoiceMode = "direct" | "monthly" | "pass" | "pass-store" | "refresh" | "cancel";
type PaymentChoiceFunction = ((options: Record<string, unknown>) => Promise<PaymentChoiceMode> | PaymentChoiceMode) & {
  __cdSupportsPassChoice?: boolean;
  __cdReactFallback?: boolean;
};

type RuntimeApiWindow = Window & {
  CodeDestinyAccessStore?: {
    getAccessDecision?: (options?: Record<string, unknown>) => Promise<{
      ok: boolean;
      status?: number;
      payload?: Record<string, unknown> | null;
      code?: string;
      aborted?: boolean;
    }>;
    invalidateAccessDecision?: () => void;
    // localStorage 로 지속되는 영구 해금 스냅샷의 동기 판정(js/core/access-store.js isUnlocked).
    isUnlocked?: (featureKey: string) => boolean;
  };
  CODE_DESTINY_API_BASE_URL?: string;
  __CODE_DESTINY_RUNTIME_TARGET?: string;
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
  // 앱 결제 가드(scripts/app-payment-guard.js). 앱 빌드에서만 주입되며, 정본 게이트의
  // 단건 결제 leaf를 Play Billing으로 바꿔친다.
  __cdAppPaymentGuard?: { installed?: boolean };
  _cdSetCoinGateOverlay?: (show: boolean, message?: string, mode?: string) => void;
  // 셸이 세우는 공용 판정의 정본. 대기 오버레이를 띄우면 안 되는 구간이면 true
  // (미커버 확정→결제창 노출 / 결제창이 떠 있는 동안 / 단건 확정→PG창).
  __cdPaymentWaitUiBlocked?: (mode?: string) => boolean;
  _cdChooseServicePaymentMode?: PaymentChoiceFunction;
  _cdRunDirectKrwCheckout?: PaidServiceRuntimeGate;
  _cdOpenPaidServiceGate?: PaidServiceRuntimeGate;
  // destiny-profile.js 가 노출하는 PortOne SDK 예열 트리거(구현은 그 파일 하나 — window.__cdPreloadPortOneV2Sdk).
  __cdPreloadPortOneV2Sdk?: () => void;
  __cdApplyMembershipPassBeforePayment?: RuntimeMembershipPassApply;
  __cdSuppressPaymentFetchOverlayCount?: number;
  __cdChooseServicePaymentModeCanonical?: PaymentChoiceFunction;
  __cdOpenChargeModal?: () => void;
  // js/core/auth-hint.js 가 노출하는 로그인 힌트 판정 단일 정본.
  __cdAuthHint?: { hasAuthHint?: () => boolean };
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

export type BillingCoinGateInput = {
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
  actionType?: string;
  profileAction?: string;
  action?: string;
  profileCardId?: string;
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
export const PAID_SERVICE_RUNTIME_SRC = "/js/destiny-profile.js?v=build-3657303b54e1";
// 🔴 이용권 스냅샷의 상수·읽기·쓰기·판정은 전부 js/core/pass-verdict.js 가 소유한다.
// 셸(index.html)·독립 정적(js/destiny-profile.js)과 **같은 localStorage 키**를 공유하므로 값이 갈리면
// 같은 사용자가 어느 런타임에서 클릭했느냐에 따라 판정이 달라지고, 한쪽이 만료로 보고 지운 캐시가
// 다른 쪽에서도 사라진다(실제로 active TTL 이 5분/15분으로 갈라져 있었다). 여기에 사본을 두지 말 것.

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
let reactPaymentChoiceInFlight: { promise: Promise<PaymentChoiceMode>; startedAt: number; settled: boolean } | null = null;

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
  if (typeof window !== "undefined") {
    (window as RuntimeApiWindow).CodeDestinyAccessStore?.invalidateAccessDecision?.();
  }
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

function subscriptionSnapshotPassLimit(tier: SubscriptionSnapshotTier): number {
  return passVerdict.passLimitForTier(tier);
}

function resolveSubscriptionSnapshotUserId(userId?: string): string {
  const explicit = toText(userId).toLowerCase();
  if (explicit) return explicit;
  if (typeof window === "undefined") return "";
  return resolveAuthScopeFromUser(readSanitizedAuthUser());
}

export function clearSubscriptionSnapshotForUser(userId?: string) {
  passVerdict.removeSnapshot(resolveSubscriptionSnapshotUserId(userId));
}

// allowStaleNone: TTL 을 넘긴 'none' 도 { stale:true } 로 돌려받는다(삭제하지 않음). 호출부는 이것을
// **미보유 확정** 판정에만 쓰고, 동시에 백그라운드 갱신을 예약해야 한다.
// 'active' 는 TTL 을 넘겨도 **이용권 만료일이 남아 있으면** { stale:true } 로 유지된다 — 판정 자체가
// canUseByPass(등급, 만료일, 가격) 순수 함수라 만료 전까지는 다시 물을 이유가 없다. 만료된 이용권
// (expiresAt <= now)과 만료일을 모르는 낡은 스냅샷은 어느 경우에도 폐기된다.
export function readSubscriptionSnapshotForUser(
  userId?: string,
  options?: { allowStaleNone?: boolean },
): SubscriptionSnapshot | null {
  const resolvedUserId = resolveSubscriptionSnapshotUserId(userId);
  if (typeof window === "undefined" || !resolvedUserId) return null;
  const stored = passVerdict.readSnapshot(resolvedUserId, options) as SubscriptionSnapshot | null;
  if (stored) return stored;

  // /api/auth/me 또는 로그인 성공으로 최근 검증된 캐시만 이용권 스냅샷으로 승격한다.
  // 등급 판정은 pass-verdict 한 곳에서 수행해 standard/premium/vvip/family가 같은 규칙을 쓴다.
  const authUser = readSanitizedAuthUser();
  if (!authUser || !isAuthUserCacheVerified(authUser)) return null;
  if (resolveAuthScopeFromUser(authUser) !== resolvedUserId || !authUser.profileSubscription) return null;
  return passVerdict.storeStatus(
    resolvedUserId,
    authUser.profileSubscription,
    "verified-auth-cache",
  ) as SubscriptionSnapshot | null;
}

export function saveSubscriptionSnapshotForUser(userId: string | undefined, value: unknown, source = "client"): SubscriptionSnapshot | null {
  const resolvedUserId = resolveSubscriptionSnapshotUserId(userId);
  if (typeof window === "undefined" || !resolvedUserId) return null;
  return passVerdict.storeStatus(resolvedUserId, value, source) as SubscriptionSnapshot | null;
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
  // 🔴 판정은 pass-verdict 하나가 한다 — 여기서 한도를 따로 계산하면 월 이용 한도를 모르는 네 번째 사본이
  // 되어, 소진된 사용자에게 phase:'pass' 경로가 계속 무료를 약속한다.
  const canUseByPass = coinCost > 0 && passVerdict.resolveVerdict(snapshot, coinCost).coversNow;
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

// 🔴 `"ko-KR"` + `원` 을 굳혀 두면 영어 사용자에게도 "10,000원" 이 나간다. 자릿수 로케일과
// 통화 문구를 정적 셸 formatWon 과 같은 정본(js/core/checkout-entry.js)에서 가져온다.
export function formatPaymentWon(amount: number): string {
  return checkoutEntry.formatKrwAmount(amount, "{amount}원");
}

function formatCoinValueWon(amount: number): string {
  return formatPaymentWon(Math.max(0, Math.floor(Number(amount || 0))) * 100);
}

/**
 * 이용권 적용 가격 범위 안내.
 *
 * 한도는 코인으로 관리되고(canUseByPass), 원화는 표시용이다. 앱에서는 같은 기능이 더
 * 비싸므로 웹가(코인×100)를 그대로 보여주면 결제창 금액과 어긋난다 — 앱 확정가로 바꾼다.
 *
 * 🔴 "횟수 제한 없이"·"무제한"을 쓰지 않는다(2026-08-24). 모든 등급에 월 이용 한도가 있어
 *    그 표현이 실제 정책과 모순된다 — 한도를 다 쓴 사용자가 "횟수 제한이 없다더니"를 겪는다.
 *    family 도 예외가 아니다(건당 상한만 없고 월 50만원 한도는 동일하게 적용된다).
 */
function formatMembershipPassLimitLabel(tier: unknown, limit: number): string {
  const normalizedTier = toText(tier).toLowerCase();
  if (normalizedTier === "family" || limit >= 999999999) return "이용권 대상 기능 전체가 월 이용 한도 안에서 열립니다.";
  if (limit > 0) {
    const appCoverageKRW = isMobileAppRuntime() ? resolveAppPassCoverageKRW(limit) : null;
    const coverageLabel = appCoverageKRW ? formatPaymentWon(appCoverageKRW) : formatCoinValueWon(limit);
    return `${coverageLabel} 이하 기능이 월 이용 한도 안에서 바로 열립니다.`;
  }
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

// 🔴 이용권 상점 진입은 셸·독립 정적과 **같은 모듈**을 쓴다(js/core/checkout-entry.js).
// 특히 앱 분기가 중요하다 — 앱 번들에는 /points 가 없고 app-payment-guard 는 앵커 클릭만
// 가로채므로, 프로그래매틱 이동은 그대로 빈 화면이 된다.
function openMembershipPassStore(coinPrice: number, currentTier?: string, featureKey?: string) {
  if (typeof window === "undefined") return;
  const runtimeWindow = window as RuntimeApiWindow;
  runtimeWindow._cdSetCoinGateOverlay?.(false);
  checkoutEntry.trackCheckoutEvent("pass_store_entered", { option: "pass", renderer: "react", featureKey, coinPrice });
  if (checkoutEntry.shouldUseAppStoreEntry() && typeof runtimeWindow.__cdOpenChargeModal === "function") {
    runtimeWindow.__cdOpenChargeModal();
    return;
  }
  const storeUrl = checkoutEntry.buildPassStoreUrl({ costCoins: coinPrice, currentTier, source: "react-payment-pass-store" });
  if (storeUrl) {
    checkoutEntry.rememberCheckoutReturn({
      url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      featureKey,
    });
    window.location.assign(storeUrl);
    return;
  }
  if (typeof runtimeWindow.__cdOpenChargeModal === "function") {
    runtimeWindow.__cdOpenChargeModal();
    return;
  }
  window.location.assign("/points?source=react-payment-pass-store");
}

// 🔴 예전에는 "[data-cd-react-payment-choice] 노드가 DOM 에 있는가"로 인플라이트를 판단했다.
// 그 판정은 양방향으로 틀렸다 — ① close("direct") 가 노드를 최대 6초 남기므로 그 사이 재클릭이
// **이미 끝난 옛 프로미스**를 그대로 돌려받았고 ② 라우트 전환 등으로 노드만 사라지면 아직 pending 인
// 프로미스를 버려 영영 resolve 되지 않았다. 이제 프로미스의 settle 여부만 본다.
function paymentChoiceSettled(state: { settled: boolean } | null) {
  return !state || state.settled;
}

function ensureReactPaymentChoiceStyles() {
  // 정본은 js/core/checkout-entry.js의 PAYMENT_CHOICE_CSS_RULES — 규칙 텍스트가 동일해야 하고
  // verify:payment-choice-parity가 세 구현(셸/React/독립 폴백)이 모두 이 배열을 참조하는지 강제한다.
  if (typeof document === "undefined" || document.getElementById("cdDirectPaymentStyles")) return;
  const style = document.createElement("style");
  style.id = "cdDirectPaymentStyles";
  style.textContent = checkoutEntry.PAYMENT_CHOICE_CSS_RULES.join("\n");
  document.head.appendChild(style);
}

async function openReactPaymentChoiceModal(options: Record<string, unknown>): Promise<PaymentChoiceMode> {
  const now = Date.now();
  if (reactPaymentChoiceInFlight
    && now - reactPaymentChoiceInFlight.startedAt < PAYMENT_CHOICE_IN_FLIGHT_TTL_MS
    && !paymentChoiceSettled(reactPaymentChoiceInFlight)) {
    return reactPaymentChoiceInFlight.promise;
  }
  reactPaymentChoiceInFlight = null;

  const promise = openReactPaymentChoiceModalInner(options || {});
  const state = { promise, startedAt: now, settled: false };
  reactPaymentChoiceInFlight = state;
  return promise.finally(() => {
    state.settled = true;
    if (reactPaymentChoiceInFlight === state) reactPaymentChoiceInFlight = null;
  });
}

async function openReactPaymentChoiceModalInner(options: Record<string, unknown>): Promise<PaymentChoiceMode> {
  if (typeof window === "undefined" || typeof document === "undefined" || !document.body) {
    return Promise.resolve("cancel");
  }

  ensureReactPaymentChoiceStyles();
  // 🔴 예전에는 React 자기 노드만 지웠다. 셸(.cd-direct-payment-modal)·독립 정적(#cdStandalonePaymentChoice)
  // 이 남긴 고아 결제창은 그대로 깔려 있어 "실패 후 다시 누르니 다른 결제창"으로 보였다.
  // 세 렌더러 공통 스윕은 checkout-entry 하나가 소유한다.
  checkoutEntry.sweepOrphanChoiceModals(null);

  // 🔴 정적 셸의 _cdOpenPaidServiceGate 는 자체 선택창을 열기 직전에 PortOne SDK 를 예열해, 사용자가
  // 카드를 읽는 동안 CDN 다운로드가 끝나 있게 한다. React 는 그 오케스트레이터를 타지 않고 이 모달을
  // 직접 열므로, 같은 타이밍에 같은 예열을 걸어야 단건결제를 눌렀을 때 SDK 콜드 스타트가 없다.
  // destiny-profile.js 가 아직 로드 전이면 함수가 없을 뿐이라 안전하게 no-op.
  try {
    const runtimeWindow = window as RuntimeApiWindow;
    if (typeof runtimeWindow.__cdPreloadPortOneV2Sdk === "function") runtimeWindow.__cdPreloadPortOneV2Sdk();
  } catch {}

  const opts = options || {};
  // 호출부가 제목을 주지 않았을 때의 기본값. 셸·독립 폴백과 같은 키를 쓴다.
  const defaultTitle = checkoutEntry.text("payment.directModal.defaultTitle", "유료 서비스");
  const title = toText(opts.title || opts.reason || defaultTitle) || defaultTitle;
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
  // equalPriorityMethods는 '동등 노출' 신호 — 목록에 있으면 노출을 보장만 하고, 없다고 제거하지 않는다.
  // (과거: DIRECT_KRW가 목록에 없으면 단건 버튼을 없애 단건/월정석 중 하나만 뜨는 정책 위반. 아래 monthly와
  //  대칭으로, 실제 노출 제한은 allowedPaymentModes만 담당한다.)
  let canShowDirect = (!allowedPaymentModes || allowedPaymentModes.includes("direct") || allowedPaymentModes.includes("direct_krw") || allowedPaymentModes.includes("card"));
  const canShowPassStore = opts.disablePassChoice !== true && (!allowedPaymentModes || allowedPaymentModes.includes("pass") || allowedPaymentModes.includes("membership_pass"));
  const musicTrackSub = checkoutEntry.text("payment.directModal.musicTrackSub", "달빛 이용권이 있으면 전곡을 바로 들을 수 있어요. MP3 다운로드는 단건 결제 또는 월정석으로 구매한 곡만 가능합니다.");
  const monthlyCost = Math.max(0, Math.floor(toNumber(opts.membershipCreditCost, coinPrice * 10)));
  const callerMonthlyBalanceRaw = opts.monthlyBalance ?? opts.monthlyCredits ?? opts.membershipCreditBalance;
  const hasCallerMonthlyBalance = typeof callerMonthlyBalanceRaw === "number" && Number.isFinite(callerMonthlyBalanceRaw) && callerMonthlyBalanceRaw >= 0;
  // 회당결제(per-use)는 eligibility 서버 왕복을 건너뛰므로(runBillingCoinGate의 mayBeAlreadyUnlocked 분기)
  // 호출부가 잔량을 아예 넘기지 못한다 — 그래서 결제창이 항상 '확인 필요'로 열리고, 아래 자동 재조회 1회가
  // 유일한 근거였다. 셸에는 로컬 잔량 캐시(_cdGetMonthlyCreditBalance)가 있는데 여기엔 없었다.
  // 이미 있는 로컬 구독 스냅샷을 읽어 같은 자리를 메운다(새 캐시 계층·새 요청 없음).
  const snapshotMonthlyBalance = hasCallerMonthlyBalance ? 0 : readSubscriptionSnapshotMonthlyBalance();
  const providedMonthlyBalanceRaw = hasCallerMonthlyBalance
    ? callerMonthlyBalanceRaw
    : (snapshotMonthlyBalance > 0 ? snapshotMonthlyBalance : undefined);
  const hasProvidedMonthlyBalance = typeof providedMonthlyBalanceRaw === "number" && Number.isFinite(providedMonthlyBalanceRaw) && providedMonthlyBalanceRaw >= 0;
  const monthlyBalance = Math.max(0, Math.floor(toNumber(providedMonthlyBalanceRaw, 0)));
  // 스냅샷 잔량이 제공되지 않았으면(=조회 실패/미확정) '잔량 부족'이 아니라 '확인 필요'로 취급한다.
  // 초기 오인을 막고, 모달이 열릴 때 자동 1회 재조회로 실제 잔량을 채운다.
  // 미확정을 '부족'과 같이 비활성으로 묶으면 재조회가 계속 실패할 때 월정석이 영구 회색이 돼 결제 자체가
  // 불가능해지므로, 미확정이면 시도를 허용한다(정적 결제창 canUseMonthly와 동일 계약). 최종 판정은 서버가
  // 하고, 부족하면 lot 정본 잔량을 실은 402가 와서 1왕복에 수렴한다.
  const monthlyCanUse = monthlyCost > 0 && (!hasProvidedMonthlyBalance || monthlyBalance >= monthlyCost);
  // 월정석은 정적 결제창과 동일하게 잔량과 무관히 항상 노출하고, 부족하면 숨기지 않고 비활성(회색)으로 둔다.
  // equalPriorityMethods 목록에 없다고 버튼을 제거하지 않는다(서버가 잔량 부족 시 목록에서 빼도 회색으로 노출).
  const canShowMonthly = !allowedPaymentModes || allowedPaymentModes.includes("monthly") || allowedPaymentModes.includes("moonlight_stone") || allowedPaymentModes.includes("membership_credit");
  const monthlyDisabled = !monthlyCanUse;
  // 서버가 DIRECT_KRW를 동등 노출로 지정하면 단건 버튼 노출을 보장한다(제거는 하지 않음 — monthly와 대칭).
  if (hasEqualPriorityMethods && equalPriorityMethods.includes("DIRECT_KRW")) canShowDirect = true;
  if (!canShowDirect && !canShowMonthly) canShowDirect = true;
  const monthlyAfterBalance = Math.max(0, monthlyBalance - monthlyCost);
  const passTier = toText(membershipCoverage?.tier || membershipCoverage?.passTier || "");
  const passLimit = Math.max(0, Math.floor(toNumber(membershipCoverage?.passLimit ?? membershipCoverage?.freeLimit, 0)));
  // 이용권 카드가 그 자리에서 서버 검사를 돌릴 때 쓰는 식별자. 계측 payload 에도 같은 값을 쓴다.
  const passCheckFeatureKey = toText(opts.featureKey || opts.subFeatureKey || opts.categoryKey || opts.reason);
  // 이용권이 없는 사용자에게는 달빛 이용권 상점을 결제 선택지 맨 위에 우선 노출하고
  // "추천" 배지/하이라이트로 위계를 준다(단건결제/월정석/게이팅은 그대로 유지).
  const hasActivePassTier = Boolean(passTier && passTier !== "free");
  // 무료/미보유 등급을 "FREE 이용권"으로 오표기하지 않는다(무료 이용권이라는 재화는 없음).
  // 활성 유료 등급일 때만 등급명을 배지로 노출하고, 그 외에는 중립적인 상점 라벨을 쓴다.
  // 🔴 결제창 문구는 셸·독립 정적과 **같은 i18n 키**를 쓴다(js/core/checkout-entry.js 의 text()).
  // 한국어 인자는 ko 정본 폴백이며 public/i18n/*.json 12개와 함께 유지된다.
  const passBadgeLabel = checkoutEntry.text("payment.directModal.passBadge", "달빛 이용권");
  const passLabel = hasActivePassTier ? `${passTier.toUpperCase()} ${passBadgeLabel}` : passBadgeLabel;
  const passStoreTitle = hasActivePassTier
    ? checkoutEntry.text("payment.directModal.passUpgradeTitle", "이용권 등급 올리기")
    : checkoutEntry.text("payment.directModal.passBuyTitle", "이용권으로 열기");
  const passStoreHint = hasActivePassTier
    ? checkoutEntry.text("payment.directModal.passHint.upgrade", "지금 등급으로는 이 콘텐츠가 열리지 않아요. 더 넓은 등급을 확인해 보세요.")
    : checkoutEntry.text("payment.directModal.passHint.store", "한 번 결제하고 30일 동안 여러 콘텐츠를 열 수 있어요. 이미 있다면 눌러서 바로 확인돼요.");
  // 한도 라벨은 등급을 실제로 아는 경우에만 덧붙인다. 미보유(=한도 미상)일 때 붙이면
  // "…바로 확인됩니다. 플랜별 기준 확인" 처럼 의미 없는 꼬리가 남는다.
  const passLimitHint = hasActivePassTier ? formatMembershipPassLimitLabel(passTier, passLimit) : "";
  // 활성 스냅샷이 월 잔여를 알면 "이번 달 남은 한도"를 덧붙인다(coin-gate 응답이 되쓴 값). 모르면 붙이지 않는다.
  const passMonthlySnapshot = hasActivePassTier ? readSubscriptionSnapshotForUser() : null;
  const passMonthlyRemaining = passMonthlySnapshot && passMonthlySnapshot.state === "active"
    ? Number(passMonthlySnapshot.monthlySpendRemainingCoin)
    : Number.NaN;
  const passMonthlyLimit = passMonthlySnapshot ? passVerdict.monthlyLimitForTier(passMonthlySnapshot.tier) : 0;
  const passMonthlyHint = Number.isFinite(passMonthlyRemaining) && passMonthlyLimit > 0
    ? checkoutEntry.text("payment.directModal.passMonthlyRemaining", "이용권 남은 한도 {remaining} / {limit}", {
      remaining: formatCoinValueWon(Math.max(0, Math.floor(passMonthlyRemaining))),
      limit: formatCoinValueWon(passMonthlyLimit),
    })
    : "";
  const passHint = [passLimitHint, passMonthlyHint].filter(Boolean).join(" · ");

  // 🔴 소비자에게 PG사 이름(PortOne·KG이니시스)을 보여주지 않는다 — 구매 결정에 도움이 안 되는 내부 인프라다.
  // 앱(Play Billing)만 'Google Play 결제'를 유지한다: 외부 PG 안내는 사실과도 다르고 Play 정책에도 걸린다.
  const directUsesAppStore = checkoutEntry.shouldUseAppStoreEntry();
  const directBadgeLabel = directUsesAppStore
    ? checkoutEntry.text("payment.directModal.pgBadgeApp", "Google Play 결제")
    : checkoutEntry.text("payment.directModal.pgBadge", "카드 · 간편결제");
  const directHintLabel = directUsesAppStore
    ? checkoutEntry.text("payment.directModal.directHintApp", "지금 보고 있는 콘텐츠 하나만. Google Play 결제로 바로 열려요.")
    : checkoutEntry.text("payment.directModal.directHint", "지금 보고 있는 콘텐츠 하나만 바로 열려요.");
  const directTitleLabel = checkoutEntry.text("payment.directModal.directTitleLabel", "이번 콘텐츠만");
  const monthlyBadgeLabel = checkoutEntry.text("payment.directModal.monthlyBadge", "월정석");
  const monthlyTitleLabel = checkoutEntry.text("payment.directModal.monthlyTitle", "월정석으로 열기");
  const monthlyUnitLabel = checkoutEntry.text("payment.directModal.monthlyUnit", "이벤트 재화");
  // 어느 카드를 추천으로 올릴지는 셸·독립 정적과 공유하는 순수 함수 하나가 정한다. 서버를 부르지 않는다.
  const checkoutRecommendation = checkoutEntry.resolveCheckoutRecommendation({
    allowPass: canShowPassStore,
    allowDirect: canShowDirect,
    allowMonthly: canShowMonthly,
    hasActivePassTier,
    monthlyBalanceFresh: hasProvidedMonthlyBalance,
    monthlyBalance,
    requiredMonthlyCredits: monthlyCost,
  });
  const recommendedOption = checkoutRecommendation.recommended;
  const recommendBadgeLabel = checkoutEntry.text("payment.directModal.recommendBadge", "꽃돼지 추천");
  // 꽃돼지 연이가 지금 상황에서 가장 나은 방법을 한 줄로 말해 준다.
  // 음원은 이용권/다운로드 조건이 따로라 기존 전용 안내문을 그대로 쓴다.
  const guideBubbleText = isMusicTrackPayment
    ? musicTrackSub
    : (recommendedOption === "monthly"
      ? checkoutEntry.text("payment.directModal.guide.monthly", "가지고 있는 월정석으로 추가 지출 없이 열 수 있어요!")
      : recommendedOption === "pass"
        ? checkoutEntry.text("payment.directModal.guide.pass", "이용권이 있다면 결제 없이 바로 열려요. 먼저 확인해 볼까요?")
        : checkoutEntry.text("payment.directModal.guide.direct", "이번 콘텐츠 하나만 바로 열어볼 수 있어요."));
  // 추천 카드 하나만 크게, 나머지 둘은 컴팩트 행. 🔴 숨기거나 접지 않는다 — 세 옵션은 항상 함께 보인다.
  const optionRecommendAria = (option: string) => (option === recommendedOption ? ` (${recommendBadgeLabel})` : "");
  const goLabel = checkoutEntry.text("payment.directModal.goLabel", "이 방법으로 열기");
  // 🔴 3렌더러(셸 index.html · 이 파일 · js/destiny-profile.js)가 같은 문구를 써야 한다.
  // 예전에는 이 카드만 "사용 후 N이 남습니다" 예측 문장을 더 달고 있어 셸과 눈에 띄게 달랐다.
  const monthlyDescInitial = monthlyCanUse
    ? `${checkoutEntry.text("payment.directModal.monthlyHint.use", "이미 가지고 있는 월정석으로 열어요. 추가 지출이 없어요.")} ${checkoutEntry.text("payment.directModal.monthlyHint.after", "사용 후 {balance}이 남습니다.", { balance: monthlyAfterBalance.toLocaleString(checkoutEntry.displayLocale()) })}`
    : (hasProvidedMonthlyBalance
      ? checkoutEntry.text("payment.directModal.monthlyHint.insufficient", "월정석이 모자라요. 이번 콘텐츠만 구매로 열 수 있어요.")
      : checkoutEntry.text("payment.directModal.monthlyHint.checking", "월정석 잔량은 선택하면 바로 확인돼요. 그대로 눌러 봐도 괜찮아요."));
  // 🔴 ariaLabel 은 buildPaymentChoiceCardsHtml 이 한 번에 escape 하므로 여기서는 원문 그대로 넘긴다
  // (이중 escape 방지 — escape(escape(x)) 는 & 같은 문자를 재이스케이프해 화면에 &amp; 로 노출한다).
  const monthlyAriaSuffix = monthlyDisabled
    ? ` (${hasProvidedMonthlyBalance
        ? checkoutEntry.text("payment.directModal.monthlyAria.insufficient", "잔량 부족")
        : checkoutEntry.text("payment.directModal.monthlyAria.unknown", "잔량 확인 필요")})`
    : "";
  // 🔴 온디맨드 잔량 확인(2026-08-13). 결제창은 **열릴 때 잔량을 조회하지 않는다** — 그 자동 왕복 금지는
  // 2026-08-12 그대로다. 사용자가 눌러야만 조회하고, 실패해도 월정석 카드의 disabled 는 건드리지 않는다.
  // data-mode 를 주지 않는다 — [data-mode] 일괄 리스너가 "고르면 모달을 닫는" 동작이라 붙이면 창이 닫힌다.
  // <button> 중첩도 금지라 카드 안이 아니라 카드 아래 형제로 놓는다(그리드가 1열이라 바로 밑에 온다).
  const monthlyBalanceCheckHtml = canShowMonthly ? `
          <button type="button" class="cd-direct-payment-balance-check" data-monthly-balance-check>${escapePaymentText(checkoutEntry.text("payment.directModal.monthlyBalance.checkButton", "보유 월정석 확인"))}</button>
          <span class="cd-direct-payment-balance-value" data-monthly-balance-text role="status" aria-live="polite" hidden></span>` : "";
  // 카드 뼈대(배지·추천 리본·go 스트립·variant 클래스) 조립은 세 렌더러 공유 함수 하나가 맡는다
  // (js/core/checkout-entry.js buildPaymentChoiceCardsHtml). React 만 갖는 aria-label·잔량 예측 문구는
  // 여기서 계산해 spec 으로 넘긴다 — 렌더러별 실제 정보량 차이라 억지로 지우지 않는다.
  // 🔴 해외카드 고지. 문구·환산 규격은 세 렌더러 공유 코어 하나가 소유한다
  // (js/core/checkout-entry.js buildOverseasChargeNoticeHtml) — 사본을 만들면 한 렌더러만 낡는다.
  const overseasNoticeHtml = checkoutEntry.buildOverseasChargeNoticeHtml({
    amountKrw: directAmount,
    escape: escapePaymentText,
  });
  const paymentChoiceButtonsHtml = checkoutEntry.buildPaymentChoiceCardsHtml({
    order: checkoutRecommendation.order || [],
    recommendedOption,
    escape: escapePaymentText,
    recommendLabel: recommendBadgeLabel,
    goLabel,
    cards: {
      pass: {
        allow: canShowPassStore,
        dataMode: "pass-store",
        extraClass: " is-store",
        ariaLabel: `${passStoreTitle}${optionRecommendAria("pass")}`,
        glyph: "🎫",
        badgeLabel: passLabel,
        titleHtml: escapePaymentText(passStoreTitle),
        descHtml: escapePaymentText(passHint ? `${passStoreHint} ${passHint}` : passStoreHint),
      },
      direct: {
        allow: canShowDirect,
        dataMode: "direct",
        ariaLabel: `${directTitleLabel} ${formatPaymentWon(directAmount)}${optionRecommendAria("direct")}`,
        glyph: "💳",
        badgeLabel: directBadgeLabel,
        titleHtml: `${escapePaymentText(directTitleLabel)} · <span class="cd-direct-payment-amount">${formatPaymentWon(directAmount)}</span>`,
        descHtml: escapePaymentText(directHintLabel),
      },
      monthly: {
        allow: canShowMonthly,
        dataMode: "monthly",
        extraDataAttrs: ` data-monthly-option${monthlyDisabled ? ' disabled aria-disabled="true"' : ""}`,
        extraClass: monthlyDisabled ? " is-disabled" : "",
        ariaLabel: `${monthlyTitleLabel}${monthlyAriaSuffix}${optionRecommendAria("monthly")}`,
        glyph: "🌙",
        badgeLabel: monthlyBadgeLabel,
        titleHtml: `${escapePaymentText(monthlyTitleLabel)} · <span class="cd-direct-payment-amount">${monthlyCost.toLocaleString(checkoutEntry.displayLocale())}</span> ${escapePaymentText(monthlyUnitLabel)}`,
        descHtml: monthlyDescInitial,
        descAttr: " data-monthly-hint",
        afterHtml: monthlyBalanceCheckHtml,
      },
    },
  });
  // 🔴 단건결제 2단계(결제수단 고르기). 마크업·문구·수단 표는 세 렌더러 공유 코어 하나가 소유한다
  // (js/core/checkout-entry.js buildDirectPayMethodStepHtml). 앱(Play Billing)에서는 만들지 않는다 —
  // KR PG 수단 목록은 사실과 다르고 Play 정책에도 걸린다.
  const directMethodStepHtml = canShowDirect && !directUsesAppStore
    ? checkoutEntry.buildDirectPayMethodStepHtml({ escape: escapePaymentText })
    : "";
  const noteBasisText = checkoutEntry.text("payment.directModal.note.basis", "결제 금액 {amount}", { amount: formatPaymentWon(directAmount) });
  const noteWithPassText = checkoutEntry.text("payment.directModal.note.withPass", "이용권 · 월정석 · 카드 중에서 고를 수 있어요.");
  const noteWithPassHtml = canShowPassStore ? `<span>${escapePaymentText(noteWithPassText)}</span>` : "";

  return new Promise((resolve) => {
    let settled = false;
    // 세 렌더러가 공유하는 결제창 락 토큰(checkout-entry 소유). append 직후 획득, close 에서 해제.
    let sharedChoiceLockToken: ReturnType<typeof checkoutEntry.acquirePaymentChoiceLock> = null;
    const modal = document.createElement("div");
    modal.className = "cd-direct-payment-modal is-open";
    modal.dataset.cdReactPaymentChoice = "1";
    modal.setAttribute("data-marker", "direct-payment-pass-store-v20260607");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="cd-direct-payment-dialog">
        <span class="cd-direct-payment-hairline" aria-hidden="true"></span>
        <div class="cd-direct-payment-guide">
          <img class="cd-direct-payment-guide__pig" src="/icons/app-logo-176.webp?v=build-269f04a25a8b" alt="" width="88" height="88" loading="eager" decoding="async">
          <div class="cd-direct-payment-guide__copy">
            <h2 class="cd-direct-payment-title">${escapePaymentText(checkoutEntry.text("payment.directModal.moonTitle", "이 콘텐츠를 열어볼까요?"))}</h2>
            <p class="cd-direct-payment-sub">${escapePaymentText(guideBubbleText)}</p>
          </div>
        </div>
        <div class="cd-direct-payment-note"><strong>${escapePaymentText(title)}</strong><span>${escapePaymentText(noteBasisText)}</span>${noteWithPassHtml}</div>
        <div class="cd-direct-payment-choice-grid" data-choice-step="options">
          ${paymentChoiceButtonsHtml}
        </div>
        ${directMethodStepHtml ? `<div data-choice-step="methods" hidden>${directMethodStepHtml}</div>` : ""}
        <div class="cd-direct-payment-status" data-payment-status role="status" aria-live="polite"></div>
        ${overseasNoticeHtml}
        <p class="cd-direct-payment-legal">${escapePaymentText(checkoutEntry.text("payment.directModal.legal.provisionTiming", "본 서비스는 결제 완료 즉시 제공됩니다. 결제가 확인되는 시점부터 서비스 이용이 시작되며, 서비스 제공이 개시된 콘텐츠는 전자상거래법에 따라 청약철회가 제한될 수 있습니다. 미성년자가 법정대리인의 동의 없이 체결한 계약은 미성년자 본인 또는 법정대리인이 취소할 수 있습니다."))}</p>
        <div class="cd-direct-payment-actions">
          <button type="button" class="cd-direct-payment-cancel" data-mode="cancel">${escapePaymentText(checkoutEntry.text("common.cancel", "취소"))}</button>
        </div>
      </div>
    `;

    const modalOpenedAt = Date.now();
    // 이용권 상점으로 떠날 때도 close("cancel") 로 닫는다(호출부 계약 유지) — 그건 이탈이 아니므로
    // 계측에서 제외한다. pass_store_entered 가 그 전이를 이미 남긴다.
    let leavingForPassStore = false;
    const close = (mode: PaymentChoiceMode) => {
      if (settled) return;
      settled = true;
      // 공용 락은 어느 경로로 닫히든 반드시 푼다. 락을 쥔 채로 두면 재제안 자체가 막힌다(셸과 같은 계약).
      if (sharedChoiceLockToken) {
        checkoutEntry.releasePaymentChoiceLock(sharedChoiceLockToken);
        sharedChoiceLockToken = null;
      }
      // 🔴 'direct' 로 닫힐 때만 고른 결제수단을 남긴다(셸 close() 와 같은 계약). 다른 경로로
      // 닫혔는데 값이 남으면 다음 결제가 엉뚱한 수단으로 열린다.
      if (mode !== "direct") checkoutEntry.clearSelectedDirectPayMethod();
      unlockBodyScroll();
      // 🔴 단건도 여기서 바로 제거한다(셸 index.html 의 close 와 동일 계약). 예전에는 PG창이 그려지기
      // 직전까지 이 노드를 붙잡아 '여는 중' 표시를 대신했는데, 노드가 DOM 에 남아 있는 동안
      // isPaymentWaitUiBlocked 의 '결제수단 선택창이 떠 있으면 대기 UI 금지' 검사가 성립해
      // 바로 아래 showWaitOverlay("direct") 가 한 번도 그려지지 못했다. 즉시 제거해 mode 'card'
      // 오버레이가 클릭~PG창 구간을 이어받게 한다 — 독립 정적 렌더러가 이미 이렇게 동작한다.
      modal.parentNode?.removeChild(modal);
      // 이탈 계측 — 아무 것도 고르지 않고 닫은 경우만. dwellMs 로 '읽다가 포기'와 '즉시 닫음'을 가른다.
      if (mode === "cancel" && !leavingForPassStore) {
        checkoutEntry.trackCheckoutEvent("checkout_dismissed", {
          renderer: "react",
          featureKey: passCheckFeatureKey,
          coinPrice,
          dwellMs: Date.now() - modalOpenedAt,
        });
      }
      resolve(mode);
    };
    const setStatus = (message: string, error = false) => {
      const statusNode = modal.querySelector<HTMLElement>("[data-payment-status]");
      if (!statusNode) return;
      statusNode.textContent = message;
      statusNode.style.color = error ? "#fca5a5" : "#fde68a";
    };
    // 🔴 온디맨드 잔량 확인(2026-08-13, 셸 index.html bindMonthlyBalanceCheck 와 같은 계약).
    // 결제창은 열릴 때 잔량을 조회하지 않는다 — 첫 클릭은 fetchBillingBalance 의 recent 캐시를 그대로
    // 허용해 값이 신선하면 네트워크 0회로 끝나고, 두 번째부터만 fresh 로 서버 표시용 캐시까지 우회한다.
    // 실패는 문구로만 알린다(월정석 카드의 disabled 를 건드리지 않는다 — 미확정 ≠ 부족).
    let monthlyBalanceShown = false;
    const bindMonthlyBalanceCheck = () => {
      const button = modal.querySelector<HTMLButtonElement>("[data-monthly-balance-check]");
      const output = modal.querySelector<HTMLElement>("[data-monthly-balance-text]");
      if (!button || !output) return;
      const paint = (text: string, isError: boolean) => {
        output.textContent = text;
        output.hidden = false;
        output.classList.toggle("is-error", isError);
      };
      button.addEventListener("click", async () => {
        if (button.disabled) return;
        const wasShown = monthlyBalanceShown;
        button.disabled = true;
        button.textContent = checkoutEntry.text("payment.directModal.monthlyBalance.checking", "확인 중…");
        let result: Awaited<ReturnType<typeof fetchBillingBalance>> | null = null;
        try {
          result = await fetchBillingBalance({ moonlightStoneOnly: true, fresh: wasShown, clientSource: "app:payment-modal-balance-check" });
        } catch {
          result = null;
        }
        const balance = toNumber(result?.data?.monthlyStoneBalance ?? result?.data?.membershipCreditBalance, Number.NaN);
        if (result?.ok && result.data?.authenticated !== false && result.data?.degraded !== true && Number.isFinite(balance) && balance >= 0) {
          monthlyBalanceShown = true;
          paint(`${checkoutEntry.text("payment.directModal.currentMonthly", "현재 잔여")} ${Math.floor(balance).toLocaleString(checkoutEntry.displayLocale())}`, false);
        } else if (result?.data?.authenticated === false) {
          paint(checkoutEntry.text("payment.directModal.monthlyBalance.signedOut", "로그인 후 확인할 수 있어요."), true);
        } else {
          paint(checkoutEntry.text("payment.directModal.monthlyBalance.error", "확인하지 못했어요. 잠시 후 다시 눌러 주세요."), true);
        }
        button.textContent = monthlyBalanceShown
          ? checkoutEntry.text("payment.directModal.monthlyBalance.recheckButton", "다시 확인")
          : checkoutEntry.text("payment.directModal.monthlyBalance.checkButton", "보유 월정석 확인");
        button.disabled = false;
      });
    };
    const showWaitOverlay = (mode: PaymentChoiceMode) => {
      const runtimeWindow = window as RuntimeApiWindow;
      if (mode === "monthly") {
        runtimeWindow._cdSetCoinGateOverlay?.(true, "월정석 이벤트 재화 사용 권한을 확인하고 있습니다.", "monthly");
        return;
      }
      // 🔴 단건결제도 클릭~PG창 구간을 비워두지 않는다(빈 화면 = 이탈). 정적 셸·dp 런타임과 같은
      // mode 'card' 오버레이를 쓰고 문구 인자는 비운다 — 카피는 mode 'card' 정본을 따라간다.
      // 이 오버레이는 PG창 렌더 직전 한 곳(_dpSetPaymentPending(false))에서만 내려간다.
      // 대기 UI가 결제창 노출을 늦추지 않도록, 실제 checkout 요청은 이 점등 뒤가 아니라
      // js/destiny-profile.js 의 _dpTakeDirectCheckoutResponse 가 먼저 발사한다.
      if (mode === "direct") {
        runtimeWindow._cdSetCoinGateOverlay?.(true, "", "card");
      }
    };

    lockBodyScroll();
    // 🔴 1단계↔2단계는 노드 교체가 아니라 hidden 토글이다. 교체하면 아래에서 카드마다 붙이는
    // [data-mode] 리스너가 사라져 [뒤로] 로 돌아온 화면이 죽는다.
    const enterMethodStep = (): boolean => {
      const options = modal.querySelector<HTMLElement>('[data-choice-step="options"]');
      const methods = modal.querySelector<HTMLElement>('[data-choice-step="methods"]');
      if (!options || !methods) return false;
      options.hidden = true;
      methods.hidden = false;
      setStatus("");
      (methods.querySelector<HTMLButtonElement>('[data-pay-method]:not([aria-disabled="true"])')
        || methods.querySelector<HTMLButtonElement>('[data-pay-step="back"]'))?.focus();
      return true;
    };
    const leaveMethodStep = (): void => {
      const options = modal.querySelector<HTMLElement>('[data-choice-step="options"]');
      const methods = modal.querySelector<HTMLElement>('[data-choice-step="methods"]');
      if (!options || !methods) return;
      methods.hidden = true;
      options.hidden = false;
      setStatus("");
      modal.querySelector<HTMLButtonElement>('[data-mode="direct"]')?.focus();
    };
    modal.addEventListener("click", (event) => {
      // 🔴 2단계 버튼에는 data-mode 가 없다(붙이면 아래 일괄 리스너가 창을 닫는다). 선택과 복귀는
      // 여기 델리게이션이 받는다 — 리스너를 따로 걸지 않는 이유는 순서가 불확정해지기 때문이다.
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-pay-step="back"]')) {
        leaveMethodStep();
        return;
      }
      const methodHit = target?.closest<HTMLButtonElement>("[data-pay-method]");
      if (methodHit) {
        if (methodHit.getAttribute("aria-disabled") === "true") {
          // 아직 PG 계약이 끝나지 않은 수단. 창을 닫지 않고 왜 못 누르는지만 말한다.
          setStatus(checkoutEntry.directPayMethodComingSoonText());
          return;
        }
        const pickedMethod = checkoutEntry.setSelectedDirectPayMethod(methodHit.getAttribute("data-pay-method"));
        if (!pickedMethod) return;
        checkoutEntry.trackCheckoutEvent("checkout_option_click", {
          option: `direct_${pickedMethod.toLowerCase()}`,
          renderer: "react",
          featureKey: passCheckFeatureKey,
          coinPrice,
        });
        modal.querySelectorAll<HTMLButtonElement>("[data-mode],[data-pay-method],[data-pay-step]").forEach((node) => {
          node.disabled = true;
        });
        // 오버레이는 결제창을 닫은 뒤에 켠다(아래 [data-mode] 경로와 같은 이유).
        close("direct");
        showWaitOverlay("direct");
        return;
      }
      if (event.target === modal) close("cancel");
    });
    bindMonthlyBalanceCheck();
    modal.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
      button.addEventListener("click", async () => {
        const rawMode = toText(button.dataset.mode);
        const mode = rawMode as PaymentChoiceMode;
        if (mode === "cancel") {
          close("cancel");
          return;
        }
        // 🔴 '이용권으로 구매' = 이용권 검사 지점(셸 index.html 과 같은 계약). 진입 선검사가 사라졌으므로
        // 결제창을 여는 시점에는 보유 여부를 모른다 — 여기서 서버에 한 번 묻고, 커버되면 결제 없이
        // 'pass' 로 닫아 호출부가 무료로 열게 하고, 아니면 이용권 상점으로 보낸다.
        if (mode === "pass-store") {
          if (button.disabled) return;
          button.disabled = true;
          button.classList.add("is-loading");
          checkoutEntry.trackCheckoutEvent("checkout_option_click", { option: "pass", renderer: "react", featureKey: passCheckFeatureKey, coinPrice });
          setStatus("이용권을 확인하고 있습니다.");
          const runtimeWindow = window as RuntimeApiWindow;
          let passResult: RuntimeMembershipPassApplyResult | null = null;
          try {
            if (typeof runtimeWindow.__cdApplyMembershipPassBeforePayment !== "function") {
              throw new Error("PASS_RUNTIME_UNAVAILABLE");
            }
            passResult = await runtimeWindow.__cdApplyMembershipPassBeforePayment({
              categoryKey: toText(opts.categoryKey) || undefined,
              subFeatureKey: toText(opts.subFeatureKey) || undefined,
              featureKey: passCheckFeatureKey || undefined,
              reason: toText(opts.reason) || undefined,
              title,
              productId: toText(opts.productId) || undefined,
              productType: toText(opts.productType) || undefined,
              serviceType: toText(opts.serviceType || opts.productType) || undefined,
              contentKey: toText(opts.contentKey) || undefined,
              reportId: toText(opts.reportId) || undefined,
              sessionId: toText(opts.sessionId) || undefined,
              reportSessionId: toText(opts.reportSessionId || opts.sessionId) || undefined,
              purchaseId: toText(opts.purchaseId) || undefined,
              profileId: toText(opts.profileId) || undefined,
              selectedProfileId: toText(opts.selectedProfileId || opts.profileId) || undefined,
              requestId: toText(opts.requestId) || undefined,
              coinPrice,
              cost: coinPrice,
              amountKrw: directAmount,
              amountKRW: directAmount,
            });
          } catch {
            passResult = null;
          }
          const passStatus = toText(passResult?.status).toLowerCase();
          if (passStatus === "pass_applied" || passStatus === "already_unlocked") {
            checkoutEntry.trackCheckoutEvent("pass_verified_free", { option: "pass", renderer: "react", featureKey: passCheckFeatureKey, coinPrice });
            close("pass");
            return;
          }
          // `payment_required`(서버 402/명시적 미커버)만 상점으로 보낸다. 일시 장애와 런타임
          // 로드 실패는 보유 여부를 확정할 수 없으므로 모달 안에서 다시 시도하게 한다.
          if (passStatus !== "payment_required") {
            button.disabled = false;
            button.classList.remove("is-loading");
            setStatus(checkoutEntry.text("payment.directModal.passCheckRetry", "이용권 상태를 확인하지 못했습니다. 잠시 후 다시 눌러 주세요."), true);
            return;
          }
          button.disabled = false;
          button.classList.remove("is-loading");
          // 서버 판정의 월 잔여를 활성 스냅샷에 되쓴다 — 다음 진입은 스냅샷만으로 판정한다.
          const passDeniedPayload = (passResult?.payload ?? (passResult?.raw as { payload?: unknown } | undefined)?.payload) ?? null;
          try { passVerdict.storeMonthlyQuotaFromPayload(resolveSubscriptionSnapshotUserId(), passDeniedPayload); } catch {}
          try { passVerdict.markPassEndedFromPayload(resolveSubscriptionSnapshotUserId(), passDeniedPayload); } catch {}
          // 월 한도 소진(decisionReason MONTHLY_PASS_LIMIT_EXCEEDED)은 이용권이 **있는** 상태다 — 상점으로 보내면
          // 이미 가진 이용권을 또 사라는 화면이 된다. 모달을 연 채 단건·월정석을 고르게 한다.
          if (passVerdict.isMonthlyLimitPayload(passDeniedPayload)) {
            setStatus(checkoutEntry.text("payment.directModal.passMonthlyExhausted", "이용권 한도를 모두 사용해 이용권이 종료되었어요. 새로 구매하면 30일이 다시 시작되고, 지금은 단건 결제나 월정석으로 열 수 있어요."), true);
            return;
          }
          setStatus("보유하신 이용권으로는 열리지 않아 이용권 상점으로 이동합니다.");
          leavingForPassStore = true;
          close("cancel");
          openMembershipPassStore(coinPrice, passTier, passCheckFeatureKey);
          return;
        }
        if (button.disabled) return;
        if (mode === "direct" || mode === "monthly") {
          checkoutEntry.trackCheckoutEvent("checkout_option_click", { option: mode, renderer: "react", featureKey: passCheckFeatureKey, coinPrice });
        }
        // 🔴 단건은 여기서 닫지 않고 결제수단 2단계로 넘어간다. 아직 아무것도 로딩하지 않으므로
        // 카드를 잠그지도 않는다 — 잠그면 [뒤로] 로 돌아온 카드가 죽는다.
        if (mode === "direct" && enterMethodStep()) return;
        modal.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((node) => {
          node.disabled = true;
        });
        if (mode === "monthly") setStatus("월정석 이벤트 재화 사용 권한을 확인하고 있습니다.");
        // 🔴 오버레이는 결제창을 닫은 **뒤에** 켠다. 대기 UI 차단 판정(__cdPaymentWaitUiBlocked)은
        // "결제수단 모달이 DOM 에 있으면 금지"를 포함하므로, 닫기 전에 켜면 그대로 무시된다
        // (그래서 클릭~PG창 사이가 비어 보였다).
        close(mode);
        showWaitOverlay(mode);
      });
    });
    // 🔴 결제창을 붙이는 순간 열려 있던 대기 오버레이를 내린다. 억제 판정은 "새로 여는 것"만 막고
    // 이미 열린 오버레이는 닫지 않는데, useCoinGate 가 선검사 때 켠 오버레이는 외곽 finally 의
    // endPayment() 까지 살아 있어서 결제창 위에 그대로 겹쳐 보였다. 셸 경로는
    // _cdBeginPreCheckoutWaitUiSuppression()/closeSharedPaidGate() 가 같은 일을 하는데
    // 이 React 렌더러에는 닫는 호출이 아예 없었다.
    // 스타일 준비와 append 사이에 await 가 있으므로 붙이기 직전에 한 번 더 훑는다(그 사이 다른
    // 런타임이 결제창을 남겼을 수 있다). append 직후에는 자기 노드를 공용 락에 등록해 셸·독립 정적이
    // 볼 수 있게 한다 — 락은 close() 에서 반드시 푼다.
    // 🔴 emitPaymentLoadingState(false) 와 appendChild 사이에는 아무 것도 끼우지 않는다.
    //    verify:portone-single-payment 가 두 줄의 인접을 리터럴로 고정한다(대기 오버레이 겹침 회귀).
    // 이전 결제 시도가 남긴 결제수단 선택은 여기서 비운다(checkout-entry TTL 과 이중 방어).
    checkoutEntry.clearSelectedDirectPayMethod();
    checkoutEntry.sweepOrphanChoiceModals(modal);
    emitPaymentLoadingState(false);
    document.body.appendChild(modal);
    sharedChoiceLockToken = checkoutEntry.acquirePaymentChoiceLock("react");
    if (sharedChoiceLockToken) checkoutEntry.attachPaymentChoiceNode(sharedChoiceLockToken, modal);
    // 퍼널 시작점. 여기부터 checkout_option_click / checkout_dismissed 까지가 한 세션이다.
    checkoutEntry.trackCheckoutEvent("checkout_opened", {
      renderer: "react",
      featureKey: passCheckFeatureKey,
      coinPrice,
      hasPassHint: hasActivePassTier ? "active" : "unknown",
    });
    // 첫 번째 실제 결제 옵션에 포커스(상점 우선 노출 시 상점 버튼). 하드코딩된 direct 포커스 대체.
    (modal.querySelector<HTMLButtonElement>(".cd-direct-payment-option")
      || modal.querySelector<HTMLButtonElement>('[data-mode="direct"]'))?.focus();
    // 🔴 결제창은 열릴 때 월정석 잔량을 조회하지 않는다(자동 조회·잔여바 제거, 2026-08-12 — 셸 index.html 과
    // 같은 계약). 간헐 503/타임아웃의 원인이던 그 /api/billing/balance 왕복은 여기서 나가지 않는다 — 최종
    // 판정은 어차피 월정석 선택 시 서버 coin-gate 가 원자적으로 확인+차감하고, 부족하면 lot 정본 잔량을 실은
    // 402 로 되돌아온다. 잔량 표시는 사용자가 [보유 월정석 확인] 을 누를 때만 도는 온디맨드다(2026-08-13).
  });
}

function installReactPaymentChoiceBridge() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const runtimeWindow = window as RuntimeApiWindow;
  const canonical = runtimeWindow.__cdChooseServicePaymentModeCanonical;
  if (typeof canonical === "function" && canonical.__cdSupportsPassChoice === true && canonical.__cdReactFallback !== true) {
    // 🔴 여기서 재등록하지 않는다. 셸이 이미 진짜 렌더러(_cdChooseServicePaymentMode)를
    // 'canonical-shell' 로 등록해 두었는데, canonical 은 그걸 openPaymentWindow 로 감싼 래퍼다.
    // 같은 owner 로 다시 넣으면 renderer 가 자기 자신을 가리켜 무한 재귀가 되거나, 최소한 셸의
    // 실제 렌더러가 사라져 어느 결제창이 뜰지가 로드 순서에 좌우된다.
    return;
  }
  if (runtimeWindow._cdChooseServicePaymentMode?.__cdReactFallback === true) return;

  const choiceBridge: PaymentChoiceFunction = (options) => openReactPaymentChoiceModal(options || {});
  choiceBridge.__cdSupportsPassChoice = true;
  choiceBridge.__cdReactFallback = true;
  resolvePaymentService().registerPaymentWindow(choiceBridge, "react");
  const serviceBridge: PaymentChoiceFunction = (options) => resolvePaymentService().openPaymentWindow(options || {}) as Promise<PaymentChoiceMode>;
  serviceBridge.__cdSupportsPassChoice = true;
  serviceBridge.__cdReactFallback = true;
  runtimeWindow.__cdChooseServicePaymentModeCanonical = serviceBridge;
  runtimeWindow._cdChooseServicePaymentMode = serviceBridge;
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

// 결제 게이트 진입 전 인증 예열의 상한. useCoinGate 의 예열 상한과 같은 값으로 맞춘다 —
// 둘은 같은 single-flight 에 합류하므로 서로 다른 값을 두면 늦은 쪽이 그냥 잉여 대기가 된다.
const BILLING_AUTH_PREHEAT_BUDGET_MS = 4000;

/**
 * 로컬에 세션 흔적이 있는가(= "게스트라고 단정하면 안 되는가").
 *
 * 🔴 이건 인증 증명이 아니라 **미인증 단정을 막는 근거**다. 웹은 로그인 후
 * localStorage.fortune_auth_token 을 지우고 HttpOnly 쿠키만 남기므로, 흔적이 없다고 로그아웃도
 * 아니고 흔적이 있다고 로그인도 아니다. 판정은 서버가 한다 — 이 값은 "모름"을 "미인증"으로
 * 접지 않기 위한 가드로만 쓴다(useCoinGate 의 AUTH_REQUIRED 게이트).
 */
export function hasClientAuthSessionHint() {
  if (typeof window === "undefined") return false;
  // js/core/auth-hint.js 단일 정본에 위임한다(index.html · destiny-profile.js 와 로직을 공유) —
  // 사본을 새로 만들지 말 것.
  try {
    const runtimeWindow = window as RuntimeApiWindow;
    return Boolean(runtimeWindow.__cdAuthHint?.hasAuthHint?.());
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

async function authFetchBilling(
  path: string,
  init: RequestInit,
  options: { timeoutMs?: number; clientSource?: string } = {},
): Promise<Response> {
  const clientSource = String(options.clientSource || "app:billing-client").trim().toLowerCase();
  return withSuppressedRuntimePaymentFetchOverlay(async () => {
    const primary = await authFetchBillingOnce(path, init, { timeoutMs: options.timeoutMs, clientSource });
    if (primary.ok || primary.status !== 404) return primary;

    const fallbackBases = collectBillingFallbackBases();
    if (!fallbackBases.length) return primary;

    for (const apiBase of fallbackBases) {
      const retried = await authFetchBillingOnce(path, init, { apiBase, timeoutMs: options.timeoutMs, clientSource });
      if (retried.ok || retried.status !== 404) return retried;
    }

    return primary;
  });
}

// 이용권 "선검사" 전용 상한. 결제 확정(checkout/confirm/forceDeduct coin-gate)의 40s·60s 상수는 결제 사고와
// 직결되므로 절대 낮추지 않는다 — 대신 과금이 일어나지 않는 확인 요청에만 호출부에서 이 값을 넘긴다.
// 6000이었을 때, 이 상한을 받는 대상이 하필 "이용권이 커버되는 사용자"뿐이라(coinGateMayDeduct 판별식 참고)
// 서버가 조금만 느려도 보유자가 결제창으로 새는 역전이 생겼다. 서버 pass 판정은 Mongo 왕복이 여러 번이고
// 콜드 아이솔레이트에선 op-타임아웃 12s·서버선택 8s(worker/lib/db.js)라 6초는 정상 응답도 자르는 값이었다.
const BILLING_PASS_PROBE_TIMEOUT_MS = 15000;
// 결제창 노출을 막고 기다리는 선검사 전용 예산. 정본 셸의 CD_PASS_FIRST_BUDGET_MS(index.html)와 같은 값.
const GATE_PASS_PROBE_TIMEOUT_MS = 6000;

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

async function authFetchBillingOnce(
  path: string,
  init: RequestInit,
  options: { apiBase?: string; timeoutMs?: number; clientSource?: string } = {},
): Promise<Response> {
  // 게이팅/결제 엔드포인트는 401을 리프레시로 흡수해 합성 503(AUTH_REFRESH_TEMPORARY_FAILURE)으로
  // 바꾸지 않는다 — 그러면 서버의 paymentRequired/402 신호가 마스킹돼 결제 폴백 시트가 안 뜬다.
  // 세션 예열은 runBillingCoinGate 진입부에서 이미 수행하므로 여기서의 retryOn401은 중복이다.
  const { timeoutMs: requestedTimeoutMs, clientSource, ...authFetchOptions } = options;
  const billingOptions = { ...authFetchOptions, retryOn401: false, clientSource };
  if (typeof AbortController === "undefined" || init.signal) {
    return authFetch(path, init, billingOptions);
  }

  const controller = new AbortController();
  const overrideTimeoutMs = Number(requestedTimeoutMs);
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    Number.isFinite(overrideTimeoutMs) && overrideTimeoutMs > 0 ? overrideTimeoutMs : resolveBillingFetchTimeoutMs(path, init),
  );
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

  const created: Promise<PaidServiceRuntimeGate | null> = new Promise((resolve) => {
    const finish = () => {
      installReactPaymentChoiceBridge();
      resolve(getPaidServiceRuntimeGate());
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src^="/js/destiny-profile.js"]');
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      // 🔴 PortOne SDK 프리로더(destiny-profile.js _dpPortOneV2SdkPromise)와 같은 8초 예산으로 맞춘다.
      // destiny-profile.js 자체도 ~400KB라, 예전 1200ms는 첫 로드·모바일 네트워크에서 정상 진행 중인
      // 로드마저 "실패"로 오판해 결제 게이트를 조용히 unavailable 로 확정시켰다(PG창이 안 뜨는 원인).
      window.setTimeout(finish, 8000);
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

  paidServiceRuntimePromise = created;
  // 실패(null)로 끝난 시도는 캐시에 남기지 않는다 — SDK 프리로드 캐시와 동일한 자기치유 패턴.
  // 남기면 한 번의 타임아웃/네트워크 실패가 그 페이지 세션 내내 결제 게이트를 영구 unavailable 로 고정한다.
  created.then((gate) => {
    if (!gate && paidServiceRuntimePromise === created) paidServiceRuntimePromise = null;
  });

  return created;
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

// 🔴 스냅샷을 **삭제**해도 되는 경우는 "보유 주체가 달라졌을 때"뿐이다(로그아웃·세션 만료·다른 계정).
// 402 를 여기 넣으면 안 된다 — 402 는 "이 **가격**이 이 등급으로 안 열린다"는 가격에 대한 답이지
// "이용권이 없다"는 보유 상태에 대한 답이 아니다. 스냅샷에는 state/tier/expiresAt 만 들어 있고 가격은
// 판정 시점에 곱해지므로(js/core/pass-verdict.js resolveVerdict), 한도를 넘는 기능(예: 작명 300코인 >
// vvip 100)을 한 번 눌렀다고 멀쩡한 보유 스냅샷을 버리면 **그 뒤 한도 이내 기능에서도** 낙관 통과가
// 사라져 매번 차단형 서버 왕복을 탄다. 402 는 아래 shouldRefreshSubscriptionSnapshotAfterDenial 로
// "삭제 없는 재검증"만 건다.
function shouldInvalidateSubscriptionSnapshot(status: number, code?: string) {
  const normalizedCode = toText(code).toUpperCase();
  return status === 401
    || status === 403
    || normalizedCode === "AUTH_REQUIRED";
}

// 402 계열(미커버·한도초과·잔액부족)은 스냅샷이 **낡았을 수도** 있다는 신호일 뿐이다(환불·해지로 이용권이
// 사라진 경우). 삭제 대신 서버 재조회를 걸어, 성공하면 정본으로 덮어쓰고 실패하면 기존 판정을 유지한다.
function shouldRefreshSubscriptionSnapshotAfterDenial(status: number, code?: string) {
  const normalizedCode = toText(code).toUpperCase();
  return status === 402
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
    || normalizedCode === "BILLING_REQUEST_TIMEOUT"
    // 일부 AI 라우트가 돌려주는 degrade 코드.
    || normalizedCode === "DB_DEGRADED"
    // 요구사항: 이용권 확인 실패 시 무조건 결제창. 위 명시 코드 외에도, 로그인 유도 대상(401/403 →
    // shouldRedirectToLoginAfterBilling)이 아닌 서버/인프라 5xx는 dead-end 대신 결제창을 연다.
    // (미상 degrade 코드까지 흡수 — status>=500은 401/403을 포함하지 않는다.)
    || status >= 500;
}

// 🔴 이 자리에 있던 코인게이트 재시도 상수·판정 함수(isRetryableBillingInfraDegraded)는 제거됐다
// (2026-08-08). 실제 재시도 코드는 그보다 먼저 사라졌는데 상수 주석과 판정 함수만 남아, 아래
// runCoinGateRequest 가 "짧게 재시도한다"고 읽히는 반면 코드는 단발이었다 — 이 파일을 읽는 사람을
// 정확히 반대로 안내하던 주석이다.
//
// 결제 확정 POST 를 자동 재시도하지 않는 것은 의도된 정책이며 가드 2종이 강제한다:
//   scripts/verify-paid-gate-ui-regression.mjs  ("React payment POST is not automatically retried")
//   scripts/verify-coin-gate-degraded-preview.mjs ("payment POST auto retry must stay removed")
// 되살리려면 그 두 단언을 함께 뒤집어야 하므로 임의로 하지 말 것.
//
// 과금이 없는 이용권 확인만 degraded-503 에서 1회 재시도한다 — 위치는 여기가 아니라
// js/destiny-profile.js 의 _dpApplyMembershipPassBeforePayment 이고,
// npm run verify:pass-check-retry 가 그 동작(재시도 1회·동일 requestId·402/429 제외)을 고정한다.

// 서버가 "확정적으로 답한" 경우만 true. 402(미커버/잔액부족)와 401/403(인증)이 여기 해당한다.
// 나머지 실패(클라 타임아웃 BILLING_REQUEST_TIMEOUT·5xx·degraded)는 "커버되지 않음"이 아니라
// "아직 확인되지 않음"이다 — 이 구분이 없으면 지연 하나가 이용권 보유자를 결제창으로 보낸다.
function isDefinitiveBillingAnswer(status: number, code?: string) {
  const normalizedCode = toText(code).toUpperCase();
  return status === 402
    || status === 401
    || status === 403
    || normalizedCode === "PAYMENT_REQUIRED"
    || normalizedCode === "MEMBERSHIP_PASS_NOT_COVERED"
    || normalizedCode === "PRICE_EXCEEDS_PASS_LIMIT"
    || normalizedCode === "INSUFFICIENT_COINS"
    || normalizedCode === "AUTH_REQUIRED"
    || normalizedCode === "LOGIN_REQUIRED"
    || normalizedCode === "UNAUTHORIZED";
}

// useCoinGate의 resolveLoginRequired와 동일 판정. authFetch가 401에서 세션 갱신+재시도까지
// 마친 뒤에도 남은 "진짜 미로그인/세션 만료"만 걸러 로그인 유도한다. 일시적 503(AUTH_REFRESH_TEMPORARY_FAILURE
// 등)은 status가 401이 아니고 결제 폴백(shouldOpenRuntimePaymentFallback) 대상이라 여기 걸리지 않는다.
//
// 🔴 맨 403 은 제외한다 — 인증 실패가 아니라 MISSING_PROFILE_ID·INVALID_ORIGIN 같은 상태/권한
// 문제라, 로그인 유도로 처리하면 로그인한 사용자를 로그아웃시킨다(useCoinGate 의 같은 주석 참고).
function shouldRedirectToLoginAfterBilling(status: number, code?: string) {
  const normalizedCode = toText(code).toUpperCase();
  return status === 401
    || normalizedCode === "AUTH_REQUIRED"
    || normalizedCode === "LOGIN_REQUIRED"
    || normalizedCode === "UNAUTHORIZED";
}

function normalizeAccessReason(value: unknown) {
  return toText(value).trim().toLowerCase();
}

// 🔴 '미커버' 결과도 캐싱한다. 예전에는 커버되는 결과만 캐싱해서, 정작 재시도·연타가 잦은
// 이용권 미보유자만 매번 전체 서버 왕복을 다시 냈다(보유자만 캐시 혜택 — 정확히 반대였다).
// 안전한 이유: (1) 503/degraded 는 result.ok === false 라 아래 첫 줄에서 이미 걸러진다.
// (2) 로그인·로그아웃·이용권 구매·결제 성공은 모두 invalidateBillingBalanceCache() 를 거치고,
//     그 안에서 paymentEligibilityRecent.clear() 가 돌아 stale 이 남지 않는다.
// TTL 은 커버 결과와 동일(PAYMENT_ELIGIBILITY_RECENT_TTL_MS) — 별도 상한을 새로 두지 않는다.
function shouldCachePaymentEligibilityResult(result: BillingResult<PaymentEligibility>) {
  if (!result.ok || !result.data) return false;
  if (result.status >= 400) return false;
  return true;
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
  const known = Math.max(0, Math.floor(toNumber(
    eligibility?.coinCost
    ?? input.coinPrice
    ?? input.cost,
    amountKRW > 0 ? Math.ceil(amountKRW / 100) : 0,
  )));
  if (known > 0) return known;
  // 🔴 여기까지 왔다는 것은 호출부도 eligibility 도 가격을 모른다는 뜻이다. 예전에는 그대로 0 을
  //    돌려줬고, 그 0 이 결제창의 coinPrice·directAmount·monthlyCost 가 되어 **"0원 + 월정석 카드
  //    영구 비활성"** 으로 렌더됐다. 회당 결제(per-use)는 eligibility 왕복을 건너뛰므로(runBillingCoinGate
  //    의 mayBeAlreadyUnlocked 분기) 호출부가 가격을 빼먹으면 0 을 메울 곳이 아예 없었다.
  //    서버 가격표에 직접 묻는다 — 서버 coin-gate 가 같은 함수(getBillingFeaturePricing)로 같은 답을
  //    내므로 표시가와 청구액이 갈릴 수 없다. 못 풀면 종전대로 0 이라 미등록 기능의 동작은 불변이다.
  return resolveServerFeaturePricing(input)?.cost ?? 0;
}

export type SnapshotPassVerdict = {
  snapshot: SubscriptionSnapshot | null;
  passLimit: number;
  /** 스냅샷만으로 '이용권 커버'가 확정 — 낙관 즉시 통과 후보(서버 왕복 0). */
  coversNow: boolean;
  /** 스냅샷만으로 '미보유 또는 한도초과'가 확정 — 결제창 직행(서버 왕복 0). */
  cannotCover: boolean;
};

// 🔴 스냅샷만으로 내릴 수 있는 이용권 판정의 **단일 정본**. runBillingCoinGate 와 useCoinGate(대기 UI를
// 켤지 말지)가 같은 함수를 써야 두 판정이 어긋나지 않는다 — 사본을 만들면 한쪽만 고쳐져 '확인 화면은
// 떴는데 곧바로 결제창'/'결제창은 떴는데 확인 화면이 남음' 같은 어긋남이 생긴다.
// 이용권 판정은 canUseByPass(tier, expiresAt, 가격)라는 순수 함수라 기능별 서버 조회가 필요 없다.
// 판정 규칙 자체는 js/core/pass-verdict.js 가 소유한다(셸·독립 정적과 공유). 여기서는 결제수단 명시
// 여부 같은 React 입력을 규칙에 얹기만 한다.
export function resolveSnapshotPassVerdict(input: BillingCoinGateInput): SnapshotPassVerdict {
  const requestedMode = normalizePaymentMode(input.paymentMode);
  // 🔴 이용권 커버 대상이 아닌 기능(프로필 카드 관리)은 스냅샷 즉시통과 후보에서 뺀다.
  //    서버 정본은 isPassExcludedPricing 하나이고 그 판정이 라우트 안에 있어 여기서 볼 수 없었다.
  //    가격이 호출부 인자로만 오던 동안에는 이 구멍이 드러나지 않았는데, 이제 featureKey 만으로도
  //    가격이 풀리므로 "featureKey 만 넘기는 호출부 = 이용권 무료 통과" 가 될 수 있다. 미리 막는다.
  const passExcluded = resolveServerFeaturePricing(input)?.passExcluded === true;
  const passDisabled = passExcluded || input.disablePassFirst === true || input.disablePassChoice === true || input.skipPassProbe === true;
  const explicitPassMode = requestedMode === "MEMBERSHIP_PASS" && !passDisabled;
  const directKrwUsesNativeBilling = requestedMode === "DIRECT_KRW" && isMobileAppRuntime();
  const explicitPaymentMode = explicitPassMode || requestedMode === "MOONLIGHT_STONE" || (requestedMode === "DIRECT_KRW" && !directKrwUsesNativeBilling);
  // 미보유 확정은 stale 스냅샷으로도 내린다(SWR). 커버 확정도 이용권 만료일이 남아 있으면 stale 로 낸다.
  const snapshot = readSubscriptionSnapshotForUser(undefined, { allowStaleNone: true });
  // stale 을 읽었으면 이번 판정은 그대로 쓰고 다음 클릭을 위해 백그라운드로만 갱신한다.
  // (warmSubscriptionSnapshotOnEntry 는 in-flight dedup + 신선 스냅샷 조기반환을 이미 갖고 있다.)
  if (snapshot?.stale) void warmSubscriptionSnapshotOnEntry();
  const knownCoinCost = resolveKnownCoinCost(input, null);
  const verdict = passVerdict.resolveVerdict(snapshot, knownCoinCost);
  const usable = !explicitPaymentMode && !passDisabled && knownCoinCost > 0 && Boolean(snapshot);
  return {
    snapshot,
    passLimit: verdict.passLimit,
    coversNow: Boolean(usable && verdict.coversNow),
    cannotCover: Boolean(usable && verdict.cannotCover),
  };
}

function resolveKnownAmountKRW(input: BillingCoinGateInput, eligibility: PaymentEligibility | null, coinCost: number) {
  const known = Math.max(0, Math.floor(toNumber(
    eligibility?.priceKRW
    ?? input.amountKRW
    ?? input.amountKrw
    ?? input.cashPrice
    ?? input.paymentAmount,
    0,
  )));
  if (known > 0) return known;
  // 🔴 코인가 × 100 으로 파생하기 전에 서버 가격표의 amountKRW 를 먼저 본다. 현재는 레지스트리
  //    130개 항목 전부가 amountKRW === cost × 100 이라 두 값이 같지만(2026-08-17 실측), 환율이
  //    100 이 아닌 항목이 하나라도 생기면 파생값은 그 순간 청구액과 어긋난다.
  const registryAmountKRW = resolveServerFeaturePricing(input)?.amountKRW ?? 0;
  if (registryAmountKRW > 0) return registryAmountKRW;
  return Math.max(0, Math.floor(coinCost > 0 ? coinCost * 100 : 0));
}

// 402(결제 필요) 응답에 실려 온 서버 정본 가격을 결제창 입력에 얹는다.
//
// 🔴 두 번째 안전망이지 첫 번째가 아니다. 서버는 402 본문에 pricing 을 이미 최상위로 펼쳐 보내는데
//    (worker/routes/billing.js 의 failure(..., { pricing, ... })), 폴백 결제창은 그 값을 읽지 않고
//    호출부 input 만 그대로 다시 넘겨 왔다 — 그래서 가격을 모르는 호출부는 402 를 받고도 0원 결제창을
//    열었다. 레지스트리 폴백과 직교하므로, 가격표에 없는 기능(음원·신규 SKU·reason 전용 가격)까지 덮는다.
//    호출부가 이미 가격을 넘겼으면 건드리지 않는다(서버 값으로 덮어쓰지 않는다 — 금액 대조는 서버가 한다).
function withServerDeniedPricing(
  input: BillingCoinGateInput,
  denied: BillingResult<BillingCoinGateData>,
): BillingCoinGateInput {
  const hasCallerPrice = toNumber(input.coinPrice ?? input.cost, 0) > 0
    || toNumber(input.amountKRW ?? input.amountKrw ?? input.cashPrice ?? input.paymentAmount, 0) > 0;
  if (hasCallerPrice) return input;

  const raw = asRecord(denied.raw) || {};
  const serverPricing = asRecord(raw.pricing) || asRecord(asRecord(raw.data)?.pricing);
  if (!serverPricing) return input;

  const cost = Math.max(0, Math.floor(toNumber(serverPricing.coinPrice ?? serverPricing.cost, 0)));
  const amountKRW = Math.max(0, Math.floor(toNumber(serverPricing.amountKRW ?? serverPricing.cashPrice, 0)));
  if (cost <= 0 && amountKRW <= 0) return input;

  return {
    ...input,
    ...(cost > 0 ? { cost, coinPrice: cost } : {}),
    ...(amountKRW > 0 ? { amountKRW } : {}),
  };
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
    // 🔴 서버의 displayPrice 는 "30,000원" 으로 굳어 있다(worker/lib/billing-feature-registry.js).
    //    그 응답은 가격이 국가 불변이라 캐시되므로 로케일 반영은 클라 몫이다 — formatPaymentWon 이 정본.
    displayPrice: toText(amountKRW > 0 ? formatPaymentWon(amountKRW) : (rawPricing.displayPrice || formatCoinValueWon(cost))),
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
  // 워밍된 구독 스냅샷만으로 '이용권 미커버'가 확정된 경로(서버 왕복 없이 결제창 직행).
  snapshotSaysNoPass?: boolean;
}): Promise<BillingResult<BillingCoinGateData> | null> {
  if (typeof window === "undefined") return null;
  if (input.forceDeduct === false) return null;

  const requestedMode = normalizePaymentMode(input.paymentMode);
  if (requestedMode === "MEMBERSHIP_PASS" || requestedMode === "MOONLIGHT_STONE") return null;

  const runtimeWindow = window as RuntimeApiWindow;
  const loadedRuntimeGate = context.runtimeGate || await loadPaidServiceRuntimeGate();
  const explicitDirectGate = requestedMode === "DIRECT_KRW" && typeof runtimeWindow._cdRunDirectKrwCheckout === "function"
    ? runtimeWindow._cdRunDirectKrwCheckout
    : null;
  const runtimeGate = explicitDirectGate || loadedRuntimeGate;
  if (!runtimeGate) return null;

  const cost = resolveKnownCoinCost(input, context.eligibility);
  const featureKey = toText(input.featureKey || input.subFeatureKey || context.featureId);

  // 앱은 정본 게이트를 그대로 쓴다(이용권 선검사 → 결제창에 단건+월정석 동등 노출).
  // 바뀌는 건 표시 금액뿐 — 같은 기능이 Play에서는 더 비싸므로 웹가를 그대로 보여주면
  // 결제창 금액과 실제 청구액이 어긋난다. 단건을 고르면 앱 결제 가드가 Play Billing으로 보낸다.
  let amountKRW = resolveKnownAmountKRW(input, context.eligibility, cost);
  if (isMobileAppRuntime()) {
    // 앱에서 단건 결제를 Play Billing으로 바꿔치는 것은 결제 가드다(scripts/app-payment-guard.js,
    // 빌드 시 모든 HTML에 주입). 가드가 없으면 정본 게이트의 원래 구현(PortOne)이 열려
    // Play 정책을 위반한다 — 결제를 여는 대신 막는다. (build:mobile:app이 주입을 보장하고
    // verify-app-no-portone.mjs가 배포 전에 검사하므로 정상 빌드에서는 도달하지 않는다.)
    if ((window as RuntimeApiWindow).__cdAppPaymentGuard?.installed !== true) {
      return nativeAppStoreFailure(
        "APP_PAYMENT_GUARD_MISSING",
        "앱 결제를 준비하지 못했습니다. 앱을 다시 시작해 주세요.",
      );
    }

    const appAmountKRW = await fetchAppStoreAmountKRW(input, featureKey);
    // fail-closed: 앱가를 확인 못 했으면 웹가를 띄우지 않는다. 틀린 금액을 보여주느니
    // 재시도를 안내하는 편이 낫다(사용자가 3,000원인 줄 알고 눌렀는데 3,900원이 청구된다).
    if (appAmountKRW === null) {
      return nativeAppStoreFailure(
        "APP_STORE_PRICE_UNAVAILABLE",
        "앱 결제 금액을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
    // Play 최저가를 밑도는 저가 콘텐츠는 앱에서 무료다 — 결제창을 띄우지 않는다.
    if (appAmountKRW === 0) return runAppStoreFreeGrant(input, featureKey, context.requestId);
    amountKRW = appAmountKRW;
  }
  const reason = toText(input.reason || featureKey);
  const membershipCoverage = buildRuntimeMembershipCoverage(context.eligibility);
  // 이용권 선검사 결론이 이미 '미커버'로 확정된 경우들. 이게 참이면 레거시 런타임에게
  // disablePassFirst 를 넘겨 **같은 검사를 한 번 더 돌리지 않게** 한다(아래 주석 참고).
  const passAlreadyChecked = Boolean(context.eligibility && !isSubscriptionSnapshotEligibility(context.eligibility));
  const snapshotAlreadySaysNoPass = context.snapshotSaysNoPass === true;
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
      reportId: input.reportId,
      sessionId: input.sessionId,
      reportSessionId: input.reportSessionId || input.sessionId,
      profileId: input.profileId,
      selectedProfileId: input.selectedProfileId || input.profileId,
      profileCardId: input.profileCardId || input.profileId,
      actionType: input.actionType,
      profileAction: input.profileAction,
      action: input.action,
      purchaseId: input.purchaseId,
      idempotencyKey: input.idempotencyKey || context.requestId,
      orderId: input.orderId || context.requestId,
      membershipCoverage: membershipCoverage || undefined,
      monthlyBalance: context.eligibility?.monthly.balance,
      membershipCreditBalance: context.eligibility?.monthly.balance,
      canUseByMonthly: context.eligibility?.monthly.canUse,
      paymentOptions: runtimePaymentOptions,
      equalPriorityMethods: runtimePaymentOptions.equalPriorityMethods,
      recommendedMethods: runtimePaymentOptions.recommendedMethods,
      allowedPaymentModes: input.allowedPaymentModes,
      // 🔴 이중 이용권 프로브 방지. 스냅샷 즉시판정 경로에서는 eligibility 가 null 이라 passAlreadyChecked 가
      // false 였고, 그러면 레거시 런타임이 __cdApplyMembershipPassBeforePayment 로 **같은 검사를 또** 돌렸다
      // (6초 예산 + 재시도 2회). 지금까지는 런타임의 _dpResolveCertainPassMiss 가 같은 localStorage 스냅샷을
      // 우연히 똑같이 읽어 대개 넘어갔을 뿐이고, 한쪽 읽기가 어긋나면 프로브가 통째로 한 번 더 돌았다.
      // 새로 건너뛰는 검사는 없다 — 두 모듈이 이미 같은 근거로 같은 결론을 내던 것을 명시적으로 만든 것이다.
      disablePassFirst: input.disablePassFirst === true
        || snapshotAlreadySaysNoPass
        || (passAlreadyChecked && context.eligibility?.pass.canUse !== true),
      disablePassChoice: input.disablePassChoice === true,
      skipPassProbe: input.skipPassProbe === true,
      internalMainGate: true,
      // 🔴 이 호출은 언제나 runBillingCoinGate 의 paymentService.executePayment **안에서** 일어난다.
      // 런타임 래퍼(js/destiny-profile.js)가 같은 commandKey(method|requestId|productId|featureKey|profileId)
      // 로 경계를 한 번 더 열면, executePayment 가 in-flight 프로미스를 그대로 되돌려줘 서로를 기다리는
      // 순환 대기가 된다 — 타임아웃이 없어 결제창이 영영 안 뜨고 "결제 진행 중"에서 멈춘다(#326 회귀).
      // internalMainGate 를 재사용하지 않는 이유: 그 플래그는 런타임 내부 호출도 쓰고 있어 의미가 겹친다.
      __cdPaymentCommandActive: true,
      paymentMode: requestedMode || undefined,
      forceDirectPayment: requestedMode === "DIRECT_KRW",
      __cdDirectPaymentChoiceConfirmed: requestedMode === "DIRECT_KRW",
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

function parseRetryAfterMs(response: Response) {
  const value = String(response.headers.get("Retry-After") || "").trim();
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds * 1000));
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 0;
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
    retryAfterMs: parseRetryAfterMs(response),
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

/**
 * 앱(Capacitor) 런타임 판별 — 결제·표시 분기의 단일 진입점. 사본을 만들지 말 것.
 * 🔴 판정 규칙 자체는 js/core/app-context.js 가 소유한다(셸·독립 정적과 공유).
 */
export function isMobileAppRuntime() {
  return appContext.isApp();
}

/**
 * 앱 결제창에 표시할 금액(Play 확정가)을 서버에서 받아온다.
 *
 * 클라이언트가 값을 지어내면 결제창 금액과 Play 청구액이 어긋나므로 서버 가격표만 믿는다.
 *
 * 반환: 금액(원) | 0(앱에서 무료 전환된 저가 콘텐츠) | null(확인 실패 → 호출부가 fail-closed)
 */
// 앱 스토어 가격은 Play에 등록된 정적 테이블이라 세션 내내 변하지 않는다.
// featureKey 조합별로 한 번만 조회해 캐시하면 유료 기능 클릭→결제창 경로의 RTT가 사라진다.
// (성공값 0/양수만 캐시 — 실패(null)는 다음에 재시도되도록 캐시하지 않는다.)
const _appStoreAmountCache = new Map<string, number>();
const _appStoreAmountInflight = new Map<string, Promise<number | null>>();

function appStorePriceQuery(input: BillingCoinGateInput, featureKey: string): string {
  return toQuery({
    featureKey,
    categoryKey: input.categoryKey,
    subFeatureKey: input.subFeatureKey,
    reason: input.reason,
    productType: input.productType,
  });
}

async function fetchAppStoreAmountKRW(input: BillingCoinGateInput, featureKey: string): Promise<number | null> {
  const query = appStorePriceQuery(input, featureKey);
  const cached = _appStoreAmountCache.get(query);
  if (cached !== undefined) return cached;
  const inflight = _appStoreAmountInflight.get(query);
  if (inflight) return inflight;
  const task = (async (): Promise<number | null> => {
    try {
      const response = await authFetchBilling(`/api/app-store/products?${query}`, { method: "GET" });
      const parsed = await parseBillingResponse<{
        product?: { amountKRW?: number; freeInApp?: boolean };
      }>(response);
      if (!parsed.ok || !parsed.data?.product) return null;
      if (parsed.data.product.freeInApp === true) {
        _appStoreAmountCache.set(query, 0);
        return 0;
      }
      const amountKRW = Math.floor(toNumber(parsed.data.product.amountKRW, 0));
      if (amountKRW > 0) {
        _appStoreAmountCache.set(query, amountKRW);
        return amountKRW;
      }
      return null;
    } catch (error) {
      debugEntitlement("[billing] app store price lookup failed", error);
      return null;
    } finally {
      _appStoreAmountInflight.delete(query);
    }
  })();
  _appStoreAmountInflight.set(query, task);
  return task;
}

// 유료 기능 진입(마운트) 시 미리 앱가를 데워 둔다 — 클릭 시 RTT 없이 결제창이 바로 열린다.
export function warmAppStorePriceOnEntry(input: BillingCoinGateInput, featureKey?: string): void {
  try {
    if (!isMobileAppRuntime()) return;
    const key = toText(featureKey || input.featureKey || input.subFeatureKey);
    if (!key) return;
    void fetchAppStoreAmountKRW(input, key);
  } catch {
    /* noop */
  }
}

/**
 * 앱에서 무료로 전환된 저가 콘텐츠의 접근 허가.
 * 무료 판정은 서버 가격표가 한다 — 클라이언트 주장은 믿지 않는다.
 */
async function runAppStoreFreeGrant(
  input: BillingCoinGateInput,
  featureKey: string,
  requestId: string,
): Promise<BillingResult<BillingCoinGateData>> {
  const response = await authFetchBilling("/api/app-store/free-grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(input || {}),
      featureKey,
      requestId,
      idempotencyKey: input.idempotencyKey || requestId,
    }),
  });
  return parseBillingResponse<BillingCoinGateData>(response);
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
  // 🔴 이 레포에서 'subscription'·'이용권 결제' 는 월정석이 아니라 이용권이다
  // (useCoinGate 가 이용권 커버를 accessSource: "subscription" 으로 내보낸다).
  if (/subscription|구독|플랜|달빛 이용권 결제|이용권 결제/.test(haystack)) return "pass";
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
  if (kind === "monthly") return "subscription";
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
      "이 기능은 추가 결제 없이 이용할 수 있어요.",
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
    let paymentType = resolvePaymentTypeForWaitKind(kind, "pass");
    // 🔴 접근 확인 단계에서는 단건/카드 카피를 쓰지 않는다 — 아직 결제 수단이 확정되지 않은 구간이다.
    // 셸 _cdResolvePaymentWaitCopy 의 같은 분기와 동일 규칙(index.html 의 checkingEntitlement 분기).
    // 이 한 줄이 빠져 있어서 'PAYMENT CHECK · 결제 상태 확인 중 · 단건으로 카드 결제를 준비 중이에요'
    // 조합이 계속 되살아났다(#136 은 아래 opening/loadingProducts/readyToPay 분기만 고쳤다).
    // 방아쇠는 resolvePaymentWaitKind 의 /카드/ 매칭이라 타로·프로필 카드 계열이 전부 single 로 잡힌다.
    if (paymentType === "single") paymentType = "pass";
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
      mode: paymentType === "subscription" ? "monthly" : "card",
    };
  }
  if (status === "paymentWindowOpen") {
    const paymentType = resolvePaymentTypeForWaitKind(kind, "single");
    return {
      message: formatLoadingMessage("pg_processing", paymentType === "pass" ? "single" : paymentType),
      mode: paymentType === "subscription" ? "monthly" : "card",
    };
  }
  if (status === "opening" || status === "loadingProducts" || status === "readyToPay") {
    if (kind === "monthly") return { message: formatLoadingMessage("access_check", "subscription"), mode: "monthly" };
    if (kind === "unlock") return { message: text || "잠금 해제 준비 중입니다.", mode: "unlock-saving" };
    // 🔴 접근 확인 단계에서 access_check.single("단건으로 카드 결제를 준비 중이에요")을 쓰지 않는다.
    // 이 두 줄이 셸 오버레이로 중계돼 'PAYMENT CHECK · 결제 상태 확인 중 · 단건으로 카드 결제를
    // 준비 중이에요' 화면을 만들었다 — 셸 쪽 카피만 고치고 이 React 분기를 놓쳐서 여러 번 되살아났다.
    // 아직 결제 수단이 확정되지 않은 구간이므로 이용권 확인 카피로 통일한다. 실제 단건 진행 상태
    // (paymentPreparing/paymentWindowOpen/paymentProcessing)의 pg_processing.single 은 그대로다.
    return { message: formatLoadingMessage("access_check", "pass"), mode: "pass" };
  }
  if (status === "paymentProcessing") {
    if (kind === "pass") return { message: formatPassLoadingMessage("access_check", detail), mode: "pass" };
    if (kind === "monthly") return { message: formatLoadingMessage("pg_processing", "subscription"), mode: "monthly" };
    if (kind === "single") return { message: formatLoadingMessage("pg_processing", "single"), mode: "confirm" };
    if (kind === "unlock") return { message: text || "콘텐츠 잠금 해제를 반영하고 있습니다.", mode: "unlock-saving" };
    return { message: formatLoadingMessage("pg_processing", "single"), mode: "confirm" };
  }
  if (status === "paymentSuccess") {
    if (kind === "pass") return { message: formatPassLoadingMessage("result_loading", detail), mode: "pass-applied" };
    if (kind === "monthly") return { message: formatLoadingMessage("result_loading", "subscription"), mode: "payment-complete" };
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
  // 🔴 대기 화면 금지 구간(이용권 미커버 확정→결제창 노출 / 결제창이 떠 있는 동안 / 단건→PG창)에는
  // 띄우지 않는다. 판정 정본은 셸의 __cdPaymentWaitUiBlocked 하나이고(구현을 두 벌 두지 않는다),
  // 셸의 _cdSetCoinGateOverlay 안에도 같은 검사가 있지만 셸이 없는 화면에서는 아래 커스텀 이벤트
  // 경로로 나가므로 여기서도 봐야 한다.
  if (open && runtimeWindow.__cdPaymentWaitUiBlocked?.(overlayMode)) return;
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

/**
 * 이미 영구 해금한 콘텐츠인가 — **동기·왕복 0회**.
 *
 * 정본은 access-store 의 localStorage 스냅샷(js/core/access-store.js isUnlocked)이고, 그 스냅샷은
 * GET /api/me/access-state 로 채워진다(허용목록 없이 계정의 전 해금을 내려주는 유일한 엔드포인트).
 * 셸에는 isTileKeyUnlocked 라는 같은 역할의 로컬 판정이 있는데 React 게이트에는 그게 없어서,
 * 소유 확인을 서버 왕복 하나에만 의존하고 있었다 — 그 왕복이 꺼지는 조건이 하나라도 걸리면
 * 이미 산 콘텐츠에 결제창이 떴다.
 */
function readAccessStoreUnlocked(featureKey: string): boolean {
  const key = toText(featureKey);
  if (!key || typeof window === "undefined") return false;
  try {
    return (window as RuntimeApiWindow).CodeDestinyAccessStore?.isUnlocked?.(key) === true;
  } catch {
    return false;
  }
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
}, fetchOptions: { force?: boolean; revalidate?: boolean; phase?: PaymentEligibilityPhase; timeoutMs?: number } = {}): Promise<BillingResult<PaymentEligibility>> {
  const phase: PaymentEligibilityPhase = fetchOptions.phase === "pass" ? "pass" : "full";
  const knownPriceKRW = Math.max(0, Math.floor(toNumber(input.priceKRW ?? input.amountKRW, 0)));
  const knownCoinCost = Math.max(0, Math.floor(toNumber(input.coinCost ?? input.coinPrice, knownPriceKRW > 0 ? Math.ceil(knownPriceKRW / 100) : 0)));
  const hasServerLookupKey = Boolean(input.productId || input.serviceType || input.categoryKey || input.subFeatureKey || input.featureKey || input.reason);
  // revalidate: 로컬 스냅샷을 **지우지 않고** 서버 정본만 다시 읽는다. 응답이 오면 덮어쓰고, 실패하면
  // 기존 판정이 그대로 살아남는다. force 는 종전대로 선삭제 — 계정이 바뀐 경우처럼 낡은 값이 위험할 때만 쓴다.
  const skipLocalSnapshot = fetchOptions.force === true || fetchOptions.revalidate === true;
  if (fetchOptions.force === true) {
    clearSubscriptionSnapshotForUser();
    invalidateBillingBalanceCache();
  } else if (fetchOptions.revalidate === true) {
    invalidateBillingBalanceCache();
  }
  const snapshot = skipLocalSnapshot ? null : readSubscriptionSnapshotForUser();
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
  // unlock-status는 과금 없는 선검사다 — 기본 20초를 다 쓰지 않고 선검사 상한(BILLING_PASS_PROBE_TIMEOUT_MS)으로 끊는다.
  // 결제창을 막고 기다리는 호출부는 더 짧은 예산을 넘긴다(GATE_PASS_PROBE_TIMEOUT_MS).
  const detectedAccessStore = typeof window !== "undefined"
    ? (window as RuntimeApiWindow).CodeDestinyAccessStore
    : undefined;
  const accessStore = typeof detectedAccessStore?.getAccessDecision === "function"
    ? detectedAccessStore
    : {
      getAccessDecision: async (options: Record<string, unknown>) => {
        const { force: _force, revalidate: _revalidate, timeoutMs, ...requestInput } = options;
        const query = toQuery(requestInput);
        const response = await authFetchBilling(
          `/api/billing/unlock-status${query ? `?${query}` : ""}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          },
          {
            timeoutMs: Math.max(1000, Math.floor(Number(timeoutMs) || BILLING_PASS_PROBE_TIMEOUT_MS)),
            clientSource: "app:billing-client-access-store-fallback",
          },
        );
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        return {
          ok: Boolean(response.ok && payload && payload.ok === true),
          status: Number(response.status || 0),
          payload,
          code: toText(asRecord(payload.error)?.code || payload.code),
        };
      },
    };
  if (!accessStore?.getAccessDecision) {
    return {
      ok: false,
      status: 503,
      data: null,
      message: billingClientText("billingClient.message.008"),
      error: { code: "ACCESS_STORE_UNAVAILABLE", message: billingClientText("billingClient.message.008") },
      raw: {},
    };
  }
  const decisionResult = await accessStore.getAccessDecision({
    ...input,
    scope: phase === "pass" ? "pass" : undefined,
    force: fetchOptions.force,
    revalidate: fetchOptions.revalidate,
    timeoutMs: Math.max(1000, Math.floor(Number(fetchOptions.timeoutMs) || BILLING_PASS_PROBE_TIMEOUT_MS)),
  });
  const payload = decisionResult.payload && typeof decisionResult.payload === "object" ? decisionResult.payload : {};
  const parsed: BillingResult<Record<string, unknown>> = {
    ok: decisionResult.ok === true && payload.ok === true,
    status: Number(decisionResult.status || 0),
    data: decisionResult.ok === true && payload.data && typeof payload.data === "object"
      ? payload.data as Record<string, unknown>
      : null,
    message: toText(payload.message) || (decisionResult.ok ? "요청이 성공했습니다." : billingClientText("billingClient.message.008")),
    error: decisionResult.ok === true
      ? null
      : {
        code: toText(decisionResult.code || (asRecord(payload.error)?.code) || payload.code || "SERVER_ERROR") || "SERVER_ERROR",
        message: toText(asRecord(payload.error)?.message || payload.message || billingClientText("billingClient.message.008")) || billingClientText("billingClient.message.008"),
      },
    raw: payload,
  };

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
  const passExpiresAt = passVerdict.normalizeDate(data.expiresAt ?? options.expiresAt ?? membershipPass?.expiresAt);
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
const SUBSCRIPTION_WARM_FAILURE_COOLDOWN_MS = 60_000;
let subscriptionWarmInFlight = false;
let subscriptionWarmBlockedUntil = 0;
let subscriptionWarmBlockedUserKey = "";
export async function warmSubscriptionSnapshotOnEntry(): Promise<void> {
  if (typeof window === "undefined" || subscriptionWarmInFlight) return;
  const warmUserKey = resolveAuthScopeFromUser(readSanitizedAuthUser()) || "guest";
  if (subscriptionWarmBlockedUserKey === warmUserKey && Date.now() < subscriptionWarmBlockedUntil) return;
  // 🔴 stale 스냅샷은 "있음"이 아니라 "갱신 대상"이다. 여기서 조기 반환하면 SWR 로 살려 둔 스냅샷이
  // 영영 갱신되지 않고 상한(none 24시간 / active 이용권 만료일)까지 굳는다.
  const warmCached = readSubscriptionSnapshotForUser();
  if (warmCached && warmCached.stale !== true) return; // 이미 신선한 스냅샷 보유 → 재요청 불필요.
  subscriptionWarmInFlight = true;
  try {
    const result = await fetchPaymentEligibility(
      { featureKey: "membership-status-refresh", reason: "app-entry" },
      { phase: "full" },
    );
    if (result.ok) {
      subscriptionWarmBlockedUntil = 0;
      subscriptionWarmBlockedUserKey = "";
    } else if (result.status === 503 || result.status === 504) {
      subscriptionWarmBlockedUserKey = warmUserKey;
      subscriptionWarmBlockedUntil = Date.now() + Math.max(
        SUBSCRIPTION_WARM_FAILURE_COOLDOWN_MS,
        Number(result.retryAfterMs) || 0,
      );
    }
  } catch {
    subscriptionWarmBlockedUserKey = warmUserKey;
    subscriptionWarmBlockedUntil = Date.now() + SUBSCRIPTION_WARM_FAILURE_COOLDOWN_MS;
  } finally {
    subscriptionWarmInFlight = false;
  }
}

// 게이트 입력 → unlock-status 조회 입력 매핑 정본. runBillingCoinGate 와 프리페치가 **같은 매핑**을
// 써야 캐시 키(resolvePaymentEligibilityCacheKey)가 일치해 프리페치가 실제로 재사용된다.
function buildEligibilityInput(input: BillingCoinGateInput) {
  return {
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
}

// 🔴 유료 클릭의 첫 순간에 이용권 판정을 미리 시작한다. 각 기능은 `/api/<기능>/prepare`(서버가
// canAccessPaidFeature 로 이용권을 판정) 을 먼저 await 한 뒤에야 runBillingCoinGate 가
// unlock-status 를 물었다 — 같은 질문을 서버에 두 번, 그것도 직렬로 하던 구조다. 여기서 미리 쏘면
// 두 조회가 겹쳐 돌고, 실제 호출은 15초 캐시/in-flight dedup 에 히트해 왕복 1회가 사라진다.
// 실패해도 무시한다(실제 호출이 다시 묻는다). 읽기 전용 GET 이라 과금·상태 변화가 없다.
export function primePaymentEligibility(input: BillingCoinGateInput) {
  try {
    // 🔴 게이트가 읽지 않을 프리페치는 쏘지 않는다. 아래 runBillingCoinGate 는 `mayBeAlreadyUnlocked`
    // (= 과금 유형이 per-use 가 아님)일 때만 fetchPaymentEligibility 를 부른다 — per-use 는 '이미 해금'
    // 상태가 존재하지 않아 물어볼 게 없기 때문이다. 그런데 이 프리페치 호출부 11곳의 featureKey 가
    // 전부 per-use 라, 화면 진입마다 unlock-status 왕복 1회가 나가고 결과는 한 번도 소비되지 않았다.
    // 게이트와 같은 조건을 여기서 미리 적용해 그 왕복을 없앤다(조건이 어긋나면 안 되므로 표현을 맞춘다).
    // 구독 스냅샷 워밍은 이 조회의 부수효과가 아니라 warmSubscriptionSnapshotOnEntry 가 담당한다
    // (루트 레이아웃의 PaymentProcessingProvider 가 진입·인증변화·유휴·pointerdown 마다 호출).
    const featureId = toText(input.featureKey || input.subFeatureKey || input.categoryKey || "coin-gate");
    if (resolvePaidFeatureBillingType(input.featureKey || featureId) === "per-use") return;
    void fetchPaymentEligibility(buildEligibilityInput(input), { phase: "full" }).catch(() => null);
  } catch {
    // 프리페치는 실패해도 결제 흐름에 영향을 주지 않는다.
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
}, fetchOptions: { force?: boolean; revalidate?: boolean; phase?: PaymentEligibilityPhase; timeoutMs?: number } = {}): Promise<BillingResult<PaymentEligibility>> {
  const phase: PaymentEligibilityPhase = fetchOptions.phase === "pass" ? "pass" : "full";
  const cacheKey = `${phase}:${resolvePaymentEligibilityCacheKey(input)}`;
  const now = Date.now();
  // revalidate 도 응답 캐시는 건너뛴다(서버 정본을 다시 읽는 것이 목적). 다른 점은 스냅샷을 선삭제하지 않는다는 것뿐.
  if (fetchOptions.force === true || fetchOptions.revalidate === true) {
    paymentEligibilityRecent.delete(cacheKey);
    paymentEligibilityInFlight.delete(cacheKey);
  } else {
    const recent = paymentEligibilityRecent.get(cacheKey);
    if (recent && recent.expiresAt > now) return recent.result;
    if (recent) paymentEligibilityRecent.delete(cacheKey);
    const current = paymentEligibilityInFlight.get(cacheKey);
    if (current) return current;
  }

  const promise = fetchPaymentEligibilityUncached(input, { force: fetchOptions.force, revalidate: fetchOptions.revalidate, phase, timeoutMs: fetchOptions.timeoutMs });
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
  const { forceDeduct: _legacyForceDeduct, ...billingInput } = input;
  const response = await authFetchBilling("/api/billing/coin-gate/deferred/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...billingInput,
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
    const { forceDeduct: _legacyForceDeduct, ...billingInput } = input;
    const response = await authFetchBilling("/api/billing/coin-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...billingInput, paymentMode: "MEMBERSHIP_PASS", attemptId }),
    }, { timeoutMs: BILLING_PASS_PROBE_TIMEOUT_MS });
    const parsed = await parseBillingResponse<BillingCoinGateData>(response);
    // 🔴 월 한도 되쓰기는 성공 조기 반환보다 **앞**이다 — 성공 200 이 소비 **후** 잔여를 싣고 오고,
    // 402 는 잔여 0 을 싣는다. 활성 스냅샷에만 반영된다(buildSnapshotFromStatus 를 거치지 않는다).
    try { passVerdict.storeMonthlyQuotaFromPayload(resolveSubscriptionSnapshotUserId(), parsed.raw); } catch {}
    // 🔴 종료 반영은 잔여 되쓰기 **뒤**다 — 미보유로 내린 뒤에는 잔여 되쓰기가 no-op 이 된다.
    try { passVerdict.markPassEndedFromPayload(resolveSubscriptionSnapshotUserId(), parsed.raw); } catch {}
    if (parsed.ok && parsed.data) {
      invalidateBillingBalanceCache();
      normalizeBillingBalanceFields(parsed.data as BillingCoinGateData & Record<string, unknown>);
      emitBillingBalanceUpdated(parsed.data as BillingCoinGateData & Record<string, unknown>, "coin-gate");
      return;
    }
    const code = String(parsed.error?.code || "").toUpperCase();
    if (parsed.status === 402 || code === "MEMBERSHIP_PASS_NOT_COVERED" || code === "PAYMENT_REQUIRED") {
      // 🔴 402 를 무조건 "이용권 상태가 틀렸다"로 읽지 않는다. 낙관 잠금은 **전역 60초**라, 한도를 넘는
      // 기능(작명 300코인 > vvip 100) 하나가 402 를 받으면 한도 이내 기능 전부의 낙관 통과까지 같이 꺼졌다.
      // 스냅샷이 "활성이지만 이 가격은 한도 밖"이라고 이미 말하고 있으면 서버 402 는 스냅샷과 **일치**하는
      // 답이므로 고칠 것이 없다 — 이 경우엔 잠그지 않는다. 보유 상태가 실제로 어긋난 경우(스냅샷은 커버라는데
      // 서버는 거절)만 잠그고 세션·스냅샷을 정정한다.
      const snapshotAtDenial = readSubscriptionSnapshotForUser(undefined, { allowStaleNone: true });
      const deniedCoinCost = resolveKnownCoinCost(input, null);
      // 월 한도 소진 402 도 잠그지 않는다 — 위에서 스냅샷 잔여를 0 으로 되썼으므로 다음 판정은 스냅샷이 스스로 거절한다.
      const deniedByPassLimitOnly = code === "PRICE_EXCEEDS_PASS_LIMIT"
        || passVerdict.isMonthlyLimitPayload(parsed.raw)
        || Boolean(
          snapshotAtDenial
          && snapshotAtDenial.state === "active"
          && snapshotAtDenial.tier !== "family"
          && deniedCoinCost > passVerdict.passLimitForTier(snapshotAtDenial.tier),
        );
      if (!deniedByPassLimitOnly) {
        disableOptimisticPassBriefly();
        try {
          const { refreshAuth } = await import("./auth-store");
          void refreshAuth({ force: true, silent: true });
        } catch {}
        // 스냅샷은 지우지 않고 서버 정본으로 덮어쓰기만 한다(재조회 실패 시 기존 판정 유지).
        void fetchPaymentEligibility(
          { featureKey: "membership-status-refresh", reason: "pass-denied" },
          { revalidate: true },
        ).catch(() => null);
      }
    }
    // 5xx/degraded는 일시장애 — 무시(재시도 불필요).
  } catch {
    // 네트워크 실패 무시.
  }
}

// 낙관 pass 통과의 합성 grant. 스냅샷 fast-path와 "확인이 지연으로 끝난 경우" 두 곳이 같은 형태를 쓴다.
// 🔴 evidenceId/accessGrant/premiumAccessToken 을 넣지 말 것 — hasVerifiedBillingAccess 계열이 true가 되면
// '서버 검증된 결제'용 로컬 마킹이 열려, 검증 전에 해금이 기록된다. 잔액도 싣지 않는다(pass는 무료라 불변).
function buildOptimisticPassGrant(coinCost: number, featureKey: string, tier: string, transactionId: string): BillingResult<BillingCoinGateData> {
  return {
    ok: true,
    status: 200,
    data: {
      freeBySubscription: true,
      balance: null,
      pricing: { cost: coinCost, coinPrice: coinCost, featureKey },
      consume: { accessType: "membership_pass", accessMethod: "PASS", paymentMode: "MEMBERSHIP_PASS", featureKey, transactionId },
      subscriptionTier: tier,
    } as unknown as BillingCoinGateData,
    raw: {},
  } as BillingResult<BillingCoinGateData>;
}

function emitUnifiedPaymentSuccess(
  input: BillingCoinGateInput,
  result: BillingResult<BillingCoinGateData>,
  requestId: string,
) {
  if (!result.ok || !result.data || !hasVerifiedBillingAccess(result.data, input.featureKey || input.subFeatureKey)) return;
  const data = result.data as BillingCoinGateData & Record<string, unknown>;
  const consume = asRecord(data.consume);
  const accessGrant = asRecord(data.accessGrant) || {};
  const featureKey = toText(data.pricing?.featureKey || input.featureKey || input.subFeatureKey || input.categoryKey);
  const operationId = toText(
    accessGrant.operationId
    || accessGrant.evidenceId
    || accessGrant.transactionId
    || consume?.transactionId
    || data.transactionId
    || data.paymentId
    || data.purchaseId
    || requestId,
  );
  const applied = resolveAppliedBillingPayment(data, toText(input.paymentMode), false);
  // 🔴 서버가 선언하지 않은 해금을 만들지 않는다. 예전에는 응답에 unlockMap 이 없으면 결제한
  // featureKey 를 넣어 줬는데, 회당 결제 응답은 원래 unlockMap 을 안 싣는다(그게 정상이다).
  // 그래서 회당 결제가 낙관 해금(10분)으로 기록돼 다음 진입이 결제창 없이 통과했다.
  // 같은 파일의 optimistic-unlock-ledger 계약("회당 결제를 영구 해금으로 남기면 다음 이용이
  // 공짜가 되어 버린다")이 이미 이 규칙을 지키고 있었는데, 이 한 줄만 그걸 우회했다.
  const unlockMap = asRecord(data.unlockMap) || {};
  resolvePaymentService().reducePaymentSuccess({
    operationId,
    requestId,
    productId: toText(input.productId),
    featureKey,
    profileId: toText(input.profileId || input.selectedProfileId),
    method: applied.paymentMode,
    accessGrant,
    unlockMap: unlockMap as Record<string, boolean>,
    monthlyBalance: toNumber(data.monthlyStoneBalance ?? data.membershipCreditBalance ?? data.monthlyCredits, Number.NaN),
    snapshotPatch: {
      entitlementVersion: data.entitlementVersion,
      membershipPass: data.membershipPass,
      user: data.user,
    },
    completedAt: new Date().toISOString(),
  });
}

async function runBillingCoinGateInternal(input: BillingCoinGateInput): Promise<BillingResult<BillingCoinGateData>> {
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
  //
  // 🔴 예산이 붙은 이유(예전 주석은 "Promise.race 를 쓰지 말 것"이었다 — 전제가 바뀌었다):
  // 그 주석의 근거는 "useCoinGate 의 AUTH_REQUIRED 검사가 먼저 끊어 주므로 여기까지 오지 않는다"
  // 였다. 그런데 그 검사가 **느린 인증을 미인증으로 오인**해 로그인한 사용자를 막고 있어서,
  // "모름"이면 서버로 통과시키도록 고쳤다(useCoinGate 의 definitelySignedOut). 그 결과 이 await 가
  // 실제로 도달 가능해졌고, refreshAuth 는 /me → /refresh → /me 로 3연쇄가 되며 authFetch 는
  // AbortController 를 쓰지 않아 상한이 22초씩이다 — 무한정 기다리면 결제창이 1분 가까이 안 뜬다.
  // 경쟁 우려는 남지만 (1) refreshAuth 는 auth-store 에서 single-flight 라 새 요청을 만들지 않고
  // 기존 것에 합류하며 (2) silent:true 라 UI 를 흔들지 않고 (3) 최종 접근 판정은 어차피 서버다.
  try {
    const { getAuthState, refreshAuth } = await import("./auth-store");
    if (!getAuthState().isAuthenticated) {
      await Promise.race([
        refreshAuth({ force: true, silent: true }),
        new Promise<void>((resolve) => { window.setTimeout(resolve, BILLING_AUTH_PREHEAT_BUDGET_MS); }),
      ]);
    }
  } catch {
    // 인증 예열 실패는 삼킨다 — 최종 접근 판정은 서버가 한다.
  }

  // 앱: 앱스토어 가격 조회를 이용권 검사와 '동시에' 미리 데워 둔다. 결제창 진입 시점(runPaidServiceRuntimePayment)에는
  // 캐시 히트로 RTT가 사라져 유료 버튼 클릭→결제창 지연이 줄어든다(R2c 캐시 + R3c 병렬화).
  if (isMobileAppRuntime()) {
    try { void fetchAppStoreAmountKRW(input, toText(input.featureKey || input.subFeatureKey || featureId)); } catch { /* noop */ }
  }

  const activeAttempt = beginPaidAttempt({
    featureKey: featureId,
    mode: toText(input.reason || ""),
  });
  const gateRequestId = toText(input.requestId || activeAttempt.attemptId || inFlightKey);
  const snapshotVerdict = resolveSnapshotPassVerdict(input);
  const initialSnapshot = snapshotVerdict.snapshot;
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
    : (explicitDirectMode
      ? billingClientText("billingClient.message.022")
      : (passDisabled ? billingClientText("billingClient.message.021") : billingClientText("billingClient.message.005")));
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
    // 판정 정본은 resolveSnapshotPassVerdict 하나다(useCoinGate 의 대기 UI 스킵 판정과 같은 함수).
    const snapshotPassServerCheckFirst = snapshotVerdict.coversNow;
    // 무-이용권 즉시 모달(fast-path): 스냅샷이 '무이용권'(none) 또는 '가격>이용권한도'(active·초과)로 커버
    // 불가가 확실하면, 차단형 eligibility 서버 왕복을 건너뛰고 곧장 결제 런타임(모달)로 진입한다. 권위 검증은
    // 실제 결제(coin-gate forceDeduct) 시. 드문 stale-none 보유자는 결제창의 이용권 확인/상점 버튼으로 구제.
    const snapshotSaysNoPassFast = snapshotVerdict.cannotCover;
    const loadRuntimeGateForPayment = () => ((!explicitPaymentMode || explicitDirectMode) && input.forceDeduct !== false && typeof window !== "undefined"
      ? loadPaidServiceRuntimeGate().catch(() => null)
      : Promise.resolve(null));
    // 결제 런타임 스크립트 로드를 이용권 검사와 '동시에' 시작한다. 예전에는 사용 지점에서 await 해서
    // eligibility 응답이 온 뒤에야 스크립트를 받기 시작했고, 그 직렬 구간이 결제창 노출을 그만큼 늦췄다.
    // loadPaidServiceRuntimeGate 는 이미 멱등(중복 로드 방지)이라 미리 부르는 것이 안전하다.
    const runtimeGatePromise = loadRuntimeGateForPayment();
    const eligibilityInput = buildEligibilityInput(input);
    // 🔴 진입 이용권 선검사에 서버 왕복을 쓰지 않는다(2026-08 정책 전환, 셸 index.html 과 동일).
    // 판정 근거는 로컬 구독 스냅샷뿐이고, 스냅샷이 커버/미커버를 확답하지 못하면 기다리지 않고
    // 곧바로 결제창을 연다. 예전에는 여기서 /api/billing/unlock-status 를 기다렸고, 그 대기가 곧
    // 사용자가 결제창을 만나기까지의 지연이었다.
    // 이용권 확인은 결제창의 '이용권으로 구매' 카드가 그 자리에서 서버로 수행한다.
    // 단건 결제 선택은 이용권으로 자동 전환하지 않고 PortOne 경로를 그대로 따른다.
    //
    // 단, **영구 해금(unlock/pdf) 기능은 예외로 이 조회를 유지한다.** 이 조회는 이용권만 보는 게 아니라
    // "이미 해금한 콘텐츠인가"(access.canAccess)도 함께 답하는데, React 쪽에는 셸의 isTileKeyUnlocked 같은
    // 로컬 해금 상태가 없다. 빼 버리면 이미 구매한 콘텐츠를 다시 열 때 결제창이 뜬다. 회당 결제(per-use)는
    // 애초에 '이미 해금' 상태가 존재하지 않으므로 그대로 건너뛴다 — 전환 퍼널의 대부분이 여기 해당한다.
    //
    // 남아 있는 unlock/pdf 조회는 결제창을 '막고' 기다리므로 상한을 짧게 유지한다
    // (GATE_PASS_PROBE_TIMEOUT_MS). 예산을 넘겨 null 이 되어도 '미커버'로 단정하지 않는다 —
    // 아래 런타임 게이트의 이용권 재검사가 그대로 살아 있다(지연을 미커버 근거로 쓰지 않는다).
    const mayBeAlreadyUnlocked = resolvePaidFeatureBillingType(input.featureKey || featureId) !== "per-use";
    /* 🔴 소유는 **로컬 스냅샷에 먼저 묻는다**(왕복 0회). 이게 참이면 아래 조회 자체가 필요 없다. */
    const ownedFromSnapshot = mayBeAlreadyUnlocked && readAccessStoreUnlocked(input.featureKey || featureId);
    /* 🔴 snapshotSaysNoPassFast 를 스킵 조건에서 뺐다(2026-08-13).
       그건 "이용권이 없다"는 판정인데, 여기 조회는 이용권만이 아니라 **이미 샀는가**(access.canAccess)도
       함께 답한다. 이용권 없이 단건으로 산 사용자가 정확히 이 조건에 걸려, 재열람마다 결제창을 봤다.
       스냅샷이 소유를 알면 위에서 이미 걸러졌으므로, 여기까지 오는 것은 스냅샷이 모르는 경우
       (새 기기·시크릿창·저장소 삭제)뿐이고 그들에겐 이 조회가 유일한 구제 지점이다. */
    const eligibilityResult = ownedFromSnapshot || explicitPaymentMode || snapshotPassServerCheckFirst || !mayBeAlreadyUnlocked
      ? null
      : await fetchPaymentEligibility(eligibilityInput, { phase: "full", timeoutMs: GATE_PASS_PROBE_TIMEOUT_MS }).catch(() => null);
    const eligibility = eligibilityResult?.ok ? eligibilityResult.data : null;
    // 🔴 이용권 선검사가 '미커버'로 결론난 직후에는 대기 화면을 한 번 더 띄우지 않는다. 예전에는 여기서
    // status:"loadingProducts" 를 보냈고, 셸의 카피 해석기가 이를 access_check.single 로 매핑해
    // '결제 상태 확인 중 / 단건으로 카드 결제를 준비 중이에요' 화면을 띄웠다 — 이용권 확인 화면이
    // 끝난 뒤에 또 뜨는 그 화면이 정확히 이것이다. 미커버가 확정된 순간 할 일은 결제창을 여는 것뿐이므로
    // 중간 대기 UI를 없앤다(이용권 선검사 자체와 그 확인 화면은 그대로 유지된다).
    const knownCoinCost = resolveKnownCoinCost(input, eligibility);
    const accessAlreadyGranted = ownedFromSnapshot || eligibility?.access.canAccess === true;
    const passFirstEligible = explicitPassMode || snapshotPassServerCheckFirst || accessAlreadyGranted || (!passDisabled && eligibility?.pass.canUse === true);
    const passAccessEligible = !passDisabled && (explicitPassMode || snapshotPassServerCheckFirst || eligibility?.pass.canUse === true);
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
        holdPaidFeatureGateOpen({ requestId: gateRequestId, maxMs: 700 });
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
        window.setTimeout(emitOptimisticPassApplied, 150);
      } else {
        emitOptimisticPassApplied();
      }
      void recordMembershipPassInBackground(input, activeAttempt.attemptId);
      // payment-succeeded/callback 마커는 여기서 호출하지 않는다: 실제 결제(pass 적용·기록)는 백그라운드
      // coin-gate에서 서버 검증과 함께 일어나므로, 검증 전 성공 마킹은 부정확하고 verify 가드(검증→성공 순서)를
      // 위반한다. 낙관적 경로는 합성 grant만 반환하고, 이후 onPaid의 생성 마커가 진행 상태를 이어간다.
      // 잔액은 낙관적 응답에 싣지 않는다(user.points는 폐지된 레거시 코인이라 읽지 않음). pass는 무료라 잔액이
      // 변하지 않고, 백그라운드 coin-gate 성공 시 emitBillingBalanceUpdated가 서버 정본 잔액으로 UI를 갱신한다.
      return buildOptimisticPassGrant(knownInputCoinCost, optimisticFeatureKey, optimisticTier, `opt-pass-${gateRequestId}`);
    }
    // 🔴 이용권 선검사가 '미커버'로 결론나면 게이트를 아예 건드리지 않는다. 남은 할 일은 결제수단
    // 모달을 여는 것뿐이므로 중간 상태를 emit 하면 안 된다 — "loadingProducts" 는 '단건으로 카드
    // 결제를 준비 중이에요' 대기 화면을 띄웠고, "readyToPay" 는 '선택 대기 / 결제 상품 보기' 게이트
    // 패널을 띄운다(그 패널이 결제수단 모달과 번호 입력창까지 덮었다). 커버된 경우(hasEntitlement)
    // 에만 emit 해서 무료 통과 피드백은 그대로 남긴다.
    if (eligibility && (accessAlreadyGranted || (!passDisabled && eligibility.pass.canUse === true))) {
      const eligibilityStatus: PaidFeatureGateRuntimeStatus = "hasEntitlement";
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
        message: eligibilityOverlay.message,
        cost: eligibility.coinCost,
        paymentMode: eligibilityPaymentMode,
        reason: input.reason,
        accessType: !passDisabled && eligibility.pass.canUse === true ? "membership_pass" : (accessAlreadyGranted ? "already_unlocked" : ""),
        passTier: eligibility.pass.tier || "",
        subscriptionTier: eligibility.pass.tier || "",
      });
    }

    // 🔴 이용권 커버가 확인되지 않았으면 **무조건** 결제창을 연다. 예전 조건 (eligibility || snapshotSaysNoPassFast)
    // 은 "서버가 답했거나 스냅샷이 미커버를 확답한 경우"만 결제창을 열었고, 둘 다 아닌 경우(스냅샷 부재·만료)는
    // 아래 coin-gate 왕복으로 떨어져 402 를 받은 뒤에야 결제창이 떴다. 진입 선검사를 없앤 지금 그 경로는
    // 곧 "결제창 뜨기 전 서버 왕복 1회"라서, 미확인은 곧바로 결제창으로 보낸다.
    if (!explicitPaymentMode && !passFirstEligible && knownCoinCost > 0 && input.forceDeduct !== false) {
      markPaymentRequestedOnce();
      // 🔴 결제수단 모달을 열기 직전에는 게이트를 '열지' 않고 '닫는다'. 예전에는 여기서
      // status:"readyToPay" 를 emit 해 '선택 대기 / 결제 상품 보기' 패널이 떴고, 그 패널이
      // 결제수단 모달·휴대폰 번호 입력창 위에 남아 결제를 끝낼 수 없었다. 다음 화면(결제수단
      // 모달)이 곧바로 뜨므로 빈 화면 구간은 생기지 않는다.
      emitPaidFeatureGate("close", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        reason: input.reason,
      });
      const runtimePaymentResult = await runPaidServiceRuntimePayment(input, {
        featureId,
        requestId: gateRequestId,
        eligibility,
        runtimeGate: await runtimeGatePromise,
        snapshotSaysNoPass: snapshotSaysNoPassFast,
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
          recordUnlocksFromPaymentPayload(parsed.data);
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
    // 🔴 여기는 coin-gate 응답을 받기 "전"이다. 과거에는 pass 보유자에게 곧바로 hasEntitlement(=확인 완료)를
    // 표시했는데, PaidFeatureGateProvider의 자동 닫힘이 hasEntitlement/paymentSuccess에서만 돌기 때문에
    // 아직 왕복 중인 요청을 두고 오버레이가 800ms 뒤 닫혀 버렸다(= "확인 UI가 중간에 사라졌다가 한참 뒤 실행").
    // 확인이 끝나기 전에는 '확인 중' 상태를 유지하고, 진짜 hasEntitlement는 아래 성공 분기에서만 emit한다.
    // 🔴 사용자가 결제수단을 고르기 전에는 "결제 처리 중"을 띄우지 않는다. 여기는 아직 이용권 선검사
    // 구간이고 결제는 시작되지도 않았는데, 예전에는 미커버로만 보이면 곧바로 paymentProcessing
    // ("결제 처리 중 / 결제 승인과 이용 권한을 확인하고 있어요")으로 갈아탔다 — 사용자가 본
    // "이용권 확인 중이다가 갑자기 결제 진행 중"이 바로 이것이다. 명시 결제모드(=사용자가 이미
    // 단건/월정석을 고른 경우)에서만 결제 상태를 표시하고, 그 외에는 '이용권 확인'을 유지한다.
    const processingStatus: PaidFeatureGateRuntimeStatus = (passFirstEligible || !explicitPaymentMode)
      ? "checkingEntitlement"
      : "paymentProcessing";
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

    // 이 호출이 실제로 과금될 수 있으면(forceDeduct) 결제 확정용 상한(60초)을 그대로 둔다 — 낮추면 결제 사고다.
    // pass 커버 확인처럼 과금이 없는 호출만 선검사 상한(BILLING_PASS_PROBE_TIMEOUT_MS)으로 끊는다.
    const coinGateMayDeduct = explicitMonthlyMode || explicitDirectMode;
    const runCoinGateRequest = async () => {
      const {
        forceDeduct: _legacyForceDeduct,
        paymentMode: _legacyPaymentMode,
        ...billingInput
      } = input;
      const safeRequestedMode = requestedMode === "MEMBERSHIP_PASS"
        || requestedMode === "MOONLIGHT_STONE"
        || requestedMode === "DIRECT_KRW"
        ? requestedMode
        : "";
      const response = await authFetchBilling("/api/billing/coin-gate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...billingInput,
          paymentMode: passAccessEligible ? "MEMBERSHIP_PASS" : (safeRequestedMode || undefined),
          attemptId: activeAttempt.attemptId,
          // 서버 멱등 키. 서버(resolveRequestId)는 body.requestId/Idempotency-Key 헤더만 읽고, 없으면 요청마다
          // 난수를 만든다 — attemptId는 읽지 않는다. 주입하지 않으면 아래 재시도마다 purchaseId가 달라져
          // 원장 멱등 가드가 미스되고 월정석이 이중 차감된다. gateRequestId는 게이트 호출당 1회 고정이라
          // (재시도 내 안정 · 게이트마다 신규) 정적 게이트의 requestId와 같은 의미 스코프를 가진다.
          requestId: gateRequestId,
        }),
      }, coinGateMayDeduct ? {} : { timeoutMs: BILLING_PASS_PROBE_TIMEOUT_MS });
      return parseBillingResponse<BillingCoinGateData>(response);
    };

    /* 🔴 월정석 409 만의 좁은 재시도. 위 "이 호출은 단발이다" 규칙의 **예외가 아니라 보완**이다 —
       그 규칙이 막는 것은 답이 확정된 POST 를 자동으로 다시 쏘는 것이고, 여기 409 는 확정된 답이
       아니다. 서버는 "차감이 아직 확정되지 않았다"는 뜻으로만 이 코드를 쓰며 retryable 로 표시한다
       (MOONSTONE_IN_PROGRESS · MOONSTONE_CONTENDED 가 이 하나로 접힌다). 세 경우 모두 **아무것도
       차감되지 않은 상태**다.

       🔴 requestId 를 재발급하지 않는 것이 이 재시도의 안전 근거 전부다. gateRequestId 는 게이트
       호출당 1회 고정이고 그 값이 원장 sourceId 라, 형제 요청이 이미 차감을 끝냈으면 서버가 그
       결과를 replayed 로 돌려준다. 새 키로 다시 부르면 원장 행이 따로 생겨 **두 번 차감된다** —
       서버가 이 상황에서 402 가 아니라 409 를 내는 이유가 정확히 그것이다.

       이걸 넣기 전에는 월정석 409 가 dead-end 였다. 아래 결제창 폴백은 explicitPaymentMode 인
       월정석을 애초에 제외하므로(그 조건이 맞다 — 사용자가 이미 수단을 골랐다), 재시도가 없으면
       확정 실패로 끝났다. 정적 셸(_cdRunMonthlyCreditGate)은 처음부터 같은 계약이었고 이제 셋이
       같다(3회 · 250ms 배수 대기 · 동일 requestId). */
    const MOONSTONE_IN_PROGRESS_MAX_ATTEMPTS = 3;
    const isMoonstoneRetryable = (result: BillingResult<BillingCoinGateData>) => (
      result.status === 409
      || String(result.error?.code || "").trim().toUpperCase() === "MONTHLY_CREDIT_CONSUME_IN_PROGRESS"
    );
    const runMoonstoneRequestWithRetry = async () => {
      let result = await runCoinGateRequest();
      for (let attempt = 1; attempt < MOONSTONE_IN_PROGRESS_MAX_ATTEMPTS; attempt += 1) {
        if (result.ok || !isMoonstoneRetryable(result)) break;
        await new Promise<void>((resolve) => { globalThis.setTimeout(resolve, 250 * attempt); });
        result = await runCoinGateRequest();
      }
      return result;
    };

    // 🔴 이 호출은 **단발이다. 자동 재시도하지 않는다** (주석 정정 2026-08-08 — 예전 주석은 "짧게
    // 재시도한다"고 적혀 있었지만 재시도 코드는 이미 제거된 뒤였다). 이 POST 는 월정석/단건 모드에서
    // 실제 과금을 확정하므로 자동 재요청은 결제 사고 위험이고, verify:paid-gate-ui 와
    // verify:coin-gate-degraded-preview 가 재시도 부활을 막는다.
    // degraded-503 이 남으면 아래 else 의 shouldOpenRuntimePaymentFallback 이 결제창(단건+월정석)을
    // 열어 dead-end 를 막고, 이용권 보유자의 무료 통과 기회는 그 결제창의 '이용권으로 구매' 카드가
    // 살린다(그 경로만 무과금이라 1회 재시도를 갖는다 — js/destiny-profile.js).
    // DIRECT_KRW를 이미 고른 뒤에는 coin-gate 402를 한 번 더 받을 이유가 없다.
    // 선택한 단건 결제의 checkout 경로로 곧바로 넘긴다.
    const parsed: BillingResult<BillingCoinGateData> = explicitDirectMode
      ? {
          ok: false,
          status: 402,
          data: null,
          message: "단건 결제를 진행합니다.",
          error: { code: "PAYMENT_REQUIRED", message: "단건 결제를 진행합니다." },
          raw: {},
        }
      : (explicitMonthlyMode ? await runMoonstoneRequestWithRetry() : await runCoinGateRequest());

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
      recordUnlocksFromPaymentPayload(parsed.data);
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
      // 🔴 확인이 "지연"으로 끝난 것을 "미커버"로 세탁하지 않는다.
      // 로컬 근거(스냅샷/서버 eligibility)가 이용권 커버를 이미 확인했는데 서버 확인만 타임아웃·degraded로
      // 끝났다면, 사용자는 돈을 낼 이유가 없다 — 결제창 대신 낙관 통과시키고 기록은 백그라운드로 돌린다.
      // 확정 응답(402/401 등)은 아래 기존 분기가 그대로 처리하므로 여기서 걸리지 않는다.
      // pass는 무료라 금전 영향이 0이고, 서버 정본 판정은 백그라운드 coin-gate가 수행해 미커버(402)면
      // disableOptimisticPassBriefly()로 스스로 교정한다(스냅샷 fast-path와 동일한 위험 프로파일).
      if (
        passAccessEligible
        && !explicitPaymentMode
        && input.forceDeduct !== false
        && !isOptimisticPassTemporarilyDisabled()
        && !isDefinitiveBillingAnswer(parsed.status, code)
      ) {
        const degradedTier = eligibility?.pass.tier || initialSnapshot?.tier || "";
        const degradedFeatureKey = toText(input.featureKey || featureId);
        const degradedOverlay = resolvePaymentWaitOverlay("hasEntitlement", undefined, {
          paymentMode: "MEMBERSHIP_PASS",
          featureKey: featureId,
          reason: input.reason,
          accessType: "membership_pass",
          passTier: degradedTier,
          subscriptionTier: degradedTier,
        });
        holdPaidFeatureGateOpen({ requestId: gateRequestId, maxMs: 700 });
        emitPaidFeatureGate("update", {
          featureId,
          featureKey: featureId,
          requestId: gateRequestId,
          status: "hasEntitlement",
          message: degradedOverlay.message,
          paymentMode: "MEMBERSHIP_PASS",
          reason: input.reason,
          accessType: "membership_pass",
          passTier: degradedTier,
          subscriptionTier: degradedTier,
        });
        void recordMembershipPassInBackground(input, activeAttempt.attemptId);
        console.info("[paid-flow]", {
          stage: "PASS_COVERED_DEGRADED_OPTIMISTIC_GRANT",
          featureId,
          requestId: gateRequestId,
          probeStatus: parsed.status,
          probeCode: code,
        });
        return buildOptimisticPassGrant(knownCoinCost, degradedFeatureKey, degradedTier, `opt-pass-degraded-${gateRequestId}`);
      }
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
      const snapshotRefreshInput = {
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
      if (shouldInvalidateSubscriptionSnapshot(parsed.status, code)) {
        clearSubscriptionSnapshotForUser();
        void fetchPaymentEligibility(snapshotRefreshInput, { force: true }).catch(() => null);
      } else if (shouldRefreshSubscriptionSnapshotAfterDenial(parsed.status, code)) {
        // 🔴 삭제하지 않는다. 402 는 가격에 대한 답이라 보유 스냅샷을 버릴 근거가 못 되고, 여기서 지우면
        // 재조회가 실패했을 때 스냅샷이 영영 사라져 이후 모든 유료 클릭이 차단형 왕복이 된다(회귀 원인).
        void fetchPaymentEligibility(snapshotRefreshInput, { revalidate: true }).catch(() => null);
      }
      if ((!explicitPaymentMode || explicitDirectMode) && input.forceDeduct !== false && shouldOpenRuntimePaymentFallback(parsed.status, code)) {
        markPaymentRequestedOnce();
        // 위와 같은 이유로 결제수단 모달 직전에는 게이트를 닫는다(패널이 모달·번호 입력창을 덮지 않게).
        emitPaidFeatureGate("close", {
          featureId,
          featureKey: featureId,
          requestId: gateRequestId,
          reason: input.reason,
        });
        const runtimePaymentResult = await runPaidServiceRuntimePayment(withServerDeniedPricing(input, parsed), {
          featureId,
          requestId: gateRequestId,
          eligibility,
          runtimeGate: await runtimeGatePromise,
          snapshotSaysNoPass: snapshotSaysNoPassFast,
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
            recordUnlocksFromPaymentPayload(parsedRuntimePaymentResult.data);
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
      emitUnifiedPaymentSuccess(input, result, gateRequestId);
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

export async function runBillingCoinGate(input: BillingCoinGateInput): Promise<BillingResult<BillingCoinGateData>> {
  const requestId = toText(input.requestId || resolvePaidFeatureInFlightKey(input));
  const method = normalizePaymentMode(input.paymentMode) || "PAYMENT_GATE";
  return resolvePaymentService().executePayment({
    method,
    requestId,
    productId: toText(input.productId),
    featureKey: toText(input.featureKey || input.subFeatureKey || input.categoryKey),
    profileId: toText(input.profileId || input.selectedProfileId),
  }, () => runBillingCoinGateInternal({ ...input, requestId })) as Promise<BillingResult<BillingCoinGateData>>;
}

/** Neutral paid-access API. The legacy name remains for source compatibility. */
export async function runPaidAccessGate(input: BillingCoinGateInput): Promise<BillingResult<BillingCoinGateData>> {
  return runBillingCoinGate(input);
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
  return runPaidAccessGate(input as Parameters<typeof runPaidAccessGate>[0]);
}

export async function fetchBillingBalance(options: { force?: boolean; emit?: boolean; fresh?: boolean; clientSource?: string; moonlightStoneOnly?: boolean } = {}): Promise<BillingResult<{
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
  // moonlightStoneOnly(?moonlightStone=1&compact=1)는 unlockedFeatures/unlockMap이 비어 오는 다른 응답
  // shape이다 — user-session-cache.ts의 부트스트랩(full) 호출과 같은 캐시 키를 쓰면 교차 히트로
  // 한쪽이 다른 쪽의 응답을 잘못 받아먹는다(worker/routes/billing.js의 과거 네임스페이스 사고와 동일 클래스).
  // 그래서 이 variant만 별도 네임스페이스를 쓴다.
  const cacheKey = options.moonlightStoneOnly === true ? `${userKey}|compact` : userKey;
  if (options.force === true) invalidateBillingBalanceCache();
  // fresh(수동 재조회)는 이 유저의 balance 캐시만 좁게 버린다. 전역 invalidateBillingBalanceCache 는
  // 이용권 판정 캐시까지 함께 날려서, 재조회 한 번이 다음 유료 클릭의 6초 프로브를 콜드로 되돌린다.
  else if (options.fresh === true) billingBalanceRecentByUser.delete(cacheKey);
  const now = Date.now();
  const recent = billingBalanceRecentByUser.get(cacheKey);
  if (recent && recent.expiresAt > now) {
    if (options.emit !== false) emitBillingBalanceUpdated(recent.result.data as Record<string, unknown> | null, "balance-cache");
    return recent.result;
  }
  const pending = billingBalanceInFlightByUser.get(cacheKey);
  if (pending) return pending;

  const cacheVersion = billingBalanceCacheVersion;
  const inFlightPromise = (async () => {
    // fresh=1은 서버의 표시용 잔량 캐시를 우회한다(수동 "재조회"에서만 사용). 자동 조회는 캐시를 허용해 빠르게 응답.
    // moonlightStone=1&compact=1은 셸/독립 정적 폴백과 같은 경량 경로(worker: includeUnlocks:false)를 타고,
    // degraded 시에도 200+degraded 로 조용히 폴백하지 않고 503 BALANCE_SNAPSHOT_UNAVAILABLE로 표면화된다.
    const balanceParams = options.moonlightStoneOnly === true ? "moonlightStone=1&compact=1" : "";
    const freshParam = options.fresh === true ? "fresh=1" : "";
    const balanceQuery = [balanceParams, freshParam].filter(Boolean).join("&");
    const balanceUrl = balanceQuery ? `/api/billing/balance?${balanceQuery}` : "/api/billing/balance";
    const response = await authFetchBilling(balanceUrl, { method: "GET" }, {
      clientSource: options.clientSource || "app:billing-client",
    });
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
        billingBalanceRecentByUser.set(cacheKey, {
          result: parsed,
          expiresAt: Date.now() + BILLING_BALANCE_RECENT_TTL_MS,
        });
      }
    }

    return parsed;
  })().finally(() => {
    if (cacheVersion === billingBalanceCacheVersion) billingBalanceInFlightByUser.delete(cacheKey);
  });

  billingBalanceInFlightByUser.set(cacheKey, inFlightPromise);
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
