"use client";

import type { TeaHouseCup } from "../data/teaCups";
import { getTeaCupSprite, type TeaCupSpriteState } from "../data/teaCupSpriteMap";
import SpriteCrop from "./SpriteCrop";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TeaCupVisualProps = {
  cup: Pick<TeaHouseCup, "id" | "name" | "topic" | "accent" | "particleTone">;
  state?: TeaCupSpriteState;
  size?: "menu" | "large" | "hero" | "debug";
  className?: string;
  decorative?: boolean;
};

/** 화면에 보이는 한국어 원문. {name} 은 찻잔 이름으로 치환된다 — 모든 로케일에서 그대로 둘 것. */
const KO = {
  cupAlt: "{name} 찻잔",
};

export default function TeaCupVisual({ cup, state = "normal", size = "menu", className = "", decorative = false }: TeaCupVisualProps) {
  const copy = useTeaHouseCopy("teaCupVisual", KO);
  const crop = getTeaCupSprite(cup.id, state);

  return (
    <span
      className={`${styles.teaCupVisual} ${className}`}
      data-size={size}
      data-state={state}
      data-accent={cup.accent}
      data-particle-tone={cup.particleTone}
    >
      <span className={styles.teaCupVisualGlow} aria-hidden />
      <SpriteCrop
        className={styles.teaCupVisualSprite}
        src={crop.src}
        sheetWidth={crop.sheetWidth}
        sheetHeight={crop.sheetHeight}
        mobileSrc={crop.mobileSrc}
        mobileSheetWidth={crop.mobileSheetWidth}
        mobileSheetHeight={crop.mobileSheetHeight}
        mobileCrop={crop.mobileCrop}
        x={crop.x}
        y={crop.y}
        width={crop.width}
        height={crop.height}
        alt={decorative ? "" : copy.cupAlt.replace("{name}", cup.name)}
        fallback={
          <span className={styles.teaCupVisualFallback}>
            <strong>{cup.name}</strong>
            <small>{cup.topic}</small>
          </span>
        }
      />
      <span className={styles.teaCupVisualParticles} aria-hidden />
    </span>
  );
}
