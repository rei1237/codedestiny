/**
 * @jest-environment node
 *
 * op-타임아웃 계측이 실제로 출력되는지 지키는 가드.
 *
 * 계측은 "조용히 안 나오는" 실패 모드가 가장 위험하다(2026-08-01 에 auth-timing 이 안 찍혀
 * 코드를 의심하며 한참 헤맸는데, 실제로는 배포본이 덮여 있었다). 그래서 로그 자체를 단언한다.
 *
 * 이 로그는 `resolveAuth` 12초 상한의 원인을 세 갈래로 가르기 위한 진단이다:
 *   connectMs 큼 → 연결 수립 / checkedOut 증분 없음 → 풀·I/O 격리 / commandStarted 만 증가 → 서버 지연
 */

import { jest } from "@jest/globals";

const pendingResolvers = [];
const HANG_FOREVER = () => new Promise((resolve) => {
  pendingResolvers.push(resolve);
});

afterEach(() => {
  while (pendingResolvers.length) pendingResolvers.pop()();
});

// 시도 상한의 하한은 serverSelectionTimeoutMS + 3500 이라, 최소값으로 테스트를 짧게 유지한다.
const ENV = {
  MONGO_URI: "mongodb://127.0.0.1:27017/test",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: "2000",
};
const ATTEMPT_TIMEOUT_FLOOR_MS = 2000 + 3500;

test("op-타임아웃 시 [db-op-timeout] 진단 로그를 남긴다", async () => {
  const client = { on: jest.fn() };
  const connection = {
    readyState: 0,
    db: { command: jest.fn(async () => ({ ok: 1 })) },
    getClient: () => client,
  };
  const mongooseMock = {
    connection,
    connect: jest.fn(async () => {
      connection.readyState = 1;
      return connection;
    }),
    disconnect: jest.fn(async () => {
      connection.readyState = 0;
    }),
  };

  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  const { withMongoRetry } = await import("../../worker/lib/db.js");

  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => { logs.push(args.map(String).join(" ")); };
  try {
    await expect(withMongoRetry(ENV, HANG_FOREVER)).rejects.toThrow(/operation timed out/i);
  } finally {
    console.log = originalLog;
  }

  const line = logs.find((l) => l.includes("[db-op-timeout]"));
  expect(line).toBeDefined();

  const payload = JSON.parse(line.slice(line.indexOf("{")));
  // 연결은 성공했으므로 connectMs 가 잡히고, 남은 시간이 전부 쿼리(opMs)로 간다.
  expect(payload.connectMs).toBeGreaterThanOrEqual(0);
  expect(payload.opMs).toBeGreaterThan(0);
  expect(payload).toHaveProperty("delta");
  // 드라이버 이벤트 계측이 실제로 연결에 붙었는지(붙지 않으면 delta 가 영원히 비어 진단이 죽는다).
  expect(client.on).toHaveBeenCalled();
  expect(mongooseMock.disconnect).toHaveBeenCalledTimes(1);
}, ATTEMPT_TIMEOUT_FLOOR_MS + 10000);
