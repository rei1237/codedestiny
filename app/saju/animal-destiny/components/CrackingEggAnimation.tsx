"use client";

import { motion } from "framer-motion";

const STEPS = [
  "사주 사기둥(年·月·日·時) 계산 중...",
  "일간과 지지를 대조하는 중...",
  "십이운성 테이블 조회 중...",
  "내 동물 기질 정리하는 중...",
];

export default function SajuComputingAnimation() {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* 사주 명반 스피너 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="relative h-20 w-20"
      >
        <div className="absolute inset-0 rounded-full border-4 border-[#cde8c4] border-t-[#5a8f56]" />
        <div className="absolute inset-3 flex items-center justify-center text-3xl">
          🐾
        </div>
      </motion.div>

      {/* 단계별 메시지 */}
      <div className="space-y-1 text-center">
        {STEPS.map((step, i) => (
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.45, duration: 0.4 }}
            className="text-xs font-semibold text-[#3d5a3d]"
          >
            {step}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

