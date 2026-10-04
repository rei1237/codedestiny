"use client";

import { forwardRef } from "react";
import type { ChemiCopy, ChemiResult } from "@/lib/idol-chemi";
import ChemiTypeBadge from "./ChemiTypeBadge";
import { ASSETS, TYPE_ACCENT, stickerSrc } from "./chemiAssets";
import styles from "../../destiny-bias.module.css";

type Props = {
  result: ChemiResult;
  copy: ChemiCopy;
  nickname?: string;
};

/** 결과 핵심 카드(포토카드형). 생년월일 문자열은 어떤 형태로도 렌더하지 않는다. */
const ChemiCoreCard = forwardRef<HTMLDivElement, Props>(function ChemiCoreCard({ result, copy, nickname }, ref) {
  const accent = TYPE_ACCENT[result.chemiTypeId];
  const me = nickname?.trim() || "나";
  return (
    <div ref={ref} className={styles.coreCard} data-accent={accent} tabIndex={-1} aria-live="polite" aria-atomic="true">
      <img className={styles.coreCardBg} src={ASSETS.cardBg} alt="" aria-hidden decoding="async" />
      <img className={`${styles.sticker} ${styles.stickerCardA}`} src={stickerSrc(3)} alt="" width={64} height={64} aria-hidden />
      <img className={`${styles.sticker} ${styles.stickerCardB}`} src={stickerSrc(6)} alt="" width={48} height={48} aria-hidden />

      <div className={styles.coreCardHead}>
        <span className={styles.coreCardPair}>
          <strong>{me}</strong>
          <i aria-hidden>×</i>
          <strong>{result.partner.displayName}</strong>
        </span>
        <span className={styles.coreCardGroup}>{result.partner.groupLabel}</span>
      </div>

      <ChemiTypeBadge
        typeId={result.chemiTypeId}
        nameKo={result.chemiTypeNameKo}
        shortKo={result.chemiTypeShortKo}
        strength={result.signalStrength}
      />

      <p className={styles.coreCardOneLiner}>{copy.oneLiner}</p>

      <div className={styles.coreCardFoot}>
        <span>{result.minorMode ? "우정·팀워크 모드" : "현실 친구 모드"}</span>
        <span>꿀꿀 운세 · 최애운명</span>
      </div>
    </div>
  );
});

export default ChemiCoreCard;
