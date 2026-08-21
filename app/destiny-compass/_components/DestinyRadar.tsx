"use client";
/**
 * STEP 10 운명의 레이더 — 8방향 스코어를 스파이더(레이더) 차트로 시각화.
 * Layer 2 스코어 읽기 전용. Math(cos/sin)은 결정론(난수·시각 아님).
 */
import { DIRECTION_KEYS } from "../_engine/constants";
import type { DirectionScore } from "../_engine/types";
import { useDestinyCompassCopy } from "../_lib/copy";
import styles from "./map.module.css";

const SIZE = 280;
const C = SIZE / 2;
const MAXR = C - 48;
const RINGS = [0.25, 0.5, 0.75, 1];

function pt(r: number, a: number): [number, number] {
  return [C + Math.cos(a) * r, C + Math.sin(a) * r];
}

export function DestinyRadar({ directions }: { directions: DirectionScore[] }) {
  const copy = useDestinyCompassCopy();
  const byKey = new Map(directions.map((d) => [d.key, d.score]));
  const items = DIRECTION_KEYS.map((k, i) => ({
    k,
    angle: (i / DIRECTION_KEYS.length) * Math.PI * 2 - Math.PI / 2,
    score: byKey.get(k) ?? 0,
    label: copy.directionShortLabel[k],
  }));
  const valuePoly = items.map((it) => pt(MAXR * (it.score / 100), it.angle).join(",")).join(" ");

  return (
    <svg className={styles.radarSvg} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={copy.radarAriaLabel}>
      <defs>
        <radialGradient id="cd-radar-fill" cx="50%" cy="50%" r="62%">
          <stop offset="0%" stopColor="rgba(232, 213, 163, 0.5)" />
          <stop offset="100%" stopColor="rgba(196, 181, 253, 0.26)" />
        </radialGradient>
      </defs>

      {RINGS.map((rr) => (
        <polygon
          key={rr}
          points={items.map((it) => pt(MAXR * rr, it.angle).join(",")).join(" ")}
          fill="none"
          stroke="rgba(232, 213, 163, 0.16)"
          strokeWidth="1"
        />
      ))}
      {items.map((it) => {
        const [x, y] = pt(MAXR, it.angle);
        return <line key={it.k} x1={C} y1={C} x2={x} y2={y} stroke="rgba(232, 213, 163, 0.14)" strokeWidth="1" />;
      })}

      <polygon points={valuePoly} fill="url(#cd-radar-fill)" stroke="#e8d5a3" strokeWidth="2" />
      {items.map((it) => {
        const [x, y] = pt(MAXR * (it.score / 100), it.angle);
        return <circle key={it.k} cx={x} cy={y} r="3" fill="#fff2c6" />;
      })}

      {items.map((it) => {
        const [x, y] = pt(MAXR + 18, it.angle);
        const cos = Math.cos(it.angle);
        const anchor = Math.abs(cos) < 0.35 ? "middle" : cos > 0 ? "start" : "end";
        return (
          <text key={it.k} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className={styles.radarLabel}>
            {it.label}
          </text>
        );
      })}
    </svg>
  );
}
