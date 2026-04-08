"use client";

import React from "react";

export const SPRITE_ROWS = 3;
export const SPRITE_COLS = 7;
export const TOTAL_FRAMES = SPRITE_ROWS * SPRITE_COLS; // 21

export type SpriteCoords = {
  row: number;
  col: number;
  xPercent: number;
  yPercent: number;
};

export function clampFrameIndex(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.floor(index)));
}

export function getSpriteCoords(index: number, cols = SPRITE_COLS, rows = SPRITE_ROWS): SpriteCoords {
  const safe = clampFrameIndex(index);
  const col = safe % cols;
  const row = Math.floor(safe / cols);
  const xPercent = cols <= 1 ? 0 : (col / (cols - 1)) * 100;
  const yPercent = rows <= 1 ? 0 : (row / (rows - 1)) * 100;
  return { row, col, xPercent, yPercent };
}

type SpriteCharacterProps = {
  imagePath: string;
  frameIndex: number;
  size?: number;
  className?: string;
  ariaLabel?: string;
};

export default function SpriteCharacter({
  imagePath,
  frameIndex,
  size = 220,
  className,
  ariaLabel = "tadagochi-sprite",
}: SpriteCharacterProps) {
  const { xPercent, yPercent } = getSpriteCoords(frameIndex);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        width: size,
        height: size,
        backgroundImage: `url("${encodeURI(imagePath)}")`,
        backgroundSize: `${SPRITE_COLS * 100}% ${SPRITE_ROWS * 100}%`,
        backgroundPosition: `${xPercent}% ${yPercent}%`,
        backgroundRepeat: "no-repeat",
        imageRendering: "auto",
        filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.22))",
      }}
    />
  );
}
