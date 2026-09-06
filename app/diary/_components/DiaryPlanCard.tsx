"use client";

import DiaryRoutineList from "./DiaryRoutineList";
import { useDiaryToday } from "./DiaryStoreProvider";
import styles from "../_styles/diary.module.css";

/**
 * 홈 ③ 오늘의 계획. 루틴 칸만 쓸 수 있다(PR-E) — 누르면 완료가 들어가고 빠진다.
 *
 * 지금 실제 데이터가 있는 칸은 **루틴**뿐이다 — 셸이 저장하는 것은 `challengeCatalog`(그날의
 * 실천 목록)와 `challenges`(완료한 id)뿐이고, 일정·할 일은 저장 스키마가 아직 없다(PR-F).
 * 🔴 빈 칸을 지우지 않는다 — 세 칸이 한 카드라는 것이 승인된 목업이고, PR-F 가 이 자리를 채운다.
 */

const DIARY_PLAN_CARD_TEXT = {
  ko: {
    title: "오늘의 계획",
    loading: "오늘의 계획을 불러오는 중입니다.",
    schedule: "일정",
    todo: "할 일",
    routine: "루틴",
    pending: "준비 중입니다",
    routineEmpty: "오늘의 실천이 아직 없습니다.",
    doneCount: "완료",
  },
  en: {
    title: "Today's plan",
    loading: "Loading today's plan.",
    schedule: "Schedule",
    todo: "To do",
    routine: "Routine",
    pending: "Coming soon",
    routineEmpty: "No practice items for today yet.",
    doneCount: "Done",
  },
} as const;

const copy = DIARY_PLAN_CARD_TEXT.ko;

export default function DiaryPlanCard() {
  const { hydrated, ymd, entry } = useDiaryToday();
  const catalog = (entry?.challengeCatalog || []).filter((item) => item?.text);
  const doneIds = entry?.challenges || [];

  return (
    <section className={styles.card} aria-label={copy.title}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{copy.title}</h2>
        {hydrated && catalog.length ? (
          <span className={styles.cardMeta}>
            {copy.doneCount} {doneIds.length}/{catalog.length}
          </span>
        ) : null}
      </header>

      {!hydrated ? (
        <p className={styles.empty}>{copy.loading}</p>
      ) : (
        <div className={styles.planGrid}>
          <div className={styles.planBox}>
            <p className={styles.fieldLabel}>{copy.schedule}</p>
            <p className={styles.emptySmall}>{copy.pending}</p>
          </div>
          <div className={styles.planBox}>
            <p className={styles.fieldLabel}>{copy.todo}</p>
            <p className={styles.emptySmall}>{copy.pending}</p>
          </div>
          <div className={styles.planBox}>
            <p className={styles.fieldLabel}>{copy.routine}</p>
            <DiaryRoutineList ymd={ymd} entry={entry} emptyText={copy.routineEmpty} />
          </div>
        </div>
      )}
    </section>
  );
}
