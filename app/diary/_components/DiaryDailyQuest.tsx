"use client";

import { useDailyJourney } from "@/app/components/daily-card/useDailyJourney";
import styles from "../_styles/diary.module.css";

// Keep the existing quest selection, completion and RPG award controller.
// The profile and attendance UI live in the garden, so this renders only the quest.
export default function DiaryDailyQuest() {
  const journey = useDailyJourney({ surface: "diary", enabled: true });
  const { quest, picked, savedAction, hydrated, status } = journey;
  return <section className={styles.card} aria-label="오늘의 작은 실천">
    <h2 className={styles.cardTitle}>오늘의 작은 실천</h2>
    {!hydrated ? <p role="status">작은 실천을 준비하고 있어요.</p> : <>
      <p>{quest ? savedAction?.name || quest.text : picked?.action.name || "오늘의 실천을 고르고 있어요."}</p>
      <p className={styles.fieldHint}>{quest ? savedAction?.tip : picked?.action.tip}</p>
      <div className={styles.questButtons}>
        {quest ? <button type="button" aria-pressed={Boolean(quest.done)} onClick={journey.toggleQuest}>{quest.done ? "완료 · 되돌리기" : "실천 완료하기"}</button> : <>
          <button type="button" disabled={!picked} onClick={journey.selectQuest}>이 실천 고르기</button>
          <button type="button" disabled={!picked} onClick={journey.rerollQuest}>다른 실천</button>
        </>}
      </div>
      {status === "ready" && <p className={styles.fieldHint}>실천 완료는 기존 캐릭터 성장에 반영돼요.</p>}
    </>}
  </section>;
}
