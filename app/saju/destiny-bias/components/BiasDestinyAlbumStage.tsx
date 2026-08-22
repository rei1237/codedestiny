"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "../destiny-bias.module.css";
import {
  DESTINY_BIAS_ALBUM_SIZE,
  DESTINY_BIAS_FALLBACK_ALBUM_SRC,
  DESTINY_BIAS_STAGE_ALBUM,
} from "../lib/destinyBiasAlbumAssets";
import { useDestinyBiasCopy } from "../_lib/copy";

interface BiasDestinyAlbumStageProps {
  children?: React.ReactNode;
}

export default function BiasDestinyAlbumStage({ children }: BiasDestinyAlbumStageProps) {
  const copy = useDestinyBiasCopy();
  const [albumSrc, setAlbumSrc] = useState(DESTINY_BIAS_STAGE_ALBUM.src);

  return (
    <div className={`${styles.stageDeck} p-4 md:p-5`}>
      <div className={styles.spotCone} aria-hidden />
      <div className={styles.spotHaze} aria-hidden />
      <div className={styles.stageFloorLine} aria-hidden />

      <div className="relative z-10">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-[var(--bias-gold)]/85">
          {DESTINY_BIAS_STAGE_ALBUM.caption}
        </p>

        <div className={`${styles.albumTiltable} mx-auto mt-3 w-full max-w-[248px]`}>
          <div className={styles.albumFrame}>
            <Image
              src={albumSrc}
              alt={`${DESTINY_BIAS_STAGE_ALBUM.title} ${copy.albumCoverAltSuffix}`}
              width={DESTINY_BIAS_ALBUM_SIZE}
              height={DESTINY_BIAS_ALBUM_SIZE}
              priority
              onError={() => setAlbumSrc(DESTINY_BIAS_FALLBACK_ALBUM_SRC)}
              className="h-auto w-full"
            />
            <span className={styles.albumSheen} aria-hidden />
          </div>

          <div className={styles.albumReflect} aria-hidden>
            <Image
              src={albumSrc}
              alt=""
              width={DESTINY_BIAS_ALBUM_SIZE}
              height={DESTINY_BIAS_ALBUM_SIZE}
              aria-hidden
              className="h-auto w-full"
            />
          </div>
        </div>

        <p className="mt-1 text-center text-xs font-semibold text-white/80">
          {DESTINY_BIAS_STAGE_ALBUM.title}
        </p>

        {children ? <div className={`${styles.albumPlinth} mt-4 p-3.5`}>{children}</div> : null}
      </div>
    </div>
  );
}
