"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function MyDestinyBiasHero({ subtitle }: { subtitle?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[30px] border border-white/15 bg-[linear-gradient(145deg,rgba(9,18,45,0.82),rgba(28,24,74,0.58))] p-6 shadow-[0_28px_80px_rgba(2,6,23,0.5)] md:p-7"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(244,114,182,0.3),transparent_38%),radial-gradient(circle_at_88%_80%,rgba(34,211,238,0.24),transparent_42%),radial-gradient(circle_at_52%_100%,rgba(99,102,241,0.18),transparent_45%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-55" aria-hidden>
        <div className="absolute left-16 top-9 h-1 w-1 rounded-full bg-white/70" />
        <div className="absolute left-28 top-20 h-1.5 w-1.5 rounded-full bg-cyan-100/70" />
        <div className="absolute right-20 top-14 h-1.5 w-1.5 rounded-full bg-pink-100/75" />
        <div className="absolute right-28 top-28 h-1 w-1 rounded-full bg-white/65" />
      </div>

      <div className="relative z-10">
        <div className="mb-2 inline-flex rounded-full border border-pink-200/45 bg-pink-300/12 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-pink-100/90">COSMIC FANLIGHT STAGE</div>

        <h1 className="text-3xl font-black leading-tight tracking-[-0.02em] text-white drop-shadow-[0_0_20px_rgba(255,95,210,0.45)] md:text-4xl">
          MY DESTINY BIAS
        </h1>

        <p className="mt-3 max-w-xl text-sm leading-7 text-white/80 md:text-base">
          우주 한가운데 펼쳐진 프라이빗 콘서트장에서,{" "}
          <span className="font-semibold text-fuchsia-200/90">당신의 사주 에너지</span>가{" "}
          <span className="font-semibold text-cyan-200/90">최애의 무대 아우라</span>와 연결됩니다.
        </p>

        {subtitle ? (
          <p className="mt-3 text-sm font-semibold text-cyan-100/85">{subtitle}</p>
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
        aria-hidden
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,95,210,0.5) 30%, rgba(64,200,255,0.5) 70%, transparent)",
        }}
      />
    </motion.section>
  );
}

