"use client";
import Link from "next/link";
import { UI_TEXT, pick, type Locale } from "../_copy";
import styles from "../human-design.module.css";

/** 풀이 문장이 잠긴 자리에 놓는 안내. 차트·정의·이름은 그대로 무료이고, 이 자리의 풀이만 사주 영구 묶음에 들어 있다. */
export default function GuideLockedNotice({ locale }: { locale: Locale }) {
  return (
    <aside className={styles.guideLocked} aria-label={pick(UI_TEXT.guideLockedTitle, locale)}>
      <p className={styles.guideLockedTitle}>{pick(UI_TEXT.guideLockedTitle, locale)}</p>
      <p className={styles.guideNote}>{pick(UI_TEXT.guideLockedBody, locale)}</p>
      <Link className={styles.guideLockedLink} href="/saju/">{pick(UI_TEXT.guideLockedCta, locale)}</Link>
    </aside>
  );
}
