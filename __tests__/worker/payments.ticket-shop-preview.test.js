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

  test("both shops stay closed even when their retired env flags are turned on", async () => {
    // 두 상담이 표준 회당 결제로 옮겨가면서 워커가 대화권·상담권을 더 이상 소비하지 않는다.
    // 플래그를 되살려 상점을 다시 열면 소비 불가능한 재화를 파는 상태가 된다.
    GuardianFortuneChatCreditBalance.findOne = jest.fn();
    FusionFortuneTicketBalance.findOne = jest.fn();
    const env = { ENABLE_GUARDIAN_FORTUNE_CREDITS: "true", ENABLE_FUSION_FORTUNE_TICKET_SALES: "true" };

    const guardian = await readResponse(await testUtils.handleGuardianFortuneCreditShopPreview(auth, env));
    const fusion = await readResponse(await testUtils.handleFusionFortuneTicketShopPreview(auth, env));

    expect(guardian).toMatchObject({ status: 404, payload: { ok: false, enabled: false, code: "GUARDIAN_FORTUNE_CREDITS_DISABLED" } });
    expect(fusion).toMatchObject({ status: 404, payload: { ok: false, enabled: false, code: "FUSION_FORTUNE_TICKET_SALES_DISABLED" } });
    expect(GuardianFortuneChatCreditBalance.findOne).not.toHaveBeenCalled();
    expect(FusionFortuneTicketBalance.findOne).not.toHaveBeenCalled();
  });
});
