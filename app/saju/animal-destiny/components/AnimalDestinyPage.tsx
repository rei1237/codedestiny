"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { m } from "framer-motion";
import { useAnimalCardExport } from "../hooks/useAnimalCardExport";
import type { AnimalDestinyInput } from "../lib/types";
import { useAnimalDestinyStore } from "../store/useAnimalDestinyStore";
import AnimalResultScreen from "./AnimalResultScreen";
import TwelveAnimalHero from "./TwelveAnimalHero";
import TwelveAnimalInputCard from "./TwelveAnimalInputCard";
import TwelveAnimalLoading from "./TwelveAnimalLoading";
import { useBackNavigation } from "@/app/hooks/useBackNavigation";

const ANIMAL_DESTINY_PAGE_SHELL_TEXT_TRANSLATIONS = {
  ko: {
    backAria: "뒤로가기",
    homeAria: "홈으로 이동",
  },
  en: {
    backAria: "Go back",
    homeAria: "Go home",
  },
  ja: {
    backAria: "戻る",
    homeAria: "ホームへ移動",
  },
} as const;

export default function AnimalDestinyPage() {
  const shellCopy = ANIMAL_DESTINY_PAGE_SHELL_TEXT_TRANSLATIONS.ko;
  const pathname = usePathname() || "/";
  const shareCardRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);
  const resultSectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  const handleReviewJourney = useCallback(() => {
    const target = status === "result" ? resultSectionRef.current : formSectionRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [status]);

  const handleAnalysisBack = useCallback(() => {
    if (status !== "result") return false;
    reset();
    return true;
  }, [reset, status]);

  const handleHeaderBack = useCallback(() => {
    if (handleAnalysisBack()) return;
    const localeMatch = pathname.match(/^\/(en|ja|zh|en-us|ja-jp|zh-cn)(?=\/|$)/i);
    const fallbackPath = localeMatch ? `/${localeMatch[1]}/saju` : "/saju";
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1" || host === "::1" || window.location.search.includes("debugSajuRedirect=1")) {
        console.warn("[saju-redirect-blocked]", {
          reason: "animal-destiny-history-back-replaced",
          pathname,
          status,
          fallbackPath,
        });
      }
    }
    router.replace(fallbackPath);
  }, [handleAnalysisBack, pathname, router, status]);

  useBackNavigation({
    scope: "analysis",
    priority: 40,
    maxInternalBackSteps: 1,
    canGoBack: () => status === "result",
    onBack: handleAnalysisBack,
  });

  return (
    <main className="relative min-h-[100dvh] w-full min-w-0 overflow-x-hidden bg-[radial-gradient(circle_at_10%_12%,rgba(250,224,177,0.45),transparent_34%),radial-gradient(circle_at_84%_8%,rgba(234,193,133,0.24),transparent_31%),radial-gradient(circle_at_48%_90%,rgba(215,165,102,0.2),transparent_33%),linear-gradient(180deg,#fff8ea_0%,#fdf1dc_52%,#fae7c5_100%)] text-[#4d311a]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(128deg,transparent_0%,rgba(255,255,255,0.42)_38%,transparent_66%)]" />

      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#d7b792]/60 bg-[#fff7e7]/88 px-4 py-4 backdrop-blur-xl sm:px-6">
        <button 
          onClick={handleHeaderBack}
          className="-ml-1 rounded-full border border-transparent p-2 text-[#6b3f1d] transition-all hover:border-[#8a5a2b]/35 hover:bg-[#f4e3c7]"
          aria-label={shellCopy.backAria}
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
          aria-label={shellCopy.homeAria}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.2 12 4l9 7.2" />
            <path d="M5.2 10.7V20h13.6v-9.3" />
          </svg>
        </a>
      </header>

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-5xl pb-16">
        <TwelveAnimalHero onStart={handleStartJourney} onReview={handleReviewJourney} />

        <div ref={formSectionRef} className="min-w-0 space-y-8 px-5 sm:px-6">
          {(status === "idle" || status === "input" || status === "error") ? (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <TwelveAnimalInputCard
                input={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                isBusy={false}
                canSubmit={canSubmit}
                error={error}
              />
            </m.div>
          ) : null}

          {status === "calculating" ? <TwelveAnimalLoading mode="calculating" /> : null}
          {status === "revealing" ? <TwelveAnimalLoading mode="revealing" /> : null}

          <div ref={resultSectionRef} className="min-w-0">
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
          </div>

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
                href="/saju/"
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
