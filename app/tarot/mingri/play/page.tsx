import { redirect } from "next/navigation";

const MINGRI_TAROT_PLAY_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "명리학 타로 리딩",
    description: "오행의 결과 타로 카드의 상징을 함께 열어 오늘의 선택 방향을 읽습니다.",
  },
  en: {
    title: "Myeongri Tarot Reading",
    description: "Open the flow of the five elements with tarot card symbols and read the direction of today’s choice.",
  },
  ja: {
    title: "命理学タロットリーディング",
    description: "五行の流れとタロットカードの象徴を重ね、今日の選択の方向を読みます。",
  },
} as const;

const mingriTarotPlayPageCopy = MINGRI_TAROT_PLAY_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata = {
  title: mingriTarotPlayPageCopy.title,
  description: mingriTarotPlayPageCopy.description,
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function MingriTarotPlayPage() {
  redirect("/tarot/mingri");
}
