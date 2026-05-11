"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DestinyBiasResultViewModel } from "../lib/types";
import styles from "../destiny-bias.module.css";

export default function DestinyBiasPhotocard({
  vm,
  themeLabel,
  imageSrc,
  coinCost,
  stickers,
}: {
  vm: DestinyBiasResultViewModel;
  themeLabel: string;
  imageSrc?: string;
  coinCost: number;
  stickers?: {
    heart: boolean;
    star: boolean;
    lightstick: boolean;
    text: string;
  };
}) {
  const reduceMotion = useReducedMotion();
  const cardImage = imageSrc || "/fuctionassets/%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85.webp";

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
      <div className="pointer-events-none absolute bottom-4 right-5 text-lg">🪄</div>

      <div className="relative rounded-2xl border border-white/25 bg-black/30 p-4 backdrop-blur-xl">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-white/80">LIMITED PHOTOCARD</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-white md:text-xl">{vm.biasEnergy.name || "나의 최애"}</h3>
          <span className="rounded-full border border-fuchsia-200/60 bg-fuchsia-300/20 px-2.5 py-1 text-[11px] font-bold text-fuchsia-50">
            {vm.grade}
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-white/20 bg-black/25">
          <div className="relative">
            <img src={cardImage} alt="최애운명 포토카드 비주얼" className="h-44 w-full object-cover md:h-56" loading="lazy" />
            {stickers?.heart ? (
              <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/35 bg-black/35 px-2 py-1 text-base">
                💖
              </span>
            ) : null}
            {stickers?.star ? (
              <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/35 bg-black/35 px-2 py-1 text-base">
                ⭐
              </span>
            ) : null}
            {stickers?.lightstick ? (
              <span className="pointer-events-none absolute right-3 bottom-3 rounded-full border border-white/35 bg-black/35 px-2 py-1 text-base">
                🎤
              </span>
            ) : null}
            {stickers?.text ? (
              <span className="pointer-events-none absolute left-3 bottom-3 rounded-full border border-fuchsia-200/60 bg-fuchsia-300/25 px-3 py-1 text-xs font-bold text-fuchsia-50">
                {stickers.text}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-white/20 bg-black/25 p-3">
          <p className="text-sm font-extrabold text-white">{vm.mainCatchphrase}</p>
          <p className="mt-1 text-xs text-white/80">{vm.card.subtitle}</p>
          <p className="mt-2 text-xs text-cyan-100/95">오늘의 덕질 키워드: {vm.todayAction.keyword}</p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-white/85">
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">공명 점수</p>
            <p className="mt-1 text-sm font-black text-white">{vm.score}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">시너지</p>
            <p className="mt-1 text-sm font-black text-white">{vm.synergy.relationType}</p>
          </div>
          <div className="rounded-lg border border-white/20 bg-black/25 px-2 py-2">
            <p className="text-[11px] text-white/70">테마</p>
            <p className="mt-1 text-sm font-black text-white">{themeLabel}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {vm.card.hashtags.map((tag) => (
            <span key={tag} className="rounded-full border border-cyan-200/40 bg-cyan-300/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-50">
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-white/70">✨ 1회 {coinCost}코인 · 포토카드 포함</p>
      </div>
    </motion.article>
  );
}
