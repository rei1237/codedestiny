export const guardianFortuneLlmInput = Object.freeze({
  birthDate: "1990-01-01",
  birthTime: "08:30",
  calendarType: "solar",
  gender: "unknown",
  topic: "love",
  category: "saju",
  mode: "yeoni",
  locale: "ko-KR",
  concern: "synthetic concern fixture",
});

export function makeGuardianFortuneContext({ topic = "love", mode = "yeoni", systems = ["saju"], category = "saju" } = {}) {
  return {
    version: "guardian-fortune.v1",
    inputSummary: {
      hasBirthTime: true,
      hasBirthPlace: false,
      calendarType: "solar",
      topic,
      category,
      mode,
      targetDate: "2026-08-02",
      locale: "ko-KR",
      hasConcern: true,
    },
    availableSystems: systems,
    unavailableClaims: systems.includes("sukuyo") ? [] : ["birth_time_dependent_claims"],
    saju: systems.includes("saju") ? {
      dayMaster: "갑목",
      currentFlowSummary: "표현을 서두르기보다 상대의 반응을 확인할 때 흐름이 안정됩니다.",
      personalityHook: "겉으로는 괜찮다고 말해도 속으로는 관계의 가능성을 오래 계산하는 편",
    } : undefined,
    sukuyo: systems.includes("sukuyo") ? {
      birthMansion: "묘",
      emotionalPattern: "마음이 움직이면 혼자 먼저 의미를 키우기 쉽습니다.",
      relationshipPattern: "가까워지고 싶을수록 상대의 속도를 살피는 패턴이 있습니다.",
    } : undefined,
    tarot: systems.includes("tarot") ? {
      spreadType: "three_card",
      cards: [{ name: "The Star", orientation: "upright", meaningSummary: "회복과 천천히 다시 믿는 과정" }],
      symbolicMessage: "기대보다 작은 신뢰를 쌓는 쪽이 관계를 오래 움직입니다.",
    } : undefined,
    integratedInsight: {
      openingHook: "상대의 말보다 태도 변화에 더 예민하게 반응하고 있는 흐름",
      currentTheme: "관계에서 표현과 기다림의 속도를 맞추는 일",
      likelyConcern: "상대가 나를 어떻게 생각하는지 확인하고 싶은 마음",
      adviceDirection: "확신보다 확인",
      cautionPattern: "상대 반응을 보기 전에 혼자 결론을 내리는 것",
      luckyActionHint: "연락하기 전 하고 싶은 말을 한 문장으로 줄여보기",
      premiumBridge: "관계에서 반복되는 거리감과 표현 패턴은 더 깊은 상담에서 이어갈 수 있어요.",
      evidenceKeys: ["saju.personalityHook"],
    },
    safetyConstraints: [],
  };
}
