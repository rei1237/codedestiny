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

  // 프로필 스코프 키(section_summary)인데 주문에 profileId 가 없는 경우.
  // 프로필 카드가 0개인 계정이 결제하면 셸 자동주입도 서버 폴백도 빈 값을 낸다.
  const profileScopedOrderWithoutProfile = {
    ...order,
    _id: "payment-doc-noprofile-001",
    merchantUid: "pay_noprofile_001",
    pricingSnapshot: {
      contentId: "full_reading",
      contentKey: "full_reading",
      contentType: "saju_unlock",
      serviceId: "saju",
    },
  };

  // 회당 결제(PER_USE) 키. 타로·관상·꿈해몽처럼 프로필 카드 개념이 아예 없다.
  const perUseOrderWithoutProfile = {
    _id: "payment-doc-tarot-001",
    userId: auth.userId,
    merchantUid: "pay_tarot_001",
    paymentType: "digital_content",
    accessType: "single_purchase",
    status: "pending",
    paymentAmount: 5000,
    expectedChargedPoints: 50,
    coinPrice: 50,
    featureKey: "tarot-mindscan",
    productId: "tarot",
    pricingSnapshot: {
      categoryKey: "tarot",
      contentId: "tarot-mindscan",
      amountKRW: 5000,
    },
  };

  // 음악 트랙 다운로드처럼 프로필 카드 개념이 없는 계정 스코프 단건결제.
  // pricingSnapshot 에 profileId 가 없다 — 예전에는 이 때문에 프로필 엔타이틀먼트 저장이
  // INVALID_UNLOCK_TARGET 으로 실패하고, Transaction.Paid 웹훅이 결제를 자동 전액 환불하며
  // 권한까지 회수해 사용자가 같은 곡을 계속 다시 결제해야 했다.
  const accountScopedOrder = {
    _id: "payment-doc-music-001",
    userId: auth.userId,
    merchantUid: "pay_music_001",
    paymentType: "digital_content",
    accessType: "single_purchase",
    status: "pending",
    paymentAmount: 1000,
    expectedChargedPoints: 10,
    coinPrice: 10,
    featureKey: "music-track-0rhpuvh",
    productId: "unlock.music-track-0rhpuvh",
    pricingSnapshot: {
      categoryKey: "music-track",
      contentId: "music-track-0rhpuvh",
      amountKRW: 1000,
    },
  };

  test("profileId 없는 계정 스코프 단건결제는 환불되지 않고 권한이 기록된다", async () => {
    let paymentFindOneCall = 0;
    Payment.findOne = jest.fn(() => {
      paymentFindOneCall += 1;
      return queryResult(paymentFindOneCall === 1 ? accountScopedOrder : null);
    });
    Payment.findOneAndUpdate = jest.fn().mockReturnValue(queryResult({
      ...accountScopedOrder,
      status: "processing",
      orderState: "PAID_VERIFIED",
      paidAt: new Date("2026-06-30T00:00:00.000Z"),
    }));
    Payment.findById = jest.fn().mockReturnValue(queryResult({ ...accountScopedOrder, status: "processing" }));
    Payment.findByIdAndUpdate = jest.fn().mockReturnValue(queryResult({
      ...accountScopedOrder,
      status: "fulfilled",
      orderState: "UNLOCKED",
    }));
    ContentEntitlement.findOne = jest.fn().mockReturnValue(queryResult(null));
    ContentEntitlement.findOneAndUpdate = jest.fn().mockReturnValue(queryResult({
      _id: "ent-music-001",
      profileId: "__user__",
      scope: "USER",
      contentKey: "music-track-0rhpuvh",
    }));
    User.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    PaymentFailureLog.create = jest.fn().mockResolvedValue({});
    global.fetch = jest.fn(async () => new Response(JSON.stringify({
      payment: {
        paymentId: "pay_music_001",
        status: "PAID",
        storeId: "store_test_001",
        amount: { total: 1000, currency: "KRW" },
        paidAt: "2026-06-30T00:00:00.000Z",
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const request = new Request("https://example.com/api/payments/single/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentId: "pay_music_001" }),
    });

    const response = await testUtils.handleSinglePaymentComplete(request, env, auth);
    const parsed = await readResponse(response);

    expect(parsed.status).toBe(200);
    expect(parsed.payload.ok).toBe(true);
    expect(parsed.payload.status).toBe("UNLOCKED");
    // PortOne 단건 조회 1회만 — 취소(환불) 호출이 붙으면 회귀다.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String(global.fetch.mock.calls[0][0])).not.toContain("/cancel");
    // 계정 스코프 권한은 그대로 기록된다(= 다운로드가 열린다).
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: auth.userId },
      expect.objectContaining({
        $addToSet: expect.objectContaining({
          paidFeatures: "music-track-0rhpuvh",
          unlockedFeatures: "music-track-0rhpuvh",
        }),
      }),
      undefined,
    );
    // 🔴 해금 기록은 USER 스코프로 남아야 한다. 아예 남기지 않으면 잠금 상품의 전달 증거가 사라져
    // "결과를 못 받았다" 자기신고 환불(resolvePaidResultDelivery)이 소비 후에도 그대로 통과한다.
    expect(ContentEntitlement.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: "__user__", scope: "USER" }),
      expect.anything(),
      expect.anything(),
    );
  });

  test("계정 스코프 키는 주문에 profileId 가 실려 있어도 USER 스코프로 기록된다", async () => {
    // 정적 셸(_cdBuildDirectCheckoutPayload)은 모든 단건 결제에 현재 프로필을 자동 주입한다.
    // 그걸 그대로 쓰면 계정 단위 상품이 프로필 단위로 잠겨, 프로필을 바꾸는 순간 재잠김된다.
    const orderWithStrayProfileId = {
      ...accountScopedOrder,
      _id: "payment-doc-music-002",
      merchantUid: "pay_music_002",
      pricingSnapshot: { ...accountScopedOrder.pricingSnapshot, profileId: "profile_777" },
    };

    let paymentFindOneCall = 0;
    Payment.findOne = jest.fn(() => {
      paymentFindOneCall += 1;
      return queryResult(paymentFindOneCall === 1 ? orderWithStrayProfileId : null);
    });
    Payment.findOneAndUpdate = jest.fn().mockReturnValue(queryResult({
      ...orderWithStrayProfileId,
      status: "processing",
      orderState: "PAID_VERIFIED",
      paidAt: new Date("2026-06-30T00:00:00.000Z"),
    }));
    Payment.findById = jest.fn().mockReturnValue(queryResult({ ...orderWithStrayProfileId, status: "processing" }));
    Payment.findByIdAndUpdate = jest.fn().mockReturnValue(queryResult({
      ...orderWithStrayProfileId,
      status: "fulfilled",
      orderState: "UNLOCKED",
    }));
    ContentEntitlement.findOne = jest.fn().mockReturnValue(queryResult(null));
    ContentEntitlement.findOneAndUpdate = jest.fn().mockReturnValue(queryResult({ _id: "ent-music-002" }));
    User.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    PaymentFailureLog.create = jest.fn().mockResolvedValue({});
    global.fetch = jest.fn(async () => new Response(JSON.stringify({
      payment: {
        paymentId: "pay_music_002",
        status: "PAID",
        storeId: "store_test_001",
        amount: { total: 1000, currency: "KRW" },
        paidAt: "2026-06-30T00:00:00.000Z",
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const request = new Request("https://example.com/api/payments/single/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentId: "pay_music_002" }),
    });

    const parsed = await readResponse(await testUtils.handleSinglePaymentComplete(request, env, auth));

    expect(parsed.status).toBe(200);
    expect(ContentEntitlement.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ profileId: "__user__", scope: "USER" }),
      expect.anything(),
      expect.anything(),
    );
  });

  test("profileId 없는 회당결제(PER_USE)도 환불되지 않고 권한이 기록된다", async () => {
    let paymentFindOneCall = 0;
    Payment.findOne = jest.fn(() => {
      paymentFindOneCall += 1;
      return queryResult(paymentFindOneCall === 1 ? perUseOrderWithoutProfile : null);
    });
    Payment.findOneAndUpdate = jest.fn().mockReturnValue(queryResult({
      ...perUseOrderWithoutProfile,
      status: "processing",
      orderState: "PAID_VERIFIED",
      paidAt: new Date("2026-06-30T00:00:00.000Z"),
    }));
    Payment.findById = jest.fn().mockReturnValue(queryResult({ ...perUseOrderWithoutProfile, status: "processing" }));
    Payment.findByIdAndUpdate = jest.fn().mockReturnValue(queryResult({
      ...perUseOrderWithoutProfile,
      status: "fulfilled",
      orderState: "UNLOCKED",
    }));
    ContentEntitlement.findOne = jest.fn().mockReturnValue(queryResult(null));
    ContentEntitlement.findOneAndUpdate = jest.fn().mockReturnValue(queryResult({ _id: "ent-tarot-001" }));
    User.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    PaymentFailureLog.create = jest.fn().mockResolvedValue({});
    global.fetch = jest.fn(async () => new Response(JSON.stringify({
      payment: {
        paymentId: "pay_tarot_001",
        status: "PAID",
        storeId: "store_test_001",
        amount: { total: 5000, currency: "KRW" },
        paidAt: "2026-06-30T00:00:00.000Z",
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const request = new Request("https://example.com/api/payments/single/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentId: "pay_tarot_001" }),
    });

    const parsed = await readResponse(await testUtils.handleSinglePaymentComplete(request, env, auth));

    expect(parsed.status).toBe(200);
    expect(parsed.payload.ok).toBe(true);
    // 취소(환불) 호출이 붙으면 회귀다.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String(global.fetch.mock.calls[0][0])).not.toContain("/cancel");
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: auth.userId },
      expect.objectContaining({
        $addToSet: expect.objectContaining({ paidFeatures: "tarot-mindscan" }),
      }),
      undefined,
    );
  });

  test("프로필 스코프 키의 profileId 결손은 환불이 아니라 관리자 검토로 보류된다", async () => {
    let paymentFindOneCall = 0;
    Payment.findOne = jest.fn(() => {
      paymentFindOneCall += 1;
      return queryResult(paymentFindOneCall === 1 ? profileScopedOrderWithoutProfile : null);
    });
    Payment.findOneAndUpdate = jest.fn().mockReturnValue(queryResult({
      ...profileScopedOrderWithoutProfile,
      status: "processing",
      orderState: "PAID_VERIFIED",
      paidAt: new Date("2026-06-30T00:00:00.000Z"),
    }));
    Payment.findById = jest.fn().mockReturnValue(queryResult({ ...profileScopedOrderWithoutProfile, status: "processing" }));
    Payment.findByIdAndUpdate = jest.fn().mockReturnValue(queryResult({ ...profileScopedOrderWithoutProfile }));
    ContentEntitlement.findOne = jest.fn().mockReturnValue(queryResult(null));
    ContentEntitlement.findOneAndUpdate = jest.fn(() => {
      throw new Error("entitlement must not be attempted without a profile id");
    });
    ContentEntitlement.updateMany = jest.fn().mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    User.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    PaymentFailureLog.create = jest.fn().mockResolvedValue({});
    global.fetch = jest.fn(async () => new Response(JSON.stringify({
      payment: {
        paymentId: "pay_noprofile_001",
        status: "PAID",
        storeId: "store_test_001",
        amount: { total: 12000, currency: "KRW" },
        paidAt: "2026-06-30T00:00:00.000Z",
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const request = new Request("https://example.com/api/payments/single/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentId: "pay_noprofile_001" }),
    });

    const parsed = await readResponse(await testUtils.handleSinglePaymentComplete(request, env, auth));

    expect(parsed.payload.code).toBe("UNLOCK_RECORD_DEFERRED_ADMIN_REVIEW");
    expect(parsed.payload.refundStatus).toBe("not_refunded");
    expect(parsed.payload.adminReviewRequired).toBe(true);
    // 🔴 PortOne 단건 조회 1회뿐 — 취소 호출이 늘면 사용자 돈이 되돌아간 것이다.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String(global.fetch.mock.calls[0][0])).not.toContain("/cancel");
    // 권한은 해금 기록보다 먼저 지급된다 — 그래야 "환불 없이 보류"가 사용자에게 성립한다.
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: auth.userId },
      expect.objectContaining({
        $addToSet: expect.objectContaining({ paidFeatures: "section_summary" }),
      }),
      undefined,
    );
    // 권한 회수($pull)가 일어나면 회귀다.
    expect(User.updateOne).not.toHaveBeenCalledWith(
      { _id: auth.userId },
      expect.objectContaining({ $pull: expect.anything() }),
    );
    expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith("payment-doc-noprofile-001", expect.objectContaining({
      $set: expect.objectContaining({
        failureCode: "delivery_failed_manual_review",
        failureStage: "single_unlock_upsert",
      }),
    }));
  });

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
