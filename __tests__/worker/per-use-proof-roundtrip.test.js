/**
 * @jest-environment node
 *
 * 회당 결제 증빙의 **왕복** 계약 — 쓰는 쪽과 읽는 쪽을 한 테스트 안에서 잇는다.
 *
 * 왜 이 파일이 필요한가: 월정석 결제는 `worker/payments/moonstone.js`(writer)가 원장에 남기고
 * `worker/lib/nakshatra-paid-access.js`(reader)가 그것을 찾아 증빙한다. 두 파일은 서로를 import
 * 하지 않아서 필드명이 한쪽에서만 바뀌어도 아무도 모른다. 실제로 그렇게 깨졌다 — V2 컷오버가
 * PointHistory 쓰기를 없애고 멱등키를 `sourceId` 로 옮겼는데, reader 는 원장 스키마에 존재하지도
 * 않는 top-level `requestId`/`idempotencyKey` 를 계속 찾고 있었다. 그래서 **월정석으로 결제한
 * 사용자가 차감만 당하고 402(미결제)를 받았다**(초융합 운세 ₩30,000 실사고).
 *
 * 기존 단위 테스트가 이걸 못 잡은 이유는 원장 조회를 쿼리와 무관하게 행을 돌려주도록 mock 했기
 * 때문이다. 여기서는 **실제 writer 가 만든 행**을 **실제 reader 의 쿼리**로 평가한다
 * (fixture 의 matches 는 진짜 연산자 구현이라 통과시켜 주는 스텁이 아니다).
 *
 * 🔴 이 파일을 mock 으로 우회하지 말 것 — 우회하는 순간 이 가드는 아무것도 지키지 않는다.
 */
import { jest } from "@jest/globals";
import * as mongooseModule from "mongoose";
import { makeFakePaymentDb, matches } from "../fixtures/fake-payment-db.mjs";

const USER_ID = "507f1f77bcf86cd799439011";
const FUSION_FEATURE_KEY = "fusion-fortune-consultation";
const OTHER_FEATURE_KEY = "fortune-chat-consultation";
/** 초융합 클라이언트가 실제로 만드는 모양 — app/fusion-fortune/FusionFortuneClient.tsx */
const REQUEST_ID = "fusion-fortune-consultation:1755300000000-a1b2c3d";

const PRODUCT = Object.freeze({
  productId: FUSION_FEATURE_KEY,
  featureKey: FUSION_FEATURE_KEY,
  label: "초융합 운세 상담 1회",
  priceKRW: 30000,
  priceCoins: 300,
  monthlyCost: 3000,
});

// 프로덕션에 실제로 존재하는 unique 인덱스(2026-08-11 실측). 예약 멱등이 여기 기댄다.
const makeLedgerDb = () => makeFakePaymentDb({ uniqueKeys: [["userId", "type", "sourceId"]] });

/** reader 가 쓰는 Mongoose 체이닝(.select().lean())을 흉내내되, 필터는 **실제로 평가한다.** */
function findOneOver(getRows) {
  return (filter) => ({
    select: () => ({ lean: async () => getRows().find((row) => matches(row, filter)) || null }),
  });
}

/** writer 가 남긴 행들. 각 테스트가 spendMoonstone 을 돌린 뒤 여기에 꽂는다. */
const ledgerRows = [];
let userDoc = { _id: USER_ID, role: "user" };

let spendMoonstone;
let verifyPerUsePayment;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: async () => {},
      withMongoRetry: async (_env, run) => run(),
      isTransientMongoError: () => false,
      // 아래 셋은 worker/payments/db.js 가 모듈 최상단에서 읽는다. 이 테스트는 db 핸들을
      // 직접 넘기므로 실제로 호출되지는 않지만, import 가 살아 있어야 그래프가 뜬다.
      connectPaymentDb: async () => {},
      resetPaymentConnection: () => {},
      mongoose: mongooseModule.default || mongooseModule,
    })),
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      isAuthDbInfraError: () => false,
    })),
    /* 모델은 writer·reader 양쪽에 같은 객체로 주입된다. writer 는 db 핸들에 넘기는 식별자로만
       쓰고, reader 는 여기 붙은 findOne 으로 실제 조회한다. 결제·코인 경로는 이 시나리오에
       존재하지 않으므로 빈 컬렉션이다(월정석만으로 증빙돼야 한다는 것이 이 테스트의 요지다). */
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      Payment: { findOne: findOneOver(() => []) },
      PointHistory: { findOne: findOneOver(() => []) },
      MonthlyCreditLedger: { findOne: findOneOver(() => ledgerRows) },
      User: { findById: () => ({ select: () => ({ lean: async () => userDoc }) }) },
      // monthly-credit-store.js 가 모듈 최상단에서 읽는다(lot CAS 는 주입으로 대체하지만 import 는 산다).
      RECENT_CONSUME_REQUEST_ID_CAP: 50,
    })),
  ]);

  ({ spendMoonstone } = await import("../../worker/payments/moonstone.js"));
  ({ verifyPerUsePayment } = await import("../../worker/lib/nakshatra-paid-access.js"));
});

beforeEach(() => {
  ledgerRows.length = 0;
  userDoc = { _id: USER_ID, role: "user" };
});

/** writer 를 실제로 돌려 원장 행을 만들고, 그 행을 reader 가 보는 컬렉션에 그대로 싣는다. */
async function runWriter({ product = PRODUCT, purchaseId = REQUEST_ID, consumeLots } = {}) {
  const db = makeLedgerDb();
  const deduct = consumeLots || (async () => ({ ok: true, reason: "OK", balance: 5000, user: null }));
  try {
    await spendMoonstone(db, { userId: USER_ID, product, purchaseId }, { consumeLots: deduct });
  } finally {
    ledgerRows.push(...db.rows);
  }
  return db;
}

const proveFusion = () => verifyPerUsePayment({}, {
  userId: USER_ID,
  featureKey: FUSION_FEATURE_KEY,
  coinPrice: 300,
  requestId: REQUEST_ID,
});

describe("월정석 차감 → 회당 결제 증빙", () => {
  test("🔴 정산까지 끝난 월정석 차감은 증빙된다 (초융합 402 실사고의 재현)", async () => {
    await runWriter();
    // writer 가 실제로 남긴 것이 원장 한 행뿐임을 못 박는다 — PointHistory 로 되돌아가면 여기서 깨진다.
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0]).toMatchObject({ type: "MONTHLY_CREDIT_SPEND", serviceKey: FUSION_FEATURE_KEY });

    await expect(proveFusion()).resolves.toMatchObject({ proven: true, source: "monthly" });
  });

  test("같은 requestId 재시도(멱등 replay)도 증빙된다 — 추가 결제 없이 결과를 받아야 한다", async () => {
    await runWriter();
    await expect(proveFusion()).resolves.toMatchObject({ proven: true, source: "monthly" });
    await expect(proveFusion()).resolves.toMatchObject({ proven: true, source: "monthly" });
  });

  test("🔴 미정산 예약행은 증빙이 아니다 — 차감되지 않은 요청이 무료로 열리면 매출 누수다", async () => {
    // 예약 직후 차감 단계에서 아이솔레이트가 죽은 상태. 예약 행만 남고 잔액은 그대로다.
    await expect(runWriter({
      consumeLots: async () => { throw new Error("isolate killed"); },
    })).rejects.toThrow("isolate killed");
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0].settledAt).toBeUndefined();

    await expect(proveFusion()).resolves.toMatchObject({ proven: false });
  });

  test("다른 기능의 월정석 차감은 이 기능의 증빙이 되지 않는다", async () => {
    await runWriter({ product: { ...PRODUCT, productId: OTHER_FEATURE_KEY, featureKey: OTHER_FEATURE_KEY } });
    await expect(proveFusion()).resolves.toMatchObject({ proven: false });
  });

  test("다른 requestId 의 차감은 이 요청의 증빙이 되지 않는다", async () => {
    await runWriter({ purchaseId: "fusion-fortune-consultation:1755300000000-zzzzzzz" });
    await expect(proveFusion()).resolves.toMatchObject({ proven: false });
  });
});
