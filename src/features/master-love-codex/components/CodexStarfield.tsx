"use client";

/**
 * 코덱스 앰비언트 — 별빛 + 금가루.
 *
 * 좌표는 고정 배열이라 리렌더마다 흔들리지 않는다.
 * 리듀스드모션·저사양에서는 **렌더 자체를 하지 않는다**(정지시키는 대신 DOM에서 뺀다).
 */

import styles from "../styles/codex.module.css";

const STARS = [
  { top: "8%", left: "14%", size: 2, delay: "0s", dur: "5.5s" },
  { top: "16%", left: "72%", size: 1, delay: ".8s", dur: "6.5s" },
  { top: "24%", left: "38%", size: 1, delay: "1.6s", dur: "7s" },
  { top: "12%", left: "54%", size: 2, delay: "2.4s", dur: "5.8s" },
  { top: "34%", left: "88%", size: 1, delay: ".4s", dur: "6.2s" },
  { top: "30%", left: "8%", size: 1, delay: "2s", dur: "7.4s" },
  { top: "46%", left: "64%", size: 2, delay: "1.2s", dur: "6s" },
  { top: "21%", left: "92%", size: 1, delay: "3s", dur: "5.6s" },
  { top: "52%", left: "26%", size: 1, delay: "2.8s", dur: "6.8s" },
  { top: "62%", left: "78%", size: 2, delay: ".2s", dur: "7.2s" },
  { top: "70%", left: "16%", size: 1, delay: "1.9s", dur: "6.4s" },
  { top: "78%", left: "58%", size: 1, delay: "3.4s", dur: "5.9s" },
  { top: "86%", left: "34%", size: 2, delay: ".6s", dur: "6.6s" },
  { top: "58%", left: "46%", size: 1, delay: "2.2s", dur: "7.1s" },
] as const;

/** 아래에서 위로 천천히 떠오르는 금가루 */
const MOTES = [
  { left: "12%", delay: "0s", dur: "17s", size: 3 },
  { left: "31%", delay: "4s", dur: "21s", size: 2 },
  { left: "48%", delay: "8s", dur: "19s", size: 3 },
  { left: "66%", delay: "2s", dur: "23s", size: 2 },
  { left: "83%", delay: "6s", dur: "18s", size: 3 },
  { left: "94%", delay: "11s", dur: "22s", size: 2 },
] as const;

interface CodexStarfieldProps {
  /** false면 아무것도 렌더하지 않는다 */
  enabled?: boolean;
  /** 금가루까지 띄울지 — 읽기 화면에서는 끈다(글 위로 지나가면 방해된다) */
  motes?: boolean;
}

export default function CodexStarfield({ enabled = true, motes = true }: CodexStarfieldProps) {
  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {STARS.map((star) => (
        <span
          key={`${star.top}-${star.left}`}
          className={styles.star}
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            boxShadow: `0 0 ${star.size * 5}px ${star.size}px rgba(232,213,163,.4)`,
            ["--twinkle-delay" as string]: star.delay,
            ["--twinkle-dur" as string]: star.dur,
          }}
        />
      ))}
      {motes
        ? MOTES.map((mote) => (
          <span
            key={`mote-${mote.left}`}
            className={styles.mote}
            style={{
              left: mote.left,
              width: mote.size,
              height: mote.size,
              ["--mote-delay" as string]: mote.delay,
              ["--mote-dur" as string]: mote.dur,
            }}
          />
        ))
        : null}
    </div>
  );
}
