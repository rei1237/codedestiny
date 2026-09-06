"use client";

import DiaryMoodPicker from "./DiaryMoodPicker";
import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import { writeMemo } from "../_lib/entry-writes";
import { useDiaryDraft } from "../_lib/use-diary-draft";
import styles from "../_styles/diary.module.css";

/**
 * 홈 ② 오늘의 나. 기분과 한 줄 메모를 여기서 바로 쓴다(PR-E).
 *
 * 🔴 저장 버튼이 없다 — 메모는 입력이 멈추면 저장한다(`../_lib/use-diary-draft.ts`).
 * 기분 목록과 저장 필드는 `DiaryMoodPicker` 하나가 들고 있다(셸과 같은 6개).
 */

const DIARY_SELF_CARD_TEXT = {
  ko: {
    title: "오늘의 나",
    loading: "오늘의 기록을 불러오는 중입니다.",
    affirmationEmpty: "오늘의 한 문장이 아직 비어 있습니다.",
    done: "완료",
    todo: "미완료",
    moodLabel: "오늘의 기분",
    moodEmpty: "아직 고르지 않았습니다.",
    memoPlaceholder: "한 줄 메모",
  },
  en: {
    title: "Today's self",
    loading: "Loading today's entry.",
    affirmationEmpty: "Today's sentence is still empty.",
    done: "Done",
    todo: "Not yet",
    moodLabel: "Today's mood",
    moodEmpty: "Not chosen yet.",
    memoPlaceholder: "One line memo",
  },
} as const;

const copy = DIARY_SELF_CARD_TEXT.ko;

export default function DiarySelfCard() {
  const { hydrated, ymd, entry } = useDiaryToday();
  const { updateEntry } = useDiaryWriter();
  const affirmation = entry?.iAmAffirmation?.trim() || "";
  const mood = entry?.moodEmoji || "";
  const memo = useDiaryDraft(entry?.memoNote || "", (next) => {
    updateEntry(ymd, writeMemo(next));
  });

  return (
    <section className={styles.card} aria-label={copy.title}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{copy.title}</h2>
        {hydrated ? (
          <span className={entry?.iAmCompleted ? styles.cardMetaDone : styles.cardMeta}>
            {entry?.iAmCompleted ? copy.done : copy.todo}
          </span>
        ) : null}
      </header>

      {!hydrated ? (
        <p className={styles.empty}>{copy.loading}</p>
      ) : (
        <>
          <p className={affirmation ? styles.iam : styles.empty}>
            {affirmation || copy.affirmationEmpty}
          </p>

          <p className={styles.fieldLabel}>{copy.moodLabel}</p>
          <DiaryMoodPicker ymd={ymd} mood={mood} label={copy.moodLabel} />
          {!mood ? <p className={styles.emptySmall}>{copy.moodEmpty}</p> : null}

          <input
            className={styles.input}
            type="text"
            value={memo.value}
            onChange={(event) => memo.onChange(event.target.value)}
            onBlur={memo.flush}
            placeholder={copy.memoPlaceholder}
            aria-label={copy.memoPlaceholder}
          />
        </>
      )}
    </section>
  );
}
