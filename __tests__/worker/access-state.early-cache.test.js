/**
 * @jest-environment node
 *
 * GET /api/me/access-state 의 **조기 스냅샷 조회** 동작 계약.
 *
 * 정적 가드(scripts/verify-access-state-cache-order.mjs)는 조회가 인증보다 앞인지, 탈퇴 무효화가
 * 배선돼 있는지만 본다. 여기서는 실제로 라우트를 태워서, 틀렸을 때 실제로 일어나는 일을 막는다:
 *   · 히트인데도 Mongo 인증 왕복을 계속 내는 것(= 최적화가 죽은 것)
 *   · profileId 없는 요청이 아이솔레이트 로컬 폴백으로 **다른 프로필** 스냅샷을 받는 것
 *   · 결제 직후 강제 새로고침이 옛 스냅샷을 그대로 받는 것
 *   · 조기 히트만 ETag/Cache-Control 계약이 달라지는 것
 *   · 탈퇴 뒤에도 유효한 이용권 스냅샷이 계속 나가는 것
 */

import { jest } from "@jest/globals";

const USER_A = "507f1f77bcf86cd799439011";
const USER_B = "507f1f77bcf86cd799439022";

const requireUserFromRequest = jest.fn();
const peekAccessTokenUserId = jest.fn();
const pointHistoryDistinct = jest.fn();
const getUnlockedContentSnapshot = jest.fn();
const buildGuardianFortuneUsageStatus = jest.fn();
const createMongoGuardianFortuneStore = jest.fn(() => ({ kind: "mock-guardian" }));
const resolveActivePassPolicy = jest.fn(() => ({
  isActive: true,
  tier: "premium",
  passTier: "premium",
  expiresAt: "2030-01-01T00:00:00.000Z",
  profileLimit: 7,
}));

let handleAccessStateRoutes;
let invalidateAccessStateCacheForUser;
let CREDENTIAL_CACHE_REFRESH_HEADER;

beforeAll(async () => {
  const actualProfileLimits = await import("../../worker/lib/profile-limits.js");
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireUserFromRequest,
      peekAccessTokenUserId,
      isAuthDbInfraError: () => false,
    })),
    jest.unstable_mockModule("../../worker/lib/profile-limits.js", () => ({
      ...actualProfileLimits,
      resolveActivePassPolicy,
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      IdempotencyKey: {},
      RESTORE_CREDENTIAL_CAP: 10,
      PointHistory: { distinct: pointHistoryDistinct },
    })),
    jest.unstable_mockModule("../../worker/lib/content-unlocks.js", () => ({
      getUnlockedContentSnapshot,
      isProfileScopedContentUnlockFeatureKey: (key) => ["section_daewun", "section_summary", "section_compat"].includes(String(key || "")),
    })),
    jest.unstable_mockModule("../../worker/lib/guardian-fortune-usage.js", () => ({
      buildGuardianFortuneUsageStatus,
      createMongoGuardianFortuneStore,
      getGuardianFortuneDateKey: () => "2026-08-05",
      isGuardianFortuneApiEnabled: () => false,
    })),
  ]);
  ({ handleAccessStateRoutes } = await import("../../worker/routes/access-state.js"));
  ({ invalidateAccessStateCacheForUser } = await import("../../worker/lib/access-state.js"));
  ({ CREDENTIAL_CACHE_REFRESH_HEADER } = await import("../../worker/lib/credential-scoped-cache.js"));
});

function userDoc(userId, currentProfileId) {
  return {
    _id: userId,
    points: 42,
    unlockedFeatures: [],
    paidFeatures: [],
    destinyProfilesCurrentId: currentProfileId,
    profileSubscription: { tier: "premium", profileLimit: 7, membershipCreditBalance: 250 },
  };
}

function useUser(userId, currentProfileId = "profile-main") {
  peekAccessTokenUserId.mockResolvedValue(userId);
  requireUserFromRequest.mockResolvedValue({ userId, authUserDoc: userDoc(userId, currentProfileId) });
}

function req(query = "", headers = {}) {
  return new Request(`https://example.com/api/me/access-state${query}`, { method: "GET", headers });
}

beforeEach(() => {
  requireUserFromRequest.mockClear();
  peekAccessTokenUserId.mockClear();
  pointHistoryDistinct.mockReset();
  pointHistoryDistinct.mockResolvedValue([]);
  getUnlockedContentSnapshot.mockReset();
  getUnlockedContentSnapshot.mockResolvedValue({
    docs: [],
    featureKeys: [],
    contentKeys: [],
    unlockMap: {},
    entitlementsByProfile: {},
    profileScopedAuthoritative: true,
  });
  buildGuardianFortuneUsageStatus.mockReset();
  useUser(USER_A);
  invalidateAccessStateCacheForUser(USER_A);
  invalidateAccessStateCacheForUser(USER_B);
});

test("🔴 profileId 가 실린 두 번째 요청은 인증 DB 왕복을 아예 타지 않는다", async () => {
  const first = await handleAccessStateRoutes(req("?profileId=profile-main"), {});
  const second = await handleAccessStateRoutes(req("?profileId=profile-main"), {});

  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  // 이 한 줄이 최적화 그 자체다. 조회가 인증 뒤로 되돌아가면 2가 된다.
  expect(requireUserFromRequest).toHaveBeenCalledTimes(1);
  expect((await second.json()).data.userId).toBe(USER_A);
});

test("🔴 profileId 없는 요청은 조기 경로를 타지 않는다(아이솔레이트 로컬 폴백 금지)", async () => {
  await handleAccessStateRoutes(req("?profileId=profile-main"), {});
  requireUserFromRequest.mockClear();

  // 같은 사용자지만 profileId 를 안 실었다. 현재 프로필의 정본은 DB(destinyProfilesCurrentId)이므로
  // 반드시 인증을 타야 한다 — 안 그러면 다른 아이솔레이트에서 카드를 바꾼 사용자가 옛 스냅샷을 받는다.
  await handleAccessStateRoutes(req(""), {});
  expect(requireUserFromRequest).toHaveBeenCalledTimes(1);
});

test("🔴 강제 새로고침 헤더는 조기 캐시를 건너뛰고 비운다(결제 직후 정합성)", async () => {
  await handleAccessStateRoutes(req("?profileId=profile-main"), {});
  requireUserFromRequest.mockClear();

  // 결제가 일어났다고 치고 서버 값을 바꾼다.
  requireUserFromRequest.mockResolvedValue({
    userId: USER_A,
    authUserDoc: { ...userDoc(USER_A, "profile-main"), points: 999 },
  });

  const refreshed = await handleAccessStateRoutes(
    req("?profileId=profile-main", { [CREDENTIAL_CACHE_REFRESH_HEADER]: "1" }),
    {},
  );
  expect(refreshed.status).toBe(200);
  expect(requireUserFromRequest).toHaveBeenCalledTimes(1);
  expect((await refreshed.json()).data.coinBalance).toBe(999);

  // 새로 채운 값이 남는다 — 옛 항목이 되살아나면 여기서 42 가 돌아온다.
  requireUserFromRequest.mockClear();
  const next = await handleAccessStateRoutes(req("?profileId=profile-main"), {});
  expect(requireUserFromRequest).toHaveBeenCalledTimes(0);
  expect((await next.json()).data.coinBalance).toBe(999);
});

test("🔴 조기 히트도 ETag·Cache-Control 이 미스와 바이트 동일하고 304 를 낸다", async () => {
  const miss = await handleAccessStateRoutes(req("?profileId=profile-main"), {});
  const hit = await handleAccessStateRoutes(req("?profileId=profile-main"), {});

  expect(hit.headers.get("ETag")).toBe(miss.headers.get("ETag"));
  expect(hit.headers.get("Cache-Control")).toBe(miss.headers.get("Cache-Control"));
  expect(hit.headers.get("Cache-Control")).toBe("private, max-age=60, stale-while-revalidate=1800");
  expect(hit.headers.get("Last-Modified")).toBe(miss.headers.get("Last-Modified"));

  const notModified = await handleAccessStateRoutes(
    req("?profileId=profile-main", { "If-None-Match": miss.headers.get("ETag") }),
    {},
  );
  expect(notModified.status).toBe(304);
});

test("🔴 조기 히트가 다른 사용자의 스냅샷을 절대 주지 않는다", async () => {
  await handleAccessStateRoutes(req("?profileId=profile-main"), {});

  useUser(USER_B);
  const other = await handleAccessStateRoutes(req("?profileId=profile-main"), {});

  expect((await other.json()).data.userId).toBe(USER_B);
  expect(requireUserFromRequest).toHaveBeenCalledTimes(2);
});

test("🔴 탈퇴 무효화 뒤에는 조기 히트가 사라지고 다시 인증을 탄다", async () => {
  await handleAccessStateRoutes(req("?profileId=profile-main"), {});
  requireUserFromRequest.mockClear();

  // worker/routes/auth.js 의 handleWithdraw 가 하는 일. 이 호출이 없으면 탈퇴한 계정이
  // 캐시 TTL 동안 유효한 이용권 스냅샷을 계속 받는다.
  invalidateAccessStateCacheForUser(USER_A);

  await handleAccessStateRoutes(req("?profileId=profile-main"), {});
  expect(requireUserFromRequest).toHaveBeenCalledTimes(1);
});
