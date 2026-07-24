"use client";
/**
 * 딥스페이스 배경 — 별 3계층(원거리 정적 / 중거리 반짝·색변주 / 근거리 대형·회절광선) +
 * 성운 3장 + 은하수 대각 밴드 + 비네트 + 필름 그레인.
 * 별 위치는 결정론(모듈 로드 시 1회, mulberry32)이라 SSR/client 동일 → 하이드레이션 불일치 없음.
 * 비네트·그레인은 .starfield 의사요소(map.module.css)라 DOM 노드 미증가.
 * 저사양 폴백: data-fx="lite"|"static" 이면 CSS가 반짝임/그레인을 끈다.
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

// 계층별 독립 시드 — 겹침/군집을 피해 분포를 다르게.
const farRnd = mulberry32(20260724);
const midRnd = mulberry32(19981103);
const nearRnd = mulberry32(20260317);

// 원거리: 아주 작고 어둡고 많음, 정적(움직이지 않음).
const FAR = Array.from({ length: 104 }, () => ({
  x: farRnd() * 100,
  y: farRnd() * 100,
  s: 0.6 + farRnd() * 0.9,
  op: 0.2 + farRnd() * 0.4,
}));

// 중거리: 중간 크기, 미세 반짝임, 색 변주(백/청/금).
const MID_TONES = ["var(--cd-star-mid)", "var(--cd-star-far)", "rgba(240,216,160,0.85)"];
const MID = Array.from({ length: 44 }, (_, i) => ({
  x: midRnd() * 100,
  y: midRnd() * 100,
  s: 1.3 + midRnd() * 1.3,
  delay: midRnd() * 6,
  dur: 3.6 + midRnd() * 3,
  op: 0.4 + midRnd() * 0.5,
  tone: MID_TONES[i % MID_TONES.length],
}));

// 근거리: 크고 밝음, 십자 회절 광선(소수).
const NEAR = Array.from({ length: 8 }, () => ({
  x: 6 + nearRnd() * 88,
  y: 4 + nearRnd() * 70,
  s: 2.4 + nearRnd() * 1.8,
  delay: nearRnd() * 5,
  dur: 5 + nearRnd() * 3,
}));

export function Starfield() {
  return (
    <div className={styles.starfield} aria-hidden="true">
      <div className={`${styles.nebula} ${styles.nebula1}`} />
      <div className={`${styles.nebula} ${styles.nebula2}`} />
      <div className={`${styles.nebula} ${styles.nebula3}`} />
      <div className={styles.milkyway} />

      {/* 원거리(정적) */}
      <div className={styles.starLayerFar}>
        {FAR.map((st, i) => (
          <span
            key={i}
            className={styles.starFar}
            style={{ left: `${st.x}%`, top: `${st.y}%`, width: `${st.s}px`, height: `${st.s}px`, opacity: st.op }}
          />
        ))}
      </div>

      {/* 중거리(반짝·색변주) */}
      <div className={styles.starLayerMid}>
        {MID.map((st, i) => (
          <span
            key={i}
            className={styles.starMid}
            style={{
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: `${st.s}px`,
              height: `${st.s}px`,
              // 최대 밝기값 — 반짝임이 이 값까지 오른다.
              ["--star-op" as string]: st.op,
              background: st.tone,
              animationDelay: `${st.delay}s`,
              animationDuration: `${st.dur}s`,
            }}
          />
        ))}
      </div>

      {/* 근거리(대형·회절광선) */}
      <div className={styles.starLayerNear}>
        {NEAR.map((st, i) => (
          <span
            key={i}
            className={styles.starNear}
            style={{
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: `${st.s}px`,
              height: `${st.s}px`,
              animationDelay: `${st.delay}s`,
              animationDuration: `${st.dur}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
