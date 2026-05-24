/**
 * @jest-environment node
 */

let __premiumReportTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __premiumReportTestUtils = mod.__premiumReportTestUtils;
});

describe("Premium fallback orchestrator guards", () => {
  test("isLlmRecoverableError: quota/429/timeout을 recoverable로 판단", () => {
    const { isLlmRecoverableError } = __premiumReportTestUtils;

    expect(isLlmRecoverableError("Gemini quota exceeded")).toBe(true);
    expect(isLlmRecoverableError("HTTP 429 rate limit")).toBe(true);
    expect(isLlmRecoverableError("request timeout while generateContent failed")).toBe(true);
    expect(isLlmRecoverableError("syntax error in template parser")).toBe(false);
  });

  test("validateLocalFallbackChapter: 금지 문구/짧은 본문을 차단", () => {
    const { validateLocalFallbackChapter } = __premiumReportTestUtils;

    const invalid = validateLocalFallbackChapter(
      {
        title: "chapter-07",
        text: "## 핵심\n자동 복구 생성\n\n## 요약\nundefined",
      },
      { title: "chapter-07", minChars: 2200 },
      [],
    );

    expect(invalid.ok).toBe(false);
    expect(invalid.reasons).toContain("BLOCKED_PHRASE_DETECTED");
    expect(invalid.reasons).toContain("CONTENT_TOO_SHORT");
  });

  test("dedupeReportParagraphs: 동일 문단과 중복 소제목을 제거", () => {
    const { dedupeReportParagraphs } = __premiumReportTestUtils;
    const duplicateParagraph = "같은 문장을 반복하지 않고 실제 계산 근거를 제시합니다.";

    const result = dedupeReportParagraphs([
      [
        "## 분석",
        duplicateParagraph,
        "## 분석",
        duplicateParagraph,
      ].join("\n\n"),
      [
        "## 실행",
        duplicateParagraph,
        "실행 계획을 월 단위로 분해해 우선순위를 고정합니다.",
      ].join("\n\n"),
    ]);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0].match(/##\s분석/g)?.length || 0).toBe(1);
    expect(result[0].split(duplicateParagraph).length - 1).toBe(1);
    expect(result[1].includes(duplicateParagraph)).toBe(false);
  });

  test("buildDeterministicLocalChapterText: 계약 헤딩을 반영하고 충분한 분량을 생성", () => {
    const { buildDeterministicLocalChapterText } = __premiumReportTestUtils;

    const chapterText = buildDeterministicLocalChapterText({
      reportType: "lifeBook",
      chapterId: 2,
      chapterMeta: {
        title: "Chapter 2. 핵심 기질",
        subtitle: "일간과 월지의 작동 패턴",
      },
      chapterContract: {
        requiredHeadings: [
          "## 1. 이 챕터의 핵심 결론",
          "## 2. 상세 해석",
          "## 3. 실행 전략",
        ],
      },
      input: { name: "테스터", year: 1991, month: 7, day: 15, gender: "female" },
      canonicalJson: {
        calculatedData: {
          dayMaster: "갑목",
          relationType: "상생",
          compatibilityIndex: 82,
          yongsin: "수",
        },
      },
      chapterJsonPacks: {
        chapter: {
          focus: "기질",
          risk: "과속",
          energy: "분산",
        },
      },
      minChars: 2200,
    });

    expect(chapterText).toContain("## 1. 이 챕터의 핵심 결론");
    expect(chapterText).toContain("## 2. 상세 해석");
    expect(chapterText).toContain("## 3. 실행 전략");
    expect(chapterText.length).toBeGreaterThanOrEqual(1800);
  });

  test("buildPremiumAccessDeniedPayload: 결제 실패 응답을 표준 스키마로 반환", () => {
    const { buildPremiumAccessDeniedPayload } = __premiumReportTestUtils;

    const denied = buildPremiumAccessDeniedPayload({
      status: 402,
      code: "PAYMENT_REQUIRED",
      message: "프리미엄 결제가 필요합니다.",
      required: "lifeBook:120",
    }, {
      stage: "prepare-access-check",
      reportType: "lifeBook",
      featureType: "lifebook-premium",
      requestId: "req_test_1",
    });

    expect(denied.status).toBe(402);
    expect(denied.payload.ok).toBe(false);
    expect(denied.payload.schemaVersion).toBe("premium-report-v2");
    expect(denied.payload.stage).toBe("prepare-access-check");
    expect(denied.payload.normalizedCode).toBe("PAYMENT_REQUIRED");
    expect(denied.payload.paymentPolicy).toBe("server-authoritative-access-check");
    expect(denied.payload.refundPolicy).toBe("no-auto-refund-in-report-pipeline");
  });
});
