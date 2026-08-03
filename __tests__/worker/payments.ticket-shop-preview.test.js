/**
 * @jest-environment node
 */

let testUtils;
let handlePaymentRoutes;
let GuardianFortuneChatCreditBalance;
let FusionFortuneTicketBalance;
let originalGuardianFindOne;
let originalFusionFindOne;

async function readResponse(response) {
  return { status: response.status, payload: await response.json() };
}

beforeAll(async () => {
  const paymentsMod = await import("../../worker/routes/payments.js");
  const modelsMod = await import("../../worker/lib/models.js");
  testUtils = paymentsMod.__paymentsTestUtils;
  handlePaymentRoutes = paymentsMod.handlePaymentRoutes;
  GuardianFortuneChatCreditBalance = modelsMod.GuardianFortuneChatCreditBalance;
  FusionFortuneTicketBalance = modelsMod.FusionFortuneTicketBalance;
  originalGuardianFindOne = GuardianFortuneChatCreditBalance.findOne;
  originalFusionFindOne = FusionFortuneTicketBalance.findOne;
});

afterEach(() => {
  GuardianFortuneChatCreditBalance.findOne = originalGuardianFindOne;
  FusionFortuneTicketBalance.findOne = originalFusionFindOne;
});

describe("ticket shop preview", () => {
  const auth = { userId: "64f0a1b2c3d4e5f678901234" };

  test("disabled products return 404 without reading a ticket balance", async () => {
    GuardianFortuneChatCreditBalance.findOne = jest.fn();
    FusionFortuneTicketBalance.findOne = jest.fn();

    const guardian = await readResponse(await testUtils.handleGuardianFortuneCreditShopPreview(auth, {}));
    const fusion = await readResponse(await testUtils.handleFusionFortuneTicketShopPreview(auth, {}));

    expect(guardian).toMatchObject({ status: 404, payload: { ok: false, enabled: false, code: "GUARDIAN_FORTUNE_CREDITS_DISABLED" } });
    expect(fusion).toMatchObject({ status: 404, payload: { ok: false, enabled: false, code: "FUSION_FORTUNE_TICKET_SALES_DISABLED" } });
    expect(GuardianFortuneChatCreditBalance.findOne).not.toHaveBeenCalled();
    expect(FusionFortuneTicketBalance.findOne).not.toHaveBeenCalled();
  });

  test("an unauthenticated preview is rejected before a database ticket read", async () => {
    GuardianFortuneChatCreditBalance.findOne = jest.fn();
    const response = await handlePaymentRoutes(
      new Request("https://example.com/api/payments/guardian-fortune/shop-preview", { method: "GET" }),
      {
        JWT_SECRET: "test-only-secret",
        MONGO_URI: "mongodb://127.0.0.1:27017/test",
        PORTONE_API_SECRET: "test-api-secret",
        PORTONE_CHANNEL_KEY: "test-channel-key",
        PORTONE_STORE_ID: "test-store-id",
      },
    );

    expect(response.status).toBe(401);
    expect(GuardianFortuneChatCreditBalance.findOne).not.toHaveBeenCalled();
  });

  test("each preview returns server-priced PG-only products and a mocked balance in one read", async () => {
    GuardianFortuneChatCreditBalance.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ remaining: 3, purchasedTotal: 6, usedTotal: 3, refundedTotal: 0 }) });
    FusionFortuneTicketBalance.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ totalRemaining: 1, purchasedTotal: 2, usedTotal: 1, refundedTotal: 0 }) });
    const env = { ENABLE_GUARDIAN_FORTUNE_CREDITS: "true", ENABLE_FUSION_FORTUNE_TICKET_SALES: "true" };

    const guardian = await readResponse(await testUtils.handleGuardianFortuneCreditShopPreview(auth, env));
    const fusion = await readResponse(await testUtils.handleFusionFortuneTicketShopPreview(auth, env));

    expect(guardian.status).toBe(200);
    expect(guardian.payload).toMatchObject({ ok: true, enabled: true, balance: { remaining: 3 } });
    expect(guardian.payload.products).toEqual(expect.arrayContaining([
      expect.objectContaining({ productType: "guardian_fortune_conversation_credit", priceKrw: 10000, allowedPurchaseChannels: ["pg"] }),
    ]));
    expect(fusion.status).toBe(200);
    expect(fusion.payload).toMatchObject({ ok: true, enabled: true, balance: { remaining: 1 } });
    expect(fusion.payload.products).toEqual([
      expect.objectContaining({ productId: "fusion_fortune_ticket_1", productType: "fusion_fortune_ticket", priceKRW: 10000, allowedPurchaseChannels: ["pg"] }),
    ]);
    expect(GuardianFortuneChatCreditBalance.findOne).toHaveBeenCalledTimes(1);
    expect(FusionFortuneTicketBalance.findOne).toHaveBeenCalledTimes(1);
  });

  test("a mocked database failure is propagated instead of inventing a zero ticket balance", async () => {
    GuardianFortuneChatCreditBalance.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error("Database temporarily unavailable")) });

    await expect(testUtils.handleGuardianFortuneCreditShopPreview(auth, { ENABLE_GUARDIAN_FORTUNE_CREDITS: "true" }))
      .rejects.toThrow("Database temporarily unavailable");
  });
});
