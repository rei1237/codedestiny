/**
 * @jest-environment node
 */

let validateZiweiChapterResult;
let hasZiweiBannedSummaryExpression;
let ZIWEI_CHAPTER_SPECS;
let parseZiweiGeminiResponse;

beforeAll(async () => {
  const premium = await import("../../worker/routes/premium.js");
  const pipeline = await import("../../worker/lib/ziwei-pdf-pipeline.js");
  validateZiweiChapterResult = premium.__ziweiTestUtils.validateZiweiChapterResult;
  hasZiweiBannedSummaryExpression = premium.__ziweiTestUtils.hasZiweiBannedSummaryExpression;
  ZIWEI_CHAPTER_SPECS = pipeline.ZIWEI_CHAPTER_SPECS;
  parseZiweiGeminiResponse = pipeline.parseZiweiGeminiResponse;
});

function makeValidChapter(spec) {
  const longBody = "자미두수 명반 근거를 중심으로 실제 상담 문체로 세부 구조를 해석합니다. ".repeat(44);
  return {
    chapterNo: Number(spec.chapterNo || 1),
    title: spec.title,
    intro: "명반 핵심 축을 기반으로 이번 장의 해석 범위를 명확히 제시합니다.",
    sections: (Array.isArray(spec.sections) ? spec.sections : []).map((heading) => ({
      heading,
      body: longBody,
    })),
    coreAdvice: "명궁과 관련 궁위를 함께 점검하며 실행 우선순위를 고정하세요.",
    actionGuide: [
      "핵심 패턴 1가지를 기록한다.",
      "이번 주 행동 기준 1가지를 고정한다.",
      "일주일 후 결과를 재점검한다.",
    ],
    closing: "이번 장의 구조를 다음 장과 연결해 실전 전략으로 확장하세요.",
  };
}

describe("Ziwei chapter strict validation", () => {
  test("정상 챕터 JSON은 검증을 통과한다", () => {
    const spec = ZIWEI_CHAPTER_SPECS[0];
    const chapter = makeValidChapter(spec);
    const result = validateZiweiChapterResult(chapter, spec);

    expect(result.totalChars).toBeGreaterThanOrEqual(result.minChars);
    expect(result.missing).not.toContain("forbiddenPhrases");
    expect(result.totalChars).toBeGreaterThanOrEqual(result.minChars);
  });

  test("금지 문구가 포함되면 실패한다", () => {
    const spec = ZIWEI_CHAPTER_SPECS[0];
    const chapter = makeValidChapter(spec);
    chapter.sections[0].body += " 자동 복구 생성 문구가 들어가면 안 됩니다.";

    const result = validateZiweiChapterResult(chapter, spec);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("forbiddenPhrases");
  });

  test("섹션 본문이 짧으면 실패한다", () => {
    const spec = ZIWEI_CHAPTER_SPECS[0];
    const chapter = makeValidChapter(spec);
    chapter.sections[0].body = "너무 짧음";

    const result = validateZiweiChapterResult(chapter, spec);
    expect(result.ok).toBe(false);
    expect(result.missing.some((row) => String(row).includes("sections[0].body"))).toBe(true);
  });

  test("깨진 JSON 응답은 parse 단계에서 실패한다", () => {
    const broken = "```json\n{\"title\":\"broken\"\n```";
    const parsed = parseZiweiGeminiResponse(broken);
    expect(parsed.ok).toBe(false);
  });

  test("자미 금지 표현 탐지가 동작한다", () => {
    expect(hasZiweiBannedSummaryExpression("오늘 실행할 행동 1가지를 정하고 결과를 기록"))
      .toBe(true);
  });
});
