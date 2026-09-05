/**
 * @jest-environment node
 *
 * 느린데 **성공한** Mongo 시도는 `[db-slow-op]` 한 줄을 남긴다.
 *
 * 그 전까지 db.js 가 남기는 소요 로그는 `[db-op-timeout]`(예산을 넘긴 실패)뿐이라, 결제 확정·로그인의
 * p95 를 말할 근거가 리포 안에 없었다(2026-09-06 Phase 1 진단 §4 "미측정"). 이 테스트는 임계 이상이면
 * 찍히고 이하면 조용한 것, 그리고 0 으로 끌 수 있다는 것을 고정한다.
 */
import { jest } from "@jest/globals";
import { withMongoRetry } from "../../worker/lib/db.js";

// 공유 커넥션을 세우지 않는 호출자(결제 레인과 같은 형태)로 실행해 Mongo 없이 재현한다.
const OPTIONS = { skipSharedConnect: true, retries: 0 };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function captureSlowOpLogs() {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return {
    lines: () => spy.mock.calls.filter((call) => call[0] === "[db-slow-op]"),
    restore: () => spy.mockRestore(),
  };
}

test("임계 이상으로 느린 성공은 [db-slow-op] 를 남긴다", async () => {
  const logs = captureSlowOpLogs();
  try {
    const result = await withMongoRetry({ MONGO_SLOW_OP_MS: "10" }, async () => {
      await wait(30);
      return "ok";
    }, OPTIONS);
    expect(result).toBe("ok");
    const lines = logs.lines();
    expect(lines).toHaveLength(1);
    const payload = JSON.parse(lines[0][1]);
    expect(payload.lane).toBe("payment");
    expect(payload.thresholdMs).toBe(10);
    expect(payload.totalMs).toBeGreaterThanOrEqual(10);
    expect(payload.attempt).toBe(1);
  } finally {
    logs.restore();
  }
});

test("임계 미만이면 조용하다", async () => {
  const logs = captureSlowOpLogs();
  try {
    await withMongoRetry({ MONGO_SLOW_OP_MS: "5000" }, async () => "fast", OPTIONS);
    expect(logs.lines()).toHaveLength(0);
  } finally {
    logs.restore();
  }
});

test("0 이면 끈다", async () => {
  const logs = captureSlowOpLogs();
  try {
    await withMongoRetry({ MONGO_SLOW_OP_MS: "0" }, async () => {
      await wait(20);
      return "slow";
    }, OPTIONS);
    expect(logs.lines()).toHaveLength(0);
  } finally {
    logs.restore();
  }
});
