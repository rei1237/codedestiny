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
      personality: "바깥으로 뻗는 성장 에너지가 강해, 기회 포착과 실행의 리듬이 빠릅니다.",
      love: "감정 표현이 비교적 선명해 관계의 시작과 밀도 형성이 빠른 편입니다.",
      career: "런칭/확장/성과 가시화 구간에서 강점을 크게 발휘합니다.",
      luck: "사람과 기회가 붙는 시기라, 약속/협업/제안 운을 활용하면 효율이 좋습니다.",
    };
  }

  if (["쇠", "병", "사", "묘"].includes(stage)) {
    return {
      axis: "정비",
      personality: "내부 정리와 감정 소모 관리가 중요해, 선택과 집중에서 실력이 드러납니다.",
      love: "관계에서 속도보다 신뢰와 회복 루틴을 만들 때 안정감이 커집니다.",
      career: "운영/리스크관리/디테일 점검 업무에서 성과가 탄탄하게 쌓입니다.",
      luck: "과한 확장보다 정리·정돈·백업 루틴이 실질적 행운을 만듭니다.",
    };
  }

  return {
    axis: "전환",
    personality: "재시작과 준비 에너지가 강한 구간이라, 다음 사이클 설계 능력이 뛰어납니다.",
    love: "관계 템포를 맞추는 대화가 핵심이며, 확인 질문이 오해를 크게 줄입니다.",
    career: "리브랜딩/리빌드/신규 학습의 효율이 높아 커리어 체질 개선에 유리합니다.",
    luck: "작은 습관 교체가 큰 흐름 변화를 만드는 타이밍입니다.",
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
    ? "시주 미입력으로 시지 해석은 제외하고 년·월·일 축 중심으로 판정했습니다."
    : `시지 ${stageLabel(pillars.hour)}까지 반영해 행동 후반 템포를 함께 계산했습니다.`;

  return {
    heroLine: `${animal.animal_ko} 타입의 중심축은 ${stageLabel(primary)}이며, ${tone.axis} 에너지로 읽힙니다.`,
    stageEvidence: `일지 ${stageLabel(pillars.day || primary)} / 월지 ${stageLabel(pillars.month)} / 년지 ${stageLabel(pillars.year)} 기반 분석입니다. ${hourLine}`,
    statsLine: `${balanceLine} (${growthCount}:${maintenanceCount}:${transitionCount})라서 현재 스탯은 ${animal.game_stats.power >= animal.game_stats.logic ? "실행/추진" : "전략/정밀"} 쪽 체감이 크게 나타납니다.`,
    personalityLine: `${tone.personality} ${animal.personality.summary}`,
    loveLine: `${tone.love} 연애 축은 ${animal.love.style}로 발현될 가능성이 높습니다.`,
    careerLine: `${tone.career} 직업 포지션은 ${animal.career.talent} 계열에서 특히 효율이 높습니다.`,
    luckLine: `${tone.luck} 오늘의 트리거는 ${animal.luck_essentials.color} 컬러와 ${animal.luck_essentials.item} 아이템입니다.`,
  };
}

export function buildCompatibilityStageEvidence(myStage: TwelveStage | null, partnerStage: TwelveStage | null) {
  if (!myStage || !partnerStage) return null;

  const myIdx = STAGE_INDEX[myStage];
  const partnerIdx = STAGE_INDEX[partnerStage];
  const diff = Math.abs(myIdx - partnerIdx);
  const circularDiff = Math.min(diff, 12 - diff);

  if (circularDiff <= 1) {
    return `두 사람의 핵심 십이운성(${myStage}/${partnerStage}) 간 거리가 가깝습니다. 감정 템포가 비슷해 빠르게 호흡이 맞을 확률이 높습니다.`;
  }

  if (circularDiff <= 3) {
    return `핵심 십이운성(${myStage}/${partnerStage})이 보완 구간에 있어, 역할 분담을 명확히 하면 시너지가 커집니다.`;
  }

  if (circularDiff <= 5) {
    return `핵심 십이운성(${myStage}/${partnerStage})이 중간 거리라, 결정 속도와 표현 방식 조율이 궁합 점수를 좌우합니다.`;
  }

  return `핵심 십이운성(${myStage}/${partnerStage})의 간격이 커 템포 충돌이 생기기 쉬운 조합입니다. 규칙을 먼저 합의하면 안정성이 올라갑니다.`;
}
