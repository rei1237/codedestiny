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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {moodOrder.map((mood) => {
        const active = selectedMood === mood;
        return (
          <motion.button
            key={mood}
            type="button"
            onClick={() => onSelectMood(mood)}
            whileTap={{ scale: 0.97 }}
            animate={{ scale: active ? 1.08 : 1, opacity: active ? 1 : 0.66 }}
            className={`relative min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition ${
              active
                ? "border-white/60 bg-white/28 text-white shadow-[0_12px_24px_rgba(43,35,92,0.38)]"
                : "border-white/25 bg-white/10 text-white/90"
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
