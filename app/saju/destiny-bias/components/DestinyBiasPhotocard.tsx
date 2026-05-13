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
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92, y: reduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Hologram outer frame */}
      <div className={styles.biasCardOuter}>
        <div className={styles.biasCardInner}>
          {/* Gloss + glitter overlays */}
          <div className={styles.biasGlitterLayer} aria-hidden />
          <div className={styles.biasGlossLayer} aria-hidden />

          {/* Inner content */}
          <div className="relative z-10 p-4 md:p-5">
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
    </motion.div>
  );
}


  return (
    <motion.article
      id="destiny-bias-card-preview"
      initial={{ opacity: 0, rotateY: reduceMotion ? 0 : -8, y: 14 }}
      animate={{ opacity: 1, rotateY: 0, y: 0 }}
      transition={{ duration: 0.55 }}
      whileHover={reduceMotion ? undefined : { rotateX: 3, rotateY: -4, y: -5 }}
      className={`relative overflow-hidden rounded-[34px] p-4 md:p-6 ${styles.chromeBorder}`}
      style={{
        boxShadow: "0 22px 90px rgba(0,0,0,0.42)",
      }}
    >
      <div className={`absolute inset-0 ${styles.photocardHolo}`} aria-hidden />
      <div className="pointer-events-none absolute -right-5 top-9 text-xl">⭐</div>
      <div className="pointer-events-none absolute left-3 top-3 text-lg">💖</div>
      <div className="pointer-events-none absolute bottom-4 right-4 text-lg">✨</div>

      <div className="relative rounded-3xl border border-white/25 bg-black/35 p-4 backdrop-blur-xl md:p-5">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-white/82">LIMITED FANSIGN PHOTOCARD</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-white md:text-xl">{vm.biasName || "나의 최애"}</h3>
            <p className={`mt-0.5 text-xs text-cyan-100/85 ${styles.cardClamp1}`}>{vm.linkedArtist}</p>
          </div>
          <span className="shrink-0 rounded-full border border-fuchsia-200/60 bg-fuchsia-300/20 px-2.5 py-1 text-[11px] font-bold text-fuchsia-50">
            {vm.totalScore}점
          </span>
        </div>

        <p className={`mt-1 text-xs text-white/78 ${styles.cardClamp1}`}>{vm.pairingAlias}</p>

        <div className="mt-3 overflow-hidden rounded-[24px] border border-white/20 bg-black/25 p-2 md:p-3">
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/25">
            <div
              className={`h-auto w-full ${styles.svgPreviewWrap}`}
              aria-label="최애운명 SVG 포토카드 미리보기"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-white/20 bg-black/28 p-3">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-white/72">DESTINY MESSAGE</p>
          <p className={`mt-1 text-sm font-extrabold leading-6 text-white ${styles.cardClamp2}`}>{vm.oneLineDestinyMessage}</p>
          <p className={`mt-2 text-xs leading-5 text-cyan-100/92 ${styles.cardClamp2}`}>팬싸인 메시지: {vm.fansignMessage}</p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-white/85">
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">등급</p>
            <p className="mt-1 text-sm font-black text-white">{vm.destinyGrade}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">에너지 컬러</p>
            <p className={`mt-1 text-sm font-black text-white ${styles.cardClamp1}`}>{vm.energyColor}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">에디션</p>
            <p className={`mt-1 text-sm font-black text-white ${styles.cardClamp1}`}>{vm.editionLabel}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-semibold text-white/85">
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">공명 점수</p>
            <p className="mt-1 text-sm font-black text-white">{vm.totalScore}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">케미 타이틀</p>
            <p className={`mt-1 text-sm font-black text-white ${styles.cardClamp1}`}>{vm.gradeTitle}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {vm.stageChemistryKeywords.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-cyan-200/40 bg-cyan-300/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-50">
              #{tag}
            </span>
          ))}
        </div>

        <p className={`mt-3 text-[11px] text-white/70 ${styles.cardClamp1}`}>Destiny ID: {vm.destinyId} · 발급일: {vm.issuedAt}</p>
      </div>
    </motion.article>
  );
}
