"use client";
/**
 * 꽃돼지(연이 변신형) 단일 표정 — 스프라이트 시트에서 한 프레임만 CSS 크롭.
 * 자산이 다중 프레임 시트라 통짜로 렌더하면 격자로 보인다. 기존 tea-house 정본
 * talkingPigYeoniFrameCrops(정확한 크롭 좌표)를 재사용해 한 표정만 잘라 보여준다.
 */
import { talkingPigYeoniFrameCrops } from "../data/assets";
import { useDestinyCompassCopy } from "../_lib/copy";

type PigExpr = "neutral" | "happy" | "talk" | "think" | "surprise";
type CropKey = keyof typeof talkingPigYeoniFrameCrops;

const EXPR_TO_CROP: Record<PigExpr, CropKey> = {
  neutral: "comfort",
  happy: "honey",
  talk: "welcome",
  think: "thinking",
  surprise: "surprised",
};

interface PigFaceProps {
  expression?: PigExpr;
  height?: number;
  className?: string;
}

export function PigFace({ expression = "talk", height = 96, className }: PigFaceProps) {
  const copy = useDestinyCompassCopy();
  const c = talkingPigYeoniFrameCrops[EXPR_TO_CROP[expression] || "welcome"];
  const scale = height / c.height;
  return (
    <div
      className={className}
      role="img"
      aria-label={copy.pigFaceAlt}
      style={{
        width: Math.round(c.width * scale),
        height,
        flex: "none",
        backgroundImage: `url("${c.src}")`,
        backgroundSize: `${Math.round(c.sheetWidth * scale)}px ${Math.round(c.sheetHeight * scale)}px`,
        backgroundPosition: `-${Math.round(c.x * scale)}px -${Math.round(c.y * scale)}px`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
