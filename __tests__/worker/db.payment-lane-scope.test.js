/**
 * @jest-environment node
 *
 * 결제 레인 연결은 요청 스코프마다 따로 열고, 그 요청이 끝나면 닫는다(설계안 C4, 2026-09-24).
 *
 * Workers 에서는 다른 요청이 연 소켓이 답하지 않는다(스테이징 0/115). 아이솔레이트 전역 레인을
 * readyState 만 보고 재사용하던 때에는 연속 결제 요청이 8초 정지 → 재시도가 됐다(프로덕션 결제 레인 요청
 * 8건 중 4건, 1건은 16.1초 503). 여기서 고정하는 계약:
 *   1. 다음 요청은 앞 요청의 연결을 받지 않는다.
 *   2. 한 요청 안에서는 레인 하나를 공유한다(요청당 핸드셰이크 1회).
 *   3. 닫기는 핸들러와 그 요청의 waitUntil 작업이 모두 끝난 뒤이고, 원래 ctx.waitUntil 이 닫기를 붙잡는다.
 *   4. 스코프 밖은 예전 전역 재사용 그대로이고 [db-scope-miss] 로 드러난다.
 *   5. 한 요청의 reset 은 다른 요청의 레인을 건드리지 않는다.
 */

import { jest } from "@jest/globals";

const ENV = { MONGO_URI: "mongodb://127.0.0.1:27017/test" };

let logs = [];

beforeEach(() => {
  logs = [];
  jest.spyOn(console, "log").mockImplementation((...args) => { logs.push(args.map(String).join(" ")); });
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function makeLaneConnection() {
  const conn = {
    readyState: 0,
    db: { collection: jest.fn(() => ({})) },
    getClient: () => ({ on: jest.fn() }),
    asPromise: async () => {
      conn.readyState = 1;
      return conn;
    },
    close: jest.fn(async () => { conn.readyState = 0; }),
    destroy: jest.fn(async () => { conn.readyState = 0; }),
  };
  return conn;
}

async function loadLane() {
  const created = [];
  const mongooseMock = {
    connection: { readyState: 0 },
    createConnection: jest.fn(() => {
      const conn = makeLaneConnection();
      created.push(conn);
      return conn;
    }),
  };
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  // db.js 와 같은 레지스트리에서 불러와야 같은 AsyncLocalStorage 를 본다.
  const db = await import("../../worker/lib/db.js");
  const scope = await import("../../worker/lib/db-scope.js");
  return { ...db, ...scope, created, createConnection: mongooseMock.createConnection };
}

// 스코프 끝의 닫기는 핸들러 settle 뒤 마이크로태스크 몇 단계를 거쳐 돈다.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const parse = (tag) => logs.filter((l) => l.startsWith(`${tag} `)).map((l) => JSON.parse(l.slice(l.indexOf("{"))));

test("연속한 두 요청은 각자 레인을 세우고, 뒤 요청은 앞 요청이 연 연결을 받지 않는다", async () => {
  const { withDbScopes, connectPaymentDb, createConnection } = await loadLane();
  const entry = withDbScopes({ fetch: () => connectPaymentDb(ENV) });

  const first = await entry.fetch();
  await flush();
  const second = await entry.fetch();
  await flush();

  expect(createConnection).toHaveBeenCalledTimes(2);
  expect(second).not.toBe(first);
  expect(first.destroy).toHaveBeenCalledTimes(1);
  expect(second.destroy).toHaveBeenCalledTimes(1);
  expect(first.close).not.toHaveBeenCalled();
  expect(parse("[db-scope-miss]")).toEqual([]);
});

test("한 요청 안의 순차·동시 호출은 레인 하나를 공유한다", async () => {
  const { withDbScopes, connectPaymentDb, createConnection } = await loadLane();
  const entry = withDbScopes({
    fetch: async () => {
      const [a, b] = await Promise.all([connectPaymentDb(ENV), connectPaymentDb(ENV)]);
      const c = await connectPaymentDb(ENV);
      return [a, b, c];
    },
  });

  const [a, b, c] = await entry.fetch();

  expect(createConnection).toHaveBeenCalledTimes(1);
  expect(b).toBe(a);
  expect(c).toBe(a);
});

test("레인은 핸들러와 그 요청의 waitUntil 작업이 모두 끝난 뒤에 닫히고, 원래 ctx.waitUntil 이 닫기를 붙잡는다", async () => {
  const { withDbScopes, connectPaymentDb, currentDbScopeId, createConnection } = await loadLane();
  const waited = [];
  const ctx = { waitUntil: jest.fn((promise) => { waited.push(promise); }) };
  let releaseTail;
  const tailGate = new Promise((resolve) => { releaseTail = resolve; });
  let inTail = null;
  let scopeId = null;
  // scheduled 의 결제 정산과 같은 모양: 핸들러는 먼저 반환하고, DB 작업은 waitUntil 안에서 이어진다.
  const entry = withDbScopes({
    scheduled: async (event, env, c) => {
      const conn = await connectPaymentDb(ENV);
      scopeId = currentDbScopeId();
      c.waitUntil((async () => {
        await tailGate;
        inTail = await connectPaymentDb(ENV);
      })());
      return conn;
    },
  });

  const first = await entry.scheduled({}, ENV, ctx);
  await flush();
  expect(first.destroy).not.toHaveBeenCalled();

  releaseTail();
  await Promise.all(waited);

  expect(inTail).toBe(first);
  expect(createConnection).toHaveBeenCalledTimes(1);
  expect(first.destroy).toHaveBeenCalledTimes(1);
  // 요청이 넘긴 작업 1건 + 닫기를 붙잡는 1건.
  expect(ctx.waitUntil).toHaveBeenCalledTimes(2);
  expect(parse("[db-scope-close]")).toEqual([{ scope: scopeId, lane: "payment", why: "end", closeMs: expect.any(Number) }]);
  expect(parse("[db-scope-late]")).toEqual([]);
});

test("스코프 밖 호출은 전역 레인을 재사용하고 [db-scope-miss] 를 남긴다", async () => {
  const { connectPaymentDb, createConnection } = await loadLane();

  const a = await connectPaymentDb(ENV);
  const b = await connectPaymentDb(ENV);

  expect(createConnection).toHaveBeenCalledTimes(1);
  expect(b).toBe(a);
  expect(a.destroy).not.toHaveBeenCalled();
  expect(parse("[db-scope-miss]")).toEqual([{ lane: "payment" }, { lane: "payment" }]);
});

test("한 요청의 resetPaymentConnection 은 자기 레인만 버리고, 동시에 도는 다른 요청의 레인은 건드리지 않는다", async () => {
  const { withDbScopes, connectPaymentDb, resetPaymentConnection, created } = await loadLane();
  let releaseB;
  const gateB = new Promise((resolve) => { releaseB = resolve; });
  const entry = withDbScopes({
    fetch: async (who) => {
      const conn = await connectPaymentDb(ENV);
      if (who === "b") {
        await gateB;
        return { conn };
      }
      await resetPaymentConnection();
      const again = await connectPaymentDb(ENV);
      return { conn, again };
    },
  });

  const pendingB = entry.fetch("b");
  const a = await entry.fetch("a");
  await flush();
  const bConn = created[0];

  expect(a.conn).not.toBe(bConn);
  expect(a.again).not.toBe(a.conn);
  expect(a.conn.destroy).toHaveBeenCalledTimes(1);
  expect(a.again.destroy).toHaveBeenCalledTimes(1);
  expect(bConn.destroy).not.toHaveBeenCalled();
  expect(parse("[db-scope-close]").map(({ why }) => why)).toEqual(["reset", "end"]);

  releaseB();
  const b = await pendingB;
  await flush();
  expect(b.conn).toBe(bConn);
  expect(bConn.destroy).toHaveBeenCalledTimes(1);
});
