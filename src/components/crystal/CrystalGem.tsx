"use client";

import { useId, type CSSProperties } from "react";

export type GemType =
  | "amethyst"
  | "rose_quartz"
  | "obsidian"
  | "moonstone"
  | "lapis"
  | "citrine"
  | "black_tourmaline"
  | "tiger_eye"
  | "clear_quartz"
  | "green_aventurine"
  | "garnet"
  | "labradorite";

export type RubState = "idle" | "rubbing" | "activated" | "revealed";

type CrystalGemProps = {
  type: GemType;
  size?: number | string;
  state?: RubState;
  progress?: number;
  compact?: boolean;
  className?: string;
  /**
   * 이 보석을 가리키는 접근성 이름.
   * 🔴 넘기지 않으면 GemShape.label 의 **한국어**가 그대로 aria-label 이 된다. 호출부는
   *    이미 로케일별 보석 이름을 갖고 있으므로(getLocalizedGemMeta) 그것을 넘겨야 한다 —
   *    이 컴포넌트 자신은 로케일을 모른다.
   */
  ariaLabel?: string;
};

type GemShape = {
  label: string;
  color: string;
  glow: string;
  facet: string;
  stops: string[];
  blur: number;
  d: string;
  highlight: { cx: number; cy: number; rx: number; ry: number; rotate?: number };
  facets: string[];
  particles: Array<{ x: number; y: number; r: number; delay: number }>;
};

export const GEM_META: Record<GemType, { name: string; keywords: string; energy: string; initial: string }> = {
  amethyst: {
    name: "자수정",
    keywords: "직관 · 보호 · 내면의 평화",
    energy: "직관과 보호의 빛이 내면을 맑게 정화합니다.",
    initial: "A",
  },
  rose_quartz: {
    name: "장미수정",
    keywords: "자기애 · 치유 · 감정 회복",
    energy: "부드러운 수용의 결이 마음의 상처를 감싸 안습니다.",
    initial: "R",
  },
  obsidian: {
    name: "흑요석",
    keywords: "진실 · 경계 · 에너지 정화",
    energy: "흐린 위로보다 선명한 진실과 필요한 경계를 세웁니다.",
    initial: "O",
  },
  moonstone: {
    name: "문스톤",
    keywords: "감수성 · 여성성 · 사이클",
    energy: "감정의 물결과 변화의 때를 조용히 받아들이게 합니다.",
    initial: "M",
  },
  lapis: {
    name: "라피스라줄리",
    keywords: "지혜 · 소통 · 진실의 힘",
    energy: "깊은 지혜와 말해야 할 진실을 또렷하게 드러냅니다.",
    initial: "L",
  },
  citrine: {
    name: "시트린",
    keywords: "풍요 · 자신감 · 행동력",
    energy: "망설임을 걷고 현실의 문을 여는 행동력을 깨웁니다.",
    initial: "C",
  },
  black_tourmaline: {
    name: "블랙투르말린",
    keywords: "차단 · 뿌리내림 · 안정",
    energy: "흔들리게 하는 것을 차단하고 몸과 마음을 다시 접지합니다.",
    initial: "B",
  },
  tiger_eye: {
    name: "호안석",
    keywords: "용기 · 통찰 · 현실 판단",
    energy: "흔들리는 마음에 중심을 세우고 현실을 꿰뚫는 눈을 깨웁니다.",
    initial: "T",
  },
  clear_quartz: {
    name: "백수정",
    keywords: "증폭 · 정화 · 명료함",
    energy: "흐린 신호를 맑게 정렬하고 필요한 기운을 또렷하게 증폭합니다.",
    initial: "Q",
  },
  green_aventurine: {
    name: "그린 아벤츄린",
    keywords: "기회 · 회복 · 성장",
    energy: "닫혀 있던 가능성을 부드럽게 열고 회복의 흐름을 키웁니다.",
    initial: "V",
  },
  garnet: {
    name: "가넷",
    keywords: "열정 · 생명력 · 결단",
    energy: "식어 있던 의지를 다시 데우고 끝까지 가는 힘을 불러냅니다.",
    initial: "G",
  },
  labradorite: {
    name: "래브라도라이트",
    keywords: "변신 · 보호 · 숨은 빛",
    energy: "보이지 않던 재능과 변화의 문을 신비롭게 드러냅니다.",
    initial: "D",
  },
};

const GEM_SHAPES: Record<GemType, GemShape> = {
  amethyst: {
    label: "자수정",
    color: "#a855f7",
    glow: "#a855f7",
    facet: "#e9d5ff",
    stops: ["#c084fc", "#9333ea", "#6b21a8"],
    blur: 6,
    d: "M60 8 L88 25 L96 70 L60 112 L24 70 L32 25 Z",
    highlight: { cx: 54, cy: 34, rx: 17, ry: 8, rotate: -16 },
    facets: ["M60 8 L60 112", "M32 25 L60 54 L88 25", "M24 70 L60 54 L96 70", "M42 91 L60 54 L78 91"],
    particles: [
      { x: 17, y: 24, r: 1.7, delay: 0 },
      { x: 101, y: 36, r: 1.3, delay: 0.35 },
      { x: 20, y: 92, r: 2.1, delay: 0.7 },
      { x: 104, y: 88, r: 1.8, delay: 1.05 },
    ],
  },
  rose_quartz: {
    label: "장미수정",
    color: "#f472b6",
    glow: "#f472b6",
    facet: "#fce7f3",
    stops: ["#fbcfe8", "#ec4899", "#be185d"],
    blur: 5,
    d: "M58 13 C82 12 101 31 101 57 C101 85 82 104 58 107 C34 104 17 86 18 59 C19 34 35 15 58 13 Z",
    highlight: { cx: 49, cy: 37, rx: 21, ry: 9, rotate: -13 },
    facets: ["M29 42 L58 64 L90 42", "M25 73 L58 64 L87 78", "M58 18 L58 104"],
    particles: [
      { x: 14, y: 35, r: 1.7, delay: 0.1 },
      { x: 105, y: 27, r: 1.4, delay: 0.45 },
      { x: 22, y: 100, r: 1.8, delay: 0.9 },
      { x: 98, y: 97, r: 2.2, delay: 1.25 },
    ],
  },
  obsidian: {
    label: "흑요석",
    color: "#57534e",
    glow: "#57534e",
    facet: "#78716c",
    stops: ["#44403c", "#1c1917", "#0a0a0a"],
    blur: 4,
    d: "M53 7 L93 31 L79 106 L42 113 L18 66 L32 20 Z",
    highlight: { cx: 48, cy: 34, rx: 15, ry: 5, rotate: -28 },
    facets: ["M53 7 L49 112", "M32 20 L63 58 L93 31", "M18 66 L63 58 L79 106"],
    particles: [
      { x: 18, y: 26, r: 1.2, delay: 0.15 },
      { x: 99, y: 48, r: 1.3, delay: 0.55 },
      { x: 31, y: 101, r: 1.5, delay: 0.95 },
    ],
  },
  moonstone: {
    label: "문스톤",
    color: "#a5b4fc",
    glow: "#a5b4fc",
    facet: "#c7d2fe",
    stops: ["#f0f9ff", "#ede9fe", "#dbeafe"],
    blur: 8,
    d: "M60 13 C85 13 102 34 102 61 C102 88 84 106 60 106 C36 106 18 88 18 61 C18 34 35 13 60 13 Z",
    highlight: { cx: 52, cy: 35, rx: 24, ry: 10, rotate: -10 },
    facets: ["M33 38 L60 61 L89 37", "M25 72 L60 61 L92 75", "M60 18 L60 103"],
    particles: [
      { x: 14, y: 31, r: 1.6, delay: 0.2 },
      { x: 101, y: 25, r: 1.9, delay: 0.6 },
      { x: 20, y: 94, r: 1.3, delay: 0.95 },
      { x: 103, y: 95, r: 1.6, delay: 1.3 },
      { x: 60, y: 8, r: 1.2, delay: 1.55 },
    ],
  },
  lapis: {
    label: "라피스라줄리",
    color: "#3b82f6",
    glow: "#3b82f6",
    facet: "#d4af37",
    stops: ["#3b82f6", "#1d4ed8", "#1e3a8a"],
    blur: 6,
    d: "M37 12 L84 18 L106 53 L89 96 L45 110 L16 78 L22 35 Z",
    highlight: { cx: 55, cy: 35, rx: 20, ry: 8, rotate: -18 },
    facets: ["M37 12 L55 62 L84 18", "M22 35 L55 62 L16 78", "M55 62 L89 96", "M55 62 L45 110"],
    particles: [
      { x: 15, y: 22, r: 1.6, delay: 0.05 },
      { x: 105, y: 33, r: 1.8, delay: 0.4 },
      { x: 22, y: 98, r: 1.4, delay: 0.85 },
      { x: 101, y: 91, r: 1.7, delay: 1.2 },
    ],
  },
  citrine: {
    label: "시트린",
    color: "#f59e0b",
    glow: "#f59e0b",
    facet: "#fef3c7",
    stops: ["#fcd34d", "#d97706", "#78350f"],
    blur: 5,
    d: "M58 6 L96 54 L68 112 L21 75 L35 20 Z",
    highlight: { cx: 53, cy: 35, rx: 18, ry: 7, rotate: -18 },
    facets: ["M58 6 L58 108", "M35 20 L58 55 L96 54", "M21 75 L58 55 L68 112", "M44 91 L58 55"],
    particles: [
      { x: 19, y: 25, r: 1.5, delay: 0.1 },
      { x: 99, y: 31, r: 1.4, delay: 0.5 },
      { x: 17, y: 96, r: 1.8, delay: 0.9 },
      { x: 91, y: 101, r: 1.3, delay: 1.25 },
    ],
  },
  black_tourmaline: {
    label: "블랙 투르말린",
    color: "#166534",
    glow: "#166534",
    facet: "#4ade80",
    stops: ["#166534", "#14532d", "#052e16"],
    blur: 4,
    d: "M43 8 L78 13 L91 103 L59 114 L28 101 Z",
    highlight: { cx: 55, cy: 35, rx: 14, ry: 6, rotate: -11 },
    facets: ["M43 8 L44 104", "M52 10 L52 111", "M61 11 L61 113", "M70 12 L75 107"],
    particles: [
      { x: 18, y: 35, r: 1.4, delay: 0.2 },
      { x: 100, y: 43, r: 1.2, delay: 0.55 },
      { x: 27, y: 101, r: 1.5, delay: 0.95 },
      { x: 95, y: 91, r: 1.3, delay: 1.3 },
    ],
  },
  tiger_eye: {
    label: "호안석",
    color: "#c47a28",
    glow: "#f59e0b",
    facet: "#fde68a",
    stops: ["#f7c46a", "#9a5a16", "#32160a"],
    blur: 6,
    d: "M58 8 L92 27 L101 68 L72 108 L35 103 L18 63 L31 23 Z",
    highlight: { cx: 52, cy: 35, rx: 22, ry: 7, rotate: -18 },
    facets: ["M31 23 L58 60 L92 27", "M18 63 L58 60 L72 108", "M40 96 L58 60", "M58 8 L58 108"],
    particles: [
      { x: 19, y: 26, r: 1.5, delay: 0.05 },
      { x: 101, y: 38, r: 1.4, delay: 0.42 },
      { x: 23, y: 98, r: 1.8, delay: 0.82 },
      { x: 94, y: 93, r: 1.4, delay: 1.2 },
    ],
  },
  clear_quartz: {
    label: "백수정",
    color: "#dbeafe",
    glow: "#bfdbfe",
    facet: "#ffffff",
    stops: ["#ffffff", "#dbeafe", "#93c5fd"],
    blur: 8,
    d: "M60 6 L91 34 L84 91 L60 114 L36 91 L29 34 Z",
    highlight: { cx: 52, cy: 31, rx: 18, ry: 7, rotate: -15 },
    facets: ["M60 6 L60 114", "M29 34 L60 57 L91 34", "M36 91 L60 57 L84 91", "M45 103 L60 57 L75 103"],
    particles: [
      { x: 20, y: 28, r: 1.7, delay: 0.12 },
      { x: 100, y: 29, r: 1.5, delay: 0.5 },
      { x: 19, y: 94, r: 1.4, delay: 0.86 },
      { x: 101, y: 93, r: 1.9, delay: 1.24 },
      { x: 61, y: 11, r: 1.2, delay: 1.5 },
    ],
  },
  green_aventurine: {
    label: "그린 아벤츄린",
    color: "#22c55e",
    glow: "#86efac",
    facet: "#bbf7d0",
    stops: ["#86efac", "#16a34a", "#14532d"],
    blur: 6,
    d: "M59 12 C84 10 101 31 98 59 C96 86 79 104 57 108 C34 104 18 85 20 58 C22 32 37 14 59 12 Z",
    highlight: { cx: 50, cy: 36, rx: 22, ry: 8, rotate: -14 },
    facets: ["M31 39 L58 63 L88 38", "M25 73 L58 63 L85 80", "M58 16 L57 106"],
    particles: [
      { x: 16, y: 36, r: 1.5, delay: 0.1 },
      { x: 104, y: 32, r: 1.7, delay: 0.46 },
      { x: 25, y: 101, r: 1.8, delay: 0.9 },
      { x: 96, y: 94, r: 1.4, delay: 1.24 },
    ],
  },
  garnet: {
    label: "가넷",
    color: "#b91c1c",
    glow: "#ef4444",
    facet: "#fecaca",
    stops: ["#f87171", "#991b1b", "#450a0a"],
    blur: 6,
    d: "M60 8 L91 25 L101 57 L82 98 L60 113 L38 98 L19 57 L29 25 Z",
    highlight: { cx: 51, cy: 35, rx: 18, ry: 7, rotate: -16 },
    facets: ["M60 8 L60 113", "M29 25 L60 58 L91 25", "M19 57 L60 58 L101 57", "M38 98 L60 58 L82 98"],
    particles: [
      { x: 17, y: 29, r: 1.4, delay: 0.08 },
      { x: 102, y: 31, r: 1.6, delay: 0.5 },
      { x: 20, y: 96, r: 1.9, delay: 0.94 },
      { x: 99, y: 90, r: 1.4, delay: 1.28 },
    ],
  },
  labradorite: {
    label: "래브라도라이트",
    color: "#2563eb",
    glow: "#67e8f9",
    facet: "#a7f3d0",
    stops: ["#67e8f9", "#2563eb", "#111827"],
    blur: 8,
    d: "M42 10 L86 19 L104 60 L78 103 L39 109 L17 69 L25 30 Z",
    highlight: { cx: 55, cy: 35, rx: 25, ry: 8, rotate: -12 },
    facets: ["M42 10 L56 61 L86 19", "M25 30 L56 61 L17 69", "M56 61 L78 103", "M56 61 L39 109"],
    particles: [
      { x: 15, y: 25, r: 1.6, delay: 0.12 },
      { x: 103, y: 36, r: 1.8, delay: 0.46 },
      { x: 25, y: 101, r: 1.3, delay: 0.88 },
      { x: 97, y: 93, r: 1.7, delay: 1.26 },
      { x: 60, y: 10, r: 1.2, delay: 1.52 },
    ],
  },
};

export function getGemColor(type: GemType) {
  return GEM_SHAPES[type]?.color || "#a78bfa";
}

export default function CrystalGem({
  type,
  size = 140,
  state = "idle",
  progress = 0,
  compact = false,
  className = "",
  ariaLabel,
}: CrystalGemProps) {
  const id = useId().replace(/:/g, "");
  const shape = GEM_SHAPES[type];
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const ringLength = 339.292;
  const ringOffset = ringLength - (ringLength * clampedProgress) / 100;
  const style = {
    "--gem-color": shape.color,
    "--gem-glow": shape.glow,
    "--gem-rub-blur": `${4 + clampedProgress * 0.12}px`,
  } as CSSProperties;

  return (
    <span
      className={`crystal-gem crystal-gem--${type} crystal-gem--${state} ${compact ? "crystal-gem--compact" : ""} ${className}`}
      style={{ width: size, height: size, ...style }}
          aria-label={ariaLabel || shape.label}
      role="img"
    >
      <svg className="crystal-gem__svg" viewBox="0 0 120 120" focusable="false">
        <defs>
          <linearGradient id={`${id}-base`} x1="18" y1="12" x2="98" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={shape.stops[0]} />
            <stop offset="0.48" stopColor={shape.stops[1]} />
            <stop offset="1" stopColor={shape.stops[2]} />
          </linearGradient>
          <radialGradient id={`${id}-rub`} cx="48%" cy="36%" r="58%">
            <stop offset="0" stopColor="rgba(255,255,255,0.72)" />
            <stop offset="0.38" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <pattern id={`${id}-grain`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
            <path d="M0 4 C4 1 10 7 16 3" stroke="rgba(255,255,255,0.16)" strokeWidth="1" fill="none" />
            <path d="M0 11 C5 8 10 15 16 10" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" fill="none" />
          </pattern>
          <linearGradient id={`${id}-rub-streak`} x1="18" y1="78" x2="102" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="rgba(255,255,255,0)" />
            <stop offset="0.42" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="0.52" stopColor="rgba(255,255,255,0.64)" />
            <stop offset="0.62" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id={`${id}-moon`} x1="20" y1="28" x2="100" y2="94" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f0f9ff" stopOpacity="0.12" />
            <stop offset="0.38" stopColor="#f9a8d4" stopOpacity="0.18" />
            <stop offset="0.68" stopColor="#93c5fd" stopOpacity="0.16" />
            <stop offset="1" stopColor="#c4b5fd" stopOpacity="0.14" />
          </linearGradient>
          <filter id={`${id}-glow`} x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation={shape.blur} result="blur" />
            <feFlood floodColor={shape.glow} floodOpacity="0.72" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path className="crystal-gem__edge" d={shape.d} fill={shape.glow} filter={`url(#${id}-glow)`} opacity="0.58" />
        <path className="crystal-gem__base" d={shape.d} fill={`url(#${id}-base)`} />
        <path className="crystal-gem__grain" d={shape.d} fill={`url(#${id}-grain)`} />
        {type === "tiger_eye" ? <path className="crystal-gem__tiger-band" d={shape.d} fill="rgba(253,230,138,0.22)" /> : null}
        {type === "labradorite" ? <path className="crystal-gem__labrador-flash" d={shape.d} fill={`url(#${id}-moon)`} /> : null}
        <path className="crystal-gem__rub-light" d={shape.d} fill={`url(#${id}-rub)`} opacity={clampedProgress / 130} />
        <path className="crystal-gem__rub-streak" d={shape.d} fill={`url(#${id}-rub-streak)`} opacity={clampedProgress / 120} />
        {type === "moonstone" ? <path className="crystal-gem__moon-shimmer" d={shape.d} fill={`url(#${id}-moon)`} /> : null}

        <ellipse
          className="crystal-gem__highlight"
          cx={shape.highlight.cx}
          cy={shape.highlight.cy}
          rx={shape.highlight.rx}
          ry={shape.highlight.ry}
          fill="rgba(255,255,255,0.22)"
          transform={`rotate(${shape.highlight.rotate || 0} ${shape.highlight.cx} ${shape.highlight.cy})`}
        />

        {shape.facets.map((d) => (
          <path key={d} d={d} fill="none" stroke={shape.facet} strokeOpacity={type === "lapis" ? 0.38 : 0.16} strokeWidth="1.1" strokeLinecap="round" />
        ))}

        {type === "obsidian" ? <path d="M39 29 L70 19" stroke="rgba(255,255,255,0.72)" strokeWidth="1.8" strokeLinecap="round" /> : null}
        {type === "lapis" ? (
          <>
            <circle cx="41" cy="43" r="2.1" fill="#d4af37" opacity="0.82" />
            <circle cx="74" cy="34" r="1.5" fill="#d4af37" opacity="0.72" />
            <circle cx="82" cy="76" r="2.3" fill="#d4af37" opacity="0.76" />
            <circle cx="48" cy="88" r="1.6" fill="#d4af37" opacity="0.68" />
          </>
        ) : null}
        {type === "tiger_eye" ? (
          <>
            <path d="M30 36 C48 28 70 31 94 43" stroke="#fde68a" strokeWidth="5.4" strokeLinecap="round" opacity="0.25" />
            <path d="M24 61 C45 52 72 55 99 70" stroke="#451a03" strokeWidth="4.2" strokeLinecap="round" opacity="0.32" />
            <path d="M33 82 C52 74 70 78 86 91" stroke="#fbbf24" strokeWidth="2.8" strokeLinecap="round" opacity="0.28" />
          </>
        ) : null}

        {!compact ? (
          <circle
            className="crystal-gem__progress"
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={shape.glow}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={ringLength}
            strokeDashoffset={ringOffset}
            transform="rotate(-90 60 60)"
          />
        ) : null}

        {state === "activated" ? (
          <g className="crystal-gem__burst">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                className="crystal-gem__ray"
                x1="60"
                y1="60"
                x2="60"
                y2="11"
                stroke={shape.glow}
                strokeWidth="1.4"
                strokeLinecap="round"
                transform={`rotate(${angle} 60 60)`}
              />
            ))}
            {Array.from({ length: 12 }, (_, idx) => (
              <circle
                key={idx}
                className="crystal-gem__burst-dot"
                cx="60"
                cy="60"
                r={idx % 3 === 0 ? 2.1 : 1.5}
                fill={idx % 2 ? "#e2e0f0" : shape.glow}
                style={{ "--burst-angle": `${idx * 30}deg`, "--burst-distance": `${28 + (idx % 4) * 7}px` } as CSSProperties}
              />
            ))}
          </g>
        ) : null}

        {shape.particles.map((particle, idx) => (
          <circle
            key={`${particle.x}-${particle.y}-${idx}`}
            className="crystal-gem__sparkle"
            cx={particle.x}
            cy={particle.y}
            r={particle.r}
            fill={idx % 2 ? "#e2e0f0" : shape.glow}
            style={{ animationDelay: `${particle.delay}s` }}
          />
        ))}
      </svg>
      <style>{`
        .crystal-gem {
          display: inline-flex;
          position: relative;
          flex: 0 0 auto;
          touch-action: none;
          user-select: none;
          filter: drop-shadow(0 0 10px color-mix(in srgb, var(--gem-color), transparent 42%));
        }

        .crystal-gem__svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .crystal-gem--idle {
          animation: gemFloat 3s ease-in-out infinite;
        }

        .crystal-gem--rubbing {
          animation: gemRub 0.16s linear infinite;
          filter: drop-shadow(0 0 var(--gem-rub-blur) var(--gem-color));
        }

        .crystal-gem--activated {
          animation: crystalGemBurst 0.46s ease-out both;
        }

        .crystal-gem--revealed {
          transform: scale(0.62);
          filter: drop-shadow(0 0 14px var(--gem-color));
        }

        .crystal-gem__base {
          stroke: rgba(255,255,255,0.13);
          stroke-width: 1;
        }

        .crystal-gem__grain {
          mix-blend-mode: soft-light;
          opacity: 0.52;
        }

        .crystal-gem__rub-streak {
          mix-blend-mode: screen;
          transform-origin: 60px 60px;
          transition: opacity 0.12s ease;
        }

        .crystal-gem--rubbing .crystal-gem__grain {
          animation: crystalGrainShift 0.48s linear infinite;
          opacity: 0.78;
        }

        .crystal-gem--rubbing .crystal-gem__rub-streak {
          animation: crystalRubStreak 0.72s ease-in-out infinite;
        }

        .crystal-gem__tiger-band {
          mix-blend-mode: overlay;
          opacity: 0.5;
        }

        .crystal-gem__labrador-flash {
          mix-blend-mode: screen;
          opacity: 0.48;
          animation: crystalMoonShimmer 6.4s linear infinite;
        }

        .crystal-gem__highlight {
          mix-blend-mode: screen;
        }

        .crystal-gem__progress {
          opacity: ${compact ? 0 : 0.86};
          transition: stroke-dashoffset 0.16s ease, opacity 0.2s ease;
        }

        .crystal-gem--idle .crystal-gem__progress {
          opacity: 0.22;
        }

        .crystal-gem__moon-shimmer {
          mix-blend-mode: screen;
          animation: crystalMoonShimmer 8s linear infinite;
        }

        .crystal-gem__sparkle {
          opacity: 0;
          transform-origin: center;
          animation: sparkle 2.2s ease-in-out infinite;
        }

        .crystal-gem--rubbing .crystal-gem__sparkle {
          animation-duration: 0.72s;
        }

        .crystal-gem__ray {
          transform-origin: 60px 60px;
          opacity: 0;
          animation: crystalRay 0.5s ease-out both;
        }

        .crystal-gem__burst-dot {
          transform-origin: 60px 60px;
          animation: crystalBurstDot 0.64s ease-out both;
        }

        @keyframes crystalGemBurst {
          0% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 12px var(--gem-color)); }
          45% { transform: scale(1.3); filter: brightness(2.1) drop-shadow(0 0 30px var(--gem-color)); }
          100% { transform: scale(1); filter: brightness(1.05) drop-shadow(0 0 18px var(--gem-color)); }
        }

        @keyframes crystalRay {
          0% { opacity: 0.9; transform: scaleY(0.2); }
          100% { opacity: 0; transform: scaleY(1.25); }
        }

        @keyframes crystalBurstDot {
          0% { opacity: 1; transform: rotate(var(--burst-angle)) translate(0) scale(0.6); }
          100% { opacity: 0; transform: rotate(var(--burst-angle)) translate(var(--burst-distance)) scale(1.2); }
        }

        @keyframes crystalMoonShimmer {
          0% { filter: hue-rotate(0deg); opacity: 0.52; }
          50% { filter: hue-rotate(70deg); opacity: 0.82; }
          100% { filter: hue-rotate(0deg); opacity: 0.52; }
        }

        @keyframes crystalGrainShift {
          0% { transform: translate(-1px, 0); }
          50% { transform: translate(1.5px, -0.5px); }
          100% { transform: translate(-1px, 0); }
        }

        @keyframes crystalRubStreak {
          0% { transform: translate(-8px, 7px) scale(0.98); opacity: 0.18; }
          50% { transform: translate(6px, -5px) scale(1.02); opacity: 0.82; }
          100% { transform: translate(-8px, 7px) scale(0.98); opacity: 0.22; }
        }
      `}</style>
    </span>
  );
}
