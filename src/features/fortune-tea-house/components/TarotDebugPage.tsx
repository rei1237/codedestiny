"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { tarotAtlasSheets, tarotAtlasSlices } from "../data/tarotAtlas";
import TarotAssetCard from "./TarotAssetCard";
import styles from "../styles/fortune-tea-house.module.css";

const sortedSlices = Object.values(tarotAtlasSlices).sort((a, b) => a.cardId.localeCompare(b.cardId));

export default function TarotDebugPage() {
  const debugStyle = {
    "--tea-bg-desktop": `url("${fortuneTeaHouseAssets.backgrounds.interiorDesktop2}")`,
    "--tea-bg-mobile": `url("${fortuneTeaHouseAssets.backgrounds.interiorMobile2}")`,
    "--tea-overlay": `url("${fortuneTeaHouseAssets.ui.overlay}")`,
    "--tea-overlay-2": `url("${fortuneTeaHouseAssets.ui.overlay2}")`,
  } as CSSProperties;

  return (
    <main className={styles.tarotDebugPage} style={debugStyle}>
      <header className={styles.tarotDebugHeader}>
        <p>운명의 찻집 타로 아틀라스 검증</p>
        <h1>Major Arcana Crop Map</h1>
        <span>타로카드 매핑2.webp · 1122 x 1402 · 22 cards</span>
      </header>

      <section className={styles.tarotDebugSheets} aria-label="원본 매핑 시트">
        {Object.entries(tarotAtlasSheets).map(([key, src]) => (
          <figure key={key}>
            <img src={src} alt={`${key} 원본 타로 매핑 시트`} loading="lazy" decoding="async" />
            <figcaption>{key}</figcaption>
          </figure>
        ))}
      </section>

      <section className={styles.tarotDebugGrid} aria-label="카드별 crop 결과">
        {sortedSlices.map((slice) => (
          <article className={styles.tarotDebugCard} key={slice.cardId}>
            <TarotAssetCard
              cardId={slice.cardId}
              nameKo={slice.nameKo}
              nameEn={slice.nameEn}
              orientation="upright"
              keywords={[slice.sheet, `${slice.x},${slice.y}`, `${slice.width}x${slice.height}`]}
              compact
              size="sm"
            />
            <code>
              {slice.cardId}
              <br />
              {slice.sheet} · x:{slice.x} y:{slice.y} w:{slice.width} h:{slice.height}
            </code>
          </article>
        ))}
      </section>
    </main>
  );
}
