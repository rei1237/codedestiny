import type { Metadata } from "next";
import { ROBOTS_META } from "../../../lib/seo/index-policy.mjs";

// 로그인 사용자 전용 화면이라 색인 대상이 아니다. `/account/phone` 레이아웃과 같은 형태를 쓴다.
export const metadata: Metadata = {
  title: "광고성 정보 수신 설정",
  description: "꿀꿀운세 회원의 광고성 정보 이메일 수신 동의·거부를 관리하는 비공개 페이지입니다.",
  alternates: {
    canonical: "/account/notifications/",
  },
  robots: ROBOTS_META.NOINDEX,
};

export default function AccountNotificationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
