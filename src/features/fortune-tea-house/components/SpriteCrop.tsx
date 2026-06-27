"use client";

/* eslint-disable @next/next/no-img-element */

import { type CSSProperties, useState } from "react";
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
};

export default function SpriteCrop({ src, sheetWidth, sheetHeight, x, y, width, height, alt, className = "" }: SpriteCropProps) {
  const [failed, setFailed] = useState(false);

  const style = {
    "--sprite-ratio": `${width} / ${height}`,
    "--sprite-img-width": `${(sheetWidth / width) * 100}%`,
    "--sprite-img-height": `${(sheetHeight / height) * 100}%`,
    "--sprite-img-left": `-${(x / width) * 100}%`,
    "--sprite-img-top": `-${(y / height) * 100}%`,
  } as CSSProperties;

  return (
    <span className={`${styles.spriteCrop} ${className}`} style={style} data-failed={failed ? "true" : "false"}>
      {!failed ? <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} /> : null}
      {failed ? <span className={styles.spriteCropFallback}>{alt}</span> : null}
    </span>
  );
}
