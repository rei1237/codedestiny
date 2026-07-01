"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, type CSSProperties } from "react";
import { fortuneTeaHouseAssets } from "../data/assets";
import { teaHouseCups } from "../data/teaCups";
import { getTeaCupSprite } from "../data/teaCupSpriteMap";
import TeaCupVisual from "./TeaCupVisual";
import styles from "../styles/fortune-tea-house.module.css";

const assetCandidates = [
  ["labeledSheet", fortuneTeaHouseAssets.teaCups.labeledSheet],
  ["stateSheet", fortuneTeaHouseAssets.teaCups.stateSheet],
  ["transparentStateSheet", fortuneTeaHouseAssets.teaCups.transparentStateSheet],
  ["cups1", fortuneTeaHouseAssets.tea.cups1],
  ["cups2", fortuneTeaHouseAssets.tea.cups2],
  ["cutoutTeaCups", fortuneTeaHouseAssets.cutout.teaCups],
  ["fallbackTeaCups", fortuneTeaHouseAssets.fallback.teaCups],
  ["uiSelection", fortuneTeaHouseAssets.ui.selection],
] as const;

function DebugAssetFigure({ assetKey, src }: { assetKey: string; src: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <figure>
      {failed ? (
        <span
          style={{
            display: "grid",
            minHeight: 180,
            placeItems: "center",
            borderRadius: 8,
            color: "rgba(255, 246, 250, 0.72)",
            background: "rgba(255, 246, 250, 0.08)",
            textAlign: "center",
          }}
        >
          이미지를 불러오지 못했습니다.
        </span>
      ) : (
        <img
          src={src}
          alt={`${assetKey} 찻잔 후보 원본`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <figcaption>{assetKey}</figcaption>
    </figure>
  );
}

export default function TeaCupDebugPage() {
  const debugStyle = {
    "--tea-bg-desktop": `url("${fortuneTeaHouseAssets.backgrounds.interiorDesktop2}")`,
    "--tea-bg-mobile": `url("${fortuneTeaHouseAssets.backgrounds.interiorMobile2}")`,
    "--tea-overlay": `url("${fortuneTeaHouseAssets.ui.overlay}")`,
    "--tea-overlay-2": `url("${fortuneTeaHouseAssets.ui.overlay2}")`,
    overflowX: "clip",
  } as CSSProperties;

  return (
    <main className={styles.teaCupDebugPage} style={debugStyle}>
      <header className={styles.tarotDebugHeader}>
        <p>운명의 찻집 찻잔 crop 검증</p>
        <h1>Tea Cup Sprite Map</h1>
        <span>transparentStateSheet · 1448 x 1086 · 6 columns x 3 rows</span>
      </header>

      <section className={styles.teaCupDebugSheets} aria-label="찻잔 후보 원본 이미지">
        {assetCandidates.map(([key, src]) => (
          <DebugAssetFigure key={key} assetKey={key} src={src} />
        ))}
      </section>

      <section className={styles.teaCupDebugGrid} aria-label="찻잔별 crop 결과">
        {teaHouseCups.map((cup) => {
          const normal = getTeaCupSprite(cup.id, "normal");
          const selected = getTeaCupSprite(cup.id, "selected");
          return (
            <article className={styles.teaCupDebugCard} key={cup.id} data-accent={cup.accent}>
              <div className={styles.teaCupDebugPreviewRow}>
                <TeaCupVisual cup={cup} state="normal" size="debug" />
                <TeaCupVisual cup={cup} state="selected" size="debug" />
              </div>
              <div className={styles.teaCupDebugMobileCard}>
                <TeaCupVisual cup={cup} state="selected" size="menu" />
                <strong>{cup.name}</strong>
              </div>
              <code>
                {cup.id}
                <br />
                normal x:{Math.round(normal.x)} y:{normal.y} w:{Math.round(normal.width)} h:{normal.height}
                <br />
                selected x:{Math.round(selected.x)} y:{selected.y} w:{Math.round(selected.width)} h:{selected.height}
              </code>
            </article>
          );
        })}
      </section>
    </main>
  );
}
