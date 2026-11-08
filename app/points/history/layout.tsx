import type { Metadata } from "next";
import { ROBOTS_META } from "../../../lib/seo/index-policy.mjs";

const POINTS_HISTORY_LAYOUT_TEXT_TRANSLATIONS = {
  ko: {
    title: "결제 및 이용권 내역",
    description: "꿀꿀운세 결제, 이용권, 주문 상태를 확인하는 개인 페이지입니다.",
  },
  en: {
    title: "Payment and Pass History",
    description: "Private page for checking 꿀꿀운세 payments, passes, and order status.",
  },
  ja: {
    title: "決済・利用券履歴",
    description: "꿀꿀운세の決済、利用券、注文状況を確認する個人ページです。",
  },
} as const;

const pointsHistoryLayoutCopy = POINTS_HISTORY_LAYOUT_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: pointsHistoryLayoutCopy.title,
  description: pointsHistoryLayoutCopy.description,
  alternates: {
    canonical: "/points/history/",
  },
  robots: ROBOTS_META.NOINDEX,
};

export default function PointsHistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
