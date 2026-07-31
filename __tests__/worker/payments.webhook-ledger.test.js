/**
 * @jest-environment node
 */

let testUtils;
let Payment;
let PaymentWebhookEvent;
let PaymentFailureLog;
let ContentEntitlement;
let User;
let originalFetch;
let originals;

function queryResult(result) {
  const chain = {
    lean: jest.fn().mockResolvedValue(result),
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    session: jest.fn(() => chain),
    catch: jest.fn(async () => result),
  };
  return chain;
}

async function readResponse(response) {
  const payload = await response.json();
  return { status: response.status, payload };
}

async function buildWebhookRequest(body, eventId = "evt_test_001") {
  const rawBody = JSON.stringify(body);
  const timestamp = "1782864000";
  const secret = "whsec_test_secret";
  const signature = await testUtils.signStandardWebhookPayload(secret, eventId, timestamp, rawBody);
  return new Request("https://example.com/api/payments/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": eventId,
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`,
    },
    body: rawBody,
  });
}

beforeAll(async () => {
  const paymentsMod = await import("../../worker/routes/payments.js");
  const modelsMod = await import("../../worker/lib/models.js");

  testUtils = paymentsMod.__paymentsTestUtils;
  Payment = modelsMod.Payment;
  PaymentWebhookEvent = modelsMod.PaymentWebhookEvent;
  PaymentFailureLog = modelsMod.PaymentFailureLog;
  ContentEntitlement = modelsMod.ContentEntitlement;
  User = modelsMod.User;

  originalFetch = global.fetch;
  originals = {
    paymentFindOne: Payment.findOne,
    paymentFindOneAndUpdate: Payment.findOneAndUpdate,
    paymentFindById: Payment.findById,
    paymentFindByIdAndUpdate: Payment.findByIdAndUpdate,
    webhookCreate: PaymentWebhookEvent.create,
    webhookFindOne: PaymentWebhookEvent.findOne,
    webhookFindOneAndUpdate: PaymentWebhookEvent.findOneAndUpdate,
    webhookFindByIdAndUpdate: PaymentWebhookEvent.findByIdAndUpdate,
    failureLogCreate: PaymentFailureLog.create,
    entitlementFindOne: ContentEntitlement.findOne,
    entitlementFindOneAndUpdate: ContentEntitlement.findOneAndUpdate,
    entitlementUpdateMany: ContentEntitlement.updateMany,
    userUpdateOne: User.updateOne,
  };
});

afterEach(() => {
  global.fetch = originalFetch;
  Payment.findOne = originals.paymentFindOne;
  Payment.findOneAndUpdate = originals.paymentFindOneAndUpdate;
  Payment.findById = originals.paymentFindById;
  Payment.findByIdAndUpdate = originals.paymentFindByIdAndUpdate;
  PaymentWebhookEvent.create = originals.webhookCreate;
  PaymentWebhookEvent.findOne = originals.webhookFindOne;
  PaymentWebhookEvent.findOneAndUpdate = originals.webhookFindOneAndUpdate;
  PaymentWebhookEvent.findByIdAndUpdate = originals.webhookFindByIdAndUpdate;
  PaymentFailureLog.create = originals.failureLogCreate;
  ContentEntitlement.findOne = originals.entitlementFindOne;
  ContentEntitlement.findOneAndUpdate = originals.entitlementFindOneAndUpdate;
  ContentEntitlement.updateMany = originals.entitlementUpdateMany;
  User.updateOne = originals.userUpdateOne;
  jest.restoreAllMocks();
});

describe("PortOne webhook event ledger", () => {
  const env = {
    PORTONE_API_SECRET: "portone-test-secret",
    PORTONE_CHANNEL_KEY: "channel-test-key",
    PORTONE_STORE_ID: "store_test_001",
    PORTONE_WEBHOOK_SECRET: "whsec_test_secret",
  };

  test("webhook replay processes first event and ignores the duplicate event id", async () => {
    const body = { type: "Transaction.Failed", data: { paymentId: "pay_replay_001" } };

    PaymentWebhookEvent.create = jest.fn().mockResolvedValue({ _id: "evt-doc-001" });
    PaymentWebhookEvent.findByIdAndUpdate = jest.fn().mockResolvedValue({});
    Payment.findOneAndUpdate = jest.fn().mockReturnValue(queryResult({ merchantUid: "pay_replay_001" }));
    PaymentFailureLog.create = jest.fn().mockResolvedValue({});

    const first = await testUtils.handleWebhook(await buildWebhookRequest(body), env);
    const firstResult = await readResponse(first);

    expect(firstResult.status).toBe(200);
    expect(firstResult.payload.status).toBe("FAILED");
    expect(PaymentWebhookEvent.create).toHaveBeenCalledTimes(1);
    expect(PaymentWebhookEvent.findByIdAndUpdate).toHaveBeenCalledWith("evt-doc-001", expect.objectContaining({
      $set: expect.objectContaining({ status: "processed" }),
    }));
    expect(Payment.findOneAndUpdate).toHaveBeenCalledTimes(1);

    PaymentWebhookEvent.create = jest.fn().mockRejectedValue({ code: 11000 });
    PaymentWebhookEvent.findOne = jest.fn().mockReturnValue(queryResult({ status: "processed" }));
    Payment.findOneAndUpdate = jest.fn();

    const duplicate = await testUtils.handleWebhook(await buildWebhookRequest(body), env);
    const duplicateResult = await readResponse(duplicate);

    expect(duplicateResult.status).toBe(200);
    expect(duplicateResult.payload.duplicate).toBe(true);
    expect(duplicateResult.payload.ignored).toBe(true);
    expect(Payment.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test("Transaction.Paid webhook with ctx returns an immediate ack and defers heavy work to waitUntil", async () => {
    const body = { type: "Transaction.Paid", data: { paymentId: "pay_ack_001" } };

    PaymentWebhookEvent.create = jest.fn().mockResolvedValue({ _id: "evt-doc-ack" });
    PaymentWebhookEvent.findByIdAndUpdate = jest.fn().mockResolvedValue({});
    // 주문 없음 → 백그라운드 처리는 404로 실패 확정된다(포트원 조회까지 가지 않음).
    Payment.findOne = jest.fn().mockReturnValue(queryResult(null));
    PaymentFailureLog.create = jest.fn().mockResolvedValue({});

    const deferred = [];
    const ctx = { waitUntil: jest.fn((promise) => deferred.push(promise)) };

    const response = await testUtils.handleWebhook(await buildWebhookRequest(body, "evt_ack_001"), env, ctx);
    const result = await readResponse(response);

    // 즉시-ack: 백그라운드가 만드는 404가 아니라 200 accepted가 반환되어야 한다(포트원 웹훅 타임아웃 방지).
    expect(result.status).toBe(200);
    expect(result.payload.accepted).toBe(true);
    expect(result.payload.type).toBe("Transaction.Paid");
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1);

    // 백그라운드 처리를 완료시키면 이벤트가 failed로 확정된다(다음 재조정에서 재처리 대상).
    await Promise.all(deferred);
    expect(Payment.findOne).toHaveBeenCalled();
    expect(PaymentWebhookEvent.findByIdAndUpdate).toHaveBeenCalledWith("evt-doc-ack", expect.objectContaining({
      $set: expect.objectContaining({ status: "failed" }),
    }));
  });

  test("Transaction.Paid webhook without ctx falls back to inline processing", async () => {
    const body = { type: "Transaction.Paid", data: { paymentId: "pay_inline_001" } };

    PaymentWebhookEvent.create = jest.fn().mockResolvedValue({ _id: "evt-doc-inline" });
    PaymentWebhookEvent.findByIdAndUpdate = jest.fn().mockResolvedValue({});
    // 주문 없음 → 인라인 경로는 실제 결과(404)를 그대로 반환한다(즉시-ack 아님).
    Payment.findOne = jest.fn().mockReturnValue(queryResult(null));
    PaymentFailureLog.create = jest.fn().mockResolvedValue({});

    const response = await testUtils.handleWebhook(await buildWebhookRequest(body, "evt_inline_001"), env);
    const result = await readResponse(response);

    expect(result.status).toBe(404);
    expect(result.payload.accepted).toBeUndefined();
    expect(Payment.findOne).toHaveBeenCalled();
    expect(PaymentWebhookEvent.findByIdAndUpdate).toHaveBeenCalledWith("evt-doc-inline", expect.objectContaining({
      $set: expect.objectContaining({ status: "failed" }),
    }));
  });
});

describe("single payment entitlement consistency", () => {
  const env = {
    PORTONE_API_SECRET: "portone-test-secret",
    PORTONE_CHANNEL_KEY: "channel-test-key",
    PORTONE_STORE_ID: "store_test_001",
  };
  const auth = { userId: "64f0a1b2c3d4e5f678901234" };
  const order = {
    _id: "payment-doc-001",
    userId: auth.userId,
    merchantUid: "pay_single_001",
    paymentType: "digital_content",
    accessType: "single_purchase",
    status: "pending",
    paymentAmount: 12000,
    expectedChargedPoints: 150,
    coinPrice: 150,
    featureKey: "section_summary",
    productId: "saju",
    pricingSnapshot: {
      profileId: "profile_001",
      contentId: "full_reading",
      contentKey: "full_reading",
      contentType: "saju_unlock",
      serviceId: "saju",
    },
  };

  test("entitlement grant failure triggers automatic full refund", async () => {
    let paymentFindOneCall = 0;
    Payment.findOne = jest.fn(() => {
      paymentFindOneCall += 1;
      return queryResult(paymentFindOneCall === 1 ? order : null);
    });
    Payment.findOneAndUpdate = jest.fn().mockReturnValue(queryResult({
      ...order,
      status: "processing",
      orderState: "PAID_VERIFIED",
      paidAt: new Date("2026-06-30T00:00:00.000Z"),
    }));
    Payment.findById = jest.fn().mockReturnValue(queryResult({ ...order, status: "processing" }));
    Payment.findByIdAndUpdate = jest.fn().mockReturnValue(queryResult({ ...order, status: "processing", orderState: "ERROR" }));
    ContentEntitlement.findOne = jest.fn().mockReturnValue(queryResult(null));
    ContentEntitlement.findOneAndUpdate = jest.fn(() => {
      throw new Error("entitlement db down");
    });
    ContentEntitlement.updateMany = jest.fn().mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    User.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    PaymentFailureLog.create = jest.fn().mockResolvedValue({});
    global.fetch = jest.fn(async () => new Response(JSON.stringify({
      payment: {
        paymentId: "pay_single_001",
        status: "PAID",
        storeId: "store_test_001",
        amount: { total: 12000, currency: "KRW" },
        paidAt: "2026-06-30T00:00:00.000Z",
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const request = new Request("https://example.com/api/payments/single/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentId: "pay_single_001" }),
    });

    const response = await testUtils.handleSinglePaymentComplete(request, env, auth);
    const parsed = await readResponse(response);

    expect(parsed.status).toBe(502);
    expect(parsed.payload.ok).toBe(false);
    expect(parsed.payload.code).toBe("AUTO_REFUNDED_UNLOCK_UPSERT_FAILED");
    expect(parsed.payload.refundStatus).toBe("refunded");
    expect(Payment.findOneAndUpdate.mock.calls[0][1].$set.status).toBe("processing");
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(String(global.fetch.mock.calls[1][0])).toContain("/payments/pay_single_001/cancel");
    // 🔴 콜론이 아니라 언더스코어다. PortOne 은 Idempotency-Key 형식을 검증하며(실측: 16~256자,
    // ":" 불가) 예전의 `refund:<id>:<svc>:<job>` 형식은 항상 400 INVALID_REQUEST 로 거절당했다 —
    // 즉 이 테스트가 고정하던 값은 실제로는 자동환불을 한 번도 성공시키지 못하는 형식이었다.
    // 정규화는 PG 로 나가는 단일 지점(worker/lib/portone.js normalizePortOneIdempotencyKey)에서 한다.
    expect(global.fetch.mock.calls[1][1].headers["Idempotency-Key"]).toBe("refund_pay_single_001_saju_no-job");
    expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith("payment-doc-001", expect.objectContaining({
      $set: expect.objectContaining({
        status: "cancelled",
        orderState: "CANCELLED",
        failureCode: "unlock_upsert_failed",
        failureStage: "single_unlock_upsert",
        "metadata.refundStatus": "refunded",
      }),
    }), { returnDocument: "after" });
  });

  test("full cancellation webhook revokes entitlement and paid feature access", async () => {
    Payment.findOne = jest.fn().mockReturnValue(queryResult({
      ...order,
      status: "fulfilled",
      orderState: "UNLOCKED",
      paidAt: new Date("2026-06-30T00:00:00.000Z"),
    }));
    Payment.findByIdAndUpdate = jest.fn().mockReturnValue(queryResult({
      ...order,
      status: "cancelled",
      orderState: "CANCELLED",
    }));
    ContentEntitlement.updateMany = jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    User.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

    const response = await testUtils.markPaymentCancellationForAdminReview({
      request: new Request("https://example.com/api/payments/webhook", { method: "POST" }),
      paymentId: "pay_single_001",
      body: { type: "Transaction.Cancelled", data: { paymentId: "pay_single_001" } },
      partial: false,
    });
    const parsed = await readResponse(response);

    expect(parsed.status).toBe(200);
    expect(parsed.payload.unlockRevoked).toBe(true);
    expect(parsed.payload.adminReviewRequired).toBe(false);
    expect(ContentEntitlement.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      userId: auth.userId,
      source: "PAYMENT",
      status: "ACTIVE",
    }), expect.objectContaining({
      $set: expect.objectContaining({ status: "CANCELLED" }),
    }));
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: auth.userId },
      expect.objectContaining({
        $pull: expect.objectContaining({
          paidFeatures: expect.objectContaining({ $in: expect.arrayContaining(["section_summary"]) }),
          unlockedFeatures: expect.objectContaining({ $in: expect.arrayContaining(["section_summary"]) }),
        }),
      }),
    );
    expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith("payment-doc-001", expect.objectContaining({
      $set: expect.objectContaining({
        status: "cancelled",
        orderState: "CANCELLED",
        "metadata.unlockRevoked": true,
        "pricingSnapshot.cancellationReviewRequired": false,
      }),
    }));
  });
});
