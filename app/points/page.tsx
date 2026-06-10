"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import WithdrawModal from "../components/WithdrawModal";
import { usePaymentProcessing } from "../components/PaymentProcessingContext";
import type { PaymentLoadingProps } from "../components/common/PaymentLoading";
import SubscriptionStatusCard from "./SubscriptionStatusCard";
import { authFetch, clearClientAuthState } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { persistSanitizedAuthUser, readSanitizedAuthUser, resolveAuthScopeFromUser } from "../_lib/auth-storage";
import { refreshBillingBalance } from "../_lib/auth-store";

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
  productType: "paid_content" | "pdf_report" | "usage_pass";
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
  paidAt?: string;
  approvalNumber?: string | null;
  receiptUrl?: string | null;
  cancelledAt?: string | null;
};

/* ── 프로필 이용권 타입 ───────────────────────────────────────── */
type SubscriptionTier = "free" | "standard" | "premium" | "vvip" | "family";
type AdminTestTier = "off" | "standard" | "premium" | "vvip" | "family";

type SubscriptionStatus = {
  tier:               SubscriptionTier;
  source?:            "card" | "pass" | "monthly_credit";
  isActive:           boolean;
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
  durationMonths: 1 | 3 | 6 | 12;
  productType:  "membership_pass";
  coins:        number;
  profileLimit: number | null; // null = unlimited
  freeUpTo:     number | null; // null = Family all-inclusive, number = normal paid-service pass limit and PDF discount
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

  if (!isValidEmail(email)) {
    throw new Error("구매자 이메일은 결제 창 호출 전 필수입니다. 계정 정보에서 확인해 주세요.");
  }

  return {
    customerId: String(merged.id || merged.userId || merged.uid || merged._id || paymentId).trim(),
    fullName,
    email,
    ...(pickPhoneNumber(merged) ? { phoneNumber: pickPhoneNumber(merged) } : {}),
  };
}

const SUBSCRIPTION_DURATION_OPTIONS = [
  { months: 1, label: "1개월", discount: 0, badge: "" },
  { months: 3, label: "3개월", discount: 0.05, badge: "5% 절약" },
  { months: 6, label: "6개월", discount: 0.10, badge: "10% 절약" },
  { months: 12, label: "1년", discount: 0.30, badge: "30% 절약" },
] as const;

const SUBSCRIPTION_BASE_PLANS = [
  {
    tier:         "standard",
    title:        "스탠다드 달빛 이용권",
    baseWonPrice: 9900,
    coins:        115,
    profileLimit: 3,
    freeUpTo:     30,
    theme:        "amber",
    badge:        "",
    features:     [
      "프로필 최대 3개 생성",
      "일반 유료 서비스 30코인 이하 이용권 이용",
      "PDF 생성 시 30코인 자동 할인",
      "한도 초과 일반 서비스는 코인 기준 단건 결제",
      "선택 기간 동안 유효 (기간 기반)",
      "자동결제 없는 기간형 이용권",
    ],
  },
  {
    tier:         "premium",
    title:        "프리미엄 달빛 이용권",
    baseWonPrice: 29900,
    coins:        360,
    profileLimit: 7,
    freeUpTo:     50,
    theme:        "rose",
    features:     [
      "프로필 최대 7개 생성",
      "일반 유료 서비스 50코인 이하 이용권 이용",
      "PDF 생성 시 50코인 자동 할인",
      "한도 초과 일반 서비스는 코인 기준 단건 결제",
      "선택 기간 동안 유효 (기간 기반)",
      "자동결제 없는 기간형 이용권",
    ],
    badge:        "추천",
  },
  {
    tier:         "vvip",
    title:        "VVIP 달빛 이용권",
    baseWonPrice: 59000,
    coins:        700,
    profileLimit: 15,
    freeUpTo:     100,
    theme:        "purple",
    features:     [
      "프로필 최대 15개 생성",
      "일반 유료 서비스 100코인 이하 이용권 이용",
      "PDF 생성 시 100코인 자동 할인",
      "한도 초과 일반 서비스는 코인 기준 단건 결제",
      "선택 기간 동안 유효 (기간 기반)",
      "자동결제 없는 기간형 이용권",
    ],
    badge:        "VVIP",
  },
  {
    tier:         "family",
    title:        "Code Destiny Family",
    baseWonPrice: 300000,
    coins:        3000,
    profileLimit: null,
    freeUpTo:     null,
    theme:        "purple",
    features:     [
      "프로필 수정·삭제 무료, 제한 없음",
      "PDF 포함 모든 유료 서비스 무료",
      "일반 유료 서비스도 코인 기준 단건 결제 없이 이용",
      "월 300,000원 / 3,000코인 가치",
      "선택 기간 Family 이용권",
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
      feature.includes("선택 기간 동안 유효")
        ? `${duration.label} 동안 유효 (기간 기반)`
        : feature.includes("선택 기간 Family 이용권")
          ? `${duration.label} Family 이용권`
        : feature.includes("자동결제 없는 기간형 이용권")
          ? `자동결제 없는 ${duration.label} 이용권`
          : feature
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

const POINT_PACKAGES: PointPackage[] = [
  { id: "saju_unlock_3", title: "사주 잠금 서비스 3개 해제권", amount: 12000, points: 150, featureKey: "usage-pass-saju-unlock-3", description: "사주 잠금 콘텐츠 3개를 필요한 순간에 해제", productType: "usage_pass" },
  { id: "saju_unlock_5", title: "사주 잠금 서비스 5개 해제권", amount: 19000, points: 250, featureKey: "usage-pass-saju-unlock-5", description: "사주 잠금 콘텐츠 5개를 필요한 순간에 해제", productType: "usage_pass" },
  { id: "fortune_30_3", title: "30 기준 이하 운세 3회 이용권", amount: 6900, points: 90, featureKey: "usage-pass-fortune-30-3", description: "30 기준 이하 운세 서비스를 3회 이용", productType: "usage_pass" },
  { id: "fortune_30_10", title: "30 기준 이하 운세 10회 이용권", amount: 22500, points: 300, featureKey: "usage-pass-fortune-30-10", description: "30 기준 이하 운세 서비스를 10회 이용", productType: "usage_pass" },
  { id: "fortune_30_30", title: "30 기준 이하 운세 30회 이용권", amount: 63000, points: 900, featureKey: "usage-pass-fortune-30-30", description: "30 기준 이하 운세 서비스를 30회 이용", productType: "usage_pass" },
  { id: "fortune_50_3", title: "50 기준 이하 운세 3회 이용권", amount: 11500, points: 150, featureKey: "usage-pass-fortune-50-3", description: "50 기준 이하 운세 서비스를 3회 이용", productType: "usage_pass" },
  { id: "fortune_50_10", title: "50 기준 이하 운세 10회 이용권", amount: 37500, points: 500, featureKey: "usage-pass-fortune-50-10", description: "50 기준 이하 운세 서비스를 10회 이용", productType: "usage_pass" },
  { id: "fortune_50_30", title: "50 기준 이하 운세 30회 이용권", amount: 105000, points: 1500, featureKey: "usage-pass-fortune-50-30", description: "50 기준 이하 운세 서비스를 30회 이용", productType: "usage_pass" },
  { id: "compat_3", title: "운세 서비스 궁합 3회 이용권", amount: 11500, points: 150, featureKey: "usage-pass-compat-3", description: "궁합 계열 운세 서비스를 3회 이용", productType: "usage_pass" },
  { id: "compat_10", title: "운세 서비스 궁합 10회 이용권", amount: 37500, points: 500, featureKey: "usage-pass-compat-10", description: "궁합 계열 운세 서비스를 10회 이용", productType: "usage_pass" },
  { id: "compat_30", title: "운세 서비스 궁합 30회 이용권", amount: 105000, points: 1500, featureKey: "usage-pass-compat-30", description: "궁합 계열 운세 서비스를 30회 이용", productType: "usage_pass" },
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

function readAdminTestTierClient(): AdminTestTier {
  if (typeof window === "undefined") return "off";
  try {
    const raw = String(localStorage.getItem("flower_admin_test_tier") || "off").toLowerCase();
    if (raw === "standard" || raw === "premium" || raw === "vvip" || raw === "family") return raw;
  } catch {}
  return "off";
}

function saveAdminTestTierClient(tier: AdminTestTier) {
  if (typeof window === "undefined") return;
  localStorage.setItem("flower_admin_test_tier", tier);
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

function formatMonthlyCredits(amount: number) {
  return `${Number(amount || 0).toLocaleString("ko-KR")} 이벤트 월정석`;
}

function getSubscriptionMonthlyCreditCost(plan: Pick<SubscriptionPlan, "wonPrice">) {
  return Math.max(0, Math.ceil(Number(plan?.wonPrice || 0) / 10));
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
  if (!normalized) return "선택 기간";
  return normalized === 12 ? "1년" : `${normalized}개월`;
}

function formatSubscriptionPlanProfileLimit(plan: Pick<SubscriptionPlan, "profileLimit">) {
  return plan.profileLimit === null ? "무제한" : `${plan.profileLimit}개`;
}

function formatSubscriptionPlanPolicy(plan: Pick<SubscriptionPlan, "freeUpTo">) {
  if (plan.freeUpTo === null) return "모든 유료/PDF 서비스 무료";
  return `일반 ${plan.freeUpTo}코인 이하 이용 · PDF ${plan.freeUpTo}코인 할인`;
}

function formatSubscriptionPlanValueLine(plan: Pick<SubscriptionPlan, "tier" | "coins" | "durationMonths">) {
  const duration = formatSubscriptionDurationLabel(plan.durationMonths);
  if (plan.tier === "family") return `Family ${plan.coins.toLocaleString("ko-KR")}코인 가치 / ${duration}`;
  return `일반 서비스 한도 ${plan.coins.toLocaleString("ko-KR")} 기준 / ${duration}`;
}

function mapMonthlyCreditLedgerLabel(type: MonthlyCreditLedgerItem["type"]) {
  const normalized = String(type || "").trim().toUpperCase();
  if (normalized.includes("REFUND")) {
    return { label: "이벤트 월정석 환불", cls: "bg-cyan-100 text-cyan-800 border-cyan-300", prefix: "+" };
  }
  if (normalized === "MONTHLY_CREDIT_SPEND") {
    return { label: "이벤트 월정석 사용", cls: "bg-rose-100 text-rose-700 border-rose-300", prefix: "-" };
  }
  return { label: "이벤트 월정석 지급", cls: "bg-emerald-100 text-emerald-800 border-emerald-300", prefix: "+" };
}

function isMonthlyCreditPayment(payment: Pick<PaymentHistoryItem, "paymentMethod" | "accessType">) {
  const method = String(payment.paymentMethod || "").trim().toLowerCase();
  const accessType = String(payment.accessType || "").trim().toLowerCase();
  return method === "monthly_credit" || method === "monthly" || accessType === "membership_credit";
}

function formatPaymentMethodLabel(payment: PaymentHistoryItem) {
  if (isMonthlyCreditPayment(payment)) return "이벤트 월정석";
  const method = String(payment.paymentMethodLabel || payment.paymentMethod || "").trim();
  const normalized = method.toLowerCase();
  if (!method) return "-";
  if (normalized === "card_general" || normalized === "card") return "카드 결제";
  if (normalized === "virtual_account") return "가상계좌";
  if (normalized === "kakaopay") return "카카오페이";
  if (normalized === "naverpay") return "네이버페이";
  return method;
}

function formatPaymentMonthlyCreditHint(payment: PaymentHistoryItem) {
  const cost = Math.max(0, Math.floor(Number(payment.membershipCreditCost || 0)));
  if (cost <= 0) return "";
  const amount = `${cost.toLocaleString("ko-KR")}개`;
  if (isMonthlyCreditPayment(payment)) return `이벤트 월정석 ${amount} 사용`;
  return `이벤트 월정석 보너스 기준 ${amount}`;
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
  });
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

  return {
    tier,
    source: normalizeSubscriptionSource(value.source ?? nested.source),
    isActive,
    expiresAt,
    profileLimit: Number.isFinite(profileLimit) && profileLimit >= 0 ? Math.floor(profileLimit) : 1,
    ...(durationMonths ? { durationMonths } : {}),
    lowBalanceWarning: !!(value.lowBalanceWarning ?? nested.lowBalanceWarning),
    cancelAtPeriodEnd: !!(value.cancelAtPeriodEnd ?? nested.cancelAtPeriodEnd),
    cancelRequestedAt,
    freeLimit: Number.isFinite(freeLimit) && freeLimit >= 0 ? Math.floor(freeLimit) : 0,
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
  return {
    ...next,
    durationMonths: next.durationMonths ?? prev.durationMonths,
    freeLimit: next.freeLimit ?? prev.freeLimit ?? 0,
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
  const monthlyCredits = Number(
    (typeof node.monthlyCredits === "number" ? node.monthlyCredits : undefined)
    ?? (typeof node.membershipCreditBalance === "number" ? node.membershipCreditBalance : undefined)
    ?? (typeof payload?.user?.monthlyCredits === "number" ? payload.user.monthlyCredits : undefined)
    ?? 0,
  );
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
    monthlyCredits: Number.isFinite(monthlyCredits) ? monthlyCredits : 0,
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
  monthlyCredits,
  isProcessing,
  isFlowerAdminMode,
  adminTestTier,
  onChangeAdminTestTier,
  highlightedPlan,
}: {
  subscription:  SubscriptionStatus;
  onSubscribe:   (plan: SubscriptionPlan) => void;
  onCancelSubscription: (resume: boolean) => void;
  monthlyCredits: number;
  isProcessing:  boolean;
  isFlowerAdminMode: boolean;
  adminTestTier: AdminTestTier;
  onChangeAdminTestTier: (tier: AdminTestTier) => void;
  highlightedPlan: "standard" | "premium" | "vvip" | "family" | null;
}) {
  type PlanThemeKey = "amber" | "rose" | "purple";
  const planThemeMap: Record<PlanThemeKey, {
    card: string; label: string; badge: string; freeTag: string; btn: string; icon: string;
  }> = {
    amber: {
      card:    "border-[#e9d18a]/38 bg-[#0d1430]/78",
      label:   "text-[#f3dd9a]",
      badge:   "from-[#d8bd72] to-[#f5df9d]",
      freeTag: "bg-[#f3dd9a]/15 text-[#f3dd9a] ring-1 ring-[#f3dd9a]/45",
      btn:     "from-[#d8bd72] to-[#f5df9d] text-[#151832] shadow-[0_8px_18px_rgba(243,221,154,0.24)]",
      icon:    "🌔",
    },
    rose: {
      card:    "border-[#cab8ff]/38 bg-[#101438]/78",
      label:   "text-[#cab8ff]",
      badge:   "from-[#cab8ff] to-[#f3dd9a]",
      freeTag: "bg-[#cab8ff]/15 text-[#cab8ff] ring-1 ring-[#cab8ff]/45",
      btn:     "from-[#cab8ff] to-[#f3dd9a] text-[#151832] shadow-[0_8px_18px_rgba(202,184,255,0.24)]",
      icon:    "🌕",
    },
    purple: {
      card:    "border-[#8cb8ff]/38 bg-[#111638]/78",
      label:   "text-[#8cb8ff]",
      badge:   "from-[#f3dd9a] via-[#cab8ff] to-[#8cb8ff]",
      freeTag: "bg-[#8cb8ff]/15 text-[#dbe8ff] ring-1 ring-[#8cb8ff]/45",
      btn:     "from-[#f3dd9a] via-[#cab8ff] to-[#8cb8ff] text-[#151832] shadow-[0_8px_18px_rgba(140,184,255,0.24)]",
      icon:    "🌌",
    },
  };

  const expires = subscription.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const adminTierPlan = adminTestTier !== "off"
    ? SUBSCRIPTION_PLANS.find((plan) => plan.tier === adminTestTier && plan.durationMonths === 1)
    : null;
  const adminTierPlanSummary = adminTierPlan ? {
    title: adminTierPlan.title,
    profileLimit: formatSubscriptionPlanProfileLimit(adminTierPlan),
    policy: formatSubscriptionPlanPolicy(adminTierPlan),
    coins: adminTierPlan.coins,
  } : null;
  const activeTierRank = subscription.isActive ? getSubscriptionTierRank(subscription.tier) : 0;
  return (
    <section
      aria-label="달빛 이용권 1개월부터 12개월 이용권"
      className="overflow-hidden rounded-[24px] border border-[#d9c77c]/24 bg-[#070b1c] text-slate-100 shadow-[0_24px_70px_rgba(4,7,26,0.48)] ring-1 ring-white/10 backdrop-blur"
    >
      {/* 섹션 헤더 */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ background: "linear-gradient(145deg, rgba(7,11,28,0.98) 0%, rgba(18,25,73,0.94) 42%, rgba(42,27,85,0.9) 72%, rgba(70,48,111,0.82) 100%)" }}
      >
        {/* 제목 */}
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#cab8ff]">연이의 달빛 이용권 상점</p>
          <h2 className="mt-0.5 text-xl font-bold text-white">연이의 달빛 이용권 상점</h2>
          <p className="mt-1 text-sm text-slate-200">
            달빛 이용권 상품과 이벤트 월정석 잔량을 함께 확인하세요.
          </p>
        </div>

        {/* 핵심 혜택 callout */}
        <div className="mb-4 rounded-lg border border-[#cab8ff]/30 bg-white/[0.07] px-4 py-3 shadow-[inset_0_1px_3px_rgba(255,255,255,0.05)]">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-[#f3dd9a]">
            <span aria-hidden="true">🌙</span> 달빛 이용권의 특별한 이유
          </p>
          <p className="text-[12.5px] leading-relaxed text-slate-200">
            <span className="font-bold text-white">가족·연인·자녀 등 다른 생년월일</span>로 프로필을 추가해도,
            선택한 기간형 이용권 하나로 <span className="font-bold text-white">모든 프로필에서 이용권 혜택을 그대로 이용</span>할 수 있습니다.
          </p>
          <p className="mt-1 text-[11.5px] text-[#cab8ff]">
            이 상품은 자동결제 상품이 아니며, 기간 종료 후 무료 플랜으로 전환됩니다.
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
        <div className="mb-4 rounded-lg border border-[#8cb8ff]/28 bg-[#8cb8ff]/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#dbe8ff]">
            <span aria-hidden="true">ℹ️</span> 이용권 운영 정책
          </p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] text-slate-200">
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>모든 이용권은 선택한 기간에 따라 <strong>결제일로부터 1개월·3개월·6개월·12개월 동안 유효</strong>합니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>스탠다드·프리미엄·VVIP는 일반 유료 서비스가 각 30/50/100코인 이하일 때 이용권으로 이용할 수 있습니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>PDF 서비스는 무료 처리 대신 생성 결제 시 각 등급 한도만큼 자동 할인됩니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>한도 초과 일반 유료 서비스는 상품별 코인 기준 단건 결제로 이용할 수 있습니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>Code Destiny Family는 PDF 포함 모든 기능을 무료로 이용하며, 프로필 수정·삭제도 무료·무제한입니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>기간 종료 후 추가 결제 없이 무료 플랜으로 전환됩니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>월정석 잔량은 신규 가입·이벤트로만 지급되며 구매하거나 충전할 수 없습니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>이용권 전용 콘텐츠 열람 시 서비스 이용이 시작되며, 7일 이내라도 이용 기록이 있으면 전액 환불이 제한될 수 있습니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>콘텐츠 진입 전 안내 팝업에서 <strong>[확인]</strong>을 누르면 서비스 개시 및 환불 제한 조건에 동의한 것으로 처리됩니다.</li>
            <li className="flex items-start gap-1.5 font-bold text-rose-600"><span className="mt-0.5 flex-shrink-0">·</span><strong>자동결제 없는 기간형 이용권</strong>이며, 결제/환불 기준은 이용약관(환불정책) 조항을 따릅니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>콘텐츠 생성이 시작되었거나 결과가 정상 제공된 경우 디지털 콘텐츠 특성상 환불이 제한될 수 있습니다.</li>
          </ul>
        </div>

        {isFlowerAdminMode && (
          <div className="mb-4 rounded-[14px] border border-violet-300 bg-violet-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-violet-800">
              <span aria-hidden="true">🧪</span> 관리자 이용권 티어 테스트 모드
            </p>
            <p className="mt-1 text-[11.5px] text-violet-700">
              관리자 모드는 항상 프리패스로 동작하며, 아래 티어를 선택하면 이용권 상품 기준(프로필 한도/무료 한도/콘텐츠 기준)이 해당 티어로 시뮬레이션됩니다.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {([
                { id: "off", label: "해제" },
                { id: "standard", label: "스탠다드 꿀" },
                { id: "premium", label: "프리미엄 꿀" },
                { id: "vvip", label: "VVIP 꿀단지" },
                { id: "family", label: "Code Destiny Family" },
              ] as Array<{ id: AdminTestTier; label: string }>).map((mode) => {
                const active = adminTestTier === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onChangeAdminTestTier(mode.id)}
                    className={[
                      "rounded-full px-3 py-1.5 text-[11.5px] font-bold transition",
                      active
                        ? "bg-violet-600 text-white shadow-[0_4px_12px_rgba(124,58,237,0.35)]"
                        : "bg-white text-violet-700 ring-1 ring-violet-300 hover:bg-violet-100",
                    ].join(" ")}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 rounded-[12px] border border-violet-200 bg-white/85 px-3 py-2 text-[11.5px] text-violet-800">
              {adminTierPlanSummary ? (
                <p>
                  현재 시뮬레이션: <strong>{adminTierPlanSummary?.title || ""}</strong>
                  <span className="mx-1">·</span>프로필 <strong>{adminTierPlanSummary?.profileLimit || ""}</strong>
                  <span className="mx-1">·</span><strong>{adminTierPlanSummary?.policy || ""}</strong>
                  <span className="mx-1">·</span>이용 기준 <strong>{adminTierPlanSummary?.coins || ""}</strong>
                </p>
              ) : (
                <p>현재 시뮬레이션: 해제 (관리자 프리패스만 적용)</p>
              )}
            </div>
          </div>
        )}

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
      <div className="mx-5 mb-4 rounded-[20px] border border-white/12 bg-white/[0.07] p-4 shadow-[0_12px_28px_rgba(7,10,28,0.22)]">
        {/* 제목 행 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl leading-none">🆓</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] font-black uppercase tracking-widest text-slate-400">Free Plan</p>
            <p className="text-[15px] font-black text-white leading-tight">무료 플랜</p>
          </div>
          {subscription.tier === "free" && (
            <span className="flex-shrink-0 rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-bold text-neutral-600">현재 플랜</span>
          )}
        </div>

        {/* 무료 제공 항목 */}
        <div className="mb-3 rounded-[14px] border border-emerald-300/30 bg-emerald-300/10 px-3.5 py-3">
          <p className="mb-2 text-[11px] font-extrabold text-emerald-100">✅ 무료로 지금 바로 즐길 수 있어요</p>
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
                <span className="text-[11.5px] text-slate-200">
                  <span className="font-semibold">{text}</span>
                  <span className="ml-1 text-[10.5px] text-slate-400">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 잠긴 콘텐츠 — 이용권 훅 */}
        <div className="mb-3 rounded-[14px] border border-white/12 bg-white/[0.06] px-3.5 py-3">
          <p className="mb-2 text-[11px] font-extrabold text-slate-300">🔒 이용권 선택 후 잠금이 해제돼요</p>
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
                <span className="text-[11.5px] text-slate-400 line-through decoration-slate-500">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 마케팅 훅 CTA 블록 */}
        <div className="rounded-[14px] border border-[#f3dd9a]/40 bg-[#f3dd9a]/10 px-4 py-3.5">
          <p className="text-[12.5px] font-black text-[#f3dd9a] leading-snug mb-1.5">
            맛보기만으로도 이 정도인데,<br />
            <span className="text-white">기간형 이용권으로 얼마나 깊이 볼 수 있을까요?</span> 🌙
          </p>
          <p className="text-[11.5px] text-slate-200 leading-relaxed mb-2.5">
            오늘 운세가 마음에 걸렸다면, 그건 당신의 직감이 맞는 거예요.
            <br />Honey 이용권 하나로 <strong>사주·타로·점성술의 진짜 깊이</strong>를 경험해 보세요.
            가족과 연인의 운명까지, <strong>선택한 기간 동안 모든 프로필</strong>에 혜택이 적용됩니다.
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
      <div className="grid gap-3 p-5 pt-0 sm:grid-cols-2 xl:grid-cols-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const theme = planThemeMap[plan.theme];
          const isCurrentActive = subscription.isActive && subscription.tier === plan.tier;
          const isHighlighted = highlightedPlan === plan.tier;
          const planTierRank = getSubscriptionTierRank(plan.tier);
          const lowerTierBlocked = !isFlowerAdminMode && activeTierRank > 0 && planTierRank < activeTierRank;
          const ctaDisabled = isProcessing || lowerTierBlocked;
          const monthlyCreditCost = getSubscriptionMonthlyCreditCost(plan);
          const durationLabel = formatSubscriptionDurationLabel(plan.durationMonths);
          return (
            <div
              key={plan.id}
              className={[
                "relative flex flex-col rounded-lg border p-3.5 transition-shadow",
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
              <p className={`mt-2 text-[10.5px] font-black uppercase tracking-wider ${theme.label}`}>{plan.title}</p>

              {/* 가격 */}
              <p className="mt-2 flex flex-wrap items-center gap-1 text-base font-black text-white">
                <CoinIcon size="md" />
                {formatSubscriptionPlanValueLine(plan)}
              </p>
              <p className="text-[11px] text-slate-300">
                월 단가 {formatWon(Math.round(plan.wonPrice / plan.durationMonths))} · 결제 금액 {formatWon(plan.wonPrice)}
                {plan.wonPrice < plan.baseWonPrice * plan.durationMonths ? ` · ${formatWon(plan.baseWonPrice * plan.durationMonths - plan.wonPrice)} 절약` : ""}
              </p>

              {/* 커피 한 잔 뱃지 — freeUpTo 50 이하 플랜(스탠다드)에만 */}
              {plan.freeUpTo !== null && plan.freeUpTo <= 50 && plan.tier === "standard" && plan.durationMonths === 1 && (
                <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-[#f3dd9a]/18 px-2.5 py-1 text-[11px] font-bold text-[#f3dd9a]">
                  ☕ 커피 2잔 값으로 1개월
                </div>
              )}

              {/* 무료 이용 범위 태그 */}
              <div className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${theme.freeTag}`}>
                🆓{" "}
                {formatSubscriptionPlanPolicy(plan)}
              </div>

              {/* 기능 목록 */}
              <ul className="mt-3 flex-1 space-y-1">
                {plan.features.map((f) => {
                  const isBonus = f.startsWith("🎁");
                  const isKey   = !isBonus && (f.includes("무료") || f.includes("해금"));
                  return (
                    <li
                      key={f}
                      className={[
                        "flex items-start gap-1.5 text-[11px]",
                        isBonus ? "font-semibold text-emerald-700"
                          : isKey  ? `font-semibold ${theme.label}`
                          : "text-slate-200",
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
                  "mt-4 w-full rounded-lg px-3 py-2.5 text-[13px] font-black shadow transition-all",
                  "hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
                  isCurrentActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_5px_14px_rgba(16,185,129,0.35)]"
                    : `bg-gradient-to-r ${theme.btn}`,
                ].join(" ")}
              >
                {isCurrentActive
                  ? `${durationLabel} 이용권 연장`
                  : lowerTierBlocked
                    ? "상위 티어 사용 중 (구매 불가)"
                  : isHighlighted
                    ? `${theme.icon} ${durationLabel} 이용권 구매하기`
                    : `${theme.icon} ${durationLabel} 이용권 구매하기`}
              </button>

              {monthlyCredits < monthlyCreditCost && !lowerTierBlocked && (
                <p className="mt-1 text-[11px] font-semibold text-amber-200/80">
                  이벤트 월정석 보너스 현재 {monthlyCredits.toLocaleString("ko-KR")}개
                </p>
              )}

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
            {formatSubscriptionDurationLabel(subscription.durationMonths)} 이용권 활성화
          </p>
          <p className="mt-1 text-[11.5px] text-violet-700">
            {`${expires || "만료일"}까지 혜택이 유지됩니다. 이 상품은 자동결제 상품이 아니며 기간 종료 후 무료 플랜으로 전환됩니다.`}
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

      <div className="px-5 pb-5 space-y-1">
        <p className="text-[11px] text-[#9B7040]">✅ 결제 즉시 이용권 혜택이 활성화되며 <strong>선택한 기간 동안 유효</strong>합니다.</p>
        <p className="text-[11px] text-rose-600 font-bold">이 상품은 자동결제 상품이 아니며 기간 종료 후 무료 플랜으로 전환됩니다.</p>
        <p className="text-[11px] text-[#9B7040]">월정석 잔량은 이벤트 보너스이며 구매·충전할 수 없습니다.</p>
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

/* ══════════════════════════════════════════════════════════════════
  서브 컴포넌트: 콘텐츠 가치 단위 카드
  콘텐츠 기준은 가격 산정용 내부 단위로만 안내합니다.
══════════════════════════════════════════════════════════════════ */

function WalletCard({ name, monthlyCredits }: { name: string; monthlyCredits: number }) {
  const monthlyStoneBalance = Math.max(0, Math.floor(Number(monthlyCredits || 0)));

  return (
    <section
      aria-label="콘텐츠 가치 단위 안내"
      className="overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.08] text-slate-100 shadow-[0_18px_46px_rgba(7,10,28,0.35)] backdrop-blur"
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
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#cab8ff]">
                연이의 달빛 이용권 상점
              </p>
              <p className="mt-0.5 text-[15px] font-bold text-white">{name} 님의 달빛 이용권 상점</p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1 sm:items-end">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#f3dd9a]">
              보너스 월정석 잔량
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[22px] font-black leading-none text-white">
                {monthlyStoneBalance.toLocaleString("ko-KR")}
              </span>
            </div>
            <p className="max-w-[280px] text-[11px] text-slate-200 sm:text-right">
              신규 가입·이벤트로 지급되는 보너스 월정석 잔량입니다. 기본 결제는 상품별 코인 기준 단건 결제로 진행됩니다.
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
        코인 기준 결제 · 이벤트 월정석 보너스 병행
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
  /** Toast ID 증가용 카운터 */
  const toastCounter = useRef(0);

  /* ── API 기본 URL ─────────────────────────────────────────────── */
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  /* ── 상태 ──────────────────────────────────────────────────────── */
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentMonthlyCredits, setCurrentMonthlyCredits] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<PointPackage>(POINT_PACKAGES[0]);
  const [selectedMethod, setSelectedMethod] = useState<string>("card_general");

  const [isBooting, setIsBooting] = useState(true);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingVariant, setProcessingVariant] = useState<PaymentLoadingVariant>("subscription");
  const [processingText, setProcessingText] = useState(
    "코인 기준 달빛 이용권 결제 정보를 확인하고 있습니다.",
  );
  const {
    startProcessing: showProcessingOverlay,
    stopProcessing: hideProcessingOverlay,
  } = usePaymentProcessing();
  const [showStarBurst, setShowStarBurst] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [monthlyCreditLedgers, setMonthlyCreditLedgers] = useState<MonthlyCreditLedgerItem[]>([]);
  const [cancelingPaymentId, setCancelingPaymentId] = useState<string | null>(null);
  const [adminTestTier, setAdminTestTier] = useState<AdminTestTier>("off");
  const isFlowerAdminMode = authUser?.role === "admin" && isFlowerAdminSessionClient();
  const [landingPlanPreset, setLandingPlanPreset] = useState<"standard" | "premium" | "vvip" | "family" | null>(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [pendingSubscriptionPaymentPlan, setPendingSubscriptionPaymentPlan] = useState<SubscriptionPlan | null>(null);
  const [pendingMonthlyCreditPlan, setPendingMonthlyCreditPlan] = useState<SubscriptionPlan | null>(null);
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
  const pendingMonthlyCreditCost = pendingMonthlyCreditPlan
    ? getSubscriptionMonthlyCreditCost(pendingMonthlyCreditPlan)
    : 0;
  const pendingSubscriptionPaymentMonthlyCreditCost = pendingSubscriptionPaymentPlan
    ? getSubscriptionMonthlyCreditCost(pendingSubscriptionPaymentPlan)
    : 0;

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

  const showPassAppliedStage = useCallback(async (message = "이용권 적용이 완료되었습니다.") => {
    setProcessingStage(message, "pass-applied");
    await new Promise((resolve) => window.setTimeout(resolve, 980));
  }, [setProcessingStage]);

  useEffect(() => {
    return () => {
      hideProcessingOverlay();
    };
  }, [hideProcessingOverlay]);

  const refreshWalletFromServer = useCallback(async () => {
    const monthlyCredits = await refreshBillingBalance();
    if (!Number.isFinite(Number(monthlyCredits))) {
      throw new Error("billing_balance_sync_failed");
    }
    const normalizedMonthlyCredits = Math.max(0, Math.floor(Number(monthlyCredits)));
    setCurrentMonthlyCredits(normalizedMonthlyCredits);
    return normalizedMonthlyCredits;
  }, []);

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
          durationMonths: sub.durationMonths,
          expiresAt: sub.expiresAt || null,
        },
      };
      const payload = JSON.stringify({
        tier: sub.tier || "free",
        isActive: !!sub.isActive,
        profileLimit: sub.profileLimit ?? 1,
        durationMonths: sub.durationMonths,
        expiresAt: sub.expiresAt || null,
      });
      persistSanitizedAuthUser(nextUser);
      const scopedKey = `fortune_profile_subscription::${scope}`;
      localStorage.setItem(scopedKey, payload);
      localStorage.setItem("fortune_profile_subscription", payload);
      localStorage.setItem("fortune_profile_subscription_owner", scope);

      const eventPayload = { source: "points-page", event: "subscription", at: Date.now() };
      window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: eventPayload }));
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("code-destiny-auth-sync");
        channel.postMessage(eventPayload);
        channel.close();
      }
    } catch { /* noop */ }
  }, []);

  /* ── 서버에서 월정석/주문 상태 조회 ─────────────────────────────── */
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
        throw new Error(payload.message || "결제 및 이벤트 월정석 정보를 불러오지 못했습니다.");
      }

      const normalized = normalizeMePayload(payload);
      const nextUser = normalized.user;
      const refreshedMonthlyCredits = await refreshWalletFromServer().catch(() => null);
      if (!Number.isFinite(Number(refreshedMonthlyCredits))) {
        setCurrentMonthlyCredits(Math.max(0, Math.floor(Number(normalized.monthlyCredits || 0))));
      }
      if (normalized.subscription) {
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
      setMonthlyCreditLedgers(
        Array.isArray(normalized.monthlyCreditLedgers)
          ? normalized.monthlyCreditLedgers.filter((entry) => entry && typeof entry === "object").slice(0, 20)
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
    [apiBase, persistSubscriptionCache, refreshWalletFromServer, router],
  );

  const syncSubscriptionAppliedStage = useCallback(async () => {
    setProcessingStage("이용권 적용을 계정에 반영하고 있습니다.", "subscription");
    await Promise.allSettled([
      fetchMyPointState(),
      refreshWalletFromServer(),
    ]);
    await showPassAppliedStage();
  }, [fetchMyPointState, refreshWalletFromServer, setProcessingStage, showPassAppliedStage]);

  /* ── 초기 인증 토큰 확인 ───────────────────────────────────────── */
  useEffect(() => {
    const parsedUser = readSanitizedAuthUser() as AuthUser | null;

    if (parsedUser) {
      setAuthUser(parsedUser);
      const cachedMonthlyCredits = Number(
        parsedUser.monthlyCredits
        ?? parsedUser.profileSubscription?.membershipCreditBalance
        ?? NaN,
      );
      if (Number.isFinite(cachedMonthlyCredits)) {
        setCurrentMonthlyCredits(Math.max(0, Math.floor(cachedMonthlyCredits)));
      }
      const cachedSubscription = normalizeSubscriptionStatusFromPayload(parsedUser.profileSubscription);
      if (cachedSubscription?.isActive) {
        setSubscription((prev) => mergeSubscriptionState(prev, cachedSubscription));
      }
    }

    const isAdminSession = parsedUser?.role === "admin" && isFlowerAdminSessionClient();
    setAdminTestTier(isAdminSession ? readAdminTestTierClient() : "off");

    setIsBooting(false);
  }, [router]);

  useEffect(() => {
    if (authUser?.role !== "admin" || !isFlowerAdminSessionClient()) return;
    saveAdminTestTierClient(adminTestTier);
  }, [adminTestTier, authUser]);

  /* ── 부팅 후 월정석/주문 정보 로드 ─────────────────────────────── */
  useEffect(() => {
    if (isBooting) return;

    fetchMyPointState().catch((error) => {
      pushToast("error", getErrorMessage(error, "결제 및 이벤트 월정석 정보를 불러오지 못했습니다."));
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
    }
    const isAdminSession = authUser?.role === "admin" && isFlowerAdminSessionClient();
    const flowerAdminToken = isAdminSession ? getFlowerAdminTokenClient() : "";
    const adminHeaders = flowerAdminToken ? {
      "x-admin-token": flowerAdminToken,
      ...(adminTestTier !== "off" ? { "x-admin-subscription-tier": adminTestTier } : {}),
    } : {};
    authFetch(`${apiBase}/api/subscription/status`, {
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
        if (!normalizedSubscription) return;
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
  }, [isBooting, apiBase, adminTestTier, authUser, persistSubscriptionCache]);

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
        `${formatWon(payment.paymentAmount)} 결제를 취소할까요?\n이미 사용한 이벤트 월정석 또는 이용 내역이 있으면 취소가 제한될 수 있습니다.`,
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
        ? "모바일 이용권 결제 복귀를 확인하고 있습니다."
        : "모바일 결제 복귀 신호를 확인하고 있습니다...",
      isSubscriptionRedirect ? "subscription" : "confirm",
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
      })
        .then(async (data) => {
          if (data.subscription) {
            const newSub: SubscriptionStatus = {
              tier: data.subscription?.tier || "free",
              source: data.subscription?.source || "card",
              isActive: !!data.subscription?.isActive,
              expiresAt: data.subscription?.expiresAt || null,
              profileLimit: typeof data.subscription?.profileLimit === "number"
                ? data.subscription.profileLimit
                : 1,
              durationMonths: normalizeSubscriptionDurationMonths(data.subscription?.durationMonths ?? pendingSub.durationMonths) ?? pendingSub.durationMonths,
              lowBalanceWarning: false,
              cancelAtPeriodEnd: !!data.subscription?.cancelAtPeriodEnd,
              cancelRequestedAt: data.subscription?.cancelRequestedAt || null,
              freeLimit: 0,
            };
            setSubscription((prev) => ({ ...newSub, freeLimit: prev.freeLimit || 0 }));
            persistSubscriptionCache(newSub);
          }

          clearPendingSubscriptionOrder();
          await syncSubscriptionAppliedStage();
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
    setProcessingStage("결제창을 열기 전 주문 정보를 확인하고 있습니다.", "checkout");

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
        setProcessingStage("결제 승인을 서버에서 검증하고 있습니다.", "confirm");
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
    const isFlowerAdmin = authUser?.role === "admin" && isFlowerAdminSessionClient();
    const flowerAdminToken = getFlowerAdminTokenClient();
    const activeTierRank = subscription.isActive ? getSubscriptionTierRank(subscription.tier) : 0;
    const requestedTierRank = getSubscriptionTierRank(plan.tier);

    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    if (!isFlowerAdmin && activeTierRank > requestedTierRank) {
      pushToast("info", "현재 상위 티어 이용권이 활성화되어 하위 플랜은 신청할 수 없습니다.");
      return;
    }

    const actionLockKey = `subscription:${plan.planId}:${selectedMethod || "card_general"}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    setIsProcessing(true);
    setProcessingStage(`${plan.title} 결제 정보를 확인하고 있습니다.`, "subscription");

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
        setProcessingStage("이용권 결제 승인과 활성화를 확인하고 있습니다.", "subscription");
        const confirmData = await confirmSubscriptionWithServer({
          impUid: paymentId,
          merchantUid: order.merchantUid,
          tier: plan.tier,
          planId: plan.planId,
          durationMonths: plan.durationMonths,
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
            expiresAt: confirmData.subscription?.expiresAt || null,
            profileLimit: typeof confirmData.subscription?.profileLimit === "number"
              ? confirmData.subscription.profileLimit
              : 1,
            durationMonths: normalizeSubscriptionDurationMonths(confirmData.subscription?.durationMonths ?? plan.durationMonths) ?? plan.durationMonths,
            lowBalanceWarning: false,
            cancelAtPeriodEnd: !!confirmData.subscription?.cancelAtPeriodEnd,
            cancelRequestedAt: confirmData.subscription?.cancelRequestedAt || null,
            freeLimit: 0,
          };
          setSubscription((prev) => ({ ...newSub, freeLimit: prev.freeLimit || 0 }));
          persistSubscriptionCache(newSub);
        }

        clearPendingSubscriptionOrder();
        await syncSubscriptionAppliedStage();
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
    const requiredMonthlyCredits = getSubscriptionMonthlyCreditCost(plan);

    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    if (!isFlowerAdminMode && activeTierRank > requestedTierRank) {
      pushToast("info", "현재 상위 티어 이용권이 활성화되어 하위 플랜은 선택할 수 없습니다.");
      return;
    }

    const latestMonthlyCredits = await refreshWalletFromServer().catch(() => currentMonthlyCredits);
    if (latestMonthlyCredits < requiredMonthlyCredits) {
      pushToast("error", `이벤트 월정석 보너스가 부족합니다. 필요: ${requiredMonthlyCredits.toLocaleString("ko-KR")}개`);
      return;
    }

    const requestId = `subscription-monthly:${plan.planId}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const actionLockKey = `subscription-monthly:${plan.planId}`;
    if (!acquirePaymentActionLock(actionLockKey)) return;

    setPendingMonthlyCreditPlan(null);
    setIsProcessing(true);
    setProcessingStage(`${plan.title}을 이벤트 월정석 보너스로 활성화하고 있습니다.`, "monthly");

    try {
      const confirmData = await confirmSubscriptionWithServer({
        merchantUid: requestId,
        tier: plan.tier,
        planId: plan.planId,
        durationMonths: plan.durationMonths,
        amount: plan.wonPrice,
        currency: "KRW",
        productType: plan.productType,
        paymentMethod: "monthly_credit",
        requestId,
      });

      if (confirmData.subscription) {
        const newSub: SubscriptionStatus = {
          tier: confirmData.subscription?.tier || "free",
          source: confirmData.subscription?.source || "pass",
          isActive: !!confirmData.subscription?.isActive,
          expiresAt: confirmData.subscription?.expiresAt || null,
          profileLimit: typeof confirmData.subscription?.profileLimit === "number"
            ? confirmData.subscription.profileLimit
            : 1,
          durationMonths: normalizeSubscriptionDurationMonths(confirmData.subscription?.durationMonths ?? plan.durationMonths) ?? plan.durationMonths,
          lowBalanceWarning: false,
          cancelAtPeriodEnd: !!confirmData.subscription?.cancelAtPeriodEnd,
          cancelRequestedAt: confirmData.subscription?.cancelRequestedAt || null,
          freeLimit: 0,
        };
        setSubscription((prev) => ({ ...newSub, freeLimit: prev.freeLimit || 0 }));
        persistSubscriptionCache(newSub);
      }

      await refreshWalletFromServer().catch(() => {});
      if (confirmData.monthlyCreditLedger) {
        setMonthlyCreditLedgers((prev) => [confirmData.monthlyCreditLedger as MonthlyCreditLedgerItem, ...prev].slice(0, 20));
      }

      await syncSubscriptionAppliedStage();
      pushToast("success", confirmData.message || `${plan.title}이 이벤트 월정석 보너스로 활성화되었습니다.`);
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
    } catch (error: unknown) {
      pushToast("error", getErrorMessage(error, "이벤트 월정석 보너스 사용에 실패했습니다."));
    } finally {
      releasePaymentActionLock(actionLockKey);
      setIsProcessing(false);
    }
  };

  const handleSubscriptionCancel = async (resume: boolean) => {
    const isFlowerAdmin = authUser?.role === "admin" && isFlowerAdminSessionClient();
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
    setProcessingStage("이용권 상태를 안전하게 확인하고 있습니다.", "subscription");
    try {
      const res = await authFetch(`${apiBase}/api/fortune/pig-coin/profile-subscription/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(flowerAdminToken ? { "x-admin-token": flowerAdminToken } : {}),
          ...(isFlowerAdmin && adminTestTier !== "off" ? { "x-admin-subscription-tier": adminTestTier } : {}),
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
          expiresAt: data.subscription?.expiresAt || null,
          profileLimit: typeof data.subscription?.profileLimit === "number" ? data.subscription.profileLimit : 1,
          durationMonths: normalizeSubscriptionDurationMonths(data.subscription?.durationMonths) ?? subscription.durationMonths,
          lowBalanceWarning: false,
          cancelAtPeriodEnd: !!data.subscription?.cancelAtPeriodEnd,
          cancelRequestedAt: data.subscription?.cancelRequestedAt || null,
          freeLimit: 0,
        };
        setSubscription((prev) => ({ ...newSub, lowBalanceWarning: prev.lowBalanceWarning, freeLimit: prev.freeLimit || 0 }));
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
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  const plan = pendingSubscriptionPaymentPlan;
                  if (!plan) return;
                  setPendingSubscriptionPaymentPlan(null);
                  void handleSubscribe(plan);
                }}
                className="rounded-[14px] border border-amber-200/45 bg-amber-200 px-4 py-3 text-left text-[#151832] shadow-[0_10px_22px_rgba(243,221,154,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="block text-sm font-black">코인 기준 단건 결제</span>
                <span className="mt-1 block text-[12px] font-semibold">콘텐츠 가치 단위는 코인으로 표시되며 보안 결제창에서 결제합니다.</span>
              </button>
              <button
                type="button"
                disabled={isProcessing || currentMonthlyCredits < pendingSubscriptionPaymentMonthlyCreditCost}
                onClick={() => {
                  const plan = pendingSubscriptionPaymentPlan;
                  if (!plan) return;
                  setPendingSubscriptionPaymentPlan(null);
                  setPendingMonthlyCreditPlan(plan);
                }}
                className="rounded-[14px] border border-white/15 bg-white/[0.08] px-4 py-3 text-left text-slate-100 shadow transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="block text-sm font-black">이벤트 월정석 보너스 사용</span>
                <span className="mt-1 block text-[12px] font-semibold text-slate-200">
                  구매 불가 보너스 · 필요 {pendingSubscriptionPaymentMonthlyCreditCost.toLocaleString("ko-KR")}개 · 현재 {currentMonthlyCredits.toLocaleString("ko-KR")}개
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

      {pendingMonthlyCreditPlan && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="monthlyCreditPassConfirmTitle"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isProcessing) setPendingMonthlyCreditPlan(null);
          }}
        >
          <div className="w-full max-w-sm rounded-[20px] border border-amber-200/35 bg-[#111832] p-5 text-slate-100 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
            <p id="monthlyCreditPassConfirmTitle" className="text-base font-black text-white">
              이벤트 월정석 보너스 사용
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {pendingMonthlyCreditPlan.title} 활성화에 이벤트 월정석 보너스 {pendingMonthlyCreditCost.toLocaleString("ko-KR")}개를 사용합니다.
            </p>
            <div className="mt-4 rounded-[14px] border border-white/10 bg-white/[0.07] px-3 py-2 text-[12px] text-slate-200">
              <p>현재 이벤트 월정석 {currentMonthlyCredits.toLocaleString("ko-KR")}개</p>
              <p>사용 후 예상 잔량 {Math.max(0, currentMonthlyCredits - pendingMonthlyCreditCost).toLocaleString("ko-KR")}개</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setPendingMonthlyCreditPlan(null)}
                className="rounded-[12px] border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isProcessing || currentMonthlyCredits < pendingMonthlyCreditCost}
                onClick={() => handleSubscribeWithMonthlyCredit(pendingMonthlyCreditPlan)}
                className="rounded-[12px] bg-gradient-to-r from-amber-200 to-violet-200 px-3 py-2.5 text-sm font-black text-[#151832] shadow-[0_10px_22px_rgba(243,221,154,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? "처리 중..." : "보너스 사용하기"}
              </button>
            </div>
            {currentMonthlyCredits < pendingMonthlyCreditCost && (
              <p className="mt-3 text-[12px] font-bold text-rose-200">
                이벤트 월정석 보너스 잔량이 부족합니다.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 페이지 콘텐츠 ────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-6xl space-y-5">

        {/* ① 헤더 카드 */}
        <header className="overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.08] shadow-[0_18px_46px_rgba(7,10,28,0.35)] backdrop-blur">
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
                  src="/icons/꿀꿀 운세 로고.webp"
                  sizes="72px"
                  width={72}
                  height={72}
                  alt="달빛 이용권"
                  className="rounded-2xl shadow-[0_0_22px_rgba(243,221,154,0.24)]"
                  priority
                />
                <div>
                  <p className="text-[11px] font-extrabold tracking-[0.22em] text-[#cab8ff] uppercase">
                    연이의 달빛 이용권 상점
                  </p>
                  <h1 className="mt-0.5 text-[22px] font-black text-white sm:text-3xl leading-tight">
                    연이의 달빛 이용권 상점
                  </h1>
                  <p className="mt-1 text-sm text-slate-200">
                    달빛 이용권 상품과 보너스 월정석 잔량을 한 화면에서 확인하세요.
                  </p>
                  <p className="mt-1 text-[12px] text-[#f3dd9a]">
                    기본 결제 단위는 코인이며, 월정석은 신규 가입·이벤트 보너스로만 지급됩니다.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/points/history"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#cab8ff]/45 bg-[#cab8ff]/12 px-4 py-2.5 text-sm font-bold text-[#f3dd9a] shadow-[0_2px_12px_rgba(202,184,255,0.16)] transition-all hover:bg-[#cab8ff]/18 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  📋 이용권 주문 내역
                </Link>
                <Link
                  href="/"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-slate-100 shadow-[0_2px_12px_rgba(7,10,28,0.18)] transition-all hover:bg-white/15 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  ← 서비스 화면으로
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ② 잔액 카드 */}
        <WalletCard name={authUser?.name || "사용자"} monthlyCredits={currentMonthlyCredits} />

        <section className="rounded-[20px] border border-white/12 bg-white/[0.08] p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-white">이벤트 월정석 사용 내역</h3>
            <span className="text-[11px] font-semibold text-slate-300">지급 / 사용 / 잔액</span>
          </div>

          {monthlyCreditLedgers.length === 0 ? (
            <p className="text-sm text-slate-300">아직 이벤트 월정석 사용 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2.5">
              {monthlyCreditLedgers.map((entry) => {
                const typeMeta = mapMonthlyCreditLedgerLabel(entry.type);
                return (
                  <div
                    key={entry.id}
                    className="rounded-[14px] border border-[#EFDCA8] bg-white/90 p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${typeMeta.cls}`}>
                          {typeMeta.label}
                        </span>
                        <p className="truncate text-sm font-bold text-[#5C3A1E]">
                          {entry.reason || entry.serviceKey || "-"}
                        </p>
                      </div>
                      <span className="text-sm font-black text-[#5C3A1E]">
                        {typeMeta.prefix}{formatMonthlyCredits(entry.amount)}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-[11.5px] text-[#7A5230] sm:grid-cols-3">
                      <p>일시: {formatDateTime(entry.createdAt)}</p>
                      <p>이전 잔액: {formatMonthlyCredits(entry.beforeBalance ?? 0)}</p>
                      <p>반영 후: {formatMonthlyCredits(entry.afterBalance ?? 0)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ②-1 이용권 상태 카드 */}
        <SubscriptionStatusCard subscription={subscription} monthlyCredits={currentMonthlyCredits} />

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
          monthlyCredits={currentMonthlyCredits}
          isProcessing={isProcessing}
          isFlowerAdminMode={isFlowerAdminMode}
          adminTestTier={adminTestTier}
          onChangeAdminTestTier={setAdminTestTier}
          highlightedPlan={landingPlanPreset}
        />

        {/* ③ 섹션 구분선 */}
        <section
          aria-label="코인 기준 단건 결제 안내"
          className="rounded-[20px] border border-white/12 bg-white/[0.06] px-5 py-4 text-sm leading-6 text-slate-200"
        >
          일반 유료 서비스는 이용권 한도 이하일 때만 이용권으로 열립니다. PDF 서비스는 결제 시 등급 한도만큼 할인되며, Family는 PDF를 포함한 모든 기능이 무료로 처리됩니다.
        </section>

        <section className="rounded-[20px] border border-white/12 bg-white/[0.08] p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-white">최근 주문 내역</h3>
            <span className="text-[11px] font-semibold text-slate-300">승인번호 / 주문번호 / 영수증</span>
          </div>

          {paymentHistory.length === 0 ? (
            <p className="text-sm text-slate-300">아직 주문 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2.5">
              {paymentHistory.map((payment) => {
                const statusMeta = mapPaymentStatusLabel(payment.status);
                const canCancel = payment.status === "success";
                const paymentMethodHint = formatPaymentMonthlyCreditHint(payment);
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
                      <p>결제시각: {formatDateTime(payment.paidAt || payment.cancelledAt)}</p>
                      <p>결제수단: {formatPaymentMethodLabel(payment)}</p>
                      {paymentMethodHint ? <p>이벤트 월정석 표시: {paymentMethodHint}</p> : null}
                      <p>승인번호: {payment.approvalNumber || "-"}</p>
                      <p>주문번호: {payment.merchantUid || "-"}</p>
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
                  코인 기준 결제 방법 선택
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
              {isProcessing ? "🐷 연결 중..." : "코인 기준 결제를 진행합니다"}
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
