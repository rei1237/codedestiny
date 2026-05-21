/**
 * @jest-environment node
 */

import { buildZiweiGeminiPrompt, createFallbackChapter, ensureZiweiChapterMarkdownLength } from "../../worker/lib/ziwei-pdf-pipeline.js";

function makeContext() {
  return {
    chartMeta: {
      bodyPalaceKey: "career",
    },
    cycles: {
      annual: {
        stemBranch: "병오(丙午)",
      },
    },
    palaces: Array.from({ length: 12 }, (_, idx) => ({
      key: `p${idx + 1}`,
      name: `테스트궁${idx + 1}`,
      mainStars: [{ name: "자미" }],
    })),
  };
}

describe("ziwei pdf chapter length guard", () => {
  test("짧은 텍스트는 4000자 이상으로 보강된다", () => {
    const source = "## Ch.1\n\n짧은 본문";
    const output = ensureZiweiChapterMarkdownLength(source, makeContext(), 4000, 5000);
    expect(output.length).toBeGreaterThanOrEqual(4000);
    expect(output.length).toBeLessThanOrEqual(5000);
  });

  test("긴 텍스트는 5000자 이하로 잘린다", () => {
    const longBody = "긴문장 ".repeat(1200);
    const source = `## Ch.2\n\n${longBody}`;
    const output = ensureZiweiChapterMarkdownLength(source, makeContext(), 4000, 5000);
    expect(output.length).toBeGreaterThanOrEqual(4000);
    expect(output.length).toBeLessThanOrEqual(5000);
  });

  test("기본/심화 통합 보조 데이터가 있으면 프롬프트에 포함된다", () => {
    const context = {
      ...makeContext(),
      userProfile: { name: "테스터" },
      stars: { mainStars: ["자미"] },
      relationships: {},
      missingSummary: [],
      knowledgeBase: {},
      premiumContext: {
        basicResultSummary: "기본 자미 결과 요약",
        chapterSignals: [{ palaceKey: "ming", coreStars: ["자미"] }],
      },
    };

    const { prompt } = buildZiweiGeminiPrompt({
      chapter: {
        id: "core",
        title: "명궁 핵심 설계도",
        goal: "핵심 성향 해석",
        sections: ["명궁 원형", "실행 전략"],
      },
      context,
      previousChapterSummaries: [],
    });

    expect(prompt).toContain("[기본/심화 통합 보조 데이터]");
    expect(prompt).toContain("basicResultSummary");
    expect(prompt).toContain("chapterSignals");
  });

  test("fallback chapter는 챕터별 타겟/섹션이 분리되어야 한다", () => {
    const context = {
      ...makeContext(),
      chartMeta: {
        ...makeContext().chartMeta,
        mingPalaceKey: "ming",
        bodyPalaceKey: "career",
      },
      palaces: [
        { key: "ming", name: "명궁(命宮)", mainStars: [{ name: "태양" }] },
        { key: "career", name: "관록궁(官祿宮)", mainStars: [{ name: "무곡" }] },
      ],
    };

    const ch1 = createFallbackChapter({ chapterNo: 1, title: "명궁 해석", goal: "명궁 중심" }, context);
    const ch2 = createFallbackChapter({ chapterNo: 2, title: "신궁 해석", goal: "신궁 중심" }, context);

    expect(ch1.sections[0].heading).toContain("명궁");
    expect(ch2.sections[0].heading).toContain("신궁");
    expect(Array.isArray(ch1.corePalaces)).toBe(true);
    expect(Array.isArray(ch2.corePalaces)).toBe(true);
    expect(ch1.corePalaces.join(",")).not.toBe(ch2.corePalaces.join(","));
    expect(String(ch1.summary || "")).not.toBe(String(ch2.summary || ""));
  });
});
