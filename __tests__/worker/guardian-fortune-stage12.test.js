/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import {
  getGuardianFortuneCreditProduct,
  isGuardianFortuneCreditSalesEnabled,
} from "../../worker/lib/guardian-fortune-purchase.js";
import {
  buildGuardianFortuneLimitCta,
  GUARDIAN_FORTUNE_ERROR_CODES,
  GUARDIAN_FORTUNE_PAID_FEATURE_KEY,
} from "../../worker/lib/guardian-fortune-usage.js";
import { FEATURE_KEY_PRICE_TABLE, isPerUsePaidFeatureKey } from "../../worker/lib/paid-feature-registry.js";

describe("Guardian Fortune credit retirement", () => {
  it("keeps credit sales off even when the old env flag says true", () => {
    // 워커가 대화권을 더 이상 소비하지 않는다. 플래그를 되살려도 팔리면 안 된다 —
    // 사용자가 소비 불가능한 재화에 돈을 내게 된다.
    expect(isGuardianFortuneCreditSalesEnabled({})).toBe(false);
    expect(isGuardianFortuneCreditSalesEnabled({ ENABLE_GUARDIAN_FORTUNE_CREDITS: "true" })).toBe(false);
  });

  it("keeps the retired catalog readable for refund and history lookups", () => {
    expect(getGuardianFortuneCreditProduct("guardian_fortune_chat_3")).toMatchObject({ priceKrw: 10000, creditAmount: 3 });
    expect(getGuardianFortuneCreditProduct("guardian_fortune_chat_10")).toMatchObject({ priceKrw: 30000, creditAmount: 10 });
  });

  it("prices the consultation at 50 coins (5,000 KRW) as a per-use feature", () => {
    expect(GUARDIAN_FORTUNE_PAID_FEATURE_KEY).toBe("fortune-chat-consultation");
    expect(FEATURE_KEY_PRICE_TABLE[GUARDIAN_FORTUNE_PAID_FEATURE_KEY]).toMatchObject({ cost: 50, amountKRW: 5000 });
    expect(isPerUsePaidFeatureKey(GUARDIAN_FORTUNE_PAID_FEATURE_KEY)).toBe(true);
  });

  it("hands the exhausted-quota CTA to the shared payment gate, not to /points", () => {
    // /points 로 보내면 이용권 보유자가 결제창의 [이용권으로 구매] 카드를 만나지 못한다.
    const cta = buildGuardianFortuneLimitCta(GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED, true);
    expect(cta).toMatchObject({ featureKey: GUARDIAN_FORTUNE_PAID_FEATURE_KEY });
    expect(cta.targetPath).toBeUndefined();
    expect(cta.reason).not.toContain("대화권");
  });

  it("still sends a logged-out guest to login rather than to a payment gate", () => {
    const cta = buildGuardianFortuneLimitCta(GUARDIAN_FORTUNE_ERROR_CODES.GUEST_LIMIT_EXCEEDED, false);
    expect(cta).toMatchObject({ targetPath: "/auth/login" });
  });
});
