import DiaryFlowCard from "./_components/DiaryFlowCard";
import DiaryPlanCard from "./_components/DiaryPlanCard";
import DiaryRecordCard from "./_components/DiaryRecordCard";
import DiarySelfCard from "./_components/DiarySelfCard";

/**
 * 다이어리 홈. 카드 4장의 순서는 승인된 목업 그대로다 — 흐름 → 나 → 계획 → 기록.
 * 🔴 이 페이지는 서버 컴포넌트로 두고 상태는 카드가 각자 `useDiaryToday()` 로 읽는다.
 * 저장소 하이드레이션은 레이아웃의 `DiaryStoreProvider` 가 한 번만 한다(원칙 6 — 여기서
 * 다시 읽는 계층을 얹지 않는다).
 */
export default function DiaryHomePage() {
  return (
    <>
      <DiaryFlowCard />
      <DiarySelfCard />
      <DiaryPlanCard />
      <DiaryRecordCard />
    </>
  );
}
