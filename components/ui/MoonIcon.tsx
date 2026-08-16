"use client";

import { useId } from "react";

export type MoonPhase = "new" | "crescent" | "half" | "gibbous" | "full" | "progress" | "outline";

type MoonIconProps = {
  phase?: MoonPhase;
  progress?: number;
  className?: string;
  title?: string;
};

function clampProgress(value: number | undefined) {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(1, Number(value)));
}

export default function MoonIcon({ phase = "half", progress = 0.5, className = "", title }: MoonIconProps) {
  const rawId = useId().replace(/:/g, "");
  const gradientId = `moonGlow-${rawId}`;
  const clipId = `moonClip-${rawId}`;
  const normalized = clampProgress(progress);
  const shadowOffset = phase === "progress"
    ? 32 + normalized * 58
    : phase === "new"
      ? 32
      : phase === "crescent"
        ? 45
        : phase === "half"
          ? 56
          : phase === "gibbous"
            ? 72
            : 96;

  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : "presentation"} aria-label={title || undefined} aria-hidden={title ? undefined : true}>
      <defs>
        <radialGradient id={gradientId} cx="38%" cy="30%" r="62%">
          <stop offset="0%" stopColor="#F8FAFF" stopOpacity="1" />
          <stop offset="48%" stopColor="#C8CEFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.5" />
        </radialGradient>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="24" />
        </clipPath>
      </defs>
      {phase === "outline" ? (
        <>
          <circle cx="32" cy="32" r="23" fill="none" stroke="#A78BFA" strokeWidth="2.2" opacity="0.78" />
          <path d="M39 12A24 24 0 0 0 39 52A21 21 0 1 1 39 12Z" fill="#C8CEFF" opacity="0.14" />
        </>
      ) : (
        <>
          <circle cx="32" cy="32" r="25" fill="#A78BFA" opacity="0.13" />
          <g clipPath={`url(#${clipId})`}>
            <circle cx="32" cy="32" r="24" fill={`url(#${gradientId})`} />
            {phase !== "full" ? (
              <circle cx={shadowOffset} cy="32" r="24.5" fill="#0E1030" opacity={phase === "new" || normalized === 0 ? 0.96 : 0.92} />
            ) : null}
            <circle cx="25" cy="27" r="2.1" fill="#7B82C4" opacity="0.34" />
            <circle cx="39" cy="21" r="1.4" fill="#7B82C4" opacity="0.22" />
            <circle cx="36" cy="41" r="1.8" fill="#7B82C4" opacity="0.28" />
          </g>
          <circle cx="32" cy="32" r="24" fill="none" stroke="#C8CEFF" strokeOpacity="0.35" />
        </>
      )}
    </svg>
  );
}
