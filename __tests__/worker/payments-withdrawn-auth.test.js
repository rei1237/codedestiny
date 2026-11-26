/**
 * @jest-environment node
 */

// PRIV-002(결제·선물): 주문 생성·차감 POST 와 선물 수령은 JWT 서명만 보는 peekAccessTokenUserId 가
// 아니라 탈퇴 여부까지 확인하는 resolvePaidRouteAuth 로 신원을 얻는다. 탈퇴·무효·게스트 토큰은
// null → 기존 401 UNAUTHORIZED, 인증 인프라 503 은 classify() 가 500 으로 바꾸지 않도록
// DB_UNAVAILABLE(503) 로 변환한다. confirm·GET 상태 조회는 peek(Mongo 읽기 0회)을 유지한다.
// resolvePaidRouteAuth 자체의 탈퇴 판정(status: withdrawn → null)은
// neo-consultations.withdrawn-auth.test.js 가 실제 auth.js 로 검증한다.

const USER_ID = "64f0a1b2c3d4e5f678901234";
const mockResolvePaidRouteAuth = jest.fn();
const mockPeek = jest.fn();

jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
  getOptionalUserFromRequest: jest.fn(async () => null),
  getAccessTokenSecret: jest.fn(() => "test-secret"),
  getJwtAudience: jest.fn(() => "test-audience"),
  getJwtIssuer: jest.fn(() => "test-issuer"),
  isAuthDbInfraError: jest.fn(() => false),
  peekAccessTokenUserId: mockPeek,
  requireAuth: jest.fn(async () => null),
  resolvePaidRouteAuth: mockResolvePaidRouteAuth,
}));

let handlePaymentsContext;
beforeAll(async () => {
  ({ handlePaymentsContext } = await import("../../worker/payments/index.js"));
});

const ENV = { PORTONE_API_SECRET: "s", PORTONE_STORE_ID: "st" };
const withDb = jest.fn(async () => { throw new Error("withDb must not run in this test"); });

function post(path, body = {}) {
  return new Request(`https://example.com/api/payments${path}`, {
    method: "POST",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const get = (path) => new Request(`https://example.com/api/payments${path}`, { headers: { Authorization: "Bearer t" } });
const call = (request) => handlePaymentsContext(request, ENV, { withDb });
function authInfraError() {
  return Object.assign(new Error("로그인 상태를 일시적으로 확인하지 못했어요."), {
    status: 503, payload: { code: "AUTH_STATUS_TEMPORARILY_UNAVAILABLE", retryable: true },
  });
}

beforeEach(() => {
  mockResolvePaidRouteAuth.mockReset();
  mockPeek.mockReset();
  withDb.mockClear();
  mockPeek.mockResolvedValue(USER_ID); // 탈퇴 계정의 서명 유효 토큰 — peek 만 보면 통과한다
});

const ACTIVE_ROUTES = [
  "/orders", "/prepare", "/coin-gate/moonstone", "/coin-gate/pass-check", "/subscription/prepare",
  "/moonstone/spend", "/birth-profile-pending/abc/claim", "/service-packs/prepare", "/service-packs/consume",
];

test.each(ACTIVE_ROUTES)("탈퇴·무효 토큰(null)으로 POST %s 하면 401 UNAUTHORIZED 이고 DB 작업은 없다", async (path) => {
  mockResolvePaidRouteAuth.mockResolvedValue(null);
  const response = await call(post(path));
  expect(response.status).toBe(401);
  expect((await response.json()).code).toBe("UNAUTHORIZED");
  expect(mockResolvePaidRouteAuth).toHaveBeenCalledTimes(1);
  expect(mockPeek).not.toHaveBeenCalled();
  expect(withDb).not.toHaveBeenCalled();
});

test("인증 인프라 503 은 500 이 아니라 503 DB_UNAVAILABLE(재시도 가능)", async () => {
  mockResolvePaidRouteAuth.mockRejectedValue(authInfraError());
  const response = await call(post("/orders"));
  expect(response.status).toBe(503);
  const body = await response.json();
  expect(body.code).toBe("DB_UNAVAILABLE");
  expect(body.retryable).toBe(true);
  expect(withDb).not.toHaveBeenCalled();
});

test("활성 사용자는 인증을 통과한다(401·503 이 아니다)", async () => {
  mockResolvePaidRouteAuth.mockResolvedValue({ userId: USER_ID, role: "user" });
  const response = await call(post("/orders", {}));
  expect([401, 503]).not.toContain(response.status);
  expect((await response.json()).code).not.toBe("UNAUTHORIZED");
  expect(mockResolvePaidRouteAuth).toHaveBeenCalledTimes(1);
});

test.each([
  ["POST", "/orders/abc/confirm"],
  ["POST", "/confirm"],
  ["POST", "/subscription/confirm"],
  ["POST", "/service-packs/orders/abc/confirm"],
  ["GET", "/orders/abc/status"],
  ["GET", "/orders/abc/resume"],
  ["GET", "/orders/abc"],
  ["GET", "/recoveries"],
  ["GET", "/service-packs/orders/abc/status"],
])("%s %s 는 peek 을 유지하고 활성 사용자 DB 확인을 하지 않는다", async (method, path) => {
  mockPeek.mockResolvedValue("");
  const response = await call(method === "GET" ? get(path) : post(path));
  expect(response.status).toBe(401);
  expect(mockPeek).toHaveBeenCalled();
  expect(mockResolvePaidRouteAuth).not.toHaveBeenCalled();
});

describe("선물", () => {
  test("탈퇴 토큰으로 POST /gifts/claim 하면 401 이고 DB 작업은 없다", async () => {
    mockResolvePaidRouteAuth.mockResolvedValue(null);
    const response = await call(post("/gifts/claim", { token: "x" }));
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("UNAUTHORIZED");
    expect(mockPeek).not.toHaveBeenCalled();
    expect(withDb).not.toHaveBeenCalled();
  });

  test("인증 인프라 503 은 503 DB_UNAVAILABLE", async () => {
    mockResolvePaidRouteAuth.mockRejectedValue(authInfraError());
    const response = await call(post("/gifts/claim", { token: "x" }));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("DB_UNAVAILABLE");
  });

  test("활성 사용자는 인증을 통과한다", async () => {
    mockResolvePaidRouteAuth.mockResolvedValue({ userId: USER_ID, role: "user" });
    const response = await call(post("/gifts/claim", { token: "x" }));
    expect(response.status).not.toBe(401);
    expect(mockResolvePaidRouteAuth).toHaveBeenCalledTimes(1);
  });

  test("GET 선물 조회는 peek 을 유지한다", async () => {
    mockPeek.mockResolvedValue("");
    const response = await call(get("/gifts/sent"));
    expect(response.status).toBe(401);
    expect(mockPeek).toHaveBeenCalled();
    expect(mockResolvePaidRouteAuth).not.toHaveBeenCalled();
  });
});
