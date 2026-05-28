/**
 * @jest-environment node
 */

let handleSajuNewYearRoutes;
let signJwt;
let createPremiumAccessToken;

const TEST_ENV = {
  PREMIUM_ACCESS_TOKEN_SECRET: "dev-secret",
  JWT_ACCESS_SECRET: "dev-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
};

beforeAll(async () => {
  const mod = await import("../../worker/routes/premium.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  const accessTokenMod = await import("../../worker/lib/premium-access-token.js");
  handleSajuNewYearRoutes = mod.handleSajuNewYearRoutes;
  signJwt = jwtMod.signJwt;
  createPremiumAccessToken = accessTokenMod.createPremiumAccessToken;
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

async function makePremiumHeaders(reportType = "sajuNewYear", chargedCoins = 300, featureKey = "saju_new_year_pdf") {
  const authToken = await makeAuthToken();
  const premiumAccessToken = await createPremiumAccessToken(TEST_ENV, {
    userId: "507f1f77bcf86cd799439011",
    reportType,
    featureKey,
    chargedCoins: Number(chargedCoins || 0),
  });
  return {
    "content-type": "application/json",
    authorization: `Bearer ${authToken}`,
    "x-premium-access-token": premiumAccessToken,
  };
}

function makeStrictNewYearPayloadExtras() {
  const monthlyLuck = Array.from({ length: 12 }, (_, idx) => ({
    month: idx + 1,
    source: "engine",
    trend: idx % 2 === 0 ? "추진" : "점검",
    keyword: `키워드-${idx + 1}`,
    go: `실행-${idx + 1}`,
    stop: `주의-${idx + 1}`,
    career: `커리어-${idx + 1}`,
    wealth: `재물-${idx + 1}`,
    relationship: `관계-${idx + 1}`,
    health: `건강-${idx + 1}`,
    oneLineAdvice: `조언-${idx + 1}`,
  }));

  return {
    yearlySummary: {
      summary: "올해는 기준 중심 운영을 통해 성과를 안정적으로 누적하는 해입니다.",
      career: "핵심 과제를 고정하고 실행 밀도를 높입니다.",
      wealth: "수익 구조와 지출 통제 기준을 함께 관리합니다.",
      relationship: "협업 기준과 거리두기 원칙을 명확히 합니다.",
      health: "집중과 회복 루틴을 병행합니다.",
    },
    actionPlan: {
      first30Days: [
        "핵심 목표를 1~2개로 고정합니다.",
        "주간 점검 루틴을 시작합니다.",
        "리스크 컷오프 기준을 설정합니다.",
      ],
      quarterPlan: "분기마다 목표-성과-리스크를 재평가하고 전략을 조정합니다.",
    },
    engineData: {
      monthlyLuck,
      yearlyFortune: {
        careerTheme: "직무 우선순위 재정렬",
        wealthTheme: "지출 통제 강화",
        relationshipTheme: "협업 기준 명확화",
        healthTheme: "회복 리듬 확보",
      },
    },
  };
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
    ...makeStrictNewYearPayloadExtras(),
    ...overrides,
  };
}

describe("Saju new year chapter json payloads", () => {
  test("targetYear 누락 시 명확한 입력 오류를 반환한다", async () => {
    const headers = await makePremiumHeaders();
    const req = new Request("https://example.com/api/saju-new-year/session", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prepareOnly: true,
        name: "테스트A",
        gender: "F",
        year: 1992,
        month: 6,
        day: 15,
        hour: 12,
        minute: 30,
      }),
    });

    const res = await handleSajuNewYearRoutes(req, TEST_ENV);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.code).toBe("SAJU_YEARLY_BOOK_TARGET_YEAR_REQUIRED");
    expect(data.retryable).toBe(true);
  });

  test("person + targetYear 입력만으로 prepareOnly가 로컬 엔진 기반 canonical을 생성한다", async () => {
    const headers = await makePremiumHeaders();
    const req = new Request("https://example.com/api/saju-new-year/session", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prepareOnly: true,
        reportType: "saju-yearly-book",
        mode: "solo",
        targetYear: 2026,
        person: {
          name: "테스트 남성",
          gender: "male",
          birthDate: "1991-02-20",
          birthTime: "08:30",
          calendarType: "solar",
          isLeapMonth: false,
          timezone: "Asia/Seoul",
        },
      }),
    });

    const res = await handleSajuNewYearRoutes(req, TEST_ENV);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.prepared).toBe(true);
    expect(data.dataQuality.engineSource).toBe("saju-local-engine");
    expect(data.canonicalSajuNewYearReport.reportType).toBe("saju-yearly-book");
    expect(data.canonicalSajuNewYearReport.targetYear).toBe(2026);
    expect(data.canonicalSajuNewYearReport.saju).toBeTruthy();
    expect(data.canonicalSajuNewYearReport.saju.currentMajorLuck).toBeTruthy();
    expect(data.canonicalSajuNewYearReport.saju.yearLuck).toBeTruthy();
    expect(Array.isArray(data.canonicalSajuNewYearReport.monthlyLuck)).toBe(true);
    expect(data.canonicalSajuNewYearReport.monthlyLuck).toHaveLength(12);
    expect(Array.isArray(data.canonicalSajuNewYearReport.saju.monthlyLuck)).toBe(true);
    expect(data.canonicalSajuNewYearReport.saju.monthlyLuck).toHaveLength(12);
  });

  test("prepareOnly builds chapterJson blueprints for all 10 chapters with matching category counts", async () => {
    const headers = await makePremiumHeaders();
    const req = new Request("https://example.com/api/saju-new-year/session", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prepareOnly: true,
        ...makeNewYearPayload(),
      }),
    });

    const res = await handleSajuNewYearRoutes(req, TEST_ENV);
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
      if (chapter === 9) {
        expect(blueprint.categories.length).toBe(12);
      } else {
        expect(blueprint.categories.length).toBe(6);
      }
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

    const ch9Sections = data.chapterPlan[8].chapterSpecificSections || [];
    expect(ch9Sections).toHaveLength(12);
    expect(ch9Sections[0]).toContain("9-1.");
    expect(ch9Sections[11]).toContain("9-12.");
  });

  test("generated chapter response falls back to local text when Gemini output is unavailable", async () => {
    const headers = await makePremiumHeaders();
    const req = new Request("https://example.com/api/saju-new-year/session", {
      method: "POST",
      headers,
      body: JSON.stringify({
        reportId: "saju-new-year-json-check",
        sessionId: 9,
        chapter: 9,
        ...makeNewYearPayload(),
      }),
    });

    const res = await handleSajuNewYearRoutes(req, TEST_ENV);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.source).toBe("local-engine");
    expect(data.chapterJson).toBeTruthy();
    expect(Array.isArray(data.chapterJson.categories)).toBe(true);
    expect(data.chapterJson.categories.length).toBeGreaterThan(0);
    expect(typeof data.chapterJson.categories[0].analysisText).toBe("string");
    expect(data.chapterJson.categories[0].analysisText.length).toBeGreaterThan(0);
  });

  test("featureKey 불일치 시 SAJU_NEW_YEAR_ACCESS_DENIED를 반환한다", async () => {
    const headers = await makePremiumHeaders();
    const req = new Request("https://example.com/api/saju-new-year/session", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prepareOnly: true,
        featureKey: "saju-new-year",
        ...makeNewYearPayload(),
      }),
    });

    const res = await handleSajuNewYearRoutes(req, TEST_ENV);
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.code).toBe("SAJU_NEW_YEAR_ACCESS_DENIED");
    expect(data.expectedFeatureKey).toBe("saju_new_year_pdf");
    expect(data.receivedFeatureKey).toBe("saju-new-year");
  });

  test("accessGrant/sessionId/purchaseId 누락 시 누락 필드 목록을 반환한다", async () => {
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

    const res = await handleSajuNewYearRoutes(req, TEST_ENV);
    const data = await res.json();

    expect(res.status).toBe(402);
    expect(data.code).toBe("SAJU_NEW_YEAR_ACCESS_DENIED");
    expect(Array.isArray(data.missing)).toBe(true);
    expect(data.missing).toEqual(expect.arrayContaining(["sessionId", "purchaseId", "reportId"]));
  });
});