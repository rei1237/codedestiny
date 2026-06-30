"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { fortuneTeaHouseAssets, talkingPigYeoniFrameCrops } from "../data/assets";
import {
  flowerPigIdleLines,
  getNextTeaHouseEntryStage,
  getPreviousTeaHouseEntryStage,
  getTeaHouseEntryScene,
  type TeaHouseEntryActor,
  type TeaHouseEntryStage,
} from "../data/entryStory";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";

type TeaHouseEntrySceneProps = {
  stage: TeaHouseEntryStage;
  onStageChange: (stage: TeaHouseEntryStage) => void;
  onComplete: () => void;
};

const pigFrames = [
  talkingPigYeoniFrameCrops.welcome,
  talkingPigYeoniFrameCrops.honey,
  talkingPigYeoniFrameCrops.comfort,
  talkingPigYeoniFrameCrops.thinking,
  talkingPigYeoniFrameCrops.surprised,
  talkingPigYeoniFrameCrops.doorway,
] as const;

const transformFrames = [
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 2, row: 0 },
  { col: 3, row: 0 },
  { col: 0, row: 1 },
  { col: 1, row: 1 },
  { col: 2, row: 1 },
  { col: 3, row: 1 },
] as const;

const TRANSFORM_MIN_VISIBLE_MS = 1200;
const TRANSFORM_FALLBACK_FRAME_MS = 140;
const TRANSFORM_VIDEO_CACHE_KEY = "20260629-transform";
const PIG_IDLE_FIRST_DELAY_MS = 8200;
const PIG_IDLE_NEXT_DELAY_MS = 10800;
const TRANSFORM_AUTO_ADVANCE_DELAY_MS = 900;
const YEONI_REVEAL_AUTO_ADVANCE_DELAY_MS = 2800;

function withAssetCacheKey(src: string, cacheKey: string) {
  if (!src) return src;
  return `${src}${src.includes("?") ? "&" : "?"}v=${cacheKey}`;
}

const transformVideoSrc = withAssetCacheKey(fortuneTeaHouseAssets.videos.pigTransform, TRANSFORM_VIDEO_CACHE_KEY);

function debugEntry(message: string, ...payload: unknown[]) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[FortuneTeaHouse Entry] ${message}`, ...payload);
  }
}

function debugTransform(message: string, ...payload: unknown[]) {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[FortuneTeaHouse Transform] ${message}`, ...payload);
  }
}

export default function TeaHouseEntryScene({ stage, onStageChange, onComplete }: TeaHouseEntrySceneProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const scene = getTeaHouseEntryScene(stage);
  const [lineIndex, setLineIndex] = useState(0);
  const [idleLineIndex, setIdleLineIndex] = useState<number | null>(null);
  const [pigFrameIndex, setPigFrameIndex] = useState(0);
  const [usePigFallback, setUsePigFallback] = useState(false);
  const [useTransformFallback, setUseTransformFallback] = useState(false);
  const [isTransformVideoModalOpen, setIsTransformVideoModalOpen] = useState(false);
  const [transformVideoError, setTransformVideoError] = useState("");
  const [transformHasPlayed, setTransformHasPlayed] = useState(false);
  const [transformFallbackFrameIndex, setTransformFallbackFrameIndex] = useState(0);
  const [isTransformMinTimeReady, setIsTransformMinTimeReady] = useState(false);
  const [isCurrentLineTextComplete, setIsCurrentLineTextComplete] = useState(false);
  const baseLine = scene.lines[lineIndex] || scene.lines[0]!;
  const canShowPigIdleLine = scene.actor === "pig" && flowerPigIdleLines.length > 0;
  const idleLine = canShowPigIdleLine && idleLineIndex !== null ? flowerPigIdleLines[idleLineIndex % flowerPigIdleLines.length] || null : null;
  const currentLine = idleLine || baseLine;
  const isShowingIdleLine = idleLine !== null;
  const isLastLine = lineIndex >= scene.lines.length - 1;
  const previousStage = getPreviousTeaHouseEntryStage(scene.stage);
  const nextStage = getNextTeaHouseEntryStage(scene.stage);
  const isTransformPreview = scene.stage === "transformPreview";
  const isTransformAdvanceLocked = isTransformPreview && !isTransformMinTimeReady;
  const isAutoAdvanceLineStage = scene.stage === "transformPreview" || scene.stage === "yeoniReveal";
  const showSkip = scene.stage !== "teaIntro" && scene.stage !== "transformPreview" && scene.stage !== "yeoniReveal";
  const canGoPrevious = Boolean(previousStage) || lineIndex > 0;
  const nextButtonLabel = isTransformAdvanceLocked ? "달빛 피어나는 중" : baseLine.cta || (nextStage ? "다음" : "찻잔 고르러 가기");
  const sceneStyle = useMemo(
    () =>
      ({
        "--entry-bg-desktop": `url("${scene.background === "interior2" ? fortuneTeaHouseAssets.backgrounds.interiorDesktop2 : fortuneTeaHouseAssets.backgrounds.interiorDesktop1}")`,
        "--entry-bg-mobile": `url("${scene.background === "interior2" ? fortuneTeaHouseAssets.backgrounds.interiorMobile2 : fortuneTeaHouseAssets.backgrounds.interiorMobile1}")`,
        "--entry-overlay": `url("${fortuneTeaHouseAssets.ui.overlay}")`,
        "--entry-overlay-2": `url("${fortuneTeaHouseAssets.ui.overlay2}")`,
      }) as CSSProperties,
    [scene.background],
  );

  useEffect(() => {
    debugEntry("stage changed:", stage);
  }, [stage]);

  useEffect(() => {
    setLineIndex(0);
    setIdleLineIndex(null);
    setPigFrameIndex(0);
    setTransformFallbackFrameIndex(prefersReducedMotion && stage === "transformPreview" ? transformFrames.length - 1 : 0);
    setUsePigFallback(false);
    setUseTransformFallback(stage === "transformPreview");
    setIsTransformVideoModalOpen(false);
    setTransformVideoError("");
    setTransformHasPlayed(stage !== "transformPreview");
    setIsTransformMinTimeReady(stage !== "transformPreview");
  }, [prefersReducedMotion, stage]);

  useEffect(() => {
    setIdleLineIndex(null);
  }, [lineIndex]);

  useEffect(() => {
    setIsCurrentLineTextComplete(false);
  }, [lineIndex]);

  useEffect(() => {
    if (stage !== "transformPreview") return;
    debugTransform("video url:", transformVideoSrc);
  }, [stage]);

  useEffect(() => {
    if (stage !== "doorOpened" && stage !== "transformPreview") return;

    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = transformVideoSrc;
    video.load();

    const teaCupSheet = new window.Image();
    teaCupSheet.decoding = "async";
    teaCupSheet.src = fortuneTeaHouseAssets.teaCups.correctedPhotoroom;

    return () => {
      video.removeAttribute("src");
      video.load();
      teaCupSheet.removeAttribute("src");
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== "transformPreview") return;
    const timer = window.setTimeout(() => {
      setIsTransformMinTimeReady(true);
    }, TRANSFORM_MIN_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "transformPreview") return;
    debugTransform("transform sprite started");

    if (prefersReducedMotion) {
      setTransformFallbackFrameIndex(transformFrames.length - 1);
      return;
    }

    let frameIndex = 0;
    setTransformFallbackFrameIndex(0);
    const frameTimer = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % transformFrames.length;
      setTransformFallbackFrameIndex(frameIndex);
    }, TRANSFORM_FALLBACK_FRAME_MS);

    return () => {
      window.clearInterval(frameTimer);
    };
  }, [prefersReducedMotion, stage]);

  useEffect(() => {
    if (stage === "transformPreview" && useTransformFallback) {
      debugTransform("fallback frame:", transformFallbackFrameIndex);
    }
  }, [stage, transformFallbackFrameIndex, useTransformFallback]);

  useEffect(() => {
    if (stage === "transformPreview" && transformHasPlayed) {
      debugTransform("completed");
    }
  }, [stage, transformHasPlayed]);

  useEffect(() => {
    if (prefersReducedMotion || (scene.actor !== "pig" && scene.actor !== "tea")) return;
    const timer = window.setInterval(() => {
      setPigFrameIndex((current) => (current + 1) % pigFrames.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, scene.actor]);

  useEffect(() => {
    if (!canShowPigIdleLine) return;
    const delay = idleLineIndex === null ? PIG_IDLE_FIRST_DELAY_MS : PIG_IDLE_NEXT_DELAY_MS;
    const timer = window.setTimeout(() => {
      setIdleLineIndex((current) => (current === null ? 0 : (current + 1) % flowerPigIdleLines.length));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [canShowPigIdleLine, idleLineIndex, lineIndex, stage]);

  const finishTransformVideo = useCallback(() => {
    setIsTransformVideoModalOpen(false);
    setTransformHasPlayed(true);
    window.setTimeout(() => {
      if (!isLastLine) {
        setLineIndex((current) => Math.min(current + 1, scene.lines.length - 1));
        return;
      }
      if (nextStage) {
        onStageChange(nextStage);
        return;
      }
      onComplete();
    }, 160);
  }, [isLastLine, nextStage, onComplete, onStageChange, scene.lines.length]);

  const handleTransformVideoError = useCallback((error?: unknown) => {
    debugTransform("modal video error:", transformVideoSrc, error);
    setTransformVideoError("변신 장면을 불러오지 못했어요. 다시 시도해 주세요.");
  }, []);

  const goNext = useCallback(() => {
    setIdleLineIndex(null);
    if (isAutoAdvanceLineStage && !isCurrentLineTextComplete) return;
    if (isTransformAdvanceLocked) return;
    if (isTransformPreview && !transformHasPlayed) {
      setTransformVideoError("");
      setIsTransformVideoModalOpen(true);
      return;
    }
    if (!isLastLine) {
      setLineIndex((current) => current + 1);
      return;
    }
    if (nextStage) {
      onStageChange(nextStage);
      return;
    }
    onComplete();
  }, [
    isCurrentLineTextComplete,
    isAutoAdvanceLineStage,
    isLastLine,
    isTransformAdvanceLocked,
    isTransformPreview,
    nextStage,
    onComplete,
    onStageChange,
    transformHasPlayed,
  ]);

  useEffect(() => {
    if (isShowingIdleLine) return;
    if (stage !== "transformPreview" && stage !== "yeoniReveal") return;
    if (stage === "transformPreview" && !transformHasPlayed) return;
    if (isAutoAdvanceLineStage && !isCurrentLineTextComplete) return;
    if (isTransformAdvanceLocked) return;

    const delay = stage === "transformPreview" ? TRANSFORM_AUTO_ADVANCE_DELAY_MS : YEONI_REVEAL_AUTO_ADVANCE_DELAY_MS;
    const timer = window.setTimeout(() => {
      goNext();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [goNext, isCurrentLineTextComplete, isShowingIdleLine, isTransformAdvanceLocked, isAutoAdvanceLineStage, lineIndex, stage, transformHasPlayed]);

  useEffect(() => {
    if (!isTransformVideoModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finishTransformVideo();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [finishTransformVideo, isTransformVideoModalOpen]);

  function goPrevious() {
    setIdleLineIndex(null);
    if (lineIndex > 0) {
      setLineIndex((current) => current - 1);
      return;
    }
    if (previousStage) onStageChange(previousStage);
  }

  return (
    <section className={styles.entryStoryScene} data-entry-stage={scene.stage} aria-labelledby="teaHouseEntryTitle" style={sceneStyle}>
      <span className={styles.entryStoryBackground} aria-hidden />
      <span className={styles.entryStoryOverlay} aria-hidden />
      <span className={styles.entryStoryMoonGlow} aria-hidden />
      <span className={styles.entryStoryTeaGlow} aria-hidden />
      <EntryActor
        actor={scene.actor}
        pigFrameIndex={pigFrameIndex}
        transformFallbackFrameIndex={transformFallbackFrameIndex}
        usePigFallback={usePigFallback}
        useTransformFallback={useTransformFallback}
        onPigError={() => setUsePigFallback(true)}
      />
      <div className={styles.entryStoryPanel}>
        <p className={styles.sceneEyebrow}>{scene.eyebrow}</p>
        <h2 id="teaHouseEntryTitle">{scene.title}</h2>
        <TeaHouseDialogueBox
          speaker={currentLine.speaker}
          text={currentLine.text}
          className={`${styles.entryDialogueBox} ${isShowingIdleLine ? styles.entryIdleDialogueBox : ""}`}
          onAdvance={goNext}
          isAdvanceDisabled={isTransformAdvanceLocked || (isAutoAdvanceLineStage && !isCurrentLineTextComplete)}
          onTextComplete={setIsCurrentLineTextComplete}
        />
        <div className={styles.entryStoryControls}>
          <span className={styles.storyProgress}>
            {lineIndex + 1} / {scene.lines.length}
          </span>
          <div className={styles.entryStoryButtons}>
            {canGoPrevious ? (
              <TeaHouseButton variant="ghost" onClick={goPrevious} aria-label="이전 장면으로 돌아가기">
                이전
              </TeaHouseButton>
            ) : null}
            {showSkip ? (
              <TeaHouseButton
                variant="secondary"
                onClick={() => {
                  setIdleLineIndex(null);
                  onStageChange("teaIntro");
                }}
                aria-label="찻잔 안내 장면으로 건너뛰기"
              >
                건너뛰기
              </TeaHouseButton>
            ) : null}
            <TeaHouseButton
              onClick={goNext}
              disabled={isTransformAdvanceLocked || (isAutoAdvanceLineStage && !isCurrentLineTextComplete)}
            >
              {nextButtonLabel}
            </TeaHouseButton>
          </div>
        </div>
      </div>
      {isTransformVideoModalOpen ? (
        <TransformVideoModal
          src={transformVideoSrc}
          error={transformVideoError}
          onClose={finishTransformVideo}
          onEnded={finishTransformVideo}
          onError={handleTransformVideoError}
        />
      ) : null}
    </section>
  );
}

type TransformVideoModalProps = {
  src: string;
  error: string;
  onClose: () => void;
  onEnded: () => void;
  onError: (error?: unknown) => void;
};

function TransformVideoModal({ src, error, onClose, onEnded, onError }: TransformVideoModalProps) {
  return (
    <div className={styles.transformVideoOverlay} role="dialog" aria-modal="true" aria-labelledby="transformVideoTitle" onClick={onClose}>
      <div className={styles.transformVideoCard} onClick={(event) => event.stopPropagation()}>
        <button className={styles.transformVideoClose} type="button" onClick={onClose} aria-label="변신 영상 닫기">
          ×
        </button>
        <div className={styles.transformVideoHeader}>
          <span>Moonlight Cutscene</span>
          <h3 id="transformVideoTitle">달빛이 연이를 깨웁니다</h3>
        </div>
        {error ? (
          <div className={styles.transformVideoFallback} role="status">
            <strong>{error}</strong>
            <p>잠시 뒤 다시 시도하거나, 연이를 먼저 만나러 갈 수 있어요.</p>
            <TeaHouseButton onClick={onClose}>연이 만나러 가기</TeaHouseButton>
          </div>
        ) : (
          <video
            className={styles.transformVideoPlayer}
            controls
            autoPlay
            muted
            playsInline
            preload="metadata"
            onEnded={onEnded}
            onError={(event) => onError(event.currentTarget.error)}
          >
            <source src={src} type="video/mp4" />
          </video>
        )}
      </div>
    </div>
  );
}

type EntryActorProps = {
  actor: TeaHouseEntryActor;
  pigFrameIndex: number;
  transformFallbackFrameIndex: number;
  usePigFallback: boolean;
  useTransformFallback: boolean;
  onPigError: () => void;
};

function EntryActor({
  actor,
  pigFrameIndex,
  transformFallbackFrameIndex,
  usePigFallback,
  useTransformFallback,
  onPigError,
}: EntryActorProps) {
  const pigFrame = pigFrames[pigFrameIndex] || pigFrames[0];
  const transformFrame = transformFrames[transformFallbackFrameIndex] || transformFrames[0];

  if (actor === "none") {
    return (
      <div className={styles.entryActor} data-actor="none" aria-hidden>
        <span />
      </div>
    );
  }

  if (actor === "pig") {
    return (
      <div className={styles.entryActor} data-actor="pig">
        <span className={styles.entryActorAura} aria-hidden />
        <span
          className={`${styles.entryPigFrame} ${styles.pigSpriteFrame}`}
          style={
            {
              "--pig-sprite-x": `${pigFrame.x}px`,
              "--pig-sprite-y": `${pigFrame.y}px`,
              "--pig-sprite-width": `${pigFrame.width}px`,
              "--pig-sprite-height": `${pigFrame.height}px`,
              "--pig-sprite-aspect-width": pigFrame.width,
              "--pig-sprite-aspect-height": pigFrame.height,
              "--pig-sprite-sheet-width": `${pigFrame.sheetWidth}px`,
              "--pig-sprite-sheet-height": `${pigFrame.sheetHeight}px`,
            } as CSSProperties
          }
        >
          <Image
            className={styles.pigSpriteSheet}
            src={usePigFallback ? pigFrame.fallbackSrc : pigFrame.src}
            alt="달빛 찻집 안에서 말을 건네는 꽃돼지?"
            fill
            sizes="(max-width: 640px) 76vw, 42vw"
            priority
            unoptimized
            onError={onPigError}
          />
        </span>
      </div>
    );
  }

  if (actor === "transform") {
    return (
      <div
        className={styles.entryActor}
        data-actor="transform"
        data-fallback={useTransformFallback ? "true" : "false"}
      >
        <span className={styles.entryTransformBurst} aria-hidden />
        <span className={styles.entryTransformTeaCup} aria-hidden />
        <span className={styles.entryTransformLotusMist} aria-hidden />
        <span className={styles.entryTransformRing} aria-hidden />
        <span className={styles.entryTransformPetals} aria-hidden />
        <span
          className={styles.entryTransformFrame}
          data-frame-index={transformFallbackFrameIndex}
          style={
            {
              "--entry-transform-col": transformFrame.col,
              "--entry-transform-row": transformFrame.row,
            } as CSSProperties
          }
        >
          <Image
            className={styles.entryTransformSheet}
            src={fortuneTeaHouseAssets.pig.transparent.transform}
            alt="꽃돼지?가 연이로 변신하는 달빛 컷신"
            fill
            sizes="(max-width: 640px) 88vw, 48vw"
            priority
            unoptimized
          />
        </span>
      </div>
    );
  }

  if (actor === "yeoni") {
    return (
      <div className={styles.entryActor} data-actor="yeoni">
        <span className={styles.entryYeoniDescent} role="img" aria-label="달빛 아래 강림하듯 모습을 드러내는 연이">
          <span className={styles.entryYeoniMoonRing} aria-hidden />
          <span className={`${styles.entryYeoniPortraitLayer} ${styles.entryYeoniPortraitLayerFull}`} aria-hidden>
            <Image
              src={fortuneTeaHouseAssets.yeoni.transparent.full}
              alt=""
              fill
              sizes="(max-width: 640px) 74vw, 38vw"
              priority
              unoptimized
            />
          </span>
          <span className={`${styles.entryYeoniPortraitLayer} ${styles.entryYeoniPortraitLayerBust}`} aria-hidden>
            <Image
              src={fortuneTeaHouseAssets.yeoni.transparent.bust}
              alt=""
              fill
              sizes="(max-width: 640px) 78vw, 40vw"
              priority
              unoptimized
            />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className={styles.entryActor} data-actor="tea">
      <span className={styles.entryTeaYeoniPortrait} role="img" aria-label="달빛 아래 찻잔 선택을 안내하는 연이">
        <Image
          src={fortuneTeaHouseAssets.yeoni.transparent.bust}
          alt=""
          fill
          sizes="(max-width: 640px) 72vw, 34vw"
          priority
          unoptimized
        />
      </span>
    </div>
  );
}
