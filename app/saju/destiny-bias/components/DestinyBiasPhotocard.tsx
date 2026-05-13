"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DestinyBiasResultViewModel } from "../lib/types";
import styles from "../destiny-bias.module.css";

export default function DestinyBiasPhotocard({
  vm,
}: {
  vm: DestinyBiasResultViewModel;
}) {
  const reduceMotion = useReducedMotion();
  const photocardTags = vm.stageChemistryKeywords.slice(0, 3);

  return (
    <motion.div
      id="destiny-bias-card-preview"
      className="relative isolate mx-auto w-full max-w-[360px]"
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.95, y: reduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      whileHover={reduceMotion ? undefined : { scale: 1.02, y: -4 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className={styles.biasCardOuter}>
        <div className={`${styles.biasCardInner} aspect-[3/4]`}>
          <div className={styles.biasArtworkLayer} aria-hidden />
          <div className={styles.biasGlitterLayer} aria-hidden />
          <div className={styles.biasGlossLayer} aria-hidden />
          <div className={styles.biasRibbon} aria-hidden />

          <div className="relative z-10 flex h-full flex-col p-4 md:p-5">
            <div className="flex items-start justify-between">
              <span className={styles.pinkBadge}>Fan Edition</span>
              <span className={styles.iconBubble} aria-label="sparkle">💖</span>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-pink-100/85">My Destiny Bias</p>
                <h3 className={`mt-1 text-2xl font-black text-white md:text-[2rem] ${styles.cardClamp1}`}>
                  {vm.biasName || "꽃돼지"}
                </h3>
                <p className={`text-xs text-white/72 ${styles.cardClamp1}`}>{vm.gradeTitle}</p>
              </div>

              <div className={styles.scoreGem}>
                <span className={styles.scoreGemText}>{vm.totalScore}%</span>
              </div>
            </div>

            <div className="relative mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-[24px] border border-white/15 bg-[radial-gradient(circle_at_50%_35%,rgba(255,174,229,0.35),transparent_52%),radial-gradient(circle_at_65%_70%,rgba(103,189,255,0.28),transparent_48%),rgba(10,7,30,0.58)]">
              <div className={styles.auraOrb} aria-hidden />
              <div className="relative text-center">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-white/75">{vm.auraType}</p>
                <p className="mt-2 text-lg font-black text-pink-50">{vm.energyColor}</p>
                <p className="mt-1 text-xs text-cyan-100/85">{vm.auraMaterial}</p>
              </div>
              <span className="absolute left-4 top-4 text-xs text-white/70">✦</span>
              <span className="absolute right-5 top-8 text-sm text-pink-100/70">★</span>
              <span className="absolute bottom-6 left-6 text-[11px] text-cyan-100/75">♡</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {photocardTags.map((tag) => (
                <span key={tag} className={styles.keywordChip}>#{tag}</span>
              ))}
            </div>

            <p className={`mt-3 text-sm leading-6 text-white/92 ${styles.cardClamp2}`}>
              "{vm.oneLineDestinyMessage}"
            </p>

            <div className={styles.serialStrip}>
              <span>{vm.editionLabel || "Aura Rare"}</span>
              <span>{vm.destinyId}</span>
              <span>{vm.issuedAt}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-white/60">
        PNG 저장은 스토리 비율(9:16)로 제공됩니다.
      </p>

      <div
        className="pointer-events-none absolute -bottom-9 left-1/2 h-20 w-4/5 -translate-x-1/2 rounded-full bg-fuchsia-400/25 blur-3xl"
        aria-hidden
      />
    </motion.div>
  );
}
