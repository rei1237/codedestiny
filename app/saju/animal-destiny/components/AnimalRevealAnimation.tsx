"use client";

import { AnimatePresence, motion } from "framer-motion";
import SajuComputingAnimation from "./CrackingEggAnimation";
import FlipCardReveal from "./FlipCardReveal";

interface Props {
  mode: "calculating" | "revealing";
}

export default function AnimalRevealAnimation({ mode }: Props) {
  return (
    <section className="space-y-4 rounded-2xl border border-cyan-100/20 bg-[linear-gradient(160deg,rgba(9,27,55,0.74),rgba(10,16,40,0.7))] p-4">
      <div className="space-y-1 text-sm font-semibold text-cyan-50">
        <p>사주 천문반에서 십이운성 좌표를 추출하고 있습니다.</p>
        <p className="text-xs font-normal text-cyan-100/78">
          입력한 출생 정보를 기준으로 수호 동물의 인장을 호출 중입니다.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {mode === "calculating" ? (
          <motion.div key="calc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SajuComputingAnimation />
          </motion.div>
        ) : (
          <motion.div key="reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FlipCardReveal title="별자리 해독 완료" subtitle="당신의 십이운성 수호 동물이 모습을 드러냅니다" />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

