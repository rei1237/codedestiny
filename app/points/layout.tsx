import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용권 상점",
  description: "Code Destiny 이용권 구매와 주문 내역을 확인하는 개인 페이지입니다.",
  alternates: {
    canonical: "/points/",
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

export default function PointsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        이용권 상점
      </h1>
      {children}
    </>
  );
}
