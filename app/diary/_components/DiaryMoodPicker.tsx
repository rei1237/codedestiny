"use client";

import { useDiaryWriter } from "./DiaryStoreProvider";
import { DIARY_MOOD_EMOJIS, writeMood } from "../_lib/entry-writes";
import styles from "../_styles/diary.module.css";

/**
 * 기분 고르기. 홈 「오늘의 나」와 Day View·퀵캡처가 같은 것을 쓴다 — 목록과 저장 필드가
 * 화면마다 갈리면 그 자리에서 기록이 갈린다(목록 정본은 `../_lib/entry-writes.ts`).
 *
 * 🔴 고른 것을 다시 눌러도 해제하지 않는다 — 셸 `js/luck-sync-diary.js:4342` 도 값을 넣기만
 * 하고, 해제를 앱에만 넣으면 같은 필드를 두 화면이 다른 규칙으로 쓰게 된다.
 */
export default function DiaryMoodPicker({
  ymd,
  mood,
  label,
}: {
  ymd: string;
  mood: string;
  label: string;
}) {
  const { updateEntry } = useDiaryWriter();

  return (
    <div className={styles.emojiRow} role="group" aria-label={label}>
      {DIARY_MOOD_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={emoji === mood ? styles.emojiOn : styles.emoji}
          aria-pressed={emoji === mood}
          onClick={() => updateEntry(ymd, writeMood(emoji))}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
