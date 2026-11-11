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

// 2026-11-04 사용자 결정: 사주 항목은 29,000원 묶음으로만 새로 판다. 라이트·인하·이용권 무제한에서 뺀다.
const SAJU_BUNDLE_PRICES = {
  section_daewun: 20000,
  section_summary: 10000,
  section_compat: 10000,
  rpt_quantumCard: 10000,
  rpt_specialCharmCard: 1000,
  rpt_skillTreeCard: 1000,
  rpt_healthReportCard: 5000,
  rpt_energyCoordCard: 7000,
  rpt_villainCard: 5000,
  rpt_secretHouseEntryCard: 5000,
  'animal-destiny-unlock': 7000,
  'saju-career-style': 5000,
  tetogen_deep_report: 5000,
  'fun.quantumLotto.ritualReport': 1000,
  travelDestiny: 7000,
  healthReport: 5000,
  rpgCharacter: 5000,
  secretHouseEpisodes: 5000,
};
const LOWERED_LLM_KEYS = [
  'tarot-celestial-harmony',
  'palm-reading-general',
  'relationship-boundary-test',
  'compat-saju-compatibility',
  'saju_ai_question_prompt',
  'tarot-prompt-maker-deep',
  'tarot-prompt-maker-master',
  'ziwei_ai_prompt_generator',
  'astrology_ai_prompt_generator',
  'vedic_ai_prompt_generator',
  'sukuyo_ai_prompt_generator',
  'human-design-report',
  'destiny-compass-deep-report',
];
// 변경 전 레지스트리에서 복사한 값. 찻집·3만 원 이상 상담은 가격을 바꾸지 않는다.
const KEPT_PRICES = {
  'fortune-tea-house-tarot-five-consultation': 7000,
  'fortune-tea-house-saju-consultation': 10000,
  'fortune-tea-house-saju-joint-consultation': 15000,
  'fortune-tea-house-saju-compatibility-consultation': 10000,
  'fortune-tea-house-sukuyo-compatibility-consultation': 10000,
  'ziwei-deep-pdf': 30000,
  'fusion-fortune-consultation': 50000,
  'master-love-codex': 30000,
  'master-love-codex-compat': 50000,
  'heukwol-warning-consultation': 50000,
  'neo-email-consultation': 30000,
  'premium-naming-prompt': 30000,
  'life-book-ai-consultation': 30000,
  'love-secret-ai-consultation': 30000,
  'new-year-ai-consultation': 30000,
  'premium-sibyl-dominator': 20000,
  premiumDivinationPack: 30000,
};

describe('균일가', () => {
  test('light products cost 3000 or 5000 KRW', () => {
    const prices = LIGHT_FORTUNE_FEATURE_KEYS.map((featureKey) => [featureKey, resolveProduct({ featureKey }).priceKRW]);
    expect(prices.filter(([, price]) => ![3000, 5000].includes(price))).toEqual([]);
  });

  test('saju bundle items keep their price and leave the light list', () => {
    for (const [featureKey, price] of Object.entries(SAJU_BUNDLE_PRICES)) {
      expect([featureKey, resolveProduct({ featureKey }).priceKRW, isLightFortuneFeatureKey(featureKey)]).toEqual([featureKey, price, false]);
      expect(LIGHT_FORTUNE_AUDIT_EXCLUDED_KEYS[featureKey]).toEqual(expect.any(String));
    }
  });

  test('lowered LLM products cost 5000', () => {
    for (const featureKey of LOWERED_LLM_KEYS) {
      const product = resolveProduct({ featureKey });
      expect([featureKey, product.priceKRW, product.priceCoins]).toEqual([featureKey, 5000, 50]);
    }
  });

  test('saju guardian costs 3000 per birth date (2026-11-11)', () => {
    const product = resolveProduct({ featureKey: 'saju-guardian-unlock' });
    expect([product.priceKRW, product.priceCoins]).toEqual([3000, 30]);
  });

  test('excluded products keep their price', () => {
    for (const [featureKey, price] of Object.entries(KEPT_PRICES)) {
      expect([featureKey, resolveProduct({ featureKey }).priceKRW]).toEqual([featureKey, price]);
    }
  });
});

describe('영냥이 2026-11-04 인상', () => {
  const FISH = { mackerel: 10000, salmon: 15000, flounder: 20000, tuna: 30000 };
  const SYSTEMS = ['saju', 'ziwei', 'sukuyo', 'vedic', 'astrology', 'tarot'];

  test.each(Object.entries(FISH))('%s costs %i in every system and in chat questions', (fish, price) => {
    for (const system of SYSTEMS) {
      expect(resolveProduct({ featureKey: `yeongnyangi-${system}-${fish}` }).priceKRW).toBe(price);
    }
    expect(resolveProduct({ featureKey: `fortune-chat-question-${fish}` }).priceKRW).toBe(price);
  });

  test('fusion prices rise and the base chat consultation stays', () => {
    for (const slug of ['saju-ziwei', 'sukuyo-vedic', 'astrology-tarot']) {
      expect(resolveProduct({ featureKey: `yeongnyangi-fusion-${slug}` }).priceKRW).toBe(50000);
    }
    expect(resolveProduct({ featureKey: 'yeongnyangi-fusion-all' }).priceKRW).toBe(70000);
    expect(resolveProduct({ featureKey: 'fortune-chat-consultation' }).priceKRW).toBe(5000);
  });
});

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
    expect(resolveProduct({ featureKey: 'tarot-year-fortune' }).lightFortune).toBe(true);
    expect(resolveProduct({ featureKey: 'rpt_quantumCard' }).lightFortune).toBe(false);
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
