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
  return (
    <section className="space-y-3 rounded-2xl border border-[#dce8d4] bg-white/70 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold text-[#35523d]">
          이름/닉네임
          <input
            value={input.name || ""}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 20) })}
            placeholder="예: 달빛치타"
            className="w-full rounded-xl border border-[#bcd0b7] bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-[#35523d]">
          생년월일
          <input
            type="date"
            value={input.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
            className="w-full rounded-xl border border-[#bcd0b7] bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-[#35523d]">
          태어난 시간 (선택)
          <input
            type="time"
            value={input.birthTime || ""}
            onChange={(e) => onChange({ birthTime: e.target.value })}
            className="w-full rounded-xl border border-[#bcd0b7] bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-[#35523d]">
          성별
          <select
            value={input.gender}
            onChange={(e) => onChange({ gender: e.target.value as AnimalDestinyInput["gender"] })}
            className="w-full rounded-xl border border-[#bcd0b7] bg-white px-3 py-2 text-sm"
          >
            <option value="unknown">미선택</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isBusy}
          className="rounded-full bg-[#ff8a65] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          수호 동물 소환하기
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isBusy}
          className="rounded-full bg-[#5ac8a8] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          알 부화 시작
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isBusy}
          className="rounded-full bg-[#607d8b] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          내 동물점 보기
        </button>
      </div>
    </section>
  );
}
