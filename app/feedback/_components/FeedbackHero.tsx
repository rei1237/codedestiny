"use client";

import Image from "next/image";
import { m, useReducedMotion } from "framer-motion";

import { fortuneTeaHouseAssets } from "@/src/features/fortune-tea-house/data/assets";
import { useFeedbackCopy } from "../_lib/copy";
import { ACCENT, INK, INK_MUTED } from "../_lib/styles";

export default function FeedbackHero() {
  const copy = useFeedbackCopy();
  const reduceMotion = useReducedMotion();

  return (
    <header className="flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="w-full text-center sm:text-left">
        <p className={`text-[11px] font-black uppercase tracking-[0.28em] ${ACCENT}`}>
          {copy.heroEyebrow}
        </p>
        <h1 className={`mt-3 text-[clamp(1.75rem,5vw,2.5rem)] font-black leading-tight tracking-tight ${INK}`}>
          {copy.heroTitle}
        </h1>
        <p className={`mt-4 max-w-[52ch] text-[15px] leading-[1.8] ${INK_MUTED}`}>
          {copy.heroBodyLine1}
          <br className="hidden sm:block" />
          {copy.heroBodyLine2}
        </p>
        <p className={`mt-4 text-[13px] ${INK_MUTED}`}>
          {copy.responseTimeNote}
        </p>
      </div>

      <m.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="shrink-0"
      >
        <Image
          src={fortuneTeaHouseAssets.cutout.flowerPig}
          alt={copy.heroImageAlt}
          width={148}
          height={148}
          unoptimized
          priority
          className="h-[104px] w-[104px] object-contain drop-shadow-[0_10px_24px_rgba(179,25,85,0.18)] sm:h-[148px] sm:w-[148px] dark:drop-shadow-[0_10px_24px_rgba(196,181,253,0.24)]"
        />
      </m.div>
    </header>
  );
}
