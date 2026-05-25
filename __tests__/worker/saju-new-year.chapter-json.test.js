/**
 * @jest-environment node
 */

let handleSajuNewYearRoutes;
let signJwt;

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  handleSajuNewYearRoutes = mod.handleSajuNewYearRoutes;
  signJwt = jwtMod.signJwt;
});

function makeSajuData() {
  return [
    "【분석 대상 정보】",
    "이름: 테스트A",
    "성별: 여성",
    "생년월일: 1992년 6월 15일",
    "출생 시각: 12시 30분",
    "",
    "【사주 원국(四柱)】",
    "년주(年柱): 壬申",
    "월주(月柱): 丁巳",
    "일주(日柱): 辛酉",
    "시주(時柱): 甲午",
    "",
    "【오행(五行) 분포】",
    "목(木):22.2 화(火):11.1 토(土):22.2 금(金):33.3 수(水):11.1",
    "용신(用神): fire, wood",
    "기신(忌神): metal",
    "일간(日干): 辛",
    "신강/신약: 신강",
    "",
    "【십성(十星) 분포】",
    "비견: 3",
    "겁재: 1",
    "식신: 2",
    "상관: 1",
    "편재: 1",
    "정재: 2",
    "편관: 1",
    "정관: 2",
    "편인: 0",
    "정인: 1",
    "",
    "【신살(神殺) 계산 결과 — 정확한 로직으로 도출】",
    "보유 신살: 도화살(桃花殺), 홍염살(紅艶殺), 화개살(華蓋殺), 역마살(驛馬殺)",
    "",
    "【대운(大運) 흐름】",
    "23세: 丙辰",
    "33세: 乙卯",
    "43세: 甲寅",
  ].join("\n");
}

async function makeAuthToken() {
  return signJwt({
    userId: "507f1f77bcf86cd799439011",
    email: "premium-prepare@example.com",
    role: "user",
  }, "dev-secret", {
    issuer: "code-destiny-api",
    audience: "code-destiny-web",
    expiresIn: "30m",
  });
}

function makeNewYearPayload(overrides = {}) {
  return {
    targetYear: 2026,
    name: "테스트A",
    gender: "F",
    year: 1992,
    month: 6,
    day: 15,
    hour: 12,
    minute: 30,
    sajuData: makeSajuData(),
    ...overrides,
  };
}

describe("Saju new year chapter json payloads", () => {
  test("prepareOnly builds chapterJson blueprints for all 10 chapters with matching category counts", async () => {
    const authToken = await makeAuthToken();
    const req = new Request("https://example.com/api/saju-new-year/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        prepareOnly: true,
        ...makeNewYearPayload(),
      }),
    });

    const res = await handleSajuNewYearRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.prepared).toBe(true);
    expect(data.totalChapters).toBe(10);
    expect(data.chapterPlan).toHaveLength(10);
    expect(data.chapterJsonBlueprintByNumber).toBeTruthy();

    for (let chapter = 1; chapter <= 10; chapter += 1) {
      const plan = data.chapterPlan[chapter - 1];
      const blueprint = data.chapterJsonBlueprintByNumber[String(chapter)];
      const sections = Array.isArray(plan.chapterSpecificSections) ? plan.chapterSpecificSections : [];

      expect(blueprint).toBeTruthy();
      expect(blueprint.chapterNo).toBe(chapter);
      expect(blueprint.chapterTitle).toBe(plan.title);
      expect(Array.isArray(blueprint.categories)).toBe(true);
      expect(blueprint.categories.length).toBe(sections.length);
      expect(blueprint.categories.length).toBeGreaterThan(0);
      expect(Array.isArray(blueprint.metaData.strongMonths)).toBe(true);
      expect(Array.isArray(blueprint.metaData.cautionMonths)).toBe(true);
      expect(typeof blueprint.engineSummaryJson.coreVibe).toBe("string");
      expect(blueprint.engineSummaryJson.coreVibe.length).toBeGreaterThan(0);

      blueprint.categories.forEach((category) => {
        expect(typeof category.categoryId).toBe("string");
        expect(category.categoryId).toContain(`sub_${chapter}_`);
        expect(typeof category.categoryTitle).toBe("string");
        expect(category.categoryTitle.length).toBeGreaterThan(0);
        expect(typeof category.analysisText).toBe("string");
        expect(category.analysisText.length).toBeGreaterThan(0);
        expect(typeof category.strategicGuidance).toBe("string");
        expect(category.strategicGuidance.length).toBeGreaterThan(0);
      });
    }
  });

  test("generated chapter response includes chapterJson categories aligned to the requested chapter", async () => {
    const authToken = await makeAuthToken();
    const req = new Request("https://example.com/api/saju-new-year/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        reportId: "saju-new-year-json-check",
        sessionId: 9,
        chapter: 9,
        ...makeNewYearPayload(),
      }),
    });

    const res = await handleSajuNewYearRoutes(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.chapter).toBe(9);
    expect(data.reportType).toBe("sajuNewYear");
    expect(data.source).toBe("local-engine");
    expect(data.usedFallback).toBe(true);
    expect(data.chapterJson).toBeTruthy();
    expect(data.chapterJson.chapterNo).toBe(9);
    expect(data.chapterJson.chapterTitle).toBe("12개월 Go/Stop 월별 테이블");
    expect(Array.isArray(data.chapterJson.categories)).toBe(true);
    expect(data.chapterJson.categories.length).toBeGreaterThan(0);
    expect(data.chapterJson.categories.every((row) => typeof row.categoryTitle === "string" && row.categoryTitle.length > 0)).toBe(true);
    expect(data.chapterJson.categories.every((row) => typeof row.analysisText === "string" && row.analysisText.length > 0)).toBe(true);
    expect(data.chapterJson.categories.every((row) => typeof row.strategicGuidance === "string" && row.strategicGuidance.length > 0)).toBe(true);
    expect(typeof data.text).toBe("string");
    expect(data.text).toContain("| 월 | 이번 달 키워드 | Go | Stop | 커리어 | 재물 | 관계 | 건강 | 한 줄 조언 |");
  });
});