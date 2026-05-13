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
    <section className="space-y-5 rounded-[1.5rem] border border-cyan-100/20 bg-[linear-gradient(155deg,rgba(9,28,55,0.8),rgba(15,22,50,0.72))] p-5 shadow-[0_16px_42px_rgba(3,12,34,0.35)]">
      <div className="space-y-1.5">
        <h2 className="text-lg font-black text-cyan-50">출생 정보 입력</h2>
        <p className="text-xs leading-relaxed text-cyan-100/85">
          입력한 날짜를 기준으로 사주 사기둥을 정밀 계산합니다. 음력 출생이면 달력 타입을 음력으로 바꿔 주세요.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold text-cyan-100">
          이름/닉네임 (선택)
          <input
            value={input.name || ""}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 20) })}
            placeholder="예: 달빛여우"
            className="w-full rounded-xl border border-cyan-100/35 bg-cyan-50/10 px-3 py-2 text-sm text-cyan-50 placeholder:text-cyan-100/45"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-cyan-100">
          출생일 <span className="text-rose-300">*</span>
          <input
            type="date"
            value={input.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
            className="w-full rounded-xl border border-cyan-100/35 bg-cyan-50/10 px-3 py-2 text-sm text-cyan-50"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-cyan-100">
          달력 타입
          <select
            value={input.calendarType || "solar"}
            onChange={(e) => onChange({ calendarType: e.target.value as AnimalDestinyInput["calendarType"] })}
            className="w-full rounded-xl border border-cyan-100/35 bg-cyan-50/10 px-3 py-2 text-sm text-cyan-50"
          >
            <option value="solar" className="text-slate-900">양력 (기본)</option>
            <option value="lunar" className="text-slate-900">음력</option>
          </select>
        </label>

        <label className="space-y-1 text-sm font-semibold text-cyan-100">
          태어난 시간 (선택)
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => onChange({ birthTime: e.target.value })}
            className="w-full rounded-xl border border-cyan-100/35 bg-cyan-50/10 px-3 py-2 text-sm text-cyan-50"
          />
          <span className="block text-xs font-normal text-cyan-100/70">
            시간 입력 시 시주까지 계산되어 결과 정확도가 올라갑니다.
          </span>
        </label>

        <label className="space-y-1 text-sm font-semibold text-cyan-100">
          성별 (선택)
          <select
            value={input.gender}
            onChange={(e) => onChange({ gender: e.target.value as AnimalDestinyInput["gender"] })}
            className="w-full rounded-xl border border-cyan-100/35 bg-cyan-50/10 px-3 py-2 text-sm text-cyan-50"
          >
            <option value="unknown" className="text-slate-900">미선택</option>
            <option value="female" className="text-slate-900">여성</option>
            <option value="male" className="text-slate-900">남성</option>
          </select>
        </label>

        {isLunar ? (
          <label className="flex items-center gap-2 rounded-xl border border-fuchsia-100/25 bg-fuchsia-100/10 px-3 py-2 text-sm font-semibold text-fuchsia-100 md:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(input.lunarLeap)}
              onChange={(e) => onChange({ lunarLeap: e.target.checked })}
              className="h-4 w-4 accent-fuchsia-300"
            />
            윤달 출생이면 체크
          </label>
        ) : null}
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isBusy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[linear-gradient(120deg,#27d9f5,#8887ff,#f57cd1)] px-6 py-3 text-sm font-bold text-[#071228] shadow-[0_14px_28px_rgba(67,188,255,0.35)] disabled:opacity-60 active:scale-[0.985]"
      >
        {isBusy ? "성좌를 해석하는 중..." : <><DestinyIcon name="animalPaw" size={16} className="text-[#071228]" variant="soft" />내 수호 동물 소환하기</>}
      </button>

      <p className="text-center text-xs text-cyan-100/70">
        계산 기준: 사주 사기둥(년·월·일·시) + 일간 대비 지지 십이운성
      </p>
    </section>
  );
}

