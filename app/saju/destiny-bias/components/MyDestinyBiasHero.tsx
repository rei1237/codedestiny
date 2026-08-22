"use client";

import { m, useReducedMotion } from "framer-motion";
import { useDestinyBiasCopy } from "../_lib/copy";

export default function MyDestinyBiasHero({ subtitle }: { subtitle?: string }) {
  const copy = useDestinyBiasCopy();
  const reduceMotion = useReducedMotion();

  return (
    <m.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[30px] border border-white/15 bg-[linear-gradient(145deg,rgba(7,4,22,0.84),rgba(26,11,63,0.58))] p-6 shadow-[0_0_52px_rgba(109,59,255,0.22)] md:p-7"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(255,217,138,0.26),transparent_38%),radial-gradient(circle_at_88%_80%,rgba(255,95,210,0.22),transparent_42%),radial-gradient(circle_at_52%_100%,rgba(109,59,255,0.2),transparent_45%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-55" aria-hidden>
        <div className="absolute left-16 top-9 h-1 w-1 rounded-full bg-white/70" />
        <div className="absolute left-28 top-20 h-1.5 w-1.5 rounded-full bg-cyan-100/70" />
        <div className="absolute right-20 top-14 h-1.5 w-1.5 rounded-full bg-pink-100/75" />
        <div className="absolute right-28 top-28 h-1 w-1 rounded-full bg-white/65" />
      </div>

      <div className="relative z-10">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--bias-gold)]/50 bg-[var(--bias-gold)]/12 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-[var(--bias-gold)]/90">
          <span aria-hidden>✦</span> COSMIC FANLIGHT STAGE
        </div>

        <h1 className="text-3xl font-black leading-tight tracking-[-0.02em] text-white drop-shadow-[0_0_24px_rgba(255,217,138,0.45)] md:text-4xl">
          MY DESTINY BIAS
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-7 text-white/82 md:text-base">{copy.myDestinyHeroDescription}</p>

        {subtitle ? (
          <p className="mt-3 text-sm font-semibold text-white/80">{subtitle}</p>
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
        aria-hidden
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,95,210,0.5) 30%, rgba(64,200,255,0.5) 70%, transparent)",
        }}
      />
    </m.section>
  );
}

