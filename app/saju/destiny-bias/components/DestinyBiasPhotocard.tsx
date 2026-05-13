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
    <motion.article
      id="destiny-bias-card-preview"
      initial={{ opacity: 0, rotateY: reduceMotion ? 0 : -8, y: 12 }}
      animate={{ opacity: 1, rotateY: 0, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={reduceMotion ? undefined : { rotateX: 4, rotateY: -5, y: -6 }}
      className={`relative overflow-hidden rounded-[32px] p-4 md:p-6 ${styles.chromeBorder}`}
      style={{
        boxShadow: "0 22px 90px rgba(0,0,0,0.42)",
      }}
    >
      <div className={`absolute inset-0 ${styles.photocardHolo}`} aria-hidden />
      <div className="pointer-events-none absolute -right-6 top-8 text-xl">⭐</div>
      <div className="pointer-events-none absolute left-4 top-3 text-lg">💖</div>
      <div className="pointer-events-none absolute bottom-4 right-5 text-lg">✨</div>

      <div className="relative rounded-3xl border border-white/25 bg-black/34 p-4 backdrop-blur-xl md:p-5">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-white/80">LIMITED AURA PHOTOCARD</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-white md:text-xl">{vm.biasName || "나의 최애"}</h3>
          <span className="rounded-full border border-fuchsia-200/60 bg-fuchsia-300/20 px-2.5 py-1 text-[11px] font-bold text-fuchsia-50">
            {vm.totalScore}점
          </span>
        </div>
        <p className="mt-1 text-xs text-cyan-100/85">{vm.linkedArtist} · {vm.pairingAlias}</p>

        <div className="mt-3 overflow-hidden rounded-[24px] border border-white/20 bg-black/25 p-2 md:p-3">
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/25">
            <div
              className={`h-auto w-full ${styles.svgPreviewWrap}`}
              aria-label="최애운명 SVG 포토카드 미리보기"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-white/20 bg-black/25 p-3">
          <p className="text-sm font-extrabold text-white">{vm.oneLineDestinyMessage}</p>
          <p className="mt-1 text-xs text-white/80">에너지 타입: {vm.auraType} · {vm.auraMaterial}</p>
          <p className="mt-2 text-xs text-cyan-100/95">팬싸인 감성 메시지: {vm.fansignMessage}</p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-white/85">
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">등급</p>
            <p className="mt-1 text-sm font-black text-white">{vm.destinyGrade}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">에너지 컬러</p>
            <p className="mt-1 text-sm font-black text-white">{vm.energyColor}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">에디션</p>
            <p className="mt-1 text-sm font-black text-white">{vm.editionLabel}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-semibold text-white/85">
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">공명 점수</p>
            <p className="mt-1 text-sm font-black text-white">{vm.totalScore}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">케미 타이틀</p>
            <p className="mt-1 text-sm font-black text-white">{vm.gradeTitle}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {vm.stageChemistryKeywords.map((tag) => (
            <span key={tag} className="rounded-full border border-cyan-200/40 bg-cyan-300/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-50">
              #{tag}
            </span>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-white/70">Destiny ID: {vm.destinyId} · 발급일: {vm.issuedAt}</p>
      </div>
    </motion.article>
  );
}
