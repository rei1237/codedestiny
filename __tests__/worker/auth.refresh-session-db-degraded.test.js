/**
 * @jest-environment node
 */

let getOptionalUserFromRequest;
let requireAuth;
let requireUserFromRequest;
let signJwt;
let signAuthToken;
let REFRESH_COOKIE_NAME;

beforeAll(async () => {
  const authMod = await import("../../worker/lib/auth.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  getOptionalUserFromRequest = authMod.getOptionalUserFromRequest;
  requireAuth = authMod.requireAuth;
  requireUserFromRequest = authMod.requireUserFromRequest;
  signAuthToken = authMod.signAuthToken;
  REFRESH_COOKIE_NAME = authMod.REFRESH_COOKIE_NAME;
  signJwt = jwtMod.signJwt;
});

describe("refresh-session verification tolerates transient DB infra errors on /api/auth/me only", () => {
  const env = {
    JWT_ACCESS_SECRET: "test-access-secret",
    JWT_REFRESH_SECRET: "test-refresh-secret",
    JWT_ISSUER: "code-destiny-api",
    JWT_AUDIENCE: "code-destiny-web",
    // No MONGO_URI configured on purpose: connectDb() throws a "Mongo URI is required"
    // error, which is an isAuthDbInfraError-classified message (contains "mongo").
  };

  async function buildRefreshOnlyRequest(pathname) {
    const refreshToken = await signJwt(
      { userId: "64f0a1b2c3d4e5f678901234", typ: "refresh" },
      env.JWT_REFRESH_SECRET,
      { expiresIn: "14d", issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE },
    );
    return new Request(`https://example.com${pathname}`, {
      method: "GET",
      headers: { Cookie: `${REFRESH_COOKIE_NAME}=${refreshToken}` },
    });
  }

  test("/api/auth/me: DB가 닿지 않으면 조용히 null을 반환하지 않고 에러를 전파해 degraded 분류가 가능해야 한다", async () => {
    const request = await buildRefreshOnlyRequest("/api/auth/me");
    await expect(getOptionalUserFromRequest(request, env)).rejects.toThrow(/mongo/i);
  });

  // 계약이 한 번 바뀌었다. 예전에는 DB가 닿지 않으면 어느 라우트든 null→확정 401 로 닫았지만,
  // 그 강등이 "로그인했는데 로그인 필요" 증상의 원인이었다. 지금은 requireUserFromRequest 가
  // surfaceDbInfraError:true 를 넘겨(auth.js:588-591) 인프라 오류를 그대로 전파하고,
  // 유료 라우트는 resolvePaidRouteAuth 가 이를 503(retryable)로 옮긴다.
  // 아래 두 테스트가 그 경계를 못박는다 — 인프라 오류는 401 이 되면 안 되고,
  // 진짜 게스트는 여전히 401 이어야 한다.
  test("로그인 사용자의 DB 인프라 오류는 401로 강등되지 않고 전파돼야 한다", async () => {
    const request = await buildRefreshOnlyRequest("/api/fortune/pig-coin/consume");
    await expect(requireAuth(request, env)).rejects.toThrow(/mongo/i);
  });

  test("read-only payment snapshot may use a valid access token when Mongo is degraded", async () => {
    const accessToken = await signAuthToken({
      _id: "64f0a1b2c3d4e5f678901234",
      email: "snapshot@example.com",
      role: "user",
      name: "Snapshot user",
      points: 0,
    }, env);
    const request = new Request("https://example.com/api/payments/me?view=shop", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    await expect(requireUserFromRequest(request, env, {
      allowDbFallback: true,
      userProjection: { profileSubscription: 1 },
    })).resolves.toMatchObject({
      userId: "64f0a1b2c3d4e5f678901234",
      authDbFallback: true,
    });
  });

  test("자격증명이 아예 없는 진짜 게스트는 그대로 401 UNAUTHORIZED", async () => {
    const request = new Request("https://example.com/api/fortune/pig-coin/consume", { method: "GET" });
    await expect(requireAuth(request, env)).rejects.toMatchObject({
      status: 401,
      payload: { code: "UNAUTHORIZED" },
    });
  });

  test("유료 라우트 해석기는 같은 인프라 오류를 503 retryable 로 옮긴다", async () => {
    const authMod = await import("../../worker/lib/auth.js");
    const request = await buildRefreshOnlyRequest("/api/fortune/pig-coin/consume");
    await expect(authMod.resolvePaidRouteAuth(request, env)).rejects.toMatchObject({
      status: 503,
      payload: { code: "AUTH_STATUS_TEMPORARILY_UNAVAILABLE", retryable: true },
    });
  });
});
