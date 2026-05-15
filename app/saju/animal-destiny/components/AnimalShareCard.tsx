"use client";

import { forwardRef } from "react";
import type { AnimalDestinyData, TwelveStage } from "../lib/types";
import type { FourPillarStageItem } from "../lib/twelveStages";
import type { StageScore } from "../lib/stageScore";
import AnimalSymbol, { type AnimalSymbolName } from "@/app/components/icons/AnimalSymbol";
import CosmicSigil from "./CosmicSigil";

interface Props {
  animal: AnimalDestinyData;
  pillars: Record<"year" | "month" | "day" | "hour", FourPillarStageItem>;
  score: StageScore;
  oneLine: string;
}

const STAGE_ANIMAL_ALIAS: Record<TwelveStage, string> = {
  장생: "치타",
  목욕: "원숭이",
  관대: "검은표범",
  건록: "코알라",
  제왕: "호랑이",
  쇠: "너구리",
  병: "코뿔소",
  사: "코끼리",
  묘: "양",
  절: "페가수스",
  태: "늑대",
  양: "사슴",
};

function row(label: string, item: FourPillarStageItem) {
  return `${label}: ${item.stage || "-"} / ${item.stage ? STAGE_ANIMAL_ALIAS[item.stage] : "-"}`;
}

function stageToSymbol(stage?: TwelveStage): AnimalSymbolName {
  if (!stage) return "cat";
  const map: Record<TwelveStage, AnimalSymbolName> = {
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
  return map[stage];
}

const AnimalShareCard = forwardRef<HTMLDivElement, Props>(function AnimalShareCard({ animal, pillars, score, oneLine }, ref) {
  const dayStage = pillars.day.stage || undefined;
  const symbolName = stageToSymbol(dayStage as TwelveStage | undefined);

  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[2rem] border border-cyan-100/35 bg-[radial-gradient(circle_at_10%_12%,rgba(125,228,255,0.35),transparent_34%),radial-gradient(circle_at_82%_6%,rgba(255,191,116,0.28),transparent_30%),linear-gradient(160deg,#071331_0%,#12245b_48%,#0e1c46_100%)] p-5 shadow-[0_28px_56px_rgba(3,13,38,0.6)]"
    >
      <div className="pointer-events-none absolute -right-16 -top-12 h-44 w-44 opacity-70">
        <CosmicSigil className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rotate-12 opacity-45">
        <CosmicSigil className="h-full w-full" />
      </div>
      <div className="absolute inset-0 opacity-45 mix-blend-screen bg-[linear-gradient(112deg,transparent_0%,rgba(255,255,255,0.72)_24%,transparent_43%,rgba(255,255,255,0.32)_63%,transparent_100%)]" />
      <div className="absolute inset-0 opacity-35 mix-blend-plus-lighter bg-[repeating-linear-gradient(165deg,rgba(255,255,255,0.09)_0px,rgba(255,255,255,0.09)_1px,transparent_1px,transparent_7px)]" />

      <div className="relative z-10 flex h-full flex-col justify-between rounded-[1.5rem] border border-cyan-100/35 bg-white/10 p-5 backdrop-blur-md text-cyan-50">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100/85">Code Destiny</p>
          <p className="mt-1 text-xs font-semibold text-cyan-100">Celestial Animal Destiny</p>
          <p className="mt-1 text-[11px] font-semibold text-cyan-100/85">십이운성 동물점</p>

          <div className="mt-4 rounded-2xl border border-cyan-100/30 bg-slate-950/22 p-3 text-center">
            <p className="text-5xl inline-flex items-center justify-center">
              <AnimalSymbol name={symbolName} size={54} className="text-cyan-50" />
            </p>
            <h4 className="mt-1 text-xl font-black text-white">대표 동물: {animal.animal_ko}</h4>
            <p className="text-sm font-semibold text-cyan-100">십이운성: {animal.saju_stage}</p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-cyan-50/90">{oneLine}</p>
          </div>

          <div className="mt-3 rounded-2xl border border-cyan-100/30 bg-slate-950/24 p-3 text-xs text-cyan-50/92">
            <p>{row("연주", pillars.year)}</p>
            <p className="mt-1">{row("월주", pillars.month)}</p>
            <p className="mt-1">{row("일주", pillars.day)}</p>
            <p className="mt-1">{row("시주", pillars.hour)}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-cyan-100/30 bg-slate-950/24 p-3 text-xs font-bold text-cyan-50">
            <p>LOVE {score.love}</p>
            <p>CAREER {score.career}</p>
            <p>SOCIAL {score.social}</p>
            <p>LUCK {score.luck}</p>
          </div>

          <div className="mt-3 rounded-2xl border border-cyan-100/30 bg-slate-950/24 p-3 text-xs text-cyan-50">
            <p><span className="font-bold">행운 컬러:</span> {animal.luck_essentials.color}</p>
            <p className="mt-1"><span className="font-bold">행운 아이템:</span> {animal.luck_essentials.item}</p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-100/40 bg-amber-50/10 p-3">
          <p className="text-xs font-semibold text-amber-100/90">Oracle Whisper</p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-amber-50">"{animal.share_card.quote}"</p>
        </div>
      </div>
    </div>
  );
});

export default AnimalShareCard;
