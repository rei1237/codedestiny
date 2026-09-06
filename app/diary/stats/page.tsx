import DiaryRecordsTabs from "../_components/DiaryRecordsTabs";
import DiaryStatsView from "../_components/DiaryStatsView";

/**
 * 다이어리 통계 탭. 기록(`app/diary/records/page.tsx`)과 같은 형태다 — 페이지는 서버
 * 컴포넌트로 두고 상태는 클라이언트 뷰가 `useDiaryToday()` 로 읽는다. 셸·하단바·저장소
 * 하이드레이션은 레이아웃(`app/diary/layout.tsx`)이 이미 보유하므로 여기서 다시 감싸지 않는다.
 *
 * 🔴 하단바 탭이 아니라 기록 화면의 짝이다 — 세그먼트(`DiaryRecordsTabs`)로만 오간다.
 */
export default function DiaryStatsPage() {
  return (
    <>
      <DiaryRecordsTabs />
      <DiaryStatsView />
    </>
  );
}
