/**
 * @jest-environment node
 */
import { jest } from "@jest/globals";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";
import { HttpError } from "../../worker/lib/http.js";

// /api/sibyl/report: 출생 기반(BIRTH) 해금만 근거, 리포트는 저장된 프로필 출생 정보로만 만든다.
const auth = jest.fn();
const exists = jest.fn();
const findOne = jest.fn();
const write = jest.fn(() => { throw new Error("Read route attempted a write"); });
const connectDb = jest.fn();
const BIRTH = { year: 1990, month: 5, day: 17, hour: 9, minute: 30 }; // 일주 임오
const cards = [testCard("p1", BIRTH), testCard("p2", BIRTH), testCard("p3", { ...BIRTH, day: 18 }), testCard("x1", { ...BIRTH, userId: OTHER_USER_ID })];
const initialCards = cards.map((card) => ({ ...card, birth: { ...card.birth } }));
const profileCards = profileCardModel(cards);
jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
  requireAuth: auth, requireUserFromRequest: auth, getOptionalUserFromRequest: jest.fn(),
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
  User: { exists, findOne: write, updateOne: write, findOneAndUpdate: write },
  ProfileCard: { modelName: "ProfileCard", findOne: (...args) => profileCards.findOne(...args) },
}));

let sibylUtils, handleSibylRoutes, resolvePaidContentUnlockTarget, getBillingFeaturePricing;

beforeAll(async () => {
  const mod = await import("../../worker/routes/sibyl.js");
  sibylUtils = mod.__sibylReportTestUtils;
  handleSibylRoutes = mod.handleSibylRoutes;
  ({ resolvePaidContentUnlockTarget } = await import("../../worker/lib/content-unlocks.js"));
  ({ getBillingFeaturePricing } = await import("../../worker/lib/billing-feature-registry.js"));
});

describe("Sibyl premium report strict validation", () => {
  test("필수 10개 chapterMap이 모두 300자 이상이면 통과", () => {
    const longText = "분석 데이터 ".repeat(60);
    const report = {
      coreMatrix: longText,
      riskAnalysis: longText,
      aptitudeAnalysis: longText,
      tenGodPattern: longText,
      elementBalance: longText,
      yearlyFlow: longText,
      monthlyPlanner: longText,
      relationship: longText,
      moneyCareer: longText,
      finalMessage: longText,
    };

    expect(sibylUtils.validateSibylReport(report)).toBe(true);
  });

  test("필수 chapter 누락 또는 길이 부족이면 실패", () => {
    const longText = "분석 데이터 ".repeat(60);
    const report = {
      coreMatrix: longText,
      riskAnalysis: longText,
      aptitudeAnalysis: longText,
      tenGodPattern: longText,
      elementBalance: longText,
      yearlyFlow: longText,
      monthlyPlanner: longText,
      relationship: longText,
      moneyCareer: longText,
      finalMessage: "짧음",
    };

    expect(() => sibylUtils.validateSibylReport(report)).toThrow(/finalMessage/i);
  });

  test("AI 챕터가 비어 있어도 canonical fallback으로 10챕터를 채움", () => {
    const canonical = {
      input: {
        birthDate: "1992-06-15",
        birthTime: "12:30",
        gender: "F",
        calendarType: "solar",
      },
      saju: {
        dayMaster: "갑",
        dominantElement: "wood",
        tenGodSummary: {
          dominantTenGod: "편재",
        },
      },
      sibyl: {
        dominantTenGod: "편재",
        dominantElement: "wood",
        riskScore: 58,
        aptitudeScore: 640,
      },
      yearlyFlow: [
        { year: 2026, riskScore: 52, opportunityScore: 48 },
        { year: 2027, riskScore: 61, opportunityScore: 39 },
      ],
    };

    const mapped = sibylUtils.mapToSibylChapters([], canonical);
    expect(Object.keys(mapped.chapterMap).length).toBe(10);
    expect(mapped.chapterList.length).toBe(10);

    sibylUtils.validateSibylReport(mapped.chapterMap);
  });
});

describe("Sibyl report route — birth-scoped unlock", () => {
  const FEATURE_KEY = "premium-sibyl-dominator";
  // 본문 출생·명식은 다른 사람(2001-01-01, 병자일) 것 — 리포트에 쓰이면 안 된다.
  const INPUT = {
    profileId: "p1", riskScore: 58, aptCoeff: 640, dominantTenStar: "편재", dominantEl: "fire",
    featureKey: "flower-fc", premiumAccessToken: "forged", unlocked: true,
    profile: { id: "forged", gender: "M", birth: { year: 2001, month: 1, day: 1, hour: 3, minute: 0 } },
    pillars: { year: { g: "신", j: "사" }, month: { g: "무", j: "자" }, day: { g: "병", j: "자" }, hour: { g: "무", j: "자" } },
    canonicalData: { input: { birthDate: "2001-01-01", birthTime: "03:00" }, saju: { dayMaster: "병", dayPillar: "병자" } },
    normalizedProfile: { input: { birthDate: "2001-01-01" }, saju: { dayPillar: "병자", dayMaster: "병" } },
  };
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

  function grant(overrides = {}) {
    grants.push({
      ...resolvePaidContentUnlockTarget({ userId: TEST_USER_ID, featureKey: FEATURE_KEY }),
      scope: "BIRTH", profileId: birthProfileId("p1"), purchaseProfileId: "p1",
      status: "ACTIVE", expiresAt: null, ...overrides,
    });
  }

  async function request(body = INPUT) {
    const response = await handleSibylRoutes(new Request("https://example.test/api/sibyl/report", {
      method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
    }), {});
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
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test("anonymous requests are rejected before any rights read", async () => {
    auth.mockRejectedValue(new HttpError(401, "로그인이 필요합니다."));
    expect((await request()).status).toBe(401);
    expect(findOne).not.toHaveBeenCalled();
  });

  test("forged tokens/flags without a BIRTH grant stay locked with per-birth pricing", async () => {
    const result = await request();
    const { pricing } = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
    expect(result.status).toBe(402);
    expect(result.body).toMatchObject({ featureKey: FEATURE_KEY, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice });
    expect(result.body.message).toContain("이 생년월일은 별도 구매가 필요합니다");
    expect(result.body.chapters).toBeUndefined();
  });

  test("a BIRTH grant builds the report from the stored profile birth, ignoring body birth and pillars", async () => {
    grant();
    const result = await request();
    expect(result.status).toBe(200);
    expect(result.body.chapters).toHaveLength(10);
    expect(result.body.canonical.input).toMatchObject({ birthDate: "1990-5-17", birthTime: "09:30", gender: "F" });
    expect(result.body.canonical.saju).toMatchObject({ dayPillar: "임오", dayMaster: "임" });
    expect(JSON.stringify(result.body)).not.toMatch(/2001|병자/);
    // 출생 정보가 아닌 보조 점수는 본문 값을 쓴다.
    expect(result.body.canonical.sibyl).toMatchObject({ riskScore: 58, aptitudeScore: 640 });
  });

  test.each(["unlockedFeatures", "paidFeatures"])("legacy %s account array is not evidence", async (field) => {
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
    cards[0].birth.day = 17;
    expect((await request()).status).toBe(200);
  });

  test("missing, foreign or synthetic profile ids are rejected without a report", async () => {
    grant();
    const { profileId: _omit, ...withoutProfile } = INPUT;
    const missing = await request(withoutProfile);
    expect(missing).toEqual({ status: 400, body: expect.objectContaining({ reason: "MISSING_PROFILE_ID", requiresProfile: true, message: "프로필을 저장한 뒤 구매해 주세요." }) });
    expect((await request({ ...INPUT, profileId: birthProfileId("p1") })).status).toBe(400);
    for (const profileId of ["x1", "__user__", "nope"]) {
      const result = await request({ ...INPUT, profileId });
      expect(result).toEqual({ status: 403, body: expect.objectContaining({ reason: "INVALID_PROFILE", requiresProfile: true }) });
      expect(result.body.chapters).toBeUndefined();
    }
  });

  test.each([
    { userId: OTHER_USER_ID }, { status: "REFUNDED" }, { expiresAt: new Date("2020-01-01") },
    { scope: "PROFILE", profileId: "p1" }, { scope: "USER", profileId: "__user__" },
    { profileId: "birth:" + "0".repeat(64) }, { contentKey: "saju-guardian-unlock" },
  ])("an unrelated, legacy or inactive grant never opens the report: %j", async (override) => {
    grant(override);
    expect((await request()).status).toBe(402);
  });

  test("DB failures stay retryable instead of prompting purchase", async () => {
    grant();
    connectDb.mockRejectedValue(new Error("private database connection information"));
    const result = await request();
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
    expect(JSON.stringify(result.body)).not.toContain("private database");
  });
});
