"use client";

import { RefObject } from "react";
import { buildAnimalNarrativeInsights } from "../lib/analysisNarrative";
import AnimalCareerPanel from "./AnimalCareerPanel";
import AnimalCharacterHero from "./AnimalCharacterHero";
import AnimalCompatibilityGrid from "./AnimalCompatibilityGrid";
import AnimalGameStats from "./AnimalGameStats";
import AnimalLovePanel from "./AnimalLovePanel";
import AnimalLuckItems from "./AnimalLuckItems";
import AnimalPersonalityPanel from "./AnimalPersonalityPanel";
import AnimalShareCard from "./AnimalShareCard";
import type { AnimalDestinyData, AnimalDestinyInput, PartnerResult, TwelveStagePillars } from "../lib/types";

interface Props {
  animal: AnimalDestinyData;
  twelveStages: TwelveStagePillars;
  timeUnknown?: boolean;
  partner: PartnerResult;
  shareCardRef: RefObject<HTMLDivElement>;
  onSubmitPartner: (input: AnimalDestinyInput) => Promise<void>;
  onSaveCard: () => void;
  isExporting: boolean;
}

export default function AnimalResultScreen({
  animal,
  twelveStages,
  timeUnknown,
  partner,
  shareCardRef,
  onSubmitPartner,
  onSaveCard,
  isExporting,
}: Props) {
  const insights = buildAnimalNarrativeInsights({
    animal,
    pillars: twelveStages,
    timeUnknown,
  });

  return (
    <section className="space-y-4">
      <AnimalCharacterHero animal={animal} heroLine={insights.heroLine} />

      <div className="rounded-2xl border border-[#d8e3cf] bg-white/70 p-3 text-xs text-[#4a5f4d]">
        <p className="font-semibold text-[#35503a]">사주 근거 요약</p>
        <p className="mt-1">{insights.stageEvidence}</p>
        <p className="mt-1">일지 중심축: {twelveStages.primary || "-"} / 월지 보정: {twelveStages.month || "-"} / 년지 배경: {twelveStages.year || "-"}</p>
        <p className="mt-1">시지: {twelveStages.hour || "(시간 미상)"}</p>
      </div>

      <AnimalGameStats animal={animal} insight={insights.statsLine} />
      <AnimalPersonalityPanel animal={animal} insight={insights.personalityLine} />
      <AnimalLovePanel animal={animal} insight={insights.loveLine} />
      <AnimalCareerPanel animal={animal} insight={insights.careerLine} />
      <AnimalLuckItems animal={animal} insight={insights.luckLine} />
      <AnimalCompatibilityGrid animal={animal} partner={partner} onSubmitPartner={onSubmitPartner} />

      <div className="space-y-3 rounded-2xl border border-[#d8e3cf] bg-white/70 p-4">
        <h3 className="text-lg font-black text-[#2d3f2f]">공유용 홀로그램 카드</h3>
        <AnimalShareCard ref={shareCardRef} animal={animal} />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSaveCard}
            disabled={isExporting}
            className="rounded-full bg-[#ff8a65] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            카드 저장하기
          </button>
          <button
            onClick={onSaveCard}
            disabled={isExporting}
            className="rounded-full bg-[#4db6ac] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            인스타 스토리용 저장
          </button>
          <button
            onClick={onSaveCard}
            disabled={isExporting}
            className="rounded-full bg-[#607d8b] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            결과 공유하기
          </button>
        </div>
      </div>
    </section>
  );
}
