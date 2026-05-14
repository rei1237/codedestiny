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

  const personality = `
    십이운성 ${stageName(day)}의 기운을 품은 ${animal.animal_ko}은(는) ${animal.personality.summary}
    이 동물의 가장 큰 매력은 ${animal.personality.strengths.join(", ")}입니다.
    하지만 ${animal.personality.weaknesses.join(", ")}와 같은 면모가 있어 때로는 스스로를 힘들게 하기도 합니다.
    스트레스를 받을 때는 ${animal.personality.stress_behavior} 모습을 보이기도 하지만,
    결국 ${animal.personality.growth_direction} 방향으로 나아갈 때 가장 큰 운의 문이 열립니다.
    ${animal.personality.hidden_side}
  `;

  const love = `
    사랑 앞에서 당신은 ${animal.love.style}.
    상대방은 당신의 ${animal.love.attraction_point}에 깊은 매력을 느낍니다.
    연애를 시작하면 주로 ${animal.love.approach_style} 방식으로 다가가며, ${animal.love.attractive_type} 유형의 사람에게 강하게 끌리는 경향이 있습니다.
    관계가 깊어질수록 ${animal.love.recurring_pattern} 패턴이 반복될 수 있으니 주의가 필요합니다.
    이별의 순간에는 ${animal.love.breakup_recovery} 태도를 보이며, ${animal.love.long_term_tip}을 기억한다면 사랑의 결실을 오래도록 맺을 수 있습니다.
  `;

  const career = `
    당신은 ${animal.career.good_work_method} 방식으로 일할 때 최고의 효율을 냅니다.
    ${animal.career.talent} 재능을 타고났으며, 특히 ${animal.career.recommended_fields.join(", ")} 분야에서 두각을 나타낼 가능성이 높습니다.
    반면 ${animal.career.bad_work_environment} 환경은 당신의 에너지를 뺏으니 피하는 것이 좋습니다.
    ${animal.career.earning_method} 방식으로 부를 쌓는 것이 유리하며, ${animal.career.aptitude_check} 성향을 잘 활용해 보세요.
  `;

  const wealth = `
    재물에 있어서는 ${animal.wealth.spending_style}.
    돈을 모을 때는 ${animal.wealth.saving_style} 전략이 가장 잘 맞습니다.
    ${animal.wealth.impulse_buy_risk} 위험이 있으니 자산 관리에 유의해야 하며, ${animal.wealth.investment_sense} 감각을 타고났습니다.
    장기적으로는 ${animal.wealth.monetization_strategy}을 통해 안정적인 수익 구조를 만드는 것을 추천합니다.
  `;

  const relationship = `
    사회생활에서는 ${animal.human_relations.first_impression} 인상을 남깁니다.
    친구들 사이에서는 ${animal.human_relations.friend_relations}, 가족들에게는 ${animal.human_relations.family_relations} 모습을 보입니다.
    ${animal.human_relations.social_relations} 관계 패턴을 가지고 있으며, ${animal.human_relations.connection_traits} 특징을 가진 인연이 당신의 곁에 오래 머물게 됩니다.
  `;

  const today = `
    오늘은 ${animal.today.support_message}
    ${animal.today.action} 일은 과감히 밀어붙여도 좋지만, ${animal.today.caution} 점은 꼭 염두에 두세요.
    행운을 부르는 행동은 ${animal.today.lucky_behavior}이며, ${animal.today.emotion_management}을 통해 평온한 하루를 보낼 수 있습니다.
  `;

  const growthMissions = [
    `일주 ${stageName(day)}의 에너지를 활용해 ${animal.personality.growth_direction}을(를) 위한 작은 습관을 오늘부터 시작해 보세요.`,
    `월주 ${stageName(month)}의 기운은 당신의 사회적 성취를 돕습니다. ${animal.career.advice}`,
    `현재 당신의 흐름에 맞는 ${animal.today.lucky_behavior}을 실천하며 긍정적인 에너지를 채워보세요.`,
  ];

  return {
    personality,
    love,
    career,
    wealth,
    relationship,
    today,
    growthMissions,
  };
}
