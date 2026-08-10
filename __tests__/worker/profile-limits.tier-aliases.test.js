/**
 * @jest-environment node
 *
 * 이용권 등급 문자열 해석기가 "현재 정책이 실제로 발급하는 이름"만 받아들이는지 고정한다.
 * DB·결제사·외부 API 를 타지 않는 순수 정책 테스트.
 *
 * 왜 고정하는가: tierFromValue 는 tier/planId/productId/label 등 자유 문자열을 등급으로
 * 승격시키는 유일한 지점이다. 여기 남은 폐기 별칭은 비용이 아니라 위험이다 — 어느 필드든
 * 그 단어를 스치기만 하면 등급이 올라가고, 이용권 커버 판정이 그대로 따라간다.
 * (예: planId 에 "gold" 가 들어간 무관한 상품이 vvip 로 읽힌다.)
 */

let limits;
const future = "2099-01-01T00:00:00.000Z";

beforeAll(async () => {
  limits = await import("../../worker/lib/profile-limits.js");
});

/** 해당 문자열을 필드에 넣었을 때 해석되는 등급. 활성으로 보이게 status/expiresAt 을 준다. */
function tierFrom(field, value) {
  const entitlement = limits.normalizeHoneyPassEntitlement({
    profileSubscription: { [field]: value, status: "active", expiresAt: future },
  });
  return entitlement.isActive ? entitlement.tier : "";
}

describe("현재 정책이 쓰는 이름은 그대로 해석된다", () => {
  test.each([
    ["tier", "standard", "standard"],
    ["tier", "premium", "premium"],
    ["tier", "vvip", "vvip"],
    ["tier", "family", "family"],
    ["passTier", "premium", "premium"],
  ])("%s=%s → %s", (field, value, expected) => {
    expect(tierFrom(field, value)).toBe(expected);
  });

  test.each([
    ["standard_1m", "standard"],
    ["premium_3m", "premium"],
    ["vvip_12m", "vvip"],
    ["honey_premium", "premium"],
    ["familypass", "family"],
    ["code-destiny-family", "family"],
  ])("planId=%s → %s", (planId, expected) => {
    expect(tierFrom("planId", planId)).toBe(expected);
  });

  // HONEY_PASS_POLICY 가 지금도 내보내는 표시 라벨 — label 은 resolveTier 의 마지막 폴백이다.
  test.each([
    ["스탠다드", "standard"],
    ["프리미엄", "premium"],
    ["VVIP", "vvip"],
    ["Code Destiny Family", "family"],
  ])("label=%s → %s", (label, expected) => {
    expect(tierFrom("label", label)).toBe(expected);
  });

  test("표시 라벨은 정책 테이블에서 그대로 온다", () => {
    expect(limits.HONEY_PASS_POLICY.standard.label).toBe("스탠다드");
    expect(limits.HONEY_PASS_POLICY.premium.label).toBe("프리미엄");
    expect(limits.HONEY_PASS_POLICY.vvip.label).toBe("VVIP");
    expect(limits.HONEY_PASS_POLICY.family.label).toBe("Code Destiny Family");
  });
});

describe("폐기된 별칭은 더 이상 등급을 올리지 않는다", () => {
  // 이 이름들을 발급하는 코드는 남아 있지 않다(결제·앱스토어 활성화 경로 전수 확인).
  test.each([
    ["gold"],
    ["silver"],
    ["bronze"],
    ["vipplus"],
    ["꿀단지"],
    ["브이브이아이피"],
    ["골드"],
    ["실버"],
    ["브론즈"],
  ])("planId=%s 는 free 로 남는다", (value) => {
    expect(tierFrom("planId", value)).toBe("");
  });

  test("폐기 별칭이 섞인 무관한 상품명이 등급을 훔치지 않는다", () => {
    expect(tierFrom("productId", "gold-tarot-deck-2026")).toBe("");
    expect(tierFrom("planId", "silver-frame-addon")).toBe("");
  });
});
