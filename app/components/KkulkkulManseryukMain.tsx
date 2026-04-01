"use client";

import { useEffect, useState } from "react";

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
  buttonLabel = "황금 돼지 코인으로 운명 확인하기",
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

type PerUseKey = "turtleIChing" | "egyptOracle" | "geomancy" | "stonehengeRunes" | "premiumTarot";

const FREE_FEATURES = [
  "기본 만세력: 연/월/일/시 명식표 + 일주 캐릭터 요약",
  "재미 콘텐츠: 매력 테스트, 로또 기능",
  "데일리: 타짜 화투점, 데스티니 포커, 오늘/이달 운세 키워드, 돼지 주석점, 영국 홍차점",
  "맛보기: MBTI 동물 궁합, 사주네컷, 최강 T발놈 테스트",
  "사주 AI 프롬프트 맛보기: 이상형 얼굴, 운명적 풍경, 사주 아바타",
  "행복한 회복 타로",
];

export default function KkulkkulManseryukMain() {
  const [currentCoins, setCurrentCoins] = useState(1000);
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
  });

  const unlockByCoins = (key: UnlockKey, cost: number, alsoUnlock?: UnlockKey[]) => {
    if (unlockedFeatures[key]) return;

    if (currentCoins < cost) {
      setShowRechargeModal(true);
      return;
    }

    setCurrentCoins((prev) => prev - cost);
    setUnlockedFeatures((prev) => {
      const next = { ...prev, [key]: true };
      if (alsoUnlock?.length) {
        for (const aliasKey of alsoUnlock) next[aliasKey] = true;
      }
      return next;
    });
    setSparkleTarget(key);
  };

  const usePaidFeatureOnce = (key: PerUseKey, cost: number) => {
    if (currentCoins < cost) {
      setShowRechargeModal(true);
      return;
    }
    setCurrentCoins((prev) => prev - cost);
    setPerUseCount((prev) => ({ ...prev, [key]: prev[key] + 1 }));
    setSparkleTarget(key);
  };

  useEffect(() => {
    if (!sparkleTarget) return;
    const timer = setTimeout(() => setSparkleTarget(null), 1100);
    return () => clearTimeout(timer);
  }, [sparkleTarget]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-100 via-pink-50 to-amber-100 px-4 py-8 text-neutral-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-amber-200 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-700">꿀꿀 만세력</p>
              <h1 className="mt-2 text-3xl font-black leading-tight">황금 돼지 코인 운명 상점</h1>
              <p className="mt-2 text-sm text-neutral-700">
                무료는 즉시 노출, 유료는 코인으로 개별 해금합니다. 결제 전에는 데이터가 노출되지 않습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-100 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold text-amber-800">현재 잔액</p>
              <p className="mt-1 flex items-center gap-2 text-xl font-extrabold text-amber-900">
                <span aria-hidden="true">🐷</span>
                <span>황금 돼지 코인 {currentCoins}</span>
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
                  황금 돼지 코인으로 운명 확인하기
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
            <p className="mt-2 text-lg font-black text-neutral-900">돼지 코인이 부족해요! 충전하시겠어요?</p>
            <p className="mt-2 text-sm text-neutral-600">충전 후 다시 누르면 바로 운명을 열람할 수 있어요.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCurrentCoins((prev) => prev + 500);
                  setShowRechargeModal(false);
                }}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-4 py-2 text-sm font-bold text-white transition-transform duration-200 hover:scale-105 active:scale-95"
              >
                +500 코인 충전
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
