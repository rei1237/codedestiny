/**
 * @jest-environment node
 */

let utils;

beforeAll(async () => {
  const mod = await import("../../worker/lib/access-control.js");
  utils = mod.__accessControlTestUtils;
});

describe("Premium access-control rules", () => {
  test("lifeBook은 최근 per-use 결제 증빙 규칙이 있어야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("lifeBook", {});
    expect(rules.length).toBeGreaterThanOrEqual(3);
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          featureKey: "premium_pdf_saju_life_book",
          minCost: 500,
        }),
        expect.objectContaining({
          featureKey: "premium-lifebook-report",
          reason: "인생의 책 생성 (13챕터)",
          minCost: 500,
        }),
        expect.objectContaining({
          featureKey: "coin-gate-per-use",
          reason: "인생의 책 생성 (13챕터)",
          minCost: 500,
        }),
      ]),
    );
  });

  test("ziweiPremium personal은 590 코인 결제 증빙 규칙이어야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("ziweiPremium", { mode: "personal" });
    expect(rules.length).toBeGreaterThanOrEqual(2);
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        featureKey: "premium_pdf_ziwei",
        minCost: 590,
      }),
      expect.objectContaining({
        featureKey: "premium-ziwei-report",
        reason: "자미두수 프리미엄 PDF 리포트 생성",
        minCost: 590,
      }),
    ]));
  });

  test("ziweiPremium compatibility는 690 코인 결제 증빙 규칙이어야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("ziweiPremium", { mode: "compatibility" });
    expect(rules.length).toBeGreaterThanOrEqual(2);
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        featureKey: "premium-ziwei-report-compat",
        reason: "자미두수 프리미엄 PDF 궁합 리포트 생성",
        minCost: 690,
      }),
    ]));
  });

  test("loveSecret couple은 400 코인 규칙으로 결제 증빙을 요구해야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("loveSecret", { mode: "couple" });
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        featureKey: "premium_pdf_saju_love_secret_compat",
        minCost: 400,
      }),
      expect.objectContaining({
        featureKey: "premium-love-secret-couple",
        minCost: 400,
      }),
    ]));
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
      }),
    ]));
  });

  test("sookyoPremium compatibility는 490 코인 규칙이어야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("sookyoPremium", { mode: "compatibility" });
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        featureKey: "premium-sukuyo-report-compat",
        minCost: 490,
      }),
    ]));
  });

  test("vedicPremium compatibility는 490 코인 규칙이어야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("vedicPremium", { mode: "compatibility" });
    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        featureKey: "premium-vedic-report-compat",
        minCost: 490,
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
});
