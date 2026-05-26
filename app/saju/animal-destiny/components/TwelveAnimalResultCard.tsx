"use client";

import { motion } from "framer-motion";
import type { AnimalDestinyData, TwelveStage } from "../lib/types";
import type { TwelveGrowthAnimalResult } from "../lib/types";

const STAGE_BADGE: Record<TwelveStage, string> = {
  장생: "성장 시작",
  목욕: "감정 확장",
  관대: "사회 도전",
  건록: "기반 강화",
  제왕: "에너지 정점",
  쇠: "내실 정비",
  병: "회복 관리",
  사: "전환 통찰",
  묘: "축적 안정",
  절: "리셋 결단",
  태: "가능성 품기",
  양: "보호 성장",
};

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
  양: "🐷",
};

type Props = {
  animal: AnimalDestinyData;
  result: TwelveGrowthAnimalResult;
  representativeStage: TwelveStage;
};

export default function TwelveAnimalResultCard({ animal, result, representativeStage }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] border border-[#b9d5ef] bg-[linear-gradient(160deg,#fafdff_0%,#f0f8ff_56%,#fff7eb_100%)] p-5 shadow-[0_20px_46px_rgba(56,109,156,0.16)] sm:p-7"
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#d7ecff]/70 blur-2xl" />
      <div className="pointer-events-none absolute -left-14 bottom-2 h-40 w-40 rounded-full bg-[#ffe8be]/60 blur-2xl" />

      <div className="relative z-10 grid gap-5 lg:grid-cols-[180px_1fr] lg:items-center">
        <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-[2rem] border border-[#c8dff2] bg-white/88 text-7xl shadow-[0_10px_24px_rgba(60,110,154,0.18)]">
          {ANIMAL_EMOJI[representativeStage] || "🐾"}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#9fc5e7] bg-white px-3 py-1 text-[11px] font-black tracking-[0.14em] text-[#376790]">
              운명 도감 대표 카드
            </span>
            <span className="rounded-full border border-[#d9d5a2] bg-[#fff8de] px-3 py-1 text-xs font-black text-[#8e7b34]">
              운성 단계: {STAGE_BADGE[representativeStage]}
            </span>
          </div>

          <div>
            <p className="text-sm font-bold text-[#3c6689]">당신의 동물</p>
            <h3 className="text-3xl font-black text-[#214c6f]">{result.animalName}</h3>
            <p className="mt-1 text-sm font-semibold text-[#487195]">십이운성: {result.stageName}</p>
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
            <p className="text-xs font-black text-[#3d6c92]">대표 키워드</p>
            <p className="mt-1 text-sm font-semibold text-[#2f5b80]">
              {animal.short_copy}
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
