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

  const fieldClass =
    "h-12 w-full rounded-2xl border border-[#E9C46A]/35 bg-[#0b1026]/60 px-4 text-[15px] text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-[#F6D365] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.22)]";

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/15 bg-[linear-gradient(155deg,rgba(11,16,38,0.92),rgba(19,10,42,0.88))] p-5 shadow-[0_20px_55px_rgba(3,7,23,0.55)] backdrop-blur-xl md:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,rgba(96,165,250,0.28),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(246,211,101,0.2),transparent_44%)]" />

      <div className="relative mb-4">
        <h2 className="text-xl font-semibold text-[#F8FAFC]">출생 정보 입력</h2>
        <p className="mt-1 text-sm text-[#CBD5E1]">입력은 간단하게, 분석은 깊게 진행됩니다.</p>
      </div>

      <div className="relative grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">이름 또는 닉네임</span>
          <input
            type="text"
            value={value.name}
            onChange={(e) => update("name", e.target.value)}
            className={fieldClass}
            placeholder="예: 홍길동"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">성별 (선택)</span>
          <select
            value={value.gender || "OTHER"}
            onChange={(e) => update("gender", e.target.value as FptiFormInput["gender"])}
            className={fieldClass}
          >
            <option value="OTHER">선택 안함</option>
            <option value="M">남성</option>
            <option value="F">여성</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">생년월일</span>
          <input
            type="date"
            value={value.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">양력 / 음력</span>
          <select
            value={value.calendarType}
            onChange={(e) => update("calendarType", e.target.value as "solar" | "lunar")}
            className={fieldClass}
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">태어난 시간</span>
          <input
            type="time"
            value={value.birthTime}
            onChange={(e) => update("birthTime", e.target.value)}
            disabled={value.timeUnknown}
            className={`${fieldClass} disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-900/70`}
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[#dbe5ff]">태어난 지역 (선택)</span>
          <input
            type="text"
            value={value.birthRegion || ""}
            onChange={(e) => update("birthRegion", e.target.value)}
            className={fieldClass}
            placeholder="예: 서울"
          />
        </label>
      </div>

      <label className="relative mt-3 flex items-center gap-2 text-sm text-[#dbe5ff]">
        <input
          type="checkbox"
          checked={value.timeUnknown}
          onChange={(e) => update("timeUnknown", e.target.checked)}
          className="h-4 w-4"
        />
        태어난 시간을 모름 (시주 제외)
      </label>

      {value.timeUnknown && (
        <p className="relative mt-2 rounded-xl border border-amber-200/30 bg-amber-200/10 p-3 text-xs text-amber-100">
          태어난 시간을 모르면 일부 분석은 간략화되며, FPTI 정확도가 낮아질 수 있습니다.
        </p>
      )}

      <div className="relative mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || !value.name || !value.birthDate}
          onClick={onSubmit}
          className="h-12 rounded-full bg-[linear-gradient(120deg,#7C3AED,#4C1D95,#F6D365)] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(124,58,237,0.4)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "분석 중..." : "성격 유형 분석 시작하기"}
        </button>
        <p className="self-center text-xs text-[#CBD5E1]">무료 결과 + 공유 카드 제공, 심층 리포트는 하단에서 확장</p>
      </div>
    </section>
  );
}
