/** @jest-environment node */
import { jest } from "@jest/globals";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";

const auth = jest.fn();
const exists = jest.fn();
const findOne = jest.fn();
const write = jest.fn(() => { throw new Error("Read route attempted a write"); });
const connectDb = jest.fn();
// 패리티 픽스처 첫 사례와 같은 출생(1990-05-15 14:30 남) — 그 대운 행으로 section_daewun 을 연다.
const BIRTH = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "M" };
const cards = [testCard("p1", BIRTH), testCard("p2", BIRTH), testCard("p3", { ...BIRTH, day: 16 }), testCard("x1", { ...BIRTH, userId: OTHER_USER_ID })];
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
jest.unstable_mockModule("../../worker/lib/cms-records.js", () => ({ primeCmsRecords: jest.fn() }));

let handleSajuSection, buildSajuSectionHtml, resolvePaidContentUnlockTarget, getBillingFeaturePricing;
beforeAll(async () => {
  ({ handleSajuSection } = await import("../../worker/routes/saju-section.js"));
  ({ buildSajuSectionHtml } = await import("../../worker/lib/saju-section/report.js"));
  ({ resolvePaidContentUnlockTarget } = await import("../../worker/lib/content-unlocks.js"));
  ({ getBillingFeaturePricing } = await import("../../worker/lib/billing-feature-registry.js"));
});
// HEAD 클라이언트 엔진(js/saju-engine.js)이 같은 입력으로 그린 HTML 의 sha256 — 서버 이전이 문구·계산을 바꾸지 않았다는 근거.
const PARITY = JSON.parse(readFileSync("__tests__/fixtures/saju-section-client-parity.json", "utf8"));
const [FIRST_AGE, FIRST_GANZHI] = PARITY.renders[0].daewun[0];
const DAEWUN = { age: FIRST_AGE, gan: FIRST_GANZHI[0], zhi: FIRST_GANZHI[1] };
const INPUT = { profileId: "p1", featureKey: "section_summary", name: "테스트", mode: "pig", lang: "ko" };
const CARD_BIRTH = { calendarDate: "1990-05-15", calType: "solar", hour: 14, minute: 30, timeKnown: true };
const birthProfileId = (profileId) => toBirthEntitlementProfileId(computeBirthKey(cards.find((card) => card.profileId === profileId)));
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
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

function grant(overrides = {}, featureKey = "section_summary") {
  grants.push({
    ...resolvePaidContentUnlockTarget({ userId: TEST_USER_ID, featureKey }),
    scope: "BIRTH", profileId: birthProfileId("p1"), purchaseProfileId: "p1",
    status: "ACTIVE", expiresAt: null, ...overrides,
  });
}

async function request(body = INPUT, method = "POST") {
  const response = await handleSajuSection(new Request("https://example.test/api/saju/section", {
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
  connectDb.mockReset().mockResolvedValue(undefined);
  exists.mockImplementation(async (query) => users.find((user) => matches(user, query)) || null);
  findOne.mockImplementation((query) => ({ lean: async () => grants.find((row) => matches(row, query)) || null }));
});

test("anonymous and forged unlock hints cannot read a section", async () => {
  auth.mockResolvedValue(null);
  expect((await request({ ...INPUT, unlocked: true, userId: TEST_USER_ID })).status).toBe(401);
  expect(findOne).not.toHaveBeenCalled();
});

test("only the two saju section keys are served", async () => {
  grant();
  expect((await request({ ...INPUT, featureKey: "saju_premium_report" })).body).toMatchObject({ code: "SAJU_INVALID_FEATURE" });
  expect(findOne).not.toHaveBeenCalled();
});

test.each(["section_summary", "section_daewun"])("unowned %s returns registry pricing without HTML", async (featureKey) => {
  const result = await request({ ...INPUT, featureKey, daewun: DAEWUN, unlocked: true, passActive: true });
  const { pricing } = getBillingFeaturePricing({ featureKey });
  expect(result).toEqual({ status: 402, body: expect.objectContaining({ featureKey, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice }) });
  expect(result.body.html).toBeUndefined();
});

test("a BIRTH grant renders the stored profile birth and gender, ignoring the body's", async () => {
  grant();
  const result = await request({ ...INPUT, birth: { date: "2001-01-01", hour: 3, minute: 0 }, gender: "F" });
  expect(result.status).toBe(200);
  const expected = buildSajuSectionHtml({ featureKey: "section_summary", birth: CARD_BIRTH, gender: "M", name: "테스트", mode: "pig", lang: "ko" });
  expect(result.body).toEqual({ ok: true, unlocked: true, featureKey: "section_summary", html: expected.html });
});

test("the daewun section renders only a row of the stored birth's own daewun list", async () => {
  grant({}, "section_daewun");
  const result = await request({ ...INPUT, featureKey: "section_daewun", daewun: DAEWUN });
  expect(result.status).toBe(200);
  expect(result.body.daewun).toEqual(DAEWUN);
  expect(result.body.html).toContain(DAEWUN.gan + DAEWUN.zhi);
  expect((await request({ ...INPUT, featureKey: "section_daewun", daewun: { ...DAEWUN, age: DAEWUN.age + 1 } })).body)
    .toMatchObject({ code: "SAJU_INVALID_DAEWUN" });
  // 대운 권리는 종합을 열지 않는다.
  expect((await request()).status).toBe(402);
});

test("another saved profile with the same birth shares the unlock; a different birth needs its own purchase", async () => {
  grant();
  expect((await request({ ...INPUT, profileId: "p2" })).status).toBe(200);
  const other = await request({ ...INPUT, profileId: "p3" });
  expect(other.status).toBe(402);
  expect(other.body.message).toContain("이 생년월일은 별도 구매가 필요합니다");
  cards[0].birth.day = 20;
  expect((await request()).status).toBe(402);
});

test("foreign or synthetic profile ids are rejected", async () => {
  grant();
  expect((await request({ ...INPUT, profileId: birthProfileId("p1") })).status).toBe(400);
  expect((await request({ ...INPUT, profileId: "x1" })).status).toBe(403);
  expect((await request({ ...INPUT, profileId: "__user__" })).status).toBe(403);
});

test.each([
  { userId: OTHER_USER_ID }, { status: "REFUNDED" }, { expiresAt: new Date("2020-01-01") },
  { scope: "PROFILE", profileId: "p2" }, { contentKey: "saju.compatibility" },
])("an unrelated, other-card or inactive grant never opens the section: %j", async (override) => {
  grant(override);
  expect((await request({ ...INPUT, userId: OTHER_USER_ID })).status).toBe(402);
});

test.each(["unlockedFeatures", "paidFeatures"])("legacy %s account array is not evidence", async (field) => {
  users.push({ _id: TEST_USER_ID, [field]: ["section_summary"] });
  expect((await request()).status).toBe(402);
  const { profileId: _omit, ...withoutProfile } = INPUT;
  expect((await request({ ...withoutProfile, birth: { date: "1990-05-15", hour: 14, minute: 30 } })).status).toBe(402);
});

test.each([
  { scope: "PROFILE", profileId: "p1" }, { scope: "USER", profileId: "__user__" },
])("a legacy grant from before the birth-scope switch keeps opening the section: %j", async (override) => {
  grant(override);
  expect((await request()).status).toBe(200);
});

describe("without a saved profile", () => {
  const { profileId: _omit, ...ACCOUNT } = INPUT;
  const BODY_BIRTH = { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 };

  test.each([{ scope: "USER", profileId: "__user__" }, { scope: "USER", profileId: null }])(
    "an account-level legacy grant renders the body birth: %j", async (override) => {
      grant(override);
      const result = await request({ ...ACCOUNT, birth: BODY_BIRTH, gender: "F" });
      expect(result.status).toBe(200);
      const expected = buildSajuSectionHtml({
        featureKey: "section_summary", birth: { calendarDate: "1985-11-02", calType: "solar", hour: 6, minute: 5, timeKnown: true },
        gender: "F", name: "테스트", mode: "pig", lang: "ko",
      });
      expect(result.body.html).toBe(expected.html);
    });

  test.each([{}, { scope: "PROFILE", profileId: "p1" }])("a birth or profile grant is not an account unlock: %j", async (override) => {
    grant(override);
    const result = await request({ ...ACCOUNT, birth: BODY_BIRTH });
    expect(result.status).toBe(402);
    expect(result.body).toMatchObject({ requiresProfile: true });
  });

  test("an invalid body birth is a 400, not a render", async () => {
    grant({ scope: "USER", profileId: "__user__" });
    expect((await request({ ...ACCOUNT, birth: { date: "1985/11/02" } })).body).toMatchObject({ code: "SAJU_INVALID_BIRTH" });
  });
});

test("revocation is checked on each read rather than cached as access", async () => {
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
});

test("invalid place input is rejected; the name is escaped; neo and pig differ", async () => {
  grant();
  expect((await request({ ...INPUT, place: { latitude: 100 } })).body).toMatchObject({ code: "SAJU_INVALID_PLACE" });
  const pig = await request({ ...INPUT, name: '<img src=x onerror="alert(1)">' });
  expect(pig.status).toBe(200);
  expect(pig.body.html).not.toContain("<img src=x");
  expect(pig.body.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  const neo = await request({ ...INPUT, mode: "neo" });
  expect(neo.body.html).not.toBe((await request()).body.html);
});

test("GET never reads rights or renders", async () => {
  expect((await request(null, "GET")).status).toBe(405);
  expect(auth).not.toHaveBeenCalled();
});

test.each(PARITY.renders.map((render) => [render.id, render.mode, render]))("server HTML equals the HEAD client engine output: %s %s", (id, mode, render) => {
  const c = PARITY.cases.find((entry) => entry.id === id);
  const base = {
    birth: { calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false },
    gender: c.gender, name: c.name, mode, place: c.place, jongDecision: c.jong, now: new Date(PARITY.now),
  };
  expect(sha256(buildSajuSectionHtml({ ...base, featureKey: "section_summary" }).html)).toBe(render.summary);
  const daewun = render.daewun.map(([age, ganzhi]) => [age, ganzhi,
    sha256(buildSajuSectionHtml({ ...base, featureKey: "section_daewun", daewun: { age, gan: ganzhi[0], zhi: ganzhi[1] } }).html)]);
  expect(daewun).toEqual(render.daewun);
});
