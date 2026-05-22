import type { AnimalDestinyData } from "@/app/saju/animal-destiny/lib/types";

type Props = {
  animal: AnimalDestinyData;
  className?: string;
};

function motifByAnimal(name: string) {
  if (name.includes("나비")) {
    return (
      <>
        <path d="M76 74c8-6 13-15 12-24-10 2-16 7-20 15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M52 74c-8-6-13-15-12-24 10 2 16 7 20 15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M64 58v30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }

  if (name.includes("사자")) {
    return (
      <>
        <circle cx="64" cy="66" r="21" fill="none" stroke="currentColor" strokeWidth="3.4" />
        <circle cx="64" cy="66" r="30" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 4" opacity="0.75" />
      </>
    );
  }

  if (name.includes("고양이")) {
    return (
      <>
        <path d="M48 50l8-11 8 11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M80 50l-8-11-8 11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M46 80c6 6 30 6 36 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  if (name.includes("강아지") || name.includes("사슴") || name.includes("토끼")) {
    return (
      <>
        <path d="M45 51c0-7 6-13 14-13h10c8 0 14 6 14 13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M44 79c8 7 32 7 40 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  if (name.includes("꽃돼지") || name.includes("햄스터") || name.includes("병아리")) {
    return (
      <>
        <circle cx="64" cy="67" r="16" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="56" cy="65" r="2.2" fill="currentColor" />
        <circle cx="72" cy="65" r="2.2" fill="currentColor" />
        <path d="M58 74h12" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </>
    );
  }

  return (
    <>
      <path d="M48 82c6 5 26 5 32 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="52" cy="63" r="3" fill="currentColor" />
      <circle cx="76" cy="63" r="3" fill="currentColor" />
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
          <stop offset="0%" stopColor={palette.primary} stopOpacity="0.9" />
          <stop offset="100%" stopColor={palette.secondary} stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id={`ring-${animal.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.accent} stopOpacity="0.92" />
          <stop offset="100%" stopColor="#f6e5bf" stopOpacity="0.84" />
        </linearGradient>
      </defs>

      <rect x="8" y="8" width="112" height="112" rx="34" fill={palette.background} opacity="0.96" />
      <circle cx="64" cy="64" r="44" fill={`url(#bg-${animal.id})`} opacity="0.28" />
      <circle cx="64" cy="64" r="34" fill="white" opacity="0.72" />
      <circle cx="64" cy="64" r="39" fill="none" stroke={`url(#ring-${animal.id})`} strokeWidth="2.6" opacity="0.9" />
      <circle cx="64" cy="64" r="30" fill="none" stroke={palette.primary} strokeWidth="1.1" opacity="0.38" />

      <g style={{ color: palette.accent }}>
        {motifByAnimal(animal.animal_ko)}
      </g>

      <g fill={palette.accent} opacity="0.42">
        <circle cx="20" cy="22" r="2" />
        <circle cx="108" cy="18" r="2" />
        <circle cx="112" cy="108" r="2" />
        <circle cx="18" cy="106" r="2" />
      </g>
    </svg>
  );
}
