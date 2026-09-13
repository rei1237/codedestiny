/**
 * @jest-environment node
 */

const { readFileSync } = require("node:fs");
const path = require("node:path");

let buildAccessState;
let invalidateAccessStateCacheForUser;
let readAccessStateCache;
let writeAccessStateCache;

beforeAll(async () => {
  ({
    buildAccessState,
    invalidateAccessStateCacheForUser,
    readAccessStateCache,
    writeAccessStateCache,
  } = await import("../../worker/lib/access-state.js"));
});

test("stale access state is explicitly marked and never changes the paid gate", () => {
  const userId = "507f1f77bcf86cd799439012";
  const state = buildAccessState({
    userId,
    user: {
      points: 10,
      activeEntitlement: {
        isActive: true,
        tier: "standard",
        profileLimit: 3,
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
    },
    profileCount: 1,
  });

  writeAccessStateCache(userId, state);
  const stale = readAccessStateCache(userId, { allowStale: true });

  expect(stale?.source).toBe("cache");
  expect(stale?.hasActivePass).toBe(true);
  expect(stale).not.toHaveProperty("canUsePaidFeature");
  invalidateAccessStateCacheForUser(userId);
});

test("access-state preserves zero balance and inactive entitlement", () => {
  const state = buildAccessState({
    userId: "507f1f77bcf86cd799439013",
    user: { points: 0, activeEntitlement: { isActive: false, tier: "free" } },
    profileCount: 0,
  });

  expect(state.coinBalance).toBe(0);
  expect(state.hasActivePass).toBe(false);
  expect(state.maxProfileCount).toBe(1);
});

test("access-state merges profile entitlements and product ownership into one snapshot", () => {
  const state = buildAccessState({
    userId: "507f1f77bcf86cd799439014",
    user: {
      paidFeatures: ["owned-product"],
      unlockedFeatures: ["legacy-unlock"],
      destinyProfilesCurrentId: "profile-main",
      activeEntitlement: { isActive: false, tier: "free" },
    },
    contentSnapshot: {
      featureKeys: ["section_summary"],
      entitlementVersion: "2029-01-01T00:00:00.000Z",
      entitlementsByProfile: {
        "profile-main": [{ featureKey: "section_summary", contentKey: "saju.fullReading" }],
      },
    },
  });

  expect(state.unlockMap).toEqual({
    "legacy-unlock": true,
    "owned-product": true,
    section_summary: true,
  });
  expect(state.lockMap).toEqual({
    "legacy-unlock": false,
    "owned-product": false,
    section_summary: false,
  });
  expect(state.ownedProductIds).toEqual(["owned-product", "section_summary"]);
  expect(state.profileEntitlements["profile-main"]).toHaveLength(1);
  expect(state.versions.entitlementVersion).toContain("profile-main");
});

test("access-state carries each unlock's provenance, and a permanent grant beats an expiring duplicate", () => {
  const state = buildAccessState({
    userId: "507f1f77bcf86cd799439016",
    user: { activeEntitlement: { isActive: false, tier: "free" } },
    contentSnapshot: {
      featureKeys: ["section_summary", "deep_reading"],
      docs: [
        {
          featureKey: "section_summary",
          source: "pass",
          grantType: "pass_included",
          passId: "membership:standard:req-1",
          expiresAt: "2030-01-01T00:00:00.000Z",
        },
        // 같은 해금에 영구 문서가 하나라도 있으면 영구다 — 산 사람을 잠그지 않는다.
        { featureKey: "section_summary", source: "COIN", grantType: "permanent_unlock" },
        { featureKey: "deep_reading", source: "PASS", grantType: "pass_included", expiresAt: "2030-06-01T00:00:00.000Z" },
      ],
    },
  });

  const grants = Object.fromEntries((state.unlockedFeatureGrants || []).map((grant) => [grant.featureKey, grant]));
  expect(grants.section_summary).toMatchObject({ source: "COIN", expiresAt: null });
  expect(grants.deep_reading).toMatchObject({ source: "PASS", expiresAt: "2030-06-01T00:00:00.000Z" });
  // 근거는 덧붙이기만 한다 — 평탄한 문자열 배열을 객체로 바꾸면 읽는 쪽 14곳이 조용히 잠근다.
  expect(state.unlockedFeatures.every((key) => typeof key === "string")).toBe(true);
});

// 근거는 DB projection 이 실어 주지 않으면 조용히 사라진다 — buildAccessState 만 봐서는 안 보인다.
test("the unlock projection still selects every field the grants contract reads", () => {
  const source = readFileSync(path.join(__dirname, "../../worker/lib/content-unlocks.js"), "utf8");
  const select = source.match(/\.select\("([^"]*featureKey[^"]*)"\)/)?.[1] || "";
  for (const field of ["featureKey", "source", "grantType", "passId", "expiresAt", "grantedAt"]) {
    expect(select.split(/\s+/)).toContain(field);
  }
});

test("cache invalidation clears every profile snapshot and the legacy unlock read cache for one user", () => {
  const userId = "507f1f77bcf86cd799439014";
  const otherUserId = "507f1f77bcf86cd799439015";
  const stateA = buildAccessState({ userId, profileId: "profile-a", user: { unlockedFeatures: ["feature-a"] } });
  const stateB = buildAccessState({ userId, profileId: "profile-b", user: { unlockedFeatures: ["feature-b"] } });
  writeAccessStateCache(userId, stateA, { profileId: "profile-a" });
  writeAccessStateCache(userId, stateB, { profileId: "profile-b" });
  globalThis.__codeDestinyAccessUnlocksCache = {
    entries: new Map([
      [`${userId}::profile-a::saju`, { payload: {} }],
      [`${otherUserId}::profile-a::saju`, { payload: {} }],
    ]),
  };

  invalidateAccessStateCacheForUser(userId);

  expect(readAccessStateCache(userId, { profileId: "profile-a" })).toBeNull();
  expect(readAccessStateCache(userId, { profileId: "profile-b" })).toBeNull();
  expect(globalThis.__codeDestinyAccessUnlocksCache.entries.has(`${userId}::profile-a::saju`)).toBe(false);
  expect(globalThis.__codeDestinyAccessUnlocksCache.entries.has(`${otherUserId}::profile-a::saju`)).toBe(true);
});
