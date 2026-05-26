/**
 * @jest-environment node
 */

let sibylUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/sibyl.js");
  sibylUtils = mod.__sibylReportTestUtils;
});

describe("Sibyl premium report strict validation", () => {
  test("필수 10개 chapterMap이 모두 300자 이상이면 통과", () => {
    const longText = "분석 데이터 ".repeat(60);
    const report = {
      coreMatrix: longText,
      riskAnalysis: longText,
      aptitudeAnalysis: longText,
      tenGodPattern: longText,
      elementBalance: longText,
      yearlyFlow: longText,
      relationship: longText,
      moneyCareer: longText,
      systemWarning: longText,
      finalMessage: longText,
    };

    expect(sibylUtils.validateSibylReport(report)).toBe(true);
  });

  test("필수 chapter 누락 또는 길이 부족이면 실패", () => {
    const longText = "분석 데이터 ".repeat(60);
    const report = {
      coreMatrix: longText,
      riskAnalysis: longText,
      aptitudeAnalysis: longText,
      tenGodPattern: longText,
      elementBalance: longText,
      yearlyFlow: longText,
      relationship: longText,
      moneyCareer: longText,
      systemWarning: "짧음",
      finalMessage: longText,
    };

    expect(() => sibylUtils.validateSibylReport(report)).toThrow(/systemWarning/i);
  });

  test("AI 챕터가 비어 있어도 canonical fallback으로 10챕터를 채움", () => {
    const canonical = {
      input: {
        birthDate: "1992-06-15",
        birthTime: "12:30",
        gender: "F",
        calendarType: "solar",
      },
      saju: {
        dayMaster: "갑",
        dominantElement: "wood",
        tenGodSummary: {
          dominantTenGod: "편재",
        },
      },
      sibyl: {
        dominantTenGod: "편재",
        dominantElement: "wood",
        riskScore: 58,
        aptitudeScore: 640,
      },
      yearlyFlow: [
        { year: 2026, riskScore: 52, opportunityScore: 48 },
        { year: 2027, riskScore: 61, opportunityScore: 39 },
      ],
    };

    const mapped = sibylUtils.mapToSibylChapters([], canonical);
    expect(Object.keys(mapped.chapterMap).length).toBe(10);
    expect(mapped.chapterList.length).toBe(10);

    sibylUtils.validateSibylReport(mapped.chapterMap);
  });
});
