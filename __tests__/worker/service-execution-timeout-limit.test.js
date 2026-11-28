/**
 * @jest-environment node
 *
 * 10분 크론은 runServiceExecutionTimeoutTask(env, { limit: 5 }) 로 소량만 스윕하고, 일일 크론은 인자 없이
 * env 기본값(SERVICE_EXEC_SWEEP_LIMIT, 없으면 30)을 쓴다(2026-11-28). 락 클레임 횟수로 한도를 센다.
 * DB·네트워크 없음 — 모든 실행 건은 이미 끝난(completed) 상태로 돌아와 환불 경로를 타지 않는다.
 */
import { readFileSync } from "node:fs";
import { jest } from "@jest/globals";

// models.js 의 export 이름만 빌려 빈 목을 세운다(cron-shared-connection-teardown.test.js 와 같은 방식).
const modelSource = readFileSync(new URL("../../worker/lib/models.js", import.meta.url), "utf8");
const actualModels = Object.fromEntries([...modelSource.matchAll(/export\s+const\s+(\w+)\s*=/g)]
  .map(([, name]) => [name, /^[A-Z0-9_]+$/.test(name) ? [] : {}]));
if (Object.keys(actualModels).length < 40) throw new Error("models.js export 발견 수가 너무 적다 — 정규식이 죽었다");
const lockClaims = jest.fn(() => ({ lean: async () => ({ _id: `exec-${lockClaims.mock.calls.length}`, status: "pending", lock: { token: "t" } }) }));
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  ...actualModels,
  ServiceExecutionTransaction: {
    findOneAndUpdate: lockClaims,
    findById: () => ({ lean: async () => ({ _id: "x", status: "completed" }) }),
  },
}));
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: async () => {},
  mongoose: {},
  withMongoRetry: async (_env, fn) => fn(),
}));
let runServiceExecutionTimeoutTask;
beforeAll(async () => {
  ({ runServiceExecutionTimeoutTask } = await import("../../worker/lib/service-execution-task.js"));
});

beforeEach(() => {
  lockClaims.mockClear();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test("10분 크론의 limit 옵션이 env 기본값보다 앞선다", async () => {
  const result = await runServiceExecutionTimeoutTask({ SERVICE_EXEC_SWEEP_LIMIT: "30" }, { limit: 5 });
  expect(lockClaims).toHaveBeenCalledTimes(5);
  expect(result.scanned).toBe(5);
});

test("옵션 없이 부르면(일일 크론) 예전처럼 env 값, 없으면 30건", async () => {
  await runServiceExecutionTimeoutTask({ SERVICE_EXEC_SWEEP_LIMIT: "7" });
  expect(lockClaims).toHaveBeenCalledTimes(7);
  lockClaims.mockClear();
  await runServiceExecutionTimeoutTask({});
  expect(lockClaims).toHaveBeenCalledTimes(30);
});

test("락 클레임은 nextRetryAt 이 가장 이른 건부터 잡는다 — 방금 미룬 recoverable 건이 소량 한도를 독차지하지 않는다", async () => {
  await runServiceExecutionTimeoutTask({}, { limit: 1 });
  const [filter, , options] = lockClaims.mock.calls[0];
  expect(Object.keys(options.sort)[0]).toBe("nextRetryAt");
  expect(filter).toMatchObject({ status: "pending" });
  expect(filter.nextRetryAt).toBeDefined();
});
