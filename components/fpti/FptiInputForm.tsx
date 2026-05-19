"use client";

import type { FptiFormInput } from "@/lib/fpti/fpti-types";

type Props = {
  value: FptiFormInput;
  onChange: (next: FptiFormInput) => void;
  onSubmit: () => void;
  busy?: boolean;
};

export default function FptiInputForm({ value, onChange, onSubmit, busy }: Props) {
  const update = <K extends keyof FptiFormInput>(key: K, next: FptiFormInput[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">출생 정보 입력</h2>
        <p className="mt-1 text-sm text-slate-600">시간을 모르면 체크만 해도 기본 해석은 가능합니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-700">이름</span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
            placeholder="예: 홍길동"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-700">성별(선택)</span>
          <select
            value={value.gender || "OTHER"}
            onChange={(e) => update("gender", e.target.value as FptiFormInput["gender"])}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
          >
            <option value="OTHER">선택 안함</option>
            <option value="M">남성</option>
            <option value="F">여성</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-700">생년월일</span>
          <input
            type="date"
            value={value.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-700">양력 / 음력</span>
          <select
            value={value.calendarType}
            onChange={(e) => update("calendarType", e.target.value as "solar" | "lunar")}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-700">출생 시간</span>
          <input
            type="time"
            value={value.birthTime}
            onChange={(e) => update("birthTime", e.target.value)}
            disabled={value.timeUnknown}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-slate-700">출생지(선택)</span>
          <input
            type="text"
            value={value.birthRegion || ""}
            onChange={(e) => update("birthRegion", e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
            placeholder="예: 서울"
          />
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.timeUnknown}
          onChange={(e) => update("timeUnknown", e.target.checked)}
          className="h-4 w-4"
        />
        태어난 시간을 모름 (시주 제외, 신뢰도 보수 반영)
      </label>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          disabled={busy || !value.name || !value.birthDate}
          onClick={onSubmit}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busy ? "분석 중..." : "FPTI 결과 보기"}
        </button>
        <p className="self-center text-xs text-slate-500">무료: 핵심 타입 분석 / 유료: 궁합 + 커리어 + 연애 심층</p>
      </div>
    </section>
  );
}
