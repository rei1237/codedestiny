/**
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");

describe("billing route payment-service boundary", () => {
  const billingSource = fs.readFileSync(path.resolve(__dirname, "../../worker/routes/billing.js"), "utf8");
  const unlockSource = fs.readFileSync(path.resolve(__dirname, "../../worker/lib/content-unlocks.js"), "utf8");

  test("membership pass lookup is guarded by the explicit pass command", () => {
    expect(billingSource).toMatch(/shouldLoadMembershipPass\s*&&\s*authCheck\?\.auth\?\.userId\s*\?\s*withMongoRetry/);
    expect(billingSource).toContain("const shouldLoadMembershipPass = shouldVerifyMembershipPass(paymentCommand.method)");
  });

  test("monthly deduction has no compensation fallback", () => {
    const monthlySpendSource = billingSource.slice(
      billingSource.indexOf("async function consumeMembershipCreditIfAvailable("),
      billingSource.indexOf("async function recordPassAccessIfNeeded("),
    );
    expect(billingSource).not.toContain("runSpendWithCompensation");
    expect(billingSource).not.toContain("restoreMonthlyCreditLot");
    expect(monthlySpendSource).not.toContain("seedMembershipCreditForExistingPassIfNeeded");
    expect(monthlySpendSource).toContain("runAtomicMonthlyPayment({");
  });

  test("direct prepare and confirm do not call membership-pass helpers", () => {
    const checkoutSource = billingSource.slice(
      billingSource.indexOf("async function handleCheckout("),
      billingSource.indexOf("function logCheckoutElapsed("),
    );
    const confirmSource = billingSource.slice(
      billingSource.indexOf("async function handleConfirm("),
      billingSource.indexOf("async function runServiceExecutionAction("),
    );
    expect(checkoutSource).not.toContain("getMembershipPassForBillingRequest");
    expect(checkoutSource).not.toContain("grantPassFreeAccessBeforeCardIfAvailable");
    expect(confirmSource).not.toContain("getMembershipPassForBillingRequest");
    expect(confirmSource).not.toContain("grantPassFreeAccessBeforeCardIfAvailable");
  });

  test("monthly history, ledger, and unlock use the same transaction session", () => {
    expect(billingSource).toContain("PointHistory.create([buildHistoryPayload(updatedUser?.points, monthlyCredits)], { session })");
    expect(billingSource).toContain("MonthlyCreditLedger.create([buildLedgerPayload(history?._id, monthlyCredits)], { session })");
    expect(billingSource).toContain("atomicUnlock({ session, updatedUser, monthlyCredits, history, ledger, purchaseId })");
    expect(unlockSource).toContain("...(session ? { session } : {})");
  });
});
