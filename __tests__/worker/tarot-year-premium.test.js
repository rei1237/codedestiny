/**
 * @jest-environment node
 */

let buildPremiumYearReading;
let validatePremiumYearReading;
let drawPremiumYearCards;

beforeAll(async () => {
  ({ buildPremiumYearReading, validatePremiumYearReading, drawPremiumYearCards } = await import("../../lib/tarot/tarot-year-premium.mjs"));
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

describe("십이지신 천운 타로 tarot-year-v3", () => {
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
    expect(reading.schemaVersion).toBe("tarot-year-v3");
    expect(reading.monthlyReadings).toHaveLength(12);
    expect(reading.annualSummary).toEqual(expect.objectContaining({
      zodiacAnimal: expect.any(String),
      mainCard: expect.objectContaining({ nameKo: expect.any(String) }),
      keywords: expect.any(Array),
      oneLineMessage: expect.any(String),
      coreAdvice: expect.any(String),
    }));
    expect(reading.mainCardReading).toEqual(expect.objectContaining({
      basicMeaning: expect.any(String),
      yearAppearance: expect.any(String),
      brightSide: expect.any(String),
      shadowSide: expect.any(String),
      combinationReading: expect.objectContaining({ summary: expect.any(String) }),
    }));
    expect(reading.zodiacProfiles).toHaveLength(12);
    expect(reading.yearNarrative).toHaveLength(12);
    expect(reading.categoryReadings).toEqual(expect.objectContaining({
      money: expect.objectContaining({ title: "금전운", reading: expect.any(String), caution: expect.any(String), action: expect.any(String) }),
      opportunity: expect.objectContaining({ title: "올해의 기회" }),
      luckyAction: expect.objectContaining({ title: "올해의 행운 행동" }),
    }));
    expect(Object.keys(reading.categoryReading)).toEqual([
      "money", "career", "love", "health", "family", "growth", "noblePerson", "caution",
    ]);
    expect(reading.turningPoints).toHaveLength(3);
    expect(reading.luckyActions.length).toBeGreaterThanOrEqual(3);
    expect(reading.luckyActions.length).toBeLessThanOrEqual(7);
    expect(reading.finalMessage.oneLine).toBeTruthy();
    expect(reading.monthlyReadings[0]).toEqual(expect.objectContaining({
      keyword: expect.any(String),
      direction: "정방향",
      summary: expect.any(String),
      work: expect.any(String),
      health: expect.any(String),
      cardReading: expect.objectContaining({ annualTheme: expect.any(String) }),
      combinationReading: expect.objectContaining({ title: expect.any(String), advice: expect.any(String) }),
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

  test("같은 seed는 같은 메이저 카드와 방향을 만들고 같은 리딩 안에서 중복되지 않는다", () => {
    const first = drawPremiumYearCards({ seed: "request-a", year: 2026 });
    const second = drawPremiumYearCards({ seed: "request-a", year: 2026 });
    const other = drawPremiumYearCards({ seed: "request-b", year: 2026 });
    expect(second).toEqual(first);
    expect(first).toHaveLength(12);
    expect(new Set(first.map((card) => card.cardId)).size).toBe(12);
    expect(first.every((card) => /^M(?:0[0-9]|1[0-9]|2[01])$/.test(card.cardId))).toBe(true);
    expect(first.map((card) => `${card.cardId}:${card.orientation}`).join("|")).not.toBe(other.map((card) => `${card.cardId}:${card.orientation}`).join("|"));
  });

  test("기존 tarot-year-v2 저장 결과 계약을 계속 검증할 수 있다", () => {
    const legacy = {
      schemaVersion: "tarot-year-v2",
      monthlyReadings: mockMonths().map((month) => ({ ...month, flow: "짧은 기존 흐름" })),
      categoryReading: {
        money: "금전 흐름",
        career: "일의 흐름",
        love: "연애 흐름",
        health: "건강 흐름",
        family: "가족 흐름",
        growth: "성장 흐름",
        noblePerson: "귀인 흐름",
        caution: "주의할 흐름",
      },
      annualSummary: { mainCard: { nameKo: "별" }, summary: "기존 요약" },
      annualOverview: { summary: "기존 총운" },
      finalAdvice: "기존 마지막 조언",
      turningPoints: [{ period: "상반기" }, { period: "중반" }, { period: "하반기" }],
    };
    expect(validatePremiumYearReading(legacy).ok).toBe(true);
    const upgraded = buildPremiumYearReading({ reading: legacy, year: 2026 });
    expect(upgraded.schemaVersion).toBe("tarot-year-v3");
    expect(upgraded.categoryReading.money).toEqual(expect.any(String));
    expect(upgraded.monthlyReadings).toHaveLength(12);
  });
});

