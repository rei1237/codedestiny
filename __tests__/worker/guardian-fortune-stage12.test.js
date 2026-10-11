/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import {
  buildGuardianFortuneLimitCta,
  GUARDIAN_FORTUNE_ERROR_CODES,
  GUARDIAN_FORTUNE_PAID_FEATURE_KEY,
} from "../../worker/lib/guardian-fortune-usage.js";
import { FEATURE_KEY_PRICE_TABLE, isPerUsePaidFeatureKey } from "../../worker/lib/paid-feature-registry.js";

describe("Guardian Fortune credit retirement", () => {
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
