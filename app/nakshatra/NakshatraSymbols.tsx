// 나크샤트라 결정판 — 동서 융합 상징 SVG 컴포넌트
// 태극(太極, 동양 숙요점) · 스리 얀트라(Sri Yantra, 인도 베다점) · 스파크 · 코너 마크.
// 순수 SVG(클라이언트 훅 없음)라 서버·클라이언트 컴포넌트 양쪽에서 렌더 가능.

import type { CSSProperties } from "react";

interface SymbolProps {
  className?: string;
  style?: CSSProperties;
  title?: string;
}

// 스리 얀트라 연꽃잎 경로를 결정적으로 생성(Math.random/Date 미사용).
function buildLotus(count: number, rOuter: number, rInner: number, half: number) {
  const petals: { d: string; rot: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const rot = (360 / count) * i;
    const mid = (rOuter + rInner) / 2;
    const d =
      `M120 ${120 - rOuter}` +
      ` Q${120 + half} ${120 - mid} 120 ${120 - rInner}` +
      ` Q${120 - half} ${120 - mid} 120 ${120 - rOuter} Z`;
    petals.push({ d, rot });
  }
  return petals;
}

const LOTUS_16 = buildLotus(16, 108, 90, 9);
const LOTUS_8 = buildLotus(8, 88, 62, 13);

// 인터로킹 삼각형(스리 얀트라 코어)
const YANTRA_TRIANGLES = [
  "M120 66 L169 150 L71 150 Z",
  "M120 174 L71 90 L169 90 Z",
  "M120 80 L156 143 L84 143 Z",
  "M120 160 L84 97 L156 97 Z",
  "M120 94 L143 136 L97 136 Z",
  "M120 146 L97 104 L143 104 Z",
];

/** 태극(홍청) — 동양 점(숙요점·사주)의 상징. viewBox 0 0 100 100. */
export function Taegeuk({ className, style, title }: SymbolProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" role={title ? "img" : "presentation"} aria-label={title || undefined} aria-hidden={title ? undefined : true}>
      <circle cx="50" cy="50" r="47.5" fill="none" stroke="#e5c789" strokeWidth="1.4" opacity="0.8" />
      <circle cx="50" cy="50" r="44" fill="#2b8aa0" />
      <path d="M50 6 A44 44 0 0 1 50 94 A22 22 0 0 1 50 50 A22 22 0 0 0 50 6 Z" fill="#d83a63" />
      <circle cx="50" cy="28" r="6.6" fill="#2b8aa0" />
      <circle cx="50" cy="72" r="6.6" fill="#d83a63" />
    </svg>
  );
}

/** 스리 얀트라 만다라 — 인도 베다점의 상징. 골드 라인은 currentColor를 따른다. viewBox 0 0 240 240. */
export function Yantra({ className, style, title }: SymbolProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 240 240" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" role={title ? "img" : "presentation"} aria-label={title || undefined} aria-hidden={title ? undefined : true}>
      <rect x="14" y="14" width="212" height="212" opacity="0.6" />
      <rect x="26" y="26" width="188" height="188" opacity="0.5" />
      <path d="M120 14 v14 M113 21 h14 M120 226 v-14 M113 219 h14 M14 120 h14 M21 113 v14 M226 120 h-14 M219 113 v14" opacity="0.7" />
      <g opacity="0.75">
        {LOTUS_16.map((p, i) => (
          <path key={`l16-${i}`} d={p.d} transform={`rotate(${p.rot} 120 120)`} />
        ))}
      </g>
      <g opacity="0.9">
        {LOTUS_8.map((p, i) => (
          <path key={`l8-${i}`} d={p.d} transform={`rotate(${p.rot} 120 120)`} />
        ))}
      </g>
      <circle cx="120" cy="120" r="88" />
      <circle cx="120" cy="120" r="60" />
      <g strokeWidth="1.5">
        {YANTRA_TRIANGLES.map((d, i) => (
          <path key={`tri-${i}`} d={d} />
        ))}
      </g>
      <circle cx="120" cy="120" r="3.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 4점 스파크. currentColor. */
export function Spark({ className, style }: SymbolProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1 C12 7 17 12 23 12 C17 12 12 17 12 23 C12 17 7 12 1 12 C7 12 12 7 12 1 Z" fill="currentColor" />
    </svg>
  );
}

/** 사크리드 지오메트리 코너 마크. currentColor. */
export function CornerMark({ className, style }: SymbolProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M2 12 V2 H12" />
      <circle cx="2" cy="2" r="1.6" fill="currentColor" stroke="none" />
      <path d="M6 2 h5 M2 6 v5" />
    </svg>
  );
}
