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
const paymentFindOne = jest.fn();
const pointHistoryFind = jest.fn();
const isTransientMongoError = jest.fn(() => false);
const isAuthDbInfraError = jest.fn(() => false);

let handleAccessRoutes;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireUserFromRequest,
      isAuthDbInfraError,
    })),
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: jest.fn(),
      withMongoRetry,
      isTransientMongoError,
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
      Payment: { findOne: paymentFindOne },
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

function request(serviceKey = "saju,ziwei", options = {}) {
  const url = new URL("https://example.com/api/access/unlocks");
  url.searchParams.set("profileId", TEST_PROFILE_ID);
  url.searchParams.set("serviceKey", serviceKey);
  if (options.includeBackfill) url.searchParams.set("includeBackfill", "1");
  const headers = options.headers || undefined;
  return new Request(url, { method: "GET", headers });
}

beforeEach(() => {
  requireUserFromRequest.mockResolvedValue({ userId: TEST_USER_ID });
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
  paymentFindOne.mockClear();
  pointHistoryFind.mockClear();
  isTransientMongoError.mockReset().mockReturnValue(false);
  isAuthDbInfraError.mockReset().mockReturnValue(false);
});

test("reads multiple service entitlements in one profile snapshot query", async () => {
  const response = await handleAccessRoutes(request(), {});
  const payload = await response.json();

  expect(response.status).toBe(200);
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
test("keeps GET unlock lookup read-only when includeBackfill is present", async () => {
  getUnlockedContentSnapshot.mockResolvedValueOnce({ docs: [] });
  pointHistoryFind.mockReturnValue({
    sort: () => ({
      limit: () => ({
        lean: async () => [],
      }),
    }),
  });

  const response = await handleAccessRoutes(request("saju", { includeBackfill: true }), {});
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload).toMatchObject({ ok: true, serviceKey: "saju", serviceKeys: ["saju"] });
  expect(getUnlockedContentSnapshot).toHaveBeenCalledTimes(1);
  expect(pointHistoryFind).not.toHaveBeenCalled();
  expect(paymentFindOne).not.toHaveBeenCalled();
  expect(upsertContentUnlock).not.toHaveBeenCalled();
});

test("reports transient Mongo lookup failure without treating it as no unlocks", async () => {
  isTransientMongoError.mockReturnValueOnce(true);
  getUnlockedContentSnapshot.mockRejectedValueOnce(Object.assign(new Error("server selection timeout"), {
    name: "MongoServerSelectionError",
  }));

  const response = await handleAccessRoutes(request("saju", {
    headers: { "x-request-id": "test-access-request" },
  }), {});
  const payload = await response.json();

  expect(response.status).toBe(503);
  expect(payload).toMatchObject({
    ok: false,
    retryable: true,
    code: "ACCESS_LOOKUP_TEMPORARILY_UNAVAILABLE",
    requestId: "test-access-request",
  });
  expect(payload.unlocks).toBeUndefined();
});
