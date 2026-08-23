"use client";

/* eslint-disable @next/next/no-img-element */

import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

export type SpriteCropMobileCrop = {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SpriteCropProps = {
  src: string;
  sheetWidth: number;
  sheetHeight: number;
  mobileSrc?: string;
  mobileSheetWidth?: number;
  mobileSheetHeight?: number;
  mobileCrop?: SpriteCropMobileCrop;
  x: number;
  y: number;
  width: number;
  height: number;
  alt: string;
  className?: string;
  fallback?: ReactNode;
  fallbackLabel?: string;
};

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    키는 문구의 결정론적 해시라 같은 문구가 자동으로 한 키로 합쳐진다(정적 셸의 마커 도구와 같은 방식). */
const KO = {
  kb8qgueb: "이미지를 불러오지 못했어요.",
};

export default function SpriteCrop({
  src,
  sheetWidth,
  sheetHeight,
  mobileSrc,
  mobileSheetWidth,
  mobileSheetHeight,
  mobileCrop,
  x,
  y,
  width,
  height,
  alt,
  className = "",
  fallback,
  fallbackLabel,
}: SpriteCropProps) {
  const copy = useTeaHouseCopy("spriteCrop", KO);
  const spriteGate = useSpritePlaybackGate<HTMLSpanElement>();
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const fallbackMobileCrop = useMemo(() => {
    if (!mobileSrc || !mobileSheetWidth || !mobileSheetHeight) return null;
    const scaleX = sheetWidth > 0 ? mobileSheetWidth / sheetWidth : 1;
    const scaleY = sheetHeight > 0 ? mobileSheetHeight / sheetHeight : 1;
    return {
      src: mobileSrc,
      sheetWidth: mobileSheetWidth,
      sheetHeight: mobileSheetHeight,
      x: x * scaleX,
      y: y * scaleY,
      width: width * scaleX,
      height: height * scaleY,
    };
  }, [height, mobileSheetHeight, mobileSheetWidth, mobileSrc, sheetHeight, sheetWidth, width, x, y]);
  const activeMobileCrop = mobileCrop || fallbackMobileCrop;
  const shouldUseMobileSheet = spriteGate.isMobile && Boolean(activeMobileCrop);
  const resolvedSrc = shouldUseMobileSheet ? activeMobileCrop?.src || src : src;
  const resolvedSheetWidth = shouldUseMobileSheet ? activeMobileCrop?.sheetWidth || sheetWidth : sheetWidth;
  const resolvedSheetHeight = shouldUseMobileSheet ? activeMobileCrop?.sheetHeight || sheetHeight : sheetHeight;
  const resolvedX = shouldUseMobileSheet ? activeMobileCrop?.x || 0 : x;
  const resolvedY = shouldUseMobileSheet ? activeMobileCrop?.y || 0 : y;
  const resolvedWidth = shouldUseMobileSheet ? activeMobileCrop?.width || width : width;
  const resolvedHeight = shouldUseMobileSheet ? activeMobileCrop?.height || height : height;
  const hasValidCrop = [resolvedSheetWidth, resolvedSheetHeight, resolvedX, resolvedY, resolvedWidth, resolvedHeight].every((value) => Number.isFinite(value)) && resolvedWidth > 0 && resolvedHeight > 0;
  const shouldShowFallback = failed || !resolvedSrc || !hasValidCrop;
  const safeWidth = resolvedWidth > 0 ? resolvedWidth : 1;
  const safeHeight = resolvedHeight > 0 ? resolvedHeight : 1;
  const shouldRenderImage = !shouldShowFallback && spriteGate.canLoad;

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setRetryCount(0);
  }, [
    height,
    mobileCrop?.height,
    mobileCrop?.sheetHeight,
    mobileCrop?.sheetWidth,
    mobileCrop?.src,
    mobileCrop?.width,
    mobileCrop?.x,
    mobileCrop?.y,
    mobileSheetHeight,
    mobileSheetWidth,
    mobileSrc,
    sheetHeight,
    sheetWidth,
    src,
    width,
    x,
    y,
  ]);

  const imageSrc = useMemo(() => {
    if (!resolvedSrc || retryCount === 0) return resolvedSrc;
    return `${resolvedSrc}${resolvedSrc.includes("?") ? "&" : "?"}retry=${retryCount}`;
  }, [retryCount, resolvedSrc]);

  const style = useMemo(() => ({
    "--sprite-ratio": `${safeWidth} / ${safeHeight}`,
    "--sprite-img-width": `${(resolvedSheetWidth / Math.max(resolvedWidth, 1)) * 100}%`,
    "--sprite-img-height": `${(resolvedSheetHeight / Math.max(resolvedHeight, 1)) * 100}%`,
    "--sprite-img-left": `-${(resolvedX / Math.max(resolvedWidth, 1)) * 100}%`,
    "--sprite-img-top": `-${(resolvedY / Math.max(resolvedHeight, 1)) * 100}%`,
  }) as CSSProperties, [resolvedHeight, resolvedSheetHeight, resolvedSheetWidth, resolvedWidth, resolvedX, resolvedY, safeHeight, safeWidth]);

  function handleImageError() {
    setLoaded(false);
    if (retryCount < 1) {
      setRetryCount((current) => current + 1);
      return;
    }
    setFailed(true);
  }

  return (
    <span ref={spriteGate.ref} className={`${styles.spriteCrop} ${className}`} style={style} data-failed={shouldShowFallback ? "true" : "false"} data-loaded={loaded ? "true" : "false"}>
      {shouldRenderImage ? <img src={imageSrc} alt={alt} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} onError={handleImageError} /> : null}
      {shouldShowFallback ? <span className={styles.spriteCropFallback}>{fallback || alt || fallbackLabel || copy.kb8qgueb}</span> : null}
    </span>
  );
}
