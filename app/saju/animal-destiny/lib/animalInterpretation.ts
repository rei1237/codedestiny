import type { AnimalDestinyData, TwelveStage } from "./types";
import type { FourPillarStageItem } from "./twelveStages";

type PillarKey = "year" | "month" | "day" | "hour";

export const PILLAR_INFO: Record<PillarKey, { label: string; meaning: string }> = {
  year: {
    label: "연주",
    meaning: "사회적 첫인상, 바깥 이미지, 어린 시절의 분위기, 넓은 인간관계",
  },
  month: {
    label: "월주",
    meaning: "직업성, 사회생활, 실무 능력, 현실 감각, 성장 환경",
  },
  day: {
    label: "일주",
    meaning: "나의 본질, 연애 방식, 배우자궁, 친밀한 관계",
  },
  hour: {
    label: "시주",
    meaning: "잠재력, 미래 방향, 창의성, 후반부 운, 깊은 욕망",
  },
};

const STAGE_KEYWORDS: Record<TwelveStage, string[]> = {
  장생: ["시작", "호기심", "생명력"],
  목욕: ["감성", "표현", "매력"],
  관대: ["성장", "도전", "사회성"],
  건록: ["자립", "실력", "책임"],
  제왕: ["주도성", "카리스마", "확장"],
  쇠: ["성숙", "절제", "안정"],
  병: ["예민함", "관찰", "회복"],
  사: ["정리", "통찰", "전환"],
  묘: ["축적", "내면", "관리"],
  절: ["리셋", "독립", "새출발"],
  태: ["가능성", "상상력", "유연성"],
  양: ["보호", "준비", "돌봄"],
};

function k(stage?: TwelveStage) {
  if (!stage) return ["균형", "관찰", "정리"];
  return STAGE_KEYWORDS[stage];
}

function stageName(stage?: TwelveStage) {
  return stage || "미상";
}

export function buildDetailedInterpretation(args: {
  animal: AnimalDestinyData;
  pillars: Record<PillarKey, FourPillarStageItem>;
}) {
  const { animal, pillars } = args;

  const year = pillars.year.stage;
  const month = pillars.month.stage;
  const day = pillars.day.stage || animal.saju_stage;
  const hour = pillars.hour.stage;

  const dayKw = k(day);
  const monthKw = k(month);
  const yearKw = k(year);
  const hourKw = k(hour);

  const personality = `${animal.animal_ko} 타입의 중심 축은 일주 ${stageName(day)}의 기운입니다. 이 에너지는 ${dayKw[0]}과 ${dayKw[1]}를 통해 성격의 핵심 결을 만들며, 사람 앞에서는 조용히 단단한 인상을 남기고 가까운 관계에서는 의외로 따뜻한 결을 보여 줍니다. 월주 ${stageName(month)}의 ${monthKw[0]} 성향이 현실 감각을 보강해 실행력과 적응력을 높이고, 연주 ${stageName(year)}의 ${yearKw[0]} 흐름이 사회적 첫인상에 자연스러운 존재감을 더합니다. 시주 ${stageName(hour)}의 ${hourKw[0]} 기운은 장기적으로 내면의 잠재력을 깨우는 스위치처럼 작동해, 현재의 성향을 시간이 지날수록 더 입체적으로 성장시키는 역할을 합니다.`;

  const love = `연애에서는 일주 ${stageName(day)}의 영향이 가장 강하게 나타나서 사랑할 때의 모습이 분명해집니다. ${dayKw[0]}와 ${dayKw[2]}가 함께 작동하면 상대에게 안정감과 매력을 동시에 전달하지만, 감정이 빠르게 깊어질 때는 속도 조절이 필요합니다. 월주 ${stageName(month)}의 ${monthKw[1]} 기운은 관계를 현실적으로 지속시키는 힘을 주므로, 약속·루틴·대화 규칙을 세우면 장기 연애 만족도가 올라갑니다. 시주 ${stageName(hour)}의 ${hourKw[2]} 흐름은 끌리는 사람의 조건을 넓혀 주는 대신 선택 피로를 만들 수 있어, 호감 기준을 2~3개로 명확히 두는 것이 좋습니다. 잘 맞는 관계 방식은 감정 표현과 실무적 배려를 같이 쓰는 형태이며, 주의할 패턴은 혼자 해석하고 결론을 먼저 내리는 습관입니다.`;

  const career = `진로와 일에서는 월주 ${stageName(month)}가 중심축이 됩니다. ${monthKw[0]}과 ${monthKw[2]} 성향이 강한 만큼 업무를 구조화하고 우선순위를 정해 실행할 때 성과가 가장 크게 나옵니다. 일주 ${stageName(day)}의 ${dayKw[1]} 기운은 개인 전문성을 끌어올려서 한 분야를 깊게 파는 직무에 특히 유리하며, 시주 ${stageName(hour)}의 ${hourKw[0]} 흐름은 미래 확장 포인트를 제시합니다. 조직형으로 일할 때는 책임 구역이 명확한 팀에서 강점이 살아나고, 프리랜서형으로 갈 때는 반복 가능한 작업 체계를 먼저 만들면 수익 변동성이 줄어듭니다. 성장 전략은 단기 성과 1개와 장기 자산 1개를 병행해 누적하는 방식이며, 이 리듬을 유지하면 커리어 곡선이 안정적으로 상승합니다.`;

  const relationship = `인간관계에서는 연주 ${stageName(year)}와 월주 ${stageName(month)}의 합이 핵심입니다. 첫인상은 ${yearKw[0]}·${yearKw[1]} 축으로 형성되어 낯선 자리에서도 존재감이 드러나지만, 깊은 관계로 갈수록 월주의 ${monthKw[1]}·${monthKw[2]}가 작동하며 신뢰 검증을 먼저 하게 됩니다. 친구 관계에서는 속도보다 지속성을 중시하는 편이라 오래 가는 인연의 밀도가 높고, 사회적 거리감은 상황에 따라 유연하게 조절하는 능력이 있습니다. 갈등이 생겼을 때는 감정 폭발보다 원인 정리와 해결 순서를 찾는 방식이 잘 맞으며, 대화를 시작할 때 "사실-감정-요청" 순서를 지키면 오해가 크게 줄어듭니다. 관계 피로를 줄이려면 주간 회복 시간을 미리 확보해 에너지 누수를 막는 것이 중요합니다.`;

  const growthMissions = [
    `일주 ${stageName(day)}의 장점을 살리기 위해 하루 20분 "핵심 루틴"을 2주만 고정하세요. 작은 반복이 자존감과 실행력을 동시에 끌어올립니다.`,
    `월주 ${stageName(month)}의 기운을 커리어 자산으로 바꾸려면, 이번 달에 완성한 작업물 1개를 문서/포트폴리오 형태로 남기세요.`,
    `연주 ${stageName(year)}와 시주 ${stageName(hour)}의 균형을 위해 주 1회 사람 만남 + 주 1회 혼자 회복 시간을 분리해 배치해 보세요.`,
  ];

  return {
    personality,
    love,
    career,
    relationship,
    growthMissions,
  };
}
