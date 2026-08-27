import { redirect } from "next/navigation";

/** Legacy bookmark route for the former 운기·기일 다이어리. */
// 리다이렉트 스텁이라 서버 렌더 본문이 없다. 메타데이터를 안 주면 app/layout.js 기본값이
// 내려와 홈의 title·description·canonical 을 그대로 쓰면서 index,follow 로 노출된다.
export const metadata = {
  title: "운기 다이어리 | Code Destiny",
  description: "운기 다이어리는 홈 화면의 운세 플래너로 통합됐습니다. 이 주소는 예전 북마크를 위한 연결 경로입니다.",
  // 🔴 canonical 을 다시 넣지 말 것 (2026-08-27 제거).
  //    이 라우트는 noindex 다. noindex 와 '다른 URL 을 가리키는 canonical' 을 함께 두는 것은
  //    Google 이 권하지 않는 조합이고(Search Central, Consolidate duplicate URLs),
  //    최악의 경우 noindex 가 canonical 목적지 — 여기서는 **홈** — 로 옮겨붙을 수 있다.
  //    색인에서 빼는 목적은 아래 robots 만으로 달성된다. follow 로 링크 신호는 넘어간다.
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function LegacyLuckSyncDiaryPage() {
  redirect("/?fortunePlanner=1");
}
