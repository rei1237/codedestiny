import DailyCard from "@/app/components/daily-card/DailyCard";
import DiaryFlowCard from "@/app/diary/_components/DiaryFlowCard";
import DiaryPlanCard from "@/app/diary/_components/DiaryPlanCard";
import DiarySelfCard from "@/app/diary/_components/DiarySelfCard";
import styles from "@/app/diary/_styles/diary.module.css";

export default function ProfileDiaryTodayPage() {
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
