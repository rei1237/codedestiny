/**
 * @jest-environment node
 *
 * retryAdmissionOnOverload: admission 거절(MongoOperationOverloadedError)은 withMongoRetry 의
 * 재시도 루프 이전에 던져져 willRetry 에 닿지 않는다 — 순간 포화가 곧바로 하드 503 이 되는 유일한
 * 부류다. 옵트인한 결제·인증 크리티컬 읽기에 한해 슬롯 획득만 1회 재시도한다(짧은 지터 후).
 * 가짜 드라이버만 사용한다 — 실제 DB 를 건드리지 않는다.
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

async function loadDb() {
  delete globalThis.__mongoOperationAdmission;
  jest.resetModules();
  jest.unstable_mockModule("mongoose", () => ({ default: buildMongooseMock() }));
  return import("../../worker/lib/db.js");
}

const ENV = { MONGO_URI: "mongodb://fake/test", MONGO_MAX_IN_FLIGHT_OPS: "1" };

test("옵트인 없는 호출은 admission 거절 시 종전대로 즉시 실패한다", async () => {
  const { withMongoRetry } = await loadDb();
  let releaseFirst;
  const first = withMongoRetry(ENV, () => new Promise((resolve) => { releaseFirst = resolve; }), { retries: 0 });
  await new Promise((resolve) => setTimeout(resolve, 20));

  await expect(withMongoRetry(
    ENV,
    async () => ({ ok: true }),
    { retries: 0, admissionTimeoutMS: 100 },
  )).rejects.toMatchObject({ name: "MongoOperationOverloadedError" });

  releaseFirst({ ok: true });
  await expect(first).resolves.toEqual({ ok: true });
});

test("옵트인 시 순간 포화는 획득 재시도로 흡수된다(지터 중 슬롯이 풀리는 버스트 케이스)", async () => {
  const { withMongoRetry } = await loadDb();
  let releaseFirst;
  const first = withMongoRetry(ENV, () => new Promise((resolve) => { releaseFirst = resolve; }), { retries: 0 });
  await new Promise((resolve) => setTimeout(resolve, 20));

  // 1차 획득은 100ms 에 거절되고, 150~300ms 지터 동안 선행 작업이 끝나 슬롯이 풀린다.
  setTimeout(() => releaseFirst({ ok: true }), 150);
  const startedAt = Date.now();
  await expect(withMongoRetry(
    ENV,
    async () => ({ recovered: true }),
    { retries: 0, admissionTimeoutMS: 100, retryAdmissionOnOverload: true },
  )).resolves.toEqual({ recovered: true });
  // 1차 거절(100ms) + 지터(≥150ms)를 실제로 거쳤는지 — 즉시 성공했다면 재시도 경로가 아니다.
  expect(Date.now() - startedAt).toBeGreaterThanOrEqual(240);
  await expect(first).resolves.toEqual({ ok: true });
});

test("옵트인해도 재시도는 1회뿐 — 지속 포화는 여전히 실패한다(대기열 무한 증식 방지)", async () => {
  const { withMongoRetry } = await loadDb();
  let releaseFirst;
  const first = withMongoRetry(ENV, () => new Promise((resolve) => { releaseFirst = resolve; }), { retries: 0 });
  await new Promise((resolve) => setTimeout(resolve, 20));

  await expect(withMongoRetry(
    ENV,
    async () => ({ ok: true }),
    { retries: 0, admissionTimeoutMS: 100, retryAdmissionOnOverload: true },
  )).rejects.toMatchObject({ name: "MongoOperationOverloadedError" });

  releaseFirst({ ok: true });
  await expect(first).resolves.toEqual({ ok: true });
});
