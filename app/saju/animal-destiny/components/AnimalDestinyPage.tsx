"use client";

import { motion } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";
import { useAnimalCardExport } from "../hooks/useAnimalCardExport";
import type { AnimalDestinyInput } from "../lib/types";
import { useAnimalDestinyStore } from "../store/useAnimalDestinyStore";
import AnimalDestinyInputForm from "./AnimalDestinyInputForm";
import AnimalDestinyHero from "./AnimalDestinyHero";
import AnimalResultScreen from "./AnimalResultScreen";
import AnimalRevealAnimation from "./AnimalRevealAnimation";

export default function AnimalDestinyPage() {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);

  const {
    status,
    input,
    sajuResult,
    animalData,
    twelveStages,
    partner,
    error,
    setInput,
    calculate,
    calculateCompatibility,
    reset,
  } = useAnimalDestinyStore();

  const { isExporting, exportCard, shareCard } = useAnimalCardExport();

  const canSubmit = useMemo(() => Boolean(input.birthDate), [input.birthDate]);

  const handleSubmit = useCallback(async () => {
    await calculate();
  }, [calculate]);

  const handlePartnerSubmit = useCallback(async (partnerInput: AnimalDestinyInput) => {
    await calculateCompatibility(partnerInput);
  }, [calculateCompatibility]);

  const handleSaveCard = useCallback(async () => {
    await exportCard(shareCardRef.current, `animal-destiny-${Date.now()}`);
  }, [exportCard]);

  const handleShareCard = useCallback(async () => {
    await shareCard(shareCardRef.current, `animal-destiny-${Date.now()}`);
  }, [shareCard]);

  const handleStartJourney = useCallback(() => {
    formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[radial-gradient(circle_at_10%_12%,rgba(250,224,177,0.45),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(234,193,133,0.24),transparent_31%),radial-gradient(circle_at_48%_90%,rgba(215,165,102,0.2),transparent_33%),linear-gradient(180deg,#fff8ea_0%,#fdf1dc_52%,#fae7c5_100%)] text-[#4d311a]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(128deg,transparent_0%,rgba(255,255,255,0.42)_38%,transparent_66%)]" />

      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#d7b792]/60 bg-[#fff7e7]/88 px-4 py-4 backdrop-blur-xl sm:px-6">
        <button 
          onClick={() => window.history.back()}
          className="-ml-1 rounded-full border border-transparent p-2 text-[#6b3f1d] transition-all hover:border-[#8a5a2b]/35 hover:bg-[#f4e3c7]"
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8a5a2b]">Saju Animal Oracle</h2>
          <p className="mt-1 text-sm font-black tracking-tight text-[#6b3f1d]">사주 십이운성 동물점</p>
        </div>
        <a
          href="/"
          className="-mr-1 inline-flex items-center justify-center rounded-full border border-transparent p-2 text-[#6b3f1d] transition-all hover:border-[#8a5a2b]/35 hover:bg-[#f4e3c7]"
          aria-label="홈으로 이동"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.2 12 4l9 7.2" />
            <path d="M5.2 10.7V20h13.6v-9.3" />
          </svg>
        </a>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl pb-16">
        {status !== "result" ? <AnimalDestinyHero onStart={handleStartJourney} /> : null}

        <div ref={formSectionRef} className="space-y-8 px-5 sm:px-6">
          {(status === "idle" || status === "input" || status === "error") ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AnimalDestinyInputForm
                input={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                isBusy={false}
                canSubmit={canSubmit}
              />
            </motion.div>
          ) : null}

          {status === "calculating" ? <AnimalRevealAnimation mode="calculating" /> : null}
          {status === "revealing" ? <AnimalRevealAnimation mode="revealing" /> : null}

          {status === "result" && animalData ? (
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
            />
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-50 p-5 text-center text-sm text-rose-700 backdrop-blur-sm">
              {error}
            </div>
          ) : null}

          {(status === "result") && (
            <div className="flex flex-col gap-3 pt-8">
              <button
                onClick={reset}
                className="h-12 w-full rounded-2xl border border-[#d7b792] bg-white py-3 font-bold text-[#6b3f1d] transition-all hover:bg-[#fff7ea]"
              >
                다른 생년월일로 테스트하기
              </button>
              <a
                href="/saju"
                className="h-12 w-full rounded-2xl border border-[#d7b792] bg-[linear-gradient(180deg,#fff9ed,#fdeccc)] py-3 text-center font-bold text-[#8a5a2b] transition-all hover:brightness-[1.02]"
              >
                사주 운세 메인으로
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
