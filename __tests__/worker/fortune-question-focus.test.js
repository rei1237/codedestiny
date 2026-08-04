/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import { buildFortuneQuestionFocus } from "../../worker/lib/fortune-question-focus.js";
import { buildContextDrivenGuardianFallback } from "../../worker/lib/guardian-fortune-fallback.js";
import { buildFusionFortunePrompt, projectFusionFortuneContextForPrompt } from "../../worker/lib/fusion-fortune-prompt.js";

const CASES = [
  ["saju", "love", "연락을 먼저 해도 될지 고민이에요", "contact", { dayMaster: "SAJU_DAY_MASTER", currentFlowSummary: "SAJU_CURRENT_FLOW" }, "힘을 쓰는 방식과 멈춰야 할 타이밍"],
  ["ziwei", "money_work", "이직을 지금 해도 될까요", "career_move", { lifePalaceSummary: "ZIWEI_LIFE_PALACE", topicPalaceSummary: "ZIWEI_TOPIC_PALACE" }, "맡을 몫과 협의할 몫"],
  ["sukuyo", "relationship", "친구와 거리를 둬야 할까요", "boundary", { birthMansion: "SUKUYO_BIRTH_MANSION", relationshipPattern: "SUKUYO_RELATIONSHIP_PATTERN" }, "상대의 속마음이 아니라"],
  ["vedic", "mind", "요즘 너무 지치고 불안해요", "recovery", { moonSignSummary: "VEDIC_MOON_SIGN", innerRhythm: "VEDIC_INNER_RHYTHM" }, "무엇을 먼저 회복해야 하는지"],
  ["astrology", "love", "고백해도 괜찮을지 알고 싶어요", "confession", { sunSummary: "ASTROLOGY_SUN", moonSummary: "ASTROLOGY_MOON" }, "원하는 것과 바로 행동할 수 있는 것"],
  ["tarot", "decision", "둘 중 어떤 선택을 해야 할까요", "choice", { symbolicMessage: "TAROT_SYMBOLIC_MESSAGE", cards: [{ name: "TAROT_CARD", meaningSummary: "TAROT_CARD_MEANING" }] }, "카드가 결정을 대신한다고 말하지 않습니다"],
];

function contextFor(category, topic, data) {
  return {
    inputSummary: { category, topic, mode: "yeoni", hasBirthTime: true, hasBirthPlace: true },
    availableSystems: [category],
    [category]: data,
    integratedInsight: {
      currentTheme: "CURRENT_THEME",
      likelyConcern: "LIKELY_CONCERN",
      adviceDirection: "ADVICE_DIRECTION",
      cautionPattern: "CAUTION_PATTERN",
      luckyActionHint: "LUCKY_ACTION",
    },
  };
}

describe("question-focused Guardian fallback", () => {
  it("prioritizes a clear free-form question over a broad selected topic", () => {
    const focus = buildFortuneQuestionFocus({ concern: "회사에서 이직 제안을 받았는데 옮길까요", topic: "daily" });

    expect(focus).toMatchObject({ topic: "money_work", intentKey: "career_move" });
    expect(JSON.stringify(focus)).not.toContain("회사에서 이직 제안을 받았는데 옮길까요");
  });

  it.each(CASES)("answers the received %s question with only its calculated evidence", (category, topic, concern, intentKey, data, specialistSignal) => {
    const focus = buildFortuneQuestionFocus({ concern, topic });
    const result = buildContextDrivenGuardianFallback({
      input: { topic, category, mode: "yeoni", concern },
      context: contextFor(category, topic, data),
    });
    const visible = JSON.stringify(result);

    expect(focus.intentKey).toBe(intentKey);
    expect(visible).toContain(focus.answerFrame);
    expect(visible).toContain(Object.values(data).flatMap((value) => Array.isArray(value) ? value.map((item) => item.meaningSummary || item.name) : [value]).find(Boolean));
    expect(visible).toContain(specialistSignal);
    expect(visible).not.toContain(concern);
  });
});

describe("question-focused compact Fusion prompt boundary", () => {
  it("keeps the classified question focus and six-system evidence while excluding raw personal input", () => {
    const concern = "이직할지 남을지, 팀장과의 관계도 고민이에요";
    const context = {
      birthTimeKnown: true,
      birthPlaceKnown: true,
      topic: "직업과 이직",
      questionFocus: buildFortuneQuestionFocus({ concern, topic: "money_work" }),
      systems: Object.fromEntries(CASES.map(([category, _topic, _concern, _intent, data]) => [category, {
        ...data,
        internalOnly: "MUST_NOT_REACH_PROVIDER",
        evidence: [`${category}.evidence`],
      }])),
      tarotSpread: { spreadType: "fusion_six_system_bridge", cards: [{ name: "FUSION_TAROT_CARD", positionKey: "core", meaningSummary: "FUSION_TAROT_MEANING" }] },
      integratedInsight: { currentTheme: "FUSION_CURRENT_THEME", systemInsights: { secret: "MUST_NOT_REACH_PROVIDER" } },
      inputSummary: { calendarType: "solar", gender: "unspecified", topic: "직업과 이직" },
      birthDate: "1995-04-18",
      birthTime: "08:30",
      concern,
    };
    const projection = projectFusionFortuneContextForPrompt(context);
    const prompt = buildFusionFortunePrompt({ context });
    const serialized = JSON.stringify(projection);

    expect(projection.questionFocus.intentKey).toBe("career_move");
    expect(Object.keys(projection.systems)).toEqual(["saju", "ziwei", "sukuyo", "vedic", "astrology", "tarot"]);
    expect(serialized).toContain("SAJU_CURRENT_FLOW");
    expect(serialized).toContain("ZIWEI_TOPIC_PALACE");
    expect(serialized).toContain("SUKUYO_RELATIONSHIP_PATTERN");
    expect(serialized).toContain("VEDIC_INNER_RHYTHM");
    expect(serialized).toContain("ASTROLOGY_MOON");
    expect(serialized).toContain("TAROT_SYMBOLIC_MESSAGE");
    expect(serialized).not.toContain("MUST_NOT_REACH_PROVIDER");
    expect(prompt.userPrompt).toContain(projection.questionFocus.answerFrame);
    expect(prompt.userPrompt).not.toContain(concern);
    expect(prompt.userPrompt).not.toContain("1995-04-18");
    expect(prompt.userPrompt).not.toContain("08:30");
  });

  it("caps oversized calculator prose before it becomes provider input", () => {
    const oversized = "x".repeat(10000);
    const context = {
      questionFocus: buildFortuneQuestionFocus({ concern: "연락할까요", topic: "love" }),
      systems: Object.fromEntries(CASES.map(([category, _topic, _concern, _intent, data]) => [category, Object.fromEntries(Object.keys(data).map((key) => [key, oversized]))])),
      tarotSpread: { cards: Array.from({ length: 20 }, () => ({ name: oversized, meaningSummary: oversized, positionKey: oversized })) },
      integratedInsight: Object.fromEntries(["openingHook", "currentTheme", "likelyConcern", "adviceDirection", "cautionPattern", "luckyActionHint", "premiumBridge"].map((key) => [key, oversized])),
      limitations: Array.from({ length: 30 }, () => oversized),
    };
    const prompt = buildFusionFortunePrompt({ context });

    expect(prompt.userPrompt.length).toBeLessThan(18000);
    expect(prompt.userPrompt).not.toContain(oversized);
  });
});
