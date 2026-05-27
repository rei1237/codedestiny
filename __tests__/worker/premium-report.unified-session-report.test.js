/**
 * @jest-environment node
 */

let utils;

beforeAll(async () => {
  const premium = await import("../../worker/routes/premium.js");
  utils = premium.__premiumReportTestUtils;
});

describe("premium unified report/session builders", () => {
  test("report는 chapter/category/body/meta를 구조화해 생성한다", () => {
    const report = utils.buildUnifiedPremiumReportDoc({
      reportId: "rep_test_001",
      sessionId: "sess_test_001",
      reportType: "ziweiPremium",
      featureKey: "premium_pdf_ziwei",
      status: "generating",
      chapterRows: [
        {
          chapter: 1,
          title: "명궁 심층 해석",
          subtitle: "핵심 별 구조",
          text: [
            "## Ch.1",
            "### 명궁 핵심",
            "명궁의 주성 조합은 추진력이 강합니다.",
            "### 관계 패턴",
            "부부궁 연결에서 관계 거리 조절이 중요합니다.",
          ].join("\n"),
          updatedAt: "2026-05-28T00:00:00.000Z",
        },
      ],
      analysisJson: { core: { ming: "자미" } },
    });

    expect(report.reportId).toBe("rep_test_001");
    expect(report.service).toBe("ziwei-premium");
    expect(report.status).toBe("generating");
    expect(Array.isArray(report.chapters)).toBe(true);
    expect(report.chapters.length).toBe(1);
    expect(report.chapters[0].categories.length).toBeGreaterThan(0);
    expect(String(report.chapters[0].categories[0].body || "").length).toBeGreaterThan(0);
    expect(report.meta.totalChapters).toBe(1);
    expect(report.meta.totalCategories).toBe(report.chapters[0].categories.length);
  });

  test("session은 pdfUrl 없이도 snapshot chapters를 복구 가능하게 생성한다", () => {
    const report = utils.buildUnifiedPremiumReportDoc({
      reportId: "rep_test_002",
      sessionId: "sess_test_002",
      reportType: "sookyoPremium",
      featureKey: "premium_pdf_sukuyo",
      status: "completed",
      chapterRows: [
        {
          chapter: 1,
          title: "숙요 원형",
          text: "### 원형\n본명숙 패턴을 설명합니다.",
        },
      ],
      analysisJson: { natal: { user: "각" } },
    });

    const session = utils.buildUnifiedPremiumSessionRecord({ report });

    expect(session.sessionId).toBe("sess_test_002");
    expect(session.completedReportId).toBe("rep_test_002");
    expect(session.reportSnapshot).toBeTruthy();
    expect(Array.isArray(session.reportSnapshot.chapters)).toBe(true);
    expect(session.reportSnapshot.chapters.length).toBe(1);
    expect(session.reportSnapshot.chapters[0].categories[0].body.length).toBeGreaterThan(0);
    expect(session.reportSnapshot.pdfUrl).toBeUndefined();
  });

  test("LLM 입력은 core 엔진 기반 프롬프트 규칙을 포함한다", () => {
    const input = utils.buildLlmPromptInput(
      "lifeBook",
      1,
      {
        input: {
          mode: "personal",
          profile: { name: "테스트" },
        },
        calculatedData: {
          pillars: { day: "丙子" },
        },
        chapterData: {
          ch1: {
            chapterTitle: "원국 진단",
            requiredPaths: ["calculatedData.pillars"],
          },
        },
      },
      {
        core: {},
        signals: {},
        timing: {},
        actions: {},
      },
      { previousChapterSummaries: [] },
    );

    expect(input.doNotCalculate).toBe(true);
    expect(typeof input.premiumPrompt?.prompt).toBe("string");
    expect(input.premiumPrompt.prompt.includes("availableEngineData")).toBe(true);
    expect(Array.isArray(input.rules)).toBe(true);
    expect(input.rules.some((row) => String(row).includes("coreEngineInput"))).toBe(true);
  });
});
