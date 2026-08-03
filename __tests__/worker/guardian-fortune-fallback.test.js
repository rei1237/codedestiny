/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import { buildContextDrivenGuardianFallback } from "../../worker/lib/guardian-fortune-fallback.js";
import {
  assertGuardianFortuneNoSensitiveLeak,
  buildFallbackGuardianFortuneResult,
  countGuardianFortuneVisibleTextLength,
} from "../../worker/lib/guardian-fortune-result.js";
import { makeGuardianFortuneContext, guardianFortuneLlmInput } from "../fixtures/guardian-fortune-llm-fixtures.mjs";

describe("Guardian Fortune high-quality fallback", () => {
  it("uses only the selected category evidence in a complete share-safe result", () => {
    const result = buildFallbackGuardianFortuneResult({ input: guardianFortuneLlmInput, context: makeGuardianFortuneContext(), reason: "provider_timeout" });
    expect(countGuardianFortuneVisibleTextLength(result)).toBeGreaterThanOrEqual(800);
    expect(countGuardianFortuneVisibleTextLength(result)).toBeLessThanOrEqual(1500);
    expect(result.openingLine).toContain("상대의 말보다");
    expect(result.coreReading).toContain("사주의 성향과 행동 패턴");
    expect(result.coreReading).not.toContain("숙요점");
    expect(result.coreReading).not.toContain("서로 다른 체계");
    expect(result.premiumCta.targetPath).toMatch(/^\//);
    expect(result.shareText).not.toContain(guardianFortuneLlmInput.concern);
    expect(() => assertGuardianFortuneNoSensitiveLeak({ result, input: guardianFortuneLlmInput })).not.toThrow();
  });

  it.each([
    ["daily", "yeoni"],
    ["money_work", "neo"],
    ["mind", "yeoni"],
    ["decision", "neo"],
  ])("keeps topic and mode advice distinct for %s/%s", (topic, mode) => {
    const result = buildFallbackGuardianFortuneResult({
      input: { ...guardianFortuneLlmInput, topic, mode },
      context: makeGuardianFortuneContext({ topic, mode, systems: ["saju"] }),
      reason: "malformed_json",
    });
    expect(result.topicAdvice).toContain(topic === "daily" ? "오늘" : topic === "money_work" ? "금전/일" : topic === "mind" ? "마음/심리" : "결정/선택");
    expect(countGuardianFortuneVisibleTextLength(result)).toBeGreaterThanOrEqual(800);
  });

  it("does not fabricate a fallback when context has no meaningful systems", () => {
    const result = buildContextDrivenGuardianFallback({
      input: { ...guardianFortuneLlmInput, topic: "decision" },
      context: { inputSummary: { topic: "decision", mode: "neo" }, availableSystems: [], unavailableClaims: ["all_calculations"] },
    });
    expect(result.coreReading).toContain("계산된 흐름은");
    expect(result.coreReading).not.toContain("saju에서는");
    expect(result.coreReading).not.toContain("사주의 성향과 행동 패턴");
  });
});
