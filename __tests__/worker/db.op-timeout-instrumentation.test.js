/**
 * @jest-environment node
 *
 * op-타임아웃 계측이 실제로 출력되는지 지키는 가드.
 *
 * 계측은 "조용히 안 나오는" 실패 모드가 가장 위험하다(2026-08-01 에 auth-timing 이 안 찍혀
 * 코드를 의심하며 한참 헤맸는데, 실제로는 배포본이 덮여 있었다). 그래서 로그 자체를 단언한다.
 *
 * 이 로그는 `resolveAuth` 12초 상한의 원인을 세 갈래로 가르기 위한 진단이다:
 *   connectMs 큼 → 연결 수립 / checkedOut 증분 없음 → 풀·I/O 격리 / commandStarted 만 증가 → 서버 지연
 */

import { jest } from "@jest/globals";
import { EventEmitter } from "node:events";

const pendingResolvers = [];
const HANG_FOREVER = () => new Promise((resolve) => {
  pendingResolvers.push(resolve);
});

afterEach(() => {
  while (pendingResolvers.length) pendingResolvers.pop()();
});

// 시도 상한의 하한은 serverSelectionTimeoutMS + 3500 이라, 최소값으로 테스트를 짧게 유지한다.
const ENV = {
  MONGO_URI: "mongodb://127.0.0.1:27017/test",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: "2000",
};
const ATTEMPT_TIMEOUT_FLOOR_MS = 2000 + 3500;

test("op-타임아웃 시 [db-op-timeout] 진단 로그를 남긴다", async () => {
  const client = { on: jest.fn() };
  const connection = {
    readyState: 0,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
    getClient: () => client,
  };
  const mongooseMock = {
    connection,
    connect: jest.fn(async () => {
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => {
      connection.readyState = 0;
    }),
  };

  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const { withMongoRetry } = await import("../../worker/lib/db.js");

  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => { logs.push(args.map(String).join(" ")); };
  try {
    await expect(withMongoRetry(ENV, HANG_FOREVER)).rejects.toThrow(/operation timed out/i);
  } finally {
    console.log = originalLog;
  }

  const line = logs.find((l) => l.includes("[db-op-timeout]"));
  expect(line).toBeDefined();

  const payload = JSON.parse(line.slice(line.indexOf("{")));
  // 연결은 성공했으므로 connectMs 가 잡히고, 남은 시간이 전부 쿼리(opMs)로 간다.
  expect(payload.connectMs).toBeGreaterThanOrEqual(0);
  expect(payload.opMs).toBeGreaterThan(0);
  expect(payload).toHaveProperty("delta");
  // 드라이버 이벤트 계측이 실제로 연결에 붙었는지(붙지 않으면 delta 가 영원히 비어 진단이 죽는다).
  expect(client.on).toHaveBeenCalled();
  expect(mongooseMock.disconnect).toHaveBeenCalledTimes(1);
}, ATTEMPT_TIMEOUT_FLOOR_MS + 10000);

function buildEmittingMongoose() {
  const client = new EventEmitter();
  const connection = {
    readyState: 0,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
    getClient: () => client,
  };
  const mongooseMock = {
    connection,
    connect: jest.fn(async () => {
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => {
      connection.readyState = 0;
    }),
  };
  return { client, mongooseMock };
}

async function loadDb(mongooseMock) {
  delete globalThis.__mongoOperationAdmission;
  delete globalThis.__mongoPaymentAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  return import("../../worker/lib/db.js");
}

async function captureOpTimeout(withMongoRetry, op) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => { logs.push(args.map(String).join(" ")); };
  try {
    await expect(withMongoRetry(ENV, op)).rejects.toThrow(/operation timed out/i);
  } finally {
    console.log = originalLog;
  }
  const line = logs.find((l) => l.includes("[db-op-timeout]"));
  return { logs, payload: JSON.parse(line.slice(line.indexOf("{"))) };
}

// 2026-09-23 영냥이 503: 이 시도엔 checkOutFailed 가 없었는데 예전 실패의 poolClosed 가 붙어 오진했다.
test("시도 밖의 체크아웃 실패 사유는 붙이지 않고, 걸린 명령의 커넥션과 그 소켓을 연 로그를 남긴다", async () => {
  const { client, mongooseMock } = buildEmittingMongoose();
  const { withMongoRetry } = await loadDb(mongooseMock);
  const originalLog = console.log;
  console.log = () => {};
  try {
    // 앞선 요청이 웜 커넥션 분리로 poolClosed 체크아웃 실패를 남기고 정상 종료했다.
    await withMongoRetry(ENV, async () => {
      client.emit("connectionCheckOutFailed", { reason: "poolClosed" });
      return "ok";
    });
  } finally {
    console.log = originalLog;
  }

  const { logs, payload } = await captureOpTimeout(withMongoRetry, () => {
    client.emit("connectionCreated", { connectionId: 7 });
    client.emit("commandStarted", { requestId: 41, connectionId: 7, commandName: "update" });
    return HANG_FOREVER();
  });

  expect(payload.delta).not.toHaveProperty("lastCheckOutFailReason");
  expect(payload.pending).toEqual([expect.objectContaining({ cmd: "update", conn: expect.stringMatching(/#7$/) })]);
  const openLine = logs.find((l) => l.includes("[db-conn-open]"));
  expect(JSON.parse(openLine.slice(openLine.indexOf("{"))).conn).toBe(payload.pending[0].conn);
}, ATTEMPT_TIMEOUT_FLOOR_MS + 10000);

// 2026-09-24: 다른 요청이 연 소켓 위 **성공** 명령을 세려면 성공에도 커넥션이 남아야 한다(스테이징 전용).
test("스테이징에서는 명령마다 시작 줄(커넥션)과 완료 줄을 같은 k 로 남기고, 프로덕션에서는 남기지 않는다", async () => {
  const runOnce = async (env) => {
    const { client, mongooseMock } = buildEmittingMongoose();
    const { withMongoRetry } = await loadDb(mongooseMock);
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => { logs.push(args.map(String).join(" ")); };
    try {
      await withMongoRetry(env, async () => {
        client.emit("connectionCreated", { connectionId: 3 });
        client.emit("commandStarted", { requestId: 9, connectionId: 3, commandName: "find", command: { find: "yeongnyangi_requests" } });
        client.emit("commandSucceeded", { requestId: 9, connectionId: 3, duration: 12.4 });
        client.emit("commandStarted", { requestId: 10, connectionId: 3, commandName: "insert", command: { insert: "users" } });
        client.emit("commandFailed", { requestId: 10, connectionId: 3, duration: 5, failure: { name: "MongoNetworkError" } });
        return "ok";
      });
    } finally {
      console.log = originalLog;
    }
    const parse = (tag) => logs.filter((l) => l.startsWith(`${tag} `)).map((l) => JSON.parse(l.slice(l.indexOf("{"))));
    return { conn: parse("[db-conn-open]"), started: parse("[db-cmd]"), ok: parse("[db-cmd-ok]"), failed: parse("[db-cmd-fail]") };
  };

  // installProcessEnv 가 env 를 process.env 로 복사해 남기므로 프로덕션을 먼저 돌리고 끝에 지운다.
  const production = await runOnce(ENV);
  expect(production.conn).toHaveLength(1);
  expect([...production.started, ...production.ok, ...production.failed]).toEqual([]);

  try {
    const staging = await runOnce({ ...ENV, APP_ENV: "staging" });
    expect(staging.started).toEqual([
      { k: expect.stringMatching(/:9$/), cmd: "find", coll: "yeongnyangi_requests", conn: staging.conn[0].conn, scope: null },
      { k: expect.stringMatching(/:10$/), cmd: "insert", coll: "users", conn: staging.conn[0].conn, scope: null },
    ]);
    expect(staging.ok).toEqual([{ k: staging.started[0].k, ms: 12 }]);
    expect(staging.failed).toEqual([{ k: staging.started[1].k, ms: 5, err: "MongoNetworkError" }]);
  } finally {
    delete process.env.APP_ENV;
  }
});

// 2026-09-24 설계안 C1: 소켓을 연 요청을 tail 이벤트로 추정하지 않고 스코프 id 로 맞춘다.
test("스코프 안에서는 [db-conn-open]·[db-cmd] 에 요청 스코프 id 를 남겨, 다른 요청이 연 소켓으로 보낸 명령을 가른다", async () => {
  const { client, mongooseMock } = buildEmittingMongoose();
  const { withMongoRetry } = await loadDb(mongooseMock);
  const { withDbScopes, currentDbScopeId } = await import("../../worker/lib/db-scope.js");
  const scopes = [];
  const entry = withDbScopes({
    fetch: (requestId, opensSocket) => withMongoRetry({ ...ENV, APP_ENV: "staging" }, async () => {
      // withMongoRetry 의 연결·admission await 를 지나서도 요청 스코프가 op 까지 이어져야 한다.
      scopes.push(currentDbScopeId());
      if (opensSocket) client.emit("connectionCreated", { connectionId: 3 });
      client.emit("commandStarted", { requestId, connectionId: 3, commandName: "find", command: { find: "users" } });
      return "ok";
    }),
  });
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => { logs.push(args.map(String).join(" ")); };
  try {
    await entry.fetch(1, true); // 요청 A 가 소켓 #3 을 열고 보낸다.
    await entry.fetch(2, false); // 요청 B 가 A 가 연 소켓 #3 으로 보낸다.
  } finally {
    console.log = originalLog;
    delete process.env.APP_ENV;
  }
  const parse = (tag) => logs.filter((l) => l.startsWith(`${tag} `)).map((l) => JSON.parse(l.slice(l.indexOf("{"))));

  expect(scopes).toEqual([expect.stringMatching(/^f-\w+$/), expect.stringMatching(/^f-\w+$/)]);
  expect(scopes[0]).not.toBe(scopes[1]);
  expect(parse("[db-conn-open]")).toEqual([{ conn: expect.stringMatching(/#3$/), scope: scopes[0] }]);
  expect(parse("[db-cmd]").map(({ conn, scope }) => ({ conn, scope }))).toEqual([
    { conn: parse("[db-conn-open]")[0].conn, scope: scopes[0] },
    { conn: parse("[db-conn-open]")[0].conn, scope: scopes[1] },
  ]);
});

test("시도 안에서 체크아웃이 실패했으면 그 사유를 붙인다", async () => {
  const { client, mongooseMock } = buildEmittingMongoose();
  const { withMongoRetry } = await loadDb(mongooseMock);

  const { payload } = await captureOpTimeout(withMongoRetry, () => {
    client.emit("connectionCheckOutFailed", { reason: "timeout" });
    return HANG_FOREVER();
  });

  expect(payload.delta).toMatchObject({ checkOutFailed: 1, lastCheckOutFailReason: "timeout" });
}, ATTEMPT_TIMEOUT_FLOOR_MS + 10000);
