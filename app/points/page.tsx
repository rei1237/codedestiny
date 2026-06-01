"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import WithdrawModal from "../components/WithdrawModal";
import type { GalaxiaPayResult } from "./GalaxiaPayModal";
import { usePaymentProcessing } from "../components/PaymentProcessingContext";
import SubscriptionStatusCard from "./SubscriptionStatusCard";
import { authFetch, clearClientAuthState } from "../_lib/auth-client";
import { getApiBaseUrl } from "../_lib/api-config";
import { persistSanitizedAuthUser, readSanitizedAuthUser, resolveAuthScopeFromUser } from "../_lib/auth-storage";

const GalaxiaPayModal = dynamic(() => import("./GalaxiaPayModal"), { ssr: false });

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
  role?: "user" | "admin";
  points?: number;
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
    tier: "standard" | "premium" | "vvip";
    paymentAmount: number;
    productName: string;
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

type ConfirmSubscriptionResponse = {
  message?: string;
  idempotent?: boolean;
  user?: {
    id: string;
    points: number;
  };
  subscription?: SubscriptionStatus & {
    source?: "coin" | "card";
    customerUid?: string;
    paymentMethod?: string;
    nextBillingAt?: string | null;
    lastBillingStatus?: string;
  };
};

type PaymentHistoryItem = {
  id: string;
  impUid?: string;
  merchantUid?: string;
  paymentAmount: number;
  chargedPoints: number;
  paymentMethod: string;
  status: "pending" | "paid" | "processing" | "success" | "fulfilled" | "retryable" | "failed" | "cancelled" | "refunded";
  paidAt?: string;
  approvalNumber?: string | null;
  receiptUrl?: string | null;
  cancelledAt?: string | null;
};

/* ── 프로필 이용권 타입 ───────────────────────────────────────── */
type SubscriptionTier = "free" | "standard" | "premium" | "vvip";
type AdminTestTier = "off" | "standard" | "premium" | "vvip";

type SubscriptionStatus = {
  tier:               SubscriptionTier;
  source?:            "coin" | "card" | "pass";
  isActive:           boolean;
  expiresAt:          string | null;
  profileLimit:       number; // 0 = unlimited
  lowBalanceWarning?: boolean;
  cancelAtPeriodEnd?: boolean;
  cancelRequestedAt?: string | null;
  freeLimit?: number;
};

type SubscriptionPlan = {
  id:           "standard" | "premium" | "vvip";
  title:        string;
  wonPrice:     number;
  coins:        number;
  profileLimit: number | null; // null = unlimited
  freeUpTo:     number | null; // null = 모든 서비스 무료, number = 해당 코인 이하 무료
  theme:        "amber" | "rose" | "purple";
  features:     string[];
  badge?:       string;
};

type MeResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    balance?: number;
    payments?: PaymentHistoryItem[];
  };
  user?: {
    id: string;
    name: string;
    email: string;
    points: number;
  };
  payments?: PaymentHistoryItem[];
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
  tier: "standard" | "premium" | "vvip";
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
  success?: boolean;
  imp_uid?: string;
  error_msg?: string;
  errorMsg?: string;
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
  }
}

/* ══════════════════════════════════════════════════════════════════
   상수 정의
══════════════════════════════════════════════════════════════════ */

const PORTONE_IMP_CODE = process.env.NEXT_PUBLIC_PORTONE_IMP_CODE || "imp00000000";
// PortOne 관리자 콘솔의 상점/채널 값입니다. V1(IMP.request_pay) 구조를 유지하면서 V2 전환 대비용으로 함께 관리합니다.
const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID || "";
const PORTONE_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || "";
const PORTONE_NOTICE_URL = process.env.NEXT_PUBLIC_PORTONE_NOTICE_URL || "";
const PORTONE_MOBILE_REDIRECT_PATH = process.env.NEXT_PUBLIC_PORTONE_MOBILE_REDIRECT_PATH || "/points";

/* Honey 30일 이용권 플랜 정의 */
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id:           "standard",
    title:        "스탠다드 꿀 30일 이용권",
    wonPrice:     9900,
    coins:        115,
    profileLimit: 3,
    freeUpTo:     30,
    theme:        "amber",
    features:     [
      "프로필 최대 3개 생성",
      "30코인 이하 서비스 무료 이용",
      "모든 프로필에서 해금 콘텐츠 동일 적용",
      "30일간 유효 (기간 기반)",
      "자동결제 없는 30일 이용권",
    ],
  },
  {
    id:           "premium",
    title:        "프리미엄 꿀 30일 이용권",
    wonPrice:     29900,
    coins:        360,
    profileLimit: 7,
    freeUpTo:     50,
    theme:        "rose",
    features:     [
      "프로필 최대 7개 생성",
      "50코인 이하 서비스 무료 이용",
      "모든 프로필에서 해금 콘텐츠 동일 적용",
      "30일간 유효 (기간 기반)",
      "자동결제 없는 30일 이용권",
    ],
    badge:        "추천",
  },
  {
    id:           "vvip",
    title:        "VVIP 꿀단지 30일 이용권",
    wonPrice:     59000,
    coins:        700,
    profileLimit: 15,
    freeUpTo:     100,
    theme:        "purple",
    features:     [
      "프로필 최대 15개 생성",
      "100코인 이하 서비스 무료 이용",
      "모든 프로필에서 해금 콘텐츠 동일 적용",
      "30일간 유효 (기간 기반)",
      "자동결제 없는 30일 이용권",
    ],
    badge:        "VVIP",
  },
];

const SUBSCRIPTION_TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  standard: 1,
  premium: 2,
  vvip: 3,
};

function getSubscriptionTierRank(tier: SubscriptionTier | string | null | undefined) {
  const normalized = String(tier || "free").toLowerCase() as SubscriptionTier;
  return SUBSCRIPTION_TIER_RANK[normalized] ?? 0;
}

const POINT_PACKAGES: PointPackage[] = [
  { id: "saju_unlock_3", title: "사주 잠금 서비스 3개 해제권", amount: 12000, points: 150, featureKey: "usage-pass-saju-unlock-3", description: "사주 잠금 콘텐츠 3개를 필요한 순간에 해제", productType: "usage_pass" },
  { id: "saju_unlock_5", title: "사주 잠금 서비스 5개 해제권", amount: 19000, points: 250, featureKey: "usage-pass-saju-unlock-5", description: "사주 잠금 콘텐츠 5개를 필요한 순간에 해제", productType: "usage_pass" },
  { id: "fortune_30_3", title: "30코인 이하 운세 3회 이용권", amount: 6900, points: 90, featureKey: "usage-pass-fortune-30-3", description: "30코인 이하 운세 서비스를 3회 이용", productType: "usage_pass" },
  { id: "fortune_30_10", title: "30코인 이하 운세 10회 이용권", amount: 22500, points: 300, featureKey: "usage-pass-fortune-30-10", description: "30코인 이하 운세 서비스를 10회 이용", productType: "usage_pass" },
  { id: "fortune_30_30", title: "30코인 이하 운세 30회 이용권", amount: 63000, points: 900, featureKey: "usage-pass-fortune-30-30", description: "30코인 이하 운세 서비스를 30회 이용", productType: "usage_pass" },
  { id: "fortune_50_3", title: "50코인 이하 운세 3회 이용권", amount: 11500, points: 150, featureKey: "usage-pass-fortune-50-3", description: "50코인 이하 운세 서비스를 3회 이용", productType: "usage_pass" },
  { id: "fortune_50_10", title: "50코인 이하 운세 10회 이용권", amount: 37500, points: 500, featureKey: "usage-pass-fortune-50-10", description: "50코인 이하 운세 서비스를 10회 이용", productType: "usage_pass" },
  { id: "fortune_50_30", title: "50코인 이하 운세 30회 이용권", amount: 105000, points: 1500, featureKey: "usage-pass-fortune-50-30", description: "50코인 이하 운세 서비스를 30회 이용", productType: "usage_pass" },
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
    if (raw === "standard" || raw === "premium" || raw === "vvip") return raw;
  } catch {}
  return "off";
}

function saveAdminTestTierClient(tier: AdminTestTier) {
  if (typeof window === "undefined") return;
  localStorage.setItem("flower_admin_test_tier", tier);
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "kakao",            label: "카카오페이",                    logo: "🟨", desc: "간편 결제",                          group: "domestic" },
  { id: "galaxia",          label: "갤럭시아 일반결제",              logo: "💳", desc: "카드사 선택 결제",                    group: "domestic" },
  { id: "galaxia_artmoney", label: "갤럭시아 아트머니",              logo: "🟣", desc: "카드사 선택 + 카카오페이/네이버페이", group: "domestic" },
  { id: "naverpay",         label: "네이버페이",                    logo: "🟩", desc: "네이버 간편 결제",                    group: "domestic" },
  { id: "card_general",     label: "일반 신용카드",                 logo: "🔵", desc: "국내 카드 결제",                       group: "domestic" },
  { id: "paypal",           label: "PayPal",                        logo: "🅿️", desc: "해외 결제",                           group: "global"   },
  { id: "applepay",         label: "Apple Pay",                     logo: "🍎", desc: "포트원 지원 PG 기준",                  group: "global"   },
  { id: "googlepay",        label: "Google Pay",                    logo: "🟢", desc: "포트원 지원 PG 기준",                  group: "global"   },
];

/* ══════════════════════════════════════════════════════════════════
   유틸리티 함수
══════════════════════════════════════════════════════════════════ */

function formatPoints(points: number) {
  return `${Number(points || 0).toLocaleString("ko-KR")}코인`;
}

function formatWon(amount: number) {
  return `${Number(amount || 0).toLocaleString("ko-KR")}원`;
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

function normalizeMePayload(payload: MeResponse) {
  const node = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const user = payload?.user;
  const balance = Number(
    (typeof node.balance === "number" ? node.balance : undefined)
    ?? (typeof user?.points === "number" ? user.points : 0),
  );
  const payments = Array.isArray(node.payments)
    ? node.payments
    : (Array.isArray(payload?.payments) ? payload.payments : []);

  return {
    user,
    balance: Number.isFinite(balance) ? balance : 0,
    payments,
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
    if (window.IMP) { resolve(); return; }
    const scriptId = "portone-iamport-sdk";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("결제 SDK를 불러오지 못했습니다.")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.iamport.kr/v1/iamport.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("결제 SDK를 불러오지 못했습니다."));
    document.body.appendChild(script);
  });
}

function resolvePgConfig(methodId: string) {
  const overrides = {
    kakao:         process.env.NEXT_PUBLIC_PORTONE_PG_KAKAO,
    galaxia:       process.env.NEXT_PUBLIC_PORTONE_PG_GALAXIA,
    galaxia_artmoney: process.env.NEXT_PUBLIC_PORTONE_PG_GALAXIA_ARTMONEY,
    naverpay:      process.env.NEXT_PUBLIC_PORTONE_PG_NAVERPAY,
    card_general:  process.env.NEXT_PUBLIC_PORTONE_PG_CARD,
    paypal:        process.env.NEXT_PUBLIC_PORTONE_PG_PAYPAL,
    applepay:      process.env.NEXT_PUBLIC_PORTONE_PG_APPLEPAY,
    googlepay:     process.env.NEXT_PUBLIC_PORTONE_PG_GOOGLEPAY,
  } as Record<string, string | undefined>;

  const galaxiaMid = process.env.NEXT_PUBLIC_GALAXIA_MID || "";
  const defaults: Record<string, { pg: string; payMethod: string }> = {
    kakao:         { pg: overrides.kakao         || "kakaopay.TC0ONETIME",                payMethod: "card"   },
    galaxia:       { pg: overrides.galaxia || (galaxiaMid ? `galaxia.${galaxiaMid}` : "galaxia"), payMethod: "card"   },
    galaxia_artmoney: { pg: overrides.galaxia_artmoney || overrides.galaxia || (galaxiaMid ? `galaxia.${galaxiaMid}` : "galaxia"), payMethod: "card" },
    naverpay:      { pg: overrides.naverpay       || "naverpay",                          payMethod: "card"   },
    card_general:  { pg: overrides.card_general   || overrides.galaxia || (galaxiaMid ? `galaxia.${galaxiaMid}` : "galaxia"), payMethod: "card"   },
    paypal:        { pg: overrides.paypal         || "paypal",                            payMethod: "paypal" },
    applepay:      { pg: overrides.applepay       || overrides.galaxia || (galaxiaMid ? `galaxia.${galaxiaMid}` : "galaxia"), payMethod: "card"   },
    googlepay:     { pg: overrides.googlepay      || overrides.galaxia || (galaxiaMid ? `galaxia.${galaxiaMid}` : "galaxia"), payMethod: "card"   },
  };
  return defaults[methodId] || defaults.galaxia;
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
}

/* ══════════════════════════════════════════════════════════════════
   서브 컴포넌트: 프로필 이용권 섹션
══════════════════════════════════════════════════════════════════ */

function SubscriptionSection({
  subscription,
  onSubscribe,
  onCancelSubscription,
  isProcessing,
  isFlowerAdminMode,
  adminTestTier,
  onChangeAdminTestTier,
  highlightedPlan,
}: {
  subscription:  SubscriptionStatus;
  onSubscribe:   (plan: SubscriptionPlan) => void;
  onCancelSubscription: (resume: boolean) => void;
  isProcessing:  boolean;
  isFlowerAdminMode: boolean;
  adminTestTier: AdminTestTier;
  onChangeAdminTestTier: (tier: AdminTestTier) => void;
  highlightedPlan: "standard" | "premium" | "vvip" | null;
}) {
  type PlanThemeKey = "amber" | "rose" | "purple";
  const planThemeMap: Record<PlanThemeKey, {
    card: string; label: string; badge: string; freeTag: string; btn: string; icon: string;
  }> = {
    amber: {
      card:    "border-amber-300 bg-gradient-to-b from-amber-50/50 to-white",
      label:   "text-amber-800",
      badge:   "from-amber-500 to-yellow-400",
      freeTag: "bg-amber-100 text-amber-800 ring-1 ring-amber-400/50",
      btn:     "from-[#C9A84C] to-[#F0C830] shadow-[0_6px_16px_rgba(160,120,0,0.32)]",
      icon:    "🍯",
    },
    rose: {
      card:    "border-rose-300 bg-gradient-to-b from-rose-50/50 to-white",
      label:   "text-rose-700",
      badge:   "from-rose-500 to-amber-500",
      freeTag: "bg-rose-100 text-rose-800 ring-1 ring-rose-400/50",
      btn:     "from-rose-500 to-amber-400 shadow-[0_6px_16px_rgba(220,60,60,0.32)]",
      icon:    "🌹",
    },
    purple: {
      card:    "border-purple-300 bg-gradient-to-b from-purple-50/50 to-white",
      label:   "text-purple-700",
      badge:   "from-purple-600 to-violet-500",
      freeTag: "bg-purple-100 text-purple-800 ring-1 ring-purple-400/50",
      btn:     "from-purple-600 to-violet-600 shadow-[0_6px_16px_rgba(120,50,200,0.35)]",
      icon:    "👑",
    },
  };

  const expires = subscription.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  const adminTierPlan = adminTestTier !== "off"
    ? SUBSCRIPTION_PLANS.find((plan) => plan.id === adminTestTier)
    : null;
  const activeTierRank = subscription.isActive ? getSubscriptionTierRank(subscription.tier) : 0;

  return (
    <section
      aria-label="Honey 이용권 30일 이용권"
      className="rounded-[24px] border border-[#EDDBA3] bg-white/90 overflow-hidden shadow-[0_8px_32px_rgba(120,80,10,0.10)]"
    >
      {/* 섹션 헤더 */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ background: "linear-gradient(135deg, #FFFDF7 0%, #FFF9EC 100%)" }}
      >
        {/* 제목 */}
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#A0700A]">Honey 이용권 Pass</p>
          <h2 className="mt-0.5 text-xl font-bold text-[#5C3A1E]">🍯 Honey 이용권 30일 이용권</h2>
          <p className="mt-1 text-sm text-[#7A5230]">
            기존 혜택은 유지하고, 자동결제 없이 30일 동안 이용권을 이용하세요.
          </p>
        </div>

        {/* 핵심 혜택 callout */}
        <div className="mb-4 rounded-[14px] border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 px-4 py-3 shadow-[inset_0_1px_3px_rgba(180,130,0,0.08)]">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-amber-800">
            <span aria-hidden="true">🍯</span> Honey 이용권의 특별한 이유
          </p>
          <p className="text-[12.5px] leading-relaxed text-[#6B4410]">
            <span className="font-bold text-[#8B5E0A]">가족·연인·자녀 등 다른 생년월일</span>로 프로필을 추가해도,
            30일 이용권 하나로 <span className="font-bold text-[#8B5E0A]">모든 프로필에서 이용권 혜택을 그대로 이용</span>할 수 있습니다.
          </p>
          <p className="mt-1 text-[11.5px] text-[#8B6020]">
            이 상품은 자동결제 상품이 아니며, 기간 종료 후 무료 플랜으로 전환됩니다.
          </p>
        </div>

        {/* 잔액 부족 사전 경고 */}
        {subscription.lowBalanceWarning && (
          <div className="mb-4 rounded-[14px] border border-orange-300 bg-orange-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-orange-800">
              <span aria-hidden="true">🔔</span> 코인 잔액이 부족합니다
            </p>
            <p className="mt-1 text-[11.5px] text-orange-700">
              현재 이벤트 코인이 거의 소진되었습니다. 이용권 기간({expires}까지)은 유지되며,
              추가 유료 콘텐츠는 상품별 단건 결제로 이용할 수 있습니다.
            </p>
          </div>
        )}

        {/* 공통 운영 정책 안내 */}
        <div className="mb-4 rounded-[14px] border border-sky-200 bg-sky-50/60 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-sky-700">
            <span aria-hidden="true">ℹ️</span> 이용권 운영 정책
          </p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] text-sky-800">
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>모든 이용권은 <strong>결제일로부터 30일간 유효</strong>합니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>결제 즉시 30일 동안 이용권 혜택이 활성화됩니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>기간 종료 후 추가 결제 없이 무료 플랜으로 전환됩니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>계속 이용하려면 사용자가 직접 새 30일 이용권을 구매해야 합니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>이용권 전용 콘텐츠 열람 시 서비스 이용이 시작되며, 7일 이내라도 이용 기록이 있으면 전액 환불이 제한될 수 있습니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>콘텐츠 진입 전 안내 팝업에서 <strong>[확인]</strong>을 누르면 서비스 개시 및 환불 제한 조건에 동의한 것으로 처리됩니다.</li>
            <li className="flex items-start gap-1.5 font-bold text-rose-600"><span className="mt-0.5 flex-shrink-0">·</span><strong>자동결제 없는 30일 이용권</strong>이며, 결제/환불 기준은 이용약관(환불정책) 조항을 따릅니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>콘텐츠 생성이 시작되었거나 결과가 정상 제공된 경우 디지털 콘텐츠 특성상 환불이 제한될 수 있습니다.</li>
          </ul>
        </div>

        {isFlowerAdminMode && (
          <div className="mb-4 rounded-[14px] border border-violet-300 bg-violet-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-violet-800">
              <span aria-hidden="true">🧪</span> 관리자 이용권 티어 테스트 모드
            </p>
            <p className="mt-1 text-[11.5px] text-violet-700">
              관리자 모드는 항상 프리패스로 동작하며, 아래 티어를 선택하면 이용권 상품 기준(프로필 한도/무료 한도/기준 코인)이 해당 티어로 시뮬레이션됩니다.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {([
                { id: "off", label: "해제" },
                { id: "standard", label: "스탠다드 꿀" },
                { id: "premium", label: "프리미엄 꿀" },
                { id: "vvip", label: "VVIP 꿀단지" },
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
              {adminTierPlan ? (
                <p>
                  현재 시뮬레이션: <strong>{adminTierPlan.title}</strong>
                  <span className="mx-1">·</span>프로필 최대 <strong>{adminTierPlan.profileLimit ?? 1}개</strong>
                  <span className="mx-1">·</span>무료 한도 <strong>{adminTierPlan.freeUpTo ?? 0}코인</strong>
                  <span className="mx-1">·</span>기준 코인 <strong>{adminTierPlan.coins}코인</strong>
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
              선택 플랜: <strong>{highlightedPlan === "standard" ? "스탠다드 꿀 30일 이용권" : highlightedPlan === "premium" ? "프리미엄 꿀 30일 이용권" : "VVIP 꿀단지 30일 이용권"}</strong>
            </p>
          </div>
        )}

      </div>

      {/* ────────────────────────────────────────────────── */}
      {/* 무료 플랜 안내 + 이용권 훅                          */}
      {/* ────────────────────────────────────────────────── */}
      <div className="mx-5 mb-4 rounded-[20px] border border-neutral-200/80 bg-gradient-to-b from-neutral-50/70 to-white p-4 shadow-[0_2px_14px_rgba(0,0,0,0.06)]">
        {/* 제목 행 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl leading-none">🆓</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] font-black uppercase tracking-widest text-neutral-400">Free Plan</p>
            <p className="text-[15px] font-black text-neutral-700 leading-tight">무료 플랜</p>
          </div>
          {subscription.tier === "free" && (
            <span className="flex-shrink-0 rounded-full bg-neutral-200 px-2.5 py-0.5 text-[11px] font-bold text-neutral-600">현재 플랜</span>
          )}
        </div>

        {/* 무료 제공 항목 */}
        <div className="mb-3 rounded-[14px] border border-emerald-200 bg-emerald-50/60 px-3.5 py-3">
          <p className="mb-2 text-[11px] font-extrabold text-emerald-700">✅ 무료로 지금 바로 즐길 수 있어요</p>
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
                <span className="text-[11.5px] text-neutral-700">
                  <span className="font-semibold">{text}</span>
                  <span className="ml-1 text-[10.5px] text-neutral-400">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 잠긴 콘텐츠 — 이용권 훅 */}
        <div className="mb-3 rounded-[14px] border border-neutral-200 bg-neutral-50/80 px-3.5 py-3">
          <p className="mb-2 text-[11px] font-extrabold text-neutral-400">🔒 이용권 구매 시 잠금이 해제돼요</p>
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
                <span className="text-[11.5px] text-neutral-500 line-through decoration-neutral-300">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 마케팅 훅 CTA 블록 */}
        <div className="rounded-[14px] border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50/70 px-4 py-3.5">
          <p className="text-[12.5px] font-black text-[#7A4A00] leading-snug mb-1.5">
            맛보기만으로도 이 정도인데,<br />
            <span className="text-[#C07B00]">30일 이용권으로 얼마나 깊이 볼 수 있을까요?</span> 🍯
          </p>
          <p className="text-[11.5px] text-[#8B6020] leading-relaxed mb-2.5">
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

      {/* 플랜 카드 */}
      <div className="grid gap-3 p-5 pt-0 sm:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const theme = planThemeMap[plan.theme];
          const isCurrentActive = subscription.isActive && subscription.tier === plan.id;
          const isHighlighted = highlightedPlan === plan.id;
          const planTierRank = getSubscriptionTierRank(plan.id);
          const lowerTierBlocked = !isFlowerAdminMode && activeTierRank > 0 && planTierRank < activeTierRank;
          const ctaDisabled = isProcessing || lowerTierBlocked;
          return (
            <div
              key={plan.id}
              className={[
                "relative flex flex-col rounded-[20px] border p-4 transition-shadow",
                isCurrentActive
                  ? "border-emerald-400 bg-gradient-to-b from-emerald-50/60 to-white shadow-[0_4px_20px_rgba(16,185,129,0.20)]"
                  : isHighlighted
                    ? `${theme.card} ring-2 ring-rose-400/70 shadow-[0_10px_24px_rgba(244,63,94,0.22)]`
                    : `${theme.card} shadow-[0_4px_18px_rgba(120,80,10,0.09)]`,
                lowerTierBlocked ? "opacity-65" : "",
              ].join(" ")}
            >
              {/* 뱃지 */}
              {plan.badge && !isCurrentActive && (
                <span className={`absolute top-3 right-3 rounded-full bg-gradient-to-r ${theme.badge} px-2 py-0.5 text-[11px] font-black text-white shadow`}>
                  {plan.id === "vvip" ? "👑 VVIP" : `✨ ${plan.badge}`}
                </span>
              )}
              {isCurrentActive && (
                <span className="absolute top-3 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-black text-white shadow">
                  ✓ 이용권 이용 중
                </span>
              )}

              {/* 플랜 아이콘 & 이름 */}
              <p className="text-2xl leading-none">{theme.icon}</p>
              <p className={`mt-2 text-[11px] font-black uppercase tracking-wider ${theme.label}`}>{plan.title}</p>

              {/* 가격 */}
              <p className="mt-2 flex items-center gap-1 text-lg font-black text-[#5C3A1E]">
                <CoinIcon size="md" />
                {plan.coins.toLocaleString("ko-KR")}코인
                <span className="ml-0.5 text-xs font-semibold text-[#8A6020]">기준 가격</span>
              </p>
              <p className="text-[11px] text-[#7A5230]">원화 결제 금액 {formatWon(plan.wonPrice)}</p>

              {/* 커피 한 잔 뱃지 — freeUpTo 50 이하 플랜(스탠다드)에만 */}
              {plan.freeUpTo !== null && plan.freeUpTo <= 50 && plan.id === "standard" && (
                <div className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-amber-200/80 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                  ☕ 커피 2잔 값으로 30일
                </div>
              )}

              {/* 무료 이용 범위 태그 */}
              <div className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${theme.freeTag}`}>
                🆓{" "}
                {plan.freeUpTo === null ? "모든 서비스 무료" : `${plan.freeUpTo}코인 이하 무료`}
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
                        "flex items-start gap-1.5 text-[11.5px]",
                        isBonus ? "font-semibold text-emerald-700"
                          : isKey  ? `font-semibold ${theme.label}`
                          : "text-[#7A5230]",
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
                  "mt-4 w-full rounded-[12px] px-3 py-2.5 text-[13px] font-black text-white shadow transition-all",
                  "hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
                  isCurrentActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_5px_14px_rgba(16,185,129,0.35)]"
                    : `bg-gradient-to-r ${theme.btn}`,
                ].join(" ")}
              >
                {isCurrentActive
                  ? "30일 이용권 다시 구매"
                  : lowerTierBlocked
                    ? "상위 티어 사용 중 (구매 불가)"
                  : isHighlighted
                    ? `${theme.icon} 이 이용권 구매`
                    : `${theme.icon} 30일 이용권 구매`}
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
        <p className="text-[11px] text-[#9B7040]">✅ 결제 즉시 이용권 혜택이 활성화되며 <strong>30일간 유효</strong>합니다.</p>
        <p className="text-[11px] text-rose-600 font-bold">이 상품은 자동결제 상품이 아니며 기간 종료 후 무료 플랜으로 전환됩니다.</p>
        <p className="text-[11px] text-[#9B7040]">계속 이용하려면 사용자가 직접 새 30일 이용권을 구매해야 합니다.</p>
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
   서브 컴포넌트: CSS 기반 골드 코인 아이콘
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
  서브 컴포넌트: 이벤트 코인 카드
  코인은 콘텐츠 가치 단위로만 안내합니다.
══════════════════════════════════════════════════════════════════ */

function WalletCard({ name, points }: { name: string; points: number }) {
  return (
    <section
      aria-label="이벤트 코인 안내"
      className="rounded-[24px] overflow-hidden shadow-[0_10px_36px_rgba(180,130,30,0.22)]"
    >
      {/* Premium gold shimmer bar */}
      <div
        className="h-[3px] w-full"
        style={{ background: "linear-gradient(90deg, #C8860A 0%, #FFE070 30%, #FFFFFF 50%, #FFE070 70%, #C8860A 100%)" }}
        aria-hidden="true"
      />
      <div
        className="border border-t-0 border-amber-200 rounded-b-[24px] p-5"
        style={{ background: "linear-gradient(135deg, #FFFAE8 0%, #FFF3CC 50%, #FFE89C 100%)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* 왼쪽: 코인 아이콘 + 사용자 이름 */}
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-[26px]"
              style={{
                background: "radial-gradient(circle at 35% 30%, #fff9ce 0%, #ffd14d 55%, #c8900a 100%)",
                boxShadow: "inset 0 2px 8px rgba(255,255,255,0.65), 0 6px 16px rgba(140,80,10,0.32)",
              }}
              aria-hidden="true"
            >
              🐷
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-800">
                황금 꽃돼지상점
              </p>
              <p className="mt-0.5 text-[15px] font-bold text-[#5C3A1E]">{name} 님의 결제/이용권 관리</p>
            </div>
          </div>

          {/* 오른쪽: 이벤트 코인 수 */}
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              이벤트 코인
            </p>
            <div className="flex items-center gap-2">
              <CoinIcon size="xl" />
              <span className="text-[22px] font-black text-[#7A4A00] leading-none">
                {Number(points).toLocaleString("ko-KR")}
                <span className="ml-1 text-base font-bold text-amber-800">코인</span>
              </span>
            </div>
            <p className="max-w-[260px] text-[11px] text-amber-800 sm:text-right">
              코인은 콘텐츠의 가치를 표현하는 단위이며, 신규 충전은 제공하지 않습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
  서브 컴포넌트: 단건 결제 상품 카드
  클릭 시 결제 수단 선택 모달로 이동합니다.
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
          ? "border-amber-400 bg-gradient-to-r from-[#FFFBF0] to-[#FFF0CC] shadow-[0_12px_28px_rgba(180,130,30,0.28)] -translate-y-0.5 ring-2 ring-amber-300/50"
          : "border-[#EDDBA3] bg-white/95 shadow-[0_4px_14px_rgba(180,130,30,0.09)] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(180,130,30,0.20)] hover:border-amber-300",
      ].join(" ")}
    >
      {/* BEST 뱃지 */}
      {isBest && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FF5F45] to-[#FF9A3C] px-2.5 py-1 text-[11px] font-black text-white shadow-[0_4px_12px_rgba(214,91,33,0.40)]">
          추천 이용권
        </span>
      )}

      {/* 상단 행: 상품명 + 코인 기준 가격 */}
      <div className={`flex items-center justify-between gap-2 ${isBest ? "pr-[90px]" : ""}`}>
        <span className="text-[15px] font-bold text-[#5C3A1E]">{pkg.title}</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[15px] font-black text-[#9A6800]">
          <CoinIcon size="md" />
          {pkg.points.toLocaleString("ko-KR")}코인 가치
        </span>
      </div>
      <p className="mt-1 text-[11.5px] font-semibold text-[#7A5230]">{pkg.description}</p>

      {/* 하단 행: 원화 금액 + 정책 */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#7A5230]">
          <span className="text-[11px] text-[#9A7A50] line-through">{formatWon(listPrice)}</span>
          {formatWon(pkg.amount)}
        </span>
        <span className="text-sm font-bold text-[#5C3A1E]">
          {discountRate}% 할인
        </span>
      </div>
      <span className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#9A6A14] to-[#C9A84C] px-2.5 py-1 text-[12px] font-black text-white shadow-[0_3px_10px_rgba(160,110,20,0.30)]">
        단건 결제 · 월정석 병행 가능
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
  /** Toast ID 증가용 카운터 */
  const toastCounter = useRef(0);

  /* ── API 기본 URL ─────────────────────────────────────────────── */
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  /* ── 상태 ──────────────────────────────────────────────────────── */
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<PointPackage>(POINT_PACKAGES[0]);
  const [selectedMethod, setSelectedMethod] = useState<string>("kakao");

  const [isBooting, setIsBooting] = useState(true);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState(
    "신비로운 기운으로 결제를 연결 중입니다...",
  );
  const {
    startProcessing: showProcessingOverlay,
    stopProcessing: hideProcessingOverlay,
  } = usePaymentProcessing();
  const [showStarBurst, setShowStarBurst] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [cancelingPaymentId, setCancelingPaymentId] = useState<string | null>(null);
  const [isGalaxiaModalOpen, setIsGalaxiaModalOpen] = useState(false);
  const [galaxiaMerchantUid, setGalaxiaMerchantUid] = useState("");
  const [galaxiaFlowMethod, setGalaxiaFlowMethod] = useState<"galaxia" | "galaxia_artmoney">("galaxia");
  const [galaxiaInitialPayType, setGalaxiaInitialPayType] = useState<"card" | "simple">("card");
  const [galaxiaInitialCardId, setGalaxiaInitialCardId] = useState("");
  const [adminTestTier, setAdminTestTier] = useState<AdminTestTier>("off");
  const [landingPlanPreset, setLandingPlanPreset] = useState<"standard" | "premium" | "vvip" | null>(null);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
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
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const raw = String(query.get("plan") || "").toLowerCase();
    if (raw === "standard" || raw === "premium" || raw === "vvip") {
      setLandingPlanPreset(raw);
    }
    const packageId = String(query.get("package") || "").trim();
    const packagePreset = POINT_PACKAGES.find((pkg) => pkg.id === packageId);
    if (packagePreset) setSelectedPackage(packagePreset);
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

  useEffect(() => {
    if (isProcessing) {
      showProcessingOverlay(processingText);
      return;
    }
    hideProcessingOverlay();
  }, [hideProcessingOverlay, isProcessing, processingText, showProcessingOverlay]);

  useEffect(() => {
    return () => {
      hideProcessingOverlay();
    };
  }, [hideProcessingOverlay]);

  /* ── 포인트 로컬 동기화 ────────────────────────────────────────── */
  const persistUserPoints = useCallback((points: number) => {
    setCurrentPoints(points);
    try {
      const user = readSanitizedAuthUser() || {};
      user.points = points;
      persistSanitizedAuthUser(user);
    } catch { /* noop */ }

    try {
      const payload = { source: "points-page", event: "points", at: Date.now() };
      window.dispatchEvent(new CustomEvent("cd:auth-changed", { detail: payload }));
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("code-destiny-auth-sync");
        channel.postMessage(payload);
        channel.close();
      }
    } catch { /* noop */ }
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
          expiresAt: sub.expiresAt || null,
        },
      };
      const payload = JSON.stringify({
        tier: sub.tier || "free",
        isActive: !!sub.isActive,
        profileLimit: sub.profileLimit ?? 1,
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

  /* ── 서버에서 포인트 상태 조회 ─────────────────────────────────── */
  const fetchMyPointState = useCallback(
    async () => {
      const response = await authFetch(`${apiBase}/api/payments/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }, {
        retryOn401: true,
        apiBase,
      });
      if (!response.ok && response.status !== 401 && response.status !== 403) {
        console.warn("[points-page] API error", { path: "/api/payments/me", status: response.status });
      }

      if (response.status === 401 || response.status === 403) {
        clearClientAuthState();
        router.replace("/login?next=%2Fpoints");
        return;
      }

      // Content-Type 검증 후 JSON 파싱 — HTML 에러 페이지 방어
      const payload = await safeParseJson<MeResponse>(response);
      const payloadCode = String((payload as { code?: string; error?: string })?.code || (payload as { code?: string; error?: string })?.error || "").toUpperCase();

      if (!response.ok) {
        if (payloadCode === "AUTH_REFRESH_TEMPORARY_FAILURE") {
          throw new Error(mapAuthRefreshTemporaryFailureMessage());
        }
        throw new Error(payload.message || "포인트 정보를 불러오지 못했습니다.");
      }

      const normalized = normalizeMePayload(payload);
      const nextUser = normalized.user;
      const points = normalized.balance;
      persistUserPoints(points);

      const normalizedPayments = Array.isArray(normalized.payments)
        ? normalized.payments
            .filter((entry) => entry && typeof entry === "object")
            .slice(0, 10)
        : [];
      setPaymentHistory(normalizedPayments);

      if (nextUser) {
        setAuthUser((prev) => ({
          ...(prev || {}),
          id: nextUser.id,
          name: nextUser.name,
          email: nextUser.email,
          points,
        }));
      }
    },
    [apiBase, persistUserPoints, router],
  );

  /* ── 초기 인증 토큰 확인 ───────────────────────────────────────── */
  useEffect(() => {
    const parsedUser = readSanitizedAuthUser() as AuthUser | null;

    if (parsedUser) {
      setAuthUser(parsedUser);
      if (typeof parsedUser.points === "number") {
        setCurrentPoints(parsedUser.points);
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

  /* ── 부팅 후 포인트 로드 ───────────────────────────────────────── */
  useEffect(() => {
    if (isBooting) return;

    fetchMyPointState().catch((error) => {
      pushToast("error", getErrorMessage(error, "포인트 정보를 불러오지 못했습니다."));
    });
  }, [fetchMyPointState, isBooting, pushToast]);

  /* ── 이용권 상태 로드 ─────────────────────────────────────────────── */
  useEffect(() => {
    if (isBooting) return;
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
      .then((r) => {
        if (!r.ok && r.status !== 401 && r.status !== 403) {
          console.warn("[points-page] API error", { path: "/api/subscription/status", status: r.status });
        }
        return r;
      })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setSubscription({
          tier:              d.tier         || "free",
          isActive:          !!d.isActive,
          expiresAt:         d.expiresAt    || null,
          profileLimit:      typeof d.profileLimit === "number" ? d.profileLimit : 1,
          lowBalanceWarning: !!d.lowBalanceWarning,
          cancelAtPeriodEnd: !!d.cancelAtPeriodEnd,
          cancelRequestedAt: d.cancelRequestedAt || null,
          freeLimit: typeof d.freeLimit === "number" ? d.freeLimit : 0,
        });
      })
      .catch(() => {});
  }, [isBooting, apiBase, adminTestTier, authUser]);

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
      const points = Number(result.user?.points || 0);
      persistUserPoints(points);
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
    [fetchMyPointState, persistUserPoints, pushToast],
  );

  const requestCancelPayment = useCallback(
    async (payment: PaymentHistoryItem) => {
      const ok = window.confirm(
        `${formatWon(payment.paymentAmount)} 결제를 취소할까요?\n이미 사용한 코인이 있으면 취소가 제한될 수 있습니다.`,
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

        if (typeof payload.user?.points === "number") {
          persistUserPoints(Number(payload.user.points));
        }

        await fetchMyPointState();
        pushToast("success", payload.message || "결제가 취소되었습니다.");
      } catch (error: unknown) {
        pushToast("error", getErrorMessage(error, "결제 취소 처리 중 오류가 발생했습니다."));
      } finally {
        setCancelingPaymentId(null);
      }
    },
    [apiBase, fetchMyPointState, persistUserPoints, pushToast],
  );

  /* ── 모바일 결제 리디렉션 복귀 처리 ───────────────────────────── */
  useEffect(() => {
    if (isBooting || redirectHandledRef.current) return;
    if (typeof window === "undefined") return;

    const query = new URLSearchParams(window.location.search);
    const redirectMarked = query.get("portone_redirect");
    const subscriptionRedirectMarked = query.get("portone_subscription_redirect");
    const impSuccess = String(query.get("imp_success") || "").toLowerCase();
    const impUid = query.get("imp_uid");

    if (!impUid && impSuccess !== "false" && !redirectMarked && !subscriptionRedirectMarked) return;

    redirectHandledRef.current = true;

    const merchantUidFromQuery = query.get("merchant_uid") || undefined;
    const pending = readPendingOrder();
    const pendingSubscription = readPendingSubscriptionOrder();
    const isSubscriptionRedirect = !!subscriptionRedirectMarked;

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

    setIsProcessing(true);
    setProcessingText(
      isSubscriptionRedirect
        ? "모바일 이용권 결제 복귀 신호를 확인하고 있습니다..."
        : "모바일 결제 복귀 신호를 확인하고 있습니다...",
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
        setIsProcessing(false);
        return;
      }

      authFetch(`${apiBase}/api/payments/subscription/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          impUid,
          merchantUid,
          tier: pendingSub.tier,
          customerUid: pendingSub.customerUid,
          paymentMethod: pendingSub.paymentMethod,
        }),
      }, {
        retryOn401: true,
        apiBase,
      })
        .then(async (response) => {
          const data = await safeParseJson<ConfirmSubscriptionResponse>(response);
          if (!response.ok) {
            throw new Error(data.message || "모바일 이용권 결제 검증에 실패했습니다.");
          }

          if (data.user?.points !== undefined) {
            persistUserPoints(Number(data.user.points));
          }

          if (data.subscription) {
            const newSub: SubscriptionStatus = {
              tier: data.subscription?.tier || "free",
              source: data.subscription?.source || "card",
              isActive: !!data.subscription?.isActive,
              expiresAt: data.subscription?.expiresAt || null,
              profileLimit: typeof data.subscription?.profileLimit === "number"
                ? data.subscription.profileLimit
                : 1,
              lowBalanceWarning: false,
              cancelAtPeriodEnd: !!data.subscription?.cancelAtPeriodEnd,
              cancelRequestedAt: data.subscription?.cancelRequestedAt || null,
              freeLimit: 0,
            };
            setSubscription((prev) => ({ ...newSub, freeLimit: prev.freeLimit || 0 }));
            persistSubscriptionCache(newSub);
          }

          clearPendingSubscriptionOrder();
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
        .finally(() => setIsProcessing(false));

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
      .finally(() => setIsProcessing(false));
  }, [
    apiBase,
    confirmPaymentWithServer,
    handleConfirmSuccess,
    isBooting,
    persistUserPoints,
    persistSubscriptionCache,
    pushToast,
    reportPaymentFailureToServer,
  ]);

  /* ── 결제 시작 ─────────────────────────────────────────────────── */
  const startPayment = async () => {
    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    setIsProcessing(true);
    setProcessingText("신비로운 기운으로 결제를 연결 중입니다...");

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

      /* ── 갤럭시아 선택 시 GalaxiaPayModal로 분기 ── */
      if (selectedMethod === "galaxia" || selectedMethod === "galaxia_artmoney") {
        const isArtMoneyFlow = selectedMethod === "galaxia_artmoney";
        setGalaxiaFlowMethod(isArtMoneyFlow ? "galaxia_artmoney" : "galaxia");
        setGalaxiaInitialPayType("card");
        setGalaxiaInitialCardId(isArtMoneyFlow ? "artmoney" : "");
        setGalaxiaMerchantUid(order.merchantUid);
        setIsMethodModalOpen(false);
        setIsProcessing(false);
        setIsGalaxiaModalOpen(true);
        return;
      }

      await ensurePortoneSdk();

      if (!window.IMP) {
        throw new Error("포트원 결제 SDK가 초기화되지 않았습니다.");
      }

      const pgConfig = resolvePgConfig(selectedMethod);
      window.IMP.init(PORTONE_IMP_CODE);

      // 포트원 콘솔에 등록된 복귀 도메인과 일치해야 모바일 결제 후 복귀 검증이 정상 동작합니다.
      const redirectUrl = new URL(PORTONE_MOBILE_REDIRECT_PATH, window.location.origin);
      redirectUrl.searchParams.set("portone_redirect", "1");

      const buyerName = authUser.name || "회원";
      const buyerEmail = authUser.email || "";

      const requestData: Record<string, unknown> = {
        pg: pgConfig.pg,
        pay_method: pgConfig.payMethod,
        merchant_uid: order.merchantUid,
        name: order.productName,
        amount: order.paymentAmount,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        // 토스페이먼츠 권장 고객 식별 파라미터(PortOne V2에서도 동일 의미로 사용)
        customerName: buyerName,
        customerEmail: buyerEmail,
        m_redirect_url: redirectUrl.toString(),
        custom_data: {
          userId: authUser.id,
          packageId: selectedPackage.id,
          coinPrice: order.coinPrice ?? selectedPackage.points,
          featureKey: selectedPackage.featureKey,
          paymentMethod: selectedMethod,
        },
      };

      if (PORTONE_STORE_ID) {
        requestData.storeId = PORTONE_STORE_ID;
      }

      if (PORTONE_CHANNEL_KEY) {
        requestData.channelKey = PORTONE_CHANNEL_KEY;
      }

      if (PORTONE_NOTICE_URL) {
        requestData.notice_url = PORTONE_NOTICE_URL;
      }

      await new Promise<void>((resolve) => {
        window.IMP!.request_pay(requestData, async (rsp: PortOnePaymentResponse) => {
          if (!rsp || !rsp.success) {
            const message = mapPaymentErrorMessage(
              rsp?.error_msg || rsp?.errorMsg || "결제가 취소되었습니다.",
            );
            reportPaymentFailureToServer({
              merchantUid: order.merchantUid,
              impUid: rsp?.imp_uid,
              reasonCode: "client_cancel_or_fail",
              reasonMessage: message,
              paymentMethod: selectedMethod,
            });
            pushToast("error", message);
            setIsProcessing(false);
            resolve();
            return;
          }

          try {
            setProcessingText("결제 검증을 진행하고 있습니다...");
            const result = await confirmPaymentWithServer({
              impUid: rsp.imp_uid,
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
              impUid: rsp.imp_uid,
              reasonCode: "confirm_failed",
              reasonMessage: getErrorMessage(error, "결제 검증에 실패했습니다."),
              paymentMethod: selectedMethod,
            });
            pushToast("error", getErrorMessage(error, "결제 검증에 실패했습니다."));
          } finally {
            setIsProcessing(false);
            resolve();
          }
        });
      });
    } catch (error: unknown) {
      reportPaymentFailureToServer({
        reasonCode: "prepare_or_sdk_failed",
        reasonMessage: getErrorMessage(error, "결제를 시작하지 못했습니다."),
        paymentMethod: selectedMethod,
      });
      setIsProcessing(false);
      pushToast("error", getErrorMessage(error, "결제를 시작하지 못했습니다."));
    }
  };

  /* ── 갤럭시아 결제 성공 핸들러 ─────────────────────────────────── */
  const handleGalaxiaSuccess = useCallback(
    async (res: GalaxiaPayResult) => {
      setIsGalaxiaModalOpen(false);
      setIsProcessing(true);
      setProcessingText("결제 검증을 진행하고 있습니다...");
      try {
        const pending = readPendingOrder();
        const result = await confirmPaymentWithServer({
          impUid: res.imp_uid!,
          merchantUid: res.orderId || pending?.merchantUid,
          paymentAmount: pending?.paymentAmount,
          chargePoints: pending?.chargePoints,
          paymentType: "digital_content",
          productId: pending?.productId,
          featureKey: pending?.featureKey,
          productName: pending?.productName,
          paymentMethod: galaxiaFlowMethod,
        });
        clearPendingOrder();
        await handleConfirmSuccess(result);
      } catch (error: unknown) {
        reportPaymentFailureToServer({
          merchantUid: res.orderId,
          impUid: res.imp_uid,
          reasonCode: "galaxia_confirm_failed",
          reasonMessage: getErrorMessage(error, "갤럭시아 결제 검증에 실패했습니다."),
          paymentMethod: galaxiaFlowMethod,
        });
        pushToast("error", getErrorMessage(error, "결제 검증에 실패했습니다."));
      } finally {
        setIsProcessing(false);
      }
    },
    [confirmPaymentWithServer, galaxiaFlowMethod, handleConfirmSuccess, pushToast, reportPaymentFailureToServer],
  );

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    const isFlowerAdmin = authUser?.role === "admin" && isFlowerAdminSessionClient();
    const flowerAdminToken = getFlowerAdminTokenClient();
    const activeTierRank = subscription.isActive ? getSubscriptionTierRank(subscription.tier) : 0;
    const requestedTierRank = getSubscriptionTierRank(plan.id);

    if (!authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    if (!isFlowerAdmin && activeTierRank > requestedTierRank) {
      pushToast("info", "현재 상위 티어 이용권이 활성화되어 하위 플랜은 신청할 수 없습니다.");
      return;
    }

    setIsProcessing(true);
    setProcessingText(`${plan.title} 결제를 준비하고 있습니다...`);

    try {
      const prepareRes = await authFetch(`${apiBase}/api/payments/subscription/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(flowerAdminToken ? { "x-admin-token": flowerAdminToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ tier: plan.id, paymentMethod: selectedMethod || "card_general" }),
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
      if (!window.IMP) throw new Error("포트원 결제 SDK가 초기화되지 않았습니다.");

      const order = prepareData.order;
      const pgConfig = resolvePgConfig(selectedMethod || "card_general");
      window.IMP.init(PORTONE_IMP_CODE);

      const redirectUrl = new URL(PORTONE_MOBILE_REDIRECT_PATH, window.location.origin);
      redirectUrl.searchParams.set("portone_subscription_redirect", "1");

      const buyerName = authUser.name || "회원";
      const buyerEmail = authUser.email || "";

      const requestData: Record<string, unknown> = {
        pg: pgConfig.pg,
        pay_method: pgConfig.payMethod,
        merchant_uid: order.merchantUid,
        name: order.productName,
        amount: order.paymentAmount,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        customer_uid: order.customerUid,
        customerName: buyerName,
        customerEmail: buyerEmail,
        m_redirect_url: redirectUrl.toString(),
        custom_data: {
          userId: authUser.id,
          subscriptionTier: plan.id,
          subscriptionSource: "pass",
          paymentMethod: selectedMethod || "card_general",
        },
      };

      if (PORTONE_STORE_ID) requestData.storeId = PORTONE_STORE_ID;
      if (PORTONE_CHANNEL_KEY) requestData.channelKey = PORTONE_CHANNEL_KEY;
      if (PORTONE_NOTICE_URL) requestData.notice_url = PORTONE_NOTICE_URL;

      savePendingSubscriptionOrder({
        merchantUid: order.merchantUid,
        customerUid: order.customerUid,
        tier: plan.id,
        paymentMethod: selectedMethod || "card_general",
      });

      await new Promise<void>((resolve) => {
        window.IMP!.request_pay(requestData, async (rsp: PortOnePaymentResponse) => {
          if (!rsp || !rsp.success || !rsp.imp_uid) {
            clearPendingSubscriptionOrder();
            const message = mapPaymentErrorMessage(
              rsp?.error_msg || rsp?.errorMsg || "이용권 결제가 취소되었습니다.",
            );
            reportPaymentFailureToServer({
              merchantUid: order.merchantUid,
              impUid: rsp?.imp_uid,
              reasonCode: "subscription_client_cancel_or_fail",
              reasonMessage: message,
              paymentMethod: selectedMethod || "card_general",
            });
            pushToast("error", message);
            resolve();
            return;
          }

          try {
            setProcessingText("이용권 결제 검증 및 활성화를 진행하고 있습니다...");
            const confirmRes = await authFetch(`${apiBase}/api/payments/subscription/confirm`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                impUid: rsp.imp_uid,
                merchantUid: order.merchantUid,
                tier: plan.id,
                customerUid: order.customerUid,
                paymentMethod: selectedMethod || "card_general",
              }),
            }, {
              retryOn401: true,
              apiBase,
            });

            const confirmData = await safeParseJson<ConfirmSubscriptionResponse>(confirmRes);
            if (!confirmRes.ok) {
              clearPendingSubscriptionOrder();
              pushToast("error", confirmData.message || "이용권 결제 확인에 실패했습니다.");
              resolve();
              return;
            }

            if (confirmData.user?.points !== undefined) persistUserPoints(Number(confirmData.user.points));

            if (confirmData.subscription) {
              const newSub: SubscriptionStatus = {
                tier: confirmData.subscription?.tier || "free",
                source: confirmData.subscription?.source || "pass",
                isActive: !!confirmData.subscription?.isActive,
                expiresAt: confirmData.subscription?.expiresAt || null,
                profileLimit: typeof confirmData.subscription?.profileLimit === "number"
                  ? confirmData.subscription.profileLimit
                  : 1,
                lowBalanceWarning: false,
                cancelAtPeriodEnd: !!confirmData.subscription?.cancelAtPeriodEnd,
                cancelRequestedAt: confirmData.subscription?.cancelRequestedAt || null,
                freeLimit: 0,
              };
              setSubscription((prev) => ({ ...newSub, freeLimit: prev.freeLimit || 0 }));
              persistSubscriptionCache(newSub);
            }

            clearPendingSubscriptionOrder();
            pushToast("success", confirmData.message || `${plan.title}이 활성화되었습니다.`);
            setShowStarBurst(true);
            setTimeout(() => setShowStarBurst(false), 1200);
          } catch (error: unknown) {
            clearPendingSubscriptionOrder();
            reportPaymentFailureToServer({
              merchantUid: order.merchantUid,
              impUid: rsp.imp_uid,
              reasonCode: "subscription_confirm_failed",
              reasonMessage: getErrorMessage(error, "이용권 결제 확인에 실패했습니다."),
              paymentMethod: selectedMethod || "card_general",
            });
            pushToast("error", getErrorMessage(error, "이용권 결제 확인에 실패했습니다."));
          } finally {
            resolve();
          }
        });
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error, "이용권 처리 중 오류가 발생했습니다.");
      clearPendingSubscriptionOrder();
      if (message.includes("SUBSCRIPTION_CONFLICT") || message.includes("중복 이용권") || message.includes("중복 구매")) {
        pushToast("error", "이미 활성 이용권이 있어 중복 구매를 신청할 수 없습니다.");
        return;
      }
      pushToast("error", message);
    } finally {
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

    setIsProcessing(true);
    setProcessingText("이용권 상태를 확인하는 중입니다...");
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
        className="flex min-h-screen items-center justify-center text-[#5C3A1E]"
        style={{ background: "linear-gradient(160deg, #FDF8F0 0%, #FDF0D8 100%)" }}
      >
        <div className="text-center">
          <div className="mb-3 text-5xl animate-bounce">🐷</div>
          <p className="font-semibold">황금 꽃돼지상점을 불러오는 중...</p>
        </div>
      </main>
    );
  }

  const isFlowerAdminMode = authUser?.role === "admin" && isFlowerAdminSessionClient();

  /* ── 메인 렌더 ─────────────────────────────────────────────────── */
  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-8 text-[#5C3A1E]"
      style={{ background: "linear-gradient(160deg, #FDFAF4 0%, #FDF3E0 35%, #FAE9CC 65%, #F7DEB8 100%)" }}
    >
      {/* ── 배경 글로우 오브 ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(255,220,100,0.60) 0%, rgba(255,190,60,0.20) 50%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-48 w-[450px] h-[450px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, rgba(255,175,60,0.60) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-[300px] h-[300px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(255,200,80,0.55) 0%, transparent 70%)" }}
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

      {/* ── 페이지 콘텐츠 ────────────────────────────────────────── */}
      <div className="relative mx-auto w-full max-w-2xl space-y-5">

        {/* ① 헤더 카드 */}
        <header className="rounded-[24px] overflow-hidden shadow-[0_12px_40px_rgba(120,80,10,0.14)]">
          {/* 헤더 탐색 프리리엄 바 */}
          <div
            className="h-[3px] w-full"
            style={{ background: "linear-gradient(90deg, #A0680A 0%, #FFD060 25%, #FFFFFF 50%, #FFD060 75%, #A0680A 100%)" }}
            aria-hidden="true"
          />
          <div
            className="border border-t-0 border-[#EDDBA3] rounded-b-[24px] p-6 backdrop-blur-sm"
            style={{ background: "linear-gradient(135deg, rgba(255,253,247,0.97) 0%, rgba(255,249,238,0.95) 100%)" }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Image
                  src="/icons/꿀꿀 운세 로고.webp"
                  sizes="72px"
                  width={72}
                  height={72}
                  alt="황금 꽃돼지"
                  className="rounded-2xl shadow-[0_6px_20px_rgba(150,76,11,0.26)]"
                  priority
                />
                <div>
                  <p className="text-[11px] font-extrabold tracking-[0.22em] text-amber-800 uppercase">
                    Golden Pig Payment Store
                  </p>
                  <h1 className="mt-0.5 text-[22px] font-black text-[#5C3A1E] sm:text-3xl leading-tight">
                    황금 꽃돼지상점
                  </h1>
                  <p className="mt-1 text-sm text-[#7A5230]">
                    필요한 콘텐츠를 코인 기준 가격으로 확인하고 원화로 바로 결제하세요.
                  </p>
                  <p className="mt-1 text-[12px] text-[#8A6020]">
                    코인은 콘텐츠의 가치를 표현하는 단위이며, 현재 신규 선불 충전은 제공하지 않습니다.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  href="/points/history"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 shadow-[0_2px_10px_rgba(180,130,30,0.14)] transition-all hover:bg-amber-100 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  📋 결제/이용권 관리
                </Link>
                <Link
                  href="/"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EDDBA3] bg-white/90 px-4 py-2.5 text-sm font-bold text-[#7A5230] shadow-[0_2px_10px_rgba(180,130,30,0.14)] transition-all hover:bg-[#FFF8E0] hover:shadow-[0_4px_14px_rgba(180,130,30,0.22)] hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  ← 서비스 화면으로
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ② 잔액 카드 */}
        <WalletCard name={authUser?.name || "사용자"} points={currentPoints} />

        {/* ②-1 이용권 상태 카드 */}
        <SubscriptionStatusCard subscription={subscription} />

        {/* ②-2 이용권 섹션 구분선 */}
        <div className="flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700">
            Honey 이용권 30일 이용권
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400 to-transparent opacity-50" />
        </div>

        {/* ②-3 이용권 상품 카드 */}
        <SubscriptionSection
          subscription={subscription}
          onSubscribe={handleSubscribe}
          onCancelSubscription={handleSubscriptionCancel}
          isProcessing={isProcessing}
          isFlowerAdminMode={isFlowerAdminMode}
          adminTestTier={adminTestTier}
          onChangeAdminTestTier={setAdminTestTier}
          highlightedPlan={landingPlanPreset}
        />

        {/* ③ 섹션 구분선 */}
        <div className="flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700">
            단건 결제 회차형 이용권
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400 to-transparent opacity-50" />
        </div>

        {/* ④ 패키지 카드 목록 */}
        <section
          aria-label="단건 결제 회차형 이용권"
          className="cd-card-light rounded-[24px] overflow-hidden shadow-[0_8px_32px_rgba(120,80,10,0.10)]"
        >
          <div
            className="border border-[#EDDBA3] rounded-[24px] p-5"
            style={{ background: "linear-gradient(135deg, #FFFDF8 0%, #FEFBF0 100%)" }}
          >
            <p className="mb-3 flex items-center gap-2 text-[12px] font-bold text-[#8A6020]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              필요한 이용권을 선택한 뒤 결제 수단을 고르세요.
            </p>
            <div className="flex flex-col gap-3">
              {POINT_PACKAGES.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={selectedPackage.id === pkg.id}
                  onSelect={handlePackageSelect}
                />
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-[14px] border border-amber-100 bg-amber-50/60 px-3.5 py-3">
              <span className="text-amber-600 flex-shrink-0 mt-0.5">✔️</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                결제 완료 후 해당 상품 이용 또는 결과 생성이 진행됩니다.
                <span className="mx-1">·</span>
                결제 성공 후 코인 지갑에 잔액을 적립하지 않고, 선택한 이용권 회차만 즉시 지급합니다.
              </p>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-[14px] border border-rose-100 bg-rose-50/70 px-3.5 py-3">
              <span className="text-rose-500 flex-shrink-0 mt-0.5">⏳</span>
              <p className="text-[11px] text-rose-800 leading-relaxed font-semibold">
                시스템 오류, 중복 결제, 결과 미제공 건은 재생성 또는 환불 처리됩니다.
              </p>
            </div>
          </div>
        </section>

        <section className="cd-card-light rounded-[20px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.88)] p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-[#5C3A1E]">최근 결제 내역</h3>
            <span className="text-[11px] font-semibold text-[#8A6020]">승인번호 / 주문번호 / 영수증</span>
          </div>

          {paymentHistory.length === 0 ? (
            <p className="text-sm text-[#7A5230]">아직 결제 내역이 없습니다.</p>
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
                        {formatWon(payment.paymentAmount)} · {formatPoints(payment.chargedPoints)}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-1 text-[11.5px] text-[#7A5230] sm:grid-cols-2">
                      <p>결제시각: {formatDateTime(payment.paidAt || payment.cancelledAt)}</p>
                      <p>결제수단: {payment.paymentMethod || "-"}</p>
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
            <li>• 창 닫기/취소: 결제가 취소되어 코인이 차감되지 않습니다.</li>
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
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">이벤트 코인</p>
                <p className="text-sm font-semibold text-amber-700">
                  ✦ {currentPoints.toLocaleString("ko-KR")}코인
                </p>
              </div>
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1">현재 이용권</p>
                <p className="text-sm font-semibold text-slate-700">
                  {subscription.tier === "free" ? "🆓 무료 플랜"
                   : subscription.tier === "standard" ? "🍯 스탠다드 꿀"
                   : subscription.tier === "premium" ? "🌹 프리미엄 꿀"
                   : subscription.tier === "vvip" ? "👑 VVIP 꿀단지"
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
                  <p>• 탈퇴 시 이벤트 코인·이용권·운세 프로필 등 <strong>모든 데이터가 즉시 영구 삭제</strong>됩니다.</p>
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

      {/* ══ 결제 수단 선택 모달 ══════════════════════════════════════ */}
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
                  결제 수단 선택
                </p>
                <h4 className="mt-0.5 text-lg font-bold text-[#5C3A1E]">
                  {selectedPackage.title} · {selectedPackage.points.toLocaleString("ko-KR")}코인
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

            {/* 결제 수단 그리드 */}
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
              {isProcessing ? "🐷 연결 중..." : "결제를 진행합니다"}
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

      {/* ══ 갤럭시아 카드 선택 모달 ══════════════════════════════════ */}
      {isGalaxiaModalOpen && authUser && (
        <GalaxiaPayModal
          pkg={selectedPackage}
          buyerName={authUser.name || "회원"}
          buyerEmail={authUser.email || ""}
          orderId={galaxiaMerchantUid}
          flowMethod={galaxiaFlowMethod}
          initialPayType={galaxiaInitialPayType}
          initialCardId={galaxiaInitialCardId}
          onSuccess={handleGalaxiaSuccess}
          onFail={(res) => {
            setIsGalaxiaModalOpen(false);
            clearPendingOrder();
            reportPaymentFailureToServer({
              merchantUid: galaxiaMerchantUid,
              impUid: res.imp_uid,
              reasonCode: res.errorCode || "galaxia_client_cancel_or_fail",
              reasonMessage: res.errorMsg || "갤럭시아 결제가 취소되었거나 실패했습니다.",
              paymentMethod: galaxiaFlowMethod,
            });
            const msg = res.errorMsg
              ? mapPaymentErrorMessage(res.errorMsg)
              : "결제가 취소되었습니다. 원하실 때 다시 시도하실 수 있어요.";
            pushToast("error", msg);
          }}
          onClose={() => {
            setIsGalaxiaModalOpen(false);
            clearPendingOrder();
          }}
          isProcessing={isProcessing}
        />
      )}
    </main>
  );
}
