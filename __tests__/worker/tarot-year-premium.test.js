/**
 * @jest-environment node
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PREMIUM_MODULE_URL = pathToFileURL(
  path.resolve(process.cwd(), "lib/tarot/tarot-year-premium.mjs"),
).href;

function runPremiumProbe() {
  const probe = `
    import {
      buildPremiumYearReading,
      validatePremiumYearReading,
      drawPremiumYearCards,
    } from ${JSON.stringify(PREMIUM_MODULE_URL)};

    const animals = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
    const mockMonths = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      monthLabel: (index + 1) + "월",
      zodiacAnimal: animals[index],
      zodiacSymbol: "✦",
      zodiacTheme: "현실의 기준",
      orientation: index === 8 ? "reversed" : "upright",
      mainCard: {
        cardId: "M" + String(index).padStart(2, "0"),
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

    const reading = buildPremiumYearReading({
      year: 2026,
      reading: {
        summary: "한 해의 큰 흐름",
        finalAdvice: "방향을 잃지 않는 속도로 나아가세요.",
        monthlyReadings: mockMonths,
        annualSummary: {
          summary: "기준을 세우고 현실화하는 해입니다.",
          bestMonth: mockMonths[5],
          cautionMonth: mockMonths[8],
          dominantSuit: "메이저",
          topKeywords: ["기준", "회복"],
        },
      },
    });
    const legacy = {
      schemaVersion: "tarot-year-v2",
      monthlyReadings: mockMonths,
      categoryReading: {
        money: "금전 흐름", career: "일의 흐름", love: "연애 흐름", health: "건강 흐름",
        family: "가족 흐름", growth: "성장 흐름", noblePerson: "귀인 흐름", caution: "주의할 흐름",
      },
      annualSummary: { mainCard: { nameKo: "별" }, summary: "기존 요약" },
      annualOverview: { summary: "기존 총운" },
      finalAdvice: "기존 마지막 조언",
      turningPoints: [{ period: "상반기" }, { period: "중반" }, { period: "하반기" }],
    };
    const first = drawPremiumYearCards({ seed: "request-a", year: 2026 });
    const second = drawPremiumYearCards({ seed: "request-a", year: 2026 });
    const other = drawPremiumYearCards({ seed: "request-b", year: 2026 });
    const upgraded = buildPremiumYearReading({ reading: legacy, year: 2026 });
    console.log(JSON.stringify({
      reading: {
        schemaVersion: reading.schemaVersion,
        quality: validatePremiumYearReading(reading),
        monthlyCount: reading.monthlyReadings.length,
        annualSummary: reading.annualSummary,
        mainCardReading: reading.mainCardReading,
        zodiacProfiles: reading.zodiacProfiles,
        yearNarrative: reading.yearNarrative,
        categoryReadings: reading.categoryReadings,
        categoryReadingKeys: Object.keys(reading.categoryReading),
        turningPoints: reading.turningPoints,
        luckyActions: reading.luckyActions,
        finalMessage: reading.finalMessage,
        monthlyAnimals: reading.monthlyReadings.map((month) => month.zodiacAnimal),
        firstMonth: reading.monthlyReadings[0],
        serialized: JSON.stringify(reading),
      },
      deterministic: {
        same: JSON.stringify(first) === JSON.stringify(second),
        unique: new Set(first.map((card) => card.cardId)).size,
        majorOnly: first.every((card) => /^M(?:0[0-9]|1[0-9]|2[01])$/.test(card.cardId)),
        changed: JSON.stringify(first) !== JSON.stringify(other),
      },
      legacy: {
        valid: validatePremiumYearReading(legacy).ok,
        upgradedSchema: upgraded.schemaVersion,
        upgradedMonths: upgraded.monthlyReadings.length,
        money: upgraded.categoryReading.money,
      },
    }));
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", probe], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Premium tarot probe failed");
  }
  return JSON.parse(result.stdout.trim());
}

const probe = runPremiumProbe();

describe("십이지신 천운 타로 tarot-year-v3", () => {
  test("12개월 프리미엄 결과의 필수 섹션을 만든다", () => {
    const { reading } = probe;
    expect(reading.quality.ok).toBe(true);
    expect(reading.schemaVersion).toBe("tarot-year-v3");
    expect(reading.monthlyCount).toBe(12);
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
    expect(reading.categoryReadingKeys).toEqual([
      "money", "career", "love", "health", "family", "growth", "noblePerson", "caution",
    ]);
    expect(reading.turningPoints).toHaveLength(3);
    expect(reading.luckyActions.length).toBeGreaterThanOrEqual(3);
    expect(reading.finalMessage.oneLine).toBeTruthy();
    expect(reading.firstMonth).toEqual(expect.objectContaining({
      keyword: expect.any(String),
      direction: "정방향",
      summary: expect.any(String),
      work: expect.any(String),
      health: expect.any(String),
      cardReading: expect.objectContaining({ annualTheme: expect.any(String) }),
      combinationReading: expect.objectContaining({ title: expect.any(String), advice: expect.any(String) }),
    }));
    expect(reading.monthlyAnimals).toEqual([
      "쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지",
    ]);
  });

  test("불안 조장형 결정론 표현을 새로 만들지 않는다", () => {
    expect(probe.reading.serialized).not.toMatch(/무조건|반드시 망한다|100%|절대/);
  });

  test("같은 seed는 같은 메이저 카드와 방향을 만들고 중복되지 않는다", () => {
    expect(probe.deterministic).toEqual({ same: true, unique: 12, majorOnly: true, changed: true });
  });

  test("기존 tarot-year-v2 저장 결과 계약을 계속 검증할 수 있다", () => {
    expect(probe.legacy).toEqual(expect.objectContaining({
      valid: true,
      upgradedSchema: "tarot-year-v3",
      upgradedMonths: 12,
      money: expect.any(String),
    }));
  });
});

