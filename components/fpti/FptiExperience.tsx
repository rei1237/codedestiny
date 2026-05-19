"use client";

import { useMemo, useState } from "react";
import FptiHero from "./FptiHero";
import FptiInputForm from "./FptiInputForm";
import FptiLoading from "./FptiLoading";
import FptiResultCard from "./FptiResultCard";
import { analyzeFptiFromBirth } from "@/lib/fpti/fpti-adapter";
import type { FptiAnalysisResult, FptiFormInput } from "@/lib/fpti/fpti-types";

const LOADING_STEPS = [
  "사주 원국을 계산하는 중...",
  "일간의 본질을 읽는 중...",
  "오행의 균형을 분석하는 중...",
  "십성의 성격 패턴을 해석하는 중...",
  "당신만의 FPTI 코드를 생성하는 중...",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DEFAULT_FORM: FptiFormInput = {
  name: "",
  gender: "OTHER",
  birthDate: "",
  calendarType: "solar",
  birthTime: "12:00",
  timeUnknown: false,
  birthRegion: "",
};

export default function FptiExperience() {
  const [phase, setPhase] = useState<"landing" | "input" | "loading" | "result">("landing");
  const [form, setForm] = useState<FptiFormInput>(DEFAULT_FORM);
  const [result, setResult] = useState<FptiAnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);

  const loadingStep = useMemo(() => LOADING_STEPS[stepIndex] || LOADING_STEPS[0], [stepIndex]);

  const start = () => {
    setPhase("input");
    setError("");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const target = document.getElementById("fpti-input");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const preview = () => {
    setPhase("result");
    const sample = analyzeFptiFromBirth({
      name: "샘플 사용자",
      gender: "OTHER",
      birthDate: "1994-12-09",
      calendarType: "solar",
      birthTime: "23:20",
      timeUnknown: false,
      birthRegion: "서울",
    });
    Promise.resolve(sample)
      .then((data) => {
        setResult(data);
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => {
            const target = document.getElementById("fpti-result");
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
      })
      .catch(() => {
        setError("샘플 결과를 불러오지 못했습니다. 다시 시도해 주세요.");
        setPhase("landing");
      });
  };

  const onAnalyze = async () => {
    if (!form.name || !form.birthDate) {
      setError("이름과 생년월일은 필수입니다.");
      return;
    }

    setError("");
    setStepIndex(0);
    setPhase("loading");

    const timer = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 620);

    try {
      const [analysis] = await Promise.all([analyzeFptiFromBirth(form), sleep(2400)]);
      setResult(analysis);
      setPhase("result");
    } catch {
      setError("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      setPhase("input");
    } finally {
      window.clearInterval(timer);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#050617_0%,#0B1026_45%,#130A2A_100%)] py-8 md:py-12">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background:radial-gradient(circle_at_20%_25%,rgba(124,58,237,0.35),transparent_42%),radial-gradient(circle_at_80%_65%,rgba(96,165,250,0.28),transparent_45%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:auto,auto,26px_26px]" />
      <div className="relative mx-auto w-full max-w-6xl space-y-6 px-4 md:px-6">
        <FptiHero onStart={start} onPreview={preview} />

        <section id="fpti-intro" className="rounded-3xl border border-white/15 bg-white/5 p-5 text-sm text-slate-200 backdrop-blur-xl">
          <h2 className="text-base font-semibold text-slate-50">분석 기준</h2>
          <p className="mt-1">
            4축(기질/행동/관계/전략)은 사주 오행, 십성 분포, 월지 계절, 용신/희신 정보를 기반으로 계산됩니다.
            기존 사주 엔진 계산값을 재사용하며, 시간 미입력 시 신뢰도 안내를 함께 제공합니다.
          </p>
        </section>

        {phase === "input" && (
          <section id="fpti-input">
          <FptiInputForm value={form} onChange={setForm} onSubmit={onAnalyze} busy={false} />
          </section>
        )}

        {phase === "loading" && <FptiLoading step={loadingStep} stepIndex={stepIndex} />}

        {phase === "result" && result && (
          <section id="fpti-result">
            <FptiResultCard result={result} />
          </section>
        )}

        {error && <p className="rounded-xl border border-rose-300/30 bg-rose-500/12 p-3 text-sm text-rose-100">{error}</p>}
      </div>
    </main>
  );
}
