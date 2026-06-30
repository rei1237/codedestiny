"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import NeoWarRoomAssetImage from "./NeoWarRoomAssetImage";
import type { NeoWarRoomAsset } from "../data/assets";
import {
  type NeoWarRoomEmotionState,
  type NeoWarRoomSpriteVariant,
  getNeoWarRoomSpriteStateConfig,
} from "../data/sprite-states";
import styles from "../neo-operation-room.module.css";

type NeoSpriteActorProps = {
  state?: NeoWarRoomEmotionState;
  variant?: NeoWarRoomSpriteVariant;
  size?: "compact" | "medium" | "large";
  dialogueOverride?: string;
  sheetFrame?: number;
  assetOverride?: NeoWarRoomAsset;
  talkFrames?: readonly NeoWarRoomAsset[];
  talkSheetFrames?: readonly number[];
  talking?: boolean;
  talkFrameIntervalMs?: number;
  showDialogue?: boolean;
  ariaLive?: "off" | "polite" | "assertive";
  className?: string;
};

export default function NeoSpriteActor({
  state = "idle",
  variant,
  size = "medium",
  dialogueOverride,
  sheetFrame,
  assetOverride,
  talkFrames,
  talkSheetFrames,
  talking = false,
  talkFrameIntervalMs = 280,
  showDialogue = true,
  ariaLive = "polite",
  className = "",
}: NeoSpriteActorProps) {
  const config = getNeoWarRoomSpriteStateConfig(state);
  const resolvedVariant = variant ?? config.variant;
  const dialogue = dialogueOverride ?? config.dialogue;
  const asset = assetOverride ?? config.asset;
  const validTalkFrames = useMemo(() => talkFrames?.filter((frame) => Boolean(frame?.src)) ?? [], [talkFrames]);
  const talkFrameKey = useMemo(() => validTalkFrames.map((frame) => frame.src).join("|"), [validTalkFrames]);
  const validTalkSheetFrames = useMemo(
    () => talkSheetFrames?.filter((frame) => Number.isFinite(frame) && frame >= 1) ?? [],
    [talkSheetFrames],
  );
  const talkSheetFrameKey = useMemo(() => validTalkSheetFrames.join("|"), [validTalkSheetFrames]);
  const [talkFrameIndex, setTalkFrameIndex] = useState(0);
  const shouldAnimatePairedTalk = talking && validTalkFrames.length > 1 && validTalkSheetFrames.length > 1;
  const shouldAnimateSheetTalk = talking && !shouldAnimatePairedTalk && validTalkSheetFrames.length > 1;
  const shouldAnimateAssetTalk = talking && !shouldAnimatePairedTalk && !shouldAnimateSheetTalk && validTalkFrames.length > 1;
  const shouldAnimateTalk = shouldAnimatePairedTalk || shouldAnimateSheetTalk || shouldAnimateAssetTalk;
  const activeAsset = shouldAnimatePairedTalk || shouldAnimateAssetTalk
    ? validTalkFrames[talkFrameIndex % validTalkFrames.length]
    : asset;
  const activeSheetFrame = shouldAnimatePairedTalk || shouldAnimateSheetTalk
    ? validTalkSheetFrames[talkFrameIndex % validTalkSheetFrames.length]
    : sheetFrame;
  const sheetFrameIndex = typeof activeSheetFrame === "number" && activeSheetFrame >= 1 ? activeSheetFrame - 1 : null;
  const sheetCol = sheetFrameIndex === null ? 0 : sheetFrameIndex % 4;
  const sheetRow = sheetFrameIndex === null ? 0 : Math.floor(sheetFrameIndex / 4);
  const sheetCropStyle = sheetFrameIndex === null
    ? undefined
    : {
      "--neo-sprite-frame-x": `${sheetCol * -25}%`,
      "--neo-sprite-frame-y": `${sheetRow * -50}%`,
    } as CSSProperties;

  useEffect(() => {
    setTalkFrameIndex(0);
  }, [asset.src, talkFrameKey, talkSheetFrameKey]);

  useEffect(() => {
    if (!shouldAnimateTalk) return undefined;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return undefined;
    const frameCount = shouldAnimatePairedTalk
      ? Math.min(validTalkFrames.length, validTalkSheetFrames.length)
      : shouldAnimateSheetTalk
        ? validTalkSheetFrames.length
        : validTalkFrames.length;
    const timer = window.setInterval(() => {
      setTalkFrameIndex((current) => (current + 1) % frameCount);
    }, talkFrameIntervalMs);
    return () => window.clearInterval(timer);
  }, [shouldAnimateTalk, shouldAnimatePairedTalk, shouldAnimateSheetTalk, talkFrameIntervalMs, validTalkFrames.length, validTalkSheetFrames.length]);

  return (
    <aside
      className={`${styles.spriteActor} ${className}`.trim()}
      data-state={config.state}
      data-variant={resolvedVariant}
      data-size={size}
      data-motion={config.motion}
      data-sheet-crop={sheetFrameIndex === null ? "false" : "true"}
      data-talking={shouldAnimateTalk ? "true" : "false"}
      aria-live={ariaLive}
    >
      <div className={styles.spriteStage}>
        <NeoWarRoomAssetImage
          asset={activeAsset}
          fallbackSrc={config.fallbackAsset.src}
          alt={config.alt}
          sizes={size === "compact" ? "140px" : "(max-width: 768px) 160px, 280px"}
          className={styles.spriteImageFrame}
          imageClassName={styles.spriteImage}
          style={sheetCropStyle}
        />
      </div>
      {showDialogue ? (
        <div className={styles.spriteDialogue}>
          <span>NEO</span>
          <p>{dialogue}</p>
        </div>
      ) : null}
    </aside>
  );
}
