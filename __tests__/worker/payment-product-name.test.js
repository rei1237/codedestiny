/** @jest-environment node */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { resolveProduct } from "../../worker/payments/catalog.js";
import { createOrder } from "../../worker/payments/orders.js";
import { toLegacyOrderDetail, toLegacyPrepareOrder } from "../../worker/payments/compat.js";
import { buildReceiptEmail } from "../../worker/payments/receipt-email.js";
import { paymentOrderName, productNameForSnapshot, resolveOrderProductName } from "../../worker/lib/payment-product-name.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";
import { __paymentsTestUtils } from "../../worker/routes/payments.js";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const viewModelModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../../app/points/history/order-view-model.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: viewModelModule.exports, module: viewModelModule });
const { adaptOrderToViewModel } = viewModelModule.exports;

test.each([
  ["yeongnyangi-saju-tuna", "영냥이 사주 참치"],
  ["yeongnyangi-ziwei-mackerel", "영냥이 자미두수 고등어"],
  ["yeongnyangi-tarot-salmon", "영냥이 타로 연어"],
  ["yeongnyangi-fusion-saju-ziwei", "영냥이 사주 + 자미두수 생선 모둠 세트"],
])("%s: old and new orders name the purchased system and fish", (featureKey, expected) => {
  const product = resolveProduct({ featureKey });
  const order = { merchantUid: "cd-test", featureKey, productId: product.productId, paymentType: "digital_content", paymentAmount: product.priceKRW };
  const prepare = toLegacyPrepareOrder(order, { body: { productName: "신년운세" }, pricing: { label: "잘못된 상담" } });
  expect(productNameForSnapshot(product)).toBe(expected);
  expect(prepare.productName).toBe(expected);
  expect(prepare.orderName).toBe(paymentOrderName(expected));
  expect(new TextEncoder().encode(prepare.orderName).length).toBeLessThanOrEqual(40);
  const detail = toLegacyOrderDetail(order);
  expect(detail.productName).toBe(expected);
  expect(adaptOrderToViewModel(detail).title).toBe(expected);
  const summary = __paymentsTestUtils.formatPaymentSummaryResponse(order);
  expect(summary.productName).toBe(expected);
  expect(adaptOrderToViewModel(summary).title).toBe(expected);
  expect(buildReceiptEmail(order).html).toContain(expected);
});

test("new order snapshots retain the server label when a retry changes presentation text", async () => {
  const db = makeFakePaymentDb();
  const product = resolveProduct({ featureKey: "new-year-ai-consultation" });
  const input = { userId: "507f1f77bcf86cd799439011", product, idempotencyKey: "name-snapshot" };
  const first = await createOrder(db, input);
  const second = await createOrder(db, { ...input, product: { ...product, label: "변경된 상품명" } });
  expect(second.merchantUid).toBe(first.merchantUid);
  expect(first.pricingSnapshot.productName).toBe(product.label);
  expect(second.pricingSnapshot.productName).toBe(product.label);
  expect(resolveOrderProductName(second)).toBe(product.label);
  expect(toLegacyPrepareOrder(second).orderName).toBe(first.pricingSnapshot.orderName);
  expect(adaptOrderToViewModel(toLegacyOrderDetail(second)).title).toBe(product.label);
});

test("legacy full names, pack and gift snapshots remain authoritative", () => {
  const old = { featureKey: "new-year-ai-consultation", pricingSnapshot: { reason: "구매 당시 신년 상담" } };
  expect(resolveOrderProductName(old)).toBe("구매 당시 신년 상담");
  expect(resolveOrderProductName({ pricingSnapshot: { productName: "구매 당시 전체 상품명", orderName: "짧은 PG명" } })).toBe("구매 당시 전체 상품명");
  expect(resolveOrderProductName({ pricingSnapshot: { packSnapshot: { label: "참치 세트 5회" } } })).toBe("참치 세트 5회");
  expect(resolveOrderProductName({ purchaseType: "GIFT", metadata: { giftDraft: { productSnapshot: { name: "작은 꿀단지" } } } })).toBe("작은 꿀단지 선물");
  expect(resolveOrderProductName({ paymentType: "membership_pass", subscriptionTier: "standard", pricingSnapshot: { orderName: "구매 당시 이용권" } })).toBe("구매 당시 이용권");
});

test("the existing section labels and unknown old products keep readable fallbacks", () => {
  expect(resolveOrderProductName({ featureKey: "section_daewun" })).toBe("사주 대운 분석");
  expect(resolveOrderProductName({ featureKey: "section_summary" })).toBe("라이트 사주 풀이");
  expect(resolveOrderProductName({ featureKey: "retired-product", pricingSnapshot: { orderName: "이전 상담 상품" } })).toBe("이전 상담 상품");
  expect(adaptOrderToViewModel({ id: "old", featureKey: "retired-product" }).title).toBe("개별 운세 이용권");
});
