/**
 * JSON-only chapter bridge regression tests.
 *
 * Verifies that strict JSON chapter responses can be parsed, normalized,
 * and converted back into markdown expected by current PDF rendering path.
 */

describe("Premium JSON-only bridge", () => {
  let utils;

  beforeAll(async () => {
    const mod = await import("../../worker/routes/premium.js");
    utils = mod.__premiumReportTestUtils;
  });

  test("parses fenced JSON chapter text", () => {
    const raw = [
      "```json",
      JSON.stringify({
        chapterId: "newyear_ch_01",
        chapterTitle: "연간 파동 총론",
        metaData: {
          serviceType: "sajuNewYear",
          coreKeyword: "우선순위, 리스크, 실행",
        },
        subChapters: [
          {
            subTitle: "올해의 전체 분위기",
            analysisText: "연초에는 탐색이, 연중에는 수익화가 핵심입니다.",
            strategicGuidance: "이번 주 안에 핵심 과제를 1개로 고정하세요.",
          },
        ],
        engineSummaryJson: {
          coreVibe: "속도보다 구조가 성과를 만든다.",
          actionPriority: {
            immediate: "이번 주 KPI 1개를 정의하고 시작한다.",
            stop: "근거 없는 동시다발 확장을 중단한다.",
            review: "7일 후 달성률과 방해요인을 점검한다.",
          },
        },
      }),
      "```",
    ].join("\n");

    const parsed = utils.tryParsePremiumJsonOnlyChapterText(raw);
    expect(parsed.ok).toBe(true);
    expect(parsed.value.chapterId).toBe("newyear_ch_01");
    expect(parsed.value.subChapters).toHaveLength(1);
  });

  test("renders normalized JSON to markdown for PDF pipeline", async () => {
    const contractMod = await import("../../worker/lib/premium-chapter-json-contract.js");
    const normalized = contractMod.normalizePremiumChapterJsonContract({
      reportType: "sajuNewYear",
      chapterId: "newyear_ch_01",
      chapterTitle: "연간 파동 총론",
      requiredHeadings: ["### 1) 올해의 전체 분위기", "### 2) 핵심 운영 전략"],
      chapterJson: {
        chapterId: "newyear_ch_01",
        chapterTitle: "연간 파동 총론",
        metaData: {
          serviceType: "sajuNewYear",
          coreKeyword: "우선순위, 리스크, 실행",
        },
        subChapters: [
          {
            subTitle: "올해의 전체 분위기",
            analysisText: "상반기는 탐색, 하반기는 수익화가 핵심입니다.",
            strategicGuidance: "리소스를 한 축에 집중해 초기 지표를 만드세요.",
          },
          {
            subTitle: "핵심 운영 전략",
            analysisText: "의사결정은 감정이 아닌 기록 데이터 기반으로 진행해야 합니다.",
            strategicGuidance: "주간 리포트를 고정하고 stop-list를 운영하세요.",
          },
        ],
        engineSummaryJson: {
          coreVibe: "구조화된 반복이 누적 성과를 만든다.",
          actionPriority: {
            immediate: "핵심 KPI 1개를 고정한다.",
            stop: "무계획 확장을 멈춘다.",
            review: "7일 후 진행률을 검토한다.",
          },
        },
      },
    });

    const validated = contractMod.validateNormalizedPremiumChapterJson(normalized);
    expect(validated.ok).toBe(true);

    const markdown = utils.renderNormalizedPremiumChapterJsonToMarkdown(normalized);
    expect(markdown).toContain("## 연간 파동 총론");
    expect(markdown).toContain("### 올해의 전체 분위기");
    expect(markdown).toContain("실행 가이드:");
    expect(markdown).toContain("### 핵심 요약");
  });
});
