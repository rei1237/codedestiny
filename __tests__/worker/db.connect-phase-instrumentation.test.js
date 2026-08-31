/**
 * @jest-environment node
 *
 * connectDb 의 **단계 분해 계측**을 고정한다.
 *
 * 왜 이 계측이 있어야 하는가(2026-08-31 인수인계 잔여 두 축):
 *   · 핸드셰이크 410~450ms — 한 덩어리(elapsedMs)로는 "왕복 수로만 설명되는가(코드로 줄일 것 없음)"
 *     와 "SRV 조회가 큰 덩어리인가(시드리스트 URI 로 제거 가능)"를 못 가른다. dnsMs·helloRttMs·
 *     socketReadyMs 가 그 판정을 준다.
 *   · 선행 구간 잔량 ≈235ms — 핸드오프는 "라우트 진입 오버헤드"로 적었지만, 임계 경로 위의
 *     resetMongooseConnection() 일 수 있다(535ms − ping 300ms − 엣지 캐시 1~3ms ≈ 230ms).
 *     resetMs 가 그 산술을 확정하거나 기각한다.
 *   · ping 왕복 단독 수치 — clampTimeoutMs 하한(300) 인하 기각의 **유일한** 재개 조건이다.
 *     요청 전체 353~380ms 안에 묻혀 있어 분리되지 않던 값이 pingMs 다.
 *
 * 🔴 이 파일이 지키는 것은 "값이 맞는가"가 아니라 **싱크가 끊기지 않았는가**다. 계측이 조용히
 * 빠지면 위 세 판단이 전부 다시 근거를 잃는다.
 */

import { EventEmitter } from "node:events";

import { jest } from "@jest/globals";

const PING_HANGS = () => new Promise(() => { /* 좀비 소켓: 영원히 pending */ });

/* worker/lib/db.js 의 MONGO_PING_TIMEOUT_MS 기본값이자 clampTimeoutMs 하한이다. 값을 바꾸면
   db.vars-code-default-parity 가 코드/[vars] 짝을 따로 잡는다. */
const PING_BUDGET_MS = 300;

function buildMongooseMock({ pingBehavior, emitPhases = false } = {}) {
  const state = { ping: pingBehavior };
  const client = new EventEmitter();
  const connection = {
    readyState: 0,
    db: { command: jest.fn((...args) => state.ping(...args)) },
    getClient: () => client,
    __client: client,
    __setPing: (next) => { state.ping = next; },
  };
  const mock = {
    connection,
    connect: jest.fn(async () => {
      if (emitPhases) {
        // 🔴 반드시 비동기로 낸다. 실제 mongoose 도 MongoClient 를 동기적으로 만든 뒤 SRV DNS 를
        // 비동기로 풀고, connectDb 는 그 사이(connect() 직후 동기 지점)에 리스너를 건다.
        // 여기서 동기로 emit 하면 리스너가 붙기 전이라 "계측이 죽어도 통과"하는 위양성이 된다.
        await Promise.resolve();
        client.emit("serverOpening", { address: "node-a:27017" });
        client.emit("serverOpening", { address: "node-b:27017" });
        client.emit("serverHeartbeatSucceeded", { duration: 42 });
        client.emit("connectionCreated", { address: "node-a:27017", connectionId: 1 });
        client.emit("connectionReady", { address: "node-a:27017", connectionId: 1 });
      }
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => {
      connection.readyState = 0;
    }),
  };
  return mock;
}

async function loadDb(mongooseMock) {
  delete globalThis.__mongoOperationAdmission;
  delete globalThis.__mongoPaymentAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  return import("../../worker/lib/db.js");
}

const env = { MONGO_URI: "mongodb://fake/test" };

test("콜드 수립은 핸드셰이크를 dns·hello 왕복·소켓 준비로 쪼개 싱크에 남긴다", async () => {
  const mongooseMock = buildMongooseMock({ pingBehavior: async () => ({ ok: 1 }), emitPhases: true });
  const { connectDb } = await loadDb(mongooseMock);

  const timings = {};
  await connectDb(env, { timings });

  expect(timings.handshakeMs).toBeGreaterThanOrEqual(0);
  // 리스너가 connect() 직후 동기적으로 걸렸다는 증거 — 하나라도 -1 이면 계측이 한 틱 늦은 것이다.
  expect(timings.dnsMs).toBeGreaterThanOrEqual(0);
  expect(timings.hosts).toBe(2);
  expect(timings.helloRttMs).toBe(42);
  expect(timings.socketReadyMs).toBeGreaterThanOrEqual(0);
});

test("살아 있는 웜 소켓은 ping 왕복 단독 수치를 남긴다(하한 인하 재개의 선행 조건)", async () => {
  const mongooseMock = buildMongooseMock({ pingBehavior: async () => ({ ok: 1 }) });
  const { connectDb } = await loadDb(mongooseMock);

  await connectDb(env);
  expect(mongooseMock.connection.readyState).toBe(1);

  const timings = {};
  await connectDb(env, { timings });

  expect(timings.pingMs).toBeGreaterThanOrEqual(0);
  // 재사용이므로 재수립도 teardown 도 없다.
  expect(timings.resetMs).toBeUndefined();
  expect(timings.handshakeMs).toBeUndefined();
});

test("죽은 웜 소켓은 ping 소진분과 teardown 실비용을 따로 남긴다", async () => {
  const mongooseMock = buildMongooseMock({ pingBehavior: async () => ({ ok: 1 }) });
  const { connectDb } = await loadDb(mongooseMock);

  await connectDb(env);
  mongooseMock.connection.__setPing(PING_HANGS);

  /* 🔴 예산 소진은 **페이크 타이머로** 몬다. 실시계로 재면 안 된다 — withTimeout 은
     setTimeout(300) 인데 pingMs 는 Date.now() 차이라, 리눅스 libuv 가 그 타이머를
     Date.now() 기준 299ms 에 불러 주면 `>= 300` 이 그냥 깨진다. 실제로 무관한 문서 PR 의
     CI(run 33364366798)가 `Received: 299` 로 떨어졌고, 재실행만으로 통과했다.
     윈도우 200회 실측은 조기 발화 0건이라 로컬에서는 재현되지 않는다.
     시계를 직접 몰면 소진분이 예산과 정확히 같아져 오차가 사라진다. */
  jest.useFakeTimers();
  try {
    const timings = {};
    const pending = connectDb(env, { timings });
    await jest.advanceTimersByTimeAsync(PING_BUDGET_MS);
    await pending;

    // ping 예산(하한 300)을 통째로 소진한 뒤에야 죽었다고 판정한다.
    expect(timings.pingMs).toBe(PING_BUDGET_MS);
    // 🔴 teardown 이 임계 경로 위에 있다는 사실 자체를 값으로 고정한다. 이 키가 사라지면
    // "선행 구간 잔량이 라우트 진입인가 teardown 인가"를 다시 못 가른다.
    expect(timings.resetMs).toBeGreaterThanOrEqual(0);
    expect(mongooseMock.disconnect).toHaveBeenCalled();
    expect(timings.handshakeMs).toBeGreaterThanOrEqual(0);
  } finally {
    jest.useRealTimers();
  }
}, 15000);
