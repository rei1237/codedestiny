"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  status: "pending" | "success" | "failed" | "cancelled";
  paidAt?: string;
  approvalNumber?: string | null;
};

type MeResponse = {
  user?: {
    id: string;
    name: string;
    points: number;
  };
  payments?: PaymentHistoryItem[];
  pointHistories?: PointHistoryEntry[];
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

function formatPoints(n: number) {
  const abs = Math.abs(n);
  return `${abs.toLocaleString("ko-KR")}원`;
}

function formatWon(n: number) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

function kindLabel(kind: PointHistoryEntry["kind"]) {
  if (kind === "charge")  return { text: "충전",  cls: "bg-emerald-100 text-emerald-800 border-emerald-300" };
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

function resolveFeatureName(featureKey?: string) {
  if (!featureKey) return "";
  const key = String(featureKey).trim();
  if (!key) return "";

  const map: Record<string, string> = {
    "pig-coin-charge": "포인트 충전",
    "pig-coin-unlock": "유료 콘텐츠 잠금 해제",
    "profile-subscription": "프로필 구독 결제",
    "profile-subscription-auto-renew": "프로필 구독 자동 갱신",
    "profile-subscription-service-start": "멤버십 서비스 시작",
    "share-reward": "카카오톡 공유 보상",
  };

  return map[key] || key.replace(/[-_]/g, " ");
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
  const [error, setError] = useState<string | null>(null);

  const [userName, setUserName] = useState("사용자");
  const [currentPoints, setCurrentPoints] = useState(0);
  const [histories, setHistories] = useState<PointHistoryEntry[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const fetchData = useCallback(async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/payments/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("fortune_auth_token");
        router.replace("/login?next=%2Fpoints%2Fhistory");
        return;
      }
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(`서버 점검 중입니다. (HTTP ${res.status})`);
      }
      const data: MeResponse = await res.json();
      if (!res.ok) throw new Error((data as { message?: string }).message || "데이터를 불러오지 못했습니다.");

      setUserName(data.user?.name || "사용자");
      setCurrentPoints(Number(data.user?.points || 0));
      setHistories(
        Array.isArray(data.pointHistories)
          ? data.pointHistories.filter(Boolean)
          : [],
      );
      setPayments(
        Array.isArray(data.payments)
          ? data.payments.filter((p) => p?.status === "success")
          : [],
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, router]);

  useEffect(() => {
    const token = localStorage.getItem("fortune_auth_token");
    if (!token) {
      router.replace("/login?next=%2Fpoints%2Fhistory");
      return;
    }
    setIsBooting(false);
  }, [router]);

  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (isBooting) return;
    const token = localStorage.getItem("fortune_auth_token");
    if (!token) return;
    tokenRef.current = token;
    fetchData(token);
  }, [isBooting, fetchData]);

  /* ── 탭 필터링 ─────────────────────────────────────────────── */
  const filteredHistories = useMemo(() => {
    if (activeTab === "all") return histories;
    if (activeTab === "charge") return histories.filter((h) => Number(h.delta || 0) > 0);
    return histories.filter((h) => Number(h.delta || 0) < 0);
  }, [histories, activeTab]);

  /* 요약 통계 */
  const totalCharged = useMemo(
    () => histories.reduce((s, h) => {
      const delta = Number(h.delta || 0);
      return delta > 0 ? s + delta : s;
    }, 0),
    [histories],
  );
  const totalDeducted = useMemo(
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
                <p className="text-[11px] font-extrabold tracking-[0.22em] text-amber-800 uppercase">Point Management</p>
                <h1 className="mt-0.5 text-[22px] font-black text-[#5C3A1E] leading-tight">
                  🐷 포인트 관리
                </h1>
                <p className="mt-1 text-sm text-[#7A5230]">충전·차감 내역 및 잔여 포인트를 확인하세요.</p>
              </div>
              <div className="flex flex-col gap-2 self-start sm:items-end">
                <Link
                  href="/points"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EDDBA3] bg-white/90 px-4 py-2.5 text-sm font-bold text-[#7A5230] shadow-[0_2px_10px_rgba(180,130,30,0.14)] transition-all hover:bg-[#FFF8E0] hover:-translate-y-0.5"
                >
                  ← 코인 충전소
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EDDBA3] bg-white/90 px-4 py-2.5 text-sm font-bold text-[#7A5230] shadow-[0_2px_10px_rgba(180,130,30,0.14)] transition-all hover:bg-[#FFF8E0] hover:-translate-y-0.5"
                >
                  서비스 화면으로
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* 현재 잔여 포인트 */}
        <section
          aria-label="현재 잔여 포인트"
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
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-800 mb-1">현재 잔여 포인트</p>
            <div className="flex items-center gap-3">
              <CoinIcon size="lg" />
              <span className="text-[28px] font-black text-[#7A4A00] leading-none">
                {currentPoints.toLocaleString("ko-KR")}
                <span className="ml-1.5 text-base font-bold text-amber-800">원</span>
              </span>
            </div>
            <p className="mt-2 text-[11px] text-amber-800 font-semibold">
              {userName} 님의 실시간 잔여 포인트입니다.
            </p>
            <p className="mt-1 text-[11px] text-[#9B7040]">
              ⏳ 포인트 충전 소진 기한은 결제한 시점부터 1년 이내까지이며, 미사용한 포인트는 소멸됩니다.
            </p>
          </div>
        </section>

        {/* 요약 통계 */}
        <section
          aria-label="포인트 요약"
          className="grid grid-cols-2 gap-3"
        >
          {[
            { label: "총 충전·환불", value: totalCharged, icon: "⬆️", cls: "border-emerald-200 bg-emerald-50/80", valcls: "text-emerald-700" },
            { label: "총 차감 사용", value: totalDeducted, icon: "⬇️", cls: "border-rose-200 bg-rose-50/80", valcls: "text-rose-700" },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-[20px] border p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${item.cls}`}
            >
              <p className="text-[11px] font-bold text-neutral-500 mb-1">{item.icon} {item.label}</p>
              <div className="flex items-center gap-1.5">
                <CoinIcon size="sm" />
                <span className={`text-[18px] font-black leading-none ${item.valcls}`}>
                  {item.value.toLocaleString("ko-KR")}
                  <span className="ml-1 text-xs font-bold">원</span>
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
                { id: "charge", label: "충전·환불" },
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
            ) : error ? (
              <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-sm font-semibold text-rose-700">⚠️ {error}</p>
                <button
                  type="button"
                  onClick={() => { if (tokenRef.current) fetchData(tokenRef.current); }}
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

        {/* 충전 내역 (결제 성공 건) */}
        <section
          aria-label="충전 결제 내역"
          className="rounded-[24px] border border-[#EDDBA3]/70 bg-[rgba(255,252,243,0.95)] p-5 shadow-[0_8px_28px_rgba(120,80,10,0.09)]"
        >
          <h2 className="text-[15px] font-bold text-[#5C3A1E] mb-3">충전 결제 내역</h2>
          {payments.length === 0 && !isLoading ? (
            <p className="text-sm text-[#7A5230]">완료된 결제 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2.5">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-[16px] border border-[#EFDCA8] bg-white/95 p-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-[#5C3A1E]">
                      포인트 {formatWon(p.paymentAmount)} 충전 · +{formatWon(p.chargedPoints)}
                    </p>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 border-emerald-300">
                      결제완료
                    </span>
                  </div>
                  <div className="mt-1.5 grid gap-1 text-[11.5px] text-[#7A5230] sm:grid-cols-2">
                    <p>결제시각: {formatDateTime(p.paidAt)}</p>
                    <p>결제수단: {p.paymentMethod || "-"}</p>
                    {p.approvalNumber && <p className="sm:col-span-2">승인번호: {p.approvalNumber}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 안내 */}
        <section className="rounded-[20px] border border-[#EDDBA3]/60 bg-[rgba(255,248,228,0.55)] p-5">
          <h3 className="font-bold text-[#5C3A1E] mb-2">포인트 이용 안내</h3>
          <ul className="space-y-1.5 text-sm text-[#7A5230]">
            <li>• 포인트 충전 소진 기한은 <strong>결제한 시점부터 1년 이내</strong>까지이며, 미사용한 포인트는 소멸됩니다.</li>
            <li>• 차감 내역은 서비스 이용 시 자동으로 기록됩니다.</li>
            <li>• 예시: 9/1 포인트 10,000원 충전 → 9/5 포인트 1,000원 사용(상품명 표기) → 잔여포인트 9,000원으로 계산·표시됩니다.</li>
            <li>• 환불 처리는 <strong>결제 수단(카드)으로만</strong> 가능합니다.</li>
            <li>• 미사용 유상 포인트는 전자상거래 관련 법령에 따라 <strong>&#39;7일이내청약철회 가능&#39;</strong> 기준으로 환불 접수할 수 있습니다.</li>
            <li>• 내역 조회는 최근 20건까지 표시됩니다. 더 오래된 내역이 필요하면 고객센터로 문의해 주세요.</li>
            <li>• 민원담당자: 박병하 (010-7180-7398) · seongbae555@gmail.com</li>
          </ul>
        </section>

      </div>
    </main>
  );
}
