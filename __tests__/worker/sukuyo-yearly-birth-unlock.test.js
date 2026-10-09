/**
 * @jest-environment node
 *
 * 숙요 1년운 라우트의 출생 기반 해금 계약(userId + birthKey + contentKey).
 * - 요청은 이 계정 소유의 저장 프로필 id 를 실어야 한다(없으면 400, 남의 것이면 403 — 둘 다 requiresProfile).
 * - 같은 생년월일의 다른 프로필로는 열리고, 다른 생년월일·레거시 USER/PROFILE 행으로는 열리지 않는다.
 * - DB 오류는 503 으로 남는다.
 * 계산 경로(본문 → 결과)는 이 파일이 보지 않는다 — 1년운 결과는 ProfileCard 의 저장 출생 정보로만 만든다
 * (sukuyo-yearly-fortune.test.js 가 그 순수 함수를 직접 돈다).
 */
import { jest } from "@jest/globals";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";

const resolvePaidRouteAuth = jest.fn();
const entitlementFindOne = jest.fn();
const write = jest.fn(async () => { throw new Error("unexpected write"); });
const cards = [
  testCard("p1"),
  testCard("p2"), // p1 과 같은 생년월일
  testCard("p3", { day: 18 }), // 다른 생년월일
  testCard("x1", { userId: OTHER_USER_ID }),
];
const profileCards = profileCardModel(cards);
const profileCardFindOne = jest.fn((...args) => profileCards.findOne(...args));
const emptyQuery = () => {
  const query = { select: () => query, sort: () => query, lean: async () => null };
  return query;
};

jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
  getOptionalUserFromRequest: jest.fn(async () => null),
  requireAuth: jest.fn(),
  resolvePaidRouteAuth,
}));
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  withMongoRetry: async (_env, callback) => callback(),
}));
jest.unstable_mockModule("../../worker/lib/cms-records.js", () => ({ primeCmsRecords: jest.fn() }));
jest.unstable_mockModule("../../worker/lib/sukuyo-astronomy.js", () => ({
  calculateSukuyoForMoment: jest.fn(async () => { throw new Error("calculation must not run in these cases"); }),
}));
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER", BIRTH: "BIRTH" },
  CONTENT_ENTITLEMENT_SOURCES: { COIN: "COIN", PASS: "PASS", PAYMENT: "PAYMENT" },
  CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE" },
  SAJU_LOCKED_CONTENT_KEYS: { DAEUN_ANALYSIS: "saju.daeunAnalysis", FULL_READING: "saju.fullReading", COMPATIBILITY: "saju.compatibility" },
  ContentEntitlement: { findOne: entitlementFindOne, findOneAndUpdate: write, create: write, updateOne: write },
  User: { findById: jest.fn(() => emptyQuery()), exists: async () => null },
  PointHistory: { findOne: () => emptyQuery() },
  Payment: { findOne: () => emptyQuery() },
  ServiceExecutionTransaction: {},
  ProfileCard: { modelName: "ProfileCard", findOne: profileCardFindOne },
}));

let handleSukuyoRoutes;
let User;
beforeAll(async () => {
  ({ handleSukuyoRoutes } = await import("../../worker/routes/sukuyo.js"));
  ({ User } = await import("../../worker/lib/models.js"));
});

const YEARLY_KEY = "sukyo_yearly_fortune_unlock";
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
    serviceKey: "sukuyo",
    contentKey: `${YEARLY_KEY}:2026`,
    featureKey: YEARLY_KEY,
    status: "ACTIVE",
    scope: "BIRTH",
    profileId: birthProfileId("p1"),
    purchaseProfileId: "p1",
    expiresAt: null,
    ...overrides,
  });
}

async function call(path, { method = "POST", body } = {}) {
  const response = await handleSukuyoRoutes(new Request(`https://example.test/api/sukuyo${path}`, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }), {});
  return { status: response.status, body: await response.json() };
}

const unlock = (body) => call("/yearly-fortune/unlock", { body: { targetYear: 2026, ...body } });

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  grants = [];
  resolvePaidRouteAuth.mockReset().mockResolvedValue({ userId: TEST_USER_ID, authUserDoc: { destinyProfilesCurrentId: "p1" } });
  profileCardFindOne.mockClear();
  User.findById.mockClear();
  entitlementFindOne.mockReset().mockImplementation((query) => ({
    lean: async () => grants.find((row) => matches(row, query)) || null,
  }));
});
afterEach(() => jest.restoreAllMocks());

test("같은 생년월일의 다른 저장 프로필로는 이미 해금된 상태다", async () => {
  grant();
  const result = await unlock({ profileId: "p2" });
  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({ alreadyUnlocked: true, unlocked: true, profileId: "p2" });
  // 리더는 라우트가 이미 읽은 카드를 재사용한다(같은 카드 왕복 1회).
  expect(profileCardFindOne).toHaveBeenCalledTimes(1);
});

test("다른 생년월일 프로필은 잠긴 채 결제 안내를 받는다", async () => {
  grant();
  const result = await unlock({ profileId: "p3" });
  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({ alreadyUnlocked: false, unlocked: false, profileId: "p3" });
  expect(result.body.billing.payload).toMatchObject({ featureKey: YEARLY_KEY, profileId: "p3", contentKey: `${YEARLY_KEY}:2026` });
});

test("다른 연도 권한으로는 열리지 않는다", async () => {
  grant({ contentKey: `${YEARLY_KEY}:2027` });
  expect((await unlock({ profileId: "p1" })).body.unlocked).toBe(false);
});

test.each([
  ["USER", { scope: "USER", profileId: "__user__" }],
  ["PROFILE", { scope: "PROFILE", profileId: "p1" }],
])("레거시 %s 행은 출생 기반 1년운의 근거가 아니다", async (_label, overrides) => {
  grant(overrides);
  expect((await unlock({ profileId: "p1" })).body.unlocked).toBe(false);
});

test.each([
  ["no profileId", {}],
  ["synthetic birth id", { profileId: "birth:forged" }],
])("%s → 400 MISSING_PROFILE_ID (현재 프로필로 폴백하지 않는다)", async (_label, body) => {
  grant();
  const result = await unlock(body);
  expect(result.status).toBe(400);
  expect(result.body).toMatchObject({ ok: false, reason: "MISSING_PROFILE_ID", requiresProfile: true, message: "프로필을 저장한 뒤 구매해 주세요." });
  expect(User.findById).not.toHaveBeenCalled();
  expect(entitlementFindOne).not.toHaveBeenCalled();
});

test("남의 프로필 id → 403 INVALID_PROFILE", async () => {
  grant();
  const result = await unlock({ profileId: "x1" });
  expect(result.status).toBe(403);
  expect(result.body).toMatchObject({ ok: false, reason: "INVALID_PROFILE", requiresProfile: true });
  expect(entitlementFindOne).not.toHaveBeenCalled();
});

test("GET 도 profileId 가 없으면 400, 남의 것이면 403 — 계산 전에 막는다", async () => {
  expect((await call("/yearly-fortune?year=2026", { method: "GET" })).body).toMatchObject({ reason: "MISSING_PROFILE_ID", requiresProfile: true });
  const foreign = await call("/yearly-fortune?year=2026&profileId=x1", { method: "GET" });
  expect(foreign.status).toBe(403);
  expect(foreign.body.reason).toBe("INVALID_PROFILE");
});

test("verify-payment 도 같은 생년월일 권한을 이미 해금으로 본다", async () => {
  grant();
  const result = await call("/yearly-fortune/verify-payment", { body: { targetYear: 2026, profileId: "p2" } });
  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({ alreadyUnlocked: true, unlocked: true, profileId: "p2", unlockId: "grant-1" });
});

test("해금 조회의 DB 오류는 503 으로 남는다(미구매로 바뀌지 않는다)", async () => {
  entitlementFindOne.mockImplementation(() => ({
    lean: async () => { throw Object.assign(new Error("server selection timed out"), { name: "MongoServerSelectionError" }); },
  }));
  const result = await unlock({ profileId: "p1" });
  expect(result.status).toBe(503);
});
