"use client";

import { useDiaryToday } from "./DiaryStoreProvider";
import styles from "../_styles/diary.module.css";

/**
 * 홈 ③ 오늘의 계획. 🔴 읽기 전용이다.
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
  const { hydrated, entry } = useDiaryToday();
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
            {catalog.length ? (
              <ul className={styles.routineList}>
                {catalog.map((item, index) => {
                  const done = item.id ? doneIds.includes(item.id) : false;
                  return (
                    <li
                      key={item.id || `${index}`}
                      className={done ? styles.routineDone : styles.routineItem}
                    >
                      <span className={styles.routineMark} aria-hidden="true">
                        {done ? "✓" : "○"}
                      </span>
                      <span>{item.text}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.emptySmall}>{copy.routineEmpty}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
