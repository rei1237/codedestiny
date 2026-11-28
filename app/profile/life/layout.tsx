import type { Metadata } from "next";
import { ROBOTS_META } from "../../../lib/seo/index-policy.mjs";

// 로그인 사용자 본인 카드 전용 비공개 화면. /profile 은 색인 원장의 비공개 접두사(noindex·사이트맵 제외)이고
// robots.txt 도 /profile/ 을 막는다. 레이아웃은 `/account/notifications` 와 같은 형태를 쓴다.
export const metadata: Metadata = {
  title: "지난 시간 돌아보기",
  description: "꿀꿀 운세 회원이 본인 카드에 좋았던 해와 힘들었던 해를 남기는 비공개 페이지입니다.",
  alternates: { canonical: "/profile/life/" },
  robots: ROBOTS_META.NOINDEX,
};

export default function ProfileLifeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
