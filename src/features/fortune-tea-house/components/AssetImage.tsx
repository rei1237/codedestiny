"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "../styles/fortune-tea-house.module.css";

type AssetImageProps = {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export default function AssetImage({ src, alt, fallbackSrc = "", className = "", imageClassName = "", priority = false }: AssetImageProps) {
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const useFallback = failed && !!fallbackSrc && !fallbackFailed;
  const hasFailedCompletely = failed && (!fallbackSrc || fallbackFailed);
  const activeSrc = useFallback ? fallbackSrc : src;

  useEffect(() => {
    setFailed(false);
    setFallbackFailed(false);
    setLoaded(false);
  }, [src, fallbackSrc]);

  return (
    <span
      className={`${styles.assetImage} ${className}`}
      data-failed={hasFailedCompletely ? "true" : "false"}
      data-loaded={loaded ? "true" : "false"}
    >
      {!hasFailedCompletely && activeSrc ? (
        <Image
          className={`${styles.assetImageImg} ${imageClassName}`}
          src={activeSrc}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          priority={priority}
          unoptimized
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            if (!failed && fallbackSrc) {
              setFailed(true);
              return;
            }
            setFallbackFailed(true);
            setFailed(true);
          }}
        />
      ) : null}
      {hasFailedCompletely || !loaded ? (
        <span className={styles.assetImageFallback} role={alt ? "img" : undefined} aria-label={alt || undefined}>
          {alt ? <span>{alt}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
