import { redirect } from "next/navigation";

// 리다이렉트 스텁이라 서버 렌더 본문이 없다. 메타데이터를 안 주면 app/layout.js 기본값이
// 내려와 홈의 title·description·canonical 을 그대로 쓰면서 index,follow 로 노출된다
// (app/saju/lifebook/page.js 와 같은 처리를 따른다).
export const metadata = {
  title: "운세 플래너 | Code Destiny",
  description: "운세 플래너는 홈 화면 안에서 열립니다. 이 주소는 예전 북마크를 위한 연결 경로입니다.",
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

export default function FortunePlannerPage() {
  redirect("/?fortunePlanner=1");
}
