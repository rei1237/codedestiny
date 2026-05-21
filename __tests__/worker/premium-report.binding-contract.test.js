/**
 * @jest-environment node
 */

let __premiumReportTestUtils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  __premiumReportTestUtils = mod.__premiumReportTestUtils;
});

describe("Premium report session binding and chapter contract", () => {
  test("session binding: 동일 출생 프로필이면 통과", () => {
    const { buildPremiumSessionBinding, validatePremiumSessionBinding } = __premiumReportTestUtils;

    const requestBody = {
      year: 1992,
      month: 6,
      day: 15,
      hour: 12,
      minute: 30,
      gender: "F",
      reportMode: "personal",
    };

    const context = {
      reportType: "westernAstrologyPremium",
      modeKey: "personal",
      sessionBinding: buildPremiumSessionBinding("westernAstrologyPremium", "personal", requestBody),
    };

    const check = validatePremiumSessionBinding(context, { requestBody });
    expect(check.ok).toBe(true);
  });

  test("session binding: 출생 프로필이 달라지면 mismatch", () => {
    const { buildPremiumSessionBinding, validatePremiumSessionBinding } = __premiumReportTestUtils;

    const baseBody = {
      year: 1992,
      month: 6,
      day: 15,
      hour: 12,
      minute: 30,
      gender: "F",
      reportMode: "personal",
    };

    const context = {
      reportType: "westernAstrologyPremium",
      modeKey: "personal",
      sessionBinding: buildPremiumSessionBinding("westernAstrologyPremium", "personal", baseBody),
    };

    const check = validatePremiumSessionBinding(context, {
      requestBody: {
        ...baseBody,
        day: 16,
      },
    });

    expect(check.ok).toBe(false);
    expect(check.code).toBe("PREMIUM_REPORT_SESSION_BINDING_MISMATCH");
    expect(check.expectedBindingId).toBeTruthy();
    expect(check.incomingBindingId).toBeTruthy();
  });

  test("chapter contract: western astrology heading 누락이면 실패", () => {
    const { buildPremiumChapterContract, validatePremiumChapterResponseEnvelope } = __premiumReportTestUtils;

    const contract = buildPremiumChapterContract("westernAstrologyPremium", "astrology_premium", "personal", 1);
    const fullText = contract.requiredHeadings.join("\n") + "\n추가 본문";
    const okResult = validatePremiumChapterResponseEnvelope({
      reportType: "westernAstrologyPremium",
      chapterId: 1,
      data: { text: fullText },
      chapterContract: contract,
      previousChapterTexts: [],
    });

    expect(okResult.ok).toBe(true);

    const brokenHeadings = Array.isArray(contract.requiredHeadings)
      ? contract.requiredHeadings.slice(0, Math.max(contract.requiredHeadings.length - 1, 1))
      : [];
    const failResult = validatePremiumChapterResponseEnvelope({
      reportType: "westernAstrologyPremium",
      chapterId: 1,
      data: { text: brokenHeadings.join("\n") },
      chapterContract: contract,
      previousChapterTexts: [],
    });

    expect(failResult.ok).toBe(false);
    expect(Array.isArray(failResult.details?.missingHeadings)).toBe(true);
    expect(failResult.details.missingHeadings.length).toBeGreaterThan(0);
  });

  test("chapter contract: ziwei 필수 JSON 필드 누락이면 실패", () => {
    const { buildPremiumChapterContract, validatePremiumChapterResponseEnvelope } = __premiumReportTestUtils;

    const contract = buildPremiumChapterContract("ziweiPremium", "jamidusu_premium", "personal", 1);
    const headingText = (contract.requiredHeadings || []).join("\n");

    const result = validatePremiumChapterResponseEnvelope({
      reportType: "ziweiPremium",
      chapterId: 1,
      data: {
        text: headingText,
        chapterJson: {
          chapterTitle: "제목",
          chapterSubtitle: "부제",
          summary: "요약",
          sections: [{ heading: "h1", body: "b1" }],
          practicalAdvice: ["a"],
          cautions: ["c"],
          coreStars: ["자미"],
          corePalaces: ["명궁"],
        },
      },
      chapterContract: contract,
      previousChapterTexts: [],
    });

    expect(result.ok).toBe(false);
    expect(result.details.missingJsonFields).toContain("masterConclusion");
    expect(result.details.missingJsonFields).toContain("sections");
  });
});
