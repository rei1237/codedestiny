/** @jest-environment node */
import { jest } from "@jest/globals";
import {
  createPaidPrashnaExecution,
  PRASHNA_FIXTURE_EXECUTION_ID,
  PRASHNA_FIXTURE_ORDER_ID,
  PRASHNA_FIXTURE_RESULT,
  PRASHNA_FIXTURE_USER_ID,
} from "../fixtures/vedic-prashna-paid-delivery-fixture.mjs";

let handleVedicPrashnaGenerate;
let docs;
let provider;
let finalSaveFault;
let claimFault;
let externalFetch;
let consoleError;

const clone = value => value == null ? value : structuredClone(value);
const get = (value, path) => path.split(".").reduce((current, key) => current?.[key], value);

function matches(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = get(doc, key);
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      if ("$in" in expected) return expected.$in.includes(actual);
    }
    return JSON.stringify(actual) === JSON.stringify(expected);
  });
}

function setPath(doc, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  let target = doc;
  for (const key of keys) target = target[key] ??= {};
  target[last] = clone(value);
}

function unsetPath(doc, path) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((current, key) => current?.[key], doc);
  if (target) delete target[last];
}

function applyUpdate(doc, update) {
  for (const [path, value] of Object.entries(update.$set || {})) setPath(doc, path, value);
  for (const path of Object.keys(update.$unset || {})) unsetPath(doc, path);
  doc.updatedAt = new Date();
}

const query = value => ({ lean: async () => clone(value) });
const paidExecutionModel = {
  findOne(filter) {
    return query(docs.find(doc => matches(doc, filter)) || null);
  },
  findOneAndUpdate(filter, update) {
    const doc = docs.find(row => matches(row, filter));
    const isClaim = update.$set?.status === "generating";
    const isFinalSave = update.$set?.status === "completed";
    if (doc && isClaim && claimFault === "lost") {
      claimFault = null;
      applyUpdate(doc, update);
      throw new Error("claim response lost");
    }
    if (doc && isFinalSave && finalSaveFault) {
      const fault = finalSaveFault;
      finalSaveFault = null;
      if (fault === "throw") throw new Error("final storage unavailable");
      if (fault === "null") return query(null);
      if (fault === "lost") {
        applyUpdate(doc, update);
        throw new Error("final storage response lost");
      }
    }
    if (doc) applyUpdate(doc, update);
    return query(doc || null);
  },
  async updateOne(filter, update) {
    const doc = docs.find(row => matches(row, filter));
    if (doc) applyUpdate(doc, update);
    return { matchedCount: doc ? 1 : 0, modifiedCount: doc ? 1 : 0 };
  },
};

beforeAll(async () => {
  const [db, models] = await Promise.all([
    import("../../worker/lib/db.js"),
    import("../../worker/lib/models.js"),
  ]);
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    ...db,
    connectDb: async () => {},
    withMongoRetry: async (_env, operation) => operation(),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    ...models,
    PaidExecutionRecord: paidExecutionModel,
  }));
  jest.unstable_mockModule("../../worker/lib/vedic-prashna-prompt.js", () => ({
    VEDIC_PRASHNA_PROMPT_FEATURE_KEY: "vedic_prashna_prompt",
    VEDIC_PRASHNA_PROMPT_PRICE: 50,
    VEDIC_PRASHNA_PROMPT_AMOUNT_KRW: 5000,
    VEDIC_PRASHNA_PROMPT_PRODUCT_CODE: "PRASHNA_PROMPT_1",
    VEDIC_PRASHNA_PROMPT_PRODUCT_NAME: "프라슈나 프롬프트",
    createPrashnaSnapshot: jest.fn(),
    generatePrashnaPromptResult: (...args) => provider(...args),
  }));
  const fortune = await import("../../worker/routes/fortune.js");
  handleVedicPrashnaGenerate = fortune.__fortuneAccessTestUtils.handleVedicPrashnaGenerate;
});

beforeEach(() => {
  docs = [createPaidPrashnaExecution()];
  provider = jest.fn(async () => clone(PRASHNA_FIXTURE_RESULT));
  finalSaveFault = null;
  claimFault = null;
  externalFetch = jest.spyOn(globalThis, "fetch").mockImplementation(() => {
    throw new Error("external fetch forbidden");
  });
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  expect(externalFetch).not.toHaveBeenCalled();
  externalFetch.mockRestore();
  consoleError.mockRestore();
});

function generate() {
  return handleVedicPrashnaGenerate(
    new Request("https://mock.test/api/fortune/vedic/prashna/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: PRASHNA_FIXTURE_ORDER_ID }),
    }),
    { userId: PRASHNA_FIXTURE_USER_ID },
    { NODE_ENV: "test" },
  );
}

test("만료된 generating claim은 같은 결제 실행 레코드로 재인수한다", async () => {
  docs = [createPaidPrashnaExecution({
    status: "generating",
    updatedAt: new Date("2026-09-14T00:00:00.000Z"),
    result: {
      leaseToken: "expired-lease",
      generationClaimedAt: "2026-09-14T00:00:00.000Z",
    },
  })];

  const response = await generate();

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, promptText: PRASHNA_FIXTURE_RESULT.promptText });
  expect(provider).toHaveBeenCalledTimes(1);
  expect(docs).toHaveLength(1);
  expect(docs[0]).toMatchObject({ executionId: PRASHNA_FIXTURE_EXECUTION_ID, status: "completed" });
});

test("아직 유효한 generating claim은 중복 생성을 막는다", async () => {
  docs = [createPaidPrashnaExecution({
    status: "generating",
    updatedAt: new Date(),
    result: { leaseToken: "active-lease", generationClaimedAt: new Date().toISOString() },
  })];

  const response = await generate();

  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toMatchObject({ code: "REQUEST_IN_PROGRESS" });
  expect(provider).not.toHaveBeenCalled();
});

test("claim 저장 응답이 유실돼도 자기 lease를 재조회해 생성을 이어 간다", async () => {
  claimFault = "lost";

  const response = await generate();

  expect(response.status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(1);
  expect(docs).toHaveLength(1);
  expect(docs[0]).toMatchObject({ executionId: PRASHNA_FIXTURE_EXECUTION_ID, status: "completed" });
});

test("생성 실패는 저장 실패와 구분되고 같은 결제 레코드에서 다시 생성한다", async () => {
  provider.mockRejectedValueOnce(Object.assign(new Error("deterministic calculation failed"), { code: "PRASHNA_CALCULATION_FAILED" }));

  const failed = await generate();

  expect(failed.status).toBe(500);
  await expect(failed.json()).resolves.toMatchObject({ code: "PRASHNA_GENERATION_FAILED", retryEligible: true });
  expect(docs[0]).toMatchObject({ status: "generation_failed", executionId: PRASHNA_FIXTURE_EXECUTION_ID });

  const recovered = await generate();
  expect(recovered.status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(2);
  expect(docs).toHaveLength(1);
});

test.each(["throw", "null"])("최종 저장 %s는 생성 결과를 보존하고 재생성 없이 완료한다", async fault => {
  finalSaveFault = fault;

  const unavailable = await generate();

  expect(unavailable.status).toBe(503);
  await expect(unavailable.json()).resolves.toMatchObject({
    code: "RESULT_STORAGE_UNAVAILABLE",
    retryEligible: true,
    paymentRetainedForRetry: true,
  });
  expect(docs[0].status).toBe("delivery_pending");
  expect(docs[0].result.prashnaResult).toEqual(PRASHNA_FIXTURE_RESULT);

  const recovered = await generate();
  expect(recovered.status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(1);
  expect(docs).toHaveLength(1);
});

test("최종 저장 응답이 유실돼도 재조회로 완료를 확정하고 같은 결과를 재열람한다", async () => {
  finalSaveFault = "lost";

  const first = await generate();
  expect(first.status).toBe(200);
  expect(docs[0].status).toBe("completed");

  const reopened = await generate();
  expect(reopened.status).toBe(200);
  await expect(reopened.json()).resolves.toMatchObject({
    idempotent: true,
    promptText: PRASHNA_FIXTURE_RESULT.promptText,
  });
  expect(provider).toHaveBeenCalledTimes(1);
  expect(docs).toHaveLength(1);
});
