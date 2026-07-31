import type { Metadata } from "next";

import FeedbackRouteClient from "./FeedbackRouteClient";

// 로그인 필수 폼 화면이라 색인 가치가 없고, AdSense "저가치 화면" 조항 위험도 없다.
// 🔴 noindex 로 두는 대신 사이트맵·STATIC_CANONICAL_ROUTES·CONTENT_EXACT_PATHS 어디에도
//    넣지 않는다. app/robots.ts disallow 에도 넣지 않는다 — robots 로 막으면 이 noindex 를
//    크롤러가 읽을 수조차 없다.
export const metadata: Metadata = {
  title: "버그 제보실 | Code Destiny",
  description: "서비스에서 발견한 버그와 개선 아이디어를 보내주세요. 보내주신 의견은 다음 업데이트에 반영됩니다.",
  alternates: { canonical: "/feedback" },
  robots: { index: false, follow: false },
};

export default function FeedbackPage() {
  return <FeedbackRouteClient />;
}
