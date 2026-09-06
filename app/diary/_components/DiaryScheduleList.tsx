"use client";

import { useState, type FormEvent } from "react";

import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import { readExtDay, readSchedules } from "../_lib/ext-snapshot";
import { addSchedule, normalizePlanText, removeSchedule } from "../_lib/ext-writes";
import { DIARY_EXT_TEXT_MAX } from "@/lib/diary/diary-ext-store";
import styles from "../_styles/diary.module.css";

/**
 * 그날의 일정 — **시간이 정해진 것**. 홈 「오늘의 계획」과 Day View 의 「계획」 탭이 같은 것을 쓴다.
 *
 * 🔴 저장 자리는 `/diary` 전용 확장 키다(`lib/diary/diary-ext-store.js`). 셸 모달의 v2 필드에
 * 얹지 않는다 — 셸에는 일정 개념이 없어서, 그쪽 필드를 빌려 쓰면 셸이 모르는 값을 안고 다닌다.
 *
 * 🔴 정렬은 `readSchedules` 한 곳이다. 지우는 것도 화면 순서가 아니라 항목 id 로 지운다 —
 * 정렬된 순서로 지우면 저장 순서와 어긋나 엉뚱한 줄이 사라진다.
 *
 * 🔴 추가 칸은 디바운스 저장을 쓰지 않는다 — 항목이 생기는 시점이 「추가」를 누른 때로
 * 분명해야 하고, 타자 중에 반쯤 적힌 줄이 목록에 나타나면 안 된다.
 */

const DIARY_SCHEDULE_TEXT = {
  ko: {
    empty: "적어 둔 일정이 아직 없습니다.",
    timeLabel: "시간",
    textLabel: "일정 내용",
    placeholder: "무엇을 하기로 했나요",
    add: "일정 추가",
    remove: "삭제",
    noTime: "시간 미정",
  },
  en: {
    empty: "No schedule noted yet.",
    timeLabel: "Time",
    textLabel: "Schedule",
    placeholder: "What is planned",
    add: "Add schedule",
    remove: "Delete",
    noTime: "No time",
  },
} as const;

const copy = DIARY_SCHEDULE_TEXT.ko;

export default function DiaryScheduleList({ ymd }: { ymd: string }) {
  const { ext } = useDiaryToday();
  const { updateExtDay } = useDiaryWriter();
  const [at, setAt] = useState("");
  const [text, setText] = useState("");

  const items = readSchedules(readExtDay(ext, ymd));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizePlanText(text)) return;
    if (!updateExtDay(ymd, addSchedule(at, text))) return;
    setAt("");
    setText("");
  };

  return (
    <>
      {items.length ? (
        <ul className={styles.planList}>
          {items.map((item) => (
            <li key={item.id} className={styles.planRow}>
              <span className={item.at ? styles.planTime : styles.planTimeNone}>
                {item.at || copy.noTime}
              </span>
              <span className={styles.planText}>{item.text}</span>
              <button
                type="button"
                className={styles.planRemove}
                aria-label={`${item.text} ${copy.remove}`}
                onClick={() => item.id && updateExtDay(ymd, removeSchedule(item.id))}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptySmall}>{copy.empty}</p>
      )}

      <form className={styles.planAdd} onSubmit={onSubmit}>
        <input
          className={styles.planTimeInput}
          type="time"
          value={at}
          onChange={(event) => setAt(event.target.value)}
          aria-label={copy.timeLabel}
        />
        <input
          className={styles.input}
          type="text"
          value={text}
          maxLength={DIARY_EXT_TEXT_MAX}
          onChange={(event) => setText(event.target.value)}
          placeholder={copy.placeholder}
          aria-label={copy.textLabel}
        />
        <button type="submit" className={styles.planAddButton} disabled={!text.trim()}>
          {copy.add}
        </button>
      </form>
    </>
  );
}
