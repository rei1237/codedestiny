"use client";

import { frameToSpriteGrid, YEON_SPRITE_COLS, YEON_SPRITE_ROWS, YEON_SPRITE_URL } from "@/lib/yeon/sprite";

type Props = {
  frame: number;
  className?: string;
  ariaLabel?: string;
};

export default function YeonSpriteFrame({ frame, className = "", ariaLabel = "연이 스프라이트" }: Props) {
  const { col, row } = frameToSpriteGrid(frame);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg viewBox="0 0 1 1" className="h-full w-full" role="img" aria-label={ariaLabel}>
        <image
          href={YEON_SPRITE_URL}
          x={-col}
          y={-row}
          width={YEON_SPRITE_COLS}
          height={YEON_SPRITE_ROWS}
          preserveAspectRatio="xMinYMin slice"
        />
      </svg>
    </div>
  );
}
