"use client";

import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import styles from "../styles/fortune-tea-house.module.css";

type TarotRevealAnimationProps = {
  active?: boolean;
  className?: string;
};

export default function TarotRevealAnimation({ active = true, className = "" }: TarotRevealAnimationProps) {
  return (
    <div
      className={`${styles.tarotRevealAnimation} ${className}`}
      data-active={active ? "true" : "false"}
      style={
        {
          "--tarot-card-animation": `url("${fortuneTeaHouseAssets.yeoni.transparent.yeoniSprite7Tarot}")`,
          "--tarot-reveal-columns": 4,
        } as CSSProperties
      }
      aria-hidden
    />
  );
}
