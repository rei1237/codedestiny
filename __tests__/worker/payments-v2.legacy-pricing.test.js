/**
 * @jest-environment node
 *
 * 컷오버 어댑터의 가격 해석 패리티.
 *
 * 첫 배선은 catalog(resolveProduct: productId·featureKey·reason 3입력)를 썼는데, 구 해석의
 * mode/reportMode/categoryKey/subFeatureKey 변형 가격을 잃어 해당 기능의 단건 결제가
 * 400(금액 불일치)으로 막히는 라이브 결함이었다(2026-08-12). legacy-pricing.js 는 구 billing.js
 * resolvePricingFromBody 의 체인을 승계한다 — 여기서는 그 체인이 **구 소스와 한 글자도 다르지
 * 않은 후보 목록·순서**를 갖는지(소스 대조), 그리고 대표 바디 형태들이 실제로 해석되는지를 본다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LEGACY_FEATURE_CANDIDATE_FIELDS,
  isGenericLegacyFeatureKey,
  resolveLegacyProduct,
  resolveLegacyPricingResult,
} from "../../worker/payments/legacy-pricing.js";
import { getBillingFeaturePricing } from "../../worker/lib/billing-feature-registry.js";
import { listProducts } from "../../worker/payments/catalog.js";
import { legacyMoonstoneEnvelope } from "../../worker/payments/compat.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("🔴 후보 체인은 구 resolvePricingFromBody(billing.js)와 글자 그대로 같다", () => {
  const billing = readFileSync(path.join(root, "worker/routes/billing.js"), "utf8");
  const start = billing.indexOf("const featureCandidates = [");
  expect(start).toBeGreaterThan(0);
  const block = billing.slice(start, billing.indexOf("]", start));
  const oldFields = [...block.matchAll(/body\?\.(\w+)/g)].map((m) => m[1]);
  expect(oldFields).toEqual([...LEGACY_FEATURE_CANDIDATE_FIELDS]);
  // 일반 키 판정도 구 정의(isGenericBillingFeatureKey)와 같은 집합이어야 한다.
  for (const generic of ["", "coin-gate-per-use", "paid-service", "paid_service", "default", "service", "SERVICE"]) {
    expect(isGenericLegacyFeatureKey(generic)).toBe(true);
  }
  expect(isGenericLegacyFeatureKey("vedic-ai-consultation")).toBe(false);
});

test("featureKey 직접 해석은 구 레지스트리 결과와 금액이 같다", () => {
  const sample = listProducts().slice(0, 12);
  expect(sample.length).toBeGreaterThan(5);
  for (const item of sample) {
    const product = resolveLegacyProduct({ featureKey: item.featureKey });
    const old = getBillingFeaturePricing({ featureKey: item.featureKey });
    expect(old?.ok).toBe(true);
    const oldKrw = Number(old.pricing?.amountKRW ?? old.pricing?.cashPrice ?? Number(old.pricing?.cost || 0) * 100);
    expect(product.priceKRW).toBe(oldKrw);
    expect(product.priceCoins).toBe(Math.floor(Number(old.pricing?.cost || 0)));
  }
});

test("featureKey 가 일반 키여도 후보(serviceKey·productId)로 해석된다 — 구 폴백 체인 승계", () => {
  const anchor = listProducts()[0];
  const viaService = resolveLegacyProduct({ featureKey: "paid-service", serviceKey: anchor.featureKey });
  expect(viaService.featureKey).toBe(anchor.featureKey);
  const viaProductId = resolveLegacyProduct({ productId: anchor.featureKey });
  expect(viaProductId.featureKey).toBe(anchor.featureKey);
});

test("해석 불가 바디는 PRODUCT_NOT_FOUND 로 던진다(0원 주문 생성 금지)", () => {
  expect(() => resolveLegacyProduct({ featureKey: "no-such-feature-xyz" })).toThrow();
  const result = resolveLegacyPricingResult({ featureKey: "no-such-feature-xyz" });
  expect(result?.ok === true && !isGenericLegacyFeatureKey(result?.pricing?.featureKey)).toBe(false);
});

test("월정석 봉투는 셸 판정기 2종의 요구 키를 충족한다", () => {
  const product = { featureKey: "test-key", priceCoins: 50, monthlyCost: 500, pricing: { featureKey: "test-key" } };
  const envelope = legacyMoonstoneEnvelope({
    product, requestId: "req-1", profileId: "p1",
    spend: { balance: 4500, replayed: false, ledgerId: "led-1" },
    unlock: true,
  });
  // _cdToCoinPayload → data.consume 병합 후 _cdHasVerifiedMonthlyConsumption 이 보는 키들
  const consume = envelope.data.consume;
  expect(String(consume.ledgerId || consume.transactionId)).not.toBe("");
  expect(consume.accessType).toBe("membership_credit");
  expect(Number(consume.membershipCreditCost)).toBeGreaterThan(0);
  expect(consume.featureKey).toBe("test-key");
  // 잔액 동기화 키 + 해금 증빙
  expect(consume.monthlyStoneBalance).toBe(4500);
  expect(envelope.data.unlockMap["test-key"]).toBe(true);
  expect(envelope.data.accessGrant.evidenceId).toBe("led-1");
  // ledgerId 가 빈 replay 케이스도 requestId 로 증빙이 성립해야 한다(moonstone.js 는 ledgerId "" 반환)
  const replay = legacyMoonstoneEnvelope({ product, requestId: "req-2", spend: { balance: 4500, replayed: true, ledgerId: "" } });
  expect(replay.data.consume.transactionId).toBe("req-2");
  expect(replay.data.consume.idempotent).toBe(true);
});
