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

// 🔴 AUTH 구간이 3.1s 인 원인을 가르려면 "어느 분기가 인증을 성사시켰는가" 가 응답 밖에서 읽혀야
//    한다(docs/handoff/human-design-report-generation-fix.md). 그 배선은 requireAuth →
//    getServerUser → requireUserFromRequest → getOptionalUserFromRequest 4계층을 지나므로,
//    중간 한 곳이 옵션을 떨어뜨려도 기존 테스트는 전부 통과한 채 계측만 조용히 빈다.
describe("requireAuth 계측 싱크(authTimings)", () => {
  const env = {
    JWT_ACCESS_SECRET: "test-access-secret",
    JWT_ISSUER: "code-destiny-api",
    JWT_AUDIENCE: "code-destiny-web",
  };

  test("access 쿠키로 인증되면 그 분기 이름이 싱크에 남아야 한다", async () => {
    const validAccessToken = await signJwt(
      { userId: "64f0a1b2c3d4e5f678901234", email: "tester@example.com", role: "user" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: "10m", issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE },
    );
    const request = new Request("https://example.com/api/human-design/chart", {
      method: "POST",
      headers: { Cookie: `fortune_auth_token=${validAccessToken}` },
    });

    const authTimings = {};
    const auth = await requireAuth(request, env, { authTimings });
    expect(auth.userId).toBe("64f0a1b2c3d4e5f678901234");
    expect(authTimings.path).toBe("access-cookie");
  });

  test("인증 후보가 하나도 없으면 none 으로 남아야 한다 (계측이 조용히 비지 않는다)", async () => {
    const request = new Request("https://example.com/api/human-design/chart", { method: "POST" });
    const authTimings = {};
    await expect(requireAuth(request, env, { authTimings })).rejects.toMatchObject({ status: 401 });
    expect(authTimings.path).toBe("none");
  });
});
