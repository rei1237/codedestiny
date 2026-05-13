"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DestinyBiasResultViewModel } from "../lib/types";
import styles from "../destiny-bias.module.css";

export default function DestinyBiasPhotocard({
  vm,
  cardSvg,
}: {
  vm: DestinyBiasResultViewModel;
  cardSvg: string;
}) {
  const reduceMotion = useReducedMotion();
  const previewSvg = cardSvg.replace(/^<\?xml[^>]*>\s*/i, "");

  return (
    <motion.div
      id="destiny-bias-card-preview"
      className="relative isolate"
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92, y: reduceMotion ? 0 : 20, rotateX: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Hologram outer frame */}
      <div className={styles.biasCardOuter}>
        <div className={styles.biasCardInner}>
          <div className={styles.biasArtworkLayer} aria-hidden />

          {/* Gloss + glitter overlays */}
          <div className={styles.biasGlitterLayer} aria-hidden />
          <div className={styles.biasGlossLayer} aria-hidden />

          {/* Inner content */}
          <div className="relative z-10 p-4 md:p-5">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className={styles.pinkBadge}>LIMITED</span>
              <span className={styles.goldBadge}>COSMIC AURA CARD</span>
            </div>

            {/* Card header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-white/70">LIMITED FANSIGN PHOTOCARD</p>
                <h3 className={`mt-1 text-xl font-black text-white md:text-2xl ${styles.cardClamp1}`}>
                  {vm.biasName || "나의 최애"}
                </h3>
                {vm.linkedArtist ? (
                  <p className={`mt-0.5 text-xs text-cyan-200/80 ${styles.cardClamp1}`}>{vm.linkedArtist}</p>
                ) : null}
              </div>
              {/* Score gem */}
              <div className={styles.scoreGem}>
                <span className={styles.scoreGemText}>{vm.totalScore}</span>
              </div>
            </div>

            {/* SVG card preview */}
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/15 bg-black/30">
              <div
                className={`h-auto w-full ${styles.svgPreviewWrap}`}
                aria-label="최애운명 SVG 포토카드 미리보기"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            </div>

            {/* Destiny message */}
            <div className="mt-3 rounded-2xl border border-white/12 bg-black/25 p-3">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-white/60">DESTINY MESSAGE</p>
              <p className={`mt-1 text-sm font-bold leading-6 text-white ${styles.cardClamp2}`}>
                {vm.oneLineDestinyMessage}
              </p>
            </div>

            {/* Stats grid */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className={styles.scoreCell}>
                <p className="text-[10px] text-white/60">등급</p>
                <p className="mt-1 text-sm font-black text-white">{vm.destinyGrade}</p>
              </div>
              <div className={styles.scoreCell}>
                <p className="text-[10px] text-white/60">에너지</p>
                <p className={`mt-1 text-xs font-black text-white ${styles.cardClamp1}`}>{vm.energyColor}</p>
              </div>
              <div className={styles.scoreCell}>
                <p className="text-[10px] text-white/60">에디션</p>
                <p className={`mt-1 text-xs font-black text-white ${styles.cardClamp1}`}>{vm.editionLabel}</p>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {vm.stageChemistryKeywords.slice(0, 3).map((tag) => (
                <span key={tag} className={`${styles.blueBadge} text-[10px]`}>#{tag}</span>
              ))}
            </div>

            {/* Destiny ID */}
            <p className={`mt-3 text-[10px] text-white/50 ${styles.cardClamp1}`}>
              ID: {vm.destinyId} · {vm.issuedAt}
            </p>
          </div>

          {/* Signature zone */}
          <div className={styles.signatureZone}>
            <p className={`text-xs italic font-light text-white/55 ${styles.cardClamp1}`}>
              &ldquo;{vm.fansignMessage || "Your fanlight is already part of the stage."}&rdquo;
            </p>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute -bottom-8 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-full bg-[#6D3BFF]/20 blur-2xl"
        aria-hidden
      />
    </motion.div>
  );
}
