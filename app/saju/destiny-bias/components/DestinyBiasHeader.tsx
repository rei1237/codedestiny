"use client";

import styles from "../destiny-bias.module.css";

interface DestinyBiasHeaderProps {
  onBack: () => void;
  coinBadgeText?: string;
}

export default function DestinyBiasHeader({ onBack, coinBadgeText }: DestinyBiasHeaderProps) {
  return (
    <header className={styles.biasHeader}>
      <button
        type="button"
        onClick={onBack}
        aria-label="뒤로 가기"
        className={styles.backBtn}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="flex min-w-0 flex-col items-center text-center">
        <span className="text-[9px] font-semibold tracking-[0.22em] text-fuchsia-200/80">COSMIC IDOL ARENA</span>
        <span className="text-sm font-extrabold leading-tight tracking-[-0.01em] text-white">최애운명</span>
      </div>

      <div className="flex items-center">
        {coinBadgeText ? (
          <span className="rounded-full border border-fuchsia-200/40 bg-fuchsia-300/12 px-2.5 py-1 text-[10px] font-semibold text-fuchsia-100/90">
            {coinBadgeText}
          </span>
        ) : (
          <div className="h-6 w-6" aria-hidden />
        )}
      </div>

      <div className={styles.biasHeaderAuroraLine} aria-hidden />
    </header>
  );
}
