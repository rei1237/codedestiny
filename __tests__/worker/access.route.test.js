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

let handleAccessRoutes;

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
    })),
  ]);
  ({ handleAccessRoutes } = await import("../../worker/routes/access.js"));
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
  upsertContentUnlock.mockClear();
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
