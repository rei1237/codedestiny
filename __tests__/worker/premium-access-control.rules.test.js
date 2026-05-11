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
    expect(rules).toHaveLength(2);
    expect(rules).toEqual(
      expect.arrayContaining([
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

  test("loveSecret couple은 400 코인 규칙으로 결제 증빙을 요구해야 한다", () => {
    const rules = utils.buildAlternativePaymentRules("loveSecret", { mode: "couple" });
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      featureKey: "premium-love-secret-couple",
      minCost: 400,
    });
  });

  test("sookyoPremium compat 모드는 추가 결제 증빙 규칙을 강제해야 한다", () => {
    const rules = utils.buildRequiredPaymentRules("sookyoPremium", { reportMode: "compatibility" });
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      featureKey: "premium-sukuyo-compat-extra",
      minCost: 300,
    });
  });

  test("vedicPremium compat 모드는 추가 결제 증빙 규칙을 강제해야 한다", () => {
    const rules = utils.buildRequiredPaymentRules("vedicPremium", { reportMode: "compatibility" });
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      featureKey: "premium-veda-compatibility-addon",
      minCost: 300,
    });
  });
});
