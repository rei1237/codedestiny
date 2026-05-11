"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DestinyBiasResultViewModel } from "../lib/types";
import styles from "../destiny-bias.module.css";

export default function DestinyBiasPhotocard({
  vm,
  themeLabel,
  cardSvg,
}: {
  vm: DestinyBiasResultViewModel;
  themeLabel: string;
  cardSvg: string;
}) {
  const reduceMotion = useReducedMotion();
  const previewSvg = cardSvg.replace(/^<\?xml[^>]*>\s*/i, "");

  return (
    <motion.article
      id="destiny-bias-card-preview"
      initial={{ opacity: 0, rotateY: reduceMotion ? 0 : -8, y: 10 }}
      animate={{ opacity: 1, rotateY: 0, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={reduceMotion ? undefined : { rotateX: 3, rotateY: -5, y: -3 }}
      className={`relative overflow-hidden rounded-[30px] p-4 md:p-5 ${styles.chromeBorder}`}
      style={{
        boxShadow: "0 22px 90px rgba(0,0,0,0.42)",
      }}
    >
      <div className={`absolute inset-0 ${styles.photocardHolo}`} aria-hidden />
      <div className="pointer-events-none absolute -right-6 top-8 text-xl">⭐</div>
      <div className="pointer-events-none absolute left-4 top-3 text-lg">💖</div>
      <div className="pointer-events-none absolute bottom-4 right-5 text-lg">✨</div>

      <div className="relative rounded-2xl border border-white/25 bg-black/30 p-4 backdrop-blur-xl">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-white/80">LIMITED DIGITAL PHOTOCARD</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-white md:text-xl">{vm.biasName || "나의 최애"}</h3>
          <span className="rounded-full border border-fuchsia-200/60 bg-fuchsia-300/20 px-2.5 py-1 text-[11px] font-bold text-fuchsia-50">
            {vm.totalScore}점
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-white/20 bg-black/25 p-2">
          <div className="overflow-hidden rounded-xl border border-white/20 bg-black/25">
            <div
              className={`h-auto w-full ${styles.svgPreviewWrap}`}
              aria-label="최애운명 SVG 포토카드 미리보기"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-white/20 bg-black/25 p-3">
          <p className="text-sm font-extrabold text-white">{vm.oneLineDestinyMessage}</p>
          <p className="mt-1 text-xs text-white/80">에너지 타입: {vm.biasEnergyType}</p>
          <p className="mt-2 text-xs text-cyan-100/95">오늘의 응원 미션: {vm.todayMission}</p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-white/85">
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">공명 점수</p>
            <p className="mt-1 text-sm font-black text-white">{vm.totalScore}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">최애 무드</p>
            <p className="mt-1 text-sm font-black text-white">{vm.biasMood}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">테마</p>
            <p className="mt-1 text-sm font-black text-white">{themeLabel}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {vm.connectionKeyword.map((tag) => (
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
