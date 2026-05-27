/**
 * @jest-environment node
 */

let buildCanonicalZiweiPdfChapters;
let mapZiweiBrightnessToStrengthSymbol;
let generateZiweiChapterFromSections;

beforeAll(async () => {
  const book = await import("../../worker/lib/ziwei-premium-book-structure.js");
  const section = await import("../../worker/lib/ziwei-premium-section-generator.js");
  buildCanonicalZiweiPdfChapters = book.buildCanonicalZiweiPdfChapters;
  mapZiweiBrightnessToStrengthSymbol = book.mapZiweiBrightnessToStrengthSymbol;
  generateZiweiChapterFromSections = section.generateZiweiChapterFromSections;
});

describe("ziwei premium section generator fallback", () => {
  test("strength symbol map should normalize known brightness labels", () => {
    expect(mapZiweiBrightnessToStrengthSymbol("묘")).toBe("◎");
    expect(mapZiweiBrightnessToStrengthSymbol("왕")).toBe("◎");
    expect(mapZiweiBrightnessToStrengthSymbol("득")).toBe("O");
    expect(mapZiweiBrightnessToStrengthSymbol("리")).toBe("▲");
    expect(mapZiweiBrightnessToStrengthSymbol("평")).toBe("△");
    expect(mapZiweiBrightnessToStrengthSymbol("함")).toBe("X");
    expect(mapZiweiBrightnessToStrengthSymbol("실")).toBe("X");
    expect(mapZiweiBrightnessToStrengthSymbol("알수없음")).toBe("△");
  });

  test("canonical chapter builder should always return 12 chapters with local seeds", () => {
    const chapters = buildCanonicalZiweiPdfChapters({
      service: "ziwei-premium",
      mode: "personal",
      user: { birthDate: "1992-06-15" },
      chart: {
        lifePalace: "명궁",
        palaces: [
          {
            key: "ming",
            name: "명궁",
            mainStars: [{ name: "자미", brightness: "묘", strengthSymbol: "◎" }],
          },
        ],
      },
      meta: { generatedAt: new Date().toISOString(), source: "local-ziwei-engine" },
    });

    expect(Array.isArray(chapters)).toBe(true);
    expect(chapters).toHaveLength(12);
    chapters.forEach((chapter) => {
      expect(Array.isArray(chapter.categories)).toBe(true);
      expect(chapter.categories.length).toBeGreaterThan(0);
      chapter.categories.forEach((category) => {
        expect(String(category.localSeedText || "").trim().length).toBeGreaterThan(20);
      });
    });
  });

  test("LLM failure should not break chapter generation and must use local fallback", async () => {
    const result = await generateZiweiChapterFromSections({}, {
      requestId: "test-req-1",
      reportId: "test-report-1",
      chapter: {
        chapterId: "ch01",
        chapterNo: 1,
        title: "명궁 완전 해독",
        targetPalace: "명궁",
      },
      sections: [
        {
          sectionId: "ch01-sec01",
          title: "명궁 주성 구조",
          minChars: 1200,
        },
      ],
      userProfile: {
        name: "테스터",
        gender: "F",
        birthDate: "1992-06-15",
        birthTime: "12:30",
      },
      targetPalaceData: {
        name: "명궁",
        branch: "자",
        mainStars: [{ name: "자미", strength: "묘", symbol: "◎" }],
      },
      reportPayload: {
        chartMeta: { mingGong: "자", shenGong: "오" },
        palaces: [
          {
            key: "ming",
            nameKo: "명궁",
            branch: "자",
            mainStars: [{ nameKo: "자미", brightness: "묘", symbol: "◎" }],
          },
        ],
      },
      starNames: ["자미"],
    });

    expect(result.ok).toBe(true);
    expect(Array.isArray(result.generatedSections)).toBe(true);
    expect(result.generatedSections).toHaveLength(1);
    expect(result.generatedSections[0].source).toBe("local-fallback");
    expect(String(result.generatedSections[0].content || "")).not.toContain("자동 복구 생성");
  });
});
