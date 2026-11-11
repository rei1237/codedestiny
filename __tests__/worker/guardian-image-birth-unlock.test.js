/** @jest-environment node */
import { jest } from "@jest/globals";
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from "../fixtures/profile-card-model.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";
import { HttpError } from "../../worker/lib/http.js";

// 사주 가디언 이미지 프롬프트(/api/guardian/image-prompt): 출생 기반(BIRTH) 해금만 근거, 프롬프트 입력은 저장된 프로필 출생 정보로만.
// 외부 이미지 모델은 부르지 않는다(fetch 0회). 예전 /generate-image 는 410 으로 종료를 알린다.
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
const ENV = {};
// 본문 sajuData 는 다른 사람(2001-01-01, 화·쥐) 것 — 계산에 쓰이면 안 된다.
const INPUT = { profileId: "p1", sajuData: { year: 2001, month: 1, day: 1, hour: 3, elements: "화", mainAnimal: "쥐", polarity: "음" } };
const birthProfileId = (profileId) => toBirthEntitlementProfileId(computeBirthKey(cards.find((card) => card.profileId === profileId)));
let grants, users, outbound;

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

async function request(body = INPUT, path = "/api/guardian/image-prompt") {
  const response = await handleSajuGuardianImageRoutes(new Request(`https://example.test${path}`, {
    method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
  }), ENV);
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
  outbound = jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("guardian must not call any external API"));
});
afterEach(() => {
  expect(outbound).not.toHaveBeenCalled();
  outbound.mockRestore();
});

test("anonymous requests are rejected before any rights read", async () => {
  auth.mockRejectedValue(new HttpError(401, "로그인이 필요합니다."));
  expect((await request()).status).toBe(401);
  expect(findOne).not.toHaveBeenCalled();
});

test("without a BIRTH grant the prompt is locked with the per-birth purchase message and pricing", async () => {
  const result = await request();
  const { pricing } = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  expect(result.status).toBe(402);
  expect(result.body).toMatchObject({ featureKey: FEATURE_KEY, amountKRW: pricing.amountKRW, coinPrice: pricing.coinPrice });
  expect(result.body.message).toContain("이 생년월일은 별도 구매가 필요합니다");
});

test("a BIRTH grant returns copyable prompts from the stored profile birth, ignoring body sajuData", async () => {
  grant();
  const result = await request();
  expect(result.status).toBe(200);
  const body = result.body;
  expect(body.ok).toBe(true);
  expect(body).not.toHaveProperty("imageBase64");
  // 프로필 1990-05-17 09:30 → seed 1990*100000 + 5*1000 + 17*10 + 9, 일주 임오(수·말·양).
  expect(body.seed).toBe(199005179);
  expect(body.attributes).toEqual({ element: "수", yinYang: "양", animal: "말", dayPillar: "임오" });
  expect(body.prompt).toContain("horse");
  expect(body.prompt).toContain("abyssal tide");
  expect(body.prompt).toContain("radiant");
  expect(body.prompt).not.toMatch(/\brat\b|crimson flame/);
  expect(body.negativePrompt).toContain("watermark");
});

test("the retired image endpoint answers 410 without auth, rights reads or external calls", async () => {
  grant();
  const result = await request(INPUT, "/api/guardian/generate-image");
  expect(result).toEqual({ status: 410, body: expect.objectContaining({ ok: false, reason: "IMAGE_GENERATION_RETIRED" }) });
  expect(result.body).not.toHaveProperty("imageBase64");
  expect(auth).not.toHaveBeenCalled();
  expect(findOne).not.toHaveBeenCalled();
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

test("editing the profile birth re-locks the prompt and reverting re-opens it", async () => {
  grant();
  cards[0].birth.day = 20;
  expect((await request()).status).toBe(402);
  cards[0].birth.day = 17;
  expect((await request()).status).toBe(200);
});

test("missing, foreign or synthetic profile ids are rejected without a prompt", async () => {
  grant();
  const { profileId: _omit, ...withoutProfile } = INPUT;
  const missing = await request(withoutProfile);
  expect(missing).toEqual({ status: 400, body: expect.objectContaining({ reason: "MISSING_PROFILE_ID", requiresProfile: true, message: "프로필을 저장한 뒤 구매해 주세요." }) });
  expect((await request({ ...INPUT, profileId: birthProfileId("p1") })).status).toBe(400);
  for (const profileId of ["x1", "__user__", "nope"]) {
    const result = await request({ ...INPUT, profileId });
    expect(result).toEqual({ status: 403, body: expect.objectContaining({ reason: "INVALID_PROFILE", requiresProfile: true }) });
  }
});

test.each([
  { userId: OTHER_USER_ID }, { status: "REFUNDED" }, { expiresAt: new Date("2020-01-01") },
  { scope: "PROFILE", profileId: "p2" },
  { profileId: "birth:" + "0".repeat(64) }, { contentKey: "premium-sibyl-dominator" },
])("an unrelated, other-card or inactive grant never opens the prompt: %j", async (override) => {
  grant(override);
  expect((await request()).status).toBe(402);
});

// 출생 기반 전환 이전 USER·PROFILE 행(운영 구매자)은 계속 연다 — 재잠금 방지. 다른 카드의 PROFILE 행은 닫힌다.
test.each([
  { scope: "PROFILE", profileId: "p1" }, { scope: "USER", profileId: "__user__" },
])("a legacy grant from before the birth-scope switch keeps opening the prompt: %j", async (override) => {
  grant(override);
  expect((await request()).status).toBe(200);
});

test("DB failures stay retryable instead of prompting purchase", async () => {
  grant();
  connectDb.mockRejectedValue(new Error("private database connection information"));
  const result = await request();
  expect(result.status).toBe(503);
  expect(result.body).toMatchObject({ reason: "TEMPORARY_UNAVAILABLE", retryable: true });
  expect(JSON.stringify(result.body)).not.toContain("private database");
});
