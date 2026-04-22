import { writeFileSync } from "fs";

const content = `"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import SubscriptionStatusCard from "./SubscriptionStatusCard";

const GalaxiaPayModal = dynamic(() => import("./GalaxiaPayModal"), { ssr: false });
const BillingCardModal = dynamic(() => import("./BillingCardModal"), { ssr: false });

/* ══════════════════════════════════════════════════════════════
   타입 정의
══════════════════════════════════════════════════════════════ */

type AuthUser = { id: string; name: string; email: string; phone?: string; role?: "user" | "admin"; points?: number };
type PointPackage = { id: string; title: string; amount: number; points: number };
type SubscriptionTier = "free" | "standard" | "premium" | "vvip";
type AdminTestTier = "off" | "standard" | "premium" | "vvip";

type SubscriptionStatus = {
  tier: SubscriptionTier;
  isActive: boolean;
  expiresAt: string | null;
  profileLimit: number;
  lowBalanceWarning?: boolean;
};

type SubscriptionPlan = {
  id: "standard" | "premium" | "vvip";
  title: string;
  wonPrice: number;
  coins: number;
  profileLimit: number | null;
  freeUpTo: number | null;
  theme: "amber" | "rose" | "purple";
  features: string[];
  badge?: string;
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

type RegisteredCard = {
  billingKey: string;
  cardName: string;
  cardNumber: string;
  registeredAt: string;
};

type ToastItem = { id: number; type: "error" | "success" | "info"; text: string };

/* ══════════════════════════════════════════════════════════════
   상수
══════════════════════════════════════════════════════════════ */

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "standard", title: "스탠다드 꿀", wonPrice: 9900, coins: 115,
    profileLimit: 3, freeUpTo: 30, theme: "amber",
    features: ["프로필 최대 3개 생성", "30코인 이하 서비스 무료 이용", "모든 프로필 해금 콘텐츠 동일 적용", "30일간 유효", "자동결제 없음"],
  },
  {
    id: "premium", title: "프리미엄 꿀", wonPrice: 29900, coins: 360,
    profileLimit: 7, freeUpTo: 50, theme: "rose",
    features: ["프로필 최대 7개 생성", "50코인 이하 서비스 무료 이용", "모든 프로필 해금 콘텐츠 동일 적용", "30일간 유효", "자동결제 없음"],
    badge: "추천",
  },
  {
    id: "vvip", title: "VVIP 꿀단지", wonPrice: 59000, coins: 700,
    profileLimit: 15, freeUpTo: 100, theme: "purple",
    features: ["프로필 최대 15개 생성", "100코인 이하 서비스 무료 이용", "모든 프로필 해금 콘텐츠 동일 적용", "30일간 유효", "자동결제 없음"],
    badge: "VVIP",
  },
];

const BASE_COINS: Record<string, number> = {
  sample: 30, luckyMeal: 100, goldBarn: 300, goldVault: 700, emperorReserve: 1500,
};

const POINT_PACKAGES: PointPackage[] = [
  { id: "sample",         title: "맛보기 한 줌",         amount: 3300,   points: 30   },
  { id: "luckyMeal",      title: "행운의 한 끼",          amount: 9900,   points: 115  },
  { id: "goldBarn",       title: "황금 돼지 곳간",         amount: 29000,  points: 360  },
  { id: "goldVault",      title: "황금 돼지 금고",         amount: 59000,  points: 880  },
  { id: "emperorReserve", title: "황금 돼지 제왕 보물고",  amount: 119000, points: 2000 },
];

/* ══════════════════════════════════════════════════════════════
   유틸
══════════════════════════════════════════════════════════════ */

function fmtWon(n: number) { return \`\${Number(n || 0).toLocaleString("ko-KR")}원\`; }
function fmtCoins(n: number) { return \`\${Number(n || 0).toLocaleString("ko-KR")}코인\`; }
function fmtDate(raw?: string | null) {
  if (!raw) return "-";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function statusBadge(s: string) {
  if (s === "success")   return { label: "결제완료", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  if (s === "cancelled") return { label: "취소완료", cls: "bg-neutral-100 text-neutral-700 border-neutral-300" };
  if (s === "failed")    return { label: "실패",     cls: "bg-rose-100 text-rose-700 border-rose-300" };
  return { label: "대기", cls: "bg-amber-100 text-amber-700 border-amber-300" };
}
async function safeJson<T>(r: Response): Promise<T> {
  const ct = r.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) throw new Error(\`서버 점검 중입니다. (HTTP \${r.status})\`);
  return r.json() as Promise<T>;
}
function getErrMsg(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}
function isFlowerAdmin() {
  if (typeof window === "undefined") return false;
  return !!(localStorage.getItem("flower_admin_token") || sessionStorage.getItem("flower_admin_token"));
}
function getFlowerAdminToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("flower_admin_token") || sessionStorage.getItem("flower_admin_token") || "";
}

/* ══════════════════════════════════════════════════════════════
   서브 컴포넌트
══════════════════════════════════════════════════════════════ */

function CoinIcon({ size = "md", className = "" }: { size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const s: Record<string, string> = { sm: "h-4 w-4 text-[8px]", md: "h-5 w-5 text-[10px]", lg: "h-6 w-6 text-[13px]", xl: "h-8 w-8 text-[16px]" };
  return (
    <span aria-hidden className={\`inline-flex flex-shrink-0 items-center justify-center rounded-full font-black text-white select-none \${s[size]} \${className}\`}
      style={{ background: "radial-gradient(circle at 38% 32%,#fff6b0 0%,#f5c842 45%,#c8860a 100%)", boxShadow: "inset 0 2px 3px rgba(255,255,255,0.55),inset 0 -1px 2px rgba(0,0,0,0.18),0 2px 6px rgba(140,80,0,0.28)" }}>
      ✦
    </span>
  );
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-5 left-1/2 z-[200] -translate-x-1/2 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} role="alert" className={\`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-xl \${t.type === "success" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : t.type === "error" ? "bg-rose-50 border-rose-300 text-rose-800" : "bg-amber-50 border-amber-300 text-amber-900"}\`}>
          <span className="mt-0.5 flex-shrink-0">{t.type === "success" ? "✅" : t.type === "error" ? "⚠️" : "ℹ️"}</span>
          <span className="flex-1 leading-snug">{t.text}</span>
          <button type="button" onClick={() => onDismiss(t.id)} className="flex-shrink-0 opacity-50 hover:opacity-90 transition-opacity">✕</button>
        </div>
      ))}
    </div>
  );
}

function WalletCard({ name, points }: { name: string; points: number }) {
  return (
    <section aria-label="현재 보유 코인" className="rounded-[24px] overflow-hidden shadow-[0_10px_36px_rgba(180,130,30,0.22)]">
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg,#C8860A 0%,#FFE070 30%,#FFF 50%,#FFE070 70%,#C8860A 100%)" }} />
      <div className="border border-t-0 border-amber-200 rounded-b-[24px] p-5" style={{ background: "linear-gradient(135deg,#FFFAE8 0%,#FFF3CC 50%,#FFE89C 100%)" }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-[26px]"
              style={{ background: "radial-gradient(circle at 35% 30%,#fff9ce 0%,#ffd14d 55%,#c8900a 100%)", boxShadow: "inset 0 2px 8px rgba(255,255,255,0.65),0 6px 16px rgba(140,80,10,0.32)" }}>
              🐷
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-800">황금 돼지 저금통</p>
              <p className="mt-0.5 text-[15px] font-bold text-[#5C3A1E]">{name} 님의 코인 지갑</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">현재 보유</p>
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

function PackageCard({ pkg, selected, onSelect }: { pkg: PointPackage; selected: boolean; onSelect: (p: PointPackage) => void }) {
  const isBest = pkg.id === "emperorReserve";
  const base = BASE_COINS[pkg.id] ?? pkg.points;
  const bonus = pkg.points - base;
  return (
    <button type="button" onClick={() => onSelect(pkg)}
      className={["relative w-full rounded-[20px] border p-4 text-left transition-all duration-200 active:scale-[0.97]",
        selected ? "border-amber-400 bg-gradient-to-r from-[#FFFBF0] to-[#FFF0CC] shadow-[0_12px_28px_rgba(180,130,30,0.28)] -translate-y-0.5 ring-2 ring-amber-300/50"
          : "border-[#EDDBA3] bg-white/95 shadow-[0_4px_14px_rgba(180,130,30,0.09)] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(180,130,30,0.20)] hover:border-amber-300",
      ].join(" ")}>
      {isBest && <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FF5F45] to-[#FF9A3C] px-2.5 py-1 text-[11px] font-black text-white shadow-[0_4px_12px_rgba(214,91,33,0.40)]">🔥 BEST 혜택</span>}
      <div className={\`flex items-center justify-between gap-2 \${isBest ? "pr-[90px]" : ""}\`}>
        <span className="text-[15px] font-bold text-[#5C3A1E]">{pkg.title}</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[15px] font-black text-[#9A6800]">
          <CoinIcon size="md" />+{base.toLocaleString("ko-KR")}코인
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#7A5230]">{fmtWon(pkg.amount)}</span>
        <span className="text-sm font-bold text-[#5C3A1E]">총 {pkg.points.toLocaleString("ko-KR")}코인 ✨</span>
      </div>
      {bonus > 0 && (
        <span className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#FF8C00] to-[#FFC107] px-2.5 py-1 text-[12px] font-black text-white shadow-[0_3px_10px_rgba(255,140,0,0.38)]">
          🎁 보너스 +{bonus.toLocaleString("ko-KR")}코인
        </span>
      )}
      {selected && <span className="absolute bottom-4 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow">✓</span>}
    </button>
  );
}

function SubscriptionSection({
  subscription, currentPoints, onSubscribe, isProcessing,
  isFlowerAdminMode, adminTestTier, onChangeAdminTestTier,
  registeredCard, onRegisterCard,
}: {
  subscription: SubscriptionStatus;
  currentPoints: number;
  onSubscribe: (plan: SubscriptionPlan) => void;
  isProcessing: boolean;
  isFlowerAdminMode: boolean;
  adminTestTier: AdminTestTier;
  onChangeAdminTestTier: (t: AdminTestTier) => void;
  registeredCard: RegisteredCard | null;
  onRegisterCard: () => void;
}) {
  type ThemeKey = "amber" | "rose" | "purple";
  const themeMap: Record<ThemeKey, { card: string; label: string; badge: string; freeTag: string; btn: string; icon: string }> = {
    amber:  { card: "border-amber-300 bg-gradient-to-b from-amber-50/50 to-white",   label: "text-amber-800",  badge: "from-amber-500 to-yellow-400",   freeTag: "bg-amber-100 text-amber-800 ring-1 ring-amber-400/50",   btn: "from-[#C9A84C] to-[#F0C830] shadow-[0_6px_16px_rgba(160,120,0,0.32)]",    icon: "🍯" },
    rose:   { card: "border-rose-300 bg-gradient-to-b from-rose-50/50 to-white",     label: "text-rose-700",   badge: "from-rose-500 to-amber-500",     freeTag: "bg-rose-100 text-rose-800 ring-1 ring-rose-400/50",     btn: "from-rose-500 to-amber-400 shadow-[0_6px_16px_rgba(220,60,60,0.32)]",     icon: "🌹" },
    purple: { card: "border-purple-300 bg-gradient-to-b from-purple-50/50 to-white", label: "text-purple-700", badge: "from-purple-600 to-violet-500",   freeTag: "bg-purple-100 text-purple-800 ring-1 ring-purple-400/50", btn: "from-purple-600 to-violet-600 shadow-[0_6px_16px_rgba(120,50,200,0.35)]", icon: "👑" },
  };

  const expires = subscription.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <section aria-label="꿀 구독 시스템" className="rounded-[24px] border border-[#EDDBA3] bg-white/90 overflow-hidden shadow-[0_8px_32px_rgba(120,80,10,0.10)]">
      <div className="px-5 pt-5 pb-4" style={{ background: "linear-gradient(135deg,#FFFDF7 0%,#FFF9EC 100%)" }}>
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#A0700A]">Honey Subscription</p>
          <h2 className="mt-0.5 text-xl font-bold text-[#5C3A1E]">🍯 꿀 구독 시스템</h2>
          <p className="mt-1 text-sm text-[#7A5230]">꽃돼지 코인 하나로 여러 생년월일 프로필을 만들고 해금 콘텐츠를 마음껏 즐기세요.</p>
        </div>
        <div className="mb-4 rounded-[14px] border border-sky-200 bg-sky-50/60 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-sky-700">ℹ️ 구독 운영 정책</p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] text-sky-800">
            <li className="flex items-start gap-1.5"><span className="mt-0.5">·</span>모든 플랜은 <strong>결제일로부터 30일간 유효</strong>합니다.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5">·</span>구독은 <strong>코인 잔액과 무관하게 30일간 유지</strong>됩니다.</li>
            <li className="flex items-start gap-1.5 font-bold text-rose-600"><span className="mt-0.5">🚫</span><strong>자동결제(정기결제)는 없습니다.</strong> 포인트 충전 후 직접 구독 활성화.</li>
            <li className="flex items-start gap-1.5"><span className="mt-0.5">·</span>만료 후 연장: 포인트 충전 후 <strong>수동 갱신</strong> (30일 추가).</li>
          </ul>
        </div>
        {subscription.lowBalanceWarning && expires && (
          <div className="mb-4 rounded-[14px] border border-orange-300 bg-orange-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-orange-800">🔔 코인 잔액이 부족합니다</p>
            <p className="mt-1 text-[11.5px] text-orange-700">구독 기간({expires}까지)은 유지되지만 추가 콘텐츠 이용을 위해 충전을 추천드립니다.</p>
          </div>
        )}
        {isFlowerAdminMode && (
          <div className="mb-4 rounded-[14px] border border-violet-300 bg-violet-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-violet-800">🧪 관리자 구독 티어 테스트 모드</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {(["off", "standard", "premium", "vvip"] as AdminTestTier[]).map((t) => (
                <button key={t} type="button" onClick={() => onChangeAdminTestTier(t)}
                  className={["rounded-full px-3 py-1.5 text-[11.5px] font-bold transition", adminTestTier === t ? "bg-violet-600 text-white" : "bg-white text-violet-700 ring-1 ring-violet-300 hover:bg-violet-100"].join(" ")}>
                  {t === "off" ? "해제" : t === "standard" ? "스탠다드 꿀" : t === "premium" ? "프리미엄 꿀" : "VVIP 꿀단지"}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mb-4 rounded-[14px] border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11.5px] font-bold text-gray-600">등록된 카드</p>
              {registeredCard ? (
                <p className="text-[13px] font-black text-gray-800 mt-0.5">{registeredCard.cardName} · {registeredCard.cardNumber}</p>
              ) : (
                <p className="text-[12px] text-gray-400 mt-0.5">등록된 카드가 없습니다</p>
              )}
            </div>
            <button type="button" onClick={onRegisterCard}
              className="flex-shrink-0 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-800 hover:bg-amber-100 transition-colors">
              {registeredCard ? "카드 변경" : "카드 등록"}
            </button>
          </div>
          {registeredCard && (
            <p className="mt-1.5 text-[10.5px] text-gray-400">등록일: {fmtDate(registeredCard.registeredAt)}</p>
          )}
        </div>
      </div>
      <div className="grid gap-3 p-5 pt-0 sm:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const theme = themeMap[plan.theme];
          const isCurrentActive = subscription.isActive && subscription.tier === plan.id;
          const canAfford = currentPoints >= plan.coins;
          return (
            <div key={plan.id} className={["relative flex flex-col rounded-[20px] border p-4 transition-shadow",
              isCurrentActive ? "border-emerald-400 bg-gradient-to-b from-emerald-50/60 to-white shadow-[0_4px_20px_rgba(16,185,129,0.20)]"
                : \`\${theme.card} shadow-[0_4px_18px_rgba(120,80,10,0.09)]\`].join(" ")}>
              {plan.badge && !isCurrentActive && (
                <span className={\`absolute top-3 right-3 rounded-full bg-gradient-to-r \${theme.badge} px-2 py-0.5 text-[11px] font-black text-white shadow\`}>
                  {plan.id === "vvip" ? "👑 VVIP" : \`✨ \${plan.badge}\`}
                </span>
              )}
              {isCurrentActive && <span className="absolute top-3 right-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-black text-white shadow">✓ 구독 중</span>}
              <p className="text-2xl leading-none">{theme.icon}</p>
              <p className={\`mt-2 text-[11px] font-black uppercase tracking-wider \${theme.label}\`}>{plan.title}</p>
              <p className="mt-2 flex items-center gap-1 text-lg font-black text-[#5C3A1E]">
                <CoinIcon size="md" />{plan.coins.toLocaleString("ko-KR")}코인
                <span className="ml-0.5 text-xs font-semibold text-[#8A6020]">/ 30일</span>
              </p>
              <p className="text-[11px] text-[#7A5230]">({fmtWon(plan.wonPrice)} 상당)</p>
              <div className={\`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold \${theme.freeTag}\`}>
                🆓 {plan.freeUpTo === null ? "모든 서비스 무료" : \`\${plan.freeUpTo}코인 이하 무료\`}
              </div>
              <ul className="mt-3 flex-1 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11.5px] text-[#7A5230]">
                    <span className="mt-0.5 flex-shrink-0 text-amber-400">·</span>{f}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => onSubscribe(plan)} disabled={isProcessing || (!isFlowerAdminMode && !canAfford)}
                className={["mt-4 w-full rounded-[12px] px-3 py-2.5 text-[13px] font-black text-white shadow transition-all hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
                  isCurrentActive ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_5px_14px_rgba(16,185,129,0.35)]"
                    : \`bg-gradient-to-r \${theme.btn}\`].join(" ")}>
                {isCurrentActive
                  ? "🔄 갱신하기 (30일 연장)"
                  : canAfford || isFlowerAdminMode
                    ? \`\${theme.icon} \${plan.title} 시작\`
                    : \`코인 부족 (\${plan.coins - currentPoints}개 더 필요)\`}
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-5 pb-5 space-y-1">
        <p className="text-[11px] text-[#9B7040]">✅ 구독 코인은 즉시 차감되며 <strong>30일간 유효</strong>합니다.</p>
        <p className="text-[11px] text-rose-600 font-bold">🚫 자동결제(정기결제)는 없습니다. 포인트를 먼저 충전해야 구독을 활성화할 수 있습니다.</p>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════════════════════════════ */

export default function PointsPage() {
  const router = useRouter();
  const toastCounter = useRef(0);

  const apiBase = useMemo(() => {
    if (typeof window !== "undefined") {
      const w = window as Window & { CODE_DESTINY_API_BASE_URL?: string };
      if (w.CODE_DESTINY_API_BASE_URL) return w.CODE_DESTINY_API_BASE_URL;
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  }, []);

  const [token, setToken] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [isBooting, setIsBooting] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState("황금 돼지가 코인을 세고 있어요...");
  const [showStarBurst, setShowStarBurst] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [adminTestTier, setAdminTestTier] = useState<AdminTestTier>("off");
  const [subscription, setSubscription] = useState<SubscriptionStatus>({ tier: "free", isActive: false, expiresAt: null, profileLimit: 1 });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [registeredCard, setRegisteredCard] = useState<RegisteredCard | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PointPackage>(POINT_PACKAGES[1]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [showCardModal, setShowCardModal] = useState(false);

  const pushToast = useCallback((type: ToastItem["type"], text: string) => {
    const id = ++toastCounter.current;
    setToasts((p) => [...p, { id, type, text }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const syncPoints = useCallback((pts: number) => {
    setCurrentPoints(pts);
    try {
      const raw = localStorage.getItem("fortune_auth_user");
      if (!raw) return;
      const u = JSON.parse(raw);
      u.points = pts;
      localStorage.setItem("fortune_auth_user", JSON.stringify(u));
    } catch { /* noop */ }
  }, []);

  const fetchState = useCallback(async (t: string) => {
    const r = await fetch(\`\${apiBase}/api/payments/me\`, { headers: { Authorization: \`Bearer \${t}\` } });
    if (r.status === 401 || r.status === 403) {
      localStorage.removeItem("fortune_auth_token");
      router.replace("/login?next=%2Fpoints");
      return;
    }
    const d = await safeJson<{ user?: { id: string; name: string; email: string; points: number }; payments?: PaymentHistoryItem[]; message?: string }>(r);
    if (!r.ok) throw new Error(d.message || "포인트 정보를 불러오지 못했습니다.");
    if (d.user) {
      const pts = Number(d.user.points || 0);
      syncPoints(pts);
      setAuthUser((p) => ({ ...(p || {}), id: d.user!.id, name: d.user!.name, email: d.user!.email, points: pts }));
    }
    if (Array.isArray(d.payments)) setPaymentHistory(d.payments.filter(Boolean).slice(0, 10));
  }, [apiBase, router, syncPoints]);

  const fetchSubscription = useCallback(async (t: string) => {
    const flowerToken = getFlowerAdminToken();
    const headers: Record<string, string> = { Authorization: \`Bearer \${t}\` };
    if (flowerToken) headers["x-admin-token"] = flowerToken;
    if (adminTestTier !== "off") headers["x-admin-subscription-tier"] = adminTestTier;
    const r = await fetch(\`\${apiBase}/api/fortune/pig-coin/profile-subscription/status\`, { headers });
    if (!r.ok) return;
    const d = await r.json().catch(() => ({}));
    setSubscription({
      tier: d.tier || "free",
      isActive: !!d.isActive,
      expiresAt: d.expiresAt || null,
      profileLimit: typeof d.profileLimit === "number" ? d.profileLimit : 1,
      lowBalanceWarning: !!d.lowBalanceWarning,
    });
  }, [adminTestTier, apiBase]);

  useEffect(() => {
    const savedToken = localStorage.getItem("fortune_auth_token");
    if (!savedToken) { router.replace("/login?next=%2Fpoints"); return; }
    setToken(savedToken);
    const raw = localStorage.getItem("fortune_auth_user");
    if (raw) {
      try {
        const u = JSON.parse(raw) as AuthUser;
        setAuthUser(u);
        if (typeof u.points === "number") setCurrentPoints(u.points);
      } catch { /* noop */ }
    }
    if (isFlowerAdmin()) {
      const tier = String(localStorage.getItem("flower_admin_test_tier") || "off").toLowerCase();
      if (tier === "standard" || tier === "premium" || tier === "vvip") setAdminTestTier(tier as AdminTestTier);
    }
    const savedCard = localStorage.getItem("billing_card");
    if (savedCard) { try { setRegisteredCard(JSON.parse(savedCard)); } catch { /* noop */ } }
    setIsBooting(false);
  }, [router]);

  useEffect(() => {
    if (isBooting || !token) return;
    fetchState(token).catch((e) => pushToast("error", getErrMsg(e, "포인트 정보를 불러오지 못했습니다.")));
    fetchSubscription(token).catch(() => {});
  }, [fetchState, fetchSubscription, isBooting, pushToast, token]);

  useEffect(() => {
    if (!isFlowerAdmin()) return;
    localStorage.setItem("flower_admin_test_tier", adminTestTier);
  }, [adminTestTier]);

  const handlePackageSelect = useCallback(async (pkg: PointPackage) => {
    if (!token || !authUser) { router.replace("/login?next=%2Fpoints"); return; }
    setSelectedPkg(pkg);
    setIsProcessing(true);
    setProcessingText("주문번호를 발급하는 중입니다...");
    try {
      const r = await fetch(\`\${apiBase}/api/payments/prepare\`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({ paymentAmount: pkg.amount, chargePoints: pkg.points, paymentMethod: "galaxia_xpay", productName: pkg.title }),
      });
      const d = await safeJson<{ order?: { merchantUid: string }; message?: string }>(r);
      if (!r.ok || !d.order) throw new Error(d.message || "주문 준비에 실패했습니다.");
      setCurrentOrderId(d.order.merchantUid);
      setIsProcessing(false);
      setShowPayModal(true);
    } catch (e) {
      setIsProcessing(false);
      pushToast("error", getErrMsg(e, "결제 준비에 실패했습니다."));
    }
  }, [apiBase, authUser, pushToast, router, token]);

  const handlePaySuccess = useCallback(async (res: { success: boolean; tid?: string; orderId?: string }) => {
    setShowPayModal(false);
    setIsProcessing(true);
    setProcessingText("결제 검증 및 코인 정산 중...");
    try {
      const r = await fetch(\`\${apiBase}/api/payments/confirm\`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({ tid: res.tid, merchantUid: currentOrderId, orderId: res.orderId }),
      });
      const d = await safeJson<{ user?: { points: number }; message?: string }>(r);
      if (!r.ok) throw new Error(d.message || "결제 검증에 실패했습니다.");
      if (typeof d.user?.points === "number") syncPoints(d.user.points);
      pushToast("success", d.message || "코인이 충전되었습니다 ✨");
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
      await fetchState(token);
    } catch (e) {
      pushToast("error", getErrMsg(e, "결제 검증에 실패했습니다."));
    } finally {
      setIsProcessing(false);
    }
  }, [apiBase, currentOrderId, fetchState, pushToast, syncPoints, token]);

  const handlePayFail = useCallback((res: { success: boolean; errorMsg?: string }) => {
    setShowPayModal(false);
    const msg = String(res.errorMsg || "").toLowerCase();
    if (msg.includes("취소") || msg.includes("cancel")) pushToast("info", "결제가 취소되었습니다.");
    else pushToast("error", res.errorMsg || "결제를 완료하지 못했습니다.");
  }, [pushToast]);

  const handleSubscribe = useCallback(async (plan: SubscriptionPlan) => {
    const adminMode = isFlowerAdmin();
    const flowerToken = getFlowerAdminToken();
    if (!token && !adminMode) { router.replace("/login?next=%2Fpoints"); return; }
    if (!adminMode && currentPoints < plan.coins) {
      pushToast("error", \`코인이 부족합니다. \${plan.coins}코인 필요 (보유: \${currentPoints}코인)\`);
      return;
    }
    setIsProcessing(true);
    setProcessingText(\`\${plan.title} 구독을 활성화하는 중입니다...\`);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = \`Bearer \${token}\`;
      if (flowerToken) headers["x-admin-token"] = flowerToken;
      if (adminMode && adminTestTier !== "off") headers["x-admin-subscription-tier"] = adminTestTier;
      const r = await fetch(\`\${apiBase}/api/fortune/pig-coin/profile-subscription/subscribe\`, {
        method: "POST", headers, body: JSON.stringify({ tier: plan.id }),
      });
      const d = await safeJson<{ message?: string; subscription?: SubscriptionStatus; user?: { points: number } }>(r);
      if (r.status === 402) { pushToast("error", "코인이 부족합니다. 충전 후 다시 시도해 주세요."); return; }
      if (!r.ok) { pushToast("error", d.message || "구독 처리에 실패했습니다."); return; }
      if (d.user?.points !== undefined) syncPoints(Number(d.user.points));
      if (d.subscription) setSubscription(d.subscription);
      pushToast("success", d.message || \`\${plan.title} 구독이 시작되었습니다! ✨\`);
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 1200);
    } catch (e) {
      pushToast("error", getErrMsg(e, "구독 처리 중 오류가 발생했습니다."));
    } finally {
      setIsProcessing(false);
    }
  }, [adminTestTier, apiBase, currentPoints, pushToast, router, syncPoints, token]);

  const requestCancel = useCallback(async (payment: PaymentHistoryItem) => {
    if (!token) return;
    if (!window.confirm(\`\${fmtWon(payment.paymentAmount)} 결제를 취소할까요?\`)) return;
    setCancelingId(payment.id);
    try {
      const r = await fetch(\`\${apiBase}/api/payments/cancel\`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({ impUid: payment.impUid, merchantUid: payment.merchantUid, reason: "사용자 취소 요청" }),
      });
      const d = await safeJson<{ message?: string; user?: { points: number } }>(r);
      if (!r.ok) throw new Error(d.message || "결제 취소에 실패했습니다.");
      if (typeof d.user?.points === "number") syncPoints(Number(d.user.points));
      await fetchState(token);
      pushToast("success", d.message || "결제가 취소되었습니다.");
    } catch (e) {
      pushToast("error", getErrMsg(e, "결제 취소 처리 중 오류가 발생했습니다."));
    } finally {
      setCancelingId(null);
    }
  }, [apiBase, fetchState, pushToast, syncPoints, token]);

  const handleCardRegistered = useCallback((_billingKey: string, card: RegisteredCard) => {
    setRegisteredCard(card);
    localStorage.setItem("billing_card", JSON.stringify(card));
    setShowCardModal(false);
    pushToast("success", \`\${card.cardName} 카드가 등록되었습니다.\`);
  }, [pushToast]);

  if (isBooting) {
    return (
      <main className="flex min-h-screen items-center justify-center text-[#5C3A1E]" style={{ background: "linear-gradient(160deg,#FDF8F0 0%,#FDF0D8 100%)" }}>
        <div className="text-center"><div className="mb-3 text-5xl animate-bounce">🐷</div><p className="font-semibold">황금 돼지 저금통을 불러오는 중...</p></div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-[#5C3A1E]" style={{ background: "linear-gradient(160deg,#FDFAF4 0%,#FDF3E0 35%,#FAE9CC 65%,#F7DEB8 100%)" }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-40" style={{ background: "radial-gradient(circle,rgba(255,220,100,0.60) 0%,rgba(255,190,60,0.20) 50%,transparent 70%)" }} />
        <div className="absolute top-1/3 -right-48 w-[450px] h-[450px] rounded-full opacity-25" style={{ background: "radial-gradient(circle,rgba(255,175,60,0.60) 0%,transparent 70%)" }} />
      </div>

      {showStarBurst && (
        <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl animate-ping">💰</div>
          <div className="absolute left-[42%] top-[44%] text-2xl animate-pulse">✨</div>
          <div className="absolute left-[57%] top-[43%] text-3xl animate-bounce">🐷</div>
          <div className="absolute left-[49%] top-[57%] text-2xl animate-ping">💰</div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="relative mx-auto w-full max-w-2xl space-y-5">
        <header className="rounded-[24px] overflow-hidden shadow-[0_12px_40px_rgba(120,80,10,0.14)]">
          <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg,#A0680A 0%,#FFD060 25%,#FFF 50%,#FFD060 75%,#A0680A 100%)" }} />
          <div className="border border-t-0 border-[#EDDBA3] rounded-b-[24px] p-6" style={{ background: "linear-gradient(135deg,rgba(255,253,247,0.97) 0%,rgba(255,249,238,0.95) 100%)" }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img src="/icons/honeypig-96.webp" srcSet="/icons/honeypig-96.webp 96w,/icons/honeypig-130.webp 130w,/icons/honeypig.webp 512w" sizes="72px" width={72} height={72} alt="황금 돼지" className="rounded-2xl shadow-[0_6px_20px_rgba(150,76,11,0.26)]" />
                <div>
                  <p className="text-[11px] font-extrabold tracking-[0.22em] text-amber-800 uppercase">Golden Pig Coin</p>
                  <h1 className="mt-0.5 text-[22px] font-black text-[#5C3A1E] sm:text-3xl leading-tight">황금 돼지 저금통 충전소</h1>
                  <p className="mt-1 text-sm text-[#7A5230]">동전을 채울수록 보너스가 커져요.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link href="/points/history" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 shadow transition-all hover:bg-amber-100 hover:-translate-y-0.5 active:scale-[0.97]">
                  📋 포인트 관리
                </Link>
                <Link href="/" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EDDBA3] bg-white/90 px-4 py-2.5 text-sm font-bold text-[#7A5230] shadow transition-all hover:bg-[#FFF8E0] hover:-translate-y-0.5 active:scale-[0.97]">
                  ← 서비스 화면으로
                </Link>
              </div>
            </div>
          </div>
        </header>

        <WalletCard name={authUser?.name || "사용자"} points={currentPoints} />
        <SubscriptionStatusCard subscription={subscription} />

        <div className="flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700">충전 패키지 선택</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400 to-transparent opacity-50" />
        </div>

        <section aria-label="충전 패키지" className="rounded-[24px] overflow-hidden shadow-[0_8px_32px_rgba(120,80,10,0.10)]">
          <div className="border border-[#EDDBA3] rounded-[24px] p-5" style={{ background: "linear-gradient(135deg,#FFFDF8 0%,#FEFBF0 100%)" }}>
            <p className="mb-3 flex items-center gap-2 text-[12px] font-bold text-[#8A6020]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />패키지를 선택하면 갤럭시아머니트리 결제창이 열립니다.
            </p>
            <div className="flex flex-col gap-3">
              {POINT_PACKAGES.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} selected={selectedPkg.id === pkg.id} onSelect={handlePackageSelect} />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-[12px] bg-gray-50 border border-gray-200 px-4 py-2.5">
              <span className="text-[13px]">🔒</span>
              <span className="text-[11.5px] text-gray-500 font-semibold">갤럭시아머니트리 xPay 보안 결제</span>
              <span className="ml-auto text-[11px] text-gray-400">카드사 인증 · 할부 지원</span>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-[14px] border border-rose-100 bg-rose-50/70 px-3.5 py-3">
              <span className="text-rose-500 flex-shrink-0 mt-0.5">⏳</span>
              <p className="text-[11px] text-rose-800 font-semibold">포인트 충전 소진 기한은 결제한 시점부터 1년이며, 미사용 포인트는 소멸됩니다.</p>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-700">꿀 구독 시스템</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-400 to-transparent opacity-50" />
        </div>

        <SubscriptionSection
          subscription={subscription}
          currentPoints={currentPoints}
          onSubscribe={handleSubscribe}
          isProcessing={isProcessing}
          isFlowerAdminMode={isFlowerAdmin()}
          adminTestTier={adminTestTier}
          onChangeAdminTestTier={setAdminTestTier}
          registeredCard={registeredCard}
          onRegisterCard={() => setShowCardModal(true)}
        />

        <section className="rounded-[20px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.88)] p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-[#5C3A1E]">최근 결제 내역</h3>
            <span className="text-[11px] font-semibold text-[#8A6020]">승인번호 / 주문번호 / 영수증</span>
          </div>
          {paymentHistory.length === 0 ? (
            <p className="text-sm text-[#7A5230]">아직 결제 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2.5">
              {paymentHistory.map((pm) => {
                const { label, cls } = statusBadge(pm.status);
                return (
                  <div key={pm.id} className="rounded-[14px] border border-[#EFDCA8] bg-white/90 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#5C3A1E]">{fmtWon(pm.paymentAmount)} · {fmtCoins(pm.chargedPoints)}</p>
                      <span className={\`rounded-full border px-2 py-0.5 text-[11px] font-bold \${cls}\`}>{label}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-[11.5px] text-[#7A5230] sm:grid-cols-2">
                      <p>결제시각: {fmtDate(pm.paidAt || pm.cancelledAt)}</p>
                      <p>결제수단: {pm.paymentMethod || "-"}</p>
                      <p>승인번호: {pm.approvalNumber || "-"}</p>
                      <p>주문번호: {pm.merchantUid || "-"}</p>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {pm.receiptUrl ? (
                        <a href={pm.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg border border-[#D9C07A] bg-[#FFF8E2] px-2.5 py-1 text-[11.5px] font-bold text-[#7A5230] hover:bg-[#FFF2CC]">영수증 보기</a>
                      ) : <span className="text-[11px] text-[#9B7040]">영수증 URL 미제공</span>}
                      <button type="button" disabled={pm.status !== "success" || cancelingId === pm.id} onClick={() => requestCancel(pm)}
                        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11.5px] font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">
                        {cancelingId === pm.id ? "취소 처리 중..." : "결제 취소 요청"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[20px] border border-[#EDDBA3]/60 bg-[rgba(255,248,228,0.55)] p-5">
          <h3 className="font-bold text-[#5C3A1E]">결제 실패 안내</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[#7A5230]">
            <li>• 창 닫기/취소: 결제가 취소되어 코인이 차감되지 않습니다.</li>
            <li>• 한도 초과: 다른 카드/계좌이체 또는 금액을 낮춰 재시도해 주세요.</li>
            <li>• 카드사 점검: 잠시 후 다시 시도하거나 다른 결제수단을 선택해 주세요.</li>
          </ul>
        </section>
      </div>

      {showPayModal && authUser && (
        <GalaxiaPayModal
          pkg={selectedPkg}
          buyerName={authUser.name || "회원"}
          buyerEmail={authUser.email || ""}
          orderId={currentOrderId}
          onSuccess={handlePaySuccess}
          onFail={handlePayFail}
          onClose={() => { if (!isProcessing) setShowPayModal(false); }}
          isProcessing={isProcessing}
        />
      )}

      {showCardModal && authUser && (
        <BillingCardModal
          buyerName={authUser.name || ""}
          buyerPhone={authUser.phone || ""}
          onSuccess={handleCardRegistered}
          onClose={() => setShowCardModal(false)}
          apiBase={apiBase}
          token={token}
        />
      )}

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
`;

writeFileSync("app/points/page.tsx", content, "utf8");
console.log("done, lines:", content.split("\n").length);
