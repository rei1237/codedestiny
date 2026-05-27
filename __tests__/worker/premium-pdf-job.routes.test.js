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

const userId = "507f1f77bcf86cd799439012";

beforeAll(async () => {
  await jest.unstable_mockModule("../../worker/lib/access-control.js", () => ({
    requirePremiumReportAccess: jest.fn(async () => ({ ok: true })),
  }));
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
    "이름: 테스트B",
    "성별: 남성",
    "생년월일: 1991년 7월 20일",
    "출생 시각: 11시 40분",
    "",
    "【사주 원국(四柱)】",
    "년주(年柱): 辛未",
    "월주(月柱): 乙未",
    "일주(日柱): 丙子",
    "시주(時柱): 壬辰",
    "",
    "【오행(五行) 분포】",
    "목(木):20.0 화(火):30.0 토(土):20.0 금(金):20.0 수(水):10.0",
    "용신(用神): wood",
    "기신(忌神): water",
  ].join("\n");
}

function makeLifeBookPayload() {
  return {
    reportType: "lifeBook",
    featureType: "lifebook-premium",
    requestBody: {
      name: "테스트B",
      gender: "M",
      year: 1991,
      month: 7,
      day: 20,
      hour: 11,
      minute: 40,
      sajuData: makeSajuData(),
    },
  };
}

async function makeAuthHeaders(reportType, email = "premium-job-routes@example.com") {
  const authToken = await signJwt({
    userId,
    email,
    role: "user",
  }, env.JWT_ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: "30m",
  });

  const premiumAccessToken = await createPremiumAccessToken(env, {
    userId,
    reportType,
    featureKey: "test-premium-job-routes",
    chargedCoins: 590,
  });

  return {
    "content-type": "application/json",
    authorization: `Bearer ${authToken}`,
    "x-premium-access-token": premiumAccessToken,
  };
}

describe("premium pdf job routes", () => {
  test("job/start는 PremiumPdfJob + PremiumPdfSession을 반환한다", async () => {
    const headers = await makeAuthHeaders("lifeBook");
    const req = new Request("https://example.com/api/premium-report/job/start", {
      method: "POST",
      headers,
      body: JSON.stringify(makeLifeBookPayload()),
    });

    const res = await handlePremiumReportRoutes(req, env);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(typeof data?.premiumPdfJob?.jobId).toBe("string");
    expect(data.premiumPdfJob.jobId.startsWith("ppj_")).toBe(true);
    expect(typeof data?.premiumPdfSession?.reportSessionId).toBe("string");
    expect(typeof data?.polling?.statusEndpoint).toBe("string");
    expect(data.polling.statusEndpoint).toContain("/api/premium-report/job/status?jobId=");
  });

  test("동일 입력 재요청은 같은 reportSessionId/jobId를 재사용한다", async () => {
    const headers = await makeAuthHeaders("lifeBook");
    const body = makeLifeBookPayload();

    const first = await handlePremiumReportRoutes(new Request("https://example.com/api/premium-report/job/start", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }), env);

    const second = await handlePremiumReportRoutes(new Request("https://example.com/api/premium-report/job/start", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }), env);

    const a = await first.json();
    const b = await second.json();

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(a.premiumPdfSession.reportSessionId).toBe(b.premiumPdfSession.reportSessionId);
    expect(a.premiumPdfJob.jobId).toBe(b.premiumPdfJob.jobId);
  });

  test("idempotencyKey를 전달하면 공통 포맷으로 정규화되어 반영된다", async () => {
    const headers = await makeAuthHeaders("lifeBook");
    const req = new Request("https://example.com/api/premium-report/job/start", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...makeLifeBookPayload(),
        idempotencyKey: "client-custom-idem-key-1",
      }),
    });

    const res = await handlePremiumReportRoutes(req, env);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    const key = String(data?.premiumPdfJob?.idempotencyKey || "").trim();
    const parts = key.split(":");
    expect(parts.length).toBe(4);
    expect(parts[0]).toBe(userId);
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
    expect(parts[3].length).toBeGreaterThan(0);
  });

  test("job/status는 jobId 기준으로 상태와 진행도를 반환한다", async () => {
    const headers = await makeAuthHeaders("lifeBook");
    const startRes = await handlePremiumReportRoutes(new Request("https://example.com/api/premium-report/job/start", {
      method: "POST",
      headers,
      body: JSON.stringify(makeLifeBookPayload()),
    }), env);
    const startData = await startRes.json();

    const statusRes = await handlePremiumReportRoutes(new Request(
      `https://example.com/api/premium-report/job/status?jobId=${encodeURIComponent(startData.premiumPdfJob.jobId)}`,
      { method: "GET", headers },
    ), env);
    const statusData = await statusRes.json();

    expect(statusRes.status).toBe(200);
    expect(statusData.ok).toBe(true);
    expect(statusData.premiumPdfJob.jobId).toBe(startData.premiumPdfJob.jobId);
    expect(typeof statusData.premiumPdfJob.progress.requiredChapters).toBe("number");
  });

  test("job/status는 reportSessionId로도 조회 가능하다", async () => {
    const headers = await makeAuthHeaders("lifeBook");
    const startRes = await handlePremiumReportRoutes(new Request("https://example.com/api/premium-report/job/start", {
      method: "POST",
      headers,
      body: JSON.stringify(makeLifeBookPayload()),
    }), env);
    const startData = await startRes.json();

    const statusRes = await handlePremiumReportRoutes(new Request(
      `https://example.com/api/premium-report/job/status?reportSessionId=${encodeURIComponent(startData.premiumPdfSession.reportSessionId)}`,
      { method: "GET", headers },
    ), env);
    const statusData = await statusRes.json();

    expect(statusRes.status).toBe(200);
    expect(statusData.ok).toBe(true);
    expect(statusData.premiumPdfSession.reportSessionId).toBe(startData.premiumPdfSession.reportSessionId);
  });

  test("job/status는 다른 사용자 토큰으로 접근 시 401을 반환한다", async () => {
    const ownerHeaders = await makeAuthHeaders("lifeBook", "owner@example.com");
    const startRes = await handlePremiumReportRoutes(new Request("https://example.com/api/premium-report/job/start", {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify(makeLifeBookPayload()),
    }), env);
    const startData = await startRes.json();

    const otherToken = await signJwt({
      userId: "507f1f77bcf86cd799439099",
      email: "other@example.com",
      role: "user",
    }, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresIn: "30m",
    });

    const deniedRes = await handlePremiumReportRoutes(new Request(
      `https://example.com/api/premium-report/job/status?jobId=${encodeURIComponent(startData.premiumPdfJob.jobId)}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${otherToken}`,
        },
      },
    ), env);

    expect(deniedRes.status).toBe(401);
  });

  test("job/run은 jobId를 받아 run 결과와 상태 엔벨로프를 함께 반환한다", async () => {
    const headers = await makeAuthHeaders("lifeBook");
    const startRes = await handlePremiumReportRoutes(new Request("https://example.com/api/premium-report/job/start", {
      method: "POST",
      headers,
      body: JSON.stringify(makeLifeBookPayload()),
    }), env);
    const startData = await startRes.json();

    const runRes = await handlePremiumReportRoutes(new Request("https://example.com/api/premium-report/job/run", {
      method: "POST",
      headers,
      body: JSON.stringify({
        jobId: startData.premiumPdfJob.jobId,
        startChapter: 1,
        endChapter: 1,
        stopOnFailure: false,
      }),
    }), env);
    const runData = await runRes.json();

    expect([200, 207]).toContain(runRes.status);
    expect(runData.ok).toBe(true);
    expect(runData.premiumPdfJob.jobId).toBe(startData.premiumPdfJob.jobId);
    expect(runData.run).toBeDefined();
    expect(typeof runData.premiumPdfJob.progress.validChapters).toBe("number");
  });

  test("job/status는 jobId/reportSessionId 모두 없으면 400을 반환한다", async () => {
    const headers = await makeAuthHeaders("lifeBook");
    const res = await handlePremiumReportRoutes(new Request("https://example.com/api/premium-report/job/status", {
      method: "GET",
      headers,
    }), env);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.code).toBe("PREMIUM_PDF_JOB_REQUIRED");
  });
});
