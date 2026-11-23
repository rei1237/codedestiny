import DiaryFortuneDraw from "./_components/DiaryFortuneDraw";
import DiaryJournalCard from "./_components/DiaryJournalCard";
import DiaryDailyQuest from "./_components/DiaryDailyQuest";
import DiaryFlowCard from "./_components/DiaryFlowCard";
import DiaryPlanCard from "./_components/DiaryPlanCard";
import DiarySelfCard from "./_components/DiarySelfCard";
import styles from "./_styles/diary.module.css";
import Link from "next/link";

/**
 * 다이어리 홈. 오늘의 기록은 운명 카드 안에 두고 흐름·나·계획은 아래에 이어 둔다.
 * 🔴 이 페이지는 서버 컴포넌트로 두고 상태는 카드가 각자 `useDiaryToday()` 로 읽는다.
 * 저장소 하이드레이션은 레이아웃의 `DiaryStoreProvider` 가 한 번만 한다(원칙 6 — 여기서
 * 다시 읽는 계층을 얹지 않는다).
 */
export default function DiaryHomePage() {
  return (
    <>
      <section className={styles.gardenCover} aria-label="달빛 정원 다이어리">
        <h2>나의 달빛 기록장</h2>
        <div className={styles.bookmarks}>
          <a href="#diaryTodayLine">오늘 한 줄 쓰기</a>
          <Link href="/diary/calendar/">달력 펼치기</Link>
          <Link href="/diary/records/">지난 기록 읽기</Link>
        </div>
      </section>
      <DiaryFlowCard />
      <div className={styles.todayLayout}>
        <DiaryJournalCard />
        <DiaryPlanCard />
      </div>
      <details className={styles.moreToday}>
        <summary>작은 실천과 나를 위한 시간</summary>
        <DiaryFortuneDraw />
        <DiaryDailyQuest />
        <DiarySelfCard />
      </details>
    </>
  );
}
