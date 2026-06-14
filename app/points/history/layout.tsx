import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "결제 및 이용권 내역",
  description: "Code Destiny 결제, 이용권, 주문 상태를 확인하는 개인 페이지입니다.",
  alternates: {
    canonical: "/points/history/",
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

export default function PointsHistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
