"use client";

import { useRouter } from "next/navigation";

import styles from "../_styles/diary.module.css";

const DIARY_TOP_BAR_TEXT = {
  ko: {
    back: "뒤로",
    home: "홈으로",
    search: "검색",
    searchPending: "검색은 준비 중입니다",
    title: "운기 다이어리",
  },
  en: {
    back: "Back",
    home: "Home",
    search: "Search",
    searchPending: "Search is coming soon",
    title: "Fortune Diary",
  },
} as const;

const copy = DIARY_TOP_BAR_TEXT.ko;

interface DiaryTopBarProps {
  /** 사람이 읽는 날짜 표기. 없으면 제목만 보인다. */
  subtitle?: string;
}

/**
 * `/diary` 는 `CHROMELESS_ROUTES` 이자 `FEATURE_NAV_SELF_MANAGED_ROUTES` 라
 * 공용 back/home 이 렌더되지 않는다 — 그 의무를 이 바가 대신 진다.
 */
export default function DiaryTopBar({ subtitle }: DiaryTopBarProps) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  return (
    <header className={styles.topBar}>
      <button type="button" className={styles.iconButton} onClick={goBack} aria-label={copy.back}>
        ←
      </button>
      <h1 className={styles.topBarTitle}>
        {copy.title}
        {subtitle ? <span className={styles.topBarSub}>{subtitle}</span> : null}
      </h1>
      {/* 검색은 PR-G 에서 전체화면 오버레이로 붙는다. 세그먼트를 쓰지 않는 이유는
          개인 일기 검색어를 URL·히스토리에 남기지 않기 위해서다. */}
      <button
        type="button"
        className={styles.iconButton}
        aria-disabled="true"
        disabled
        aria-label={copy.searchPending}
        title={copy.searchPending}
      >
        🔍
      </button>
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => router.push("/")}
        aria-label={copy.home}
      >
        ⌂
      </button>
    </header>
  );
}
