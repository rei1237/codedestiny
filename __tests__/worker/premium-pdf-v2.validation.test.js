describe("Premium PDF v2 helpers", () => {
  let getPremiumPdfV2ChapterPlan;
  let validateChapterData;
  let removeRepeatedParagraphs;
  let validateGeneratedChapterText;

  beforeAll(async () => {
    ({ getPremiumPdfV2ChapterPlan } = await import("../../worker/lib/pdf-v2/chapter-plans.js"));
    ({
      validateChapterData,
      removeRepeatedParagraphs,
      validateGeneratedChapterText,
    } = await import("../../worker/lib/pdf-v2/validation.js"));
  });

  test("기존 챕터명/순서/글자수(min/target)를 lifeBook에서 유지한다", () => {
    const plan = getPremiumPdfV2ChapterPlan("lifeBook", "solo");

    expect(Array.isArray(plan)).toBe(true);
    expect(plan.length).toBe(13);
    expect(plan[0].title).toContain("핵심 정체성");
    expect(plan[0].order).toBe(1);
    expect(plan[0].minChars).toBe(6000);
    expect(plan[0].maxChars).toBe(6600);
    expect(Array.isArray(plan[0].requiredFields)).toBe(true);
    expect(plan[0].requiredFields.length).toBeGreaterThan(0);
  });

  test("validateChapterData는 requiredFields 누락 시 실패를 반환한다", () => {
    const chapter = {
      chapterId: "ch-1",
      requiredFields: ["chart.mingGong", "palaces[].mainStars[].name"],
    };

    const fail = validateChapterData({}, chapter);
    expect(fail.ok).toBe(false);
    expect(fail.missingFields).toContain("chart.mingGong");

    const pass = validateChapterData({
      chart: { mingGong: "자" },
      palaces: [{ mainStars: [{ name: "자미" }] }],
    }, chapter);
    expect(pass.ok).toBe(true);
  });

  test("removeRepeatedParagraphs는 동일 문단을 하나로 정리한다", () => {
    const content = [
      "첫 문단입니다.",
      "",
      "두 번째 문단입니다.",
      "",
      "첫 문단입니다.",
    ].join("\n");

    const cleaned = removeRepeatedParagraphs(content);
    expect(cleaned).toContain("첫 문단입니다.");
    expect(cleaned).toContain("두 번째 문단입니다.");
    expect(cleaned.split("첫 문단입니다.").length - 1).toBe(1);
  });

  test("validateGeneratedChapterText는 금지 문구를 차단한다", () => {
    const result = validateGeneratedChapterText("데이터가 없어 기본 해석만 제공합니다", {
      minChars: 10,
      maxChars: 200,
      normalizedData: { chart: { lagna: "Aries" } },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("BANNED_PHRASE_FOUND");
  });
});
