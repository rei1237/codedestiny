/**
 * @jest-environment node
 */

// buildSajuAIPromptWithDomain 의 advancedFactors(지장간 투간/투출 · 도충 · 개고)와
// worker/routes/fortune.js 의 상담문 완결성 검증을 고정한다.
// 십성표·카테고리 rubric 은 saju-ai-prompt-domain-templates.test.js 가 이미 덮는다.

let sajuPrompt;
let fortuneRoute;

beforeAll(async () => {
  [sajuPrompt, fortuneRoute] = await Promise.all([
    import("../../worker/lib/saju-ai-prompt.js"),
    import("../../worker/routes/fortune.js"),
  ]);
});

function makeSajuResult(overrides = {}) {
  const pillars = overrides.pillars || {
    y: { g: "甲", j: "子", gE: "목", jE: "수" },
    m: { g: "丙", j: "寅", gE: "화", jE: "목" },
    d: { g: "甲", j: "申", gE: "목", jE: "금" },
    h: { g: "癸", j: "辰", gE: "수", jE: "토" },
  };
  const daewun = Object.hasOwn(overrides, "daewun") ? overrides.daewun : [
    { age: 30, gan: "甲", zhi: "子", score: 88, label: "test daewoon" },
  ];
  return {
    profile: {
      name: "테스트",
      gender: "F",
      birth: { year: 1990, month: 3, day: 18, hour: 7, minute: 20, calType: "solar" },
    },
    snapshot: {
      gender: "F",
      birth: { year: 1990, month: 3, day: 18, hour: 7, minute: 20 },
      elementWeights: { wood: 3, fire: 1, earth: 1, metal: 1, water: 2 },
      analysis: { dayStemElement: "목" },
    },
    pillars,
    natal: { counts: { wood: 3, fire: 1, earth: 1, metal: 1, water: 2 }, dominant: "목" },
    johu: { type: "중화 조후", score: 72 },
    power: { isStrong: true, yongshin: ["화", "목"], kijishin: ["금"] },
    jong: { isJong: false, name: "일반격" },
    engineContext: {
      marker: "saju-ai-question-prompt-context-test",
      sourceLayers: ["pillars", "daewun-quantum-flow"],
      quantumMyeongli: {
        dayStem: pillars.d.g,
        monthBranch: pillars.m.j,
        currentAge: 36,
        elementMap: [],
        daewun,
      },
      promptConfig: overrides.promptConfig || undefined,
      renderedFeatureDigests: [],
    },
    annualLuck: overrides.annualLuck,
    monthlyLuck: overrides.monthlyLuck,
    dailyLuck: overrides.dailyLuck,
  };
}

function findOpening(built, sourceBranch, triggerBranch, relationType) {
  return (built.advancedFactors.earthStorageOpenings || []).find((row) => (
    row.sourceBranch === sourceBranch
      && row.triggerBranch === triggerBranch
      && row.relationType === relationType
  ));
}

describe("사주 AI 프롬프트 고급 요소", () => {
  test("지장간이 원국 천간에 투간되고 운 천간으로 투출되면 프롬프트에 실린다", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "올해 직업과 재물 흐름에서 무엇을 우선해야 하나요?",
      domain: "career",
      sajuResult: makeSajuResult(),
    });
    const factors = built.advancedFactors;

    expect(Array.isArray(factors.hiddenStems)).toBe(true);
    expect(factors.hiddenStems.length).toBeGreaterThanOrEqual(8);
    expect(factors.hiddenStems.every((row) => row.tenGodFromDayMaster)).toBe(true);

    const tougan = factors.hiddenStemExposures.find((row) => row.hiddenStem === "甲");
    expect(tougan.exposedInNatalHeavenlyStem).toBeTruthy();
    expect(tougan.exposedByLuckStem).toBeTruthy();
    expect(built.prompt).toContain("원국 천간에 투간된 지장간");
    expect(built.prompt).toContain("대운/세운/월운/일운에서 투출되는 지장간");
  });

  test("같은 지지가 3개면 도충이 서고 반대 지지를 끌어온다", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "이번 대운에 이동과 관계 변화가 강하게 나타날까요?",
      domain: "relationship",
      sajuResult: makeSajuResult({
        pillars: {
          y: { g: "甲", j: "子", gE: "목", jE: "수" },
          m: { g: "丙", j: "子", gE: "화", jE: "수" },
          d: { g: "甲", j: "寅", gE: "목", jE: "목" },
          h: { g: "癸", j: "辰", gE: "수", jE: "토" },
        },
        daewun: [{ age: 30, gan: "甲", zhi: "子", score: 90, label: "test do-chung daewoon" }],
      }),
    });

    expect(built.advancedFactors.doChung.exists).toBe(true);
    expect(built.advancedFactors.doChung.repeatedBranch).toBe("子");
    expect(built.advancedFactors.doChung.inducedOppositeBranch).toBe("午");
    expect(built.prompt).toContain("도충 존재 여부: 있음");
  });

  test("같은 지지가 3개 미만이면 도충이 서지 않는다", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "올해 건강과 일상 리듬에서 조심할 점은 무엇인가요?",
      domain: "health",
      sajuResult: makeSajuResult({
        daewun: [{ age: 30, gan: "丁", zhi: "未", score: 74, label: "test clean daewoon" }],
      }),
    });

    expect(built.advancedFactors.doChung.exists).toBe(false);
    expect(built.prompt).toContain("도충 존재 여부: 없음");
  });

  test("辰戌 충은 辰 지장간을 매우 강하게 개고한다", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "이번 세운에 직장과 재물 문제가 밖으로 드러날까요?",
      domain: "career",
      sajuResult: makeSajuResult({
        pillars: {
          y: { g: "甲", j: "子", gE: "목", jE: "수" },
          m: { g: "丙", j: "辰", gE: "화", jE: "토" },
          d: { g: "甲", j: "申", gE: "목", jE: "금" },
          h: { g: "癸", j: "寅", gE: "수", jE: "목" },
        },
        daewun: [],
        annualLuck: [{ scope: "sewoon", gan: "庚", zhi: "戌", label: "test sewoon Xu" }],
      }),
    });

    const opening = findOpening(built, "辰", "戌", "충");
    expect(opening).toBeDefined();
    expect(opening.openingStrength).toBe("veryStrong");
    expect(opening.openedHiddenStems.map((row) => row.stem)).toEqual(["戊", "乙", "癸"]);
  });

  test("丑未 충은 丑 지장간을 매우 강하게 개고한다", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "대운에서 돈과 계약 문제가 열릴까요?",
      domain: "money",
      sajuResult: makeSajuResult({
        pillars: {
          y: { g: "甲", j: "丑", gE: "목", jE: "토" },
          m: { g: "丙", j: "寅", gE: "화", jE: "목" },
          d: { g: "甲", j: "申", gE: "목", jE: "금" },
          h: { g: "癸", j: "子", gE: "수", jE: "수" },
        },
        daewun: [{ age: 30, gan: "丁", zhi: "未", score: 80, label: "test daewoon Wei" }],
        annualLuck: [{ scope: "sewoon", gan: "甲", zhi: "申", label: "neutral annual Shen" }],
      }),
    });

    const opening = findOpening(built, "丑", "未", "충");
    expect(opening).toBeDefined();
    expect(opening.openingStrength).toBe("veryStrong");
    expect(opening.openedHiddenStems.map((row) => row.stem)).toEqual(["己", "癸", "辛"]);
  });

  test("형·파·해는 충보다 약한 개고 강도를 가진다", () => {
    const punishment = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "조직 안에서 묵은 압력이 드러날까요?",
      domain: "career",
      sajuResult: makeSajuResult({
        pillars: {
          y: { g: "甲", j: "丑", gE: "목", jE: "토" },
          m: { g: "丙", j: "寅", gE: "화", jE: "목" },
          d: { g: "甲", j: "申", gE: "목", jE: "금" },
          h: { g: "癸", j: "戌", gE: "수", jE: "토" },
        },
        daewun: [],
        annualLuck: [{ scope: "sewoon", gan: "甲", zhi: "申", label: "neutral annual Shen" }],
      }),
    });
    expect(findOpening(punishment, "丑", "戌", "형").openingStrength).toBe("strong");

    const broken = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "묶인 자산과 가족 문제가 흔들릴까요?",
      domain: "money",
      sajuResult: makeSajuResult({
        pillars: {
          y: { g: "甲", j: "辰", gE: "목", jE: "토" },
          m: { g: "丙", j: "寅", gE: "화", jE: "목" },
          d: { g: "甲", j: "申", gE: "목", jE: "금" },
          h: { g: "癸", j: "子", gE: "수", jE: "수" },
        },
        daewun: [],
        annualLuck: [{ scope: "sewoon", gan: "己", zhi: "丑", label: "test break Chou" }],
      }),
    });
    expect(findOpening(broken, "辰", "丑", "파").openingStrength).toBe("medium");

    const harm = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "건강과 심리 부담이 은근히 드러날까요?",
      domain: "health",
      sajuResult: makeSajuResult({
        pillars: {
          y: { g: "甲", j: "辰", gE: "목", jE: "토" },
          m: { g: "丙", j: "寅", gE: "화", jE: "목" },
          d: { g: "甲", j: "申", gE: "목", jE: "금" },
          h: { g: "癸", j: "子", gE: "수", jE: "수" },
        },
        daewun: [],
        annualLuck: [{ scope: "sewoon", gan: "乙", zhi: "卯", label: "test harm Myo" }],
      }),
    });
    expect(findOpening(harm, "辰", "卯", "해").openingStrength).toBe("weak");
  });

  test("충/형/파/해가 없으면 토 지지가 있어도 개고되지 않는다", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "건강과 일상 리듬에서 조심할 점은 무엇인가요?",
      domain: "health",
      sajuResult: makeSajuResult({
        daewun: [{ age: 30, gan: "丁", zhi: "子", score: 74, label: "neutral daewoon Zi" }],
        annualLuck: [{ scope: "sewoon", gan: "甲", zhi: "申", label: "neutral annual Shen" }],
      }),
    });

    expect(built.advancedFactors.earthStorageOpenings).toHaveLength(0);
    expect(built.prompt).toContain("개고 존재 여부: 없음");
  });

  test("관리자 promptConfig 로 개고를 끄면 충이 있어도 비어 있다", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "세운에서 토 지지 충이 열리나요?",
      domain: "career",
      sajuResult: makeSajuResult({
        pillars: {
          y: { g: "甲", j: "辰", gE: "목", jE: "토" },
          m: { g: "丙", j: "寅", gE: "화", jE: "목" },
          d: { g: "甲", j: "申", gE: "목", jE: "금" },
          h: { g: "癸", j: "子", gE: "수", jE: "수" },
        },
        daewun: [],
        annualLuck: [{ scope: "sewoon", gan: "庚", zhi: "戌", label: "test sewoon Xu" }],
        promptConfig: { earthStorageOpening: { enabled: false } },
      }),
    });

    expect(built.advancedFactors.earthStorageOpenings).toHaveLength(0);
  });

  test("같은 입력이면 advancedFactors 가 동일하다 (본 화면·관리자 미리보기 공용 빌더)", () => {
    const args = {
      question: "커리어 전환을 언제 준비해야 하나요?",
      domain: "career",
    };
    const main = sajuPrompt.buildSajuAIPromptWithDomain({ ...args, sajuResult: makeSajuResult() });
    const adminPreview = sajuPrompt.buildSajuAIPromptWithDomain({ ...args, sajuResult: makeSajuResult() });

    expect(adminPreview.advancedFactors).toEqual(main.advancedFactors);
    expect(adminPreview.advancedFactors.earthStorageOpenings).toEqual(main.advancedFactors.earthStorageOpenings);
  });
});

describe("상담문 완결성 검증 (validateSajuAIResultText)", () => {
  // 여기서 incomplete 를 놓치면 repair pass 대신 전체 재생성(최대 60초)이 돈다
  // — worker/routes/fortune.js:197 주석 참조.
  const CONCISE_COMPLETE_CAREER_RESULT = [
    "1. 질문에 대한 핵심 답변",
    "지금 질문은 직업과 진로를 한꺼번에 정리하라는 흐름으로 보입니다. 일하는 방식은 혼자 밀어붙이기보다 역할을 분명히 나눌 때 안정됩니다.",
    "2. 이 명식의 중심 성향",
    "이 명식은 중심을 세운 뒤 성장 전략을 잡아야 힘이 납니다.",
    "3. 십성 구조 해석",
    "관성, 식상, 인성, 재성은 각각 책임, 표현, 학습, 현실 성과로 이어집니다.",
    "4. 오행 균형 해석",
    "오행 균형은 일의 속도와 회복 리듬을 함께 조절하라고 가리킵니다.",
    "5. 현재 고민과 명식의 연결",
    "이직과 전환 타이밍을 묻는 이유는 조직 안의 역할과 독립 가능성을 동시에 보고 싶기 때문입니다.",
    "6. 일/돈/관계/연애/건강 리듬",
    "일과 돈은 먼저 안정시키고, 관계와 건강은 무리한 확장보다 루틴을 세우는 편이 좋습니다.",
    "7. 조심해야 할 패턴",
    "성장 욕심이 앞서 준비 없이 움직이면 흐름이 흩어질 수 있습니다.",
    "8. 살리는 전략",
    "조직 안에서는 책임 범위를 분명히 하고, 독립은 작은 수익 모델부터 시험하세요.",
    "9. 30일 실천 가이드",
    "첫째, 업무 기록을 정리하세요. 둘째, 커리어 선택지를 세 개로 줄이세요. 셋째, 다음 전환을 위한 준비 항목을 적으세요.",
    "10. 마지막 한마디",
    "당신의 진로는 급히 증명할수록 흐려지기보다, 중심을 세우고 꾸준히 다듬을 때 더 선명하게 열립니다.",
  ].join("\n\n");

  function buildCareerPrompt() {
    return sajuPrompt.buildSajuAIPromptWithDomain({
      question: "올해 직업과 재물 흐름에서 무엇을 우선해야 하나요?",
      domain: "career",
      sajuResult: makeSajuResult(),
    });
  }

  test("10개 섹션이 다 있고 짧기만 하면 잘림이 아니라 분량으로 떨어진다", () => {
    const built = buildCareerPrompt();
    const validation = fortuneRoute.validateSajuAIResultText(CONCISE_COMPLETE_CAREER_RESULT, built.factSnapshot, {
      domain: "career",
      categoryRubric: built.categoryRubric,
    });

    // 완결성 판정은 길이가 아니라 섹션·꼬리 문장으로 한다. 짧은 완성문이 incomplete 로
    // 잡히면 repair pass 로 새는데, 실제로는 분량 하한(SAJU_AI_MIN_RESULT_CHARS)에 걸려야 한다.
    expect(validation.incomplete).toBeUndefined();
    expect(validation.ok).toBe(false);
    expect(validation.qualityIssues.minChars).toBe(sajuPrompt.SAJU_AI_MIN_RESULT_CHARS);
  });

  test("마지막 문장이 잘리면 incomplete 로 떨어진다", () => {
    const built = buildCareerPrompt();
    const validation = fortuneRoute.validateSajuAIResultText(`${CONCISE_COMPLETE_CAREER_RESULT}\n\n그리고`, built.factSnapshot, {
      domain: "career",
      categoryRubric: built.categoryRubric,
    });

    expect(validation.ok).toBe(false);
    expect(validation.incomplete).toBe(true);
  });
});
