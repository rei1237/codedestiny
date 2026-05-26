/**
 * @jest-environment node
 *
 * 자미두수 프리미엄 12챕터 구조 및 기호 정규화 테스트
 * 
 * 테스트 범위:
 * 1. 12챕터 구조 정의 검증
 * 2. 강도 기호 정규화
 * 3. 챕터-궁 매핑 검증
 * 
 * 실행 예시:
 * npx jest __tests__/worker/ziwei-premium-12-chapters.test.js --testEnvironment node
 */

let ZIWEI_PREMIUM_12_CHAPTERS;
let normalizeZiweiStrengthSymbol;
let validateZiweiPremium12ChapterStructure;
let getZiweiPremium12ChapterCount;
let getZiweiPremiumChapterByNo;
let getZiweiPremiumSectionsByChapterNo;

beforeAll(async () => {
  const mod = await import("../../worker/lib/ziwei-premium-book-structure.js");
  ZIWEI_PREMIUM_12_CHAPTERS = mod.ZIWEI_PREMIUM_12_CHAPTERS;
  normalizeZiweiStrengthSymbol = mod.normalizeZiweiStrengthSymbol;
  validateZiweiPremium12ChapterStructure = mod.validateZiweiPremium12ChapterStructure;
  getZiweiPremium12ChapterCount = mod.getZiweiPremium12ChapterCount;
  getZiweiPremiumChapterByNo = mod.getZiweiPremiumChapterByNo;
  getZiweiPremiumSectionsByChapterNo = mod.getZiweiPremiumSectionsByChapterNo;
});

describe("Ziwei Premium 12 Chapters Structure", () => {
  test("should have exactly 12 chapters", () => {
    expect(ZIWEI_PREMIUM_12_CHAPTERS.length).toBe(12);
  });

  test("each chapter should have exactly 5 sections", () => {
    ZIWEI_PREMIUM_12_CHAPTERS.forEach((chapter, idx) => {
      expect(chapter.sections.length).toBe(5);
      expect(chapter.chapterNo).toBe(idx + 1);
    });
  });

  test("all chapter IDs should be unique", () => {
    const ids = ZIWEI_PREMIUM_12_CHAPTERS.map((ch) => ch.chapterId);
    expect(new Set(ids).size).toBe(12);
  });

  test("all section IDs should be unique globally", () => {
    const allSectionIds = [];
    ZIWEI_PREMIUM_12_CHAPTERS.forEach((chapter) => {
      chapter.sections.forEach((section) => {
        allSectionIds.push(section.sectionId);
      });
    });
    expect(new Set(allSectionIds).size).toBe(60);
  });

  test("chapter titles should be formatted correctly", () => {
    ZIWEI_PREMIUM_12_CHAPTERS.forEach((chapter) => {
      expect(chapter.title).toMatch(/^Ch\.\d+/);
      expect(chapter.subtitle).toBeDefined();
      expect(chapter.subtitle.length > 0).toBe(true);
    });
  });

  test("sections should have minimum character requirements", () => {
    ZIWEI_PREMIUM_12_CHAPTERS.forEach((chapter) => {
      chapter.sections.forEach((section) => {
        expect(section.minChars).toBeGreaterThanOrEqual(1000);
        expect(section.minChars).toBeLessThanOrEqual(1500);
      });
    });
  });

  test("validateZiweiPremium12ChapterStructure should pass", () => {
    expect(() => {
      validateZiweiPremium12ChapterStructure();
    }).not.toThrow();
  });

  test("getZiweiPremium12ChapterCount should return 12", () => {
    expect(getZiweiPremium12ChapterCount()).toBe(12);
  });

  test("getZiweiPremiumChapterByNo should work for valid chapters", () => {
    for (let i = 1; i <= 12; i++) {
      const chapter = getZiweiPremiumChapterByNo(i);
      expect(chapter).toBeDefined();
      expect(chapter.chapterNo).toBe(i);
    }
  });

  test("getZiweiPremiumChapterByNo should return null for invalid chapters", () => {
    expect(getZiweiPremiumChapterByNo(0)).toBeNull();
    expect(getZiweiPremiumChapterByNo(13)).toBeNull();
    expect(getZiweiPremiumChapterByNo(-1)).toBeNull();
  });

  test("getZiweiPremiumSectionsByChapterNo should return 5 sections", () => {
    for (let i = 1; i <= 12; i++) {
      const sections = getZiweiPremiumSectionsByChapterNo(i);
      expect(sections.length).toBe(5);
    }
  });
});

describe("Strength Symbol Normalization", () => {
  test("should normalize 묘 to ◎", () => {
    expect(normalizeZiweiStrengthSymbol("묘")).toBe("◎");
  });

  test("should normalize 왕 to ◎", () => {
    expect(normalizeZiweiStrengthSymbol("왕")).toBe("◎");
  });

  test("should normalize 득 to O", () => {
    expect(normalizeZiweiStrengthSymbol("득")).toBe("O");
  });

  test("should normalize 리 to ▲", () => {
    expect(normalizeZiweiStrengthSymbol("리")).toBe("▲");
  });

  test("should normalize 평 to △", () => {
    expect(normalizeZiweiStrengthSymbol("평")).toBe("△");
  });

  test("should normalize 함 to X", () => {
    expect(normalizeZiweiStrengthSymbol("함")).toBe("X");
  });

  test("should normalize 실 to X", () => {
    expect(normalizeZiweiStrengthSymbol("실")).toBe("X");
  });

  test("should handle empty string", () => {
    const result = normalizeZiweiStrengthSymbol("");
    expect(typeof result).toBe("string");
  });
});

describe("Chapter Target Palace Mapping", () => {
  test("chapter 1 should target 명궁", () => {
    const chapter = getZiweiPremiumChapterByNo(1);
    expect(chapter.targetPalace).toBe("명궁");
  });

  test("chapter 2 should target 신궁", () => {
    const chapter = getZiweiPremiumChapterByNo(2);
    expect(chapter.targetPalace).toBe("신궁");
  });

  test("chapter 3 should target 형제궁", () => {
    const chapter = getZiweiPremiumChapterByNo(3);
    expect(chapter.targetPalace).toBe("형제궁");
  });

  test("all 12 chapters should have target palaces", () => {
    for (let i = 1; i <= 12; i++) {
      const chapter = getZiweiPremiumChapterByNo(i);
      expect(chapter.targetPalace || chapter.targetPalaces).toBeDefined();
    }
  });
});
