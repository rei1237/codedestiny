"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { fortuneTeaHouseAssets, talkingPigYeoniFrameCrops } from "../data/assets";
import {
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

const teaIntroYeoniCupFrame = {
  x: 444,
  y: 444,
  width: 443,
  height: 443,
  sheetWidth: 1774,
  sheetHeight: 887,
  left: "-100.23%",
  top: "-100.23%",
  sheetWidthPercent: "400.45%",
  sheetHeightPercent: "200.23%",
} as const;

export default function TeaHouseEntryScene({ stage, onStageChange, onComplete }: TeaHouseEntrySceneProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const scene = getTeaHouseEntryScene(stage);
  const [lineIndex, setLineIndex] = useState(0);
  const [pigFrameIndex, setPigFrameIndex] = useState(0);
  const [usePigFallback, setUsePigFallback] = useState(false);
  const [useTransformFallback, setUseTransformFallback] = useState(false);
  const [useTeaCupsFallback, setUseTeaCupsFallback] = useState(false);
  const [transformFrameIndex, setTransformFrameIndex] = useState(transformFrames.length - 1);
  const currentLine = scene.lines[lineIndex] || scene.lines[0]!;
  const isLastLine = lineIndex >= scene.lines.length - 1;
  const previousStage = getPreviousTeaHouseEntryStage(scene.stage);
  const nextStage = getNextTeaHouseEntryStage(scene.stage);
  const showSkip = scene.stage !== "teaIntro";
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
    setLineIndex(0);
    setPigFrameIndex(0);
    setTransformFrameIndex(transformFrames.length - 1);
    setUsePigFallback(false);
    setUseTransformFallback(false);
    setUseTeaCupsFallback(false);
  }, [prefersReducedMotion, stage]);

  useEffect(() => {
    if (prefersReducedMotion || (scene.actor !== "pig" && scene.actor !== "tea")) return;
    const timer = window.setInterval(() => {
      setPigFrameIndex((current) => (current + 1) % pigFrames.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, scene.actor]);

  function goNext() {
    if (!isLastLine) {
      setLineIndex((current) => current + 1);
      return;
    }
    if (nextStage) {
      onStageChange(nextStage);
      return;
    }
    onComplete();
  }

  function goPrevious() {
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
        transformFrameIndex={transformFrameIndex}
        usePigFallback={usePigFallback}
        useTransformFallback={useTransformFallback}
        useTeaCupsFallback={useTeaCupsFallback}
        onPigError={() => setUsePigFallback(true)}
        onTransformError={() => setUseTransformFallback(true)}
        onTeaCupsError={() => setUseTeaCupsFallback(true)}
      />
      <div className={styles.entryStoryPanel}>
        <p className={styles.sceneEyebrow}>{scene.eyebrow}</p>
        <h2 id="teaHouseEntryTitle">{scene.title}</h2>
        <TeaHouseDialogueBox speaker={currentLine.speaker} text={currentLine.text} className={styles.entryDialogueBox} />
        <div className={styles.entryStoryControls}>
          <span className={styles.storyProgress}>
            {lineIndex + 1} / {scene.lines.length}
          </span>
          <div className={styles.entryStoryButtons}>
            <TeaHouseButton variant="ghost" onClick={goPrevious} disabled={!previousStage && lineIndex === 0} aria-label="이전 장면으로 돌아가기">
              이전
            </TeaHouseButton>
            {showSkip ? (
              <TeaHouseButton variant="secondary" onClick={() => onStageChange("teaIntro")} aria-label="찻잔 안내 장면으로 건너뛰기">
                건너뛰기
              </TeaHouseButton>
            ) : null}
            <TeaHouseButton onClick={goNext}>{currentLine.cta || (nextStage ? "다음" : "찻잔 고르러 가기")}</TeaHouseButton>
          </div>
        </div>
      </div>
    </section>
  );
}

type EntryActorProps = {
  actor: TeaHouseEntryActor;
  pigFrameIndex: number;
  transformFrameIndex: number;
  usePigFallback: boolean;
  useTransformFallback: boolean;
  useTeaCupsFallback: boolean;
  onPigError: () => void;
  onTransformError: () => void;
  onTeaCupsError: () => void;
};

function EntryActor({
  actor,
  pigFrameIndex,
  transformFrameIndex,
  usePigFallback,
  useTransformFallback,
  useTeaCupsFallback,
  onPigError,
  onTransformError,
  onTeaCupsError,
}: EntryActorProps) {
  const pigFrame = pigFrames[pigFrameIndex] || pigFrames[0];
  const transformFrame = transformFrames[transformFrameIndex] || transformFrames[0];

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
      <div className={styles.entryActor} data-actor="transform">
        <span className={styles.entryTransformBurst} aria-hidden />
        {!useTransformFallback ? (
          <video
            className={styles.entryTransformVideo}
            src={fortuneTeaHouseAssets.videos.pigTransform}
            aria-label="꽃돼지?가 연이로 변신하는 달빛 컷신"
            autoPlay
            muted
            playsInline
            preload="auto"
            onError={onTransformError}
          />
        ) : (
          <span
            className={styles.entryTransformFrame}
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
        )}
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
      <span
        className={styles.entryTeaYeoniActor}
        style={
          {
            "--entry-tea-yeoni-x": `${teaIntroYeoniCupFrame.x}px`,
            "--entry-tea-yeoni-y": `${teaIntroYeoniCupFrame.y}px`,
            "--entry-tea-yeoni-width": `${teaIntroYeoniCupFrame.width}px`,
            "--entry-tea-yeoni-height": `${teaIntroYeoniCupFrame.height}px`,
            "--entry-tea-yeoni-sheet-width": `${teaIntroYeoniCupFrame.sheetWidth}px`,
            "--entry-tea-yeoni-sheet-height": `${teaIntroYeoniCupFrame.sheetHeight}px`,
            "--entry-tea-yeoni-aspect-width": teaIntroYeoniCupFrame.width,
            "--entry-tea-yeoni-aspect-height": teaIntroYeoniCupFrame.height,
            "--entry-tea-yeoni-left": teaIntroYeoniCupFrame.left,
            "--entry-tea-yeoni-top": teaIntroYeoniCupFrame.top,
            "--entry-tea-yeoni-sheet-width-percent": teaIntroYeoniCupFrame.sheetWidthPercent,
            "--entry-tea-yeoni-sheet-height-percent": teaIntroYeoniCupFrame.sheetHeightPercent,
          } as CSSProperties
        }
      >
        <Image
          className={styles.entryTeaYeoniSpriteSheet}
          src={fortuneTeaHouseAssets.yeoni.transparent.cupPoseSheet}
          alt="찻잔을 내미는 연이"
          fill
          sizes="(max-width: 640px) 74vw, 34vw"
          priority
          unoptimized
        />
      </span>
      <span className={styles.entryTeaCupPreview}>
        <Image
          className={styles.entryTeaCupImage}
          src={useTeaCupsFallback ? fortuneTeaHouseAssets.fallback.teaCups : fortuneTeaHouseAssets.cutout.teaCups}
          alt="달빛 아래 놓인 여섯 개의 찻잔"
          fill
          sizes="(max-width: 640px) 90vw, 42vw"
          priority
          unoptimized
          onError={onTeaCupsError}
        />
      </span>
    </div>
  );
}
