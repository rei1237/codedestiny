"use client";

import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { tarotRevealAnimationAtlas } from "../data/tarotAnimationAtlas";
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
          "--tarot-card-animation": `url("${fortuneTeaHouseAssets.yeoni.transparent.tarotCardAnim}")`,
          "--tarot-reveal-columns": tarotRevealAnimationAtlas.columns,
        } as CSSProperties
      }
      aria-hidden
    />
  );
}
