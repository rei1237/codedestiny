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
};

/* ── 프로필 구독 타입 ───────────────────────────────────────── */
type SubscriptionTier = "free" | "standard" | "premium";

type SubscriptionStatus = {
  tier:         SubscriptionTier;
  isActive:     boolean;
  expiresAt:    string | null;
  profileLimit: number; // 0 = unlimited
};

type SubscriptionPlan = {
  id:           "standard" | "premium";
  title:        string;
  wonPrice:     number;
  coins:        number;
  profileLimit: number | null; // null = unlimited
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
};

type PendingOrder = {
  merchantUid: string;
  paymentAmount: number;
  chargePoints: number;
  paymentMethod: string;
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

/* 프로필 구독 플랜 정의 */
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id:           "standard",
    title:        "스탠다드",
    wonPrice:     9900,
    coins:        115,
    profileLimit: 3,
    features:     ["프로필 3개 생성 가능", "30일간 유효", "코인 잔액 > 0 조건 시 활성", "구독자 한정 프로필 삭제·관리 가능"],
  },
  {
    id:           "premium",
    title:        "프리미엄",
    wonPrice:     29900,
    coins:        360,
    profileLimit: null,
    features:     ["프로필 무제한 생성", "30일간 유효", "코인 잔액 무관 안정 유지", "전체 프로필 관리 기능 포함"],
    badge:        "추천",
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
    standard: "스탠다드",
    premium:  "프리미엄",
  };
  const tierColor: Record<SubscriptionTier, string> = {
    free:     "text-neutral-500",
    standard: "text-amber-700",
    premium:  "text-rose-700",
  };
  const expires = subscription.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <section
      aria-label="프로필 구독"
      className="rounded-[24px] border border-[#EDDBA3] bg-white/90 p-5 shadow-[0_8px_32px_rgba(120,80,10,0.08)]"
    >
      {/* 섹션 제목 */}
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#A0700A]">Profile Subscription</p>
        <h2 className="mt-0.5 text-xl font-bold text-[#5C3A1E]">🐷 프로필 다중 구독</h2>
        <p className="mt-1 text-sm text-[#7A5230]">
          황금 돼지 코인으로 구독하면 여러 생년월일 프로필을 만들어 해금 콘텐츠를 이용할 수 있습니다.
        </p>
      </div>

      {/* 현재 구독 상태 */}
      <div className="mb-5 rounded-[16px] border border-[#EDDBA3]/80 bg-[#FFF8E0]/70 px-4 py-3">
        <p className="text-xs font-semibold text-[#8A6020]">현재 구독 플랜</p>
        <p className={`mt-0.5 text-lg font-black ${tierColor[subscription.tier]}`}>
          {tierLabel[subscription.tier]}
          {subscription.isActive && <span className="ml-2 text-sm font-semibold text-emerald-600">● 활성</span>}
          {!subscription.isActive && subscription.tier !== "free" && <span className="ml-2 text-sm font-semibold text-rose-500">● 만료</span>}
        </p>
        {subscription.isActive && expires && (
          <p className="mt-0.5 text-xs text-[#7A5230]">{expires} 까지 유효</p>
        )}
        {subscription.tier === "standard" && subscription.isActive && (
          <p className="mt-1 text-xs text-amber-700">⚠️ 스탠다드 플랜: 코인 잔액이 0이 되면 일시 비활성화됩니다.</p>
        )}
      </div>

      {/* 플랜 카드 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrentActive = subscription.isActive && subscription.tier === plan.id;
          const canAfford = currentPoints >= plan.coins;
          return (
            <div
              key={plan.id}
              className={[
                "relative rounded-[20px] border p-5",
                isCurrentActive
                  ? "border-emerald-400 bg-emerald-50/60 shadow-[0_4px_20px_rgba(16,185,129,0.18)]"
                  : "border-[#EDDBA3] bg-white shadow-[0_4px_14px_rgba(180,130,30,0.10)]",
              ].join(" ")}
            >
              {/* 추천 뱃지 */}
              {plan.badge && (
                <span className="absolute top-3 right-3 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
                  ✨ {plan.badge}
                </span>
              )}
              {isCurrentActive && (
                <span className="absolute top-3 right-3 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-black text-white shadow">
                  ✓ 구독 중
                </span>
              )}

              <p className="text-xs font-bold uppercase tracking-wider text-[#A0700A]">{plan.title}</p>
              <p className="mt-1 text-xl font-black text-[#5C3A1E]">
                🪙 {plan.coins.toLocaleString("ko-KR")}코인
                <span className="ml-1 text-sm font-semibold text-[#8A6020]">/ 30일</span>
              </p>
              <p className="text-xs text-[#7A5230]">({formatWon(plan.wonPrice)} 상당)</p>

              <ul className="mt-3 space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-[#5C3A1E]">
                    <span className="mt-0.5 flex-shrink-0 text-amber-500">✦</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => onSubscribe(plan)}
                disabled={isProcessing || !canAfford}
                className={[
                  "mt-4 w-full rounded-[14px] px-4 py-3 text-sm font-black text-white shadow transition-all",
                  "hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
                  isCurrentActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_6px_16px_rgba(16,185,129,0.35)]"
                    : "bg-gradient-to-r from-[#C9A84C] to-[#E8C060] shadow-[0_8px_20px_rgba(160,120,20,0.38)]",
                ].join(" ")}
              >
                {isCurrentActive
                  ? "🔄 갱신하기 (30일 연장)"
                  : canAfford
                    ? `🐷 ${plan.title} 구독 시작`
                    : `🪙 코인 부족 (${plan.coins - currentPoints}개 더 필요)`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-[#9B7040]">
        ✅ 구독은 코인 즉시 차감 방식이며 30일 후 만료됩니다. 갱신은 언제든 수동으로 가능합니다.
      </p>
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
   서브 컴포넌트: 잔액 지갑 카드
   현재 보유 코인을 샴페인 골드 테마로 표시합니다.
══════════════════════════════════════════════════════════════════ */

function WalletCard({ name, points }: { name: string; points: number }) {
  return (
    <section
      aria-label="현재 보유 코인"
      className="rounded-[20px] border border-[#E8CC7A] p-5 shadow-[0_6px_24px_rgba(180,130,30,0.16)]"
      style={{ background: "linear-gradient(135deg, #FFF8E0 0%, #FFF0C0 60%, #FFE49C 100%)" }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 왼쪽: 코인 아이콘 + 사용자 이름 */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl"
            style={{
              background: "radial-gradient(circle at 30% 28%, #fff9ce 0%, #ffd14d 50%, #c8900a 100%)",
              boxShadow: "inset 0 2px 8px rgba(255,255,255,0.6), 0 4px 12px rgba(140,80,10,0.28)",
            }}
            aria-hidden="true"
          >
            🐷
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#8A6020]">
              황금 돼지 저금통
            </p>
            <p className="text-[15px] font-bold text-[#5C3A1E]">{name} 님의 코인 지갑</p>
          </div>
        </div>

        {/* 오른쪽: 보유 코인 수 */}
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A6020]">
            현재 보유
          </p>
          <p className="text-2xl font-black text-[#7A4A00]">
            🪙 {Number(points).toLocaleString("ko-KR")}코인
          </p>
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
          ? "border-[#C9A84C] bg-gradient-to-r from-[#FFFBF0] to-[#FFF0CC] shadow-[0_12px_28px_rgba(180,130,30,0.25)] -translate-y-0.5"
          : "border-[#EDDBA3] bg-white/90 shadow-[0_4px_14px_rgba(180,130,30,0.08)] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(180,130,30,0.18)]",
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
        <span className="whitespace-nowrap text-[15px] font-black text-[#9A6800]">
          🪙 +{baseCoins.toLocaleString("ko-KR")}코인
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
        <span className="absolute bottom-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A84C] text-[10px] font-black text-white shadow">
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
    if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
    if (typeof window !== "undefined") {
      if (window.CODE_DESTINY_API_BASE_URL) return window.CODE_DESTINY_API_BASE_URL;
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        return "http://localhost:4000";
      }
      return window.location.origin;
    }
    return "http://localhost:4000";
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
          tier:         d.tier         || "free",
          isActive:     !!d.isActive,
          expiresAt:    d.expiresAt    || null,
          profileLimit: typeof d.profileLimit === "number" ? d.profileLimit : 1,
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
        pushToast("error", getErrorMessage(error, "모바일 결제 검증에 실패했습니다."));
      })
      .finally(() => setIsProcessing(false));
  }, [confirmPaymentWithServer, handleConfirmSuccess, isBooting, token, pushToast]);

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

      await new Promise<void>((resolve) => {
        window.IMP!.request_pay(requestData, async (rsp: PortOnePaymentResponse) => {
          if (!rsp || !rsp.success) {
            const message = mapPaymentErrorMessage(
              rsp?.error_msg || rsp?.errorMsg || "결제가 취소되었습니다.",
            );
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
            pushToast("error", getErrorMessage(error, "결제 검증에 실패했습니다."));
          } finally {
            setIsProcessing(false);
            resolve();
          }
        });
      });
    } catch (error: unknown) {
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
      if (data.subscription) setSubscription(data.subscription);
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
      style={{ background: "linear-gradient(160deg, #FDF8F0 0%, #FDF0D8 50%, #FAE8C8 100%)" }}
    >
      {/* ── 배경 글로우 오브 ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, rgba(255,220,120,0.55) 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(255,180,80,0.55) 0%, transparent 70%)" }}
        />
      </div>

      {/* ── 결제 성공 StarBurst 이펙트 ───────────────────────────── */}
      {showStarBurst && (
        <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl animate-ping">🪙</div>
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
        <header className="rounded-[24px] border border-[#EDDBA3] bg-white/85 p-6 shadow-[0_12px_40px_rgba(120,80,10,0.10)] backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/icons/honeypig-96.webp"
                srcSet="/icons/honeypig-96.webp 96w, /icons/honeypig-130.webp 130w, /icons/honeypig.webp 512w"
                sizes="72px"
                width={72}
                height={72}
                alt="황금 돼지"
                className="rounded-2xl shadow-[0_6px_20px_rgba(150,76,11,0.22)]"
              />
              <div>
                <p className="text-[11px] font-bold tracking-[0.22em] text-[#A0700A] uppercase">
                  Golden Pig Coin
                </p>
                <h1 className="mt-0.5 text-2xl font-bold text-[#5C3A1E] sm:text-3xl">
                  🐷✨ 황금 돼지 저금통 충전소
                </h1>
                <p className="mt-1 text-sm text-[#7A5230]">
                  💫 동전을 채울수록 보너스가 커져요. 높은 단계일수록 더 많이 드려요.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center self-start rounded-xl border border-[#EDDBA3] bg-white/80 px-4 py-2 text-sm font-semibold text-[#7A5230] shadow-sm transition-colors hover:bg-[#FFF8E0]"
            >
              ← 운세 화면으로
            </Link>
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
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent opacity-40" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#A0700A]">
            충전 패키지 선택
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C9A84C] to-transparent opacity-40" />
        </div>

        {/* ④ 패키지 카드 목록 */}
        <section
          aria-label="충전 패키지"
          className="rounded-[24px] border border-[#EDDBA3] bg-white/90 p-5 shadow-[0_8px_32px_rgba(120,80,10,0.08)]"
        >
          <p className="mb-4 text-right text-[12px] text-[#7A5230]">
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
          <p className="mt-4 text-[11px] text-[#9B7040]">
            ✅ 결제 완료 즉시 서버에서 금액 검증 후 코인이 반영됩니다.{" "}
            👑 최상위 단계가 가장 큰 보너스를 제공합니다.
          </p>
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
          <div className="w-full max-w-lg rounded-[28px] border border-[#EDDBA3] bg-gradient-to-b from-[#FFF9EC] to-[#FFF0CC] p-6 shadow-[0_24px_70px_rgba(80,40,5,0.38)]">

            {/* 모달 헤더 */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A0700A]">
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
              className="mt-5 w-full rounded-[16px] bg-gradient-to-r from-[#C9A84C] to-[#E8C060] px-4 py-4 text-base font-black text-white shadow-[0_10px_24px_rgba(160,120,20,0.40)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(160,120,20,0.50)] active:scale-[0.97] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? "🐷 연결 중..." : "🪙 이 수단으로 결제 진행"}
            </button>
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
