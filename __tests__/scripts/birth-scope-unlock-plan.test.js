/**
 * @jest-environment node
 */

import { planBirthScopeMigration, EXCLUDE_REASONS } from "../../scripts/lib/birth-scope-unlock-plan.mjs";
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
