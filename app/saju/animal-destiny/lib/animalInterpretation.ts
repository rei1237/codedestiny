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

  const personality = `${animal.animal_ko}의 본심은 일주 ${stageName(day)}에 새겨져 있습니다. 이 기운은 ${dayKw[0]}와 ${dayKw[1]}의 결을 통해 당신의 말투, 선택, 침묵의 방향까지 결정합니다. 처음 만나는 자리에서는 절제된 아우라가 먼저 드러나고, 신뢰가 열리면 놀랍도록 따뜻한 결이 나타납니다. 월주 ${stageName(month)}의 ${monthKw[0]} 성향은 현실 감각을 날카롭게 세워 실전에서 흔들림을 줄이고, 연주 ${stageName(year)}의 ${yearKw[0]} 흐름은 사회적 장면에서 당신에게 자연스러운 존재감을 입힙니다. 시주 ${stageName(hour)}의 ${hourKw[0]}는 늦게 열리는 비밀 문처럼 작동해, 시간이 갈수록 당신의 잠재력을 더 깊고 넓게 확장시킵니다.`;

  const love = `연애의 무대에서는 일주 ${stageName(day)}가 가장 크게 빛납니다. ${dayKw[0]}와 ${dayKw[2]}가 겹치는 순간, 당신은 상대에게 안정과 설렘을 동시에 전하는 힘을 가집니다. 다만 감정의 불이 빨리 붙는 편이라 깊어질수록 템포 조율이 필요합니다. 월주 ${stageName(month)}의 ${monthKw[1]} 기운은 관계를 오래 지탱하는 뼈대를 만들기에 약속, 루틴, 대화 규칙을 정해두면 만족도가 크게 올라갑니다. 시주 ${stageName(hour)}의 ${hourKw[2]} 흐름은 선택지를 넓혀 주지만 결정 피로를 부를 수 있으니, 호감 기준을 두세 가지로 선명히 잡는 것이 좋습니다. 당신에게 맞는 사랑은 감정 표현과 생활 배려가 함께 흐르는 형태이며, 피해야 할 습관은 혼자 의미를 확정해 버리는 조용한 오해입니다.`;

  const career = `일과 진로의 중심축은 월주 ${stageName(month)}입니다. ${monthKw[0]}과 ${monthKw[2]}의 결이 강해 구조화, 우선순위, 실행의 삼박자를 맞출 때 성과가 급격히 상승합니다. 일주 ${stageName(day)}의 ${dayKw[1]} 기운은 전문성의 깊이를 키워 한 분야를 파고드는 직무에서 탁월함을 만듭니다. 시주 ${stageName(hour)}의 ${hourKw[0]} 흐름은 앞으로 확장할 축을 예고하므로, 지금의 일을 자산화하는 기록 습관이 중요합니다. 팀 환경에서는 책임 구역이 분명할수록 빛나고, 독립 환경에서는 반복 가능한 작업 루틴을 먼저 세울수록 수익 변동을 줄일 수 있습니다. 당신의 커리어 상승식은 단기 성과 하나와 장기 자산 하나를 동시에 쌓는 이중 축 전략입니다.`;

  const relationship = `인간관계의 핵심 코드는 연주 ${stageName(year)}와 월주 ${stageName(month)}의 합입니다. 첫인상은 ${yearKw[0]}·${yearKw[1]} 축으로 각인되어 낯선 장면에서도 존재감이 자연히 살아나고, 가까워질수록 월주의 ${monthKw[1]}·${monthKw[2]}가 작동해 신뢰의 근거를 세심히 확인하게 됩니다. 당신은 속도보다 지속성을 중시해 오래 가는 인연의 밀도가 높은 편이며, 상황에 따라 거리 조절도 유연하게 해냅니다. 갈등이 생겼을 때는 감정의 파도에 올라타기보다 원인을 정리하고 해결 순서를 세울 때 훨씬 강해집니다. 대화를 열 때는 사실-감정-요청의 흐름을 지키면 오해의 그림자가 빠르게 걷힙니다. 관계 피로를 막는 비결은 주간 회복 시간을 먼저 예약해 에너지 누수를 차단하는 것입니다.`;

  const growthMissions = [
    `일주 ${stageName(day)}의 힘을 깨우려면 하루 20분의 핵심 루틴을 14일만 고정해 보세요. 작은 반복이 운의 문을 여는 주문이 됩니다.`,
    `월주 ${stageName(month)}의 기운을 자산으로 봉인하려면 이번 달 완성작 1개를 문서 또는 포트폴리오로 남겨 흐름을 현실로 고정하세요.`,
    `연주 ${stageName(year)}와 시주 ${stageName(hour)}의 균형을 위해 주 1회 관계 확장, 주 1회 고요한 회복 시간을 분리해 배치하세요.`,
  ];

  return {
    personality,
    love,
    career,
    relationship,
    growthMissions,
  };
}
