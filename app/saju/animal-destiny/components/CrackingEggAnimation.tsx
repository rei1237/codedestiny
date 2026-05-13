"use client";

import { motion } from "framer-motion";

export default function CrackingEggAnimation() {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <motion.div
        animate={{ rotate: [0, -8, 8, -5, 5, 0], y: [0, -2, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className="text-7xl"
      >
        🥚
      </motion.div>
      <p className="text-sm font-semibold text-[#3d5340]">수호 동물 알이 흔들리는 중...</p>
    </div>
  );
}
