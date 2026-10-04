"use client";

import { useId } from "react";
import type { CalendarType, ChemiPartnerRecord } from "@/lib/idol-chemi";
import styles from "../../destiny-bias.module.css";
import art from "../../stage-art.module.css";

export type MyInfoValue = {
  birthDateInput: string; // YYYYMMDD 8자리
  calendarType: CalendarType;
};

type Props = {
  partner: ChemiPartnerRecord;
  value: MyInfoValue;
  error: string;
  seededFromProfile: boolean;
  onChange: (next: MyInfoValue) => void;
  onSubmit: () => void;
  onBack: () => void;
};

const CALENDAR_OPTIONS: Array<{ value: CalendarType; label: string }> = [
  { value: "solar", label: "양력" },
  { value: "lunar", label: "음력" },
  { value: "lunar_leap", label: "음력 윤달" },
];

export function formatBirthdayPreview(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 8) return "";
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

export default function MyInfoPanel({ partner, value, error, seededFromProfile, onChange, onSubmit, onBack }: Props) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const preview = formatBirthdayPreview(value.birthDateInput);

  return (
    <section className={styles.infoPanel} aria-labelledby="dbk-info-title">
      <div className={`${art.band} ${art.bandBackstage}`} aria-hidden>
        <p className={art.bandLabel}>
          Backstage
          <b>Your ticket</b>
        </p>
      </div>
      <div className={styles.stepHeader}>
        <button type="button" className={styles.backLink} onClick={onBack}>
          ← 최애 다시 고르기
        </button>
        <p className={styles.stepLabel}>STEP 2 / 3</p>
      </div>
      <h2 id="dbk-info-title" className={styles.stepTitle}>
        <span className={styles.partnerPill}>
          {partner.displayName}
          <small>{partner.groupLabel}</small>
        </span>
        <span>— 나와 비교할 내 생일</span>
      </h2>

      <form
        className={styles.infoForm}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <label htmlFor={inputId} className={styles.fieldLabel}>
          생년월일 <small>8자리</small>
        </label>
        <input
          id={inputId}
          className={`${styles.textInput} ${error ? styles.textInputError : ""}`}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          maxLength={8}
          placeholder="19970901"
          value={value.birthDateInput}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange({ ...value, birthDateInput: e.target.value.replace(/\D/g, "").slice(0, 8) })}
        />
        <p className={styles.fieldHint} aria-live="polite">
          {preview ? `${preview} · ${CALENDAR_OPTIONS.find((c) => c.value === value.calendarType)?.label}` : "예: 1997년 9월 1일 → 19970901"}
          {seededFromProfile ? " · 프로필 카드에서 불러왔어요" : ""}
        </p>
        {error ? (
          <p id={errorId} className={styles.fieldError} role="alert">
            {error}
          </p>
        ) : null}

        <fieldset className={styles.segmented}>
          <legend className={styles.fieldLabel}>달력</legend>
          {CALENDAR_OPTIONS.map((opt) => (
            <label key={opt.value} className={`${styles.segment} ${value.calendarType === opt.value ? styles.segmentActive : ""}`}>
              <input
                type="radio"
                name="dbk-calendar"
                value={opt.value}
                checked={value.calendarType === opt.value}
                onChange={() => onChange({ ...value, calendarType: opt.value })}
              />
              {opt.label}
            </label>
          ))}
        </fieldset>

        <p className={styles.noteBox}>
          출생 시간은 받지 않아요. 최애의 출생 시간이 공개 정보가 아니라, 공정하게 양쪽 모두 연·월·일주 세 기둥으로만 비교해요. 생일은 이 기기 안에서만 쓰이고 카드·링크·서버 저장에 들어가지 않아요.
        </p>

        <button type="submit" className={`${styles.ctaPrimary} ${styles.inlineCta}`}>
          케미 계산하기
        </button>
      </form>
    </section>
  );
}
