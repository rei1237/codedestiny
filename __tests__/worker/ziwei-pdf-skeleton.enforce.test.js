/**
 * @jest-environment node
 */

let ZIWEI_CHAPTER_SPECS;
let buildZiweiPdfSkeleton;
let buildLocalZiweiSectionDraft;
let getZiweiStrengthSymbol;
let hasRepetitiveSentences;
let assertZiweiPayloadChaptersMatchConfig;
let assertZiweiLlmGenerationComplete;
let validateZiweiLlmSectionResponse;

beforeAll(async () => {
  const pipeline = await import("../../worker/lib/ziwei-pdf-pipeline.js");
  ZIWEI_CHAPTER_SPECS = pipeline.ZIWEI_CHAPTER_SPECS;
  buildZiweiPdfSkeleton = pipeline.buildZiweiPdfSkeleton;
  buildLocalZiweiSectionDraft = pipeline.buildLocalZiweiSectionDraft;
  getZiweiStrengthSymbol = pipeline.getZiweiStrengthSymbol;
  hasRepetitiveSentences = pipeline.hasRepetitiveSentences;
  assertZiweiPayloadChaptersMatchConfig = pipeline.assertZiweiPayloadChaptersMatchConfig;
  assertZiweiLlmGenerationComplete = pipeline.assertZiweiLlmGenerationComplete;
  validateZiweiLlmSectionResponse = pipeline.validateZiweiLlmSectionResponse;
});

describe("Ziwei PDF skeleton enforcement", () => {
  test("기존 챕터 개수/순서를 유지한 skeleton을 생성한다", () => {
    const skeleton = buildZiweiPdfSkeleton({ palaces: [] }, ZIWEI_CHAPTER_SPECS);

    expect(Array.isArray(skeleton)).toBe(true);
    expect(skeleton.length).toBe(ZIWEI_CHAPTER_SPECS.length);
    skeleton.forEach((chapter, idx) => {
      const spec = ZIWEI_CHAPTER_SPECS[idx];
      expect(chapter.order).toBe(spec.chapterNo);
      expect(chapter.title).toBe(spec.title);
      expect(chapter.sections.length).toBe((spec.sections || []).length);
      chapter.sections.forEach((section, sIdx) => {
        expect(section.title).toBe(spec.sections[sIdx]);
      });
    });
  });

  test("명궁·신궁 챕터는 명궁/신궁 바인딩을 포함하고 전택궁 바인딩을 우선하지 않는다", () => {
    const chapter2Spec = ZIWEI_CHAPTER_SPECS.find((row) => Number(row.chapterNo) === 2);
    const skeleton = buildZiweiPdfSkeleton({ palaces: [] }, [chapter2Spec]);
    const section = skeleton[0].sections[0];
    const bindingText = (section.dataBinding || []).join("|");

    expect(bindingText).toContain("mingGong");
    expect(bindingText).toContain("shenGong");
    expect(bindingText).not.toContain("name=property");
  });

  test("재백궁·관록궁 챕터는 재백궁/관록궁 바인딩을 포함한다", () => {
    const chapter6Spec = ZIWEI_CHAPTER_SPECS.find((row) => Number(row.chapterNo) === 6);
    const skeleton = buildZiweiPdfSkeleton({ palaces: [] }, [chapter6Spec]);
    const section = skeleton[0].sections[0];
    const bindingText = (section.dataBinding || []).join("|");

    expect(bindingText).toContain("name=wealth");
    expect(bindingText).toContain("name=career");
  });

  test("강약 심볼은 묘/왕 ◎, 득 O, 리 ▲, 평 △, 함/실 X 규칙을 따른다", () => {
    expect(getZiweiStrengthSymbol("묘")).toBe("◎");
    expect(getZiweiStrengthSymbol("왕")).toBe("◎");
    expect(getZiweiStrengthSymbol("득")).toBe("O");
    expect(getZiweiStrengthSymbol("리")).toBe("▲");
    expect(getZiweiStrengthSymbol("평")).toBe("△");
    expect(getZiweiStrengthSymbol("함")).toBe("X");
    expect(getZiweiStrengthSymbol("실")).toBe("X");
  });

  test("반복 문장 감지 함수는 동일 문장 3회 이상이면 true를 반환한다", () => {
    const text = [
      "명궁 중심 실행 기준을 고정합니다.",
      "명궁 중심 실행 기준을 고정합니다.",
      "명궁 중심 실행 기준을 고정합니다.",
      "다른 문장",
    ].join("\n");
    expect(hasRepetitiveSentences(text)).toBe(true);
  });

  test("로컬 드래프트는 금지 fallback 문구를 포함하지 않는다", () => {
    const draft = buildLocalZiweiSectionDraft(
      {
        chapterNo: 2,
        chapterTitle: "II. 명궁·신궁 분석",
        title: "명궁 주성 분석",
      },
      {
        chartMeta: { mingGong: "자", shenGong: "오" },
        palaces: [
          {
            name: "명궁",
            mainStars: [{ name: "자미", strength: "왕", symbol: "◎" }],
          },
        ],
      },
    );

    expect(draft).not.toContain("자동 복구 생성");
    expect(draft).not.toContain("Chapter 1");
    expect(draft).not.toContain("fallback");
    expect(draft).not.toContain("이 구조를 기준으로");
    expect(draft).not.toContain("실행 단위를 주간 루틴으로 고정");
  });

  test("payload chapters는 config와 id/title/순서가 일치해야 한다", () => {
    const skeleton = buildZiweiPdfSkeleton({ palaces: [] }, ZIWEI_CHAPTER_SPECS);
    expect(() => assertZiweiPayloadChaptersMatchConfig(skeleton, ZIWEI_CHAPTER_SPECS)).not.toThrow();
  });

  test("LLM 섹션 응답 검증은 chapterId/sectionId/body 규칙을 강제한다", () => {
    const req = {
      chapter: { id: "chapter-02" },
      section: { id: "chapter-02-section-01", minChars: 30 },
    };
    const good = {
      chapterId: "chapter-02",
      sectionId: "chapter-02-section-01",
      body: "명궁과 신궁의 상호작용을 현실 실행 기준으로 연결해 해석하고, 실제 선택지와 위험 신호를 구체적으로 정리한 실행 문장입니다. 이번 달 의사결정의 우선순위를 정리하고, 과한 확장보다 안정적 루틴과 검증 가능한 행동 단위를 먼저 고정하라는 실천 지침까지 담았습니다.",
    };
    const bad = {
      chapterId: "chapter-02",
      sectionId: "chapter-02-section-01",
      body: "자동 복구 생성",
    };
    expect(validateZiweiLlmSectionResponse(good, req)).toBe(true);
    expect(validateZiweiLlmSectionResponse(bad, req)).toBe(false);
  });

  test("최종 completed payload는 모든 section source가 llm-enhanced여야 한다", () => {
    const skeleton = buildZiweiPdfSkeleton({ palaces: [] }, [ZIWEI_CHAPTER_SPECS[0]]);
    const chapter = skeleton[0];
    chapter.sections = chapter.sections.map((section, index) => ({
      ...section,
      source: "llm-enhanced",
      minChars: 10,
      finalText: `자미두수 구조와 데이터 바인딩을 기반으로 한 섹션 ${index + 1} 본문으로, 실제 행동 계획과 주의 신호를 포함합니다. 이번 구간에서는 감정 과열을 줄이고 기록 기반 의사결정을 유지하며, 일주일 단위 점검으로 리스크를 조기에 식별하도록 안내합니다. 또한 관계, 재정, 일정의 충돌 가능성을 분리하여 우선순위를 재조정하라는 명확한 실행 체크리스트를 제공합니다.`,
    }));
    expect(() => assertZiweiLlmGenerationComplete({ chapters: [chapter] })).not.toThrow();
  });
});
