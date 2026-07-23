"use client";
/**
 * 은하수 배경 — 반짝이는 별 + 성운 오브. 별 위치는 결정론(모듈 로드 시 1회)이라
 * SSR/client 동일 → 하이드레이션 불일치 없음. Math.random 미사용.
 */
import styles from "./map.module.css";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260724);
const STARS = Array.from({ length: 86 }, () => ({
  x: rnd() * 100,
  y: rnd() * 100,
  s: 1 + rnd() * 2.4,
  delay: rnd() * 6,
  op: 0.28 + rnd() * 0.6,
}));

export function Starfield() {
  return (
    <div className={styles.starfield} aria-hidden="true">
      <div className={`${styles.nebula} ${styles.nebula1}`} />
      <div className={`${styles.nebula} ${styles.nebula2}`} />
      <div className={`${styles.nebula} ${styles.nebula3}`} />
      {STARS.map((st, i) => (
        <span
          key={i}
          className={styles.star}
          style={{
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: `${st.s}px`,
            height: `${st.s}px`,
            opacity: st.op,
            animationDelay: `${st.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
