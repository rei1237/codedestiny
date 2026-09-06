"use client";

import { readExtDay, readTags } from "../_lib/ext-snapshot";
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
 *
 * 🔴 태그는 **읽기 전용 표시**다(PR-G) — 다는 자리는 Day View 「기록」 탭 하나이고
 * (`DiaryTagField`), 홈에도 입력을 두면 같은 것을 고치는 자리가 둘이 된다.
 * 오늘 태그가 없으면 줄 자체를 그리지 않는다(빈 태그 줄을 먼저 만들지 않는다).
 */

const DIARY_RECORD_CARD_TEXT = {
  ko: {
    title: "오늘의 기록",
    loading: "오늘의 기록을 불러오는 중입니다.",
    notePlaceholder: "오늘 한 줄",
    noteEmpty: "오늘 적은 기록이 아직 없습니다.",
    tags: "오늘의 태그",
    achievement: "오늘의 성취",
  },
  en: {
    title: "Today's entry",
    loading: "Loading today's entry.",
    notePlaceholder: "One line for today",
    noteEmpty: "Nothing written for today yet.",
    tags: "Today's tags",
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
  const extDay = readExtDay(ext, ymd);
  const tags = readTags(extDay);
  const { done, total } = readAchievement(entry, extDay);
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

          {tags.length > 0 ? (
            <p className={styles.recTags} aria-label={copy.tags}>
              {tags.map((tag) => (
                <span key={tag} className={styles.recTag}>
                  {tag}
                </span>
              ))}
            </p>
          ) : null}

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
