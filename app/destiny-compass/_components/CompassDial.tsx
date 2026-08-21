"use client";
/**
 * 프리미엄 SVG 나침반 — 엔트리(클릭→시작)·결과(바늘→대표 방향) 공용.
 * 영국 홍차점 시계(public/royal-tea-oracle.html) + 지오맨시 3중링 질감 참조.
 * 골드 메탈릭 베젤·feTurbulence 노이즈·glow. 면/바늘은 --cd-* 토큰이라 다크(엔트리)/핑크(결과) 적응.
 */
import { useId, useState } from "react";
import type { DirectionKey, DirectionScore } from "../_engine/types";
import { useDestinyCompassCopy } from "../_lib/copy";
import { COMPASS_ORDER, needleAngle } from "../_stage/expressionMap";
import styles from "./compass.module.css";

interface CompassDialProps {
  mode: "entry" | "result";
  directions?: DirectionScore[];
  primary?: DirectionKey;
  onStart?: () => void;
  className?: string;
  /**
   * 결과 모드의 연출 상태. 생략하면 기존 동작 그대로다(엔트리 다이얼 회귀 방지).
   * spinning = 분석 중 등속 회전, settling = 대표 방향으로 착지(바늘의 기존 900ms 트랜지션 재사용).
   */
  state?: "idle" | "spinning" | "settling";
  /** 좁은 자리(처리 화면)에서 지름을 줄인다. 결과 화면의 기본 크기는 그대로. */
  compact?: boolean;
}

const CX = 200;
const CY = 200;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function CompassDial({ mode, directions, primary, onStart, className, state, compact }: CompassDialProps) {
  const copy = useDestinyCompassCopy();
  const uid = useId().replace(/:/g, "");
  const [firing, setFiring] = useState(false);
  const scoreOf = (key: DirectionKey) => directions?.find((d) => d.key === key)?.score ?? 0;
  // 착지 각도에 두 바퀴를 얹어 오버슛 후 감쇠하게 만든다(바늘의 기존 900ms 트랜지션이 감쇠를 맡는다).
  const settleSpin = state === "settling" ? 720 : 0;
  const angle = mode === "result" && primary ? needleAngle(primary) + settleSpin : 0;

  const handleStart = () => {
    if (!onStart || firing) return;
    if (prefersReducedMotion()) {
      onStart();
      return;
    }
    setFiring(true);
    window.setTimeout(() => onStart(), 520);
  };

  // 72 미세 틱(5°) + 8 주요 틱/각인은 아래에서 생성
  const minorTicks = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    const sin = Math.sin(a);
    const cos = Math.cos(a);
    const major = i % 9 === 0; // 8 방위 위치와 겹치는 곳은 건너뜀(주요 틱이 대신)
    if (major) return null;
    return (
      <line
        key={`m${i}`}
        x1={CX + 158 * sin}
        y1={CY - 158 * cos}
        x2={CX + 151 * sin}
        y2={CY - 151 * cos}
        stroke="var(--cd-gold)"
        strokeWidth={1}
        opacity={0.32}
      />
    );
  });

  const svg = (
    <svg viewBox="0 0 400 400" className={styles.dialSvg} aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-face`} cx="42%" cy="36%" r="70%">
          <stop offset="0%" stopColor="var(--cd-surface)" />
          <stop offset="70%" stopColor="var(--cd-surface-2, var(--cd-surface))" />
          <stop offset="100%" stopColor="var(--cd-surface-2, var(--cd-surface))" />
        </radialGradient>
        <radialGradient id={`${uid}-gold`} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#f6e29a" />
          <stop offset="34%" stopColor="#e2bf63" />
          <stop offset="70%" stopColor="#a8842f" />
          <stop offset="100%" stopColor="#6a4f18" />
        </radialGradient>
        <linearGradient id={`${uid}-needle`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cd-accent)" />
          <stop offset="100%" stopColor="var(--cd-accent-soft, var(--cd-accent))" />
        </linearGradient>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${uid}-noise`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.05" />
          </feComponentTransfer>
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
      </defs>

      {/* 베젤 — 골드 메탈릭 다중 링 */}
      <g filter={`url(#${uid}-glow)`}>
        <circle cx={CX} cy={CY} r={192} fill="none" stroke={`url(#${uid}-gold)`} strokeWidth={9} />
        <circle cx={CX} cy={CY} r={180} fill="none" stroke="var(--cd-gold)" strokeWidth={1.5} opacity={0.7} />
      </g>

      {/* 면 + 노이즈 질감 */}
      <circle cx={CX} cy={CY} r={168} fill={`url(#${uid}-face)`} stroke="var(--cd-hairline, var(--cd-border))" strokeWidth={1} />
      <circle cx={CX} cy={CY} r={168} fill="var(--cd-text)" filter={`url(#${uid}-noise)`} />
      <circle cx={CX} cy={CY} r={150} fill="none" stroke="var(--cd-border)" strokeWidth={1} opacity={0.5} />

      {/* 회전 미세틱 링(아이들 저속 회전) */}
      <g className={styles.dialRotor}>{minorTicks}</g>

      {/* 8 방위 주요 틱 + 각인 라벨 */}
      <g>
        {COMPASS_ORDER.map((key, i) => {
          const a = (i / COMPASS_ORDER.length) * Math.PI * 2;
          const sin = Math.sin(a);
          const cos = Math.cos(a);
          const isPrimary = mode === "result" && key === primary;
          const strength = mode === "result" ? 0.4 + (scoreOf(key) / 100) * 0.6 : 0.85;
          return (
            <g key={key}>
              <line
                x1={CX + 158 * sin}
                y1={CY - 158 * cos}
                x2={CX + 140 * sin}
                y2={CY - 140 * cos}
                stroke={isPrimary ? "var(--cd-accent)" : "var(--cd-gold)"}
                strokeWidth={isPrimary ? 3 : 2}
                opacity={strength}
                strokeLinecap="round"
              />
              <text
                x={CX + 122 * sin}
                y={CY - 122 * cos + 5}
                textAnchor="middle"
                className={isPrimary ? styles.dialLabelOn : styles.dialLabel}
              >
                {copy.directionShortLabel[key]}
              </text>
            </g>
          );
        })}
      </g>

      {/* 바늘 */}
      <g className={styles.dialNeedle} style={{ transform: `rotate(${angle}deg)` }} filter={`url(#${uid}-glow)`}>
        <polygon points={`${CX},58 ${CX + 9},${CY + 8} ${CX},${CY + 26} ${CX - 9},${CY + 8}`} fill={`url(#${uid}-needle)`} />
        <polygon points={`${CX},${CY + 26} ${CX + 9},${CY + 8} ${CX},346 ${CX - 9},${CY + 8}`} fill="var(--cd-border)" opacity={0.55} />
      </g>

      {/* 착지 순간의 빛 고리 — state="settling" 일 때만 한 번 번진다(opacity/scale 만 움직임) */}
      <circle className={styles.dialSettleRing} cx={CX} cy={CY} r={168} fill="none" stroke="var(--cd-accent)" strokeWidth={6} />

      {/* 센터 허브 */}
      <circle cx={CX} cy={CY} r={13} fill="var(--cd-text)" stroke={`url(#${uid}-gold)`} strokeWidth={4} filter={`url(#${uid}-glow)`} />
      <circle cx={CX} cy={CY} r={4} fill="var(--cd-gold)" />
    </svg>
  );

  const rootClass = [
    styles.dial,
    mode === "entry" ? styles.dialEntry : styles.dialResult,
    firing ? styles.dialFiring : "",
    state === "spinning" ? styles.dialSpinning : "",
    state === "settling" ? styles.dialSettling : "",
    compact ? styles.dialCompact : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  if (mode === "entry") {
    return (
      <button type="button" className={rootClass} onClick={handleStart} aria-label={copy.dialStartAriaLabel}>
        {svg}
        <span className={styles.dialHint} aria-hidden="true">{copy.dialHint}</span>
      </button>
    );
  }

  return (
    <div
      className={rootClass}
      role="img"
      aria-label={primary ? copy.dialAriaLabelPrimary(copy.directionLabel[primary]) : copy.dialAriaLabelDefault}
    >
      {svg}
    </div>
  );
}
