"use client";

import { m } from "framer-motion";
import AnimalSymbol, { type AnimalSymbolName } from "@/app/components/icons/AnimalSymbol";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import CosmicSigil from "./CosmicSigil";
import type { AnimalDestinyData, TwelveStage } from "../lib/types";

interface Props {
  animal: AnimalDestinyData;
  primaryStage: TwelveStage;
  pillarLabel: string;
  score: { love: number; career: number; social: number; luck: number };
  oneLine: string;
}

function stageAnimalSymbol(stage?: string): AnimalSymbolName {
  if (!stage) return "cat";
  const map: Record<string, AnimalSymbolName> = {
    장생: "lion",
    목욕: "rabbit",
    관대: "cat",
    건록: "bear",
    제왕: "lion",
    쇠: "fox",
    병: "turtle",
    사: "elephant",
    묘: "deer",
    절: "swan",
    태: "dog",
    양: "bird",
  };
  return map[stage] || "cat";
}

export default function AnimalSummaryCard({ animal, primaryStage, pillarLabel, score, oneLine }: Props) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2.5rem] border-2 border-[#EAD8B1] bg-[#FFFBEB] p-6 shadow-[0_20px_50px_rgba(184,142,47,0.15)]"
    >
      {/* Decorative Halo */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 opacity-10">
        <CosmicSigil className="h-full w-full text-[#B88E2F]" />
      </div>
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-[#634832] px-3 py-1 text-[10px] font-bold tracking-widest text-white uppercase">
            {pillarLabel} 중심 운명
          </span>
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-[#B88E2F]/40" />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 animate-pulse rounded-full bg-[#B88E2F]/20 blur-xl" />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-[#EAD8B1] bg-white shadow-inner">
              <AnimalSymbol name={stageAnimalSymbol(primaryStage)} size={80} className="text-[#634832]" />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-[#634832]">
            {animal.animal_ko} <span className="text-xl font-bold text-[#B88E2F]">({primaryStage})</span>
          </h2>
          <p className="mt-2 text-sm font-semibold text-[#B88E2F]/80">{animal.title}</p>
        </div>

        <div className="rounded-2xl border border-[#EAD8B1]/50 bg-white/50 p-4 shadow-sm">
          <p className="text-center text-sm font-bold leading-relaxed text-[#634832]">
            "{oneLine}"
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {Object.entries(score).map(([key, val]) => (
            <div key={key} className="flex flex-col items-center rounded-xl bg-white/80 py-2 shadow-sm">
              <span className="text-[10px] font-black text-[#B88E2F] uppercase">{key}</span>
              <span className="text-base font-black text-[#634832]">{val}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-green-50 p-3 text-center">
            <p className="text-[10px] font-bold text-green-700">장점</p>
            <p className="mt-1 text-xs font-black text-green-900">{animal.personality.strengths[0]}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3 text-center">
            <p className="text-[10px] font-bold text-red-700">약점</p>
            <p className="mt-1 text-xs font-black text-red-900">{animal.personality.weaknesses[0]}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-center">
            <p className="text-[10px] font-bold text-amber-700">주의</p>
            <p className="mt-1 text-xs font-black text-amber-900">{animal.today.caution.split(' ')[0]}</p>
          </div>
        </div>
      </div>
    </m.div>
  );
}
