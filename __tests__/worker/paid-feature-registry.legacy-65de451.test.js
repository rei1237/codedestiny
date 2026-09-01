/**
 * @jest-environment node
 */

let registry;

beforeAll(async () => {
  registry = await import("../../worker/lib/paid-feature-registry.js");
});

/**
 * 65de451 시점의 해금 상품 표. 이 목록은 "영구 불변 기록"이 아니라 **드리프트 검출기**다 —
 * 가격이 조용히 바뀌는 것을 막되, 의도한 개정이면 기준선도 함께 옮긴다.
 *
 * 개정 이력:
 *  · 2026-08-23 unlock.flower_fc 200 → 100 (운명의 꽃 카드 4장을 1장으로 합치며 전체 해금 1만원).
 *    worker/lib/paid-feature-registry.js 의 같은 이름 상수와 항상 짝으로 고친다.
 *  · 2026-09-01 번들 해금 5종 삭제 — unlock.all_paid_saju · premium_astrology · premium_sukuyo ·
 *    premium_veda · premium_naming. 어느 화면도 이 키로 결제를 시작하지 않아 Play SKU
 *    cd_content_tier_11(₩39,000)·cd_content_tier_13(₩70,000) 만 남기고 있었다.
 */
const LEGACY_UNLOCK_PRODUCTS_65DE451 = Object.freeze({
  "unlock.section_daewun": { featureKey: "section_daewun", cost: 50, reason: "Section daewun unlock", forceDeduct: true },
  "unlock.section_summary": { featureKey: "section_summary", cost: 50, reason: "Section summary unlock", forceDeduct: true },
  "unlock.section_compat": { featureKey: "section_compat", cost: 50, reason: "Section compat unlock", forceDeduct: true },
  "unlock.flower_fc": { featureKey: "flower-fc", cost: 100, reason: "Destiny flower atelier full unlock", forceDeduct: true },
  "unlock.olympus_fc": { featureKey: "olympus-fc", cost: 100, reason: "Olympus profile unlock", forceDeduct: true },
  "unlock.rpg_character": { featureKey: "rpgCharacter", cost: 30, reason: "RPG character unlock", forceDeduct: true },
  "unlock.travel_destiny": { featureKey: "travelDestiny", cost: 50, reason: "Travel destiny unlock", forceDeduct: true },
  "unlock.health_report": { featureKey: "healthReport", cost: 50, reason: "Health report unlock", forceDeduct: true },
  "unlock.saju_diary": { featureKey: "sajuDiary", cost: 100, reason: "Saju diary unlock", forceDeduct: true },
  "unlock.secret_house_episodes": { featureKey: "secretHouseEpisodes", cost: 50, reason: "Secret house episodes unlock", forceDeduct: true },
  "unlock.premium_divination_pack": { featureKey: "premiumDivinationPack", cost: 300, reason: "Premium divination pack unlock", forceDeduct: true },
  "unlock.premium_ziwei": { featureKey: "premium-ziwei", cost: 200, reason: "Premium ziwei unlock", forceDeduct: true },
});

describe("Paid feature registry legacy baseline (65de451)", () => {
  test("legacy unlock products from 65de451 should remain unchanged", () => {
    const baselineEntries = Object.entries(LEGACY_UNLOCK_PRODUCTS_65DE451);

    expect(baselineEntries.length).toBeGreaterThan(0);

    baselineEntries.forEach(([productId, expectedSpec]) => {
      const actualSpec = registry.PIG_COIN_UNLOCK_PRODUCTS[productId];
      const { forceDeduct: _legacyForceDeduct, ...expectedPolicy } = expectedSpec;

      expect(actualSpec).toBeDefined();
      expect(actualSpec).toMatchObject({ ...expectedPolicy, accessModel: "unlock" });
      expect(actualSpec.forceDeduct).toBeUndefined();
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
