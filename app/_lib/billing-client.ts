import { authFetch } from "@/app/_lib/auth-client";
import { normalizeBaseUrl } from "@/app/_lib/api-config";
import { readSanitizedAuthUser, resolveAuthScopeFromUser } from "@/app/_lib/auth-storage";
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
type PaymentChoiceMode = "direct" | "monthly" | "pass" | "pass-store" | "cancel";
type PaymentChoiceFunction = ((options: Record<string, unknown>) => Promise<PaymentChoiceMode> | PaymentChoiceMode) & {
  __cdSupportsPassChoice?: boolean;
  __cdReactFallback?: boolean;
};

type RuntimeApiWindow = Window & {
  CODE_DESTINY_API_BASE_URL?: string;
  _cdSetCoinGateOverlay?: (show: boolean, message?: string, mode?: string) => void;
  _cdChooseServicePaymentMode?: PaymentChoiceFunction;
  _cdOpenPaidServiceGate?: PaidServiceRuntimeGate;
  __cdChooseServicePaymentModeCanonical?: PaymentChoiceFunction;
  __cdOpenChargeModal?: () => void;
  __cdRestoreCanonicalPaymentMode?: () => unknown;
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
  licenseTier?: string;
  licenseReason?: string;
  startedAt?: number;
};

type BillingCoinGateData = {
  pricing: BillingFeaturePricing;
  consume: Record<string, unknown>;
  accessGateResult?: AccessGateResult | null;
  licensePass?: AccessGateResult | null;
  membershipPass?: Record<string, unknown> | null;
  freeBySubscription?: boolean;
  balance: number | null;
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
  paymentMode?: string;
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

const BILLING_COIN_GATE_RECENT_TTL_MS = 1200;
const BILLING_BALANCE_RECENT_TTL_MS = 5000;
const PAYMENT_CHOICE_IN_FLIGHT_TTL_MS = 45000;
const PAYMENT_CHOICE_RECENT_TTL_MS = 1800;
export const PAID_SERVICE_RUNTIME_SRC = "/js/destiny-profile.js?v=build-4c7c95b72cf6";
const SUBSCRIPTION_SNAPSHOT_KEY_PREFIX = "cd_subscription_snapshot_v2::";
const SUBSCRIPTION_SNAPSHOT_ACTIVE_STATUSES = new Set(["active", "subscribed", "paid", "success", "succeeded", "complete", "completed", "confirmed", "approved"]);
const SUBSCRIPTION_SNAPSHOT_INACTIVE_STATUSES = new Set(["none", "free", "inactive", "expired", "canceled", "cancelled", "refunded", "failed", "paused"]);

const BILLING_FEATURE_KEY_ALIASES: Record<string, string> = {
  saju_life_book_pdf: "premium-lifebook-report",
  saju_lifebook_pdf: "premium-lifebook-report",
  "premium-lifebook-report": "premium-lifebook-report",
  generatelifebook: "premium-lifebook-report",
  opensajulifebookbuilder: "premium-lifebook-report",
  premium_pdf_ziwei: "premium-ziwei-report",
  premium_pdf_ziwei_compat: "premium-ziwei-report-compat",
  "premium-pdf-ziwei": "premium-ziwei-report",
  premiumziweipdf: "premium-ziwei-report",
  gotoziweipremium: "premium-ziwei-report",
  premium_pdf_western_astrology: "premium-astrology-report",
  premium_pdf_western_astrology_compat: "premium-astrology-report-compat",
  gotoastrologypremium: "premium-astrology-report",
  premium_pdf_sukyo: "premium-sukuyo-report",
  premium_pdf_sukyo_compat: "premium-sukuyo-report-compat",
  gotosukuyopremium: "premium-sukuyo-report-compat",
  premium_pdf_vedic: "premium-vedic-report",
  premium_pdf_vedic_compat: "premium-vedic-report-compat",
  gotovedicpremium: "premium-vedic-report",
  premium_pdf_saju_life_book: "premium-lifebook-report",
  "premium-saju-newyear-report": "saju_new_year_pdf",
  "premium-saju-newyear-report-compat": "saju_new_year_pdf",
  premium_pdf_saju_new_year: "saju_new_year_pdf",
  premium_pdf_saju_yearly: "saju_new_year_pdf",
  opensajunewyearmodal: "saju_new_year_pdf",
  generatesajunewyear: "saju_new_year_pdf",
  saju_love_book_pdf: "premium-love-secret-solo",
  sajulovebookpdf: "premium-love-secret-solo",
  premium_pdf_saju_love_secret: "premium-love-secret-solo",
  premium_pdf_saju_love_secret_compat: "premium-love-secret-couple",
  "premium-soul-origin-report": "premium_pdf_soul_origin",
  souloriginkarma: "premium_pdf_soul_origin",
  soul_origin_book: "premium_pdf_soul_origin",
  destiny_prayer_book: "premium_pdf_soul_origin",
  opensouloriginmodal: "premium_pdf_soul_origin",
  gotosouloriginpremium: "premium_pdf_soul_origin",
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
let billingBalanceInFlight: Promise<BillingResult<BillingBalanceData>> | null = null;
let billingBalanceRecent: { result: BillingResult<BillingBalanceData>; expiresAt: number } | null = null;
let billingBalanceCacheVersion = 0;
let paidServiceRuntimePromise: Promise<PaidServiceRuntimeGate | null> | null = null;
let reactPaymentChoiceInFlight: { promise: Promise<PaymentChoiceMode>; startedAt: number } | null = null;

function invalidateBillingBalanceCache() {
  billingBalanceCacheVersion += 1;
  billingBalanceRecent = null;
  billingBalanceInFlight = null;
}

function waitForBillingRetry(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
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

function normalizeBillingFeatureKey(value: unknown): string {
  const key = toText(value).toLowerCase();
  return BILLING_FEATURE_KEY_ALIASES[key] || key;
}

function normalizePaymentMode(value: unknown): string {
  const mode = toText(value).toUpperCase().replace(/[\s-]+/g, "_");
  if (mode === "MONTHLY_CREDIT" || mode === "MEMBERSHIP_CREDIT" || mode === "MOONLIGHTSTONE") return "MOONLIGHT_STONE";
  return mode;
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
  const nested = asRecord(record.subscription) || asRecord(record.membership) || {};
  const options = asRecord(record.paymentOptions) || {};
  const tier = normalizeSubscriptionSnapshotTier(
    record.tier
      ?? record.plan
      ?? record.planId
      ?? record.passTier
      ?? record.subscriptionTier
      ?? options.tier
      ?? options.passTier
      ?? options.subscriptionTier
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
  const state = tier !== "free" && !explicitInactive && (explicitActive || hasFutureExpiry) ? "active" : "none";
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
  const balance = Number(user?.monthlyCredits ?? user?.profileSubscription?.membershipCreditBalance ?? 0);
  return Number.isFinite(balance) && balance > 0 ? Math.floor(balance) : 0;
}

function buildSnapshotPaymentEligibility(input: {
  coinCost?: number;
  coinPrice?: number;
  priceKRW?: number;
  amountKRW?: number;
}, snapshot: SubscriptionSnapshot): BillingResult<PaymentEligibility> {
  const coinCost = Math.max(0, Math.floor(toNumber(input.coinCost ?? input.coinPrice, 0)));
  const priceKRW = Math.max(0, Math.floor(toNumber(input.priceKRW ?? input.amountKRW ?? coinCost * 100, 0)));
  const monthlyBalance = readSubscriptionSnapshotMonthlyBalance();
  const passLimit = snapshot.state === "active" ? subscriptionSnapshotPassLimit(snapshot.tier) : 0;
  const passTier = snapshot.state === "active" && snapshot.tier !== "free"
    ? snapshot.tier as PaymentEligibility["pass"]["tier"]
    : null;
  const canUseByPass = snapshot.state === "active" && passLimit > 0 && coinCost > 0 && coinCost <= passLimit;
  const paymentOptions = {
    hasActivePass: snapshot.state === "active",
    passTier,
    passLimit,
    freeLimit: passLimit,
    canUseByPass,
    monthlyBalance,
    canUseByMonthly: false,
    canUseByCard: true,
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
        balance: monthlyBalance,
        canUse: false,
        afterBalance: monthlyBalance,
      },
      card: {
        canUse: true,
        provider: "PORTONE_V2_KG_INICIS",
      },
      raw,
    },
    message: "",
    error: null,
    raw,
  };
}

function formatPaymentWon(amount: number): string {
  return `${Math.max(0, Math.floor(Number(amount || 0))).toLocaleString("ko-KR")}원`;
}

function formatCoinValueWon(amount: number): string {
  return formatPaymentWon(Math.max(0, Math.floor(Number(amount || 0))) * 100);
}

function formatMonthlyCreditValueWon(amount: number): string {
  return `${(Math.max(0, Math.floor(Number(amount || 0))) * 10).toLocaleString("ko-KR")}원 상당`;
}

function escapePaymentText(value: unknown): string {
  return toText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstFiniteMonthlyBalance(...sources: Array<Record<string, unknown> | null | undefined>): number {
  for (const source of sources) {
    if (!source) continue;
    const membership = asRecord(source.membership);
    const profileSubscription = asRecord(source.profileSubscription);
    const candidates = [
      source.monthlyBalance,
      source.monthlyCredits,
      source.membershipCreditBalance,
      membership?.monthlyBalance,
      membership?.monthlyCredits,
      membership?.membershipCreditBalance,
      profileSubscription?.monthlyBalance,
      profileSubscription?.monthlyCredits,
      profileSubscription?.membershipCreditBalance,
    ];
    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value) && value >= 0) return Math.floor(value);
    }
  }
  return 0;
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

async function fetchFreshBillingBalanceForPayment(): Promise<BillingResult<BillingBalanceData> | null> {
  const retryDelays = [0, 180, 420];
  for (let index = 0; index < retryDelays.length; index += 1) {
    if (retryDelays[index] > 0) await waitForBillingRetry(retryDelays[index]);
    const result = await fetchBillingBalance({ force: true, emit: false }).catch(() => null);
    const data = result?.ok ? result.data : null;
    const monthlyBalance = readBillingMonthlyBalance(data as Record<string, unknown> | null);
    if (result?.ok && data && data.authenticated !== false && data.degraded !== true && monthlyBalance !== null) {
      emitBillingBalanceUpdated(data as BillingBalanceData & Record<string, unknown>, "payment-balance-fresh");
      return result;
    }
  }
  return null;
}

function normalizeBillingBalanceFields(source: Record<string, unknown> | null | undefined) {
  if (!source) return;
  const user = asRecord(source.user);
  const balance = firstFiniteNonNegativeNumber(source.balance, user?.points);
  const monthlyBalance = readBillingMonthlyBalance(source);
  if (balance !== null) source.balance = balance;
  if (monthlyBalance !== null) {
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

function ensureReactPaymentChoiceStyles() {
  if (typeof document === "undefined" || document.getElementById("cd-react-payment-choice-style")) return;
  const style = document.createElement("style");
  style.id = "cd-react-payment-choice-style";
  style.textContent = `
    .cd-react-payment-choice-backdrop{position:fixed;inset:0;z-index:2147483004;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 2%,rgba(250,230,160,.2),transparent 30%),radial-gradient(circle at 16% 18%,rgba(147,197,253,.14),transparent 28%),radial-gradient(circle at 88% 74%,rgba(196,181,253,.16),transparent 30%),linear-gradient(145deg,rgba(7,11,34,.86),rgba(13,18,52,.88) 48%,rgba(21,16,42,.9));padding:18px;backdrop-filter:blur(16px) saturate(130%)}
    .cd-react-payment-choice-dialog{position:relative;isolation:isolate;width:min(440px,100%);max-height:calc(100dvh - 36px);border:1px solid rgba(255,242,184,.34);border-radius:24px;background:radial-gradient(circle at 50% -8%,rgba(250,230,160,.16),transparent 34%),radial-gradient(circle at 18% 20%,rgba(147,197,253,.1),transparent 32%),linear-gradient(155deg,rgba(7,12,34,.98),rgba(14,22,56,.985) 48%,rgba(33,24,64,.97));box-shadow:0 30px 82px rgba(0,0,0,.56),0 0 46px rgba(147,197,253,.14),0 0 34px rgba(250,230,160,.1),inset 0 1px 0 rgba(255,255,255,.16);padding:18px 20px 20px;color:#f8fafc;overflow:auto;overflow-x:hidden;scrollbar-width:thin}
    .cd-react-payment-choice-dialog>*{position:relative;z-index:1}
    .cd-react-payment-choice-dialog::before{content:"";position:absolute;right:-38px;top:-50px;width:166px;height:166px;border-radius:999px;background:radial-gradient(circle at 64% 35%,rgba(8,12,32,.96) 0 33%,transparent 34%),radial-gradient(circle at 38% 32%,rgba(255,242,184,.66) 0 18%,rgba(247,215,122,.28) 19% 38%,rgba(219,234,254,.09) 39% 66%,transparent 68%);filter:blur(.3px);opacity:.7;box-shadow:0 0 42px rgba(250,230,160,.16),0 0 70px rgba(147,197,253,.08);pointer-events:none;z-index:0}
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
    .cd-react-payment-choice-balance{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;border:1px solid rgba(147,197,253,.26);border-radius:14px;background:linear-gradient(135deg,rgba(8,47,73,.42),rgba(30,27,75,.34));padding:10px 11px;color:#dbeafe;font-size:12.5px;font-weight:800;line-height:1.45}
    .cd-react-payment-choice-balance[data-state="fresh"]{border-color:rgba(110,231,183,.36);color:#d1fae5;background:linear-gradient(135deg,rgba(6,78,59,.34),rgba(30,41,59,.32))}
    .cd-react-payment-choice-balance[data-state="error"]{border-color:rgba(248,113,113,.36);color:#fee2e2;background:linear-gradient(135deg,rgba(127,29,29,.34),rgba(30,41,59,.34))}
    .cd-react-payment-choice-refresh{flex:0 0 auto;border:1px solid rgba(255,242,184,.38);border-radius:999px;background:rgba(255,255,255,.1);padding:7px 10px;color:#fff7db;font-size:12px;font-weight:900;cursor:pointer}
    .cd-react-payment-choice-refresh:disabled{cursor:wait;opacity:.62}
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
    .cd-react-payment-choice-option strong{position:relative;display:block;margin-top:5px;font-size:15px;line-height:1.35;color:#fff}
    .cd-react-payment-choice-option span{position:relative;display:block;color:rgba(229,236,255,.78);font-size:12px;line-height:1.5}
    .cd-react-payment-choice-badge{display:inline-flex!important;width:auto;border:1px solid rgba(255,242,184,.28);border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(219,234,254,.07));backdrop-filter:blur(8px);padding:3px 9px;color:#fff7db!important;font-size:11px!important;font-weight:900;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 18px rgba(250,230,160,.08)}
    .cd-react-payment-choice-status{min-height:18px;margin-top:12px;color:#f3dd9a;font-size:13px;line-height:1.45}
    .cd-react-payment-choice-actions{display:flex;justify-content:flex-end;margin-top:14px}
    .cd-react-payment-choice-cancel{border:1px solid rgba(186,230,253,.28);border-radius:999px;background:rgba(255,255,255,.1);padding:9px 15px;color:#f8fafc;cursor:pointer;font-weight:900}
    @media(max-width:640px){.cd-react-payment-choice-backdrop{align-items:flex-start;padding:10px}.cd-react-payment-choice-dialog{width:100%;max-height:calc(100dvh - 20px);border-radius:20px;padding:12px}.cd-react-payment-choice-dialog::before{width:118px;height:118px;right:-30px;top:-42px;opacity:.58}.cd-react-payment-choice-visual{width:94px;height:78px;margin-bottom:6px}.cd-react-payment-choice-aura--outer{width:78px;height:78px}.cd-react-payment-choice-aura--inner{width:60px;height:60px}.cd-react-payment-choice-glass{left:15px;top:7px;width:64px;height:64px}.cd-react-payment-choice-crescent{left:29px;top:20px;width:39px;height:39px}.cd-react-payment-choice-crescent::before{left:15px;top:2px;width:38px;height:38px}.cd-react-payment-choice-title{font-size:20px}.cd-react-payment-choice-sub{font-size:12.5px;line-height:1.5}.cd-react-payment-choice-option{padding:12px 13px}.cd-react-payment-choice-option strong{font-size:14px}.cd-react-payment-choice-option span{font-size:11.5px}}
    @media(prefers-reduced-motion:reduce){.cd-react-payment-choice-visual{animation:none!important}.cd-react-payment-choice-option{transition:none}.cd-react-payment-choice-option:hover{transform:none}}
  `;
  document.head.appendChild(style);
}

async function openReactPaymentChoiceModal(options: Record<string, unknown>): Promise<PaymentChoiceMode> {
  const now = Date.now();
  if (reactPaymentChoiceInFlight && now - reactPaymentChoiceInFlight.startedAt < PAYMENT_CHOICE_IN_FLIGHT_TTL_MS) {
    return reactPaymentChoiceInFlight.promise;
  }

  const promise = openReactPaymentChoiceModalInner(options || {});
  reactPaymentChoiceInFlight = { promise, startedAt: now };
  return promise.finally(() => {
    globalThis.setTimeout(() => {
      if (reactPaymentChoiceInFlight?.promise === promise) reactPaymentChoiceInFlight = null;
    }, PAYMENT_CHOICE_RECENT_TTL_MS);
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
  const membershipCoverage = asRecord(opts.membershipCoverage);
  const optsMembership = asRecord(opts.membership);
  const optsProfileSubscription = asRecord(opts.profileSubscription);
  const coverageMembership = asRecord(membershipCoverage?.membership);
  const coverageProfileSubscription = asRecord(membershipCoverage?.profileSubscription);
  const knownMonthlyBalance = firstFiniteNonNegativeNumber(
    opts.monthlyBalance,
    opts.monthlyCredits,
    opts.membershipCreditBalance,
    optsMembership?.monthlyBalance,
    optsMembership?.monthlyCredits,
    optsMembership?.membershipCreditBalance,
    optsProfileSubscription?.monthlyBalance,
    optsProfileSubscription?.monthlyCredits,
    optsProfileSubscription?.membershipCreditBalance,
    membershipCoverage?.monthlyBalance,
    membershipCoverage?.monthlyCredits,
    membershipCoverage?.membershipCreditBalance,
    coverageMembership?.monthlyBalance,
    coverageMembership?.monthlyCredits,
    coverageMembership?.membershipCreditBalance,
    coverageProfileSubscription?.monthlyBalance,
    coverageProfileSubscription?.monthlyCredits,
    coverageProfileSubscription?.membershipCreditBalance,
  );
  let latestBalance = await fetchFreshBillingBalanceForPayment();
  let latestBalanceData = latestBalance?.ok ? latestBalance.data : null;
  let monthlyBalanceConfirmed = Boolean(latestBalanceData);
  const passDiscount = asRecord(membershipCoverage?.passDiscount);
  const discountFinalCoin = Math.max(0, Math.floor(toNumber(passDiscount?.finalCoinPrice, 0)));
  const directCoinPrice = passDiscount && discountFinalCoin > 0 ? discountFinalCoin : coinPrice;
  const rawDirectAmount = Math.max(0, Math.floor(toNumber(opts.amountKrw ?? opts.amountKRW, directCoinPrice * 100)));
  const directAmount = passDiscount && discountFinalCoin > 0 ? directCoinPrice * 100 : rawDirectAmount;
  let monthlyBalance = monthlyBalanceConfirmed
    ? firstFiniteMonthlyBalance(latestBalanceData)
    : Math.max(0, Math.floor(Number(knownMonthlyBalance || 0)));
  const requiredMonthlyCredits = passDiscount && discountFinalCoin > 0
    ? directCoinPrice * 10
    : Math.max(0, Math.floor(toNumber(opts.membershipCreditCost, directCoinPrice * 10)));
  let canUseMonthly = monthlyBalanceConfirmed && requiredMonthlyCredits > 0 && monthlyBalance >= requiredMonthlyCredits;
  const resolveMonthlyOptionHint = () => monthlyBalanceConfirmed
    ? (canUseMonthly
      ? "보유 보너스 가치로 즉시 이용 권한을 저장합니다."
      : `보너스 가치 부족 · 보유 ${formatMonthlyCreditValueWon(monthlyBalance)}`)
    : "최신 보너스 가치를 확인하지 못했습니다. 아래 버튼으로 다시 조회해 주세요.";
  const resolveMonthlyBalanceText = () => monthlyBalanceConfirmed
    ? `보너스 가치 확인 완료 · 현재 ${formatMonthlyCreditValueWon(monthlyBalance)}`
    : "최신 보너스 가치 확인이 필요합니다.";
  let monthlyOptionHint = resolveMonthlyOptionHint();
  const passTier = toText(membershipCoverage?.tier || membershipCoverage?.passTier || "");
  const passLimit = Math.max(0, Math.floor(toNumber(membershipCoverage?.passLimit ?? membershipCoverage?.freeLimit, 0)));
  const passLabel = passTier
    ? `${passTier.toUpperCase()} 이용권`
    : "이용권 확인 완료";
  const passHint = passLimit > 0
    ? `${formatCoinValueWon(passLimit)} 상한을 초과해 결제가 필요합니다.`
    : "이 기능은 이용권으로 바로 열 수 없어 결제가 필요합니다.";
  const passStoreTitle = passTier && passTier !== "free" ? "달빛 이용권 업그레이드" : "달빛 이용권 상점";
  const passStoreHint = passTier && passTier !== "free"
    ? "현재 이용권 한도를 넘는 기능입니다. 더 높은 달빛 이용권을 확인해 주세요."
    : "달빛 이용권을 구매하면 한도 이하 기능은 결제창 없이 바로 열립니다.";

  return new Promise((resolve) => {
    let settled = false;
    const previousOverflow = document.body.style.overflow;
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
        <h2 class="cd-react-payment-choice-title">달빛 결제 방식 선택</h2>
        <p class="cd-react-payment-choice-sub">이용권 확인이 끝났습니다. 달빛 아래 가장 알맞은 방식으로 콘텐츠를 열어주세요.</p>
        <p class="cd-react-payment-choice-note"><strong>${escapePaymentText(title)}</strong><br>${formatCoinValueWon(coinPrice)} 기준 · ${formatPaymentWon(directAmount)}</p>
        <div class="cd-react-payment-choice-balance" data-monthly-balance-status data-state="${monthlyBalanceConfirmed ? "fresh" : "error"}">
          <span data-monthly-balance-text>${escapePaymentText(resolveMonthlyBalanceText())}</span>
          <button type="button" class="cd-react-payment-choice-refresh" data-refresh-monthly-balance>잔여 가치 다시 조회</button>
        </div>
        <div class="cd-react-payment-choice-grid">
          <button type="button" class="cd-react-payment-choice-option" data-mode="direct">
            <span class="cd-react-payment-choice-badge">PortOne V2 · KG이니시스</span>
            <strong>단건 결제 · ${formatPaymentWon(directAmount)}</strong>
            <span>카드 또는 간편결제로 결제합니다. 결제 성공 후 서버 검증을 거쳐 열립니다.</span>
          </button>
          <button type="button" class="cd-react-payment-choice-option" data-mode="monthly" data-monthly-option${canUseMonthly ? "" : " disabled aria-disabled=\"true\""}>
            <span class="cd-react-payment-choice-badge">보너스 가치</span>
            <strong>보너스 가치 ${formatMonthlyCreditValueWon(requiredMonthlyCredits)} 사용</strong>
            <span data-monthly-hint>${escapePaymentText(monthlyOptionHint)}</span>
          </button>
          <button type="button" class="cd-react-payment-choice-option" data-mode="pass-store">
            <span class="cd-react-payment-choice-badge">${escapePaymentText(passLabel)}</span>
            <strong>${escapePaymentText(passStoreTitle)}</strong>
            <span>${escapePaymentText(passStoreHint)} ${escapePaymentText(passHint)}</span>
          </button>
        </div>
        <div class="cd-react-payment-choice-status" data-payment-status></div>
        <div class="cd-react-payment-choice-actions">
          <button type="button" class="cd-react-payment-choice-cancel" data-mode="cancel">취소</button>
        </div>
      </div>
    `;

    const close = (mode: PaymentChoiceMode) => {
      if (settled) return;
      settled = true;
      document.body.style.overflow = previousOverflow;
      modal.parentNode?.removeChild(modal);
      resolve(mode);
    };
    const setStatus = (message: string, error = false) => {
      const statusNode = modal.querySelector<HTMLElement>("[data-payment-status]");
      if (!statusNode) return;
      statusNode.textContent = message;
      statusNode.style.color = error ? "#fca5a5" : "#fde68a";
    };
    const applyMonthlyBalanceUi = () => {
      monthlyOptionHint = resolveMonthlyOptionHint();
      const monthlyButton = modal.querySelector<HTMLButtonElement>("[data-monthly-option]");
      const monthlyHint = modal.querySelector<HTMLElement>("[data-monthly-hint]");
      const balanceStatus = modal.querySelector<HTMLElement>("[data-monthly-balance-status]");
      const balanceText = modal.querySelector<HTMLElement>("[data-monthly-balance-text]");
      if (monthlyButton) {
        monthlyButton.disabled = !canUseMonthly;
        if (canUseMonthly) monthlyButton.removeAttribute("aria-disabled");
        else monthlyButton.setAttribute("aria-disabled", "true");
      }
      if (monthlyHint) monthlyHint.textContent = monthlyOptionHint;
      if (balanceStatus) balanceStatus.dataset.state = monthlyBalanceConfirmed ? "fresh" : "error";
      if (balanceText) balanceText.textContent = resolveMonthlyBalanceText();
    };
    const refreshMonthlyBalance = async () => {
      if (settled) return;
      const refreshButton = modal.querySelector<HTMLButtonElement>("[data-refresh-monthly-balance]");
      if (refreshButton) refreshButton.disabled = true;
      setStatus("보너스 가치를 다시 조회하고 있습니다.");
      latestBalance = await fetchFreshBillingBalanceForPayment();
      latestBalanceData = latestBalance?.ok ? latestBalance.data : null;
      monthlyBalanceConfirmed = Boolean(latestBalanceData);
      monthlyBalance = monthlyBalanceConfirmed
        ? firstFiniteMonthlyBalance(latestBalanceData)
        : Math.max(0, Math.floor(Number(knownMonthlyBalance || 0)));
      canUseMonthly = monthlyBalanceConfirmed && requiredMonthlyCredits > 0 && monthlyBalance >= requiredMonthlyCredits;
      applyMonthlyBalanceUi();
      setStatus(
        monthlyBalanceConfirmed
          ? `보너스 가치를 다시 확인했습니다. 현재 ${formatMonthlyCreditValueWon(monthlyBalance)}입니다.`
          : "보너스 가치 조회에 실패했습니다. 다시 시도해 주세요.",
        !monthlyBalanceConfirmed,
      );
      if (refreshButton) refreshButton.disabled = false;
    };
    const showWaitOverlay = (mode: PaymentChoiceMode) => {
      const runtimeWindow = window as RuntimeApiWindow;
      if (mode === "monthly") {
        runtimeWindow._cdSetCoinGateOverlay?.(true, "보너스 가치 적용 중입니다. 보너스 가치와 이용 권한을 확인하고 있습니다.", "monthly");
      } else if (mode === "direct") {
        runtimeWindow._cdSetCoinGateOverlay?.(false);
      }
    };

    document.body.style.overflow = "hidden";
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close("cancel");
    });
    modal.querySelector<HTMLButtonElement>("[data-refresh-monthly-balance]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void refreshMonthlyBalance();
    });
    modal.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = toText(button.dataset.mode) as PaymentChoiceMode;
        if (mode === "cancel") {
          close("cancel");
          return;
        }
        if (mode === "pass-store") {
          close("cancel");
          openMembershipPassStore(coinPrice, passTier);
          return;
        }
        if (button.disabled) {
          if (mode === "monthly") {
            setStatus(
              monthlyBalanceConfirmed
                ? "보너스 가치가 부족합니다. 단건 결제를 선택해 주세요."
                : "최신 보너스 가치를 확인하지 못했습니다. 다시 열어 주세요.",
              true,
            );
          }
          return;
        }
        modal.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((node) => {
          node.disabled = true;
        });
        setStatus(mode === "monthly" ? "보너스 가치를 적용하고 있습니다." : "단건 결제를 진행하고 있습니다.");
        showWaitOverlay(mode);
        close(mode);
      });
    });
    document.body.appendChild(modal);
    modal.querySelector<HTMLButtonElement>('[data-mode="direct"]')?.focus();
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

function hasVerifiedBillingAccess(data: unknown, expectedFeatureKey: unknown): boolean {
  const record = asRecord(data);
  if (!record) return false;
  const expectedFeature = normalizeBillingFeatureKey(expectedFeatureKey);
  const pricing = asRecord(record.pricing);
  const pricingFeature = normalizeBillingFeatureKey(pricing?.featureKey);
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
    if ((consume.accessType === "membership_pass" || consume.accessType === "already_unlocked") && (!expectedFeature || !consumeFeature || consumeFeature === expectedFeature)) return true;
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

function resolveKnownCoinCost(input: BillingCoinGateInput, eligibility: PaymentEligibility | null) {
  return Math.max(0, Math.floor(toNumber(
    eligibility?.coinCost
    ?? input.coinPrice
    ?? input.cost,
    0,
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
  const cost = Math.max(0, Math.floor(toNumber(rawPricing.coinPrice ?? rawPricing.cost ?? fallbackCost, 0)));
  const amountKRW = Math.max(0, Math.floor(toNumber(rawPricing.amountKRW ?? rawPricing.cashPrice ?? resolveKnownAmountKRW(input, eligibility, cost), 0)));

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
  if (requestedMode === "MEMBERSHIP_PASS" || requestedMode === "MOONLIGHT_STONE" || requestedMode === "DIRECT_KRW") return null;

  const runtimeGate = context.runtimeGate || await loadPaidServiceRuntimeGate();
  if (!runtimeGate) return null;

  const cost = resolveKnownCoinCost(input, context.eligibility);
  const amountKRW = resolveKnownAmountKRW(input, context.eligibility, cost);
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
    freeBySubscription: source.freeBySubscription === true || consumeAccessType === "membership_pass",
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
  const mode = normalizePaymentMode(input.paymentMode);
  const haystack = [input.status, input.message, input.paymentMode, input.featureKey, input.reason, input.accessType]
    .map((value) => toText(value).toLowerCase())
    .filter(Boolean)
    .join(" ");

  if (mode === "MEMBERSHIP_PASS" || /membership_pass|pass_applied|이용권 확인|이용권 적용|이용권으로|membership/.test(haystack)) return "pass";
  if (mode === "MOONLIGHT_STONE" || /\bmonthly_credit\b|membership_credit|moonlight_stone/.test(haystack)) return "monthly";
  if (mode === "DIRECT_KRW" || /direct_krw|one[-_ ]?time|single|단건|원화|카드|checkout/.test(haystack)) return "single";
  if (/subscription|구독|플랜|달빛 이용권 결제|이용권 결제/.test(haystack)) return "subscription";
  if (/unlock|잠금|해제|권한|premium|pdf|리포트/.test(haystack)) return "unlock";
  return "payment";
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
    coveredCoinPrice: Math.max(0, Math.floor(toNumber(explicit?.coveredCoinPrice ?? pricing.coinPrice ?? pricing.cost, 0))),
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
  });

  if (status === "checkingEntitlement") return { message: text || "이용권 확인 중입니다.", mode: "pass" };
  if (status === "hasEntitlement") return { message: text || "이용권 적용이 완료되었습니다.", mode: "pass-applied" };
  if (status === "paymentPreparing") return { message: text || "단건 결제창을 여는 중입니다. 주문 금액과 인증 정보를 안전하게 맞추고 있습니다.", mode: "card" };
  if (status === "paymentWindowOpen") return { message: text || "열린 결제창에서 카드 인증을 진행해 주세요. 인증이 끝나면 권한을 확인합니다.", mode: "card" };
  if (status === "opening" || status === "loadingProducts" || status === "readyToPay") {
    if (kind === "subscription") return { message: text || "원화 기준 이용권 결제 정보를 확인하고 있습니다.", mode: "subscription" };
    if (kind === "monthly") return { message: text || "보너스 가치 적용을 준비하고 있습니다.", mode: "monthly" };
    if (kind === "single") return { message: text || "원화 단건 결제창을 여는 중입니다. 주문 금액과 인증 정보를 안전하게 맞추고 있습니다.", mode: "card" };
    if (kind === "unlock") return { message: text || "잠금 해제 준비 중입니다.", mode: "unlock-saving" };
    return { message: text || "결제창을 열기 전 주문 정보를 확인하고 있습니다.", mode: "checkout" };
  }
  if (status === "paymentProcessing") {
    if (kind === "pass") return { message: text || "이용권을 적용하고 있습니다.", mode: "pass" };
    if (kind === "subscription") return { message: text || "원화 기준 이용권 결제 승인과 활성화를 확인하고 있습니다.", mode: "subscription" };
    if (kind === "monthly") return { message: text || "보너스 가치 적용 중입니다. 보너스 가치와 이용 권한을 확인하고 있습니다.", mode: "monthly" };
    if (kind === "single") return { message: text || "원화 단건 결제 승인과 콘텐츠 이용 권한을 확인하고 있습니다.", mode: "confirm" };
    if (kind === "unlock") return { message: text || "콘텐츠 잠금 해제를 반영하고 있습니다.", mode: "unlock-saving" };
    return { message: text || "결제 승인과 이용 권한을 확인하고 있습니다.", mode: "confirm" };
  }
  if (status === "paymentSuccess") {
    if (kind === "subscription") return { message: text || "원화 기준 이용권 활성화가 완료되었습니다.", mode: "payment-complete" };
    if (kind === "monthly") return { message: text || "보너스 가치로 콘텐츠 이용 권한을 열었습니다.", mode: "payment-complete" };
    if (kind === "single") return { message: text || "원화 단건 결제와 이용 권한 저장이 완료되었습니다.", mode: "payment-complete" };
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
    checkingEntitlement: "이용권 확인 중입니다.",
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
    status: "checkingEntitlement",
    message: "이용권과 기존 잠금 해제 내역을 확인하고 있습니다.",
  });
  const query = toQuery(input as Record<string, unknown>);
  const path = query ? `/api/billing/features?${query}` : "/api/billing/features";
  const response = await authFetchBilling(path, { method: "GET" });
  const parsed = await parseBillingResponse<{ pricing: BillingFeaturePricing }>(response);
  emitPaidFeatureGate("update", {
    featureId,
    featureKey: featureId,
    status: parsed.ok ? "checkingEntitlement" : "error",
    message: parsed.ok ? "이용권 적용 가능 여부를 확인하고 있습니다." : (parsed.error?.message || parsed.message || "상품 조회에 실패했습니다."),
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
  const knownCoinCost = Math.max(0, Math.floor(toNumber(input.coinCost ?? input.coinPrice, 0)));
  const knownPriceKRW = Math.max(0, Math.floor(toNumber(input.priceKRW ?? input.amountKRW, 0)));
  const snapshot = readSubscriptionSnapshotForUser();
  if (snapshot && (knownCoinCost > 0 || knownPriceKRW > 0)) {
    return buildSnapshotPaymentEligibility(input, snapshot);
  }
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
  saveSubscriptionSnapshotForUser(undefined, {
    ...data,
    ...options,
    tier: data.subscriptionTier ?? options.subscriptionTier ?? options.passTier ?? data.passTier,
    passTier: options.passTier ?? data.passTier,
    isActive: Boolean(options.hasActivePass ?? data.hasActivePass),
    hasActivePass: Boolean(options.hasActivePass ?? data.hasActivePass),
    expiresAt: data.expiresAt ?? options.expiresAt,
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

export async function runBillingCoinGate(input: BillingCoinGateInput): Promise<BillingResult<BillingCoinGateData>> {
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
      status: "checkingEntitlement",
      message: "최근 이용권 확인 요청을 안전하게 이어가고 있습니다.",
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
    const requestedMode = normalizePaymentMode(input.paymentMode);
    const explicitPassMode = requestedMode === "MEMBERSHIP_PASS";
    const explicitPaymentMode = explicitPassMode || requestedMode === "MOONLIGHT_STONE" || requestedMode === "DIRECT_KRW";
    const loadRuntimeGateForPayment = () => (!explicitPaymentMode && input.forceDeduct !== false && typeof window !== "undefined"
      ? loadPaidServiceRuntimeGate().catch(() => null)
      : Promise.resolve(null));
    const eligibilityResult = explicitPaymentMode
      ? null
      : await fetchPaymentEligibility({
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
      }).catch(() => null);
    const eligibility = eligibilityResult?.ok ? eligibilityResult.data : null;
    const knownCoinCost = resolveKnownCoinCost(input, eligibility);
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

    if (!explicitPaymentMode && !passFirstEligible && eligibility && knownCoinCost > 0 && input.forceDeduct !== false) {
      markPaymentRequestedOnce();
      emitPaidFeatureGate("update", {
        featureId,
        featureKey: featureId,
        requestId: gateRequestId,
        status: "readyToPay",
        message: "결제 가능한 상품을 확인해 주세요.",
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
          normalizeBillingBalanceFields(parsed.data as BillingCoinGateData & Record<string, unknown>);
          emitBillingBalanceUpdated(parsed.data as BillingCoinGateData & Record<string, unknown>, "coin-gate-runtime");
          markPaidAttemptPaymentSucceeded();
          markPaidAttemptCallbackReturned();
          const consume = asRecord(parsed.data.consume);
          const accessType = toText(consume?.accessType);
          const runtimeData = parsed.data as BillingCoinGateData & Record<string, unknown>;
          const licenseGate = extractLicenseGateResult(runtimeData);
          const licenseMessage = buildLicensePassOverlayMessage(runtimeData);
          const usagePassApplied = accessType === "usage_pass";
          const passApplied = runtimeData.freeBySubscription === true
            || accessType === "membership_pass"
            || accessType === "already_unlocked";
          const entitlementApplied = passApplied || usagePassApplied;
          const entitlementPaymentMode = usagePassApplied ? "USAGE_PASS" : (passApplied ? "MEMBERSHIP_PASS" : "DIRECT_KRW");
          const successOverlay = resolvePaymentWaitOverlay(entitlementApplied ? "hasEntitlement" : "paymentSuccess", licenseMessage || undefined, {
            paymentMode: entitlementPaymentMode,
            featureKey: featureId,
            reason: input.reason,
            accessType,
            licenseTier: licenseGate?.licenseTier,
            licenseReason: licenseGate?.reason,
          });
          emitPaidFeatureGate("update", {
            featureId,
            featureKey: featureId,
            requestId: gateRequestId,
            status: entitlementApplied ? "hasEntitlement" : "paymentSuccess",
            message: successOverlay.message,
            cost: parsed.data.pricing?.cost,
            paymentMode: entitlementPaymentMode,
            reason: input.reason,
            accessType,
            licenseTier: licenseGate?.licenseTier,
            licenseReason: licenseGate?.reason,
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
        message: "결제 선택창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.",
        cost: knownCoinCost,
        reason: input.reason,
      });
      return {
        ok: false,
        status: 503,
        data: null,
        message: "결제 선택창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.",
        error: {
          code: "PAYMENT_GATE_UNAVAILABLE",
          message: "결제 선택창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.",
        },
        raw: {},
      };
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
        paymentMode: passFirstEligible ? "MEMBERSHIP_PASS" : (requestedMode || input.paymentMode),
        forceDeduct: passFirstEligible ? false : input.forceDeduct,
        attemptId: activeAttempt.attemptId,
      }),
    });

    const parsed = await parseBillingResponse<BillingCoinGateData>(response);

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
      normalizeBillingBalanceFields(parsed.data as BillingCoinGateData & Record<string, unknown>);
      emitBillingBalanceUpdated(parsed.data as BillingCoinGateData & Record<string, unknown>, "coin-gate");
      markPaidAttemptPaymentSucceeded();
      markPaidAttemptCallbackReturned();
      const consume = asRecord(parsed.data.consume);
      const accessType = toText(consume?.accessType);
      const licenseGate = extractLicenseGateResult(parsed.data as BillingCoinGateData & Record<string, unknown>);
      const licenseMessage = buildLicensePassOverlayMessage(parsed.data as BillingCoinGateData & Record<string, unknown>);
      const passApplied = passFirstEligible || accessType === "membership_pass" || accessType === "already_unlocked";
      const successOverlay = resolvePaymentWaitOverlay(passApplied ? "hasEntitlement" : "paymentSuccess", licenseMessage || undefined, {
        paymentMode: passApplied ? "MEMBERSHIP_PASS" : requestedMode,
        featureKey: featureId,
        reason: input.reason,
        accessType,
        licenseTier: licenseGate?.licenseTier,
        licenseReason: licenseGate?.reason,
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
        licenseTier: licenseGate?.licenseTier,
        licenseReason: licenseGate?.reason,
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
  paymentMode?: string;
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
}) {
  return runBillingCoinGate(input as Parameters<typeof runBillingCoinGate>[0]);
}

export async function fetchBillingBalance(options: { force?: boolean; emit?: boolean } = {}): Promise<BillingResult<{
  authenticated: boolean;
  degraded?: boolean;
  balance: number;
  membershipCreditBalance?: number;
  monthlyCredits?: number;
  user: Record<string, unknown> | null;
  unlockedFeatures: string[];
  unlockMap: Record<string, boolean>;
}>> {
  if (options.force === true) invalidateBillingBalanceCache();
  const now = Date.now();
  if (billingBalanceRecent && billingBalanceRecent.expiresAt > now) {
    if (options.emit !== false) emitBillingBalanceUpdated(billingBalanceRecent.result.data as Record<string, unknown> | null, "balance-cache");
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
      normalizeBillingBalanceFields(parsed.data as BillingBalanceData & Record<string, unknown>);
      parsed.data.membershipCreditBalance = toNumber(parsed.data.membershipCreditBalance, 0);
      parsed.data.monthlyCredits = toNumber(parsed.data.monthlyCredits ?? parsed.data.membershipCreditBalance, 0);
      const cacheableBalance = parsed.data.authenticated !== false && parsed.data.degraded !== true;
      if (cacheableBalance && options.emit !== false) emitBillingBalanceUpdated(parsed.data as BillingBalanceData & Record<string, unknown>, "balance");
      if (cacheableBalance && cacheVersion === billingBalanceCacheVersion) {
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
