/**
 * @jest-environment node
 */

let registry;

beforeAll(async () => {
  registry = await import("../../worker/lib/paid-feature-registry.js");
});

const LEGACY_UNLOCK_PRODUCTS_65DE451 = Object.freeze({
  "unlock.section_daewun": { featureKey: "section_daewun", cost: 50, reason: "Section daewun unlock", forceDeduct: true },
  "unlock.section_summary": { featureKey: "section_summary", cost: 50, reason: "Section summary unlock", forceDeduct: true },
  "unlock.section_compat": { featureKey: "section_compat", cost: 50, reason: "Section compat unlock", forceDeduct: true },
  "unlock.flower_fc": { featureKey: "flower-fc", cost: 200, reason: "Destiny flower atelier full unlock", forceDeduct: true },
  "unlock.olympus_fc": { featureKey: "olympus-fc", cost: 100, reason: "Olympus profile unlock", forceDeduct: true },
  "unlock.all_paid_saju": { featureKey: "allPaidSaju", cost: 700, reason: "All paid saju unlock", forceDeduct: true },
  "unlock.rpg_character": { featureKey: "rpgCharacter", cost: 30, reason: "RPG character unlock", forceDeduct: true },
  "unlock.travel_destiny": { featureKey: "travelDestiny", cost: 50, reason: "Travel destiny unlock", forceDeduct: true },
  "unlock.health_report": { featureKey: "healthReport", cost: 50, reason: "Health report unlock", forceDeduct: true },
  "unlock.saju_diary": { featureKey: "sajuDiary", cost: 100, reason: "Saju diary unlock", forceDeduct: true },
  "unlock.secret_house_episodes": { featureKey: "secretHouseEpisodes", cost: 50, reason: "Secret house episodes unlock", forceDeduct: true },
  "unlock.premium_divination_pack": { featureKey: "premiumDivinationPack", cost: 300, reason: "Premium divination pack unlock", forceDeduct: true },
  "unlock.premium_ziwei": { featureKey: "premium-ziwei", cost: 200, reason: "Premium ziwei unlock", forceDeduct: true },
  "unlock.premium_astrology": { featureKey: "premium-astrology", cost: 390, reason: "Premium astrology unlock", forceDeduct: true },
  "unlock.premium_sukuyo": { featureKey: "premium-sukuyo", cost: 390, reason: "Premium sukuyo unlock", forceDeduct: true },
  "unlock.premium_veda": { featureKey: "premium-veda", cost: 390, reason: "Premium veda unlock", forceDeduct: true },
  "unlock.premium_naming": { featureKey: "premium-naming", cost: 700, reason: "Premium naming unlock", forceDeduct: true },
});

describe("Paid feature registry legacy baseline (65de451)", () => {
  test("legacy unlock products from 65de451 should remain unchanged", () => {
    const baselineEntries = Object.entries(LEGACY_UNLOCK_PRODUCTS_65DE451);

    expect(baselineEntries.length).toBeGreaterThan(0);

    baselineEntries.forEach(([productId, expectedSpec]) => {
      const actualSpec = registry.PIG_COIN_UNLOCK_PRODUCTS[productId];

      expect(actualSpec).toBeDefined();
      expect(actualSpec).toMatchObject(expectedSpec);
    });
  });

  test("legacy baseline mismatch helper should report no drift", () => {
    expect(registry.listLegacyUnlockBaselineMismatches()).toEqual([]);
  });

  test("legacy unlock product count should not shrink", () => {
    const baselineCount = Object.keys(LEGACY_UNLOCK_PRODUCTS_65DE451).length;
    const currentCount = Object.keys(registry.PIG_COIN_UNLOCK_PRODUCTS).length;

    expect(currentCount).toBeGreaterThanOrEqual(baselineCount);
  });
});
