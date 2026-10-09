/**
 * @jest-environment node
 *
 * 자미두수 대한 흐름(ziwei_decade_luck)의 출생 기반 해금 계약(userId + birthKey + contentKey).
 * - 요청은 이 계정 소유의 저장 프로필 id 를 실어야 한다(없으면 400, 남의 것이면 403 — 둘 다 requiresProfile).
 * - 같은 생년월일의 다른 프로필로는 열리고, 다른 생년월일·레거시 USER/"__user__"/PROFILE 행으로는 열리지 않는다.
 * - 레거시 contentKey(ziwei.daehanTimeline)도 출생 분기로만 읽는다(계정 스코프 폴백 금지).
 */
import { jest } from "@jest/globals";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";

const requireAuth = jest.fn();
const handleBillingRoutes = jest.fn();
const entitlementFindOne = jest.fn();
const legacyPurchaseFindOne = jest.fn(async () => null);
const write = jest.fn(async () => { throw new Error("unexpected write"); });
const cards = [
  testCard("p1"),
  testCard("p2"), // p1 과 같은 생년월일
  testCard("p3", { day: 18 }), // 다른 생년월일
  testCard("x1", { userId: OTHER_USER_ID }),
];
const profileCards = profileCardModel(cards);

jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ requireAuth }));
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  withMongoRetry: async (_env, callback) => callback(),
  mongoose: {
    connection: {
      db: {
        collection: () => ({ findOne: legacyPurchaseFindOne, createIndex: jest.fn(async () => "ok") }),
      },
    },
  },
}));
jest.unstable_mockModule("../../worker/lib/db-scope-connection.js", () => ({ scopeConnection: () => null }));
jest.unstable_mockModule("../../worker/routes/billing.js", () => ({
  handleBillingRoutes,
  BILLING_SNAPSHOT_USER_PROJECTION: {},
}));
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER", BIRTH: "BIRTH" },
  CONTENT_ENTITLEMENT_SOURCES: {},
  CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE" },
  SAJU_LOCKED_CONTENT_KEYS: { DAEUN_ANALYSIS: "saju.daeunAnalysis", FULL_READING: "saju.fullReading", COMPATIBILITY: "saju.compatibility" },
  ContentEntitlement: { findOne: entitlementFindOne, findOneAndUpdate: write, create: write, updateOne: write },
  User: { findById: jest.fn(), exists: async () => null },
  ProfileCard: { modelName: "ProfileCard", findOne: (...args) => profileCards.findOne(...args) },
}));

let handleZiweiDaehanRoutes;
beforeAll(async () => {
  ({ handleZiweiDaehanRoutes } = await import("../../worker/routes/ziwei-daehan.js"));
});

const birthProfileId = (profileId) => toBirthEntitlementProfileId(computeBirthKey(cards.find((card) => card.profileId === profileId)));
let grants;

function matches(doc, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === "$and") return value.every((part) => matches(doc, part));
    if (key === "$or") return value.some((part) => matches(doc, part));
    if (value === null) return doc[key] == null;
    if (value && typeof value === "object") {
      if ("$in" in value) return value.$in.includes(doc[key]);
      if ("$gt" in value) return doc[key] != null && doc[key] > value.$gt;
      if ("$exists" in value) return (doc[key] !== undefined) === value.$exists;
    }
    return doc[key] === value;
  });
}

function grant(overrides = {}) {
  grants.push({
    _id: `grant-${grants.length + 1}`,
    userId: TEST_USER_ID,
    serviceKey: "ziwei",
    contentKey: "ziwei.decadeLuck",
    featureKey: "ziwei_decade_luck",
    status: "ACTIVE",
    scope: "BIRTH",
    profileId: birthProfileId("p1"),
    purchaseProfileId: "p1",
    expiresAt: null,
    ...overrides,
  });
}

async function status(query = "") {
  const response = await handleZiweiDaehanRoutes(new Request(`https://example.test/api/ziwei/daehan/status${query}`), {});
  return { status: response.status, body: await response.json() };
}

async function unlockPost(body = {}) {
  const response = await handleZiweiDaehanRoutes(new Request("https://example.test/api/ziwei/daehan", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }), {});
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  grants = [];
  requireAuth.mockReset().mockResolvedValue({ userId: TEST_USER_ID });
  handleBillingRoutes.mockReset().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { charged: true } }), { status: 200 }));
  legacyPurchaseFindOne.mockReset().mockResolvedValue(null);
  entitlementFindOne.mockReset().mockImplementation((query) => ({
    lean: async () => grants.find((row) => matches(row, query)) || null,
  }));
});

test("같은 생년월일의 다른 저장 프로필로도 열린다", async () => {
  grant();
  const result = await status("?profileId=p2");
  expect(result).toEqual({ status: 200, body: expect.objectContaining({ ok: true, isPurchased: true, profileId: "p2" }) });
});

test("레거시 contentKey(ziwei.daehanTimeline)의 BIRTH 행도 같은 생년월일로 열린다", async () => {
  grant({ contentKey: "ziwei.daehanTimeline" });
  expect((await status("?profileId=p2")).body.isPurchased).toBe(true);
});

test("다른 생년월일 프로필은 잠긴다", async () => {
  grant();
  expect((await status("?profileId=p3")).body).toMatchObject({ ok: true, isPurchased: false });
});

test.each([
  ["USER", { scope: "USER", profileId: "__user__" }],
  ["legacy-key USER", { scope: "USER", profileId: "__user__", contentKey: "ziwei.daehanTimeline" }],
  ["\"__user__\"", { scope: undefined, profileId: "__user__" }],
  ["PROFILE", { scope: "PROFILE", profileId: "p1" }],
])("레거시 %s 행은 근거가 아니다", async (_label, overrides) => {
  grant(overrides);
  expect((await status("?profileId=p1")).body.isPurchased).toBe(false);
});

test.each([
  ["no profileId", ""],
  ["synthetic birth id", "?profileId=birth:forged"],
])("%s → 400 MISSING_PROFILE_ID", async (_label, query) => {
  grant();
  const result = await status(query);
  expect(result.status).toBe(400);
  expect(result.body).toMatchObject({ ok: false, reason: "MISSING_PROFILE_ID", requiresProfile: true, message: "프로필을 저장한 뒤 구매해 주세요." });
  expect(entitlementFindOne).not.toHaveBeenCalled();
});

test("남의 프로필 id → 403 INVALID_PROFILE", async () => {
  grant();
  const result = await status("?profileId=x1");
  expect(result.status).toBe(403);
  expect(result.body).toMatchObject({ ok: false, reason: "INVALID_PROFILE", requiresProfile: true });
  expect(entitlementFindOne).not.toHaveBeenCalled();
});

test("구매 요청도 프로필이 없거나 남의 것이면 결제로 넘기지 않는다", async () => {
  expect((await unlockPost({})).status).toBe(400);
  expect((await unlockPost({ profileId: "x1" })).status).toBe(403);
  expect(handleBillingRoutes).not.toHaveBeenCalled();
});

test("같은 생년월일로 이미 산 경우 구매 요청은 결제로 넘기지 않는다", async () => {
  grant();
  const result = await unlockPost({ profileId: "p2" });
  expect(result.body).toMatchObject({ alreadyPurchased: true, isPurchased: true, profileId: "p2" });
  expect(handleBillingRoutes).not.toHaveBeenCalled();
});

test("다른 생년월일 프로필의 구매 요청은 그 프로필 id 로 결제에 넘긴다", async () => {
  grant();
  await unlockPost({ profileId: "p3" });
  expect(handleBillingRoutes).toHaveBeenCalledTimes(1);
  const forwarded = await handleBillingRoutes.mock.calls[0][0].json();
  expect(forwarded).toMatchObject({ featureKey: "ziwei_decade_luck", profileId: "p3", selectedProfileId: "p3" });
});
