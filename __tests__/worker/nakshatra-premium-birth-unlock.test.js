/** @jest-environment node */
// 나크샤트라 영구 해금 리포트 2종(지배성·다샤 인생지도) — 출생 기반(userId + birthKey + contentKey) 해금 배달 계약.
import { jest } from "@jest/globals";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";
import { isBirthScopedUnlockFeatureKey } from "../../worker/lib/paid-feature-registry.js";

const auth = jest.fn();
const exists = jest.fn();
const findOne = jest.fn();
const connectDb = jest.fn();
const swiss = jest.fn();
const write = jest.fn(() => { throw new Error("Read route attempted a write"); });
const BIRTH = { year: 1990, month: 5, day: 17, hour: 9, minute: 30 };
const cards = [
  testCard("p1", BIRTH), testCard("p2", BIRTH), testCard("p3", { ...BIRTH, day: 18 }),
  testCard("lunar", { ...BIRTH, month: 4, day: 23, calType: "lunar" }),
  testCard("x1", { ...BIRTH, userId: OTHER_USER_ID }),
];
const initialCards = cards.map((card) => ({ ...card, birth: { ...card.birth } }));
const profileCards = profileCardModel(cards);

let route, utils, resolvePaidContentUnlockTarget, lunarToSolar;
beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getOptionalUserFromRequest: auth, requireAuth: jest.fn(async () => ({ userId: TEST_USER_ID })),
    isAuthDbInfraError: (error) => error?.code === "AUTH_DB_UNAVAILABLE",
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb, withMongoRetry: async (_env, callback) => callback() }));
  const models = await import("../../worker/lib/models.js");
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    ...models,
    ContentEntitlement: { findOne, findOneAndUpdate: write, create: write, updateOne: write },
    User: { exists, updateOne: write, findOneAndUpdate: write },
    ProfileCard: { modelName: "ProfileCard", findOne: (...args) => profileCards.findOne(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({
    getSwissVedicPlanets: swiss, getSwissMoonLongitudes: jest.fn(async (_env, moments) => moments.map(() => 100)),
  }));
  // 회당 결제 증빙(관측 전용)은 이 계약 밖이다 — DB 에 닿지 않게 대역한다.
  jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({
    verifyPerUsePayment: async () => ({ proven: true, source: "test" }), logPerUsePaymentProof: () => {},
  }));
  ({ handleNakshatraPremiumRoutes: route, __nakshatraPremiumTestUtils: utils } = await import("../../worker/routes/nakshatra-premium.js"));
  ({ resolvePaidContentUnlockTarget } = await import("../../worker/lib/content-unlocks.js"));
  ({ lunarToSolar } = await import("../../lib/korean-calendar/index.js"));
});

const KINDS = [["lord-report", "nakshatra-lord-report"], ["dasha-map", "nakshatra-dasha-map"]];
// 본문 생년월일·성별은 계산에 쓰이지 않는다 — 일부러 프로필과 다른 값을 둔다. 시간대·출생지는 요청 값을 쓴다.
const INPUT = { profileId: "p1", year: 2001, month: 1, day: 1, hour: 3, minute: 0, timezone: 9, lat: 35.1, lon: 129.0, timeUnknown: false, gender: "male" };
const birthProfileId = (profileId) => toBirthEntitlementProfileId(computeBirthKey(cards.find((card) => card.profileId === profileId)));
let grants, users;

function matches(doc, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === "$and") return value.every((part) => matches(doc, part));
    if (key === "$or") return value.some((part) => matches(doc, part));
    if (value === null) return doc[key] == null;
    if (value && typeof value === "object") {
      if ("$in" in value) return (Array.isArray(doc[key]) ? doc[key] : [doc[key]]).some((entry) => value.$in.includes(entry));
      if ("$gt" in value) return doc[key] != null && doc[key] > value.$gt;
      if ("$exists" in value) return (doc[key] !== undefined) === value.$exists;
    }
    return doc[key] === value;
  });
}

function grant(featureKey, overrides = {}, profileId = "p1") {
  grants.push({
    ...resolvePaidContentUnlockTarget({ userId: TEST_USER_ID, featureKey }),
    scope: "BIRTH", profileId: birthProfileId(profileId), purchaseProfileId: profileId,
    status: "ACTIVE", expiresAt: null, ...overrides,
  });
}

async function request(kind, body = INPUT) {
  const response = await route(new Request(`https://example.test/api/nakshatra-premium/${kind}`, {
    method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
  }), {});
  expect(write).not.toHaveBeenCalled();
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  jest.clearAllMocks();
  grants = []; users = [];
  cards.splice(0, cards.length, ...initialCards.map((card) => ({ ...card, birth: { ...card.birth } })));
  auth.mockReset().mockResolvedValue({ userId: TEST_USER_ID });
  connectDb.mockReset().mockResolvedValue(undefined);
  swiss.mockReset().mockResolvedValue({ planets: { Moon: 123.4 } });
  exists.mockImplementation(async (query) => users.find((user) => matches(user, query)) || null);
  findOne.mockImplementation((query) => ({ lean: async () => grants.find((row) => matches(row, query)) || null }));
});

test("both permanent reports are birth-scoped keys; per-use products are not", () => {
  for (const [, featureKey] of KINDS) expect(isBirthScopedUnlockFeatureKey(featureKey)).toBe(true);
  expect(isBirthScopedUnlockFeatureKey("nakshatra-muhurta")).toBe(false);
  expect(isBirthScopedUnlockFeatureKey("nakshatra-vvip-codex")).toBe(false);
});

describe.each(KINDS)("%s", (kind, featureKey) => {
  const product = () => utils.PRODUCTS[kind];

  test("anonymous requests are rejected before any rights lookup or calculation", async () => {
    auth.mockResolvedValue(null);
    expect((await request(kind)).status).toBe(401);
    expect(findOne).not.toHaveBeenCalled();
    expect(swiss).not.toHaveBeenCalled();
  });

  test("unowned birth returns 402 with existing pricing fields and no report", async () => {
    const result = await request(kind, { ...INPUT, unlocked: true });
    expect(result.status).toBe(402);
    expect(result.body).toMatchObject({
      reason: "PAYMENT_REQUIRED", featureKey, title: product().orderName, coinPrice: product().coinPrice, amountKRW: product().amountKRW,
    });
    expect(result.body.message).toContain("이 생년월일은 별도 구매가 필요합니다");
    expect(result.body).not.toHaveProperty("paymentMode");
    expect(result.body.report).toBeUndefined();
    expect(swiss).not.toHaveBeenCalled();
  });

  test("a BIRTH grant computes from the profile's stored birth; body birth is ignored, place/timezone kept", async () => {
    grant(featureKey);
    const result = await request(kind);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, unlocked: true, featureKey });
    expect(result.body.report).toBeTruthy();
    expect(swiss.mock.calls[0][1]).toMatchObject({
      year: 1990, month: 5, day: 17, hour: 9, minute: 30, timeUnknown: false, gender: "female", timezone: 9, lat: 35.1, lon: 129.0,
    });
  });

  test("a lunar profile is converted to its solar date before calculation", async () => {
    grant(featureKey, {}, "lunar");
    expect((await request(kind, { ...INPUT, profileId: "lunar" })).status).toBe(200);
    const solar = lunarToSolar(1990, 4, 23, false);
    expect(swiss.mock.calls[0][1]).toMatchObject({ year: solar.year, month: solar.month, day: solar.day });
  });

  test("unknown birth time on the profile uses noon regardless of the body time", async () => {
    cards[0].birth.timeUnknown = true;
    grant(featureKey);
    expect((await request(kind)).status).toBe(200);
    expect(swiss.mock.calls[0][1]).toMatchObject({ hour: 12, minute: 0, timeUnknown: true });
  });

  test.each(["unlockedFeatures", "paidFeatures"])("legacy %s account array is not evidence", async (field) => {
    users.push({ _id: TEST_USER_ID, [field]: [featureKey] });
    expect((await request(kind)).status).toBe(402);
    expect(exists).not.toHaveBeenCalled();
    expect(swiss).not.toHaveBeenCalled();
  });

  test("another saved profile with the same birth shares the unlock; a different birth needs its own purchase", async () => {
    grant(featureKey);
    expect((await request(kind, { ...INPUT, profileId: "p2" })).status).toBe(200);
    const other = await request(kind, { ...INPUT, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.message).toContain("이 생년월일은 별도 구매가 필요합니다");
  });

  test("editing the profile birth re-locks the report and reverting re-opens it", async () => {
    grant(featureKey);
    cards[0].birth.day = 20;
    expect((await request(kind)).status).toBe(402);
    cards[0].birth.day = 17;
    expect((await request(kind)).status).toBe(200);
  });

  test("missing, foreign or synthetic profile ids are rejected before any calculation", async () => {
    grant(featureKey);
    const { profileId: _omit, ...withoutProfile } = INPUT;
    const missing = await request(kind, withoutProfile);
    expect(missing.status).toBe(400);
    expect(missing.body).toMatchObject({ reason: "MISSING_PROFILE_ID", requiresProfile: true, message: "프로필을 저장한 뒤 구매해 주세요." });
    expect((await request(kind, { ...INPUT, profileId: birthProfileId("p1") })).status).toBe(400);
    for (const profileId of ["x1", "__user__", "unknown"]) {
      const result = await request(kind, { ...INPUT, profileId });
      expect(result.status).toBe(403);
      expect(result.body).toMatchObject({ reason: "INVALID_PROFILE", requiresProfile: true });
    }
    expect(swiss).not.toHaveBeenCalled();
  });

  test.each([
    [{ userId: OTHER_USER_ID }], [{ status: "REFUNDED" }], [{ expiresAt: new Date("2020-01-01") }],
    [{ scope: "PROFILE", profileId: "p1" }], [{ scope: "USER", profileId: "__user__" }],
    [{ profileId: "birth:" + "0".repeat(64) }],
  ])("an unrelated, legacy or inactive grant never opens the report: %j", async (override) => {
    grant(featureKey, override);
    expect((await request(kind)).status).toBe(402);
    expect(swiss).not.toHaveBeenCalled();
  });

  test("the other report's grant does not open this one", async () => {
    grant(KINDS.find(([, key]) => key !== featureKey)[1]);
    expect((await request(kind)).status).toBe(402);
  });

  test("DB and auth infrastructure failures stay retryable 503 instead of 402", async () => {
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const db = await request(kind);
    expect(db.status).toBe(503);
    expect(db.body).toMatchObject({ retryable: true });
    expect(JSON.stringify(db.body)).not.toContain("private database");
    connectDb.mockResolvedValue(undefined);
    findOne.mockImplementation(() => ({ lean: async () => { throw new Error("entitlement read failed"); } }));
    expect((await request(kind)).status).toBe(503);
    auth.mockRejectedValue({ code: "AUTH_DB_UNAVAILABLE" });
    expect((await request(kind)).status).toBe(503);
    expect(swiss).not.toHaveBeenCalled();
  });
});

test("dasha map uses the stored profile gender for the eastern major-luck axis, not the body gender", async () => {
  // 성별도 출생 신원의 일부다 — 성별 미상(OTHER) 프로필의 신원으로 산 행을 둔다.
  cards[0].gender = "OTHER";
  grant("nakshatra-dasha-map");
  expect((await request("dasha-map", { ...INPUT, gender: "female" })).status).toBe(200);
  expect(swiss.mock.calls[0][1].gender).toBe("");
});

test("per-use products keep their existing contract and need no profile", async () => {
  const result = await request("vvip-codex", { year: 1990, month: 5, day: 17, hour: 9, minute: 30 });
  expect(result.status).toBe(200);
  expect(findOne).not.toHaveBeenCalled();
});
