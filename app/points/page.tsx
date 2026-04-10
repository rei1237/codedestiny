"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ══════════════════════════════════════════════════════════════════
   타입 정의
══════════════════════════════════════════════════════════════════ */

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role?: "user" | "admin";
  points?: number;
};

type PointPackage = {
  id: string;
  title: string;
  amount: number;
  points: number;
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
    chargePoints: number;
    productName: string;
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

type PaymentHistoryItem = {
  id: string;
  impUid?: string;
  merchantUid?: string;
  paymentAmount: number;
  chargedPoints: number;
  paymentMethod: string;
  status: "pending" | "success" | "failed" | "cancelled";
  paidAt?: string;
  approvalNumber?: string | null;
  receiptUrl?: string | null;
  cancelledAt?: string | null;
};

/* ── 프로필 구독 타입 ───────────────────────────────────────── */
type SubscriptionTier = "free" | "standard" | "premium" | "vvip";

type SubscriptionStatus = {
  tier:               SubscriptionTier;
  isActive:           boolean;
  expiresAt:          string | null;
  profileLimit:       number; // 0 = unlimited
  lowBalanceWarning?: boolean;
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
  message?: string;
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
  chargePoints: number;
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
    IMP?: {
      init: (impCode: string) => void;
      request_pay: (
        data: Record<string, unknown>,
        callback: (rsp: PortOnePaymentResponse) => void,
      ) => void;
    };
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

/* ══════════════════════════════════════════════════════════════════
   상수 정의
══════════════════════════════════════════════════════════════════ */

const PORTONE_IMP_CODE = process.env.NEXT_PUBLIC_PORTONE_IMP_CODE || "imp00000000";
const PORTONE_NOTICE_URL = process.env.NEXT_PUBLIC_PORTONE_NOTICE_URL || "";

/* 꿀 구독 시스템 플랜 정의 */
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id:           "standard",
    title:        "스탠다드 꿀",
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
      "코인 잔액 충분 시 만료 후 자동 갱신",
    ],
  },
  {
    id:           "premium",
    title:        "프리미엄 꿀",
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
      "코인 잔액 충분 시 만료 후 자동 갱신",
    ],
    badge:        "추천",
  },
  {
    id:           "vvip",
    title:        "VVIP 꿀단지",
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
      "코인 잔액 충분 시 만료 후 자동 갱신",
    ],
    badge:        "VVIP",
  },
];

/** 패키지별 기본 코인 수 (보너스 제외) */
const BASE_COINS: Record<string, number> = {
  sample: 30,
  luckyMeal: 100,
  goldBarn: 300,
  goldVault: 700,
  emperorReserve: 1500,
};

const POINT_PACKAGES: PointPackage[] = [
  { id: "sample",         title: "맛보기 한 줌",         amount: 3300,   points: 30   },
  { id: "luckyMeal",      title: "행운의 한 끼",          amount: 9900,   points: 115  },
  { id: "goldBarn",       title: "황금 돼지 곳간",         amount: 29000,  points: 360  },
  { id: "goldVault",      title: "황금 돼지 금고",         amount: 59000,  points: 880  },
  { id: "emperorReserve", title: "황금 돼지 제왕 보물고",  amount: 119000, points: 2000 },
];

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "kakao",         label: "카카오페이",             logo: "🟨", desc: "간편 결제",          group: "domestic" },
  { id: "toss_card",     label: "토스페이먼츠(카드)",     logo: "💳", desc: "국내 카드",           group: "domestic" },
  { id: "toss_transfer", label: "토스페이먼츠(계좌이체)", logo: "🏦", desc: "실시간 이체",          group: "domestic" },
  { id: "naverpay",      label: "네이버페이",             logo: "🟩", desc: "네이버 간편 결제",     group: "domestic" },
  { id: "card_general",  label: "일반 신용카드",          logo: "💠", desc: "다날/나이스 등",       group: "domestic" },
  { id: "paypal",        label: "PayPal",                 logo: "🅿️", desc: "해외 결제",          group: "global"   },
  { id: "applepay",      label: "Apple Pay",              logo: "🍎", desc: "포트원 지원 PG 기준", group: "global"   },
  { id: "googlepay",     label: "Google Pay",             logo: "🟢", desc: "포트원 지원 PG 기준", group: "global"   },
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
  if (status === "success") return { label: "결제완료", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  if (status === "cancelled") return { label: "취소완료", cls: "bg-neutral-100 text-neutral-700 border-neutral-300" };
  if (status === "failed") return { label: "실패", cls: "bg-rose-100 text-rose-700 border-rose-300" };
  return { label: "대기", cls: "bg-amber-100 text-amber-700 border-amber-300" };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
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
    toss_card:     process.env.NEXT_PUBLIC_PORTONE_PG_TOSS_CARD,
    toss_transfer: process.env.NEXT_PUBLIC_PORTONE_PG_TOSS_TRANSFER,
    naverpay:      process.env.NEXT_PUBLIC_PORTONE_PG_NAVERPAY,
    card_general:  process.env.NEXT_PUBLIC_PORTONE_PG_CARD,
    paypal:        process.env.NEXT_PUBLIC_PORTONE_PG_PAYPAL,
    applepay:      process.env.NEXT_PUBLIC_PORTONE_PG_APPLEPAY,
    googlepay:     process.env.NEXT_PUBLIC_PORTONE_PG_GOOGLEPAY,
  } as Record<string, string | undefined>;

  const defaults: Record<string, { pg: string; payMethod: string }> = {
    kakao:         { pg: overrides.kakao         || "kakaopay.TC0ONETIME",     payMethod: "card"   },
    toss_card:     { pg: overrides.toss_card      || "tosspayments",            payMethod: "card"   },
    toss_transfer: { pg: overrides.toss_transfer  || "tosspayments",            payMethod: "trans"  },
    naverpay:      { pg: overrides.naverpay       || "naverpay",                payMethod: "card"   },
    card_general:  { pg: overrides.card_general   || "html5_inicis.INIpayTest", payMethod: "card"   },
    paypal:        { pg: overrides.paypal         || "paypal",                  payMethod: "paypal" },
    applepay:      { pg: overrides.applepay       || "tosspayments",            payMethod: "card"   },
    googlepay:     { pg: overrides.googlepay      || "tosspayments",            payMethod: "card"   },
  };
  return defaults[methodId] || defaults.card_general;
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

/* ══════════════════════════════════════════════════════════════════
   서브 컴포넌트: 프로필 구독 섹션
══════════════════════════════════════════════════════════════════ */

function SubscriptionSection({
  subscription,
  currentPoints,
  onSubscribe,
  isProcessing,
}: {
  subscription:  SubscriptionStatus;
  currentPoints: number;
  onSubscribe:   (plan: SubscriptionPlan) => void;
  isProcessing:  boolean;
}) {
  const tierLabel: Record<SubscriptionTier, string> = {
    free:     "무료 플랜",
    standard: "스탠다드 꿀",
    premium:  "프리미엄 꿀",
    vvip:     "VVIP 꿀단지",
  };
  const tierColor: Record<SubscriptionTier, string> = {
    free:     "text-neutral-500",
    standard: "text-amber-700",
    premium:  "text-rose-600",
    vvip:     "text-purple-700",
  };

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

  const daysLeft = subscription.expiresAt
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <section
      aria-label="꿀 구독 시스템"
      className="rounded-[24px] border border-[#EDDBA3] bg-white/90 overflow-hidden shadow-[0_8px_32px_rgba(120,80,10,0.10)]"
    >
      {/* 섹션 헤더 */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ background: "linear-gradient(135deg, #FFFDF7 0%, #FFF9EC 100%)" }}
      >
        {/* 제목 */}
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#A0700A]">Honey Subscription</p>
          <h2 className="mt-0.5 text-xl font-bold text-[#5C3A1E]">🍯 꿀 구독 시스템</h2>
          <p className="mt-1 text-sm text-[#7A5230]">
            꽃꽃돼지 코인 하나로 여러 생년월일 프로필을 만들고 해금 콘텐츠를 마음껏 즐기세요.
          </p>
        </div>

        {/* 핵심 혜택 callout */}
        <div className="mb-4 rounded-[14px] border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 px-4 py-3 shadow-[inset_0_1px_3px_rgba(180,130,0,0.08)]">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-amber-800">
            <span aria-hidden="true">🍯</span> 꿀 구독만의 특별한 이유
          </p>
          <p className="text-[12.5px] leading-relaxed text-[#6B4410]">
            <span className="font-bold text-[#8B5E0A]">가족·연인·자녀 등 다른 생년월일</span>로 프로필을 추가해도,
            한 구독으로 <span className="font-bold text-[#8B5E0A]">모든 프로필에서 해금 콘텐츠를 그대로 이용</span>할 수 있습니다.
          </p>
          <p className="mt-1 text-[11.5px] text-[#8B6020]">
            👉 프로필마다 따로 구독 없이, 단 한 번의 구독으로 OK!
          </p>
        </div>

        {/* 잔액 부족 사전 경고 */}
        {subscription.lowBalanceWarning && (
          <div className="mb-4 rounded-[14px] border border-orange-300 bg-orange-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-orange-800">
              <span aria-hidden="true">🔔</span> 코인 잔액이 부족합니다
            </p>
            <p className="mt-1 text-[11.5px] text-orange-700">
              현재 코인이 거의 소진되었습니다. 구독 기간({expires}까지)은 유지되지만,
              추가 콘텐츠 이용을 위해 충전을 추천드립니다.
            </p>
          </div>
        )}

        {/* 공통 운영 정책 안내 */}
        <div className="mb-4 rounded-[14px] border border-sky-200 bg-sky-50/60 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-sky-700">
            <span aria-hidden="true">ℹ️</span> 구독 운영 정책
          </p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] text-sky-800">
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>모든 플랜은 <strong>결제일로부터 30일간 유효</strong>합니다 (기간 기반).</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>구독은 <strong>코인 잔액과 무관하게 30일간 유지</strong>됩니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>코인 잔액이 충분하면 만료 시 <strong>자동으로 갱신</strong>됩니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">·</span>갱신은 언제든 <strong>수동으로도 가능</strong>하며, 갱신 시 30일이 추가됩니다.</li>
          </ul>
        </div>

      </div>

      {/* ────────────────────────────────────────────────── */}
      {/* 무료 플랜 안내 + 구독 훅                          */}
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

        {/* 잠긴 콘텐츠 — 구독 훅 */}
        <div className="mb-3 rounded-[14px] border border-neutral-200 bg-neutral-50/80 px-3.5 py-3">
          <p className="mb-2 text-[11px] font-extrabold text-neutral-400">🔒 구독하면 잠금이 해제돼요</p>
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
            <span className="text-[#C07B00]">구독하면 얼마나 깊이 볼 수 있을까요?</span> 🍯
          </p>
          <p className="text-[11.5px] text-[#8B6020] leading-relaxed mb-2.5">
            오늘 운세가 마음에 걸렸다면, 그건 당신의 직감이 맞는 거예요.
            <br />꿀 구독 하나로 <strong>사주·타로·점성술의 진짜 깊이</strong>를 경험해 보세요.
            가족과 연인의 운명까지, <strong>한 구독으로 모든 프로필</strong>이 열립니다.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10.5px] font-bold text-rose-700">
              ✨ 구독 즉시 잠금 해제
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-[10.5px] font-bold text-sky-700">
              👨‍👩‍👧 최대 15 프로필 한 구독으로
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10.5px] font-bold text-amber-700">
              🔄 잔액 충분 시 자동 갱신
            </span>
          </div>
        </div>
      </div>

      {/* 플랜 카드 */}
      <div className="grid gap-3 p-5 pt-0 sm:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const theme = planThemeMap[plan.theme];
          const isCurrentActive = subscription.isActive && subscription.tier === plan.id;
          const canAfford = currentPoints >= plan.coins;
          return (
            <div
              key={plan.id}
              className={[
                "relative flex flex-col rounded-[20px] border p-4 transition-shadow",
                isCurrentActive
                  ? "border-emerald-400 bg-gradient-to-b from-emerald-50/60 to-white shadow-[0_4px_20px_rgba(16,185,129,0.20)]"
                  : `${theme.card} shadow-[0_4px_18px_rgba(120,80,10,0.09)]`,
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
                  ✓ 구독 중
                </span>
              )}

              {/* 플랜 아이콘 & 이름 */}
              <p className="text-2xl leading-none">{theme.icon}</p>
              <p className={`mt-2 text-[11px] font-black uppercase tracking-wider ${theme.label}`}>{plan.title}</p>

              {/* 가격 */}
              <p className="mt-2 flex items-center gap-1 text-lg font-black text-[#5C3A1E]">
                <CoinIcon size="md" />
                {plan.coins.toLocaleString("ko-KR")}코인
                <span className="ml-0.5 text-xs font-semibold text-[#8A6020]">/ 30일</span>
              </p>
              <p className="text-[11px] text-[#7A5230]">({formatWon(plan.wonPrice)} 상당)</p>

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
                disabled={isProcessing || !canAfford}
                className={[
                  "mt-4 w-full rounded-[12px] px-3 py-2.5 text-[13px] font-black text-white shadow transition-all",
                  "hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
                  isCurrentActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_5px_14px_rgba(16,185,129,0.35)]"
                    : `bg-gradient-to-r ${theme.btn}`,
                ].join(" ")}
              >
                {isCurrentActive
                  ? "🔄 갱신하기 (30일 연장)"
                  : canAfford
                    ? `${theme.icon} ${plan.title} 시작`
                    : `코인 부족 (${plan.coins - currentPoints}개 더 필요)`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="px-5 pb-5 space-y-1">
        <p className="text-[11px] text-[#9B7040]">✅ 구독 코인은 즉시 차감되며 <strong>30일간 유효</strong>합니다.</p>
        <p className="text-[11px] text-amber-700 font-semibold">🔄 코인 잔액이 충분하면 만료 시 자동으로 갱신됩니다.</p>
        <p className="text-[11px] text-[#9B7040]">🔄 갱신 취소는 언제든 수동으로 가능합니다.</p>
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
   서브 컴포넌트: 잔액 지갑 카드
   현재 보유 코인을 샴페인 골드 테마로 표시합니다.
══════════════════════════════════════════════════════════════════ */

function WalletCard({ name, points }: { name: string; points: number }) {
  return (
    <section
      aria-label="현재 보유 코인"
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
                황금 돼지 저금통
              </p>
              <p className="mt-0.5 text-[15px] font-bold text-[#5C3A1E]">{name} 님의 코인 지갑</p>
            </div>
          </div>

          {/* 오른쪽: 보유 코인 수 */}
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              현재 보유
            </p>
            <div className="flex items-center gap-2">
              <CoinIcon size="xl" />
              <span className="text-[22px] font-black text-[#7A4A00] leading-none">
                {Number(points).toLocaleString("ko-KR")}
                <span className="ml-1 text-base font-bold text-amber-800">코인</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   서브 컴포넌트: 패키지 카드
   클릭 시 눌리는 scale 애니메이션, 선택 강조, 보너스 뱃지를 포함합니다.
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
  const isBest = pkg.id === "emperorReserve";
  const baseCoins = BASE_COINS[pkg.id] ?? pkg.points;
  const bonusCoins = pkg.points - baseCoins;

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
          🔥 BEST 혜택
        </span>
      )}

      {/* 상단 행: 상품명 + 기본 코인 수 */}
      <div className={`flex items-center justify-between gap-2 ${isBest ? "pr-[90px]" : ""}`}>
        <span className="text-[15px] font-bold text-[#5C3A1E]">{pkg.title}</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[15px] font-black text-[#9A6800]">
          <CoinIcon size="md" />
          +{baseCoins.toLocaleString("ko-KR")}코인
        </span>
      </div>

      {/* 하단 행: 가격 + 총 코인 */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#7A5230]">{formatWon(pkg.amount)}</span>
        <span className="text-sm font-bold text-[#5C3A1E]">
          총 {pkg.points.toLocaleString("ko-KR")}코인 ✨
        </span>
      </div>

      {/* 보너스 뱃지 — 오렌지-골드 그라데이션으로 강조 */}
      {bonusCoins > 0 && (
        <span className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#FF8C00] to-[#FFC107] px-2.5 py-1 text-[12px] font-black text-white shadow-[0_3px_10px_rgba(255,140,0,0.38)]">
          🎁 보너스 +{bonusCoins.toLocaleString("ko-KR")}코인
        </span>
      )}

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
  const apiBase = useMemo(() => {
    if (typeof window !== "undefined") {
      if (window.CODE_DESTINY_API_BASE_URL) return window.CODE_DESTINY_API_BASE_URL;
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        // 로컬 개발: env 또는 로컬 Express 서버
        return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
      }
      // 프로덕션: same-origin 우선 (CORS 오류 방지)
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  }, []);

  /* ── 상태 ──────────────────────────────────────────────────────── */
  const [token, setToken] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState<PointPackage>(POINT_PACKAGES[1]);
  const [selectedMethod, setSelectedMethod] = useState<string>("kakao");

  const [isBooting, setIsBooting] = useState(true);
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState(
    "신비로운 기운으로 결제를 연결 중입니다...",
  );
  const [showStarBurst, setShowStarBurst] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [cancelingPaymentId, setCancelingPaymentId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    tier:         "free",
    isActive:     false,
    expiresAt:    null,
    profileLimit: 1,
  });

  /** Toast 알림 목록 */
  const [toasts, setToasts] = useState<ToastItem[]>([]);

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

  /* ── 포인트 로컬 동기화 ────────────────────────────────────────── */
  const persistUserPoints = useCallback((points: number) => {
    setCurrentPoints(points);
    try {
      const raw = localStorage.getItem("fortune_auth_user");
      if (!raw) return;
      const user = JSON.parse(raw);
      user.points = points;
      localStorage.setItem("fortune_auth_user", JSON.stringify(user));
    } catch { /* noop */ }
  }, []);

  /* ── 서버에서 포인트 상태 조회 ─────────────────────────────────── */
  const fetchMyPointState = useCallback(
    async (authToken: string) => {
      const response = await fetch(`${apiBase}/api/payments/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("fortune_auth_token");
        localStorage.removeItem("fortune_auth_user");
        router.replace("/login?next=%2Fpoints");
        return;
      }

      // Content-Type 검증 후 JSON 파싱 — HTML 에러 페이지 방어
      const payload = await safeParseJson<MeResponse>(response);

      if (!response.ok) {
        throw new Error(payload.message || "포인트 정보를 불러오지 못했습니다.");
      }

      const points = Number(payload.user?.points || 0);
      persistUserPoints(points);

      const normalizedPayments = Array.isArray(payload.payments)
        ? payload.payments
            .filter((entry) => entry && typeof entry === "object")
            .slice(0, 10)
        : [];
      setPaymentHistory(normalizedPayments);

      if (payload.user) {
        setAuthUser((prev) => ({
          ...(prev || {}),
          id: payload.user!.id,
          name: payload.user!.name,
          email: payload.user!.email,
          points,
        }));
      }
    },
    [apiBase, persistUserPoints, router],
  );

  /* ── 초기 인증 토큰 확인 ───────────────────────────────────────── */
  useEffect(() => {
    const savedToken = localStorage.getItem("fortune_auth_token");
    const rawUser = localStorage.getItem("fortune_auth_user");

    if (!savedToken) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    setToken(savedToken);

    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser) as AuthUser;
        setAuthUser(parsed);
        if (typeof parsed.points === "number") setCurrentPoints(parsed.points);
      } catch { /* noop */ }
    }

    setIsBooting(false);
  }, [router]);

  /* ── 부팅 후 포인트 로드 ───────────────────────────────────────── */
  useEffect(() => {
    if (isBooting || !token) return;

    fetchMyPointState(token).catch((error) => {
      pushToast("error", getErrorMessage(error, "포인트 정보를 불러오지 못했습니다."));
    });
  }, [fetchMyPointState, isBooting, token, pushToast]);

  /* ── 구독 상태 로드 ─────────────────────────────────────────────── */
  useEffect(() => {
    if (isBooting || !token) return;
    fetch(`${apiBase}/api/fortune/pig-coin/profile-subscription/status`, {
      headers: { Authorization: `Bearer ${token}` },
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
        });
      })
      .catch(() => {});
  }, [isBooting, token, apiBase]);

  /* ── 서버 결제 검증 ────────────────────────────────────────────── */
  const confirmPaymentWithServer = useCallback(
    async (params: {
      impUid: string;
      merchantUid?: string;
      paymentAmount?: number;
      chargePoints?: number;
      paymentMethod?: string;
    }) => {
      const body: Record<string, unknown> = {
        impUid: params.impUid,
        merchantUid: params.merchantUid,
        paymentMethod: params.paymentMethod,
      };
      if (Number.isInteger(params.paymentAmount)) body.paymentAmount = params.paymentAmount;
      if (Number.isInteger(params.chargePoints)) body.chargePoints = params.chargePoints;

      const response = await fetch(`${apiBase}/api/payments/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      // Content-Type 검증 후 JSON 파싱
      const payload = await safeParseJson<ConfirmResponse & { message?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.message || "서버 결제 검증에 실패했습니다.");
      }

      return payload;
    },
    [apiBase, token],
  );

  const reportPaymentFailureToServer = useCallback(
    async (payload: PaymentFailureReportPayload) => {
      if (!token) return;
      try {
        await fetch(`${apiBase}/api/payments/report-failure`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch {
        // 실패 보고는 보조 경로이므로 UI 흐름을 막지 않는다.
      }
    },
    [apiBase, token],
  );

  /* ── 결제 성공 후 처리 ─────────────────────────────────────────── */
  const handleConfirmSuccess = useCallback(
    async (result: ConfirmResponse, fromRedirect = false) => {
      const points = Number(result.user?.points || 0);
      persistUserPoints(points);
      pushToast(
        "success",
        fromRedirect
          ? "모바일 결제 복귀 확인이 완료되었습니다. 포인트가 정상 충전되었어요 ✨"
          : result.message || "결제가 완료되어 포인트가 충전되었습니다 ✨",
      );
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
      await fetchMyPointState(token);
    },
    [fetchMyPointState, persistUserPoints, pushToast, token],
  );

  const requestCancelPayment = useCallback(
    async (payment: PaymentHistoryItem) => {
      if (!token) return;

      const ok = window.confirm(
        `${formatWon(payment.paymentAmount)} 결제를 취소할까요?\n이미 사용한 코인이 있으면 취소가 제한될 수 있습니다.`,
      );
      if (!ok) return;

      setCancelingPaymentId(payment.id);
      try {
        const response = await fetch(`${apiBase}/api/payments/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            impUid: payment.impUid,
            merchantUid: payment.merchantUid,
            reason: "사용자 취소 요청",
          }),
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

        await fetchMyPointState(token);
        pushToast("success", payload.message || "결제가 취소되었습니다.");
      } catch (error: unknown) {
        pushToast("error", getErrorMessage(error, "결제 취소 처리 중 오류가 발생했습니다."));
      } finally {
        setCancelingPaymentId(null);
      }
    },
    [apiBase, fetchMyPointState, persistUserPoints, pushToast, token],
  );

  /* ── 모바일 결제 리디렉션 복귀 처리 ───────────────────────────── */
  useEffect(() => {
    if (isBooting || !token || redirectHandledRef.current) return;
    if (typeof window === "undefined") return;

    const query = new URLSearchParams(window.location.search);
    const impUid = query.get("imp_uid");
    if (!impUid) return;

    redirectHandledRef.current = true;

    const merchantUidFromQuery = query.get("merchant_uid") || undefined;
    const pending = readPendingOrder();

    setIsProcessing(true);
    setProcessingText("모바일 결제 복귀 신호를 확인하고 있습니다...");

    confirmPaymentWithServer({
      impUid,
      merchantUid: merchantUidFromQuery || pending?.merchantUid,
      paymentAmount: pending?.paymentAmount,
      chargePoints: pending?.chargePoints,
      paymentMethod: pending?.paymentMethod,
    })
      .then(async (result) => {
        clearPendingOrder();
        await handleConfirmSuccess(result, true);
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
      })
      .finally(() => setIsProcessing(false));
  }, [confirmPaymentWithServer, handleConfirmSuccess, isBooting, token, pushToast, reportPaymentFailureToServer]);

  /* ── 결제 시작 ─────────────────────────────────────────────────── */
  const startPayment = async () => {
    if (!token || !authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }

    setIsProcessing(true);
    setProcessingText("신비로운 기운으로 결제를 연결 중입니다...");

    try {
      const prepareResponse = await fetch(`${apiBase}/api/payments/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentAmount: selectedPackage.amount,
          chargePoints: selectedPackage.points,
          paymentMethod: selectedMethod,
          productName: `${selectedPackage.title} (${formatPoints(selectedPackage.points)})`,
        }),
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
        chargePoints: order.chargePoints,
        paymentMethod: selectedMethod,
      });

      await ensurePortoneSdk();

      if (!window.IMP) {
        throw new Error("포트원 결제 SDK가 초기화되지 않았습니다.");
      }

      const pgConfig = resolvePgConfig(selectedMethod);
      window.IMP.init(PORTONE_IMP_CODE);

      const requestData: Record<string, unknown> = {
        pg: pgConfig.pg,
        pay_method: pgConfig.payMethod,
        merchant_uid: order.merchantUid,
        name: order.productName,
        amount: order.paymentAmount,
        buyer_name: authUser.name || "회원",
        buyer_email: authUser.email || "",
        m_redirect_url: `${window.location.origin}/points`,
        custom_data: {
          userId: authUser.id,
          packageId: selectedPackage.id,
          chargePoints: order.chargePoints,
          paymentMethod: selectedMethod,
        },
      };

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
            setProcessingText("결제 검증 및 포인트 정산을 진행하고 있습니다...");
            const result = await confirmPaymentWithServer({
              impUid: rsp.imp_uid,
              merchantUid: order.merchantUid,
              paymentAmount: order.paymentAmount,
              chargePoints: order.chargePoints,
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

  /* ── 구독 결제 핸들러 ───────────────────────────────────────────── */
  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!token || !authUser) {
      router.replace("/login?next=%2Fpoints");
      return;
    }
    if (currentPoints < plan.coins) {
      pushToast("error", `코인이 부족합니다. ${plan.coins}코인 필요 (보유: ${currentPoints}코인)`);
      return;
    }
    setIsProcessing(true);
    setProcessingText(`${plan.title} 구독을 활성화하는 중입니다...`);
    try {
      const res = await fetch(`${apiBase}/api/fortune/pig-coin/profile-subscription/subscribe`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ tier: plan.id }),
      });
      const data = await safeParseJson<{
        message?: string;
        subscription?: SubscriptionStatus;
        user?: { points: number };
      }>(res);
      if (res.status === 402) {
        pushToast("error", "코인이 부족합니다. 충전 후 다시 시도해 주세요.");
        return;
      }
      if (!res.ok) {
        pushToast("error", data.message || "구독 처리에 실패했습니다.");
        return;
      }
      if (data.user?.points !== undefined) persistUserPoints(Number(data.user.points));
      if (data.subscription) {
        setSubscription(data.subscription);
      }
      pushToast("success", data.message || `${plan.title} 구독이 시작되었습니다! ✨`);
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
    } catch (error: unknown) {
      pushToast("error", getErrorMessage(error, "구독 처리 중 오류가 발생했습니다."));
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
          <p className="font-semibold">황금 돼지 저금통을 불러오는 중...</p>
        </div>
      </main>
    );
  }

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
                <img
                  src="/icons/honeypig-96.webp"
                  srcSet="/icons/honeypig-96.webp 96w, /icons/honeypig-130.webp 130w, /icons/honeypig.webp 512w"
                  sizes="72px"
                  width={72}
                  height={72}
                  alt="황금 돼지"
                  className="rounded-2xl shadow-[0_6px_20px_rgba(150,76,11,0.26)]"
                />
                <div>
                  <p className="text-[11px] font-extrabold tracking-[0.22em] text-amber-800 uppercase">
                    Golden Pig Coin
                  </p>
                  <h1 className="mt-0.5 text-[22px] font-black text-[#5C3A1E] sm:text-3xl leading-tight">
                    🐷✨ 황금 돼지 저금통 충전소
                  </h1>
                  <p className="mt-1 text-sm text-[#7A5230]">
                    💫 동전을 채울수록 보너스가 커져요. 높은 단계일수록 더 많이 드려요.
                  </p>
                </div>
              </div>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-[#EDDBA3] bg-white/90 px-4 py-2.5 text-sm font-bold text-[#7A5230] shadow-[0_2px_10px_rgba(180,130,30,0.14)] transition-all hover:bg-[#FFF8E0] hover:shadow-[0_4px_14px_rgba(180,130,30,0.22)] hover:-translate-y-0.5 active:scale-[0.97]"
              >
                ← 서비스 화면으로
              </Link>
            </div>
          </div>
        </header>

        {/* ② 잔액 카드 */}
        <WalletCard name={authUser?.name || "사용자"} points={currentPoints} />

        {/* ③ 프로필 구독 섹션 */}
        <SubscriptionSection
          subscription={subscription}
          currentPoints={currentPoints}
          onSubscribe={handleSubscribe}
          isProcessing={isProcessing}
        />

        {/* ④ 섹션 구분선 */}
        <div className="flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700">
            충전 패키지 선택
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400 to-transparent opacity-50" />
        </div>

        {/* ④ 패키지 카드 목록 */}
        <section
          aria-label="충전 패키지"
          className="rounded-[24px] overflow-hidden shadow-[0_8px_32px_rgba(120,80,10,0.10)]"
        >
          <div
            className="border border-[#EDDBA3] rounded-[24px] p-5"
            style={{ background: "linear-gradient(135deg, #FFFDF8 0%, #FEFBF0 100%)" }}
          >
            <p className="mb-3 flex items-center gap-2 text-[12px] font-bold text-[#8A6020]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              패키지를 선택한 뒤 결제 수단을 고르세요.
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
                결제 완료 즉시 서버에서 금액 검증 후 코인이 반영됩니다.
                <span className="mx-1">·</span>
                황금 돼지 제왕 보물고 (엔페러 리저브)는 코인 효율이 가장 높습니다.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[20px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.88)] p-5">
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
        <section className="rounded-[20px] border border-[#EDDBA3]/60 bg-[rgba(255,248,228,0.55)] p-5">
          <h3 className="font-bold text-[#5C3A1E]">결제 실패 안내</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[#7A5230]">
            <li>• 창 닫기/취소: 결제가 취소되어 코인이 차감되지 않습니다.</li>
            <li>• 한도 초과: 다른 카드/계좌이체 또는 금액을 낮춰 재시도해 주세요.</li>
            <li>• 카드사 점검: 잠시 후 다시 시도하거나 다른 결제수단을 선택해 주세요.</li>
          </ul>
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

      {/* ══ 결제 처리 중 오버레이 ════════════════════════════════════ */}
      {isProcessing && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(20,10,5,0.65)] backdrop-blur-sm">
          <div className="rounded-[28px] border border-[#EDDBA3] bg-[#FFF9EC] px-10 py-8 text-center shadow-[0_24px_70px_rgba(80,40,5,0.38)]">
            <div className="mx-auto mb-3 text-5xl animate-bounce">🐷</div>
            <p className="font-bold text-[#5C3A1E]">황금 돼지가 코인을 세고 있어요...</p>
            <p className="mt-1 text-sm text-[#7A5230]">{processingText}</p>
          </div>
        </div>
      )}
    </main>
  );
}
