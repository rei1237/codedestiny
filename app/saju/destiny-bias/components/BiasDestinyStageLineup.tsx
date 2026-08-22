"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "../destiny-bias.module.css";
import {
  DESTINY_BIAS_ALBUM_SIZE,
  DESTINY_BIAS_FALLBACK_ALBUM_SRC,
  DESTINY_BIAS_LINEUP_ALBUMS,
  type DestinyBiasAlbumAsset,
} from "../lib/destinyBiasAlbumAssets";
import { useDestinyBiasCopy, type DestinyBiasCopy } from "../_lib/copy";

function buildStageSteps(copy: DestinyBiasCopy) {
  return [
    { no: "01", label: copy.stageStep1Label, desc: copy.stageStep1Desc },
    { no: "02", label: copy.stageStep2Label, desc: copy.stageStep2Desc },
    { no: "03", label: copy.stageStep3Label, desc: copy.stageStep3Desc },
  ];
}

function LineupAlbum({ album, albumCoverAltSuffix }: { album: DestinyBiasAlbumAsset; albumCoverAltSuffix: string }) {
  const [src, setSrc] = useState(album.src);

  return (
    <li className={`${styles.lineupCard} w-[190px] shrink-0 snap-center p-3 sm:w-auto sm:shrink`}>
      <span className={styles.lineupBeam} aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-white/16">
        <Image
          src={src}
          alt={`${album.title} ${albumCoverAltSuffix}`}
          width={DESTINY_BIAS_ALBUM_SIZE}
          height={DESTINY_BIAS_ALBUM_SIZE}
          loading="lazy"
          sizes="(max-width: 640px) 190px, 33vw"
          onError={() => setSrc(DESTINY_BIAS_FALLBACK_ALBUM_SRC)}
          className="h-auto w-full"
        />
      </div>
      <p className="relative mt-2.5 text-[10px] font-semibold tracking-[0.18em] text-[var(--bias-gold)]/85">
        {album.caption}
      </p>
      <p className="relative mt-0.5 text-sm font-bold text-white/92">{album.title}</p>
    </li>
  );
}

export default function BiasDestinyStageLineup() {
  const copy = useDestinyBiasCopy();
  const stageSteps = buildStageSteps(copy);

  return (
    <section className="space-y-4" aria-labelledby="destiny-bias-lineup-title">
      <div className={`${styles.stageDeck} p-4 md:p-6`}>
        <div className={styles.spotHaze} aria-hidden />
        <div className={styles.stageFloorLine} aria-hidden />

        <div className="relative z-10">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[var(--bias-gold)]/85">TONIGHT&apos;S STAGE</p>
          <h2 id="destiny-bias-lineup-title" className="mt-1 text-lg font-black text-white md:text-2xl">
            {copy.lineupHeading}
          </h2>
          <p className="mt-2 max-w-2xl whitespace-pre-line text-xs leading-6 text-white/75 md:text-sm">
            {copy.lineupParagraph}
          </p>

          <ul className={`${styles.lineupRow} mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible`}>
            {DESTINY_BIAS_LINEUP_ALBUMS.map((album) => (
              <LineupAlbum key={album.id} album={album} albumCoverAltSuffix={copy.albumCoverAltSuffix} />
            ))}
          </ul>
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {stageSteps.map((step) => (
          <li key={step.no} className={`${styles.stepRail} p-4`}>
            <p className="text-[11px] font-black tracking-[0.16em] text-[var(--bias-lavender)]">{step.no}</p>
            <p className="mt-1 text-sm font-bold text-white/94">{step.label}</p>
            <p className="mt-1 text-xs leading-6 text-white/70">{step.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
