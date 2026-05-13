"use client";

import { motion } from "framer-motion";
import type { AnimalDestinyData } from "../lib/types";

interface Props {
  animal: AnimalDestinyData;
  heroLine?: string;
}

export default function AnimalCharacterHero({ animal, heroLine }: Props) {
  return (
    <div className="rounded-2xl border border-[#d4e2c8] bg-gradient-to-br from-[#fff8cf] via-[#ffe9dd] to-[#d7f8f2] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8d4f39]">Stage Badge</p>
          <p className="text-lg font-black text-[#2f3f30]">{animal.saju_stage} · {animal.stage_hanja}</p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[#6a3f2d]">{animal.share_card.badge}</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px] md:items-center">
        <div>
          <h2 className="text-2xl font-black text-[#243427]">당신의 수호 동물은 {animal.animal_ko}입니다</h2>
          <p className="mt-1 text-sm text-[#3c4d3e]">{animal.short_copy}</p>
          {heroLine ? <p className="mt-2 text-xs font-semibold text-[#4f5f51]">{heroLine}</p> : null}
        </div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-2 border-white/70 bg-white/60 text-5xl shadow-lg"
        >
          🐾
        </motion.div>
      </div>
    </div>
  );
}
