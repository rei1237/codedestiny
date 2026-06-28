"use client";

import type { CSSProperties } from "react";
import type { FortuneTeaHouseConsultResponse } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import { getTarotAtlasSheetSrc, resolveTarotAtlasSlice } from "../data/tarotAtlas";
import SpriteCrop from "./SpriteCrop";
import styles from "../styles/fortune-tea-house.module.css";

type TarotAssetCardProps = {
  cardId: string;
  number?: number;
  nameKo: string;
  nameEn: string;
  orientation: FortuneTeaHouseConsultResponse["tarot"]["orientation"];
  keywords?: string[];
  meaning?: string;
  size?: "sm" | "md" | "lg";
  revealMode?: "back" | "front";
  compact?: boolean;
  className?: string;
};

export default function TarotAssetCard({
  cardId,
  number,
  nameKo,
  nameEn,
  orientation,
  keywords = [],
  meaning,
  size = "md",
  revealMode = "front",
  compact = false,
  className = "",
}: TarotAssetCardProps) {
  const slice = resolveTarotAtlasSlice(cardId);
  const sheetSrc = getTarotAtlasSheetSrc(slice.sheet);
  const direction = orientation === "upright" ? "정방향" : "역방향";
  const cardNumber = typeof number === "number" ? number : Number(slice.cardId.match(/major_(\d+)/)?.[1] || 0);

  if (revealMode === "back") {
    return (
      <article
        className={`${styles.tarotAssetCard} ${styles.tarotAssetCardBack} ${className}`}
        data-size={size}
        style={{ "--tarot-yeoni-card": `url("${fortuneTeaHouseAssets.yeoni.transparent.tarotCard}")` } as CSSProperties}
        aria-label="아직 공개되지 않은 운명의 카드"
      >
        <span className={styles.tarotAssetBackMark} aria-hidden>
          月
        </span>
        <strong>운명의 카드</strong>
      </article>
    );
  }

  return (
    <article
      className={`${styles.tarotAssetCard} ${className}`}
      data-size={size}
      data-orientation={orientation}
      data-compact={compact ? "true" : "false"}
      style={{ "--tarot-yeoni-card": `url("${fortuneTeaHouseAssets.yeoni.transparent.tarotCard}")` } as CSSProperties}
    >
      <div className={styles.tarotAssetHeader}>
        <span>{String(cardNumber).padStart(2, "0")}</span>
        <strong>{direction}</strong>
      </div>

      <div className={styles.tarotAssetVisual} aria-label={`${nameKo} ${nameEn} 카드 이미지`}>
        <SpriteCrop
          className={styles.tarotAssetCrop}
          src={sheetSrc}
          sheetWidth={slice.sheetWidth}
          sheetHeight={slice.sheetHeight}
          x={slice.x}
          y={slice.y}
          width={slice.width}
          height={slice.height}
          alt={`${nameKo} ${nameEn} 타로 카드`}
          fallback={
            <span className={styles.tarotAssetFallbackCard}>
              <strong>{nameKo}</strong>
              <small>{direction}</small>
              <em>{keywords.slice(0, 3).join(" · ")}</em>
              {meaning ? <span>{meaning}</span> : null}
            </span>
          }
        />
      </div>

      <div className={styles.tarotAssetTitle}>
        <h3>{nameKo}</h3>
        <p>{nameEn}</p>
      </div>

      <div className={styles.tarotKeywordList}>
        {keywords.map((keyword) => (
          <span key={keyword}>{keyword}</span>
        ))}
      </div>

      {!compact && meaning ? <p className={styles.tarotMeaning}>{meaning}</p> : null}
    </article>
  );
}
