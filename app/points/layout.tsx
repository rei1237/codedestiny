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

// 🔴 여기에 h1 을 두지 말 것 (2026-08-28 제거).
//    이 레이아웃은 /points 와 /points/history 두 화면에 **함께** 주입되는데, 두 화면 모두
//    자기 h1 을 클라이언트에서 그린다(PointsClient · PointHistoryClient, 둘 다 ssr:false).
//    그래서 하이드레이션 이후 h1 이 2개가 됐다(브라우저 실측 2026-08-28: /points 는
//    "이용권 상점 | 연이의 달빛 이용권 상점", /points/history 는 "이용권 상점 | ✦ 결제·이용권 기록").
//    게다가 문구가 하나뿐이라 /points/history 에는 맞지도 않았고, sr-only 숨김 텍스트라
//    app/components/ServiceIntroSection.tsx 가 없애기로 한 패턴이기도 하다.
//    제목은 각 화면이 소유한다. 회귀 가드: scripts/verify-hydrated-h1-integrity.mjs
export default function PointsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
