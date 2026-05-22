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
  float?: boolean;
};

export function YeonSpriteAvatar({
  frames = [1, 2, 3, 4],
  size = 140,
  alt = '연이 스프라이트',
  ringClassName = 'from-rose-300 to-pink-300',
  className = '',
  intervalMs = 900,
  pulse = false,
  float = true,
}: YeonSpriteAvatarProps) {
  const safeFrames = useMemo(() => {
    const onlyNumbers = (frames || []).filter((v) => Number.isFinite(v));
    return onlyNumbers.length > 0 ? onlyNumbers : [1];
  }, [frames]);

  const [cursor, setCursor] = useState(0);
  const [bounceTrigger, setBounceTrigger] = useState(false);

  useEffect(() => {
    setCursor(0);
    if (safeFrames.length <= 1) return;
    const timer = window.setInterval(() => {
      setCursor((prev) => (prev + 1) % safeFrames.length);
      setBounceTrigger(true);
      const timeout = window.setTimeout(() => setBounceTrigger(false), 280);
      return () => window.clearTimeout(timeout);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [safeFrames, intervalMs]);

  const frame = safeFrames[cursor] || 1;

  const keyframesStyle = `
    @keyframes cdFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes cdOrbitalRotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes cdPulseGlow {
      0%, 100% { transform: scale(1); opacity: 0.85; filter: drop-shadow(0 0 12px rgba(244,63,94,0.45)); }
      50% { transform: scale(1.04); opacity: 1; filter: drop-shadow(0 0 24px rgba(244,63,94,0.75)); }
    }
    @keyframes cdFrameBounce {
      0% { transform: scale(0.93); }
      40% { transform: scale(1.08); }
      70% { transform: scale(0.97); }
      100% { transform: scale(1); }
    }
    .cd-avatar-float {
      animation: cdFloat 3.8s ease-in-out infinite;
    }
    .cd-avatar-ring-rotate {
      animation: cdOrbitalRotate 12s linear infinite;
    }
    .cd-avatar-pulse-glow {
      animation: cdPulseGlow 3s ease-in-out infinite;
    }
    .cd-avatar-frame-bounce {
      animation: cdFrameBounce 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
  `;

  return (
    <div 
      className={`relative select-none ${className} ${float ? 'cd-avatar-float' : ''}`} 
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <style dangerouslySetInnerHTML={{ __html: keyframesStyle }} />

      <div 
        className="absolute -inset-6 rounded-full bg-gradient-to-tr from-pink-400 via-rose-300 to-amber-300 opacity-30 blur-md pointer-events-none cd-avatar-pulse-glow" 
      />

      <div 
        className={`absolute -inset-4 rounded-full bg-gradient-to-br ${ringClassName} opacity-90 shadow-xl cd-avatar-ring-rotate`} 
      />

      <div 
        className={`relative z-10 h-full w-full overflow-hidden rounded-full border-[5px] border-white bg-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-transform duration-200 ${bounceTrigger ? 'cd-avatar-frame-bounce' : ''}`}
      >
        <YeonSpriteFrame
          frame={frame}
          className={`h-full w-full rounded-full ${pulse ? 'animate-pulse' : ''}`}
          ariaLabel={alt}
        />
      </div>

      <span className="absolute -top-3 -right-3 z-20 animate-ping text-yellow-300 text-lg pointer-events-none">✦</span>
      <span className="absolute -bottom-3 -left-3 z-20 animate-pulse text-pink-400 text-lg pointer-events-none">✿</span>
    </div>
  );
}
