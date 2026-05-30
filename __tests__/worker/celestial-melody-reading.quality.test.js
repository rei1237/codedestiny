/**
 * @jest-environment node
 */

let buildCelestialMelodyReading;
let buildCelestialMelodySection;
let validateCelestialMelodyReading;
let CELESTIAL_MELODY_SPREAD;
let getTarotCardByAnyId;

beforeAll(async () => {
  const readingMod = await import("../../lib/tarot/celestial-melody-reading.mjs");
  const cardMod = await import("../../lib/tarot/tarot-cards.mjs");
  buildCelestialMelodyReading = readingMod.buildCelestialMelodyReading;
  buildCelestialMelodySection = readingMod.buildCelestialMelodySection;
  validateCelestialMelodyReading = readingMod.validateCelestialMelodyReading;
  CELESTIAL_MELODY_SPREAD = readingMod.CELESTIAL_MELODY_SPREAD;
  getTarotCardByAnyId = cardMod.getTarotCardByAnyId;
});

function sampleCards() {
  const majorCodes = ["M17", "M18", "M01", "M06", "M15", "M10", "M11", "M16", "M02", "M13", "M19"];
  return majorCodes.map((code, idx) => {
    const card = getTarotCardByAnyId(code);
    return {
      cardId: code,
      cardName: card?.nameKo,
      orientation: idx % 2 === 0 ? "upright" : "reversed",
      tarot: { n: card?.nameKo, r: card?.code },
    };
  });
}

describe("celestial melody reading quality", () => {
  test("11개 행성 카드가 모두 생성되고 필수 구조를 포함해야 한다", () => {
    const built = buildCelestialMelodyReading({
      cards: sampleCards(),
      payment: {
        coinCharged: true,
        transactionId: "tx-celestial-test",
        reportId: "report-celestial-test",
      },
    });

    expect(built.reading.spreadName).toBe("천체의 선율 타로");
    expect(built.reading.mode).toBe("local-first");
    expect(Array.isArray(built.reading.cards)).toBe(true);
    expect(built.reading.cards).toHaveLength(11);
    expect(built.reading.meta.cardCount).toBe(11);
    expect(built.reading.meta.localSkeletonUsed).toBe(true);

    built.reading.cards.forEach((section) => {
      expect(typeof section.planetId).toBe("string");
      expect(typeof section.cardNameKo).toBe("string");
      expect(["upright", "reversed"]).toContain(section.orientation);
      expect(String(section.archetypeReading || "").length).toBeGreaterThanOrEqual(500);
      expect(String(section.consciousMessage || "").length).toBeGreaterThanOrEqual(500);
      expect(String(section.unconsciousPattern || "").length).toBeGreaterThanOrEqual(500);
      expect(String(section.shadowWarning || "").length).toBeGreaterThanOrEqual(500);
      expect(String(section.soulLesson || "").length).toBeGreaterThanOrEqual(500);
      expect(String(section.integrationPractice || "").length).toBeGreaterThanOrEqual(500);
    });

    expect(String(built.reading.summary.overallTheme || "").length).toBeGreaterThanOrEqual(1000);
    expect(Array.isArray(built.reading.summary.practices)).toBe(true);
    expect(built.reading.summary.practices.length).toBeGreaterThanOrEqual(7);

    expect(built.quality.ok).toBe(true);
    expect(built.quality.errors).toHaveLength(0);
  });

  test("같은 카드라도 행성 위치가 다르면 해석 문장이 달라야 한다", () => {
    const star = getTarotCardByAnyId("M17");
    const sunSection = buildCelestialMelodySection(star, CELESTIAL_MELODY_SPREAD[0], "upright");
    const moonSection = buildCelestialMelodySection(star, CELESTIAL_MELODY_SPREAD[1], "upright");
    const plutoSection = buildCelestialMelodySection(star, CELESTIAL_MELODY_SPREAD[9], "upright");

    expect(sunSection.archetypeReading).not.toBe(moonSection.archetypeReading);
    expect(moonSection.archetypeReading).not.toBe(plutoSection.archetypeReading);
    expect(sunSection.planetMeaning).not.toBe(moonSection.planetMeaning);
  });

  test("유효성 검사에서 행성 누락/중복을 잡아야 한다", () => {
    const built = buildCelestialMelodyReading({ cards: sampleCards() });
    const broken = JSON.parse(JSON.stringify(built.reading));
    broken.cards = broken.cards.slice(0, 10);
    broken.cards[0].planetId = broken.cards[1].planetId;

    const validation = validateCelestialMelodyReading(broken);
    expect(validation.ok).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
