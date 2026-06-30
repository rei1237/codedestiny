"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Image from "next/image";
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
          src={activeSrc}
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
