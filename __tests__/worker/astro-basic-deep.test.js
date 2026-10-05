/** @jest-environment node */
import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";

const auth = jest.fn();
const swiss = jest.fn();
const exists = jest.fn();
const findOne = jest.fn();
const write = jest.fn(() => { throw new Error("Read route attempted a write"); });
const connectDb = jest.fn();
jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
  getOptionalUserFromRequest: auth, requireAuth: jest.fn(),
  isAuthDbInfraError: (error) => error?.code === "AUTH_DB_UNAVAILABLE",
}));
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb, withMongoRetry: async (_env, callback) => callback(),
}));
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER" },
  CONTENT_ENTITLEMENT_SOURCES: {},
  CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE" },
  SAJU_LOCKED_CONTENT_KEYS: { DAEUN_ANALYSIS: "saju.daeunAnalysis", FULL_READING: "saju.fullReading", COMPATIBILITY: "saju.compatibility" },
  ContentEntitlement: { findOne, findOneAndUpdate: write, create: write, updateOne: write },
  User: { exists, updateOne: write, findOneAndUpdate: write },
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
const INPUT = { date: "1990-10-14", time: "14:30", timezone: "Asia/Seoul", latitude: 37.5665, longitude: 126.978, name: "테스트" };
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
  grants.push({ ...resolvePaidContentUnlockTarget({ userId: "buyer", featureKey: FEATURE_KEY }), status: "ACTIVE", expiresAt: null, ...overrides });
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
  auth.mockReset().mockResolvedValue({ userId: "buyer" });
  swiss.mockReset().mockResolvedValue(swissChart());
  connectDb.mockReset().mockResolvedValue(undefined);
  exists.mockImplementation(async (query) => users.find((user) => matches(user, query)) || null);
  findOne.mockImplementation((query) => ({ lean: async () => grants.find((row) => matches(row, query)) || null }));
});

test("anonymous and forged unlock hints cannot request a report or trigger calculation", async () => {
  auth.mockResolvedValue(null);
  expect((await request({ ...INPUT, unlocked: true, userId: "buyer" })).status).toBe(401);
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

test("modern account grant delivers the same deterministic reading without consuming anything", async () => {
  grant();
  const result = await request({ ...INPUT, chart: { forged: true }, profileId: "different-profile" });
  expect(result.status).toBe(200);
  const expected = natalReading.build(fixture.chart, { name: INPUT.name, birth: fixture.birth, today: result.body.asOf, timeKnown: true });
  expect(result.body.report).toEqual(expected);
  expect(result.body.html).toBe(natalReading.render(expected) + natalReading.renderDeep(expected));
  expect(swiss.mock.calls[0][0]).toMatchObject({ ASTRO_SWISS_STRICT_ONLY: "1", SWISS_API_FORCE_EXTERNAL: "0" });
  expect((await request()).body).toEqual(result.body);
});

test.each(["unlockedFeatures", "paidFeatures"])("legacy %s purchase retains account-wide access", async (field) => {
  users.push({ _id: "buyer", [field]: [FEATURE_KEY] });
  expect((await request()).status).toBe(200);
});

test.each([
  { userId: "other" }, { status: "REFUNDED" }, { status: "CANCELLED" },
  { expiresAt: new Date("2020-01-01") }, { scope: "PROFILE", profileId: "other-profile" },
  { contentKey: "astro_stellar_career_room" },
])("an unrelated or inactive grant never opens the report: %j", async (override) => {
  grant(override);
  expect((await request({ ...INPUT, userId: "other", profileId: "other-profile" })).status).toBe(402);
  expect(swiss).not.toHaveBeenCalled();
});

test("revocation is checked on each read rather than cached as access", async () => {
  grant();
  expect((await request()).status).toBe(200);
  grants[0].status = "REFUNDED";
  expect((await request()).status).toBe(402);
});

test("legacy purchases from another account cannot be claimed", async () => {
  users.push({ _id: "other", paidFeatures: [FEATURE_KEY] });
  expect((await request({ ...INPUT, userId: "other" })).status).toBe(402);
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
  { date: "2025-02-30" }, { time: "25:00" }, { latitude: 100 }, { longitude: null },
  { timezone: "not/a/timezone" }, { timeKnown: "false" }, { latitude: "37.5" },
])("invalid birth input is rejected before calculation: %j", async (override) => {
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
  const result = await request({ ...INPUT, timeKnown: false, time: undefined });
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
  expect(await hasPurchasedAccountContentAccess({}, { userId: "buyer", featureKey })).toBe(false);
  expect(findOne).not.toHaveBeenCalled();
});
