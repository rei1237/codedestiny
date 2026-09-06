"use client";

import DiaryRoutineList from "./DiaryRoutineList";
import DiaryScheduleList from "./DiaryScheduleList";
import DiaryTodoList from "./DiaryTodoList";
import { useDiaryToday } from "./DiaryStoreProvider";
import { readExtDay } from "../_lib/ext-snapshot";
import { readAchievement } from "../_lib/today-snapshot";
import styles from "../_styles/diary.module.css";

/**
 * 홈 ③ 오늘의 계획. 세 칸 모두 이 자리에서 바로 쓴다(PR-F).
 *
 * 🔴 세 칸은 **저장 자리가 다르다** — 일정·할 일은 `/diary` 전용 확장 키이고, 루틴은 셸 모달과
 * 공유하는 v2 의 `challengeCatalog`/`challenges` 다. 목업 승인본이 시간축·완료축·연속축을
 * 갈라 둔 그대로이니, 한 칸의 항목을 다른 칸으로 옮기는 식으로 합치지 않는다.
 *
 * 머리의 완료 숫자는 `readAchievement` 하나에서 온다 — 기록 카드의 성취 바와 같은 값이어야 한다.
 */

const DIARY_PLAN_CARD_TEXT = {
  ko: {
    title: "오늘의 계획",
    loading: "오늘의 계획을 불러오는 중입니다.",
    schedule: "일정",
    scheduleHint: "시간이 정해진 것",
    todo: "할 일",
    todoHint: "오늘 끝낼 것",
    routine: "루틴",
    routineHint: "매일 반복",
    routineEmpty: "오늘의 실천이 아직 없습니다.",
    doneCount: "완료",
  },
  en: {
    title: "Today's plan",
    loading: "Loading today's plan.",
    schedule: "Schedule",
    scheduleHint: "Set for a time",
    todo: "To do",
    todoHint: "Finish today",
    routine: "Routine",
    routineHint: "Every day",
    routineEmpty: "No practice items for today yet.",
    doneCount: "Done",
  },
} as const;

const copy = DIARY_PLAN_CARD_TEXT.ko;

export default function DiaryPlanCard() {
  const { hydrated, ymd, entry, ext } = useDiaryToday();
  const { done, total } = readAchievement(entry, readExtDay(ext, ymd));

  return (
    <section className={styles.card} aria-label={copy.title}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{copy.title}</h2>
        {hydrated && total ? (
          <span className={styles.cardMeta}>
            {copy.doneCount} {done}/{total}
          </span>
        ) : null}
      </header>

      {!hydrated ? (
        <p className={styles.empty}>{copy.loading}</p>
      ) : (
        <div className={styles.planGrid}>
          <div className={styles.planBox}>
            <p className={styles.fieldLabel}>
              {copy.schedule}
              <span className={styles.fieldHint}>{copy.scheduleHint}</span>
            </p>
            <DiaryScheduleList ymd={ymd} />
          </div>
          <div className={styles.planBox}>
            <p className={styles.fieldLabel}>
              {copy.todo}
              <span className={styles.fieldHint}>{copy.todoHint}</span>
            </p>
            <DiaryTodoList ymd={ymd} />
          </div>
          <div className={styles.planBox}>
            <p className={styles.fieldLabel}>
              {copy.routine}
              <span className={styles.fieldHint}>{copy.routineHint}</span>
            </p>
            <DiaryRoutineList ymd={ymd} entry={entry} emptyText={copy.routineEmpty} />
          </div>
        </div>
      )}
    </section>
  );
}
