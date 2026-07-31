/**
 * @jest-environment node
 *
 * withMongoRetry 의 op-타임아웃 처리 규칙 회귀 가드.
 *
 * 배경(2026-08-01 프로덕션 실측): 인증 요청 30건 중 27건이 매 요청 새 Mongo 연결을 맺었고
 * 그중 20건이 resolveAuth 11.5초 이상이었다(연결 실패는 0건). 원인은 "콜드 핸드셰이크가 느려
 * 시도 예산을 다 씀 → op-타임아웃 → 풀 리셋 → 다음 요청도 콜드" 라는 자기유지 고리였다.
 *
 * 규칙:
 *   - 방금 수립한 연결에서 난 op-타임아웃은 좀비가 아니므로 풀을 끊지 않는다(고리 차단).
 *   - 웜 재사용 연결에서 난 op-타임아웃은 좀비일 수 있으므로 종전대로 끊는다(자가복구 보존).
 */

import { jest } from "@jest/globals";

// 시도 상한을 넘기도록 오래 매달리되, 테스트가 끝나면 정리해 열린 핸들을 남기지 않는다.
const pendingTimers = [];
const HANG_FOREVER = () => new Promise((resolve) => {
  pendingTimers.push(setTimeout(resolve, 60000));
});

afterEach(() => {
  while (pendingTimers.length) clearTimeout(pendingTimers.pop());
});

function buildMongooseMock({ initialReadyState }) {
  const connection = {
    readyState: initialReadyState,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
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

// 시도 상한의 하한은 serverSelectionTimeoutMS + 3500 이라, 테스트를 짧게 하려면 최소값을 쓴다.
const ENV = {
  MONGO_URI: "mongodb://127.0.0.1:27017/test",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: "2000",
};
const ATTEMPT_TIMEOUT_FLOOR_MS = 2000 + 3500;

async function loadWithMongoose(mongooseMock) {
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  return import("../../worker/lib/db.js");
}

describe("withMongoRetry: op-타임아웃 시 풀 리셋 판단", () => {
  test("방금 맺은 연결에서 op-타임아웃이 나면 풀을 끊지 않는다 (콜드 재연결 고리 차단)", async () => {
    const mongooseMock = buildMongooseMock({ initialReadyState: 0 });
    const { withMongoRetry } = await loadWithMongoose(mongooseMock);

    await expect(
      withMongoRetry(ENV, HANG_FOREVER),
    ).rejects.toThrow(/operation timed out/i);

    expect(mongooseMock.connect).toHaveBeenCalled();
    // 핵심 단언: 새로 맺은 소켓을 끊어 다음 요청을 콜드로 몰지 않는다.
    expect(mongooseMock.disconnect).not.toHaveBeenCalled();
  }, ATTEMPT_TIMEOUT_FLOOR_MS + 10000);

  test("웜 재사용 연결에서 op-타임아웃이 나면 종전대로 풀을 끊는다 (좀비 자가복구 보존)", async () => {
    const mongooseMock = buildMongooseMock({ initialReadyState: 1 });
    const { withMongoRetry } = await loadWithMongoose(mongooseMock);

    await expect(
      withMongoRetry(ENV, HANG_FOREVER),
    ).rejects.toThrow(/operation timed out/i);

    // 이 아이솔레이트는 연결을 새로 맺은 적이 없다(웜 객체 재사용) → 좀비 가능성이 있으므로 끊는다.
    expect(mongooseMock.connect).not.toHaveBeenCalled();
    expect(mongooseMock.disconnect).toHaveBeenCalled();
  }, ATTEMPT_TIMEOUT_FLOOR_MS + 10000);
});
