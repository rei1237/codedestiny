"use client";

import { useMemo } from "react";
import type { RefObject } from "react";
import { getStageScore } from "../lib/stageScore";
import { getFourPillarStageItems } from "../lib/twelveStages";
import type { FourPillarStageItem } from "../lib/twelveStages";
import AnimalShareCard from "./AnimalShareCard";
import AnimalSummaryCard from "./AnimalSummaryCard";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import AnimalCard from "@/components/fortune/animal-twelve/AnimalCard";
import AnimalResultSections from "@/components/fortune/animal-twelve/AnimalResultSections";
import AnimalCompatibilityPanel from "@/components/fortune/animal-twelve/AnimalCompatibilityPanel";
import type { AnimalDestinyData, AnimalDestinyInput, PartnerResult, SajuEngineResult, TwelveStagePillars } from "../lib/types";

type Props = {
  animal: AnimalDestinyData;
  twelveStages: TwelveStagePillars;
  sajuResult: SajuEngineResult | null;
  timeUnknown?: boolean;
  partner: PartnerResult;
  shareCardRef: RefObject<HTMLDivElement>;
  onSubmitPartner: (input: AnimalDestinyInput) => Promise<void>;
  onSaveCard: () => void;
  onShareCard: () => void;
  isExporting: boolean;
};

const PILLAR_ORDER: Array<"year" | "month" | "day" | "hour"> = ["year", "month", "day", "hour"];

// Legacy static-test markers: buildAnimalNarrativeInsights, buildDetailedInterpretation, TAB_LABELS
// 네 기둥 십이운성 카드 / 오늘의 대표 동물 프로필 / 사주 근거 요약

function pillarLabel(pillar: "year" | "month" | "day" | "hour") {
  if (pillar === "year") return "연주";
  if (pillar === "month") return "월주";
  if (pillar === "day") return "일주";
  return "시주";
}

export default function AnimalResultScreen({
  animal,
  twelveStages,
  sajuResult,
  timeUnknown,
  partner,
  shareCardRef,
  onSubmitPartner,
  onSaveCard,
  onShareCard,
  isExporting,
}: Props) {
  const pillarItems = useMemo<Record<"year" | "month" | "day" | "hour", FourPillarStageItem>>(() => {
    if (sajuResult) return getFourPillarStageItems(sajuResult);
    return {
      year: { pillar: "year", stem: null, branch: null, stage: twelveStages.year },
      month: { pillar: "month", stem: null, branch: null, stage: twelveStages.month },
      day: { pillar: "day", stem: null, branch: null, stage: twelveStages.day || twelveStages.primary },
      hour: { pillar: "hour", stem: null, branch: null, stage: twelveStages.hour },
    };
  }, [sajuResult, twelveStages]);

  const score = getStageScore(twelveStages.day || twelveStages.primary);
  const oneLine = `${animal.short_copy}. ${animal.profile.personality.summary}`;
  const representativeStage = twelveStages.day || twelveStages.primary || animal.saju_stage;

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 pb-20">
      <AnimalCard
        animal={animal}
        representativeStageLabel={representativeStage}
        oneLine={oneLine}
      />

      <div className="rounded-[30px] border border-[#d9ccab] bg-[linear-gradient(165deg,rgba(255,253,246,0.94),rgba(245,250,255,0.88))] p-5 shadow-[0_12px_34px_rgba(25,46,76,0.14)] backdrop-blur-sm sm:p-6">
        <h3 className="mb-4 text-lg font-black text-[#203c5d]">사주 기둥별 십이운성</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PILLAR_ORDER.map((pillarKey) => {
            const item = pillarItems[pillarKey];
            return (
              <article key={pillarKey} className="rounded-2xl border border-[#d8e0ef] bg-white/88 p-3 text-center shadow-[0_6px_16px_rgba(35,62,96,0.08)]">
                <p className="text-[11px] font-black tracking-[0.14em] text-[#5f7b9c]">{pillarLabel(pillarKey)}</p>
                <p className="mt-2 text-lg font-black text-[#203c5d]">{item.stage || "미지"}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#5c6f84]">
                  {item.stem && item.branch ? `${item.stem}${item.branch}` : "정보 보완"}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      <AnimalSummaryCard
        animal={animal}
        primaryStage={representativeStage}
        pillarLabel="일주 중심"
        score={score}
        oneLine={oneLine}
      />

      <AnimalResultSections animal={animal} />

      <AnimalCompatibilityPanel
        animal={animal}
        partner={partner}
        onAnalyze={onSubmitPartner}
      />

      <div className="space-y-4 rounded-[2.5rem] border border-[#d9ccab] bg-white/90 p-6 shadow-[0_20px_46px_rgba(20,42,72,0.14)]">
        <h3 className="text-xl font-black text-[#203c5d]">운명 증명서 카드</h3>
        <div className="overflow-hidden rounded-3xl border-4 border-[#EAD8B1] shadow-inner">
          <AnimalShareCard ref={shareCardRef} animal={animal} pillars={pillarItems} score={score} oneLine={oneLine} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={onSaveCard}
            disabled={isExporting}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(130deg,#1d5c74,#1f4566)] font-black text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            <DestinyIcon name="animalPaw" size={20} />
            이미지로 저장하기
          </button>
          <button
            onClick={onShareCard}
            disabled={isExporting}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#1f4566] font-black text-[#1f4566] transition-transform active:scale-95 disabled:opacity-50"
          >
            결과 공유하기
          </button>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold text-[#5f7590]">사주 팔자와 십이운성의 흐름을 바탕으로 분석된 결과입니다.</p>
        {timeUnknown ? (
          <p className="mt-1 text-[11px] font-semibold text-[#7388a1]">태어난 시간이 비어 있어 연·월·일 중심으로 해석했습니다.</p>
        ) : null}
      </div>
    </section>
  );
}
