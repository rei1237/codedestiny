"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { talkingPigYeoniFrameCrops, talkingPigYeoniFrames } from "../data/assets";
import type { YeoniMood } from "../data/yeoniSprites";
import styles from "../styles/fortune-tea-house.module.css";

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

export default function TalkingPigYeoni({ cueText = "", isSpeaking = true, mood }: TalkingPigYeoniProps) {
  const [failed, setFailed] = useState(false);
  const activeFrame = useMemo(() => pickPigExpressionFrame(cueText, mood, isSpeaking), [cueText, isSpeaking, mood]);

  return (
    <div className={styles.talkingPig} data-expression={activeFrame.label} data-speaking={isSpeaking ? "true" : "false"}>
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
            loading="eager"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className={styles.pigSpriteFallback} role="img" aria-label="문 앞에서 말을 건네는 꽃돼지?">
            꽃돼지?
          </span>
        )}
      </span>
      <span className={styles.pigNamePlate}>꽃돼지?</span>
      <span className={styles.pigScentTrail} aria-hidden />
      <div className={styles.preloadFrames} aria-hidden>
        {talkingPigYeoniFrames.map((frame) => (
          <img key={frame} src={frame} alt="" decoding="async" loading="eager" />
        ))}
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
