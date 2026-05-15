"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { fetchBillingBalance, runBillingCoinGate } from "@/app/_lib/billing-client";
import { useAnimalCardExport } from "../hooks/useAnimalCardExport";
import type { AnimalDestinyInput } from "../lib/types";
import { useAnimalDestinyStore } from "../store/useAnimalDestinyStore";
import AnimalDestinyInputForm from "./AnimalDestinyInputForm";
import AnimalDestinyHero from "./AnimalDestinyHero";
import AnimalResultScreen from "./AnimalResultScreen";
import AnimalRevealAnimation from "./AnimalRevealAnimation";

const FEATURE_KEY = "animal-destiny-unlock";
const UNLOCK_REASON = "십이운성 동물점 해금";

export default function AnimalDestinyPage() {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    fetchBillingBalance()
      .then((res) => {
        if (!mounted || !res.ok || !res.data) return;
        setIsLoggedIn(Boolean(res.data.authenticated));
        setIsUnlocked(Boolean(res.data.unlockMap?.[FEATURE_KEY]));
      })
      .catch(() => {
        if (!mounted) return;
        setIsLoggedIn(false);
        setIsUnlocked(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const ensureUnlock = useCallback(async () => {
    if (isUnlocked) return true;

    setIsUnlocking(true);
    try {
      const balance = await fetchBillingBalance();
      if (!balance.ok || !balance.data?.authenticated) {
        toast.error("해금에는 로그인이 필요합니다.");
        return false;
      }

      if (balance.data.unlockMap?.[FEATURE_KEY]) {
        setIsUnlocked(true);
        return true;
      }

      const result = await runBillingCoinGate({
        featureKey: FEATURE_KEY,
        reason: UNLOCK_REASON,
        forceDeduct: false,
        requestId: `animal-destiny-unlock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      if (!result.ok) {
        if (result.error?.code === "INSUFFICIENT_COINS") {
          toast.error("코인이 부족합니다. 100코인 후 다시 시도해 주세요.");
          return false;
        }
        if (result.error?.code === "AUTH_REQUIRED") {
          toast.error("로그인이 필요합니다.");
          return false;
        }
        toast.error(result.error?.message || "해금 결제에 실패했습니다.");
        return false;
      }

      setIsUnlocked(true);
      toast.success("십이운성 동물점이 100코인으로 해금되었습니다.");
      return true;
    } finally {
      setIsUnlocking(false);
    }
  }, [isUnlocked]);

  const handleSubmit = useCallback(async () => {
    const ok = await ensureUnlock();
    if (!ok) return;
    await calculate();
  }, [ensureUnlock, calculate]);

  const handlePartnerSubmit = useCallback(async (partnerInput: AnimalDestinyInput) => {
    await calculateCompatibility(partnerInput);
  }, [calculateCompatibility]);

  const handleSaveCard = useCallback(async () => {
    await exportCard(shareCardRef.current, `animal-destiny-${Date.now()}`);
  }, [exportCard]);

  const handleShareCard = useCallback(async () => {
    await shareCard(shareCardRef.current, `animal-destiny-${Date.now()}`);
  }, [shareCard]);

  return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-[linear-gradient(180deg,#f7f4ea_0%,#f8fbff_42%,#eef5ff_100%)] text-[#1f3550] font-sans">
      <Toaster position="top-center" richColors />
      
      {/* Premium Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#d8c7a4]/45 bg-[#f8f4e8]/85 px-6 py-4 backdrop-blur-xl">
        <button 
          onClick={() => window.history.back()}
          className="-ml-2 rounded-full p-2 text-[#2c4d67] transition-colors hover:bg-[#2c4d67]/10"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#1f4967]">Animal Destiny</h2>
          <div className="mt-0.5 h-0.5 w-8 bg-[#ca9732]" />
        </div>
        <button 
          onClick={reset}
          className="-mr-2 rounded-full p-2 text-[#2c4d67] transition-colors hover:bg-[#2c4d67]/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </header>

      <div className="mx-auto max-w-5xl pb-20">
        <AnimalDestinyHero />

        <div className="space-y-8 px-6">
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#d7c8a8] bg-white/75 px-4 py-2 text-xs font-bold text-[#35526e]">
            <div className={`h-2 w-2 rounded-full ${isUnlocked ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            {isUnlocked
              ? "프리미엄 해금 상태: 모든 분석 결과를 볼 수 있습니다."
              : "해금 상태: 잠금 (분석을 위해 100코인이 필요합니다)"}
            {!isLoggedIn && " · 로그인이 필요합니다"}
          </div>

          {(status === "idle" || status === "input" || status === "error") ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AnimalDestinyInputForm
                input={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                isBusy={isUnlocking}
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
                className="w-full rounded-2xl border border-[#b6c8d9] bg-white py-4 font-bold text-[#234664] transition-all hover:bg-[#f4f9ff]"
              >
                다른 생년월일로 테스트하기
              </button>
              <a
                href="/saju"
                className="w-full rounded-2xl border border-[#d8b46d] py-4 text-center font-bold text-[#825f18] transition-all hover:bg-[#fff3da]"
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
