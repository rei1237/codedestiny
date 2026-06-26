"use client";

"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface Props {
  className?: string;
}

const COSMIC_SIGIL_COPY = {
  ko: {
    ariaLabel: "우주 운명 시길",
  },
  en: {
    ariaLabel: "Cosmic destiny sigil",
  },
  ja: {
    ariaLabel: "宇宙の運命シジル",
  },
  zh: {
    ariaLabel: "宇宙命运印记",
  },
};

function getCosmicSigilCopy(locale: LoadingLocale) {
  if (locale === "en" || locale === "ja") return COSMIC_SIGIL_COPY[locale];
  if (locale === "zh-CN" || locale === "zh-TW") return COSMIC_SIGIL_COPY.zh;
  return COSMIC_SIGIL_COPY.ko;
}

export default function CosmicSigil({ className }: Props) {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const copy = getCosmicSigilCopy(locale);

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
    <svg
      viewBox="0 0 600 600"
      role="img"
      aria-label={copy.ariaLabel}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="orb" cx="50%" cy="45%" r="52%">
          <stop offset="0%" stopColor="#d9f2ff" stopOpacity="0.96" />
          <stop offset="45%" stopColor="#8ad7ff" stopOpacity="0.82" />
          <stop offset="75%" stopColor="#5f9cff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#241246" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f9d6ff" />
          <stop offset="40%" stopColor="#7ee7ff" />
          <stop offset="100%" stopColor="#ffe4a4" />
        </linearGradient>
        <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15" />
        </linearGradient>
        <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="600" height="600" fill="url(#orb)" />

      <g opacity="0.65" filter="url(#softGlow)">
        <circle cx="300" cy="300" r="210" fill="none" stroke="url(#ring)" strokeWidth="2.5" />
        <circle cx="300" cy="300" r="164" fill="none" stroke="url(#ring)" strokeWidth="1.8" />
        <circle cx="300" cy="300" r="115" fill="none" stroke="url(#ring)" strokeWidth="1.2" />
        <path d="M90 300h420" stroke="url(#line)" strokeWidth="1.6" />
        <path d="M300 90v420" stroke="url(#line)" strokeWidth="1.6" />
        <path d="M141 193L459 407" stroke="url(#line)" strokeWidth="1.2" />
        <path d="M459 193L141 407" stroke="url(#line)" strokeWidth="1.2" />
      </g>

      <g filter="url(#softGlow)">
        <circle cx="300" cy="300" r="30" fill="#fcf3d7" fillOpacity="0.95" />
        <circle cx="300" cy="300" r="12" fill="#fff" />

        <circle cx="212" cy="228" r="7" fill="#c8f0ff" />
        <circle cx="386" cy="215" r="6" fill="#c8f0ff" />
        <circle cx="406" cy="336" r="8" fill="#f7d0ff" />
        <circle cx="219" cy="371" r="7" fill="#f7d0ff" />
        <circle cx="300" cy="168" r="6" fill="#ffe8a8" />
        <circle cx="300" cy="432" r="6" fill="#ffe8a8" />

        <path d="M212 228L300 168L386 215L406 336L300 432L219 371Z" fill="none" stroke="url(#ring)" strokeWidth="2.3" />
        <path d="M212 228L300 300L386 215" fill="none" stroke="url(#ring)" strokeWidth="1.8" />
        <path d="M219 371L300 300L406 336" fill="none" stroke="url(#ring)" strokeWidth="1.8" />
      </g>
    </svg>
  );
}
