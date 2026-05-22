'use client';

import React, { useEffect, useMemo, useState } from 'react';
import YeonSpriteFrame from '@/components/yeon/YeonSpriteFrame';

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
  alt = '연이 스프라이트',
  ringClassName = 'from-rose-300 to-pink-300',
  className = '',
  intervalMs = 900,
  pulse = false,
}: YeonSpriteAvatarProps) {
  const safeFrames = useMemo(() => {
    const onlyNumbers = (frames || []).filter((v) => Number.isFinite(v));
    return onlyNumbers.length > 0 ? onlyNumbers : [1];
  }, [frames]);

  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    setCursor(0);
    if (safeFrames.length <= 1) return;
    const timer = window.setInterval(() => {
      setCursor((prev) => (prev + 1) % safeFrames.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [safeFrames, intervalMs]);

  const frame = safeFrames[cursor] || 1;

  return (
    <div className={`relative ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
      <div className={`absolute -inset-6 rounded-full bg-gradient-to-br ${ringClassName} shadow-lg`} />
      <div className="relative z-10 h-full w-full overflow-hidden rounded-full border-4 border-white shadow-lg drop-shadow-xl">
        <YeonSpriteFrame
          frame={frame}
          className={`h-full w-full rounded-full ${pulse ? 'animate-pulse' : ''}`}
          ariaLabel={alt}
        />
      </div>
    </div>
  );
}
