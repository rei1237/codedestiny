import {
  ANIMAL_DESTINY_DATA,
  STAGE_KEY_TO_ID,
  STAGE_LABEL_TO_KEY,
  STAGE_SEQUENCE,
  STAGE_KEY_TO_LABEL,
} from "@/components/fortune/animal-twelve/animalTwelveData";
import { getPrimaryAnimalStage } from "./twelveStages";
import type {
  AnimalDestinyData,
  AnimalId,
  AnimalCompatibilityResult,
  SajuEngineResult,
  TwelveStage,
  TwelveStageKey,
} from "./types";

export const STAGE_TO_ANIMAL: Record<TwelveStage, AnimalId> = {
  장생: "cheetah",
  목욕: "monkey",
  관대: "black-panther",
  건록: "koala",
  제왕: "tiger",
  쇠: "raccoon",
  병: "rhino",
  사: "elephant",
  묘: "sheep",
  절: "pegasus",
  태: "wolf",
  양: "fawn",
};

function relationByDistance(distance: number) {
  if (distance <= 1) return { relationType: "환상" as const, baseScore: 92 };
  if (distance <= 2) return { relationType: "좋음" as const, baseScore: 82 };
  if (distance <= 4) return { relationType: "긴장" as const, baseScore: 62 };
  return { relationType: "주의" as const, baseScore: 48 };
}

function stageDistance(myStageKey: TwelveStageKey, partnerStageKey: TwelveStageKey) {
  const myIndex = STAGE_SEQUENCE.indexOf(myStageKey);
  const partnerIndex = STAGE_SEQUENCE.indexOf(partnerStageKey);
  if (myIndex < 0 || partnerIndex < 0) return 6;

  const direct = Math.abs(myIndex - partnerIndex);
  return Math.min(direct, 12 - direct);
}

function relationSummary(myAnimal: string, partnerAnimal: string, distance: number) {
  if (distance <= 1) {
    return `${myAnimal}와 ${partnerAnimal}는 감정 박자가 비슷해 빠르게 친밀해지는 조합입니다.`;
  }
  if (distance <= 2) {
    return `${myAnimal}와 ${partnerAnimal}는 서로의 장점을 보완하며 성장하는 조합입니다.`;
  }
  if (distance <= 4) {
    return `${myAnimal}와 ${partnerAnimal}는 매력은 크지만 생활 리듬 조율이 필요한 조합입니다.`;
  }
  return `${myAnimal}와 ${partnerAnimal}는 표현 방식 차이가 커 경계와 합의가 중요한 조합입니다.`;
}

export function getAnimalByStage(stage: TwelveStage | null | undefined): AnimalId | null {
  if (!stage) return null;
  return STAGE_TO_ANIMAL[stage] || null;
}

export function getAnimalBySajuResult(sajuResult: SajuEngineResult): {
  primaryStage: TwelveStage | null;
  animalId: AnimalId | null;
} {
  const primaryStage = getPrimaryAnimalStage(sajuResult);
  return {
    primaryStage,
    animalId: getAnimalByStage(primaryStage),
  };
}

export function getAnimalDisplayData(animalId: AnimalId | null | undefined): AnimalDestinyData | null {
  if (!animalId) return null;
  return ANIMAL_DESTINY_DATA[animalId] || null;
}

export function getAnimalCompatibility(animalId: AnimalId | null | undefined) {
  const data = getAnimalDisplayData(animalId);
  return data ? data.compatibility : null;
}

export function calculateAnimalCompatibility(myAnimalId: AnimalId, partnerAnimalId: AnimalId): AnimalCompatibilityResult {
  const my = ANIMAL_DESTINY_DATA[myAnimalId];
  const partner = ANIMAL_DESTINY_DATA[partnerAnimalId];

  const myStageKey = STAGE_LABEL_TO_KEY[my.stageLabel || my.saju_stage];
  const partnerStageKey = STAGE_LABEL_TO_KEY[partner.stageLabel || partner.saju_stage];

  if (!myStageKey || !partnerStageKey) {
    return {
      score: 66,
      relationType: "좋음",
      summary: `${my.animal_ko}와 ${partner.animal_ko}는 대화를 자주 할수록 안정감이 올라갑니다.`,
      goodPoints: ["따뜻한 공감", "역할 보완"],
      clashPoints: ["속도 차이", "표현 온도 차이"],
      tips: ["주 1회 감정 점검 대화를 해보세요."],
    };
  }

  const distance = stageDistance(myStageKey, partnerStageKey);
  const relation = relationByDistance(distance);
  const score = relation.baseScore;

  const myKeywords = my.keywords || [];
  const partnerKeywords = partner.keywords || [];

  const goodPoints = [
    `${myKeywords[0] || "안정"}과 ${partnerKeywords[0] || "균형"}의 상호 보완`,
    `${myKeywords[1] || "배려"}을(를) 통해 신뢰를 쌓는 흐름`,
    `${partnerKeywords[1] || "실행"}이(가) 관계의 추진력을 높임`,
  ];

  const clashPoints = [
    "중요한 결정을 내릴 때 속도 차이가 발생할 수 있음",
    "감정 표현 방식이 달라 오해가 생길 수 있음",
    "서로의 휴식 방식이 달라 피로 누적 가능성",
  ];

  return {
    score,
    relationType: relation.relationType,
    summary: relationSummary(my.animal_ko, partner.animal_ko, distance),
    goodPoints,
    clashPoints,
    tips: [
      `${STAGE_KEY_TO_LABEL[myStageKey]}-${STAGE_KEY_TO_LABEL[partnerStageKey]} 조합은 경계와 기대치를 먼저 합의할수록 장기 안정성이 높아집니다.`,
      "갈등이 생기면 감정 해석보다 사실 확인을 먼저 해보세요.",
      "한 달에 한 번, 관계 목표를 함께 업데이트해 보세요.",
    ],
  };
}
