"use client";

/* eslint-disable @next/next/no-img-element */

import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import styles from "../styles/fortune-tea-house.module.css";

type SpriteCropProps = {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  fallbackLabel?: string;
};

export default function SpriteCrop({
  src,
  sheetWidth,
  sheetHeight,
  x,
  y,
  width,
  height,
  alt,
  className = "",
  fallback,
  fallbackLabel = "이미지를 불러오지 못했어요.",
}: SpriteCropProps) {
  const [failed, setFailed] = useState(false);
  const hasValidCrop = [sheetWidth, sheetHeight, x, y, width, height].every((value) => Number.isFinite(value)) && width > 0 && height > 0;
  const shouldShowFallback = failed || !src || !hasValidCrop;
  const safeWidth = width > 0 ? width : 1;
  const safeHeight = height > 0 ? height : 1;

  useEffect(() => {
    setFailed(false);
  }, [height, sheetHeight, sheetWidth, src, width, x, y]);

  const style = useMemo(() => ({
    "--sprite-ratio": `${safeWidth} / ${safeHeight}`,
    "--sprite-img-width": `${(sheetWidth / safeWidth) * 100}%`,
    "--sprite-img-height": `${(sheetHeight / safeHeight) * 100}%`,
    "--sprite-img-left": `-${(x / safeWidth) * 100}%`,
    "--sprite-img-top": `-${(y / safeHeight) * 100}%`,
  }) as CSSProperties, [safeHeight, safeWidth, sheetHeight, sheetWidth, x, y]);

  return (
    <span className={`${styles.spriteCrop} ${className}`} style={style} data-failed={shouldShowFallback ? "true" : "false"}>
      {!shouldShowFallback ? <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} /> : null}
      {shouldShowFallback ? <span className={styles.spriteCropFallback}>{fallback || alt || fallbackLabel}</span> : null}
    </span>
  );
}
