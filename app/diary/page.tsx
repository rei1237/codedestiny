import DailyCard from "@/app/components/daily-card/DailyCard";
import DiaryFlowCard from "./_components/DiaryFlowCard";
import DiaryPlanCard from "./_components/DiaryPlanCard";
import DiarySelfCard from "./_components/DiarySelfCard";
import styles from "./_styles/diary.module.css";

/**
 * 다이어리 홈. 오늘의 기록은 운명 카드 안에 두고 흐름·나·계획은 아래에 이어 둔다.
 * 🔴 이 페이지는 서버 컴포넌트로 두고 상태는 카드가 각자 `useDiaryToday()` 로 읽는다.
 * 저장소 하이드레이션은 레이아웃의 `DiaryStoreProvider` 가 한 번만 한다(원칙 6 — 여기서
 * 다시 읽는 계층을 얹지 않는다).
 */
export default function DiaryHomePage() {
  return (
    <>
      <DailyCard surface="diary" />
      <details className={styles.moreToday}>
        <summary>오늘의 흐름과 계획 자세히 보기</summary>
        <DiaryFlowCard />
        <DiarySelfCard />
        <DiaryPlanCard />
      </details>
    </>
  );
}
