"use client";

import { useState, type FormEvent } from "react";

import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import { DIARY_TAG_MAX_PER_DAY, DIARY_TAG_TEXT_MAX, readExtDay, readTags } from "../_lib/ext-snapshot";
import { addTag, normalizeTag, removeTag } from "../_lib/ext-writes";
import styles from "../_styles/diary.module.css";

/**
 * 그날의 태그. 🔴 태그를 **다는 자리는 여기 하나**다(목업 승인본 확정 사항) — Day View 「기록」
 * 탭에서만 열린다. 홈 카드와 퀵캡처에는 붙이지 않는다: 퀵캡처는 한 줄을 빨리 던지는 자리라
 * 분류를 요구하면 그 빠름이 사라지고, 홈에 두면 같은 것을 고치는 자리가 둘이 된다.
 *
 * 목록·홈에서는 읽기 전용으로만 보인다(`DiaryRecordsView`·`DiaryRecordCard`).
 *
 * 🔴 저장 자리는 확장 키다 — 셸 모달은 태그를 보지 않는다. 쓰기는 `updateExtDay` 하나를 거친다.
 */

const DIARY_TAG_TEXT = {
  ko: {
    label: "태그",
    hint: `최대 ${DIARY_TAG_MAX_PER_DAY}개`,
    placeholder: "산책 · 회의처럼 짧게",
    add: "태그 추가",
    remove: "삭제",
    empty: "달아 둔 태그가 아직 없습니다.",
    full: "태그를 더 달 수 없습니다. 하나를 지우고 달아 보세요.",
  },
  en: {
    label: "Tags",
    hint: `Up to ${DIARY_TAG_MAX_PER_DAY}`,
    placeholder: "Short, like walk or meeting",
    add: "Add tag",
    remove: "Delete",
    empty: "No tags yet.",
    full: "No more tags fit. Remove one first.",
  },
} as const;

const copy = DIARY_TAG_TEXT.ko;

export default function DiaryTagField({ ymd }: { ymd: string }) {
  const { ext } = useDiaryToday();
  const { updateExtDay } = useDiaryWriter();
  const [text, setText] = useState("");

  const tags = readTags(readExtDay(ext, ymd));
  const full = tags.length >= DIARY_TAG_MAX_PER_DAY;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tag = normalizeTag(text);
    if (!tag || full || tags.includes(tag)) return;
    if (!updateExtDay(ymd, addTag(text))) return;
    setText("");
  };

  return (
    <div className={styles.tagField}>
      <p className={styles.fieldLabel}>
        {copy.label}
        <span className={styles.fieldHint}>{full ? copy.full : copy.hint}</span>
      </p>

      {tags.length ? (
        <div className={styles.tagFieldChips}>
          {tags.map((tag) => (
            <span key={tag} className={styles.tagFieldChip}>
              {tag}
              <button
                type="button"
                className={styles.tagChipDel}
                aria-label={`${tag} ${copy.remove}`}
                onClick={() => updateExtDay(ymd, removeTag(tag))}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.emptySmall}>{copy.empty}</p>
      )}

      <form className={styles.tagAdd} onSubmit={onSubmit}>
        <input
          className={styles.tagInput}
          type="text"
          value={text}
          maxLength={DIARY_TAG_TEXT_MAX}
          onChange={(event) => setText(event.target.value)}
          placeholder={copy.placeholder}
          aria-label={copy.label}
          disabled={full}
        />
        <button type="submit" className={styles.planAddButton} disabled={full || !text.trim()}>
          {copy.add}
        </button>
      </form>
    </div>
  );
}
