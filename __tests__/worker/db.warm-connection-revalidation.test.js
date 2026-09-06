/**
 * @jest-environment node
 *
 * 웜 Mongo 커넥션은 **검증 없이 재사용되지 않는다**.
 *
 * 2026-08-16 프로덕션 실측이 이 파일이 고정하는 성질의 근거다. Mongo 읽기 **한 건**짜리 라우트
 * (GET /api/payments/orders/:id)를 간격을 바꿔 7회 부르고 Server-Timing 을 읽었더니:
 *
 *   gap=    0ms  cdconn=0     cdop=7843
 *   gap=  300ms  cdconn=1416  cdop=2218
 *   gap= 1000ms  cdconn=1302  cdop=2212
 *   gap=10000ms  cdconn=0     cdop=7852
 *   gap=30000ms  cdconn=0     cdop=7833
 *
 * cdconn=0 인 행이 "최근에 확인했으니 ping 을 건너뛴다"(구 MONGO_PING_MIN_INTERVAL_MS=50000)로
 * 곧장 재사용한 요청이고, 그 대가를 **쿼리가 7.8초**로 냈다. 300ms 뒤 요청조차 죽은 소켓을
 * 밟았으므로 원인은 Atlas 유휴 리핑이 아니라 요청 컨텍스트가 끝나면 소켓이 못 쓰게 되는
 * Cloudflare 의 성질이고, maxIdleTimeMS 로는 막을 수 없다. 반대로 **그 요청 안에서 새로 세운**
 * 커넥션은 cdconn≈1280 + cdop≈137 = 1.4초로 일관되게 빨랐다.
 *
 * 그래서 고정하는 것 두 가지:
 *   ① 웜 커넥션은 매 요청 ping 으로 검증한다(건너뛰기 창은 0).
 *   ② 검증에 **실패한** 커넥션을 그대로 돌려주지 않는다 — 떼어 내고 새로 세운다. 이웃 op 이
 *      ping 도중에 들어와 있어도 마찬가지다(2026-09-06).
 *   ③ 이웃이 **먼저** 있으면 ping 을 보내지 않는다 — 이것이 2026-08-08 재연결 폭풍 사고의 가드가
 *      옮겨 간 자리다. 먼저 돌던 op(크론 태스크 포함)은 ping 도 detach 도 겪지 않는다.
 *
 * ②에 "단 동시 요청이 있으면 끊지 않는다" 절이 있었다. ③이 생긴 뒤 그 절이 잡는 경우는 "내 ping 이
 * 도는 300ms 사이에 이웃이 들어왔다"뿐인데, 그 이웃은 ③ 으로 ping 없이 **같은 죽은 커넥션**을 받아
 * 가므로, 죽은 커넥션을 돌려주면 셋이 함께 8000ms 예산을 태웠다(스테이징 버스트 실측 — 동시 3건 ×
 * 5회에서 [db-op-timeout] 4건, /api/reviews wall p95 11.7s). 그래서 절을 없앴다. 떼어 낸 클라이언트
 * 위의 이웃 op 은 세션 종료/미연결 에러로 빨리 실패하고 withMongoRetry 가 새 커넥션에서 재시도한다
 * — 그 분류는 이 파일 마지막 테스트가 고정한다.
 */

import { jest } from "@jest/globals";

const PING_OK = async () => ({ ok: 1 });
const PING_HANGS = () => new Promise(() => { /* 좀비 소켓: 영원히 pending */ });

function buildMongooseMock({ pingBehavior }) {
  // 테스트 도중 좀비로 바꿀 수 있게 한 겹 둔다(커넥션을 세운 뒤에 죽는 순서를 재현해야 한다).
  const state = { ping: pingBehavior };
  // mongoose 의 openUri 는 매번 새 MongoClient 를 만들어 connection.client 에 꽂는다. 떼어 낸
  // 옛 클라이언트와 새 클라이언트를 구분할 수 있어야 teardown 이 어느 쪽을 닫았는지 볼 수 있다.
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
  const mock = {
    connection,
    connect: jest.fn(async () => {
      connection.client = newClient();
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
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  return import("../../worker/lib/db.js");
}

const env = { MONGO_URI: "mongodb://fake/test" };

test("a warm connection is revalidated on every request, not reused blind", async () => {
  const mongooseMock = buildMongooseMock({ pingBehavior: async () => ({ ok: 1 }) });
  const { connectDb } = await loadDb(mongooseMock);

  await connectDb(env);
  expect(mongooseMock.connection.readyState).toBe(1);
  const pingsAfterFirst = mongooseMock.connection.db.command.mock.calls.length;

  // 곧바로 다시 부른다. 구 동작(건너뛰기 창 50초)에서는 여기서 ping 이 늘지 않았다.
  await connectDb(env);
  expect(mongooseMock.connection.db.command.mock.calls.length).toBeGreaterThan(pingsAfterFirst);
  expect(mongooseMock.connection.db.command).toHaveBeenLastCalledWith({ ping: 1 });
});

test("a warm connection that fails revalidation is re-established, not handed back", async () => {
  const mongooseMock = buildMongooseMock({ pingBehavior: PING_OK });
  const { connectDb } = await loadDb(mongooseMock);

  await connectDb({ ...env, MONGO_PING_TIMEOUT_MS: "300" });
  const connectsAfterFirst = mongooseMock.connect.mock.calls.length;
  const closesAfterFirst = mongooseMock.connection.close.mock.calls.length;

  // 커넥션을 세운 **뒤에** 소켓이 죽는다(readyState 는 1 그대로) = 실측의 cdop 7.8초 원인.
  mongooseMock.connection.__setPing(PING_HANGS);
  await connectDb({ ...env, MONGO_PING_TIMEOUT_MS: "300" });

  // 🔴 구 동작은 여기서 "readyState 가 1 이면 그대로 반환"이라 teardown 도 connect 도 0 이었고,
  //    그 커넥션 위의 쿼리가 7.8초를 태웠다.
  //    teardown 수단은 mongoose.disconnect() → connection.close({skipCloseClient}) 로 바뀌었다
  //    (db.warm-teardown-off-critical-path.test.js 가 그 이유와 값을 고정한다).
  expect(mongooseMock.connection.close.mock.calls.length).toBeGreaterThan(closesAfterFirst);
  expect(mongooseMock.connect.mock.calls.length).toBeGreaterThan(connectsAfterFirst);
  expect(mongooseMock.connection.readyState).toBe(1);
});

test("the withMongoRetry path re-establishes a dead warm connection instead of counting itself as a neighbour", async () => {
  /* 프로덕션 경로다. withMongoRetry 는 슬롯을 잡은 **뒤에** connectDb 를 부르므로 회계에는 이미
     자기 op 하나가 올라와 있다. activeOpsOwned 를 안 넘기면 그 1 을 '동시 요청'으로 착각해
     좀비 커넥션을 영영 못 갈아치운다 — 이 서비스에서는 거의 모든 요청이 단독이라 그게 곧 전면 무효화다. */
  const mongooseMock = buildMongooseMock({ pingBehavior: PING_OK });
  const { connectDb, withMongoRetry } = await loadDb(mongooseMock);
  const opts = { ...env, MONGO_PING_TIMEOUT_MS: "300" };

  await connectDb(opts);
  mongooseMock.connection.__setPing(PING_HANGS);
  const closesBefore = mongooseMock.connection.close.mock.calls.length;
  const connectsBefore = mongooseMock.connect.mock.calls.length;

  await withMongoRetry(opts, async () => ({ ok: 1 }), {
    retries: 0, attemptTimeoutMS: 4000, minAttemptTimeoutMS: 250, respectServerSelectionFloor: false,
  });

  expect(mongooseMock.connection.close.mock.calls.length).toBeGreaterThan(closesBefore);
  expect(mongooseMock.connect.mock.calls.length).toBeGreaterThan(connectsBefore);
});

test("a request that finds a neighbour already on the connection skips the ping entirely", async () => {
  /* 2026-09-06 프로덕션 tail: 버스트(콜드 + 동시 3요청)의 2·3번째 요청은 connectMs 가 정확히 300
     = ping 예산이었다. 이웃이 먼저 있는 요청의 ping 은 예산만 태우고 남의 소켓을 끊을 위험만 만든다.
     그래서 보내지 않는다 — 이 분기가 곧 "먼저 돌던 op 을 끊지 않는다" 가드다(③). */
  const mongooseMock = buildMongooseMock({ pingBehavior: PING_OK });
  const { connectDb, withMongoRetry, __dbTestUtils } = await loadDb(mongooseMock);
  const opts = { ...env, MONGO_PING_TIMEOUT_MS: "300" };
  await connectDb(opts);

  let releaseNeighbour;
  const neighbour = withMongoRetry(
    opts,
    () => new Promise((resolve) => { releaseNeighbour = resolve; }),
    { retries: 0, attemptTimeoutMS: 4000, minAttemptTimeoutMS: 250, respectServerSelectionFloor: false },
  );
  try {
    for (let i = 0; i < 50 && __dbTestUtils.countActiveMongoOps() < 1; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(__dbTestUtils.countActiveMongoOps()).toBeGreaterThanOrEqual(1);
    const pingsBefore = mongooseMock.connection.db.command.mock.calls.length;
    const timings = {};

    const connection = await connectDb(opts, { timings });

    expect(connection).toBe(mongooseMock.connection);
    expect(mongooseMock.connection.db.command.mock.calls.length).toBe(pingsBefore);
    expect(timings.pingSkipped).toBe(true);
    expect(timings.pingMs).toBeUndefined();
  } finally {
    releaseNeighbour?.({ ok: 1 });
    await neighbour.catch(() => {});
  }

  // 이웃이 빠지면 단독 요청이고, 단독 요청은 종전대로 매번 검증한다(①).
  const pingsAfterNeighbour = mongooseMock.connection.db.command.mock.calls.length;
  await connectDb(opts);
  expect(mongooseMock.connection.db.command.mock.calls.length).toBeGreaterThan(pingsAfterNeighbour);
});

test("revalidation failure detaches the dead connection even if a neighbour arrived mid-ping", async () => {
  const mongooseMock = buildMongooseMock({ pingBehavior: PING_OK });
  const { connectDb, withMongoRetry, __dbTestUtils } = await loadDb(mongooseMock);

  const neighbourEnv = { ...env, MONGO_PING_TIMEOUT_MS: "300" };
  await connectDb(neighbourEnv);

  /* 2026-09-06 스테이징 버스트의 순서다. 단독 요청의 ping 이 걸려 있는 **도중에** 다른 요청이 같은
     아이솔레이트에 들어온다. 이웃은 위 테스트대로 ping 을 건너뛰고 같은 커넥션을 받아 간다. 앞선
     요청의 ping 은 그 뒤에 실패한다 — 구 동작은 여기서 "이웃이 있으니 끊지 않는다"며 죽은 커넥션을
     돌려줬고, 그러면 두 요청이 함께 8000ms 예산을 태웠다(3회차 summary 의 connectMs=300 에
     [db-connect] 줄이 없던 것이 그 증거). */
  mongooseMock.connection.__setPing(PING_HANGS);
  const closesBefore = mongooseMock.connection.close.mock.calls.length;
  const connectsBefore = mongooseMock.connect.mock.calls.length;
  const staleClient = mongooseMock.connection.getClient();
  const pingsBefore = mongooseMock.connection.db.command.mock.calls.length;

  // 프로덕션 경로 그대로 withMongoRetry 로 부른다 — 슬롯을 먼저 잡으므로 뒤에 오는 이웃이 이 op 을
  // 본다(connectDb 를 직접 부르면 회계에 안 올라 이웃도 ping 을 보내 버린다).
  const retryOpts = { retries: 0, attemptTimeoutMS: 4000, minAttemptTimeoutMS: 250, respectServerSelectionFloor: false };
  const pinging = withMongoRetry(neighbourEnv, async () => ({ ok: 1 }), retryOpts);
  for (let i = 0; i < 50 && mongooseMock.connection.db.command.mock.calls.length === pingsBefore; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(mongooseMock.connection.db.command.mock.calls.length).toBe(pingsBefore + 1);

  let releaseNeighbour;
  const neighbour = withMongoRetry(
    neighbourEnv,
    () => new Promise((resolve) => { releaseNeighbour = resolve; }),
    retryOpts,
  );
  try {
    for (let i = 0; i < 50 && __dbTestUtils.countActiveMongoOps() < 2; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(__dbTestUtils.countActiveMongoOps()).toBe(2);
    // 이웃은 ping 없이 들어갔다(죽은 커넥션 위에 서 있다).
    expect(mongooseMock.connection.db.command.mock.calls.length).toBe(pingsBefore + 1);

    await pinging;

    // 🔴 이웃이 있어도 뗀다 — 전역 disconnect 가 아니라 mongoose 분리 + 옛 클라이언트 배경 close 다.
    expect(mongooseMock.disconnect).not.toHaveBeenCalled();
    expect(mongooseMock.connection.close.mock.calls.length).toBe(closesBefore + 1);
    expect(mongooseMock.connection.close).toHaveBeenLastCalledWith({ skipCloseClient: true });
    expect(mongooseMock.connect.mock.calls.length).toBe(connectsBefore + 1);
    expect(mongooseMock.connection.readyState).toBe(1);
    expect(mongooseMock.connection.getClient()).not.toBe(staleClient);
    await Promise.resolve();
    expect(staleClient.close).toHaveBeenCalledTimes(1);
  } finally {
    releaseNeighbour?.({ ok: 1 });
    await neighbour.catch(() => {});
  }
});

test("errors an op sees when its client was detached underneath it are transient (retried on a fresh connection)", async () => {
  /* 위 테스트의 이웃이 실제 드라이버에서 받는 에러다 — 2026-09-03 크론 사고 로그의 두 메시지.
     transient 가 아니면 withMongoRetry 가 재시도하지 않아 이웃은 8초 hang 대신 즉시 500 을 받는다. */
  const { isTransientMongoError } = await loadDb(buildMongooseMock({ pingBehavior: PING_OK }));
  const expired = Object.assign(new Error("Cannot use a session that has ended"), { name: "MongoExpiredSessionError" });
  const notConnected = Object.assign(new Error("Client must be connected before running operations"), { name: "MongoNotConnectedError" });
  expect(isTransientMongoError(expired)).toBe(true);
  expect(isTransientMongoError(notConnected)).toBe(true);
  // 일반 쿼리 에러는 여전히 하드 에러다(재연결 폭풍 방지).
  expect(isTransientMongoError(Object.assign(new Error("E11000 duplicate key"), { name: "MongoServerError" }))).toBe(false);
});
