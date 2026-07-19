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

const STAGE_STEPS = [
  { no: "01", label: "팬 프로필 체크", desc: "이름과 생년월일로 내 사주 에너지를 읽습니다." },
  { no: "02", label: "최애 링크", desc: "최애 정보를 입력하거나 스타 아카이브에서 고릅니다." },
  { no: "03", label: "글래스 포토카드", desc: "케미 리딩과 최애 사진을 담은 카드를 PNG로 저장합니다." },
];

function LineupAlbum({ album }: { album: DestinyBiasAlbumAsset }) {
  const [src, setSrc] = useState(album.src);

  return (
    <li className={`${styles.lineupCard} w-[190px] shrink-0 snap-center p-3 sm:w-auto sm:shrink`}>
      <span className={styles.lineupBeam} aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-white/16">
        <Image
          src={src}
          alt={`${album.title} 앨범 커버`}
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
  return (
    <section className="space-y-4" aria-labelledby="destiny-bias-lineup-title">
      <div className={`${styles.stageDeck} p-4 md:p-6`}>
        <div className={styles.spotHaze} aria-hidden />
        <div className={styles.stageFloorLine} aria-hidden />

        <div className="relative z-10">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[var(--bias-gold)]/85">TONIGHT&apos;S STAGE</p>
          <h2 id="destiny-bias-lineup-title" className="mt-1 text-lg font-black text-white md:text-2xl">
            최애 사진 한 장이면, 소장용 포토카드가 됩니다
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-white/75 md:text-sm">
            사주 궁합 리딩과 함께, 올려주신 최애 사진을 그대로 합성한 글래스 포토카드를 만들어드려요.
            완성된 카드는 PNG로 저장해 프로필·SNS에 바로 올릴 수 있습니다.
          </p>

          <ul className={`${styles.lineupRow} mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible`}>
            {DESTINY_BIAS_LINEUP_ALBUMS.map((album) => (
              <LineupAlbum key={album.id} album={album} />
            ))}
          </ul>
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {STAGE_STEPS.map((step) => (
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
