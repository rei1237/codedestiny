/** @jest-environment node */
import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";

const auth = jest.fn();
const swiss = jest.fn();
const exists = jest.fn();
const findOne = jest.fn();
const write = jest.fn(() => { throw new Error("Read route attempted a write"); });
const connectDb = jest.fn();
// 프로필 출생 정보 = 픽스처 차트의 출생(1990-10-14 14:30). 요청 본문 생년월일은 계산에 쓰이지 않는다.
const BIRTH = { year: 1990, month: 10, day: 14, hour: 14, minute: 30 };
const cards = [testCard("p1", BIRTH), testCard("p2", BIRTH), testCard("p3", { ...BIRTH, day: 15 }), testCard("x1", { ...BIRTH, userId: OTHER_USER_ID })];
const initialCards = cards.map((card) => ({ ...card, birth: { ...card.birth } }));
const profileCards = profileCardModel(cards);
jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
  getOptionalUserFromRequest: auth, requireAuth: jest.fn(),
  isAuthDbInfraError: (error) => error?.code === "AUTH_DB_UNAVAILABLE",
}));
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb, withMongoRetry: async (_env, callback) => callback(),
}));
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER", BIRTH: "BIRTH" },
  CONTENT_ENTITLEMENT_SOURCES: {},
  CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE" },
  SAJU_LOCKED_CONTENT_KEYS: { DAEUN_ANALYSIS: "saju.daeunAnalysis", FULL_READING: "saju.fullReading", COMPATIBILITY: "saju.compatibility" },
  ContentEntitlement: { findOne, findOneAndUpdate: write, create: write, updateOne: write },
  User: { exists, updateOne: write, findOneAndUpdate: write },
  ProfileCard: { modelName: "ProfileCard", findOne: (...args) => profileCards.findOne(...args) },
}));
jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({
  getSwissWesternChart: swiss, getSwissVedicPlanets: jest.fn(),
}));
jest.unstable_mockModule("../../worker/lib/cms-records.js", () => ({ primeCmsRecords: jest.fn() }));

let handleAstroRoutes, handleAstrologyRoutes, resolvePaidContentUnlockTarget;
let hasPurchasedAccountContentAccess, getBillingFeaturePricing, natalReading;
beforeAll(async () => {
  ({ handleAstroRoutes, handleAstrologyRoutes } = await import("../../worker/routes/astro.js"));
  ({ resolvePaidContentUnlockTarget } = await import("../../worker/lib/content-unlocks.js"));
  ({ hasPurchasedAccountContentAccess } = await import("../../worker/lib/paid-content-read-access.js"));
  ({ getBillingFeaturePricing } = await import("../../worker/lib/billing-feature-registry.js"));
  natalReading = (await import("../../worker/lib/astro-natal-reading.cjs")).default;
});
const fixture = JSON.parse(readFileSync("__tests__/fixtures/astro-natal-charts.json", "utf8")).b1;
const FEATURE_KEY = "astro_basic_deep_pack";
const INPUT = { profileId: "p1", date: "1990-10-14", time: "14:30", timezone: "Asia/Seoul", latitude: 37.5665, longitude: 126.978, name: "테스트" };
const birthProfileId = (profileId) => toBirthEntitlementProfileId(computeBirthKey(cards.find((card) => card.profileId === profileId)));
let grants;
let users;

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

function grant(overrides = {}) {
  grants.push({
    ...resolvePaidContentUnlockTarget({ userId: TEST_USER_ID, featureKey: FEATURE_KEY }),
    scope: "BIRTH", profileId: birthProfileId("p1"), purchaseProfileId: "p1",
    status: "ACTIVE", expiresAt: null, ...overrides,
  });
}

function swissChart(chart = fixture.chart) {
  const lon = (p) => p.idx * 30 + p.deg;
  return {
    planets: Object.fromEntries(Object.entries({ ...chart.planets, Sun: { sign: chart.sun }, Moon: { sign: chart.moon } }).map(([body, row]) => [body, {
      longitude: lon(body === "Sun" ? chart.sun : body === "Moon" ? chart.moon : row.sign), retrograde: row.retro,
    }])),
    ascendant: { longitude: lon(chart.asc) }, midheaven: { longitude: lon(chart.mc) },
    houseCusps: chart.houseCuspsLon, source: "swiss-wasm-local", aspects: [],
  };
}

async function request(body = INPUT, method = "POST") {
  const response = await handleAstroRoutes(new Request("https://example.test/api/astro/basic-deep", {
    method, ...(method === "POST" ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }), {});
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(write).not.toHaveBeenCalled();
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  jest.clearAllMocks();
  grants = []; users = [];
  cards.splice(0, cards.length, ...initialCards.map((card) => ({ ...card, birth: { ...card.birth } })));
  auth.mockReset().mockResolvedValue({ userId: TEST_USER_ID });
  swiss.mockReset().mockResolvedValue(swissChart());
  connectDb.mockReset().mockResolvedValue(undefined);
  exists.mockImplementation(async (query) => users.find((user) => matches(user, query)) || null);
  findOne.mockImplementation((query) => ({ lean: async () => grants.find((row) => matches(row, query)) || null }));
});

test("anonymous and forged unlock hints cannot request a report or trigger calculation", async () => {
  auth.mockResolvedValue(null);
  expect((await request({ ...INPUT, unlocked: true, userId: TEST_USER_ID })).status).toBe(401);
  expect(findOne).not.toHaveBeenCalled();
  expect(swiss).not.toHaveBeenCalled();
});

test("unowned content returns existing registry pricing without a report", async () => {
  const result = await request({ ...INPUT, unlocked: true, passActive: true, featureKey: "free", userId: "someone-else" });
  const { pricing } = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  expect(result).toEqual({ status: 402, body: expect.objectContaining({ featureKey: FEATURE_KEY, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice }) });
  expect(result.body.report).toBeUndefined();
  expect(result.body.html).toBeUndefined();
  expect(swiss).not.toHaveBeenCalled();
});

test("a BIRTH grant delivers the deterministic reading of the profile's stored birth without consuming anything", async () => {
  grant();
  // 본문 생년월일을 다른 사람 것으로 바꿔도 계산은 저장된 프로필 출생 정보로만 한다.
  const result = await request({ ...INPUT, date: "2001-01-01", time: "03:00", chart: { forged: true } });
  expect(result.status).toBe(200);
  const expected = natalReading.build(fixture.chart, { name: INPUT.name, birth: fixture.birth, today: result.body.asOf, timeKnown: true });
  expect(result.body.report).toEqual(expected);
  expect(result.body.html).toBe(natalReading.render(expected) + natalReading.renderDeep(expected));
  expect(swiss.mock.calls[0][0]).toMatchObject({ ASTRO_SWISS_STRICT_ONLY: "1", SWISS_API_FORCE_EXTERNAL: "0" });
  expect((await request()).body).toEqual(result.body);
});

test.each(["unlockedFeatures", "paidFeatures"])("legacy %s account array is not evidence for a birth-scoped report", async (field) => {
  users.push({ _id: TEST_USER_ID, [field]: [FEATURE_KEY] });
  expect((await request()).status).toBe(402);
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
  cards[0].birth.day = 20;
  expect((await request()).status).toBe(402);
  cards[0].birth.day = 14;
  expect((await request()).status).toBe(200);
});

test("missing, foreign or synthetic profile ids are rejected before any calculation", async () => {
  grant();
  const { profileId: _omit, ...withoutProfile } = INPUT;
  expect((await request(withoutProfile)).body).toMatchObject({ reason: "MISSING_PROFILE_ID", requiresProfile: true });
  expect((await request({ ...INPUT, profileId: birthProfileId("p1") })).status).toBe(400);
  expect((await request({ ...INPUT, profileId: "x1" })).status).toBe(403);
  expect((await request({ ...INPUT, profileId: "__user__" })).status).toBe(403);
  expect(swiss).not.toHaveBeenCalled();
});

test.each([
  { userId: OTHER_USER_ID }, { status: "REFUNDED" }, { status: "CANCELLED" },
  { expiresAt: new Date("2020-01-01") }, { scope: "PROFILE", profileId: "p1" },
  { scope: "USER", profileId: "__user__" }, { profileId: "birth:" + "0".repeat(64) },
  { contentKey: "astro_stellar_career_room" },
])("an unrelated, legacy or inactive grant never opens the report: %j", async (override) => {
  grant(override);
  expect((await request({ ...INPUT, userId: OTHER_USER_ID })).status).toBe(402);
  expect(swiss).not.toHaveBeenCalled();
});

test("revocation is checked on each read rather than cached as access", async () => {
  grant();
  expect((await request()).status).toBe(200);
  grants[0].status = "REFUNDED";
  expect((await request()).status).toBe(402);
});

test("legacy purchases from another account cannot be claimed", async () => {
  users.push({ _id: OTHER_USER_ID, paidFeatures: [FEATURE_KEY] });
  expect((await request({ ...INPUT, userId: OTHER_USER_ID })).status).toBe(402);
});

test("DB and auth infrastructure failures stay retryable instead of prompting purchase", async () => {
  connectDb.mockRejectedValue(new Error("private database connection information"));
  expect((await request()).body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  auth.mockRejectedValue({ code: "AUTH_DB_UNAVAILABLE" });
  const result = await request();
  expect(result.status).toBe(503);
  expect(JSON.stringify(result.body)).not.toContain("private database");
  expect(swiss).not.toHaveBeenCalled();
});

test.each([
  { latitude: 100 }, { longitude: null }, { timezone: "not/a/timezone" }, { latitude: "37.5" },
])("invalid birth place input is rejected before calculation: %j", async (override) => {
  grant();
  expect((await request({ ...INPUT, ...override })).status).toBe(400);
  expect(swiss).not.toHaveBeenCalled();
});

test("UTC zero is retained and report HTML escapes user text", async () => {
  grant();
  const result = await request({ ...INPUT, timezone: 0, name: '<img src=x onerror="alert(1)">' });
  expect(result.status).toBe(200);
  expect(swiss.mock.calls[0][1].timezone).toBe(0);
  expect(result.body.html).not.toContain("<img");
});

test("unknown birth time excludes houses and periods and carries moon sign uncertainty", async () => {
  grant();
  const chart = swissChart();
  swiss.mockResolvedValueOnce(chart)
    .mockResolvedValueOnce({ ...chart, planets: { ...chart.planets, Moon: { longitude: 29 } } })
    .mockResolvedValueOnce({ ...chart, planets: { ...chart.planets, Moon: { longitude: 31 } } });
  // 시각 미상은 출생 신원이 다르다 — 그 출생 정보로 산 행을 둔다.
  cards[0].birth.timeUnknown = true;
  grants[0].profileId = birthProfileId("p1");
  const result = await request();
  expect(result.status).toBe(200);
  expect(result.body.report.timeKnown).toBe(false);
  expect(result.body.report.angles).toBeNull();
  expect(result.body.report.periods.profection).toBeNull();
  expect(result.body.report.periods.firdaria).toBeNull();
  expect(result.body.report.notes.moonSigns).toEqual([0, 1]);
  expect(swiss.mock.calls[0][1].hour).toBe(12);
});

test("calculation failure has no local detailed fallback or leaked internals", async () => {
  grant();
  swiss.mockRejectedValue(new Error("internal wasm path"));
  const result = await request();
  expect(result.status).toBe(503);
  expect(result.body.report).toBeUndefined();
  expect(JSON.stringify(result)).not.toContain("internal wasm");
});

test("GET never reads rights or generates a report", async () => {
  expect((await request(null, "GET")).status).toBe(405);
  expect(auth).not.toHaveBeenCalled();
  expect(swiss).not.toHaveBeenCalled();
});

test("the existing public chart and short summary remain available anonymously", async () => {
  auth.mockResolvedValue(null);
  const response = await handleAstrologyRoutes(new Request("https://example.test/api/astrology/basic", {
    method: "POST", body: JSON.stringify(INPUT),
  }), {});
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.planets).toBeDefined();
  expect(body.summary).toBeDefined();
  expect(body.report).toBeUndefined();
  expect(auth).not.toHaveBeenCalled();
  expect(findOne).not.toHaveBeenCalled();
});

test.each(["section_summary", "life-book-ai-consultation", "unknown"])("account read helper fails closed for unsupported feature %s", async (featureKey) => {
  expect(await hasPurchasedAccountContentAccess({}, { userId: TEST_USER_ID, featureKey })).toBe(false);
  expect(findOne).not.toHaveBeenCalled();
});
