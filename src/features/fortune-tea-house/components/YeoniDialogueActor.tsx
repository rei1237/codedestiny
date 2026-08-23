"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import { fortuneTeaHouseAssets } from "../data/assets";
import {
  getYeoniSpriteFrame,
  yeoniMoodFrameMap,
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
};

export default function YeoniDialogueActor({
  mood,
  isSpeaking,
  className = "",
  compact = false,
  priority = false,
}: YeoniDialogueActorProps) {
  const spriteGate = useSpritePlaybackGate<HTMLDivElement>();
  const [failedSheets, setFailedSheets] = useState<Record<string, boolean>>({});
  const visual = useMemo(() => pickYeoniExpression(mood, isSpeaking), [isSpeaking, mood]);
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

/**
 * 표정은 데이터가 정한 mood 로만 결정한다.
 *
 * 🔴 예전에는 대사에 한국어 키워드가 있는지로 골랐다(위로·안심 계열이면 comfort 처럼).
 * 두 가지가 잘못이었다. 첫째, 표정은 연출 의도인데 그것을 문장에서 되추측했다.
 * 둘째, mood 를 필수 인자로 받고도 한 분기에서만 참조하고 사실상 버렸다 —
 * 대사가 로케일화되면 어떤 키워드도 안 걸려 전부 bust 로 주저앉는다.
 *
 * yeoniMoodFrameMap 은 이 목적으로 이미 만들어져 있었는데 아무도 쓰지 않았다.
 */
function pickYeoniExpression(mood: YeoniMood, isSpeaking: boolean): YeoniActorVisual {
  if (!isSpeaking) return { kind: "bust" };
  // 프레임 순환이 없는 화면이라, 말하는 자세의 대표 프레임 하나를 결정론적으로 고른다.
  return { kind: "sprite", frameId: yeoniMoodFrameMap[mood].speaking[0] };
}
