"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { talkingPigYeoniFrames } from "../data/assets";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import styles from "../styles/fortune-tea-house.module.css";

const pigFrameSequence = [
  { sheet: 0, col: 0, row: 0 },
  { sheet: 0, col: 1, row: 0 },
  { sheet: 1, col: 0, row: 1 },
  { sheet: 0, col: 2, row: 0 },
  { sheet: 2, col: 1, row: 0 },
  { sheet: 1, col: 1, row: 1 },
  { sheet: 2, col: 2, row: 2 },
  { sheet: 0, col: 0, row: 0 },
] as const;

const idleFrame = { sheet: 0, col: 1, row: 0 };

type TalkingPigYeoniProps = {
  isSpeaking?: boolean;
};

export default function TalkingPigYeoni({ isSpeaking = true }: TalkingPigYeoniProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [frameStep, setFrameStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const activeFrame = prefersReducedMotion || !isSpeaking ? idleFrame : pigFrameSequence[frameStep % pigFrameSequence.length];

  useEffect(() => {
    if (prefersReducedMotion || !isSpeaking) return;
    const timer = window.setInterval(() => {
      setFrameStep((current) => current + 1);
    }, 1080);
    return () => window.clearInterval(timer);
  }, [isSpeaking, prefersReducedMotion]);

  return (
    <div className={styles.talkingPig} data-speaking={isSpeaking ? "true" : "false"}>
      <span className={styles.pigGlow} aria-hidden />
      <span
        className={`${styles.pigImage} ${styles.pigSpriteFrame}`}
        data-failed={failed ? "true" : "false"}
        style={
          {
            "--pig-sprite-col": activeFrame.col,
            "--pig-sprite-row": activeFrame.row,
          } as CSSProperties
        }
      >
        {!failed ? (
          <Image
            className={styles.pigSpriteSheet}
            src={talkingPigYeoniFrames[activeFrame.sheet]}
            alt="문 앞에서 말을 건네는 꽃돼지?"
            fill
            sizes="(max-width: 640px) 82vw, 360px"
            priority
            unoptimized
            onError={() => setFailed(true)}
          />
        ) : (
          <span className={styles.pigSpriteFallback} role="img" aria-label="문 앞에서 말을 건네는 꽃돼지?">
            꽃돼지?
          </span>
        )}
      </span>
      <span className={styles.pigNamePlate}>꽃돼지?</span>
      <span className={styles.pigScentTrail} aria-hidden />
      <div className={styles.preloadFrames} aria-hidden>
        {talkingPigYeoniFrames.map((frame) => (
          <Image key={frame} src={frame} alt="" width={1} height={1} priority unoptimized />
        ))}
      </div>
    </div>
  );
}
