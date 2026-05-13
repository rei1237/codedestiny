"use client";

import { AnimatePresence, motion } from "framer-motion";
import CrackingEggAnimation from "./CrackingEggAnimation";
import FlipCardReveal from "./FlipCardReveal";

interface Props {
  mode: "calculating" | "revealing";
}

export default function AnimalRevealAnimation({ mode }: Props) {
  return (
    <section className="space-y-4 rounded-2xl border border-[#dbe7cf] bg-white/70 p-4">
      <div className="space-y-1 text-sm font-semibold text-[#3d5a3d]">
        <p>일간과 지지를 대조하는 중...</p>
        <p>십이운성을 계산하는 중...</p>
        <p>곧 캐릭터가 깨어납니다!</p>
      </div>

      <AnimatePresence mode="wait">
        {mode === "calculating" ? (
          <motion.div key="calc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CrackingEggAnimation />
          </motion.div>
        ) : (
          <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FlipCardReveal title="소환 성공" subtitle="동물 카드가 뒤집히는 중" />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
