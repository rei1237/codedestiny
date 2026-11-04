/** @jest-environment node */
import { describe, expect, test } from '@jest/globals';
import { buildPaidDeliveryInventory } from '../../scripts/lib/paid-delivery-inventory.mjs';
import {
  LIGHT_FORTUNE_AUDIT_EXCLUDED_KEYS,
  LIGHT_FORTUNE_FEATURE_KEYS,
  LIGHT_FORTUNE_UNLOCK_ONLY_KEYS,
  isLightFortuneFeatureKey,
} from '../../worker/lib/light-fortune-catalog.js';
import { resolveProduct } from '../../worker/payments/catalog.js';

const inventory = buildPaidDeliveryInventory();
const kindByKey = new Map(inventory.products.map((product) => [product.featureKey, product.deliveryKind]));
const unlockOnly = new Set(LIGHT_FORTUNE_UNLOCK_ONLY_KEYS);

describe('라이트 운세 정본', () => {
  test('every light key is a deterministic product', () => {
    const wrong = LIGHT_FORTUNE_FEATURE_KEYS.filter(
      (key) => kindByKey.get(key) !== 'deterministic' && !unlockOnly.has(key),
    );
    expect(wrong).toEqual([]);
  });

  test('no deterministic product is left out', () => {
    const expected = new Set(
      inventory.products
        .filter((product) => product.deliveryKind === 'deterministic')
        .map((product) => product.featureKey)
        .filter((key) => !(key in LIGHT_FORTUNE_AUDIT_EXCLUDED_KEYS)),
    );
    for (const key of LIGHT_FORTUNE_UNLOCK_ONLY_KEYS) expected.add(key);
    expect([...LIGHT_FORTUNE_FEATURE_KEYS].sort()).toEqual([...expected].sort());
  });

  test('audited model-calling products stay out of the light list', () => {
    for (const key of ['premium-sibyl-dominator', 'saju-guardian-unlock', 'premiumDivinationPack']) {
      expect(isLightFortuneFeatureKey(key)).toBe(false);
      expect(LIGHT_FORTUNE_AUDIT_EXCLUDED_KEYS[key]).toEqual(expect.any(String));
    }
  });

  test('resolveProduct flags only light products', () => {
    expect(resolveProduct({ featureKey: 'rpt_quantumCard' }).lightFortune).toBe(true);
    expect(resolveProduct({ featureKey: 'tarot-celestial-harmony' }).lightFortune).toBe(false);
    expect(resolveProduct({ featureKey: 'premium-sibyl-dominator' }).lightFortune).toBe(false);
    expect(resolveProduct({ featureKey: 'nakshatra-ai-consultation' }).lightFortune).toBe(false);
  });

  test('alias keys resolve through normalizePaidFeatureKey', () => {
    expect(isLightFortuneFeatureKey('premium_fpti_report')).toBe(true);
    expect(isLightFortuneFeatureKey('premium-fpti-report')).toBe(true);
    expect(isLightFortuneFeatureKey('not-a-real-key')).toBe(false);
    expect(isLightFortuneFeatureKey(null)).toBe(false);
    expect(isLightFortuneFeatureKey(undefined)).toBe(false);
  });
});
