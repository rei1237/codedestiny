/**
 * @jest-environment node
 *
 * 사주 영구 묶음의 읽기 별칭. 결제 때는 묶음 행 한 줄만 쓰고, 포함 키는 읽을 때 그 행으로 열린다.
 * 실제 쓰기(grantPermanentUnlock)가 만든 행을 실제 읽기 필터에 통과시켜 확인한다.
 */
import { jest } from "@jest/globals";
import { TEST_USER_ID, profileCardModel, testCard } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey } from "../../worker/lib/birth-key.js";
import { isPerUsePaidFeatureKey, PER_USE_PAID_FEATURE_KEYS } from "../../worker/lib/paid-feature-registry.js";
import { SAJU_BUNDLE_ALIAS_MEMBER_KEYS, SAJU_BUNDLE_FEATURE_KEY } from "../../worker/lib/saju-bundle-policy.js";

const rows = [];
const cards = [];
const userUpdateOne = jest.fn();

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$and") return condition.every((clause) => matchesFilter(doc, clause));
    if (key === "$or") return condition.some((clause) => matchesFilter(doc, clause));
    const value = doc[key];
    if (condition === null) return value === null || value === undefined;
    if (condition instanceof Date || typeof condition !== "object") return value === condition;
    if ("$in" in condition) return condition.$in.includes(value);
    if ("$gt" in condition) return value != null && value > condition.$gt;
    if ("$exists" in condition) return (value !== undefined) === condition.$exists;
    if ("$size" in condition) return Array.isArray(value) && value.length === condition.$size;
    throw new Error(`테스트 매처가 모르는 조건: ${key} ${JSON.stringify(condition)}`);
  });
}

const entitlementModel = {
  findOne(filter) {
    const query = {
      select: () => query,
      session: () => query,
      lean: async () => rows.find((row) => matchesFilter(row, filter)) || null,
    };
    return query;
  },
  find(filter) {
    const query = {
      select: () => query,
      lean: async () => rows.filter((row) => matchesFilter(row, filter)),
    };
    return query;
  },
  findOneAndUpdate(identity, update) {
    const run = async () => {
      let row = rows.find((candidate) => matchesFilter(candidate, identity));
      if (!row) {
        row = { ...identity, ...update.$setOnInsert };
        rows.push(row);
      }
      Object.assign(row, update.$set);
      return row;
    };
    const query = { session: () => query, lean: run, then: (resolve, reject) => run().then(resolve, reject) };
    return query;
  },
  updateMany(filter, update) {
    const run = async () => {
      const matched = rows.filter((row) => matchesFilter(row, filter));
      matched.forEach((row) => Object.assign(row, update.$set));
      return { matchedCount: matched.length, modifiedCount: matched.length };
    };
    const query = { session: () => query, then: (resolve, reject) => run().then(resolve, reject) };
    return query;
  },
};

let findActivePaidContentUnlock;
let grantPermanentUnlock;
let getUnlockedContentSnapshot;
let revokePaymentContentAccess;
let billingUtils;
let resolvePersistedUnlockFeatures;
let handleAccessRoutes;
let PointHistory;

beforeAll(async () => {
  const actualModels = await import("../../worker/lib/models.js");
  const actualDb = await import("../../worker/lib/db.js");
  const actualAuth = await import("../../worker/lib/auth.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    ...actualDb,
    connectDb: async () => undefined,
    withMongoRetry: async (_env, callback) => callback(),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    ...actualModels,
    ContentEntitlement: entitlementModel,
    ProfileCard: profileCardModel(cards),
    User: { updateOne: userUpdateOne },
  }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    ...actualAuth,
    requireUserFromRequest: async () => ({ userId: TEST_USER_ID }),
  }));

  ({
    findActivePaidContentUnlock,
    grantPermanentUnlock,
    getUnlockedContentSnapshot,
    revokePaymentContentAccess,
  } = await import("../../worker/lib/content-unlocks.js"));
  ({ __billingTestUtils: billingUtils } = await import("../../worker/routes/billing.js"));
  ({ resolvePersistedUnlockFeatures } = (await import("../../worker/routes/fortune.js")).__fortuneAccessTestUtils);
  ({ handleAccessRoutes } = await import("../../worker/routes/access.js"));
  ({ PointHistory } = await import("../../worker/lib/models.js"));
});

beforeEach(() => {
  rows.length = 0;
  cards.length = 0;
  cards.push(testCard("profile-1"), testCard("profile-2", { day: 18 }));
  userUpdateOne.mockReset();
  userUpdateOne.mockImplementation(() => {
    const query = { session: () => query, then: (resolve) => Promise.resolve({ modifiedCount: 0 }).then(resolve) };
    return query;
  });
  globalThis.__paidAccessDecisionCache?.entries?.clear?.();
  globalThis.__codeDestinyAccessUnlocksCache?.entries?.clear?.();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const lookup = (featureKey, profileId = "profile-1", extra = {}) => findActivePaidContentUnlock({
  userId: TEST_USER_ID,
  profileId,
  featureKey,
  ...extra,
});

const grant = (featureKey, orderId, profileId = "profile-1") => grantPermanentUnlock({
  userId: TEST_USER_ID,
  profileId,
  featureKey,
  source: "PAYMENT",
  orderId,
});

const grantBundle = (profileId = "profile-1") => grant(SAJU_BUNDLE_FEATURE_KEY, "order-bundle", profileId);

test("묶음 행은 같은 출생 정보의 포함 키를 연다", async () => {
  await grantBundle();

  expect(await lookup("section_daewun")).toBeTruthy();
  for (const key of SAJU_BUNDLE_ALIAS_MEMBER_KEYS) {
    expect({ key, open: Boolean(await lookup(key)) }).toEqual({ key, open: true });
  }
  // featureKey 없이 contentKey 만 넘기는 호출자(hasUnlockedContent)도 같은 결과를 받는다.
  expect(await findActivePaidContentUnlock({
    userId: TEST_USER_ID,
    profileId: "profile-1",
    serviceKey: "saju",
    contentKey: "saju.daeunAnalysis",
  })).toBeTruthy();
  // 궁합은 상대 프로필이 있어도 묶음을 산 본인 출생 정보로 판정한다.
  expect(await lookup("section_compat", "profile-1", { partnerProfileId: "profile-2" })).toBeTruthy();
  // 포함 키로 찾아도 합성 신원은 내보내지 않는다.
  expect((await lookup("section_daewun")).profileId).toBe("profile-1");
});

test("출생 정보를 고치면 닫히고 되돌리면 다시 열린다", async () => {
  await grantBundle();
  const card = cards.find((candidate) => candidate.profileId === "profile-1");
  const original = card.birth;

  card.birth = { ...original, day: 20 };
  expect(await lookup("section_daewun")).toBeNull();

  card.birth = original;
  expect(await lookup("section_daewun")).toBeTruthy();
  expect(rows.filter((row) => row.grantType === "permanent_unlock")).toHaveLength(1);
});

test("다른 프로필 출생 정보로는 열리지 않는다", async () => {
  await grantBundle();

  expect(await lookup("section_daewun", "profile-2")).toBeNull();
  expect(computeBirthKey(testCard("profile-2", { day: 18 }))).not.toBe(computeBirthKey(testCard("profile-1")));
});

test("묶음 행은 비포함 키를 열지 않는다", async () => {
  await grantBundle();

  expect(await lookup("saju-guardian-unlock")).toBeNull();
  expect(await lookup("love-code")).toBeNull();
});

test("회당 키 경계가 우선한다", async () => {
  await grantBundle();
  const perUseKey = PER_USE_PAID_FEATURE_KEYS[0];

  expect(isPerUsePaidFeatureKey(perUseKey)).toBe(true);
  expect(await lookup(perUseKey)).toBeNull();
  expect(await lookup("saju_ai_question_prompt")).toBeNull();
});

test("개별 구매 뒤 묶음을 환불해도 개별 권리는 남는다", async () => {
  await grant("section_daewun", "order-daewun");
  await grantBundle();
  expect(await lookup("rpt_quantumCard")).toBeTruthy();

  const result = await revokePaymentContentAccess({
    payment: {
      userId: TEST_USER_ID,
      orderId: "order-bundle",
      featureKey: SAJU_BUNDLE_FEATURE_KEY,
      pricingSnapshot: { profileId: "profile-1", birthKey: computeBirthKey(testCard("profile-1")) },
    },
  });

  expect(result.entitlementModifiedCount).toBe(1);
  expect(await lookup("section_daewun")).toBeTruthy();
  expect(await lookup("rpt_quantumCard")).toBeNull();
  expect(await lookup(SAJU_BUNDLE_FEATURE_KEY)).toBeNull();
});

test("묶음 코인 게이트는 포함 키 보유와 무관하게 290코인을 한 번만 차감한다", async () => {
  const pricing = { featureKey: SAJU_BUNDLE_FEATURE_KEY, coinPrice: 290, cost: 290 };
  const decide = () => billingUtils.resolvePaidContentAccess({}, {
    userId: TEST_USER_ID,
    profileId: "profile-1",
    pricing,
    subscriptionPass: { isActive: false, tier: "free", passTier: null, freeLimit: 0, profileSubscription: null, entitlement: {} },
    accountUnlockedFeatures: [],
  });
  await grant("section_daewun", "order-daewun");

  // 포함 키를 이미 샀어도 묶음 값 290코인을 그대로 요구한다.
  const first = await decide();
  expect(first).toMatchObject({ accessGranted: false, reason: "payment_required", priceCoin: 290 });

  await grantBundle();
  globalThis.__paidAccessDecisionCache.entries.clear();
  const rowCountAfterPurchase = rows.length;

  // 재호출은 묶음 행 자체로 already_unlocked 이고, 게이트가 행이나 계정을 건드리지 않는다.
  const second = await decide();
  expect(second).toMatchObject({ accessGranted: true, reason: "already_unlocked" });
  const bundleRow = rows.find((row) => row.featureKey === SAJU_BUNDLE_FEATURE_KEY);
  expect(second.unlockId).toBe(String(bundleRow._id || `user:${SAJU_BUNDLE_FEATURE_KEY}`));
  expect(rows).toHaveLength(rowCountAfterPurchase);
  expect(userUpdateOne).not.toHaveBeenCalled();
});

test("스냅샷은 묶음 행을 포함 키로 펼친다", async () => {
  await grantBundle();

  const owned = await getUnlockedContentSnapshot({ userId: TEST_USER_ID, profileId: "profile-1" });
  expect(owned.featureKeys).toEqual(expect.arrayContaining([...SAJU_BUNDLE_ALIAS_MEMBER_KEYS, SAJU_BUNDLE_FEATURE_KEY]));
  // billing 의 프로필 해금 판정은 contentKeys 를 본다.
  expect(owned.contentKeys).toEqual(expect.arrayContaining(["saju.daeunAnalysis", "saju.fullReading", "saju.compatibility", "rpt_quantumCard"]));
  expect(owned.unlockMap.section_daewun).toBe(true);
  // 실제 행은 한 줄 그대로다.
  expect(owned.docs).toHaveLength(1);

  const other = await getUnlockedContentSnapshot({ userId: TEST_USER_ID, profileId: "profile-2" });
  for (const key of SAJU_BUNDLE_ALIAS_MEMBER_KEYS) expect(other.featureKeys).not.toContain(key);
  expect(other.contentKeys).toEqual([]);
});

test("잠금 조회 응답도 묶음 행을 포함 키로 펼친다", async () => {
  await grantBundle();
  const response = await handleAccessRoutes(
    new Request("https://example.com/api/access/unlocks?profileId=profile-1&serviceKey=saju"),
    {},
  );
  const payload = await response.json();

  for (const contentKey of ["saju.daeunAnalysis", "saju.fullReading", "saju.compatibility"]) {
    expect(payload.unlocks[contentKey].unlocked).toBe(true);
    expect(payload.unlockedContentKeys).toContain(contentKey);
  }
});

test("영구 해금 목록은 묶음 행의 포함 키를 내보낸다", async () => {
  jest.spyOn(PointHistory, "distinct").mockResolvedValue([]);
  await grantBundle();

  const keys = await resolvePersistedUnlockFeatures(TEST_USER_ID, [], "profile-1", {});
  expect(keys).toEqual(expect.arrayContaining(SAJU_BUNDLE_ALIAS_MEMBER_KEYS));

  // 계정 배열에 묶음 키가 있어도 프로필 없이는 포함 키를 열지 않는다.
  const withoutProfile = await resolvePersistedUnlockFeatures(TEST_USER_ID, [SAJU_BUNDLE_FEATURE_KEY], "", {});
  for (const key of SAJU_BUNDLE_ALIAS_MEMBER_KEYS) expect(withoutProfile).not.toContain(key);
});
