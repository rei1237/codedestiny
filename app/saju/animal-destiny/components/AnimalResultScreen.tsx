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

type TabKey = "personality" | "love" | "career" | "relationship" | "growth";

const TAB_LABELS: Record<TabKey, string> = {
  personality: "성격",
  love: "연애",
  career: "진로",
  relationship: "인간관계",
  growth: "성장 미션",
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
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-100/25 bg-[linear-gradient(140deg,rgba(7,26,56,0.76),rgba(10,20,44,0.82))] p-5 shadow-[0_22px_54px_rgba(4,12,34,0.54)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 opacity-55">
          <CosmicSigil className="h-full w-full" />
        </div>
        <p className="relative text-xs font-black uppercase tracking-[0.2em] text-cyan-100/85">오늘의 대표 동물 프로필</p>
        <div className="mt-3 flex items-start gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-cyan-100/35 bg-cyan-50/10 text-5xl shadow-[0_10px_30px_rgba(29,136,183,0.3)]">
            <AnimalSymbol name={stageAnimalSymbol(twelveStages.day || twelveStages.primary)} size={68} className="text-cyan-50" />
          </div>
          <div className="min-w-0">
            <h3 className="text-2xl font-black text-white">{animal.animal_ko}</h3>
            <p className="text-sm font-semibold text-cyan-100">{animal.saju_stage} · {animal.stage_hanja}</p>
            <p className="mt-2 text-sm leading-relaxed text-cyan-50/92">{animal.short_copy}</p>
            <p className="mt-2 text-xs font-medium text-amber-100/90">{insights.heroLine}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-cyan-100/30 bg-slate-950/25 p-3 text-xs font-bold text-cyan-50">
          <p>LOVE {score.love}</p>
          <p>CAREER {score.career}</p>
          <p>SOCIAL {score.social}</p>
          <p>LUCK {score.luck}</p>
        </div>
        <p className="mt-2 text-[11px] text-cyan-100/72">점수는 확정 운명 판정이 아닌 현재 흐름을 읽기 위한 보조 지표입니다.</p>
      </div>

      <div className="rounded-[2rem] border border-cyan-100/22 bg-[linear-gradient(150deg,rgba(8,28,58,0.7),rgba(11,21,46,0.74))] p-4 shadow-[0_20px_46px_rgba(4,13,36,0.45)]">
        <h3 className="text-lg font-black text-cyan-50">네 기둥 십이운성 카드</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {PILLAR_ORDER.map((pillarKey) => {
            const item = pillarItems[pillarKey];
            const info = PILLAR_INFO[pillarKey];
            const keywords = keywordsByStage(item.stage);
            return (
              <article key={pillarKey} className="rounded-2xl border border-cyan-100/25 bg-cyan-50/10 p-3">
                <p className="text-xs font-black text-cyan-100">{info.label}</p>
                <p className="mt-1 text-lg">
                  <AnimalSymbol name={stageAnimalSymbol(item.stage)} size={30} className="text-cyan-50" />
                </p>
                <p className="text-sm font-bold text-white">{(item.stem || "-") + (item.branch || "-")}</p>
                <p className="text-sm font-semibold text-cyan-100">{item.stage || "시간 미입력"}</p>
                <p className="mt-1 text-[11px] text-cyan-100/75">{keywords.join(" · ")}</p>
                <p className="mt-1 text-[10px] text-cyan-50/55">{info.meaning}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="rounded-[2rem] border border-cyan-100/22 bg-[linear-gradient(150deg,rgba(8,28,58,0.7),rgba(11,21,46,0.74))] p-4 shadow-[0_20px_46px_rgba(4,13,36,0.45)]">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-12 shrink-0 rounded-full px-4 text-sm font-bold ${activeTab === tab ? "bg-[linear-gradient(120deg,#27d9f5,#7488ff)] text-[#071228]" : "bg-cyan-100/12 text-cyan-50"}`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-2xl border border-cyan-100/25 bg-slate-950/30 p-4 text-sm leading-7 text-cyan-50 motion-safe:animate-in motion-safe:fade-in">
          {activeTab === "personality" ? <p>{detail.personality}</p> : null}
          {activeTab === "love" ? <p>{detail.love}</p> : null}
          {activeTab === "career" ? <p>{detail.career}</p> : null}
          {activeTab === "relationship" ? <p>{detail.relationship}</p> : null}
          {activeTab === "growth" ? (
            <ul className="space-y-2">
              {detail.growthMissions.map((mission) => (
                <li key={mission} className="flex items-center gap-2 rounded-xl bg-cyan-100/12 p-3">
                  <DestinyIcon name="animalPaw" size={15} className="text-cyan-100" variant="soft" />
                  {mission}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-100/22 bg-cyan-100/10 p-3 text-xs text-cyan-50/90">
        <p className="font-semibold text-cyan-50">사주 근거 요약</p>
        <p className="mt-1">{insights.stageEvidence}</p>
        <p className="mt-1">일지 중심축: {twelveStages.primary || "-"} / 월지 보정: {twelveStages.month || "-"} / 년지 배경: {twelveStages.year || "-"}</p>
        <p className="mt-1">시지: {twelveStages.hour || "(시간 미상)"}</p>
      </div>

      <AnimalCompatibilityGrid animal={animal} partner={partner} onSubmitPartner={onSubmitPartner} />

      <div className="space-y-3 rounded-[2rem] border border-cyan-100/22 bg-[linear-gradient(150deg,rgba(8,28,58,0.7),rgba(11,21,46,0.74))] p-4 shadow-[0_20px_46px_rgba(4,13,36,0.45)]">
        <h3 className="text-lg font-black text-cyan-50">사주 동물점 홀로그램 카드</h3>
        <AnimalShareCard ref={shareCardRef} animal={animal} pillars={pillarItems} score={score} oneLine={oneLine} />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSaveCard}
            disabled={isExporting}
            className="min-h-12 rounded-full bg-[linear-gradient(120deg,#2be2ff,#6f8dff)] px-4 py-2 text-sm font-bold text-[#071228] disabled:opacity-60"
          >
            카드 저장하기
          </button>
          <button
            onClick={onSaveCard}
            disabled={isExporting}
            className="min-h-12 rounded-full bg-[linear-gradient(120deg,#ffd67b,#ffb36b)] px-4 py-2 text-sm font-bold text-[#3f2600] disabled:opacity-60"
          >
            인스타 스토리용 저장
          </button>
          <button
            onClick={onShareCard}
            disabled={isExporting}
            className="min-h-12 rounded-full bg-cyan-100/15 px-4 py-2 text-sm font-bold text-cyan-50 disabled:opacity-60"
          >
            결과 공유하기
          </button>
        </div>
        <p className="text-xs text-cyan-100/72">브라우저 환경에 따라 인스타 직접 업로드는 제한될 수 있으며, PNG 저장 후 업로드를 권장합니다.</p>
      </div>
    </section>
  );
}
