import type { Metadata } from "next";

// 로그인 사용자 전용 화면이라 색인 대상이 아니다. `/account/password` 레이아웃과 같은 형태를 쓴다.
export const metadata: Metadata = {
  title: "휴대폰 번호 변경",
  description: "Code Destiny 회원 휴대폰 번호 변경을 위한 비공개 페이지입니다.",
  alternates: {
    canonical: "/account/phone/",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AccountPhoneLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
