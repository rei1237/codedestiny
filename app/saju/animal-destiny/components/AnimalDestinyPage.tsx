"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { fetchBillingBalance, runBillingCoinGate } from "@/app/_lib/billing-client";
import { useAnimalCardExport } from "../hooks/useAnimalCardExport";
import type { AnimalDestinyInput } from "../lib/types";
import { useAnimalDestinyStore } from "../store/useAnimalDestinyStore";
import AnimalDestinyInputForm from "./AnimalDestinyInputForm";
import AnimalDestinyIntro from "./AnimalDestinyIntro";
import AnimalResultScreen from "./AnimalResultScreen";
import AnimalRevealAnimation from "./AnimalRevealAnimation";
import TamagotchiDeviceFrame from "./TamagotchiDeviceFrame";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,#203f73_0%,transparent_38%),radial-gradient(circle_at_88%_10%,#5a2a6d_0%,transparent_32%),linear-gradient(160deg,#020711_0%,#081a3c_40%,#07142f_100%)] px-4 py-6 md:py-8">
      <Toaster position="top-center" richColors />
      <TamagotchiDeviceFrame>
        <div className="space-y-4">
          <AnimalDestinyIntro />

          <div className="rounded-xl border border-cyan-100/25 bg-cyan-100/10 px-3 py-2 text-xs font-semibold text-cyan-100">
            {isUnlocked
              ? "해금 상태: 사용 가능"
              : "해금 상태: 잠금 (100코인)"}
            {isLoggedIn ? " · 로그인 인증됨" : " · 로그인 필요"}
          </div>

          {(status === "idle" || status === "input" || status === "error") ? (
            <AnimalDestinyInputForm
              input={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              isBusy={isUnlocking}
              canSubmit={canSubmit}
            />
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
            <div className="rounded-xl border border-rose-200/35 bg-rose-200/10 p-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={reset}
              className="rounded-full bg-cyan-100/15 px-4 py-2 text-xs font-bold text-cyan-50"
            >
              다시 시작
            </button>
            <a
              href="/saju"
              className="rounded-full border border-cyan-100/30 bg-white/10 px-4 py-2 text-xs font-bold text-cyan-50"
            >
              사주 메인으로 복귀
            </a>
          </div>
        </div>
      </TamagotchiDeviceFrame>
    </main>
  );
}
