const baseInput = {
  birthDate: "1988-08-08",
  birthTime: "09:30",
  birthPlace: {
    city: "Seoul",
    country: "KR",
    latitude: 37.5665,
    longitude: 126.978,
    timezone: "Asia/Seoul",
  },
  calendarType: "solar",
  gender: "unknown",
  nickname: "달빛사용자",
  concern: "요즘 선택의 순서를 천천히 정리하고 있어요.",
  topic: "daily",
  category: "saju",
  mode: "yeoni",
  locale: "ko-KR",
  targetDate: "2026-08-02",
};

const mockContext = {
  version: "guardian-fortune.v1",
  inputSummary: {
    hasBirthTime: true,
    hasBirthPlace: true,
    calendarType: "solar",
    topic: "daily",
    category: "saju",
    mode: "yeoni",
    targetDate: "2026-08-02",
    locale: "ko-KR",
    hasConcern: true,
  },
  availableSystems: ["saju"],
  unavailableClaims: ["ziwei.birth_time_unknown"],
  saju: {
    dayMaster: "합성 일간",
    tenGodsSummary: "표현과 현실 감각이 함께 강조되는 흐름",
    fiveElementsSummary: "시작하는 힘과 정리하는 힘의 균형을 살핍니다.",
    currentFlowSummary: "오늘은 순서를 정리하면 속도가 살아납니다.",
    personalityHook: "겉으로는 괜찮아 보여도 속으로 가능성을 비교하는 경향",
    cautions: ["결론을 서두르는 패턴"],
  },
  astrology: {
    sunSummary: "표면에서는 목표를 분명히 하려는 흐름",
    moonSummary: "감정은 주변 반응에 따라 섬세하게 움직입니다.",
    currentMoodSummary: "오늘은 반응보다 내 기준을 먼저 확인하는 편이 좋습니다.",
  },
  tarot: {
    spreadType: "one_card",
    cards: [{ name: "합성 카드", orientation: "upright", positionKey: "today_symbol", meaningSummary: "한 걸음씩 확인하는 상징" }],
    symbolicMessage: "작은 확인이 다음 장면을 엽니다.",
  },
  integratedInsight: {
    openingHook: "겉으로는 괜찮아 보여도 속으로는 가능성과 순서를 비교하는 흐름",
    currentTheme: "오늘은 속도보다 순서를 정리할 때입니다.",
    likelyConcern: "무엇부터 선택해야 할지",
    adviceDirection: "확신보다 확인 가능한 다음 행동을 고르기",
    cautionPattern: "작은 반응을 전체 결론처럼 키우는 것",
    luckyActionHint: "오늘 확인할 조건 하나를 적어보세요.",
    premiumBridge: "오늘의 흐름을 더 세밀하게 보고 싶다면 다음 상담에서 이어갈 수 있어요.",
    evidenceKeys: ["saju.dayMaster"],
  },
  safetyConstraints: ["계산 근거 밖의 주장을 만들지 않기"],
};

const topicInputs = Object.freeze({
  daily: { ...baseInput, topic: "daily" },
  love: { ...baseInput, topic: "love" },
  money_work: { ...baseInput, topic: "money_work" },
  relationship: { ...baseInput, topic: "relationship" },
  mind: { ...baseInput, topic: "mind" },
  decision: { ...baseInput, topic: "decision" },
  noBirthTime: { ...baseInput, birthTime: undefined },
  yeoni: { ...baseInput, mode: "yeoni" },
  neo: { ...baseInput, mode: "neo" },
});

module.exports = { baseInput, mockContext, topicInputs };
