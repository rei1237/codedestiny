import { ANIMAL_DESTINY_DATA } from "../data/animalDestinyData";
import { getPrimaryAnimalStage } from "./twelveStages";
import type { AnimalDestinyData, AnimalId, AnimalCompatibilityResult, SajuEngineResult, TwelveStage } from "./types";

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

  const base: AnimalCompatibilityResult = {
    score: 68,
    relationType: "좋음",
    summary: `${my.animal_ko}와 ${partner.animal_ko}는 대화와 조율을 잘하면 오래 가는 조합입니다.`,
    goodPoints: ["현실 감각의 균형", "서로 다른 장점 보완"],
    clashPoints: ["우선순위 차이", "속도감 차이"],
    tips: ["감정 체크인 루틴 만들기", "주 1회 서로의 일정 공유"],
  };

  if (my.compatibility.best.animal_id === partnerAnimalId) {
    return {
      score: 92,
      relationType: "환상",
      summary: `${my.animal_ko}와 ${partner.animal_ko}는 호흡이 빠르게 맞는 환상 조합입니다.`,
      goodPoints: ["감정 템포 일치", "동기부여 상승", "갈등 회복력 높음"],
      clashPoints: ["과몰입으로 페이스 오버"],
      tips: ["좋은 흐름일 때도 휴식 리듬 유지", "중요 결정은 하루 숙성 후 확정"],
    };
  }

  if (my.compatibility.good.animal_id === partnerAnimalId) {
    return {
      score: 81,
      relationType: "좋음",
      summary: `${my.animal_ko}와 ${partner.animal_ko}는 성장형 시너지가 큰 좋은 조합입니다.`,
      goodPoints: ["역할 분담 효율", "현실과 감성 균형"],
      clashPoints: ["소통 방식 차이"],
      tips: ["목표와 기대치를 먼저 맞추기", "주간 회고 대화 15분"],
    };
  }

  if (my.compatibility.challenging.animal_id === partnerAnimalId) {
    return {
      score: 59,
      relationType: "긴장",
      summary: `${my.animal_ko}와 ${partner.animal_ko}는 매력은 강하지만 템포 충돌이 잦은 조합입니다.`,
      goodPoints: ["새로운 시각 제공", "성장 자극"],
      clashPoints: ["의사결정 방식 불일치", "감정 표현 온도 차이"],
      tips: ["논쟁 전 감정 상태 먼저 공유", "결정 기준 문서화"],
    };
  }

  if (my.compatibility.worst.animal_id === partnerAnimalId) {
    return {
      score: 42,
      relationType: "주의",
      summary: `${my.animal_ko}와 ${partner.animal_ko}는 기대치와 표현 방식이 크게 달라 주의가 필요한 조합입니다.`,
      goodPoints: ["서로의 맹점 인식 가능"],
      clashPoints: ["지속적인 오해", "감정 소모"],
      tips: ["갈등 규칙을 미리 합의", "중립 시간 20분 후 대화 재개", "비난 대신 요청 문장 사용"],
    };
  }

  return base;
}
