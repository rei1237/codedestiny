/**
 * @jest-environment node
 *
 * 실행 예시:
 * npx jest __tests__/worker/ziwei-premium.strict.test.js --testEnvironment node
 */

let __ziweiTestUtils;
let handleZiweiBookRoutes;

let buildCanonicalZiweiChart;
let validateCanonicalZiweiChartStrict;
let hasZiweiBannedSummaryExpression;
let hasInvalidZiweiSummaryTable;
let detectCrossChapterRepeatedSentences;
let hasRequiredZiweiSpecificCoverage;

const PALACES = [
  "명궁",
  "형제궁",
  "부처궁",
  "자녀궁",
  "재백궁",
  "질액궁",
  "천이궁",
  "교우궁",
  "관록궁",
  "전택궁",
  "복덕궁",
  "부모궁",
];

const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

function makeStructuredPayload() {
  return {
    yearGan: "갑자",
    meng: "자",
    shen: "오",
    juInfo: "화6국",
    sihuaData: {
      자미: { type: "화록", palaceName: "명궁" },
      무곡: { type: "화권", palaceName: "관록궁" },
    },
    palaceStarData: PALACES.map((palace, idx) => ({
      palace,
      branch: BRANCHES[idx],
      dahan: `${idx * 10}-${idx * 10 + 9}`,
      stars: [{ name: idx % 2 === 0 ? "자미" : "무곡", strength: idx % 2 === 0 ? "묘" : "왕", symbol: idx % 2 === 0 ? "◎" : "○" }],
      auxStars: [{ name: "문창", strength: "리", symbol: "▲" }],
      badStars: [{ name: "경양", strength: "함", symbol: "X" }],
    })),
    annualLuck: { year: 2026, palace: "명궁" },
    monthlyLuck: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, palace: PALACES[i] })),
  };
}

function makeInput() {
  return {
    name: "테스터",
    gender: "F",
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    timezone: "Asia/Seoul",
  };
}

function makeBody() {
  return {
    name: "테스터",
    gender: "F",
    targetYear: 2026,
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    timezone: "Asia/Seoul",
    annualLuck: { year: 2026, palace: "명궁" },
    monthlyLuck: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, palace: PALACES[i] })),
  };
}

function makeQuality() {
  return {
    missingFields: [],
    supplementedFields: [],
    warnings: [],
    canonicalSummary: null,
  };
}

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __ziweiTestUtils = mod.__ziweiTestUtils;
  handleZiweiBookRoutes = mod.handleZiweiBookRoutes;

  ({
    buildCanonicalZiweiChart,
    validateCanonicalZiweiChartStrict,
    hasZiweiBannedSummaryExpression,
    hasInvalidZiweiSummaryTable,
    detectCrossChapterRepeatedSentences,
    hasRequiredZiweiSpecificCoverage,
  } = __ziweiTestUtils);
});

describe("Ziwei Premium Strict Tests (A~G)", () => {
  test("A. canonical JSON은 12궁/명궁/신궁을 보존해야 한다", () => {
    const q = makeQuality();
    const chart = buildCanonicalZiweiChart(makeBody(), makeInput(), makeStructuredPayload(), "personal", "", q);
    const result = validateCanonicalZiweiChartStrict(chart, q);

    expect(chart.palaces).toHaveLength(12);
    expect(chart.chartMeta.mingGong).toBe("자");
    expect(chart.chartMeta.shenGong).toBe("오");
    expect(result.isValid).toBe(true);
  });

  test("B. 주성 강약/기호 누락 시 strict validation은 실패해야 한다", () => {
    const payload = makeStructuredPayload();
    payload.palaceStarData[0].stars = [{ name: "자미" }];

    const q = makeQuality();
    const chart = buildCanonicalZiweiChart(makeBody(), makeInput(), payload, "personal", "", q);
    const result = validateCanonicalZiweiChartStrict(chart, q);

    expect(result.isValid).toBe(false);
    expect(result.missingFields.some((f) => f.includes("mainStars[0].brightness"))).toBe(true);
    expect(result.missingFields.some((f) => f.includes("mainStars[0].symbol"))).toBe(true);
  });

  test("C. 요약표에 '-' 결측 셀이 있으면 invalid table로 감지해야 한다", () => {
    const invalidTableText = [
      "### 12궁 전체 요약표",
      "| 궁위 | 지지 | 주성 |",
      "| --- | --- | --- |",
      "| 명궁 | - | 자미(묘,◎) |",
    ].join("\n");

    expect(hasInvalidZiweiSummaryTable(invalidTableText)).toBe(true);
  });

  test("D. 금지된 일반론 보완 문구를 탐지해야 한다", () => {
    const bannedText = "명반 데이터가 부족해 일반론으로 보완합니다.";
    expect(hasZiweiBannedSummaryExpression(bannedText)).toBe(true);
  });

  test("E. 이전 챕터와 동일한 장문 문장을 반복하면 감지해야 한다", () => {
    const repeated = "명궁과 신궁의 삼방사정 흐름을 기준으로 대궁 전개를 분리해 해석해야 실제 행동 전략이 선명해집니다.";
    const previousTexts = [repeated + "\n추가 문장입니다."];
    const candidate = repeated + "\n이번 챕터의 다른 문장입니다.";

    const duplicates = detectCrossChapterRepeatedSentences(candidate, previousTexts, 30);
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0]).toContain("명궁과 신궁");
  });

  test("F. 챕터 텍스트는 자미두수 근거 토큰 커버리지를 만족해야 한다", () => {
    const denseText = "명궁 신궁 삼방사정 사화를 기준으로 각 궁의 주성·보성·살성을 비교하고 대한/유년/유월 타이밍과 ◎ ○ ▲ 기호를 함께 제시합니다.";
    expect(hasRequiredZiweiSpecificCoverage(denseText)).toBe(true);
  });

  test("G. canonical 필수값 누락이면 /api/ziwei-book/session은 422를 반환해야 한다", async () => {
    const req = new Request("https://example.com/api/ziwei-book/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: 1,
        chapter: 1,
        name: "테스터",
        gender: "F",
        year: 1992,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
        ziweiStructured: {
          meng: "",
          shen: "",
          palaceStarData: [
            {
              palace: "명궁",
              branch: "",
              stars: [{ name: "자미" }],
              auxStars: [],
              badStars: [],
            },
          ],
        },
      }),
    });

    const res = await handleZiweiBookRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.ok).toBe(false);
    expect(data.code).toBe("ZIWEI_CANONICAL_VALIDATION_FAILED");
    expect(Array.isArray(data.missingFields)).toBe(true);
    expect(data.message).toMatch(/계산 데이터 누락/);
  });
});
