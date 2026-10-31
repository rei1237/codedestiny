/** @jest-environment node */
import { jest } from "@jest/globals";

let handleSubscriptionRoutes;
let DailyFortuneSubscription;
let sendSingleFortune;
let counters;
let failCounter;

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(),
    withMongoRetry: jest.fn((_env, fn) => fn()),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    DailyFortuneSubscription: {
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(async () => ({ matchedCount: 1 })),
    },
  }));
  jest.unstable_mockModule("../../worker/lib/daily-fortune-task.js", () => ({
    escapeHtml: (value) => String(value),
    sendSingleFortune: jest.fn(),
  }));
  jest.unstable_mockModule("../../worker/lib/rate-limit.js", () => ({
    incrementRateLimit: jest.fn(async ({ subjectHash, endpoint }) => {
      if (failCounter) throw new Error("db down");
      const key = `${endpoint}|${subjectHash}`;
      counters.set(key, (counters.get(key) || 0) + 1);
      return { count: counters.get(key), resetAt: Date.now() + 60_000 };
    }),
  }));
  ({ handleSubscriptionRoutes } = await import("../../worker/routes/subscriptions.js"));
  ({ DailyFortuneSubscription } = await import("../../worker/lib/models.js"));
  ({ sendSingleFortune } = await import("../../worker/lib/daily-fortune-task.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  counters = new Map();
  failCounter = false;
  DailyFortuneSubscription.findOneAndUpdate.mockImplementation((filter) => ({
    lean: async () => ({ _id: "sub1", email: filter.email, subDaily: true, subMonthly: false, isActive: true }),
  }));
  sendSingleFortune.mockResolvedValue({ status: "sent" });
});

// 모듈 스코프 로컬 폴백 맵이 테스트 사이에 섞이지 않도록 테스트마다 서로 다른 IP를 쓴다.
const post = (email, ip) =>
  handleSubscriptionRoutes(
    new Request("https://code-destiny.com/api/subscriptions/daily-fortune", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify({ email }),
    }),
    {},
  );

test("같은 IP의 6번째 POST는 429이고 저장·메일 발송을 하지 않는다", async () => {
  for (let i = 1; i <= 5; i += 1) {
    expect((await post(`user${i}@example.com`, "203.0.113.1")).status).toBe(200);
  }
  jest.clearAllMocks();
  const blocked = await post("user6@example.com", "203.0.113.1");
  expect(blocked.status).toBe(429);
  expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  expect(await blocked.json()).toEqual({ message: "잠시 후 다시 시도해 주세요." });
  expect(DailyFortuneSubscription.findOneAndUpdate).not.toHaveBeenCalled();
  expect(sendSingleFortune).not.toHaveBeenCalled();
});

test("IP가 달라도 같은 이메일의 4번째 POST는 429이다", async () => {
  for (let i = 1; i <= 3; i += 1) {
    expect((await post("same@example.com", `203.0.113.${10 + i}`)).status).toBe(200);
  }
  jest.clearAllMocks();
  const blocked = await post("Same@Example.com ", "203.0.113.20");
  expect(blocked.status).toBe(429);
  expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  expect(DailyFortuneSubscription.findOneAndUpdate).not.toHaveBeenCalled();
  expect(sendSingleFortune).not.toHaveBeenCalled();
});

test("처음 구독하는 고객은 200이고 첫 메일이 1회 나간다", async () => {
  const response = await post("new@example.com", "203.0.113.30");
  expect(response.status).toBe(200);
  expect(sendSingleFortune).toHaveBeenCalledTimes(1);
  expect(DailyFortuneSubscription.findOneAndUpdate).toHaveBeenCalledTimes(1);
});

test("레이트리밋 저장소가 throw하면 로컬 폴백으로 첫 요청은 200이다", async () => {
  failCounter = true;
  const response = await post("fallback@example.com", "203.0.113.40");
  expect(response.status).toBe(200);
  expect(sendSingleFortune).toHaveBeenCalledTimes(1);
});

test("저장소가 죽어도 로컬 폴백이 같은 IP의 6번째 요청을 막는다", async () => {
  failCounter = true;
  for (let i = 1; i <= 5; i += 1) {
    expect((await post(`fb${i}@example.com`, "203.0.113.50")).status).toBe(200);
  }
  expect((await post("fb6@example.com", "203.0.113.50")).status).toBe(429);
});

test("잘못된 이메일은 한도를 쓰지 않고 400을 돌려준다", async () => {
  const response = await post("not-an-email", "203.0.113.60");
  expect(response.status).toBe(400);
  expect(counters.size).toBe(0);
});
