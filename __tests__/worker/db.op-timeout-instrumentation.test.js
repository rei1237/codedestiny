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
import { EventEmitter } from "node:events";

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

function buildEmittingMongoose() {
  const client = new EventEmitter();
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
  return { client, mongooseMock };
}

async function loadDb(mongooseMock) {
  delete globalThis.__mongoOperationAdmission;
  delete globalThis.__mongoPaymentAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: mongooseMock }));
  return import("../../worker/lib/db.js");
}

async function captureOpTimeout(withMongoRetry, op) {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => { logs.push(args.map(String).join(" ")); };
  try {
    await expect(withMongoRetry(ENV, op)).rejects.toThrow(/operation timed out/i);
  } finally {
    console.log = originalLog;
  }
  const line = logs.find((l) => l.includes("[db-op-timeout]"));
  return { logs, payload: JSON.parse(line.slice(line.indexOf("{"))) };
}

// 2026-09-23 영냥이 503: 이 시도엔 checkOutFailed 가 없었는데 예전 실패의 poolClosed 가 붙어 오진했다.
test("시도 밖의 체크아웃 실패 사유는 붙이지 않고, 걸린 명령의 커넥션과 그 소켓을 연 로그를 남긴다", async () => {
  const { client, mongooseMock } = buildEmittingMongoose();
  const { withMongoRetry } = await loadDb(mongooseMock);
  const originalLog = console.log;
  console.log = () => {};
  try {
    // 앞선 요청이 웜 커넥션 분리로 poolClosed 체크아웃 실패를 남기고 정상 종료했다.
    await withMongoRetry(ENV, async () => {
      client.emit("connectionCheckOutFailed", { reason: "poolClosed" });
      return "ok";
    });
  } finally {
    console.log = originalLog;
  }

  const { logs, payload } = await captureOpTimeout(withMongoRetry, () => {
    client.emit("connectionCreated", { connectionId: 7 });
    client.emit("commandStarted", { requestId: 41, connectionId: 7, commandName: "update" });
    return HANG_FOREVER();
  });

  expect(payload.delta).not.toHaveProperty("lastCheckOutFailReason");
  expect(payload.pending).toEqual([expect.objectContaining({ cmd: "update", conn: expect.stringMatching(/#7$/) })]);
  const openLine = logs.find((l) => l.includes("[db-conn-open]"));
  expect(JSON.parse(openLine.slice(openLine.indexOf("{"))).conn).toBe(payload.pending[0].conn);
}, ATTEMPT_TIMEOUT_FLOOR_MS + 10000);

test("시도 안에서 체크아웃이 실패했으면 그 사유를 붙인다", async () => {
  const { client, mongooseMock } = buildEmittingMongoose();
  const { withMongoRetry } = await loadDb(mongooseMock);

  const { payload } = await captureOpTimeout(withMongoRetry, () => {
    client.emit("connectionCheckOutFailed", { reason: "timeout" });
    return HANG_FOREVER();
  });

  expect(payload.delta).toMatchObject({ checkOutFailed: 1, lastCheckOutFailReason: "timeout" });
}, ATTEMPT_TIMEOUT_FLOOR_MS + 10000);
