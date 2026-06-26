'use client';

import React from 'react';

type PigCounselBubbleProps = {
  title?: string;
  message: string;
  className?: string;
};

const PIG_COUNSEL_BUBBLE_TEXT_TRANSLATIONS = {
  ko: {
    defaultTitle: '연이의 상담 메모',
  },
  en: {
    defaultTitle: "Yeon-i’s Counsel Note",
  },
  ja: {
    defaultTitle: 'ヨンの相談メモ',
  },
} as const;

export function PigCounselBubble({
  title = PIG_COUNSEL_BUBBLE_TEXT_TRANSLATIONS.ko.defaultTitle,
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
