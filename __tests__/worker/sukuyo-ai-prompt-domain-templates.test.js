/**
 * @jest-environment node
 */

let sukuyoPrompt;

beforeAll(async () => {
  sukuyoPrompt = await import("../../worker/lib/sukuyo-ai-prompt.js");
});

function buildBasicResult() {
  return {
    mansion: "성(星)",
    mansionIdx: 9,
    icon: "별",
    talent: 78,
    traits: {
      core: "관찰력이 좋고 관계 흐름을 빠르게 읽는다",
      hidden: "기대가 누적되면 냉각 반응이 나온다",
      love: "초반 몰입 후 거리 조절이 필요한 타입",
      work: "기획-정리형 업무에서 강점",
      wealth: "지출 패턴만 잡히면 축적이 빠르다",
      karma: "관계 경계선",
      mantra: "속도보다 리듬",
    },
    daily: {
      moon: { label: "차분" },
      insight: "감정 반응을 한 박자 늦추면 유리",
    },
  };
}

function buildCompatibilityResult() {
  return {
    myIdx: 9,
    partnerIdx: 14,
    partnerMansion: "장(張)",
    relationType: "영친",
    distanceLabel: "중거리",
    shortestDistance: 5,
    myRole: "주도",
    partnerRole: "완충",
    temperature: 71,
    score: 79,
    magnetism: 68,
    communicationScore: 74,
    stabilityScore: 70,
    growthScore: 77,
    conflictScore: 41,
    emotionalPattern: "긴장 후 빠른 회복",
    conflictPattern: "표현 부족",
    longTermPotential: "중상",
    stamp: "균형형",
    partnerGender: "F",
    partnerName: "테스트",
  };
}

describe("Sukuyo AI prompt domain templates", () => {
  test("reconciliation 도메인은 궁합 데이터 기반으로 생성된다", () => {
    const built = sukuyoPrompt.buildSukuyoAIPromptWithDomain({
      question: "재회 가능성과 연락 타이밍을 알려줘",
      basicResult: buildBasicResult(),
      compatibilityResult: buildCompatibilityResult(),
      domain: "reconciliation",
    });

    expect(built.domain).toBe("reconciliation");
    expect(built.domainLabel).toBe("재회/회복");
    expect(built.keywordWeights["재회 가능성"]).toBeDefined();
    expect(built.compatibilityUsed).toBe(true);
  });

  test("domain 미지정 시 질문으로 자동 분류한다", () => {
    const built = sukuyoPrompt.buildSukuyoAIPromptWithDomain({
      question: "돈이 새는 패턴과 저축 루틴을 알려줘",
      basicResult: buildBasicResult(),
    });

    expect(built.domain).toBe("money");
  });

  test("기존 buildSukuyoAIPrompt도 도메인 필드를 유지한다", () => {
    const built = sukuyoPrompt.buildSukuyoAIPrompt({
      question: "직업과 이직 흐름을 보고 싶어",
      basicResult: buildBasicResult(),
    });

    expect(built.domain).toBeDefined();
    expect(built.questionType).toBe("career");
  });

  test("지원하지 않는 domain이면 UNKNOWN_SUKUYO_DOMAIN 예외를 던진다", () => {
    expect(() => sukuyoPrompt.buildSukuyoAIPromptWithDomain({
      question: "충분히 긴 테스트 질문 문장입니다 domain 검증용",
      basicResult: buildBasicResult(),
      domain: "invalid_domain",
    })).toThrow("UNKNOWN_SUKUYO_DOMAIN");
  });

  test("궁합 필수 도메인에서 궁합 데이터가 없으면 예외를 던진다", () => {
    expect(() => sukuyoPrompt.buildSukuyoAIPromptWithDomain({
      question: "우리 재회 가능성을 자세히 봐줘",
      basicResult: buildBasicResult(),
      domain: "reconciliation",
    })).toThrow("MISSING_COMPATIBILITY_RESULT");
  });
});
