/**
 * @jest-environment node
 */

let generateZiweiChapterFromSections;
let generateZiweiPremium12ChaptersSequential;
let normalizeZiweiPalaceKey;

beforeAll(async () => {
  const section = await import("../../worker/lib/ziwei-premium-section-generator.js");
  const book = await import("../../worker/lib/ziwei-premium-book-structure.js");
  const generator = await import("../../worker/lib/ziwei-premium-12-chapters-generator.js");

  generateZiweiChapterFromSections = section.generateZiweiChapterFromSections;
  normalizeZiweiPalaceKey = book.normalizeZiweiPalaceKey;
  generateZiweiPremium12ChaptersSequential = generator.generateZiweiPremium12ChaptersSequential;
});

function makeGoodLlmText() {
  return [
    "명궁은 자미두수에서 자기기준과 인생 방향을 결정하는 핵심 영역입니다.",
    "명궁의 주성 자미(묘/◎)는 중심축을 세우는 성향을 만들고, 좌보는 실행 보완 신호를 더합니다.",
    "문창과 화성 같은 보조/잡/살성 신호는 관계와 판단 속도에서 장점과 위험을 동시에 보여줍니다.",
    "밝기와 강도는 묘/왕/득/평/함의 차이로 드러나며 같은 사건도 체감 강도를 다르게 만듭니다.",
    "사화에서는 화록과 화권의 방향성이 성과 전개를 밀어주고, 화기는 과열 구간의 경보 역할을 합니다.",
    "실제 반복 패턴은 빠른 결정 후 보정 루틴을 넣을 때 성과가 누적되고, 과속하면 소모가 커지는 구조입니다.",
    "특히 관록궁의 천상 배치는 직업에서 역할 경계를 분명히 할수록 성과가 안정화되는 흐름을 만들고, 재백궁의 무곡 배치는 수익 구조를 단순하게 정리할 때 누수를 줄이는 방향으로 작동합니다.",
    "부부궁의 태음과 경양 조합은 감정 친밀감과 방어 반응이 동시에 나타날 수 있음을 의미하므로, 관계에서는 기대치를 문장으로 명확히 공유하는 방식이 충돌을 크게 줄여 줍니다.",
    "신궁의 천부 흐름은 후천 실행력의 축이기 때문에 계획 단계에서 충분히 검토해도 실행 시점에는 속도를 확보해야 하며, 너무 오래 망설이면 명궁의 강점이 오히려 부담으로 전환될 수 있습니다.",
    "대운 전환 구간에서는 화록·화권이 집중되는 영역부터 순차적으로 실행해야 결과 편차를 줄일 수 있고, 화기 신호가 보이는 구간에서는 과도한 확장보다 유지·복구 전략을 앞세워야 실손을 방지할 수 있습니다.",
    "따라서 이번 구간에서는 주간 점검표를 고정해 선택 기준을 유지하고, 관계·재정·건강 신호를 분리 점검해야 합니다. 또한 직업-돈-연애를 분리된 사건이 아니라 같은 성향 구조의 다른 표현으로 보고, 한 영역에서 검증된 행동 규칙을 다른 영역으로 확장해 재현성을 확보하는 것이 실전적으로 가장 유효합니다.",
    "관록궁과 재백궁, 부부궁, 신궁의 연동을 함께 보면서 현실 조언을 단계적으로 실행하는 것이 유효하며, 최소 한 주 단위의 검증 기록을 남겨야 명반 해석이 실제 성과로 이어지는지 객관적으로 판단할 수 있습니다.",
    "실무적으로는 하루 단위의 선택 로그를 남겨 명궁의 기준이 실제로 유지되는지 점검하고, 주말에는 관록궁·재백궁 지표를 함께 보며 성과 대비 소모를 계산해야 합니다. 이렇게 하면 체감 운세와 실제 결과 사이의 오차를 줄이고, 다음 주 행동 전략을 더 정확히 설계할 수 있습니다.",
    "관계 측면에서는 부부궁의 민감 신호가 올라오는 시점에 대화 빈도를 높이기보다 갈등 규칙을 먼저 합의하는 편이 효과적입니다. 감정이 과열된 상태에서는 해석이 왜곡되기 쉬우므로, 명반 근거를 활용한 사전 약속이 장기 안정성에 큰 차이를 만듭니다.",
    "재정에서는 무곡의 강점이 보이는 구간에 확장을 시도하더라도, 최소 두 개 이상의 현금흐름 채널을 유지해 충격을 분산하는 전략이 안전합니다. 단일 수익원 의존도가 높아지면 화기성 리스크가 확대될 수 있어, 방어적 포지션을 병행해야 변동기에도 흐름을 지킬 수 있습니다.",
    "건강과 회복은 질액궁 신호를 선제적으로 반영하는 것이 중요하며, 일시적 무리보다 회복 리듬 붕괴가 장기 성과에 더 큰 손실을 만든다는 점을 기억해야 합니다. 수면·집중·운동 루틴을 분리 관리하면 신궁 실행력의 효율이 올라가고, 장기 프로젝트의 완성 확률도 유의미하게 상승합니다.",
  ].join(" ");
}

function makeLowQualityText() {
  return [
    "이 항목은 현재 확보된 명반 핵심값을 기준으로 작성합니다.",
    "실행 포인트: 강점 구간은 작은 실행을 빠르게 누적하고 변동 구간은 기준 루틴을 먼저 고정하세요.",
    "잠시 후 다시 시도해 주세요.",
  ].join(" ");
}

function makeMinimalPayload(overrides = {}) {
  return {
    service: "ziwei-premium",
    mode: "personal",
    user: {
      name: "테스터",
      gender: "F",
      birthDate: "1992-06-15",
      birthTime: "12:30",
      calendarType: "solar",
    },
    chart: {
      lifePalace: "life",
      bodyPalace: "body",
      palaces: [
        {
          key: "life",
          name: "명궁",
          isMing: true,
          mainStars: [{ name: "자미", brightness: "묘", strengthSymbol: "◎" }],
          assistantStars: [{ name: "좌보", brightness: "득", strengthSymbol: "O" }],
          minorStars: [{ name: "문창", brightness: "평", strengthSymbol: "△" }],
          maleficStars: [{ name: "화성", brightness: "함", strengthSymbol: "X" }],
          transformations: [{ starName: "자미", type: "화록", palaceName: "명궁" }],
          brightnessSummary: "자미(묘/◎), 좌보(득/O), 문창(평/△), 화성(함/X)",
        },
        {
          key: "body",
          name: "신궁",
          isShen: true,
          mainStars: [{ name: "천부", brightness: "왕", strengthSymbol: "◎" }],
          assistantStars: [],
          minorStars: [],
          maleficStars: [],
          brightnessSummary: "천부(왕/◎)",
        },
        {
          key: "spouse",
          name: "부부궁",
          mainStars: [{ name: "태음", brightness: "평", strengthSymbol: "△" }],
          assistantStars: [],
          minorStars: [],
          maleficStars: [{ name: "경양", brightness: "함", strengthSymbol: "X" }],
          brightnessSummary: "태음(평/△), 경양(함/X)",
        },
        {
          key: "wealth",
          name: "재백궁",
          mainStars: [{ name: "무곡", brightness: "왕", strengthSymbol: "◎" }],
          assistantStars: [{ name: "우필", brightness: "득", strengthSymbol: "O" }],
          minorStars: [],
          maleficStars: [],
          brightnessSummary: "무곡(왕/◎), 우필(득/O)",
        },
        {
          key: "career",
          name: "관록궁",
          mainStars: [{ name: "천상", brightness: "득", strengthSymbol: "O" }],
          assistantStars: [],
          minorStars: [{ name: "문곡", brightness: "평", strengthSymbol: "△" }],
          maleficStars: [],
          brightnessSummary: "천상(득/O), 문곡(평/△)",
        },
        {
          key: "fortune",
          name: "복덕궁",
          mainStars: [{ name: "천량", brightness: "득", strengthSymbol: "O" }],
          assistantStars: [],
          minorStars: [],
          maleficStars: [],
          brightnessSummary: "천량(득/O)",
        },
      ],
      fourTransformations: {
        hualu: { starName: "자미", type: "화록", palaceName: "명궁" },
        huaquan: { starName: "무곡", type: "화권", palaceName: "재백궁" },
        huake: { starName: "천상", type: "화과", palaceName: "관록궁" },
        huaji: { starName: "화성", type: "화기", palaceName: "부부궁" },
      },
      strongestPalaces: ["life", "career"],
      weakestPalaces: ["spouse"],
    },
    meta: {
      generatedAt: new Date().toISOString(),
      source: "local-ziwei-engine",
    },
    ...overrides,
  };
}

function makeChapterInput({ chapterNo = 1, sections, minimalPayload }) {
  return {
    requestId: `req-${chapterNo}`,
    reportId: `rep-${chapterNo}`,
    chapter: {
      chapterId: `ch${String(chapterNo).padStart(2, "0")}`,
      chapterNo,
      title: `Chapter ${chapterNo}`,
      targetPalace: "명궁",
    },
    sections,
    userProfile: {
      name: "테스터",
      gender: "F",
      birthDate: "1992-06-15",
      birthTime: "12:30",
      calendarType: "solar",
    },
    starNames: ["자미", "좌보", "무곡", "천상", "태음"],
    minimalPayload,
    reportPayload: {
      chartMeta: { mingGong: "life", shenGong: "body" },
      palaces: minimalPayload.chart.palaces,
      diagnostics: { source: "local-ziwei-engine" },
    },
  };
}

function captureFlowStages() {
  const stages = [];
  const push = (args) => {
    const first = String(args?.[0] || "");
    const fromPrefix = first.match(/\[ZiweiPremium\]\[Flow\]\s+([A-Z0-9_]+)/);
    if (fromPrefix?.[1]) {
      stages.push(fromPrefix[1]);
      return;
    }
    const second = args?.[1];
    if (second && typeof second === "object" && typeof second.stage === "string") {
      stages.push(second.stage);
    }
  };

  const infoSpy = jest.spyOn(console, "info").mockImplementation((...args) => push(args));
  const warnSpy = jest.spyOn(console, "warn").mockImplementation((...args) => push(args));
  const errorSpy = jest.spyOn(console, "error").mockImplementation((...args) => push(args));

  return {
    stages,
    restore: () => {
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}

describe("Ziwei premium LLM flow coverage", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("테스트 1: 정상 데이터에서 resolve 성공 후 LLM 시작, CHAPTER_DATA_FAILED 없음", async () => {
    const flow = captureFlowStages();
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: makeGoodLlmText() }] } }],
      }),
    });

    const minimalPayload = makeMinimalPayload();
    const result = await generateZiweiChapterFromSections(
      {
        PREMIUM_ZIWEI_REQUIRE_LLM: "true",
        PREMIUM_ZIWEI_SECTION_MAX_ATTEMPTS: "1",
        GEMINI_USE_SDK: "false",
        GEMINIF_API_KEY1: "test-key",
        GEMINI_MODEL: "gemini-1.5-flash",
      },
      makeChapterInput({
        chapterNo: 1,
        sections: [{ sectionId: "c01-01", title: "명궁 주성 구조", minChars: 300 }],
        minimalPayload,
      }),
    );

    flow.restore();

    expect(result.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalled();
    expect(flow.stages).toEqual(expect.arrayContaining([
      "ENGINE_CALC_SUCCESS",
      "MINIMAL_PAYLOAD_READY",
      "CANONICAL_CHAPTERS_READY",
      "CATEGORY_DATA_RESOLVE_SUCCESS",
      "CATEGORY_SEED_READY",
      "LLM_SECTION_CALL_START",
    ]));
    expect(flow.stages).not.toContain("CHAPTER_DATA_FAILED");
  });

  test("테스트 2: palace key alias 정규화", () => {
    expect(normalizeZiweiPalaceKey("명궁")).toBe("life");
    expect(normalizeZiweiPalaceKey("命宮")).toBe("life");
    expect(normalizeZiweiPalaceKey("life")).toBe("life");
    expect(normalizeZiweiPalaceKey("ming")).toBe("life");

    expect(normalizeZiweiPalaceKey("부부궁")).toBe("spouse");
    expect(normalizeZiweiPalaceKey("夫妻宮")).toBe("spouse");
    expect(normalizeZiweiPalaceKey("spouse")).toBe("spouse");

    expect(normalizeZiweiPalaceKey("재백궁")).toBe("wealth");
    expect(normalizeZiweiPalaceKey("財帛宮")).toBe("wealth");
    expect(normalizeZiweiPalaceKey("wealth")).toBe("wealth");

    expect(normalizeZiweiPalaceKey("관록궁")).toBe("career");
    expect(normalizeZiweiPalaceKey("官祿宮")).toBe("career");
    expect(normalizeZiweiPalaceKey("career")).toBe("career");
  });

  test("테스트 3: 각 category마다 LLM_SECTION_CALL_START + prompt 핵심 JSON/seed 포함", async () => {
    const flow = captureFlowStages();
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: makeGoodLlmText() }] } }],
      }),
    });

    const minimalPayload = makeMinimalPayload();
    const sections = [
      { sectionId: "c01-01", title: "명궁 주성 구조", minChars: 300 },
      { sectionId: "c04-01", title: "재백궁 주성 구조", minChars: 300 },
      { sectionId: "c05-01", title: "부부궁 주성 구조", minChars: 300 },
    ];

    const result = await generateZiweiChapterFromSections(
      {
        PREMIUM_ZIWEI_REQUIRE_LLM: "true",
        PREMIUM_ZIWEI_SECTION_MAX_ATTEMPTS: "1",
        GEMINI_USE_SDK: "false",
        GEMINIF_API_KEY1: "test-key",
        GEMINI_MODEL: "gemini-1.5-flash",
      },
      makeChapterInput({ chapterNo: 1, sections, minimalPayload }),
    );

    flow.restore();

    expect(result.ok).toBe(true);
    const callStartCount = flow.stages.filter((s) => s === "LLM_SECTION_CALL_START").length;
    expect(callStartCount).toBe(sections.length);

    const fetchBodies = fetchSpy.mock.calls.map((call) => {
      const options = call[1] || {};
      const raw = JSON.parse(String(options.body || "{}"));
      return String(raw?.contents?.[0]?.parts?.[0]?.text || "");
    });

    fetchBodies.forEach((promptText) => {
      expect(promptText).toContain("[핵심 분석 JSON]");
      expect(promptText).toContain("[카테고리 해석 데이터 JSON]");
      expect(promptText).toContain("[로컬 시드]");
      expect(promptText).toContain("\"palaces\"");
      expect(promptText).toMatch(/명궁|부부궁|재백궁/);
      expect(promptText).toMatch(/자미|태음|무곡/);
    });
  }, 20000);

  test("테스트 4: 저품질 응답은 차단되어 expert-local-fallback으로 대체", async () => {
    const flow = captureFlowStages();
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: makeLowQualityText() }] } }],
      }),
    });

    const minimalPayload = makeMinimalPayload();
    const result = await generateZiweiChapterFromSections(
      {
        PREMIUM_ZIWEI_REQUIRE_LLM: "true",
        PREMIUM_ZIWEI_SECTION_MAX_ATTEMPTS: "1",
        GEMINI_USE_SDK: "false",
        GEMINIF_API_KEY1: "test-key",
        GEMINI_MODEL: "gemini-1.5-flash",
      },
      makeChapterInput({
        chapterNo: 1,
        sections: [{ sectionId: "c01-01", title: "명궁 주성 구조", minChars: 300 }],
        minimalPayload,
      }),
    );

    flow.restore();

    expect(result.ok).toBe(true);
    expect(result.generatedSections[0].source).toBe("expert-local-fallback");
    expect(flow.stages).toContain("LLM_SECTION_LOW_QUALITY");

    const body = String(result.generatedSections[0].content || "");
    expect(body).not.toContain("현재 확보된 명반 핵심값");
    expect(body).not.toContain("자동 복구 생성");
    expect(body).not.toContain("잠시 후 다시 시도해 주세요");
  });

  test("테스트 5: 일부 별 데이터 누락(assistant/minor/brightness)에도 섹션 생성 성공", async () => {
    const minimalPayload = makeMinimalPayload({
      chart: {
        ...makeMinimalPayload().chart,
        palaces: [
          {
            key: "life",
            name: "명궁",
            isMing: true,
            mainStars: [{ name: "자미" }],
            assistantStars: [],
            minorStars: [],
            maleficStars: [],
            transformations: [],
            brightnessSummary: "",
          },
        ],
      },
    });

    const result = await generateZiweiChapterFromSections(
      { PREMIUM_ZIWEI_REQUIRE_LLM: "false" },
      makeChapterInput({
        chapterNo: 1,
        sections: [{ sectionId: "c01-01", title: "명궁 주성 구조", minChars: 300 }],
        minimalPayload,
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.generatedSections.length).toBe(1);
    expect(String(result.generatedSections[0].content || "").trim().length).toBeGreaterThan(0);
    expect(["llm", "expert-local-fallback"]).toContain(result.generatedSections[0].source);
  });

  test("테스트 6: Ch.12는 사화 기반 생성, 일부 누락이어도 전체 실패 금지", async () => {
    const minimalPayload = makeMinimalPayload({
      chart: {
        ...makeMinimalPayload().chart,
        fourTransformations: {
          hualu: { starName: "자미", type: "화록", palaceName: "명궁" },
          huake: { starName: "천상", type: "화과", palaceName: "관록궁" },
        },
      },
    });

    const result = await generateZiweiChapterFromSections(
      { PREMIUM_ZIWEI_REQUIRE_LLM: "false" },
      makeChapterInput({
        chapterNo: 12,
        sections: [{ sectionId: "c12-01", title: "12궁 전체 핵심 요약", minChars: 300 }],
        minimalPayload,
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.failedCount).toBe(0);
    const body = String(result.generatedSections[0].content || "");
    expect(body).toMatch(/화록|화과|사화/);
  });

  test("테스트 7: 12챕터 최종 검증(본문 존재, 금지문구 0, PDF_RENDER_SUCCESS)", async () => {
    const flow = captureFlowStages();

    const reportPayload = {
      chartMeta: { mingGong: "life", shenGong: "body" },
      diagnostics: { source: "local-ziwei-engine" },
      palaces: [
        { key: "life", nameKo: "명궁", mainStars: [{ name: "자미", brightness: "묘", symbol: "◎" }] },
        { key: "body", nameKo: "신궁", mainStars: [{ name: "천부", brightness: "왕", symbol: "◎" }] },
        { key: "siblings", nameKo: "형제궁", mainStars: [{ name: "무곡", brightness: "득", symbol: "O" }] },
        { key: "spouse", nameKo: "부부궁", mainStars: [{ name: "태음", brightness: "평", symbol: "△" }] },
        { key: "children", nameKo: "자녀궁", mainStars: [{ name: "천동", brightness: "평", symbol: "△" }] },
        { key: "wealth", nameKo: "재백궁", mainStars: [{ name: "무곡", brightness: "왕", symbol: "◎" }] },
        { key: "health", nameKo: "질액궁", mainStars: [{ name: "천량", brightness: "함", symbol: "X" }] },
        { key: "migration", nameKo: "천이궁", mainStars: [{ name: "천마", brightness: "리", symbol: "▲" }] },
        { key: "friends", nameKo: "교우궁", mainStars: [{ name: "천부", brightness: "평", symbol: "△" }] },
        { key: "career", nameKo: "관록궁", mainStars: [{ name: "자미", brightness: "묘", symbol: "◎" }] },
        { key: "property", nameKo: "전택궁", mainStars: [{ name: "천상", brightness: "득", symbol: "O" }] },
        { key: "fortune", nameKo: "복덕궁", mainStars: [{ name: "천기", brightness: "평", symbol: "△" }] },
      ],
      chart: {
        fourTransformations: {
          hualu: { starName: "자미", type: "화록", palaceName: "명궁" },
          huaquan: { starName: "무곡", type: "화권", palaceName: "재백궁" },
        },
      },
    };

    const result = await generateZiweiPremium12ChaptersSequential(
      { PREMIUM_ZIWEI_REQUIRE_LLM: "false" },
      {
        requestId: "req-final",
        reportId: "rep-final",
        userProfile: { name: "테스터", gender: "F", birthDate: "1992-06-15", birthTime: "12:30" },
        targetPalaceData: { name: "명궁" },
        starNames: ["자미", "무곡", "태음"],
        canonicalZiweiChart: { version: "test" },
        reportPayload,
        ownerUserId: "u-test",
      },
    );

    flow.restore();

    expect(result.ok).toBe(true);
    expect(result.chapters).toHaveLength(12);

    const allSections = result.chapters.flatMap((chapter) => chapter.sections || []);
    expect(allSections.length).toBeGreaterThan(0);
    allSections.forEach((section) => {
      expect(String(section?.content || "").trim().length).toBeGreaterThan(0);
    });

    const finalText = allSections.map((section) => String(section.content || "")).join("\n");
    const banned = [
      "현재 확보된 명반 핵심값",
      "이 항목은 현재 확보된",
      "실행 포인트: 강점 구간은",
      "변동 구간은 기준 루틴",
      "자동 복구 생성",
      "fallback",
      "데이터 미확보",
      "계산 데이터가 부족합니다",
    ];
    banned.forEach((phrase) => {
      expect(finalText.includes(phrase)).toBe(false);
    });

    expect(flow.stages).toContain("PDF_RENDER_SUCCESS");
  });
});
