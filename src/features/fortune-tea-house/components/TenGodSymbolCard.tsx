"use client";

/* eslint-disable @next/next/no-img-element */

import { tenGodMetaMap, type TenGodId } from "../data/tenGods";
import { tenGodVisualAlts, tenGodVisualMap } from "../data/tenGodVisuals";
import SpriteCrop from "./SpriteCrop";
import styles from "../styles/fortune-tea-house.module.css";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";

type TenGodSymbolCardProps = {
  tenGodId: TenGodId;
  size?: "sm" | "md" | "lg";
  showDescription?: boolean;
  selected?: boolean;
  className?: string;
};

/** 십성 데이터에서 사전이 덮으면 안 되는 필드. id 는 판별자, colorTone 은 data-tone CSS 토큰이다. */
const TEN_GOD_SKIP_KEYS = ["id", "colorTone"];

export default function TenGodSymbolCard({ tenGodId, size = "md", showDescription = true, selected = false, className = "" }: TenGodSymbolCardProps) {
  const metaMap = useTeaHouseCopy("tenGods", tenGodMetaMap, { skipKeys: TEN_GOD_SKIP_KEYS });
  const meta = metaMap[tenGodId];
  // 스프라이트 좌표는 그대로 쓰고, 화면에 나가는 대체 텍스트만 사전을 태운다.
  const alts = useTeaHouseCopy("tenGodAlts", tenGodVisualAlts);
  const visualAlt = alts[tenGodId];
  const visual = tenGodVisualMap[tenGodId];

  return (
    <article className={`${styles.tenGodCard} ${className}`} data-size={size} data-tone={meta.colorTone} data-selected={selected ? "true" : "false"}>
      <div className={styles.tenGodIconWrap} aria-label={visualAlt}>
        {visual.type === "image" && visual.src ? <img className={styles.tenGodImage} src={visual.src} alt={visualAlt} loading="lazy" decoding="async" /> : null}
        {visual.type === "sprite-crop" && visual.src && visual.sheetWidth && visual.sheetHeight && visual.width && visual.height ? (
          <SpriteCrop
            src={visual.src}
            sheetWidth={visual.sheetWidth}
            sheetHeight={visual.sheetHeight}
            mobileSrc={visual.mobileSrc}
            mobileSheetWidth={visual.mobileSheetWidth}
            mobileSheetHeight={visual.mobileSheetHeight}
            mobileCrop={visual.mobileCrop}
            x={visual.x || 0}
            y={visual.y || 0}
            width={visual.width}
            height={visual.height}
            alt={visualAlt}
            className={styles.tenGodSprite}
          />
        ) : null}
        {visual.type === "css-fallback" ? (
          <span className={styles.tenGodGlyph} aria-hidden>
            {visual.glyph}
          </span>
        ) : null}
      </div>

      <div className={styles.tenGodCopy}>
        <div className={styles.tenGodTitleRow}>
          <h4>{meta.nameKo}</h4>
          {meta.hanja ? <span>{meta.hanja}</span> : null}
        </div>
        <p className={styles.tenGodRole}>{meta.roleInTeaHouse}</p>
        <div className={styles.tenGodKeywords}>
          {meta.coreMeaning.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>
      </div>

      {showDescription ? (
        <div className={styles.tenGodDescription}>
          <p>{meta.yeoniDescription}</p>
          <small className={styles.tenGodVisualHint}>{meta.visualHint}</small>
        </div>
      ) : null}
    </article>
  );
}
