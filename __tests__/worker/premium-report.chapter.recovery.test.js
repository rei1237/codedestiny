/**
 * @jest-environment node
 */

let handlePremiumReportRoutes;
let signJwt;
let createPremiumAccessToken;

const env = {
  JWT_ACCESS_SECRET: "dev-secret",
  PREMIUM_ACCESS_TOKEN_SECRET: "dev-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
  PREMIUM_PDF_API_PAUSE: "true",
};

const userId = "507f1f77bcf86cd799439011";

beforeAll(async () => {
  const premiumMod = await import("../../worker/routes/premium.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  const accessTokenMod = await import("../../worker/lib/premium-access-token.js");
  handlePremiumReportRoutes = premiumMod.handlePremiumReportRoutes;
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
  ].join("\n");
}

async function makeAuthHeaders(reportType) {
  const authToken = await signJwt({
    userId,
    email: "premium-report-recovery@example.com",
    role: "user",
  }, env.JWT_ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: "30m",
  });

  const premiumAccessToken = await createPremiumAccessToken(env, {
    userId,
    reportType,
    featureKey: "test-premium-access",
    chargedCoins: 590,
  });

  return {
    "content-type": "application/json",
    authorization: `Bearer ${authToken}`,
    "x-premium-access-token": premiumAccessToken,
  };
}

describe("premium-report chapter recovery", () => {
  test("prepare -> chapter 흐름에서 422 없이 응답하고 fallback 메타를 제공한다", async () => {
    const headers = await makeAuthHeaders("lifeBook");

    const prepareReq = new Request("https://example.com/api/premium-report/prepare", {
      method: "POST",
      headers,
      body: JSON.stringify({
        reportType: "lifeBook",
        featureType: "lifebook-premium",
        requestBody: {
          name: "테스트A",
          gender: "F",
          year: 1992,
          month: 6,
          day: 15,
          hour: 12,
          minute: 30,
          sajuData: makeSajuData(),
        },
      }),
    });

    const prepareRes = await handlePremiumReportRoutes(prepareReq, env);
    const prepareData = await prepareRes.json();

    expect(prepareRes.status).toBe(200);
    expect(prepareData.ok).toBe(true);
    expect(typeof prepareData.reportSessionId).toBe("string");
    expect(prepareData.reportSessionId.length).toBeGreaterThan(8);

    const chapterReq = new Request("https://example.com/api/premium-report/chapter", {
      method: "POST",
      headers,
      body: JSON.stringify({
        reportSessionId: prepareData.reportSessionId,
        chapterId: 1,
      }),
    });

    const chapterRes = await handlePremiumReportRoutes(chapterReq, env);
    const chapterData = await chapterRes.json();

    expect(chapterRes.status).toBe(200);
    expect(chapterData.ok).toBe(true);
    expect(typeof chapterData.text).toBe("string");
    expect(chapterData.text.length).toBeGreaterThan(200);
    expect(Object.prototype.hasOwnProperty.call(chapterData, "usedFallback")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(chapterData, "fallbackReason")).toBe(true);
  });
});
