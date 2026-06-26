import type { Metadata } from "next";

const POINTS_HISTORY_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "결제 및 이용권 내역",
    description: "Code Destiny 결제, 이용권, 주문 상태를 확인하는 개인 페이지입니다.",
  },
  en: {
    title: "Payment and Pass History",
    description: "Private page for checking Code Destiny payments, passes, and order status.",
  },
  ja: {
    title: "決済・利用券履歴",
    description: "Code Destinyの決済、利用券、注文状況を確認する個人ページです。",
  },
} as const;

const pointsHistoryLayoutCopy = POINTS_HISTORY_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: pointsHistoryLayoutCopy.title,
  description: pointsHistoryLayoutCopy.description,
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
