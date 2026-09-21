import { jest } from "@jest/globals";
// Historical order lifecycle fixtures predate the sales cutoff; isolate only new-sale admission.
// pass-policy-v2.test.js tests closed sales and legacy recovery with the real gate.
jest.unstable_mockModule("../../worker/lib/pass-sale-policy.js", () => ({ assertPassSaleAllowed: jest.fn(), listCurrentPassOffers: () => [] }));
/**
 * @jest-environment node
 *
 * 주문 시점 정책 버전(해외카드 1단계 C6). 워커 상수가 가입 동의 버전·게시 시행일과 어긋나면 주문 증빙이
 * 틀린 버전을 가리키므로 텍스트로 대조한다(auth.js 는 상수를 export 하지 않아 import 대신 읽는다).
 */
import { readFileSync } from "node:fs";
import { ORDER_POLICY_VERSIONS } from "../../worker/payments/policy-versions.js";
let createOrder;
let createPassOrder,resolvePassPlan;
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "507f1f77bcf86cd799439011";
const PRODUCT = { productId: "master-love-codex", featureKey: "master-love-codex", billingType: "per-use", priceKRW: 30000, priceCoins: 300, monthlyCost: 3000 };

function constantIn(file, name) {
  const match = readFileSync(file, "utf8").match(new RegExp(`const ${name} = "([^"]+)"`));
  if (!match) throw new Error(`${file} 에서 ${name} 을 찾지 못했습니다 — 상수가 옮겨졌으면 이 대조도 옮겨야 합니다`);
  return match[1];
}

test("정책 버전 상수 = 가입 동의 버전(auth.js) = 게시 시행일(약관·개인정보처리방침)", () => {
  expect(ORDER_POLICY_VERSIONS).toEqual({
    terms: constantIn("worker/routes/auth.js", "AUTH_TERMS_VERSION"),
    privacy: constantIn("worker/routes/auth.js", "AUTH_PRIVACY_VERSION"),
  });
  expect(ORDER_POLICY_VERSIONS.terms).toBe(constantIn("app/terms-of-service/TermsContent.jsx", "TERMS_EFFECTIVE_DATE"));
  expect(ORDER_POLICY_VERSIONS.privacy).toBe(constantIn("app/privacy-policy/PrivacyPolicyContent.jsx", "PRIVACY_POLICY_EFFECTIVE_DATE"));
  expect(Object.isFrozen(ORDER_POLICY_VERSIONS)).toBe(true);
});

test("단건 주문·이용권 주문이 생성 시점 정책 버전을 남긴다", async () => {
  const db = makeFakePaymentDb();
  const order = await createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: "pv-order" });
  const pass = await createPassOrder(db, { userId: USER, plan: resolvePassPlan("standard", 1), idempotencyKey: "pv-pass" });
  for (const created of [order, pass]) {
    const stored = db.rows.find((row) => row.merchantUid === created.merchantUid);
    expect(stored.policyVersions).toEqual({ terms: ORDER_POLICY_VERSIONS.terms, privacy: ORDER_POLICY_VERSIONS.privacy });
  }
});

beforeAll(async () => {
  ({ createOrder } = await import("../../worker/payments/orders.js"));
  ({ createPassOrder, resolvePassPlan } = await import("../../worker/payments/passes.js"));
});
