"use client";

import { motion } from "framer-motion";
import type { AnimalDestinyData, TwelveStage } from "../lib/types";
import type { TwelveGrowthAnimalResult } from "../lib/types";

const TWELVE_ANIMAL_RESULT_CARD_TEXT_TRANSLATIONS = {
  ko: {
    "twelveAnimalResult.001": "새싹 모드",
    "twelveAnimalResult.002": "달빛 모드",
    "twelveAnimalResult.003": "리본 모드",
    "twelveAnimalResult.004": "수호 모드",
    "twelveAnimalResult.005": "태양 모드",
    "twelveAnimalResult.006": "현자 모드",
    "twelveAnimalResult.007": "구름 모드",
    "twelveAnimalResult.008": "나비 모드",
    "twelveAnimalResult.009": "보물 모드",
    "twelveAnimalResult.010": "밤문 모드",
    "twelveAnimalResult.011": "별알 모드",
    "twelveAnimalResult.012": "솜구름 모드",
    "twelveAnimalResult.013": "운성 무드",
  },
} as const;

function twelveAnimalResultCardText(key: keyof typeof TWELVE_ANIMAL_RESULT_CARD_TEXT_TRANSLATIONS.ko): string {
  return TWELVE_ANIMAL_RESULT_CARD_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
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
  양: "🐑",
};

const STAGE_TONE: Record<TwelveStage, { label: string; action: string }> = {
  장생: { label: twelveAnimalResultCardText("twelveAnimalResult.001"), action: "처음은 작게 열고, 칭찬은 바로 저장하세요." },
  목욕: { label: twelveAnimalResultCardText("twelveAnimalResult.002"), action: "감정은 숨기지 말고 부드럽게 이름 붙이세요." },
  관대: { label: twelveAnimalResultCardText("twelveAnimalResult.003"), action: "보여 줄 장면을 하나 정하면 존재감이 살아납니다." },
  건록: { label: twelveAnimalResultCardText("twelveAnimalResult.004"), action: "오늘의 약속 하나를 끝까지 지키면 운이 단단해집니다." },
  제왕: { label: twelveAnimalResultCardText("twelveAnimalResult.005"), action: "크게 결정하되, 한 번은 숨을 고르고 확인하세요." },
  쇠: { label: twelveAnimalResultCardText("twelveAnimalResult.006"), action: "정리한 기준 하나가 내일의 손실을 막아줍니다." },
  병: { label: twelveAnimalResultCardText("twelveAnimalResult.007"), action: "무리한 친절보다 회복 시간을 먼저 챙기세요." },
  사: { label: twelveAnimalResultCardText("twelveAnimalResult.008"), action: "끝낼 것과 살릴 것을 나누면 새 문이 열립니다." },
  묘: { label: twelveAnimalResultCardText("twelveAnimalResult.009"), action: "작은 자원을 기록하면 숨은 복이 보입니다." },
  절: { label: twelveAnimalResultCardText("twelveAnimalResult.010"), action: "끊어야 할 한 가지를 정하면 길이 또렷해집니다." },
  태: { label: twelveAnimalResultCardText("twelveAnimalResult.011"), action: "완성보다 실험 하나를 먼저 부화시키세요." },
  양: { label: twelveAnimalResultCardText("twelveAnimalResult.012"), action: "돌봄은 나에게도 나누어 줄 때 복이 자랍니다." },
};

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
  const stageTone = STAGE_TONE[representativeStage];
  const quickNotes = [
    { label: twelveAnimalResultCardText("twelveAnimalResult.013"), title: stageTone.label, body: stageTone.action },
    { label: "오늘 실천", title: "작은 발자국", body: compactText(result.todayAction) },
    { label: "회복 힌트", title: "마음 충전", body: compactText(result.recoveryGuide) },
  ];

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
            <p className="text-xs font-black text-[#8e7b34]">이번 주 성장 주문</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-[#67562a]">{compactText(result.growthMission, 118)}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
