"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { holdPaidFeatureGateOpen, openPaidFeatureGate, releasePaidFeatureGate, runPaidAccessGate, updatePaidFeatureGate } from "@/app/_lib/billing-client";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";
import { getAuthState } from "@/app/_lib/auth-store";
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";
import { formatBirthDateDigits, normalizeBirthDateFromDigits } from "@/lib/birthDateInput";
import DestinyMeetingPlaceLoading from "@/components/fortune/destiny-meeting-place/DestinyMeetingPlaceLoading";
import DestinyMeetingPlaceResult from "@/components/fortune/destiny-meeting-place/DestinyMeetingPlaceResult";
import { generateDestinyMeetingPlaceResult } from "@/components/fortune/destiny-meeting-place/destinyMeetingPlaceEngine";
import {
  PREMIUM_DESTINY_MEETING_PLACE_DEMO,
  premiumNarrativeToResult,
} from "@/components/fortune/destiny-meeting-place/destinyMeetingPlacePremiumDemo";
import type { DestinyMeetingPlaceResult as MeetingResult } from "@/components/fortune/destiny-meeting-place/destinyMeetingPlaceTypes";
import { useDestinyMeetingPlaceCopy } from "../_lib/copy";

const FEATURE_KEY = "destiny_meeting_place";
// 가격은 서버 가격표에서 읽는다(하드코딩하면 인상·인하 때 결제창과 청구액이 조용히 갈라진다).
// 정본: worker/lib/paid-feature-registry.js → destiny_meeting_place = 100코인 / 10,000원
const FEATURE_PRICING = resolveServerFeaturePricing({ featureKey: FEATURE_KEY });
const FEATURE_COST = FEATURE_PRICING?.cost ?? 0;
const FEATURE_AMOUNT_KRW = FEATURE_PRICING?.amountKRW ?? 0;
const HERO_IMAGE = "/fuctionassets/%EC%82%AC%EC%A3%BC%EB%A1%9C%EB%B3%B4%EB%8A%94%20%EC%9D%B8%EC%97%B0%EC%9D%98%20%EC%9E%A5%EC%86%8C.webp";
const PREFILL_KEY = "cd.destinyMeetingPlace.prefill.v1";
const HERO_HIGHLIGHT_CLASS: Record<"place" | "time" | "mood", string> = {
  place: "text-[#ffdca7]",
  time: "text-[#bfe6ff]",
  mood: "text-[#ffccf0]",
};

// 코인가에 100을 곱하지 않는다 — 환산은 서버 가격표가 이미 끝냈고(amountKRW), 여기서 다시 곱하면
// 100원 환율이 바뀌는 날 표시가만 조용히 어긋난다.
function sanitizeAmountKRW(amountKRW: number) {
  return Math.max(0, Math.floor(Number(amountKRW || 0)));
}

const INITIAL_INPUT: AnimalDestinyInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  gender: "unknown",
  calendarType: "solar",
  lunarLeap: false,
};

type AnalysisMeta = {
  dayMaster: string;
  representativeStage: string;
  source: string;
  warning: string;
  timeUnknown: boolean;
};

function getDayMasterLabel(sajuResult: Record<string, unknown>, copy: ReturnType<typeof useDestinyMeetingPlaceCopy>) {
  const dayStem = String(sajuResult.dayStem || "").trim();
  return dayStem ? `${dayStem} ${copy.dayMasterSuffix}` : copy.infoPendingLabel;
}

export default function DestinyMeetingPlacePage() {
  const router = useRouter();
  const copy = useDestinyMeetingPlaceCopy();
  const [input, setInput] = useState<AnimalDestinyInput>(INITIAL_INPUT);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [meta, setMeta] = useState<AnalysisMeta | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [chargedCoins, setChargedCoins] = useState(FEATURE_COST);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPremiumDemo, setShowPremiumDemo] = useState(false);

  const isLunar = (input.calendarType || "solar") === "lunar";
  const canSubmit = useMemo(() => Boolean(input.birthDate), [input.birthDate]);
  const demoResult = useMemo(() => premiumNarrativeToResult(PREMIUM_DESTINY_MEETING_PLACE_DEMO), []);
  const visibleResult = result || (showPremiumDemo ? demoResult : null);

  useEffect(() => {
    let mounted = true;

    setIsLoggedIn(getAuthState().isAuthenticated);

    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "1") {
        setShowPremiumDemo(true);
      }

      const raw = sessionStorage.getItem(PREFILL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AnimalDestinyInput>;
        setInput((prev) => ({
          ...prev,
          ...parsed,
        }));
        sessionStorage.removeItem(PREFILL_KEY);
      }
    } catch (e) {
      // ignore bad session payload
    }

    return () => {
      mounted = false;
    };
  }, []);

  const setPatch = useCallback((patch: Partial<AnimalDestinyInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (isLoading || isCharging) return;
    if (!input.birthDate) {
      toast.error(copy.toastNeedBirthDate);
      return;
    }

    setError("");
    setResult(null);
    setMeta(null);

    const requestId = `destiny-meeting-place:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    setIsCharging(true);
    try {
      const { resolveAnimalTwelveResult } = await import("@/app/saju/animal-destiny/lib/sajuAdapter");
      const resolved = await resolveAnimalTwelveResult(input);
      if (!resolved.ok || !resolved.sajuResult) {
        const message = resolved.error || copy.sajuCalcFailed;
        updatePaidFeatureGate({ featureKey: FEATURE_KEY, requestId, status: "error", message });
        setError(message);
        toast.error(message);
        return;
      }

      openPaidFeatureGate({
        featureKey: FEATURE_KEY,
        requestId,
        cost: FEATURE_COST,
        paymentMode: "pass",
        message: copy.gateCheckingPass,
      });
      // 확인 완료 후 다음 화면(생성 로딩/결과)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
      // release는 아래 setIsLoading(true) 및 finally에서 호출한다(안전장치 상한 8초).
      holdPaidFeatureGateOpen({ requestId, maxMs: 8000 });

      // 🔴 가격을 반드시 함께 넘긴다. 예전 주석은 "클라이언트 cost 를 넘기면 서버 이용권 프로브를
      // 건너뛴다"며 이 세 줄을 지웠는데, 그 서술은 틀렸다 — cost 는 프로브를 끄는 것이 아니라
      // 스냅샷 판정(js/core/pass-verdict.js resolveVerdict)을 **켜는** 입력이고, 빼면
      // resolveVerdict 가 cost<=0 에서 즉시 반환해 판정 자체가 사라진다. 실제 결과는
      // 결제창 금액 **0원** + 월정석 카드 영구 비활성이었다(월정석 비용이 coinPrice*10=0).
      const gate = await runPaidAccessGate({
        featureKey: FEATURE_KEY,
        reason: copy.gateReason,
        requestId,
        cost: FEATURE_COST,
        coinPrice: FEATURE_COST,
        amountKRW: FEATURE_AMOUNT_KRW,
      });

      if (!gate.ok) {
        const code = String(gate.error?.code || "").toUpperCase();
        if (code === "INSUFFICIENT_COINS") {
          toast.error(copy.toastPaymentRequired);
          return;
        }
        if (code === "AUTH_REQUIRED") {
          toast.error(copy.toastLoginRequired);
          return;
        }
        toast.error(gate.error?.message || copy.paymentConfirmFailed);
        return;
      }

      const consume = gate.data?.consume as Record<string, unknown> | undefined;
      const pricingCost = Number(gate.data?.pricing?.coinPrice ?? gate.data?.pricing?.cost ?? FEATURE_COST);
      const charged = Number(consume?.chargedCoins ?? consume?.cost ?? consume?.coinPrice ?? pricingCost);
      setChargedCoins(Number.isFinite(charged) && charged > 0 ? charged : pricingCost);

      setIsLoading(true);
      // 다음 화면(생성 로딩)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
      releasePaidFeatureGate(requestId);
      await new Promise((resolve) => setTimeout(resolve, 900));

      const next = generateDestinyMeetingPlaceResult(resolved.sajuResult);
      const root = resolved.sajuResult as Record<string, unknown>;

      setResult(next);
      setMeta({
        dayMaster: getDayMasterLabel(root, copy),
        representativeStage: String(resolved.representativeStage?.labelKo || copy.infoPendingLabel),
        source: resolved.source,
        warning: String(resolved.warning || ""),
        timeUnknown: Boolean(root.timeUnknown),
      });

      toast.success(copy.toastReportReady);
    } finally {
      // 실패로 조기 반환한 경로 등 모든 종료 경로에서 hold를 확실히 해제(안전장치).
      releasePaidFeatureGate(requestId);
      setIsCharging(false);
      setIsLoading(false);
    }
  }, [copy, input, isCharging, isLoading]);

  const handleReset = useCallback(() => {
    setInput(INITIAL_INPUT);
    setResult(null);
    setMeta(null);
    setError("");
  }, []);

  const handleBack = useCallback(() => {
    const canDebug = (() => {
      if (typeof window === "undefined") return false;
      const host = window.location.hostname;
      return host === "localhost" || host === "127.0.0.1" || host === "::1" || window.location.search.includes("debugSajuRedirect=1");
    })();

    if (isLoading || isCharging) {
      if (canDebug) {
        console.warn("[saju-redirect-blocked]", {
          reason: "destiny-meeting-place-loading-back-blocked",
          pathname: window.location.pathname,
          isLoading,
          isCharging,
        });
      }
      return;
    }

    if (visibleResult || error) {
      setResult(null);
      setMeta(null);
      setError("");
      setShowPremiumDemo(false);
      if (canDebug) {
        console.warn("[saju-redirect-blocked]", {
          reason: "destiny-meeting-place-back-reset-internal-state",
          pathname: window.location.pathname,
          hasResult: Boolean(visibleResult),
          hasError: Boolean(error),
        });
      }
      return;
    }

    if (canDebug) {
      console.warn("[saju-redirect-blocked]", {
        reason: "destiny-meeting-place-history-back-replaced",
        pathname: window.location.pathname,
        fallbackPath: "/saju",
      });
    }
    router.replace("/saju");
  }, [error, isCharging, isLoading, router, visibleResult]);

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_10%_12%,rgba(255,164,216,0.28),transparent_34%),radial-gradient(circle_at_88%_4%,rgba(101,212,255,0.3),transparent_30%),radial-gradient(circle_at_52%_92%,rgba(126,108,255,0.24),transparent_36%),linear-gradient(168deg,#050617_0%,#171038_45%,#2a0f47_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(255,255,255,0.13),transparent_38%),radial-gradient(circle_at_74%_68%,rgba(255,255,255,0.08),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.56)_0.9px,transparent_0.9px)] [background-size:3px_3px]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-48 w-48 rounded-full bg-[#80d8ff]/20 blur-3xl motion-safe:animate-pulse" />
      <div className="pointer-events-none absolute -right-20 top-48 h-56 w-56 rounded-full bg-[#ff9be7]/18 blur-3xl motion-safe:animate-pulse" />
      <Toaster position="top-center" richColors />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-4 sm:px-6 sm:pt-6">
          <button
            type="button"
            onClick={handleBack}
            className="pointer-events-auto rounded-full border border-[#b7dbff]/35 bg-white/10 p-2 text-white transition-all hover:bg-white/20"
            aria-label={copy.backAria}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="pointer-events-auto rounded-full border border-[#b7dbff]/35 bg-white/10 p-2 text-white transition-all hover:bg-white/20"
            aria-label={copy.resetAria}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </div>

      <header hidden className="sticky top-0 z-40 border-b border-[#92cbff]/30 bg-[#0a0a2b]/74 px-4 py-4 shadow-[0_10px_32px_rgba(3,6,20,0.45)] backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <button
            onClick={handleBack}
            className="rounded-full border border-[#b7dbff]/35 bg-white/10 p-2 text-white transition-all hover:bg-white/20"
            aria-label={copy.backAria}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ffd88a] [text-shadow:0_0_12px_rgba(255,212,138,0.7)]">Destiny Meeting Place</p>
            <h2 className="mt-1 text-sm font-black tracking-tight text-white [text-shadow:0_0_18px_rgba(146,209,255,0.55)] sm:text-base">{copy.pageTitle}</h2>
          </div>
          <button
            onClick={handleReset}
            className="rounded-full border border-[#b7dbff]/35 bg-white/10 p-2 text-white transition-all hover:bg-white/20"
            aria-label={copy.resetAria}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 pb-20 pt-6 sm:px-6">
        <section className="overflow-hidden rounded-[2rem] border border-[#8fcfff]/35 bg-[#150f38]/70 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_26px_58px_rgba(5,7,24,0.6)] backdrop-blur-sm">
          <div className="relative h-[220px] sm:h-[300px]">
            <img
              src={HERO_IMAGE}
              alt={copy.heroImageAlt}
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,24,0.08)_20%,rgba(6,7,24,0.82)_100%)]" />
            <div className="absolute left-4 top-4 rounded-full border border-[#ffd88a]/70 bg-[#160b2f]/82 px-4 py-2 text-xs font-black text-[#fff4d6] shadow-[0_12px_28px_rgba(0,0,0,0.34),0_0_24px_rgba(255,216,138,0.2)] backdrop-blur-md">
              {copy.onceBadge(copy.currency(sanitizeAmountKRW(FEATURE_AMOUNT_KRW)))}
            </div>
            <div className="absolute right-4 top-4 hidden rounded-full border border-[#bce6ff]/45 bg-[#0b122f]/65 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#cff0ff] [text-shadow:0_0_10px_rgba(161,230,255,0.8)] sm:block">
              Pass · Single · Moonlight
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <div className="max-w-3xl rounded-2xl border border-white/20 bg-[linear-gradient(140deg,rgba(6,10,32,0.9),rgba(17,19,48,0.7))] p-4 shadow-[0_18px_40px_rgba(4,6,20,0.62)] backdrop-blur-[2px] sm:p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffd88a] [text-shadow:0_0_10px_rgba(255,216,138,0.62)]">Night Sky Oracle</p>
                <h2 className="mt-2 max-w-2xl text-[1.85rem] font-black leading-[1.18] tracking-[-0.01em] text-white [text-shadow:0_3px_18px_rgba(5,11,26,0.9)] sm:text-[2.45rem]">{copy.heroHeading}</h2>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-[#f5eeff] [text-shadow:0_1px_10px_rgba(8,11,30,0.65)]">
                  {copy.heroDescriptionParts.map((part, index) =>
                    part.highlight ? (
                      <span key={index} className={HERO_HIGHLIGHT_CLASS[part.highlight]}>
                        {part.text}
                      </span>
                    ) : (
                      <span key={index}>{part.text}</span>
                    )
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#ffd4a5]/45 bg-[linear-gradient(160deg,rgba(20,15,56,0.92),rgba(26,16,64,0.9))] p-5 shadow-[0_20px_48px_rgba(8,9,32,0.5)] sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full border border-[#ffd88a]/45 bg-[#ffd88a]/15 px-3 py-1 text-[#ffe9bb]">{copy.onceBadge(copy.currency(sanitizeAmountKRW(FEATURE_AMOUNT_KRW)))}</span>
            <span className="rounded-full border border-[#c8f7dc]/45 bg-[#6ee7a7]/14 px-3 py-1 text-[#ddffe9]">{copy.badgePassCheck}</span>
            <span className="rounded-full border border-[#ffb4e6]/45 bg-[#ff9dd9]/15 px-3 py-1 text-[#ffd6ef]">{copy.badgeMood}</span>
            <span className="rounded-full border border-[#9fd0ff]/45 bg-[#81bbff]/14 px-3 py-1 text-[#d6ebff]">{copy.badgeCombo}</span>
            {!isLoggedIn ? <span className="rounded-full border border-rose-200/40 bg-rose-400/15 px-3 py-1 text-rose-100">{copy.badgeLoginRequired}</span> : null}
          </div>

          <div className="mb-6 grid gap-3 text-sm md:grid-cols-3">
            <article className="rounded-2xl border border-[#b9e2ff]/25 bg-[#0f1233]/45 p-3 text-[#e9f3ff]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#b9e2ff]">01 Place Signal</p>
              <p className="mt-1 font-semibold leading-relaxed">{copy.signalPlaceDesc}</p>
            </article>
            <article className="rounded-2xl border border-[#ffd6a9]/25 bg-[#16113b]/45 p-3 text-[#fff0d4]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffdca8]">02 Timing Window</p>
              <p className="mt-1 font-semibold leading-relaxed">{copy.signalTimingDesc}</p>
            </article>
            <article className="rounded-2xl border border-[#f7b8f0]/25 bg-[#20123f]/45 p-3 text-[#ffe8fb]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffc8f5]">03 Mood Styling</p>
              <p className="mt-1 font-semibold leading-relaxed">{copy.signalMoodDesc}</p>
            </article>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[#f6ecff]">
              {copy.formNameLabel}
              <input
                value={input.name || ""}
                onChange={(event) => setPatch({ name: event.target.value.slice(0, 24) })}
                placeholder={copy.namePlaceholder}
                className="w-full rounded-2xl border border-white/28 bg-[#ffffff12] px-4 py-3 text-base text-[#fefcff] placeholder:text-[#cfc7ea] focus:border-[#ffd88a] focus:outline-none focus:ring-2 focus:ring-[#ffd88a]/35"
              />
              <span className="block text-[11px] font-medium text-[#d7d1ee]">{copy.formNameHelper}</span>
            </label>

            <label className="space-y-2 text-sm font-bold text-[#f6ecff]">
              {copy.formBirthDateLabel} <span className="text-rose-300">*</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                pattern="[0-9]{8}"
                placeholder="YYYYMMDD"
                value={formatBirthDateDigits(input.birthDate)}
                onChange={(event) => setPatch({ birthDate: normalizeBirthDateFromDigits(event.target.value) })}
                className="w-full rounded-2xl border border-white/28 bg-[#ffffff12] px-4 py-3 text-base text-[#fefcff] focus:border-[#ffd88a] focus:outline-none focus:ring-2 focus:ring-[#ffd88a]/35"
              />
              <span className="block text-[11px] font-medium text-[#d7d1ee]">{copy.formBirthDateHelper}</span>
            </label>

            <label className="space-y-2 text-sm font-bold text-[#f6ecff]">
              {copy.formCalendarTypeLabel}
              <select
                value={input.calendarType || "solar"}
                onChange={(event) => setPatch({ calendarType: event.target.value as AnimalDestinyInput["calendarType"] })}
                className="w-full rounded-2xl border border-white/28 bg-[#ffffff12] px-4 py-3 text-base text-[#fefcff] focus:border-[#ffd88a] focus:outline-none focus:ring-2 focus:ring-[#ffd88a]/35"
              >
                <option value="solar" className="text-black">{copy.calendarSolar}</option>
                <option value="lunar" className="text-black">{copy.calendarLunar}</option>
              </select>
              <span className="block text-[11px] font-medium text-[#d7d1ee]">{copy.formCalendarHelper}</span>
            </label>

            <label className="space-y-2 text-sm font-bold text-[#f6ecff]">
              {copy.formBirthTimeLabel}
              <input
                type="time"
                value={input.birthTime || ""}
                onChange={(event) => setPatch({ birthTime: event.target.value })}
                className="w-full rounded-2xl border border-white/28 bg-[#ffffff12] px-4 py-3 text-base text-[#fefcff] focus:border-[#ffd88a] focus:outline-none focus:ring-2 focus:ring-[#ffd88a]/35"
              />
              <span className="block text-[11px] font-medium text-[#d7d1ee]">{copy.formBirthTimeHelper}</span>
            </label>

            <label className="space-y-2 text-sm font-bold text-[#f6ecff]">
              {copy.formGenderLabel}
              <select
                value={input.gender}
                onChange={(event) => setPatch({ gender: event.target.value as AnimalDestinyInput["gender"] })}
                className="w-full rounded-2xl border border-white/28 bg-[#ffffff12] px-4 py-3 text-base text-[#fefcff] focus:border-[#ffd88a] focus:outline-none focus:ring-2 focus:ring-[#ffd88a]/35"
              >
                <option value="unknown" className="text-black">{copy.genderUnknown}</option>
                <option value="female" className="text-black">{copy.genderFemale}</option>
                <option value="male" className="text-black">{copy.genderMale}</option>
              </select>
              <span className="block text-[11px] font-medium text-[#d7d1ee]">{copy.formGenderHelper}</span>
            </label>

            {isLunar ? (
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-[#f5ecff] md:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(input.lunarLeap)}
                  onChange={(event) => setPatch({ lunarLeap: event.target.checked })}
                  className="h-5 w-5 accent-[#ffc062]"
                />
                {copy.lunarLeapLabel}
              </label>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canSubmit || isLoading || isCharging}
            className="mt-6 w-full rounded-2xl bg-[linear-gradient(92deg,#ff9dd9,#8a6bff,#66b4ff)] px-5 py-4 text-base font-black text-white shadow-[0_0_18px_rgba(151,211,255,0.6),0_18px_30px_rgba(8,7,28,0.45)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isCharging ? copy.submitCharging : isLoading ? copy.submitLoading : copy.submitIdle}
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-[#ddd7f2]">
            {copy.disclaimer}
          </p>
        </section>

        {meta ? (
          <section className="rounded-3xl border border-[#9cd8ff]/30 bg-[#0f1538]/55 p-4 text-sm text-[#f1edff] backdrop-blur-md sm:p-5">
            <h3 className="text-base font-black text-white [text-shadow:0_0_12px_rgba(145,216,255,0.5)]">{copy.metaSectionTitle}</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p>{copy.metaDayMasterLabel} <b>{meta.dayMaster}</b></p>
              <p>{copy.metaStageLabel} <b>{meta.representativeStage}</b></p>
              <p>{copy.metaSourceLabel} <b>{meta.source === "saju-engine" ? copy.sourceEngine : copy.sourceLocal}</b></p>
              <p>{copy.metaTimeInputLabel} <b>{meta.timeUnknown ? copy.timeUnknownLabel : copy.timeKnownLabel}</b></p>
            </div>
            {meta.warning ? <p className="mt-2 text-xs text-[#ffd7e5]">{copy.warningPrefix}{meta.warning}</p> : null}
          </section>
        ) : null}

        {isLoading ? <DestinyMeetingPlaceLoading /> : null}

        {error ? (
          <section className="rounded-2xl border border-rose-300/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </section>
        ) : null}

        {showPremiumDemo && !result ? (
          <section className="rounded-2xl border border-[#f0dbb6]/45 bg-[#f0dbb6]/12 px-4 py-3 text-sm text-[#f4e7d3]">
            {copy.demoBanner}
          </section>
        ) : null}

        {visibleResult ? <DestinyMeetingPlaceResult result={visibleResult} chargedCoins={chargedCoins} /> : null}
      </div>
    </main>
  );
}
