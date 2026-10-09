/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";

const TEST_USER_ID = "507f1f77bcf86cd799439011";
const TEST_PROFILE_ID = "profile-main";
const requireUserFromRequest = jest.fn();
const withMongoRetry = jest.fn(async (_env, operation) => operation());
const getUnlockedContentSnapshot = jest.fn();
const findActivePaidContentUnlock = jest.fn();
const upsertContentUnlock = jest.fn();
const profileFindOne = jest.fn();
const pointHistoryFind = jest.fn();
const paymentFind = jest.fn();
const entitlementBulkWrite = jest.fn();
const entitlementFind = jest.fn();
const resolveBirthUnlockIdentity = jest.fn();
const tryResolveBirthUnlockIdentity = jest.fn();
const BIRTH_FEATURE_BY_CONTENT_KEY = {
  "saju.daewunAnalysis": "section_daewun",
  "saju.fullReading": "section_summary",
  "saju.compatibility": "section_compat",
};
const BIRTH_IDENTITY = Object.freeze({
  profileId: TEST_PROFILE_ID,
  partnerProfileId: "",
  birthKey: "a".repeat(64),
  partnerBirthKey: "",
  entitlementProfileId: `birth:${"a".repeat(64)}`,
  scope: "BIRTH",
  featureKey: "section_daewun",
});

let handleAccessRoutes;
let createHttpError;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireUserFromRequest,
      isAuthDbInfraError: () => false,
    })),
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: jest.fn(),
      withMongoRetry,
      isTransientMongoError: () => false,
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      CONTENT_ENTITLEMENT_SERVICE_KEYS: { SAJU: "saju" },
      CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER" },
      CONTENT_ENTITLEMENT_SOURCES: {
        COIN: "COIN",
        PASS: "PASS",
        MONTHLY: "MONTHLY",
        ADMIN: "ADMIN",
        BACKFILL: "BACKFILL",
      },
      CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE" },
      ContentEntitlement: { bulkWrite: entitlementBulkWrite, find: entitlementFind },
      Payment: { find: paymentFind },
      PointHistory: { find: pointHistoryFind },
      ProfileCard: { findOne: profileFindOne },
      SAJU_LOCKED_CONTENT_KEYS: {
        DAEUN_ANALYSIS: "saju.daewunAnalysis",
        FULL_READING: "saju.fullReading",
        COMPATIBILITY: "saju.compatibility",
      },
    })),
    jest.unstable_mockModule("../../worker/lib/content-unlocks.js", () => ({
      findActivePaidContentUnlock,
      getUnlockedContentSnapshot,
      upsertContentUnlock,
      isBirthScopedContentTarget: ({ featureKey = "", contentKey = "" } = {}) =>
        Object.values(BIRTH_FEATURE_BY_CONTENT_KEY).includes(featureKey) || Boolean(BIRTH_FEATURE_BY_CONTENT_KEY[contentKey]),
      resolveUnlockedFeatureKeyFromContentKey: (contentKey) => BIRTH_FEATURE_BY_CONTENT_KEY[contentKey] || "",
    })),
    jest.unstable_mockModule("../../worker/lib/birth-scoped-unlock-identity.js", () => ({
      resolveBirthUnlockIdentity,
      tryResolveBirthUnlockIdentity,
    })),
  ]);
  ({ handleAccessRoutes } = await import("../../worker/routes/access.js"));
  ({ createHttpError } = await import("../../worker/lib/http.js"));
});

function request(serviceKey = "saju,ziwei") {
  const url = new URL("https://example.com/api/access/unlocks");
  url.searchParams.set("profileId", TEST_PROFILE_ID);
  url.searchParams.set("serviceKey", serviceKey);
  return new Request(url, { method: "GET" });
}

function queryChain(rows) {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    select: () => chain,
    lean: async () => rows,
  };
  return chain;
}

beforeEach(() => {
  globalThis.__codeDestinyAccessUnlocksCache?.entries?.clear?.();
  requireUserFromRequest.mockResolvedValue({ userId: TEST_USER_ID });
  requireUserFromRequest.mockClear();
  withMongoRetry.mockClear();
  profileFindOne.mockReturnValue({
    select: () => ({
      lean: async () => ({ _id: "profile-doc", profileId: TEST_PROFILE_ID }),
    }),
  });
  getUnlockedContentSnapshot.mockResolvedValue({
    docs: [
      {
        serviceKey: "saju",
        contentKey: "saju.fullReading",
        source: "DIRECT_KRW",
        unlockedAt: new Date("2026-08-01T00:00:00.000Z"),
        expiresAt: null,
      },
      {
        serviceKey: "ziwei",
        contentKey: "ziwei.decadeLuck",
        source: "MONTHLY",
        unlockedAt: new Date("2026-08-01T00:00:00.000Z"),
        expiresAt: null,
      },
    ],
  });
  getUnlockedContentSnapshot.mockClear();
  findActivePaidContentUnlock.mockClear();
  upsertContentUnlock.mockReset();
  upsertContentUnlock.mockImplementation(async (input) => ({ _id: "ent-1", source: input.source, unlockedAt: input.unlockedAt }));
  findActivePaidContentUnlock.mockResolvedValue(null);
  resolveBirthUnlockIdentity.mockReset();
  resolveBirthUnlockIdentity.mockResolvedValue(BIRTH_IDENTITY);
  tryResolveBirthUnlockIdentity.mockReset();
  entitlementBulkWrite.mockReset();
  entitlementFind.mockReset();
  pointHistoryFind.mockReset();
  paymentFind.mockReset();
  entitlementBulkWrite.mockResolvedValue({ acknowledged: true });
  entitlementFind.mockReturnValue(queryChain([]));
  pointHistoryFind.mockReturnValue(queryChain([]));
  paymentFind.mockReturnValue(queryChain([]));
});

test("rejects legacy unlock reads without profileId before auth or DB lookup", async () => {
  const url = new URL("https://example.com/api/access/unlocks");
  url.searchParams.set("serviceKey", "ziwei,ad_free");
  url.searchParams.set("load_free", "1");

  const response = await handleAccessRoutes(new Request(url, { method: "GET" }), {});

  expect(response.status).toBe(403);
  expect(requireUserFromRequest).not.toHaveBeenCalled();
  expect(withMongoRetry).not.toHaveBeenCalled();
  expect(getUnlockedContentSnapshot).not.toHaveBeenCalled();
});

// 예전에는 요청 간 in-flight Promise 를 공유해 "동시 2건 → 스냅샷 조회 1회"를 고정했다. 그 공유가
// Cloudflare Workers 가 금지하는 패턴(다른 요청 컨텍스트의 continuation)이라 제거했다 — 위반하면
// 런타임이 취소해 그 요청이 op 타임아웃까지 끌려가 503 으로 죽는다. 재사용은 결과 TTL 캐시(15s)가
// 담당하며, 그건 Promise 가 아니라 데이터라 요청 간 공유가 합법이다.
test("a completed unlock snapshot read is reused from the result cache, not re-queried", async () => {
  const first = await handleAccessRoutes(request(), {});
  expect(first.status).toBe(200);
  const callsAfterFirst = getUnlockedContentSnapshot.mock.calls.length;

  const second = await handleAccessRoutes(request(), {});
  expect(second.status).toBe(200);
  expect(getUnlockedContentSnapshot).toHaveBeenCalledTimes(callsAfterFirst);
});

test("returns stale unlock snapshot instead of empty locks when DB lookup degrades", async () => {
  const first = await handleAccessRoutes(request(), {});
  expect(first.status).toBe(200);

  const cacheKey = `${TEST_USER_ID}::${TEST_PROFILE_ID}::saju,ziwei`;
  const entry = globalThis.__codeDestinyAccessUnlocksCache.entries.get(cacheKey);
  entry.expiresAt = 0;
  entry.staleUntil = Date.now() + 60_000;
  getUnlockedContentSnapshot.mockRejectedValueOnce(new Error("MongoPoolClearedError"));

  const second = await handleAccessRoutes(request(), {});
  const payload = await second.json();

  expect(second.status).toBe(200);
  expect(payload.degraded).toBe(true);
  expect(payload.unlockedContentKeys).toContain("saju.fullReading");
});

test("reads multiple service entitlements in one profile snapshot query", async () => {
  const response = await handleAccessRoutes(request(), {});
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("private");
  expect(response.headers.get("Cache-Control")).not.toContain("public");
  expect(getUnlockedContentSnapshot).toHaveBeenCalledTimes(1);
  expect(getUnlockedContentSnapshot).toHaveBeenCalledWith({
    userId: TEST_USER_ID,
    profileId: TEST_PROFILE_ID,
    serviceKeys: ["saju", "ziwei"],
  });
  expect(payload).toMatchObject({
    ok: true,
    profileId: TEST_PROFILE_ID,
    serviceKey: "saju,ziwei",
    serviceKeys: ["saju", "ziwei"],
    unlockedContentKeys: ["saju.fullReading", "ziwei.decadeLuck"],
  });
  expect(payload.unlocks["saju.fullReading"]).toMatchObject({ unlocked: true });
  expect(payload.unlocks["ziwei.decadeLuck"]).toMatchObject({ unlocked: true });
});

test("keeps the single-service response contract for legacy callers", async () => {
  getUnlockedContentSnapshot.mockResolvedValueOnce({ docs: [] });

  const response = await handleAccessRoutes(request("saju"), {});
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(getUnlockedContentSnapshot).toHaveBeenCalledWith({
    userId: TEST_USER_ID,
    profileId: TEST_PROFILE_ID,
    serviceKeys: ["saju"],
  });
  expect(payload).toMatchObject({
    ok: true,
    serviceKey: "saju",
    serviceKeys: ["saju"],
  });
  expect(Object.keys(payload.unlocks)).toEqual([
    "saju.daewunAnalysis",
    "saju.fullReading",
    "saju.compatibility",
  ]);
});

test("legacy backfill query flags remain read-only during an unlock snapshot", async () => {
  const backfillRequest = request("saju");
  const url = new URL(backfillRequest.url);
  url.searchParams.set("includeBackfill", "1");

  const response = await handleAccessRoutes(new Request(url, { method: "GET" }), {});
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  expect(pointHistoryFind).not.toHaveBeenCalled();
  expect(paymentFind).not.toHaveBeenCalled();
  expect(entitlementBulkWrite).not.toHaveBeenCalled();
});

function confirmRequest(body) {
  return new Request("https://example.com/api/access/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/access/confirm — birth-scoped keys", () => {
  test("admin grant of a birth-scoped key keeps the ownership check and writes with the BIRTH identity", async () => {
    requireUserFromRequest.mockResolvedValue({ userId: TEST_USER_ID, role: "admin" });

    const response = await handleAccessRoutes(confirmRequest({
      profileId: TEST_PROFILE_ID,
      contentKey: "saju.daewunAnalysis",
      source: "admin",
    }), {});

    expect(response.status).toBe(200);
    expect(profileFindOne).toHaveBeenCalledWith({ userId: TEST_USER_ID, profileId: TEST_PROFILE_ID });
    expect(resolveBirthUnlockIdentity).toHaveBeenCalledWith(expect.objectContaining({
      userId: TEST_USER_ID,
      profileId: TEST_PROFILE_ID,
      featureKey: "section_daewun",
    }));
    expect(findActivePaidContentUnlock).toHaveBeenCalledWith(expect.objectContaining({ birthIdentity: BIRTH_IDENTITY }));
    expect(upsertContentUnlock).toHaveBeenCalledTimes(1);
    expect(upsertContentUnlock).toHaveBeenCalledWith(expect.objectContaining({
      featureKey: "section_daewun",
      birthIdentity: BIRTH_IDENTITY,
      source: "ADMIN",
    }));
  });

  test("an unresolvable birth identity rejects with requiresProfile and never writes", async () => {
    requireUserFromRequest.mockResolvedValue({ userId: TEST_USER_ID, role: "admin" });
    resolveBirthUnlockIdentity.mockRejectedValueOnce(createHttpError(403, "Profile is not owned.", {
      code: "INVALID_PROFILE",
      reason: "INVALID_PROFILE",
      requiresProfile: true,
    }));

    const response = await handleAccessRoutes(confirmRequest({
      profileId: TEST_PROFILE_ID,
      featureKey: "section_compat",
      partnerProfileId: "someone-else",
      source: "admin",
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ code: "INVALID_PROFILE", requiresProfile: true });
    expect(resolveBirthUnlockIdentity).toHaveBeenCalledWith(expect.objectContaining({
      featureKey: "section_compat",
      partnerProfileId: "someone-else",
    }));
    expect(upsertContentUnlock).not.toHaveBeenCalled();
  });

  test("a missing profileId is rejected before any identity lookup or write", async () => {
    requireUserFromRequest.mockResolvedValue({ userId: TEST_USER_ID, role: "admin" });

    const response = await handleAccessRoutes(confirmRequest({ contentKey: "saju.daewunAnalysis", source: "admin" }), {});

    expect(response.status).toBe(403);
    expect(resolveBirthUnlockIdentity).not.toHaveBeenCalled();
    expect(upsertContentUnlock).not.toHaveBeenCalled();
  });
});
