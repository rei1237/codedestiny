"use client";

import { useEffect, useState } from "react";
import HPremiumZiweiSection from "./HPremiumZiweiSection";
import HPremiumSukuyoSection from "./HPremiumSukuyoSection";
import HPremiumAstrologySection from "./HPremiumAstrologySection";
import HPremiumVedicSection from "./HPremiumVedicSection";

type LockedSectionProps = {
  title: string;
  description: string;
  cost: number;
  isUnlocked: boolean;
  onUnlock: () => void;
  buttonLabel?: string;
  children: React.ReactNode;
};

function LockedSection({
  title,
  description,
  cost,
  isUnlocked,
  onUnlock,
  buttonLabel = "꽃꽃돼지 코인으로 운명 확인하기",
  children,
}: LockedSectionProps) {
  if (isUnlocked) {
    return (
      <section className="rounded-3xl border border-amber-300/50 bg-white/90 p-5 shadow-lg shadow-rose-100">
        <h3 className="text-lg font-extrabold text-neutral-900">{title}</h3>
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
        <div className="mt-3 rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-4">
          {children}
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-300/60 bg-white/80 p-5 shadow-lg shadow-rose-100">
      <h3 className="text-lg font-extrabold text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>

      {/* 결제 전 유료 데이터는 렌더링하지 않고 미리보기 더미만 표시 */}
      <div className="mt-3 rounded-2xl border border-amber-100 bg-rose-50/80 p-4 text-neutral-500 blur-[10px] grayscale-[50%] select-none pointer-events-none">
        <p className="font-semibold">잠금된 프리미엄 운명 데이터</p>
        <p className="mt-1 text-sm">코인 결제 후 상세 결과가 열립니다.</p>
      </div>

      <div className="absolute inset-0 grid place-items-center bg-white/20 backdrop-blur-[10px]">
        <div className="rounded-2xl border border-amber-300/80 bg-white/95 px-6 py-5 text-center shadow-xl">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 p-2 shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="h-full w-full text-amber-900" aria-hidden="true">
              <path
                d="M8 10V7a4 4 0 118 0v3M7 10h10a1 1 0 011 1v8a1 1 0 01-1 1H7a1 1 0 01-1-1v-8a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-neutral-800">유료 기능 잠금 상태</p>
          <p className="mb-3 text-xs font-bold text-amber-700">소모 코인: {cost}</p>
          <button
            type="button"
            onClick={onUnlock}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </section>
  );
}

type UnlockKey =
  | "allPaidSaju"
  | "rpgCharacter"
  | "travelDestiny"
  | "healthReport"
  | "sajuDiary"
  | "secretHouseEpisodes"
  | "premiumDivinationPack";

type PerUseKey = "turtleIChing" | "egyptOracle" | "geomancy" | "stonehengeRunes" | "premiumTarot" | "loveSimulation";

const FREE_FEATURES = [
  "기본 만세력: 연/월/일/시 명식표 + 일주 캐릭터 요약",
  "재미 콘텐츠: 매력 테스트, 로또 기능",
  "데일리: 타짜 화투점, 데스티니 포커, 오늘/이달 운세 키워드, 돼지 주석점, 영국 홍차점",
  "맛보기: MBTI 동물 궁합, 사주네컷, 최강 T발놈 테스트",
  "사주 AI 프롬프트 맛보기: 이상형 얼굴, 운명적 풍경, 사주 아바타",
  "행복한 회복 타로",
];

function saveUserPoints(points: number) {
  try {
    const raw = localStorage.getItem('fortune_auth_user');
    const user = raw ? JSON.parse(raw) : {};
    user.points = points;
    localStorage.setItem('fortune_auth_user', JSON.stringify(user));
  } catch (_) {}
}

export default function KkulkkulManseryukMain() {
  const [currentCoins, setCurrentCoins] = useState(0);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [sparkleTarget, setSparkleTarget] = useState<string | null>(null);
  const [unlockedFeatures, setUnlockedFeatures] = useState<Record<UnlockKey, boolean>>({
    allPaidSaju: false,
    rpgCharacter: false,
    travelDestiny: false,
    healthReport: false,
    sajuDiary: false,
    secretHouseEpisodes: false,
    premiumDivinationPack: false,
  });

  const [perUseCount, setPerUseCount] = useState<Record<PerUseKey, number>>({
    turtleIChing: 0,
    egyptOracle: 0,
    geomancy: 0,
    stonehengeRunes: 0,
    premiumTarot: 0,
    loveSimulation: 0,
  });

  const unlockByCoins = async (key: UnlockKey, cost: number, alsoUnlock?: UnlockKey[]) => {
    if (unlockedFeatures[key]) return;
    const token = localStorage.getItem('fortune_auth_token');
    if (!token) {
      alert('로그인이 필요합니다.');
      window.location.href = '/login?next=%2F';
      return;
    }
    if (currentCoins < cost) {
      setShowRechargeModal(true);
      return;
    }
    try {
      const res = await fetch('/api/fortune/pig-coin/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cost, reason: `${key} 해금` }),
      });
      const data = await res.json();
      if (res.status === 402) { setShowRechargeModal(true); return; }
      if (!res.ok) { alert(data.message || '코인 차감 실패'); return; }
      const newPoints = data?.user?.points !== undefined ? Number(data.user.points) : Math.max(0, currentCoins - cost);
      setCurrentCoins(newPoints);
      saveUserPoints(newPoints);
      setUnlockedFeatures((prev) => {
        const next = { ...prev, [key]: true };
        if (alsoUnlock?.length) {
          for (const aliasKey of alsoUnlock) next[aliasKey] = true;
        }
        return next;
      });
      setSparkleTarget(key);
    } catch (e) {
      console.error('[unlockByCoins]', e);
      alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const usePaidFeatureOnce = async (key: PerUseKey, cost: number) => {
    const token = localStorage.getItem('fortune_auth_token');
    if (!token) {
      alert('로그인이 필요합니다.');
      window.location.href = '/login?next=%2F';
      return;
    }
    if (currentCoins < cost) {
      setShowRechargeModal(true);
      return;
    }
    try {
      const res = await fetch('/api/fortune/pig-coin/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cost, reason: `${key} 이용` }),
      });
      const data = await res.json();
      if (res.status === 402) { setShowRechargeModal(true); return; }
      if (!res.ok) { alert(data.message || '코인 차감 실패'); return; }
      const newPoints = data?.user?.points !== undefined ? Number(data.user.points) : Math.max(0, currentCoins - cost);
      setCurrentCoins(newPoints);
      saveUserPoints(newPoints);
      setPerUseCount((prev) => ({ ...prev, [key]: prev[key] + 1 }));
      setSparkleTarget(key);
      // 연애 시뮬레이션은 결제 후 전용 페이지로 이동
      if (key === 'loveSimulation') {
        window.location.href = '/saju/love-simulation';
      }
    } catch (e) {
      console.error('[usePaidFeatureOnce]', e);
      alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  useEffect(() => {
    if (!sparkleTarget) return;
    const timer = setTimeout(() => setSparkleTarget(null), 1100);
    return () => clearTimeout(timer);
  }, [sparkleTarget]);

  useEffect(() => {
    // 1) localStorage에서 즉시 표시
    try {
      const raw = localStorage.getItem('fortune_auth_user');
      const user = raw ? JSON.parse(raw) : {};
      if (typeof user?.points === 'number') setCurrentCoins(user.points);
    } catch (_) {}
    // 2) API로 실제 잔액 동기화
    const token = localStorage.getItem('fortune_auth_token');
    if (!token) return;
    fetch('/api/fortune/pig-coin/balance', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.points !== undefined) {
          const pts = Number(d.user.points);
          setCurrentCoins(pts);
          saveUserPoints(pts);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-100 via-pink-50 to-amber-100 px-4 py-8 text-neutral-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-amber-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-700">꿀꿀 만세력</p>
              <h1 className="mt-2 text-3xl font-black leading-tight">꽃꽃돼지 코인 운명 상점</h1>
              <p className="mt-2 text-sm text-neutral-700">
                무료는 즉시 노출, 유료는 코인으로 개별 해금합니다. 결제 전에는 데이터가 노출되지 않습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-100 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-amber-800">현재 잔액</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-extrabold text-amber-900">
                <span aria-hidden="true">🐷</span>
                <span>꽃꽃돼지 코인 {currentCoins}</span>
              </p>
            </div>
          </div>
        </header>

        {/* FREE: 바로 노출되는 영역 */}
        <section className="rounded-3xl border border-emerald-200 bg-white/90 p-5 shadow-sm">
          <h2 className="text-xl font-black text-emerald-800">FREE - 바로 노출</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {FREE_FEATURES.map((feature) => (
              <article key={feature} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-sm font-semibold text-emerald-900">{feature}</p>
              </article>
            ))}
          </div>
        </section>

        {/* PAID: 무료 외 전체 사주 해금 번들 */}
        <LockedSection
          title="사주 확장 콘텐츠 전체 해금"
          description="무료 항목을 제외한 사주 확장 서비스 전체를 한 번에 해금합니다."
          cost={700}
          isUnlocked={unlockedFeatures.allPaidSaju}
          onUnlock={() =>
            unlockByCoins("allPaidSaju", 700, ["rpgCharacter", "travelDestiny", "healthReport", "sajuDiary", "secretHouseEpisodes"])
          }
        >
          <p className="text-sm text-neutral-700">
            해금 완료: 사주 확장 세트(심층 풀이/확장 재미 콘텐츠/개별 리포트)가 모두 열렸습니다.
          </p>
        </LockedSection>

        <section className="grid gap-4 lg:grid-cols-2">
          {/* PAID 개별 해금 */}
          <LockedSection
            title="RPG 캐릭터 리포트"
            description="사주 기반 능력치/직업/성장 루트를 RPG 캐릭터처럼 분석합니다."
            cost={50}
            isUnlocked={unlockedFeatures.rpgCharacter || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("rpgCharacter", 50)}
          >
            <p className="text-sm text-neutral-700">전투 타입, 성장 타입, 파티 궁합이 공개되었습니다.</p>
          </LockedSection>

          <LockedSection
            title="사주로 보는 여행지"
            description="오행 밸런스에 맞춘 여행지/계절/테마를 제안합니다."
            cost={100}
            isUnlocked={unlockedFeatures.travelDestiny || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("travelDestiny", 100)}
          >
            <p className="text-sm text-neutral-700">당신의 운을 살리는 여행지 3곳과 피해야 할 시즌이 열렸습니다.</p>
          </LockedSection>

          <LockedSection
            title="명리 헬스 리포트"
            description="오행 건강 경향, 루틴, 식습관 가이드를 제공합니다."
            cost={100}
            isUnlocked={unlockedFeatures.healthReport || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("healthReport", 100)}
          >
            <p className="text-sm text-neutral-700">체질 관리 포인트와 일상 루틴 추천이 활성화되었습니다.</p>
          </LockedSection>

          <LockedSection
            title="사주 다이어리"
            description="일간 운세 기록, 감정 로그, 월별 회고 기능을 해금합니다."
            cost={200}
            isUnlocked={unlockedFeatures.sajuDiary || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("sajuDiary", 200)}
          >
            <p className="text-sm text-neutral-700">오늘 기록 템플릿과 월간 리포트 생성이 열렸습니다.</p>
          </LockedSection>

          <LockedSection
            title="시크릿 하우스 전체 에피소드"
            description="연애 시뮬레이션 전체 분기 스토리를 자유 열람합니다."
            cost={100}
            isUnlocked={unlockedFeatures.secretHouseEpisodes || unlockedFeatures.allPaidSaju}
            onUnlock={() => unlockByCoins("secretHouseEpisodes", 100)}
          >
            <p className="text-sm text-neutral-700">모든 에피소드/멀티 엔딩/숨겨진 루트가 열렸습니다.</p>
          </LockedSection>

          <LockedSection
            title="프리미엄 점술 패키지"
            description="자미두수, 점성술, 숙요점, 베다점 전체 기능을 패키지로 해금합니다."
            cost={300}
            isUnlocked={unlockedFeatures.premiumDivinationPack}
            onUnlock={() => unlockByCoins("premiumDivinationPack", 300)}
          >
            <ul className="list-disc pl-5 text-sm text-neutral-700">
              <li>자미두수 전체 풀이</li>
              <li>점성술 세부 차트</li>
              <li>숙요점 심층 분석</li>
              <li>베다점 심화 리포트</li>
            </ul>
          </LockedSection>
        </section>

        {/* PAID 회당 과금 섹션 */}
        <section className="rounded-3xl border border-rose-200 bg-white/90 p-5 shadow-sm">
          <h2 className="text-xl font-black text-rose-800">회당 과금 점술 (1회당 50코인)</h2>
          <p className="mt-1 text-sm text-neutral-600">
            주역 거북점, 이집트 신탁, 지오멘시 흙점, 스톤헨지 룬점, 행복한 회복 타로를 제외한 타로 기능은 1회 이용마다 코인이 차감됩니다.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "turtleIChing" as const, title: "주역 거북점" },
              { key: "egyptOracle" as const, title: "이집트 신탁" },
              { key: "geomancy" as const, title: "지오멘시 흙점" },
              { key: "stonehengeRunes" as const, title: "스톤헨지 룬점" },
              { key: "premiumTarot" as const, title: "프리미엄 타로(회복 타로 제외)" },
            ].map((item) => (
              <article
                key={item.key}
                className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-rose-50 to-amber-50 p-4"
              >
                <h3 className="font-bold text-neutral-900">{item.title}</h3>
                <p className="mt-1 text-xs text-neutral-600">이용 횟수: {perUseCount[item.key]}회</p>

                <button
                  type="button"
                  onClick={() => usePaidFeatureOnce(item.key, 50)}
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-sm font-bold text-white transition-transform duration-200 hover:scale-105 active:scale-95"
                >
                  꽃꽃돼지 코인으로 운명 확인하기
                </button>

                {perUseCount[item.key] > 0 ? (
                  <p className="mt-3 rounded-lg border border-amber-100 bg-white/70 p-2 text-xs text-neutral-700">
                    최근 결과가 열렸습니다. (데모 표시)
                  </p>
                ) : (
                  <div className="mt-3 rounded-lg border border-rose-100 bg-white/40 p-2 text-xs text-neutral-500 blur-[6px] grayscale-[50%] select-none">
                    결제 전 결과 데이터 비노출
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <p className="text-xs text-neutral-600">
          정책 요약: 무료로 지정된 항목 외 기능은 유료이며, 결제 전에는 실제 콘텐츠를 렌더링하지 않습니다.
        </p>

        {/* ─── 프리미엄 운세 컬렉션 ─────────────────────────────────── */}
        <section
          id="premium-collection"
          style={{
            background: "linear-gradient(145deg, #07091a 0%, #0c0f24 50%, #070916 100%)",
            border: "1px solid rgba(251,191,36,0.18)",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 12px 50px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* 섹션 헤더 */}
          <div style={{
            padding: "28px 24px 20px",
            background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(99,102,241,0.06) 100%)",
            borderBottom: "1px solid rgba(251,191,36,0.10)",
          }}>
            <p style={{ color: "rgba(251,191,36,0.55)", fontSize: "0.62rem", letterSpacing: "0.32em", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
              CODE : DESTINY · PREMIUM COLLECTION
            </p>
            <h2 style={{ color: "#fff", fontWeight: 900, fontSize: "clamp(1.3rem,4vw,1.8rem)", lineHeight: 1.25, margin: 0 }}>
              프리미엄 운세 컬렉션
            </h2>
            <p style={{ color: "rgba(167,139,250,0.55)", fontSize: "0.85rem", marginTop: "6px", fontWeight: 300, lineHeight: 1.7 }}>
              AI 기반 심층 자미두수 분석 · 인생 전략 리포트 시리즈
            </p>
          </div>

          {/* 카드 그리드 */}
          <div style={{ padding: "20px 16px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
            className="premium-card-grid"
          >
            <style>{`
              @media(max-width:600px){.premium-card-grid{grid-template-columns:1fr!important}}
            `}</style>

            {/* ── 카드 1: H 프리미엄 자미두수 ── */}
            <a
              href="#ziwei-premium"
              onClick={e => { e.preventDefault(); document.getElementById("ziwei-premium")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              style={{
                display: "flex", flexDirection: "column",
                borderRadius: "18px", overflow: "hidden",
                background: "rgba(10,6,30,0.65)",
                border: "1.5px solid rgba(167,139,250,0.35)",
                boxShadow: "0 4px 24px rgba(99,102,241,0.15)",
                textDecoration: "none",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(99,102,241,0.28)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(99,102,241,0.15)"; }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
                <img src="/fuctionassets/jamipremiun.webp" alt="H 프리미엄 자미두수"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,6,30,0.85) 0%, transparent 60%)" }} />
                <span style={{
                  position: "absolute", top: "10px", left: "10px",
                  background: "rgba(99,102,241,0.85)", color: "#fff",
                  fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.14em",
                  padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase",
                }}>PREMIUM</span>
              </div>
              <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <p style={{ color: "rgba(167,139,250,0.65)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>자미두수 · Ziwei Premium</p>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", margin: 0, lineHeight: 1.3 }}>H 프리미엄 인생 총론</p>
                <p style={{ color: "rgba(203,213,225,0.55)", fontSize: "0.78rem", lineHeight: 1.7, margin: 0 }}>13챕터 · 12궁 완전 분析 · 상하관계 처세술 · 마스터플랜 카드</p>
                <div style={{ marginTop: "auto", paddingTop: "10px" }}>
                  <span style={{
                    display: "inline-block",
                    background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(167,139,250,0.12))",
                    border: "1px solid rgba(167,139,250,0.38)",
                    color: "rgba(196,181,253,1)", fontWeight: 700, fontSize: "0.72rem",
                    padding: "6px 14px", borderRadius: "10px",
                  }}>✦ 지금 분析하기</span>
                </div>
              </div>
            </a>

            {/* ── 카드 2: 인생의 책 ── */}
            <div
              style={{
                display: "flex", flexDirection: "column",
                borderRadius: "18px", overflow: "hidden",
                background: "rgba(4,18,8,0.65)",
                border: "1.5px solid rgba(52,211,153,0.28)",
                boxShadow: "0 4px 24px rgba(16,185,129,0.10)",
                cursor: "default", opacity: 0.85,
              }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
                <img src="/fuctionassets/lifebook.webp" alt="인생의 책"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(4,18,8,0.85) 0%, transparent 60%)" }} />
                <span style={{
                  position: "absolute", top: "10px", left: "10px",
                  background: "rgba(16,185,129,0.75)", color: "#fff",
                  fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.14em",
                  padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase",
                }}>COMING SOON</span>
              </div>
              <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <p style={{ color: "rgba(110,231,183,0.6)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>생애 서사 · Life Story</p>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", margin: 0, lineHeight: 1.3 }}>인생의 책</p>
                <p style={{ color: "rgba(203,213,225,0.5)", fontSize: "0.78rem", lineHeight: 1.7, margin: 0 }}>나의 생애 스토리를 AI가 한 권의 책으로 완성하는 프리미엄 경험</p>
                <div style={{ marginTop: "auto", paddingTop: "10px" }}>
                  <span style={{
                    display: "inline-block",
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(52,211,153,0.22)",
                    color: "rgba(110,231,183,0.55)", fontWeight: 600, fontSize: "0.7rem",
                    padding: "6px 14px", borderRadius: "10px",
                  }}>🔒 준비 중</span>
                </div>
              </div>
            </div>

            {/* ── 카드 3: 점성술 프리미엄 리포트 ── */}
            <a
              href="#astrology-premium"
              onClick={e => { e.preventDefault(); document.getElementById("astrology-premium")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              style={{
                display: "flex", flexDirection: "column",
                borderRadius: "18px", overflow: "hidden",
                background: "rgba(7,4,25,0.65)",
                border: "1.5px solid rgba(251,191,36,0.35)",
                boxShadow: "0 4px 24px rgba(251,191,36,0.12)",
                textDecoration: "none",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(251,191,36,0.28)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(251,191,36,0.12)"; }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
                <img src="/fuctionassets/premiumstar.webp" alt="점성술 프리미엄 리포트"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,4,25,0.85) 0%, transparent 60%)" }} />
                <span style={{
                  position: "absolute", top: "10px", left: "10px",
                  background: "rgba(251,191,36,0.85)", color: "#1a1200",
                  fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.14em",
                  padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase",
                }}>PREMIUM</span>
              </div>
              <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <p style={{ color: "rgba(253,230,138,0.65)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>점성술 · Astrology Premium</p>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", margin: 0, lineHeight: 1.3 }}>점성술 프리미엄 리포트</p>
                <p style={{ color: "rgba(203,213,225,0.55)", fontSize: "0.78rem", lineHeight: 1.7, margin: 0 }}>12챕터 · ASC/Sun/Moon 입체 분析 · 서양 열대황도 전문 엔진 · AI 심층 해석</p>
                <div style={{ marginTop: "auto", paddingTop: "10px" }}>
                  <span style={{
                    display: "inline-block",
                    background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(253,230,138,0.12))",
                    border: "1px solid rgba(251,191,36,0.45)",
                    color: "rgba(253,230,138,1)", fontWeight: 700, fontSize: "0.72rem",
                    padding: "6px 14px", borderRadius: "10px",
                  }}>✦ 1회 390코인</span>
                </div>
              </div>
            </a>

            {/* ── 카드 4: 연애 비책 ── */}
            <div
              style={{
                display: "flex", flexDirection: "column",
                borderRadius: "18px", overflow: "hidden",
                background: "rgba(30,4,18,0.65)",
                border: "1.5px solid rgba(244,114,182,0.28)",
                boxShadow: "0 4px 24px rgba(236,72,153,0.10)",
                cursor: "default", opacity: 0.85,
              }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
                <img src="/fuctionassets/lovebible.webp" alt="연애 비책"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(30,4,18,0.85) 0%, transparent 60%)" }} />
                <span style={{
                  position: "absolute", top: "10px", left: "10px",
                  background: "rgba(236,72,153,0.75)", color: "#fff",
                  fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.14em",
                  padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase",
                }}>COMING SOON</span>
              </div>
              <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <p style={{ color: "rgba(249,168,212,0.6)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>연애 전략 · Love Strategy</p>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", margin: 0, lineHeight: 1.3 }}>연애 비책</p>
                <p style={{ color: "rgba(203,213,225,0.5)", fontSize: "0.78rem", lineHeight: 1.7, margin: 0 }}>내 사주에 맞는 연애 전략과 최상의 파트너 유형을 분析하는 비밀 가이드</p>
                <div style={{ marginTop: "auto", paddingTop: "10px" }}>
                  <span style={{
                    display: "inline-block",
                    background: "rgba(236,72,153,0.08)",
                    border: "1px solid rgba(244,114,182,0.22)",
                    color: "rgba(249,168,212,0.55)", fontWeight: 600, fontSize: "0.7rem",
                    padding: "6px 14px", borderRadius: "10px",
                  }}>🔒 준비 중</span>
                </div>
              </div>
            </div>

            {/* ── 카드 4: 숙요점 프리미엄 ── */}
            <a
              href="#sukuyo-premium"
              onClick={e => { e.preventDefault(); document.getElementById("sukuyo-premium")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              style={{
                display: "flex", flexDirection: "column",
                borderRadius: "18px", overflow: "hidden",
                background: "rgba(2,8,23,0.65)",
                border: "1.5px solid rgba(125,211,252,0.35)",
                boxShadow: "0 4px 24px rgba(14,165,233,0.12)",
                textDecoration: "none",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 36px rgba(14,165,233,0.28)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(14,165,233,0.12)"; }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
                <img src="/fuctionassets/sukyo_premium.webp" alt="숙요점 프리미엄"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(2,8,23,0.88) 0%, transparent 60%)" }} />
                <span style={{
                  position: "absolute", top: "10px", left: "10px",
                  background: "rgba(14,165,233,0.85)", color: "#fff",
                  fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.14em",
                  padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase",
                }}>PREMIUM</span>
              </div>
              <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <p style={{ color: "rgba(125,211,252,0.65)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>숙요점 · Moonlight Strategy</p>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", margin: 0, lineHeight: 1.3 }}>달빛 전략 리포트</p>
                <p style={{ color: "rgba(203,213,225,0.55)", fontSize: "0.78rem", lineHeight: 1.7, margin: 0 }}>13챕터 · 27수 완전 分析 · 6대 관계 역학 · 달의 주기 전략</p>
                <div style={{ marginTop: "auto", paddingTop: "10px" }}>
                  <span style={{
                    display: "inline-block",
                    background: "linear-gradient(135deg, rgba(2,44,84,0.3), rgba(30,27,75,0.2))",
                    border: "1px solid rgba(125,211,252,0.38)",
                    color: "rgba(125,211,252,1)", fontWeight: 700, fontSize: "0.72rem",
                    padding: "6px 14px", borderRadius: "10px",
                  }}>✦ 1회 390코인</span>
                </div>
              </div>
            </a>

            {/* ── 카드: 베다 점성술 프리미엄 (COMING SOON) ── */}
            <div
              style={{
                display: "flex", flexDirection: "column",
                borderRadius: "18px", overflow: "hidden",
                background: "rgba(15,10,3,0.65)",
                border: "1.5px solid rgba(251,146,60,0.28)",
                boxShadow: "0 4px 24px rgba(234,88,12,0.08)",
                cursor: "default", opacity: 0.82,
              }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
                <img src="/fuctionassets/veda.webp" alt="베다 점성술 프리미엄"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,10,3,0.90) 0%, transparent 55%)" }} />
                <span style={{
                  position: "absolute", top: "10px", left: "10px",
                  background: "rgba(234,88,12,0.75)", color: "#fff",
                  fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.14em",
                  padding: "3px 8px", borderRadius: "20px", textTransform: "uppercase",
                }}>COMING SOON</span>
              </div>
              <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <p style={{ color: "rgba(253,186,116,0.60)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>베다 점성술 · Vedic Astrology Premium</p>
                <p style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", margin: 0, lineHeight: 1.3 }}>🪷 베다 인생 총람 리포트</p>
                <p style={{ color: "rgba(203,213,225,0.50)", fontSize: "0.78rem", lineHeight: 1.7, margin: 0 }}>인도 고대 조티쉬 베다 점성술 — 라그나·달 배치·나크샤트라로 보는 평생 운명 지도</p>
                <div style={{ marginTop: "auto", paddingTop: "10px" }}>
                  <span style={{
                    display: "inline-block",
                    background: "rgba(234,88,12,0.08)",
                    border: "1px solid rgba(251,146,60,0.22)",
                    color: "rgba(253,186,116,0.55)", fontWeight: 600, fontSize: "0.72rem",
                    padding: "6px 14px", borderRadius: "10px",
                  }}>🔒 준비 중</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── H PREMIUM 자미두수 인생 총론 ─── */}
        <div id="ziwei-premium">
          <HPremiumZiweiSection />
        </div>

        {/* ─── 점성술 프리미엄 리포트 ─── */}
        <div id="astrology-premium">
          <HPremiumAstrologySection />
        </div>

        {/* ─── 숙요점 달빛 전략 리포트 ─── */}
        <div id="sukuyo-premium">
          <HPremiumSukuyoSection />
        </div>

        {/* ─── 베다 점성술 프리미엄 — Karmic Blueprint ─── */}
        <div id="veda-premium">
          <HPremiumVedicSection />
        </div>

        {/* ─── LOVE CODE 사주 연애 시뮬레이션 (하단 배치) ─── */}
        <section className="overflow-hidden rounded-3xl border border-rose-300/60 bg-gradient-to-br from-rose-950/90 via-purple-950/90 to-slate-950/90 shadow-2xl shadow-rose-900/30">
          {/* 배너 이미지 */}
          <div className="relative w-full overflow-hidden" style={{ maxHeight: 320 }}>
            <img
              src="/fuctionassets/lovesimulation.webp"
              alt="LOVE CODE 사주 연애 시뮬레이션"
              className="w-full object-cover"
              style={{ display: 'block' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-rose-950/80 via-transparent to-transparent" />
          </div>

          <div className="p-6">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl">💕</span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-300">
                재미 사주 콘텐츠
              </span>
            </div>
            <h2 className="mb-2 text-2xl font-black text-white">
              LOVE CODE — 사주 연애 시뮬레이션
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-rose-200/80">
              상대방의 생년월일을 입력하면 사주 분석 엔진이 그 사람의 오행·일간·MBTI를 계산해
              <strong className="text-rose-300"> 페르소나 캐릭터</strong>를 만들어줍니다.
              다양한 데이트 코스와 선택지를 통해 상대방의 취향·성격을 미리 경험하고
              더 나은 연애를 준비해보세요.
            </p>

            <ul className="mb-5 space-y-1.5 text-sm text-rose-100/70">
              {[
                "🔮 상대방 생년월일 → 사주팔자 명식 분석",
                "✨ 오행·일간·MBTI 기반 연애 페르소나 캐릭터 생성",
                "💬 실시간 채팅으로 상대의 반응 미리 경험",
                "🎲 돌발 데이트 이벤트 & 오행 선택지 시나리오",
                "📊 호감도 게이지 & 감정 변화 실시간 추적",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-500/30 bg-rose-950/50 px-4 py-3">
              <div>
                <p className="text-xs text-rose-300/70">1회 이용 요금</p>
                <p className="text-xl font-extrabold text-amber-300">
                  🐷 꽃꽃돼지 코인 100
                </p>
              </div>
              <button
                type="button"
                onClick={() => usePaidFeatureOnce('loveSimulation', 100)}
                className="rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-800/40 transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                💕 시뮬레이션 시작
              </button>
            </div>
          </div>
        </section>
      </div>

      {sparkleTarget ? (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {Array.from({ length: 24 }).map((_, idx) => (
            <span
              key={`sparkle-${sparkleTarget}-${idx}`}
              className="absolute text-lg font-black text-amber-500 animate-bounce"
              style={{
                left: `${(idx % 8) * 12 + 4}%`,
                top: `${Math.floor(idx / 8) * 28 + 12}%`,
                animationDelay: `${(idx % 6) * 60}ms`,
              }}
            >
              ✨
            </span>
          ))}
        </div>
      ) : null}

      {showRechargeModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-rose-300 bg-white p-6 text-center shadow-2xl">
            <p className="text-2xl">🐷💰</p>
            <p className="mt-2 text-lg font-black text-neutral-900">꽃돼지 코인이 부족해요! 충전하시겠어요?</p>
            <p className="mt-2 text-sm text-neutral-600">충전 후 다시 누르면 바로 운명을 열람할 수 있어요.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRechargeModal(false);
                  window.location.href = '/points';
                }}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-sm font-bold text-white transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                코인 충전하기
              </button>
              <button
                type="button"
                onClick={() => setShowRechargeModal(false)}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
