"use client";

import { useDiaryToday } from "./DiaryStoreProvider";
import styles from "../_styles/diary.module.css";

/**
 * 홈 ② 오늘의 나. 🔴 읽기 전용이다 — 쓰기는 PR-E 에서 붙으므로 입력 요소는 전부 `disabled` 로
 * 그린다(자리를 비워 두면 PR-E 에서 레이아웃이 통째로 흔들린다).
 *
 * 🔴 기분 이모지 목록은 셸 `js/luck-sync-diary.js:3850-3855` 와 **같은 6개**여야 한다 —
 * `moodEmoji` 는 셸과 공유하는 단일 필드라, 목록이 다르면 셸이 저장한 값이 여기서 선택으로
 * 보이지 않는다.
 */

const DIARY_MOOD_EMOJIS = ["🔥", "😊", "😌", "😐", "😔", "🥱"] as const;

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
    pending: "준비 중입니다",
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
    pending: "Coming soon",
  },
} as const;

const copy = DIARY_SELF_CARD_TEXT.ko;

export default function DiarySelfCard() {
  const { hydrated, entry } = useDiaryToday();
  const affirmation = entry?.iAmAffirmation?.trim() || "";
  const mood = entry?.moodEmoji || "";
  const memo = entry?.memoNote?.trim() || "";

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
          <ul className={styles.emojiRow} aria-label={copy.moodLabel}>
            {DIARY_MOOD_EMOJIS.map((emoji) => (
              <li
                key={emoji}
                className={emoji === mood ? styles.emojiOn : styles.emoji}
                aria-current={emoji === mood ? "true" : undefined}
              >
                {emoji}
              </li>
            ))}
          </ul>
          {!mood ? <p className={styles.emptySmall}>{copy.moodEmpty}</p> : null}

          {/* PR-E 에서 저장이 붙는다. 그전까지는 값만 보여 주고 입력을 막는다. */}
          <input
            className={styles.input}
            type="text"
            value={memo}
            readOnly
            disabled
            placeholder={`${copy.memoPlaceholder} — ${copy.pending}`}
            aria-label={copy.memoPlaceholder}
          />
        </>
      )}
    </section>
  );
}
