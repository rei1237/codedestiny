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

function stageEmoji(stage?: string) {
  if (!stage) return "✨";
  const map: Record<string, string> = {
    장생: "🐆",
    목욕: "🐵",
    관대: "🐈‍⬛",
    건록: "🐨",
    제왕: "🐯",
    쇠: "🦝",
    병: "🦏",
    사: "🐘",
    묘: "🐑",
    절: "🪽",
    태: "🐺",
    양: "🦌",
  };
  return map[stage] || "🐾";
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
      <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-lime-50 via-emerald-50 to-sky-50 p-5 shadow-xl shadow-emerald-900/10 ring-1 ring-white/60 backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">오늘의 대표 동물 프로필</p>
        <div className="mt-3 flex items-start gap-4">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-white/70 bg-white/70 text-5xl shadow-md">
            {stageEmoji(twelveStages.day || twelveStages.primary)}
          </div>
          <div className="min-w-0">
            <h3 className="text-2xl font-black text-emerald-950">{animal.animal_ko}</h3>
            <p className="text-sm font-semibold text-emerald-700">{animal.saju_stage} · {animal.stage_hanja}</p>
            <p className="mt-2 text-sm leading-relaxed text-emerald-900">{animal.short_copy}</p>
            <p className="mt-2 text-xs font-medium text-emerald-700">{insights.heroLine}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/65 p-3 text-xs font-bold text-emerald-900">
          <p>LOVE {score.love}</p>
          <p>CAREER {score.career}</p>
          <p>SOCIAL {score.social}</p>
          <p>LUCK {score.luck}</p>
        </div>
        <p className="mt-2 text-[11px] text-emerald-700">점수는 절대적 운명 판정이 아니라 재미 기반 보조 지표입니다.</p>
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-emerald-50 via-lime-50 to-cyan-50 p-4 shadow-xl shadow-emerald-900/10 ring-1 ring-white/60 backdrop-blur-xl">
        <h3 className="text-lg font-black text-emerald-950">네 기둥 십이운성 카드</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {PILLAR_ORDER.map((pillarKey) => {
            const item = pillarItems[pillarKey];
            const info = PILLAR_INFO[pillarKey];
            const keywords = keywordsByStage(item.stage);
            return (
              <article key={pillarKey} className="rounded-2xl border border-white/70 bg-white/75 p-3">
                <p className="text-xs font-black text-emerald-700">{info.label}</p>
                <p className="mt-1 text-lg">{stageEmoji(item.stage)}</p>
                <p className="text-sm font-bold text-emerald-950">{(item.stem || "-") + (item.branch || "-")}</p>
                <p className="text-sm font-semibold text-emerald-700">{item.stage || "시간 미입력"}</p>
                <p className="mt-1 text-[11px] text-emerald-700">{keywords.join(" · ")}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/70 bg-white/75 p-4 shadow-xl shadow-emerald-900/10 ring-1 ring-white/60">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-h-12 shrink-0 rounded-full px-4 text-sm font-bold ${activeTab === tab ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-800"}`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm leading-7 text-emerald-950 motion-safe:animate-in motion-safe:fade-in">
          {activeTab === "personality" ? <p>{detail.personality}</p> : null}
          {activeTab === "love" ? <p>{detail.love}</p> : null}
          {activeTab === "career" ? <p>{detail.career}</p> : null}
          {activeTab === "relationship" ? <p>{detail.relationship}</p> : null}
          {activeTab === "growth" ? (
            <ul className="space-y-2">
              {detail.growthMissions.map((mission) => (
                <li key={mission} className="rounded-xl bg-emerald-50 p-3">🐾 {mission}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-[#d8e3cf] bg-white/70 p-3 text-xs text-[#4a5f4d]">
        <p className="font-semibold text-[#35503a]">사주 근거 요약</p>
        <p className="mt-1">{insights.stageEvidence}</p>
        <p className="mt-1">일지 중심축: {twelveStages.primary || "-"} / 월지 보정: {twelveStages.month || "-"} / 년지 배경: {twelveStages.year || "-"}</p>
        <p className="mt-1">시지: {twelveStages.hour || "(시간 미상)"}</p>
      </div>

      <AnimalCompatibilityGrid animal={animal} partner={partner} onSubmitPartner={onSubmitPartner} />

      <div className="space-y-3 rounded-[2rem] border border-white/70 bg-gradient-to-br from-lime-50 via-emerald-50 to-sky-50 p-4 shadow-xl shadow-emerald-900/10 ring-1 ring-white/60">
        <h3 className="text-lg font-black text-[#2d3f2f]">사주 동물점 홀로그램 카드</h3>
        <AnimalShareCard ref={shareCardRef} animal={animal} pillars={pillarItems} score={score} oneLine={oneLine} />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSaveCard}
            disabled={isExporting}
            className="min-h-12 rounded-full bg-[#ff8a65] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            카드 저장하기
          </button>
          <button
            onClick={onSaveCard}
            disabled={isExporting}
            className="min-h-12 rounded-full bg-[#4db6ac] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            인스타 스토리용 저장
          </button>
          <button
            onClick={onShareCard}
            disabled={isExporting}
            className="min-h-12 rounded-full bg-[#607d8b] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            결과 공유하기
          </button>
        </div>
        <p className="text-xs text-[#547060]">브라우저 환경에 따라 인스타 직접 업로드는 제한될 수 있으며, PNG 저장 후 업로드를 권장합니다.</p>
      </div>
    </section>
  );
}
