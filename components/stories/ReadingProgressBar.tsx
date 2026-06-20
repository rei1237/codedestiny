"use client";

import styles from "./viewer.module.css";

interface ReadingProgressBarProps {
  progress: number;
}

export default function ReadingProgressBar({ progress }: ReadingProgressBarProps) {
  const bounded = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className={styles.progressWrap} aria-label={`읽기 진행률 ${bounded}%`}>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${bounded}%` }} />
      </div>
    </div>
  );
}
