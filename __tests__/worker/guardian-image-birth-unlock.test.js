/** @jest-environment node */
import { jest } from "@jest/globals";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";
import { HttpError } from "../../worker/lib/http.js";

// 사주 가디언 이미지(/api/guardian/generate-image): 출생 기반(BIRTH) 해금만 근거, 이미지 입력은 저장된 프로필 출생 정보로만.
const auth = jest.fn();
const exists = jest.fn();
const findOne = jest.fn();
const write = jest.fn(() => { throw new Error("Read route attempted a write"); });
const connectDb = jest.fn();
const BIRTH = { year: 1990, month: 5, day: 17, hour: 9, minute: 30 }; // 일주 임오 → 수(水)·말·양
const cards = [testCard("p1", BIRTH), testCard("p2", BIRTH), testCard("p3", { ...BIRTH, day: 18 }), testCard("x1", { ...BIRTH, userId: OTHER_USER_ID })];
const initialCards = cards.map((card) => ({ ...card, birth: { ...card.birth } }));
const profileCards = profileCardModel(cards);
jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
  requireUserFromRequest: auth, requireAuth: auth, getOptionalUserFromRequest: jest.fn(),
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

let handleSajuGuardianImageRoutes, resolvePaidContentUnlockTarget, getBillingFeaturePricing;
beforeAll(async () => {
  ({ handleSajuGuardianImageRoutes } = await import("../../worker/routes/guardian-image.js"));
  ({ resolvePaidContentUnlockTarget } = await import("../../worker/lib/content-unlocks.js"));
  ({ getBillingFeaturePricing } = await import("../../worker/lib/billing-feature-registry.js"));
});

const FEATURE_KEY = "saju-guardian-unlock";
const ENV = { NVIDIA_DRAW_API_KEY: "test-key" };
// 본문 sajuData 는 다른 사람(2001-01-01, 화·쥐) 것 — 계산에 쓰이면 안 된다.
const INPUT = { profileId: "p1", sajuData: { year: 2001, month: 1, day: 1, hour: 3, elements: "화", mainAnimal: "쥐", polarity: "음" } };
const birthProfileId = (profileId) => toBirthEntitlementProfileId(computeBirthKey(cards.find((card) => card.profileId === profileId)));
let grants, users, nvidia;

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
  const response = await handleSajuGuardianImageRoutes(new Request("https://example.test/api/guardian/generate-image", {
    method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
  }), ENV);
  expect(write).not.toHaveBeenCalled();
  return { status: response.status, body: await response.json() };
}
const sentImageRequest = () => JSON.parse(nvidia.mock.calls[0][1].body);

beforeEach(() => {
  jest.clearAllMocks();
  grants = []; users = [];
  cards.splice(0, cards.length, ...initialCards.map((card) => ({ ...card, birth: { ...card.birth } })));
  auth.mockReset().mockResolvedValue({ userId: TEST_USER_ID });
  connectDb.mockReset().mockResolvedValue(undefined);
  exists.mockImplementation(async (query) => users.find((user) => matches(user, query)) || null);
  findOne.mockImplementation((query) => ({ lean: async () => grants.find((row) => matches(row, query)) || null }));
  nvidia = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ artifacts: [{ base64: "aW1n" }] }), { status: 200 }));
});
afterEach(() => nvidia.mockRestore());

test("anonymous requests are rejected before any rights read or image call", async () => {
  auth.mockRejectedValue(new HttpError(401, "로그인이 필요합니다."));
  expect((await request()).status).toBe(401);
  expect(findOne).not.toHaveBeenCalled();
  expect(nvidia).not.toHaveBeenCalled();
});

test("without a BIRTH grant the image is locked with the per-birth purchase message and pricing", async () => {
  const result = await request();
  const { pricing } = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  expect(result.status).toBe(402);
  expect(result.body).toMatchObject({ featureKey: FEATURE_KEY, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice });
  expect(result.body.message).toContain("이 생년월일은 별도 구매가 필요합니다");
  expect(nvidia).not.toHaveBeenCalled();
});

test("a BIRTH grant generates the image from the stored profile birth, ignoring body sajuData", async () => {
  grant();
  const result = await request();
  expect(result).toEqual({ status: 200, body: expect.objectContaining({ ok: true, imageBase64: "aW1n" }) });
  const sent = sentImageRequest();
  // 프로필 1990-05-17 09:30 → seed 1990*100000 + 5*1000 + 17*10 + 9, 일주 임오(수·말·양).
  expect(sent.seed).toBe(199005179);
  expect(sent.prompt).toContain("horse");
  expect(sent.prompt).toContain("abyssal tide");
  expect(sent.prompt).toContain("radiant");
  expect(sent.prompt).not.toMatch(/\brat\b|crimson flame/);
});

test.each(["unlockedFeatures", "paidFeatures"])("legacy %s account array is not evidence", async (field) => {
  users.push({ _id: TEST_USER_ID, [field]: [FEATURE_KEY] });
  expect((await request()).status).toBe(402);
  expect(nvidia).not.toHaveBeenCalled();
});

test("another saved profile with the same birth shares the unlock; a different birth needs its own purchase", async () => {
  grant();
  expect((await request({ ...INPUT, profileId: "p2" })).status).toBe(200);
  const other = await request({ ...INPUT, profileId: "p3" });
  expect(other.status).toBe(402);
  expect(other.body.message).toContain("이 생년월일은 별도 구매가 필요합니다");
});

test("editing the profile birth re-locks the image and reverting re-opens it", async () => {
  grant();
  cards[0].birth.day = 20;
  expect((await request()).status).toBe(402);
  cards[0].birth.day = 17;
  expect((await request()).status).toBe(200);
});

test("missing, foreign or synthetic profile ids are rejected without generation", async () => {
  grant();
  const { profileId: _omit, ...withoutProfile } = INPUT;
  const missing = await request(withoutProfile);
  expect(missing).toEqual({ status: 400, body: expect.objectContaining({ reason: "MISSING_PROFILE_ID", requiresProfile: true, message: "프로필을 저장한 뒤 구매해 주세요." }) });
  expect((await request({ ...INPUT, profileId: birthProfileId("p1") })).status).toBe(400);
  for (const profileId of ["x1", "__user__", "nope"]) {
    const result = await request({ ...INPUT, profileId });
    expect(result).toEqual({ status: 403, body: expect.objectContaining({ reason: "INVALID_PROFILE", requiresProfile: true }) });
  }
  expect(nvidia).not.toHaveBeenCalled();
});

test.each([
  { userId: OTHER_USER_ID }, { status: "REFUNDED" }, { expiresAt: new Date("2020-01-01") },
  { scope: "PROFILE", profileId: "p1" }, { scope: "USER", profileId: "__user__" },
  { profileId: "birth:" + "0".repeat(64) }, { contentKey: "premium-sibyl-dominator" },
])("an unrelated, legacy or inactive grant never opens the image: %j", async (override) => {
  grant(override);
  expect((await request()).status).toBe(402);
  expect(nvidia).not.toHaveBeenCalled();
});

test("DB failures stay retryable instead of prompting purchase", async () => {
  grant();
  connectDb.mockRejectedValue(new Error("private database connection information"));
  const result = await request();
  expect(result.status).toBe(503);
  expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  expect(JSON.stringify(result.body)).not.toContain("private database");
  expect(nvidia).not.toHaveBeenCalled();
});
