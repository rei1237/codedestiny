'use client';

import React from 'react';

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
  alt = '꽃돼지 주석점 이미지',
  ringClassName = 'from-rose-300 to-pink-300',
  className = '',
  intervalMs = 900,
  pulse = false,
}: YeonSpriteAvatarProps) {
  void frames;
  void intervalMs;

  return (
    <div className={`relative ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
      <div className={`absolute -inset-6 rounded-full bg-gradient-to-br ${ringClassName} shadow-lg`} />
      <div className="relative z-10 h-full w-full overflow-hidden rounded-full border-4 border-white shadow-lg drop-shadow-xl">
        <img
          src="/fuctionassets/piggyfortune.webp"
          alt={alt}
          className={`h-full w-full rounded-full object-cover object-center ${pulse ? 'animate-pulse' : ''}`}
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  );
}
