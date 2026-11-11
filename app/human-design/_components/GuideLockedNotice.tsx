"use client";
import Link from "next/link";
import { UI_TEXT, pick, type Locale } from "../_copy";
import styles from "../human-design.module.css";

/** 무료 정적 풀이에 필요한 로그인·저장 프로필 안내. */
export default function GuideLockedNotice({ locale }: { locale: Locale }) {
  return (
    <aside className={styles.guideLocked} aria-label={pick(UI_TEXT.guideLockedTitle, locale)}>
      <p className={styles.guideLockedTitle}>{pick(UI_TEXT.guideLockedTitle, locale)}</p>
      <p className={styles.guideNote}>{pick(UI_TEXT.guideLockedBody, locale)}</p>
      <Link className={styles.guideLockedLink} data-cd-reading-action="primary" href="/human-design/">{pick(UI_TEXT.guideLockedCta, locale)}</Link>
    </aside>
  );
}
