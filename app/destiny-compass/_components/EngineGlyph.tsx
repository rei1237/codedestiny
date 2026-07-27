"use client";
/**
 * 6운세 엔진 크레스트 — JOURNEY(STEP3) 엔진 카드용 자체 인라인 SVG(이모지 미사용).
 * 사주(오행)·자미두수(자미성)·타로(카드)·점성술(토성)·숙요(별자리)·베다(만다라).
 * 톤은 currentColor + 강조 tone. 점등 여부는 상위(map.module.css)가 opacity/glow로.
 */

export type EngineKey = "saju" | "ziwei" | "tarot" | "astrology" | "sukuyo" | "vedic";

const TONE: Record<EngineKey, string> = {
  saju: "#f0d9a0",
  ziwei: "#c4b5fd",
  tarot: "#f6c3d6",
  astrology: "#8fd0ff",
  sukuyo: "#a9c2ff",
  vedic: "#f5b98a",
};

export function EngineGlyph({ engine, size = 28 }: { engine: EngineKey; size?: number }) {
  const tone = TONE[engine];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      {engine === "saju" && <Saju tone={tone} />}
      {engine === "ziwei" && <Ziwei tone={tone} />}
      {engine === "tarot" && <Tarot tone={tone} />}
      {engine === "astrology" && <Astrology tone={tone} />}
      {engine === "sukuyo" && <Sukuyo tone={tone} />}
      {engine === "vedic" && <Vedic tone={tone} />}
    </svg>
  );
}

/* 사주 — 오행 오각 + 중심점 */
function Saju({ tone }: { tone: string }) {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return `${16 + Math.cos(a) * 10},${16 + Math.sin(a) * 10}`;
  }).join(" ");
  return (
    <g stroke={tone} strokeWidth="1.6" strokeLinejoin="round" fill="none">
      <polygon points={pts} />
      <polygon points={pts} transform="rotate(36 16 16)" opacity="0.4" />
      <circle cx="16" cy="16" r="2.2" fill={tone} stroke="none" />
    </g>
  );
}

/* 자미두수 — 중심 자미성 + 궤도 별 */
function Ziwei({ tone }: { tone: string }) {
  return (
    <g fill="none" stroke={tone} strokeWidth="1.4">
      <circle cx="16" cy="16" r="11" opacity="0.35" />
      <path d="M16 8l1.7 3.8 4.1.5-3 2.8.8 4-3.6-2-3.6 2 .8-4-3-2.8 4.1-.5z" fill={tone} stroke="none" />
      <circle cx="26" cy="12" r="1.3" fill={tone} stroke="none" />
      <circle cx="7" cy="20" r="1.1" fill={tone} stroke="none" />
    </g>
  );
}

/* 타로 — 부채꼴 카드 2장 */
function Tarot({ tone }: { tone: string }) {
  return (
    <g stroke={tone} strokeWidth="1.5" strokeLinejoin="round">
      <rect x="9" y="9" width="10" height="15" rx="2" fill="rgba(20,14,42,.6)" transform="rotate(-12 14 16)" />
      <rect x="13" y="8" width="10" height="15" rx="2" fill="rgba(20,14,42,.85)" transform="rotate(10 18 15)" />
      <path d="M18 12l1 2.2 2.4.3-1.7 1.6.4 2.3-2.1-1.2" fill="none" strokeWidth="1.1" transform="rotate(10 18 15)" />
    </g>
  );
}

/* 점성술 — 토성(고리) */
function Astrology({ tone }: { tone: string }) {
  return (
    <g stroke={tone} strokeWidth="1.5">
      <circle cx="16" cy="16" r="6.5" fill="rgba(20,14,42,.5)" />
      <ellipse cx="16" cy="16" rx="12" ry="4" transform="rotate(-20 16 16)" fill="none" />
      <circle cx="16" cy="16" r="6.5" fill="none" />
    </g>
  );
}

/* 숙요 — 별자리(이어진 점) */
function Sukuyo({ tone }: { tone: string }) {
  return (
    <g stroke={tone} strokeWidth="1.3" fill={tone}>
      <path d="M7 22l6-9 5 4 7-10" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx="7" cy="22" r="1.6" stroke="none" />
      <circle cx="13" cy="13" r="1.9" stroke="none" />
      <circle cx="18" cy="17" r="1.5" stroke="none" />
      <circle cx="25" cy="7" r="1.8" stroke="none" />
    </g>
  );
}

/* 베다 — 만다라(연꽃 겹판) */
function Vedic({ tone }: { tone: string }) {
  return (
    <g stroke={tone} strokeWidth="1.3" fill="none">
      <circle cx="16" cy="16" r="3" fill={tone} stroke="none" opacity="0.9" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = 16 + Math.cos(a) * 9;
        const y = 16 + Math.sin(a) * 9;
        return <ellipse key={i} cx={x} cy={y} rx="3.4" ry="1.7" transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} opacity="0.6" />;
      })}
      <circle cx="16" cy="16" r="11" opacity="0.3" />
    </g>
  );
}
