import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';
/** @jest-environment node */
import { readFileSync } from "node:fs";
import {
  ACTIVE_NON_LLM_ALIAS_FIXTURES,
  ACTIVE_NON_LLM_FEATURE_KEYS,
  HISTORICAL_PAID_FEATURE_FIXTURES,
  PAID_NON_LLM_DELIVERY_FIXTURES,
  PAID_NON_RESULT_FIXTURES,
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
    if (fixture.featureKey === 'fun.quantumLotto.ritualReport') {
      expect(isFreeFortuneFeatureKey(fixture.featureKey)).toBe(true);
      expect(source(fixture.cta)).toContain(fixture.cta.marker.replace('data-coin-cost="10"', 'data-coin-cost="0"'));
    } else if (fixture.featureKey === 'love-code') {
      expect(isFreeFortuneFeatureKey(fixture.featureKey)).toBe(true);
      const cta = source(fixture.cta);
      const start = cta.indexOf('const startWithCharacter = async');
      const end = cta.indexOf('const startSimulationScene', start);
      expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
      const entry = cta.slice(start, end);
      expect(entry).toContain('const request = beginFreeReading()');
      expect(entry).toContain('await hasFreeReadingSession()');
      expect(entry).toContain('if (!request.valid()) return');
      expect(entry).toContain('if (!signedIn)');
      expect(entry).toContain('startSimulationScene(id, mode)');
      expect(entry).not.toMatch(/runPaidAccessGate|markOptimisticallyUnlocked|transactionId|capture.*Evidence/);
      expect(cta).toContain('usePaidResume(LOVE_CODE_FEATURE_KEY');
      expect(cta).toContain('if (!ticket.valid()) return false');
      const auth = source({file:'app/_lib/free-reading-access.ts'});
      expect(auth).toContain("authFetch('/api/auth/me'");
      expect(auth).toContain('forceFresh: true');
      expect(auth).toContain('data?.authenticated === true');
      expect(isFreeFortuneFeatureKey('master-love-codex')).toBe(false);
      expect(isFreeFortuneFeatureKey('compat-saju-compatibility')).toBe(false);
    } else if (['destiny-compass-crossroads','destiny-compass-future-sim','destiny-compass-life-voyage','destiny-bias-analyze','daily-fortune-reading'].includes(fixture.featureKey)) {
      expect(isFreeFortuneFeatureKey(fixture.featureKey)).toBe(true);
      const cta = source(fixture.cta);
      expect(cta).toContain('useFreeReadingGuard(');
      expect(cta).toContain('useReadingIdentityReset(');
      expect(cta).toContain('await hasFreeReadingSession()');
      expect(cta).toContain('if (!request.valid()) return');
      expect(cta).not.toMatch(/ensurePaidAccess\(|runPaidAccessGate\(|capture.*Evidence\(/);
      if (fixture.featureKey.startsWith('destiny-compass-')) {
        expect(cta).toContain('saveCompassArchive(');
        expect(cta).toContain('const paid = paidRef.current');
        expect(cta).not.toContain('paidRef.current = { requestId');
        expect(source({file:'app/destiny-compass/_components/CompassApp.tsx'})).toContain('usePaidResume("' + fixture.featureKey + '"');
      } else {
        expect(cta).toContain('usePaidResume(');
        expect(cta).toContain(fixture.featureKey === 'daily-fortune-reading' ? 'requestSeq.current++' : 'computingTokenRef.current++');
      }
      expect(isFreeFortuneFeatureKey('destiny-compass-deep-report')).toBe(false);
    } else if (fixture.featureKey === 'premium-fpti-report') {
      expect(isFreeFortuneFeatureKey(fixture.featureKey)).toBe(true);
      const cta = source(fixture.cta);
      const start = cta.indexOf('const handleUnlockDeepReport = async');
      const end = cta.indexOf('// PDF', start);
      expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
      const entry = cta.slice(start, end);
      expect(entry).toContain('await hasFreeReadingSession()');
      expect(entry).toContain('authFetch("/api/fpti/deep-report/free"');
      expect(entry).toContain('if (!attempt.valid()) return');
      expect(entry).toContain('profileId: savedProfileId');
      expect(entry).toContain('data?.saved !== false');
      expect(entry).toContain('source: "public"');
      expect(entry).not.toMatch(/ensurePaidAccess|runPaidAccessGate|fetchServerDeepReport|transactionId/);
      expect(cta).toContain('restorePurchasedReport');
      expect(cta).toContain('source: "archive"');
      expect(source({file:'worker/routes/fpti.js'})).toContain('async function handleReadDeepReport(');
    } else expect(source(fixture.cta)).toContain(fixture.cta.marker);
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

test("결과물 없는 유료 동작은 결제 CTA와 서버의 결제 근거 확인부에 함께 연결된다", () => {
  for (const fixture of PAID_NON_RESULT_FIXTURES) {
    const expectedPrice = registryPrice(fixture.featureKey);
    const billing = getBillingFeaturePricing({ featureKey: fixture.featureKey });

    expect(expectedPrice).toBeTruthy();
    expect(getPaidFeatureBillingType(fixture.featureKey)).toBe(fixture.billingType);
    expect(billing).toMatchObject({ ok: true, pricing: { featureKey: fixture.featureKey } });
    expect(billing.pricing.cost).toBe(expectedPrice.cost);
    expect(source(fixture.cta)).toContain(fixture.cta.marker);
    expect(source(fixture.consumer)).toContain(fixture.consumer.marker);
    expect(ACTIVE_NON_LLM_FEATURE_KEYS).not.toContain(fixture.featureKey);
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
