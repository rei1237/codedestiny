/** @jest-environment node */

import { describe, expect, it, jest } from "@jest/globals";
import { generateGuardianFortuneRequest } from "../../worker/lib/guardian-fortune-generate.js";
import { createMemoryGuardianFortuneStore } from "../../worker/lib/guardian-fortune-usage.js";

const NOW = new Date("2026-08-02T03:00:00.000Z");
const input = {
  birthDate: "1990-01-01",
  calendarType: "solar",
  gender: "unknown",
  topic: "daily",
  category: "saju",
  mode: "yeoni",
  locale: "ko-KR",
};

const context = {
  version: "guardian-fortune.v1",
  inputSummary: { hasBirthTime: false, hasBirthPlace: false, calendarType: "solar", topic: "daily", category: "saju", mode: "yeoni", targetDate: "2026-08-02", locale: "ko-KR", hasConcern: false },
  availableSystems: ["saju"],
  unavailableClaims: [],
  saju: { dayMaster: "갑목", currentFlowSummary: "작은 정리가 흐름을 가볍게 합니다." },
  integratedInsight: {
    openingHook: "이미 답의 방향을 알고 있지만 확인이 필요한 흐름",
    currentTheme: "정리와 관찰",
    likelyConcern: "오늘 무엇부터 시작할지",
    adviceDirection: "작은 실행",
    cautionPattern: "한 번에 너무 많이 결정하는 것",
    luckyActionHint: "오늘 할 일 세 가지만 남기기",
    premiumBridge: "더 깊은 상담",
    evidenceKeys: ["saju.currentFlowSummary"],
  },
  safetyConstraints: [],
};

const result = {
  title: "오늘의 귀인 운세",
  openingLine: "오늘은 흐름을 가볍게 정리하는 데서 시작해 보세요.",
  innerState: "마음속에서는 이미 우선순위를 알고 있지만, 확인받고 싶은 기분이 남아 있습니다.",
  coreReading: "오늘의 흐름은 큰 결론보다 작은 정리에 힘이 실립니다. 해야 할 일을 모두 붙잡기보다 지금 움직일 수 있는 한 가지를 고르면 흐름이 선명해집니다.",
  topicAdvice: "오늘은 가장 중요한 일 세 가지를 적고, 그중 하나를 먼저 끝내 보세요. 작은 완료가 다음 선택의 기준을 만들어 줍니다.",
  cautionPattern: "한 번에 너무 많은 답을 얻으려는 마음은 잠시 내려놓는 편이 좋습니다.",
  luckyAction: "오늘 할 일 세 가지만 남겨 보세요.",
  premiumCta: { ctaKey: "today_flow_deep_dive", label: "오늘의 흐름 더 보기", targetPath: "/today", reason: "오늘의 흐름을 더 깊게 살펴볼 수 있어요." },
  shareText: "오늘의 귀인 운세로 내 흐름을 정리해 봤어요.",
};

function successfulContextBuilder() {
  return { ok: true, context };
}

describe("Guardian Fortune mock generate controller", () => {
  it.each([undefined, "fusion", "unknown"])("rejects category %s before reserving usage", async (category) => {
    const store = createMemoryGuardianFortuneStore();
    const contextBuilder = jest.fn(successfulContextBuilder);
    const response = await generateGuardianFortuneRequest({
      input: { ...input, category },
      guestIdHash: "guest-invalid-category",
      requestId: `invalid-category-${String(category)}`,
      dateKey: "2026-08-02",
      store,
      now: NOW,
      contextBuilder,
    });

    expect(response).toMatchObject({ ok: false, status: 400, error: "GUARDIAN_FORTUNE_INVALID_INPUT" });
    expect(contextBuilder).not.toHaveBeenCalled();
    expect(store.state.guests.get("guest-invalid-category")).toBeUndefined();
  });

  it("generates for a guest and commits exactly one guest use", async () => {
    const store = createMemoryGuardianFortuneStore();
    const mockGenerator = jest.fn(async () => ({ result, usedFallback: false }));
    const response = await generateGuardianFortuneRequest({
      input,
      guestIdHash: "guest-generate-0001",
      requestId: "generate-guest-1",
      dateKey: "2026-08-02",
      store,
      now: NOW,
      contextBuilder: successfulContextBuilder,
      mockGenerator,
    });
    expect(response).toMatchObject({ ok: true, generationSource: "guest_free", result });
    expect(response.usage.guestFreeUsed).toBe(1);
    expect(mockGenerator).toHaveBeenCalledTimes(1);
  });

  it("does not consume quota when context building fails", async () => {
    const store = createMemoryGuardianFortuneStore();
    const response = await generateGuardianFortuneRequest({
      input,
      guestIdHash: "guest-context-0001",
      requestId: "generate-context-1",
      dateKey: "2026-08-02",
      store,
      now: NOW,
      contextBuilder: async () => ({ ok: false, errorCode: "GUARDIAN_CONTEXT_ALL_ADAPTERS_FAILED" }),
    });
    expect(response).toMatchObject({ ok: false, error: "GUARDIAN_FORTUNE_CONTEXT_FAILED", status: 502 });
    expect(response.usage.guestFreeUsed).toBe(0);
    expect(store.state.guests.get("guest-context-0001")).toMatchObject({ totalUsed: 0, reserved: 0 });
  });

  it("does not consume quota when mock generation returns a fallback", async () => {
    const store = createMemoryGuardianFortuneStore();
    const response = await generateGuardianFortuneRequest({
      input,
      guestIdHash: "guest-mock-fail-01",
      requestId: "generate-mock-fail-1",
      dateKey: "2026-08-02",
      store,
      now: NOW,
      contextBuilder: successfulContextBuilder,
      mockGenerator: async () => ({ result, usedFallback: true, errorCode: "MOCK_LLM_FAILURE" }),
    });
    expect(response).toMatchObject({ ok: false, error: "GUARDIAN_FORTUNE_GENERATION_FAILED", status: 502 });
    expect(response.usage.guestFreeUsed).toBe(0);
  });

  it("commits usage when a validated fallback is actually delivered", async () => {
    const store = createMemoryGuardianFortuneStore();
    const response = await generateGuardianFortuneRequest({
      input,
      guestIdHash: "guest-visible-fallback-01",
      requestId: "generate-visible-fallback-1",
      dateKey: "2026-08-02",
      store,
      now: NOW,
      contextBuilder: successfulContextBuilder,
      mockGenerator: async () => ({ result, usedFallback: true, deliverable: true, errorCode: "PROVIDER_TIMEOUT" }),
    });
    expect(response).toMatchObject({ ok: true, generationSource: "guest_free", result });
    expect(response.usage.guestFreeUsed).toBe(1);
  });

  it("uses a paid credit after the authenticated daily quota is exhausted", async () => {
    const store = createMemoryGuardianFortuneStore({
      daily: { "user-generate:2026-08-02": { userId: "user-generate", dateKey: "2026-08-02", freeLimit: 3, freeUsed: 3, reserved: 0 } },
      credits: { "user-generate": { userId: "user-generate", remaining: 1, reserved: 0, purchasedTotal: 1, usedTotal: 0 } },
    });
    const response = await generateGuardianFortuneRequest({
      input,
      userId: "user-generate",
      requestId: "generate-credit-1",
      dateKey: "2026-08-02",
      store,
      now: NOW,
      contextBuilder: successfulContextBuilder,
      mockGenerator: async () => ({ result, usedFallback: false }),
    });
    expect(response).toMatchObject({ ok: true, generationSource: "paid_credit" });
    expect(response.usage.paidCreditsRemaining).toBe(0);
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0].type).toBe("use");
  });

  it("does not call the context or mock provider when no credit is available", async () => {
    const store = createMemoryGuardianFortuneStore({
      daily: { "user-blocked:2026-08-02": { userId: "user-blocked", dateKey: "2026-08-02", freeLimit: 3, freeUsed: 3, reserved: 0 } },
    });
    const contextBuilder = jest.fn(successfulContextBuilder);
    const mockGenerator = jest.fn(async () => ({ result, usedFallback: false }));
    const response = await generateGuardianFortuneRequest({
      input,
      userId: "user-blocked",
      requestId: "generate-blocked-1",
      dateKey: "2026-08-02",
      store,
      now: NOW,
      contextBuilder,
      mockGenerator,
    });
    expect(response).toMatchObject({ ok: false, error: "GUARDIAN_FORTUNE_NO_CREDITS", status: 429 });
    expect(response.cta.targetPath).toBe("/points");
    expect(contextBuilder).not.toHaveBeenCalled();
    expect(mockGenerator).not.toHaveBeenCalled();
  });
});
