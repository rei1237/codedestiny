/**
 * @jest-environment node
 */

let buildPremiumYearReading;
let validatePremiumYearReading;

beforeAll(async () => {
  ({ buildPremiumYearReading, validatePremiumYearReading } = await import("../../lib/tarot/tarot-year-premium.mjs"));
});

function mockMonths() {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    monthLabel: `${index + 1}월`,
    zodiacAnimal: ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"][index],
    zodiacSymbol: "✦",
    zodiacTheme: "현실의 기준",
    orientation: index === 8 ? "reversed" : "upright",
    mainCard: {
      cardId: `M${String(index).padStart(2, "0")}`,
      nameKo: index === 0 ? "별" : "절제",
      nameEn: index === 0 ? "The Star" : "Temperance",
      suit: "major",
      orientation: index === 8 ? "reversed" : "upright",
      keywords: ["회복", "기준"],
    },
    overall: "작은 징조를 현실의 순서로 옮기는 흐름입니다.",
    flow: "서두르기보다 확인 가능한 결과를 남기는 달입니다.",
    moneyWork: "지출과 계약의 기준을 정리하면 흐름이 안정됩니다.",
    love: "서로의 속도를 확인하는 대화가 관계의 온도를 지켜 줍니다.",
    relationship: "역할과 경계를 분명히 할수록 신뢰가 오래갑니다.",
    healthMind: "수면과 휴식의 리듬을 작게 고정하세요.",
    caution: "감정이 커질수록 조건을 한 번 더 확인하세요.",
    advice: "이번 달에 확인할 결과를 한 가지로 좁혀 기록하세요.",
  }));
}

describe("십이지신 천운 타로 tarot-year-v2", () => {
  test("mock 12장으로 프리미엄 결과의 필수 섹션을 만든다", () => {
    const reading = buildPremiumYearReading({
      year: 2026,
      reading: {
        summary: "한 해의 큰 흐름",
        finalAdvice: "방향을 잃지 않는 속도로 나아가세요.",
        monthlyReadings: mockMonths(),
        annualSummary: {
          summary: "기준을 세우고 현실화하는 해입니다.",
          bestMonth: mockMonths()[5],
          cautionMonth: mockMonths()[8],
          dominantSuit: "메이저",
          topKeywords: ["기준", "회복"],
        },
      },
    });

    const quality = validatePremiumYearReading(reading);
    expect(quality.ok).toBe(true);
    expect(reading.schemaVersion).toBe("tarot-year-v2");
    expect(reading.monthlyReadings).toHaveLength(12);
    expect(Object.keys(reading.categoryReading)).toEqual([
      "money", "career", "love", "health", "family", "growth", "noblePerson", "caution",
    ]);
    expect(reading.turningPoints).toHaveLength(3);
    expect(reading.luckyActions.length).toBeGreaterThanOrEqual(3);
    expect(reading.luckyActions.length).toBeLessThanOrEqual(7);
    expect(reading.finalMessage.oneLine).toBeTruthy();
    expect(reading.monthlyReadings[0]).toEqual(expect.objectContaining({
      keyword: "회복 · 기준",
      direction: "정방향",
      summary: expect.any(String),
      work: expect.any(String),
      mind: expect.any(String),
    }));
    expect(reading.monthlyReadings.map((month) => month.zodiacAnimal)).toEqual([
      "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지",
    ]);
  });

  test("불안 조장형 결정론 표현을 새로 만들지 않는다", () => {
    const reading = buildPremiumYearReading({ reading: { monthlyReadings: mockMonths() }, year: 2026 });
    const serialized = JSON.stringify(reading);
    expect(serialized).not.toMatch(/무조건|반드시 망한다|100%|절대/);
  });
});
