"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import type { FortuneTeaHouseConsultResponse } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import { resolveTarotCardImage } from "../lib/tarotCardImageMap";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

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

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    {name} 은 카드의 한국어명 + 영문명으로 치환된다 — 번역에서도 그대로 남겨 둘 것. */
const KO = {
  upright: "정방향",
  reversed: "역방향",
  backAria: "아직 공개되지 않은 운명의 카드",
  backTitle: "운명의 카드",
  tarotImageAria: "{name} 타로 카드 이미지",
  cardImageAria: "{name} 카드 이미지",
  cardAlt: "{name} 타로 카드",
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
  const copy = useTeaHouseCopy("tarotAssetCard", KO);
  const cardImage = useMemo(
    () => resolveTarotCardImage({ cardId, nameKo, nameEn, number }),
    [cardId, nameEn, nameKo, number],
  );
  const [imageFailed, setImageFailed] = useState(false);
  const direction = orientation === "upright" ? copy.upright : copy.reversed;
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
        aria-label={copy.backAria}
      >
        <span className={styles.tarotAssetBackMark} aria-hidden>
          月
        </span>
        <strong>{copy.backTitle}</strong>
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
      aria-label={visualOnly ? copy.tarotImageAria.replace("{name}", `${nameKo} ${nameEn}`) : undefined}
    >
      {!visualOnly ? (
        <div className={styles.tarotAssetHeader}>
          <span>{String(cardNumber).padStart(2, "0")}</span>
          <strong>{direction}</strong>
        </div>
      ) : null}

      <div className={styles.tarotAssetVisual} aria-label={copy.cardImageAria.replace("{name}", `${nameKo} ${nameEn}`)}>
        {cardImage && !imageFailed ? (
          <Image
            className={styles.tarotAssetCrop}
            src={cardImage.url}
            alt={copy.cardAlt.replace("{name}", `${nameKo} ${nameEn}`)}
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
