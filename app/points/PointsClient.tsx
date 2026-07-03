"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TurnstileWidget from "@/components/TurnstileWidget";
import MoonIcon, { type MoonPhase } from "@/components/ui/MoonIcon";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import WithdrawModal from "../components/WithdrawModal";
import { usePaymentProcessing } from "../components/PaymentProcessingContext";
import type { PaymentLoadingProps } from "../components/common/PaymentLoading";
import { getSubscriptionTierLabel } from "../components/subscriptionNotice";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";
import SubscriptionStatusCard from "./SubscriptionStatusCard";
import { authFetch, clearClientAuthState } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { readSubscriptionSnapshotForUser, saveSubscriptionSnapshotForUser } from "../_lib/billing-client";
import { persistSanitizedAuthUser, readSanitizedAuthUser, resolveAuthScopeFromUser } from "../_lib/auth-storage";
import { resolveMonthlyStoneBalance } from "../_lib/monthly-stone";

type PaymentLoadingVariant = NonNullable<PaymentLoadingProps["variant"]>;

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ????뺤쓽
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */

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
  };
};

type PrepareSubscriptionOrderResponse = {
  message?: string;
  order?: {
    merchantUid: string;
    customerUid: string;
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

const KKULKKUL_POINTS_LOGO_PUBLIC_PATH = "/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp";
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
};

/* ?? ?꾨줈???댁슜沅????????????????????????????????????????????? */
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
  coins:        number;
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
  subscription?: Record<string, unknown> | null;
  subscriptions?: Record<string, unknown>[];
  data?: {
    balance?: number;
    payments?: PaymentHistoryItem[];
    monthlyCredits?: number;
    membershipCreditBalance?: number;
    monthlyCreditLedgers?: MonthlyCreditLedgerItem[];
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

type PendingSubscriptionOrder = {
  merchantUid: string;
  customerUid: string;
  tier: "standard" | "premium" | "vvip" | "family";
  planId?: string;
  durationMonths?: number;
  paymentMethod: string;
};

type PointStateStatus = "idle" | "loading" | "ready" | "error";

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

/** Toast ?뚮┝ ?섎굹???곗씠??援ъ“ */
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ?곸닔 ?뺤쓽
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */

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
  const response = await authFetch(`${apiBase}/api/me/payment-phone`, {
    method: "GET",
    credentials: "include",
  }, {
    retryOn401: true,
    apiBase,
  });
  const payload = await safeParseJson<{ phoneNumber?: string; phone?: string; message?: string }>(response);
  if (!response.ok) throw new Error(payload.message || "寃곗젣???대???踰덊샇瑜??뺤씤?섏? 紐삵뻽?듬땲??");
  return normalizePaymentPhoneNumber(payload.phoneNumber || payload.phone || "");
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
  });
  const payload = await safeParseJson<{ phoneNumber?: string; phone?: string; message?: string }>(response);
  if (!response.ok) throw new Error(payload.message || "?대???踰덊샇 ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.");
  return normalizePaymentPhoneNumber(payload.phoneNumber || payload.phone || phoneNumber);
}

async function ensurePaymentPhoneNumber(apiBase: string, user: AuthUser | null): Promise<string> {
  const cachedUser = readSanitizedAuthUser() as AuthUser | null;
  const current = normalizePaymentPhoneNumber(user?.phoneNumber || user?.phone || cachedUser?.phoneNumber || cachedUser?.phone || "");
  if (current) return current;
  const saved = await getSavedPaymentPhoneNumber(apiBase).catch(() => "");
  if (saved) return saved;
  const typed = window.prompt("?대땲?쒖뒪 寃곗젣瑜??꾪빐 援щℓ???대???踰덊샇媛 ?꾩슂?⑸땲?? 理쒖큹 1?뚮쭔 ?낅젰??二쇱꽭??", "");
  const normalized = normalizePaymentPhoneNumber(typed || "");
  if (!normalized) throw new Error("?대땲?쒖뒪 寃곗젣瑜?吏꾪뻾?섎젮硫?援щℓ???대???踰덊샇媛 ?꾩슂?⑸땲??");
  const nextPhone = await savePaymentPhoneNumber(apiBase, normalized);
  const latestUser = readSanitizedAuthUser() as AuthUser | null;
  if (latestUser) persistSanitizedAuthUser({ ...latestUser, phoneNumber: nextPhone, phone: latestUser.phone || nextPhone });
  return nextPhone;
}

function buildPortOneCustomer(user: AuthUser | null, paymentId: string, phoneNumber?: string): PortOneCustomer {
  const cachedUser = readSanitizedAuthUser() as AuthUser | null;
  const merged = { ...(cachedUser || {}), ...(user || {}) } as AuthUser;
  const fullName = String(merged.name || "?뚯썝").trim();
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
    baseWonPrice: 9900,
    coins:        115,
    profileLimit: 3,
    freeUpTo:     30,
    theme:        "amber",
    badge:        "",
    features:     [
      "profile3",
      "under3000",
      "over3000Single",
      "pdfSingle",
      "activeImmediately",
      "notAutoBilling",
    ],
  },
  {
    tier:         "premium",
    title:        "premium",
    baseWonPrice: 29900,
    coins:        360,
    profileLimit: 7,
    freeUpTo:     50,
    theme:        "rose",
    features:     [
      "profile7",
      "under5000",
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
    baseWonPrice: 59000,
    coins:        700,
    profileLimit: 15,
    freeUpTo:     100,
    theme:        "purple",
    features:     [
      "profile15",
      "under10000",
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
    baseWonPrice: 300000,
    coins:        3000,
    profileLimit: null,
    freeUpTo:     null,
    theme:        "purple",
    features:     [
      "profileUnlimited",
      "allPaidPdf",
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
    title: `${base.title} 쨌 ${duration.label}`,
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
    defaultUserName: "?ъ슜??,
    defaultMemberName: "?뚯썝",
    duration30: "30??,
    heldPass: "蹂댁쑀 ?댁슜沅?,
    allPaidPdfPolicy: "紐⑤뱺 ?좊즺 ?쒕퉬???댁슜 媛??,
    generalLimitPolicy: (value) => `?쇰컲 ${value} ?댄븯 ?댁슜 媛??,
    familyValueLine: (duration) => `Family ?꾩껜 ?쒗깮 / ${duration}`,
    planValueLine: (value, duration) => `${value} ?댄븯 湲곕뒫 / ${duration}`,
    monthlyCreditValue: (amount, locale) => `${Math.max(0, Math.floor(Number(amount || 0))).toLocaleString(locale)} ?붿젙??,
    won: (amount, locale) => `${Number(amount || 0).toLocaleString(locale)}??,
    planTitles: {
      free: "臾대즺 ?뚮옖",
      standard: "?ㅽ깲?ㅻ뱶 轅 30??,
      premium: "?꾨━誘몄뾼 轅 30??,
      vvip: "VVIP 轅?⑥? 30??,
      family: "Code Destiny Family 30??,
    },
    planBadges: {
      recommended: "異붿쿇",
      family: "Family",
      vvip: "VVIP",
    },
    planFeatures: {
      free: {},
      standard: {
        profile3: "?꾨줈??理쒕? 3媛??앹꽦",
        under3000: "3,000???댄븯 ?좊즺 湲곕뒫 ?댁슜 媛??,
        over3000Single: "30???숈븞 ?ㅽ깲?ㅻ뱶 ?쒗깮 ?좎?",
        pdfSingle: "PDF ?곹뭹 議곌굔? 寃곗젣 ???덈궡",
        activeImmediately: "寃곗젣 利됱떆 30???댁슜沅??쒖꽦??,
        notAutoBilling: "?붿젙???먮뒗 ?먰솕 援щℓ 媛??,
      },
      premium: {
        profile7: "?꾨줈??理쒕? 7媛??앹꽦",
        under5000: "5,000???댄븯 ?좊즺 湲곕뒫 ?댁슜 媛??,
        over5000Single: "30???숈븞 ?꾨━誘몄뾼 ?쒗깮 ?좎?",
        pdfSingle: "PDF ?곹뭹 議곌굔? 寃곗젣 ???덈궡",
        activeImmediately: "寃곗젣 利됱떆 30???댁슜沅??쒖꽦??,
        notAutoBilling: "?붿젙???먮뒗 ?먰솕 援щℓ 媛??,
      },
      vvip: {
        profile15: "?꾨줈??理쒕? 15媛??앹꽦",
        under10000: "10,000???댄븯 ?좊즺 湲곕뒫 ?댁슜 媛??,
        over10000Single: "30???숈븞 VVIP ?쒗깮 ?좎?",
        pdfSingle: "PDF ?곹뭹 議곌굔? 寃곗젣 ???덈궡",
        activeImmediately: "寃곗젣 利됱떆 30???댁슜沅??쒖꽦??,
        notAutoBilling: "?붿젙???먮뒗 ?먰솕 援щℓ 媛??,
      },
      family: {
        profileUnlimited: "?꾨줈??異붽?쨌?섏젙쨌??젣 臾대즺, ?쒗븳 ?놁쓬",
        allPaidPdf: "紐⑤뱺 ?좊즺 ?쒕퉬???댁슜 媛??,
        familyIncluded: "Family ?꾩껜 ?쒗깮 ?곸슜",
        activeImmediately: "寃곗젣 利됱떆 30???댁슜沅??쒖꽦??,
        notAutoBilling: "?붿젙???먮뒗 ?먰솕 援щℓ 媛??,
      },
    },
    pointPackages: {
      directPaidService: {
        title: "?곹뭹蹂??쒗깮 ?덈궡",
        description: "?댁슜沅뚮퀎 ?쒗깮 踰붿쐞? PDF 議곌굔? 寃곗젣 ???곹뭹 ?덈궡?먯꽌 ?뺤씤?????덉뒿?덈떎.",
      },
    },
    paymentMethods: {
      cardGeneral: { label: "KG?대땲?쒖뒪 移대뱶", desc: "?ы듃??V2 ?몄쬆 寃곗젣" },
    },
    paymentStatuses: {
      success: "?앹꽦 ?꾨즺",
      paid: "寃곗젣 ?꾨즺",
      processing: "?앹꽦 以?,
      retryable: "?ъ떆??媛??,
      cancelled: "痍⑥냼?꾨즺",
      refunded: "?섎텋?꾨즺",
      failed: "?ㅽ뙣",
      pending: "?湲?,
    },
    subscriptionAria: "?щ튆 30???댁슜沅?,
    toastCloseLabel: "?뚮┝ ?リ린",
    monthlyBonusAria: "?붿젙??蹂대꼫???붾웾怨??ъ슜 ?댁뿭",
    walletAria: "?댁슜沅??곸젏 ?덈궡",
    refundAgreement: "?먰솕 寃곗젣??30???댁슜沅뚯? 寃곗젣 利됱떆 ?쒖꽦?붾릺硫? ?좊즺 湲곕뒫 ?댁슜 ?쒖옉 ?꾩뿉???섎텋???쒗븳?????덉쓬???뺤씤?덉뒿?덈떎.",
    passAlt: "?щ튆 ?댁슜沅?,
    wonSinglePaymentAria: "?먰솕 寃곗젣 ?덈궡",
    paymentFailureGuide: [
      "李??リ린/痍⑥냼: 寃곗젣媛 痍⑥냼?섏뼱 ?댁슜沅?沅뚰븳???앹꽦?섏? ?딆뒿?덈떎.",
      "?쒕룄 珥덇낵: ?ㅻⅨ 移대뱶/怨꾩쥖?댁껜 ?먮뒗 湲덉븸????떠 ?ъ떆?꾪빐 二쇱꽭??",
      "移대뱶???먭?: ?좎떆 ???ㅼ떆 ?쒕룄?섍굅???ㅻⅨ 寃곗젣?섎떒???좏깮??二쇱꽭??",
    ],
    accountInfoAria: "怨꾩젙 ?뺣낫",
    dangerDeleteLines: [
      "?덊눜 ???댁슜沅뙿룹슫???꾨줈????紐⑤뱺 ?곗씠?곌? 利됱떆 ?곴뎄 ??젣?⑸땲??",
      "?덊눜 ???숈씪 ?대찓?쇰줈 ?ш??낇빐???댁쟾 ?곗씠?곕뒗 蹂듦뎄?섏? ?딆뒿?덈떎.",
      "踰뺤쟻 蹂댁〈 ?섎Т???곕씪 寃곗젣 嫄곕옒 湲덉븸쨌?쇱떆??5?꾧컙 ?듬챸??蹂닿??⑸땲??",
    ],
    closeLabel: "?リ린",
    currentPlan: "?꾩옱 ?뚮옖",
    purchasePass: (icon) => `${icon} 30???댁슜沅?援щℓ?섍린`,
    extendPass: "30???댁슜沅??곗옣",
    lowerTierBlocked: "?곸쐞 ?곗뼱 ?ъ슜 以?(援щℓ 遺덇?)",
    lowerTierBlockedHelp: "?꾩옱 ?곸쐞 ?곗뼱 ?댁슜沅뚯씠 ?쒖꽦?붾릺???섏쐞 ?뚮옖? ?좏깮?????놁뒿?덈떎.",
    activePassLabel: "30???댁슜沅??쒖꽦??,
    activePassMessage: (expires) => `${expires}源뚯? 30???쒗깮???좎??⑸땲?? ?붿젙???먮뒗 ?먰솕濡??ㅼ쓬 ?댁슜沅뚯쓣 ?ㅼ떆 ?????덉뒿?덈떎.`,
    activePassFooter: "寃곗젣 利됱떆 ?댁슜沅??쒗깮???쒖꽦?붾릺硫?30???숈븞 ?좏슚?⑸땲??",
    activePassAutoRenewWarning: "留뚮즺 ?꾩뿉???붿젙???먮뒗 ?먰솕濡?30???쒗깮???ㅼ떆 ?????덉뒿?덈떎.",
    coffeeBadge: "而ㅽ뵾 2??媛믪쑝濡?30??,
  },
  en: {
    defaultUserName: "User",
    defaultMemberName: "Member",
    duration30: "30 days",
    heldPass: "Active pass",
    allPaidPdfPolicy: "All paid services available",
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
        under3000: "Use paid features up to KRW 3,000",
        over3000Single: "Standard benefits stay active for 30 days",
        pdfSingle: "PDF terms are shown before purchase",
        activeImmediately: "30-day pass activates after payment",
        notAutoBilling: "Monthly credits or KRW purchase available",
      },
      premium: {
        profile7: "Create up to 7 profiles",
        under5000: "Use paid features up to KRW 5,000",
        over5000Single: "Premium benefits stay active for 30 days",
        pdfSingle: "PDF terms are shown before purchase",
        activeImmediately: "30-day pass activates after payment",
        notAutoBilling: "Monthly credits or KRW purchase available",
      },
      vvip: {
        profile15: "Create up to 15 profiles",
        under10000: "Use paid features up to KRW 10,000",
        over10000Single: "VVIP benefits stay active for 30 days",
        pdfSingle: "PDF terms are shown before purchase",
        activeImmediately: "30-day pass activates after payment",
        notAutoBilling: "Monthly credits or KRW purchase available",
      },
      family: {
        profileUnlimited: "Unlimited profile add/edit/delete",
        allPaidPdf: "All paid services available",
        familyIncluded: "Full Family benefits apply",
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

POINTS_PAGE_COPY.ja = { ...POINTS_PAGE_COPY.en, defaultUserName: "?╉꺖?뜰꺖", defaultMemberName: "鴉싧뱻", duration30: "30??, passAlt: "?덃삇?뗣굤?⑴뵪??, closeLabel: "?됥걯?? };
POINTS_PAGE_COPY["zh-CN"] = { ...POINTS_PAGE_COPY.en, defaultUserName: "?ⓩ댎", defaultMemberName: "鴉싧몮", duration30: "30鸚?, passAlt: "?덂뀎?싪죱瑥?, closeLabel: "?녜뿭" };
POINTS_PAGE_COPY["zh-TW"] = { ...POINTS_PAGE_COPY["zh-CN"], defaultUserName: "鵝욜뵪??, defaultMemberName: "?껃뱻", passAlt: "?덂뀎?싪죱鈺?, closeLabel: "?쒒뻾" };

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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ?좏떥由ы떚 ?⑥닔
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */

function formatWon(amount: number, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  return copy.won(Number(amount || 0), locale);
}

function formatCoinValue(amount: number, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  return formatWon(Math.max(0, Math.floor(Number(amount || 0))) * 100, copy, locale);
}

function formatMonthlyCreditValue(amount: number, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  return copy.monthlyCreditValue(amount, locale);
}

function calculateSubscriptionMonthlyCreditCost(plan: Pick<SubscriptionPlan, "wonPrice">) {
  return Math.max(0, Math.ceil(Number(plan.wonPrice || 0) / 10));
}

function buildMonthlyCreditSubscriptionRequestId(plan: Pick<SubscriptionPlan, "planId">) {
  return `sub_monthly_${Date.now().toString(36)}_${String(plan.planId || "plan").replace(/[^a-z0-9_-]/gi, "").slice(0, 40)}_${Math.random().toString(36).slice(2, 8)}`;
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
  return method === "monthly_credit" || method === "monthly" || accessType === "membership_credit";
}

function langSensitiveLabel(copy: PointsPageCopy, ko: string, en: string) {
  return copy === POINTS_PAGE_COPY.ko ? ko : en;
}

function getPointPackageTitle(pack: Pick<PointPackage, "title">, copy: PointsPageCopy) {
  return copy.pointPackages[pack.title]?.title || pack.title;
}

function formatPaymentMethodLabel(payment: PaymentHistoryItem, copy: PointsPageCopy = POINTS_PAGE_COPY.ko) {
  if (isMonthlyCreditPayment(payment)) return langSensitiveLabel(copy, "?꾨줈紐⑥뀡 泥섎━", "Promotion");
  const method = String(payment.paymentMethodLabel || payment.paymentMethod || "").trim();
  const normalized = method.toLowerCase();
  if (!method) return "-";
  if (normalized === "card_general" || normalized === "card") return copy.paymentMethods.cardGeneral?.label || method;
  if (normalized === "virtual_account") return langSensitiveLabel(copy, "媛?곴퀎醫?, "Virtual account");
  if (normalized === "kakaopay") return "KakaoPay";
  if (normalized === "naverpay") return "Naver Pay";
  return method;
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
  if (type === "MONTHLY_CREDIT_GRANT") return "吏湲?;
  if (type === "MONTHLY_CREDIT_SPEND") return "?ъ슜";
  if (type === "MONTHLY_CREDIT_REFUND") return "蹂듭썝";
  return "湲곕줉";
}

function formatMonthlyCreditLedgerAmount(entry: MonthlyCreditLedgerItem, copy: PointsPageCopy = POINTS_PAGE_COPY.ko, locale = FORMAT_LOCALE_BY_LANG.ko) {
  const amount = Math.max(0, Math.floor(Number(entry.amount || 0)));
  const type = String(entry.type || "");
  const sign = type === "MONTHLY_CREDIT_SPEND" ? "-" : "+";
  return `${sign}${copy.monthlyCreditValue(amount, locale)}`;
}

function formatMonthlyCreditLedgerReason(entry: MonthlyCreditLedgerItem) {
  const reason = String(entry.reason || "").trim();
  if (reason.includes("membership_credit_access")) return "?좊즺 湲곕뒫 ?댁슜";
  if (reason.includes("monthly-credit membership pass purchase")) return "?щ튆 ?댁슜沅??쒖꽦??;
  if (reason) return reason;
  if (entry.type === "MONTHLY_CREDIT_GRANT") return "蹂대꼫???붿젙??吏湲?;
  if (entry.type === "MONTHLY_CREDIT_SPEND") return "蹂대꼫???붿젙???ъ슜";
  if (entry.type === "MONTHLY_CREDIT_REFUND") return "蹂대꼫???붿젙??蹂듭썝";
  return "?붿젙???댁뿭";
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
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function mapAuthRefreshTemporaryFailureMessage() {
  return "濡쒓렇???몄뀡 ?뺤씤???쇱떆?곸쑝濡?吏?곕릺怨??덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??";
}

function mapPaymentErrorMessage(rawMessage: string) {
  const text = String(rawMessage || "").toLowerCase();
  if (text.includes("痍⑥냼") || text.includes("cancel"))
    return "寃곗젣媛 痍⑥냼?섏뿀?듬땲?? ?먰븯?????ㅼ떆 ?쒕룄?섏떎 ???덉뼱??";
  if (text.includes("?쒕룄") || text.includes("limit"))
    return "寃곗젣 ?쒕룄 珥덇낵濡?吏꾪뻾?섏? ?딆븯?듬땲?? ?ㅻⅨ 移대뱶??寃곗젣?섎떒???댁슜??二쇱꽭??";
  if (text.includes("?먭?") || text.includes("maintenance") || text.includes("unavailable"))
    return "移대뱶??PG ?먭? ?쒓컙?쇰줈 寃곗젣媛 吏?곕릺怨??덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??";
  return "寃곗젣瑜??꾨즺?섏? 紐삵뻽?듬땲?? ?ㅽ듃?뚰겕 ?곹깭? 寃곗젣 ?뺣낫瑜??뺤씤 ???ㅼ떆 ?쒕룄??二쇱꽭??";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSubscriptionTier(value: unknown): SubscriptionTier {
  const text = String(value || "").trim().toLowerCase();
  if (text === "standard" || text.includes("?ㅽ깲?ㅻ뱶")) return "standard";
  if (text === "premium" || text.includes("?꾨━誘몄뾼")) return "premium";
  if (text === "vvip" || text.includes("釉뚯씠釉뚯씠?꾩씠??) || text.includes("怨⑤뱶")) return "vvip";
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
    "?깅줉以?,
    "?댁슜以?,
    "?좏슚",
    "?꾨즺",
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
  const monthlyStoneBalance = resolveMonthlyStoneBalance(node, payload?.user) ?? 0;
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
    payments,
    monthlyCreditLedgers,
    subscription,
  };
}

/**
 * API ?묐떟???덉쟾?섍쾶 JSON?쇰줈 ?뚯떛?⑸땲??
 * Content-Type??application/json???꾨땶 寃쎌슦(?? HTML ?먮윭 ?섏씠吏)
 * ?ъ슜??移쒗솕?곸씤 ?먮윭 硫붿떆吏瑜??섏쭛?덈떎.
 */
async function safeParseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `?쒕쾭 ?먭? 以묒엯?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭?? (HTTP ${response.status})`,
    );
  }
  return response.json() as Promise<T>;
}

function ensurePortoneSdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("釉뚮씪?곗? ?섍꼍?먯꽌留?寃곗젣瑜?吏꾪뻾?????덉뒿?덈떎."));
      return;
    }
    if (window.PortOne?.requestPayment) { resolve(); return; }
    const scriptId = "portone-v2-sdk";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.PortOne?.requestPayment) resolve();
        else reject(new Error("?ы듃??V2 SDK媛 珥덇린?붾릺吏 ?딆븯?듬땲??"));
      }, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("寃곗젣 SDK瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??")),
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
      else reject(new Error("?ы듃??V2 SDK媛 珥덇린?붾릺吏 ?딆븯?듬땲??"));
    };
    script.onerror = () => reject(new Error("寃곗젣 SDK瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??"));
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
    throw new Error(payload.message || "?ы듃??V2 寃곗젣 ?ㅼ젙???뺤씤?????놁뒿?덈떎.");
  }
  const storeId = String(payload.storeId || "").trim();
  const channelKey = String(payload.channelKey || "").trim();

  if (!storeId || !channelKey) {
    throw new Error(payload.message || "?ы듃??V2 寃곗젣 ?ㅼ젙???뺤씤?????놁뒿?덈떎.");
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

function readPendingSubscriptionPass() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("fortune_pending_subscription_pass");
    if (!raw) return null;
    return JSON.parse(raw) as PendingSubscriptionPass;
  } catch {
    return null;
  }
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ?쒕툕 而댄룷?뚰듃: ?꾨줈???댁슜沅??뱀뀡
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */

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
      icon:    "?뙏",
    },
    rose: {
      card:    "border-[#cab8ff]/55 bg-[#0d1230]/95",
      label:   "text-[#ded4ff]",
      badge:   "from-[#cab8ff] to-[#f3dd9a]",
      freeTag: "bg-[#cab8ff]/22 text-[#ded4ff] ring-1 ring-[#cab8ff]/60",
      btn:     "from-[#cab8ff] to-[#f3dd9a] text-[#151832] shadow-[0_8px_18px_rgba(202,184,255,0.24)]",
      icon:    "?뙐",
    },
    purple: {
      card:    "border-[#8cb8ff]/55 bg-[#0d1433]/95",
      label:   "text-[#cfe1ff]",
      badge:   "from-[#f3dd9a] via-[#cab8ff] to-[#8cb8ff]",
      freeTag: "bg-[#8cb8ff]/22 text-[#e8f1ff] ring-1 ring-[#8cb8ff]/60",
      btn:     "from-[#f3dd9a] via-[#cab8ff] to-[#8cb8ff] text-[#151832] shadow-[0_8px_18px_rgba(140,184,255,0.24)]",
      icon:    "?뙆",
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
      {/* ?뱀뀡 ?ㅻ뜑 */}
      <div
        className="px-5 pt-5 pb-5"
        style={{ background: "linear-gradient(145deg, rgba(5,8,23,0.99) 0%, rgba(12,18,48,0.98) 48%, rgba(24,29,72,0.96) 100%)" }}
      >
        {/* ?쒕ぉ */}
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-widest text-[#ded4ff]">?곗씠???щ튆 ?댁슜沅??곸젏</p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-white">?곗씠???щ튆 ?댁슜沅??곸젏</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-100">
            30???댁슜沅??곹뭹怨??먰솕 寃곗젣 議곌굔???뺤씤?섏꽭??
          </p>
        </div>

        {/* ?듭떖 ?쒗깮 callout */}
        <div className="mb-4 rounded-[16px] border border-[#cab8ff]/45 bg-[#11183a]/85 px-4 py-3.5 shadow-[inset_0_1px_3px_rgba(255,255,255,0.08)]">
          <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-black uppercase tracking-wide text-[#ffe8a3]">
            <span aria-hidden="true">?뙔</span> ?щ튆 ?댁슜沅뚯쓽 ?밸퀎???댁쑀
          </p>
          <p className="text-[13.5px] leading-6 text-slate-100">
            <span className="font-bold text-white">媛議굿룹뿰?맞룹옄? ???ㅻⅨ ?앸뀈?붿씪</span>濡??꾨줈?꾩쓣 異붽??대룄,
            30???댁슜沅??섎굹濡?<span className="font-bold text-white">紐⑤뱺 ?꾨줈?꾩뿉???댁슜沅??쒗깮??洹몃?濡??댁슜</span>?????덉뒿?덈떎.
          </p>
          <p className="mt-2 text-[12.5px] font-semibold text-[#ded4ff]">
            ?붿젙???먮뒗 ?먰솕 寃곗젣濡?30???쒗깮???ㅼ떆 ?????덉뒿?덈떎.
          </p>
        </div>

        {/* ?щ튆 ?댁슜沅??쒗깮 ?ъ쟾 ?덈궡 */}
        {subscription.lowBalanceWarning && (
          <div className="mb-4 rounded-[14px] border border-orange-300/50 bg-orange-400/12 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-orange-100">
              <span aria-hidden="true">?뵒</span> ?щ튆 ?댁슜沅??쒗깮 踰붿쐞瑜??뺤씤??二쇱꽭??
            </p>
            <p className="mt-1 text-[11.5px] text-orange-100/90">
              ?댁슜沅?湲곌컙({expires}源뚯?)? ?좎??섎ŉ,
              異붽? ?좊즺 肄섑뀗痢좊뒗 ?곹뭹蹂??덈궡???곕씪 ?댁슜?????덉뒿?덈떎.
            </p>
          </div>
        )}

        {/* 怨듯넻 ?댁쁺 ?뺤콉 ?덈궡 */}
        <div className="mb-4 rounded-[16px] border border-[#8cb8ff]/42 bg-[#0f2348]/80 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[12.5px] font-black text-[#e8f1ff]">
            <span aria-hidden="true">?뱄툘</span> ?댁슜沅??댁쁺 ?뺤콉
          </p>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-5 text-slate-100">
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">쨌</span><span className="min-w-0">紐⑤뱺 ?좉퇋 ?먮ℓ ?댁슜沅뚯? <strong>寃곗젣 寃利??깃났 ?쒖젏遺??30???숈븞 ?좏슚</strong>?⑸땲??</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">쨌</span><span className="min-w-0">?ㅽ깲?ㅻ뱶쨌?꾨━誘몄뾼쨌VVIP???쇰컲 ?좊즺 ?쒕퉬?ㅺ? 媛?3,000??5,000??10,000???댄븯?????댁슜沅뚯쑝濡??댁슜?????덉뒿?덈떎.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">쨌</span><span className="min-w-0">Code Destiny Family???꾨줈??移대뱶 ?쒗븳 ?놁씠 紐⑤뱺 ?좊즺 ?쒕퉬?ㅻ? ?댁슜?????덉뒿?덈떎.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">쨌</span><span className="min-w-0">PDF ?쒕퉬?ㅼ? ?쇰컲 ?좊즺 ?쒕퉬??議곌굔? ?곹뭹蹂??덈궡?먯꽌 ?뺤씤?????덉뒿?덈떎.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">쨌</span><span className="min-w-0">湲곌컙 醫낅즺 ??異붽? 寃곗젣 ?놁씠 臾대즺 ?뚮옖?쇰줈 ?꾪솚?⑸땲??</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">쨌</span><span className="min-w-0">?먰솕 寃곗젣???댁슜沅뚯? ?좊즺 湲곕뒫 ?댁슜 ??寃곗젣?쇰줈遺??7???대궡 ?섎텋 ?붿껌??媛?ν빀?덈떎.</span></li>
            <li className="flex items-start gap-1.5 font-bold text-rose-600"><span className="mt-0.5 flex-shrink-0">쨌</span><span className="min-w-0"><strong>?붿젙???먮뒗 ?먰솕濡??щ뒗 30???댁슜沅?/strong>?대ŉ, 寃곗젣 ???섎텋 洹쒖젙 ?숈쓽媛 ?꾩슂?⑸땲??</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">쨌</span><span className="min-w-0">肄섑뀗痢??앹꽦, PDF ?뚮뜑留? ?좊즺 由щ뵫 ?대엺, ?댁슜沅??쒗깮 ?ъ슜???쒖옉??遺遺꾩? ?섎텋???쒗븳?????덉뒿?덈떎.</span></li>
          </ul>
        </div>

        {highlightedPlan && (
          <div className="mb-4 rounded-[14px] border border-rose-300 bg-rose-50/70 px-4 py-3">
            <p className="text-[11.5px] font-extrabold text-rose-800">?렞 硫붿씤 ?붾㈃?먯꽌 ?좏깮???뚮옖?쇰줈 ?덈궡 以?/p>
            <p className="mt-1 text-[11.5px] text-rose-700">
              ?좏깮 ?뚮옖: <strong>{highlightedPlan === "standard" ? "?ㅽ깲?ㅻ뱶 ?щ튆 ?댁슜沅? : highlightedPlan === "premium" ? "?꾨━誘몄뾼 ?щ튆 ?댁슜沅? : highlightedPlan === "family" ? "Code Destiny Family" : "VVIP ?щ튆 ?댁슜沅?}</strong>
            </p>
          </div>
        )}

      </div>

      {/* ?????????????????????????????????????????????????? */}
      {/* 臾대즺 ?뚮옖 ?덈궡 + ?댁슜沅???                         */}
      {/* ?????????????????????????????????????????????????? */}
      {(!subscription.isActive || subscription.tier === "free") && (
      <div className="mx-5 mb-5 rounded-[20px] border border-[#cab8ff]/24 bg-[#0b1028]/92 p-4 shadow-[0_14px_32px_rgba(7,10,28,0.34)]">
        {/* ?쒕ぉ ??*/}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl leading-none">?넃</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11.5px] font-black uppercase tracking-widest text-slate-300">Free Plan</p>
            <p className="text-[15px] font-black text-white leading-tight">臾대즺 ?뚮옖</p>
          </div>
          {subscription.tier === "free" && (
            <span className="flex-shrink-0 rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-bold text-neutral-600">?꾩옱 ?뚮옖</span>
          )}
        </div>

        {/* 臾대즺 ?쒓났 ??ぉ */}
        <div className="mb-3 rounded-[14px] border border-emerald-300/30 bg-emerald-300/10 px-3.5 py-3">
          <p className="mb-2 text-[12px] font-extrabold text-emerald-100">??臾대즺濡?吏湲?諛붾줈 利먭만 ???덉뼱??/p>
          <ul className="space-y-1.5">
            {[
              { icon: "?截?, text: "?쇱씪 ?댁꽭 쨌 ?ㅻ뒛/?대떖 ?댁꽭 ?ㅼ썙??, sub: "留ㅼ씪 媛깆떊, 臾댁젣??臾대즺" },
              { icon: "?깗", text: "?됰났???뚮났 ?濡?, sub: "?먮쭅 ?濡????쒗븳 ?놁씠 臾대즺" },
              { icon: "??, text: "?곗씪由??먯닠 5醫?, sub: "?뷀닾?먃룸뜲?ㅽ떚???ъ빱쨌?쇱? 二쇱꽍?먃룹쁺援??띿감?먃룹뿭寃?二쇱뿭" },
              { icon: "?뱤", text: "湲곕낯 ?ъ＜ 留뚯꽭??, sub: "?걔룹썡쨌?셋룹떆 紐낆떇??+ ?쇱＜ 罹먮┃???붿빟" },
              { icon: "?렚", text: "?щ? 留쏅낫湲?肄섑뀗痢?, sub: "MBTI ?숇Ъ 沅곹빀쨌?ъ＜ AI ?댁긽?빧룹궗二쇰꽕而??? },
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

        {/* ?좉릿 肄섑뀗痢????댁슜沅???*/}
        <div className="mb-3 rounded-[14px] border border-white/18 bg-white/[0.09] px-3.5 py-3">
          <p className="mb-2 text-[12px] font-extrabold text-slate-100">?뵏 ?댁슜沅??좏깮 ???좉툑???댁젣?쇱슂</p>
          <ul className="space-y-1.5">
            {[
              "?곸꽭 ?ъ＜ 遺꾩꽍 ???곗븷쨌?щЪ쨌吏곸뾽쨌嫄닿컯 ?ъ링 由ы룷??,
              "??怨꾩젙?쇰줈 理쒕? 15媛??꾨줈???숈떆 愿由?(媛議굿룹뿰?맞룹옄? ?ы븿)",
              "?꾨━誘몄뾼 ?濡?쨌 ?댁쭛???ㅻ씪??쨌 ?ㅽ넠?⑥? 猷???,
              "RPG ?대챸 罹먮┃??쨌 ?ы뻾 ?대챸吏 쨌 嫄닿컯 蹂닿퀬??,
              "媛議굿룹뿰?????ㅺ퀎???꾨줈???숈떆 遺꾩꽍",
            ].map((text) => (
              <li key={text} className="flex items-start gap-2 opacity-60 blur-[0.3px]">
                <span className="flex-shrink-0 text-[11px] text-neutral-400 mt-0.5">?뵏</span>
                <span className="text-[12.5px] text-slate-300 line-through decoration-slate-500">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 留덉?????CTA 釉붾줉 */}
        <div className="rounded-[14px] border border-[#f3dd9a]/40 bg-[#f3dd9a]/10 px-4 py-3.5">
          <p className="mb-2 text-[13.5px] font-black leading-snug text-[#ffe8a3]">
            留쏅낫湲곕쭔?쇰줈?????뺣룄?몃뜲,<br />
            <span className="text-white">30???댁슜沅뚯쑝濡??쇰쭏??源딆씠 蹂????덉쓣源뚯슂?</span> ?뙔
          </p>
          <p className="mb-3 text-[12.5px] leading-6 text-slate-100">
            ?ㅻ뒛 ?댁꽭媛 留덉쓬??嫄몃졇?ㅻ㈃, 洹멸굔 ?뱀떊??吏곴컧??留욌뒗 嫄곗삁??
            <br />Honey ?댁슜沅??섎굹濡?<strong>?ъ＜쨌?濡쑣룹젏?깆닠??吏꾩쭨 源딆씠</strong>瑜?寃쏀뿕??蹂댁꽭??
            媛議깃낵 ?곗씤???대챸源뚯?, <strong>30???숈븞 紐⑤뱺 ?꾨줈??/strong>???쒗깮???곸슜?⑸땲??
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10.5px] font-bold text-rose-700">
              ??寃곗젣 利됱떆 ?쒗깮 ?쒖꽦??
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[10.5px] font-bold text-sky-700">
              ?뫅?랅윉⒱랅윉?理쒕? 15 ?꾨줈???쒗깮 ?곸슜
            </span>
          </div>
        </div>
      </div>
      )}

      {/* ?뚮옖 移대뱶 */}
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
              {/* 諭껋? */}
              {plan.badge && !isCurrentActive && (
                <span className={`absolute top-3 right-3 rounded-full bg-gradient-to-r ${theme.badge} px-2 py-0.5 text-[11px] font-black text-[#151832] shadow`}>
                  {plan.tier === "vvip" ? `?몣 ${copy.planBadges.vvip}` : `??${copy.planBadges[plan.badge] || plan.badge}`}
                </span>
              )}
              {isCurrentActive && (
                <span className="absolute top-3 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-black text-white shadow">
                  ??{copy.activePassLabel}
                </span>
              )}

              {/* ?뚮옖 ?꾩씠肄?& ?대쫫 */}
              <p className="text-xl leading-none">{theme.icon}</p>
              <p className={`mt-2 text-[12px] font-black uppercase tracking-wider ${theme.label}`}>{copy.planTitles[plan.tier]}</p>

              {/* 媛寃?*/}
              <p className="mt-2 flex flex-wrap items-center gap-1 text-[17px] font-black leading-snug text-white">
                <CoinIcon size="md" />
                {formatSubscriptionPlanValueLine(plan, copy, formatLocale)}
              </p>
              <p className="mt-1 text-[12.5px] font-semibold text-slate-200">
                {copy.duration30} 쨌 {formatWon(plan.wonPrice, copy, formatLocale)}
              </p>

              {/* 而ㅽ뵾 ????諭껋? ??freeUpTo 50 ?댄븯 ?뚮옖(?ㅽ깲?ㅻ뱶)?먮쭔 */}
              {plan.freeUpTo !== null && plan.freeUpTo <= 50 && plan.tier === "standard" && plan.durationMonths === 1 && (
                <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#f3dd9a]/22 px-2.5 py-1 text-[12px] font-bold text-[#ffe8a3]">
                  ??{copy.coffeeBadge}
                </div>
              )}

              {/* 臾대즺 ?댁슜 踰붿쐞 ?쒓렇 */}
              <div className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${theme.freeTag}`}>
                ?넃{" "}
                {formatSubscriptionPlanPolicy(plan, copy, formatLocale)}
              </div>

              {/* 湲곕뒫 紐⑸줉 */}
              <ul className="mt-3 flex-1 space-y-1.5">
                {plan.features.map((f) => {
                  const translatedFeature = copy.planFeatures[plan.tier]?.[f] || f;
                  const isBonus = f.startsWith("bonus");
                  const isKey = ["under3000", "under5000", "under10000", "allPaidPdf", "familyIncluded"].includes(f);
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
                          {isKey ? "?? : "쨌"}
                        </span>
                      )}
                      {translatedFeature}
                    </li>
                  );
                })}
              </ul>

              {/* CTA 踰꾪듉 */}
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
            <span aria-hidden="true">?㎛</span>
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
        <p className="text-[12.5px] font-semibold text-[#ffe8a3]">??{copy.activePassFooter}</p>
        <p className="text-[12.5px] font-bold text-rose-100">{copy.activePassAutoRenewWarning}</p>
      </div>
    </section>
  );
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ?쒕툕 而댄룷?뚰듃: Toast ?뚮┝ 而⑦뀒?대꼫
   ?붾㈃ ?곷떒 以묒븰???뚮┝???볦븘 ?쒖떆?섎ŉ 5珥????먮룞 ?ロ옓?덈떎.
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */

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
          {/* ?꾩씠肄?*/}
          <span className="mt-0.5 flex-shrink-0 text-base">
            {toast.type === "success" ? "?? : toast.type === "error" ? "?좑툘" : "?뱄툘"}
          </span>
          {/* 硫붿떆吏 */}
          <span className="flex-1 leading-snug">{toast.text}</span>
          {/* ?섎룞 ?リ린 踰꾪듉 */}
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="flex-shrink-0 text-base opacity-50 hover:opacity-90 transition-opacity"
            aria-label={closeLabel}
          >
            ??
          </button>
        </div>
      ))}
    </div>
  );
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   ?쒕툕 而댄룷?뚰듃: 肄섑뀗痢?湲곗? ?꾩씠肄?
   ?첌 ?대え吏 ?뚮뜑留?遺덉븞??臾몄젣瑜??닿껐?⑸땲??
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */

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
      ??
    </span>
  );
}

function MonthlyCreditBonusCard({
  balance,
  ledgers,
  copy,
  formatLocale,
}: {
  balance: number;
  ledgers: MonthlyCreditLedgerItem[];
  copy: PointsPageCopy;
  formatLocale: string;
}) {
  return (
    <section
      aria-label={copy.monthlyBonusAria}
      className="rounded-[24px] border border-[#cab8ff]/36 bg-[#0b1028]/92 p-5 text-slate-50 shadow-[0_18px_46px_rgba(7,10,28,0.36)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ded4ff]">蹂대꼫???붿젙??/p>
          <h3 className="mt-1 text-lg font-black text-white">?붿젙???붾웾</h3>
          <p className="mt-1 text-sm text-slate-200">
            ?붿젙?앹? ?щ튆 ?댁슜沅뚭낵 ?대깽?몃줈 吏湲됰릺??蹂대꼫???쒗깮?대ŉ, ?붿젙???먯껜??蹂꾨룄濡?援щℓ?섍굅??異⑹쟾?????놁뒿?덈떎.
          </p>
        </div>
        <div className="rounded-[18px] border border-[#f3dd9a]/48 bg-[#f3dd9a]/18 px-4 py-3 text-left sm:text-right">
          <p className="text-xs font-bold text-[#ffe8a3]">?꾩옱 ?ъ슜 媛??/p>
          <p className="mt-1 text-2xl font-black text-white">{formatMonthlyCreditValue(balance, copy, formatLocale)}</p>
          <p className="mt-1 text-[11px] font-bold text-rose-100">援щℓ쨌異⑹쟾 遺덇?</p>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-white/16 bg-[#050817]/72 p-3.5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-white">?붿젙???ъ슜 ?댁뿭</h4>
          <span className="text-[11px] font-semibold text-slate-300">理쒓렐 {Math.min(ledgers.length, 8)}嫄?/span>
        </div>
        {ledgers.length === 0 ? (
          <p className="text-sm text-slate-300">?꾩쭅 ?붿젙???ъ슜 ?댁뿭???놁뒿?덈떎.</p>
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
                      {formatDateTime(entry.createdAt, formatLocale)} 쨌 {formatMonthlyCreditValue(Number(entry.afterBalance || 0), copy, formatLocale)}
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

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
  ?쒕툕 而댄룷?뚰듃: 肄섑뀗痢?媛移??⑥쐞 移대뱶
  肄섑뀗痢?湲곗?? 媛寃??곗젙???대? ?⑥쐞濡쒕쭔 ?덈궡?⑸땲??
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */

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
              ?뙔
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ded4ff]">
                ?곗씠???щ튆 ?댁슜沅??곸젏
              </p>
              <p className="mt-1 text-[17px] font-black leading-tight text-white">{name} ?섏쓽 ?щ튆 ?댁슜沅??곸젏</p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1 sm:items-end">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ffe8a3]">
              ?먰솕 寃곗젣 湲곗?
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[22px] font-black leading-none text-white">
                30???댁슜沅?
              </span>
            </div>
            <p className="max-w-[300px] text-[12.5px] leading-5 text-slate-100 sm:text-right">
              ?붿젙???먮뒗 ?먰솕濡??щ뒗 30???댁슜沅뚯씠硫? PDF? 怨좉? ?쒕퉬??議곌굔? ?곹뭹蹂??덈궡???곕쫭?덈떎.
            </p>
            <p className="max-w-[300px] text-[12.5px] font-bold leading-5 text-[#ffe8a3] sm:text-right">
              ?붿젙?앹? 蹂대꼫???쒗깮?쇰줈留?吏湲됰릺硫??붿젙???먯껜??援щℓ쨌異⑹쟾?????놁뒿?덈떎.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
  ?쒕툕 而댄룷?뚰듃: ?먰솕 寃곗젣 ?곹뭹 移대뱶
  ?대┃ ??寃곗젣 諛⑸쾿 紐⑤떖濡??대룞?⑸땲??
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */

const MOONLIGHT_TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "?댁슜沅??놁쓬",
  standard: "Standard ?щ튆 30??,
  premium: "Premium ?щ튆 30??,
  vvip: "VVIP ?щ튆 30??,
  family: "Code Destiny Family 30??,
};

function getMoonlightDaysLeft(expiresAt: string | null | undefined) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  if (!Number.isFinite(date.getTime())) return null;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

function getMoonlightExpiryLabel(expiresAt: string | null | undefined, formatLocale: string) {
  if (!expiresAt) return "留뚮즺???뺣낫 ?놁쓬";
  const date = new Date(expiresAt);
  if (!Number.isFinite(date.getTime())) return "留뚮즺???뺣낫 ?놁쓬";
  return date.toLocaleDateString(formatLocale, { year: "numeric", month: "long", day: "numeric" });
}

function getMoonlightProfileLabel(subscription: SubscriptionStatus) {
  const limit = subscription.profileLimit || getSubscriptionPolicyProfileLimit(subscription.tier);
  return limit <= 0 ? "?꾨줈??臾댁젣?? : `?꾨줈??理쒕? ${limit.toLocaleString("ko-KR")}媛?;
}

function getMoonlightBenefitLabel(tier: SubscriptionTier) {
  if (tier === "family") return "紐⑤뱺 ?좊즺 ?쒕퉬???댁슜 媛??;
  if (tier === "vvip") return "1留뚯썝 ?댄븯 ?좊즺 臾대즺";
  if (tier === "premium") return "5泥쒖썝 ?댄븯 ?좊즺 臾대즺";
  if (tier === "standard") return "3泥쒖썝 ?댄븯 ?좊즺 臾대즺";
  return "30???쒗깮 ?좏깮 媛??;
}

function getMoonlightPlanPhase(plan: SubscriptionPlan): MoonPhase {
  if (plan.tier === "family") return "full";
  if (plan.tier === "vvip") return "gibbous";
  if (plan.tier === "premium") return "half";
  return "crescent";
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
            <MoonIcon phase="gibbous" className="moon-shop-visual-moon" />
            <span className="moon-shop-visual-spark moon-shop-visual-spark--one" />
            <span className="moon-shop-visual-spark moon-shop-visual-spark--two" />
            <span className="moon-shop-visual-spark moon-shop-visual-spark--three" />
          </div>
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[color:var(--moon-silver)]">?곗씠???щ튆 ?댁슜沅??곸젏</p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">?곗씠???щ튆 ?댁슜沅??곸젏</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-[color:var(--moon-silver)] sm:text-base">
              ?щ튆 ?댁슜沅??곹뭹怨??먰솕 寃곗젣 議곌굔?????붾㈃?먯꽌 ?뺤씤?섏꽭??
            </p>
            <p className="mt-2 text-sm font-black leading-6 text-[color:var(--moon-gold)]">
              ?붿젙???먮뒗 ?먰솕 寃곗젣濡?30???쒗깮???????덉뒿?덈떎.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Link href="/" prefetch={false} className="btn-moonlight inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black">
            ???붾㈃ 諛붾줈媛湲?
          </Link>
          <Link href="/points/history" className="btn-moonlight inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black">
            ?댁슜沅?二쇰Ц ?댁뿭
          </Link>
          <Link href="/" prefetch={false} className="btn-moonlight-ghost inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black">
            ???쒕퉬???붾㈃?쇰줈
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
  const daysLeftLabel = daysLeft === null ? "?⑥? 湲곌컙 ?뺤씤 以? : `${daysLeft}???⑥쓬`;
  const progress = isActivePass ? Math.max(0, Math.min(1, (daysLeft ?? 0) / 30)) : 0;
  const expiryLabel = getMoonlightExpiryLabel(subscription.expiresAt, formatLocale);
  const title = MOONLIGHT_TIER_LABELS[tier];
  const benefits = [
    { icon: "?뫀", label: getMoonlightProfileLabel(subscription) },
    { icon: "??, label: getMoonlightBenefitLabel(tier) },
    { icon: "?뙔", label: "?붿젙?앹쑝濡쒕룄 援щℓ 媛?? },
    { icon: "?뿚截?, label: tier === "family" ? "紐⑤뱺 ?좊즺 ?쒕퉬???댁슜 媛?? : "?쒕룄 ???좊즺 由щ뵫 ?쒗깮" },
  ];

  return (
    <section className="moon-card moon-active-card rounded-[24px] p-5 sm:p-6" aria-label="?꾩옱 ?щ튆 ?댁슜沅?>
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(167,139,250,0.12)] shadow-[0_0_28px_rgba(167,139,250,0.32)]">
              <span className="text-2xl text-white" aria-hidden="true">??/span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--moon-mist)]">?섏쓽 ?щ튆 ?댁슜沅??쒗깮</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-white">{title}</h2>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-[color:var(--moon-teal)]">
                <span className="h-2 w-2 rounded-full bg-[color:var(--moon-teal)] shadow-[0_0_12px_rgba(94,234,212,0.76)]" aria-hidden="true" />
                {isActivePass ? `${title} ?댁슜 以?쨌 留뚮즺?쇨퉴吏 ?댁슜 媛?? : "?쒖꽦 ?댁슜沅뚯씠 ?놁뒿?덈떎"}
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
              <MoonIcon phase="progress" progress={progress} className="h-20 w-20 flex-shrink-0" title="?щ튆 ?댁슜沅??⑥? 湲곌컙" />
              <div>
                <p className="text-xs font-bold text-[color:var(--moon-mist)]">留뚮즺??/p>
                <p className="mt-1 text-base font-black text-white">{isActivePass ? expiryLabel : "?댁슜沅?援щℓ ???쒖떆?⑸땲??}</p>
              </div>
            </div>
            <p className="text-xl font-black text-[color:var(--moon-teal)]">{isActivePass ? daysLeftLabel : "0???⑥쓬"}</p>
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
            ?섎텋 ?붿껌 ?덈궡 蹂닿린 ??
          </a>
          {isActivePass ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onCancelSubscription(Boolean(subscription.cancelAtPeriodEnd))}
              className="btn-moonlight-ghost inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              ?댁슜沅??곹깭 ?뺤씤
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MoonlightMonthlyCreditCard({
  balance,
  ledgers,
  copy,
  formatLocale,
  isLoading,
  hasError,
  onRetry,
}: {
  balance: number;
  ledgers: MonthlyCreditLedgerItem[];
  copy: PointsPageCopy;
  formatLocale: string;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <section className="moon-card rounded-[24px] p-5 sm:p-6" aria-label={copy.monthlyBonusAria}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--moon-glow)]">蹂대꼫???붿젙??/p>
            <h2 className="mt-2 text-2xl font-black text-white">?붿젙?앹쓽 ?먮쫫??遺덈윭?ㅻ뒗 以묒씠?먯슂</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--moon-silver)]">
              ?щ튆 ?댁슜沅뚭낵 蹂대꼫???쒗깮??議곗슜???뺣룉?섍퀬 ?덉뼱??
            </p>
          </div>
          <div className="moonstone-counter flex min-h-[168px] min-w-[196px] flex-col items-center justify-center rounded-[22px] px-8 py-6 text-center">
            <p className="moon-loading-orb moonstone-counter__symbol text-4xl font-black">??/p>
            <p className="moonstone-counter__label mt-3 text-sm font-black text-white">?щ튆 ?뺤씤 以?/p>
            <p className="moonstone-counter__note mt-1 text-xs font-bold text-[color:var(--moon-gold)]">?좎떆留?湲곕떎??二쇱꽭??/p>
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
          <MoonIcon phase="crescent" className="h-14 w-14" title="?붿젙???뺣낫 ?湲? />
          <p className="mt-3 text-base font-black text-white">?붿젙?앹쓽 ?щ튆???좎떆 ?먮젮議뚯뼱??/p>
          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--moon-mist)]">
            ?붾웾怨??ъ슜 ?댁뿭? 怨??ㅼ떆 ?뺤씤?????덉뼱??
          </p>
          <button type="button" onClick={onRetry} className="btn-moonlight mt-5 inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-black">
            ?ㅼ떆 ?뺤씤?섍린
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="moon-card rounded-[24px] p-5 sm:p-6" aria-label={copy.monthlyBonusAria}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--moon-glow)]">蹂대꼫???붿젙??/p>
          <h2 className="mt-2 text-2xl font-black text-white">?붿젙?앹씠??</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--moon-silver)]">
            ?밸퀎???? 移댁뭅?ㅽ넚 怨듭쑀, ?댁쁺 ?대깽?몃? ?듯빐?쒕쭔 ?살쓣 ???덈뒗 蹂대꼫???ы솕?낅땲?? ?붿젙???먯껜??蹂꾨룄濡?援щℓ?섍굅??異⑹쟾?????놁뒿?덈떎.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["?밸퀎????, "移댁뭅?ㅽ넚 怨듭쑀", "?댁쁺 ?대깽??].map((source) => (
              <span key={source} className="moonstone-source-pill rounded-full px-3 py-1 text-xs font-black">
                ??{source}
              </span>
            ))}
          </div>
        </div>
        <div className="moonstone-counter flex min-h-[178px] min-w-[206px] flex-col items-center justify-center rounded-[24px] px-8 py-6 text-center">
          <p className="moonstone-counter__symbol text-base font-black">??/p>
          <p className="moonstone-counter__value mt-1 text-5xl font-black leading-none">{Math.max(0, Math.floor(Number(balance || 0))).toLocaleString(formatLocale)}</p>
          <p className="moonstone-counter__label mt-3 text-sm font-black text-white">?꾩옱 ?ъ슜 媛??/p>
          <p className="moonstone-counter__note mt-1 text-xs font-bold text-[color:var(--moon-gold)]">?대깽???꾩슜 ?ы솕</p>
        </div>
      </div>

      <div className="mt-6 border-t border-[color:var(--moon-rim)] pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-black text-white">?붿젙???ъ슜 ?댁뿭</h3>
          <span className="text-xs font-bold text-[color:var(--moon-mist)]">理쒓렐 {Math.min(ledgers.length, 8)}嫄?/span>
        </div>
        {ledgers.length === 0 ? (
          <div className="moon-empty flex flex-col items-center rounded-[18px] px-4 py-8 text-center">
            <MoonIcon phase="crescent" className="h-14 w-14" title="?붿젙???ъ슜 ?댁뿭 ?놁쓬" />
            <p className="mt-3 text-base font-black text-white">?꾩쭅 ?щ튆???먮Ⅴ吏 ?딆븯?댁슂</p>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--moon-mist)]">
              ?щ튆 ?댁슜沅뚯쓣 援щℓ?섎㈃ 蹂대꼫???붿젙?앹쓣 諛쏆쓣 ???덉뼱??
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
                      {formatDateTime(entry.createdAt, formatLocale)} 쨌 {formatMonthlyCreditValue(Number(entry.afterBalance || 0), copy, formatLocale)}
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
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--moon-glow)]">?댁슜沅??곹뭹</p>
          <h2 className="mt-2 text-2xl font-black text-white">?먮ℓ 以묒씤 ?щ튆 ?댁슜沅?/h2>
        </div>
        {subscription.isActive && subscription.tier !== "free" ? (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onCancelSubscription(Boolean(subscription.cancelAtPeriodEnd))}
            className="btn-moonlight-ghost inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            ?댁슜沅??곹깭 ?뺤씤
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
                      <span className="rounded-full bg-[rgba(94,234,212,0.16)] px-2.5 py-1 text-xs font-black text-[color:var(--moon-teal)]">?꾩옱 ?댁슜 以?/span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-bold text-[color:var(--moon-mist)]">?붿젙???먮뒗 ?먰솕濡?援щℓ?섎뒗 30???댁슜沅?/p>
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
                    {isCurrentActive ? "?곗옣?섍린 ?? : lowerTierBlocked ? copy.lowerTierBlocked : "援щℓ?섍린 ??}
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
  onRetry,
}: {
  payments: PaymentHistoryItem[];
  cancelingPaymentId: string | null;
  requestCancelPayment: (payment: PaymentHistoryItem) => void;
  copy: PointsPageCopy;
  formatLocale: string;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <section className="moon-card rounded-[24px] p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-black text-white">理쒓렐 二쇰Ц ?댁뿭</h2>
          <span className="text-xs font-bold text-[color:var(--moon-mist)]">?щ튆 二쇰Ц 湲곕줉 ?뺤씤 以?/span>
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
          <MoonIcon phase="outline" className="h-14 w-14" title="?댁슜沅?二쇰Ц ?댁뿭 ?湲? />
          <p className="mt-3 text-base font-black text-white">二쇰Ц ?댁뿭???щ튆???좎떆 媛?ㅼ죱?댁슂</p>
          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--moon-mist)]">
            寃곗젣 湲곕뒫? 洹몃?濡??좎??섎ŉ, ?댁뿭? ?좎떆 ???ㅼ떆 ?뺤씤?????덉뼱??
          </p>
          <button type="button" onClick={onRetry} className="btn-moonlight mt-5 inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-black">
            ?ㅼ떆 ?뺤씤?섍린
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="moon-card rounded-[24px] p-5 sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black text-white">理쒓렐 二쇰Ц ?댁뿭</h2>
        <span className="text-xs font-bold text-[color:var(--moon-mist)]">二쇰Ц?쒓컖 / 寃곗젣?쒓컖 / ?뱀씤踰덊샇 / ?곸닔利?/span>
      </div>
      {payments.length === 0 ? (
        <div className="moon-empty flex flex-col items-center rounded-[18px] px-4 py-8 text-center">
          <MoonIcon phase="outline" className="h-14 w-14" title="?댁슜沅?二쇰Ц ?댁뿭 ?놁쓬" />
          <p className="mt-3 text-base font-black text-white">泥?踰덉㎏ ?щ튆 ?댁슜沅뚯쓣 援щℓ?대낫?몄슂</p>
          <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-[color:var(--moon-mist)]">
            ?댁슜沅?二쇰Ц ?댁뿭???닿납??李⑤텇???볦엯?덈떎.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const statusMeta = mapPaymentStatusLabel(payment.status, copy);
            const canCancel = payment.status === "success";
            return (
              <div key={payment.id} className="rounded-[18px] border border-[color:var(--moon-rim)] bg-[rgba(21,24,64,0.78)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-black text-white">{formatWon(payment.paymentAmount, copy, formatLocale)}</p>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusMeta.cls}`}>{statusMeta.label}</span>
                </div>
                <div className="mt-3 grid gap-1 text-xs font-semibold text-[color:var(--moon-mist)] sm:grid-cols-2">
                  <p>二쇰Ц?쒓컖: {formatDateTime(payment.createdAt || payment.updatedAt, formatLocale)}</p>
                  <p>寃곗젣?쒓컖: {formatPaymentTimeLabel(payment, copy, formatLocale)}</p>
                  <p>理쒓렐蹂寃? {formatDateTime(payment.updatedAt || payment.paidAt || payment.createdAt, formatLocale)}</p>
                  <p>寃곗젣?섎떒: {formatPaymentMethodLabel(payment, copy)}</p>
                  <p>?뱀씤踰덊샇: {payment.approvalNumber || "-"}</p>
                  <p>二쇰Ц踰덊샇: {payment.merchantUid || "-"}</p>
                  <p>寃곗젣ID: {payment.impUid || "-"}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {payment.receiptUrl ? (
                    <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="btn-moonlight-ghost inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-black">
                      ?곸닔利?蹂닿린
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-[color:var(--moon-mist)]">?곸닔利?URL 誘몄젣怨?/span>
                  )}
                  <button
                    type="button"
                    disabled={!canCancel || cancelingPaymentId === payment.id}
                    onClick={() => requestCancelPayment(payment)}
                    className="inline-flex min-h-9 items-center rounded-lg border border-rose-300/45 bg-rose-400/10 px-3 text-xs font-black text-rose-100 transition-colors hover:bg-rose-400/16 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cancelingPaymentId === payment.id ? "痍⑥냼 泥섎━ 以?.." : "寃곗젣 痍⑥냼 ?붿껌"}
                  </button>
                </div>
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
      媛??댁슜沅뚯? ?뺥빐吏?湲덉븸 踰붿쐞???좊즺 由щ뵫??30???숈븞 ?댁뼱 以띾땲?? Family??紐⑤뱺 ?좊즺 ?쒕퉬?ㅻ? ?댁슜?????덇퀬, ?붿젙?앹쑝濡쒕룄 ?댁슜沅?援щℓ媛 媛?ν빀?덈떎.
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
      {/* BEST 諭껋? */}
      {isBest && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#cab8ff] to-[#f3dd9a] px-2.5 py-1 text-[11px] font-black text-[#151832] shadow-[0_4px_12px_rgba(202,184,255,0.32)]">
          異붿쿇 寃곗젣 湲곗?
        </span>
      )}

      {/* ?곷떒 ?? ?곹뭹紐?+ 肄섑뀗痢?湲곗? 媛寃?*/}
      <div className={`flex items-center justify-between gap-2 ${isBest ? "pr-[90px]" : ""}`}>
        <span className="text-[15px] font-bold text-white">{pkg.title}</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[15px] font-black text-[#f3dd9a]">
          <CoinIcon size="md" />
          肄섑뀗痢?湲곗? {pkg.points.toLocaleString("ko-KR")}
        </span>
      </div>
      <p className="mt-1 text-[11.5px] font-semibold text-slate-200">{pkg.description}</p>

      {/* ?섎떒 ?? ?먰솕 湲덉븸 + ?뺤콉 */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#7A5230]">
          <span className="text-[11px] text-slate-400 line-through">{formatWon(listPrice)}</span>
          {formatWon(pkg.amount)}
        </span>
        <span className="text-sm font-bold text-[#f3dd9a]">
          {discountRate}% ?좎씤
        </span>
      </div>
      <span className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#cab8ff] to-[#f3dd9a] px-2.5 py-1 text-[12px] font-black text-[#151832] shadow-[0_3px_10px_rgba(202,184,255,0.24)]">
        ?먰솕 寃곗젣
      </span>

      {/* ?좏깮 泥댄겕留덊겕 */}
      {selected && (
        <span className="absolute bottom-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-[0_2px_8px_rgba(180,130,0,0.4)]">
          ??
        </span>
      )}
    </button>
  );
}

/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧
   硫붿씤 ?섏씠吏 而댄룷?뚰듃: PointsPage
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */

export default function PointsPage() {
  const router = useRouter();

  /** 紐⑤컮??由щ뵒?됱뀡 蹂듦?瑜???踰덈쭔 泥섎━?섍린 ?꾪븳 ?뚮옒洹?*/
  const redirectHandledRef = useRef(false);
  const paymentActionLockRef = useRef<{ key: string; startedAt: number } | null>(null);
  const confirmPaymentInFlightRef = useRef(new Map<string, Promise<ConfirmResponse>>());
  const confirmSubscriptionInFlightRef = useRef(new Map<string, Promise<ConfirmSubscriptionResponse>>());
  const fetchMyPointStateInFlightRef = useRef<Promise<void> | null>(null);
  const fetchSubscriptionStatusInFlightRef = useRef<Promise<void> | null>(null);
  /** Toast ID 利앷???移댁슫??*/
  const toastCounter = useRef(0);

  /* ?? API 湲곕낯 URL ??????????????????????????????????????????????? */
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const turnstileSiteKey = String(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SITE_KEY || process.env.Turnstile_Site_Key || "",
  ).trim();
  const [lang, setLang] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = POINTS_PAGE_COPY[lang] || POINTS_PAGE_COPY.ko;
  const formatLocale = FORMAT_LOCALE_BY_LANG[lang] || FORMAT_LOCALE_BY_LANG.ko;

  /* ?? ?곹깭 ???????????????????????????????????????????????????????? */
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
  } = usePaymentProcessing();
  const [showStarBurst, setShowStarBurst] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [monthlyStoneBalance, setMonthlyStoneBalance] = useState(0);
  const [monthlyCreditLedgers, setMonthlyCreditLedgers] = useState<MonthlyCreditLedgerItem[]>([]);
  const [pointStateStatus, setPointStateStatus] = useState<PointStateStatus>("idle");
  const [pointStateError, setPointStateError] = useState<string | null>(null);
  const [cancelingPaymentId, setCancelingPaymentId] = useState<string | null>(null);
  const [landingPlanPreset, setLandingPlanPreset] = useState<"standard" | "premium" | "vvip" | "family" | null>(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [pendingSubscriptionPaymentPlan, setPendingSubscriptionPaymentPlan] = useState<SubscriptionPlan | null>(null);
  const [isSubscriptionRefundAgreed, setIsSubscriptionRefundAgreed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    tier:         "free",
    isActive:     false,
    expiresAt:    null,
    profileLimit: 1,
    cancelAtPeriodEnd: false,
    cancelRequestedAt: null,
    freeLimit: 0,
  });

  /** Toast ?뚮┝ 紐⑸줉 */
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

  useEffect(() => {
    setIsSubscriptionRefundAgreed(false);
  }, [pendingSubscriptionPaymentPlan?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const raw = String(query.get("plan") || "").toLowerCase();
    if (raw === "standard" || raw === "premium" || raw === "vvip" || raw === "family") {
      setLandingPlanPreset(raw);
    }
  }, []);

  /* ?? Toast ?ы띁 ????????????????????????????????????????????????? */

  /** ??Toast瑜?異붽??섍퀬 5珥????먮룞 ?쒓굅?⑸땲?? */
  const pushToast = useCallback((type: ToastItem["type"], text: string) => {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  /** ?뱀젙 Toast瑜??섎룞?쇰줈 ?レ뒿?덈떎. */
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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

  const closeProcessingOverlayBeforeExternalCheckout = useCallback(async () => {
    setIsProcessing(false);
    hideProcessingOverlay();
    await new Promise<void>((resolve) => {
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        resolve();
        return;
      }
      window.requestAnimationFrame(() => resolve());
    });
  }, [hideProcessingOverlay]);

  const buildPassAppliedMessage = useCallback((tier?: unknown) => {
    const label = getSubscriptionTierLabel(tier || subscription.tier);
    const passLabel = label === "?댁슜沅? ? "?댁슜沅? : `${label} ?댁슜沅?;
    return `${passLabel} ?쒗깮???곸슜?섏뿀?듬땲??\n寃곌낵瑜?遺덈윭?ㅻ뒗 以묒씠?먯슂`;
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

  /** ?댁슜沅??깃났 ??legacy destiny-profile.js媛 ?쎈뒗 localStorage 罹먯떆瑜?媛깆떊?⑸땲?? */
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

  /* ?? ?쒕쾭?먯꽌 二쇰Ц/?댁슜沅??곹깭 議고쉶 ??????????????????????????????? */
  const fetchMyPointState = useCallback(
    async () => {
      if (fetchMyPointStateInFlightRef.current) {
        return fetchMyPointStateInFlightRef.current;
      }
      const requestPromise = (async () => {
      const response = await authFetch(`${apiBase}/api/payments/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }, {
        retryOn401: true,
        apiBase,
      });
      if (response.status === 401 || response.status === 403) {
        clearClientAuthState();
        router.replace("/login?next=%2Fpoints");
        return;
      }

      // Content-Type 寃利???JSON ?뚯떛 ??HTML ?먮윭 ?섏씠吏 諛⑹뼱
      const payload = await safeParseJson<MeResponse>(response);
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
        throw new Error(payload.message || "寃곗젣 諛??댁슜沅??뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??");
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
      setPaymentHistory(normalizedPayments);
      setMonthlyStoneBalance(normalized.monthlyStoneBalance);
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
    [apiBase, persistSubscriptionCache, router],
  );

  const syncSubscriptionAppliedStage = useCallback(async (tier?: unknown) => {
    const label = getSubscriptionTierLabel(tier || subscription.tier);
    const passLabel = label === "?댁슜沅? ? "?댁슜沅? : `${label} ?댁슜沅?;
    setProcessingStage(`${passLabel}???뺤씤?덉뼱??n寃곌낵瑜?遺덈윭?ㅻ뒗 以묒씠?먯슂`, "pass-applied");
    await Promise.allSettled([
      fetchMyPointState(),
    ]);
    await showPassAppliedStage(undefined, tier);
  }, [fetchMyPointState, setProcessingStage, showPassAppliedStage, subscription.tier]);

  /* ?? 珥덇린 ?몄쬆 ?좏겙 ?뺤씤 ????????????????????????????????????????? */
  useEffect(() => {
    const parsedUser = readSanitizedAuthUser() as AuthUser | null;

    if (parsedUser) {
      setAuthUser(parsedUser);
      const cachedSubscription = normalizeSubscriptionStatusFromPayload(parsedUser.profileSubscription);
      if (cachedSubscription?.isActive) {
        setSubscription((prev) => mergeSubscriptionState(prev, cachedSubscription));
      }
    }

    setIsBooting(false);
  }, [router]);

  /* ?? 遺????寃곗젣/二쇰Ц ?뺣낫 濡쒕뱶 ??????????????????????????????? */
  useEffect(() => {
    if (isBooting) return;

    setPointStateStatus("loading");
    setPointStateError(null);
    fetchMyPointState().then(() => {
      setPointStateStatus("ready");
    }).catch((error) => {
      setPointStateStatus("error");
      setPointStateError(getErrorMessage(error, "?댁슜沅??곸젏 ?뺣낫瑜??좎떆 遺덈윭?ㅼ? 紐삵뻽?듬땲??"));
      console.warn("[points-page] shop summary unavailable", error);
    });
  }, [fetchMyPointState, isBooting]);

  /* ?? ?댁슜沅??곹깭 濡쒕뱶 ??????????????????????????????????????????????? */
  useEffect(() => {
    if (isBooting) return;
    const pendingPass = readPendingSubscriptionPass();
    if (pendingPass && pendingPass.tier !== "free") {
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
    if (!isAdminSession) {
      const cachedSnapshot = readSubscriptionSnapshotForUser();
      if (cachedSnapshot) {
        const snapshotSubscription = normalizeSubscriptionStatusFromPayload({
          tier: cachedSnapshot.tier,
          isActive: cachedSnapshot.state === "active",
          expiresAt: cachedSnapshot.expiresAt,
          status: cachedSnapshot.state === "active" ? "active" : "inactive",
          source: cachedSnapshot.source,
        });
        if (snapshotSubscription) {
          setSubscription((prev) => mergeSubscriptionState(prev, snapshotSubscription));
        }
        return;
      }
    }
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

  /* ?? ?쒕쾭 寃곗젣 寃利??????????????????????????????????????????????? */
  const confirmPaymentWithServer = useCallback(
    async (params: {
      impUid: string;
      merchantUid?: string;
      paymentAmount?: number;
      chargePoints?: number;
      paymentType?: "digital_content";
      productId?: string;
      featureKey?: string;
      productName?: string;
      paymentMethod?: string;
    }) => {
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

      // Content-Type 寃利???JSON ?뚯떛
      const payload = await safeParseJson<ConfirmResponse & { message?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.message || "?쒕쾭 寃곗젣 寃利앹뿉 ?ㅽ뙣?덉뒿?덈떎.");
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
    async (body: {
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
      turnstileToken?: string;
    }) => {
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
          throw new Error(data.message || "Subscription payment confirm failed.");
        }
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
    [apiBase],
  );

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
        // ?ㅽ뙣 蹂닿퀬??蹂댁“ 寃쎈줈?대?濡?UI ?먮쫫??留됱? ?딅뒗??
      }
    },
    [apiBase],
  );

  /* ?? 寃곗젣 ?깃났 ??泥섎━ ??????????????????????????????????????????? */
  const handleConfirmSuccess = useCallback(
    async (result: ConfirmResponse, fromRedirect = false) => {
      pushToast(
        "success",
        fromRedirect
          ? "紐⑤컮??寃곗젣 蹂듦? ?뺤씤???꾨즺?섏뿀?듬땲?? 寃곗젣 ?댁뿭?먯꽌 ?곹뭹 ?댁슜???댁뼱媛????덉뼱??"
          : result.message || "寃곗젣媛 ?꾨즺?섏뿀?듬땲?? ?대떦 ?곹뭹 ?댁슜???댁뼱媛?몄슂.",
      );
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
      await fetchMyPointState();
    },
    [fetchMyPointState, pushToast],
  );

  const requestCancelPayment = useCallback(
    async (payment: PaymentHistoryItem) => {
      const ok = window.confirm(
        `${formatWon(payment.paymentAmount)} 寃곗젣瑜?痍⑥냼?좉퉴??\n?대? ?댁슜??肄섑뀗痢??먮뒗 ?댁슜沅??쒗깮???덉쑝硫?痍⑥냼媛 ?쒗븳?????덉뒿?덈떎.`,
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
            reason: "?ъ슜??痍⑥냼 ?붿껌",
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
          throw new Error(payload.message || "寃곗젣 痍⑥냼???ㅽ뙣?덉뒿?덈떎.");
        }

        await fetchMyPointState();
        pushToast("success", payload.message || "寃곗젣媛 痍⑥냼?섏뿀?듬땲??");
      } catch (error: unknown) {
        pushToast("error", getErrorMessage(error, "寃곗젣 痍⑥냼 泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."));
      } finally {
        setCancelingPaymentId(null);
      }
    },
    [apiBase, fetchMyPointState, pushToast],
  );

  /* ?? 紐⑤컮??寃곗젣 由щ뵒?됱뀡 蹂듦? 泥섎━ ????????????????????????????? */
  useEffect(() => {
    if (isBooting || redirectHandledRef.current) return;
    if (typeof window === "undefined") return;

    const query = new URLSearchParams(window.location.search);
    const redirectMarked = query.get("portone_redirect");
    const subscriptionRedirectMarked = query.get("portone_subscription_redirect");
    const impSuccess = String(query.get("imp_success") || query.get("code") || "").toLowerCase();
    const impUid = query.get("paymentId") || query.get("payment_id") || query.get("imp_uid");

    if (!impUid && impSuccess !== "false" && !redirectMarked && !subscriptionRedirectMarked) return;

    redirectHandledRef.current = true;

    const merchantUidFromQuery = query.get("paymentId") || query.get("payment_id") || query.get("merchant_uid") || undefined;
    const pending = readPendingOrder();
    const pendingSubscription = readPendingSubscriptionOrder();
    const isSubscriptionRedirect = !!subscriptionRedirectMarked;
    const redirectConfirmKey = `${isSubscriptionRedirect ? "subscription" : "point"}:${impUid || "missing"}:${merchantUidFromQuery || (isSubscriptionRedirect ? pendingSubscription?.merchantUid : pending?.merchantUid) || ""}`;

    if (!impUid || impSuccess === "false") {
      clearPendingOrder();
      clearPendingSubscriptionOrder();

      const failMessage = mapPaymentErrorMessage(
        query.get("error_msg") || query.get("errorMsg") || "寃곗젣媛 痍⑥냼?섏뿀?듬땲??",
      );

      reportPaymentFailureToServer({
        merchantUid: merchantUidFromQuery || (isSubscriptionRedirect ? pendingSubscription?.merchantUid : pending?.merchantUid),
        impUid: impUid || undefined,
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
        ? "30???댁슜沅뚯씠 ?쒖꽦?붾릺怨??덉뼱??n怨??댁슜 媛?ν빐?몄슂"
        : "寃곗젣媛 ?꾨즺?먯뼱??n寃곌낵瑜?遺덈윭?ㅻ뒗 以묒씠?먯슂",
      "payment-complete",
    );

    if (isSubscriptionRedirect) {
      const pendingSub = pendingSubscription;
      const merchantUid = merchantUidFromQuery || pendingSub?.merchantUid;

      if (!pendingSub || !merchantUid) {
        clearPendingSubscriptionOrder();
        pushToast("error", "?댁슜沅?寃곗젣 蹂듦? ?뺣낫瑜?李얠? 紐삵뻽?듬땲?? ?ㅼ떆 ?쒕룄??二쇱꽭??");
        if (window.location.search) {
          window.history.replaceState({}, "", window.location.pathname);
        }
        releasePaymentRedirectLock(redirectConfirmKey);
        setIsProcessing(false);
        return;
      }

      confirmSubscriptionWithServer({
          impUid,
          merchantUid,
          tier: pendingSub.tier,
          planId: pendingSub.planId,
          durationMonths: pendingSub.durationMonths || 1,
          productType: "membership_pass",
          customerUid: pendingSub.customerUid,
          paymentMethod: pendingSub.paymentMethod,
          durationDays: 30,
      })
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
          await syncSubscriptionAppliedStage(data.subscription?.tier || pendingSub.tier);
          pushToast("success", data.message || "?댁슜沅?寃곗젣媛 ?꾨즺?섏뼱 ?댁슜沅뚯씠 ?쒖꽦?붾릺?덉뒿?덈떎.");
          setShowStarBurst(true);
          setTimeout(() => setShowStarBurst(false), 1200);
          if (window.location.search) {
            window.history.replaceState({}, "", window.location.pathname);
          }
        })
        .catch((error) => {
          reportPaymentFailureToServer({
            merchantUid,
            impUid,
            reasonCode: "subscription_redirect_confirm_failed",
            reasonMessage: getErrorMessage(error, "紐⑤컮???댁슜沅?寃곗젣 寃利앹뿉 ?ㅽ뙣?덉뒿?덈떎."),
            paymentMethod: pendingSub.paymentMethod,
          });
          pushToast("error", getErrorMessage(error, "紐⑤컮???댁슜沅?寃곗젣 寃利앹뿉 ?ㅽ뙣?덉뒿?덈떎."));
          if (window.location.search) {
            window.history.replaceState({}, "", window.location.pathname);
          }
        })
        .finally(() => {
          releasePaymentRedirectLock(redirectConfirmKey);
          setIsProcessing(false);
        });

      return;
    }

    confirmPaymentWithServer({
      impUid,
      merchantUid: merchantUidFromQuery || pending?.merchantUid,
      paymentAmount: pending?.paymentAmount,
      chargePoints: pending?.chargePoints,
      paymentType: "digital_content",
      productId: pending?.productId,
      featureKey: pending?.featureKey,
      productName: pending?.productName,
      paymentMethod: pending?.paymentMethod,
    })
      .then(async (result) => {
        clearPendingOrder();
        await handleConfirmSuccess(result, true);
        if (window.location.search) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      })
      .catch((error) => {
        reportPaymentFailureToServer({
          merchantUid: merchantUidFromQuery || pending?.merchantUid,
          impUid,
          reasonCode: "redirect_confirm_failed",
          reasonMessage: getErrorMessage(error, "紐⑤컮??寃곗젣 蹂듦? 寃利앹뿉 ?ㅽ뙣?덉뒿?덈떎."),
          paymentMethod: pending?.paymentMethod,
        });
        pushToast("error", getErrorMessage(error, "紐⑤컮??寃곗젣 寃利앹뿉 ?ㅽ뙣?덉뒿?덈떎."));
        if (window.location.search) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      })
      .finally(() => {
        releasePaymentRedirectLock(redirectConfirmKey);
        setIsProcessing(false);
      });
  }, [
    apiBase,
    confirmPaymentWithServer,
    confirmSubscriptionWithServer,
    handleConfirmSuccess,
    isBooting,
    persistSubscriptionCache,
    pushToast,
    reportPaymentFailureToServer,
    setProcessingStage,
    syncSubscriptionAppliedStage,
  ]);

  /* ?? ?댁슜沅?寃곗젣 ?쒖옉 ????????????????????????????????????????????? */
  const startPayment = async () => {
    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    const actionLockKey = `point:${selectedPackage.id}:${selectedMethod}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    setIsProcessing(true);

    if (!turnstileSiteKey) {
      setTurnstileError("Turnstile ???ㅼ젙???꾩슂?⑸땲??");
      setIsProcessing(false);
      releasePaymentActionLock(actionLockKey);
      return;
    }

    if (!turnstileToken) {
      setTurnstileError("寃곗젣 ?쒖옉 ??Turnstile ?몄쬆???꾩슂?⑸땲??");
      setTurnstileResetSignal((value) => value + 1);
      setIsProcessing(false);
      releasePaymentActionLock(actionLockKey);
      return;
    }
    setProcessingStage("?붿븸???뺤씤?섎뒗 以묒씠?먯슂", "payment");

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
          turnstileToken,
        }),
      }, {
        retryOn401: true,
        apiBase,
      });

      // Content-Type 寃利???JSON ?뚯떛
      const preparePayload = await safeParseJson<PrepareOrderResponse & { message?: string }>(
        prepareResponse,
      );
      if (!prepareResponse.ok || !preparePayload.order) {
        throw new Error(preparePayload.message || "寃곗젣 以鍮꾩뿉 ?ㅽ뙣?덉뒿?덈떎.");
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

      await ensurePortoneSdk();

      if (!window.PortOne?.requestPayment) {
        throw new Error("?ы듃??V2 寃곗젣 SDK媛 珥덇린?붾릺吏 ?딆븯?듬땲??");
      }

      const paymentConfig = await fetchPortOnePaymentConfig(apiBase);
      setTurnstileToken("");
      setTurnstileResetSignal((value) => value + 1);

      const redirectUrl = new URL(PORTONE_MOBILE_REDIRECT_PATH, window.location.origin);
      redirectUrl.searchParams.set("portone_redirect", "1");

      const customerPhoneNumber = await ensurePaymentPhoneNumber(apiBase, authUser);
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

      setProcessingStage("?먰솕 寃곗젣 以鍮?以?n二쇰Ц ?뺣낫? ?몄쬆 ?먮쫫???뺤씤?섍퀬 ?덉뼱??, "checkout");
      await closeProcessingOverlayBeforeExternalCheckout();
      const rsp = await window.PortOne.requestPayment(requestData);
      const paymentId = String(rsp?.paymentId || order.merchantUid || "").trim();

      if (!rsp || rsp.code || !paymentId) {
        const message = mapPaymentErrorMessage(
          rsp?.message || rsp?.error_msg || rsp?.errorMsg || "寃곗젣媛 痍⑥냼?섏뿀?듬땲??",
        );
        reportPaymentFailureToServer({
          merchantUid: order.merchantUid,
          impUid: paymentId || undefined,
          reasonCode: "client_cancel_or_fail",
          reasonMessage: message,
          paymentMethod: selectedMethod,
        });
        pushToast("error", message);
        setIsProcessing(false);
        return;
      }

      try {
        setProcessingStage("寃곗젣媛 ?꾨즺?먯뼱??n寃곌낵瑜?遺덈윭?ㅻ뒗 以묒씠?먯슂", "payment-complete");
        setIsProcessing(true);
        const result = await confirmPaymentWithServer({
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
        clearPendingOrder();
        await handleConfirmSuccess(result);
        setIsMethodModalOpen(false);
      } catch (error: unknown) {
        reportPaymentFailureToServer({
          merchantUid: order.merchantUid,
          impUid: paymentId,
          reasonCode: "confirm_failed",
          reasonMessage: getErrorMessage(error, "寃곗젣 寃利앹뿉 ?ㅽ뙣?덉뒿?덈떎."),
          paymentMethod: selectedMethod,
        });
        pushToast("error", getErrorMessage(error, "寃곗젣 寃利앹뿉 ?ㅽ뙣?덉뒿?덈떎."));
      } finally {
        setIsProcessing(false);
      }
    } catch (error: unknown) {
      reportPaymentFailureToServer({
        reasonCode: "prepare_or_sdk_failed",
        reasonMessage: getErrorMessage(error, "寃곗젣瑜??쒖옉?섏? 紐삵뻽?듬땲??"),
        paymentMethod: selectedMethod,
      });
      setIsProcessing(false);
      pushToast("error", getErrorMessage(error, "寃곗젣瑜??쒖옉?섏? 紐삵뻽?듬땲??"));
    } finally {
      releasePaymentActionLock(actionLockKey);
    }
  };

  /* ?? 媛ㅻ윮?쒖븘 寃곗젣 ?깃났 ?몃뱾????????????????????????????????????? */
  const handleSubscribe = async (plan: SubscriptionPlan) => {
    const flowerAdminToken = getFlowerAdminTokenClient();
    const activeTierRank = subscription.isActive ? getSubscriptionTierRank(subscription.tier) : 0;
    const requestedTierRank = getSubscriptionTierRank(plan.tier);

    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    if (plan.durationMonths !== 1) {
      pushToast("error", "?꾩옱 ?좉퇋 ?먮ℓ ?댁슜沅뚯? 30?쇨텒留??좏깮?????덉뒿?덈떎.");
      return;
    }

    if (activeTierRank > requestedTierRank) {
      pushToast("info", "?꾩옱 ?곸쐞 ?곗뼱 ?댁슜沅뚯씠 ?쒖꽦?붾릺???섏쐞 ?뚮옖? ?좎껌?????놁뒿?덈떎.");
      return;
    }

    const actionLockKey = `subscription:${plan.planId}:${selectedMethod || "card_general"}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    if (!turnstileSiteKey) {
      setTurnstileError("Turnstile 키 설정이 필요합니다.");
      releasePaymentActionLock(actionLockKey);
      return;
    }

    if (!turnstileToken) {
      setTurnstileError("결제 시작 전 Turnstile 인증이 필요합니다.");
      setTurnstileResetSignal((value) => value + 1);
      releasePaymentActionLock(actionLockKey);
      return;
    }

    setPendingSubscriptionPaymentPlan(null);
    setProcessingStage("30???댁슜沅?寃곗젣 ?뺣낫瑜?以鍮꾪븯怨??덉뼱??, "checkout");
    setIsProcessing(true);

    try {
      const prepareRes = await authFetch(`${apiBase}/api/payments/subscription/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
          paymentMethod: selectedMethod || "card_general",
          turnstileToken,
        }),
      }, {
        retryOn401: true,
        apiBase,
      });

      if (prepareRes.status === 404 || prepareRes.status === 405 || prepareRes.status === 501) {
        pushToast("error", "?댁슜沅?寃곗젣 API瑜??뺤씤?????놁뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??");
        return;
      }

      const prepareData = await safeParseJson<PrepareSubscriptionOrderResponse>(prepareRes);
      if (!prepareRes.ok || !prepareData.order) {
        if (prepareRes.status === 409) {
          pushToast("error", prepareData.message || "?대? ?쒖꽦 ?댁슜沅뚯씠 ?덉뼱 以묐났 援щℓ瑜??좎껌?????놁뒿?덈떎.");
          return;
        }
        pushToast("error", prepareData.message || "?댁슜沅?寃곗젣 以鍮꾩뿉 ?ㅽ뙣?덉뒿?덈떎.");
        return;
      }

      await ensurePortoneSdk();
      if (!window.PortOne?.requestPayment) throw new Error("?ы듃??V2 寃곗젣 SDK媛 珥덇린?붾릺吏 ?딆븯?듬땲??");

      const order = prepareData.order;
      const paymentConfig = await fetchPortOnePaymentConfig(apiBase);

      const redirectUrl = new URL(PORTONE_MOBILE_REDIRECT_PATH, window.location.origin);
      redirectUrl.searchParams.set("portone_subscription_redirect", "1");

      const customerPhoneNumber = await ensurePaymentPhoneNumber(apiBase, authUser);
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

      await closeProcessingOverlayBeforeExternalCheckout();
      const rsp = await window.PortOne.requestPayment(requestData);
      const paymentId = String(rsp?.paymentId || order.merchantUid || "").trim();

      if (!rsp || rsp.code || !paymentId) {
        clearPendingSubscriptionOrder();
        const message = mapPaymentErrorMessage(
          rsp?.message || rsp?.error_msg || rsp?.errorMsg || "?댁슜沅?寃곗젣媛 痍⑥냼?섏뿀?듬땲??",
        );
        reportPaymentFailureToServer({
          merchantUid: order.merchantUid,
          impUid: paymentId || undefined,
          reasonCode: "subscription_client_cancel_or_fail",
          reasonMessage: message,
          paymentMethod: selectedMethod || "card_general",
        });
        pushToast("error", message);
        return;
      }

      try {
        setProcessingStage("30???댁슜沅?寃곗젣瑜??뺤씤?섍퀬 ?덉뼱??n?좎떆留?湲곕떎??二쇱꽭??, "subscription");
        setIsProcessing(true);
        const confirmData = await confirmSubscriptionWithServer({
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
        });

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
        await syncSubscriptionAppliedStage(confirmData.subscription?.tier || plan.tier);
        pushToast("success", confirmData.message || `${copy.planTitles[plan.tier]} ${copy.activePassLabel}`);
        setShowStarBurst(true);
        setTimeout(() => setShowStarBurst(false), 1200);
      } catch (error: unknown) {
        clearPendingSubscriptionOrder();
        reportPaymentFailureToServer({
          merchantUid: order.merchantUid,
          impUid: paymentId,
          reasonCode: "subscription_confirm_failed",
          reasonMessage: getErrorMessage(error, "?댁슜沅?寃곗젣 ?뺤씤???ㅽ뙣?덉뒿?덈떎."),
          paymentMethod: selectedMethod || "card_general",
        });
        pushToast("error", getErrorMessage(error, "?댁슜沅?寃곗젣 ?뺤씤???ㅽ뙣?덉뒿?덈떎."));
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, "?댁슜沅?泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.");
      clearPendingSubscriptionOrder();
      if (message.includes("SUBSCRIPTION_CONFLICT") || message.includes("以묐났 ?댁슜沅?) || message.includes("以묐났 援щℓ")) {
        pushToast("error", "?대? ?쒖꽦 ?댁슜沅뚯씠 ?덉뼱 以묐났 援щℓ瑜??좎껌?????놁뒿?덈떎.");
        return;
      }
      pushToast("error", message);
    } finally {
      releasePaymentActionLock(actionLockKey);
      setIsProcessing(false);
    }
  };

  const handleSubscribeWithMonthlyCredit = async (plan: SubscriptionPlan) => {
    const activeTierRank = subscription.isActive ? getSubscriptionTierRank(subscription.tier) : 0;
    const requestedTierRank = getSubscriptionTierRank(plan.tier);
    const requiredMonthlyCredits = calculateSubscriptionMonthlyCreditCost(plan);

    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    if (plan.durationMonths !== 1) {
      pushToast("error", "?꾩옱 ?좉퇋 ?먮ℓ ?댁슜沅뚯? 30?쇨텒留??좏깮?????덉뒿?덈떎.");
      return;
    }

    if (activeTierRank > requestedTierRank) {
      pushToast("info", "?꾩옱 ?곸쐞 ?곗뼱 ?댁슜沅뚯씠 ?쒖꽦?붾릺???섏쐞 ?뚮옖? ?좎껌?????놁뒿?덈떎.");
      return;
    }

    if (monthlyStoneBalance < requiredMonthlyCredits) {
      pushToast("error", `?붿젙???붾웾??遺議깊빀?덈떎. ?꾩슂 ${formatMonthlyCreditValue(requiredMonthlyCredits)}, ?꾩옱 ${formatMonthlyCreditValue(monthlyStoneBalance)}?낅땲??`);
      return;
    }

    const requestId = buildMonthlyCreditSubscriptionRequestId(plan);
    const actionLockKey = `subscription-monthly-credit:${plan.planId}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    if (!turnstileSiteKey) {
      setTurnstileError("Turnstile 키 설정이 필요합니다.");
      releasePaymentActionLock(actionLockKey);
      return;
    }

    if (!turnstileToken) {
      setTurnstileError("결제 시작 전 Turnstile 인증이 필요합니다.");
      setTurnstileResetSignal((value) => value + 1);
      releasePaymentActionLock(actionLockKey);
      return;
    }

    setIsProcessing(true);
    setPendingSubscriptionPaymentPlan(null);
    setProcessingStage("?붿젙?앹씠 源껊뱾怨??덉뼱??n怨??댁슜 媛?ν빐?몄슂", "payment-complete");
    setTurnstileToken("");
    setTurnstileResetSignal((value) => value + 1);

    try {
      const confirmData = await confirmSubscriptionWithServer({
        requestId,
        merchantUid: requestId,
        tier: plan.tier,
        planId: plan.planId,
        durationMonths: plan.durationMonths,
        durationDays: 30,
        amount: plan.wonPrice,
        currency: "KRW",
        productType: plan.productType,
        paymentMethod: "monthly_credit",
        turnstileToken,
      });

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

      await syncSubscriptionAppliedStage(confirmData.subscription?.tier || plan.tier);
      pushToast("success", confirmData.message || "?붿젙?앹씠 源껊뱾?덉뒿?덈떎.");
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
    } catch (error: unknown) {
      const message = getErrorMessage(error, "?붿젙?앹쓣 ?곸슜?섏? 紐삵뻽?듬땲??");
      if (message.includes("INSUFFICIENT_MONTHLY_CREDITS") || message.includes("遺議?)) {
        pushToast("error", `?붿젙???붾웾??遺議깊빀?덈떎. ?꾩슂 ${formatMonthlyCreditValue(requiredMonthlyCredits)}, ?꾩옱 ${formatMonthlyCreditValue(monthlyStoneBalance)}?낅땲??`);
      } else if (message.includes("SUBSCRIPTION_CONFLICT") || message.includes("以묐났 ?댁슜沅?) || message.includes("以묐났 援щℓ")) {
        pushToast("error", "?대? ?쒖꽦 ?댁슜沅뚯씠 ?덉뼱 以묐났 援щℓ瑜??좎껌?????놁뒿?덈떎.");
      } else {
        pushToast("error", message);
      }
    } finally {
      releasePaymentActionLock(actionLockKey);
      setIsProcessing(false);
    }
  };

  const handleSubscriptionCancel = async (resume: boolean) => {
    const flowerAdminToken = getFlowerAdminTokenClient();
    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    const confirmText = resume
      ? "?댁슜沅??곹깭瑜??ㅼ떆 ?뺤씤?좉퉴??"
      : "?댁슜沅??곹깭瑜??뺤씤?좉퉴?? 留뚮즺?쇨퉴吏??紐⑤뱺 ?쒗깮???좎??⑸땲??";
    if (!window.confirm(confirmText)) return;

    const actionLockKey = `subscription-cancel:${resume ? "resume" : "cancel"}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    setIsProcessing(true);
    setProcessingStage("?붿젙???뺣낫瑜??뺤씤?섎뒗 以묒씠?먯슂", "monthly");
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
        pushToast("error", data.message || "?댁슜沅??곹깭 蹂寃쎌뿉 ?ㅽ뙣?덉뒿?덈떎.");
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
      pushToast("success", data.message || "?댁슜沅??곹깭媛 蹂寃쎈릺?덉뒿?덈떎.");
    } catch (error: unknown) {
      pushToast("error", getErrorMessage(error, "?댁슜沅??곹깭 蹂寃?以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."));
    } finally {
      releasePaymentActionLock(actionLockKey);
      setIsProcessing(false);
    }
  };

  /* ?? ?⑦궎吏 ?좏깮 ?몃뱾????????????????????????????????????????????? */

  /* ?? 遺??以??붾㈃ ????????????????????????????????????????????????? */
  if (isBooting) {
    return (
      <main
        className="flex min-h-screen items-center justify-center text-slate-100"
        style={{ background: "linear-gradient(160deg, #071126 0%, #151a3d 46%, #332255 100%)" }}
      >
        <div className="text-center">
          <div className="mb-3 text-5xl animate-pulse">?뙔</div>
          <p className="font-semibold">?댁슜沅??곸젏??遺덈윭?ㅻ뒗 以?..</p>
        </div>
      </main>
    );
  }

  const pendingSubscriptionMonthlyCreditCost = pendingSubscriptionPaymentPlan
    ? calculateSubscriptionMonthlyCreditCost(pendingSubscriptionPaymentPlan)
    : 0;
  const canUseMonthlyCreditForPendingSubscription = pendingSubscriptionMonthlyCreditCost > 0 && monthlyStoneBalance >= pendingSubscriptionMonthlyCreditCost;
  const pointStateIsLoading = pointStateStatus === "idle" || pointStateStatus === "loading";
  const pointStateHasError = pointStateStatus === "error" || Boolean(pointStateError);
  const retryPointState = () => {
    setPointStateStatus("loading");
    setPointStateError(null);
    fetchMyPointState().then(() => {
      setPointStateStatus("ready");
    }).catch((error) => {
      setPointStateStatus("error");
      setPointStateError(getErrorMessage(error, "?댁슜沅??곸젏 ?뺣낫瑜??좎떆 遺덈윭?ㅼ? 紐삵뻽?듬땲??"));
      console.warn("[points-page] shop summary retry failed", error);
    });
  };

  /* ?? 硫붿씤 ?뚮뜑 ??????????????????????????????????????????????????? */
  return (
    <main
      className="moon-shop relative min-h-screen overflow-hidden px-4 py-8 text-slate-100"
      style={{ background: "radial-gradient(circle at 50% -10%, rgba(30,27,96,0.54), transparent 38%), #08091A" }}
    >
      {/* ?? 諛곌꼍 湲濡쒖슦 ?ㅻ툕 ??????????????????????????????????????? */}
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

      {/* ?? 寃곗젣 ?깃났 StarBurst ?댄럺??????????????????????????????? */}
      {showStarBurst && (
        <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl animate-ping">?뮥</div>
          <div className="absolute left-[42%] top-[44%] text-2xl animate-pulse">??/div>
          <div className="absolute left-[57%] top-[43%] text-3xl animate-bounce">?맰</div>
          <div className="absolute left-[49%] top-[57%] text-2xl animate-ping">?뮥</div>
        </div>
      )}

      {/* ?? Toast 而⑦뀒?대꼫 ?????????????????????????????????????????? */}
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
              ?щ튆 ?댁슜沅?寃곗젣 諛⑹떇 ?좏깮
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              {copy.planTitles[pendingSubscriptionPaymentPlan.tier]} 쨌 {formatSubscriptionPlanValueLine(pendingSubscriptionPaymentPlan, copy, formatLocale)} 쨌 {formatWon(pendingSubscriptionPaymentPlan.wonPrice, copy, formatLocale)}
            </p>
            <p className="mt-1 text-[12px] font-bold text-[#f3dd9a]">
              {formatMonthlyCreditValue(pendingSubscriptionMonthlyCreditCost, copy, formatLocale)} 쨌 {formatMonthlyCreditValue(monthlyStoneBalance, copy, formatLocale)}
            </p>
            <div className="mt-4 rounded-[14px] border border-white/12 bg-white/[0.07] px-3.5 py-3 text-[12px] leading-relaxed text-slate-200">
              <p className="font-black text-white">30???댁슜沅?議곌굔</p>
              <p className="mt-1">寃곗젣 ?꾨즺 利됱떆 怨꾩젙???쒖꽦?붾릺硫? ?쒕쾭 寃곗젣 寃利??깃났 ?쒓컖遺??30?쇨컙 ?좎??⑸땲??</p>
              <p className="mt-1 font-bold text-[#f3dd9a]">?붿젙???먮뒗 ?먰솕 寃곗젣濡?30???쒗깮???쒖꽦?뷀븷 ???덉뒿?덈떎.</p>
              <p className="mt-1 font-bold text-[#cab8ff]">蹂댁쑀??蹂대꼫???붿젙?앹? 30???댁슜沅??쒖꽦?붿뿉 ?ъ슜?????덉쑝硫? ?붿젙???먯껜??援щℓ쨌異⑹쟾?섍굅???꾧툑 ?섎텋?????놁뒿?덈떎.</p>
              <p className="mt-1">?먰솕 寃곗젣??30???댁슜沅뚯? ?좊즺 湲곕뒫 ?댁슜 ??寃곗젣?쇰줈遺??7???대궡 ?섎텋 ?붿껌??媛?ν븯硫? ?댁슜沅??쒗깮 ?ъ슜???쒖옉??遺遺꾩? ?섎텋???쒗븳?????덉뒿?덈떎.</p>
              <a href="/terms#refund-policy" target="_blank" rel="noreferrer" className="mt-2 inline-flex font-black text-[#cab8ff] underline">
                ?먯꽭???섎텋 洹쒖젙 蹂닿린
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
                disabled={isProcessing || !isSubscriptionRefundAgreed || !turnstileToken}
                onClick={() => {
                  const plan = pendingSubscriptionPaymentPlan;
                  if (!plan) return;
                  setPendingSubscriptionPaymentPlan(null);
                  void handleSubscribe(plan);
                }}
                className="rounded-[14px] border border-amber-200/45 bg-amber-200 px-4 py-3 text-left text-[#151832] shadow-[0_10px_22px_rgba(243,221,154,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="block text-sm font-black">?먰솕 寃곗젣</span>
                <span className="mt-1 block text-[12px] font-semibold">肄섑뀗痢?媛移섎뒗 ?먰솕濡??쒖떆?섎ŉ 蹂댁븞 寃곗젣李쎌뿉??寃곗젣?⑸땲??</span>
              </button>
                <button
                  type="button"
                  disabled={isProcessing || !isSubscriptionRefundAgreed || !canUseMonthlyCreditForPendingSubscription || !turnstileToken}
                onClick={() => {
                  const plan = pendingSubscriptionPaymentPlan;
                  if (!plan) return;
                  setPendingSubscriptionPaymentPlan(null);
                  void handleSubscribeWithMonthlyCredit(plan);
                }}
                className="rounded-[14px] border border-[#cab8ff]/45 bg-[#cab8ff]/18 px-4 py-3 text-left text-slate-100 shadow-[0_10px_22px_rgba(202,184,255,0.14)] transition hover:bg-[#cab8ff]/24 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="block text-sm font-black">蹂대꼫???붿젙???ъ슜</span>
                <span className="mt-1 block text-[12px] font-semibold">
                  {canUseMonthlyCreditForPendingSubscription
                    ? `${formatMonthlyCreditValue(pendingSubscriptionMonthlyCreditCost, copy, formatLocale)}`
                    : `${formatMonthlyCreditValue(pendingSubscriptionMonthlyCreditCost, copy, formatLocale)}`}
                </span>
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

      {/* ?? ?섏씠吏 肄섑뀗痢??????????????????????????????????????????? */}
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
          onRetry={retryPointState}
        />

        {false && (
        <>

        {/* ???ㅻ뜑 移대뱶 */}
        <header className="overflow-hidden rounded-[24px] border border-white/16 bg-[#0b1028]/92 shadow-[0_18px_46px_rgba(7,10,28,0.42)] backdrop-blur">
          {/* ?ㅻ뜑 ?먯깋 ?꾨━由ъ뾼 諛?*/}
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
                    ?곗씠???щ튆 ?댁슜沅??곸젏
                  </p>
                  <h1 className="mt-0.5 text-[22px] font-black text-white sm:text-3xl leading-tight">
                    ?곗씠???щ튆 ?댁슜沅??곸젏
                  </h1>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-100">
                    ?щ튆 ?댁슜沅??곹뭹怨??먰솕 寃곗젣 議곌굔?????붾㈃?먯꽌 ?뺤씤?섏꽭??
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-[#ffe8a3]">
                    ?붿젙???먮뒗 ?먰솕 寃곗젣濡?30???쒗깮???????덉뒿?덈떎.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/points/history"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#cab8ff]/55 bg-[#cab8ff]/18 px-4 py-2.5 text-sm font-bold text-[#ffe8a3] shadow-[0_2px_12px_rgba(202,184,255,0.18)] transition-all hover:bg-[#cab8ff]/24 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  ?뱥 ?댁슜沅?二쇰Ц ?댁뿭
                </Link>
                <Link
                  href="/"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.14] px-4 py-2.5 text-sm font-bold text-slate-50 shadow-[0_2px_12px_rgba(7,10,28,0.18)] transition-all hover:bg-white/20 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  ???쒕퉬???붾㈃?쇰줈
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ???댁슜沅??덈궡 移대뱶 */}
        <WalletCard name={authUser?.name || copy.defaultUserName} copy={copy} />

        {/* ??1 ?댁슜沅??곹깭 移대뱶 */}
        <SubscriptionStatusCard subscription={subscription} />

        <MonthlyCreditBonusCard
          balance={monthlyStoneBalance}
          ledgers={monthlyCreditLedgers}
          copy={copy}
          formatLocale={formatLocale}
        />

        {/* ??2 ?댁슜沅??뱀뀡 援щ텇??*/}
        <div className="flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#f3dd9a]">
            ?댁슜沅??곹뭹
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400 to-transparent opacity-50" />
        </div>

        {/* ??3 ?댁슜沅??곹뭹 移대뱶 */}
        <SubscriptionSection
          subscription={subscription}
          onSubscribe={setPendingSubscriptionPaymentPlan}
          onCancelSubscription={handleSubscriptionCancel}
          isProcessing={isProcessing}
          highlightedPlan={landingPlanPreset}
          copy={copy}
          formatLocale={formatLocale}
        />

        {/* ???뱀뀡 援щ텇??*/}
        <section
          aria-label={copy.wonSinglePaymentAria}
          className="rounded-[20px] border border-white/16 bg-[#0b1028]/82 px-5 py-4 text-[15px] leading-7 text-slate-100"
        >
          媛??댁슜沅뚯? ?뺥빐吏?湲덉븸 踰붿쐞???좊즺 由щ뵫??30???숈븞 ?댁뼱 以띾땲?? Family??紐⑤뱺 ?좊즺 ?쒕퉬?ㅻ? ?댁슜?????덇퀬, ?붿젙?앹쑝濡쒕룄 ?댁슜沅?援щℓ媛 媛?ν빀?덈떎.
        </section>

        <section className="rounded-[20px] border border-white/16 bg-[#0b1028]/82 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-white">理쒓렐 二쇰Ц ?댁뿭</h3>
            <span className="text-xs font-semibold text-slate-200">二쇰Ц?쒓컖 / 寃곗젣?쒓컖 / ?뱀씤踰덊샇 / ?곸닔利?/span>
          </div>

          {paymentHistory.length === 0 ? (
            <p className="text-sm text-slate-300">?꾩쭅 二쇰Ц ?댁뿭???놁뒿?덈떎.</p>
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
                      <p>二쇰Ц?쒓컖: {formatDateTime(payment.createdAt || payment.updatedAt)}</p>
                      <p>寃곗젣?쒓컖: {formatPaymentTimeLabel(payment)}</p>
                      <p>理쒓렐蹂寃? {formatDateTime(payment.updatedAt || payment.paidAt || payment.createdAt)}</p>
                      <p>寃곗젣?섎떒: {formatPaymentMethodLabel(payment)}</p>
                      <p>?뱀씤踰덊샇: {payment.approvalNumber || "-"}</p>
                      <p>二쇰Ц踰덊샇: {payment.merchantUid || "-"}</p>
                      <p>寃곗젣ID: {payment.impUid || "-"}</p>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {payment.receiptUrl ? (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-lg border border-[#D9C07A] bg-[#FFF8E2] px-2.5 py-1 text-[11.5px] font-bold text-[#7A5230] hover:bg-[#FFF2CC]"
                        >
                          ?곸닔利?蹂닿린
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#9B7040]">?곸닔利?URL 誘몄젣怨?/span>
                      )}

                      <button
                        type="button"
                        disabled={!canCancel || cancelingPaymentId === payment.id}
                        onClick={() => requestCancelPayment(payment)}
                        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11.5px] font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancelingPaymentId === payment.id ? "痍⑥냼 泥섎━ 以?.." : "寃곗젣 痍⑥냼 ?붿껌"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ??寃곗젣 ?ㅽ뙣 ?덈궡 */}
        <section className="cd-card-light rounded-[20px] border border-[#EDDBA3]/60 bg-[rgba(255,248,228,0.55)] p-5">
          <h3 className="font-bold text-[#5C3A1E]">寃곗젣 ?ㅽ뙣 ?덈궡</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[#7A5230]">
            <li>??李??リ린/痍⑥냼: 寃곗젣媛 痍⑥냼?섏뼱 ?댁슜沅?沅뚰븳???앹꽦?섏? ?딆뒿?덈떎.</li>
            <li>???쒕룄 珥덇낵: ?ㅻⅨ 移대뱶/怨꾩쥖?댁껜 ?먮뒗 湲덉븸????떠 ?ъ떆?꾪빐 二쇱꽭??</li>
            <li>??移대뱶???먭?: ?좎떆 ???ㅼ떆 ?쒕룄?섍굅???ㅻⅨ 寃곗젣?섎떒???좏깮??二쇱꽭??</li>
          </ul>
        </section>

        {/* ???뱀뀡 援щ텇????怨꾩젙 ?ㅼ젙 */}
        </>
        )}

        <div className="flex items-center gap-3 px-1 pt-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-400 to-transparent opacity-40" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
            怨꾩젙 ?ㅼ젙
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-400 to-transparent opacity-40" />
        </div>

        {/* ??怨꾩젙 ?뺣낫 移대뱶 */}
        <section
          aria-label="怨꾩젙 ?뺣낫"
          className="rounded-[24px] border border-slate-200 bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          {/* ?ㅻ뜑 */}
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">?뫀</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Account</p>
                <h2 className="text-base font-bold text-slate-700">??怨꾩젙 ?뺣낫</h2>
              </div>
            </div>
          </div>

          {/* 怨꾩젙 ?곸꽭 */}
          <div className="p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">?대쫫</p>
                <p className="text-sm font-semibold text-slate-700 truncate">{authUser?.name || "??}</p>
              </div>
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">?꾩씠??(?대찓??</p>
                <p className="text-sm font-semibold text-slate-700 truncate">{authUser?.email || "??}</p>
              </div>
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">肄섑뀗痢?媛移??⑥쐞</p>
                <p className="text-sm font-semibold text-amber-700">
                  肄섑뀗痢?湲곗?? 媛寃??곗젙 ?꾩슜
                </p>
              </div>
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">?꾩옱 ?댁슜沅?/p>
                <p className="text-sm font-semibold text-slate-700">
                  {!subscription.isActive || subscription.tier === "free" ? "?댁슜沅??놁쓬"
                   : subscription.tier === "standard" ? "?ㅽ깲?ㅻ뱶 ?щ튆 ?댁슜沅?
                   : subscription.tier === "premium" ? "?꾨━誘몄뾼 ?щ튆 ?댁슜沅?
                   : subscription.tier === "vvip" ? "VVIP ?щ튆 ?댁슜沅?
                   : "??}
                </p>
              </div>
            </div>
          </div>

          {/* ?꾪뿕 援ъ뿭 援щ텇??*/}
          <div className="mx-5 border-t border-dashed border-red-200" />

          {/* ?꾪뿕 援ъ뿭 */}
          <div className="p-5">
            <div className="rounded-[18px] border border-red-200 bg-red-50/60 overflow-hidden">
              {/* ?꾪뿕 援ъ뿭 ?ㅻ뜑 */}
              <div className="px-4 py-3 bg-red-100/70 border-b border-red-200 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                  className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true">
                  <path fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd" />
                </svg>
                <p className="text-[12px] font-extrabold text-red-700 uppercase tracking-wide">?꾪뿕 援ъ뿭 ??Danger Zone</p>
              </div>

              <div className="p-4 space-y-3">
                {/* 寃쎄퀬 ?덈궡 */}
                <div className="text-[12px] text-red-700 leading-relaxed space-y-1">
                  <p>???덊눜 ???댁슜沅뙿룹슫???꾨줈????<strong>紐⑤뱺 ?곗씠?곌? 利됱떆 ?곴뎄 ??젣</strong>?⑸땲??</p>
                  <p>???덊눜 ??<strong>?숈씪 ?대찓?쇰줈 ?ш??낇빐???댁쟾 ?곗씠?곕뒗 蹂듦뎄?섏? ?딆뒿?덈떎.</strong></p>
                  <p>??踰뺤쟻 蹂댁〈 ?섎Т???곕씪 寃곗젣 嫄곕옒 湲덉븸쨌?쇱떆??5?꾧컙 ?듬챸??蹂닿??⑸땲??</p>
                </div>

                {/* ?덊눜 踰꾪듉 */}
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
                  ?뚯썝 ?덊눜
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ?먥븧 寃곗젣 諛⑸쾿 紐⑤떖 ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      {isMethodModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(20,10,5,0.65)] px-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) setIsMethodModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-[28px] overflow-hidden shadow-[0_24px_70px_rgba(80,40,5,0.42)]">
            {/* 紐⑤떖 ?앸퀎 怨⑤뱶 諛?*/}
            <div
              className="h-[3px] w-full"
              style={{ background: "linear-gradient(90deg, #A0680A 0%, #FFD060 30%, #FFFFFF 50%, #FFD060 70%, #A0680A 100%)" }}
              aria-hidden="true"
            />
            <div
              className="border border-t-0 border-[#EDDBA3] rounded-b-[28px] p-6"
              style={{ background: "linear-gradient(160deg, #FFFDF5 0%, #FFF6E0 50%, #FFF1CC 100%)" }}
            >

            {/* 紐⑤떖 ?ㅻ뜑 */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-700">
                  ?먰솕 寃곗젣 諛⑸쾿 ?좏깮
                </p>
                <h4 className="mt-0.5 text-lg font-bold text-[#5C3A1E]">
                  {selectedPackage.title} 쨌 肄섑뀗痢?湲곗? {selectedPackage.points.toLocaleString("ko-KR")}
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
                aria-label="?リ린"
              >
                횞
              </button>
            </div>

            {/* 寃곗젣 諛⑸쾿 洹몃━??*/}
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

            {/* 寃곗젣 吏꾪뻾 踰꾪듉 */}
            {turnstileSiteKey ? (
              <div className="mt-3">
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  mode="managed"
                  disabled={isProcessing}
                  resetSignal={turnstileResetSignal}
                  onTokenChange={(value) => {
                    setTurnstileToken(value || "");
                    if (value) {
                      setTurnstileError("");
                    }
                  }}
                  onMessage={(message) => setTurnstileError(message)}
                />
              </div>
            ) : null}
            {turnstileError ? <p className="mt-2 text-sm text-rose-700">{turnstileError}</p> : null}
            <button
              type="button"
              onClick={startPayment}
              disabled={isProcessing || !turnstileToken}
              className="mt-5 w-full rounded-[16px] bg-gradient-to-r from-[#C9A84C] via-[#DFB84C] to-[#E8C060] px-4 py-4 text-base font-black text-white shadow-[0_10px_28px_rgba(160,120,20,0.45)] transition-all hover:-translate-y-0.5 hover:from-[#D4B050] hover:to-[#F0CD6A] hover:shadow-[0_14px_32px_rgba(160,120,20,0.55)] active:scale-[0.97] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? "?맰 ?곌껐 以?.." : "?먰솕 寃곗젣瑜?吏꾪뻾?⑸땲??}
            </button>
            </div>
          </div>
        </div>
      )}

      {/* ?먥븧 ?뚯썝 ?덊눜 紐⑤떖 ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧 */}
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        hasLocalAuth={true}
      />

    </main>
  );
}
