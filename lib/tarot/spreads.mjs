const TAROT_SPREAD_TEXT_TRANSLATIONS = {
  ko: {
    "tarotSpread.title.001": "오늘의 타로",
    "tarotSpread.label.001": "오늘의 핵심",
    "tarotSpread.title.002": "과거-현재-미래",
    "tarotSpread.label.002": "과거",
    "tarotSpread.label.003": "현재",
    "tarotSpread.label.004": "미래",
    "tarotSpread.title.003": "원인-과정-결과",
    "tarotSpread.label.005": "원인",
    "tarotSpread.label.006": "과정",
    "tarotSpread.label.007": "결과",
    "tarotSpread.title.004": "우리 사이 타로",
    "tarotSpread.label.008": "내가 바라보는 상대",
    "tarotSpread.label.009": "상대가 관계 전체를 보는 시각",
    "tarotSpread.label.010": "상대가 나를 바라보는 마음",
    "tarotSpread.label.011": "상대의 연애 의지와 열망",
    "tarotSpread.label.012": "관계를 가로막는 핵심 요인",
    "tarotSpread.label.013": "앞으로 펼쳐질 단기적 결말",
    "tarotSpread.title.005": "힐링 라이징 타로",
    "tarotSpread.label.014": "숨겨진 진실",
    "tarotSpread.label.015": "감정 수용",
    "tarotSpread.label.016": "회복 단서",
    "tarotSpread.label.017": "다음 행동",
    "tarotSpread.title.006": "별 헤는 밤바다 재회운",
    "tarotSpread.label.018": "아직 남아 있는 마음",
    "tarotSpread.label.019": "상대가 보이는 마음의 결",
    "tarotSpread.label.020": "연락이 멈춘 현실 신호",
    "tarotSpread.label.021": "다시 닿을 수 있는 거리",
    "tarotSpread.label.022": "관계 회복의 조건과 기준",
    "tarotSpread.title.007": "연간 12카드",
    "tarotSpread.title.008": "연간 3카드",
    "tarotSpread.label.023": "한 해의 기본 리듬",
    "tarotSpread.label.024": "넘어야 할 문과 기회",
    "tarotSpread.label.025": "연말의 결실과 조율",
    "tarotSpread.title.009": "자존감 레벨업 타로",
    "tarotSpread.label.026": "내가 남의 눈치를 살피게 된 이유",
    "tarotSpread.label.027": "왜 나는 거절을 어려워 할까",
    "tarotSpread.label.028": "눈치 보는 습관이 내게 주는 피해",
    "tarotSpread.label.029": "타인의 실망을 견뎌내는 방법",
    "tarotSpread.label.030": "내 마음을 1순위로 챙기는 방법",
    "tarotSpread.title.010": "일의 문턱 7카드",
    "tarotSpread.label.031": "살아나는 일의 결",
    "tarotSpread.label.032": "덜 소모되는 방향",
    "tarotSpread.label.033": "마음의 소명",
    "tarotSpread.label.034": "문턱 너머의 생활",
    "tarotSpread.label.035": "현실로 여는 첫 행동",
    "tarotSpread.label.036": "놓아야 할 낡은 기준",
    "tarotSpread.label.037": "남길 기준과 옮길 방향",
    "tarotSpread.title.011": "상대방 속마음 타로",
    "tarotSpread.label.038": "겉으로 보이는 태도",
    "tarotSpread.label.039": "실제 속마음",
    "tarotSpread.label.040": "다가오지 않는 이유",
    "tarotSpread.label.041": "숨겨진 욕구",
    "tarotSpread.label.042": "관계에 대한 판단",
  },
};

function tarotSpreadText(key) {
  return TAROT_SPREAD_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

const SPREADS = {
  one_card: {
    id: "one_card",
    title: tarotSpreadText("tarotSpread.title.001"),
    questionType: "daily",
    positions: [
      { key: "today", label: tarotSpreadText("tarotSpread.label.001"), role: "오늘 가장 강하게 작동하는 에너지", weight: 1.0 },
    ],
  },
  three_card_past_present_future: {
    id: "three_card_past_present_future",
    title: tarotSpreadText("tarotSpread.title.002"),
    questionType: "future",
    positions: [
      { key: "past", label: tarotSpreadText("tarotSpread.label.002"), role: "현재 흐름을 만든 배경", weight: 0.9 },
      { key: "present", label: tarotSpreadText("tarotSpread.label.003"), role: "지금 핵심 상황", weight: 1.2 },
      { key: "future", label: tarotSpreadText("tarotSpread.label.004"), role: "가까운 미래 전개", weight: 1.1 },
    ],
  },
  three_card_cause_process_outcome: {
    id: "three_card_cause_process_outcome",
    title: tarotSpreadText("tarotSpread.title.003"),
    questionType: "general",
    positions: [
      { key: "cause", label: tarotSpreadText("tarotSpread.label.005"), role: "문제의 출발점", weight: 1.0 },
      { key: "process", label: tarotSpreadText("tarotSpread.label.006"), role: "지금 지나가는 핵심 단계", weight: 1.2 },
      { key: "outcome", label: tarotSpreadText("tarotSpread.label.007"), role: "다음 결과 방향", weight: 1.0 },
    ],
  },
  relationship_six_card: {
    id: "relationship_six_card",
    title: tarotSpreadText("tarotSpread.title.004"),
    questionType: "relationship",
    positions: [
      {
        key: "self_view_of_other",
        label: tarotSpreadText("tarotSpread.label.008"),
        role: "내가 상대를 어떻게 해석하고 있는지, 기대·두려움·투사의 방향",
        readingFocus: "내가 보고 있는 상대의 모습이 실제 상대인지, 내 감정이 덧씌운 이미지인지",
        weight: 1.0,
      },
      {
        key: "other_view_of_relationship",
        label: tarotSpreadText("tarotSpread.label.009"),
        role: "상대가 이 관계를 가볍게 보는지, 조심스럽게 보는지, 가능성으로 보는지",
        readingFocus: "상대가 이 관계의 이름과 속도를 어떻게 정하고 있는지",
        weight: 1.0,
      },
      {
        key: "other_feeling_toward_me",
        label: tarotSpreadText("tarotSpread.label.010"),
        role: "상대가 나에게 느끼는 감정의 온도, 매력, 부담, 거리감",
        readingFocus: "상대가 나에게 실제로 느끼는 끌림·경계·혼란",
        weight: 1.1,
      },
      {
        key: "other_romantic_will",
        label: tarotSpreadText("tarotSpread.label.011"),
        role: "상대가 이 관계를 실제 연애나 더 깊은 관계로 발전시키려는 의지",
        readingFocus: "마음은 있어도 움직일 의지가 있는지, 혹은 마음보다 상황/두려움이 큰지",
        weight: 1.2,
      },
      {
        key: "core_block",
        label: tarotSpreadText("tarotSpread.label.012"),
        role: "두 사람 사이에서 반복되는 오해, 타이밍, 자존심, 현실 문제, 두려움",
        readingFocus: "관계가 앞으로 나아가지 못하는 진짜 병목",
        weight: 1.2,
      },
      {
        key: "short_term_outcome",
        label: tarotSpreadText("tarotSpread.label.013"),
        role: "현재 흐름이 유지될 경우 2~6주 안에 나타날 가능성 높은 결과",
        readingFocus: "현재 패턴의 자연스러운 귀결과 바꿀 수 있는 지점",
        weight: 1.1,
      },
    ],
  },
  healing_rising_four_card: {
    id: "healing_rising_four_card",
    title: tarotSpreadText("tarotSpread.title.005"),
    questionType: "general",
    positions: [
      { key: "hidden_truth", label: tarotSpreadText("tarotSpread.label.014"), role: "감정 소모의 핵심 원인", weight: 1.1 },
      { key: "embrace_pain", label: tarotSpreadText("tarotSpread.label.015"), role: "지금 인정해야 할 감정", weight: 1.0 },
      { key: "silver_lining", label: tarotSpreadText("tarotSpread.label.016"), role: "현재 상황이 주는 배움", weight: 1.0 },
      { key: "step_forward", label: tarotSpreadText("tarotSpread.label.017"), role: "즉시 실행 가능한 치유 행동", weight: 1.2 },
    ],
  },
  reunion_lighthouse_five_card: {
    id: "reunion_lighthouse_five_card",
    title: tarotSpreadText("tarotSpread.title.006"),
    questionType: "reunion",
    positions: [
      { key: "past_bond", label: tarotSpreadText("tarotSpread.label.018"), role: "내 감정의 온도와 미완의 감정 잔여량", weight: 1.1 },
      { key: "their_now", label: tarotSpreadText("tarotSpread.label.019"), role: "상대의 내면 상태와 겉표현·속마음의 간극", weight: 1.2 },
      { key: "outside_factor", label: tarotSpreadText("tarotSpread.label.020"), role: "연락 단절의 실제 이유와 감정적·현실적 변수", weight: 1.1 },
      { key: "their_heart", label: tarotSpreadText("tarotSpread.label.021"), role: "재접근의 타이밍과 속도, 안전한 거리", weight: 1.2 },
      { key: "reunion_outcome", label: tarotSpreadText("tarotSpread.label.022"), role: "재회가 오래 가기 위한 내부 조건과 반복 패턴 차단 기준", weight: 1.3 },
    ],
  },
  yearly_twelve_card: {
    id: "yearly_twelve_card",
    title: tarotSpreadText("tarotSpread.title.007"),
    questionType: "future",
    positions: Array.from({ length: 12 }, (_, idx) => ({
      key: `month_${idx + 1}`,
      label: `${idx + 1}월 수호 리듬`,
      role: `${idx + 1}월을 지키는 십이지신 기운과 카드의 조율점`,
      weight: 1.0,
    })),
  },
  yearly_three_card: {
    id: "yearly_three_card",
    title: tarotSpreadText("tarotSpread.title.008"),
    questionType: "future",
    positions: [
      { key: "base_energy", label: tarotSpreadText("tarotSpread.label.023"), role: "한 해를 여는 기본 결", weight: 1.0 },
      { key: "challenge_opportunity", label: tarotSpreadText("tarotSpread.label.024"), role: "조심할 구간과 열리는 기회", weight: 1.1 },
      { key: "outcome_advice", label: tarotSpreadText("tarotSpread.label.025"), role: "연말 흐름과 마지막 조율 문장", weight: 1.2 },
    ],
  },
  self_esteem_levelup_five_card: {
    id: "self_esteem_levelup_five_card",
    title: tarotSpreadText("tarotSpread.title.009"),
    questionType: "general",
    positions: [
      { key: "past_debuff", label: tarotSpreadText("tarotSpread.label.026"), role: "타인의 표정·말투·분위기를 내 선택 기준으로 삼게 된 심리적 뿌리", weight: 1.0 },
      { key: "inner_monster", label: tarotSpreadText("tarotSpread.label.027"), role: "거절을 상실·비난·실망으로 느끼는 자동 사고와 경계 약화", weight: 1.1 },
      { key: "current_damage", label: tarotSpreadText("tarotSpread.label.028"), role: "과잉 분석·자기검열·분노 억압이 만드는 현재 소모", weight: 1.0 },
      { key: "mind_shield", label: tarotSpreadText("tarotSpread.label.029"), role: "감정 분리·설명 최소화·기준 유지로 경계를 훈련하는 자리", weight: 1.1 },
      { key: "levelup_mastery", label: tarotSpreadText("tarotSpread.label.030"), role: "감정 우선 확인·기준 기록·자기신뢰 회복으로 독립감을 세우는 자리", weight: 1.2 },
    ],
  },
  job_change_seven_card: {
    id: "job_change_seven_card",
    title: tarotSpreadText("tarotSpread.title.010"),
    questionType: "career",
    positions: [
      { key: "calling", label: tarotSpreadText("tarotSpread.label.031"), role: "일에서 다시 살아나는 고유 강점", weight: 1.0 },
      { key: "happy_direction", label: tarotSpreadText("tarotSpread.label.032"), role: "만족도가 높고 에너지 누수가 적은 업무 결", weight: 1.0 },
      { key: "inner_vocation", label: tarotSpreadText("tarotSpread.label.033"), role: "깊은 동기와 오래 남는 보람", weight: 1.1 },
      { key: "life_after_move", label: tarotSpreadText("tarotSpread.label.034"), role: "전환 후 생활 리듬과 현실 변화", weight: 1.2 },
      { key: "action_steps", label: tarotSpreadText("tarotSpread.label.035"), role: "지원, 포트폴리오, 협상, 정리의 우선순위", weight: 1.0 },
      { key: "let_go", label: tarotSpreadText("tarotSpread.label.036"), role: "버려야 할 비교와 소모 패턴", weight: 0.9 },
      { key: "overall_advice", label: tarotSpreadText("tarotSpread.label.037"), role: "의사결정을 닫는 마지막 기준", weight: 1.2 },
    ],
  },
  mindscan_five_card: {
    id: "mindscan_five_card",
    title: tarotSpreadText("tarotSpread.title.011"),
    questionType: "exMind",
    positions: [
      { key: "surface", label: tarotSpreadText("tarotSpread.label.038"), role: "상대가 겉으로 드러내는 말투와 반응", weight: 0.8 },
      { key: "hidden", label: tarotSpreadText("tarotSpread.label.039"), role: "상대가 직접 말하지 않는 진짜 감정", weight: 1.2 },
      { key: "fear", label: tarotSpreadText("tarotSpread.label.040"), role: "연락을 막는 심리적 장벽", weight: 1.0 },
      { key: "desire", label: tarotSpreadText("tarotSpread.label.041"), role: "겉으로 말하지 않는 기대와 욕구", weight: 1.0 },
      { key: "judgement", label: tarotSpreadText("tarotSpread.label.042"), role: "관계를 닫았는지, 유보 중인지에 대한 판단", weight: 1.1 },
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
