/** @jest-environment node */
import { describe, expect, it } from "@jest/globals";
import { RUNTIME_LOCALES } from "../../lib/i18n/locale-normalize.js";
import { normalizeOraclePayload } from "../../worker/routes/oracle.js";
import { buildFallbackGuardianFortuneResult, validateAndNormalizeGuardianFortuneResult } from "../../worker/lib/guardian-fortune-result.js";
import { GUARDIAN_FORTUNE_LIST_LIMITS } from "../../worker/lib/guardian-fortune-runtime-contract.js";

const context = { inputSummary: { category: "saju", hasBirthTime: true, hasBirthPlace: true }, availableSystems: ["saju"] };
function reading() {
  const text = "Consider the information you can check before making a decision. Give yourself time to compare the available options and choose a small, reversible next step. ";
  const result = { title: "Today's reading", shareText: "A moment to consider my next step.", premiumCta: { ctaKey: "invalid", targetPath: "https://invalid.example", reason: text } };
  for (const field of ["openingLine", "innerState", "coreReading", "topicAdvice", "cautionPattern", "luckyAction"]) result[field] = text.repeat(3);
  for (const [field, limits] of Object.entries(GUARDIAN_FORTUNE_LIST_LIMITS)) result[field] = Array.from({ length: limits.min }, (_, i) => `Option ${i + 1}: compare what you know with what still needs checking.`);
  return result;
}

describe("locale postprocessing without Korean padding (pure fixtures, no provider)", () => {
  it.each(RUNTIME_LOCALES.filter(locale => locale !== "ko"))("preserves supplied prose and quality gates for %s", locale => {
    const input = { locale, category: "saju" };
    const parsed = reading();
    const valid = validateAndNormalizeGuardianFortuneResult({ parsed, input, context });
    expect(valid.ok).toBe(true);
    expect(valid.value.coreReading).toBe(parsed.coreReading.trim());
    expect(JSON.stringify(valid.value)).not.toMatch(/[가-힣]/);
    expect(valid.value.premiumCta.targetPath).not.toBe("https://invalid.example");
    const short = validateAndNormalizeGuardianFortuneResult({ parsed: { ...parsed, coreReading: "Short", innerState: "Short", topicAdvice: "Short", cautionPattern: "Short" }, input, context });
    expect(short.ok).toBe(false);
    expect(validateAndNormalizeGuardianFortuneResult({ parsed: { ...parsed, evidenceLines: [] }, input, context }).ok).toBe(false);
    const fallback = buildFallbackGuardianFortuneResult({ input, context });
    expect(validateAndNormalizeGuardianFortuneResult({ parsed: fallback, input, context }).ok).toBe(false);
    const privateInput = { ...input, nickname: "PRIVATE_PERSON" };
    expect(validateAndNormalizeGuardianFortuneResult({ parsed: { ...parsed, title: "PRIVATE_PERSON" }, input: privateInput, context }).errorCode).toBe("GUARDIAN_RESULT_SENSITIVE_LEAK");
    expect(validateAndNormalizeGuardianFortuneResult({ parsed: { ...parsed, title: "타로" }, input, context }).errorCode).toBe("GUARDIAN_RESULT_CATEGORY_BOUNDARY_FAILED");
    expect(validateAndNormalizeGuardianFortuneResult({ parsed: { ...parsed, title: "100%" }, input, context }).errorCode).toBe("GUARDIAN_RESULT_UNSAFE_CONTENT");
  });
  it("rejects incomplete foreign oracle payloads and keeps valid fields intact", () => {
    const valid = Object.fromEntries(["answer", "keyJudgement", "energyFlow", "risk", "timing", "actionTip", "advice"].map(field => [field, "Consider your available options carefully. ".repeat(8)]));
    expect(normalizeOraclePayload(valid, null)).toEqual({ source: "gemini", ...Object.fromEntries(Object.entries(valid).map(([k,v]) => [k,v.trim()])) });
    expect(normalizeOraclePayload({ ...valid, timing: "Short" }, null)).toBeNull();
    expect(normalizeOraclePayload(null, null)).toBeNull();
  });
});
