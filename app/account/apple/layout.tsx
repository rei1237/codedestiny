import type { Metadata } from "next";
import { ROBOTS_META } from "../../../lib/seo/index-policy.mjs";

// 로그인 사용자 전용 화면이라 색인 대상이 아니다. `/account/phone` 레이아웃과 같은 형태를 쓴다.
export const metadata: Metadata = {
  title: "Apple 계정 연결",
  description: "꿀꿀운세 회원 계정에 Apple 로그인을 연결하는 비공개 페이지입니다.",
  alternates: {
    canonical: "/account/apple/",
  },
  robots: ROBOTS_META.NOINDEX,
};

export default function AccountAppleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
