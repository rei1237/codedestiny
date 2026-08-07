/**
 * @jest-environment node
 *
 * 버려진(settle 되지 않는) Mongo 작업이 in-flight 회계를 **영구 누수**시키면 안 된다.
 *
 * 프로덕션 사고의 근본 원인이었다. op 가 12초 상한에 걸리면 finally 에서 finalizeOperation() 을
 * 부르는데, 그때 드라이버 프로미스가 아직 pending 이면(= 정확히 타임아웃 상황) 회계를 닫지 않는다.
 * 그 프로미스가 영영 settle 하지 않으면 카운트가 영원히 높은 채로 남는다
 * (실측: inFlightOps 1 → 2 → 4 → 5 → 6 단조 증가).
 *
 * 피해는 숫자가 틀리는 것이 아니라 **안전밸브가 죽는 것**이다:
 *   · 예약된 풀 리셋(pendingPoolReset)은 in-flight 가 0 이 될 때만 실행된다 → 영영 실행 안 됨
 *   · 남는 리셋 경로는 forceReset 뿐인데 쿨다운과 동시성 가드를 **둘 다 우회**한다
 *   · 그 disconnect 가 살아 있는 동시 요청의 작업을 함께 죽이고(bufferCommands:false), 그 실패가
 *     다시 연속 실패 카운터를 올려 forceReset 을 재장전한다 → 자기지속 리셋 폭풍 → 유료 라우트 503
 *
 * 여기서 고정하는 성질: 버려진 작업은 **나이로 만료**되어 회계에서 빠지고, 그 뒤에는 정상적인
 * (가드가 살아 있는) 리셋 판단이 다시 가능해야 한다. setTimeout 기반 정리는 요청 컨텍스트가
 * 죽으면 타이머도 죽어 쓸 수 없으므로, 만료는 '읽는 시점'에 일어나야 한다.
 */

import { jest } from "@jest/globals";

function buildMongooseMock() {
  const connection = {
    readyState: 0,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
    getClient: () => ({ on: jest.fn() }),
  };
  return {
    connection,
    connect: jest.fn(async () => {
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => {
      connection.readyState = 0;
    }),
  };
}

test("an abandoned operation must not pin in-flight accounting forever", async () => {
  const mongooseMock = buildMongooseMock();
  delete globalThis.__mongoOperationAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const { withMongoRetry, __dbTestUtils } = await import("../../worker/lib/db.js");

  expect(typeof __dbTestUtils?.countActiveMongoOps).toBe("function");
  expect(__dbTestUtils.countActiveMongoOps()).toBe(0);

  const env = { MONGO_URI: "mongodb://fake/test" };

  // 영원히 settle 하지 않는 작업 = 프로덕션에서 12초 상한에 걸리던 그 프로미스.
  await expect(withMongoRetry(
    env,
    () => new Promise(() => { /* 절대 resolve/reject 하지 않는다 */ }),
    { retries: 0, attemptTimeoutMS: 300, minAttemptTimeoutMS: 250, respectServerSelectionFloor: false },
  )).rejects.toThrow(/timed out/i);

  // 타임아웃 직후에는 아직 '진행 중'으로 잡힌다 — 그 사이 소켓을 쓰고 있을 수 있으므로 의도된 보호다.
  expect(__dbTestUtils.countActiveMongoOps()).toBe(1);

  // 🔴 그러나 영원히는 아니다. 나이가 상한을 넘으면 회계에서 빠져야 한다.
  __dbTestUtils.expireActiveOpsForTest();
  expect(__dbTestUtils.countActiveMongoOps()).toBe(0);
});


// ── 리셋 피드백 루프 ─────────────────────────────────────────────────────────────
// 실제 루프를 먹이는 것은 poolClosed 에러가 아니라 **op-타임아웃**이다.
// (MongoPoolClosedError 는 isTransientMongoError 에 없어서 애초에 카운트되지 않는다.)
// op-타임아웃은 resetOnOperationTimeout 기본값 때문에 연결-레벨 실패로 분류돼 카운터를 올리고,
// 3회면 forceReset 이 가드를 우회해 disconnect 한다. 그 disconnect 가 동시 요청의 작업을 죽이면
// 그 실패가 또 op-타임아웃으로 돌아와 카운터를 올린다 — 이 고리를 끊는지 확인한다.

function hangingOp() {
  return new Promise(() => { /* never settles */ });
}
const SHORT_TIMEOUT = {
  retries: 0,
  attemptTimeoutMS: 200,
  minAttemptTimeoutMS: 250,
  respectServerSelectionFloor: false,
};

test("failures that are an echo of our own reset must not re-arm the force reset", async () => {
  const mongooseMock = buildMongooseMock();
  delete globalThis.__mongoOperationAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const { withMongoRetry, __dbTestUtils } = await import("../../worker/lib/db.js");

  const env = { MONGO_URI: "mongodb://fake/test" };
  // 방금 우리가 풀을 끊었다고 표시한다.
  __dbTestUtils.markPoolResetForTest(0);

  // 그 직후 쏟아지는 op-타임아웃은 우리 리셋의 메아리다. 임계(3)보다 많이 발생시킨다.
  for (let i = 0; i < 5; i += 1) {
    await expect(withMongoRetry(env, hangingOp, SHORT_TIMEOUT)).rejects.toThrow(/timed out/i);
  }

  // 메아리는 세지 않으므로 forceReset 이 재장전되지 않는다.
  expect(__dbTestUtils.getConsecutiveConnectionFailuresForTest()).toBe(0);
  expect(mongooseMock.disconnect).not.toHaveBeenCalled();
});

test("failures well after our reset still arm recovery", async () => {
  const mongooseMock = buildMongooseMock();
  delete globalThis.__mongoOperationAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const { withMongoRetry, __dbTestUtils } = await import("../../worker/lib/db.js");

  const env = { MONGO_URI: "mongodb://fake/test" };
  // 마지막 리셋이 한참 전이면 더 이상 메아리가 아니다 — 정상적으로 세고 복구해야 한다.
  __dbTestUtils.markPoolResetForTest(60000);

  await expect(withMongoRetry(env, hangingOp, SHORT_TIMEOUT)).rejects.toThrow(/timed out/i);

  // 과잉 차단이 아님을 확인한다: 메아리 창 밖의 실패는 그대로 복구를 유발한다.
  // (혼자 실행 중이라 예약이 아니라 즉시 disconnect 로 가고, 그 경로가 카운터를 0 으로 되돌리므로
  //  카운터 값이 아니라 **복구가 실제로 일어났는지**를 단언한다.)
  expect(mongooseMock.disconnect).toHaveBeenCalled();
});
