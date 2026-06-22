"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

function buildPortOneCustomer(user: AuthUser | null, paymentId: string): PortOneCustomer {
  const cachedUser = readSanitizedAuthUser() as AuthUser | null;
  const merged = { ...(cachedUser || {}), ...(user || {}) } as AuthUser;
  const fullName = String(merged.name || "회원").trim();
  const email = normalizePortoneEmail(merged.email);
  const customerId = String(merged.id || merged.userId || merged.uid || merged._id || paymentId).trim();

  const fallbackEmailId = customerId.replace(/[^a-zA-Z0-9._-]/g, "").slice(-24) || "guest";

  return {
    customerId,
    fullName,
    email: isValidEmail(email) ? email : `buyer-${fallbackEmailId}@code-destiny.com`,
    ...(pickPhoneNumber(merged) ? { phoneNumber: pickPhoneNumber(merged) } : {}),
  };
}

const SUBSCRIPTION_DURATION_OPTIONS = [
  { months: 1, label: "30일", discount: 0, badge: "" },
] as const;

const SUBSCRIPTION_BASE_PLANS = [
  {
    tier:         "standard",
    title:        "스탠다드 꿀 30일",
    baseWonPrice: 9900,
    coins:        115,
    profileLimit: 3,
    freeUpTo:     30,
    theme:        "amber",
    badge:        "",
    features:     [
      "프로필 최대 3개 생성",
      "3,000원 이하 유료 기능 이용 가능",
      "3,000원 초과 기능은 상품별 원화 단건 결제",
      "PDF 서비스는 상품별 원화 단건 결제",
      "결제 즉시 30일 이용권 활성화",
      "자동결제 상품 아님",
    ],
  },
  {
    tier:         "premium",
    title:        "프리미엄 꿀 30일",
    baseWonPrice: 29900,
    coins:        360,
    profileLimit: 7,
    freeUpTo:     50,
    theme:        "rose",
    features:     [
      "프로필 최대 7개 생성",
      "5,000원 이하 유료 기능 이용 가능",
      "5,000원 초과 기능은 상품별 원화 단건 결제",
      "PDF 서비스는 상품별 원화 단건 결제",
      "결제 즉시 30일 이용권 활성화",
      "자동결제 상품 아님",
    ],
    badge:        "추천",
  },
  {
    tier:         "vvip",
    title:        "VVIP 꿀단지 30일",
    baseWonPrice: 59000,
    coins:        700,
    profileLimit: 15,
    freeUpTo:     100,
    theme:        "purple",
    features:     [
      "프로필 최대 15개 생성",
      "10,000원 이하 유료 기능 이용 가능",
      "10,000원 초과 기능은 상품별 원화 단건 결제",
      "PDF 서비스는 상품별 원화 단건 결제",
      "결제 즉시 30일 이용권 활성화",
      "자동결제 상품 아님",
    ],
    badge:        "VVIP",
  },
  {
    tier:         "family",
    title:        "Code Destiny Family 30일",
    baseWonPrice: 300000,
    coins:        3000,
    profileLimit: null,
    freeUpTo:     null,
    theme:        "purple",
    features:     [
      "프로필 추가·수정·삭제 무료, 제한 없음",
      "PDF 포함 모든 유료 기능 이용 가능",
      "원화 단건 결제 없이 Family 혜택 적용",
      "결제 즉시 30일 이용권 활성화",
      "자동결제 상품 아님",
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
  { id: "direct_paid_service", title: "상품별 원화 단건 결제", amount: 3000, points: 30, featureKey: "direct-paid-service", description: "이용권 한도 초과 또는 PDF 서비스는 상품별 원화 단건 결제로 진행됩니다.", productType: "paid_content" },
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
  { id: "card_general", label: "KG이니시스 카드", logo: "CARD", desc: "포트원 V2 인증 결제", group: "domestic" },
];

/* ══════════════════════════════════════════════════════════════════
   유틸리티 함수
══════════════════════════════════════════════════════════════════ */

function formatWon(amount: number) {
  return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
}

function formatCoinValue(amount: number) {
  return formatWon(Math.max(0, Math.floor(Number(amount || 0))) * 100);
}

function formatMonthlyCreditValue(amount: number) {
  return `${Math.max(0, Math.floor(Number(amount || 0))).toLocaleString("ko-KR")} 월정석`;
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

function formatSubscriptionDurationLabel(months: unknown) {
  const normalized = normalizeSubscriptionDurationMonths(months);
  if (!normalized) return "30일";
  if (normalized === 1) return "30일";
  return "보유 이용권";
}

function formatSubscriptionPlanPolicy(plan: Pick<SubscriptionPlan, "freeUpTo">) {
  if (plan.freeUpTo === null) return "모든 유료/PDF 서비스 이용 가능";
  return `일반 ${formatCoinValue(plan.freeUpTo)} 이하 이용 가능`;
}

function formatSubscriptionPlanValueLine(plan: Pick<SubscriptionPlan, "tier" | "freeUpTo" | "durationMonths">) {
  const duration = formatSubscriptionDurationLabel(plan.durationMonths);
  if (plan.tier === "family") return `Family 전체 혜택 / ${duration}`;
  return `${formatCoinValue(Number(plan.freeUpTo || 0))} 이하 기능 / ${duration}`;
}

function isMonthlyCreditPayment(payment: Pick<PaymentHistoryItem, "paymentMethod" | "accessType">) {
  const method = String(payment.paymentMethod || "").trim().toLowerCase();
  const accessType = String(payment.accessType || "").trim().toLowerCase();
  return method === "monthly_credit" || method === "monthly" || accessType === "membership_credit";
}

function formatPaymentMethodLabel(payment: PaymentHistoryItem) {
  if (isMonthlyCreditPayment(payment)) return "프로모션 처리";
  const method = String(payment.paymentMethodLabel || payment.paymentMethod || "").trim();
  const normalized = method.toLowerCase();
  if (!method) return "-";
  if (normalized === "card_general" || normalized === "card") return "카드 결제";
  if (normalized === "virtual_account") return "가상계좌";
  if (normalized === "kakaopay") return "카카오페이";
  if (normalized === "naverpay") return "네이버페이";
  return method;
}

function formatDateTime(raw?: string | null) {
  if (!raw) return "-";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatPaymentTimeLabel(payment: PaymentHistoryItem) {
  const paidOrCancelledAt = payment.paidAt || payment.cancelledAt || null;
  if (paidOrCancelledAt) return formatDateTime(paidOrCancelledAt);
  if (payment.status === "pending") return "결제 대기";
  if (payment.status === "failed") return "결제 실패";
  return "-";
}

function formatMonthlyCreditLedgerType(type: string) {
  if (type === "MONTHLY_CREDIT_GRANT") return "지급";
  if (type === "MONTHLY_CREDIT_SPEND") return "사용";
  if (type === "MONTHLY_CREDIT_REFUND") return "복원";
  return "기록";
}

function formatMonthlyCreditLedgerAmount(entry: MonthlyCreditLedgerItem) {
  const amount = Math.max(0, Math.floor(Number(entry.amount || 0)));
  const type = String(entry.type || "");
  const sign = type === "MONTHLY_CREDIT_SPEND" ? "-" : "+";
  return `${sign}${amount.toLocaleString("ko-KR")} 월정석`;
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

function mapPaymentStatusLabel(status: string) {
  if (status === "success" || status === "fulfilled") return { label: "생성 완료", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  if (status === "paid") return { label: "결제 완료", cls: "bg-sky-100 text-sky-800 border-sky-300" };
  if (status === "processing") return { label: "생성 중", cls: "bg-indigo-100 text-indigo-800 border-indigo-300" };
  if (status === "retryable") return { label: "재시도 가능", cls: "bg-orange-100 text-orange-800 border-orange-300" };
  if (status === "cancelled") return { label: "취소완료", cls: "bg-neutral-100 text-neutral-700 border-neutral-300" };
  if (status === "refunded") return { label: "환불완료", cls: "bg-cyan-100 text-cyan-800 border-cyan-300" };
  if (status === "failed") return { label: "실패", cls: "bg-rose-100 text-rose-700 border-rose-300" };
  return { label: "대기", cls: "bg-amber-100 text-amber-700 border-amber-300" };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function mapAuthRefreshTemporaryFailureMessage() {
  return "로그인 세션 확인이 일시적으로 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
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

/* ══════════════════════════════════════════════════════════════════
   서브 컴포넌트: 프로필 이용권 섹션
══════════════════════════════════════════════════════════════════ */

function SubscriptionSection({
  subscription,
  onSubscribe,
  onCancelSubscription,
  isProcessing,
  highlightedPlan,
}: {
  subscription:  SubscriptionStatus;
  onSubscribe:   (plan: SubscriptionPlan) => void;
  onCancelSubscription: (resume: boolean) => void;
  isProcessing:  boolean;
  highlightedPlan: "standard" | "premium" | "vvip" | "family" | null;
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
    ? new Date(subscription.expiresAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const activeTierRank = subscription.isActive ? getSubscriptionTierRank(subscription.tier) : 0;
  return (
    <section
      aria-label="달빛 30일 이용권"
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
            이 30일 이용권은 자동결제 상품이 아닙니다. 만료 후 다시 구매해야 합니다.
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
              추가 유료 콘텐츠는 상품별 단건 결제로 이용할 수 있습니다.
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
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">Code Destiny Family는 프로필 카드 제한 없이 모든 유료 기능을 이용할 수 있습니다.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">PDF 서비스와 한도 초과 일반 유료 서비스는 상품별 원화 단건 결제로 이용할 수 있습니다.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">기간 종료 후 추가 결제 없이 무료 플랜으로 전환됩니다.</span></li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0">원화 결제된 이용권은 유료 기능 이용 전 결제일로부터 7일 이내 환불 요청이 가능합니다.</span></li>
            <li className="flex items-start gap-1.5 font-bold text-rose-600"><span className="mt-0.5 flex-shrink-0">·</span><span className="min-w-0"><strong>자동결제가 아닌 30일 이용권</strong>이며, 결제 전 환불 규정 동의가 필요합니다.</span></li>
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
              { icon: "🎭", text: "재미 맛보기 콘텐츠", sub: "MBTI 동물 궁합·사주 AI 이상형·사주네컷 등" },
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
                  {plan.tier === "vvip" ? "👑 VVIP" : `✨ ${plan.badge}`}
                </span>
              )}
              {isCurrentActive && (
                <span className="absolute top-3 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-black text-white shadow">
                  ✓ 이용권 이용 중
                </span>
              )}

              {/* 플랜 아이콘 & 이름 */}
              <p className="text-xl leading-none">{theme.icon}</p>
              <p className={`mt-2 text-[12px] font-black uppercase tracking-wider ${theme.label}`}>{plan.title}</p>

              {/* 가격 */}
              <p className="mt-2 flex flex-wrap items-center gap-1 text-[17px] font-black leading-snug text-white">
                <CoinIcon size="md" />
                {formatSubscriptionPlanValueLine(plan)}
              </p>
              <p className="mt-1 text-[12.5px] font-semibold text-slate-200">
                이용 기간 30일 · 결제 금액 {formatWon(plan.wonPrice)}
              </p>

              {/* 커피 한 잔 뱃지 — freeUpTo 50 이하 플랜(스탠다드)에만 */}
              {plan.freeUpTo !== null && plan.freeUpTo <= 50 && plan.tier === "standard" && plan.durationMonths === 1 && (
                <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#f3dd9a]/22 px-2.5 py-1 text-[12px] font-bold text-[#ffe8a3]">
                  ☕ 커피 2잔 값으로 30일
                </div>
              )}

              {/* 무료 이용 범위 태그 */}
              <div className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${theme.freeTag}`}>
                🆓{" "}
                {formatSubscriptionPlanPolicy(plan)}
              </div>

              {/* 기능 목록 */}
              <ul className="mt-3 flex-1 space-y-1.5">
                {plan.features.map((f) => {
                  const isBonus = f.startsWith("🎁");
                  const isKey   = !isBonus && (f.includes("무료") || f.includes("해금"));
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
                      {f}
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
                  ? `30일 이용권 연장`
                  : lowerTierBlocked
                    ? "상위 티어 사용 중 (구매 불가)"
                  : isHighlighted
                    ? `${theme.icon} 30일 이용권 구매하기`
                    : `${theme.icon} 30일 이용권 구매하기`}
              </button>

              {lowerTierBlocked && (
                <p className="mt-2 text-[11px] font-semibold text-violet-700">
                  현재 상위 티어 이용권이 활성화되어 하위 플랜은 선택할 수 없습니다.
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
            30일 이용권 활성화
          </p>
          <p className="mt-1 text-[11.5px] text-violet-700">
            {`${expires || "만료일"}까지 혜택이 유지됩니다. 이 30일 이용권은 자동결제 상품이 아닙니다. 만료 후 다시 구매해야 합니다.`}
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
              이용권 상태 확인
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5 px-5 pb-5">
        <p className="text-[12.5px] font-semibold text-[#ffe8a3]">✅ 결제 즉시 이용권 혜택이 활성화되며 <strong>30일 동안 유효</strong>합니다.</p>
        <p className="text-[12.5px] font-bold text-rose-100">이 30일 이용권은 자동결제 상품이 아닙니다. 만료 후 다시 구매해야 합니다.</p>
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
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
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
            aria-label="알림 닫기"
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
  ledgers,
}: {
  balance: number;
  ledgers: MonthlyCreditLedgerItem[];
}) {
  return (
    <section
      aria-label="월정석 보너스 잔량과 사용 내역"
      className="rounded-[24px] border border-[#cab8ff]/36 bg-[#0b1028]/92 p-5 text-slate-50 shadow-[0_18px_46px_rgba(7,10,28,0.36)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ded4ff]">보너스 월정석</p>
          <h3 className="mt-1 text-lg font-black text-white">월정석 잔량</h3>
          <p className="mt-1 text-sm text-slate-200">
            월정석은 달빛 이용권과 이벤트로 지급되는 보너스 혜택이며, 월정석 자체는 별도로 구매하거나 충전할 수 없습니다.
          </p>
        </div>
        <div className="rounded-[18px] border border-[#f3dd9a]/48 bg-[#f3dd9a]/18 px-4 py-3 text-left sm:text-right">
          <p className="text-xs font-bold text-[#ffe8a3]">현재 사용 가능</p>
          <p className="mt-1 text-2xl font-black text-white">{formatMonthlyCreditValue(balance)}</p>
          <p className="mt-1 text-[11px] font-bold text-rose-100">구매·충전 불가</p>
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
                      {formatDateTime(entry.createdAt)} · 잔량 {formatMonthlyCreditValue(Number(entry.afterBalance || 0))}
                    </span>
                  </span>
                  <span className={`font-black ${isSpend ? "text-rose-100" : "text-emerald-100"}`}>
                    {formatMonthlyCreditLedgerAmount(entry)}
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

function WalletCard({ name }: { name: string }) {
  return (
    <section
      aria-label="이용권 상점 안내"
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
              🌙
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
              자동결제가 아닌 30일 이용권이며, 한도 초과 서비스와 PDF는 상품별 원화 단건 결제로 진행됩니다.
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
  서브 컴포넌트: 단건 결제 상품 카드
  클릭 시 결제 방법 모달로 이동합니다.
══════════════════════════════════════════════════════════════════ */

function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: PointPackage;
  selected: boolean;
  onSelect: (pkg: PointPackage) => void;
}) {
  const isBest = pkg.id === "fortune_50_10";
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

  /** 모바일 리디렉션 복귀를 한 번만 처리하기 위한 플래그 */
  const redirectHandledRef = useRef(false);
  const paymentActionLockRef = useRef<{ key: string; startedAt: number } | null>(null);
  const confirmPaymentInFlightRef = useRef(new Map<string, Promise<ConfirmResponse>>());
  const confirmSubscriptionInFlightRef = useRef(new Map<string, Promise<ConfirmSubscriptionResponse>>());
  const fetchMyPointStateInFlightRef = useRef<Promise<void> | null>(null);
  const fetchSubscriptionStatusInFlightRef = useRef<Promise<void> | null>(null);
  /** Toast ID 증가용 카운터 */
  const toastCounter = useRef(0);

  /* ── API 기본 URL ─────────────────────────────────────────────── */
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  /* ── 상태 ──────────────────────────────────────────────────────── */
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PointPackage>(POINT_PACKAGES[0]);
  const [selectedMethod, setSelectedMethod] = useState<string>("card_general");

  const [isBooting, setIsBooting] = useState(true);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingVariant, setProcessingVariant] = useState<PaymentLoadingVariant>("subscription");
  const [processingText, setProcessingText] = useState(
    "원화 기준 달빛 이용권 결제 정보를 확인하고 있습니다.",
  );
  const {
    startProcessing: showProcessingOverlay,
    stopProcessing: hideProcessingOverlay,
  } = usePaymentProcessing();
  const [showStarBurst, setShowStarBurst] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [monthlyStoneBalance, setMonthlyStoneBalance] = useState(0);
  const [monthlyCreditLedgers, setMonthlyCreditLedgers] = useState<MonthlyCreditLedgerItem[]>([]);
  const [cancelingPaymentId, setCancelingPaymentId] = useState<string | null>(null);
  const [landingPlanPreset, setLandingPlanPreset] = useState<"standard" | "premium" | "vvip" | "family" | null>(null);
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

  /** Toast 알림 목록 */
  const [toasts, setToasts] = useState<ToastItem[]>([]);
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

  /* ── 서버에서 주문/이용권 상태 조회 ─────────────────────────────── */
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

      // Content-Type 검증 후 JSON 파싱 — HTML 에러 페이지 방어
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
    const passLabel = label === "이용권" ? "이용권" : `${label} 이용권`;
    setProcessingStage(`${passLabel}을 확인했어요\n결과를 불러오는 중이에요`, "pass-applied");
    await Promise.allSettled([
      fetchMyPointState(),
    ]);
    await showPassAppliedStage(undefined, tier);
  }, [fetchMyPointState, setProcessingStage, showPassAppliedStage, subscription.tier]);

  /* ── 초기 인증 토큰 확인 ───────────────────────────────────────── */
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

  /* ── 부팅 후 결제/주문 정보 로드 ─────────────────────────────── */
  useEffect(() => {
    if (isBooting) return;

    fetchMyPointState().catch((error) => {
      pushToast("error", getErrorMessage(error, "결제 및 이용권 정보를 불러오지 못했습니다."));
    });
  }, [fetchMyPointState, isBooting, pushToast]);

  /* ── 이용권 상태 로드 ─────────────────────────────────────────────── */
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

  /* ── 서버 결제 검증 ────────────────────────────────────────────── */
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

      // Content-Type 검증 후 JSON 파싱
      const payload = await safeParseJson<ConfirmResponse & { message?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.message || "서버 결제 검증에 실패했습니다.");
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
        // 실패 보고는 보조 경로이므로 UI 흐름을 막지 않는다.
      }
    },
    [apiBase],
  );

  /* ── 결제 성공 후 처리 ─────────────────────────────────────────── */
  const handleConfirmSuccess = useCallback(
    async (result: ConfirmResponse, fromRedirect = false) => {
      pushToast(
        "success",
        fromRedirect
          ? "모바일 결제 복귀 확인이 완료되었습니다. 결제 내역에서 상품 이용을 이어갈 수 있어요."
          : result.message || "결제가 완료되었습니다. 해당 상품 이용을 이어가세요.",
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

        await fetchMyPointState();
        pushToast("success", payload.message || "결제가 취소되었습니다.");
      } catch (error: unknown) {
        pushToast("error", getErrorMessage(error, "결제 취소 처리 중 오류가 발생했습니다."));
      } finally {
        setCancelingPaymentId(null);
      }
    },
    [apiBase, fetchMyPointState, pushToast],
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
        query.get("error_msg") || query.get("errorMsg") || "결제가 취소되었습니다.",
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
        ? "30일 이용권이 활성화되고 있어요\n곧 이용 가능해져요"
        : "결제가 완료됐어요\n결과를 불러오는 중이에요",
      "payment-complete",
    );

    if (isSubscriptionRedirect) {
      const pendingSub = pendingSubscription;
      const merchantUid = merchantUidFromQuery || pendingSub?.merchantUid;

      if (!pendingSub || !merchantUid) {
        clearPendingSubscriptionOrder();
        pushToast("error", "이용권 결제 복귀 정보를 찾지 못했습니다. 다시 시도해 주세요.");
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
          pushToast("success", data.message || "이용권 결제가 완료되어 이용권이 활성화되었습니다.");
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
          reasonMessage: getErrorMessage(error, "모바일 결제 복귀 검증에 실패했습니다."),
          paymentMethod: pending?.paymentMethod,
        });
        pushToast("error", getErrorMessage(error, "모바일 결제 검증에 실패했습니다."));
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

  /* ── 이용권 결제 시작 ───────────────────────────────────────────── */
  const startPayment = async () => {
    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    const actionLockKey = `point:${selectedPackage.id}:${selectedMethod}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    setIsProcessing(true);
    setProcessingStage("잔액을 확인하는 중이에요", "payment");

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
          productName: selectedPackage.title,
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
        productName: order.productName || selectedPackage.title,
        paymentMethod: selectedMethod,
      });

      await ensurePortoneSdk();

      if (!window.PortOne?.requestPayment) {
        throw new Error("포트원 V2 결제 SDK가 초기화되지 않았습니다.");
      }

      const paymentConfig = await fetchPortOnePaymentConfig(apiBase);

      const redirectUrl = new URL(PORTONE_MOBILE_REDIRECT_PATH, window.location.origin);
      redirectUrl.searchParams.set("portone_redirect", "1");

      const customer = buildPortOneCustomer(authUser, order.merchantUid);

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

      setProcessingStage("단건 결제 준비 중\n주문 정보와 인증 흐름을 확인하고 있어요", "checkout");
      const rsp = await window.PortOne.requestPayment(requestData);
      const paymentId = String(rsp?.paymentId || order.merchantUid || "").trim();

      if (!rsp || rsp.code || !paymentId) {
        const message = mapPaymentErrorMessage(
          rsp?.message || rsp?.error_msg || rsp?.errorMsg || "결제가 취소되었습니다.",
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
        setProcessingStage("결제가 완료됐어요\n결과를 불러오는 중이에요", "payment-complete");
        const result = await confirmPaymentWithServer({
          impUid: paymentId,
          merchantUid: order.merchantUid,
          paymentAmount: order.paymentAmount,
          chargePoints: order.chargePoints ?? order.coinPrice ?? selectedPackage.points,
          paymentType: "digital_content",
          productId: selectedPackage.id,
          featureKey: selectedPackage.featureKey,
          productName: order.productName || selectedPackage.title,
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
          reasonMessage: getErrorMessage(error, "결제 검증에 실패했습니다."),
          paymentMethod: selectedMethod,
        });
        pushToast("error", getErrorMessage(error, "결제 검증에 실패했습니다."));
      } finally {
        setIsProcessing(false);
      }
    } catch (error: unknown) {
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

  /* ── 갤럭시아 결제 성공 핸들러 ─────────────────────────────────── */
  const handleSubscribe = async (plan: SubscriptionPlan) => {
    const flowerAdminToken = getFlowerAdminTokenClient();
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

    setPendingSubscriptionPaymentPlan(null);
    setProcessingStage("30일 이용권 결제 정보를 준비하고 있어요", "checkout");
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
        }),
      }, {
        retryOn401: true,
        apiBase,
      });

      if (prepareRes.status === 404 || prepareRes.status === 405 || prepareRes.status === 501) {
        pushToast("error", "이용권 결제 API를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const prepareData = await safeParseJson<PrepareSubscriptionOrderResponse>(prepareRes);
      if (!prepareRes.ok || !prepareData.order) {
        if (prepareRes.status === 409) {
          pushToast("error", prepareData.message || "이미 활성 이용권이 있어 중복 구매를 신청할 수 없습니다.");
          return;
        }
        pushToast("error", prepareData.message || "이용권 결제 준비에 실패했습니다.");
        return;
      }

      await ensurePortoneSdk();
      if (!window.PortOne?.requestPayment) throw new Error("포트원 V2 결제 SDK가 초기화되지 않았습니다.");

      const order = prepareData.order;
      const paymentConfig = await fetchPortOnePaymentConfig(apiBase);

      const redirectUrl = new URL(PORTONE_MOBILE_REDIRECT_PATH, window.location.origin);
      redirectUrl.searchParams.set("portone_subscription_redirect", "1");

      const customer = buildPortOneCustomer(authUser, order.merchantUid);

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
          rsp?.message || rsp?.error_msg || rsp?.errorMsg || "이용권 결제가 취소되었습니다.",
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
        setProcessingStage("30일 이용권 결제를 확인하고 있어요\n잠시만 기다려 주세요", "subscription");
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
        pushToast("success", confirmData.message || `${plan.title}이 활성화되었습니다.`);
        setShowStarBurst(true);
        setTimeout(() => setShowStarBurst(false), 1200);
      } catch (error: unknown) {
        clearPendingSubscriptionOrder();
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
      clearPendingSubscriptionOrder();
      if (message.includes("SUBSCRIPTION_CONFLICT") || message.includes("중복 이용권") || message.includes("중복 구매")) {
        pushToast("error", "이미 활성 이용권이 있어 중복 구매를 신청할 수 없습니다.");
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
      pushToast("error", "현재 신규 판매 이용권은 30일권만 선택할 수 있습니다.");
      return;
    }

    if (activeTierRank > requestedTierRank) {
      pushToast("info", "현재 상위 티어 이용권이 활성화되어 하위 플랜은 신청할 수 없습니다.");
      return;
    }

    if (monthlyStoneBalance < requiredMonthlyCredits) {
      pushToast("error", `월정석 잔량이 부족합니다. 필요 ${formatMonthlyCreditValue(requiredMonthlyCredits)}, 현재 ${formatMonthlyCreditValue(monthlyStoneBalance)}입니다.`);
      return;
    }

    const requestId = buildMonthlyCreditSubscriptionRequestId(plan);
    const actionLockKey = `subscription-monthly-credit:${plan.planId}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    setIsProcessing(true);
    setPendingSubscriptionPaymentPlan(null);
    setProcessingStage("월정석으로 이용권이 활성화되고 있어요\n곧 이용 가능해져요", "payment-complete");

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
      pushToast("success", confirmData.message || `${plan.title}이 월정석으로 활성화되었습니다.`);
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
    } catch (error: unknown) {
      const message = getErrorMessage(error, "월정석으로 이용권을 활성화하지 못했습니다.");
      if (message.includes("INSUFFICIENT_MONTHLY_CREDITS") || message.includes("부족")) {
        pushToast("error", `월정석 잔량이 부족합니다. 필요 ${formatMonthlyCreditValue(requiredMonthlyCredits)}, 현재 ${formatMonthlyCreditValue(monthlyStoneBalance)}입니다.`);
      } else if (message.includes("SUBSCRIPTION_CONFLICT") || message.includes("중복 이용권") || message.includes("중복 구매")) {
        pushToast("error", "이미 활성 이용권이 있어 중복 구매를 신청할 수 없습니다.");
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
  const handlePackageSelect = useCallback((pkg: PointPackage) => {
    setSelectedPackage(pkg);
    setIsMethodModalOpen(true);
  }, []);

  /* ── 부팅 중 화면 ───────────────────────────────────────────────── */
  if (isBooting) {
    return (
      <main
        className="flex min-h-screen items-center justify-center text-slate-100"
        style={{ background: "linear-gradient(160deg, #071126 0%, #151a3d 46%, #332255 100%)" }}
      >
        <div className="text-center">
          <div className="mb-3 text-5xl animate-pulse">🌙</div>
          <p className="font-semibold">이용권 상점을 불러오는 중...</p>
        </div>
      </main>
    );
  }

  const pendingSubscriptionMonthlyCreditCost = pendingSubscriptionPaymentPlan
    ? calculateSubscriptionMonthlyCreditCost(pendingSubscriptionPaymentPlan)
    : 0;
  const canUseMonthlyCreditForPendingSubscription = pendingSubscriptionMonthlyCreditCost > 0 && monthlyStoneBalance >= pendingSubscriptionMonthlyCreditCost;

  /* ── 메인 렌더 ─────────────────────────────────────────────────── */
  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-8 text-slate-100"
      style={{ background: "linear-gradient(160deg, #071126 0%, #151a3d 38%, #261948 70%, #3e2d66 100%)" }}
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

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
              {pendingSubscriptionPaymentPlan.title} · {formatSubscriptionPlanValueLine(pendingSubscriptionPaymentPlan)} · {formatWon(pendingSubscriptionPaymentPlan.wonPrice)}
            </p>
            <p className="mt-1 text-[12px] font-bold text-[#f3dd9a]">
              월정석 사용 시 {formatMonthlyCreditValue(pendingSubscriptionMonthlyCreditCost)} · 현재 {formatMonthlyCreditValue(monthlyStoneBalance)}
            </p>
            <div className="mt-4 rounded-[14px] border border-white/12 bg-white/[0.07] px-3.5 py-3 text-[12px] leading-relaxed text-slate-200">
              <p className="font-black text-white">30일 이용권 조건</p>
              <p className="mt-1">결제 완료 즉시 계정에 활성화되며, 서버 결제 검증 성공 시각부터 30일간 유지됩니다.</p>
              <p className="mt-1 font-bold text-[#f3dd9a]">이 30일 이용권은 자동결제 상품이 아닙니다. 만료 후 다시 구매해야 합니다.</p>
              <p className="mt-1 font-bold text-[#cab8ff]">보유한 보너스 월정석은 30일 이용권 활성화에 사용할 수 있으며, 월정석 자체는 구매·충전하거나 현금 환불할 수 없습니다.</p>
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
              <span>원화 결제된 30일 이용권은 결제 즉시 활성화되며, 유료 기능 이용 시작 후에는 환불이 제한될 수 있음을 확인했습니다.</span>
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
                <span className="block text-sm font-black">원화 단건 결제</span>
                <span className="mt-1 block text-[12px] font-semibold">콘텐츠 가치는 원화로 표시되며 보안 결제창에서 결제합니다.</span>
              </button>
              <button
                type="button"
                disabled={isProcessing || !isSubscriptionRefundAgreed || !canUseMonthlyCreditForPendingSubscription}
                onClick={() => {
                  const plan = pendingSubscriptionPaymentPlan;
                  if (!plan) return;
                  setPendingSubscriptionPaymentPlan(null);
                  void handleSubscribeWithMonthlyCredit(plan);
                }}
                className="rounded-[14px] border border-[#cab8ff]/45 bg-[#cab8ff]/18 px-4 py-3 text-left text-slate-100 shadow-[0_10px_22px_rgba(202,184,255,0.14)] transition hover:bg-[#cab8ff]/24 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="block text-sm font-black">보너스 월정석 사용</span>
                <span className="mt-1 block text-[12px] font-semibold">
                  {canUseMonthlyCreditForPendingSubscription
                    ? `${formatMonthlyCreditValue(pendingSubscriptionMonthlyCreditCost)} 차감 후 30일 이용권을 활성화합니다.`
                    : `월정석 잔량이 부족합니다. 필요 ${formatMonthlyCreditValue(pendingSubscriptionMonthlyCreditCost)}.`}
                </span>
              </button>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setPendingSubscriptionPaymentPlan(null)}
              className="mt-4 w-full rounded-[12px] border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ── 페이지 콘텐츠 ────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-6xl space-y-5">

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
                  alt="달빛 이용권"
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
                    모든 신규 판매 이용권은 자동결제가 아닌 30일 이용권입니다.
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
        <WalletCard name={authUser?.name || "사용자"} />

        {/* ②-1 이용권 상태 카드 */}
        <SubscriptionStatusCard subscription={subscription} />

        <MonthlyCreditBonusCard
          balance={monthlyStoneBalance}
          ledgers={monthlyCreditLedgers}
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
        />

        {/* ③ 섹션 구분선 */}
        <section
          aria-label="원화 단건 결제 안내"
          className="rounded-[20px] border border-white/16 bg-[#0b1028]/82 px-5 py-4 text-[15px] leading-7 text-slate-100"
        >
          일반 유료 서비스는 이용권 한도 이하일 때만 이용권으로 열립니다. 한도 초과 서비스와 PDF 서비스는 상품별 원화 단건 결제로 이용할 수 있습니다.
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
                  {selectedPackage.title} · 콘텐츠 기준 {selectedPackage.points.toLocaleString("ko-KR")}
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
