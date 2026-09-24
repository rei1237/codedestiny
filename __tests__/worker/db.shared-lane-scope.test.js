/**
 * @jest-environment node
 *
 * 공유 레인 모델은 요청 스코프의 연결로 간다(설계안 C3, 2026-09-25).
 *
 * 프로덕션 결과 화면 18요청이 공유 레인에서 멈췄고, 멈춘 find 는 옆 요청이 연 소켓 위에 있었다(2026-09-24
 * 8단계). 모델은 모듈 로드 때 전역 연결에 묶이므로 export 를 scopedModel 로 감싼다. 여기서 고정하는 계약:
 *   1. 스코프 밖은 기반 모델 그대로다(테스트의 목·스파이가 그대로 보인다).
 *   2. 스코프 안에서 연결이 걸리면 그 연결에 묶인 하위 모델로 가고, 문서는 기반 모델의 instanceof 다.
 *   3. 연결 전·스코프 끝난 뒤의 접근은 기반 모델로 폴백하고 [db-scope-miss]·[db-scope-late] 를 한 번 남긴다.
 *   4. 스코프가 만든 하위 모델은 releaseScopeModels 가 기반 모델의 subclassed 배열에서 빼낸다(누수 방지).
 */

import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { runInDbScope, currentDbScope } from "../../worker/lib/db-scope.js";
import {
  bindScopeConnection,
  releaseScopeModels,
  scopeConnection,
  scopedModel,
  unscopedModel,
} from "../../worker/lib/db-scope-connection.js";

const Base = mongoose.models.C3ScopeProbe
  || mongoose.model("C3ScopeProbe", new mongoose.Schema({ name: String }));
const Probe = scopedModel(Base);
const subclassed = () => Base[Object.getOwnPropertySymbols(Base).find((s) => s.description === "mongoose#Model#subclassed")] || [];

let logs = [];

beforeEach(() => {
  logs = [];
  jest.spyOn(console, "log").mockImplementation((...args) => { logs.push(args.map(String).join(" ")); });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const parse = (tag) => logs.filter((l) => l.startsWith(`${tag} `)).map((l) => JSON.parse(l.slice(l.indexOf("{"))));

test("스코프 밖에서는 기반 모델 그대로이고 로그를 남기지 않는다", () => {
  const spy = jest.spyOn(Base, "findOne");
  expect(Probe.findOne).toBe(spy);
  expect(Probe.db).toBe(mongoose.connection);
  expect(new Probe({ name: "a" })).toBeInstanceOf(Base);
  expect(unscopedModel(Probe)).toBe(Base);
  expect(scopeConnection()).toBeNull();
  expect(logs).toEqual([]);
});

test("스코프 안에서 연결이 걸리면 그 연결의 하위 모델로 가고, 스코프 끝에 subclassed 배열에서 빠진다", async () => {
  const conn = mongoose.createConnection();
  const before = subclassed().length;
  const seen = await runInDbScope("fetch", () => {
    const scope = currentDbScope();
    bindScopeConnection(scope, conn);
    const doc = new Probe({ name: "a" });
    return {
      scope,
      db: Probe.db,
      collectionConn: Probe.collection.conn,
      docDb: doc.$model().db,
      isBase: doc instanceof Base,
      sameFind: Probe.findOne === Probe.findOne,
      conn: scopeConnection(),
    };
  });

  expect(seen.db).toBe(conn);
  expect(seen.collectionConn).toBe(conn);
  expect(seen.docDb).toBe(conn);
  expect(seen.isBase).toBe(true);
  expect(seen.sameFind).toBe(true);
  expect(seen.conn).toBe(conn);
  expect(Base.db).toBe(mongoose.connection);
  expect(subclassed().length).toBe(before + 1);

  expect(releaseScopeModels(seen.scope)).toBe(1);
  expect(subclassed().length).toBe(before);
  expect(parse("[db-scope-miss]")).toEqual([]);
});

test("연결 전 접근은 기반 모델로 폴백하고 모델마다 [db-scope-miss] 를 한 번 남긴다; 끝난 스코프는 [db-scope-late]", async () => {
  let scope;
  await runInDbScope("queue", () => {
    scope = currentDbScope();
    expect(Probe.modelName).toBe("C3ScopeProbe");
    expect(Probe.db).toBe(mongoose.connection);
    expect(Probe.findOne).toBe(Base.findOne);
    expect(scopeConnection()).toBeNull();
  });
  expect(parse("[db-scope-miss]")).toEqual([
    { scope: scope.id, lane: "shared", model: "C3ScopeProbe", prop: "db" },
    { scope: scope.id, lane: "shared", what: "connection" },
  ]);

  scope.ended = true;
  const conn = mongoose.createConnection();
  bindScopeConnection(scope, conn);
  // 끝난 스코프의 컨텍스트에서 늦게 도는 콜백을 흉내 낸다.
  await runInDbScope("queue", () => {
    const late = currentDbScope();
    late.ended = true;
    bindScopeConnection(late, conn);
    expect(Probe.db).toBe(mongoose.connection);
    expect(Probe.db).toBe(mongoose.connection);
    expect(parse("[db-scope-late]")).toEqual([{ scope: late.id, lane: "shared", model: "C3ScopeProbe", prop: "db" }]);
  });
});

// ── connectDb 쪽 계약(목 mongoose) ─────────────────────────────────────────────
//   5. 연속한 두 요청은 각자 연결을 세우고(autoCreate:false), 요청이 끝나면 destroy 한다. 전역 connect 는 타지 않는다.
//   6. 한 요청 안의 순차·동시 connectDb 는 연결 하나를 공유하고, 그 연결이 scopeConnection 으로 묶인다.
//   7. 연결 레벨 실패는 그 요청의 연결만 은퇴시키고 재시도는 새 연결로 간다. 은퇴한 연결은 스코프 끝에 닫힌다.
//   8. 스코프 밖은 예전 전역 연결 그대로이고 [db-scope-miss] 를 남긴다.

const ENV = { MONGO_URI: "mongodb://127.0.0.1:27017/test", MONGO_WORKER_RETRY_DELAY_MS: "0" };

function makeSharedConnection() {
  const conn = {
    readyState: 0,
    getClient: () => ({ on: jest.fn() }),
    asPromise: async () => {
      conn.readyState = 1;
      return conn;
    },
    destroy: jest.fn(async () => { conn.readyState = 0; }),
  };
  return conn;
}

async function loadSharedLane() {
  const created = [];
  const global = { readyState: 0, getClient: () => ({ on: jest.fn() }), db: { command: jest.fn(async () => ({ ok: 1 })) } };
  const mongooseMock = {
    connection: global,
    connect: jest.fn(async () => { global.readyState = 1; return global; }),
    disconnect: jest.fn(async () => { global.readyState = 0; }),
    createConnection: jest.fn(() => {
      const conn = makeSharedConnection();
      created.push(conn);
      return conn;
    }),
  };
  delete globalThis.__mongoOperationAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const db = await import("../../worker/lib/db.js");
  const scope = await import("../../worker/lib/db-scope.js");
  const binding = await import("../../worker/lib/db-scope-connection.js");
  return { ...db, ...scope, ...binding, created, mongooseMock };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test("연속한 두 요청은 각자 공유 레인 연결을 세우고, 요청이 끝나면 destroy 한다", async () => {
  const { withDbScopes, connectDb, created, mongooseMock } = await loadSharedLane();
  const entry = withDbScopes({ fetch: () => connectDb(ENV) });

  const first = await entry.fetch();
  await flush();
  const second = await entry.fetch();
  await flush();

  expect(created).toEqual([first, second]);
  expect(mongooseMock.connect).not.toHaveBeenCalled();
  expect(mongooseMock.createConnection.mock.calls[0][1]).toMatchObject({ autoCreate: false, bufferCommands: false, monitorCommands: true });
  expect(first.destroy).toHaveBeenCalledTimes(1);
  expect(second.destroy).toHaveBeenCalledTimes(1);
  expect(parse("[db-scope-close]").map(({ lane, why }) => ({ lane, why }))).toEqual([
    { lane: "shared", why: "end" },
    { lane: "shared", why: "end" },
  ]);
  expect(parse("[db-scope-miss]")).toEqual([]);
});

test("한 요청 안의 순차·동시 connectDb 는 연결 하나를 공유하고, 그 연결이 scopeConnection 으로 묶인다", async () => {
  const { withDbScopes, connectDb, scopeConnection, created } = await loadSharedLane();
  const entry = withDbScopes({
    fetch: async () => {
      const [a, b] = await Promise.all([connectDb(ENV), connectDb(ENV)]);
      const c = await connectDb(ENV);
      return { a, b, c, bound: scopeConnection() };
    },
  });

  const { a, b, c, bound } = await entry.fetch();

  expect(created).toHaveLength(1);
  expect(b).toBe(a);
  expect(c).toBe(a);
  expect(bound).toBe(a);
});

test("연결 레벨 실패는 그 요청의 연결만 은퇴시키고 재시도는 새 연결로 간다; 은퇴한 연결은 스코프 끝에 닫힌다", async () => {
  const { withDbScopes, withMongoRetry, created, mongooseMock } = await loadSharedLane();
  let calls = 0;
  const entry = withDbScopes({
    fetch: () => withMongoRetry(ENV, async () => {
      calls += 1;
      if (calls === 1) {
        const error = new Error("connection reset");
        error.name = "MongoNetworkError";
        throw error;
      }
      return "ok";
    }, { maxRetries: 1, baseDelayMS: 0 }),
  });

  await expect(entry.fetch()).resolves.toBe("ok");
  await flush();

  expect(created).toHaveLength(2);
  expect(mongooseMock.disconnect).not.toHaveBeenCalled();
  expect(created[0].destroy).toHaveBeenCalledTimes(1);
  expect(created[1].destroy).toHaveBeenCalledTimes(1);
  expect(parse("[db-scope-close]").map(({ why }) => why).sort()).toEqual(["end", "reset"]);
});

test("스코프 밖 connectDb 는 예전 전역 연결 그대로이고 [db-scope-miss] 를 남긴다", async () => {
  const { connectDb, created, mongooseMock } = await loadSharedLane();

  const conn = await connectDb(ENV);

  expect(conn).toBe(mongooseMock.connection);
  expect(mongooseMock.connect).toHaveBeenCalledTimes(1);
  expect(created).toEqual([]);
  expect(parse("[db-scope-miss]")).toEqual([{ lane: "shared" }]);
});
