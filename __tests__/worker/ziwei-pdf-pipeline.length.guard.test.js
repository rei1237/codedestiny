/**
 * @jest-environment node
 */

import { ensureZiweiChapterMarkdownLength } from "../../worker/lib/ziwei-pdf-pipeline.js";

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
});
