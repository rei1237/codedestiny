"use client";

import { forwardRef } from "react";
import type { AnimalDestinyData, TwelveStage } from "../lib/types";
import type { FourPillarStageItem } from "../lib/twelveStages";
import type { StageScore } from "../lib/stageScore";
import AnimalSymbol, { type AnimalSymbolName } from "@/app/components/icons/AnimalSymbol";

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
      className="relative mx-auto aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-emerald-200 via-cyan-100 to-violet-200 p-5 shadow-2xl shadow-emerald-900/20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.8),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.25),transparent_35%),radial-gradient(circle_at_40%_90%,rgba(45,212,191,0.35),transparent_35%)]" />
      <div className="absolute inset-0 opacity-30 mix-blend-screen bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.7)_20%,transparent_40%,rgba(255,255,255,0.45)_60%,transparent_80%)]" />

      <div className="relative z-10 flex h-full flex-col justify-between rounded-[1.5rem] border border-white/60 bg-white/35 p-5 backdrop-blur-md text-[#12363a]">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0f4c5a]">Code:Destiny</p>
          <p className="mt-1 text-xs font-semibold text-[#24626d]">십이운성 동물점</p>

          <div className="mt-4 rounded-2xl border border-white/70 bg-white/55 p-3 text-center">
            <p className="text-5xl inline-flex items-center justify-center">
              <AnimalSymbol name={symbolName} size={52} className="text-[#24626d]" />
            </p>
            <h4 className="mt-1 text-xl font-black">대표 동물: {animal.animal_ko}</h4>
            <p className="text-sm font-semibold text-[#14525b]">십이운성: {animal.saju_stage}</p>
            <p className="mt-2 text-xs font-medium text-[#285d63]">{oneLine}</p>
          </div>

          <div className="mt-3 rounded-2xl border border-white/70 bg-white/55 p-3 text-xs">
            <p>{row("연주", pillars.year)}</p>
            <p className="mt-1">{row("월주", pillars.month)}</p>
            <p className="mt-1">{row("일주", pillars.day)}</p>
            <p className="mt-1">{row("시주", pillars.hour)}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/55 p-3 text-xs font-bold text-[#114b53]">
            <p>LOVE {score.love}</p>
            <p>CAREER {score.career}</p>
            <p>SOCIAL {score.social}</p>
            <p>LUCK {score.luck}</p>
          </div>

          <div className="mt-3 rounded-2xl border border-white/70 bg-white/55 p-3 text-xs text-[#1f545a]">
            <p><span className="font-bold">행운 컬러:</span> {animal.luck_essentials.color}</p>
            <p className="mt-1"><span className="font-bold">행운 아이템:</span> {animal.luck_essentials.item}</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/70 bg-white/45 p-3">
          <p className="text-xs font-semibold text-[#1f5960]">카드 문구</p>
          <p className="mt-1 text-sm font-semibold text-[#163f44]">“{animal.share_card.quote}”</p>
        </div>
      </div>
    </div>
  );
});

export default AnimalShareCard;
