/**
 * @jest-environment node
 *
 * 지연차감 등록 증빙 조회(`worker/lib/deferred-billing-proof.js`)의 계약.
 *
 * 왜 필요한가: 이 조회가 null 을 돌려주면 `/api/billing/coin-gate/deferred/register` 가 402 를 내고,
 * 클라이언트는 그것을 결제 실패로 번역한다 — **이미 결제한 사용자가 서비스를 못 받는다.**
 * 운명 찻집 단건결제에서 실제로 났고, 그 전에 월정석에서 같은 계열로 두 번 났다.
 *
 * 여기서 고정하는 것은 "이 조회가 놓치면 돈만 받는다"인 4개 갈래다. 필터는 fixture 의 실제 연산자
 * 구현(matches)으로 평가한다 — 쿼리와 무관하게 행을 돌려주는 스텁으로 바꾸면 이 가드는 죽는다.
 */
import { jest } from "@jest/globals";
import * as mongooseModule from "mongoose";
import { matches } from "../fixtures/fake-payment-db.mjs";

const USER_ID = "507f1f77bcf86cd799439011";
const FEATURE_KEY = "fortune-tea-house-consultation";
const REQUEST_ID = "fortune-tea-house-consultation:1755300000000-a1b2c3d";
const MERCHANT_UID = "cd_1755300000000_teahouse";

/** Mongoose 체이닝(select/sort/limit/lean 순서 무관)을 흉내내되 필터는 실제로 평가한다. */
function findOneOver(getRows) {
  return (filter) => {
    const chain = {
      select: () => chain,
      sort: () => chain,
      limit: () => chain,
      lean: async () => getRows().find((row) => matches(row, filter)) || null,
    };
    return chain;
  };
}
function findManyOver(getRows) {
  return (filter) => {
    const chain = {
      select: () => chain,
      sort: () => chain,
      limit: (count) => { chain.__limit = count; return chain; },
      lean: async () => {
        const hits = getRows().filter((row) => matches(row, filter));
        return Number.isFinite(chain.__limit) ? hits.slice(0, chain.__limit) : hits;
      },
    };
    return chain;
  };
}

const paymentRows = [];
const pointHistoryRows = [];
const ledgerRows = [];
const recordRows = [];
let userDoc = { _id: USER_ID };

let findVerifiedDeferredBillingEvidence;
let findDeferredBillingEvidenceWithSettleWindow;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: async () => {},
      withMongoRetry: async (_env, run) => run(),
      isTransientMongoError: () => false,
      mongoose: mongooseModule.default || mongooseModule,
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      Payment: { findOne: findOneOver(() => paymentRows) },
      PointHistory: { findOne: findOneOver(() => pointHistoryRows) },
      MonthlyCreditLedger: { findOne: findOneOver(() => ledgerRows), find: findManyOver(() => ledgerRows) },
      PaidExecutionRecord: { findOne: findOneOver(() => recordRows) },
      User: { findById: () => ({ select: () => ({ lean: async () => userDoc }) }) },
      RECENT_CONSUME_REQUEST_ID_CAP: 50,
    })),
    /* 이용권 마커 조립의 정본만 필요하다. payments/* 전체 그래프를 끌어오지 않는다
       (실제 코드도 같은 이유로 동적 import 를 쓴다). */
    jest.unstable_mockModule("../../worker/payments/passes.js", () => ({
      buildPassConsumeMarker: (featureKey, requestId) => (
        featureKey && requestId ? `tier-pass:${featureKey}:${requestId}` : ""
      ),
    })),
  ]);

  ({ findVerifiedDeferredBillingEvidence, findDeferredBillingEvidenceWithSettleWindow } = await import("../../worker/lib/deferred-billing-proof.js"));
});

beforeEach(() => {
  paymentRows.length = 0;
  pointHistoryRows.length = 0;
  ledgerRows.length = 0;
  recordRows.length = 0;
  userDoc = { _id: USER_ID };
});

/** 클라이언트가 register 에 싣는 실제 모양 — billing-client.ts registerDeferredBillingUsage. */
function registerBody(gate = {}) {
  return {
    requestId: REQUEST_ID,
    idempotencyKey: REQUEST_ID,
    featureKey: FEATURE_KEY,
    deferUsage: true,
    billingGate: { merchantUid: MERCHANT_UID, accessGrant: { purchaseId: REQUEST_ID }, ...gate },
  };
}

test("단건결제: featureKey 가 metadata 에만 있는 Payment 행도 증빙으로 인정한다", async () => {
  // 소비 라우트(fortune-tea-house.js)는 metadata.featureKey 를 이미 본다. register 만 못 봐서
  // 카드로 결제한 사용자가 402 를 받았다.
  paymentRows.push({
    _id: "6512f1f77bcf86cd79943901",
    userId: USER_ID,
    paymentType: "digital_content",
    status: "paid",
    merchantUid: MERCHANT_UID,
    metadata: { featureKey: FEATURE_KEY },
  });
  const evidence = await findVerifiedDeferredBillingEvidence({}, USER_ID, FEATURE_KEY, registerBody());
  expect(evidence).toMatchObject({ source: "payment", paymentMethod: "DIRECT_KRW", accessType: "single_purchase" });
});

test("이용권: 증빙 행이 없어도 소비 마커가 남아 있으면 인정한다", async () => {
  // payments/index.js 는 같은 requestId 재시도를 마커로 걸러 recordPassUsageEvidence 를 건너뛴다.
  // 그 경로에는 PointHistory 행이 아예 없다 — 마커가 유일한 증거다.
  userDoc = { _id: USER_ID, recentConsumeRequestIds: [`tier-pass:${FEATURE_KEY}:${REQUEST_ID}`] };
  const evidence = await findVerifiedDeferredBillingEvidence({}, USER_ID, FEATURE_KEY, registerBody());
  expect(evidence).toMatchObject({ source: "pass_consume_marker", paymentMethod: "PASS", accessType: "membership_pass" });
});

test("월정석: 정산이 끝난 원장 행을 정본 reader 로 찾는다", async () => {
  ledgerRows.push({
    _id: "6512f1f77bcf86cd79943902",
    userId: USER_ID,
    type: "MONTHLY_CREDIT_SPEND",
    serviceKey: FEATURE_KEY,
    sourceId: REQUEST_ID,
    settledAt: new Date().toISOString(),
    amount: -30,
  });
  const evidence = await findVerifiedDeferredBillingEvidence({}, USER_ID, FEATURE_KEY, registerBody());
  expect(evidence).toMatchObject({ source: "monthly_credit_ledger", paymentMethod: "MONTHLY" });
});

test("재시도: 이미 만들어진 지급행이 있으면 처음부터 다시 증빙을 찾지 않는다", async () => {
  recordRows.push({
    _id: "6512f1f77bcf86cd79943903",
    userId: USER_ID,
    featureId: FEATURE_KEY,
    status: "paid_pending_generation",
    requestId: REQUEST_ID,
    executionId: `deferred:${FEATURE_KEY}:${USER_ID}:${REQUEST_ID}`,
    result: { deferredUsage: { paymentMethod: "DIRECT_KRW", accessType: "single_purchase" } },
  });
  const evidence = await findVerifiedDeferredBillingEvidence({}, USER_ID, FEATURE_KEY, registerBody());
  expect(evidence).toMatchObject({ source: "paid_execution_record", paymentMethod: "DIRECT_KRW" });
});

test("전파 지연: 첫 조회에 없던 결제 행이 창 안에 나타나면 통과시킨다", async () => {
  const sleep = jest.fn(async () => {
    paymentRows.push({
      _id: "6512f1f77bcf86cd79943904",
      userId: USER_ID,
      paymentType: "digital_content",
      status: "paid",
      merchantUid: MERCHANT_UID,
      featureKey: FEATURE_KEY,
    });
  });
  const evidence = await findDeferredBillingEvidenceWithSettleWindow({}, USER_ID, FEATURE_KEY, registerBody(), { sleep });
  expect(evidence).toMatchObject({ source: "payment" });
  expect(sleep).toHaveBeenCalledTimes(1);
});

test("🔴 증빙이 끝내 없으면 창을 다 쓰고도 통과시키지 않는다(fail-closed)", async () => {
  const sleep = jest.fn(async () => {});
  const evidence = await findDeferredBillingEvidenceWithSettleWindow({}, USER_ID, FEATURE_KEY, registerBody(), { sleep });
  expect(evidence).toBeNull();
  expect(sleep).toHaveBeenCalledTimes(2);
});

test("남의 결제 행으로는 통과하지 않는다", async () => {
  paymentRows.push({
    _id: "6512f1f77bcf86cd79943905",
    userId: "507f1f77bcf86cd799439099",
    paymentType: "digital_content",
    status: "paid",
    merchantUid: MERCHANT_UID,
    featureKey: FEATURE_KEY,
  });
  const evidence = await findVerifiedDeferredBillingEvidence({}, USER_ID, FEATURE_KEY, registerBody());
  expect(evidence).toBeNull();
});
