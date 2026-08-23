"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { tarotAtlasSheets, tarotAtlasSlices } from "../data/tarotAtlas";
import TarotAssetCard from "./TarotAssetCard";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

const sortedSlices = Object.values(tarotAtlasSlices).sort((a, b) => a.cardId.localeCompare(b.cardId));

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    키는 문구의 결정론적 해시라 같은 문구가 자동으로 한 키로 합쳐진다(정적 셸의 마커 도구와 같은 방식). */
// 자산 파일명은 경로이지 문구가 아니다 — 사전에 넣으면 로케일마다 없는 파일을 가리키게 된다.
const TAROT_ATLAS_FILE = "타로카드 매핑2.webp";

const KO = {
  kfxgeebk: "운명의 찻집 타로 아틀라스 검증",
  kjnpzpcs: "카드별 crop 결과",
  kn8fbxup: "원본 매핑 시트",
  atlasMeta: "{file} · 1122 x 1402 · 22 cards",
};

export default function TarotDebugPage() {
  const copy = useTeaHouseCopy("tarotDebugPage", KO);
  const debugStyle = {
    "--tea-bg-desktop": `url("${fortuneTeaHouseAssets.backgrounds.interiorDesktop2}")`,
    "--tea-bg-mobile": `url("${fortuneTeaHouseAssets.backgrounds.interiorMobile2}")`,
    "--tea-overlay": `url("${fortuneTeaHouseAssets.ui.overlay}")`,
    "--tea-overlay-2": `url("${fortuneTeaHouseAssets.ui.overlay2}")`,
  } as CSSProperties;

  return (
    <main className={styles.tarotDebugPage} style={debugStyle}>
      <header className={styles.tarotDebugHeader}>
        <p>{copy.kfxgeebk}</p>
        <h1>Major Arcana Crop Map</h1>
        <span>{copy.atlasMeta.replace("{file}", TAROT_ATLAS_FILE)}</span>
      </header>

      <section className={styles.tarotDebugSheets} aria-label={copy.kn8fbxup}>
        {Object.entries(tarotAtlasSheets).map(([key, src]) => (
          <figure key={key}>
            <img src={src} alt={`${key} 원본 타로 매핑 시트`} loading="lazy" decoding="async" />
            <figcaption>{key}</figcaption>
          </figure>
        ))}
      </section>

      <section className={styles.tarotDebugGrid} aria-label={copy.kjnpzpcs}>
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
