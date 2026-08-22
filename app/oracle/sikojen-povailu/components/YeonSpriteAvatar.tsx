'use client';

import React from 'react';
import { useSpritePlaybackGate } from '@/src/hooks/useSpritePlaybackGate';
import { frameToSpriteGrid, YEON_SPRITE_COLS, YEON_SPRITE_ROWS, YEON_SPRITE_URL } from '@/lib/yeon/sprite';
import { useSikojenPovailuCopy } from '../_lib/copy';

type YeonSpriteAvatarProps = {
  frames?: number[];
  size?: number;
  alt?: string;
  ringClassName?: string;
  className?: string;
  intervalMs?: number;
  pulse?: boolean;
};

export function YeonSpriteAvatar({
  frames = [1, 2, 3, 4],
  size = 140,
  alt,
  ringClassName = 'from-rose-300 to-pink-300',
  className = '',
  intervalMs = 900,
  pulse = false,
}: YeonSpriteAvatarProps) {
  const copy = useSikojenPovailuCopy();
  const resolvedAlt = alt ?? copy.spriteDefaultAlt;
  const spriteGate = useSpritePlaybackGate<HTMLDivElement>();
  const safeFrames = frames.length > 0 ? frames : [1];
  const [frameIndex, setFrameIndex] = React.useState(0);

  React.useEffect(() => {
    if (safeFrames.length <= 1 || !spriteGate.canAnimate) {
      setFrameIndex(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % safeFrames.length);
    }, Math.max(220, intervalMs));

    return () => window.clearInterval(timer);
  }, [intervalMs, safeFrames.length, spriteGate.canAnimate]);

  const { col, row } = frameToSpriteGrid(safeFrames[frameIndex] ?? 1);

  return (
    <div ref={spriteGate.ref} className={`relative ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
      <div className={`absolute -inset-6 rounded-full bg-gradient-to-br ${ringClassName} shadow-lg`} />
      <div className="relative z-10 h-full w-full overflow-hidden rounded-full border-4 border-white shadow-lg drop-shadow-xl">
        <svg viewBox="0 0 1 1" className={`h-full w-full ${pulse && spriteGate.canAnimate ? 'animate-pulse' : ''}`} role="img" aria-label={resolvedAlt}>
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
