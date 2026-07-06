/**
 * @jest-environment node
 */

let getOptionalUserFromRequest;
let requireAuth;
let signJwt;
let REFRESH_COOKIE_NAME;

beforeAll(async () => {
  const authMod = await import("../../worker/lib/auth.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  getOptionalUserFromRequest = authMod.getOptionalUserFromRequest;
  requireAuth = authMod.requireAuth;
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

  test("다른 라우트는 기존과 동일하게 실패 시 null(401)로 닫혀야 한다 — paid-flow-gates 계약 유지", async () => {
    const request = await buildRefreshOnlyRequest("/api/fortune/pig-coin/consume");
    await expect(requireAuth(request, env)).rejects.toMatchObject({
      status: 401,
      payload: { code: "UNAUTHORIZED" },
    });
  });
});
