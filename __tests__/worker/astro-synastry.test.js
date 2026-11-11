/** @jest-environment node */
import { jest } from "@jest/globals";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";

// 점성술 시나스트리 궁합(유명인 compat-astro-synastry · 직접 입력 compat-astro-direct-synastry) — 회당 결제 50코인(/api/astro/synastry).
// 결제 1건 = (requestId, 두 사람의 출생 입력) 한 조합. 두 차트는 서버 Swiss 계산으로만 만든다.
const auth = jest.fn();
const swiss = jest.fn();
const findOne = jest.fn();
const write = jest.fn(() => { throw new Error("Read route attempted a write"); });
const connectDb = jest.fn();
const BIRTH = { year: 1990, month: 10, day: 14, hour: 14, minute: 30 };
const cards = [testCard("p1", BIRTH), testCard("p2", { ...BIRTH, timeUnknown: true }), testCard("x1", { ...BIRTH, userId: OTHER_USER_ID })];
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
  User: { exists: jest.fn(), updateOne: write, findOneAndUpdate: write },
  ProfileCard: { modelName: "ProfileCard", findOne: (...args) => profileCards.findOne(...args) },
}));
jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({
  getSwissWesternChart: swiss, getSwissVedicPlanets: jest.fn(),
}));
jest.unstable_mockModule("../../worker/lib/cms-records.js", () => ({ primeCmsRecords: jest.fn() }));
// 정본 증빙 검사와 증빙 claim. claim 은 증빙 하나를 (userId, requestId) 하나에만 묶는 저장소를 흉내 낸다.
const verifyPerUsePayment = jest.fn();
const claimed = new Map();
const claimRequestBillingEvidence = jest.fn(async (_env, { userId, requestId, evidenceIds }) => {
  for (const id of evidenceIds) {
    const owner = claimed.get(id);
    if (owner && (owner.userId !== userId || owner.requestId !== requestId)) {
      return { ok: false, status: 409, code: "EVIDENCE_ALREADY_USED", message: "이미 다른 상담에 사용된 결제입니다. 새 상담은 새로 결제해 주세요." };
    }
  }
  for (const id of evidenceIds) claimed.set(id, { userId, requestId });
  return { ok: true, claimed: evidenceIds.length };
});
jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({ verifyPerUsePayment, logPerUsePaymentProof: jest.fn() }));
jest.unstable_mockModule("../../worker/lib/billing-evidence-claim.js", () => ({
  claimRequestBillingEvidence,
  evidenceClaimErrorBody: (result) => ({ ok: false, reason: result.code, code: result.code, message: result.message, error: { code: result.code, message: result.message } }),
}));

let handleAstroRoutes, getBillingFeaturePricing, syn;
beforeAll(async () => {
  ({ handleAstroRoutes } = await import("../../worker/routes/astro.js"));
  ({ getBillingFeaturePricing } = await import("../../worker/lib/billing-feature-registry.js"));
  syn = await import("../../worker/lib/astro-section/synastry.js");
});

const CELEB = "compat-astro-synastry";
const DIRECT = "compat-astro-direct-synastry";
const FIXTURES = JSON.parse(readFileSync("__tests__/fixtures/astro-natal-charts.json", "utf8"));
// c5952bc88 의 브라우저 _astroPickCelebCore/_astroDirectSynastryCore 가 같은 차트로 만들던 본문·결과(·프롬프트 payload)의 sha256
// (scratch vm 으로 HEAD 생성기를 DOM 대역과 함께 돌려 얻었다) + 그 브라우저가 유명인 305명마다 Swiss 에 넘기던 출생 순간 목록의 sha256.
const PARITY = JSON.parse(readFileSync("__tests__/fixtures/astro-synastry-client-parity.json", "utf8"));
const sha = (text) => createHash("sha256").update(text).digest("hex");
const rid = (key, tail = "lz9k2abcd") => `compat-archive:${key}:${tail}`;
const ME = { date: "2001-01-16", time: "03:00", timeKnown: true, timezone: 9, latitude: 37.5665, longitude: 126.978 };
const HANNI = { name: "뉴진스 하니", birth: "2004-10-06" };
const PARTNER = { name: "민지", date: "1992-03-16", time: "09:10", gender: "F", tzOffsetHours: 9, latitude: 35.1796, longitude: 129.0756, cityLabel: "부산" };
const celebBody = (extra = {}) => ({ featureKey: CELEB, requestId: rid(CELEB), profileId: "p1", lang: "ko", ...ME, celeb: HANNI, ...extra });
const directBody = (extra = {}) => ({ featureKey: DIRECT, requestId: rid(DIRECT), profileId: "p1", lang: "ko", ...ME, partner: PARTNER, ...extra });
const paidBy = (transactionId) => verifyPerUsePayment.mockResolvedValue({ proven: true, source: "coin", reason: "", transactionId });

function swissChart(chart) {
  const lon = (p) => p.idx * 30 + p.deg;
  return {
    planets: Object.fromEntries(Object.entries({ ...chart.planets, Sun: { sign: chart.sun }, Moon: { sign: chart.moon } }).map(([body, row]) => [body, {
      longitude: lon(body === "Sun" ? chart.sun : body === "Moon" ? chart.moon : row.sign), retrograde: row.retro,
    }])),
    ascendant: { longitude: lon(chart.asc) }, midheaven: { longitude: lon(chart.mc) },
    houseCusps: chart.houseCuspsLon, source: "swiss-wasm-local", aspects: [],
  };
}
// 서버 Swiss 목: 1990년 출생(프로필 p1·p2) → b1, 그 밖(유명인·상대) → x3.
const MY_CHART = swissChart(FIXTURES.b1.chart);
const OTHER_CHART = swissChart(FIXTURES.x3.chart);

async function request(body, method = "POST") {
  const response = await handleAstroRoutes(new Request("https://example.test/api/astro/synastry", {
    method, ...(method === "POST" ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }), {});
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(write).not.toHaveBeenCalled();
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  jest.clearAllMocks();
  claimed.clear();
  auth.mockReset().mockResolvedValue({ userId: TEST_USER_ID });
  swiss.mockReset().mockImplementation(async (_env, input) => (input.year === 1990 ? MY_CHART : OTHER_CHART));
  connectDb.mockReset().mockResolvedValue(undefined);
  findOne.mockImplementation(() => ({ lean: async () => null }));
  verifyPerUsePayment.mockReset().mockResolvedValue({ proven: false, source: "", reason: "NO_EXISTING_CONSUMPTION" });
});

describe("parity with the browser generator it replaced", () => {
  const entries = Object.entries(PARITY.hashes);
  test("the fixture covers every celebrity and both products in two languages", () => {
    expect(PARITY.celebMoments.count).toBe(305);
    expect(entries.filter(([id]) => id.startsWith("ko|celeb|")).length).toBe(305);
    expect(entries.filter(([id]) => id.includes("|direct|")).length).toBeGreaterThanOrEqual(100);
    expect(entries.some(([id]) => id.startsWith("en|"))).toBe(true);
  });

  test("every celebrity birth moment equals the one the browser handed to Swiss", () => {
    const moments = entries.filter(([id]) => id.startsWith("ko|celeb|")).map(([id]) => {
      const [, , name, birth] = id.split("|");
      const found = syn.findAstroSynastryCeleb({ name, birth });
      const m = found.moment;
      return [name, birth, m.year, m.month, m.day, m.hour + m.minute / 60, m.lat, m.lon, m.tz];
    });
    expect(sha(JSON.stringify(moments))).toBe(PARITY.celebMoments.sha256);
  });

  test("celebrity synastry html and result equal the HEAD client output", () => {
    for (const [id, hash] of entries.filter(([key]) => key.includes("|celeb|"))) {
      const [lang, , name, birth, mine, other] = id.split("|");
      const [myId, myVariant] = mine.split("."); const [pId, pVariant] = other.split(".");
      const celeb = syn.findAstroSynastryCeleb({ name, birth, lang });
      const out = syn.buildAstroCelebSynastry({ chart: swissChart(FIXTURES[myId][myVariant]), celebChart: swissChart(FIXTURES[pId][pVariant]), celeb, lang });
      expect(`${id} ${sha(`${out.html}\n${JSON.stringify(out.result)}`)}`).toBe(`${id} ${hash}`);
    }
  });

  test("direct synastry html, result and AI prompt payload equal the HEAD client output", () => {
    const names = ["상대방", "Alex", "김민지", "Jean-Luc"];
    const genders = ["M", "F", "OTHER"];
    for (const [id, hash] of entries.filter(([key]) => key.includes("|direct|"))) {
      const [lang, , mine, other, index] = id.split("|");
      const i = Number(index);
      const [myId, myVariant] = mine.split("."); const [pId, pVariant] = other.split(".");
      const partner = {
        name: i % 5 === 4 ? "상대방" : names[i % names.length], gender: genders[i % 3],
        date: `19${80 + (i % 20)}-0${1 + (i % 9)}-1${i % 10}`, time: `${String(i % 24).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
        tzOffsetHours: 9, latitude: 37.6, longitude: 127.0, cityLabel: "",
      };
      const out = syn.buildAstroDirectSynastry({ chart: swissChart(FIXTURES[myId][myVariant]), partnerChart: swissChart(FIXTURES[pId][pVariant]), partner, lang });
      expect(`${id} ${sha(`${out.html}\n${JSON.stringify(out.result)}\n${JSON.stringify(out.llmPayload)}`)}`).toBe(`${id} ${hash}`);
    }
  });
});

test("only POST is accepted", async () => {
  const response = await handleAstroRoutes(new Request("https://example.test/api/astro/synastry", { method: "GET" }), {});
  expect(response.status).toBe(405);
});

test("a direct partner name is text, never markup", async () => {
  paidBy("ded-8");
  const name = "<img src=x onerror=alert(1)>";
  const result = await request(directBody({ partner: { ...PARTNER, name } }));
  expect(result.status).toBe(200);
  expect(result.body.html).not.toContain("<img src=x");
  expect(result.body.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  expect(result.body.llmPayload.partnerName).toBe(name);
});

test.each([CELEB,DIRECT])('public %s accepts explicit pair and never spends or claims',async featureKey=>{
 auth.mockRejectedValue(new Error('must not authenticate'));connectDb.mockRejectedValue(new Error('must not read DB'));
 verifyPerUsePayment.mockRejectedValue(new Error('must not spend'));claimRequestBillingEvidence.mockRejectedValue(new Error('must not claim'));
 const body=featureKey===CELEB?celebBody({profileId:'x1',requestId:''}):directBody({profileId:'x1',requestId:''});
 const result=await request(body);expect(result.status).toBe(200);expect(result.body.accessSource).toBe('public');
 const expected=featureKey===CELEB?syn.buildAstroCelebSynastry({chart:OTHER_CHART,celebChart:OTHER_CHART,celeb:syn.findAstroSynastryCeleb(HANNI),lang:'ko'}):syn.buildAstroDirectSynastry({chart:OTHER_CHART,partnerChart:OTHER_CHART,partner:PARTNER,lang:'ko'});
 expect(result.body.html).toBe(expected.html);expect(result.body.result).toEqual(expected.result);
 expect(swiss.mock.calls[0][1]).toMatchObject({year:2001,month:1,day:16,hour:3,minute:0});
 expect((await request({...body,requestId:'another-paid-request',partner:featureKey===DIRECT?{...PARTNER,time:'09:11'}:undefined})).status).toBe(200);
 expect(auth).not.toHaveBeenCalled();expect(connectDb).not.toHaveBeenCalled();expect(findOne).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();expect(verifyPerUsePayment).not.toHaveBeenCalled();expect(claimRequestBillingEvidence).not.toHaveBeenCalled();
});
test.each([{date:'invalid'},{timezone:99},{partner:{...PARTNER,time:'25:00'}},{partner:{...PARTNER,latitude:91}}])('invalid explicit synastry input stays 400: %j',async patch=>{
 const result=await request(directBody(patch));expect(result.status).toBe(400);expect(swiss).not.toHaveBeenCalled();expect(verifyPerUsePayment).not.toHaveBeenCalled();
});
test('unknown celebrity is rejected before calculation',async()=>{expect((await request(celebBody({celeb:{name:'unknown',birth:'2000-01-01'}}))).status).toBe(400);expect(swiss).not.toHaveBeenCalled();});
test('astronomy failure remains retryable without leaked internals or a charge',async()=>{swiss.mockRejectedValue(new Error('private wasm path'));const result=await request(directBody());expect(result.status).toBe(503);expect(JSON.stringify(result)).not.toContain('private wasm');expect(verifyPerUsePayment).not.toHaveBeenCalled();});
