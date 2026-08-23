"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import { talkingPigYeoniFrameCrops, talkingPigYeoniFrames } from "../data/assets";
import { pigMoodFrameMap, type PigExpressionId, type YeoniMood } from "../data/yeoniSprites";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type NetworkNavigator = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
  mozConnection?: { saveData?: boolean; effectiveType?: string };
  webkitConnection?: { saveData?: boolean; effectiveType?: string };
  deviceMemory?: number;
};

const pigExpressionFrames = {
  welcome: talkingPigYeoniFrameCrops.welcome,
  honey: talkingPigYeoniFrameCrops.honey,
  thinking: talkingPigYeoniFrameCrops.thinking,
  comfort: talkingPigYeoniFrameCrops.comfort,
  surprised: talkingPigYeoniFrameCrops.surprised,
  doorway: talkingPigYeoniFrameCrops.doorway,
} as const;

type TalkingPigYeoniProps = {
  isSpeaking?: boolean;
  mood?: YeoniMood;
  /** mood 로는 모자라는 한 줄만 작가가 프레임을 직접 지정한다(예: 문을 여는 장면). */
  frame?: PigExpressionId;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    🔴 아래 pickPigExpressionFrame 의 한국어 정규식은 여기서 건드리지 않는다 — 그건 화면 문구가
    아니라 **대사 데이터**에 걸리는 판정이고, 데이터가 로케일화되면 그때 mood 를 명시로 바꿔야 한다. */
const KO = {
  pigAria: "문 앞에서 말을 건네는 꽃돼지?",
  pigName: "꽃돼지?",
};

export default function TalkingPigYeoni({ isSpeaking = true, mood, frame }: TalkingPigYeoniProps) {
  const copy = useTeaHouseCopy("talkingPig", KO);
  const spriteGate = useSpritePlaybackGate<HTMLDivElement>();
  const [failed, setFailed] = useState(false);
  const [shouldWarmFrames, setShouldWarmFrames] = useState(false);
  const activeFrame = useMemo(() => pickPigExpressionFrame(mood, isSpeaking, frame), [frame, isSpeaking, mood]);
  const warmFrames = useMemo(() => talkingPigYeoniFrames.filter((frame) => frame !== activeFrame.src), [activeFrame.src]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!spriteGate.canAnimate || spriteGate.isMobile) {
      setShouldWarmFrames(false);
      return undefined;
    }

    const nav = window.navigator as NetworkNavigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    const memory = Number(nav.deviceMemory || 0);
    const cores = Number(nav.hardwareConcurrency || 0);
    const effectiveType = String(connection?.effectiveType || "").toLowerCase();
    if (connection?.saveData || (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4) || effectiveType === "2g" || effectiveType === "slow-2g") return;

    let idleId: number | null = null;
    const idleWindow = window as IdleWindow;
    const timerId = window.setTimeout(() => {
      idleId = idleWindow.requestIdleCallback?.(() => setShouldWarmFrames(true), { timeout: 1800 }) ?? null;
      if (idleId === null) setShouldWarmFrames(true);
    }, 2400);

    return () => {
      window.clearTimeout(timerId);
      if (idleId !== null) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, [spriteGate.canAnimate, spriteGate.isMobile]);

  return (
    <div ref={spriteGate.ref} className={styles.talkingPig} data-expression={activeFrame.label} data-speaking={isSpeaking ? "true" : "false"}>
      <span className={styles.pigGlow} aria-hidden />
      <span
        className={`${styles.pigImage} ${styles.pigSpriteFrame}`}
        data-failed={failed ? "true" : "false"}
        style={
          {
            "--pig-sprite-x": `${activeFrame.x}px`,
            "--pig-sprite-y": `${activeFrame.y}px`,
            "--pig-sprite-width": `${activeFrame.width}px`,
            "--pig-sprite-height": `${activeFrame.height}px`,
            "--pig-sprite-aspect-width": activeFrame.width,
            "--pig-sprite-aspect-height": activeFrame.height,
            "--pig-sprite-sheet-width": `${activeFrame.sheetWidth}px`,
            "--pig-sprite-sheet-height": `${activeFrame.sheetHeight}px`,
          } as CSSProperties
        }
      >
        {!failed ? (
          <img
            className={styles.pigSpriteSheet}
            src={activeFrame.src}
            alt={activeFrame.label}
            decoding="async"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className={styles.pigSpriteFallback} role="img" aria-label={copy.pigAria}>
            {copy.pigName}
          </span>
        )}
      </span>
      <span className={styles.pigNamePlate}>{copy.pigName}</span>
      <span className={styles.pigScentTrail} aria-hidden />
      <div className={styles.preloadFrames} aria-hidden>
        {shouldWarmFrames ? warmFrames.map((frame) => (
          <img key={frame} src={frame} alt="" decoding="async" loading="lazy" />
        )) : null}
      </div>
    </div>
  );
}

/**
 * 표정은 데이터가 정한 mood 로만 결정한다.
 *
 * 🔴 예전에는 mood 가 없으면 대사의 한국어 키워드로 폴백했다(꿀 이야기면 honey 처럼).
 * 표정은 연출 의도인데 그것을 문장에서 되추측한 것이고, 대사가 로케일화되면 어떤
 * 키워드도 안 걸려 전부 welcome 으로 주저앉는다.
 *
 * 우선순위: frame 오버라이드 → mood → (말하지 않는 중이면) welcome.
 * mood 는 판별 유니언 타입이 대사 줄에 강제하고, 정적 가드가 재발을 막는다.
 */
function pickPigExpressionFrame(mood: YeoniMood | undefined, isSpeaking: boolean, frame?: PigExpressionId) {
  if (!isSpeaking) return pigExpressionFrames.welcome;
  if (frame) return pigExpressionFrames[frame];
  if (mood) return pigExpressionFrames[pigMoodFrameMap[mood]];
  return pigExpressionFrames.welcome;
}
