/**
 * @jest-environment node
 */

let sajuPrompt;
let fortuneRoute;

beforeAll(async () => {
  [sajuPrompt, fortuneRoute] = await Promise.all([
    import("../../worker/lib/saju-ai-prompt.js"),
    import("../../worker/routes/fortune.js"),
  ]);
});

const commonBody = [
  "9. 조심해야 할 패턴\n확인할 패턴을 설명합니다.",
  "10. 살리는 전략\n같은 기준으로 선택지를 비교합니다.",
  "11. 30일 실천 가이드\n작은 실천과 확인 방법을 정리합니다.",
  "12. 마지막 한마디\n이 결론은 주어진 명식과 질문 안에서 차분히 확인하면 좋습니다.",
].join("\n\n");

const summaryBlock = [
  "[[CD_PERSONA_SUMMARIES_V1]]",
  "YEONI_LETTER: 마음이 앞서갈수록 지금 확인할 수 있는 흐름부터 천천히 살펴보세요.",
  "YEONI_ACTION: 오늘 결정할 일 한 가지의 기준을 종이에 적어보세요.",
  "NEO_CONCLUSION: 지금은 확장보다 우선순위를 정할 때입니다.",
  "NEO_BASIS: 공통 본문에서 확인한 일간과 오행 균형을 근거로 삼았습니다.",
  "NEO_CAUTION: 실제 조건이 달라지면 결론도 다시 점검해야 합니다.",
  "NEO_NEXT_CHECK: 예산, 일정, 상대의 답변 순서로 확인하세요.",
  "[[/CD_PERSONA_SUMMARIES_V1]]",
].join("\n");

describe("명식이 답하는 사주 AI 상담 화자 요약", () => {
  test("v15 마지막 생성 그룹만 같은 호출에서 두 화자 블록을 요청한다", () => {
    expect(sajuPrompt.SAJU_AI_PROMPT_VERSION).toBe("saju-myeongsik-ai-v15-natal-v2");
    const finalGroup = sajuPrompt.SAJU_AI_SECTION_GROUPS.find((group) => group.key === "strategy_action");
    const firstGroup = sajuPrompt.SAJU_AI_SECTION_GROUPS[0];
    const builtPrompt = { internalPrompt: "내부 명식 사실 카드", factCard: "명식 사실", promptVersion: sajuPrompt.SAJU_AI_PROMPT_VERSION };
    const finalPrompt = fortuneRoute.__sajuAiSectionTestUtils.buildSajuAISectionPrompt(builtPrompt, finalGroup);
    const firstPrompt = fortuneRoute.__sajuAiSectionTestUtils.buildSajuAISectionPrompt(builtPrompt, firstGroup);

    expect(finalPrompt).toContain("[[CD_PERSONA_SUMMARIES_V1]]");
    expect(finalPrompt).toContain("YEONI_LETTER:");
    expect(finalPrompt).toContain("NEO_NEXT_CHECK:");
    expect(firstPrompt).not.toContain("[[CD_PERSONA_SUMMARIES_V1]]");
    expect(sajuPrompt.SAJU_AI_SECTION_GROUPS).toHaveLength(5);
    expect(sajuPrompt.SAJU_AI_SECTION_MAX_OUTPUT_TOKENS).toBe(12000);
  });

  test("공통 상담문과 두 화자 요약을 분리하고 v1 계약으로 응답한다", () => {
    const parsed = fortuneRoute.__sajuAiSectionTestUtils.extractSajuAIPersonaSummaries(`${commonBody}\n\n${summaryBlock}`);

    expect(parsed.resultText).toBe(commonBody);
    expect(parsed.resultText).not.toContain("CD_PERSONA_SUMMARIES");
    expect(parsed.personaSummaries).toEqual({
      version: 1,
      yeoni: {
        letter: "마음이 앞서갈수록 지금 확인할 수 있는 흐름부터 천천히 살펴보세요.",
        action: "오늘 결정할 일 한 가지의 기준을 종이에 적어보세요.",
      },
      neo: {
        conclusion: "지금은 확장보다 우선순위를 정할 때입니다.",
        basis: "공통 본문에서 확인한 일간과 오행 균형을 근거로 삼았습니다.",
        caution: "실제 조건이 달라지면 결론도 다시 점검해야 합니다.",
        nextCheck: "예산, 일정, 상대의 답변 순서로 확인하세요.",
      },
    });

    const payload = fortuneRoute.__sajuAiSectionTestUtils.buildSajuAIPromptResultPayload({
      builtPrompt: { promptVersion: sajuPrompt.SAJU_AI_PROMPT_VERSION },
      resultText: parsed.resultText,
      personaSummaries: parsed.personaSummaries,
      consumePayload: {},
      chargedCoins: 0,
      balanceAfter: 0,
      requestId: "persona-test",
    });
    expect(payload.resultText).toBe(commonBody);
    expect(payload.personaSummaries).toEqual(parsed.personaSummaries);
  });

  test("요약이 불완전해도 12챕터 본문은 보존하고 추가 생성용 실패로 만들지 않는다", () => {
    const malformed = `${commonBody}\n\n[[CD_PERSONA_SUMMARIES_V1]]\nYEONI_LETTER: 편지는 남았습니다.`;
    const parsed = fortuneRoute.__sajuAiSectionTestUtils.extractSajuAIPersonaSummaries(malformed);

    expect(parsed.resultText).toBe(commonBody);
    expect(parsed.personaSummaries).toBeUndefined();
  });
});
