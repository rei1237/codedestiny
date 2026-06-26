import type { Metadata } from "next";
import SukuyoCalendarClient from "./SukuyoCalendarClient";

const SUKUYO_CALENDAR_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "27숙 달력 | Code Destiny",
    description: "날짜별 27숙의 달빛 흐름과 하루 조언을 확인하는 숙요 달력입니다.",
    keywords: ["27숙 달력", "숙요 달력", "숙요점", "27수", "오늘의 숙요"],
  },
  en: {
    title: "27 Lunar Mansion Calendar | Code Destiny",
    description: "A Sukuyo calendar for checking each date's 27 lunar mansion flow and daily guidance.",
    keywords: ["27 lunar mansion calendar", "Sukuyo calendar", "Sukuyo astrology", "daily Sukuyo"],
  },
  ja: {
    title: "二十七宿カレンダー | Code Destiny",
    description: "日付ごとの二十七宿の月明かりの流れと一日の助言を確認できる宿曜カレンダーです。",
    keywords: ["二十七宿カレンダー", "宿曜カレンダー", "宿曜占星術", "今日の宿曜"],
  },
} as const;

const sukuyoCalendarPageCopy = SUKUYO_CALENDAR_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: sukuyoCalendarPageCopy.title,
  description: sukuyoCalendarPageCopy.description,
  keywords: [...sukuyoCalendarPageCopy.keywords],
  alternates: {
    canonical: "/sukuyo/calendar",
  },
  openGraph: {
    title: sukuyoCalendarPageCopy.title,
    description: sukuyoCalendarPageCopy.description,
    url: "https://code-destiny.com/sukuyo/calendar",
    images: ["https://code-destiny.com/fuctionassets/sukyo.webp"],
  },
};

export default function SukuyoCalendarPage() {
  return <SukuyoCalendarClient />;
}
