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
    <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
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
                ? "0 12px 24px rgba(35, 26, 78, 0.35)"
                : "0 6px 16px rgba(18, 14, 45, 0.2)",
            }}
            className={`min-h-11 rounded-2xl border px-2 py-2 text-left ${
              active
                ? "border-white/65 bg-white/30 text-white"
                : "border-white/25 bg-white/10 text-white/90"
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
