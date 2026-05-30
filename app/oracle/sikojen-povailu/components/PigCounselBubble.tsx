'use client';

import React from 'react';

type PigCounselBubbleProps = {
  title?: string;
  message: string;
  className?: string;
};

export function PigCounselBubble({
  title = '연이의 상담 메모',
  message,
  className = '',
}: PigCounselBubbleProps) {
  return (
    <div className={`rounded-2xl border border-rose-200/80 bg-white/88 px-4 py-3 shadow-[0_8px_22px_rgba(190,24,93,0.14)] backdrop-blur ${className}`}>
      <p className="mb-1 text-[11px] font-bold tracking-wide text-rose-500">🐷 {title}</p>
      <p className="text-xs leading-relaxed text-rose-700">{message}</p>
    </div>
  );
}
