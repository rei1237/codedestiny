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
 *   ② 검증에 **실패한** 커넥션을 그대로 돌려주지 않는다 — 리셋하고 새로 세운다.
 *      단 동시 요청이 있으면 끊지 않는다(2026-08-08 재연결 폭풍 사고의 가드는 유지).
 *
 * ②의 "단" 절이 이 테스트의 핵심이다. 그 가드를 잃으면 한 요청의 ping 실패가 같은 아이솔레이트의
 * 살아 있는 요청들을 함께 죽인다(bufferCommands:false).
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

test("revalidation failure must not disconnect while another operation is in flight", async () => {
  const mongooseMock = buildMongooseMock({ pingBehavior: PING_OK });
  const { connectDb, withMongoRetry, __dbTestUtils } = await loadDb(mongooseMock);

  const neighbourEnv = { ...env, MONGO_PING_TIMEOUT_MS: "300" };
  await connectDb(neighbourEnv);

  // 다른 요청이 같은 아이솔레이트에서 Mongo 작업 중인 상태를 만든다(커넥션은 아직 건강하다).
  let releaseNeighbour;
  const neighbour = withMongoRetry(
    neighbourEnv,
    () => new Promise((resolve) => { releaseNeighbour = resolve; }),
    { retries: 0, attemptTimeoutMS: 4000, minAttemptTimeoutMS: 250, respectServerSelectionFloor: false },
  );
  try {
    for (let i = 0; i < 50 && __dbTestUtils.countActiveMongoOps() < 1; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(__dbTestUtils.countActiveMongoOps()).toBeGreaterThanOrEqual(1);

    // 이웃이 작업 중인 동안 소켓이 죽는다.
    mongooseMock.connection.__setPing(PING_HANGS);
    const disconnectsBefore = mongooseMock.disconnect.mock.calls.length;
    const closesBefore = mongooseMock.connection.close.mock.calls.length;
    const staleClient = mongooseMock.connection.getClient();

    await connectDb(neighbourEnv);

    // 🔴 남의 소켓을 끊지 않는다 — 2026-08-08 재연결 폭풍 사고의 가드.
    //    teardown 을 배경으로 내보낸 뒤에도 이 가드가 첫 번째 방어선이다: 여기까지 오지 않는 것이
    //    맞고, 그래서 클라이언트 close 도 일어나지 않아야 한다(배경이라도 소켓은 실제로 끊긴다).
    expect(mongooseMock.disconnect.mock.calls.length).toBe(disconnectsBefore);
    expect(mongooseMock.connection.close.mock.calls.length).toBe(closesBefore);
    expect(staleClient.close).not.toHaveBeenCalled();
    expect(mongooseMock.connection.readyState).toBe(1);
  } finally {
    releaseNeighbour?.({ ok: 1 });
    await neighbour.catch(() => {});
  }
});
