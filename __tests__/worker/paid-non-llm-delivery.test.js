/** @jest-environment node */
import { readFileSync } from "node:fs";
import {
  ACTIVE_NON_LLM_ALIAS_FIXTURES,
  ACTIVE_NON_LLM_FEATURE_KEYS,
  HISTORICAL_PAID_FEATURE_FIXTURES,
  PAID_NON_LLM_DELIVERY_FIXTURES,
  REGISTRY_ONLY_NON_LLM_KEYS,
} from "../fixtures/paid-non-llm-delivery-fixtures.mjs";
import {
  FEATURE_KEY_PRICE_TABLE,
  PAID_FEATURE_KEY_ALIASES,
  UNLOCK_PRODUCT_BY_FEATURE_KEY,
  getPaidFeatureBillingType,
  normalizePaidFeatureKey,
} from "../../worker/lib/paid-feature-registry.js";
import { getBillingFeaturePricing } from "../../worker/lib/billing-feature-registry.js";

const source = (evidence) => readFileSync(evidence.file, "utf8").replace(/\r/g, "");
const registryPrice = (featureKey) => (
  FEATURE_KEY_PRICE_TABLE[featureKey] || UNLOCK_PRODUCT_BY_FEATURE_KEY[featureKey] || null
);

test("활성 비LLM 유료 항목은 pricing registry와 실제 CTA/consumer에 함께 연결된다", () => {
  expect(new Set(ACTIVE_NON_LLM_FEATURE_KEYS).size).toBe(ACTIVE_NON_LLM_FEATURE_KEYS.length);

  for (const fixture of PAID_NON_LLM_DELIVERY_FIXTURES) {
    const expectedPrice = registryPrice(fixture.featureKey);
    const billing = getBillingFeaturePricing({ featureKey: fixture.featureKey });

    expect(expectedPrice).toBeTruthy();
    expect(getPaidFeatureBillingType(fixture.featureKey)).toBe(fixture.billingType);
    expect(billing).toMatchObject({ ok: true, pricing: { featureKey: fixture.featureKey } });
    expect(billing.pricing.cost).toBe(expectedPrice.cost);
    expect(source(fixture.cta)).toContain(fixture.cta.marker);
    expect(source(fixture.consumer)).toContain(fixture.consumer.marker);
  }
});

test("판매 중단·통합 항목은 새 CTA가 아니라 과거 이력과 대체 경로 근거로만 보존한다", () => {
  for (const fixture of HISTORICAL_PAID_FEATURE_FIXTURES) {
    const expectedPrice = registryPrice(fixture.featureKey);

    expect(expectedPrice).toBeTruthy();
    expect(getPaidFeatureBillingType(fixture.featureKey)).toBe(fixture.billingType);
    expect(source(fixture.retained)).toContain(fixture.retained.marker);
    expect(source(fixture.replacement)).toContain(fixture.replacement.marker);
    expect(ACTIVE_NON_LLM_FEATURE_KEYS).not.toContain(fixture.featureKey);
  }
});

test("CTA/consumer가 확인되지 않은 registry-only 키를 활성 전달 완료로 세지 않는다", () => {
  expect(new Set(REGISTRY_ONLY_NON_LLM_KEYS).size).toBe(REGISTRY_ONLY_NON_LLM_KEYS.length);

  for (const featureKey of REGISTRY_ONLY_NON_LLM_KEYS) {
    expect(registryPrice(featureKey)).toBeTruthy();
    expect(getPaidFeatureBillingType(featureKey)).not.toBe("");
    expect(ACTIVE_NON_LLM_FEATURE_KEYS).not.toContain(featureKey);
  }
});

test("모든 pricing alias는 가격과 결제 유형을 canonical 상품으로 정규화한다", () => {
  for (const [alias, canonical] of Object.entries(PAID_FEATURE_KEY_ALIASES)) {
    const canonicalPrice = registryPrice(canonical);
    const aliasBilling = getBillingFeaturePricing({ featureKey: alias });

    expect(normalizePaidFeatureKey(alias)).toBe(canonical);
    expect(canonicalPrice).toBeTruthy();
    expect(getPaidFeatureBillingType(alias)).toBe(getPaidFeatureBillingType(canonical));
    expect(aliasBilling.ok).toBe(true);
    expect(registryPrice(aliasBilling.pricing.featureKey)).toBeTruthy();
    expect(getPaidFeatureBillingType(aliasBilling.pricing.featureKey)).toBe(getPaidFeatureBillingType(canonical));
    expect(aliasBilling.pricing.cost).toBe(canonicalPrice.cost);
  }
});

test("현재 화면에서 쓰는 비LLM alias는 실제 진입 소스와 canonical pricing을 함께 가진다", () => {
  for (const fixture of ACTIVE_NON_LLM_ALIAS_FIXTURES) {
    expect(PAID_FEATURE_KEY_ALIASES[fixture.alias]).toBe(fixture.canonical);
    expect(source({ file: fixture.file })).toContain(fixture.alias);
    expect(registryPrice(fixture.canonical)).toBeTruthy();
  }
});
