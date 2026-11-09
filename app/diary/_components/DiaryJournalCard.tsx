"use client";

import DiaryEntryFields from "./DiaryEntryFields";
import { useDiaryToday, useDiarySaveFailed, DIARY_SAVE_FAILED_TEXT } from "./DiaryStoreProvider";
import styles from "../_styles/diary.module.css";

export default function DiaryJournalCard() {
  const { hydrated, ymd, entry } = useDiaryToday();
  const failed = useDiarySaveFailed();
  return <section className={`${styles.card} ${styles.journal}`} aria-labelledby="diaryJournalTitle">
    <div className={styles.journalCrest}><img src="/images/fortune-tea-house/renewal/pig-listening.webp" alt="" width={86} height={86} /></div>
    <h2 id="diaryJournalTitle" className={styles.journalTitle}>오늘의 마음 한 장</h2>
    <p className={styles.journalIntro}>잘한 일도, 조금 지친 마음도 여기에 놓아두세요.</p>
    {hydrated ? <DiaryEntryFields ymd={ymd} entry={entry} /> : <p role="status">당신의 기록을 펼치고 있어요.</p>}
    <p className={styles.fieldHint}>입력을 멈추거나 칸을 나가면 저장해요. 기록은 이 브라우저에 보관돼요.</p>
    {failed && <p role="alert">{DIARY_SAVE_FAILED_TEXT}</p>}
  </section>;
}
