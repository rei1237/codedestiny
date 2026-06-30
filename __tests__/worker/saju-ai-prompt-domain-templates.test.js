/**
 * @jest-environment node
 */

let sajuPrompt;

beforeAll(async () => {
  sajuPrompt = await import("../../worker/lib/saju-ai-prompt.js");
});

function buildBaseSajuResult() {
  return {
    profile: {
      name: "홍길동",
      gender: "M",
      birth: {
        year: 1991,
        month: 2,
        day: 20,
        hour: 8,
        minute: 34,
        calType: "solar",
      },
      location: {
        label: "서울",
        tz: "Asia/Seoul",
      },
    },
    snapshot: {
      birth: {
        year: 1991,
        month: 2,
        day: 20,
        hour: 8,
        minute: 34,
      },
    },
    pillars: {
      y: { g: "辛", j: "未" },
      m: { g: "庚", j: "寅" },
      d: { g: "甲", j: "辰", gE: "목" },
      h: { g: "戊", j: "辰" },
    },
    natal: {
      counts: { wood: 2, fire: 1, earth: 3, metal: 2, water: 1 },
      dominant: "토",
    },
    johu: { type: "한조", score: 68 },
    power: { isStrong: false, yongshin: ["화", "목"], kijishin: ["토"] },
    jong: { isJong: false },
  };
}

describe("Saju AI prompt domain templates", () => {
  test("신금 일간 기준 십성표를 고정한다", () => {
    const cases = [
      ["壬", "상관"],
      ["癸", "식신"],
      ["甲", "정재"],
      ["乙", "편재"],
      ["丙", "정관"],
      ["丁", "편관"],
      ["戊", "정인"],
      ["己", "편인"],
      ["庚", "겁재"],
      ["辛", "비견"],
    ];

    cases.forEach(([targetStem, expected]) => {
      expect(sajuPrompt.getTenGodFromDayMaster("辛", targetStem)).toBe(expected);
    });
  });

  test("명식 fact snapshot이 신금-임수 오류를 막는다", () => {
    const base = buildBaseSajuResult();
    base.pillars = {
      y: { g: "壬", j: "申" },
      m: { g: "癸", j: "酉" },
      d: { g: "辛", j: "丑", gE: "금" },
      h: { g: "甲", j: "辰" },
    };
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "나의 일과 돈, 관계 흐름을 명식 전체로 자세히 알려줘",
      sajuResult: base,
      domain: "life_direction",
    });

    expect(built.promptVersion).toBe("saju-myeongsik-ai-v3");
    expect(built.factSnapshot.fixedTenGodTable.find((row) => row.stem === "壬")?.tenGod).toBe("상관");
    expect(built.factSnapshot.fixedTenGodTable.find((row) => row.stem === "癸")?.tenGod).toBe("식신");
    expect(built.factCard).toContain("壬(임):상관");
    expect(built.factCard).toContain("癸(계):식신");
    expect(built.prompt).toContain("[카테고리별 상담 품질 기준]");
    expect(built.categoryRubric.domain).toBe("life_direction");
    expect(sajuPrompt.validateSajuMyeongsikTenGodText("임수는 상관으로 작동합니다.", built.factSnapshot).ok).toBe(true);
    expect(sajuPrompt.validateSajuMyeongsikTenGodText("임수는 식신으로 작동합니다.", built.factSnapshot).ok).toBe(false);
  });

  test("각 도메인별 상담 품질 rubric을 프롬프트에 넣는다", () => {
    const cases = [
      ["career", "직업 적합도"],
      ["money", "수입 구조"],
      ["love", "끌림의 방식"],
      ["litigation", "문서/증거 정리"],
      ["relationship", "소통 방식"],
      ["health", "생활 리듬"],
      ["life_direction", "삶의 방향"],
    ];

    cases.forEach(([domain, marker]) => {
      const built = sajuPrompt.buildSajuAIPromptWithDomain({
        question: `${marker} 중심으로 내 명식을 상담해줘`,
        sajuResult: buildBaseSajuResult(),
        domain,
      });

      expect(built.categoryRubric.domain).toBe(domain);
      expect(built.prompt).toContain("[카테고리별 상담 품질 기준]");
      expect(built.prompt).toContain(marker);
    });
  });

  test("money 도메인으로 프롬프트를 생성한다", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "내 재물운과 수익 구조를 자세히 알려줘",
      sajuResult: buildBaseSajuResult(),
      domain: "money",
    });

    expect(built.domain).toBe("money");
    expect(built.domainLabel).toBe("재물/수익");
    expect(built.keywordWeights).toBeDefined();
    expect(built.keywordWeights["현금흐름"]).toBeDefined();
  });

  test("litigation 도메인으로 프롬프트를 생성한다", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "송사 상황에서 조심해야 할 말과 행동을 알려줘",
      sajuResult: buildBaseSajuResult(),
      domain: "litigation",
    });

    expect(built.domain).toBe("litigation");
    expect(built.domainLabel).toBe("법률/분쟁");
  });

  test("domain 미지정 시 질문으로 자동 분류한다", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "연애운과 결혼 가능성을 보고 싶어",
      sajuResult: buildBaseSajuResult(),
    });

    expect(built.domain).toBe("love");
  });

  test("기존 buildSajuAIPrompt도 domain 기반 반환을 유지한다", () => {
    const built = sajuPrompt.buildSajuAIPrompt({
      question: "직업과 이직 타이밍을 알려줘",
      sajuResult: buildBaseSajuResult(),
    });

    expect(built.domain).toBeDefined();
    expect(built.questionType).toBe("career");
  });

  test("지원하지 않는 domain이면 UNKNOWN_SAJU_DOMAIN 예외를 던진다", () => {
    expect(() => sajuPrompt.buildSajuAIPromptWithDomain({
      question: "이것은 길이가 충분한 테스트 질문입니다",
      sajuResult: buildBaseSajuResult(),
      domain: "unknown_domain",
    })).toThrow("UNKNOWN_SAJU_DOMAIN");
  });
});
