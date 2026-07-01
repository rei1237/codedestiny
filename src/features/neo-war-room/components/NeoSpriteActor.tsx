"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
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
  const spriteGate = useSpritePlaybackGate<HTMLElement>();
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
  const displayTalkFrames = useMemo(
    () => (spriteGate.isMobile ? validTalkFrames.slice(0, 12) : validTalkFrames),
    [spriteGate.isMobile, validTalkFrames],
  );
  const displayTalkSheetFrames = useMemo(
    () => (spriteGate.isMobile ? validTalkSheetFrames.slice(0, 12) : validTalkSheetFrames),
    [spriteGate.isMobile, validTalkSheetFrames],
  );
  const talkSheetFrameKey = useMemo(() => validTalkSheetFrames.join("|"), [validTalkSheetFrames]);
  const [talkFrameIndex, setTalkFrameIndex] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));
  const shouldAnimatePairedTalk = talking && displayTalkFrames.length > 1 && displayTalkSheetFrames.length > 1;
  const shouldAnimateSheetTalk = talking && !shouldAnimatePairedTalk && displayTalkSheetFrames.length > 1;
  const shouldAnimateAssetTalk = talking && !shouldAnimatePairedTalk && !shouldAnimateSheetTalk && displayTalkFrames.length > 1;
  const shouldAnimateTalk = shouldAnimatePairedTalk || shouldAnimateSheetTalk || shouldAnimateAssetTalk;
  const activeAsset = shouldAnimatePairedTalk || shouldAnimateAssetTalk
    ? displayTalkFrames[talkFrameIndex % displayTalkFrames.length] ?? asset
    : asset;
  const activeSheetFrame = shouldAnimatePairedTalk || shouldAnimateSheetTalk
    ? displayTalkSheetFrames[talkFrameIndex % displayTalkSheetFrames.length] ?? sheetFrame
    : sheetFrame;
  const isMobileSingleWebpFrame = spriteGate.isMobile && activeAsset.src.includes("/neo-operation-room/sprites/transparent/");
  const sheetFrameIndex = !isMobileSingleWebpFrame && typeof activeSheetFrame === "number" && activeSheetFrame >= 1 ? activeSheetFrame - 1 : null;
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
  }, [asset.src, spriteGate.isMobile, talkFrameKey, talkSheetFrameKey]);

  useEffect(() => {
    const updateVisibility = () => setIsPageVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!shouldAnimateTalk || !isPageVisible || !spriteGate.canAnimate) return undefined;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return undefined;
    const frameCount = shouldAnimatePairedTalk
      ? Math.min(displayTalkFrames.length, displayTalkSheetFrames.length)
      : shouldAnimateSheetTalk
        ? displayTalkSheetFrames.length
        : displayTalkFrames.length;
    const timer = window.setInterval(() => {
      setTalkFrameIndex((current) => (current + 1) % frameCount);
    }, talkFrameIntervalMs);
    return () => window.clearInterval(timer);
  }, [displayTalkFrames.length, displayTalkSheetFrames.length, isPageVisible, shouldAnimateTalk, shouldAnimatePairedTalk, shouldAnimateSheetTalk, spriteGate.canAnimate, talkFrameIntervalMs]);

  return (
    <aside
      ref={spriteGate.ref}
      className={`${styles.spriteActor} ${className}`.trim()}
      data-state={config.state}
      data-variant={resolvedVariant}
      data-size={size}
      data-motion={config.motion}
      data-sheet-crop={sheetFrameIndex === null ? "false" : "true"}
      data-mobile-single-frame={isMobileSingleWebpFrame ? "true" : "false"}
      data-talking={shouldAnimateTalk && spriteGate.canAnimate ? "true" : "false"}
      data-playback={shouldAnimateTalk && spriteGate.canAnimate ? "animated" : "static"}
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
