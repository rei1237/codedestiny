/**
 * @jest-environment node
 */

import { jest } from "@jest/globals";

const TEST_USER_ID = "507f1f77bcf86cd799439011";
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

beforeAll(async () => {
  // 🔴 profile-limits 는 **부분** 모킹이다 — 스텁하려는 것은 resolveActivePassPolicy 하나뿐이고
  //    나머지 export(상수·정규화 함수)는 진짜를 그대로 쓴다. 옛 코드는 스텁만 담은 객체를
  //    돌려주어, access-state.js 가 이 모듈에서 상수를 하나만 더 가져와도 "export 가 없다"로
  //    스위트 전체가 죽었다(2026-08-24 passUsage 추가에서 실제로 그랬다).
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
      isGuardianFortuneApiEnabled: (env = {}) => env.ENABLE_GUARDIAN_FORTUNE_API === true,
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
  buildGuardianFortuneUsageStatus.mockReset();
  buildGuardianFortuneUsageStatus.mockResolvedValue({
    isLoggedIn: true,
    dailyFreeLimit: 3,
    dailyFreeUsed: 1,
    dailyFreeRemaining: 2,
    paidCreditsRemaining: 4,
    canGenerate: true,
    generationSource: "daily_free",
    nextAction: "generate",
  });
  createMongoGuardianFortuneStore.mockClear();
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

// 🔴 예전에는 "50 동시 요청이 auth 조회 1회로 합쳐진다"(요청 간 in-flight Promise 공유)를 고정했다.
// 그 공유가 바로 Cloudflare Workers 가 금지하는 패턴이라 제거했다 — 런타임이 다른 요청 컨텍스트의
// continuation 을 취소해 그 요청이 op 타임아웃까지 끌려가 503 으로 죽는다(worker/routes/access-state.js
// 주석 참고). 정리(clear)가 finally 에 있어 클라이언트 abort 시 죽은 Promise 가 맵에 남는 고장도 있었다.
//
// 잃은 것은 크지 않다. 한 브라우저에서 오는 동시 중복은 이미 클라이언트 3중 dedup 이 막는다
// (js/core/access-store.js inFlight · app/_lib/user-session-cache.ts inFlight · auth-client.ts GET dedup).
// 서버 공유가 실제로 합치던 것은 '같은 사용자의 서로 다른 브라우저/탭' 뿐이고, 그건 드물다.
//
// 이제 고정하는 것: 동시 요청이 **각자 독립적으로** 풀려도 전부 올바른 응답을 받는다.
test("concurrent requests each resolve independently and correctly", async () => {
  let releaseAuth;
  requireUserFromRequest.mockImplementationOnce(() => new Promise((resolve) => { releaseAuth = resolve; }));
  const requests = Array.from({ length: 50 }, () => handleAccessStateRoutes(request(), {}));
  await Promise.resolve();
  releaseAuth({
    userId: TEST_USER_ID,
    authUserDoc: {
      _id: TEST_USER_ID,
      points: 42,
      destinyProfilesCurrentId: "profile-main",
      profileSubscription: { tier: "premium", profileLimit: 7, membershipCreditBalance: 250 },
    },
  });
  const responses = await Promise.all(requests);
  const payloads = await Promise.all(responses.map((response) => response.json()));

  expect(responses.every((response) => response.status === 200)).toBe(true);
  expect(payloads.every((payload) => payload.data.userId === TEST_USER_ID)).toBe(true);
  // 결과 TTL 캐시(60s)는 Promise 가 아니라 데이터라 그대로 살아 있다 — 버스트가 끝난 뒤의
  // 후속 요청은 DB 를 다시 읽지 않아야 한다.
  const callsAfterBurst = getUnlockedContentSnapshot.mock.calls.length;
  const followUp = await handleAccessStateRoutes(request(), {});
  expect(followUp.status).toBe(200);
  expect(getUnlockedContentSnapshot).toHaveBeenCalledTimes(callsAfterBurst);
});

test("keeps concurrent snapshots isolated between users", async () => {
  const secondUserId = "507f1f77bcf86cd799439012";
  invalidateAccessStateCacheForUser(secondUserId);
  peekAccessTokenUserId.mockImplementation(async (input) => input.headers.get("x-test-user"));
  requireUserFromRequest.mockImplementation(async (input) => {
    const resolvedUserId = input.headers.get("x-test-user");
    return {
      userId: resolvedUserId,
      authUserDoc: {
        _id: resolvedUserId,
        points: resolvedUserId === TEST_USER_ID ? 11 : 22,
        destinyProfilesCurrentId: "profile-main",
        profileSubscription: { tier: "free", profileLimit: 1, membershipCreditBalance: 0 },
      },
    };
  });
  const makeUserRequest = (resolvedUserId) => new Request("https://example.com/api/me/access-state", {
    method: "GET",
    headers: { "x-test-user": resolvedUserId },
  });

  const responses = await Promise.all([
    ...Array.from({ length: 20 }, () => handleAccessStateRoutes(makeUserRequest(TEST_USER_ID), {})),
    ...Array.from({ length: 20 }, () => handleAccessStateRoutes(makeUserRequest(secondUserId), {})),
  ]);
  const payloads = await Promise.all(responses.map((response) => response.json()));

  // 이 테스트의 핵심은 호출 횟수가 아니라 **사용자 간 격리**다. 요청 간 Promise 공유를 제거한 뒤로
  // 각 요청이 자기 몫을 조회하므로 횟수는 더 이상 2 가 아니지만, 한 사용자의 스냅샷이 다른 사용자에게
  // 새는 일은 절대 없어야 한다(캐시 키가 userId 로 스코프된다).
  expect(payloads.slice(0, 20).every((payload) => payload.data.userId === TEST_USER_ID && payload.data.coinBalance === 11)).toBe(true);
  expect(payloads.slice(20).every((payload) => payload.data.userId === secondUserId && payload.data.coinBalance === 22)).toBe(true);
});

test("evicts a rejected single-flight promise so the next request can recover", async () => {
  requireUserFromRequest.mockRejectedValueOnce(new Error("MongoDB operation timed out in Worker"));
  const failed = await handleAccessStateRoutes(request(), {});
  const recovered = await handleAccessStateRoutes(request(), {});
  const recoveredPayload = await recovered.json();

  expect(failed.status).toBe(200);
  expect(recovered.status).toBe(200);
  expect(recoveredPayload.data.authority).toBe("server");
  expect(requireUserFromRequest).toHaveBeenCalledTimes(2);
});

test("adds Guardian usage only when explicitly included and versions the ETag", async () => {
  const baseResponse = await handleAccessStateRoutes(request(), { ENABLE_GUARDIAN_FORTUNE_API: true });
  const guardianResponse = await handleAccessStateRoutes(new Request(
    "https://example.com/api/me/access-state?include=guardian",
    { method: "GET" },
  ), { ENABLE_GUARDIAN_FORTUNE_API: true });
  const basePayload = await baseResponse.json();
  const guardianPayload = await guardianResponse.json();

  expect(basePayload.data.freeUsage).toBeUndefined();
  expect(guardianPayload.data.freeUsage.guardian).toMatchObject({
    degraded: false,
    dailyFreeUsed: 1,
    dailyFreeRemaining: 2,
    paidCreditsRemaining: 4,
  });
  expect(guardianPayload.data.versions.guardianUsageVersion).toMatch(/^guardian:/);
  expect(guardianResponse.headers.get("ETag")).not.toBe(baseResponse.headers.get("ETag"));
  expect(buildGuardianFortuneUsageStatus).toHaveBeenCalledTimes(1);
});

test("keeps entitlements authoritative when the optional Guardian query is degraded", async () => {
  buildGuardianFortuneUsageStatus.mockRejectedValue(new Error("guardian query timed out"));
  const guardianRequest = () => new Request("https://example.com/api/me/access-state?include=guardian", { method: "GET" });

  const first = await handleAccessStateRoutes(guardianRequest(), { ENABLE_GUARDIAN_FORTUNE_API: true });
  const firstPayload = await first.json();
  const second = await handleAccessStateRoutes(guardianRequest(), { ENABLE_GUARDIAN_FORTUNE_API: true });

  expect(first.status).toBe(200);
  expect(firstPayload.degraded).toBe(false);
  expect(firstPayload.data.entitlementSnapshot.tier).toBe("premium");
  expect(firstPayload.data.freeUsage.guardian).toMatchObject({
    degraded: true,
    code: "DB_QUERY_TIMEOUT",
  });
  expect(firstPayload.data.freeUsage.guardian.canGenerate).toBeUndefined();
  expect(buildGuardianFortuneUsageStatus).toHaveBeenCalledTimes(2);
  expect(second.status).toBe(200);
});

test("emits opt-in diagnostics without raw identity or auth material", async () => {
  const info = jest.spyOn(console, "info").mockImplementation(() => {});
  try {
    const response = await handleAccessStateRoutes(request(), { ACCESS_STATE_DIAGNOSTICS_ENABLED: "true" });
    expect(response.status).toBe(200);
    expect(info).toHaveBeenCalledTimes(1);
    const line = info.mock.calls[0].join(" ");
    expect(line).toContain("[access-state-diagnostics]");
    expect(line).toContain('"externalApiCalled":false');
    expect(line).toContain('"singleFlightJoin":false');
    expect(line).not.toContain(TEST_USER_ID);
    expect(line).not.toMatch(/authorization|cookie|token/i);
  } finally {
    info.mockRestore();
  }
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
