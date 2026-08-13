import { redirect } from "next/navigation";

/** Legacy bookmark route for the former 운기·기일 다이어리. */
// 리다이렉트 스텁이라 서버 렌더 본문이 없다. 메타데이터를 안 주면 app/layout.js 기본값이
// 내려와 홈의 title·description·canonical 을 그대로 쓰면서 index,follow 로 노출된다.
export const metadata = {
  title: "운기 다이어리 | Code Destiny",
  description: "운기 다이어리는 홈 화면의 운세 플래너로 통합됐습니다. 이 주소는 예전 북마크를 위한 연결 경로입니다.",
  alternates: {
    canonical: "https://code-destiny.com/",
  },
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
