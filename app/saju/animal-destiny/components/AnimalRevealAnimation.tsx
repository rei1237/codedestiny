"use client";

import { AnimatePresence, motion } from "framer-motion";
import SajuComputingAnimation from "./CrackingEggAnimation";
import FlipCardReveal from "./FlipCardReveal";

interface Props {
  mode: "calculating" | "revealing";
}

export default function AnimalRevealAnimation({ mode }: Props) {
  return (
    <section className="space-y-4 rounded-2xl border border-[#dbe7cf] bg-white/70 p-4">
      <div className="space-y-1 text-sm font-semibold text-[#3d5a3d]">
        <p>🔍 사주 엔진으로 십이운성을 계산하고 있어요</p>
        <p className="text-xs font-normal text-[#5a7060]">
          태어난 순간의 기운을 분석해 당신의 동물 타입을 찾고 있습니다
        </p>
      </div>

      <AnimatePresence mode="wait">
        {mode === "calculating" ? (
          <motion.div key="calc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SajuComputingAnimation />
          </motion.div>
        ) : (
          <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FlipCardReveal title="분석 완료" subtitle="십이운성 기반 동물 타입이 준비됐어요" />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

