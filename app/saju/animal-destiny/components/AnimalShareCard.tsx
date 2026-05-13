"use client";

import { forwardRef } from "react";
import type { AnimalDestinyData } from "../lib/types";

interface Props {
  animal: AnimalDestinyData;
}

const AnimalShareCard = forwardRef<HTMLDivElement, Props>(function AnimalShareCard({ animal }, ref) {
  return (
    <div
      ref={ref}
      className="relative mx-auto h-[480px] w-[270px] overflow-hidden rounded-[26px] border-2 border-white/70 bg-gradient-to-br from-[#1b2a24] via-[#20473a] to-[#2b1e3d] p-4 text-white shadow-2xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.35),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(255,211,130,0.25),transparent_35%)]" />
      <div className="relative z-10 flex h-full flex-col">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffe79e]">Code:Destiny</p>
        <p className="mt-1 text-xs text-[#cce7df]">십이운성 동물점</p>

        <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-3 text-center backdrop-blur-sm">
          <p className="text-4xl">🐾</p>
          <h4 className="mt-1 text-lg font-black">{animal.animal_ko}</h4>
          <p className="text-xs text-[#f2d6a2]">{animal.saju_stage} · {animal.stage_hanja}</p>
          <p className="mt-2 text-sm font-semibold text-[#d8f0e7]">{animal.share_card.headline}</p>
        </div>

        <div className="mt-3 rounded-xl border border-white/20 bg-black/20 p-2 text-xs">
          <p>POWER {animal.game_stats.power} / CHARM {animal.game_stats.charm}</p>
          <p>LOGIC {animal.game_stats.logic} / LUCK {animal.game_stats.luck}</p>
        </div>

        <div className="mt-3 rounded-xl border border-white/20 bg-black/25 p-2 text-xs text-[#f6f8ff]">
          <p className="font-bold">행운 컬러</p>
          <p>{animal.luck_essentials.color}</p>
          <p className="mt-1 font-bold">행운 아이템</p>
          <p>{animal.luck_essentials.item}</p>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#ffe5bf]">"{animal.share_card.quote}"</p>

        <p className="mt-auto text-[10px] text-[#c5dfd4]">{animal.share_card.hashtags.join(" ")}</p>
      </div>
    </div>
  );
});

export default AnimalShareCard;
