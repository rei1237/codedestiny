/**
 * @jest-environment node
 */

const fs = require("fs");
const path = require("path");

describe("billing route payment-service boundary", () => {
  const billingSource = fs.readFileSync(path.resolve(__dirname, "../../worker/routes/billing.js"), "utf8");
  const unlockSource = fs.readFileSync(path.resolve(__dirname, "../../worker/lib/content-unlocks.js"), "utf8");

  test("membership pass lookup is guarded by the explicit pass command", () => {
    // 이 테스트의 의도는 "이용권 조회가 명시적 pass 커맨드로 게이트된다"이지 그 조회를 어떤 래퍼로
    // 감싸느냐가 아니다. 예전 정규식은 withMongoRetry 를 함께 고정하는 바람에, 결제 임계경로에서
    // 시도·재연결을 4배로 만들던 중첩 재시도(안쪽이 이미 재시도한다)를 제자리에 못박고 있었다.
    // 게이트 조건과 타임아웃 상한만 강제하고 재시도 위치는 verify:no-nested-retry 가 본다.
    expect(billingSource).toMatch(/shouldLoadMembershipPass\s*&&\s*authCheck\?\.auth\?\.userId\s*\?\s*withDbAccessTimeout/);
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
    expect(unlockSource).toContain("if (session) query.session(session);");
  });
});
