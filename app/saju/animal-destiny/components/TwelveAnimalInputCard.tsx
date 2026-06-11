"use client";

import type { AnimalDestinyInput } from "../lib/types";

type Props = {
  input: AnimalDestinyInput;
  onChange: (patch: Partial<AnimalDestinyInput>) => void;
  onSubmit: () => void;
  isBusy: boolean;
  canSubmit: boolean;
  error?: string;
};

const STEPS = ["생년월일", "시간", "성별"];

function getStep(input: AnimalDestinyInput) {
  if (!input.birthDate) return 0;
  if (!input.birthTime) return 1;
  if (input.gender === "unknown") return 2;
  return 3;
}

export default function TwelveAnimalInputCard({ input, onChange, onSubmit, isBusy, canSubmit, error }: Props) {
  const isLunar = (input.calendarType || "solar") === "lunar";
  const currentStep = getStep(input);

  return (
    <section className="space-y-5 rounded-[2rem] border border-[#b8d4eb] bg-[linear-gradient(158deg,#f8fcff_0%,#f7fbff_45%,#fff6ea_100%)] p-5 text-[#2f5677] shadow-[0_20px_46px_rgba(62,110,154,0.15)] sm:p-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#214968]">운성 탐색 정보 입력</h2>
        <p className="text-sm font-semibold leading-relaxed text-[#3f6789]">
          입력값은 기존 십이운성 계산 로직으로 안전하게 처리됩니다.
          발자국 진행바를 따라 차례대로 입력해 보세요.
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border border-[#c8ddf0] bg-white/82 p-3">
        <div className="flex items-center justify-between text-xs font-black text-[#3c678d]">
          <span>탐험 진행</span>
          <span>{Math.min(currentStep, 3)} / 3</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={`rounded-xl px-2 py-2 text-center text-[11px] font-bold ${index < currentStep ? "bg-[#e4f5e7] text-[#2f7741]" : "bg-[#edf4fb] text-[#5c7e9d]"}`}
            >
              <span className="mr-1">🐾</span>
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-[#2b5376]">
          이름 또는 닉네임
          <input
            value={input.name || ""}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 20) })}
            placeholder="예: 별빛탐험가"
            className="min-h-[46px] w-full rounded-2xl border border-[#bfd8eb] bg-white px-4 py-3 text-base text-[#315c7f] placeholder:text-[#7ca0be] focus:border-[#4f8fbe] focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#2b5376]">
          출생일 <span className="text-rose-600">*</span>
          <input
            type="date"
            value={input.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
            className="min-h-[46px] w-full rounded-2xl border border-[#bfd8eb] bg-white px-4 py-3 text-base text-[#315c7f] focus:border-[#4f8fbe] focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#2b5376]">
          달력 타입
          <select
            value={input.calendarType || "solar"}
            onChange={(e) => onChange({ calendarType: e.target.value as AnimalDestinyInput["calendarType"] })}
            className="min-h-[46px] w-full appearance-none rounded-2xl border border-[#bfd8eb] bg-white px-4 py-3 text-base text-[#315c7f] focus:border-[#4f8fbe] focus:outline-none"
          >
            <option value="solar">양력 (기본)</option>
            <option value="lunar">음력</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#2b5376]">
          태어난 시간
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => onChange({ birthTime: e.target.value })}
            className="min-h-[46px] w-full rounded-2xl border border-[#bfd8eb] bg-white px-4 py-3 text-base text-[#315c7f] focus:border-[#4f8fbe] focus:outline-none"
          />
          <span className="block text-[11px] font-medium text-[#6182a0]">시간을 모르면 비워도 계산이 진행됩니다.</span>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#2b5376]">
          성별
          <select
            value={input.gender}
            onChange={(e) => onChange({ gender: e.target.value as AnimalDestinyInput["gender"] })}
            className="min-h-[46px] w-full appearance-none rounded-2xl border border-[#bfd8eb] bg-white px-4 py-3 text-base text-[#315c7f] focus:border-[#4f8fbe] focus:outline-none"
          >
            <option value="unknown">성별 미선택</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </label>

        {isLunar ? (
          <label className="flex min-h-[46px] cursor-pointer items-center gap-3 rounded-2xl border border-[#bfd8eb] bg-[#f3f8ff] px-4 py-3 text-sm font-bold text-[#2f5f87] md:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(input.lunarLeap)}
              onChange={(e) => onChange({ lunarLeap: e.target.checked })}
              className="h-5 w-5 accent-[#3e84ba]"
            />
            윤달 출생입니다
          </label>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#f0b2b2] bg-[#fff4f4] px-4 py-3 text-sm font-semibold text-[#b34d4d]">
          🐾 입력을 다시 확인해 주세요: {error}
        </div>
      ) : null}

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isBusy}
        className="group relative min-h-[48px] w-full overflow-hidden rounded-[1.6rem] bg-[linear-gradient(130deg,#3e84ba,#5cb8d6,#f2c774)] py-4 text-lg font-black text-white shadow-[0_15px_30px_rgba(62,132,186,0.3)] transition active:scale-[0.98] disabled:opacity-50 hover:brightness-105"
      >
        <div className="absolute inset-0 translate-x-[-100%] bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.2),transparent)] group-hover:animate-[shimmer_2s_infinite]" />
        <span className="relative inline-flex items-center gap-2">
          <span className="text-[20px]">🐾</span>
          {isBusy ? "운명의 동물을 찾는 중..." : "내 동물 찾기"}
        </span>
      </button>
    </section>
  );
}
