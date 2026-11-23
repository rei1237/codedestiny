"use client";

import DiaryMoodPicker from "./DiaryMoodPicker";
import DiaryTagField from "./DiaryTagField";
import { useDiaryWriter } from "./DiaryStoreProvider";
import { writeMemo, writeOneLine } from "../_lib/entry-writes";
import { useDiaryDraft } from "../_lib/use-diary-draft";
import type { DiaryLegacyEntry } from "../_lib/today-snapshot";
import styles from "../_styles/diary.module.css";

/**
 * 하루치 기록 입력 3칸(기분·한 줄·메모). Day View 의 「기록」 탭과 퀵캡처 시트가 같은 것을 쓴다 —
 * 같은 필드를 두 화면이 각자 그리면 저장 규칙이 갈린다.
 *
 * 🔴 저장 버튼이 없다 — 입력이 멈추면 저장한다(`../_lib/use-diary-draft.ts`). 셸 모달은
 * 저장 버튼 방식이지만, 여기서 버튼을 만들면 안 누르고 나간 글이 사라진다.
 *
 * 🔴 태그는 **기본으로 켜지 않는다**(`showTags`) — 퀵캡처는 한 줄을 빨리 던지는 자리라
 * 분류를 요구하면 그 빠름이 사라진다. 켜는 곳은 Day View 「기록」 탭 하나다(승인본 확정 사항).
 */

const DIARY_ENTRY_FIELDS_TEXT = {
  ko: {
    mood: "기분",
    oneLine: "오늘 한 줄",
    oneLinePlaceholder: "오늘을 한 줄로 남겨 보세요",
    memo: "오늘의 일기",
    memoPlaceholder: "마음에 남은 장면을 편하게 적어 보세요.",
  },
  en: {
    mood: "Mood",
    oneLine: "One line for today",
    oneLinePlaceholder: "Leave one line about today",
    memo: "Memo",
    memoPlaceholder: "Anything to add",
  },
} as const;

const copy = DIARY_ENTRY_FIELDS_TEXT.ko;

export default function DiaryEntryFields({
  ymd,
  entry,
  oneLineId,
  autoFocus = false,
  showTags = false,
}: {
  ymd: string;
  entry: DiaryLegacyEntry | null;
  oneLineId?: string;
  autoFocus?: boolean;
  showTags?: boolean;
}) {
  const { updateEntry } = useDiaryWriter();
  const oneLine = useDiaryDraft(entry?.practiceNote || entry?.nightLog || "", (next) => {
    return updateEntry(ymd, writeOneLine(next));
  }, ymd + ":oneLine");
  const memo = useDiaryDraft(entry?.memoNote || "", (next) => {
    return updateEntry(ymd, writeMemo(next));
  }, ymd + ":memo");

  return (
    <>
      <p className={styles.fieldLabel}>{copy.mood}</p>
      <DiaryMoodPicker ymd={ymd} mood={entry?.moodEmoji || ""} label={copy.mood} />

      <p className={styles.fieldLabel}>{copy.oneLine}</p>
      <input id={oneLineId}
        className={styles.input}
        type="text"
        value={oneLine.value}
        onChange={(event) => oneLine.onChange(event.target.value)}
        onBlur={oneLine.flush}
        placeholder={copy.oneLinePlaceholder}
        aria-label={copy.oneLine}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- 퀵캡처는 열자마자 쓰려고 여는 시트다
        autoFocus={autoFocus}
      />

      <p className={styles.fieldLabel}>{copy.memo}</p>
      <textarea
        className={styles.input}
        value={memo.value}
        rows={6}
        onChange={(event) => memo.onChange(event.target.value)}
        onBlur={memo.flush}
        placeholder={copy.memoPlaceholder}
        aria-label={copy.memo}
      />

      <p className={styles.draftStatus} role="status">
        {oneLine.status === "error" || memo.status === "error" ? "저장하지 못했어요. 글은 남겨 두었어요." : oneLine.status === "pending" || memo.status === "pending" ? "입력 중 · 잠시 후 저장해요" : oneLine.status === "saved" || memo.status === "saved" ? "이 브라우저에 저장했어요" : "입력을 멈추면 이 브라우저에 저장해요"}
        {(oneLine.status === "error" || memo.status === "error") && <button type="button" onClick={() => { oneLine.flush(); memo.flush(); }}>다시 저장하기</button>}
      </p>

      {showTags ? <DiaryTagField ymd={ymd} /> : null}
    </>
  );
}
