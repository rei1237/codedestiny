"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch, clearClientAuthState } from "../../_lib/auth-client";
import { getApiBaseUrl } from "../../_lib/api-config";

/* ══════════════════════════════════════════════════════════════════
   타입 정의
══════════════════════════════════════════════════════════════════ */

type PointHistoryEntry = {
  id: string;
  kind: "charge" | "deduct" | "refund" | "adjust" | "share_reward";
  delta: number;
  balanceAfter: number;
  reason: string;
  featureKey?: string;
  createdAt: string;
};

type PaymentHistoryItem = {
  id: string;
  paymentAmount: number;
  chargedPoints: number;
  paymentMethod: string;
  status: "pending" | "success" | "failed" | "cancelled" | "refunded";
  paidAt?: string;
  approvalNumber?: string | null;
};

type MeResponse = {
  ok?: boolean;
  success?: boolean;
  data?: {
    balance?: number;
    transactions?: PointHistoryEntry[];
    payments?: PaymentHistoryItem[];
    subscriptions?: SubscriptionStatusResponse[];
  };
  message?: string;
  user?: {
    id: string;
    name: string;
    points: number;
  };
  payments?: PaymentHistoryItem[];
  pointHistories?: PointHistoryEntry[];
  subscriptions?: SubscriptionStatusResponse[];
};

type SubscriptionStatusResponse = {
  tier?: string;
  label?: string;
  isActive?: boolean;
  expiresAt?: string | null;
  source?: string;
  profileLimit?: number;
  freeLimit?: number;
  message?: string;
};

declare global {
  interface Window {
    CODE_DESTINY_API_BASE_URL?: string;
  }
}

/* ══════════════════════════════════════════════════════════════════
   유틸리티 함수
══════════════════════════════════════════════════════════════════ */

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

const COIN_TO_WON = 100;

function formatPoints(n: number) {
  const abs = Math.abs(n);
  return `${abs.toLocaleString("ko-KR")}코인`;
}

function formatWon(n: number) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

function kindLabel(kind: PointHistoryEntry["kind"]) {
  if (kind === "charge")  return { text: "결제",  cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  if (kind === "deduct")  return { text: "차감",  cls: "bg-rose-100 text-rose-700 border-rose-300" };
  if (kind === "refund")  return { text: "환불",  cls: "bg-sky-100 text-sky-700 border-sky-300" };
  if (kind === "share_reward") return { text: "보상", cls: "bg-cyan-100 text-cyan-700 border-cyan-300" };
  return                         { text: "조정",  cls: "bg-amber-100 text-amber-700 border-amber-300" };
}

function kindIcon(kind: PointHistoryEntry["kind"]) {
  if (kind === "charge") return "⬆️";
  if (kind === "deduct") return "⬇️";
  if (kind === "refund") return "↩️";
  if (kind === "share_reward") return "🎁";
  return "⚙️";
}

function deltaColor(delta: number) {
  if (delta > 0) return "text-emerald-700";
  if (delta < 0) return "text-rose-600";
  return "text-amber-700";
}

function deltaPrefix(delta: number) {
  if (delta > 0) return "+";
  if (delta < 0) return "−";
  return "";
}

function paymentStatusView(status: PaymentHistoryItem["status"]) {
  if (status === "refunded") return { label: "환불완료", cls: "bg-sky-100 text-sky-800 border-sky-300" };
  if (status === "cancelled") return { label: "결제취소", cls: "bg-slate-100 text-slate-700 border-slate-300" };
  return { label: "결제완료", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
}

function resolveFeatureName(featureKey?: string) {
  if (!featureKey) return "";
  const key = String(featureKey).trim();
  if (!key) return "";

  const map: Record<string, string> = {
    "pig-coin-charge": "상품 결제 기록",
    "pig-coin-unlock": "유료 콘텐츠 잠금 해제",
    "tarot-year-fortune": "십이지신 천운 타로",
    "tarot-love-relationship": "우리는 무슨 사이? 타로",
    "tarot-reunion-reading": "재회운 타로",
    "tarot-mindscan": "마인드 스캔 타로",
    "tarot-celestial-harmony": "셀레스티얼 하모니 타로",
    "tarot-crystal-soul-reading": "크리스탈 소울 타로",
    "tarot-ijik": "이직 타로",
    "openJuyukModal": "주역 거북점",
    "openKemetModal": "이집트 신탁",
    "ifa-oracle": "IFÀ 오라클",
    "stonehenge-runes-single": "스톤헨지 룬 1-룬",
    "stonehenge-runes-triad": "스톤헨지 룬 3-룬",
    "stonehenge-runes-deep": "스톤헨지 룬 5-룬",
    "stonehenge-runes-yearly": "스톤헨지 룬 12-룬",
    "animal-totem-basic": "애니멀 토템 리딩",
    "animal-totem-deep": "애니멀 토템 심화 리딩",
    "palm-reading-general": "손금 전체운 분석",
    "palm-reading-love": "손금 연애운 분석",
    "palm-reading-wealth": "손금 재물운 분석",
    "palm-reading-career": "손금 직업운 분석",
    "palm-reading-personality": "손금 성격 분석",
    "palm-reading-relationship": "손금 관계 패턴 분석",
    "premium-lifebook-report": "인생의 책 생성",
    "premium-ziwei-report": "자미두수 프리미엄 PDF",
    "premium-astrology-report": "점성술 프리미엄 PDF",
    "premium-sukuyo-report": "숙요점 프리미엄 PDF",
    "premium-vedic-report": "베다 점성술 프리미엄 PDF",
    "premium-naming-report": "명운 프리미엄 작명",
    saju_ai_prompt_generator: "사주 AI 질문 프롬프트 생성",
    astrology_ai_prompt_generator: "점성술 AI 질문 프롬프트 생성",
    sukuyo_ai_prompt_generator: "숙요점 AI 질문 프롬프트 생성",
    ziwei_ai_prompt_generator: "자미두수 AI 질문 프롬프트 생성",
    "premium-love-secret-solo": "사주 프리미엄 연애운 리포트",
    "premium-love-secret-couple": "사주 프리미엄 궁합 리포트",
    "profile-subscription": "멤버십 이용권 결제",
    "profile-subscription-auto-renew": "이전 멤버십 갱신 기록",
    "profile-subscription-service-start": "멤버십 서비스 시작",
    "share-reward": "카카오톡 공유 보상",
  };

  return map[key] || key.replace(/[-_]/g, " ");
}

function normalizePointPayload(payload: MeResponse) {
  const dataNode = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const balanceRaw =
    (typeof dataNode.balance === "number" ? dataNode.balance : undefined)
    ?? (typeof payload?.user?.points === "number" ? payload.user.points : 0);
  const pointHistories = Array.isArray(dataNode.transactions)
    ? dataNode.transactions
    : (Array.isArray(payload?.pointHistories) ? payload.pointHistories : []);

  return {
    userName: payload?.user?.name || "사용자",
    balance: Number.isFinite(Number(balanceRaw)) ? Number(balanceRaw) : 0,
    pointHistories,
    message: payload?.message || "",
  };
}

function normalizePaymentPayload(payload: MeResponse) {
  const dataNode = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const payments = Array.isArray(dataNode.payments)
    ? dataNode.payments
    : (Array.isArray(payload?.payments) ? payload.payments : []);
  const subscriptions = Array.isArray(dataNode.subscriptions)
    ? dataNode.subscriptions
    : (Array.isArray(payload?.subscriptions) ? payload.subscriptions : []);

  return {
    payments,
    subscriptions,
    message: payload?.message || "",
  };
}

function buildSubscriptionSummaryText(data?: SubscriptionStatusResponse | null) {
  const tier = String(data?.tier || "free").toLowerCase();
  const isActive = !!data?.isActive;
  const expiresAt = data?.expiresAt ? formatDateTime(data.expiresAt) : "-";
  const tierLabel = tier === "free" ? "무료" : (data?.label || tier.toUpperCase());
  const activeLabel = isActive ? "활성" : "비활성";
  return `${tierLabel} · ${activeLabel} · 만료 ${expiresAt}`;
}

/* ══════════════════════════════════════════════════════════════════
   서브 컴포넌트: CoinIcon
══════════════════════════════════════════════════════════════════ */

function CoinIcon({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeMap: Record<string, string> = {
    sm: "h-4 w-4 text-[8px]",
    md: "h-5 w-5 text-[10px]",
    lg: "h-6 w-6 text-[13px]",
  };
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full font-black text-white select-none ${sizeMap[size]} ${className}`}
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
   메인 페이지
══════════════════════════════════════════════════════════════════ */

type TabId = "all" | "charge" | "deduct";

export default function PointHistoryPage() {
  const router = useRouter();
  const [isBooting, setIsBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [hasLoadedPoints, setHasLoadedPoints] = useState(false);
  const [subscriptionSummary, setSubscriptionSummary] = useState("구독 상태 확인 중");

  const [userName, setUserName] = useState("사용자");
  const [currentPoints, setCurrentPoints] = useState(0);
  const [histories, setHistories] = useState<PointHistoryEntry[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const fetchPointsSection = useCallback(async () => {
    try {
      const res = await authFetch(`${apiBase}/api/points/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }, {
        retryOn401: true,
        apiBase,
      });
      if (res.status === 401 || res.status === 403) {
        clearClientAuthState();
        router.replace("/login?next=%2Fpoints%2Fhistory");
        return;
      }
      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json") || ct.includes("/json");
      if (!isJson) {
        if (!res.ok) throw new Error(`잠시 후 다시 시도해 주세요. (HTTP ${res.status})`);
        throw new Error("포인트 서버 응답 오류입니다.");
      }
      const data: MeResponse = await res.json();
      if (!res.ok) {
        const msg = (data as { message?: string }).message || "";
        throw new Error(msg || "포인트 내역을 불러오지 못했습니다.");
      }
      const normalized = normalizePointPayload(data);
      setUserName(normalized.userName);
      setCurrentPoints(normalized.balance);
      setHistories(
        Array.isArray(normalized.pointHistories)
          ? normalized.pointHistories.filter(Boolean)
          : [],
      );
      setHasLoadedPoints(true);
      setPointsError(null);
    } catch (e: unknown) {
      setPointsError(e instanceof Error ? e.message : "포인트 내역을 불러오지 못했습니다.");
    }
  }, [apiBase, router]);

  const fetchPaymentsSection = useCallback(async () => {
    try {
      const res = await authFetch(`${apiBase}/api/payments/me`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }, {
        retryOn401: true,
        apiBase,
      });
      if (res.status === 401 || res.status === 403) {
        clearClientAuthState();
        router.replace("/login?next=%2Fpoints%2Fhistory");
        return;
      }
      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json") || ct.includes("/json");
      if (!isJson) {
        if (!res.ok) throw new Error(`잠시 후 다시 시도해 주세요. (HTTP ${res.status})`);
        throw new Error("결제 서버 응답 오류입니다.");
      }
      const data: MeResponse = await res.json();
      if (!res.ok) {
        const msg = (data as { message?: string }).message || "";
        throw new Error(msg || "결제 내역을 불러오지 못했습니다.");
      }
      const normalized = normalizePaymentPayload(data);
      setPayments(
        Array.isArray(normalized.payments)
          ? normalized.payments.filter((p) => p?.status === "success" || p?.status === "refunded" || p?.status === "cancelled")
          : [],
      );
      const activeSubscription = Array.isArray(normalized.subscriptions)
        ? normalized.subscriptions.find((sub) => sub?.isActive) || normalized.subscriptions[0]
        : null;
      if (activeSubscription) {
        setSubscriptionSummary(buildSubscriptionSummaryText(activeSubscription));
        setSubscriptionError(null);
      }
      setPaymentsError(null);
    } catch (e: unknown) {
      setPaymentsError(e instanceof Error ? e.message : "결제 내역을 불러오지 못했습니다.");
    }
  }, [apiBase, router]);

  const fetchSubscriptionSection = useCallback(async () => {
    try {
      const res = await authFetch(`${apiBase}/api/subscription/status`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }, {
        retryOn401: true,
        apiBase,
      });
      if (res.status === 401 || res.status === 403) {
        setSubscriptionSummary("로그인 필요");
        return;
      }
      const ct = res.headers.get("content-type") ?? "";
      const isJson = ct.includes("application/json") || ct.includes("/json");
      // JSON 응답이 아닌 경우: 상태 조회 실패로 처리하되 전체 페이지를 막지 않음
      if (!isJson) {
        setSubscriptionSummary("구독 상태 조회 불가 (서버 일시 오류)");
        setSubscriptionError("잠시 후 다시 시도해 주세요.");
        return;
      }
      const data: SubscriptionStatusResponse & { degraded?: boolean; source?: string } = await res.json();
      // degraded 응답(DB 연결 일시 장애)은 실패로 처리하지 않고 안내 표시
      if ((data as { degraded?: boolean }).degraded) {
        setSubscriptionSummary("구독 정보 임시 조회 중 (서버 일시 불안정)");
        setSubscriptionError(null);
        return;
      }
      if (!res.ok) {
        const msg = data.message || "구독 상태를 불러오지 못했습니다.";
        throw new Error(msg);
      }
      const tier = String(data?.tier || "free").toLowerCase();
      const isActive = !!data?.isActive;
      const nextSummary = buildSubscriptionSummaryText({ ...data, tier, isActive });
      setSubscriptionSummary((prev) => (!isActive && prev.includes(" · 활성 · ") ? prev : nextSummary));
      setSubscriptionError(null);
    } catch (e: unknown) {
      setSubscriptionError(e instanceof Error ? e.message : "구독 상태를 불러오지 못했습니다.");
      setSubscriptionSummary("구독 상태 조회 실패");
    }
  }, [apiBase]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    await Promise.allSettled([
      fetchPointsSection(),
      fetchPaymentsSection(),
      fetchSubscriptionSection(),
    ]);
    setIsLoading(false);
  }, [fetchPaymentsSection, fetchPointsSection, fetchSubscriptionSection]);

  useEffect(() => {
    if (!router) return;
    setIsBooting(false);
  }, [router]);

  useEffect(() => {
    if (isBooting) return;
    fetchData();
  }, [isBooting, fetchData]);

  /* ── 탭 필터링 ─────────────────────────────────────────────── */
  const filteredHistories = useMemo(() => {
    if (activeTab === "all") return histories;
    if (activeTab === "charge") return histories.filter((h) => Number(h.delta || 0) > 0);
    return histories.filter((h) => Number(h.delta || 0) < 0);
  }, [histories, activeTab]);

  /* 요약 통계 */
  const totalChargedWon = useMemo(
    () => histories.reduce((s, h) => {
      const delta = Number(h.delta || 0);
      return delta > 0 && (h.kind === "charge" || h.kind === "refund") ? s + (delta * COIN_TO_WON) : s;
    }, 0),
    [histories],
  );
  const totalDeductedCoins = useMemo(
    () => histories.reduce((s, h) => {
      const delta = Number(h.delta || 0);
      return delta < 0 ? s + Math.abs(delta) : s;
    }, 0),
    [histories],
  );

  /* ── 부팅 중 ─────────────────────────────────────────────────── */
  if (isBooting) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: "linear-gradient(160deg, #FDF8F0 0%, #FDF0D8 100%)" }}
      >
        <div className="text-center text-[#5C3A1E]">
          <div className="mb-3 text-5xl animate-bounce">🐷</div>
          <p className="font-semibold">포인트 내역을 불러오는 중...</p>
        </div>
      </main>
    );
  }

  /* ── 메인 렌더 ─────────────────────────────────────────────────── */
  return (
    <main
      className="relative min-h-screen px-4 py-8"
      style={{ background: "linear-gradient(160deg, #FDFAF4 0%, #FDF3E0 35%, #FAE9CC 65%, #F7DEB8 100%)" }}
    >
      <div className="mx-auto w-full max-w-2xl space-y-5">

        {/* 헤더 */}
        <header className="rounded-[24px] overflow-hidden shadow-[0_12px_40px_rgba(120,80,10,0.14)]">
          <div
            className="h-[3px] w-full"
            style={{ background: "linear-gradient(90deg, #A0680A 0%, #FFD060 25%, #FFFFFF 50%, #FFD060 75%, #A0680A 100%)" }}
            aria-hidden="true"
          />
          <div
            className="border border-t-0 border-[#EDDBA3] rounded-b-[24px] p-6"
            style={{ background: "linear-gradient(135deg, rgba(255,253,247,0.97) 0%, rgba(255,249,238,0.95) 100%)" }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.22em] text-amber-800 uppercase">Payment Management</p>
                <h1 className="mt-0.5 text-[22px] font-black text-[#5C3A1E] leading-tight">
                  🐷 결제/멤버십 관리
                </h1>
                <p className="mt-1 text-sm text-[#7A5230]">결제 내역과 멤버십 상태를 확인하세요.</p>
              </div>
              <div className="flex flex-col gap-2 self-start sm:items-end">
                <Link
                  href="/points"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EDDBA3] bg-white/90 px-4 py-2.5 text-sm font-bold text-[#7A5230] shadow-[0_2px_10px_rgba(180,130,30,0.14)] transition-all hover:bg-[#FFF8E0] hover:-translate-y-0.5"
                >
                  ← 달빛 이용권 관리
                </Link>
                <Link
                  href="/"
                  prefetch={false}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EDDBA3] bg-white/90 px-4 py-2.5 text-sm font-bold text-[#7A5230] shadow-[0_2px_10px_rgba(180,130,30,0.14)] transition-all hover:bg-[#FFF8E0] hover:-translate-y-0.5"
                >
                  서비스 화면으로
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* 콘텐츠 가치 단위 안내 */}
        <section
          aria-label="콘텐츠 가치 단위 안내"
          className="rounded-[24px] overflow-hidden shadow-[0_10px_36px_rgba(180,130,30,0.22)]"
        >
          <div
            className="h-[3px] w-full"
            style={{ background: "linear-gradient(90deg, #C8860A 0%, #FFE070 30%, #FFFFFF 50%, #FFE070 70%, #C8860A 100%)" }}
            aria-hidden="true"
          />
          <div
            className="border border-t-0 border-amber-200 rounded-b-[24px] p-5"
            style={{ background: "linear-gradient(135deg, #FFFAE8 0%, #FFF3CC 50%, #FFE89C 100%)" }}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-800 mb-1">콘텐츠 가치 단위</p>
            <div className="flex items-center gap-3">
              <CoinIcon size="lg" />
              <span className="text-[28px] font-black text-[#7A4A00] leading-none">
                1코인
                <span className="ml-1.5 text-base font-bold text-amber-800">= 100원 상당</span>
              </span>
            </div>
            {pointsError ? (
              <div className="mt-2 rounded-[10px] border border-rose-200 bg-rose-50 px-2.5 py-2">
                <p className="text-[11px] font-bold text-rose-700">이용권 정보 조회 실패: {pointsError}</p>
                <button
                  type="button"
                  onClick={() => { fetchPointsSection(); }}
                  className="mt-1 text-[11px] font-bold text-rose-600 underline"
                >
                  다시 조회
                </button>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-amber-800 font-semibold">
                {userName} 님의 결제 내역과 이용권 혜택을 확인하세요.
              </p>
            )}
            <p className="mt-1 text-[11px] text-[#9B7040]">
              코인은 콘텐츠 가치 단위이며, 유료 상품은 원화 단건 결제로 이용합니다.
            </p>
          </div>
        </section>

        <section className="rounded-[20px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.95)] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-800">현재 멤버십</p>
          <p className="mt-1 text-sm font-semibold text-[#7A5230]">{subscriptionSummary}</p>
          {subscriptionError && (
            <button
              type="button"
              onClick={() => { fetchSubscriptionSection(); }}
              className="mt-1 text-[12px] font-bold text-rose-600 underline"
            >
              구독 상태 다시 조회
            </button>
          )}
        </section>

        {/* 요약 통계 */}
        <section
          aria-label="포인트 요약"
          className="grid grid-cols-2 gap-3"
        >
          {[
            { label: "총 결제·환불", value: totalChargedWon, unit: "원", icon: "⬆️", showCoin: false, cls: "border-emerald-200 bg-emerald-50/80", valcls: "text-emerald-700" },
            { label: "총 차감 사용", value: totalDeductedCoins, unit: "코인", icon: "⬇️", showCoin: true, cls: "border-rose-200 bg-rose-50/80", valcls: "text-rose-700" },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-[20px] border p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${item.cls}`}
            >
              <p className="text-[11px] font-bold text-neutral-500 mb-1">{item.icon} {item.label}</p>
              <div className="flex items-center gap-1.5">
                {item.showCoin && <CoinIcon size="sm" />}
                <span className={`text-[18px] font-black leading-none ${item.valcls}`}>
                  {item.value.toLocaleString("ko-KR")}
                  <span className="ml-1 text-xs font-bold">{item.unit}</span>
                </span>
              </div>
              <p className="mt-1 text-[10px] text-neutral-400">최근 20건 기준</p>
            </div>
          ))}
        </section>

        {/* 포인트 흐름 내역 */}
        <section
          aria-label="포인트 흐름 내역"
          className="rounded-[24px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.95)] overflow-hidden shadow-[0_8px_28px_rgba(120,80,10,0.09)]"
        >
          <div className="p-5 pb-0">
            <h2 className="text-[15px] font-bold text-[#5C3A1E] mb-3">포인트 흐름 내역</h2>

            {/* 탭 */}
            <div className="flex gap-2 mb-4">
              {([
                { id: "all",    label: "전체" },
                { id: "charge", label: "결제·환불" },
                { id: "deduct", label: "차감·사용" },
              ] as Array<{ id: TabId; label: string }>).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "rounded-full px-3.5 py-1.5 text-[12px] font-bold transition",
                    activeTab === tab.id
                      ? "bg-amber-500 text-white shadow-[0_4px_12px_rgba(180,130,0,0.35)]"
                      : "bg-white border border-[#EDDBA3] text-[#7A5230] hover:bg-amber-50",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pb-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-3xl animate-bounce">🐷</div>
                <p className="ml-3 text-sm text-[#7A5230]">내역을 불러오는 중...</p>
              </div>
            ) : pointsError ? (
              <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-sm font-semibold text-rose-700">⚠️ {pointsError}</p>
                <button
                  type="button"
                  onClick={() => { fetchPointsSection(); }}
                  className="mt-2 text-[12px] font-bold text-rose-600 underline"
                >
                  다시 시도
                </button>
              </div>
            ) : filteredHistories.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-[#7A5230]">아직 포인트 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredHistories.map((entry) => {
                  const kl = kindLabel(entry.kind);
                  const dc = deltaColor(entry.delta);
                  const prefix = deltaPrefix(entry.delta);
                  const featureName = resolveFeatureName(entry.featureKey);
                  const displayReason = entry.reason || featureName || "-";
                  return (
                    <div
                      key={entry.id}
                      className="rounded-[16px] border border-[#EFDCA8] bg-white/95 p-3.5 flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 text-xl mt-0.5 leading-none">{kindIcon(entry.kind)}</span>
                      <div className="flex-1 min-w-0">
                        {/* 날짜 */}
                        <p className="text-[11px] text-[#9B7040] mb-1 font-medium">
                          {formatDateTime(entry.createdAt)}
                        </p>
                        {/* 상품명 + 금액 */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${kl.cls}`}>
                              {kl.text}
                            </span>
                            <span className="text-[12px] font-semibold text-[#5C3A1E] line-clamp-1">
                              {displayReason}
                            </span>
                            {featureName && featureName !== displayReason && (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                상품명: {featureName}
                              </span>
                            )}
                          </div>
                          <span className={`text-[15px] font-black flex-shrink-0 ${dc}`}>
                            {prefix}{formatPoints(entry.delta)}
                          </span>
                        </div>
                        {/* 잔여 포인트 */}
                        <div className="mt-2 flex items-center gap-1.5 rounded-[10px] bg-amber-50 border border-amber-100 px-2.5 py-1.5">
                          <CoinIcon size="sm" />
                          <p className="text-[12px] text-[#7A4A00] font-bold">
                            잔여포인트&nbsp;
                            <span className="text-[13px] text-[#5C3A1E]">
                              {entry.balanceAfter.toLocaleString("ko-KR")}원
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 결제 내역 (결제 성공 건) */}
        <section
          aria-label="결제 내역"
          className="rounded-[24px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.95)] p-5 shadow-[0_8px_28px_rgba(120,80,10,0.09)]"
        >
          <h2 className="text-[15px] font-bold text-[#5C3A1E] mb-3">결제 내역</h2>
          {paymentsError ? (
            <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-4">
              <p className="text-sm font-semibold text-rose-700">⚠️ {paymentsError}</p>
              <button
                type="button"
                onClick={() => { fetchPaymentsSection(); }}
                className="mt-2 text-[12px] font-bold text-rose-600 underline"
              >
                결제 내역 다시 조회
              </button>
            </div>
          ) : payments.length === 0 && !isLoading ? (
            <p className="text-sm text-[#7A5230]">완료된 결제 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2.5">
              {payments.map((p) => {
                const status = paymentStatusView(p.status);
                return (
                  <div
                    key={p.id}
                    className="rounded-[16px] border border-[#EFDCA8] bg-white/95 p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#5C3A1E]">
                        결제 금액 {formatWon(p.paymentAmount)} · {p.chargedPoints > 0 ? `${p.chargedPoints.toLocaleString("ko-KR")}코인 기준` : "상품 결제"}
                      </p>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-1.5 grid gap-1 text-[11.5px] text-[#7A5230] sm:grid-cols-2">
                      <p>결제시각: {formatDateTime(p.paidAt)}</p>
                      <p>결제수단: {p.paymentMethod || "-"}</p>
                      {p.approvalNumber && <p className="sm:col-span-2">승인번호: {p.approvalNumber}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 안내 */}
        <section className="rounded-[20px] border border-[#EDDBA3]/60 bg-[rgba(255,248,228,0.55)] p-5">
          <h3 className="font-bold text-[#5C3A1E] mb-2">결제/멤버십 이용 안내</h3>
          <ul className="space-y-1.5 text-sm text-[#7A5230]">
            <li>• 코인은 콘텐츠 가치 단위이며, 1코인은 100원 상당으로 환산해 표시됩니다.</li>
            <li>• 유료 상품은 원화 단건 결제로 결제되며, 결제 완료 후 해당 상품 이용 또는 결과 생성이 진행됩니다.</li>
            <li>• 시스템 오류, 중복 결제, 결과 미제공 건은 재생성 또는 환불 처리됩니다.</li>
            <li>• 환불 처리는 <strong>결제 수단(카드)으로만</strong> 가능합니다.</li>
            <li>• 콘텐츠 생성이 시작되기 전에는 취소/환불 요청이 가능합니다.</li>
            <li>• 콘텐츠 생성이 시작되었거나 결과가 정상 제공된 경우 디지털 콘텐츠 특성상 환불이 제한될 수 있습니다.</li>
            <li>• 멤버십 30일 이용권은 자동결제 상품이 아니며, 기간 종료 후 무료 플랜으로 전환됩니다.</li>
            <li>• 포인트 흐름과 결제 내역은 최근 20건까지 표시됩니다. 더 오래된 내역이 필요하면 고객센터로 문의해 주세요.</li>
            <li>• 민원담당자: 박병하 (050-6664-7398) · seongbae555@gmail.com</li>
          </ul>
        </section>

      </div>
    </main>
  );
}
