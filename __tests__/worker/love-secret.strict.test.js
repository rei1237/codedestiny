/**
 * @jest-environment node
 */

let payloadPipeline;

beforeAll(async () => {
  payloadPipeline = await import("../../worker/lib/saju-love-pdf-pipeline.js");
});

function makePersonA() {
  return {
    profile: { name: "테스트A", gender: "female" },
    fourPillars: {
      year: { ganji: "壬申", stem: "壬", branch: "申" },
      month: { ganji: "丁巳", stem: "丁", branch: "巳" },
      day: { ganji: "辛酉", stem: "辛", branch: "酉", hiddenStems: ["辛"] },
      hour: { ganji: "甲午", stem: "甲", branch: "午" },
    },
    dayMaster: { stem: "辛", element: "metal", strength: "신강" },
    fiveElements: { wood: 22.2, fire: 11.1, earth: 22.2, metal: 33.3, water: 11.1, dominant: "metal", weakest: "fire" },
    tenGods: {
      distribution: { 비견: 3, 겁재: 1, 식신: 2, 상관: 1, 편재: 1, 정재: 2, 편관: 1, 정관: 2, 편인: 0, 정인: 1 },
      loveRelatedGods: { spouseStar: "관성", expressionStar: "식신", authorityStar: "정관" },
    },
    attractionStars: { dohwa: ["도화살"], hongyeom: ["홍염살"], hwagae: ["화개살"], yeokma: ["역마살"] },
    loveProfile: { spousePalace: { branch: "酉", hiddenStems: ["辛"] } },
    usefulGods: { yongsin: { element: "fire" }, huisin: { element: "wood" }, gisin: { element: "metal" } },
    luck: { currentDaewoon: { ganji: "乙卯" }, nextDaewoon: { ganji: "甲寅" }, annualLuck: { year: 2026 }, monthlyLuck: [] },
    johu: { birthSeason: "summer", monthBranch: "巳" },
  };
}

function makePersonB() {
  return {
    profile: { name: "테스트B", gender: "male" },
    fourPillars: {
      year: { ganji: "辛未", stem: "辛", branch: "未" },
      month: { ganji: "丙寅", stem: "丙", branch: "寅" },
      day: { ganji: "甲寅", stem: "甲", branch: "寅", hiddenStems: ["甲", "丙", "戊"] },
      hour: { ganji: "丁卯", stem: "丁", branch: "卯" },
    },
    dayMaster: { stem: "甲", element: "wood", strength: "신약" },
    fiveElements: { wood: 33.3, fire: 22.2, earth: 11.1, metal: 22.2, water: 11.1, dominant: "wood", weakest: "water" },
    tenGods: { distribution: { 비견: 2, 겁재: 1, 식신: 2, 상관: 1, 편재: 1, 정재: 1, 편관: 2, 정관: 1, 편인: 1, 정인: 1 }, loveRelatedGods: { spouseStar: "재성" } },
    attractionStars: { dohwa: ["도화살"], hwagae: ["화개살"], yeokma: ["역마살"] },
    loveProfile: { spousePalace: { branch: "寅", hiddenStems: ["甲", "丙", "戊"] } },
    usefulGods: { yongsin: { element: "water" }, huisin: { element: "wood" }, gisin: { element: "fire" } },
    luck: { currentDaewoon: { ganji: "甲子" }, nextDaewoon: { ganji: "癸亥" }, annualLuck: { year: 2026 }, monthlyLuck: [] },
    johu: { birthSeason: "spring", monthBranch: "寅" },
  };
}

function makeCompatibility() {
  return {
    enabled: true,
    dayMasterRelation: { personAElement: "metal", personBElement: "wood", relation: "a-controls-b" },
    dayBranchRelation: { personADayBranch: "酉", personBDayBranch: "寅", relationType: "중립" },
    elementBalance: { personA: { metal: 33.3 }, personB: { wood: 33.3 } },
    tenGodCompatibility: { personADominant: ["비견"], personBDominant: ["비견"] },
    stemBranchInteractions: { combinations: ["A일-B일 지지합"], clashes: [], harms: [], punishments: [], breaks: [] },
    attractionScore: 72,
    stabilityScore: 68,
    conflictScore: 38,
    summary: "합 1건 기반 관계 구조",
  };
}

describe("Saju Love PDF Payload Pipeline", () => {
  test("1) 개인 모드 payload는 10개 solo 챕터만 포함해야 한다", () => {
    const payload = payloadPipeline.buildSajuLovePdfPayload({
      mode: "solo",
      user: {
        name: "테스트A",
        gender: "female",
        birthInfo: { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
        calendarType: "solar",
        timezone: "Asia/Seoul",
      },
      userPerson: makePersonA(),
    });

    const valid = payloadPipeline.validateSajuLovePdfPayload(payload);
    const soloChapters = payload.chapters.filter((c) => c.part === "solo");

    expect(valid.ok).toBe(true);
    expect(payload.mode).toBe("solo");
    expect(soloChapters).toHaveLength(10);
    expect(payload.partner).toBeUndefined();
    expect(payload.compatibility).toBeUndefined();
    expect(payload.saju?.pillars?.year).toBeTruthy();
    expect(payload.saju?.dayMaster).toBeTruthy();
    expect(payload.saju?.elements).toBeTruthy();
    expect(payload.saju?.tenGods).toBeTruthy();
  });

  test("2) 궁합 모드 payload는 solo 10 + compatibility 챕터를 포함해야 한다", () => {
    const payload = payloadPipeline.buildSajuLovePdfPayload({
      mode: "compatibility",
      user: {
        name: "테스트A",
        gender: "female",
        birthInfo: { year: 1992, month: 6, day: 15, hour: 12, minute: 30 },
        calendarType: "solar",
        timezone: "Asia/Seoul",
      },
      partner: {
        name: "테스트B",
        gender: "male",
        birthInfo: { year: 1991, month: 2, day: 21, hour: 8, minute: 15 },
      },
      userPerson: makePersonA(),
      partnerPerson: makePersonB(),
      compatibility: makeCompatibility(),
    });

    const valid = payloadPipeline.validateSajuLovePdfPayload(payload);
    const soloChapters = payload.chapters.filter((c) => c.part === "solo");
    const compatChapters = payload.chapters.filter((c) => c.part === "compatibility");

    expect(valid.ok).toBe(true);
    expect(payload.mode).toBe("compatibility");
    expect(soloChapters).toHaveLength(10);
    expect(compatChapters.length).toBeGreaterThan(0);

    for (const chapter of soloChapters) {
      for (const category of chapter.categories) {
        expect(category.sourceData.userSaju).toBeTruthy();
        expect(category.sourceData.partnerSaju).toBeUndefined();
        expect(category.sourceData.compatibility).toBeUndefined();
      }
    }

    for (const chapter of compatChapters) {
      for (const category of chapter.categories) {
        expect(category.sourceData.userSaju).toBeTruthy();
        expect(category.sourceData.partnerSaju).toBeTruthy();
        expect(category.sourceData.compatibility).toBeTruthy();
      }
    }
  });

  test("3) validateSajuLovePdfPayload 실패 케이스를 검출해야 한다", () => {
    const base = payloadPipeline.buildSajuLovePdfPayload({
      mode: "solo",
      user: { name: "테스트A", gender: "female", birthInfo: { year: 1992, month: 6, day: 15 } },
      userPerson: makePersonA(),
    });

    const noMode = { ...base, mode: "" };
    const noPillars = { ...base, saju: { ...base.saju, pillars: null } };
    const noDayMaster = { ...base, saju: { ...base.saju, dayMaster: null } };
    const withPartner = { ...base, partner: { name: "X" } };
    const lessSolo = { ...base, chapters: base.chapters.slice(0, 9) };
    const noSourceData = {
      ...base,
      chapters: base.chapters.map((ch, idx) => idx === 0
        ? { ...ch, categories: ch.categories.map((cat, cidx) => cidx === 0 ? { ...cat, sourceData: {} } : cat) }
        : ch),
    };

    expect(payloadPipeline.validateSajuLovePdfPayload(noMode).ok).toBe(false);
    expect(payloadPipeline.validateSajuLovePdfPayload(noPillars).ok).toBe(false);
    expect(payloadPipeline.validateSajuLovePdfPayload(noDayMaster).ok).toBe(false);
    expect(payloadPipeline.validateSajuLovePdfPayload(withPartner).ok).toBe(false);
    expect(payloadPipeline.validateSajuLovePdfPayload(lessSolo).ok).toBe(false);
    expect(payloadPipeline.validateSajuLovePdfPayload(noSourceData).ok).toBe(false);
  });

  test("4) assertNoSajuLoveFallbackText는 금지 문구를 차단해야 한다", () => {
    expect(() => payloadPipeline.assertNoSajuLoveFallbackText("정상 상담문입니다.")).not.toThrow();
    expect(() => payloadPipeline.assertNoSajuLoveFallbackText("이 섹션은 기본 골격입니다")).toThrow();
    expect(() => payloadPipeline.assertNoSajuLoveFallbackText("자동 복구 생성 완료")).toThrow();
    expect(() => payloadPipeline.assertNoSajuLoveFallbackText("서버 응답이 불안정하여")).toThrow();
    expect(() => payloadPipeline.assertNoSajuLoveFallbackText("Chapter 1 내용")).toThrow();
    expect(() => payloadPipeline.assertNoSajuLoveFallbackText("JSON payload 출력")).toThrow();
  });

  test("5) dry-run payload 생성은 chapter/category sourceData를 보장해야 한다", () => {
    const soloPayload = payloadPipeline.buildSajuLovePdfPayload({
      mode: "solo",
      user: { name: "테스트A", gender: "female", birthInfo: { year: 1992, month: 6, day: 15 } },
      userPerson: makePersonA(),
    });

    const compatPayload = payloadPipeline.buildSajuLovePdfPayload({
      mode: "compatibility",
      user: { name: "테스트A", gender: "female", birthInfo: { year: 1992, month: 6, day: 15 } },
      partner: { name: "테스트B", gender: "male", birthInfo: { year: 1991, month: 2, day: 21 } },
      userPerson: makePersonA(),
      partnerPerson: makePersonB(),
      compatibility: makeCompatibility(),
    });

    expect(payloadPipeline.validateSajuLovePdfPayload(soloPayload).ok).toBe(true);
    expect(payloadPipeline.validateSajuLovePdfPayload(compatPayload).ok).toBe(true);

    expect(soloPayload.chapters.filter((c) => c.part === "solo")).toHaveLength(10);
    expect(compatPayload.chapters.filter((c) => c.part === "solo")).toHaveLength(10);
    expect(compatPayload.chapters.filter((c) => c.part === "compatibility").length).toBeGreaterThan(0);

    for (const chapter of [...soloPayload.chapters, ...compatPayload.chapters]) {
      expect(Array.isArray(chapter.categories)).toBe(true);
      expect(chapter.categories.length).toBeGreaterThan(0);
      for (const category of chapter.categories) {
        expect(category.sourceData).toBeTruthy();
        expect(String(category.writingInstruction || "").length).toBeGreaterThan(5);
        expect(() => payloadPipeline.assertNoSajuLoveFallbackText(JSON.stringify(category))).not.toThrow();
      }
    }
  });
});
