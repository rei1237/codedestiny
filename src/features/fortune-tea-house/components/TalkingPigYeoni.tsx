"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import { talkingPigYeoniFrameCrops, talkingPigYeoniFrames } from "../data/assets";
import type { YeoniMood } from "../data/yeoniSprites";
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
  cueText?: string;
  isSpeaking?: boolean;
  mood?: YeoniMood;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    🔴 아래 pickPigExpressionFrame 의 한국어 정규식은 여기서 건드리지 않는다 — 그건 화면 문구가
    아니라 **대사 데이터**에 걸리는 판정이고, 데이터가 로케일화되면 그때 mood 를 명시로 바꿔야 한다. */
const KO = {
  pigAria: "문 앞에서 말을 건네는 꽃돼지?",
  pigName: "꽃돼지?",
};

export default function TalkingPigYeoni({ cueText = "", isSpeaking = true, mood }: TalkingPigYeoniProps) {
  const copy = useTeaHouseCopy("talkingPig", KO);
  const spriteGate = useSpritePlaybackGate<HTMLDivElement>();
  const [failed, setFailed] = useState(false);
  const [shouldWarmFrames, setShouldWarmFrames] = useState(false);
  const activeFrame = useMemo(() => pickPigExpressionFrame(cueText, mood, isSpeaking), [cueText, isSpeaking, mood]);
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

function pickPigExpressionFrame(cueText: string, mood?: YeoniMood, isSpeaking = true) {
  const text = cueText.replace(/\s+/g, " ");
  if (!isSpeaking) return pigExpressionFrames.welcome;
  if (mood === "playful" || /꿀|달고/.test(text)) return pigExpressionFrames.honey;
  if (mood === "comfort" || /괜찮|안심|덜 아프|기다/.test(text)) return pigExpressionFrames.comfort;
  if (mood === "thinking" || /향|마음|질문|선택|망설/.test(text)) return pigExpressionFrames.thinking;
  if (mood === "surprised" || /놀랐|처음/.test(text)) return pigExpressionFrames.surprised;
  if (/문|종소리|딸랑|열/.test(text)) return pigExpressionFrames.doorway;
  return pigExpressionFrames.welcome;
}
