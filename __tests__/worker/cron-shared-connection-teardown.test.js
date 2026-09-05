/**
 * @jest-environment node
 *
 * 크론 태스크의 DB 작업은 **db.js 의 in-flight 가드에 보여야 한다**.
 *
 * 2026-09-03 실사고: 일일 크론(0 22 * * *)이 통째로 죽었다.
 *   service-execution-timeout / daily-fortune / webhook-reconcile → "Cannot use a session that has ended"
 *   sns-daily-post → 성공 0건 ("... has ended" / "Client must be connected before running operations")
 *
 * 원인은 Mongo 도 Atlas 도 아니라 **분업의 구멍**이었다. db.js 는 connectDb 호출마다 웜 커넥션을
 * ping 으로 재검증하고, 실패하면 떼어 내며 MongoClient.close() 한다. 그 close 는 activeSessions 를
 * 전부 끝내므로 진행 중인 **남의** op 가 함께 죽는다. 그 파괴를 막는 장치는 하나뿐이다:
 *
 *     if (countActiveMongoOps() > activeOpsOwned) { ... ping 을 보내지 않고 그대로 돌려준다 }
 *
 * (2026-09-06 부터 이 가드는 웜 분기의 ping 건너뛰기다. ping 이 실패한 뒤의 catch 는 이웃이
 *  있어도 떼어 낸다 — db.warm-connection-revalidation.test.js 가 그 이유를 고정한다.)
 *
 * 그런데 activeMongoOps 에 기록하는 주체는 withMongoRetry 뿐이다. 크론 태스크들은 raw 모델 op 을
 * 직접 불렀으므로 **설계상 그 가드 밖**에 서 있었고, 22:00Z 에 크론 둘(일일 + 10분)이 같은
 * 아이솔레이트에서 겹치자 서로의 소켓을 끊었다.
 *
 * 이 파일이 고정하는 계약은 db.js 의 내부 동작이 아니라(그건
 * db.warm-connection-revalidation.test.js 가 이미 고정한다) **크론 태스크 쪽의 의무**다:
 *
 *   ① 태스크가 DB 를 만지는 동안 countActiveMongoOps() 는 0 이 아니다  ← 수정 전 빨간불
 *   ② 그 상태에서 이웃의 ping 실패는 소켓을 끊지 못한다
 *   ③ 커넥션이 죽은 채로 시작해도 태스크가 스스로 다시 세운다
 *
 * 🔴 목이 즉시 resolve 하면 in-flight 창이 0ms 가 되어 ①이 관측될 수 없고, 그러면 이 테스트는
 *   **수정 없이도 초록불**이 된다. 그래서 모든 모델 op 은 게이트에 걸어 두고, "op 이 실제로
 *   등록됐다"를 폴링으로 확인하는 것을 첫 단언으로 둔다.
 *
 * 🔴 sns-daily-post 가 이 표에 없는 이유: 그 태스크는 첫 DB 접촉 뒤 곧바로 외부 채널
 *   (telegram.js / threads.js)로 나가므로 여기서 돌리려면 발행 경로까지 목으로 무해화해야 한다.
 *   같은 계약은 정적으로 scripts/verify-cron-mongo-op-coverage.mjs 가, 잠금·회수 동작은
 *   scripts/verify-sns-daily-post.mjs 가 전수로 지킨다.
 */

import { readFileSync } from "node:fs";

import { jest } from "@jest/globals";

const PING_OK = async () => ({ ok: 1 });
const PING_HANGS = () => new Promise(() => { /* 좀비 소켓: 영원히 pending */ });

/* ── mongoose 목 — db.warm-connection-revalidation.test.js:35-76 의 하네스를 복제한다.
      (그 파일을 고치면 기존 가드를 건드리게 되므로 공유하지 않는다.) ── */
function buildMongooseMock({ pingBehavior }) {
  const state = { ping: pingBehavior };
  const clients = [];
  const newClient = () => {
    const client = { on: jest.fn(), close: jest.fn(async () => {}) };
    clients.push(client);
    return client;
  };
  const connection = {
    readyState: 0,
    client: newClient(),
    db: { command: jest.fn((...args) => state.ping(...args)) },
    getClient() { return this.client; },
    close: jest.fn(async function close() {
      connection.readyState = 0;
    }),
    __clients: clients,
    __setPing: (next) => { state.ping = next; },
  };
  return {
    connection,
    connect: jest.fn(async () => {
      connection.client = newClient();
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => {
      connection.readyState = 0;
    }),
    Types: { ObjectId: class ObjectId { constructor(v) { this.value = String(v ?? "stub"); } toString() { return this.value; } } },
    models: {},
    model: jest.fn(() => ({})),
  };
}

/* ── models.js 목 — 어떤 모델 이름이든 체이너블 쿼리 스텁을 돌려주는 Proxy.
      태스크마다 모델 목록을 손으로 적으면 새 모델이 늘 때 조용히 빠진다(원칙 10). ── */
const TERMINAL_RESULTS = {
  find: () => [],
  findOne: () => null,
  findById: () => null,
  findOneAndUpdate: () => null,
  updateOne: () => ({ acknowledged: true, matchedCount: 0, modifiedCount: 0 }),
  updateMany: () => ({ acknowledged: true, matchedCount: 0, modifiedCount: 0 }),
  deleteOne: () => ({ acknowledged: true, deletedCount: 0 }),
  countDocuments: () => 0,
  create: () => ({ _id: "stub" }),
  insertMany: () => [],
  aggregate: () => [],
  bulkWrite: () => ({ ok: 1 }),
};

/**
 * 🔴 ESM 링커는 named export 를 **정적으로** 검사하므로 Proxy 목만으로는 모듈을 못 잇는다
 * ("does not provide an export named ..."). 그렇다고 모델 이름을 손으로 적으면 새 모델이 늘 때
 * 조용히 빠진다(원칙 10) — 그래서 정본 소스에서 export 이름을 전수 발견해 키를 만든다.
 */
function discoverModelExports() {
  const source = readFileSync(new URL("../../worker/lib/models.js", import.meta.url), "utf8");
  const names = [...source.matchAll(/export\s+const\s+(\w+)\s*=/g)].map((m) => m[1]);
  if (names.length < 40) throw new Error(`models.js export 발견 수가 ${names.length}개 — 정규식이 죽었다`);
  return names;
}

function buildModelsMock() {
  // 게이트: 열기 전까지 모든 모델 op 이 pending 이다 = in-flight 창을 우리가 통제한다.
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const started = { count: 0 };

  const makeQuery = (method) => {
    const settle = async () => {
      started.count += 1;
      await gate;
      return (TERMINAL_RESULTS[method] || (() => null))();
    };
    const proxy = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") { const p = settle(); return p.then.bind(p); }
        if (prop === "catch") { const p = settle(); return p.catch.bind(p); }
        if (prop === "finally") { const p = settle(); return p.finally.bind(p); }
        if (prop === "exec") return () => settle();
        if (typeof prop === "symbol") return undefined;
        return () => proxy; // .sort() .limit() .select() .lean() … 전부 체인
      },
    });
    return proxy;
  };

  const models = {};
  for (const name of discoverModelExports()) {
    // 모델이 아닌 상수 export(예: CONTENT_ENTITLEMENT_STATUSES)는 값으로 돌려준다.
    models[name] = /^[A-Z0-9_]+$/.test(name) ? [] : new Proxy({}, {
      get(_t, method) {
        if (typeof method === "symbol") return undefined;
        return () => makeQuery(String(method));
      },
    });
  }

  return { models, gate: { release: () => release(), startedOps: () => started.count } };
}

/** 크론에서 도는 태스크 4종 중 이 하네스로 무해하게 돌릴 수 있는 3종. */
const TASKS = [
  { name: "daily-fortune", module: "../../worker/lib/daily-fortune-task.js", entry: "runDailyFortuneTask" },
  { name: "service-execution-timeout", module: "../../worker/lib/service-execution-task.js", entry: "runServiceExecutionTimeoutTask" },
  { name: "monthly-credit-expiry", module: "../../worker/lib/monthly-credit-expiry-task.js", entry: "runMonthlyCreditExpiryTask" },
];

async function loadTask(taskModule, mongooseMock, modelsMock) {
  delete globalThis.__mongoOperationAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => modelsMock.models);
  // 외부로 나가는 것들은 전부 무해화한다 — 이 테스트는 네트워크를 한 번도 타지 않는다.
  jest.unstable_mockModule("../../worker/lib/resend.js", () => ({ sendEmail: jest.fn(async () => ({ ok: true })) }));
  jest.unstable_mockModule("../../worker/lib/telegram.js", () => ({
    escapeTelegramHtml: (s) => String(s ?? ""),
    sendTelegramMessage: jest.fn(async () => ({ ok: true })),
  }));
  jest.unstable_mockModule("../../worker/lib/portone.js", () => ({
    cancelPortOnePayment: jest.fn(async () => ({ ok: true })),
  }));
  const db = await import("../../worker/lib/db.js");
  const task = await import(taskModule);
  return { db, task };
}

const BASE_ENV = { MONGO_URI: "mongodb://fake/test", MONGO_PING_TIMEOUT_MS: "300" };

async function waitFor(predicate, { timeoutMs = 2000, stepMs = 5 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
  return false;
}

describe.each(TASKS)("$name", ({ module: taskModule, entry }) => {
  test("DB 작업 중에는 activeMongoOps 에 등록돼 있고, 이웃의 ping 실패가 소켓을 못 끊는다", async () => {
    const mongooseMock = buildMongooseMock({ pingBehavior: PING_OK });
    const modelsMock = buildModelsMock();
    const { db, task } = await loadTask(taskModule, mongooseMock, modelsMock);

    await db.connectDb(BASE_ENV);
    const running = Promise.resolve(task[entry](BASE_ENV)).catch((error) => ({ __threw: error }));

    try {
      // 🔴 첫 단언 — 목이 즉시 resolve 하면 이 창이 0ms 라 아래 단언이 전부 위양성이 된다.
      const opStarted = await waitFor(() => modelsMock.gate.startedOps() >= 1);
      expect(opStarted).toBe(true);

      // 🔴 이것이 2026-09-03 의 구멍이다. raw 모델 op 은 여기서 0 이었고, 그래서 아래 가드가
      //    발동하지 않아 이웃의 ping 실패 한 번이 이 태스크를 통째로 죽였다.
      const registered = await waitFor(() => db.__dbTestUtils.countActiveMongoOps() >= 1);
      expect(registered).toBe(true);

      // 이웃(같은 아이솔레이트의 다른 크론/요청)이 죽은 소켓을 만난다.
      mongooseMock.connection.__setPing(PING_HANGS);
      const staleClient = mongooseMock.connection.getClient();
      const disconnectsBefore = mongooseMock.disconnect.mock.calls.length;
      const closesBefore = mongooseMock.connection.close.mock.calls.length;

      await db.connectDb(BASE_ENV);

      expect(staleClient.close).not.toHaveBeenCalled();
      expect(mongooseMock.disconnect.mock.calls.length).toBe(disconnectsBefore);
      expect(mongooseMock.connection.close.mock.calls.length).toBe(closesBefore);
      expect(mongooseMock.connection.readyState).toBe(1);
    } finally {
      modelsMock.gate.release();
      await running;
    }

    // 태스크는 끝까지 살아서 돌아온다(세션이 끝나 죽지 않았다).
    const outcome = await running;
    expect(outcome?.__threw).toBeUndefined();
  });

  test("커넥션이 죽은 채로 시작해도 태스크가 스스로 다시 세운다", async () => {
    const mongooseMock = buildMongooseMock({ pingBehavior: PING_OK });
    const modelsMock = buildModelsMock();
    const { db, task } = await loadTask(taskModule, mongooseMock, modelsMock);

    await db.connectDb(BASE_ENV);
    // 태스크가 시작하기 전에 소켓이 죽는다(2026-09-03 에 실제로 벌어진 순서).
    mongooseMock.connection.__setPing(PING_HANGS);
    const connectsBefore = mongooseMock.connect.mock.calls.length;

    modelsMock.gate.release();
    const outcome = await Promise.resolve(task[entry](BASE_ENV)).catch((error) => ({ __threw: error }));

    expect(outcome?.__threw).toBeUndefined();
    // withMongoRetry 가 시도마다 connectDb 를 다시 부르므로 죽은 커넥션이 갈아 끼워진다.
    expect(mongooseMock.connect.mock.calls.length).toBeGreaterThan(connectsBefore);
    expect(mongooseMock.connection.readyState).toBe(1);
  });
});
