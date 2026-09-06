"use client";

import { useDiaryWriter } from "./DiaryStoreProvider";
import { writeRetroNote, writeRetroRate } from "../_lib/entry-writes";
import { useDiaryDraft } from "../_lib/use-diary-draft";
import type { DiaryLegacyEntry } from "../_lib/today-snapshot";
import styles from "../_styles/diary.module.css";

/**
 * 하루를 되짚는 칸. 저장 자리는 셸이 이미 가진 `reviewNote`·`reviewRate` 다 — 셸은 이 두 필드를
 * `ensureEntryShape:615` 로 만들어 두고 화면에는 쓰지 않으므로, 새 키를 만들지 않고 그 자리를 쓴다.
 *
 * 🔴 점수는 그날의 결과 평가가 아니라 **사용자가 스스로 매긴 만족도**다. 운기 등급과 섞어
 * 계산하거나 비교해 보여 주지 않는다(그 대조는 사용자가 눈으로 하는 것이다).
 */

const DIARY_RETRO_TEXT = {
  ko: {
    note: "돌아보기",
    notePlaceholder: "오늘 어땠는지 편하게 적어 보세요",
    rate: "만족도",
    rateNone: "아직 고르지 않았습니다.",
    point: "점",
  },
  en: {
    note: "Looking back",
    notePlaceholder: "Write freely about today",
    rate: "Satisfaction",
    rateNone: "Not chosen yet.",
    point: " / 5",
  },
} as const;

const copy = DIARY_RETRO_TEXT.ko;

/** 셸의 `nightLog` 입력과 같은 상한이다(`js/luck-sync-diary.js` 야간 회고 500자). */
const DIARY_RETRO_MAX = 500;

const RATES = [1, 2, 3, 4, 5];

export default function DiaryRetroPanel({
  ymd,
  entry,
}: {
  ymd: string;
  entry: DiaryLegacyEntry | null;
}) {
  const { updateEntry } = useDiaryWriter();
  const note = useDiaryDraft(entry?.reviewNote || "", (next) => {
    updateEntry(ymd, writeRetroNote(next));
  });
  const rate = Number(entry?.reviewRate) || 0;

  return (
    <>
      <p className={styles.fieldLabel}>
        {copy.note}
        <span className={styles.achieveCount}>
          {note.value.length}/{DIARY_RETRO_MAX}
        </span>
      </p>
      <textarea
        className={styles.textarea}
        value={note.value}
        maxLength={DIARY_RETRO_MAX}
        onChange={(event) => note.onChange(event.target.value)}
        onBlur={note.flush}
        placeholder={copy.notePlaceholder}
        aria-label={copy.note}
      />

      <p className={styles.fieldLabel}>{copy.rate}</p>
      <div className={styles.emojiRow} role="group" aria-label={copy.rate}>
        {RATES.map((value) => (
          <button
            key={value}
            type="button"
            className={value <= rate ? styles.emojiOn : styles.emoji}
            aria-pressed={value <= rate}
            aria-label={`${value}${copy.point}`}
            onClick={() => updateEntry(ymd, writeRetroRate(value))}
          >
            <span aria-hidden="true">{value <= rate ? "★" : "☆"}</span>
          </button>
        ))}
      </div>
      {rate === 0 ? <p className={styles.emptySmall}>{copy.rateNone}</p> : null}
    </>
  );
}
