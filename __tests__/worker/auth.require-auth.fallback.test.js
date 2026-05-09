/**
 * @jest-environment node
 */

let requireAuth;
let signJwt;

beforeAll(async () => {
  const authMod = await import("../../worker/lib/auth.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  requireAuth = authMod.requireAuth;
  signJwt = jwtMod.signJwt;
});

describe("requireAuth access fallback", () => {
  const env = {
    JWT_ACCESS_SECRET: "test-access-secret",
    JWT_ISSUER: "code-destiny-api",
    JWT_AUDIENCE: "code-destiny-web",
  };

  test("Authorization 헤더가 깨져도 access 쿠키가 유효하면 인증해야 한다", async () => {
    const validAccessToken = await signJwt(
      {
        userId: "64f0a1b2c3d4e5f678901234",
        email: "tester@example.com",
        role: "user",
      },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: "10m",
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      },
    );

    const request = new Request("https://example.com/api/fortune/pig-coin/consume", {
      method: "POST",
      headers: {
        Authorization: "Bearer broken.invalid.token",
        Cookie: `fortune_auth_token=${validAccessToken}`,
      },
    });

    const auth = await requireAuth(request, env);
    expect(auth.userId).toBe("64f0a1b2c3d4e5f678901234");
    expect(auth.email).toBe("tester@example.com");
  });

  test("유효한 access 토큰이 전혀 없으면 401이어야 한다", async () => {
    const request = new Request("https://example.com/api/fortune/pig-coin/consume", {
      method: "POST",
      headers: {
        Authorization: "Bearer broken.invalid.token",
      },
    });

    await expect(requireAuth(request, env)).rejects.toMatchObject({
      status: 401,
      payload: { code: "UNAUTHORIZED" },
    });
  });
});
