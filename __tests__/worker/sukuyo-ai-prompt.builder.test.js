/**
 * @jest-environment node
 */

let sukuyoPrompt;

beforeAll(async () => {
  sukuyoPrompt = await import("../../worker/lib/sukuyo-ai-prompt.js");
});

function buildBaseBasicResult() {
  return {
    mansion: "방",
    mansionIdx: 3,
    icon: "dragon",
    talent: 82,
    traits: {
      core: "주도성이 강하고 핵심을 빠르게 파악함",
      hidden: "통제 욕구가 올라오면 관계가 경직될 수 있음",
      love: "확신이 생기면 몰입이 빠른 편",
      work: "결정-실행 속도가 빠름",
      wealth: "확장 투자 성향",
      karma: "관계에서 주도권과 존중의 균형 학습",
      mantra: "속도보다 균형",
    },
    daily: {
      moon: { label: "상현", desc: "확장 구간" },
      insight: "대화 리듬 조절이 핵심",
    },
  };
}

function buildCompatibilityResult() {
  return {
    myIdx: 3,
    partnerIdx: 12,
    partnerMansion: "실",
    partnerName: "이하늘",
    partnerGender: "여성",
    relationType: "영친",
    relationTypeHan: "榮親",
    distanceLabel: "중거리",
    shortestDistance: 4,
    myRole: "영",
    partnerRole: "친",
    directionFromAToB: "순행 +4",
    directionFromBToA: "역행 +23",
    score: 84,
    temperature: 76,
    magnetism: 79,
    communicationScore: 81,
    stabilityScore: 78,
    growthScore: 83,
    conflictScore: 42,
    emotionalPattern: "초반 몰입이 빠르지만 감정 확인 루틴이 필요",
    conflictPattern: "확신 표현 속도 차이로 오해 발생",
    longTermPotential: "생활 리듬 합의 시 장기 안정성 높음",
    summary: "상호 보완성이 높고 실전 조율이 중요",
  };
}

describe("Sukuyo AI prompt builder", () => {
  test("궁합 질문에서 궁합 데이터가 없으면 예외를 던진다", () => {
    expect(() => sukuyoPrompt.buildSukuyoAIPrompt({
      question: "우리 둘 궁합이 결혼까지 갈 수 있을까?",
      basicResult: buildBaseBasicResult(),
      compatibilityResult: null,
    })).toThrow("MISSING_COMPATIBILITY_RESULT");
  });

  test("궁합 데이터가 있으면 나/상대 상세 궁합 축이 프롬프트에 포함된다", () => {
    const built = sukuyoPrompt.buildSukuyoAIPrompt({
      question: "상대와 내 숙요 궁합을 구체적으로 알려줘.",
      basicResult: buildBaseBasicResult(),
      compatibilityResult: buildCompatibilityResult(),
    });

    expect(built.questionType).toBe("compatibility");
    expect(built.compatibilityUsed).toBe(true);
    expect(built.prompt).toContain("나의 숙요 데이터");
    expect(built.prompt).toContain("상대 숙요 데이터");
    expect(built.prompt).toContain("관계 점수 축");
    expect(built.prompt).toContain("관계 외 주제 확장은 배제");
  });

  test("비궁합 질문은 기존처럼 개인 리듬 중심으로 생성된다", () => {
    const built = sukuyoPrompt.buildSukuyoAIPrompt({
      question: "이번 달 커리어 의사결정 포인트를 알려줘",
      basicResult: buildBaseBasicResult(),
      compatibilityResult: null,
    });

    expect(built.questionType).toBe("career");
    expect(built.compatibilityUsed).toBe(false);
    expect(built.prompt).toContain("숙요점 기반 AI 상담 프롬프트");
  });
});
