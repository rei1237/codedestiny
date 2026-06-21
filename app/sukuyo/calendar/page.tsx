import type { Metadata } from "next";
import SukuyoCalendarClient from "./SukuyoCalendarClient";

export const metadata: Metadata = {
  title: "27숙 달력 | Code Destiny",
  description: "날짜별 27숙의 달빛 흐름과 하루 조언을 확인하는 숙요 달력입니다.",
  keywords: ["27숙 달력", "숙요 달력", "숙요점", "27수", "오늘의 숙요"],
  alternates: {
    canonical: "/sukuyo/calendar",
  },
  openGraph: {
    title: "27숙 달력 | Code Destiny",
    description: "날짜별 27숙의 달빛 흐름과 하루 조언을 확인하는 숙요 달력입니다.",
    url: "https://code-destiny.com/sukuyo/calendar",
    images: ["https://code-destiny.com/fuctionassets/sukyo.webp"],
  },
};

export default function SukuyoCalendarPage() {
  return <SukuyoCalendarClient />;
}
