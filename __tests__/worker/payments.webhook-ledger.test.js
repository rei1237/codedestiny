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

  test("entitlement grant failure leaves payment in processing/error instead of success", async () => {
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

    await expect(testUtils.handleSinglePaymentComplete(request, env, auth))
      .rejects.toThrow("entitlement db down");

    expect(Payment.findOneAndUpdate.mock.calls[0][1].$set.status).toBe("processing");
    expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith("payment-doc-001", expect.objectContaining({
      $set: expect.objectContaining({
        orderState: "ERROR",
        failureCode: "unlock_upsert_failed",
      }),
    }));
  });
});
