/**
 * @jest-environment node
 */

let ZIWEI_CHAPTER_SPECS;
let buildZiweiPdfSkeleton;
let buildLocalZiweiSectionDraft;
let getZiweiStrengthSymbol;
let hasRepetitiveSentences;

beforeAll(async () => {
  const pipeline = await import("../../worker/lib/ziwei-pdf-pipeline.js");
  ZIWEI_CHAPTER_SPECS = pipeline.ZIWEI_CHAPTER_SPECS;
  buildZiweiPdfSkeleton = pipeline.buildZiweiPdfSkeleton;
  buildLocalZiweiSectionDraft = pipeline.buildLocalZiweiSectionDraft;
  getZiweiStrengthSymbol = pipeline.getZiweiStrengthSymbol;
  hasRepetitiveSentences = pipeline.hasRepetitiveSentences;
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
});
