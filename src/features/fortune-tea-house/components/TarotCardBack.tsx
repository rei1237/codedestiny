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
          "--tarot-card-back": `url("${fortuneTeaHouseAssets.yeoni.transparent.tarotCard}")`,
        } as CSSProperties
      }
      aria-label="아직 공개되지 않은 연이 타로 카드"
    />
  );
}
