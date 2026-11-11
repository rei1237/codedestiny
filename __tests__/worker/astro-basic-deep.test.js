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

// 출생 기반 전환 이전 USER·PROFILE 행(운영 구매자)은 계속 연다 — 재잠금 방지. 다른 카드의 PROFILE 행은 닫힌다.

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
  const result = await request({ ...INPUT, timeKnown: false });
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

test.each(['', 'x1', '__user__', 'p1'])('public basic reading ignores profile %s and uses explicit birth', async profileId => {
 auth.mockRejectedValue(new Error('must not authenticate'));connectDb.mockRejectedValue(new Error('must not read DB'));
 const result=await request({...INPUT,profileId,date:'2001-01-01',time:'03:00',chart:{forged:true}});
 expect(result.status).toBe(200);expect(result.body.accessSource).toBe('public');
 expect(swiss.mock.calls[0][1]).toMatchObject({year:2001,month:1,day:1,hour:3,minute:0});expect(auth).not.toHaveBeenCalled();expect(connectDb).not.toHaveBeenCalled();expect(findOne).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
 const original=await request({...INPUT,profileId});
 const expected=natalReading.build(fixture.chart,{name:INPUT.name,birth:fixture.birth,today:original.body.asOf,timeKnown:true});
 expect(original.body.report).toEqual(expected);expect(original.body.html).toBe(natalReading.render(expected)+natalReading.renderDeep(expected));
});
test('a profile id alone cannot supply birth data',async()=>{expect((await request({profileId:'p1'})).status).toBe(400);expect(swiss).not.toHaveBeenCalled();expect(auth).not.toHaveBeenCalled();expect(connectDb).not.toHaveBeenCalled();expect(findOne).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();});
