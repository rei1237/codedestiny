/**
 * @jest-environment node
 *
 * 결제 레인 수립은 일시적 실패 1회를 사용자에게 그대로 내보내지 않는다.
 *
 * 2026-08-12 실측 증상: "PG 결제창/월정석 결제가 한 번에 안 되고, 재시도하면 된다."
 * 원인은 결제 레인(connectPaymentDb)과 공유 커넥션(connectDb)의 **수립 경로 비대칭**이었다.
 *   · connectDb        — IP family 후보(4 → 0) × MONGO_WORKER_CONNECT_RETRIES(2) = 최대 6회 시도
 *   · connectPaymentDb — 단 1회. 실패하면 그대로 throw
 * 레인이 한 번 미끄러지면 호출부(worker/payments/db.js)가 공유 커넥션으로 폴백하면서
 * **핸드셰이크를 처음부터 다시** 한다. 그 둘을 더한 시간이 op 예산(12s)을 넘겨 503 이 되고,
 * 사용자가 누르는 재시도는 그때 이미 웜이라 성공한다 — 그게 "재시도하면 된다"의 정체다.
 *
 * 여기서 고정하는 계약은 두 개다:
 *   1. 일시적 실패 뒤 재시도해서 성공하면, 호출자는 성공만 본다(1회 요청 = 1회 성공).
 *   2. 재시도가 무한정 늘어지지 않는다 — 가드 타임아웃이 전체를 묶는다. 재시도가 op 예산을
 *      넘겨 버리면 재시도가 없느니만 못하기 때문이다.
 */

import { jest } from "@jest/globals";

function makeLaneConnection() {
  return {
    readyState: 1,
    db: { collection: jest.fn(() => ({})) },
    close: jest.fn(async () => {}),
  };
}

async function loadDb(createConnectionImpl) {
  const connection = {
    readyState: 0,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
    getClient: () => ({ on: jest.fn() }),
  };
  const mongooseMock = {
    connection,
    connect: jest.fn(async () => {
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => { connection.readyState = 0; }),
    createConnection: createConnectionImpl,
  };

  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  return import("../../worker/lib/db.js");
}

const ENV = { MONGO_URI: "mongodb://fake/test", MONGO_WORKER_RETRY_DELAY_MS: "0" };

test("일시적 수립 실패 1회는 재시도로 흡수되어 호출자에게 성공으로 보인다", async () => {
  const lane = makeLaneConnection();
  let attempts = 0;
  const createConnection = jest.fn(() => ({
    asPromise: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("connection <monitor> to 10.0.0.1:27017 closed");
      return lane;
    },
  }));

  const { connectPaymentDb, resetPaymentConnection } = await loadDb(createConnection);
  await resetPaymentConnection();

  const conn = await connectPaymentDb(ENV);

  expect(conn).toBe(lane);
  // 핵심: 호출자는 단 한 번 불렀고 성공을 받았다. 예전에는 여기서 throw 가 나가 폴백 →
  // 이중 핸드셰이크 → op 예산 초과 → 503 이었다.
  expect(attempts).toBe(2);
});

test("레인 수립 옵션이 M10 예산에 맞춰져 있다", async () => {
  const lane = makeLaneConnection();
  let seenOptions = null;
  const createConnection = jest.fn((_uri, options) => {
    seenOptions = options;
    return { asPromise: async () => lane };
  });

  const { connectPaymentDb, resetPaymentConnection } = await loadDb(createConnection);
  await resetPaymentConnection();
  await connectPaymentDb(ENV);

  expect(seenOptions).toBeTruthy();
  // 유휴 회전이 곧 커넥션 생성률이다 — 공유 커넥션과 같은 하한을 지킨다.
  expect(seenOptions.maxIdleTimeMS).toBeGreaterThanOrEqual(60000);
  // 동시 신설 커넥션 상한(노드당 15/s 예산에 직접 대응).
  expect(seenOptions.maxConnecting).toBeGreaterThanOrEqual(1);
  // M10 리플리카셋에서 primary 교체 시 결제 op 를 살린다.
  expect(seenOptions.retryWrites).toBe(true);
  expect(seenOptions.retryReads).toBe(true);
  // 🔴 계측 사각지대 방지 — 이게 없으면 [db-op-timeout] 카운터가 결제 경로를 못 본다.
  expect(seenOptions.monitorCommands).toBe(true);
  // Atlas Profiler 에서 공유 트래픽과 분리되어야 한다.
  expect(String(seenOptions.appName || "")).not.toBe(String(""));
  expect(seenOptions.appName).not.toBe("code-destiny-worker");
});

test("수립이 계속 실패하면 가드 타임아웃 안에서 끝난다 (op 예산을 넘기지 않는다)", async () => {
  const createConnection = jest.fn(() => ({
    asPromise: async () => { throw new Error("server selection timed out"); },
  }));

  const { connectPaymentDb, resetPaymentConnection } = await loadDb(createConnection);
  await resetPaymentConnection();

  const startedAt = Date.now();
  await expect(connectPaymentDb(ENV)).rejects.toThrow();
  // withMongoRetry 의 시도 상한(12s)보다 확실히 안쪽에서 끝나야 폴백이 의미를 갖는다.
  expect(Date.now() - startedAt).toBeLessThan(12000);
});
