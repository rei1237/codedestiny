import type { Metadata } from "next";
import Link from "next/link";
import StoriesIndexRouteClient from "./StoriesIndexRouteClient";
import { getStories } from "@/lib/stories/data";
import styles from "./stories.module.css";

const STORIES_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "CODE DESTINY NOVEL | Code Destiny",
    description: "운명, 사주, 별자리, 타로를 주제로 한 무료 웹소설을 읽는 CODE DESTINY NOVEL입니다.",
    homeLink: "홈 화면 바로가기",
  },
  en: {
    title: "CODE DESTINY NOVEL | Code Destiny",
    description: "CODE DESTINY NOVEL offers free web novels themed around destiny, saju, astrology, and tarot.",
    homeLink: "Go to Home",
  },
  ja: {
    title: "CODE DESTINY NOVEL | Code Destiny",
    description: "運命、四柱推命、星座、タロットをテーマにした無料ウェブ小説を読めるCODE DESTINY NOVELです。",
    homeLink: "ホーム画面へ",
  },
} as const;

const storiesPageCopy = STORIES_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: storiesPageCopy.title,
  description: storiesPageCopy.description,
  alternates: {
    canonical: "/stories",
  },
};

export default function StoriesPage() {
  const stories = getStories();

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Link className={styles.backLink} href="/">
          {storiesPageCopy.homeLink}
        </Link>
        <StoriesIndexRouteClient stories={stories} />
      </div>
    </main>
  );
}
