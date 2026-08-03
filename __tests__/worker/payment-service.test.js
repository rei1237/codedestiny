/**
 * @jest-environment node
 */

const path = require("path");
const { pathToFileURL } = require("url");

async function loadPaymentService() {
  return import(pathToFileURL(path.resolve(__dirname, "../../worker/lib/payment-service.js")).href);
}

describe("server payment service boundary", () => {
  test("only an explicit membership-pass command verifies the pass", async () => {
    const service = await loadPaymentService();

    expect(service.resolvePaymentCommand({ paymentMode: "MEMBERSHIP_PASS" }).method)
      .toBe(service.PAYMENT_METHODS.MEMBERSHIP_PASS);
    expect(service.resolvePaymentCommand({ paymentMode: "MONTHLY" }).method)
      .toBe(service.PAYMENT_METHODS.MONTHLY);
    expect(service.resolvePaymentCommand({ paymentMode: "DIRECT_KRW" }).method)
      .toBe(service.PAYMENT_METHODS.DIRECT_KRW);
    expect(service.shouldVerifyMembershipPass(service.PAYMENT_METHODS.MEMBERSHIP_PASS)).toBe(true);
    expect(service.shouldVerifyMembershipPass(service.PAYMENT_METHODS.MONTHLY)).toBe(false);
    expect(service.shouldVerifyMembershipPass(service.PAYMENT_METHODS.DIRECT_KRW)).toBe(false);
  });

  test("executePayment preserves the single command contract", async () => {
    const service = await loadPaymentService();
    const handler = jest.fn(async (command) => command);
    const log = jest.fn();

    const result = await service.executePayment({
      method: service.PAYMENT_METHODS.MONTHLY,
      productId: " product-1 ",
      featureKey: " feature-1 ",
      profileId: " profile-1 ",
      requestId: " request-1 ",
      priceQuoteToken: " quote-1 ",
      context: { log, snapshotUsed: false, dbDurationMs: 12 },
      handlers: { [service.PAYMENT_METHODS.MONTHLY]: handler },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      method: service.PAYMENT_METHODS.MONTHLY,
      productId: "product-1",
      featureKey: "feature-1",
      profileId: "profile-1",
      requestId: "request-1",
      priceQuoteToken: "quote-1",
    });
    expect(log).toHaveBeenCalledWith(expect.objectContaining({
      event: "payment_command",
      method: service.PAYMENT_METHODS.MONTHLY,
      requestId: "request-1",
      dbDurationMs: 12,
      failureCode: "",
    }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("quote-1");
  });

  test("monthly operation commits once and always closes its session", async () => {
    const service = await loadPaymentService();
    const session = {
      withTransaction: jest.fn(async (operation) => operation()),
      endSession: jest.fn(async () => {}),
    };
    const operation = jest.fn(async () => ({ ok: true }));

    await expect(service.runAtomicMonthlyPayment({
      mongoose: { startSession: jest.fn(async () => session) },
      operation,
    })).resolves.toEqual({ ok: true });
    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  test("unsupported transactions fail safely without a fallback write", async () => {
    const service = await loadPaymentService();
    const session = {
      withTransaction: jest.fn(async () => {
        throw new Error("Transaction numbers are only allowed on a replica set member");
      }),
      endSession: jest.fn(async () => {}),
    };
    const operation = jest.fn();

    await expect(service.runAtomicMonthlyPayment({
      mongoose: { startSession: jest.fn(async () => session) },
      operation,
    })).rejects.toMatchObject({ code: "MONTHLY_ATOMIC_UNAVAILABLE", status: 503, retryable: true });
    expect(operation).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });
});
