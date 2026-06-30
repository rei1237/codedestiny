"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import type { FortuneTeaHouseConsultResponse } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import { resolveTarotCardImage } from "../lib/tarotCardImageMap";
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
  visualOnly?: boolean;
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
  visualOnly = false,
  className = "",
}: TarotAssetCardProps) {
  const cardImage = useMemo(
    () => resolveTarotCardImage({ cardId, nameKo, nameEn, number }),
    [cardId, nameEn, nameKo, number],
  );
  const [imageFailed, setImageFailed] = useState(false);
  const direction = orientation === "upright" ? "정방향" : "역방향";
  const cardNumber = typeof number === "number" ? number : Number(cardId.match(/(?:major|minor)_[a-z]*_?(\d+)/)?.[1] || 0);
  const shouldPreload = size === "lg" || visualOnly;
  const imageSizes = visualOnly
    ? "(max-width: 640px) 46vw, 240px"
    : size === "lg"
      ? "(max-width: 640px) 70vw, 320px"
      : size === "sm"
        ? "128px"
        : "184px";

  useEffect(() => {
    setImageFailed(false);
  }, [cardImage?.url]);

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
      data-visual-only={visualOnly ? "true" : "false"}
      style={{ "--tarot-yeoni-card": `url("${fortuneTeaHouseAssets.yeoni.transparent.tarotCard}")` } as CSSProperties}
      aria-label={visualOnly ? `${nameKo} ${nameEn} 타로 카드 이미지` : undefined}
    >
      {!visualOnly ? (
        <div className={styles.tarotAssetHeader}>
          <span>{String(cardNumber).padStart(2, "0")}</span>
          <strong>{direction}</strong>
        </div>
      ) : null}

      <div className={styles.tarotAssetVisual} aria-label={`${nameKo} ${nameEn} 카드 이미지`}>
        {cardImage && !imageFailed ? (
          <Image
            className={styles.tarotAssetCrop}
            src={cardImage.url}
            alt={`${nameKo} ${nameEn} 타로 카드`}
            width={1024}
            height={1536}
            sizes={imageSizes}
            quality={96}
            priority={shouldPreload}
            loading={shouldPreload ? undefined : "lazy"}
            decoding="async"
            unoptimized
            onError={() => {
              setImageFailed(true);
              console.warn("[FortuneTeaHouse] Tarot card image failed to load", {
                cardId,
                nameKo,
                nameEn,
                objectKey: cardImage.objectKey,
                url: cardImage.url,
              });
            }}
          />
        ) : (
          visualOnly ? (
            <span className={styles.tarotAssetVisualOnlyFallback} aria-hidden />
          ) : (
            <span className={styles.tarotAssetFallbackCard}>
              <strong>{nameKo}</strong>
              <small>{direction}</small>
              <em>{keywords.slice(0, 3).join(" · ")}</em>
              {meaning ? <span>{meaning}</span> : null}
            </span>
          )
        )}
      </div>

      {!visualOnly ? (
        <div className={styles.tarotAssetTitle}>
          <h3>{nameKo}</h3>
          <p>{nameEn}</p>
        </div>
      ) : null}

      {!visualOnly ? (
        <div className={styles.tarotKeywordList}>
          {keywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
      ) : null}

      {!visualOnly && !compact && meaning ? <p className={styles.tarotMeaning}>{meaning}</p> : null}
    </article>
  );
}
