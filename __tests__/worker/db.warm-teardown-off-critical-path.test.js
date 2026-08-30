/**
 * @jest-environment node
 *
 * 죽은 웜 커넥션의 teardown 은 **임계 경로 위에 없다**.
 *
 * 2026-08-31 프로덕션·스테이징 계측(`[db-connect] ... warmResetMs`)이 이 파일이 고정하는 성질의
 * 근거다. ping 예산을 1000 → 300 으로 내린 뒤에도 선행 구간에 잔량이 남았고, 단계 계측이 그 정체를
 * teardown 으로 확정했다:
 *
 *   스테이징  선행 1623ms ≈ ping 300 + warmResetMs 1316   (핸드셰이크는 그 뒤로 2440ms 더)
 *   프로덕션  선행  532ms ≈ ping 300 + teardown ≈232
 *
 * 비용의 정체는 죽은 소켓 위에서 도는 드라이버 `MongoClient.close()` 다(activeCursors → endSession →
 * `endSessions` 명령의 서버 왕복). 드라이버 7 의 `close(force)` 는 force 를 무시하므로 "싸게 닫기"는
 * 없고, 남은 레버는 **기다리지 않는 것** 하나다. 새 커넥션은 어차피 새 MongoClient 위에 서므로
 * (mongoose 의 `createClient` 가 매번 `new mongodb.MongoClient(...)`) 옛 클라이언트의 정리가 끝나
 * 있을 필요가 없다.
 *
 * 그래서 고정하는 것 넷:
 *   ① mongoose 분리는 `close({ skipCloseClient: true })` 로 한다 — I/O 0. 이 옵션이 사라지면
 *      mongoose 가 그 객체를 `client.close(force)` 로 넘겨 **조용히 종전 속도로 퇴화**한다.
 *   ② 옛 클라이언트의 실제 close 는 임계 경로를 막지 않는다(재수립이 그 완료 전에 시작된다).
 *   ③ 그래도 **반드시 닫는다** — 안 닫으면 poll 모니터가 남아 Atlas heartbeat 를 계속 낸다.
 *   ④ 분리가 실패하면 확실한 쪽(전량 teardown)으로 떨어진다 — readyState 1 인 죽은 커넥션을
 *      그대로 돌려주면 2026-08-16 실측의 쿼리 7.8초가 재발한다.
 *
 * 🔴 남의 소켓을 끊지 않는 `countActiveMongoOps` 가드는 이 파일이 아니라
 * `db.warm-connection-revalidation.test.js` 가 지킨다. 두 장치는 서로를 대체하지 않는다.
 */

import { jest } from "@jest/globals";

const PING_OK = async () => ({ ok: 1 });
const PING_HANGS = () => new Promise(() => { /* 좀비 소켓: 영원히 pending */ });

// 🔴 지연 0 짜리 close 로는 "안 기다린다"를 검증할 수 없다 — 기다려도 즉시 끝나 통과해 버린다.
const STALE_CLOSE_DELAY_MS = 500;

function buildMongooseMock({ closeDelayMs = STALE_CLOSE_DELAY_MS, connectionCloseError = null } = {}) {
  const state = { ping: PING_OK };
  const events = [];
  const clients = [];

  const newClient = () => {
    const id = clients.length;
    const client = {
      id,
      on: jest.fn(),
      close: jest.fn(async () => {
        events.push(`client${id}.close:start`);
        if (closeDelayMs > 0) await new Promise((resolve) => { setTimeout(resolve, closeDelayMs); });
        events.push(`client${id}.close:end`);
      }),
    };
    clients.push(client);
    return client;
  };

  const connection = {
    readyState: 0,
    client: newClient(),
    db: { command: jest.fn((...args) => state.ping(...args)) },
    getClient() { return this.client; },
    close: jest.fn(async (force) => {
      events.push(`connection.close(${JSON.stringify(force)})`);
      if (connectionCloseError) throw connectionCloseError;
      connection.readyState = 0;
    }),
    __events: events,
    __clients: clients,
    __setPing: (next) => { state.ping = next; },
  };

  return {
    connection,
    connect: jest.fn(async () => {
      events.push("mongoose.connect");
      connection.client = newClient();
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => {
      events.push("mongoose.disconnect");
      connection.readyState = 0;
    }),
  };
}

async function loadDb(mongooseMock) {
  delete globalThis.__mongoOperationAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  return import("../../worker/lib/db.js");
}

const env = { MONGO_URI: "mongodb://fake/test", MONGO_PING_TIMEOUT_MS: "300" };

/** 웜 커넥션을 세운 뒤 그 소켓을 죽인다(readyState 는 1 그대로) — 재수립을 강제하는 상태. */
async function establishThenKillSocket(connectDb, mongooseMock) {
  await connectDb(env);
  expect(mongooseMock.connection.readyState).toBe(1);
  mongooseMock.connection.__setPing(PING_HANGS);
}

test("mongoose is detached with skipCloseClient so the critical path pays no client I/O", async () => {
  const mongooseMock = buildMongooseMock();
  const { connectDb, __dbTestUtils } = await loadDb(mongooseMock);
  await establishThenKillSocket(connectDb, mongooseMock);

  await connectDb(env);

  // 🔴 값으로 고정한다. mongoose 업그레이드가 이 옵션을 떨구면 doClose 가 그 객체를 그대로
  //    client.close(force) 로 넘겨 임계 경로가 다시 232~1316ms 를 낸다 — 조용히 느려진다.
  expect(mongooseMock.connection.close).toHaveBeenCalledWith({ skipCloseClient: true });

  await __dbTestUtils.awaitStaleClientCloseForTest();
});

test("re-establishment starts before the stale client finishes closing", async () => {
  const mongooseMock = buildMongooseMock();
  const { connectDb, __dbTestUtils } = await loadDb(mongooseMock);
  await establishThenKillSocket(connectDb, mongooseMock);
  const staleId = mongooseMock.connection.getClient().id;

  const startedAt = Date.now();
  await connectDb(env);
  const criticalPathMs = Date.now() - startedAt;

  const events = mongooseMock.connection.__events;
  const detachAt = events.indexOf('connection.close({"skipCloseClient":true})');
  const staleCloseStartAt = events.indexOf(`client${staleId}.close:start`);
  const staleCloseEndAt = events.indexOf(`client${staleId}.close:end`);
  const reconnectAt = events.lastIndexOf("mongoose.connect");

  // 🔴 경계 좁히기: **떼어 낸 뒤에** 끊는다. 종전 mongoose.disconnect() 는 mongoose 가 아직 그
  //    클라이언트를 가리키는 채로 closeCheckedOutConnections() 를 불러 살아 있는 op 을 함께 죽였다.
  expect(detachAt).toBeGreaterThanOrEqual(0);
  expect(staleCloseStartAt).toBeGreaterThan(detachAt);

  // 🔴 핵심: 재수립이 옛 클라이언트의 close 완료를 기다리지 않는다.
  expect(reconnectAt).toBeGreaterThan(detachAt);
  expect(staleCloseEndAt).toBe(-1);

  // ping 예산 300ms 는 여전히 임계 경로 위에 있고, teardown 500ms 는 아니다.
  expect(criticalPathMs).toBeLessThan(300 + STALE_CLOSE_DELAY_MS);

  await __dbTestUtils.awaitStaleClientCloseForTest();
  expect(mongooseMock.connection.__events).toContain(`client${staleId}.close:end`);
});

test("the stale client is still closed — a dropped client leaks its poll monitor", async () => {
  const mongooseMock = buildMongooseMock();
  const { connectDb, __dbTestUtils } = await loadDb(mongooseMock);
  await establishThenKillSocket(connectDb, mongooseMock);
  const staleClient = mongooseMock.connection.getClient();

  await connectDb(env);
  await __dbTestUtils.awaitStaleClientCloseForTest();

  expect(staleClient.close).toHaveBeenCalledTimes(1);
  // 새로 세운 클라이언트는 닫지 않는다 — 닫으면 이 요청의 쿼리가 그 위에서 죽는다.
  expect(mongooseMock.connection.getClient()).not.toBe(staleClient);
  expect(mongooseMock.connection.getClient().close).not.toHaveBeenCalled();
});

test("a failed detach falls back to the full teardown instead of handing back a dead connection", async () => {
  const mongooseMock = buildMongooseMock({ connectionCloseError: new Error("detach_unavailable") });
  const { connectDb } = await loadDb(mongooseMock);
  await establishThenKillSocket(connectDb, mongooseMock);

  const connection = await connectDb(env);

  // 🔴 조용히 넘어가면 readyState 1 짜리 죽은 커넥션이 그대로 돌아간다(2026-08-16 실측: 쿼리 7.8초).
  expect(mongooseMock.disconnect).toHaveBeenCalled();
  expect(mongooseMock.connect.mock.calls.length).toBeGreaterThan(1);
  expect(connection.readyState).toBe(1);
});
