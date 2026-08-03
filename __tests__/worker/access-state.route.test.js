/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";

const TEST_USER_ID = "507f1f77bcf86cd799439011";
const requireUserFromRequest = jest.fn();
const peekAccessTokenUserId = jest.fn();
const pointHistoryDistinct = jest.fn();
const getUnlockedContentSnapshot = jest.fn();
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
      peekAccessTokenUserId,
      isAuthDbInfraError: () => false,
    })),
    jest.unstable_mockModule("../../worker/lib/profile-limits.js", () => ({
      resolveActivePassPolicy,
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      PointHistory: { distinct: pointHistoryDistinct },
    })),
    jest.unstable_mockModule("../../worker/lib/content-unlocks.js", () => ({
      getUnlockedContentSnapshot,
      isProfileScopedContentUnlockFeatureKey: (key) => ["section_daewun", "section_summary", "section_compat"].includes(String(key || "")),
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
  peekAccessTokenUserId.mockClear();
  peekAccessTokenUserId.mockResolvedValue(TEST_USER_ID);
  pointHistoryDistinct.mockReset();
  pointHistoryDistinct.mockResolvedValue(["section_summary"]);
  getUnlockedContentSnapshot.mockReset();
  getUnlockedContentSnapshot.mockResolvedValue({
    docs: [{ contentKey: "saju.compatibility", profileId: "profile-main", updatedAt: "2029-01-01T00:00:00.000Z" }],
    featureKeys: ["section_compat"],
    contentKeys: ["saju.compatibility"],
    unlockMap: { section_compat: true },
    entitlementsByProfile: {
      "profile-main": [{ contentKey: "saju.compatibility", featureKey: "section_compat", serviceKey: "saju", source: "PAYMENT", expiresAt: null }],
    },
    profileScopedAuthoritative: true,
  });
  requireUserFromRequest.mockResolvedValue({
    userId: TEST_USER_ID,
    authUserDoc: {
      _id: TEST_USER_ID,
      points: 42,
      unlockedFeatures: ["premium-sibyl-dominator"],
      paidFeatures: ["account-purchase", "section_daewun"],
      destinyProfilesCurrentId: "profile-main",
      profileSubscription: { tier: "premium", profileLimit: 7, membershipCreditBalance: 250 },
    },
  });
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
    profileCount: null,
    profileCountDeferred: true,
    maxProfileCount: 7,
    currentProfileId: "profile-main",
    unlockedFeatureIds: ["premium-sibyl-dominator", "section_compat"],
    ownedProductIds: ["account-purchase", "section_daewun", "section_compat"],
    lockMap: {
      "premium-sibyl-dominator": false,
      section_compat: false,
    },
    source: "db",
  });
  expect(payload.data.entitlementSnapshot).toMatchObject({
    userId: TEST_USER_ID,
    tier: "premium",
    unlockedFeatureIds: ["premium-sibyl-dominator", "section_compat"],
    monthlyBalance: { remaining: 250 },
    purchasePolicyVersion: "access-state-snapshot-v2",
    completeness: "full",
    authority: "server",
    source: "db",
  });
  expect(payload.data.entitlementSnapshot.unlockedFeatureIds).toEqual([
    "premium-sibyl-dominator",
    "section_compat",
  ]);
  expect(payload.data.profileEntitlements["profile-main"][0]).toMatchObject({ featureKey: "section_compat" });
  expect(getUnlockedContentSnapshot).toHaveBeenCalledWith({
    userId: TEST_USER_ID,
    profileId: "profile-main",
  });
  expect(payload.data.expiresAt).toBeTruthy();
  expect(payload.data.staleUntil).toBeTruthy();
  expect(payload.data.graceUntil).toBeTruthy();
  expect(response.headers.get("ETag")).toBeTruthy();
  expect(payload.data.profileScopedAuthoritative).toBe(true);
  expect(payload.data.unlockedContentKeys).toEqual(["saju.compatibility"]);
  expect(getUnlockedContentSnapshot).toHaveBeenCalledTimes(1);
  expect(pointHistoryDistinct).not.toHaveBeenCalled();
});

test("keeps the production access-state route enabled by default", async () => {
  const response = await handleAccessStateRoutes(request(), { NODE_ENV: "production" });

  expect(response.status).toBe(200);
  expect(requireUserFromRequest).toHaveBeenCalledTimes(1);
});

test("allows an explicit emergency disable for the access-state route", async () => {
  const response = await handleAccessStateRoutes(request(), {
    NODE_ENV: "production",
    ACCESS_STATE_ENABLED: "false",
  });

  expect(response.status).toBe(404);
});

test("serves repeated access-state requests without a separate profile count query", async () => {
  const first = handleAccessStateRoutes(request(), {});
  const second = handleAccessStateRoutes(request(), {});
  await Promise.all([first, second]);
  expect(requireUserFromRequest).toHaveBeenCalledTimes(2);
});

test("isolates complete access snapshots by selected profile", async () => {
  const first = await handleAccessStateRoutes(request(), {});
  expect((await first.json()).data.unlockedFeatureIds).toContain("section_compat");

  requireUserFromRequest.mockResolvedValue({
    userId: TEST_USER_ID,
    authUserDoc: {
      _id: TEST_USER_ID,
      unlockedFeatures: ["fpti-premium-report"],
      destinyProfilesCurrentId: "profile-other",
      profileSubscription: { tier: "premium", profileLimit: 7, membershipCreditBalance: 250 },
    },
  });
  pointHistoryDistinct.mockResolvedValueOnce([]);
  getUnlockedContentSnapshot.mockResolvedValueOnce({
    featureKeys: ["section_daewun"],
    contentKeys: ["saju.daeunAnalysis"],
    unlockMap: { section_daewun: true },
    profileScopedAuthoritative: true,
  });

  const second = await handleAccessStateRoutes(request(), {});
  const secondPayload = await second.json();
  expect(secondPayload.data.currentProfileId).toBe("profile-other");
  expect(secondPayload.data.unlockedFeatureIds).toContain("section_daewun");
  expect(secondPayload.data.unlockedFeatureIds).not.toContain("section_compat");
  expect(getUnlockedContentSnapshot).toHaveBeenCalledTimes(2);
});

test("requested profile takes precedence over the stored previous profile", async () => {
  const response = await handleAccessStateRoutes(new Request(
    "https://example.com/api/me/access-state?profileId=profile-requested",
    { method: "GET" },
  ), {});
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.data.currentProfileId).toBe("profile-requested");
  expect(getUnlockedContentSnapshot).toHaveBeenCalledWith({
    userId: TEST_USER_ID,
    profileId: "profile-requested",
  });
});

test("returns a degraded 200 for an authenticated access-state database timeout", async () => {
  requireUserFromRequest.mockRejectedValueOnce(new Error("MongoDB operation timed out in Worker"));

  const response = await handleAccessStateRoutes(request(), {});
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.code).toBe("ACCESS_STATE_TIMEOUT");
  expect(payload.degraded).toBe(true);
  expect(payload.data.authority).toBe("none");
});

test("keeps stale access-state snapshot when refresh hits a transient 503", async () => {
  const first = await handleAccessStateRoutes(request(), {});
  expect(first.status).toBe(200);

  const entry = globalThis.__codeDestinyAccessStateCache.entries.get(`${TEST_USER_ID}::profile-main`);
  entry.expiresAt = 0;
  entry.staleUntil = Date.now() + 60_000;
  requireUserFromRequest.mockRejectedValueOnce(new Error("MongoDB operation timed out in Worker"));

  const second = await handleAccessStateRoutes(request(), {});
  const payload = await second.json();

  expect(second.status).toBe(200);
  expect(payload.degraded).toBe(true);
  expect(payload.data.entitlementSnapshot.tier).toBe("premium");
});

test("returns 304 for a matching private entitlement version", async () => {
  const first = await handleAccessStateRoutes(request(), {});
  const etag = first.headers.get("ETag");
  const conditionalRequest = new Request("https://example.com/api/me/access-state", {
    method: "GET",
    headers: { "If-None-Match": etag },
  });
  const second = await handleAccessStateRoutes(conditionalRequest, {});

  expect(second.status).toBe(304);
  expect(second.headers.get("Cache-Control")).toContain("private");
  expect(second.headers.get("Cache-Control")).not.toContain("public");
});
