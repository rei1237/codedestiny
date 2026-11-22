"use client";

import DiaryEntryFields from "./DiaryEntryFields";
import { useDiaryToday, useDiarySaveFailed, DIARY_SAVE_FAILED_TEXT } from "./DiaryStoreProvider";
import styles from "../_styles/diary.module.css";

export default function DiaryJournalCard() {
  const { hydrated, ymd, entry } = useDiaryToday();
  const failed = useDiarySaveFailed();
  return <section className={`${styles.card} ${styles.journal}`} aria-labelledby="diaryJournalTitle">
    <header className={styles.journalGreeting}>
      <div className={styles.journalCrest} aria-hidden="true">
        <img src="/images/fortune-tea-house/renewal/pig-welcome.webp" alt="" width={92} height={92} />
        <img src="/images/fortune-tea-house/renewal/pig-listening.webp" alt="" width={92} height={92} />
      </div>
      <div>
        <h2 id="diaryJournalTitle" className={styles.journalTitle}>오늘의 마음 한 장</h2>
        <p className={styles.journalIntro}>연이가 물어요. 오늘 가장 오래 마음에 남은 순간은 언제였나요?</p>
      </div>
    </header>
    {hydrated ? <DiaryEntryFields key={ymd} ymd={ymd} entry={entry} /> : <p role="status">당신의 기록을 펼치고 있어요.</p>}
    <p className={styles.fieldHint}>기기나 브라우저를 바꾸기 전에는 더보기에서 기록을 백업해 주세요.</p>
    {failed && <p role="alert">{DIARY_SAVE_FAILED_TEXT}</p>}
  </section>;
}
