"use client";

import type { AnimalDestinyInput } from "../lib/types";

interface Props {
  input: AnimalDestinyInput;
  onChange: (patch: Partial<AnimalDestinyInput>) => void;
  onSubmit: () => void;
  isBusy: boolean;
  canSubmit: boolean;
}

export default function AnimalDestinyInputForm({ input, onChange, onSubmit, isBusy, canSubmit }: Props) {
  const isLunar = (input.calendarType || "solar") === "lunar";

  return (
    <section className="space-y-6 rounded-[2.2rem] border border-[#e3ccff] bg-[linear-gradient(155deg,#fff8ed_0%,#f8f2ff_52%,#fff9ef_100%)] p-5 text-[#4f2f75] shadow-[0_18px_48px_rgba(120,82,181,0.18)] sm:p-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#5b2f87]">운명의 명식 입력</h2>
        <p className="text-sm font-semibold leading-relaxed text-[#6f4f97]">
          당신의 태어난 순간을 입력해 주세요.<br />별들이 당신의 수호 동물을 안내해 드립니다.
        </p>
      </div>

      <div className="grid gap-2 text-[11px] font-black sm:grid-cols-3">
        <div className="rounded-xl border border-[#efd5a3] bg-[#fff3d8] px-3 py-2 text-[#7f5822]">해금: 100코인</div>
        <div className="rounded-xl border border-[#e5d7ff] bg-[#f3ecff] px-3 py-2 text-[#60408a]">분석: 약 20초</div>
        <div className="rounded-xl border border-[#ffd4e8] bg-[#fff0f8] px-3 py-2 text-[#8c3f72]">궁합 리딩 포함</div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-[#5b3a82]">
          이름 또는 닉네임
          <input
            value={input.name || ""}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 20) })}
            placeholder="예: 별빛여우"
            className="w-full rounded-2xl border border-[#dbc9f6] bg-white px-4 py-3 text-base text-[#4d2c78] placeholder:text-[#9d8cbe] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8f63cb] focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#5b3a82]">
          출생일 <span className="text-rose-600">*</span>
          <input
            type="date"
            value={input.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
            className="w-full rounded-2xl border border-[#dbc9f6] bg-white px-4 py-3 text-base text-[#4d2c78] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8f63cb] focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#5b3a82]">
          달력 타입
          <select
            value={input.calendarType || "solar"}
            onChange={(e) => onChange({ calendarType: e.target.value as AnimalDestinyInput["calendarType"] })}
            className="w-full appearance-none rounded-2xl border border-[#dbc9f6] bg-white px-4 py-3 text-base text-[#4d2c78] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8f63cb] focus:outline-none"
          >
            <option value="solar">양력 (기본)</option>
            <option value="lunar">음력</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#5b3a82]">
          태어난 시간
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => onChange({ birthTime: e.target.value })}
            className="w-full rounded-2xl border border-[#dbc9f6] bg-white px-4 py-3 text-base text-[#4d2c78] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8f63cb] focus:outline-none"
          />
          <span className="block px-1 text-[11px] font-medium text-[#7d6e9f]">
            * 시간을 모르면 비워두셔도 됩니다.
          </span>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#5b3a82]">
          성별
          <select
            value={input.gender}
            onChange={(e) => onChange({ gender: e.target.value as AnimalDestinyInput["gender"] })}
            className="w-full appearance-none rounded-2xl border border-[#dbc9f6] bg-white px-4 py-3 text-base text-[#4d2c78] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8f63cb] focus:outline-none"
          >
            <option value="unknown">성별 미선택</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </label>

        {isLunar ? (
          <label className="cursor-pointer rounded-2xl border border-[#e2d0fa] bg-[#f4ebff] px-4 py-3 text-sm font-bold text-[#5f3c86] transition-colors hover:bg-[#edddff] md:col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              checked={Boolean(input.lunarLeap)}
              onChange={(e) => onChange({ lunarLeap: e.target.checked })}
              className="h-5 w-5 accent-[#8857cc]"
            />
            윤달 출생입니다
          </label>
        ) : null}
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isBusy}
        className="group relative mt-4 w-full overflow-hidden rounded-[1.8rem] bg-[linear-gradient(130deg,#8d5af4,#f56bb0,#ffb86d)] py-5 text-lg font-black text-white shadow-[0_15px_30px_rgba(111,66,173,0.35)] transition-all active:scale-[0.98] disabled:opacity-50 hover:scale-[1.01]"
      >
        <div className="absolute inset-0 translate-x-[-100%] bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.18),transparent)] group-hover:animate-[shimmer_2s_infinite]" />
        <span className="relative inline-flex items-center gap-2">
          <span className="text-[20px]">*</span>
          {isBusy ? "별들의 궤적을 읽는 중..." : "나의 수호 동물 소환하기"}
        </span>
      </button>

      <p className="text-center text-[11px] font-semibold italic text-[#8260ab]">
        정밀 사주 엔진이 당신의 십이운성을 계산합니다.
      </p>
    </section>
  );
}

