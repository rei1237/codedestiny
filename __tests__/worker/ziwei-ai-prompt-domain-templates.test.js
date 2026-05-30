/**
 * @jest-environment node
 */

let ziweiPrompt;

beforeAll(async () => {
  ziweiPrompt = await import("../../worker/lib/ziwei-ai-prompt.js");
});

function buildChartResult() {
  return {
    user: {
      gender: "M",
      calendarType: "solar",
      birthYear: 1991,
      birthMonth: 2,
      birthDay: 20,
      birthHour: 8,
      birthMinute: 34,
      birthPlace: "서울",
      timezone: "Asia/Seoul",
    },
    mingGong: "명궁",
    shenGong: "관록궁",
    sihua: {
      hualu: "천기",
      huaquan: "태양",
      huake: "문창",
      huaji: "거문",
    },
    summary: {
      strongestPalaceId: "career",
      weakestPalaceId: "health",
      direction: "확장형",
      strengths: ["실행력", "분석력"],
      weaknesses: ["과부하", "집중 분산"],
    },
    majorPeriods: [
      { palaceId: "career", range: "31~40" },
      { palaceId: "wealth", range: "41~50" },
    ],
    annualFlow: {
      yearLabel: "2026",
      keyPalaces: ["career", "wealth"],
      notes: ["외부 확장 기회", "관계 조율 필요"],
    },
    palaces: [
      {
        id: "ming",
        name: "명궁",
        branch: "자",
        index: 0,
        mainStars: [{ name: "자미", strengthSymbol: "◎" }],
        auxiliaryStars: [{ name: "천부", strengthSymbol: "O" }],
        strengthSummary: { weakStars: [{ name: "파군", strengthSymbol: "X" }] },
      },
      {
        id: "spouse",
        name: "부부궁",
        branch: "축",
        index: 1,
        mainStars: [{ name: "태음", strengthSymbol: "O" }],
        auxiliaryStars: [{ name: "문곡", strengthSymbol: "▲" }],
        strengthSummary: { weakStars: [] },
      },
      {
        id: "wealth",
        name: "재백궁",
        branch: "인",
        index: 2,
        mainStars: [{ name: "무곡", strengthSymbol: "◎" }],
        auxiliaryStars: [{ name: "천상", strengthSymbol: "△" }],
        strengthSummary: { weakStars: [] },
      },
      {
        id: "career",
        name: "관록궁",
        branch: "묘",
        index: 3,
        mainStars: [{ name: "태양", strengthSymbol: "O" }],
        auxiliaryStars: [{ name: "좌보", strengthSymbol: "▲" }],
        strengthSummary: { weakStars: [] },
      },
      {
        id: "health",
        name: "질액궁",
        branch: "진",
        index: 4,
        mainStars: [{ name: "거문", strengthSymbol: "X" }],
        auxiliaryStars: [{ name: "천요", strengthSymbol: "△" }],
        strengthSummary: { weakStars: [{ name: "화성", strengthSymbol: "X" }] },
      },
      {
        id: "friends",
        name: "교우궁",
        branch: "사",
        index: 5,
        mainStars: [{ name: "천량", strengthSymbol: "O" }],
        auxiliaryStars: [{ name: "우필", strengthSymbol: "▲" }],
        strengthSummary: { weakStars: [] },
      },
      {
        id: "fortune",
        name: "복덕궁",
        branch: "오",
        index: 6,
        mainStars: [{ name: "천기", strengthSymbol: "O" }],
        auxiliaryStars: [{ name: "문창", strengthSymbol: "▲" }],
        strengthSummary: { weakStars: [] },
      },
      {
        id: "travel",
        name: "천이궁",
        branch: "미",
        index: 7,
        mainStars: [{ name: "칠살", strengthSymbol: "△" }],
        auxiliaryStars: [{ name: "천마", strengthSymbol: "O" }],
        strengthSummary: { weakStars: [] },
      },
    ],
  };
}

describe("Ziwei AI prompt domain templates", () => {
  test("money 도메인으로 프롬프트를 생성한다", () => {
    const built = ziweiPrompt.buildZiweiAIPromptWithDomain({
      question: "내 재물운과 수익 구조를 자세히 알려줘",
      chartResult: buildChartResult(),
      domain: "money",
    });

    expect(built.domain).toBe("money");
    expect(built.domainLabel).toBe("돈/재물");
    expect(built.keywordWeights["재백궁"]).toBeDefined();
  });

  test("lawsuit 도메인으로 프롬프트를 생성한다", () => {
    const built = ziweiPrompt.buildZiweiAIPromptWithDomain({
      question: "송사 리스크와 대응 순서를 알려줘",
      chartResult: buildChartResult(),
      domain: "lawsuit",
    });

    expect(built.domain).toBe("lawsuit");
    expect(built.domainLabel).toBe("송사/분쟁");
  });

  test("domain 미지정 시 질문으로 자동 분류한다", () => {
    const built = ziweiPrompt.buildZiweiAIPromptWithDomain({
      question: "직업과 이직 타이밍이 궁금해",
      chartResult: buildChartResult(),
    });

    expect(built.domain).toBe("career");
  });

  test("기존 buildZiweiAIPrompt도 domain 기반 반환을 유지한다", () => {
    const built = ziweiPrompt.buildZiweiAIPrompt({
      question: "인생 방향을 어떻게 잡아야 할까",
      chartResult: buildChartResult(),
    });

    expect(built.domain).toBeDefined();
    expect(built.questionType).toBe("life_direction");
  });

  test("지원하지 않는 domain이면 UNKNOWN_ZIWEI_DOMAIN 예외를 던진다", () => {
    expect(() => ziweiPrompt.buildZiweiAIPromptWithDomain({
      question: "이것은 길이가 충분한 테스트 질문입니다",
      chartResult: buildChartResult(),
      domain: "unknown_domain",
    })).toThrow("UNKNOWN_ZIWEI_DOMAIN");
  });
});
