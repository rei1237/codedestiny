const path = require("path");

function loadFreshService() {
  const modulePath = path.resolve(__dirname, "../../js/core/payment-service.js");
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

describe("shared browser Payment Service", () => {
  beforeEach(() => {
    global.CodeDestinyAccessStore = undefined;
    global.CustomEvent = class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init && init.detail;
      }
    };
    global.dispatchEvent = jest.fn();
  });

  test("twenty identical commands execute once", async () => {
    const service = loadFreshService();
    const executor = jest.fn(async () => ({ ok: true }));
    const command = { method: "MONTHLY", requestId: "request-20", featureKey: "feature-1" };

    const results = await Promise.all(Array.from({ length: 20 }, () => service.executePayment(command, executor)));

    expect(executor).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(20);
  });

  test("snapshot coverage returns immediately and verifies once in background", async () => {
    const service = loadFreshService();
    const backgroundVerify = jest.fn(async () => ({ ok: true }));
    const command = {
      method: "MEMBERSHIP_PASS",
      requestId: "snapshot-1",
      operationId: "snapshot-op-1",
      featureKey: "feature-pass",
      snapshotCovered: true,
      backgroundVerify,
    };

    const results = await Promise.all(Array.from({ length: 20 }, () => service.executePayment(command)));
    await new Promise((resolve) => setImmediate(resolve));

    expect(results.every((result) => result.optimistic === true)).toBe(true);
    expect(backgroundVerify).toHaveBeenCalledTimes(1);
    expect(backgroundVerify.mock.calls[0][0].requestId).toBe("snapshot-1");
  });

  test("PaymentSuccessEvent updates access and balance before dispatch", () => {
    const service = loadFreshService();
    const calls = [];
    global.CodeDestinyAccessStore = {
      applyPaymentPayload: jest.fn(() => calls.push("access")),
      markOptimisticallyUnlocked: jest.fn(() => calls.push("unlock")),
    };
    global.dispatchEvent = jest.fn((event) => calls.push(event.type));

    const event = service.reducePaymentSuccess({
      operationId: "operation-1",
      requestId: "request-1",
      productId: "product-1",
      featureKey: "feature-1",
      profileId: "profile-1",
      method: "MONTHLY",
      accessGrant: { ok: true },
      unlockMap: { "feature-1": true },
      monthlyBalance: 90,
      snapshotPatch: { entitlementVersion: 3 },
      completedAt: "2026-08-04T00:00:00.000Z",
    });

    expect(event).toMatchObject({ requestId: "request-1", monthlyBalance: 90 });
    expect(calls.slice(0, 2)).toEqual(["access", "unlock"]);
    expect(calls).toContain("cd:billing-balance-updated");
    expect(calls).toContain("PaymentSuccessEvent");
  });

  test("only one payment-window renderer owns a runtime", async () => {
    const service = loadFreshService();
    const canonical = jest.fn(async () => "monthly");
    expect(service.registerPaymentWindow(canonical, "canonical-shell")).toBe(true);
    expect(service.registerPaymentWindow(jest.fn(), "page-local")).toBe(false);
    await expect(service.openPaymentWindow({ featureKey: "feature-1" })).resolves.toBe("monthly");
    expect(canonical).toHaveBeenCalledTimes(1);
  });
});
