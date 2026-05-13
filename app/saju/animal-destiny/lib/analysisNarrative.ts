import type { AnimalDestinyData, AnimalNarrativeInsights, TwelveStage, TwelveStagePillars } from "./types";

const STAGE_HANJA: Record<TwelveStage, string> = {
  장생: "長生",
  목욕: "沐浴",
  관대: "冠帶",
  건록: "建祿",
  제왕: "帝旺",
  쇠: "衰",
  병: "病",
  사: "死",
  묘: "墓",
  절: "絶",
  태: "胎",
  양: "養",
};

const STAGE_INDEX: Record<TwelveStage, number> = {
  장생: 0,
  목욕: 1,
  관대: 2,
  건록: 3,
  제왕: 4,
  쇠: 5,
  병: 6,
  사: 7,
  묘: 8,
  절: 9,
  태: 10,
  양: 11,
};

function stageTone(stage: TwelveStage) {
  if (["장생", "목욕", "관대", "건록", "제왕"].includes(stage)) {
    return {
      axis: "확장",
      personality: "바깥으로 뻗는 별빛이 강하게 올라와 기회를 감지하면 즉시 움직이는 결단력이 살아납니다.",
      love: "감정의 불꽃이 분명해 첫 만남의 온도를 빠르게 끌어올리는 힘이 큽니다.",
      career: "런칭, 확장, 공개 성과가 필요한 장면에서 존재감이 가장 선명하게 드러납니다.",
      luck: "사람과 제안이 한 번에 엮이는 운이므로 약속과 협업을 닫지 말고 열어두는 편이 유리합니다.",
    };
  }

  if (["쇠", "병", "사", "묘"].includes(stage)) {
    return {
      axis: "정비",
      personality: "내부 궁전을 다듬는 시기라 감정의 낭비를 줄일수록 내공이 단단하게 축적됩니다.",
      love: "빠른 진전보다 신뢰의 리듬을 맞추는 대화가 관계의 수명을 길게 만듭니다.",
      career: "운영, 리스크 관리, 디테일 감리가 필요한 영역에서 오차 없는 실력이 빛납니다.",
      luck: "큰 승부보다 정리와 백업의 습관이 보이지 않는 손실을 막아 실질 운을 키워줍니다.",
    };
  }

  return {
    axis: "전환",
    personality: "낡은 궤도를 벗어나 새 항로를 여는 문턱이라 재시작 설계력이 강하게 발현됩니다.",
    love: "관계 속도보다 호흡을 맞추는 확인 질문이 오해를 정화하고 깊이를 만듭니다.",
    career: "리빌드와 재학습의 효율이 높아 커리어 체질을 바꾸기 좋은 국면입니다.",
    luck: "작은 습관 하나를 바꾸는 선택이 다음 시즌의 운세 구조를 바꿉니다.",
  };
}

function stageLabel(stage?: TwelveStage) {
  if (!stage) return "-";
  return `${stage}(${STAGE_HANJA[stage]})`;
}

function presentStages(pillars: TwelveStagePillars): TwelveStage[] {
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean);
  return list as TwelveStage[];
}

export function buildAnimalNarrativeInsights(args: {
  animal: AnimalDestinyData;
  pillars: TwelveStagePillars;
  timeUnknown?: boolean;
}): AnimalNarrativeInsights {
  const { animal, pillars, timeUnknown } = args;
  const primary = pillars.primary || animal.saju_stage;
  const tone = stageTone(primary);
  const stages = presentStages(pillars);
  const growthCount = stages.filter((s) => ["장생", "목욕", "관대", "건록", "제왕"].includes(s)).length;
  const maintenanceCount = stages.filter((s) => ["쇠", "병", "사", "묘"].includes(s)).length;
  const transitionCount = stages.filter((s) => ["절", "태", "양"].includes(s)).length;

  const balanceLine =
    growthCount >= maintenanceCount && growthCount >= transitionCount
      ? "현재 흐름은 확장 우세"
      : maintenanceCount >= growthCount && maintenanceCount >= transitionCount
      ? "현재 흐름은 정비 우세"
      : "현재 흐름은 전환 우세";

  const hourLine = timeUnknown
    ? "시주가 비어 있어 년·월·일 세 축으로만 핵심 운의 흐름을 판정했습니다."
    : `시지 ${stageLabel(pillars.hour)}까지 포함해 후반 운의 추진력과 회수력을 함께 반영했습니다.`;

  return {
    heroLine: `${animal.animal_ko}의 중심 별은 ${stageLabel(primary)}에 놓여 있으며, 지금의 운은 ${tone.axis}의 문을 열고 있습니다.`,
    stageEvidence: `일지 ${stageLabel(pillars.day || primary)}를 주축으로 월지 ${stageLabel(pillars.month)}, 년지 ${stageLabel(pillars.year)}를 교차 검증했습니다. ${hourLine}`,
    statsLine: `${balanceLine} (${growthCount}:${maintenanceCount}:${transitionCount})의 분포로 읽히며, 현재 체감 스탯은 ${animal.game_stats.power >= animal.game_stats.logic ? "실행/추진" : "전략/정밀"} 축이 우세합니다.`,
    personalityLine: `${tone.personality} ${animal.personality.summary}`,
    loveLine: `${tone.love} 연애의 발현 방식은 ${animal.love.style} 결로 나타날 가능성이 큽니다.`,
    careerLine: `${tone.career} 직업적 파동은 ${animal.career.talent} 계열에서 특히 선명합니다.`,
    luckLine: `${tone.luck} 오늘의 개운 키는 ${animal.luck_essentials.color} 컬러와 ${animal.luck_essentials.item}입니다.`,
  };
}

export function buildCompatibilityStageEvidence(myStage: TwelveStage | null, partnerStage: TwelveStage | null) {
  if (!myStage || !partnerStage) return null;

  const myIdx = STAGE_INDEX[myStage];
  const partnerIdx = STAGE_INDEX[partnerStage];
  const diff = Math.abs(myIdx - partnerIdx);
  const circularDiff = Math.min(diff, 12 - diff);

  if (circularDiff <= 1) {
    return `두 사람의 핵심 십이운성(${myStage}/${partnerStage})이 거의 맞닿아 있어 감정의 박자가 자연스럽게 동기화됩니다.`;
  }

  if (circularDiff <= 3) {
    return `핵심 십이운성(${myStage}/${partnerStage})이 보완 축에 위치해 역할을 선명히 나누면 큰 시너지가 납니다.`;
  }

  if (circularDiff <= 5) {
    return `핵심 십이운성(${myStage}/${partnerStage})의 거리가 중간권이라 결정 속도와 표현 방식 조율이 궁합 점수를 좌우합니다.`;
  }

  return `핵심 십이운성(${myStage}/${partnerStage}) 간격이 커 충돌이 생기기 쉬운 조합입니다. 경계선과 약속을 먼저 합의하면 안정도가 빠르게 올라갑니다.`;
}
