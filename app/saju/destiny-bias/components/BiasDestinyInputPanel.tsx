"use client";

import { m, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  stepLabel: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function BiasDestinyInputPanel({ stepLabel, title, description, children }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <m.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[28px] border border-white/20 bg-[linear-gradient(140deg,rgba(8,13,36,0.86),rgba(23,17,58,0.66))] p-5 shadow-[0_24px_60px_rgba(4,8,20,0.55)] backdrop-blur-xl md:p-7"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(circle at 14% 10%, rgba(251,191,36,0.2), transparent 36%), radial-gradient(circle at 84% 12%, rgba(167,139,250,0.28), transparent 42%), radial-gradient(circle at 52% 100%, rgba(34,211,238,0.18), transparent 42%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" aria-hidden />

      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#f472b6] shadow-[0_0_12px_rgba(244,114,182,0.95)]" aria-hidden />
          <span className="h-2 w-2 rounded-full bg-[#facc15] shadow-[0_0_12px_rgba(250,204,21,0.95)]" aria-hidden />
          <span className="h-2 w-2 rounded-full bg-[#22d3ee] shadow-[0_0_12px_rgba(34,211,238,0.95)]" aria-hidden />
          <p className="text-[11px] font-semibold tracking-[0.2em] text-cyan-100/90">{stepLabel}</p>
        </div>

        <h2 className="text-2xl font-black leading-tight text-white drop-shadow-[0_0_22px_rgba(192,132,252,0.35)] md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-white/82 md:text-base">{description}</p>

        <m.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.32, ease: "easeOut" }}
          className="mt-5 rounded-2xl border border-white/14 bg-black/25 p-4 ring-1 ring-white/10 md:p-5"
        >
          {children}
        </m.div>
      </div>
    </m.section>
  );
}
