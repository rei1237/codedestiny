/**
 * @jest-environment node
 */

import { buildZiweiGeminiPrompt, ensureZiweiChapterMarkdownLength } from "../../worker/lib/ziwei-pdf-pipeline.js";

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
  test("짧은 텍스트는 강제 패딩 없이 원문을 유지한다", () => {
    const source = "## Ch.1\n\n짧은 본문";
    const output = ensureZiweiChapterMarkdownLength(source, makeContext(), 8500, 12500);
    expect(output).toContain("짧은 본문");
    expect(output.length).toBeLessThan(8500);
  });

  test("긴 텍스트는 12500자 이하로 잘린다", () => {
    const longBody = "긴문장 ".repeat(1200);
    const source = `## Ch.2\n\n${longBody}`;
    const output = ensureZiweiChapterMarkdownLength(source, makeContext(), 8500, 12500);
    expect(output.length).toBeLessThanOrEqual(12500);
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

});
