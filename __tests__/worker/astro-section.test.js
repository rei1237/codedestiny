/** @jest-environment node */
import { jest } from "@jest/globals";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";

// 점성술 상담 심화 분석 4종·봉인된 별의 방 4종 유료 본문(/api/astro/section): 출생 단위 해금을 서버가 확인한 뒤에만 본문을 만든다.
const auth = jest.fn();
const swiss = jest.fn();
const transitLons = jest.fn();
const exists = jest.fn();
const findOne = jest.fn();
const write = jest.fn(() => { throw new Error("Read route attempted a write"); });
const connectDb = jest.fn();
// 프로필 출생 정보 = 픽스처 차트의 출생(1990-10-14 14:30).
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
  getSwissWesternChart: swiss, getSwissVedicPlanets: jest.fn(), createSwissTransitLonsAt: transitLons,
}));
jest.unstable_mockModule("../../worker/lib/cms-records.js", () => ({ primeCmsRecords: jest.fn() }));

const ASTRO_SECTION_FEATURE_KEYS = [
  "astro_career_talent_deep", "astro_talent_attraction_deep", "astro_relationship_deep", "astro_growth_shadow_deep",
  "astro_stellar_career_room", "astro_stellar_talent_room", "astro_stellar_relationship_room", "astro_stellar_growth_room",
];
let handleAstroRoutes, resolvePaidContentUnlockTarget, getBillingFeaturePricing, buildAstroSectionHtml, SERVER_KEYS, buildAstroYearlyReading;
beforeAll(async () => {
  ({ handleAstroRoutes } = await import("../../worker/routes/astro.js"));
  ({ resolvePaidContentUnlockTarget } = await import("../../worker/lib/content-unlocks.js"));
  ({ getBillingFeaturePricing } = await import("../../worker/lib/billing-feature-registry.js"));
  ({ buildAstroSectionHtml, ASTRO_SECTION_FEATURE_KEYS: SERVER_KEYS } = await import("../../worker/lib/astro-section/report.js"));
  ({ buildAstroYearlyReading } = await import("../../worker/lib/astro-section/yearly.js"));
});
const FIXTURES = JSON.parse(readFileSync("__tests__/fixtures/astro-natal-charts.json", "utf8"));
// 브라우저가 74ed86b26 에서 같은 차트로 만들던 유료 본문의 sha256 (scratch vm 으로 HEAD 생성기를 돌려 얻었다).
const PARITY = JSON.parse(readFileSync("__tests__/fixtures/astro-section-client-parity.json", "utf8")).hashes;
const KEY = "astro_career_talent_deep";
const INPUT = { featureKey: KEY, profileId: "p1", date: "1990-10-14", time: "14:30", timezone: "Asia/Seoul", latitude: 37.5665, longitude: 126.978 };
const birthProfileId = (profileId) => toBirthEntitlementProfileId(computeBirthKey(cards.find((card) => card.profileId === profileId)));
const sha = (text) => createHash("sha256").update(text).digest("hex");
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

function grant(overrides = {}, featureKey = KEY) {
  grants.push({
    ...resolvePaidContentUnlockTarget({ userId: TEST_USER_ID, featureKey }),
    scope: "BIRTH", profileId: birthProfileId("p1"), purchaseProfileId: "p1",
    status: "ACTIVE", expiresAt: null, ...overrides,
  });
}

// 앞으로 12개월(astro_yearly_transit): 행성 위치는 서버 Swiss 대신 astronomy-engine 으로 같은 값을 준다(브라우저 해시와 같은 출처).
const Astronomy = createRequire(import.meta.url)("astronomy-engine");
const BODIES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const lonsAt = (ms) => {
  const t = Astronomy.MakeTime(new Date(ms)), out = {};
  for (const body of BODIES) out[body] = Astronomy.Ecliptic(Astronomy.GeoVector(body, t, true)).elon;
  return out;
};
// 브라우저가 c5952bc88 에서 같은 차트·같은 오늘로 만들던 12개월 본문(renderYear + year 결과)의 sha256.
const YEARLY_PARITY = JSON.parse(readFileSync("__tests__/fixtures/astro-yearly-client-parity.json", "utf8")).hashes;
const YEARLY = "astro_yearly_transit";

function swissChart(chart = FIXTURES.b1.chart) {
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
  const response = await handleAstroRoutes(new Request("https://example.test/api/astro/section", {
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
  transitLons.mockReset().mockResolvedValue(lonsAt);
  connectDb.mockReset().mockResolvedValue(undefined);
  exists.mockImplementation(async (query) => users.find((user) => matches(user, query)) || null);
  findOne.mockImplementation((query) => ({ lean: async () => grants.find((row) => matches(row, query)) || null }));
});

test("the server body matches the browser generator it replaced for every fixture chart and language", () => {
  expect([...SERVER_KEYS]).toEqual(ASTRO_SECTION_FEATURE_KEYS);
  const entries = Object.entries(PARITY);
  expect(entries.length).toBeGreaterThanOrEqual(ASTRO_SECTION_FEATURE_KEYS.length * 30);
  for (const [id, hash] of entries) {
    const [lang, chartId, variant, featureKey] = id.split("|");
    const { html } = buildAstroSectionHtml({ featureKey, chart: swissChart(FIXTURES[chartId][variant]), lang });
    expect(`${id} ${sha(html)}`).toBe(`${id} ${hash}`);
  }
});

test("anonymous requests and forged unlock hints get no body and trigger no calculation", async () => {
  auth.mockResolvedValue(null);
  expect((await request({ ...INPUT, unlocked: true, userId: TEST_USER_ID })).status).toBe(401);
  expect(findOne).not.toHaveBeenCalled();
  expect(swiss).not.toHaveBeenCalled();
});

test.each(ASTRO_SECTION_FEATURE_KEYS)("%s without a purchase returns registry pricing and no body", async (featureKey) => {
  const result = await request({ ...INPUT, featureKey, unlocked: true, passActive: true });
  const { pricing } = getBillingFeaturePricing({ featureKey });
  expect(result).toEqual({ status: 402, body: expect.objectContaining({ reason: "PAYMENT_REQUIRED", featureKey, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice }) });
  expect(result.body.html).toBeUndefined();
  expect(swiss).not.toHaveBeenCalled();
});

test.each(ASTRO_SECTION_FEATURE_KEYS)("a BIRTH grant for %s delivers the profile birth's body and ignores body birth and chart values", async (featureKey) => {
  grant({}, featureKey);
  const result = await request({ ...INPUT, featureKey, date: "2001-01-01", time: "03:00", chart: { forged: true }, planets: { Venus: { sign: { idx: 0 } } } });
  expect(result.status).toBe(200);
  expect(result.body).toMatchObject({ ok: true, unlocked: true, featureKey });
  expect(sha(result.body.html)).toBe(PARITY[`ko|b1|chart|${featureKey}`]);
  expect(swiss.mock.calls[0][0]).toMatchObject({ ASTRO_SWISS_STRICT_ONLY: "1", SWISS_API_FORCE_EXTERNAL: "0" });
  expect(swiss.mock.calls[0][1]).toMatchObject({ year: 1990, month: 10, day: 14, hour: 14, minute: 30 });
  const english = await request({ ...INPUT, featureKey, lang: "en" });
  expect(sha(english.body.html)).toBe(PARITY[`en|b1|chart|${featureKey}`]);
});

test("one key's purchase does not open another counsel key", async () => {
  grant();
  for (const featureKey of ASTRO_SECTION_FEATURE_KEYS.filter((key) => key !== KEY)) {
    expect((await request({ ...INPUT, featureKey })).status).toBe(402);
  }
});

test("another saved profile with the same birth shares the unlock; a different birth needs its own purchase", async () => {
  grant();
  expect((await request({ ...INPUT, profileId: "p2" })).status).toBe(200);
  const other = await request({ ...INPUT, profileId: "p3" });
  expect(other.status).toBe(402);
  expect(other.body.html).toBeUndefined();
});

test("foreign or synthetic profile ids are rejected before any calculation", async () => {
  grant();
  expect((await request({ ...INPUT, profileId: birthProfileId("p1") })).status).toBe(400);
  expect((await request({ ...INPUT, profileId: "x1" })).status).toBe(403);
  expect((await request({ ...INPUT, profileId: "__user__" })).status).toBe(403);
  expect(swiss).not.toHaveBeenCalled();
});

test.each([
  { userId: OTHER_USER_ID }, { status: "REFUNDED" }, { expiresAt: new Date("2020-01-01") },
  { scope: "PROFILE", profileId: "p2" }, { contentKey: "astro_basic_deep_pack" },
])("an unrelated, other-card or inactive grant never opens the body: %j", async (override) => {
  grant(override);
  expect((await request()).status).toBe(402);
  expect(swiss).not.toHaveBeenCalled();
});

// 출생 기반 전환 이전 USER·PROFILE 행(운영 구매자)은 계속 연다 — 재잠금 방지.
test.each([
  { scope: "PROFILE", profileId: "p1" }, { scope: "USER", profileId: "__user__" },
])("a legacy grant from before the birth-scope switch keeps opening the body: %j", async (override) => {
  grant(override);
  expect((await request()).status).toBe(200);
});

test("without a saved profile only a legacy account-wide grant opens the body", async () => {
  const { profileId: _omit, ...withoutProfile } = INPUT;
  const locked = await request(withoutProfile);
  expect(locked.status).toBe(402);
  expect(locked.body).toMatchObject({ requiresProfile: true });
  expect(swiss).not.toHaveBeenCalled();
  grant({ scope: "USER", profileId: "__user__" });
  const opened = await request(withoutProfile);
  expect(opened.status).toBe(200);
  expect(sha(opened.body.html)).toBe(PARITY[`ko|b1|chart|${KEY}`]);
});

test("revocation is checked on each read", async () => {
  grant();
  expect((await request()).status).toBe(200);
  grants[0].status = "REFUNDED";
  expect((await request()).status).toBe(402);
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

test("calculation failure is a retryable 503 without a body or leaked internals", async () => {
  grant();
  swiss.mockRejectedValue(new Error("internal wasm path"));
  const result = await request();
  expect(result.status).toBe(503);
  expect(result.body.html).toBeUndefined();
  expect(JSON.stringify(result)).not.toContain("internal wasm");
});

test.each(["astro_basic_deep_pack", "astro_yearly_transit_x", "", "__proto__"])("unsupported feature %j is rejected before reading rights", async (featureKey) => {
  expect((await request({ ...INPUT, featureKey })).status).toBe(400);
  expect(findOne).not.toHaveBeenCalled();
});

test("invalid birth place input is rejected before calculation", async () => {
  grant();
  expect((await request({ ...INPUT, latitude: 100 })).status).toBe(400);
  expect(swiss).not.toHaveBeenCalled();
});

test("GET never reads rights or generates a body", async () => {
  expect((await request(null, "GET")).status).toBe(405);
  expect(auth).not.toHaveBeenCalled();
});

describe("astro_yearly_transit (앞으로 12개월)", () => {
  const yearlyHtml = (chartId, variant, today, tz) => buildAstroYearlyReading({
    chart: swissChart(FIXTURES[chartId][variant]), timeKnown: variant === "chart", birth: FIXTURES[chartId].birth, today, tz, lonsAt,
  });
  afterEach(() => jest.restoreAllMocks());

  test("the server body matches the browser generator it replaced", () => {
    const entries = Object.entries(YEARLY_PARITY);
    expect(entries.length).toBeGreaterThanOrEqual(12);
    for (const [id, hash] of entries) {
      const [chartId, mode, day, tz] = id.split("|");
      const { reading, html } = yearlyHtml(chartId, mode === "timed" ? "chart" : "noon", day, Number(tz));
      expect(`${id} ${sha(html + "\n" + JSON.stringify(reading))}`).toBe(`${id} ${hash.body}`);
    }
  });

  test("without a purchase returns registry pricing and no body", async () => {
    grant();
    const result = await request({ ...INPUT, featureKey: YEARLY, unlocked: true, transitTz: 9 });
    const { pricing } = getBillingFeaturePricing({ featureKey: YEARLY });
    expect(result).toEqual({ status: 402, body: expect.objectContaining({ reason: "PAYMENT_REQUIRED", featureKey: YEARLY, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice }) });
    expect(swiss).not.toHaveBeenCalled();
    expect(transitLons).not.toHaveBeenCalled();
  });

  test("a BIRTH grant delivers the profile birth's 12 months from the server's today in the device time zone", async () => {
    grant({}, YEARLY);
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-04T03:00:00Z"));
    const seoul = await request({ ...INPUT, featureKey: YEARLY, transitTz: 9, date: "2001-01-01", time: "03:00", today: "2030-01-01" });
    expect(seoul.status).toBe(200);
    expect(seoul.body).toMatchObject({ ok: true, unlocked: true, featureKey: YEARLY });
    expect(seoul.body.html).toBe(yearlyHtml("b1", "chart", "2026-10-04", 9).html);
    expect(swiss.mock.calls[0][1]).toMatchObject({ year: 1990, month: 10, day: 14, hour: 14, minute: 30 });
    expect(transitLons.mock.calls[0][1]).toMatchObject({ requestUrl: "https://example.test/api/astro/section" });
    Date.now.mockReturnValue(Date.parse("2026-12-28T20:00:00Z"));
    const newYork = await request({ ...INPUT, featureKey: YEARLY, transitTz: -5 });
    expect(newYork.body.html).toBe(yearlyHtml("b1", "chart", "2026-12-28", -5).html);
    const outOfRange = await request({ ...INPUT, featureKey: YEARLY, transitTz: 99 });
    expect(outOfRange.body.html).toBe(yearlyHtml("b1", "chart", "2026-12-29", 9).html);
  });

  test("a transit calculation failure is a retryable 503 without a body", async () => {
    grant({}, YEARLY);
    transitLons.mockRejectedValue(new Error("internal wasm path"));
    const result = await request({ ...INPUT, featureKey: YEARLY, transitTz: 9 });
    expect(result.status).toBe(503);
    expect(result.body.html).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("internal wasm");
  });
});
