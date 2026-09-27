/** @jest-environment node */
import { existsSync, readFileSync } from "node:fs";
import { listProducts } from "../../worker/payments/catalog.js";
import {
  LLM_SALE_KEY_ALIASES,
  buildPaidDeliveryInventory,
} from "../../scripts/lib/paid-delivery-inventory.mjs";

const report = buildPaidDeliveryInventory();
const source = (file) => readFileSync(file, "utf8").replace(/\r/g, "");
const rowOf = (featureKey) => report.products.find((row) => row.featureKey === featureKey);

test("카탈로그의 모든 유료 상품은 정확히 하나의 전달 분류를 가진다", () => {
  expect(report.catalogCount).toBe(listProducts().length);
  expect(report.missingDeliveryMappings).toEqual([]);
  expect(report.ambiguousDeliveryMappings).toEqual([]);

  const probe = buildPaidDeliveryInventory([...listProducts(), { featureKey: "unclassified-probe" }]);
  expect(probe.missingDeliveryMappings).toEqual(["unclassified-probe"]);
});

test("분류 근거의 키와 LLM 어댑터는 모두 현재 카탈로그 상품을 가리킨다", () => {
  expect(report.staleEvidenceKeys).toEqual([]);
  expect(report.unusedLlmAdapters).toEqual([]);
});

test("생성·복구 경로로 적힌 파일은 실제로 존재한다", () => {
  expect(report.invalidMappings).toEqual([]);
  for (const row of report.products.filter((product) => product.serverRecovery)) {
    expect(existsSync(row.serverRecovery)).toBe(true);
  }
});

test("다른 키로 생성되는 LLM 판매 키는 CTA와 전달 키의 경로를 함께 가진다", () => {
  for (const alias of LLM_SALE_KEY_ALIASES) {
    const delivery = rowOf(alias.deliveryFeatureKey);

    expect(source(alias.cta.file)).toContain(alias.cta.marker);
    expect(source(alias.consumer.file)).toContain(alias.consumer.marker);
    expect(rowOf(alias.featureKey)).toMatchObject({
      deliveryFeatureKey: alias.deliveryFeatureKey,
      deliveryKind: delivery.deliveryKind,
      generation: delivery.generation,
      serverRecovery: delivery.serverRecovery,
    });
  }
});
