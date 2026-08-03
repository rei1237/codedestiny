/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";

const TEST_USER_ID = "507f1f77bcf86cd799439011";
const requireUserFromRequest = jest.fn();
const countDocuments = jest.fn();
const withMongoRetry = jest.fn(async (_env, operation) => operation());
const resolveActivePassPolicy = jest.fn(() => ({
  isActive: true,
  tier: "premium",
  passTier: "premium",
  expiresAt: "2030-01-01T00:00:00.000Z",
  profileLimit: 7,
}));

let handleAccessStateRoutes;
let invalidateAccessStateCacheForUser;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireUserFromRequest,
      isAuthDbInfraError: () => false,
    })),
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      withMongoRetry,
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      ProfileCard: { countDocuments },
    })),
    jest.unstable_mockModule("../../worker/lib/profile-limits.js", () => ({
      resolveActivePassPolicy,
    })),
  ]);
  ({ handleAccessStateRoutes } = await import("../../worker/routes/access-state.js"));
  ({ invalidateAccessStateCacheForUser } = await import("../../worker/lib/access-state.js"));
});

function request() {
  return new Request("https://example.com/api/me/access-state", { method: "GET" });
}

beforeEach(() => {
  requireUserFromRequest.mockClear();
  countDocuments.mockClear();
  requireUserFromRequest.mockResolvedValue({
    userId: TEST_USER_ID,
    authUserDoc: {
      _id: TEST_USER_ID,
      points: 42,
      unlockedFeatures: ["fpti-premium-report"],
      destinyProfilesCurrentId: "profile-main",
      profileSubscription: { tier: "premium", profileLimit: 7, membershipCreditBalance: 250 },
    },
  });
  countDocuments.mockResolvedValue(2);
  invalidateAccessStateCacheForUser(TEST_USER_ID);
});

test("returns the authoritative access state without calling payment providers", async () => {
  const response = await handleAccessStateRoutes(request(), {});
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("private");
  expect(response.headers.get("Cache-Control")).not.toContain("public");
  expect(payload.ok).toBe(true);
  expect(payload.data).toMatchObject({
    userId: TEST_USER_ID,
    hasActivePass: true,
    passType: "premium",
    coinBalance: 42,
    monthlyStoneBalance: 250,
    profileCount: 2,
    maxProfileCount: 7,
    currentProfileId: "profile-main",
    source: "db",
  });
  expect(payload.data.entitlementSnapshot).toMatchObject({
    userId: TEST_USER_ID,
    tier: "premium",
    unlockedFeatureIds: ["fpti-premium-report"],
    monthlyBalance: { remaining: 250 },
    purchasePolicyVersion: "access-state-snapshot-v1",
    source: "db",
  });
  expect(payload.data.expiresAt).toBeTruthy();
  expect(payload.data.staleUntil).toBeTruthy();
});

test("keeps the production access-state route disabled unless explicitly enabled", async () => {
  const response = await handleAccessStateRoutes(request(), { NODE_ENV: "production" });

  expect(response.status).toBe(404);
  expect(requireUserFromRequest).not.toHaveBeenCalled();
});

test("allows the production access-state route when explicitly enabled", async () => {
  const response = await handleAccessStateRoutes(request(), {
    NODE_ENV: "production",
    ACCESS_STATE_ENABLED: "true",
  });

  expect(response.status).toBe(200);
});

test("joins concurrent access-state requests into one profile count query", async () => {
  let release;
  countDocuments.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));

  const first = handleAccessStateRoutes(request(), {});
  const second = handleAccessStateRoutes(request(), {});
  await new Promise((resolve) => setTimeout(resolve, 0));
  release(3);
  await Promise.all([first, second]);

  expect(countDocuments).toHaveBeenCalledTimes(1);
});

test("returns 504 for an access-state database timeout", async () => {
  countDocuments.mockRejectedValueOnce(new Error("MongoDB operation timed out in Worker"));

  const response = await handleAccessStateRoutes(request(), {});
  const payload = await response.json();

  expect(response.status).toBe(504);
  expect(payload.code).toBe("ACCESS_STATE_TIMEOUT");
  expect(payload.retryable).toBe(true);
});

test("keeps stale access-state snapshot when refresh hits a transient 503", async () => {
  const first = await handleAccessStateRoutes(request(), {});
  expect(first.status).toBe(200);

  const entry = globalThis.__codeDestinyAccessStateCache.entries.get(TEST_USER_ID);
  entry.expiresAt = 0;
  entry.staleUntil = Date.now() + 60_000;
  countDocuments.mockRejectedValueOnce(new Error("MongoDB operation timed out in Worker"));

  const second = await handleAccessStateRoutes(request(), {});
  const payload = await second.json();

  expect(second.status).toBe(200);
  expect(payload.degraded).toBe(true);
  expect(payload.data.entitlementSnapshot.tier).toBe("premium");
});
