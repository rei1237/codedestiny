"use client";

import { memo } from "react";
import type { ArtistFilterKey } from "../_lib/musicFormat";
import { ARTIST_FILTERS } from "../_lib/musicFormat";
import styles from "../music-lounge.module.css";

type ArtistChipsProps = {
  label: string;
  value: ArtistFilterKey;
  counts: Readonly<Record<ArtistFilterKey, number>>;
  onChange: (next: ArtistFilterKey) => void;
};

export const ArtistChips = memo(function ArtistChips({ label, value, counts, onChange }: ArtistChipsProps) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {ARTIST_FILTERS.map((filter) => {
        const count = counts[filter.key] || 0;
        if (filter.key !== "all" && count === 0) return null;
        return (
          <button
            key={filter.key}
            type="button"
            className={styles.chip}
            aria-pressed={value === filter.key}
            onClick={() => onChange(filter.key)}
          >
            {filter.label}
            <span className={styles.chipCount}>{count}</span>
          </button>
        );
      })}
    </div>
  );
});
