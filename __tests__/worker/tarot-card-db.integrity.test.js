/**
 * @jest-environment node
 */

let TAROT_CARDS;
let buildLegacyReadingPayload;
let interpretTarotReading;

beforeAll(async () => {
  const cardsMod = await import("../../lib/tarot/tarot-cards.mjs");
  const engineMod = await import("../../lib/tarot/tarot-interpretation-engine.mjs");
  TAROT_CARDS = cardsMod.TAROT_CARDS;
  buildLegacyReadingPayload = engineMod.buildLegacyReadingPayload;
  interpretTarotReading = engineMod.interpretTarotReading;
});

describe("tarot card db integrity", () => {
  test("78장(메이저 22 + 마이너 56) 구성이어야 한다", () => {
    expect(Array.isArray(TAROT_CARDS)).toBe(true);
    expect(TAROT_CARDS).toHaveLength(78);

    const major = TAROT_CARDS.filter((card) => card.arcana === "major");
    const minor = TAROT_CARDS.filter((card) => card.arcana === "minor");
    expect(major).toHaveLength(22);
    expect(minor).toHaveLength(56);
  });

  test("모든 카드는 이름/정역방향/질문유형 의미를 가져야 한다", () => {
    const requiredFields = [
      "core",
      "light",
      "shadow",
      "love",
      "relationship",
      "reunion",
      "exMind",
      "currentMind",
      "future",
      "career",
      "money",
      "daily",
      "general",
      "advice",
    ];

    TAROT_CARDS.forEach((card) => {
      expect(typeof card.nameKo).toBe("string");
      expect(card.nameKo.length).toBeGreaterThan(0);
      expect(typeof card.nameEn).toBe("string");
      expect(card.nameEn.length).toBeGreaterThan(0);

      [card.upright, card.reversed].forEach((meaning) => {
        requiredFields.forEach((field) => {
          expect(Array.isArray(meaning[field])).toBe(true);
          expect(meaning[field].length).toBeGreaterThan(0);
        });
      });
    });
  });

  test("사용자 결과에는 내부 card code/id가 노출되지 않아야 한다", () => {
    const interpreted = interpretTarotReading({
      serviceKey: "test-love",
      questionType: "relationship",
      spreadId: "relationship_six_card",
      drawnCards: [
        { cardId: "M06", orientation: "upright", positionKey: "position_1" },
        { cardId: "C02", orientation: "upright", positionKey: "position_2" },
        { cardId: "S08", orientation: "reversed", positionKey: "position_3" },
        { cardId: "M17", orientation: "upright", positionKey: "position_4" },
        { cardId: "P04", orientation: "upright", positionKey: "position_5" },
        { cardId: "M14", orientation: "upright", positionKey: "position_6" },
      ],
    });

    const reading = buildLegacyReadingPayload(interpreted, { spreadId: "relationship_six_card" });
    const text = JSON.stringify(reading);

    expect(text).not.toMatch(/"cardId"\s*:/);
    expect(text).not.toMatch(/"id"\s*:\s*"major_/);
    expect(text).not.toMatch(/Card\s*\d+/i);
    expect(text).not.toMatch(/unknown\s*card/i);
  });
});
