/** @jest-environment node */
// 운명의 섬 12궁 심층 리포트 — 출생 기반(userId + birthKey + contentKey) 해금 배달 계약.
import { jest } from "@jest/globals";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";

const auth = jest.fn();
const exists = jest.fn();
const findOne = jest.fn();
const connectDb = jest.fn();
const chart = jest.fn();
const write = jest.fn(() => { throw new Error("Read route attempted a write"); });
const BIRTH = { year: 1993, month: 7, day: 21, hour: 9, minute: 0 };
const cards = [
  testCard("p1", BIRTH), testCard("p2", BIRTH), testCard("p3", { ...BIRTH, day: 22 }),
  testCard("lunar", { ...BIRTH, month: 6, day: 3, calType: "lunar" }),
  testCard("other-gender", { ...BIRTH, gender: "OTHER" }),
  testCard("x1", { ...BIRTH, userId: OTHER_USER_ID }),
];
const initialCards = cards.map((card) => ({ ...card, birth: { ...card.birth } }));
const profileCards = profileCardModel(cards);

let route, utils, resolvePaidContentUnlockTarget;
beforeAll(async () => {
  const db = await import("../../worker/lib/db.js");
  const actualChart = await import("../../worker/lib/ziwei-ai-chart.js");
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getOptionalUserFromRequest: auth, requireAuth: jest.fn(),
    isAuthDbInfraError: (error) => error?.code === "AUTH_DB_UNAVAILABLE",
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...db, connectDb, withMongoRetry: async (_env, callback) => callback() }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER", BIRTH: "BIRTH" },
    CONTENT_ENTITLEMENT_SOURCES: {},
    CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE" },
    SAJU_LOCKED_CONTENT_KEYS: { DAEUN_ANALYSIS: "saju.daeunAnalysis", FULL_READING: "saju.fullReading", COMPATIBILITY: "saju.compatibility" },
    ContentEntitlement: { findOne, findOneAndUpdate: write, create: write, updateOne: write },
    User: { exists, updateOne: write, findOneAndUpdate: write },
    ProfileCard: { modelName: "ProfileCard", findOne: (...args) => profileCards.findOne(...args) },
  }));
  jest.unstable_mockModule("../../worker/lib/ziwei-ai-chart.js", () => ({
    ...actualChart, calculateZiweiAiChart: (...args) => { chart(...args); return actualChart.calculateZiweiAiChart(...args); },
  }));
  ({ handleZiweiIslandReportRoutes: route, __ziweiIslandReportTestUtils: utils } = await import("../../worker/routes/ziwei-island-report.js"));
  ({ resolvePaidContentUnlockTarget } = await import("../../worker/lib/content-unlocks.js"));
});

const FEATURE_KEY = "ziwei-island-deep-report";
const DATE = "2026-03-01";
// 본문 생년월일은 계산에 쓰이지 않는다 — 일부러 프로필과 다른 값을 둔다.
const INPUT = { profileId: "p1", date: DATE, birthDate: "2001-01-01", birthTime: "03:00", birthTimeUnknown: false, gender: "male", calendarType: "solar" };
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

function grant(overrides = {}, profileId = "p1") {
  grants.push({
    ...resolvePaidContentUnlockTarget({ userId: TEST_USER_ID, featureKey: FEATURE_KEY }),
    scope: "BIRTH", profileId: birthProfileId(profileId), purchaseProfileId: profileId,
    status: "ACTIVE", expiresAt: null, ...overrides,
  });
}

async function request(body = INPUT) {
  const response = await route(new Request("https://example.test/api/ziwei-island-report", {
    method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
  }), {});
  expect(write).not.toHaveBeenCalled();
  return { status: response.status, body: await response.json() };
}

const storedReport = (overrides = {}) => utils.buildReportFromBirth({
  date: DATE, birthDate: "1993-07-21", birthTime: "09:00", birthTimeUnknown: false, gender: "female", calendarType: "solar", isLeapMonth: false, ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  grants = []; users = [];
  cards.splice(0, cards.length, ...initialCards.map((card) => ({ ...card, birth: { ...card.birth } })));
  auth.mockReset().mockResolvedValue({ userId: TEST_USER_ID });
  connectDb.mockReset().mockResolvedValue(undefined);
  exists.mockImplementation(async (query) => users.find((user) => matches(user, query)) || null);
  findOne.mockImplementation((query) => ({ lean: async () => grants.find((row) => matches(row, query)) || null }));
});

test("anonymous requests are rejected before any rights lookup or calculation", async () => {
  auth.mockResolvedValue(null);
  expect((await request()).status).toBe(401);
  expect(findOne).not.toHaveBeenCalled();
  expect(chart).not.toHaveBeenCalled();
});

test("unowned birth returns 402 with pricing and no report", async () => {
  const result = await request({ ...INPUT, unlocked: true, userId: OTHER_USER_ID });
  expect(result.status).toBe(402);
  expect(result.body).toMatchObject({ reason: "PAYMENT_REQUIRED", featureKey: FEATURE_KEY, coinPrice: utils.COIN_PRICE, amountKRW: utils.AMOUNT_KRW });
  expect(result.body.message).toContain("이 생년월일은 별도 구매가 필요합니다");
  expect(result.body).not.toHaveProperty("paymentMode");
  expect(result.body.report).toBeUndefined();
  expect(chart).not.toHaveBeenCalled();
});

test("a BIRTH grant delivers the report of the profile's stored birth, ignoring the body birth", async () => {
  grant();
  const result = await request();
  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({ ok: true, unlocked: true });
  expect(result.body.report).toEqual(storedReport());
  expect(result.body.report).not.toEqual(utils.buildReportFromBirth({ ...INPUT }));
  expect(chart.mock.calls[0][0]).toMatchObject({ birthDate: "1993-07-21", birthTime: "09:00", gender: "female", calendarType: "solar" });
});

test("a lunar profile passes its stored lunar calendar date to the chart (the chart converts it)", async () => {
  grant({}, "lunar");
  const result = await request({ ...INPUT, profileId: "lunar" });
  expect(result.status).toBe(200);
  expect(chart.mock.calls[0][0]).toMatchObject({ birthDate: "1993-06-03", calendarType: "lunar", isLeapMonth: false });
});

test.each(["unlockedFeatures", "paidFeatures"])("legacy %s account array is not evidence", async (field) => {
  users.push({ _id: TEST_USER_ID, [field]: [FEATURE_KEY] });
  expect((await request()).status).toBe(402);
  expect(chart).not.toHaveBeenCalled();
});

test("another saved profile with the same birth shares the unlock; a different birth needs its own purchase", async () => {
  grant();
  expect((await request({ ...INPUT, profileId: "p2" })).status).toBe(200);
  const other = await request({ ...INPUT, profileId: "p3" });
  expect(other.status).toBe(402);
  expect(other.body.message).toContain("이 생년월일은 별도 구매가 필요합니다");
});

test("editing the profile birth re-locks the report and reverting re-opens it", async () => {
  grant();
  cards[0].birth.hour = 10;
  expect((await request()).status).toBe(402);
  cards[0].birth.hour = 9;
  expect((await request()).status).toBe(200);
});

test("missing, foreign or synthetic profile ids are rejected before any calculation", async () => {
  grant();
  const { profileId: _omit, ...withoutProfile } = INPUT;
  const missing = await request(withoutProfile);
  expect(missing.status).toBe(400);
  expect(missing.body).toMatchObject({ reason: "MISSING_PROFILE_ID", requiresProfile: true, message: "프로필을 저장한 뒤 구매해 주세요." });
  expect((await request({ ...INPUT, profileId: birthProfileId("p1") })).status).toBe(400);
  for (const profileId of ["x1", "__user__", "unknown"]) {
    const result = await request({ ...INPUT, profileId });
    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ reason: "INVALID_PROFILE", requiresProfile: true });
  }
  expect(chart).not.toHaveBeenCalled();
});

test.each([
  { userId: OTHER_USER_ID }, { status: "REFUNDED" }, { expiresAt: new Date("2020-01-01") },
  { scope: "PROFILE", profileId: "p1" }, { scope: "USER", profileId: "__user__" },
  { profileId: "birth:" + "0".repeat(64) }, { contentKey: "nakshatra-lord-report" },
])("an unrelated, legacy or inactive grant never opens the report: %j", async (override) => {
  grant(override);
  expect((await request()).status).toBe(402);
  expect(chart).not.toHaveBeenCalled();
});

test("a profile without male/female gender cannot be computed from the body gender", async () => {
  grant({}, "other-gender");
  const result = await request({ ...INPUT, profileId: "other-gender" });
  expect(result.status).toBe(400);
  expect(chart).not.toHaveBeenCalled();
});

test("DB and auth infrastructure failures stay retryable 503 instead of 402", async () => {
  connectDb.mockRejectedValue(new Error("private database connection information"));
  const db = await request();
  expect(db.status).toBe(503);
  expect(db.body).toMatchObject({ retryable: true });
  expect(JSON.stringify(db.body)).not.toContain("private database");
  connectDb.mockResolvedValue(undefined);
  findOne.mockImplementation(() => ({ lean: async () => { throw new Error("entitlement read failed"); } }));
  expect((await request()).status).toBe(503);
  auth.mockRejectedValue({ code: "AUTH_DB_UNAVAILABLE" });
  expect((await request()).status).toBe(503);
  expect(chart).not.toHaveBeenCalled();
});
