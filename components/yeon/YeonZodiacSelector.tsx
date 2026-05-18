"use client";

import { motion } from "framer-motion";
import { zodiacList } from "@/lib/yeon/zodiac";
import type { ZodiacSign } from "@/lib/yeon/types";

type Props = {
  selectedSign: ZodiacSign;
  onSelectSign: (sign: ZodiacSign) => void;
};

export default function YeonZodiacSelector({ selectedSign, onSelectSign }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4">
      {zodiacList.map((zodiac) => {
        const active = zodiac.sign === selectedSign;
        return (
          <motion.button
            key={zodiac.sign}
            type="button"
            onClick={() => onSelectSign(zodiac.sign)}
            whileTap={{ scale: 0.97 }}
            animate={{
              y: active ? -2 : 0,
              boxShadow: active
                ? "0 14px 28px rgba(25, 18, 71, 0.42)"
                : "0 8px 18px rgba(18, 14, 45, 0.22)",
            }}
            className={`min-h-11 rounded-2xl border px-2.5 py-2 text-left ${
              active
                ? "border-[#ffe7b5]/70 bg-[linear-gradient(150deg,rgba(255,218,144,0.24),rgba(126,164,255,0.22),rgba(183,143,255,0.2))] text-white"
                : "border-white/25 bg-white/8 text-white/92"
            }`}
          >
            <div className="text-base leading-none">{zodiac.icon}</div>
            <div className="mt-1 text-xs font-semibold">{zodiac.sign}</div>
            <div className="text-[10px] text-white/70">{zodiac.dateRange}</div>
          </motion.button>
        );
      })}
    </div>
  );
}
