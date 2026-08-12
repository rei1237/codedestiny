/**
 * @jest-environment node
 *
 * 결제 전용 커넥션 레인 — 컬렉션 해석과 폴백 계약.
 *
 * "PG 결제창이 아예 안 뜬다"(2026-08-12)의 원인은 부팅 요청 폭풍이 공유 풀(5소켓)을 선점해
 * checkout 이 커넥션 체크아웃에서 굶는 것이었다(실브라우저 재현: DB_BUSY 503). 결제 컨텍스트는
 * 전용 커넥션의 컬렉션을 쓰되, 레인 수립 실패 시 공유 커넥션으로 폴백해 가용성이 종전보다
 * 나빠지는 경로가 없어야 한다 — 그 두 계약을 여기서 고정한다.
 */
import { jest } from "@jest/globals";
import { __paymentDbTestUtils } from "../../worker/payments/db.js";

const { resolveCollection, makeCountingDb, PAYMENT_DB_OPTIONS } = __paymentDbTestUtils;

/* 공유 커넥션과 레인 커넥션을 **구분해서** 관측할 수 있는 mongoose 목.
   connect = 공유(connectDb), createConnection = 레인(connectPaymentDb). */
function makeMongooseMock({ laneFails = false } = {}) {
  const connection = {
    readyState: 0,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
    getClient: () => ({ on: jest.fn() }),
  };
  const laneConn = {
    readyState: 1,
    db: { collection: (name) => ({ __lane: true, name }) },
    close: jest.fn(async () => { laneConn.readyState = 0; }),
  };
  return {
    connection,
    laneConn,
    connect: jest.fn(async () => {
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => { connection.readyState = 0; }),
    createConnection: jest.fn(() => ({
      asPromise: async () => {
        if (laneFails) throw new Error("lane refused");
        return laneConn;
      },
    })),
  };
}

async function loadWithMockedMongoose(mongooseMock) {
  delete globalThis.__mongoOperationAdmission;
  delete globalThis.__mongoPaymentAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const dbLib = await import("../../worker/lib/db.js");
  const paymentDb = await import("../../worker/payments/db.js");
  return { ...dbLib, ...paymentDb };
}

const ENV = { MONGO_URI: "mongodb://fake/test" };

function fakeModel(name) {
  return { collection: { collectionName: name, findOne: () => "shared" } };
}

function fakePaymentConn(ready = 1) {
  const handed = [];
  return {
    readyState: ready,
    db: { collection: (name) => ({ __lane: true, name, findOne: () => { handed.push(name); return "lane"; } }) },
    handed,
  };
}

test("레인이 준비되면(readyState 1) 전용 커넥션의 컬렉션을 쓴다", () => {
  const conn = fakePaymentConn(1);
  const col = resolveCollection(fakeModel("payments"), conn);
  expect(col.__lane).toBe(true);
  expect(col.name).toBe("payments");
});

test("레인이 없거나 미수립이면 공유 커넥션(Model.collection)으로 폴백한다", () => {
  const model = fakeModel("payments");
  expect(resolveCollection(model, null)).toBe(model.collection);
  expect(resolveCollection(model, fakePaymentConn(0))).toBe(model.collection); // 연결 중/실패
});

test("레인 db.collection 이 던져도 공유 커넥션으로 폴백한다 — 레인은 가용성 조건이 아니다", () => {
  const model = fakeModel("payments");
  const broken = { readyState: 1, db: { collection: () => { throw new Error("lane broken"); } } };
  expect(resolveCollection(model, broken)).toBe(model.collection);
});

test("makeCountingDb 는 레인 커넥션으로 연산을 실행하고 왕복을 센다", async () => {
  const conn = fakePaymentConn(1);
  const ctx = { mongoOps: 0 };
  const db = makeCountingDb(ctx, conn);
  const result = await db.findOne(fakeModel("payments"), { a: 1 });
  expect(result).toBe("lane");
  expect(conn.handed).toEqual(["payments"]);
  expect(ctx.mongoOps).toBe(1);
});

/* ── admission 레인 분리 ────────────────────────────────────────────────
   소켓 레인(위 테스트들)만으로는 절반이다. 게이트를 공유하면 부팅 폭풍이 공유 한도를 채우는
   순간 결제가 소켓을 기다려 보지도 못하고 admission 에서 하드 503 이 된다. */

test("PAYMENT_DB_OPTIONS 가 레인 분리 3종을 모두 선언한다", () => {
  // 하나라도 빠지면 조용히 공유 레인으로 되돌아간다 — 증상이 부하 상황에서만 나타나 놓치기 쉽다.
  expect(PAYMENT_DB_OPTIONS.admissionLane).toBe("payment");
  expect(PAYMENT_DB_OPTIONS.skipSharedConnect).toBe(true);
  expect(PAYMENT_DB_OPTIONS.retryAdmissionOnOverload).toBe(true);
});

test("공유 admission 레인이 포화돼도 결제는 즉시 슬롯을 얻는다 — 회귀 재현 가드", async () => {
  const mongooseMock = makeMongooseMock();
  const { withMongoRetry, withPaymentDb } = await loadWithMockedMongoose(mongooseMock);

  // 공유 한도를 3으로 낮추고 3개를 모두 붙잡아 둔다(= 부팅 폭풍이 게이트를 채운 상태).
  const env = { ...ENV, MONGO_MAX_IN_FLIGHT_OPS: "3" };
  const holders = [];
  const held = [];
  for (let i = 0; i < 3; i += 1) {
    held.push(withMongoRetry(env, () => new Promise((r) => { holders.push(r); }), { retries: 0 }));
  }
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(holders).toHaveLength(3);
  expect(globalThis.__mongoOperationAdmission.active).toBe(3);

  // 결제는 별도 카운터를 쓰므로 대기 없이 통과해야 한다. 예전(공유 게이트)이라면 여기서
  // admissionTimeoutMS 만큼 굶다가 MongoOperationOverloadedError → DB_BUSY 503 이 됐다.
  const ctx = { mongoOps: 0, inDb: false };
  await expect(
    withPaymentDb(env, ctx, async () => "paid"),
  ).resolves.toBe("paid");

  expect(globalThis.__mongoPaymentAdmission.active).toBe(0); // 슬롯 반납까지 확인
  expect(globalThis.__mongoOperationAdmission.active).toBe(3); // 공유 카운터는 건드리지 않았다

  holders.forEach((resolve) => resolve({ ok: true }));
  await Promise.all(held);
});

test("레인이 서면 공유 커넥션을 세우지 않고, 레인이 죽으면 폴백으로 세운다", async () => {
  const healthy = makeMongooseMock();
  const lane = await loadWithMockedMongoose(healthy);
  await expect(lane.withPaymentDb(ENV, { mongoOps: 0, inDb: false }, async () => "ok")).resolves.toBe("ok");
  expect(healthy.createConnection).toHaveBeenCalledTimes(1);
  // skipSharedConnect 가 빠지면 여기가 1 이 된다 — 레인을 나눠 놓고도 매 시도 공유 커넥션을 건드리는 상태.
  expect(healthy.connect).not.toHaveBeenCalled();

  // 레인 수립 실패는 결제를 막지 않는다: 공유 커넥션을 직접 세우고 Model.collection 으로 폴백한다.
  const broken = makeMongooseMock({ laneFails: true });
  const fallback = await loadWithMockedMongoose(broken);
  await expect(fallback.withPaymentDb(ENV, { mongoOps: 0, inDb: false }, async () => "ok")).resolves.toBe("ok");
  expect(broken.connect).toHaveBeenCalled();
});
