"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Clock3, Sparkles, UserRound } from "lucide-react";
import { useAnimalCardExport } from "../hooks/useAnimalCardExport";
import type { AnimalDestinyInput } from "../lib/types";
import { useAnimalDestinyStore } from "../store/useAnimalDestinyStore";
import AnimalResultScreen from "./AnimalResultScreen";
import { useBackNavigation } from "@/app/hooks/useBackNavigation";

type InputPanelProps = {
  input: AnimalDestinyInput;
  onChange: (patch: Partial<AnimalDestinyInput>) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isBusy: boolean;
  error?: string;
};

const SUMMON_STEPS = [
  "생년월일 기운을 깨우는 중",
  "오행 에너지 균형을 읽는 중",
  "수호동물 실루엣을 부르는 중",
  "가디언 카드 봉인을 여는 중",
];

function GuardianInputPanel({ input, onChange, onSubmit, canSubmit, isBusy, error }: InputPanelProps) {
  const isLunar = (input.calendarType || "solar") === "lunar";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/18 bg-white/10 p-4 shadow-[0_24px_70px_rgba(8,8,32,0.34)] backdrop-blur-2xl sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_38%,rgba(118,235,214,0.12))]" />
      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-[#7ef1de]">GUARDIAN SUMMON</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">내 사주 속 수호동물을 소환합니다</h2>
          </div>
          <span className="rounded-full border border-[#ffe899]/40 bg-[#ffe899]/14 px-3 py-1 text-xs font-black text-[#fff2b8]">
            AI 이미지 생성 없음
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm font-bold text-white">
            이름 또는 닉네임
            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7ef1de]" />
              <input
                value={input.name || ""}
                onChange={(event) => onChange({ name: event.target.value.slice(0, 20) })}
                placeholder="예: 달빛탐험가"
                className="min-h-12 w-full rounded-2xl border border-white/18 bg-white/12 px-10 py-3 text-base font-semibold text-white outline-none placeholder:text-white/45 focus:border-[#7ef1de]"
              />
            </span>
          </label>

          <label className="space-y-2 text-sm font-bold text-white">
            생년월일 <span className="text-[#ffb7cf]">*</span>
            <span className="relative block">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7ef1de]" />
              <input
                type="text"
                inputMode="numeric"
                value={input.birthDate}
                onChange={(event) => onChange({ birthDate: event.target.value.replace(/[^\d-]/g, "").slice(0, 10) })}
                placeholder="YYYY-MM-DD"
                className="min-h-12 w-full rounded-2xl border border-white/18 bg-white/12 px-10 py-3 text-base font-semibold text-white outline-none placeholder:text-white/45 focus:border-[#7ef1de]"
              />
            </span>
          </label>

          <label className="space-y-2 text-sm font-bold text-white">
            태어난 시간
            <span className="relative block">
              <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7ef1de]" />
              <input
                type="time"
                value={input.birthTime || ""}
                onChange={(event) => onChange({ birthTime: event.target.value })}
                className="min-h-12 w-full rounded-2xl border border-white/18 bg-white/12 px-10 py-3 text-base font-semibold text-white outline-none focus:border-[#7ef1de]"
              />
            </span>
            <span className="block text-xs font-semibold text-white/58">시간을 모르면 비워도 연·월·일 중심으로 소환합니다.</span>
          </label>

          <label className="space-y-2 text-sm font-bold text-white">
            달력 타입
            <select
              value={input.calendarType || "solar"}
              onChange={(event) => onChange({ calendarType: event.target.value as AnimalDestinyInput["calendarType"] })}
              className="min-h-12 w-full rounded-2xl border border-white/18 bg-[#2a244a] px-4 py-3 text-base font-semibold text-white outline-none focus:border-[#7ef1de]"
            >
              <option value="solar">양력</option>
              <option value="lunar">음력</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-bold text-white">
            성별
            <select
              value={input.gender}
              onChange={(event) => onChange({ gender: event.target.value as AnimalDestinyInput["gender"] })}
              className="min-h-12 w-full rounded-2xl border border-white/18 bg-[#2a244a] px-4 py-3 text-base font-semibold text-white outline-none focus:border-[#7ef1de]"
            >
              <option value="unknown">미선택</option>
              <option value="female">여성</option>
              <option value="male">남성</option>
            </select>
          </label>

          {isLunar ? (
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-white/18 bg-white/12 px-4 py-3 text-sm font-bold text-white">
              <input
                type="checkbox"
                checked={Boolean(input.lunarLeap)}
                onChange={(event) => onChange({ lunarLeap: event.target.checked })}
                className="h-5 w-5 accent-[#7ef1de]"
              />
              윤달 출생입니다
            </label>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-[#ff9eb9]/45 bg-[#ff6c9a]/14 px-4 py-3 text-sm font-bold text-[#ffd4e0]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || isBusy}
          className="group relative min-h-14 w-full overflow-hidden rounded-[1.65rem] bg-[linear-gradient(125deg,#7c5cff,#37d2c5_48%,#ffd36c)] px-5 py-4 text-lg font-black text-[#15112b] shadow-[0_18px_44px_rgba(53,210,197,0.24)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.36),transparent)] transition duration-700 group-hover:translate-x-[120%]" />
          <span className="relative inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {isBusy ? "수호동물 소환 중" : "내 사주 가디언 소환하기"}
          </span>
        </button>
      </div>
    </section>
  );
}

function GuardianSummonLoading({ mode }: { mode: "calculating" | "revealing" }) {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/18 bg-white/10 p-6 text-white shadow-[0_24px_70px_rgba(8,8,32,0.34)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(126,241,222,0.18),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(255,211,108,0.16),transparent_30%)]" />
      <div className="relative z-10 space-y-5">
        <div>
          <p className="text-xs font-black tracking-[0.24em] text-[#7ef1de]">SUMMONING</p>
          <h2 className="mt-2 text-2xl font-black">{mode === "calculating" ? "오행 에너지 분석 중" : "가디언 카드 공개 중"}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {SUMMON_STEPS.map((step, index) => (
            <motion.article
              key={step}
              className="min-h-28 rounded-3xl border border-white/16 bg-white/12 p-4"
              animate={reduced ? undefined : { y: [0, -8, 0], rotateY: mode === "revealing" ? [0, 180, 360] : 0 }}
              transition={{ duration: mode === "revealing" ? 1.8 : 1.45, repeat: Number.POSITIVE_INFINITY, delay: index * 0.12 }}
            >
              <div className="mb-3 h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,#7c5cff,#7ef1de)] shadow-[0_0_24px_rgba(126,241,222,0.35)]" />
              <p className="text-sm font-black leading-snug">{step}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AnimalDestinyPage() {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);

  const {
    status,
    input,
    sajuResult,
    animalData,
    twelveStages,
    tamagotchi,
    tamagotchiStatus,
    tamagotchiMessage,
    tamagotchiIsLoggedIn,
    partner,
    error,
    setInput,
    hydrateTamagotchi,
    careTamagotchi,
    calculate,
    calculateCompatibility,
    reset,
  } = useAnimalDestinyStore();

  const { isExporting, exportCard, shareCard } = useAnimalCardExport();
  const canSubmit = useMemo(() => Boolean(input.birthDate), [input.birthDate]);
  const isBusy = status === "calculating" || status === "revealing";

  const handleSubmit = useCallback(async () => {
    await calculate();
  }, [calculate]);

  const handlePartnerSubmit = useCallback(async (partnerInput: AnimalDestinyInput) => {
    await calculateCompatibility(partnerInput);
  }, [calculateCompatibility]);

  const handleSaveCard = useCallback(async () => {
    await exportCard(shareCardRef.current, `saju-guardian-${Date.now()}`);
  }, [exportCard]);

  const handleShareCard = useCallback(async () => {
    await shareCard(shareCardRef.current, `saju-guardian-${Date.now()}`);
  }, [shareCard]);

  const handleReset = useCallback(() => {
    reset();
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }, [reset]);

  const handleAnalysisBack = useCallback(() => {
    if (status !== "result") return false;
    handleReset();
    return true;
  }, [handleReset, status]);

  useEffect(() => {
    void hydrateTamagotchi();
    const handleAuthChanged = () => {
      void hydrateTamagotchi();
    };
    window.addEventListener("cd:auth-changed", handleAuthChanged);
    return () => {
      window.removeEventListener("cd:auth-changed", handleAuthChanged);
    };
  }, [hydrateTamagotchi]);

  useEffect(() => {
    if (status === "result") {
      resultSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  useBackNavigation({
    scope: "analysis",
    priority: 40,
    maxInternalBackSteps: 1,
    canGoBack: () => status === "result",
    onBack: handleAnalysisBack,
  });

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-[radial-gradient(circle_at_16%_10%,rgba(126,241,222,0.25),transparent_28%),radial-gradient(circle_at_88%_0%,rgba(255,211,108,0.24),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(255,120,170,0.16),transparent_30%),linear-gradient(145deg,#120f27_0%,#251b4b_42%,#102d3d_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.5)_0_1px,transparent_2px),radial-gradient(circle_at_72%_26%,rgba(255,255,255,0.42)_0_1px,transparent_2px),radial-gradient(circle_at_86%_78%,rgba(255,255,255,0.35)_0_1px,transparent_2px),radial-gradient(circle_at_34%_84%,rgba(255,255,255,0.28)_0_1px,transparent_2px)]" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:py-8">
        <AnimatePresence mode="wait">
          {status === "result" && animalData ? (
            <motion.div
              key="result"
              ref={resultSectionRef}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45 }}
              className="w-full"
            >
              <AnimalResultScreen
                animal={animalData}
                twelveStages={twelveStages}
                sajuResult={sajuResult}
                timeUnknown={Boolean((sajuResult as Record<string, unknown> | null)?.timeUnknown)}
                partner={partner}
                shareCardRef={shareCardRef}
                onSubmitPartner={handlePartnerSubmit}
                onSaveCard={handleSaveCard}
                onShareCard={handleShareCard}
                isExporting={isExporting}
                tamagotchi={tamagotchi}
                tamagotchiStatus={tamagotchiStatus}
                tamagotchiMessage={tamagotchiMessage}
                tamagotchiIsLoggedIn={tamagotchiIsLoggedIn}
                onCareTamagotchi={careTamagotchi}
              />
              <div className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="min-h-12 rounded-2xl border border-white/20 bg-white/12 px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition hover:bg-white/18"
                >
                  다른 생년월일로 다시 소환
                </button>
                <a
                  href="/saju"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#7ef1de]/40 bg-[#7ef1de]/14 px-5 py-3 text-sm font-black text-[#cffff7] backdrop-blur-xl transition hover:bg-[#7ef1de]/20"
                >
                  사주 메뉴로 이동
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45 }}
              className="grid flex-1 items-center gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.82fr)]"
            >
              <section className="space-y-6 py-5">
                <div className="inline-flex rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-black tracking-[0.2em] text-[#7ef1de] backdrop-blur-xl">
                  사주 가디언 아트
                </div>
                <div className="max-w-3xl">
                  <h1 className="text-balance text-4xl font-black leading-tight text-white sm:text-6xl">
                    내 사주에 숨어 있는 수호동물은?
                  </h1>
                  <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-white/72 sm:text-lg">
                    내 안에 숨어 있는 운명 수호동물을 사주 오행, 일간, 월지, 십성 흐름으로 깨워드립니다.
                    이미지는 새로 생성하지 않고 고정 2D 가디언 카드로 안정감 있게 보여드려요.
                  </p>
                </div>
                <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
                  {["오행 분석", "실루엣 등장", "카드 공개"].map((label, index) => (
                    <div key={label} className="rounded-3xl border border-white/14 bg-white/10 p-4 backdrop-blur-xl">
                      <p className="text-xs font-black text-[#ffd36c]">0{index + 1}</p>
                      <p className="mt-2 text-sm font-black text-white">{label}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="space-y-4">
                {(status === "calculating" || status === "revealing") ? (
                  <GuardianSummonLoading mode={status} />
                ) : (
                  <GuardianInputPanel
                    input={input}
                    onChange={setInput}
                    onSubmit={handleSubmit}
                    canSubmit={canSubmit}
                    isBusy={isBusy}
                    error={error}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
