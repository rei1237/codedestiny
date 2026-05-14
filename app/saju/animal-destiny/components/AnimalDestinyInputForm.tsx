"use client";

import type { AnimalDestinyInput } from "../lib/types";
import DestinyIcon from "@/app/components/icons/DestinyIcon";

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
    <section className="space-y-6 rounded-[2.5rem] border-[3px] border-[#d4af37]/40 bg-[#fffcf0] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_0_40px_rgba(212,175,55,0.1)] text-[#3a2d1f]">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#5a2a6d]">운명의 명식 입력</h2>
        <p className="text-sm font-medium leading-relaxed text-[#3a2d1f]/70">
          당신의 태어난 순간을 입력해 주세요.<br />별들이 당신의 수호 동물을 안내해 드립니다.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-[#5a2a6d]">
          이름 또는 닉네임
          <input
            value={input.name || ""}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 20) })}
            placeholder="예: 별빛여우"
            className="w-full rounded-2xl border-2 border-[#d4af37]/20 bg-white px-4 py-3 text-base text-[#3a2d1f] placeholder:text-[#3a2d1f]/30 focus:border-[#5a2a6d] focus:outline-none transition-all"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#5a2a6d]">
          출생일 <span className="text-rose-500">*</span>
          <input
            type="date"
            value={input.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
            className="w-full rounded-2xl border-2 border-[#d4af37]/20 bg-white px-4 py-3 text-base text-[#3a2d1f] focus:border-[#5a2a6d] focus:outline-none transition-all"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#5a2a6d]">
          달력 타입
          <select
            value={input.calendarType || "solar"}
            onChange={(e) => onChange({ calendarType: e.target.value as AnimalDestinyInput["calendarType"] })}
            className="w-full rounded-2xl border-2 border-[#d4af37]/20 bg-white px-4 py-3 text-base text-[#3a2d1f] appearance-none focus:border-[#5a2a6d] focus:outline-none transition-all"
          >
            <option value="solar">양력 (기본)</option>
            <option value="lunar">음력</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#5a2a6d]">
          태어난 시간
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => onChange({ birthTime: e.target.value })}
            className="w-full rounded-2xl border-2 border-[#d4af37]/20 bg-white px-4 py-3 text-base text-[#3a2d1f] focus:border-[#5a2a6d] focus:outline-none transition-all"
          />
          <span className="block text-[11px] font-medium text-[#3a2d1f]/60 px-1">
            * 시간을 모르면 비워두셔도 됩니다.
          </span>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#5a2a6d]">
          성별
          <select
            value={input.gender}
            onChange={(e) => onChange({ gender: e.target.value as AnimalDestinyInput["gender"] })}
            className="w-full rounded-2xl border-2 border-[#d4af37]/20 bg-white px-4 py-3 text-base text-[#3a2d1f] appearance-none focus:border-[#5a2a6d] focus:outline-none transition-all"
          >
            <option value="unknown">성별 미선택</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </label>

        {isLunar ? (
          <label className="flex items-center gap-3 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-sm font-bold text-[#5a2a6d] md:col-span-2 cursor-pointer hover:bg-purple-100 transition-colors">
            <input
              type="checkbox"
              checked={Boolean(input.lunarLeap)}
              onChange={(e) => onChange({ lunarLeap: e.target.checked })}
              className="h-5 w-5 accent-[#5a2a6d]"
            />
            윤달 출생입니다
          </label>
        ) : null}
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isBusy}
        className="relative group w-full mt-4 overflow-hidden rounded-[1.8rem] bg-[#5a2a6d] py-5 text-lg font-black text-white shadow-[0_15px_30px_rgba(90,42,109,0.3)] disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.2),transparent)] translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite]" />
        {isBusy ? "별들의 궤적을 읽는 중..." : "나의 수호 동물 소환하기"}
      </button>

      <p className="text-center text-[11px] font-medium text-[#3a2d1f]/50 italic">
        정밀 사주 엔진이 당신의 십이운성을 계산합니다.
      </p>
    </section>
  );
}

