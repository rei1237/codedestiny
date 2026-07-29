"use client";

/**
 * 생년 정보 입력.
 *
 * 공용 훅 useAiProfileSeed 로 현재 선택된 프로필 카드에서 자동 프리필한다.
 * 사용자가 이미 손댄 값은 덮어쓰지 않는다(빈 값만 채움).
 * 입력 박스를 두지 않는다 — 필드는 잉크 위에 놓이고 아래 헤어라인만 남는다.
 */

import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import CodexReveal from "./CodexReveal";
import styles from "../styles/codex.module.css";

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

  const labelClass = "mb-1 block text-[0.6875rem] tracking-[0.2em]";
  const labelStyle = { color: "var(--codex-gold-dim)" } as const;

  return (
    <section className="flex min-h-[100svh] flex-col justify-center py-16" aria-label="생년 정보 입력">
      <div className={styles.measure}>
        <CodexReveal>
          <p className={`${styles.numeral} text-[0.6875rem]`} style={{ letterSpacing: "0.28em", color: "var(--codex-gold-dim)" }}>
            THE FIRST PAGE
          </p>
          <h2 className={`${styles.chapterTitle} mt-4`}>당신의 명식과 명반을 세우겠습니다</h2>
          <p className="mt-5 max-w-[38ch] text-[0.9375rem] leading-8" style={{ color: "var(--codex-ink-text-muted)" }}>
            태어난 순간의 좌표가 있어야 스무 장을 채울 수 있습니다. 프로필 카드가 있으면 자동으로 채워집니다.
          </p>
          <hr className={`${styles.rule} mt-9`} />
        </CodexReveal>

        <CodexReveal index={1} className="mt-10 space-y-9">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleReload()}
              disabled={reloading}
              className={`${styles.quiet} inline-flex items-center gap-1.5`}
            >
              {reloading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-3 w-3" aria-hidden="true" />}
              프로필 카드에서 불러오기
            </button>
          </div>

          <div>
            <label className={labelClass} style={labelStyle} htmlFor="codex-name">이름 (선택)</label>
            <input
              id="codex-name"
              className={styles.field}
              value={value.name}
              maxLength={20}
              placeholder="표지에 새겨집니다"
              onChange={(event) => patch({ name: event.target.value })}
            />
          </div>

          <fieldset>
            <legend className={labelClass} style={labelStyle}>성별</legend>
            <div className="flex gap-2">
              {([["female", "여성"], ["male", "남성"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={value.gender === key}
                  onClick={() => patch({ gender: key })}
                  className={`${styles.choice} flex-1`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className={labelClass} style={labelStyle} htmlFor="codex-birth-date">생년월일</label>
            <input
              id="codex-birth-date"
              type="date"
              className={styles.field}
              value={value.birthDate}
              onChange={(event) => patch({ birthDate: event.target.value })}
            />
          </div>

          <fieldset>
            <legend className={labelClass} style={labelStyle}>양력 / 음력</legend>
            <div className="flex gap-2">
              {([["solar", "양력"], ["lunar", "음력"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={value.calendarType === key}
                  onClick={() => patch({ calendarType: key, isLeapMonth: key === "lunar" ? value.isLeapMonth : false })}
                  className={`${styles.choice} flex-1`}
                >
                  {label}
                </button>
              ))}
            </div>
            {value.calendarType === "lunar" ? (
              <label className="mt-3 flex items-center gap-2 text-[0.8125rem]" style={{ color: "var(--codex-ink-text-muted)" }}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#e8d5a3]"
                  checked={value.isLeapMonth}
                  onChange={(event) => patch({ isLeapMonth: event.target.checked })}
                />
                윤달입니다
              </label>
            ) : null}
          </fieldset>

          <div>
            <label className={labelClass} style={labelStyle} htmlFor="codex-birth-time">태어난 시각</label>
            <input
              id="codex-birth-time"
              type="time"
              className={styles.field}
              value={value.birthTime}
              disabled={value.birthTimeUnknown}
              onChange={(event) => patch({ birthTime: event.target.value })}
            />
            <label className="mt-3 flex items-center gap-2 text-[0.8125rem]" style={{ color: "var(--codex-ink-text-muted)" }}>
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#e8d5a3]"
                checked={value.birthTimeUnknown}
                onChange={(event) => patch({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : value.birthTime })}
              />
              태어난 시각을 모릅니다
            </label>
            <p className="mt-2 text-[0.75rem] leading-6" style={{ color: "var(--codex-ink-text-muted)" }}>
              시각을 모르면 시주를 뺀 채로 읽습니다. 큰 흐름은 그대로지만 세부는 조금 흐려집니다.
            </p>
          </div>
        </CodexReveal>

        {error ? (
          <p role="alert" className="mt-9 text-[0.875rem] leading-7" style={{ color: "#ffb4b4" }}>{error}</p>
        ) : null}

        <CodexReveal index={2} className="mt-12 flex flex-col items-center gap-5">
          <button type="button" onClick={onSubmit} disabled={busy} className={styles.cta}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? busyLabel : "비책 펼치기"}
          </button>
          {priceSlot}
        </CodexReveal>
      </div>
    </section>
  );
}
