const SPREADS = {
  one_card: {
    id: "one_card",
    title: "오늘의 타로",
    questionType: "daily",
    positions: [
      { key: "today", label: "오늘의 핵심", role: "오늘 가장 강하게 작동하는 에너지", weight: 1.0 },
    ],
  },
  three_card_past_present_future: {
    id: "three_card_past_present_future",
    title: "과거-현재-미래",
    questionType: "future",
    positions: [
      { key: "past", label: "과거", role: "현재 흐름을 만든 배경", weight: 0.9 },
      { key: "present", label: "현재", role: "지금 핵심 상황", weight: 1.2 },
      { key: "future", label: "미래", role: "가까운 미래 전개", weight: 1.1 },
    ],
  },
  three_card_cause_process_outcome: {
    id: "three_card_cause_process_outcome",
    title: "원인-과정-결과",
    questionType: "general",
    positions: [
      { key: "cause", label: "원인", role: "문제의 출발점", weight: 1.0 },
      { key: "process", label: "과정", role: "지금 지나가는 핵심 단계", weight: 1.2 },
      { key: "outcome", label: "결과", role: "다음 결과 방향", weight: 1.0 },
    ],
  },
  relationship_six_card: {
    id: "relationship_six_card",
    title: "우리 사이 타로",
    questionType: "relationship",
    positions: [
      { key: "position_1", label: "내가 보는 상대", role: "내가 관계를 해석하는 방식", weight: 1.0 },
      { key: "position_2", label: "상대가 관계를 보는 것", role: "상대가 관계를 바라보는 시각", weight: 1.0 },
      { key: "position_3", label: "상대가 나를 보는 것", role: "상대의 감정적 해석", weight: 1.1 },
      { key: "position_4", label: "연애하고픈 마음", role: "상대의 실제 연애 의지", weight: 1.2 },
      { key: "position_5", label: "관계를 막는 것", role: "관계를 지연시키는 장애물", weight: 1.2 },
      { key: "position_6", label: "예상되는 결과", role: "가까운 미래 흐름", weight: 1.1 },
    ],
  },
  healing_rising_four_card: {
    id: "healing_rising_four_card",
    title: "힐링 라이징 타로",
    questionType: "general",
    positions: [
      { key: "hidden_truth", label: "숨겨진 진실", role: "감정 소모의 핵심 원인", weight: 1.1 },
      { key: "embrace_pain", label: "감정 수용", role: "지금 인정해야 할 감정", weight: 1.0 },
      { key: "silver_lining", label: "회복 단서", role: "현재 상황이 주는 배움", weight: 1.0 },
      { key: "step_forward", label: "다음 행동", role: "즉시 실행 가능한 치유 행동", weight: 1.2 },
    ],
  },
  reunion_lighthouse_five_card: {
    id: "reunion_lighthouse_five_card",
    title: "재회운 타로",
    questionType: "reunion",
    positions: [
      { key: "past_bond", label: "이별의 핵심 원인", role: "두 사람을 갈라놓은 감정 원인", weight: 1.1 },
      { key: "their_now", label: "현재 상대의 마음", role: "상대의 현재 정서와 여유", weight: 1.2 },
      { key: "outside_factor", label: "재회를 막는 조건", role: "외부 상황과 현실 변수", weight: 1.1 },
      { key: "their_heart", label: "숨겨진 속마음", role: "상대가 말하지 못하는 진심", weight: 1.2 },
      { key: "reunion_outcome", label: "재회 가능성", role: "가까운 미래의 재접근 가능성", weight: 1.3 },
    ],
  },
  yearly_twelve_card: {
    id: "yearly_twelve_card",
    title: "연간 12카드",
    questionType: "future",
    positions: Array.from({ length: 12 }, (_, idx) => ({
      key: `month_${idx + 1}`,
      label: `${idx + 1}월`,
      role: `${idx + 1}월의 핵심 에너지`,
      weight: 1.0,
    })),
  },
  yearly_three_card: {
    id: "yearly_three_card",
    title: "연간 3카드",
    questionType: "future",
    positions: [
      { key: "base_energy", label: "기본 에너지", role: "한 해의 기본 결", weight: 1.0 },
      { key: "challenge_opportunity", label: "도전과 기회", role: "넘어야 할 과제와 기회", weight: 1.1 },
      { key: "outcome_advice", label: "결과와 조언", role: "연말 흐름과 핵심 조언", weight: 1.2 },
    ],
  },
  self_esteem_levelup_five_card: {
    id: "self_esteem_levelup_five_card",
    title: "자존감 레벨업 타로",
    questionType: "general",
    positions: [
      { key: "past_debuff", label: "내가 남의 눈치를 살피게 된 이유", role: "과거 경험·내면화된 기준·죄책감의 뿌리", weight: 1.0 },
      { key: "inner_monster", label: "왜 나는 거절을 어려워 할까", role: "버림받을 두려움·갈등 회피·경계선 약화", weight: 1.1 },
      { key: "current_damage", label: "눈치 보는 습관이 내게 주는 피해", role: "자기검열·소진·분노 억압이 만드는 현재 손실", weight: 1.0 },
      { key: "mind_shield", label: "타인의 실망을 견뎌내는 방법", role: "자기결정권·감정 분리·건강한 권위 회복", weight: 1.1 },
      { key: "levelup_mastery", label: "내 마음을 1순위로 챙기는 방법", role: "자기승인·비교 중단·작은 성공 누적으로 자존감 재건", weight: 1.2 },
    ],
  },
  job_change_seven_card: {
    id: "job_change_seven_card",
    title: "이직 7카드",
    questionType: "career",
    positions: [
      { key: "calling", label: "천직", role: "타고난 직업 성향", weight: 1.0 },
      { key: "happy_direction", label: "행복 방향", role: "만족도가 높은 업무 결", weight: 1.0 },
      { key: "inner_vocation", label: "내면 소명", role: "깊은 동기와 보람", weight: 1.1 },
      { key: "life_after_move", label: "이직 이후", role: "이직 후 생활 변화", weight: 1.2 },
      { key: "action_steps", label: "행동 단계", role: "실행 우선순위", weight: 1.0 },
      { key: "let_go", label: "놓아야 할 것", role: "버려야 할 패턴", weight: 0.9 },
      { key: "overall_advice", label: "최종 조언", role: "의사결정 마무리 기준", weight: 1.2 },
    ],
  },
  mindscan_five_card: {
    id: "mindscan_five_card",
    title: "상대방 속마음 타로",
    questionType: "exMind",
    positions: [
      { key: "surface", label: "겉으로 보이는 태도", role: "상대가 겉으로 드러내는 말투와 반응", weight: 0.8 },
      { key: "hidden", label: "실제 속마음", role: "상대가 직접 말하지 않는 진짜 감정", weight: 1.2 },
      { key: "fear", label: "다가오지 않는 이유", role: "연락을 막는 심리적 장벽", weight: 1.0 },
      { key: "desire", label: "숨겨진 욕구", role: "겉으로 말하지 않는 기대와 욕구", weight: 1.0 },
      { key: "judgement", label: "관계에 대한 판단", role: "관계를 닫았는지, 유보 중인지에 대한 판단", weight: 1.1 },
    ],
  },
};

const SPREAD_ALIASES = {
  relationshipSixCard: "relationship_six_card",
  healingRisingFourCard: "healing_rising_four_card",
  reunionLighthouseFiveCard: "reunion_lighthouse_five_card",
  yearlyTwelveCard: "yearly_twelve_card",
  yearlyThreeCard: "yearly_three_card",
  selfEsteemLevelupFiveCard: "self_esteem_levelup_five_card",
  jobChangeSevenCard: "job_change_seven_card",
  exMind: "mindscan_five_card",
  "ex-mind": "mindscan_five_card",
  relationship: "relationship_six_card",
  reunion: "reunion_lighthouse_five_card",
};

function normalizeSpreadType(input) {
  const raw = String(input || "one_card").trim();
  if (!raw) return "one_card";
  if (SPREADS[raw]) return raw;
  return SPREAD_ALIASES[raw] || raw;
}

function getSpreadDefinition(spreadId) {
  const normalized = normalizeSpreadType(spreadId);
  return SPREADS[normalized] || null;
}

function listSpreadIds() {
  return Object.keys(SPREADS);
}

function expectedCardCount(spreadId) {
  const spread = getSpreadDefinition(spreadId);
  return spread ? spread.positions.length : 0;
}

export {
  SPREADS,
  SPREAD_ALIASES,
  normalizeSpreadType,
  getSpreadDefinition,
  expectedCardCount,
  listSpreadIds,
};
