import { withSettle } from "../fixtures/per-use-settle-mock.mjs";
import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";

const owner = "507f1f77bcf86cd799439011";
let wallets, ledgers, transactionTail = Promise.resolve();
const clone = (value) => (value == null ? value : structuredClone(value));
const matches = (row, filter) => Object.entries(filter).every(([key, want]) =>
  want && typeof want === "object" ? Number(row[key]) >= want.$gte : String(row[key]) === String(want));
function collection(source) {
  return {
    findOne: async (filter) => clone(source().find((row) => matches(row, filter)) || null),
    find: (filter) => ({
      toArray: async () => source()
        .filter((row) => String(row._id) >= filter._id.$gte && String(row._id) <= filter._id.$lte)
        .map(clone),
    }),
    findOneAndUpdate: async (filter, update, options = {}) => {
      let row = source().find((item) => matches(item, filter));
      if (!row && options.upsert) {
        row = { ...clone(update.$setOnInsert || {}), ...Object.fromEntries(Object.entries(filter).filter(([, v]) => typeof v !== "object")) };
        source().push(row);
      }
      if (!row) return null;
      for (const [key, value] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + value;
      for (const [key, value] of Object.entries(update.$set || {})) row[key] = value;
      return clone(row);
    },
    updateOne: async (filter, update) => {
      const row = source().find((item) => matches(item, filter));
      if (row) for (const [key, value] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + value;
      if (row) Object.assign(row, update.$set || {});
      return { modifiedCount: row ? 1 : 0 };
    },
    insertOne: async (doc) => {
      if (source().some((row) => row._id === doc._id)) throw Object.assign(new Error("duplicate"), { code: 11000 });
      source().push(clone(doc));
      return { insertedId: doc._id };
    },
  };
}
const fakeDb = {
  collection: (name) => collection(() => (name.endsWith("_wallets") ? wallets : ledgers)),
};
const mongooseMock = {
  connection: { db: fakeDb },
  startSession: async () => ({
    endSession: async () => {},
    withTransaction: async (callback) => {
      const previous = transactionTail;
      let release; transactionTail = new Promise(resolve => { release = resolve; });
      await previous;
      const backup = clone({ wallets, ledgers });
      try { return await callback(); } catch (error) { ({ wallets, ledgers } = backup); throw error; } finally { release(); }
    },
  }),
};
const verifyPerUsePayment = jest.fn();
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  mongoose: mongooseMock,
  connectDb: async () => undefined,
  mongoTransactionOptions: () => ({}),
  withMongoRetry: async (_env, run) => run(),
}));
jest.unstable_mockModule("../../worker/lib/db-scope-connection.js", () => ({ scopeConnection: () => null }));
jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ requireUserFromRequest: async () => ({ userId: owner }) }));
jest.unstable_mockModule("../../worker/lib/security/index.js", () => ({ enforceSensitiveEndpointSecurity: async () => ({ ok: true }) }));
jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => withSettle({ verifyPerUsePayment }));

let attendHoney, honeyAttendanceStatus, handlePromptHubRoutes, PROMPT_HUB_TOOLS;
beforeAll(async () => {
  ({ attendHoney, honeyAttendanceStatus } = await import("../../worker/lib/honey-wallet.js"));
  ({ handlePromptHubRoutes } = await import("../../worker/routes/prompt-hub.js"));
  ({ PROMPT_HUB_TOOLS } = await import("../../lib/fortune/prompt-hub-template.js"));
});

const generate = async (body) => {
  const response = await handlePromptHubRoutes(new Request("https://x.test/api/fortune/prompt-hub/generate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), {});
  return { status: response.status, data: await response.json() };
};
const input = (overrides = {}) => ({
  toolId: "basic", requestId: "req-00000001", computedFacts: "",
  fields: [{ id: "question", label: "질문", value: "올해 일 흐름" }], ...overrides,
});

beforeEach(() => {
  wallets = [];
  ledgers = [];
  verifyPerUsePayment.mockReset();
});

describe("꿀방울 출석", () => {
  test("동시 출석과 응답 유실 후 재요청도 당일 1개만 지급한다", async () => {
    const day = new Date("2026-10-12T03:00:00Z");
    await Promise.all(Array.from({ length: 5 }, () => attendHoney({}, owner, day)));
    const retry = await attendHoney({}, owner, day);
    expect(retry.balance).toBe(1);
    expect(retry.attendanceCount).toBe(1);
    expect(ledgers.filter(row => row.type === "attendance")).toHaveLength(1);
    expect(retry.rewarded).toBe(0);
  });
  test("같은 날 두 번 출석해도 한 번만 센다", async () => {
    const now = new Date("2026-10-12T03:00:00Z");
    expect((await attendHoney({}, owner, now)).awarded).toBe(true);
    const again = await attendHoney({}, owner, now);
    expect(again.awarded).toBe(false);
    expect(again.attendanceCount).toBe(1);
  });

  test("매일 출석에 꿀방울 1개를 준다", async () => {
    const days = ["2026-10-10", "2026-10-11", "2026-10-12"].map((day) => new Date(`${day}T03:00:00Z`));
    const results = [];
    for (const day of days) results.push(await attendHoney({}, owner, day));
    expect(results.map((r) => r.rewarded)).toEqual([1, 1, 1]);
    expect(results[2].balance).toBe(3);
    expect(results[2].nextRewardIn).toBe(1);
  });

  test("5일 연속이면 보너스 4개를 더 주고 5일마다 반복한다", async () => {
    const results = [];
    for (let day = 1; day <= 10; day++) results.push(await attendHoney({}, owner, new Date(Date.UTC(2026, 9, day, 3))));
    expect(results.map((r) => r.rewarded)).toEqual([1, 1, 1, 1, 5, 1, 1, 1, 1, 5]);
    expect(results.map((r) => r.bonus)).toEqual([0, 0, 0, 0, 4, 0, 0, 0, 0, 4]);
    expect(results[4].streak).toBe(5);
    expect(results[4].nextBonusIn).toBe(5);
    expect(results[9].balance).toBe(18);
    expect(ledgers.find((row) => row.day === "2026-10-05")).toMatchObject({ amount: 5, bonus: 4, reason: "HONEY_ATTENDANCE_STREAK_BONUS" });
  });

  test("하루라도 빠지면 연속이 1일째부터 다시 시작한다", async () => {
    for (const day of [1, 2, 3, 5, 6]) await attendHoney({}, owner, new Date(Date.UTC(2026, 9, day, 3)));
    const sixth = (await honeyAttendanceStatus({}, owner, new Date(Date.UTC(2026, 9, 6, 3))));
    expect(sixth.streak).toBe(2);
    expect(sixth.balance).toBe(5);
    expect((await honeyAttendanceStatus({}, owner, new Date(Date.UTC(2026, 9, 8, 3)))).streak).toBe(0);
  });

  test("이번 달 출석일과 보너스일을 달력용으로 돌려준다", async () => {
    for (const day of [1, 2, 3, 4, 5]) await attendHoney({}, owner, new Date(Date.UTC(2026, 9, day, 3)));
    await attendHoney({}, owner, new Date(Date.UTC(2026, 8, 30, 3)));
    const status = await honeyAttendanceStatus({}, owner, new Date(Date.UTC(2026, 9, 5, 3)));
    expect(status.monthDays.map((d) => d.day)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]);
    expect(status.monthDays.filter((d) => d.bonus).map((d) => d.day)).toEqual(["2026-10-05"]);
  });

  test("하루 경계는 KST 자정이다", async () => {
    await attendHoney({}, owner, new Date("2026-10-12T14:59:00Z"));
    const next = await attendHoney({}, owner, new Date("2026-10-12T15:00:00Z"));
    expect(next.awarded).toBe(true);
    expect(next.day).toBe("2026-10-13");
  });
});

test("당일 구정책 0개만 한 번 보충하고 과거 날짜는 그대로 둔다", async () => {
  wallets.push({ userId: owner, serviceScope: "FORTUNE_TEA_HOUSE", balance: 4, attendanceCount: 2 });
  for (const day of ["2026-10-16", "2026-10-17"]) ledgers.push({ _id: `attendance:${owner}:${day}`, amount: 0 });
  const now = new Date("2026-10-17T03:00:00Z");
  expect((await honeyAttendanceStatus({}, owner, now)).attended).toBe(false);
  expect((await attendHoney({}, owner, now)).balance).toBe(5);
  expect((await attendHoney({}, owner, now)).rewarded).toBe(0);
  expect((await honeyAttendanceStatus({}, owner, now)).attended).toBe(true);
  expect(wallets[0].attendanceCount).toBe(2);
  expect(ledgers[0].amount).toBe(0);
});

describe("프롬프트 생성", () => {
  test("꿀방울 1개를 쓰고 같은 요청은 다시 받되 다른 입력은 막는다", async () => {
    wallets.push({ userId: owner, serviceScope: "FORTUNE_TEA_HOUSE", balance: 5 });
    const first = await generate(input());
    expect(first.status).toBe(200);
    expect(first.data.paidWith).toBe("honey");
    expect(first.data.prompt).toContain("올해 일 흐름");
    expect((await honeyAttendanceStatus({}, owner)).balance).toBe(4);
    const replay = await generate(input());
    expect(replay.data.replayed).toBe(true);
    expect((await honeyAttendanceStatus({}, owner)).balance).toBe(4);
    const mismatch = await generate(input({ fields: [{ id: "question", label: "질문", value: "다른 질문" }] }));
    expect(mismatch.status).toBe(409);
    expect((await honeyAttendanceStatus({}, owner)).balance).toBe(4);
  });

  test("꿀방울이 없으면 402 와 3,000원 대체 결제 안내를 준다", async () => {
    const { status, data } = await generate(input());
    expect(status).toBe(402);
    expect(data.code).toBe("INSUFFICIENT_HONEY_DROPS");
    expect(data.pricing.amountKRW).toBe(3000);
  });

  test("결제 증빙이 있을 때만 결제 경로로 만든다", async () => {
    verifyPerUsePayment.mockResolvedValueOnce({ proven: false });
    expect((await generate(input({ paymentRequestId: "pay-00000001" }))).status).toBe(402);
    verifyPerUsePayment.mockResolvedValueOnce({ proven: true, source: "coin" });
    const paid = await generate(input({ paymentRequestId: "pay-00000001" }));
    expect(paid.status).toBe(200);
    expect(verifyPerUsePayment).toHaveBeenLastCalledWith({}, expect.objectContaining({
      featureKey: "fortune-prompt-hub-generate", coinPrice: 30, requestId: "pay-00000001",
    }));
  });
});

test("프롬프트 틀의 원칙 문장은 클라이언트 소스에 없다", () => {
  const client = readFileSync(new URL("../../app/fortune/prompt-hub/PromptHubClient.tsx", import.meta.url), "utf8");
  for (const tool of Object.values(PROMPT_HUB_TOOLS)) {
    for (const principle of tool.principles) expect(client.includes(principle)).toBe(false);
  }
});
