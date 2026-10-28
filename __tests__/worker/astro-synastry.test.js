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

test("anonymous requests get no body and trigger no calculation or payment lookup", async () => {
  auth.mockResolvedValue(null);
  for (const body of [celebBody({ unlocked: true }), directBody({ unlocked: true })]) {
    const result = await request(body);
    expect(result.status).toBe(401);
    expect(result.body.html).toBeUndefined();
  }
  expect(swiss).not.toHaveBeenCalled();
  expect(verifyPerUsePayment).not.toHaveBeenCalled();
});

test("an auth database outage is retryable, not a login prompt", async () => {
  auth.mockRejectedValue(Object.assign(new Error("db down"), { code: "AUTH_DB_UNAVAILABLE" }));
  expect((await request(celebBody())).status).toBe(503);
});

test("only POST is accepted", async () => {
  const response = await handleAstroRoutes(new Request("https://example.test/api/astro/synastry", { method: "GET" }), {});
  expect(response.status).toBe(405);
});

test.each([CELEB, DIRECT])("%s without this request's payment returns registry pricing and no body", async (featureKey) => {
  const result = await request(featureKey === CELEB ? celebBody({ unlocked: true, passActive: true }) : directBody({ unlocked: true, passActive: true }));
  const { pricing } = getBillingFeaturePricing({ featureKey });
  expect(pricing.coinPrice).toBe(50);
  expect(result).toEqual({ status: 402, body: expect.objectContaining({ reason: "PAYMENT_REQUIRED", featureKey, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice }) });
  expect(result.body.html).toBeUndefined();
  expect(result.body.result).toBeUndefined();
  expect(verifyPerUsePayment).toHaveBeenCalledTimes(1);
  expect(verifyPerUsePayment).toHaveBeenCalledWith(expect.anything(), { userId: TEST_USER_ID, featureKey, coinPrice: 50, requestId: rid(featureKey), profileId: "p1", requireExisting: true });
  expect(claimRequestBillingEvidence).not.toHaveBeenCalled();
});

test("bad feature keys, foreign request ids, unknown celebrities and broken partner input are 400 before any payment lookup", async () => {
  const cases = [
    [celebBody({ featureKey: "astro_yearly_transit" }), "ASTRO_INVALID_FEATURE"],
    [celebBody({ requestId: rid(DIRECT) }), "REQUEST_ID_INVALID"],
    [celebBody({ requestId: "" }), "REQUEST_ID_INVALID"],
    [celebBody({ requestId: `${rid(CELEB)}|x` }), "REQUEST_ID_INVALID"],
    [celebBody({ requestId: "compat-archive:compat-astro-synastry:A!" }), "REQUEST_ID_INVALID"],
    [celebBody({ celeb: { name: "없는 사람", birth: "2000-01-01" } }), "ASTRO_CELEB_UNKNOWN"],
    [celebBody({ celeb: { name: HANNI.name, birth: "2004-10-07" } }), "ASTRO_CELEB_UNKNOWN"],
    [directBody({ partner: { ...PARTNER, date: "1992-3-16" } }), "ASTRO_INVALID_PARTNER_INPUT"],
    [directBody({ partner: { ...PARTNER, time: "25:00" } }), "ASTRO_INVALID_PARTNER_INPUT"],
    [directBody({ partner: { ...PARTNER, latitude: 91 } }), "ASTRO_INVALID_PARTNER_INPUT"],
    [directBody({ partner: { ...PARTNER, tzOffsetHours: "Asia/Seoul" } }), "ASTRO_INVALID_PARTNER_INPUT"],
    [celebBody({ timezone: 99 }), "ASTRO_INVALID_BIRTH_INPUT"],
    [celebBody({ profileId: "", date: "nope" }), "ASTRO_INVALID_BIRTH_INPUT"],
  ];
  for (const [body, code] of cases) {
    const result = await request(body);
    expect([code, result.status]).toEqual([code, 400]);
    expect(result.body.code).toBe(code);
  }
  expect(verifyPerUsePayment).not.toHaveBeenCalled();
  expect(claimRequestBillingEvidence).not.toHaveBeenCalled();
});

test("a paid celebrity synastry is drawn from the saved card birth and the server celebrity record, then claims this pair", async () => {
  paidBy("ded-1");
  // 본문 생년월일(2001-01-16)·차트·점수 값은 무시한다 — 카드 p1(1990-10-14 14:30)과 서버 유명인 사본만 쓴다.
  const result = await request(celebBody({ chart: { sun: { idx: 0 } }, score: 100, celeb: { ...HANNI, hour: 3, birthGeo: { lat: 0, lon: 0, tz: 0 } } }));
  expect(result.status).toBe(200);
  const celeb = syn.findAstroSynastryCeleb(HANNI);
  const expected = syn.buildAstroCelebSynastry({ chart: MY_CHART, celebChart: OTHER_CHART, celeb, lang: "ko" });
  expect(result.body).toEqual({ ok: true, unlocked: true, featureKey: CELEB, html: expected.html, result: expected.result });
  expect(swiss).toHaveBeenCalledWith(expect.anything(), { year: 1990, month: 10, day: 14, hour: 14, minute: 30, timezone: 9, lat: 37.5665, lon: 126.978 }, expect.anything());
  const m = celeb.moment;
  expect(swiss).toHaveBeenCalledWith(expect.anything(), { year: m.year, month: m.month, day: m.day, hour: m.hour, minute: m.minute, timezone: m.tz, lat: m.lat, lon: m.lon }, expect.anything());
  expect(verifyPerUsePayment).toHaveBeenCalledWith(expect.anything(), { userId: TEST_USER_ID, featureKey: CELEB, coinPrice: 50, requestId: rid(CELEB), profileId: "p1", requireExisting: true });
  expect(claimRequestBillingEvidence).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
    userId: TEST_USER_ID, evidenceIds: ["ded-1"], featureKey: CELEB, kind: "astro-synastry",
    requestId: expect.stringMatching(new RegExp(`^${rid(CELEB)}\\|[0-9a-f]{32}$`)),
  }));
});

test("a paid direct synastry returns the body, result and AI prompt payload for the partner the server charted", async () => {
  paidBy("ded-2");
  const result = await request(directBody());
  expect(result.status).toBe(200);
  const expected = syn.buildAstroDirectSynastry({ chart: MY_CHART, partnerChart: OTHER_CHART, partner: PARTNER, lang: "ko" });
  expect(result.body).toEqual({ ok: true, unlocked: true, featureKey: DIRECT, html: expected.html, result: expected.result, llmPayload: expected.llmPayload });
  expect(result.body.llmPayload).toMatchObject({ engine: "western_synastry", partnerName: "민지", partnerInput: { birthDate: "1992-03-16", birthTimeLocal: "09:10", cityLabel: "부산", tzOffsetHours: 9 } });
  expect(swiss).toHaveBeenCalledWith(expect.anything(), { year: 1992, month: 3, day: 16, hour: 9, minute: 10, timezone: 9, lat: 35.1796, lon: 129.0756 }, expect.anything());
});

test("without a saved card the request birth is used; an unknown card time is drawn at noon", async () => {
  paidBy("ded-3");
  expect((await request(celebBody({ profileId: "" }))).status).toBe(200);
  expect(swiss).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ year: 2001, month: 1, day: 16, hour: 3, minute: 0 }), expect.anything());
  swiss.mockClear();
  paidBy("ded-4");
  expect((await request(celebBody({ profileId: "p2", requestId: rid(CELEB, "other1234") }))).status).toBe(200);
  expect(swiss).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ year: 1990, month: 10, day: 14, hour: 12, minute: 0 }), expect.anything());
});

test("one payment opens one pair: a retry of the same pair is served, another partner is 409", async () => {
  paidBy("ded-5");
  const first = await request(celebBody());
  expect(first.status).toBe(200);
  expect(await request(celebBody())).toEqual(first);
  const other = await request(celebBody({ celeb: { name: "뉴진스 민지", birth: "2004-07-18" } }));
  expect(other.status).toBe(409);
  expect(other.body).toMatchObject({ code: "EVIDENCE_ALREADY_USED" });
  expect(other.body.html).toBeUndefined();

  paidBy("ded-6");
  expect((await request(directBody())).status).toBe(200);
  expect((await request(directBody())).status).toBe(200);
  for (const partner of [{ ...PARTNER, name: "다른 사람" }, { ...PARTNER, time: "09:11" }, { ...PARTNER, latitude: 35.18 }, { ...PARTNER, gender: "M" }]) {
    const changed = await request(directBody({ partner }));
    expect(changed.status).toBe(409);
    expect(changed.body.html).toBeUndefined();
  }
  // 도시 이름표는 계산에 쓰이지 않는다 — 같은 조합이다.
  expect((await request(directBody({ partner: { ...PARTNER, cityLabel: "Busan" } }))).status).toBe(200);
});

test("a pass opened in the shell is settled on this request id only when the shell says it used a pass", async () => {
  expect((await request(directBody())).status).toBe(402);
  verifyPerUsePayment.mockReset()
    .mockResolvedValueOnce({ proven: false, source: "", reason: "NO_EXISTING_CONSUMPTION" })
    .mockResolvedValueOnce({ proven: true, source: "pass", reason: "" });
  const result = await request(directBody({ accessMethod: "pass" }));
  expect(result.status).toBe(200);
  expect(verifyPerUsePayment).toHaveBeenNthCalledWith(2, expect.anything(), { userId: TEST_USER_ID, featureKey: DIRECT, coinPrice: 50, requestId: rid(DIRECT), profileId: "p1" });
  expect(claimRequestBillingEvidence).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ evidenceIds: [`pass-use:${TEST_USER_ID}:${DIRECT}:${rid(DIRECT)}`] }));
});

test("an admin is served without a claim", async () => {
  verifyPerUsePayment.mockResolvedValue({ proven: true, source: "admin", reason: "" });
  expect((await request(celebBody())).status).toBe(200);
  expect(claimRequestBillingEvidence).not.toHaveBeenCalled();
});

test("payment DB doubt, claim store failure, card lookup failure or astronomy failure stays retryable instead of prompting purchase", async () => {
  verifyPerUsePayment.mockResolvedValue({ proven: null, source: "", reason: "DB_DEGRADED" });
  const doubt = await request(celebBody());
  expect(doubt.status).toBe(503);
  expect(doubt.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  expect(doubt.body.html).toBeUndefined();
  verifyPerUsePayment.mockRejectedValueOnce(new Error("private database connection information"));
  const thrown = await request(celebBody());
  expect(thrown.status).toBe(503);
  expect(JSON.stringify(thrown.body)).not.toContain("private database");
  paidBy("ded-7");
  claimRequestBillingEvidence.mockResolvedValueOnce({ ok: false, status: 503, code: "PAYMENT_VERIFY_UNAVAILABLE", message: "결제 확인이 잠시 지연되고 있어요." });
  const store = await request(celebBody());
  expect(store.status).toBe(503);
  expect(store.body.html).toBeUndefined();
  claimRequestBillingEvidence.mockRejectedValueOnce(new Error("claim store down"));
  expect((await request(celebBody())).status).toBe(503);
  connectDb.mockRejectedValueOnce(new Error("card store down"));
  expect((await request(celebBody())).status).toBe(503);
  verifyPerUsePayment.mockClear();
  swiss.mockRejectedValueOnce(new Error("ephemeris unavailable"));
  const astro = await request(directBody());
  expect(astro.status).toBe(503);
  // 그리기 전에 실패하면 결제를 확인(이용권 차감)하지 않는다.
  expect(verifyPerUsePayment).not.toHaveBeenCalled();
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
