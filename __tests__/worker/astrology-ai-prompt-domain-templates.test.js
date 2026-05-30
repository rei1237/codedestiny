/**
 * @jest-environment node
 */

let astrologyPrompt;

beforeAll(async () => {
  astrologyPrompt = await import("../../worker/lib/astrology-ai-prompt.js");
});

function buildBaseAstrologyResult() {
  return {
    birth: {
      year: 1992,
      month: 6,
      day: 14,
      hour: 9,
      minute: 25,
      timezone: "Asia/Seoul",
      latitude: 37.5665,
      longitude: 126.978,
    },
    coreSigns: {
      sun: "Gemini",
      moon: "Virgo",
      asc: "Leo",
      mc: "Taurus",
      desc: "Aquarius",
    },
    elements: {
      dominant: "공기",
      weakest: "물",
      counts: { fire: 3, earth: 4, air: 5, water: 1 },
      percentages: { fire: 23, earth: 31, air: 38, water: 8 },
    },
    modalities: {
      dominant: "변통",
      counts: { cardinal: 3, fixed: 3, mutable: 6 },
      advice: "우선순위 고정이 필요",
    },
    focus: {
      topHouse: "10H",
      topHouseTopic: "커리어",
      focusCount: 4,
    },
    transits: {
      jupiterTransit: "11H transit",
      jupiterIndex: 11,
      message: "확장 기회 구간",
    },
    timelord: {
      firdaria: { main: "Mercury", sub: "Venus", yearsLeft: 2 },
      profection: { house: "10H", sign: "Taurus", ruler: "Venus", theme: "career" },
    },
    placements: [
      { planet: "Sun", sign: "Gemini", house: "11H", degree: "12°" },
      { planet: "Moon", sign: "Virgo", house: "2H", degree: "3°" },
    ],
    majorAspects: [
      { pair: "Sun-Moon", aspect: "Square", orb: "3" },
      { pair: "Venus-Mars", aspect: "Trine", orb: "2" },
    ],
  };
}

function buildCompatibilityResult() {
  return {
    source: "synastry",
    score: 78,
    relationType: "보완형",
    loveDesc: "감정 호흡이 맞는 편",
    workDesc: "역할 분담이 명확",
    spiritDesc: "성장 동반 가능",
    bestSupport: "금성-달 조화",
    bestChallenge: "화성-토성 긴장",
    partner: {
      name: "테스트상대",
      gender: "F",
      sun: "Libra",
      moon: "Cancer",
      venus: "Virgo",
      mars: "Scorpio",
    },
    houseOverlay: {
      mySunInPartnerHouse: "7H",
      partnerSunInMyHouse: "5H",
      myMoonInPartnerHouse: "4H",
      partnerMoonInMyHouse: "8H",
      myVenusInPartnerHouse: "5H",
      partnerVenusInMyHouse: "7H",
    },
  };
}

describe("Astrology AI prompt domain templates", () => {
  test("money 도메인으로 프롬프트를 생성한다", () => {
    const built = astrologyPrompt.buildAstrologyAIPromptWithDomain({
      question: "내 재정 흐름과 수익 구조를 점검해줘",
      astrologyResult: buildBaseAstrologyResult(),
      domain: "money",
    });

    expect(built.domain).toBe("money");
    expect(built.domainLabel).toBe("재정/수익");
    expect(built.keywordWeights["현금흐름"]).toBeDefined();
  });

  test("reconciliation 도메인은 궁합 데이터가 필요하다", () => {
    expect(() => astrologyPrompt.buildAstrologyAIPromptWithDomain({
      question: "재회 가능성과 연락 타이밍을 알려줘",
      astrologyResult: buildBaseAstrologyResult(),
      domain: "reconciliation",
    })).toThrow("COMPATIBILITY_CONTEXT_REQUIRED");
  });

  test("domain 미지정 시 질문으로 자동 분류한다", () => {
    const built = astrologyPrompt.buildAstrologyAIPromptWithDomain({
      question: "연애운과 관계 흐름이 궁금해",
      astrologyResult: buildBaseAstrologyResult(),
    });

    expect(built.domain).toBe("love");
  });

  test("기존 buildAstrologyAIPrompt도 domain 기반 반환을 유지한다", () => {
    const built = astrologyPrompt.buildAstrologyAIPrompt({
      question: "직업과 이직 타이밍을 알려줘",
      astrologyResult: buildBaseAstrologyResult(),
    });

    expect(built.domain).toBeDefined();
    expect(built.questionType).toBe("career");
  });

  test("지원하지 않는 domain이면 UNKNOWN_ASTROLOGY_DOMAIN 예외를 던진다", () => {
    expect(() => astrologyPrompt.buildAstrologyAIPromptWithDomain({
      question: "이것은 길이가 충분한 테스트 질문입니다",
      astrologyResult: buildBaseAstrologyResult(),
      domain: "unknown_domain",
    })).toThrow("UNKNOWN_ASTROLOGY_DOMAIN");
  });

  test("궁합 도메인은 compatibilityResult를 반영한다", () => {
    const built = astrologyPrompt.buildAstrologyAIPromptWithDomain({
      question: "우리 궁합 흐름을 자세히 알려줘",
      astrologyResult: buildBaseAstrologyResult(),
      compatibilityResult: buildCompatibilityResult(),
      domain: "compatibility",
    });

    expect(built.domain).toBe("compatibility");
    expect(built.compatibilityUsed).toBe(true);
  });
});
