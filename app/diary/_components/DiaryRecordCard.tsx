"use client";

import { readExtDay } from "../_lib/ext-snapshot";
import { readAchievement } from "../_lib/today-snapshot";
import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import { writeOneLine } from "../_lib/entry-writes";
import { useDiaryDraft } from "../_lib/use-diary-draft";
import styles from "../_styles/diary.module.css";

/**
 * 홈 ④ 오늘의 기록. 오늘 한 줄을 여기서 바로 쓴다(PR-E).
 *
 * 🔴 한 줄은 `practiceNote` 와 `nightLog` 에 함께 들어간다 — 셸이 그렇게 쓰기 때문이고,
 * 그 쌍은 `../_lib/entry-writes.ts` 의 `writeOneLine` 하나가 들고 있다.
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
  },
  en: {
    title: "Today's entry",
    loading: "Loading today's entry.",
    notePlaceholder: "One line for today",
    noteEmpty: "Nothing written for today yet.",
    achievement: "Today's progress",
  },
} as const;

const copy = DIARY_RECORD_CARD_TEXT.ko;

export default function DiaryRecordCard() {
  const { hydrated, ymd, entry, ext } = useDiaryToday();
  const { updateEntry } = useDiaryWriter();
  const note = useDiaryDraft(entry?.practiceNote || entry?.nightLog || "", (next) => {
    updateEntry(ymd, writeOneLine(next));
  });
  const { done, total } = readAchievement(entry, readExtDay(ext, ymd));
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
          <input
            className={styles.input}
            type="text"
            value={note.value}
            onChange={(event) => note.onChange(event.target.value)}
            onBlur={note.flush}
            placeholder={copy.notePlaceholder}
            aria-label={copy.notePlaceholder}
          />
          {!note.value.trim() ? <p className={styles.emptySmall}>{copy.noteEmpty}</p> : null}

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
