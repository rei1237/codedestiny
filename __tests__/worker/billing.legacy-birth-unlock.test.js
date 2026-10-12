/**
 * @jest-environment node
 *
 * 출생 기반 전환 이전에 결제한 고객(레거시 USER 행)은 저장 프로필 없이 다시 열어도 재과금되지 않는다.
 * billing 의 판정(resolvePaidContentAccess)이 profileId 요구(invalid_profile)보다 이미 해금을 먼저 본다.
 */
import { jest } from "@jest/globals";

const rows = [];

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$and") return condition.every((clause) => matchesFilter(doc, clause));
    if (key === "$or") return condition.some((clause) => matchesFilter(doc, clause));
    if (condition === null) return doc[key] === null || doc[key] === undefined;
    if (condition instanceof Date || typeof condition !== "object") return doc[key] === condition;
    if ("$in" in condition) return condition.$in.includes(doc[key]);
    if ("$gt" in condition) return doc[key] != null && doc[key] > condition.$gt;
    if ("$exists" in condition) return (doc[key] !== undefined) === condition.$exists;
    return doc[key] === condition;
  });
}

let utils;

beforeAll(async () => {
  const actualModels = await import("../../worker/lib/models.js");
  const actualDb = await import("../../worker/lib/db.js");
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    ...actualDb,
    connectDb: async () => undefined,
    withMongoRetry: async (_env, callback) => callback(),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    ...actualModels,
    ContentEntitlement: {
      findOne(filter) {
        const query = { select: () => query, session: () => query, lean: async () => rows.find((row) => matchesFilter(row, filter)) || null };
        return query;
      },
    },
  }));

  ({ __billingTestUtils: utils } = await import("../../worker/routes/billing.js"));
});

const NO_PASS = { isActive: false, tier: "free", passTier: null, freeLimit: 0, profileSubscription: null, entitlement: {} };
let seq = 0;

async function decide(featureKey, profileId) {
  // 판정 캐시를 피하려고 테스트마다 다른 계정을 쓴다.
  const userId = `64b0000000000000000000${String(++seq).padStart(2, "0")}`;
  return { userId, decide: () => utils.resolvePaidContentAccess({}, {
    userId,
    profileId,
    pricing: { featureKey, coinPrice: 30, cost: 30 },
    subscriptionPass: NO_PASS,
    accountUnlockedFeatures: [],
  }) };
}

beforeEach(() => {
  rows.length = 0;
});

test.each(["section_daewun", "section_summary"])("%s: 레거시 USER 행이 있으면 profileId 없이도 already_unlocked(재과금 없음)", async (featureKey) => {
  const ctx = await decide(featureKey, "");
  rows.push({
    userId: ctx.userId,
    profileId: "__user__",
    scope: "USER",
    serviceKey: "saju",
    // 2026-06 무렵 행은 featureKey 없이 contentKey 만 있다.
    contentKey: featureKey === "section_daewun" ? "saju.daeunAnalysis" : "saju.fullReading",
    status: "ACTIVE",
    expiresAt: null,
  });

  const decision = await ctx.decide();
  expect(decision.reason).toBe("already_unlocked");
  expect(decision.accessGranted).toBe(true);
  expect(decision.shouldOpenPaymentSelector).toBe(false);
});

test("레거시 PROFILE 행만 있으면 profileId 없이는 열지 않고 프로필을 요구한다", async () => {
  const ctx = await decide("section_daewun", "");
  rows.push({ userId: ctx.userId, profileId: "p1", scope: "PROFILE", serviceKey: "saju", contentKey: "saju.daeunAnalysis", status: "ACTIVE", expiresAt: null });

  const decision = await ctx.decide();
  expect(decision.reason).toBe("invalid_profile");
  expect(decision.accessGranted).toBe(false);
});

test("해금 행이 없으면 profileId 없이는 프로필을 요구한다", async () => {
  const ctx = await decide("section_daewun", "");

  expect((await ctx.decide()).reason).toBe("invalid_profile");
});
