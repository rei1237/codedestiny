"use client";

import styles from "../destiny-bias.module.css";

export default function FansignEditionBadge({
  editionLabel,
  destinyGrade,
}: {
  editionLabel: string;
  destinyGrade: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className={styles.goldBadge}>★ DESTINY VERIFIED</span>
      <span className={styles.pinkBadge}>✦ FANSIGN EDITION</span>
      <span className={`${styles.goldBadge} opacity-90`}>{editionLabel}</span>
      <span className={styles.blueBadge}>{destinyGrade}</span>
    </div>
  );
}
