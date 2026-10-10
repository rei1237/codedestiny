/**
 * @jest-environment node
 */

import {
  planBirthScopeMigration,
  EXCLUDE_REASONS,
  birthScopedFeatureKeyVariants,
  canonicalBirthFeatureKey,
  pairPointRefunds,
} from "../../scripts/lib/birth-scope-unlock-plan.mjs";
import { computeBirthKey, toBirthEntitlementProfileId } from "../../worker/lib/birth-key.js";

const U1 = "64b000000000000000000001";
const U2 = "64b000000000000000000002";
const birth = { year: 1990, month: 5, day: 17, hour: 9, minute: 30, timeUnknown: false, calType: "solar" };
const card = (userId, profileId, overrides = {}) => ({ userId, profileId, gender: "F", birth: { ...birth, ...overrides } });

const row = (overrides = {}) => ({
  _id: `e${Math.random().toString(16).slice(2, 10)}`,
  userId: U1,
  profileId: "p1",
  scope: "PROFILE",
  featureKey: "section_summary",
  serviceKey: "saju",
  contentKey: "saju.fullReading",
  status: "ACTIVE",
  source: "COIN",
  orderId: "o1",
  grantedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

test("a profile-scoped purchase is copied to a BIRTH row keyed by the profile's current birth", () => {
  const source = row();
  const { creates, excludes, stats } = planBirthScopeMigration({
    entitlements: [source],
    profiles: [card(U1, "p1")],
  });
  expect(excludes).toEqual([]);
  expect(creates).toHaveLength(1);
  const birthKey = computeBirthKey(card(U1, "p1"));
  expect(creates[0].filter).toEqual({
    userId: U1,
    profileId: toBirthEntitlementProfileId(birthKey),
    serviceKey: "saju",
    contentKey: "saju.fullReading",
    scope: "BIRTH",
  });
  expect(creates[0].doc).toMatchObject({ birthKey, purchaseProfileId: "p1", sourceEntitlementIds: [source._id], mergedOrderIds: ["o1"] });
  expect(stats.affectedUsers).toBe(1);
});

test("two profiles with the same birth merge into one BIRTH row and keep every source id", () => {
  const a = row({ profileId: "p1", orderId: "o1", grantedAt: new Date("2026-02-01T00:00:00Z") });
  const b = row({ profileId: "p2", orderId: "o2", grantedAt: new Date("2026-01-01T00:00:00Z") });
  const { creates, stats } = planBirthScopeMigration({
    entitlements: [a, b],
    profiles: [card(U1, "p1"), card(U1, "p2")],
  });
  expect(creates).toHaveLength(1);
  expect(creates[0].doc.sourceEntitlementIds.sort()).toEqual([a._id, b._id].sort());
  expect(creates[0].doc.mergedOrderIds.sort()).toEqual(["o1", "o2"]);
  expect(creates[0].doc.unlockedAt).toEqual(new Date("2026-01-01T00:00:00Z"));
  expect(stats.mergedGroups).toBe(1);
});

test("different births and different accounts stay separate", () => {
  const { creates } = planBirthScopeMigration({
    entitlements: [row({ profileId: "p1" }), row({ profileId: "p2" }), row({ userId: U2, profileId: "p1" })],
    profiles: [card(U1, "p1"), card(U1, "p2", { day: 18 }), card(U2, "p1")],
  });
  expect(creates).toHaveLength(3);
});

test("USER rows without a known purchase profile are only marked, never copied", () => {
  const userRow = row({ scope: "USER", profileId: "__user__", featureKey: "rpt_villainCard", serviceKey: "saju", contentKey: "rpt_villainCard" });
  const { creates, excludes, stats } = planBirthScopeMigration({ entitlements: [userRow], profiles: [card(U1, "p1")] });
  expect(creates).toEqual([]);
  expect(excludes).toEqual([{ _id: userRow._id, userId: U1, reason: EXCLUDE_REASONS.UNKNOWN_PURCHASE_PROFILE }]);
  expect(stats.excludedUsers).toBe(1);
});

test("USER rows with payment evidence of the purchasing profile are copied", () => {
  const userRow = row({ scope: "USER", profileId: "__user__", featureKey: "rpt_villainCard", contentKey: "rpt_villainCard", evidenceProfileId: "p1" });
  const { creates, excludes } = planBirthScopeMigration({ entitlements: [userRow], profiles: [card(U1, "p1")] });
  expect(excludes).toEqual([]);
  expect(creates).toHaveLength(1);
  expect(creates[0].doc.purchaseProfileId).toBe("p1");
});

test("deleted profiles, incomplete births and legacy compat rows are marked with a reason", () => {
  const deleted = row({ profileId: "gone" });
  const incomplete = row({ profileId: "p3" });
  const compat = row({ featureKey: "section_compat", contentKey: "saju.compatibility" });
  const { creates, excludes, stats } = planBirthScopeMigration({
    entitlements: [deleted, incomplete, compat],
    profiles: [card(U1, "p1"), { userId: U1, profileId: "p3", gender: "F", birth: { year: 1990 } }],
  });
  expect(creates).toEqual([]);
  expect(Object.fromEntries(excludes.map((item) => [item._id, item.reason]))).toEqual({
    [deleted._id]: EXCLUDE_REASONS.PROFILE_DELETED,
    [incomplete._id]: EXCLUDE_REASONS.INCOMPLETE_BIRTH,
    [compat._id]: EXCLUDE_REASONS.COMPAT_PARTNER_UNKNOWN,
  });
  expect(stats.deletedProfileSources).toBe(1);
});

test("account-scoped keys, inactive rows and existing BIRTH rows are left alone", () => {
  const { creates, excludes, stats } = planBirthScopeMigration({
    entitlements: [
      row({ featureKey: "flower-fc", serviceKey: "flower", contentKey: "flower-fc" }),
      row({ status: "REFUNDED" }),
      row({ scope: "BIRTH", profileId: "birth:x" }),
    ],
    profiles: [card(U1, "p1")],
  });
  expect(creates).toEqual([]);
  expect(excludes).toEqual([]);
  expect(stats).toMatchObject({ accountScopedRows: 1, inactiveRows: 1, existingBirthRows: 1 });
});

test("payment evidence without an entitlement row creates a BIRTH row; array-only keys are counted", () => {
  const { creates, stats } = planBirthScopeMigration({
    evidence: [{ userId: U1, featureKey: "section_daewun", profileId: "p1", orderId: "pay1", at: "2026-03-01T00:00:00Z" }],
    profiles: [card(U1, "p1")],
    users: [{ _id: U1, unlockedFeatures: ["section_daewun", "rpt_villainCard", "flower-fc"] }],
  });
  expect(creates).toHaveLength(1);
  expect(creates[0].doc.contentKey).toBe("saju.daeunAnalysis");
  expect(stats.arrayOnlyUnknownProfileKeys).toBe(1);
  expect(stats.arrayOnlyUnknownProfileUsers).toBe(1);
});

test("aliases, separator swaps and year suffixes fold to the canonical birth key", () => {
  expect(canonicalBirthFeatureKey("openSajuGuardianPage")).toBe("saju-guardian-unlock");
  expect(canonicalBirthFeatureKey("premium_fpti_report")).toBe("premium-fpti-report");
  expect(canonicalBirthFeatureKey("saju_guardian_unlock")).toBe("saju-guardian-unlock");
  expect(canonicalBirthFeatureKey("sukyo_yearly_fortune_unlock:2027")).toBe("sukyo_yearly_fortune_unlock:2027");
  expect(canonicalBirthFeatureKey("flower-fc")).toBe("");
  const variants = birthScopedFeatureKeyVariants();
  expect(variants).toEqual(expect.arrayContaining(["section_summary", "opensajuguardianpage", "generateFptiDeepReport"]));
  expect(variants).not.toContain("flower-fc");

  const { creates, stats } = planBirthScopeMigration({
    evidence: [
      { userId: U1, featureKey: "openSajuGuardianPage", profileId: "p1", orderId: "pay1" },
      { userId: U1, featureKey: "sukyo_yearly_fortune_unlock:2027", profileId: "p1", orderId: "pay2" },
    ],
    profiles: [card(U1, "p1")],
    users: [{ _id: U1, unlockedFeatures: ["openSajuGuardianPage", "sukyo_yearly_fortune_unlock:2027"] }],
  });
  expect(creates.map((item) => item.doc.featureKey).sort()).toEqual(["saju-guardian-unlock", "sukyo_yearly_fortune_unlock:2027"]);
  expect(stats.arrayOnlyUnknownProfileKeys).toBe(0);
});

test("coin refunds cancel only the deduction they pair with", () => {
  const at = (day) => new Date(`2026-0${day}-01T00:00:00Z`);
  const d = (id, overrides = {}) => ({ _id: id, userId: U1, featureKey: "section_summary", metadata: {}, createdAt: at(1), ...overrides });
  const deducts = [
    d("d1", { metadata: { requestId: "r1" }, createdAt: at(1) }),
    d("d2", { metadata: { requestId: "r2" }, createdAt: at(2) }),
    d("d3", { metadata: { requestId: "r3" }, createdAt: at(3) }),
    d("d4", { metadata: { monthlyCreditRefundedForUnlockFailure: true }, createdAt: at(4) }),
    d("d5", { createdAt: at(5) }),
    d("d6", { createdAt: at(7) }),
  ];
  const refunds = [
    { _id: "x1", userId: U1, featureKey: "section_summary", metadata: { refundForPointHistoryId: "d1" }, createdAt: at(1) },
    { _id: "x2", userId: U1, featureKey: "section_summary", metadata: { requestId: "r2" }, createdAt: at(2) },
    // 표식으로 이미 빠진 차감을 가리키는 환불은 다른 차감을 지우지 않는다.
    { _id: "x3", userId: U1, featureKey: "section_summary", metadata: { sourceTransactionId: "d4" }, createdAt: at(4) },
    // 짝 없는 환불은 그 시각 이전의 가장 최근 차감 하나만 상쇄한다.
    { _id: "x4", userId: U1, featureKey: "section_summary", metadata: {}, createdAt: at(6) },
  ];
  const { kept, stats } = pairPointRefunds(deducts, refunds);
  expect(kept.map((row) => row._id)).toEqual(["d3", "d6"]);
  expect(stats).toMatchObject({ byFlag: 1, byLink: 1, byRequestId: 1, byFallback: 1, unmatched: 0 });
});

test("purchases with an unknown profile become profile-selection claims instead of disappearing", () => {
  const userRow = row({ scope: "USER", profileId: "__user__", orderId: "o-user", amountKRW: 4900 });
  const deleted = row({ profileId: "gone", featureKey: "sukyo_yearly_fortune_unlock:2027", serviceKey: "", contentKey: "", orderId: "o-gone" });
  const { claims, stats } = planBirthScopeMigration({
    entitlements: [userRow, deleted],
    profiles: [card(U1, "p1")],
    users: [{ _id: U1, unlockedFeatures: ["section_summary", "openSajuGuardianPage"] }],
  });
  const byKind = Object.fromEntries(claims.map((claim) => [`${claim.sourceKind}:${claim.featureKey}`, claim]));
  expect(Object.keys(byKind).sort()).toEqual([
    "entitlement:section_summary",
    "entitlement:sukyo_yearly_fortune_unlock:2027",
    "user_array:saju-guardian-unlock",
  ]);
  expect(byKind["entitlement:section_summary"]).toMatchObject({
    userId: U1, sourceId: userRow._id, orderId: "o-user", priceKRW: 4900, serviceKey: "saju", contentKey: "saju.fullReading",
    reason: EXCLUDE_REASONS.UNKNOWN_PURCHASE_PROFILE,
  });
  expect(byKind["entitlement:sukyo_yearly_fortune_unlock:2027"].contentKey).toBe("sukyo_yearly_fortune_unlock:2027");
  expect(byKind["user_array:saju-guardian-unlock"].claimId).toMatch(/^[a-f0-9]{24}$/);
  expect(stats.claimsPlanned).toBe(3);
});

test("claims skip orders already copied to a BIRTH row, held P0-1 orders and duplicate sources", () => {
  const { claims, stats } = planBirthScopeMigration({
    entitlements: [
      row({ profileId: "p1", orderId: "o-copied" }),
      row({ scope: "USER", profileId: "__user__", featureKey: "section_daewun", contentKey: "saju.daeunAnalysis", orderId: "o-copied" }),
      row({ scope: "USER", profileId: "__user__", featureKey: "rpt_villainCard", contentKey: "rpt_villainCard", orderId: "o-dup" }),
    ],
    evidence: [
      { userId: U1, featureKey: "rpt_villainCard", orderId: "o-dup", sourceKind: "payment", sourceId: "pay-dup" },
      { userId: U1, featureKey: "travelDestiny", orderId: "o-held", heldForProfileClaim: true },
    ],
    profiles: [card(U1, "p1")],
    users: [{ _id: U1, unlockedFeatures: ["travelDestiny"] }],
  });
  expect(claims.map((claim) => claim.orderId)).toEqual(["o-dup"]);
  expect(stats).toMatchObject({ claimsCoveredByBirthRow: 1, claimsDeduplicated: 1, claimsSkippedHeldOrder: 1 });
});
