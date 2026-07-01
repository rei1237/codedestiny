"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import { fortuneTeaHouseAssets } from "../data/assets";
import {
  getYeoniSpriteFrame,
  yeoniSpriteSheets,
  type YeoniMood,
  type YeoniSpriteFrameId,
} from "../data/yeoniSprites";
import styles from "../styles/fortune-tea-house.module.css";

type YeoniDialogueActorProps = {
  mood: YeoniMood;
  isSpeaking: boolean;
  className?: string;
  compact?: boolean;
  priority?: boolean;
  cueText?: string;
};

export default function YeoniDialogueActor({
  mood,
  isSpeaking,
  className = "",
  compact = false,
  priority = false,
  cueText = "",
}: YeoniDialogueActorProps) {
  const spriteGate = useSpritePlaybackGate<HTMLDivElement>();
  const [failedSheets, setFailedSheets] = useState<Record<string, boolean>>({});
  const visual = useMemo(() => pickYeoniExpression(cueText, mood, isSpeaking), [cueText, isSpeaking, mood]);
  const activeFrame = visual.kind === "sprite" ? getYeoniSpriteFrame(visual.frameId) : null;
  const activeSheet = activeFrame ? yeoniSpriteSheets[activeFrame.sheet] : null;
  const hasFailed = activeFrame ? failedSheets[activeFrame.sheet] : false;
  const activeVisualKind = visual.kind === "sprite" && !hasFailed && !spriteGate.prefersReducedMotion ? "sprite" : "bust";
  const shouldLoadSpriteSheet = activeVisualKind === "sprite" && spriteGate.canLoad;
  const frameStyle = {
    "--yeoni-sprite-columns": activeSheet?.columns || 1,
    "--yeoni-sprite-rows": activeSheet?.rows || 1,
    "--yeoni-sprite-col": activeFrame?.col || 0,
    "--yeoni-sprite-row": activeFrame?.row || 0,
    "--yeoni-frame-aspect": activeSheet?.aspectRatio || "4 / 5",
  } as CSSProperties;

  return (
    <div
      ref={spriteGate.ref}
      className={`${styles.yeoniActor} ${className}`}
      data-mood={mood}
      data-speaking={activeVisualKind === "sprite" ? "true" : "false"}
      data-compact={compact ? "true" : "false"}
    >
      <span className={styles.yeoniAura} aria-hidden />
      <span className={styles.yeoniActorLotus} aria-hidden />
      <span
        className={styles.yeoniSpriteFrame}
        data-failed={hasFailed ? "true" : "false"}
        data-visual={activeVisualKind}
        style={frameStyle}
      >
        <img
          className={styles.yeoniBustImage}
          src={fortuneTeaHouseAssets.yeoni.transparent.bust}
          alt="달빛 찻집 상담사"
          decoding="async"
          loading={priority ? "eager" : "lazy"}
        />
        {activeFrame && activeSheet && shouldLoadSpriteSheet ? (
          <img
            className={styles.yeoniSpriteSheet}
            src={activeSheet.src}
            alt=""
            aria-hidden
            decoding="async"
            loading="lazy"
            onError={() => setFailedSheets((current) => ({ ...current, [activeFrame.sheet]: true }))}
          />
        ) : null}
        {hasFailed ? (
          <span className={styles.yeoniSpriteFallback} role="img" aria-label="달빛 찻집 상담사">
            <span aria-hidden>月</span>
          </span>
        ) : null}
      </span>
      <span className={styles.yeoniActorScent} aria-hidden />
    </div>
  );
}

type YeoniActorVisual = { kind: "bust" } | { kind: "sprite"; frameId: YeoniSpriteFrameId };

function pickYeoniExpression(cueText: string, mood: YeoniMood, isSpeaking: boolean): YeoniActorVisual {
  const text = cueText.replace(/\s+/g, " ");
  if (!isSpeaking || text.length < 1) return { kind: "bust" };
  if (/마무리|다음 한 걸음|한 걸음|오늘은 여기|닫기|정리해/.test(text)) return { kind: "sprite", frameId: "closing-idle" };
  if (/금전|돈|현실|사업|진로|위기|이별|정리|역방향|정방향|단정|두려움/.test(text)) {
    return { kind: "sprite", frameId: "serious-idle" };
  }
  if (/괜찮|안심|위로|회복|자존감|덜 아프|기다려|기다릴|천천히|다독/.test(text)) {
    return { kind: "sprite", frameId: "comfort-idle" };
  }
  if (/꿀|설렘|복숭아|새로운|처음|살짝|웃|못 들은/.test(text)) return { kind: "sprite", frameId: "playful-idle" };
  if (/놀라|문득|아,|작게/.test(text)) return { kind: "sprite", frameId: "surprised-talk" };
  if (/질문|고민|마음|향|결|읽|선택|카드|방향|찻잔|말 속|흐름|비추/.test(text)) {
    return { kind: "sprite", frameId: mood === "serious" ? "serious-idle" : "thinking-talk" };
  }
  if (/어서|맞이|환영|문이|들어|찻집|달빛/.test(text)) return { kind: "sprite", frameId: "welcome-idle" };
  return { kind: "bust" };
}
