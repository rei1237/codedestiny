/**
 * @jest-environment node
 *
 * 풀 고갈 대응 타임아웃 정렬 가드.
 *
 * 2026-08-01 [db-op-timeout] 실측으로 확정된 근본 원인:
 *   서버 명령 실행은 250~417ms 로 빠른데 **커넥션 체크아웃 대기가 최대 10,383ms** 였고,
 *   한 창에서 체크아웃 41건 시작 / 4건 성사였다(maxPoolSize=5).
 *   op-타임아웃(12초) 뒤에도 드라이버 작업은 취소되지 않아 소켓이 socketTimeoutMS(20초)까지
 *   묶여, 멈춘 op 5개면 풀이 20초간 마비되는 자기증폭 고리가 됐다.
 *
 * 그래서 두 가지를 강제한다:
 *   1. socketTimeoutMS 가 op 예산보다 짧을 것 (멈춘 소켓을 우리가 포기하기 전에 반납시킨다)
 *   2. 대기큐 타임아웃이 '일시적' 으로 분류될 것 (아니면 503 대신 500 이 나간다)
 */

import { jest } from "@jest/globals";

// withMongoRetry 의 시도 상한 기본값(= MONGO_OP_ATTEMPT_TIMEOUT_MS).
const OP_ATTEMPT_TIMEOUT_MS = 12000;

test("socketTimeoutMS 와 waitQueueTimeoutMS 가 op 예산 안으로 정렬되어 있다", async () => {
  const connection = {
    readyState: 0,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
    getClient: () => ({ on: jest.fn() }),
  };
  let seenOptions = null;
  const mongooseMock = {
    connection,
    connect: jest.fn(async (_uri, options) => {
      seenOptions = options;
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => { connection.readyState = 0; }),
  };

  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const { connectDb } = await import("../../worker/lib/db.js");

  await connectDb({ MONGO_URI: "mongodb://127.0.0.1:27017/test" });

  expect(seenOptions).toBeTruthy();
  // 🔴 풀을 2 로 줄였다가 되돌린 자리다(체크아웃 257건 시도 / 219건 실패 = 85%).
  // "Atlas M0 총 연결 상한 500 에 포화됐다"는 전제로 줄였는데, 전 구간 [db-connect-error] 0건이
  // 그 전제를 반증했다 — 상한에 닿았다면 연결 생성이 실패했어야 한다.
  // 실제 병목은 아이솔레이트 내부 풀 고갈이므로 하한을 지킨다.
  expect(seenOptions.maxPoolSize).toBeGreaterThanOrEqual(3);
  expect(seenOptions.minPoolSize).toBe(0);
  // 유휴 커넥션이 전역 예산을 오래 점유하지 않도록 회전시킨다.
  expect(seenOptions.maxIdleTimeMS).toBeLessThanOrEqual(30000);
  // 소켓 상한이 op 예산보다 길면, 우리가 포기한 뒤에도 소켓이 풀을 계속 점유한다(= 원래 결함).
  expect(seenOptions.socketTimeoutMS).toBeLessThan(OP_ATTEMPT_TIMEOUT_MS);
  // 큐 대기 상한이 없으면 체크아웃이 op 예산을 통째로 태운다(실측 10,383ms).
  expect(seenOptions.waitQueueTimeoutMS).toBeGreaterThan(0);
  expect(seenOptions.waitQueueTimeoutMS).toBeLessThan(OP_ATTEMPT_TIMEOUT_MS);
});

test("대기큐 타임아웃은 일시적 오류로 분류된다 (500 이 아니라 503 으로 나가야 한다)", async () => {
  jest.resetModules();
  const { isTransientMongoError } = await import("../../worker/lib/db.js");

  const waitQueueError = new Error(
    "Timed out while checking out a connection from connection pool: maxPoolSize: 5, connectionsInUse: 5",
  );
  Object.defineProperty(waitQueueError, "name", { value: "MongoWaitQueueTimeoutError" });

  expect(isTransientMongoError(waitQueueError)).toBe(true);
});
