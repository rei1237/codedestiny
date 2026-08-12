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
 *
 * 🔴 2026-08-12 Atlas M0 → M10 전환으로 **세 번째 축이 추가됐다: 신규 커넥션 생성률.**
 * M10·M20 은 노드당 초당 15개의 신규 커넥션만 처리하고 초과분은 큐잉·드롭된다(M0 에는 없던 제약,
 * M30 이상에는 다시 없다). 반대로 M0 를 옥죄던 총 연결 상한(500)은 노드당 1,490 으로 풀렸다.
 * 그래서 "유휴 커넥션을 빨리 회전시킨다"는 M0 시절의 미덕이 M10 에서는 그대로 비용이 된다.
 * 아래 maxIdleTimeMS 단언이 상한에서 하한으로 뒤집힌 이유가 그것이다.
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
  // 🔴 2026-08-12 Atlas M0 → M10 전환으로 **이 단언의 방향이 뒤집혔다.**
  // 옛 단언은 `<= 30000` 이었고 근거는 "유휴 커넥션이 M0 의 총 연결 상한 500 을 오래 점유하지
  // 않도록 회전시킨다" 였다. M10 에서는 그 전제가 둘 다 무너진다:
  //   1. 총 연결 상한이 노드당 1,490(3노드) 이라 총량이 병목이 아니다.
  //   2. 대신 M0 에 없던 **신규 커넥션 생성률 제한(노드당 초당 15개)** 이 생겼다.
  // 즉 '회전'은 이제 미덕이 아니라 비용이다. 짧은 유휴 상한은 살아 있는 아이솔레이트가 소켓을
  // 버렸다 다시 여는 톱니 churn 을 만들어 그 예산을 태운다.
  // 그래서 지금 지켜야 할 것은 상한이 아니라 **하한**이다 — 너무 짧게 되돌리지 못하게 막는다.
  expect(seenOptions.maxIdleTimeMS).toBeGreaterThanOrEqual(60000);
  // 좀비(half-open) 소켓 근절이라는 원래 목적은 유지된다 — Atlas 유휴 컷보다는 짧아야 한다.
  expect(seenOptions.maxIdleTimeMS).toBeLessThanOrEqual(300000);
  // 🔴 M10·M20 의 신규 커넥션 생성률 제한에 직접 대응하는 유일한 드라이버 노브다.
  // 드라이버 기본값(2)에 맡기면 버전이 바뀔 때 우리 예산이 조용히 흔들린다.
  expect(seenOptions.maxConnecting).toBeGreaterThanOrEqual(1);
  expect(seenOptions.maxConnecting).toBeLessThanOrEqual(8);
  // M10 은 3노드 리플리카셋이라 primary 교체 시 드라이버 자동 재시도가 실제로 동작한다.
  expect(seenOptions.retryWrites).toBe(true);
  expect(seenOptions.retryReads).toBe(true);
  // Atlas Profiler 에서 부하 주체를 구분하려면 라벨이 있어야 한다.
  expect(String(seenOptions.appName || "")).not.toBe("");
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
