"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  getYeoniSpriteFrame,
  yeoniMoodFrameMap,
  yeoniSpriteSheets,
  type YeoniMood,
  type YeoniSpriteFrameId,
} from "../data/yeoniSprites";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import styles from "../styles/fortune-tea-house.module.css";

type YeoniDialogueActorProps = {
  mood: YeoniMood;
  isSpeaking: boolean;
  className?: string;
  compact?: boolean;
  priority?: boolean;
};

export default function YeoniDialogueActor({
  mood,
  isSpeaking,
  className = "",
  compact = false,
  priority = false,
}: YeoniDialogueActorProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [talkStep, setTalkStep] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const [failedSheets, setFailedSheets] = useState<Record<string, boolean>>({});
  const motion = yeoniMoodFrameMap[mood];

  useEffect(() => {
    setTalkStep(0);
    setIsBlinking(false);
  }, [mood]);

  useEffect(() => {
    if (prefersReducedMotion || !isSpeaking) return;
    const timer = window.setInterval(() => {
      setTalkStep((current) => current + 1);
    }, 920);
    return () => window.clearInterval(timer);
  }, [isSpeaking, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || isSpeaking) return;
    let blinkOffTimer: number | undefined;
    const blinkTimer = window.setInterval(() => {
      setIsBlinking(true);
      blinkOffTimer = window.setTimeout(() => setIsBlinking(false), 280);
    }, 4600);
    return () => {
      window.clearInterval(blinkTimer);
      if (blinkOffTimer) window.clearTimeout(blinkOffTimer);
    };
  }, [isSpeaking, prefersReducedMotion]);

  const activeFrameId: YeoniSpriteFrameId = prefersReducedMotion
    ? motion.idle
    : isBlinking
      ? motion.blink
      : isSpeaking
        ? motion.speaking[talkStep % motion.speaking.length]
        : motion.idle;
  const activeFrame = getYeoniSpriteFrame(activeFrameId);
  const activeSheet = yeoniSpriteSheets[activeFrame.sheet];
  const hasFailed = failedSheets[activeFrame.sheet];
  const preloadFrames = useMemo(() => {
    const frameIds = [motion.idle, motion.blink, ...motion.speaking];
    return Array.from(new Set(frameIds)).map((frameId) => getYeoniSpriteFrame(frameId));
  }, [motion]);
  const frameStyle = {
    "--yeoni-sprite-columns": activeSheet.columns,
    "--yeoni-sprite-rows": activeSheet.rows,
    "--yeoni-sprite-col": activeFrame.col,
    "--yeoni-sprite-row": activeFrame.row,
    "--yeoni-frame-aspect": activeSheet.aspectRatio,
  } as CSSProperties;

  return (
    <div
      className={`${styles.yeoniActor} ${className}`}
      data-mood={mood}
      data-speaking={isSpeaking && !prefersReducedMotion ? "true" : "false"}
      data-compact={compact ? "true" : "false"}
    >
      <span className={styles.yeoniAura} aria-hidden />
      <span className={styles.yeoniActorLotus} aria-hidden />
      <span className={styles.yeoniSpriteFrame} data-failed={hasFailed ? "true" : "false"} style={frameStyle}>
        {!hasFailed ? (
          <Image
            className={styles.yeoniSpriteSheet}
            src={activeSheet.src}
            alt="운명의 찻집 상담사 연이"
            fill
            sizes={compact ? "(max-width: 640px) 48vw, 240px" : "(max-width: 640px) 88vw, 470px"}
            priority={priority}
            unoptimized
            onError={() => setFailedSheets((current) => ({ ...current, [activeFrame.sheet]: true }))}
          />
        ) : null}
        {hasFailed ? (
          <span className={styles.yeoniSpriteFallback} role="img" aria-label="운명의 찻집 상담사 연이">
            <span>연이</span>
          </span>
        ) : null}
      </span>
      <span className={styles.yeoniActorName}>연이</span>
      <span className={styles.yeoniActorScent} aria-hidden />
      <div className={styles.preloadFrames} aria-hidden>
        {preloadFrames.map((frame) => (
          <Image
            key={`${frame.sheet}-${frame.id}`}
            src={yeoniSpriteSheets[frame.sheet].src}
            alt=""
            width={1}
            height={1}
            priority={priority}
            unoptimized
          />
        ))}
      </div>
    </div>
  );
}
