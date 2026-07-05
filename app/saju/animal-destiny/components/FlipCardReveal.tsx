"use client";

import { m } from "framer-motion";
import CosmicSigil from "./CosmicSigil";

interface Props {
  title: string;
  subtitle: string;
}

export default function FlipCardReveal({ title, subtitle }: Props) {
  return (
    <m.div
      initial={{ rotateY: 180, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-cyan-100/30 bg-[linear-gradient(140deg,rgba(8,17,45,0.86),rgba(18,32,68,0.8))] p-5 text-center shadow-[0_18px_42px_rgba(2,10,31,0.52)]"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 opacity-70">
        <CosmicSigil className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.26)_28%,transparent_52%,rgba(255,255,255,0.18)_74%,transparent_100%)]" />

      <p className="relative text-xs font-bold uppercase tracking-[0.24em] text-cyan-100/85">Hologram Reveal</p>
      <h3 className="relative mt-2 text-2xl font-black text-white">{title}</h3>
      <p className="relative mt-1 text-sm text-cyan-50/90">{subtitle}</p>
    </m.div>
  );
}
