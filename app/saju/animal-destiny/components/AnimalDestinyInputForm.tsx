"use client";

import type { AnimalDestinyInput } from "../lib/types";

interface Props {
  input: AnimalDestinyInput;
  onChange: (patch: Partial<AnimalDestinyInput>) => void;
  onSubmit: () => void;
  isBusy: boolean;
  canSubmit: boolean;
  isUnlocked: boolean;
}

export default function AnimalDestinyInputForm({ input, onChange, onSubmit, isBusy, canSubmit, isUnlocked }: Props) {
  const isLunar = (input.calendarType || "solar") === "lunar";

  return (
    <section className="space-y-6 rounded-[2.2rem] border border-[#dcc39b] bg-[linear-gradient(158deg,#fff8ea_0%,#fdf1dc_52%,#fae7c5_100%)] p-5 text-[#6b3f1d] shadow-[0_18px_48px_rgba(120,82,34,0.16)] sm:p-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-black tracking-tight text-[#6b3f1d]">운명의 명식 입력</h2>
        <p className="text-sm font-semibold leading-relaxed text-[#7f542e]">
          당신의 태어난 순간을 입력해 주세요.<br />별들이 당신의 수호 동물을 안내해 드립니다.
        </p>
      </div>

      <div className="grid gap-2 text-[11px] font-black sm:grid-cols-3">
        <div className="rounded-xl border border-[#e5c998] bg-[#fff4dc] px-3 py-2 text-[#7f5822]">해금: 100코인</div>
        <div className="rounded-xl border border-[#d7c5a1] bg-[#fff7ea] px-3 py-2 text-[#6b3f1d]">분석: 약 20초</div>
        <div className="rounded-xl border border-[#ced8ae] bg-[#f4f8e7] px-3 py-2 text-[#5a6a35]">궁합 리딩 포함</div>
      </div>

      {!isUnlocked ? (
        <div className="rounded-2xl border border-[#e5c998] bg-[#fff4dc]/90 p-4">
          <div className="space-y-2 rounded-xl border border-[#ebd4ad] bg-white/75 p-3">
            <p className="text-xs font-black text-[#8a5a2b]">결과 미리보기 (블라인드)</p>
            <div className="space-y-2 blur-[2px]">
              <div className="h-4 w-2/3 rounded bg-[#ead8b8]" />
              <div className="h-3 w-full rounded bg-[#f1e2c6]" />
              <div className="h-3 w-5/6 rounded bg-[#f1e2c6]" />
              <div className="h-3 w-4/6 rounded bg-[#f1e2c6]" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-[#6b3f1d]">
          이름 또는 닉네임
          <input
            value={input.name || ""}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 20) })}
            placeholder="예: 별빛여우"
            className="min-h-[46px] w-full rounded-2xl border border-[#dcc39b] bg-white px-4 py-3 text-base text-[#5f3818] placeholder:text-[#b18f66] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8a5a2b] focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#6b3f1d]">
          출생일 <span className="text-rose-600">*</span>
          <input
            type="date"
            value={input.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
            className="min-h-[46px] w-full rounded-2xl border border-[#dcc39b] bg-white px-4 py-3 text-base text-[#5f3818] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8a5a2b] focus:outline-none"
          />
        </label>

        <label className="space-y-2 text-sm font-bold text-[#6b3f1d]">
          달력 타입
          <select
            value={input.calendarType || "solar"}
            onChange={(e) => onChange({ calendarType: e.target.value as AnimalDestinyInput["calendarType"] })}
            className="min-h-[46px] w-full appearance-none rounded-2xl border border-[#dcc39b] bg-white px-4 py-3 text-base text-[#5f3818] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8a5a2b] focus:outline-none"
          >
            <option value="solar">양력 (기본)</option>
            <option value="lunar">음력</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#6b3f1d]">
          태어난 시간
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => onChange({ birthTime: e.target.value })}
            className="min-h-[46px] w-full rounded-2xl border border-[#dcc39b] bg-white px-4 py-3 text-base text-[#5f3818] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8a5a2b] focus:outline-none"
          />
          <span className="block px-1 text-[11px] font-medium text-[#8f6b47]">
            * 시간을 모르면 비워두셔도 됩니다.
          </span>
        </label>

        <label className="space-y-2 text-sm font-bold text-[#6b3f1d]">
          성별
          <select
            value={input.gender}
            onChange={(e) => onChange({ gender: e.target.value as AnimalDestinyInput["gender"] })}
            className="min-h-[46px] w-full appearance-none rounded-2xl border border-[#dcc39b] bg-white px-4 py-3 text-base text-[#5f3818] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-all focus:border-[#8a5a2b] focus:outline-none"
          >
            <option value="unknown">성별 미선택</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </label>

        {isLunar ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#dcc39b] bg-[#fff4de] px-4 py-3 text-sm font-bold text-[#6b3f1d] transition-colors hover:bg-[#faeccf] md:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(input.lunarLeap)}
              onChange={(e) => onChange({ lunarLeap: e.target.checked })}
              className="h-5 w-5 accent-[#8a5a2b]"
            />
            윤달 출생입니다
          </label>
        ) : null}
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isBusy}
        className="group relative mt-4 min-h-[48px] w-full overflow-hidden rounded-[1.8rem] bg-[linear-gradient(130deg,#8a5a2b,#d88a35,#7f8f52)] py-4 text-lg font-black text-white shadow-[0_15px_30px_rgba(111,66,29,0.35)] transition-all active:scale-[0.98] disabled:opacity-50 hover:scale-[1.01]"
      >
        <div className="absolute inset-0 translate-x-[-100%] bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.18),transparent)] group-hover:animate-[shimmer_2s_infinite]" />
        <span className="relative inline-flex items-center gap-2">
          <span className="text-[20px]">🐾</span>
          {isBusy ? "별의 흐름을 읽는 중..." : isUnlocked ? "결과 보기" : "100 COINS로 운명 확인하기"}
        </span>
      </button>

      <p className="text-center text-[11px] font-semibold italic text-[#8a5a2b]">
        정밀 사주 엔진이 당신의 십이운성을 계산합니다.
      </p>
    </section>
  );
}

