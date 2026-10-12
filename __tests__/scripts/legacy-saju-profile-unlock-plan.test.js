/**
 * @jest-environment node
 */

import {
  SKIP_REASONS,
  TARGET_RULES,
  planLegacySajuProfileUnlocks,
  selectLegacyProfileTarget,
} from "../../scripts/lib/legacy-saju-profile-unlock-plan.mjs";

const U1 = "64b000000000000000000001";
const U2 = "64b000000000000000000002";

const deduct = (overrides = {}) => ({
  userId: U1,
  featureKey: "section_daewun",
  profileId: "",
  orderId: "req-1",
  sourceKind: "point_history",
  sourceId: "ph-1",
  at: new Date("2026-05-25T11:34:58Z"),
  priceCoins: 30,
  ...overrides,
});

const entitlement = (overrides = {}) => ({
  userId: U1,
  profileId: "p1",
  scope: "PROFILE",
  featureKey: "section_daewun",
  status: "ACTIVE",
  expiresAt: null,
  orderId: "other-order",
  ...overrides,
});

describe("selectLegacyProfileTarget", () => {
  test("(a) a live evidence profile wins even when the account has several cards", () => {
    expect(selectLegacyProfileTarget({ evidenceProfileId: "p2", cardProfileIds: ["p1", "p2"] }))
      .toEqual({ rule: TARGET_RULES.EVIDENCE_PROFILE, profileId: "p2" });
  });

  test("(b) a single live card is used when the evidence has no profile", () => {
    expect(selectLegacyProfileTarget({ evidenceProfileId: "", cardProfileIds: ["p1"] }))
      .toEqual({ rule: TARGET_RULES.SINGLE_CARD, profileId: "p1" });
    expect(selectLegacyProfileTarget({ evidenceProfileId: "deleted", cardProfileIds: ["p1"] }))
      .toEqual({ rule: TARGET_RULES.SINGLE_CARD, profileId: "p1" });
  });

  test("no card or several cards without a live evidence profile is report-only", () => {
    expect(selectLegacyProfileTarget({ cardProfileIds: [] }).rule).toBe(TARGET_RULES.REPORT_ONLY);
    expect(selectLegacyProfileTarget({ evidenceProfileId: "gone", cardProfileIds: ["p1", "p2"] }).rule)
      .toBe(TARGET_RULES.REPORT_ONLY);
    expect(selectLegacyProfileTarget({ evidenceProfileId: "__user__", cardProfileIds: ["p1", "p2"] }).rule)
      .toBe(TARGET_RULES.REPORT_ONLY);
  });
});

describe("planLegacySajuProfileUnlocks", () => {
  test("an orphaned coin deduction becomes one PROFILE row on the only card", () => {
    const { writes, stats } = planLegacySajuProfileUnlocks({
      evidence: [deduct()],
      profiles: [{ userId: U1, profileId: "p1" }],
    });
    expect(stats.writes).toBe(1);
    expect(writes[0].filter).toEqual({
      userId: U1,
      profileId: "p1",
      serviceKey: "saju",
      contentKey: "saju.daeunAnalysis",
      scope: "PROFILE",
    });
    expect(writes[0].doc).toMatchObject({
      featureKey: "section_daewun",
      status: "ACTIVE",
      source: "BACKFILL",
      grantType: "permanent_unlock",
      orderId: "req-1",
      evidenceId: "ph-1",
      coinAmount: 30,
      expiresAt: null,
    });
    expect(writes[0].doc.unlockedAt).toEqual(new Date("2026-05-25T11:34:58Z"));
  });

  test("summary maps to the full reading content key", () => {
    const { writes } = planLegacySajuProfileUnlocks({
      evidence: [deduct({ featureKey: "section_summary" })],
      profiles: [{ userId: U1, profileId: "p1" }],
    });
    expect(writes[0].filter.contentKey).toBe("saju.fullReading");
  });

  test("already open purchases are skipped", () => {
    const profiles = [{ userId: U1, profileId: "p1" }];
    const account = planLegacySajuProfileUnlocks({
      evidence: [deduct()],
      entitlements: [entitlement({ scope: "USER", profileId: "__user__" })],
      profiles,
    });
    expect(account.writes).toEqual([]);
    expect(account.stats.skipped[SKIP_REASONS.ACCOUNT_ROW]).toBe(1);

    const recorded = planLegacySajuProfileUnlocks({
      evidence: [deduct()],
      entitlements: [entitlement({ profileId: "gone", orderId: "req-1" })],
      profiles,
    });
    expect(recorded.writes).toEqual([]);
    expect(recorded.stats.skipped[SKIP_REASONS.ORDER_RECORDED]).toBe(1);

    const onCard = planLegacySajuProfileUnlocks({ evidence: [deduct()], entitlements: [entitlement()], profiles });
    expect(onCard.writes).toEqual([]);
    expect(onCard.stats.skipped[SKIP_REASONS.PROFILE_ROW]).toBe(1);

    // 2026-06 무렵 행은 featureKey 없이 contentKey 만 있다.
    const contentKeyOnly = planLegacySajuProfileUnlocks({
      evidence: [deduct()],
      entitlements: [entitlement({ featureKey: undefined, contentKey: "saju.daeunAnalysis" })],
      profiles,
    });
    expect(contentKeyOnly.writes).toEqual([]);
    expect(contentKeyOnly.stats.skipped[SKIP_REASONS.PROFILE_ROW]).toBe(1);
  });

  test("inactive or expired rows do not count as open", () => {
    const { writes } = planLegacySajuProfileUnlocks({
      evidence: [deduct()],
      entitlements: [
        entitlement({ status: "REVOKED" }),
        entitlement({ scope: "USER", profileId: "__user__", expiresAt: new Date("2026-01-01T00:00:00Z") }),
      ],
      profiles: [{ userId: U1, profileId: "p1" }],
      now: new Date("2026-10-11T00:00:00Z"),
    });
    expect(writes).toHaveLength(1);
  });

  test("repeat purchases for the same card collapse to the earliest one", () => {
    const { writes, stats } = planLegacySajuProfileUnlocks({
      evidence: [
        deduct({ orderId: "late", sourceId: "ph-2", at: new Date("2026-06-01T00:00:00Z") }),
        deduct({ orderId: "early", sourceId: "ph-1", at: new Date("2026-05-01T00:00:00Z") }),
      ],
      profiles: [{ userId: U1, profileId: "p1" }],
    });
    expect(writes).toHaveLength(1);
    expect(writes[0].doc.orderId).toBe("early");
    expect(stats.skipped[SKIP_REASONS.DUPLICATE_EVIDENCE]).toBe(1);
  });

  test("ambiguous accounts are reported, other keys and accounts are ignored", () => {
    const { writes, reportOnly } = planLegacySajuProfileUnlocks({
      evidence: [
        deduct({ userId: U2 }),
        deduct({ featureKey: "section_compat" }),
      ],
      profiles: [
        { userId: U1, profileId: "p1" },
        { userId: U2, profileId: "q1" },
        { userId: U2, profileId: "q2" },
      ],
    });
    expect(writes).toEqual([]);
    expect(reportOnly).toEqual([expect.objectContaining({ userId: U2, featureKey: "section_daewun", cardCount: 2 })]);
  });
});
