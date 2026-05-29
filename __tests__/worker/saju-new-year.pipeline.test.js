/**
 * @jest-environment node
 */

let route;

beforeAll(async () => {
  route = await import("../../worker/routes/saju-new-year.js");
});

function makePayload(overrides = {}) {
  return {
    name: "홍길동",
    gender: "남성",
    birthDate: "1991-02-20",
    birthTime: "07:30",
    calendarType: "solar",
    selectedYear: 2026,
    profile: {
      name: "홍길동",
      gender: "male",
      birth: {
        year: 1991,
        month: 2,
        day: 20,
        hour: 7,
        minute: 30,
      },
    },
    sajuBase: {
      pillars: {
        year: { gan: "辛", zhi: "未" },
        month: { gan: "庚", zhi: "寅" },
        day: { gan: "甲", zhi: "子" },
        hour: { gan: "乙", zhi: "巳" },
      },
      core: {
        dayMaster: "甲",
      },
      elementBalance: {
        counts: {
          wood: 3,
          fire: 2,
          earth: 2,
          metal: 1,
          water: 2,
        },
      },
    },
    ...overrides,
  };
}

describe("saju new year local-first pipeline", () => {
  test("입력 정규화는 selectedYear와 birthTime을 표준화한다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ birthTime: "오전 7시 15분", selectedYear: 2027 }));
    expect(normalized.ok).toBe(true);
    expect(normalized.targetYear).toBe(2027);
    expect(normalized.birthInput.birthDate).toBe("1991-02-20");
    expect(normalized.birthInput.birthHour).toBe(7);
    expect(normalized.birthInput.birthMinute).toBe(15);
    expect(normalized.birthInput.isTimeUnknown).toBe(false);
  });

  test("로컬 스켈레톤만으로 10챕터 품질 검증을 통과한다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    expect(normalized.ok).toBe(true);

    const seed = utils.buildPdfSeed(normalized.profile, normalized.targetYear, makePayload());
    const local = utils.buildLocalSkeleton(seed);

    expect(local).toHaveLength(10);
    expect(local[0].title.startsWith("제1장")).toBe(true);
    expect(local.some((chapter) => /Chapter\s*\d/i.test(chapter.title))).toBe(false);
    expect(utils.validateChapters(local)).toBe(true);
  });

  test("LLM 병합 시 일부 챕터 실패는 로컬 폴백으로 보존된다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    const seed = utils.buildPdfSeed(normalized.profile, normalized.targetYear, makePayload());
    const local = utils.buildLocalSkeleton(seed);

    const generated = {
      chapters: [
        {
          no: 1,
          title: local[0].title,
          sections: local[0].categories.map((category) => ({
            title: category.title,
            body: category.localSummary + "\n\n실행 우선순위를 월별로 분리하면 안정성이 높아집니다.",
          })),
        },
      ],
    };

    const merged = utils.mergeLlmChaptersWithLocal(local, generated);
    expect(merged.chapters).toHaveLength(10);
    expect(merged.llmMergedCount).toBe(1);
    expect(merged.fallbackUsed).toBe(true);
    expect(merged.chapters[0].source).toBe("llm-enhanced");
    expect(merged.chapters[1].source).toBe("local-fallback");
  });

  test("금지어 문자열은 최종 본문에서 제거된다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const cleaned = utils.stripForbiddenText("payload debug fallback 자동 복구 생성 chapter 1 chapter 1 데이터가 부족합니다");
    expect(cleaned.includes("payload")).toBe(false);
    expect(cleaned.includes("debug")).toBe(false);
    expect(cleaned.includes("fallback")).toBe(false);
    expect(cleaned.includes("자동 복구 생성")).toBe(false);
    expect(cleaned.includes("데이터가 부족합니다")).toBe(false);
  });
});
