import type { Metadata } from "next";

const POINTS_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "이용권 상점",
    description: "Code Destiny 이용권 구매와 주문 내역을 확인하는 개인 페이지입니다.",
  },
  en: {
    title: "Pass Store",
    description: "Private page for purchasing Code Destiny passes and checking order history.",
  },
  ja: {
    title: "利用券ストア",
    description: "Code Destinyの利用券購入と注文履歴を確認する個人ページです。",
  },
} as const;

const pointsLayoutCopy = POINTS_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: pointsLayoutCopy.title,
  description: pointsLayoutCopy.description,
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
        {pointsLayoutCopy.title}
      </h1>
      {children}
    </>
  );
}
