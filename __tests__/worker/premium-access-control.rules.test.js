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

  test("lifeBook은 최근 per-use 결제 증빙 규칙이 있어야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("lifeBook", {});
    expect(rules.length).toBeGreaterThanOrEqual(3);
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          featureKey: "premium_pdf_saju_life_book",
          minCost: 500,
          windowMinutes: 120,
        }),
        expect.objectContaining({
          featureKey: "premium-lifebook-report",
          reason: "인생의 책 생성 (13챕터)",
          minCost: 500,
          windowMinutes: 120,
        }),
        expect.objectContaining({
          featureKey: "coin-gate-per-use",
          reason: "인생의 책 생성 (13챕터)",
          minCost: 500,
          windowMinutes: 120,
        }),
      ]),
    );
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

  test("westernAstrologyPremium compatibility는 490 코인 규칙이어야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("westernAstrologyPremium", { mode: "compatibility" });
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        featureKey: "premium-astrology-report-compat",
        minCost: 490,
        windowMinutes: 120,
      }),
    ]));
  });

  test("sookyoPremium compatibility는 490 코인 규칙이어야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("sookyoPremium", { mode: "compatibility" });
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        featureKey: "premium-sukuyo-report-compat",
        minCost: 490,
        windowMinutes: 240,
      }),
    ]));
  });

  test("vedicPremium은 compatibility 요청이어도 개인 리포트 390 코인 규칙이어야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("vedicPremium", { mode: "compatibility" });
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        featureKey: "premium-vedic-report",
        minCost: 390,
        windowMinutes: 120,
      }),
    ]));
  });

  test("sibylDominator는 100코인 최근 결제 증빙 규칙을 가져야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("sibylDominator", {});
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      featureKey: "premium-sibyl-dominator",
      reason: "시빌라 도미네이터 리포트",
      minCost: 100,
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
