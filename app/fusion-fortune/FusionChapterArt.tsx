"use client";

import Image from "next/image";
import { FUSION_ORB_BY_KEY, FUSION_CORE_ORB, type FusionSystemKey } from "./fusionOrbs";
import { useFusionPremiumCopy } from "./_lib/premium-copy";
import styles from "./fusion-fortune.module.css";

/** Decorative, not calculation evidence. Text PDFs deliberately omit these dividers. */
export function FusionChapterArt({ systemKey, closing = false }: { systemKey: FusionSystemKey | "fusion"; closing?: boolean }) {
  const copy = useFusionPremiumCopy();
  const src = closing ? "/images/fusion-fortune/fusion-guardian-celestial-hero.webp"
    : systemKey === "fusion" ? FUSION_CORE_ORB : FUSION_ORB_BY_KEY[systemKey].image;
  // Tarot's actual saved cards are displayed by ExpertEvidence; do not invent a seventh card.
  if (!src) return null;
  return <div className={styles.chapterArt} data-closing={closing} aria-hidden="true" data-html2canvas-ignore="true" title={copy.art}>
    <span /><Image src={src} alt="" width={closing ? 480 : 160} height={closing ? 240 : 160} loading="lazy" sizes={closing ? "(max-width: 640px) 240px, 360px" : "112px"} /><span />
  </div>;
}
