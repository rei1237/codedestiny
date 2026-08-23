"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { fortuneTeaHouseAssets, talkingPigYeoniFrameCrops } from "../data/assets";
import {
  flowerPigIdleLines,
  getNextTeaHouseEntryStage,
  getPreviousTeaHouseEntryStage,
  teaHouseEntryScenes,
  type TeaHouseEntryActor,
  type TeaHouseEntryStage,
} from "../data/entryStory";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import TeaHouseButton from "./TeaHouseButton";
import TeaHouseDialogueBox from "./TeaHouseDialogueBox";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

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

const entryStorySceneUi =
  "relative isolate min-h-svh overflow-hidden bg-[#080511] text-[#fffaf1]";
const entryStoryPanelUi =
  "relative z-10 mx-auto w-full max-w-[760px] !rounded-none !border-0 !bg-transparent !p-0 !shadow-none !ring-0 !backdrop-blur-0";
const entryDialogueUi =
  "!border-[#f6dfb7]/35 !bg-[#12091f]/80 !text-[#fffaf1] !shadow-[0_24px_72px_rgba(4,2,12,0.42),0_0_38px_rgba(214,213,255,0.14),inset_0_1px_0_rgba(255,255,255,0.16)] [&_p]:!text-[#fffaf1]";

const TRANSFORM_MIN_VISIBLE_MS = 1200;
const TRANSFORM_START_DELAY_MS = 120;
const TRANSFORM_FLASH_DELAY_MS = 310;
const TRANSFORM_FLASH_MS = 190;
const TRANSFORM_COMPLETE_MS = 980;
const PIG_IDLE_FIRST_DELAY_MS = 8200;
const PIG_IDLE_NEXT_DELAY_MS = 10800;
const TRANSFORM_AUTO_ADVANCE_DELAY_MS = 900;
const YEONI_REVEAL_AUTO_ADVANCE_DELAY_MS = 2800;

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

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    씬 대사(scene.lines)는 data/entryStory.ts 의 값이라 데이터 배치에서 함께 다룬다. */
const KO = {
  blooming: "달빛 피어나는 중",
  nextLabel: "다음",
  toCupsLabel: "찻잔 고르러 가기",
  prevAria: "이전 장면으로 돌아가기",
  prevLabel: "이전",
  skipAria: "찻잔 안내 장면으로 건너뛰기",
  skipLabel: "건너뛰기",
  pigAlt: "달빛 찻집 안에서 말을 건네는 꽃돼지?",
  pigBeforeAlt: "변신 전 꽃돼지 연이",
  yeoniRevealAlt: "달빛 속에서 모습을 드러낸 연이",
  yeoniDescentAria: "달빛 아래 강림하듯 모습을 드러내는 연이",
  yeoniTeaAria: "달빛 아래 찻잔 선택을 안내하는 연이",
};

/** 입장 씬 데이터에서 사전이 덮으면 안 되는 필드. 전부 판별자이거나 배경·배우 선택 값이다.
    🔴 speaker 는 대사 상자가 이니셜을 고르는 판별자이고, mood 는 마스코트 표정을 고르는 키다. */
const ENTRY_SKIP_KEYS = ["stage", "actor", "background", "speaker", "mood"];

export default function TeaHouseEntryScene({ stage, onStageChange, onComplete }: TeaHouseEntrySceneProps) {
  const copy = useTeaHouseCopy("entryScene", KO);
  const scenes = useTeaHouseCopy("entryScenes", teaHouseEntryScenes, { skipKeys: ENTRY_SKIP_KEYS });
  const idleLines = useTeaHouseCopy("entryIdleLines", flowerPigIdleLines, { skipKeys: ENTRY_SKIP_KEYS });
  const prefersReducedMotion = usePrefersReducedMotion();
  const scene = scenes.find((entry) => entry.stage === stage) || scenes[0]!;
  const [lineIndex, setLineIndex] = useState(0);
  const [idleLineIndex, setIdleLineIndex] = useState<number | null>(null);
  const [pigFrameIndex, setPigFrameIndex] = useState(0);
  const [usePigFallback, setUsePigFallback] = useState(false);
  const [transformHasPlayed, setTransformHasPlayed] = useState(false);
  const [isTransformed, setIsTransformed] = useState(false);
  const [showTransformFlash, setShowTransformFlash] = useState(false);
  const [isTransformMinTimeReady, setIsTransformMinTimeReady] = useState(false);
  const [isCurrentLineTextComplete, setIsCurrentLineTextComplete] = useState(false);
  const baseLine = scene.lines[lineIndex] || scene.lines[0]!;
  const canShowPigIdleLine = scene.actor === "pig" && flowerPigIdleLines.length > 0;
  const idleLine = canShowPigIdleLine && idleLineIndex !== null ? idleLines[idleLineIndex % idleLines.length] || null : null;
  const currentLine = idleLine || baseLine;
  const isShowingIdleLine = idleLine !== null;
  const isLastLine = lineIndex >= scene.lines.length - 1;
  const previousStage = getPreviousTeaHouseEntryStage(scene.stage);
  const nextStage = getNextTeaHouseEntryStage(scene.stage);
  const isTransformPreview = scene.stage === "transformPreview";
  const isTransformAdvanceLocked = isTransformPreview && (!isTransformMinTimeReady || !transformHasPlayed);
  const isAutoAdvanceLineStage = scene.stage === "transformPreview" || scene.stage === "yeoniReveal";
  const showSkip = scene.stage !== "teaIntro" && scene.stage !== "transformPreview" && scene.stage !== "yeoniReveal";
  const canGoPrevious = Boolean(previousStage) || lineIndex > 0;
  const nextButtonLabel = isTransformAdvanceLocked ? copy.blooming : baseLine.cta || (nextStage ? copy.nextLabel : copy.toCupsLabel);
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
    setUsePigFallback(false);
    setTransformHasPlayed(stage !== "transformPreview");
    setIsTransformed(stage !== "transformPreview");
    setShowTransformFlash(false);
    setIsTransformMinTimeReady(stage !== "transformPreview");
  }, [stage]);

  useEffect(() => {
    setIdleLineIndex(null);
  }, [lineIndex]);

  useEffect(() => {
    setIsCurrentLineTextComplete(false);
  }, [lineIndex]);

  useEffect(() => {
    if (stage !== "doorOpened" && stage !== "transformPreview") return;

    const teaCupSheet = new window.Image();
    teaCupSheet.decoding = "async";
    teaCupSheet.src = fortuneTeaHouseAssets.teaCups.correctedPhotoroom;

    const yeoniBust = new window.Image();
    yeoniBust.decoding = "async";
    yeoniBust.src = fortuneTeaHouseAssets.yeoni.bust;

    return () => {
      teaCupSheet.removeAttribute("src");
      yeoniBust.removeAttribute("src");
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
    debugTransform("transform transition started");

    if (prefersReducedMotion) {
      setIsTransformed(true);
      setShowTransformFlash(false);
      setTransformHasPlayed(true);
      return;
    }

    setIsTransformed(false);
    setShowTransformFlash(false);
    setTransformHasPlayed(false);

    const transformTimer = window.setTimeout(() => setIsTransformed(true), TRANSFORM_START_DELAY_MS);
    const flashTimer = window.setTimeout(() => setShowTransformFlash(true), TRANSFORM_FLASH_DELAY_MS);
    const flashOffTimer = window.setTimeout(() => setShowTransformFlash(false), TRANSFORM_FLASH_DELAY_MS + TRANSFORM_FLASH_MS);
    const completeTimer = window.setTimeout(() => setTransformHasPlayed(true), TRANSFORM_COMPLETE_MS);

    return () => {
      window.clearTimeout(transformTimer);
      window.clearTimeout(flashTimer);
      window.clearTimeout(flashOffTimer);
      window.clearTimeout(completeTimer);
    };
  }, [prefersReducedMotion, stage]);

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

  const goNext = useCallback(() => {
    setIdleLineIndex(null);
    if (isAutoAdvanceLineStage && !isCurrentLineTextComplete) return;
    if (isTransformAdvanceLocked) return;
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
    nextStage,
    onComplete,
    onStageChange,
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

  function goPrevious() {
    setIdleLineIndex(null);
    if (lineIndex > 0) {
      setLineIndex((current) => current - 1);
      return;
    }
    if (previousStage) onStageChange(previousStage);
  }

  return (
    <section className={`${styles.entryStoryScene} ${entryStorySceneUi}`} data-entry-stage={scene.stage} aria-labelledby="teaHouseEntryTitle" style={sceneStyle}>
      <span className={styles.entryStoryBackground} aria-hidden />
      <span className={styles.entryStoryOverlay} aria-hidden />
      <span className={styles.entryStoryMoonGlow} aria-hidden />
      <span className={styles.entryStoryTeaGlow} aria-hidden />
      <EntryActor
        actor={scene.actor}
        pigFrameIndex={pigFrameIndex}
        isTransformed={isTransformed}
        showTransformFlash={showTransformFlash}
        transformHasPlayed={transformHasPlayed}
        usePigFallback={usePigFallback}
        onPigError={() => setUsePigFallback(true)}
      />
      <div className={`${styles.entryStoryPanel} ${entryStoryPanelUi}`}>
        <p className={styles.sceneEyebrow}>{scene.eyebrow}</p>
        <h2 id="teaHouseEntryTitle">{scene.title}</h2>
        <TeaHouseDialogueBox
          speaker={currentLine.speaker}
          text={currentLine.text}
          className={`${styles.entryDialogueBox} ${entryDialogueUi} ${isShowingIdleLine ? styles.entryIdleDialogueBox : ""}`}
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
              <TeaHouseButton variant="ghost" onClick={goPrevious} aria-label={copy.prevAria}>
                {copy.prevLabel}
              </TeaHouseButton>
            ) : null}
            {showSkip ? (
              <TeaHouseButton
                variant="secondary"
                onClick={() => {
                  setIdleLineIndex(null);
                  onStageChange("teaIntro");
                }}
                aria-label={copy.skipAria}
              >
                {copy.skipLabel}
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
    </section>
  );
}

type EntryActorProps = {
  actor: TeaHouseEntryActor;
  pigFrameIndex: number;
  isTransformed: boolean;
  showTransformFlash: boolean;
  transformHasPlayed: boolean;
  usePigFallback: boolean;
  onPigError: () => void;
};

function EntryActor({
  actor,
  pigFrameIndex,
  isTransformed,
  showTransformFlash,
  transformHasPlayed,
  usePigFallback,
  onPigError,
}: EntryActorProps) {
  const copy = useTeaHouseCopy("entryScene", KO);
  const pigFrame = pigFrames[pigFrameIndex] || pigFrames[0];

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
            alt={copy.pigAlt}
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
        data-transformed={isTransformed ? "true" : "false"}
      >
        <span className={styles.entryTransformBurst} aria-hidden />
        <span className={styles.entryTransformTeaCup} aria-hidden />
        <span className={styles.entryTransformLotusMist} aria-hidden />
        <span className={styles.entryTransformRing} aria-hidden />
        <span className={styles.entryTransformPetals} aria-hidden />
        <span className={`${styles.entryTransformFrame} relative`}>
          {!transformHasPlayed ? (
            <picture
              className={`${styles.entryTransformPicture} absolute inset-0 transition-all duration-1000 ease-in-out will-change-transform ${
                isTransformed ? "pointer-events-none opacity-0 scale-110 blur-sm" : "opacity-100 scale-100 blur-0"
              }`}
            >
              <source srcSet={fortuneTeaHouseAssets.cutout.flowerPig} type="image/webp" />
              <img
                className="absolute inset-0 h-full w-full object-contain object-bottom"
                src={fortuneTeaHouseAssets.fallback.flowerPig}
                alt={copy.pigBeforeAlt}
                loading="eager"
                decoding="async"
              />
            </picture>
          ) : null}
          <picture
            className={`${styles.entryTransformPicture} absolute inset-0 transition-all duration-1000 ease-in-out will-change-transform ${
              isTransformed ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-90 blur-sm"
            }`}
          >
            <source srcSet={fortuneTeaHouseAssets.yeoni.bust} type="image/webp" />
            <img
              className="absolute inset-0 h-full w-full object-contain object-bottom"
              src={fortuneTeaHouseAssets.fallback.yeoniBust}
              alt={copy.yeoniRevealAlt}
              loading="eager"
              decoding="async"
            />
          </picture>
          <span
            className={`${styles.entryTransformFlash} absolute inset-0 bg-white/20 transition-opacity duration-200 ease-out ${
              showTransformFlash ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden
          />
        </span>
      </div>
    );
  }

  if (actor === "yeoni") {
    return (
      <div className={styles.entryActor} data-actor="yeoni">
        <span className={styles.entryYeoniDescent} role="img" aria-label={copy.yeoniDescentAria}>
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
      <span className={styles.entryTeaYeoniPortrait} role="img" aria-label={copy.yeoniTeaAria}>
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
