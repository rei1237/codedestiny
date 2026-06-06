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
const DETAILED_REPORT_SECTIONS = [
  { key: "personality", title: "본질 성격" },
  { key: "love", title: "연애 흐름" },
  { key: "career", title: "일과 진로" },
  { key: "wealth", title: "재물 감각" },
  { key: "relationship", title: "관계 방식" },
  { key: "today", title: "오늘의 개운" },
] as const;

// Legacy static-test markers: buildAnimalNarrativeInsights, buildDetailedInterpretation, TAB_LABELS
// 네 기둥 십이운성 카드 / 오늘의 대표 동물 프로필 / 사주 근거 요약

const PILLAR_META: Record<"year" | "month" | "day" | "hour", { label: string; title: string; meaning: string; focus: string }> = {
  year: {
    label: "연주",
    title: "바깥 인상",
    meaning: "사회적 첫인상, 어린 시절의 분위기, 넓은 인간관계",
    focus: "처음 만나는 사람 앞에서 어떤 에너지로 기억되는지 보여줍니다.",
  },
  month: {
    label: "월주",
    title: "사회 운영",
    meaning: "직업성, 성장 환경, 실무 감각, 현실 대응 방식",
    focus: "일과 책임을 맡을 때 어떤 방식으로 성과를 만드는지 보여줍니다.",
  },
  day: {
    label: "일주",
    title: "본질과 친밀감",
    meaning: "나의 본질, 연애 방식, 배우자궁, 가까운 관계",
    focus: "대표 동물을 정하는 핵심 축이며, 마음을 여는 방식과 가장 깊게 연결됩니다.",
  },
  hour: {
    label: "시주",
    title: "잠재력",
    meaning: "미래 방향, 창의성, 후반 운, 깊은 욕망",
    focus: "시간 정보가 있을 때 숨은 재능과 후반부 성장 방향을 보완합니다.",
  },
};

function stageGuide(stage?: string) {
  if (!stage) return "입력 정보가 부족해 이 축은 보조 해석에서 제외했습니다.";
  if (["장생", "목욕", "관대", "건록", "제왕"].includes(stage)) {
    return "확장성이 강하므로 기회를 열고 사람 앞에 드러날수록 운이 선명해집니다.";
  }
  if (["쇠", "병", "사", "묘"].includes(stage)) {
    return "정비력이 강하므로 속도를 줄이고 기준을 세울수록 실속이 커집니다.";
  }
  return "전환성이 강하므로 낡은 방식을 비우고 새 리듬을 실험할수록 길이 열립니다.";
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

  const representativeStage = twelveStages.day || twelveStages.primary || animal.saju_stage;
  const representativeItem = pillarItems.day.stage
    ? pillarItems.day
    : pillarItems.month.stage
    ? pillarItems.month
    : pillarItems.year.stage
    ? pillarItems.year
    : pillarItems.hour;
  const representativeMeta = PILLAR_META[representativeItem.pillar];

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
            <h3 className="text-lg font-black text-[#203c5d]">사주 기둥별 십이운성 근거</h3>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#5c6f84]">
              일간을 기준으로 네 지지의 운성 흐름을 대조해 대표 동물과 생활 영역별 조언을 구성했습니다.
            </p>
          </div>
          <span className="rounded-full border border-[#d7c48a] bg-[#fff7df] px-3 py-1 text-xs font-black text-[#8a6b2f]">
            대표 근거: {representativeMeta.label} · {representativeStage}
          </span>
        </div>
        <article className="mb-4 rounded-2xl border border-[#d8e0ef] bg-white/86 p-4">
          <p className="text-xs font-black text-[#5f7b9c]">왜 {animal.animal_ko}인가요?</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#294b6b]">
            {representativeMeta.label}의 {representativeStage} 기운이 가장 중심에 놓여 {animal.animal_ko}의 성향으로 읽힙니다.
            {representativeMeta.focus} {stageGuide(representativeStage)}
          </p>
        </article>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PILLAR_ORDER.map((pillarKey) => {
            const item = pillarItems[pillarKey];
            const meta = PILLAR_META[pillarKey];
            return (
              <article key={pillarKey} className="rounded-2xl border border-[#d8e0ef] bg-white/88 p-3 shadow-[0_6px_16px_rgba(35,62,96,0.08)]">
                <p className="text-[11px] font-black tracking-[0.14em] text-[#5f7b9c]">{meta.label}</p>
                <p className="mt-2 text-lg font-black text-[#203c5d]">{item.stage || "미상"}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#5c6f84]">
                  {item.stem && item.branch ? `${item.stem}${item.branch}` : "정보 보완"}
                </p>
                <p className="mt-2 text-xs font-black text-[#2f5b7d]">{meta.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#667b91]">{meta.meaning}</p>
                <p className="mt-2 rounded-xl bg-[#f4f8fc] p-2 text-[11px] font-semibold leading-relaxed text-[#3d607f]">
                  {stageGuide(item.stage)}
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
            <h3 className="text-lg font-black text-[#224c70]">십이운성 심층 리포트</h3>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#557b9a]">
              대표 동물의 상징을 성격, 연애, 일, 재물, 관계, 오늘의 운으로 나누어 현실 조언으로 풀었습니다.
            </p>
          </div>
          <span className="rounded-full border border-[#c9deef] bg-white px-3 py-1 text-xs font-black text-[#426d90]">
            {animal.animal_ko} · {representativeStage}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {DETAILED_REPORT_SECTIONS.map((section) => (
            <article key={section.key} className="rounded-2xl border border-[#c8def0] bg-white/88 p-4">
              <p className="text-xs font-black text-[#3e6d93]">{section.title}</p>
              <p className="mt-2 text-sm font-semibold leading-[1.85] text-[#315d82]">
                {cleanReportText(detailedReport[section.key])}
              </p>
            </article>
          ))}
        </div>

        <article className="mt-3 rounded-2xl border border-[#d9d3a2] bg-[#fff9e8] p-4">
          <p className="text-xs font-black text-[#806e2e]">운을 여는 성장 루틴</p>
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
        <h3 className="text-xl font-black text-[#203c5d]">결과 요약 카드</h3>
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
