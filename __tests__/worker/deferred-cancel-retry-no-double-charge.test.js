/**
 * @jest-environment node
 *
 * 지연차감 cancel 이후 같은 requestId 로 재시도할 때 고객이 두 번 결제하지 않게 하는 계약.
 *
 *  R3  POST /coin-gate/deferred/cancel 이 이미 환불·취소된 PaidExecutionRecord 를 generation_failed 로
 *      되살리면 안 된다(환불된 기록이 다시 "이용 가능"이 된다). 읽은 뒤 환불이 끼어드는 경쟁도 CAS 로 막는다.
 *  F3  cancel 이 남기는 generation_failed 기록은 같은 requestId 재시도의 증빙으로 인정돼야 한다. 세 AI 라우트의
 *      증빙 조회가 이 상태를 빼먹으면 재시도가 402 → 고객이 이중 결제를 요구받는다.
 *
 * R3 먼저: F3 만 고치면 증빙 범위가 넓어져 부활 경로가 세 라우트로 더 퍼진다.
 *
 * handleDeferredUsageCancel 은 billing.js 에서 실제 함수 본문을 꺼내 실행한다(DB 협력자만 메모리로 대체).
 * 필터는 fixture 의 실제 연산자 구현(matches)으로 평가한다 — 필터와 무관하게 행을 돌려주는 스텁이면 CAS 검증이 죽는다.
 */
import { jest } from "@jest/globals";
import fs from "node:fs";
import vm from "node:vm";
import * as mongooseModule from "mongoose";
import ts from "typescript";
import { matches } from "../fixtures/fake-payment-db.mjs";

const USER_ID = "507f1f77bcf86cd799439011";
const OTHER_RECORD_ID = "507f1f77bcf86cd799439012";
const REQUEST_ID = "deferred-cancel-retry:1755300000000-a1b2c3d";
const ACTIVE = ["paid_pending_generation", "generating", "generation_failed"];

let rows = [];
let lastFilter = null;

function loadCancelHandler(findRecord) {
  const path = new URL("../../worker/routes/billing.js", import.meta.url);
  const source = fs.readFileSync(path, "utf8");
  const ast = ts.createSourceFile("billing.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const node = ast.statements.find((item) => ts.isFunctionDeclaration(item) && item.name?.text === "handleDeferredUsageCancel");
  if (!node) throw new Error("handleDeferredUsageCancel not found");
  const context = vm.createContext({
    String, Request, Response,
    readJson: (request) => request.json(),
    resolvePricingFromBody: () => ({ ok: true, pricing: { featureKey: "new-year-ai-consultation" } }),
    requireBillingAuth: async () => ({ ok: true, auth: { userId: USER_ID } }),
    resolveRequestId: () => REQUEST_ID,
    findDeferredUsageRecord: findRecord,
    success: (data) => Response.json({ ok: true, data }),
    PaidExecutionRecord: {
      updateOne: async (filter, update) => {
        lastFilter = filter;
        const row = rows.find((item) => matches(item, filter));
        if (row) Object.assign(row, update.$set);
        return { matchedCount: row ? 1 : 0, modifiedCount: row ? 1 : 0 };
      },
    },
  });
  vm.runInContext(node.getText(ast), context);
  return () => context.handleDeferredUsageCancel(new Request("https://fixture.invalid", {
    method: "POST",
    body: JSON.stringify({ code: "GENERATION_FAILED", message: "provider down" }),
  }), {});
}

beforeEach(() => {
  rows = [];
  lastFilter = null;
});

describe("R3: cancel 은 환불·취소된 기록을 되살리지 않는다", () => {
  test.each(["refunded", "cancelled", "canceled"])("%s 기록은 200 으로 정리만 하고 상태를 그대로 둔다", async (status) => {
    rows.push({ _id: OTHER_RECORD_ID, userId: USER_ID, status });
    const cancel = loadCancelHandler(async () => rows[0]);

    const response = await cancel();

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ deferredUsage: true, status });
    expect(rows[0].status).toBe(status);
    expect(rows[0].error).toBeUndefined();
    expect(lastFilter).toBeNull(); // updateOne 자체를 부르지 않는다
  });

  test("completed 는 기존대로 건드리지 않는다", async () => {
    rows.push({ _id: OTHER_RECORD_ID, userId: USER_ID, status: "completed" });
    const response = await loadCancelHandler(async () => rows[0])();
    expect(response.status).toBe(200);
    expect(rows[0].status).toBe("completed");
    expect(lastFilter).toBeNull();
  });

  test("경쟁: generating 을 읽은 뒤 DB 가 refunded 로 바뀌면 updateOne 필터의 status.$in 이 막는다", async () => {
    rows.push({ _id: OTHER_RECORD_ID, userId: USER_ID, status: "refunded" });
    const staleRead = { _id: OTHER_RECORD_ID, userId: USER_ID, status: "generating", executionId: "exec-1" };
    const cancel = loadCancelHandler(async () => staleRead);

    const response = await cancel();

    expect(response.status).toBe(200);
    expect(lastFilter).toMatchObject({ _id: OTHER_RECORD_ID, userId: USER_ID, status: { $in: ACTIVE } });
    expect(rows[0].status).toBe("refunded"); // matched 0
    expect(rows[0].error).toBeUndefined();
  });

  test.each(ACTIVE)("회귀: %s 기록은 여전히 generation_failed 로 정리된다", async (status) => {
    rows.push({ _id: OTHER_RECORD_ID, userId: USER_ID, status, executionId: "exec-1" });
    const response = await loadCancelHandler(async () => ({ ...rows[0] }))();

    expect(response.status).toBe(200);
    expect(rows[0].status).toBe("generation_failed");
    expect(rows[0].error).toMatchObject({ code: "GENERATION_FAILED", message: "provider down" });
  });
});

/* ---- F3: 세 라우트의 증빙 조회 ---- */

function findOneOver(getRows) {
  return (filter) => {
    const chain = {
      select: () => chain,
      sort: () => chain,
      limit: () => chain,
      lean: async () => getRows().find((row) => matches(row, filter)) || null,
      then: (resolve, reject) => chain.lean().then(resolve, reject),
    };
    return chain;
  };
}

const recordRows = [];
const emptyModel = () => ({ findOne: findOneOver(() => []) });
let evidenceFinders;

beforeAll(async () => {
  const [db, models] = await Promise.all([
    import("../../worker/lib/db.js"),
    import("../../worker/lib/models.js"),
  ]);
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      ...db,
      connectDb: async () => {},
      withMongoRetry: async (_env, run) => run(),
      mongoose: mongooseModule.default || mongooseModule,
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      ...models,
      PaidExecutionRecord: { findOne: findOneOver(() => recordRows) },
      Payment: emptyModel(),
      PointHistory: emptyModel(),
      MonthlyCreditLedger: emptyModel(),
      User: { findById: () => ({ select: () => ({ lean: async () => ({ _id: USER_ID }) }) }) },
    })),
    jest.unstable_mockModule("../../worker/lib/moonstone-spend-proof.js", () => ({ findMoonstoneSpendEvidence: async () => null })),
    jest.unstable_mockModule("../../worker/routes/billing.js", () => ({
      BILLING_SNAPSHOT_USER_PROJECTION: "id",
      handleBillingRoutes: async () => new Response("{}"),
    })),
  ]);
  const [karma, newYear, loveSecret] = await Promise.all([
    import("../../worker/routes/karma-destiny-ai.js"),
    import("../../worker/routes/new-year-ai.js"),
    import("../../worker/routes/love-secret-ai.js"),
  ]);
  evidenceFinders = {
    "karma-destiny-ai": {
      featureKey: karma.__karmaDestinyAiTestUtils.FEATURE_KEY,
      find: () => karma.__karmaDestinyAiTestUtils.findBillingGateEvidence({ env: {}, userId: USER_ID, idempotencyKey: REQUEST_ID, body: {} }),
      deferredUsageFlag: true,
    },
    "new-year-ai": {
      featureKey: newYear.__newYearAiTestUtils.FEATURE_KEY,
      find: () => newYear.__newYearAiTestUtils.resolveBillingGateAccess({ env: {}, auth: { userId: USER_ID }, user: {}, body: {}, pricing: {}, idempotencyKey: REQUEST_ID }),
      deferredUsageFlag: true,
    },
    // love-secret 은 증빙을 billingEvidence.deferredUsage(객체)로 돌려주고 최상위 deferredUsage 플래그가 없다.
    "love-secret-ai": {
      featureKey: loveSecret.__loveSecretAiTestUtils.FEATURE_KEY,
      find: () => loveSecret.__loveSecretAiTestUtils.resolveBillingUsageEvidence({}, { userId: USER_ID }, { requestId: REQUEST_ID }),
      deferredUsageFlag: false,
    },
  };
});

beforeEach(() => {
  recordRows.length = 0;
});

describe.each(["karma-destiny-ai", "new-year-ai", "love-secret-ai"])("F3: %s 증빙 조회", (route) => {
  test("generation_failed 기록(cancel 이 남긴 것)은 같은 requestId 재시도의 증빙이다", async () => {
    const finder = evidenceFinders[route];
    const record = { _id: OTHER_RECORD_ID, userId: USER_ID, featureId: finder.featureKey, requestId: REQUEST_ID, status: "generation_failed" };
    recordRows.push(record);

    const evidence = await finder.find();

    expect(evidence).toMatchObject({ ok: true, paymentId: String(record._id) });
    if (finder.deferredUsageFlag) expect(evidence.deferredUsage).toBe(true);
    else expect(evidence.billingEvidence).toBeDefined();
  });

  test.each(["refunded", "cancelled"])("%s 기록은 증빙이 아니다", async (status) => {
    const finder = evidenceFinders[route];
    recordRows.push({ _id: OTHER_RECORD_ID, userId: USER_ID, featureId: finder.featureKey, requestId: REQUEST_ID, status });

    const evidence = await finder.find();

    expect(evidence?.ok).not.toBe(true);
  });

  test("generating 기록은 증빙이다(진행 중 재시도)", async () => {
    const finder = evidenceFinders[route];
    recordRows.push({ _id: OTHER_RECORD_ID, userId: USER_ID, featureId: finder.featureKey, requestId: REQUEST_ID, status: "generating" });

    expect((await finder.find())?.ok).toBe(true);
  });
});
