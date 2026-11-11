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

// 출생 기반 전환 이전 USER·PROFILE 행(운영 구매자)은 계속 연다 — 재잠금 방지.

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

  test("a transit calculation failure is a retryable 503 without a body", async () => {
    grant({}, YEARLY);
    transitLons.mockRejectedValue(new Error("internal wasm path"));
    const result = await request({ ...INPUT, featureKey: YEARLY, transitTz: 9 });
    expect(result.status).toBe(503);
    expect(result.body.html).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("internal wasm");
  });
});

test.each(ASTRO_SECTION_FEATURE_KEYS)('public %s calculates explicit birth without any database access',async featureKey=>{
 auth.mockRejectedValue(new Error('must not authenticate'));connectDb.mockRejectedValue(new Error('must not read DB'));
 const result=await request({...INPUT,featureKey,profileId:'x1',date:'2001-01-01',time:'03:00',chart:{forged:true}});
 expect(result.status).toBe(200);expect(result.body.accessSource).toBe('public');expect(sha(result.body.html)).toBe(PARITY['ko|b1|chart|'+featureKey]);
 expect(swiss.mock.calls[0][1]).toMatchObject({year:2001,month:1,day:1,hour:3,minute:0});expect(auth).not.toHaveBeenCalled();expect(connectDb).not.toHaveBeenCalled();expect(findOne).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
});
test('public yearly reading uses explicit birth and server date, without payment or profile lookup',async()=>{
 jest.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-04T03:00:00Z'));
 try{const result=await request({...INPUT,featureKey:YEARLY,profileId:'x1',transitTz:9,today:'2030-01-01'});
 expect(result.status).toBe(200);const expected=buildAstroYearlyReading({chart:swissChart(FIXTURES.b1.chart),timeKnown:true,birth:FIXTURES.b1.birth,today:'2026-10-04',tz:9,lonsAt});
 expect(result.body.html).toBe(expected.html);expect(auth).not.toHaveBeenCalled();expect(connectDb).not.toHaveBeenCalled();expect(findOne).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();}finally{jest.restoreAllMocks();}
});
test('profile-only public input is invalid rather than reading the private card',async()=>{expect((await request({featureKey:KEY,profileId:'p1'})).status).toBe(400);expect(swiss).not.toHaveBeenCalled();expect(auth).not.toHaveBeenCalled();expect(connectDb).not.toHaveBeenCalled();expect(findOne).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();});
