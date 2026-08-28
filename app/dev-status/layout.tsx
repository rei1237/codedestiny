import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개발 현황",
  description:
    "Code Destiny 서비스의 개발 진행 상황을 확인하는 내부 화면입니다. 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function DevStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
