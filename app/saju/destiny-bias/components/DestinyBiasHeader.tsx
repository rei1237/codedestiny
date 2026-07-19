"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface DestinyBiasHeaderProps {
  onBack: () => void;
  coinBadgeText?: string;
}

const DESTINY_BIAS_HEADER_COPY = {
  ko: {
    backAriaLabel: "뒤로 가기",
  },
  en: {
    backAriaLabel: "Go back",
  },
  ja: {
    backAriaLabel: "戻る",
  },
  zh: {
    backAriaLabel: "返回",
  },
};

function getDestinyBiasHeaderCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja") return DESTINY_BIAS_HEADER_COPY[locale];
  if (locale === "zh-CN" || locale === "zh-TW") return DESTINY_BIAS_HEADER_COPY.zh;
  return DESTINY_BIAS_HEADER_COPY.ko;
}

export default function DestinyBiasHeader({ onBack, coinBadgeText }: DestinyBiasHeaderProps) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getDestinyBiasHeaderCopy(locale);

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 mx-auto flex w-full max-w-7xl items-center justify-between gap-2 border-b border-white/10 bg-[linear-gradient(180deg,rgba(7,4,22,0.92),rgba(7,4,22,0.58))] px-4 py-3 backdrop-blur-xl md:px-6">
      <button
        type="button"
        onClick={onBack}
        aria-label={copy.backAriaLabel}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--bias-gold)]/35 bg-[var(--bias-gold)]/10 text-[var(--bias-gold)] transition hover:border-[var(--bias-gold)]/70 hover:bg-[var(--bias-gold)]/20"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="flex min-w-0 flex-col items-center text-center">
        <span className="text-[9px] font-semibold tracking-[0.22em] text-[var(--bias-gold)]/75">CELESTIAL CONCERT ARCHIVE</span>
        <span className="text-sm font-black leading-tight tracking-[-0.01em] text-white">최애운명 ENERGY</span>
      </div>

      <div className="flex items-center">
        {coinBadgeText ? (
          <span className="rounded-full border border-[var(--bias-pink)]/50 bg-[var(--bias-pink)]/15 px-2.5 py-1 text-[10px] font-semibold text-white/90">
            {coinBadgeText}
          </span>
        ) : (
          <div className="h-6 w-6" aria-hidden />
        )}
      </div>
    </header>
  );
}
