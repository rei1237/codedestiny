"use client";

import styles from "../destiny-bias.module.css";

const STEP_LABELS = ["01\n입장", "02\n운명", "03\n세팅", "04\n동기화", "05\n카드"] as const;

export default function DestinyBiasProgress({ current }: { current: number }) {
  return (
    <div className={styles.fanProgressWrap} role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={5} aria-label="진행 단계">
      {STEP_LABELS.map((label, index) => {
        const step = index + 1;
        const active = current === step;
        const done = current > step;
        return (
          <div
            key={label}
            className={`${styles.fanDot} ${active ? styles.fanDotActive : done ? styles.fanDotDone : ""}`}
          >
            <div className={styles.fanDotCircle} />
            <span className={styles.fanDotLabel}>{label.replace("\n", " ")}</span>
          </div>
        );
      })}
    </div>
  );
}
