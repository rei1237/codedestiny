/**
 * @jest-environment node
 *
 * 해금 엔타이틀먼트의 쓰기와 읽기가 같은 행을 가리키는지 고정한다.
 *
 * 실사고: 숙요점 1년운 조회(worker/routes/sukuyo.js findSukuyoYearlyUnlock)가 featureKey 없이
 * 연도 접미사 contentKey 만 넘겨 계정(USER) 스코프로 해석됐고, 쓰기는 PROFILE 스코프로 남아
 * 결제해도 영영 잠긴 채였다. 쓰기·읽기 각각을 따로 보는 테스트는 이 비대칭을 못 잡는다 —
 * 실제 쓰기가 만든 문서를 실제 읽기 필터에 통과시켜야만 드러난다.
 */

import { jest } from "@jest/globals";

const findOneAndUpdate = jest.fn();
const findOne = jest.fn();

let upsertPaidContentUnlock;
let findActivePaidContentUnlockByServiceKeys;

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
    ContentEntitlement: { findOneAndUpdate, findOne },
    SAJU_LOCKED_CONTENT_KEYS: {
      DAEUN_ANALYSIS: "saju.daeunAnalysis",
      FULL_READING: "saju.fullReading",
      COMPATIBILITY: "saju.compatibility",
    },
    User: {},
  }));
  ({ upsertPaidContentUnlock, findActivePaidContentUnlockByServiceKeys } = await import("../../worker/lib/content-unlocks.js"));
});

// 이 파일이 쓰는 연산자만 지원하는 최소 매처($in/$or/$and/$gt/$exists/동등). 실제 필터를
// 문자열로 비교하면 구조가 바뀔 때마다 깨지므로, 문서가 필터에 매칭되는지를 본다.
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

// upsert 가 실제로 만들 문서를 findOneAndUpdate 인자에서 재구성한다.
function capturedDocument() {
  const [identity, update] = findOneAndUpdate.mock.calls[0];
  return {
    ...update.$setOnInsert,
    ...update.$set,
    userId: identity.userId,
    profileId: identity.profileId,
    scope: identity.scope,
  };
}

function capturedReadFilter() {
  return findOne.mock.calls[0][0];
}

const YEARLY_PRODUCT_KEY = "sukyo_yearly_fortune_unlock";
const WRITE_INPUT = {
  userId: "user-1",
  profileId: "profile-1",
  featureKey: YEARLY_PRODUCT_KEY,
  serviceKey: "sukuyo",
  contentKey: `${YEARLY_PRODUCT_KEY}:2026`,
  source: "PAYMENT",
  orderId: "order-1",
};

// worker/routes/sukuyo.js findSukuyoYearlyUnlock 이 넘기는 인자와 같은 모양이어야 한다.
const READ_INPUT = {
  userId: "user-1",
  profileId: "profile-1",
  featureKey: YEARLY_PRODUCT_KEY,
  serviceKeys: ["sukuyo", "ziwei", "saju"],
  contentKey: `${YEARLY_PRODUCT_KEY}:2026`,
};

beforeEach(() => {
  findOneAndUpdate.mockReset();
  findOne.mockReset();
  findOneAndUpdate.mockReturnValue({ session: jest.fn(), lean: async () => ({ _id: "row" }) });
  findOne.mockReturnValue({ lean: async () => null });
});

test("결제로 남긴 1년운 해금 행을 조회 필터가 그대로 찾아낸다", async () => {
  await upsertPaidContentUnlock(WRITE_INPUT);
  const stored = capturedDocument();
  expect(stored.scope).toBe("PROFILE");
  expect(stored.profileId).toBe("profile-1");
  expect(stored.contentKey).toBe(`${YEARLY_PRODUCT_KEY}:2026`);

  await findActivePaidContentUnlockByServiceKeys(READ_INPUT);
  const filter = capturedReadFilter();
  expect(matchesFilter(stored, filter)).toBe(true);
  expect(filter.serviceKey.$in).toContain("sukuyo");
});

test("featureKey 를 빼면 조회가 계정 스코프로 떨어져 같은 행을 놓친다", async () => {
  await upsertPaidContentUnlock(WRITE_INPUT);
  const stored = capturedDocument();

  const { featureKey, ...withoutFeatureKey } = READ_INPUT;
  await findActivePaidContentUnlockByServiceKeys(withoutFeatureKey);

  // 회귀 재발 시 이 단언이 먼저 깨진다 — featureKey 는 선택 인자가 아니다.
  expect(matchesFilter(stored, capturedReadFilter())).toBe(false);
});

test("다른 연도 조회는 이미 산 연도의 행을 열어 주지 않는다", async () => {
  await upsertPaidContentUnlock(WRITE_INPUT);
  const stored = capturedDocument();

  await findActivePaidContentUnlockByServiceKeys({ ...READ_INPUT, contentKey: `${YEARLY_PRODUCT_KEY}:2027` });

  expect(matchesFilter(stored, capturedReadFilter())).toBe(false);
});

test("레거시 serviceKey(ziwei/saju)로 남은 행도 계속 매칭된다", async () => {
  await upsertPaidContentUnlock({ ...WRITE_INPUT, serviceKey: "ziwei" });
  const stored = { ...capturedDocument(), serviceKey: "ziwei" };

  await findActivePaidContentUnlockByServiceKeys(READ_INPUT);

  expect(matchesFilter(stored, capturedReadFilter())).toBe(true);
});
