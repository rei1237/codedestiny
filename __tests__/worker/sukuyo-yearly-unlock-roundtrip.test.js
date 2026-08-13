/**
 * @jest-environment node
 *
 * payments V2 가 **지급한** 권한을 숙요 1년운 리더가 **찾을 수 있는지** 고정한다.
 *
 * 실사고(2026-08-13): worker/payments/entitlements.js 의 resolveEntitlementIdentity 가
 * serviceKey 를 `serviceKey || featureKey` 로 접었다. 그래서 V2 로 결제된 행은
 * serviceKey="sukyo_yearly_fortune_unlock" 으로 저장됐는데, 리더
 * (worker/routes/sukuyo.js findSukuyoYearlyUnlock)는 serviceKey 를 ["sukuyo","ziwei","saju"] 로
 * 필터한다 — 영영 매칭되지 않는다. 결제는 성공했는데 콘텐츠는 계속 잠긴 채였다.
 *
 * 🔴 이 파일이 존재하는 이유: 쓰기 테스트(payments-v2.entitlements)와 읽기 테스트
 * (content-unlock-roundtrip)가 **각각은 통과하면서** 그 사이의 불일치를 아무도 못 봤다.
 * 한쪽에서 실제로 쓴 문서를 다른 쪽의 실제 필터에 통과시키는 것만이 이 계약을 지킨다.
 * content-unlock-roundtrip.test.js 는 레거시 쓰기 경로(upsertPaidContentUnlock)를 보고,
 * 여기는 V2 지급 경로(grantEntitlement)를 본다.
 */

import { jest } from "@jest/globals";

const findOne = jest.fn();
const findOneAndUpdate = jest.fn();

let grantEntitlement;
let findActivePaidContentUnlockByServiceKeys;
let makeFakePaymentDb;

beforeAll(async () => {
  await jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER" },
    CONTENT_ENTITLEMENT_SOURCES: {
      COIN: "COIN",
      PAYMENT: "PAYMENT",
      PASS: "PASS",
      MONTHLY: "MONTHLY",
      ADMIN: "ADMIN",
      BACKFILL: "BACKFILL",
    },
    CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE", REFUNDED: "REFUNDED", CANCELLED: "CANCELLED" },
    ContentEntitlement: { findOne, findOneAndUpdate },
    SAJU_LOCKED_CONTENT_KEYS: {
      DAEUN_ANALYSIS: "saju.daeunAnalysis",
      FULL_READING: "saju.fullReading",
      COMPATIBILITY: "saju.compatibility",
    },
    User: {},
  }));
  ({ grantEntitlement } = await import("../../worker/payments/entitlements.js"));
  ({ findActivePaidContentUnlockByServiceKeys } = await import("../../worker/lib/content-unlocks.js"));
  ({ makeFakePaymentDb } = await import("../fixtures/fake-payment-db.mjs"));
});

/* 이 파일이 쓰는 연산자만 지원하는 최소 매처($and/$or/$in/$gt/$exists/동등).
   fake-payment-db 의 matches 는 $and 를 모르고, 읽기 필터는 $and 를 쓴다.
   필터를 문자열로 비교하면 구조가 바뀔 때마다 깨지므로 "문서가 필터에 매칭되는가"를 본다.
   (동일 목적의 사본이 content-unlock-roundtrip.test.js 에도 있다.) */
function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$and") return condition.every((clause) => matchesFilter(doc, clause));
    if (key === "$or") return condition.some((clause) => matchesFilter(doc, clause));
    return matchesValue(doc[key], condition);
  });
}

function matchesValue(value, condition) {
  if (condition === null) return value === null || value === undefined;
  if (typeof condition !== "object") return value === condition;
  if ("$in" in condition) return condition.$in.includes(value);
  if ("$gt" in condition) return value != null && value > condition.$gt;
  if ("$exists" in condition) return (value !== undefined) === condition.$exists;
  return value === condition;
}

const YEARLY_PRODUCT_KEY = "sukyo_yearly_fortune_unlock";
const USER_ID = "507f1f77bcf86cd799439011";
const PROFILE_ID = "profile-1";
const PRODUCT = {
  productId: YEARLY_PRODUCT_KEY,
  featureKey: YEARLY_PRODUCT_KEY,
  priceKRW: 10000,
  priceCoins: 100,
};

// worker/payments/index.js:593 카드 확정 지급이 넘기는 인자와 같은 모양이어야 한다.
function cardConfirmGrantInput(targetYear) {
  return {
    userId: USER_ID,
    product: PRODUCT,
    orderId: `cdorder-${targetYear}`,
    paymentId: `imp-${targetYear}`,
    profileId: PROFILE_ID,
    contentKey: `${YEARLY_PRODUCT_KEY}:${targetYear}`,
    scope: "",
  };
}

// worker/routes/sukuyo.js findSukuyoYearlyUnlock 이 넘기는 인자와 같은 모양이어야 한다.
function yearlyReadInput(targetYear) {
  return {
    userId: USER_ID,
    profileId: PROFILE_ID,
    featureKey: YEARLY_PRODUCT_KEY,
    serviceKeys: ["sukuyo", "ziwei", "saju"],
    contentKey: `${YEARLY_PRODUCT_KEY}:${targetYear}`,
  };
}

function capturedReadFilter() {
  return findOne.mock.calls[findOne.mock.calls.length - 1][0];
}

beforeEach(() => {
  findOne.mockReset();
  findOneAndUpdate.mockReset();
  findOne.mockReturnValue({ lean: async () => null });
});

test("🔴 V2 카드 확정이 지급한 1년운 권한을 리더가 그대로 찾아낸다", async () => {
  const db = makeFakePaymentDb();
  const granted = await grantEntitlement(db, cardConfirmGrantInput(2026));
  expect(granted.alreadyOwned).toBe(false);

  const stored = db.rows[0];
  // 유도 정본을 쓰지 않고 featureKey 로 접으면 여기서 먼저 깨진다.
  expect(stored.serviceKey).toBe("sukuyo");
  expect(stored.contentKey).toBe(`${YEARLY_PRODUCT_KEY}:2026`);
  expect(stored.scope).toBe("PROFILE");
  expect(stored.profileId).toBe(PROFILE_ID);

  await findActivePaidContentUnlockByServiceKeys(yearlyReadInput(2026));
  expect(matchesFilter(stored, capturedReadFilter())).toBe(true);
});

test("연도가 다르면 이미 산 해의 권한이 열리지 않는다", async () => {
  const db = makeFakePaymentDb();
  await grantEntitlement(db, cardConfirmGrantInput(2026));
  const stored = db.rows[0];

  await findActivePaidContentUnlockByServiceKeys(yearlyReadInput(2027));
  expect(matchesFilter(stored, capturedReadFilter())).toBe(false);
});

test("한 프로필이 두 해를 따로 보유한다", async () => {
  const db = makeFakePaymentDb();
  await grantEntitlement(db, cardConfirmGrantInput(2026));
  await grantEntitlement(db, cardConfirmGrantInput(2027));
  expect(db.rows).toHaveLength(2);

  for (const year of [2026, 2027]) {
    const row = db.rows.find((item) => item.contentKey === `${YEARLY_PRODUCT_KEY}:${year}`);
    await findActivePaidContentUnlockByServiceKeys(yearlyReadInput(year));
    expect(matchesFilter(row, capturedReadFilter())).toBe(true);
  }
});

test("🔴 contentKey 를 안 실어 보내면(셸이 흘리던 결함) 연도별 조회가 그 행을 못 찾는다", async () => {
  // index.html _cdBuildDirectCheckoutPayload 가 contentKey 를 화이트리스트에서 빠뜨려
  // pricingSnapshot.contentKey 가 "" 였던 상태의 재현. 회귀하면 이 단언이 사실이 된다.
  const db = makeFakePaymentDb();
  await grantEntitlement(db, { ...cardConfirmGrantInput(2026), contentKey: "" });
  const stored = db.rows[0];
  expect(stored.contentKey).toBe(YEARLY_PRODUCT_KEY);

  await findActivePaidContentUnlockByServiceKeys(yearlyReadInput(2026));
  expect(matchesFilter(stored, capturedReadFilter())).toBe(false);
});

test("🔴 옛 serviceKey(=featureKey)로 남은 행이 있으면 재지급 대신 소유로 인정한다", async () => {
  // 과도기 가드. 이게 없으면 월정석·이용권 경로가 alreadyOwned=false 를 보고 **다시 차감**한다.
  const db = makeFakePaymentDb();
  db.rows.push({
    _id: "legacy-row",
    userId: USER_ID,
    profileId: PROFILE_ID,
    serviceKey: YEARLY_PRODUCT_KEY,
    contentKey: `${YEARLY_PRODUCT_KEY}:2026`,
    scope: "PROFILE",
    featureKey: YEARLY_PRODUCT_KEY,
    status: "ACTIVE",
  });

  const granted = await grantEntitlement(db, cardConfirmGrantInput(2026));
  expect(granted.alreadyOwned).toBe(true);
  expect(granted.entitlement._id).toBe("legacy-row");
  expect(db.rows).toHaveLength(1);
});

test("환불된 옛 행은 소유로 치지 않는다 — 다시 사면 정본 신원으로 지급된다", async () => {
  const db = makeFakePaymentDb();
  db.rows.push({
    _id: "refunded-row",
    userId: USER_ID,
    profileId: PROFILE_ID,
    serviceKey: YEARLY_PRODUCT_KEY,
    contentKey: `${YEARLY_PRODUCT_KEY}:2026`,
    scope: "PROFILE",
    featureKey: YEARLY_PRODUCT_KEY,
    status: "REFUNDED",
  });

  const granted = await grantEntitlement(db, cardConfirmGrantInput(2026));
  expect(granted.alreadyOwned).toBe(false);
  expect(db.rows).toHaveLength(2);
  expect(db.rows[1].serviceKey).toBe("sukuyo");
});
