"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
import { buildResizedAssetUrl } from "@/lib/r2-public-url";
import type { NeoWarRoomAsset } from "../data/assets";

type NeoWarRoomAssetImageProps = {
  asset?: NeoWarRoomAsset;
  src?: string;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  style?: CSSProperties;
  /**
   * 원격 자산을 Cloudflare Image Resizing 으로 줄여 받는다. 표시 CSS 폭의 2배(레티나)를 준다.
   * 기본값 없음 = 원본 그대로라 기존 사용처 동작은 바뀌지 않는다.
   * 🔴 스프라이트 시트에는 주지 말 것 — 배경 크롭 좌표가 어긋난다.
   */
  resizeWidth?: number;
};

export default function NeoWarRoomAssetImage({
  asset,
  src,
  alt,
  fallbackSrc,
  className = "",
  imageClassName = "",
  priority = false,
  loading = "lazy",
  sizes = "(max-width: 768px) 100vw, 50vw",
  fill = true,
  width,
  height,
  style,
  resizeWidth,
}: NeoWarRoomAssetImageProps) {
  const primarySrc = src || asset?.src || "";
  const primaryAlt = alt ?? asset?.alt ?? "";
  const secondarySrc = fallbackSrc ?? asset?.fallbackSrc ?? "";
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const useFallback = failed && Boolean(secondarySrc) && !fallbackFailed;
  const activeSrc = useFallback ? secondarySrc : primarySrc;
  const hasFailedCompletely = failed && (!secondarySrc || fallbackFailed);
  const shouldShowPlaceholder = Boolean(activeSrc) && !loaded && !hasFailedCompletely;
  // 로컬 /public 경로와 code-destiny.com 밖 호스트는 헬퍼가 그대로 돌려주므로 폴백 경로도 안전하다.
  const renderedSrc = resizeWidth ? buildResizedAssetUrl(activeSrc, { width: resizeWidth }) : activeSrc;

  useEffect(() => {
    setFailed(false);
    setFallbackFailed(false);
    setLoaded(false);
  }, [primarySrc, secondarySrc]);

  return (
    <span
      className={className}
      data-neo-asset-role={asset?.role || undefined}
      data-loaded={loaded ? "true" : "false"}
      data-failed={hasFailedCompletely ? "true" : "false"}
      style={{
        display: "block",
        position: fill ? "relative" : undefined,
        overflow: "hidden",
        background: "rgba(9, 11, 19, 0.42)",
        ...style,
      }}
    >
      {!hasFailedCompletely && activeSrc ? (
        <Image
          className={imageClassName}
          src={renderedSrc}
          alt={primaryAlt}
          fill={fill}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          sizes={fill ? sizes : undefined}
          priority={priority}
          loading={priority ? undefined : loading}
          referrerPolicy="no-referrer"
          unoptimized
          onLoad={() => setLoaded(true)}
          onError={() => {
            console.warn("[NeoWarRoomAssetImage] failed to load asset", {
              objectKey: asset?.objectKey,
              src: activeSrc,
              fallbackSrc: secondarySrc || undefined,
            });
            setLoaded(false);
            if (!failed && secondarySrc) {
              setFailed(true);
              return;
            }
            setFailed(true);
            setFallbackFailed(true);
          }}
        />
      ) : null}
      {shouldShowPlaceholder ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, rgba(245, 208, 120, 0.08), rgba(255, 255, 255, 0.02), rgba(99, 102, 241, 0.08))",
          }}
        />
      ) : null}
      {hasFailedCompletely ? (
        <span
          role={primaryAlt ? "img" : undefined}
          aria-label={primaryAlt || undefined}
          style={{
            display: "grid",
            minHeight: fill ? "100%" : height || 96,
            placeItems: "center",
            padding: 12,
            color: "rgba(255, 244, 214, 0.88)",
            fontSize: 13,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {primaryAlt || "이미지를 불러오지 못했습니다."}
        </span>
      ) : null}
    </span>
  );
}
