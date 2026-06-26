'use client';

import React from 'react';
import { frameToSpriteGrid, YEON_SPRITE_COLS, YEON_SPRITE_ROWS, YEON_SPRITE_URL } from '@/lib/yeon/sprite';

type YeonSpriteAvatarProps = {
  frames?: number[];
  size?: number;
  alt?: string;
  ringClassName?: string;
  className?: string;
  intervalMs?: number;
  pulse?: boolean;
};

const YEON_SPRITE_AVATAR_TEXT_TRANSLATIONS = {
  ko: {
    defaultAlt: '꽃돼지 주석점 이미지',
  },
  en: {
    defaultAlt: 'flower pig tin oracle image',
  },
  ja: {
    defaultAlt: '花豚の錫占い画像',
  },
} as const;

export function YeonSpriteAvatar({
  frames = [1, 2, 3, 4],
  size = 140,
  alt = YEON_SPRITE_AVATAR_TEXT_TRANSLATIONS.ko.defaultAlt,
  ringClassName = 'from-rose-300 to-pink-300',
  className = '',
  intervalMs = 900,
  pulse = false,
}: YeonSpriteAvatarProps) {
  const safeFrames = frames.length > 0 ? frames : [1];
  const [frameIndex, setFrameIndex] = React.useState(0);

  React.useEffect(() => {
    if (safeFrames.length <= 1) return;
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % safeFrames.length);
    }, Math.max(220, intervalMs));

    return () => window.clearInterval(timer);
  }, [intervalMs, safeFrames.length]);

  const { col, row } = frameToSpriteGrid(safeFrames[frameIndex] ?? 1);

  return (
    <div className={`relative ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
      <div className={`absolute -inset-6 rounded-full bg-gradient-to-br ${ringClassName} shadow-lg`} />
      <div className="relative z-10 h-full w-full overflow-hidden rounded-full border-4 border-white shadow-lg drop-shadow-xl">
        <svg viewBox="0 0 1 1" className={`h-full w-full ${pulse ? 'animate-pulse' : ''}`} role="img" aria-label={alt}>
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
    </div>
  );
}
