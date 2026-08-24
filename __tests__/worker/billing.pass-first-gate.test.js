/**
 * @jest-environment node
 *
 * "이용권이 없으면 단건 결제가 제대로 열리는가"의 결정 지점 회귀 테스트.
 * 결제 게이트의 정본인 buildPassPaymentDecision 을 직접 호출한다 — 네트워크·DB 접근 없음.
 *
 * 정책 근거: docs/payment-policy-flow.md "게이팅 우선순위"
 *  1) 이용권 선검사 → 커버되면 결제창 없이 무료 통과
 *  2) 미커버 시에만 결제창, 단건결제(KRW)와 월정석을 항상 동등 노출
 */

let buildPassPaymentDecision;
let PASS_LIMITS;

const EQUAL_METHODS = ["DIRECT_KRW", "MOONLIGHT_STONE"];

function activePass(tier) {
  return {
    profileSubscription: {
      tier,
      passTier: tier,
      status: "active",
      expiresAt: new Date(Date.now() + 15 * 86400000),
    },
  };
}

function pricing(coinPrice, featureKey = "tarot-year-fortune") {
  return { featureKey, coinPrice };
}

beforeAll(async () => {
  const billingMod = await import("../../worker/routes/billing.js");
  buildPassPaymentDecision = billingMod.__billingTestUtils.buildPassPaymentDecision;
  // 🔴 상한 숫자를 여기 박지 않는다 — 적용 가격 범위가 바뀌면 이 테스트가 정책이 아니라
  //    옛 숫자를 지킨다(2026-08-24 상향에서 실제로 걸렸다).
  ({ PASS_LIMITS } = await import("../../worker/lib/profile-limits.js"));
});

describe("이용권 선검사 게이트", () => {
  test("이용권이 없으면 결제창에 단건결제와 월정석이 동등하게 노출돼야 한다", () => {
    const decision = buildPassPaymentDecision({}, pricing(30), {});

    expect(decision.hasActivePass).toBe(false);
    expect(decision.canUseByPass).toBe(false);
    expect(decision.paymentPriority).toBe("USER_CHOICE_EQUAL");
    expect(decision.recommendedMethods).toEqual(EQUAL_METHODS);
    expect(decision.equalPriorityMethods).toEqual(EQUAL_METHODS);
    expect(decision.hiddenMethods).toEqual([]);
    expect(decision.decisionReason).toBe("PAYMENT_REQUIRED");
    expect(decision.canUseByCard).toBe(true);
  });

  test("이용권 한도 이내면 결제창 없이 무료 통과여야 한다", () => {
    const sub = activePass("premium").profileSubscription;
    const decision = buildPassPaymentDecision({}, pricing(50), sub);

    expect(decision.hasActivePass).toBe(true);
    expect(decision.passTier).toBe("premium");
    expect(decision.canUseByPass).toBe(true);
    expect(decision.paymentPriority).toBe("PASS_FIRST");
    expect(decision.recommendedMethods).toEqual(["PASS"]);
    expect(decision.decisionReason).toBe("PASS_COVERED");
    // 무료 통과이므로 결제수단은 전부 숨긴다.
    expect(decision.hiddenMethods).toEqual(expect.arrayContaining(EQUAL_METHODS));
  });

  test("이용권 한도를 넘는 가격이면 다시 단건/월정석 2옵션이어야 한다", () => {
    // 적용 가격 범위 바로 바깥(상한 + 1코인)
    const sub = activePass("standard").profileSubscription;
    const decision = buildPassPaymentDecision({}, pricing(PASS_LIMITS.standard + 1), sub);

    expect(decision.hasActivePass).toBe(true);
    expect(decision.canUseByPass).toBe(false);
    expect(decision.paymentPriority).toBe("USER_CHOICE_EQUAL");
    expect(decision.recommendedMethods).toEqual(EQUAL_METHODS);
    expect(decision.hiddenMethods).toEqual([]);
    expect(decision.decisionReason).toBe("PRICE_EXCEEDS_PASS_LIMIT");
  });

  test("family 이용권은 금액과 무관하게 무료 커버여야 한다", () => {
    const sub = activePass("family").profileSubscription;
    const decision = buildPassPaymentDecision({}, pricing(1000), sub);

    expect(decision.canUseByPass).toBe(true);
    expect(decision.paymentPriority).toBe("PASS_FIRST");
  });

  test("월정석 잔액이 부족해도 결제수단 목록에서 월정석이 사라지면 안 된다", () => {
    // 50코인 → 월정석 500 필요. 잔액 100.
    const decision = buildPassPaymentDecision({}, pricing(50), {
      membershipCreditLots: [{
        lotId: "lot-1",
        amount: 100,
        remaining: 100,
        grantedAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 20 * 86400000),
      }],
    });

    expect(decision.monthlyBalance).toBe(100);
    expect(decision.canUseByMonthly).toBe(false); // 비활성 표시용 플래그
    expect(decision.recommendedMethods).toEqual(EQUAL_METHODS); // 목록에서는 제거 금지
    expect(decision.hiddenMethods).toEqual([]);
  });

  test("월정석 잔액이 충분하면 canUseByMonthly 가 켜져야 한다", () => {
    const decision = buildPassPaymentDecision({}, pricing(50), {
      membershipCreditLots: [{
        lotId: "lot-1",
        amount: 900,
        remaining: 900,
        grantedAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 20 * 86400000),
      }],
    });

    expect(decision.monthlyBalance).toBe(900);
    expect(decision.canUseByMonthly).toBe(true);
    expect(decision.recommendedMethods).toEqual(EQUAL_METHODS);
  });

  test("만료된 이용권은 무료 통과가 아니라 결제창이어야 한다", () => {
    const decision = buildPassPaymentDecision({}, pricing(30), {
      tier: "vvip",
      passTier: "vvip",
      status: "expired",
      expiresAt: new Date(Date.now() - 86400000),
    });

    expect(decision.canUseByPass).toBe(false);
    expect(decision.paymentPriority).toBe("USER_CHOICE_EQUAL");
    expect(decision.recommendedMethods).toEqual(EQUAL_METHODS);
  });

  test("프로필 카드 관리(D유형)는 family 포함 전 등급에서 이용권 결제가 불가해야 한다", () => {
    for (const tier of ["standard", "premium", "vvip", "family"]) {
      const sub = activePass(tier).profileSubscription;
      const decision = buildPassPaymentDecision({}, pricing(50, "profile-card-manage"), sub);

      expect(decision.canUseByPass).toBe(false);
      expect(decision.decisionReason).toBe("PASS_EXCLUDED_PAYMENT_REQUIRED");
      // 막다른 길 방지: 이용권으로 못 사는데 결제수단까지 숨기면 안 된다.
      expect(decision.hiddenMethods).toEqual([]);
      expect(decision.recommendedMethods).toEqual(EQUAL_METHODS);
    }
  });
});
