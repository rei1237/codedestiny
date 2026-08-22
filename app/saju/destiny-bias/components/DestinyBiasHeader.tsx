"use client";

import { useDestinyBiasCopy } from "../_lib/copy";

interface DestinyBiasHeaderProps {
  onBack: () => void;
  coinBadgeText?: string;
}

export default function DestinyBiasHeader({ onBack, coinBadgeText }: DestinyBiasHeaderProps) {
  const copy = useDestinyBiasCopy();

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
        <span className="text-sm font-black leading-tight tracking-[-0.01em] text-white">{copy.headerTitle} ENERGY</span>
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
