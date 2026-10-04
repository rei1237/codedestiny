"use client";

import type { ChemiTypeId, SignalStrength } from "@/lib/idol-chemi";
import { STRENGTH_DOTS, STRENGTH_LABEL, TYPE_ACCENT, typeSymbolSrc } from "./chemiAssets";
import styles from "../../destiny-bias.module.css";

type Props = {
  typeId: ChemiTypeId;
  nameKo: string;
  shortKo: string;
  strength?: SignalStrength;
  size?: "sm" | "lg";
};

export default function ChemiTypeBadge({ typeId, nameKo, shortKo, strength, size = "lg" }: Props) {
  const accent = TYPE_ACCENT[typeId];
  return (
    <div className={`${styles.typeBadge} ${size === "sm" ? styles.typeBadgeSm : ""}`} data-accent={accent}>
      <img className={styles.typeSymbol} src={typeSymbolSrc(typeId)} alt="" width={size === "sm" ? 40 : 96} height={size === "sm" ? 40 : 96} decoding="async" />
      <div className={styles.typeText}>
        <span className={styles.typeShort}>{shortKo}</span>
        <strong className={styles.typeName}>{nameKo}</strong>
        {strength ? (
          <span className={styles.strength} aria-label={STRENGTH_LABEL[strength]}>
            {[0, 1, 2].map((i) => (
              <i key={i} className={i < STRENGTH_DOTS[strength] ? styles.strengthOn : ""} aria-hidden />
            ))}
            <small>{STRENGTH_LABEL[strength]}</small>
          </span>
        ) : null}
      </div>
    </div>
  );
}
