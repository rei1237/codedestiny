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
    <header className="sticky top-0 z-30 mx-auto flex w-full max-w-7xl items-center justify-between gap-2 border-b border-white/10 bg-[linear-gradient(180deg,rgba(4,8,27,0.9),rgba(4,8,27,0.55))] px-4 py-3 backdrop-blur-xl md:px-6">
      <button
        type="button"
        onClick={onBack}
        aria-label={copy.backAriaLabel}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/10 text-cyan-100 transition hover:border-cyan-100/70 hover:bg-cyan-200/20"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="flex min-w-0 flex-col items-center text-center">
        <span className="text-[9px] font-semibold tracking-[0.22em] text-cyan-100/75">CELESTIAL CONCERT ARCHIVE</span>
        <span className="text-sm font-black leading-tight tracking-[-0.01em] text-white">최애운명 ENERGY</span>
      </div>

      <div className="flex items-center">
        {coinBadgeText ? (
          <span className="rounded-full border border-pink-200/50 bg-pink-300/15 px-2.5 py-1 text-[10px] font-semibold text-pink-100/90">
            {coinBadgeText}
          </span>
        ) : (
          <div className="h-6 w-6" aria-hidden />
        )}
      </div>
    </header>
  );
}
