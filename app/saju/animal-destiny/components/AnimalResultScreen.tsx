"use client";

import { useMemo, useState } from "react";
import { RefObject } from "react";
import { buildAnimalNarrativeInsights } from "../lib/analysisNarrative";
import AnimalCompatibilityGrid from "./AnimalCompatibilityGrid";
import { getStageScore } from "../lib/stageScore";
import { buildDetailedInterpretation, PILLAR_INFO } from "../lib/animalInterpretation";
import { getFourPillarStageItems } from "../lib/twelveStages";
import type { FourPillarStageItem } from "../lib/twelveStages";
import AnimalShareCard from "./AnimalShareCard";
import AnimalSymbol, { type AnimalSymbolName } from "@/app/components/icons/AnimalSymbol";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import CosmicSigil from "./CosmicSigil";
import type { AnimalDestinyData, AnimalDestinyInput, PartnerResult, SajuEngineResult, TwelveStagePillars } from "../lib/types";

type TabKey = "personality" | "love" | "career" | "wealth" | "relationship" | "today" | "compatibility";

const TAB_LABELS: Record<TabKey, string> = {
  personality: "기본 성격",
  love: "연애 스타일",
  career: "진로/재능",
  wealth: "재물 감각",
  relationship: "인간관계",
  today: "오늘의 활용법",
  compatibility: "궁합 보기",
};

const PILLAR_ORDER: Array<"year" | "month" | "day" | "hour"> = ["year", "month", "day", "hour"];

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

function keywordsByStage(stage?: string) {
  if (!stage) return ["균형", "관찰", "회복"];
  const map: Record<string, string[]> = {
    장생: ["생명력", "호기심", "출발"],
    목욕: ["감성", "매력", "표현"],
    관대: ["도전", "성장", "평판"],
    건록: ["자립", "실력", "책임"],
    제왕: ["주도", "리더십", "카리스마"],
    쇠: ["성숙", "절제", "안정"],
    병: ["예민", "관찰", "회복"],
    사: ["정리", "통찰", "전환"],
    묘: ["축적", "관리", "내면"],
    절: ["리셋", "독립", "재시작"],
    태: ["가능성", "상상력", "유연"],
    양: ["보호", "돌봄", "준비"],
  };
  return map[stage] || ["균형", "관찰", "회복"];
}

interface Props {
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
}

import AnimalSummaryCard from "./AnimalSummaryCard";

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
  const [activeTab, setActiveTab] = useState<TabKey>("personality");

  const pillarItems = useMemo<Record<"year" | "month" | "day" | "hour", FourPillarStageItem>>(() => {
    if (sajuResult) return getFourPillarStageItems(sajuResult);
    return {
      year: { pillar: "year", stem: null, branch: null, stage: twelveStages.year },
      month: { pillar: "month", stem: null, branch: null, stage: twelveStages.month },
      day: { pillar: "day", stem: null, branch: null, stage: twelveStages.day || twelveStages.primary },
      hour: { pillar: "hour", stem: null, branch: null, stage: twelveStages.hour },
    };
  }, [sajuResult, twelveStages]);

  const insights = buildAnimalNarrativeInsights({
    animal,
    pillars: twelveStages,
    timeUnknown,
  });

  const detail = buildDetailedInterpretation({
    animal,
    pillars: pillarItems,
  });

  const score = getStageScore(twelveStages.day || twelveStages.primary);
  const oneLine = `${animal.short_copy}. ${insights.heroLine}`;

  return (
    <section className="mx-auto max-w-2xl space-y-8 pb-20">
      {/* 1. Summary Card (Poster Style) */}
      <AnimalSummaryCard
        animal={animal}
        primaryStage={twelveStages.day || twelveStages.primary}
        pillarLabel={PILLAR_INFO.day.label}
        score={score}
        oneLine={oneLine}
      />

      {/* 2. Four Pillars Detail */}
      <div className="rounded-[2.5rem] border border-[#EAD8B1]/40 bg-white/60 p-6 shadow-sm backdrop-blur-sm">
        <h3 className="mb-4 text-lg font-black text-[#634832]">사주 기둥별 운명 카드</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PILLAR_ORDER.map((pillarKey) => {
            const item = pillarItems[pillarKey];
            const info = PILLAR_INFO[pillarKey];
            const keywords = keywordsByStage(item.stage);
            return (
              <article key={pillarKey} className="flex flex-col items-center rounded-2xl border border-[#EAD8B1]/30 bg-[#FFFBEB]/50 p-3 text-center">
                <p className="text-[10px] font-black text-[#B88E2F] uppercase">{info.label}</p>
                <div className="my-2 text-2xl">
                  <AnimalSymbol name={stageAnimalSymbol(item.stage)} size={32} className="text-[#634832]" />
                </div>
                <p className="text-xs font-bold text-[#634832]">{item.stage || "미지"}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {keywords.slice(0, 2).map(k => (
                    <span key={k} className="rounded-full bg-[#634832]/5 px-1.5 py-0.5 text-[9px] text-[#634832]/70">{k}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* 3. Detailed Tabs */}
      <div className="rounded-[2.5rem] border border-[#EAD8B1]/40 bg-white/80 p-2 shadow-lg">
        <div className="no-scrollbar flex gap-1 overflow-x-auto p-1">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-11 shrink-0 whitespace-nowrap rounded-full px-5 text-sm font-bold transition-all ${
                activeTab === tab 
                  ? "bg-[#634832] text-white shadow-md" 
                  : "text-[#634832]/60 hover:bg-[#634832]/5"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="min-h-[300px] p-5">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-base leading-relaxed text-[#634832]"
          >
            {activeTab === "personality" && <div className="space-y-4 whitespace-pre-wrap">{detail.personality}</div>}
            {activeTab === "love" && <div className="space-y-4 whitespace-pre-wrap">{detail.love}</div>}
            {activeTab === "career" && <div className="space-y-4 whitespace-pre-wrap">{detail.career}</div>}
            {activeTab === "wealth" && <div className="space-y-4 whitespace-pre-wrap">{detail.wealth}</div>}
            {activeTab === "relationship" && <div className="space-y-4 whitespace-pre-wrap">{detail.relationship}</div>}
            {activeTab === "today" && <div className="space-y-4 whitespace-pre-wrap">{detail.today}</div>}
            {activeTab === "compatibility" && (
              <AnimalCompatibilityGrid animal={animal} partner={partner} onSubmitPartner={onSubmitPartner} />
            )}
          </motion.div>
        </div>
      </div>

      {/* 4. Share & Action */}
      <div className="space-y-4 rounded-[2.5rem] border border-[#EAD8B1]/40 bg-white/90 p-6 shadow-xl">
        <h3 className="text-xl font-black text-[#634832]">운명 증명서 발급</h3>
        <div className="overflow-hidden rounded-3xl border-4 border-[#EAD8B1] shadow-inner">
          <AnimalShareCard ref={shareCardRef} animal={animal} pillars={pillarItems} score={score} oneLine={oneLine} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={onSaveCard}
            disabled={isExporting}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#634832] font-black text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            <DestinyIcon name="animalPaw" size={20} />
            이미지로 저장하기
          </button>
          <button
            onClick={onShareCard}
            disabled={isExporting}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#634832] font-black text-[#634832] transition-transform active:scale-95 disabled:opacity-50"
          >
            결과 공유하기
          </button>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold text-[#B88E2F]/60">
          사주 팔자와 십이운성의 흐름을 바탕으로 분석된 결과입니다.
        </p>
      </div>
    </section>
  );
}
  );
}
