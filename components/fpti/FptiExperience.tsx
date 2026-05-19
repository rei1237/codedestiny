"use client";

import { useMemo, useState } from "react";
import FptiHero from "./FptiHero";
import FptiInputForm from "./FptiInputForm";
import FptiLoading from "./FptiLoading";
import FptiResultCard from "./FptiResultCard";
import { analyzeFptiFromBirth } from "@/lib/fpti/fpti-adapter";
import type { FptiAnalysisResult, FptiFormInput } from "@/lib/fpti/fpti-types";

const LOADING_STEPS = [
  "생년월일시를 사주 팔자로 변환 중...",
  "오행 분포와 십성 비율을 계산 중...",
  "관계/전략 축 점수를 정규화 중...",
  "FPTI 타입과 해석을 생성 중...",
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f5f7ff_45%,#f7fbff_100%)] py-8 md:py-12">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 md:px-6">
        <FptiHero onStart={start} />

        <section id="fpti-intro" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          <h2 className="text-base font-semibold text-slate-900">분석 기준</h2>
          <p className="mt-1">
            4축(기질/행동/관계/전략)은 사주 오행, 십성 분포, 월지 계절, 용신/희신 정보를 기반으로 계산됩니다.
            기존 사주 엔진 계산값을 재사용하며, 시간 미입력 시 신뢰도 안내를 함께 제공합니다.
          </p>
        </section>

        {(phase === "input" || phase === "landing") && (
          <FptiInputForm value={form} onChange={setForm} onSubmit={onAnalyze} busy={false} />
        )}

        {phase === "loading" && <FptiLoading step={loadingStep} />}

        {phase === "result" && result && <FptiResultCard result={result} />}

        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </div>
    </main>
  );
}
