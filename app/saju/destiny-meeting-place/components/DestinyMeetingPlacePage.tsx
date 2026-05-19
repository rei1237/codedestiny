"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import { fetchBillingBalance, runBillingCoinGate } from "@/app/_lib/billing-client";
import { resolveAnimalTwelveResult } from "@/app/saju/animal-destiny/lib/sajuAdapter";
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";
import DestinyMeetingPlaceLoading from "@/components/fortune/destiny-meeting-place/DestinyMeetingPlaceLoading";
import DestinyMeetingPlaceResult from "@/components/fortune/destiny-meeting-place/DestinyMeetingPlaceResult";
import { generateDestinyMeetingPlaceResult } from "@/components/fortune/destiny-meeting-place/destinyMeetingPlaceEngine";
import type { DestinyMeetingPlaceResult as MeetingResult } from "@/components/fortune/destiny-meeting-place/destinyMeetingPlaceTypes";

const FEATURE_KEY = "destiny_meeting_place";
const FEATURE_REASON = "사주로 보는 인연의 장소 1회 분석";
const HERO_IMAGE = "/fuctionassets/%EC%82%AC%EC%A3%BC%EB%A1%9C%EB%B3%B4%EB%8A%94%20%EC%9D%B8%EC%97%B0%EC%9D%98%20%EC%9E%A5%EC%86%8C.webp";
const PREFILL_KEY = "cd.destinyMeetingPlace.prefill.v1";

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

function getDayMasterLabel(sajuResult: Record<string, unknown>) {
  const dayStem = String(sajuResult.dayStem || "").trim();
  return dayStem ? `${dayStem} 일간` : "정보 보완";
}

export default function DestinyMeetingPlacePage() {
  const [input, setInput] = useState<AnimalDestinyInput>(INITIAL_INPUT);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [meta, setMeta] = useState<AnalysisMeta | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [chargedCoins, setChargedCoins] = useState(100);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isLunar = (input.calendarType || "solar") === "lunar";
  const canSubmit = useMemo(() => Boolean(input.birthDate), [input.birthDate]);

  useEffect(() => {
    let mounted = true;

    fetchBillingBalance()
      .then((res) => {
        if (!mounted || !res.ok || !res.data) return;
        setIsLoggedIn(Boolean(res.data.authenticated));
      })
      .catch(() => {
        if (!mounted) return;
        setIsLoggedIn(false);
      });

    try {
      const raw = sessionStorage.getItem(PREFILL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AnimalDestinyInput>;
        setInput((prev) => ({
          ...prev,
          ...parsed,
        }));
        sessionStorage.removeItem(PREFILL_KEY);
      }
    } catch {
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
      toast.error("생년월일을 입력해 주세요.");
      return;
    }

    setError("");
    setResult(null);
    setMeta(null);

    setIsCharging(true);
    try {
      const resolved = await resolveAnimalTwelveResult(input);
      if (!resolved.ok || !resolved.sajuResult) {
        const message = resolved.error || "사주 계산에 실패했습니다. 입력값을 다시 확인해 주세요.";
        setError(message);
        toast.error(message);
        return;
      }

      const balance = await fetchBillingBalance();
      if (!balance.ok || !balance.data?.authenticated) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      const requestId = `destiny-meeting-place:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const gate = await runBillingCoinGate({
        featureKey: FEATURE_KEY,
        reason: FEATURE_REASON,
        forceDeduct: true,
        requestId,
      });

      if (!gate.ok) {
        const code = String(gate.error?.code || "").toUpperCase();
        if (code === "INSUFFICIENT_COINS") {
          toast.error("코인이 부족합니다. 100코인 충전 후 다시 시도해 주세요.");
          return;
        }
        if (code === "AUTH_REQUIRED") {
          toast.error("로그인이 필요합니다.");
          return;
        }
        toast.error(gate.error?.message || "코인 결제 확인에 실패했습니다.");
        return;
      }

      const pricingCost = Number(gate.data?.pricing?.cost || 100);
      const charged = Number((gate.data?.consume as Record<string, unknown> | undefined)?.cost ?? pricingCost);
      setChargedCoins(Number.isFinite(charged) ? charged : pricingCost);

      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 900));

      const next = generateDestinyMeetingPlaceResult(resolved.sajuResult);
      const root = resolved.sajuResult as Record<string, unknown>;

      setResult(next);
      setMeta({
        dayMaster: getDayMasterLabel(root),
        representativeStage: String(resolved.representativeStage?.labelKo || "정보 보완"),
        source: resolved.source,
        warning: String(resolved.warning || ""),
        timeUnknown: Boolean(root.timeUnknown),
      });

      toast.success("인연의 장소 리포트가 완성되었습니다.");
    } finally {
      setIsCharging(false);
      setIsLoading(false);
    }
  }, [input, isCharging, isLoading]);

  const handleReset = useCallback(() => {
    setInput(INITIAL_INPUT);
    setResult(null);
    setMeta(null);
    setError("");
  }, []);

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_12%_10%,rgba(255,176,209,0.24),transparent_35%),radial-gradient(circle_at_86%_0%,rgba(255,208,122,0.2),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(95,167,255,0.22),transparent_34%),linear-gradient(170deg,#0d0f2b_0%,#2e1a56_52%,#0d1638_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.12),transparent_38%),radial-gradient(circle_at_78%_66%,rgba(255,255,255,0.08),transparent_40%)]" />
      <Toaster position="top-center" richColors />

      <header className="sticky top-0 z-40 border-b border-white/15 bg-[#110f2f]/75 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition-all hover:bg-white/20"
            aria-label="뒤로 가기"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#ffd68a]">Destiny Meeting Place</p>
            <h1 className="mt-1 text-sm font-black tracking-tight text-white sm:text-base">사주로 보는 인연의 장소</h1>
          </div>
          <button
            onClick={handleReset}
            className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition-all hover:bg-white/20"
            aria-label="초기화"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 pb-20 pt-6 sm:px-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/20 bg-[#1b1543]/72 shadow-[0_30px_60px_rgba(5,6,20,0.5)] backdrop-blur-sm">
          <div className="relative h-[220px] sm:h-[300px]">
            <img
              src={HERO_IMAGE}
              alt="사주로 보는 인연의 장소 대표 이미지"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,30,0.16),rgba(10,8,30,0.64))]" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffd88a]">Night Sky Oracle</p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-4xl">운명의 만남이 시작될 장소를 찾는 독립 리포트</h2>
              <p className="mt-2 text-sm font-medium text-[#f0e8ff]">이 페이지에서 바로 사주 계산부터 인연 장소 분석까지 한 번에 실행합니다.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#ffd4a5]/40 bg-[linear-gradient(160deg,rgba(30,22,70,0.92),rgba(34,20,64,0.88))] p-5 shadow-[0_22px_40px_rgba(9,8,30,0.45)] sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-[#ffd88a]/18 px-3 py-1 text-[#ffd88a]">1회 100코인</span>
            <span className="rounded-full bg-[#ff9dd9]/18 px-3 py-1 text-[#ffb9e6]">야경/별빛 무드 추천</span>
            <span className="rounded-full bg-[#81bbff]/18 px-3 py-1 text-[#b8d9ff]">장소 + 시기 + 아이템</span>
            {!isLoggedIn ? <span className="rounded-full bg-rose-400/15 px-3 py-1 text-rose-200">로그인 필요</span> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-bold text-[#f6ecff]">
              이름 또는 닉네임
              <input
                value={input.name || ""}
                onChange={(event) => setPatch({ name: event.target.value.slice(0, 24) })}
                placeholder="예: 별빛여우"
                className="w-full rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-base text-white placeholder:text-[#c8c4df] focus:border-[#ffd88a] focus:outline-none"
              />
            </label>

            <label className="space-y-2 text-sm font-bold text-[#f6ecff]">
              출생일 <span className="text-rose-300">*</span>
              <input
                type="date"
                value={input.birthDate}
                onChange={(event) => setPatch({ birthDate: event.target.value })}
                className="w-full rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-base text-white focus:border-[#ffd88a] focus:outline-none"
              />
            </label>

            <label className="space-y-2 text-sm font-bold text-[#f6ecff]">
              달력 타입
              <select
                value={input.calendarType || "solar"}
                onChange={(event) => setPatch({ calendarType: event.target.value as AnimalDestinyInput["calendarType"] })}
                className="w-full rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-base text-white focus:border-[#ffd88a] focus:outline-none"
              >
                <option value="solar" className="text-black">양력</option>
                <option value="lunar" className="text-black">음력</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-bold text-[#f6ecff]">
              태어난 시간
              <input
                type="time"
                value={input.birthTime || ""}
                onChange={(event) => setPatch({ birthTime: event.target.value })}
                className="w-full rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-base text-white focus:border-[#ffd88a] focus:outline-none"
              />
              <span className="block text-[11px] font-medium text-[#c9c6e5]">모르면 비워도 분석할 수 있습니다.</span>
            </label>

            <label className="space-y-2 text-sm font-bold text-[#f6ecff]">
              성별
              <select
                value={input.gender}
                onChange={(event) => setPatch({ gender: event.target.value as AnimalDestinyInput["gender"] })}
                className="w-full rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-base text-white focus:border-[#ffd88a] focus:outline-none"
              >
                <option value="unknown" className="text-black">성별 미선택</option>
                <option value="female" className="text-black">여성</option>
                <option value="male" className="text-black">남성</option>
              </select>
            </label>

            {isLunar ? (
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-[#f5ecff] md:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(input.lunarLeap)}
                  onChange={(event) => setPatch({ lunarLeap: event.target.checked })}
                  className="h-5 w-5 accent-[#ffc062]"
                />
                윤달 출생입니다
              </label>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canSubmit || isLoading || isCharging}
            className="mt-6 w-full rounded-2xl bg-[linear-gradient(90deg,#ff9dd9,#8e6dff,#6aa8ff)] px-5 py-4 text-base font-black text-white shadow-[0_18px_30px_rgba(8,7,28,0.45)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isCharging ? "코인 결제 확인 중..." : isLoading ? "별빛 지도를 분석하는 중..." : "인연의 장소 분석 시작"}
          </button>
        </section>

        {meta ? (
          <section className="rounded-3xl border border-white/20 bg-white/10 p-4 text-sm text-[#f1edff] backdrop-blur-md sm:p-5">
            <h3 className="text-base font-black text-white">분석 근거</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p>일간: <b>{meta.dayMaster}</b></p>
              <p>대표 운성: <b>{meta.representativeStage}</b></p>
              <p>엔진 소스: <b>{meta.source === "saju-engine" ? "사주 엔진" : "로컬 정밀 계산"}</b></p>
              <p>시간 입력: <b>{meta.timeUnknown ? "시간 미입력" : "시간 입력됨"}</b></p>
            </div>
            {meta.warning ? <p className="mt-2 text-xs text-[#ffd7e5]">{meta.warning}</p> : null}
          </section>
        ) : null}

        {isLoading ? <DestinyMeetingPlaceLoading /> : null}

        {error ? (
          <section className="rounded-2xl border border-rose-300/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </section>
        ) : null}

        {result ? <DestinyMeetingPlaceResult result={result} chargedCoins={chargedCoins} /> : null}
      </div>
    </main>
  );
}
