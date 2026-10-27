/** @jest-environment node */
import { jest } from "@jest/globals";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";

const auth = jest.fn();
const exists = jest.fn();
const historyExists = jest.fn();
const findOne = jest.fn();
const write = jest.fn(() => { throw new Error("Read route attempted a write"); });
const connectDb = jest.fn();
// 숙요 본성 심화 해석의 서버 천문 계산: 출생일로 달 황경을 정한다(15일 → 150°, 16일 → 190°).
const moonLongitudes = jest.fn(async (_env, moments) => moments.map((moment) => (moment.day === 16 ? 190 : 150)));
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
  PointHistory: { exists: historyExists, create: write, updateOne: write },
  ProfileCard: { modelName: "ProfileCard", findOne: (...args) => profileCards.findOne(...args) },
}));
jest.unstable_mockModule("../../worker/lib/cms-records.js", () => ({ primeCmsRecords: jest.fn() }));
jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({
  getSwissMoonLongitudes: moonLongitudes, getSwissWesternChart: jest.fn(), getSwissVedicPlanets: jest.fn(), getSwissTropicalLongitudes: jest.fn(),
  aspectBetween: jest.fn(), locateHouseByCusps: jest.fn(), julianDayFromUtcMillis: jest.fn(), utcMillisFromJulianDay: jest.fn(), __swissEphemerisTestUtils: {},
}));
// 숙요 궁합(회당 결제): 정본 증빙 검사와 증빙 claim. claim 은 증빙 하나를 (userId, requestId) 하나에만 묶는 저장소를 흉내 낸다.
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

let handleSajuSection, buildSajuSectionHtml, resolvePaidContentUnlockTarget, getBillingFeaturePricing, buildAnimalDestinyReading;
beforeAll(async () => {
  ({ handleSajuSection } = await import("../../worker/routes/saju-section.js"));
  ({ buildSajuSectionHtml } = await import("../../worker/lib/saju-section/report.js"));
  ({ resolvePaidContentUnlockTarget } = await import("../../worker/lib/content-unlocks.js"));
  ({ getBillingFeaturePricing } = await import("../../worker/lib/billing-feature-registry.js"));
  ({ buildAnimalDestinyReading } = await import("../../worker/lib/saju-section/animal-destiny.js"));
});
// HEAD 클라이언트 엔진(js/saju-engine.js)이 같은 입력으로 그린 HTML 의 sha256 — 서버 이전이 문구·계산을 바꾸지 않았다는 근거.
const PARITY = JSON.parse(readFileSync("__tests__/fixtures/saju-section-client-parity.json", "utf8"));
const [FIRST_AGE, FIRST_GANZHI] = PARITY.renders[0].daewun[0];
const DAEWUN = { age: FIRST_AGE, gan: FIRST_GANZHI[0], zhi: FIRST_GANZHI[1] };
const INPUT = { profileId: "p1", featureKey: "section_summary", name: "테스트", mode: "pig", lang: "ko" };
const CARD_BIRTH = { calendarDate: "1990-05-15", calType: "solar", hour: 14, minute: 30, timeKnown: true };
const birthProfileId = (profileId) => toBirthEntitlementProfileId(computeBirthKey(cards.find((card) => card.profileId === profileId)));
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
// 전체 대운 지도의 각 줄(나이·기간·간지)을 읽는다.
const mapRows = (html) => [...html.matchAll(/<b>(\d+)세 · (\d+)–(\d+)년 · (\S)(\S) 대운<\/b>/g)]
  .map((m) => ({ age: Number(m[1]), startYear: Number(m[2]), endYear: Number(m[3]), g: m[4], j: m[5] }));
// 서버 이전 뒤 30,000원 구성으로 덧붙인 장(올해·내년 처방, 전체 대운 지도, 전환기 체크리스트)은 <!--saju-ext--> 로 감싼다.
// 그 밖의 문구·계산은 HEAD 클라이언트와 한 글자도 달라지면 안 되므로 패리티는 덧붙인 장을 걷어 낸 HTML 로 본다.
const withoutExtensions = (html) => html.replace(/<!--saju-ext-->[\s\S]*?<!--\/saju-ext-->/g, "");
let grants;
let users;
let histories;

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
  grants = []; users = []; histories = [];
  cards.splice(0, cards.length, ...initialCards.map((card) => ({ ...card, birth: { ...card.birth } })));
  auth.mockReset().mockResolvedValue({ userId: TEST_USER_ID });
  connectDb.mockReset().mockResolvedValue(undefined);
  exists.mockImplementation(async (query) => users.find((user) => matches(user, query)) || null);
  historyExists.mockImplementation(async (query) => histories.find((row) => matches(row, query)) || null);
  findOne.mockImplementation((query) => ({ lean: async () => grants.find((row) => matches(row, query)) || null }));
  claimed.clear();
  verifyPerUsePayment.mockReset().mockResolvedValue({ proven: false, source: "", reason: "NO_EXISTING_CONSUMPTION" });
});

test("anonymous and forged unlock hints cannot read a section", async () => {
  auth.mockResolvedValue(null);
  expect((await request({ ...INPUT, unlocked: true, userId: TEST_USER_ID })).status).toBe(401);
  expect(findOne).not.toHaveBeenCalled();
});

test("only the saju section keys are served", async () => {
  grant();
  expect((await request({ ...INPUT, featureKey: "saju_premium_report" })).body).toMatchObject({ code: "SAJU_INVALID_FEATURE" });
  expect(findOne).not.toHaveBeenCalled();
});

test.each(["section_summary", "section_daewun", "rpt_quantumCard", "sukuyo-extreme-t-relationship", "sukuyo-relationship-encyclopedia", "sukuyo-nature-deep-dive", "rpt_energyCoordCard", "rpt_villainCard", "rpt_healthReportCard", "rpt_specialCharmCard", "rpt_skillTreeCard", "rpt_secretHouseEntryCard", "animal-destiny-unlock"])("unowned %s returns registry pricing without HTML", async (featureKey) => {
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
  const summaryHtml = buildSajuSectionHtml({ ...base, featureKey: "section_summary" }).html;
  expect(summaryHtml).toContain('aria-label="라이트 사주 풀이 목차"');
  // The approved product rename is display-only. Keep the historical fixture to prove
  // that every remaining byte of the reading and all calculated facts are preserved.
  const historicalTitleHtml = summaryHtml.replace('aria-label="라이트 사주 풀이 목차"', 'aria-label="종합 사주 풀이 목차"');
  expect(sha256(withoutExtensions(historicalTitleHtml))).toBe(render.summary);
  const daewun = render.daewun.map(([age, ganzhi]) => [age, ganzhi,
    sha256(withoutExtensions(buildSajuSectionHtml({ ...base, featureKey: "section_daewun", daewun: { age, gan: ganzhi[0], zhi: ganzhi[1] } }).html))]);
  expect(daewun).toEqual(render.daewun);
});

test.each([
  ["종왕격", { calendarDate: "1960-08-13", calType: "solar", hour: 2, minute: 0, timeKnown: true }],
  ["가종재격", { calendarDate: "1960-01-07", calType: "solar", hour: 10, minute: 0, timeKnown: true }],
])("old clients' jongDecision never changes the natal reading: %s", (name, birth) => {
  // 종격은 원국으로만 판정한다. 옛 종격 검증 모달의 답은 받기만 하고 쓰지 않는다.
  const html = (featureKey, jongDecision) => buildSajuSectionHtml({
    birth, gender: "F", name: "테스트", mode: "pig", now: new Date(PARITY.now), featureKey, jongDecision,
  }).html;
  for (const featureKey of ["section_summary", "rpt_quantumCard"]) {
    const plain = html(featureKey);
    for (const decision of ["confirmed", "rejected", "unverified"]) expect(html(featureKey, decision)).toBe(plain);
  }
  expect(html("section_summary", "rejected")).toContain(name);
});

test("the summary adds this and next year's prescription from the same seun reading as the daewun years", () => {
  const base = { birth: CARD_BIRTH, gender: "M", name: "테스트", mode: "pig", now: new Date(PARITY.now) };
  const DAEWUN_ROWS = mapRows(buildSajuSectionHtml({ ...base, featureKey: "section_daewun", daewun: DAEWUN }).html);
  const summary = buildSajuSectionHtml({ ...base, featureKey: "section_summary" }).html;
  const chapter = summary.match(/<article id="sajuSummaryChapter-olhae"[\s\S]*?<\/article>/)?.[0] || "";
  expect(summary).toContain('href="#sajuSummaryChapter-olhae"');
  for (const label of ["올해 2026년", "내년 2027년", "연애", "돈", "일", "관계", "건강 습관", "처방"]) expect(chapter).toContain(label);
  // 같은 해의 세운 간지·판정은 그 해를 담은 대운 풀이의 연도별 세운과 같다.
  const daewunRow = DAEWUN_ROWS.find((row) => row.startYear <= 2026 && 2026 <= row.endYear);
  const detail = buildSajuSectionHtml({ ...base, featureKey: "section_daewun", daewun: { age: daewunRow.age, gan: daewunRow.g, zhi: daewunRow.j } }).html;
  const seun = detail.match(/<div class="year-title">2026년 · (\S\S)/)[1];
  expect(chapter).toContain("올해 2026년 · " + seun + " 세운");
  expect(chapter).toContain(daewunRow.g + daewunRow.j + " 대운(" + daewunRow.startYear + "–" + daewunRow.endYear + "년)");
});

test.each(["pig", "neo"])("the daewun %s reading adds grounded choices and recovery without replacing existing chapters", (mode) => {
  const html = buildSajuSectionHtml({ birth: CARD_BIRTH, gender: "M", name: "테스트", mode, now: new Date(PARITY.now), featureKey: "section_daewun", daewun: DAEWUN }).html;
  const guide = html.match(/<section class="saju-cycle-guide"[\s\S]*?<\/section>/)?.[0] || "";
  expect(guide).toContain("일과 재물에서 살펴볼 선택");
  expect(guide).toContain("선택지 비교 — 넓힐 것과 남겨둘 것");
  expect(guide).toContain("건강과 회복 — 감당할 수 있는 생활 리듬");
  expect(guide).toMatch(/질병·장기 이상·발병 시기를 판단하지/);
  expect(guide).not.toMatch(/undefined|NaN/);
  expect(withoutExtensions(guide)).not.toContain("건강과 회복 —");
});

test("the daewun reading adds the full ten-year map and a transition checklist", () => {
  const base = { birth: CARD_BIRTH, gender: "M", name: "테스트", mode: "pig", now: new Date(PARITY.now) };
  const DAEWUN_ROWS = mapRows(buildSajuSectionHtml({ ...base, featureKey: "section_daewun", daewun: DAEWUN }).html);
  // 지도는 이 출생의 대운표 전체를 그대로 싣는다.
  expect(DAEWUN_ROWS.map((row) => [row.age, row.g + row.j])).toEqual(PARITY.renders[0].daewun.map(([age, ganzhi]) => [age, ganzhi]));
  const [first, second] = DAEWUN_ROWS;
  const html = buildSajuSectionHtml({ ...base, featureKey: "section_daewun", daewun: { age: first.age, gan: first.g, zhi: first.j } }).html;
  const map = html.match(/<section class="saju-daewun-map"[\s\S]*?<\/section>/)[0];
  expect(map).toContain('aria-current="true"');
  const checklist = html.match(/<section class="saju-daewun-transition"[\s\S]*?<\/section>/)[0];
  expect(checklist).toContain(first.endYear + "→" + second.startYear + "년 무렵 대운이 바뀝니다(" + first.g + first.j + " → " + second.g + second.j);
  expect(checklist).not.toMatch(/undefined|NaN/);
  const last = DAEWUN_ROWS[DAEWUN_ROWS.length - 1];
  const lastHtml = buildSajuSectionHtml({ ...base, featureKey: "section_daewun", daewun: { age: last.age, gan: last.g, zhi: last.j } }).html;
  expect(lastHtml).toContain("마지막 구간");
});

describe("rpt_quantumCard", () => {
  const QUANTUM = { ...INPUT, featureKey: "rpt_quantumCard" };
  const expected = (birth, gender) => buildSajuSectionHtml({ featureKey: "rpt_quantumCard", birth, gender, name: "테스트", mode: "pig", lang: "ko" }).html;

  test("a BIRTH grant renders the card from the stored birth; it opens nothing else", async () => {
    grant({}, "rpt_quantumCard");
    const result = await request({ ...QUANTUM, birth: { date: "2001-01-01", hour: 3, minute: 0 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, unlocked: true, featureKey: "rpt_quantumCard", html: expected(CARD_BIRTH, "M") });
    expect(result.body.html).toContain("QUANTUM");
    expect((await request()).status).toBe(402);
  });

  test("a legacy account grant without a saved profile renders the body birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, "rpt_quantumCard");
    const { profileId: _omit, ...account } = QUANTUM;
    const result = await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body.html).toBe(expected({ calendarDate: "1985-11-02", calType: "solar", hour: 6, minute: 5, timeKnown: true }, "F"));
  });

  test("another profile's grant does not open this card", async () => {
    grant({ scope: "PROFILE", profileId: "p2" }, "rpt_quantumCard");
    expect((await request(QUANTUM)).status).toBe(402);
    grant({}, "rpt_quantumCard");
    const other = await request({ ...QUANTUM, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.html).toBeUndefined();
  });

  test("a DB failure stays retryable instead of prompting purchase", async () => {
    grant({}, "rpt_quantumCard");
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(QUANTUM);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  });

  // PARITY.quantum: f5eb54c0c 의 클라이언트 renderQuantumStrategy(js/saju-engine-tarot-sukuyo-quantum.js)를 vm 에서
  // 같은 차트·같은 now(PARITY.now)·pig·ko 로 돌려 얻은 #quantumSection HTML 의 sha256.
  test.each(PARITY.cases.map((c) => [c.id, c]))("server card equals the HEAD client engine output: %s", (id, c) => {
    const html = buildSajuSectionHtml({
      featureKey: "rpt_quantumCard", birth: { calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false },
      gender: c.gender, name: c.name, mode: "pig", place: c.place, jongDecision: c.jong, now: new Date(PARITY.now),
    }).html;
    expect(sha256(html)).toBe(PARITY.quantum[id]);
  });
});

describe("sukuyo-extreme-t-relationship", () => {
  const KEY = "sukuyo-extreme-t-relationship";
  const EXTREME_T = { ...INPUT, featureKey: KEY };
  const expected = (birth, gender) => buildSajuSectionHtml({ featureKey: KEY, birth, gender, name: "테스트", mode: "pig", lang: "ko" });

  test("a BIRTH grant renders the three paid panels from the stored birth; it opens nothing else", async () => {
    grant({}, KEY);
    const result = await request({ ...EXTREME_T, birth: { date: "2001-01-01", hour: 3, minute: 0 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, unlocked: true, featureKey: KEY, ...expected(CARD_BIRTH, "M") });
    expect(result.body.html).toContain("[관계 회로]");
    expect(result.body.sajuBaseHtml).toContain("[사주 기반 극T 해석]");
    expect(result.body.prescriptionHtml).toContain("[디버깅 처방전]");
    expect((await request()).status).toBe(402);
  });

  test("a legacy account grant without a saved profile renders the body birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, KEY);
    const { profileId: _omit, ...account } = EXTREME_T;
    const result = await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body.html).toBe(expected({ calendarDate: "1985-11-02", calType: "solar", hour: 6, minute: 5, timeKnown: true }, "F").html);
  });

  test("another profile's grant or another product's grant does not open the panels", async () => {
    grant({}, "rpt_quantumCard");
    expect((await request(EXTREME_T)).status).toBe(402);
    grant({}, KEY);
    const other = await request({ ...EXTREME_T, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.html).toBeUndefined();
    expect(other.body.sajuBaseHtml).toBeUndefined();
  });

  test("a DB failure stays retryable instead of prompting purchase", async () => {
    grant({}, KEY);
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(EXTREME_T);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  });

  // PARITY.extremeT: 56cc07e9a 의 클라이언트 renderTTest(해금 상태)가 같은 차트로 그린 패널 HTML 의 sha256.
  // html = [관계 회로]+[연애 알고리즘]+[현실 처리 능력], 나머지 둘은 따로. 점수 구간 다섯(공감형~극T)이 모두 들어 있다.
  test.each([...PARITY.cases, ...PARITY.extremeTCases].map((c) => [c.id, c]))("server panels equal the HEAD client output: %s", (id, c) => {
    const result = buildSajuSectionHtml({
      featureKey: KEY, birth: { calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false },
      gender: c.gender, name: c.name, mode: "pig", place: c.place, jongDecision: c.jong, now: new Date(PARITY.now),
    });
    expect({ html: sha256(result.html), sajuBaseHtml: sha256(result.sajuBaseHtml), prescriptionHtml: sha256(result.prescriptionHtml) }).toEqual(PARITY.extremeT[id]);
  });
});

describe("sukuyo-relationship-encyclopedia", () => {
  const KEY = "sukuyo-relationship-encyclopedia";
  const SCREEN = { userName: "민수", userMansionIdx: 3, userMansion: "방숙" };
  const ENCYCLOPEDIA = { profileId: "p1", featureKey: KEY, lang: "ko", encyclopedia: SCREEN };
  const expected = (screen = SCREEN) => buildSajuSectionHtml({ featureKey: KEY, lang: "ko", encyclopedia: screen }).html;
  const entries = (html) => (html.match(/class="sy-dogam-entry"/g) || []).length;

  test("a BIRTH grant renders all 27 mansions with their readings; it opens nothing else", async () => {
    grant({}, KEY);
    const result = await request(ENCYCLOPEDIA);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, unlocked: true, featureKey: KEY, html: expected() });
    expect(entries(result.body.html)).toBe(27);
    expect(result.body.html).toContain("도감 완성도 27/27");
    expect(result.body.html).toContain("<b>연애로 만났을 때</b>");
    expect((await request()).status).toBe(402);
  });

  test("a legacy account grant without a saved profile renders without any birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, KEY);
    const { profileId: _omit, ...account } = ENCYCLOPEDIA;
    const result = await request(account);
    expect(result.status).toBe(200);
    expect(result.body.html).toBe(expected());
  });

  test("another profile's grant or another product's grant does not open the encyclopedia", async () => {
    grant({}, "sukuyo-extreme-t-relationship");
    expect((await request(ENCYCLOPEDIA)).status).toBe(402);
    grant({}, KEY);
    const other = await request({ ...ENCYCLOPEDIA, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.html).toBeUndefined();
  });

  test("an out-of-range mansion is rejected, and a DB failure stays retryable", async () => {
    grant({}, KEY);
    for (const userMansionIdx of [27, -1, 2.5, "x", null]) {
      expect((await request({ ...ENCYCLOPEDIA, encyclopedia: { ...SCREEN, userMansionIdx } }))).toEqual({ status: 400, body: expect.objectContaining({ code: "SAJU_INVALID_MANSION" }) });
    }
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(ENCYCLOPEDIA);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  });

  // PARITY.encyclopedia: 39c49f8b9 의 클라이언트 SukuyoEncyclopediaEngine.render(build(input), true)(해금 화면)가
  // 같은 입력으로 그린 27숙 HTML 의 sha256. en·ja 는 그 언어로 처음부터 불러온 페이지 기준(관계 제목이 로드 때 정해진다).
  test.each(PARITY.encyclopediaCases.map((c) => [c.id, c]))("server encyclopedia equals the HEAD client output: %s", (id, c) => {
    const { html } = buildSajuSectionHtml({ featureKey: KEY, lang: c.lang, encyclopedia: { userName: c.userName, userMansionIdx: c.userMansionIdx, userMansion: c.userMansion } });
    expect(sha256(html)).toBe(PARITY.encyclopedia[id]);
  });
});

describe("sukuyo-nature-deep-dive", () => {
  const KEY = "sukuyo-nature-deep-dive";
  const NATURE = { profileId: "p1", featureKey: KEY, lang: "ko" };
  const expected = (moonEclipticLongitude) => buildSajuSectionHtml({ featureKey: KEY, lang: "ko", sukuyo: { moonEclipticLongitude } });

  test("a BIRTH grant renders the mansion the server computes from the stored birth; client mansion values are ignored", async () => {
    grant({}, KEY);
    const result = await request({
      ...NATURE, birth: { date: "2001-01-16", hour: 3, minute: 0 },
      sukuyo: { moonEclipticLongitude: 70, mansionIdx: 21 }, encyclopedia: { userMansionIdx: 21 }, mansionIdx: 21,
    });
    expect(result.status).toBe(200);
    const { html, mansion, mansionIdx } = expected(150);
    expect(result.body).toEqual({ ok: true, unlocked: true, featureKey: KEY, html, mansion, mansionIdx });
    expect(mansionIdx).toBe(0);
    expect(result.body.html).toContain("sy-rel-tab");
    expect(moonLongitudes).toHaveBeenCalledWith(expect.anything(), [expect.objectContaining({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, timezone: 9 })], expect.anything());
    expect((await request()).status).toBe(402);
  });

  test("a legacy account grant without a saved profile computes the mansion from the body birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, KEY);
    const { profileId: _omit, ...account } = NATURE;
    const result = await request({ ...account, birth: { date: "1990-05-16", calType: "solar", hour: 9, minute: 0 }, sukuyo: { moonEclipticLongitude: 150 } });
    expect(result.status).toBe(200);
    expect(result.body.html).toBe(expected(190).html);
  });

  test("another profile's grant or another product's grant does not open the deep dive", async () => {
    grant({}, "sukuyo-relationship-encyclopedia");
    expect((await request(NATURE)).status).toBe(402);
    grant({}, KEY);
    const other = await request({ ...NATURE, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.html).toBeUndefined();
    expect(moonLongitudes).not.toHaveBeenCalled();
  });

  test("a DB failure or an astronomy failure stays retryable instead of prompting purchase", async () => {
    grant({}, KEY);
    moonLongitudes.mockRejectedValueOnce(new Error("ephemeris unavailable"));
    const astro = await request(NATURE);
    expect(astro.status).toBe(503);
    expect(astro.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
    expect(astro.body.html).toBeUndefined();
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(NATURE);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  });

  // PARITY.nature: 1030ca817 의 클라이언트 syBuildSukuyoNatureDeepDiveHtml(renderSukuyo 의 해금 화면 경로:
  // calcSukuyoData → getDailyKarmicGuidance → syBuildLocalCanonicalData → syBuildBasicReading)을 같은 달 황경·같은 now(PARITY.now, KST 벽시계)로 돌린 HTML 의 sha256.
  test.each(PARITY.natureCases.map((c) => [c.id, c]))("server deep dive equals the HEAD client output: %s", (id, c) => {
    const result = buildSajuSectionHtml({ featureKey: KEY, lang: c.lang, sukuyo: { moonEclipticLongitude: c.moonEclipticLongitude }, now: new Date(PARITY.now) });
    expect(result.mansionIdx).toBe(c.mansionIdx);
    expect(sha256(result.html)).toBe(PARITY.nature[id]);
  });
});

describe("sukuyo compatibility (per use)", () => {
  const BASE = "compat-sukuyo-compatibility";
  const PRECISION = "premium-sukuyo-compat-extra";
  const rid = (key, tail = "lz9k2abcd", profileId = "p1") => `sukuyo-paid:${key}|${profileId}|${tail}`;
  // 상대 출생일 16일 → 190°(이 파일의 천문 목). 내 카드 p1 은 15일 → 150°.
  const PARTNER = { date: "1992-03-16", calType: "solar", hour: 9, minute: 0, gender: "F" };
  const compat = (featureKey = BASE, extra = {}) => ({ featureKey, profileId: "p1", requestId: rid(featureKey), partner: PARTNER, lang: "ko", ...extra });
  const expected = (mine, partner, partnerGender = "F") => buildSajuSectionHtml({
    featureKey: BASE, lang: "ko", gender: "M", partnerGender,
    sukuyo: { mine: { moonEclipticLongitude: mine }, partner: { moonEclipticLongitude: partner } },
  });
  const paidBy = (transactionId) => verifyPerUsePayment.mockResolvedValue({ proven: true, source: "coin", reason: "", transactionId });

  test('꿀방울 증빙으로 같은 상대만 열고 다른 상대에게 재사용하지 못한다', async () => {
    const { honeyUseInputHash } = await import('../../worker/lib/honey-per-use.js');
    verifyPerUsePayment.mockResolvedValue({proven:true,source:'honey',transactionId:'honey-receipt',inputHash:honeyUseInputHash(BASE,PARTNER)});
    expect((await request(compat(BASE))).status).toBe(200);
    expect((await request(compat(BASE,{partner:{...PARTNER,date:'1992-03-17'}}))).status).toBe(409);
  });
  test("without this request's payment there is no body, only registry pricing", async () => {
    const result = await request(compat(BASE, { unlocked: true, passActive: true }));
    const { pricing } = getBillingFeaturePricing({ featureKey: BASE });
    expect(result).toEqual({ status: 402, body: expect.objectContaining({ reason: "PAYMENT_REQUIRED", featureKey: BASE, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice }) });
    expect(result.body.html).toBeUndefined();
    expect(verifyPerUsePayment).toHaveBeenCalledTimes(1);
    expect(claimRequestBillingEvidence).not.toHaveBeenCalled();
  });

  test("a proven payment renders both mansions the server computes and claims the evidence for this pair", async () => {
    paidBy("ded-1");
    const result = await request(compat(BASE, { birth: { date: "2001-01-16", hour: 3, minute: 0 }, myIdx: 21, partnerIdx: 3, sukuyo: { moonEclipticLongitude: 70 } }));
    expect(result.status).toBe(200);
    const report = expected(150, 190);
    expect(result.body).toEqual({
      ok: true, unlocked: true, featureKey: BASE, html: report.html, lastCompat: report.lastCompat,
      glowColor: report.glowColor, temperature: report.temperature, relationLabel: report.relationLabel,
    });
    expect(result.body.precisionHtml).toBeUndefined();
    expect(verifyPerUsePayment).toHaveBeenCalledWith(expect.anything(), { userId: TEST_USER_ID, featureKey: BASE, coinPrice: 50, requestId: rid(BASE), profileId: "p1", requireExisting: true });
    expect(claimRequestBillingEvidence).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      userId: TEST_USER_ID, evidenceIds: ["ded-1"], featureKey: BASE, requestId: expect.stringMatching(new RegExp(`^${rid(BASE).replace(/[|]/g, "\\|")}\\|[0-9a-f]{32}$`)),
    }));
  });

  test("the precision extension returns only its own body under its own payment", async () => {
    paidBy("ded-2");
    const result = await request(compat(PRECISION));
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, unlocked: true, featureKey: PRECISION, precisionHtml: expected(150, 190).precisionHtml });
    expect(verifyPerUsePayment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ featureKey: PRECISION, coinPrice: 50, requestId: rid(PRECISION) }));
  });

  test("one payment opens one pair: a retry of the same pair is served, another partner is 409", async () => {
    paidBy("ded-3");
    expect((await request(compat())).status).toBe(200);
    expect((await request(compat())).status).toBe(200);
    const other = await request(compat(BASE, { partner: { ...PARTNER, date: "1992-03-15" } }));
    expect(other.status).toBe(409);
    expect(other.body).toMatchObject({ code: "EVIDENCE_ALREADY_USED" });
    expect(other.body.html).toBeUndefined();
  });

  test("a request id of another card or product is rejected before any payment lookup", async () => {
    for (const requestId of [rid(BASE, "lz9k2abcd", "p3"), rid(PRECISION), `${rid(BASE)}|x`, "sukuyo-paid:compat-sukuyo-compatibility|p1|A!"]) {
      const result = await request(compat(BASE, { requestId }));
      expect(result.status).toBe(400);
      expect(result.body).toMatchObject({ code: "REQUEST_ID_INVALID" });
    }
    expect(verifyPerUsePayment).not.toHaveBeenCalled();
  });

  test("a pass opened in the shell is settled on this request id only when the shell says it used a pass", async () => {
    expect((await request(compat())).status).toBe(402);
    verifyPerUsePayment.mockReset()
      .mockResolvedValueOnce({ proven: false, source: "", reason: "NO_EXISTING_CONSUMPTION" })
      .mockResolvedValueOnce({ proven: true, source: "pass", reason: "" });
    const result = await request(compat(BASE, { accessMethod: "pass" }));
    expect(result.status).toBe(200);
    expect(verifyPerUsePayment).toHaveBeenNthCalledWith(2, expect.anything(), { userId: TEST_USER_ID, featureKey: BASE, coinPrice: 50, requestId: rid(BASE), profileId: "p1" });
    expect(claimRequestBillingEvidence).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ evidenceIds: [`pass-use:${TEST_USER_ID}:${BASE}:${rid(BASE)}`] }));
  });

  test("an admin is served without a claim; a missing saved card falls back to the body birth", async () => {
    verifyPerUsePayment.mockResolvedValue({ proven: true, source: "admin", reason: "" });
    const result = await request(compat(BASE, { profileId: "", requestId: "", birth: { date: "1990-05-16", calType: "solar", hour: 9, minute: 0 }, gender: "M" }));
    expect(result.status).toBe(200);
    expect(result.body.html).toBe(expected(190, 190).html);
    expect(verifyPerUsePayment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ requestId: `sukuyo-paid:${BASE}|`, profileId: "" }));
    expect(claimRequestBillingEvidence).not.toHaveBeenCalled();
  });

  test("payment DB doubt, claim store failure or astronomy failure stays retryable instead of prompting purchase", async () => {
    verifyPerUsePayment.mockResolvedValue({ proven: null, source: "", reason: "DB_DEGRADED" });
    const doubt = await request(compat());
    expect(doubt.status).toBe(503);
    expect(doubt.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
    verifyPerUsePayment.mockRejectedValueOnce(new Error("private database connection information"));
    expect((await request(compat())).status).toBe(503);
    paidBy("ded-4");
    claimRequestBillingEvidence.mockResolvedValueOnce({ ok: false, status: 503, code: "PAYMENT_VERIFY_UNAVAILABLE", message: "결제 확인이 잠시 지연되고 있어요." });
    const store = await request(compat());
    expect(store.status).toBe(503);
    expect(store.body.html).toBeUndefined();
    verifyPerUsePayment.mockClear();
    moonLongitudes.mockRejectedValueOnce(new Error("ephemeris unavailable"));
    const astro = await request(compat());
    expect(astro.status).toBe(503);
    // 그리기 전에 실패하면 결제를 확인(이용권 차감)하지 않는다.
    expect(verifyPerUsePayment).not.toHaveBeenCalled();
  });

  // PARITY.compat: 1030ca817 의 클라이언트 window._triggerSynergyCheckCore 렌더 부분(기본 보고서 html·정밀 확장
  // precisionExtensionSections·window._syLastCompat)을 같은 두 달 황경·같은 now(PARITY.now, KST 벽시계)로 그린 결과.
  // 기본 보고서는 정밀 확장 잠금 카드·AI 상담 카드를 뺀 것이고 관계 미니맵은 자리표시다(둘 다 화면이 붙인다).
  test.each(PARITY.compatCases.map((c) => [c.id, c]))("server compatibility equals the HEAD client output: %s", (id, c) => {
    const result = buildSajuSectionHtml({
      featureKey: BASE, lang: c.lang, gender: c.gender, partnerGender: c.partnerGender, now: new Date(PARITY.now),
      sukuyo: { mine: { moonEclipticLongitude: c.myMoonEclipticLongitude }, partner: { moonEclipticLongitude: c.partnerMoonEclipticLongitude } },
    });
    expect([result.myMansionIdx, result.partnerMansionIdx]).toEqual([c.myMansionIdx, c.partnerMansionIdx]);
    expect({
      html: sha256(result.html), precisionHtml: sha256(result.precisionHtml), lastCompat: sha256(JSON.stringify(result.lastCompat)),
      temperature: result.temperature, relationLabel: result.relationLabel, glowColor: result.glowColor,
    }).toEqual(PARITY.compat[id]);
  });
});

// 자미두수 궁합(회당 결제, 50코인). 게이트가 결제에 쓴 requestId(compat-archive:compat-ziwei-compatibility:<꼬리>)로 이번 결제를 찾고,
// 내 명반(저장 카드가 있으면 그 출생)과 상대 입력으로 서버가 보정·두 명반·리포트를 만든다. 결제 1건 = 내 출생·상대 조합 1건.
describe("ziwei compatibility (per use)", () => {
  const KEY = "compat-ziwei-compatibility";
  const rid = (tail = "lz9k2abcd") => `compat-archive:${KEY}:${tail}`;
  const SEOUL = { name: "대한민국 · 서울", timezone: "Asia/Seoul", longitude: 126.978, latitude: 37.5665, baseTzOffset: 9 };
  const PARTNER = { date: "1992-05-18", time: "09:30", gender: "F", city: SEOUL };
  const compat = (extra = {}) => ({ featureKey: KEY, profileId: "p1", requestId: rid(), partner: PARTNER, name: "테스트", lang: "ko", ...extra });
  const expected = (birth = CARD_BIRTH, gender = "M", partner = PARTNER) => {
    const { pair: _pair, ...report } = buildSajuSectionHtml({ featureKey: KEY, birth, gender, name: "테스트", lang: "ko", partner });
    return { ok: true, unlocked: true, featureKey: KEY, ...report };
  };
  const paidBy = (transactionId) => verifyPerUsePayment.mockResolvedValue({ proven: true, source: "coin", reason: "", transactionId });

  test("without this request's payment there is no body, only registry pricing", async () => {
    const result = await request(compat({ unlocked: true, passActive: true }));
    const { pricing } = getBillingFeaturePricing({ featureKey: KEY });
    expect(result).toEqual({ status: 402, body: expect.objectContaining({ reason: "PAYMENT_REQUIRED", featureKey: KEY, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice }) });
    expect(pricing.coinPrice).toBe(50);
    expect(result.body.html).toBeUndefined();
    expect(result.body.archive).toBeUndefined();
    expect(claimRequestBillingEvidence).not.toHaveBeenCalled();
  });

  test("a proven payment renders from the saved card's birth, ignoring the body's, and claims the evidence for this pair", async () => {
    paidBy("zwc-1");
    const result = await request(compat({ birth: { date: "2001-01-16", calType: "solar", hour: 3, minute: 0 }, gender: "F" }));
    expect(result.status).toBe(200);
    expect(result.body).toEqual(expected());
    expect(result.body.html.length).toBeGreaterThan(2000);
    expect(verifyPerUsePayment).toHaveBeenCalledWith(expect.anything(), { userId: TEST_USER_ID, featureKey: KEY, coinPrice: 50, requestId: rid(), profileId: "p1", requireExisting: true });
    expect(claimRequestBillingEvidence).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      userId: TEST_USER_ID, evidenceIds: ["zwc-1"], featureKey: KEY, kind: "ziwei-compat", requestId: expect.stringMatching(new RegExp(`^${rid()}\\|[0-9a-f]{32}$`)),
    }));
  });

  test("one payment opens one pair: a retry of the same pair is served, another partner or another card is 409", async () => {
    paidBy("zwc-2");
    expect((await request(compat())).status).toBe(200);
    expect((await request(compat())).status).toBe(200);
    const otherPartner = await request(compat({ partner: { ...PARTNER, time: "10:30" } }));
    expect(otherPartner.status).toBe(409);
    expect(otherPartner.body).toMatchObject({ code: "EVIDENCE_ALREADY_USED" });
    expect(otherPartner.body.html).toBeUndefined();
    const otherCard = await request(compat({ profileId: "p3" }));
    expect(otherCard.status).toBe(409);
    expect(otherCard.body.html).toBeUndefined();
  });

  test("a request id of another product or a malformed one is rejected before any payment lookup", async () => {
    for (const requestId of ["", `sukuyo-paid:${KEY}|p1|lz9k2abcd`, "compat-archive:compat-sukuyo-compatibility:lz9k2abcd", rid("LZ9K2ABCD"), rid("ab"), `${rid()}|x`]) {
      const result = await request(compat({ requestId }));
      expect(result.status).toBe(400);
      expect(result.body).toMatchObject({ code: "REQUEST_ID_INVALID" });
    }
    expect(verifyPerUsePayment).not.toHaveBeenCalled();
  });

  test("an invalid partner input is 400 before any payment lookup", async () => {
    for (const partner of [
      undefined, { ...PARTNER, date: "1992-02-30" }, { ...PARTNER, date: "1850-01-01" }, { ...PARTNER, time: "24:00" },
      { ...PARTNER, city: { ...SEOUL, name: "<b>서울</b>" } }, { ...PARTNER, city: { ...SEOUL, longitude: 999 } }, { ...PARTNER, city: { ...SEOUL, timezone: "Asia/Seoul;x" } },
    ]) {
      const result = await request(compat({ partner }));
      expect(result.status).toBe(400);
      expect(result.body).toMatchObject({ code: "SAJU_INVALID_PARTNER" });
      expect(result.body.html).toBeUndefined();
    }
    expect(verifyPerUsePayment).not.toHaveBeenCalled();
  });

  test("a pass opened in the shell is settled on this request id only when the shell says it used a pass", async () => {
    expect((await request(compat())).status).toBe(402);
    verifyPerUsePayment.mockReset()
      .mockResolvedValueOnce({ proven: false, source: "", reason: "NO_EXISTING_CONSUMPTION" })
      .mockResolvedValueOnce({ proven: true, source: "pass", reason: "" });
    const result = await request(compat({ accessMethod: "pass" }));
    expect(result.status).toBe(200);
    expect(verifyPerUsePayment).toHaveBeenNthCalledWith(2, expect.anything(), { userId: TEST_USER_ID, featureKey: KEY, coinPrice: 50, requestId: rid(), profileId: "p1" });
    expect(claimRequestBillingEvidence).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ evidenceIds: [`pass-use:${TEST_USER_ID}:${KEY}:${rid()}`] }));
  });

  test("an admin is served without a claim; without a saved card the body birth is used", async () => {
    verifyPerUsePayment.mockResolvedValue({ proven: true, source: "admin", reason: "" });
    const birth = { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 };
    const result = await request(compat({ profileId: "", birth, gender: "F" }));
    expect(result.status).toBe(200);
    expect(result.body).toEqual(expected({ calendarDate: "1985-11-02", calType: "solar", hour: 6, minute: 5, timeKnown: true }, "F"));
    expect(verifyPerUsePayment).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ requestId: rid(), profileId: "" }));
    expect(claimRequestBillingEvidence).not.toHaveBeenCalled();
  });

  test("payment DB doubt, claim store failure or a card read failure stays retryable instead of prompting purchase", async () => {
    verifyPerUsePayment.mockResolvedValue({ proven: null, source: "", reason: "DB_DEGRADED" });
    const doubt = await request(compat());
    expect(doubt.status).toBe(503);
    expect(doubt.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
    expect(doubt.body.html).toBeUndefined();
    verifyPerUsePayment.mockRejectedValueOnce(new Error("private database connection information"));
    expect((await request(compat())).status).toBe(503);
    paidBy("zwc-3");
    claimRequestBillingEvidence.mockResolvedValueOnce({ ok: false, status: 503, code: "PAYMENT_VERIFY_UNAVAILABLE", message: "결제 확인이 잠시 지연되고 있어요." });
    const store = await request(compat());
    expect(store.status).toBe(503);
    expect(store.body.html).toBeUndefined();
    verifyPerUsePayment.mockClear();
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const card = await request(compat());
    expect(card.status).toBe(503);
    expect(card.body.html).toBeUndefined();
    // 카드를 읽지 못하면 그리기 전이라 결제를 확인(이용권 차감)하지 않는다.
    expect(verifyPerUsePayment).not.toHaveBeenCalled();
  });

  // PARITY.ziweiCompat: HEAD 클라이언트 window._runZwCompatibilityCore(renderZiwei 안)를 vm 에서 같은 내 출생(PARITY.cases)과
  // 상대 입력으로 돌려 얻은 리포트 HTML 의 sha256·보정 문구·보정 시각·보관 사실·AI 상담 입력. KASI 날짜 보정은 양력 입력에서 항등이다.
  test.each(PARITY.ziweiCompatCases.map((c) => [c.id, c]))("server compatibility equals the HEAD client output: %s", (id, c) => {
    const me = PARITY.cases.find((entry) => entry.id === c.me);
    const result = buildSajuSectionHtml({
      featureKey: KEY, birth: { calendarDate: me.date, calType: me.calType, hour: me.hour, minute: me.minute, timeKnown: me.timeKnown !== false },
      gender: me.gender, name: me.name, place: me.place, now: new Date(PARITY.now), partner: c.partner,
    });
    const { html, ...rest } = PARITY.ziweiCompat[id];
    expect(sha256(result.html)).toBe(html);
    expect({ correctionMsg: result.correctionMsg, correctedTime: result.correctedTime, userLabel: result.userLabel, partnerLabel: result.partnerLabel, archive: result.archive, llm: result.llm }).toEqual(rest);
  });
});

describe("rpt_energyCoordCard", () => {
  const ENERGY = { ...INPUT, featureKey: "rpt_energyCoordCard" };
  // 같은 시각(renderedAt)으로 다시 그린 HTML — 오늘 날짜·추천 시드가 그 시각에 달려 있다.
  const expected = (result, birth, gender) => buildSajuSectionHtml({
    featureKey: "rpt_energyCoordCard", birth, gender, name: "테스트", mode: "pig", lang: "ko", now: new Date(result.body.energy.renderedAt),
  }).html;

  test("a BIRTH grant renders the card from the stored birth; it opens nothing else", async () => {
    grant({}, "rpt_energyCoordCard");
    const result = await request({ ...ENERGY, birth: { date: "2001-01-01", hour: 3, minute: 0 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, unlocked: true, featureKey: "rpt_energyCoordCard" });
    expect(result.body.html).toBe(expected(result, CARD_BIRTH, "M"));
    expect(result.body.html).toContain("에너지 원정 리포트");
    expect(result.body.css).toContain("energyRoulette");
    expect(result.body.energy.recent.length).toBeGreaterThan(0);
    expect((await request()).status).toBe(402);
  });

  test("a legacy account grant without a saved profile renders the body birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, "rpt_energyCoordCard");
    const { profileId: _omit, ...account } = ENERGY;
    const result = await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body.html).toBe(expected(result, { calendarDate: "1985-11-02", calType: "solar", hour: 6, minute: 5, timeKnown: true }, "F"));
  });

  test("another profile's or another birth's grant does not open this card", async () => {
    grant({ scope: "PROFILE", profileId: "p2" }, "rpt_energyCoordCard");
    expect((await request(ENERGY)).status).toBe(402);
    grant({}, "rpt_energyCoordCard");
    const other = await request({ ...ENERGY, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.html).toBeUndefined();
  });

  // /api/fortune/balance 가 이 카드를 여는 옛 상품: travelDestiny(같은 출생), allPaidSaju(계정 묶음).
  test("a travelDestiny grant for the same birth opens the card; another birth's does not", async () => {
    grant({}, "travelDestiny");
    expect((await request(ENERGY)).status).toBe(200);
    expect((await request({ ...ENERGY, profileId: "p3" })).status).toBe(402);
  });

  test.each([
    ["unlockedFeatures array", () => users.push({ _id: TEST_USER_ID, unlockedFeatures: ["allPaidSaju"] })],
    ["paidFeatures array", () => users.push({ _id: TEST_USER_ID, paidFeatures: ["allPaidSaju"] })],
    ["coin deduct history", () => histories.push({ userId: TEST_USER_ID, kind: "deduct", featureKey: "allPaidSaju" })],
  ])("an allPaidSaju bundle purchase (%s) opens the card", async (_label, seed) => {
    seed();
    expect((await request(ENERGY)).status).toBe(200);
    const { profileId: _omit, ...account } = ENERGY;
    expect((await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 } })).status).toBe(200);
  });

  test("other bundles or refunds are not allPaidSaju evidence", async () => {
    users.push({ _id: TEST_USER_ID, unlockedFeatures: ["rpgCharacter", "healthReport"] });
    histories.push({ userId: TEST_USER_ID, kind: "refund", featureKey: "allPaidSaju" });
    histories.push({ userId: OTHER_USER_ID, kind: "deduct", featureKey: "allPaidSaju" });
    expect((await request(ENERGY)).status).toBe(402);
  });

  // 당첨은 원본처럼 Math.random — 회차는 원판 각도(720+회차×137°…)만 정하고, 당첨 기록은 요청 값에 이번 당첨 하나를 더한다.
  test("a roulette spin redraws the delivered screen and returns only the result", async () => {
    grant({}, "rpt_energyCoordCard");
    const card = await request(ENERGY);
    const spin = (n, mode = "mixed", recent = []) => request({ ...ENERGY, energy: { recent: [], renderedAt: card.body.energy.renderedAt, roulette: { mode, spin: n, recent } } });
    const first = await spin(1);
    expect(first.status).toBe(200);
    expect(first.body.html).toContain('data-energy-roulette-reroll="mixed"');
    expect(first.body.energy.transform).toMatch(/^rotate\(\d+deg\)$/);
    expect(first.body.energy.roulette).toHaveLength(1);
    expect(first.body.css).toBeUndefined();
    const second = await spin(2, "domestic", first.body.energy.roulette);
    expect(second.body.energy.roulette).toHaveLength(2);
    expect(second.body.energy.roulette[1]).toBe(first.body.energy.roulette[0]);
    expect(second.body.html).toContain("data-energy-roulette-reroll=\"domestic\"");
    expect(second.body.energy.transform).toMatch(/^rotate\(\d+deg\)$/);
    expect((await spin(1, "jackpot")).body).toMatchObject({ code: "SAJU_INVALID_ROULETTE" });
    expect((await spin(0)).body).toMatchObject({ code: "SAJU_INVALID_ROULETTE" });
    grants[0].status = "REFUNDED";
    expect((await spin(1)).status).toBe(402);
  });

  test("a DB failure stays retryable instead of prompting purchase", async () => {
    grant({}, "rpt_energyCoordCard");
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(ENERGY);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  });

  // PARITY.energy: 56cc07e9a 의 클라이언트 renderEnergyCoord(js/saju-engine-tarot-sukuyo-quantum.js)를 vm 에서
  // 같은 차트·같은 now(PARITY.now)·빈 최근 여행지 목록으로 돌려 얻은 #energyCoordSection HTML 의 sha256.
  test.each(PARITY.cases.map((c) => [c.id, c]))("server card equals the HEAD client engine output: %s", (id, c) => {
    const html = buildSajuSectionHtml({
      featureKey: "rpt_energyCoordCard", birth: { calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false },
      gender: c.gender, name: c.name, mode: "pig", place: c.place, jongDecision: c.jong, now: new Date(PARITY.now),
    }).html;
    expect(sha256(html)).toBe(PARITY.energy[id]);
  });
});

describe("rpt_villainCard", () => {
  const VILLAIN = { ...INPUT, featureKey: "rpt_villainCard" };
  const expected = (birth, gender) => buildSajuSectionHtml({ featureKey: "rpt_villainCard", birth, gender, name: "테스트", mode: "pig", lang: "ko" }).html;

  test("a BIRTH grant renders the card from the stored birth; it opens nothing else", async () => {
    grant({}, "rpt_villainCard");
    const result = await request({ ...VILLAIN, birth: { date: "2001-01-01", hour: 3, minute: 0 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, unlocked: true, featureKey: "rpt_villainCard" });
    expect(result.body.html).toBe(expected(CARD_BIRTH, "M"));
    expect(result.body.html).toContain("villain-blacklist-v2");
    expect(result.body.css).toContain("villain-blacklist-v2");
    expect((await request()).status).toBe(402);
    expect((await request({ ...INPUT, featureKey: "rpt_energyCoordCard" })).status).toBe(402);
  });

  test("a legacy account grant without a saved profile renders the body birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, "rpt_villainCard");
    const { profileId: _omit, ...account } = VILLAIN;
    const result = await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body.html).toBe(expected({ calendarDate: "1985-11-02", calType: "solar", hour: 6, minute: 5, timeKnown: true }, "F"));
  });

  test("another profile's or another birth's grant does not open this card", async () => {
    grant({ scope: "PROFILE", profileId: "p2" }, "rpt_villainCard");
    expect((await request(VILLAIN)).status).toBe(402);
    grant({}, "rpt_villainCard");
    const other = await request({ ...VILLAIN, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.html).toBeUndefined();
  });

  // 빌런 카드에는 옛 묶음 별칭이 없다(PERSISTENT_UNLOCK_ALIAS_MAP) — allPaidSaju 로는 열리지 않는다.
  test("an allPaidSaju bundle does not open the villain card", async () => {
    users.push({ _id: TEST_USER_ID, unlockedFeatures: ["allPaidSaju"] });
    expect((await request(VILLAIN)).status).toBe(402);
  });

  test("a DB failure stays retryable instead of prompting purchase", async () => {
    grant({}, "rpt_villainCard");
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(VILLAIN);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  });

  // PARITY.villain: 56cc07e9a 의 클라이언트 renderVillain(js/saju-engine.js)을 vm 에서
  // 같은 차트·같은 now(PARITY.now)·pig·ko 로 돌려 얻은 #villainResult HTML 의 sha256.
  test.each(PARITY.cases.map((c) => [c.id, c]))("server card equals the HEAD client engine output: %s", (id, c) => {
    const html = buildSajuSectionHtml({
      featureKey: "rpt_villainCard", birth: { calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false },
      gender: c.gender, name: c.name, mode: "pig", place: c.place, jongDecision: c.jong, now: new Date(PARITY.now),
    }).html;
    expect(sha256(html)).toBe(PARITY.villain[id]);
  });
});

describe("rpt_healthReportCard", () => {
  const HEALTH = { ...INPUT, featureKey: "rpt_healthReportCard" };
  // 오늘 날짜(KST)가 본문의 날짜 줄·계절에 들어간다. 요청 시각을 넘기지 않으므로 지금 시각으로 다시 그려 비교한다.
  const expected = (birth, gender) => buildSajuSectionHtml({ featureKey: "rpt_healthReportCard", birth, gender, name: "테스트", mode: "pig", lang: "ko" }).html;

  test("a BIRTH grant renders the card from the stored birth; it opens nothing else", async () => {
    grant({}, "rpt_healthReportCard");
    const result = await request({ ...HEALTH, birth: { date: "2001-01-01", hour: 3, minute: 0 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, unlocked: true, featureKey: "rpt_healthReportCard" });
    expect(result.body.html).toBe(expected(CARD_BIRTH, "M"));
    expect(result.body.html).toContain("명리 헬스 리포트");
    expect(result.body.html).toContain("달빛 웰니스 클리닉");
    expect(result.body.css).toContain("@font-face");
    expect((await request()).status).toBe(402);
    expect((await request({ ...INPUT, featureKey: "rpt_villainCard" })).status).toBe(402);
  });

  test("a legacy account grant without a saved profile renders the body birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, "rpt_healthReportCard");
    const { profileId: _omit, ...account } = HEALTH;
    const result = await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body.html).toBe(expected({ calendarDate: "1985-11-02", calType: "solar", hour: 6, minute: 5, timeKnown: true }, "F"));
  });

  test("another profile's or another birth's grant does not open this card", async () => {
    grant({ scope: "PROFILE", profileId: "p2" }, "rpt_healthReportCard");
    expect((await request(HEALTH)).status).toBe(402);
    grant({}, "rpt_healthReportCard");
    const other = await request({ ...HEALTH, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.html).toBeUndefined();
  });

  // /api/fortune/balance 가 이 카드를 여는 옛 상품: healthReport(같은 출생), allPaidSaju(계정 묶음).
  test("a healthReport grant for the same birth opens the card; another birth's does not", async () => {
    grant({}, "healthReport");
    expect((await request(HEALTH)).status).toBe(200);
    expect((await request({ ...HEALTH, profileId: "p3" })).status).toBe(402);
  });

  test.each([
    ["unlockedFeatures array", () => users.push({ _id: TEST_USER_ID, unlockedFeatures: ["allPaidSaju"] })],
    ["paidFeatures array", () => users.push({ _id: TEST_USER_ID, paidFeatures: ["allPaidSaju"] })],
    ["coin deduct history", () => histories.push({ userId: TEST_USER_ID, kind: "deduct", featureKey: "allPaidSaju" })],
  ])("an allPaidSaju bundle purchase (%s) opens the card", async (_label, seed) => {
    seed();
    expect((await request(HEALTH)).status).toBe(200);
    const { profileId: _omit, ...account } = HEALTH;
    expect((await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 } })).status).toBe(200);
  });

  test("other bundles or refunds are not allPaidSaju evidence", async () => {
    users.push({ _id: TEST_USER_ID, unlockedFeatures: ["rpgCharacter", "travelDestiny"] });
    histories.push({ userId: TEST_USER_ID, kind: "refund", featureKey: "allPaidSaju" });
    histories.push({ userId: OTHER_USER_ID, kind: "deduct", featureKey: "allPaidSaju" });
    expect((await request(HEALTH)).status).toBe(402);
  });

  test("a DB failure stays retryable instead of prompting purchase", async () => {
    grant({}, "rpt_healthReportCard");
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(HEALTH);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  });

  // PARITY.health: 56cc07e9a 의 클라이언트 renderHealthReport(js/entertain-engine.js 덮어쓰기)를 vm 에서
  // 같은 차트·같은 now(PARITY.now)·pig·ko 로 돌려 얻은 #healthReportSection HTML 의 sha256.
  test.each(PARITY.cases.map((c) => [c.id, c]))("server card equals the HEAD client engine output: %s", (id, c) => {
    const html = buildSajuSectionHtml({
      featureKey: "rpt_healthReportCard", birth: { calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false },
      gender: c.gender, name: c.name, mode: "pig", place: c.place, jongDecision: c.jong, now: new Date(PARITY.now),
    }).html;
    expect(sha256(html)).toBe(PARITY.health[id]);
  });
});

describe("rpt_specialCharmCard", () => {
  const CHARM = { ...INPUT, featureKey: "rpt_specialCharmCard" };
  const expected = (birth, gender) => buildSajuSectionHtml({ featureKey: "rpt_specialCharmCard", birth, gender, name: "테스트", mode: "pig", lang: "ko" }).html;

  test("a BIRTH grant renders the card body from the stored birth; it opens nothing else", async () => {
    grant({}, "rpt_specialCharmCard");
    const result = await request({ ...CHARM, birth: { date: "2001-01-01", hour: 3, minute: 0 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, unlocked: true, featureKey: "rpt_specialCharmCard" });
    expect(result.body.html).toBe(expected(CARD_BIRTH, "M"));
    // 카드 틀(#specialCharmCard)은 브라우저 스텁이 갖고 있어 본문만 온다.
    expect(result.body.html.startsWith('<div class="cscard">')).toBe(true);
    expect(result.body.html).not.toContain('id="specialCharmCard"');
    expect((await request()).status).toBe(402);
    expect((await request({ ...INPUT, featureKey: "rpt_healthReportCard" })).status).toBe(402);
  });

  test.each(["rpt_specialCharmCard", "paid_content"])("existing %s service key preserves the purchased birth and owner boundary", async (serviceKey) => {
    grant({ serviceKey }, "rpt_specialCharmCard");
    expect((await request(CHARM)).status).toBe(200);
    expect((await request({ ...CHARM, profileId: "p2" })).status).toBe(200);
    expect((await request({ ...CHARM, profileId: "p3" })).status).toBe(402);
    expect((await request({ ...CHARM, featureKey: "rpt_skillTreeCard" })).status).toBe(402);
    auth.mockResolvedValue({ userId: OTHER_USER_ID });
    expect((await request({ ...CHARM, profileId: "x1" })).status).toBe(402);
  });

  test.each([
    { status: "REFUNDED" },
    { expiresAt: new Date("2000-01-01") },
  ])("inactive historical service key never opens a card: %j", async (overrides) => {
    grant({ serviceKey: "rpt_specialCharmCard", ...overrides }, "rpt_specialCharmCard");
    expect((await request(CHARM)).status).toBe(402);
  });

  test.each([
    { scope: "USER", profileId: "__user__" },
    { scope: "PROFILE", profileId: "p1" },
  ])("legacy scope with historical service key opens only its entitled profile: %j", async (overrides) => {
    grant({ serviceKey: "rpt_specialCharmCard", ...overrides }, "rpt_specialCharmCard");
    expect((await request(CHARM)).status).toBe(200);
    if (overrides.scope === "PROFILE") expect((await request({ ...CHARM, profileId: "p2" })).status).toBe(402);
  });

  test("a legacy account grant without a saved profile renders the body birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, "rpt_specialCharmCard");
    const { profileId: _omit, ...account } = CHARM;
    const result = await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body.html).toBe(expected({ calendarDate: "1985-11-02", calType: "solar", hour: 6, minute: 5, timeKnown: true }, "F"));
  });

  test("another profile's or another birth's grant does not open this card", async () => {
    grant({ scope: "PROFILE", profileId: "p2" }, "rpt_specialCharmCard");
    expect((await request(CHARM)).status).toBe(402);
    grant({}, "rpt_specialCharmCard");
    const other = await request({ ...CHARM, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.html).toBeUndefined();
  });

  // 매력 카드에는 옛 묶음 별칭이 없다(PERSISTENT_UNLOCK_ALIAS_MAP) — allPaidSaju 로는 열리지 않는다.
  test("an allPaidSaju bundle does not open the charm card", async () => {
    users.push({ _id: TEST_USER_ID, unlockedFeatures: ["allPaidSaju"] });
    expect((await request(CHARM)).status).toBe(402);
  });

  test("a DB failure stays retryable instead of prompting purchase", async () => {
    grant({}, "rpt_specialCharmCard");
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(CHARM);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  });

  // PARITY.charm: 56cc07e9a 의 클라이언트 renderSpecialCharm(js/saju-engine.js)을 vm 에서 같은 차트·같은 now(PARITY.now)로
  // 돌려 #dailyMonthlyCard 뒤에 끼우려던 카드 HTML 에서 틀(#specialCharmCard)을 벗긴 본문의 sha256.
  test.each(PARITY.cases.map((c) => [c.id, c]))("server card equals the HEAD client engine output: %s", (id, c) => {
    const html = buildSajuSectionHtml({
      featureKey: "rpt_specialCharmCard", birth: { calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false },
      gender: c.gender, name: c.name, mode: "pig", place: c.place, jongDecision: c.jong, now: new Date(PARITY.now),
    }).html;
    expect(sha256(html)).toBe(PARITY.charm[id]);
  });
});

describe("rpt_skillTreeCard", () => {
  const SKILL = { ...INPUT, featureKey: "rpt_skillTreeCard" };
  // 올해 세운·현재 나이(KST)가 시트에 들어간다. 요청 시각을 넘기지 않으므로 지금 시각으로 다시 그려 비교한다.
  const expected = (birth, gender) => buildSajuSectionHtml({ featureKey: "rpt_skillTreeCard", birth, gender, name: "테스트", mode: "pig", lang: "ko" }).html;

  test("a BIRTH grant renders the class sheet from the stored birth; it opens nothing else", async () => {
    grant({}, "rpt_skillTreeCard");
    const result = await request({ ...SKILL, birth: { date: "2001-01-01", hour: 3, minute: 0 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, unlocked: true, featureKey: "rpt_skillTreeCard" });
    expect(result.body.html).toBe(expected(CARD_BIRTH, "M"));
    // 클래스 시트만 온다. 그 아래 퀘스트 칸은 브라우저가 붙인다.
    expect(result.body.html.startsWith('<div class="skill-wrap" data-skilltree-ui-marker="skilltree-rpg-v20260613">')).toBe(true);
    expect(result.body.html).not.toContain("entRpgSection");
    expect(result.body.css).toContain("skilltree-rpg-v20260613");
    expect((await request()).status).toBe(402);
    expect((await request({ ...INPUT, featureKey: "rpt_specialCharmCard" })).status).toBe(402);
  });

  test("a legacy account grant without a saved profile renders the body birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, "rpt_skillTreeCard");
    const { profileId: _omit, ...account } = SKILL;
    const result = await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body.html).toBe(expected({ calendarDate: "1985-11-02", calType: "solar", hour: 6, minute: 5, timeKnown: true }, "F"));
  });

  test("another profile's or another birth's grant does not open this card", async () => {
    grant({ scope: "PROFILE", profileId: "p2" }, "rpt_skillTreeCard");
    expect((await request(SKILL)).status).toBe(402);
    grant({}, "rpt_skillTreeCard");
    const other = await request({ ...SKILL, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.html).toBeUndefined();
  });

  // /api/fortune/balance 가 이 카드를 여는 옛 상품: allPaidSaju(계정 묶음), rpgCharacter(계정 단위 키 — 출생과 무관하게 연다).
  test.each([
    ["unlockedFeatures array", () => users.push({ _id: TEST_USER_ID, unlockedFeatures: ["allPaidSaju"] })],
    ["paidFeatures array", () => users.push({ _id: TEST_USER_ID, paidFeatures: ["allPaidSaju"] })],
    ["coin deduct history", () => histories.push({ userId: TEST_USER_ID, kind: "deduct", featureKey: "allPaidSaju" })],
    ["rpgCharacter unlockedFeatures", () => users.push({ _id: TEST_USER_ID, unlockedFeatures: ["rpgCharacter"] })],
    ["rpgCharacter deduct history", () => histories.push({ userId: TEST_USER_ID, kind: "deduct", featureKey: "rpgCharacter" })],
    ["rpgCharacter account entitlement", () => grant({ scope: "USER", profileId: "__user__" }, "rpgCharacter")],
  ])("a legacy bundle or account purchase (%s) opens the card", async (_label, seed) => {
    seed();
    expect((await request(SKILL)).status).toBe(200);
    const { profileId: _omit, ...account } = SKILL;
    expect((await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 } })).status).toBe(200);
  });

  test("other bundles or refunds are not allPaidSaju evidence", async () => {
    users.push({ _id: TEST_USER_ID, unlockedFeatures: ["healthReport", "travelDestiny"] });
    histories.push({ userId: TEST_USER_ID, kind: "refund", featureKey: "allPaidSaju" });
    histories.push({ userId: TEST_USER_ID, kind: "refund", featureKey: "rpgCharacter" });
    histories.push({ userId: OTHER_USER_ID, kind: "deduct", featureKey: "allPaidSaju" });
    histories.push({ userId: OTHER_USER_ID, kind: "deduct", featureKey: "rpgCharacter" });
    expect((await request(SKILL)).status).toBe(402);
  });

  test("a DB failure stays retryable instead of prompting purchase", async () => {
    grant({}, "rpt_skillTreeCard");
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(SKILL);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  });

  // PARITY.skill: 56cc07e9a 의 클라이언트 renderSkillTree(js/saju-engine.js 원본, 퀘스트 칸을 붙이는 entertain 덮어쓰기 전)를
  // vm 에서 같은 차트·같은 now(PARITY.now)로 돌려 얻은 #skillTreeSection HTML 의 sha256.
  test.each(PARITY.cases.map((c) => [c.id, c]))("server card equals the HEAD client engine output: %s", (id, c) => {
    const html = buildSajuSectionHtml({
      featureKey: "rpt_skillTreeCard", birth: { calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false },
      gender: c.gender, name: c.name, mode: "pig", place: c.place, jongDecision: c.jong, now: new Date(PARITY.now),
    }).html;
    expect(sha256(html)).toBe(PARITY.skill[id]);
  });
});

describe("rpt_secretHouseEntryCard", () => {
  const PLAY = PARITY.secretHouse[2];
  const HOUSE = { ...INPUT, featureKey: "rpt_secretHouseEntryCard", house: { stem: PLAY.stem, branch: "子", history: PLAY.history.slice(0, 5) } };
  const expected = (birth, house) => buildSajuSectionHtml({ featureKey: "rpt_secretHouseEntryCard", birth, house }).house;
  const CHAR_STEMS = [["tree", "甲"], ["fire", "丙"], ["soil", "戊"], ["gold", "庚"], ["water", "壬"]];
  // 반응 대사는 줄 목록에서 무작위로 고른다 — 비교하는 동안만 고정한다.
  beforeEach(() => { jest.spyOn(Math, "random").mockReturnValue(0); });
  afterEach(() => { Math.random.mockRestore(); });

  test("a BIRTH grant replays the choices with the stored birth's day branch; it opens nothing else", async () => {
    grant({}, "rpt_secretHouseEntryCard");
    const result = await request({ ...HOUSE, birth: { date: "2001-01-01", hour: 3, minute: 0 } });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, unlocked: true, featureKey: "rpt_secretHouseEntryCard" });
    expect(result.body.house).toEqual(expected(CARD_BIRTH, { stem: PLAY.stem, history: HOUSE.house.history }));
    expect(result.body.house).toMatchObject({ userStem: PLAY.stem, ended: false });
    expect(result.body.house.scene.choices.length).toBeGreaterThan(0);
    expect(result.body.house.reaction.html).toContain("sh-img:");
    expect((await request({ ...HOUSE, featureKey: "rpt_skillTreeCard" })).status).toBe(402);
  });

  test("the result card comes only after the final scene, for a real cast member", async () => {
    grant({}, "rpt_secretHouseEntryCard");
    const done = await request({ ...HOUSE, house: { stem: PLAY.stem, history: PLAY.history, finalCharId: PLAY.finalCharId } });
    expect(done.status).toBe(200);
    expect(done.body.house.ended).toBe(true);
    const finalStem = Object.fromEntries(CHAR_STEMS)[PLAY.finalCharId];
    expect(done.body.house.result).toMatchObject({ finalCharId: PLAY.finalCharId, total: done.body.house.totals[finalStem] });
    expect(done.body.house.result.html.length).toBeGreaterThan(1000);
    for (const house of [
      { stem: PLAY.stem, history: PLAY.history.slice(0, 3), finalCharId: PLAY.finalCharId },
      { stem: PLAY.stem, history: PLAY.history, finalCharId: "constructor" },
      { stem: PLAY.stem, history: ["Z"] },
      { stem: PLAY.stem, history: "AAAA" },
      { stem: "子", history: [] },
    ]) {
      const bad = await request({ ...HOUSE, house });
      expect(bad.status).toBe(400);
      expect(bad.body.house).toBeUndefined();
    }
  });

  test("a legacy account grant without a saved profile uses the page's day branch", async () => {
    grant({ scope: "USER", profileId: "__user__" }, "rpt_secretHouseEntryCard");
    const { profileId: _omit, ...account } = HOUSE;
    const result = await request(account);
    expect(result.status).toBe(200);
    expect(result.body.house).toEqual(expected({}, HOUSE.house));
  });

  test("another profile's or another birth's grant does not open the episodes", async () => {
    expect((await request(HOUSE)).status).toBe(402);
    grant({ scope: "PROFILE", profileId: "p2" }, "rpt_secretHouseEntryCard");
    expect((await request(HOUSE)).status).toBe(402);
    grant({}, "rpt_secretHouseEntryCard");
    const other = await request({ ...HOUSE, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body).toMatchObject({ reason: "PAYMENT_REQUIRED", coinPrice: getBillingFeaturePricing({ featureKey: "rpt_secretHouseEntryCard" }).pricing.coinPrice });
    expect(other.body.house).toBeUndefined();
  });

  // /api/fortune/balance 가 입장권을 여는 옛 상품: allPaidSaju(계정 묶음), secretHouseEpisodes(계정 단위 에피소드 키).
  test.each([
    ["unlockedFeatures array", () => users.push({ _id: TEST_USER_ID, unlockedFeatures: ["allPaidSaju"] })],
    ["coin deduct history", () => histories.push({ userId: TEST_USER_ID, kind: "deduct", featureKey: "allPaidSaju" })],
    ["secretHouseEpisodes paidFeatures", () => users.push({ _id: TEST_USER_ID, paidFeatures: ["secretHouseEpisodes"] })],
    ["secretHouseEpisodes deduct history", () => histories.push({ userId: TEST_USER_ID, kind: "deduct", featureKey: "secretHouseEpisodes" })],
    ["secretHouseEpisodes account entitlement", () => grant({ scope: "USER", profileId: "__user__" }, "secretHouseEpisodes")],
  ])("a legacy bundle or episode purchase (%s) opens the episodes", async (_label, seed) => {
    seed();
    expect((await request(HOUSE)).status).toBe(200);
    const { profileId: _omit, ...account } = HOUSE;
    expect((await request(account)).status).toBe(200);
  });

  test("other bundles or refunds are not evidence", async () => {
    users.push({ _id: TEST_USER_ID, unlockedFeatures: ["healthReport", "rpgCharacter"] });
    histories.push({ userId: TEST_USER_ID, kind: "refund", featureKey: "secretHouseEpisodes" });
    histories.push({ userId: OTHER_USER_ID, kind: "deduct", featureKey: "secretHouseEpisodes" });
    expect((await request(HOUSE)).status).toBe(402);
  });

  test("a DB failure stays retryable instead of prompting purchase", async () => {
    grant({}, "rpt_secretHouseEntryCard");
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(HOUSE);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  });

  // PARITY.secretHouse: HEAD secret-house_real.html 메인 스크립트를 vm 에서 같은 선택 글자로 끝까지 밟아
  // 장면(대사·선택지·1위)·반응 카드·캐릭터별 점수·엔딩 카드를 모은 기록의 sha256(Math.random 0 고정).
  test.each(PARITY.secretHouse.map((c, i) => [i, c.stem, c.branch, c]))("server episode equals the HEAD client engine: #%s %s%s", (_i, _stem, _branch, c) => {
    const steps = [];
    let last;
    for (let k = 0; k <= c.history.length; k++) {
      last = expected({}, { stem: c.stem, branch: c.branch, history: c.history.slice(0, k), finalCharId: k === c.history.length ? c.finalCharId : undefined });
      if (k > 0) Object.assign(steps[k - 1], { lbl: c.history[k - 1], rxn: last.reaction.html, border: last.reaction.border });
      const s = last.scene;
      steps.push({ view: { id: s.id, badge: s.badge, sit: s.sit, type: s.type, beats: s.beats, choices: s.choices.map((x) => [x.lbl, x.txt]), top: last.topCharId } });
    }
    const record = {
      stem: c.stem, branch: c.branch, history: c.history, finalCharId: c.finalCharId, steps,
      totals: Object.fromEntries(CHAR_STEMS.map(([id, stem]) => [id, last.totals[stem]])),
      result: { html: last.result.html, border: last.result.border, endingType: last.result.endingType, endingReason: last.result.endingReason, title: last.result.title },
    };
    expect(sha256(JSON.stringify(record))).toBe(c.sha256);
  });
});

describe("animal-destiny-unlock", () => {
  const ANIMAL = { profileId: "p1", featureKey: "animal-destiny-unlock", birth: { date: "2001-01-01", calType: "solar", timeKnown: true, hour: 3, minute: 0 } };
  const expected = (birth) => buildSajuSectionHtml({ featureKey: "animal-destiny-unlock", birth }).animal;

  test("a BIRTH grant reads the stored profile birth, not the body's; it opens nothing else", async () => {
    grant({}, "animal-destiny-unlock");
    const result = await request(ANIMAL);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, unlocked: true, featureKey: "animal-destiny-unlock" });
    expect(result.body.animal).toEqual(expected(CARD_BIRTH));
    expect(result.body.animal.animalId).toBe(PARITY.animal["solar-m-1990"].animalId);
    expect(result.body.animal.sections.length).toBeGreaterThanOrEqual(8);
    expect(result.body.animal.dex).toHaveLength(12);
    expect(result.body.html).toBeUndefined();
    expect((await request({ ...ANIMAL, featureKey: "rpt_skillTreeCard" })).status).toBe(402);
  });

  test("a legacy account grant without a saved profile reads the page's birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, "animal-destiny-unlock");
    const { profileId: _omit, ...account } = ANIMAL;
    const result = await request(account);
    expect(result.status).toBe(200);
    expect(result.body.animal).toEqual(expected({ calendarDate: "2001-01-01", calType: "solar", timeKnown: true, hour: 3, minute: 0 }));
    const bad = await request({ ...account, birth: { date: "2001-13-45", calType: "solar", timeKnown: false } });
    expect(bad.status).toBe(400);
    expect(bad.body.animal).toBeUndefined();
  });

  test("another profile's or another birth's grant does not open the reading", async () => {
    expect((await request(ANIMAL)).status).toBe(402);
    grant({ scope: "PROFILE", profileId: "p2" }, "animal-destiny-unlock");
    expect((await request(ANIMAL)).status).toBe(402);
    grant({}, "animal-destiny-unlock");
    const other = await request({ ...ANIMAL, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body).toMatchObject({ reason: "PAYMENT_REQUIRED", coinPrice: getBillingFeaturePricing({ featureKey: "animal-destiny-unlock" }).pricing.coinPrice });
    expect(other.body.animal).toBeUndefined();
  });

  test("a DB failure stays retryable instead of prompting purchase", async () => {
    grant({}, "animal-destiny-unlock");
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(ANIMAL);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
    expect(result.body.animal).toBeUndefined();
  });

  // PARITY.animal: HEAD 클라이언트(store.calculate → AnimalResultScreen 의 resolveTwelveGrowthAnimalResult·buildTwelveAnimalSections·
  // buildDetailedInterpretation·도감)를 같은 출생으로 돌린 { animalId, stageKey, result, sections, detailed, dex } 의 sha256.
  test.each(PARITY.cases.map((c) => [c.id, c]))("server reading equals the HEAD client output: %s", (id, c) => {
    const animal = expected({ calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false });
    expect(animal.animalId).toBe(PARITY.animal[id].animalId);
    expect(sha256(JSON.stringify(animal))).toBe(PARITY.animal[id].sha256);
  });

  // PARITY.animalStages: 일지만 바꾼 합성 원국으로 12운성(동물) 전부를 한 번씩 밟는다.
  test.each(PARITY.animalStages.map((s) => [s.stageKey, s]))("every stage animal equals the HEAD client output: %s", (_key, s) => {
    const reading = buildAnimalDestinyReading(s.pillars, false);
    expect(reading).toMatchObject({ animalId: s.animalId, stageKey: s.stageKey });
    expect(sha256(JSON.stringify(reading))).toBe(s.sha256);
  });
});

// 자미두수 차트 상세 해금(출생 단위, 50코인). 서버가 해금된 프로필의 출생으로 명반을 다시 세워 본문을 그린다 —
// 화면이 보낸 명반·궁 번호는 받지 않는다. 대한 운세는 대한 타임라인(html)과 운세 흐름 안쪽 대한 표(decadeHtml) 두 칸이다.
const ZIWEI_KEYS = ["ziwei_decade_luck", "ziwei_twelve_palaces", "ziwei_love_deep", "ziwei_symbolic_layer"];
const ziweiBody = (result) => ({ html: result.html, decadeHtml: result.decadeHtml });
describe.each(ZIWEI_KEYS)("%s", (featureKey) => {
  const ZW = { ...INPUT, featureKey };
  // 올해(KST) 유년이 본문에 들어간다. 요청 시각을 넘기지 않으므로 지금 시각으로 다시 그려 비교한다.
  const expected = (birth, gender) => ziweiBody(buildSajuSectionHtml({ featureKey, birth, gender, name: "테스트", mode: "pig", lang: "ko" }));

  test("unowned returns registry pricing without a body", async () => {
    const result = await request(ZW);
    const { pricing } = getBillingFeaturePricing({ featureKey });
    expect(result).toEqual({ status: 402, body: expect.objectContaining({ featureKey, coinPrice: pricing.coinPrice }) });
    expect(result.body.html).toBeUndefined();
    expect(result.body.decadeHtml).toBeUndefined();
  });

  test("a BIRTH grant renders from the stored birth, ignoring the body's; it opens nothing else", async () => {
    grant({}, featureKey);
    const result = await request({ ...ZW, birth: { date: "2001-01-01", hour: 3, minute: 0 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, unlocked: true, featureKey });
    expect(ziweiBody(result.body)).toEqual(expected(CARD_BIRTH, "M"));
    expect(result.body.html.length).toBeGreaterThan(200);
    expect((await request(INPUT)).status).toBe(402);
    expect((await request({ ...INPUT, featureKey: "rpt_skillTreeCard" })).status).toBe(402);
  });

  test("a legacy account grant without a saved profile renders the body birth", async () => {
    grant({ scope: "USER", profileId: "__user__" }, featureKey);
    const { profileId: _omit, ...account } = ZW;
    const result = await request({ ...account, birth: { date: "1985-11-02", calType: "solar", hour: 6, minute: 5 }, gender: "F" });
    expect(result.status).toBe(200);
    expect(ziweiBody(result.body)).toEqual(expected({ calendarDate: "1985-11-02", calType: "solar", hour: 6, minute: 5, timeKnown: true }, "F"));
  });

  test("another profile's or another birth's grant does not open it", async () => {
    grant({ scope: "PROFILE", profileId: "p2" }, featureKey);
    expect((await request(ZW)).status).toBe(402);
    grant({}, featureKey);
    const other = await request({ ...ZW, profileId: "p3" });
    expect(other.status).toBe(402);
    expect(other.body.html).toBeUndefined();
  });

  test("a DB failure stays retryable instead of prompting purchase", async () => {
    grant({}, featureKey);
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request(ZW);
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
    expect(result.body.html).toBeUndefined();
  });

  // PARITY[id].ziwei: HEAD 클라이언트 computeProfileForModal → renderZiwei(명궁 기본 패널)를 vm 에서 같은 출생·같은 now(PARITY.now)로
  // 돌려 얻은 유료 본문 HTML 의 sha256. 대한 운세는 타임라인(ziwei_decade_luck)과 안쪽 대한 표(ziwei_decade_luck_inner)를 따로 잰다.
  test.each(PARITY.cases.map((c) => [c.id, c]))("server body equals the HEAD client engine output: %s", (id, c) => {
    const result = buildSajuSectionHtml({
      featureKey, birth: { calendarDate: c.date, calType: c.calType, hour: c.hour, minute: c.minute, timeKnown: c.timeKnown !== false },
      gender: c.gender, name: c.name, mode: "pig", place: c.place, jongDecision: c.jong, now: new Date(PARITY.now),
    });
    expect(sha256(result.html)).toBe(PARITY.ziwei[id][featureKey]);
    if (featureKey === "ziwei_decade_luck") expect(sha256(result.decadeHtml)).toBe(PARITY.ziwei[id].ziwei_decade_luck_inner);
    else expect(result.decadeHtml).toBeUndefined();
  });
});
