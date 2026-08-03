/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import {
  GUARDIAN_FORTUNE_CREDIT_SALES_FLAG,
  getGuardianFortuneCreditProduct,
  isGuardianFortuneCreditSalesEnabled,
} from "../../worker/lib/guardian-fortune-purchase.js";
import {
  buildGuardianFortuneLimitCta,
  GUARDIAN_FORTUNE_ERROR_CODES,
} from "../../worker/lib/guardian-fortune-usage.js";

describe("Guardian Fortune Stage 12 safety regression", () => {
  it("keeps credit sales disabled unless the explicit sales flag is enabled", () => {
    expect(GUARDIAN_FORTUNE_CREDIT_SALES_FLAG).toBe("ENABLE_GUARDIAN_FORTUNE_CREDITS");
    expect(isGuardianFortuneCreditSalesEnabled({})).toBe(false);
    expect(isGuardianFortuneCreditSalesEnabled({ ENABLE_GUARDIAN_FORTUNE_CREDITS: "false" })).toBe(false);
    expect(isGuardianFortuneCreditSalesEnabled({ ENABLE_GUARDIAN_FORTUNE_CREDITS: "true" })).toBe(true);
  });

  it("keeps the catalog as the source of truth for credit price and quantity", () => {
    expect(getGuardianFortuneCreditProduct("guardian_fortune_chat_3")).toMatchObject({ priceKrw: 10000, creditAmount: 3 });
    expect(getGuardianFortuneCreditProduct("guardian_fortune_chat_10")).toMatchObject({ priceKrw: 30000, creditAmount: 10 });
  });

  it("does not expose the pre-Stage-11 purchase placeholder in the no-credit CTA", () => {
    const cta = buildGuardianFortuneLimitCta(GUARDIAN_FORTUNE_ERROR_CODES.NO_CREDITS, true);
    expect(cta).toMatchObject({ label: "대화권 보기", targetPath: "/points" });
    expect(cta.reason).not.toContain("후속 단계");
    expect(cta.reason).toContain("보유 대화권");
  });
});
