import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import styles from "../styles/fortune-tea-house.module.css";

type TarotCardBackProps = {
  className?: string;
  animated?: boolean;
};

export default function TarotCardBack({ className = "", animated = false }: TarotCardBackProps) {
  return (
    <div
      className={`${styles.tarotCardBack} ${className}`}
      data-animated={animated ? "true" : "false"}
      style={
        {
          "--selection-pattern": `url("${fortuneTeaHouseAssets.ui.selection}")`,
          "--tarot-card-back": `url("${fortuneTeaHouseAssets.yeoni.transparent.tarotCard}")`,
          "--tarot-card-animation": `url("${fortuneTeaHouseAssets.yeoni.transparent.tarotCardAnim}")`,
        } as CSSProperties
      }
      aria-label="아직 공개되지 않은 운명의 카드"
    >
      <span className={styles.tarotBackMoon} aria-hidden>
        月
      </span>
      <span className={styles.tarotBackLotus} aria-hidden>
        花
      </span>
      <span className={styles.tarotBackStars} aria-hidden>
        ✦ ✧ ✦
      </span>
    </div>
  );
}
