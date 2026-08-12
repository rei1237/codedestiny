"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MoonIcon, { type MoonPhase } from "@/components/ui/MoonIcon";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import WithdrawModal from "../components/WithdrawModal";
import { usePaymentProcessing } from "../components/PaymentProcessingContext";
import type { PaymentLoadingProps } from "../components/common/PaymentLoading";
import { getSubscriptionTierLabel } from "../components/subscriptionNotice";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";
import { PASS_MONTHLY_WON } from "@/lib/payment/pass-pricing";
import { PAYMENT_PIG_LOGO_URL } from "../components/common/PaymentPigVisual";
import SubscriptionStatusCard from "./SubscriptionStatusCard";
import { authFetch, clearClientAuthState } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { useAuthStore } from "../_lib/auth-store";
import { clearSubscriptionSnapshotForUser, saveSubscriptionSnapshotForUser } from "../_lib/billing-client";
import {
  clearMoonlightStoreSnapshot,
  fetchMoonlightStoreSnapshot,
  type MoonlightStoreSnapshot,
} from "../_lib/moonlight-store-snapshot";
import { checkoutEntryRuntime as checkoutEntry } from "@/app/_lib/legacy-core-runtime";
import { isAuthUserCacheVerified, persistSanitizedAuthUser, readSanitizedAuthUser, resolveAuthScopeFromUser } from "../_lib/auth-storage";
import { resolveMonthlyStoneBalance, resolveMonthlyStoneExpiresAt, formatMonthlyStoneExpiry } from "../_lib/monthly-stone";
import { describePaymentPhoneFailure, promptPaymentPhoneNumber } from "../_lib/payment-phone-prompt";
import { runAccessCheckWithTransientRetry } from "../_lib/consultationResultPolling";

type PaymentLoadingVariant = NonNullable<PaymentLoadingProps["variant"]>;

/* ══════════════════════════════════════════════════════════════════
   타입 정의
══════════════════════════════════════════════════════════════════ */

type AuthUser = {
  id?: string;
  userId?: string;
  _id?: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  role?: "user" | "admin";
  monthlyStoneBalance?: number;
  monthlyCredits?: number;
  profileSubscription?: {
    tier?: string;
    isActive?: boolean;
    expiresAt?: string | null;
    profileLimit?: number;
    durationMonths?: number;
    membershipCreditBalance?: number;
    membershipCreditGranted?: number;
    membershipCreditUsed?: number;
  };
};

type PointPackage = {
  id: string;
  title: string;
  amount: number;
  points: number;
  featureKey: string;
  description: string;
  productType: "paid_content" | "pdf_report";
};

type PaymentMethodOption = {
  id: string;
  label: string;
  logo: string;
  desc: string;
  group: "domestic" | "global";
};

type PrepareOrderResponse = {
  message?: string;
  order?: {
    merchantUid: string;
    paymentAmount: number;
    chargePoints?: number;
    coinPrice?: number;
    amountKRW?: number;
    productName: string;
    // 서버가 결제창용 구매자 정보를 주문 응답에 실어 보낸다(worker/routes/payments.js buildSinglePaymentCustomer).
    // 이걸 쓰면 결제창 직전의 GET /api/me/payment-phone 왕복이 통째로 사라진다.
    customer?: { fullName?: string; email?: string; phoneNumber?: string };
  };
};

type PrepareSubscriptionOrderResponse = {
  message?: string;
  order?: {
    merchantUid: string;
    customerUid: string;
    // 서버가 결제창용 구매자 정보를 주문 응답에 실어 보낸다(worker/routes/payments.js buildSinglePaymentCustomer).
    // 이걸 쓰면 결제창 직전의 GET /api/me/payment-phone 왕복이 통째로 사라진다.
    customer?: { fullName?: string; email?: string; phoneNumber?: string };
    tier: "standard" | "premium" | "vvip" | "family";
    planId: string;
    durationMonths: number;
    paymentAmount: number;
    productName: string;
    productType: "membership_pass";
    profileLimit: number;
    durationDays: number;
  };
};

// 결제방식 모달이 열릴 때 미리 돌려두는 이용권 결제 준비 1건.
// settled 는 "클릭 시점에 이미 준비가 끝났는가"를 판단해 불필요한 대기 오버레이를 건너뛰는 데 쓴다.
type SubscriptionPrepareAttempt = {
  status: number;
  data: PrepareSubscriptionOrderResponse & { ok?: boolean };
};

type SubscriptionPrepareEntry = {
  planId: string;
  method: string;
  idempotencyKey: string;
  settled: boolean;
  promise: Promise<SubscriptionPrepareAttempt>;
};

const KKULKKUL_POINTS_LOGO_PUBLIC_PATH = "/icons/app-logo-512.webp";
const KKULKKUL_POINTS_LOGO_URL = getAssetUrlFromPublicPath(KKULKKUL_POINTS_LOGO_PUBLIC_PATH);

type ConfirmResponse = {
  message?: string;
  idempotent?: boolean;
  user?: {
    id: string;
    points: number;
  };
  payment?: PaymentHistoryItem;
};

type SinglePaymentConfirmPayload = {
  impUid: string;
  merchantUid?: string;
  paymentAmount?: number;
  chargePoints?: number;
  paymentType?: "digital_content";
  productId?: string;
  featureKey?: string;
  productName?: string;
  paymentMethod?: string;
};

type PendingSinglePaymentConfirm = {
  payload: SinglePaymentConfirmPayload;
  fromRedirect: boolean;
};

type MonthlyCreditLedgerItem = {
  id: string;
  type: "MONTHLY_CREDIT_GRANT" | "MONTHLY_CREDIT_SPEND" | "MONTHLY_CREDIT_REFUND" | string;
  amount: number;
  beforeBalance?: number;
  afterBalance?: number;
  reason?: string;
  sourceId?: string;
  serviceKey?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
};

type ConfirmSubscriptionResponse = {
  message?: string;
  idempotent?: boolean;
  user?: {
    id: string;
    points: number;
  };
  subscription?: SubscriptionStatus & {
    source?: "card" | "pass" | "monthly_credit";
    customerUid?: string;
    paymentMethod?: string;
    nextBillingAt?: string | null;
    lastBillingStatus?: string;
    membershipCreditBalance?: number;
    membershipCreditCost?: number;
  };
  monthlyCredits?: number;
  monthlyCreditLedger?: MonthlyCreditLedgerItem | null;
};

type SubscriptionConfirmPayload = {
  impUid?: string;
  merchantUid?: string;
  tier: string;
  planId?: string;
  durationMonths: number;
  durationDays?: number;
  amount?: number;
  currency?: string;
  productType: string;
  customerUid?: string;
  paymentMethod?: string;
  requestId?: string;
};

type PendingSubscriptionConfirm = {
  payload: SubscriptionConfirmPayload;
  fromRedirect: boolean;
};

type PaymentHistoryItem = {
  id: string;
  impUid?: string;
  merchantUid?: string;
  paymentAmount: number;
  coinPrice?: number;
  membershipCreditCost?: number;
  chargedPoints: number;
  paymentMethod: string;
  paymentMethodLabel?: string;
  paymentType?: string;
  accessType?: string;
  status: "pending" | "paid" | "processing" | "success" | "fulfilled" | "retryable" | "failed" | "cancelled" | "refunded";
  createdAt?: string;
  updatedAt?: string;
  paidAt?: string;
  approvalNumber?: string | null;
  receiptUrl?: string | null;
  cancelledAt?: string | null;
  /** 이용권으로 커버돼 결제 없이 이용한 합성 행. 취소·영수증 대상이 아니다. */
  isPassAccess?: boolean;
  /** 이용권이 없었다면 냈을 정가(원). 합성 행에만 채운다. */
  passListPriceWon?: number;
};

/** /api/payments/me가 내려주는 이용권 혜택 흐름 기록(PointHistory) 중 주문 내역에 필요한 부분만. */
type PointHistoryEntry = {
  id?: string;
  featureKey?: string;
  reason?: string;
  createdAt?: string;
  accessMethod?: string;
  accessType?: string;
  coinPrice?: number;
  requestId?: string;
  passTier?: string;
};

/* ── 프로필 이용권 타입 ───────────────────────────────────────── */
type SubscriptionTier = "free" | "standard" | "premium" | "vvip" | "family";

type SubscriptionStatus = {
  tier:               SubscriptionTier;
  source?:            "card" | "pass" | "monthly_credit";
  isActive:           boolean;
  startedAt?:         string | null;
  expiresAt:          string | null;
  profileLimit:       number; // 0 = unlimited
  durationMonths?:    number;
  lowBalanceWarning?: boolean;
  cancelAtPeriodEnd?: boolean;
  cancelRequestedAt?: string | null;
  freeLimit?: number;
};

type SubscriptionPlan = {
  id:           string;
  tier:         "standard" | "premium" | "vvip" | "family";
  planId:       string;
  title:        string;
  wonPrice:     number;
  baseWonPrice: number;
  durationMonths: 1;
  productType:  "membership_pass";
  profileLimit: number | null; // null = unlimited
  freeUpTo:     number | null; // null = Family all-inclusive, number = normal paid-service pass limit
  theme:        "amber" | "rose" | "purple";
  features:     string[];
  badge?:       string;
};

type MeResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  // 서버가 User 문서를 못 읽고 안전 기본값을 돌려준 응답 표식. 이때의 잔량 0 은 계산 결과가 아니다.
  userFound?: boolean;
  source?: string;
  subscription?: Record<string, unknown> | null;
  subscriptions?: Record<string, unknown>[];
  data?: {
    balance?: number;
    payments?: PaymentHistoryItem[];
    transactions?: PointHistoryEntry[];
    degradedMonthlyCredits?: boolean;
    monthlyCredits?: number;
    membershipCreditBalance?: number;
    monthlyCreditLedgers?: MonthlyCreditLedgerItem[];
    historyDeferred?: boolean;
    storeSnapshot?: MoonlightStoreSnapshot;
    subscription?: Record<string, unknown> | null;
    subscriptions?: Record<string, unknown>[];
  };
  user?: {
    id: string;
    name: string;
    email: string;
    points: number;
    monthlyCredits?: number;
  };
  payments?: PaymentHistoryItem[];
  pointHistories?: PointHistoryEntry[];
  monthlyCreditLedgers?: MonthlyCreditLedgerItem[];
};

type PendingOrder = {
  merchantUid: string;
  paymentAmount: number;
  chargePoints?: number;
  coinPrice?: number;
  productId?: string;
  featureKey?: string;
  productName?: string;
  paymentMethod: string;
};

const PENDING_SINGLE_PAYMENT_CONFIRM_KEY = "fortune_pending_single_payment_confirm";

type PendingSinglePaymentSession = {
  impUid: string;
  merchantUid?: string;
};

function savePendingSinglePaymentSession(payload: PendingSinglePaymentSession) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_SINGLE_PAYMENT_CONFIRM_KEY, JSON.stringify(payload));
  } catch {
    /* sessionStorage can be unavailable in privacy-restricted browsers. */
  }
}

function readPendingSinglePaymentSession(): PendingSinglePaymentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_SINGLE_PAYMENT_CONFIRM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSinglePaymentSession;
    return parsed?.impUid ? parsed : null;
  } catch {
    return null;
  }
}

function clearPendingSinglePaymentSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_SINGLE_PAYMENT_CONFIRM_KEY);
  } catch {
    /* noop */
  }
}

type PendingSubscriptionOrder = {
  merchantUid: string;
  customerUid: string;
  tier: "standard" | "premium" | "vvip" | "family";
  planId?: string;
  durationMonths?: number;
  paymentMethod: string;
};

type PointStateStatus = "idle" | "loading" | "ready" | "error";

function getPaymentErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = Number((error as { status?: unknown }).status);
  return Number.isFinite(status) ? status : null;
}

function isUncertainSubscriptionConfirmError(error: unknown): boolean {
  return isUncertainPaymentConfirmError(error);
}

function isUncertainPaymentConfirmError(error: unknown): boolean {
  const status = getPaymentErrorStatus(error);
  return status === null || status === 408 || status === 425 || status === 429 || status >= 500;
}

type PaymentFailureReportPayload = {
  merchantUid?: string;
  impUid?: string;
  reasonCode: string;
  reasonMessage: string;
  paymentMethod?: string;
};

type PortOnePaymentResponse = {
  paymentId?: string;
  transactionType?: string;
  code?: string;
  message?: string;
  error_msg?: string;
  errorMsg?: string;
};

type PortOnePaymentConfig = {
  ok?: boolean;
  provider?: string;
  pg?: string;
  storeId: string;
  channelKey: string;
  noticeUrl?: string;
  currency?: "CURRENCY_KRW" | "KRW" | string;
  payMethod?: "CARD" | string;
  message?: string;
};

type PortOneCustomer = {
  customerId: string;
  fullName: string;
  phoneNumber?: string;
  email: string;
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
};

/** Toast 알림 하나의 데이터 구조 */
type ToastItem = {
  id: number;
  type: "error" | "success" | "info";
  text: string;
};

declare global {
  interface Window {
    CODE_DESTINY_API_BASE_URL?: string;
    PortOne?: {
      requestPayment: (request: PortOnePaymentRequest) => Promise<PortOnePaymentResponse>;
    };
  }
}

/* ══════════════════════════════════════════════════════════════════
   상수 정의
══════════════════════════════════════════════════════════════════ */

const PORTONE_MOBILE_REDIRECT_PATH = process.env.NEXT_PUBLIC_PORTONE_MOBILE_REDIRECT_PATH || "/points";
const PAYMENT_ACTION_LOCK_TTL_MS = 15 * 60 * 1000;
const PAYMENT_REDIRECT_LOCK_TTL_MS = 90 * 1000;
const PAYMENT_REDIRECT_LOCK_PREFIX = "fortune_payment_redirect_confirm_lock:";

const EMAIL_REGEX = /^[^@\s]+@[^\s@]+\.[^\s@]+$/;

function normalizePortoneEmail(input?: string): string {
  return String(input || "").trim();
}

function isValidEmail(input: string): boolean {
  return EMAIL_REGEX.test(normalizePortoneEmail(input));
}

function pickPhoneNumber(user: AuthUser | null): string | undefined {
  const source = String(user?.phoneNumber || user?.phone || "").trim();
  const cleaned = source ? source.replace(/\D+/g, "") : "";
  return cleaned || undefined;
}

function normalizePaymentPhoneNumber(value: string): string {
  const digits = String(value || "").replace(/\D+/g, "");
  const normalized = digits.startsWith("82") && digits.length >= 11 ? `0${digits.slice(2)}` : digits;
  return /^01\d{8,9}$/.test(normalized) ? normalized : "";
}

async function getSavedPaymentPhoneNumber(apiBase: string): Promise<string> {
  // 결제창 직전 경로라 일시적 503 하나가 결제를 통째로 막는다 — 공용 완충으로 흡수한다.
  const attempt = await runAccessCheckWithTransientRetry(async () => {
    const response = await authFetch(`${apiBase}/api/me/payment-phone`, {
      method: "GET",
      credentials: "include",
  }, {
    retryOn401: true,
    apiBase,
    clientSource: "app:points",
  });
    const parsed = await safeParseJson<{ phoneNumber?: string; phone?: string; message?: string }>(response);
    return { status: response.status, data: { ...parsed, ok: response.ok } };
  }, { maxAttempts: 1, baseDelayMs: 700 });

  if (attempt.data.ok !== true) {
    throw new Error(attempt.data.message || "결제용 휴대폰 번호를 확인하지 못했습니다.");
  }
  return normalizePaymentPhoneNumber(attempt.data.phoneNumber || attempt.data.phone || "");
}

async function savePaymentPhoneNumber(apiBase: string, phoneNumber: string): Promise<string> {
  const response = await authFetch(`${apiBase}/api/me/payment-phone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ phone: phoneNumber }),
    }, {
      retryOn401: true,
      apiBase,
      clientSource: "app:points",
    });
  const payload = await safeParseJson<{ phoneNumber?: string; phone?: string; message?: string; code?: string }>(response);
  if (!response.ok) throw new Error(describePaymentPhoneFailure(response.status, payload));
  return normalizePaymentPhoneNumber(payload.phoneNumber || payload.phone || phoneNumber);
}

async function ensurePaymentPhoneNumber(
  apiBase: string,
  user: AuthUser | null,
  prefetchedSaved?: Promise<string> | null,
): Promise<string> {
  // 서버 값이 진실의 원천이다 — localStorage(fortune_auth_user)의 phoneNumber는 결제 UX용
  // 임시 프리필일 뿐이라 먼저 신뢰하지 않는다. 서버 조회가 비었거나 실패했을 때만(네트워크 문제 등)
  // 결제가 완전히 막히지 않도록 로컬 값으로 최후 폴백한다.
  // prompt 는 절대 프리페치하지 않는다 — 조회분만 미리 받고, 입력이 필요하면 이 시점에 띄운다.
  const saved = await (prefetchedSaved || getSavedPaymentPhoneNumber(apiBase)).catch(() => "");
  if (saved) return saved;
  const cachedUser = readSanitizedAuthUser() as AuthUser | null;
  const current = normalizePaymentPhoneNumber(user?.phoneNumber || user?.phone || cachedUser?.phoneNumber || cachedUser?.phone || "");
  if (current) return current;
  // 모달이 저장까지 끝낸 번호를 돌려준다(인앱 웹뷰에서 억제되는 window.prompt 대체).
  const nextPhone = await promptPaymentPhoneNumber({
    normalize: normalizePaymentPhoneNumber,
    onSave: (phone) => savePaymentPhoneNumber(apiBase, phone),
  });
  if (!nextPhone) throw new Error("단건 결제를 진행하려면 구매자 휴대폰 번호가 필요합니다.");
  const latestUser = readSanitizedAuthUser() as AuthUser | null;
  if (latestUser) persistSanitizedAuthUser({ ...latestUser, phoneNumber: nextPhone, phone: latestUser.phone || nextPhone });
  return nextPhone;
}

function buildPortOneCustomer(user: AuthUser | null, paymentId: string, phoneNumber?: string): PortOneCustomer {
  const cachedUser = readSanitizedAuthUser() as AuthUser | null;
  const merged = { ...(cachedUser || {}), ...(user || {}) } as AuthUser;
  const fullName = String(merged.name || "회원").trim();
  const email = normalizePortoneEmail(merged.email);
  const customerId = String(merged.id || merged.userId || merged.uid || merged._id || paymentId).trim();
  const resolvedPhoneNumber = normalizePaymentPhoneNumber(phoneNumber || pickPhoneNumber(merged) || "");

  const fallbackEmailId = customerId.replace(/[^a-zA-Z0-9._-]/g, "").slice(-24) || "guest";

  return {
    customerId,
    fullName,
    email: isValidEmail(email) ? email : `buyer-${fallbackEmailId}@code-destiny.com`,
    phoneNumber: resolvedPhoneNumber,
  };
}

const SUBSCRIPTION_DURATION_OPTIONS = [
  { months: 1, label: "30d", discount: 0, badge: "" },
] as const;

const SUBSCRIPTION_BASE_PLANS = [
  {
    tier:         "standard",
    title:        "standard",
    baseWonPrice: PASS_MONTHLY_WON.standard,
    profileLimit: 3,
    freeUpTo:     30,
    theme:        "amber",
    badge:        "",
    features:     [
      "profile3",
      "under3000",
      "monthlyCap",
      "over3000Single",
      "pdfSingle",
      "activeImmediately",
      "notAutoBilling",
    ],
  },
  {
    tier:         "premium",
    title:        "premium",
    baseWonPrice: PASS_MONTHLY_WON.premium,
    profileLimit: 7,
    freeUpTo:     50,
    theme:        "rose",
    features:     [
      "profile7",
      "under5000",
      "monthlyCap",
      "over5000Single",
      "pdfSingle",
      "activeImmediately",
      "notAutoBilling",
    ],
    badge:        "recommended",
  },
  {
    tier:         "vvip",
    title:        "vvip",
    baseWonPrice: PASS_MONTHLY_WON.vvip,
    profileLimit: 15,
    freeUpTo:     100,
    theme:        "purple",
    features:     [
      "profile15",
      "under10000",
      "monthlyCap",
      "vvipConsult",
      "over10000Single",
      "pdfSingle",
      "activeImmediately",
      "notAutoBilling",
    ],
    badge:        "VVIP",
  },
  {
    tier:         "family",
    title:        "family",
    baseWonPrice: PASS_MONTHLY_WON.family,
    profileLimit: null,
    freeUpTo:     null,
    theme:        "purple",
    features:     [
      "profileUnlimited",
      "allPaidPdf",
      "monthlyCap",
      "familyIncluded",
      "activeImmediately",
      "notAutoBilling",
    ],
    badge:        "Family",
  },
] as const;

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = SUBSCRIPTION_BASE_PLANS.flatMap((base) =>
  SUBSCRIPTION_DURATION_OPTIONS.map((duration) => ({
    ...base,
    id: `${base.tier}_${duration.months}m`,
    planId: `${base.tier}_${duration.months}m`,
    durationMonths: duration.months,
    productType: "membership_pass",
    title: `${base.title} · ${duration.label}`,
    wonPrice: Math.round(base.baseWonPrice * duration.months * (1 - duration.discount)),
    badge: duration.badge || base.badge,
    features: base.features.map((feature) =>
      feature
    ),
  }))
);

const SUBSCRIPTION_TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  standard: 1,
  premium: 2,
  vvip: 3,
  family: 4,
};

function getSubscriptionTierRank(tier: SubscriptionTier | string | null | undefined) {
  const normalized = String(tier || "free").toLowerCase() as SubscriptionTier;
  return SUBSCRIPTION_TIER_RANK[normalized] ?? 0;
}

function getSubscriptionPolicyFreeLimit(tier: SubscriptionTier | string | null | undefined) {
  const normalized = normalizeSubscriptionTier(tier);
  if (normalized === "family") return 999999999;
  if (normalized === "vvip") return 100;
  if (normalized === "premium") return 50;
  if (normalized === "standard") return 30;
  return 0;
}

function getSubscriptionPolicyProfileLimit(tier: SubscriptionTier | string | null | undefined) {
  const normalized = normalizeSubscriptionTier(tier);
  if (normalized === "family") return 0;
  if (normalized === "vvip") return 15;
  if (normalized === "premium") return 7;
  if (normalized === "standard") return 3;
  return 1;
}

const POINT_PACKAGES: PointPackage[] = [
  { id: "direct_paid_service", title: "directPaidService", amount: 3000, points: 30, featureKey: "direct-paid-service", description: "directPaidServiceDescription", productType: "paid_content" },
];

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

function hasFlowerAdminPasswordSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return String(sessionStorage.getItem("flower_admin_password_ok") || "") === "1";
  } catch {
    return false;
  }
}

function isFlowerAdminSessionClient(): boolean {
  if (typeof window === "undefined") return false;
  if (!hasFlowerAdminPasswordSession()) return false;
  try {
    const token = String(sessionStorage.getItem("flower_admin_token") || "");
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return true;
  } catch {}
  try {
    const token = String(localStorage.getItem("flower_admin_token") || "");
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return true;
  } catch {}
  return false;
}

function getFlowerAdminTokenClient(): string {
  if (typeof window === "undefined") return "";
  if (!hasFlowerAdminPasswordSession()) return "";
  try {
    const token = sessionStorage.getItem("flower_admin_token");
    if (token && FLOWER_ADMIN_TOKEN_RE.test(String(token))) return String(token);
  } catch {}
  try {
    const token = localStorage.getItem("flower_admin_token");
    if (token && FLOWER_ADMIN_TOKEN_RE.test(String(token))) return String(token);
  } catch {}
  return "";
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "card_general", label: "cardGeneral", logo: "CARD", desc: "portoneV2", group: "domestic" },
];

type PointsPageCopy = {
  defaultUserName: string;
  defaultMemberName: string;
  duration30: string;
  heldPass: string;
  allPaidPdfPolicy: string;
  generalLimitPolicy: (value: string) => string;
  familyValueLine: (duration: string) => string;
  planValueLine: (value: string, duration: string) => string;
  monthlyCreditValue: (amount: number, locale: string) => string;
  won: (amount: number, locale: string) => string;
  planTitles: Record<SubscriptionTier, string>;
  planBadges: Record<string, string>;
  planFeatures: Record<SubscriptionTier, Record<string, string>>;
  pointPackages: Record<string, { title: string; description: string }>;
  paymentMethods: Record<string, { label: string; desc: string }>;
  paymentStatuses: Record<string, string>;
  subscriptionAria: string;
  toastCloseLabel: string;
  monthlyBonusAria: string;
  walletAria: string;
  refundAgreement: string;
  passAlt: string;
  wonSinglePaymentAria: string;
  paymentFailureGuide: string[];
  accountInfoAria: string;
  dangerDeleteLines: string[];
  closeLabel: string;
  currentPlan: string;
  purchasePass: (icon: string) => string;
  extendPass: string;
  lowerTierBlocked: string;
  lowerTierBlockedHelp: string;
  activePassLabel: string;
  activePassMessage: (expires: string) => string;
  activePassFooter: string;
  activePassAutoRenewWarning: string;
  coffeeBadge: string;
};

const POINTS_PAGE_COPY: Record<LoadingLocale, PointsPageCopy> = {
  ko: {
    defaultUserName: "사용자",
    defaultMemberName: "회원",
    duration30: "30일",
    heldPass: "보유 이용권",
    allPaidPdfPolicy: "3만원 미만 무제한(월 50만원까지) · 초융합 포함 전문가 상담 10회",
    generalLimitPolicy: (value) => `일반 ${value} 이하 이용 가능`,
    familyValueLine: (duration) => `Family 전체 혜택 / ${duration}`,
    planValueLine: (value, duration) => `${value} 이하 기능 / ${duration}`,
    monthlyCreditValue: (amount, locale) => `${Math.max(0, Math.floor(Number(amount || 0))).toLocaleString(locale)} 월정석`,
    won: (amount, locale) => `${Number(amount || 0).toLocaleString(locale)}원`,
    planTitles: {
      free: "무료 플랜",
      standard: "스탠다드 꿀 30일",
      premium: "프리미엄 꿀 30일",
      vvip: "VVIP 꿀단지 30일",
      family: "Code Destiny Family 30일",
    },
    planBadges: {
      recommended: "추천",
      family: "Family",
      vvip: "VVIP",
    },
    planFeatures: {
      free: {},
      standard: {
        profile3: "프로필 최대 3개 생성",
        under3000: "3,000원 이하 유료 기능 횟수 제한 없이 이용",
        monthlyCap: "월 누적 3만원까지 이용 가능",
        over3000Single: "30일 동안 스탠다드 혜택 유지",
        pdfSingle: "PDF 상품 조건은 결제 전 안내",
        activeImmediately: "결제 즉시 30일 이용권 활성화",
        notAutoBilling: "원화 단건 결제로 구매 가능",
      },
      premium: {
        profile7: "프로필 최대 7개 생성",
        under5000: "5,000원 이하 유료 기능 횟수 제한 없이 이용",
        monthlyCap: "월 누적 10만원까지 이용 가능",
        over5000Single: "30일 동안 프리미엄 혜택 유지",
        pdfSingle: "PDF 상품 조건은 결제 전 안내",
        activeImmediately: "결제 즉시 30일 이용권 활성화",
        notAutoBilling: "원화 단건 결제로 구매 가능",
      },
      vvip: {
        profile15: "프로필 최대 15개 생성",
        under10000: "10,000원 이하 유료 기능 횟수 제한 없이 이용",
        monthlyCap: "월 누적 20만원까지 이용 가능",
        vvipConsult: "전문가 상담 30일 3회 포함 (초과분 단건 결제)",
        over10000Single: "30일 동안 VVIP 혜택 유지",
        pdfSingle: "PDF 상품 조건은 결제 전 안내",
        activeImmediately: "결제 즉시 30일 이용권 활성화",
        notAutoBilling: "원화 단건 결제로 구매 가능",
      },
      family: {
        profileUnlimited: "프로필 추가·수정·삭제 무료, 제한 없음",
        allPaidPdf: "3만원 미만 무제한 · 초융합 포함 10회",
        monthlyCap: "월 누적 50만원까지 이용 가능",
        familyIncluded: "전문가 상담 30일 10회 포함 (초과분 단건 결제)",
        activeImmediately: "결제 즉시 30일 이용권 활성화",
        notAutoBilling: "원화 단건 결제로 구매 가능",
      },
    },
    pointPackages: {
      directPaidService: {
        title: "상품별 혜택 안내",
        description: "이용권별 혜택 범위와 PDF 조건은 결제 전 상품 안내에서 확인할 수 있습니다.",
      },
    },
    paymentMethods: {
      cardGeneral: { label: "KG이니시스 카드", desc: "포트원 V2 인증 결제" },
    },
    paymentStatuses: {
      success: "생성 완료",
      paid: "결제 완료",
      processing: "생성 중",
      retryable: "재시도 가능",
      cancelled: "취소완료",
      refunded: "환불완료",
      failed: "실패",
      pending: "대기",
    },
    subscriptionAria: "달빛 30일 이용권",
    toastCloseLabel: "알림 닫기",
    monthlyBonusAria: "월정석 보너스 잔량과 사용 내역",
    walletAria: "이용권 상점 안내",
    refundAgreement: "원화 결제된 30일 이용권은 결제 즉시 활성화되며, 유료 기능 이용 시작 후에는 환불이 제한될 수 있음을 확인했습니다.",
    passAlt: "달빛 이용권",
    wonSinglePaymentAria: "원화 결제 안내",
    paymentFailureGuide: [
      "창 닫기/취소: 결제가 취소되어 이용권 권한이 생성되지 않습니다.",
      "한도 초과: 다른 카드/계좌이체 또는 금액을 낮춰 재시도해 주세요.",
      "카드사 점검: 잠시 후 다시 시도하거나 다른 결제수단을 선택해 주세요.",
    ],
    accountInfoAria: "계정 정보",
    dangerDeleteLines: [
      "탈퇴 시 이용권·운세 프로필 등 모든 데이터가 즉시 영구 삭제됩니다.",
      "탈퇴 후 동일 이메일로 재가입해도 이전 데이터는 복구되지 않습니다.",
      "법적 보존 의무에 따라 결제 거래 금액·일시는 5년간 익명화 보관됩니다.",
    ],
    closeLabel: "닫기",
    currentPlan: "현재 플랜",
    purchasePass: (icon) => `${icon} 30일 이용권 구매하기`,
    extendPass: "30일 이용권 연장",
    lowerTierBlocked: "상위 티어 사용 중 (구매 불가)",
    lowerTierBlockedHelp: "현재 상위 티어 이용권이 활성화되어 하위 플랜은 선택할 수 없습니다.",
    activePassLabel: "30일 이용권 활성화",
    activePassMessage: (expires) => `${expires}까지 30일 혜택이 유지됩니다. 다음 이용권은 원화 단건 결제로 구매할 수 있습니다.`,
    activePassFooter: "결제 즉시 이용권 혜택이 활성화되며 30일 동안 유효합니다.",
    activePassAutoRenewWarning: "만료 후에는 원화 단건 결제로 30일 혜택을 다시 열 수 있습니다.",
    coffeeBadge: "커피 2잔 값으로 30일",
  },
  en: {
    defaultUserName: "User",
    defaultMemberName: "Member",
    duration30: "30 days",
    heldPass: "Active pass",
    allPaidPdfPolicy: "Fusion Fortune excluded · Unlimited under KRW 30,000 (up to KRW 500,000/month) · 10 expert consultations",
    generalLimitPolicy: (value) => `General services up to ${value}`,
    familyValueLine: (duration) => `All Family benefits / ${duration}`,
    planValueLine: (value, duration) => `Services up to ${value} / ${duration}`,
    monthlyCreditValue: (amount, locale) => `${Math.max(0, Math.floor(Number(amount || 0))).toLocaleString(locale)} moon credits`,
    won: (amount, locale) => `KRW ${Number(amount || 0).toLocaleString(locale)}`,
    planTitles: {
      free: "Free plan",
      standard: "Standard Honey 30-day",
      premium: "Premium Honey 30-day",
      vvip: "VVIP Honey Jar 30-day",
      family: "Code Destiny Family 30-day",
    },
    planBadges: {
      recommended: "Recommended",
      family: "Family",
      vvip: "VVIP",
    },
    planFeatures: {
      free: {},
      standard: {
        profile3: "Create up to 3 profiles",
        under3000: "Unlimited use of paid features up to KRW 3,000",
        monthlyCap: "Up to KRW 30,000 total per month",
        over3000Single: "Standard benefits stay active for 30 days",
        pdfSingle: "PDF terms are shown before purchase",
        activeImmediately: "30-day pass activates after payment",
        notAutoBilling: "Monthly credits or KRW purchase available",
      },
      premium: {
        profile7: "Create up to 7 profiles",
        under5000: "Unlimited use of paid features up to KRW 5,000",
        monthlyCap: "Up to KRW 100,000 total per month",
        over5000Single: "Premium benefits stay active for 30 days",
        pdfSingle: "PDF terms are shown before purchase",
        activeImmediately: "30-day pass activates after payment",
        notAutoBilling: "Monthly credits or KRW purchase available",
      },
      vvip: {
        profile15: "Create up to 15 profiles",
        under10000: "Unlimited use of paid features up to KRW 10,000",
        monthlyCap: "Up to KRW 200,000 total per month",
        vvipConsult: "3 expert consultations per 30 days (extra via single payment)",
        over10000Single: "VVIP benefits stay active for 30 days",
        pdfSingle: "PDF terms are shown before purchase",
        activeImmediately: "30-day pass activates after payment",
        notAutoBilling: "Monthly credits or KRW purchase available",
      },
      family: {
        profileUnlimited: "Unlimited profile add/edit/delete",
        allPaidPdf: "Fusion Fortune excluded · Unlimited for features under KRW 30,000",
        monthlyCap: "Up to KRW 500,000 total per month",
        familyIncluded: "10 expert consultations per 30 days (extra via single payment)",
        activeImmediately: "30-day pass activates after payment",
        notAutoBilling: "Monthly credits or KRW purchase available",
      },
    },
    pointPackages: {
      directPaidService: {
        title: "Benefit details by product",
        description: "Pass benefits and PDF terms are shown in each product guide before purchase.",
      },
    },
    paymentMethods: {
      cardGeneral: { label: "KG Inicis card", desc: "PortOne V2 authenticated payment" },
    },
    paymentStatuses: {
      success: "Generated",
      paid: "Paid",
      processing: "Generating",
      retryable: "Retry available",
      cancelled: "Cancelled",
      refunded: "Refunded",
      failed: "Failed",
      pending: "Pending",
    },
    subscriptionAria: "Moonlight 30-day pass",
    toastCloseLabel: "Close notification",
    monthlyBonusAria: "Moon credit bonus balance and activity",
    walletAria: "Pass shop guide",
    refundAgreement: "I understand that the 30-day KRW pass activates immediately after payment and refunds may be limited once paid features are used.",
    passAlt: "Moonlight pass",
    wonSinglePaymentAria: "KRW payment guide",
    paymentFailureGuide: [
      "Window closed/cancelled: payment is cancelled and pass access is not created.",
      "Limit exceeded: try another card, bank transfer, or a lower amount.",
      "Card issuer maintenance: try again later or choose another payment method.",
    ],
    accountInfoAria: "Account information",
    dangerDeleteLines: [
      "Deleting your account permanently removes passes, fortune profiles, and all other data immediately.",
      "Data cannot be restored even if you sign up again with the same email.",
      "Payment amount and date records are anonymized and retained for 5 years as legally required.",
    ],
    closeLabel: "Close",
    currentPlan: "Current plan",
    purchasePass: (icon) => `${icon} Buy 30-day pass`,
    extendPass: "Extend 30-day pass",
    lowerTierBlocked: "Higher tier active",
    lowerTierBlockedHelp: "A higher-tier pass is active, so lower plans cannot be selected.",
    activePassLabel: "30-day pass active",
    activePassMessage: (expires) => `30-day benefits stay active until ${expires}. You can open the next pass with monthly credits or KRW.`,
    activePassFooter: "Pass benefits activate immediately after payment and remain valid for 30 days.",
    activePassAutoRenewWarning: "After expiration, you can open another 30-day pass with monthly credits or KRW.",
    coffeeBadge: "30 days for about two coffees",
  },
  ja: null as unknown as PointsPageCopy,
  "zh-CN": null as unknown as PointsPageCopy,
  "zh-TW": null as unknown as PointsPageCopy,
  vi: null as unknown as PointsPageCopy,
  hi: null as unknown as PointsPageCopy,
  es: null as unknown as PointsPageCopy,
  fr: null as unknown as PointsPageCopy,
  de: null as unknown as PointsPageCopy,
  nl: null as unknown as PointsPageCopy,
  ms: null as unknown as PointsPageCopy,
};

POINTS_PAGE_COPY.ja = { ...POINTS_PAGE_COPY.en, defaultUserName: "ユーザー", defaultMemberName: "会員", duration30: "30日", passAlt: "月明かり利用券", closeLabel: "閉じる" };
POINTS_PAGE_COPY["zh-CN"] = { ...POINTS_PAGE_COPY.en, defaultUserName: "用户", defaultMemberName: "会员", duration30: "30天", passAlt: "月光通行证", closeLabel: "关闭" };
POINTS_PAGE_COPY["zh-TW"] = { ...POINTS_PAGE_COPY["zh-CN"], defaultUserName: "使用者", defaultMemberName: "會員", passAlt: "月光通行證", closeLabel: "關閉" };

for (const locale of ["vi", "hi", "es", "fr", "de", "nl", "ms"] as LoadingLocale[]) {
  POINTS_PAGE_COPY[locale] = POINTS_PAGE_COPY.en;
}

const FORMAT_LOCALE_BY_LANG: Record<LoadingLocale, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  vi: "vi-VN",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  nl: "nl-NL",
  ms: "ms-MY",
};

/* ══════════════════════════════════════════════════════════════════
   유틸리티 함수
══════════════════════════════════════════════════════════════════ */

function formatWon(amount: number, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  return copy.won(Number(amount || 0), locale);
}

function formatCoinValue(amount: number, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  return formatWon(Math.max(0, Math.floor(Number(amount || 0))) * 100, copy, locale);
}

function formatMonthlyCreditValue(amount: number, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  return copy.monthlyCreditValue(amount, locale);
}

function normalizeSubscriptionDurationMonths(value: unknown, planIdRaw?: unknown): 1 | 3 | 6 | 12 | null {
  const numeric = Number(value);
  if (numeric === 1 || numeric === 3 || numeric === 6 || numeric === 12) return numeric;
  const planId = String(planIdRaw || "").trim().toLowerCase();
  const match = planId.match(/(?:^|[_-])(1|3|6|12)m(?:$|[_-])/);
  if (!match) return null;
  const months = Number(match[1]);
  return months === 1 || months === 3 || months === 6 || months === 12 ? months : null;
}

function formatSubscriptionDurationLabel(months: unknown, copy: PointsPageCopy = POINTS_PAGE_COPY.ko) {
  const normalized = normalizeSubscriptionDurationMonths(months);
  if (!normalized) return copy.duration30;
  if (normalized === 1) return copy.duration30;
  return copy.heldPass;
}

function formatSubscriptionPlanPolicy(plan: Pick<SubscriptionPlan, "freeUpTo">, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  if (plan.freeUpTo === null) return copy.allPaidPdfPolicy;
  return copy.generalLimitPolicy(formatCoinValue(plan.freeUpTo, copy, locale));
}

function formatSubscriptionPlanValueLine(plan: Pick<SubscriptionPlan, "tier" | "freeUpTo" | "durationMonths">, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  const duration = formatSubscriptionDurationLabel(plan.durationMonths, copy);
  if (plan.tier === "family") return copy.familyValueLine(duration);
  return copy.planValueLine(formatCoinValue(Number(plan.freeUpTo || 0), copy, locale), duration);
}

function isMonthlyCreditPayment(payment: Pick<PaymentHistoryItem, "paymentMethod" | "accessType">) {
  const method = String(payment.paymentMethod || "").trim().toLowerCase();
  const accessType = String(payment.accessType || "").trim().toLowerCase();
  return method === "monthly_credit" || method === "monthly" || method === "moonlight_stone"
    || accessType === "membership_credit";
}

// 이용권으로 커버돼 결제 없이 이용한 건. 실제 과금이 없으므로 "카드 결제"로 보이면 안 된다.
function isPassCoveredPayment(payment: Pick<PaymentHistoryItem, "paymentMethod" | "accessType">) {
  const method = String(payment.paymentMethod || "").trim().toLowerCase();
  const accessType = String(payment.accessType || "").trim().toLowerCase();
  return method === "pass" || method === "family" || method === "membership_pass" || method === "subscription"
    || accessType === "pass" || accessType === "family" || accessType === "membership_pass";
}

function langSensitiveLabel(copy: PointsPageCopy, ko: string, en: string) {
  return copy === POINTS_PAGE_COPY.ko ? ko : en;
}

function getPointPackageTitle(pack: Pick<PointPackage, "title">, copy: PointsPageCopy) {
  return copy.pointPackages[pack.title]?.title || pack.title;
}

function formatPaymentMethodLabel(payment: PaymentHistoryItem, copy: PointsPageCopy = POINTS_PAGE_COPY.ko) {
  // 이용권 > 월정석 > 원화 단건 순으로 판정한다. 실제 과금이 없는 건이 "카드 결제"로 보이면 안 된다.
  if (isPassCoveredPayment(payment)) return langSensitiveLabel(copy, "이용권으로 처리", "Covered by pass");
  if (isMonthlyCreditPayment(payment)) return langSensitiveLabel(copy, "프로모션 처리", "Promotion");
  // 판정은 원본 코드(paymentMethod)로만 한다 — 서버가 내려주는 paymentMethodLabel은 이미 한글이라 코드 비교에 쓸 수 없다.
  const method = String(payment.paymentMethod || "").trim();
  const normalized = method.toLowerCase();
  if (!method) return String(payment.paymentMethodLabel || "").trim() || "-";
  if (normalized === "virtual_account") return langSensitiveLabel(copy, "가상계좌", "Virtual account");
  if (normalized === "kakaopay") return "KakaoPay";
  if (normalized === "naverpay") return "Naver Pay";
  // 준비 단계 레코드는 paymentMethod가 single_purchase/unknown으로 저장된다(payments.js prepare 기본값).
  // 어느 쪽이든 원화 단건 결제 건이므로 내부 코드명이 그대로 노출되지 않게 카드 결제로 묶는다.
  return copy.paymentMethods.cardGeneral?.label || langSensitiveLabel(copy, "카드 결제", "Card payment");
}

function formatDateTime(raw?: string | null, locale = FORMAT_LOCALE_BY_LANG.ko) {
  if (!raw) return "-";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatPaymentTimeLabel(payment: PaymentHistoryItem, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  const paidOrCancelledAt = payment.paidAt || payment.cancelledAt || null;
  if (paidOrCancelledAt) return formatDateTime(paidOrCancelledAt, locale);
  if (payment.status === "pending") return copy.paymentStatuses.pending;
  if (payment.status === "failed") return copy.paymentStatuses.failed;
  return "-";
}

function formatMonthlyCreditLedgerType(type: string) {
  if (type === "MONTHLY_CREDIT_GRANT") return "지급";
  if (type === "MONTHLY_CREDIT_SPEND") return "사용";
  if (type === "MONTHLY_CREDIT_REFUND") return "복원";
  return "기록";
}

function formatMonthlyCreditLedgerAmount(entry: MonthlyCreditLedgerItem, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  const amount = Math.max(0, Math.floor(Number(entry.amount || 0)));
  const type = String(entry.type || "");
  const sign = type === "MONTHLY_CREDIT_SPEND" ? "-" : "+";
  return `${sign}${copy.monthlyCreditValue(amount, locale)}`;
}

function formatMonthlyCreditLedgerReason(entry: MonthlyCreditLedgerItem) {
  const reason = String(entry.reason || "").trim();
  if (reason.includes("membership_credit_access")) return "유료 기능 이용";
  if (reason.includes("monthly-credit membership pass purchase")) return "달빛 이용권 활성화";
  if (reason) return reason;
  if (entry.type === "MONTHLY_CREDIT_GRANT") return "보너스 월정석 지급";
  if (entry.type === "MONTHLY_CREDIT_SPEND") return "보너스 월정석 사용";
  if (entry.type === "MONTHLY_CREDIT_REFUND") return "보너스 월정석 복원";
  return "월정석 내역";
}

// 서버 취소 허용 규칙(worker/routes/payments.js handleCancel)과 같은 기준을 쓴다. 단건 디지털콘텐츠
// 주문은 "success" 로 끝나지 않아(prepare=pending / 웹훅정산=fulfilled) 예전 조건이면 카드가 승인된
// 주문에서도 취소 버튼이 영영 비활성이었다. 최종 판정은 서버가 하고 여기서는 버튼만 열어 준다.
function canRequestPaymentCancel(payment: PaymentHistoryItem) {
  if (payment.isPassAccess === true) return false;
  const isSinglePurchase = payment.paymentType === "digital_content" && payment.accessType === "single_purchase";
  if (isSinglePurchase) {
    return payment.status === "success"
      || payment.status === "fulfilled"
      || payment.status === "processing"
      || payment.status === "pending";
  }
  return payment.status === "success";
}

function mapPaymentStatusLabel(status: string, copy: PointsPageCopy = POINTS_PAGE_COPY.ko) {
  if (status === "success" || status === "fulfilled") return { label: copy.paymentStatuses.success, cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  if (status === "paid") return { label: copy.paymentStatuses.paid, cls: "bg-sky-100 text-sky-800 border-sky-300" };
  if (status === "processing") return { label: copy.paymentStatuses.processing, cls: "bg-indigo-100 text-indigo-800 border-indigo-300" };
  if (status === "retryable") return { label: copy.paymentStatuses.retryable, cls: "bg-orange-100 text-orange-800 border-orange-300" };
  if (status === "cancelled") return { label: copy.paymentStatuses.cancelled, cls: "bg-neutral-100 text-neutral-700 border-neutral-300" };
  if (status === "refunded") return { label: copy.paymentStatuses.refunded, cls: "bg-cyan-100 text-cyan-800 border-cyan-300" };
  if (status === "failed") return { label: copy.paymentStatuses.failed, cls: "bg-rose-100 text-rose-700 border-rose-300" };
  return { label: copy.paymentStatuses.pending, cls: "bg-amber-100 text-amber-700 border-amber-300" };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    // 한국어 안내문(서버/코드가 만든 사용자용 메시지)만 그대로 노출하고,
    // "Failed to fetch" 같은 기술 원문은 로그로만 남기고 폴백을 보여준다.
    if (/[가-힣]/.test(error.message)) return error.message;
    console.error("[points] technical error hidden from user:", error);
  }
  return fallback;
}

function mapAuthRefreshTemporaryFailureMessage() {
  return "로그인 세션 확인이 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
}

/* PortOne 브라우저 SDK 가 돌려준 실패의 **원문**을 뽑는다.
   🔴 mapPaymentErrorMessage 는 표시용이고 판정용이 아니다. 그 함수는 문자열에 "취소"가 들어 있으면
   취소로 접는데, 예전 호출부가 rsp.message 가 비었을 때의 기본값으로 "…결제가 취소되었습니다"를
   넘겼다. 그래서 **원인 불명 실패가 전부 "사용자 취소"로 기록**됐고, 실제로 그 기록을 근거로
   원인을 잘못 짚었다. 원문은 여기서 따로 보존해 서버에 그대로 넘긴다. */
function describePortOneSdkFailure(rsp: unknown): { code: string; message: string } {
  const r = isRecord(rsp) ? rsp : {};
  const code = String(r.code ?? r.errorCode ?? r.error_code ?? "").trim().slice(0, 60);
  const message = String(r.message ?? r.error_msg ?? r.errorMsg ?? "").trim().slice(0, 400);
  return { code, message };
}

function mapPaymentErrorMessage(rawMessage: string) {
  const text = String(rawMessage || "").toLowerCase();
  if (text.includes("취소") || text.includes("cancel"))
    return "결제가 취소되었습니다. 원하실 때 다시 시도하실 수 있어요.";
  if (text.includes("한도") || text.includes("limit"))
    return "결제 한도 초과로 진행되지 않았습니다. 다른 카드나 결제수단을 이용해 주세요.";
  if (text.includes("점검") || text.includes("maintenance") || text.includes("unavailable"))
    return "카드사/PG 점검 시간으로 결제가 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  return "결제를 완료하지 못했습니다. 네트워크 상태와 결제 정보를 확인 후 다시 시도해 주세요.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSubscriptionTier(value: unknown): SubscriptionTier {
  const text = String(value || "").trim().toLowerCase();
  if (text === "standard" || text.includes("스탠다드")) return "standard";
  if (text === "premium" || text.includes("프리미엄")) return "premium";
  if (text === "vvip" || text.includes("브이브이아이피") || text.includes("골드")) return "vvip";
  if (text === "family" || text.includes("code destiny family")) return "family";
  return "free";
}

function normalizeSubscriptionSource(value: unknown): "card" | "pass" {
  const text = String(value || "").trim().toLowerCase();
  return text === "card" || text === "legacy_subscription" || text === "subscription" ? "card" : "pass";
}

function normalizeSubscriptionDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? value : null;
}

function statusIndicatesActive(value: unknown) {
  const status = String(value || "").trim().toLowerCase();
  return [
    "active",
    "paid",
    "current",
    "subscribed",
    "trialing",
    "success",
    "registered",
    "registering",
    "pending",
    "processing",
    "enrolled",
    "enabled",
    "valid",
    "ok",
    "complete",
    "completed",
    "confirmed",
    "approved",
    "등록중",
    "이용중",
    "유효",
    "완료",
  ].includes(status);
}

function statusIndicatesInactive(value: unknown) {
  const status = String(value || "").trim().toLowerCase();
  return ["expired", "canceled", "cancelled", "inactive", "failed", "paused", "refunded"].includes(status);
}

function normalizeSubscriptionStatusFromPayload(value: unknown): SubscriptionStatus | null {
  if (!isRecord(value)) return null;
  const nested = isRecord(value.subscription) ? value.subscription : {};
  const tier = normalizeSubscriptionTier(
    value.tier
      ?? value.plan
      ?? value.passTier
      ?? value.subscriptionTier
      ?? nested.tier
      ?? nested.plan
      ?? nested.passTier,
  );
  const expiresAt = normalizeSubscriptionDate(
    value.expiresAt
      ?? value.currentPeriodEnd
      ?? value.endsAt
      ?? value.validUntil
      ?? nested.expiresAt
      ?? nested.currentPeriodEnd
      ?? nested.endsAt
      ?? nested.validUntil,
  );
  const startedAt = normalizeSubscriptionDate(
    value.startedAt
      ?? value.activatedAt
      ?? value.currentPeriodStart
      ?? nested.startedAt
      ?? nested.activatedAt
      ?? nested.currentPeriodStart,
  );
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const isDateActive = !!expiresDate && Number.isFinite(expiresDate.getTime()) && expiresDate.getTime() > Date.now();
  const rawStatus = value.status ?? value.subscriptionStatus ?? value.membershipStatus ?? nested.status ?? nested.subscriptionStatus ?? nested.membershipStatus;
  const explicitActive = value.isActive === true
    || value.isSubscribed === true
    || value.active === true
    || value.enabled === true
    || value.valid === true
    || nested.isActive === true
    || nested.isSubscribed === true
    || statusIndicatesActive(rawStatus);
  const explicitInactive = statusIndicatesInactive(rawStatus)
    || (value.isActive === false && !explicitActive)
    || (value.isSubscribed === false && !explicitActive)
    || (nested.isActive === false && !explicitActive)
    || (nested.isSubscribed === false && !explicitActive);
  const isActive = tier !== "free" && !explicitInactive && (isDateActive || explicitActive);
  const profileLimit = Number(value.profileLimit ?? value.maxProfiles ?? nested.profileLimit ?? nested.maxProfiles);
  const freeLimit = Number(value.freeLimit ?? value.passLimit ?? value.maxCoveredCoin ?? nested.freeLimit ?? nested.passLimit ?? nested.maxCoveredCoin);
  const rawPlanId = value.planId ?? value.plan ?? nested.planId ?? nested.plan;
  const durationMonths = normalizeSubscriptionDurationMonths(value.durationMonths ?? nested.durationMonths, rawPlanId);
  const cancelRequestedAt = normalizeSubscriptionDate(value.cancelRequestedAt ?? nested.cancelRequestedAt);
  const policyFreeLimit = isActive ? getSubscriptionPolicyFreeLimit(tier) : 0;
  const normalizedFreeLimit = Number.isFinite(freeLimit) && freeLimit > 0 ? Math.floor(freeLimit) : policyFreeLimit;

  return {
    tier,
    source: normalizeSubscriptionSource(value.source ?? nested.source),
    isActive,
    startedAt,
    expiresAt,
    profileLimit: Number.isFinite(profileLimit) && profileLimit >= 0 ? Math.floor(profileLimit) : getSubscriptionPolicyProfileLimit(tier),
    ...(durationMonths ? { durationMonths } : {}),
    lowBalanceWarning: !!(value.lowBalanceWarning ?? nested.lowBalanceWarning),
    cancelAtPeriodEnd: !!(value.cancelAtPeriodEnd ?? nested.cancelAtPeriodEnd),
    cancelRequestedAt,
    freeLimit: normalizedFreeLimit,
  };
}

function normalizeFirstSubscription(value: unknown): SubscriptionStatus | null {
  const entries = Array.isArray(value) ? value : [value];
  const normalized = entries
    .map((entry) => normalizeSubscriptionStatusFromPayload(entry))
    .filter((entry): entry is SubscriptionStatus => !!entry);
  return normalized.find((entry) => entry.isActive) || normalized[0] || null;
}

function mergeSubscriptionState(prev: SubscriptionStatus, next: SubscriptionStatus): SubscriptionStatus {
  const policyFreeLimit = next.isActive ? getSubscriptionPolicyFreeLimit(next.tier) : 0;
  const normalizedFreeLimit = typeof next.freeLimit === "number" && next.freeLimit > 0
    ? next.freeLimit
    : policyFreeLimit;
  return {
    ...next,
    startedAt: next.startedAt ?? prev.startedAt ?? null,
    durationMonths: next.durationMonths ?? prev.durationMonths,
    freeLimit: normalizedFreeLimit,
    lowBalanceWarning: next.lowBalanceWarning ?? prev.lowBalanceWarning,
  };
}

function normalizeMePayload(payload: MeResponse) {
  const node = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const user = payload?.user;
  const balance = Number(
    (typeof node.balance === "number" ? node.balance : undefined)
    ?? 0,
  );
  const payments = Array.isArray(node.payments)
    ? node.payments
    : (Array.isArray(payload?.payments) ? payload.payments : []);
  const transactions = Array.isArray(node.transactions)
    ? node.transactions
    : (Array.isArray(payload?.pointHistories) ? payload.pointHistories : []);
  // 서버가 조회 실패를 안전 기본값(잔량 0)으로 내려보내는 경로가 있다(payments.js buildTokenFallbackPaymentsMe /
  // user 미조회). 그 0 을 진짜 잔량으로 믿으면 결제창의 월정석 수단이 통째로 잠긴다 → null(미확정)로 구분한다.
  const monthlyCreditsUnverified = node.degradedMonthlyCredits === true
    || payload?.userFound === false
    || String(payload?.source || "").toLowerCase() === "token";
  const monthlyStoneBalance = monthlyCreditsUnverified
    ? null
    : resolveMonthlyStoneBalance(node, payload?.user);
  const monthlyCreditLedgers = Array.isArray(node.monthlyCreditLedgers)
    ? node.monthlyCreditLedgers
    : (Array.isArray(payload?.monthlyCreditLedgers) ? payload.monthlyCreditLedgers : []);
  const subscription = normalizeFirstSubscription(node.subscriptions)
    || normalizeFirstSubscription(payload?.subscriptions)
    || normalizeSubscriptionStatusFromPayload(node.subscription)
    || normalizeSubscriptionStatusFromPayload(payload?.subscription);

  return {
    user,
    balance: Number.isFinite(balance) ? balance : 0,
    monthlyStoneBalance,
    monthlyStoneExpiresAt: resolveMonthlyStoneExpiresAt(node, payload),
    payments,
    transactions,
    monthlyCreditLedgers,
    historyDeferred: node.historyDeferred === true,
    subscription,
  };
}

/**
 * 이용권으로 커버돼 결제 없이 이용한 기록(PointHistory)을 주문 내역 행으로 합성한다.
 * 이 건들은 payments 컬렉션에 남지 않아 합성하지 않으면 주문 내역에서 통째로 사라진다.
 */
function buildPassAccessHistoryItems(entries: PointHistoryEntry[]): PaymentHistoryItem[] {
  return entries
    .filter((entry) => {
      const method = String(entry?.accessMethod || "").trim().toUpperCase();
      return method === "PASS" || method === "FAMILY";
    })
    .map((entry) => {
      const listPriceWon = Math.max(0, Math.floor(Number(entry.coinPrice || 0))) * 100;
      return {
        id: `pass:${String(entry.id || entry.requestId || "")}`,
        merchantUid: String(entry.requestId || ""),
        paymentAmount: 0,
        chargedPoints: 0,
        paymentMethod: "pass",
        accessType: "membership_pass",
        status: "success" as const,
        createdAt: entry.createdAt,
        updatedAt: entry.createdAt,
        paidAt: entry.createdAt,
        approvalNumber: null,
        receiptUrl: null,
        isPassAccess: true,
        passListPriceWon: listPriceWon,
      };
    })
    .filter((item) => item.id !== "pass:");
}

/**
 * API 응답을 안전하게 JSON으로 파싱합니다.
 * Content-Type이 application/json이 아닌 경우(예: HTML 에러 페이지)
 * 사용자 친화적인 에러 메시지를 던집니다.
 */
async function safeParseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `서버 점검 중입니다. 잠시 후 다시 시도해 주세요. (HTTP ${response.status})`,
    );
  }
  return response.json() as Promise<T>;
}

function ensurePortoneSdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("브라우저 환경에서만 결제를 진행할 수 있습니다."));
      return;
    }
    if (window.PortOne?.requestPayment) { resolve(); return; }
    const scriptId = "portone-v2-sdk";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.PortOne?.requestPayment) resolve();
        else reject(new Error("포트원 V2 SDK가 초기화되지 않았습니다."));
      }, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("결제 SDK를 불러오지 못했습니다.")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.portone.io/v2/browser-sdk.js";
    script.async = true;
    script.onload = () => {
      if (window.PortOne?.requestPayment) resolve();
      else reject(new Error("포트원 V2 SDK가 초기화되지 않았습니다."));
    };
    script.onerror = () => reject(new Error("결제 SDK를 불러오지 못했습니다."));
    document.body.appendChild(script);
  });
}

async function fetchPortOnePaymentConfig(apiBase: string): Promise<PortOnePaymentConfig> {
  const response = await authFetch(`${apiBase}/api/payments/config`, {
    method: "GET",
    credentials: "include",
  }, {
    retryOn401: false,
    apiBase,
  });
  const payload = await safeParseJson<PortOnePaymentConfig>(response);
  if (!response.ok) {
    throw new Error(payload.message || "포트원 V2 결제 설정을 확인할 수 없습니다.");
  }
  const storeId = String(payload.storeId || "").trim();
  const channelKey = String(payload.channelKey || "").trim();

  if (!storeId || !channelKey) {
    throw new Error(payload.message || "포트원 V2 결제 설정을 확인할 수 없습니다.");
  }
  return {
    ...payload,
    storeId,
    channelKey,
    noticeUrl: payload.noticeUrl,
    currency: payload.currency || "CURRENCY_KRW",
    payMethod: payload.payMethod || "CARD",
  };
}

// PortOne 결제 config(스토어/채널 키)는 세션 내 안정값이라 promise를 메모이즈해 반복 조회를 없앤다.
// 결제창 오픈 임계경로에서 재조회 왕복을 제거하고, 실패는 캐시하지 않아 다음 시도에 재조회한다.
let portOneConfigCachePromise: Promise<PortOnePaymentConfig> | null = null;
function fetchPortOnePaymentConfigCached(apiBase: string): Promise<PortOnePaymentConfig> {
  if (!portOneConfigCachePromise) {
    portOneConfigCachePromise = fetchPortOnePaymentConfig(apiBase).catch((error) => {
      portOneConfigCachePromise = null;
      throw error;
    });
  }
  return portOneConfigCachePromise;
}

function readPendingOrder() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("fortune_pending_order");
    if (!raw) return null;
    return JSON.parse(raw) as PendingOrder;
  } catch { return null; }
}

function savePendingOrder(order: PendingOrder) {
  if (typeof window === "undefined") return;
  localStorage.setItem("fortune_pending_order", JSON.stringify(order));
}

function clearPendingOrder() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("fortune_pending_order");
}

function readPendingSubscriptionOrder() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("fortune_pending_subscription_order");
    if (!raw) return null;
    return JSON.parse(raw) as PendingSubscriptionOrder;
  } catch {
    return null;
  }
}

function savePendingSubscriptionOrder(order: PendingSubscriptionOrder) {
  if (typeof window === "undefined") return;
  localStorage.setItem("fortune_pending_subscription_order", JSON.stringify(order));
}

function clearPendingSubscriptionOrder() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("fortune_pending_subscription_order");
  localStorage.removeItem("fortune_pending_subscription_pass");
}

/** PG 결제창에서 페이지가 통째로 리다이렉트돼 돌아온 복귀인지. 낙관 이용권 표시의 유일한 발동 조건이다. */
function isPortOneSubscriptionRedirectReturn() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("portone_subscription_redirect") === "1";
}

function acquirePaymentRedirectLock(key: string) {
  if (typeof window === "undefined") return false;
  const lockKey = `${PAYMENT_REDIRECT_LOCK_PREFIX}${key}`;
  const now = Date.now();
  try {
    const expiresAt = Number(sessionStorage.getItem(lockKey) || 0);
    if (Number.isFinite(expiresAt) && expiresAt > now) return false;
    sessionStorage.setItem(lockKey, String(now + PAYMENT_REDIRECT_LOCK_TTL_MS));
    return true;
  } catch {
    return true;
  }
}

function releasePaymentRedirectLock(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(`${PAYMENT_REDIRECT_LOCK_PREFIX}${key}`);
  } catch {
    /* noop */
  }
}

type PendingSubscriptionPass = {
  merchantUid: string;
  tier: "free" | "standard" | "premium" | "vvip" | "family";
  profileLimit: number;
  startedAt: number;
};

function getPendingSubscriptionProfileLimit(tier: PendingSubscriptionPass["tier"]) {
  if (tier === "standard") return 3;
  if (tier === "premium") return 7;
  if (tier === "vvip") return 15;
  if (tier === "family") return 0;
  return 1;
}

function savePendingSubscriptionPass(tier: PendingSubscriptionPass["tier"], merchantUid: string) {
  if (typeof window === "undefined") return;
  const payload: PendingSubscriptionPass = {
    merchantUid,
    tier,
    profileLimit: getPendingSubscriptionProfileLimit(tier),
    startedAt: Date.now(),
  };
  localStorage.setItem("fortune_pending_subscription_pass", JSON.stringify(payload));
}

// 낙관 이용권은 "PG 결제창에 다녀오는 동안"만 유효하다. 결제창에서 탭을 닫는 등으로 정리 코드가
// 돌지 못하면 키가 그대로 남는데, TTL 이 없으면 며칠 뒤 재방문에도 이용권 보유로 보인다.
const PENDING_SUBSCRIPTION_PASS_TTL_MS = 15 * 60 * 1000;

function readPendingSubscriptionPass() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("fortune_pending_subscription_pass");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSubscriptionPass;
    const startedAt = Number(parsed?.startedAt || 0);
    if (!Number.isFinite(startedAt) || Date.now() - startedAt > PENDING_SUBSCRIPTION_PASS_TTL_MS) {
      localStorage.removeItem("fortune_pending_subscription_pass");
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════════════════════════════════
   서브 컴포넌트: 프로필 이용권 섹션
══════════════════════════════════════════════════════════════════ */

function SubscriptionSection({
  subscription,
  onSubscribe,
  onCancelSubscription,
  isProcessing,
  highlightedPlan,
  copy,
  formatLocale,
}: {
  subscription:  SubscriptionStatus;
  onSubscribe:   (plan: SubscriptionPlan) => void;
  onCancelSubscription: (resume: boolean) => void;
  isProcessing:  boolean;
  highlightedPlan: "standard" | "premium" | "vvip" | "family" | null;
  copy: PointsPageCopy;
  formatLocale: string;
}) {
  type PlanThemeKey = "amber" | "rose" | "purple";
  const planThemeMap: Record<PlanThemeKey, {
    card: string; label: string; badge: string; freeTag: string; btn: string; icon: string;
  }> = {
    amber: {
      card:    "border-[#e9d18a]/55 bg-[#0b1028]/95",
      label:   "text-[#ffe8a3]",
      badge:   "from-[#d8bd72] to-[#f5df9d]",
      freeTag: "bg-[#f3dd9a]/22 text-[#ffe8a3] ring-1 ring-[#f3dd9a]/60",
      btn:     "from-[#d8bd72] to-[#f5df9d] text-[#151832] shadow-[0_8px_18px_rgba(243,221,154,0.24)]",
      icon:    "🌔",
    },
    rose: {
      card:    "border-[#cab8ff]/55 bg-[#0d1230]/95",
      label:   "text-[#ded4ff]",
      badge:   "from-[#cab8ff] to-[#f3dd9a]",
      freeTag: "bg-[#cab8ff]/22 text-[#ded4ff] ring-1 ring-[#cab8ff]/60",
      btn:     "from-[#cab8ff] to-[#f3dd9a] text-[#151832] shadow-[0_8px_18px_rgba(202,184,255,0.24)]",
      icon:    "🌕",
    },
    purple: {
      card:    "border-[#8cb8ff]/55 bg-[#0d1433]/95",
      label:   "text-[#cfe1ff]",
      badge:   "from-[#f3dd9a] via-[#cab8ff] to-[#8cb8ff]",
      freeTag: "bg-[#8cb8ff]/22 text-[#e8f1ff] ring-1 ring-[#8cb8ff]/60",
      btn:     "from-[#f3dd9a] via-[#cab8ff] to-[#8cb8ff] text-[#151832] shadow-[0_8px_18px_rgba(140,184,255,0.24)]",
      icon:    "🌌",
    },
  };

  const expires = subscription.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString(formatLocale, { year: "numeric", month: "long", day: "numeric" })
    : null;

  const activeTierRank = subscription.isActive ? getSubscriptionTierRank(subscription.tier) : 0;
  return (
    <section
      aria-label={copy.subscriptionAria}
      className="overflow-hidden rounded-[24px] border border-[#f3dd9a]/32 bg-[#050817] text-slate-50 shadow-[0_24px_70px_rgba(4,7,26,0.56)] ring-1 ring-white/12 backdrop-blur"
    >
      {/* 섹션 헤더 */}
      <div
        className="px-5 pt-5 pb-5"
        style={{ background: "linear-gradient(145deg, rgba(5,8,23,0.99) 0%, rgba(12,18,48,0.98) 48%, rgba(24,29,72,0.96) 100%)" }}
      >
        {/* 제목 */}
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-[#ded4ff]">연이의 달빛 이용권 상점</p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-white">연이의 달빛 이용권 상점</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-100">
            30일 이용권 상품과 원화 결제 조건을 확인하세요.
          </p>
          <p className="mt-2 text-[12.5px] font-semibold text-[#ffe8a3]">
            이용권 상품은 보유 이용권으로 구매할 수 없습니다. 이용권은 원화 단건 결제로만 구매할 수 있습니다.
          </p>
        </div>

        {/* 핵심 혜택 callout */}
        <div className="mb-4 rounded-[16px] border border-[#cab8ff]/45 bg-[#11183a]/85 px-4 py-3.5 shadow-[inset_0_1px_3px_rgba(255,255,255,0.08)]">
          <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-black uppercase tracking-wide text-[#ffe8a3]">
            <span aria-hidden="true">🌙</span> 달빛 이용권의 특별한 이유
          </p>
          <p className="text-[13.5px] leading-6 text-slate-100">
            <span className="font-bold text-white">가족·연인·자녀 등 다른 생년월일</span>로 프로필을 추가해도,
            30일 이용권 하나로 <span className="font-bold text-white">모든 프로필에서 이용권 혜택을 그대로 이용</span>할 수 있습니다.
          </p>
          <p className="mt-2 text-[12.5px] font-semibold text-[#ded4ff]">
            이용권은 원화 단건 결제로만 구매할 수 있습니다. 월정석으로는 이용권을 구매할 수 없습니다.
          </p>
        </div>

        {/* 달빛 이용권 혜택 사전 안내 */}
        {subscription.lowBalanceWarning && (
          <div className="mb-4 rounded-[14px] border border-orange-300/50 bg-orange-400/12 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-orange-100">
              <span aria-hidden="true">🔔</span> 달빛 이용권 혜택 범위를 확인해 주세요
            </p>
            <p className="mt-1 text-[11.5px] text-orange-100/90">
              이용권 기간({expires}까지)은 유지되며,
              추가 유료 콘텐츠는 상품별 안내에 따라 이용할 수 있습니다.
            </p>
          </div>
        )}

        {/* 공통 운영 정책 안내 */}
        <div className="mb-4 rounded-[16px] border border-[#8cb8ff]/42 bg-[#0f2348]/80 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[12.5px] font-black text-[#e8f1ff]">
            <span aria-hidden="true">ℹ️</span> 이용권 운영 정책
          </p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-5 text-slate-100">
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">모든 신규 판매 이용권은 <strong>결제 검증 성공 시점부터 30일 동안 유효</strong>합니다.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">스탠다드·프리미엄·VVIP는 일반 유료 서비스가 각 3,000원/5,000원/10,000원 이하일 때 이용권으로 이용할 수 있습니다.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">Code Destiny Family는 허용된 기능 접근 권한으로만 이용되며, 더 높은 상품의 결제 수단이 아닙니다.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">PDF 서비스와 일반 유료 서비스 조건은 상품별 안내에서 확인할 수 있습니다.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">기간 종료 후 추가 결제 없이 무료 플랜으로 전환됩니다.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">원화 결제된 이용권은 유료 기능 이용 전 결제일로부터 7일 이내 환불 요청이 가능합니다.</span></li>
            <li className="flex items-start gap-1.5 font-bold text-rose-600"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0"><strong>원화 단건 결제로 여는 30일 이용권</strong>이며, 결제 전 환불 규정 동의가 필요합니다.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">콘텐츠 생성, PDF 렌더링, 유료 리딩 열람, 이용권 혜택 사용이 시작된 부분은 환불이 제한될 수 있습니다.</span></li>
          </ul>
        </div>

        {highlightedPlan && (
          <div className="mb-4 rounded-[14px] border border-rose-300 bg-rose-50/70 px-4 py-3">
            <p className="text-[11.5px] font-extrabold text-rose-800">🎯 메인 화면에서 선택한 플랜으로 안내 중</p>
            <p className="mt-1 text-[11.5px] text-rose-700">
              선택 플랜: <strong>{highlightedPlan === "standard" ? "스탠다드 달빛 이용권" : highlightedPlan === "premium" ? "프리미엄 달빛 이용권" : highlightedPlan === "family" ? "Code Destiny Family" : "VVIP 달빛 이용권"}</strong>
            </p>
          </div>
        )}

      </div>

      {/* ────────────────────────────────────────────────── */}
      {/* 무료 플랜 안내 + 이용권 훅                          */}
      {/* ────────────────────────────────────────────────── */}
      {(!subscription.isActive || subscription.tier === "free") && (
      <div className="mx-5 mb-5 rounded-[20px] border border-[#cab8ff]/24 bg-[#0b1028]/92 p-4 shadow-[0_14px_32px_rgba(7,10,28,0.34)]">
        {/* 제목 행 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl leading-none">🆓</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11.5px] font-black uppercase tracking-widest text-slate-300">Free Plan</p>
            <p className="text-[15px] font-black text-white leading-tight">무료 플랜</p>
          </div>
          {subscription.tier === "free" && (
            <span className="flex-shrink-0 rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-bold text-neutral-600">현재 플랜</span>
          )}
        </div>

        {/* 무료 제공 항목 */}
        <div className="mb-3 rounded-[14px] border border-emerald-300/30 bg-emerald-300/10 px-3.5 py-3">
          <p className="mb-2 text-[12px] font-extrabold text-emerald-100">✅ 무료로 지금 바로 즐길 수 있어요</p>
          <ul className="space-y-1.5">
            {[
              { icon: "☀️", text: "일일 운세 · 오늘/이달 운세 키워드", sub: "매일 갱신, 무제한 무료" },
              { icon: "🃏", text: "행복한 회복 타로", sub: "힐링 타로 — 제한 없이 무료" },
              { icon: "🀄", text: "데일리 점술 5종", sub: "화투점·데스티니 포커·돼지 주석점·영국 홍차점·역경 주역" },
              { icon: "📊", text: "기본 사주 만세력", sub: "연·월·일·시 명식표 + 일주 캐릭터 요약" },
              { icon: "🎭", text: "재미 맛보기 콘텐츠", sub: "MBTI 동물 궁합·사주 전문가 이상형·사주네컷 등" },
            ].map(({ icon, text, sub }) => (
              <li key={text} className="flex items-start gap-2">
                <span className="flex-shrink-0 text-sm leading-4 mt-0.5">{icon}</span>
                <span className="text-[12.5px] leading-5 text-slate-100">
                  <span className="font-semibold">{text}</span>
                  <span className="ml-1 text-[11.5px] text-slate-300">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 잠긴 콘텐츠 — 이용권 훅 */}
        <div className="mb-3 rounded-[14px] border border-white/18 bg-white/[0.09] px-3.5 py-3">
          <p className="mb-2 text-[12px] font-extrabold text-slate-100">🔒 이용권 선택 후 잠금이 해제돼요</p>
          <ul className="space-y-1.5">
            {[
              "상세 사주 분석 — 연애·재물·직업·건강 심층 리포트",
              "한 계정으로 최대 15개 프로필 동시 관리 (가족·연인·자녀 포함)",
              "프리미엄 타로 · 이집트 오라클 · 스톤헨지 룬 등",
              "RPG 운명 캐릭터 · 여행 운명지 · 건강 보고서",
              "가족·연인 등 다계정 프로필 동시 분석",
            ].map((text) => (
              <li key={text} className="flex items-start gap-2 opacity-60 blur-[0.3px]">
                <span className="flex-shrink-0 text-[11px] text-neutral-400 mt-0.5">🔒</span>
                <span className="text-[12.5px] text-slate-300 line-through decoration-slate-500">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 마케팅 훅 CTA 블록 */}
        <div className="rounded-[14px] border border-[#f3dd9a]/40 bg-[#f3dd9a]/10 px-4 py-3.5">
          <p className="mb-2 text-[13.5px] font-black leading-snug text-[#ffe8a3]">
            맛보기만으로도 이 정도인데,<br />
            <span className="text-white">30일 이용권으로 얼마나 깊이 볼 수 있을까요?</span> 🌙
          </p>
          <p className="mb-3 text-[12.5px] leading-6 text-slate-100">
            오늘 운세가 마음에 걸렸다면, 그건 당신의 직감이 맞는 거예요.
            <br />Honey 이용권 하나로 <strong>사주·타로·점성술의 진짜 깊이</strong>를 경험해 보세요.
            가족과 연인의 운명까지, <strong>30일 동안 모든 프로필</strong>에 혜택이 적용됩니다.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10.5px] font-bold text-rose-700">
              ✨ 결제 즉시 혜택 활성화
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[10.5px] font-bold text-sky-700">
              👨‍👩‍👧 최대 15 프로필 혜택 적용
            </span>
          </div>
        </div>
      </div>
      )}

      {/* 플랜 카드 */}
      <div className="grid gap-4 p-5 pt-0 sm:grid-cols-2 xl:grid-cols-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const theme = planThemeMap[plan.theme];
          const isCurrentActive = subscription.isActive && subscription.tier === plan.tier;
          const isHighlighted = highlightedPlan === plan.tier;
          const planTierRank = getSubscriptionTierRank(plan.tier);
          const lowerTierBlocked = activeTierRank > 0 && planTierRank < activeTierRank;
          const ctaDisabled = isProcessing || lowerTierBlocked;
          return (
            <div
              key={plan.id}
              className={[
                "relative flex flex-col rounded-[18px] border p-4 transition-shadow",
                isCurrentActive
                  ? "border-emerald-300/60 bg-emerald-300/10 shadow-[0_4px_20px_rgba(16,185,129,0.20)]"
                  : isHighlighted
                    ? `${theme.card} ring-2 ring-rose-300/65 shadow-[0_12px_28px_rgba(244,63,94,0.2)]`
                    : `${theme.card} shadow-[0_12px_28px_rgba(4,7,26,0.25)]`,
                lowerTierBlocked ? "opacity-65" : "",
              ].join(" ")}
            >
              {/* 뱃지 */}
              {plan.badge && !isCurrentActive && (
                <span className={`absolute top-3 right-3 rounded-full bg-gradient-to-r ${theme.badge} px-2 py-0.5 text-[11px] font-black text-[#151832] shadow`}>
                  {plan.tier === "vvip" ? `👑 ${copy.planBadges.vvip}` : `✨ ${copy.planBadges[plan.badge] || plan.badge}`}
                </span>
              )}
              {isCurrentActive && (
                <span className="absolute top-3 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-black text-white shadow">
                  ✓ {copy.activePassLabel}
                </span>
              )}

              {/* 플랜 아이콘 & 이름 */}
              <p className="text-xl leading-none">{theme.icon}</p>
              <p className={`mt-2 text-[12px] font-black uppercase tracking-wider ${theme.label}`}>{copy.planTitles[plan.tier]}</p>

              {/* 가격 */}
              <p className="mt-2 flex flex-wrap items-center gap-1 text-[17px] font-black leading-snug text-white">
                <CoinIcon size="md" />
                {formatSubscriptionPlanValueLine(plan, copy, formatLocale)}
              </p>
              <p className="mt-1 text-[12.5px] font-semibold text-slate-200">
                {copy.duration30} · {formatWon(plan.wonPrice, copy, formatLocale)}
              </p>

              {/* 커피 한 잔 뱃지 — freeUpTo 50 이하 플랜(스탠다드)에만 */}
              {plan.freeUpTo !== null && plan.freeUpTo <= 50 && plan.tier === "standard" && plan.durationMonths === 1 && (
                <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#f3dd9a]/22 px-2.5 py-1 text-[12px] font-bold text-[#ffe8a3]">
                  ☕ {copy.coffeeBadge}
                </div>
              )}

              {/* 무료 이용 범위 태그 */}
              <div className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${theme.freeTag}`}>
                🆓{" "}
                {formatSubscriptionPlanPolicy(plan, copy, formatLocale)}
              </div>

              {/* 기능 목록 */}
              <ul className="mt-3 flex-1 space-y-1.5">
                {plan.features.map((f) => {
                  const translatedFeature = copy.planFeatures[plan.tier]?.[f] || f;
                  const isBonus = f.startsWith("bonus");
                  const isKey = ["under3000", "under5000", "under10000", "allPaidPdf", "familyIncluded", "monthlyCap", "vvipConsult"].includes(f);
                  return (
                    <li
                      key={f}
                      className={[
                        "flex items-start gap-1.5 text-[12.5px] leading-5",
                        isBonus ? "font-semibold text-emerald-700"
                          : isKey  ? `font-semibold ${theme.label}`
                          : "text-slate-100",
                      ].join(" ")}
                    >
                      {!isBonus && (
                        <span className={`mt-0.5 flex-shrink-0 ${isKey ? theme.label : "text-amber-400"}`}>
                          {isKey ? "★" : "·"}
                        </span>
                      )}
                      {translatedFeature}
                    </li>
                  );
                })}
              </ul>

              {/* CTA 버튼 */}
              <button
                type="button"
                onClick={() => onSubscribe(plan)}
                disabled={ctaDisabled}
                className={[
                  "mt-4 w-full rounded-xl px-3 py-3 text-sm font-black shadow transition-all",
                  "hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
                  isCurrentActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_5px_14px_rgba(16,185,129,0.35)]"
                    : `bg-gradient-to-r ${theme.btn}`,
                ].join(" ")}
              >
                {isCurrentActive
                  ? copy.extendPass
                  : lowerTierBlocked
                    ? copy.lowerTierBlocked
                  : isHighlighted
                    ? copy.purchasePass(theme.icon)
                    : copy.purchasePass(theme.icon)}
              </button>

              {lowerTierBlocked && (
                <p className="mt-2 text-[11px] font-semibold text-violet-700">
                  {copy.lowerTierBlockedHelp}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {subscription.isActive && subscription.tier !== "free" && (
        <div className="mx-5 mb-5 rounded-[14px] border border-violet-200 bg-violet-50/60 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-violet-800">
            <span aria-hidden="true">🧭</span>
            {copy.activePassLabel}
          </p>
          <p className="mt-1 text-[11.5px] text-violet-700">
            {copy.activePassMessage(expires || copy.duration30)}
          </p>
          <div className="mt-2.5 flex justify-end">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onCancelSubscription(Boolean(subscription.cancelAtPeriodEnd))}
              className={[
                "rounded-[11px] px-3.5 py-2 text-[12px] font-bold transition",
                "disabled:cursor-not-allowed disabled:opacity-50",
                subscription.cancelAtPeriodEnd
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100",
              ].join(" ")}
            >
              {copy.activePassLabel}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5 px-5 pb-5">
        <p className="text-[12.5px] font-semibold text-[#ffe8a3]">✅ {copy.activePassFooter}</p>
        <p className="text-[12.5px] font-bold text-rose-100">{copy.activePassAutoRenewWarning}</p>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   서브 컴포넌트: Toast 알림 컨테이너
   화면 상단 중앙에 알림을 쌓아 표시하며 5초 후 자동 닫힙니다.
══════════════════════════════════════════════════════════════════ */

function ToastContainer({
  toasts,
  onDismiss,
  closeLabel,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
  closeLabel: string;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 z-[200] -translate-x-1/2 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.18)] ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : toast.type === "error"
                ? "bg-rose-50 border-rose-300 text-rose-800"
                : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          {/* 아이콘 */}
          <span className="mt-0.5 flex-shrink-0 text-base">
            {toast.type === "success" ? "✅" : toast.type === "error" ? "⚠️" : "ℹ️"}
          </span>
          {/* 메시지 */}
          <span className="flex-1 leading-snug">{toast.text}</span>
          {/* 수동 닫기 버튼 */}
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 text-base opacity-50 hover:opacity-90 transition-opacity"
            aria-label={closeLabel}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   서브 컴포넌트: 콘텐츠 기준 아이콘
   🪙 이모지 렌더링 불안정 문제를 해결합니다.
══════════════════════════════════════════════════════════════════ */

function CoinIcon({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizeClasses: Record<string, string> = {
    sm: "h-4 w-4 text-[8px]",
    md: "h-5 w-5 text-[10px]",
    lg: "h-6 w-6 text-[13px]",
    xl: "h-8 w-8 text-[16px]",
  };
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full font-black text-white select-none ${sizeClasses[size]} ${className}`}
      style={{
        background: "radial-gradient(circle at 38% 32%, #fff6b0 0%, #f5c842 45%, #c8860a 100%)",
        boxShadow: "inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -1px 2px rgba(0,0,0,0.18), 0 2px 6px rgba(140,80,0,0.28)",
      }}
    >
      ✦
    </span>
  );
}

function MonthlyCreditBonusCard({
  balance,
  expiresAt,
  ledgers,
  copy,
  formatLocale,
}: {
  balance: number;
  expiresAt?: string | null;
  ledgers: MonthlyCreditLedgerItem[];
  copy: PointsPageCopy;
  formatLocale: string;
}) {
  const expiresLine = balance > 0 ? formatMonthlyStoneExpiry(expiresAt) : null;
  return (
    <section
      aria-label={copy.monthlyBonusAria}
      className="rounded-[24px] border border-[#cab8ff]/36 bg-[#0b1028]/92 p-5 text-slate-50 shadow-[0_18px_46px_rgba(7,10,28,0.36)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ded4ff]">보너스 월정석</p>
          <h3 className="mt-1 text-lg font-black text-white">월정석 잔량</h3>
          <p className="mt-1 text-sm text-slate-200">
            월정석은 달빛 이용권과 이벤트로 지급되는 보너스 혜택이며, 월정석 자체는 별도로 구매하거나 충전할 수 없습니다. 받은 날로부터 30일간만 유효하고, 그 안에 쓰지 않은 지급분은 소멸합니다.
          </p>
        </div>
        <div className="rounded-[18px] border border-[#f3dd9a]/48 bg-[#f3dd9a]/18 px-4 py-3 text-left sm:text-right">
          <p className="text-xs font-bold text-[#ffe8a3]">현재 사용 가능</p>
          <p className="mt-1 text-2xl font-black text-white">{formatMonthlyCreditValue(balance, copy, formatLocale)}</p>
          <p className="mt-1 text-[11px] font-bold text-rose-100">구매·충전 불가</p>
          {expiresLine ? (
            <p className="mt-1 text-[11px] font-bold text-[#ffe8a3]">⏳ {expiresLine}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-white/16 bg-[#050817]/72 p-3.5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-white">월정석 사용 내역</h4>
          <span className="text-[11px] font-semibold text-slate-300">최근 {Math.min(ledgers.length, 8)}건</span>
        </div>
        {ledgers.length === 0 ? (
          <p className="text-sm text-slate-300">아직 월정석 사용 내역이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {ledgers.slice(0, 8).map((entry) => {
              const isSpend = entry.type === "MONTHLY_CREDIT_SPEND";
              return (
                <div
                  key={entry.id}
                  className="grid gap-2 rounded-[14px] border border-white/14 bg-white/[0.09] px-3 py-2.5 text-[12.5px] text-slate-100 sm:grid-cols-[88px_1fr_auto]"
                >
                  <span className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-bold ${isSpend ? "border-rose-200/50 text-rose-100" : "border-emerald-200/50 text-emerald-100"}`}>
                    {formatMonthlyCreditLedgerType(entry.type)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-white">{formatMonthlyCreditLedgerReason(entry)}</span>
                    <span className="block text-[11px] text-slate-300">
                      {formatDateTime(entry.createdAt, formatLocale)} · {formatMonthlyCreditValue(Number(entry.afterBalance || 0), copy, formatLocale)}
                    </span>
                  </span>
                  <span className={`font-black ${isSpend ? "text-rose-100" : "text-emerald-100"}`}>
                    {formatMonthlyCreditLedgerAmount(entry, copy, formatLocale)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
  서브 컴포넌트: 콘텐츠 가치 단위 카드
  콘텐츠 기준은 가격 산정용 내부 단위로만 안내합니다.
══════════════════════════════════════════════════════════════════ */

function WalletCard({ name, copy }: { name: string; copy: PointsPageCopy }) {
  return (
    <section
      aria-label={copy.walletAria}
      className="overflow-hidden rounded-[24px] border border-white/16 bg-[#0b1028]/92 text-slate-50 shadow-[0_18px_46px_rgba(7,10,28,0.42)] backdrop-blur"
    >
      <div
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(90deg, rgba(255,255,255,0), #f3dd9a 26%, #cab8ff 52%, #8cb8ff 78%, rgba(255,255,255,0))" }}
        aria-hidden="true"
      />
      <div
        className="rounded-b-[24px] p-5"
        style={{ background: "linear-gradient(135deg, rgba(13,19,43,0.94) 0%, rgba(39,34,82,0.86) 58%, rgba(92,78,137,0.72) 100%)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-[26px]"
              style={{
                background: "radial-gradient(circle at 35% 30%, #fff8d8 0%, #f3dd9a 48%, #cab8ff 100%)",
                boxShadow: "0 0 24px rgba(243,221,154,0.32)",
              }}
              aria-hidden="true"
            >
              <ShopPigImage className="h-11 w-11 object-contain drop-shadow-[0_4px_8px_rgba(3,4,18,0.42)]" />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ded4ff]">
                연이의 달빛 이용권 상점
              </p>
              <p className="mt-1 text-[17px] font-black leading-tight text-white">{name} 님의 달빛 이용권 상점</p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1 sm:items-end">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ffe8a3]">
              원화 결제 기준
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[22px] font-black leading-none text-white">
                30일 이용권
              </span>
            </div>
            <p className="max-w-[300px] text-[12.5px] leading-5 text-slate-100 sm:text-right">
              원화 단건 결제로 여는 30일 이용권이며, PDF와 고가 서비스 조건은 상품별 안내에 따릅니다.
            </p>
            <p className="max-w-[300px] text-[12.5px] font-bold leading-5 text-[#ffe8a3] sm:text-right">
              월정석은 보너스 혜택으로만 지급되며 월정석 자체는 구매·충전할 수 없습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
  서브 컴포넌트: 원화 결제 상품 카드
  클릭 시 결제 방법 모달로 이동합니다.
══════════════════════════════════════════════════════════════════ */

const MOONLIGHT_TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "이용권 없음",
  standard: "Standard 달빛 30일",
  premium: "Premium 달빛 30일",
  vvip: "VVIP 달빛 30일",
  family: "Code Destiny Family 30일",
};

function getMoonlightDaysLeft(expiresAt: string | null | undefined) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (!Number.isFinite(date.getTime())) return null;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

function getMoonlightExpiryLabel(expiresAt: string | null | undefined, formatLocale: string) {
  if (!expiresAt) return "만료일 정보 없음";
  const date = new Date(expiresAt);
  if (!Number.isFinite(date.getTime())) return "만료일 정보 없음";
  return date.toLocaleDateString(formatLocale, { year: "numeric", month: "long", day: "numeric" });
}

function getMoonlightProfileLabel(subscription: SubscriptionStatus) {
  const limit = subscription.profileLimit || getSubscriptionPolicyProfileLimit(subscription.tier);
  return limit <= 0 ? "프로필 무제한" : `프로필 최대 ${limit.toLocaleString("ko-KR")}개`;
}

function getMoonlightBenefitLabel(tier: SubscriptionTier) {
  if (tier === "family") return "3만원 미만 무제한 · 초융합 포함 10회";
  if (tier === "vvip") return "1만원 이하 유료 무료";
  if (tier === "premium") return "5천원 이하 유료 무료";
  if (tier === "standard") return "3천원 이하 유료 무료";
  return "30일 혜택 선택 가능";
}

function getMoonlightPlanPhase(plan: SubscriptionPlan): MoonPhase {
  if (plan.tier === "family") return "full";
  if (plan.tier === "vvip") return "gibbous";
  if (plan.tier === "premium") return "half";
  return "crescent";
}

// 히어로 메달리온·지갑 카드·빈 주문 내역 세 곳이 같은 연이를 쓰므로 로딩 실패 폴백까지 여기서만 관리한다.
// (URL 정본은 결제 대기 화면과 공유하는 PAYMENT_PIG_LOGO_URL — 상점용 상수를 따로 만들지 않는다.)
// 상점에서는 최대 90px로만 쓰므로 Cloudflare Image Resizing 축소본을 먼저 받는다.
// 정본이 동일 오리진 상대경로가 된 뒤에도 축소본을 계속 쓰도록 상대경로를 그대로 이어 붙인다
// (예전에는 new URL(상대경로)가 throw 해서 catch 로 떨어지며 축소를 조용히 포기했다).
const SHOP_PIG_RESIZED_URL = (() => {
  const resizePrefix = "/cdn-cgi/image/width=220,quality=82,format=auto";
  if (PAYMENT_PIG_LOGO_URL.startsWith("/")) return `${resizePrefix}${PAYMENT_PIG_LOGO_URL}`;
  try {
    const parsed = new URL(PAYMENT_PIG_LOGO_URL);
    return `${parsed.origin}${resizePrefix}${parsed.pathname}`;
  } catch {
    return PAYMENT_PIG_LOGO_URL;
  }
})();

function ShopPigImage({ className = "" }: { className?: string }) {
  const [src, setSrc] = useState(SHOP_PIG_RESIZED_URL);
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <img
      src={src}
      alt=""
      loading="eager"
      decoding="async"
      className={className}
      onError={() => {
        // 축소본 실패 시 원본으로, 원본까지 실패하면 숨긴다(달·문구는 그대로 남는다).
        if (src !== PAYMENT_PIG_LOGO_URL) setSrc(PAYMENT_PIG_LOGO_URL);
        else setFailed(true);
      }}
    />
  );
}

function MoonlightShopHero() {
  return (
    <header className="moon-shop-hero -mx-4 px-4 py-7 sm:mx-0 sm:rounded-[28px] sm:px-8 sm:py-8">
      <div className="moon-shop-stars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="moon-shop-visual" aria-hidden="true">
            <span className="moon-shop-visual-ring moon-shop-visual-ring--one" />
            <span className="moon-shop-visual-ring moon-shop-visual-ring--two" />
            <MoonIcon phase="full" className="moon-shop-visual-moon" />
            <ShopPigImage className="moon-shop-visual-pig" />
            <span className="moon-shop-visual-spark moon-shop-visual-spark--one" />
            <span className="moon-shop-visual-spark moon-shop-visual-spark--two" />
            <span className="moon-shop-visual-spark moon-shop-visual-spark--three" />
          </div>
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[color:var(--moon-silver)]">연이의 달빛 이용권 상점</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">연이의 달빛 이용권 상점</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--moon-silver)] sm:text-base">
              달빛 이용권 상품과 원화 결제 조건을 한 화면에서 확인하세요.
            </p>
            <p className="mt-2 text-sm font-black leading-6 text-[color:var(--moon-gold)]">
              이용권은 원화 단건 결제로만 구매할 수 있습니다. 월정석으로는 이용권을 구매할 수 없습니다.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Link href="/" prefetch={false} className="btn-moonlight inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black">
            홈 화면 바로가기
          </Link>
          <Link href="/points/history" className="btn-moonlight inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black">
            이용권 주문 내역
          </Link>
          <Link href="/" prefetch={false} className="btn-moonlight-ghost inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black">
            ← 서비스 화면으로
          </Link>
        </div>
      </div>
    </header>
  );
}

function MoonlightActivePassCard({
  subscription,
  formatLocale,
  isProcessing,
  onCancelSubscription,
}: {
  subscription: SubscriptionStatus;
  formatLocale: string;
  isProcessing: boolean;
  onCancelSubscription: (resume: boolean) => void;
}) {
  const isActivePass = subscription.isActive && subscription.tier !== "free";
  const tier = isActivePass ? subscription.tier : "free";
  const daysLeft = getMoonlightDaysLeft(subscription.expiresAt);
  const daysLeftLabel = daysLeft === null ? "남은 기간 확인 중" : `${daysLeft}일 남음`;
  const progress = isActivePass ? Math.max(0, Math.min(1, (daysLeft ?? 0) / 30)) : 0;
  const expiryLabel = getMoonlightExpiryLabel(subscription.expiresAt, formatLocale);
  const title = MOONLIGHT_TIER_LABELS[tier];
  const benefits = [
    { icon: "👤", label: getMoonlightProfileLabel(subscription) },
    { icon: "✨", label: getMoonlightBenefitLabel(tier) },
    { icon: "🌙", label: "월정석으로도 구매 가능" },
    { icon: "🗝️", label: tier === "family" ? "초융합 포함 전문가 상담 10회" : "한도 내 유료 리딩 혜택" },
  ];

  return (
    <section className="moon-card moon-active-card rounded-[24px] p-5 sm:p-6" aria-label="현재 달빛 이용권">
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(167,139,250,0.12)] shadow-[0_0_28px_rgba(167,139,250,0.32)]">
              <span className="text-2xl text-white" aria-hidden="true">∞</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--moon-mist)]">나의 달빛 이용권 혜택</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-white">{title}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-[color:var(--moon-teal)]">
                <span className="h-2 w-2 rounded-full bg-[color:var(--moon-teal)] shadow-[0_0_12px_rgba(94,234,212,0.76)]" aria-hidden="true" />
                {isActivePass ? `${title} 이용 중 · 만료일까지 이용 가능` : "활성 이용권이 없습니다"}
              </p>
            </div>
          </div>
          <span className="moon-family-badge rounded-full px-3 py-1 text-[11px] font-black">
            {tier === "family" ? "FAMILY" : tier === "free" ? "READY" : tier.toUpperCase()}
          </span>
        </div>

        <div className="moon-phase-panel mt-5 rounded-[18px] p-4">
          <div className="moon-phase-stars" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <MoonIcon phase="progress" progress={progress} className="h-20 w-20 flex-shrink-0" title="달빛 이용권 남은 기간" />
              <div>
                <p className="text-xs font-bold text-[color:var(--moon-mist)]">만료일</p>
                <p className="mt-1 text-base font-black text-white">{isActivePass ? expiryLabel : "이용권 구매 후 표시됩니다"}</p>
              </div>
            </div>
            <p className="text-xl font-black text-[color:var(--moon-teal)]">{isActivePass ? daysLeftLabel : "0일 남음"}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div key={benefit.label} className="moon-benefit-cell rounded-[16px] px-4 py-3">
              <span className="mr-2" aria-hidden="true">{benefit.icon}</span>
              <span className="text-sm font-black text-white">{benefit.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <a href="/terms#refund-policy" target="_blank" rel="noreferrer" className="text-sm font-black text-[color:var(--moon-glow)] underline-offset-4 hover:underline">
            환불 요청 안내 보기 →
          </a>
          {isActivePass ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onCancelSubscription(Boolean(subscription.cancelAtPeriodEnd))}
              className="btn-moonlight-ghost inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              이용권 상태 확인
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MoonlightMonthlyCreditCard({
  balance,
  expiresAt,
  ledgers,
  copy,
  formatLocale,
  isLoading,
  hasError,
  onRetry,
}: {
  balance: number;
  expiresAt?: string | null;
  ledgers: MonthlyCreditLedgerItem[];
  copy: PointsPageCopy;
  formatLocale: string;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}) {
  const expiresLine = balance > 0 ? formatMonthlyStoneExpiry(expiresAt) : null;
  if (isLoading) {
    return (
      <section className="moon-card rounded-[24px] p-5 sm:p-6" aria-label={copy.monthlyBonusAria}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--moon-glow)]">보너스 월정석</p>
            <h2 className="mt-2 text-2xl font-black text-white">월정석의 흐름을 불러오는 중이에요</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--moon-silver)]">
              달빛 이용권과 보너스 혜택을 조용히 정돈하고 있어요.
            </p>
          </div>
          <div className="moonstone-counter flex min-h-[168px] min-w-[196px] flex-col items-center justify-center rounded-[22px] px-8 py-6 text-center">
            <p className="moon-loading-orb moonstone-counter__symbol text-4xl font-black">✦</p>
            <p className="moonstone-counter__label mt-3 text-sm font-black text-white">달빛 확인 중</p>
            <p className="moonstone-counter__note mt-1 text-xs font-bold text-[color:var(--moon-gold)]">잠시만 기다려 주세요</p>
          </div>
        </div>
        <div className="mt-6 space-y-3 border-t border-[color:var(--moon-rim)] pt-5">
          <div className="moon-loading-line h-4 w-40 rounded-full" />
          <div className="moon-loading-line h-20 rounded-[18px]" />
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="moon-card rounded-[24px] p-5 sm:p-6" aria-label={copy.monthlyBonusAria}>
        <div className="moon-empty flex flex-col items-center rounded-[18px] px-4 py-8 text-center">
          <MoonIcon phase="crescent" className="h-14 w-14" title="월정석 정보 대기" />
          <p className="mt-3 text-base font-black text-white">월정석의 달빛이 잠시 흐려졌어요</p>
          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--moon-mist)]">
            잔량과 사용 내역은 곧 다시 확인할 수 있어요.
          </p>
          <button type="button" onClick={onRetry} className="btn-moonlight mt-5 inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-black">
            다시 확인하기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="moon-card rounded-[24px] p-5 sm:p-6" aria-label={copy.monthlyBonusAria}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--moon-glow)]">보너스 월정석</p>
          <h2 className="mt-2 text-2xl font-black text-white">월정석이란?</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--moon-silver)]">
            특별한 날, 카카오톡 공유, 운영 이벤트를 통해서만 얻을 수 있는 보너스 재화입니다. 월정석 자체는 별도로 구매하거나 충전할 수 없습니다.
          </p>
          <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--moon-glow)]">
            월정석은 받은 날로부터 30일간만 쓸 수 있고, 그 안에 안 쓰면 사라져요. 나눠 받았다면 각각 받은 날을 기준으로 따로 만료되고, 쓸 때는 먼저 만료되는 것부터 빠져나갑니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["특별한 날", "카카오톡 공유", "운영 이벤트"].map((source) => (
              <span key={source} className="moonstone-source-pill rounded-full px-3 py-1 text-xs font-black">
                ✦ {source}
              </span>
            ))}
          </div>
        </div>
        <div className="moonstone-counter flex min-h-[178px] min-w-[206px] flex-col items-center justify-center rounded-[24px] px-8 py-6 text-center">
          <p className="moonstone-counter__symbol text-base font-black">✦</p>
          <p className="moonstone-counter__value mt-1 text-5xl font-black leading-none">{Math.max(0, Math.floor(Number(balance || 0))).toLocaleString(formatLocale)}</p>
          <p className="moonstone-counter__label mt-3 text-sm font-black text-white">현재 사용 가능</p>
          <p className="moonstone-counter__note mt-1 text-xs font-bold text-[color:var(--moon-gold)]">이벤트 전용 재화</p>
          {expiresLine ? (
            <p className="moonstone-counter__note mt-1 text-xs font-bold text-[color:var(--moon-glow)]">⏳ {expiresLine}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 border-t border-[color:var(--moon-rim)] pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-white">월정석 사용 내역</h3>
          <span className="text-xs font-bold text-[color:var(--moon-mist)]">최근 {Math.min(ledgers.length, 8)}건</span>
        </div>
        {ledgers.length === 0 ? (
          <div className="moon-empty flex flex-col items-center rounded-[18px] px-4 py-8 text-center">
            <MoonIcon phase="crescent" className="h-14 w-14" title="월정석 사용 내역 없음" />
            <p className="mt-3 text-base font-black text-white">아직 달빛이 흐르지 않았어요</p>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--moon-mist)]">
              달빛 이용권을 구매하면 보너스 월정석을 받을 수 있어요.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ledgers.slice(0, 8).map((entry) => {
              const isSpend = entry.type === "MONTHLY_CREDIT_SPEND";
              return (
                <div key={entry.id} className="moonstone-ledger-row grid gap-2 rounded-[16px] px-4 py-3 text-sm text-[color:var(--moon-silver)] sm:grid-cols-[110px_1fr_auto]">
                  <span className={`w-fit rounded-full border px-2 py-0.5 text-xs font-black ${isSpend ? "border-rose-300/50 text-rose-100" : "border-teal-300/50 text-teal-100"}`}>
                    {formatMonthlyCreditLedgerType(entry.type)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-black text-white">{formatMonthlyCreditLedgerReason(entry)}</span>
                    <span className="block text-xs text-[color:var(--moon-mist)]">
                      {formatDateTime(entry.createdAt, formatLocale)} · {formatMonthlyCreditValue(Number(entry.afterBalance || 0), copy, formatLocale)}
                    </span>
                  </span>
                  <span className={`font-black ${isSpend ? "text-rose-100" : "text-[color:var(--moon-teal)]"}`}>
                    {formatMonthlyCreditLedgerAmount(entry, copy, formatLocale)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function MoonlightShopPlans({
  subscription,
  onSubscribe,
  onCancelSubscription,
  isProcessing,
  highlightedPlan,
  copy,
  formatLocale,
}: {
  subscription: SubscriptionStatus;
  onSubscribe: (plan: SubscriptionPlan) => void;
  onCancelSubscription: (resume: boolean) => void;
  isProcessing: boolean;
  highlightedPlan: "standard" | "premium" | "vvip" | "family" | null;
  copy: PointsPageCopy;
  formatLocale: string;
}) {
  const activeTierRank = subscription.isActive ? getSubscriptionTierRank(subscription.tier) : 0;

  return (
    <section className="moon-card rounded-[24px] p-5 sm:p-6" aria-label={copy.subscriptionAria}>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--moon-glow)]">이용권 상품</p>
          <h2 className="mt-2 text-2xl font-black text-white">판매 중인 달빛 이용권</h2>
        </div>
        {subscription.isActive && subscription.tier !== "free" ? (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onCancelSubscription(Boolean(subscription.cancelAtPeriodEnd))}
            className="btn-moonlight-ghost inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            이용권 상태 확인
          </button>
        ) : null}
      </div>

      <div className="grid gap-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrentActive = subscription.isActive && subscription.tier === plan.tier;
          const isHighlighted = highlightedPlan === plan.tier;
          const planTierRank = getSubscriptionTierRank(plan.tier);
          const lowerTierBlocked = activeTierRank > 0 && planTierRank < activeTierRank;
          const ctaDisabled = isProcessing || lowerTierBlocked;
          const features = plan.features.slice(0, 3).map((feature) => copy.planFeatures[plan.tier]?.[feature] || feature);

          return (
            <article key={plan.id} className={`moon-plan-card rounded-[22px] p-4 ${isHighlighted ? "ring-2 ring-[color:var(--moon-glow)]" : ""} ${lowerTierBlocked ? "opacity-60" : ""}`}>
              <div className="grid gap-4 sm:grid-cols-[82px_1fr_auto] sm:items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-[20px] border border-[color:var(--moon-rim)] bg-[rgba(8,9,26,0.42)]">
                  <MoonIcon phase={getMoonlightPlanPhase(plan)} className="h-16 w-16" title={copy.planTitles[plan.tier]} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-white">{copy.planTitles[plan.tier]}</h3>
                    {plan.badge && !isCurrentActive ? (
                      <span className="rounded-full bg-[rgba(129,140,248,0.16)] px-2.5 py-1 text-xs font-black text-[color:var(--moon-family)]">
                        {copy.planBadges[plan.badge] || plan.badge}
                      </span>
                    ) : null}
                    {isCurrentActive ? (
                      <span className="rounded-full bg-[rgba(94,234,212,0.16)] px-2.5 py-1 text-xs font-black text-[color:var(--moon-teal)]">현재 이용 중</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-bold text-[color:var(--moon-mist)]">원화 단건 결제로 구매하는 30일 이용권</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[color:var(--moon-rim)] px-2.5 py-1 text-xs font-bold text-[color:var(--moon-silver)]">
                      {formatSubscriptionPlanPolicy(plan, copy, formatLocale)}
                    </span>
                    {features.map((feature) => (
                      <span key={feature} className="rounded-full border border-[color:var(--moon-rim)] px-2.5 py-1 text-xs font-bold text-[color:var(--moon-mist)]">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:min-w-[176px] sm:items-end">
                  <p className="text-2xl font-black text-[color:var(--moon-gold)]">{formatWon(plan.wonPrice, copy, formatLocale)}</p>
                  <button
                    type="button"
                    onClick={() => onSubscribe(plan)}
                    disabled={ctaDisabled}
                    className="btn-moonlight inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {isCurrentActive ? "연장하기 →" : lowerTierBlocked ? copy.lowerTierBlocked : "구매하기 →"}
                  </button>
                  {lowerTierBlocked ? (
                    <p className="text-right text-xs font-bold text-[color:var(--moon-mist)]">{copy.lowerTierBlockedHelp}</p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MoonlightOrderHistory({
  payments,
  cancelingPaymentId,
  requestCancelPayment,
  copy,
  formatLocale,
  isLoading,
  hasError,
  historyDeferred,
  onRetry,
}: {
  payments: PaymentHistoryItem[];
  cancelingPaymentId: string | null;
  requestCancelPayment: (payment: PaymentHistoryItem) => void;
  copy: PointsPageCopy;
  formatLocale: string;
  isLoading: boolean;
  hasError: boolean;
  historyDeferred: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <section className="moon-card rounded-[24px] p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black text-white">최근 주문 내역</h2>
          <span className="text-xs font-bold text-[color:var(--moon-mist)]">달빛 주문 기록 확인 중</span>
        </div>
        <div className="space-y-3">
          <div className="moon-loading-line h-24 rounded-[18px]" />
          <div className="moon-loading-line h-24 rounded-[18px]" />
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="moon-card rounded-[24px] p-5 sm:p-6">
        <div className="moon-empty flex flex-col items-center rounded-[18px] px-4 py-8 text-center">
          <MoonIcon phase="outline" className="h-14 w-14" title="이용권 주문 내역 대기" />
          <p className="mt-3 text-base font-black text-white">주문 내역의 달빛이 잠시 가려졌어요</p>
          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--moon-mist)]">
            결제 기능은 그대로 유지되며, 내역은 잠시 뒤 다시 확인할 수 있어요.
          </p>
          <button type="button" onClick={onRetry} className="btn-moonlight mt-5 inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-black">
            다시 확인하기
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="moon-card rounded-[24px] p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black text-white">최근 주문 내역</h2>
        <span className="text-xs font-bold text-[color:var(--moon-mist)]">주문시각 / 결제시각 / 승인번호 / 영수증</span>
      </div>
      {historyDeferred ? (
        <div className="moon-empty flex flex-col items-center rounded-[18px] px-4 py-8 text-center">
          <p className="text-base font-black text-white">주문 내역은 별도 화면에서 확인할 수 있어요.</p>
          <Link href="/points/history" className="mt-3 text-sm font-bold text-[#f3dd9a] hover:text-[#ffe8a3]">이용권 주문 내역</Link>
        </div>
      ) : payments.length === 0 ? (
        <div className="moon-empty flex flex-col items-center rounded-[18px] px-4 py-8 text-center">
          <ShopPigImage className="h-[72px] w-[72px] object-contain drop-shadow-[0_6px_14px_rgba(3,4,18,0.5)]" />
          <p className="mt-3 text-base font-black text-white">첫 번째 달빛 이용권을 구매해보세요</p>
          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--moon-mist)]">
            이용권 주문 내역이 이곳에 차분히 쌓입니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const isPassAccess = payment.isPassAccess === true;
            const statusMeta = mapPaymentStatusLabel(payment.status, copy);
            // 이용권 이용 건은 실제 결제가 아니므로 취소·영수증 대상이 아니다.
            const canCancel = canRequestPaymentCancel(payment);
            return (
              <div key={payment.id} className="rounded-[18px] border border-[color:var(--moon-rim)] bg-[rgba(21,24,64,0.78)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-black text-white">
                    {formatWon(payment.paymentAmount, copy, formatLocale)}
                    {isPassAccess && (payment.passListPriceWon || 0) > 0 && (
                      <span className="ml-2 text-xs font-bold text-[color:var(--moon-mist)]">
                        정가 {formatWon(payment.passListPriceWon || 0, copy, formatLocale)} · 이용권 적용
                      </span>
                    )}
                  </p>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-black ${
                      isPassAccess
                        ? "border-[color:var(--moon-family)] text-[color:var(--moon-family)]"
                        : statusMeta.cls
                    }`}
                  >
                    {isPassAccess ? "이용권 적용" : statusMeta.label}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-xs font-semibold text-[color:var(--moon-mist)] sm:grid-cols-2">
                  <p>주문시각: {formatDateTime(payment.createdAt || payment.updatedAt, formatLocale)}</p>
                  <p>결제시각: {formatPaymentTimeLabel(payment, copy, formatLocale)}</p>
                  <p>최근변경: {formatDateTime(payment.updatedAt || payment.paidAt || payment.createdAt, formatLocale)}</p>
                  <p>결제수단: {formatPaymentMethodLabel(payment, copy)}</p>
                  {!isPassAccess && <p>승인번호: {payment.approvalNumber || "-"}</p>}
                  <p>주문번호: {payment.merchantUid || "-"}</p>
                  {!isPassAccess && <p>결제ID: {payment.impUid || "-"}</p>}
                </div>
                {isPassAccess ? (
                  <p className="mt-3 text-xs font-bold text-[color:var(--moon-teal)]">
                    이용권으로 무료 이용한 건이라 결제·환불 대상이 아닙니다.
                  </p>
                ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {payment.receiptUrl ? (
                    <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="btn-moonlight-ghost inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-black">
                      영수증 보기
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-[color:var(--moon-mist)]">영수증 URL 미제공</span>
                  )}
                  <button
                    type="button"
                    disabled={!canCancel || cancelingPaymentId === payment.id}
                    onClick={() => requestCancelPayment(payment)}
                    className="inline-flex min-h-9 items-center rounded-lg border border-rose-300/45 bg-rose-400/10 px-3 text-xs font-black text-rose-100 transition-colors hover:bg-rose-400/16 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cancelingPaymentId === payment.id ? "취소 처리 중..." : "결제 취소 요청"}
                  </button>
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MoonlightPaymentNotice() {
  return (
    <section className="moon-card rounded-[20px] px-5 py-4 text-sm font-semibold leading-7 text-[color:var(--moon-silver)]">
      각 이용권은 정해진 금액 범위의 유료 리딩을 30일 동안 열어 줍니다. Family는 3만원 이상 상담(초융합 포함)을 이용권 기간당 10회까지 포함하며, 이용권은 원화 단건 결제로만 구매할 수 있습니다.
    </section>
  );
}

function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: PointPackage;
  selected: boolean;
  onSelect: (pkg: PointPackage) => void;
}) {
  const isBest = false;
  const listPrice = pkg.points * 100;
  const discountRate = listPrice > 0 ? Math.max(0, Math.round((1 - pkg.amount / listPrice) * 100)) : 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(pkg)}
      className={[
        "relative w-full rounded-[20px] border p-4 text-left",
        "transition-all duration-200 active:scale-[0.97] active:shadow-none",
        selected
          ? "border-[#f3dd9a] bg-white/[0.14] shadow-[0_14px_34px_rgba(202,184,255,0.22)] -translate-y-0.5 ring-2 ring-[#cab8ff]/45"
          : "border-white/12 bg-white/[0.08] shadow-[0_8px_22px_rgba(7,10,28,0.18)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(202,184,255,0.20)] hover:border-[#cab8ff]/60",
      ].join(" ")}
    >
      {/* BEST 뱃지 */}
      {isBest && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#cab8ff] to-[#f3dd9a] px-2.5 py-1 text-[11px] font-black text-[#151832] shadow-[0_4px_12px_rgba(202,184,255,0.32)]">
          추천 결제 기준
        </span>
      )}

      {/* 상단 행: 상품명 + 콘텐츠 기준 가격 */}
      <div className={`flex items-center justify-between gap-2 ${isBest ? "pr-[90px]" : ""}`}>
        <span className="text-[15px] font-bold text-white">{pkg.title}</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[15px] font-black text-[#f3dd9a]">
          <CoinIcon size="md" />
          콘텐츠 기준 {pkg.points.toLocaleString("ko-KR")}
        </span>
      </div>
      <p className="mt-1 text-[11.5px] font-semibold text-slate-200">{pkg.description}</p>

      {/* 하단 행: 원화 금액 + 정책 */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#7A5230]">
          <span className="text-[11px] text-slate-400 line-through">{formatWon(listPrice)}</span>
          {formatWon(pkg.amount)}
        </span>
        <span className="text-sm font-bold text-[#f3dd9a]">
          {discountRate}% 할인
        </span>
      </div>
      <span className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#cab8ff] to-[#f3dd9a] px-2.5 py-1 text-[12px] font-black text-[#151832] shadow-[0_3px_10px_rgba(202,184,255,0.24)]">
        원화 결제
      </span>

      {/* 선택 체크마크 */}
      {selected && (
        <span className="absolute bottom-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-[0_2px_8px_rgba(180,130,0,0.4)]">
          ✓
        </span>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   메인 페이지 컴포넌트: PointsPage
══════════════════════════════════════════════════════════════════ */

export default function PointsPage() {
  const router = useRouter();
  const authState = useAuthStore();
  const authStoreUserId = authState.user?.id || "";

  /** 모바일 리디렉션 복귀를 한 번만 처리하기 위한 플래그 */
  const redirectHandledRef = useRef(false);
  const paymentActionLockRef = useRef<{ key: string; startedAt: number } | null>(null);
  const confirmPaymentInFlightRef = useRef(new Map<string, Promise<ConfirmResponse>>());
  const confirmSubscriptionInFlightRef = useRef(new Map<string, Promise<ConfirmSubscriptionResponse>>());
  const pendingSubscriptionConfirmRef = useRef<PendingSubscriptionConfirm | null>(null);
  const subscriptionStatusCheckInFlightRef = useRef(false);
  const subscriptionStatusCheckHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const pendingSinglePaymentConfirmRef = useRef<PendingSinglePaymentConfirm | null>(null);
  const singlePaymentStatusCheckInFlightRef = useRef(false);
  const singlePaymentStatusCheckHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const singlePaymentConfirmFlowRef = useRef<{
    key: string;
    promise: Promise<"success" | "unknown" | "failed">;
  } | null>(null);
  const singlePaymentConfirmTimerRef = useRef<number | null>(null);
  const fetchMyPointStateInFlightRef = useRef<Promise<void> | null>(null);
  const fetchSubscriptionStatusInFlightRef = useRef<Promise<void> | null>(null);
  const hasVerifiedShopSnapshotRef = useRef(false);
  /** Toast ID 증가용 카운터 */
  const toastCounter = useRef(0);

  /* ── API 기본 URL ─────────────────────────────────────────────── */
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const [lang, setLang] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = POINTS_PAGE_COPY[lang] || POINTS_PAGE_COPY.ko;
  const formatLocale = FORMAT_LOCALE_BY_LANG[lang] || FORMAT_LOCALE_BY_LANG.ko;

  /* ── 상태 ──────────────────────────────────────────────────────── */
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [selectedPackage] = useState<PointPackage>(POINT_PACKAGES[0]);
  const [selectedMethod, setSelectedMethod] = useState<string>("card_general");

  const [isBooting, setIsBooting] = useState(true);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingVariant, setProcessingVariant] = useState<PaymentLoadingVariant>("subscription");
  const [processingText, setProcessingText] = useState(
    copy.subscriptionAria,
  );
  const {
    startProcessing: showProcessingOverlay,
    stopProcessing: hideProcessingOverlay,
    setProcessingAction,
  } = usePaymentProcessing();
  const [showStarBurst, setShowStarBurst] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [paymentHistoryDeferred, setPaymentHistoryDeferred] = useState(false);
  const [monthlyStoneBalance, setMonthlyStoneBalance] = useState(0);
  // 서버가 잔량을 확인해주지 못한 상태. 이때는 "부족"이 아니라 "미확정"이므로 결제 수단을 잠그지 않는다.
  const [monthlyStoneUnverified, setMonthlyStoneUnverified] = useState(false);
  const [monthlyStoneExpiresAt, setMonthlyStoneExpiresAt] = useState<string | null>(null);
  const [monthlyCreditLedgers, setMonthlyCreditLedgers] = useState<MonthlyCreditLedgerItem[]>([]);
  const [pointStateStatus, setPointStateStatus] = useState<PointStateStatus>("idle");
  const [pointStateError, setPointStateError] = useState<string | null>(null);
  const [cancelingPaymentId, setCancelingPaymentId] = useState<string | null>(null);
  const [landingPlanPreset, setLandingPlanPreset] = useState<"standard" | "premium" | "vvip" | "family" | null>(null);
  // 결제창에서 인계(cdco=1)받은 진입인지. 인계일 때만 결제 확인 모달을 자동으로 연다.
  const [checkoutHandoffRequested, setCheckoutHandoffRequested] = useState(false);
  const checkoutHandoffFiredRef = useRef(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [pendingSubscriptionPaymentPlan, setPendingSubscriptionPaymentPlan] = useState<SubscriptionPlan | null>(null);
  const [isSubscriptionRefundAgreed, setIsSubscriptionRefundAgreed] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    tier:         "free",
    isActive:     false,
    expiresAt:    null,
    profileLimit: 1,
    cancelAtPeriodEnd: false,
    cancelRequestedAt: null,
    freeLimit: 0,
  });

  // 낙관 이용권을 덮어쓰기 직전의 상태를 보관해 두고, 결제가 취소·실패하면 그대로 되돌린다.
  // 예전에는 취소 시 localStorage 만 지워서 화면은 계속 "이용권 적용됨"으로 남았다.
  const subscriptionRef = useRef(subscription);
  useEffect(() => { subscriptionRef.current = subscription; }, [subscription]);
  const optimisticPassBackupRef = useRef<SubscriptionStatus | null>(null);

  /** Toast 알림 목록 */
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => {
    const refreshLocale = () => setLang(getCurrentLoadingLocale());
    refreshLocale();
    window.addEventListener("cd:locale-ready", refreshLocale as EventListener);
    window.addEventListener("storage", refreshLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", refreshLocale as EventListener);
      window.removeEventListener("storage", refreshLocale);
    };
  }, []);

  /* ── 이용권 결제 준비 ────────────────────────────────────────────────
     결제 준비 요청은 사용자가 실제 원화 결제 버튼을 누른 뒤에만 실행한다.
     동일 Idempotency-Key는 서버의 멱등 분기와 함께 사용해 연속 클릭 중복을 막는다. */
  const subscriptionPrepareRef = useRef<SubscriptionPrepareEntry | null>(null);

  const requestSubscriptionPrepare = useCallback(async (
    plan: SubscriptionPlan,
    idempotencyKey: string,
    method: string,
  ): Promise<SubscriptionPrepareAttempt> => {
    const flowerAdminToken = getFlowerAdminTokenClient();
    const response = await authFetch(`${apiBase}/api/payments/subscription/prepare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        ...(flowerAdminToken ? { "x-admin-token": flowerAdminToken } : {}),
      },
      credentials: "include",
      body: JSON.stringify({
        tier: plan.tier,
        planId: plan.planId,
        durationMonths: plan.durationMonths,
        durationDays: 30,
        amount: plan.wonPrice,
        currency: "KRW",
        productType: plan.productType,
        paymentMethod: method,
      }),
    }, {
      retryOn401: true,
      apiBase,
    });
    const data = await safeParseJson<PrepareSubscriptionOrderResponse>(response);
    return { status: response.status, data: { ...data, ok: response.ok && Boolean(data.order) } };
  }, [apiBase]);

  const startSubscriptionPrepare = useCallback((plan: SubscriptionPlan): SubscriptionPrepareEntry => {
    const method = selectedMethod || "card_general";
    const existing = subscriptionPrepareRef.current;
    if (existing && existing.planId === plan.planId && existing.method === method) return existing;

    const idempotencyKey = `membership-prepare-${plan.planId}-${method}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: SubscriptionPrepareEntry = {
      planId: plan.planId,
      method,
      idempotencyKey,
      settled: false,
      promise: null as unknown as Promise<SubscriptionPrepareAttempt>,
    };
    entry.promise = requestSubscriptionPrepare(plan, idempotencyKey, method)
      .catch((error: unknown) => ({
        status: 0,
        data: { message: getErrorMessage(error, "이용권 결제 준비에 실패했습니다.") },
      } as SubscriptionPrepareAttempt))
      .then((result) => {
        entry.settled = true;
        return result;
      });
    subscriptionPrepareRef.current = entry;
    return entry;
  }, [requestSubscriptionPrepare, selectedMethod]);

  useEffect(() => {
    setIsSubscriptionRefundAgreed(false);
    // 결제 모달을 여는 것만으로는 결제 준비 API를 호출하지 않는다 —
    // config/prepare/payment-phone은 실제 원화 결제 버튼을 누른 뒤에만 준비한다.
    if (!pendingSubscriptionPaymentPlan) {
      subscriptionPrepareRef.current = null;
      return;
    }
    // 예외는 PortOne SDK 스크립트 하나다. 우리 API 호출도 주문 생성도 아닌 CDN 다운로드일 뿐이고,
    // 이걸 버튼 클릭 뒤로 미루면 콜드 다운로드 시간이 그대로 결제창 오픈 지연이 된다.
    void ensurePortoneSdk().catch(() => {});
  }, [pendingSubscriptionPaymentPlan?.id]);

  // 결제창 오픈 임계경로에서 DNS+TLS 를 걷어낸다. 정적 셸(index.html)에는 이미 있고 /points 에만 없었다.
  useEffect(() => {
    if (typeof document === "undefined") return;
    for (const rel of ["preconnect", "dns-prefetch"]) {
      if (document.head.querySelector(`link[rel="${rel}"][href="https://cdn.portone.io"]`)) continue;
      const link = document.createElement("link");
      link.rel = rel;
      link.href = "https://cdn.portone.io";
      if (rel === "preconnect") link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const raw = String(query.get("plan") || "").toLowerCase();
    if (raw === "standard" || raw === "premium" || raw === "vvip" || raw === "family") {
      setLandingPlanPreset(raw);
    }
    // 결제창의 '이용권으로 구매'에서 넘어온 진입(cdco=1)만 결제 확인 모달을 자동으로 연다.
    // 그냥 상점을 구경하러 들어온 사용자에게는 열지 않는다.
    if (query.get("cdco") === "1") setCheckoutHandoffRequested(true);
  }, []);

  /**
   * 🔴 결제창 → 이용권 상점 원클릭 인계. 예전에는 ?plan= 이 플랜을 '강조'만 해서 사용자가 그 플랜을
   * 다시 찾아 누르고 결제 버튼을 또 눌러야 했다(클릭 2회 + 화면 탐색). 여기서 결제 확인 모달까지
   * 바로 열어 준다 — 결제 버튼을 누르면 그 시점에 PortOne SDK·prepare·config를 준비한다.
   * 결제 모달만 열린 상태에서는 결제 관련 API를 호출하지 않는다.
   * 비로그인이면 열지 않는다(기존 로그인 유도 흐름을 그대로 둔다). ref 가드로 한 번만 발화한다.
   */
  useEffect(() => {
    if (!checkoutHandoffRequested || checkoutHandoffFiredRef.current) return;
    if (!landingPlanPreset || !authUser) return;
    const plan = SUBSCRIPTION_PLANS.find((item) => item.tier === landingPlanPreset && item.durationMonths === 1);
    if (!plan) return;
    checkoutHandoffFiredRef.current = true;
    setPendingSubscriptionPaymentPlan(plan);
  }, [checkoutHandoffRequested, landingPlanPreset, authUser]);

  /* ── Toast 헬퍼 ───────────────────────────────────────────────── */

  /** 새 Toast를 추가하고 5초 후 자동 제거합니다. */
  const pushToast = useCallback((type: ToastItem["type"], text: string) => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  /** 특정 Toast를 수동으로 닫습니다. */
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * 🔴 결제창의 '이용권으로 구매'로 넘어온 사용자를 원래 보던 화면으로 돌려보낸다.
   * 예전에는 상점으로 이동하는 순간 원래 요청이 버려져(status:'cancelled') 사용자가 스스로
   * 되돌아가야 했다. 기능을 자동 재실행하지는 않는다 — 돌아간 화면에서 다시 누르면 이용권
   * 커버로 무료 통과한다(자동 실행은 의도치 않은 생성·중복 실행 위험이 이득보다 크다).
   * 복귀 지점은 consumeCheckoutReturn 이 읽는 즉시 지우므로 왕복 루프가 생기지 않는다.
   */
  const scheduleCheckoutReturn = useCallback(() => {
    if (typeof window === "undefined") return false;
    const target = checkoutEntry.consumeCheckoutReturn();
    if (!target?.url) return false;
    pushToast("success", "달빛 이용권이 적용되었습니다. 원래 보시던 화면으로 돌아갈게요.");
    // 🔴 예전에는 스냅샷을 지우고 떠났다. 그러면 목적지의 재예열이 idle(1200~2200ms)이라, 도착 직후
    // 첫 클릭이 snapshotVerdictOnly 진입 판정에서 indeterminate 로 떨어져 **방금 이용권을 산 사용자에게
    // 결제창이 다시 뜨는** 레이스가 났다(이중구매 노출). 인증이 가장 뜨거운 지금 서버 정본을 직접 받아
    // 신선한 스냅샷을 심어 두고 떠난다 — 실패·지연(상한 2.5s)일 때만 종전대로 삭제 폴백(오염된 옛
    // 'none' 잔존 방지). 토스트 최소 체류 1.2s 는 유지된다.
    const departAt = Date.now() + 1200;
    const warmFreshSnapshot = async (): Promise<boolean> => {
      const response = await authFetch(`${apiBase}/api/subscription/status`, {
        method: "GET",
        credentials: "include",
        headers: { "x-code-destiny-cache-refresh": "1" },
      }, { retryOn401: true, apiBase, clientSource: "app:points-checkout-return" });
      const payload = await safeParseJson<Record<string, unknown>>(response);
      if (!response.ok || (payload as { degraded?: boolean }).degraded === true) return false;
      const normalized = normalizeSubscriptionStatusFromPayload(payload);
      if (!normalized) return false;
      saveSubscriptionSnapshotForUser(undefined, normalized, "checkout-return");
      return true;
    };
    void (async () => {
      let warmed = false;
      try {
        warmed = await Promise.race([
          warmFreshSnapshot(),
          new Promise<boolean>((resolve) => { window.setTimeout(() => resolve(false), 2500); }),
        ]);
      } catch { warmed = false; }
      if (!warmed) {
        try { clearSubscriptionSnapshotForUser(); } catch { /* 스냅샷 정리 실패는 복귀를 막지 않는다 */ }
      }
      window.setTimeout(() => { window.location.assign(target.url); }, Math.max(0, departAt - Date.now()));
    })();
    return true;
  }, [apiBase, pushToast]);

  const acquirePaymentActionLock = useCallback((key: string) => {
    const now = Date.now();
    const active = paymentActionLockRef.current;
    if (active && now - active.startedAt < PAYMENT_ACTION_LOCK_TTL_MS) return false;
    paymentActionLockRef.current = { key, startedAt: now };
    return true;
  }, []);

  const releasePaymentActionLock = useCallback((key: string) => {
    if (paymentActionLockRef.current?.key === key) {
      paymentActionLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isProcessing) {
      showProcessingOverlay(processingText, processingVariant);
      return;
    }
    hideProcessingOverlay();
  }, [hideProcessingOverlay, isProcessing, processingText, processingVariant, showProcessingOverlay]);

  const setProcessingStage = useCallback((text: string, variant: PaymentLoadingVariant) => {
    setProcessingVariant(variant);
    setProcessingText(text);
  }, []);

  // 🔴 동기 함수여야 한다. 예전에는 여기서 rAF 를 await 해 PG 창을 여는 직전에 한 프레임을 더
  // 먹었다 — 쓸모없는 지연이고, 사용자 제스처와 requestPayment 사이가 벌어져 모바일에서
  // 결제창이 차단될 위험까지 만든다. 오버레이 정리만 하고 곧바로 PG 를 연다.
  const closeProcessingOverlayBeforeExternalCheckout = useCallback(() => {
    setIsProcessing(false);
    hideProcessingOverlay();
  }, [hideProcessingOverlay]);

  const buildPassAppliedMessage = useCallback((tier?: unknown) => {
    const label = getSubscriptionTierLabel(tier || subscription.tier);
    const passLabel = label === "이용권" ? "이용권" : `${label} 이용권`;
    return `${passLabel} 혜택이 적용되었습니다.\n결과를 불러오는 중이에요`;
  }, [subscription.tier]);

  const showPassAppliedStage = useCallback(async (message?: string, tier?: unknown) => {
    setProcessingStage(message || buildPassAppliedMessage(tier), "pass-applied");
    await new Promise((resolve) => window.setTimeout(resolve, 980));
  }, [buildPassAppliedMessage, setProcessingStage]);

  useEffect(() => {
    return () => {
      hideProcessingOverlay();
    };
  }, [hideProcessingOverlay]);

  /** 이용권 성공 후 legacy destiny-profile.js가 읽는 localStorage 캐시를 갱신합니다. */
  const persistSubscriptionCache = useCallback((sub: SubscriptionStatus) => {
    try {
      const user = readSanitizedAuthUser();
      const scope = resolveAuthScopeFromUser(user) || "guest";
      const nextUser = {
        ...(user || {}),
        profileSubscription: {
          tier: sub.tier || "free",
          isActive: !!sub.isActive,
          profileLimit: sub.profileLimit ?? 1,
          freeLimit: sub.isActive ? (sub.freeLimit ?? getSubscriptionPolicyFreeLimit(sub.tier)) : 0,
          startedAt: sub.startedAt || null,
          durationMonths: sub.durationMonths,
          expiresAt: sub.expiresAt || null,
        },
      };
      const payload = JSON.stringify({
        tier: sub.tier || "free",
        isActive: !!sub.isActive,
        profileLimit: sub.profileLimit ?? 1,
        freeLimit: sub.isActive ? (sub.freeLimit ?? getSubscriptionPolicyFreeLimit(sub.tier)) : 0,
        startedAt: sub.startedAt || null,
        durationMonths: sub.durationMonths,
        expiresAt: sub.expiresAt || null,
      });
      persistSanitizedAuthUser(nextUser);
      const scopedKey = `fortune_profile_subscription::${scope}`;
      localStorage.setItem(scopedKey, payload);
      localStorage.setItem("fortune_profile_subscription", payload);
      localStorage.setItem("fortune_profile_subscription_owner", scope);
      saveSubscriptionSnapshotForUser(scope === "guest" ? undefined : scope, sub, "points-page");

      const eventPayload = { source: "points-page", event: "subscription", at: Date.now() };
      window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: eventPayload }));
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("code-destiny-auth-sync");
        channel.postMessage(eventPayload);
        channel.close();
      }
    } catch { /* noop */ }
  }, []);

  /**
   * 결제가 취소·실패했을 때의 정리. localStorage 를 비우는 것만으로는 부족하다 —
   * 낙관 이용권으로 이미 뒤집어 놓은 화면 상태까지 원래대로 되돌려야 한다.
   * 되돌리지 않으면 이용권이 적용된 것처럼 보이고, 티어 랭크 비교 때문에 재구매까지 막힌다.
   */
  const discardPendingSubscriptionPass = useCallback(() => {
    clearPendingSubscriptionOrder();
    const backup = optimisticPassBackupRef.current;
    if (!backup) return;
    optimisticPassBackupRef.current = null;
    setSubscription(backup);
  }, []);

  /* ── 서버에서 주문/이용권 상태 조회 ─────────────────────────────── */
  const fetchMyPointState = useCallback(
    async ({ force = false, signal }: { force?: boolean; signal?: AbortSignal } = {}) => {
      if (fetchMyPointStateInFlightRef.current) {
        return fetchMyPointStateInFlightRef.current;
      }
      const requestPromise = (async () => {
        if (!authStoreUserId) return;
        // 일시적 DB 장애(503)는 상점 요약을 하드 실패시키지 말고 공용 완충으로 흡수한다.
        // 완충이 없던 탓에 DB 블립 한 번이 "결제 및 이용권 정보를 불러오지 못했습니다"로 굳었다.
        const attempt = await runAccessCheckWithTransientRetry(async () => {
          const snapshotResult = await fetchMoonlightStoreSnapshot({
            userId: authStoreUserId,
            apiBase,
            force,
            signal,
          });
          // Content-Type 검증 후 JSON 파싱 — HTML 에러 페이지 방어
          return {
            status: snapshotResult.status,
            data: { ...snapshotResult.payload, ok: snapshotResult.ok },
          };
        }, { maxAttempts: 1, baseDelayMs: 700 });

        const response = { status: attempt.status, ok: attempt.data.ok === true, statusText: "" };
        if (response.status === 401 || response.status === 403) {
          clearClientAuthState();
          router.replace("/login?next=%2Fpoints");
          return;
        }

        const payload = attempt.data as MeResponse;
        const payloadCode = String((payload as { code?: string; error?: string })?.code || (payload as { code?: string; error?: string })?.error || "").toUpperCase();
        if (!response.ok) {
          console.warn("[points-page] API error", {
            endpoint: "/api/payments/me",
            status: response.status,
            code: payloadCode || undefined,
            message: payload.message || response.statusText || "Unknown API error",
          });
        }

        if (!response.ok) {
          if (payloadCode === "AUTH_REFRESH_TEMPORARY_FAILURE") {
            throw new Error(mapAuthRefreshTemporaryFailureMessage());
          }
          throw new Error(payload.message || "결제 및 이용권 정보를 불러오지 못했습니다.");
        }

        const normalized = normalizeMePayload(payload);
        const nextUser = normalized.user;
        if (normalized.subscription) {
          saveSubscriptionSnapshotForUser(undefined, normalized.subscription, "payments-me");
          setSubscription((prev) => {
            const nextSubscription = mergeSubscriptionState(prev, normalized.subscription as SubscriptionStatus);
            if (nextSubscription.isActive) persistSubscriptionCache(nextSubscription);
            return nextSubscription;
          });
        }

        const normalizedPayments = Array.isArray(normalized.payments)
          ? normalized.payments
              .filter((entry) => entry && typeof entry === "object")
              .slice(0, 10)
          : [];
      // 결제 건과 이용권 이용 건을 각각 10건씩 자른 뒤 병합한다. 하나의 상한을 공유하면
      // 이용권 이용이 잦은 계정에서 실제 결제 내역이 목록 밖으로 밀려난다.
        const passAccessItems = buildPassAccessHistoryItems(
          Array.isArray(normalized.transactions)
            ? normalized.transactions.filter((entry) => entry && typeof entry === "object")
            : [],
        ).slice(0, 10);
        setPaymentHistory(
          [...normalizedPayments, ...passAccessItems].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
          ),
        );
        setPaymentHistoryDeferred(normalized.historyDeferred);
      // null = 서버가 잔량을 확인하지 못한 경우(침묵-0). 0 으로 덮어써 결제 수단을 잠그지 않는다.
        if (normalized.monthlyStoneBalance !== null) setMonthlyStoneBalance(normalized.monthlyStoneBalance);
        if (normalized.monthlyStoneBalance !== null) {
          const cachedUser = readSanitizedAuthUser();
          if (cachedUser) {
            persistSanitizedAuthUser({
              ...cachedUser,
              monthlyStoneBalance: normalized.monthlyStoneBalance,
              monthlyCredits: normalized.monthlyStoneBalance,
              profileSubscription: {
                ...(cachedUser.profileSubscription || {}),
                monthlyStoneBalance: normalized.monthlyStoneBalance,
                membershipCreditBalance: normalized.monthlyStoneBalance,
              },
            });
          }
        }
        setMonthlyStoneUnverified(normalized.monthlyStoneBalance === null);
        setMonthlyStoneExpiresAt(normalized.monthlyStoneExpiresAt);
        setMonthlyCreditLedgers(
          Array.isArray(normalized.monthlyCreditLedgers)
            ? normalized.monthlyCreditLedgers.filter((entry) => entry && typeof entry === "object").slice(0, 8)
            : [],
        );
        if (nextUser) {
          setAuthUser((prev) => ({
            ...(prev || {}),
            id: nextUser.id,
            name: nextUser.name,
            email: nextUser.email,
          }));
        }
      })();
      fetchMyPointStateInFlightRef.current = requestPromise;
      try {
        await requestPromise;
      } finally {
        if (fetchMyPointStateInFlightRef.current === requestPromise) {
          fetchMyPointStateInFlightRef.current = null;
        }
      }
    },
    [apiBase, authStoreUserId, persistSubscriptionCache, router],
  );

  const syncSubscriptionAppliedStage = useCallback(async (tier?: unknown) => {
    const label = getSubscriptionTierLabel(tier || subscription.tier);
    const passLabel = label === "이용권" ? "이용권" : `${label} 이용권`;
    setProcessingStage(`${passLabel}을 계정에 반영하고 있어요.\n잠시만 기다려 주세요.`, "pass-applied");
    clearMoonlightStoreSnapshot(authStoreUserId, apiBase);
    const [refreshResult] = await Promise.allSettled([
      fetchMyPointState({ force: true }),
    ]);
    const finalMessage = refreshResult.status === "rejected"
      ? "결제와 이용권 반영은 완료됐어요.\n최신 월정석 잔량은 잠시 후 다시 확인해 주세요."
      : "최신 월정석 잔량을 확인했어요.\n이제 이용할 수 있어요.";
    await showPassAppliedStage(finalMessage, tier);
  }, [apiBase, authStoreUserId, fetchMyPointState, setProcessingStage, showPassAppliedStage, subscription.tier]);

  /* ── 초기 인증 토큰 확인 ───────────────────────────────────────── */
  useEffect(() => {
    const parsedUser = readSanitizedAuthUser() as AuthUser | null;

    if (parsedUser) {
      setAuthUser(parsedUser);
      const verifiedSnapshot = isAuthUserCacheVerified(parsedUser);
      const cachedSubscription = normalizeSubscriptionStatusFromPayload(parsedUser.profileSubscription);
      if (cachedSubscription?.isActive) {
        setSubscription((prev) => mergeSubscriptionState(prev, cachedSubscription));
      }
      const cachedMonthlyBalance = resolveMonthlyStoneBalance(parsedUser, parsedUser.profileSubscription);
      if (cachedMonthlyBalance !== null) {
        setMonthlyStoneBalance(cachedMonthlyBalance);
        // This is display-only until the single shop summary request confirms it.
        setMonthlyStoneUnverified(true);
      }
      hasVerifiedShopSnapshotRef.current = verifiedSnapshot
        && (cachedSubscription?.isActive === true || cachedMonthlyBalance !== null);
    }

    setIsBooting(false);
  }, [router]);

  useEffect(() => {
    if (!authState.authReady) return;
    setAuthUser(authState.user as AuthUser | null);
  }, [authState.authReady, authState.user]);

  /* ── 부팅 후 결제/주문 정보 로드 ─────────────────────────────── */
  useEffect(() => {
    if (isBooting || !authState.authReady || !authState.isAuthenticated || !authStoreUserId) return;

    setPointStateStatus("loading");
    setPointStateError(null);
    fetchMyPointState().then(() => {
      setPointStateStatus("ready");
    }).catch((error) => {
      if (hasVerifiedShopSnapshotRef.current) {
        setMonthlyStoneUnverified(true);
        setPaymentHistoryDeferred(true);
        setPointStateStatus("ready");
        setPointStateError(null);
        console.warn("[points-page] shop summary unavailable; keeping verified snapshot", error);
        return;
      }
      // 조회 실패는 잔액 부족이 아니라 미확정 상태다. 월정석 결제 선택은 열어 두고
      // 최종 잔액·차감 가능 여부는 서버 confirm이 판정한다.
      setMonthlyStoneUnverified(true);
      setPointStateStatus("error");
      setPointStateError(getErrorMessage(error, "이용권 상점 정보를 잠시 불러오지 못했습니다."));
      console.warn("[points-page] shop summary unavailable", error);
    });
  }, [authState.authReady, authState.isAuthenticated, authStoreUserId, fetchMyPointState, isBooting]);

  /* ── 월정석 잔량 실시간 반영: 차감/지급 표준 브로드캐스트 구독 ─────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyFromDetail = (detail: unknown) => {
      const next = resolveMonthlyStoneBalance(detail);
      if (next === null) return; // 잔량이 없는 이벤트 — 기존 값 유지
      setMonthlyStoneBalance(next);
      setMonthlyStoneUnverified(false); // 실제 잔량이 도착했으므로 미확정 해제
    };
    const onBillingBalanceUpdated = (event: Event) => {
      applyFromDetail((event as CustomEvent<Record<string, unknown>>)?.detail || {});
    };
    const onAuthChanged = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>)?.detail;
      if (String((detail as { event?: unknown } | undefined)?.event || "").toLowerCase() !== "monthlystonebalance") return;
      applyFromDetail(detail);
    };
    window.addEventListener("cd:billing-balance-updated", onBillingBalanceUpdated as EventListener);
    window.addEventListener("cd:auth-changed", onAuthChanged as EventListener);
    return () => {
      window.removeEventListener("cd:billing-balance-updated", onBillingBalanceUpdated as EventListener);
      window.removeEventListener("cd:auth-changed", onAuthChanged as EventListener);
    };
  }, []);

  /* ── 이용권 상태 로드 ─────────────────────────────────────────────── */
  useEffect(() => {
    if (isBooting) return;
    // 🔴 낙관 이용권 표시는 **PG 리다이렉트 복귀**에서만 쓴다. 페이지가 통째로 떠났다 돌아온 뒤
    // confirm 이 끝나기 전까지의 공백을 메우는 장치이기 때문이다. 같은 페이지에서 결제창을 연
    // 데스크탑 흐름은 confirm 응답으로 실제 상태를 받으므로 낙관 적용이 애초에 필요 없고,
    // 예전에는 그 흐름에서도 발동해 "취소했는데 이용권이 적용된 것처럼 보이는" 버그가 됐다.
    const pendingPass = isPortOneSubscriptionRedirectReturn() ? readPendingSubscriptionPass() : null;
    if (pendingPass && pendingPass.tier !== "free") {
      optimisticPassBackupRef.current = subscriptionRef.current;
      setSubscription((prev) => prev.isActive ? prev : ({
        ...prev,
        tier: pendingPass.tier,
        isActive: true,
        profileLimit: pendingPass.profileLimit,
        lowBalanceWarning: false,
      }));
      return;
    }
    const isAdminSession = authUser?.role === "admin" && isFlowerAdminSessionClient();
    // /api/payments/me already returns the canonical subscription snapshot and
    // monthly credit state. Normal users must not issue a second status request
    // during the same shop entry; keep the legacy status fallback for admin tools.
    if (!isAdminSession) return;
    const flowerAdminToken = isAdminSession ? getFlowerAdminTokenClient() : "";
    const adminHeaders: Record<string, string> = flowerAdminToken ? {
      "x-admin-token": flowerAdminToken,
    } : {};
    if (fetchSubscriptionStatusInFlightRef.current) return;
    const requestPromise = authFetch(`${apiBase}/api/subscription/status`, {
      method: "GET",
      credentials: "include",
      headers: adminHeaders,
      cache: "no-store",
    }, {
      retryOn401: true,
      apiBase,
      clientSource: "app:points",
    })
      .then(async (r) => {
        const data = await safeParseJson<Record<string, unknown>>(r);
        if (!r.ok && r.status !== 401 && r.status !== 403) {
          console.warn("[points-page] API error", {
            endpoint: "/api/subscription/status",
            status: r.status,
            code: String(data?.code || data?.error || "") || undefined,
            message: String(data?.message || r.statusText || "Unknown API error"),
          });
        }
        return r.ok ? data : null;
      })
      .then((d) => {
        if (!d) return;
        // DB 일시오류 시 서버는 degraded 스냅샷(tier:"free")을 준다. normalizeSubscriptionStatusFromPayload 는
        // 이걸 정상 무료 응답과 구분하지 못하므로 여기서 걸러야 한다. 그대로 두면 이용권 카드가 무료로
        // 뒤집히고, saveSubscriptionSnapshotForUser 가 공용 결제 적격성 캐시까지 오염시킨다.
        if ((d as { degraded?: boolean }).degraded === true) return;
        const normalizedSubscription = normalizeSubscriptionStatusFromPayload(d);
        if (!normalizedSubscription) {
          saveSubscriptionSnapshotForUser(undefined, { tier: "free", isActive: false, status: "inactive" }, "subscription-status");
          return;
        }
        saveSubscriptionSnapshotForUser(undefined, normalizedSubscription, "subscription-status");
        setSubscription((prev) => {
          const nextSubscription = mergeSubscriptionState(prev, normalizedSubscription);
          if (nextSubscription.isActive) persistSubscriptionCache(nextSubscription);
          return nextSubscription;
        });
        if (normalizedSubscription.isActive) {
          localStorage.removeItem("fortune_pending_subscription_pass");
        }
      })
      .catch(() => {});
    fetchSubscriptionStatusInFlightRef.current = requestPromise;
    void requestPromise.finally(() => {
      if (fetchSubscriptionStatusInFlightRef.current === requestPromise) {
        fetchSubscriptionStatusInFlightRef.current = null;
      }
    });
  }, [isBooting, apiBase, authUser, persistSubscriptionCache]);

  /* ── 서버 결제 검증 ────────────────────────────────────────────── */
  const confirmPaymentWithServer = useCallback(
    async (params: SinglePaymentConfirmPayload) => {
      const body: Record<string, unknown> = {
        impUid: params.impUid,
        merchantUid: params.merchantUid,
        paymentMethod: params.paymentMethod,
      };
      if (Number.isInteger(params.paymentAmount)) body.paymentAmount = params.paymentAmount;
      if (Number.isInteger(params.chargePoints)) body.chargePoints = params.chargePoints;
      if (params.paymentType) body.paymentType = params.paymentType;
      if (params.productId) body.productId = params.productId;
      if (params.featureKey) body.featureKey = params.featureKey;
      if (params.productName) body.productName = params.productName;

      const confirmKey = `${params.impUid}:${params.merchantUid || ""}`;
      const existing = confirmPaymentInFlightRef.current.get(confirmKey);
      if (existing) return existing;

      const requestPromise = (async () => {
        const response = await authFetch(`${apiBase}/api/payments/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(body),
        }, {
          retryOn401: true,
          apiBase,
        });

      // Content-Type 검증 후 JSON 파싱
      const payload = await safeParseJson<ConfirmResponse & { message?: string }>(response);

      if (!response.ok) {
        const error = new Error(payload.message || "서버 결제 검증에 실패했습니다.");
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }

        return payload;
      })();

      confirmPaymentInFlightRef.current.set(confirmKey, requestPromise);
      try {
        return await requestPromise;
      } finally {
        if (confirmPaymentInFlightRef.current.get(confirmKey) === requestPromise) {
          confirmPaymentInFlightRef.current.delete(confirmKey);
        }
      }
    },
    [apiBase],
  );

  const confirmSubscriptionWithServer = useCallback(
    async (body: SubscriptionConfirmPayload) => {
      const confirmKey = `${body.impUid || body.requestId || "monthly_credit"}:${body.merchantUid || body.planId || ""}`;
      const existing = confirmSubscriptionInFlightRef.current.get(confirmKey);
      if (existing) return existing;

      const requestPromise = (async () => {
        const response = await authFetch(`${apiBase}/api/payments/subscription/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(body),
        }, {
          retryOn401: true,
          apiBase,
        });

        const data = await safeParseJson<ConfirmSubscriptionResponse>(response);
        if (!response.ok) {
          const error = new Error(data.message || "Subscription payment confirm failed.");
          (error as Error & { status?: number }).status = response.status;
          throw error;
        }
        // 결제 성공 지점은 카드·월정석·모바일 리다이렉트 복귀 세 곳인데 전부 이 헬퍼를 지난다.
        // 여기서 '예약'만 하므로(1.2초 뒤 이동) 호출부의 상태 갱신·토스트가 끝날 시간이 남는다.
        scheduleCheckoutReturn();
        return data;
      })();

      confirmSubscriptionInFlightRef.current.set(confirmKey, requestPromise);
      try {
        return await requestPromise;
      } finally {
        if (confirmSubscriptionInFlightRef.current.get(confirmKey) === requestPromise) {
          confirmSubscriptionInFlightRef.current.delete(confirmKey);
        }
      }
    },
    [apiBase, scheduleCheckoutReturn],
  );

  const markSubscriptionPaymentUnknown = useCallback(() => {
    const merchantUid = pendingSubscriptionConfirmRef.current?.payload.merchantUid || "";
    const orderHint = merchantUid ? `\n주문번호 끝자리 ${merchantUid.slice(-4)}` : "";
    setProcessingStage(
      `결제 결과를 확인하는 데 시간이 걸리고 있어요.\n중복 결제를 시도하지 말아 주세요.${orderHint}`,
      "subscription",
    );
    setProcessingAction({
      label: "결제 상태 다시 확인",
      onClick: () => { void subscriptionStatusCheckHandlerRef.current?.(); },
    });
  }, [setProcessingAction, setProcessingStage]);

  const checkPendingSubscriptionPayment = useCallback(async () => {
    const pending = pendingSubscriptionConfirmRef.current;
    if (!pending || subscriptionStatusCheckInFlightRef.current) return;

    subscriptionStatusCheckInFlightRef.current = true;
    setProcessingAction(null);
    setIsProcessing(true);
    setProcessingStage("결제 상태를 다시 확인하고 있어요.\n중복 결제를 시도하지 말아 주세요.", "subscription");

    try {
      const data = await confirmSubscriptionWithServer(pending.payload);
      pendingSubscriptionConfirmRef.current = null;
      clearPendingSubscriptionOrder();
      optimisticPassBackupRef.current = null;
      await syncSubscriptionAppliedStage(data.subscription?.tier || pending.payload.tier);
      pushToast("success", data.message || "이용권 결제가 확인되어 이용권이 활성화되었습니다.");
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
      if (pending.fromRedirect && typeof window !== "undefined" && window.location.search) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      setIsProcessing(false);
    } catch (error: unknown) {
      if (isUncertainSubscriptionConfirmError(error)) {
        markSubscriptionPaymentUnknown();
      } else {
        pendingSubscriptionConfirmRef.current = null;
        discardPendingSubscriptionPass();
        setIsProcessing(false);
        pushToast("error", getErrorMessage(error, "결제 결과를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요."));
      }
    } finally {
      subscriptionStatusCheckInFlightRef.current = false;
    }
  }, [
    confirmSubscriptionWithServer,
    discardPendingSubscriptionPass,
    markSubscriptionPaymentUnknown,
    pushToast,
    setProcessingAction,
    setProcessingStage,
    syncSubscriptionAppliedStage,
  ]);

  useEffect(() => {
    subscriptionStatusCheckHandlerRef.current = checkPendingSubscriptionPayment;
    return () => {
      subscriptionStatusCheckHandlerRef.current = null;
    };
  }, [checkPendingSubscriptionPayment]);

  const reportPaymentFailureToServer = useCallback(
    async (payload: PaymentFailureReportPayload) => {
      try {
        await authFetch(`${apiBase}/api/payments/report-failure`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        }, {
          retryOn401: true,
          apiBase,
        });
      } catch {
        // 실패 보고는 보조 경로이므로 UI 흐름을 막지 않는다.
      }
    },
    [apiBase],
  );

  /* ── 결제 성공 후 처리 ─────────────────────────────────────────── */
  const handleConfirmSuccess = useCallback(
    async (result: ConfirmResponse, fromRedirect = false) => {
      setProcessingStage(
        "상품 이용 권한을 반영하고 있어요.\n최신 이용 상태를 확인하는 중이에요.",
        "unlock-saving",
      );
      clearMoonlightStoreSnapshot(authStoreUserId, apiBase);
      const [refreshResult] = await Promise.allSettled([fetchMyPointState({ force: true })]);
      const refreshFailed = refreshResult.status === "rejected";
      pushToast(
        "success",
        refreshFailed
          ? "결제와 상품 반영은 완료됐어요. 최신 이용 상태는 잠시 후 다시 확인해 주세요."
          : fromRedirect
            ? "결제 복귀와 상품 반영이 완료되었습니다. 이제 이용할 수 있어요."
            : result.message || "결제와 상품 반영이 완료되었습니다. 이제 이용할 수 있어요.",
      );
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
    },
    [apiBase, authStoreUserId, fetchMyPointState, pushToast, setProcessingStage],
  );

  const clearSinglePaymentConfirmTimer = useCallback(() => {
    if (singlePaymentConfirmTimerRef.current !== null) {
      if (typeof window !== "undefined") window.clearTimeout(singlePaymentConfirmTimerRef.current);
      singlePaymentConfirmTimerRef.current = null;
    }
  }, []);

  const markSinglePaymentUnknown = useCallback(() => {
    clearSinglePaymentConfirmTimer();
    const merchantUid = pendingSinglePaymentConfirmRef.current?.payload.merchantUid || "";
    const orderHint = merchantUid ? `\n주문번호 끝자리 ${merchantUid.slice(-4)}` : "";
    setProcessingStage(
      `결제 결과를 확인하는 데 시간이 걸리고 있어요.\n중복 결제를 시도하지 말아 주세요.${orderHint}`,
      "confirm",
    );
    setProcessingAction({
      label: "결제 상태 다시 확인",
      onClick: () => { void singlePaymentStatusCheckHandlerRef.current?.(); },
    });
  }, [clearSinglePaymentConfirmTimer, setProcessingAction, setProcessingStage]);

  const armSinglePaymentConfirmTimer = useCallback(() => {
    clearSinglePaymentConfirmTimer();
    if (typeof window === "undefined") return;
    singlePaymentConfirmTimerRef.current = window.setTimeout(() => {
      if (pendingSinglePaymentConfirmRef.current) markSinglePaymentUnknown();
    }, 20000);
  }, [clearSinglePaymentConfirmTimer, markSinglePaymentUnknown]);

  const confirmPendingSinglePayment = useCallback((
    payload: SinglePaymentConfirmPayload,
    fromRedirect = false,
  ): Promise<"success" | "unknown" | "failed"> => {
    const flowKey = `${payload.impUid}:${payload.merchantUid || ""}`;
    const existingFlow = singlePaymentConfirmFlowRef.current;
    if (existingFlow?.key === flowKey) return existingFlow.promise;

    const flow = (async (): Promise<"success" | "unknown" | "failed"> => {
      pendingSinglePaymentConfirmRef.current = { payload, fromRedirect };
      savePendingSinglePaymentSession({
        impUid: payload.impUid,
        merchantUid: payload.merchantUid,
      });
      setProcessingAction(null);
      setIsProcessing(true);
      setProcessingStage(
        "결제 승인 내역을 안전하게 확인하고 있어요.\n중복 결제를 시도하지 말아 주세요.",
        "confirm",
      );
      armSinglePaymentConfirmTimer();

      try {
        const result = await confirmPaymentWithServer(payload);
        clearSinglePaymentConfirmTimer();
        pendingSinglePaymentConfirmRef.current = null;
        clearPendingSinglePaymentSession();
        clearPendingOrder();
        await handleConfirmSuccess(result, fromRedirect);
        if (fromRedirect && typeof window !== "undefined" && window.location.search) {
          window.history.replaceState({}, "", window.location.pathname);
        }
        return "success";
      } catch (error: unknown) {
        clearSinglePaymentConfirmTimer();
        if (isUncertainPaymentConfirmError(error)) {
          markSinglePaymentUnknown();
          return "unknown";
        }

        pendingSinglePaymentConfirmRef.current = null;
        clearPendingSinglePaymentSession();
        clearPendingOrder();
        await reportPaymentFailureToServer({
          merchantUid: payload.merchantUid,
          impUid: payload.impUid,
          reasonCode: fromRedirect ? "redirect_confirm_failed" : "confirm_failed",
          reasonMessage: getErrorMessage(error, "결제 검증에 실패했습니다."),
          paymentMethod: payload.paymentMethod,
        });
        pushToast("error", getErrorMessage(error, "결제 검증에 실패했습니다."));
        if (fromRedirect && typeof window !== "undefined" && window.location.search) {
          window.history.replaceState({}, "", window.location.pathname);
        }
        return "failed";
      } finally {
        if (!pendingSinglePaymentConfirmRef.current) setIsProcessing(false);
      }
    })();

    singlePaymentConfirmFlowRef.current = { key: flowKey, promise: flow };
    void flow.then(
      () => {
        if (singlePaymentConfirmFlowRef.current?.promise === flow) {
          singlePaymentConfirmFlowRef.current = null;
        }
      },
      () => {
        if (singlePaymentConfirmFlowRef.current?.promise === flow) {
          singlePaymentConfirmFlowRef.current = null;
        }
      },
    );
    return flow;
  }, [
    armSinglePaymentConfirmTimer,
    clearSinglePaymentConfirmTimer,
    confirmPaymentWithServer,
    handleConfirmSuccess,
    markSinglePaymentUnknown,
    pushToast,
    reportPaymentFailureToServer,
    setProcessingAction,
    setProcessingStage,
  ]);

  const checkPendingSinglePayment = useCallback(async () => {
    const pending = pendingSinglePaymentConfirmRef.current;
    if (!pending || singlePaymentStatusCheckInFlightRef.current) return;

    singlePaymentStatusCheckInFlightRef.current = true;
    try {
      await confirmPendingSinglePayment(pending.payload, pending.fromRedirect);
    } finally {
      singlePaymentStatusCheckInFlightRef.current = false;
    }
  }, [confirmPendingSinglePayment]);

  useEffect(() => {
    singlePaymentStatusCheckHandlerRef.current = checkPendingSinglePayment;
    return () => {
      singlePaymentStatusCheckHandlerRef.current = null;
    };
  }, [checkPendingSinglePayment]);

  const requestCancelPayment = useCallback(
    async (payment: PaymentHistoryItem) => {
      const ok = window.confirm(
        `${formatWon(payment.paymentAmount)} 결제를 취소할까요?\n이미 이용한 콘텐츠 또는 이용권 혜택이 있으면 취소가 제한될 수 있습니다.`,
      );
      if (!ok) return;

      setCancelingPaymentId(payment.id);
      try {
        const response = await authFetch(`${apiBase}/api/payments/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            impUid: payment.impUid,
            merchantUid: payment.merchantUid,
            reason: "사용자 취소 요청",
          }),
        }, {
          retryOn401: true,
          apiBase,
        });

        const payload = await safeParseJson<{
          message?: string;
          user?: { points: number };
          payment?: PaymentHistoryItem;
        }>(response);

        if (!response.ok) {
          throw new Error(payload.message || "결제 취소에 실패했습니다.");
        }

        clearMoonlightStoreSnapshot(authStoreUserId, apiBase);
        await fetchMyPointState({ force: true });
        pushToast("success", payload.message || "결제가 취소되었습니다.");
      } catch (error: unknown) {
        pushToast("error", getErrorMessage(error, "결제 취소 처리 중 오류가 발생했습니다."));
      } finally {
        setCancelingPaymentId(null);
      }
    },
    [apiBase, authStoreUserId, fetchMyPointState, pushToast],
  );

  /* ── 모바일 결제 리디렉션 복귀 처리 ───────────────────────────── */
  useEffect(() => {
    if (isBooting || redirectHandledRef.current) return;
    if (typeof window === "undefined") return;

    const query = new URLSearchParams(window.location.search);
    const redirectMarked = query.get("portone_redirect");
    const subscriptionRedirectMarked = query.get("portone_subscription_redirect");
    const impSuccess = String(query.get("imp_success") || query.get("code") || "").toLowerCase();
    const impUid = query.get("paymentId") || query.get("payment_id") || query.get("imp_uid");
    const pendingSingleSession = readPendingSinglePaymentSession();
    const isSubscriptionRedirect = !!subscriptionRedirectMarked;
    const effectiveImpUid = impUid || (!isSubscriptionRedirect ? pendingSingleSession?.impUid : undefined);

    if (!effectiveImpUid && impSuccess !== "false" && !redirectMarked && !subscriptionRedirectMarked) return;

    redirectHandledRef.current = true;

    const merchantUidFromQuery = query.get("paymentId") || query.get("payment_id") || query.get("merchant_uid") || undefined;
    const pending = readPendingOrder();
    const pendingSubscription = readPendingSubscriptionOrder();
    const effectiveMerchantUid = merchantUidFromQuery || pendingSingleSession?.merchantUid;
    const redirectConfirmKey = `${isSubscriptionRedirect ? "subscription" : "point"}:${effectiveImpUid || "missing"}:${effectiveMerchantUid || (isSubscriptionRedirect ? pendingSubscription?.merchantUid : pending?.merchantUid) || ""}`;

    if (!effectiveImpUid || impSuccess === "false") {
      clearPendingOrder();
      discardPendingSubscriptionPass();
      clearPendingSinglePaymentSession();

      const failMessage = mapPaymentErrorMessage(
        query.get("error_msg") || query.get("errorMsg") || "결제가 취소되었습니다.",
      );

      reportPaymentFailureToServer({
        merchantUid: merchantUidFromQuery || (isSubscriptionRedirect ? pendingSubscription?.merchantUid : pending?.merchantUid),
        impUid: effectiveImpUid || undefined,
        reasonCode: isSubscriptionRedirect ? "subscription_mobile_redirect_failed" : "mobile_redirect_failed",
        reasonMessage: failMessage,
        paymentMethod: isSubscriptionRedirect ? pendingSubscription?.paymentMethod : pending?.paymentMethod,
      });

      pushToast("error", failMessage);
      if (window.location.search) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      return;
    }

    if (!acquirePaymentRedirectLock(redirectConfirmKey)) return;

    setIsProcessing(true);
    setProcessingStage(
      isSubscriptionRedirect
        ? "결제 결과를 확인하고 있어요.\n중복 결제를 시도하지 말아 주세요."
        : "결제 결과를 확인하고 있어요.\n중복 결제를 시도하지 말아 주세요.",
      isSubscriptionRedirect ? "subscription" : "confirm",
    );

    if (isSubscriptionRedirect) {
      const pendingSub = pendingSubscription;
      const merchantUid = merchantUidFromQuery || pendingSub?.merchantUid;

      if (!pendingSub || !merchantUid) {
        discardPendingSubscriptionPass();
        pushToast("error", "이용권 결제 복귀 정보를 찾지 못했습니다. 다시 시도해 주세요.");
        if (window.location.search) {
          window.history.replaceState({}, "", window.location.pathname);
        }
        releasePaymentRedirectLock(redirectConfirmKey);
        setIsProcessing(false);
        return;
      }

      const confirmPayload: SubscriptionConfirmPayload = {
          impUid: effectiveImpUid,
          merchantUid,
          tier: pendingSub.tier,
          planId: pendingSub.planId,
          durationMonths: pendingSub.durationMonths || 1,
          productType: "membership_pass",
          customerUid: pendingSub.customerUid,
          paymentMethod: pendingSub.paymentMethod,
          durationDays: 30,
      };
      pendingSubscriptionConfirmRef.current = {
        payload: confirmPayload,
        fromRedirect: true,
      };

      confirmSubscriptionWithServer(confirmPayload)
        .then(async (data) => {
          if (data.subscription) {
            const newSub: SubscriptionStatus = {
              tier: data.subscription?.tier || "free",
              source: data.subscription?.source || "card",
              isActive: !!data.subscription?.isActive,
              startedAt: data.subscription?.startedAt || null,
              expiresAt: data.subscription?.expiresAt || null,
              profileLimit: typeof data.subscription?.profileLimit === "number"
                ? data.subscription.profileLimit
                : getSubscriptionPolicyProfileLimit(data.subscription?.tier || pendingSub.tier),
              durationMonths: normalizeSubscriptionDurationMonths(data.subscription?.durationMonths ?? pendingSub.durationMonths) ?? pendingSub.durationMonths,
              lowBalanceWarning: false,
              cancelAtPeriodEnd: !!data.subscription?.cancelAtPeriodEnd,
              cancelRequestedAt: data.subscription?.cancelRequestedAt || null,
              freeLimit: getSubscriptionPolicyFreeLimit(data.subscription?.tier || pendingSub.tier),
            };
            setSubscription((prev) => mergeSubscriptionState(prev, newSub));
            persistSubscriptionCache(newSub);
          }

          clearPendingSubscriptionOrder();
          optimisticPassBackupRef.current = null;
          pendingSubscriptionConfirmRef.current = null;
          await syncSubscriptionAppliedStage(data.subscription?.tier || pendingSub.tier);
          pushToast("success", data.message || "이용권 결제가 완료되어 이용권이 활성화되었습니다.");
          setShowStarBurst(true);
          setTimeout(() => setShowStarBurst(false), 1200);
          if (window.location.search) {
            window.history.replaceState({}, "", window.location.pathname);
          }
        })
        .catch((error) => {
          if (isUncertainSubscriptionConfirmError(error)) {
            markSubscriptionPaymentUnknown();
            return;
          }
          pendingSubscriptionConfirmRef.current = null;
          discardPendingSubscriptionPass();
          reportPaymentFailureToServer({
            merchantUid,
            impUid: effectiveImpUid,
            reasonCode: "subscription_redirect_confirm_failed",
            reasonMessage: getErrorMessage(error, "모바일 이용권 결제 검증에 실패했습니다."),
            paymentMethod: pendingSub.paymentMethod,
          });
          pushToast("error", getErrorMessage(error, "모바일 이용권 결제 검증에 실패했습니다."));
          if (window.location.search) {
            window.history.replaceState({}, "", window.location.pathname);
          }
        })
        .finally(() => {
          releasePaymentRedirectLock(redirectConfirmKey);
          if (pendingSubscriptionConfirmRef.current?.payload !== confirmPayload) {
            setIsProcessing(false);
          }
        });

      return;
    }

    if (!pending || !effectiveImpUid) {
      clearPendingOrder();
      clearPendingSinglePaymentSession();
      pushToast("error", "결제 복귀 정보를 찾지 못했습니다. 다시 시도해 주세요.");
      releasePaymentRedirectLock(redirectConfirmKey);
      setIsProcessing(false);
      return;
    }

    void confirmPendingSinglePayment({
      impUid: effectiveImpUid,
      merchantUid: merchantUidFromQuery || pending?.merchantUid,
      paymentAmount: pending?.paymentAmount,
      chargePoints: pending?.chargePoints,
      paymentType: "digital_content",
      productId: pending?.productId,
      featureKey: pending?.featureKey,
      productName: pending?.productName,
      paymentMethod: pending?.paymentMethod,
    }, true).finally(() => {
      releasePaymentRedirectLock(redirectConfirmKey);
    });
  }, [
    confirmPendingSinglePayment,
    confirmSubscriptionWithServer,
    discardPendingSubscriptionPass,
    isBooting,
    markSubscriptionPaymentUnknown,
    persistSubscriptionCache,
    pushToast,
    reportPaymentFailureToServer,
    setProcessingStage,
    syncSubscriptionAppliedStage,
  ]);

  /* ── 이용권 결제 시작 ───────────────────────────────────────────── */
  const startPayment = async () => {
    if (pendingSinglePaymentConfirmRef.current) return;

    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    const actionLockKey = `point:${selectedPackage.id}:${selectedMethod}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    setIsProcessing(true);
    setProcessingStage(
      "단건 결제를 준비하고 있어요.\n주문 정보와 결제창을 확인하고 있어요.",
      "checkout",
    );

    try {
      const prepareResponse = await authFetch(`${apiBase}/api/payments/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          paymentAmount: selectedPackage.amount,
          paymentType: "digital_content",
          productId: selectedPackage.id,
          featureKey: selectedPackage.featureKey,
          coinPrice: selectedPackage.points,
          paymentMethod: selectedMethod,
          productName: getPointPackageTitle(selectedPackage, copy),
        }),
      }, {
        retryOn401: true,
        apiBase,
      });

      // Content-Type 검증 후 JSON 파싱
      const preparePayload = await safeParseJson<PrepareOrderResponse & { message?: string }>(
        prepareResponse,
      );
      if (!prepareResponse.ok || !preparePayload.order) {
        throw new Error(preparePayload.message || "결제 준비에 실패했습니다.");
      }

      const order = preparePayload.order;
      savePendingOrder({
        merchantUid: order.merchantUid,
        paymentAmount: order.paymentAmount,
        chargePoints: order.chargePoints ?? order.coinPrice ?? selectedPackage.points,
        coinPrice: order.coinPrice ?? selectedPackage.points,
        productId: selectedPackage.id,
        featureKey: selectedPackage.featureKey,
        productName: order.productName || getPointPackageTitle(selectedPackage, copy),
        paymentMethod: selectedMethod,
      });

      // SDK 로드와 결제 config 조회를 병렬로 진행(순차 2왕복 → 병렬). config는 세션 캐시로 재사용.
      const [, paymentConfig] = await Promise.all([ensurePortoneSdk(), fetchPortOnePaymentConfigCached(apiBase)]);

      if (!window.PortOne?.requestPayment) {
        throw new Error("포트원 V2 결제 SDK가 초기화되지 않았습니다.");
      }

      const redirectUrl = new URL(PORTONE_MOBILE_REDIRECT_PATH, window.location.origin);
      redirectUrl.searchParams.set("portone_redirect", "1");

      // prepare 응답이 이미 구매자 번호를 실어 왔으면 그걸 쓴다 — 결제창 직전의 왕복 1회가 통째로 사라진다.
      // 서버가 못 준 경우(미저장·복호화 실패)에만 조회하고, 그래도 없으면 입력 모달을 띄운다.
      const customerPhoneNumber = normalizePaymentPhoneNumber(order.customer?.phoneNumber || "")
        || await ensurePaymentPhoneNumber(apiBase, authUser, null);
      setAuthUser((prev) => prev ? { ...prev, phoneNumber: customerPhoneNumber, phone: prev.phone || customerPhoneNumber } : prev);
      const customer = buildPortOneCustomer(authUser, order.merchantUid, customerPhoneNumber);

      const requestData: PortOnePaymentRequest = {
        storeId: paymentConfig.storeId,
        channelKey: paymentConfig.channelKey,
        paymentId: order.merchantUid,
        orderName: order.productName,
        totalAmount: order.paymentAmount,
        currency: paymentConfig.currency || "CURRENCY_KRW",
        payMethod: paymentConfig.payMethod || "CARD",
        redirectUrl: redirectUrl.toString(),
        customer,
        customData: {
          userId: authUser.id,
          packageId: selectedPackage.id,
          coinPrice: order.coinPrice ?? selectedPackage.points,
          featureKey: selectedPackage.featureKey,
          paymentMethod: selectedMethod,
        },
      };

      if (paymentConfig.noticeUrl) {
        requestData.noticeUrls = [paymentConfig.noticeUrl];
      }

      // 🔴 PG 창을 여는 직전에는 대기 UI를 새로 띄우지 않는다. 예전에는 "원화 결제 준비 중" 문구를
      // 찍은 뒤 바로 아래에서 닫아서, 실제로는 보이지도 않는 오버레이 때문에 프레임만 낭비했다.
      // 대기 UI는 PG 응답 이후 승인 확인 단계에서만 띄운다.
      closeProcessingOverlayBeforeExternalCheckout();
      const rsp = await window.PortOne.requestPayment(requestData);
      const paymentId = String(rsp?.paymentId || order.merchantUid || "").trim();

      if (!rsp || rsp.code || !paymentId) {
        clearPendingOrder();
        clearPendingSinglePaymentSession();
        const raw = describePortOneSdkFailure(rsp);
        const message = mapPaymentErrorMessage(raw.message || "결제를 완료하지 못했습니다.");
        reportPaymentFailureToServer({
          merchantUid: order.merchantUid,
          impUid: paymentId || undefined,
          reasonCode: raw.code ? `pg_${raw.code}` : "client_cancel_or_fail",
          reasonMessage: raw.message || message,
          paymentMethod: selectedMethod,
        });
        pushToast("error", message);
        setIsProcessing(false);
        return;
      }

      const confirmStatus = await confirmPendingSinglePayment({
        impUid: paymentId,
        merchantUid: order.merchantUid,
        paymentAmount: order.paymentAmount,
        chargePoints: order.chargePoints ?? order.coinPrice ?? selectedPackage.points,
        paymentType: "digital_content",
        productId: selectedPackage.id,
        featureKey: selectedPackage.featureKey,
        productName: order.productName || getPointPackageTitle(selectedPackage, copy),
        paymentMethod: selectedMethod,
      });
      if (confirmStatus === "success") {
        setIsMethodModalOpen(false);
      }
    } catch (error: unknown) {
      clearPendingOrder();
      clearPendingSinglePaymentSession();
      reportPaymentFailureToServer({
        reasonCode: "prepare_or_sdk_failed",
        reasonMessage: getErrorMessage(error, "결제를 시작하지 못했습니다."),
        paymentMethod: selectedMethod,
      });
      setIsProcessing(false);
      pushToast("error", getErrorMessage(error, "결제를 시작하지 못했습니다."));
    } finally {
      releasePaymentActionLock(actionLockKey);
    }
  };

  /* ── 이용권(30일) 결제 핸들러 — PortOne V2 · KG이니시스 ─────────── */
  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (pendingSubscriptionConfirmRef.current) return;

    const activeTierRank = subscription.isActive ? getSubscriptionTierRank(subscription.tier) : 0;
    const requestedTierRank = getSubscriptionTierRank(plan.tier);

    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    if (plan.durationMonths !== 1) {
      pushToast("error", "현재 신규 판매 이용권은 30일권만 선택할 수 있습니다.");
      return;
    }

    if (activeTierRank > requestedTierRank) {
      pushToast("info", "현재 상위 티어 이용권이 활성화되어 하위 플랜은 신청할 수 없습니다.");
      return;
    }

    const actionLockKey = `subscription:${plan.planId}:${selectedMethod || "card_general"}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    const prepareEntry = startSubscriptionPrepare(plan);
    // SDK 로드·config 조회는 prepare 결과와 아무 의존이 없다. 예전에는 prepare 뒤로 직렬화돼 있어
    // 결제창 오픈이 두 홉을 기다렸다 — 같은 클릭에서 함께 발사해 한 홉으로 접는다.
    // prepare 실패로 아래에서 조기 return 될 때 unhandled rejection 이 되지 않도록 catch 를 먼저 건다.
    const checkoutAssets = Promise.all([ensurePortoneSdk(), fetchPortOnePaymentConfigCached(apiBase)]);
    checkoutAssets.catch(() => {});

    setPendingSubscriptionPaymentPlan(null);
    setProcessingStage("30일 이용권 결제 정보를 준비하고 있어요.\n중복 결제를 시도하지 말아 주세요.", "checkout");
    setIsProcessing(true);

    try {
      const prepareAttempt = await prepareEntry.promise;
      let prepareStatus = prepareAttempt.status;
      let prepareData = prepareAttempt.data;

      if (prepareStatus === 404 || prepareStatus === 405 || prepareStatus === 501) {
        pushToast("error", "이용권 결제 API를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      if (!prepareData.order) {
        // 준비 요청이 실패한 결과를 계속 물고 있으면 재시도해도 같은 실패가 되풀이된다.
        subscriptionPrepareRef.current = null;
        if (prepareStatus === 409) {
          pushToast("error", prepareData.message || "이미 활성 이용권이 있어 중복 구매를 신청할 수 없습니다.");
          return;
        }
        if (prepareStatus === 503 || prepareStatus === 0) {
          pushToast("error", "결제 서버가 잠시 혼잡합니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        pushToast("error", prepareData.message || "이용권 결제 준비에 실패했습니다.");
        return;
      }

      // 클릭 시점에 prepare 와 함께 발사해 둔 것을 여기서 회수한다(대개 이미 끝나 있다).
      const [, paymentConfig] = await checkoutAssets;
      if (!window.PortOne?.requestPayment) throw new Error("포트원 V2 결제 SDK가 초기화되지 않았습니다.");

      // prepareData 가 재시도로 재대입될 수 있어(let) 타입 내로잉이 유지되지 않는다 — 명시적으로 좁힌다.
      // 위 블록에서 이미 걸러지므로 런타임에는 도달하지 않는 방어 분기다.
      const order = prepareData.order;
      if (!order) {
        pushToast("error", "이용권 결제 준비에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const redirectUrl = new URL(PORTONE_MOBILE_REDIRECT_PATH, window.location.origin);
      redirectUrl.searchParams.set("portone_subscription_redirect", "1");

      // prepare 응답이 이미 구매자 번호를 실어 왔으면 그걸 쓴다 — 결제창 직전의 왕복 1회가 통째로 사라진다.
      // 서버가 못 준 경우(미저장·복호화 실패)에만 조회하고, 그래도 없으면 입력 모달을 띄운다.
      const customerPhoneNumber = normalizePaymentPhoneNumber(order.customer?.phoneNumber || "")
        || await ensurePaymentPhoneNumber(apiBase, authUser, null);
      setAuthUser((prev) => prev ? { ...prev, phoneNumber: customerPhoneNumber, phone: prev.phone || customerPhoneNumber } : prev);
      const customer = buildPortOneCustomer(authUser, order.merchantUid, customerPhoneNumber);

      const requestData: PortOnePaymentRequest = {
        storeId: paymentConfig.storeId,
        channelKey: paymentConfig.channelKey,
        paymentId: order.merchantUid,
        orderName: order.productName,
        totalAmount: order.paymentAmount,
        currency: paymentConfig.currency || "CURRENCY_KRW",
        payMethod: paymentConfig.payMethod || "CARD",
        redirectUrl: redirectUrl.toString(),
        customer,
        customData: {
          userId: authUser.id,
          subscriptionTier: plan.tier,
          planId: plan.planId,
          durationMonths: plan.durationMonths,
          durationDays: 30,
          productType: plan.productType,
          subscriptionSource: "pass",
          paymentMethod: selectedMethod || "card_general",
        },
      };

      if (paymentConfig.noticeUrl) requestData.noticeUrls = [paymentConfig.noticeUrl];

      savePendingSubscriptionOrder({
        merchantUid: order.merchantUid,
        customerUid: order.customerUid,
        tier: plan.tier,
        planId: plan.planId,
        durationMonths: plan.durationMonths,
        paymentMethod: selectedMethod || "card_general",
      });
      savePendingSubscriptionPass(plan.tier, order.merchantUid);

      closeProcessingOverlayBeforeExternalCheckout();
      // 이 주문은 결제창으로 넘어갔다. 성공하든 취소되든 재사용하지 않는다 —
      // 이미 시도된 paymentId 로 다시 결제창을 열면 PG 가 거절한다.
      subscriptionPrepareRef.current = null;
      const rsp = await window.PortOne.requestPayment(requestData);
      const paymentId = String(rsp?.paymentId || order.merchantUid || "").trim();

      if (!rsp || rsp.code || !paymentId) {
        discardPendingSubscriptionPass();
        const raw = describePortOneSdkFailure(rsp);
        const message = mapPaymentErrorMessage(raw.message || "이용권 결제를 완료하지 못했습니다.");
        reportPaymentFailureToServer({
          merchantUid: order.merchantUid,
          impUid: paymentId || undefined,
          reasonCode: raw.code ? `pg_${raw.code}` : "subscription_client_cancel_or_fail",
          // 표시용 문장이 아니라 PG 원문을 남긴다 — 매핑된 문장은 원인을 지운다.
          reasonMessage: raw.message || message,
          paymentMethod: selectedMethod || "card_general",
        });
        pushToast("error", message);
        return;
      }

      try {
        setProcessingStage("결제 승인 내역을 안전하게 확인하고 있어요.\n중복 결제를 시도하지 말아 주세요.", "subscription");
        setIsProcessing(true);
        const confirmPayload: SubscriptionConfirmPayload = {
          impUid: paymentId,
          merchantUid: order.merchantUid,
          tier: plan.tier,
          planId: plan.planId,
          durationMonths: plan.durationMonths,
          durationDays: 30,
          amount: order.paymentAmount,
          currency: "KRW",
          productType: plan.productType,
          customerUid: order.customerUid,
          paymentMethod: selectedMethod || "card_general",
        };
        pendingSubscriptionConfirmRef.current = {
          payload: confirmPayload,
          fromRedirect: false,
        };
        const confirmData = await confirmSubscriptionWithServer(confirmPayload);

        if (confirmData.subscription) {
          const newSub: SubscriptionStatus = {
            tier: confirmData.subscription?.tier || "free",
            source: confirmData.subscription?.source || "pass",
            isActive: !!confirmData.subscription?.isActive,
            startedAt: confirmData.subscription?.startedAt || null,
            expiresAt: confirmData.subscription?.expiresAt || null,
            profileLimit: typeof confirmData.subscription?.profileLimit === "number"
              ? confirmData.subscription.profileLimit
              : getSubscriptionPolicyProfileLimit(confirmData.subscription?.tier || plan.tier),
            durationMonths: normalizeSubscriptionDurationMonths(confirmData.subscription?.durationMonths ?? plan.durationMonths) ?? plan.durationMonths,
            lowBalanceWarning: false,
            cancelAtPeriodEnd: !!confirmData.subscription?.cancelAtPeriodEnd,
            cancelRequestedAt: confirmData.subscription?.cancelRequestedAt || null,
            freeLimit: getSubscriptionPolicyFreeLimit(confirmData.subscription?.tier || plan.tier),
          };
          setSubscription((prev) => mergeSubscriptionState(prev, newSub));
          persistSubscriptionCache(newSub);
        }

        clearPendingSubscriptionOrder();
        optimisticPassBackupRef.current = null;
        pendingSubscriptionConfirmRef.current = null;
        await syncSubscriptionAppliedStage(confirmData.subscription?.tier || plan.tier);
        pushToast("success", confirmData.message || `${copy.planTitles[plan.tier]} ${copy.activePassLabel}`);
        setShowStarBurst(true);
        setTimeout(() => setShowStarBurst(false), 1200);
      } catch (error: unknown) {
        if (isUncertainSubscriptionConfirmError(error)) {
          markSubscriptionPaymentUnknown();
          return;
        }
        pendingSubscriptionConfirmRef.current = null;
        discardPendingSubscriptionPass();
        reportPaymentFailureToServer({
          merchantUid: order.merchantUid,
          impUid: paymentId,
          reasonCode: "subscription_confirm_failed",
          reasonMessage: getErrorMessage(error, "이용권 결제 확인에 실패했습니다."),
          paymentMethod: selectedMethod || "card_general",
        });
        pushToast("error", getErrorMessage(error, "이용권 결제 확인에 실패했습니다."));
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, "이용권 처리 중 오류가 발생했습니다.");
      discardPendingSubscriptionPass();
      if (message.includes("SUBSCRIPTION_CONFLICT") || message.includes("중복 이용권") || message.includes("중복 구매")) {
        pushToast("error", "이미 활성 이용권이 있어 중복 구매를 신청할 수 없습니다.");
        return;
      }
      pushToast("error", message);
    } finally {
      releasePaymentActionLock(actionLockKey);
      if (!pendingSubscriptionConfirmRef.current) {
        setIsProcessing(false);
      }
    }
  };

  // Pass products are purchased through direct KRW checkout only.











  const handleSubscriptionCancel = async (resume: boolean) => {
    const flowerAdminToken = getFlowerAdminTokenClient();
    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    const confirmText = resume
      ? "이용권 상태를 다시 확인할까요?"
      : "이용권 상태를 확인할까요? 만료일까지는 모든 혜택을 유지합니다.";
    if (!window.confirm(confirmText)) return;

    const actionLockKey = `subscription-cancel:${resume ? "resume" : "cancel"}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    setIsProcessing(true);
    setProcessingStage("월정석 정보를 확인하는 중이에요", "monthly");
    try {
      const res = await authFetch(`${apiBase}/api/fortune/pig-coin/profile-subscription/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(flowerAdminToken ? { "x-admin-token": flowerAdminToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ resume }),
      }, {
        retryOn401: true,
        apiBase,
      });
      const data = await safeParseJson<{ message?: string; subscription?: SubscriptionStatus }>(res);
      if (!res.ok) {
        pushToast("error", data.message || "이용권 상태 변경에 실패했습니다.");
        return;
      }
      if (data.subscription) {
        const newSub: SubscriptionStatus = {
          tier: data.subscription?.tier || "free",
          source: data.subscription?.source || subscription.source,
          isActive: !!data.subscription?.isActive,
          startedAt: data.subscription?.startedAt || subscription.startedAt || null,
          expiresAt: data.subscription?.expiresAt || null,
          profileLimit: typeof data.subscription?.profileLimit === "number" ? data.subscription.profileLimit : getSubscriptionPolicyProfileLimit(data.subscription?.tier || subscription.tier),
          durationMonths: normalizeSubscriptionDurationMonths(data.subscription?.durationMonths) ?? subscription.durationMonths,
          lowBalanceWarning: false,
          cancelAtPeriodEnd: !!data.subscription?.cancelAtPeriodEnd,
          cancelRequestedAt: data.subscription?.cancelRequestedAt || null,
          freeLimit: data.subscription?.isActive ? getSubscriptionPolicyFreeLimit(data.subscription?.tier || subscription.tier) : 0,
        };
        setSubscription((prev) => mergeSubscriptionState(prev, { ...newSub, lowBalanceWarning: prev.lowBalanceWarning }));
        persistSubscriptionCache(newSub);
      }
      pushToast("success", data.message || "이용권 상태가 변경되었습니다.");
    } catch (error: unknown) {
      pushToast("error", getErrorMessage(error, "이용권 상태 변경 중 오류가 발생했습니다."));
    } finally {
      releasePaymentActionLock(actionLockKey);
      setIsProcessing(false);
    }
  };

  /* ── 패키지 선택 핸들러 ─────────────────────────────────────────── */

  /* ── 부팅 중 화면 ───────────────────────────────────────────────── */
  if (isBooting) {
    return (
      <main
        className="flex min-h-[100dvh] items-center justify-center text-slate-100"
        style={{ background: "var(--cd-page-bg-gradient, linear-gradient(160deg, #071126 0%, #151a3d 46%, #332255 100%))" }}
      >
        <div className="text-center">
          <div className="mb-3 text-5xl animate-pulse">🌙</div>
          <p className="font-semibold">이용권 상점을 불러오는 중...</p>
        </div>
      </main>
    );
  }

  // 잔량이 "확정적으로" 부족할 때만 버튼을 잠근다. 미확정(서버가 확인 못 함)이면 열어두고
  // 최종 판정은 서버 402(INSUFFICIENT_MONTHLY_CREDITS)에 맡긴다 — 과금 없이 안전하게 거절된다.
  // 예전에는 조회 실패의 0 이 곧 "부족"이 되어 월정석 구매 자체가 막다른 길이 됐다.
  const pointStateIsLoading = pointStateStatus === "idle" || pointStateStatus === "loading";
  const pointStateHasError = pointStateStatus === "error" || Boolean(pointStateError);
  const retryPointState = () => {
    setPointStateStatus("loading");
    setPointStateError(null);
    clearMoonlightStoreSnapshot(authStoreUserId, apiBase);
    fetchMyPointState({ force: true }).then(() => {
      setPointStateStatus("ready");
    }).catch((error) => {
      // 재조회 실패도 잔액 0으로 간주하지 않는다. 서버 confirm이 최종 판정한다.
      setMonthlyStoneUnverified(true);
      setPointStateStatus("error");
      setPointStateError(getErrorMessage(error, "이용권 상점 정보를 잠시 불러오지 못했습니다."));
      console.warn("[points-page] shop summary retry failed", error);
    });
  };

  /* ── 메인 렌더 ─────────────────────────────────────────────────── */
  return (
    <main
      className="moon-shop relative min-h-[100dvh] overflow-hidden px-4 py-8 text-slate-100"
      style={{ background: "var(--cd-page-bg-gradient, radial-gradient(circle at 50% -10%, rgba(30,27,96,0.54), transparent 38%), #08091A)" }}
    >
      {/* ── 배경 글로우 오브 ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(202,184,255,0.46) 0%, rgba(140,184,255,0.18) 52%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-48 w-[450px] h-[450px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(243,221,154,0.58) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.38) 0%, transparent 70%)" }}
        />
      </div>

      {/* ── 결제 성공 StarBurst 이펙트 ───────────────────────────── */}
      {showStarBurst && (
        <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl animate-ping">💰</div>
          <div className="absolute left-[42%] top-[44%] text-2xl animate-pulse">✨</div>
          <div className="absolute left-[57%] top-[43%] text-3xl animate-bounce">🐷</div>
          <div className="absolute left-[49%] top-[57%] text-2xl animate-ping">💰</div>
        </div>
      )}

      {/* ── Toast 컨테이너 ────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} closeLabel={copy.toastCloseLabel} />

      {pendingSubscriptionPaymentPlan && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscriptionPaymentChoiceTitle"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isProcessing) setPendingSubscriptionPaymentPlan(null);
          }}
        >
          <div className="w-full max-w-md rounded-[20px] border border-amber-200/35 bg-[#111832] p-5 text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
            <p id="subscriptionPaymentChoiceTitle" className="text-base font-black text-white">
              달빛 이용권 결제 방식 선택
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              {copy.planTitles[pendingSubscriptionPaymentPlan.tier]} · {formatSubscriptionPlanValueLine(pendingSubscriptionPaymentPlan, copy, formatLocale)} · {formatWon(pendingSubscriptionPaymentPlan.wonPrice, copy, formatLocale)}
            </p>
            <p className="mt-1 text-[12px] font-bold text-[#f3dd9a]">
              이용권은 원화 단건 결제로만 구매할 수 있습니다.
            </p>
            <div className="mt-4 rounded-[14px] border border-white/12 bg-white/[0.07] px-3.5 py-3 text-[12px] leading-relaxed text-slate-200">
              <p className="font-black text-white">30일 이용권 조건</p>
              <p className="mt-1">결제 완료 즉시 계정에 활성화되며, 서버 결제 검증 성공 시각부터 30일간 유지됩니다.</p>
              <p className="mt-1 font-bold text-[#f3dd9a]">이용권은 원화 단건 결제로만 활성화할 수 있으며, 월정석으로는 구매할 수 없습니다.</p>
              <p className="mt-1 font-bold text-[#cab8ff]">보유한 월정석은 이용권 구매에 사용할 수 없습니다. 월정석 자체는 구매·충전하거나 현금 환불할 수 없으며, 각 지급분은 지급일로부터 30일간만 유효하고 미사용분은 소멸합니다.</p>
              <p className="mt-1">원화 결제된 30일 이용권은 유료 기능 이용 전 결제일로부터 7일 이내 환불 요청이 가능하며, 이용권 혜택 사용이 시작된 부분은 환불이 제한될 수 있습니다.</p>
              <a href="/terms#refund-policy" target="_blank" rel="noreferrer" className="mt-2 inline-flex font-black text-[#cab8ff] underline">
                자세한 환불 규정 보기
              </a>
            </div>
            <label className="mt-3 flex items-start gap-2 rounded-[14px] border border-amber-200/35 bg-amber-200/10 px-3.5 py-3 text-[12px] font-bold text-amber-100">
              <input
                type="checkbox"
                checked={isSubscriptionRefundAgreed}
                onChange={(event) => setIsSubscriptionRefundAgreed(event.currentTarget.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-amber-300"
              />
              <span>{copy.refundAgreement}</span>
            </label>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={isProcessing || !isSubscriptionRefundAgreed}
                onClick={() => {
                  const plan = pendingSubscriptionPaymentPlan;
                  if (!plan) return;
                  setPendingSubscriptionPaymentPlan(null);
                  void handleSubscribe(plan);
                }}
                className="rounded-[14px] border border-amber-200/45 bg-amber-200 px-4 py-3 text-left text-[#151832] shadow-[0_10px_22px_rgba(243,221,154,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="block text-sm font-black">원화 결제</span>
                <span className="mt-1 block text-[12px] font-semibold">콘텐츠 가치는 원화로 표시되며 보안 결제창에서 결제합니다.</span>
              </button>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setPendingSubscriptionPaymentPlan(null)}
              className="mt-4 w-full rounded-[12px] border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
                  {copy.closeLabel}
            </button>
          </div>
        </div>
      )}

      {/* ── 페이지 콘텐츠 ────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-6xl space-y-5">
        <MoonlightShopHero />
        <MoonlightActivePassCard
          subscription={subscription}
          formatLocale={formatLocale}
          isProcessing={isProcessing}
          onCancelSubscription={handleSubscriptionCancel}
        />
        <MoonlightMonthlyCreditCard
          balance={monthlyStoneBalance}
          expiresAt={monthlyStoneExpiresAt}
          ledgers={monthlyCreditLedgers}
          copy={copy}
          formatLocale={formatLocale}
          isLoading={pointStateIsLoading}
          hasError={pointStateHasError}
          onRetry={retryPointState}
        />
        <MoonlightShopPlans
          subscription={subscription}
          onSubscribe={setPendingSubscriptionPaymentPlan}
          onCancelSubscription={handleSubscriptionCancel}
          isProcessing={isProcessing}
          highlightedPlan={landingPlanPreset}
          copy={copy}
          formatLocale={formatLocale}
        />
        <MoonlightPaymentNotice />
        <MoonlightOrderHistory
          payments={paymentHistory}
          cancelingPaymentId={cancelingPaymentId}
          requestCancelPayment={requestCancelPayment}
          copy={copy}
          formatLocale={formatLocale}
          isLoading={pointStateIsLoading}
          hasError={pointStateHasError}
          historyDeferred={paymentHistoryDeferred}
          onRetry={retryPointState}
        />

        {false && (
        <>

        {/* ① 헤더 카드 */}
        <header className="overflow-hidden rounded-[24px] border border-white/16 bg-[#0b1028]/92 shadow-[0_18px_46px_rgba(7,10,28,0.42)] backdrop-blur">
          {/* 헤더 탐색 프리리엄 바 */}
          <div
            className="h-[3px] w-full"
            style={{ background: "linear-gradient(90deg, rgba(255,255,255,0), #f3dd9a 24%, #cab8ff 52%, #8cb8ff 76%, rgba(255,255,255,0))" }}
            aria-hidden="true"
          />
          <div
            className="rounded-b-[24px] p-6 backdrop-blur-sm"
            style={{ background: "linear-gradient(135deg, rgba(13,19,43,0.94) 0%, rgba(39,34,82,0.86) 58%, rgba(92,78,137,0.72) 100%)" }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Image
                  src={KKULKKUL_POINTS_LOGO_URL}
                  sizes="72px"
                  width={72}
                  height={72}
                  alt={copy.passAlt}
                  className="rounded-2xl shadow-[0_0_22px_rgba(243,221,154,0.24)]"
                  priority
                />
                <div>
                  <p className="text-xs font-extrabold tracking-[0.22em] text-[#ded4ff] uppercase">
                    연이의 달빛 이용권 상점
                  </p>
                  <h1 className="mt-0.5 text-[22px] font-black text-white sm:text-3xl leading-tight">
                    연이의 달빛 이용권 상점
                  </h1>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-100">
                    달빛 이용권 상품과 원화 결제 조건을 한 화면에서 확인하세요.
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-[#ffe8a3]">
                    이용권은 원화 단건 결제로만 구매할 수 있습니다. 월정석으로는 이용권을 구매할 수 없습니다.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/points/history"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#cab8ff]/55 bg-[#cab8ff]/18 px-4 py-2.5 text-sm font-bold text-[#ffe8a3] shadow-[0_2px_12px_rgba(202,184,255,0.18)] transition-all hover:bg-[#cab8ff]/24 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  📋 이용권 주문 내역
                </Link>
                <Link
                  href="/"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.14] px-4 py-2.5 text-sm font-bold text-slate-50 shadow-[0_2px_12px_rgba(7,10,28,0.18)] transition-all hover:bg-white/20 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  ← 서비스 화면으로
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ② 이용권 안내 카드 */}
        <WalletCard name={authUser?.name || copy.defaultUserName} copy={copy} />

        {/* ②-1 이용권 상태 카드 */}
        <SubscriptionStatusCard subscription={subscription} />

        <MonthlyCreditBonusCard
          balance={monthlyStoneBalance}
          expiresAt={monthlyStoneExpiresAt}
          ledgers={monthlyCreditLedgers}
          copy={copy}
          formatLocale={formatLocale}
        />

        {/* ②-2 이용권 섹션 구분선 */}
        <div className="flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#f3dd9a]">
            이용권 상품
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400 to-transparent opacity-50" />
        </div>

        {/* ②-3 이용권 상품 카드 */}
        <SubscriptionSection
          subscription={subscription}
          onSubscribe={setPendingSubscriptionPaymentPlan}
          onCancelSubscription={handleSubscriptionCancel}
          isProcessing={isProcessing}
          highlightedPlan={landingPlanPreset}
          copy={copy}
          formatLocale={formatLocale}
        />

        {/* ③ 섹션 구분선 */}
        <section
          aria-label={copy.wonSinglePaymentAria}
          className="rounded-[20px] border border-white/16 bg-[#0b1028]/82 px-5 py-4 text-[15px] leading-7 text-slate-100"
        >
          각 이용권은 정해진 금액 범위의 유료 리딩을 30일 동안 열어 줍니다. Family는 3만원 이상 상담(초융합 포함)을 이용권 기간당 10회까지 포함하며, 이용권은 원화 단건 결제로만 구매할 수 있습니다.
        </section>

        <section className="rounded-[20px] border border-white/16 bg-[#0b1028]/82 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-white">최근 주문 내역</h3>
            <span className="text-xs font-semibold text-slate-200">주문시각 / 결제시각 / 승인번호 / 영수증</span>
          </div>

          {paymentHistory.length === 0 ? (
            <p className="text-sm text-slate-300">아직 주문 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2.5">
              {paymentHistory.map((payment) => {
                const statusMeta = mapPaymentStatusLabel(payment.status);
                const canCancel = payment.status === "success";
                return (
                  <div
                    key={payment.id}
                    className="rounded-[14px] border border-[#EFDCA8] bg-white/90 p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#5C3A1E]">
                        {formatWon(payment.paymentAmount)}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-1 text-[11.5px] text-[#7A5230] sm:grid-cols-2">
                      <p>주문시각: {formatDateTime(payment.createdAt || payment.updatedAt)}</p>
                      <p>결제시각: {formatPaymentTimeLabel(payment)}</p>
                      <p>최근변경: {formatDateTime(payment.updatedAt || payment.paidAt || payment.createdAt)}</p>
                      <p>결제수단: {formatPaymentMethodLabel(payment)}</p>
                      <p>승인번호: {payment.approvalNumber || "-"}</p>
                      <p>주문번호: {payment.merchantUid || "-"}</p>
                      <p>결제ID: {payment.impUid || "-"}</p>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {payment.receiptUrl ? (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-lg border border-[#D9C07A] bg-[#FFF8E2] px-2.5 py-1 text-[11.5px] font-bold text-[#7A5230] hover:bg-[#FFF2CC]"
                        >
                          영수증 보기
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#9B7040]">영수증 URL 미제공</span>
                      )}

                      <button
                        type="button"
                        disabled={!canCancel || cancelingPaymentId === payment.id}
                        onClick={() => requestCancelPayment(payment)}
                        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11.5px] font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancelingPaymentId === payment.id ? "취소 처리 중..." : "결제 취소 요청"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ⑤ 결제 실패 안내 */}
        <section className="cd-card-light rounded-[20px] border border-[#EDDBA3]/60 bg-[rgba(255,248,228,0.55)] p-5">
          <h3 className="font-bold text-[#5C3A1E]">결제 실패 안내</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[#7A5230]">
            <li>• 창 닫기/취소: 결제가 취소되어 이용권 권한이 생성되지 않습니다.</li>
            <li>• 한도 초과: 다른 카드/계좌이체 또는 금액을 낮춰 재시도해 주세요.</li>
            <li>• 카드사 점검: 잠시 후 다시 시도하거나 다른 결제수단을 선택해 주세요.</li>
          </ul>
        </section>

        {/* ⑥ 섹션 구분선 — 계정 설정 */}
        </>
        )}

        <div className="flex items-center gap-3 px-1 pt-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-400 to-transparent opacity-40" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
            계정 설정
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-400 to-transparent opacity-40" />
        </div>

        {/* ⑦ 계정 정보 카드 */}
        <section
          aria-label="계정 정보"
          className="rounded-[24px] border border-slate-200 bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          {/* 헤더 */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">👤</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Account</p>
                <h2 className="text-base font-bold text-slate-700">내 계정 정보</h2>
              </div>
            </div>
          </div>

          {/* 계정 상세 */}
          <div className="p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">이름</p>
                <p className="text-sm font-semibold text-slate-700 truncate">{authUser?.name || "—"}</p>
              </div>
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">아이디 (이메일)</p>
                <p className="text-sm font-semibold text-slate-700 truncate">{authUser?.email || "—"}</p>
              </div>
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">콘텐츠 가치 단위</p>
                <p className="text-sm font-semibold text-amber-700">
                  콘텐츠 기준은 가격 산정 전용
                </p>
              </div>
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">현재 이용권</p>
                <p className="text-sm font-semibold text-slate-700">
                  {!subscription.isActive || subscription.tier === "free" ? "이용권 없음"
                   : subscription.tier === "standard" ? "스탠다드 달빛 이용권"
                   : subscription.tier === "premium" ? "프리미엄 달빛 이용권"
                   : subscription.tier === "vvip" ? "VVIP 달빛 이용권"
                   : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* 위험 구역 구분선 */}
          <div className="mx-5 border-t border-dashed border-red-200" />

          {/* 위험 구역 */}
          <div className="p-5">
            <div className="rounded-[18px] border border-red-200 bg-red-50/60 overflow-hidden">
              {/* 위험 구역 헤더 */}
              <div className="px-4 py-3 bg-red-100/70 border-b border-red-200 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                  className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true">
                  <path fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd" />
                </svg>
                <p className="text-[12px] font-extrabold text-red-700 uppercase tracking-wide">위험 구역 — Danger Zone</p>
              </div>

              <div className="p-4 space-y-3">
                {/* 경고 안내 */}
                <div className="text-[12px] text-red-700 leading-relaxed space-y-1">
                  <p>• 탈퇴 시 이용권·운세 프로필 등 <strong>모든 데이터가 즉시 영구 삭제</strong>됩니다.</p>
                  <p>• 탈퇴 후 <strong>동일 이메일로 재가입해도 이전 데이터는 복구되지 않습니다.</strong></p>
                  <p>• 법적 보존 의무에 따라 결제 거래 금액·일시는 5년간 익명화 보관됩니다.</p>
                </div>

                {/* 탈퇴 버튼 */}
                <button
                  type="button"
                  onClick={() => setIsWithdrawOpen(true)}
                  className="mt-1 inline-flex items-center gap-2 rounded-[12px] border border-red-300 bg-white hover:bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition-all hover:-translate-y-0.5 active:scale-[0.97] shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth={2} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                  회원 탈퇴
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ══ 결제 방법 모달 ══════════════════════════════════════ */}
      {isMethodModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(20,10,5,0.65)] px-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) setIsMethodModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-[28px] overflow-hidden shadow-[0_24px_70px_rgba(80,40,5,0.42)]">
            {/* 모달 식별 골드 바 */}
            <div
              className="h-[3px] w-full"
              style={{ background: "linear-gradient(90deg, #A0680A 0%, #FFD060 30%, #FFFFFF 50%, #FFD060 70%, #A0680A 100%)" }}
              aria-hidden="true"
            />
            <div
              className="border border-t-0 border-[#EDDBA3] rounded-b-[28px] p-6"
              style={{ background: "linear-gradient(160deg, #FFFDF5 0%, #FFF6E0 50%, #FFF1CC 100%)" }}
            >

            {/* 모달 헤더 */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-700">
                  원화 결제 방법 선택
                </p>
                <h4 className="mt-0.5 text-lg font-bold text-[#5C3A1E]">
                  {getPointPackageTitle(selectedPackage, copy)}
                </h4>
                <p className="text-sm font-semibold text-[#7A5230]">
                  {formatWon(selectedPackage.amount)}
                </p>
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsMethodModalOpen(false)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#EDDBA3] bg-white/90 text-lg font-bold text-[#7A5230] transition-colors hover:bg-white disabled:opacity-50"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            {/* 결제 방법 그리드 */}
            <div className="grid gap-2 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => {
                const sel = method.id === selectedMethod;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={[
                      "rounded-[16px] border p-3 text-left transition-all active:scale-[0.97]",
                      sel
                        ? "border-[#C9A84C] bg-[rgba(255,240,190,0.9)] shadow-[0_6px_16px_rgba(180,130,30,0.22)]"
                        : "border-[#EDDBA3] bg-white/80 hover:border-[#C9A84C]/80",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{method.logo}</span>
                      <span className="text-sm font-semibold text-[#5C3A1E]">{method.label}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#7A5230]">{method.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* 결제 진행 버튼 */}
            <button
              type="button"
              onClick={startPayment}
              disabled={isProcessing}
              className="mt-5 w-full rounded-[16px] bg-gradient-to-r from-[#C9A84C] via-[#DFB84C] to-[#E8C060] px-4 py-4 text-base font-black text-white shadow-[0_10px_28px_rgba(160,120,20,0.45)] transition-all hover:-translate-y-0.5 hover:from-[#D4B050] hover:to-[#F0CD6A] hover:shadow-[0_14px_32px_rgba(160,120,20,0.55)] active:scale-[0.97] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? "🐷 연결 중..." : "원화 결제를 진행합니다"}
            </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ 회원 탈퇴 모달 ══════════════════════════════════════════ */}
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        hasLocalAuth={true}
      />

    </main>
  );
}
