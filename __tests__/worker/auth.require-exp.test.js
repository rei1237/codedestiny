/**
 * @jest-environment node
 */

// C5: 만료(exp) 없는 서명 토큰은 인증 토큰으로 쓰이지 못한다.
//  - verifyJwt 의 requireExp 는 opt-in 이고, 액세스/리프레시 검증처가 켠다.
//  - ACCESS_TOKEN_EXPIRES_IN 이 해석 불가여도 발급 토큰에는 exp 가 실려야 한다(전원 401 방지).

let requireAuth;
let peekAccessTokenUserId;
let signAuthToken;
let signJwt;
let verifyJwt;

beforeAll(async () => {
  const authMod = await import("../../worker/lib/auth.js");
  const jwtMod = await import("../../worker/lib/jwt.js");
  requireAuth = authMod.requireAuth;
  peekAccessTokenUserId = authMod.peekAccessTokenUserId;
  signAuthToken = authMod.signAuthToken;
  signJwt = jwtMod.signJwt;
  verifyJwt = jwtMod.verifyJwt;
});

const USER_ID = "64f0a1b2c3d4e5f678901234";
const env = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
};
const claims = { issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE };
const body = { userId: USER_ID, email: "tester@example.com", role: "user" };

const decodePayload = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
const bearer = (token) => new Request("https://example.com/api/me", { headers: { Authorization: `Bearer ${token}` } });

describe("verifyJwt requireExp", () => {
  test("기본값은 exp 없는 토큰을 통과시키고, requireExp 는 거부한다", async () => {
    const noExp = await signJwt(body, env.JWT_ACCESS_SECRET, claims);
    expect(decodePayload(noExp).exp).toBeUndefined();

    await expect(verifyJwt(noExp, env.JWT_ACCESS_SECRET, claims)).resolves.toMatchObject({ userId: USER_ID });
    await expect(verifyJwt(noExp, env.JWT_ACCESS_SECRET, { ...claims, requireExp: true })).rejects.toMatchObject({
      name: "JsonWebTokenError",
      message: "jwt exp required",
    });
  });

  test("exp 가 숫자가 아니거나 0 이어도 requireExp 는 거부한다", async () => {
    const nonNumeric = await signJwt({ ...body, exp: "never" }, env.JWT_ACCESS_SECRET, claims);
    const zero = await signJwt({ ...body, exp: 0 }, env.JWT_ACCESS_SECRET, claims);
    for (const token of [nonNumeric, zero]) {
      await expect(verifyJwt(token, env.JWT_ACCESS_SECRET, { ...claims, requireExp: true })).rejects.toMatchObject({
        message: "jwt exp required",
      });
    }
  });

  test("만료가 있는 토큰은 requireExp 에서도 통과한다", async () => {
    const token = await signJwt(body, env.JWT_ACCESS_SECRET, { ...claims, expiresIn: "10m" });
    await expect(verifyJwt(token, env.JWT_ACCESS_SECRET, { ...claims, requireExp: true })).resolves.toMatchObject({
      userId: USER_ID,
    });
  });
});

describe("액세스 토큰 검증처", () => {
  test("exp 없는 access 토큰은 requireAuth 가 401 로 거부하고, 같은 내용에 exp 가 있으면 통과한다", async () => {
    const noExp = await signJwt(body, env.JWT_ACCESS_SECRET, claims);
    const withExp = await signJwt(body, env.JWT_ACCESS_SECRET, { ...claims, expiresIn: "10m" });

    await expect(requireAuth(bearer(noExp), env)).rejects.toMatchObject({
      status: 401,
      payload: { code: "UNAUTHORIZED" },
    });
    const auth = await requireAuth(bearer(withExp), env);
    expect(auth.userId).toBe(USER_ID);
  });

  test("peekAccessTokenUserId(결제 라우터 신원)도 exp 없는 토큰이면 게스트로 본다", async () => {
    const noExp = await signJwt(body, env.JWT_ACCESS_SECRET, claims);
    const withExp = await signJwt(body, env.JWT_ACCESS_SECRET, { ...claims, expiresIn: "10m" });

    await expect(peekAccessTokenUserId(bearer(noExp), env)).resolves.toBe("");
    await expect(peekAccessTokenUserId(bearer(withExp), env)).resolves.toBe(USER_ID);
  });
});

describe("signAuthToken 발급", () => {
  test.each(["30 min", "PT30M", "0", "1.5h"])("ACCESS_TOKEN_EXPIRES_IN=%s 이어도 exp 가 실린다(기본 30분)", async (raw) => {
    const token = await signAuthToken({ _id: USER_ID, email: "t@e.st", role: "user", name: "t" }, {
      ...env,
      ACCESS_TOKEN_EXPIRES_IN: raw,
    });
    const payload = decodePayload(token);
    expect(payload.exp - payload.iat).toBe(30 * 60);
    await expect(verifyJwt(token, env.JWT_ACCESS_SECRET, { ...claims, requireExp: true })).resolves.toMatchObject({
      userId: USER_ID,
    });
  });

  test("해석 가능한 ACCESS_TOKEN_EXPIRES_IN 은 그대로 쓴다", async () => {
    const token = await signAuthToken({ _id: USER_ID, email: "t@e.st", role: "user", name: "t" }, {
      ...env,
      ACCESS_TOKEN_EXPIRES_IN: "2h",
    });
    const payload = decodePayload(token);
    expect(payload.exp - payload.iat).toBe(2 * 60 * 60);
  });
});
