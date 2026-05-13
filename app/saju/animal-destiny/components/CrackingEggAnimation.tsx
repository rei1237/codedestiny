"use client";

import { motion } from "framer-motion";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import CosmicSigil from "./CosmicSigil";

const STEPS = [
  "명식 천문반을 열어 사기둥을 정렬하는 중...",
  "일간과 지지의 결을 맞추어 운성 좌표를 계산하는 중...",
  "열두 운성의 별자리 지문을 대조하는 중...",
  "당신의 수호 동물 인장을 봉인 해제하는 중...",
];

export default function SajuComputingAnimation() {
  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="relative h-32 w-32"
      >
        <div className="absolute inset-0 rounded-full border border-cyan-100/35 bg-cyan-50/10 backdrop-blur-sm" />
        <CosmicSigil className="h-full w-full" />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">
          <DestinyIcon name="animalPaw" size={30} className="text-cyan-50" variant="soft" />
        </div>
      </motion.div>

      <div className="space-y-1 text-center">
        {STEPS.map((step, i) => (
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.45, duration: 0.4 }}
            className="text-xs font-semibold text-cyan-100/88"
          >
            {step}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

