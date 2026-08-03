/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import {
  GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE,
  assertGuardianFortuneCreditProduct,
  assertGuardianFortuneCreditPurchaseAllowed,
  buildGuardianFortunePurchasePolicySummary,
  createMemoryGuardianFortunePurchaseStore,
  getGuardianFortuneCreditBalance,
  getGuardianFortuneCreditProduct,
  grantGuardianFortunePurchase,
  listGuardianFortuneCreditProducts,
  settleGuardianFortunePayment,
} from "../../worker/lib/guardian-fortune-purchase.js";

describe("Guardian Fortune conversation credit purchase policy", () => {
  it("defines the catalog with the fixed prices and credit amounts", () => {
    expect(listGuardianFortuneCreditProducts()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        productId: "guardian_fortune_chat_3",
        productName: "달빛 귀인 대화권 3회",
        productType: GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE,
        priceKrw: 10000,
        creditAmount: 3,
        badge: "가볍게 더 보기",
        allowedPurchaseChannels: ["pg"],
      }),
      expect.objectContaining({
        productId: "guardian_fortune_chat_10",
        productName: "달빛 귀인 대화권 10회",
        productType: GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE,
        priceKrw: 30000,
        creditAmount: 10,
        badge: "가장 합리적",
        allowedPurchaseChannels: ["pg"],
      }),
    ]));
  });

  it("allows PG and blocks pass, entitlement, credit, and coverage channels", () => {
    expect(assertGuardianFortuneCreditPurchaseAllowed("pg", "guardian_fortune_chat_3")).toMatchObject({ channel: "pg" });
    for (const channel of [
      "monthly_membership_payment",
      "pass",
      "family_pass",
      "free_pass",
      "event_pass",
      "credit",
      "conversation_credit",
      "entitlement",
      "price_coverage",
    ]) {
      expect(() => assertGuardianFortuneCreditPurchaseAllowed(channel, "guardian_fortune_chat_3"))
        .toThrow("PG");
    }
    expect(buildGuardianFortunePurchasePolicySummary()).toMatchObject({
      productType: GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE,
      allowedPurchaseChannels: ["pg"],
      monthlyMembershipPayment: "disabled_until_separate_monetary_flow_exists",
    });
  });

  it("rejects client product type and amount tampering", () => {
    expect(() => assertGuardianFortuneCreditProduct({
      productId: "guardian_fortune_chat_3",
      productType: "membership_pass",
      amount: 10000,
    })).toThrow("상품 유형");
    expect(() => assertGuardianFortuneCreditProduct({
      productId: "guardian_fortune_chat_3",
      productType: GUARDIAN_FORTUNE_CREDIT_PRODUCT_TYPE,
      amount: 30000,
    })).toThrow("가격");
  });

  it("grants a purchase once and remains idempotent for the same payment", async () => {
    const store = createMemoryGuardianFortunePurchaseStore();
    const first = await grantGuardianFortunePurchase({
      userId: "user-1",
      productId: "guardian_fortune_chat_3",
      paymentId: "payment-1",
      store,
    });
    const duplicate = await grantGuardianFortunePurchase({
      userId: "user-1",
      productId: "guardian_fortune_chat_3",
      paymentId: "payment-1",
      store,
    });

    expect(first).toMatchObject({ ok: true, idempotent: false, balanceAfter: 3 });
    expect(duplicate).toMatchObject({ ok: true, idempotent: true, balanceAfter: 3 });
    expect(await getGuardianFortuneCreditBalance("user-1", { store })).toMatchObject({
      remaining: 3,
      purchasedTotal: 3,
    });
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0]).toMatchObject({ type: "purchase", amount: 3, paymentId: "payment-1" });
  });

  it("settles only a paid KRW order with the catalog amount", async () => {
    const store = createMemoryGuardianFortunePurchaseStore();
    const order = {
      _id: "order-1",
      userId: "user-2",
      merchantUid: "payment-2",
      paymentType: "digital_content",
      accessType: "single_purchase",
      productId: "guardian_fortune_chat_10",
      paymentAmount: 30000,
      metadata: { guardianFortuneCredit: true },
      status: "pending",
    };
    let updated = null;
    const paymentModel = {
      findOne: () => ({ lean: async () => order }),
      findOneAndUpdate: () => ({ lean: async () => ({ ...order, ...(updated || {}) }) }),
      updateOne: async () => undefined,
    };
    const result = await settleGuardianFortunePayment({
      paymentId: "payment-2",
      userId: "user-2",
      paymentModel,
      fetchPayment: async () => ({ status: "paid", amount: 30000, currency: "KRW" }),
      grant: (args) => grantGuardianFortunePurchase({ ...args, store }),
    });

    updated = result.payment;
    expect(result).toMatchObject({ ok: true, idempotent: false, balanceAfter: 10 });
    expect(result.product).toEqual(getGuardianFortuneCreditProduct("guardian_fortune_chat_10"));
    expect(store.transactions[0]).toMatchObject({ amount: 10, type: "purchase" });
  });

  it("does not grant credits when provider amount verification fails", async () => {
    const store = createMemoryGuardianFortunePurchaseStore();
    const order = {
      _id: "order-3",
      userId: "user-3",
      merchantUid: "payment-3",
      paymentType: "digital_content",
      accessType: "single_purchase",
      productId: "guardian_fortune_chat_3",
      paymentAmount: 10000,
      metadata: { guardianFortuneCredit: true },
    };
    const paymentModel = {
      findOne: () => ({ lean: async () => order }),
      updateOne: async () => undefined,
    };
    await expect(settleGuardianFortunePayment({
      paymentId: "payment-3",
      userId: "user-3",
      paymentModel,
      fetchPayment: async () => ({ status: "paid", amount: 9999, currency: "KRW" }),
      grant: (args) => grantGuardianFortunePurchase({ ...args, store }),
    })).rejects.toMatchObject({ code: "GUARDIAN_FORTUNE_PAYMENT_MISMATCH" });
    expect(store.transactions).toHaveLength(0);
  });
});
