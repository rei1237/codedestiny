"use client";

import { useState, type FormEvent } from "react";

import { useDiaryToday, useDiaryWriter } from "./DiaryStoreProvider";
import { readExtDay, readTodos } from "../_lib/ext-snapshot";
import { addTodo, normalizePlanText, removeTodo, toggleTodo } from "../_lib/ext-writes";
import { DIARY_EXT_TEXT_MAX } from "@/lib/diary/diary-ext-store";
import styles from "../_styles/diary.module.css";

/**
 * 그날의 할 일 — **오늘 끝낼 것**. 완료 토글 방식은 루틴 목록(`DiaryRoutineList`)과 같게 두어
 * 한 카드 안에서 누르는 법이 갈리지 않게 한다.
 *
 * 🔴 루틴과 저장 자리가 다르다 — 루틴은 셸과 공유하는 v2 의 `challenges`/`challengeCatalog` 이고
 * 할 일은 `/diary` 전용 확장 키다. 목업 승인본대로 **시간축(일정)·완료축(할 일)·연속축(루틴)** 이
 * 소제목과 저장 필드 양쪽에서 갈려 있어야 한다.
 *
 * 🔴 완료한 줄을 아래로 내리지 않는다 — 누른 순간 줄이 움직이면 다음 항목을 잘못 누른다.
 */

const DIARY_TODO_TEXT = {
  ko: {
    empty: "적어 둔 할 일이 아직 없습니다.",
    textLabel: "할 일 내용",
    placeholder: "오늘 끝낼 것 하나",
    add: "할 일 추가",
    remove: "삭제",
  },
  en: {
    empty: "No to-do noted yet.",
    textLabel: "To do",
    placeholder: "One thing to finish today",
    add: "Add to do",
    remove: "Delete",
  },
} as const;

const copy = DIARY_TODO_TEXT.ko;

export default function DiaryTodoList({ ymd }: { ymd: string }) {
  const { ext } = useDiaryToday();
  const { updateExtDay } = useDiaryWriter();
  const [text, setText] = useState("");

  const items = readTodos(readExtDay(ext, ymd));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizePlanText(text)) return;
    if (!updateExtDay(ymd, addTodo(text))) return;
    setText("");
  };

  return (
    <>
      {items.length ? (
        <ul className={styles.planList}>
          {items.map((item) => {
            const done = item.done === true;
            return (
              <li key={item.id} className={styles.planRow}>
                <button
                  type="button"
                  className={done ? styles.routineDone : styles.routineItem}
                  aria-pressed={done}
                  onClick={() => item.id && updateExtDay(ymd, toggleTodo(item.id))}
                >
                  <span className={styles.routineMark} aria-hidden="true">
                    {done ? "✓" : "○"}
                  </span>
                  <span>{item.text}</span>
                </button>
                <button
                  type="button"
                  className={styles.planRemove}
                  aria-label={`${item.text} ${copy.remove}`}
                  onClick={() => item.id && updateExtDay(ymd, removeTodo(item.id))}
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.emptySmall}>{copy.empty}</p>
      )}

      <form className={styles.planAdd} onSubmit={onSubmit}>
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
