/** @jest-environment node */

import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "@jest/globals";

const require = createRequire(import.meta.url);
const fixtures = require("../fixtures/guardian-fortune-prompt-fixtures.js");
import { GUARDIAN_FORTUNE_RESULT_LENGTH } from "../../worker/lib/guardian-fortune-runtime-contract.js";

let promptModule;
let resultModule;
let mockModule;

beforeAll(async () => {
  promptModule = await import("../../worker/lib/guardian-fortune-prompt.js");
  resultModule = await import("../../worker/lib/guardian-fortune-result.js");
  mockModule = await import("../../worker/lib/guardian-fortune-mock.js");
});

describe("Guardian Fortune prompt builder", () => {
  it("uses different system guidance for Yeoni and Neo", () => {
    const yeoni = promptModule.buildGuardianFortunePrompt({ input: fixtures.topicInputs.yeoni, context: fixtures.mockContext });
    const neo = promptModule.buildGuardianFortunePrompt({
      input: fixtures.topicInputs.neo,
      context: { ...fixtures.mockContext, inputSummary: { ...fixtures.mockContext.inputSummary, mode: "neo" } },
    });

    expect(yeoni.systemPrompt).toContain("따뜻하고 다정한 상담자");
    expect(neo.systemPrompt).toContain("현재 판세");
    expect(yeoni.systemPrompt).toContain("직접 계산하는 존재가 아니다");
    expect(yeoni.systemPrompt).toContain("GuardianFortuneContext");
    expect(yeoni.systemPrompt).not.toBe(neo.systemPrompt);
  });

  it("turns the free-form concern into a non-identifying question focus", () => {
    const concern = "이직 제안을 받아도 될까요";
    const prompt = promptModule.buildGuardianFortunePrompt({
      input: { ...fixtures.baseInput, topic: "daily", concern },
      context: fixtures.mockContext,
    });

    expect(prompt.userPrompt).toContain("질문 중심 답변");
    expect(prompt.userPrompt).toContain("옮기기 전에 어떤 조건을 확인해야 하는지");
    expect(prompt.userPrompt).not.toContain(concern);
  });

  it("includes every topic instruction", () => {
    for (const topic of Object.keys(fixtures.topicInputs).filter((key) => ["daily", "love", "money_work", "relationship", "mind", "decision"].includes(key))) {
      const context = { ...fixtures.mockContext, inputSummary: { ...fixtures.mockContext.inputSummary, topic } };
      const prompt = promptModule.buildGuardianFortunePrompt({ input: fixtures.topicInputs[topic], context });
      expect(prompt.userPrompt).toContain(topic);
      expect(prompt.userPrompt).toContain("선택 체계 전문가 지침");
      expect(prompt.userPrompt).toContain("주제별 우선 근거");
      expect(prompt.userPrompt).toContain("전문가 해석 지침");
      expect(prompt.userPrompt).toContain("JSON schema hint");
    }
  });

  it("uses the selected category for expert guidance and prompt-safe adapter order", () => {
    for (const category of ["saju", "ziwei", "vedic", "sukuyo", "astrology", "tarot"]) {
      const context = { ...fixtures.mockContext, inputSummary: { ...fixtures.mockContext.inputSummary, category }, availableSystems: [category] };
      const prompt = promptModule.buildGuardianFortunePrompt({ input: { ...fixtures.baseInput, category }, context });
      const formatted = promptModule.formatGuardianFortuneContextForPrompt(context);
      expect(prompt.category).toBe(category);
      expect(prompt.userPrompt).toContain(`상담 체계: ${category}`);
      expect(formatted).toContain(`"category": "${category}"`);
    }
    const tarotContext = { ...fixtures.mockContext, inputSummary: { ...fixtures.mockContext.inputSummary, category: "tarot" }, availableSystems: ["tarot"] };
    const tarotFormatted = promptModule.formatGuardianFortuneContextForPrompt(tarotContext);
    expect(tarotFormatted).toContain('"category": "tarot"');
    expect(tarotFormatted).not.toContain('"saju"');
  });

  it("formats only allowlisted context and never includes raw birth input or concern", () => {
    const prompt = promptModule.buildGuardianFortunePrompt({ input: fixtures.baseInput, context: fixtures.mockContext });
    expect(prompt.userPrompt).toContain("합성 일간");
    expect(prompt.userPrompt).not.toContain("today_symbol");
    expect(prompt.userPrompt).toContain("타로는 서버 projection");
    expect(prompt.userPrompt).toContain("hasBirthTime");
    expect(prompt.userPrompt).not.toContain("1988-08-08");
    expect(prompt.userPrompt).not.toContain("09:30");
    expect(prompt.userPrompt).not.toContain("Seoul");
    expect(prompt.userPrompt).not.toContain("달빛사용자");
    expect(prompt.userPrompt).not.toContain("요즘 선택의 순서를 천천히 정리하고 있어요.");
    expect(prompt.userPrompt).not.toContain("paymentId");
    expect(prompt.userPrompt).not.toContain("usage");
  });
});

describe("Guardian Fortune result parser and validator", () => {
  it("parses strict, fenced, prefixed, trailing-comma, and control-character JSON", () => {
    const cases = [
      ['{"title":"제목"}', "제목"],
      ["```json\n{\"title\":\"제목\"}\n```", "제목"],
      ["설명\n{\"title\":\"제목\"}\n끝", "제목"],
      ['{"title":"제목",}', "제목"],
      ['{"title":"줄1\n줄2"}', "줄1\n줄2"],
    ];
    for (const [raw, expectedTitle] of cases) {
      const parsed = resultModule.parseGuardianFortuneLLMResponse(raw);
      expect(parsed.ok).toBe(true);
      expect(parsed.value.title).toBe(expectedTitle);
    }
    expect(resultModule.parseGuardianFortuneLLMResponse("not json").ok).toBe(false);
  });

  it("fills missing fields, maps CTA through the topic allowlist, and keeps safe share text", async () => {
    const generated = await mockModule.mockGuardianFortuneLLM({ input: fixtures.baseInput, context: fixtures.mockContext, scenario: "normal" });
    const parsed = resultModule.parseGuardianFortuneLLMResponse(generated);
    const validated = resultModule.validateAndNormalizeGuardianFortuneResult({
      parsed: { ...parsed.value, topicAdvice: undefined, premiumCta: { ctaKey: "untrusted", targetPath: "https://evil.example" } },
      input: fixtures.baseInput,
      context: fixtures.mockContext,
    });

    expect(validated.ok).toBe(true);
    expect(validated.value.topicAdvice).toBeTruthy();
    expect(validated.value.premiumCta.targetPath).toBe("/destiny-compass");
    expect(validated.value.premiumCta.ctaKey).toBe("life_compass");
    expect(validated.value.shareText).not.toContain("1988-08-08");
    expect(resultModule.countGuardianFortuneVisibleTextLength(validated.value)).toBeGreaterThanOrEqual(GUARDIAN_FORTUNE_RESULT_LENGTH.min);
  });

  it("removes unsupported birth-time dependent certainty when birth time is absent", () => {
    const noBirthTimeContext = {
      ...fixtures.mockContext,
      inputSummary: { ...fixtures.mockContext.inputSummary, hasBirthTime: false, hasBirthPlace: false },
    };
    const parsed = {
      title: "오늘의 귀인 운세",
      openingLine: "오늘은 관계를 서두르지 말고 확인해 보세요.",
      innerState: "시주가 분명히 결정의 답을 보여줍니다.",
      coreReading: "생시를 모르는 상태에서는 시간 기반 결론을 낮은 확신으로 다룹니다.",
      topicAdvice: "오늘 확인 가능한 한 가지 조건부터 적어봅니다.",
      cautionPattern: "확인하지 않은 내용을 결론으로 키우지 않습니다.",
      luckyAction: "오늘 확인할 조건 하나만 적어보세요.",
      premiumCta: { ctaKey: "life_compass", label: "더 보기", reason: "장기 흐름은 다음 상담에서 살펴볼 수 있습니다." },
      shareText: "네오가 오늘의 핵심만 조용히 짚어줬어.",
    };
    const validated = resultModule.validateAndNormalizeGuardianFortuneResult({
      parsed,
      input: { ...fixtures.baseInput, birthTime: undefined },
      context: noBirthTimeContext,
    });

    expect(validated.ok).toBe(true);
    const text = JSON.stringify(validated.value);
    expect(text).toContain("생시가");
    expect(text).not.toContain("시주가 분명히");
  });

  it("softens forbidden expressions instead of exposing them", async () => {
    const generated = await mockModule.mockGuardianFortuneLLM({ input: fixtures.baseInput, context: fixtures.mockContext, scenario: "forbidden_content" });
    const parsed = resultModule.parseGuardianFortuneLLMResponse(generated);
    const validated = resultModule.validateAndNormalizeGuardianFortuneResult({ parsed: parsed.value, input: fixtures.baseInput, context: fixtures.mockContext });

    expect(validated.ok).toBe(true);
    expect(JSON.stringify(validated.value)).not.toContain("무조건");
    expect(JSON.stringify(validated.value)).not.toContain("반드시");
  });

  it("rejects terminology from an unselected fortune system", async () => {
    const context = {
      ...fixtures.mockContext,
      inputSummary: { ...fixtures.mockContext.inputSummary, category: "saju" },
      availableSystems: ["saju"],
    };
    const generated = await mockModule.mockGuardianFortuneLLM({ input: { ...fixtures.baseInput, category: "saju" }, context, scenario: "normal" });
    const parsed = resultModule.parseGuardianFortuneLLMResponse(generated);
    const validated = resultModule.validateAndNormalizeGuardianFortuneResult({
      parsed: { ...parsed.value, coreReading: `${parsed.value.coreReading} 자미두수 명궁의 배치도 함께 확인했습니다.` },
      input: { ...fixtures.baseInput, category: "saju" },
      context,
    });

    expect(validated).toMatchObject({ ok: false, errorCode: "GUARDIAN_RESULT_CATEGORY_BOUNDARY_FAILED" });
    expect(validated.issues).toEqual(expect.arrayContaining([expect.stringMatching(/^foreign_system_ziwei:/)]));
  });

  it("enriches short results and trims long results within the visible budget", async () => {
    for (const scenario of ["too_short", "too_long"]) {
      const output = await mockModule.generateGuardianFortuneWithMockLLM({ input: fixtures.baseInput, context: fixtures.mockContext, scenario });
      const length = resultModule.countGuardianFortuneVisibleTextLength(output.result);
      expect(length).toBeGreaterThanOrEqual(GUARDIAN_FORTUNE_RESULT_LENGTH.min);
      expect(length).toBeLessThanOrEqual(GUARDIAN_FORTUNE_RESULT_LENGTH.max);
    }
  });

  it("falls back safely for invalid JSON and mock provider failure", async () => {
    for (const scenario of ["invalid_json", "failure"]) {
      const output = await mockModule.generateGuardianFortuneWithMockLLM({ input: fixtures.baseInput, context: fixtures.mockContext, scenario });
      expect(output.usedFallback).toBe(true);
      expect(output.result.title).toBe("오늘의 귀인 운세");
      expect(resultModule.countGuardianFortuneVisibleTextLength(output.result)).toBeGreaterThanOrEqual(GUARDIAN_FORTUNE_RESULT_LENGTH.min);
    }
  });

  it("does not allow raw sensitive values in a result", () => {
    expect(() => resultModule.assertGuardianFortuneNoSensitiveLeak({
      result: { title: "1988-08-08" },
      input: fixtures.baseInput,
    })).toThrow("민감한 입력");
  });
});

describe("Guardian Fortune mock pipeline", () => {
  it("supports the six topic and mode fixtures without provider calls", async () => {
    for (const topic of ["daily", "love", "money_work", "relationship", "mind", "decision"]) {
      const context = { ...fixtures.mockContext, inputSummary: { ...fixtures.mockContext.inputSummary, topic } };
      const output = await mockModule.generateGuardianFortuneWithMockLLM({ input: { ...fixtures.baseInput, topic }, context, scenario: "normal" });
      expect(output.result).toHaveProperty("premiumCta.targetPath");
      expect(output.prompt.userPrompt).toContain(topic);
    }
  });

  it("contains no real provider or network call in the mock module", async () => {
    const fs = await import("node:fs/promises");
    const source = await fs.readFile("worker/lib/guardian-fortune-mock.js", "utf8");
    expect(source).not.toContain("gemini.js");
    expect(source).not.toContain("llm-client");
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toContain("process.env");
  });
});
