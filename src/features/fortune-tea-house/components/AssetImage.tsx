"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "../styles/fortune-tea-house.module.css";

type AssetImageProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export default function AssetImage({ src, alt, className = "", imageClassName = "", priority = false }: AssetImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={`${styles.assetImage} ${className}`} data-failed={failed ? "true" : "false"} data-loaded={loaded ? "true" : "false"}>
      {!failed ? (
        <Image
          className={`${styles.assetImageImg} ${imageClassName}`}
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          priority={priority}
          unoptimized
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
      {failed || !loaded ? (
        <span className={styles.assetImageFallback} role={alt ? "img" : undefined} aria-label={alt || undefined}>
          {alt ? <span>{alt}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
