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
  return (
    <section className="space-y-4 rounded-2xl border border-[#dce8d4] bg-white/70 p-4">
      <div className="space-y-1">
        <h2 className="text-base font-black text-[#2d3e2c]">생년월일 입력</h2>
        <p className="text-xs text-[#5a7060]">
          사주 엔진이 일간·지지·십이운성을 계산합니다. 랜덤이 아닌 명리학 기반 분석이에요.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold text-[#35523d]">
          이름/닉네임 (선택)
          <input
            value={input.name || ""}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 20) })}
            placeholder="예: 달빛여우"
            className="w-full rounded-xl border border-[#bcd0b7] bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1 text-sm font-semibold text-[#35523d]">
          생년월일 <span className="text-[#e55]">*</span>
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
          <span className="block text-xs font-normal text-[#7a9080]">
            시간 입력 시 시주(時柱)까지 계산합니다
          </span>
        </label>

        <label className="space-y-1 text-sm font-semibold text-[#35523d]">
          성별 (선택)
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

      <button
        onClick={onSubmit}
        disabled={!canSubmit || isBusy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#4a9e5c] to-[#3d8b8b] px-6 py-3 text-sm font-bold text-white shadow-md disabled:opacity-60 active:scale-[0.98]"
      >
        {isBusy ? "계산 중..." : <><DestinyIcon name="animalPaw" size={16} className="text-white" variant="soft" />내 사주 동물 찾기</>}
      </button>

      <p className="text-center text-xs text-[#7a9080]">
        입력한 생년월일의 일간·지지·십이운성을 로컬 명리 계산으로 분석합니다
      </p>
    </section>
  );
}

