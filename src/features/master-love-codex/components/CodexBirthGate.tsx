"use client";

/**
 * 마스터 운명 연애 비책 — 생년 정보 입력.
 *
 * 공용 훅 useAiProfileSeed 로 현재 선택된 프로필 카드에서 자동 프리필한다.
 * 사용자가 이미 손댄 값은 덮어쓰지 않는다(빈 값만 채움).
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { masterLoveCodexAssets } from "../data/assets";

export interface CodexBirthInput {
  name: string;
  gender: "male" | "female" | "";
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
}

export const EMPTY_CODEX_BIRTH: CodexBirthInput = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  isLeapMonth: false,
};

interface CodexBirthGateProps {
  value: CodexBirthInput;
  onChange: (next: CodexBirthInput) => void;
  onSubmit: () => void;
  busy: boolean;
  busyLabel: string;
  error: string;
  priceSlot?: React.ReactNode;
}

export default function CodexBirthGate({ value, onChange, onSubmit, busy, busyLabel, error, priceSlot }: CodexBirthGateProps) {
  const { seed, seedVersion, reload } = useAiProfileSeed();
  const [reloading, setReloading] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  // 프로필 카드 → 빈 칸만 채운다. 사용자가 이미 입력·수정한 값은 유지한다.
  useEffect(() => {
    if (!seed) return;
    const current = valueRef.current;
    const next: CodexBirthInput = {
      ...current,
      name: current.name || (seed.name || ""),
      gender: current.gender || (seed.gender === "male" || seed.gender === "female" ? seed.gender : ""),
      birthDate: current.birthDate || (seed.birthDate || ""),
      birthTime: current.birthTime || (seed.birthTime || ""),
      birthTimeUnknown: current.birthTime ? current.birthTimeUnknown : Boolean(seed.birthTimeUnknown),
      calendarType: current.calendarType !== "solar" ? current.calendarType : (seed.calendarType === "lunar" ? "lunar" : "solar"),
    };
    if (JSON.stringify(next) !== JSON.stringify(current)) onChange(next);
    // seedVersion 이 바뀔 때만 재적용한다(프로필 전환 반영).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  function patch(partial: Partial<CodexBirthInput>) {
    onChange({ ...value, ...partial });
  }

  async function handleReload() {
    setReloading(true);
    try { await reload(); } finally { setReloading(false); }
  }

  const inputClass =
    "w-full rounded-xl border border-rose-100/20 bg-[#0d0714]/70 px-3.5 py-2.5 text-sm text-rose-50 outline-none transition placeholder:text-rose-100/35 focus:border-amber-200/60 focus:ring-2 focus:ring-amber-200/25";
  const labelClass = "mb-1.5 block text-xs font-bold text-amber-100/80";

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#0d0714]" aria-label="생년 정보 입력">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url("${masterLoveCodexAssets.backgrounds.libraryDeep}")` }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0d0714]/90 via-[#0d0714]/75 to-[#0d0714]" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-lg px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-[11px] font-black tracking-[0.3em] text-amber-100/75">MASTER DESTINY</p>
        <h2 className="font-display mt-2 text-2xl font-black text-rose-50 sm:text-3xl">당신의 명식과 명반을 세우겠습니다</h2>
        <p className="mt-3 text-sm leading-7 text-rose-50/75">
          태어난 순간의 좌표가 있어야 스무 장을 채울 수 있습니다. 프로필 카드가 있으면 자동으로 채워집니다.
        </p>

        <div className="mt-6 space-y-4 rounded-2xl border border-rose-100/15 bg-[#150b1e]/80 p-5 backdrop-blur-sm">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleReload()}
              disabled={reloading}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/30 px-3 py-1 text-[11px] font-bold text-amber-100/85 transition hover:border-amber-200/60 disabled:opacity-60"
            >
              {reloading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
              프로필 카드에서 불러오기
            </button>
          </div>

          <div>
            <label className={labelClass} htmlFor="codex-name">이름 (선택)</label>
            <input
              id="codex-name"
              className={inputClass}
              value={value.name}
              maxLength={20}
              placeholder="비책 표지에 새겨집니다"
              onChange={(event) => patch({ name: event.target.value })}
            />
          </div>

          <fieldset>
            <legend className={labelClass}>성별</legend>
            <div className="grid grid-cols-2 gap-2">
              {([["female", "여성"], ["male", "남성"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={value.gender === key}
                  onClick={() => patch({ gender: key })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                    value.gender === key
                      ? "border-amber-200/70 bg-amber-200/15 text-amber-50"
                      : "border-rose-100/20 text-rose-50/80 hover:border-amber-200/45"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className={labelClass} htmlFor="codex-birth-date">생년월일</label>
            <input
              id="codex-birth-date"
              type="date"
              className={inputClass}
              value={value.birthDate}
              onChange={(event) => patch({ birthDate: event.target.value })}
            />
          </div>

          <fieldset>
            <legend className={labelClass}>양력 / 음력</legend>
            <div className="grid grid-cols-2 gap-2">
              {([["solar", "양력"], ["lunar", "음력"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={value.calendarType === key}
                  onClick={() => patch({ calendarType: key, isLeapMonth: key === "lunar" ? value.isLeapMonth : false })}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                    value.calendarType === key
                      ? "border-amber-200/70 bg-amber-200/15 text-amber-50"
                      : "border-rose-100/20 text-rose-50/80 hover:border-amber-200/45"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {value.calendarType === "lunar" ? (
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-rose-50/75">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-amber-300"
                  checked={value.isLeapMonth}
                  onChange={(event) => patch({ isLeapMonth: event.target.checked })}
                />
                윤달입니다
              </label>
            ) : null}
          </fieldset>

          <div>
            <label className={labelClass} htmlFor="codex-birth-time">태어난 시각</label>
            <input
              id="codex-birth-time"
              type="time"
              className={inputClass}
              value={value.birthTime}
              disabled={value.birthTimeUnknown}
              onChange={(event) => patch({ birthTime: event.target.value })}
            />
            <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-rose-50/75">
              <input
                type="checkbox"
                className="h-4 w-4 accent-amber-300"
                checked={value.birthTimeUnknown}
                onChange={(event) => patch({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : value.birthTime })}
              />
              태어난 시각을 모릅니다
            </label>
            <p className="mt-1.5 text-[11px] leading-5 text-rose-100/50">
              시각을 모르면 시주를 뺀 채로 읽습니다. 큰 흐름은 그대로지만 세부는 조금 흐려집니다.
            </p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
        ) : null}

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-200 via-rose-200 to-amber-100 px-6 py-3.5 text-sm font-black text-[#2b1020] shadow-[0_18px_38px_-16px_rgba(255,214,150,.7)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? busyLabel : "비책 펼치기"}
          </button>
          {priceSlot}
        </div>
      </div>
    </section>
  );
}
