/**
 * @jest-environment node
 */

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
