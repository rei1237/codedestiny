"use client";

import { readAchievement } from "../_lib/today-snapshot";
import { useDiaryToday } from "./DiaryStoreProvider";
import styles from "../_styles/diary.module.css";

/**
 * 홈 ④ 오늘의 기록. 🔴 읽기 전용이다 — 입력은 PR-E 에서 붙는다.
 *
 * 성취 바의 분모는 `readAchievement` 가 셸과 같은 순서로 고른다(`challengeTotalToday` 우선).
 * 태그는 저장 스키마가 아직 없어 PR-G 에서 붙는다 — 여기에 빈 태그 줄을 먼저 만들지 않는다.
 */

const DIARY_RECORD_CARD_TEXT = {
  ko: {
    title: "오늘의 기록",
    loading: "오늘의 기록을 불러오는 중입니다.",
    notePlaceholder: "오늘 한 줄",
    noteEmpty: "오늘 적은 기록이 아직 없습니다.",
    achievement: "오늘의 성취",
    pending: "준비 중입니다",
  },
  en: {
    title: "Today's entry",
    loading: "Loading today's entry.",
    notePlaceholder: "One line for today",
    noteEmpty: "Nothing written for today yet.",
    achievement: "Today's progress",
    pending: "Coming soon",
  },
} as const;

const copy = DIARY_RECORD_CARD_TEXT.ko;

export default function DiaryRecordCard() {
  const { hydrated, entry } = useDiaryToday();
  const note = (entry?.practiceNote || entry?.nightLog || "").trim();
  const { done, total } = readAchievement(entry);
  const percent = total > 0 ? Math.round((Math.min(done, total) / total) * 100) : 0;

  return (
    <section className={styles.card} aria-label={copy.title}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{copy.title}</h2>
      </header>

      {!hydrated ? (
        <p className={styles.empty}>{copy.loading}</p>
      ) : (
        <>
          {/* PR-E 에서 저장이 붙는다. 그전까지는 값만 보여 주고 입력을 막는다. */}
          <input
            className={styles.input}
            type="text"
            value={note}
            readOnly
            disabled
            placeholder={`${copy.notePlaceholder} — ${copy.pending}`}
            aria-label={copy.notePlaceholder}
          />
          {!note ? <p className={styles.emptySmall}>{copy.noteEmpty}</p> : null}

          <p className={styles.fieldLabel}>
            {copy.achievement}
            <span className={styles.achieveCount}>
              {done}/{total} · {percent}%
            </span>
          </p>
          <div
            className={styles.achieveTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.min(done, total)}
            aria-label={copy.achievement}
          >
            <span className={styles.achieveFill} style={{ width: `${percent}%` }} />
          </div>
        </>
      )}
    </section>
  );
}
