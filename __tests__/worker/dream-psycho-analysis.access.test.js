/**
 * @jest-environment node
 *
 * verifyPsychoDreamAccess(실제 구현)를 직접 검증한다.
 * dream-psycho-analysis.route.test.js는 access verifier를 통째로 목킹해 우회하므로,
 * 여기서는 그 verifier의 내부(auth degrade, 회당 결제 토큰 인정)를 실제로 태운다.
 */

let handleDreamRoutes;
let mockGetOptionalUserFromRequest;
let mockCanAccessPaidFeature;
let mockVerifyPremiumAccessToken;

beforeAll(async () => {
  mockGetOptionalUserFromRequest = jest.fn();
  mockCanAccessPaidFeature = jest.fn();
  mockVerifyPremiumAccessToken = jest.fn();

  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({
    callGeminiText: jest.fn(async () => ({ ok: false, error: "mocked" })),
  }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getOptionalUserFromRequest: mockGetOptionalUserFromRequest,
    isAuthDbInfraError: (error) => /mongo|timeout|network/i.test(String(error?.message || "")),
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
    // 라우트가 인증 단계에서 같은 User 문서를 한 번에 읽으려고 이 projection 을 함께 import 한다.
    // 모킹에서 빠지면 라우트 모듈 로드가 SyntaxError 로 죽으므로 실제 모듈 표면과 맞춰 둔다.
    PAID_FEATURE_ACCESS_USER_PROJECTION: {},
    canAccessPaidFeature: mockCanAccessPaidFeature,
  }));
  jest.unstable_mockModule("../../worker/lib/premium-access-token.js", () => ({
    verifyPremiumAccessToken: mockVerifyPremiumAccessToken,
  }));

  const mod = await import("../../worker/routes/dream.js");
  handleDreamRoutes = mod.handleDreamRoutes;
});

beforeEach(() => {
  mockGetOptionalUserFromRequest.mockReset();
  mockCanAccessPaidFeature.mockReset();
  mockVerifyPremiumAccessToken.mockReset();
});

function buildRequest(body) {
  return new Request("https://example.com/api/dream/psycho-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("verifyPsychoDreamAccess (real implementation)", () => {
  test("로그인된 사용자가 인증에 실패하지 않은 경우 게이트를 통과한다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-1" });
    mockCanAccessPaidFeature.mockResolvedValue({ allowed: true, licenseType: "monthly_subscription", accessSource: "monthlySubscription" });

    const res = await handleDreamRoutes(buildRequest({ dreamText: "따뜻한 봄 햇살 아래서 오래된 친구를 만나는 꿈을 꾸었다." }), {});
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
  });

  test("유효 로그인 상태에서 일시적 DB 오류가 나면 401이 아니라 503으로 재시도를 유도한다", async () => {
    mockGetOptionalUserFromRequest.mockRejectedValue(new Error("MongoPoolClearedError: pool was cleared"));

    const res = await handleDreamRoutes(buildRequest({ dreamText: "따뜻한 봄 햇살 아래서 오래된 친구를 만나는 꿈을 꾸었다." }), {});
    const payload = await res.json();

    expect(res.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("AUTH_TEMPORARILY_UNAVAILABLE");
    expect(mockCanAccessPaidFeature).not.toHaveBeenCalled();
  });

  test("실제 미인증(세션 없음)은 401 LOGIN_REQUIRED를 반환한다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue(null);

    const res = await handleDreamRoutes(buildRequest({ dreamText: "따뜻한 봄 햇살 아래서 오래된 친구를 만나는 꿈을 꾸었다." }), {});
    const payload = await res.json();

    expect(res.status).toBe(401);
    expect(payload.code).toBe("LOGIN_REQUIRED");
  });

  test("이용권 미보유자도 회당 결제(월정석 등) 프리미엄 액세스 토큰이 유효하면 통과한다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-1" });
    mockCanAccessPaidFeature.mockResolvedValue({ allowed: false, reason: "PAYMENT_REQUIRED" });
    mockVerifyPremiumAccessToken.mockResolvedValue({
      ok: true,
      payload: { featureKey: "dream-psycho-analysis", userId: "user-1" },
    });

    const res = await handleDreamRoutes(
      buildRequest({
        dreamText: "따뜻한 봄 햇살 아래서 오래된 친구를 만나는 꿈을 꾸었다.",
        premiumAccessToken: "signed-token",
      }),
      {},
    );
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(mockVerifyPremiumAccessToken).toHaveBeenCalledWith(
      "signed-token",
      {},
      expect.objectContaining({ userId: "user-1", reportType: "dreamPsychoAnalysis" }),
    );
  });

  test("프리미엄 액세스 토큰이 다른 기능용이면 결제 요구로 남는다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-1" });
    mockCanAccessPaidFeature.mockResolvedValue({ allowed: false, reason: "PAYMENT_REQUIRED" });
    mockVerifyPremiumAccessToken.mockResolvedValue({
      ok: true,
      payload: { featureKey: "premium-fpti-report", userId: "user-1" },
    });

    const res = await handleDreamRoutes(
      buildRequest({
        dreamText: "따뜻한 봄 햇살 아래서 오래된 친구를 만나는 꿈을 꾸었다.",
        premiumAccessToken: "signed-token-for-other-feature",
      }),
      {},
    );
    const payload = await res.json();

    expect(res.status).toBe(402);
    expect(payload.code).toBe("PAYMENT_REQUIRED");
  });

  test("이용권도 결제 토큰도 없으면 402 결제 요구를 반환한다", async () => {
    mockGetOptionalUserFromRequest.mockResolvedValue({ userId: "user-1" });
    mockCanAccessPaidFeature.mockResolvedValue({ allowed: false, reason: "PAYMENT_REQUIRED" });

    const res = await handleDreamRoutes(buildRequest({ dreamText: "따뜻한 봄 햇살 아래서 오래된 친구를 만나는 꿈을 꾸었다." }), {});
    const payload = await res.json();

    expect(res.status).toBe(402);
    expect(payload.code).toBe("PAYMENT_REQUIRED");
    expect(mockVerifyPremiumAccessToken).not.toHaveBeenCalled();
  });
});
