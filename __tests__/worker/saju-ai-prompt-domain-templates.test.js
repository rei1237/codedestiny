/**
 * @jest-environment node
 */

let sajuPrompt;

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

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

    expect(built.promptVersion).toBe(sajuPrompt.SAJU_AI_PROMPT_VERSION);
    expect(built.factSnapshot.fixedTenGodTable.find((row) => row.stem === "壬")?.tenGod).toBe("상관");
    expect(built.factSnapshot.fixedTenGodTable.find((row) => row.stem === "癸")?.tenGod).toBe("식신");
    expect(built.factCard).toContain("壬(임):상관");
    expect(built.factCard).toContain("癸(계):식신");
    expect(built.prompt).toContain("[명식 사실 카드]");
    // 프롬프트 본문에도 신금-임수 정정을 못 박아 둔다(사실 카드만으로는 LLM 이 자주 되돌린다).
    expect(built.prompt).toContain("신금(辛) 일간에게 임수(壬)는 식신이 아니라 상관");
    expect(built.prompt).toContain("[카테고리별 상담 품질 기준]");
    expect(built.categoryRubric.domain).toBe("life_direction");
    expect(sajuPrompt.validateSajuMyeongsikTenGodText("임수는 상관으로 작동합니다.", built.factSnapshot).ok).toBe(true);
    expect(sajuPrompt.validateSajuMyeongsikTenGodText("임수는 식신으로 작동합니다.", built.factSnapshot).ok).toBe(false);
  });

  test("명시적인 천간·십성 쌍이 나열된 사실 카드는 인접한 다른 쌍과 충돌하지 않는다", () => {
    STEMS.forEach((dayStem) => {
      const base = buildBaseSajuResult();
      base.pillars = { y: { g: "戊", j: "辰" }, m: { g: "甲", j: "寅" }, d: { g: dayStem, j: "卯" }, h: { g: "壬", j: "子" } };
      const built = sajuPrompt.buildSajuAIPromptWithDomain({
        question: "나의 일과 돈, 관계 흐름을 명식 전체로 자세히 알려줘",
        sajuResult: base,
        domain: "life_direction",
      });
      const validation = sajuPrompt.validateSajuMyeongsikTenGodText(built.factCard, built.factSnapshot);
      expect(validation.ok).toBe(true);
    });
  });

  test("직접 연결된 십성 오류만 잡고 나열·일간 기준·교정 문장은 보존한다", () => {
    const factSnapshot = { fixedTenGodTable: [
      { stem: "甲", tenGod: "정재" }, { stem: "乙", tenGod: "편재" },
      { stem: "壬", tenGod: "상관" }, { stem: "癸", tenGod: "식신" }, { stem: "辛", tenGod: "비견" },
    ] };
    for (const text of ["정재(甲)와 편재(乙)", "乙(을목) 편재와 癸(계수) 식신", "편재(偏財) 乙과 식신(食神) 癸", "辛(신금) 일간에게 화는 정관과 편관", "임수는 식신이 아니라 상관입니다."]) {
      expect(sajuPrompt.validateSajuMyeongsikTenGodText(text, factSnapshot).ok).toBe(true);
    }
    for (const text of ["임수는 식신입니다.", "壬(임수) 식신", "식신(壬)", "식신(食神) 壬", "정재(乙)", "임수는 상관입니다. 하지만 壬은 식신입니다."]) {
      expect(sajuPrompt.validateSajuMyeongsikTenGodText(text, factSnapshot).ok).toBe(false);
    }
  });

  test("각 도메인별 상담 품질 rubric을 프롬프트에 넣는다", () => {
    const cases = [
      ["career", "직업 적합도"],
      ["money", "현재 현금흐름 확인"],
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
    expect(built.keywordWeights["현금흐름 기록"]).toBeDefined();
    expect(built.prompt).toContain("명식으로 수익 모델이나 금융상품을 추천하지 않고");
    expect(built.prompt).toContain("비겁으로 동업 손실을 단정하지 않고");
    expect(built.prompt).toContain("대운·세운을 수익 예고가 아닌 재검토 시점의 라벨로만 사용");
    expect(built.prompt).not.toContain("시기별 수익 가속");
    expect(built.prompt).not.toContain("가장 현실적인 수익모델 3가지");
    expect(built.prompt).not.toContain("적합 수익 모델 3~5개 추천");
    expect(built.prompt).not.toContain("비겁 과다 시 재탈/동업 리스크");
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

  test("격국/십이운성이 fact card에 텍스트로 주입된다 (甲일간 寅월 → 건록격)", () => {
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "내 명식의 전체 흐름과 격국을 자세히 알려줘",
      sajuResult: buildBaseSajuResult(),
      domain: "life_direction",
    });

    // 甲 일간 · 월지 寅(본기 甲=비견) → 건록 자리 → 건록격
    const gyeok = built.factSnapshot.majorStructures.gyeokguk;
    expect(gyeok.finalGyeokguk).toBe("건록격");
    expect(gyeok.finalType).toBe("특수격");
    expect(built.factCard).toContain("10. 격국");
    expect(built.factCard).toContain("십이운성");
    // 년지 未는 甲 기준 묘
    expect(built.factCard).toContain("십이운성 묘");
    // 결속값·도메인 라인에 격국이 실림
    expect(built.prompt).toContain("건록격");
  });

  test("월지 정기 관성이 투출되면 정관격/편관격으로 잡는다", () => {
    const base = buildBaseSajuResult();
    // 甲 일간, 월지 酉(본기 辛=정관), 辛을 년간에 투출
    base.pillars = {
      y: { g: "辛", j: "未" },
      m: { g: "乙", j: "酉" },
      d: { g: "甲", j: "辰", gE: "목" },
      h: { g: "戊", j: "辰" },
    };
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "내 명식의 격국과 직업 방향을 알려줘",
      sajuResult: base,
      domain: "career",
    });
    const gyeok = built.factSnapshot.majorStructures.gyeokguk;
    expect(gyeok.finalGyeokguk).toBe("정관격");
    expect(gyeok.finalType).toBe("일반격");
  });

  test("종격이면 jong.name을 그대로 격국으로 존중한다", () => {
    const base = buildBaseSajuResult();
    base.jong = { isJong: true, name: "종재격" };
    const built = sajuPrompt.buildSajuAIPromptWithDomain({
      question: "내 명식이 종격인지와 그 흐름을 알려줘",
      sajuResult: base,
      domain: "life_direction",
    });
    const gyeok = built.factSnapshot.majorStructures.gyeokguk;
    expect(gyeok.finalGyeokguk).toBe("종재격");
    expect(gyeok.finalType).toBe("특수격");
  });

  test("power/jong 없이 buildSajuAdvancedFactors를 호출해도 격국이 안전하게 반환된다", () => {
    const base = buildBaseSajuResult();
    delete base.power;
    delete base.jong;
    const advanced = sajuPrompt.buildSajuAdvancedFactors(base, undefined);
    expect(advanced.gyeokguk).toBeDefined();
    expect(typeof advanced.gyeokguk.finalGyeokguk).toBe("string");
    expect(Array.isArray(advanced.twelveLifeStages)).toBe(true);
    // 용신/기신 정보가 없으면 격국 활성화 시기는 참고용 note로 대체
    expect(advanced.gyeokguk.luckTiming.note).toContain("참고용");
  });
});
