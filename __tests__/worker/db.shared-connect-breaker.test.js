/**
 * @jest-environment node
 *
 * 공유 레인 연결 차단기(isolate 단위, 2026-11-01 P1 후속).
 *
 * 2026-10-31 21:59~22:10 에 503 비율이 30.9%까지 올랐다. 유력 원인은 M10 의 노드당 신규 연결 한도(초당 15개)다.
 * 공유 레인은 요청마다 연결을 새로 세우고, 실패한 요청 하나가 family × 재시도로 최대 6번을 더 연다.
 * 여기서 고정하는 계약:
 *   1. 수립이 N번 연속 실패하면 열리고, 창 안에서는 createConnection 을 부르지 않고 바로 실패한다.
 *      빠른 실패는 일시 오류(503)로 분류되고, withMongoRetry 가 재시도하지 않는다. [db-connect-error] 도 늘리지 않는다.
 *   2. 창이 지나면 탐침 하나만 수립을 시도하고(나머지는 바로 실패), 성공하면 닫힌다. 실패하면 다시 열린다.
 *   3. 결제는 막지 않는다 — bypassConnectBreaker(결제 폴백)와 결제 admission 레인은 열린 차단기를 지나간다.
 *   4. MONGO_CONNECT_BREAKER_FAILURES=0 이면 끈다.
 */

import { jest } from "@jest/globals";

const ENV = {
  MONGO_URI: "mongodb://127.0.0.1:27017/test",
  MONGO_WORKER_RETRY_DELAY_MS: "0",
  MONGO_WORKER_CONNECT_RETRIES: "0",
  MONGO_IP_FAMILY: "4",
};

let logs = [];
let errors = [];

beforeEach(() => {
  logs = [];
  errors = [];
  jest.spyOn(console, "log").mockImplementation((...args) => { logs.push(args.map(String).join(" ")); });
  jest.spyOn(console, "error").mockImplementation((...args) => { errors.push(args.map(String).join(" ")); });
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function loadSharedLane() {
  const state = { fail: true };
  const created = [];
  const global = { readyState: 0, getClient: () => ({ on: jest.fn() }), db: { command: jest.fn(async () => ({ ok: 1 })) } };
  const mongooseMock = {
    connection: global,
    connect: jest.fn(async () => { global.readyState = 1; return global; }),
    disconnect: jest.fn(async () => { global.readyState = 0; }),
    createConnection: jest.fn(() => {
      const conn = {
        readyState: 0,
        getClient: () => ({ on: jest.fn() }),
        asPromise: async () => {
          if (state.fail) {
            const error = new Error("connection <monitor> to 10.0.0.1:27017 closed");
            error.name = "MongoNetworkError";
            throw error;
          }
          conn.readyState = 1;
          return conn;
        },
        destroy: jest.fn(async () => { conn.readyState = 0; }),
      };
      created.push(conn);
      return conn;
    }),
  };
  delete globalThis.__mongoOperationAdmission;
  delete globalThis.__mongoPaymentAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const db = await import("../../worker/lib/db.js");
  const scope = await import("../../worker/lib/db-scope.js");
  // 요청 하나 = 스코프 하나. 프로덕션 요청은 모두 스코프 안에서 공유 레인을 탄다.
  const inRequest = (fn) => scope.withDbScopes({ fetch: fn }).fetch();
  return { ...db, inRequest, state, created, mongooseMock };
}

const connectErrors = () => errors.filter((l) => l.startsWith("[db-connect-error]")).length;
const breakerLogs = () => logs.filter((l) => l.startsWith("[db-connect-breaker]")).map((l) => l.split(" ")[1]);

test("수립이 3번 연속 실패하면 열리고, 창 안에서는 연결을 만들지 않고 503 계열로 바로 실패한다", async () => {
  const { connectDb, inRequest, created, isTransientMongoError, CONNECT_BREAKER_OPEN_ERROR_NAME } = await loadSharedLane();

  for (let i = 0; i < 3; i += 1) {
    await expect(inRequest(() => connectDb(ENV))).rejects.toMatchObject({ name: "MongoNetworkError" });
  }
  expect(created).toHaveLength(3);
  expect(breakerLogs()).toEqual(["open"]);
  const attemptsBefore = connectErrors();

  const fastFail = await inRequest(() => connectDb(ENV)).catch((error) => error);
  expect(fastFail.name).toBe(CONNECT_BREAKER_OPEN_ERROR_NAME);
  expect(isTransientMongoError(fastFail)).toBe(true);
  expect(created).toHaveLength(3);
  expect(connectErrors()).toBe(attemptsBefore);
});

test("열린 동안 withMongoRetry 는 재시도하지 않고 바로 던진다(연결도 만들지 않는다)", async () => {
  const { connectDb, withMongoRetry, inRequest, created, CONNECT_BREAKER_OPEN_ERROR_NAME } = await loadSharedLane();
  for (let i = 0; i < 3; i += 1) await inRequest(() => connectDb(ENV)).catch(() => {});
  const operation = jest.fn(async () => "ok");

  const error = await inRequest(() => withMongoRetry(ENV, operation)).catch((e) => e);

  expect(error.name).toBe(CONNECT_BREAKER_OPEN_ERROR_NAME);
  expect(operation).not.toHaveBeenCalled();
  expect(created).toHaveLength(3);
});

test("창이 지나면 탐침 하나만 수립하고, 성공하면 닫힌다", async () => {
  const { connectDb, inRequest, created, state, __dbTestUtils, CONNECT_BREAKER_OPEN_ERROR_NAME } = await loadSharedLane();
  for (let i = 0; i < 3; i += 1) await inRequest(() => connectDb(ENV)).catch(() => {});
  __dbTestUtils.sharedConnectBreakerForTest().openUntil = Date.now() - 1;
  state.fail = false;

  // 탐침과 같은 순간에 들어온 다른 요청은 탐침이 끝날 때까지 바로 실패한다.
  const probe = inRequest(() => connectDb(ENV));
  const sibling = await inRequest(() => connectDb(ENV)).catch((e) => e);
  expect(sibling.name).toBe(CONNECT_BREAKER_OPEN_ERROR_NAME);
  await expect(probe).resolves.toMatchObject({ readyState: 1 });
  expect(created).toHaveLength(4);

  await expect(inRequest(() => connectDb(ENV))).resolves.toMatchObject({ readyState: 1 });
  expect(created).toHaveLength(5);
  expect(breakerLogs()).toEqual(["open", "half-open", "close"]);
  expect(__dbTestUtils.sharedConnectBreakerForTest()).toMatchObject({ failures: 0, probing: false });
});

test("탐침이 실패하면 다시 열린다", async () => {
  const { connectDb, inRequest, created, __dbTestUtils, CONNECT_BREAKER_OPEN_ERROR_NAME } = await loadSharedLane();
  for (let i = 0; i < 3; i += 1) await inRequest(() => connectDb(ENV)).catch(() => {});
  __dbTestUtils.sharedConnectBreakerForTest().openUntil = Date.now() - 1;

  await expect(inRequest(() => connectDb(ENV))).rejects.toMatchObject({ name: "MongoNetworkError" });
  expect(created).toHaveLength(4);
  const next = await inRequest(() => connectDb(ENV)).catch((e) => e);
  expect(next.name).toBe(CONNECT_BREAKER_OPEN_ERROR_NAME);
  expect(created).toHaveLength(4);
  expect(breakerLogs()).toEqual(["open", "half-open", "open"]);
});

test("결제는 막지 않는다: 결제 폴백(bypassConnectBreaker)과 결제 admission 레인은 열린 차단기를 지나간다", async () => {
  const { connectDb, withMongoRetry, inRequest, created, state } = await loadSharedLane();
  for (let i = 0; i < 3; i += 1) await inRequest(() => connectDb(ENV)).catch(() => {});
  state.fail = false;

  await expect(inRequest(() => connectDb(ENV, { bypassConnectBreaker: true }))).resolves.toMatchObject({ readyState: 1 });
  expect(created).toHaveLength(4);
  await expect(inRequest(() => withMongoRetry(ENV, async () => "paid", { admissionLane: "payment" }))).resolves.toBe("paid");
  expect(created).toHaveLength(5);
});

test("MONGO_CONNECT_BREAKER_FAILURES=0 이면 끈다", async () => {
  const { connectDb, inRequest, created } = await loadSharedLane();
  const env = { ...ENV, MONGO_CONNECT_BREAKER_FAILURES: "0" };
  for (let i = 0; i < 5; i += 1) {
    await expect(inRequest(() => connectDb(env))).rejects.toMatchObject({ name: "MongoNetworkError" });
  }
  expect(created).toHaveLength(5);
  expect(breakerLogs()).toEqual([]);
});
