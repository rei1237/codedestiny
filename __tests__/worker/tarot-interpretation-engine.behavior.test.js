/**
 * @jest-environment node
 */

let interpretTarotReading;

beforeAll(async () => {
  const engineMod = await import("../../lib/tarot/tarot-interpretation-engine.mjs");
  interpretTarotReading = engineMod.interpretTarotReading;
});

describe("tarot interpretation engine behavior", () => {
  test("같은 카드라도 questionType이 다르면 해석이 달라야 한다", () => {
    const love = interpretTarotReading({
      serviceKey: "test-love",
      questionType: "love",
      spreadId: "one_card",
      drawnCards: [{ cardId: "S08", orientation: "upright", positionKey: "today" }],
    });
    const career = interpretTarotReading({
      serviceKey: "test-career",
      questionType: "career",
      spreadId: "one_card",
      drawnCards: [{ cardId: "S08", orientation: "upright", positionKey: "today" }],
    });

    expect(love.cards[0].questionSpecificMeaning).not.toBe(career.cards[0].questionSpecificMeaning);
  });

  test("같은 카드라도 positionKey가 다르면 포지션 의미가 달라야 한다", () => {
    const reading = interpretTarotReading({
      serviceKey: "test-position",
      questionType: "relationship",
      spreadId: "relationship_six_card",
      drawnCards: [
        { cardId: "M07", orientation: "upright", positionKey: "position_1" },
        { cardId: "M07", orientation: "upright", positionKey: "position_2" },
        { cardId: "M07", orientation: "upright", positionKey: "position_3" },
        { cardId: "M07", orientation: "upright", positionKey: "position_4" },
        { cardId: "M07", orientation: "upright", positionKey: "position_5" },
        { cardId: "M07", orientation: "upright", positionKey: "position_6" },
      ],
    });

    expect(reading.cards[0].positionMeaning).not.toBe(reading.cards[2].positionMeaning);
  });

  test("정방향/역방향 해석이 달라야 한다", () => {
    const upright = interpretTarotReading({
      serviceKey: "test-up",
      questionType: "reunion",
      spreadId: "one_card",
      drawnCards: [{ cardId: "M13", orientation: "upright", positionKey: "today" }],
    });
    const reversed = interpretTarotReading({
      serviceKey: "test-rev",
      questionType: "reunion",
      spreadId: "one_card",
      drawnCards: [{ cardId: "M13", orientation: "reversed", positionKey: "today" }],
    });

    expect(upright.cards[0].questionSpecificMeaning).not.toBe(reversed.cards[0].questionSpecificMeaning);
  });

  test("특수 카드 조합이 있으면 combinationInsights에 반영되어야 한다", () => {
    const reading = interpretTarotReading({
      serviceKey: "test-combo",
      questionType: "love",
      spreadId: "relationship_six_card",
      drawnCards: [
        { cardId: "M06", orientation: "upright", positionKey: "position_1" },
        { cardId: "C02", orientation: "upright", positionKey: "position_2" },
        { cardId: "C06", orientation: "upright", positionKey: "position_3" },
        { cardId: "M20", orientation: "upright", positionKey: "position_4" },
        { cardId: "S08", orientation: "reversed", positionKey: "position_5" },
        { cardId: "S02", orientation: "reversed", positionKey: "position_6" },
      ],
    });

    const titles = reading.combinations.map((item) => item.title).join(" ");
    expect(titles).toMatch(/연인\s*\+\s*컵\s*2/);
  });

  test("메이저 비율이 절반 이상이면 majorDominance가 생성되어야 한다", () => {
    const reading = interpretTarotReading({
      serviceKey: "test-major",
      questionType: "general",
      spreadId: "relationship_six_card",
      drawnCards: [
        { cardId: "M00", orientation: "upright", positionKey: "position_1" },
        { cardId: "M01", orientation: "upright", positionKey: "position_2" },
        { cardId: "M02", orientation: "upright", positionKey: "position_3" },
        { cardId: "M03", orientation: "upright", positionKey: "position_4" },
        { cardId: "C02", orientation: "upright", positionKey: "position_5" },
        { cardId: "S02", orientation: "upright", positionKey: "position_6" },
      ],
    });

    expect(reading.combinations.some((item) => item.type === "majorDominance")).toBe(true);
  });

  test("컵 카드가 많으면 suitDominance가 생성되어야 한다", () => {
    const reading = interpretTarotReading({
      serviceKey: "test-cups",
      questionType: "reunion",
      spreadId: "relationship_six_card",
      drawnCards: [
        { cardId: "C01", orientation: "upright", positionKey: "position_1" },
        { cardId: "C02", orientation: "upright", positionKey: "position_2" },
        { cardId: "C03", orientation: "upright", positionKey: "position_3" },
        { cardId: "C06", orientation: "upright", positionKey: "position_4" },
        { cardId: "S05", orientation: "upright", positionKey: "position_5" },
        { cardId: "P04", orientation: "upright", positionKey: "position_6" },
      ],
    });

    expect(reading.combinations.some((item) => item.type === "suitDominance" && /CUPS/i.test(item.title))).toBe(true);
  });

  test("역방향 카드가 많으면 reversedDominance가 생성되어야 한다", () => {
    const reading = interpretTarotReading({
      serviceKey: "test-reversed",
      questionType: "relationship",
      spreadId: "relationship_six_card",
      drawnCards: [
        { cardId: "M07", orientation: "reversed", positionKey: "position_1" },
        { cardId: "M06", orientation: "reversed", positionKey: "position_2" },
        { cardId: "S08", orientation: "reversed", positionKey: "position_3" },
        { cardId: "C06", orientation: "reversed", positionKey: "position_4" },
        { cardId: "P04", orientation: "upright", positionKey: "position_5" },
        { cardId: "W05", orientation: "upright", positionKey: "position_6" },
      ],
    });

    expect(reading.combinations.some((item) => item.type === "reversedDominance")).toBe(true);
  });
});
