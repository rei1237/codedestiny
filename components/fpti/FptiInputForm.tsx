"use client";

import type { FptiFormInput } from "@/lib/fpti/fpti-types";
import styles from "./FptiCosmic.module.css";

type Props = {
  value: FptiFormInput;
  onChange: (next: FptiFormInput) => void;
  onSubmit: () => void;
  busy?: boolean;
  autoReady?: boolean;
  autoRunning?: boolean;
};

export default function FptiInputForm({ value, onChange, onSubmit, busy, autoReady, autoRunning }: Props) {
  const update = <K extends keyof FptiFormInput>(key: K, next: FptiFormInput[K]) => {
    onChange({ ...value, [key]: next });
  };

  const fieldClass =
    `${styles.inputShell} h-12 w-full rounded-2xl px-4 text-[15px]`;

  return (
    <section className={`${styles.glassPanel} relative overflow-hidden rounded-[30px] p-5 md:p-7`}>
      <div className={`${styles.starLayerSoft} absolute inset-0`} aria-hidden />

      <div className="relative mb-4">
        <h2 className="text-xl font-semibold text-[#f8fbff]">출생 정보 입력</h2>
        <p className="mt-1 text-sm text-[#d8d5ff]">입력값이 유효해지는 즉시 사주 계산이 자동 실행됩니다.</p>
      </div>

      <div className="relative mb-4 flex flex-wrap gap-2 text-xs">
        <span className={`${styles.autoBadge} rounded-full px-3 py-1 text-violet-100`}>입력 감지 자동 모드</span>
        <span className="rounded-full border border-indigo-200/35 bg-indigo-500/20 px-3 py-1 text-indigo-100">
          {autoRunning ? "사주 계산 진행 중" : autoReady ? "자동 계산 준비 완료" : "필수 입력 대기 중"}
        </span>
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
            onChange={(e) => update("calendarType", e.target.value as FptiFormInput["calendarType"])}
            className={fieldClass}
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
            <option value="lunar_leap">음력(윤달)</option>
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
          disabled={busy || !value.birthDate || (!value.timeUnknown && !value.birthTime)}
          onClick={onSubmit}
          className={`${styles.ctaButton} h-12 rounded-full px-6 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45`}
        >
          {busy ? "분석 중..." : "성격 유형 분석 시작하기"}
        </button>
        <p className="self-center text-xs text-[#d8d5ff]">무료 결과 + 공유 카드 제공, 심층 리포트는 하단에서 확장</p>
      </div>
    </section>
  );
}
