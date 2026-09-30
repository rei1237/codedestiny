"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { nextPigSpeech, type PigIdleState } from "@/lib/fortune-tea-house/pig-idle";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import { fortuneTeaHouseAssets } from "../data/assets";
import styles from "../styles/fortune-tea-house.module.css";
const POSES = ["welcome", "tea", "curious", "shy", "honey", "aroma", "cheer", "reading", "flower", "teapot", "sleep"] as const;

export default function LandingPig({ speeches, visualAria }: { speeches: string[]; visualAria: string }) {
  const pigGate = useSpritePlaybackGate<HTMLSpanElement>();
  const [idle, setIdle] = useState<PigIdleState>({ index: 0, turn: 0, recent: [0], rareCount: 0, lastRare: -5 });
  const pose = pigGate.prefersReducedMotion ? "welcome" : idle.index === 3 ? "waiting" : POSES[idle.turn % POSES.length];
  const [failedPose, setFailedPose] = useState<string>();
  const activePigSrc = failedPose === pose ? "/images/fortune-tea-house/flower-pig-single-a.webp" : fortuneTeaHouseAssets.landingPig[pose];

  useEffect(() => {
    if (!pigGate.isInView || !pigGate.isPageVisible) return;
    const timer = window.setTimeout(() => setIdle(current => nextPigSpeech(current, speeches.length)), idle.index === 3 ? 15000 : 7000);
    return () => window.clearTimeout(timer);
  }, [pigGate.isInView, pigGate.isPageVisible, idle.index, idle.turn, speeches.length]);

  return (
    <div className={styles.landingVisual} aria-label={visualAria}>
      <span className={styles.landingPigAura} aria-hidden />
      <div className={styles.landingSpeechWrap} role="note">
        <span className={styles.landingSpeechOrnament} aria-hidden />
        {speeches.map((speech, index) => (
          <p key={index} className={styles.landingSpeechText} data-active={index === idle.index} aria-hidden={index !== idle.index}>
            {speech}
          </p>
        ))}
      </div>
      <span className={styles.landingPigSlot}>
        <span ref={pigGate.ref} className={styles.landingPigMascot}>
          <Image
            className={styles.landingPigSingleImage}
            src={activePigSrc}
            alt={visualAria}
            fill
            sizes="(max-width: 640px) 48vw, 24vw"
            loading="lazy"
            unoptimized
            onError={() => setFailedPose(pose)}
          />
        </span>
      </span>
    </div>
  );
}
