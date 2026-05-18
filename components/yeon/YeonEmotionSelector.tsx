"use client";

import { motion } from "framer-motion";
import { moodLabelMap } from "@/lib/yeon/emotionMap";
import type { YeonMood } from "@/lib/yeon/types";

const moodIconMap: Record<YeonMood, string> = {
  happy: "😊",
  tired: "😴",
  anxious: "🫧",
  lonely: "🌙",
  angry: "🔥",
  blank: "☁️",
  hopeful: "🌱",
};

const moodOrder: YeonMood[] = [
  "happy",
  "tired",
  "anxious",
  "lonely",
  "angry",
  "blank",
  "hopeful",
];

type Props = {
  selectedMood: YeonMood;
  onSelectMood: (mood: YeonMood) => void;
};

export default function YeonEmotionSelector({ selectedMood, onSelectMood }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {moodOrder.map((mood) => {
        const active = selectedMood === mood;
        return (
          <motion.button
            key={mood}
            type="button"
            onClick={() => onSelectMood(mood)}
            whileTap={{ scale: 0.97 }}
            animate={{ scale: active ? 1.03 : 1, opacity: active ? 1 : 0.78 }}
            className={`relative min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
              active
                ? "border-[#ffe7b5]/70 bg-[linear-gradient(120deg,rgba(255,220,155,0.24),rgba(126,162,255,0.24),rgba(183,143,255,0.23))] text-white shadow-[0_14px_28px_rgba(25,20,66,0.44)]"
                : "border-white/25 bg-white/8 text-white/92"
            }`}
            aria-pressed={active}
          >
            <span className="mr-1">{moodIconMap[mood]}</span>
            {moodLabelMap[mood]}
            {active ? (
              <motion.span
                className="pointer-events-none absolute -right-1 -top-1 text-xs"
                initial={{ opacity: 0.2, scale: 0.7 }}
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.1, 0.7] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              >
                ✦
              </motion.span>
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}
