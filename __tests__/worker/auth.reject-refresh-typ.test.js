/**
 * @jest-environment node
 */

// PRIV-003: typ=refresh 토큰은 access 토큰 검증처(requireAuth·peekAccessTokenUserId)에서 쓰이지 못한다.
//  - 비밀값이 JWT_SECRET/AUTH_SECRET 하나로 공유되는 환경에서는 refresh 토큰이 access 서명 검증을 통과한다.
//  - access 발급(signAuthToken)은 typ 가 없으므로 typ 없음·"access" 는 계속 허용한다.

let requireAuth;
let peekAccessTokenUserId;
let signJwt;

beforeAll(async () => {
  const authMod = await import("../../worker/lib/auth.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  requireAuth = authMod.requireAuth;
  peekAccessTokenUserId = authMod.peekAccessTokenUserId;
  signJwt = jwtMod.signJwt;
});

const USER_ID = "64f0a1b2c3d4e5f678901234";
const env = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
};
const claims = { issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE, expiresIn: "10m" };
const bearer = (token) => new Request("https://example.com/api/me", { headers: { Authorization: `Bearer ${token}` } });

describe("PRIV-003 refresh 토큰을 access 로 쓰지 못한다", () => {
  test("typ=refresh 페이로드를 access 시크릿으로 서명하면 requireAuth 가 401", async () => {
    const refreshLike = await signJwt({ userId: USER_ID, sid: "abc", typ: "refresh" }, env.JWT_ACCESS_SECRET, claims);
    await expect(requireAuth(bearer(refreshLike), env)).rejects.toMatchObject({
      status: 401,
      payload: { code: "UNAUTHORIZED" },
    });
  });

  test("typ=refresh 는 peekAccessTokenUserId 에서도 게스트", async () => {
    const refreshLike = await signJwt({ userId: USER_ID, sid: "abc", typ: "refresh" }, env.JWT_ACCESS_SECRET, claims);
    await expect(peekAccessTokenUserId(bearer(refreshLike), env)).resolves.toBe("");
  });

  test.each([[{}], [{ typ: "access" }]])("일반 access 토큰(%j)은 계속 통과한다", async (extra) => {
    const token = await signJwt({ userId: USER_ID, email: "t@e.st", role: "user", ...extra }, env.JWT_ACCESS_SECRET, claims);
    const auth = await requireAuth(bearer(token), env);
    expect(auth.userId).toBe(USER_ID);
    await expect(peekAccessTokenUserId(bearer(token), env)).resolves.toBe(USER_ID);
  });
});
