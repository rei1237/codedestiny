/**
 * @jest-environment node
 */

// PRIV-002(neo): 네오 상담 고객 라우트는 JWT 서명만 보는 peekAccessTokenUserId 가 아니라
// 탈퇴 여부까지 확인하는 인증으로 신원을 얻는다. 탈퇴 사용자 토큰은 게스트('')와 같아 401,
// 로그인 사용자의 일시적 DB 장애는 401(로그아웃)로 뭉개지 않고 503.

const mockFindOne = jest.fn();

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  // isValid: 탈퇴·게스트로 access 가 비면 dev-auth 폴백이 ObjectId.isValid 를 부른다.
  mongoose: { connection: { name: "test" }, Types: { ObjectId: Object.assign(function ObjectId(value) { this.value = value; }, { isValid: (v) => /^[a-f0-9]{24}$/i.test(String(v || "")) }) } },
  resetMongooseConnection: jest.fn(async () => undefined),
  requestPoolRecovery: jest.fn(async () => undefined),
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  RefreshTokenSession: {},
  User: { collection: { findOne: mockFindOne } },
}));

let resolveNeoCustomerUserId;
let handleNeoConsultations;
let signAuthToken;

beforeAll(async () => {
  ({ resolveNeoCustomerUserId, handleNeoConsultations } = await import("../../worker/routes/neo-consultations.js"));
  ({ signAuthToken } = await import("../../worker/lib/auth.js"));
});

const USER_ID = "64f0a1b2c3d4e5f678901234";
const env = { JWT_ACCESS_SECRET: "test-access-secret", JWT_ISSUER: "code-destiny-api", JWT_AUDIENCE: "code-destiny-web" };
const userDoc = (status) => ({ _id: USER_ID, email: "t@e.st", role: "user", name: "T", status });

async function createRequest() {
  const token = await signAuthToken({ _id: USER_ID, email: "t@e.st", role: "user", name: "T" }, env);
  return new Request("https://example.com/api/neo-consultations", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ questions: ["q"] }),
  });
}

beforeEach(() => mockFindOne.mockReset());

test("탈퇴 사용자 토큰으로 주문을 만들면 401 이고 service.create 는 불리지 않는다", async () => {
  mockFindOne.mockResolvedValue(userDoc("withdrawn"));
  const request = await createRequest();
  const userId = await resolveNeoCustomerUserId(request, env);
  expect(userId).toBe("");
  const service = { create: jest.fn(async () => ({ id: "x" })) };
  const response = await handleNeoConsultations(request, { service, userId });
  expect(response.status).toBe(401);
  expect(service.create).not.toHaveBeenCalled();
});

test("활성 사용자는 그대로 userId 를 얻는다", async () => {
  mockFindOne.mockResolvedValue(userDoc("active"));
  await expect(resolveNeoCustomerUserId(await createRequest(), env)).resolves.toBe(USER_ID);
});

test("토큰이 없으면 게스트('')", async () => {
  const request = new Request("https://example.com/api/neo-consultations", { method: "POST" });
  await expect(resolveNeoCustomerUserId(request, env)).resolves.toBe("");
  expect(mockFindOne).not.toHaveBeenCalled();
});

test("로그인 사용자의 일시적 DB 장애는 503 으로 표면화한다", async () => {
  mockFindOne.mockRejectedValue(new Error("server selection timed out"));
  await expect(resolveNeoCustomerUserId(await createRequest(), env)).rejects.toMatchObject({ status: 503 });
});
