"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeBirthDateInput } from "@/lib/birthDateInput";
import MobileStepFortuneForm from "./MobileStepFortuneForm";

const MAIN_HERO_FORTUNE_FORM_TEXT_TRANSLATIONS = {
  ko: {
    "mainHeroForm.001": "대한민국 (서울)",
    "mainHeroForm.002": "일본 (도쿄)",
    "mainHeroForm.003": "중국 (상하이)",
    "mainHeroForm.004": "미국 (뉴욕)",
    "mainHeroForm.005": "영국 (런던)",
    "mainHeroForm.006": "독일 (베를린)",
    "mainHeroForm.007": "말레이시아 (쿠알라룸푸르)",
    "mainHeroForm.008": "태국 (방콕)",
    "mainHeroForm.009": "인도 (콜카타)",
    "mainHeroForm.010": "이름과 생년월일을 먼저 입력해 주세요.",
    "mainHeroForm.011": "개인정보 동의가 필요합니다.",
    "mainHeroForm.012": "이름 · 생년월일 · 시간 · 출생지 · 성별 · 동의",
    "mainHeroForm.013": "이름을 입력하세요",
    "mainHeroForm.014": "개인정보 처리 및 운세 계산 이용에 동의합니다.",
  },
} as const;

function mainHeroFortuneFormText(key: keyof typeof MAIN_HERO_FORTUNE_FORM_TEXT_TRANSLATIONS.ko): string {
  return MAIN_HERO_FORTUNE_FORM_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
type FormState = {
  name: string;
  birthDate: string;
  calType: "solar" | "lunar" | "lunar_leap";
  birthHour: string;
  birthMinute: string;
  birthCountry: string;
  gender: "F" | "M";
  agreed: boolean;
};

type Props = {
  onProfileReady: (state: FormState) => void;
};

const COUNTRY_OPTIONS = [
  { value: "Asia/Seoul", label: mainHeroFortuneFormText("mainHeroForm.001") },
  { value: "Asia/Tokyo", label: mainHeroFortuneFormText("mainHeroForm.002") },
  { value: "Asia/Shanghai", label: mainHeroFortuneFormText("mainHeroForm.003") },
  { value: "America/New_York", label: mainHeroFortuneFormText("mainHeroForm.004") },
  { value: "Europe/London", label: mainHeroFortuneFormText("mainHeroForm.005") },
  { value: "Europe/Berlin", label: mainHeroFortuneFormText("mainHeroForm.006") },
  { value: "Asia/Kuala_Lumpur", label: mainHeroFortuneFormText("mainHeroForm.007") },
  { value: "Asia/Bangkok", label: mainHeroFortuneFormText("mainHeroForm.008") },
  { value: "Asia/Kolkata", label: mainHeroFortuneFormText("mainHeroForm.009") },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "10", "20", "30", "40", "50"];

export default function MainHeroFortuneForm({ onProfileReady }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [state, setState] = useState<FormState>({
    name: "",
    birthDate: "",
    calType: "solar",
    birthHour: "12",
    birthMinute: "00",
    birthCountry: "Asia/Seoul",
    gender: "F",
    agreed: false,
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    q.set("name", state.name || "사용자");
    q.set("birthDate", normalizeBirthDateInput(state.birthDate));
    q.set("calType", state.calType);
    q.set("birthHour", state.birthHour);
    q.set("birthMinute", state.birthMinute);
    q.set("birthCountry", state.birthCountry);
    q.set("gender", state.gender);
    q.set("action", "checkPrivacyAndCalculate");
    q.set("mainInput", "1");
    return q.toString();
  }, [state]);

  const handleSubmit = () => {
    const normalizedBirthDate = normalizeBirthDateInput(state.birthDate);
    if (!state.name || !normalizedBirthDate) {
      setError(mainHeroFortuneFormText("mainHeroForm.010"));
      return;
    }
    if (!state.agreed) {
      setError(mainHeroFortuneFormText("mainHeroForm.011"));
      return;
    }

    setError("");
    onProfileReady({ ...state, birthDate: normalizedBirthDate });
    router.push(`/?${queryString}`);
  };

  return (
    <section className="rounded-[24px] border border-violet-200/55 bg-[linear-gradient(145deg,rgba(250,246,255,0.96),rgba(242,235,255,0.95))] p-4 shadow-[0_16px_34px_rgba(45,26,88,0.14)] md:p-6">
      <div className="mb-4 rounded-2xl border border-violet-200/40 bg-[linear-gradient(145deg,rgba(33,17,71,0.95),rgba(48,26,96,0.9))] px-4 py-4 text-center md:px-5">
        <p className="text-[11px] font-extrabold tracking-[0.24em] text-violet-200">MY DESTINY CARD</p>
        <h2 className="mt-2 text-[clamp(1.2rem,2.7vw,1.8rem)] font-black leading-tight text-violet-50">
          아래 정보를 입력하고 운세를 시작해보세요
        </h2>
        <p className="mt-1.5 text-sm leading-7 text-violet-100/80">
          사주팔자와 타로, 점성술 추천이 입력 결과와 자연스럽게 연결됩니다.
        </p>
      </div>

      <div className="mb-3 hidden items-center gap-2 text-xs text-violet-900 md:flex">
        <span className="inline-flex rounded-full border border-violet-300/40 bg-violet-200/70 px-2 py-0.5 font-semibold text-violet-900">필수 입력</span>
        <span>{mainHeroFortuneFormText("mainHeroForm.012")}</span>
      </div>

      <div className="hidden md:block">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-violet-900">
            이름
            <input
              value={state.name}
              onChange={(e) => setField("name", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-violet-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900"
              placeholder={mainHeroFortuneFormText("mainHeroForm.013")}
            />
          </label>

          <label className="text-xs font-semibold text-violet-900">
            생년월일
            <input
              {...birthDateTextInputProps(state.birthDate, (nextBirthDate) => setField("birthDate", nextBirthDate))}
              className="mt-1.5 w-full rounded-xl border border-violet-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900"
            />
          </label>

          <div>
            <p className="text-xs font-semibold text-violet-900">양력 / 음력</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setField("calType", "solar")}
                className={`rounded-xl px-2 py-2 text-xs font-semibold ${state.calType === "solar" ? "border border-violet-300/70 bg-violet-500 text-white" : "border border-violet-200/80 bg-white text-violet-900"}`}
              >
                양력
              </button>
              <button
                type="button"
                onClick={() => setField("calType", "lunar")}
                className={`rounded-xl px-2 py-2 text-xs font-semibold ${state.calType === "lunar" ? "border border-violet-300/70 bg-violet-500 text-white" : "border border-violet-200/80 bg-white text-violet-900"}`}
              >
                음력
              </button>
              <button
                type="button"
                onClick={() => setField("calType", "lunar_leap")}
                className={`rounded-xl px-2 py-2 text-xs font-semibold ${state.calType === "lunar_leap" ? "border border-violet-300/70 bg-violet-500 text-white" : "border border-violet-200/80 bg-white text-violet-900"}`}
              >
                윤달
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-violet-900">출생 시간/분</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <select
                value={state.birthHour}
                onChange={(e) => setField("birthHour", e.target.value)}
                className="rounded-xl border border-violet-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900"
              >
                {HOURS.map((h) => (
                  <option key={`hour-${h}`} value={h}>{h}시</option>
                ))}
              </select>
              <select
                value={state.birthMinute}
                onChange={(e) => setField("birthMinute", e.target.value)}
                className="rounded-xl border border-violet-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900"
              >
                {MINUTES.map((m) => (
                  <option key={`minute-${m}`} value={m}>{m}분</option>
                ))}
              </select>
            </div>
          </div>

          <label className="text-xs font-semibold text-violet-900">
            출생 국가/장소
            <select
              value={state.birthCountry}
              onChange={(e) => setField("birthCountry", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-violet-200/80 bg-white/95 px-3 py-2.5 text-sm text-slate-900"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-xs font-semibold text-violet-900">성별</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setField("gender", "F")}
                className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${state.gender === "F" ? "border border-violet-300/70 bg-violet-500 text-white" : "border border-violet-200/80 bg-white text-violet-900"}`}
              >
                여성
              </button>
              <button
                type="button"
                onClick={() => setField("gender", "M")}
                className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${state.gender === "M" ? "border border-violet-300/70 bg-violet-500 text-white" : "border border-violet-200/80 bg-white text-violet-900"}`}
              >
                남성
              </button>
            </div>
          </div>
        </div>

        <label className="mt-3 flex items-start gap-2 rounded-xl border border-violet-200/80 bg-white/90 p-3 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={state.agreed}
            onChange={(e) => setField("agreed", e.target.checked)}
            className="mt-0.5"
          />
          <span>{mainHeroFortuneFormText("mainHeroForm.014")}</span>
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-violet-300/50 bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(98,62,191,0.35)]"
        >
          운명의 지도 보기
        </button>
      </div>

      <MobileStepFortuneForm
        step={step}
        setStep={setStep}
        state={state}
        setField={setField}
        onSubmit={handleSubmit}
      />

      {error ? <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p> : null}

      <button
        type="button"
        onClick={handleSubmit}
        className="fixed bottom-3 left-3 right-3 z-40 rounded-xl border border-violet-300/40 bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(51,31,95,0.42)] md:hidden"
      >
        운명의 지도 보기
      </button>
    </section>
  );
}
