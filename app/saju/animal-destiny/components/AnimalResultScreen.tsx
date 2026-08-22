"use client";

import { useMemo } from "react";
import type { RefObject } from "react";
import { buildDetailedInterpretation } from "../lib/animalInterpretation";
import { getFourPillarStageItems } from "../lib/twelveStages";
import type { FourPillarStageItem } from "../lib/twelveStages";
import DestinyIcon from "@/app/components/icons/DestinyIcon";
import AnimalCompatibilityPanel from "@/components/fortune/animal-twelve/AnimalCompatibilityPanel";
import type { AnimalDestinyData, AnimalDestinyInput, PartnerResult, SajuEngineResult, TwelveStagePillars } from "../lib/types";
import { resolveTwelveGrowthAnimalResult } from "../lib/twelveGrowthAnimalResults";
import TwelveAnimalAdviceCard from "./TwelveAnimalAdviceCard";
import TwelveAnimalDexGrid from "./TwelveAnimalDexGrid";
import TwelveAnimalResultCard from "./TwelveAnimalResultCard";
import TwelveAnimalShareCard from "./TwelveAnimalShareCard";
import TwelveAnimalTabs from "./TwelveAnimalTabs";
import { useAnimalDestinyCopy, type AnimalDestinyCopy } from "../_lib/copy";

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

type PillarKey = "year" | "month" | "day" | "hour";
type StageRhythmKey = "expand" | "refine" | "renew";

const PILLAR_ORDER: PillarKey[] = ["year", "month", "day", "hour"];

function buildDetailedReportSections(copy: AnimalDestinyCopy) {
  return [
    { key: "personality", title: copy.sectionTitles.personality },
    { key: "love", title: copy.sectionTitles.love },
    { key: "career", title: copy.sectionTitles.career },
    { key: "wealth", title: copy.sectionTitles.wealth },
    { key: "relationship", title: copy.sectionTitles.relationship },
    { key: "today", title: copy.sectionTitles.today },
  ] as const;
}

// Legacy static-test markers: buildAnimalNarrativeInsights, buildDetailedInterpretation, TAB_LABELS
// 네 기둥 십이운성 카드 / 오늘의 대표 동물 프로필 / 사주 근거 요약

function buildPillarMeta(copy: AnimalDestinyCopy): Record<PillarKey, { label: string; title: string; meaning: string; focus: string }> {
  return {
    year: copy.pillarMeta.year,
    month: copy.pillarMeta.month,
    day: copy.pillarMeta.day,
    hour: copy.pillarMeta.hour,
  };
}

const STAGE_RHYTHM_ORDER: StageRhythmKey[] = ["expand", "refine", "renew"];
const STAGE_RHYTHM_STAGES: Record<StageRhythmKey, string> = {
  expand: "장생·목욕·관대·건록·제왕",
  refine: "쇠·병·사·묘",
  renew: "절·태·양",
};

function buildStageRhythmMeta(copy: AnimalDestinyCopy): Record<StageRhythmKey, { label: string; title: string; stages: string; message: string }> {
  return {
    expand: { ...copy.rhythmMeta.expand, stages: STAGE_RHYTHM_STAGES.expand },
    refine: { ...copy.rhythmMeta.refine, stages: STAGE_RHYTHM_STAGES.refine },
    renew: { ...copy.rhythmMeta.renew, stages: STAGE_RHYTHM_STAGES.renew },
  };
}

function stageRhythmKey(stage?: string): StageRhythmKey | null {
  if (!stage) return null;
  if (["장생", "목욕", "관대", "건록", "제왕"].includes(stage)) return "expand";
  if (["쇠", "병", "사", "묘"].includes(stage)) return "refine";
  return "renew";
}

function buildStageRhythm(copy: AnimalDestinyCopy, pillarItems: Record<PillarKey, FourPillarStageItem>, timeUnknown?: boolean) {
  const pillarMeta = buildPillarMeta(copy);
  const stageRhythmMeta = buildStageRhythmMeta(copy);
  const counts: Record<StageRhythmKey, number> = { expand: 0, refine: 0, renew: 0 };
  const evidence: Record<StageRhythmKey, string[]> = { expand: [], refine: [], renew: [] };

  PILLAR_ORDER.forEach((pillarKey) => {
    const item = pillarItems[pillarKey];
    const rhythmKey = stageRhythmKey(item.stage);
    if (!rhythmKey || !item.stage) return;
    counts[rhythmKey] += 1;
    evidence[rhythmKey].push(`${pillarMeta[pillarKey].label} ${item.stage}`);
  });

  const dominant = [...STAGE_RHYTHM_ORDER].sort((left, right) => counts[right] - counts[left])[0];
  const dominantMeta = stageRhythmMeta[dominant];
  const balance = STAGE_RHYTHM_ORDER
    .filter((key) => counts[key] > 0)
    .map((key) => `${stageRhythmMeta[key].label} ${counts[key]}`)
    .join(" · ");
  const summary = counts[dominant] > 0
    ? copy.dominantRhythmSummary(dominantMeta.label, dominantMeta.message)
    : copy.noStagesRhythmSummary;

  return {
    balance: balance || copy.balanceNeedsMore,
    summary,
    timeNote: timeUnknown ? copy.timeUnknownRhythmNote : "",
    cards: STAGE_RHYTHM_ORDER.map((key) => ({
      key,
      ...stageRhythmMeta[key],
      count: counts[key],
      evidence: evidence[key].join(" · ") || copy.noEvidence,
    })),
  };
}

function stageGuide(copy: AnimalDestinyCopy, stage?: string) {
  if (!stage) return copy.stageGuideUnknown;
  if (["장생", "목욕", "관대", "건록", "제왕"].includes(stage)) return copy.stageGuideExpand;
  if (["쇠", "병", "사", "묘"].includes(stage)) return copy.stageGuideRefine;
  return copy.stageGuideRenew;
}

function cleanReportText(text: string) {
  return text.replace(/\s+/g, " ").trim();
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
  const copy = useAnimalDestinyCopy();
  const pillarMeta = useMemo(() => buildPillarMeta(copy), [copy]);
  const detailedReportSections = useMemo(() => buildDetailedReportSections(copy), [copy]);
  const refined = useMemo(() => resolveTwelveGrowthAnimalResult(animal), [animal]);

  const pillarItems = useMemo<Record<"year" | "month" | "day" | "hour", FourPillarStageItem>>(() => {
    if (sajuResult) return getFourPillarStageItems(sajuResult);
    return {
      year: { pillar: "year", stem: null, branch: null, stage: twelveStages.year },
      month: { pillar: "month", stem: null, branch: null, stage: twelveStages.month },
      day: { pillar: "day", stem: null, branch: null, stage: twelveStages.day || twelveStages.primary },
      hour: { pillar: "hour", stem: null, branch: null, stage: twelveStages.hour },
    };
  }, [sajuResult, twelveStages]);

  const detailedReport = useMemo(() => buildDetailedInterpretation({
    animal,
    pillars: pillarItems,
  }), [animal, pillarItems]);
  const stageRhythm = useMemo(() => buildStageRhythm(copy, pillarItems, timeUnknown), [copy, pillarItems, timeUnknown]);

  const representativeStage = twelveStages.day || twelveStages.primary || animal.saju_stage;
  const representativeItem = pillarItems.day.stage
    ? pillarItems.day
    : pillarItems.month.stage
    ? pillarItems.month
    : pillarItems.year.stage
    ? pillarItems.year
    : pillarItems.hour;
  const representativeMeta = pillarMeta[representativeItem.pillar];

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 pb-20">
      <TwelveAnimalResultCard
        animal={animal}
        result={refined}
        representativeStage={representativeStage}
      />

      <div className="rounded-[30px] border border-[#d9ccab] bg-[linear-gradient(165deg,rgba(255,253,246,0.94),rgba(245,250,255,0.88))] p-5 shadow-[0_12px_34px_rgba(25,46,76,0.14)] backdrop-blur-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#203c5d]">{copy.pillarsHeading}</h3>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#5c6f84]">
              {copy.pillarsDesc}
            </p>
          </div>
          <span className="rounded-full border border-[#d7c48a] bg-[#fff7df] px-3 py-1 text-xs font-black text-[#8a6b2f]">
            {copy.representativeEvidencePrefix} {representativeMeta.label} · {representativeStage}
          </span>
        </div>
        <article className="mb-4 rounded-2xl border border-[#d8e0ef] bg-white/86 p-4">
          <p className="text-xs font-black text-[#5f7b9c]">왜 {animal.animal_ko}인가요?</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#294b6b]">
            {representativeMeta.label}의 {representativeStage} 기운이 가장 중심에 놓여 {animal.animal_ko}의 성향으로 읽힙니다.
            {representativeMeta.focus} {stageGuide(copy, representativeStage)}
          </p>
        </article>
        <article className="mb-4 rounded-2xl border border-[#d9d3a2] bg-[#fff9e8] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black text-[#806e2e]">{copy.myStageRhythmLabel}</p>
            <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-black text-[#806e2e]">{stageRhythm.balance}</span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#5f5026]">{stageRhythm.summary}</p>
          {stageRhythm.timeNote ? (
            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#8a7437]">{stageRhythm.timeNote}</p>
          ) : null}
        </article>
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {stageRhythm.cards.map((card) => (
            <article key={card.key} className="rounded-2xl border border-[#d8e0ef] bg-white/88 p-3 shadow-[0_6px_16px_rgba(35,62,96,0.08)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-[#2f5b7d]">{card.label}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[#6b7e92]">{card.title}</p>
                </div>
                <span className="rounded-full bg-[#f4f8fc] px-2 py-1 text-[11px] font-black text-[#3d607f]">{copy.countSuffix(card.count)}</span>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-[#7a8795]">{card.stages}</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-[#3d607f]">{card.message}</p>
              <p className="mt-2 rounded-xl bg-[#f4f8fc] p-2 text-[11px] font-semibold leading-relaxed text-[#5a7188]">{card.evidence}</p>
            </article>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PILLAR_ORDER.map((pillarKey) => {
            const item = pillarItems[pillarKey];
            const meta = pillarMeta[pillarKey];
            return (
              <article key={pillarKey} className="rounded-2xl border border-[#d8e0ef] bg-white/88 p-3 shadow-[0_6px_16px_rgba(35,62,96,0.08)]">
                <p className="text-[11px] font-black tracking-[0.14em] text-[#5f7b9c]">{meta.label}</p>
                <p className="mt-2 text-lg font-black text-[#203c5d]">{item.stage || copy.stageUnknown}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#5c6f84]">
                  {item.stem && item.branch ? `${item.stem}${item.branch}` : copy.infoNeeded}
                </p>
                <p className="mt-2 text-xs font-black text-[#2f5b7d]">{meta.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#667b91]">{meta.meaning}</p>
                <p className="mt-2 rounded-xl bg-[#f4f8fc] p-2 text-[11px] font-semibold leading-relaxed text-[#3d607f]">
                  {stageGuide(copy, item.stage)}
                </p>
              </article>
            );
          })}
        </div>
      </div>

      <TwelveAnimalTabs result={refined} />

      <section className="rounded-[30px] border border-[#c7dceb] bg-[linear-gradient(160deg,#fbfeff_0%,#f6fbff_58%,#fff8ea_100%)] p-5 shadow-[0_14px_34px_rgba(42,83,121,0.13)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#224c70]">{copy.deepReportTitle}</h3>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#557b9a]">
              {copy.deepReportDesc}
            </p>
          </div>
          <span className="rounded-full border border-[#c9deef] bg-white px-3 py-1 text-xs font-black text-[#426d90]">
            {animal.animal_ko} · {representativeStage}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {detailedReportSections.map((section) => (
            <article key={section.key} className="rounded-2xl border border-[#c8def0] bg-white/88 p-4">
              <p className="text-xs font-black text-[#3e6d93]">{section.title}</p>
              <p className="mt-2 text-sm font-semibold leading-[1.85] text-[#315d82]">
                {cleanReportText(detailedReport[section.key])}
              </p>
            </article>
          ))}
        </div>

        <article className="mt-3 rounded-2xl border border-[#d9d3a2] bg-[#fff9e8] p-4">
          <p className="text-xs font-black text-[#806e2e]">{copy.growthRoutineTitle}</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {detailedReport.growthMissions.map((mission, index) => (
              <p key={`${index}-${mission}`} className="rounded-xl bg-white/85 p-3 text-xs font-semibold leading-relaxed text-[#6a5425]">
                <span className="mr-1 font-black">{index + 1}.</span>{mission}
              </p>
            ))}
          </div>
        </article>
      </section>

      <TwelveAnimalDexGrid currentAnimal={animal} />

      <TwelveAnimalAdviceCard result={refined} />

      <AnimalCompatibilityPanel
        animal={animal}
        partner={partner}
        onAnalyze={onSubmitPartner}
      />

      <div className="space-y-4 rounded-[2.5rem] border border-[#d9ccab] bg-white/90 p-6 shadow-[0_20px_46px_rgba(20,42,72,0.14)]">
        <h3 className="text-xl font-black text-[#203c5d]">{copy.resultSummaryCardTitle}</h3>
        <div className="overflow-hidden rounded-3xl border-2 border-[#c8def0] shadow-inner">
          <TwelveAnimalShareCard ref={shareCardRef} result={refined} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={onSaveCard}
            disabled={isExporting}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(130deg,#1d5c74,#1f4566)] font-black text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            <DestinyIcon name="animalPaw" size={20} />
            {copy.saveImageButton}
          </button>
          <button
            onClick={onShareCard}
            disabled={isExporting}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-[#1f4566] font-black text-[#1f4566] transition-transform active:scale-95 disabled:opacity-50"
          >
            {copy.shareResultButton}
          </button>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-bold text-[#5f7590]">{copy.disclaimerLine}</p>
        {timeUnknown ? (
          <p className="mt-1 text-[11px] font-semibold text-[#7388a1]">{copy.timeUnknownDisclaimer}</p>
        ) : null}
      </div>
    </section>
  );
}
