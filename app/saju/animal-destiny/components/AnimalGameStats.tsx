"use client";

import { motion } from "framer-motion";
import type { AnimalDestinyData } from "../lib/types";

const LABELS = [
  { key: "power", label: "power" },
  { key: "charm", label: "charm" },
  { key: "logic", label: "logic" },
  { key: "luck", label: "luck" },
  { key: "social", label: "social" },
] as const;

interface Props {
  animal: AnimalDestinyData;
  insight?: string;
}

export default function AnimalGameStats({ animal, insight }: Props) {
  return (
    <section className="space-y-3 rounded-2xl border border-[#d8e3cf] bg-white/70 p-4">
      <h3 className="text-lg font-black text-[#2d3f2f]">게임 스탯</h3>
      {insight ? <p className="text-xs font-semibold text-[#496149]">{insight}</p> : null}
      <div className="space-y-2">
        {LABELS.map((item) => {
          const value = animal.game_stats[item.key];
          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#4c5d4f]">
                <span>{item.label}</span>
                <span>{value}</span>
              </div>
              <div className="h-2 rounded-full bg-[#e4efd8]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.9 }}
                  className="h-2 rounded-full bg-gradient-to-r from-[#ff9a76] to-[#61d2b4]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
