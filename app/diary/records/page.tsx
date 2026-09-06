import DiaryRecordsView from "../_components/DiaryRecordsView";

/**
 * 다이어리 기록 탭. 달력(`app/diary/calendar/page.tsx`)과 같은 형태다 — 페이지는 서버
 * 컴포넌트로 두고 상태는 클라이언트 뷰가 `useDiaryToday()` 로 읽는다. 셸·하단바·저장소
 * 하이드레이션은 레이아웃(`app/diary/layout.tsx`)이 이미 보유하므로 여기서 다시 감싸지 않는다.
 */
export default function DiaryRecordsPage() {
  return <DiaryRecordsView />;
}
