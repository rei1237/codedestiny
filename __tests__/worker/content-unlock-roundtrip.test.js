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
import { TEST_USER_ID, profileCardModel, testCard } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, computeCompatBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";

const findOneAndUpdate = jest.fn();
const findOne = jest.fn();

const BIRTH_PROFILE_ID = toBirthEntitlementProfileId(computeBirthKey(testCard("profile-1")));

let upsertPaidContentUnlock;
let findActivePaidContentUnlockByServiceKeys;

beforeAll(async () => {
  await jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER", BIRTH: "BIRTH" },
    CONTENT_ENTITLEMENT_SOURCES: {
      COIN: "COIN",
      HONEY: "HONEY",
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
    ProfileCard: profileCardModel([testCard("profile-1")]),
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
  userId: TEST_USER_ID,
  profileId: "profile-1",
  featureKey: YEARLY_PRODUCT_KEY,
  serviceKey: "sukuyo",
  contentKey: `${YEARLY_PRODUCT_KEY}:2026`,
  source: "PAYMENT",
  orderId: "order-1",
};

// worker/routes/sukuyo.js findSukuyoYearlyUnlock 이 넘기는 인자와 같은 모양이어야 한다.
const READ_INPUT = {
  userId: TEST_USER_ID,
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
  // 출생 기반 키 — 행은 이 계정+생년월일에 걸리고, 산 프로필은 감사용으로만 남는다.
  expect(stored.scope).toBe("BIRTH");
  expect(stored.profileId).toBe(BIRTH_PROFILE_ID);
  expect(stored.purchaseProfileId).toBe("profile-1");
  expect(stored.contentKey).toBe(`${YEARLY_PRODUCT_KEY}:2026`);

  await findActivePaidContentUnlockByServiceKeys(READ_INPUT);
  const filter = capturedReadFilter();
  expect(matchesFilter(stored, filter)).toBe(true);
  expect(filter.serviceKey.$in).toContain("sukuyo");
});

test("featureKey 를 빼도 contentKey 로 출생 스코프를 정해 같은 행을 찾는다", async () => {
  await upsertPaidContentUnlock(WRITE_INPUT);
  const stored = capturedDocument();

  const { featureKey, ...withoutFeatureKey } = READ_INPUT;
  await findActivePaidContentUnlockByServiceKeys(withoutFeatureKey);

  // 출생 기반 여부는 서버가 키에서 정한다 — 호출자가 featureKey 를 흘려도 계정 스코프로 떨어지지 않는다.
  expect(matchesFilter(stored, capturedReadFilter())).toBe(true);
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


test("꿀방울 22종은 실제 영구 권리 쓰기와 기존 읽기가 같은 출생 행을 찾는다", async () => {
  const { HONEY_UNLOCK_PRODUCTS } = await import('../../worker/lib/honey-unlock-catalog.js');
  const { grantPermanentUnlock, findActivePaidContentUnlock } = await import('../../worker/lib/content-unlocks.js');
  const session = {};
  expect(HONEY_UNLOCK_PRODUCTS.filter(p => p.billingType === 'birth_unlock')).toHaveLength(22);
  for (const product of HONEY_UNLOCK_PRODUCTS.filter(p => p.billingType === 'birth_unlock')) {
    findOneAndUpdate.mockClear(); findOne.mockClear();
    const readQuery = { session: jest.fn(), lean: async () => null };
    findOne.mockReturnValue(readQuery);
    const target = { userId: TEST_USER_ID, profileId: 'profile-1', featureKey: product.featureKey, session };
    await grantPermanentUnlock({ ...target, source: 'HONEY', evidenceId: 'honey-receipt' });
    const stored = capturedDocument();
    expect(stored).toMatchObject({ source: 'HONEY', grantType: 'permanent_unlock', scope: 'BIRTH', profileId: BIRTH_PROFILE_ID });
    await findActivePaidContentUnlock(target);
    expect(matchesFilter(stored, capturedReadFilter())).toBe(true);
    expect(readQuery.session).toHaveBeenCalledWith(session);
    expect(findOneAndUpdate.mock.results[0].value.session).toHaveBeenCalledWith(session);
  }
});


test("등록된 영구 해금 상품은 기존 지급 서비스 키로 동일한 구매만 조회한다", async () => {
  const { BIRTH_SCOPED_UNLOCK_FEATURE_KEYS, ACCOUNT_SCOPED_UNLOCK_FEATURE_KEYS } = await import('../../worker/lib/paid-feature-registry.js');
  const { findActivePaidContentUnlock, resolvePaidContentServiceKey, resolvePaidContentUnlockTarget } = await import('../../worker/lib/content-unlocks.js');
  for (const featureKey of [...BIRTH_SCOPED_UNLOCK_FEATURE_KEYS, ...ACCOUNT_SCOPED_UNLOCK_FEATURE_KEYS]) {
    const input = { userId: TEST_USER_ID, profileId: 'profile-1', featureKey, ...(featureKey === 'section_compat' ? { partnerProfileId: 'profile-1' } : {}) };
    const target = resolvePaidContentUnlockTarget(input);
    const birthScoped = BIRTH_SCOPED_UNLOCK_FEATURE_KEYS.includes(featureKey);
    await findActivePaidContentUnlock(input);
    const filter = findOne.mock.calls.at(-1)[0];
    const base = { userId: TEST_USER_ID, contentKey: target.contentKey, status: 'ACTIVE', expiresAt: null,
      scope: birthScoped ? 'BIRTH' : 'USER', profileId: birthScoped ? (featureKey === 'section_compat' ? toBirthEntitlementProfileId(computeCompatBirthKey(testCard('profile-1'), testCard('profile-1'))) : BIRTH_PROFILE_ID) : '__user__' };
    for (const serviceKey of [resolvePaidContentServiceKey(featureKey, featureKey), resolvePaidContentServiceKey(featureKey), 'paid_content']) {
      expect({ featureKey, matches: matchesFilter({ ...base, serviceKey }, filter) }).toEqual({ featureKey, matches: true });
    }
    expect(matchesFilter({ ...base, serviceKey: featureKey, userId: 'another-user' }, filter)).toBe(false);
    expect(matchesFilter({ ...base, serviceKey: featureKey, contentKey: 'different-product' }, filter)).toBe(false);
    findOne.mockClear();
  }
});
