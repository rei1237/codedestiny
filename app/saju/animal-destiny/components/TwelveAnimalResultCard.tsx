"use client";

import { m } from "framer-motion";
import type { AnimalDestinyData, TwelveStage } from "../lib/types";
import type { TwelveGrowthAnimalResult } from "../lib/types";
import { useAnimalDestinyCopy, type AnimalDestinyCopy } from "../_lib/copy";

const ANIMAL_EMOJI: Record<TwelveStage, string> = {
  장생: "🦌",
  목욕: "🐈",
  관대: "🦊",
  건록: "🐶",
  제왕: "🦁",
  쇠: "🦉",
  병: "🐰",
  사: "🦋",
  묘: "🐹",
  절: "🐈‍⬛",
  태: "🐣",
  양: "🐑",
};

const STAGE_TONE_ACTION: Record<TwelveStage, string> = {
  장생: "처음은 작게 열고, 칭찬은 바로 저장하세요.",
  목욕: "감정은 숨기지 말고 부드럽게 이름 붙이세요.",
  관대: "보여 줄 장면을 하나 정하면 존재감이 살아납니다.",
  건록: "오늘의 약속 하나를 끝까지 지키면 운이 단단해집니다.",
  제왕: "크게 결정하되, 한 번은 숨을 고르고 확인하세요.",
  쇠: "정리한 기준 하나가 내일의 손실을 막아줍니다.",
  병: "무리한 친절보다 회복 시간을 먼저 챙기세요.",
  사: "끝낼 것과 살릴 것을 나누면 새 문이 열립니다.",
  묘: "작은 자원을 기록하면 숨은 복이 보입니다.",
  절: "끊어야 할 한 가지를 정하면 길이 또렷해집니다.",
  태: "완성보다 실험 하나를 먼저 부화시키세요.",
  양: "돌봄은 나에게도 나누어 줄 때 복이 자랍니다.",
};

function buildStageTone(copy: AnimalDestinyCopy): Record<TwelveStage, { label: string; action: string }> {
  const stages = Object.keys(STAGE_TONE_ACTION) as TwelveStage[];
  return Object.fromEntries(
    stages.map((stage) => [stage, { label: copy.stageToneLabels[stage], action: STAGE_TONE_ACTION[stage] }]),
  ) as Record<TwelveStage, { label: string; action: string }>;
}

function compactText(text: string, max = 82) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

type Props = {
  animal: AnimalDestinyData;
  result: TwelveGrowthAnimalResult;
  representativeStage: TwelveStage;
};

export default function TwelveAnimalResultCard({ animal, result, representativeStage }: Props) {
  const copy = useAnimalDestinyCopy();
  const stageTone = buildStageTone(copy)[representativeStage];
  const quickNotes = [
    { label: copy.quickNoteRhythmLabel, title: stageTone.label, body: stageTone.action },
    { label: copy.todayPracticeLabel, title: copy.smallStepTitle, body: compactText(result.todayAction) },
    { label: copy.recoveryHintLabel, title: copy.heartRechargeTitle, body: compactText(result.recoveryGuide) },
  ];

  return (
    <m.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] border border-[#b9d5ef] bg-[linear-gradient(160deg,#fafdff_0%,#f0f8ff_56%,#fff7eb_100%)] p-5 shadow-[0_20px_46px_rgba(56,109,156,0.16)] sm:p-7"
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#d7ecff]/70 blur-2xl" />
      <div className="pointer-events-none absolute -left-14 bottom-2 h-40 w-40 rounded-full bg-[#ffe8be]/60 blur-2xl" />

      <div className="relative z-10 grid min-w-0 gap-5 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
        <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-[2rem] border border-[#c8dff2] bg-white/88 text-7xl shadow-[0_10px_24px_rgba(60,110,154,0.18)]">
          {ANIMAL_EMOJI[representativeStage] || "🐾"}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#9fc5e7] bg-white px-3 py-1 text-[11px] font-black tracking-[0.14em] text-[#376790]">
              {copy.representativeCardBadge}
            </span>
            <span className="rounded-full border border-[#d9d5a2] bg-[#fff8de] px-3 py-1 text-xs font-black text-[#8e7b34]">
              {copy.stageBadgePrefix} {copy.stageBadgeLabels[representativeStage]}
            </span>
          </div>

          <div>
            <p className="text-sm font-bold text-[#3c6689]">{copy.yourAnimalLabel}</p>
            <h3 className="text-3xl font-black text-[#214c6f]">{result.animalName}</h3>
            <p className="mt-1 text-sm font-semibold text-[#487195]">{copy.stagePrefix} {result.stageName}</p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#315d82]">{result.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {result.keywords.slice(0, 5).map((tag) => (
              <span key={tag} className="rounded-full border border-[#c4ddef] bg-white/92 px-3 py-1 text-xs font-bold text-[#325f83]">
                #{tag}
              </span>
            ))}
          </div>

          <div className="rounded-2xl border border-[#c8dff2] bg-white/86 p-3">
            <p className="text-xs font-black text-[#3d6c92]">{copy.topKeywordLabel}</p>
            <p className="mt-1 text-sm font-semibold text-[#2f5b80]">
              {animal.short_copy}
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {quickNotes.map((note) => (
              <div key={note.label} className="rounded-2xl border border-[#d7e6f3] bg-white/82 p-3">
                <p className="text-[11px] font-black text-[#6b86a0]">{note.label}</p>
                <p className="mt-1 text-sm font-black text-[#274f73]">{note.title}</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-[#4f6f8c]">{note.body}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#d9d5a2] bg-[#fff8de]/82 p-3">
            <p className="text-xs font-black text-[#8e7b34]">{copy.weeklyMissionLabel}</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-[#67562a]">{compactText(result.growthMission, 118)}</p>
          </div>
        </div>
      </div>
    </m.section>
  );
}
