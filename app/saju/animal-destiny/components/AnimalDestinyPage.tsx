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
const DESTINY_MEETING_PREFILL_KEY = "cd.destinyMeetingPlace.prefill.v1";

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

  const handleOpenMeetingPlace = useCallback(() => {
    try {
      const prefill = {
        name: input.name || "",
        birthDate: input.birthDate || "",
        birthTime: input.birthTime || "",
        gender: input.gender || "unknown",
        calendarType: input.calendarType || "solar",
        lunarLeap: Boolean(input.lunarLeap),
      };
      sessionStorage.setItem(DESTINY_MEETING_PREFILL_KEY, JSON.stringify(prefill));
    } catch {
      // ignore session storage failures
    }
    window.location.assign("/saju/destiny-meeting-place");
  }, [input]);

  return (
    <main className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[radial-gradient(circle_at_14%_10%,rgba(255,230,177,0.26),transparent_33%),radial-gradient(circle_at_80%_8%,rgba(206,166,255,0.28),transparent_35%),radial-gradient(circle_at_50%_86%,rgba(255,186,220,0.24),transparent_36%),linear-gradient(178deg,#f7ecff_0%,#fef8ea_54%,#f6eeff_100%)] text-[#3a2460]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,transparent_0%,rgba(255,255,255,0.5)_36%,transparent_62%)]" />
      <Toaster position="top-center" richColors />
      
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#d9c5f8]/60 bg-[#fff8ef]/78 px-4 py-4 backdrop-blur-xl sm:px-6">
        <button 
          onClick={() => window.history.back()}
          className="-ml-1 rounded-full border border-transparent p-2 text-[#67338e] transition-all hover:border-[#67338e]/20 hover:bg-[#67338e]/10"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-[#7b4fa4]">Celestial Animal Test</h2>
          <p className="mt-1 text-sm font-black tracking-tight text-[#512479]">십이운성 동물점</p>
        </div>
        <button 
          onClick={reset}
          className="-mr-1 rounded-full border border-transparent p-2 text-[#67338e] transition-all hover:border-[#67338e]/20 hover:bg-[#67338e]/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </header>

      <div className="relative z-10 mx-auto max-w-5xl pb-20">
        <AnimalDestinyHero />

        <div className="space-y-8 px-6">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#e3d1ff] bg-white/75 px-4 py-3 text-xs font-bold text-[#5b3b7f] shadow-[0_10px_24px_rgba(116,78,178,0.14)]">
            <span className={`h-2 w-2 rounded-full ${isUnlocked ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span>
              {isUnlocked
                ? "프리미엄 해금 상태: 모든 분석 결과를 볼 수 있습니다."
                : "해금 상태: 잠금 (분석을 위해 100코인이 필요합니다)"}
            </span>
            <span className="rounded-full bg-[#ffecc3] px-2.5 py-1 text-[11px] font-black text-[#8b6116]">100 COINS</span>
            {!isLoggedIn ? <span className="text-rose-600">로그인이 필요합니다</span> : null}
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
                className="w-full rounded-2xl border border-[#cfb8f0] bg-white py-4 font-bold text-[#53307b] transition-all hover:bg-[#faf4ff]"
              >
                다른 생년월일로 테스트하기
              </button>
              <a
                href="/saju"
                className="w-full rounded-2xl border border-[#e2c17a] bg-[linear-gradient(180deg,#fffdf6,#fff3da)] py-4 text-center font-bold text-[#825f18] transition-all hover:brightness-[1.02]"
              >
                사주 운세 메인으로
              </a>
            </div>
          )}

          <section
            id="destiny-meeting-place-entry"
            className="overflow-hidden rounded-[2rem] border border-[#d6c6f3] bg-[linear-gradient(148deg,rgba(34,23,67,0.92),rgba(48,26,92,0.9),rgba(20,33,76,0.92))] p-5 text-white shadow-[0_24px_48px_rgba(20,9,46,0.45)]"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffd58c]">Independent Experience</p>
            <h3 className="mt-2 text-2xl font-black">사주로 보는 인연의 장소</h3>
            <p className="mt-2 text-sm text-[#e7ddff]">
              인연의 장소 리포트는 이제 독립 페이지에서 실행됩니다. 동물점 입력값을 자동으로 이어받아 바로 분석할 수 있어요.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/20">
              <img
                src="/fuctionassets/%EC%82%AC%EC%A3%BC%EB%A1%9C%EB%B3%B4%EB%8A%94%20%EC%9D%B8%EC%97%B0%EC%9D%98%20%EC%9E%A5%EC%86%8C.webp"
                alt="사주로 보는 인연의 장소"
                loading="lazy"
                decoding="async"
                className="h-[165px] w-full object-cover sm:h-[220px]"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenMeetingPlace}
              className="mt-4 w-full rounded-2xl bg-[linear-gradient(90deg,#ff9cd6,#8767ff,#6ca9ff)] py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(18,15,46,0.42)] transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              독립 페이지에서 인연의 장소 분석하기
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
