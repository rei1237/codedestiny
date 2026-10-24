'use client';

import React from 'react';
import Image from 'next/image';
import { useSpritePlaybackGate } from '@/src/hooks/useSpritePlaybackGate';
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
  pulse = false,
}: YeonSpriteAvatarProps) {
  const copy = useSikojenPovailuCopy();
  const resolvedAlt = alt ?? copy.spriteDefaultAlt;
  const spriteGate = useSpritePlaybackGate<HTMLDivElement>();
  // Keep each ritual phase's existing frame group, with one calm illustration per group.
  const firstFrame = frames[0] ?? 1;
  const scene = firstFrame >= 10 ? 2 : firstFrame >= 7 ? 1 : 0;

  return (
    <div ref={spriteGate.ref} className={`relative ${className}`} style={{ width: `${size}px`, height: `${size}px` }}>
      <div className={`absolute -inset-6 rounded-full bg-gradient-to-br ${ringClassName} shadow-lg`} />
      <div className={`relative z-10 h-full w-full overflow-hidden ${pulse && spriteGate.canAnimate ? 'animate-pulse' : ''}`}>
        <Image src="/images/first-visit/yeoni-tin-oracle-v1.webp" alt={resolvedAlt} width={1440} height={480}
          style={{position:'absolute',top:0,left:`-${scene*100}%`,width:'300%',height:'100%',maxWidth:'none'}}/>
      </div>
    </div>
  );
}
