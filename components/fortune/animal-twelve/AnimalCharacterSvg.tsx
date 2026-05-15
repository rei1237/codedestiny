import type { AnimalDestinyData } from "@/app/saju/animal-destiny/lib/types";

type Props = {
  animal: AnimalDestinyData;
  className?: string;
};

function ornamentByAnimal(name: string) {
  if (name.includes("고양이")) {
    return (
      <>
        <path d="M78 38c6-10 10-14 18-16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
        <circle cx="101" cy="20" r="4" fill="currentColor" opacity="0.28" />
        <path d="M46 90c9-4 16-4 24 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      </>
    );
  }

  if (name.includes("사자")) {
    return (
      <>
        <circle cx="64" cy="58" r="44" fill="currentColor" opacity="0.16" />
        <path d="M62 12l4 10 10 2-8 6 2 10-8-5-8 5 2-10-8-6 10-2z" fill="currentColor" opacity="0.26" />
      </>
    );
  }

  if (name.includes("꽃돼지")) {
    return (
      <>
        <path d="M26 94c8-6 14-8 22-8 9 0 17 3 25 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.42" />
        <circle cx="84" cy="28" r="7" fill="currentColor" opacity="0.2" />
        <path d="M92 36l4 4-4 4-4-4z" fill="currentColor" opacity="0.28" />
      </>
    );
  }

  if (name.includes("나비")) {
    return (
      <>
        <ellipse cx="43" cy="56" rx="14" ry="12" fill="currentColor" opacity="0.16" />
        <ellipse cx="85" cy="56" rx="14" ry="12" fill="currentColor" opacity="0.16" />
        <path d="M64 48v26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </>
    );
  }

  return (
    <>
      <circle cx="28" cy="38" r="5" fill="currentColor" opacity="0.22" />
      <circle cx="100" cy="34" r="5" fill="currentColor" opacity="0.22" />
      <path d="M28 92c10-7 20-10 36-10s26 3 36 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.28" />
    </>
  );
}

export default function AnimalCharacterSvg({ animal, className }: Props) {
  const palette = animal.palette || {
    primary: "#a78bfa",
    secondary: "#fde68a",
    accent: "#f59e0b",
    background: "#fdf4ff",
  };

  return (
    <svg
      viewBox="0 0 128 128"
      role="img"
      aria-label={`${animal.animal_ko} 캐릭터`}
      className={className}
      style={{ color: palette.accent }}
    >
      <defs>
        <linearGradient id={`bg-${animal.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.primary} stopOpacity="0.95" />
          <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <rect x="6" y="6" width="116" height="116" rx="28" fill={palette.background} opacity="0.94" />
      <circle cx="64" cy="68" r="38" fill={`url(#bg-${animal.id})`} />

      <circle cx="50" cy="64" r="4" fill="#1f1530" opacity="0.85" />
      <circle cx="78" cy="64" r="4" fill="#1f1530" opacity="0.85" />
      <path d="M54 82c5 5 15 5 20 0" stroke="#2f2045" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.82" />
      <circle cx="40" cy="48" r="11" fill={palette.secondary} opacity="0.62" />
      <circle cx="88" cy="48" r="11" fill={palette.secondary} opacity="0.62" />

      {ornamentByAnimal(animal.animal_ko)}

      <g fill={palette.accent} opacity="0.68">
        <circle cx="18" cy="20" r="2" />
        <circle cx="108" cy="18" r="2" />
        <circle cx="112" cy="104" r="2" />
        <circle cx="16" cy="108" r="2" />
      </g>
    </svg>
  );
}
