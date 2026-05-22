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

function buildDefaultBreakdown(myAnimal: string, partnerAnimal: string, relationType: "환상" | "좋음" | "긴장" | "주의") {
  const relationLine =
    relationType === "환상"
      ? "서로의 리듬이 빠르게 동기화되는 조합"
      : relationType === "좋음"
      ? "역할을 나누면 장점이 크게 증폭되는 조합"
      : relationType === "긴장"
      ? "매력은 크지만 조율이 필요한 조합"
      : "차이를 합의로 관리해야 안정되는 조합";

  return {
    overall: {
      title: "종합 궁합",
      body: [
        `${myAnimal}와 ${partnerAnimal}는 ${relationLine}입니다. 사주 궁합의 본질은 감정의 강약보다 에너지 운용 방식의 합에 있습니다.`,
        "처음의 끌림이 강할수록 관계 설계를 생략하기 쉽지만, 장기적으로는 생활 루틴과 갈등 복구 방식의 합의가 궁합 점수를 좌우합니다.",
      ],
    },
    emotionCommunication: {
      title: "감정 및 소통 궁합",
      body: [
        "감정의 온도와 표현 속도가 다를 수 있어, 오해는 대개 의도보다 전달 방식에서 발생합니다.",
        "감정 해석보다 사실 확인을 먼저 하고, 감정은 짧고 명료한 문장으로 확인하는 습관이 관계 피로를 줄입니다.",
      ],
    },
    valueLifestyle: {
      title: "가치관 및 생활 패턴",
      body: [
        "생활 리듬, 휴식 방식, 돈과 시간의 우선순위에서 차이가 드러날 가능성이 큽니다.",
        "루틴을 강요하기보다 각자의 회복 방식과 일상 템포를 존중하면, 다른 성향이 갈등이 아니라 시너지로 바뀝니다.",
      ],
    },
    practicalAdvice: {
      title: "사주 고수의 실전 조언",
      body: [
        "관계의 핵심은 감정 토론의 길이가 아니라 점검의 주기입니다.",
        "월 1회 고정된 타이밍에 감정 온도, 생활 합의, 다음 한 달의 역할 분담을 함께 점검하면 궁합의 안정도가 눈에 띄게 올라갑니다.",
        "갈등이 발생한 주간에는 승패를 가르기보다 재발 방지 규칙 1개를 남기는 방식이 가장 실전적입니다.",
      ],
    },
  };
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
      breakdown: buildDefaultBreakdown(my.animal_ko, partner.animal_ko, "좋음"),
    };
  }

  const isDogButterflyPair =
    (myStageKey === "geonrok" && partnerStageKey === "sa") ||
    (myStageKey === "sa" && partnerStageKey === "geonrok");

  if (isDogButterflyPair) {
    return {
      score: 78,
      relationType: "좋음",
      summary: "현실에 뿌리내린 나무와 보이지 않는 세계를 유영하는 나비의 만남. 서로가 가지지 못한 세계를 열어주는 매력적인 궁합입니다.",
      goodPoints: [
        "현실 안정과 정서 영감의 상호 보완",
        "역할 분리 시 관계 효율이 빠르게 상승",
        "생활 기반과 감정 기반의 균형 가능성",
      ],
      clashPoints: [
        "현실 중심 대화와 감정 중심 대화의 주파수 차이",
        "생활 템포 강요 시 관계 피로 누적",
        "모호한 표현이 반복되면 오해 증폭",
      ],
      tips: [
        "건록은 감정에 이유를 묻기보다 공감부터 시작하세요.",
        "사는 모호한 표현보다 명확한 언어로 마음을 전하세요.",
        "월 1회 감정 온도 점검 티타임을 고정 루틴으로 운영하세요.",
      ],
      breakdown: {
        overall: {
          title: "종합 궁합",
          body: [
            "명리학적으로 건록(建祿)의 현실적인 에너지와 사(死)의 정신적이고 직관적인 에너지가 만난 구조입니다.",
            "별빛 강아지(건록)가 관계의 뼈대를 세우고 현실적인 안정을 책임진다면, 신비 나비(사)는 메마르기 쉬운 강아지의 내면에 정신적인 영감과 쉼터를 제공합니다.",
            "생활의 궤적은 다르지만, 다름이 서로에게 독이 아닌 약이 되는 상호 보완의 인연입니다.",
          ],
        },
        emotionCommunication: {
          title: "감정 및 소통 궁합",
          body: [
            "별빛 강아지는 행동과 결과로 애정을 증명하려 하고, 신비 나비는 언어 이면의 감정과 분위기로 소통하려 합니다.",
            "강아지 입장에서는 나비의 생각이 뜬구름 잡는 것처럼 보일 수 있고, 나비는 강아지가 너무 현실적이라고 느낄 수 있습니다.",
            "소통의 주파수를 맞추기 위해서는 강아지는 나비의 감정에 이유를 묻지 말고 공감해 주어야 하며, 나비는 강아지에게 모호한 표현 대신 명확한 언어로 마음을 전달해야 합니다.",
          ],
        },
        valueLifestyle: {
          title: "가치관 및 생활 패턴",
          body: [
            "루틴과 규칙을 중시하는 별빛 강아지의 곁에서 신비 나비는 안정감을 느낍니다.",
            "다만 생활 리듬에 있어 강아지가 자신의 템포를 나비에게 강요하기 시작하면 관계에 균열이 생깁니다.",
            "나비에게는 혼자만의 정신적 동굴에서 에너지를 충전할 고요한 시간이 반드시 필요함을 인정해야 합니다.",
          ],
        },
        practicalAdvice: {
          title: "사주 고수의 실전 조언",
          body: [
            "이 궁합의 핵심은 '적당한 거리감'과 '역할의 분리'입니다.",
            "모든 것을 함께 하려 하기보다, 현실적인 결정(재무, 계획)은 건록인 별빛 강아지가 주도하고, 관계의 분위기와 정서적인 방향성은 사(死)인 신비 나비가 이끌도록 하세요.",
            "한 달에 한 번, 서로의 감정 온도를 점검하는 티타임을 가지는 것만으로도 이 인연은 오래도록 단단하게 이어질 것입니다.",
          ],
        },
      },
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
    breakdown: buildDefaultBreakdown(my.animal_ko, partner.animal_ko, relation.relationType),
  };
}
