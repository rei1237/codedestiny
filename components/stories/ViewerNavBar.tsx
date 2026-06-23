"use client";

import Link from "next/link";
import type { ChapterNav } from "@/lib/stories/types";
import type { ReaderTheme } from "@/hooks/useReaderSettings";
import styles from "./viewer.module.css";

interface ViewerNavBarProps {
  storyTitle: string;
  chapterTitle: string;
  listHref: string;
  prev: ChapterNav | null;
  next: ChapterNav | null;
  hidden: boolean;
  dockMuted: boolean;
  theme: ReaderTheme;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

function themeIcon(theme: ReaderTheme) {
  if (theme === "light") return "☀️";
  if (theme === "dark") return "🌙";
  return "🌌";
}

export default function ViewerNavBar({
  storyTitle,
  chapterTitle,
  listHref,
  prev,
  next,
  hidden,
  dockMuted,
  theme,
  onToggleTheme,
  onOpenSettings,
}: ViewerNavBarProps) {
  return (
    <>
      <nav className={`${styles.topNav} ${hidden ? styles.topNavHidden : ""}`} aria-label="챕터 상단 네비게이션">
        <Link className={styles.navButton} href={listHref}>
          ← 목록
        </Link>
        <div className={styles.navTitle}>
          <strong>{storyTitle}</strong>
          <span>{chapterTitle}</span>
        </div>
        <div className={styles.navActions}>
          <Link className={styles.iconButton} href="/" aria-label="메인 화면으로 이동">
            홈
          </Link>
          <button className={styles.iconButton} type="button" onClick={onToggleTheme} aria-label="테마 전환">
            {themeIcon(theme)}
          </button>
          <button className={styles.iconButton} type="button" onClick={onOpenSettings} aria-label="읽기 설정 열기">
            ⚙️
          </button>
        </div>
      </nav>

      <nav className={`${styles.bottomNav} ${dockMuted ? styles.bottomNavMuted : ""}`} aria-label="챕터 하단 네비게이션">
        {prev ? (
          <Link className={styles.bottomLink} href={prev.href}>
            ← 이전화
          </Link>
        ) : (
          <span className={`${styles.bottomLink} ${styles.bottomLinkDisabled}`}>← 이전화</span>
        )}
        <Link className={styles.bottomLink} href={listHref}>
          목록
        </Link>
        {next ? (
          <Link className={styles.bottomLink} href={next.href}>
            다음화 →
          </Link>
        ) : (
          <span className={`${styles.bottomLink} ${styles.bottomLinkDisabled}`}>다음화 →</span>
        )}
      </nav>
    </>
  );
}
