/**
 * @jest-environment node
 */

let utils;

beforeAll(async () => {
  const mod = await import("../../worker/lib/access-control.js");
  utils = mod.__accessControlTestUtils;
});

describe("Premium access-control rules", () => {
  test("sajuNewYear 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("sajuNewYear", {});
    expect(rules).toHaveLength(0);
  });

  test("lifeBook 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    expect(utils.buildAlternativePaymentRules("lifeBook", {})).toHaveLength(0);
  });

  test("ziweiPremium 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    expect(utils.buildAlternativePaymentRules("ziweiPremium", { mode: "personal" })).toHaveLength(0);
    expect(utils.buildAlternativePaymentRules("ziweiPremium", { mode: "compatibility" })).toHaveLength(0);
  });

  test("sookyoPremium compat 모드는 별도 required 규칙 없이 모드별 기본 과금으로 처리해야 한다", () => {
    const rules = utils.buildRequiredPaymentRules("sookyoPremium", { reportMode: "compatibility" });
    expect(rules).toHaveLength(0);
  });

  test("vedicPremium compat 모드는 별도 required 규칙 없이 모드별 기본 과금으로 처리해야 한다", () => {
    const rules = utils.buildRequiredPaymentRules("vedicPremium", { reportMode: "compatibility" });
    expect(rules).toHaveLength(0);
  });

  test("westernAstrologyPremium 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    expect(utils.buildAlternativePaymentRules("westernAstrologyPremium", { mode: "compatibility" })).toHaveLength(0);
  });

  test("sookyoPremium 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    expect(utils.buildAlternativePaymentRules("sookyoPremium", { mode: "compatibility" })).toHaveLength(0);
  });

  test("vedicPremium 레거시 PDF 접근 규칙은 AI 상담 전환 후 비워야 한다", () => {
    expect(utils.buildAlternativePaymentRules("vedicPremium", { mode: "compatibility" })).toHaveLength(0);
  });

  test("sibylDominator는 인하된 5,000원 결제 증빙을 허용한다", () => {
    const rules = utils.buildAlternativePaymentRules("sibylDominator", {});
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      featureKey: "premium-sibyl-dominator",
      reason: "시빌라 도미네이터 리포트",
      minCost: 50,
    });
  });

  test("결제 토큰 추출은 transaction/request/receipt/order 식별자를 모두 보존해야 한다", () => {
    const tokens = utils.extractPaymentLookupTokens({
      sourceTransactionId: "tx_root",
      sourceRequestId: "req_root",
      receipt: "rcpt_root",
      merchantUid: "ord_root",
      payment: {
        transactionId: "tx_payment",
        requestId: "req_payment",
      },
      _paymentContext: {
        transactionId: "tx_ctx",
      },
      consume: {
        receiptId: "rcpt_consume",
      },
    });

    expect(tokens).toEqual({
      transactionId: "tx_root",
      requestId: "req_root",
      receiptId: "rcpt_root",
      orderId: "ord_root",
      purchaseId: "tx_root",
    });
  });
});

// New lower-price receipts must not be rejected by a stale report-specific floor.
test.each([
  ["celestialHarmony", 50], ["sibylDominator", 50], ["geomancyOracle", 30],
  ["destinyCompassDeepReport", 50], ["petSajuReport", 30], ["petCompatReport", 30],
  ["sukuyoPastLifeReading", 50], ["fptiPremium", 100],
])("%s uses the approved receipt floor %i for canonical and historical aliases", (reportType, expected) => {
  const rules = utils.buildAlternativePaymentRules(reportType);
  expect(rules.length).toBeGreaterThan(0);
  for (const rule of rules) expect(rule.minCost).toBe(expected);
});
