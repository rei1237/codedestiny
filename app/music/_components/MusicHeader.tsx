import Link from "next/link";
import type { MusicCopy } from "../_lib/musicCopy";
import styles from "../music-lounge.module.css";

// 몰입형 페이지 규칙: 전역 내비 대신 페이지 안에 홈 링크(브랜드 마크)를 둔다.
export function MusicHeader({ copy }: { copy: MusicCopy }) {
  return (
    <header className={styles.head}>
      <Link href="/" className={styles.brand} aria-label={copy.home}>
        {copy.brand}
      </Link>
      <h1 className={styles.title}>
        <span className={styles.moon} aria-hidden="true">🌙</span>
        {copy.title}
      </h1>
      <p className={styles.tagline}>{copy.tagline}</p>
    </header>
  );
}
