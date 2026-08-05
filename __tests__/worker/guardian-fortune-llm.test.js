/** @jest-environment node */

import { describe, expect, it, jest } from "@jest/globals";
import { generateGuardianFortuneWithConfiguredLLM, generateGuardianFortuneWithRealLLM } from "../../worker/lib/guardian-fortune-llm.js";
import { getGuardianFortuneRealLlmBlockReason, shouldUseRealGuardianFortuneLLM } from "../../worker/lib/guardian-fortune-llm-policy.js";
import { makeGuardianFortuneContext, guardianFortuneLlmInput } from "../fixtures/guardian-fortune-llm-fixtures.mjs";
import { countGuardianFortuneVisibleTextLength } from "../../worker/lib/guardian-fortune-result.js";

const realEnv = {
  NODE_ENV: "production",
  APP_ENV: "production",
  ENABLE_GUARDIAN_FORTUNE_API: "true",
  ENABLE_GUARDIAN_FORTUNE_REAL_LLM: "true",
  ALLOW_REAL_GUARDIAN_FORTUNE_LLM: "true",
  GUARDIAN_FORTUNE_LLM_PROVIDER: "gemini",
};

describe("Guardian Fortune guarded LLM", () => {
  it("defaults to mock and fails closed unless production flags allow Gemini", async () => {
    expect(shouldUseRealGuardianFortuneLLM({ env: {}, userId: "staging-user-1" })).toBe(false);
    expect(getGuardianFortuneRealLlmBlockReason({ env: realEnv, userId: "other-user" })).toBe("");
    expect(getGuardianFortuneRealLlmBlockReason({ env: { ...realEnv, NODE_ENV: "test" }, userId: "staging-user-1" })).toBe("TEST_ENVIRONMENT");

    const result = await generateGuardianFortuneWithConfiguredLLM({
      input: guardianFortuneLlmInput,
      context: makeGuardianFortuneContext(),
      env: {},
      userId: "staging-user-1",
    });
    expect(result.result).toBeDefined();
    expect(result.usedFallback).toBe(false);
  });

  it("uses an injected provider only after all guards pass", async () => {
    const provider = jest.fn(async () => ({ ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify({
      title: "오늘의 귀인 운세",
      openingLine: "연결된 provider 결과의 시작 문장입니다.",
      innerState: "마음의 속도와 현실의 속도를 나누어 살피면 지금의 고민이 조금 더 선명해집니다.",
      coreReading: "관계에서 반복되는 패턴과 현재 흐름의 단서를 함께 보면, 먼저 확인할 질문과 잠시 기다릴 지점을 나눌 수 있습니다. 작은 확인이 다음 선택을 안정적으로 만들어줍니다.",
      topicAdvice: "오늘은 확신을 서두르기보다 상대의 반응과 내가 조절할 수 있는 행동을 구분해보세요. 한 문장으로 표현을 정리하면 관계의 부담을 줄일 수 있습니다.",
      cautionPattern: "상대의 침묵을 전체 결론으로 해석하는 패턴은 잠시 멈춰보세요.",
      luckyAction: "연락하기 전 하고 싶은 말을 한 문장으로 줄여보세요.",
      premiumCta: { ctaKey: "love_strategy_ai", label: "연애 비책 전문가 상담", targetPath: "/love-secret-ai", reason: "반복되는 관계 패턴을 더 깊게 살펴볼 수 있어요." },
      shareText: "오늘 관계의 속도를 차분히 정리해봤어요.",
    }) }));
    const metricSink = jest.fn();
    const result = await generateGuardianFortuneWithRealLLM({
      input: guardianFortuneLlmInput,
      context: makeGuardianFortuneContext(),
      env: realEnv,
      userId: "staging-user-1",
      requestId: "stage13-real-mock-1",
      providerCall: provider,
      metricSink,
    });
    expect(provider).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ deliverable: true, usedFallback: false });
    expect(countGuardianFortuneVisibleTextLength(result.result)).toBeGreaterThanOrEqual(800);
    expect(metricSink).toHaveBeenCalledWith(expect.objectContaining({ provider: "gemini", success: true, fallbackUsed: false }));
    expect(JSON.stringify(metricSink.mock.calls)).not.toContain("1990-01-01");
  });

  it("returns a validated high-quality fallback on provider failure", async () => {
    const result = await generateGuardianFortuneWithRealLLM({
      input: guardianFortuneLlmInput,
      context: makeGuardianFortuneContext(),
      env: realEnv,
      userId: "staging-user-1",
      requestId: "stage13-timeout-1",
      providerCall: async () => ({ ok: false, error: "timeout", status: 504 }),
    });
    expect(result).toMatchObject({ deliverable: true, usedFallback: true, errorCode: "timeout" });
    expect(countGuardianFortuneVisibleTextLength(result.result)).toBeGreaterThanOrEqual(800);
    expect(countGuardianFortuneVisibleTextLength(result.result)).toBeLessThanOrEqual(1500);
  });

  it("converts a thrown provider error into a delivered fallback without exposing the error", async () => {
    const result = await generateGuardianFortuneWithRealLLM({
      input: guardianFortuneLlmInput,
      context: makeGuardianFortuneContext(),
      env: realEnv,
      userId: "staging-user-1",
      requestId: "stage13-provider-throw-1",
      providerCall: async () => { throw Object.assign(new Error("secret provider detail"), { code: "PROVIDER_500", status: 500 }); },
    });
    expect(result).toMatchObject({ deliverable: true, usedFallback: true, errorCode: "PROVIDER_500" });
    expect(JSON.stringify(result)).not.toContain("secret provider detail");
  });

  it("does not call the provider when policy is not satisfied", async () => {
    const provider = jest.fn();
    const result = await generateGuardianFortuneWithConfiguredLLM({
      input: guardianFortuneLlmInput,
      context: makeGuardianFortuneContext(),
      env: { ...realEnv, ENABLE_GUARDIAN_FORTUNE_REAL_LLM: "false" },
      userId: "staging-user-1",
      providerCall: provider,
    });
    expect(provider).not.toHaveBeenCalled();
    expect(result.result).toBeDefined();
  });
});
